/**
 * How police officers and firefighters are promoted, country by country.
 *
 *   list       (the US) a civil-service exam and oral board put you on a ranked eligibility list;
 *              the department promotes down it as seats open; lists expire after three years.
 *   qualify    (Britain and the Commonwealth) pass the sergeants' or inspectors' exam, then go
 *              before a selection board when a post comes up. Above that, boards alone.
 *   rankExam   (Japan, Korea, Taiwan, China) a hard written exam at every rank: a fifth pass.
 *   concours   (France, Italy, Spain, Brazil and others) a competitive exam with a fixed number
 *              of places for the officer and commissioner corps, then a year at the school.
 *   track      (Germany, Austria, Switzerland) careers run in tracks (Laufbahnen). Within one you
 *              rise by seniority and appraisal; crossing to the next needs selection and a degree.
 *   committee  (India, Pakistan, Nigeria and others) a departmental promotion committee goes
 *              by seniority: no exam, a long wait.
 *   board      everywhere else: ordinary promotion boards.
 *
 * job.promoList = { [levelId]: { rank, expiresAge, score } }   (list)
 * job.qualified = { [levelId]: age }                             (qualify, rankExam)
 * job.schooling = { levelId, until, kind }                       (concours, track)
 */
import { clamp } from '../../core/Random.js';
import { PROMO_GATES, promotionStatus, promote, levelCheck, levelYears } from '../career/CareerEngine.js';
import { getProfession } from '../career/JobTrees.js';
import { ladderFor, nextLevels } from '../career/Ladder.js';

/** Ranks that promote off a civil-service list, by career (the US). */
export const EXAM_RANKS = {
  police: ['sergeant', 'lieutenant', 'captain'],
  sheriff: ['sergeant', 'lieutenant', 'captain'],
  statePolice: ['sergeant', 'lieutenant', 'captain'],
  transitPolice: ['sergeant', 'lieutenant'],
  airportPolice: ['sergeant', 'lieutenant', 'captain'],
  universityPolice: ['sergeant', 'lieutenant'],
  airportFire: ['lieutenant', 'captain', 'battalion'],
  fire: ['lieutenant', 'captain', 'battalion'],
  stateFire: ['captain', 'battalion'],
};
export const LIST_YEARS = 3;
/** Rank on the list you need to reach before you're promoted. */
export const REACHABLE = 2;

const POLICE = new Set(['police', 'sheriff', 'statePolice', 'transitPolice', 'airportPolice', 'universityPolice']);
const FIRE = new Set(['fire', 'airportFire', 'stateFire']);
const familyOf = (job) => {
  const id = getProfession(job?.professionId)?.template ?? job?.professionId;
  return POLICE.has(id) ? 'police' : FIRE.has(id) ? 'fire' : null;
};

