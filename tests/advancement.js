/**
 * How promotion happens (career/Advancement.js): the calibration curve, improvement plans,
 * acting up, up or out at the firms that have partners, graduate schemes and assessment centres.
 *
 *   node tests/advancement.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire, promotionStatus, PROMO_FACTORS } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { AdvancementModule, upOrOutIn, wantsAssessment } from '../src/modules/career/Advancement.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { packFor, vocationOf } from '../src/modules/career/Vocations.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function worker(professionId, levelId, { seed = 3, size = 'large', years = 24 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  for (let i = 0; i < years; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  Object.assign(state.stats, { smarts: 85, health: 90 });
  state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 }, { type: 'professional', programId: 'jd', major: 'law', year: 25 });
  const ctx = engine.context();
  const profession = getProfession(professionId);
  const employer = createEmployer(new Random(seed), state, profession, state.character.regionId);
  employer.size = size;
  hire(ctx, { professionId, levelId, employer });
  state.prompts = [];
  return { engine, state, ctx, job: state.career.job };
}
const prompt = (state, type) => state.prompts.find((p) => p.type === type);

const tests = {
  'the calibration curve rates you, and the rating weighs on your promotion case'() {
    const { engine, state, job } = worker('corporate', 'analyst');
    job.yearsAtEmployer = 2;
    job.performance = 95; job.boss = 90;
    AdvancementModule.onAgeUp(engine.context());
    assert.equal(job.calibration.rating, 'top');
    assert.ok(PROMO_FACTORS.some((f) => f(state, job) > 1), 'top of the curve helps');
    job.performance = 20; job.boss = 20;
    AdvancementModule.onAgeUp(engine.context());
    assert.equal(job.calibration.rating, 'bottom');
  },
  'two years at the bottom bring an improvement plan: meet it or go'() {
    const { engine, state, job } = worker('corporate', 'analyst');
    job.bottoms = 2; job.yearsAtEmployer = 3;
    job.performance = 30;
    AdvancementModule.onAgeUp(engine.context());
    const p = prompt(state, 'advancement.pip');
    assert.ok(p, 'a plan');
    engine.resolvePrompt(p.id, 'accept');
    assert.ok(job.pip);
    state.character.age = job.pip.until;
    job.performance = 30;
    AdvancementModule.onAgeUp(engine.context());
    assert.equal(state.career.job, null, 'dismissed at the end of a failed plan');
    const b = worker('corporate', 'analyst', { seed: 4 });
    b.job.bottoms = 2; b.job.yearsAtEmployer = 6; b.job.performance = 30;
    AdvancementModule.onAgeUp(b.engine.context());
    const cash = b.state.finances.cash;
    b.engine.resolvePrompt(prompt(b.state, 'advancement.pip').id, 'exit');
    assert.equal(b.state.career.job, null, 'negotiated exit');
    assert.ok(b.state.finances.cash > cash, 'with a settlement');
  },
  'acting up: confirmed in the post, or back down and first in line'() {
    let confirmed = 0;
    let back = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const { engine, state, job } = worker('corporate', 'srAnalyst', { seed });
      const ctx = engine.context();
      AdvancementModule.resolvers.acting(ctx, { levelId: 'specialist', title: 'Specialist' }, 'accept');
      assert.ok(job.acting);
      job.acting.until = state.character.age;
      job.performance = seed % 2 ? 95 : 40;
      AdvancementModule.onAgeUp(ctx);
      if (state.career.job?.levelId === 'specialist') confirmed += 1;
      else if (state.career.job?.nextInLine?.levelId === 'specialist') back += 1;
    }
    assert.ok(confirmed > 0 && back > 0, `confirmed ${confirmed}, back ${back}`);
  },
  'up or out: after seven years the partnership decides'() {
    const { engine, state, job } = worker('law', 'senior', { years: 30 });
    assert.equal(upOrOutIn(state, job), 7);
    job.yearsAtEmployer = 7;
    AdvancementModule.onAgeUp(engine.context());
    const p = prompt(state, 'advancement.partner');
    assert.ok(p, 'the decision');
    assert.ok(p.options.some((o) => o.id === 'counsel'), 'counsel is an option at a law firm');
    engine.resolvePrompt(p.id, 'leave');
    assert.equal(state.career.job, null, 'out');
    const b = worker('law', 'senior', { years: 30, seed: 9 });
    b.job.yearsAtEmployer = 7;
    AdvancementModule.onAgeUp(b.engine.context());
    b.engine.resolvePrompt(prompt(b.state, 'advancement.partner').id, 'counsel');
    assert.equal(b.state.career.job.levelId, 'counsel');
    assert.equal(upOrOutIn(b.state, b.state.career.job), null, 'decided once');
  },
  'a graduate scheme speeds the first three years'() {
    const { engine, state, job } = worker('corporate', 'jrAnalyst', { size: 'enterprise' });
    AdvancementModule.resolvers.scheme(engine.context(), { name: 'the leadership development program' }, 'join');
    assert.ok(job.fastTrack && job.scheme);
    assert.match(VIEWS.career(state), /Getting On/, 'shown while on it');
    state.character.age = job.scheme.until;
    AdvancementModule.onAgeUp(engine.context());
    assert.equal(job.fastTrack, false, 'back to the ordinary pace');
  },
  'senior public posts need the assessment centre'() {
    const prof = getProfession('publicHealth');
    // Once, on the way into the senior grades (G8+): a supervisor up for director.
    const below = prof.levels.find((l) => l.id === 'supervisor');
    const { engine, state, job } = worker('publicHealth', below.id, { size: 'large' });
    state.education.degrees.push({ type: 'master', programId: 'mph', major: null, year: 24 });
    job.yearsInLevel = 10; job.performance = 80;
    // The management course its ladder asks of every manager, done.
    const pack = packFor(state); if (pack) vocationOf(state, pack).courses.management = state.character.age;
    assert.ok(wantsAssessment(state, job), 'an assessment centre to sit');
    assert.match(promotionStatus(state).reason ?? '', /assessment centre/);
    assert.match(VIEWS.career(state), /assessment centre/);
    for (let i = 0; i < 8 && !job.assessedAge; i++) { state.yearly = {}; engine.dispatch('advancement.assessment'); }
    assert.ok(job.assessedAge != null, 'passed in the end');
    assert.ok(!/assessment centre/.test(promotionStatus(state).reason ?? ''), 'no longer the obstacle');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
