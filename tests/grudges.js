/**
 * People who remember (people/Grudges.js): what you did comes back, years later.
 *
 *   node tests/grudges.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { rememberOn, rememberFamily } from '../src/modules/people/Grudges.js';
import { divorce } from '../src/modules/people/PeopleEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 2) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'GB', startYear: 1960 });
  state.world.seed = seed;
  for (let i = 0; i < 20; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  return { engine, state };
}
const mother = (state) => state.people.list.find((p) => p.relation === 'mother' && p.alive) ?? state.people.list.find((p) => p.relation === 'father' && p.alive);

const tests = {
  'prison is remembered by the family'() {
    const { engine, state } = life();
    engine.context().emit('legal:incarcerated', { years: 3 });
    const m = mother(state);
    assert.ok(m.memories.some((x) => x.kind === 'prison' && x.tone === 'bad'));
  },
  'a fond memory never pushes out an unforgiven wound'() {
    const { state } = life();
    const m = mother(state);
    m.memories = [];
    rememberOn(state, m, 'prison', 'bad', 'You went to prison.');
    for (let i = 0; i < 12; i++) rememberOn(state, m, 'x', 'good', `Good ${i}`);
    assert.equal(m.memories.length, 8);
    assert.ok(m.memories.some((x) => x.kind === 'prison'));
  },
  'years later, someone brings it up, and saying sorry can end it'() {
    let raised = 0;
    let forgiven = 0;
    for (let seed = 1; seed < 25; seed++) {
      const { engine, state } = life(seed);
      rememberFamily(state, 'scandal', 'bad', 'The papers were full of it.', ['mother', 'father', 'sibling']);
      for (let y = 0; y < 12; y++) {
        state.prompts = []; state.stats.health = 90; engine.ageUp();
        const p = state.prompts.find((q) => q.type === 'grudges.raised');
        if (p) { raised += 1; assert.ok(/years ago/.test(p.text)); engine.resolvePrompt(p.id, 'sorry'); }
      }
      forgiven += state.people.list.filter((p) => p.memories?.some((m) => m.kind === 'scandal' && m.forgiven)).length;
    }
    assert.ok(raised >= 5, `raised ${raised}`);
    assert.ok(forgiven >= 1, 'some forgave');
  },
  'divorce is remembered by the children'() {
    const { engine, state } = life();
    state.character.age = 45;
    const spouse = { id: 'sp1', firstName: 'S', lastName: 'T', relation: 'spouse', gender: 'female', alive: true, relationship: 30, since: 25, ageOffset: 0, income: 0 };
    state.people.list.push(spouse, { id: 'ch1', firstName: 'C', lastName: 'T', relation: 'child', gender: 'male', alive: true, relationship: 70, ageOffset: -30, otherParentId: 'sp1' });
    divorce(engine.context(), spouse);
    assert.equal(spouse.relation, 'ex');
    assert.ok(state.people.list.find((p) => p.id === 'ch1').memories?.some((m) => m.kind === 'divorce'));
  },
  'the person panel shows wounds and forgiveness'() {
    const { state } = life();
    const m = mother(state);
    rememberOn(state, m, 'prison', 'bad', 'You went to prison.');
    state.ui = { ...(state.ui ?? {}) };
    const html = VIEWS.people(state, { person: m.id });
    assert.match(html, /You went to prison/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
