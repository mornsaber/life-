/**
 * Money of its day (economy/MoneyOfTheDay.js): inflation of the time and place, the crashes that
 * hit where you live, hyperinflations that wipe out savings and debts, and what things cost then.
 *
 *   node tests/moneyday.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { decadeInflation, hyperHere, priceThen, BASKET, livingStandard, CRASHES } from '../src/modules/economy/MoneyOfTheDay.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (opts, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ gender: 'male', ...opts });
  return { engine, state, ctx: engine.context() };
};
const years = (engine, state, n, each) => {
  for (let i = 0; i < n && state.character.alive; i++) {
    for (let g = 0; g < 30 && state.prompts.length; g++) { const p = state.prompts[0]; engine.resolvePrompt(p.id, (each?.(p) ?? p.options.find((o) => !o.disabled) ?? p.options[0]).id); }
    engine.ageUp();
  }
};

const tests = {
  'inflation of the time and place'() {
    assert.ok(decadeInflation(life({ countryId: 'GB', startYear: 1975 }).state) > 0.1, 'Britain in the 1970s');
    assert.ok(decadeInflation(life({ countryId: 'US', startYear: 1885 }).state) <= 0, 'the gold standard');
    assert.ok(decadeInflation(life({ countryId: 'AR', startYear: 1985 }).state) > 0.5, 'Argentina in the 1980s');
    const { engine, state } = life({ countryId: 'GB', startYear: 1952 });
    years(engine, state, 25);
    const seventies = state.economy.history.filter((h) => h.year >= 1973 && h.year < 1980);
    assert.ok(seventies.length && seventies.every((h) => h.inflation >= 0.05), seventies.map((h) => h.inflation).join(','));
    assert.ok(state.economy.interestRate <= 0.16, 'rates stay workable');
  },
  'a crash where you live (and not where you don\'t)'() {
    const hit = life({ countryId: 'SE', startYear: 1960 });
    hit.state.character.age = 30;
    years(hit.engine, hit.state, 2);
    assert.equal(hit.state.moneyDay.done.nordicBanks, 1991);
    assert.ok(hit.state.log.some((y) => y.entries.some((x) => /Nordic banking crisis/.test(x.text))));
    const miss = life({ countryId: 'US', startYear: 1960 });
    miss.state.character.age = 30;
    years(miss.engine, miss.state, 2);
    assert.equal(miss.state.moneyDay.done.nordicBanks, undefined);
    assert.ok(CRASHES.every((c) => c.text && c.where.length));
  },
  'hyperinflation: hold your savings and lose them; your debts go too'() {
    const { engine, state } = life({ countryId: 'DE', startYear: 1890 });
    state.character.age = 31;
    state.finances.cash = 100000;
    state.finances.loans = 20000;
    years(engine, state, 3, (p) => (p.type === 'moneyDay.hyper' ? p.options.find((o) => o.id === 'hold') : null));
    assert.equal(state.moneyDay.done.weimar, 1922);
    assert.ok(state.finances.cash < 20000, `cash ${state.finances.cash}`);
    assert.ok(state.finances.loans < 2000, `loans ${state.finances.loans}`);
  },
  'hyperinflation: dollars and gold keep most of it'() {
    const { engine, state } = life({ countryId: 'DE', startYear: 1890 });
    state.character.age = 31;
    state.finances.cash = 100000;
    years(engine, state, 3, (p) => (p.type === 'moneyDay.hyper' ? p.options.find((o) => o.id === 'foreign') : null));
    assert.ok(state.finances.cash > 40000, `cash ${state.finances.cash}`);
    assert.equal(hyperHere(life({ countryId: 'ZW', startYear: 1980 }).state), null);
  },
  'what things cost then'() {
    const s = life({ countryId: 'US', startYear: 1950 }).state;
    const bread = priceThen(s, BASKET.find((b) => b.id === 'bread'));
    assert.ok(bread.ofTheDay < 0.5, `bread in 1950: $${bread.ofTheDay}`);
    assert.equal(priceThen(life({ countryId: 'US', startYear: 1940 }).state, BASKET.find((b) => b.id === 'tv')), null, 'no televisions to buy before 1948');
    assert.ok(livingStandard(life({ countryId: 'GB', startYear: 1880 }).state) < 0.3);
  },
  'the Money tab: Money of its year'() {
    const { state } = life({ countryId: 'US', startYear: 1930 });
    const html = VIEWS.money(state, {});
    assert.match(html, /Money of 1930/);
    assert.match(html, /In 1930 dollars/);
    assert.doesNotMatch(html, /undefined|NaN/);
    const fr = life({ countryId: 'FR', startYear: 1900 }).state;
    assert.match(VIEWS.money(fr, {}), /Money of 1900/);
    assert.doesNotMatch(VIEWS.money(life({ countryId: 'US' }).state, {}), /Money of/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
