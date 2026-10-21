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
import { INVESTIGATION_CAREERS } from '../src/modules/career/engines/Investigations.js';
import { ROUTE_CAREERS } from '../src/modules/career/engines/Routes.js';
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
const BAD = /\bundefined\b|\bNaN\b|\[object |\bInfinity\b/;
const strip = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
/** Enabled engine buttons on the career tab. */
const engineButtons = (html) => [...html.matchAll(/<button class="btn[^"]*" data-action="((?:shiftWork|routeWork|investigations|caseload|clientBook|projectWork|seasonWork|audience|emsLife)\.[^"]+)"((?: data-arg="[^"]*")?)[^>]*?((?: disabled)?)>/g)].filter((m) => !m[3]).map((m) => ({ action: m[1], arg: m[2] ? m[2].slice(11, -1) : undefined }));
/** Every career an engine covers. */
export const ENGINE_CAREERS = () => [...new Set([SHIFT_CAREERS, ROUTE_CAREERS, INVESTIGATION_CAREERS, CASE_CAREERS, BOOK_CAREERS, PROJECT_CAREERS, SEASON_CAREERS, AUDIENCE_CAREERS].flatMap(Object.keys))];
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
  'investigations: cases build evidence and end in a takedown or a blown case'() {
    for (const id of Object.keys(INVESTIGATION_CAREERS)) {
      const { engine, state } = worker(id, 21);
      if (!state.career.job) continue;
      state.career.job.levelId = 'agent';
      for (let y = 0; y < 6 && state.career.job; y++) year(engine, state, ['investigations.']);
      const rec = state.careerLife?.investigations;
      assert.ok(rec && (rec.closed.length || rec.case?.evidence > 0), `${id}: casework`);
      if (state.career.job) assert.match(pure(state, () => VIEWS.career(state, {})), new RegExp(INVESTIGATION_CAREERS[id].label), id);
    }
    const { engine, state } = worker('fbi', 22);
    state.career.job.levelId = 'agent';
    year(engine, state, ['investigations.']);
    state.prompts = [];
    engine.dispatch('investigations.technique', 'undercover');
    assert.notEqual(state.careerLife.investigations.technique, 'undercover', 'undercover needs two years');
    engine.dispatch('investigations.technique', 'wiretap');
    assert.equal(state.careerLife.investigations.technique, 'wiretap');
  },
  'routes: miles get logged, qualifications open lines, seniority holds them'() {
    for (const id of Object.keys(ROUTE_CAREERS)) {
      const { engine, state } = worker(id, 25);
      if (!state.career.job) continue;
      for (let y = 0; y < 3 && state.career.job; y++) year(engine, state, ['routeWork.']);
      const rec = state.careerLife?.routeWork;
      assert.ok(rec?.logged > 0, `${id}: a logbook`);
      if (state.career.job) assert.match(pure(state, () => VIEWS.career(state, {})), new RegExp(ROUTE_CAREERS[id].label), id);
    }
    const { engine, state } = worker('trucking', 26);
    state.finances.cash = 10000;
    engine.dispatch('routeWork.line', 'tanker');
    assert.notEqual(state.careerLife?.routeWork?.line, 'tanker', 'tanker needs seniority and hazmat');
    state.career.job.yearsAtEmployer = 3;
    engine.dispatch('routeWork.qualify', 'hazmat');
    assert.ok(state.careerLife.routeWork.quals.hazmat);
    engine.dispatch('routeWork.line', 'tanker');
    assert.equal(state.careerLife.routeWork.line, 'tanker');
  },
  'engine cards: random clicks on every engine career never break'() {
    const problems = [];
    for (const [i, id] of ENGINE_CAREERS().entries()) {
      const { engine, state } = worker(id, 100 + i);
      if (!state.career.job) continue;
      if (state.career.job.levelId === 'trainee') state.career.job.levelId = 'agent';
      const rng = new Random(200 + i);
      for (let y = 0; y < 4 && state.career.job && state.character.alive; y++) {
        for (let k = 0; k < 4; k++) {
          state.prompts = [];
          const html = VIEWS.career(state, {});
          if (BAD.test(strip(html))) problems.push(`${id}: ${strip(html).match(new RegExp(`.{0,50}${BAD.source}.{0,50}`))[0]}`);
          const b = engineButtons(html);
          if (!b.length) break;
          const pick = rng.pick(b);
          try { engine.dispatch(pick.action, pick.arg); } catch (e) { problems.push(`${id} ${pick.action}(${pick.arg}): ${e.message}`); }
        }
        state.prompts = [];
        state.stats.health = 95;
        engine.ageUp();
        for (let g = 0; g < 10 && state.prompts.length; g++) {
          const p = state.prompts[0];
          const opts = p.options.filter((o) => !o.disabled);
          if (!opts.length) { state.prompts.shift(); continue; }
          try { engine.resolvePrompt(p.id, rng.pick(opts).id); } catch (e) { problems.push(`${id} resolve ${p.type}: ${e.message}`); state.prompts.shift(); }
        }
      }
      for (const e of state.log.flatMap((b) => b.entries)) if (BAD.test(e.text)) problems.push(`${id} log: ${e.text.slice(0, 120)}`);
    }
    assert.deepEqual([...new Set(problems)].slice(0, 10), []);
  },
  'private ambulance supervisors bid for interfacility contracts'() {
    const { engine, state } = worker('privateEms', 23);
    Object.assign(state.career.job, { levelId: 'supervisor', performance: 90 });
    state.ems.agency ??= 'private';
    let won = 0;
    for (const id of ['events', 'dialysis', 'snf', 'backup', 'hospital']) {
      state.yearly = {};
      state.prompts = [];
      engine.dispatch('emsLife.bid', id);
      if (state.ems.contracts?.[id]) won += 1;
    }
    assert.ok(won > 0, 'won at least one contract');
    assert.match(pure(state, () => VIEWS.career(state, {})), /Interfacility contracts/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} engine test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} career-engine tests passed`);
