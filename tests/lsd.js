/**
 * Money before decimalisation: pounds, shillings and pence, not "£0"; small decimal sums keep their cents.
 *
 *   node tests/lsd.js
 */
import assert from 'node:assert/strict';
import { lsd, localizeMoney, COUNTRIES } from '../src/modules/world/Countries.js';
import { setEraYear } from '../src/modules/world/Eras.js';

const tests = {
  'shillings and pence'() {
    assert.equal(lsd(0.4), '8s');
    assert.equal(lsd(2.035), '£2 0s 8d');
    assert.equal(lsd(14.97), '£14 19s');
    assert.equal(lsd(0.02), '5d');
  },
  'a tutor in 1883 earns pence an hour, not £0'() {
    setEraYear(1883);
    const t = localizeMoney('$3/hr', COUNTRIES.GB);
    assert.ok(!/£0\b/.test(t), t);
    assert.match(t, /\dd\/hr|\ds\/hr/);
  },
  'after 1971 the pound is decimal again'() {
    setEraYear(1990);
    assert.match(localizeMoney('$1,500', COUNTRIES.GB), /^£\d/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.message}`); }
}
setEraYear(null);
console.log(failed ? `✘ ${failed} money test(s) failed` : `✔ All ${Object.keys(tests).length} money tests passed`);
process.exit(failed ? 1 : 0);
