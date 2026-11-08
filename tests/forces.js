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
import { topOfficerGrade, FORCES, forceSizeOf } from '../src/modules/world/NationalForces.js';
import { commandFor } from '../src/modules/military/Commands.js';
import { Random as Rng } from '../src/core/Random.js';
import { tryPromotion, rankOf, enlistmentEligibility } from '../src/modules/military/MilitaryEngine.js';
import { periodTitle, setEraYear } from '../src/modules/world/Eras.js';
import { branchOf } from '../src/modules/military/MilitaryEngine.js';
import { militaryInsignia } from '../src/ui/Insignia.js';
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
  'ranks, branches and titles of their time'() {
    const old = life('US', 1910); // 1940
    assert.equal(rankOf({ branch: 'army', track: 'enlisted', grade: 3 }).title, 'Corporal', 'no Specialists before 1955');
    assert.equal(rankOf({ branch: 'navy', track: 'enlisted', grade: 1 }).title, 'Seaman Second Class');
    assert.match(enlistmentEligibility(old.state, 'airforce', 'enlisted', 'active').reason ?? '', /Doesn't exist yet \(from 1947\)/, 'the Army Air Forces, not a US Air Force');
    assert.match(enlistmentEligibility(old.state, 'spaceforce', 'enlisted', 'active').reason ?? '', /Doesn't exist yet/);
    assert.equal(periodTitle('Police Officer'), 'Patrolman');
    assert.equal(periodTitle('Flight Attendant'), 'Stewardess');
    const now = life('US');
    assert.equal(rankOf({ branch: 'army', track: 'enlisted', grade: 3 }).title, 'Specialist');
    assert.equal(periodTitle('Police Officer'), 'Police Officer');
    assert.doesNotMatch(enlistmentEligibility(now.state, 'airforce', 'enlisted', 'active').reason ?? '', /Doesn't exist yet/);
  },
  'smaller and larger forces: their commands and their senior posts'() {
    setEraYear(2026);
    assert.equal(forceSizeOf('US'), 'large');
    assert.equal(forceSizeOf('NZ'), 'small');
    assert.equal(forceSizeOf('MT'), 'micro');
    const r = new Rng(1);
    const nzColonel = commandFor({ nation: 'NZ', branch: 'army', grade: 6, specialty: 'infantry' }, r);
    assert.doesNotMatch(nzColonel?.unit ?? '', /Division|Corps/, 'New Zealand has no divisions');
    assert.equal(commandFor({ nation: 'MT', branch: 'army', grade: 8, specialty: 'infantry' }, r), null, 'nothing for a Maltese general to command');
    assert.match(commandFor({ nation: 'IN', branch: 'army', grade: 8, specialty: 'infantry' }, r)?.unit ?? '', /Corps/, 'India has corps');
    setEraYear(1880);
    assert.equal(forceSizeOf('US'), 'small', 'the US Army between its wars');
    assert.doesNotMatch(commandFor({ branch: 'army', grade: 7, specialty: 'infantry' }, r)?.unit ?? '', /Airborne|Combatant/);
    setEraYear(1916);
    assert.equal(forceSizeOf('NZ'), 'medium', 'the Great War swelled the dominions\' forces');
    setEraYear(2026);
  },
  'ranks of the 19th century and of other nations, and their insignia'() {
    life('US', 1830); // 1850 by the checks below
    setEraYear(1850);
    assert.equal(rankOf({ branch: 'navy', track: 'officer', grade: 7 }).title, 'Flag Officer', 'no US admirals before 1862');
    assert.equal(rankOf({ branch: 'army', track: 'officer', grade: 8 }).title, 'Major General', 'no lieutenant-generals between Washington and Grant');
    assert.equal(rankOf({ nation: 'GB', branch: 'army', track: 'officer', grade: 0 }).title, 'Ensign');
    assert.equal(periodTitle('Pharmacist'), 'Apothecary');
    assert.match(militaryInsignia('E-5', null, { branch: 'army' }), /scale\(1 -1\)/, 'American chevrons pointed down');
    setEraYear(1930);
    assert.equal(rankOf({ nation: 'RU', branch: 'army', track: 'officer', grade: 7 }).title, 'Kombrig');
    assert.equal(branchOf({ nation: 'RU', branch: 'army' }).name, 'Red Army');
    assert.match(militaryInsignia('OF-8', 'RU', { branch: 'army' }), /#c62828/, 'Red Army collar tabs');
    setEraYear(1940);
    assert.equal(rankOf({ nation: 'DE', branch: 'army', track: 'officer', grade: 6 }).title, 'Generalmajor', 'no Brigadegeneral in the Wehrmacht');
    assert.equal(branchOf({ nation: 'DE', branch: 'army' }).name, 'Wehrmacht (Heer)');
    setEraYear(1910);
    assert.equal(rankOf({ nation: 'RU', branch: 'army', track: 'officer', grade: 6 }).title, 'Polkovnik');
    setEraYear(2026);
    assert.equal(rankOf({ nation: 'RU', branch: 'army', track: 'officer', grade: 7 }).title, 'Major General');
    assert.ok(!FORCES.RU.branches.army.officer.includes('Brigadier General'), 'Russia has no brigadier-generals');
    assert.equal(branchOf({ nation: 'DE', branch: 'army' }).name, FORCES.DE.branches.army.name);
    assert.doesNotMatch(militaryInsignia('E-5', null, { branch: 'army' }), /scale\(1 -1\)/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} forces test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} forces tests passed`);
