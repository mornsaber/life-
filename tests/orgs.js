/**
 * Organizations: every career belongs to an organization type, hiring puts
 * the player in a department with a chain of command, history remembers the
 * organization, and old saves get organizations attached.
 *
 *   node tests/orgs.js
 */
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { ORG_TYPES, orgTypesFor } from '../src/modules/org/OrgTypes.js';
import { chainOfCommand, orgOf, standingWith, OrganizationsModule } from '../src/modules/org/Organizations.js';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, leaveJob } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { ladderFor } from '../src/modules/career/Ladder.js';

const problems = [];
const flag = (where, msg) => problems.push(`${where}: ${msg}`);
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

// 1. Type references.
for (const [id, t] of Object.entries(ORG_TYPES)) {
  for (const d of t.departments) for (const o of d.occupations) if (!PROFESSIONS[o]) flag(`orgType ${id}.${d.id}`, `unknown occupation ${o}`);
  if (t.head.occupation && !PROFESSIONS[t.head.occupation]) flag(`orgType ${id}`, `unknown head occupation ${t.head.occupation}`);
}
const solo = Object.keys(PROFESSIONS).filter((p) => orgTypesFor(p)[0].startsWith('solo:'));

// 2. Every career: hire at the top and the bottom of the ladder; the chain resolves.
const engine = new Engine({ store: new Store(memory()), rng: new Random(42), modules: MODULES });
const state = engine.newLife({ firstName: 'Org', lastName: 'Test', gender: 'female' });
state.character.age = 30;
const ctx = engine.context();
for (const [pid, p] of Object.entries(PROFESSIONS)) {
  for (const size of ['small', 'enterprise']) {
    const employer = createEmployer(engine.rng, state, p, state.character.regionId);
    employer.size = size;
    if (!employer.orgId || !orgOf(state, employer)) { flag(pid, 'employer has no organization'); continue; }
    if (!employer.deptId) flag(pid, 'employer has no department');
    const ladder = ladderFor(p, size);
    for (const level of [ladder[0], ladder.at(-1)]) {
      hire(ctx, { professionId: pid, levelId: level.id, employer });
      state.prompts = [];
      if (state.career.job?.professionId !== pid) continue; // profession-specific gates (faith, ordination)
      const c = chainOfCommand(state, state.career.job);
      if (!c) { flag(`${pid}.${level.id}`, 'no chain of command'); continue; }
      if (!c.supervisor) flag(`${pid}.${level.id}`, 'nobody to report to');
      if (c.supervisor?.levelId === level.id) flag(`${pid}.${level.id}`, 'reports to their own level');
      if (!c.coworkers.length) flag(`${pid}.${level.id}`, 'no coworkers');
    }
  }
}

// 3. One city government per city; separations recorded with the organization.
const cityOrgs = Object.values(state.orgs.byId).filter((o) => o.typeId === 'cityGov' && o.regionId === state.character.regionId);
if (cityOrgs.length > 1) flag('cityGov', `${cityOrgs.length} city governments in one city`);
const police = PROFESSIONS.police;
hire(ctx, { professionId: 'police', levelId: police.levels[0].id, employer: createEmployer(engine.rng, state, police, state.character.regionId) });
const orgId = state.career.job.employer.orgId;
if (orgOf(state, orgId)?.typeId !== 'cityGov') flag('police', `works for ${orgOf(state, orgId)?.typeId}, not the city`);
state.career.job.performance = 20;
leaveJob(ctx, 'Test firing', { fired: true });
const h = state.career.history.at(-1);
if (h.orgId !== orgId || !h.orgName || !h.deptName) flag('history', 'separation missing organization');
if (standingWith(state, orgId)?.standing !== 'ineligible') flag('history', 'firing should make you ineligible for rehire');

// 4. Old saves: a job without an organization gets one on load.
const job = { professionId: 'nursing', levelId: PROFESSIONS.nursing.levels[0].id, employer: { name: 'Old Hospital', size: 'medium', benefits: {} } };
const old = { career: { job, history: [] }, character: { regionId: state.character.regionId, age: 40 } };
OrganizationsModule.init(old, new Random(1));
if (!job.employer.orgId || !old.orgs.byId[job.employer.orgId]) flag('migration', 'old job got no organization');

