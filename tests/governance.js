/**
 * Boards, working in your own company, staff positions, rival
 * conglomerates and the business fixes (valuation by size, premises, city
 * costs, competitors in every city, held businesses facing the same world).
 *
 *   node tests/governance.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { currentBusiness, valuation, yearFinancials } from '../src/modules/business/Business.js';
import { expansionCost } from '../src/modules/business/BusinessEngine.js';
import { syncBoard, boardMeeting, boardRequired } from '../src/modules/business/Board.js';
import { postEligible } from '../src/modules/business/OwnerJob.js';
import { rivalGroups, rivalGroupsTick, portfolio } from '../src/modules/business/RivalGroups.js';
import { businessOrg, competitorsOf, openBranch, syncBusinessOrg, businessRoster } from '../src/modules/org/Businesses.js';
import { REGIONS } from '../src/modules/life/Regions.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function owner(seed, typeId = 'consulting', entity = 'llc') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 40;
  Object.assign(state.stats, { smarts: 80, health: 95 });
  state.finances.cash = 50_000_000;
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
    engine.resolvePrompt(p.id, (p.options.find((o) => ['decline', 'wait', 'none'].includes(o.id)) ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
  }
};
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);
const big = (biz) => Object.assign(biz, { years: 5, scale: 4 }, { staff: { ...biz.staff, headcount: 40 } });

const tests = {
  'promoted and demoted staff stay on the roster'() {
    const { engine, state, biz } = owner(1, 'restaurant');
    biz.staff.headcount = 30;
    syncBusinessOrg(state, biz);
    const org = businessOrg(state, biz);
    const roster = () => businessRoster(state, biz).flatMap((d) => d.people.map((p) => p.id));
    // Demote someone into a rung that's already full, and promote someone else.
    const moved = [];
    for (const id of roster()) {
      const before = org.people[id].levelId;
      state.yearly['business.decide'] = 0;
      engine.dispatch(moved.length ? 'business.staffPromote' : 'business.staffDemote', id);
      if (org.people[id]?.levelId !== before) moved.push(id);
      if (moved.length === 2) break;
    }
    assert.ok(moved.length >= 1, 'someone moved rungs');
    for (let i = 0; i < 3; i++) syncBusinessOrg(state, biz);
    const after = roster();
    for (const id of moved) assert.ok(org.people[id] && after.includes(id), `${id} is still on the roster`);
    clean(VIEWS.business(state, {}));
    assert.ok(VIEWS.business(state, {}).includes('All positions'));
  },

  'a board forms for corporations, meets yearly and can replace a hired CEO'() {
    const { engine, state, biz } = owner(2, 'consulting', 'ccorp');
    big(biz);
    assert.ok(boardRequired(biz));
    engine.dispatch('business.handOff');
    year(engine);
    assert.ok(biz.board?.seats.some((s) => s.kind === 'owner'), 'you have a seat');
    assert.ok(biz.board.meetings.length >= 1, 'a meeting');
    engine.dispatch('business.appointDirector', 'operator');
    assert.ok(biz.board.seats.some((s) => s.kind === 'independent' && s.expertise === 'operator'));
    // A terrible year with a hired CEO: the board acts.
    const org = businessOrg(state, biz);
    const ceo = org.ceo;
    assert.ok(ceo, 'a hired CEO');
    biz.books = [{ age: 40, revenue: 2_000_000, netIncome: 400_000 }, { age: 41, revenue: 900_000, netIncome: -500_000 }];
    biz.quality = 20;
    const rec = boardMeeting(engine.context(), biz, { you: false, hasCeo: true, replaceCeo: () => { org.ceo = null; return 'replaced'; } });
    assert.equal(rec.verdict, 'crisis');
    assert.equal(org.ceo, null, 'the board replaced the CEO');
  },

  'an owner can take a post as CEO: a salary, a focus, big moves — and a board that can remove you'() {
    const { engine, state, biz } = owner(3, 'consulting', 'ccorp');
    big(biz);
    biz.lastYear = yearFinancials(state, biz, engine.rng);
    assert.ok(postEligible(biz));
    engine.dispatch('business.takePost', 'ceo');
    assert.equal(biz.role, 'executive');
    assert.ok(biz.ownerPost.salary >= 120000);
    engine.dispatch('business.setFocus', 'quality');
    assert.equal(biz.ownerPost.focus, 'quality');
    const morale = biz.staff.morale;
    engine.dispatch('business.execMove', 'townHall');
    assert.ok(biz.staff.morale > morale || biz.staff.morale === 100);
    year(engine);
    const ly = currentBusiness(state).lastYear;
    assert.ok(ly.ownerSalary > 0, 'salary booked');
    assert.ok(!businessOrg(state, biz).ceo, 'no hired CEO while you hold the post');
    assert.ok(VIEWS.career(state, {}).includes('Your Job'), 'shows as your job');
    // Minority owner after a crisis: removed.
    biz.ownerPct = 0.4;
    biz.investors = [{ round: 'growth equity', pct: 0.6, invested: 1 }];
    syncBoard(state, engine.rng, biz);
    biz.books = [{ age: 40, revenue: 2_000_000, netIncome: 300_000 }, { age: 41, revenue: 800_000, netIncome: -600_000 }];
    biz.quality = 15;
    const ctx = engine.context();
    const { boardHooks } = awaitHooks;
    boardMeeting(ctx, biz, boardHooks(ctx, biz, () => 'x'));
    assert.notEqual(biz.role, 'executive', 'removed by the board');
    assert.ok(state.career.history.some((h) => h.ownCompany), 'the post is on your record');
  },

  'valuation multiples grow with size'() {
    const { state, biz } = owner(4);
    biz.reputation = 60;
    biz.cash = 0;
    biz.assets = 0;
    const v = (sde) => valuation(biz, { netIncome: sde, ownerSalary: 0, corporateTax: 0 });
    assert.ok(v(100_000) / 100_000 < 3, 'small: under 3×');
    assert.ok(v(10_000_000) / 10_000_000 > 5, 'large: over 5×');
    void state;
  },

  'locations cost what the city costs; competitors exist in every city you enter'() {
    const { state, biz } = owner(5, 'retail');
    const cheap = Object.values(REGIONS).sort((a, b) => a.col - b.col)[0].id;
    const dear = Object.values(REGIONS).sort((a, b) => b.col - a.col)[0].id;
    assert.ok(expansionCost(biz, dear) > expansionCost(biz, cheap));
    const home = businessOrg(state, biz).regionId;
    const away = Object.keys(REGIONS).find((r) => r !== home);
    biz.scale = 2;
    openBranch(state, biz, away);
    const { engine } = { engine: null };
    void engine;
    // A rival in the new city counts as a competitor.
    const rival = Object.values(state.orgs.byId).find((o) => o.business && o.typeId === `biz:${biz.typeId}` && o.regionId === home && o.owner?.kind !== 'player');
    if (rival) {
      rival.regionId = away;
      assert.ok(competitorsOf(state, biz).includes(rival));
    }
  },

  'owning your premises replaces rent with carrying costs'() {
    const { engine, state, biz } = owner(6, 'retail');
    biz.years = 3;
    biz.cash = 5_000_000;
    const before = yearFinancials(state, biz, engine.rng).rent;
    engine.dispatch('business.buyPremises', 'cash');
    assert.equal(biz.premises.owned, 1);
    const after = yearFinancials(state, biz, engine.rng).rent;
    assert.ok(after < before, `rent ${before} → ${after}`);
    engine.dispatch('business.saleLeaseback');
    assert.equal(biz.premises.owned, 0);
  },

  'held businesses face competitors and events; you can open one to manage it'() {
    const { engine, state, biz } = owner(7, 'consulting');
    big(biz);
    engine.dispatch('business.handOff');
    engine.dispatch('business.makePassive');
    assert.ok(!state.business.current && state.business.holdings.length === 1);
    for (let i = 0; i < 4; i++) year(engine);
    const h = state.business.holdings[0];
    assert.ok(h && competitorsOf(state, h).length > 0, 'a market around it');
    engine.dispatch('business.focus', h.id);
    assert.equal(state.business.current, h);
    assert.equal(h.role, 'absentee', 'management still runs it');
    assert.ok((h.books ?? []).length >= 3, 'results history');
  },

  'rival conglomerates buy companies, bid against you, and can be bought'() {
    const { engine, state, biz } = owner(8, 'consulting');
    big(biz);
    biz.valuation = 5_000_000;
    year(engine);
    const groups = rivalGroups(state);
    assert.ok(groups.length >= 4);
    for (let i = 0; i < 8; i++) {
      state.prompts = [];
      rivalGroupsTick(engine.context());
    }
    const owned = groups.flatMap((g) => portfolio(state, g));
    assert.ok(owned.length > 0, 'groups own companies');
    // Buy one: form a holding company with a big treasury.
    state.prompts = [];
    currentBusiness(state).valuation = 5_000_000;
    engine.dispatch('business.formConglomerate', 'Case Group');
    const c = state.business.conglomerate;
    assert.ok(c);
    c.treasury = 2_000_000_000;
    const g = groups.find((x) => portfolio(state, x).length);
    const before = state.business.holdings.length;
    for (let i = 0; i < 6 && state.business.rivalGroups.includes(g); i++) engine.dispatch('business.bidForGroup', g.name);
    if (!state.business.rivalGroups.includes(g)) assert.ok(state.business.holdings.length > before, 'its companies joined yours');
    clean(VIEWS.business(state, {}));
  },

  'growth equity and an IPO for big established companies'() {
    const { engine, state, biz } = owner(9, 'consulting', 'ccorp');
    big(biz);
    biz.valuation = 30_000_000;
    const cash = biz.cash;
    engine.state.prompts = [];
    const ctx = engine.context();
    const R = MODULES.find((m) => m.id === 'business').resolvers;
    R.growthEquity(ctx, { amount: 10_000_000, id: biz.id }, 'accept');
    assert.ok(biz.cash >= cash + 10_000_000);
    assert.equal(biz.ownerPct, 0.75);
    R.publicOffering(ctx, { price: 120_000_000, id: biz.id }, 'ipo');
    assert.ok(biz.public, 'public');
    assert.ok(biz.ownerPct < 0.75 && biz.ownerPct > 0.5);
    syncBoard(state, engine.rng, biz);
    assert.equal(biz.board.size, 9, 'a public board');
    assert.ok(biz.board.seats.some((s) => s.kind === 'independent'));
  },
};

// Hooks the CEO test needs from OwnerJob (imported lazily to keep the import list readable).
const awaitHooks = await import('../src/modules/business/OwnerJob.js');

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} governance test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} governance tests passed`);
