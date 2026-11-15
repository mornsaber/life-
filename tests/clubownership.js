/**
 * Owning a sports club: what's for sale where and when, the season, money, the ground, the fans.
 *
 *   node tests/clubownership.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, netWorth } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { ClubOwnershipModule, buyOptions, sportsHere, divisionName, clubPrice } from '../src/modules/business/ClubOwnership.js';
import { clubCard } from '../src/ui/views/ClubView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc = 'GB', year = 2015, seed = 3) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - 45 });
  state.character.age = 45;
  state.prompts = [];
  state.finances.cash = 1e11;
  return { engine, state, ctx: engine.context() };
};
const seasons = (m, n) => { for (let i = 0; i < n && m.state.club; i++) { m.state.prompts = []; m.state.character.age += 1; ClubOwnershipModule.onAgeUp(m.ctx); } };
const ids = (s) => sportsHere(s).map((x) => x.id);

const tests = {
  'what you can buy depends on the country and the year'() {
    assert.deepEqual(ids(life('GB', 2015).state), ['football']);
    assert.deepEqual(ids(life('GB', 1880).state), [], 'no league before 1888');
    assert.deepEqual(ids(life('US', 1930).state), ['baseball', 'gridiron', 'hockey']);
    assert.ok(ids(life('US', 2015).state).includes('soccer'));
    assert.deepEqual(ids(life('IN', 2000).state), []);
    assert.deepEqual(ids(life('IN', 2015).state), ['cricket']);
  },
  'divisions are named as they were'() {
    const old = life('GB', 1970).state;
    assert.equal(divisionName(old, 'football', 3), 'the First Division');
    assert.equal(divisionName(life('GB', 2010).state, 'football', 3), 'the Premier League');
    assert.match(divisionName(life('DE', 1950).state, 'football', 3), /Germany's top division/);
    assert.equal(divisionName(life('DE', 1990).state, 'football', 3), 'the Bundesliga');
  },
  'clubs were cheap before television money'() {
    assert.ok(clubPrice(life('GB', 2015).state, 'football', 3) > clubPrice(life('GB', 1960).state, 'football', 3) * 10);
  },
  'buying, a season and the result'() {
    const m = life();
    const o = buyOptions(m.state).find((x) => x.tier === 2);
    const before = netWorth(m.state);
    ClubOwnershipModule.actions.buy(m.ctx, `${o.sport}:${o.tier}`);
    assert.ok(m.state.club);
    assert.ok(Math.abs(netWorth(m.state) - before) < o.price * 0.01 + 10, 'the club counts in your net worth');
    seasons(m, 1);
    const last = m.state.club.seasons.at(-1);
    assert.ok(last.pos >= 1 && last.pos <= 20);
    assert.match(clubCard(m.state), /result-card/);
  },
  'spending builds a squad; promotion and relegation move you'() {
    let moved = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const m = life('GB', 2010, seed);
      ClubOwnershipModule.actions.buy(m.ctx, 'football:1');
      for (let i = 0; i < 3; i++) ClubOwnershipModule.actions.wages(m.ctx, 'up');
      seasons(m, 6);
      if (m.state.club?.seasons.some((x) => ['promoted', 'relegated'].includes(x.note))) moved += 1;
    }
    assert.ok(moved >= 3, `${moved} of 8 changed division`);
  },
  'a franchise has no relegation'() {
    const m = life('US', 2015);
    ClubOwnershipModule.actions.buy(m.ctx, 'baseball:3');
    seasons(m, 10);
    assert.equal(m.state.club.tier, 3);
  },
  'a leased ground stays yours when the club is sold'() {
    const m = life();
    ClubOwnershipModule.actions.buy(m.ctx, 'football:2');
    m.state.club.stadium.owned = true;
    m.state.club.stadium.tenant = { name: 'Tenants', rent: 100000, years: 5 };
    const value = m.state.club.value;
    const cash = m.state.finances.cash;
    ClubOwnershipModule.actions.sell(m.ctx);
    assert.equal(m.state.club, null);
    assert.ok(m.state.finances.cash - cash < value, 'sold without the ground');
  },
  'angry fans and takeover bids resolve'() {
    const m = life();
    ClubOwnershipModule.actions.buy(m.ctx, 'football:2');
    m.state.club.fans = 5;
    m.state.character.age += 1;
    ClubOwnershipModule.onAgeUp(m.ctx);
    const p = m.state.prompts.find((x) => x.type === 'clubOwnership.protest');
    if (p) { m.engine.resolvePrompt(p.id, 'listen'); assert.equal(m.state.club.ticket, 'low'); }
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
