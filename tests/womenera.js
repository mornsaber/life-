/**
 * Women's lives by era (people/WomenOfTheDay.js).
 *
 *   node tests/womenera.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(cc, birth, age) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(5), modules: MODULES });
  engine.newLife({ countryId: cc, startYear: birth, gender: 'female' });
  for (let i = 0; i < age && engine.state.character.alive; i++) { engine.state.prompts = []; engine.state.stats.health = 95; engine.ageUp(); }
  return engine.state;
}

const tests = {
  'a British woman born 1890 first votes after 1918, not before'() {
    const s = life('GB', 1890, 40);
    if (!s.character.alive) return;
    assert.ok(s.womenDay?.votedAt >= 1918, String(s.womenDay?.votedAt));
  },
  'a man has no women\'s moments'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(5), modules: MODULES });
    engine.newLife({ countryId: 'GB', startYear: 1900, gender: 'male' });
    for (let i = 0; i < 30; i++) { engine.state.prompts = []; engine.ageUp(); }
    assert.equal(engine.state.womenDay, undefined);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
