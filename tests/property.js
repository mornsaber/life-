/**
 * The lives of the people around you, and everything you can buy and build:
 * apartments, commercial buildings, land, vacation homes, boats and planes
 * (chartered out), construction, demolition, subdivision and rezoning.
 *
 *   node tests/property.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, netWorth } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROPERTY_TYPES, priceOf, buildQuote, demolitionQuote, quote, loansFor, expectedNoi } from '../src/modules/realestate/index.js';
import { ensureLife } from '../src/modules/people/NpcLives.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed, age = 40, cash = 5_000_000) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = age;
  state.finances.cash = cash;
  state.housing.credit.score = 780;
  return { engine, state };
}
/** Put a property straight into your portfolio. */
function own(state, type, extra = {}) {
  const regionId = state.character.regionId;
  const value = Math.round(priceOf(state, type, regionId));
  const p = { id: `prop_${type}_${state.housing.properties.length}`, type, typeName: PROPERTY_TYPES[type].name, regionId, value, valueAdj: 1, purchasePrice: value, purchaseAge: state.character.age, condition: PROPERTY_TYPES[type].kind === 'land' ? 100 : 80, use: PROPERTY_TYPES[type].kind === 'land' ? 'vacant' : 'rental', mortgage: null, heloc: null, tenants: [], insured: true, floodInsured: false, ...extra };
  state.housing.properties.push(p);
  return p;
}
function years(engine, n) {
  for (let i = 0; i < n; i++) {
    engine.state.prompts = [];
    engine.state.stats.health = 95;
    engine.ageUp();
    for (let j = 0; j < 8 && engine.state.prompts.length; j++) {
      const p = engine.state.prompts[0];
      engine.resolvePrompt(p.id, (p.options.find((o) => ['decline', 'wait', 'contractor', 'plan'].includes(o.id)) ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
    }
  }
}
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);

const tests = {
  'family and friends go to school, work, buy homes and build savings'() {
    const { engine, state } = life(1, 45);
    const kid = { id: 'k1', firstName: 'Ava', lastName: state.character.lastName, gender: 'female', relation: 'child', ageOffset: -28, relationship: 80, alive: true, income: 0, careerIncome: 0, nationality: 'US', custody: 'you', traits: { smarts: 90, athletics: 50, business: 20 } };
    const teen = { ...kid, id: 'k2', firstName: 'Ben', ageOffset: -28 + 11 };
    state.people.list.push(kid, teen);
    years(engine, 1);
    const adults = state.people.list.filter((p) => p.alive && p.life && state.character.age + p.ageOffset >= 25);
    assert.ok(adults.length >= 2, 'everyone has a life');
    assert.ok(adults.every((p) => p.life.edu && p.life.home), 'education and a home');
    // Over a decade, people get jobs and the teen goes off to school.
    years(engine, 10);
    const all = state.people.list.filter((p) => p.alive && p.life);
    assert.ok(all.some((p) => p.job && p.life.employer), 'someone works somewhere');
    assert.ok(teen.life.edu !== 'none' || teen.life.studying, `the teen finished school (${teen.life.edu})`);
    assert.ok(all.some((p) => p.life.home?.kind === 'own' && p.life.home.value > 0), 'someone owns a home');
    assert.ok(all.some((p) => p.life.netWorth > 0), 'someone has savings');
  },

  'you can rent a relative a place, help with a down payment, or pay tuition'() {
    const { engine, state } = life(2, 55);
    const kid = { id: 'k1', firstName: 'Cal', lastName: state.character.lastName, gender: 'male', relation: 'child', ageOffset: -30, relationship: 60, alive: true, income: 50000, careerIncome: 50000, nationality: 'US', custody: 'you', job: 'Teacher' };
    state.people.list.push(kid);
    ensureLife(engine.rng, state, kid);
    kid.life.home = { kind: 'rent' };
    const condo = own(state, 'duplex');
    engine.dispatch('npcLives.offerHome', `${kid.id}:${condo.id}`);
    assert.equal(kid.life.home.kind, 'yourRental');
    assert.ok(condo.tenants.some((t) => t.personId === kid.id));
    assert.ok(kid.relationship > 60);
    // Selling the place sends them back to renting next year.
    engine.dispatch('housing.sell', condo.id);
    years(engine, 1);
    assert.notEqual(kid.life.home.kind, 'yourRental');
    if (kid.life.home.kind !== 'own') {
      engine.dispatch('npcLives.helpBuy', kid.id);
      assert.equal(kid.life.home.kind, 'own', 'they bought a place with your help');
    }
    kid.life.studying = { degree: 'master', until: state.character.age - kid.ageOffset + 2 };
    const cash = state.finances.cash;
    engine.dispatch('npcLives.payTuition', kid.id);
    assert.ok(state.finances.cash < cash, 'tuition paid');
  },

  'commercial buildings lease to businesses on multi-year triple-net leases'() {
    const { engine, state } = life(3, 50);
    const strip = own(state, 'stripMall');
    years(engine, 4);
    assert.ok(strip.tenants.length > 0, 'leased up');
    assert.ok(strip.tenants.every((t) => t.business && t.yearsLeft >= 0), 'business tenants with lease terms');
    assert.ok(strip.lastRent > 0);
    clean(VIEWS.home(state, {}));
  },

  'vacation homes rent short-term or serve as your getaway'() {
    const { engine, state } = life(4, 50);
    const v = own(state, 'vacation');
    years(engine, 1);
    assert.ok(v.lastRent > 0 && v.occupancy > 0, 'short-term bookings');
    engine.dispatch('housing.setUse', `${v.id}:vacation`);
    assert.equal(v.use, 'vacation');
  },

  'commercial loans need 25% down and rents that cover the payment; land loans for lots'() {
    const { state } = life(5, 45);
    state.finances.lastYear = { gross: 600000, ltcg: 0 };
    assert.deepEqual(loansFor('aptComplex'), ['commercial']);
    assert.deepEqual(loansFor('lot'), ['land']);
    assert.ok(loansFor('starter').includes('conv30'));
    const price = Math.round(priceOf(state, 'aptBuilding', state.character.regionId));
    const q = quote(state, price, 'commercial', { noi: expectedNoi(state, 'aptBuilding', state.character.regionId, price) });
    assert.ok(q.down >= Math.round(price * 0.25), '25%+ down');
    assert.ok(q.payment * 1.24 <= expectedNoi(state, 'aptBuilding', state.character.regionId, price) || q.down >= price * 0.59, 'sized to the rents');
    assert.equal(q.mip, 0, 'no PMI on commercial loans');
    state.finances.lastYear = { gross: 0, ltcg: 0 };
    const thin = quote(state, price, 'commercial', { noi: 1000 });
    assert.ok(thin.down >= price * 0.59, 'thin rents: a much bigger down payment');
    assert.ok(!thin.ok && /1\.25/.test(thin.reason), thin.reason);
  },

  'build on a lot: draws, a construction loan that becomes a mortgage, and a finished building'() {
    const { engine, state } = life(6, 40);
    const lot = own(state, 'lot');
    const q = buildQuote(state, lot, 'family', 'gc');
    assert.ok(q.ok && q.cost > 0 && q.finished > q.cost);
    assert.ok(!buildQuote(state, lot, 'office', 'gc').ok, 'zoning');
    engine.dispatch('housing.build', `${lot.id}:family:gc:loan`);
    assert.ok(lot.project?.loan, 'construction loan');
    for (let i = 0; i < 6 && lot.project; i++) years(engine, 1);
    assert.equal(lot.type, 'family', 'finished');
    assert.ok(lot.mortgage?.balance > 0, 'loan rolled into a mortgage');
    assert.ok(lot.purchasePrice > q.cost * 0.9, 'basis includes construction');
    assert.ok(netWorth(state));
    clean(VIEWS.home(state, {}));
  },

  'tear down a building (buying out tenants), subdivide land, rezone a lot'() {
    const { engine, state } = life(7, 50);
    const office = own(state, 'office');
    office.tenants = [{ name: 'a law firm', rent: 6000, reliability: 0.95, yearsLeft: 4, business: true }];
    const dq = demolitionQuote(state, office);
    assert.ok(dq.buyouts > 0, 'lease buyouts');
    engine.dispatch('housing.demolish', office.id);
    assert.equal(office.type, 'commercialLot');
    assert.equal(office.tenants.length, 0);
    const acres = own(state, 'acreage');
    const before = state.housing.properties.length;
    engine.dispatch('housing.subdivide', acres.id);
    assert.equal(state.housing.properties.length, before + 2);
    assert.ok(state.housing.properties.filter((p) => p.type === 'lot').length >= 3);
    const lot = state.housing.properties.find((p) => p.type === 'lot');
    engine.dispatch('housing.rezone', lot.id);
    assert.ok(lot.rezoneTried);
    const cash = state.finances.cash;
    engine.dispatch('housing.rezone', lot.id);
    assert.equal(state.finances.cash, cash, 'one petition per lot');
  },

  'owning a builder or demolition company makes development cheaper'() {
    const { engine, state } = life(8, 50);
    const lot = own(state, 'lot');
    const gc = buildQuote(state, lot, 'luxury', 'gc');
    assert.ok(!buildQuote(state, lot, 'luxury', 'own').ok);
    for (const typeId of ['homeBuilder', 'demolitionCo', 'developer']) assert.ok(BUSINESS_TYPES[typeId], typeId);
    state.business.current = { id: 'b1', typeId: 'homeBuilder', name: 'Case Homes', reputation: 60, family: [] };
    const ownQ = buildQuote(state, lot, 'luxury', 'own');
    assert.ok(ownQ.ok && ownQ.cost < gc.cost, 'at cost');
    const house = own(state, 'starter');
    const full = demolitionQuote(state, house).cost;
    state.business.current.typeId = 'demolitionCo';
    assert.ok(demolitionQuote(state, house).cost < full, 'your own crews');
    state.business.current = null;
    void engine;
  },

  'boats and planes can be chartered out for income'() {
    const { engine, state } = life(9, 45);
    engine.dispatch('vehicles.buy', 'sailboat:cash');
    const boat = state.vehicles.owned.find((v) => v.typeId === 'sailboat');
    assert.ok(boat);
    engine.dispatch('vehicles.charter', boat.id);
    assert.ok(boat.charter);
    years(engine, 1);
    assert.ok(boat.lastCharter != null, 'charter income');
    clean(VIEWS.garage(state, {}));
  },

  'the People tab shows everyone\'s life without changing state'() {
    const { engine, state } = life(10, 45);
    years(engine, 2);
    const before = JSON.stringify(state);
    const html = VIEWS.people(state, {});
    assert.equal(JSON.stringify(state), before);
    assert.ok(html.includes('🎓'), 'education shown');
    clean(html);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} property test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} property tests passed`);
