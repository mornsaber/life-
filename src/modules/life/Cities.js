/**
 * Living cities: the place you live changes year by year — and you change it.
 *
 *   population  an index (100 = when you arrived): people follow jobs and flee crime
 *   crime       0–100: rises in recessions and where police are thin; falls with good policing
 *   jobs        0–100: the job market, with the economy and the businesses that grow here
 *   prices      an index of house prices and rents
 *   mood        0–100: how the city feels about itself — and its incumbents
 *
 * What moves them: the economy and disasters, and you: a business you grow, a force you run,
 * a council you sit on, a property empire. What they move: hiring odds, the chance of crime
 * finding you, and the housing market.
 *
 * state.world.cities[regionId] = { pop, crime, jobs, prices, mood, since, trend: [{ age, jobs, crime, prices }] }
 */
import { Random } from '../../core/Random.js';
import { REGIONS } from './Regions.js';

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 44729 + state.character.age * 619 + salt) >>> 0);

/** A city's starting point from what we know about the place. */
function seedCity(state, regionId) {
  const r = REGIONS[regionId] ?? {};
  const big = /metro|capital/i.test(r.type ?? '');
  const rural = /rural|town/i.test(r.type ?? '');
  return { pop: 100, crime: big ? 55 : rural ? 25 : 40, jobs: big ? 60 : rural ? 40 : 50, prices: Math.round(100 * (r.market ?? 1)), mood: 55, since: state.character.age, trend: [] };
}

/** Read-only for views. */
export const cityOf = (state, regionId = state.character.regionId) => state.world?.cities?.[regionId] ?? seedCity(state, regionId);
export function ensureCity(state, regionId = state.character.regionId) {
  state.world.cities ??= {};
  state.world.cities[regionId] ??= seedCity(state, regionId);
  return state.world.cities[regionId];
}
/** Multipliers other systems read: crime (around 1), hiring (around 0). */
export const cityCrimeFactor = (state) => (state.world?.cities?.[state.character.regionId] ? 0.6 + cityOf(state).crime / 125 : 1);
export const cityJobsBonus = (state) => (state.world?.cities?.[state.character.regionId] ? (cityOf(state).jobs - 50) / 600 : 0);

/** The player's own footprint on the city they live in. */
function yourEffect(state) {
  const fx = { jobs: 0, crime: 0, prices: 0, mood: 0 };
  const here = state.character.regionId;
  for (const b of [state.business?.current, ...(state.business?.holdings ?? [])].filter(Boolean)) {
    if (!b.regionId || b.regionId === here) fx.jobs += Math.min(4, (b.staff?.headcount ?? 0) / 60);
  }
  if (state.institution?.kind === 'police') fx.crime -= (state.institution.quality ?? 50) >= 60 ? 3 : 1;
  const units = state.housing.properties.filter((p) => p.regionId === here && p.use === 'rental').length;
  fx.prices += Math.min(3, units / 20);
  if (state.politics?.office && ['cityCouncil', 'mayor', 'countyCommissioner'].includes(state.politics.office.id)) fx.mood += 2;
  return fx;
}

export function citiesTick(ctx) {
  const { state } = ctx;
  const c = ensureCity(state);
  const rng = sideRng(state, 0xc1);
  const phase = state.economy?.phase;
  const before = { jobs: c.jobs, crime: c.crime, prices: c.prices };
  const econ = { expansion: [2, -1, 3, 1], peak: [1, 0, 5, 2], recession: [-7, 3, -6, -6], recovery: [3, -1, 1, 2] }[phase] ?? [0, 0, 0, 0];
  const fx = yourEffect(state);
  c.jobs = clamp(c.jobs + econ[0] + fx.jobs + rng.int(-2, 2) + (50 - c.jobs) * 0.05);
  c.crime = clamp(c.crime + econ[1] + fx.crime + rng.int(-2, 2) + (c.jobs < 35 ? 2 : 0) + (45 - c.crime) * 0.04);
  c.prices = clamp(c.prices * (1 + (econ[2] + fx.prices + (c.jobs - 50) / 15) / 100), 30, 400);
  c.mood = clamp(c.mood + econ[3] + fx.mood + (c.crime > 65 ? -2 : 0) + rng.int(-2, 2) + (55 - c.mood) * 0.05);
  // People follow jobs and leave crime.
  c.pop = clamp(c.pop * (1 + ((c.jobs - 50) / 1000) - (c.crime > 70 ? 0.01 : 0)), 40, 300);
  c.trend.push({ age: state.character.age, jobs: c.jobs, crime: c.crime, prices: c.prices });
  if (c.trend.length > 15) c.trend.shift();
  // Feedback: the housing market follows the city's prices.
  const m = state.housing.market;
  if (m && m[state.character.regionId] != null) m[state.character.regionId] = Math.round(m[state.character.regionId] * (1 + (c.prices - before.prices) / Math.max(1, before.prices) * 0.3) * 1000) / 1000;
  // Big swings make the local news (News.js).
  const name = REGIONS[state.character.regionId]?.name?.split(',')[0] ?? 'Your city';
  if (c.crime - before.crime >= 5) ctx.emit('news:story', { tier: 'local', headline: `Crime rises in ${name}`, weight: 3, icon: '🚨' });
  if (c.jobs - before.jobs <= -6) ctx.emit('news:story', { tier: 'local', headline: `Layoffs hit ${name} as the jobs market shrinks`, weight: 3, icon: '📉' });
  if (c.jobs - before.jobs >= 4) ctx.emit('news:story', { tier: 'local', headline: `${name} hiring boom continues`, weight: 2, icon: '📈' });
}

export const CitiesModule = {
  id: 'cities',
  order: 44.5,

  setup(engine) {
    engine.bus.on('disaster:struck', ({ ctx }) => {
      const c = ensureCity(ctx.state);
      c.mood = clamp(c.mood - 8);
      c.pop = clamp(c.pop * 0.98, 40, 300);
      c.jobs = clamp(c.jobs - 3);
    });
  },

  onAgeUp(ctx) {
    if (ctx.state.character.age >= 1) citiesTick(ctx);
  },
};
