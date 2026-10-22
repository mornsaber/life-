/**
 * Farming: land priced and measured by country (and leased where it can't be bought), four
 * fields with rotations and soil health, herds on pasture, machinery and labour, organic
 * conversion, marketing the crop, each country's farm policy, offers, and the family farm.
 *
 *   node tests/farming.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, netWorth } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { regionsIn } from '../src/modules/life/Regions.js';
import { landPrice, leaseRent, plotsFor, area, farmedAcres, capacity, workload, cropsHere, farmTick, FIELDS } from '../src/modules/farm/Farm.js';
import { buildHeirState } from '../src/modules/people/Legacy.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function farmer(countryId = 'US', { seed = 5, regionId } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = 30;
  state.prompts = [];
  state.finances.cash = 5000000;
  state.character.regionId = regionId ?? regionsIn(countryId).find((r) => r.type === 'Rural').id;
  return { engine, state, ctx: engine.context() };
}
const season = (engine, state, n = 1) => { for (let i = 0; i < n; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); } state.prompts = []; };
const steady = (engine, weather = 'normal') => {
  engine.rng.weighted = (items) => items.find((w) => w.id === weather) ?? items[0];
  engine.rng.chance = () => false;
};

const tests = {
  'land by country: acres in the US, hectares in France, mu in China (leased only), none in a big city'() {
    const us = farmer('US').state;
    assert.ok(landPrice(us) > 0);
    assert.match(area(us, plotsFor(us)[1]), /acres/);
    const fr = farmer('FR').state;
    assert.match(area(fr, plotsFor(fr)[1]), /hectares/);
    const cn = farmer('CN');
    assert.equal(landPrice(cn.state), null, 'collective land');
    assert.ok(leaseRent(cn.state) > 0);
    cn.engine.dispatch('farm.buy', `${plotsFor(cn.state)[1]}:cash`);
    assert.equal(cn.state.farm.acres, 0);
    cn.engine.dispatch('farm.lease', String(plotsFor(cn.state)[1]));
    assert.ok(cn.state.farm.leased > 0);
    assert.match(area(cn.state, cn.state.farm.leased), /mu/);
    const city = farmer('GB', { regionId: 'london' }).state;
    assert.equal(landPrice(city), null);
  },
  'crops fit the country: rice in Japan, vineyards in France, no rice in Britain'() {
    assert.ok(cropsHere(farmer('JP').state).includes('rice'));
    assert.ok(cropsHere(farmer('FR').state).includes('vineyard'));
    assert.ok(!cropsHere(farmer('GB').state).includes('rice'));
  },
  'rotation and soil: continuous corn wears the soil; a rotation with cover crops builds it'() {
    const mono = farmer('US', { regionId: 'decorah' });
    mono.engine.dispatch('farm.buy', '320:cash');
    mono.engine.dispatch('farm.setCrop', 'corn');
    mono.engine.dispatch('farm.practice', 'rotate');
    steady(mono.engine);
    season(mono.engine, mono.state, 6);
    const rot = farmer('US', { regionId: 'decorah' });
    rot.engine.dispatch('farm.buy', '320:cash');
    for (const [i, c] of ['corn', 'soybeans', 'corn', 'soybeans'].entries()) rot.engine.dispatch('farm.setField', `${i}:${c}`);
    rot.engine.dispatch('farm.practice', 'cover');
    steady(rot.engine);
    season(rot.engine, rot.state, 6);
    assert.ok(mono.state.farm.soil < 55 && rot.state.farm.soil > 65, `${mono.state.farm.soil} vs ${rot.state.farm.soil}`);
    assert.notEqual(rot.state.farm.fields[0].crop, rot.state.farm.fields[0].last === 'corn' ? 'corn' : 'x', 'the rotation moves crops round the fields');
  },
  'a herd on pasture: capacity from the grass; overstocking buys feed'() {
    const { engine, state } = farmer('NZ');
    engine.dispatch('farm.buy', `${plotsFor(state)[1]}:cash`);
    engine.dispatch('farm.setCrop', 'pasture');
    const cap = capacity(state);
    assert.ok(cap > 50, `NZ grass carries ${cap}`);
    engine.dispatch('farm.stock', `+${cap * 2 - (cap * 2) % 10}`);
    steady(engine);
    season(engine, state);
    assert.ok(state.farm.lastYear.feed > 0, 'bought feed');
    engine.dispatch('farm.herdKind', 'dairy');
    engine.dispatch('farm.stock', '+50');
    assert.equal(state.farm.herd.head, 0, 'no parlour, no dairy cows');
    engine.dispatch('farm.build', 'parlour');
    engine.dispatch('farm.stock', '+50');
    assert.equal(state.farm.herd.head, 50);
  },
  'labour and machinery: a big farm with a day job hires hands; your own line replaces contractors'() {
    const { engine, state, ctx } = farmer('US', { regionId: 'decorah' });
    engine.dispatch('farm.buy', '1280:loan');
    state.career.job = { professionId: 'retail', levelId: 'associate', employer: { name: 'X' }, salary: 30000 };
    assert.ok(workload(state.farm) > 0.25);
    steady(engine);
    farmTick(ctx);
    assert.ok(state.farm.lastYear.wages > 0, 'hired help');
    const contractors = state.farm.lastYear.machinery;
    engine.dispatch('farm.build', 'machinery');
    assert.ok(state.farm.machinery);
    farmTick(ctx);
    assert.ok(state.farm.lastYear.machinery < contractors, 'cheaper to run your own at this size');
  },
  'organic: three years of transition, then the premium'() {
    const { engine, state, ctx } = farmer('US', { regionId: 'decorah' });
    engine.dispatch('farm.buy', '160:cash');
    engine.dispatch('farm.practice', 'rotate');
    steady(engine);
    farmTick(ctx);
    const conventional = state.farm.lastYear.revenue;
    engine.dispatch('farm.practice', 'organic');
    farmTick(ctx);
    assert.ok(state.farm.lastYear.revenue < conventional, 'transition: lower yields, no premium');
    state.character.age += 3;
    for (const id of Object.keys(state.farm.prices)) state.farm.prices[id] = 1;
    farmTick(ctx);
    assert.ok(state.farm.lastYear.revenue > state.farm.lastYear.costs * 0.8);
  },
  'marketing: stored grain sells next year; forward contracts lock in last year\'s price'() {
    const { engine, state, ctx } = farmer('US', { regionId: 'decorah' });
    engine.dispatch('farm.buy', '320:cash');
    engine.dispatch('farm.marketing', 'store');
    assert.equal(state.farm.marketing, 'harvest', 'no bins yet');
    engine.dispatch('farm.build', 'bins');
    engine.dispatch('farm.marketing', 'store');
    steady(engine);
    farmTick(ctx);
    assert.ok(state.farm.stored > 0);
    farmTick(ctx);
    assert.ok(state.farm.lastYear.storedSale > 0);
  },
  'policy by country: CAP in France, the SFI in Britain, PM-KISAN in India, nothing in New Zealand'() {
    const run = (cc, setup) => {
      const { engine, state, ctx } = farmer(cc);
      engine.dispatch('farm.buy', `${plotsFor(state)[1]}:cash`);
      setup?.(engine);
      steady(engine);
      farmTick(ctx);
      return (state.farm.lastYear.lines ?? []).map((l) => l.label).join(' | ');
    };
    assert.match(run('FR'), /CAP basic income support/);
    assert.match(run('GB', (e) => e.dispatch('farm.practice', 'cover')), /Sustainable Farming Incentive/);
    assert.match(run('IN'), /PM-KISAN/);
    assert.equal(run('NZ'), '');
  },
  'offers: the neighbouring farm, a lease, the solar developer'() {
    const { engine, state } = farmer('US', { regionId: 'decorah' });
    engine.dispatch('farm.buy', '640:loan');
    const seen = new Set();
    for (let i = 0; i < 40 && seen.size < 3; i++) {
      state.prompts = [];
      state.stats.health = 95;
      engine.ageUp();
      const q = state.prompts.find((p) => p.type === 'farm.offer');
      if (q) {
        seen.add(q.data.kind);
        const before = farmedAcres(state.farm);
        engine.resolvePrompt(q.id, q.options[0].id);
        if (q.data.kind === 'lease') assert.ok(farmedAcres(state.farm) > before);
        if (q.data.kind === 'solar') assert.ok(state.farm.extras.solar);
      }
      state.character.age = 30;
    }
    assert.ok(seen.size >= 2, [...seen].join(','));
  },
  'the family farm passes to the heir; the Farm tab renders'() {
    const { engine, state } = farmer('US', { regionId: 'decorah' });
    engine.dispatch('farm.buy', '320:loan');
    assert.ok(netWorth(state) > 0);
    assert.match(VIEWS.farm(state), /Fields/);
    assert.match(VIEWS.farm(state), /Livestock/);
    state.people.list.push({ id: 'kid', firstName: 'Ann', lastName: 'Lee', gender: 'female', relation: 'child', alive: true, ageOffset: -25, relationship: 80 });
    state.character.age = 55;
    state.character.alive = false;
    const heir = buildHeirState(new Random(2), state, 'kid');
    assert.equal(heir.farm.acres, 320);
    assert.equal(heir.farm.fields.length, FIELDS);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} farming test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} farming tests passed`);
