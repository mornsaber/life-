/**
 * Higher education extras: acceleration, combined degrees, early decision,
 * campus jobs, fellowships, adjunct teaching, retention offers and publish
 * or perish.
 *
 *   node tests/highered.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { programYears, admissionChance } from '../src/modules/education/EducationEngine.js';
import { PublishingModule, recentOutput } from '../src/modules/academia/Publishing.js';
import { AcademiaModule, tenureOdds } from '../src/modules/academia/Academia.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed = 3, age = 18, { bachelor = false } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Hi', lastName: 'Ed' });
  state.character.age = age;
  Object.assign(state.stats, { smarts: 92, health: 95, happiness: 70, stress: 20 });
  state.legal.record = [];
  state.finances.cash = 80000;
  state.k12.done = true;
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18, gpa: 3.95 });
  if (bachelor) state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'biology', schoolId: 'state', gpa: 3.9, year: 22 });
  return { engine, state, ctx: engine.context() };
}
const answer = (engine, choose = {}) => {
  for (let i = 0; i < 12 && engine.state.prompts.length; i++) {
    const p = engine.state.prompts[0];
    const pick = choose[p.type]?.(p) ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0];
    engine.resolvePrompt(p.id, typeof pick === 'string' ? pick : pick.id);
  }
};
const year = (engine, choose) => { answer(engine, choose); engine.state.prompts = []; engine.ageUp(); answer(engine, choose); };
const enroll = (engine, arg) => { for (let i = 0; i < 40 && !engine.state.education.enrolled; i++) { engine.state.yearly = {}; engine.dispatch('education.enroll', arg); } return engine.state.education.enrolled; };
const job = (ctx, state, id, levelId) => hire(ctx, { professionId: id, levelId, employer: createEmployer(ctx.rng, state, getProfession(id), state.character.regionId) });

const tests = {
  'AP credit and overloads shorten a bachelor\'s; 4+1 adds a master\'s for one more year'() {
    const { engine, state } = setup(1, 15);
    state.k12.done = false;
    for (let i = 0; i < 6 && state.education.apCredit < 1; i++) { state.yearly = {}; engine.dispatch('higherEd.apCourses', 'ap'); }
    assert.ok(state.education.apCredit >= 1, 'a year of credit');
    assert.equal(programYears(state, 'bachelor', 'computerScience'), 3);
    state.character.age = 18;
    state.k12.done = true;
    const e = enroll(engine, 'bachelor:state:computerScience:full');
    assert.equal(e.totalYears, 3, 'three-year degree');
    engine.dispatch('higherEd.overload');
    assert.ok(e.overload);
    let years = 0;
    while (state.education.enrolled && years < 6) {
      if (e.progress >= 2 && !e.fourPlusOne) { engine.dispatch('higherEd.fourPlusOne'); }
      year(engine);
      years += 1;
    }
    assert.ok(state.education.degrees.some((d) => d.type === 'bachelor' && d.major === 'computerScience'), 'bachelor\'s');
    if (e.fourPlusOne) assert.ok(state.education.degrees.some((d) => d.type === 'master' && d.major === 'computerScience'), '4+1 master\'s');
    assert.ok(years <= 4, `done in ${years} years`);
  },

  'Early Decision raises the odds and is used once; BS/MD skips the MCAT'() {
    const { engine, state } = setup(2);
    state.stats.smarts = 78; // a borderline applicant
    state.higherEd.edBoost = true;
    const boosted = admissionChance(state, 'bachelor', 'elite');
    state.higherEd.edBoost = false;
    assert.ok(boosted > admissionChance(state, 'bachelor', 'elite'), 'ED helps');
    engine.dispatch('higherEd.earlyDecision', 'bachelor:elite:biology');
    assert.ok(state.higherEd.edUsed);

    let admitted = false;
    for (let seed = 0; seed < 40 && !admitted; seed++) {
      const t = setup(100 + seed);
      t.state.stats.smarts = 99;
      t.engine.dispatch('higherEd.applyBsmd', 'state');
      if (t.state.education.enrolled?.bsmd) {
        admitted = true;
        const e = t.state.education.enrolled;
        assert.equal(e.totalYears, 3);
        e.progress = 2;
        e.gpa = 3.8;
        e.yearsAttended = 2;
        year(t.engine);
        assert.equal(t.state.education.enrolled?.programId, 'md', 'straight into medical school without an MCAT');
      }
    }
    assert.ok(admitted, 'a BS/MD admission in 40 tries');
  },

  'campus jobs pay; research and letters open Ph.D. doors'() {
    const { engine, state } = setup(4);
    enroll(engine, 'bachelor:state:biology:full');
    const before = admissionChance({ ...state, education: { ...state.education, enrolled: null, degrees: [...state.education.degrees, { type: 'bachelor', programId: 'bachelor', major: 'biology', gpa: 3.8 }] } }, 'phd', 'elite');
    engine.dispatch('higherEd.campusJob', 'library');
    assert.equal(state.higherEd.campusJob, 'library');
    const cash = state.finances.cash;
    year(engine);
    assert.ok(state.finances.ledger.income.some((i) => /campus job/.test(i.source)) || state.finances.cash !== cash, 'paid');
    engine.dispatch('higherEd.campusJob', 'lab');
    year(engine);
    year(engine);
    assert.ok(state.higherEd.ugResearch >= 1 && state.higherEd.letters >= 1);
    const after = admissionChance({ ...state, education: { ...state.education, enrolled: null, degrees: [...state.education.degrees, { type: 'bachelor', programId: 'bachelor', major: 'biology', gpa: 3.8 }] } }, 'phd', 'elite');
    assert.ok(after > before, 'research experience helps Ph.D. admissions');
  },

  'MD/PhD: MCAT and research, eight years, both degrees'() {
    const { engine, state } = setup(5, 22, { bachelor: true });
    state.medicine.premed.research = 2;
    engine.dispatch('medLife.takeMcat', 'prep');
    const e = enroll(engine, 'mdphd:elite::full');
    assert.equal(e?.programId, 'mdphd', 'admitted to MSTP');
    const choose = { 'medLife.step1': () => 'dedicated', 'medLife.step2': () => 'hard', 'medLife.interest': () => 'neurology', 'medLife.aways': () => 'one' };
    let years = 0;
    while (state.education.enrolled?.programId === 'mdphd' && years < 12) { year(engine, choose); years += 1; }
    assert.ok(state.education.degrees.some((d) => d.programId === 'md'), 'M.D.');
    assert.ok(state.education.degrees.some((d) => d.programId === 'phd'), 'Ph.D.');
    assert.ok(years >= 8, `${years} years`);
    assert.ok(state.medicine.schoolRecord?.pubs >= 1, 'research years produced papers');
  },

  'JD/MBA confers both degrees; an MPH year inside medical school'() {
    const { engine, state } = setup(6, 22, { bachelor: true });
    const e = enroll(engine, 'jdmba:state::full');
    assert.equal(e.totalYears, 4);
    for (let i = 0; i < 6 && state.education.enrolled; i++) year(engine);
    assert.ok(state.education.degrees.some((d) => d.programId === 'jd') && state.education.degrees.some((d) => d.programId === 'mba'));

    const m = setup(7, 22, { bachelor: true });
    m.engine.dispatch('medLife.takeMcat', 'prep');
    const md = enroll(m.engine, 'md:state::full');
    assert.ok(md);
    md.progress = 2;
    m.engine.dispatch('higherEd.addMph');
    assert.equal(md.totalYears, 5);
    assert.deepEqual(md.extraGrants, ['mph']);
  },

  'a master\'s in the field counts for Ph.D. coursework; going up early for tenure raises the bar'() {
    const { engine, state, ctx } = setup(8, 24, { bachelor: true });
    state.education.degrees.push({ type: 'master', programId: 'master', major: 'biology', schoolId: 'state', gpa: 3.8, year: 24 });
    const e = enroll(engine, 'phd:state:biology:full');
    assert.equal(e.progress, 1, 'a year of credit');

    const t = setup(9, 34, { bachelor: true });
    t.state.education.degrees.push({ type: 'doctorate', programId: 'phd', major: 'biology', schoolId: 'state', gpa: 3.8, year: 29 });
    const j = job(t.ctx, t.state, 'college', 'assistant');
    j.tenureClock = { papers: 0, grants: 0, focus: null };
    j.yearsInLevel = 3;
    t.state.science.papers = 7;
    const normal = tenureOdds(t.state, j);
    t.engine.dispatch('higherEd.earlyTenure');
    assert.ok(j.tenureClock.early);
    assert.ok(tenureOdds(t.state, j) < normal, 'early cases face a higher bar');
  },

  'publish or perish: venues, the review pipeline, predatory journals and non-renewal'() {
    const { engine, state, ctx } = setup(10, 35, { bachelor: true });
    state.education.degrees.push({ type: 'doctorate', programId: 'phd', major: 'biology', schoolId: 'state', gpa: 3.8, year: 29 });
    const j = job(ctx, state, 'research', 'staff');
    engine.dispatch('publishing.submit', 'field');
    assert.equal(state.science.pipeline.length, 1, 'under review');
    engine.dispatch('publishing.submit', 'predatory');
    assert.equal(state.science.predatory, 1, 'predatory "acceptance" is instant');
    state.character.age += 1;
    PublishingModule.onAgeUp(ctx);
    assert.equal(state.science.pipeline.length, 0, 'decision made');
    // Years of silence at a research institute.
    j.yearsAtEmployer = 5;
    const start = state.science.papers;
    for (let i = 0; i < 6 && state.career.job; i++) {
      state.character.age += 1;
      state.career.job && (state.career.job.paidThisYear = true);
      PublishingModule.onAgeUp(ctx);
    }
    assert.equal(state.science.papers, start);
    assert.equal(recentOutput(state), 0);
    assert.equal(state.career.job, null, 'contract not renewed');
    assert.match(state.career.history.at(-1).reason, /publication/);
    const view = VIEWS.career(state, {});
    assert.ok(typeof view === 'string');
  },

  'adjunct teaching pays by the course; a retention offer raises your salary'() {
    const { engine, state, ctx } = setup(11, 30, { bachelor: true });
    state.education.degrees.push({ type: 'master', programId: 'master', major: 'history', schoolId: 'state', gpa: 3.6, year: 26 });
    const cash = state.finances.cash;
    engine.dispatch('higherEd.adjunct', '2');
    assert.equal(state.finances.cash, cash + 7000);
    assert.equal(state.higherEd.adjunctCourses, 2);

    const t = setup(12, 40, { bachelor: true });
    t.state.education.degrees.push({ type: 'doctorate', programId: 'phd', major: 'biology', schoolId: 'state', gpa: 3.8, year: 29 });
    const j = job(t.ctx, t.state, 'college', 'associate');
    j.performance = 95;
    t.state.science.hIndex = 30;
    const salary = j.salary;
    let raised = false;
    for (let i = 0; i < 10 && !raised; i++) {
      AcademiaModule.resolvers.offers(t.ctx, { offers: ['r1'] }, 'leverage');
      raised = t.state.career.job.salary > salary;
    }
    assert.ok(raised, 'retention raise');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} higher-ed test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} higher-ed tests passed`);
