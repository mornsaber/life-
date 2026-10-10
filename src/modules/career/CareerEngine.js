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
import { commitmentLoad, isDeployed, hasFelony, bumpYearly, visibleRecord } from '../../core/State.js';
import { unemploymentBenefit, severancePay } from '../world/CountryLaw.js';
import { sssBarred } from '../service/Volunteering.js';
import { clamp } from '../../core/Random.js';
import { getProfession } from './JobTrees.js';
import { levelById, entryLevels, nextLevels, previousLevel, ladderFor } from './Ladder.js';
import { veteranLevel } from './VeteranPlacement.js';
import { publicRifTick, recallTick, rifResolvers } from './PublicRif.js';
import { unitFor } from './Units.js';
import { stepIncrease, MAX_STEP, ratingLabel } from './PayGrades.js';
import { recalcSalary } from './Compensation.js';
import { resetBudget, resolveDutyStation } from './Employers.js';
import { checkRequirements } from '../credentials/LicensingEngine.js';
import { hasClearance, examStatus, adjudicate, CLEARANCES, EXAMS } from '../publicservice/PublicServiceEngine.js';
import { educationFields } from '../education/Catalog.js';
import { ensureDepartment, departmentTick } from './ManagementEngine.js';
import { unionEmployeeTick } from './UnionsAndLabor.js';
import { historyOrgFields, chainOfCommand } from '../org/Organizations.js';
import { syncPostForLevel, leavePost, nextPost } from '../org/Executives.js';
import { vacancyTick, hasOpening, openingReason, claimOpening, computeOpenings } from '../org/Vacancies.js';
import { probationYears, isTenured, traineeProgram, runAcademy, TENURE_PROFESSIONS, USERRA_YEARS, PROBATION_BAR } from './Tenure.js';
import { isAbroad, US_ONLY, informality, countryOf, isCitizen } from '../world/Countries.js';
import { residencyOf } from '../world/Immigration.js';

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
/** Years a level takes — residency length depends on the physician's specialty. */
export const levelYears = (job, level) => (level.id === 'resident' && job.residencyYears ? job.residencyYears : level.years);

export function levelCheck(state, level) {
  const { clearance, ...rest } = level.req ?? {};
  const check = checkRequirements(state, rest);
  return { ok: check.ok, missing: check.missing, clearanceNeeded: clearance && !hasClearance(state, clearance) ? clearance : null };
}

export function backgroundCheck(state, profession) {
  const age = state.character.age;
  const record = visibleRecord(state);
  const felonies = record.filter((r) => r.severity === 'felony');
  const recentMisd = record.filter((r) => r.severity === 'misdemeanor' && age - r.age <= 5).length;
  if (profession.background === 'strict' && felonies.length) return { ok: false, reason: 'Fails background check (felony record)' };
  if (profession.background === 'standard' && felonies.some((f) => age - f.age <= 10)) return { ok: false, reason: 'Fails background check (recent felony)' };
  const penalty = profession.background === 'lenient' ? felonies.length * 0.05 : recentMisd * (profession.background === 'strict' ? 0.12 : 0.06);
  return { ok: true, penalty };
}

/** Highest entry level the candidate qualifies for at an employer of this size (ignoring clearance). */
export function bestEntryLevel(state, profession, size) {
  const candidates = entryLevels(profession, size).filter((l) => levelCheck(state, l).ok);
  const base = candidates.sort((a, b) => b.grade - a.grade)[0] ?? null;
  // Related military service (or senior leadership) can start you higher.
  const vet = base && veteranLevel(state, profession, size, base, (l) => levelCheck(state, l).ok);
  return vet && vet.level.grade >= base.grade ? vet.level : base;
}

/** Why you'd start above the normal entry level, if you would. */
export function veteranPlacementNote(state, profession, size) {
  const base = entryLevels(profession, size).filter((l) => levelCheck(state, l).ok).sort((a, b) => b.grade - a.grade)[0];
  const vet = base && veteranLevel(state, profession, size, base, (l) => levelCheck(state, l).ok);
  return vet ? `${vet.reason}: start as ${vet.level.title} instead of ${base.title}` : null;
}

