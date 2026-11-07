/**
 * Your week, your skills and your routine.
 *
 *   node tests/gameplay.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { timeTick, freeHours, usedHours } from '../src/modules/life/TimeBudget.js';
import { skillsTick, skill, practise, skillHireBonus } from '../src/modules/life/Skills.js';
import { routineTick, physicalWorkBarred } from '../src/modules/health/Routine.js';
import { addCondition } from '../src/modules/health/HealthEngine.js';
import { lifestyleOf } from '../src/modules/health/Lifestyle.js';
import { applicationEligibility } from '../src/modules/career/CareerEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', seed = 3, age = 30) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = age;
  state.prompts = [];
  state.finances.cash = 100000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const answer = (engine, state, type, opt) => { const p = state.prompts.find((x) => x.type === type); if (p) engine.resolvePrompt(p.id, opt ?? p.options[0].id); return p; };

const tests = {
  'hours go where you put them, and long weeks burn you out'() {
    const { engine, state, ctx } = life('US', 4);
    const fit = state.stats.fitness;
    for (let i = 0; i < 5; i++) engine.dispatch('time.adjust', 'health:+');
    assert.ok(usedHours(state) <= freeHours(state));
    timeTick(ctx);
    assert.ok(state.stats.fitness > fit, 'exercise hours raise fitness');
    for (let i = 0; i < 30; i++) engine.dispatch('time.adjust', 'hustle:+');
    let burned = false;
    for (let y = 0; y < 6; y++) { state.prompts = []; timeTick(ctx); if (answer(engine, state, 'time.burnout', 'cut')) burned = true; state.character.age += 1; }
    assert.ok(burned || state.time.burnout >= 40, 'a side hustle on top of everything burns you out');
    clean(VIEWS.activities(state, {}));
  },
  'skills grow with practice, help you get hired, and fade when unused'() {
    const { engine, state, ctx } = life('US', 5);
    const base = skillHireBonus(state, 'tech');
    engine.dispatch('time.study', 'coding');
    for (let i = 0; i < 6; i++) engine.dispatch('time.adjust', 'learning:+');
    for (let y = 0; y < 5; y++) { timeTick(ctx); skillsTick(ctx); state.character.age += 1; }
    assert.ok(skill(state, 'coding') > 20, `coding ${skill(state, 'coding')}`);
    assert.ok(skillHireBonus(state, 'tech') > base, 'a coder is likelier to be hired in tech');
    practise(state, 'carpentry', 60);
    const c = skill(state, 'carpentry');
    for (let y = 0; y < 5; y++) { skillsTick(ctx); state.character.age += 1; }
    assert.ok(skill(state, 'carpentry') < c, 'unused skills rust');
    clean(VIEWS.school(state, {}));
  },
  'a habit becomes an addiction if you deny it'() {
    const { engine, state, ctx } = life('US', 6, 25);
    lifestyleOf(state).drinking = 'heavy';
    state.stats.stress = 80;
    let crisis = false;
    for (let y = 0; y < 20 && !crisis; y++) { state.prompts = []; routineTick(ctx); if (answer(engine, state, 'routine.habitCrisis', 'deny')) crisis = true; state.character.age += 1; }
    assert.ok(crisis, 'heavy drinking under stress reaches a crisis');
    assert.ok(state.health.conditions.some((c) => c.id === 'alcohol'), 'denial turns it into an addiction');
    assert.equal(state.health.routine.months.length, 12);
    clean(VIEWS.health(state, {}));
  },
  'a disabling condition closes physical jobs'() {
    const { state, ctx } = life('US', 7, 35);
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
    addCondition(ctx, 'backInjury', { severity: 95, diagnosed: true });
    assert.ok(physicalWorkBarred(state), 'a severe back injury is disabling');
    assert.match(applicationEligibility(state, 'trucking').reason ?? '', /health/);
    assert.doesNotMatch(applicationEligibility(state, 'tech').reason ?? '', /health/, 'desk work stays open');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} gameplay tests passed`);
