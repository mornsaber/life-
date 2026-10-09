/**
 * Starting above the bottom at a new employer: outside chief searches,
 * federal same-grade transfers, executive recruiters and lateral hires.
 *
 *   node tests/seniormoves.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { grantCredential } from '../src/modules/credentials/LicensingEngine.js';
import { chiefSearchEligibility, federalTransfers, execRecruiterEligibility, lateralStep, CHIEF_GRADE } from '../src/modules/career/SeniorMoves.js';
import { makeOffer } from '../src/modules/career/JobMarket.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{0,80}(NaN|undefined|\[object).{0,80}/)?.[0]);

function life(seed, age = 45, regionId = 'nyc') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = age;
  state.character.regionId = regionId;
  Object.assign(state.stats, { smarts: 75, fitness: 70, health: 90 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
  return { engine, state, ctx: engine.context() };
}
function employ(t, professionId, levelId, years, regionId = t.state.character.regionId) {
  const p = PROFESSIONS[professionId];
  t.state.career.history.push({ professionId, startAge: t.state.character.age - years, endAge: t.state.character.age - 1, peakGrade: 6 });
  const job = hire(t.ctx, { professionId, levelId, employer: createEmployer(new Random(9), t.state, p, regionId) });
  t.state.prompts = [];
  Object.assign(job, { performance: 80, boss: 75, yearsAtEmployer: 5, probationLeft: 0 });
  return job;
}
const prompt = (state, type) => state.prompts.find((p) => p.type === type);

const tests = {
  'a police captain can be hired as chief of a smaller department elsewhere'() {
    const t = life(1);
    for (const c of ['postCert', 'policeCert']) try { grantCredential(t.ctx, c, { silent: true }); } catch { /* not every credential exists */ }
    const job = employ(t, 'police', 'captain', 15);
    assert.ok(chiefSearchEligibility(t.state).ok, chiefSearchEligibility(t.state).reason);
    let p = null;
    for (let i = 0; i < 6 && !p; i++) {
      delete t.state.yearly['career.chiefSearch'];
      t.engine.dispatch('career.chiefSearch');
      p = prompt(t.state, 'career.chiefSearch');
    }
    assert.ok(p, 'chief openings');
    for (const o of p.data.openings) {
      assert.ok(job.grade >= CHIEF_GRADE[o.employer.size], `a captain is not a candidate at a ${o.employer.size} agency`);
      assert.notEqual(o.regionId, 'nyc');
    }
    t.engine.rng.chance = () => true;
    const opening = p.data.openings[0];
    t.engine.resolvePrompt(p.id, '0');
    const now = t.state.career.job;
    assert.equal(now.levelId, opening.levelId);
    assert.equal(now.levelId, 'chief');
    assert.equal(t.state.character.regionId, opening.regionId, 'moved for the job');
    clean(VIEWS.career(t.state));
  },
  'sergeants and below are not chief candidates; nor is someone without 10 years'() {
    const t = life(2);
    employ(t, 'police', 'sergeant', 15);
    assert.ok(!chiefSearchEligibility(t.state).ok);
    const u = life(3);
    employ(u, 'police', 'captain', 3);
    assert.match(chiefSearchEligibility(u.state).reason, /10 years/);
  },
  'a lateral officer starts at the working rank with pay steps for experience'() {
    const t = life(4);
    employ(t, 'police', 'sergeant', 8);
    const offer = makeOffer(t.ctx);
    assert.notEqual(offer.levelId, 'sergeant', 'rank does not travel');
    assert.ok(!PROFESSIONS.police.levels.find((l) => l.id === offer.levelId).abilities.includes('supervise'));
    assert.equal(offer.step, lateralStep(t.state, PROFESSIONS.police));
    assert.ok(offer.step >= 7, `step ${offer.step}`);
    assert.ok(offer.lateral);
  },
  'applying back into policing credits steps; a first job starts at step 1'() {
    const t = life(5, 35);
    t.state.career.history.push({ professionId: 'police', startAge: 25, endAge: 31, peakGrade: 4 });
    grantCredential(t.ctx, 'driverLicense', { silent: true });
    t.state.publicService.exams.publicSafety = { score: 90, age: 34 };
    t.engine.dispatch('career.apply', 'police');
    let p = prompt(t.state, 'career.interview');
    assert.ok(p, `interview: ${t.state.log.at(-1)?.entries?.map((e) => e.text).join(' | ')}`);
    {
      t.engine.rng.chance = () => true;
      while ((p = prompt(t.state, 'career.interview'))) t.engine.resolvePrompt(p.id, p.options[0].id);
      const offer = prompt(t.state, 'career.negotiate');
      assert.equal(offer.data.step, 7, '6 years: step 7');
      assert.equal(offer.data.q, 2);
    }
    const n = life(6, 23);
    n.engine.dispatch('career.apply', 'retail');
    n.engine.rng.chance = () => true;
    while ((p = prompt(n.state, 'career.interview'))) n.engine.resolvePrompt(p.id, p.options[0].id);
    assert.equal(prompt(n.state, 'career.negotiate').data.step, 1, 'first job: step 1 (the question counter no longer leaks into pay)');
  },
  'a federal agent can transfer to another agency at the same grade and keep their step'() {
    const t = life(7, 40);
    const job = employ(t, 'fbi', 'ssa', 12);
    job.step = 6;
    const options = federalTransfers(t.state);
    const dea = options.find((o) => o.professionId === 'dea');
    assert.ok(dea, `DEA in ${options.map((o) => o.professionId).join(',')}`);
    assert.equal(dea.grade, job.grade);
    assert.equal(dea.levelId, 'ssa', 'supervisors stay supervisors');
    t.engine.rng.chance = () => true;
    t.engine.dispatch('career.fedTransfer', 'dea');
    const now = t.state.career.job;
    assert.equal(now.professionId, 'dea');
    assert.equal(now.grade, 9);
    assert.equal(now.step, 6);
    clean(VIEWS.career(t.state));
  },
  'executive recruiters place a senior director as a VP elsewhere'() {
    const t = life(8, 48);
    t.state.education.degrees.push({ type: 'master', programId: 'mba', major: null, year: 30 });
    const job = employ(t, 'corporate', 'seniorDirector', 20);
    job.employer.size = 'large';
    assert.ok(execRecruiterEligibility(t.state).ok);
    t.engine.rng.chance = () => true;
    t.engine.dispatch('career.execRecruiter');
    const p = prompt(t.state, 'jobMarket.headhunter');
    assert.ok(p, 'recruiter offer');
    assert.equal(p.data.offer.levelId, 'vp');
    const before = job.salary;
    t.engine.resolvePrompt(p.id, 'accept');
    assert.equal(t.state.career.job.levelId, 'vp');
    assert.ok(t.state.career.job.salary > before);
    const u = life(9, 30);
    employ(u, 'corporate', 'teamLead', 5);
    assert.ok(!execRecruiterEligibility(u.state).ok);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} senior-move test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} senior-move tests passed`);
