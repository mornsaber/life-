/**
 * Health cover of its day (health/Insurance.js, health/HealthcareMoments.js).
 *
 *   node tests/healthera.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { coverage } from '../src/modules/health/Insurance.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(cc, year, age = 30, job = true) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(2), modules: MODULES });
  const s = engine.newLife({ countryId: cc, startYear: year - age });
  for (let i = 0; i < age; i++) { s.prompts = []; s.stats.health = 90; engine.ageUp(); }
  const state = engine.state;
  if (job && !state.career.job) state.career.job = { employer: { benefits: {} }, salary: 30000 };
  if (!job) state.career.job = null;
  return { engine, state };
}

const tests = {
  'a German worker in 1900 has a Krankenkasse'() { assert.match(coverage(life('DE', 1900).state).name, /Krankenkasse/); },
  'a British worker in 1925 has a panel doctor; in 1960 the NHS'() {
    assert.equal(coverage(life('GB', 1925).state).id, 'panel');
    assert.equal(coverage(life('GB', 1960).state).id, 'national');
  },
  'no Blue Cross in 1910 America'() { assert.notEqual(coverage(life('US', 1910, 30, false).state).id, 'blueCross'); },
  'the NHS opening is in the story of a 1948 Briton'() {
    const { engine, state } = life('GB', 1946, 20, false);
    for (let i = 0; i < 3; i++) { state.prompts = []; engine.ageUp(); }
    assert.ok(state.log.some((b) => b.entries.some((e) => /National Health Service opened/.test(e.text))));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
