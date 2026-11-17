/**
 * The TB vaccine (BCG) from 1921 (health/PeriodHealth.js).
 *
 *   node tests/bcg.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { vaccinesOpen } from '../src/modules/health/PeriodHealth.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const at = (year) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
  const state = engine.newLife({ countryId: 'FR', startYear: year - 20 });
  state.character.age = 20;
  state.periodHealth = { vaccinated: {}, had: {}, kidsVaccinated: {} };
  return vaccinesOpen(state).map((v) => (Array.isArray(v) ? v[0] : v.id ?? v));
};

const tests = {
  'no TB vaccine before 1921; there is after'() {
    assert.ok(!at(1915).includes('tuberculosis'), `1915: ${at(1915)}`);
    assert.ok(at(1930).includes('tuberculosis'), `1930: ${at(1930)}`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
