/**
 * Career play: the year's work plan, the job's own actions with odds, burnout, rank perks,
 * readiness for the next rung, milestones and the end-of-job card.
 *
 *   node tests/careerplay.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { professionsFor } from '../src/modules/career/JobTrees.js';
import { applicationEligibility, leaveJob } from '../src/modules/career/CareerEngine.js';
import { shiftActions, shiftOdds, readiness, nextPerk, WORK_PLANS, SHIFT_FAMILIES } from '../src/modules/career/CareerPlay.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const solve = (engine, state) => { for (let g = 0; g < 30 && state.prompts.length; g++) { const p = state.prompts[0]; engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled) ?? p.options[0]).id); if (state.prompts[0] === p) state.prompts.shift(); } };
/** A working adult. */
function worker(seed = 3, prefer = null) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  for (let i = 0; i < 24; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  Object.assign(state.stats, { smarts: 80, health: 90 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 });
  const open = professionsFor(state).filter((p) => applicationEligibility(state, p.id).ok);
  const pick = [...(prefer ? open.filter((p) => prefer.test(p.id)) : []), ...open];
  for (const p of pick.slice(0, 8)) { engine.dispatch('career.apply', p.id); solve(engine, state); if (state.career.job) break; }
  return { engine, state };
}

const tests = {
  'every family has three actions, and every job finds its family'() {
    for (const f of SHIFT_FAMILIES) assert.equal(f.actions.length, 3, f.id);
    const { state } = worker();
    assert.ok(state.career.job, 'hired');
    assert.equal(shiftActions(state.career.job).length, 3);
  },
  'the plan moves the year: a grind builds performance and burnout, coasting drains both'() {
    const a = worker(5);
    const b = worker(5);
    if (!a.state.career.job || !b.state.career.job) return;
    a.engine.dispatch('careerPlay.plan', 'grind');
    b.engine.dispatch('careerPlay.plan', 'coast');
    for (const x of [a, b]) { x.state.career.job.performance = 60; x.state.career.job.burnout = 30; x.state.prompts = []; x.engine.ageUp(); }
    assert.ok((a.state.career.job?.burnout ?? 0) > (b.state.career.job?.burnout ?? 0), 'grinding burns out more');
    assert.ok(WORK_PLANS.grind.perf > WORK_PLANS.coast.perf);
  },
  'shift actions show odds, run three times a year, once each'() {
    const { engine, state } = worker(7);
    const job = state.career.job;
    assert.ok(job);
    const acts = shiftActions(job);
    for (const a of acts) { const o = shiftOdds(state, a); assert.ok(o >= 0.12 && o <= 0.92, `${a.id} ${o}`); }
    const before = state.log.at(-1).entries.length;
    for (const a of acts) engine.dispatch('careerPlay.shift', a.id);
    engine.dispatch('careerPlay.shift', acts[0].id);
    assert.equal(state.log.at(-1).entries.length - before, 3, 'three actions, the fourth refused');
  },
  'burnout at the top costs health and performance'() {
    const { engine, state } = worker(9);
    if (!state.career.job) return;
    engine.dispatch('careerPlay.plan', 'grind');
    state.career.job.burnout = 95;
    const h = state.stats.health;
    state.prompts = [];
    engine.ageUp();
    assert.match(state.log.at(-1).entries.map((e) => e.text).join(' '), /burned out/);
    assert.ok(state.stats.health <= h);
  },
  'readiness and the next rung\'s perks are shown on the job screen'() {
    const { state } = worker(11);
    if (!state.career.job) return;
    const r = readiness(state);
    assert.ok(r.score >= 0 && r.score <= 100);
    const n = nextPerk(state, state.career.job);
    const html = VIEWS.career(state, {});
    assert.match(html, /Your Year at Work/);
    assert.match(html, /This year's plan/);
    if (n) assert.match(html, /Ready for promotion/);
  },
  'milestones: the first job is marked, and a long stint ends with a card'() {
    const { engine, state } = worker(13);
    if (!state.career.job) return;
    assert.ok(state.career.milestones.firstJob != null, 'first job');
    state.career.job.startAge = state.character.age - 6;
    leaveJob(engine.context(), 'Moving on');
    assert.ok((state.results ?? []).some((r) => /6 years at/.test(r.title)), 'an end-of-job card');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
