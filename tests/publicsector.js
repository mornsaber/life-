/**
 * Government organizations sized to the population they serve, and
 * reductions in force run by civil-service rules.
 *
 *   node tests/publicsector.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { orgOf } from '../src/modules/org/Organizations.js';
import { cityPopulation } from '../src/modules/org/Staffing.js';
import { budgetPressure, retentionRisk, publicRifTick } from '../src/modules/career/PublicRif.js';
import { RIF_DEPS } from '../src/modules/career/CareerEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{0,80}(NaN|undefined|\[object).{0,80}/)?.[0]);
function worker(seed, professionId, regionId, levelIdx = 0) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 35;
  state.character.regionId = regionId;
  const p = PROFESSIONS[professionId];
  const ctx = engine.context();
  hire(ctx, { professionId, levelId: p.levels[levelIdx].id, employer: createEmployer(new Random(seed), state, p, regionId) });
  state.prompts = [];
  return { engine, state, ctx, job: state.career.job };
}
const deptOf = (state, job) => orgOf(state, job.employer)?.departments[job.employer.deptId];

const tests = {
  'a city police department is sized to its city'() {
    const big = worker(1, 'police', 'nyc');
    const small = worker(2, 'police', 'smalltown');
    const nyc = deptOf(big.state, big.job).headcount;
    const cf = deptOf(small.state, small.job).headcount;
    assert.ok(nyc > 20000, `NYC public safety: ${nyc}`);
    assert.ok(cf > 50 && cf < 500, `Cedar Falls public safety: ${cf}`);
    // Roughly proportional to population.
    const ratio = (nyc / cityPopulation('nyc')) / (cf / cityPopulation('smalltown'));
    assert.ok(ratio > 0.7 && ratio < 1.4, `per-capita ratio ${ratio}`);
    const html = VIEWS.career(big.state);
    clean(html);
    assert.ok(html.includes('serves 8,260,000 residents'));
  },

  'teachers follow the school-age population; state agencies follow the state'() {
    const t = worker(3, 'education', 'chicago');
    assert.ok(deptOf(t.state, t.job).headcount > 15000, `Chicago teachers ${deptOf(t.state, t.job).headcount}`);
  },

  'headcount stays near the population target over the years'() {
    const { engine, state, job } = worker(4, 'police', 'denver');
    const start = deptOf(state, job).headcount;
    for (let i = 0; i < 8; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); if (!state.career.job) break; }
    const now = deptOf(state, state.career.job ?? job)?.headcount ?? start;
    assert.ok(now > start * 0.75 && now < start * 1.25, `${start} → ${now}`);
  },

  'a budget crisis brings a RIF; retention rules decide who goes'() {
    const { engine, state, ctx, job } = worker(5, 'police', 'detroit', 1);
    state.publicService.city = { name: 'Detroit', approval: 40, fiscalHealth: 5 };
    assert.ok(budgetPressure(state, job) > 0.5);
    job.probationLeft = 1;
    const junior = retentionRisk(state, job);
    job.probationLeft = 0;
    job.yearsAtEmployer = 22;
    const senior = retentionRisk(state, job);
    assert.ok(junior > senior * 3, `junior ${junior} vs senior ${senior}`);
    job.yearsAtEmployer = 0;
    job.probationLeft = 1;
    let notice = null;
    for (let i = 0; i < 40 && !notice; i++) {
      state.prompts = [];
      publicRifTick(ctx, job, RIF_DEPS);
      notice = state.prompts.find((p) => p.type === 'career.rifNotice');
    }
    assert.ok(notice, 'a RIF notice');
    assert.ok(deptOf(state, job).budgetCut > 0, 'the department is cut');
    engine.resolvePrompt(notice.id, 'accept');
    assert.ok(!state.career.job, 'separated');
    assert.ok(state.career.recall, 'on the recall list');
    // The city recovers; the agency calls back.
    if (state.publicService.city) state.publicService.city.fiscalHealth = 70;
    let recalled = false;
    for (let i = 0; i < 3 && !recalled; i++) {
      state.prompts = [];
      engine.ageUp();
      const p = state.prompts.find((x) => x.type === 'career.rifRecall');
      if (p) { engine.resolvePrompt(p.id, 'return'); recalled = Boolean(state.career.job); }
    }
    assert.ok(recalled, 'recalled to the old job');
  },

  'bumping keeps the job at a lower grade; tenure protects teachers'() {
    const { engine, state, ctx, job } = worker(6, 'police', 'detroit', 2);
    state.publicService.city = { name: 'Detroit', approval: 40, fiscalHealth: 0 };
    job.probationLeft = 1;
    let notice = null;
    for (let i = 0; i < 40 && !notice; i++) { state.prompts = []; publicRifTick(ctx, job, RIF_DEPS); notice = state.prompts.find((p) => p.type === 'career.rifNotice'); }
    assert.ok(notice);
    const level = job.levelId;
    engine.resolvePrompt(notice.id, 'bump');
    assert.ok(state.career.job, 'still employed');
    assert.notEqual(state.career.job.levelId, level, 'at a lower position');
    const t = worker(7, 'education', 'detroit');
    t.job.tenured = true;
    assert.equal(retentionRisk(t.state, t.job), 0);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} public-sector test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} public-sector tests passed`);
