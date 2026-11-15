/**
 * Scenarios and the sandbox.
 *
 *   Scenarios   challenges with a fixed start: the same place, the same year and the same world
 *               (a fixed world seed) for everyone who plays them, so scores compare. They live in
 *               Achievements.js CHALLENGES with a `scenario`; this module sets the start up.
 *               Rags to Riches (Manchester, 1850), Prime Minister from the Workhouse (1880),
 *               Survive 1914–1945 (Berlin, 1896), the American Dream (Naples, 1890).
 *   Sandbox     a life you can edit: money, stats, health, a clean record. Sandbox lives don't
 *               go in the Hall of Fame.
 *
 * state.flags.sandbox
 */
import { CHALLENGES } from './Achievements.js';
import { REGIONS } from './Regions.js';
import { priceLevel } from '../world/Countries.js';

const local = (state, n) => Math.round(n * priceLevel(state));

/** The start a scenario fixes: the options for newLife, and what's set up after. */
export const scenarioOf = (id) => CHALLENGES[id]?.scenario ?? null;
export function scenarioOptions(id) {
  const s = scenarioOf(id);
  return s ? { countryId: s.countryId, startYear: s.startYear, ...(s.gender ? { gender: s.gender } : {}) } : {};
}

function setUp(state) {
  const s = scenarioOf(state.challenge?.id);
  if (!s || state.flags?.scenarioSet) return;
  state.flags.scenarioSet = true;
  if (s.worldSeed != null) state.world.seed = s.worldSeed;
  if (s.regionId && REGIONS[s.regionId]) state.character.regionId = s.regionId;
  if (s.poor) {
    state.finances.cash = 0;
    for (const p of state.people?.list ?? []) if (['mother', 'father'].includes(p.relation)) { p.income = Math.min(p.income ?? 0, local(state, 9000)); p.careerIncome = p.income; p.job = p.income ? (state.character.birthYear < 1900 ? 'mill hand' : 'labourer') : null; if (p.life) p.life.netWorth = 0; }
    state.flags.poorStart = true;
  }
}

export const ScenariosModule = {
  id: 'scenarios',
  order: 999,
  init(state) { setUp(state); },
  actions: {
    /** Sandbox: edit your life. */
    sandbox(ctx, what) {
      const { state } = ctx;
      if (!state.flags?.sandbox) return ctx.toast('Only in a sandbox life', 'warn');
      switch (what) {
        case 'money': ctx.earn(local(state, 1e6), 'Sandbox'); return ctx.log('Sandbox: +$1 million.', '🧪');
        case 'stats': for (const k of ['health', 'happiness', 'smarts', 'looks', 'fitness']) ctx.stat(k, 10); ctx.stat('stress', -10); return ctx.log('Sandbox: every stat up.', '🧪');
        case 'heal': state.stats.health = 100; state.health.conditions = (state.health?.conditions ?? []).filter((c) => c.chronic); return ctx.log('Sandbox: fully healed.', '🧪');
        case 'record': state.legal.record = []; state.legal.investigations = []; return ctx.log('Sandbox: a clean record.', '🧪');
        default: return undefined;
      }
    },
  },
};
