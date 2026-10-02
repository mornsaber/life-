/**
 * Career core: eligibility (requirements, civil-service exams, background
 * checks), hiring and separation, pay (grade × step × size × locality ×
 * merit), annual evaluation, step increases, promotions across IC and
 * management tracks, demotions and termination, and income tax.
 *
 * Interactive pieces live in sibling files:
 *   InterviewSystem   applications, interviews, offers, SF-86
 *   WorkplaceActions  daily actions, promotion reviews, track switches
 *   ManagementEngine  departments, delegation           (supervisory levels)
 *   ContractingSystem direct staff vs. contractors
 *   UnionsAndLabor    union membership, CBAs, strikes, organizing drives
 */
import { commitmentLoad, isDeployed, hasFelony, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { getProfession } from './JobTrees.js';
import { levelById, entryLevels, nextLevels, previousLevel, ladderFor } from './Ladder.js';
import { stepIncrease, MAX_STEP, ratingLabel } from './PayGrades.js';
import { recalcSalary } from './Compensation.js';
import { resetBudget } from './Employers.js';
import { checkRequirements } from '../credentials/LicensingEngine.js';
import { hasClearance, examStatus, adjudicate, CLEARANCES, EXAMS } from '../publicservice/PublicServiceEngine.js';
import { educationFields } from '../education/Catalog.js';
import { ensureDepartment, departmentTick } from './ManagementEngine.js';
import { unionEmployeeTick } from './UnionsAndLabor.js';

/* ------------------------------------------------------------------ */
/* Tax                                                                 */
/* ------------------------------------------------------------------ */

export const STANDARD_DEDUCTION = 15000;
/** Failed senior (G7+) promotion reviews before you plateau at an employer. */
export const PLATEAU_AFTER = 3;
/** [upper bound of bracket, marginal rate] — single filer, simplified. */
export const TAX_BRACKETS = [
  [11925, 0.1],
  [48475, 0.12],
  [103350, 0.22],
  [197300, 0.24],
  [250525, 0.32],
  [626350, 0.35],
  [Infinity, 0.37],
];

export function calculateIncomeTax(gross) {
  let taxable = Math.max(0, gross - STANDARD_DEDUCTION);
  let lower = 0;
  let tax = 0;
  for (const [upper, rate] of TAX_BRACKETS) {
    if (taxable <= 0) break;
    const span = Math.min(taxable, upper - lower);
    tax += span * rate;
    taxable -= span;
    lower = upper;
  }
  return Math.round(tax);
}

/* ------------------------------------------------------------------ */
/* Requirements & eligibility                                          */
/* ------------------------------------------------------------------ */

/** Level requirements. A missing clearance is reported separately: it's granted through investigation. */
export function levelCheck(state, level) {
  const { clearance, ...rest } = level.req ?? {};
  const check = checkRequirements(state, rest);
  return { ok: check.ok, missing: check.missing, clearanceNeeded: clearance && !hasClearance(state, clearance) ? clearance : null };
}

export function backgroundCheck(state, profession) {
  const age = state.character.age;
  const felonies = state.legal.record.filter((r) => r.severity === 'felony');
  const recentMisd = state.legal.record.filter((r) => r.severity === 'misdemeanor' && age - r.age <= 5).length;
  if (profession.background === 'strict' && felonies.length) return { ok: false, reason: 'Fails background check (felony record)' };
  if (profession.background === 'standard' && felonies.some((f) => age - f.age <= 10)) return { ok: false, reason: 'Fails background check (recent felony)' };
  const penalty = profession.background === 'lenient' ? felonies.length * 0.05 : recentMisd * (profession.background === 'strict' ? 0.12 : 0.06);
  return { ok: true, penalty };
}

/** Highest entry level the candidate qualifies for at an employer of this size (ignoring clearance). */
export function bestEntryLevel(state, profession, size) {
  const candidates = entryLevels(profession, size).filter((l) => levelCheck(state, l).ok);
  return candidates.sort((a, b) => b.grade - a.grade)[0] ?? null;
}

export function applicationEligibility(state, professionId) {
  const profession = getProfession(professionId);
  if (state.character.age < profession.minAge) return { ok: false, reason: `Must be ${profession.minAge}+` };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (state.military.service?.component === 'active') return { ok: false, reason: 'On active duty' };
  if (state.career.job?.professionId === professionId) return { ok: false, reason: 'Already in this field' };
  const entry = checkRequirements(state, profession.entry);
  if (!entry.ok) return { ok: false, reason: `Needs ${entry.missing.join(', ')}` };
  if (profession.exam) {
    const exam = examStatus(state, profession.exam);
    if (!exam.passed) return { ok: false, reason: `Pass the ${EXAMS[profession.exam].name}` };
  }
  const bg = backgroundCheck(state, profession);
  if (!bg.ok) return bg;
  const sizeProbe = profession.sector === 'federal' ? 'large' : 'small';
  const level = bestEntryLevel(state, profession, sizeProbe) ?? bestEntryLevel(state, profession, 'enterprise');
  if (!level) {
    const first = profession.levels[0];
    return { ok: false, reason: `Needs ${levelCheck(state, first).missing.join(', ')}` };
  }
  return { ok: true, level };
}

/* ------------------------------------------------------------------ */
/* Pay                                                                 */
/* ------------------------------------------------------------------ */

/** Smallest step at a new grade that keeps pay from going backwards. */
function stepForAtLeast(state, job, minimum) {
  for (let step = 1; step <= MAX_STEP; step++) {
    job.step = step;
    if (recalcSalary(state, job) >= minimum) return step;
  }
  return MAX_STEP;
}

/* ------------------------------------------------------------------ */
/* Job lifecycle                                                       */
/* ------------------------------------------------------------------ */

function applyLevel(job, level) {
  job.levelId = level.id;
  job.title = level.title;
  job.track = level.track;
  job.grade = level.grade;
  job.abilities = [...level.abilities];
  job.clearance = level.req?.clearance ?? job.clearance ?? null;
  job.yearsInLevel = 0;
  job.peakGrade = Math.max(job.peakGrade ?? 0, level.grade);
}

export function hire(ctx, { professionId, levelId, employer, step = 1, merit = 0 }) {
  const { state } = ctx;
  if (state.career.job) leaveJob(ctx, 'Resigned for a new opportunity');
  const profession = getProfession(professionId);
  if (profession.dutyStation) ctx.emit('region:relocate', { regionId: profession.dutyStation, reason: `${employer.name} assigned you a duty station with government housing.` });

  const level = levelById(profession, levelId);
  const job = {
    professionId,
    sector: profession.sector,
    employer,
    remote: employer.remote,
    step,
    merit,
    posting: null,
    postingYears: 0,
    performance: 55,
    boss: 50,
    coworkers: 55,
    effort: 0,
    warnings: 0,
    lowYears: 0,
    yearsAtEmployer: 0,
    startAge: state.character.age,
    lastRaiseAge: state.character.age,
    unionMember: false,
    department: null,
    paidThisYear: false,
  };
  applyLevel(job, level);
  recalcSalary(state, job);
  ensureDepartment(job, level);
  state.career.job = job;

  ctx.log(`You were hired as ${level.title} [G${level.grade}] at ${employer.name} for $${job.salary.toLocaleString()}/yr.`, profession.icon, 'milestone');
  ctx.toast(`Hired: ${level.title}`, 'good');
  ctx.stat('happiness', 8);
  ctx.emit('career:hired', { job });
}

export function leaveJob(ctx, reason, { fired = false } = {}) {
  const { state } = ctx;
  const job = state.career.job;
  if (!job) return;
  state.career.history.push({
    professionId: job.professionId,
    title: job.title,
    levelId: job.levelId,
    employerName: job.employer.name,
    sector: job.sector,
    peakGrade: job.peakGrade,
    startAge: job.startAge,
    endAge: state.character.age,
    reason,
    fired,
  });
  state.career.job = null;
  if (fired) {
    ctx.log(`You were terminated by ${job.employer.name}. ${reason}`, '📦', 'bad');
    ctx.toast(`Terminated: ${job.employer.name}`, 'bad');
    ctx.stat('happiness', -15);
  } else {
    ctx.log(`You left your job as ${job.title} at ${job.employer.name}. ${reason}.`, '🚪');
  }
  ctx.emit('career:separated', { job, reason });
}

/* ------------------------------------------------------------------ */
/* Promotion & demotion                                                */
/* ------------------------------------------------------------------ */

export function promotionStatus(state) {
  const job = state.career.job;
  if (!job) return { eligible: false, reason: 'Unemployed', options: [], all: [] };
  const profession = getProfession(job.professionId);
  const level = levelById(profession, job.levelId);
  const all = nextLevels(profession, job.employer.size, job.levelId);
  if (!all.length) return { eligible: false, reason: 'Top of the ladder here', options: [], all };
  if ((job.passovers ?? 0) >= PLATEAU_AFTER) return { eligible: false, reason: `Passed over ${PLATEAU_AFTER}× — plateaued here (a new employer resets this)`, options: [], all, plateaued: true };
  if (job.yearsInLevel < level.years) {
    const left = level.years - job.yearsInLevel;
    return { eligible: false, reason: `${left} more year${left > 1 ? 's' : ''} in role`, options: [], all };
  }
  const options = all.filter((l) => levelCheck(state, l).ok);
  if (!options.length) return { eligible: false, reason: `Needs ${levelCheck(state, all[0]).missing.join(', ')}`, options, all };
  return { eligible: true, options, all };
}

/** Promote into `levelId`. Runs a clearance upgrade investigation when required. */
export function promote(ctx, levelId) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const profession = getProfession(job.professionId);
  const level = levelById(profession, levelId);
  const check = levelCheck(state, level);
  if (check.clearanceNeeded) {
    const honest = !state.publicService.clearance?.concealed;
    const result = adjudicate(state, check.clearanceNeeded, honest, rng);
    if (result.caught) {
      ctx.emit('legal:offense', { offenseId: 'falseStatement', context: 'clearance upgrade', caught: true });
      return false;
    }
    if (!result.granted) {
      ctx.log(`Your promotion to ${level.title} fell through: the ${CLEARANCES[check.clearanceNeeded].name} upgrade was denied.`, '🚫', 'bad');
      return false;
    }
    ctx.emit('clearance:grant', { level: check.clearanceNeeded, concealed: result.concealed });
  }
  const oldSalary = job.salary;
  applyLevel(job, level);
  stepForAtLeast(state, job, Math.round(oldSalary * 1.06));
  job.warnings = 0;
  job.lowYears = 0;
  job.passovers = 0;
  job.performance = Math.round(clamp(job.performance - 15, 40, 100));
  job.lastRaiseAge = state.character.age;
  ensureDepartment(job, level);
  ctx.log(`Promoted to ${level.title} [G${level.grade}]! New salary: $${job.salary.toLocaleString()}.`, '⬆️', 'good');
  ctx.toast(`Promoted: ${level.title}`, 'good');
  ctx.stat('happiness', 10);
  return true;
}

