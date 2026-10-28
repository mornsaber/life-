/**
 * Fertility: trying years and the workup, IVF (public funding, odds by egg age, twins),
 * egg freezing, surrogacy law by country, adoption waits.
 *
 *   node tests/fertility.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { ivfOdds, ivfCost, surrogacyLaw } from '../src/modules/people/Fertility.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', gender = 'female', seed = 9) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId, gender });
  state.character.age = 33;
  state.prompts = [];
  state.finances.cash = 500000;
  return { engine, state };
}
const up = (engine, state) => { engine.ageUp(); state.prompts = []; state.yearly = {}; };

const tests = {
  'IVF odds fall with the egg\'s age; the NHS funds cycles, the US charges'() {
    assert.ok(ivfOdds(30) > ivfOdds(39) && ivfOdds(39) > ivfOdds(42));
    const gb = life('GB');
    assert.equal(ivfCost(gb.state).amount, 0);
    const us = life('US');
    assert.ok(ivfCost(us.state).amount >= 3000);
  },
  'repeated IVF cycles eventually bring a baby (sometimes twins), born the next year'() {
    const { engine, state } = life('GB');
    for (let i = 0; i < 8 && !state.people.expecting; i++) { engine.dispatch('fertility.ivf', 'own'); if (!state.people.expecting) up(engine, state); }
    assert.ok(state.people.expecting, 'pregnant');
    const before = state.people.list.filter((p) => p.relation === 'child').length;
    up(engine, state);
    const after = state.people.list.filter((p) => p.relation === 'child').length;
    assert.ok(after - before >= 1 && after - before <= 2, `born: ${after - before}`);
  },
  'frozen eggs keep their age; donor eggs work late'() {
    const { engine, state } = life('US');
    engine.dispatch('fertility.freezeEggs');
    assert.equal(state.people.fertility.frozen.age, 33);
    state.character.age = 47;
    engine.dispatch('fertility.ivf', 'own');
    assert.ok(!state.yearly['fertility.ivf'], 'no own-egg IVF at 47');
    engine.dispatch('fertility.ivf', 'frozen');
    assert.ok(state.yearly['fertility.ivf']);
    assert.equal(state.people.fertility.frozen.eggs, 2);
  },
  'surrogacy is commercial in the US, altruistic in Britain, banned in France'() {
    assert.equal(surrogacyLaw(life('US').state), 'commercial');
    assert.equal(surrogacyLaw(life('GB').state), 'altruistic');
    assert.equal(surrogacyLaw(life('FR').state), 'banned');
    const { engine, state } = life('US', 'male');
    engine.dispatch('fertility.surrogacy');
    assert.ok(state.people.fertility.surrogacy, 'under way');
    for (let i = 0; i < 5 && !state.people.list.some((p) => p.relation === 'child'); i++) up(engine, state);
    assert.ok(state.people.list.some((p) => p.relation === 'child'), 'a child via surrogacy');
  },
  'adoption waits: foster care in a year, an infant in one to three'() {
    const { engine, state } = life('US');
    engine.dispatch('fertility.adopt', 'infant');
    const due = state.people.expecting.dueAge;
    assert.ok(due >= 34 && due <= 36);
    while (state.character.age < due - 1) up(engine, state);
    assert.ok(state.people.expecting, 'still waiting');
    up(engine, state);
    const kid = state.people.list.find((p) => p.relation === 'child');
    assert.ok(kid?.adopted && state.character.age + kid.ageOffset === 0);
  },
  'trying without luck leads to a workup; the people view shows family planning'() {
    const { engine, state } = life('US');
    state.character.age = 41;
    state.people.fertility = { tryingYears: 2, workup: null, frozen: null, cycles: 0, surrogacy: null };
    engine.dispatch('fertility.workup');
    assert.ok(state.people.fertility.workup);
    assert.match(VIEWS.people(state, {}), /Fertility, surrogacy &amp; adoption|Fertility, surrogacy & adoption/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} fertility test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} fertility tests passed`);
