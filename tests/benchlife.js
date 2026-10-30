/**
 * Life on the bench, and what counts as being in work.
 *
 *   node tests/benchlife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, isEmployed } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { courtsHere, caseTier } from '../src/modules/legal/Judiciary.js';
import { judgeActions, judgeLifeTick, lifeOf } from '../src/modules/legal/JudicialLife.js';
import { workforceGap } from '../src/modules/org/Reentry.js';
import { qualifyingIncome } from '../src/modules/realestate/MortgageSystem.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function judge(seed = 4) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', gender: 'female' });
  state.character.age = 45;
  state.prompts = [];
  state.career.history.push({ title: 'Partner', employerName: 'Firm', startAge: 30, endAge: 45, reason: 'Took the bench', peakGrade: 5 });
  state.judiciary.seat = { court: courtsHere(state)[0], since: 45, termLeft: 40, reputation: 60, approval: 55, rulings: 0, reversals: 0 };
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };

const tests = {
  'a judge, a soldier, an MP are in work: not "unemployed", no CV gap, pay counts for a mortgage'() {
    const { state } = judge();
    assert.ok(isEmployed(state));
    assert.equal(workforceGap(state), 0);
    state.finances.lastYear = { ...(state.finances.lastYear ?? {}), wages: 150000, gross: 150000 };
    assert.equal(qualifyingIncome(state), 150000);
    const legal = VIEWS.legal(state, {});
    clean(legal);
    const career = VIEWS.career(state, {});
    assert.doesNotMatch(career, /You are unemployed/);
    assert.match(career, /Legal tab/);
    const b = judge(5).state;
    b.judiciary.seat = null;
    b.military.service = { branch: 'army', component: 'active', track: 'enlisted', grade: 3 };
    assert.ok(isEmployed(b));
    b.military.service.component = 'reserve';
    assert.ok(!isEmployed(b), 'a reservist with no civilian job is not in full-time work');
  },
  'the bench has a year of things to do, and each works once'() {
    const { engine, state } = judge();
    const acts = judgeActions(state, caseTier(state.judiciary.seat.court));
    assert.ok(acts.length >= 6, acts.map((a) => a.id).join());
    for (const a of acts) engine.dispatch('judiciary.bench', a.id);
    const L = lifeOf(state);
    assert.ok(L.opinions.length === 1 && L.clerks >= 1 && L.taught === 1);
    assert.ok(judgeActions(state, caseTier(state.judiciary.seat.court)).every((a) => a.done));
    clean(VIEWS.legal(state, {}));
    assert.match(VIEWS.legal(state, {}), /Backlog/);
  },
  'the backlog grows, special courts graduate people, and the bench throws up events'() {
    const { engine, state, ctx } = judge();
    const before = lifeOf(state).backlog;
    let events = 0;
    for (let i = 0; i < 12; i++) {
      judgeLifeTick(ctx);
      const p = state.prompts.find((x) => x.type === 'judiciary.life');
      if (p) { events += 1; engine.resolvePrompt(p.id, p.options.at(-1).id); }
      state.prompts = [];
    }
    assert.ok(lifeOf(state).backlog > before);
    assert.ok(events >= 3, `events ${events}`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} bench test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} bench tests passed`);
