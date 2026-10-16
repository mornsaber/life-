/**
 * Difficulty levels: presets, knobs, heirs, the Hall of Fame, and a Brutal
 * life measurably harder than a Story one.
 *
 *   node tests/difficulty.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { DIFFICULTIES, knob, easeDifficulty, scoreMultiplier } from '../src/core/Difficulty.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { passChance } from '../src/modules/credentials/LicensingEngine.js';
import { CREDENTIALS } from '../src/modules/credentials/CredentialRegistry.js';
import { lifeScore } from '../src/modules/life/Achievements.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { newLifeForm } from '../src/ui/Components.js';
import { buildHeirState } from '../src/modules/people/Legacy.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(difficulty, seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ difficulty });
  return { engine, state };
}
const salaryAt = (difficulty) => {
  const { engine, state } = life(difficulty);
  state.character.age = 35;
  const p = getProfession('accounting');
  return hire(engine.context(), { professionId: 'accounting', levelId: 'staff', employer: createEmployer(new Random(2), state, p, state.character.regionId) }).salary;
};

const tests = {
  'Normal is the default and every knob is neutral on it'() {
    const { state } = life();
    assert.equal(state.difficulty.id, 'normal');
    for (const k of ['income', 'costOfLiving', 'credit', 'promotion', 'mortality', 'justice', 'recessions', 'wealth']) assert.equal(knob(state, k), 1, k);
    assert.equal(knob(state, 'exams'), 0);
    assert.equal(knob({}, 'income'), 1, 'old saves without a setting play on Normal');
  },

  'harder levels pay less and make exams harder; Story the reverse'() {
    const story = salaryAt('story');
    const normal = salaryAt('normal');
    const brutal = salaryAt('brutal');
    assert.ok(story > normal && normal > brutal, `${story} > ${normal} > ${brutal}`);
    const cred = CREDENTIALS.cpa ?? Object.values(CREDENTIALS).find((c) => c.exam);
    const odds = (d) => passChance(life(d).state, cred);
    assert.ok(odds('story') > odds('normal') && odds('normal') > odds('brutal'));
  },

  'Brutal lives are born poor'() {
    for (let seed = 1; seed <= 8; seed++) assert.equal(life('brutal', seed).state.people.wealth, 'low');
  },

  'you can make a life easier, never harder, and it then counts as assisted'() {
    const { engine, state } = life('hard');
    engine.dispatch('achievements.ease', 'brutal');
    assert.equal(state.difficulty.id, 'hard', 'not harder');
    engine.dispatch('achievements.ease', 'story');
    assert.equal(state.difficulty.id, 'story');
    assert.ok(state.difficulty.assisted);
    assert.ok(scoreMultiplier(state) <= 1);
    assert.equal(easeDifficulty({ difficulty: { id: 'normal' } }, 'hard'), false);
  },

  'harder lives score more in the Hall of Fame'() {
    const a = life('normal').state;
    const b = life('brutal').state;
    for (const s of [a, b]) { s.finances.cash = 2_000_000; s.achievements = { millionaire: 30 }; }
    assert.ok(lifeScore(b) > lifeScore(a));
  },

  'heirs inherit the difficulty'() {
    const { state } = life('hard');
    state.character.age = 60;
    state.people.list.push({ id: 'per_kid', firstName: 'Kid', lastName: state.character.lastName, gender: 'female', relation: 'child', ageOffset: -30, alive: true });
    state.character.alive = false;
    const heir = buildHeirState(new Random(4), state, 'per_kid');
    assert.ok(heir, 'an heir state');
    assert.equal(heir.difficulty.id, 'hard');
  },

  'the start screen, top bar and Achievements tab show it'() {
    const html = newLifeForm({ firstName: 'A', lastName: 'B' });
    for (const d of Object.values(DIFFICULTIES)) assert.ok(html.includes(d.name), d.name);
    const { state } = life('brutal');
    assert.match(VIEWS.achievements(state), /Difficulty: Brutal/);
  },

  'over many lives, Brutal is measurably harder than Story'() {
    const wealth = (difficulty) => {
      const out = [];
      for (let seed = 1; seed <= 6; seed++) {
        const { engine, state } = life(difficulty, seed);
        for (let i = 0; i < 45 && state.character.alive; i++) {
          state.prompts = [];
          engine.ageUp();
          if (state.character.age === 22 && !state.career.job && !state.legal.incarceration) {
            state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'accounting', year: 22 });
            hire(engine.context(), { professionId: 'accounting', levelId: 'staff', employer: createEmployer(new Random(seed), state, getProfession('accounting'), state.character.regionId) });
          }
          for (let j = 0; j < 8 && state.prompts.length; j++) { const p = state.prompts[0]; engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id); }
        }
        out.push(state.finances.lifetimeEarnings ?? 0);
      }
      return out.reduce((a, b) => a + b, 0) / out.length;
    };
    const story = wealth('story');
    const brutal = wealth('brutal');
    assert.ok(story > brutal * 1.1, `story ${Math.round(story)} vs brutal ${Math.round(brutal)}`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} difficulty test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} difficulty tests passed`);
