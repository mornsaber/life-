/**
 * New careers wire up end to end: program → credential → job.
 *
 *   node tests/newcareers.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROGRAMS } from '../src/modules/education/Catalog.js';
import { pursueEligibility } from '../src/modules/credentials/LicensingEngine.js';
import { applicationEligibility, bestEntryLevel, levelCheck } from '../src/modules/career/CareerEngine.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { businessesFor } from '../src/modules/business/BusinessTypes.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const setup = () => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(9), modules: MODULES });
  const state = engine.newLife({ firstName: 'New', lastName: 'Career' });
  state.character.age = 28;
  Object.assign(state.stats, { smarts: 80, fitness: 60, health: 90 });
  state.finances.cash = 5000;
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
  return state;
};
const degree = (state, programId, major = null) => state.education.degrees.push({ type: PROGRAMS[programId]?.type ?? programId, programId, major, schoolId: 'state', gpa: 3.5, year: 26 });

// [career, program(s), credential, first licensed level]
const PATHS = [
  ['imaging', [['radiologyTech']], 'arrt'],
  ['respiratoryTherapy', [['respiratoryTech']], 'rrt'],
  ['dentalHygiene', [['dentalHygieneProgram']], 'rdh'],
  ['occupationalTherapy', [['bachelor', 'psychology'], ['mot']], 'otLicense'],
  ['optometry', [['bachelor', 'biology'], ['od']], 'odLicense'],
  ['chiropractic', [['bachelor', 'kinesiology'], ['dc']], 'dcLicense'],
  ['dietitian', [['bachelor', 'nutrition'], ['dieteticsMS']], 'rdn'],
];

let failed = 0;
for (const [career, programs, credential] of PATHS) {
  try {
    const state = setup();
    for (const [p, major] of programs) degree(state, p, major);
    assert.ok(pursueEligibility(state, credential).ok, `${credential}: ${pursueEligibility(state, credential).reason}`);
    state.credentials.held[credential] = { status: 'active', earnedAge: 27 };
    const prof = getProfession(career);
    assert.ok(applicationEligibility(state, career).ok, `${career}: ${applicationEligibility(state, career).reason}`);
    const level = bestEntryLevel(state, prof, 'large');
    assert.ok(level && levelCheck(state, level).ok, `${career}: an entry level`);
    console.log(`  ✔ ${career}: program → ${credential} → ${level.title}`);
  } catch (e) { failed += 1; console.log(`  ✘ ${career}\n    ${e.message}`); }
}
// No-license careers are open; every new career maps to at least one business or organization.
for (const id of ['contentCreator', 'gameDevelopment', 'surveying', 'renewableEnergy', 'interpreter', 'counseling']) {
  const ok = applicationEligibility(setup(), id).ok;
  console.log(`  ${ok ? '✔' : '✘'} ${id} hires without a license at the entry rung`);
  if (!ok) failed += 1;
}
for (const id of ['optometry', 'chiropractic', 'dietitian', 'surveying', 'renewableEnergy', 'interpreter', 'gameDevelopment', 'counseling', 'psychology']) {
  const ok = businessesFor(id).length > 0;
  console.log(`  ${ok ? '✔' : '✘'} ${id} can open a business`);
  if (!ok) failed += 1;
}
if (failed) { console.log(`\n${failed} new-career check(s) failed`); process.exit(1); }
console.log('\n✔ New careers wire up end to end');
