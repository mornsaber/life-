/**
 * History outside Britain and America: each country's own moments, on its own timeline.
 *
 *   node tests/worldepisodes.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { LivingHistoryModule, ALL_EPISODES } from '../src/modules/world/LivingHistory.js';
import { WORLD_EPISODES } from '../src/modules/world/WorldEpisodes.js';
import { timesCard } from '../src/ui/views/EraView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year, cc, ageNow = 25, extra = {}) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - ageNow, gender: 'male' });
  state.character.age = ageNow;
  state.character.gender = extra.gender ?? 'male';
  if (extra.region) state.character.regionId = extra.region;
  state.prompts = [];
  state.military = { ...(state.military ?? {}), service: null };
  for (const [id, y] of Object.entries(extra.events ?? {})) state.era.events[id] = { year: y, past: true };
  if (extra.war) state.world.wars = { [cc]: { id: extra.war, name: extra.war, phase: 'active', intensity: 4 } };
  return { engine, state, ctx: engine.context() };
};
const offered = (state) => state.prompts.filter((p) => p.type === 'livingHistory.episode').map((p) => p.data.id);
const only = (state, id) => { state.lived = ALL_EPISODES.filter((e) => e.id !== id).map((e) => ({ id: e.id })); };

const CASES = [
  ['redOrWhite', 1918, 'RU', { events: { russianRevolution: 1917 } }],
  ['farmFamine', 1932, 'UA', { events: { russianRevolution: 1917 } }],
  ['leningrad', 1942, 'RU', { region: 'stpetersburg', war: 'ww2' }],
  ['vouchers', 1992, 'RU', { events: { russianRevolution: 1917, sovietCollapse: 1991 } }],
  ['commune', 1871, 'FR', { region: 'paris', events: { francoPrussianWar: 1870 } }],
  ['sto', 1943, 'FR', { war: 'ww2' }, 21],
  ['mai68', 1968, 'FR', {}],
  ['rubble', 1946, 'DE', { events: { ww2: 1939 } }],
  ['samurai', 1877, 'JP', { events: { meiji: 1868 } }],
  ['leapFamine', 1960, 'CN', { events: { prc: 1949 } }],
  ['culturalRev', 1967, 'CN', { events: { prc: 1949 } }, 18],
  ['quitIndia', 1942, 'IN', { events: { ww2: 1939 } }],
  ['partition', 1947, 'IN', { region: 'delhi' }],
  ['rising', 1916, 'IE', { region: 'dublin' }],
  ['spainSides', 1936, 'ES', { events: { spanishCivilWar: 1936 } }],
  ['goldenLaw', 1888, 'BR', {}],
];

const tests = {
  'each country\'s moment comes on its date'() {
    for (const [id, year, cc, extra, ageNow] of CASES) {
      const { state, ctx } = life(year, cc, ageNow, extra);
      only(state, id);
      LivingHistoryModule.onAgeUp(ctx);
      assert.deepEqual(offered(state), [id], `${id} in ${cc} ${year}`);
    }
  },
  'not where the timeline went another way'() {
    for (const [id, year, cc, extra, ageNow] of CASES.filter(([, , , e]) => e.events)) {
      const { state, ctx } = life(year, cc, ageNow, { ...extra, events: {} });
      for (const k of Object.keys(extra.events)) delete state.era.events[k];
      only(state, id);
      LivingHistoryModule.onAgeUp(ctx);
      assert.ok(!offered(state).includes(id), `${id} without its event`);
    }
  },
  'not for children, and not in another country'() {
    const { state, ctx } = life(1968, 'FR', 8);
    only(state, 'mai68');
    LivingHistoryModule.onAgeUp(ctx);
    assert.deepEqual(offered(state), []);
    const b = life(1968, 'DE', 25);
    only(b.state, 'mai68');
    LivingHistoryModule.onAgeUp(b.ctx);
    assert.deepEqual(offered(b.state), []);
  },
  'every choice resolves and is remembered'() {
    for (const ep of WORLD_EPISODES) for (const o of ep.options) {
      const c = CASES.find(([id]) => id === ep.id);
      if (!c) continue;
      const [id, year, cc, extra, ageNow] = c;
      const { engine, state, ctx } = life(year, cc, ageNow, extra);
      only(state, id);
      LivingHistoryModule.onAgeUp(ctx);
      const p = state.prompts.find((x) => x.data?.id === id);
      engine.resolvePrompt(p.id, o.id);
      assert.ok(state.lived.some((l) => l.id === id && l.year === year), `${id}/${o.id}`);
      assert.ok(Number.isFinite(state.finances.cash), `${id}/${o.id} cash`);
    }
  },
  'Your Times sets what you lived through against the world, decade by decade'() {
    const { engine, state, ctx } = life(1968, 'FR', 25);
    only(state, 'mai68');
    LivingHistoryModule.onAgeUp(ctx);
    const p = state.prompts.find((x) => x.data?.id === 'mai68');
    engine.resolvePrompt(p.id, 'strike');
    state.era.events.ww2 = { year: 1939, past: true };
    state.era.events.coldWar = { year: 1947, past: true };
    const html = timesCard(state);
    assert.match(html, /The 1960s/);
    assert.match(html, /Grenelle/);
    assert.match(html, /Cold War/);
    assert.doesNotMatch(html, /Second World War/, 'before you were born');
    const today = life(2026, 'US', 30);
    assert.match(timesCard(today.state), /Your Times/);
  },
  'fleeing Spain takes you to France'() {
    const { engine, state, ctx } = life(1936, 'ES', 25, { events: { spanishCivilWar: 1936 } });
    only(state, 'spainSides');
    LivingHistoryModule.onAgeUp(ctx);
    const p = state.prompts.find((x) => x.data?.id === 'spainSides');
    engine.resolvePrompt(p.id, 'france');
    assert.equal(state.character.countryId, 'FR');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
