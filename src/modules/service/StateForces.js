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
import { hasFelony, isOnActiveDuty } from '../../core/State.js';
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

/** Prior service carries rank into a State Defense Force. */
function startingRank(state) {
  const last = state.military.history.at(-1);
  if (!last || ['dishonorable', 'bcd', 'oth'].includes(last.discharge)) return 0;
  const n = Number(last.rankCode.slice(2));
  return last.track === 'officer' ? Math.min(9, 5 + n) : Math.min(5, Math.max(1, n - 2));
}

export function joinSdf(ctx) {
  const { state } = ctx;
  const check = sdfEligibility(state);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const stateId = stateIdOf(state);
  state.service.sdf = { stateId, name: STATE_DEFENSE_FORCES[stateId], rankIndex: startingRank(state), years: 0, activations: 0, joinedAge: state.character.age };
  ctx.log(`You joined the ${STATE_DEFENSE_FORCES[stateId]} as a ${SDF_RANKS[state.service.sdf.rankIndex]}. Monthly drills, unpaid, called up only by the governor.`, '🛡️', 'milestone');
  ctx.toast('Joined the State Defense Force', 'good');
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
  ctx.log(rng.pick(['State Guard drill weekend: shelter operations and emergency communications.', 'State Guard drill: search-and-rescue training with the county.', 'Annual training: running a mock point of distribution for food and water.']), '🛡️', 'muted');
  if (sdf.rankIndex < SDF_RANKS.length - 1 && sdf.years >= (sdf.rankIndex + 1) * 2 && rng.chance(0.4)) {
    sdf.rankIndex += 1;
    ctx.log(`State Guard: promoted to ${SDF_RANKS[sdf.rankIndex]}.`, '⬆️', 'good');
  }
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
