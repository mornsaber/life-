/**
 * A colony's own forces (world/ColonialForces.js), colonial police, and Gurkhas by era.
 *
 *   node tests/colonialforces.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { enlistmentEligibility, branchFor, enlist, rankOf, branchOf } from '../src/modules/military/MilitaryEngine.js';
import { colonialForce } from '../src/modules/world/ColonialForces.js';
import { eraHidden, setEraState } from '../src/modules/world/Eras.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { militaryInsignia } from '../src/ui/Insignia.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId, year, age = 20) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
  const s = engine.newLife({ countryId, startYear: year - age, gender: 'male' });
  for (let i = 0; i < age; i++) { s.prompts = []; s.stats.health = 90; engine.ageUp(); }
  const state = engine.state;
  Object.assign(state.stats, { fitness: 80, health: 90, smarts: 60 });
  state.prompts = [];
  setEraState(state);
  return { engine, state, ctx: engine.context() };
}
const join = (ctx, state) => { enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry' }); for (let g = 0; g < 6 && state.prompts.length && !state.military.service; g++) { const p = state.prompts[0]; ctx.engine?.resolvePrompt?.(p.id, p.options[0].id); state.prompts.shift(); } return state.military.service; };

const tests = {
  'a colony\'s army is its own force, not the army it became'() {
    assert.equal(branchFor(life('KE', 1925).state, 'army').name, 'King\'s African Rifles');
    assert.equal(branchFor(life('SN', 1925).state, 'army').name, 'Tirailleurs sénégalais');
    assert.match(branchFor(life('ID', 1925).state, 'army').name, /KNIL/);
    assert.equal(branchFor(life('CD', 1925).state, 'army').name, 'Force Publique');
    assert.equal(branchFor(life('KE', 1990).state, 'army').name, 'Kenya Army');
  },
  'a colony has no navy of its own (British India excepted)'() {
    assert.equal(enlistmentEligibility(life('KE', 1925).state, 'navy', 'enlisted', 'active').ok, false);
    assert.match(colonialForce(life('IN', 1940).state).navy, /Royal Indian Navy/);
  },
  'an askari of the King\'s African Rifles, under British pips'() {
    const { state, ctx } = life('KE', 1925);
    const svc = join(ctx, state);
    assert.ok(svc, 'enlisted');
    assert.match(rankOf(svc).title, /Askari|Lance Corporal|Corporal/);
    assert.match(branchOf(svc).name, /King's African Rifles/);
    assert.match(militaryInsignia('OF-3', 'KE', { branch: 'army' }), /✦/, 'British pips for a captain');
  },
  'the colonial troops job and city police are gone from a colony\'s job board'() {
    const { state } = life('KE', 1925);
    assert.ok(eraHidden(state, getProfession('colonialTroops')));
    assert.ok(eraHidden(state, getProfession('police')));
    assert.ok(!eraHidden(state, getProfession('colonialPolice')));
  },
  'a Gurkha before 1948 joins the Indian Army\'s Gurkha Rifles; in 1970 the British Army, without moving to Britain'() {
    const a = life('NP', 1930, 18);
    a.state.character.citizenships = ['NP'];
    a.engine.resolvers?.['foreignForces.gurkhaChoice'];
    const ff = MODULES.find((m) => m.id === 'foreignForces');
    ff.resolvers.gurkhaChoice(a.ctx, {}, 'BIA');
    assert.ok(a.state.military.service?.gurkha === 'BIA');
    assert.match(branchOf(a.state.military.service).name, /Indian Army/);
    assert.equal(rankOf(a.state.military.service).title, 'Rifleman');
    const b = life('NP', 1970, 18);
    ff.resolvers.gurkhaChoice(b.ctx, {}, 'GB');
    assert.equal(b.state.character.countryId, 'NP', 'no move to Britain in 1970');
    assert.equal(b.state.military.service?.nation, 'GB');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
