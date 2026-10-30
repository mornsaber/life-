/**
 * Revolutions, social movements, and founding a church.
 *
 *   node tests/society.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { revolutionTick } from '../src/modules/world/Revolution.js';
import { regimeHere } from '../src/modules/world/Regimes.js';
import { movementTick } from '../src/modules/civic/Movements.js';
import { sectTick } from '../src/modules/community/Sects.js';
import { asylumRoute } from '../src/modules/world/Migration.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', seed = 3, age = 30) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = age;
  state.prompts = [];
  state.legal.record = [];
  state.finances.cash = 100000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const answer = (engine, state, type, opt) => { const p = state.prompts.find((x) => x.type === type); if (p) engine.resolvePrompt(p.id, opt ?? p.options[0].id); return p; };

const tests = {
  'an authoritarian state: unrest, the squares, and a regime that falls (or a crackdown and exile)'() {
    let won = 0; let exiled = 0;
    for (let seed = 1; seed <= 30 && (!won || !exiled); seed++) {
      const { engine, state, ctx } = life('RU', seed);
      for (let y = 0; y < 30; y++) {
        state.prompts = [];
        state.legal.incarceration = null;
        state.world.unrest = { RU: Math.max(state.world.unrest?.RU ?? 0, 60 + y * 2) };
        revolutionTick(ctx);
        answer(engine, state, 'revolution.protest', 'organise');
        if (answer(engine, state, 'revolution.crackdown', 'exile')) { exiled += 1; assert.ok(asylumRoute(state, 'DE'), 'asylum opens to the persecuted'); }
        if ((state.world.revolutions ?? []).some((r) => r.result === 'won')) { won += 1; assert.equal(regimeHere(state).kind, 'democracy'); break; }
        state.character.age += 1;
      }
    }
    assert.ok(won >= 1 && exiled >= 1, `won ${won}, exiled ${exiled}`);
  },
  'a movement grows, wins, and faces backlash'() {
    const { engine, state, ctx } = life('US', 5);
    state.civic.activism = { cause: 'housing', influence: 40, protests: 3, arrests: 0, years: 3 };
    engine.dispatch('movements.found');
    assert.ok(state.civic.movement);
    for (let y = 0; y < 20; y++) { state.prompts = []; movementTick(ctx); answer(engine, state, 'movements.strategy', 'organise'); answer(engine, state, 'movements.backlash', 'meet'); state.character.age += 1; }
    assert.ok(state.civic.movement.members > 500);
    assert.ok(state.civic.movement.wins >= 1);
    clean(VIEWS.civic ? VIEWS.civic(state, {}) : VIEWS.community(state, {}));
  },
  'a church grows from a rented hall, and controversy follows the prosperity gospel'() {
    const { engine, state, ctx } = life('US', 6, 35);
    engine.dispatch('sects.found');
    state.sect.style = 'prosperity';
    let controversy = 0;
    for (let y = 0; y < 25; y++) { state.prompts = []; sectTick(ctx); if (answer(engine, state, 'sects.controversy', 'fight')) controversy += 1; answer(engine, state, 'sects.direction', 'stay'); state.character.age += 1; }
    assert.ok(state.sect.members > 100);
    assert.ok(controversy >= 1);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} society tests passed`);
