/**
 * Command (career/Command.js, content/packs/scenes-command.js): readiness that shapes the big
 * day, nights of disorder and sieges for police commanders, a battalion's battle in a war, and
 * the inquiry after a bad day.
 *
 *   node tests/command.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire, PROMO_GATES } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { startScene } from '../src/modules/career/Scenes.js';
import { CommandModule, commanderKind, readinessOf, inquiryVerdict } from '../src/modules/career/Command.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function commander(levelId = 'captain', { countryId = 'GB', startYear = 1960 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(21), modules: MODULES });
  const state = engine.newLife({ countryId, startYear });
  for (let i = 0; i < 35; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  const ctx = engine.context();
  const profession = getProfession('police');
  hire(ctx, { professionId: 'police', levelId, employer: createEmployer(new Random(21), state, profession, state.character.regionId) });
  state.prompts = [];
  state.scene = null;
  return { engine, state, ctx, job: state.career.job };
}
const play = (engine, state, pick = 0) => { for (let i = 0; i < 8 && state.prompts.some((p) => p.type === 'scenes.step'); i++) { const p = state.prompts.find((x) => x.type === 'scenes.step'); engine.resolvePrompt(p.id, p.options[Math.min(pick, p.options.length - 1)].id); } };

const tests = {
  'a police captain is a commander, a constable isn\'t; the card offers preparations'() {
    const { state } = commander('captain');
    assert.equal(commanderKind(state), 'civil');
    assert.match(VIEWS.career(state), /Command/);
    assert.match(VIEWS.career(state), /mutual-aid agreements/);
    assert.equal(commanderKind(commander('officer').state), null);
  },
  'preparing raises readiness, once a year, and it fades if neglected'() {
    const { engine, state, ctx } = commander();
    const before = readinessOf(state).training;
    engine.dispatch('command.prepare', 'training');
    assert.ok(readinessOf(state).training > before);
    const once = readinessOf(state).plans;
    engine.dispatch('command.prepare', 'plans');
    assert.equal(readinessOf(state).plans, once, 'one a year');
    readinessOf(state).kit = 90;
    CommandModule.onAgeUp(ctx);
    assert.ok(readinessOf(state).kit < 90, 'fades');
  },
  'readiness tips the scores when the day comes, and unlocks the options you prepared'() {
    const { state, ctx } = commander();
    Object.assign(readinessOf(state), { training: 90, kit: 90, plans: 90, mutualAid: 90 });
    assert.ok(startScene(ctx, 'command.siege'));
    assert.deepEqual(state.scene.score, { lives: 1, crew: 1, city: 1, trust: 1 });
    assert.ok(state.prompts[0].options.some((o) => o.id === 'plan'), 'the drilled entry plan');
    const unready = commander();
    Object.assign(readinessOf(unready.state), { training: 10, kit: 10, plans: 10, mutualAid: 10 });
    startScene(unready.ctx, 'command.siege');
    assert.deepEqual(unready.state.scene.score, { lives: -1, crew: -1, city: -1, trust: -1 });
    assert.ok(!unready.state.prompts[0].options.some((o) => o.id === 'plan'));
  },
  'a night of disorder plays through to an outcome'() {
    const { engine, state, ctx } = commander();
    assert.ok(startScene(ctx, 'command.disorder'));
    play(engine, state, 0);
    CommandModule.onAgeUp(ctx);
    assert.ok(state.careerLife.scenes.some((s) => s.id === 'command.disorder'));
  },
  'a bad day brings an inquiry; preparation is your defence'() {
    const { engine, state, ctx, job } = commander();
    Object.assign(readinessOf(state), { training: 10, kit: 10, plans: 10, mutualAid: 10 });
    (state.careerLife ??= {}).scenes = [{ age: state.character.age, id: 'command.siege', title: 'The Siege', tier: 'bad' }];
    CommandModule.onAgeUp(ctx);
    assert.ok(state.command.inquiry, 'an inquiry is coming');
    state.character.age += 1;
    CommandModule.onAgeUp(ctx);
    const p = state.prompts.find((x) => x.type === 'command.inquiry');
    assert.ok(p, 'findings');
    engine.resolvePrompt(p.id, 'accept');
    assert.ok(state.career.job === null || (job.commandFreeze ?? 0) > state.character.age || state.log.at(-1).entries.some((e) => /Cleared/.test(e.text)));
    // Well prepared, the same bad day is usually survivable.
    Object.assign(readinessOf(state), { training: 90, kit: 90, plans: 90, mutualAid: 90 });
    assert.equal(inquiryVerdict(state, { tier: 'bad' }, 0), 'cleared');
    Object.assign(readinessOf(state), { training: 10, kit: 10, plans: 10, mutualAid: 10 });
    assert.equal(inquiryVerdict(state, { tier: 'bad' }, 0), 'removed');
  },
  'criticised: no promotion for three years'() {
    const { state, job } = commander('lieutenant');
    job.commandFreeze = state.character.age + 3;
    job.yearsInLevel = 10; job.performance = 95;
    const level = getProfession('police').levels.find((l) => l.id === 'captain');
    assert.match(PROMO_GATES.map((g) => g(state, job, level)).filter(Boolean).join(' '), /inquiry's findings/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
