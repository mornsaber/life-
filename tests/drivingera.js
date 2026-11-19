/**
 * Driving by country and era (vehicles/DrivingOfTheDay.js): the test's start year, the driving age,
 * and how many households had a car.
 *
 *   node tests/drivingera.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { drivingAge, drivingTestHere, carShare } from '../src/modules/vehicles/DrivingOfTheDay.js';
import { pursueEligibility, pursueCredential, hasCredential } from '../src/modules/credentials/LicensingEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const grown = (cc, year, age, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender: 'female' });
  state.character.age = age;
  state.finances.cash = 1e5;
  return { engine, state };
};

const tests = {
  'the test, the age and the car, by country and year'() {
    assert.equal(drivingTestHere(grown('GB', 1930, 20).state), false, 'no British test before 1935');
    assert.equal(drivingTestHere(grown('GB', 1950, 20).state), true);
    assert.equal(drivingTestHere(grown('IE', 1960, 20).state), false, 'Ireland only from 1964');
    assert.equal(drivingAge(grown('GB', 1990, 20).state), 17);
    assert.equal(drivingAge(grown('FR', 1990, 20).state), 18);
    assert.equal(drivingAge(grown('US', 1990, 20).state), 16);
    assert.ok(carShare(grown('US', 1935, 20).state) > 0.5, 'most American families by 1930');
    assert.ok(carShare(grown('IN', 1990, 20).state) < 0.05, 'few Indian households');
    assert.ok(carShare(grown('GB', 1955, 20).state) < carShare(grown('GB', 1975, 20).state));
  },
  'below the driving age: not yet; before the test: a licence over the counter'() {
    const fr = grown('FR', 1990, 17).state;
    assert.match(pursueEligibility(fr, 'learnerPermit').reason ?? '', /driving age here is 18/);
    const { engine, state } = grown('GB', 1931, 25);
    assert.match(pursueEligibility(state, 'learnerPermit').reason ?? '', /No driving test/);
    assert.equal(pursueEligibility(state, 'driverLicense').ok, true, 'no permit needed');
    pursueCredential(engine.context(), 'driverLicense');
    assert.ok(hasCredential(state, 'driverLicense'), 'granted without a test');
  },
  'learning to drive only where there is a car'() {
    let asked = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const { engine, state } = grown('IN', 1960, 18, seed);
      state.people.wealth = 'middle';
      state.prompts = [];
      engine.ageUp();
      if (state.prompts.some((p) => p.type === 'jobLicensing.driving')) asked++;
    }
    assert.ok(asked <= 2, `${asked}/12 asked in 1960 India`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
