/**
 * Lands ruled as provinces of an empire (the Moldova audit, docs/audits/moldova-russian-empire.md):
 * the empire's capital of the day, army and money; no parliament, no elections, no movement before
 * its decade; women and the professions; things of their day.
 *
 *   node tests/provinces.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { sync } from '../src/modules/world/History.js';
import { rulerCapital, periodText, colonyHere } from '../src/modules/world/Eras.js';
import { serviceCountryOf } from '../src/modules/military/MilitaryEngine.js';
import { localizeHtml, countryOf } from '../src/modules/world/Countries.js';
import { womenAdmitted } from '../src/modules/career/WorkByEra.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { clubEligibility } from '../src/modules/community/FaithOfTheDay.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year, age = 22, gender = 'female') => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender });
  state.character.age = age; state.prompts = []; sync(state);
  return { engine, state };
};
const screen = (state, id) => localizeHtml(periodText(VIEWS[id](state, {})), countryOf(state));

const tests = {
  'empires are ruled from the capital of their day'() {
    assert.equal(rulerCapital('RU', 1862), 'St Petersburg');
    assert.equal(rulerCapital('RU', 1950), 'Moscow');
    assert.equal(rulerCapital('TR', 1900), 'Constantinople');
    assert.notEqual(rulerCapital('TR', 1950), 'Constantinople');
  },
  'a Bessarabian serves in the Russian army and pays in roubles'() {
    const { state } = life('MD', 1862, 22, 'male');
    assert.equal(colonyHere(state)?.ruler, 'RU');
    assert.equal(serviceCountryOf(state).id, 'RU');
    assert.doesNotMatch(screen(state, 'military'), /Moldova Army/);
    assert.match(screen(state, 'money'), /rub\. /);
    assert.match(screen(state, 'home'), /Kishinev/);
    assert.doesNotMatch(screen(state, 'home'), /Credit \d{3}/, 'no credit scores in 1862');
  },
  'no parliament and no elections in a province; no movement before its decade'() {
    const { state } = life('MD', 1862);
    assert.match(screen(state, 'chamber'), /No Legislature Here/);
    assert.match(screen(state, 'campaign'), /no elections here/i);
    assert.equal(colonyHere(state).movementFrom, 1905);
  },
  'women and the professions, by country and year'() {
    const { state } = life('MD', 1862);
    assert.equal(womenAdmitted(state, getProfession('law')), 1917, 'Bessarabia follows Russia');
    assert.equal(womenAdmitted(state, getProfession('medical')), 1876);
    assert.ok(!/⭐ Best bets for you[^]*?(Medicine|Public Prosecution)/.test(screen(state, 'career').slice(0, 3000)));
  },
  'things of their day: no lodge in Tsarist Russia, no neighbourhood watch in 1862'() {
    const { state } = life('MD', 1862, 30, 'male');
    assert.equal(clubEligibility(state, 'masons').reason, 'Banned here');
    assert.doesNotMatch(screen(state, 'community'), /Neighborhood watch/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) process.exit(1);
