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

if (problems.length) {
  console.log(problems.map((p) => `  ✘ ${p}`).join('\n'));
  console.log(`\n${problems.length} organization problem(s)`);
  process.exit(1);
}
console.log(`✔ Organizations passed — ${Object.keys(PROFESSIONS).length} careers in ${Object.keys(ORG_TYPES).length} organization types (${solo.length} stand-alone: ${solo.join(', ')}); ${Object.keys(state.orgs.byId).length} organizations generated`);
