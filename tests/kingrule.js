/**
 * A ruling monarch rules: law by decree and the reforms an elected leader would have. A
 * deposed monarch can come back: monarchist support that drifts and can be rallied, a
 * restoration referendum once it's high enough, or taking the throne back by force.
 *
 *   node tests/kingrule.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { abolish, houseOf, fellInLife, restorable, reclaimOdds, monarchistSupport } from '../src/modules/world/Houses.js';
import { demise } from '../src/modules/world/Crown.js';
import { decreeOptions } from '../src/modules/world/Throne.js';
import { governsHere, reformsOpen } from '../src/modules/world/Reforms.js';
import { levelValue } from '../src/modules/politics/Laws.js';
import { courtView } from '../src/ui/views/CrownCard.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const king = (cc = 'SA', seed = 2) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, royalLevel: 'heir', gender: 'male' });
  for (let i = 0; i < 40; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  if (!state.royal?.reigning) demise(engine.context(), state.royal.crownId, 'died');
  return { engine, state };
};

const tests = {
  'a ruling monarch makes law by decree, twice a year'() {
    const { engine, state } = king();
    const opts = decreeOptions(state);
    assert.ok(opts.length >= 2, `${opts.length} decree options`);
    const o = opts[0];
    engine.dispatch('throne.decree', `${o.id}|${o.dir}`);
    assert.deepEqual(levelValue(state, o.id, 'federal', 'SA'), o.to);
    engine.dispatch('throne.decree', `${opts[1].id}|${opts[1].dir}`);
    const third = decreeOptions(state)[0];
    const before = levelValue(state, third.id, 'federal', 'SA');
    engine.dispatch('throne.decree', `${third.id}|${third.dir}`);
    assert.deepEqual(levelValue(state, third.id, 'federal', 'SA'), before, 'no third decree');
    assert.match(courtView(state), /Law by decree/);
  },
  'a ruling monarch governs: the reforms are theirs, paid for in popularity'() {
    const { engine, state } = king();
    assert.ok(governsHere(state));
    const open = reformsOpen(state);
    assert.ok(open.length >= 1);
    const pop = state.royal.popularity;
    engine.dispatch('reforms.enact', open[0].id);
    assert.ok(state.yearly['reforms.enact'], 'enacted');
    assert.notEqual(state.royal.popularity, pop);
  },
  'a constitutional monarch does not rule'() {
    const { state } = king('GB');
    assert.ok(!governsHere(state));
    assert.equal(decreeOptions(state).length, 0);
  },
  'a deposed king has a way back: support drifts, can be rallied, and the throne can be retaken'() {
    const { engine, state } = king();
    abolish(engine.context(), 'SA');
    assert.equal(state.royal, null);
    assert.ok(fellInLife(state, 'SA') && restorable(state, 'SA'));
    assert.equal(houseOf(state)?.rank, 'head');
    assert.ok(reclaimOdds(state, 'SA') > 0.05);
    assert.match(VIEWS.court(state, {}), /Take back the throne/);
    // Support moves each year (it no longer only exists for history's houses).
    const s0 = monarchistSupport(state, 'SA');
    for (let i = 0; i < 3; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
    assert.notEqual(monarchistSupport(state, 'SA'), s0);
    // Force: certain success for the test.
    state.prompts = [];
    state.finances.cash = 2e6;
    houseOf(state).reclaimAge = null;
    houseOf(state).banned = null;
    const chance = engine.rng.chance; engine.rng.chance = () => true;
    engine.dispatch('houses.reclaim');
    engine.rng.chance = chance;
    assert.ok(state.royal?.reigning, 'back on the throne');
    assert.ok(!state.world.republics?.SA, 'the republic is gone');
  },
  'a failed attempt means exile and a ban'() {
    const { engine, state } = king();
    abolish(engine.context(), 'SA');
    state.finances.cash = 2e6;
    const chance = engine.rng.chance; engine.rng.chance = () => false;
    engine.dispatch('houses.reclaim');
    engine.rng.chance = chance;
    assert.ok(!state.royal);
    assert.ok(houseOf(state).banned > state.character.age);
  },
  'enough monarchists force a restoration referendum'() {
    const { engine, state } = king();
    abolish(engine.context(), 'SA');
    state.world.monarchists.SA = 70;
    let asked = false;
    for (let i = 0; i < 25 && !asked; i++) { state.prompts = []; state.stats.health = 90; state.world.monarchists.SA = 70; engine.ageUp(); asked = state.prompts.some((p) => p.type === 'houses.referendum'); }
    assert.ok(asked, 'the referendum comes');
    const q = state.prompts.find((p) => p.type === 'houses.referendum');
    engine.resolvePrompt(q.id, 'vote');
    assert.ok(state.royal?.reigning, 'a 70% vote restores you');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
