/**
 * Founding a business, one step at a time: pick a kind, see the plan (costs by size, what
 * owners really earn, the odds of losing money, licences, funding), found it from there.
 *
 *   node tests/bizfounding.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { OUTCOMES } from '../src/modules/business/Outcomes.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const adult = () => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  for (let i = 0; i < 30; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  state.finances.cash = 500000;
  return { engine, state };
};
const buttons = (h) => (h.match(/data-action=/g) ?? []).length;

const tests = {
  'measured outcomes exist for most kinds of business'() {
    const kinds = Object.values(BUSINESS_TYPES).filter((t) => !t.startup).length;
    assert.ok(Object.keys(OUTCOMES).length >= kinds * 0.8, `${Object.keys(OUTCOMES).length} of ${kinds}`);
    for (const o of Object.values(OUTCOMES)) assert.ok(o.low <= o.median && o.median <= o.high && o.loss >= 0 && o.loss <= 1);
  },
  'no wall: a picker, a few quick picks, no Start buttons until you choose'() {
    const { state } = adult();
    const h = VIEWS.business(state, {});
    assert.match(h, /data-ui-set="bizType"/);
    assert.ok(!/business\.start/.test(h));
    assert.ok(buttons(h) < 30, `${buttons(h)} buttons`);
  },
  'the plan for one kind: sizes, what owners earn, the odds, and the form'() {
    const { state } = adult();
    const h = VIEWS.business(state, { bizType: 'cleaning' });
    assert.match(h, /To start/);
    assert.match(h, /From owners who tried it/);
    assert.match(h, /in 10 lost money/);
    assert.match(h, /business\.start/);
  },
  'founding from the plan works'() {
    const { engine, state } = adult();
    engine.dispatch('business.start', 'cleaning:cash:llc:standard:Spotless');
    assert.equal(state.business.current?.name, 'Spotless');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
