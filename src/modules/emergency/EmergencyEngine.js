/**
 * Emergency-services dispatcher: runs every volunteer/reserve membership in
 * parallel with your career, school or reserve military service.
 *
 * Each service (fire, police reserves, SAR, ambulance, wildland, Coast Guard
 * Auxiliary, Civil Air Patrol, CERT, Red Cross, ski patrol, Medical Reserve
 * Corps) is a data
 * definition; this engine supplies the shared mechanics: joining, drills,
 * call volume, interactive dispatches, rank progression, civil awards and
 * military-leave suspension.
 *
 * Certifications are *not* defined here: services list ids from the shared
 * CredentialRegistry. Earning EMT or Firefighter II as a volunteer counts for
 * a paid fire/EMS career and vice versa. Each unit has an annual training
 * budget that sponsors its members' courses (via LicensingEngine).
 *
 * state.emergency[serviceId] = {
 *   serviceName, unit, rankIndex, xp, years, calls, saves, injuries,
 *   complaints, onLeave, joinedAge, budget: { annual, left }, k9: { name, breed, age } | null
 * }
 */
import { pickFresh } from '../../core/Pools.js';
import { volunteerServiceHere, volunteerRanks, VOLUNTEER_SERVICES } from '../world/CountryLaw.js';
import { REGIONS } from '../life/Regions.js';
import { currentCountry } from '../../core/Locale.js';
import { yearlyCount, bumpYearly, addHonor, isOnActiveDuty, isDeployed, hasFelony, visibleRecord } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { credentialName } from '../credentials/CredentialRegistry.js';
import { FireVolunteer } from './FireVolunteer.js';
import { PoliceReserves } from './PoliceReserves.js';
import { SearchAndRescue, K9_NAMES, K9_BREEDS, K9_RETIREMENT_AGE } from './SearchAndRescue.js';
import { AmbulanceCorps } from './AmbulanceCorps.js';
import { WildlandCrew } from './WildlandCrew.js';
import { CoastGuardAuxiliary } from './CoastGuardAuxiliary.js';
import { CivilAirPatrol } from './CivilAirPatrol.js';
import { opportunityTick, OpportunityResolvers } from './PaidOpportunities.js';
import { CommunityResponse } from './CommunityResponse.js';
import { RedCross } from './RedCross.js';
import { SkiPatrol } from './SkiPatrol.js';
import { MedicalReserveCorps } from './MedicalReserveCorps.js';
import { ensureVolunteerOrg, volunteerOrgTick, releaseVolunteerOrg, seatOpen, takeSeat, isSeatRank, isElectedRank, resolveElection, leaderAction, LEADERSHIP } from '../org/VolunteerOrgs.js';

export const SERVICES = {
  fire: FireVolunteer,
  police: PoliceReserves,
  sar: SearchAndRescue,
  ambulance: AmbulanceCorps,
  wildland: WildlandCrew,
  auxiliary: CoastGuardAuxiliary,
  cap: CivilAirPatrol,
  cert: CommunityResponse,
  redcross: RedCross,
  skiPatrol: SkiPatrol,
  mrc: MedicalReserveCorps,
};
// Ranks follow the country you live in (a retained firefighter, a special constable…):
// same steps and requirements, the local titles.
for (const svc of Object.values(SERVICES)) {
  const base = svc.ranks;
  const local = {};
  Object.defineProperty(svc, 'ranks', {
    get() {
      const titles = volunteerRanks(currentCountry(), svc.id);
      if (!titles) return base;
      return (local[currentCountry()] ??= base.map((r, i) => (titles[i] ? { ...r, title: titles[i] } : r)));
    },
    enumerable: true,
  });
}
export const SERVICE_LIST = Object.values(SERVICES);

export const rankOfMember = (serviceId, member) => SERVICES[serviceId].ranks[member.rankIndex];

/* ------------------------------------------------------------------ */
/* Eligibility                                                         */
/* ------------------------------------------------------------------ */

