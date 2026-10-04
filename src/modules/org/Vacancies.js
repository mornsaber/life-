/**
 * Vacancies and competitive promotion.
 *
 * Every position has a number of seats in its department, from the size of
 * the employer and how high it sits on the ladder: plenty of officers, a few
 * sergeants, one chief. You can only be promoted into a seat that is open.
 *
 *  - Rare posts (≤ 3 seats) are held by named people who age, retire,
 *    resign, get promoted away or fired. When one leaves, the post opens.
 *  - Common posts (more than NAMED_SEATS) always have an opening somewhere.
 *  - An opening is contested: coworkers at your level apply, and senior or
 *    executive posts draw outside candidates too. Whoever doesn't get it,
 *    someone does — the winner fills the seat (and may become your boss).
 *  - Openings nobody fills during the year go to someone else at year end.
 *
 * All randomness here runs on the organizations' side stream.
 *
 * job.openings = { [levelId]: 'open' | 'filled' | <name of the holder> } (this year)
 * dept.vacancies = [{ professionId, levelId, since, why }]
 */
import { clamp } from '../../core/Random.js';
import { getProfession } from '../career/JobTrees.js';
import { ladderFor, levelById, nextLevels } from '../career/Ladder.js';
import { orgOf, orgType, sideRng, newPerson, seatHolders, supervises, chainOfCommand } from './Organizations.js';
import { rememberDeparture, churnTick } from './Churn.js';
import { postTick } from './Executives.js';

/** Typical staff of one occupation in a department, by employer size. */
const POOL = { small: 30, medium: 220, large: 2000, enterprise: 12000 };
/** Seats at or below which named people hold the post. */
export const NAMED_SEATS = 3;

export function seatsAt(org, deptId, profession, level, size) {
  const t = orgType(org.typeId);
  const occupations = t?.departments.find((d) => d.id === deptId)?.occupations.length ?? 1;
  const pool = Math.max(6, POOL[size ?? 'medium'] / occupations);
  if (level.abilities?.includes('exec') || level.appointed) return 1;
  const ladder = ladderFor(profession, size);
  const idx = ladder.findIndex((l) => l.id === level.id);
  const depth = ladder.slice(0, idx + 1).filter(supervises).length;
  if (depth) return Math.max(1, Math.round(pool / 6 ** depth));
  // Individual-contributor levels thin out with grade, too.
  return Math.max(1, Math.round((pool * 0.5) / 2 ** Math.max(0, level.grade - 4)));
}

/** Why a named holder leaves this year (null = stays). */
export function departure(rng, p) {
  if (p.age >= 66) return rng.chance(0.6) ? 'retired' : null;
  if (p.age >= 58 && rng.chance(0.14)) return 'retired';
  if (p.performance < 40 && rng.chance(0.2)) return 'was let go';
  if (rng.chance(0.05)) return 'resigned for another job';
  if (rng.chance(0.03)) return 'was promoted to a post elsewhere in the organization';
  if (rng.chance(0.015)) return 'transferred out';
  return null;
}

function removeSeat(dept, professionId, levelId, personId) {
  const list = dept.seats[professionId]?.[levelId];
  if (list) dept.seats[professionId][levelId] = list.filter((id) => id !== personId);
}

/** Put `person` in a seat (moving them out of their old one). */
export function seat(org, deptId, professionId, levelId, person, title) {
  const dept = org.departments[deptId];
  if (person.levelId) removeSeat(dept, person.professionId ?? professionId, person.levelId, person.id);
  Object.assign(person, { professionId, levelId, deptId, title: title ?? person.title });
  dept.seats[professionId] ??= {};
  (dept.seats[professionId][levelId] ??= []).push(person.id);
  dept.vacancies = (dept.vacancies ?? []).filter((v) => !(v.professionId === professionId && v.levelId === levelId));
}

