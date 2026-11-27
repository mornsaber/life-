/**
 * Work by the size of the place: Pitcairn has no law firms or hospital, the international bodies
 * are the size they really are, and nothing local outgrows its country.
 *
 *   node tests/placesize.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { professionsFor, getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { knownStaff } from '../src/modules/org/Staffing.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year = 1990) => { const engine = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES }); const state = engine.newLife({ countryId: cc, startYear: year - 35 }); state.prompts = []; state.character.age = 35; return { engine, state }; };
const staffOf = (state) => Object.values(state.orgs.byId[state.career.job.employer.orgId].departments).reduce((a, d) => a + (d.headcount ?? 0), 0);

const tests = {
  'Pitcairn has the shop, the school and the council, not law firms and actuaries'() {
    const ids = professionsFor(life('PN').state).map((p) => p.id.replace(/^[a-z]{2}_/, ''));
    for (const id of ['education', 'fishing', 'retail', 'municipalAdmin']) assert.ok(ids.includes(id), `${id} on Pitcairn`);
    for (const id of ['law', 'actuary', 'finance', 'tech', 'university', 'physicalTherapy']) assert.ok(!ids.includes(id), `no ${id} on Pitcairn`);
  },
  'a big country keeps every kind of work'() {
    const ids = professionsFor(life('GB').state).map((p) => p.id.replace(/^[a-z]{2}_/, ''));
    for (const id of ['law', 'actuary', 'finance', 'university', 'physicalTherapy']) assert.ok(ids.includes(id), `${id} in Britain`);
  },
  'international bodies are their real size wherever you join from'() {
    assert.equal(knownStaff('Pontifical Swiss Guard'), 135);
    assert.equal(knownStaff('International Court of Justice'), 120);
    assert.equal(knownStaff('the Commission of the European Communities', 1980), 11000, 'the Commission was a third of today\'s size in 1980');
    assert.ok(knownStaff('Missionaries of Charity', 1955) < 300, 'a few hundred sisters in the 1950s');
    const { engine, state } = life('TV');
    for (const [pid, max] of [['swissGuard', 200], ['intlJustice', 2000], ['intlFinance', 20000]]) {
      const p = getProfession(pid);
      state.career.job = null;
      hire(engine.context(), { professionId: pid, levelId: p.levels[0].id, employer: createEmployer(engine.rng, state, p, state.character.regionId) });
      if (!state.career.job) continue;
      assert.ok(staffOf(state) <= max, `${state.career.job.employer.name}: ${staffOf(state)} staff`);
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.message}`); }
}
console.log(failed ? `✘ ${failed} place-size test(s) failed` : `✔ All ${Object.keys(tests).length} place-size tests passed`);
process.exit(failed ? 1 : 0);