export function joinEligibility(state, serviceId) {
  const svc = SERVICES[serviceId];
  if (!svc) return { ok: false, reason: 'Unknown service' };
  if (state.emergency[serviceId]) return { ok: false, reason: 'Already a member' };
  if (!volunteerServiceHere(state.character.countryId, serviceId)) return { ok: false, reason: 'No such service here' };
  if (state.character.age < svc.minAge) return { ok: false, reason: `Must be ${svc.minAge}+` };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (isOnActiveDuty(state)) return { ok: false, reason: 'On active duty' };
  if (hasFelony(state)) return { ok: false, reason: 'Fails background check' };
  if (serviceId === 'police' && visibleRecord(state).some((r) => r.severity === 'misdemeanor' && state.character.age - r.age <= 5)) return { ok: false, reason: 'Recent criminal record' };
  if (svc.excludesProfession && state.career.job?.professionId === svc.excludesProfession) return { ok: false, reason: 'Sworn officers can\'t join' };
  if (svc.requiresCredentials && !svc.requiresCredentials.some((id) => hasCredential(state, id))) return { ok: false, reason: 'Requires a medical license or certification (EMT, RN, MD…)' };
  for (const [stat, min] of Object.entries(svc.requirements)) {
    if (state.stats[stat] < min) return { ok: false, reason: `Needs ${min}+ ${stat}` };
  }
  return { ok: true };
}

export function nextRankStatus(state, serviceId, member) {
  const ranks = SERVICES[serviceId].ranks;
  const next = ranks[member.rankIndex + 1];
  if (!next) return { next: null, ready: false, reason: 'Top rank' };
  const missing = [];
  if (member.xp < next.xp) missing.push(`${next.xp - member.xp} XP`);
  if (next.cert && !hasCredential(state, next.cert)) missing.push(credentialName(next.cert));
  if (next.minYears && member.years < next.minYears) missing.push(`${next.minYears - member.years} yrs`);
  // Officer ranks are seats: elected by the membership, or open only when someone steps down.
  const idx = member.rankIndex + 1;
  const org = state.orgs?.byId?.[member.orgId];
  if (isElectedRank(serviceId, idx, org)) return { next, ready: false, elected: true, reason: `Elected by the membership${missing.length ? ` · ${missing.join(' · ')}` : ''}` };
  if (org && isSeatRank(serviceId, idx) && !seatOpen(org, serviceId, idx)) missing.push(org.seats[idx]?.length === 0 ? 'a bigger unit (no such post in one this size)' : org.parent ? `an open seat (appointed by ${org.parent.name})` : 'an open seat');
  return { next, ready: missing.length === 0, reason: missing.join(' · ') };
}

/* ------------------------------------------------------------------ */
/* Awards & ranks                                                      */
/* ------------------------------------------------------------------ */

function awardCivil(ctx, serviceId, kind, citation) {
  const award = SERVICES[serviceId].awards[kind];
  addHonor(ctx.state, {
    id: `${serviceId}.${kind}`,
    source: 'emergency',
    name: award.name,
    icon: award.icon,
    ribbon: award.ribbon,
    prestige: award.prestige,
    precedence: kind === 'valor' ? 20 : kind === 'lifesaving' ? 21 : 22,
    citation,
  });
  ctx.log(`Awarded the ${award.name}. ${citation}`, award.icon, 'honor');
  ctx.toast(`${award.icon} ${award.name}`, 'honor');
}

function checkPromotion(ctx, serviceId, member) {
  const status = nextRankStatus(ctx.state, serviceId, member);
  if (!status.ready || !ctx.rng.chance(0.85)) return;
  member.rankIndex += 1;
  if (isSeatRank(serviceId, member.rankIndex)) takeSeat(ensureVolunteerOrg(ctx.state, SERVICES[serviceId], member), member.rankIndex);
  ctx.log(`${SERVICES[serviceId].short}: promoted to ${status.next.title}!`, '⬆️', 'good');
  ctx.toast(`Promoted: ${status.next.title}`, 'good');
  ctx.stat('happiness', 5);
}

/* ------------------------------------------------------------------ */
/* Dispatch                                                            */
/* ------------------------------------------------------------------ */

const optionLocked = (state, member, o) => (o.cert && !hasCredential(state, o.cert)) || (o.cert === 'k9Handler' && !member.k9);

