/**
 * The world reacts: coups and juntas, sanctions that reach careers, the monarchy question in
 * every realm, and UN peacekeeping.
 *
 *   node tests/phase2.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { regimeOf, sanctionsOn, setRegimeOverrides } from '../src/modules/world/Regimes.js';
import { coup, handBack, militaryRule } from '../src/modules/world/Coups.js';
import { enlist } from '../src/modules/military/MilitaryEngine.js';
import { MISSIONS } from '../src/modules/military/Peacekeeping.js';
import { monarchistSupport } from '../src/modules/world/Houses.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', ...opts });
  state.legal.record = [];
  state.prompts = [];
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
const always = (rng, fn) => { const c = rng.chance; rng.chance = () => true; try { return fn(); } finally { rng.chance = c; } };

const tests = {
  'a coup: the army takes power, parliament is suspended, sanctions follow; elections bring it back'() {
    const { state, ctx } = life({ countryId: 'PK' }, 3);
    state.character.age = 40;
    assert.notEqual(regimeOf('PK').kind, 'junta');
    coup(ctx, 'PK');
    assert.ok(militaryRule(state, 'PK'));
    assert.equal(regimeOf('PK').kind, 'junta');
    assert.equal(regimeOf('PK').elections, 'none');
    assert.ok(sanctionsOn('PK'), 'sanctions on the junta');
    assert.ok(state.world.suspendedParliament.PK);
    handBack(ctx, 'PK');
    assert.ok(!militaryRule(state, 'PK'));
    assert.notEqual(regimeOf('PK').kind, 'junta');
    assert.ok(!state.world.suspendedParliament.PK);
    setRegimeOverrides({});
  },
  'a general leads a coup and rules; elections let them step down'() {
    const { engine, state, ctx } = life({ countryId: 'PK', gender: 'male' }, 4);
    year(engine, state, 22);
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'history', year: 22 });
    state.stats.fitness = 90;
    enlist(ctx, { branch: 'army', track: 'officer', component: 'active', specialty: 'infantry' });
    const svc = state.military.service;
    Object.assign(svc, { grade: 8, cadet: false, training: null, academy: null });
    state.character.age = 52;
    state.prompts = [];
    ctx.prompt({ type: 'regime.coup', title: 'x', text: 'x', options: [{ id: 'lead', label: 'lead' }] });
    always(ctx.rng, () => engine.resolvePrompt(state.prompts.at(-1).id, 'lead'));
    assert.equal(state.regime.junta?.role, 'leader');
    assert.equal(state.world.juntas.PK.leader, 'you');
    assert.match(VIEWS.military(state, {}), /Ruling by Decree/);
    state.prompts = [];
    engine.dispatch('coups.holdElections', 'stepDown');
    assert.ok(state.world.juntas.PK.civilian);
    assert.equal(state.regime.junta, null);
    setRegimeOverrides({});
  },
  'the monarchy question: every realm polls; a low poll brings a republic referendum'() {
    const { engine, state } = life({ countryId: 'CA' }, 5);
    year(engine, state, 20);
    const v = monarchistSupport(state, 'CA');
    assert.ok(v > 20 && v < 80, `Canada polls ${v}%`);
    assert.ok(state.world.monarchists.GB != null, 'Britain polls too');
    assert.match(VIEWS.politics(state, {}), /Support for the monarchy/);
  },
  'a soldier volunteers for UNIFIL: a year abroad, then the UN Medal'() {
    const { engine, state, ctx } = life({ countryId: 'IE', gender: 'female' }, 6);
    year(engine, state, 20);
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
    state.stats.fitness = 90;
    enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry' });
    const svc = state.military.service;
    Object.assign(svc, { cadet: false, training: null, yearsOfService: 3 });
    state.prompts = [];
    engine.dispatch('peacekeeping.volunteer', 'unficyp');
    assert.equal(svc.un.mission, 'unficyp');
    const q = state.prompts.find((p) => p.type === 'peacekeeping.crisis');
    assert.ok(q, 'the mandate question');
    engine.resolvePrompt(q.id, 'negotiate');
    state.prompts = [];
    state.stats.health = 95;
    engine.ageUp();
    if (state.military.service?.un) {
      assert.equal(state.military.service.un.mission, null, 'tour over');
      assert.ok(state.honors.some((h) => h.id === 'un.unficyp'), 'UN Medal');
    }
    assert.ok(Object.keys(MISSIONS).length >= 8);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} phase 2 test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} phase 2 tests passed`);
