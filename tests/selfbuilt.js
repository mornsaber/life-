/**
 * Self-built and informal homes (realestate/SelfBuilt.js): a plot bought for cash and a house put
 * up a stage at a time, paid as the money comes in; a room on unclaimed land, no title, cleared
 * or regularized. Offered where most homes were made that way, not in the US.
 *
 *   node tests/selfbuilt.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { selfBuildHere, plotPrice, stageCost, STAGES, LIVABLE, selfBuilds } from '../src/modules/realestate/SelfBuilt.js';
import { carryingCosts } from '../src/modules/realestate/Maintenance.js';
import { housingStatus } from '../src/modules/realestate/HousingEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const adult = (countryId, startYear = 1995, seed = 5) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId, startYear });
  for (let i = 0; i < 22; i++) { state.prompts = []; engine.ageUp(); }
  state.prompts = [];
  return { engine, state };
};
const year = (engine, state) => { state.prompts = []; engine.ageUp(); state.prompts = []; };

const tests = {
  'offered where homes are self-built, not in the US or Britain'() {
    assert.ok(selfBuildHere(adult('IN').state));
    assert.ok(selfBuildHere(adult('NG').state));
    assert.ok(!selfBuildHere(adult('US').state));
    assert.ok(!selfBuildHere(adult('GB').state));
  },
  'a plot, then a stage a year; move in once the roof is on'() {
    const { engine, state } = adult('IN');
    state.finances.cash += 1e6;
    engine.dispatch('selfBuild.buyPlot');
    const p = state.housing.properties[0];
    assert.equal(p?.type, 'plot');
    assert.ok(p.purchasePrice === plotPrice(state) || p.purchasePrice > 0);
    for (let i = 0; i < STAGES.length; i++) {
      engine.dispatch('selfBuild.stage', p.id);
      const again = p.selfBuild.stage;
      engine.dispatch('selfBuild.stage', p.id);
      assert.equal(p.selfBuild.stage, again, 'one payment a year');
      if (p.selfBuild.stage < LIVABLE) assert.notEqual(p.use, 'primary');
      year(engine, state);
    }
    assert.equal(p.type, 'selfbuilt');
    assert.equal(p.use, 'primary');
    assert.equal(housingStatus(state), 'owner');
    assert.equal(selfBuilds(state).length, 0, 'finished');
    assert.ok(p.value > p.selfBuild.spent, 'worth more than the cash put in');
  },
  'paid in instalments when money is short'() {
    const { engine, state } = adult('NG');
    state.finances.cash = plotPrice(state);
    engine.dispatch('selfBuild.buyPlot');
    const p = state.housing.properties[0];
    const cost = stageCost(state, 0);
    state.finances.cash = Math.round(cost * 0.4);
    engine.dispatch('selfBuild.stage', p.id);
    assert.equal(p.selfBuild.stage, 0);
    assert.equal(p.selfBuild.paid, Math.round(cost * 0.4));
    year(engine, state);
    state.finances.cash = cost;
    engine.dispatch('selfBuild.stage', p.id);
    assert.equal(p.selfBuild.stage, 1, 'the rest of the stage paid');
    assert.equal(p.selfBuild.paid, 0);
    year(engine, state);
    state.finances.cash = 1;
    engine.dispatch('selfBuild.stage', p.id);
    assert.equal(p.selfBuild.paid ?? 0, 0, 'too little to start on the walls');
  },
  'a room on unclaimed land: no rent, no title, no tax; cleared or regularized in time'() {
    let cleared = 0;
    let titled = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const { engine, state } = adult('NG', 1995, seed);
      state.finances.cash += 50000;
      engine.dispatch('selfBuild.shack');
      const p = state.housing.properties.find((x) => x.type === 'shack');
      assert.ok(p, 'built');
      assert.equal(p.use, 'primary');
      assert.ok(p.informal);
      assert.equal(state.housing.rental, null);
      assert.equal(carryingCosts(p, state).tax, 0);
      for (let i = 0; i < 25 && state.character.alive; i++) year(engine, state);
      if (!state.housing.properties.includes(p)) cleared += 1;
      else if (!p.informal) titled += 1;
    }
    assert.ok(cleared > 0, 'some settlements are cleared');
    assert.ok(titled > 0, 'some are regularized');
  },
  'the Home tab shows it'() {
    const { engine, state } = adult('IN');
    assert.match(VIEWS.home(state), /Build Your Own/);
    state.finances.cash += 1e6;
    engine.dispatch('selfBuild.buyPlot');
    assert.match(VIEWS.home(state), /Building Your House/);
    assert.doesNotMatch(VIEWS.home(adult('US').state), /Build Your Own/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed += 1; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
