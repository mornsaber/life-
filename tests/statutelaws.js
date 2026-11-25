/**
 * Year-gated rules that were really laws now follow the statute book: history's date by default,
 * a bill in this world can bring them in early or repeal them.
 *
 *   node tests/statutelaws.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { sync } from '../src/modules/world/History.js';
import { LAWS } from '../src/modules/politics/Laws.js';
import { welfareHere } from '../src/modules/life/ClassOfTheDay.js';
import { compensationHere, weekHours, paidHolidays } from '../src/modules/career/WorkingConditions.js';
import { secretBallot, officePay, meritHere } from '../src/modules/politics/PoliticsOfTheDay.js';
import { caneHere } from '../src/modules/education/SchoolDays.js';
import { sameSexUnion, womenCreditBlock } from '../src/modules/legal/Rights.js';
import { eraTaxShare } from '../src/modules/world/Eras.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(cc, y, gender = 'male') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: y - 30, firstName: 'Ada', lastName: 'Vale', gender });
  state.character.age = 30; state.prompts = []; sync(state);
  return state;
}
const pass = (state, cc, id, v) => { state.laws ??= {}; if (cc === 'US') (state.laws.federal ??= {})[id] = v; else { state.laws.nations ??= {}; (state.laws.nations[cc] ??= {})[id] = v; } };
let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log(`  ✔ ${name}`); };

const IDS = ['workmensCompensation', 'fortyEightHourWeek', 'holidaysWithPay', 'dockDecasualisation', 'nationalInsurance', 'sicknessInsurance', 'nationalHealth', 'secretBallot', 'paidLegislators', 'meritCivilService', 'freeSchooling', 'schoolCane', 'spentConvictions', 'civilPartnerships', 'womensCredit', 'incomeTax'];
t('each is a law in the law book', () => { for (const id of IDS) assert.ok(LAWS[id]?.statute, id); });
t('history\'s dates by default', () => {
  const s = life('GB', 1890);
  assert.equal(welfareHere(s), false); assert.equal(compensationHere(s), false); assert.equal(secretBallot(s), true); assert.equal(caneHere(s), true);
  assert.equal(officePay(s, 'gb_mp', 1000), 0);
  assert.ok(weekHours(s, { professionId: 'millWork', sector: 'private' }) > 48);
  assert.equal(paidHolidays(s), 0);
});
t('a bill brings a law in early', () => {
  const s = life('GB', 1890);
  for (const id of ['nationalInsurance', 'workmensCompensation', 'fortyEightHourWeek', 'holidaysWithPay', 'paidLegislators']) pass(s, 'GB', id, true);
  pass(s, 'GB', 'schoolCane', false);
  assert.equal(welfareHere(s), true); assert.equal(compensationHere(s), true); assert.equal(caneHere(s), false);
  assert.equal(weekHours(s, { professionId: 'millWork', sector: 'private' }), 48);
  assert.ok(paidHolidays(s) > 0);
  assert.equal(officePay(s, 'gb_mp', 1000), 1000);
});
t('a bill repeals one', () => {
  const s = life('US', 1990, 'female');
  assert.equal(womenCreditBlock(s), null);
  pass(s, 'US', 'womensCredit', false);
  assert.ok(womenCreditBlock(s));
  pass(s, 'US', 'meritCivilService', false);
  assert.equal(meritHere(s, 'federal'), false);
  const g = life('GB', 1930);
  assert.ok(eraTaxShare(g) > 0);
  pass(g, 'GB', 'incomeTax', false);
  assert.equal(eraTaxShare(g), 0);
});
t('civil partnerships before history\'s date', () => {
  const s = life('GB', 1990);
  assert.equal(sameSexUnion(s), null);
  pass(s, 'GB', 'civilPartnerships', true);
  assert.equal(sameSexUnion(s), 'partnership');
});
console.log(`statute laws: ${n} passed`);