export function applicationEligibility(state, professionId) {
  const profession = getProfession(professionId);
  if (state.character.age < profession.minAge) return { ok: false, reason: `Must be ${profession.minAge}+` };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (residencyOf(state)?.status === 'visa' && residencyOf(state).visa === 'retiree') return { ok: false, reason: 'Your retiree visa doesn\'t allow work' };
  if (profession.country) {
    // A national government job: your country of residence, and its citizens only.
    if ((state.character.countryId ?? 'US') !== profession.country) return { ok: false, reason: 'A job in another country' };
    if (!isCitizen(state, profession.country)) return { ok: false, reason: 'Open to citizens only' };
    if (profession.country === 'MX' && state.character.gender === 'male' && !state.military.cartilla) return { ok: false, reason: 'Needs your Servicio Militar cartilla' };
  } else if (profession.sector === 'federal' && (isAbroad(state) || !isCitizen(state, 'US'))) return { ok: false, reason: US_ONLY.federalJobs };
  if (state.military.service?.component === 'active') return { ok: false, reason: 'On active duty' };
  if (state.politics.office?.fullTime) return { ok: false, reason: 'You hold full-time elected office' };
  if (state.judiciary?.seat) return { ok: false, reason: 'Judges can\'t hold another job' };
  if (profession.sector === 'federal' && state.politics.campaign) return { ok: false, reason: 'Hatch Act: you\'re running for office' };
  if (profession.sector === 'federal' && sssBarred(state)) return { ok: false, reason: 'Never registered with the Selective Service (request a status letter on the Military tab)' };
  if (state.career.job?.professionId === professionId) return { ok: false, reason: 'Already in this field' };
  const entry = checkRequirements(state, profession.entry);
  if (!entry.ok) return { ok: false, reason: `Needs ${entry.missing.join(', ')}` };
  if (profession.exam) {
    const exam = examStatus(state, profession.exam);
    if (!exam.passed) return { ok: false, reason: `Pass the ${EXAMS[profession.exam].name}` };
  }
  const bg = backgroundCheck(state, profession);
  if (!bg.ok) return bg;
  if (profession.eligible) {
    const extra = profession.eligible(state);
    if (!extra.ok) return extra;
  }
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
export function stepForAtLeast(state, job, minimum) {
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
  job.title = job.titleMap?.[level.id] ?? level.title;
  job.track = level.track;
  job.grade = level.grade;
  job.abilities = [...level.abilities];
  job.clearance = level.req?.clearance ?? job.clearance ?? null;
  job.yearsInLevel = 0;
  job.peakGrade = Math.max(job.peakGrade ?? 0, level.grade);
}

export function hire(ctx, { professionId, levelId, employer, step = 1, merit = 0 }) {
  const { state } = ctx;
  // Full-time active duty is your job: offers that arrive while you're in uniform lapse.
  if (state.military.service?.component === 'active') {
    ctx.toast('You are on active duty and can\'t take a civilian job.', 'warn');
    return null;
  }
  if (state.career.job) leaveJob(ctx, 'Resigned for a new opportunity');
  if (state.career.leave) endMilitaryLeave(ctx, 'Took a new job instead of returning from military leave');
  const profession = getProfession(professionId);
  const station = resolveDutyStation(ctx.rng, profession, state.character.regionId);
  if (station) ctx.emit('region:relocate', { regionId: station, reason: `${employer.name} assigned your duty station${employer.benefits.housing ? ' (government housing provided)' : ''}.` });

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
  profession.prepare?.(state, job);
  // Abroad, many private jobs are informal: cash pay, no contract, no benefits (Mexico, the Philippines, India).
  const informalShare = informality(countryOf(state));
  if (informalShare && profession.sector === 'private' && !profession.dutyStation) {
    const bySize = { micro: 1.5, small: 1.4, medium: 0.9, large: 0.4, enterprise: 0.15, mega: 0.1 }[employer.size] ?? 1;
    if (ctx.rng.chance(Math.min(0.95, informalShare * bySize))) {
      job.informal = true;
      job.employer = { ...employer, benefits: { ...employer.benefits, health: false, pension: null, match: 0, dcPlan: null, tuition: 0 } };
    }
  }
  applyLevel(job, level);
  recalcSalary(state, job);
  ensureDepartment(job, level);
  state.career.job = job;
  // Reaching a level that *is* a department or organization head makes you that head.
  syncPostForLevel(ctx, job);
  job.supervisorId = chainOfCommand(state, job)?.supervisor?.id ?? null;
  computeOpenings(state, job);
  const program = traineeProgram(job);
  // Trainees start probation when they graduate.
  job.probationLeft = program || isTenured(job) ? 0 : probationYears(profession);

  ctx.log(`You were hired as ${job.title} [G${level.grade}] at ${employer.name} for $${job.salary.toLocaleString()}/yr.${job.probationLeft ? ` Probationary period: ${job.probationLeft} yr.` : ''}`, profession.icon, 'milestone');
  ctx.toast(`Hired: ${job.title}`, 'good');
  ctx.stat('happiness', 8);
  ctx.emit('career:hired', { job });
  if (program?.academy) {
    const next = levelById(profession, program.next);
    if (next) {
      ctx.log(`${employer.name} enrolled you in ${program.label}.`, '🎓');
      runAcademy(ctx, next);
    }
  }
  return state.career.job;
}

/* ------------------------------------------------------------------ */
/* Military leave (USERRA)                                             */
/* ------------------------------------------------------------------ */

/** Active duty: the civilian job is held for you instead of ending. */
export function startMilitaryLeave(ctx, reason) {
  const { state } = ctx;
  const job = state.career.job;
  if (!job) return;
  state.career.leave = { job, startAge: state.character.age, regionId: state.character.regionId, reason };
  state.career.job = null;
  ctx.emit('unions:sync', {});
  ctx.log(`${job.employer.name} placed you on military leave (${reason}). USERRA protects your job for up to ${USERRA_YEARS} years of service.`, '🛡️', 'milestone');
}

/** Give up the held job (new job, expired rights, declined to return). */
export function endMilitaryLeave(ctx, reason) {
  const { state } = ctx;
  const leave = state.career.leave;
  if (!leave) return;
  const current = state.career.job;
  state.career.leave = null;
  state.career.job = leave.job;
  leaveJob(ctx, reason);
  state.career.job = current;
  ctx.emit('unions:sync', {});
}

/** Return from service: the "escalator" — seniority, steps and pension credit as if you never left. */
export function returnFromLeave(ctx) {
  const { state } = ctx;
  const leave = state.career.leave;
  if (!leave || state.military.service?.component === 'active' || state.legal.incarceration) return false;
  if (state.career.job) {
    endMilitaryLeave(ctx, 'Did not return from military leave');
    return false;
  }
  const years = Math.max(0, state.character.age - leave.startAge);
  const job = leave.job;
  state.career.leave = null;
  if (leave.regionId && leave.regionId !== state.character.regionId && !job.remote) {
    ctx.emit('region:relocate', { regionId: leave.regionId, reason: `You moved back to return to ${job.employer.name}.` });
  }
  job.yearsAtEmployer += years;
  job.yearsInLevel += years;
  job.step = Math.min(MAX_STEP, job.step + years);
  job.probationLeft = 0;
  resetBudget(state, job.employer, job.sector);
  state.career.job = job;
  recalcSalary(state, job);
  const planId = job.employer.benefits.pension;
  if (planId) for (let i = 0; i < years; i++) ctx.emit('retirement:accrue', { planId, salary: job.salary, employer: job.employer.name });
  ctx.log(`You returned to ${job.employer.name} as ${job.title}: ${years} year${years === 1 ? '' : 's'} of seniority${planId ? ' and pension credit' : ''} for your service. $${job.salary.toLocaleString()}/yr.`, '🛡️', 'good');
  ctx.emit('career:hired', { job, returning: true });
  return true;
}

/** When active duty ends, offer the job back. */
export function offerReturn(ctx) {
  const { state } = ctx;
  const leave = state.career.leave;
  if (!leave || state.prompts.some((p) => p.type === 'career.userra')) return;
  ctx.prompt({
    type: 'career.userra',
    icon: '🛡️',
    title: 'Your Old Job Is Waiting',
    text: `Under USERRA, ${leave.job.employer.name} must rehire you as ${leave.job.title} with the seniority you would have earned.`,
    options: [
      { id: 'return', label: `🏢 Return to ${leave.job.employer.name}` },
      { id: 'decline', label: '🚪 Move on to something new' },
    ],
  });
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
    ...historyOrgFields(job, fired),
    headed: job.headOf ? (job.headOf.deptId ? 'dept' : 'org') : job.headedBefore ?? null,
  });
  if (job.headOf) leavePost(state, job);
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

