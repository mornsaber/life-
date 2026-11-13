/**
 * Recorded wars end on their dates: the Gulf War (1990–91) is over by 1992, and a save that
 * carried a recorded war past its date has it ended.
 *
 *   node tests/gulfwar.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { yearNow } from '../src/modules/world/Eras.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, startYear, age, seed = 3) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear });
  state.character.age = age;
  return { engine, state };
};
const year = (engine, state) => { state.prompts = []; state.stats.health = 90; engine.ageUp(); };

const tests = {
  'the Gulf War starts in 1990 and is over by 1992'() {
    for (const cc of ['US', 'GB', 'KW']) {
      const { engine, state } = life(cc, 1960, 28);
      const seen = [];
      for (let i = 0; i < 5; i++) { year(engine, state); seen.push([yearNow(state), state.world?.wars?.[cc]?.id]); }
      assert.ok(seen.some(([y, id]) => y === 1990 && id === 'cow.211'), `${cc}: ${JSON.stringify(seen)}`);
      assert.ok(seen.filter(([y]) => y >= 1992).every(([, id]) => id !== 'cow.211'), `${cc}: ${JSON.stringify(seen)}`);
    }
  },
  'a save stuck in an old recorded war has it ended'() {
    const { engine, state } = life('GB', 1970, 34);
    state.world.wars ??= {};
    state.world.wars.GB = { id: 'cow.211', name: 'the Gulf War', adversary: 'Iraq', operation: 'the Gulf War', intensity: 2, phase: 'active', front: 0, support: 50, years: 14, casualties: 24 };
    year(engine, state);
    assert.notEqual(state.world.wars.GB?.id, 'cow.211');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
