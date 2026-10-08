/**
 * Service-tab additions: volunteer roles and the President's Volunteer
 * Service Award, new disaster teams (US&R, Team Rubicon, ARES), and
 * Selective Service registration.
 *
 *   node tests/civic.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VolunteerModule, roleEligibility, sssBarred } from '../src/modules/service/Volunteering.js';
import { teamEligibility } from '../src/modules/service/DisasterTeams.js';
import { applicationEligibility } from '../src/modules/career/CareerEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed, gender = 'female', age = 30) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Civic', lastName: 'Duty', gender });
  state.character.age = age;
  Object.assign(state.stats, { health: 90, smarts: 70, happiness: 60 });
  state.legal.record = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'economics', schoolId: 'state', gpa: 3.3, year: 22 });
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const tick = (ctx, state) => { state.character.age += 1; state.yearly = {}; VolunteerModule.onAgeUp(ctx); };

const tests = {
  'volunteer roles: limits, hours, awards, and the tab renders'() {
    const { engine, state, ctx } = life(1);
    for (const id of ['casa', 'crisisLine', 'habitat']) engine.dispatch('volunteering.join', id);
    assert.equal(Object.keys(state.service.roles).length, 3);
    assert.match(roleEligibility(state, 'coach').reason, /No time/);
    for (let i = 0; i < 3; i++) {
      tick(ctx, state);
      const p = state.prompts.find((x) => x.type === 'volunteering.moment');
      if (p) engine.resolvePrompt(p.id, p.options[0].id);
      state.prompts = [];
    }
    assert.ok(state.service.volunteerHours >= 600, `hours ${state.service.volunteerHours}`);
    assert.ok(state.honors.some((h) => h.id.startsWith('pvsa.')), 'a PVSA');
    engine.dispatch('volunteering.leave', 'habitat');
    assert.ok(!state.service.roles.habitat);
    const html = VIEWS.civic(state, {});
    assert.match(html, /Volunteer Roles/);
    assert.ok(!/NaN|undefined/.test(html));
  },

  'background checks and poll workers in election years'() {
    const { engine, state, ctx } = life(2);
    state.legal.record = [{ offenseId: 'burglary', severity: 'felony', age: 22, sealed: false }];
    if (roleEligibility(state, 'casa').ok) state.legal.record[0].convicted = true;
    engine.dispatch('volunteering.join', 'pollWorker');
    const cash = state.finances.cash;
    tick(ctx, state);
    tick(ctx, state);
    assert.ok(state.finances.cash > cash, 'paid in one of two years');
  },

  'new disaster teams need the right background'() {
    const { state } = life(3);
    assert.match(teamEligibility(state, 'usar').reason, /Firefighter|paramedic|PE/);
    assert.match(teamEligibility(state, 'ares').reason, /amateur radio/);
    assert.ok(teamEligibility(state, 'teamRubicon').ok);
    state.credentials.held.hamTech = { earnedAge: 20, status: 'active' };
    assert.ok(teamEligibility(state, 'ares').ok);
  },

  'Selective Service: automatic with a license; missing it bars federal jobs until waived'() {
    const a = life(4, 'male', 17);
    a.state.credentials.held.driverLicense = { earnedAge: 16, status: 'active' };
    tick(a.ctx, a.state);
    assert.ok(a.state.military.sss.registered, 'registered with the license');
    const b = life(5, 'male', 17);
    for (let i = 0; i < 10; i++) tick(b.ctx, b.state);
    assert.ok(b.state.military.sss.missed, 'missed by 26');
    assert.ok(sssBarred(b.state));
    assert.match(applicationEligibility(b.state, 'regulatory').reason, /Selective Service/);
    assert.match(VIEWS.military(b.state, {}), /status information letter/);
    for (let i = 0; i < 20 && !b.state.military.sss.waived; i++) { b.state.yearly = {}; b.engine.dispatch('volunteering.sssLetter'); }
    assert.ok(!sssBarred(b.state), 'waived');
    const c = life(6, 'female', 17);
    for (let i = 0; i < 10; i++) tick(c.ctx, c.state);
    assert.ok(!c.state.military.sss.missed, 'women aren\'t required');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} civic test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} civic tests passed`);