/** Extra years at the top of one track before competing for the other. */
export const CROSS_TRACK_YEARS = 6;

/** (state, job, level) → reason a rung is held back, or null. */
export const PROMO_GATES = [];

export function promotionStatus(state) {
  const job = state.career.job;
  if (!job) return { eligible: false, reason: 'Unemployed', options: [], all: [] };
  const profession = getProfession(job.professionId);
  const level = levelById(profession, job.levelId);
  const next = nextLevels(profession, job.employer.size, job.levelId);
  const all = next.filter((l) => !l.appointed);
  if (!next.length) {
    const post = nextPost(state, job);
    const reason = post ? `Top of the ladder — next: ${post.def.title}, ${post.def.appointedBy ? `appointed by ${post.def.appointedBy}` : 'chosen by the board'} when the post opens` : job.headOf ? `You lead ${job.headOf.deptId ? 'the department' : 'the organization'}` : 'Top of the ladder here';
    return { eligible: false, reason, options: [], all, nextPost: post };
  }
  const program = traineeProgram(job);
  if (program) {
    const target = levelById(profession, program.next);
    const left = Math.max(0, level.years - job.yearsInLevel);
    return { eligible: false, reason: `Finish ${program.label} — ${left ? `${left} yr to go, then ` : ''}automatic promotion to ${target?.title ?? 'the next level'}`, options: [], all, trainee: program };
  }
  // Tenure-track faculty move up only through the tenure review (academia module).
  if (level.tenureReview) {
    const left = Math.max(0, level.years - job.yearsInLevel);
    return { eligible: false, reason: left ? `Tenure review in ${left} yr${left > 1 ? 's' : ''}` : 'Your tenure case is under review', options: [], all, tenureTrack: true };
  }
  if (!all.length) return { eligible: false, reason: `The next post is appointed by ${next[0].appointedBy ?? 'the governor'}`, options: [], all, appointable: next };
  if ((job.passovers ?? 0) >= PLATEAU_AFTER) return { eligible: false, reason: `Passed over ${PLATEAU_AFTER}× — plateaued here (a new employer resets this)`, options: [], all, plateaued: true };
  if (job.yearsInLevel < levelYears(job, level)) {
    const left = level.years - job.yearsInLevel;
    return { eligible: false, reason: `${left} more year${left > 1 ? 's' : ''} in role`, options: [], all };
  }
  // Crossing from the end of a specialist track into management (or back) takes extra seniority and a strong record.
  const crossing = all.filter((l) => level.track !== 'shared' && l.track !== level.track);
  if (crossing.length && crossing.length === all.length && (job.yearsInLevel < levelYears(job, level) + CROSS_TRACK_YEARS || job.performance < 75)) {
    const left = Math.max(0, levelYears(job, level) + CROSS_TRACK_YEARS - job.yearsInLevel);
    return { eligible: false, reason: left ? `Top of your track — ${left} more year${left > 1 ? 's' : ''} before you can compete for ${crossing[0].title}` : `Top of your track — a strong record (75+) to compete for ${crossing[0].title}`, options: [], all };
  }
  const checked = all.filter((l) => levelCheck(state, l).ok);
  if (!checked.length) return { eligible: false, reason: `Needs ${levelCheck(state, all[0]).missing.join(', ')}`, options: checked, all };
  // Other modules can hold a rung back (civil-service promotional lists, …).
  const gated = checked.map((l) => ({ l, why: PROMO_GATES.map((g) => g(state, job, l)).find(Boolean) }));
  const qualified = gated.filter((x) => !x.why).map((x) => x.l);
  if (!qualified.length) return { eligible: false, reason: gated[0].why, options: qualified, all, gated: true };
  // Promotions need an open seat.
  const options = qualified.filter((l) => hasOpening(job, l));
  if (!options.length) return { eligible: false, reason: openingReason(job, qualified[0]), options, all, noOpening: true };
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
  claimOpening(state, job, level.id);
  syncPostForLevel(ctx, job);
  job.supervisorId = chainOfCommand(state, job)?.supervisor?.id ?? null;
  computeOpenings(state, job);
  ctx.log(`Promoted to ${job.title} [G${level.grade}]! New salary: $${job.salary.toLocaleString()}.`, '⬆️', 'good');
  ctx.toast(`Promoted: ${job.title}`, 'good');
  ctx.stat('happiness', 10);
  return true;
}

