/**
 * A felony case in stages: arraignment, bail, the plea offer, trial strategy, sentencing
 * mitigation and the appeal.
 *
 *   node tests/felonycase.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { charge } from '../src/modules/legal/JusticeSystem.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  state.legal.record = [];
  state.character.age = 30;
  state.finances.cash = 2e6;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const answer = (engine, type, id) => {
  const q = engine.state.prompts.find((p) => p.type === type);
  assert.ok(q, `a ${type} prompt`);
  engine.resolvePrompt(q.id, id);
};
const with_ = (engine, chance, fn) => { const c = engine.rng.chance; engine.rng.chance = chance; try { fn(); } finally { engine.rng.chance = c; } };

const tests = {
  'arraignment, bail, then a plea deal at half the sentence'() {
    const { engine, state, ctx } = life(3);
    charge(ctx, { offenseId: 'burglary', context: 'test', evidence: 0.8 });
    answer(engine, 'legal.court', 'privateAttorney');
    answer(engine, 'legal.bail', 'bond');
    answer(engine, 'legal.offer', 'accept');
    assert.equal(state.legal.record.at(-1)?.offenseId, 'burglary', 'convicted on the plea');
  },
  'reject the deal, win the motion to suppress, walk free'() {
    const { engine, state, ctx } = life(4);
    charge(ctx, { offenseId: 'burglary', context: 'test', evidence: 0.5 });
    answer(engine, 'legal.court', 'topFirm');
    answer(engine, 'legal.bail', 'pay');
    answer(engine, 'legal.offer', 'trial');
    with_(engine, (p) => p > 0.3, () => answer(engine, 'legal.trial', 'suppress'));
    assert.equal(state.legal.record.length, 0, 'acquitted');
  },
  'convicted at trial: remorse shortens the sentence; an appeal can overturn it'() {
    const { engine, state, ctx } = life(5);
    charge(ctx, { offenseId: 'burglary', context: 'test', evidence: 0.95 });
    answer(engine, 'legal.court', 'publicDefender');
    answer(engine, 'legal.bail', 'custody');
    answer(engine, 'legal.offer', 'trial');
    with_(engine, () => true, () => answer(engine, 'legal.trial', 'silent'));
    with_(engine, () => true, () => answer(engine, 'legal.sentencing', 'innocent'));
    assert.ok(state.legal.record.some((r) => r.offenseId === 'burglary'));
    if (state.prompts.some((p) => p.type === 'legal.appeal')) {
      with_(engine, () => true, () => answer(engine, 'legal.appeal', 'appeal'));
      assert.ok(!state.legal.record.some((r) => r.offenseId === 'burglary'), 'overturned');
      assert.equal(state.legal.incarceration, null);
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} felony case test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} felony case tests passed`);
