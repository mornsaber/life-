/**
 * Medicine end to end: the MCAT and pre-med experience, medical school
 * (Step 1, clerkships, Step 2 CK, away rotations), the Match, residency and
 * the practice years (setting, partnership, burnout, recertification).
 *
 *   node tests/medlife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, leaveJob } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { matchOdds, practiceMultiplier } from '../src/modules/career/Medicine.js';
import { enrollmentEligibility, admissionChance } from '../src/modules/education/EducationEngine.js';
import { MedLifeModule } from '../src/modules/medicine/MedicalLife.js';
import { emeritusEligibility } from '../src/modules/career/Emeritus.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed = 3, age = 22) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Med', lastName: 'Test' });
  state.character.age = age;
  Object.assign(state.stats, { smarts: 92, health: 95, happiness: 70, stress: 20 });
  state.legal.record = [];
  state.finances.cash = 50000;
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'biology', schoolId: 'state', gpa: 3.8, year: 22 });
  return { engine, state, ctx: engine.context() };
}
function answer(engine, choose = {}) {
  for (let i = 0; i < 12 && engine.state.prompts.length; i++) {
    const p = engine.state.prompts[0];
    const pick = choose[p.type]?.(p) ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0];
    engine.resolvePrompt(p.id, typeof pick === 'string' ? pick : pick.id);
  }
}
const year = (engine, choose) => { answer(engine, choose); engine.state.prompts = []; engine.ageUp(); answer(engine, choose); };
function doctor(ctx, state, levelId = 'attending') {
  const p = getProfession('medical');
  return hire(ctx, { professionId: 'medical', levelId, employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
}

const tests = {
  'medical school needs the MCAT; scores and clinical experience move the odds'() {
    const { engine, state } = setup(1);
    state.stats.smarts = 74; // a borderline applicant, where experience matters
    assert.match(enrollmentEligibility(state, 'md', 'state', null).reason, /MCAT/);
    engine.dispatch('medLife.takeMcat', 'prep');
    assert.ok(state.medicine.mcat >= 472 && state.medicine.mcat <= 528, `score ${state.medicine.mcat}`);
    assert.ok(enrollmentEligibility(state, 'md', 'state', null).ok);
    const before = admissionChance(state, 'md', 'state');
    state.yearly = {};
    engine.dispatch('medLife.premed', 'clinical');
    assert.ok(admissionChance(state, 'md', 'state') > before, 'clinical hours help');
    state.character.age += 4;
    assert.match(enrollmentEligibility(state, 'md', 'state', null).reason, /expired/);
  },

  'medical school: Step 1, clerkship honors, a specialty, Step 2 CK and aways — then Match odds read the record'() {
    const { engine, state } = setup(2);
    engine.dispatch('medLife.takeMcat', 'prep');
    for (let i = 0; i < 30 && !state.education.enrolled; i++) { state.yearly = {}; engine.dispatch('education.enroll', 'md:state::full'); }
    assert.equal(state.education.enrolled?.programId, 'md', 'admitted');
    const choose = { 'medLife.step1': () => 'dedicated', 'medLife.step2': () => 'hard', 'medLife.interest': () => 'dermatology', 'medLife.aways': () => 'two' };
    for (let i = 0; i < 7 && state.education.enrolled?.programId === 'md'; i++) year(engine, choose);
    const rec = state.medicine.schoolRecord;
    assert.ok(state.education.degrees.some((d) => d.programId === 'md'), 'M.D. earned');
    assert.ok(rec && rec.step2 >= 214 && rec.rotations === 7 && rec.interest === 'dermatology' && rec.aways === 2, JSON.stringify(rec));
    const derm = matchOdds(state, 'dermatology');
    state.medicine.schoolRecord = { ...rec, step2: 225, honors: 0, aways: 0 };
    assert.ok(matchOdds(state, 'dermatology') < derm, 'a weaker application has worse odds');
  },

  'failing Step 1 twice ends medical school'() {
    const { engine, state } = setup(4);
    engine.dispatch('medLife.takeMcat', 'prep');
    for (let i = 0; i < 30 && !state.education.enrolled; i++) { state.yearly = {}; engine.dispatch('education.enroll', 'md:state::full'); }
    const ctx = engine.context();
    const chance = ctx.rng.chance;
    ctx.rng.chance = () => false;
    MedLifeModule.resolvers.step1(ctx, {}, 'normal');
    assert.equal(state.medicine.school.step1, 'fail');
    MedLifeModule.resolvers.step1(ctx, {}, 'normal');
    ctx.rng.chance = chance;
    assert.equal(state.education.enrolled, null, 'dismissed');
    assert.ok(!state.education.degrees.some((d) => d.programId === 'md'));
  },

  'practice: choose a setting; private practice offers partnership; part-time pays less; burnout and recertification'() {
    const { engine, state, ctx } = setup(5, 34);
    state.education.degrees.push({ type: 'professional', programId: 'md', schoolId: 'state', gpa: 3.7, year: 26 });
    Object.assign(state.medicine, { specialty: 'internalMedicine' });
    const job = doctor(ctx, state);
    job.paidThisYear = true;
    MedLifeModule.onAgeUp(ctx);
    const p = state.prompts.find((x) => x.type === 'medLife.practice');
    assert.ok(p, 'practice setting prompt');
    engine.resolvePrompt(p.id, 'private');
    assert.equal(state.medicine.practice, 'private');
    assert.equal(practiceMultiplier(state), 0.9);
    state.character.age += 3;
    state.prompts = [];
    job.paidThisYear = true;
    MedLifeModule.onAgeUp(ctx);
    const partner = state.prompts.find((x) => x.type === 'medLife.partner');
    assert.ok(partner, 'partnership offered after three years');
    engine.resolvePrompt(partner.id, 'buy');
    assert.ok(state.medicine.partner);
    assert.equal(practiceMultiplier(state), 1.2);
    state.prompts = [];
    engine.dispatch('medLife.partTime');
    assert.ok(Math.abs(practiceMultiplier(state) - 1.2 * 0.7) < 1e-9, 'part-time');
    // Burnout comes due.
    state.medicine.burnout = 95;
    for (let i = 0; i < 10 && !state.prompts.some((x) => x.type === 'medLife.burnout'); i++) { state.prompts = []; job.paidThisYear = true; MedLifeModule.onAgeUp(ctx); }
    assert.ok(state.prompts.some((x) => x.type === 'medLife.burnout'), 'burnout prompt');
    const view = VIEWS.career(state, {});
    assert.match(view, /Your Practice/);
    // Fired: the practice decisions disappear.
    leaveJob(ctx, 'Terminated', { fired: true });
    engine.resolvePrompt(state.prompts.find((x) => x.type === 'medLife.burnout')?.id ?? 'none', 'push');
    assert.ok(!state.prompts.some((x) => x.type === 'medLife.burnout'), 'stale practice prompt dropped');
  },

  'academic physicians can retire emeritus; residents can moonlight once licensed'() {
    const { state, ctx, engine } = setup(6, 60);
    state.education.degrees.push({ type: 'professional', programId: 'md', schoolId: 'elite', gpa: 3.8, year: 26 });
    Object.assign(state.medicine, { specialty: 'internalMedicine', practice: 'academic', practiceAge: 40 });
    const job = doctor(ctx, state, 'senior');
    job.yearsAtEmployer = 15;
    assert.match(emeritusEligibility(state).title, /Professor of Medicine Emerit/);
    state.medicine.practice = 'employed';
    assert.equal(emeritusEligibility(state).ok, false);

    const r = setup(7, 28);
    r.state.education.degrees.push({ type: 'professional', programId: 'md', schoolId: 'state', gpa: 3.6, year: 26 });
    doctor(r.ctx, r.state, 'resident');
    r.state.prompts = [];
    const cash = r.state.finances.cash;
    r.engine.dispatch('medLife.moonlight');
    assert.equal(r.state.finances.cash, cash, 'not without a license');
    r.state.credentials.held.medicalLicense = { status: 'active', earnedAge: 27 };
    r.state.yearly = {};
    r.engine.dispatch('medLife.moonlight');
    assert.ok(r.state.finances.cash > cash, 'moonlighting pays');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 5).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} medicine test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} medicine tests passed`);
