/**
 * Coalition government: forming one, crises, collapse, confidence votes, snap elections;
 * a minister loses the post when the coalition falls.
 *
 *   node tests/coalitions.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { leadsCoalitionState } from '../src/modules/politics/Coalitions.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function chancellor(seed = 2) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'DE', gender: 'female' });
  state.character.age = 55;
  state.prompts = [];
  state.politics.office = { id: 'de_kanzler', approval: 55, termYearsLeft: 4, terms: 1, startAge: 54 };
  return { engine, state };
}
const answer = (engine, state, type, id) => {
  const p = state.prompts.find((x) => x.type === type);
  assert.ok(p, `expected ${type}; have ${state.prompts.map((x) => x.type).join(', ')}`);
  state.prompts = [p];
  engine.resolvePrompt(p.id, id);
};

const tests = {
  'a German chancellor forms a coalition and can hold a summit'() {
    const { engine, state } = chancellor();
    assert.ok(leadsCoalitionState(state));
    engine.ageUp();
    answer(engine, state, 'coalitions.form', 'partner');
    assert.equal(state.coalition.kind, 'partner');
    assert.equal(state.coalition.partners.length, 1);
    const before = state.coalition.stability;
    state.prompts = [];
    engine.dispatch('coalitions.summit');
    assert.equal(state.coalition.stability, Math.min(100, before + 12));
    assert.match(VIEWS.politics(state, {}), /Coalition government/);
  },
  'stability at zero brings a confidence vote; resigning leaves the chancellery'() {
    const { engine, state } = chancellor(4);
    engine.ageUp();
    answer(engine, state, 'coalitions.form', 'minority');
    state.coalition.stability = 1;
    state.prompts = [];
    engine.ageUp();
    answer(engine, state, 'coalitions.confidence', 'resign');
    assert.notEqual(state.politics.office?.id, 'de_kanzler');
  },
  'a minority government can survive the vote and carry on'() {
    const { engine, state } = chancellor(6);
    engine.ageUp();
    answer(engine, state, 'coalitions.form', 'grand');
    state.coalition.stability = 1;
    state.prompts = [];
    engine.ageUp();
    answer(engine, state, 'coalitions.confidence', 'minority');
    assert.equal(state.coalition.kind, 'minority');
    assert.equal(state.politics.office.id, 'de_kanzler');
  },
  'British prime ministers do not form coalitions here'() {
    const { state } = chancellor();
    state.character.countryId = 'GB';
    state.politics.office = { id: 'gb_pm', approval: 55, termYearsLeft: 4, terms: 1, startAge: 54 };
    assert.equal(leadsCoalitionState(state), false);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} coalition test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} coalition tests passed`);