export function demote(ctx, reason) {
  const { state } = ctx;
  const job = state.career.job;
  const profession = getProfession(job.professionId);
  const prev = previousLevel(profession, job.employer.size, job.levelId);
  if (!prev) return false;
  applyLevel(job, prev);
  job.step = Math.max(1, job.step - 2);
  recalcSalary(state, job);
  job.warnings = 0;
  job.lowYears = 0;
  ensureDepartment(job, prev);
  ctx.log(`You were demoted to ${prev.title} [G${prev.grade}] (${reason}). Salary: $${job.salary.toLocaleString()}.`, '⬇️', 'bad');
  ctx.toast(`Demoted: ${prev.title}`, 'bad');
  ctx.stat('happiness', -10);
  return true;
}

/** Queue the interactive promotion review (resolved in WorkplaceActions). */
export function openPromotionReview(ctx, initiatedByPlayer = false) {
  const job = ctx.state.career.job;
  const { options } = promotionStatus(ctx.state);
  const target = options.length > 1 ? `${options.map((o) => o.title).join(' or ')}` : options[0].title;
  ctx.prompt({
    type: 'career.promotionReview',
    icon: '📋',
    title: 'Promotion Review',
    text: initiatedByPlayer
      ? `You asked for a shot at ${target}. Your boss closes the door and asks why you deserve it.`
      : `Your manager at ${job.employer.name} pulls you aside: "Leadership has their eye on you for ${target}. Make your case."`,
    options: [
      { id: 'results', label: '📊 Walk through your results', hint: 'Smarts + performance' },
      { id: 'team', label: '🤝 Credit the team, pitch your leadership', hint: 'Boss relationship' },
      { id: 'ultimatum', label: '🔥 Promote me or I walk', hint: 'High risk, high reward' },
    ],
    data: { initiatedByPlayer },
  });
}

