/**
 * Grades in order: every promotion is a step up, at every employer size; the longest ladders go
 * past G10; pay still rises rank by rank; and fewer promotion exams.
 *
 *   node tests/grades.js
 */
import assert from 'node:assert/strict';
import '../src/modules/registry.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { ladderFor, SIZE_ORDER } from '../src/modules/career/Ladder.js';
import { GRADE_BASE, gradeGainPay, payGradeLabel } from '../src/modules/career/PayGrades.js';
import { EXAM_RANKS } from '../src/modules/publicsafety/CivilService.js';

const tests = {
  'no two rungs of a track share a grade, at any employer size'() {
    const bad = [];
    for (const [id, p] of Object.entries(PROFESSIONS)) for (const s of SIZE_ORDER) {
      const lad = ladderFor(p, s);
      for (const t of ['shared', 'ic', 'mgmt']) {
        const ls = lad.filter((l) => l.track === t);
        for (let i = 1; i < ls.length; i++) if (ls[i].grade <= ls[i - 1].grade) bad.push(`${id}@${s}: ${ls[i - 1].title} / ${ls[i].title} (G${ls[i].grade})`);
      }
    }
    assert.deepEqual(bad.slice(0, 5), []);
  },
  'long ladders go past G10, and every grade has a pay base'() {
    let max = 0;
    for (const p of Object.values(PROFESSIONS)) for (const s of SIZE_ORDER) for (const l of ladderFor(p, s)) max = Math.max(max, l.grade);
    assert.ok(max > 10, `top grade ${max}`);
    assert.ok(GRADE_BASE[max] > GRADE_BASE[10]);
    assert.ok(gradeGainPay(10, 12) < 1, 'a regraded rung is priced from its written grade');
    assert.match(payGradeLabel({ sector: 'federal', grade: 13 }, 'US'), /^EX-/);
  },
  'a big police department: its chief sits above every command rank'() {
    const lad = ladderFor(PROFESSIONS.police, 'mega').filter((l) => l.track === 'mgmt');
    const chief = lad.at(-1);
    assert.ok(lad.slice(0, -1).every((l) => l.grade < chief.grade), chief.title);
    const small = ladderFor(PROFESSIONS.police, 'small').find((l) => l.id === chief.id);
    assert.ok(small.grade < chief.grade, 'a small-town chief is graded lower');
  },
  'a field office head answers to headquarters (the FBI)'() {
    const lad = ladderFor(PROFESSIONS.fbi, 'medium').map((l) => l.title);
    assert.ok(lad.indexOf('Special Agent in Charge') < lad.indexOf('Assistant Director'));
  },
  'fewer promotion exams: the supervisory ranks only'() {
    for (const ranks of Object.values(EXAM_RANKS)) assert.ok(ranks.length <= 2);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
