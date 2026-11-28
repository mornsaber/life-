/**
 * History's statutes as laws: each follows history's date until a bill in this world changes it.
 *
 *   node tests/statutes.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { enact, LAWS } from '../src/modules/politics/Laws.js';
import { statuteIn } from '../src/modules/politics/StatuteBook.js';
import { lawHere } from '../src/modules/politics/Legislature.js';
import { orderOptions } from '../src/modules/politics/Presidency.js';
import { prohibitionHere, divorceBarred, sexBetweenMenCriminal, sameSexMarriageLegal } from '../src/modules/legal/LawOfTheDay.js';
import { deathPenaltyHere } from '../src/modules/legal/JusticeSystem.js';
import { depositsInsured } from '../src/modules/world/Institutions.js';
import { statePensionExists, setEraYear } from '../src/modules/world/Eras.js';
import { redlined } from '../src/modules/realestate/MortgageSystem.js';
import { honoursSystem } from '../src/modules/world/HonoursOfTheDay.js';
import { runEligibility } from '../src/modules/politics/Campaigns.js';
import { successionLaw } from '../src/modules/world/SuccessionLaw.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year, cc, ageNow = 40) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(year), modules: MODULES });
  // History's statute book (the self-running economy's laws: tests/industry.js).
  const state = engine.newLife({ countryId: cc, startYear: year - ageNow, gender: 'male', economy: 'historical' });
  state.character.age = ageNow;
  state.prompts = [];
  setEraYear?.(year);
  return state;
};
const pass = (state, lawId, value) => enact(state, { level: 'federal', where: state.character.countryId, lawId, value, age: state.character.age });

const tests = {
  'history decides until a bill does'() {
    assert.equal(statuteIn(life(1960, 'GB'), 'deathPenalty'), true);
    assert.equal(statuteIn(life(1970, 'GB'), 'deathPenalty'), false);
    const s = life(1950, 'GB');
    assert.ok(deathPenaltyHere(s), 'hanging in 1950');
    pass(s, 'deathPenalty', false);
    assert.equal(deathPenaltyHere(s), null, 'abolished by your Act');
    const back = life(2000, 'FR');
    pass(back, 'deathPenalty', true);
    assert.ok(deathPenaltyHere(back), 'brought back');
  },
  'Prohibition: repealed early, or brought in where it never was'() {
    const s = life(1925, 'US');
    assert.equal(prohibitionHere(s), true);
    pass(s, 'prohibition', false);
    assert.equal(prohibitionHere(s), false);
    const gb = life(1925, 'GB');
    assert.equal(prohibitionHere(gb), false);
    pass(gb, 'prohibition', true);
    assert.equal(prohibitionHere(gb), true);
    const today = life(2030, 'US');
    pass(today, 'prohibition', true);
    assert.equal(prohibitionHere(today), true, 'even in a present-day life');
  },
  'private life: divorce, decriminalisation, marriage'() {
    const ie = life(1980, 'IE');
    assert.ok(divorceBarred(ie));
    pass(ie, 'divorce', true);
    assert.equal(divorceBarred(ie), null);
    const gb = life(1955, 'GB');
    assert.equal(sexBetweenMenCriminal(gb), true);
    pass(gb, 'sodomyLaw', false);
    assert.equal(sexBetweenMenCriminal(gb), false);
    assert.equal(sameSexMarriageLegal(gb), false);
    pass(gb, 'sameSexMarriage', true);
    assert.equal(sameSexMarriageLegal(gb), true);
  },
  'money and housing: deposit insurance, the pension, fair housing'() {
    const gb = life(1950, 'GB');
    assert.equal(depositsInsured(gb), false);
    pass(gb, 'depositInsurance', true);
    assert.equal(depositsInsured(gb), true);
    const us = life(1925, 'US');
    assert.equal(statePensionExists(us), false);
    pass(us, 'statePension', true);
    assert.equal(statePensionExists(us), true);
    const black = life(1950, 'US');
    black.character.skinTone = 5;
    const before = redlined(black);
    pass(black, 'fairHousing', true);
    assert.equal(redlined(black), false);
    assert.equal(before, true, 'redlined before the Act');
  },
  'a dominion can end British honours early, or take them back'() {
    const ca = life(1925, 'CA');
    assert.deepEqual(honoursSystem(ca), []);
    pass(ca, 'imperialHonours', true);
    assert.deepEqual(honoursSystem(ca).map((x) => x.via), ['GB']);
    const au = life(1960, 'AU');
    pass(au, 'imperialHonours', false);
    assert.deepEqual(honoursSystem(au), [], 'no Order of Australia yet either');
  },
  'votes for women: no standing for election before it, unless a bill brings it in'() {
    const s = life(1910, 'GB');
    s.character.gender = 'female';
    assert.match(runEligibility(s, 'gb_mp').reason ?? '', /Women can't stand/);
    pass(s, 'womensSuffrage', true);
    assert.doesNotMatch(runEligibility(s, 'gb_mp').reason ?? '', /Women can't stand/);
    const later = life(1950, 'GB');
    later.character.gender = 'female';
    assert.doesNotMatch(runEligibility(later, 'gb_mp').reason ?? '', /Women can't stand/);
  },
  'married women\'s property, conscientious objection and abortion follow their dates'() {
    const s = life(1870, 'GB');
    s.character.gender = 'female';
    assert.equal(successionLaw(s).coverture, true);
    pass(s, 'marriedWomensProperty', true);
    assert.equal(successionLaw(s).coverture, false);
    assert.equal(statuteIn(life(1910, 'GB'), 'conscientiousObjection'), false);
    assert.equal(statuteIn(life(1920, 'GB'), 'conscientiousObjection'), true);
    assert.equal(statuteIn(life(1960, 'GB'), 'abortion'), false);
    assert.equal(statuteIn(life(1970, 'GB'), 'abortion'), true);
    assert.equal(statuteIn(life(2010, 'IE'), 'abortion'), false);
  },
  'only a legislature changes them: not the background majority, not a decree'() {
    setEraYear?.(1950);
    assert.equal(lawHere('deathPenalty', 'federal', 'GB'), true);
    assert.equal(lawHere('deathPenalty', 'federal', 'US'), false, 'the states decide that in America');
    assert.equal(lawHere('imperialHonours', 'federal', 'FR'), false);
    assert.equal(lawHere('minWage', 'federal', 'GB'), true, 'a minimum wage bill before 1999');
    assert.ok(Object.values(LAWS).some((l) => l.statute));
    const s = life(1950, 'GB');
    s.politics.office = { id: 'gb_pm', approval: 50 };
    assert.ok(!orderOptions(s).some((o) => LAWS[o.id].statute));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
