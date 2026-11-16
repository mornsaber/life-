/**
 * Boards and the top of the tree (career/Boardroom.js): board seats with fees and terms, the
 * scandal at a company you oversee, strategy and succession at the top, the activist and the
 * board that loses confidence, and the years after a big career.
 *
 *   node tests/boardroom.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire, leaveJob } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { BoardroomModule, boardsOf, atTheTop, peakGrade } from '../src/modules/career/Boardroom.js';
import { corpOf } from '../src/modules/career/CompanyLife.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function executive(levelId = 'ceo', { seed = 3, cc = 'GB' } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  for (let i = 0; i < 50; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
  state.prompts = [];
  state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 }, { type: 'master', programId: 'mba', major: 'business', year: 26 });
  const ctx = engine.context();
  const employer = createEmployer(new Random(seed), state, getProfession('corporate'), state.character.regionId);
  employer.size = 'enterprise';
  hire(ctx, { professionId: 'corporate', levelId, employer });
  state.prompts = [];
  return { engine, state, ctx, job: state.career.job };
}
const year = (engine, state) => { state.prompts = state.prompts.filter((p) => p.type.startsWith('boardroom.')); BoardroomModule.onAgeUp(engine.context()); state.character.age += 1; };

const tests = {
  'senior people are invited onto boards, paid fees, for three-year terms'() {
    const { engine, state, job } = executive('vp');
    assert.ok(peakGrade(state) >= 8);
    let p = null;
    for (let i = 0; i < 30 && !p; i++) { year(engine, state); p = state.prompts.find((x) => x.type === 'boardroom.invite'); }
    assert.ok(p, 'an invitation');
    engine.resolvePrompt(p.id, 'yes');
    const seat = boardsOf(state)[0];
    assert.ok(seat && seat.until === seat.since + 3);
    assert.match(VIEWS.career(state), /Your boards/);
    engine.dispatch('boardroom.resign', seat.id);
    assert.equal(boardsOf(state).length, 0, 'stepped down');
    assert.ok(job);
  },
  'at the top: strategy, succession, the activist and the board'() {
    const { engine, state, job } = executive('ceo');
    assert.ok(atTheTop(job), 'the chief executive');
    engine.dispatch('boardroom.strategy', 'growth');
    assert.equal(job.strategy, 'growth');
    engine.dispatch('boardroom.successor', 'insider');
    assert.equal(job.successor, 'insider');
    assert.match(VIEWS.career(state), /The Top Job/);
    const c = corpOf(state, job);
    c.listed = true; c.health = 30;
    let activist = null;
    for (let i = 0; i < 25 && !activist && state.career.job === job; i++) { c.health = 30; job.performance = 70; year(engine, state); activist = state.prompts.find((x) => x.type === 'boardroom.activist'); }
    assert.ok(activist, 'an activist investor');
    engine.resolvePrompt(activist.id, 'settle');
    let ousted = false;
    for (let i = 0; i < 25 && !ousted; i++) { c.health = 10; job.performance = 20; state.prompts = []; BoardroomModule.onAgeUp(engine.context()); state.character.age += 1; ousted = state.career.job !== job; }
    assert.ok(ousted, 'the board loses confidence');
  },
  'after the top job: commissions, advisory work, a memoir, an honour'() {
    const { engine, state, ctx } = executive('ceo', { seed: 5 });
    leaveJob(ctx, 'Retired');
    state.career.reputation = { corporate: 70 };
    let p = null;
    for (let i = 0; i < 30 && !p; i++) { year(engine, state); p = state.prompts.find((x) => x.type === 'boardroom.after'); }
    assert.ok(p, 'an offer after the top job');
    const pick = p.options.find((o) => o.id === 'memoir') ?? p.options[0];
    const cash = state.finances.cash;
    engine.resolvePrompt(p.id, pick.id);
    if (pick.id !== 'rest') assert.ok(state.finances.cash >= cash);
    let honoured = false;
    for (let i = 0; i < 40 && !honoured; i++) { year(engine, state); honoured = (state.honors ?? []).some((h) => /British Empire/.test(h.name)); }
    assert.ok(honoured, 'a CBE in Britain');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
