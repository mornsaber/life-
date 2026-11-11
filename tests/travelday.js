/**
 * Travel and keeping in touch, of their day (world/TravelOfTheDay.js): voyages by year, the price
 * of going abroad, letters and calls to family abroad, and emigrant routes before quotas.
 *
 *   node tests/travelday.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { journey, travelCostFactor, contactThen, eraRoute } from '../src/modules/world/TravelOfTheDay.js';
import { travelBlock, tripCost } from '../src/modules/world/Travel.js';
import { routesTo } from '../src/modules/world/Migration.js';
import { visitCost, VISIT_COST } from '../src/modules/people/FamilyAbroad.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const grown = (cc, year, age, opts = {}, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender: 'male', ...opts });
  state.character.age = age;
  return { engine, state };
};
const kin = (state, livesIn) => {
  const p = { id: 'b1', firstName: 'Tom', lastName: 'Ash', gender: 'male', relation: 'sibling', ageOffset: 2, relationship: 70, alive: true, livesIn, nationality: state.character.countryId };
  state.people.list.push(p);
  return p;
};
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };

const tests = {
  'sail, steam, liner, airliner, jet'() {
    assert.equal(journey(grown('GB', 1830, 30).state, 'GB', 'US').mode, 'sail');
    assert.match(journey(grown('GB', 1830, 30).state, 'GB', 'AU').time, /months/);
    assert.equal(journey(grown('GB', 1905, 30).state, 'GB', 'US').mode, 'liner');
    assert.equal(journey(grown('GB', 1952, 30).state, 'GB', 'US').mode, 'airliner');
    assert.equal(journey(grown('GB', 1965, 30).state, 'GB', 'US').mode, 'jet');
    assert.equal(journey(grown('GB', 1890, 30).state, 'GB', 'FR').mode, 'rail');
  },
  'a holiday abroad was for the rich, and the far side of the world not a holiday at all'() {
    const old = grown('GB', 1890, 30).state;
    assert.match(travelBlock(old, 'AU') ?? '', /each way/);
    assert.equal(travelBlock(old, 'FR'), null);
    const now = grown('GB', 2015, 30).state;
    assert.ok(travelCostFactor(old, 'US') > 3);
    assert.equal(travelCostFactor(now, 'US'), 1);
    assert.ok(tripCost(grown('GB', 1925, 30).state, 'US', 'standard') > tripCost(now, 'US', 'standard') * 2, 'a crossing cost a fortune');
  },
  'letters, the telegraph, the telephone and video calls'() {
    assert.match(contactThen(grown('GB', 1830, 30).state, 'AU').letterTime, /months/);
    assert.equal(contactThen(grown('GB', 1900, 30).state, 'US').phone, false);
    assert.equal(contactThen(grown('GB', 1930, 30).state, 'US').phone, true);
    assert.equal(contactThen(grown('GB', 2015, 30).state, 'US').video, true);
  },
  'writing home keeps family close; silence lets them drift'() {
    const { engine, state } = grown('IE', 1880, 30);
    const p = kin(state, 'US');
    const before = p.relationship;
    state.prompts = [];
    engine.dispatch('travelDay.write', p.id);
    assert.equal(p.relationship, before + 4);
    for (let i = 0; i < 6; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
    assert.ok(p.relationship < before, `${before} → ${p.relationship}`);
    assert.ok(visitCost(state, p) > VISIT_COST, 'the voyage is dear');
  },
  'emigrant routes: Ellis Island, exclusion, quotas, Ten Pound Poms'() {
    const ie = grown('IE', 1900, 25).state;
    const r = eraRoute(ie, 'US');
    assert.equal(r.ok, true);
    assert.match(r.label, /Ellis Island/);
    assert.equal(routesTo(ie, 'US')[0].kind, 'passage');
    assert.equal(eraRoute(grown('CN', 1900, 25).state, 'US').ok, false, 'Chinese Exclusion Act');
    assert.ok(eraRoute(grown('IT', 1930, 25).state, 'US').odds < 0.2, 'a tiny quota');
    assert.ok(eraRoute(grown('GB', 1930, 25).state, 'US').odds > 0.5);
    assert.equal(eraRoute(grown('GB', 1955, 25).state, 'AU').fee, 300);
    assert.equal(eraRoute(grown('IN', 1950, 25).state, 'AU').ok, false, 'White Australia');
    assert.equal(eraRoute(grown('GB', 2010, 25).state, 'US'), null, 'today\'s visas');
  },
  'emigrating by steerage lands you there'() {
    let moved = false;
    for (let seed = 1; seed <= 4 && !moved; seed++) {
      const { engine, state } = grown('IE', 1900, 25, {}, seed);
      state.finances.cash = 20000;
      state.prompts = [];
      engine.dispatch('migration.emigrate', 'US:passage');
      if (state.character.countryId == null || state.character.countryId === 'US') moved = true;
    }
    assert.ok(moved);
  },
  'the People tab offers letters and calls of the year'() {
    const { state } = grown('IE', 1880, 30);
    kin(state, 'US');
    const html = VIEWS.people(state, {});
    assert.match(html, /travelDay\.write/);
    assert.doesNotMatch(html, /travelDay\.call/, 'no telephone yet');
    clean(html);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
