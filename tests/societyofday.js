/**
 * Society of its day: leisure, the great causes, redlining and the Right to Buy.
 *
 *   node tests/societyofday.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { leisureNow } from '../src/modules/life/LeisureOfTheDay.js';
import { causesNow } from '../src/modules/civic/Activism.js';
import { quote, redlined } from '../src/modules/realestate/MortgageSystem.js';
import { generateListings } from '../src/modules/realestate/PropertyMarket.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year, cc = 'GB', ageNow = 30) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(7), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - ageNow });
  state.character.age = ageNow;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};
const ids = (list) => list.map((x) => x.id ?? x[0]);

const tests = {
  'leisure of the day'() {
    assert.ok(ids(leisureNow(life(1890).state)).includes('musicHall'));
    assert.ok(!ids(leisureNow(life(1890).state)).includes('pictures'));
    assert.ok(ids(leisureNow(life(1950).state)).includes('holidayCamp'));
    assert.ok(ids(leisureNow(life(1925, 'US').state)).includes('speakeasy'));
    assert.ok(!ids(leisureNow(life(1925, 'GB').state)).includes('speakeasy'), 'no Prohibition in Britain');
    assert.ok(!ids(leisureNow(life(2010).state)).includes('arcade'));
  },
  'going out from the Activities tab'() {
    const { engine, state } = life(1935);
    assert.match(VIEWS.activities(state, {}), /Going Out/);
    assert.match(VIEWS.activities(state, {}), /Physical culture|constitutional/);
    engine.dispatch('leisure.go', 'pictures');
    assert.ok(state.yearly['leisure.pictures']);
  },
  'the great causes of their day'() {
    assert.ok(ids(causesNow(life(1900).state, 1900, false)).includes('suffrage'));
    assert.ok(!ids(causesNow(life(1950).state, 1950, false)).includes('suffrage'));
    assert.ok(ids(causesNow(life(1845).state, 1845, false)).includes('chartism'));
    assert.ok(!ids(causesNow(life(1960, 'GB').state, 1960, false)).includes('civilRights'), 'American civil rights in America');
    assert.ok(!ids(causesNow(life(1900).state, 1900, false)).includes('climate'));
  },
  'redlining: no mortgage for a Black family in 1950s America'() {
    const { state } = life(1955, 'US');
    state.character.skinTone = 5;
    assert.ok(redlined(state));
    state.finances.cash = 1e7;
    assert.match(quote(state, 100000, 'fha').reason ?? '', /Redlined/);
    const { state: later } = life(1975, 'US');
    later.character.skinTone = 5;
    assert.ok(!redlined(later));
  },
  'the Right to Buy, for council tenants from 1980'() {
    const { state, ctx } = life(1985, 'GB');
    state.housing.rental = { tier: 'subsidized', rent: 100, leaseYearsLeft: 1, regionId: state.character.regionId };
    generateListings(ctx);
    assert.ok(state.housing.listings.some((l) => l.rightToBuy));
    const { state: s2, ctx: c2 } = life(1975, 'GB');
    s2.housing.rental = { tier: 'subsidized', rent: 100, leaseYearsLeft: 1, regionId: s2.character.regionId };
    generateListings(c2);
    assert.ok(!s2.housing.listings.some((l) => l.rightToBuy));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
