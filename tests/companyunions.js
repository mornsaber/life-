/**
 * Unions meet company life (career/CompanyUnions.js): the concessions vote, the strike, the
 * steward at the table, the manager across it, and derecognition after a takeover.
 *
 *   node tests/companyunions.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { corpOf, corpLayoffRisk } from '../src/modules/career/CompanyLife.js';
import { CompanyUnionsModule } from '../src/modules/career/CompanyUnions.js';
import { unionFor } from '../src/modules/career/LaborUnions.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function worker(levelId, { member = true, countryId = 'US', startYear = 1960 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(6), modules: MODULES });
  const state = engine.newLife({ countryId, startYear });
  for (let i = 0; i < 24; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
  const ctx = engine.context();
  const profession = getProfession('corporate');
  const employer = createEmployer(new Random(6), state, profession, state.character.regionId);
  employer.size = 'enterprise';
  employer.union = { name: 'United Office Workers', strike: true, duesRate: 0.013, contractYearsLeft: 2, stateId: null };
  hire(ctx, { professionId: 'corporate', levelId, employer });
  state.prompts = [];
  const job = state.career.job;
  job.unionMember = member;
  unionFor(state, job.employer.union);
  return { engine, state, ctx, job, c: corpOf(state, job) };
}
const texts = (s) => s.log.flatMap((y) => y.entries.map((e) => e.text));
function promptFor(state, ctx, type) {
  for (let i = 0; i < 100; i++) {
    state.world.seed = (state.world.seed ?? 1) + 1;
    delete state.career.job.concessionAge;
    CompanyUnionsModule.onAgeUp(ctx);
    const p = state.prompts.find((x) => x.type === type);
    if (p) return p;
  }
  return null;
}

const tests = {
  'a struggling company asks for concessions; taking the cut lowers your pay'() {
    const { engine, state, ctx, job, c } = worker('analyst');
    c.health = 20;
    const p = promptFor(state, ctx, 'companyUnions.vote');
    assert.ok(p, 'a concessions vote');
    assert.ok(p.options.some((o) => o.id === 'strike'));
    const before = job.salary;
    engine.resolvePrompt(p.id, 'accept');
    assert.ok(job.salary < before, 'pay fell');
    assert.ok(job.payAdjust < 1);
  },
  'a strike costs wages and ends in a win, a cut or a layoff'() {
    const { engine, state, ctx, job, c } = worker('analyst');
    c.health = 20;
    state.finances.cash = 50000;
    const p = promptFor(state, ctx, 'companyUnions.vote');
    engine.resolvePrompt(p.id, 'strike');
    assert.ok(state.finances.cash < 50000, 'lost wages');
    assert.ok(texts(state).some((t) => /picket|strike/.test(t)));
    assert.ok(state.career.job === null || job.payAdjust == null || job.payAdjust <= 1);
  },
  'a steward can bargain, and a no-layoffs deal protects the job'() {
    const { engine, state, ctx, job, c } = worker('analyst');
    state.unions.mine = { unionId: Object.keys(state.unions.byId)[0], role: 'steward', since: state.character.age };
    c.health = 20;
    const p = promptFor(state, ctx, 'companyUnions.vote');
    assert.ok(p.options.some((o) => o.id === 'bargain'), 'a seat at the table');
    job.noLayoffUntil = state.character.age + 3;
    assert.equal(corpLayoffRisk(state, job), 0);
  },
  'a senior manager sits across the table'() {
    const { engine, state, ctx, job, c } = worker('director', { member: false });
    c.health = 20;
    const p = promptFor(state, ctx, 'companyUnions.management');
    assert.ok(p, 'management talks');
    engine.resolvePrompt(p.id, 'hard');
    assert.ok(texts(state).some((t) => /union (folded|walked out)/.test(t)));
  },
  'new owners may derecognize the union'() {
    const { state, ctx, job, c } = worker('analyst', { startYear: 1970 });
    let gone = false;
    for (let i = 0; i < 100 && !gone; i++) {
      state.world.seed = (state.world.seed ?? 1) + 1;
      c.history.unshift({ age: state.character.age, kind: 'acquired', text: 'Bought.' });
      c.health = 60;
      CompanyUnionsModule.onAgeUp(ctx);
      gone = !job.employer.union;
    }
    assert.ok(gone, 'derecognized');
    assert.equal(job.unionMember, false);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
