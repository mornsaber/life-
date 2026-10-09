/**
 * Profit levers for businesses without contracts (initiatives, promotions,
 * key accounts), and new rivals moving in when you've bought out the market.
 *
 *   node tests/levers.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { currentBusiness } from '../src/modules/business/Business.js';
import { forecast } from '../src/modules/business/Advisor.js';
import { INITIATIVES } from '../src/modules/business/Initiatives.js';
import { competitorsOf } from '../src/modules/org/Businesses.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function owner(seed, typeId = 'restaurant') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 40;
  Object.assign(state.stats, { smarts: 80, health: 95 });
  state.finances.cash = 5_000_000;
  state.housing.credit.score = 780;
  const t = BUSINESS_TYPES[typeId];
  for (const c of t.credentials) state.credentials.held[c] = { earnedAge: 25, renewedAge: 39, status: 'active' };
  state.career.history.push({ professionId: t.professions[0], title: 'Pro', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 4, startAge: 22, endAge: 39, reason: 'Left' });
  engine.dispatch('business.start', `${typeId}:cash:llc`);
  const biz = currentBusiness(state);
  biz.years = 4;
  return { engine, state, biz };
}
const year = (engine) => {
  engine.state.prompts = [];
  engine.state.stats.health = 95;
  engine.ageUp();
  for (let j = 0; j < 8 && engine.state.prompts.length; j++) {
    const p = engine.state.prompts[0];
    engine.resolvePrompt(p.id, (p.options.find((o) => ['decline', 'wait'].includes(o.id)) ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id); // never sell the business under test
  }
};
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);

const tests = {
  'initiatives change the forecast and cost money to start'() {
    const { engine, state, biz } = owner(1);
    biz.cash = 200_000;
    biz.quality = 70;
    const base = forecast(state, biz);
    for (const id of Object.keys(INITIATIVES)) {
      const f = forecast(state, biz, { biz: { initiatives: { [id]: state.character.age } } });
      assert.notEqual(Math.round(f.netIncome), Math.round(base.netIncome), `${id} changes profit`);
    }
    const before = biz.cash;
    engine.dispatch('business.toggleInitiative', 'online');
    assert.ok(biz.initiatives.online != null && biz.cash < before, 'paid setup');
    assert.ok(forecast(state, biz).revenue > base.revenue, 'more revenue');
    engine.dispatch('business.toggleInitiative', 'energy');
    assert.ok(forecast(state, biz).rent < base.rent, 'lower occupancy costs');
    engine.dispatch('business.toggleInitiative', 'online');
    assert.equal(biz.initiatives.online, undefined, 'switched off');
    engine.dispatch('business.promote', 'sale');
    assert.ok(forecast(state, biz).revenue > base.revenue, 'the sale lifts sales this year');
    engine.dispatch('business.promote', 'sponsor');
    assert.equal(biz.promo.id, 'sale', 'one promotion a year');
  },

  'key accounts arrive, add revenue, and walk when quality slips'() {
    const { engine, state, biz } = owner(2);
    biz.quality = 70;
    year(engine);
    assert.ok(biz.accountOffers?.length, 'offers');
    const k = biz.accountOffers[0];
    const base = forecast(state, biz).revenue;
    engine.dispatch('business.signAccount', k.id);
    assert.equal(biz.accounts.length, 1);
    assert.ok(forecast(state, biz).revenue > base, 'account revenue');
    biz.quality = 20;
    let lost = false;
    for (let y = 0; y < 6 && !lost; y++) { biz.quality = 20; biz.cash = Math.max(biz.cash, 300_000); year(engine); lost = !biz.accounts.some((a) => a.id === k.id); }
    assert.ok(lost, 'a client walked');
    const html = VIEWS.business(state, {});
    clean(html);
    assert.match(html, /Profit Levers/);
  },

  'a growth plan pulls the levers itself'() {
    const { engine, biz } = owner(3, 'consulting');
    biz.quality = 72;
    biz.cash = 1_000_000;
    biz.staff.headcount = Math.max(8, biz.staff.headcount);
    engine.dispatch('business.handOff');
    assert.ok(biz.plan, 'handed off');
    for (let y = 0; y < 3; y++) { biz.cash = Math.max(biz.cash, 1_000_000); year(engine); }
    assert.ok(Object.keys(biz.initiatives ?? {}).length || (biz.accounts ?? []).length, `management used levers: ${JSON.stringify(biz.plan.lastReport)}`);
  },

  'buy out every rival and new ones move in'() {
    const { engine, state, biz } = owner(4);
    biz.cash = 50_000_000;
    for (const o of competitorsOf(state, biz)) { state.yearly = {}; engine.dispatch('business.acquire', o.id); }
    assert.equal(competitorsOf(state, biz).length, 0, 'a monopoly — for now');
    let back = false;
    for (let y = 0; y < 5 && !back; y++) { biz.cash = Math.max(biz.cash, 1_000_000); year(engine); back = competitorsOf(state, biz).length > 0; }
    assert.ok(back, 'newcomers arrived');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} lever test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} profit-lever & market-entry tests passed`);
