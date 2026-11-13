/**
 * Licences with work: the Licenses & Certs tab sits beside Career; one "Your Career" card
 * (required now, to move up, valued, and credentials that would open new jobs); a job locked
 * by one licence links to it. Business units and posts are named automatically.
 *
 *   node tests/certsunits.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS, SECTIONS } from '../src/ui/Renderer.js';
import { doorOpeners } from '../src/ui/views/JobLicensesView.js';
import { autoUnitName, postTitles } from '../src/modules/business/OrgDesign.js';
import { businessOrg } from '../src/modules/org/Businesses.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const adult = (age = 25) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(2), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  for (let i = 0; i < age; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  return { engine, state };
};

const tests = {
  'Licenses & Certs sits with work, not school'() {
    assert.ok(SECTIONS.find((s) => s.id === 'work').tabs.some((t) => t.id === 'licenses'));
    assert.ok(!SECTIONS.find((s) => s.id === 'learn').tabs.some((t) => t.id === 'licenses'));
  },
  'credentials that would open jobs, each with the jobs it opens'() {
    const { state } = adult();
    const doors = doorOpeners(state);
    assert.ok(doors.length >= 1, 'some licence opens a door');
    for (const [, jobs] of doors) assert.ok(jobs.length >= 1);
    assert.match(VIEWS.licenses(state, {}), /Would open new jobs/);
  },
  'a job locked by one licence links straight to it, and the tab shows it first'() {
    const { engine, state } = adult();
    if (state.career.job) engine.dispatch('career.quit');
    const board = VIEWS.career(state, { jobField: 'all', jobLimit: 400 });
    const m = board.match(/data-action="ui\.go" data-arg="licenses\|licFocus=([^"]+)"/);
    assert.ok(m, 'a Get it link');
    assert.match(VIEWS.licenses(state, { licFocus: m[1] }), /You were looking at/);
  },
  'a new unit and a new post are named for you'() {
    const { engine, state } = adult(30);
    state.finances.cash = 2e6;
    engine.dispatch('business.start', 'consulting:cash:llc:standard:Acme');
    const biz = state.business.current;
    biz.staff.headcount = 12;
    const org = businessOrg(state, biz);
    assert.ok(org, 'an organisation');
    const name = autoUnitName(org, 'sales');
    assert.ok(name && !/undefined/.test(name), name);
    const before = Object.keys(org.departments).length;
    engine.dispatch('business.createUnit', ':');
    const unit = Object.values(org.departments).find((d) => d.custom);
    assert.ok(Object.keys(org.departments).length === before + 1 && unit?.name, 'created, with a name');
    const titles = postTitles(org, unit.id);
    assert.ok(titles[0].includes(unit.name));
    engine.dispatch('business.createPost', `${unit.id}:`);
    assert.ok(Object.values(org.people).some((p) => p.post && p.title === titles[0]));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
