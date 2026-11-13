/**
 * Careers of their day: sport, the arts, discovery, expeditions, espionage, landmarks.
 *
 *   node tests/feats.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { expeditionOptions, frontierOf, FeatsModule } from '../src/modules/career/Feats.js';
import { ShowbizModule } from '../src/modules/career/Showbiz.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year, cc = 'US', ageNow = 30, seed = 4) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - ageNow });
  state.character.age = ageNow;
  state.prompts = [];
  Object.assign(state.stats, { health: 90, fitness: 90, smarts: 90 });
  return { engine, state, ctx: engine.context() };
};

const tests = {
  'expeditions open in their day'() {
    const ids = (y) => expeditionOptions(life(y).state).map((e) => e.id);
    assert.ok(ids(1850).includes('nile') && !ids(1850).includes('everest'));
    assert.ok(ids(1930).includes('everest') && !ids(1930).includes('space'));
    assert.ok(ids(2024).includes('space') && !ids(2024).includes('nile'));
    assert.ok(expeditionOptions(life(1905).state).find((e) => e.id === 'southPole').firstYet);
  },
  'an expedition can be mounted from the Activities tab'() {
    const { engine, state } = life(1905);
    assert.match(VIEWS.activities(state, {}), /Expeditions/);
    engine.dispatch('feats.expedition', 'southPole');
    assert.ok(!state.character.alive || state.feats.expeditions.length === 1);
  },
  'the frontier of the day'() {
    assert.ok(frontierOf(1905).includes('radioactivity'));
    assert.ok(frontierOf(1953).includes('the structure of DNA'));
    assert.ok(!frontierOf(1850).includes('machine learning'));
  },
  'showbiz offers what existed: no television in 1930, radio instead'() {
    const { state, ctx } = life(1930);
    state.career.job = { professionId: 'acting', levelId: 'working', employer: { name: 'x' } };
    ShowbizModule.onAgeUp(ctx);
    const p = state.prompts.find((x) => x.type === 'showbiz.offer');
    const labels = p.options.map((o) => o.label).join(' | ');
    assert.ok(/radio serial/.test(labels) && !/TV series/.test(labels) && !/indie/.test(labels), labels);
  },
  'the approach: selling secrets'() {
    const { engine, state, ctx } = life(1955, 'GB');
    state.career.job = { professionId: 'research', levelId: 'senior', employer: { name: 'x' } };
    for (let i = 0; i < 200 && !state.prompts.some((p) => p.type === 'feats.approach'); i++) { state.character.age = 30 + (i % 10); state.feats = null; FeatsModule.onAgeUp(ctx); }
    const p = state.prompts.find((x) => x.type === 'feats.approach');
    assert.ok(p, 'approached');
    engine.resolvePrompt(p.id, 'sell');
    assert.ok(state.feats.spy.turned);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
