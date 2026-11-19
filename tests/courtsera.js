/**
 * Courts and punishment by country and era (legal/CourtsOfTheDay.js).
 *
 *   node tests/courtsera.js
 */
import assert from 'node:assert/strict';
import { courtLine } from '../src/modules/legal/CourtsOfTheDay.js';

const st = (cc, year, age = 30) => ({ character: { countryId: cc, birthYear: year - age, age }, era: { start: year - age } });
const tests = {
  'a Victorian burglar given seven years is transported'() {
    assert.match(courtLine(st('GB', 1840), { severity: 'felony', offenseId: 'burglary', prison: 7 }), /transportation/);
  },
  'a British murderer in 1950 hears the black cap; in 1980 the Crown Court'() {
    assert.match(courtLine(st('GB', 1950), { severity: 'felony', offenseId: 'murder', prison: 25 }), /black cap/);
    assert.match(courtLine(st('GB', 1980), { severity: 'felony', offenseId: 'murder', prison: 25 }), /Crown Court/);
  },
  'a young Briton in 1960 goes to borstal'() {
    assert.match(courtLine(st('GB', 1960, 18), { severity: 'felony', offenseId: 'theft', prison: 2 }), /borstal/);
  },
  'a Soviet sentence in 1940 is the Gulag'() {
    assert.match(courtLine(st('RU', 1940), { severity: 'felony', offenseId: 'theft', prison: 3 }), /Gulag/);
  },
  'nothing extra for an American'() {
    assert.equal(courtLine(st('US', 1950), { severity: 'felony', offenseId: 'theft', prison: 3 }), null);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
