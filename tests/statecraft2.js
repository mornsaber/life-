/**
 * Governing: political capital, signature initiatives and a legacy, scandals, leadership
 * challenges.
 *
 *   node tests/statecraft2.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 5, countryId = 'GB') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.legal.record = [];
  state.character.age = 50;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const mod = MODULES.find((m) => m.id === 'statecraft');
const always = (engine, fn) => { const c = engine.rng.chance; engine.rng.chance = () => true; try { fn(); } finally { engine.rng.chance = c; } };

const tests = {
  'a prime minister builds capital and passes a signature initiative into the legacy'() {
    const { engine, state, ctx } = life(3);
    state.politics.office = { id: 'gb_pm', startAge: 48, approval: 65, terms: 1 };
    mod.onAgeUp(ctx);
    assert.ok(state.politics.capital > 0);
    state.politics.capital = 80;
    state.prompts = [];
    always(engine, () => engine.dispatch('statecraft.initiative', 'health'));
    assert.equal(state.politics.legacy?.length, 1);
    assert.match(VIEWS.politics(state, {}), /Your legacy/);
  },
  'a scandal denied when the documents exist turns into a prosecution'() {
    const { engine, state, ctx } = life(4);
    state.politics.office = { id: 'gb_pm', startAge: 48, approval: 55, terms: 1 };
    ctx.prompt({ type: 'statecraft.scandal', title: 'x', text: 'x', options: [{ id: 'deny', label: 'deny' }], data: { dirty: true } });
    always(engine, () => engine.resolvePrompt(state.prompts.at(-1).id, 'deny'));
    assert.ok(state.politics.office.approval < 55);
    assert.ok(state.prompts.some((p) => p.type === 'legal.court'), 'charged');
  },
  'an unpopular prime minister loses a leadership challenge and leaves office'() {
    const { engine, state, ctx } = life(5);
    state.politics.office = { id: 'gb_pm', startAge: 48, approval: 20, terms: 1 };
    ctx.prompt({ type: 'statecraft.challenge', title: 'x', text: 'x', options: [{ id: 'fight', label: 'fight' }] });
    const c = engine.rng.chance; engine.rng.chance = () => false;
    engine.resolvePrompt(state.prompts.at(-1).id, 'fight');
    engine.rng.chance = c;
    assert.ok(!state.politics.office, 'out of office');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} governing test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} governing tests passed`);
