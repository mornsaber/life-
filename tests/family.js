/**
 * Family and dynasty: children's traits and upbringing, grandchildren,
 * succession plans, and family businesses (every company, the holding
 * company and its treasury) passing to the next generation.
 *
 *   node tests/family.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, businessEquity } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { settleEstate, buildHeirState } from '../src/modules/people/index.js';
import { probateAssets } from '../src/modules/people/Legacy.js';
import { Dynasty, readiness, READY, SUCCESSION_DISCOUNT } from '../src/modules/people/Dynasty.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { heirChoices } from '../src/ui/views/PeopleView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed, age = 45) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = age;
  Object.assign(state.stats, { smarts: 80, health: 95 });
  state.finances.cash = 3_000_000;
  state.housing.credit.score = 760;
  return { engine, state };
}
let n = 0;
function kid(state, age, extra = {}) {
  const k = { id: `kid${++n}`, firstName: `Kid${n}`, lastName: state.character.lastName, gender: n % 2 ? 'male' : 'female', relation: 'child', ageOffset: age - state.character.age, relationship: 80, alive: true, income: 0, careerIncome: 0, nationality: 'US', otherParentId: null, custody: 'you', ...extra };
  state.people.list.push(k);
  return k;
}
function startBusiness(engine, state, typeId) {
  const t = BUSINESS_TYPES[typeId];
  for (const c of t.credentials) state.credentials.held[c] = { earnedAge: 25, renewedAge: state.character.age - 1, status: 'active' };
  state.career.history.push({ professionId: t.professions[0], title: 'Pro', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 4, startAge: 22, endAge: state.character.age - 1, reason: 'Left' });
  engine.dispatch('business.start', `${typeId}:cash:llc`);
  return state.business.current;
}
function years(engine, count) {
  for (let i = 0; i < count; i++) {
    engine.state.prompts = [];
    engine.state.stats.health = 95;
    engine.ageUp();
    for (let j = 0; j < 8 && engine.state.prompts.length; j++) {
      const p = engine.state.prompts[0];
      engine.resolvePrompt(p.id, (p.options.find((o) => ['decline', 'wait'].includes(o.id)) ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
    }
  }
}
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);
const conserved = (l) => assert.equal(l.funeral + l.debtsPaid + l.probate + l.tax + l.bequests.reduce((s, b) => s + b.amount, 0), l.assets, 'every dollar accounted for');

const tests = {
  'newborns take after their parents; reading, tutors and sports raise them'() {
    const { engine, state } = life(1, 32);
    state.stats.smarts = 95;
    state.people.expecting = { since: 31 };
    years(engine, 1);
    const baby = state.people.list.find((p) => p.relation === 'child');
    assert.ok(baby?.traits, 'traits at birth');
    assert.ok(baby.traits.smarts >= 40, `bright parents, bright child (${baby.traits.smarts})`);
    // Nurture: once per child per year, age-appropriate.
    const older = kid(state, 8);
    years(engine, 1);
    const before = older.traits.smarts;
    engine.dispatch('dynasty.nurture', `${older.id}:tutor`);
    assert.ok(older.traits.smarts > before, 'a tutor raises smarts');
    const cash = state.finances.cash;
    engine.dispatch('dynasty.nurture', `${older.id}:sports`);
    assert.equal(state.finances.cash, cash, 'one thing a year per child');
    engine.dispatch('dynasty.nurture', `${baby.id}:sports`);
    assert.ok(!state.yearly[`dynasty.nurture.${baby.id}`], 'too young for sports');
  },

  'children who work in the family business learn it and take over with experience'() {
    const { engine, state } = life(2, 55);
    const biz = startBusiness(engine, state, 'consulting');
    const heir = kid(state, 24);
    years(engine, 1);
    heir.traits.business = 20;
    engine.dispatch('business.hireRelative', heir.id);
    assert.ok(biz.family.includes(heir.id));
    years(engine, 5);
    assert.ok(heir.familyBizYears >= 5);
    assert.ok(readiness(heir) >= READY, `trained (${readiness(heir)})`);
    state.character.alive = false;
    settleEstate(state);
    const s = buildHeirState(engine.rng, state, heir.id);
    assert.ok(s.business.current, 'inherits the business');
    assert.equal(s.business.current.heritage.generation, 2);
    assert.ok(s.career.history.some((h) => h.professionId === BUSINESS_TYPES.consulting.professions[0]), 'experience in the trade');
    assert.equal(s.stats.smarts, heir.traits.smarts, 'the heir starts with the child\'s smarts');
    assert.equal(s.business.current.basis, Math.round(Math.max(0, state.business.current.valuation) * state.business.current.ownerPct), 'stepped-up basis');
  },

  'every business, the holding company and its treasury pass to the heir'() {
    const { engine, state } = life(3, 60);
    const biz = startBusiness(engine, state, 'consulting');
    const second = structuredClone(biz);
    Object.assign(second, { id: 'biz_second', name: 'Second Co', orgId: null, valuation: 400000, ownerPct: 1 });
    state.business.holdings = [second];
    state.business.conglomerate = { name: 'Case Holdings', foundedAge: 58, treasury: 250000, payout: 0.5, acquisitions: 0, lastReport: [] };
    biz.valuation = 300000;
    assert.equal(businessEquity(state), Math.round(300000 * biz.ownerPct) + 400000 + 250000, 'holdings and treasury count');
    const heir = kid(state, 30);
    state.character.alive = false;
    const l = settleEstate(state);
    conserved(l);
    const s = buildHeirState(engine.rng, state, heir.id);
    assert.equal(s.business.current.name, biz.name);
    assert.deepEqual(s.business.holdings.map((b) => b.name), ['Second Co']);
    assert.equal(s.business.conglomerate.name, 'Case Holdings');
    assert.equal(s.business.conglomerate.treasury, 250000);
    assert.ok(s.business.current.plan?.strategy && s.business.current.plan.strategy !== 'off', 'management keeps it growing');
    // The heir's family ids carry over: they can play on.
    const engine2 = new Engine({ store: new Store(memory()), rng: new Random(33), modules: MODULES });
    engine2.store.state = s;
    engine2.hydrate(s);
    years(engine2, 3);
    assert.ok(engine2.state.business.current || engine2.state.business.history.length, 'the inherited business keeps running');
    clean(VIEWS.business(engine2.state, {}));
  },

  'a succession plan: outside probate, discounted for estate tax, straight to the named child'() {
    const { engine, state } = life(4, 70);
    const biz = startBusiness(engine, state, 'consulting');
    const a = kid(state, 40);
    const b = kid(state, 38);
    years(engine, 1);
    biz.valuation = 20_000_000;
    biz.ownerPct = 1;
    state.finances.cash = 5_000_000;
    state.character.alive = false;
    const without = settleEstate(state);
    const probateWithout = probateAssets(state);
    state.character.alive = true;
    engine.dispatch('dynasty.succession', b.id);
    assert.equal(state.people.plan.succession, b.id);
    state.character.alive = false;
    const withPlan = settleEstate(state);
    conserved(withPlan);
    assert.ok(probateAssets(state) <= probateWithout - 20_000_000 + 1, 'the business skips probate');
    assert.ok(withPlan.tax < without.tax, `discounted for estate tax (${without.tax} → ${withPlan.tax})`);
    assert.ok(withPlan.tax <= without.tax - 20_000_000 * SUCCESSION_DISCOUNT * 0.4 + 2, 'by the discount');
    const inKind = withPlan.bequests.find((x) => x.inKind);
    assert.equal(inKind.to, b.id);
    assert.equal(inKind.amount, 20_000_000);
    // Continue as the other child: the sibling took the business, you keep your cash share.
    const asA = buildHeirState(engine.rng, state, a.id);
    assert.ok(!asA.business?.current, 'the successor took the business, not you');
    assert.ok(asA.finances.cash > 0);
    const asB = buildHeirState(engine.rng, state, b.id);
    assert.equal(asB.business.current.name, biz.name);
    const cashShare = withPlan.bequests.filter((x) => x.to === b.id && !x.inKind).reduce((s, x) => s + x.amount - (x.heirTax ?? 0), 0);
    assert.ok(Math.abs(asB.finances.cash - cashShare) <= 2, 'the successor keeps their cash share too');
    const html = heirChoices(state);
    assert.ok(html.includes('takes over'), 'the tombstone says who gets the business');
    clean(html);
  },

  'grandchildren arrive and become the heir\'s own family'() {
    const { engine, state } = life(5, 62);
    const c = kid(state, 30);
    for (let i = 0; i < 40 && !c.kids?.length; i++) years(engine, 1);
    assert.ok(c.kids?.length, 'a grandchild was born');
    state.character.alive = false;
    settleEstate(state);
    const s = buildHeirState(engine.rng, state, c.id);
    const kids = s.people.list.filter((p) => p.relation === 'child');
    assert.equal(kids.length, c.kids.length);
    assert.ok(kids.every((k) => k.traits && s.character.age + k.ageOffset >= 0));
    assert.ok(s.people.list.some((p) => p.relation === 'spouse' && p.alive), 'with a partner');
  },

  'a business handed to a child while you live is still theirs when you continue as them'() {
    const { engine, state } = life(6, 60);
    const biz = startBusiness(engine, state, 'consulting');
    const c = kid(state, 32);
    biz.valuation = 500000;
    engine.dispatch('business.giveToFamily', c.id);
    assert.ok(!state.business.current, 'it left your hands');
    assert.equal(c.business.name, biz.name);
    assert.ok(state.people.plan.exemptionUsed > 0, 'the gift used lifetime exemption');
    state.character.alive = false;
    settleEstate(state);
    const s = buildHeirState(engine.rng, state, c.id);
    assert.equal(s.business.current.name, biz.name);
  },

  'close children make you happier and look after you in old age'() {
    const { engine, state } = life(7, 78);
    const stats = (st) => {
      const got = {};
      const ctx = { state: st, rng: engine.rng, stat: (k, d) => { got[k] = (got[k] ?? 0) + d; }, log() {}, toast() {}, emit() {}, prompt() {} };
      Dynasty.onAgeUp(ctx);
      return got;
    };
    const alone = stats(state);
    kid(state, 48);
    kid(state, 45, { kids: [{ firstName: 'Gran', gender: 'female', bornAge: 70 }] });
    const family = stats(state);
    assert.ok((family.happiness ?? 0) > (alone.happiness ?? 0), 'happier');
    assert.ok((family.stress ?? 0) < 0 && (family.health ?? 0) > 0, 'grown children help in old age');
  },

  'the People tab shows the Dynasty card, traits and nurture options'() {
    const { engine, state } = life(8, 50);
    startBusiness(engine, state, 'consulting');
    kid(state, 12);
    kid(state, 25);
    years(engine, 1);
    const before = JSON.stringify(state);
    const html = VIEWS.people(state, {});
    assert.equal(JSON.stringify(state), before, 'rendering does not change state');
    assert.ok(html.includes('Dynasty') && html.includes('dynasty.nurture') && html.includes('dynasty.succession'));
    clean(html);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} family test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} family tests passed`);
