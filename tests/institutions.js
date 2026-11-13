/**
 * Institutions of their day: bank runs before deposit insurance, owning the press, landmark cases.
 *
 *   node tests/institutions.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { PublicLifeModule, depositsInsured, outletsNow } from '../src/modules/world/Institutions.js';
import { racketOpen } from '../src/modules/legal/Underworld.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year, cc = 'US', ageNow = 40) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(11), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - ageNow });
  state.character.age = ageNow;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};
const ids = (l) => l.map((x) => x.id);

const tests = {
  'a run on the bank in 1931 America, and the FDIC after'() {
    const { engine, state, ctx } = life(1931);
    state.finances.cash = 50000;
    PublicLifeModule.onAgeUp(ctx);
    const p = state.prompts.find((x) => x.type === 'publicLife.bankRun');
    assert.ok(p, 'the bank run');
    engine.resolvePrompt(p.id, 'trust');
    assert.ok(state.finances.cash <= 50000);
    assert.ok(!depositsInsured(state));
    assert.ok(depositsInsured(life(1940).state));
  },
  'the press of the day: no television in 1930, no private radio in 1950s Britain'() {
    assert.ok(!ids(outletsNow(life(1930).state)).includes('tv'));
    assert.ok(ids(outletsNow(life(1930).state)).includes('radio'));
    assert.ok(!ids(outletsNow(life(1960, 'GB').state)).includes('radio'));
    assert.ok(ids(outletsNow(life(1960, 'GB').state)).includes('tv'), 'ITV from 1955');
    assert.ok(ids(outletsNow(life(2000).state)).includes('site'));
  },
  'rackets of their day: bootlegging under Prohibition, no online fraud in 1925'() {
    assert.ok(racketOpen(life(1925).state, 'bootlegging'));
    assert.ok(!racketOpen(life(1925, 'GB').state, 'bootlegging'), 'no Prohibition in Britain');
    assert.ok(!racketOpen(life(1940).state, 'bootlegging'), 'Repeal');
    assert.ok(!racketOpen(life(1925).state, 'cyber'));
    assert.ok(racketOpen(life(2010).state, 'cyber'));
  },
  'buying a paper, and running it'() {
    const { engine, state, ctx } = life(1910);
    state.finances.cash = 1e9;
    assert.match(VIEWS.business(state, {}), /The Press/);
    engine.dispatch('publicLife.buyOutlet', 'paper:local');
    assert.ok(state.press);
    engine.dispatch('publicLife.line', 'scandal');
    assert.equal(state.press.line, 'scandal');
    PublicLifeModule.onAgeUp(ctx);
    assert.match(VIEWS.business(state, {}), /Editorial line/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
