/**
 * Life in its world: racing for real inventions, movements over a lifetime, towns that change,
 * the paper of the day and letters from abroad, the household budget, domestic staff and the
 * property ledger, and farming of its day.
 *
 *   node tests/lifeworld.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { racesOpen, RACES } from '../src/modules/business/RealInventions.js';
import { stageOf, repressive } from '../src/modules/civic/Movements.js';
import { causesNow, victoryYear } from '../src/modules/civic/Activism.js';
import { townHistory, dueYear, MILESTONES } from '../src/modules/life/TownStory.js';
import { paperOf } from '../src/modules/life/News.js';
import { sharesAt } from '../src/modules/life/Household.js';
import { rolesOpen, staffName, propertyLedger, serviceCost } from '../src/modules/life/Property.js';
import { tenureOf, famineAt, collectiveAt, machineryWord } from '../src/modules/farm/FarmOfTheDay.js';
import { VEHICLE_TYPES, vehicleInEra } from '../src/modules/vehicles/Vehicles.js';
import { arrivesAt, gadgetsWithin } from '../src/modules/life/HomeGadgets.js';
import { sportHere } from '../src/modules/life/Fandom.js';
import { writeEpilogue } from '../src/modules/people/Epilogue.js';
import { villasNow, collectablesNow } from '../src/modules/life/Estate.js';
import { deathDutyFactor } from '../src/modules/people/Legacy.js';
import { scenarioOptions } from '../src/modules/life/Scenarios.js';
import { t, setLanguage } from '../src/ui/i18n.js';
import { lifeMap } from '../src/ui/views/MapView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const grown = (cc, year, age = 30, { gender = 'male', seed = 3, regionId } = {}) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender, ...(regionId ? { regionId } : {}) });
  state.character.age = age;
  state.prompts = [];
  return { engine, state };
};
const logged = (state, re) => state.log.some((b) => b.entries.some((e) => re.test(e.text)));
const answer = (engine, state, type, option) => { const p = state.prompts.find((x) => x.type === type); assert.ok(p, `a ${type} prompt`); engine.resolvePrompt(p.id, option); };

const tests = {
  'the race for a real invention: win before history, or be beaten to it'() {
    const { engine, state } = grown('US', 1869, 30);
    state.stats.smarts = 95;
    state.finances.cash = 5e6;
    assert.ok(racesOpen(state).some((x) => x.id === 'telephone'), 'the telephone is in the air in 1869');
    assert.ok(!racesOpen(state).some((x) => x.id === 'television'), 'television is not');
    engine.dispatch('realInventions.race', 'telephone');
    for (let i = 0; i < 6 && !state.realInventions.won.telephone; i++) { state.prompts = []; engine.ageUp(); }
    assert.ok(state.realInventions.won.telephone, 'a very clever inventor beats Bell');
    assert.ok(state.inventions.patents.some((p) => p.real === 'telephone'));
    const late = grown('US', 1875, 30, { seed: 4 });
    late.state.stats.smarts = 72;
    late.state.finances.cash = 5e6;
    late.engine.dispatch('realInventions.race', 'telephone');
    for (let i = 0; i < 3; i++) { late.state.prompts = late.state.prompts.filter((p) => p.type === 'realInventions.beaten'); late.engine.ageUp(); }
    assert.ok(late.state.realInventions.won.telephone || late.state.prompts.some((p) => p.type === 'realInventions.beaten'), 'won or beaten by 1876');
  },
  'movements grow, are banned under a dictatorship, and win on history\'s date'() {
    assert.equal(stageOf(100), 0);
    assert.ok(stageOf(60000) >= 3);
    const { engine, state } = grown('GB', 1910, 35, { gender: 'female' });
    state.civic.activism = { cause: 'suffrage', influence: 60, protests: 0, arrests: 0, years: 3 };
    engine.dispatch('movements.found', 'The Women\'s League');
    assert.ok(state.civic.movement);
    for (let i = 0; i < 20 && !state.civic.movement?.triumph; i++) { state.prompts = []; engine.ageUp(); }
    assert.ok(state.civic.movement?.triumph >= 1928 || logged(state, /won the fight it was founded for/), 'votes for women won in Britain by 1928');
    assert.ok(!causesNow(grown('NZ', 1900).state, 1900, false).some(([id]) => id === 'suffrage'), 'not a cause in New Zealand after 1893');
    assert.equal(victoryYear('chartism', 'GB'), null);
    const ru = grown('RU', 1935, 30);
    assert.ok(repressive(ru.state), 'Stalin\'s Soviet Union bans movements');
  },
  'towns change on their own clock, and keep their past'() {
    const { engine, state } = grown('GB', 1835, 0, { regionId: 'manchester' });
    for (let i = 0; i < 6; i++) { state.prompts = []; engine.ageUp(); }
    const h = townHistory(state);
    assert.ok(h.some((x) => x.id === 'gas'), 'gas lamps before you were born');
    assert.ok(h.some((x) => x.id === 'railway'), 'the railway in the 1840s');
    const rural = MILESTONES.find((m) => m.id === 'mill');
    assert.equal(dueYear(rural, 'rural', 'US'), null, 'no great mill in a mountain valley');
  },
  'the paper of the day, and letters from abroad'() {
    const old = grown('GB', 1850, 30);
    const p = paperOf(old.state, 1850);
    assert.match(p.price ?? '', /7d/);
    assert.match(p.look, /columns/);
    const de = grown('DE', 1900, 30);
    assert.match(paperOf(de.state, 1900).name, /Zeitung/);
    const { engine, state } = grown('US', 1880, 30, { seed: 7 });
    const mum = state.people.list.find((x) => x.relation === 'mother' && x.alive);
    if (mum) {
      mum.livesIn = 'IE';
      engine.context().emit('people:died', { person: mum, cause: 'old age' });
      assert.ok(logged(state, /telegram|black border/), 'news of a death abroad arrives as it would have');
    }
  },
  'the household budget follows its century'() {
    assert.ok(sharesAt(1850).food > 0.5 && sharesAt(2010).food < 0.16, 'Engel: food from over half to an eighth');
    const { engine, state } = grown('GB', 1880, 30);
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.household?.lines?.food > 0, 'a budget kept');
    assert.ok(state.household.table, 'something on the table');
  },
  'servants of their day, and everything you own'() {
    assert.equal(staffName('maid', 1880), 'Maid-of-all-work');
    assert.equal(staffName('maid', 2000), 'Cleaner');
    assert.ok(serviceCost(1890) < serviceCost(1990));
    const { engine, state } = grown('GB', 1890, 35);
    state.finances.cash = 5e6;
    assert.ok(!rolesOpen(state).some((r) => r.id === 'bodyguard'), 'no bodyguards in 1890');
    assert.ok(!rolesOpen(state).some((r) => r.id === 'butler'), 'a butler needs a household beneath him');
    for (const role of ['maid', 'cook', 'gardener', 'coachman']) engine.dispatch('property.hire', role);
    assert.ok(state.property.staff.length >= 2, 'servants taken on (the servant problem only bites after 1919)');
    const rows = propertyLedger(state);
    assert.ok(rows.some((r) => r.kind === 'staff' && r.yearly > 0));
    assert.ok(vehicleInEra(state, VEHICLE_TYPES.steamYacht) && !vehicleInEra(state, VEHICLE_TYPES.superyacht), 'a steam yacht, not a superyacht');
    assert.ok(!vehicleInEra(state, VEHICLE_TYPES.yacht), 'no motor yacht before 1920');
  },
  'farming of its day: tenure, famine, the collective, the tractor'() {
    const ie = grown('IE', 1846, 30);
    assert.ok(famineAt(ie.state), 'the blight in 1846');
    assert.ok(collectiveAt(grown('RU', 1935, 30).state), 'Soviet collectives');
    assert.ok(!collectiveAt(grown('RU', 1995, 30).state));
    assert.match(machineryWord(1900, 'US'), /horses/);
    assert.match(machineryWord(1935, 'US'), /tractor/);
    const { engine, state } = grown('RU', 1930, 40);
    state.farm.acres = 200; state.farm.valuePerAcre = 500; state.farm.herd = { kind: 'beef', head: 30 };
    state.prompts = [];
    engine.ageUp();
    answer(engine, state, 'farmDay.collective', 'join');
    assert.equal(state.farm.acres, 0, 'the farm went into the collective');
    assert.equal(tenureOf(state).id, 'collective');
  },
  'the house fills up with gadgets on its country\'s clock'() {
    const gb = grown('GB', 1950, 30).state;
    const ind = grown('IN', 1950, 30).state;
    assert.ok(arrivesAt(gb, 'television').common < arrivesAt(ind, 'television').common, 'Britain before India');
    assert.ok(!gadgetsWithin(grown('GB', 1890, 30).state).some((g) => g.id === 'television'), 'no television in 1890');
  },
  'a club for life, holidays and outings of their day'() {
    assert.equal(sportHere(grown('GB', 1950).state).sport, 'football');
    assert.equal(sportHere(grown('US', 1950).state).sport, 'baseball');
    assert.equal(sportHere(grown('GB', 1850).state), null, 'no Football League before 1888');
    const { engine, state } = grown('GB', 1950, 30);
    engine.dispatch('fandom.follow');
    assert.ok(state.fandom?.club);
  },
  'historical scenarios start in their place and year'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
    const s = engine.newLife({ ...scenarioOptions('hungryYears'), challenge: 'hungryYears' });
    assert.equal(s.character.regionId, 'skibbereen');
    assert.equal(s.character.birthYear, 1830);
  },
  'the map, the epilogue and the interface in French'() {
    const { state } = grown('IN', 1930, 30);
    assert.match(lifeMap(state), /<svg class="life-map"/);
    const e = writeEpilogue(state);
    assert.ok(e.lines.some((l) => /Second World War/.test(l.text)), 'the war comes after a life ending in 1930');
    setLanguage('fr', null);
    assert.equal(t('Money'), 'Argent');
    assert.equal(t('Your Club: Glasgow City'), 'Votre club : Glasgow City'.replace(' :', ':'));
    assert.equal(t('Something unknown'), 'Something unknown');
    setLanguage('en', null);
  },
  'villas, collections and death duties of their day'() {
    const old = grown('GB', 1880, 40).state;
    assert.ok(villasNow(old).some((v) => v.id === 'riviera') && !villasNow(old).some((v) => v.id === 'tuscany'));
    assert.ok(!collectablesNow(old).some((c) => c.id === 'comics'));
    assert.equal(deathDutyFactor(grown('US', 1900, 40).state), 0, 'no federal estate tax before 1916');
    assert.ok(deathDutyFactor(grown('GB', 1960, 40).state) > 1, 'post-war Britain taxed estates hardest');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
