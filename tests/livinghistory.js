/**
 * Living through history: home-front episodes tied to the war being fought, epidemics you
 * respond to, the great disasters on their dates, and the emigrant's crossing.
 *
 *   node tests/livinghistory.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { LivingHistoryModule, crossingOf, epidemicOptions, EPISODES } from '../src/modules/world/LivingHistory.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year, cc = 'GB', ageNow = 30, seed = 2) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - ageNow });
  state.character.age = ageNow;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};
const atWarWith = (state, cc, id) => { state.world.wars = { ...(state.world.wars ?? {}), [cc]: { id, name: id, phase: 'active', intensity: 4 } }; };

const tests = {
  'the Blitz comes to a British life in 1940, if Britain is at war'() {
    const { state, ctx } = life(1940);
    state.lived = [{ id: 'evacuation' }, { id: 'homeGuard' }, { id: 'victoryGarden' }];
    atWarWith(state, 'GB', 'ww2');
    LivingHistoryModule.onAgeUp(ctx);
    assert.ok(state.prompts.some((p) => p.type === 'livingHistory.episode' && p.data.id === 'blitz'), JSON.stringify(state.prompts.map((p) => p.data)));
  },
  'no Blitz in a world where Britain is at peace'() {
    const { state, ctx } = life(1940);
    state.world.wars = {};
    LivingHistoryModule.onAgeUp(ctx);
    assert.ok(!state.prompts.some((p) => p.data?.id === 'blitz'));
  },
  'every episode answers, and the choices land'() {
    const { engine, state } = life(1940);
    atWarWith(state, 'GB', 'ww2');
    state.lived = [{ id: 'evacuation' }];
    LivingHistoryModule.onAgeUp(engine.context());
    const p = state.prompts.find((x) => x.type === 'livingHistory.episode');
    engine.resolvePrompt(p.id, p.options[0].id);
    assert.ok(state.lived.some((l) => l.id === p.data.id));
  },
  'epidemic responses of their day, and they change the odds'() {
    const { state: s1918 } = life(1918, 'US');
    const ids = epidemicOptions(s1918, { id: 'spanishFlu' }).map((o) => o.id);
    assert.ok(ids.includes('mask') && ids.includes('quack') && !ids.includes('vaccine'));
    const { state: s2021 } = life(2021, 'US');
    const now = epidemicOptions(s2021, { id: 'covid' }).map((o) => o.id);
    assert.ok(now.includes('vaccine') && !now.includes('quack') && !now.includes('flee'));
    const { engine, state } = life(1918, 'US');
    state.lived = EPISODES.map((e) => ({ id: e.id }));
    LivingHistoryModule.onAgeUp(engine.context());
    const p = state.prompts.find((x) => x.type === 'livingHistory.epidemic');
    assert.ok(p, 'the flu arrives in 1918');
    engine.resolvePrompt(p.id, 'shut');
    assert.equal(state.periodHealth.guard.spanishFlu, 0.6);
  },
  'the Chicago fire only in Chicago, only in 1871'() {
    const { state, ctx } = life(1871, 'US');
    state.character.regionId = 'chicago';
    LivingHistoryModule.onAgeUp(ctx);
    assert.ok(state.prompts.some((p) => p.data?.id === 'chicagoFire'));
    const { state: s2, ctx: c2 } = life(1872, 'US');
    s2.character.regionId = 'chicago';
    LivingHistoryModule.onAgeUp(c2);
    assert.ok(!s2.prompts.some((p) => p.data?.id === 'chicagoFire'));
  },
  'the crossing: sail, steam, Ellis Island, and none by air'() {
    assert.equal(crossingOf('IE', 'US', 1850).sail, true);
    assert.equal(crossingOf('IT', 'US', 1905).arrival, 'Ellis Island');
    assert.equal(crossingOf('IT', 'US', 1880).arrival, 'Castle Garden');
    assert.equal(crossingOf('CN', 'US', 1915).arrival, 'Angel Island');
    assert.equal(crossingOf('GB', 'CA', 1950).arrival, 'Pier 21 in Halifax');
    assert.equal(crossingOf('GB', 'US', 1970), null);
    assert.equal(crossingOf('FR', 'DE', 1900), null);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
