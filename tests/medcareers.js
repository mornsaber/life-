/**
 * Medicine, more inclusive and more fun: D.O. and offshore M.D. routes,
 * new specialties and fellowships, case files (diagnosis puzzles) and
 * medicine beyond the day job.
 *
 *   node tests/medcareers.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, meetsEducation, medicalDegree } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { PROGRAMS } from '../src/modules/education/Catalog.js';
import { enrollmentEligibility as enrollEligibility } from '../src/modules/education/EducationEngine.js';
import { ADMISSION_HOOKS } from '../src/modules/education/EducationEngine.js';
import { SPECIALTIES, FELLOWSHIPS, matchOdds } from '../src/modules/career/Medicine.js';
import { CASES, casePool, casePrompt, resolveCase, casesOf } from '../src/modules/medicine/CaseFiles.js';
import { checkRequirements } from '../src/modules/credentials/LicensingEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life({ countryId, seed = 3, age = 24 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife(countryId ? { countryId } : {});
  state.character.age = age;
  Object.assign(state.stats, { smarts: 80, health: 95, stress: 20 });
  state.prompts = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'biology', year: 22, schoolId: 'state', gpa: 3.5 });
  return { engine, state, ctx: engine.context() };
}
const boost = (state, programId) => ADMISSION_HOOKS.reduce((s, h) => s + (h.boost?.(state, programId) ?? 0), 0);
const blocked = (state, programId) => ADMISSION_HOOKS.map((h) => h.eligibility?.(state, programId)).find(Boolean) ?? null;

function doctor(specialty = 'emergencyMedicine', degree = 'md', seed = 5) {
  const { engine, state, ctx } = life({ seed, age: 28 });
  state.education.degrees.push({ type: 'professional', programId: degree, year: 27, schoolId: 'state', gpa: 3.5 });
  state.medicine.specialty = specialty;
  const p = getProfession('medical');
  const job = hire(ctx, { professionId: 'medical', levelId: 'resident', employer: createEmployer(new Random(2), state, p, state.character.regionId) });
  state.prompts = [];
  return { engine, state, ctx, job };
}

const tests = {
  'more ways into medicine: D.O. and offshore M.D. programs'() {
    assert.ok(PROGRAMS.do && PROGRAMS.imd);
    assert.ok(PROGRAMS.do.minSmarts < PROGRAMS.md.minSmarts && PROGRAMS.imd.minSmarts < PROGRAMS.do.minSmarts);
    // A D.O. or international M.D. is a physician's degree everywhere an M.D. is asked for.
    const { state } = life();
    state.education.degrees.push({ type: 'professional', programId: 'do', year: 27 });
    assert.ok(meetsEducation(state, { program: 'md' }));
    assert.equal(medicalDegree(state).programId, 'do');
    assert.ok(!checkRequirements(state, { education: { program: 'md' } }).missing?.length);
    // Osteopathic medicine is American; offshore schools take students from anywhere.
    const gb = life({ countryId: 'GB' });
    assert.match(enrollEligibility(gb.state, 'do', 'state').reason ?? '', /Not offered/);
  },

  'osteopathic schools admit at lower scores; offshore schools take almost anyone'() {
    const { state } = life();
    assert.match(blocked(state, 'do'), /MCAT/);
    assert.match(blocked(state, 'imd'), /MCAT/);
    state.medicine.mcat = 500;
    state.medicine.mcatAge = state.character.age;
    state.medicine.premed = { clinical: 2, research: 0, shadow: 1 };
    assert.ok(boost(state, 'do') > boost(state, 'md'), 'a 500 MCAT goes further at a D.O. school');
    assert.ok(boost(state, 'imd') > boost(state, 'do'));
    // An old score is fine offshore.
    state.medicine.mcatAge = state.character.age - 6;
    assert.match(blocked(state, 'md'), /expired/);
    assert.equal(blocked(state, 'imd'), null);
  },

  'D.O. students go through medical school and graduate as D.O.s'() {
    const { engine, state, ctx } = life();
    ctx.emit('education:enrolled', { programId: 'do', schoolId: 'state' });
    assert.ok(state.medicine.school, 'school record started');
    state.medicine.school.step2 = 240;
    ctx.emit('education:graduated', { degree: { programId: 'do', type: 'professional' } });
    const text = state.log.flatMap((b) => b.entries ?? []).map((e) => e.text).join(' ');
    assert.match(text, /D\.O\./);
    assert.ok(state.medicine.schoolRecord);
    void engine;
  },

  'the Match weighs the route: M.D. > D.O. > international, most in competitive fields'() {
    const odds = (degree, sp) => {
      const { state } = life();
      state.education.degrees.push({ type: 'professional', programId: degree, year: 27, schoolId: 'state' });
      state.medicine.schoolRecord = { step2: 245, honors: 3, pubs: 1, interest: sp, aways: 1 };
      return matchOdds(state, sp);
    };
    assert.ok(odds('md', 'dermatology') > odds('do', 'dermatology'));
    assert.ok(odds('do', 'dermatology') > odds('imd', 'dermatology'));
    assert.ok(odds('md', 'familyMedicine') - odds('do', 'familyMedicine') < 0.05, 'primary care is open to D.O.s');
    assert.ok(odds('imd', 'familyMedicine') >= 0.5, 'IMGs can still match into primary care');
  },

  'new specialties and fellowships hang together'() {
    for (const id of ['pmr', 'ophthalmology', 'ent', 'urology', 'plastics', 'radOnc']) assert.ok(SPECIALTIES[id], id);
    for (const [id, f] of Object.entries(FELLOWSHIPS)) for (const from of f.from) assert.ok(SPECIALTIES[from], `${id} ← ${from}`);
    assert.ok(Object.keys(FELLOWSHIPS).length >= 25);
  },

  'every specialty sees cases, and every case is well-formed'() {
    for (const c of CASES) {
      assert.equal(c.wrong.length, 2, c.id);
      assert.ok(!c.wrong.includes(c.answer), c.id);
      assert.ok(c.text.length > 40, c.id);
    }
    assert.equal(new Set(CASES.map((c) => c.id)).size, CASES.length, 'unique ids');
    for (const sp of Object.keys(SPECIALTIES)) {
      const { state } = life();
      state.medicine.specialty = sp;
      state.career.job = { professionId: 'medical', levelId: 'attending' };
      assert.ok(casePool(state).length >= 3, `${sp}: ${casePool(state).length} cases`);
    }
  },

  'case files: call it right, miss it, or order tests'() {
    const { state, ctx } = doctor('pediatrics');
    const p = casePrompt(ctx) ?? state.prompts.find((x) => x.type === 'caseFiles.case');
    assert.ok(p, 'a case');
    assert.equal(p.options.length, 4);
    const kase = CASES.find((c) => c.id === p.data.caseId);
    const right = p.data.choices.indexOf(kase.answer);
    assert.equal(resolveCase(ctx, p.data, `dx${right}`), 'solved');
    const c = casesOf(state);
    assert.equal(c.solved, 1);
    assert.equal(c.saved, kase.critical ? 1 : 0);
    const wrong = p.data.choices.findIndex((x) => x !== kase.answer);
    assert.equal(resolveCase(ctx, p.data, `dx${wrong}`), 'missed');
    assert.equal(c.streak, 0);
    assert.equal(resolveCase(ctx, p.data, 'tests'), 'tested');
    assert.equal(c.tested, 1);
  },

  'clinicians get cases most years, from their own field'() {
    const { engine, state } = doctor('emergencyMedicine', 'do', 9);
    const seen = [];
    for (let y = 0; y < 6 && state.career.job; y++) {
      state.prompts = [];
      state.stats.health = 95;
      engine.ageUp();
      for (const p of state.prompts.filter((x) => x.type === 'caseFiles.case')) seen.push(p.data.caseId);
    }
    assert.ok(seen.length >= 2, `cases seen: ${seen.length}`);
    const pool = new Set(casePool(state).map((c) => c.id));
    for (const id of seen) assert.ok(pool.has(id), `${id} is an emergency case`);
  },

  'beyond the day job: free clinic, missions, media — and a case files card'() {
    const { engine, state } = doctor('familyMedicine');
    state.career.job.performance = 80;
    engine.dispatch('caseFiles.freeClinic');
    state.prompts = [];
    engine.dispatch('caseFiles.mission');
    assert.ok(casesOf(state).saved >= 2, 'a mission saves lives');
    assert.ok(state.yearly['caseFiles.freeClinic']);
    const html = VIEWS.career(state);
    assert.match(html, /Case Files/);
    assert.ok(!/NaN|undefined/.test(html));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} medical-career test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} medical-career tests passed`);
