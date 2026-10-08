/**
 * Equipment & facilities for every kind of owner: departments (capital
 * budget, buying, leasing, refurbishing, retiring, bonds), businesses,
 * volunteer companies and military units — plus the airport, university
 * and state fire agencies.
 *
 *   node tests/deptequip.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, applicationEligibility } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession, PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { EquipmentModule, GROUPS, powers, contextOf, recordOf, readiness as readinessOf } from '../src/modules/equipment/Equipment.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { FireLifeModule } from '../src/modules/publicsafety/FireLife.js';
import { PoliceLifeModule } from '../src/modules/publicsafety/PoliceLife.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function worker(seed, professionId, levelId, creds = []) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Dept', lastName: 'Head', gender: 'female' });
  state.character.age = 45;
  Object.assign(state.stats, { smarts: 75, fitness: 70, health: 90 });
  state.legal.record = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'economics', schoolId: 'state', gpa: 3.2, year: 22 });
  for (const c of creds) state.credentials.held[c] = { earnedAge: 22, renewedAge: 40, status: 'active' };
  const ctx = engine.context();
  const job = hire(ctx, { professionId, levelId, employer: createEmployer(ctx.rng, state, getProfession(professionId), state.character.regionId) });
  assert.ok(job, `hired ${professionId}.${levelId}`);
  job.yearsAtEmployer = 15;
  state.prompts = [];
  return { engine, state, ctx, job };
}
const tick = (ctx, state) => { if (state.career.job) state.career.job.paidThisYear = true; state.character.age += 1; state.yearly = {}; EquipmentModule.onAgeUp(ctx); };
const deptOf = (state, ref = 'job') => recordOf(state, contextOf(state, ref));
const readiness = (state, ref = 'job') => readinessOf(state, contextOf(state, ref));
const BUSINESS_GROUPS_OF = (c) => GROUPS[c.group].categories;
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);

const tests = {
  'a police captain manages the fleet: buy, lease, retire, bank'() {
    const { engine, state, ctx } = worker(1, 'police', 'captain', ['post', 'driverLicense', 'fto', 'supervisorCourse']);
    assert.ok(contextOf(state, 'job').manager);
    const d = deptOf(state);
    assert.ok(d.budget > 0, 'a capital budget');
    const before = d.units.patrol.length;
    engine.dispatch('deptEquip.buy', 'job|patrol:hybrid');
    engine.dispatch('deptEquip.buy', 'job|patrol:suv:lease');
    assert.equal(d.units.patrol.length, before + 2);
    engine.dispatch('deptEquip.retire', 'job|patrol');
    assert.equal(d.units.patrol.length, before + 1);
    engine.dispatch('deptEquip.buy', 'job|stations:storefront');
    engine.dispatch('deptEquip.bank', 'job|');
    assert.ok(d.reserve > 0, 'banked for a big purchase');
    const r0 = readiness(state);
    for (let i = 0; i < 3; i++) tick(ctx, state);
    assert.ok(typeof readiness(state) === 'number' && r0 >= 0);
    const html = VIEWS.career(state, {});
    assert.match(html, /Department Fleet &amp; Facilities|Department Fleet & Facilities/);
    clean(html);
  },

  'a fire chief refurbishes an engine and asks for a station bond'() {
    const { engine, state, ctx } = worker(2, 'fire', 'battalion', ['ff1', 'ff2', 'emt', 'driverLicense', 'driverOperator', 'fireOfficer1', 'fireOfficer2', 'ics300']);
    const d = deptOf(state);
    d.budget = 5_000_000;
    const oldest = Math.max(...d.units.engine.map((u) => u.age));
    engine.dispatch('deptEquip.refurb', 'job|engine');
    assert.ok(Math.max(...d.units.engine.map((u) => u.age)) <= oldest, 'refurbished');
    let approved = false;
    for (let i = 0; i < 15 && !approved; i++) { state.yearly = {}; engine.dispatch('deptEquip.build', 'job|stations:own'); approved = Boolean(d.bond); }
    assert.ok(approved, 'bond approved');
    const n = d.units.stations.length;
    tick(ctx, state);
    tick(ctx, state);
    assert.equal(d.units.stations.length, n + 1, 'the station opened');
  },

  'rank and file can\'t buy; a budget freeze hurts readiness'() {
    const { engine, state, ctx } = worker(3, 'ems', 'paramedic', ['emt', 'paramedic', 'driverLicense']);
    const d = deptOf(state);
    const n = d.units.ambulance.length;
    engine.dispatch('deptEquip.buy', 'job|ambulance:box');
    assert.equal(d.units.ambulance.length, n, 'no purchase');
    const r = readiness(state);
    // A capital freeze: nothing gets replaced for eight years.
    for (let i = 0; i < 8; i++) { d.budget = 0; d.reserve = 0; d.budgetAge = null; tick(ctx, state); }
    assert.ok(readiness(state) < r, `fleets age without investment (${r} → ${readiness(state)})`);
  },

  'university police: a state agency on campus, with campus calls and blue-light phones'() {
    const { state, ctx, engine } = worker(6, 'universityPolice', 'officer', ['post', 'driverLicense']);
    assert.equal(getProfession('universityPolice').sector, 'state');
    assert.equal(state.police.area, 'campus');
    assert.ok(deptOf(state).units.phones.length > 10, 'blue-light phones');
    let campus = false;
    for (let i = 0; i < 15 && !campus; i++) {
      state.prompts = [];
      state.career.job.paidThisYear = true;
      state.character.age += 1;
      state.yearly = {};
      PoliceLifeModule.onAgeUp(ctx);
      const p = state.prompts.find((x) => x.type === 'police.call');
      campus = Boolean(p && ['clery', 'titleix', 'party', 'protest', 'threat', 'gameday'].includes(p.data.callId));
      if (p) engine.resolvePrompt(p.id, p.options[0].id);
    }
    assert.ok(campus, 'campus calls');
    clean(VIEWS.career(state, {}));
  },

  'airport police and ARFF exist, train and fight aircraft fires'() {
    const pol = worker(4, 'airportPolice', 'officer', ['post', 'driverLicense']);
    assert.equal(pol.state.police.area, 'terminal');
    assert.ok(deptOf(pol.state).units.k9, 'explosives-detection K-9s');
    const fire = worker(5, 'airportFire', 'firefighter', ['ff1', 'ff2', 'arff', 'driverLicense']);
    assert.equal(fire.state.fireLife.station, 'airport');
    assert.ok(deptOf(fire.state).units.crash.length > 0, 'crash trucks');
    let arff = false;
    for (let i = 0; i < 12 && !arff; i++) {
      fire.state.prompts = [];
      fire.state.career.job.paidThisYear = true;
      fire.state.character.age += 1;
      fire.state.yearly = {};
      FireLifeModule.onAgeUp(fire.ctx);
      arff = fire.state.prompts.some((p) => p.type === 'fireLife.call' && ['alert2', 'crash', 'fuel', 'terminal'].includes(p.data.callId));
    }
    assert.ok(arff, 'aircraft emergencies');
    const html = VIEWS.career(fire.state, {});
    clean(html);
  },
  'a state fire agency: wildland stations, fire-season calls, dozers and helicopters'() {
    const { state, ctx, engine } = worker(7, 'stateFire', 'firefighter', ['ff1', 'wildlandFF2', 'driverLicense']);
    assert.equal(getProfession('stateFire').sector, 'state');
    assert.equal(state.fireLife.station, 'forest');
    engine.dispatch('fireLife.station', 'engine');
    assert.equal(state.fireLife.station, 'forest', 'no city engine companies');
    const d = deptOf(state);
    assert.ok(d.units.engine.length > 0 && d.units.dozer, 'Type 3 engines and dozers');
    let wild = false;
    for (let i = 0; i < 12 && !wild; i++) {
      state.prompts = [];
      tick(ctx, state);
      FireLifeModule.onAgeUp(ctx);
      const p = state.prompts.find((x) => x.type === 'fireLife.call');
      wild = Boolean(p && ['initialAttack', 'burnover', 'spot', 'evac', 'medical'].includes(p.data.callId));
      if (p) engine.resolvePrompt(p.id, p.options[0].id);
    }
    assert.ok(wild, 'wildland calls');
    clean(VIEWS.career(state, {}));
    // A battalion chief runs the budget and can contract a helicopter for the season.
    const chief = worker(8, 'stateFire', 'battalion', ['ff1', 'ff2', 'wildlandFF2', 'wildlandFF1', 'driverLicense', 'driverOperator', 'fireOfficer1', 'ics300']);
    const cd = deptOf(chief.state);
    cd.budget = 10_000_000;
    const n = cd.units.helicopter?.length ?? 0;
    chief.engine.dispatch('deptEquip.buy', 'job|helicopter:contract');
    assert.equal(cd.units.helicopter.length, n + 1, 'an exclusive-use helicopter contract');
    assert.match(VIEWS.career(chief.state, {}), /Department Apparatus, Aircraft &amp; Stations|Department Apparatus, Aircraft & Stations/);
  },

  'equipment reaches other careers: a trucking terminal manager runs the fleet'() {
    const { state, engine } = worker(9, 'trucking', getProfession('trucking').levels.find((l) => l.abilities?.includes('budget')).id, ['driverLicense', 'cdlA', 'cdlB']);
    const c = contextOf(state, 'job');
    assert.equal(c.group, 'truckFleet');
    const d = deptOf(state);
    d.budget = 2_000_000;
    const n = d.units.tractors.length;
    engine.dispatch('deptEquip.buy', 'job|tractors:sleeper:lease');
    engine.dispatch('deptEquip.buy', 'job|tractors:daycab:used');
    assert.equal(d.units.tractors.length, n + 2);
    clean(VIEWS.career(state, {}));
  },

  'a business owner buys equipment from business cash; condition feeds quality'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(11), modules: MODULES });
    const state = engine.newLife({});
    state.character.age = 35;
    state.finances.cash = 2_000_000;
    state.housing.credit.score = 720;
    const t = BUSINESS_TYPES.restaurant;
    for (const c of t.credentials) state.credentials.held[c] = { earnedAge: 25, renewedAge: 30, status: 'active' };
    state.career.history.push({ professionId: t.professions[0], title: 'Cook', levelId: 'x', employerName: 'Diner', sector: 'private', peakGrade: 3, startAge: 22, endAge: 34, reason: 'Left' });
    engine.dispatch('business.start', 'restaurant:cash:llc');
    const c = contextOf(state, 'business');
    assert.ok(c, 'a business context');
    assert.equal(c.group, 'kitchen');
    const d = recordOf(state, c);
    c.biz.cash = 500_000;
    const cat = Object.keys(d.units)[0];
    const [mid] = Object.entries(BUSINESS_GROUPS_OF(c)[cat].models).find(([, m]) => !m.build && !m.rent);
    const cash = c.biz.cash;
    engine.dispatch('deptEquip.buy', `business|${cat}:${mid}`);
    assert.ok(c.biz.cash < cash, 'paid from business cash');
    assert.equal(d.units[cat].length, (BUSINESS_GROUPS_OF(c)[cat].need[c.size]) + 1);
    // Let it all wear out: quality suffers.
    for (const units of Object.values(d.units)) for (const u of units) u.age = 40;
    const q = c.biz.quality;
    state.prompts = [];
    EquipmentModule.onAgeUp(engine.context());
    assert.ok(c.biz.quality < q, `worn-out equipment hurts quality (${q} → ${c.biz.quality})`);
    clean(VIEWS.business(state, {}));
    assert.match(VIEWS.business(state, {}), /Business Equipment &amp; Premises|Business Equipment & Premises/);
  },

  'a volunteer fire chief: fund drives, used engines and federal grants'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(12), modules: MODULES });
    const state = engine.newLife({});
    state.character.age = 40;
    Object.assign(state.stats, { smarts: 90, fitness: 80, health: 90 });
    engine.dispatch('emergency.join', 'fire');
    const m = state.emergency.fire;
    assert.ok(m, 'joined');
    const ctx = engine.context();
    const member = contextOf(state, 'vol.fire');
    assert.ok(member && !member.manager, 'a rookie sees the apparatus but can\'t buy');
    engine.dispatch('deptEquip.fundraise', 'vol.fire|');
    const d = recordOf(state, member);
    const before = d.budget;
    assert.ok(before > 0, 'raised money');
    m.rankIndex = 6;
    const chief = contextOf(state, 'vol.fire');
    assert.ok(chief.manager, 'the chief decides');
    d.budget = 400_000;
    const n = d.units.engine.length;
    engine.dispatch('deptEquip.buy', 'vol.fire|engine:pumper:used');
    assert.equal(d.units.engine.length, n + 1, 'a used pumper from a career department');
    let granted = false;
    for (let i = 0; i < 25 && !granted; i++) {
      state.yearly = {};
      d.budget = 100_000;
      const k = d.units.scba.length;
      engine.dispatch('deptEquip.grant', 'vol.fire|scba:scba');
      granted = d.units.scba.length > k;
    }
    assert.ok(granted, 'an AFG grant came through');
    tick(ctx, state);
    const html = VIEWS.emergency(state, {});
    clean(html);
    assert.match(html, /Company Apparatus &amp; Firehouse|Company Apparatus & Firehouse/);
  },

  'a company commander overhauls vehicles and requests new ones through fielding'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(13), modules: MODULES });
    const state = engine.newLife({ firstName: 'Cpt', lastName: 'Gear' });
    state.character.age = 22;
    Object.assign(state.stats, { smarts: 85, fitness: 85, health: 95 });
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'history', schoolId: 'state', gpa: 3.5, year: 22 });
    engine.dispatch('military.enlist', 'army:officer:active');
    const sp = state.prompts.find((x) => x.type === 'military.chooseSpecialty');
    engine.resolvePrompt(sp.id, sp.options.find((o) => !o.disabled).id);
    state.prompts = [];
    engine.ageUp();
    state.prompts = [];
    const svc = state.military.service;
    assert.ok(svc.unit?.orgId, 'assigned to a unit');
    const lt = contextOf(state, 'military');
    assert.ok(lt && lt.requester && !lt.manager, 'a lieutenant can only push requests up');
    Object.assign(svc, { grade: 2 });
    svc.unit.billet = 'companyCommander';
    svc.unit.commandUntil = state.character.age + 2;
    const c = contextOf(state, 'military');
    assert.ok(c.manager, 'the commander');
    const d = recordOf(state, c);
    engine.dispatch('deptEquip.buy', 'military|tactical:jltv');
    assert.ok(!d.pending.length && d.units.tactical.every((u) => u.model === 'hmmwv'), 'commanders can\'t buy');
    d.budget = 5_000_000;
    const oldest = Math.max(...d.units.tactical.map((u) => u.age));
    engine.dispatch('deptEquip.refurb', 'military|tactical');
    assert.ok(Math.max(...d.units.tactical.map((u) => u.age)) <= oldest, 'depot overhaul');
    let fielded = false;
    for (let i = 0; i < 20 && !fielded; i++) { state.yearly = {}; engine.dispatch('deptEquip.requisition', 'military|tactical:jltv'); fielded = d.pending.length > 0; }
    assert.ok(fielded, 'fielding approved');
    const ctx = engine.context();
    tick(ctx, state);
    assert.ok(d.units.tactical.some((u) => u.model === 'jltv'), 'new JLTVs arrived');
    const html = VIEWS.military(state, {});
    clean(html);
    assert.match(html, /Unit Equipment Readiness/);
  },
  'equipment covers the careers where it matters'() {
    for (const id of ['merchantMarine', 'cruise', 'oilGas', 'airTrafficControl', 'meteorology', 'forensics', 'college', 'communityCollege', 'university', 'publicHealth', 'probation', 'surveying', 'environmental', 'renewableEnergy', 'privateMilitary', 'dentalHygiene', 'music', 'acting', 'contentCreator']) {
      const p = getProfession(id);
      const level = p.levels.find((l) => l.abilities?.includes('budget')) ?? p.levels.at(-1);
      const engine = new Engine({ store: new Store(memory()), rng: new Random(20), modules: MODULES });
      const state = engine.newLife({});
      state.character.age = 45;
      const ctx = engine.context();
      hire(ctx, { professionId: id, levelId: level.id, employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
      const c = contextOf(state, 'job');
      assert.ok(c && GROUPS[c.group], `${id} has equipment`);
      if (c.manager) clean(VIEWS.career(state, {}));
    }
    const solar = new Engine({ store: new Store(memory()), rng: new Random(21), modules: MODULES });
    const s = solar.newLife({});
    s.character.age = 35;
    s.finances.cash = 2_000_000;
    s.housing.credit.score = 720;
    const t = BUSINESS_TYPES.solarInstaller;
    for (const cr of t.credentials) s.credentials.held[cr] = { earnedAge: 25, renewedAge: 30, status: 'active' };
    s.career.history.push({ professionId: t.professions[0], title: 'Installer', levelId: 'x', employerName: 'X', sector: 'private', peakGrade: 3, startAge: 22, endAge: 34, reason: 'Left' });
    solar.dispatch('business.start', 'solarInstaller:cash:llc');
    assert.equal(contextOf(s, 'business')?.group, 'renewables', 'solar installers buy crew trucks and lifts');
  },

  'every branch has its own equipment, and disaster teams and the State Guard have theirs'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(22), modules: MODULES });
    const state = engine.newLife({});
    state.character.age = 35;
    Object.assign(state.stats, { smarts: 85, fitness: 80, health: 95 });
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
    for (const [branch, group] of [['marines', 'milMarine'], ['spaceforce', 'milSpace'], ['usphs', 'milUsphs'], ['noaa', 'milNoaa']]) {
      state.military.service = { branch, unit: { orgId: `test:${branch}`, company: 'Alpha', billet: 'companyCommander', commandUntil: 40 }, track: 'officer', grade: 2, eval: 70 };
      const c = contextOf(state, 'military');
      assert.equal(c.group, group, branch);
      assert.ok(c.manager && powers(c).requisition && !powers(c).buy);
    }
    state.military.service = null;
    // Disaster teams: the nonprofit buys its own; the federal team is issued gear.
    state.service.teams.teamRubicon = { rankIndex: 3, years: 5, deployments: 10, declined: 0, joinedAge: 30 };
    state.service.teams.fema = { rankIndex: 4, years: 8, deployments: 12, declined: 0, joinedAge: 27 };
    const tr = contextOf(state, 'team.teamRubicon');
    assert.ok(tr.manager && powers(tr).fundraise && powers(tr).buy, 'Team Rubicon raises money and buys');
    const fema = contextOf(state, 'team.fema');
    assert.ok(fema.manager && powers(fema).requisition && !powers(fema).buy, 'FEMA is issued gear');
    state.prompts = [];
    engine.dispatch('deptEquip.fundraise', 'team.teamRubicon|');
    assert.ok(recordOf(state, tr).budget > 0, 'raised money');
    const kits = recordOf(state, fema).units.kits.length;
    engine.dispatch('deptEquip.buy', 'team.fema|kits:kit');
    assert.equal(recordOf(state, fema).units.kits.length, kits, 'federal teams can\'t buy their own');
    let fielded = false;
    for (let i = 0; i < 20 && !fielded; i++) { state.yearly = {}; engine.dispatch('deptEquip.requisition', 'team.fema|vehicles:mdrc'); fielded = recordOf(state, fema).pending.length > 0; }
    assert.ok(fielded, 'a mobile recovery center is on the way');
    state.service.sdf = { stateId: 'TX', name: 'Texas State Guard', rankIndex: 8, yearsInRank: 2, schools: {}, years: 12, activations: 3, joinedAge: 23 };
    assert.equal(contextOf(state, 'team.sdf')?.group, 'sdf');
    // Volunteer police reserves.
    engine.dispatch('emergency.join', 'police');
    if (state.emergency.police) assert.equal(contextOf(state, 'vol.police')?.group, 'volPolice');
    const html = VIEWS.civic(state, {});
    clean(html);
    assert.match(html, /Team Team Equipment|Team Deployment Kit/);
  },
  'every career has equipment, and every manager can render and spend it'() {
    for (const p of Object.values(PROFESSIONS)) {
      const level = p.levels.find((l) => l.abilities?.includes('budget')) ?? p.levels.at(-1);
      const engine = new Engine({ store: new Store(memory()), rng: new Random(30), modules: MODULES });
      const state = engine.newLife({});
      state.character.age = 50;
      const ctx = engine.context();
      if (!hire(ctx, { professionId: p.id, levelId: level.id, employer: createEmployer(ctx.rng, state, p, state.character.regionId) })) continue;
      const c = contextOf(state, 'job');
      assert.ok(c && GROUPS[c.group], `${p.id} has equipment`);
      state.prompts = [];
      if (c.manager) {
        clean(VIEWS.career(state, {}));
        state.career.job.paidThisYear = true;
        state.yearly = {};
        EquipmentModule.onAgeUp(ctx);
        assert.ok(Number.isFinite(recordOf(state, c).budget), `${p.id} budget`);
      }
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} equipment test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} equipment tests passed`);
