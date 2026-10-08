/**
 * Research labs: what each kind of institution allows, hiring, Ph.D.
 * supervision, money, moving labs, closing them, and research awards.
 *
 *   node tests/lab.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, leaveJob } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { LabModule, tierOf, hireEligibility, canRunLab } from '../src/modules/academia/Lab.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed = 3, age = 34) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Lab', lastName: 'Test' });
  state.character.age = age;
  Object.assign(state.stats, { smarts: 90, health: 95, happiness: 70, stress: 20 });
  state.legal.record = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'biology', schoolId: 'state', gpa: 3.8, year: 22 }, { type: 'doctorate', programId: 'phd', major: 'biology', schoolId: 'elite', gpa: 3.9, year: 28 });
  return { engine, state, ctx: engine.context() };
}
function facultyAt(ctx, state, professionId, levelId, size) {
  const p = getProfession(professionId);
  let employer;
  for (let i = 0; i < 30; i++) { employer = createEmployer(ctx.rng, state, p, state.character.regionId); if (!size || employer.size === size) break; }
  const job = hire(ctx, { professionId, levelId, employer });
  return job;
}
const tick = (ctx, state) => { if (state.career.job) state.career.job.paidThisYear = true; state.character.age += 1; state.yearly = {}; LabModule.onAgeUp(ctx); };

const tests = {
  'your institution decides what lab you can run'() {
    const r1 = setup(1);
    facultyAt(r1.ctx, r1.state, 'college', 'assistant', 'large');
    assert.equal(tierOf(r1.state), 'r1');
    assert.ok(r1.state.lab?.active, 'lab opened on hire');
    assert.ok(r1.state.lab.funds >= 900000, 'R1 startup package');
    assert.ok(hireEligibility(r1.state, 'phd').ok, hireEligibility(r1.state, 'phd').reason);

    const tc = setup(2);
    facultyAt(tc.ctx, tc.state, 'college', 'assistant', 'small');
    assert.equal(tierOf(tc.state), 'teaching');
    assert.match(hireEligibility(tc.state, 'phd').reason, /no Ph\.D\. program/);
    assert.ok(hireEligibility(tc.state, 'undergrad').ok);

    const cc = setup(3);
    facultyAt(cc.ctx, cc.state, 'communityCollege', 'instructor');
    assert.equal(canRunLab(cc.state).ok, false);

    const inst = setup(4);
    facultyAt(inst.ctx, inst.state, 'research', 'pi');
    assert.equal(tierOf(inst.state), 'institute');
    assert.equal(hireEligibility(inst.state, 'phd').ok, false, 'no students at an institute');
    assert.ok(hireEligibility(inst.state, 'postdoc').ok);
  },

  'recruiting Ph.D. students, payroll, papers, defenses and alumni'() {
    const { engine, state, ctx } = setup(5);
    facultyAt(ctx, state, 'college', 'associate', 'large');
    state.prompts = [];
    engine.dispatch('lab.hire', 'phd');
    const p = state.prompts.find((x) => x.type === 'lab.recruit');
    assert.ok(p, 'admissions weekend');
    engine.resolvePrompt(p.id, '0');
    engine.dispatch('lab.hire', 'postdoc');
    engine.dispatch('lab.hire', 'tech');
    assert.equal(state.lab.members.length, 3);
    const funds = state.lab.funds;
    const papers = state.science.papers;
    for (let i = 0; i < 8; i++) { state.prompts = []; tick(ctx, state); }
    assert.ok(state.lab.funds < funds, 'payroll paid from lab funds');
    assert.ok(state.science.papers > papers, 'the lab publishes');
    assert.ok(state.lab.alumni.length >= 1, 'people moved on');
    assert.ok(state.lab.alumni.some((a) => a.role === 'phd') || state.lab.members.some((m) => m.role === 'phd'), 'the student is accounted for');
    assert.match(VIEWS.career(state, {}), /Research Lab/);
  },

  'running out of money: bridge funding, then layoffs; Ph.D. students teach'() {
    const { engine, state, ctx } = setup(6);
    facultyAt(ctx, state, 'college', 'assistant', 'large');
    state.prompts = [];
    engine.dispatch('lab.hire', 'staff');
    engine.dispatch('lab.hire', 'postdoc');
    const p = (engine.dispatch('lab.hire', 'phd'), state.prompts.find((x) => x.type === 'lab.recruit'));
    engine.resolvePrompt(p.id, '1');
    state.lab.funds = 10000;
    state.science.grant = null;
    tick(ctx, state);
    assert.ok(state.lab.bridged, 'bridge funding');
    state.lab.funds = 0;
    tick(ctx, state);
    assert.ok(state.lab.alumni.some((a) => a.outcome === 'laid off') || state.lab.members.some((m) => m.ta), 'layoffs or TA lines');
  },

  'moving to a teaching college: students can\'t come; leaving academia closes the lab'() {
    const { engine, state, ctx } = setup(7);
    facultyAt(ctx, state, 'college', 'associate', 'large');
    state.prompts = [];
    engine.dispatch('lab.hire', 'phd');
    engine.resolvePrompt(state.prompts.find((x) => x.type === 'lab.recruit').id, '2');
    engine.dispatch('lab.hire', 'undergrad');
    facultyAt(ctx, state, 'college', 'associate', 'small');
    assert.equal(state.lab.tier, 'teaching');
    assert.ok(state.lab.members.every((m) => m.role === 'undergrad'), 'only undergraduates moved');
    leaveJob(ctx, 'Resigned');
    tick(ctx, state);
    assert.equal(state.lab.active, false, 'lab closed');
  },

  'good research is rewarded'() {
    const { state, ctx } = setup(8, 36);
    facultyAt(ctx, state, 'university', 'assistant');
    Object.assign(state.science, { papers: 120, citations: 20000, hIndex: 60, students: 10, grant: { agency: 'NSF', amount: 300000, yearsLeft: 4 } });
    state.career.job.teaching = 95;
    for (let i = 0; i < 40; i++) { state.prompts = []; state.character.age = 36; tick(ctx, state); }
    const got = state.honors.filter((h) => h.id.startsWith('research.')).map((h) => h.id);
    assert.ok(got.includes('research.sloan'), `Sloan: ${got}`);
    assert.ok(got.includes('research.teaching') && got.includes('research.mentoring'), `teaching and mentoring: ${got}`);
    assert.ok(got.length >= 5, `several awards: ${got}`);
    const honors = VIEWS.honors(state, {});
    assert.ok(typeof honors === 'string' && !/NaN|undefined/.test(honors), 'the Honors tab renders every award');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} lab test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} lab tests passed`);
