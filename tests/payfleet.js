/**
 * Pay, promotion and central-fleet regressions: government pay runs on a
 * grade-and-step schedule with waiting periods and a legal cap; companies pay
 * by salary band with merit raises and bonuses; senior promotions don't dead-end
 * (a plateau lifts, a runner-up heads the list, nobody is bumped back into the
 * academy); and a station officer in a national service sees their station's
 * kit, not the whole country's fleet.
 *
 *   node tests/payfleet.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, promotionStatus, PLATEAU_AFTER, PLATEAU_YEARS, recalcSalary } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { previousLevel } from '../src/modules/career/Ladder.js';
import { scheduleYear, bandYear, bonusFor, onBands, payCap, payGradeLabel, BAND_MAX, PAY_CAP } from '../src/modules/career/PayGrades.js';
import { contextOf, recordOf, annualMoney, FLEET_POLICIES } from '../src/modules/equipment/Equipment.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function worker(countryId, regionId, professionId, levelId, { seed = 4 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  if (regionId) state.character.regionId = regionId;
  state.character.age = 40;
  state.legal.record = [];
  state.prompts = [];
  Object.assign(state.stats, { smarts: 80, fitness: 80, health: 90, happiness: 70 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'economics', schoolId: 'state', gpa: 3.4, year: 22 });
  const ctx = engine.context();
  const job = hire(ctx, { professionId, levelId, employer: createEmployer(new Random(2), state, getProfession(professionId), state.character.regionId) });
  assert.ok(job, `hired ${professionId}.${levelId}`);
  state.prompts = [];
  return { engine, state, ctx, job };
}

const tests = {
  'central fleet: a watch manager sees one station, not the whole service'() {
    const wm = worker('GB', 'manchester', 'fire', 'captain');
    const chief = worker('GB', 'manchester', 'fire', 'chief');
    const c = contextOf(wm.state, 'job');
    const cc = contextOf(chief.state, 'job');
    assert.ok(c.hq && cc.fleetHead, 'the station bids to HQ; the chief runs the fleet');
    const units = (s, x) => Object.values(recordOf(s, x).units).reduce((n, u) => n + u.length, 0);
    assert.ok(units(wm.state, c) * 30 < units(chief.state, cc), `station ${units(wm.state, c)} vs service ${units(chief.state, cc)}`);
    assert.ok(annualMoney(wm.state, c) < 100000, `a station's O&M allocation is modest: ${annualMoney(wm.state, c)}`);
  },
  'central fleet: the chief\'s capital budget follows the fleet policy'() {
    const { state } = worker('GB', 'manchester', 'fire', 'chief');
    const c = contextOf(state, 'job');
    const money = {};
    for (const p of Object.keys(FLEET_POLICIES)) { c.fleetHead.fleetPolicy = p; money[p] = annualMoney(state, contextOf(state, 'job')); }
    assert.ok(money.stretch < money.schedule && money.schedule < money.premium, JSON.stringify(money));
  },
  'government pay: capped by law, and a GS label for US federal jobs'() {
    const { state, job } = worker('US', null, 'fbi', 'sac');
    assert.ok(!onBands(job));
    assert.ok(job.salary <= PAY_CAP.federalExec, `capped: ${job.salary}`);
    assert.equal(payCap({ sector: 'federal', grade: 6, abilities: [] }), PAY_CAP.federal);
    assert.match(payGradeLabel({ sector: 'federal', grade: 7 }, 'US'), /^GS-13$/);
    assert.match(payGradeLabel({ sector: 'municipal', grade: 7 }, 'US'), /^Grade 7$/);
    void state;
  },
  'government steps: waiting periods lengthen; poor ratings freeze; outstanding earns a QSI'() {
    const job = { step: 4, stepYears: 0, performance: 70 };
    assert.equal(scheduleYear(job, 40), 0, 'step 4 waits two years');
    assert.equal(scheduleYear(job, 41), 1);
    assert.equal(job.step, 5);
    const frozen = { step: 2, stepYears: 0, performance: 40 };
    assert.equal(scheduleYear(frozen, 40), 0, 'withheld below fully successful');
    const star = { step: 1, stepYears: 0, performance: 90 };
    assert.equal(scheduleYear(star, 40), 2, 'a within-grade increase plus a QSI');
    assert.equal(scheduleYear(star, 41), 1, 'QSIs are rationed');
  },
  'company pay: a band, merit raises that shrink at the top, and a bonus'() {
    const { state, job } = worker('US', null, 'accounting', 'senior');
    assert.ok(onBands(job) && job.band >= 1);
    const step = job.step;
    job.performance = 90;
    const raise = bandYear(job, 'normal');
    assert.ok(raise > 0.03, `merit raise ${raise}`);
    job.band = BAND_MAX;
    assert.equal(bandYear(job, 'normal'), 0, 'nothing above the band maximum');
    recalcSalary(state, job);
    assert.equal(job.step, step, 'companies have no steps');
    job.grade = 7;
    assert.ok(bonusFor(job, 'normal') > 0 && bonusFor(job, 'recession') < bonusFor(job, 'normal'));
  },
  'promotions: a RIF bump never sends you back to the academy'() {
    const fire = getProfession('fire');
    const prev = previousLevel(fire, 'large', 'firefighter');
    assert.ok(!prev || prev.id !== 'recruit', `bump target ${prev?.id}`);
  },
  'promotions: a plateau lifts after a few years'() {
    const { engine, state, job } = worker('US', null, 'accounting', 'auditManager');
    job.passovers = PLATEAU_AFTER;
    job.plateauUntil = state.character.age + 1;
    job.yearsInLevel = 10;
    assert.ok(promotionStatus(state).plateaued);
    for (let y = 0; y < 2; y++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
    if (state.career.job) assert.ok(!state.career.job.plateauUntil && state.career.job.passovers < PLATEAU_AFTER, 'fresh look');
    void PLATEAU_YEARS;
  },
  'promotions: heading the organization stops ordinary ladder promotions'() {
    const { state, job } = worker('US', null, 'accounting', 'senior');
    job.headOf = { orgId: job.employer.orgId, deptId: null, title: 'Chief Executive', mapped: false, prev: { title: job.title, payAdjust: 1, abilities: [...job.abilities] } };
    job.yearsInLevel = 20;
    job.performance = 95;
    const s = promotionStatus(state);
    assert.ok(!s.eligible, s.reason);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 3).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} pay/fleet test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} pay/fleet tests passed`);
