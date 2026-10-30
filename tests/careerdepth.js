/**
 * Running an institution, being a founder, a footballer's clubs, and an actor's industry.
 *
 *   node tests/careerdepth.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { newBusiness } from '../src/modules/business/Business.js';
import { institutionTick, institutionKind } from '../src/modules/career/Institutions.js';
import { founderTick } from '../src/modules/business/FounderLife.js';
import { clubTick } from '../src/modules/career/SportClubs.js';
import { showbizTick } from '../src/modules/career/Showbiz.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 3, age = 50) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'GB' });
  state.character.age = age;
  state.prompts = [];
  state.finances.cash = 500000;
  return { engine, state, ctx: engine.context() };
}
const job = (ctx, prof, level) => hire(ctx, { professionId: prof, levelId: level, employer: createEmployer(ctx.rng, ctx.state, getProfession(prof), ctx.state.character.regionId) });
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const answer = (engine, state, type, opt) => { const p = state.prompts.find((x) => x.type === type); if (p) engine.resolvePrompt(p.id, opt ?? p.options[0].id); return p; };

const tests = {
  'a police chief runs the force: budgets, league tables, inspections'() {
    const { engine, state, ctx } = life(3, 52);
    job(ctx, 'police', 'chief');
    assert.equal(institutionKind(state.career.job), 'police');
    let inspections = 0;
    for (let y = 0; y < 7 && state.career.job; y++) {
      state.prompts = [];
      institutionTick(ctx);
      answer(engine, state, 'institutions.budget', 'invest');
      answer(engine, state, 'institutions.scandal', 'inquiry');
      inspections = state.institution?.ratings.length ?? inspections;
      state.character.age += 1;
    }
    assert.ok(inspections >= 1);
    clean(VIEWS.career(state, {}));
  },
  'a founder faces the board, the burn and the cofounder'() {
    const { engine, state, ctx } = life(4, 30);
    state.business.current = newBusiness(ctx.rng, state, 'techStartup', { entity: 'ccorp', cash: 100000 });
    const biz = state.business.current;
    biz.lastYear = { netIncome: -400000, revenue: 0 };
    biz.investors = [{ round: 'seed', pct: 0.2, invested: 1e6 }];
    biz.years = 3;
    founderTick(ctx);
    const p = answer(engine, state, 'founder.event', 'bridge');
    assert.ok(p, 'a runway warning');
    assert.ok(biz.cash > 100000 && biz.ownerPct < 1);
  },
  'a footballer signs, gets a bid, renews and retires into punditry'() {
    const { engine, state, ctx } = life(5, 24);
    job(ctx, 'athletics', 'allStar');
    state.stats.fitness = 100;
    clubTick(ctx);
    assert.ok(state.sport.club);
    let bid = false;
    for (let y = 0; y < 12 && state.career.job?.professionId === 'athletics'; y++) {
      state.prompts = [];
      state.character.age += 1;
      clubTick(ctx);
      if (answer(engine, state, 'sportClubs.transfer', 'go')) bid = true;
      answer(engine, state, 'sportClubs.renew', 'resign');
      answer(engine, state, 'sportClubs.dropped', 'loan');
      answer(engine, state, 'sportClubs.after', 'pundit');
    }
    assert.ok(bid, 'a bigger club bids');
  },
  'an actor builds a filmography, can be typecast, and wins awards'() {
    const { engine, state, ctx } = life(6, 30);
    job(ctx, 'acting', 'star');
    state.stats.looks = 95; state.stats.smarts = 90;
    engine.dispatch('showbiz.agent');
    ctx.rng.chance = () => true;
    for (let y = 0; y < 6; y++) { state.prompts = []; showbizTick(ctx); answer(engine, state, 'showbiz.offer', 'indie'); answer(engine, state, 'showbiz.awards', 'campaign'); state.character.age += 1; }
    assert.ok(state.showbiz.credits.length >= 3);
    assert.ok(state.showbiz.wins >= 1);
    clean(VIEWS.career(state, {}));
    assert.match(VIEWS.career(state, {}), /Filmography/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} career-depth tests passed`);
