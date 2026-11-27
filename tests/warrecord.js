/**
 * The war record's corrections: known names, outcomes, and a country's own part of a longer war.
 *
 *   node tests/warrecord.js
 */
import assert from 'node:assert/strict';
import { recordedWar, warsStarting } from '../src/modules/world/HistoricalData.js';

const tests = {
  'outcomes the record gets wrong are corrected'() {
    assert.deepEqual(recordedWar(166).won, [], '1965: a ceasefire, no victor');
    assert.deepEqual(recordedWar(40).won, ['MX'], 'the French left Mexico');
    assert.deepEqual(recordedWar(189).won, ['VN']);
  },
  'wars go by the names people know'() {
    assert.equal(recordedWar(160).name, 'the Sino-Indian War');
    assert.equal(recordedWar(130).name, 'the Second Sino-Japanese War', '1937, not the 1931 Manchurian invasion');
    assert.equal(recordedWar(121).name, 'the Japanese invasion of Manchuria');
    assert.equal(recordedWar(202).name, 'the Falklands War');
  },
  'India fought in Sri Lanka from 1987 to 1990, not for the whole war'() {
    assert.ok(!recordedWar(835).a.includes('IN'));
    assert.ok(warsStarting(1987).some((w) => w.a.includes('IN') && /Peace Keeping/.test(w.name)));
    assert.ok(!warsStarting(1983).some((w) => [...w.a, ...w.b].includes('IN')));
  },
  'the Sino-Vietnamese wars are no longer lost to the Vietnam War filter'() {
    assert.ok(warsStarting(1979).some((w) => /Sino-Vietnamese/.test(w.name)));
    assert.ok(warsStarting(1977).some((w) => /Cambodian/.test(w.name)));
    assert.ok(!warsStarting(1960).some((w) => /Vietnam/.test(w.name)), 'the Vietnam War is told by history itself');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.message}`); }
}
console.log(failed ? `✘ ${failed} war-record test(s) failed` : `✔ All ${Object.keys(tests).length} war-record tests passed`);
process.exit(failed ? 1 : 0);
