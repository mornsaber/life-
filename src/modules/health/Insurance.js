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
import { yearNow } from '../world/Eras.js';

/** When each country's national health care began (Bismarck's sickness insurance, the NHS, Medicare in Canada). */
const NATIONAL_HEALTH_FROM = { DE: 1883, AT: 1888, JP: 1961, GB: 1948, FR: 1945, CA: 1966, AU: 1975, NZ: 1938, SE: 1955, NO: 1956, DK: 1960, IT: 1978, ES: 1986, KR: 1989, TW: 1995, CN: 2009, IN: 2018, MX: 2003, BR: 1988, IL: 1995, NL: 1941, BE: 1945, CH: 1996, IE: 1970 };
import { stateIdOf } from '../life/Regions.js';

import { isAbroad, countryOf } from '../world/Countries.js';
import { hasPrivateCover, systemHere, privatePremium } from './HealthSystems.js';

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
  // Before health insurance: the lodge doctor your sick club paid, the charity ward, or the doctor's bill.
  friendlySociety: { name: 'Sick club (friendly society) doctor', icon: '🤝', premium: 250, deductible: 0, coinsurance: 0.35, oopMax: 5000 },
  charity: { name: 'Charity ward and dispensary', icon: '⛪', premium: 0, deductible: 0, coinsurance: 0.1, oopMax: 1500 },
  feeForService: { name: 'Pay the doctor yourself', icon: '🩺', premium: 0, deductible: 0, coinsurance: 0.45, oopMax: 12000 },
  blueCross: { name: 'Blue Cross hospital plan', icon: '✚', premium: 2400, deductible: 800, coinsurance: 0.2, oopMax: 8000 },
  militaryMedical: { name: 'Military medical care', icon: '🎖️', premium: 0, deductible: 0, coinsurance: 0, oopMax: 0 },
  none: { name: 'Uninsured', icon: '⚠️', premium: 0, deductible: Infinity, coinsurance: 1, oopMax: Infinity },
  // Universal coverage abroad: paid through taxes and payroll contributions, so no premium (see Countries.js).
  national: { name: 'National health insurance', icon: '🏥', premium: 0, deductible: 0, coinsurance: 0.05, oopMax: 900 },
  // Retiree and digital-nomad visas require private cover: the public system isn't open to you.
  expat: { name: 'International private health insurance', icon: '🌐', premium: 2500, deductible: 1000, coinsurance: 0.1, oopMax: 5000 },
};
/** Visas whose holders must buy private health insurance. */
const PRIVATE_COVER_VISAS = ['retiree', 'nomad'];

const income = (state) => (state.finances.lastYear?.gross ?? 0) - (state.finances.lastYear?.ltcg ?? 0);

export function isDisabled(state) {
  return Boolean(state.health?.disability.benefits.some((b) => b.source === 'ssdi'));
}

/** Which plan covers you this year. */
export function coverageId(state, earned = income(state)) {
  const age = state.character.age;
  if (state.legal.incarceration) return 'prison';
  const y = yearNow(state);
  if (state.military.service?.component === 'active') return y < 1966 ? 'militaryMedical' : 'tricare';
  // Before national health care or health insurance (world/Eras.js): sick clubs, charity and the doctor's bill.
  const cc = state.character.countryId ?? 'US';
  const modern = cc === 'US' ? y >= 1945 : !(NATIONAL_HEALTH_FROM[cc] > y) && y >= 1950;
  if (!modern) {
    if ((state.health?.va?.rating ?? 0) >= 50 && y >= 1930) return 'va';
    if (earned < 20000) return 'charity';
    return state.career.job ? 'friendlySociety' : 'feeForService';
  }
  if (cc === 'US' && y < 1966) {
    if (state.career.job?.employer.benefits.health) return 'employer';
    if ((state.health?.va?.rating ?? 0) >= 50) return 'va';
    if (earned < 20000) return 'charity';
    return 'blueCross';
  }
  if (isAbroad(state)) {
    const res = state.migration?.residences?.[state.character.countryId];
    return res?.status === 'visa' && PRIVATE_COVER_VISAS.includes(res.visa) ? 'expat' : 'national';
  }
  if (state.career.job?.employer.benefits.health) return 'employer';
  if (age >= 65 || (isDisabled(state) && (state.health.disability.ssdiYears ?? 0) >= 2)) return 'medicare';
  if (state.retirement.pensions.some((p) => p.id === 'military')) return 'tricareRetiree';
  // Veterans rated 50%+ get full VA health care (priority group 1).
  if ((state.health?.va?.rating ?? 0) >= 50) return 'va';
  if (age < 26 && y >= 2010) return 'parents';
  if (earned < MEDICAID_INCOME && (!NON_EXPANSION.has(stateIdOf(state)) || isDisabled(state))) return 'medicaid';
  if (state.health?.marketplace !== false && y >= 2014) return 'marketplace';
  if (y < 2014) return earned < 30000 ? 'charity' : 'blueCross';
  return 'none';
}

export function coverage(state, earned) {
  const id = coverageId(state, earned);
  const plan = { id, ...PLANS[id] };
  if (id === 'national') {
    const h = countryOf(state).health;
    Object.assign(plan, { name: h.name, deductible: h.deductible, coinsurance: h.coinsurance, oopMax: h.oopMax });
    // Private top-up cover: a premium, and lower co-payments where it covers them.
    if (hasPrivateCover(state)) {
      const p = systemHere(state).private;
      Object.assign(plan, { name: `${h.name} + ${p.name}`, premium: privatePremium(state), coinsurance: Math.min(plan.coinsurance, p.coinsurance ?? plan.coinsurance) });
    }
  }
  // International cover gets dear with age.
  if (id === 'expat') plan.premium = 2500 + Math.max(0, state.character.age - 45) * 220;
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
