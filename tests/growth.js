/**
 * Delegating and automating a growing business: growth plans, the one-click
 * hand-off, and management that expands, staffs and reports on its own.
 *
 *   node tests/growth.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { currentBusiness } from '../src/modules/business/Business.js';
import { maxScale } from '../src/modules/business/BusinessEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function owner(seed, typeId) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 35;
  Object.assign(state.stats, { smarts: 80, health: 95 });
  state.finances.cash = 3_000_000;
  state.housing.credit.score = 760;
  const t = BUSINESS_TYPES[typeId];
  for (const c of t.credentials) state.credentials.held[c] = { earnedAge: 25, renewedAge: 34, status: 'active' };
  state.career.history.push({ professionId: t.professions[0], title: 'Pro', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 4, startAge: 22, endAge: 34, reason: 'Left' });
  engine.dispatch('business.start', `${typeId}:cash:llc`);
  const biz = currentBusiness(state);
  assert.ok(biz, `started ${typeId}`);
  return { engine, state, biz };
}
/** Age up, letting management answer whatever still comes to you. */
function years(engine, n) {
  let prompts = 0;
  for (let i = 0; i < n; i++) {
    engine.state.prompts = [];
    engine.state.character.health = 100;
    engine.state.stats.health = 95;
    engine.ageUp();
    for (let j = 0; j < 8 && engine.state.prompts.length; j++) {
      const p = engine.state.prompts[0];
      if (p.type.startsWith('business.')) prompts += 1;
      engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
    }
  }
  return prompts;
}
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);

const tests = {
  'small businesses can\'t delegate yet; a second location or 8 staff unlocks it'() {
    const { engine, biz } = owner(1, 'restaurant');
    biz.staff.headcount = 3;
    engine.dispatch('business.setPlan', 'steady');
    assert.ok(!biz.plan || biz.plan.strategy === 'off', 'needs managers first');
    biz.staff.headcount = 12;
    engine.dispatch('business.setPlan', 'steady');
    assert.equal(biz.plan.strategy, 'steady');
  },

  'a handed-off business grows on its own and sends one report a year'() {
    const { engine, state, biz } = owner(2, 'consulting');
    biz.staff.headcount = Math.max(8, biz.staff.headcount);
    biz.quality = 75;
    biz.reputation = 70;
    biz.years = 3;
    engine.dispatch('business.handOff');
    assert.equal(biz.role, 'absentee');
    assert.ok(biz.autopilot && biz.plan.strategy === 'steady');
    assert.ok(Object.values(biz.staff.delegation).every(Boolean), 'every duty delegated');
    let maxSeen = biz.scale;
    for (let y = 0; y < 12; y++) {
      biz.cash = Math.max(biz.cash, 2_000_000); // a well-capitalized chain
      biz.quality = Math.max(biz.quality, 70);
      years(engine, 1);
      maxSeen = Math.max(maxSeen, currentBusiness(state)?.scale ?? 0);
    }
    assert.ok(maxSeen >= 3, `management opened locations (${maxSeen})`);
    assert.ok(biz.plan.lastReport, 'a report');
    assert.ok(state.log.some((l) => l.entries?.some((e) => e.text.includes('steady growth plan'))), 'report in the log');
    clean(VIEWS.business(state, {}));
    assert.match(VIEWS.business(state, {}), /Management &amp; Growth|Management & Growth/);
  },

  'management won\'t expand a business that wouldn\'t pay for it'() {
    const { engine, biz } = owner(7, 'restaurant');
    biz.staff.headcount = 12;
    biz.quality = 50;
    biz.years = 3;
    engine.dispatch('business.handOff');
    for (let y = 0; y < 3; y++) { biz.cash = Math.max(biz.cash, 2_000_000); years(engine, 1); }
    assert.ok(biz.lastYear.netIncome > -100000 || biz.scale === 1, 'no money-losing expansion spree');
  },

  'with a CEO and 40+ staff a chain can pass five locations'() {
    const { state, biz } = owner(3, 'restaurant');
    biz.role = 'absentee';
    biz.staff.headcount = 60;
    assert.ok(maxScale(state, biz) > 5);
    biz.role = 'operator';
    biz.staff.headcount = 10;
    assert.equal(maxScale(state, biz), 5);
  },

  'harvest pays you out and stops growing; aggressive borrows to grow'() {
    const h = owner(4, 'restaurant');
    h.biz.staff.headcount = 12;
    h.biz.years = 4;
    h.engine.dispatch('business.setPlan', 'harvest');
    const scale = h.biz.scale;
    years(h.engine, 3);
    assert.equal(h.biz.drawPct, 1);
    assert.equal(h.biz.scale, scale, 'no expansion');
    const a = owner(5, 'restaurant');
    a.biz.staff.headcount = 12;
    a.biz.years = 4;
    a.biz.quality = 70;
    a.engine.dispatch('business.setPlan', 'aggressive');
    a.biz.cash = 120_000; // short of a cash expansion, enough for an SBA down payment
    a.biz.lastYear = { ...(a.biz.lastYear ?? {}), netIncome: 80_000, revenue: 900_000 };
    years(a.engine, 1);
    assert.ok(a.biz.scale > 1 || a.biz.debts.sba, 'borrowed to expand');
  },

  'a fleet business on autopilot adds trucks and crews as contracts grow'() {
    const typeId = Object.keys(BUSINESS_TYPES).find((id) => id === 'trucking') ?? 'trucking';
    const { engine, biz } = owner(6, typeId);
    biz.staff.headcount = 10;
    biz.years = 3;
    biz.cash = 2_000_000;
    engine.dispatch('business.handOff');
    const units = biz.ops?.units?.length ?? 0;
    years(engine, 4);
    assert.ok((biz.ops?.units?.length ?? 0) >= units, 'fleet kept up');
    assert.ok(biz.plan.lastReport, 'reported');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} growth test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} growth-plan tests passed`);
