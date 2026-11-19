/**
 * Fixes from the 300-life audit and the five playtest lives: local employers abroad, funerals by
 * faith, period job titles, the era safety net, interregnums that aren't republics.
 *
 *   node tests/playtestfixes.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { localEmployer } from '../src/modules/world/LocalEmployers.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { funeralOf } from '../src/modules/people/Remembered.js';
import { fitsEra, periodTitle, setEraYear } from '../src/modules/world/Eras.js';
import { dataRegime } from '../src/modules/world/HistoricalData.js';
import { casePool } from '../src/modules/medicine/CaseFiles.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const grown = (cc, year, age, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender: 'male' });
  state.character.age = age;
  return { engine, state };
};

const tests = {
  'private employers abroad have local names'() {
    const rng = new Random(3);
    assert.match(localEmployer('nursing', 'FR', 'Lyon', 1860, rng, PROFESSIONS.nursing), /Hôtel-Dieu|Hôpital/);
    assert.match(localEmployer('hospitality', 'DE', 'Köln', 1890, rng, PROFESSIONS.hospitality), /& Söhne|Gebrüder/);
    assert.equal(localEmployer('nursing', 'GB', 'Leeds', 1860, rng, PROFESSIONS.nursing), null, 'Britain keeps its own lists');
    assert.equal(localEmployer('swissGuard', 'CH', 'Bern', 1990, rng, PROFESSIONS.swissGuard), null, 'named institutions stay');
  },
  'funerals by faith'() {
    const { state } = grown('IN', 1925, 20);
    state.community = { ...(state.community ?? {}), faith: { traditionId: 'hindu' } };
    assert.match(funeralOf(state), /pyre|ghat/);
    const fr = grown('FR', 1880, 60).state;
    fr.community = { ...(fr.community ?? {}), faith: { traditionId: 'catholic' } };
    assert.doesNotMatch(funeralOf(fr), /Victorian/);
  },
  'period titles and the era safety net'() {
    setEraYear(1850);
    assert.equal(periodTitle('CNC Machinist'), 'Machinist');
    assert.equal(periodTitle('Certified Registered Nurse Anesthetist'), 'Theatre Sister');
    setEraYear(2026);
    const s = grown('FR', 1840, 30).state;
    for (const t of ['You tipped off the SEC.', 'Strikes on the power grid meant weeks of blackouts.', 'The calibration committee put you at the top of the curve.', 'An air raid caught you outside.', 'The bus came every 45 minutes.']) assert.equal(fitsEra(s, t), false, t);
    assert.ok(!casePool(grown('ES', 1873, 30).state).some((c) => /antibiotic/i.test(JSON.stringify(c))), 'no antibiotics in 1873');
  },
  'personal rule between two reigns is still a crown'() {
    assert.equal(dataRegime('AF', 1824).monarchy, true, 'the emirs of Kabul');
    assert.equal(dataRegime('AF', 1974).monarchy, false, 'the 1973 republic');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
