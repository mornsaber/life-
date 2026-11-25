/**
 * Class of its day: origins, doors that open or shut, polish, the friendly society.
 *
 *   node tests/classofday.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { sync } from '../src/modules/world/History.js';
import { classBonus, originOf, welfareHere } from '../src/modules/life/ClassOfTheDay.js';
import { settleEstate } from '../src/modules/people/Legacy.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year, age = 30) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(6), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, firstName: 'Ada', lastName: 'Penrose', gender: 'male' });
  state.character.age = age; state.prompts = []; sync(state); state.finances.cash = 1e5;
  return { engine, state };
};
const tests = {
  'class opened the gentlemen\'s posts before the war, and much less after'() {
    const { state } = life('GB', 1900);
    state.people.wealth = 'low';
    const fs = { id: 'gb_foreignService', sector: 'federal' };
    const before = classBonus(state, fs);
    assert.ok(before < -0.1);
    const modern = life('GB', 2010).state; modern.people.wealth = 'low';
    assert.ok(Math.abs(classBonus(modern, fs)) < Math.abs(before));
    assert.equal(classBonus(state, { id: 'retail' }), 0);
    const posh = life('GB', 1900).state; posh.people.wealth = 'upper';
    assert.equal(originOf(posh), 'upper');
    assert.ok(classBonus(posh, fs) > 0);
  },
  'elocution softens it; the friendly society pays the funeral'() {
    const { engine, state } = life('GB', 1900);
    state.people.wealth = 'low';
    const before = classBonus(state, { id: 'law' });
    engine.dispatch('classDay.polish');
    assert.ok(classBonus(state, { id: 'law' }) > before);
    assert.ok(!welfareHere(state));
    engine.dispatch('classDay.join');
    assert.ok(state.classDay.society);
    assert.match(VIEWS.community(state, {}), /Class/);
    state.character.alive = false;
    assert.equal(settleEstate(state).funeral ?? 0, 0);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) process.exit(1);