export function demote(ctx, reason) {
  const { state } = ctx;
  const job = state.career.job;
  // A head post above the ladder: you lose the post and return to your previous rank.
  if (job.headOf && !job.headOf.mapped) {
    const title = job.headOf.title;
    leavePost(state, job);
    ensureDepartment(job, levelById(getProfession(job.professionId), job.levelId));
    recalcSalary(state, job);
    ctx.log(`You were removed as ${title} (${reason}) and returned to your role as ${job.title}.`, '⬇️', 'bad');
    ctx.toast(`Removed as ${title}`, 'bad');
    ctx.stat('happiness', -10);
    return true;
  }
  const profession = getProfession(job.professionId);
  const prev = previousLevel(profession, job.employer.size, job.levelId);
  if (!prev) return false;
  applyLevel(job, prev);
  job.step = Math.max(1, job.step - 2);
  recalcSalary(state, job);
  job.warnings = 0;
  job.lowYears = 0;
  ensureDepartment(job, prev);
  job.supervisorId = chainOfCommand(state, job)?.supervisor?.id ?? null;
  ctx.log(`You were demoted to ${job.title} [G${prev.grade}] (${reason}). Salary: $${job.salary.toLocaleString()}.`, '⬇️', 'bad');
  ctx.toast(`Demoted: ${job.title}`, 'bad');
  ctx.stat('happiness', -10);
  return true;
}

