/**
 * Pets: adopt or buy, upkeep, bond, illness, old age, and the card.
 *
 *   node tests/pets.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  state.character.age = 30;
  state.prompts = [];
  state.finances.cash = 100000;
  return { engine, state };
}

const tests = {
  'adopt a dog, play, and live with it until it dies of old age'() {
    const { engine, state } = life();
    engine.dispatch('pets.get', 'dog:adopt');
    assert.equal(state.pets.length, 1);
    engine.dispatch('pets.play', state.pets[0].id);
    assert.ok(state.pets[0].bond > 40);
    assert.match(VIEWS.people(state, {}), /Pets/);
    for (let y = 0; y < 20; y++) {
      while (state.prompts.length) engine.resolvePrompt(state.prompts[0].id, state.prompts[0].options[0].id);
      state.stats.health = 90;
      engine.ageUp();
    }
    assert.equal(state.pets.length, 0, 'gone');
    assert.ok(state.petsPast.length === 1);
  },
  'a horse needs land or a livery yard; four animals at most'() {
    const { engine, state } = life(3);
    state.finances.cash = 1000;
    engine.dispatch('pets.get', 'horse:adopt');
    assert.equal((state.pets ?? []).length, 0);
    state.finances.cash = 100000;
    for (const s of ['cat', 'rabbit']) engine.dispatch('pets.get', `${s}:adopt`);
    state.yearly = {};
    for (const s of ['fish', 'parrot']) engine.dispatch('pets.get', `${s}:buy`);
    state.yearly = {};
    engine.dispatch('pets.get', 'dog:adopt');
    assert.equal(state.pets.length, 4);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} pet test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} pet tests passed`);
