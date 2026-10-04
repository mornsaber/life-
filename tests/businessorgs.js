/**
 * Businesses are organizations: creation, the owner's seat, named staff on
 * career ladders, owner powers, growth into layers and branches, rivals,
 * sale (the organization lives on), failure, passive ownership, ownership
 * rules, and going back to employment afterwards.
 *
 *   node tests/businessorgs.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { BUSINESS_TYPES, businessesFor, SIZE_OPTIONS, startupCostFor } from '../src/modules/business/BusinessTypes.js';
import { startEligibility } from '../src/modules/business/Business.js';
import { ownershipRules } from '../src/modules/business/OwnershipRules.js';
import { businessOrg, ownerPosition, competitorsOf, businessRoster, syncBusinessOrg, businessStaffTick, TIERS } from '../src/modules/org/Businesses.js';
import { orgType, chainOfCommand } from '../src/modules/org/Organizations.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { workforceGap, ownerEntryLevel } from '../src/modules/org/Reentry.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed, age = 35) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Tony', lastName: 'Young', gender: 'male' });
  state.character.age = age;
  Object.assign(state.stats, { health: 90, smarts: 70, happiness: 70 });
  state.finances.cash = 3000000;
  state.housing.credit.score = 760;
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 });
  return { engine, state, ctx: engine.context() };
}
const plumber = (state, years = 10) => {
  state.career.history.push({ professionId: 'plumbing', title: 'Master Plumber', levelId: 'master', employerName: 'Pipes Inc', sector: 'private', peakGrade: 5, startAge: state.character.age - years, endAge: state.character.age, reason: 'Left' });
  state.credentials.held.masterPlumber = { earnedAge: 28, renewedAge: 34, status: 'active' };
};

const tests = {
  'every business type builds an organization staffed by real careers'() {
    for (const [id, t] of Object.entries(BUSINESS_TYPES)) {
      const ot = orgType(`biz:${id}`);
      assert.ok(ot?.departments.length, `${id} has departments`);
      for (const d of ot.departments) for (const o of d.occupations) assert.ok(PROFESSIONS[o], `${id}.${d.id}: ${o} is a career`);
      for (const p of t.professions) assert.ok(PROFESSIONS[p], `${id}: related career ${p} exists`);
    }
    // Career → business mapping comes from config.
    assert.ok(businessesFor('plumbing').includes('plumbing'));
    assert.ok(businessesFor('nursing').includes('homeHealth'));
    assert.ok(businessesFor('privateSecurity').includes('securityCompany'));
    assert.ok(businessesFor('education').includes('privateTutoring'));
    assert.ok(startupCostFor(BUSINESS_TYPES.privateTutoring, 'solo') < startupCostFor(BUSINESS_TYPES.plumbing, 'standard'));
    assert.ok(startupCostFor(BUSINESS_TYPES.privateSchool) > 1000000);
  },

  'starting a business: the owner holds a seat, staff are named people on career ladders, rivals exist'() {
    const { engine, state } = setup(1);
    plumber(state);
    engine.dispatch('business.start', 'plumbing:cash:llc:standard:Young Plumbing');
    const biz = state.business.current;
    assert.equal(biz.name, 'Young Plumbing');
    const org = businessOrg(state, biz);
    assert.ok(org && org.owner.kind === 'player');
    assert.equal(ownerPosition(state, biz).title, 'Owner');
    const people = Object.values(org.people);
    assert.ok(people.length >= 3, 'named employees');
    assert.ok(people.every((p) => !p.professionId || PROFESSIONS[p.professionId].levels.some((l) => l.id === p.levelId)), 'positions are ladder levels');
    assert.ok(people.some((p) => p.professionId === 'plumbing'), 'plumbers work there');
    assert.ok(competitorsOf(state, biz).length >= 2, 'established competitors');
  },

  'size and name options; licenses and experience gate them'() {
    const { state } = setup(2);
    assert.match(startEligibility(state, 'plumbing', 'cash').reason, /Master Plumber/);
    plumber(state, 2);
    assert.ok(startEligibility(state, 'plumbing', 'cash', 'solo').ok);
    assert.match(startEligibility(state, 'plumbing', 'cash', 'large').reason, /experience/);
    assert.match(startEligibility(state, 'privateSchool', 'cash', 'solo').reason, /Teaching|experience|open/);
    // No experience required for unlicensed businesses — just harder.
    assert.ok(startEligibility(state, 'consulting', 'cash').ok);
    assert.ok(SIZE_OPTIONS.solo.scale < 1);
  },

  'owner powers: promote, fire, hire a chief executive and step back'() {
    const { engine, state } = setup(3);
    plumber(state);
    engine.dispatch('business.start', 'plumbing:cash:llc:standard:');
    const biz = state.business.current;
    const org = businessOrg(state, biz);
    const worker = Object.values(org.people).find((p) => p.professionId === 'plumbing');
    const before = worker.levelId;
    engine.dispatch('business.staffPromote', worker.id);
    assert.notEqual(worker.levelId, before, 'promoted up the plumbing ladder');
    const other = Object.values(org.people).find((p) => p !== worker);
    engine.dispatch('business.staffFire', other.id);
    assert.ok(!org.people[other.id], 'fired');
    engine.dispatch('business.appointCeo');
    const prompt = state.prompts.find((p) => p.type === 'business.appointCeo');
    engine.resolvePrompt(prompt.id, prompt.options.find((o) => o.id.startsWith('outside')).id);
    assert.ok(org.ceo && biz.role === 'absentee');
    assert.match(ownerPosition(state, biz).title, /Chairman/);
    engine.dispatch('business.makePassive');
    assert.equal(state.business.current, null);
    assert.equal(state.business.holdings.length, 1, 'held passively');
    // Free to start another business.
    state.yearly = {};
    engine.dispatch('business.start', 'consulting:cash:llc');
    assert.ok(state.business.current && state.business.current !== biz, 'second business');
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.business.holdings[0]?.lastYear || state.business.history.some((h) => /held/.test(h.outcome)), 'holding ran a year');
  },

  'growth adds layers: managers at 8+, executives and finance/HR at 50+; branches are departments'() {
    const { engine, state } = setup(4);
    plumber(state);
    engine.dispatch('business.start', 'plumbing:cash:llc');
    const biz = state.business.current;
    const org = businessOrg(state, biz);
    biz.staff.headcount = TIERS.executives + 10;
    syncBusinessOrg(state, biz);
    assert.ok(org.departments.finance && org.departments.hr, 'finance and HR departments');
    assert.ok(Object.values(org.people).some((p) => p.title === 'Chief Operating Officer'), 'a COO');
    biz.years = 3;
    biz.cash = 5000000;
    engine.dispatch('business.expandTo', state.character.regionId === 'denver' ? 'chicago' : 'denver');
    engine.dispatch('business.expand', 'cash');
    assert.equal(org.branches.length, 1, 'branch opened');
    const branch = org.departments[org.branches[0].deptId];
    assert.ok(branch.head && org.people[branch.head].title === 'Branch Manager');
    assert.ok(businessRoster(state, biz).some((r) => r.dept === branch));
  },

  'employees leave — some to start competing businesses'() {
    const { engine, state, ctx } = setup(5);
    plumber(state);
    engine.dispatch('business.start', 'plumbing:cash:llc');
    const biz = state.business.current;
    const org = businessOrg(state, biz);
    const star = Object.values(org.people).find((p) => p.professionId === 'plumbing');
    Object.assign(star, { performance: 95, years: 8, age: 35 });
    const rivalsBefore = competitorsOf(state, biz).length;
    let founded = false;
    for (let i = 0; i < 200 && !founded; i++) {
      const r = businessStaffTick(ctx, biz);
      founded = r.founders.length > 0;
      syncBusinessOrg(state, biz);
      for (const p of Object.values(org.people)) Object.assign(p, { performance: 95, years: 8, age: 35 });
    }
    assert.ok(founded, 'someone left to compete');
    assert.ok(competitorsOf(state, biz).length > rivalsBefore, 'their business is a competitor');
  },

  'selling: the organization lives on under its buyer; closing dissolves it'() {
    const { engine, state } = setup(6);
    plumber(state);
    engine.dispatch('business.start', 'plumbing:cash:llc');
    const biz = state.business.current;
    const org = businessOrg(state, biz);
    const staff = Object.keys(org.people).length;
    state.prompts = [];
    // Accept an offer.
    const offer = { id: 'x', type: 'business.offer', options: [{ id: 'accept' }], data: { price: 500000, buyer: 'ABC Services' } };
    state.prompts.push(offer);
    engine.resolvePrompt('x', 'accept');
    assert.equal(state.business.current, null);
    assert.equal(org.owner.kind, 'npc');
    assert.equal(org.owner.name, 'ABC Services');
    assert.ok(Object.keys(org.people).length >= staff - 1, 'employees stay employed');
    assert.ok(!org.closed);
    assert.equal(state.business.history.at(-1).orgId, org.id);
    // Close another.
    engine.dispatch('business.start', 'consulting:cash:llc');
    const b2 = state.business.current;
    const o2 = businessOrg(state, b2);
    engine.dispatch('business.close');
    assert.ok(o2.closed, 'closed business dissolves');
  },

  'failure: running out of cash forces a decision, and bankruptcy ends it'() {
    const { engine, state } = setup(7);
    plumber(state);
    engine.dispatch('business.start', 'plumbing:cash:llc');
    const biz = state.business.current;
    biz.cash = -400000;
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.prompts.some((p) => p.type === 'business.cashCrunch') || !state.business.current, 'a cash crunch to answer');
    const crunch = state.prompts.find((p) => p.type === 'business.cashCrunch');
    if (crunch) engine.resolvePrompt(crunch.id, 'bankrupt');
    else if (state.business.current) engine.dispatch('business.bankrupt');
    assert.equal(state.business.current, null);
    assert.ok(businessOrg(state, biz)?.closed);
  },

  'ownership rules: police can\'t own a security firm; judges can\'t run a business'() {
    const { state, ctx } = setup(8);
    state.credentials.held.guardCard = { earnedAge: 30, renewedAge: 34, status: 'active' };
    hire(ctx, { professionId: 'police', levelId: PROFESSIONS.police.levels[1].id, employer: createEmployer(new Random(1), state, PROFESSIONS.police, state.character.regionId) });
    assert.match(startEligibility(state, 'securityCompany', 'cash').reason, /Conflict of interest/);
    assert.ok(ownershipRules(state, 'consulting').ok, 'other businesses are fine (run by a manager)');
    assert.equal(ownershipRules(state).canOperate, false);
    state.career.job = null;
    state.judiciary = { seat: { court: 'trial' } };
    assert.equal(ownershipRules(state).canOperate, false);
    assert.ok(!ownershipRules(state, 'lawFirm').ok);
  },

  'back to work: owner years count as work, and five years running one opens management jobs'() {
    const { engine, state } = setup(9);
    plumber(state);
    engine.dispatch('business.start', 'plumbing:cash:llc');
    const biz = state.business.current;
    assert.equal(biz.role, 'operator');
    state.character.age += 6;
    biz.years = 6;
    assert.equal(workforceGap(state), 0, 'running your business is work');
    engine.dispatch('business.close');
    state.character.age += 1;
    assert.ok(workforceGap(state) <= 1);
    const level = ownerEntryLevel(state, PROFESSIONS.plumbing, 'medium');
    assert.ok(level && (level.abilities.includes('supervise') || level.track === 'mgmt'), `former owner can come back as a manager (${level?.title})`);
  },

  'NPC businesses are employers in the same world'() {
    const { engine, state } = setup(10);
    plumber(state);
    engine.dispatch('business.start', 'plumbing:cash:llc');
    const biz = state.business.current;
    const rivals = competitorsOf(state, biz);
    // Sell, then look for plumbing jobs until one is at an NPC business.
    engine.dispatch('business.close');
    let atBusiness = null;
    for (let i = 0; i < 60 && !atBusiness; i++) {
      const e = createEmployer(new Random(100 + i), state, PROFESSIONS.plumbing, state.character.regionId);
      if (state.orgs.byId[e.orgId]?.business) atBusiness = e;
    }
    assert.ok(atBusiness, 'plumbing openings at local plumbing businesses');
    assert.ok(rivals.some((o) => o.id === atBusiness.orgId) || state.orgs.byId[atBusiness.orgId].owner.kind === 'npc');
    hire(engine.context(), { professionId: 'plumbing', levelId: 'journeyman', employer: atBusiness });
    const chain = chainOfCommand(state, state.career.job);
    assert.ok(chain?.orgHead || chain?.supervisor, 'you report up to the owner');
  },

  'old saves: an existing business gets an organization on load'() {
    const { state } = setup(11);
    plumber(state);
    const { engine } = setup(11);
    engine.state.business.current = null;
    const biz = { id: 'biz_old', typeId: 'plumbing', name: 'Old Pipes', staff: { headcount: 6, morale: 60, delegation: {} }, ownerPct: 1, reputation: 50, role: 'operator', foundedAge: 30, years: 5 };
    state.business.current = biz;
    for (const m of MODULES) if (m.id === 'business') m.init(state);
    assert.ok(businessOrg(state, biz), 'organization attached');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`  ✘ ${name}\n    ${e.message.split('\n').join('\n    ')}`);
  }
}
if (failed) {
  console.log(`\n${failed} business-organization test(s) failed`);
  process.exit(1);
}
console.log(`\n✔ All ${Object.keys(tests).length} business-organization tests passed`);
