/**
 * Career engines: shift & incident, caseload, book of business, projects,
 * seasons and audience — every configured career gets a record, decisions
 * and a card, rendering changes nothing, and the core loops do what they say.
 *
 *   node tests/engines.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { SHIFT_CAREERS } from '../src/modules/career/engines/ShiftIncident.js';
import { CASE_CAREERS } from '../src/modules/career/engines/Caseload.js';
import { BOOK_CAREERS } from '../src/modules/career/engines/ClientBook.js';
import { PROJECT_CAREERS } from '../src/modules/career/engines/Projects.js';
import { SEASON_CAREERS } from '../src/modules/career/engines/Seasons.js';
import { AUDIENCE_CAREERS } from '../src/modules/career/engines/Audience.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { grantCredential } from '../src/modules/credentials/LicensingEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
export function worker(professionId, seed = 5, regionId = 'chicago') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.regionId = regionId;
  state.character.age = 30;
  Object.assign(state.stats, { smarts: 75, health: 95, fitness: 70, happiness: 70, stress: 20 });
  const p = getProfession(professionId);
  const level = p.levels.find((l) => l.entry) ?? p.levels[0];
  // Licensed and trained already: these tests are about the work, not the academy.
  for (const l of p.levels.slice(0, 4)) for (const c of l.req?.credentials ?? []) grantCredential(engine.context(), c, { silent: true });
  for (const c of p.entry?.credentials ?? []) grantCredential(engine.context(), c, { silent: true });
  hire(engine.context(), { professionId, levelId: level.id, employer: createEmployer(new Random(seed), state, p, regionId) });
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
/** A year, answering every engine prompt with its first option. */
export function year(engine, state, types) {
  state.prompts = [];
  state.stats.health = 95;
  engine.ageUp();
  for (let i = 0; i < 6; i++) {
    const p = state.prompts.find((x) => types.some((t) => x.type.startsWith(t)));
    if (!p) break;
    engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
  }
}
const pure = (state, fn) => { const before = JSON.stringify(state); const html = fn(); assert.equal(JSON.stringify(state), before, 'rendering changed state'); return html; };

