/**
 * Clinical careers: settings, shifts, the clinical ladder, continuing
 * education, events, loan repayment, burnout and the bridges.
 *
 *   node tests/clinical.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { grantCredential } from '../src/modules/credentials/LicensingEngine.js';
import { scopeOfType } from '../src/core/PromptScope.js';
import { ClinicalModule, CLINICAL, clinicalPayAdjust, ladderCheck, settingEligibility } from '../src/modules/clinical/ClinicalLife.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { programYears, admissionChance } from '../src/modules/education/EducationEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed, creds, degrees = []) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Clin', lastName: 'Test' });
  state.character.age = 26;
  Object.assign(state.stats, { smarts: 75, health: 95, happiness: 60, stress: 20 });
  state.legal.record = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, ...degrees);
  const ctx = engine.context();
  for (const c of creds) grantCredential(ctx, c, { silent: true });
  return { engine, state, ctx };
}
function work(ctx, state, professionId, levelId) {
  const employer = createEmployer(ctx.rng, state, getProfession(professionId), state.character.regionId);
  return hire(ctx, { professionId, levelId, employer });
}
const tick = (ctx, state) => { if (state.career.job) { state.career.job.paidThisYear = true; state.career.job.yearsAtEmployer += 1; } state.character.age += 1; state.yearly = {}; ClinicalModule.onAgeUp(ctx); };
const resolveAll = (engine, state) => {
  for (const p of state.prompts.filter((x) => x.type.startsWith('clinical.'))) engine.resolvePrompt(p.id, p.options.find((o) => !o.disabled && o.tone !== 'danger').id);
};
const BSN = { type: 'bachelor', programId: 'bachelor', major: 'nursing', schoolId: 'state', gpa: 3.5, year: 22 };

const tests = {
  'a new nurse picks a unit; specialty units want experience; pay follows unit and shift'() {
    const { engine, state, ctx } = setup(1, ['rn'], [BSN]);
    assert.ok(work(ctx, state, 'nursing', 'rn'));
    const p = state.prompts.find((x) => x.type === 'clinical.setup');
    assert.ok(p, 'asked which unit');
    assert.equal(scopeOfType('clinical.setup'), 'job');
    assert.ok(p.options.find((o) => o.id === 'icu').disabled, 'ICU wants a year first');
    engine.resolvePrompt(p.id, 'medSurg');
    assert.equal(state.clinical.setting, 'medSurg');
    const day = state.career.job.salary;
    engine.dispatch('clinical.shift', 'nights');
    assert.ok(state.career.job.salary > day, 'night differential');
    tick(ctx, state);
    state.prompts = [];
    assert.ok(settingEligibility(state, 'icu').ok);
    engine.dispatch('clinical.setting', 'icu');
    assert.equal(state.clinical.setting, 'icu');
    grantCredential(ctx, 'ccrn', { silent: true });
    const before = clinicalPayAdjust(state);
    state.clinical.setting = 'school';
    assert.ok(clinicalPayAdjust(state) < before, 'school nurses earn less');
    engine.dispatch('clinical.shift', 'rotating');
  },

  'the clinical ladder: points, years, a board and a BSN'() {
    const { engine, state, ctx } = setup(2, ['rn'], [{ type: 'associate', programId: 'associate', major: 'nursing', schoolId: 'community', gpa: 3.4, year: 20 }]);
    work(ctx, state, 'nursing', 'rn');
    state.clinical.setting = 'icu';
    assert.match(ladderCheck(state).reason, /years|points/);
    for (let i = 0; i < 7; i++) {
      state.prompts = [];
      engine.dispatch('clinical.ce');
      engine.dispatch('clinical.committee');
      engine.dispatch('clinical.project');
      engine.dispatch('clinical.precept');
      if (ladderCheck(state).ok) engine.dispatch('clinical.ladder');
      if (i === 2) grantCredential(ctx, 'ccrn', { silent: true });
      tick(ctx, state);
      resolveAll(engine, state);
    }
    assert.ok(state.clinical.ladder >= 3, `ladder ${state.clinical.ladder}`);
    if (state.clinical.ladder === 3) assert.match(ladderCheck(state).reason ?? '', /BSN|years|points/);
    assert.equal(state.credentials.held.rn.status, 'active', 'kept up CE');
    const html = VIEWS.career(state, {});
    assert.match(html, /Clinical Practice/);
    assert.ok(!/NaN|undefined/.test(html));
  },

  'skipping CE gets the license suspended'() {
    const { state, ctx } = setup(3, ['rrt']);
    work(ctx, state, 'respiratoryTherapy', 'rt');
    state.clinical.setting = 'adultIcu';
    for (let i = 0; i < 3; i++) { state.prompts = []; tick(ctx, state); }
    assert.notEqual(state.credentials.held.rrt.status, 'active');
  },

  'every clinical profession runs a decade of events cleanly'() {
    const jobs = [['nursing', 'rn', ['rn']], ['pharmacy', 'pharmacist', ['pharmacistLicense']], ['physicianAssistant', 'pa', ['paLicense']], ['physicalTherapy', 'pt', ['ptLicense']], ['occupationalTherapy', 'ot', ['otLicense']], ['speechPathology', 'slp', ['cccSlp']], ['respiratoryTherapy', 'rt', ['rrt']], ['imaging', 'xray', ['arrt']], ['dentalHygiene', 'hygienist', ['rdh']], ['dentistry', 'associate', ['dentalLicense']], ['travelNursing', 'travel', ['rn']]];
    for (const [i, [prof, level, creds]] of jobs.entries()) {
      const { engine, state, ctx } = setup(10 + i, creds, [BSN]);
      const job = work(ctx, state, prof, level);
      assert.ok(job, `hired: ${prof}`);
      const settings = Object.keys(CLINICAL[prof].settings);
      for (let y = 0; y < 10 && state.career.job; y++) {
        state.prompts = [];
        state.clinical.setting ??= settings[0];
        if (y % 2 === 0) engine.dispatch('clinical.ce');
        if (y === 3) engine.dispatch('clinical.setting', settings[settings.length - 1]);
        tick(ctx, state);
        resolveAll(engine, state);
      }
      assert.ok(state.clinical.patients > 0, `${prof} saw patients`);
      const html = VIEWS.career(state, {});
      assert.ok(!/NaN|undefined/.test(html), `${prof} card renders`);
    }
  },

  'community health centers repay loans; productivity quotas can turn into fraud'() {
    const { engine, state, ctx } = setup(30, ['ptLicense']);
    work(ctx, state, 'physicalTherapy', 'pt');
    state.clinical.setting = 'school';
    state.finances.loans = 40000;
    const pa = setup(31, ['paLicense']);
    work(pa.ctx, pa.state, 'physicianAssistant', 'pa');
    pa.state.clinical.setting = 'fqhc';
    pa.state.finances.loans = 40000;
    tick(pa.ctx, pa.state);
    assert.equal(pa.state.finances.loans, 15000, 'NHSC repaid $25,000');
    state.clinical.setting = 'snf';
    let fraud = false;
    for (let i = 0; i < 40 && !fraud; i++) {
      state.prompts = [];
      ctx.prompt({ type: 'clinical.event', title: 'x', text: 'x', options: [{ id: 'comply', label: 'x' }], data: { group: 'therapy', eventId: 'productivity' } });
      engine.resolvePrompt(state.prompts.at(-1).id, 'comply');
      fraud = state.legal.record.some((r) => r.offenseId === 'healthcareFraud') || (state.legal.cases ?? []).length > 0 || state.prompts.some((p) => p.type.startsWith('legal.'));
    }
    assert.ok(fraud, 'billing fraud catches up with you');
  },

  'bridges: RN-to-BSN is a year; ICU years help CRNA admission'() {
    const { state, ctx } = setup(40, ['rn'], [{ type: 'associate', programId: 'associate', major: 'nursing', schoolId: 'community', gpa: 3.4, year: 20 }]);
    work(ctx, state, 'nursing', 'rn');
    assert.equal(programYears(state, 'bachelor', 'nursing'), 1, 'RN-to-BSN');
    state.education.degrees.push(BSN);
    state.stats.smarts = 55;
    const fresh = admissionChance(state, 'crnaProgram', 'state');
    state.career.job.yearsAtEmployer = 4;
    grantCredential(ctx, 'ccrn', { silent: true });
    assert.ok(admissionChance(state, 'crnaProgram', 'state') > fresh, 'ICU experience helps');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} clinical test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} clinical tests passed`);
