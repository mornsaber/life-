/**
 * Your times (ui/YourTimes.js): the intro card for a life begun in the past.
 *
 *   node tests/yourtimes.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { yourTimesCard } from '../src/ui/YourTimes.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const born = (cc, y, gender = 'female') => new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES }).newLife({ countryId: cc, startYear: y, gender });
const text = (s) => yourTimesCard(s).replace(/<[^>]+>/g, ' ');

const tests = {
  'a life in 1820 France hears about its times'() {
    const t = text(born('FR', 1820));
    assert.match(t, /Your Times/);
    assert.match(t, /railways/);
    assert.match(t, /not until 1944/);
    assert.doesNotMatch(t, /NaN|undefined/);
  },
  'India 1905: few children at school; today: no card'() {
    assert.match(text(born('IN', 1905, 'male')), /never go to school/);
    assert.equal(yourTimesCard(born('US', 2015)), '');
  },
  'gone by age four'() {
    const s = born('GB', 1900);
    s.character.age = 4;
    assert.equal(yourTimesCard(s), '');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