/* ------------------------------------------------------------------ */
/* Layoffs                                                             */
/* ------------------------------------------------------------------ */

const LAYOFF_RATE = { expansion: 0.01, peak: 0.015, recession: 0.09, recovery: 0.03 };

/** Annual reduction-in-force risk. Returns true if you were laid off. */
export function layoffRisk(state, job) {
  let risk = 0;
  if (job.sector === 'private') risk = LAYOFF_RATE[state.economy.phase] * (state.economy.phase === 'recession' ? getProfession(job.professionId).cyclical ?? 1 : 1);
  // Government jobs are cut through a formal reduction in force instead (PublicRif).
  if (job.abilities.includes('tenure')) risk = 0;
  else if (job.tenured) risk *= 0.3;
  if (job.probationLeft > 0) risk *= 1.5; // last in, first out
  if (job.informal) risk *= 1.6; // no contract, no notice
  if (job.unionMember && job.yearsAtEmployer >= 5) risk *= 0.3; // seniority
  if (job.performance >= 80) risk *= 0.5;
  if (job.performance < 40) risk *= 1.5;
  return risk;
}

function layoffCheck(ctx, job) {
  if (!ctx.rng.chance(layoffRisk(ctx.state, job))) return false;
  const severance = severancePay(ctx.state.character.countryId, job.salary, job.yearsAtEmployer);
  const ui = unemploymentBenefit(ctx.state.character.countryId, job.salary);
  leaveJob(ctx, 'Laid off in a reduction in force');
  if (severance) ctx.earn(severance, 'Severance pay', { wage: true });
  ctx.earn(ui.amount, ui.name);
  ctx.toast('Laid off', 'bad');
  ctx.stat('happiness', -10);
  ctx.stat('stress', 10);
  return true;
}

