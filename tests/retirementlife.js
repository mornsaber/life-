/**
 * Retirement life: rhythms, the bucket list, a retirement community, and the years' events.
 *
 *   node tests/retirementlife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  state.character.age = 66;
  state.career.job = null;
  state.retirement.retired = true;
  state.prompts = [];
  state.finances.cash = 300000;
  return { engine, state };
}
const year = (engine, state) => {
  while (state.prompts.length) engine.resolvePrompt(state.prompts[0].id, (state.prompts[0].options.find((o) => !o.disabled && o.tone !== 'danger') ?? state.prompts[0].options[0]).id);
  state.stats.health = 85;
  engine.ageUp();
};

const tests = {
  'a retiree chooses a rhythm, ticks off the bucket list and sees the card'() {
    const { engine, state } = life();
    assert.match(VIEWS.activities(state, {}), /Bucket list/);
    engine.dispatch('retirementLife.rhythm', 'encore');
    const cash = state.finances.cash;
    year(engine, state);
    assert.ok(JSON.stringify(state.finances).includes('Encore work') || state.finances.cash > cash - 50000);
    state.yearly = {};
    state.prompts = [];
    engine.dispatch('retirementLife.bucket', 'aurora');
    assert.ok(state.retirementLife.bucket.aurora != null);
    state.yearly = {};
    engine.dispatch('retirementLife.bucket', 'aurora');
    assert.equal(Object.keys(state.retirementLife.bucket).length, 1, 'once');
  },
  'a retirement community costs a fee and brings friends'() {
    const { engine, state } = life(7);
    engine.dispatch('retirementLife.community');
    assert.ok(state.retirementLife.community);
    const before = state.finances.cash;
    for (let y = 0; y < 3; y++) year(engine, state);
    assert.ok(state.finances.cash < before);
  },
  'twenty retired years run cleanly with events'() {
    const { engine, state } = life(9);
    let events = 0;
    for (let y = 0; y < 20 && state.character.alive; y++) {
      events += state.prompts.filter((p) => p.type === 'retirementLife.event').length;
      year(engine, state);
    }
    assert.ok(events > 0, 'events');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} retirement-life test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} retirement-life tests passed`);