function dispatchPrompt(ctx, serviceId) {
  const { state } = ctx;
  const svc = SERVICES[serviceId];
  const member = state.emergency[serviceId];
  const call = pickFresh(ctx.rng, state, `dispatch.${serviceId}`, svc.dispatches);
  ctx.prompt({
    type: 'emergency.dispatch',
    icon: svc.icon,
    title: `${svc.short} Dispatch — ${call.title}`,
    text: `${member.unit}\n${call.text}`,
    options: call.options.map((o) => {
      const locked = optionLocked(state, member, o);
      return {
        id: o.id,
        label: o.label,
        hint: locked ? `🔒 Requires ${o.cert === 'k9Handler' && hasCredential(state, 'k9Handler') ? 'a K9 partner' : credentialName(o.cert)}` : `${o.risk >= 0.7 ? 'Extreme risk' : o.risk >= 0.45 ? 'High risk' : o.risk >= 0.2 ? 'Some risk' : 'Low risk'}${o.cert ? ` · ${credentialName(o.cert)}` : ''}`,
        disabled: Boolean(locked),
        tone: o.risk >= 0.7 ? 'danger' : o.risk <= 0.1 ? 'safe' : undefined,
      };
    }),
    data: { serviceId, callId: call.id },
  });
}

function resolveDispatch(ctx, data, optionId) {
  const { state, rng } = ctx;
  const svc = SERVICES[data.serviceId];
  const member = state.emergency[data.serviceId];
  if (!member) return;
  const call = svc.dispatches.find((c) => c.id === data.callId);
  const option = call.options.find((o) => o.id === optionId);

  let chance = option.success + member.rankIndex * 0.025 + Math.min(member.years, 10) * 0.005;
  if (option.stat) chance += (state.stats[option.stat] - 50) / 250;
  if (member.k9 && option.cert === 'k9Handler') chance += 0.05;
  const success = rng.chance(clamp(chance, 0.05, 0.97));
  member.calls += 1;
  ctx.emit('health:trauma', { amount: (option.risk ?? 0) >= 0.4 || !success ? 4 : 2, source: 'dispatch' });

  if (success) {
    member.xp += option.xp;
    ctx.log(`${call.title}: ${option.successText}`, svc.icon, 'good');
    ctx.stat('happiness', option.heroic ? 6 : 3);
    if (option.save) member.saves += 1;
    if (option.complaint && rng.chance(0.3)) {
      member.complaints += 1;
      ctx.log('Internal Affairs opened a review of your conduct on that call.', '⚖️', 'warn');
    }
    if (option.heroic && option.risk >= 0.5 && rng.chance(0.15)) awardCivil(ctx, data.serviceId, 'valor', `${call.title} — ${option.label.toLowerCase()}.`);
    else if (option.save && rng.chance(0.08)) awardCivil(ctx, data.serviceId, 'lifesaving', `${call.title}.`);
  } else {
    member.xp += Math.round(option.xp / 3);
    ctx.log(`${call.title}: ${option.failText}`, svc.icon, 'bad');
    ctx.stat('happiness', -4);
    ctx.stat('stress', 4);
    if (option.complaint) member.complaints += 1;
    if (option.risk > 0 && rng.chance(option.risk * 0.5)) {
      const dmg = rng.int(5, 20);
      member.injuries += 1;
      ctx.stat('health', -dmg);
      ctx.log(`You were injured on the call (−${dmg} health).`, '🩹', 'bad');
      if (rng.chance(0.2)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(25, 55) });
      if (rng.chance(option.risk * 0.012)) {
        ctx.die(`Line-of-duty death — ${call.title.replace(/^\S+\s/, '')}`);
        return;
      }
    }
  }

  if (member.complaints >= 3) {
    leaveService(ctx, data.serviceId, 'Dismissed after repeated misconduct complaints');
    ctx.stat('happiness', -8);
  }
}

/* ------------------------------------------------------------------ */
/* Membership                                                          */
/* ------------------------------------------------------------------ */

function leaveService(ctx, serviceId, reason) {
  const { state } = ctx;
  const member = state.emergency[serviceId];
  if (!member) return;
  state.emergency.history.push({
    serviceId,
    unit: member.unit,
    rankTitle: rankOfMember(serviceId, member).title,
    years: member.years,
    calls: member.calls,
    saves: member.saves,
    startAge: member.joinedAge,
    endAge: state.character.age,
    reason,
  });
  state.emergency[serviceId] = null;
  if (member.orgId) releaseVolunteerOrg(state, member.orgId);
  ctx.log(`You left the ${SERVICES[serviceId].name}. ${reason}.`, '🚪');
}

/** The unit you'd join in your town: the local service abroad, a US company at home. */
function unitFor(ctx, svc) {
  const cc = ctx.state.character.countryId ?? 'US';
  const town = (REGIONS[ctx.state.character.regionId]?.name ?? 'your town').split(',')[0];
  const localName = cc !== 'US' ? VOLUNTEER_SERVICES[cc]?.[svc.id] : null;
  return localName ? `${localName} — ${town}` : cc !== 'US' ? `${svc.name} — ${town}` : ctx.rng.pick(svc.units);
}

