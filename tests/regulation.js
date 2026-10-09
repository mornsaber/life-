/**
 * Government regulation: market share, antitrust investigations (settle,
 * fight, break-up), merger review and compliance.
 *
 *   node tests/regulation.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { currentBusiness, yearFinancials } from '../src/modules/business/Business.js';
import { marketPosition, exposure, mergerReview, regulationYear } from '../src/modules/business/Regulation.js';
import { openBranch, businessOrg, competitorsOf, npcBusiness } from '../src/modules/org/Businesses.js';
import { enact } from '../src/modules/politics/Laws.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{0,80}(NaN|undefined|\[object).{0,80}/)?.[0]);
/** A retail chain with `n` stores in its home city and few rivals. */
function chain(seed, n = 45) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 45;
  Object.assign(state.stats, { smarts: 70, health: 95 });
  state.finances.cash = 80_000_000;
  const t = BUSINESS_TYPES.retail;
  for (const c of t.credentials) state.credentials.held[c] = { earnedAge: 25, renewedAge: 44, status: 'active' };
  state.career.history.push({ professionId: 'retail', title: 'Manager', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 4, startAge: 22, endAge: 44, reason: 'Left' });
  engine.dispatch('business.start', 'retail:cash:ccorp');
  const biz = currentBusiness(state);
  const home = businessOrg(state, biz).regionId;
  for (let i = 1; i < n; i++) openBranch(state, biz, home);
  Object.assign(biz, { scale: n, years: 8, role: 'absentee', valuation: 60_000_000, lastYear: { ...yearFinancials(state, biz, new Random(1)), revenue: 80_000_000 } });
  biz.staff.headcount = n * 12;
  for (const o of competitorsOf(state, biz)) o.closed = true;
  npcBusiness(state, 'retail', home, { reputation: 50 });
  return { engine, state, biz, home };
}
const deps = (engine) => ({ sellHolding: () => {} });

const tests = {
  'market share and exposure follow your locations against rivals'() {
    const { state, biz } = chain(1);
    const pos = marketPosition(state, 'retail');
    assert.equal(pos.locations, biz.scale);
    assert.ok(pos.share > 0.5, `share ${pos.share}`);
    assert.ok(exposure(state, pos) >= 90);
    const html = VIEWS.business(state);
    clean(html);
    assert.ok(html.includes('Antitrust exposure'));
  },

  'a dominant company is investigated; a consent decree sells locations to a competitor'() {
    const { engine, state, biz, home } = chain(2);
    enact(state, { level: 'federal', lawId: 'antitrust', value: 'aggressive', age: 45 });
    biz.role = 'executive';
    biz.ownerPost = { post: 'chair', salary: 0, years: 0 };
    biz.autopilot = false;
    let p = null;
    for (let i = 0; i < 30 && !p; i++) {
      state.prompts = [];
      regulationYear(engine.context(), deps(engine));
      p = state.prompts.find((x) => x.type === 'business.antitrust');
    }
    assert.ok(p, 'an investigation opened');
    const before = biz.scale;
    const rivals = competitorsOf(state, biz).reduce((n, o) => n + (o.business.scale ?? 1), 0);
    engine.resolvePrompt(p.id, 'settle');
    assert.ok(biz.scale < before, `stores ${before} → ${biz.scale}`);
    assert.ok(competitorsOf(state, biz).reduce((n, o) => n + (o.business.scale ?? 1), 0) > rivals, 'a buyer runs them');
    assert.ok(marketPosition(state, 'retail').share < 0.9);
    assert.ok(!state.business.regulation.cases.retail, 'case closed');
    assert.ok(home);
  },

  'fighting in court: win, or the company is broken up'() {
    let brokenUp = 0;
    let won = 0;
    for (let seed = 3; seed < 15; seed++) {
      const { engine, state, biz } = chain(seed);
      enact(state, { level: 'federal', lawId: 'antitrust', value: 'aggressive', age: 45 });
      biz.role = 'executive';
      biz.ownerPost = { post: 'chair', salary: 0, years: 0 };
      biz.autopilot = false;
      let p = null;
      for (let i = 0; i < 30 && !p; i++) {
        state.prompts = [];
        regulationYear(engine.context(), deps(engine));
        p = state.prompts.find((x) => x.type === 'business.antitrust');
      }
      if (!p) continue;
      engine.resolvePrompt(p.id, 'fight');
      assert.equal(state.business.regulation.cases.retail.stage, 'trial');
      const before = biz.scale;
      state.prompts = [];
      regulationYear(engine.context(), deps(engine));
      assert.ok(!state.business.regulation.cases.retail, 'the court ruled');
      if (biz.scale < before) {
        brokenUp += 1;
        assert.ok(biz.scale <= Math.ceil(before / 2) + 1, `broken up: ${before} → ${biz.scale}`);
      } else won += 1;
    }
    assert.ok(brokenUp > 0, 'some lose and are broken up');
    assert.ok(brokenUp + won >= 5);
  },

  'merger review blocks buying a dominant share'() {
    const { state, home } = chain(20);
    const target = npcBusiness(state, 'retail', home, { reputation: 60 });
    target.business.scale = 3;
    const r = mergerReview(state, target);
    assert.equal(r.ok, false, r.reason);
    // A small player buying a small rival is fine.
    const small = chain(21, 1);
    const t2 = npcBusiness(small.state, 'retail', small.home, { reputation: 60 });
    small.biz.lastYear.revenue = 500_000;
    assert.ok(mergerReview(small.state, t2).ok);
  },

  'big companies pay for compliance and sometimes get fined'() {
    const { engine, state, biz } = chain(30);
    let fined = 0;
    for (let i = 0; i < 40; i++) {
      biz.taxBook = { expense: 0, capex: 0 };
      state.business.regulation = { cases: {}, actions: state.business.regulation?.actions ?? [], seed: state.business.regulation?.seed };
      regulationYear(engine.context(), deps(engine));
      assert.ok(biz.taxBook.expense >= 80_000_000 * 0.0025, 'compliance cost');
    }
    fined = state.business.regulation.actions.filter((a) => /fine/.test(a.text)).length;
    assert.ok(fined > 0, 'regulators found something now and then');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} regulation test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} regulation tests passed`);
