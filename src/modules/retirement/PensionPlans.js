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

/**
 * Public-service pensions abroad, by the US plan a job would have had (police & fire, municipal,
 * state, federal, teachers…). Most are career-average (CARE): a share of every year's pay, not of
 * the best three, which is why they pay less than an American "20 and out". `basis`: 'career'
 * (career average), 'best5', 'final' (last salary) or the US default (best three).
 * null: no defined-benefit plan for new hires — a defined-contribution pot and the state pension.
 * '*' covers the plan ids a country doesn't list. Registered as `${country}:${planId}`.
 */
const PLAN = (name, short, multiplier, opts) => ({ name, short, vest: 2, cola: 0.015, ssCovered: true, ...opts, multiplier: () => multiplier });
const COUNTRY_PLANS = {
  GB: {
    publicSafety: PLAN('Police / Firefighters\' Pension Scheme (2015)', 'PPS/FPS', 0.0175, { basis: 'career', cap: 0.75, normalAge: 60, eligible: (a, y) => a >= 60 || (a >= 55 && y >= 25), rule: '60 (55 with 25 years, reduced)' }),
    municipal: PLAN('Local Government Pension Scheme (LGPS)', 'LGPS', 0.0204, { basis: 'career', cap: 0.75, normalAge: 67, eligible: (a, y) => a >= 67 || (a >= 60 && y >= 30), rule: 'State Pension age (67); 60 with 30 years' }),
    teachers: PLAN('Teachers\' Pension Scheme', 'TPS', 0.0175, { basis: 'career', cap: 0.75, normalAge: 67, eligible: (a, y) => a >= 67 || (a >= 60 && y >= 30), rule: '67; 60 with 30 years' }),
    '*': PLAN('Civil Service Pension (alpha)', 'alpha', 0.0232, { basis: 'career', cap: 0.75, normalAge: 67, eligible: (a, y) => a >= 67 || (a >= 60 && y >= 30), rule: 'State Pension age (67); 60 with 30 years' }),
  },
  IE: {
    publicSafety: PLAN('Single Public Service Pension Scheme (fast accrual)', 'SPSPS', 0.0125, { basis: 'career', cap: 0.5, normalAge: 60, eligible: (a, y) => a >= 60 || (a >= 55 && y >= 30), rule: '60; 55 with 30 years' }),
    '*': PLAN('Single Public Service Pension Scheme', 'SPSPS', 0.0115, { basis: 'career', cap: 0.5, normalAge: 66, eligible: (a, y) => a >= 66, rule: '66' }),
  },
  DE: {
    publicSafety: PLAN('Beamtenversorgung (Polizei/Feuerwehr)', 'Beamtenversorgung', 0.0179375, { basis: 'final', cap: 0.7175, normalAge: 62, ssCovered: false, eligible: (a, y) => a >= 62 || (a >= 60 && y >= 40), rule: '62 (special age limit); 71.75% after 40 years' }),
    municipal: PLAN('Zusatzversorgung (ZVK)', 'ZVK', 0.004, { basis: 'career', cap: 0.2, normalAge: 67, eligible: (a, y) => a >= 67 || (a >= 63 && y >= 35), rule: 'a top-up to the state pension: 67; 63 with 35 years' }),
    '*': PLAN('Beamtenversorgung', 'Beamtenversorgung', 0.0179375, { basis: 'final', cap: 0.7175, normalAge: 67, ssCovered: false, eligible: (a, y) => a >= 67 || (a >= 63 && y >= 35), rule: '67; 63 with 35 years; 71.75% of final pay after 40 years' }),
  },
  FR: {
    publicSafety: PLAN('Retraite de la fonction publique (catégorie active)', 'SRE/CNRACL', 0.0174, { basis: 'final', cap: 0.75, normalAge: 57, ssCovered: false, eligible: (a, y) => a >= 57 || (a >= 52 && y >= 27), rule: 'active category: 57; 52 with 27 years' }),
    '*': PLAN('Retraite des fonctionnaires (SRE/CNRACL)', 'SRE/CNRACL', 0.0174, { basis: 'final', cap: 0.75, normalAge: 64, ssCovered: false, eligible: (a, y) => a >= 64 || (a >= 62 && y >= 43), rule: '64; 62 with a full career' }),
  },
  CA: {
    publicSafety: PLAN('OMERS (police & fire)', 'OMERS', 0.02, { basis: 'best5', cap: 0.7, normalAge: 60, eligible: (a, y) => a >= 60 || a + y >= 90, rule: '60, or age + service = 90' }),
    '*': PLAN('Public Service Pension Plan', 'PSPP', 0.02, { basis: 'best5', cap: 0.7, normalAge: 65, eligible: (a, y) => a >= 65 || (a >= 60 && y >= 30), rule: '65; 60 with 30 years' }),
  },
  NL: { '*': PLAN('ABP pension', 'ABP', 0.0175, { basis: 'career', cap: 0.7, normalAge: 67, eligible: (a, y) => a >= 67 || (a >= 64 && y >= 40), rule: '67; earlier for heavy work' }) },
  SE: { '*': PLAN('Statens tjänstepension (PA 16)', 'PA 16', 0.008, { basis: 'career', cap: 0.3, normalAge: 65, eligible: (a, y) => a >= 65, rule: 'a top-up to the state pension: 65' }) },
  IT: {
    publicSafety: PLAN('INPS — Comparto sicurezza e soccorso', 'INPS', 0.0125, { basis: 'career', cap: 0.6, normalAge: 60, eligible: (a, y) => a >= 60 || y >= 41, rule: '60; any age with 41 years' }),
    '*': PLAN('INPS — Gestione dipendenti pubblici', 'INPS', 0.0125, { basis: 'career', cap: 0.6, normalAge: 67, eligible: (a, y) => a >= 67 || y >= 42, rule: '67; any age with 42 years' }),
  },
  KR: { '*': PLAN('Government Employees Pension (GEPS)', 'GEPS', 0.017, { basis: 'career', cap: 0.6, normalAge: 65, eligible: (a, y) => a >= 65 && y >= 10, rule: '65 with 10 years' }) },
  JP: { '*': PLAN('Kokka Kōmuin Kyōsai (KKR) top-up', 'KKR', 0.0055, { basis: 'career', cap: 0.25, normalAge: 65, eligible: (a, y) => a >= 65, rule: 'a top-up to the Employees\' Pension: 65' }) },
  BR: {
    publicSafety: PLAN('Regime Próprio (carreiras policiais)', 'RPPS', 0.02, { basis: 'career', cap: 1, normalAge: 55, eligible: (a, y) => a >= 55 && y >= 25, rule: '55 with 25 years' }),
    '*': PLAN('Regime Próprio de Previdência Social', 'RPPS', 0.02, { basis: 'career', cap: 1, normalAge: 65, eligible: (a, y) => a >= 65 || (a >= 62 && y >= 25), rule: '65; 62 with 25 years' }),
  },
  PH: { '*': PLAN('GSIS retirement', 'GSIS', 0.025, { basis: 'best5', cap: 0.9, normalAge: 60, eligible: (a, y) => a >= 60 && y >= 15, rule: '60 with 15 years' }) },
  // New public servants here save in defined-contribution super (AU), KiwiSaver (NZ), the NPS (IN),
  // ISSSTE accounts (MX) or the general Social Security scheme (ES).
  AU: { '*': null }, NZ: { '*': null }, IN: { '*': null }, MX: { '*': null }, ES: { '*': null },
  // Singapore (CPF), Israel (mandatory pension funds), China (basic + occupational annuity accounts),
  // Nigeria (Contributory Pension Scheme) and Kenya (Public Service Superannuation Scheme) are all defined-contribution.
  SG: { '*': null }, IL: { '*': null }, CN: { '*': null }, NG: { '*': null }, KE: { '*': null },
  PS: { '*': PLAN('General Pension Authority', 'GPA', 0.02, { basis: 'best3', cap: 0.7, normalAge: 60, ssCovered: false, eligible: (a, y) => a >= 60 && y >= 15, rule: '60 with 15 years' }) },
  // The GEPF: years × final salary ÷ 55; early retirement from 55 (reduced) with 10 years.
  ZA: { '*': PLAN('Government Employees Pension Fund (GEPF)', 'GEPF', 1 / 55, { basis: 'final', cap: 0.75, normalAge: 60, ssCovered: false, eligible: (a, y) => a >= 60 || (a >= 55 && y >= 10), rule: '60; 55 with 10 years (reduced)' }) },
  // Taspen: 2.5% of final basic pay a year, up to 75%.
  ID: { '*': PLAN('Taspen civil service pension', 'Taspen', 0.025, { basis: 'final', cap: 0.75, normalAge: 58, eligible: (a, y) => a >= 58 && y >= 10, rule: '58 with 10 years' }) },
};
for (const [cc, plans] of Object.entries(COUNTRY_PLANS)) for (const [id, def] of Object.entries(plans)) if (def) PENSION_PLANS[`${cc}:${id}`] = def;
/** The plan a job abroad gets in place of a US plan id (null: none). */
export function localPlanId(countryId, planId) {
  if (!planId || !countryId || countryId === 'US') return planId;
  const plans = COUNTRY_PLANS[countryId] ?? { '*': null };
  const key = planId in plans ? planId : ['fers', 'fersSpecial', 'stateGov'].includes(planId) || plans['*'] !== undefined ? '*' : null;
  if (key == null) return planId;
  return plans[key] ? `${countryId}:${key}` : null;
}

export function highAverage(salaries, n = 3) {
  if (!salaries.length) return 0;
  const top = [...salaries].sort((a, b) => b - a).slice(0, n);
  return top.reduce((s, x) => s + x, 0) / top.length;
}

export function annuityFor(planId, plan, age) {
  const def = PENSION_PLANS[planId];
  const sal = plan.salaries ?? [];
  // Career average, best five, final salary, or (the US default) the best three.
  const high = def.basis === 'career' ? (sal.length ? sal.reduce((s, x) => s + x, 0) / sal.length : 0)
    : def.basis === 'final' ? sal.at(-1) ?? 0 : highAverage(sal, def.basis === 'best5' ? 5 : 3);
  return Math.round(Math.min(def.cap, def.multiplier(age, plan.years) * plan.years) * high);
}