// 5. Organizations don't consume the main random stream.
const a = new Engine({ store: new Store(memory()), rng: new Random(7), modules: MODULES });
a.newLife({ firstName: 'A', lastName: 'B', gender: 'male' });
const before = a.rng.seed;
const s2 = a.state;
const before2 = { ...s2.orgs };
createEmployer(new Random(99), s2, PROFESSIONS.retail, s2.character.regionId);
if (a.rng.seed !== before) flag('rng', 'org generation used the main stream');
if (s2.orgs.seed === before2.seed) flag('rng', 'org generation did not advance its own stream');

// 6. Vacancies: a one-seat post opens only when its holder leaves; a lost contest seats the rival.
{
  const { seatsAt, vacancyTick, promotionContest, awardToRival, hasOpening } = await import('../src/modules/org/Vacancies.js');
  const p = PROFESSIONS.police;
  const employer = createEmployer(engine.rng, state, p, state.character.regionId);
  employer.size = 'medium';
  const ladder = ladderFor(p, 'medium');
  const org = orgOf(state, employer);
  const seats = ladder.map((l) => seatsAt(org, employer.deptId, p, l, 'medium'));
  if (seats[0] < seats.at(-1)) flag('seats', `police seats should narrow up the ladder: ${seats.join(',')}`);
  if (seats.at(-1) !== 1 && ladder.at(-1).abilities.includes('exec')) flag('seats', 'the top post should have one seat');
  // Put the player one rung below the top.
  const below = ladder.at(-2);
  hire(ctx, { professionId: 'police', levelId: below.id, employer });
  state.prompts = [];
  const job = state.career.job;
  let opened = 0;
  let filled = 0;
  for (let y = 0; y < 40; y++) {
    vacancyTick(ctx, job);
    const top = ladder.filter((l) => l.grade > below.grade && !l.appointed);
    for (const l of top) {
      if (hasOpening(job, l)) opened += 1;
      else filled += 1;
    }
    state.character.age += 1;
  }
  if (!opened) flag('vacancies', 'the post above never opened in 40 years');
  if (!filled) flag('vacancies', 'the post above was always open');
  const target = ladder.find((l) => l.grade > below.grade && !l.appointed);
  if (target) {
    const c = promotionContest(state, job, target);
    if (!(c.factor > 0)) flag('contest', 'no factor');
    const before = Object.keys(org.people).length;
    const line = awardToRival(state, job, target, c.best);
    if (!/post went to/.test(line)) flag('contest', line);
    if (hasOpening(job, target)) flag('contest', 'post still open after a rival won it');
    if (Object.keys(org.people).length < before) flag('contest', 'people vanished');
  }
}

