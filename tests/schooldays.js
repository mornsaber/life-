/**
 * School as it was lived (education/SchoolDays.js).
 *
 *   node tests/schooldays.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { caneHere, leavingExam } from '../src/modules/education/SchoolDays.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(cc, birth, age, seed = 4) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  engine.newLife({ countryId: cc, startYear: birth });
  for (let i = 0; i < age; i++) { engine.state.prompts = []; engine.state.stats.health = 90; engine.ageUp(); }
  return { engine, state: engine.state };
}
const said = (state, re) => state.log.some((b) => b.entries.some((e) => re.test(e.text)));

const tests = {
  'the cane in a 1960 English school, not in a 1960 Swedish one'() {
    assert.equal(caneHere(life('GB', 1950, 10).state), true);
    assert.equal(caneHere(life('SE', 1950, 10).state), false);
  },
  'O-levels in 1970 Britain, GCSEs in 1995, the Abitur in Germany'() {
    assert.equal(leavingExam(life('GB', 1954, 16).state), 'O-levels');
    assert.equal(leavingExam(life('GB', 1979, 16).state), 'GCSEs');
    assert.equal(leavingExam(life('DE', 1960, 18).state), 'the Abitur');
  },
  'a 1950s British child gets school milk'() {
    let hit = 0;
    for (let s = 1; s <= 4; s++) if (said(life('GB', 1950, 7, s).state, /pint of milk/)) hit += 1;
    assert.ok(hit >= 1);
  },
  'a 1955 American child does the duck-and-cover drill'() {
    let hit = 0;
    for (let s = 1; s <= 4; s++) if (said(life('US', 1948, 10, s).state, /Under your desk/)) hit += 1;
    assert.ok(hit >= 1);
  },
  'a Soviet child becomes a Young Pioneer'() {
    let hit = 0;
    for (let s = 1; s <= 4; s++) if (said(life('RU', 1950, 11, s).state, /Young Pioneer/)) hit += 1;
    assert.ok(hit >= 1);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