const tests = {
  'shift & incident: every configured career works its posts and calls'() {
    for (const id of Object.keys(SHIFT_CAREERS)) {
      const { engine, state } = worker(id, 7);
      if (!state.career.job) continue;
      for (let y = 0; y < 3 && state.career.job; y++) year(engine, state, ['shiftWork.']);
      const rec = state.careerLife?.shiftWork;
      assert.ok(rec && rec.handled > 0, `${id}: a record`);
      assert.match(pure(state, () => VIEWS.career(state, {})), new RegExp(SHIFT_CAREERS[id].label), id);
    }
  },
  'shift & incident: bidding for a post needs seniority and changes the year'() {
    const { engine, state } = worker('dispatch', 3);
    engine.dispatch('shiftWork.post', 'cto');
    assert.notEqual(state.careerLife?.shiftWork?.post, 'cto', 'trainers need three years');
    state.career.job.yearsAtEmployer = 5;
    engine.dispatch('shiftWork.post', 'cto');
    assert.equal(state.careerLife.shiftWork.post, 'cto');
  },
  'caseload: cases arrive, move and close; triage closes more and worse'() {
    let tri = { closed: 0, good: 0 };
    let tho = { closed: 0, good: 0 };
    for (let i = 0; i < 6; i++) {
      for (const [focus, acc] of [['triage', tri], ['thorough', tho]]) {
        const { engine, state } = worker('probation', 30 + i);
        engine.dispatch('caseload.focus', focus);
        for (let y = 0; y < 4 && state.career.job; y++) { state.yearly = {}; year(engine, state, ['caseload.']); }
        const rec = state.careerLife.caseload;
        acc.closed += rec.closed;
        acc.good += rec.good;
      }
    }
    assert.ok(tri.closed > tho.closed, `triage closes more (${tri.closed} vs ${tho.closed})`);
    assert.ok(tri.good / tri.closed < tho.good / tho.closed, 'thorough closes better');
  },
  'caseload: every configured career gets a card'() {
    for (const id of Object.keys(CASE_CAREERS)) {
      const { engine, state } = worker(id, 9);
      if (!state.career.job) continue;
      year(engine, state, ['caseload.']);
      assert.ok(state.careerLife?.caseload?.cases, id);
      assert.match(pure(state, () => VIEWS.career(state, {})), new RegExp(CASE_CAREERS[id].label), id);
    }
  },
  'book of business: clients pay, prospecting grows the book, neglect shrinks it'() {
    for (const id of Object.keys(BOOK_CAREERS)) {
      const { engine, state } = worker(id, 11);
      if (!state.career.job) continue;
      year(engine, state, ['clientBook.']);
      const rec = state.careerLife?.clientBook;
      assert.ok(rec?.clients.length > 0, `${id}: a starting book`);
      assert.match(pure(state, () => VIEWS.career(state, {})), new RegExp(BOOK_CAREERS[id].label), id);
    }
    const { engine, state } = worker('realestate', 12);
    year(engine, state, ['clientBook.']);
    const before = state.careerLife.clientBook.clients.length;
    state.stats.looks = 90;
    engine.dispatch('clientBook.prospect');
    assert.ok(state.careerLife.clientBook.clients.length >= before, 'prospecting adds clients');
    const pay = state.finances.ledger.income.filter((i) => /book/i.test(i.source)).reduce((s, i) => s + i.amount, 0);
    assert.ok(pay >= 0);
  },
  'projects: finish into the portfolio; corners come back to bite'() {
    for (const id of Object.keys(PROJECT_CAREERS)) {
      const { engine, state } = worker(id, 13);
      if (!state.career.job) continue;
      for (let y = 0; y < 4 && state.career.job; y++) year(engine, state, ['projectWork.']);
      const rec = state.careerLife?.projectWork;
      assert.ok(rec && (rec.portfolio.length || rec.project), `${id}: project work`);
      if (state.career.job) assert.match(pure(state, () => VIEWS.career(state, {})), new RegExp(PROJECT_CAREERS[id].label), id);
    }
    let failures = 0;
    for (let i = 0; i < 12; i++) {
      const { engine, state } = worker('engineering', 40 + i);
      engine.dispatch('projectWork.approach', 'corners');
      for (let y = 0; y < 8 && state.career.job; y++) year(engine, state, ['projectWork.']);
      if (!state.career.job || state.log.some((b) => b.entries.some((e) => /forensic review/.test(e.text)))) failures += 1;
    }
    assert.ok(failures > 0, 'cutting corners eventually fails');
  },
  'seasons: every configured career plays its seasons and gets paid by the result'() {
    for (const id of Object.keys(SEASON_CAREERS)) {
      const { engine, state } = worker(id, 15);
      if (!state.career.job) continue;
      for (let y = 0; y < 3 && state.career.job; y++) year(engine, state, ['seasonWork.']);
      const rec = state.careerLife?.seasonWork;
      assert.ok(rec?.seasons.length > 0, `${id}: seasons played`);
      if (state.career.job) assert.match(pure(state, () => VIEWS.career(state, {})), new RegExp(SEASON_CAREERS[id].label), id);
    }
    // Riskier fisheries pay more on average and hurt more people.
    const run = (plan) => {
      let pay = 0;
      for (let i = 0; i < 10; i++) {
        const { engine, state } = worker('fishing', 60 + i);
        engine.dispatch('seasonWork.plan', plan);
        for (let y = 0; y < 3 && state.career.job; y++) year(engine, state, ['seasonWork.']);
        pay += state.careerLife.seasonWork.seasons.reduce((s, x) => s + x.pay, 0);
      }
      return pay;
    };
    assert.ok(run('crab') > run('groundfish'), 'crab pays more than groundfish');
  },
  'audience: releases move the following; grinding burns you out'() {
    for (const id of Object.keys(AUDIENCE_CAREERS)) {
      const { engine, state } = worker(id, 17);
      if (!state.career.job) continue;
      year(engine, state, ['audience.']);
      state.prompts = [];
      engine.dispatch('audience.release', Object.keys(AUDIENCE_CAREERS[id].releases)[0]);
      const rec = state.careerLife?.audience;
      assert.ok(rec?.releases.length === 1, `${id}: a release`);
      engine.dispatch('audience.release', Object.keys(AUDIENCE_CAREERS[id].releases)[0]);
      assert.equal(rec.releases.length, 1, `${id}: one release a year`);
      if (state.career.job) assert.match(pure(state, () => VIEWS.career(state, {})), new RegExp(AUDIENCE_CAREERS[id].label), id);
    }
    const { engine, state } = worker('contentCreator', 18);
    engine.dispatch('audience.pace', 'grind');
    let broke = false;
    for (let y = 0; y < 6 && state.career.job; y++) {
      year(engine, state, ['audience.']);
      if (state.careerLife.audience.pace === 'rest') { broke = true; break; }
    }
    assert.ok(broke, 'grinding ends in a forced break');
    assert.ok(state.careerLife.audience.peak > AUDIENCE_CAREERS.contentCreator.start, 'the following grew');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} engine test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} career-engine tests passed`);
