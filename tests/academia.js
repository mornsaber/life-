/**
 * Academia: the Ph.D., the academic job market, tenure, research records,
 * honors, misconduct and emeritus status.
 *
 *   node tests/academia.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, promotionStatus } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { AcademiaModule, hIndexOf, tenureOdds } from '../src/modules/academia/Academia.js';
import { emeritusEligibility } from '../src/modules/career/Emeritus.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed = 3, age = 22) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Ada', lastName: 'Test' });
  state.character.age = age;
  Object.assign(state.stats, { smarts: 92, health: 95, happiness: 70, stress: 20 });
  state.legal.record = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'biology', schoolId: 'state', gpa: 3.8, year: 22 });
  return { engine, state, ctx: engine.context() };
}
/** Answer prompts: a chooser per prompt type, else the first safe option. */
function answer(engine, choose = {}) {
  for (let i = 0; i < 12 && engine.state.prompts.length; i++) {
    const p = engine.state.prompts[0];
    const pick = choose[p.type]?.(p) ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0];
    engine.resolvePrompt(p.id, typeof pick === 'string' ? pick : pick.id);
  }
}
const year = (engine, choose) => { answer(engine, choose); engine.state.prompts = []; engine.ageUp(); answer(engine, choose); };
function enrollPhd(engine) {
  for (let i = 0; i < 30 && !engine.state.education.enrolled; i++) {
    engine.state.yearly = {};
    engine.dispatch('education.enroll', 'phd:state:biology:full');
  }
  assert.ok(engine.state.education.enrolled?.programId === 'phd', 'admitted to a Ph.D.');
}
function facultyJob(ctx, state, professionId, levelId, size) {
  const p = getProfession(professionId);
  let employer;
  for (let i = 0; i < 20; i++) { employer = createEmployer(ctx.rng, state, p, state.character.regionId); if (!size || employer.size === size) break; }
  return hire(ctx, { professionId, levelId, employer });
}

