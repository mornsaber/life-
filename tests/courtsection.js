/**
 * The Court section (ui/views/CrownCard.js): royals get Court, Succession, Household, Estates;
 * everyone else never sees it.
 *
 *   node tests/courtsection.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hasCourt, courtView, successionView, householdView, estatesView, crownCards } from '../src/ui/views/CrownCard.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (o, seed = 1) => { const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES }); return engine.newLife(o); };

const tests = {
  'a royal has a court, with the line drawn and you in it'() {
    const state = life({ countryId: 'GB', royalLevel: 'grandchild', gender: 'male' });
    assert.ok(hasCourt(state));
    const s = successionView(state);
    assert.match(s, /Line of Succession/);
    assert.match(s, /<b>You<\/b>/);
    assert.match(s, /The law:/);
    for (const v of [courtView, householdView, estatesView]) assert.ok(v(state).length > 50);
    assert.equal(crownCards(state), '', 'politics does not repeat the royal life');
  },
  'a princess under the male line only is told why she is not in it'() {
    const state = life({ countryId: 'JP', royalLevel: 'child', gender: 'female' }, 2);
    assert.match(successionView(state), /Only men inherit/);
  },
  'a commoner has no court'() {
    const state = life({ countryId: 'GB' }, 3);
    if (state.royal) return;
    assert.equal(hasCourt(state), false);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
