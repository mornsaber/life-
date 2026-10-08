/**
 * Work gear for employees: owner-operator trucks, booth rental, tools,
 * side-job equipment, financing, wear and resale.
 *
 *   node tests/gear.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { WorkGearModule, GEAR, buyEligibility } from '../src/modules/career/WorkGear.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function worker(seed, professionId, levelId, creds = [], years = 4) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Work', lastName: 'Gear' });
  state.character.age = 32;
  state.finances.cash = 300000;
  state.housing.credit.score = 720;
  state.legal.record = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
  for (const c of creds) state.credentials.held[c] = { earnedAge: 22, renewedAge: 30, status: 'active' };
  const ctx = engine.context();
  const job = hire(ctx, { professionId, levelId, employer: createEmployer(ctx.rng, state, getProfession(professionId), state.character.regionId) });
  assert.ok(job, `hired ${professionId}.${levelId}`);
  job.yearsAtEmployer = years;
  state.prompts = [];
  return { engine, state, ctx, job };
}
const tick = (ctx, state) => { if (state.career.job) state.career.job.paidThisYear = true; state.character.age += 1; state.yearly = {}; WorkGearModule.onAgeUp(ctx); };
const cash = (state) => state.finances.cash;

const tests = {
  'a truck driver goes owner-operator on a financed truck'() {
    const { engine, state, ctx } = worker(1, 'trucking', 'driver', ['cdlA', 'driverLicense']);
    assert.ok(buyEligibility(state, 'ownTruck').ok, buyEligibility(state, 'ownTruck').reason);
    engine.dispatch('gear.buy', 'ownTruck:loan');
    assert.equal(state.gear.owned.length, 1);
    assert.ok(state.gear.loan?.balance > 100000);
    const before = cash(state);
    for (let i = 0; i < 5; i++) tick(ctx, state);
    assert.ok(Object.values(state.gear.lastYear)[0] > 30000, `nets ${Object.values(state.gear.lastYear)[0]}`);
    assert.ok(state.gear.owned[0].age === 5);
    assert.ok(cash(state) !== before, 'settlements and payments move money');
    assert.match(VIEWS.career(state, {}), /Your Work Gear/);
    assert.ok(!/NaN|undefined/.test(VIEWS.career(state, {})));
  },

  'requirements: a trainee or someone without a CDL can\'t lease on'() {
    const { state } = worker(2, 'trucking', 'driver', ['driverLicense'], 0);
    assert.match(buyEligibility(state, 'ownTruck').reason, /CDL|Commercial/);
  },

  'tools make a mechanic better and better paid'() {
    const { engine, state, ctx, job } = worker(3, 'automotive', getProfession('automotive').levels.find((l) => l.entry)?.id ?? getProfession('automotive').levels[1].id);
    const perf = job.performance;
    engine.dispatch('gear.buy', 'mechanicTools');
    assert.ok(job.performance > perf, 'better on day one');
    tick(ctx, state);
    assert.ok(Object.values(state.gear.lastYear)[0] > 0, 'more billable hours');
  },

  'a stylist rents a booth; a plumber does side jobs from a van'() {
    const s = worker(4, 'cosmetology', getProfession('cosmetology').levels.find((l) => l.entry)?.id ?? getProfession('cosmetology').levels[0].id, ['cosmetologyLicense']);
    s.engine.dispatch('gear.buy', 'boothRental');
    tick(s.ctx, s.state);
    assert.ok(Object.keys(s.state.gear.lastYear).length, 'booth year');
    const p = worker(5, 'plumbing', getProfession('plumbing').levels.find((l) => l.entry)?.id ?? getProfession('plumbing').levels[0].id, ['journeymanPlumber']);
    p.engine.dispatch('gear.buy', 'workVan:used');
    tick(p.ctx, p.state);
    assert.ok(Object.values(p.state.gear.lastYear)[0] >= 6000, 'side income');
  },

  'gear sits idle in another job and can be sold'() {
    const { engine, state, ctx } = worker(6, 'tech', getProfession('tech').levels.find((l) => l.entry)?.id ?? getProfession('tech').levels[0].id, [], 2);
    engine.dispatch('gear.buy', 'workstation');
    state.career.job.professionId = 'retail';
    tick(ctx, state);
    assert.deepEqual(state.gear.lastYear, {}, 'idle');
    const before = cash(state);
    engine.dispatch('gear.sell', state.gear.owned[0].id);
    assert.ok(cash(state) > before && !state.gear.owned.length);
  },

  'every gear item names real careers'() {
    for (const [id, item] of Object.entries(GEAR)) for (const p of item.professions) assert.ok(getProfession(p), `${id}: ${p}`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} gear test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} gear tests passed`);
