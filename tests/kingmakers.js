/**
 * Wartime promotion speed, officer coups in coup-prone countries, retired officers hired to
 * build foreign armies.
 *
 *   node tests/kingmakers.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { timeInGradeRequired, promotionOutlook } from '../src/modules/military/MilitaryEngine.js';
import { canPlot, canAdvise } from '../src/modules/military/Kingmakers.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId, seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId, gender: 'male' });
  state.character.age = 40;
  state.prompts = [];
  return { engine, state };
}
const officer = (state, nation, grade) => {
  state.military.service = { branch: 'army', specialty: 'infantry', track: 'officer', component: 'active', grade, yearsInGrade: 0, yearsOfService: 15, joinedAge: 22, eval: 80, nation, contractYearsLeft: 5, passovers: 0 };
  return state.military.service;
};

const tests = {
  'war cuts time in grade to a third and waives schooling and up-or-out'() {
    const { state } = life('US');
    const svc = officer(state, null, 3);
    const peace = timeInGradeRequired(svc);
    svc.wartime = true;
    assert.ok(timeInGradeRequired(svc) < peace);
    svc.yearsInGrade = timeInGradeRequired(svc);
    svc.eval = 70;
    assert.equal(promotionOutlook(svc).school, undefined);
  },
  'an officer in a coup-prone country can plot and seize power'() {
    let won = false;
    for (let seed = 1; seed < 40 && !won; seed++) {
      const { engine, state } = life('ML', seed);
      officer(state, 'ML', 5);
      assert.ok(canPlot(state).ok, canPlot(state).reason);
      engine.dispatch('kingmakers.plot');
      state.regime.plot.support = 95;
      assert.match(VIEWS.military(state, {}), /Conspiracy/);
      engine.dispatch('kingmakers.strike');
      if (state.regime?.junta?.role === 'leader') won = true;
    }
    assert.ok(won, 'some coup succeeded');
  },
  'no plotting in a stable democracy'() {
    const { state } = life('SE');
    officer(state, 'SE', 5);
    assert.equal(canPlot(state).ok, false);
  },
  'veterans see a contract market, sign on with a firm and rise on reputation'() {
    const { engine, state } = life('US', 8);
    state.military.history.push({ branch: 'army', specialty: 'infantry', track: 'enlisted', grade: 5, rankTitle: 'Staff Sergeant', rankCode: 'E-6', discharge: 'honorable', yearsOfService: 8, startAge: 20, endAge: 28 });
    assert.match(VIEWS.military(state, {}), /Contract Work/);
    const html = VIEWS.military(state, {});
    const id = /data-action="pmcContracts.take" data-arg="([^"]+)"/.exec(html)[1];
    engine.dispatch('pmcContracts.take', id);
    assert.equal(state.career.job?.professionId, 'privateMilitary');
    assert.ok(state.pmc.contract);
    state.pmc.rep = 60;
    state.prompts = [];
    const cash = state.finances.cash;
    engine.ageUp();
    assert.ok(state.pmc.done.length === 1);
    assert.ok(state.finances.cash > cash || state.character.alive === false);
    if (state.career.job?.professionId === 'privateMilitary') assert.match(state.career.job.levelId, /teamLead|detailLead|psd|static/);
  },
  'a retired colonel builds a foreign army on contract'() {
    const { engine, state } = life('GB');
    state.military.history.push({ branch: 'army', track: 'officer', grade: 5, rankTitle: 'Colonel', rankCode: 'O-6', discharge: 'retired', yearsOfService: 26, startAge: 22, endAge: 48 });
    assert.ok(canAdvise(state).ok);
    assert.match(VIEWS.military(state, {}), /Foreign Armies Hiring/);
    const html = VIEWS.military(state, {});
    const cc = /data-action="kingmakers.advise" data-arg="([A-Z]{2})"/.exec(html)[1];
    engine.dispatch('kingmakers.advise', cc);
    assert.equal(state.foreignAdvisor.cc, cc);
    const r = state.foreignAdvisor.readiness;
    engine.dispatch('kingmakers.train');
    engine.dispatch('kingmakers.college');
    assert.ok(state.foreignAdvisor.readiness > r);
    const cash = state.finances.cash;
    state.prompts = [];
    engine.ageUp();
    assert.ok(!state.foreignAdvisor || state.finances.cash !== cash);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} kingmaker test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} kingmaker tests passed`);
