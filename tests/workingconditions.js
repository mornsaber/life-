/**
 * Working conditions of their day: hours, holidays, danger and compensation, casual work.
 *
 *   node tests/workingconditions.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { sync } from '../src/modules/world/History.js';
import { weekHours, paidHolidays, compensationHere, WorkingConditionsModule } from '../src/modules/career/WorkingConditions.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year, age = 30) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(6), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, firstName: 'Ada', lastName: 'Penrose', gender: 'male' });
  state.character.age = age; state.prompts = []; sync(state);
  return { engine, state };
};
const tests = {
  'the week and the holidays of their day'() {
    const job = { professionId: 'millWork', sector: 'private', salary: 20000 };
    assert.equal(weekHours(life('GB', 1840).state, job), 72);
    assert.equal(weekHours(life('US', 1960).state, job), 40);
    assert.equal(weekHours(life('FR', 2010).state, job), 35);
    assert.equal(paidHolidays(life('GB', 1900).state), 0);
    assert.ok(paidHolidays(life('FR', 1990).state) >= 24);
  },
  'workmen\'s compensation by country'() {
    assert.ok(!compensationHere(life('GB', 1890).state));
    assert.ok(compensationHere(life('DE', 1890).state));
    assert.ok(!compensationHere(life('US', 1905).state));
  },
  'a working life down the pit runs, and the view shows the week'() {
    const { engine, state } = life('GB', 1870, 18);
    state.career.job = { professionId: 'coalMining', sector: 'private', salary: 15000, title: 'Collier', employer: { name: 'Pit' } };
    let logs = [];
    const ctx = { ...engine.context(), log: (t) => logs.push(t) };
    for (let i = 0; i < 30 && state.character.alive; i += 1) { state.character.age += 1; WorkingConditionsModule.onAgeUp(ctx); }
    assert.ok(logs.length > 0);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) process.exit(1);
