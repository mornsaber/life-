/**
 * International sport: call-ups, the Olympics and World Cups, doping bans, and running sport.
 *
 *   node tests/sport.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, currentYear } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function athlete(seed = 5, countryId = 'GB', levelId = 'allStar') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.legal.record = [];
  state.character.age = 24;
  state.stats.fitness = 95;
  state.prompts = [];
  const ctx = engine.context();
  const p = getProfession('athletics');
  hire(ctx, { professionId: 'athletics', levelId, employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
  state.prompts = [];
  return { engine, state, ctx };
}
const mod = MODULES.find((m) => m.id === 'sport');
const with_ = (engine, chance, fn) => { const c = engine.rng.chance; engine.rng.chance = chance; try { return fn(); } finally { engine.rng.chance = c; } };

const tests = {
  'an all-star is capped, goes to the Olympics, and the medal is an honour'() {
    const { engine, state } = athlete(3);
    state.sport = { discipline: 'rowing', caps: 0, captain: false, olympics: [], cups: [], doped: false, banUntil: null, federation: null, ioc: null, fifa: null };
    for (let i = 0; i < 12; i++) {
      state.stats.fitness = 95;
      state.prompts = [];
      // Each year: capped, and a podium roll that always lands.
      const next = engine.rng.next; engine.rng.next = () => 0.01;
      try { with_(engine, () => true, () => mod.onAgeUp(engine.context())); } finally { engine.rng.next = next; }
      if (state.sport.olympics.length) break;
      engine.ageUp();
    }
    assert.ok(state.sport.caps > 0, 'capped');
    assert.ok(state.sport.olympics.length, `an Olympian (year ${currentYear(state)})`);
    assert.ok(state.honors.some((h) => /Olympic gold/.test(h.name)), 'gold');
    assert.match(VIEWS.career(state, {}), /International Sport/);
  },
  'a positive test bans you and takes back medals won while doping'() {
    const { engine, state, ctx } = athlete(4);
    state.sport = { discipline: 'cycling', caps: 20, captain: false, olympics: [{ year: 2028, city: 'Los Angeles', place: 1, doped: true }], cups: [], doped: true, banUntil: null, federation: null, ioc: null, fifa: null };
    state.honors.push({ id: 'sport.olympic.2028.1', name: 'Olympic gold medal', sport: true, year: 2028, prestige: 30 });
    with_(engine, () => true, () => mod.onAgeUp(ctx));
    assert.ok(state.sport.banUntil > state.character.age);
    assert.ok(!state.honors.some((h) => /Olympic gold/.test(h.name)), 'stripped');
    assert.notEqual(state.career.job?.professionId, 'athletics');
  },
  'a retired Olympian joins the federation, then the IOC; a bribe can end it'() {
    const { engine, state, ctx } = athlete(5);
    state.career.job = null;
    state.sport = { discipline: 'football', caps: 40, captain: true, olympics: [{ year: 2028, city: 'Los Angeles', place: 3 }], cups: [], doped: false, banUntil: null, federation: null, ioc: null, fifa: null };
    with_(engine, () => true, () => engine.dispatch('sport.federation'));
    assert.equal(state.sport.federation, 'board');
    with_(engine, () => true, () => engine.dispatch('sport.ioc'));
    assert.ok(state.sport.ioc);
    state.prompts = [];
    with_(engine, () => true, () => mod.onAgeUp(ctx));
    const q = state.prompts.find((p) => p.type === 'sport.hostVote');
    assert.ok(q, 'a host vote');
    with_(engine, () => true, () => engine.resolvePrompt(q.id, 'b'));
    assert.ok(state.prompts.some((p) => p.type === 'legal.court') || state.legal.investigations?.length || state.legal.record.length, 'investigated');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} sport test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} sport tests passed`);
