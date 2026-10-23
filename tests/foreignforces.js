/**
 * Nepal; the French Foreign Legion (from anywhere, under a declared identity, French after
 * three years or by blood shed); the Gurkhas (British Army settlement, Singapore Police to 45).
 *
 *   node tests/foreignforces.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { COUNTRIES, isCitizen } from '../src/modules/world/Countries.js';
import { legionCheck, gurkhaCheck } from '../src/modules/world/ForeignForces.js';
import { rankOf, discharge } from '../src/modules/military/MilitaryEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', gender: 'male', ...opts });
  state.legal.record = [];
  return { engine, state, ctx: engine.context() };
}
const year = (engine, state, n = 1) => {
  for (let i = 0; i < n && state.character.alive; i++) {
    for (let k = 0; k < 12 && state.prompts.length; k++) { const q = state.prompts[0]; engine.resolvePrompt(q.id, (q.options.find((o) => !o.disabled && o.tone !== 'danger') ?? q.options[0]).id); }
    state.prompts = [];
    state.stats.health = 95;
    engine.ageUp();
  }
};
const lucky = (engine, fn) => { const rng = engine.context().rng; const c = rng.chance; rng.chance = () => true; try { return fn(); } finally { rng.chance = c; } };

const tests = {
  'Nepal is a playable country'() {
    assert.equal(COUNTRIES.NP?.name, 'Nepal');
    const { engine, state } = life({ countryId: 'NP' }, 2);
    year(engine, state, 5);
    assert.equal(state.character.countryId, 'NP');
  },
  'an American joins the Foreign Legion under a declared identity, and becomes French'() {
    const { engine, state } = life({}, 4);
    year(engine, state, 20);
    state.stats.fitness = 85;
    state.finances.cash = 5000;
    const real = `${state.character.firstName} ${state.character.lastName}`;
    assert.ok(legionCheck(state).ok, legionCheck(state).reason);
    state.prompts = [];
    lucky(engine, () => engine.dispatch('foreignForces.legion'));
    assert.equal(state.character.countryId, 'FR', 'moved to France');
    assert.ok(state.military.service?.legion, 'a legionnaire');
    assert.match(VIEWS.military(state, {}), /Légion|Legion/);
    assert.notEqual(`${state.character.firstName} ${state.character.lastName}`, real, 'a declared identity');
    // Regularised after a year; French after three.
    for (let i = 0; i < 4; i++) {
      for (let k = 0; k < 12 && state.prompts.length; k++) { const q = state.prompts[0]; lucky(engine, () => engine.resolvePrompt(q.id, q.type === 'foreignForces.regularise' ? 'yes' : q.type === 'foreignForces.legionCitizen' ? 'apply' : (q.options.find((o) => !o.disabled && o.tone !== 'danger') ?? q.options[0]).id)); }
      state.prompts = [];
      state.stats.health = 95;
      engine.ageUp();
    }
    for (let k = 0; k < 12 && state.prompts.length; k++) { const q = state.prompts[0]; lucky(engine, () => engine.resolvePrompt(q.id, q.type === 'foreignForces.legionCitizen' ? 'apply' : q.type === 'foreignForces.regularise' ? 'yes' : q.options[0].id)); }
    if (state.military.service?.legion) {
      assert.equal(`${state.character.firstName} ${state.character.lastName}`, real, 'real name back');
      assert.ok(isCitizen(state, 'FR'), 'French by service');
    }
  },
  'a Nepali recruit joins the Brigade of Gurkhas as a Rifleman, and may settle in Britain'() {
    const { engine, state, ctx } = life({ countryId: 'NP' }, 6);
    year(engine, state, 18);
    state.stats.fitness = 90;
    state.prompts = [];
    assert.ok(gurkhaCheck(state).ok, gurkhaCheck(state).reason);
    lucky(engine, () => engine.dispatch('foreignForces.gurkha'));
    const q = state.prompts.find((p) => p.type === 'foreignForces.gurkhaChoice');
    assert.ok(q);
    engine.resolvePrompt(q.id, 'GB');
    assert.equal(state.character.countryId, 'GB');
    assert.equal(state.military.service?.gurkha, 'GB');
    assert.equal(rankOf(state.military.service).title, 'Rifleman');
    state.military.service.yearsOfService = 5;
    discharge(ctx, 'honorable', 'End of engagement.');
    assert.equal(state.migration.residences.GB?.status, 'permanent', 'settlement after four years');
  },
  'the Singapore Gurkha Contingent: housed at Mount Vernon, home to Nepal at 45'() {
    const { engine, state } = life({ countryId: 'NP' }, 7);
    year(engine, state, 18);
    state.stats.fitness = 90;
    state.prompts = [];
    lucky(engine, () => engine.dispatch('foreignForces.gurkha'));
    const q = state.prompts.find((p) => p.type === 'foreignForces.gurkhaChoice');
    engine.resolvePrompt(q.id, 'SG');
    assert.equal(state.character.countryId, 'SG');
    assert.equal(state.career.job?.professionId, 'gurkhaContingent');
    assert.ok(state.career.job.employer.benefits.housing);
    state.character.age = 44;
    year(engine, state, 1);
    assert.equal(state.character.countryId, 'NP', 'home at 45');
    assert.ok(state.retirement.pensions.some((p) => p.id === 'gurkhaSG'));
  },
  'only Nepali men sit the Gurkha selection'() {
    const { engine, state } = life({ countryId: 'IN' }, 8);
    year(engine, state, 18);
    assert.equal(gurkhaCheck(state).ok, false);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} foreign-forces test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} foreign-forces tests passed`);
