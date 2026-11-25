/**
 * Politics and government work of their day: pay, qualifications, the Senate before 1913, the
 * secret ballot, patronage and the spoils system, continuing education done for you.
 *
 *   node tests/politicsofday.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { sync } from '../src/modules/world/History.js';
import { periodText, periodTitle } from '../src/modules/world/Eras.js';
import { officePay, standCheck, senateByLegislature, secretBallot, patronageBonus, meritHere, campaignWords, endorsementNow, neutralityBar } from '../src/modules/politics/PoliticsOfTheDay.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year, age = 40) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(6), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, firstName: 'Ada', lastName: 'Penrose', gender: 'male' });
  state.character.age = age; state.prompts = []; sync(state);
  return { engine, state };
};

const tests = {
  'British MPs unpaid before 1911; councillors before 1974'() {
    assert.equal(officePay(life('GB', 1890).state, 'gb_mp', 138000), 0);
    assert.equal(officePay(life('GB', 1950).state, 'gb_mp', 138000), 138000);
    assert.equal(officePay(life('GB', 1960).state, 'cityCouncil', 35000), 0);
    assert.equal(officePay(life('US', 1890).state, 'usSenator', 174000), 174000);
  },
  'the property qualification before 1858'() {
    const { state } = life('GB', 1850);
    state.housing.properties = []; state.finances.cash = 100;
    assert.match(standCheck(state, 'gb_mp') ?? '', /landed property/);
    assert.equal(standCheck(life('GB', 1880).state, 'gb_mp'), null);
  },
  'US senators chosen by the legislature before 1913'() {
    const { state } = life('US', 1900);
    assert.ok(senateByLegislature(state, 'usSenator'));
    assert.match(standCheck(state, 'usSenator') ?? '', /state legislature/);
    assert.ok(!senateByLegislature(life('US', 1920).state, 'usSenator'));
  },
  'the secret ballot, and the campaign of its day'() {
    const old = life('GB', 1860).state;
    assert.ok(!secretBallot(old));
    assert.ok(secretBallot(life('GB', 1880).state));
    assert.match(campaignWords(old).ad, /Posters/);
    assert.ok(campaignWords(old).treat);
    assert.match(campaignWords(life('US', 1970).state).ad, /TV/);
    assert.ok(!endorsementNow(old, 'lawEnforcement'), 'no police unions in 1860');
  },
  'patronage before merit hiring; the Hatch Act from 1939'() {
    const { state } = life('US', 1870);
    const prof = { sector: 'federal' };
    assert.ok(!meritHere(state, 'federal'));
    const without = patronageBonus(state, prof);
    state.civic ??= {}; state.civic.party = { bloc: 'labor', role: 'member' };
    assert.ok(patronageBonus(state, prof) > without);
    assert.equal(patronageBonus(life('US', 1950).state, prof), 0);
    const s2 = life('US', 1930).state;
    s2.career.job = { sector: 'federal' };
    assert.equal(neutralityBar(s2), null, 'no Hatch Act yet');
    const s3 = life('US', 1950).state;
    s3.career.job = { sector: 'federal' };
    assert.match(neutralityBar(s3), /Hatch Act/);
  },
  'historical jobs carry the titles of their day'() {
    const s = life('GB', 1870).state;
    const html = VIEWS.career(s, {});
    const shown = periodText(html);
    assert.doesNotMatch(shown, /VP of Retail Operations|Certified Nursing Assistant|Culinary Director|CNC Machinist/);
    assert.match(periodTitle('Medical Resident'), /House Surgeon/);
    sync(life('US', 2020).state);
    assert.equal(periodTitle('Medical Resident'), 'Medical Resident');
  },
  'the politics tab renders in 1860 and 2000'() {
    for (const [cc, y] of [['GB', 1860], ['US', 1880], ['US', 2000]]) assert.ok(VIEWS.politics(life(cc, y).state, {}).length > 100);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) process.exit(1);