/** Someone else wins an opening: a coworker moves up, or an outside hire arrives. */
function fillWithRival(state, org, deptId, profession, level, rival, size = org.size) {
  const rng = sideRng(state);
  // A named post never holds more people than it has seats.
  const seats = seatsAt(org, deptId, profession, level, size);
  const holders = (org.departments[deptId]?.seats[profession.id]?.[level.id] ?? []).filter((id) => org.people[id]);
  if (seats <= NAMED_SEATS && holders.length >= seats && !holders.includes(rival?.person?.id)) {
    org.departments[deptId].vacancies = (org.departments[deptId].vacancies ?? []).filter((v) => !(v.professionId === profession.id && v.levelId === level.id));
    return org.people[holders[0]];
  }
  const person = rival?.person ?? newPerson(rng, org, { selection: 'hired', years: 0, age: Math.min(62, 30 + level.grade * 3 + rng.int(0, 8)) });
  if (rival?.external || !rival?.person) {
    person.selection = 'hired';
    person.years = 0;
  } else person.selection = 'internal';
  seat(org, deptId, profession.id, level.id, person, level.title);
  return person;
}

/** Candidates for an opening besides the player. */
export function rivalsFor(state, job, level) {
  const org = orgOf(state, job.employer);
  if (!org) return [];
  const rng = sideRng(state);
  // Your coworkers at your level (as many as the post has seats).
  const coworkers = (chainOfCommand(state, job)?.coworkers ?? []).filter((p) => p.age < 64);
  const rivals = coworkers.slice(0, rng.int(1, 3)).map((p) => ({ person: p, external: false, score: p.performance * 0.5 + 12 + Math.min(15, p.years * 1.5) + rng.float(-8, 8) }));
  const senior = level.grade >= 7 || level.abilities?.includes('exec') || level.abilities?.includes('delegate');
  if (senior && rng.chance(job.sector === 'private' ? 0.75 : 0.5)) rivals.push({ person: null, external: true, score: rng.float(48, 72) });
  return rivals;
}

/** Your standing in a promotion contest. */
export function candidateScore(state, job) {
  const leadership = state.credentials.held.leadershipProgram?.status === 'active' ? 5 : 0;
  return job.performance * 0.5 + job.boss * 0.2 + Math.min(15, job.yearsAtEmployer * 1.5) + leadership + (state.stats.smarts - 50) / 10;
}

/**
 * Run a promotion contest for `level`. Returns { factor, rivals, best }:
 * factor scales the review's success chance by how you compare to the best rival.
 */
export function promotionContest(state, job, level) {
  const rivals = rivalsFor(state, job, level);
  if (!rivals.length) return { factor: 1.15, rivals, best: null };
  const best = rivals.reduce((a, b) => (b.score > a.score ? b : a));
  return { factor: clamp(1 + (candidateScore(state, job) - best.score) / 60, 0.55, 1.45), rivals, best };
}

/** You got the post: it's no longer open. */
export function claimOpening(state, job, levelId) {
  const org = orgOf(state, job.employer);
  const dept = org?.departments[job.employer.deptId];
  if (!dept) return;
  dept.vacancies = (dept.vacancies ?? []).filter((v) => !(v.professionId === job.professionId && v.levelId === levelId));
  if (job.openings) job.openings[levelId] = 'filled';
}

/** You lost the contest: the best rival takes the post. Returns a sentence about who got it. */
export function awardToRival(state, job, level, best) {
  const org = orgOf(state, job.employer);
  if (!org) return 'The promotion went to someone else.';
  const profession = getProfession(job.professionId);
  const person = fillWithRival(state, org, job.employer.deptId, profession, level, best, job.employer.size);
  if (job.openings) job.openings[level.id] = person.name;
  return best?.external || !best ? `The ${level.title} post went to ${person.name}, an outside hire.` : `The ${level.title} post went to ${person.name}, one of your coworkers.`;
}

export const hasOpening = (job, level) => !job.openings || job.openings[level.id] === undefined || job.openings[level.id] === 'open';

export function openingReason(job, level) {
  const v = job.openings?.[level.id];
  if (v === 'filled' || v === undefined) return `No ${level.title} opening this year`;
  return `No ${level.title} opening — ${v} holds the post`;
}

