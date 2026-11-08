/**
 * Force sizes and paramilitary police: small forces stop short of four stars; gendarmeries
 * have military ranks and come and go with their history.
 *
 *   node tests/forces.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { topOfficerGrade, FORCES } from '../src/modules/world/NationalForces.js';
import { tryPromotion } from '../src/modules/military/MilitaryEngine.js';
import { professionsFor, getProfession } from '../src/modules/career/JobTrees.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (countryId, startYear) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
  const state = engine.newLife({ countryId, gender: 'male', ...(startYear ? { startYear } : {}) });
  state.character.age = 30;
  engine.hydrate(state);
  return { engine, state, ctx: engine.context() };
};

const tests = {
  'small forces stop short of four stars'() {
    assert.equal(topOfficerGrade('NZ'), 8, 'New Zealand\'s chief is a lieutenant general');
    assert.equal(topOfficerGrade('MT'), 6, 'Malta\'s a brigadier');
    assert.equal(topOfficerGrade('GB'), 9);
    assert.equal(FORCES.NZ.branches.army.officer[topOfficerGrade('NZ')], 'Lieutenant General');
    const { ctx } = life('NZ');
    const svc = { nation: 'NZ', branch: 'army', track: 'officer', grade: 8, yearsInGrade: 9, specialty: 'infantry', eval: 99, passovers: 0 };
    assert.equal(tryPromotion(ctx, svc), false);
    assert.equal(svc.grade, 8, 'no full generals in New Zealand');
  },
  'gendarmeries have military ranks, and their history'() {
    const fr = life('FR');
    assert.ok(professionsFor(fr.state).some((p) => p.id === 'fr_gendarmerie'));
    assert.match(getProfession('it_gendarmerie').levels.at(-1).title, /Generale/);
    assert.ok(!professionsFor(life('US').state).some((p) => /gendarmerie/.test(p.id)), 'no template on the US board');
    assert.ok(professionsFor(life('AT', 1950).state).some((p) => p.id === 'at_gendarmerie'), 'Austria\'s gendarmerie in 1980');
    assert.ok(!professionsFor(life('AT').state).some((p) => p.id === 'at_gendarmerie'), 'merged into the police in 2005');
    assert.ok(!professionsFor(life('MX', 1950).state).some((p) => p.id === 'mx_gendarmerie'), 'no Guardia Nacional before 2019');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} forces test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} forces tests passed`);
