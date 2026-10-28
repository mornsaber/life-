/**
 * War roles: the leader, legislators, generals and soldiers move a war; veterans are asked
 * back; waivers and stop-loss soften mandatory retirement; five stars only where they exist;
 * contracts abroad.
 *
 *   node tests/warroles.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { enlist, discharge } from '../src/modules/military/MilitaryEngine.js';
import { mustRetire, stopLoss } from '../src/modules/military/Separation.js';
import { warRoles } from '../src/modules/military/WarRoles.js';
import { FIVE_STAR_NATIONS } from '../src/modules/military/Wartime.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId, gender: 'male' });
  state.character.age = 30;
  state.prompts = [];
  state.legal.record = [];
  return { engine, state, ctx: engine.context() };
}
const war = (state, cc = 'US', extra = {}) => { state.world.wars ??= {}; state.world.wars[cc] = { id: 'w1', country: cc, name: 'a test war', operation: 'Operation Test', kind: 'interstate', intensity: 3, front: 0, support: 60, casualties: 0, years: 2, phase: 'active', homeFront: 0, draft: false, mobilized: false, startAge: 28, ...extra }; return state.world.wars[cc]; };

const tests = {
  'a head of government moves the war: a surge, talks, a speech'() {
    const { engine, state } = life();
    const w = war(state);
    state.politics.office = { id: 'president', approval: 60, termYearsLeft: 3, terms: 1, startAge: 50 };
    assert.ok(warRoles(state).leader);
    engine.dispatch('warRoles.lead', 'surge');
    assert.notEqual(w.front, 0);
    engine.dispatch('warRoles.lead', 'address');
    assert.match(VIEWS.community(state, {}), /Your Part in the War/);
  },
  'a general\'s campaign and a soldier at the front move the front'() {
    const { engine, state, ctx } = life('US', 7);
    const w = war(state);
    enlist(ctx, { branch: 'army', track: 'officer', component: 'active', specialty: 'infantry' });
    state.military.service.grade = 7;
    assert.ok(warRoles(state).general);
    engine.dispatch('warRoles.campaign', 'offensive');
    assert.ok(state.yearly['warRoles.campaign']);
    state.military.service.grade = 2;
    const before = w.playerFights ?? 0;
    engine.dispatch('warRoles.front');
    assert.ok(!state.character.alive || (w.playerFights ?? 0) > before);
  },
  'a major war suspends mandatory retirement (stop-loss); a waiver extends it'() {
    const { state, ctx } = life('US', 9);
    enlist(ctx, { branch: 'army', track: 'officer', component: 'active', specialty: 'infantry' });
    const svc = state.military.service;
    Object.assign(svc, { grade: 6, yearsOfService: 34, yearsInGrade: 6, eval: 80 });
    state.character.age = 64;
    assert.ok(mustRetire(state, svc), 'at the limit in peace');
    war(state);
    assert.ok(stopLoss(state, svc));
    assert.ok(!mustRetire(state, svc), 'stop-loss');
    delete state.world.wars.US;
    svc.continuedUntil = 66;
    assert.ok(!mustRetire(state, svc), 'waiver');
  },
  'five stars only in forces that have them'() {
    assert.ok(FIVE_STAR_NATIONS.includes('US') && FIVE_STAR_NATIONS.includes('GB'));
    assert.ok(!FIVE_STAR_NATIONS.includes('DE') && !FIVE_STAR_NATIONS.includes('JP'));
  },
  'veterans are asked back when the country goes to war; retirees draw benefits'() {
    let asked = false;
    for (let seed = 1; seed <= 10 && !asked; seed++) {
      const { engine, state, ctx } = life('US', seed);
      enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry' });
      state.military.service.grade = 4;
      state.military.service.yearsOfService = 6;
      discharge(ctx, 'honorable', 'test');
      state.prompts = [];
      war(state);
      engine.ageUp();
      const p = state.prompts.find((x) => x.type === 'warRoles.callBack');
      if (p) {
        asked = true;
        engine.resolvePrompt(p.id, 'serve');
        assert.ok(state.military.service, 'back in uniform');
        assert.equal(state.military.service.grade, 4);
      }
    }
    assert.ok(asked);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} war-role test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} war-role tests passed`);