/** This year's openings one rung up from the player's level. */
export function computeOpenings(state, job) {
  const org = orgOf(state, job.employer);
  const dept = org?.departments[job.employer.deptId];
  if (!dept) return;
  const profession = getProfession(job.professionId);
  const size = job.employer.size;
  job.openings = {};
  for (const level of nextLevels(profession, size, job.levelId).filter((l) => !l.appointed)) {
    const seats = seatsAt(org, dept.id, profession, level, size);
    if ((dept.vacancies ?? []).some((v) => v.professionId === job.professionId && v.levelId === level.id)) job.openings[level.id] = 'open';
    else if (seats <= NAMED_SEATS) job.openings[level.id] = seatHolders(state, org, dept.id, job.professionId, level.id, seats)[0]?.name ?? 'open';
    // Posts with many seats turn over every year: there's always somewhere to move up to.
    else job.openings[level.id] = 'open';
  }
}

/**
 * Yearly: named holders around you age and may leave, last year's unfilled
 * openings go to someone else, and this year's openings above you are set.
 */
export function vacancyTick(ctx, job) {
  const { state } = ctx;
  const org = orgOf(state, job.employer);
  if (!org) return;
  const dept = org.departments[job.employer.deptId];
  if (!dept) return;
  const rng = sideRng(state);
  const profession = getProfession(job.professionId);
  const size = job.employer.size;
  dept.vacancies ??= [];

  // Last year's openings that nobody filled are filled now.
  for (const v of dept.vacancies.filter((x) => x.since < state.character.age && x.professionId === job.professionId)) {
    const level = levelById(profession, v.levelId);
    if (!level) continue;
    const rivals = level.grade > job.grade ? rivalsFor(state, job, level) : [];
    const best = rivals.length ? rivals.reduce((a, b) => (b.score > a.score ? b : a)) : null;
    const person = fillWithRival(state, org, dept.id, profession, level, best, size);
    if (nextLevels(profession, size, job.levelId).some((l) => l.id === level.id)) ctx.log(`${person.name} ${best && !best.external ? 'was promoted' : 'was hired'} as ${level.title} at ${job.employer.name}.`, '🪑');
  }
  dept.vacancies = dept.vacancies.filter((x) => x.since >= state.character.age || x.professionId !== job.professionId);

  // The named people around you age; some leave.
  const supervisorBefore = job.supervisorId;
  for (const [levelId, ids] of Object.entries(dept.seats[job.professionId] ?? {})) {
    for (const id of [...ids]) {
      const p = org.people[id];
      if (!p) continue;
      p.age += 1;
      p.years += 1;
      p.performance = Math.round(clamp(p.performance + rng.float(-6, 6), 20, 98));
      const level = levelById(profession, levelId);
      if (!level) continue;
      const seats = seatsAt(org, dept.id, profession, level, size);
      const why = departure(rng, p);
      if (!why) continue;
      removeSeat(dept, job.professionId, levelId, id);
      rememberDeparture(state, org, p, why);
      delete org.people[id];
      if (seats <= NAMED_SEATS || id === supervisorBefore) dept.vacancies.push({ professionId: job.professionId, levelId, since: state.character.age, why });
      if (id === supervisorBefore) ctx.log(`Your supervisor, ${p.name} (${p.title}), ${why}.`, '🪑');
    }
  }

  computeOpenings(state, job);

  churnTick(ctx, job);
  postTick(ctx, job);

  // A new boss: the relationship starts over.
  const chain = chainOfCommand(state, job);
  const sup = chain?.supervisor;
  if (sup?.id && sup.id !== supervisorBefore) {
    if (supervisorBefore) {
      job.boss = Math.round(50 + (job.boss - 50) * 0.3);
      ctx.log(`You have a new supervisor: ${sup.name}, ${sup.title}.`, '🧑‍💼');
    }
    job.supervisorId = sup.id;
  }
}
