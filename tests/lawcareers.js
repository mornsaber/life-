/**
 * The law as a career: the LSAT, law school (rank, law review, interviews,
 * offers), practice areas and case puzzles, billables, the partnership vote,
 * barristers and silk — plus professional ranks and training by country.
 *
 *   node tests/lawcareers.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { ADMISSION_HOOKS } from '../src/modules/education/EducationEngine.js';
import { MATTERS, KIND_OPTIONS, AREAS, playMatter, matterPrompt, resolveMatter, partnerOdds } from '../src/modules/law/LegalPractice.js';
import { PROFESSION_TITLES, MEDICAL_SYSTEMS, LAW_SYSTEMS, academicSystem } from '../src/modules/world/ProfessionStandards.js';
import { COUNTRIES } from '../src/modules/world/Countries.js';
import { setCurrentCountry } from '../src/core/Locale.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life({ countryId, seed = 3, age = 24 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife(countryId ? { countryId } : {});
  state.character.age = age;
  Object.assign(state.stats, { smarts: 80, health: 95, stress: 20 });
  state.prompts = [];
  state.legal.record = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'politicalScience', year: 22, schoolId: 'state', gpa: 3.6 });
  return { engine, state, ctx: engine.context() };
}
function lawyer(professionId = 'law', { countryId, seed = 5, levelId } = {}) {
  const l = life({ countryId, seed, age: 27 });
  l.state.education.degrees.push({ type: 'professional', programId: 'jd', year: 26, schoolId: 'state' });
  l.state.credentials.held.barLicense = { earnedAge: 26, renewedAge: 26, status: 'active', states: [] };
  const p = getProfession(professionId);
  const job = hire(l.ctx, { professionId, levelId: levelId ?? (p.levels.find((x) => x.entry) ?? p.levels[1]).id, employer: createEmployer(new Random(2), l.state, p, l.state.character.regionId) });
  l.state.prompts = [];
  return { ...l, job };
}
const blocked = (state, programId) => ADMISSION_HOOKS.map((h) => h.eligibility?.(state, programId)).find(Boolean) ?? null;

const tests = {
  'law school wants an LSAT in the US, not where law is a first degree'() {
    const us = life();
    assert.match(blocked(us.state, 'jd'), /LSAT/);
    us.engine.dispatch('lawLife.lsat', 'prep');
    assert.ok(us.state.law.lsat >= 120 && us.state.law.lsat <= 180);
    assert.equal(blocked(us.state, 'jd'), null);
    const gb = life({ countryId: 'GB' });
    assert.equal(blocked(gb.state, 'jd'), null, 'no LSAT for an LLB');
  },

  'law school: class rank, law review, interviews and an offer'() {
    const { engine, state, ctx } = life({ seed: 8 });
    state.stats.smarts = 99;
    state.education.enrolled = { programId: 'jd', schoolId: 'elite', progress: 0, totalYears: 3 };
    MODULES.find((m) => m.id === 'lawSchool').onAgeUp(ctx);
    assert.ok(state.law.school.rank != null, 'a class rank after 1L');
    state.education.enrolled.progress = 1;
    MODULES.find((m) => m.id === 'lawSchool').onAgeUp(ctx);
    const oci = state.prompts.find((p) => p.type === 'lawLife.oci');
    assert.ok(oci, 'on-campus interviews');
    engine.resolvePrompt(oci.id, 'midsize');
    assert.equal(state.law.offer, 'midsize');
    state.education.enrolled = null;
    ctx.emit('education:graduated', { degree: { programId: 'jd', type: 'professional' } });
    const offer = state.prompts.find((p) => p.type === 'lawLife.offer');
    assert.ok(offer, 'the summer firm makes an offer');
    engine.resolvePrompt(offer.id, 'accept');
    assert.equal(state.career.job?.professionId, 'law');
  },

  'every matter is well-formed and every call resolves'() {
    const { state } = lawyer();
    const rng = new Random(1);
    for (const m of MATTERS) {
      assert.ok(KIND_OPTIONS[m.kind], m.id);
      assert.ok(m.strength >= 0 && m.strength <= 1, m.id);
      for (const o of KIND_OPTIONS[m.kind]) {
        const out = playMatter(state, m, o.id, rng);
        assert.ok(['win', 'loss', 'settle'].includes(out.result) && out.note, `${m.id}.${o.id}`);
      }
    }
    for (const area of [...Object.keys(AREAS), 'prosecution']) assert.ok(MATTERS.filter((m) => m.areas.includes(area)).length >= 3, `${area} has matters`);
  },

  'reading the facts pays: strong cases win at trial, weak ones are better settled'() {
    const { state } = lawyer();
    const strong = MATTERS.find((m) => m.id === 'crash');
    const weak = MATTERS.find((m) => m.id === 'slip');
    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < 200; i++) {
      const rng = new Random(i + 1);
      if (playMatter(state, strong, 'trial', rng).result === 'win') strongWins += 1;
      if (playMatter(state, weak, 'trial', new Random(i + 500)).result === 'win') weakWins += 1;
    }
    assert.ok(strongWins > 150, `strong case wins ${strongWins}/200`);
    assert.ok(weakWins < 110, `weak case wins ${weakWins}/200`);
    // A prosecutor declining a shaky case is the right call.
    assert.equal(playMatter(state, MATTERS.find((m) => m.id === 'shaky'), 'dismiss', new Random(2)).result, 'win');
  },

  'practice: choose an area, then matters land on your desk'() {
    const { engine, state, ctx } = lawyer('law', { seed: 9 });
    state.career.job.paidThisYear = true;
    MODULES.find((m) => m.id === 'lawLife').onAgeUp(ctx);
    const area = state.prompts.find((p) => p.type === 'lawLife.area');
    assert.ok(area, 'pick a practice area');
    engine.resolvePrompt(area.id, 'injury');
    assert.equal(state.law.area, 'injury');
    const p = matterPrompt(ctx);
    assert.ok(p);
    const before = state.law.wins + state.law.losses + state.law.settled;
    resolveMatter(ctx, p.data, 'trial');
    assert.equal(state.law.wins + state.law.losses + state.law.settled, before + 1);
    const html = VIEWS.career(state);
    assert.match(html, /Your Practice/);
    assert.ok(!/NaN|undefined/.test(html));
  },

  'prosecutors and public defenders get their own dockets'() {
    for (const id of ['prosecution', 'publicDefender']) {
      const { state, ctx } = lawyer(id, { seed: 11 });
      const p = matterPrompt(ctx);
      assert.ok(p, id);
      const m = MATTERS.find((x) => x.id === p.data.matterId);
      assert.equal(m.kind, id === 'prosecution' ? 'prosecution' : 'defense');
      void state;
    }
  },

  'up or out: the partnership vote'() {
    const { engine, state, ctx } = lawyer('law', { seed: 12, levelId: 'senior' });
    state.career.job.employer.size = 'large';
    state.career.job.yearsAtEmployer = 8;
    Object.assign(state.law, { area: 'corporate', reputation: 95, book: 3_000_000, hours: 2400 });
    state.career.job.performance = 95;
    assert.ok(partnerOdds(state) > 0.6);
    state.career.job.paidThisYear = true;
    MODULES.find((m) => m.id === 'lawLife').onAgeUp(ctx);
    const vote = state.prompts.find((p) => p.type === 'lawLife.partner');
    assert.ok(vote, 'a partnership vote');
    engine.resolvePrompt(vote.id, 'counsel');
    assert.equal(state.career.job.levelId, 'counsel');
  },

  'split professions: barristers in chambers, and silk'() {
    const { engine, state, ctx } = lawyer('law', { countryId: 'GB', seed: 13 });
    state.career.job.paidThisYear = true;
    MODULES.find((m) => m.id === 'lawLife').onAgeUp(ctx);
    const area = state.prompts.find((p) => p.type === 'lawLife.area');
    assert.ok(area.options.some((o) => o.id === 'chambers'), 'the bar is an option in England');
    engine.resolvePrompt(area.id, 'chambers');
    assert.ok(state.law.chambers);
    assert.match(state.career.job.title, /Barrister/);
    assert.equal(LAW_SYSTEMS.GB.silk, 'King\'s Counsel (KC)');
  },

  'every country has local ranks for doctors, lawyers and academics, and a way to train doctors'() {
    for (const cc of Object.keys(COUNTRIES).filter((c) => c !== 'US')) {
      const t = PROFESSION_TITLES[cc];
      assert.ok(t?.medical?.attending && t?.law?.associate && t?.university?.professor, `${cc} titles`);
      assert.ok(MEDICAL_SYSTEMS[cc]?.allocation?.name, `${cc} medical system`);
      setCurrentCountry(cc);
      assert.equal(getProfession('medical').levels.find((l) => l.id === 'attending').title, t.medical.attending);
    }
    setCurrentCountry('US');
    assert.equal(getProfession('medical').levels.find((l) => l.id === 'attending').title, 'Attending Physician');
    assert.equal(academicSystem('GB').clock, 3);
  },

  'foundation years come before specialty training where the system has them'() {
    const { state, engine } = life({ countryId: 'GB', seed: 15, age: 24 });
    state.education.degrees.push({ type: 'professional', programId: 'md', year: 23, schoolId: 'state' });
    const p = getProfession('medical');
    hire(engine.context(), { professionId: 'medical', levelId: 'resident', employer: createEmployer(new Random(2), state, p, state.character.regionId) });
    assert.equal(state.medicine.foundationLeft, 2);
    assert.match(state.career.job.title, /Foundation/);
    assert.ok(!state.prompts.some((x) => x.type === 'medicine.match'), 'no specialty choice yet');
    for (let y = 0; y < 2; y++) {
      state.prompts = [];
      state.stats.health = 95;
      engine.ageUp();
    }
    assert.ok(state.medicine.foundationDone);
    assert.ok(state.prompts.some((x) => x.type === 'medicine.match') || state.medicine.specialty, 'specialty selection after foundation');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} law-career test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} law-career tests passed`);
