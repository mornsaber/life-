/**
 * Disaster choices: the warning (evacuate, shelter, stay), the insurance claim and its aftermath
 * (rebuild, aid, appeal, patch, sell), and helping the neighbours.
 *
 *   node tests/disasters.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { stateIdOf } from '../src/modules/life/Regions.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  state.character.age = 40;
  state.prompts = [];
  state.finances.cash = 100000;
  state.housing.properties.push({ id: 'home', type: 'starter', typeName: 'Starter Home', regionId: state.character.regionId, value: 400000, valueAdj: 1, purchasePrice: 300000, purchaseAge: 33, condition: 80, use: 'primary', mortgage: null, heloc: null, tenants: [], insured: true });
  return { engine, state, ctx: engine.context() };
}
const warn = (engine, state, ctx, severity = 2, type = 'hurricane') => {
  const disaster = { type, severity, stateId: stateIdOf(state), regionId: state.character.regionId, name: 'Hurricane Test' };
  ctx.prompt({ type: 'disasters.warning', icon: '🌀', title: 'x', text: 'x', options: [{ id: 'evacuate', label: 'e' }, { id: 'shelter', label: 's' }, { id: 'stay', label: 'st' }], data: { disaster, cost: 1000 } });
  return state.prompts.at(-1).id;
};
const rigged = (engine, value, fn) => { const c = engine.rng.chance; engine.rng.chance = () => value; try { return fn(); } finally { engine.rng.chance = c; } };

const tests = {
  'evacuating costs a motel and fuel; the storm still hits the house and a claim follows'() {
    const { engine, state, ctx } = life(3);
    const id = warn(engine, state, ctx, 3);
    const cash = state.finances.cash;
    rigged(engine, true, () => engine.resolvePrompt(id, 'evacuate'));
    assert.ok(state.finances.cash < cash, 'paid to evacuate');
    const claim = state.prompts.find((p) => p.type === 'housing.disasterClaim');
    assert.ok(claim, 'a claim decision');
    assert.ok(claim.options.some((o) => o.id === 'aid'), 'aid for a primary home');
  },
  'rebuilding restores the house; selling as-is takes a loss and the house is gone'() {
    for (const choice of ['rebuild', 'sell', 'patch', 'aid']) {
      const { engine, state, ctx } = life(4);
      rigged(engine, true, () => engine.resolvePrompt(warn(engine, state, ctx, 3), 'shelter'));
      const claim = state.prompts.find((p) => p.type === 'housing.disasterClaim');
      assert.ok(claim, `${choice}: claim`);
      const before = state.housing.properties[0].condition;
      engine.resolvePrompt(claim.id, choice);
      if (choice === 'sell') assert.equal(state.housing.properties.length, 0, 'sold');
      else if (choice === 'patch') assert.ok(state.housing.properties[0].value < 400000);
      else assert.ok(state.housing.properties[0].condition > before, `${choice} restores`);
    }
  },
  'staying through a catastrophic storm can kill you'() {
    const { engine, state, ctx } = life(6);
    rigged(engine, true, () => engine.resolvePrompt(warn(engine, state, ctx, 3), 'stay'));
    assert.equal(state.character.alive, false);
  },
  'staying through a moderate storm saves part of the house'() {
    let stayed = 0; let left = 0;
    for (let seed = 1; seed <= 20; seed++) {
      for (const choice of ['stay', 'shelter']) {
        const { engine, state, ctx } = life(seed);
        const c = engine.rng.chance; engine.rng.chance = (p) => (p >= 0.5 ? true : c.call(engine.rng, p));
        engine.resolvePrompt(warn(engine, state, ctx, 1), choice);
        engine.rng.chance = c;
        const lost = [...JSON.stringify(state.log).matchAll(/damaged your [^:]*: \$([\d,]+) in damage/g)].reduce((a, m) => a + Number(m[1].replace(/,/g, '')), 0);
        if (choice === 'stay') stayed += lost; else left += lost;
      }
    }
    assert.ok(stayed < left, `defended homes lose less (${stayed} vs ${left})`);
  },
  'a spared household can help the neighbours'() {
    const { engine, state, ctx } = life(8);
    state.housing.properties = [];
    state.housing.rental = null;
    state.housing.withParents = true;
    rigged(engine, true, () => engine.resolvePrompt(warn(engine, state, ctx, 2), 'evacuate'));
    const help = state.prompts.find((p) => p.type === 'disasters.help');
    assert.ok(help, 'asked to help');
    const h = state.stats.happiness;
    engine.resolvePrompt(help.id, 'volunteer');
    assert.ok(state.stats.happiness >= h);
  },
  'the yearly roll warns before forecastable hazards'() {
    let warned = 0;
    for (let seed = 1; seed <= 80 && !warned; seed++) {
      const { engine, state } = life(seed);
      for (let y = 0; y < 10 && !warned; y++) {
        state.prompts = [];
        engine.ageUp();
        warned += state.prompts.filter((p) => p.type === 'disasters.warning').length;
      }
    }
    assert.ok(warned, 'a warning prompt');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} disaster test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} disaster tests passed`);
