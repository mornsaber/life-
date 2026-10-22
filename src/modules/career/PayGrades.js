/**
 * Pay grades G1–G10, paid two different ways.
 *
 * Government (federal, state, municipal) runs a grade-and-step schedule like the
 * General Schedule: ten steps per grade, and the wait between them lengthens
 * (a year each to step 4, two years each to step 7, three each to step 10). A
 * poor rating freezes your step; an outstanding one can earn a Quality Step
 * Increase once every few years. Pay is capped by law (the GS cap, the Senior
 * Executive cap, a city's or state's top salary), however senior you get.
 *
 * Private employers (and market-paid public bodies — universities, national labs)
 * use salary bands: a range around a midpoint for each grade, an annual merit
 * raise that depends on your rating and where you sit in the band, and a yearly
 * bonus that grows with seniority. At the top of the band only the bonus moves.
 *
 *   salary = gradeBase × profession multiplier × employer-size multiplier
 *            × (step, or position in band) × locality × (1 + merit)
 *
 * Locality is the region's market multiplier in the private sector and an
 * explicit locality-pay percentage in the federal service. Executive roles (levels
 * with the `exec` ability) at large private employers scale with company size.
 */
import { REGIONS } from '../life/Regions.js';

export const GRADE_BASE = [0, 30000, 37000, 46000, 57000, 70000, 87000, 108000, 135000, 175000, 240000];
export const MAX_STEP = 10;
export const STEP_RATE = 0.025;

export const EMPLOYER_SIZES = {
  micro: { label: 'Tiny agency', pay: 0.86, exec: 0.7, staff: '< 40 staff', reportScale: 0.35, budget: 800 },
  small: { label: 'Small', pay: 0.9, exec: 0.8, staff: '< 50 staff', reportScale: 0.5, budget: 1200 },
  medium: { label: 'Mid-size', pay: 1, exec: 1.2, staff: '50–500 staff', reportScale: 1, budget: 2000 },
  large: { label: 'Large', pay: 1.08, exec: 2, staff: '500–10k staff', reportScale: 2, budget: 3000 },
  enterprise: { label: 'Enterprise', pay: 1.15, exec: 3.5, staff: '10k+ staff', reportScale: 4, budget: 4500 },
  mega: { label: 'Major agency', pay: 1.18, exec: 4.5, staff: '15k+ staff', reportScale: 6, budget: 6000 },
};

export const gradeLabel = (grade) => `G${grade}`;

export function stepMultiplier(step) {
  return 1 + (Math.min(step, MAX_STEP) - 1) * STEP_RATE;
}

const WAGE_LEVELS = {};
/** A country's average wage level (its cities' market factors). */
export function nationalWageLevel(countryId) {
  if (WAGE_LEVELS[countryId] == null) {
    const cities = Object.getOwnPropertyNames(REGIONS).map((id) => REGIONS[id]).filter((r) => r.country === countryId);
    WAGE_LEVELS[countryId] = cities.length ? cities.reduce((s, r) => s + r.market, 0) / cities.length : 1;
  }
  return WAGE_LEVELS[countryId];
}

export function localityMultiplier(sector, regionId, posting = null) {
  const region = REGIONS[regionId] ?? REGIONS.midcity;
  // Abroad, national pay scales follow the country's wage level (set nationally, not by city).
  if (sector === 'federal' && region.country) return nationalWageLevel(region.country) * (posting ? 1.17 : 1.05);
  if (sector === 'federal') return 1 + (posting ? 0.17 : region.locality);
  return region.market;
}

/** Full salary breakdown for a job snapshot. */
export function salaryBreakdown({ grade, step, band = null, merit = 0, payMultiplier, sector, size, regionId, posting, exec = false }) {
  const base = GRADE_BASE[grade];
  const sizeDef = EMPLOYER_SIZES[size];
  const sizeMult = sector === 'private' && exec ? sizeDef.exec : sector === 'private' ? sizeDef.pay : 1;
  const locality = localityMultiplier(sector, regionId, posting);
  // A company pays by position in the band; government by step.
  const steps = band ?? stepMultiplier(step);
  const total = Math.round((base * payMultiplier * sizeMult * steps * locality * (1 + merit)) / 100) * 100;
  return { base, payMultiplier, sizeMult, steps, locality, merit, total };
}

/** Annual step movement from the performance rating. */
export function stepIncrease(performance) {
  if (performance >= 85) return 2;
  if (performance >= 50) return 1;
  return 0;
}

export function ratingLabel(performance) {
  if (performance >= 85) return 'Outstanding';
  if (performance >= 70) return 'Exceeds Expectations';
  if (performance >= 50) return 'Fully Successful';
  if (performance >= 30) return 'Needs Improvement';
  return 'Unacceptable';
}

/* ------------------------------------------------------------------ */
/* Government: the step schedule and the pay cap                        */
/* ------------------------------------------------------------------ */

/** Public bodies that pay market salaries rather than a civil-service schedule. */
export const MARKET_PROFESSIONS = new Set(['university', 'nationalLab']);
/** Is this job on salary bands (private pay) rather than a grade-and-step schedule? */
export const onBands = (job) => job.sector === 'private' || MARKET_PROFESSIONS.has(job.professionId);

