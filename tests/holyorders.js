/**
 * Holy orders as a status: ordination survives resigning; returning priests resume at their
 * order; Vatican service is a priest's assignment (bishops for nuncios), with a way home; one
 * ministry on the job board per faith; laicization.
 *
 *   node tests/holyorders.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession, professionsFor } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire, leaveJob, bestEntryLevel } from '../src/modules/career/CareerEngine.js';
import { ordersOf, catholicPriest } from '../src/modules/community/HolyOrders.js';
import { ordainedPriest } from '../src/modules/career/IntlOrgCareers.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'IT', gender: 'male', ...opts });
  state.legal.record = [];
  state.character.age = 35;
  state.community.faith = { traditionId: 'catholic', congregation: 'San Marco', attendance: 'devout', joinedAge: 0, raised: true, devoutYears: 10 };
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const giveJob = (engine, professionId, levelId) => {
  const profession = getProfession(professionId);
  const job = hire(engine.context(), { professionId, levelId, employer: createEmployer(engine.rng, engine.state, profession, engine.state.character.regionId) });
  engine.state.prompts = [];
  return job;
};

const tests = {
  'a priest who resigns stays a priest, and comes back as a pastor, not a seminarian'() {
    const { engine, state, ctx } = life();
    giveJob(engine, 'catholicClergy', 'pastor');
    assert.equal(ordersOf(state)?.grade, 'priest');
    leaveJob(ctx, 'Sabbatical');
    assert.ok(catholicPriest(state), 'still a priest');
    assert.ok(ordainedPriest(state));
    const level = bestEntryLevel(state, getProfession('catholicClergy'));
    assert.equal(level.id, 'pastor', 'back at the post he left');
  },
  'only your own church\'s ministry is on the job board'() {
    const { state } = life();
    const ids = professionsFor(state).map((p) => p.id);
    assert.ok(ids.includes('catholicClergy'));
    assert.ok(!ids.includes('anglicanClergy') && !ids.includes('clergy'));
  },
  'a nuncio is ordained a bishop; when the service ends the diocese calls him home'() {
    const { engine, state, ctx } = life({}, 6);
    giveJob(engine, 'catholicClergy', 'monsignor');
    giveJob(engine, 'holySeeDiplomacy', 'nuncio');
    assert.equal(ordersOf(state).grade, 'bishop');
    state.prompts = [];
    leaveJob(ctx, 'Recalled');
    const q = state.prompts.find((p) => p.type === 'holyOrders.return');
    assert.ok(q, 'back to the diocese');
    engine.resolvePrompt(q.id, 'return');
    assert.equal(state.career.job?.professionId, 'catholicClergy');
    assert.equal(state.career.job.levelId, 'bishop');
  },
  'a priest is sent to Rome by the bishop'() {
    const { engine, state, ctx } = life({}, 7);
    const job = giveJob(engine, 'catholicClergy', 'pastor');
    job.yearsAtEmployer = 5;
    job.performance = 90;
    state.stats.smarts = 90;
    const c = ctx.rng.chance; ctx.rng.chance = () => true;
    engine.dispatch('holyOrders.toRome', 'academy');
    ctx.rng.chance = c;
    assert.equal(state.career.job?.professionId, 'holySeeDiplomacy');
    assert.ok(catholicPriest(state));
  },
  'laicization ends holy orders'() {
    const { engine, state, ctx } = life({}, 8);
    giveJob(engine, 'catholicClergy', 'vicar');
    leaveJob(ctx, 'Left ministry');
    engine.dispatch('holyOrders.laicize');
    assert.equal(ordersOf(state), null);
    assert.ok(!ordainedPriest(state));
    assert.equal(bestEntryLevel(state, getProfession('catholicClergy'))?.id ?? 'seminarian', 'seminarian');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} holy orders test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} holy orders tests passed`);
