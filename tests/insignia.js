/**
 * Rank insignia by country: every country wears its own family of rank (only the countries that
 * actually use it wear the US pattern), and every badge is a well-formed SVG.
 *
 *   node tests/insignia.js
 */
import assert from 'node:assert/strict';
import { COUNTRIES } from '../src/modules/world/Countries.js';
import { militaryInsignia, rankInsignia } from '../src/ui/Insignia.js';

const US_PATTERN = ['US', 'LR', 'MH'];
const CODES = ['OR-2', 'OR-4', 'OR-5', 'OR-7', 'OR-9', 'OF-1', 'OF-2', 'OF-3', 'OF-4', 'OF-5', 'OF-6', 'OF-7', 'OF-8', 'OF-9', 'OF-10'];
const RANKS = ['cpl', 'sgt', 'ssgt', 'lt', 'capt', 'major', 'col', '1star', '2star', '3star', '4star'];
const wellFormed = (s) => s === '' || (/^<svg [^>]*viewBox="0 0 [\d.]+ [\d.]+"/.test(s) && s.endsWith('</svg>') && !/undefined|NaN/.test(s));

const tests = {
  'every country wears its own pattern (the US pattern only where it is really worn)'() {
    const us = { capt: militaryInsignia('OF-3', 'US'), col: militaryInsignia('OF-6', 'US'), police: rankInsignia('capt', 'US') };
    const generic = [];
    for (const cc of Object.keys(COUNTRIES)) {
      if (US_PATTERN.includes(cc)) continue;
      if (militaryInsignia('OF-3', cc) === us.capt || militaryInsignia('OF-6', cc) === us.col) generic.push(`${cc} military`);
      if (rankInsignia('capt', cc) === us.police) generic.push(`${cc} police`);
    }
    assert.deepEqual(generic, [], 'still on the US pattern');
  },
  'every badge is a well-formed SVG, and ranks rise'() {
    for (const cc of Object.keys(COUNTRIES)) {
      for (const c of CODES) assert.ok(wellFormed(militaryInsignia(c, cc)), `${cc} ${c}`);
      for (const r of RANKS) assert.ok(wellFormed(rankInsignia(r, cc)), `${cc} police ${r}`);
      // A colonel never wears the same badge as a captain, nor a general as a colonel.
      assert.notEqual(militaryInsignia('OF-6', cc), militaryInsignia('OF-3', cc), `${cc}: colonel vs captain`);
      assert.notEqual(militaryInsignia('OF-8', cc), militaryInsignia('OF-6', cc), `${cc}: general vs colonel`);
    }
  },
  'republics wear their emblem where monarchies wear the crown'() {
    assert.match(militaryInsignia('OF-4', 'GB'), /♛/);
    for (const cc of ['PK', 'NG', 'BD', 'MT', 'IE']) {
      assert.doesNotMatch(militaryInsignia('OF-4', cc), /♛/, `${cc} major`);
      assert.doesNotMatch(rankInsignia('col', cc), /♛/, `${cc} police`);
    }
    assert.match(militaryInsignia('OF-4', 'EG'), /🦅/, 'Egypt: the eagle');
    assert.match(militaryInsignia('OF-4', 'LB'), /🌲/, 'Lebanon: the cedar');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} insignia test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} insignia tests passed`);