/** Another employer in your field offers the post you can't get at home. */
export function outsidePromotionOffer(ctx, job, profession) {
  const { state } = ctx;
  if (state.prompts.some((p) => p.type === 'career.outsidePromotion')) return;
  const target = nextLevels(profession, job.employer.size, job.levelId).find((l) => !l.appointed && levelCheck(state, l).ok && !levelCheck(state, l).clearanceNeeded);
  if (!target) return;
  ctx.prompt({
    type: 'career.outsidePromotion',
    icon: '🪜',
    title: 'Promotion — Somewhere Else',
    text: `There's no ${target.title} opening at ${job.employer.name}, but another ${profession.sector === 'private' ? 'employer' : 'agency'} in your field has one, and they want you. You'd start over on seniority${profession.sector === 'private' ? '' : ' and serve a new probation'}.`,
    options: [
      { id: 'accept', label: `🪜 Take the ${target.title} job` },
      { id: 'stay', label: `🏠 Stay at ${job.employer.name} and wait` },
    ],
    data: { levelId: target.id },
  });
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

const PHYSICAL_FIELDS = ['police', 'fire', 'stateFire', 'airportFire', 'ems', 'privateEms', 'trades', 'trucking', 'parkService', 'culinary', 'publicWorks'];

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

/** Graduates trainees whose next level is unlocked; lets go of those past the deadline. Returns true if the job ended. */
function traineeTick(ctx, job, profession, program) {
  const { state } = ctx;
  const level = levelById(profession, job.levelId);
  const next = levelById(profession, program.next);
  if (!next) return false;
  if (program.academy) runAcademy(ctx, next);
  if (job.yearsInLevel < levelYears(job, level)) return false;
  const check = levelCheck(state, next);
  if (check.ok) {
    if (promote(ctx, next.id)) {
      job.probationLeft = probationYears(profession);
      ctx.log(`You completed ${program.label}.${job.probationLeft ? ` Probation: ${job.probationLeft} yr.` : ''}`, '🎓', 'milestone');
    }
    return false;
  }
  const left = level.years + program.grace - job.yearsInLevel;
  if (left <= 0) {
    leaveJob(ctx, `You didn't complete ${program.label} in time (still missing ${check.missing.join(', ')})`, { fired: true });
    return true;
  }
  ctx.log(`You still need ${check.missing.join(', ')} to finish ${program.label}. ${left} year${left > 1 ? 's' : ''} left before you're let go.`, '⏳', 'warn');
  return false;
}

export function careerOnAgeUp(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const leave = state.career.leave;
  if (leave && state.character.age - leave.startAge > USERRA_YEARS && state.military.service?.component === 'active') {
    endMilitaryLeave(ctx, `Your USERRA reemployment rights ran out after ${USERRA_YEARS} years of service`);
  }
  // Laid off in a RIF: the agency may call you back.
  if (!job) {
    recallTick(ctx, RIF_DEPS);
    return;
  }
  const profession = getProfession(job.professionId);
  // Older saves: give a command rank its unit, once.
  if (job.department && !job.department.unitChecked) {
    job.department.unitChecked = true;
    const lvl = levelById(profession, job.levelId);
    if (lvl && unitFor(job, lvl, profession)) ensureDepartment(job, lvl);
  }
  chainOfCommand(state, job);
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
  vacancyTick(ctx, job);

  const departmentEffect = departmentTick(ctx, job);
  unionEmployeeTick(ctx, job);
  if (state.career.job !== job) return;

  // Pay (commission jobs swing with the market)
  recalcSalary(state, job);
  const gross = profession.commission ? Math.round(job.salary * rng.float(0.5, 1.6)) : job.salary;
  ctx.earn(gross, `${profession.commission ? 'Commissions' : 'Salary'} — ${job.title}`, { wage: true, ssCovered: job.employer.benefits.ssCovered, ...(job.informal ? { informal: true } : {}) });
  job.paidThisYear = true;
  if (profession.flightHoursPerYear) ctx.emit('logbook:add', { hours: profession.flightHoursPerYear });

  if (profession.mandatoryRetirement && state.character.age >= profession.mandatoryRetirement) {
    ctx.emit('retirement:mandatory', { age: profession.mandatoryRetirement });
    return;
  }

  // Training positions graduate automatically — or wash out.
  const program = traineeProgram(job);
  if (program && traineeTick(ctx, job, profession, program)) return;

  // Evaluation
  const target = performanceTarget(state, rng, departmentEffect);
  job.performance = Math.round(clamp(job.performance * 0.55 + target * 0.45, 0, 100));
  job.effort = 0;
  job.boss = Math.round(clamp(job.boss + (50 - job.boss) * 0.1 + (job.performance - 50) * 0.1, 0, 100));
  job.coworkers = Math.round(clamp(job.coworkers + (55 - job.coworkers) * 0.15, 0, 100));
  const rating = ratingLabel(job.performance);
  const reviewer = chainOfCommand(state, job, { generate: false })?.supervisor;
  const by = reviewer && !reviewer.body ? ` (${reviewer.name}, ${reviewer.title})` : '';

  // Within-grade steps (and a small private-sector merit bump)
  const steps = stepIncrease(job.performance);
  if (steps && job.step < MAX_STEP) job.step = Math.min(MAX_STEP, job.step + steps);
  if (job.sector === 'private' && job.performance >= 80) job.merit = Math.round((job.merit + 0.01) * 1000) / 1000;
  recalcSalary(state, job);

  if (layoffCheck(ctx, job)) return;
  if (job.sector !== 'private') publicRifTick(ctx, job, RIF_DEPS);

  // Probation: any poor review ends the job; finishing it brings civil-service protection (and tenure for teachers).
  // (Not in the year you graduated from a training program: probation starts then.)
  if (job.probationLeft > 0 && job.yearsInLevel > 0) {
    if (job.performance < PROBATION_BAR) {
      leaveJob(ctx, `Released during your probationary period (rated ${rating})`, { fired: true });
      return;
    }
    job.probationLeft -= 1;
    if (!job.probationLeft) {
      if (TENURE_PROFESSIONS.includes(job.professionId)) {
        job.tenured = true;
        ctx.log(`You completed probation at ${job.employer.name} and earned tenure.`, '🎓', 'good');
      } else ctx.log(`You passed your probationary period at ${job.employer.name}.${job.sector === 'private' ? '' : ' Civil-service protections now apply.'}`, '✅', 'good');
    }
  }

  const status = promotionStatus(state);
  const grievanceLimit = job.unionMember ? 3 + (['steward', 'officer', 'president'].includes(state.unions?.mine?.role) ? 1 : 0) : 2;
  // Ready to move up with nowhere to go: after a couple of years, another employer offers the promotion.
  job.stuckYears = job.performance >= 75 && status.noOpening ? (job.stuckYears ?? 0) + 1 : 0;
  if (job.stuckYears >= 2 && rng.chance(0.4)) outsidePromotionOffer(ctx, job, profession);
  if (job.performance >= 75 && status.eligible) {
    job.lowYears = 0;
    ctx.log(`Annual review${by}: ${rating} (${job.performance}%). You're up for promotion.`, '🌟', 'good');
    bumpYearly(state, 'career.requestPromotion');
    openPromotionReview(ctx);
  } else if (job.performance < 35) {
    job.warnings += 1;
    job.lowYears += 1;
    if (isTenured(job)) {
      job.warnings = Math.min(job.warnings, 1);
      ctx.log(`Annual review: ${rating}. Tenure protects your position.`, '🎓', 'warn');
      return;
    }
    // Sustained low performance: demotion first, termination when there's nowhere lower to go.
    if (job.lowYears >= 2 && demote(ctx, `rated ${rating} two years running`)) return;
    if (job.warnings >= grievanceLimit || (job.performance < 12 && rng.chance(0.5))) {
      leaveJob(ctx, `Rated ${rating} after repeated warnings${job.unionMember ? ' (the union grievance failed)' : ''}.`, { fired: true });
      return;
    }
    ctx.log(`Annual review${by}: ${rating} (${job.performance}%). HR issued a formal written warning (${job.warnings}/${grievanceLimit}).`, '⚠️', 'warn');
    ctx.stat('stress', 6);
  } else {
    job.lowYears = 0;
    if (job.performance >= 50) job.warnings = Math.max(0, job.warnings - 1);
    ctx.log(`Annual review at ${job.employer.name}${by}: ${rating} (${job.performance}%). Step ${job.step}, $${job.salary.toLocaleString()}/yr.${job.performance >= 75 && status.noOpening ? ` Ready to move up — but ${status.reason.charAt(0).toLowerCase()}${status.reason.slice(1)}.` : ''}`, '📈');
  }
}

export { ladderFor, levelById, hasFelony, recalcSalary };

/** What the public RIF rules need from the career engine. */
export const RIF_DEPS = {
  previousLevel: (job) => previousLevel(getProfession(job.professionId), job.employer.size, job.levelId),
  demote: (ctx, reason) => demote(ctx, reason),
  leaveJob: (ctx, reason) => leaveJob(ctx, reason),
  hire: (ctx, opts) => hire(ctx, opts),
  recalcSalary: (state, job) => recalcSalary(state, job),
};
export const RIF_RESOLVERS = rifResolvers(RIF_DEPS);
