/**
 * The military on the organization system: units, billets, command boards,
 * leadership powers (and, as later phases land, special operations, UCMJ,
 * overseas tours, boards and retirement).
 *
 *   node tests/military.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { unitView, unitTick, billetFor, syncUnit, PLAYER } from '../src/modules/org/MilitaryUnits.js';
import { ranksOf } from '../src/modules/military/MilitaryEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed = 7, age = 22) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Mil', lastName: 'Test' });
  state.character.age = age;
  Object.assign(state.stats, { smarts: 80, fitness: 85, health: 95, happiness: 70 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 });
  return { engine, state, ctx: engine.context() };
}
function enlist(engine, arg = 'army:enlisted:active') {
  engine.dispatch('military.enlist', arg);
  const p = engine.state.prompts.find((x) => x.type === 'military.chooseSpecialty');
  assert.ok(p, 'specialty prompt');
  engine.resolvePrompt(p.id, p.options.find((o) => !o.disabled).id);
  return engine.state.military.service;
}
const year = (engine) => {
  engine.state.prompts = [];
  engine.ageUp();
  for (let i = 0; i < 10 && engine.state.prompts.length; i++) {
    const p = engine.state.prompts[0];
    engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
  }
};

const tests = {
  'a new soldier joins a unit with a named chain of command'() {
    const { engine, state } = setup(1);
    const svc = enlist(engine);
    year(engine);
    if (!state.military.service) return; // separated (rare)
    const v = unitView(state, svc);
    assert.ok(v, 'unit view');
    assert.equal(v.billet, 'member');
    const labels = v.chain.map((c) => c.label);
    for (const l of ['Squad Leader', 'Platoon Sergeant', 'Platoon Leader', 'First Sergeant', 'Company Commander', 'Battalion Commander']) assert.ok(labels.includes(l), `chain has ${l}: ${labels.join(', ')}`);
    assert.ok(v.team.length >= 3, 'squad mates');
  },

  'rank sets the billet; a squad leader leads named soldiers and can act on them'() {
    const { engine, state, ctx } = setup(2);
    const svc = enlist(engine);
    svc.isNew = false;
    svc.grade = 5; // E-6
    syncUnit(state, svc, ranksOf(svc));
    const v = unitView(state, svc);
    assert.equal(v.billet, 'squadLeader');
    assert.equal(v.dept.platoon.squads[0].leader, PLAYER);
    assert.ok(v.team.length >= 4, 'your squad');
    const s = v.team[0];
    const rel = s.rel;
    engine.dispatch('military.counsel', s.id);
    assert.ok(s.rel > rel, 'counseling builds trust');
    // NCOs recommend Article 15s; the commander decides.
    s.performance = 20;
    s.discipline = 1;
    state.yearly = {};
    let punished = false;
    for (let i = 0; i < 10 && !punished; i++) { state.yearly = {}; const d = s.discipline; engine.dispatch('military.njp', s.id); punished = s.discipline > d; }
    assert.ok(punished, 'the commander eventually approves a justified Article 15');
    assert.ok(unitTick(ctx, svc, ranksOf(svc)) !== undefined);
  },

  'officers: platoon leader, then a selection board for company command; commanders impose NJP; command helps promotion'() {
    const { engine, state, ctx } = setup(3, 23);
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
    const svc = enlist(engine, 'army:officer:active');
    svc.isNew = false;
    assert.equal(billetFor(svc), 'platoonLeader');
    svc.grade = 2; // O-3
    svc.yearsInGrade = 2;
    svc.eval = 95;
    let offer = null;
    for (let i = 0; i < 20 && !offer; i++) { state.prompts = []; unitTick(ctx, svc, ranksOf(svc)); offer = state.prompts.find((p) => p.type === 'military.commandOffer'); }
    assert.ok(offer, 'selected for command');
    engine.resolvePrompt(offer.id, 'accept');
    syncUnit(state, svc, ranksOf(svc));
    const v = unitView(state, svc);
    assert.equal(v.billet, 'companyCommander');
    assert.equal(v.dept.head, PLAYER, 'you command the company');
    assert.ok(!v.chain.some((c) => c.label === 'Company Commander'), 'no NPC commander above you');
    const target = v.team[0];
    target.performance = 20;
    const d = target.discipline;
    state.yearly = {};
    engine.dispatch('military.njp', target.id);
    assert.ok(target.discipline > d, 'commanders impose Article 15s directly');
    // The tour ends; you move to staff and keep the credit.
    state.character.age = svc.unit.commandUntil;
    unitTick(ctx, svc, ranksOf(svc));
    assert.equal(svc.unit.commanded.companyCommander, true);
    assert.notEqual(unitView(state, svc).billet, 'companyCommander');
  },

  'PCS moves you to a new unit'() {
    const { engine, state } = setup(4);
    const svc = enlist(engine);
    year(engine);
    if (!state.military.service) return;
    const first = svc.unit.orgId;
    for (let i = 0; i < 4 && state.military.service; i++) year(engine);
    if (!state.military.service) return;
    assert.notEqual(state.military.service.unit.orgId, first, 'a new unit after PCS');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.message.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} military test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} military tests passed`);
