/**
 * Universities: the catalogue, admission odds, the application season, moving (and
 * student visas) to attend, fees by university and residency, and degree lengths abroad.
 *
 *   node tests/universities.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { UNIVERSITIES, universitiesIn, universitiesFor, offers, universityOf } from '../src/modules/education/Universities.js';
import { PROGRAMS } from '../src/modules/education/Catalog.js';
import { admissionChance, annualTuition, enrollmentEligibility, programYears } from '../src/modules/education/EducationEngine.js';
import { COUNTRIES } from '../src/modules/world/Countries.js';
import { REGIONS } from '../src/modules/life/Regions.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife(opts);
  state.legal.record = [];
  return { engine, state, ctx: engine.context() };
}
const graduateHS = (state, age = 18) => {
  state.character.age = age;
  if (!state.education.degrees.some((d) => d.type === 'highschool')) state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: age });
};
const nextYear = (engine, state) => { state.prompts = []; state.stats.health = 95; engine.ageUp(); };
const decide = (engine, state) => {
  for (const a of state.education.applications ?? []) a.age -= 1;
  const ctx = engine.context();
  state.prompts = [];
  MODULES.find((m) => m.id === 'education').onYearEnd({ ...ctx, rng: Object.assign(Object.create(Object.getPrototypeOf(ctx.rng)), ctx.rng, { chance: () => true }) });
};
const withLuck = (engine, fn) => { const rng = engine.context().rng; const c = rng.chance; rng.chance = () => true; try { fn(); } finally { rng.chance = c; } };

const tests = {
  'every university sits in a real city of its country, and every country has somewhere to study'() {
    for (const u of Object.values(UNIVERSITIES)) {
      if (!u.region) continue;
      assert.ok(REGIONS[u.region], `${u.id}: no city ${u.region}`);
      assert.equal(REGIONS[u.region].country ?? 'US', u.country, `${u.id} is in ${u.country}`);
    }
    for (const cc of Object.keys(COUNTRIES)) {
      const list = universitiesIn(cc);
      assert.ok(list.some((u) => offers(u, 'bachelor', 'history') || offers(u, 'bachelor', 'business')), `${cc}: a bachelor's somewhere`);
      assert.ok(list.some((u) => u.type === 'community' || u.type === 'technical'), `${cc}: a local college`);
    }
    assert.ok(Object.values(UNIVERSITIES).filter((u) => u.named).length >= 250, 'hundreds of named universities');
  },
  'specialist universities teach only their own fields'() {
    assert.ok(!offers(UNIVERSITIES.mit, 'bachelor', 'history'));
    assert.ok(offers(UNIVERSITIES.mit, 'bachelor', 'physics'));
    assert.ok(!offers(UNIVERSITIES.mit, 'md'));
    assert.ok(offers(UNIVERSITIES.harvard, 'md') && offers(UNIVERSITIES.harvard, 'jd'));
    assert.ok(!offers(UNIVERSITIES.reed, 'master', 'english'), 'a liberal-arts college is undergraduate');
    assert.ok(offers(UNIVERSITIES.ki, 'md') && !offers(UNIVERSITIES.ki, 'bachelor', 'history'));
    assert.ok(offers(UNIVERSITIES.sgu, 'imd') && !offers(UNIVERSITIES.harvard, 'imd'));
  },
  'odds follow selectivity and the applicant'() {
    const { state } = life({ countryId: 'US' });
    graduateHS(state);
    state.stats.smarts = 60;
    const harvard = admissionChance(state, 'bachelor', 'harvard');
    const weber = admissionChance(state, 'bachelor', 'weber');
    const ohio = admissionChance(state, 'bachelor', 'osu');
    assert.ok(harvard < 0.1, `Harvard ${harvard}`);
    assert.ok(ohio > harvard * 4 && weber >= 0.99);
    state.stats.smarts = 95;
    state.k12 = { gpa: 4.0 };
    assert.ok(admissionChance(state, 'bachelor', 'harvard') > 0.25, 'a top student has a real shot');
    assert.equal(admissionChance(state, 'associate', 'cc_midcity'), 1, 'community college is open admission');
  },
  'apply as a senior: the decision is instant; the offer you accept starts when school ends, and you move there'() {
    const { engine, state } = life({ countryId: 'US' }, 9);
    for (let i = 0; i < 17; i++) nextYear(engine, state);
    state.stats.smarts = 90;
    state.finances.cash = 20000;
    const home = state.character.regionId;
    const target = universitiesFor(state, 'bachelor', { abroad: false }).find((u) => u.region && u.region !== home && u.type === 'state' && !u.kind && u.accept < 0.9);
    assert.ok(enrollmentEligibility(state, 'bachelor', target.id, 'history', { applying: true }).ok);
    state.prompts = [];
    withLuck(engine, () => engine.dispatch('education.apply', `bachelor:${target.id}:history:full`));
    const q = state.prompts.find((p) => p.type === 'education.offers');
    assert.ok(q, 'the offer comes straight back');
    engine.resolvePrompt(q.id, 'accept');
    graduateHS(state, state.character.age);
    if (!state.education.enrolled) MODULES.find((m) => m.id === 'education').onYearEnd(engine.context());
    assert.equal(state.education.enrolled?.universityId, target.id);
    assert.equal(state.character.regionId, target.region, 'you moved there');
    assert.equal(state.education.applications.length, 0);
  },
  'a rejection is instant too'() {
    const { engine, state } = life({ countryId: 'US' }, 9);
    graduateHS(state);
    state.finances.cash = 20000;
    state.prompts = [];
    const rng = engine.context().rng;
    const c = rng.chance;
    rng.chance = () => false;
    engine.dispatch('education.apply', 'bachelor:harvard:history:full');
    rng.chance = c;
    assert.equal(state.education.applications[0]?.result, 'rejected');
    assert.ok(!state.prompts.some((p) => p.type === 'education.offers'));
  },
  'open-admission colleges take you straight away'() {
    const { engine, state } = life({ countryId: 'US' });
    graduateHS(state);
    state.prompts = [];
    engine.dispatch('education.apply', `associate:cc_${state.character.regionId}:business:full`);
    assert.equal(state.education.enrolled?.universityId, `cc_${state.character.regionId}`);
  },
  'studying abroad: a student visa, a move, international fees, a three-year English degree'() {
    const { engine, state } = life({ countryId: 'US' }, 13);
    graduateHS(state);
    state.stats.smarts = 95;
    state.finances.cash = 60000;
    const domestic = annualTuition('bachelor', 'oxford', { ...state, character: { ...state.character, countryId: 'GB', citizenships: ['GB'] } });
    assert.ok(annualTuition('bachelor', 'oxford', state) > domestic, 'overseas fees');
    state.prompts = [];
    withLuck(engine, () => engine.dispatch('education.apply', 'bachelor:oxford:history:full'));
    const q = state.prompts.find((p) => p.type === 'education.offers');
    withLuck(engine, () => engine.resolvePrompt(q.id, 'accept'));
    assert.equal(state.character.countryId, 'GB');
    assert.equal(state.character.regionId, 'oxford');
    assert.equal(state.migration.residences.GB?.visa, 'student');
    assert.equal(state.education.enrolled.totalYears, 3);
    assert.equal(programYears(state, 'bachelor', 'history', UNIVERSITIES.edinburgh), 4, 'Scottish degrees run four years');
  },
  'public universities charge out-of-state students more'() {
    const { state, ctx } = life({ countryId: 'US' });
    graduateHS(state);
    state.character.regionId = 'sunbelt';
    state.character.residencySince = 0;
    const inState = annualTuition('bachelor', 'utaustin', state);
    state.character.regionId = 'midcity';
    assert.ok(annualTuition('bachelor', 'utaustin', state) > inState * 2);
    assert.equal(annualTuition('bachelor', 'harvard', state), UNIVERSITIES.harvard.t);
    void ctx;
  },
  'graduating records the university, its prestige and country'() {
    const { engine, state } = life({ countryId: 'US' }, 21);
    graduateHS(state);
    state.stats.smarts = 90;
    state.prompts = [];
    engine.dispatch('education.enroll', 'bachelor:osu:history:full');
    if (!state.education.enrolled) withLuck(engine, () => engine.dispatch('education.enroll', 'bachelor:osu:history:full'));
    for (let i = 0; i < 4 && state.education.enrolled; i++) { state.stats.smarts = 90; nextYear(engine, state); }
    const d = state.education.degrees.find((x) => x.type === 'bachelor');
    assert.ok(d, 'graduated');
    assert.equal(d.schoolName, 'The Ohio State University');
    assert.equal(d.prestige, 2);
    const html = VIEWS.school(state, {});
    assert.ok(html.includes('Ohio State') && html.includes('University guide'));
  },
  'the School tab lists real universities to apply to'() {
    const { state } = life({ countryId: 'FR' });
    graduateHS(state);
    const html = VIEWS.school(state, {});
    assert.ok(html.includes('Sorbonne') && html.includes('education.apply'));
    assert.ok(universitiesFor(state, 'bachelor').some((u) => u.country === 'US'), 'famous universities abroad are on the list');
    void PROGRAMS;
    void universityOf;
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 5).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} university test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} university tests passed`);
