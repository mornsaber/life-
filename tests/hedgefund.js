/**
 * Your own fund: launching, the year's return and fees, investors, crashes, temptation, closing.
 *
 *   node tests/hedgefund.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, netWorth } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { HedgeFundModule, launchEligibility, strategiesNow, fundWord } from '../src/modules/investing/HedgeFund.js';
import { fundCard } from '../src/ui/views/FundView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year = 2015, seed = 3, smarts = 90) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', startYear: year - 40 });
  state.character.age = 40;
  state.stats.smarts = smarts;
  state.prompts = [];
  state.finances.cash = 5e6;
  return { engine, state, ctx: engine.context() };
};
/** Fund years in an ordinary market (the economy's own engine isn't running in these tests). */
const years = (m, n, market = 0.06) => { for (let i = 0; i < n && m.state.fund; i++) { m.state.prompts = []; m.state.character.age += 1; m.state.economy.returns.index = market; m.state.economy.phase = 'expansion'; HedgeFundModule.onAgeUp(m.ctx); } };

const tests = {
  'who can start one, and what it is called in its day'() {
    assert.equal(launchEligibility(life(2015, 1, 50).state).ok, false, 'not without finance or brains');
    assert.equal(launchEligibility(life(2015).state).ok, true);
    const poor = life(2015); poor.state.finances.cash = 1000;
    assert.match(launchEligibility(poor.state).reason, /seed/);
    const old = life(1930);
    assert.equal(fundWord(old.state, null), 'investment partnership');
    assert.deepEqual(strategiesNow(old.state).map((s) => s.id), ['longShort']);
    assert.deepEqual(strategiesNow(life(1990).state).map((s) => s.id), ['longShort', 'macro', 'quant', 'activist']);
  },
  'launching puts your seed in, and it counts in your net worth'() {
    const m = life();
    const before = netWorth(m.state);
    HedgeFundModule.actions.launch(m.ctx, 'quant');
    assert.ok(m.state.fund);
    assert.equal(m.state.fund.strategy, 'quant');
    assert.ok(Math.abs(netWorth(m.state) - before) < 10, 'cash moved into the fund');
    assert.match(fundCard(m.state), /Quant/);
  },
  'years run: fees paid, record kept, investors come and go'() {
    const m = life();
    HedgeFundModule.actions.launch(m.ctx, 'longShort');
    const cash = m.state.finances.cash;
    years(m, 10);
    if (m.state.fund) {
      assert.equal(m.state.fund.record.length, 10);
      assert.ok(m.state.fund.hwm >= m.state.fund.nav - 1e-9);
    }
    assert.ok(Number.isFinite(m.state.finances.cash) && m.state.finances.cash !== cash);
  },
  'borrowing five times in 2008 can end the fund'() {
    let ended = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const m = life(2007, seed);
      HedgeFundModule.actions.launch(m.ctx, 'quant');
      HedgeFundModule.actions.leverage(m.ctx, 5);
      years(m, 2);
      if (!m.state.fund) ended += 1;
    }
    assert.ok(ended >= 5, `${ended} of 20 blew up`);
  },
  'a tip traded on opens an insider-trading case'() {
    const m = life();
    HedgeFundModule.actions.launch(m.ctx);
    m.ctx.prompt({ type: 'hedgeFund.tip', title: 'A Tip', text: 't', options: [{ id: 'trade', label: 't' }, { id: 'pass', label: 'p' }] });
    const before = (m.state.legal.investigations ?? []).length + (m.state.legal.record ?? []).length;
    m.engine.resolvePrompt(m.state.prompts.at(-1).id, 'trade');
    assert.ok((m.state.legal.investigations ?? []).length + (m.state.legal.record ?? []).length > before);
  },
  'returning outside money makes a family office; winding up pays you'() {
    const m = life();
    HedgeFundModule.actions.launch(m.ctx);
    HedgeFundModule.actions.close(m.ctx);
    assert.equal(m.state.fund.outside, 0);
    assert.equal(fundWord(m.state), 'family office');
    const cash = m.state.finances.cash;
    HedgeFundModule.actions.close(m.ctx);
    assert.equal(m.state.fund, null);
    assert.ok(m.state.finances.cash > cash);
  },
  'a good manager makes money over twenty years, on average'() {
    let total = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const m = life(1990, seed, 95);
      HedgeFundModule.actions.launch(m.ctx, 'longShort');
      const start = m.state.finances.cash + m.state.fund.yours;
      years(m, 20);
      total += (m.state.finances.cash + (m.state.fund?.yours ?? 0)) / start;
    }
    assert.ok(total / 12 > 1.2, `average multiple ${(total / 12).toFixed(2)}`);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
