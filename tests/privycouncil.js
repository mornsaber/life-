/**
 * Council actions: a Privy Counsellor attends, is briefed, reviews, hears appeals, resigns;
 * an Executive Council member advises, presses for reform, resigns in protest.
 *
 *   node tests/privycouncil.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { counsellorSeat, excoSeat } from '../src/modules/world/PrivyCouncil.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, born, seed = 3) => {
  for (let k = 0; k < 8; k++) { const l = lifeOnce(cc, born, seed + k); if (l.state.character.alive) return l; }
  return lifeOnce(cc, born, seed);
};
const lifeOnce = (cc, born, seed) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: born });
  for (let i = 0; i < 55; i++) { engine.autoResolve(); state.prompts = []; state.stats.health = 100; state.health &&= { ...state.health, conditions: [] }; engine.ageUp(); if (!state.character.alive) break; }
  engine.autoResolve(); state.prompts = [];
  return { engine, state };
};
const logs = (state) => (state.log.at(-1)?.entries ?? []).slice(-3).map((e) => e.text).join(' | ');

const tests = {
  'a Privy Counsellor can attend once a year, chair a review, and resign'() {
    const { engine, state } = life('GB', 1930);
    state.privyCouncil = [{ council: 'GB', name: "His Majesty's Most Honourable Privy Council", since: 1980, style: 'The Rt Hon.' }];
    engine.dispatch('privyCouncil.attend');
    assert.match(logs(state), /Orders in Council/);
    assert.equal(counsellorSeat(state).meetings, 1);
    engine.dispatch('privyCouncil.attend');
    assert.equal(counsellorSeat(state).meetings, 1);
    engine.dispatch('privyCouncil.review');
    assert.match(logs(state), /committee of Privy Counsellors/);
    assert.match(VIEWS.honors(state, {}), /Attend a meeting/);
    engine.dispatch('privyCouncil.resign');
    assert.equal(counsellorSeat(state), null);
  },
  'an Executive Council member is asked the year\'s question and can press for reform'() {
    const { engine, state } = life('KE', 1890, 11);
    state.privyCouncil = [{ council: 'exco.KE', name: 'the Executive Council of Kenya Colony', colony: 'Kenya Colony', since: 1940, style: 'The Hon.' }];
    engine.dispatch('privyCouncil.advise');
    const p = state.prompts.find((x) => x.type === 'privyCouncil.advise');
    assert.ok(p, 'a prompt');
    engine.resolvePrompt(p.id, 'local');
    assert.ok(excoSeat(state).voice > 40);
    engine.dispatch('privyCouncil.pressReform');
    assert.ok(excoSeat(state).standing < 60);
    assert.match(VIEWS.honors(state, {}), /Press for more local members/);
    engine.dispatch('privyCouncil.resignProtest');
    assert.equal(excoSeat(state), null);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 3).join('\n    ')}`); }
}
process.exit(failed ? 1 : 0);
