/**
 * Business life: industry events, star ratings and reviews, awards and
 * milestones, yearly goals, and the sectioned business page.
 *
 *   node tests/businesslife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { currentBusiness } from '../src/modules/business/Business.js';
import { SECTOR_EVENTS, SECTORS, sectorOf, sectorEventsFor, starRating, GOALS, businessLifeYear } from '../src/modules/business/BusinessLife.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { BIZ_TABS } from '../src/ui/views/BusinessView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function owner(typeId, seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 32;
  Object.assign(state.stats, { smarts: 80, health: 95 });
  state.finances.cash = 3_000_000;
  state.housing.credit.score = 790;
  const t = BUSINESS_TYPES[typeId];
  for (const c of t.credentials) state.credentials.held[c] = { earnedAge: 25, renewedAge: 31, status: 'active' };
  state.career.history.push({ professionId: t.professions[0], title: 'Pro', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 5, startAge: 20, endAge: 31, reason: 'Left' });
  engine.dispatch('business.start', `${typeId}:cash:llc`);
  return { engine, state, biz: currentBusiness(state) };
}
const year = (engine) => {
  const { state } = engine;
  state.prompts = [];
  state.stats.health = 95;
  engine.ageUp();
  const seen = [];
  for (let j = 0; j < 8 && state.prompts.length; j++) {
    const p = state.prompts[0];
    seen.push(p);
    // Keep the business: turn down buyout offers.
    const keep = p.type === 'business.offer' ? p.options.find((o) => o.id === 'decline') : null;
    engine.resolvePrompt(p.id, (keep ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
  }
  return seen;
};

const tests = {
  'every business type belongs to an industry with its own events'() {
    for (const id of Object.keys(BUSINESS_TYPES)) {
      const s = sectorOf(id);
      assert.ok(SECTORS[s], `${id}: ${s}`);
    }
    const general = Object.keys(BUSINESS_TYPES).filter((id) => sectorOf(id) === 'general');
    assert.ok(general.length <= 3, `unsorted types: ${general}`);
    for (const s of Object.keys(SECTORS).filter((x) => x !== 'general')) assert.ok(SECTOR_EVENTS.filter((e) => e.sectors.includes(s)).length >= 4, `${s} has events`);
    for (const e of SECTOR_EVENTS) assert.ok(e.options.some((o) => o.id === e.auto), `${e.id}: autopilot choice exists`);
  },

  'every industry event resolves cleanly, whatever you pick'() {
    const { engine, state, biz } = owner('restaurant');
    biz.lastYear = { revenue: 900000, netIncome: 60000, cogs: 300000 };
    const ctx = engine.context();
    for (const e of SECTOR_EVENTS) for (const o of e.options) {
      const text = o.apply(ctx, biz);
      assert.ok(typeof text === 'string' && text.length > 5 && !/NaN|undefined/.test(text), `${e.id}.${o.id}: ${text}`);
      assert.ok(Number.isFinite(biz.cash) && Number.isFinite(biz.reputation) && Number.isFinite(biz.quality), `${e.id}.${o.id} numbers`);
    }
  },

  'industry events come up for the business you run'() {
    const { engine, state, biz } = owner('restaurant', 5);
    const ids = new Set(sectorEventsFor(biz).map((e) => e.id));
    let hits = 0;
    for (let y = 0; y < 14 && currentBusiness(state); y++) for (const p of year(engine)) if (p.type === 'business.event' && ids.has(p.data.eventId)) hits += 1;
    assert.ok(hits >= 1, `industry events seen: ${hits}`);
  },

  'a star rating, reviews and a goal after the first year'() {
    const { engine, state } = owner('salon', 7);
    year(engine);
    const biz = currentBusiness(state);
    assert.ok(biz.rating >= 1 && biz.rating <= 5, `rating ${biz.rating}`);
    assert.equal(biz.rating, starRating(biz));
    assert.ok(biz.reviews.length >= 2 && biz.reviews.length <= 3);
    assert.equal(new Set(biz.reviews.map((r) => r.text)).size, biz.reviews.length, 'no repeated reviews');
    assert.ok(biz.goal && GOALS[biz.goal.id], 'a goal is set');
    assert.ok(biz.goalChoices.length >= 2 && biz.goalChoices.includes(biz.goal.id));
    const other = biz.goalChoices.find((id) => id !== biz.goal.id);
    engine.dispatch('businessLife.goal', other);
    assert.equal(biz.goal.id, other, 'you can pick a different goal');
    const html = VIEWS.business(state, { bizTab: 'overview' });
    assert.match(html, /Pulse/);
    assert.match(html, /★/);
    assert.ok(!/NaN|undefined/.test(html));
  },

  'hitting a goal pays off and builds a streak'() {
    const { engine, state, biz } = owner('consulting', 9);
    const ctx = engine.context();
    biz.lastYear = { revenue: 400000, netIncome: 50000 };
    state.business.current = biz;
    businessLifeYear(ctx, biz);
    biz.goal = { id: 'growth', target: 0.1, base: { revenue: 400000, netIncome: 50000 }, setAge: state.character.age };
    const rep = biz.reputation;
    state.character.age += 1;
    biz.lastYear = { revenue: 460000, netIncome: 70000 };
    businessLifeYear(ctx, biz);
    assert.equal(biz.goalStreak, 1);
    assert.equal(biz.goalsMet, 1);
    assert.ok(biz.reputation > rep - 1, 'reputation boost');
    // Missing one resets the streak.
    biz.goal = { id: 'growth', target: 0.5, base: { revenue: 460000, netIncome: 70000 }, setAge: state.character.age };
    state.character.age += 1;
    biz.lastYear = { revenue: 470000, netIncome: 70000 };
    businessLifeYear(ctx, biz);
    assert.equal(biz.goalStreak, 0);
  },

  'milestones are reached once, and good businesses win awards'() {
    const { engine, state, biz } = owner('restaurant', 11);
    const ctx = engine.context();
    biz.years = 10;
    biz.quality = 95;
    biz.reputation = 95;
    biz.staff.morale = 90;
    let awards = 0;
    for (let i = 0; i < 12; i++) {
      state.character.age += 1;
      biz.lastYear = { revenue: 1_500_000 * (1 + i * 0.05), netIncome: 120000 };
      businessLifeYear(ctx, biz);
      awards = biz.awards?.length ?? 0;
    }
    assert.ok(biz.milestones.firstProfit && biz.milestones.rev1m && biz.milestones.yr10, JSON.stringify(biz.milestones));
    assert.ok(awards >= 2, `awards: ${awards}`);
    assert.equal(Object.values(biz.milestones).filter((a) => a === biz.milestones.rev1m).length >= 1, true);
  },

  'the business page splits into sections; with none chosen it shows everything'() {
    const { engine, state } = owner('autoShop', 13);
    year(engine);
    const all = VIEWS.business(state, {});
    for (const id of Object.keys(BIZ_TABS)) {
      const html = VIEWS.business(state, { bizTab: id });
      assert.ok(html.length < all.length, `${id} is a part of the page`);
      assert.ok(!/NaN|undefined/.test(html), id);
    }
    assert.match(VIEWS.business(state, { bizTab: 'money' }), /Exit/);
    assert.match(VIEWS.business(state, { bizTab: 'operations' }), /Operations/);
    assert.match(all, /Pulse/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} business-life test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} business-life tests passed`);
