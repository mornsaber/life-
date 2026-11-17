/**
 * Coming back to the same work after resigning (CareerEngine.priorLevel).
 *
 *   node tests/rejoin.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { bestEntryLevel } from '../src/modules/career/CareerEngine.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { entryLevels } from '../src/modules/career/Ladder.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(pid, levelId, { away = 1, fired = false } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(2), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  state.character.age = 40;
  state.stats.smarts = 90;
  state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 }, { type: 'master', programId: 'mba', major: 'business', year: 25 });
  state.career.history.push({ professionId: pid, levelId, peakGrade: getProfession(pid).levels.find((l) => l.id === levelId).grade, startAge: 22, endAge: 40 - away, fired });
  return state;
}

const tests = {
  'a senior who resigned comes back senior, not at the bottom'() {
    const p = getProfession('corporate');
    const senior = p.levels.filter((l) => !l.appointed && !l.abilities.includes('exec')).sort((a, b) => b.grade - a.grade)[2];
    const state = life('corporate', senior.id);
    const level = bestEntryLevel(state, p, 'large');
    const bottom = entryLevels(p, 'large')[0];
    assert.ok(level.grade > bottom.grade, `${level.title} vs ${bottom.title}`);
  },
  'fired, you start again lower'() {
    const p = getProfession('corporate');
    const senior = p.levels.filter((l) => !l.appointed && !l.abilities.includes('exec')).sort((a, b) => b.grade - a.grade)[2];
    const kept = bestEntryLevel(life('corporate', senior.id), p, 'large');
    const fired = bestEntryLevel(life('corporate', senior.id, { fired: true }), p, 'large');
    assert.ok(fired.grade < kept.grade);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
