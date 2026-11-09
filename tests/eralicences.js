/**
 * Licences and degrees of their day: the Board of Trade certificates, the shotfirer's ticket, the
 * LL.B. before the J.D., no MBA before 1908.
 *
 *   node tests/eralicences.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { pursueEligibility } from '../src/modules/credentials/LicensingEngine.js';
import { credentialExists } from '../src/modules/world/Eras.js';
import { PROGRAMS, MAJORS } from '../src/modules/education/Catalog.js';
import { enrollmentEligibility } from '../src/modules/education/EducationEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (opts, age = 25) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(5), modules: MODULES });
  const state = engine.newLife({ gender: 'male', ...opts });
  state.character.age = age;
  state.prompts = [];
  engine.ageUp(); state.prompts = [];
  return { engine, state };
};

const tests = {
  'period licences exist only in their years'() {
    const { state: old } = life({ countryId: 'GB', startYear: 1880 });
    const { state: now } = life({ countryId: 'GB' });
    for (const id of ['mastersCertificate', 'shotfirer', 'hackneyLicence', 'telegraphist']) {
      assert.ok(credentialExists(old, id), `${id} in 1880`);
      assert.ok(!credentialExists(now, id), `${id} abolished by today`);
    }
    assert.ok(!credentialExists(old, 'cdlA') && credentialExists(now, 'cdlA'));
    assert.match(pursueEligibility(now, 'shotfirer').reason, /No longer issued/);
  },
  'a collier can sit the shotfirer\'s ticket in 1900'() {
    const { engine, state } = life({ countryId: 'GB', startYear: 1880 }, 25);
    const ctx = engine.context();
    const p = getProfession('coalMining');
    state.career.history.push({ professionId: 'coalMining', startAge: 18, endAge: 24, peakGrade: 3 });
    hire(ctx, { professionId: 'coalMining', levelId: 'collier', employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
    const e = pursueEligibility(state, 'shotfirer');
    assert.ok(e.ok || /In training|Held/.test(e.reason ?? ''), e.reason);
  },
  'degrees by era: names and openings'() {
    const { state } = life({ countryId: 'US', startYear: 1878 }, 22);
    assert.match(PROGRAMS.jd.name, /LL\.B/);
    assert.match(MAJORS.physics.name, /Natural Philosophy|Physics/);
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 21 });
    assert.match(enrollmentEligibility(state, 'mba', 'private', null).reason ?? '', /Not offered yet/);
    const { state: now } = life({ countryId: 'US' }, 22);
    assert.match(PROGRAMS.jd.name, /Juris Doctor/);
    assert.ok(now);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
