/**
 * Standardized pay bands G1–G10 with 10 within-grade steps.
 *
 *   salary = gradeBase × profession multiplier × employer-size multiplier
 *            × step × locality × (1 + merit)
 *
 * Steps advance with tenure (one per year at "fully successful" or better,
 * two at "outstanding"; frozen when performance is poor). Locality is the
 * region's market multiplier in the private sector and an explicit
 * locality-pay percentage in the federal service. Executive roles (levels
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

export function localityMultiplier(sector, regionId, posting = null) {
  const region = REGIONS[regionId] ?? REGIONS.midcity;
  if (sector === 'federal') return 1 + (posting ? 0.17 : region.locality);
  return region.market;
}

/** Full salary breakdown for a job snapshot. */
export function salaryBreakdown({ grade, step, merit = 0, payMultiplier, sector, size, regionId, posting, exec = false }) {
  const base = GRADE_BASE[grade];
  const sizeDef = EMPLOYER_SIZES[size];
  const sizeMult = sector === 'private' && exec ? sizeDef.exec : sector === 'private' ? sizeDef.pay : 1;
  const locality = localityMultiplier(sector, regionId, posting);
  const steps = stepMultiplier(step);
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
