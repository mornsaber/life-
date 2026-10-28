/**
 * Military retirement: retired pay, the retired list (no re-enlisting as a recruit), recall to
 * active duty, and retiring again with recomputed pay.
 *
 *   node tests/milretire.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { enlist, enlistmentEligibility } from '../src/modules/military/MilitaryEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function retiree(countryId = 'US', seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.legal.record = [];
  state.character.age = 20;
  state.prompts = [];
  const ctx = engine.context();
  enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry' });
  Object.assign(state.military.service, { yearsOfService: 22, grade: 6, isNew: false });
  state.character.age = 42;
  state.prompts = [];
  engine.dispatch('military.retire');
  state.prompts = [];
  return { engine, state, ctx };
}
const always = (engine, fn) => { const c = engine.rng.chance; engine.rng.chance = () => true; try { fn(); } finally { engine.rng.chance = c; } };
const strip = (h) => h.replace(/<[^>]+>/g, ' ');

const tests = {
  'a retiree draws retired pay and is on the retired list, not the recruiting office'() {
    const { state } = retiree();
    assert.equal(state.military.history.at(-1).discharge, 'retired');
    assert.equal(state.retirement.pensions.filter((p) => p.id === 'military').length, 1);
    assert.match(enlistmentEligibility(state, 'army', 'enlisted', 'active').reason, /Retired/);
    const html = strip(VIEWS.military(state, {}));
    assert.match(html, /Retired List/);
    assert.doesNotMatch(html, /Recruiting Office/);
  },
  'recall stops retired pay; retiring again recomputes it (one pension, paid again)'() {
    const { engine, state } = retiree('US', 6);
    const before = state.retirement.pensions.find((p) => p.id === 'military').annual;
    always(engine, () => engine.dispatch('military.recall'));
    const svc = state.military.service;
    assert.ok(svc?.recalled, 'recalled');
    assert.equal(svc.grade, 6);
    assert.equal(svc.yearsOfService, 22);
    assert.ok(state.retirement.pensions.find((p) => p.id === 'military').suspended);
    svc.yearsOfService = 24;
    engine.dispatch('military.retire');
    const pens = state.retirement.pensions.filter((p) => p.id === 'military');
    assert.equal(pens.length, 1);
    assert.ok(!pens[0].suspended);
    assert.ok(pens[0].annual >= before, 'recomputed with the extra years');
  },
  'abroad: a British retiree is on the retired list too'() {
    const { state } = retiree('GB', 7);
    assert.match(strip(VIEWS.military(state, {})), /Retired List/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} military retirement test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} military retirement tests passed`);
