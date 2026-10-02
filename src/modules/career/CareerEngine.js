/**
 * Career core: requirements, hiring/leaving, annual performance evaluation
 * (0–100%), salary payment, income tax and promotion/termination logic.
 *
 * Interactive pieces (interviews, workplace actions, promotion reviews) live
 * in InterviewSystem.js and WorkplaceActions.js and call into this file.
 */
import { hasDegree, commitmentLoad, isDeployed } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { getProfession, getTier, TIER_COUNT, describeRequirement } from './JobTrees.js';

/* ------------------------------------------------------------------ */
/* Tax                                                                 */
/* ------------------------------------------------------------------ */

export const STANDARD_DEDUCTION = 15000;
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
/* Requirements                                                        */
/* ------------------------------------------------------------------ */

export function meetsRequirement(state, req = {}) {
  const missing = [];
  if (req.degree && !hasDegree(state, req.degree, req.majors)) missing.push(describeRequirement({ degree: req.degree, majors: req.majors }));
  if (req.smarts && state.stats.smarts < req.smarts) missing.push(`${req.smarts}+ smarts`);
  if (req.fitness && state.stats.fitness < req.fitness) missing.push(`${req.fitness}+ fitness`);
  return { ok: missing.length === 0, missing };
}

export function applicationEligibility(state, professionId) {
  const profession = getProfession(professionId);
  if (state.character.age < profession.minAge) return { ok: false, reason: `Must be ${profession.minAge}+` };
  if (state.military.service?.component === 'active') return { ok: false, reason: 'On active duty' };
  if (state.career.job?.professionId === professionId) return { ok: false, reason: 'Already in this field' };
  const check = meetsRequirement(state, profession.entry);
  if (!check.ok) return { ok: false, reason: `Needs ${check.missing.join(', ')}` };
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Job lifecycle                                                       */
/* ------------------------------------------------------------------ */

const COMPANIES = {
  service: ['Target Point', 'Bayside Market', 'The Copper Pot', 'Harvest Table', 'Northgate Outfitters'],
  trades: ['Volt Brothers Electric', 'Keystone Builders', 'Ironline Contracting'],
  tech: ['Nimbus Labs', 'ByteForge', 'Quantal Systems', 'Pixelridge'],
  corporate: ['Sterling & Rowe', 'Meridian Holdings', 'Apex Consolidated'],
  finance: ['Goldbridge Partners', 'Harrow Capital', 'Whitlock Securities'],
  medical: ['St. Brigid Medical Center', 'Mercy General', 'Lakeshore University Hospital'],
  law: ['Crane, Abbott & Vance LLP', 'Okoro Whitfield LLP', 'Hale & Marsh'],
  education: ['Lincoln Unified School District', 'Riverside Academy', 'Westbrook ISD'],
  publicSafety: ['Metro City', 'Harbor County', 'Pine Valley'],
};

export function companyFor(rng, profession) {
  const base = rng.pick(COMPANIES[profession.field]);
  if (profession.id === 'police') return `${base} Police Department`;
  if (profession.id === 'fire') return `${base} Fire Department`;
  return base;
}

export function hire(ctx, { professionId, tier = 0, salary, company }) {
  const { state } = ctx;
  if (state.career.job) leaveJob(ctx, 'Resigned for a new opportunity');
  const profession = getProfession(professionId);
  const t = profession.tiers[tier];
  state.career.retired = false;
  state.career.job = {
    professionId,
    tier,
    title: t.title,
    company,
    salary: Math.round(salary ?? t.salary),
    performance: 55,
    boss: 50,
    effort: 0,
    warnings: 0,
    yearsInTier: 0,
    yearsAtCompany: 0,
    startAge: state.character.age,
    lastRaiseAge: state.character.age,
    peakTier: tier,
  };
  ctx.log(`You were hired as a ${t.title} at ${company} for $${state.career.job.salary.toLocaleString()}/yr.`, profession.icon, 'milestone');
  ctx.toast(`Hired: ${t.title}`, 'good');
  ctx.stat('happiness', 8);
}

export function leaveJob(ctx, reason, { fired = false } = {}) {
  const { state } = ctx;
  const job = state.career.job;
  if (!job) return;
  state.career.history.push({
    professionId: job.professionId,
    title: job.title,
    company: job.company,
    peakTier: job.peakTier,
    startAge: job.startAge,
    endAge: state.character.age,
    reason,
  });
  state.career.job = null;
  if (fired) {
    ctx.log(`You were fired from ${job.company}. ${reason}`, '📦', 'bad');
    ctx.toast(`Fired from ${job.company}`, 'bad');
    ctx.stat('happiness', -15);
  } else {
    ctx.log(`You left your job as ${job.title} at ${job.company}. ${reason}.`, '🚪');
  }
}

/* ------------------------------------------------------------------ */
/* Promotion                                                           */
/* ------------------------------------------------------------------ */

export function promotionStatus(state) {
  const job = state.career.job;
  if (!job) return { eligible: false, reason: 'Unemployed' };
  if (job.tier >= TIER_COUNT - 1) return { eligible: false, reason: 'Top of the ladder' };
  const current = getTier(job.professionId, job.tier);
  const next = getTier(job.professionId, job.tier + 1);
  if (job.yearsInTier < current.years) {
    const left = current.years - job.yearsInTier;
    return { eligible: false, next, reason: `${left} more year${left > 1 ? 's' : ''} in role` };
  }
  const check = meetsRequirement(state, next.req);
  if (!check.ok) return { eligible: false, next, reason: `Needs ${check.missing.join(', ')}` };
  return { eligible: true, next };
}

export function promote(ctx) {
  const { state } = ctx;
  const job = state.career.job;
  const next = getTier(job.professionId, job.tier + 1);
  job.tier += 1;
  job.peakTier = Math.max(job.peakTier, job.tier);
  job.title = next.title;
  job.salary = Math.round(Math.max(job.salary * 1.12, next.salary));
  job.yearsInTier = 0;
  job.warnings = 0;
  job.performance = Math.round(clamp(job.performance - 15, 40, 100));
  job.lastRaiseAge = state.character.age;
  ctx.log(`Promoted to ${next.title}! New salary: $${job.salary.toLocaleString()}.`, '⬆️', 'good');
  ctx.toast(`Promoted: ${next.title}`, 'good');
  ctx.stat('happiness', 10);
}

/** Queue the interactive promotion review (resolved in WorkplaceActions). */
export function openPromotionReview(ctx, initiatedByPlayer = false) {
  const job = ctx.state.career.job;
  const { next } = promotionStatus(ctx.state);
  ctx.prompt({
    type: 'career.promotionReview',
    icon: '📋',
    title: 'Promotion Review',
    text: initiatedByPlayer
      ? `You asked your boss for a shot at ${next.title}. They close the door and ask why you deserve it.`
      : `Your manager at ${job.company} pulls you aside: "Leadership has their eye on you for ${next.title}. Make your case."`,
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

export function performanceTarget(state, rng) {
  const job = state.career.job;
  const profession = getProfession(job.professionId);
  const physical = profession.field === 'publicSafety' || profession.field === 'trades';
  const aptitude = physical ? state.stats.smarts * 0.15 + state.stats.fitness * 0.15 : state.stats.smarts * 0.3;
  const effort = Math.min(job.effort, 3) * 6;
  const stressPenalty = Math.max(0, state.stats.stress - 60) * 0.4;
  const overload = Math.max(0, commitmentLoad(state) - 3) * 2.5;
  return 25 + aptitude + job.boss * 0.25 + effort + rng.int(-10, 10) - stressPenalty - overload;
}

export function careerOnAgeUp(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job) return;

  if (isDeployed(state)) {
    ctx.log(`Your position at ${job.company} is protected under USERRA while you're mobilized.`, '🛡️');
    job.effort = 0;
    return;
  }

  job.yearsInTier += 1;
  job.yearsAtCompany += 1;

  // Pay: 6% pre-tax 401(k) contribution, matched 100% by the employer.
  const contribution = Math.round(job.salary * 0.06);
  ctx.earn(job.salary - contribution, `Salary — ${job.title}`);
  state.finances.retirement += contribution * 2;

  // Evaluation
  const target = performanceTarget(state, rng);
  job.performance = Math.round(clamp(job.performance * 0.55 + target * 0.45, 0, 100));
  job.effort = 0;
  job.boss = Math.round(clamp(job.boss + (50 - job.boss) * 0.1 + (job.performance - 50) * 0.1, 0, 100));

  const status = promotionStatus(state);
  if (job.performance >= 75 && status.eligible) {
    ctx.log(`Annual review: ${job.performance}% — outstanding. You're up for promotion.`, '🌟', 'good');
    openPromotionReview(ctx);
  } else if (job.performance < 30) {
    job.warnings += 1;
    if (job.warnings >= 2 || (job.performance < 15 && rng.chance(0.5))) {
      leaveJob(ctx, `Performance rated ${job.performance}% after repeated warnings.`, { fired: true });
      return;
    }
    ctx.log(`Annual review: ${job.performance}%. HR issued a formal written warning.`, '⚠️', 'warn');
    ctx.stat('stress', 6);
  } else {
    if (job.performance >= 50) {
      job.warnings = Math.max(0, job.warnings - 1);
      job.salary = Math.round(job.salary * 1.02);
    }
    ctx.log(`Annual review at ${job.company}: ${job.performance}% performance.`, '📈');
  }
}

export function retire(ctx) {
  const { state } = ctx;
  if (!state.career.job) return;
  leaveJob(ctx, 'Retired');
  state.career.retired = true;
  ctx.log('You retired. Time to enjoy the 401(k).', '🏖️', 'milestone');
  ctx.stat('happiness', 10);
  ctx.stat('stress', -20);
}
