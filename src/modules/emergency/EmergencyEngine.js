/**
 * Emergency-services dispatcher: runs every volunteer/reserve membership in
 * parallel with your career, school or reserve military service.
 *
 * Each service (FireVolunteer, PoliceReserves, SearchAndRescue) is a data
 * definition; this engine supplies the shared mechanics: joining, drills,
 * call volume, interactive dispatches, certifications, rank progression,
 * civil awards and military-leave suspension.
 *
 * state.emergency[serviceId] = {
 *   serviceName, unit, rankIndex, xp, years, certs[], calls, saves,
 *   injuries, complaints, onLeave, joinedAge, k9: { name, breed, age } | null
 * }
 */
import { yearlyCount, bumpYearly, addHonor, isOnActiveDuty, isDeployed } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { FireVolunteer } from './FireVolunteer.js';
import { PoliceReserves } from './PoliceReserves.js';
import { SearchAndRescue, K9_NAMES, K9_BREEDS, K9_RETIREMENT_AGE } from './SearchAndRescue.js';

export const SERVICES = {
  fire: FireVolunteer,
  police: PoliceReserves,
  sar: SearchAndRescue,
};
export const SERVICE_LIST = Object.values(SERVICES);

export const rankOfMember = (serviceId, member) => SERVICES[serviceId].ranks[member.rankIndex];
export const certName = (serviceId, certId) => SERVICES[serviceId].certifications.find((c) => c.id === certId)?.name ?? certId;

/* ------------------------------------------------------------------ */
/* Eligibility                                                         */
/* ------------------------------------------------------------------ */

export function joinEligibility(state, serviceId) {
  const svc = SERVICES[serviceId];
  if (!svc) return { ok: false, reason: 'Unknown service' };
  if (state.emergency[serviceId]) return { ok: false, reason: 'Already a member' };
  if (state.character.age < svc.minAge) return { ok: false, reason: `Must be ${svc.minAge}+` };
  if (isOnActiveDuty(state)) return { ok: false, reason: 'On active duty' };
  if (svc.excludesProfession && state.career.job?.professionId === svc.excludesProfession) return { ok: false, reason: 'Sworn officers can\'t join' };
  for (const [stat, min] of Object.entries(svc.requirements)) {
    if (state.stats[stat] < min) return { ok: false, reason: `Needs ${min}+ ${stat}` };
  }
  return { ok: true };
}

export function certEligibility(state, serviceId, certId) {
  const member = state.emergency[serviceId];
  const cert = SERVICES[serviceId].certifications.find((c) => c.id === certId);
  if (!member || !cert) return { ok: false, reason: 'Unavailable' };
  if (member.certs.includes(certId)) return { ok: false, reason: 'Certified' };
  if (cert.requires && !member.certs.includes(cert.requires)) return { ok: false, reason: `Needs ${certName(serviceId, cert.requires)}` };
  if (member.onLeave) return { ok: false, reason: 'On leave' };
  if (yearlyCount(state, `emergency.cert.${serviceId}`)) return { ok: false, reason: 'One course per year' };
  if (cert.cost > 0 && state.finances.cash < cert.cost) return { ok: false, reason: `Costs $${cert.cost.toLocaleString()}` };
  return { ok: true };
}

export function nextRankStatus(serviceId, member) {
  const ranks = SERVICES[serviceId].ranks;
  const next = ranks[member.rankIndex + 1];
  if (!next) return { next: null, ready: false, reason: 'Top rank' };
  const missing = [];
  if (member.xp < next.xp) missing.push(`${next.xp - member.xp} XP`);
  if (next.cert && !member.certs.includes(next.cert)) missing.push(certName(serviceId, next.cert));
  if (next.minYears && member.years < next.minYears) missing.push(`${next.minYears - member.years} yrs`);
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
  const status = nextRankStatus(serviceId, member);
  if (!status.ready || !ctx.rng.chance(0.85)) return;
  member.rankIndex += 1;
  ctx.log(`${SERVICES[serviceId].short}: promoted to ${status.next.title}!`, '⬆️', 'good');
  ctx.toast(`Promoted: ${status.next.title}`, 'good');
  ctx.stat('happiness', 5);
}

/* ------------------------------------------------------------------ */
/* Dispatch                                                            */
/* ------------------------------------------------------------------ */

