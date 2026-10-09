/**
 * Business taxes, capital moves, B2B profit levers and holding companies
 * (executives, offices, mergers).
 *
 *   node tests/capital.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { currentBusiness, yearFinancials, charge } from '../src/modules/business/Business.js';
import { INITIATIVES, initiativesFor, promotionsFor, leverFamily } from '../src/modules/business/Initiatives.js';
import { openingsPerYear, withdrawable } from '../src/modules/business/Capital.js';
import { mergeCandidates, OFFICES } from '../src/modules/business/HoldingCo.js';
import { conglomerateTick } from '../src/modules/business/Conglomerate.js';
import { maxScale, expansionCost } from '../src/modules/business/BusinessEngine.js';
import { PROPERTY_TYPES, priceOf } from '../src/modules/realestate/index.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function owner(seed, typeId = 'consulting', entity = 'llc') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 40;
  Object.assign(state.stats, { smarts: 80, health: 95 });
  state.finances.cash = 20_000_000;
  state.housing.credit.score = 780;
  const t = BUSINESS_TYPES[typeId];
  for (const c of t.credentials) state.credentials.held[c] = { earnedAge: 25, renewedAge: 39, status: 'active' };
  state.career.history.push({ professionId: t.professions[0], title: 'Pro', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 4, startAge: 22, endAge: 39, reason: 'Left' });
  engine.dispatch('business.start', `${typeId}:cash:${entity}`);
  return { engine, state, biz: currentBusiness(state) };
}
const year = (engine) => {
  engine.state.prompts = [];
  engine.state.stats.health = 95;
  engine.ageUp();
  for (let j = 0; j < 8 && engine.state.prompts.length; j++) {
    const p = engine.state.prompts[0];
    engine.resolvePrompt(p.id, (p.options.find((o) => ['decline', 'wait'].includes(o.id)) ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
  }
};
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);
const tests = {
  'off-book expenses and capital purchases cut taxable profit (not cash twice)'() {
    const { engine, state, biz } = owner(1);
    biz.years = 3;
    const before = yearFinancials(state, biz, engine.rng);
    charge(biz, 50000);
    charge(biz, 100000, 'capex', 300000);
    const after = yearFinancials(state, biz, engine.rng);
    assert.equal(after.writeOffs, 450000, 'expense plus the whole capital cost (incl. financed part)');
    assert.equal(after.taxableProfit, after.netIncome - 450000);
    assert.ok(Math.abs(after.operatingIncome - before.operatingIncome) < Math.abs(before.operatingIncome) * 0.5 + 50000, 'cash profit not hit again');
    year(engine);
    assert.deepEqual(currentBusiness(state).taxBook, { expense: 0, capex: 0 }, 'written off once, then reset');
  },

  'pass-through: losses offset your other income; reinvested profit comes with a tax distribution'() {
    const { engine, state, biz } = owner(2);
    biz.years = 3;
    // A loss year (big write-off).
    biz.taxBook = { expense: 2_000_000, capex: 0 };
    state.finances.ledger = { income: [], expenses: [], deductions: [], itemize: [] };
    year(engine);
    const ly = currentBusiness(state).lastYear;
    assert.ok(ly.lossDeducted > 0 && ly.lossDeducted <= 313000, `loss deducted (${ly.lossDeducted})`);
    // Reinvest everything: management keeps the cash, you still get enough to pay the tax.
    biz.drawPct = 0;
    biz.cash = 5_000_000;
    for (let i = 0; i < 6 && !(biz.lastYear?.taxableProfit > 0); i++) year(engine);
    if (biz.lastYear.taxableProfit > 0) assert.ok(biz.lastYear.taxDistribution > 0, 'tax distribution paid');
  },

  'depreciation and business losses do not shrink your lifestyle budget'() {
    const { engine } = owner(3);
    const ctx = engine.context();
    ctx.deduct(100000, 'Rental depreciation', { nonCash: true });
    assert.ok(engine.state.finances.ledger.deductions.at(-1).nonCash);
  },

  'C-corp profit swept to a holding company is a taxed dividend; treasury payouts are not taxed again'() {
    const { engine, state, biz } = owner(4, 'consulting', 'ccorp');
    biz.valuation = 4_000_000;
    biz.years = 3;
    engine.dispatch('business.formConglomerate', 'Case Holdings');
    const c = state.business.conglomerate;
    biz.cash = 3_000_000;
    biz.lastYear = { revenue: 2_000_000, netIncome: 400_000 };
    c.payout = 1;
    state.finances.ledger = { income: [], expenses: [], deductions: [], itemize: [] };
    const cash = state.finances.cash;
    conglomerateTick(engine.context(), { maxScale, expansionCost });
    const div = state.finances.ledger.income.find((i) => /Dividends — .* \(to Case Holdings\)/.test(i.source));
    assert.ok(div && div.ltcg && div.retained, 'the sweep is a dividend, taxed but kept in the treasury');
    assert.ok(state.finances.ledger.deductions.some((d) => /headquarters/.test(d.reason) && d.nonCash), 'HQ costs deductible');
    assert.ok(state.finances.cash > cash, 'distribution paid');
    assert.ok(!state.finances.ledger.income.some((i) => /distribution/i.test(i.source)), 'the distribution itself is not taxed again');
  },

  'put money in, take it out, buy back a stake'() {
    const { engine, state, biz } = owner(5);
    const cash = state.finances.cash;
    engine.dispatch('business.capitalIn', `${biz.id}:200000`);
    assert.equal(state.finances.cash, cash - 200000);
    assert.ok(biz.basis >= 200000 && biz.contributed === 200000);
    const spare = withdrawable(biz);
    assert.ok(spare > 0);
    engine.dispatch('business.capitalOut', `${biz.id}:max`);
    assert.ok(state.finances.cash > cash - 200000, 'money came back');
    assert.ok(!state.finances.ledger.income.some((i) => /Dividend/.test(i.source)), 'pass-through: no tax on taking out already-taxed money');
    // Sell a stake, then buy it back.
    biz.valuation = 1_000_000;
    biz.ownerPct = 0.75;
    biz.investors = [{ round: 'private', pct: 0.25, invested: 200000 }];
    engine.dispatch('business.buyBack', `${biz.id}:0.1:you`);
    assert.equal(biz.ownerPct, 0.85);
    engine.dispatch('business.buyBack', `${biz.id}:all:you`);
    assert.equal(biz.ownerPct, 1);
    assert.equal(biz.investors.length, 0);
  },

  'C-corp withdrawals: contributed capital back tax-free, the rest a dividend'() {
    const { engine, state, biz } = owner(6, 'consulting', 'ccorp');
    engine.dispatch('business.capitalIn', `${biz.id}:100000`);
    biz.cash += 400000;
    engine.dispatch('business.capitalOut', `${biz.id}:300000`);
    const div = state.finances.ledger.income.find((i) => /Dividend/.test(i.source));
    assert.ok(div && div.ltcg && div.amount === 200000, JSON.stringify(div));
  },

  'more than one location a year; more with a management team and a bigger chain'() {
    const { engine, state, biz } = owner(7, 'retail');
    biz.years = 3;
    biz.cash = 5_000_000;
    assert.equal(openingsPerYear(biz), 2);
    engine.dispatch('business.expand', 'cash:2');
    assert.equal(biz.scale, 3, 'two at once');
    engine.dispatch('business.expand', 'cash:1');
    assert.equal(biz.scale, 3, 'operator limit');
    biz.role = 'absentee';
    biz.scale = 18;
    assert.ok(openingsPerYear(biz) >= 5);
    state.yearly['business.expand'] = 0;
    engine.dispatch('business.expand', 'cash:4');
    assert.equal(biz.scale, 22);
  },

  'profit levers fit the business: B2B firms get sales teams, not loyalty cards'() {
    assert.equal(leverFamily('consulting'), 'b2b');
    assert.equal(leverFamily('trucking'), 'field');
    assert.equal(leverFamily('restaurant'), 'consumer');
    const b2b = { typeId: 'consulting' };
    assert.ok(initiativesFor(b2b).salesTeam && !initiativesFor(b2b).loyalty && !initiativesFor(b2b).extendedHours);
    assert.ok(initiativesFor({ typeId: 'trucking' }).telematics && !initiativesFor({ typeId: 'trucking' }).online);
    assert.ok(promotionsFor(b2b).tradeShow && !promotionsFor(b2b).sale);
    const { engine, biz } = owner(8);
    biz.cash = 500000;
    engine.dispatch('business.toggleInitiative', 'loyalty');
    assert.ok(!biz.initiatives?.loyalty, 'not offered');
    engine.dispatch('business.toggleInitiative', 'salesTeam');
    assert.ok(biz.initiatives.salesTeam != null);
    biz.initiatives.loyalty = 40; // from an old save
    year(engine);
    assert.ok(biz.initiatives.loyalty == null, 'mismatched programs wind down');
    for (const i of Object.values(INITIATIVES)) assert.ok(i.for?.length, i.name);
    clean(VIEWS.business(engine.state, {}));
  },

  'a holding company hires executives, takes offices and merges same-type companies'() {
    const { engine, state, biz } = owner(9);
    biz.years = 3;
    const twin = structuredClone(biz);
    Object.assign(twin, { id: 'biz_twin', name: 'Second Consulting', orgId: null, scale: 2, valuation: 500000, role: 'absentee' });
    state.business.holdings = [twin];
    biz.valuation = 3_000_000;
    engine.dispatch('business.formConglomerate', 'Case Group');
    const c = state.business.conglomerate;
    c.treasury = 2_000_000;
    // Executives: a search, three finalists.
    engine.dispatch('business.hireExec', 'coo');
    const p = state.prompts.find((x) => x.type === 'business.execHire');
    assert.ok(p && p.options.length === 4);
    engine.resolvePrompt(p.id, 'c0');
    assert.ok(c.executives.coo?.salary > 0);
    engine.dispatch('business.hireExec', 'cfo');
    engine.resolvePrompt(state.prompts.find((x) => x.type === 'business.execHire').id, 'c1');
    engine.dispatch('business.hireExec', 'cmo');
    assert.ok(!state.prompts.some((x) => x.type === 'business.execHire' && x.data.role === 'cmo'), 'a virtual office holds two');
    engine.dispatch('business.hqOffice', 'floor');
    assert.equal(c.office, 'floor');
    engine.dispatch('business.hireExec', 'cmo');
    assert.ok(state.prompts.some((x) => x.type === 'business.execHire' && x.data.role === 'cmo'));
    engine.resolvePrompt(state.prompts.find((x) => x.type === 'business.execHire').id, 'none');
    // HQ in your own office building: the rent comes back to you.
    const regionId = state.character.regionId;
    const value = Math.round(priceOf(state, 'office', regionId));
    state.housing.properties.push({ id: 'prop_office', type: 'office', typeName: PROPERTY_TYPES.office.name, regionId, value, valueAdj: 1, purchasePrice: value, purchaseAge: 40, condition: 80, use: 'rental', mortgage: null, heloc: null, tenants: [], insured: true });
    engine.dispatch('business.hqOffice', 'own:prop_office');
    assert.equal(c.office, 'own');
    assert.ok(state.housing.properties[0].tenants.some((t) => t.hq));
    // Merge.
    assert.equal(mergeCandidates(state).length, 1);
    const scale = biz.scale + twin.scale;
    engine.dispatch('business.mergeSubsidiaries', `${biz.id}:${twin.id}`);
    assert.equal(currentBusiness(state).scale, scale);
    assert.equal(state.business.holdings.length, 0);
    state.prompts = [];
    year(engine);
    assert.ok(c.lastReport.length);
    assert.ok(OFFICES[c.office]);
    clean(VIEWS.business(state, {}));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} capital test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} capital tests passed`);
