/**
 * Nobility as lived (world/NobleWays.js).
 *
 *   node tests/nobleways.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId, startYear, opts = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
  const state = engine.newLife({ countryId, startYear, gender: 'male', ...opts });
  return { engine, state };
}
const ageTo = (engine, state, age) => { while (state.character.age < age) { state.prompts = state.prompts.filter((p) => p.type.startsWith('nobleWays.')); state.stats.health = 95; engine.ageUp(); } };

const tests = {
  'a Prussian son of the house is expected in the regiment'() {
    const { engine, state } = life('DE', 1880, { nobleRank: 'earl', nobleHeir: 'heir' });
    if (!state.noble) return;
    ageTo(engine, state, 18);
    assert.ok(state.prompts.some((p) => p.type === 'nobleWays.regiment'));
  },
  'a coffee baron of Imperial Brazil, for life'() {
    const { engine, state } = life('BR', 1840);
    ageTo(engine, state, 30);
    state.finances.cash = 5e6;
    state.prompts = [];
    assert.match(VIEWS.society(state), /A Title from the Emperor/);
    engine.dispatch('nobleWays.buyBarony');
    assert.equal(state.character.peerage?.kind, 'life');
    assert.match(state.character.style.peerage, /Barão/);
  },
  'Japan: the Peers\' School at six'() {
    const { engine, state } = life('JP', 1900, { nobleRank: 'earl', nobleHeir: 'heir' });
    if (!state.noble) return;
    ageTo(engine, state, 7);
    assert.ok(state.log.some((b) => b.entries.some((e) => /Gakushūin/.test(e.text))));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
