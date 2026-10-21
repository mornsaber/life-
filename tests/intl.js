/**
 * Living abroad on deployments and secondments, one set of languages,
 * country-bound veterans' benefits, UN/Interpol service and foreign honours.
 *
 *   node tests/intl.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { runDeployment } from '../src/modules/military/ActiveDuty.js';
import { postAbroad, placeCountry } from '../src/modules/world/Posting.js';
import { grantCredential, hasCredential } from '../src/modules/credentials/LicensingEngine.js';
import { proficiencyLanguage } from '../src/modules/world/Languages.js';
import { vaEligible } from '../src/modules/realestate/MortgageSystem.js';
import { giBillEligible } from '../src/modules/education/EducationEngine.js';
import { isVeteran } from '../src/modules/military/MilitaryEngine.js';
import { missionEligibility } from '../src/modules/career/IntlService.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { ensureMigration } from '../src/modules/world/Migration.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', seed = 5, age = 30) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife(countryId === 'US' ? {} : { countryId });
  state.character.age = age;
  Object.assign(state.stats, { smarts: 85, health: 95, fitness: 80 });
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const usVet = (h = {}) => ({ branch: 'army', track: 'enlisted', rankCode: 'E-5', yearsOfService: 6, discharge: 'honorable', priorYears: 0, ...h });

const tests = {
  'deployments go to a real country, and you live there for the tour'() {
    assert.equal(placeCountry('eastern Syria').country, 'Syria');
    assert.equal(placeCountry('the Sahel').country, 'Mali');
    assert.equal(placeCountry('Camp Humphreys').country, 'South Korea');
    assert.ok(placeCountry('the South China Sea').atSea);
    const { engine, state } = life('US', 3, 22);
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 });
    engine.dispatch('military.enlist', 'army:enlisted:active');
    const p = state.prompts.find((x) => x.type === 'military.chooseSpecialty');
    engine.resolvePrompt(p.id, p.options.find((o) => !o.disabled).id);
    state.prompts = [];
    const home = state.character.regionId;
    runDeployment(engine.context(), state.military.service);
    const posting = state.character.posting;
    assert.ok(posting, 'posted');
    assert.ok(posting.country || posting.atSea, JSON.stringify(posting));
    assert.equal(state.character.regionId, home, 'home stays home');
  },

  'a posting abroad teaches the language, pauses volunteering and ends on time'() {
    const { engine, state, ctx } = life('US', 4);
    engine.dispatch('emergency.join', 'fire');
    postAbroad(ctx, { place: 'Camp Humphreys', country: 'South Korea', kind: 'tour', years: 2 });
    assert.equal(state.emergency.fire.onLeave, true);
    for (let y = 0; y < 2; y++) { state.prompts = []; engine.ageUp(); }
    assert.ok((state.migration.languages.Korean ?? 0) > 0, 'some Korean');
    assert.equal(state.character.posting, null, 'home again');
    assert.equal(state.emergency.fire.onLeave, false);
  },

  'language training and fluency are one skill'() {
    const a = life('US', 5);
    grantCredential(a.ctx, 'languageProficiency', { silent: true });
    const lang = proficiencyLanguage(a.state);
    assert.ok(lang && a.state.migration.languages[lang] >= 100, 'the credential is in a language you speak');
    const b = life('US', 6);
    ensureMigration(b.state).languages.Spanish = 100;
    b.state.prompts = [];
    b.engine.ageUp();
    assert.ok(hasCredential(b.state, 'languageProficiency'), 'fluency earns the credential');
    assert.equal(proficiencyLanguage(b.state), 'Spanish');
  },

  "veterans' benefits belong to the country you served"() {
    const home = life('US', 7);
    home.state.military.history.push(usVet());
    assert.ok(isVeteran(home.state) && vaEligible(home.state) && giBillEligible(home.state));
    const away = life('GB', 7);
    away.state.military.history.push(usVet());
    assert.equal(isVeteran(away.state), false, 'no British veterans\' preference for US service');
    assert.equal(vaEligible(away.state), false);
    assert.equal(giBillEligible(away.state), false);
    const brit = life('GB', 8);
    brit.state.military.history.push(usVet({ nation: 'GB' }));
    assert.ok(isVeteran(brit.state));
  },

  'police can serve with the UN abroad, and come home with the medal'() {
    const { engine, state, ctx } = life('US', 9, 34);
    hire(ctx, { professionId: 'police', levelId: 'officer', employer: createEmployer(new Random(2), state, getProfession('police'), state.character.regionId) });
    const job = state.career.job;
    job.yearsAtEmployer = 8;
    job.performance = 90;
    job.probationLeft = 0;
    assert.ok(missionEligibility(state, 'unficyp').ok, missionEligibility(state, 'unficyp').reason);
    assert.equal(missionEligibility(state, 'europol').ok, false, 'Europol is for EU officers');
    const chance = engine.rng.chance;
    engine.rng.chance = () => true;
    engine.dispatch('intl.apply', 'unficyp');
    engine.rng.chance = chance;
    assert.equal(state.character.posting?.country, 'Cyprus');
    assert.match(VIEWS.career(state, {}), /Seconded to UN Police/);
    state.prompts = [];
    engine.ageUp();
    assert.ok(!state.career.job?.secondment, 'home after a year');
    assert.ok(state.honors.some((h) => /UN Medal/.test(h.name)), 'the UN Medal');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} international test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} international tests passed`);
