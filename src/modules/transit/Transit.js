/**
 * Getting to work: drive, ride transit, bike, walk or pay for rides.
 *
 * Each region has its own transit coverage (a New York subway vs. a rural
 * county with no buses) and monthly pass price; a voter-approved transit tax
 * improves service. Commuters pay for their choice and live with it:
 * reliable transit means reading on the train, unreliable transit means
 * missed buses and late arrivals, and having no way to get to work at all
 * costs you at the job. Large employers offer pre-tax commuter benefits;
 * seniors and students ride at half fare.
 *
 * state.transit = { mode: 'auto'|'drive'|'transit'|'bike'|'walk'|'rideshare', last: { mode, cost } }
 */
import { regionOf } from '../life/Regions.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { VEHICLE_TYPES } from '../vehicles/Vehicles.js';

export const MODES = {
  drive: { label: 'Drive', icon: '🚗' },
  transit: { label: 'Public transit', icon: '🚇' },
  bike: { label: 'Bike', icon: '🚲' },
  walk: { label: 'Walk', icon: '🚶' },
  rideshare: { label: 'Rideshare & taxis', icon: '🚕' },
};
/** Pre-tax commuter benefit limit (IRS §132(f), monthly × 12). */
export const COMMUTER_BENEFIT = 325 * 12;
export const TRANSIT_TAX_BOOST = 15;

/** Effective transit coverage here, including voter-approved transit taxes. */
export function transitQuality(state) {
  const region = regionOf(state);
  const local = state.civic?.local?.[region.id];
  return Math.min(100, (region.transit ?? 0) + (local?.passed?.includes('transitTax') ? TRANSIT_TAX_BOOST : 0));
}

export const ownsCar = (state) => (state.vehicles?.owned ?? []).some((v) => ['car', 'bike'].includes(VEHICLE_TYPES[v.typeId]?.category));
export const canDrive = (state) => ownsCar(state) && (hasCredential(state, 'driverLicense') || hasCredential(state, 'motorcycle'));

/** Does this person commute somewhere this year? */
export function commutes(state) {
  if (state.legal.incarceration || state.character.age < 16) return false;
  if (state.military.service?.component === 'active') return false;
  const job = state.career.job;
  const working = job && !job.remote && job.workMode !== 'remote' && !job.employer.benefits?.housing;
  return Boolean(working || state.education.enrolled);
}

/** Can you use this mode here? Returns { ok, reason }. */
export function modeAvailable(state, mode) {
  const region = regionOf(state);
  if (mode === 'drive') return canDrive(state) ? { ok: true } : { ok: false, reason: 'Needs a car and a license' };
  if (mode === 'transit') return transitQuality(state) >= 15 ? { ok: true } : { ok: false, reason: 'No usable transit here' };
  if (mode === 'walk') return region.walkable ? { ok: true } : { ok: false, reason: 'Too spread out to walk' };
  if (mode === 'bike') return state.stats.fitness >= 30 ? { ok: true } : { ok: false, reason: 'Needs 30+ fitness' };
  return { ok: true };
}

/** What 'auto' resolves to: car if you have one, then transit, then rides. */
export function resolvedMode(state) {
  const pref = state.transit?.mode ?? 'auto';
  if (pref !== 'auto' && modeAvailable(state, pref).ok) return pref;
  if (modeAvailable(state, 'drive').ok) return 'drive';
  if (regionOf(state).walkable && transitQuality(state) < 40) return 'walk';
  if (modeAvailable(state, 'transit').ok) return 'transit';
  if (regionOf(state).walkable) return 'walk';
  return 'stranded';
}

/** Yearly pass cost, with senior/student half fare. */
export function passCost(state) {
  const region = regionOf(state);
  const half = state.character.age >= 65 || (state.education.enrolled && !state.career.job);
  return Math.round(region.fare * 12 * (half ? 0.5 : 1));
}

export function rideshareCost(state) {
  return Math.round(7000 * regionOf(state).col / 100) * 100;
}

export const TransitModule = {
  id: 'transit',
  order: 46.5,

  init(state) {
    state.transit ??= { mode: 'auto', last: null };
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (!commutes(state)) {
      state.transit.last = null;
      return;
    }
    const mode = resolvedMode(state);
    const q = transitQuality(state);
    const job = state.career.job;
    let cost = 0;
    if (mode === 'transit') {
      cost = passCost(state);
      if (cost) ctx.spend(cost, 'Transit pass', { allowDebt: true });
      if (job && ['large', 'enterprise'].includes(job.employer.size) && cost) ctx.deduct(Math.min(cost, COMMUTER_BENEFIT), 'Pre-tax commuter benefit');
      if (q >= 70) {
        ctx.stat('stress', -1);
        if (rng.chance(0.4)) ctx.stat('smarts', 1);
      } else if (q >= 40) ctx.stat('stress', 1);
      else {
        ctx.stat('stress', 4);
        if (job) job.performance = Math.max(0, job.performance - 3);
        if (rng.chance(0.4)) ctx.log('The bus came every 45 minutes — when it came. You were late more often than your boss liked.', '🚏', 'warn');
      }
      if (rng.chance(0.12)) ctx.log(rng.pick(['A signal failure stranded your train for an hour.', 'You finished three novels on the train this year.', 'A stranger on the bus turned out to be from your hometown.', 'A track fire shut down your line for a week.', 'Someone threw up on your shoes on the late train.']), '🚇');
    } else if (mode === 'bike') {
      ctx.stat('fitness', 2);
      if (rng.chance(0.015)) {
        ctx.stat('health', -rng.int(5, 15));
        ctx.log('A car door opened in front of you in the bike lane.', '🚲', 'bad');
      }
    } else if (mode === 'walk') {
      ctx.stat('fitness', 1);
    } else if (mode === 'rideshare') {
      cost = rideshareCost(state);
      ctx.spend(cost, 'Rideshare and taxis', { allowDebt: true });
      ctx.stat('stress', -1);
    } else if (mode === 'drive') {
      if (regionOf(state).col >= 1.2) ctx.stat('stress', 2);
    } else {
      // No car, no transit: rides from friends, long walks along highways, missed shifts.
      ctx.stat('stress', 5);
      ctx.stat('happiness', -2);
      if (job) job.performance = Math.max(0, job.performance - 6);
      ctx.log('Without a car or a bus line, getting to work meant begging rides and walking the shoulder of the highway.', '🚶', 'warn');
    }
    state.transit.last = { mode, cost };
  },

  actions: {
    setMode(ctx, mode) {
      if (mode !== 'auto' && !MODES[mode]) return;
      const check = mode === 'auto' ? { ok: true } : modeAvailable(ctx.state, mode);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      ctx.state.transit.mode = mode;
      ctx.toast(`Commute: ${mode === 'auto' ? 'automatic' : MODES[mode].label}`, 'info');
    },
  },
};
