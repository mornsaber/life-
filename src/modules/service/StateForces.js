/**
 * State service: governors activate their National Guard (State Active Duty)
 * for disasters, civil unrest and border missions, and some states keep a
 * State Defense Force: volunteer state guards that answer only to the
 * governor and can never be federalized or deployed overseas.
 *
 * Activations start from events: `disaster:struck`, yearly civil unrest and
 * (in border states) border missions. If you're the governor, you decide
 * whether to activate; if you serve in the Guard or a State Defense Force,
 * you're called up.
 *
 * state.service.sdf = { stateId, name, rankIndex, years, activations, joinedAge }
 */
import { clamp } from '../../core/Random.js';
import { hasFelony, isOnActiveDuty, yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { sideRng, initOrgs } from '../org/Organizations.js';
import { stateIdOf } from '../life/Regions.js';
import { STATES } from '../life/States.js';
import { monthlyBasePay } from '../military/MilitaryEngine.js';
import { awardMedal } from '../military/MedalEngine.js';

/** States with a State Defense Force. */
export const STATE_DEFENSE_FORCES = {
  TX: 'Texas State Guard', NY: 'New York Guard', CA: 'California State Guard', FL: 'Florida State Guard', OH: 'Ohio Military Reserve', WA: 'Washington State Guard',
};
export const BORDER_STATES = ['TX', 'CA'];
export const SDF_RANKS = ['Private', 'Specialist', 'Sergeant', 'Staff Sergeant', 'Sergeant First Class', 'Warrant Officer', 'Second Lieutenant', 'Captain', 'Major', 'Colonel'];

export const MISSIONS = {
  disaster: { name: 'disaster response', icon: '🌀' },
  unrest: { name: 'civil unrest', icon: '🚧' },
  border: { name: 'border security', icon: '🛂' },
};

const inGuard = (state) => state.military.service?.branch === 'guard';
const governorIsYou = (state) => state.politics?.office?.id === 'governor';

export function sdfEligibility(state) {
  const id = stateIdOf(state);
  if (!STATE_DEFENSE_FORCES[id]) return { ok: false, reason: `${STATES[id].name} has no State Defense Force` };
  if (state.service.sdf) return { ok: false, reason: 'Already a member' };
  if (state.character.age < 18 || state.character.age > 65) return { ok: false, reason: 'Ages 18–65' };
  if (state.military.service) return { ok: false, reason: 'Already in uniform' };
  if (hasFelony(state)) return { ok: false, reason: 'Fails background check' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (state.stats.fitness < 25 || state.stats.health < 35) return { ok: false, reason: 'Fails the physical' };
  return { ok: true };
}

/**
 * Promotion in a State Defense Force is far easier than in the federal
 * military: no promotion boards and no up-or-out. You move up when you've
 * done your time in rank (a year as junior enlisted, two above that), have
 * the school for the next rank, and a slot opens above you in the unit.
 * Nobody is ever separated for not being promoted.
 */
export const SDF_SLOTS = [Infinity, Infinity, 10, 6, 4, 2, 4, 3, 2, 1];
export const SDF_SCHOOLS = {
  bot: { name: 'Basic Orientation Training', forRank: 1, stat: 'fitness', base: 0.95 },
  mems: { name: 'Military Emergency Management Specialist (MEMS) Basic Badge', forRank: 2, stat: 'smarts', base: 0.85 },
  nco: { name: 'State Guard NCO Academy', forRank: 3, stat: 'smarts', base: 0.85 },
  woc: { name: 'Warrant Officer Candidate Course', forRank: 5, stat: 'smarts', base: 0.8 },
  ocs: { name: 'State Guard Officer Candidate School', forRank: 6, stat: 'smarts', base: 0.8 },
  memsSenior: { name: 'MEMS Senior Badge', forRank: 7, stat: 'smarts', base: 0.8 },
  staff: { name: 'State Guard Command and Staff Course', forRank: 8, stat: 'smarts', base: 0.75 },
};
export const sdfSchoolFor = (rank) => Object.entries(SDF_SCHOOLS).find(([, s]) => s.forRank === rank)?.[0] ?? null;
export const timeInRank = (rank) => (rank <= 1 ? 1 : 2);

/** Prior service carries rank (and its schooling) into a State Defense Force. */
function startingRank(state) {
  const last = [...state.military.history].reverse().find((h) => !['dishonorable', 'bcd', 'oth'].includes(h.discharge));
  if (!last) return 0;
  const n = Number(last.rankCode.slice(2));
  return last.track === 'officer' ? Math.min(9, 5 + n) : last.track === 'warrant' ? 5 : Math.min(5, Math.max(1, n - 2));
}

function guardsman(rng, org, rankIndex) {
  const gender = rng.pick(['male', 'female', 'male']);
  const n = randomName(rng, gender);
  const p = { id: rng.id('sg_'), name: `${n.firstName} ${n.lastName}`, gender, age: rng.int(20, 66), rankIndex, title: SDF_RANKS[rankIndex], years: rng.int(0, 15), rel: rng.int(40, 70), performance: rng.int(40, 80) };
  org.people[p.id] = p;
  return p;
}

/** The State Guard as an organization: a roster with a fixed number of slots per rank. */
export function ensureSdfOrg(state, stateId) {
  initOrgs(state);
  const key = `sdf:${stateId}`;
  let org = state.orgs.byId[key];
  if (!org) {
    const rng = sideRng(state);
    org = { id: key, typeId: 'sdf', sdf: true, name: STATE_DEFENSE_FORCES[stateId], regionId: state.character.regionId, people: {}, departments: {}, head: null };
    for (let r = 0; r < SDF_RANKS.length; r++) {
      const n = Number.isFinite(SDF_SLOTS[r]) ? SDF_SLOTS[r] - (rng.chance(0.5) ? 1 : 0) : rng.int(12, 25);
      for (let i = 0; i < n; i++) guardsman(rng, org, r);
    }
    state.orgs.byId[key] = org;
  }
  return org;
}

export const holdersAt = (org, rank) => Object.values(org.people).filter((p) => p.rankIndex === rank).length;
export const slotOpen = (org, rank, sdf) => holdersAt(org, rank) + (sdf?.rankIndex === rank ? 1 : 0) < SDF_SLOTS[rank];

/** What's between you and the next rank (empty list = ready). */
export function sdfNextRank(state) {
  const sdf = state.service.sdf;
  if (!sdf) return null;
  const next = sdf.rankIndex + 1;
  if (next >= SDF_RANKS.length) return { next: null, missing: ['Top rank'] };
  const missing = [];
  const need = timeInRank(sdf.rankIndex) - (sdf.yearsInRank ?? 0);
  if (need > 0) missing.push(`${need} yr in rank`);
  const school = sdfSchoolFor(next);
  if (school && !sdf.schools?.[school]) missing.push(SDF_SCHOOLS[school].name);
  const org = state.orgs?.byId?.[`sdf:${sdf.stateId}`];
  if (org && !slotOpen(org, next, null)) missing.push(`an open ${SDF_RANKS[next]} slot`);
  return { next: SDF_RANKS[next], missing };
}

export function joinSdf(ctx) {
  const { state } = ctx;
  const check = sdfEligibility(state);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const stateId = stateIdOf(state);
  const rankIndex = startingRank(state);
  const schools = {};
  for (const [id, s] of Object.entries(SDF_SCHOOLS)) if (s.forRank <= rankIndex) schools[id] = state.character.age;
  state.service.sdf = { stateId, name: STATE_DEFENSE_FORCES[stateId], rankIndex, yearsInRank: 0, schools, years: 0, activations: 0, joinedAge: state.character.age };
  const org = ensureSdfOrg(state, stateId);
  // Prior-service officers and NCOs come in at their rank; someone at that rank retires to make room.
  while (Number.isFinite(SDF_SLOTS[rankIndex]) && holdersAt(org, rankIndex) + 1 > SDF_SLOTS[rankIndex]) {
    delete org.people[Object.values(org.people).find((p) => p.rankIndex === rankIndex).id];
  }
  ctx.log(`You joined the ${STATE_DEFENSE_FORCES[stateId]} as a ${SDF_RANKS[rankIndex]}. Monthly drills, unpaid, called up only by the governor.`, '🛡️', 'milestone');
  ctx.toast('Joined the State Defense Force', 'good');
}

export function sdfSchool(ctx, id) {
  const { state, rng } = ctx;
  const sdf = state.service.sdf;
  const s = SDF_SCHOOLS[id];
  if (!sdf || !s) return;
  if (sdf.schools?.[id]) return ctx.toast('Already completed', 'warn');
  if (s.forRank > sdf.rankIndex + 1) return ctx.toast(`Open to ${SDF_RANKS[s.forRank - 1]}s and above`, 'warn');
  if (yearlyCount(state, 'service.sdfSchool')) return ctx.toast('One course a year', 'warn');
  bumpYearly(state, 'service.sdfSchool');
  if (!rng.chance(clamp(s.base + (state.stats[s.stat] - 55) / 200, 0.4, 0.98))) return ctx.log(`You didn't pass ${s.name} this time. Try again next year.`, '📚', 'warn');
  sdf.schools = { ...sdf.schools, [id]: state.character.age };
  ctx.log(`You completed ${s.name}.`, '🎓', 'good');
}
export function leaveSdf(ctx, reason) {
  const sdf = ctx.state.service.sdf;
  if (!sdf) return;
  ctx.state.service.history.push({ kind: 'sdf', name: sdf.name, title: SDF_RANKS[sdf.rankIndex], years: sdf.years, endAge: ctx.state.character.age, reason });
  ctx.state.service.sdf = null;
  ctx.log(`You left the ${sdf.name}. ${reason}.`, '🛡️');
}

function sdfTick(ctx) {
  const { state, rng } = ctx;
  const sdf = state.service.sdf;
  if (!sdf) return;
  if (stateIdOf(state) !== sdf.stateId) return leaveSdf(ctx, 'Moved out of state');
  if (isOnActiveDuty(state)) return;
  sdf.years += 1;
  sdf.yearsInRank = (sdf.yearsInRank ?? sdf.years) + 1;
  sdf.schools ??= {};
  ctx.log(rng.pick(['State Guard drill weekend: shelter operations and emergency communications.', 'State Guard drill: search-and-rescue training with the county.', 'Annual training: running a mock point of distribution for food and water.']), '🛡️', 'muted');
  const org = ensureSdfOrg(state, sdf.stateId);
  // Members retire and move away; slots open.
  for (const p of Object.values(org.people)) {
    p.years += 1;
    if (rng.chance(p.age > 62 ? 0.25 : 0.12)) delete org.people[p.id];
    else p.age += 1;
  }
  // You get the first shot at an opening you qualify for.
  const nr = sdfNextRank(state);
  if (nr?.next && !nr.missing.length && rng.chance(0.85)) {
    sdf.rankIndex += 1;
    sdf.yearsInRank = 0;
    ctx.log(`State Guard: promoted to ${SDF_RANKS[sdf.rankIndex]}.`, '⬆️', 'good');
    ctx.stat('happiness', 3);
  } else if (nr?.next && nr.missing.length === 1 && sdfSchoolFor(sdf.rankIndex + 1) && !sdf.schools[sdfSchoolFor(sdf.rankIndex + 1)] && !state.prompts.some((p) => p.type === 'service.sdfSchoolSeat')) {
    const id = sdfSchoolFor(sdf.rankIndex + 1);
    ctx.prompt({ type: 'service.sdfSchoolSeat', icon: '📚', title: `State Guard: ${SDF_SCHOOLS[id].name}`, text: `A slot for ${SDF_RANKS[sdf.rankIndex + 1]} is open, and you're qualified except for ${SDF_SCHOOLS[id].name}. There's a class next month.`, options: [{ id: 'go', label: '🎓 Enroll' }, { id: 'skip', label: '⏳ Not this year' }], data: { id } });
  }
  // Remaining vacancies go to members below.
  for (let r = SDF_RANKS.length - 1; r >= 1; r--) {
    while (slotOpen(org, r, sdf) && Number.isFinite(SDF_SLOTS[r]) && rng.chance(0.6)) {
      const pick = Object.values(org.people).filter((p) => p.rankIndex === r - 1).sort((a, b) => b.years - a.years)[0];
      if (!pick) break;
      pick.rankIndex = r;
      pick.title = SDF_RANKS[r];
    }
  }
  while (holdersAt(org, 0) + holdersAt(org, 1) < 15) guardsman(rng, org, 0);
}

/* ------------------------------------------------------------------ */
/* Activations                                                         */
/* ------------------------------------------------------------------ */

/** The governor's call. Players who are governor decide; otherwise governors usually activate. */
export function stateEmergency(ctx, kind, { name, severity = 1 }) {
  const { state } = ctx;
  if (governorIsYou(state)) {
    ctx.prompt({
      type: 'service.governorActivation',
      icon: '⭐',
      title: `Activate the National Guard? (${MISSIONS[kind].name})`,
      text: kind === 'disaster' ? `${name} has overwhelmed local responders.`
        : kind === 'unrest' ? `Protests in ${name} have turned violent. Police are stretched thin and businesses are burning.`
          : 'Federal agents report record crossings in a remote sector. The legislature wants the Guard on the border.',
      options: [
        { id: 'guard', label: '🛡️ Activate the National Guard', hint: 'State active duty: the state pays' },
        ...(STATE_DEFENSE_FORCES[stateIdOf(state)] ? [{ id: 'sdf', label: '🏳️ Call up the State Guard only', hint: 'Cheaper, unarmed support' }] : []),
        { id: 'none', label: '🙅 Leave it to local authorities' },
      ],
      data: { kind, name, severity },
    });
    return;
  }
  const odds = { disaster: 0.85, unrest: 0.5, border: 0.6 }[kind];
  if (ctx.rng.chance(odds)) activate(ctx, kind, { name, severity, sdf: kind === 'disaster' });
}

function activate(ctx, kind, { name, severity, sdf = false, guard = true }) {
  const { state } = ctx;
  const svc = state.military.service;
  if (guard && inGuard(state) && !svc.deployedThisYear && !svc.isNew) {
    ctx.prompt({
      type: 'service.guardMission',
      icon: MISSIONS[kind].icon,
      title: `State Active Duty: ${MISSIONS[kind].name}`,
      text: kind === 'disaster' ? `The governor activated your Guard unit for ${name}.`
        : kind === 'unrest' ? `The governor activated your unit for the unrest in ${name}. You're issued riot gear and rules for the use of force.`
          : 'Your unit is going to the border for a 90-day rotation supporting federal agents.',
      options: MISSION_OPTIONS[kind],
      data: { kind, name, severity },
    });
  }
  if (sdf && state.service.sdf && !isOnActiveDuty(state)) {
    state.service.sdf.activations += 1;
    ctx.earn(Math.round(150 * 10 * severity), 'State active duty pay (State Guard)', { wage: true });
    ctx.stat('happiness', 3);
    ctx.log(`The governor called up the ${state.service.sdf.name} for ${name}: you ran a shelter and a supply point for ${severity * 5} days.`, '🛡️', 'good');
  }
}

const MISSION_OPTIONS = {
  disaster: [
    { id: 'rescue', label: '🚁 Rescue and evacuation', hint: 'Some risk' },
    { id: 'supply', label: '📦 Run supply convoys and distribution points', hint: 'Low risk' },
  ],
  unrest: [
    { id: 'line', label: '🛡️ Hold the line by the book', hint: 'Restraint under pressure' },
    { id: 'deescalate', label: '🗣️ Talk to the crowd and de-escalate', hint: 'Some risk; can calm things' },
    { id: 'force', label: '🔫 Push the crowd back hard', hint: 'Fast, but investigations follow', tone: 'danger' },
  ],
  border: [
    { id: 'observe', label: '🔭 Man observation posts', hint: 'Long, quiet nights' },
    { id: 'engineer', label: '🚧 Build barriers and roads', hint: 'Hard work' },
  ],
};

export const StateForceResolvers = {
  sdfSchoolSeat(ctx, data, optionId) {
    if (optionId === 'go') sdfSchool(ctx, data.id);
  },
  governorActivation(ctx, data, optionId) {
    const { state } = ctx;
    const o = state.politics.office;
    const swing = { disaster: { guard: 6, sdf: 3, none: -10 }, unrest: { guard: 2, sdf: -2, none: -6 }, border: { guard: 3, sdf: 0, none: -2 } }[data.kind][optionId];
    if (o) o.approval = Math.round(clamp(o.approval + swing + ctx.rng.int(-4, 4), 0, 100));
    if (optionId === 'none') return ctx.log(`You kept the Guard home during the ${MISSIONS[data.kind].name}. ${swing < -4 ? 'The criticism was fierce.' : 'Some praised your restraint.'}`, '⭐', swing < -4 ? 'bad' : 'muted');
    ctx.log(`You ${optionId === 'guard' ? 'activated the National Guard' : 'called up the State Guard'} for the ${MISSIONS[data.kind].name}${data.name ? ` (${data.name})` : ''}.`, '⭐', 'good');
    activate(ctx, data.kind, { name: data.name, severity: data.severity, sdf: true, guard: optionId === 'guard' });
  },

  guardMission(ctx, data, optionId) {
    const { state, rng } = ctx;
    const svc = state.military.service;
    if (!svc) return;
    const days = data.kind === 'border' ? 90 : rng.int(10, 30) * data.severity;
    ctx.earn(Math.round(monthlyBasePay(svc) * (days / 30) + 2000), 'State active duty pay', { wage: true });
    ctx.stat('stress', 5);
    svc.stateActivations = (svc.stateActivations ?? 0) + 1;
    if (data.kind === 'disaster') {
      const risky = optionId === 'rescue';
      if (risky && rng.chance(0.1)) { ctx.stat('health', -rng.int(5, 15)); ctx.log('You were hurt pulling people out of the water.', '🩹', 'bad'); }
      svc.eval = Math.min(100, svc.eval + (risky ? 7 : 5));
      ctx.log(risky ? `You pulled ${rng.int(3, 20)} people out of flooded homes during ${data.name}.` : `Your convoys kept water and food moving into cut-off towns during ${data.name}.`, '🛡️', 'good');
      if (data.severity >= 2 || (risky && rng.chance(0.3))) awardMedal(ctx, 'humanitarian', { branch: 'army', citation: `State active duty — ${data.name}.` });
    } else if (data.kind === 'unrest') {
      if (optionId === 'force') {
        if (rng.chance(0.4)) {
          svc.eval = Math.max(0, svc.eval - 10);
          ctx.log('Video of your unit\'s push went viral. The state opened an investigation and you were pulled off the line.', '📹', 'bad');
          ctx.emit('health:trauma', { amount: 8, source: 'unrest' });
        } else {
          ctx.log('The street cleared. Some called it order; others called it a crackdown.', '🚧', 'warn');
          svc.eval = Math.min(100, svc.eval + 2);
        }
      } else if (optionId === 'deescalate') {
        if (rng.chance(0.65)) { svc.eval = Math.min(100, svc.eval + 6); ctx.log('You talked a crowd down on the third night. Your commander wrote it up.', '🗣️', 'good'); }
        else { ctx.stat('health', -rng.int(3, 10)); ctx.log('A thrown brick ended the conversation. You took stitches.', '🧱', 'bad'); }
      } else {
        svc.eval = Math.min(100, svc.eval + 4);
        ctx.log(`Twelve-hour shifts behind a shield line in ${data.name}. Your unit held, and nobody was seriously hurt.`, '🛡️', 'good');
      }
    } else {
      svc.eval = Math.min(100, svc.eval + 3);
      ctx.stat('happiness', -3);
      ctx.log(optionId === 'observe' ? 'Ninety days of night shifts in an observation tower, calling sightings to the Border Patrol.' : 'Ninety days of building roads and barriers in the desert heat.', '🛂', 'military');
    }
  },
};

/** Yearly: civil unrest and border missions can trigger activations. */
export function stateForcesTick(ctx) {
  const { state, rng } = ctx;
  sdfTick(ctx);
  const stateId = stateIdOf(state);
  const big = STATES[stateId].population === 'large';
  if (rng.chance(big ? 0.06 : 0.025)) stateEmergency(ctx, 'unrest', { name: rng.pick(['the state capital', 'downtown', 'the largest city']), severity: 1 });
  else if (BORDER_STATES.includes(stateId) && rng.chance(0.12)) stateEmergency(ctx, 'border', { name: 'the southern border', severity: 1 });
}
