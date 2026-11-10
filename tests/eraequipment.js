/**
 * Equipment of its day: horse-drawn steam engines in 1880, Shermans in 1944, typewriters before
 * computers, and nothing listed that hadn't been built yet.
 *
 *   node tests/eraequipment.js
 */
import assert from 'node:assert/strict';
import { GROUPS } from '../src/modules/equipment/EquipmentCatalog.js';
import { setEraYear, PRESENT } from '../src/modules/world/Eras.js';

const listed = (gid, y) => {
  setEraYear(y);
  return Object.values(GROUPS[gid].categories).filter((c) => !c.absent).map((c) => ({ name: c.name, models: Object.values(c.models).map((m) => m.name) }));
};
const names = (rows) => rows.flatMap((r) => [r.name, ...r.models]).join(' | ');

const tests = {
  'present day unchanged'() {
    const rows = listed('police', PRESENT);
    assert.match(names(rows), /Police Interceptor SUV/);
    assert.match(names(rows), /P25 radio \+ body camera kit/);
  },
  'horse-drawn in the 1880s'() {
    assert.match(names(listed('fire', 1880)), /Horse-drawn steam fire engine/);
    assert.match(names(listed('police', 1880)), /Horse and wagon/);
    assert.doesNotMatch(names(listed('police', 1880)), /sedan|SUV|radio|camera/i);
    assert.match(names(listed('railroad', 1900)), /Steam locomotive/);
    assert.match(names(listed('vessel', 1900)), /Ocean liner/);
  },
  'no duplicate stand-ins'() {
    for (const gid of Object.keys(GROUPS)) {
      const rows = listed(gid, 1890).map((r) => r.name);
      assert.equal(new Set(rows).size, rows.length, `${gid}: ${rows.join(', ')}`);
    }
  },
  'military of the day'() {
    assert.match(names(listed('milGround', 1944)), /Sherman/);
    assert.doesNotMatch(names(listed('milGround', 1944)), /Abrams|Bradley|HMMWV|Stryker/);
    assert.match(names(listed('milAir', 1960)), /F-4 Phantom|F-86/);
  },
  'nothing before its time'() {
    const later = /\bP25\b|body camera|\bSUV\b|Interceptor|hybrid|\bIP\b|tablet|laptop|cloud|drone|\bELD\b|\bCNC\b|POS terminal|livestream|GPS|HPC|Telehealth|F-35|JLTV/i;
    for (const y of [1880, 1925, 1950, 1970]) {
      for (const gid of Object.keys(GROUPS)) {
        const text = names(listed(gid, y));
        assert.doesNotMatch(text, later, `${gid} in ${y}: ${text}`);
      }
    }
  },
  'period kit and icons for stand-ins'() {
    assert.match(names(listed('gym', 1900)), /Indian clubs/);
    assert.match(names(listed('milGround', 1880)), /Rifles.*field glasses/);
    assert.match(names(listed('milGround', 1880)), /Field telegraph/);
    setEraYear(1880);
    assert.equal(GROUPS.fire.categories.engines?.icon ?? Object.values(GROUPS.fire.categories)[0].icon, '🐎');
    setEraYear(PRESENT);
  },
  'whole outfits that came later'() {
    assert.equal(listed('atc', 1910).length, 0);
    assert.equal(listed('renewables', 1960).length, 0);
    assert.ok(listed('renewables', 2000).length > 0);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
setEraYear(PRESENT);
if (failed) process.exit(1);