/* ------------------------------------------------------------------ */
/* Annual evaluation                                                   */
/* ------------------------------------------------------------------ */

const PHYSICAL_FIELDS = ['police', 'fire', 'ems', 'trades', 'trucking', 'parkService', 'culinary', 'publicWorks'];

export function performanceTarget(state, rng, departmentEffect = 0) {
  const job = state.career.job;
  const physical = PHYSICAL_FIELDS.includes(job.professionId);
  const aptitude = physical ? state.stats.smarts * 0.15 + state.stats.fitness * 0.15 : state.stats.smarts * 0.3;
  const effort = Math.min(job.effort, 3) * 6;
  const stressPenalty = Math.max(0, state.stats.stress - 60) * 0.4;
  const overload = Math.max(0, commitmentLoad(state) - 3.5) * 2.5;
  const major = educationFields(state).has(job.professionId) ? 4 : 0;
  return 24 + aptitude + job.boss * 0.2 + job.coworkers * 0.05 + effort + major + departmentEffect + rng.int(-10, 10) - stressPenalty - overload;
}

export function careerOnAgeUp(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job) return;
  const profession = getProfession(job.professionId);
  job.paidThisYear = false;
  resetBudget(state, job.employer, job.sector);
  if (job.professionId === 'foreignService') job.postingYears += 1;

  if (isDeployed(state)) {
    ctx.log(`Your position at ${job.employer.name} is protected under USERRA while you're mobilized.`, '🛡️');
    job.effort = 0;
    return;
  }

  job.yearsInLevel += 1;
  job.yearsAtEmployer += 1;

  const departmentEffect = departmentTick(ctx, job);
  unionEmployeeTick(ctx, job);
  if (state.career.job !== job) return;

  // Pay (commission jobs swing with the market)
  recalcSalary(state, job);
  const gross = profession.commission ? Math.round(job.salary * rng.float(0.5, 1.6)) : job.salary;
  ctx.earn(gross, `${profession.commission ? 'Commissions' : 'Salary'} — ${job.title}`, { wage: true, ssCovered: job.employer.benefits.ssCovered });
  job.paidThisYear = true;
  if (profession.flightHoursPerYear) ctx.emit('logbook:add', { hours: profession.flightHoursPerYear });

  // Evaluation
  const target = performanceTarget(state, rng, departmentEffect);
  job.performance = Math.round(clamp(job.performance * 0.55 + target * 0.45, 0, 100));
  job.effort = 0;
  job.boss = Math.round(clamp(job.boss + (50 - job.boss) * 0.1 + (job.performance - 50) * 0.1, 0, 100));
  job.coworkers = Math.round(clamp(job.coworkers + (55 - job.coworkers) * 0.15, 0, 100));
  const rating = ratingLabel(job.performance);

  // Within-grade steps (and a small private-sector merit bump)
  const steps = stepIncrease(job.performance);
  if (steps && job.step < MAX_STEP) job.step = Math.min(MAX_STEP, job.step + steps);
  if (job.sector === 'private' && job.performance >= 80) job.merit = Math.round((job.merit + 0.01) * 1000) / 1000;
  recalcSalary(state, job);

  const status = promotionStatus(state);
  const grievanceLimit = job.unionMember ? 3 : 2;
  if (job.performance >= 75 && status.eligible) {
    job.lowYears = 0;
    ctx.log(`Annual review: ${rating} (${job.performance}%). You're up for promotion.`, '🌟', 'good');
    bumpYearly(state, 'career.requestPromotion');
    openPromotionReview(ctx);
  } else if (job.performance < 35) {
    job.warnings += 1;
    job.lowYears += 1;
    // Sustained low performance: demotion first, termination when there's nowhere lower to go.
    if (job.lowYears >= 2 && demote(ctx, `rated ${rating} two years running`)) return;
    if (job.warnings >= grievanceLimit || (job.performance < 12 && rng.chance(0.5))) {
      leaveJob(ctx, `Rated ${rating} after repeated warnings${job.unionMember ? ' (the union grievance failed)' : ''}.`, { fired: true });
      return;
    }
    ctx.log(`Annual review: ${rating} (${job.performance}%). HR issued a formal written warning (${job.warnings}/${grievanceLimit}).`, '⚠️', 'warn');
    ctx.stat('stress', 6);
  } else {
    job.lowYears = 0;
    if (job.performance >= 50) job.warnings = Math.max(0, job.warnings - 1);
    ctx.log(`Annual review at ${job.employer.name}: ${rating} (${job.performance}%). Step ${job.step}, $${job.salary.toLocaleString()}/yr.`, '📈');
  }
}

export { ladderFor, levelById, hasFelony, recalcSalary };
