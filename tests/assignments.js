/**
 * Postings within a rank (career/Assignments.js): a detective is a constable or a sergeant posted
 * to CID, not a separate ladder.
 *
 *   node tests/assignments.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, applyLevel } from '../src/modules/career/CareerEngine.js';
import { getProfession, PROFESSION_LIST } from '../src/modules/career/JobTrees.js';
import { ladderFor, levelById } from '../src/modules/career/Ladder.js';
import { assignmentsFor, migrateAssignmentLevel } from '../src/modules/career/Assignments.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { jobInsignia } from '../src/ui/Insignia.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function cop(countryId = 'US', levelId = 'officer', year = 1990, pid = 'police') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
  const state = engine.newLife({ countryId, startYear: year - 30 });
  state.character.age = 30;
  state.prompts = [];
  const ctx = engine.context();
  const prof = PROFESSION_LIST.find((p) => (p.template ?? p.id) === pid && (p.country ?? 'US') === countryId) ?? getProfession(pid);
  const employer = createEmployer(ctx.rng, state, prof, state.character.regionId);
  employer.size = 'large';
  hire(ctx, { professionId: prof.id, levelId, employer });
  state.career.job.yearsAtEmployer = 6;
  state.career.job.performance = 95;
  state.career.job.boss = 95;
  state.prompts = [];
  return { engine, state };
}
const post = (engine, state, id) => { for (let i = 0; i < 30 && state.career.job.assignment?.id !== id; i++) { state.yearly = {}; engine.dispatch('assignments.request', id); } };

const tests = {
  'no one is promoted onto a separate detective ladder'() {
    const ladder = ladderFor(getProfession('police'), 'enterprise').map((l) => l.id);
    for (const id of ['detective', 'seniorDetective', 'detSergeant', 'detLieutenant', 'detCaptain']) assert.ok(!ladder.includes(id), id);
    assert.ok(ladder.includes('sergeant') && ladder.includes('lieutenant'));
    const fire = ladderFor(getProfession('fire'), 'large').map((l) => l.id);
    assert.ok(!fire.includes('investigator') && !fire.includes('inspector'));
  },
  'an American officer posted to the Detective Bureau is a Detective; a sergeant a Detective Sergeant'() {
    const { engine, state } = cop('US', 'officer');
    post(engine, state, 'cid');
    assert.equal(state.career.job.title, 'Detective');
    assert.equal(state.career.job.levelId, 'officer', 'the rank stays');
    const s = cop('US', 'sergeant');
    post(s.engine, s.state, 'cid');
    assert.equal(s.state.career.job.title, 'Detective Sergeant');
    s.engine.dispatch('assignments.leave');
    assert.equal(s.state.career.job.title, 'Sergeant');
  },
  'a British constable becomes a Detective Constable, and keeps a constable\'s badge'() {
    const { engine, state } = cop('GB', 'officer');
    const before = jobInsignia(state.career.job, getProfession(state.career.job.professionId), 'GB');
    post(engine, state, 'cid');
    assert.match(state.career.job.title, /^Detective Constable/);
    assert.equal(jobInsignia(state.career.job, getProfession(state.career.job.professionId), 'GB'), before);
  },
  'postings of their day: no armed response in 1930, no dogs before 1946'() {
    const { state } = cop('GB', 'officer', 1930);
    const by = Object.fromEntries(assignmentsFor(state).map((o) => [o.def.id, o]));
    assert.equal(by.armed.ok, false);
    assert.equal(by.k9.ok, false);
    assert.equal(by.cid.ok, true);
  },
  'promoted while in CID: Detective Sergeant'() {
    const { engine, state } = cop('US', 'senior');
    post(engine, state, 'cid');
    const job = state.career.job;
    applyLevel(job, levelById(getProfession(job.professionId), 'sergeant'));
    engine.context().emit('career:promoted', { job });
    assert.equal(job.title, 'Detective Sergeant');
  },
  'an old save on the detective ladder becomes a posted rank'() {
    const { state } = cop('US', 'officer');
    const job = state.career.job;
    applyLevel(job, levelById(getProfession('police'), 'detSergeant'));
    assert.ok(migrateAssignmentLevel(state, job, applyLevel));
    assert.equal(job.levelId, 'sergeant');
    assert.equal(job.assignment.id, 'cid');
    assert.equal(job.title, 'Detective Sergeant');
  },
  'the career tab shows postings'() {
    const { state } = cop('US', 'officer');
    assert.match(VIEWS.career(state, {}), /Postings/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
