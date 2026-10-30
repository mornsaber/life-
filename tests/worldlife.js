/**
 * Recessions with causes, pandemics and inflation; living with the local hazard; and the social
 * life and slow decline of an old titled family.
 *
 *   node tests/worldlife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { shocksTick, shockFactor, causeOf } from '../src/modules/economy/Shocks.js';
import { layoffRisk } from '../src/modules/career/CareerEngine.js';
import { insuranceShock, DisasterSeasonResolvers, topHazard } from '../src/modules/life/DisasterSeason.js';
import { insurancePremium } from '../src/modules/realestate/Maintenance.js';
import { stateIdOf } from '../src/modules/life/Regions.js';
import { nobleBirth } from '../src/modules/world/Peerage.js';
import { nobleLifeTick, standingOf } from '../src/modules/world/NobleLife.js';
import { estateOf } from '../src/modules/world/Nobility.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 3, age = 40) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', ...opts });
  state.character.age = age;
  state.prompts = [];
  state.finances.cash = 100000;
  return { engine, state, ctx: engine.context() };
}
const home = (state) => { const p = { id: 'home', type: 'starter', typeName: 'Starter Home', regionId: state.character.regionId, value: 400000, valueAdj: 1, purchasePrice: 300000, purchaseAge: 33, condition: 80, use: 'primary', mortgage: null, heloc: null, tenants: [], insured: true }; state.housing.properties.push(p); return p; };
const logText = (state) => state.log.flatMap((y) => y.entries).map((e) => e.text).join('\n');

const tests = {
  'a recession has a cause: it picks its industries, can crash house prices, and a pandemic runs two years'() {
    const seen = new Set();
    for (let seed = 1; seed < 40 && seen.size < 5; seed++) {
      const { state, ctx } = life({}, seed);
      const before = state.housing.market[state.character.regionId] ?? 1;
      Object.assign(state.economy, { phase: 'recession', phaseYears: 0 });
      shocksTick(ctx);
      const id = state.economy.cause.id;
      seen.add(id);
      assert.ok(causeOf(state));
      if (['financial', 'housing'].includes(id)) assert.ok((state.housing.market[state.character.regionId] ?? 1) < before * 0.9, 'prices crash');
      if (id === 'pandemic') {
        assert.ok(state.world.pandemic.active);
        state.character.age += 2;
        shocksTick(ctx);
        assert.ok(!state.world.pandemic.active, 'the pandemic ends');
      }
      if (id === 'financial') {
        hire(ctx, { professionId: 'finance', levelId: 'analyst', employer: createEmployer(ctx.rng, state, getProfession('finance'), state.character.regionId) });
        assert.ok(shockFactor(state, 'finance') > 2);
        const job = state.career.job;
        const hit = layoffRisk(state, job);
        state.economy.cause = { id: 'tech', since: state.character.age };
        assert.ok(hit > layoffRisk(state, job), 'a banking crisis hits bankers harder than a tech bust does');
      }
    }
    assert.ok(seen.size >= 4, [...seen].join());
    const { state, ctx } = life({}, 2);
    state.economy.inflation = 0.08;
    shocksTick(ctx);
    assert.match(logText(state), /buying power/);
  },
  'disaster season: hardening halves the damage and cuts the premium; a catastrophe moves the market'() {
    const { engine, state, ctx } = life({}, 5);
    const p = home(state);
    const base = insurancePremium(p);
    DisasterSeasonResolvers.season(ctx, { type: 'wildfire' }, 'harden');
    assert.deepEqual(p.hardened, ['wildfire']);
    assert.ok(insurancePremium(p) < base);
    DisasterSeasonResolvers.season(ctx, { type: 'wildfire' }, 'kit');
    assert.ok(state.disasterPrep.kit);
    // A catastrophic disaster: premiums up, and maybe a non-renewal.
    let dropped = false;
    for (let i = 0; i < 12 && !dropped; i++) {
      state.prompts = [];
      p.insured = true;
      insuranceShock(ctx, { type: 'wildfire', severity: 3, stateId: stateIdOf(state), name: `Fire ${i}` });
      const q = state.prompts.find((x) => x.type === 'disasterSeason.nonRenewal');
      if (q) { dropped = true; engine.resolvePrompt(q.id, 'lastResort'); }
      state.character.age += 1;
    }
    assert.ok(p.premiumLoad > 1, 'premiums rose');
    assert.ok(dropped && p.insured && p.lastResort, 'insurer of last resort');
    assert.ok(topHazard(state));
  },
  'a titled family: the debut, a match the family arranges, standing in society, and the estate that can\'t pay'() {
    const n = life({ countryId: 'GB', noble: true, gender: 'female' }, 3, 17);
    const always = (r) => { r.chance = () => true; return r; };
    assert.ok(nobleBirth(n.state, always(new Random(1))));
    n.state.character.age = 17;
    nobleLifeTick(n.ctx);
    const debut = n.state.prompts.find((p) => p.type === 'nobleLife.debut');
    assert.ok(debut, 'a debut');
    assert.match(debut.text, /Queen Charlotte/);
    const s0 = standingOf(n.state);
    n.engine.resolvePrompt(debut.id, 'go');
    assert.ok(standingOf(n.state) > s0);
    let match = null;
    for (let a = 22; a < 35 && !match; a++) { n.state.character.age = a; n.state.prompts = []; nobleLifeTick(n.ctx); match = n.state.prompts.find((p) => p.type === 'nobleLife.match'); }
    assert.ok(match, 'the family proposes a match');
    const cash = n.state.finances.cash;
    n.engine.resolvePrompt(match.id, 'accept');
    assert.ok(n.state.people.list.some((p) => p.relation === 'fiance'));
    assert.ok(n.state.finances.cash > cash, 'a marriage settlement');
    const e = estateOf(n.state);
    e.owner = 'you';
    e.value = 2e6;
    let decline = null;
    for (let a = 40; a < 60 && !decline; a++) { n.state.character.age = a; n.state.prompts = []; nobleLifeTick(n.ctx); decline = n.state.prompts.find((p) => p.type === 'nobleLife.decline'); }
    assert.ok(decline, 'the house costs more than the estate earns');
    n.engine.resolvePrompt(decline.id, 'trust');
    assert.match(logText(n.state), /National Trust/);
    const html = VIEWS.royal ? VIEWS.royal(n.state, {}) : '';
    assert.doesNotMatch(html, /NaN|undefined/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} world-life test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} world-life tests passed`);
