/**
 * Small view fixes: the showroom one category at a time (and "only what I can buy"); the
 * Chamber says where you stand; Cases shows your record when nothing is open.
 *
 *   node tests/smallviews.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const adult = () => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  for (let i = 0; i < 30; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  return state;
};
const buys = (h) => (h.match(/data-action="vehicles\.buy"/g) ?? []).length;

const tests = {
  'the showroom shows one category, and can filter to what you can buy'() {
    const state = adult();
    const all = VIEWS.garage(state, {});
    assert.ok(buys(all) < 40, `${buys(all)} buy buttons`);
    assert.match(all, /showCat=/);
    state.finances.cash = 0;
    const mine = VIEWS.garage(state, { showAfford: '1' });
    assert.ok(buys(mine) <= buys(all));
  },
  'the Chamber tells a citizen without a seat how to get one'() {
    assert.match(VIEWS.chamber(adult(), {}), /You hold no seat/);
  },
  'Cases with nothing open shows your record'() {
    const state = adult();
    state.legal.record.push({ offenseId: 'x', name: 'Speeding', severity: 'infraction', age: 25, sentence: '$150 fine' });
    assert.match(VIEWS.cases(state, {}), /On your record[\s\S]*Speeding/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
