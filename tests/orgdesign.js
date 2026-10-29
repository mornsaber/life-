/**
 * Designing a business's organisation: units of your own, renamed posts and new named posts,
 * and the People tab that gathers it all.
 *
 *   node tests/orgdesign.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { currentBusiness } from '../src/modules/business/Business.js';
import { businessOrg } from '../src/modules/org/Businesses.js';
import { customUnits, businessChart, unitOccupations } from '../src/modules/business/OrgDesign.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function owner() {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 35;
  state.finances.cash = 2_000_000;
  engine.dispatch('business.start', 'retail:cash:llc');
  const biz = currentBusiness(state);
  for (let i = 0; i < 12; i++) engine.dispatch('business.hire', '1');
  for (let i = 0; i < 2; i++) { state.prompts = []; state.yearly = {}; engine.ageUp(); }
  state.prompts = [];
  state.yearly = {};
  return { engine, state, biz: currentBusiness(state) ?? biz };
}
const flat = (n) => [n, ...(n.children ?? []).flatMap(flat)];

const tests = {
  'create a unit, staff it, rename it, close it'() {
    const { engine, state, biz } = owner();
    assert.ok(biz.staff.headcount >= 5, `staff ${biz.staff.headcount}`);
    const occ = unitOccupations(state, biz)[0];
    engine.dispatch('business.createUnit', `Online Sales:${occ}`);
    const org = businessOrg(state, biz);
    const unit = customUnits(org)[0];
    assert.ok(unit && unit.name === 'Online Sales');
    engine.dispatch('business.assignStaff', `${unit.id}:3`);
    assert.equal(org.departments[unit.id].headcount, 3);
    engine.dispatch('business.renameUnit', `${unit.id}:E-commerce`);
    assert.equal(org.departments[unit.id].name, 'E-commerce');
    state.yearly = {};
    state.prompts = []; engine.ageUp(); state.prompts = [];
    assert.equal(org.departments[unit.id].headcount, 3, 'staff stay in the unit across a year');
    state.yearly = {};
    engine.dispatch('business.closeUnit', unit.id);
    assert.ok(!org.departments[unit.id]);
  },
  'rename a post and create (and abolish) a named post'() {
    const { engine, state, biz } = owner();
    const org = businessOrg(state, biz);
    const main = Object.values(org.departments).find((d) => !d.branch);
    const someone = Object.values(org.people).find((p) => p.deptId === main.id && p.levelId);
    engine.dispatch('business.retitle', `${main.id}:${someone.levelId}:Style Advisor`);
    assert.equal(org.people[someone.id].title, 'Style Advisor');
    state.prompts = []; state.yearly = {}; engine.ageUp(); state.prompts = [];
    assert.ok(Object.values(org.people).filter((p) => p.levelId === someone.levelId && p.deptId === main.id).every((p) => p.title === 'Style Advisor'), 'the title sticks');
    const before = biz.staff.headcount;
    engine.dispatch('business.createPost', `${main.id}:Head of Marketing`);
    const post = Object.values(org.people).find((p) => p.post);
    assert.ok(post && post.title === 'Head of Marketing');
    assert.equal(biz.staff.headcount, before + 1);
    assert.ok(flat(businessChart(state, biz)).some((n) => /Head of Marketing/.test(n.title)));
    engine.dispatch('business.removePost', post.id);
    assert.ok(!org.people[post.id]);
  },
  'the People tab holds the chart, the designer and staffing'() {
    const { state } = owner();
    const html = VIEWS.business(state, { bizTab: 'people' });
    for (const s of ['Your Organisation', 'Policies', 'org-chart']) assert.ok(html.includes(s), s);
    assert.ok(!/NaN|undefined/.test(html.replace(/<[^>]+>/g, ' ')));
    const ops = VIEWS.business(state, { bizTab: 'operations' });
    assert.ok(!ops.includes('Your Organisation'), 'operations no longer carries the org');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 3).join('\n    ')}`); }
}
if (failed) { console.log(`✘ ${failed} org design test(s) failed`); process.exit(1); }
console.log(`✔ All ${Object.keys(tests).length} org design tests passed`);
