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
import { rankOf, discharge, enlist } from '../src/modules/military/MilitaryEngine.js';
import { declareWar } from '../src/modules/world/War.js';
import { captured } from '../src/modules/military/Wartime.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';

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
  'a Mexican volunteer joins Spain\'s army and becomes Spanish after two years'() {
    const { engine, state } = life({ countryId: 'MX' }, 9);
    year(engine, state, 20);
    state.stats.fitness = 80;
    state.finances.cash = 5000;
    state.prompts = [];
    lucky(engine, () => engine.dispatch('foreignForces.spain'));
    assert.equal(state.character.countryId, 'ES');
    assert.equal(state.military.service?.foreignTroop, 'ES');
    year(engine, state, 3);
    if (state.military.service) assert.ok(isCitizen(state, 'ES'));
  },
  'captured in a war: missing in action, then a prisoner, freed at the peace'() {
    const { engine, state, ctx } = life({}, 10);
    year(engine, state, 20);
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
    state.stats.fitness = 90;
    enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry' });
    const svc = state.military.service;
    declareWar(ctx, 'US');
    captured(ctx, svc, 'the front');
    assert.ok(svc.pow);
    delete state.world.wars.US;
    state.prompts = [];
    MODULES.find((m) => m.id === 'wartime').onAgeUp(ctx);
    assert.ok(!svc.pow, 'released at the peace');
    assert.ok(state.honors.some((h) => /Prisoner of War/.test(h.name)));
  },
  'private military contracting abroad: local firms, rotations that take you there, and the mercenary offer'() {
    const { engine, state, ctx } = life({ countryId: 'GB' }, 11);
    year(engine, state, 30);
    state.military.history.push({ branch: 'army', nation: 'GB', track: 'enlisted', specialty: 'infantry', yearsOfService: 8, priorYears: 0, discharge: 'honorable', rankCode: 'OR-4', rankTitle: 'Corporal' });
    const p = getProfession('privateMilitary');
    assert.ok(p.eligible(state).ok);
    hire(ctx, { professionId: 'privateMilitary', levelId: 'psd', employer: createEmployer(engine.rng, state, p, state.character.regionId) });
    assert.match(state.career.job.employer.name, /Halberd|Saxon|Ironbridge|Kestrel/);
    state.career.job.paidThisYear = true;
    const chance = ctx.rng.chance;
    ctx.rng.chance = (x) => x === 0.05;
    MODULES.find((m) => m.id === 'contractors').onAgeUp(ctx);
    ctx.rng.chance = chance;
    assert.ok(state.prompts.some((q) => q.type === 'contractors.mercenary'), 'the offer off the books');
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
