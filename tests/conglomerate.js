/**
 * Dynamic competitors and conglomerates.
 *
 *   node tests/conglomerate.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { currentBusiness } from '../src/modules/business/Business.js';
import { competitorsOf, competitionFactor } from '../src/modules/org/Businesses.js';
import { marketShare, RIVAL_STRATEGIES } from '../src/modules/business/Rivals.js';
import { conglomerateOf, acquisitionTargets, appraise, holdingsCap } from '../src/modules/business/Conglomerate.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function owner(seed, typeId = 'consulting') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 40;
  Object.assign(state.stats, { smarts: 80, health: 95 });
  state.finances.cash = 20_000_000;
  state.housing.credit.score = 780;
  const t = BUSINESS_TYPES[typeId];
  for (const c of t.credentials) state.credentials.held[c] = { earnedAge: 25, renewedAge: 39, status: 'active' };
  state.career.history.push({ professionId: t.professions[0], title: 'Pro', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 4, startAge: 22, endAge: 39, reason: 'Left' });
  engine.dispatch('business.start', `${typeId}:cash:llc`);
  return { engine, state, biz: currentBusiness(state) };
}
const year = (engine) => {
  engine.state.prompts = [];
  engine.state.stats.health = 95;
  engine.ageUp();
  for (let j = 0; j < 8 && engine.state.prompts.length; j++) {
    const p = engine.state.prompts[0];
    engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
  }
};
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);

const tests = {
  'rivals have strategies and make moves; size and price wars cost you customers'() {
    const { engine, state, biz } = owner(1, 'restaurant');
    let moves = 0;
    for (let y = 0; y < 10; y++) {
      biz.cash = Math.max(biz.cash, 500_000);
      year(engine);
      moves += competitorsOf(state, biz).filter((o) => o.business.lastMove).length;
    }
    const rivals = competitorsOf(state, biz);
    assert.ok(rivals.length, 'a market');
    assert.ok(rivals.every((o) => RIVAL_STRATEGIES[o.business.strategy]), 'every rival has a strategy');
    assert.ok(moves > 0, 'rivals moved');
    // A price war and a big rival both cut into you.
    const base = competitionFactor(state, biz);
    const r = rivals[0];
    r.business.priceWarUntil = state.character.age + 2;
    r.business.scale = 6;
    assert.ok(competitionFactor(state, biz) < base, 'pressure');
    const shareBefore = marketShare(state, biz, rivals);
    biz.reputation = 95;
    assert.ok(marketShare(state, biz, rivals) > shareBefore, 'reputation wins share');
    clean(VIEWS.business(state, {}));
    assert.match(VIEWS.business(state, {}), /market share/);
  },

  'a holding company sweeps cash, saves on shared services, pays dividends and buys companies of any kind'() {
    const { engine, state, biz } = owner(2);
    // Two businesses: hand the first to management and hold it, then start a second.
    biz.staff.headcount = 10;
    biz.years = 4;
    engine.dispatch('business.handOff');
    engine.dispatch('business.makePassive');
    assert.equal(state.business.holdings.length, 1);
    engine.dispatch('business.start', 'consulting:cash:llc');
    assert.ok(currentBusiness(state), 'a second business');
    engine.dispatch('business.formConglomerate', 'Apex Group');
    const c = conglomerateOf(state);
    assert.ok(c && c.name === 'Apex Group');
    assert.equal(holdingsCap(state), 15);
    // Acquire something from another industry in town.
    const targets = acquisitionTargets(state);
    assert.ok(targets.length, 'companies for sale');
    const t = targets.find((o) => o.business.typeId !== 'consulting') ?? targets[0];
    const { price } = appraise(state, t);
    assert.ok(price > 0);
    engine.dispatch('business.acquireCompany', t.id);
    assert.ok(state.business.holdings.some((h) => h.orgId === t.id), 'bought into the group');
    assert.equal(state.orgs.byId[t.id].owner.kind, 'player');
    // Run a few years: treasury fills and pays out.
    for (const h of state.business.holdings) h.cash = 2_000_000;
    const cash = state.finances.cash;
    for (let y = 0; y < 3; y++) year(engine);
    assert.ok(c.lastReport.length, 'HQ report');
    assert.ok(c.treasury > 0 || state.finances.cash > cash, 'cash flowed up');
    const html = VIEWS.business(state, {});
    clean(html);
    assert.match(html, /Apex Group/);
  },

  'without enough to hold, you can\'t form one'() {
    const { engine, state } = owner(3);
    currentBusiness(state).valuation = 100_000;
    engine.dispatch('business.formConglomerate');
    assert.equal(conglomerateOf(state), null);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} conglomerate test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} rivals & conglomerate tests passed`);