/**
 * You moved: volunteer units are local. Where the service exists you transfer to
 * the unit in your new town, keeping your training and experience but not an
 * officer's seat (that belongs to the old unit); where it doesn't, you leave.
 */
export function relocateVolunteers(ctx) {
  const { state } = ctx;
  const cc = state.character.countryId ?? 'US';
  for (const [serviceId, member] of Object.entries(state.emergency)) {
    if (serviceId === 'history' || !member || !SERVICES[serviceId]) continue;
    const svc = SERVICES[serviceId];
    if (!volunteerServiceHere(cc, serviceId)) {
      leaveService(ctx, serviceId, 'You moved somewhere without one');
      continue;
    }
    if (member.orgId) releaseVolunteerOrg(state, member.orgId);
    const firstSeat = Math.min(...Object.keys(LEADERSHIP[serviceId]?.seats ?? {}).map(Number));
    const was = rankOfMember(serviceId, member).title;
    if (Number.isFinite(firstSeat) && member.rankIndex >= firstSeat) member.rankIndex = Math.max(0, firstSeat - 1);
    const from = member.unit;
    member.unit = unitFor(ctx, svc);
    member.serviceName = svc.name;
    member.orgId = null;
    ensureVolunteerOrg(state, svc, member);
    const now = rankOfMember(serviceId, member).title;
    ctx.log(`You transferred from ${from} to ${member.unit}${now !== was ? ` as ${now} (officer posts stay with the old unit)` : ''}.`, svc.icon, 'info');
  }
}

function newK9(rng) {
  return { name: rng.pick(K9_NAMES), breed: rng.pick(K9_BREEDS), age: 1 };
}

