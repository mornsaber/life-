/**
 * Fame: one score from every source, tiers, endorsements, scandals that carry over, and the
 * choices to lie low or court the press.
 *
 *   node tests/fame.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { fameScore, fameSources, scandal, tierOf } from '../src/modules/life/Fame.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  state.character.age = 30;
  state.prompts = [];
  state.finances.cash = 200000;
  return { engine, state, ctx: engine.context() };
}
const creator = (state, fans) => { state.careerLife ??= {}; state.careerLife.audience = { professionId: 'contentCreator', fans, rep: 50, pace: 'steady', releases: [] }; };

const tests = {
  'a nobody is unknown; a million followers make you famous; sources combine'() {
    const { state } = life();
    assert.ok(fameScore(state) < 10, `unknown (${fameScore(state)})`);
    creator(state, 1000000);
    const s = fameScore(state);
    assert.ok(s >= 45 && s < 70, `famous (${s})`);
    assert.equal(tierOf(s)[1], 'Famous');
    state.politics = { office: { id: 'governor', approval: 60 }, recognition: 50 };
    assert.ok(fameScore(state) > s, 'office adds');
    assert.ok(fameSources(state).some((x) => x.id === 'office'));
  },
  'a reigning monarch is an icon'() {
    const { state } = life();
    state.royal = { crownId: 'GB', reigning: true, line: 0, working: true };
    assert.ok(fameScore(state) >= 90);
  },
  'a scandal lands on office, business, audience and job'() {
    const { state, ctx } = life();
    creator(state, 200000);
    state.politics = { office: { id: 'mayor', approval: 60 }, recognition: 30 };
    state.business = { current: { reputation: 70 }, holdings: [] };
    scandal(ctx, 10, 'a test scandal');
    assert.ok(state.politics.office.approval < 60);
    assert.ok(state.business.current.reputation < 70);
    assert.ok(state.careerLife.audience.rep < 50);
    assert.equal(state.fame.scandals.length, 1);
  },
  'an endorsement pays every year it runs'() {
    const { engine, state } = life();
    creator(state, 2000000);
    state.fame.deals.push({ brand: 'a bank', amount: 50000, until: 32 });
    const before = state.finances.lastYear?.gross ?? 0;
    engine.ageUp();
    state.prompts = [];
    assert.ok(JSON.stringify(state.finances).includes('Endorsement') || (state.finances.lastYear?.gross ?? 0) > before, 'paid');
  },
  'lying low cools the buzz; a publicity push raises it; the card shows it'() {
    const { engine, state } = life(7);
    creator(state, 500000);
    state.fame.buzz = 40;
    engine.dispatch('fame.lieLow');
    engine.ageUp();
    state.prompts = [];
    assert.ok(state.fame.buzz <= 12, `cooled (${state.fame.buzz})`);
    state.yearly = {};
    const c = engine.rng.chance; engine.rng.chance = () => false;
    engine.dispatch('fame.publicity');
    engine.rng.chance = c;
    assert.ok(state.fame.buzz > 12, 'pushed');
    assert.match(VIEWS.activities(state, {}), /Fame/);
  },
  'famous lives meet fame: offers, cameras, scandals over twenty years'() {
    const seen = new Set();
    for (let seed = 1; seed <= 6; seed++) {
      const { engine, state } = life(seed);
      creator(state, 3000000);
      for (let y = 0; y < 20 && state.character.alive; y++) {
        for (const p of state.prompts) if (p.type.startsWith('fame.')) seen.add(p.type);
        while (state.prompts.length) engine.resolvePrompt(state.prompts[0].id, (state.prompts[0].options.find((o) => !o.disabled) ?? state.prompts[0].options[0]).id);
        state.stats.health = 90;
        engine.ageUp();
      }
    }
    for (const t of ['fame.endorse', 'fame.paparazzi', 'fame.scandal']) assert.ok(seen.has(t), `${t} (${[...seen]})`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} fame test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} fame tests passed`);
