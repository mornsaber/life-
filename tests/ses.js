/**
 * The Senior Executive Service: gated executive rungs, the Candidate
 * Development Program, ECQ applications, probation, pay and awards,
 * presidential nominations and old saves.
 *
 *   node tests/ses.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, promotionStatus } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { pursueEligibility } from '../src/modules/credentials/LicensingEngine.js';
import { SeniorExecutiveModule, sesReadiness, SES_PAY } from '../src/modules/publicservice/SeniorExecutive.js';
import { scopeOfType } from '../src/core/PromptScope.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function fed(seed, professionId = 'regulatory', levelId = 'branchChief', years = 10) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Fed', lastName: 'Exec' });
  state.character.age = 45;
  Object.assign(state.stats, { smarts: 85, health: 90, happiness: 70, stress: 20 });
  state.legal.record = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'economics', schoolId: 'state', gpa: 3.5, year: 22 });
  state.publicService.clearance = { level: 'topSecret', grantedAge: 30 };
  state.credentials.held.cpa = { earnedAge: 30, status: 'active' };
  const ctx = engine.context();
  const p = getProfession(professionId);
  const job = hire(ctx, { professionId, levelId, employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
  assert.ok(job, `hired into ${professionId}.${levelId}`);
  Object.assign(job, { yearsAtEmployer: years, yearsInLevel: 4, performance: 88 });
  state.prompts = [];
  return { engine, state, ctx, job };
}
const tick = (ctx, state) => {
  const job = state.career.job;
  if (job) { job.paidThisYear = true; job.yearsAtEmployer += 1; job.yearsInLevel += 1; }
  state.character.age += 1;
  state.yearly = {};
  SeniorExecutiveModule.onAgeUp(ctx);
};

const tests = {
  'executive rungs need SES certification; you cannot buy it on the Licenses tab'() {
    const { state, job } = fed(1, 'regulatory', 'branchChief');
    job.yearsInLevel = 10;
    const st = promotionStatus(state);
    assert.ok(!st.eligible && /Senior Executive Service/.test(st.reason), st.reason);
    assert.match(pursueEligibility(state, 'sesCert').reason, /Senior Executive Service process/);
    assert.equal(scopeOfType('ses.reassign'), 'job');
  },

  'the Candidate Development Program: selection, two years, certification, appointment'() {
    let run;
    for (let seed = 2; seed < 60; seed++) {
      run = fed(seed);
      assert.ok(sesReadiness(run.state).ok, JSON.stringify(sesReadiness(run.state).checks));
      run.engine.dispatch('ses.cdp');
      if (run.state.ses.stage === 'cdp') break;
    }
    const { engine, state, ctx } = run;
    assert.equal(state.ses.stage, 'cdp', 'selected for the CDP within a few dozen tries');
    tick(ctx, state);
    const d = state.prompts.find((p) => p.type === 'ses.detail');
    assert.ok(d, 'developmental assignment');
    engine.resolvePrompt(d.id, d.options[0].id);
    tick(ctx, state);
    assert.equal(state.ses.stage, 'certified', 'certified by the QRB (about 90% of graduates)');
    for (let i = 0; i < 10 && state.ses.stage === 'certified'; i++) {
      state.prompts = [];
      tick(ctx, state);
      const o = state.prompts.find((p) => p.type === 'ses.offer');
      if (o) engine.resolvePrompt(o.id, 'accept');
    }
    assert.equal(state.ses.stage, 'member');
    assert.equal(state.career.job.levelId, 'deputy', 'appointed Deputy Administrator');
    assert.ok(state.career.job.salary >= SES_PAY.min && state.career.job.salary <= SES_PAY.max + 100, `SES pay ${state.career.job.salary}`);
    assert.match(VIEWS.career(state, {}), /Senior Executive Service/);
  },

  'ECQ applications, probation, appraisals and Presidential Rank Awards'() {
    let run;
    for (let seed = 70; seed < 160; seed++) {
      run = fed(seed);
      run.engine.dispatch('ses.ecq');
      if (run.state.ses.stage === 'member') break;
    }
    const { state, ctx } = run;
    assert.equal(state.ses.stage, 'member', 'selected through ECQs');
    for (let i = 0; i < 25; i++) { state.prompts = []; state.career.job.performance = 92; tick(ctx, state); if (state.ses.stage !== 'member') break; }
    assert.ok(state.ses.awards > 0, 'performance awards');
    assert.ok(state.honors.some((h) => h.id === 'ses.meritorious'), 'a Meritorious Rank Award over 25 years');
    assert.ok(state.career.job.salary <= SES_PAY.max + 100, 'capped');
    const honors = VIEWS.honors(state, {});
    assert.ok(!/NaN|undefined/.test(honors));
  },

  'failing probation falls back to GS-15'() {
    let run;
    for (let seed = 200; seed < 300; seed++) { run = fed(seed); run.engine.dispatch('ses.ecq'); if (run.state.ses.stage === 'member') break; }
    const { state, ctx } = run;
    state.career.job.performance = 30;
    tick(ctx, state);
    assert.equal(state.ses.stage, 'certified');
    assert.equal(state.career.job.levelId, 'branchChief');
  },

  'experts: Senior Level / Senior Technical'() {
    const { engine, state } = fed(300, 'regulatory', 'expert', 14);
    state.career.job.performance = 95;
    let ok = false;
    for (let i = 0; i < 20 && !ok; i++) { state.yearly = {}; engine.dispatch('ses.slst'); ok = state.ses.stage === 'member'; }
    assert.ok(ok, 'appointed SL/ST');
    assert.equal(state.ses.type, 'slst');
    assert.ok(state.career.job.salary >= SES_PAY.min);
  },

  'presidential nominations reach the very top'() {
    const { engine, state, ctx } = fed(400, 'foreignService', 'dcm', 20);
    SeniorExecutiveModule.init(state);
    assert.equal(state.ses.stage, 'member', 'an old save in an SFS post is grandfathered');
    let confirmed = false;
    for (let i = 0; i < 60 && !confirmed; i++) {
      state.prompts = [];
      state.career.job.performance = 92;
      state.character.age = Math.min(state.character.age, 60);
      tick(ctx, state);
      const n = state.prompts.find((p) => p.type === 'ses.nomination');
      if (n) { engine.resolvePrompt(n.id, 'accept'); confirmed = state.career.job.levelId === 'ambassador'; }
    }
    assert.ok(confirmed, 'nominated and confirmed as ambassador');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} SES test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} SES tests passed`);
