/**
 * Careers ask only for what their day asked for: no modern degrees, licences, union cards or
 * courses gating work before they existed (or were insisted on), and no American licences abroad.
 *
 *   node tests/eragates.js
 */
import assert from 'node:assert/strict';
import { eraGates } from '../tools/era-gates.mjs';
import { educationAskedFor } from '../src/modules/world/Eras.js';

const rows = (cc, y) => eraGates([cc], [y]).map((r) => r.why);
const tests = {
  'before the licences: no CPA, PE, PhD, culinary diploma or building-code certificate'() {
    const r1910 = rows('US', 1910).join(' | ');
    assert.doesNotMatch(r1910, /Professional Engineer|CPA|Registered Architect|Doctor of Philosophy|Registered Nurse/);
    const r1960 = rows('US', 1960).join(' | ');
    assert.doesNotMatch(r1960, /Culinary Arts|ICC Building Inspector|Command College|Supervisory Course|paralegal certificate|OT master|Computer Science/);
  },
  'no American licences where the work was never licensed'() {
    const gb = rows('GB', 1960).join(' | ');
    assert.doesNotMatch(gb, /Real Estate|Cosmetology|Journeyman|Private Investigator|Bail Agent|Professional Engineer|Insurance Producer/);
  },
  'degrees asked for only once employers insisted'() {
    const state = (y) => ({ character: { birthYear: y - 30, age: 30 }, era: {} });
    assert.equal(educationAskedFor(state(1935), { level: 'bachelor' }), null);
    assert.equal(educationAskedFor(state(1960), { program: 'culinaryArts' }), null);
    assert.equal(educationAskedFor(state(1960), { level: 'bachelor', majors: ['computerScience'] })?.majors, undefined, 'any degree before computer science existed');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) process.exit(1);