function serviceTick(ctx, serviceId, member) {
  const { state, rng } = ctx;
  const svc = SERVICES[serviceId];
  member.budget.annual = svc.trainingBudget;
  member.budget.left = member.budget.annual;

  if (isOnActiveDuty(state) || isDeployed(state)) {
    if (!member.onLeave) ctx.log(`${member.unit} placed you on military leave.`, svc.icon, 'muted');
    member.onLeave = true;
    return;
  }
  if (member.onLeave) ctx.log(`You returned from military leave to ${member.unit}.`, svc.icon);
  member.onLeave = false;
  member.years += 1;
  volunteerOrgTick(ctx, svc, member);

  member.xp += 20;
  ctx.stat('fitness', 2);
  ctx.log(`${svc.short}: ${rng.pick(svc.drills)}`, '🧯', 'muted');

  const [min, max] = svc.callsPerYear;
  const calls = rng.int(min, max);
  member.calls += calls;
  member.xp += Math.round(calls / 2);
  if (svc.stipendPerCall) ctx.earn(calls * svc.stipendPerCall, `${svc.short} call stipend`);
  ctx.log(`${svc.short}: you ran ${calls} calls with ${member.unit}.`, svc.icon);

  // K9 partner ages, retires, and is replaced for certified handlers.
  if (member.k9) {
    member.k9.age += 1;
    if (member.k9.age >= K9_RETIREMENT_AGE) {
      ctx.log(`Your K9 partner ${member.k9.name} retired after a long career and now naps on your couch full time. 🐕`, '🐕', 'milestone');
      member.k9 = null;
    }
  } else if (serviceId === 'sar' && hasCredential(state, 'k9Handler') && rng.chance(0.7)) {
    member.k9 = newK9(rng);
    ctx.log(`Your team paired you with a new K9 pup: ${member.k9.name}, a ${member.k9.breed}.`, '🐕', 'milestone');
  }

  if (rng.chance(0.75)) dispatchPrompt(ctx, serviceId);
  if (rng.chance(0.2)) dispatchPrompt(ctx, serviceId);

  if (member.years % 5 === 0 && member.complaints === 0 && rng.chance(0.3)) {
    awardCivil(ctx, serviceId, 'merit', `${member.years} years of dedicated service with ${member.unit}.`);
  }
  checkPromotion(ctx, serviceId, member);
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const EmergencyEngine = {
  id: 'emergency',
  order: 40,

  init(state) {
    state.emergency ??= { fire: null, police: null, sar: null, history: [] };
    for (const id of Object.keys(SERVICES)) state.emergency[id] ??= null;
  },

  setup(engine) {
    const bus = engine.bus;
    bus.on('region:changed', ({ ctx, from, to }) => { if (from !== to) relocateVolunteers(ctx); });
    // Old saves: v1 members had no training budget, and their certifications move to the credentials registry.
    bus.on('save:migrated', ({ ctx }) => {
      const { state } = ctx;
      for (const [id, member] of Object.entries(state.emergency)) {
        if (member && SERVICES[id] && !member.budget) member.budget = { annual: SERVICES[id].trainingBudget, left: SERVICES[id].trainingBudget };
      }
      for (const certId of state.legacyCerts ?? []) ctx.emit('credential:grant', { id: certId, silent: true });
      delete state.legacyCerts;
    });
    bus.on('budget:charge', ({ ctx, sponsor, amount }) => {
      const member = sponsor.type === 'unit' && ctx.state.emergency[sponsor.serviceId];
      if (member) member.budget.left = Math.max(0, member.budget.left - amount);
    });
    bus.on('credential:earned', ({ ctx, onEarn }) => {
      const member = ctx.state.emergency.sar;
      if (onEarn === 'k9' && member && !member.k9) {
        member.k9 = newK9(ctx.rng);
        ctx.log(`Meet your new partner: ${member.k9.name}, a ${member.k9.breed}. 🐕`, '🐕', 'milestone');
      }
    });
    // Disasters in your state call out the volunteers.
    bus.on('disaster:struck', ({ ctx, disaster }) => {
      for (const id of ['fire', 'sar']) {
        const member = ctx.state.emergency[id];
        if (!member || member.onLeave) continue;
        ctx.prompt({
          type: 'emergency.disasterCallout',
          icon: '🆘',
          title: `${SERVICES[id].short} Callout — ${disaster.name}`,
          text: `${member.unit} has been activated for ${disaster.name}. Families are trapped and the situation is getting worse.`,
          options: [
            { id: 'frontline', label: '🦺 Join the front-line rescue teams', hint: 'High risk', tone: 'danger' },
            { id: 'support', label: '📋 Run the staging area and logistics', hint: 'Low risk' },
          ],
          data: { serviceId: id, severity: disaster.severity, name: disaster.name },
        });
        return;
      }
    });
    bus.on('legal:convicted', ({ ctx, severity, name }) => {
      for (const id of Object.keys(SERVICES)) {
        if (!ctx.state.emergency[id]) continue;
        if (severity === 'felony' || (id === 'police' && severity === 'misdemeanor')) leaveService(ctx, id, `Dismissed after a ${name} conviction`);
      }
    });
    bus.on('legal:incarcerated', ({ ctx }) => {
      for (const id of Object.keys(SERVICES)) if (ctx.state.emergency[id]) leaveService(ctx, id, 'Membership terminated during incarceration');
    });
  },

  onAgeUp(ctx) {
    for (const serviceId of Object.keys(SERVICES)) {
      const member = ctx.state.emergency[serviceId];
      if (member) serviceTick(ctx, serviceId, member);
      if (!ctx.state.character.alive) return;
      // Volunteering can lead to paid gigs and job offers.
      if (ctx.state.emergency[serviceId]) opportunityTick(ctx, serviceId, ctx.state.emergency[serviceId], SERVICES[serviceId]);
    }
  },

  actions: {
    join(ctx, serviceId) {
      const check = joinEligibility(ctx.state, serviceId);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const svc = SERVICES[serviceId];
      // Abroad, the unit is the local service in your town (St John Ambulance — Cardiff), not a US one.
      const unit = unitFor(ctx, svc);
      ctx.state.emergency[serviceId] = {
        serviceName: svc.name,
        unit,
        rankIndex: 0,
        xp: 0,
        years: 0,
        calls: 0,
        saves: 0,
        injuries: 0,
        complaints: 0,
        onLeave: false,
        joinedAge: ctx.state.character.age,
        budget: { annual: svc.trainingBudget, left: svc.trainingBudget },
        k9: null,
      };
      ensureVolunteerOrg(ctx.state, svc, ctx.state.emergency[serviceId]);
      ctx.log(`You were sworn in as a ${svc.ranks[0].title} with ${unit}.`, svc.icon, 'milestone');
      ctx.toast(`Joined ${svc.name}`, 'good');
    },

    train(ctx, serviceId) {
      const member = ctx.state.emergency[serviceId];
      if (!member || member.onLeave) return;
      if (yearlyCount(ctx.state, `emergency.train.${serviceId}`)) return ctx.toast('Already did extra training this year.', 'warn');
      bumpYearly(ctx.state, `emergency.train.${serviceId}`);
      member.xp += 25;
      ctx.stat('fitness', 2);
      ctx.stat('stress', 4);
      ctx.log(`${SERVICES[serviceId].short}: you put in extra training hours.`, '🏋️');
      ctx.toast('+25 XP', 'good');
    },

    shift(ctx, serviceId) {
      const member = ctx.state.emergency[serviceId];
      if (!member || member.onLeave) return;
      const n = bumpYearly(ctx.state, `emergency.shift.${serviceId}`);
      if (n > 2) return ctx.toast('You\'ve picked up enough extra shifts.', 'warn');
      const svc = SERVICES[serviceId];
      const calls = ctx.rng.int(4, 12);
      member.calls += calls;
      member.xp += 12;
      ctx.stat('stress', 4);
      if (svc.stipendPerCall) ctx.earn(calls * svc.stipendPerCall, `${svc.short} call stipend`);
      ctx.log(`${svc.short}: you covered extra shifts and ran ${calls} more calls.`, svc.icon);
      if (ctx.rng.chance(0.35)) dispatchPrompt(ctx, serviceId);
    },

    recruit: (ctx, arg) => leaderAction(ctx, SERVICES, 'recruit', arg),
    fundraise: (ctx, arg) => leaderAction(ctx, SERVICES, 'fundraise', arg),
    grant: (ctx, arg) => leaderAction(ctx, SERVICES, 'grant', arg),
    commendMember: (ctx, arg) => leaderAction(ctx, SERVICES, 'commend', arg),
    disciplineMember: (ctx, arg) => leaderAction(ctx, SERVICES, 'discipline', arg),
    appointMember: (ctx, arg) => leaderAction(ctx, SERVICES, 'appoint', arg),
    openStation: (ctx, arg) => leaderAction(ctx, SERVICES, 'expand', arg),
    mergeAgency: (ctx, arg) => leaderAction(ctx, SERVICES, 'merge', arg),
    bidContract: (ctx, arg) => leaderAction(ctx, SERVICES, 'contract', arg),
    hireStaff: (ctx, arg) => leaderAction(ctx, SERVICES, 'hire', arg),
    paidChief: (ctx, arg) => leaderAction(ctx, SERVICES, 'paidChief', arg),

    resign(ctx, serviceId) {
      if (!ctx.state.emergency[serviceId]) return;
      leaveService(ctx, serviceId, 'Resigned');
    },
  },

  resolvers: {
    dispatch: resolveDispatch,
    mergeOffer(ctx, data, optionId) {
      if (optionId === 'yes') leaderAction(ctx, SERVICES, 'merge', `${data.serviceId}:${data.neighbor}`);
    },
    election(ctx, data, optionId) {
      const member = ctx.state.emergency[data.serviceId];
      if (!member) return;
      resolveElection(ctx, SERVICES[data.serviceId], member, data.post, optionId === 'run');
    },
    ...OpportunityResolvers,
    disasterCallout(ctx, data, optionId) {
      const { rng } = ctx;
      const member = ctx.state.emergency[data.serviceId];
      if (!member) return;
      member.calls += rng.int(10, 40);
      if (optionId === 'frontline') {
        member.xp += 40 * data.severity;
        const saves = rng.int(1, 3 * data.severity);
        member.saves += saves;
        ctx.log(`During ${data.name} you pulled ${saves} people to safety.`, '🆘', 'good');
        if (rng.chance(0.15 * data.severity)) {
          const dmg = rng.int(5, 20);
          ctx.stat('health', -dmg);
          member.injuries += 1;
          ctx.log(`You were injured in the rescue (−${dmg} health).`, '🩹', 'bad');
        }
        if (rng.chance(0.25)) awardCivil(ctx, data.serviceId, 'valor', `Rescues during ${data.name}.`);
      } else {
        member.xp += 20 * data.severity;
        ctx.log(`You kept the ${data.name} response organized from the staging area.`, '📋');
        if (rng.chance(0.2)) awardCivil(ctx, data.serviceId, 'merit', `Logistics during ${data.name}.`);
      }
    },
  },
};