const tests = {
  'Ph.D.: advisor, quals, candidacy, papers and a defense that ends it — on its own schedule'() {
    const { engine, state } = setup(3);
    enrollPhd(engine);
    const choose = { 'academia.advisor': () => 'rising', 'academia.quals': () => 'cram', 'academia.defense': () => 'defend', 'academia.grfp': () => 'apply' };
    answer(engine, choose);
    assert.equal(state.academia.phd.advisor.style, 'rising');
    assert.equal(state.education.enrolled.totalYears, 99, 'open-ended until the defense');
    let years = 0;
    while (state.education.enrolled?.programId === 'phd' && years < 12) { year(engine, choose); years += 1; }
    const phd = state.education.degrees.find((d) => d.programId === 'phd');
    const master = state.education.degrees.find((d) => d.enRoute);
    assert.ok(phd || master, 'finished one way or another');
    if (phd) {
      assert.ok(years >= 4 && years <= 9, `took ${years} years`);
      assert.ok(state.academia.phdRecord?.papers >= 1, 'papers recorded');
      assert.equal(state.academia.phd, null);
    }
  },

  'failing quals twice masters you out with a master\'s degree'() {
    const { engine, state } = setup(5);
    state.stats.smarts = 80;
    enrollPhd(engine);
    answer(engine, { 'academia.advisor': () => 'kind' });
    // The exams go badly twice.
    const ctx = engine.context();
    for (let i = 0; i < 2 && state.education.enrolled; i++) {
      const chance = ctx.rng.chance;
      ctx.rng.chance = () => false;
      AcademiaModule.resolvers.quals(ctx, {}, 'normal');
      ctx.rng.chance = chance;
    }
    assert.equal(state.education.enrolled, null, 'left the program');
    assert.ok(state.education.degrees.some((d) => d.type === 'master' && d.enRoute), 'master\'s en route');
    assert.ok(!state.education.degrees.some((d) => d.programId === 'phd'));
  },

  'the academic job market hires into tenure-track jobs; promotion waits for the tenure review'() {
    const { engine, state, ctx } = setup(7, 30);
    state.education.degrees.push({ type: 'doctorate', programId: 'phd', major: 'computerScience', schoolId: 'elite', gpa: 3.9, year: 29 });
    Object.assign(state.science, { papers: 14, firstAuthor: 8, citations: 900, hIndex: 16 });
    state.academia.phdRecord = { advisorFame: 90, schoolId: 'elite', conference: 3 };
    let got = false;
    for (let i = 0; i < 10 && !got; i++) {
      state.yearly = {};
      engine.dispatch('academia.goOnMarket');
      const p = state.prompts.find((x) => x.type === 'academia.offers');
      if (!p) continue;
      const tt = p.options.find((o) => ['r1', 'stateU', 'college'].includes(o.id));
      engine.resolvePrompt(p.id, (tt ?? p.options[0]).id);
      got = Boolean(tt) && state.career.job?.levelId === 'assistant';
    }
    assert.ok(got, 'a tenure-track offer');
    const job = state.career.job;
    assert.ok(job.tenureClock, 'tenure clock started');
    job.yearsInLevel = 6;
    assert.match(promotionStatus(state).reason, /tenure/i, 'promotion only through tenure review');
    const view = VIEWS.career(state, {});
    assert.match(view, /Tenure clock|Research &amp; Academia|Research & Academia/);
  },

  'tenure: a strong record earns it; a thin one means a terminal year'() {
    const strong = setup(11, 34);
    strong.state.education.degrees.push({ type: 'doctorate', programId: 'phd', major: 'biology', schoolId: 'state', gpa: 3.8, year: 29 });
    const j1 = facultyJob(strong.ctx, strong.state, 'college', 'assistant', 'small');
    j1.tenureClock = { papers: 0, grants: 0, focus: 'teaching' };
    j1.teaching = 85;
    strong.state.science.papers = 12;
    j1.yearsInLevel = 6;
    j1.paidThisYear = true;
    assert.ok(tenureOdds(strong.state, j1) > 0.8, 'strong case');
    for (let i = 0; i < 6 && strong.state.career.job?.levelId === 'assistant'; i++) { strong.state.career.job.paidThisYear = true; AcademiaModule.onAgeUp(strong.ctx); }
    assert.equal(strong.state.career.job?.levelId, 'associate', 'tenured and promoted');
    assert.ok(strong.state.career.job.tenured);

    const weak = setup(12, 34);
    weak.state.education.degrees.push({ type: 'doctorate', programId: 'phd', major: 'biology', schoolId: 'state', gpa: 3.8, year: 29 });
    const j2 = facultyJob(weak.ctx, weak.state, 'university', 'assistant');
    j2.tenureClock = { papers: weak.state.science.papers, grants: 0, focus: null };
    j2.teaching = 40;
    j2.performance = 40;
    j2.yearsInLevel = 6;
    assert.ok(tenureOdds(weak.state, j2) < 0.15, 'weak case');
    j2.terminal = true;
    j2.paidThisYear = true;
    AcademiaModule.onAgeUp(weak.ctx);
    assert.equal(weak.state.career.job, null, 'left after the terminal year');
    assert.match(weak.state.career.history.at(-1).reason, /tenure/i);
  },

  'emeritus covers private colleges and senior scientists; sabbaticals for the tenured'() {
    const { state, ctx, engine } = setup(13, 60);
    state.education.degrees.push({ type: 'doctorate', programId: 'phd', major: 'history', schoolId: 'state', gpa: 3.8, year: 29 });
    const job = facultyJob(ctx, state, 'college', 'professor', 'medium');
    job.yearsAtEmployer = 20;
    assert.ok(emeritusEligibility(state).ok, emeritusEligibility(state).reason);
    state.character.age = 67;
    engine.dispatch('retirement.retire');
    assert.match(state.career.emeritus?.title ?? '', /Professor Emerit/);

    const lab = setup(14, 50);
    lab.state.education.degrees.push({ type: 'doctorate', programId: 'phd', major: 'physics', schoolId: 'state', gpa: 3.8, year: 29 });
    const lj = facultyJob(lab.ctx, lab.state, 'nationalLab', 'distinguished');
    lj.yearsAtEmployer = 15;
    assert.match(emeritusEligibility(lab.state).title, /Distinguished Fellow Emerit/);

    const sab = setup(15, 48);
    sab.state.education.degrees.push({ type: 'doctorate', programId: 'phd', major: 'english', schoolId: 'state', gpa: 3.8, year: 29 });
    const sj = facultyJob(sab.ctx, sab.state, 'college', 'associate', 'medium');
    sj.startAge = 38;
    const papers = sab.state.science.papers;
    sab.engine.dispatch('academia.sabbatical');
    assert.ok(sab.state.science.papers > papers, 'research year');
    assert.equal(sab.state.academia.lastSabbaticalAge, 48);
  },

  'citations build an h-index; famous researchers collect honors; fabricated data comes out'() {
    assert.equal(hIndexOf({ papers: 100, citations: 10000 }), 54);
    assert.equal(hIndexOf({ papers: 5, citations: 10000 }), 5);
    const { state, ctx } = setup(16, 45);
    state.education.degrees.push({ type: 'doctorate', programId: 'phd', major: 'biology', schoolId: 'elite', gpa: 3.9, year: 29 });
    facultyJob(ctx, state, 'college', 'professor', 'large');
    Object.assign(state.science, { papers: 200, citations: 30000 });
    for (let i = 0; i < 60 && !state.honors.some((h) => h.id === 'academia.nas'); i++) { state.career.job.paidThisYear = true; AcademiaModule.onAgeUp(ctx); }
    assert.ok(state.honors.some((h) => h.id === 'academia.nas' || h.id === 'academia.fellow'), 'elected to an academy or fellowship');

    const bad = setup(17, 40);
    bad.state.education.degrees.push({ type: 'doctorate', programId: 'phd', major: 'biology', schoolId: 'state', gpa: 3.8, year: 29 });
    facultyJob(bad.ctx, bad.state, 'research', 'staff');
    Object.assign(bad.state.science, { papers: 20, citations: 500 });
    bad.state.academia.fabricated = true;
    for (let i = 0; i < 80 && bad.state.academia.fabricated; i++) { if (bad.state.career.job) bad.state.career.job.paidThisYear = true; AcademiaModule.onAgeUp(bad.ctx); }
    assert.equal(bad.state.academia.fabricated, false, 'discovered');
    assert.ok(bad.state.science.retractions > 0, 'papers retracted');
    assert.ok(bad.state.academia.debarredUntil > 40);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 5).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} academia test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} academia tests passed`);
