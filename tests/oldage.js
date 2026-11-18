/**
 * Old age by era (people/OldAgeOfTheDay.js).
 *
 *   node tests/oldage.js
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
  for (let i = 0; i < age && engine.state.character.alive; i++) { engine.state.prompts = []; engine.state.stats.health = 95; engine.ageUp(); }
  return engine.state;
}
const seen = (state) => Object.keys(state.oldAge?.seen ?? {});

/** A life aged straight to a birthday in a given year (the one ageUp that matters). */
function at(cc, year, age) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  engine.newLife({ countryId: cc, startYear: year - age });
  const s = engine.state;
  s.prompts = [];
  s.character.age = age - 1;
  s.stats.health = 95;
  engine.ageUp();
  return s;
}

const tests = {
  'a Briton of 70 in 1909 collects the first old-age pension'() {
    assert.ok(seen(at('GB', 1909, 70)).includes('pension'));
  },
  'a Japanese sixtieth is kanreki'() {
    assert.ok(seen(at('JP', 1960, 60)).includes('kanreki'));
  },
  'a British centenarian of 1950 gets the telegram'() {
    assert.ok(seen(at('GB', 1950, 100)).includes('telegram'));
  },
  'no telegram in 1900'() {
    assert.ok(!seen(at('GB', 1900, 100)).includes('telegram'));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
