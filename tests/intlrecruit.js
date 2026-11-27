/**
 * Who the international bodies recruit: nationals of their members, in the years they were
 * members. The UN not from Taiwan after 1971 or from mainland China before; the IMF not from the
 * Soviet bloc before the 1990s; the WTO not from Iran; the Swiss Guard only Swiss Catholic men.
 *
 *   node tests/intlrecruit.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { unMember, imfMember, wtoMember } from '../src/modules/content/packs/careers-intl-orgs.js';
import { setEraYear } from '../src/modules/world/Eras.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(2), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - 30 });
  state.character.age = 30;
  setEraYear(year);
  return state;
};
/** The nationality reason, if that's what keeps you out. */
const barred = (cc, year, pid) => {
  const r = getProfession(pid).eligible(life(cc, year));
  return !r.ok && /[Nn]ationals|[Cc]itizens|member/.test(r.reason) ? r.reason : null;
};

const tests = {
  'UN membership follows history'() {
    assert.ok(unMember('TW', 1960) && !unMember('TW', 1980), 'Taipei held the China seat until 1971');
    assert.ok(!unMember('CN', 1960) && unMember('CN', 1980), 'Beijing from 1971');
    assert.ok(!unMember('DE', 1960) && unMember('DE', 1980), 'the two Germanys in 1973');
    assert.ok(!unMember('KR', 1985) && unMember('KR', 1995), 'the two Koreas in 1991');
    assert.ok(unMember('IN', 1946), 'India had a seat before independence');
    assert.ok(!unMember('VA', 2000), 'the Holy See is an observer');
  },
  'the Bretton Woods bodies and the WTO had their own members'() {
    assert.ok(!imfMember('RU', 1980) && imfMember('RU', 2000));
    assert.ok(!imfMember('PL', 1970) && imfMember('PL', 1990), 'Poland left in 1950 and rejoined in 1986');
    assert.ok(!imfMember('KP', 2000));
    assert.ok(!wtoMember('CN', 1998) && wtoMember('CN', 2005), 'China joined the WTO in 2001');
    assert.ok(!wtoMember('IR', 2010));
    assert.ok(wtoMember('US', 1960), 'a GATT founder');
  },
  'a Taiwanese can\'t join the UN after 1971, a Briton can'() {
    assert.ok(barred('TW', 1990, 'unSecretariat'));
    assert.equal(barred('GB', 1990, 'unSecretariat'), null);
    assert.equal(barred('US', 1930, 'unSecretariat'), null, 'the League of Nations hired Americans');
  },
  'the IMF and World Bank don\'t take Soviet citizens; the WTO doesn\'t take Iranians'() {
    assert.ok(barred('RU', 1975, 'intlFinance'));
    assert.equal(barred('RU', 2005, 'intlFinance'), null);
    assert.ok(barred('IR', 2010, 'wto'));
  },
  'the closed bodies stay closed'() {
    assert.ok(barred('US', 2000, 'euInstitutions'), 'EU citizens only');
    assert.ok(barred('JP', 2000, 'nato'), 'NATO members only');
    assert.match(getProfession('swissGuard').eligible(life('IT', 2000)).reason, /Swiss/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.message}`); }
}
console.log(failed ? `✘ ${failed} recruitment test(s) failed` : `✔ All ${Object.keys(tests).length} recruitment tests passed`);
process.exit(failed ? 1 : 0);
