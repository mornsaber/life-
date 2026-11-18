/**
 * Childhood at home by era (people/ChildhoodAtHome.js).
 *
 *   node tests/childhoodhome.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(cc, birth, age, seed = 4) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  engine.newLife({ countryId: cc, startYear: birth });
  for (let i = 0; i < age; i++) { engine.state.prompts = []; engine.state.stats.health = 90; engine.ageUp(); }
  return engine.state;
}
const seen = (state) => Object.keys(state.childhoodHome?.seen ?? {});

const tests = {
  'a British child of 1945 sees sweets come off the ration in 1953'() {
    assert.ok(seen(life('GB', 1945, 12)).includes('sweetsEnd'));
  },
  'a child of 1960 sees the Moon landing'() {
    assert.ok(seen(life('US', 1960, 12)).includes('moon'));
  },
  'no washday mangle or wireless for a child of 1995'() {
    const s = seen(life('GB', 1990, 16));
    assert.ok(!s.includes('washday') && !s.includes('wireless') && !s.includes('tinbath'));
  },
  'an Indian child of 1940 lives through Partition'() {
    assert.ok(seen(life('IN', 1940, 10)).includes('partition'));
  },
  'a Nigerian child sees Independence Day in 1960'() {
    assert.ok(seen(life('NG', 1952, 10)).includes('independenceDay'));
  },
  'a childhood of 1900 has a handful of moments'() {
    assert.ok(seen(life('GB', 1900, 16)).length >= 3);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
