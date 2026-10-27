/**
 * The merchant navy (flags of convenience, manning agencies, piracy, abandonment, marine
 * casualties) and foreign correspondents (bureaus, the story, expulsion and arrest, prizes).
 *
 *   node tests/seaandpress.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { postingOf } from '../src/modules/world/Posting.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', ...opts });
  state.legal.record = [];
  state.character.age = 32;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const giveJob = (engine, professionId, levelId) => {
  const ctx = engine.context();
  const profession = getProfession(professionId);
  const job = hire(ctx, { professionId, levelId, employer: createEmployer(engine.rng, engine.state, profession, engine.state.character.regionId) });
  engine.state.prompts = [];
  return job;
};
const always = (rng, fn) => { const c = rng.chance; rng.chance = () => true; try { return fn(); } finally { rng.chance = c; } };


const tests = {
  'a Filipino seafarer signs on through a manning agency to a flag-of-convenience ship'() {
    const { engine, state } = life({ countryId: 'PH' }, 3);
    const job = giveJob(engine, 'merchantMarine', 'able');
    assert.ok(job.ship, 'a ship');
    assert.ok(['PA', 'LR', 'MH', 'MT', 'BS'].includes(job.ship.flag), `flag ${job.ship.flag}`);
    assert.match(job.contract.agency, /Manila/);
    assert.match(VIEWS.career(state, {}), /Your Ship/);
  },
  'pirates: the citadel usually works; surrender means months as a hostage'() {
    const { engine, state, ctx } = life({ countryId: 'IN' }, 4);
    giveJob(engine, 'merchantMarine', 'able');
    const mod = MODULES.find((m) => m.id === 'seafaring');
    always(ctx.rng, () => mod.resolvers.pirates(ctx, {}, 'citadel'));
    assert.ok(!state.flags.hostage, 'safe in the citadel');
    mod.resolvers.pirates(ctx, {}, 'surrender');
    assert.ok(state.flags.hostage?.months >= 3);
  },
  'a reporter in Moscow publishes everything, and is arrested or expelled'() {
    const { engine, state, ctx } = life({}, 5);
    giveJob(engine, 'journalism', 'senior');
    always(ctx.rng, () => engine.dispatch('correspondent.ask', 'moscow'));
    assert.equal(state.career.job.bureau?.id, 'moscow');
    assert.ok(postingOf(state), 'posted abroad');
    const mod = MODULES.find((m) => m.id === 'correspondent');
    always(ctx.rng, () => mod.resolvers.story(ctx, { bureau: 'moscow' }, 'publish'));
    assert.ok(state.career.job.bureau.until <= state.character.age, 'the posting ended');
    assert.ok(state.career.job.bureau.expelled || state.honors.some((h) => h.id === 'press.cpj'));
  },
  'a reporter in London builds a name and wins the prize'() {
    const { engine, state, ctx } = life({}, 6);
    giveJob(engine, 'journalism', 'investigative');
    always(ctx.rng, () => engine.dispatch('correspondent.ask', 'london'));
    const mod = MODULES.find((m) => m.id === 'correspondent');
    for (let i = 0; i < 3; i++) always(ctx.rng, () => mod.resolvers.story(ctx, { bureau: 'london' }, 'publish'));
    assert.ok(state.honors.some((h) => h.id === 'press.prize' && /Pulitzer/.test(h.name)));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} sea and press test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} sea and press tests passed`);
