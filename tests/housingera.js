/**
 * Renting and buying in their day (realestate/HousingOfTheDay.js).
 *
 *   node tests/housingera.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { rentControlled } from '../src/modules/realestate/HousingOfTheDay.js';
import { RENT_CONTROL } from '../src/modules/realestate/HousingEngine.js';
import { periodRentNameHere } from '../src/modules/realestate/HomesOfTheDay.js';
import { quote } from '../src/modules/realestate/MortgageSystem.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(cc, year, age = 30) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
  engine.newLife({ countryId: cc, startYear: year - age });
  for (let i = 0; i < age; i++) { engine.state.prompts = []; engine.state.stats.health = 90; engine.ageUp(); }
  return { engine, state: engine.state };
}

const tests = {
  'Britain\'s Rent Acts: controlled in 1950, decontrolled in 1960, protected again in 1975'() {
    assert.equal(rentControlled(life('GB', 1950).state), true);
    assert.equal(rentControlled(life('GB', 1960).state), false);
    assert.equal(rentControlled(life('GB', 1975).state), true);
  },
  'rent control in New York City only'() {
    const { state } = life('US', 1960);
    state.character.regionId = 'nyc';
    assert.equal(rentControlled(state), true);
    state.character.regionId = 'rural';
    assert.equal(rentControlled(state), false);
  },
  'a controlled renewal cannot go up'() {
    const { state } = life('GB', 1950);
    assert.ok(RENT_CONTROL.fn(state, { rent: 100 }, 130) <= 100);
  },
  'a single Briton in 1950 lodges; in 1990 shares a flat'() {
    assert.match(periodRentNameHere(life('GB', 1950).state, 'roommates', 'Roommates'), /Lodgings/);
    assert.doesNotMatch(periodRentNameHere(life('GB', 1990).state, 'roommates', 'Roommates') ?? '', /Lodgings/);
  },
  'a 1960 conventional mortgage wants 20% down'() {
    const { state } = life('US', 1960);
    assert.equal(quote(state, 100000, 'conv30').down, 20000);
  },
  'a lodger pays rent each year'() {
    const { engine, state } = life('GB', 1930);
    state.housing.rental = { tier: 'house', rent: 500, leaseYearsLeft: 1, regionId: state.character.regionId };
    state.prompts = [];
    engine.dispatch('housingDay.lodger');
    assert.ok(state.housingDay.lodger);
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.log.some((b) => b.entries.some((e) => /lodger/i.test(e.text))));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
