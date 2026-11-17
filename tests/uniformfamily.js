/**
 * A family in uniform, from your side (people/UniformFamily.js).
 *
 *   node tests/uniformfamily.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire, leaveJob } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { UniformFamilyModule, serviceBackground, associationOf } from '../src/modules/people/UniformFamily.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'GB', startYear = 1950, years = 25) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(23), modules: MODULES });
  const state = engine.newLife({ countryId, startYear });
  for (let i = 0; i < years; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const texts = (s) => s.log.flatMap((y) => y.entries.map((e) => e.text));
const kid = (state, extra = {}) => { const p = { ...state.people.list.find((x) => x.alive), id: `kid${Math.random()}`, relation: 'child', alive: true, firstName: 'Jo', gender: 'female', job: null, career: null, service: null, life: { edu: 'highschool' }, relationship: 70, ...extra }; state.people.list.push(p); return p; };

const tests = {
  'a parent who served: the tradition is noticed when you join'() {
    const { state, ctx } = life();
    const dad = state.people.list.find((p) => p.relation === 'father') ?? state.people.list[0];
    dad.career = { professionId: 'police', levelId: 'officer' };
    dad.relation = 'father';
    const profession = getProfession('police');
    hire(ctx, { professionId: 'police', levelId: 'officer', employer: createEmployer(new Random(1), state, profession, state.character.regionId) });
    assert.ok(texts(state).some((t) => /served in the force too/.test(t)));
  },
  'a grown child follows you into the police'() {
    const { state, ctx } = life('GB', 1940, 45);
    const profession = getProfession('police');
    hire(ctx, { professionId: 'police', levelId: 'officer', employer: createEmployer(new Random(1), state, profession, state.character.regionId) });
    state.career.job.startAge = state.character.age - 20;
    const p = kid(state, { ageOffset: 20 - state.character.age });
    for (let i = 0; i < 80 && !p.career; i++) { state.world.seed = (state.world.seed ?? 1) + 1; UniformFamilyModule.onAgeUp(ctx); }
    assert.equal(p.career?.professionId, 'police');
    assert.ok(texts(state).some((t) => /like you/.test(t)));
  },
  'the association by country and era'() {
    const at = (cc, y) => associationOf({ character: { countryId: cc, birthYear: y - 40, age: 40 } }, 'military');
    assert.equal(at('GB', 1950), 'the Royal British Legion');
    assert.equal(at('GB', 1910), 'the veterans\' association');
    assert.equal(at('US', 1950), 'the American Legion');
    assert.equal(at('AU', 1950), 'the RSL');
    assert.match(associationOf({ character: { countryId: 'US', birthYear: 1950, age: 40 } }, 'fire'), /firefighters/);
  },
  'after service: an invitation to join, then parades and reunions'() {
    const { engine, state, ctx } = life('GB', 1940, 30);
    const profession = getProfession('fire');
    hire(ctx, { professionId: 'fire', levelId: 'firefighter', employer: createEmployer(new Random(1), state, profession, state.character.regionId) });
    state.career.job.startAge = state.character.age - 15;
    leaveJob(ctx, 'Retired');
    assert.ok(serviceBackground(state)?.years >= 10);
    UniformFamilyModule.onAgeUp(ctx);
    const p = state.prompts.find((x) => x.type === 'uniformFamily.join');
    assert.ok(p, 'invited');
    engine.resolvePrompt(p.id, 'join');
    assert.ok(state.uniformFamily.joined);
    for (let i = 0; i < 40; i++) { state.world.seed += 1; UniformFamilyModule.onAgeUp(ctx); }
    assert.ok(state.uniformFamily.reunions >= 1);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