/** The tested (or schooled) ranks of each system, by family. */
const RANKS = {
  qualify: { police: ['sergeant', 'detSergeant', 'lieutenant', 'detLieutenant'], fire: ['lieutenant', 'captain'] },
  rankExam: { police: ['sergeant', 'detSergeant', 'lieutenant', 'detLieutenant', 'captain', 'detCaptain'], fire: ['lieutenant', 'captain', 'battalion'] },
  concours: { police: ['lieutenant', 'detLieutenant', 'superintendent_cmd1', 'chief_cmd1'], fire: ['captain', 'deputyChief'] },
  track: { police: ['investigator', 'lieutenant', 'detLieutenant', 'major'], fire: ['captain', 'deputyChief'] },
};
const COUNTRY_SYSTEM = {
  US: 'list',
  ...Object.fromEntries(['GB', 'IE', 'AU', 'NZ', 'CA', 'ZA', 'SG', 'MY', 'MT', 'CY', 'JM', 'TT', 'BS', 'BB'].map((c) => [c, 'qualify'])),
  ...Object.fromEntries(['JP', 'KR', 'TW', 'CN'].map((c) => [c, 'rankExam'])),
  ...Object.fromEntries(['FR', 'IT', 'ES', 'PT', 'BE', 'LU', 'GR', 'RO', 'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'MA', 'DZ', 'TN', 'SN', 'CI'].map((c) => [c, 'concours'])),
  ...Object.fromEntries(['DE', 'AT', 'CH'].map((c) => [c, 'track'])),
  ...Object.fromEntries(['IN', 'PK', 'BD', 'LK', 'NP', 'NG', 'KE', 'GH', 'UG', 'TZ', 'EG', 'PH'].map((c) => [c, 'committee'])),
};
const ccOf = (state) => state?.character?.countryId ?? 'US';

/** The promotion system for this job here: { kind, ranks }. */
export function systemOf(job, state) {
  const fam = familyOf(job);
  if (!fam) return { kind: 'board', ranks: [] };
  const kind = COUNTRY_SYSTEM[ccOf(state)] ?? 'board';
  if (kind === 'list') return { kind, ranks: EXAM_RANKS[job.professionId] ?? EXAM_RANKS[fam === 'fire' ? 'fire' : 'police'] };
  return { kind, ranks: RANKS[kind]?.[fam] ?? [] };
}

/** The track a German rank opens (for names). */
const TRACK = { investigator: 'gehobener', lieutenant: 'gehobener', captain: 'gehobener', detLieutenant: 'höherer', major: 'höherer', deputyChief: 'höherer' };
/** What the exam or course for this rank is called. */
export function examName(state, job, level) {
  const { kind } = systemOf(job, state);
  const t = level.title.replace(/\s*\(.*\)$/, '');
  if (kind === 'list') return `the ${t.toLowerCase()}'s promotional exam`;
  if (kind === 'qualify') return /sergeant/i.test(t) ? 'the sergeants\' exam' : /inspector/i.test(t) ? 'the inspectors\' exam' : `the ${t.toLowerCase()} exam`;
  if (kind === 'rankExam') return `the ${t} promotion exam`;
  if (kind === 'concours') return `the concours for ${t}`;
  if (kind === 'track') return TRACK[level.id] === 'höherer' ? 'selection for the höherer Dienst (a two-year master\'s at the police university)' : 'the Aufstieg to the gehobener Dienst (selection and a three-year police degree)';
  return 'a promotion board';
}

/* ------------------------------------------------------------------ */
/* Gates                                                               */
/* ------------------------------------------------------------------ */

PROMO_GATES.push((state, job, level) => {
  const sys = systemOf(job, state);
  if (sys.kind === 'committee') {
    const cur = getProfession(job.professionId)?.levels.find((l) => l.id === job.levelId);
    const need = (cur ? levelYears(job, cur) ?? 3 : 3) + 2;
    const left = need - (job.yearsInLevel ?? 0);
    return left > 0 ? `The promotion committee goes by seniority: ${left} more year${left === 1 ? '' : 's'} in rank` : null;
  }
  if (!sys.ranks.includes(level.id)) return null;
  const name = examName(state, job, level);
  if (sys.kind === 'list') {
    const entry = job.promoList?.[level.id];
    if (!entry || entry.expiresAge < state.character.age) return `Take ${name}`;
    if (entry.rank > REACHABLE) return `#${entry.rank} on the ${level.title.toLowerCase()}'s list — waiting for vacancies`;
    return null;
  }
  if (sys.kind === 'qualify' || sys.kind === 'rankExam') return job.qualified?.[level.id] != null ? null : `Pass ${name}`;
  // Concours and tracks: the only way in is the school.
  if (job.schooling?.levelId === level.id) return `In training: promoted at ${job.schooling.until}`;
  return `Win a place through ${name}`;
});

/* ------------------------------------------------------------------ */
/* The exam                                                            */
/* ------------------------------------------------------------------ */

/**
 * The exam you could sit next: the lowest tested rank above you *that this agency has*.
 * A small department with no lieutenants tests straight for captain.
 */
export function nextExam(job, state = null) {
  const p = job && getProfession(job.professionId);
  if (!p) return null;
  const sys = systemOf(job, state);
  if (!sys.ranks.length || job.schooling) return null;
  const ranks = sys.ranks;
  const ladder = ladderFor(p, job.employer?.size);
  // The rank you'd actually be promoted into next, when it's a tested one (a detective
  // crossing into management tests for the rank the ladder leads to, not one below it).
  const direct = nextLevels(p, job.employer?.size, job.levelId).filter((l) => ranks.includes(l.id)).sort((a, b) => a.grade - b.grade)[0];
  const cur = p.levels.find((l) => l.id === job.levelId);
  // A senior officer and a sergeant share a pay grade; moving into supervision still takes the exam.
  const above = (l) => l.grade > (cur?.grade ?? 0) || (l.grade === cur?.grade && cur.track !== 'mgmt' && l.id !== cur.id);
  const level = direct ?? ladder.filter((l) => ranks.includes(l.id) && above(l)).sort((a, b) => a.grade - b.grade)[0] ?? null;
  // Already qualified for the next rank: you wait for a post, and test for the one after once you hold it.
  return level && job.qualified?.[level.id] != null ? null : level;
}

/** Can you apply for the school (concours, track) this year? */
export function schoolEligibility(state, job) {
  const { kind } = systemOf(job, state);
  if (kind === 'track' && (job.yearsAtEmployer ?? 0) < 4) return { ok: false, reason: 'Four years in the service first' };
  if (kind === 'track' && (job.performance ?? 55) < 60) return { ok: false, reason: 'Your appraisals need to be good (60+) to be put forward' };
  if (kind === 'concours' && (job.yearsAtEmployer ?? 0) < 2) return { ok: false, reason: 'Two years in the service before the internal concours' };
  return { ok: true };
}

/** Sit the exam (or apply for the school). Returns the outcome. */
export function sitExam(ctx, { prep = false } = {}) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const level = nextExam(job, state);
  if (!level) return null;
  const sys = systemOf(job, state);
  const name = examName(state, job, level);
  const score = Math.round(clamp(state.stats.smarts * 0.55 + job.performance * 0.25 + Math.min(10, job.yearsAtEmployer) + (prep ? 10 : 0) + rng.int(-12, 12), 40, 100));
  ctx.stat('stress', 4);
  if (sys.kind === 'list') {
    // A big department lists a hundred candidates; the top scores go first.
    const rank = Math.max(1, Math.round(((100 - score) / 2) * rng.float(0.8, 1.4)));
    job.promoList = { ...(job.promoList ?? {}), [level.id]: { rank, score, expiresAge: state.character.age + LIST_YEARS } };
    ctx.log(`You scored ${score} on ${name} and oral board — #${rank} on the eligibility list.${rank <= REACHABLE ? ' You\'re next up.' : rank <= 10 ? ' Promotions should reach you before it expires.' : ' A long way down; it may expire first.'}`, '📝', rank <= 10 ? 'good' : 'info');
    return job.promoList[level.id];
  }
  if (sys.kind === 'qualify' || sys.kind === 'rankExam') {
    const pass = sys.kind === 'rankExam' ? 76 : 62;
    if (score >= pass) {
      job.qualified = { ...(job.qualified ?? {}), [level.id]: state.character.age };
      ctx.log(`You passed ${name} (${score}).${sys.kind === 'rankExam' ? ' Most who sat it didn\'t.' : ''} Now you need a post to come up and a board to pick you.`, '📝', 'good');
    } else ctx.log(`You failed ${name} (${score}; the pass mark was ${pass}). Next year.`, '📝', 'warn');
    return { score, pass: score >= pass };
  }
  // Concours and tracks: a place at the school, then promotion when you finish.
  const ok = schoolEligibility(state, job);
  if (!ok.ok) { ctx.toast(ok.reason, 'warn'); return null; }
  const cut = sys.kind === 'concours' ? 72 : 66;
  if (score >= cut) {
    const years = sys.kind === 'concours' ? 1 : TRACK[level.id] === 'höherer' ? 2 : 3;
    job.schooling = { levelId: level.id, until: state.character.age + years, kind: sys.kind };
    ctx.log(`You won a place through ${name} (${score}). ${years} year${years === 1 ? '' : 's'} of training, then the rank.`, '🎓', 'good');
  } else ctx.log(`You missed the cut in ${name} (${score}; places went to ${cut}+). You can try again next year.`, '📝', 'warn');
  return { score, pass: score >= cut };
}

/** Each year: the list moves, the school finishes. */
export function listTick(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job) return;
  // Training done: the rank is yours.
  if (job.schooling && state.character.age >= job.schooling.until) {
    const { levelId } = job.schooling;
    job.schooling = null;
    if (promote(ctx, levelId)) ctx.log('You finished the course and took up your new rank.', '🎓', 'milestone');
    return;
  }
  if (!job.promoList) return;
  for (const [levelId, e] of Object.entries(job.promoList)) {
    if (e.expiresAge < state.character.age) {
      delete job.promoList[levelId];
      ctx.log(`The ${levelId} list expired before it reached you. You'll have to test again.`, '📝', 'warn');
      continue;
    }
    e.rank = Math.max(1, e.rank - rng.int(2, 6));
  }
  const level = nextExam(job, state);
  const e = level && job.promoList[level.id];
  if (!e || e.rank > REACHABLE) return;
  // Reaching the top of the list means a seat opened for you; you still need the rank's requirements and time in grade.
  const status = promotionStatus(state);
  const reachable = status.all?.some((l) => l.id === level.id) && levelCheck(state, level).ok && !status.trainee && !status.tenureTrack;
  if (reachable && job.yearsInLevel >= 1 && promote(ctx, level.id)) delete job.promoList[level.id];
}

/* ------------------------------------------------------------------ */
/* Brazil: two police forces                                           */
/* ------------------------------------------------------------------ */

// The Military Police (patrol) and the Civil Police (investigation) are separate forces, each
// joined by its own concurso: a PM soldier isn't promoted into a Civil Police investigator.
PROMO_GATES.push((state, job, level) => {
  if (ccOf(state) !== 'BR' || job.professionId !== 'statePolice' || level.track !== 'ic') return null;
  const cur = getProfession(job.professionId)?.levels.find((l) => l.id === job.levelId);
  return cur && cur.track !== 'ic' ? 'The Polícia Civil is a separate force: it recruits by its own concurso' : null;
});
