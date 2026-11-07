/**
 * Rivals, families across generations, and reputation by circle.
 *
 *   node tests/people2.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { RivalsModule, rivalsOf } from '../src/modules/people/Rivals.js';
import { familyTick, feudsOf, dynastyScore } from '../src/modules/people/FamilyFeuds.js';
import { rep, repIn, spreadScandal } from '../src/modules/life/Reputation.js';
import { hireChance } from '../src/modules/career/InterviewSystem.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { makePerson } from '../src/modules/people/PeopleEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', seed = 3, age = 13) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = age;
  state.prompts = [];
  state.finances.cash = 200000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const answer = (engine, state, type, opt) => { const p = state.prompts.find((x) => x.type === type); if (p) engine.resolvePrompt(p.id, opt ?? p.options[0].id); return p; };

const tests = {
  'a school rival grows up beside you, crosses your path, and can become a friend'() {
    let crossed = 0; let friends = 0;
    for (let seed = 1; seed <= 8 && (!crossed || !friends); seed++) {
      const { engine, state, ctx } = life('US', seed, 13);
      for (let y = 0; y < 40; y++) {
        state.prompts = [];
        RivalsModule.onAgeUp(ctx);
        if (answer(engine, state, 'rivals.cross', 'warm') || answer(engine, state, 'rivals.cross')) crossed += 1;
        if (rivalsOf(state).some((r) => r.friend)) { friends += 1; break; }
        state.character.age += 1;
      }
      if (rivalsOf(state).length) { assert.ok(rivalsOf(state)[0].wealth > 0); clean(VIEWS.people(state, {})); }
    }
    assert.ok(crossed >= 1, 'rivals cross your path');
    assert.ok(friends >= 1, 'a rivalry can end in friendship');
  },
  'family feuds start, a reunion can mend them, and the dynasty is scored'() {
    const { engine, state, ctx } = life('US', 4, 45);
    for (let i = 0; i < 3; i++) state.people.list.push(makePerson(ctx, { relation: 'sibling', age: 44 + i, lastName: state.character.lastName, relationship: 20 }));
    let feuded = 0; let reunions = 0;
    for (let y = 0; y < 30; y++) {
      state.prompts = [];
      familyTick(ctx);
      if (feudsOf(state).length) feuded += 1;
      if (answer(engine, state, 'familyFeuds.reunion', 'host')) reunions += 1;
      state.character.age += 1;
    }
    assert.ok(feuded >= 1, 'a feud starts');
    assert.ok(reunions >= 1, 'the family gathers');
    assert.ok(dynastyScore(state) >= 0);
    clean(VIEWS.people(state, {}));
  },
  'reputation moves by circle, a scandal spreads, and a good name helps you get hired'() {
    const { state, ctx } = life('US', 6, 30);
    const prof = getProfession('tech');
    const level = prof.levels[0];
    const base = hireChance(state, prof, level, 6, 9);
    rep(ctx, 'work', 40, 'Industry award');
    assert.ok(hireChance(state, prof, level, 6, 9) > base, 'a good name at work helps');
    const before = repIn(state, 'neighbourhood') + repIn(state, 'family');
    state.fame = { score: 90 };
    for (let i = 0; i < 6; i++) spreadScandal(ctx, 'online', 20, 'A scandal');
    assert.ok(repIn(state, 'online') < 50);
    assert.ok(repIn(state, 'neighbourhood') + repIn(state, 'family') < before, 'the scandal spread');
    clean(VIEWS.life(state, {}));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} people tests passed`);
