/**
 * The people around you at work (people/CastAtWork.js): their firms bought or gone under, a
 * spouse's head-office transfer, partnership, the revolving door, boards, and a wife's
 * resignation under a marriage bar.
 *
 *   node tests/castatwork.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { CastAtWorkModule } from '../src/modules/people/CastAtWork.js';
import { getProfession } from '../src/modules/career/JobTrees.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId, startYear, gender = 'male') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(9), modules: MODULES });
  const state = engine.newLife({ countryId, startYear, gender });
  for (let i = 0; i < 30; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
function addWorker(state, relation, professionId, gradeAtLeast, extra = {}) {
  const prof = getProfession(professionId);
  const level = prof.levels.find((l) => (l.grade ?? 0) >= gradeAtLeast) ?? prof.levels.at(-1);
  const base = state.people.list.find((p) => p.alive);
  const p = { ...base, id: `w-${relation}-${professionId}`, relation, alive: true, firstName: 'Robin', gender: 'female', relationship: 80, ageOffset: 0, retired: false,
    job: level.title, income: 50000, careerIncome: 50000, career: { professionId, levelId: level.id, years: 2, inField: 12, awards: [], postings: [], elite: null, record: [] }, ...extra };
  state.people.list.push(p);
  return p;
}
const texts = (state) => state.log.flatMap((y) => y.entries.map((e) => e.text));
const years = (state, ctx, n) => { for (let i = 0; i < n; i++) { state.character.age += 1; state.prompts = state.prompts.filter((p) => p.type === 'castAtWork.transfer'); CastAtWorkModule.onAgeUp(ctx); state.character.age -= 1; } };

const tests = {
  'a spouse at a firm sees takeovers, collapses or a head-office offer over the years'() {
    const { state, ctx, engine } = life('US', 1960);
    const p = addWorker(state, 'spouse', 'corporate', 6);
    let seen = false;
    for (let i = 0; i < 300 && !seen; i++) {
      p.job ??= 'Manager';
      state.world.seed = (state.world.seed ?? 1) + 1; CastAtWorkModule.onAgeUp(ctx);
      seen = state.prompts.some((x) => x.type === 'castAtWork.transfer');
    }
    assert.ok(seen, 'a head-office offer came');
    assert.ok(texts(state).some((t) => /bought by|went under/.test(t)), 'company news');
    const pr = state.prompts.find((x) => x.type === 'castAtWork.transfer');
    const from = state.character.regionId;
    engine.resolvePrompt(pr.id, 'move');
    assert.notEqual(state.character.regionId, from, 'moved with them');
  },
  'a lawyer in the family is made partner or passed over, once'() {
    const { state, ctx } = life('GB', 1950);
    const p = addWorker(state, 'sibling', 'law', 5);
    for (let i = 0; i < 60 && !p.career.partnership; i++) { p.job ??= 'Lawyer'; state.world.seed = (state.world.seed ?? 1) + 1; CastAtWorkModule.onAgeUp(ctx); }
    assert.ok(['partner', 'passed'].includes(p.career.partnership));
    assert.ok(texts(state).some((t) => /partner/.test(t)));
  },
  'a senior public servant goes through the revolving door'() {
    const { state, ctx } = life('US', 1960);
    const p = addWorker(state, 'father', 'fbi', 7, { ageOffset: 20 });
    for (let i = 0; i < 400 && !p.career.revolved; i++) { state.world.seed = (state.world.seed ?? 1) + 1; CastAtWorkModule.onAgeUp(ctx); if (!p.job) p.job = 'Agent'; }
    assert.ok(p.career.revolved, 'revolved');
    assert.ok(p.careerIncome > 50000);
  },
  'your wife resigns her teaching post on your marriage under a bar'() {
    const { state, ctx } = life('GB', 1900);
    const p = addWorker(state, 'spouse', 'education', 1);
    ctx.emit('people:married', { personId: p.id });
    assert.equal(p.job, null);
    assert.ok(texts(state).some((t) => /marriage|married women/.test(t)));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
