/**
 * Defined-benefit pension plans. An employer's benefits package names one
 * of these. Service credit accrues one year per year worked; the annuity is
 *   multiplier × years × average of your highest-3 salaries (capped).
 *
 *   vest:        years before you're entitled to anything
 *   eligible:    (age, years) → may retire with an immediate annuity
 *   normalAge:   when a vested, deferred annuity starts if you leave early
 *   ssCovered:   false = job doesn't pay into Social Security
 *
 * Mandatory retirement ages are set per profession (`mandatoryRetirement`).
 */
export const PENSION_PLANS = {
  fers: {
    name: 'FERS Basic Annuity', short: 'FERS', vest: 5, cap: 0.8, cola: 0.017, normalAge: 62, ssCovered: true,
    multiplier: (age, years) => (age >= 62 && years >= 20 ? 0.011 : 0.01),
    eligible: (age, years) => (age >= 62 && years >= 5) || (age >= 60 && years >= 20) || (age >= 57 && years >= 30),
    rule: '62 w/5 yrs · 60 w/20 · 57 w/30',
  },
  fersSpecial: {
    name: 'FERS Special Provisions (LEO / Foreign Service)', short: 'FERS-Special', vest: 5, cap: 0.8, cola: 0.017, normalAge: 57, ssCovered: true,
    // 1.7% for the first 20 years, 1% after.
    multiplier: (age, years) => (Math.min(years, 20) * 0.017 + Math.max(0, years - 20) * 0.01) / Math.max(1, years),
    eligible: (age, years) => (age >= 50 && years >= 20) || years >= 25,
    rule: '50 w/20 yrs · any age w/25',
  },
  municipal: {
    name: 'Municipal Employees Retirement System', short: 'MERS', vest: 5, cap: 0.75, cola: 0.015, normalAge: 60, ssCovered: true,
    multiplier: () => 0.02,
    eligible: (age, years) => (age >= 60 && years >= 5) || (age >= 55 && years >= 30),
    rule: '60 w/5 yrs · 55 w/30',
  },
  publicSafety: {
    name: 'Police & Fire Pension Fund', short: 'P&F', vest: 5, cap: 0.8, cola: 0.02, normalAge: 55, ssCovered: false,
    multiplier: () => 0.025,
    // Most big-city police and fire systems: "20 and out" at half pay, at any age.
    eligible: (age, years) => years >= 20 || (age >= 50 && years >= 10),
    rule: '20 yrs at any age ("20 and out") · 50 w/10 — no Social Security',
  },
  stateGov: {
    name: 'State Employees Retirement System', short: 'SERS', vest: 5, cap: 0.75, cola: 0.015, normalAge: 62, ssCovered: true,
    multiplier: () => 0.0185,
    eligible: (age, years) => (age >= 62 && years >= 5) || (age >= 55 && years >= 30),
    rule: '62 w/5 yrs · 55 w/30',
  },
  electedOfficials: {
    name: 'Elected Officials Retirement Plan', short: 'EORP', vest: 6, cap: 0.8, cola: 0.02, normalAge: 60, ssCovered: true,
    multiplier: () => 0.03,
    eligible: (age, years) => (age >= 60 && years >= 6) || (age >= 55 && years >= 12),
    rule: '60 w/6 yrs · 55 w/12',
  },
  teachers: {
    name: 'State Teachers Retirement System', short: 'STRS', vest: 5, cap: 0.8, cola: 0.015, normalAge: 60, ssCovered: true,
    multiplier: () => 0.02,
    eligible: (age, years) => (age >= 60 && years >= 5) || years >= 30,
    rule: '60 w/5 yrs · any age w/30',
  },
  union: {
    name: 'Union Multiemployer Pension Fund', short: 'Union', vest: 5, cap: 0.6, cola: 0, normalAge: 62, ssCovered: true,
    multiplier: () => 0.015,
    eligible: (age, years) => (age >= 62 && years >= 5) || (age >= 55 && years >= 30),
    rule: '62 w/5 yrs · 55 w/30',
  },
  corporate: {
    name: 'Corporate Defined-Benefit Plan', short: 'Corp DB', vest: 5, cap: 0.6, cola: 0, normalAge: 65, ssCovered: true,
    multiplier: () => 0.012,
    eligible: (age, years) => age >= 65 && years >= 5,
    rule: '65 w/5 yrs',
  },
};

export function highAverage(salaries, n = 3) {
  if (!salaries.length) return 0;
  const top = [...salaries].sort((a, b) => b - a).slice(0, n);
  return top.reduce((s, x) => s + x, 0) / top.length;
}

export function annuityFor(planId, plan, age) {
  const def = PENSION_PLANS[planId];
  const high = highAverage(plan.salaries);
  return Math.round(Math.min(def.cap, def.multiplier(age, plan.years) * plan.years) * high);
}
