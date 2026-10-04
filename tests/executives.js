/**
 * Head posts: reaching a ladder level that is a department/organization
 * head makes you that head; posts above the ladder (including political
 * appointments) are offered when they open; appointees can be replaced by a
 * new administration; executive search lets experienced people (MBA for
 * CEO posts) apply elsewhere.
 *
 *   node tests/executives.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { hire, leaveJob, promotionStatus } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { chainOfCommand, orgOf, personOf } from '../src/modules/org/Organizations.js';
import { postTick, nextPost, executiveEligibility, refreshExecutiveSearch, takePost } from '../src/modules/org/Executives.js';
import { politicalTurnover } from '../src/modules/org/Government.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed, age = 45) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Exec', lastName: 'Utive', gender: 'female' });
  state.character.age = age;
  Object.assign(state.stats, { health: 90, smarts: 85, happiness: 70 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
  return { engine, state, ctx: engine.context() };
}
const at = (ctx, state, pid, levelId, size = 'enterprise') => {
  const e = createEmployer(new Random(7), state, PROFESSIONS[pid], state.character.regionId);
  e.size = size;
  hire(ctx, { professionId: pid, levelId, employer: e });
  state.prompts = [];
  return state.career.job;
};

const tests = {
  'reaching a head-level post makes you the head (no duplicate NPC)'() {
    for (const [pid, lid] of [['tech', 'cto'], ['nursing', 'cno'], ['corporate', 'ceo'], ['education', 'superintendent']]) {
      const { state, ctx } = setup(1);
      const job = at(ctx, state, pid, lid);
      assert.ok(job.headOf, `${pid}.${lid} holds a head post`);
      const org = orgOf(state, job.employer);
      const c = chainOfCommand(state, job);
      assert.ok(c.leads, `${pid}.${lid} leads`);
      assert.ok(!c.deptHead, `${pid}.${lid}: no NPC head above you in your own department`);
      const titles = Object.values(org.people).map((p) => p.title);
      assert.ok(!titles.includes(job.headOf.title), `${pid}.${lid}: no NPC also titled ${job.headOf.title}`);
    }
  },

  'leaving the job hands the post back to an NPC'() {
    const { state, ctx } = setup(2);
    const job = at(ctx, state, 'nursing', 'cno');
    const org = orgOf(state, job.employer);
    const deptId = job.headOf.deptId;
    leaveJob(ctx, 'Retired');
    assert.ok(!org.departments[deptId].playerHead);
    // The next person to look gets an NPC head again.
    const j2 = at(ctx, state, 'nursing', 'rn');
    const c = chainOfCommand(state, j2);
    assert.ok(c.deptHead || c.supervisor, 'someone runs nursing again');
    assert.equal(personOf(org, org.departments[deptId].head)?.title, 'Chief Nursing Officer');
  },

  'politically appointed posts are offered from the top of the ladder; a new administration can replace you'() {
    const { engine, state, ctx } = setup(3);
    const job = at(ctx, state, 'police', 'chief', 'large');
    const post = nextPost(state, job);
    assert.equal(post?.def.title, 'Public Safety Commissioner');
    assert.match(promotionStatus(state).reason, /Public Safety Commissioner.*appointed by the mayor/);
    Object.assign(job, { performance: 95, boss: 90, yearsAtEmployer: 10 });
    let offer = null;
    for (let y = 0; y < 60 && !offer; y++) {
      state.prompts = [];
      postTick(ctx, job);
      offer = state.prompts.find((p) => p.type === 'orgs.postOffer');
    }
    assert.ok(offer, 'offered the commissioner post when it opened');
    const before = job.salary;
    engine.resolvePrompt(offer.id, 'accept');
    assert.equal(job.title, 'Public Safety Commissioner');
    assert.ok(job.salary > before, 'head pay');
    assert.equal(chainOfCommand(state, job).leads, 'dept');
    // Elections: eventually a new administration replaces you; you go back to chief.
    const org = orgOf(state, job.employer);
    org.adminSince = state.character.age;
    for (let y = 0; y < 80 && job.headOf; y++) { state.character.age += 1; politicalTurnover(ctx, job); }
    assert.ok(!job.headOf, 'replaced by a new administration');
    assert.equal(job.levelId, 'chief');
    assert.equal(job.title, PROFESSIONS.police.levels.find((l) => l.id === 'chief').title);
  },

  'a department head can be named head of the organization'() {
    const { engine, state, ctx } = setup(4);
    const job = at(ctx, state, 'nursing', 'cno');
    assert.equal(nextPost(state, job)?.deptId, null, 'next: the organization');
    Object.assign(job, { performance: 95, boss: 90, yearsAtEmployer: 10 });
    let offer = null;
    for (let y = 0; y < 80 && !offer; y++) { state.prompts = []; postTick(ctx, job); offer = state.prompts.find((p) => p.type === 'orgs.postOffer'); }
    assert.ok(offer, 'offered the top job');
    engine.resolvePrompt(offer.id, 'accept');
    assert.equal(chainOfCommand(state, job).leads, 'org');
    assert.equal(job.title, 'Chief Executive Officer');
  },

  'poor results remove a board-chosen head back to the previous role'() {
    const { state, ctx } = setup(5);
    const job = at(ctx, state, 'nursing', 'cno');
    const org = orgOf(state, job.employer);
    takePost(ctx, job, org, null); // named hospital CEO by the board (a post above the ladder)
    assert.equal(job.headOf.mapped, false);
    const prev = job.headOf.prev?.title ?? job.title;
    job.performance = 10;
    for (let i = 0; i < 20 && job.headOf; i++) postTick(ctx, job);
    assert.ok(!job.headOf);
    assert.equal(job.title, prev);
  },

  'executive search: experience and an MBA open CEO posts elsewhere'() {
    const { engine, state, ctx } = setup(6, 48);
    at(ctx, state, 'corporate', 'director', 'large');
    state.career.history.push({ professionId: 'corporate', title: 'Senior Director', levelId: 'seniorDirector', employerName: 'X', sector: 'private', peakGrade: 8, startAge: 26, endAge: 46, reason: 'Left' });
    refreshExecutiveSearch(state);
    const listings = state.career.execSearch.listings;
    assert.ok(listings.length, 'openings listed');
    const ceo = { ...listings[0], deptId: null, occupations: ['corporate'], professionId: 'corporate', levelId: 'ceo' };
    assert.match(executiveEligibility(state, ceo).reason ?? '', /MBA|graduate/, 'CEOs want an MBA (or a record)');
    state.education.degrees.push({ type: 'master', programId: 'mba', major: 'business', year: 30 });
    assert.ok(executiveEligibility(state, ceo).ok, 'eligible with an MBA');
    // Apply until hired somewhere.
    let hired = false;
    for (let y = 0; y < 40 && !hired; y++) {
      state.character.age += 1;
      state.yearly = {};
      refreshExecutiveSearch(state);
      for (const l of [...state.career.execSearch.listings]) {
        engine.dispatch('orgs.applyExec', l.id);
        const offer = state.prompts.find((p) => p.type === 'orgs.execOffer');
        if (offer) { engine.resolvePrompt(offer.id, 'accept'); hired = Boolean(state.career.job?.headOf); break; }
        state.prompts = [];
      }
    }
    assert.ok(hired, 'landed an executive post');
    assert.ok(chainOfCommand(state, state.career.job).leads);
  },

  'no management record, no executive search'() {
    const { state, ctx } = setup(7, 40);
    at(ctx, state, 'retail', 'associate', 'large');
    refreshExecutiveSearch(state);
    for (const l of state.career.execSearch.listings) assert.ok(!executiveEligibility(state, l).ok);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.message.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} executive test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} executive tests passed`);
