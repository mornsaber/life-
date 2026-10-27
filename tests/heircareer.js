/**
 * Continuing as a child: the job they had becomes your career, at a level that fits their
 * years, with the degrees and licences it needs.
 *
 *   node tests/heircareer.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { NPC_JOBS } from '../src/modules/people/NpcLives.js';
import { NPC_CAREERS } from '../src/modules/people/HeirCareer.js';
import { getProfession } from '../src/modules/career/JobTrees.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function heirOf(job, { childAge = 35, countryId = 'US', edu = 'bachelor', seed = 5 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = 70;
  state.legal.record = [];
  state.prompts = [];
  state.people.list.push({ id: 'kid', firstName: 'Sam', lastName: state.character.lastName, gender: 'female', relation: 'child', ageOffset: childAge - 70, alive: true, relationship: 80, income: 90000, job, careerIncome: 90000, life: { edu } });
  engine.context().die('Old age');
  return { engine, heir: engine.continueAsChild('kid') };
}

const tests = {
  'every family job title maps to a real profession'() {
    for (const [title] of NPC_JOBS) {
      assert.ok(NPC_CAREERS[title], `no mapping for ${title}`);
      assert.ok(getProfession(NPC_CAREERS[title].prof), `no profession ${NPC_CAREERS[title].prof} for ${title}`);
    }
  },
  'a nurse carries on as a nurse, licensed, with her degree'() {
    const { heir } = heirOf('Nurse');
    assert.equal(heir.career.job?.professionId, 'nursing');
    assert.ok(heir.credentials.held.rn, 'the RN licence');
    assert.ok(heir.education.degrees.some((d) => d.type === 'bachelor' && d.major === 'nursing'));
  },
  'a doctor carries on as a doctor, with the M.D.'() {
    const { heir } = heirOf('Doctor', { childAge: 45, edu: 'professional' });
    assert.equal(heir.career.job?.professionId, 'medical');
    assert.ok(heir.education.degrees.some((d) => d.programId === 'md'));
  },
  'years of work put a mid-career heir above the entry level'() {
    const { heir } = heirOf('Software developer', { childAge: 45 });
    const p = getProfession('tech');
    const entry = p.levels.findIndex((l) => l.entry);
    assert.ok(p.levels.findIndex((l) => l.id === heir.career.job.levelId) > Math.max(0, entry));
  },
  'a teenager starts without a job; an adult between jobs finds one'() {
    assert.equal(heirOf('Cashier', { childAge: 15, edu: 'none' }).heir.career.job, null);
    // Between jobs at 35: they find work their schooling fits.
    const between = heirOf(null).heir;
    assert.ok(between.career.job, 'an adult heir out of school is working');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} heir career test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} heir career tests passed`);
