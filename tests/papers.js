/**
 * Titles on the Honours tab, baronetcies and titles bought and sold, new rank insignia, and the
 * wallet of licences and passports.
 *
 *   node tests/papers.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { styledName, postNominals } from '../src/modules/world/Honours.js';
import { marketNow, inheritTitles } from '../src/modules/world/BoughtTitles.js';
import { jobInsignia } from '../src/ui/Insignia.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const grown = (cc, year, age = 40, gender = 'male') => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender, firstName: 'Tom', lastName: 'Hale' });
  state.character.age = age;
  state.prompts = [];
  return { engine, state };
};

const tests = {
  'a baronet is Sir, with Bt first after the name, and it goes to the eldest son'() {
    const { state } = grown('GB', 1930);
    state.character.baronetcy = { number: 1, since: 1930, how: 'conferred' };
    state.character.style = { prefix: 'Sir' };
    assert.equal(styledName(state), 'Sir Tom Hale');
    assert.match(postNominals(state), /^Bt/);
    const heir = { character: { style: {} } };
    const logs = [];
    inheritTitles(state, heir, { id: 'k1' }, { id: 'k1' }, [{ id: 'k1' }], (_s, t) => logs.push(t));
    assert.equal(heir.character.baronetcy.number, 2);
    assert.match(logs[0], /2nd baronet/);
  },
  'titles on the market follow their dates: no manorial lordships before 1925, no papal counts after 1968'() {
    assert.ok(!marketNow(grown('GB', 1900).state).some((x) => x.id === 'manor'));
    assert.ok(marketNow(grown('GB', 1990).state).some((x) => x.id === 'manor'));
    assert.ok(!marketNow(grown('IT', 1990).state).some((x) => x.id === 'papal'));
    assert.ok(!marketNow(grown('GB', 1950).state).some((x) => x.id === 'laird'), 'no souvenir lairds before 1996');
  },
  'a lordship of the manor is a designation, a bought "Laird" a prefix you may regret'() {
    const { engine, state } = grown('GB', 2005);
    state.finances.cash = 1e6;
    engine.dispatch('boughtTitles.buy', 'manor');
    engine.dispatch('boughtTitles.buy', 'laird');
    assert.equal(styledName(state), 'Tom Hale', 'a manor makes no Lord Hale');
    const laird = state.boughtTitles.find((x) => x.kind === 'laird');
    engine.dispatch('boughtTitles.use', laird.id);
    assert.equal(styledName(state), 'Laird Tom Hale');
    const html = VIEWS.honors(state, {});
    assert.match(html, /Lord of the Manor of/);
    assert.match(html, /Your Titles/);
  },
  'the wallet: a licence in its country\'s design, passports for each citizenship'() {
    const { state } = grown('DE', 2015);
    state.credentials.held.driverLicense = { status: 'active', earnedAge: 18 };
    state.character.citizenships = ['DE', 'US'];
    const html = VIEWS.honors(state, {});
    assert.match(html, /Führerschein/);
    assert.match(html, /European Union model/);
    assert.equal((html.match(/id-passport/g) ?? []).length, 2);
    const old = grown('DE', 1980).state;
    old.credentials.held.driverLicense = { status: 'active', earnedAge: 18 };
    assert.match(VIEWS.honors(old, {}), /grey/, 'the grey Lappen before 1999');
  },
  'new insignia: railway braid, German foresters, British nurses (not American ones)'() {
    assert.ok(jobInsignia({ levelId: 'superintendent' }, PROFESSIONS.steamRailway, 'GB'));
    assert.ok(jobInsignia({ levelId: 'district' }, PROFESSIONS.forester, 'DE'));
    assert.ok(!jobInsignia({ levelId: 'district' }, PROFESSIONS.forester, 'US'));
    assert.ok(jobInsignia({ levelId: 'charge' }, PROFESSIONS.nursing, 'GB'));
    assert.ok(!jobInsignia({ levelId: 'charge' }, PROFESSIONS.nursing, 'US'));
  },
  'a résumé from the working record: jobs with their years, newest first, headed as the country heads it'() {
    const { state } = grown('GB', 1990, 40);
    state.career.history.push({ professionId: 'retail', title: 'Sales Associate', employerName: 'Ashby & Sons', startAge: 20, endAge: 28, reason: 'Resigned for a new opportunity' });
    state.career.job = { professionId: 'corporate', title: 'Office Manager', employer: { name: 'Hale Ltd' }, startAge: 28, grade: 3 };
    const cv = VIEWS.resume(state, {});
    assert.match(cv, /Curriculum Vitae/);
    assert.ok(cv.lastIndexOf('Office Manager') < cv.search(/Shop Assistant|Sales Associate/), 'newest first (in the job titles of the day)');
    assert.match(cv, /1970 – 1978/);
    assert.match(cv, /1978 – present/);
    assert.match(VIEWS.resume(grown('US', 1990, 40).state, {}), /Résumé/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