// 7. Re-entry: former employers, rehire standing, internal moves, the gap penalty.
{
  const { formerEmployers, rehireCheck, reentryPenalty, internalMoves, ReentryActions, ReentryResolvers } = await import('../src/modules/org/Reentry.js');
  const e2 = new Engine({ store: new Store(memory()), rng: new Random(11), modules: MODULES });
  const s = e2.newLife({ firstName: 'Re', lastName: 'Entry', gender: 'male' });
  s.character.age = 30;
  Object.assign(s.stats, { smarts: 80, health: 90, fitness: 80 });
  s.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 });
  const c2 = e2.context();
  const retail = PROFESSIONS.retail;
  hire(c2, { professionId: 'retail', levelId: retail.levels[0].id, employer: createEmployer(e2.rng, s, retail, s.character.regionId) });
  s.career.job.performance = 80;
  s.career.job.boss = 70;
  const orgA = s.career.job.employer.orgId;
  leaveJob(c2, 'Resigned');
  s.character.age = 34;
  const list = formerEmployers(s);
  if (!list.some((e) => e.orgId === orgA && e.standing === 'good')) flag('rehire', 'good leaver not listed as eligible');
  if (!rehireCheck(s, list[0]).ok) flag('rehire', `can't return: ${rehireCheck(s, list[0]).reason}`);
  if (!(reentryPenalty(s) > 0)) flag('reentry', 'four years out should cost something');
  s.yearly = {};
  for (let i = 0; i < 20 && !s.prompts.some((p) => p.type === 'orgs.rehireOffer'); i++) { s.yearly = {}; ReentryActions.rehire(c2, orgA); }
  const offer = s.prompts.find((p) => p.type === 'orgs.rehireOffer');
  if (!offer) flag('rehire', 'never got a return offer');
  else {
    ReentryResolvers.rehireOffer(c2, offer.data, 'accept');
    if (s.career.job?.employer.orgId !== orgA) flag('rehire', 'did not return to the same organization');
  }
  s.prompts = [];
  // Fired → ineligible.
  leaveJob(c2, 'Theft', { fired: true });
  if (rehireCheck(s, formerEmployers(s).find((e) => e.orgId === orgA)).ok) flag('rehire', 'fired employee may return');
  // Internal move inside a city government.
  const pw = PROFESSIONS.publicWorks;
  const { grantCredential } = await import('../src/modules/credentials/LicensingEngine.js');
  for (const id of ['learnerPermit', 'driverLicense']) grantCredential(c2, id, { silent: true });
  const { EXAMS } = await import('../src/modules/publicservice/PublicServiceEngine.js');
  for (const id of Object.keys(EXAMS)) s.publicService.exams[id] = { age: 30, score: 95 };
  const { MAJORS } = await import('../src/modules/education/Catalog.js');
  for (const m of Object.keys(MAJORS)) s.education.degrees.push({ type: 'associate', programId: 'associate', major: m, year: 22 });
  s.character.age = 30;
  if (pw) {
    hire(c2, { professionId: 'publicWorks', levelId: pw.levels[0].id, employer: createEmployer(e2.rng, s, pw, s.character.regionId) });
    s.career.job.yearsAtEmployer = 6;
    const moves = internalMoves(s);
    if (!moves.length) flag('internalMove', 'a city employee has no other city occupations listed');
    const open = moves.find((m) => m.check.ok);
    if (!open) console.log('  moves:', moves.map((m) => `${m.profession.id}: ${m.check.reason}`).join('; '));
    if (open) {
      const org = s.career.job.employer.orgId;
      s.career.job.performance = 95; s.career.job.boss = 95;
      for (let i = 0; i < 20 && s.career.job.professionId === 'publicWorks'; i++) { s.yearly = {}; ReentryActions.internalMove(c2, open.profession.id); }
      if (s.career.job.professionId !== open.profession.id) flag('internalMove', 'never approved');
      else if (s.career.job.employer.orgId !== org || s.career.job.yearsAtEmployer !== 6) flag('internalMove', 'lost organization or seniority');
      else console.log(`  internal move: publicWorks → ${open.profession.id} inside ${s.career.job.employer.orgName}`);
    }
  }
}

// 8. Supervision: a sergeant manages named officers.
{
  const { SupervisionActions, reportsOf } = await import('../src/modules/org/Supervision.js');
  const e3 = new Engine({ store: new Store(memory()), rng: new Random(21), modules: MODULES });
  const s = e3.newLife({ firstName: 'Sup', lastName: 'Visor', gender: 'female' });
  s.character.age = 40;
  const c3 = e3.context();
  const p = PROFESSIONS.police;
  const sup = p.levels.find((l) => l.abilities.includes('supervise'));
  const employer = createEmployer(e3.rng, s, p, s.character.regionId);
  employer.size = 'large';
  hire(c3, { professionId: 'police', levelId: sup.id, employer });
  s.prompts = [];
  const team = reportsOf(s, s.career.job);
  if (team.length < 2) flag('supervision', `a ${sup.title} has ${team.length} named reports`);
  else {
    const [a, b] = team;
    const rel = a.rel;
    SupervisionActions.commend(c3, a.id);
    if (a.rel <= rel) flag('supervision', 'commending did not help the relationship');
    b.performance = 20;
    b.discipline = 2;
    for (let i = 0; i < 10 && reportsOf(s, s.career.job).some((x) => x.id === b.id); i++) { s.yearly = {}; SupervisionActions.terminate(c3, b.id); }
    if (reportsOf(s, s.career.job).some((x) => x.id === b.id)) flag('supervision', 'could never get a failing officer fired');
    s.yearly = {};
    SupervisionActions.commend(c3, a.id); SupervisionActions.commend(c3, a.id); SupervisionActions.commend(c3, a.id);
    const before = a.rel;
    SupervisionActions.commend(c3, a.id);
    if (a.rel !== before) flag('supervision', 'no yearly limit on management actions');
  }
}

