/**
 * Work by era for women (career/WorkByEra.js, career/EraPay.js): the marriage bar, the women's
 * rate before equal pay, the year equal pay came in, the glass ceiling, and Japan's big-firm custom.
 *
 *   node tests/workbyera.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire, PROMO_FACTORS } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { recalcSalary } from '../src/modules/career/Compensation.js';
import { eraWorkBlock, yearNow } from '../src/modules/world/Eras.js';
import { womensRate, marriageBar } from '../src/modules/career/EraPay.js';
import { WorkByEraModule } from '../src/modules/career/WorkByEra.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function worker(countryId, startYear, professionId, levelId, { gender = 'female', size = 'large', years = 23 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(5), modules: MODULES });
  const state = engine.newLife({ countryId, startYear, gender });
  for (let i = 0; i < years; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  if (!state.character.alive) throw new Error('died young');
  Object.assign(state.stats, { smarts: 85, health: 90 });
  state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'education', year: 22 });
  const ctx = engine.context();
  if (professionId) {
    const employer = createEmployer(new Random(5), state, getProfession(professionId), state.character.regionId);
    employer.size = size;
    hire(ctx, { professionId, levelId, employer });
  }
  state.prompts = [];
  return { engine, state, ctx, job: state.career.job };
}
function marry(engine, state) {
  const spouse = { ...state.people.list.find((p) => p.alive), id: 'spouse-test', relation: 'spouse', alive: true, firstName: 'Sam' };
  state.people.list.push(spouse);
  engine.context().emit('people:married', { personId: spouse.id });
}
const firstLevel = (id) => getProfession(id).levels[0].id;

const tests = {
  'a woman is paid the women\'s rate before equal pay, and the card says so'() {
    const { state, job } = worker('GB', 1930, 'corporate', 'analyst');
    assert.ok(yearNow(state) < 1975);
    assert.equal(womensRate(state, job), 0.75);
    assert.equal(job.womensRate, 0.75);
    const man = worker('GB', 1930, 'corporate', 'analyst', { gender: 'male' });
    assert.equal(man.job.womensRate, undefined);
    assert.match(VIEWS.career(state), /Women's rate/);
  },
  'the gap is gone a generation after the law'() {
    const { state, job } = worker('US', 1990, 'corporate', 'analyst');
    assert.equal(womensRate(state, job), 1);
    assert.equal(job.womensRate, undefined);
  },
  'equal pay lifts your pay the year it comes in'() {
    const { state, ctx, job } = worker('GB', 1945, 'corporate', 'analyst');
    assert.ok(yearNow(state) < 1975);
    recalcSalary(state, job);
    WorkByEraModule.onAgeUp(ctx);
    assert.equal(job.rateSeen, 0.75);
    const before = job.salary;
    // Move the calendar to the year the act came in.
    state.character.birthYear += 1975 - yearNow(state);
    assert.equal(yearNow(state), 1975);
    WorkByEraModule.onAgeUp(ctx);
    assert.ok(state.log.some((y) => y.entries.some((e) => /Equal pay came in/.test(e.text))), 'the equal pay moment was logged');
    assert.equal(job.womensRate, 0.9);
    assert.ok(job.salary > before);
  },
  'a marriage bar makes you resign, with a gratuity in Britain'() {
    const id = firstLevel('education');
    const { engine, state, job } = worker('GB', 1905, 'education', id);
    assert.ok(job, 'hired as a teacher');
    assert.ok(marriageBar(state, getProfession('education')), 'a bar on teaching');
    job.yearsAtEmployer = 8;
    const cash = state.finances.cash;
    marry(engine, state);
    assert.equal(state.career.job, null, 'resigned on marriage');
    assert.match(state.career.history.at(-1).reason, /marriage bar/);
    assert.ok(state.finances.cash > cash, 'a marriage gratuity');
  },
  'married women aren\'t taken on where a bar stands, and are once it goes'() {
    const { engine, state } = worker('IE', 1925, null, null);
    marry(engine, state);
    assert.match(eraWorkBlock(state, getProfession('education')) ?? '', /marriage bar/);
    assert.equal(eraWorkBlock(state, getProfession('retail')), null, 'private work is open');
    const later = worker('IE', 1960, null, null);
    marry(later.engine, later.state);
    assert.ok(yearNow(later.state) > 1973);
    assert.ok(!/marriage bar/.test(eraWorkBlock(later.state, getProfession('education')) ?? ''));
  },
  'Japan\'s big firms expect you to retire on marriage; staying on costs you'() {
    const { engine, state, job } = worker('JP', 1950, 'corporate', 'analyst', { size: 'enterprise' });
    marry(engine, state);
    const p = state.prompts.find((x) => x.type === 'workByEra.custom');
    assert.ok(p, 'the custom prompt');
    engine.resolvePrompt(p.id, 'stay');
    assert.equal(state.career.job, job);
    assert.ok(job.stayedOnMarried);
    const senior = { grade: 6 };
    const f = PROMO_FACTORS.reduce((a, fn) => a * (fn(state, job, senior) ?? 1), 1);
    assert.ok(f <= 0.6, `a heavy drag on promotion (${f})`);
  },
  'American lives (no country id) get the US rules: equal pay in 1963, the teaching bar'() {
    const { engine, state, job } = worker(undefined, 1925, 'corporate', 'analyst');
    assert.ok(yearNow(state) < 1963);
    assert.equal(job.womensRate, 0.75);
    marry(engine, state);
    assert.match(eraWorkBlock(state, getProfession('education')) ?? '', /marriage bar/);
  },
  'men are untouched'() {
    const { engine, state, job } = worker('GB', 1905, 'education', firstLevel('education'), { gender: 'male' });
    marry(engine, state);
    assert.equal(state.career.job, job);
    recalcSalary(state, job);
    assert.equal(job.womensRate, undefined);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
