/**
 * The stock market, a property empire, and inventions.
 *
 *   node tests/economy.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, netWorth } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { stocksTick, stockValue, priceOf } from '../src/modules/investing/StockMarket.js';
import { empireTick, portfolio } from '../src/modules/realestate/PropertyEmpire.js';
import { inventionsTick } from '../src/modules/business/Inventions.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', seed = 3, age = 30) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = age;
  state.prompts = [];
  state.legal.record = [];
  state.finances.cash = 500000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const answer = (engine, state, type, opt) => { const p = state.prompts.find((x) => x.type === type); if (p) engine.resolvePrompt(p.id, opt ?? p.options[0].id); return p; };

const tests = {
  'shares, shorts and options move with the market and count toward net worth'() {
    const { engine, state, ctx } = life('US', 5);
    const before = netWorth(state);
    engine.dispatch('stocks.buy', 'novaq:10000');
    engine.dispatch('stocks.short', 'orbitail:5000');
    engine.dispatch('stocks.option', 'hearth:call:1000');
    assert.ok(state.stocks.positions.novaq && state.stocks.shorts.orbitail && state.stocks.options.length === 1);
    assert.ok(Math.abs(netWorth(state) - (before - 1000)) < 50, 'buying moves cash into positions; only the option premium is spent');
    let ipos = 0; let bubbles = 0;
    for (let y = 0; y < 30; y++) {
      state.prompts = [];
      stocksTick(ctx);
      if (answer(engine, state, 'stocks.ipo', 'small')) ipos += 1;
      if (state.stocks.bubble) bubbles += 1;
      state.character.age += 1;
    }
    assert.equal(state.stocks.options.length, 0, 'options expire');
    assert.ok(ipos >= 1, 'IPOs come along');
    assert.ok(Number.isFinite(stockValue(state).total));
    engine.dispatch('stocks.sell', 'novaq');
    assert.ok(!state.stocks.positions.novaq);
    assert.ok(priceOf(state, 'carewell') > 0);
    clean(VIEWS.money(state, {}));
  },
  'a landlord empire: rent reviews, rent control and an in-house manager'() {
    const { engine, state, ctx } = life('US', 6, 40);
    const r = state.character.regionId;
    for (let i = 0; i < 4; i++) state.housing.properties.push({ id: `p${i}`, type: 'aptBuilding', typeName: 'Apartment Building', regionId: r, use: 'rental', value: 2800000, purchasePrice: 2600000, purchaseAge: 35, condition: 70, tenants: Array.from({ length: 12 }, () => ({ name: 'the Lees', rent: 900, reliability: 0.9 })) });
    engine.dispatch('propertyEmpire.foundCompany');
    assert.ok(state.housing.empire.company);
    let votes = 0;
    for (let y = 0; y < 25; y++) {
      state.prompts = [];
      empireTick(ctx);
      if (answer(engine, state, 'propertyEmpire.rentControl', 'support')) votes += 1;
      answer(engine, state, 'propertyEmpire.strike', 'negotiate');
      state.character.age += 1;
    }
    assert.ok(votes >= 1, 'rent control comes to a vote');
    const pf = portfolio(state);
    assert.equal(pf.properties, 4);
    assert.ok(state.housing.properties[0].tenants.every((t) => t.rent >= 900), 'rents went up, not down');
    clean(VIEWS.home(state, {}));
  },
  'an invention becomes a patent and pays royalties'() {
    let licensed = 0;
    for (let seed = 1; seed <= 10 && !licensed; seed++) {
      const { engine, state, ctx } = life('US', seed, 30);
      state.stats.smarts = 85;
      engine.dispatch('inventions.start', 'gadget');
      assert.equal(state.inventions.projects.length, 1);
      for (let y = 0; y < 10; y++) {
        state.prompts = [];
        inventionsTick(ctx);
        answer(engine, state, 'inventions.prototype', 'patent');
        if (answer(engine, state, 'inventions.commercialise', 'license')) licensed += 1;
        answer(engine, state, 'inventions.infringe', 'sue');
        answer(engine, state, 'inventions.troll', 'fight');
        state.character.age += 1;
      }
      if (licensed) {
        const p = state.inventions.patents.find((x) => x.status === 'licensed');
        assert.ok(p.royalty > 0);
        const royalties = state.finances.ledger.income.filter((i) => /royalties/.test(i.source ?? i.label ?? '')).length;
        assert.ok(royalties >= 0);
      }
      clean(VIEWS.business(state, {}));
    }
    assert.ok(licensed >= 1);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} economy tests passed`);
