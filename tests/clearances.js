/**
 * Security clearances as a career asset: cleared pay, recruiter offers,
 * employer sponsorship, hiring edge, revocation and lapse.
 *
 *   node tests/clearances.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { recalcSalary } from '../src/modules/career/Compensation.js';
import { clearanceHiringBonus, makeCleared } from '../src/modules/career/ClearedWork.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed = 3, age = 28) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Clear', lastName: 'Test' });
  state.character.age = age;
  Object.assign(state.stats, { smarts: 85, health: 90 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'computerScience', year: 22 });
  state.credentials.held.securityPlus = { status: 'active', earnedAge: 23 };
  return { engine, state, ctx: engine.context() };
}
const solveAll = (engine) => { for (let i = 0; i < 20 && engine.state.prompts.length; i++) { const p = engine.state.prompts[0]; engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled && o.tone !== 'danger' && o.id !== 'accept') ?? p.options[0]).id); } };

const tests = {
  'recruiters call TS/SCI holders with a cleared job that pays a premium and keeps the clearance active'() {
    // A clearance lapses a few years after you leave cleared work, so a call may not come in every life: try a few.
    let engine; let state; let offer = null;
    for (let seed = 3; seed < 9 && !offer; seed++) {
      let ctx;
      ({ engine, state, ctx } = setup(seed));
      ctx.emit('clearance:grant', { level: 'topSecret', concealed: false });
      state.career.history.push({ professionId: 'cybersecurity', title: 'Security Analyst', levelId: 'analyst', employerName: 'X', sector: 'private', startAge: 22, endAge: 27, reason: 'quit' });
      for (let i = 0; i < 12 && !offer; i++) { state.prompts = []; engine.ageUp(); offer = state.prompts.find((p) => p.type === 'cleared.offer'); }
    }
    assert.ok(offer, 'a recruiter called');
    state.prompts = [offer];
    engine.resolvePrompt(offer.id, 'accept');
    const job = state.career.job;
    assert.equal(job.cleared, 'topSecret');
    const paid = job.salary;
    job.cleared = null;
    recalcSalary(state, job);
    assert.ok(paid > job.salary * 1.15, `cleared pay premium: ${paid} vs ${job.salary}`);
    job.cleared = 'topSecret';
    recalcSalary(state, job);
    state.prompts = [];
    for (let i = 0; i < 4; i++) { engine.ageUp(); solveAll(engine); }
    if (state.career.job?.cleared) assert.equal(state.publicService.clearance?.status, 'active', 'still active');
  },

  'holders get a hiring edge where a clearance is needed'() {
    const { state, ctx } = setup();
    const fbi = getProfession('fbi');
    assert.equal(clearanceHiringBonus(state, fbi), 0);
    ctx.emit('clearance:grant', { level: 'topSecret', concealed: false });
    assert.ok(clearanceHiringBonus(state, fbi) >= 0.15);
    assert.ok(clearanceHiringBonus(state, getProfession('cybersecurity')) > 0);
    assert.equal(clearanceHiringBonus(state, getProfession('retail')), 0);
  },

  'a large employer can sponsor your clearance; losing it costs the premium, not the job'() {
    const { engine, state, ctx } = setup(5);
    engine.dispatch('career.apply', 'cybersecurity');
    solveAll(engine);
    let job = state.career.job;
    if (!job) return;
    job.employer.size = 'enterprise';
    job.performance = 95;
    for (let i = 0; i < 12 && !job.cleared; i++) { state.yearly = {}; job.lastSponsorAge = null; engine.dispatch('cleared.requestSponsorship'); }
    assert.ok(job.cleared, 'on a classified program');
    assert.ok(state.publicService.clearance);
    ctx.emit('career:clearanceRevoked', {});
    job = state.career.job;
    assert.ok(job, 'kept the job');
    assert.equal(job.cleared, null);
  },

  'out of a cleared job, a clearance lapses after two years'() {
    const { engine, state, ctx } = setup(7);
    ctx.emit('clearance:grant', { level: 'secret', concealed: false });
    for (let i = 0; i < 4 && state.publicService.clearance; i++) { state.prompts = []; engine.ageUp(); state.prompts = []; }
    assert.equal(state.publicService.clearance, null);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 5).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} clearance test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} clearance tests passed`);
