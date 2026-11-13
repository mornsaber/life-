/**
 * The People tab, one person at a time: compact rows with an Open button; the chosen person's
 * panel holds everything you can do with them, grouped. Pets from a picker.
 *
 *   node tests/personpanel.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const adult = () => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  for (let i = 0; i < 30; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  return { engine, state };
};
const count = (h, a) => (h.match(new RegExp(`data-action="${a.replace('.', '\\.')}"`, 'g')) ?? []).length;

const tests = {
  'rows are compact: no per-person actions until you open someone'() {
    const { state } = adult();
    const h = VIEWS.people(state, {});
    assert.equal(count(h, 'people.spendTime'), 0);
    assert.equal(count(h, 'bonds.interact'), 0);
    assert.ok(count(h, 'ui.set') >= 1, 'an Open button per person');
  },
  'the open person\'s panel has everything, grouped'() {
    const { state } = adult();
    const mum = state.people.list.find((p) => p.alive && ['mother', 'father'].includes(p.relation));
    const h = VIEWS.people(state, { person: mum.id });
    assert.equal(count(h, 'people.spendTime'), 1);
    assert.match(h, /Time together/);
    assert.match(h, /people\.askForMoney/);
  },
  'pets from a picker, not a button per species'() {
    const { engine, state } = adult();
    const h = VIEWS.people(state, {});
    assert.ok(count(h, 'pets.get') <= 2, `${count(h, 'pets.get')} pet buttons`);
    state.finances.cash = 5000;
    engine.dispatch('pets.get', 'dog:adopt');
    assert.ok((state.pets ?? state.people.pets ?? []).length || JSON.stringify(state).includes('"species":"dog"'));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
