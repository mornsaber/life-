/**
 * Mentors, old flames, siblings' turns (people/Relationships.js) and a marriage in trouble.
 *
 *   node tests/relationships.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { RelationshipsModule } from '../src/modules/people/Relationships.js';
import { makePerson } from '../src/modules/people/PeopleEngine.js';
import { SCENES } from '../src/modules/career/Scenes.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', gender: 'female' });
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
/** Run the module's year until a prompt of this type appears. */
function until(ctx, state, type, setup = () => {}) {
  for (let i = 0; i < 60 && !state.prompts.some((p) => p.type === type); i++) { state.world.seed = 1000 + i; setup(i); RelationshipsModule.onAgeUp(ctx); state.prompts = state.prompts.filter((p) => p.type === type); }
  return state.prompts.find((p) => p.type === type);
}

const tests = {
  'a mentor teaches you, asks a favour, and retires'() {
    const { ctx, state, engine } = life();
    state.career.job = { professionId: 'corporate', title: 'Analyst', grade: 2, performance: 50, salary: 50000, employer: { name: 'Acme' }, abilities: [] };
    const p = until(ctx, state, 'relationships.mentor', (i) => { state.character.age = 22 + (i % 12); state.relLife = {}; });
    assert.ok(p, 'an offer of mentoring');
    engine.resolvePrompt(p.id, 'yes');
    assert.ok(state.mentor?.name);
    const before = state.career.job.performance;
    RelationshipsModule.onAgeUp(ctx);
    assert.ok(state.career.job.performance > before, 'better at the job');
  },
  'an old flame gets in touch'() {
    const { ctx, state, engine } = life(4);
    const ex = makePerson(ctx, { relation: 'friend', gender: 'male', age: 40 });
    ex.formerPartner = true;
    ex.endedAge = 25;
    state.people.list.push(ex);
    const p = until(ctx, state, 'relationships.flame', (i) => { state.character.age = 34 + i; state.relLife = {}; });
    assert.ok(p, 'a message from the past');
    engine.resolvePrompt(p.id, 'coffee');
    assert.ok(ex.relationship > 0);
  },
  'a sibling\'s life takes a turn'() {
    const { ctx, state, engine } = life(5);
    if (!state.people.list.some((x) => x.relation === 'sibling')) state.people.list.push(makePerson(ctx, { relation: 'sibling', gender: 'male', age: 30 }));
    const p = until(ctx, state, 'relationships.sibling', (i) => { state.character.age = 30 + i; state.relLife = {}; });
    assert.ok(p, 'a sibling moment');
    engine.resolvePrompt(p.id, p.options[0].id);
  },
  'a drifting marriage becomes a scene'() {
    const { state } = life(6);
    state.character.age = 40;
    state.people.list.push({ id: 'sp', firstName: 'Sam', lastName: 'Lee', gender: 'male', relation: 'spouse', ageOffset: 0, relationship: 40, spark: 20, since: 28, alive: true });
    assert.ok(SCENES['marriage.crisis'].for(state, null));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} relationship test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} relationship tests passed`);
