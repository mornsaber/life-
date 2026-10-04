/**
 * Service beyond a job: volunteer organizations (seats, elections, chief
 * powers), national service, state forces, disaster teams, veterans' posts,
 * cadets and private military contractors.
 *
 *   node tests/service.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { SERVICES, nextRankStatus } from '../src/modules/emergency/EmergencyEngine.js';
import { ensureVolunteerOrg, resolveElection, leadsOrg, PLAYER } from '../src/modules/org/VolunteerOrgs.js';
import { serviceHiringBonus } from '../src/modules/service/NationalService.js';
import { stateEmergency, ensureSdfOrg, sdfNextRank, SDF_SLOTS } from '../src/modules/service/StateForces.js';
import { deploymentRequest } from '../src/modules/service/DisasterTeams.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { enlistedStartGrade, MOS } from '../src/modules/military/MOS.js';
import { CONTRACTOR_PROFESSIONS } from '../src/modules/career/Contractors.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed = 7, age = 25) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Svc', lastName: 'Test' });
  state.character.age = age;
  Object.assign(state.stats, { smarts: 70, fitness: 70, health: 90, happiness: 70, stress: 20 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 });
  return { engine, state, ctx: engine.context() };
}
const answer = (engine, type, option) => {
  const p = engine.state.prompts.find((x) => x.type === type);
  assert.ok(p, `prompt ${type}`);
  engine.resolvePrompt(p.id, option);
};

const tests = {
  'volunteer fire company: a roster, officer seats, and an elected chief with real powers'() {
    const { engine, state, ctx } = setup(1);
    engine.dispatch('emergency.join', 'fire');
    const member = state.emergency.fire;
    const org = state.orgs.byId[member.orgId];
    assert.ok(org?.volunteer, 'an organization behind the membership');
    assert.ok(Object.keys(org.people).length >= 12, 'a roster');
    assert.equal(org.seats[6].length, 1, 'one chief');
    // Officer ranks need an open seat.
    member.rankIndex = 3;
    member.xp = 5000;
    member.years = 12;
    for (const id of ['ff1', 'ff2', 'driverOperator', 'fireOfficer1', 'fireOfficer2']) state.credentials.held[id] = { status: 'active', earnedAge: 20 };
    org.seats[4] = org.seats[4].map(() => 'npcX');
    org.people.npcX = { id: 'npcX', name: 'X', rankIndex: 4, years: 5, rel: 50, performance: 60, discipline: 0, age: 40 };
    assert.match(nextRankStatus(state, 'fire', member).reason, /open seat/);
    org.seats[4][0] = null;
    assert.equal(nextRankStatus(state, 'fire', member).ready, true);
    // The chief is elected.
    member.rankIndex = 5;
    assert.equal(nextRankStatus(state, 'fire', member).elected, true);
    let won = false;
    for (let i = 0; i < 20 && !won; i++) won = resolveElection(ctx, SERVICES.fire, member, 6, true);
    assert.ok(won, 'eventually elected');
    assert.ok(leadsOrg(org, 'fire'));
    assert.equal(member.rankIndex, 6);
    const funds = org.funds;
    state.yearly = {};
    engine.dispatch('emergency.fundraise', 'fire');
    assert.ok(org.funds > funds, 'fundraisers raise money');
    const n = Object.keys(org.people).length;
    engine.dispatch('emergency.recruit', 'fire');
    assert.ok(Object.keys(org.people).length > n, 'recruiting adds members');
    // Leaving frees the seat.
    engine.dispatch('emergency.resign', 'fire');
    assert.ok(!org.seats[6].includes(PLAYER));
  },

  'AmeriCorps: a stipend, loans in forbearance, an education award and a hiring edge'() {
    const { engine, state } = setup(2, 22);
    state.finances.loans = 20000;
    engine.dispatch('service.joinProgram', 'americorps:vista');
    assert.ok(state.service.program, 'serving');
    engine.ageUp();
    for (let i = 0; i < 10 && state.prompts.length; i++) engine.resolvePrompt(state.prompts[0].id, state.prompts[0].options.find((o) => o.tone !== 'danger').id);
    assert.equal(state.service.program, null, 'term complete');
    assert.ok(state.service.alumni[0].completed);
    assert.ok(state.finances.loans < 20000, 'the Segal award paid down loans');
    assert.ok(state.service.nceUntil >= state.character.age, 'noncompetitive eligibility');
    assert.ok(serviceHiringBonus(state, getProfession('fbi')) > 0, 'federal hiring edge');
    assert.equal(serviceHiringBonus(state, getProfession('retail')), 0);
  },

  'Peace Corps: needs a degree; returned volunteers have a Foreign Service edge'() {
    const { engine, state } = setup(3, 23);
    engine.dispatch('service.joinProgram', 'peaceCorps:education');
    assert.equal(state.service.program, null, 'no degree, no experience');
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
    engine.dispatch('service.joinProgram', 'peaceCorps:education');
    assert.ok(state.service.program);
    state.service.program.years = 1;
    engine.ageUp();
    for (let i = 0; i < 10 && state.prompts.length; i++) engine.resolvePrompt(state.prompts[0].id, state.prompts[0].options.find((o) => o.tone !== 'danger').id);
    if (state.service.alumni[0]?.completed) assert.ok(serviceHiringBonus(state, getProfession('foreignService')) >= 0.1);
  },

  'state forces: the governor decides; Guard members are activated; State Guards volunteer'() {
    const { engine, state, ctx } = setup(4, 30);
    // A governor gets the call.
    state.politics.office = { id: 'governor', approval: 50, termYearsLeft: 3, since: 28 };
    stateEmergency(ctx, 'unrest', { name: 'downtown', severity: 1 });
    const p = state.prompts.find((x) => x.type === 'service.governorActivation');
    assert.ok(p, 'the governor decides');
    engine.resolvePrompt(p.id, 'none');
    state.politics.office = null;
    // Guard member gets activated for a border mission (governors usually say yes).
    engine.dispatch('military.enlist', 'guard:enlisted:reserve');
    answer(engine, 'military.chooseSpecialty', 'guard.12B');
    state.military.service.isNew = false;
    let mission = null;
    for (let i = 0; i < 20 && !mission; i++) { state.prompts = []; stateEmergency(ctx, 'border', { name: 'the border', severity: 1 }); mission = state.prompts.find((x) => x.type === 'service.guardMission'); }
    assert.ok(mission);
    const cash = state.finances.cash;
    engine.resolvePrompt(mission.id, 'observe');
    assert.ok(state.finances.cash > cash, 'state active duty pay');
  },

  'disaster teams: DMAT needs a clinical credential; deployments pay and promote'() {
    const { engine, state, ctx } = setup(5, 30);
    engine.dispatch('service.joinTeam', 'dmat');
    assert.equal(state.service.teams.dmat, null, 'no clinical credential');
    engine.dispatch('service.joinTeam', 'fema');
    assert.ok(state.service.teams.fema);
    for (let i = 0; i < 4; i++) {
      state.prompts = [];
      deploymentRequest(ctx, 'fema', 'a hurricane');
      const cash = state.finances.cash;
      answer(engine, 'service.teamDeploy', 'go');
      assert.ok(state.finances.cash > cash);
    }
    assert.equal(state.service.teams.fema.deployments, 4);
    for (let i = 0; i < 3; i++) { state.prompts = []; deploymentRequest(ctx, 'fema', 'a flood'); answer(engine, 'service.teamDeploy', 'decline'); }
    assert.equal(state.service.teams.fema, null, 'dropped after three declines');
  },

  'veterans posts: VFW needs a deployment; members climb elected chairs to post commander'() {
    const { engine, state } = setup(6, 40);
    engine.dispatch('service.joinPost', 'legion');
    assert.equal(state.service.posts.legion, null, 'veterans only');
    state.military.history.push({ branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry', rankCode: 'E-5', rankTitle: 'Sergeant', yearsOfService: 4, deployments: 0, combatTours: 0, startAge: 18, endAge: 22, discharge: 'honorable' });
    engine.dispatch('service.joinPost', 'vfw');
    assert.equal(state.service.posts.vfw, null, 'VFW needs an overseas deployment');
    engine.dispatch('service.joinPost', 'legion');
    const m = state.service.posts.legion;
    assert.ok(m);
    m.standing = 100;
    for (let year = 0; year < 12 && m.rankIndex < 4; year++) {
      engine.ageUp();
      for (let i = 0; i < 12 && state.prompts.length; i++) {
        const p = state.prompts[0];
        engine.resolvePrompt(p.id, p.type === 'service.postElection' ? 'run' : (p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
      }
      if (!state.character.alive || !state.service.posts.legion) return;
      m.standing = 100;
    }
    assert.equal(m.rankIndex, 4, 'post commander');
  },

  'JROTC and Sea Cadets: enlist a grade or two up'() {
    const { state } = setup(7, 18);
    const base = enlistedStartGrade(state, 'army', MOS['army.11B']);
    state.k12.jrotcYears = 3;
    assert.ok(enlistedStartGrade(state, 'army', MOS['army.11B']) >= Math.max(base, 2));
    state.k12.jrotcYears = 0;
    state.k12.seaCadetYears = 3;
    assert.ok(enlistedStartGrade(state, 'navy', MOS['navy.BM']) >= 2);
  },

  'private military contractors hire veterans and police, not walk-ins'() {
    const { state } = setup(8, 30);
    const gate = CONTRACTOR_PROFESSIONS.privateMilitary.eligible;
    assert.equal(gate(state).ok, false);
    state.military.history.push({ branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry', rankCode: 'E-6', rankTitle: 'Staff Sergeant', yearsOfService: 6, deployments: 2, combatTours: 1, startAge: 18, endAge: 24, discharge: 'honorable' });
    assert.equal(gate(state).ok, true);
    assert.ok(getProfession('privateMilitary').levels.length >= 6);
  },

  'State Guard: no boards, no up-or-out; promotion when the school is done and a slot opens'() {
    const { engine, state } = setup(9, 30);
    state.character.regionId = 'sunbelt';
    engine.dispatch('service.joinSdf');
    const sdf = state.service.sdf;
    assert.ok(sdf, 'joined the Texas State Guard');
    const org = ensureSdfOrg(state, sdf.stateId);
    assert.match(sdfNextRank(state).missing.join(), /Basic Orientation/);
    engine.dispatch('service.sdfSchool', 'bot');
    sdf.yearsInRank = 1;
    assert.equal(sdfNextRank(state).missing.length, sdf.schools.bot ? 0 : 1);
    // Sergeant: needs MEMS and a vacancy.
    Object.assign(sdf, { rankIndex: 1, yearsInRank: 5, schools: { bot: 30, mems: 31 } });
    for (const p of Object.values(org.people)) if (p.rankIndex === 2) delete org.people[p.id];
    for (let i = 0; i < SDF_SLOTS[2]; i++) org.people[`x${i}`] = { id: `x${i}`, name: 'X', rankIndex: 2, years: 1, age: 30, rel: 50, performance: 50 };
    assert.match(sdfNextRank(state).missing.join(), /open Sergeant slot/);
    delete org.people.x0;
    assert.equal(sdfNextRank(state).missing.length, 0, 'a slot opened');
    // Years of not being promoted never separate you.
    Object.assign(sdf, { rankIndex: 1, schools: { bot: 30 } });
    for (let y = 0; y < 8 && state.character.alive; y++) {
      engine.ageUp();
      for (let i = 0; i < 12 && state.prompts.length; i++) engine.resolvePrompt(state.prompts[0].id, state.prompts[0].options.find((o) => o.id !== 'go' && !o.disabled)?.id ?? state.prompts[0].options[0].id);
    }
    if (state.character.alive && state.character.regionId === 'sunbelt') assert.ok(state.service.sdf, 'still serving');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} service test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} service tests passed`);
