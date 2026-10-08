/**
 * Prompts tied to a job, military service or office disappear when that
 * position ends, and can't be answered against a different job.
 *
 *   node tests/prompts.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, leaveJob } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { discharge } from '../src/modules/military/MilitaryEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed = 1) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'P', lastName: 'Scope' });
  state.character.age = 30;
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
  Object.assign(state.stats, { smarts: 70, fitness: 80, health: 90 });
  return { engine, state, ctx: engine.context() };
}
const job = (ctx, state, id = 'retail') => hire(ctx, { professionId: id, levelId: getProfession(id).levels[0].id, employer: createEmployer(ctx.rng, state, getProfession(id), state.character.regionId) });
const opts = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];

const tests = {
  'a work decision disappears when you are fired, and never applies to your next job'() {
    const { engine, state, ctx } = setup(1);
    job(ctx, state);
    const p = ctx.prompt({ type: 'career.workEvent', title: 'Crunch', text: '', options: opts, data: { eventId: 'overtime' } });
    assert.ok(p.scope?.job, 'stamped with the job');
    leaveJob(ctx, 'Terminated', { fired: true });
    job(ctx, state, 'logistics');
    assert.equal(engine.resolvePrompt(p.id, 'a'), false, 'a stale decision is refused');
    assert.ok(!state.prompts.some((x) => x.id === p.id), 'and removed');
  },

  'prompts are pruned after the action or year that ended the position'() {
    const { engine, state, ctx } = setup(2);
    job(ctx, state);
    ctx.prompt({ type: 'career.promotionReview', title: 'Review', text: '', options: opts });
    ctx.prompt({ type: 'lifeEvents.event', title: 'Life', text: '', options: opts, data: {} });
    leaveJob(ctx, 'Laid off');
    engine.ageUp(); // blocked by prompts, so prune directly the way every engine step does
    engine.resolvePrompt(state.prompts.find((x) => x.type === 'lifeEvents.event').id, 'a');
    assert.ok(!state.prompts.some((x) => x.type === 'career.promotionReview'), 'job prompt pruned');
  },

  'unrelated prompts and prompts raised while unemployed survive'() {
    const { state, ctx, engine } = setup(3);
    const p = ctx.prompt({ type: 'career.workEvent', title: 'x', text: '', options: opts, data: { eventId: 'overtime' } });
    assert.equal(p.scope, undefined, 'no job, no stamp');
    job(ctx, state);
    engine.dispatch; // no-op
    assert.ok(state.prompts.includes(p));
  },

  'military prompts end with the service'() {
    const { engine, state, ctx } = setup(4);
    engine.dispatch('military.enlist', 'army:enlisted:active');
    const sp = state.prompts.find((x) => x.type === 'military.chooseSpecialty');
    engine.resolvePrompt(sp.id, sp.options.find((o) => !o.disabled).id);
    state.prompts = [];
    const p = ctx.prompt({ type: 'military.njpOffer', title: 'NJP', text: '', options: opts, data: {} });
    assert.ok(p.scope?.service);
    discharge(ctx, 'honorable', 'test');
    assert.equal(engine.resolvePrompt(p.id, 'a'), false);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 5).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} prompt test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} prompt tests passed`);
