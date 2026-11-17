/**
 * A conviction abroad and job background checks (career backgroundCheck + legal/RecordAbroad.js).
 *
 *   node tests/recordjobs.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { backgroundCheck } from '../src/modules/career/CareerEngine.js';
import { getProfession } from '../src/modules/career/JobTrees.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId, convictedIn, offenseId = 'burglary') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(2), modules: MODULES });
  const state = engine.newLife({ countryId, startYear: 1975 });
  state.character.age = 30;
  state.legal.record.push({ offenseId, name: 'Burglary', severity: 'felony', age: 27, country: convictedIn });
  return state;
}

const tests = {
  'a felony at home fails a strict background check'() {
    assert.equal(backgroundCheck(life('JP', 'JP'), getProfession('education')).ok, false);
  },
  'the same burglary in another country, not shared with employers here, does not'() {
    assert.equal(backgroundCheck(life('JP', 'BR'), getProfession('education')).ok, true);
  },
  'a crime that travels (Interpol) still counts'() {
    assert.equal(backgroundCheck(life('JP', 'BR', 'murder'), getProfession('education')).ok, false);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
