/**
 * Civil-service promotional exams for police and fire. Sergeants,
 * lieutenants and captains aren't simply picked: you sit a written exam
 * (and an oral board), get a score, and land a rank on an eligibility list.
 * The department promotes down the list as seats open; lists expire after
 * three years, and then you test again.
 *
 * job.promoList = { [levelId]: { rank, expiresAge, score } }
 */
import { clamp } from '../../core/Random.js';
import { PROMO_GATES, promotionStatus, promote, levelCheck } from '../career/CareerEngine.js';
import { getProfession } from '../career/JobTrees.js';

/** Ranks that promote off a civil-service list, by career. */
export const EXAM_RANKS = {
  police: ['sergeant', 'lieutenant', 'captain'],
  sheriff: ['sergeant', 'lieutenant', 'captain'],
  statePolice: ['sergeant', 'lieutenant', 'captain'],
  transitPolice: ['sergeant', 'lieutenant'],
  airportPolice: ['sergeant', 'lieutenant', 'captain'],
  universityPolice: ['sergeant', 'lieutenant'],
  airportFire: ['lieutenant', 'captain', 'battalion'],
  fire: ['lieutenant', 'captain', 'battalion'],
};
export const LIST_YEARS = 3;
/** Rank on the list you need to reach before you're promoted. */
export const REACHABLE = 2;

const isExamRank = (job, levelId) => (EXAM_RANKS[job?.professionId] ?? []).includes(levelId);

PROMO_GATES.push((state, job, level) => {
  if (!isExamRank(job, level.id)) return null;
  const entry = job.promoList?.[level.id];
  if (!entry || entry.expiresAge < state.character.age) return `Take the ${level.title.toLowerCase()}'s promotional exam`;
  if (entry.rank > REACHABLE) return `#${entry.rank} on the ${level.title.toLowerCase()}'s list — waiting for vacancies`;
  return null;
});

/** The exam you could sit next (the lowest civil-service rank above you). */
export function nextExam(job) {
  const p = job && getProfession(job.professionId);
  if (!p) return null;
  const ranks = EXAM_RANKS[job.professionId] ?? [];
  const cur = p.levels.find((l) => l.id === job.levelId);
  // A senior officer and a sergeant share a pay grade; moving into supervision still takes the exam.
  const above = (l) => l.grade > (cur?.grade ?? 0) || (l.grade === cur?.grade && cur.track !== 'mgmt' && l.id !== cur.id);
  return p.levels.filter((l) => ranks.includes(l.id) && above(l)).sort((a, b) => a.grade - b.grade)[0] ?? null;
}

/** Sit the exam: a written test plus an oral board. Returns the list entry. */
export function sitExam(ctx, { prep = false } = {}) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const level = nextExam(job);
  if (!level) return null;
  const score = Math.round(clamp(state.stats.smarts * 0.55 + job.performance * 0.25 + Math.min(10, job.yearsAtEmployer) + (prep ? 10 : 0) + rng.int(-12, 12), 40, 100));
  // A big department lists a hundred candidates; the top scores go first.
  const rank = Math.max(1, Math.round(((100 - score) / 2) * rng.float(0.8, 1.4)));
  job.promoList = { ...(job.promoList ?? {}), [level.id]: { rank, score, expiresAge: state.character.age + LIST_YEARS } };
  ctx.stat('stress', 4);
  ctx.log(`You scored ${score} on the ${level.title.toLowerCase()}'s exam and oral board — #${rank} on the eligibility list.${rank <= REACHABLE ? ' You\'re next up.' : rank <= 10 ? ' Promotions should reach you before it expires.' : ' The list may expire before it reaches you.'}`, '📝', rank <= 10 ? 'good' : 'warn');
  return job.promoList[level.id];
}

/** Each year the list moves as people retire, and you get promoted when it reaches you. */
export function listTick(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job?.promoList) return;
  for (const [levelId, e] of Object.entries(job.promoList)) {
    if (e.expiresAge < state.character.age) {
      delete job.promoList[levelId];
      ctx.log(`The ${levelId} list expired before it reached you. You'll have to test again.`, '📝', 'warn');
      continue;
    }
    e.rank = Math.max(1, e.rank - rng.int(2, 6));
  }
  const level = nextExam(job);
  const e = level && job.promoList[level.id];
  if (!e || e.rank > REACHABLE) return;
  // Reaching the top of the list means a seat opened for you; you still need the rank's requirements and time in grade.
  const status = promotionStatus(state);
  const reachable = status.all?.some((l) => l.id === level.id) && levelCheck(state, level).ok && !status.trainee && !status.tenureTrack;
  if (reachable && job.yearsInLevel >= 1 && promote(ctx, level.id)) delete job.promoList[level.id];
}