/** Years at each step before the next: the General Schedule's waiting periods. */
export const STEP_WAIT = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3];
/** An outstanding rating earns a Quality Step Increase at most this often. */
export const QSI_EVERY = 3;

/**
 * A year on the schedule: time at your step counts toward the next one unless your rating
 * is poor (a step is withheld below "fully successful"). Returns the steps gained.
 */
export function scheduleYear(job, age) {
  if (job.step >= MAX_STEP) return 0;
  if (job.performance < 50) return 0;
  job.stepYears = (job.stepYears ?? 0) + 1;
  let gained = 0;
  if (job.stepYears >= STEP_WAIT[job.step]) {
    job.step += 1;
    job.stepYears = 0;
    gained += 1;
  }
  if (job.performance >= 85 && job.step < MAX_STEP && age - (job.qsiAge ?? -99) >= QSI_EVERY) {
    job.step += 1;
    job.qsiAge = age;
    gained += 1;
  }
  return gained;
}
/** Years until your next within-grade increase (null at the top step). */
export const nextStepIn = (job) => (job.step >= MAX_STEP ? null : Math.max(1, STEP_WAIT[job.step] - (job.stepYears ?? 0)));

/**
 * The most a government can pay (US 2025: the GS cap at Executive Level IV, the Senior
 * Executive Service cap at Level II; the highest big-city and state salaries). Abroad, the
 * same shape scaled by the country's wage level.
 */
export const PAY_CAP = { federal: 195200, federalExec: 225700, state: 260000, municipal: 300000, public: 300000 };
export function payCap(job, countryId) {
  if (onBands(job)) return Infinity;
  const exec = job.grade >= 9 || job.abilities?.includes('exec') || Boolean(job.headOf);
  const cap = job.sector === 'federal' ? (exec ? PAY_CAP.federalExec : PAY_CAP.federal) : PAY_CAP[job.sector] ?? PAY_CAP.state;
  return Math.round(cap * (countryId && countryId !== 'US' ? nationalWageLevel(countryId) : 1));
}

/** How the job's pay is described: "GS-13, step 4" in the US federal service, "Grade 7, step 4" elsewhere in government, "Band 7" in a company. */
const GS = [null, 'GS-3', 'GS-5', 'GS-7', 'GS-9', 'GS-11', 'GS-12', 'GS-13', 'GS-14', 'GS-15', 'SES'];
export function payGradeLabel(job, countryId) {
  if (onBands(job)) return `Band ${job.grade}`;
  if (job.sector === 'federal' && (!countryId || countryId === 'US')) return GS[job.grade] ?? `G${job.grade}`;
  return `Grade ${job.grade}`;
}
export const payGradeShort = (job, countryId) => (onBands(job) ? `B${job.grade}` : `${payGradeLabel(job, countryId).replace('Grade ', 'G')} · S${job.step}`);

/* ------------------------------------------------------------------ */
/* Private: salary bands, merit raises and bonuses                      */
/* ------------------------------------------------------------------ */

/** Position in the band (compa-ratio): 1.0 is the band minimum, 1.25 its maximum, 1.12 the midpoint. */
export const BAND_MIN = 1;
export const BAND_MAX = 1.25;
export const BAND_MID = 1.12;
/** A hire's position in the band from the negotiated starting step. */
export const bandFromStep = (step) => Math.min(BAND_MAX, stepMultiplier(step ?? 1));

/**
 * The year's merit raise (a fraction): a strong rating low in the band moves you up fastest;
 * at the top of the band raises shrink to nothing. Recessions halve merit budgets.
 */
export function meritRaise(performance, band, phase) {
  if (performance < 50) return 0;
  const row = performance >= 85 ? [0.06, 0.05, 0.035, 0.02] : performance >= 70 ? [0.045, 0.035, 0.025, 0.012] : [0.03, 0.022, 0.012, 0.005];
  const pct = row[band < 1.06 ? 0 : band < BAND_MID + 0.02 ? 1 : band < 1.2 ? 2 : 3];
  return phase === 'recession' ? pct / 2 : phase === 'peak' ? pct + 0.005 : pct;
}
/** A year at a company: the merit raise moves you up the band. Returns the raise. */
export function bandYear(job, phase) {
  const band = job.band ?? bandFromStep(job.step);
  const raise = meritRaise(job.performance, band, phase);
  job.band = Math.round(Math.min(BAND_MAX, band * (1 + raise)) * 1000) / 1000;
  return Math.round((job.band / band - 1) * 1000) / 1000;
}

/** Target bonus by grade (a share of salary); executives earn half again. */
export const BONUS_TARGET = { 4: 0.02, 5: 0.04, 6: 0.06, 7: 0.1, 8: 0.14, 9: 0.2, 10: 0.3 };
/** The year's bonus: the target, scaled by your rating and how the company did. */
export function bonusFor(job, phase) {
  const target = (BONUS_TARGET[job.grade] ?? 0) * (job.abilities?.includes('exec') ? 1.5 : 1);
  if (!target) return 0;
  const rating = job.performance >= 85 ? 1.5 : job.performance >= 70 ? 1.15 : job.performance >= 50 ? 0.9 : 0;
  const company = phase === 'recession' ? 0.4 : phase === 'recovery' ? 0.8 : phase === 'peak' ? 1.2 : 1;
  return Math.round((job.salary * target * rating * company) / 100) * 100;
}
