/**
 * Health coverage. Exactly one plan applies each year, chosen by
 * circumstance: prison care, TRICARE (active duty / military retirees),
 * employer plans, a parent's plan under 26, Medicare (65+ or two years on
 * SSDI), Medicaid (low income in expansion states, or disabled), a
 * marketplace plan if you buy one, or nothing. VA care covers
 * service-connected conditions for rated veterans on top of any plan.
 *
 * Bills run through deductible → coinsurance → out-of-pocket maximum,
 * tracked per calendar year. What you can't pay becomes medical debt.
 */
import { yearlyCount } from '../../core/State.js';
import { stateIdOf } from '../life/Regions.js';

export const MEDICAID_INCOME = 21000;
/** States that did not expand Medicaid: only disabled adults qualify. */
export const NON_EXPANSION = new Set(['TX', 'FL']);

export const PLANS = {
  prison: { name: 'Prison health services', icon: '⛓️', premium: 0, deductible: 0, coinsurance: 0, oopMax: 0 },
  tricare: { name: 'TRICARE Prime', icon: '🎖️', premium: 0, deductible: 0, coinsurance: 0, oopMax: 0 },
  va: { name: 'VA health care', icon: '🇺🇸', premium: 0, deductible: 0, coinsurance: 0, oopMax: 0 },
  tricareRetiree: { name: 'TRICARE (retiree)', icon: '🎖️', premium: 650, deductible: 150, coinsurance: 0.2, oopMax: 3500 },
  employer: { name: 'Employer health plan', icon: '🏢', premium: 1900, deductible: 1600, coinsurance: 0.2, oopMax: 5000 },
  parents: { name: "Parent's plan (under 26)", icon: '👪', premium: 0, deductible: 2000, coinsurance: 0.2, oopMax: 6000 },
  medicare: { name: 'Medicare', icon: '🧓', premium: 2200, deductible: 260, coinsurance: 0.2, oopMax: 7000 },
  medicaid: { name: 'Medicaid', icon: '🏥', premium: 0, deductible: 0, coinsurance: 0.02, oopMax: 600 },
  marketplace: { name: 'Marketplace (ACA) plan', icon: '🛒', premium: 6500, deductible: 4500, coinsurance: 0.3, oopMax: 9200 },
  none: { name: 'Uninsured', icon: '⚠️', premium: 0, deductible: Infinity, coinsurance: 1, oopMax: Infinity },
};

const income = (state) => (state.finances.lastYear?.gross ?? 0) - (state.finances.lastYear?.ltcg ?? 0);

export function isDisabled(state) {
  return Boolean(state.health?.disability.benefits.some((b) => b.source === 'ssdi'));
}

/** Which plan covers you this year. */
export function coverageId(state, earned = income(state)) {
  const age = state.character.age;
  if (state.legal.incarceration) return 'prison';
  if (state.military.service?.component === 'active') return 'tricare';
  if (state.career.job?.employer.benefits.health) return 'employer';
  if (age >= 65 || (isDisabled(state) && (state.health.disability.ssdiYears ?? 0) >= 2)) return 'medicare';
  if (state.retirement.pensions.some((p) => p.id === 'military')) return 'tricareRetiree';
  // Veterans rated 50%+ get full VA health care (priority group 1).
  if ((state.health?.va?.rating ?? 0) >= 50) return 'va';
  if (age < 26) return 'parents';
  if (earned < MEDICAID_INCOME && (!NON_EXPANSION.has(stateIdOf(state)) || isDisabled(state))) return 'medicaid';
  if (state.health?.marketplace !== false) return 'marketplace';
  return 'none';
}

export function coverage(state, earned) {
  const id = coverageId(state, earned);
  const plan = { id, ...PLANS[id] };
  // Marketplace premiums are subsidized at lower incomes.
  if (id === 'marketplace') plan.premium = (earned ?? income(state)) < 40000 ? 1500 : 6500;
  return plan;
}

/** VA covers service-connected care in full for any rated veteran. */
export function vaCovers(state, condition) {
  return Boolean(condition?.serviceConnected && (state.health?.va.rating ?? 0) > 0);
}

/** Out-of-pocket share of a bill under the current plan, honoring the year's deductible and OOP max. */
export function outOfPocket(state, cost, { condition } = {}) {
  if (vaCovers(state, condition)) return 0;
  const plan = coverage(state);
  if (plan.id === 'none') return cost;
  const dedPaid = yearlyCount(state, 'health.deductible');
  const oopPaid = yearlyCount(state, 'health.oop');
  const toDeductible = Math.min(cost, Math.max(0, plan.deductible - dedPaid));
  const share = toDeductible + (cost - toDeductible) * plan.coinsurance;
  return Math.round(Math.max(0, Math.min(share, plan.oopMax - oopPaid)));
}

/** Rough yearly estimate for display: the plan's cost of a treatment, ignoring prior bills. */
export function estimateOutOfPocket(state, cost, condition) {
  if (vaCovers(state, condition)) return 0;
  const plan = coverage(state);
  if (plan.id === 'none') return cost;
  const ded = Math.min(cost, plan.deductible);
  return Math.round(Math.min(plan.oopMax, ded + (cost - ded) * plan.coinsurance));
}
