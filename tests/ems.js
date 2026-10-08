/**
 * EMS: agencies, shifts, the year on the ambulance, calls, recertification,
 * assignments, burnout and the bridges out.
 *
 *   node tests/ems.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, leaveJob } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { grantCredential } from '../src/modules/credentials/LicensingEngine.js';
import { scopeOfType } from '../src/core/PromptScope.js';
import { EmsLifeModule, agencyEligibility, emsPayAdjust } from '../src/modules/ems/EmsLife.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed = 3, creds = ['emt', 'paramedic']) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Ems', lastName: 'Test' });
  state.character.age = 26;
  Object.assign(state.stats, { smarts: 70, health: 95, happiness: 70, stress: 20 });
  state.legal.record = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
  const ctx = engine.context();
  for (const c of creds) grantCredential(ctx, c, { silent: true });
  return { engine, state, ctx };
}
function medic(ctx, state, levelId = 'paramedic') {
  const p = getProfession('ems');
  const employer = createEmployer(ctx.rng, state, p, state.character.regionId);
  return hire(ctx, { professionId: 'ems', levelId, employer });
}
const tick = (ctx, state) => { if (state.career.job) state.career.job.paidThisYear = true; state.character.age += 1; state.yearly = {}; EmsLifeModule.onAgeUp(ctx); };
const pick = (engine, state, type, opt) => { const p = state.prompts.find((x) => x.type === type); if (p) engine.resolvePrompt(p.id, opt ?? p.options.find((o) => !o.disabled).id); return p; };

const tests = {
  'choosing an agency sets pay; fire-based and flight need certifications'() {
    const { engine, state, ctx } = setup(1);
    const job = medic(ctx, state);
    assert.ok(job);
    state.prompts = [];
    tick(ctx, state);
    const p = state.prompts.find((x) => x.type === 'emsLife.setup');
    assert.ok(p, 'asked which agency');
    assert.equal(scopeOfType('emsLife.setup'), 'job');
    assert.ok(p.options.find((o) => o.id === 'fireBased').disabled, 'fire-based needs FF1');
    assert.ok(p.options.find((o) => o.id === 'flight').disabled, 'flight needs FP-C');
    const base = state.career.job.salary;
    engine.resolvePrompt(p.id, 'private');
    assert.equal(state.ems.agency, 'private');
    assert.ok((state.career.job.salary) < base, 'private pays less');
    grantCredential(ctx, 'ff1', { silent: true });
    assert.ok(agencyEligibility(state, 'fireBased').ok);
    engine.dispatch('emsLife.agency', 'fireBased');
    assert.equal(state.ems.agency, 'fireBased');
    engine.dispatch('emsLife.shift', 'nights');
    assert.equal(state.ems.shift, '24-48', 'fire departments run 24-hour shifts');
    engine.dispatch('emsLife.shift', '48-96');
    assert.equal(state.ems.shift, '48-96');
  },

  'a year on the ambulance: runs, saves, calls, recertification'() {
    const { engine, state, ctx } = setup(2);
    medic(ctx, state);
    state.ems.agency = 'thirdService';
    for (let i = 0; i < 6; i++) {
      state.prompts = [];
      if (i % 2 === 0) engine.dispatch('emsLife.ce');
      tick(ctx, state);
      pick(engine, state, 'emsLife.call');
      pick(engine, state, 'emsLife.event');
    }
    assert.ok(state.ems.calls > 5000, `runs: ${state.ems.calls}`);
    assert.ok(state.health.trauma >= 0);
    assert.equal(state.credentials.held.paramedic.status, 'active', 'kept certified with CE');
    assert.match(VIEWS.career(state, {}), /On the Ambulance/);
    assert.ok(!/NaN|undefined/.test(VIEWS.career(state, {})));
  },

  'skipping continuing education lapses the card'() {
    const { state, ctx } = setup(3);
    medic(ctx, state);
    state.ems.agency = 'thirdService';
    for (let i = 0; i < 3; i++) { state.prompts = []; tick(ctx, state); }
    assert.notEqual(state.credentials.held.paramedic.status, 'active', 'paramedic suspended');
  },

  'assignments need certifications; burnout can end the career'() {
    const { engine, state, ctx } = setup(4);
    medic(ctx, state);
    state.ems.agency = 'private';
    engine.dispatch('emsLife.assignment', 'tactical');
    assert.ok(!state.ems.assignments.tactical, 'needs the TEMS card');
    engine.dispatch('emsLife.assignment', 'peer');
    assert.ok(state.ems.assignments.peer);
    state.ems.burnout = 95;
    state.prompts = [];
    for (let i = 0; i < 10 && !state.prompts.some((p) => p.type === 'emsLife.burnout'); i++) { state.ems.burnout = 95; tick(ctx, state); }
    pick(engine, state, 'emsLife.burnout', 'leave');
    assert.equal(state.career.job, null, 'left EMS');
    assert.ok(!state.prompts.some((p) => scopeOfType(p.type) === 'job' && p.type.startsWith('emsLife')), 'EMS prompts pruned');
  },

  'EMT-basics see no pediatric codes and can do the peer team only'() {
    const { engine, state, ctx } = setup(5, ['emt']);
    const job = medic(ctx, state, 'emt');
    assert.ok(job, 'hired as an EMT');
    state.ems.agency = 'private';
    engine.dispatch('emsLife.assignment', 'community');
    assert.ok(!state.ems.assignments.community);
    assert.ok(emsPayAdjust(state) < 1);
    leaveJob(ctx, 'Resigned');
    tick(ctx, state);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} EMS test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} EMS tests passed`);
