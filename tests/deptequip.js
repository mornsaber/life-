/**
 * Department equipment: fleets and facilities, the capital budget, buying,
 * leasing, refurbishing, retiring, bonds, readiness — and the new airport
 * police and fire departments.
 *
 *   node tests/deptequip.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, applicationEligibility } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { DeptEquipmentModule, deptOf, readiness, canManage } from '../src/modules/publicsafety/DeptEquipment.js';
import { FireLifeModule } from '../src/modules/publicsafety/FireLife.js';
import { PoliceLifeModule } from '../src/modules/publicsafety/PoliceLife.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function worker(seed, professionId, levelId, creds = []) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Dept', lastName: 'Head', gender: 'female' });
  state.character.age = 45;
  Object.assign(state.stats, { smarts: 75, fitness: 70, health: 90 });
  state.legal.record = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'economics', schoolId: 'state', gpa: 3.2, year: 22 });
  for (const c of creds) state.credentials.held[c] = { earnedAge: 22, renewedAge: 40, status: 'active' };
  const ctx = engine.context();
  const job = hire(ctx, { professionId, levelId, employer: createEmployer(ctx.rng, state, getProfession(professionId), state.character.regionId) });
  assert.ok(job, `hired ${professionId}.${levelId}`);
  job.yearsAtEmployer = 15;
  state.prompts = [];
  return { engine, state, ctx, job };
}
const tick = (ctx, state) => { state.career.job.paidThisYear = true; state.character.age += 1; state.yearly = {}; DeptEquipmentModule.onAgeUp(ctx); };

const tests = {
  'a police captain manages the fleet: buy, lease, retire, bank'() {
    const { engine, state, ctx } = worker(1, 'police', 'captain', ['post', 'driverLicense', 'fto', 'supervisorCourse']);
    assert.ok(canManage(state.career.job));
    const d = deptOf(state);
    assert.ok(d.budget > 0, 'a capital budget');
    const before = d.units.patrol.length;
    engine.dispatch('deptEquip.buy', 'patrol:hybrid');
    engine.dispatch('deptEquip.buy', 'patrol:suv:lease');
    assert.equal(d.units.patrol.length, before + 2);
    engine.dispatch('deptEquip.retire', 'patrol');
    assert.equal(d.units.patrol.length, before + 1);
    engine.dispatch('deptEquip.buy', 'stations:storefront');
    engine.dispatch('deptEquip.bank');
    assert.ok(d.reserve > 0, 'banked for a big purchase');
    const r0 = readiness(state);
    for (let i = 0; i < 3; i++) tick(ctx, state);
    assert.ok(typeof readiness(state) === 'number' && r0 >= 0);
    const html = VIEWS.career(state, {});
    assert.match(html, /Department Fleet &amp; Facilities|Department Fleet & Facilities/);
    assert.ok(!/NaN|undefined/.test(html));
  },

  'a fire chief refurbishes an engine and asks for a station bond'() {
    const { engine, state, ctx } = worker(2, 'fire', 'battalion', ['ff1', 'ff2', 'emt', 'driverLicense', 'driverOperator', 'fireOfficer1', 'fireOfficer2', 'ics300']);
    const d = deptOf(state);
    d.budget = 5_000_000;
    const oldest = Math.max(...d.units.engine.map((u) => u.age));
    engine.dispatch('deptEquip.refurb', 'engine');
    assert.ok(Math.max(...d.units.engine.map((u) => u.age)) <= oldest, 'refurbished');
    let approved = false;
    for (let i = 0; i < 15 && !approved; i++) { state.yearly = {}; engine.dispatch('deptEquip.build', 'stations:own'); approved = Boolean(d.bond); }
    assert.ok(approved, 'bond approved');
    const n = d.units.stations.length;
    tick(ctx, state);
    tick(ctx, state);
    assert.equal(d.units.stations.length, n + 1, 'the station opened');
  },

  'rank and file can\'t buy; neglect hurts readiness'() {
    const { engine, state, ctx } = worker(3, 'ems', 'paramedic', ['emt', 'paramedic', 'driverLicense']);
    const d = deptOf(state);
    const n = d.units.ambulance.length;
    engine.dispatch('deptEquip.buy', 'ambulance:box');
    assert.equal(d.units.ambulance.length, n, 'no purchase');
    const r = readiness(state);
    for (let i = 0; i < 8; i++) tick(ctx, state);
    assert.ok(readiness(state) < r, `fleets age without investment (${r} → ${readiness(state)})`);
  },

  'university police: a state agency on campus, with campus calls and blue-light phones'() {
    const { state, ctx, engine } = worker(6, 'universityPolice', 'officer', ['post', 'driverLicense']);
    assert.equal(getProfession('universityPolice').sector, 'state');
    assert.equal(state.police.area, 'campus');
    assert.ok(deptOf(state).units.phones.length > 10, 'blue-light phones');
    let campus = false;
    for (let i = 0; i < 15 && !campus; i++) {
      state.prompts = [];
      state.career.job.paidThisYear = true;
      state.character.age += 1;
      state.yearly = {};
      PoliceLifeModule.onAgeUp(ctx);
      const p = state.prompts.find((x) => x.type === 'police.call');
      campus = Boolean(p && ['clery', 'titleix', 'party', 'protest', 'threat', 'gameday'].includes(p.data.callId));
      if (p) engine.resolvePrompt(p.id, p.options[0].id);
    }
    assert.ok(campus, 'campus calls');
    assert.ok(!/NaN|undefined/.test(VIEWS.career(state, {})));
  },

  'airport police and ARFF exist, train and fight aircraft fires'() {
    const pol = worker(4, 'airportPolice', 'officer', ['post', 'driverLicense']);
    assert.equal(pol.state.police.area, 'terminal');
    assert.ok(deptOf(pol.state).units.k9, 'explosives-detection K-9s');
    const fire = worker(5, 'airportFire', 'firefighter', ['ff1', 'ff2', 'arff', 'driverLicense']);
    assert.equal(fire.state.fireLife.station, 'airport');
    assert.ok(deptOf(fire.state).units.crash.length > 0, 'crash trucks');
    let arff = false;
    for (let i = 0; i < 12 && !arff; i++) {
      fire.state.prompts = [];
      fire.state.career.job.paidThisYear = true;
      fire.state.character.age += 1;
      fire.state.yearly = {};
      FireLifeModule.onAgeUp(fire.ctx);
      arff = fire.state.prompts.some((p) => p.type === 'fireLife.call' && ['alert2', 'crash', 'fuel', 'terminal'].includes(p.data.callId));
    }
    assert.ok(arff, 'aircraft emergencies');
    const html = VIEWS.career(fire.state, {});
    assert.ok(!/NaN|undefined/.test(html));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} department-equipment test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} department-equipment tests passed`);
