/**
 * Running a country and running a city's underworld.
 *
 *   node tests/bigsystems.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { GovernmentDeskModule, leadsCountry, deskOf } from '../src/modules/politics/GovernmentDesk.js';
import { budgetAt } from '../src/modules/politics/Budgets.js';
import { empireTick, empireOf, runsEmpire } from '../src/modules/legal/Empire.js';
import { outfitsHere } from '../src/modules/legal/Underworld.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', seed = 3, age = 55) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = age;
  state.prompts = [];
  state.legal.record = [];
  state.finances.cash = 500000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const answer = (engine, state, type, opt) => { const p = state.prompts.find((x) => x.type === type); if (p) engine.resolvePrompt(p.id, opt ?? p.options[0].id); return p; };

const tests = {
  'a president answers to groups, weathers a crisis in two acts, and makes deals abroad'() {
    const { engine, state, ctx } = life('US', 4);
    state.politics.office = { id: 'president', termYearsLeft: 4, terms: 1, approval: 55, startAge: 55, fullTime: true };
    assert.ok(leadsCountry(state));
    GovernmentDeskModule.onAgeUp(ctx);
    const d = deskOf(state);
    // Fund pensions and health generously: retirees notice.
    const b = budgetAt(state, 'national');
    b.funding = { ...(b.funding ?? {}), pensions: 1.3, health: 1.3 };
    const ret = d.groups.retirees;
    let acts = 0;
    for (let y = 0; y < 12; y++) {
      state.prompts = [];
      GovernmentDeskModule.onAgeUp(ctx);
      if (answer(engine, state, 'desk.crisis')) acts += 1;
      state.character.age += 1;
    }
    assert.ok(d.groups.retirees > ret, 'retirees reward pension and health spending');
    assert.ok(acts >= 2, 'a crisis plays out');
    state.yearly = {};
    state.prompts = [];
    const cc = Object.keys(d.relations)[0];
    d.relations[cc] = 70;
    engine.dispatch('desk.diplomacy', `${cc}:trade`);
    assert.ok(d.deals.some((x) => x.cc === cc && x.kind === 'trade'), 'a trade deal is signed');
    clean(VIEWS.politics(state, {}));
  },
  'a boss holds districts, earns from them, fights for them, and can go legit'() {
    const { engine, state, ctx } = life('US', 5, 45);
    const outfits = outfitsHere(state, new Random(9));
    state.underworld.me = { outfitId: outfits[0].id, rank: 4, respect: 80, trust: 70, rackets: [], skim: 0, crew: [], dirty: 0, laundered: 2_000_000, made: true, history: [] };
    assert.ok(runsEmpire(state));
    empireTick(ctx);
    const e = empireOf(state);
    assert.equal(e.districts.length, 6);
    let fights = 0;
    for (let y = 0; y < 15; y++) {
      state.prompts = [];
      state.yearly = {};
      state.legal.incarceration = null;
      const target = e.districts.find((x) => x.owner !== outfits[0].id);
      if (target) engine.dispatch('empire.move', `${target.name}|push`);
      empireTick(ctx);
      if (answer(engine, state, 'empire.pushback', 'fight')) fights += 1;
      state.character.age += 1;
    }
    assert.ok(state.underworld.me.dirty > 0, 'districts pay');
    assert.ok(e.districts.some((x) => x.owner === outfits[0].id), 'the outfit holds ground');
    assert.equal(outfitsHere(state).reduce((s, o) => s + o.territory, 0) >= 99, true, 'territory shares follow the map');
    clean(VIEWS.underworld(state, {}));
    // Going legit needs a clean business.
    state.prompts = [];
    state.yearly = {};
    state.legal.incarceration = null;
    state.business.current = { name: 'Clean Linen Co.' };
    let legit = false;
    for (let i = 0; i < 6 && !legit; i++) { state.yearly = {}; engine.dispatch('empire.goLegit'); legit = Boolean(state.underworld.me.left); state.character.age += 1; }
    assert.ok(legit || state.underworld.me.trust < 70, 'the boss tried to walk away');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} big-systems tests passed`);
