/**
 * Working lives and firms (career/WorkLife.js, business/FirmLife.js): entry by experience, career
 * breaks and returning, freelance work, references and the blacklist, war work, perks of the
 * trade; partners, period finance and failure, company forms by date, setting up as a master.
 *
 *   node tests/worklife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { bestEntryLevel, hire } from '../src/modules/career/CareerEngine.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { referenceBonus } from '../src/modules/career/WorkLife.js';
import { perksAt } from '../src/modules/career/CareerPlay.js';
import { failureLine, masterOption } from '../src/modules/business/FirmLife.js';
import { entityInEra } from '../src/modules/world/Eras.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const grown = (cc, year, age, gender = 'male', seed = 2) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender });
  state.character.age = age;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};
const take = (engine, state, professionId) => {
  const p = getProfession(professionId);
  const level = bestEntryLevel(state, p, 'medium');
  return hire(engine.context(), { professionId, levelId: level.id, employer: createEmployer(engine.rng, state, p, state.character.regionId) });
};

const tests = {
  'senior posts before licences need years in that work, not just any work'() {
    const { state } = grown('FR', 1860, 40);
    state.career.history.push({ professionId: 'commercialFishing', startAge: 18, endAge: 40, peakGrade: 3 });
    assert.ok((bestEntryLevel(state, getProfession('nursing'), 'large')?.grade ?? 0) < 5, 'a fisherman starts near the bottom');
  },
  'a career break, and the way back'() {
    const { engine, state } = grown('GB', 1990, 30, 'female');
    take(engine, state, 'retail');
    engine.dispatch('workLife.breakTake', 'children');
    assert.equal(state.career.job, null);
    state.character.age += 4;
    take(engine, state, 'retail');
    assert.ok(state.log.some((b) => b.entries.some((e) => /Back at work after 4 years bringing up the children/.test(e.text))));
  },
  'freelance work pays by the client'() {
    const { engine, state } = grown('US', 2000, 40);
    state.career.history.push({ professionId: 'corporate', startAge: 25, endAge: 40, peakGrade: 4, salary: 80000 });
    state.workLife = { references: {}, lastProfession: 'corporate', lastSalary: 80000 };
    engine.dispatch('workLife.freelance');
    assert.equal(state.workLife.freelance?.name, 'consultant');
    const before = state.finances.cash;
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.finances.lastYear?.gross > 0 || state.finances.cash !== before);
  },
  'references and the blacklist follow you'() {
    const { state } = grown('GB', 1890, 30);
    state.career.history.push({ professionId: 'docks', employerName: 'Port of London', startAge: 20, endAge: 30 });
    state.workLife = { references: { 'Port of London': 'poor' }, blacklist: { professionId: 'docks', until: 35 } };
    assert.ok(referenceBonus(state, getProfession('docks')) < -0.5, 'blacklisted');
    assert.ok(referenceBonus(state, getProfession('retail')) < 0, 'a poor reference');
  },
  'war work for women, and perks of the trade'() {
    let asked = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const { engine, state } = grown('GB', 1916, 25, 'female', seed);
      state.world.wars = { GB: { phase: 'active', intensity: 4 } };
      state.prompts = [];
      engine.ageUp();
      if (state.prompts.some((p) => p.type === 'workLife.wartime')) asked++;
    }
    assert.ok(asked >= 2, `${asked}/6 called up`);
    const { state } = grown('GB', 1890, 30);
    state.career.job = { professionId: 'commercialFishing', grade: 3 };
    assert.ok(perksAt(state, 3).some(([, p]) => /catch|bunk/.test(p)) && !perksAt(state, 3).some(([, p]) => /desk/.test(p)));
  },
  'firms: company forms by date, failure in its words, a master\'s shop'() {
    assert.equal(entityInEra(grown('FR', 1860, 30).state, 'ccorp'), false, 'no free incorporation in France before 1867');
    assert.equal(entityInEra(grown('GB', 1870, 30).state, 'ccorp'), true);
    assert.match(failureLine(grown('GB', 1880, 40).state, { name: 'Smith & Sons' }), /Gazette/);
    const { state } = grown('GB', 1870, 30);
    state.credentials.held.indentures = { status: 'active' };
    state.career.history.push({ professionId: 'blacksmith', startAge: 21, endAge: 30 });
    state.finances.cash = 1e6;
    assert.ok(masterOption(state), 'can set up as a master smith');
  },
  'a partner joins the firm'() {
    const { engine, state } = grown('US', 1990, 40);
    state.finances.cash = 2e6;
    engine.dispatch('business.start', 'retail:cash:sole:standard');
    if (!state.business.current) return;
    engine.dispatch('firmLife.partner');
    assert.ok(state.business.current.partner?.name);
    assert.ok(state.business.current.ownerPct < 1);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