function dispatchPrompt(ctx, serviceId) {
  const svc = SERVICES[serviceId];
  const member = ctx.state.emergency[serviceId];
  const call = ctx.rng.pick(svc.dispatches);
  ctx.prompt({
    type: 'emergency.dispatch',
    icon: svc.icon,
    title: `${svc.short} Dispatch — ${call.title}`,
    text: `${member.unit}\n${call.text}`,
    options: call.options.map((o) => {
      const locked = o.cert && !member.certs.includes(o.cert);
      return {
        id: o.id,
        label: o.label,
        hint: locked ? `🔒 Requires ${certName(serviceId, o.cert)}` : `${o.risk >= 0.7 ? 'Extreme risk' : o.risk >= 0.45 ? 'High risk' : o.risk >= 0.2 ? 'Some risk' : 'Low risk'}${o.cert ? ` · ${certName(serviceId, o.cert)}` : ''}`,
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
  if (member.k9 && option.cert === 'k9') chance += 0.05;
  const success = rng.chance(clamp(chance, 0.05, 0.97));
  member.calls += 1;

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
  ctx.log(`You left the ${SERVICES[serviceId].name}. ${reason}.`, '🚪');
}

function serviceTick(ctx, serviceId, member) {
  const { state, rng } = ctx;
  const svc = SERVICES[serviceId];

  if (isOnActiveDuty(state) || isDeployed(state)) {
    if (!member.onLeave) ctx.log(`${member.unit} placed you on military leave.`, svc.icon, 'muted');
    member.onLeave = true;
    return;
  }
  if (member.onLeave) ctx.log(`You returned from military leave to ${member.unit}.`, svc.icon);
  member.onLeave = false;
  member.years += 1;

  // Drills
  member.xp += 20;
  ctx.stat('fitness', 2);
  ctx.log(`${svc.short}: ${rng.pick(svc.drills)}`, '🧯', 'muted');

  // Call volume
  const [min, max] = svc.callsPerYear;
  const calls = rng.int(min, max);
  member.calls += calls;
  member.xp += Math.round(calls / 2);
  if (svc.stipendPerCall) ctx.earn(calls * svc.stipendPerCall, `${svc.short} call stipend`);
  ctx.log(`${svc.short}: you ran ${calls} calls with ${member.unit}.`, svc.icon);

  // K9 partner ages and eventually retires.
  if (member.k9) {
    member.k9.age += 1;
    if (member.k9.age >= K9_RETIREMENT_AGE) {
      ctx.log(`Your K9 partner ${member.k9.name} retired after a long career and now naps on your couch full time. 🐕`, '🐕', 'milestone');
      member.k9 = null;
      member.certs = member.certs.filter((c) => c !== 'k9');
    }
  }

  // Interactive dispatch(es)
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
  },

  onAgeUp(ctx) {
    for (const serviceId of Object.keys(SERVICES)) {
      const member = ctx.state.emergency[serviceId];
      if (member) serviceTick(ctx, serviceId, member);
      if (!ctx.state.character.alive) return;
    }
  },

  actions: {
    join(ctx, serviceId) {
      const check = joinEligibility(ctx.state, serviceId);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const svc = SERVICES[serviceId];
      const unit = ctx.rng.pick(svc.units);
      ctx.state.emergency[serviceId] = {
        serviceName: svc.name,
        unit,
        rankIndex: 0,
        xp: 0,
        years: 0,
        certs: [],
        calls: 0,
        saves: 0,
        injuries: 0,
        complaints: 0,
        onLeave: false,
        joinedAge: ctx.state.character.age,
        k9: null,
      };
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

    /** arg: 'serviceId:certId' */
    certify(ctx, arg) {
      const { state, rng } = ctx;
      const [serviceId, certId] = String(arg).split(':');
      const check = certEligibility(state, serviceId, certId);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const member = state.emergency[serviceId];
      const cert = SERVICES[serviceId].certifications.find((c) => c.id === certId);
      bumpYearly(state, `emergency.cert.${serviceId}`);
      if (cert.cost) ctx.spend(cert.cost, cert.name);
      const chance = clamp(0.55 + (state.stats[cert.stat] - 50) / 120, 0.15, 0.95);
      if (!rng.chance(chance)) {
        ctx.log(`You failed the ${cert.name} course. You can retest next year.`, '📝', 'bad');
        return ctx.toast(`Failed: ${cert.name}`, 'bad');
      }
      member.certs.push(certId);
      member.xp += 15;
      ctx.log(`You earned your ${cert.name} certification.`, cert.icon, 'good');
      ctx.toast(`Certified: ${cert.name}`, 'good');
      if (certId === 'k9') {
        member.k9 = { name: rng.pick(K9_NAMES), breed: rng.pick(K9_BREEDS), age: 2 };
        ctx.log(`Meet your new partner: ${member.k9.name}, a ${member.k9.breed}. 🐕`, '🐕', 'milestone');
      }
    },

    resign(ctx, serviceId) {
      if (!ctx.state.emergency[serviceId]) return;
      leaveService(ctx, serviceId, 'Resigned');
    },
  },

  resolvers: {
    dispatch: resolveDispatch,
  },
};