// 9. Government: a mayor appoints the public safety commissioner; administrations change heads.
{
  const { appointmentsInReach, GovernmentActions, politicalTurnover } = await import('../src/modules/org/Government.js');
  const e4 = new Engine({ store: new Store(memory()), rng: new Random(31), modules: MODULES });
  const s = e4.newLife({ firstName: 'May', lastName: 'Or', gender: 'female' });
  s.character.age = 50;
  const c4 = e4.context();
  s.politics.office = { id: 'mayor', termYearsLeft: 4, terms: 1, approval: 55, startAge: 50, fullTime: true };
  const posts = appointmentsInReach(s);
  const safety = posts.find((p) => /Public Safety/.test(p.title));
  if (!safety) flag('government', `a mayor should appoint the public safety commissioner (got ${posts.map((p) => p.title).join(', ')})`);
  else {
    GovernmentActions.appoint(c4, `${safety.org.id}|${safety.deptId}|professional`);
    const now = appointmentsInReach(s).find((p) => p.title === safety.title);
    if (!now.holder?.appointedByPlayer) flag('government', 'appointment did not take');
  }
  // A police officer in that city sees heads change across election cycles.
  s.politics.office = null;
  const police = PROFESSIONS.police;
  hire(c4, { professionId: 'police', levelId: police.levels[1].id, employer: createEmployer(e4.rng, s, police, s.character.regionId) });
  s.prompts = [];
  const org = orgOf(s, s.career.job.employer);
  const heads = new Set([org.departments.publicSafety?.head]);
  for (let y = 0; y < 24; y++) { s.character.age += 1; politicalTurnover(c4, s.career.job); heads.add(org.departments.publicSafety?.head); }
  if (heads.size < 2) flag('government', 'no change of commissioner in 24 years of elections');
}

// 10. Churn: departments hire and lose people; leavers sometimes come back.
{
  const { churnTick, rememberDeparture } = await import('../src/modules/org/Churn.js');
  const e5 = new Engine({ store: new Store(memory()), rng: new Random(41), modules: MODULES });
  const s = e5.newLife({ firstName: 'Ch', lastName: 'Urn', gender: 'male' });
  s.character.age = 35;
  const c5 = e5.context();
  hire(c5, { professionId: 'retail', levelId: PROFESSIONS.retail.levels[0].id, employer: createEmployer(e5.rng, s, PROFESSIONS.retail, s.character.regionId) });
  s.prompts = [];
  const org = orgOf(s, s.career.job.employer);
  const dept = org.departments[s.career.job.employer.deptId];
  const coworker = chainOfCommand(s, s.career.job).coworkers[0];
  rememberDeparture(s, org, coworker, 'resigned for another job');
  let back = false;
  for (let y = 0; y < 40 && !back; y++) { s.character.age += 1; churnTick(c5, s.career.job); back = Object.values(org.people).some((p) => p.returned); if (org.alumni?.length === 0) rememberDeparture(s, org, coworker, 'resigned for another job'); }
  if (!dept.lastYear) flag('churn', 'no hiring/attrition recorded');
  if (!back) flag('churn', 'nobody ever came back');
}

if (problems.length) {
  console.log(problems.map((p) => `  ✘ ${p}`).join('\n'));
  console.log(`\n${problems.length} organization problem(s)`);
  process.exit(1);
}
console.log(`✔ Organizations passed — ${Object.keys(PROFESSIONS).length} careers in ${Object.keys(ORG_TYPES).length} organization types (${solo.length} stand-alone: ${solo.join(', ')}); ${Object.keys(state.orgs.byId).length} organizations generated`);
