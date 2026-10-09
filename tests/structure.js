/**
 * Executive powers over a company's structure, and the public markets:
 * design (lean, regional), corporate divisions, spin-offs, IPO, trading and
 * taking private.
 *
 *   node tests/structure.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { currentBusiness, yearFinancials, valuation } from '../src/modules/business/Business.js';
import { ipoEligibility } from '../src/modules/business/Structure.js';
import { openBranch, businessOrg } from '../src/modules/org/Businesses.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{0,80}(NaN|undefined|\[object).{0,80}/)?.[0]);
const fixed = () => ({ float: () => 1, int: (a) => a, chance: () => false, pick: (l) => l[0], id: (p) => `${p}x` });
function company(seed, { entity = 'ccorp', scale = 6, headcount = 80 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 45;
  Object.assign(state.stats, { smarts: 75, health: 95 });
  state.finances.cash = 300_000_000;
  const t = BUSINESS_TYPES.restaurant;
  for (const c of t.credentials) state.credentials.held[c] = { earnedAge: 25, renewedAge: 44, status: 'active' };
  state.career.history.push({ professionId: 'culinary', title: 'Chef', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 4, startAge: 22, endAge: 44, reason: 'Left' });
  engine.dispatch('business.start', `restaurant:cash:${entity}`);
  const biz = currentBusiness(state);
  const home = businessOrg(state, biz).regionId;
  for (let i = 1; i < scale; i++) openBranch(state, biz, i % 2 ? 'denver' : home);
  Object.assign(biz, { scale, years: 6, cash: 5_000_000 });
  biz.staff.headcount = headcount;
  biz.lastYear = yearFinancials(state, biz, fixed());
  biz.valuation = valuation(biz);
  state.prompts = [];
  return { engine, state, biz };
}

const tests = {
  'only the chief executive (or a hands-on owner) restructures'() {
    const { engine, state, biz } = company(1);
    biz.role = 'absentee';
    engine.dispatch('business.setDesign', 'lean');
    assert.equal(biz.structure?.design ?? 'functional', 'functional');
    engine.dispatch('business.takePost', 'ceo');
    assert.equal(biz.role, 'executive');
    engine.dispatch('business.setDesign', 'lean');
    assert.equal(biz.structure.design, 'lean');
    clean(VIEWS.business(state));
    assert.ok(VIEWS.business(state).includes('Company Structure'));
  },

  'a lean design cuts payroll; divisions change the books'() {
    const { engine, state, biz } = company(2);
    biz.role = 'operator';
    const base = yearFinancials(state, biz, fixed());
    engine.dispatch('business.setDesign', 'lean');
    const lean = yearFinancials(state, biz, fixed());
    assert.ok(lean.payroll < base.payroll, `${base.payroll} → ${lean.payroll}`);
    state.yearly = {};
    engine.dispatch('business.toggleDivision', 'bizdev');
    assert.ok(biz.structure.divisions.includes('bizdev'));
    const sales = yearFinancials(state, biz, fixed());
    assert.ok(sales.revenue > lean.revenue, 'business development sells more');
    assert.ok(sales.structure > 0, 'and costs money');
    assert.ok(businessOrg(state, biz).departments.div_bizdev, 'a real department');
    engine.dispatch('business.toggleDivision', 'rnd');
    const q = biz.quality;
    engine.ageUp();
    assert.ok(biz.structure.divisions.includes('rnd'));
    assert.ok(biz.quality >= q - 10);
    // Shut one down.
    state.yearly = {};
    state.prompts = [];
    engine.dispatch('business.toggleDivision', 'bizdev');
    assert.ok(!biz.structure.divisions.includes('bizdev'));
    assert.ok(!businessOrg(state, biz).departments.div_bizdev);
  },

  'spin off a market as a separate company you hold'() {
    const { engine, state, biz } = company(3);
    biz.role = 'operator';
    const before = biz.scale;
    engine.dispatch('business.spinOff', 'denver');
    assert.ok(biz.scale < before, `${before} → ${biz.scale}`);
    const spun = state.business.holdings.find((h) => h.regionId === 'denver');
    assert.ok(spun, 'a held company');
    assert.equal(spun.scale + biz.scale, before);
    clean(VIEWS.business(state));
  },

  'go public, trade shares, take it private'() {
    const { engine, state, biz } = company(4, { scale: 30, headcount: 600 });
    biz.role = 'operator';
    biz.lastYear = { ...biz.lastYear, revenue: 40_000_000, netIncome: 3_000_000 };
    biz.books = [1, 2, 3].map((i) => ({ age: 40 + i, revenue: 40_000_000, netIncome: 3_000_000, scale: 30, staff: 600, valuation: biz.valuation, ownerPay: 0 }));
    assert.ok(ipoEligibility(state, biz).ok, ipoEligibility(state, biz).reason);
    engine.dispatch('business.goPublic');
    const p = state.prompts.find((x) => x.type === 'business.publicOffering');
    assert.ok(p, 'the roadshow');
    engine.resolvePrompt(p.id, 'ipo');
    assert.ok(biz.public, 'listed');
    const pct = biz.ownerPct;
    assert.ok(pct < 1);
    const cash = state.finances.cash;
    engine.dispatch('business.sellShares');
    assert.ok(biz.ownerPct < pct && state.finances.cash > cash);
    biz.cash = 50_000_000;
    const before = biz.ownerPct;
    engine.dispatch('business.buyback');
    assert.ok(biz.ownerPct > before, 'a buyback raises your stake');
    clean(VIEWS.business(state));
    engine.dispatch('business.takePrivate');
    assert.equal(biz.ownerPct, 1);
    assert.ok(!biz.public);
    // An LLC can't list.
    const llc = company(5, { entity: 'llc' });
    llc.biz.lastYear = { ...llc.biz.lastYear, revenue: 40_000_000, netIncome: 1 };
    assert.equal(ipoEligibility(llc.state, llc.biz).ok, false);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} structure test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} structure tests passed`);
