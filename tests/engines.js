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
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} engine test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} career-engine tests passed`);
