/**
 * The rest of each country's rulebook: courts and prisons, personal
 * insolvency, inheritance tax, unemployment and disability benefits,
 * severance, self-employment contributions, credit records, small-business
 * lending and veterans' organizations. Amounts are PPP dollars (local ÷ the
 * country's PPP rate), 2025 rules, simplified. The US keeps the rules in its
 * own modules; these apply when you live elsewhere.
 */

const ppp = (local, rate) => Math.round(local / rate);
const CAD = 1.2;
const GBP = 0.68;
const EUR = 0.72;
const JPY = 96;
const KRW = 830;
const EUR_IT = 0.64;
const MXN = 10.5;
const PHP = 19.5;
const INR = 22;
const AUD = 1.45;
const EUR_FR = 0.71;

/* ------------------------------------------------------------------ */
/* Courts and prisons                                                  */
/* ------------------------------------------------------------------ */

/**
 *   trial      'jury' (citizens decide guilt), 'lay' (lay judges sit with professional ones), 'bench'
 *   juror      what serving is called; jurorPay a day
 *   sentence   prison terms relative to the US (incarceration rates and typical terms)
 *   death      capital punishment: { status: 'active'|'moratorium'|'rare', method }
 *   jail       short-term facility; prison the long-term one
 *   legalAid   the free lawyer; privatePrisons share of prisoners in private prisons
 */
export const JUSTICE = {
  CA: { trial: 'jury', juror: 'jury duty', jurorPay: ppp(50, CAD), sentence: 0.45, jail: (city) => `${city} provincial jail`, prison: 'a federal penitentiary (Correctional Service Canada)', legalAid: 'Legal Aid lawyer' },
  GB: { trial: 'jury', juror: 'jury service', jurorPay: ppp(64, GBP), sentence: 0.55, jail: (city) => `HMP ${city} (a local prison)`, prison: 'a Category B prison', legalAid: 'legal aid solicitor', privatePrisons: 0.18 },
  DE: { trial: 'lay', juror: 'service as a Schöffe (lay judge)', jurorPay: ppp(7, EUR) * 8, sentence: 0.3, jail: (city) => `JVA ${city} (remand prison)`, prison: 'a Justizvollzugsanstalt', legalAid: 'court-appointed Pflichtverteidiger' },
  JP: { trial: 'lay', juror: 'service as a saiban-in (lay judge)', jurorPay: ppp(10000, JPY), sentence: 0.45, death: { status: 'active', method: 'hanging' }, jail: (city) => `the ${city} detention house`, prison: 'a national prison (keimusho)', legalAid: 'court-appointed defense lawyer' },
  KR: { trial: 'lay', juror: 'service on an advisory citizen jury', jurorPay: ppp(100000, KRW), sentence: 0.55, death: { status: 'moratorium', method: 'hanging' }, jail: (city) => `the ${city} detention center`, prison: 'a correctional institution', legalAid: 'public defender (gukseon)' },
  IT: { trial: 'lay', juror: 'service as a giudice popolare (Corte d\'Assise)', jurorPay: ppp(26, EUR_IT), sentence: 0.45, jail: (city) => `the ${city} casa circondariale`, prison: 'a casa di reclusione', legalAid: 'difensore d\'ufficio' },
  MX: { trial: 'bench', sentence: 0.8, jail: (city) => `the ${city} CERESO`, prison: 'a federal CEFERESO', legalAid: 'defensor público' },
  PH: { trial: 'bench', sentence: 0.8, jail: (city) => `the ${city} city jail (BJMP)`, prison: 'the New Bilibid Prison (Bureau of Corrections)', legalAid: 'Public Attorney\'s Office lawyer' },
  IN: { trial: 'bench', sentence: 0.6, death: { status: 'rare', method: 'hanging' }, jail: (city) => `${city} district jail`, prison: 'a central jail', legalAid: 'legal-aid counsel (NALSA)' },
  AU: { trial: 'jury', juror: 'jury service', jurorPay: ppp(110, AUD), sentence: 0.5, jail: (city) => `the ${city} remand centre`, prison: 'a state correctional centre', legalAid: 'Legal Aid lawyer', privatePrisons: 0.18 },
  FR: { trial: 'lay', juror: 'service as a juré (cour d\'assises)', jurorPay: ppp(90, EUR_FR), sentence: 0.4, jail: (city) => `the ${city} maison d'arrêt`, prison: 'a centre de détention', legalAid: 'avocat commis d\'office (aide juridictionnelle)' },
};

/* ------------------------------------------------------------------ */
/* Personal insolvency                                                 */
/* ------------------------------------------------------------------ */

/**
 *   liquidation  { name, wait, sells, plan? }   assets go, debts wiped (plan: also years of payments first)
 *   plan         { name, years, wait }          keep assets, pay what you can, the rest is wiped
 *   homestead    home equity you keep in a liquidation; wildcard cash/investments kept
 *   creditYears  how long it stays on your credit record
 *   none         no consumer bankruptcy (negotiate with creditors or keep paying)
 */
export const INSOLVENCY = {
  CA: { liquidation: { name: 'Bankruptcy (Licensed Insolvency Trustee)', wait: 7 }, plan: { name: 'Consumer proposal', years: 5, wait: 2 }, homestead: ppp(10000, CAD), wildcard: ppp(10000, CAD), creditYears: 6 },
  GB: { liquidation: { name: 'Bankruptcy', wait: 6 }, plan: { name: 'Individual Voluntary Arrangement (IVA)', years: 5, wait: 2 }, homestead: ppp(1000, GBP), wildcard: ppp(1000, GBP), creditYears: 6 },
  DE: { liquidation: { name: 'Privatinsolvenz (Verbraucherinsolvenz)', wait: 11, plan: 3 }, homestead: 0, wildcard: ppp(1500, EUR), creditYears: 3 },
  JP: { liquidation: { name: 'Jiko hasan (personal bankruptcy)', wait: 7 }, plan: { name: 'Kojin saisei (individual rehabilitation)', years: 3, wait: 2 }, homestead: 0, wildcard: ppp(990000, JPY), creditYears: 7 },
  KR: { liquidation: { name: 'Gaein pasan (personal bankruptcy)', wait: 7 }, plan: { name: 'Gaein hoesaeng (individual rehabilitation)', years: 3, wait: 2 }, homestead: 0, wildcard: ppp(10000000, KRW), creditYears: 5 },
  IT: { liquidation: { name: 'Liquidazione controllata', wait: 5, plan: 3 }, plan: { name: 'Ristrutturazione dei debiti del consumatore', years: 5, wait: 2 }, homestead: 0, wildcard: ppp(5000, EUR_IT), creditYears: 5 },
  MX: { none: 'Mexico has no personal bankruptcy for consumers: debts are negotiated or go to collections.' },
  PH: { liquidation: { name: 'Voluntary liquidation (FRIA)', wait: 7 }, plan: { name: 'Suspension of payments', years: 3, wait: 2 }, homestead: ppp(300000, PHP), wildcard: ppp(50000, PHP), creditYears: 5 },
  IN: { none: 'India\'s personal insolvency rules aren\'t in force for ordinary borrowers: debts go to recovery agents or settlement.' },
  AU: { liquidation: { name: 'Bankruptcy (AFSA)', wait: 8, plan: 3 }, plan: { name: 'Debt agreement (Part IX)', years: 5, wait: 2 }, homestead: 0, wildcard: ppp(5000, AUD), creditYears: 5 },
  FR: { liquidation: { name: 'Rétablissement personnel (with liquidation)', wait: 8 }, plan: { name: 'Plan de surendettement (Banque de France)', years: 7, wait: 2 }, homestead: 0, wildcard: ppp(2000, EUR_FR), creditYears: 5 },
};

/* ------------------------------------------------------------------ */
/* Inheritance tax                                                     */
/* ------------------------------------------------------------------ */

/**
 *   exemption  tax-free amount (per heir when perHeir)
 *   brackets   [[upper, rate]] on the taxable amount (PPP); spouses inherit tax-free everywhere listed
 *   none       no inheritance tax (Canada and Australia tax capital gains at death instead)
 */
export const INHERITANCE = {
  CA: { none: 'Canada has no inheritance tax (capital gains are taxed as if sold at death).' },
  GB: { name: 'Inheritance Tax', exemption: ppp(500000, GBP), brackets: [[Infinity, 0.4]] },
  DE: { name: 'Erbschaftsteuer', perHeir: true, exemption: ppp(400000, EUR), brackets: [[ppp(75000, EUR), 0.07], [ppp(300000, EUR), 0.11], [ppp(600000, EUR), 0.15], [ppp(6000000, EUR), 0.19], [ppp(13000000, EUR), 0.23], [ppp(26000000, EUR), 0.27], [Infinity, 0.3]] },
  JP: { name: 'Inheritance tax (sōzokuzei)', perHeir: true, exemption: ppp(36000000, JPY) / 2, brackets: [[ppp(10000000, JPY), 0.1], [ppp(30000000, JPY), 0.15], [ppp(50000000, JPY), 0.2], [ppp(100000000, JPY), 0.3], [ppp(200000000, JPY), 0.4], [ppp(300000000, JPY), 0.45], [Infinity, 0.55]] },
  KR: { name: 'Inheritance tax (sangsokse)', exemption: ppp(500000000, KRW), brackets: [[ppp(100000000, KRW), 0.1], [ppp(500000000, KRW), 0.2], [ppp(1000000000, KRW), 0.3], [ppp(3000000000, KRW), 0.4], [Infinity, 0.5]] },
  IT: { name: 'Imposta di successione', perHeir: true, exemption: ppp(1000000, EUR_IT), brackets: [[Infinity, 0.04]] },
  MX: { none: 'Mexico has no inheritance tax.' },
  PH: { name: 'Estate tax', exemption: ppp(5000000, PHP), brackets: [[Infinity, 0.06]] },
  IN: { none: 'India abolished estate duty in 1985.' },
  AU: { none: 'Australia has no inheritance tax (capital gains carry over to heirs).' },
  FR: { name: 'Droits de succession', perHeir: true, exemption: ppp(100000, EUR_FR), brackets: [[ppp(8072, EUR_FR), 0.05], [ppp(12109, EUR_FR), 0.1], [ppp(15932, EUR_FR), 0.15], [ppp(552324, EUR_FR), 0.2], [ppp(902838, EUR_FR), 0.3], [ppp(1805677, EUR_FR), 0.4], [Infinity, 0.45]] },
};

function bracketTax(brackets, amount) {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of brackets) {
    if (amount <= lower) break;
    tax += (Math.min(amount, upper) - lower) * rate;
    lower = upper;
  }
  return Math.round(tax);
}

/** Inheritance tax on what passes to non-spouse heirs. */
export function inheritanceTax(countryId, toHeirs, heirs = 1) {
  const r = INHERITANCE[countryId];
  if (!r || r.none || toHeirs <= 0) return 0;
  if (r.perHeir) {
    const n = Math.max(1, heirs);
    return bracketTax(r.brackets, Math.max(0, toHeirs / n - r.exemption)) * n;
  }
  return bracketTax(r.brackets, Math.max(0, toHeirs - r.exemption));
}

/* ------------------------------------------------------------------ */
/* Unemployment and severance                                          */
/* ------------------------------------------------------------------ */

/**
 * unemployment: share of pay replaced (rate, capped), or a flat yearly amount, for `years`.
 * severance: statutory months of pay per year of service (base: a lump on top).
 */
export const UNEMPLOYMENT = {
  CA: { name: 'Employment Insurance (EI)', rate: 0.55, cap: ppp(36000, CAD), years: 0.6 },
  GB: { name: 'New Style Jobseeker\'s Allowance', flat: ppp(4800, GBP), years: 0.5 },
  DE: { name: 'Arbeitslosengeld I', rate: 0.42, cap: ppp(40000, EUR), years: 1 },
  JP: { name: 'Employment insurance (koyō hoken)', rate: 0.5, cap: ppp(3200000, JPY), years: 0.4 },
  KR: { name: 'Job-seeking benefit (gujik geupyeo)', rate: 0.6, cap: ppp(24000000, KRW), years: 0.5 },
  IT: { name: 'NASpI', rate: 0.6, cap: ppp(18600, EUR_IT), years: 1 },
  MX: { none: 'No unemployment insurance: a partial withdrawal from your AFORE at most.', name: 'AFORE unemployment withdrawal', flat: ppp(15000, MXN), years: 1 },
  PH: { name: 'SSS unemployment benefit', rate: 0.5, cap: ppp(40000, PHP), years: 2 / 12 },
  IN: { none: 'No unemployment insurance for most workers.', flat: 0, years: 0 },
  AU: { name: 'JobSeeker Payment', flat: ppp(20000, AUD), years: 0.75 },
  FR: { name: 'Allocation d\'aide au retour à l\'emploi (ARE)', rate: 0.57, cap: ppp(60000, EUR_FR), years: 1.5 },
};
export const SEVERANCE = {
  CA: { perYear: 0.25 }, GB: { perYear: 0.25 }, DE: { perYear: 0.5 }, JP: { perYear: 1 }, KR: { perYear: 1 }, IT: { perYear: 0.9 },
  MX: { perYear: 0.67, base: 3 }, PH: { perYear: 1 }, IN: { perYear: 0.5, minYears: 5 }, AU: { perYear: 0.4 }, FR: { perYear: 0.25 },
};

/** Unemployment benefit after losing a job paying `salary`, where you live. */
export function unemploymentBenefit(countryId, salary) {
  if (!countryId || countryId === 'US') return { amount: Math.round(Math.min(salary * 0.45, 30000) * 0.5), name: 'Unemployment insurance' };
  const u = UNEMPLOYMENT[countryId];
  if (!u) return { amount: 0, name: 'Unemployment benefit' };
  const yearly = u.flat ?? Math.min(salary * u.rate, u.cap);
  return { amount: Math.round(yearly * u.years), name: u.name };
}
/** Statutory severance: months of pay per year of service. */
export function severancePay(countryId, salary, years) {
  if (!countryId || countryId === 'US') return Math.round((salary / 26) * Math.min(years, 26));
  const s = SEVERANCE[countryId];
  if (!s || years < (s.minYears ?? 0)) return 0;
  return Math.round((salary / 12) * ((s.base ?? 0) + s.perYear * Math.min(years, 30)));
}

/* ------------------------------------------------------------------ */
/* Disability                                                          */
/* ------------------------------------------------------------------ */

/**
 * The national disability benefit: a share of average covered pay (rate, with a floor and
 * cap) after minYears of contributions. odds scales approval (most systems approve more
 * claims than SSDI's first stage); stages name the steps of a claim.
 */
export const DISABILITY = {
  CA: { name: 'CPP Disability', rate: 0.25, floor: ppp(7000, CAD), cap: ppp(20000, CAD), minYears: 4, odds: 1.2 },
  GB: { name: 'Universal Credit (health element) and PIP', rate: 0, floor: ppp(9000, GBP), cap: ppp(9000, GBP), minYears: 0, odds: 1.3, stages: ['Work Capability Assessment', 'Mandatory reconsideration', 'First-tier Tribunal', 'Upper Tribunal'] },
  DE: { name: 'Erwerbsminderungsrente', rate: 0.35, floor: 0, cap: ppp(30000, EUR), minYears: 5, odds: 1.3 },
  JP: { name: 'Disability pension (shōgai nenkin)', rate: 0.25, floor: ppp(1000000, JPY), cap: ppp(3000000, JPY), minYears: 1, odds: 1.4 },
  KR: { name: 'NPS disability pension', rate: 0.25, floor: 0, cap: ppp(20000000, KRW), minYears: 1, odds: 1.3 },
  IT: { name: 'Assegno ordinario di invalidità', rate: 0.3, floor: ppp(7000, EUR_IT), cap: ppp(30000, EUR_IT), minYears: 5, odds: 1.2 },
  MX: { name: 'IMSS invalidity pension', rate: 0.35, floor: ppp(30000, MXN), cap: ppp(200000, MXN), minYears: 3, odds: 1.2 },
  PH: { name: 'SSS disability pension', rate: 0.3, floor: ppp(24000, PHP), cap: ppp(120000, PHP), minYears: 3, odds: 1.3 },
  IN: { name: 'EPS disablement pension', rate: 0.15, floor: ppp(12000, INR), cap: ppp(90000, INR), minYears: 1, odds: 1 },
  AU: { name: 'Disability Support Pension', rate: 0, floor: ppp(29000, AUD), cap: ppp(29000, AUD), minYears: 0, odds: 1 },
  FR: { name: 'Pension d\'invalidité', rate: 0.5, floor: ppp(4000, EUR_FR), cap: ppp(23500, EUR_FR), minYears: 1, odds: 1.4 },
};

/* ------------------------------------------------------------------ */
/* Self-employment, credit, small-business loans, veterans, markets    */
/* ------------------------------------------------------------------ */

/** Social contributions the self-employed pay on profit (rate up to a cap); 0 where they're voluntary. */
export const SELF_EMPLOYED = {
  US: { name: 'self-employment tax', rate: 0.153 },
  CA: { name: 'CPP contributions (both halves)', rate: 0.119, cap: ppp(71300, CAD) },
  GB: { name: 'Class 4 National Insurance', rate: 0.06, cap: ppp(50270, GBP), floor: ppp(12570, GBP) },
  DE: { name: 'statutory health and care insurance', rate: 0.19, cap: ppp(66150, EUR) },
  JP: { name: 'National Pension and National Health Insurance', rate: 0.13, cap: ppp(10000000, JPY) },
  KR: { name: 'NPS and health insurance', rate: 0.16, cap: ppp(74400000, KRW) },
  IT: { name: 'INPS contributions', rate: 0.24, cap: ppp(120000, EUR_IT) },
  MX: { name: 'voluntary IMSS', rate: 0 },
  PH: { name: 'SSS and PhilHealth contributions', rate: 0.15, cap: ppp(420000, PHP) },
  IN: { name: 'no mandatory contributions', rate: 0 },
  AU: { name: 'no mandatory contributions (super is optional)', rate: 0 },
  FR: { name: 'cotisations sociales (URSSAF)', rate: 0.35, cap: ppp(188000, EUR_FR) },
};
export function selfEmploymentTax(countryId, profit, usCap) {
  const r = SELF_EMPLOYED[countryId ?? 'US'] ?? SELF_EMPLOYED.US;
  if (!r.rate || profit <= 0) return 0;
  if (!countryId || countryId === 'US') return Math.round(Math.min(profit * 0.9235, usCap) * r.rate);
  return Math.round(Math.max(0, Math.min(profit, r.cap ?? Infinity) - (r.floor ?? 0)) * r.rate);
}

/**
 * Credit records. Where lenders score you, the game's 300–850 score is shown on that
 * scale's name; France and Japan keep only negative registries, so what matters is a clean file.
 */
export const CREDIT = {
  CA: { name: 'credit score (Equifax/TransUnion)' },
  GB: { name: 'credit rating (Experian)' },
  DE: { name: 'SCHUFA score' },
  JP: { name: 'credit record (CIC)', registry: true },
  KR: { name: 'credit score (NICE)' },
  IT: { name: 'credit record (CRIF)' },
  MX: { name: 'Buró de Crédito score' },
  PH: { name: 'credit record (CIC)' },
  IN: { name: 'CIBIL score' },
  AU: { name: 'credit score (Equifax)' },
  FR: { name: 'Banque de France file (FICP)', registry: true },
};
/** Government-backed small-business lending, in place of the SBA. */
export const SMALL_BIZ_LOAN = {
  CA: 'Canada Small Business Financing Program', GB: 'British Business Bank Start Up Loans', DE: 'KfW start-up loan', JP: 'Japan Finance Corporation loan',
  KR: 'KODIT-guaranteed loan', IT: 'Fondo di Garanzia PMI loan', MX: 'Nafin-backed loan', PH: 'SB Corp loan', IN: 'Mudra loan', AU: 'SME Guarantee Scheme loan', FR: 'Bpifrance-guaranteed loan',
};
/** Veterans' associations and care. */
export const VETERANS = {
  CA: { orgs: ['Royal Canadian Legion', 'Army, Navy & Air Force Veterans in Canada'], care: 'Veterans Affairs Canada' },
  GB: { orgs: ['Royal British Legion', 'Help for Heroes'], care: 'Op COURAGE (NHS veterans\' mental health)' },
  DE: { orgs: ['Reservistenverband', 'Bund Deutscher Veteranen'], care: 'the Bundeswehr veterans\' service' },
  JP: { orgs: ['Japan SDF Retirees Association (Taiyūkai)', 'Kaikōsha'], care: 'the Ministry of Defense support office' },
  KR: { orgs: ['Korea Veterans Association', 'Korean Disabled Veterans Association'], care: 'the Ministry of Patriots and Veterans Affairs' },
  IT: { orgs: ['Associazione Nazionale Combattenti e Reduci', 'UNUCI'], care: 'the Defence health service' },
  MX: { orgs: ['Asociación de Militares Retirados', 'Legión de Honor Nacional'], care: 'ISSFAM' },
  PH: { orgs: ['Veterans Federation of the Philippines', 'Retired Officers Association'], care: 'the Philippine Veterans Affairs Office (PVAO)' },
  IN: { orgs: ['Indian Ex-Servicemen League', 'Kendriya Sainik Board'], care: 'the Ex-Servicemen Contributory Health Scheme (ECHS)' },
  AU: { orgs: ['Returned & Services League (RSL)', 'Legacy Australia'], care: 'the Department of Veterans\' Affairs (DVA)' },
  FR: { orgs: ['Union nationale des combattants', 'Le Souvenir Français'], care: 'the Office national des combattants (ONaCVG)' },
};
/** The stock index the market report follows. */
export const STOCK_INDEX = { US: 'S&P', CA: 'TSX', GB: 'FTSE 100', DE: 'DAX', JP: 'Nikkei 225', KR: 'KOSPI', IT: 'FTSE MIB', MX: 'IPC', PH: 'PSEi', IN: 'Nifty 50', AU: 'ASX 200', FR: 'CAC 40' };

/* ------------------------------------------------------------------ */
/* Mortgages and buying costs                                          */
/* ------------------------------------------------------------------ */

/**
 * Home loans as each country's lenders sell them (2025). rateAdj is relative to the US
 * base rate (so it carries the country's rate level); reset is when a fixed period ends
 * and the loan moves to the going rate; stress is the extra rate a lender tests you at.
 * closing is the cost of buying (transfer/stamp duty, notary, fees) as a share of the price.
 * No FHA or VA loans outside the US.
 */
export const MORTGAGES = {
  CA: { closing: 0.025, stress: 0.02, products: {
    fixed5: { name: '5-yr fixed, 25-yr amortization', years: 25, rateAdj: -0.024, minDown: 0.05, minScore: 600, maxDti: 0.39, arm: true, reset: 5 },
    variable: { name: 'Variable rate, 25-yr', years: 25, rateAdj: -0.022, minDown: 0.05, minScore: 600, maxDti: 0.39, arm: true, reset: 1 },
  } },
  GB: { closing: 0.035, stress: 0.01, products: {
    fix2: { name: '2-yr fixed (then SVR)', years: 25, rateAdj: -0.022, minDown: 0.05, minScore: 600, maxDti: 0.4, arm: true, reset: 2 },
    fix5: { name: '5-yr fixed (then SVR)', years: 25, rateAdj: -0.023, minDown: 0.1, minScore: 600, maxDti: 0.4, arm: true, reset: 5 },
    tracker: { name: 'Base-rate tracker', years: 25, rateAdj: -0.018, minDown: 0.1, minScore: 620, maxDti: 0.4, arm: true, reset: 1 },
  } },
  DE: { closing: 0.09, products: {
    zins10: { name: '10-yr Zinsbindung (30-yr loan)', years: 30, rateAdj: -0.03, minDown: 0.2, minScore: 620, maxDti: 0.4, arm: true, reset: 10 },
    zins15: { name: '15-yr Zinsbindung (30-yr loan)', years: 30, rateAdj: -0.027, minDown: 0.2, minScore: 620, maxDti: 0.4, arm: true, reset: 15 },
  } },
  JP: { closing: 0.06, products: {
    flat35: { name: 'Flat 35 (35-yr fixed)', years: 35, rateAdj: -0.046, minDown: 0.1, minScore: 600, maxDti: 0.35 },
    variable: { name: 'Variable rate (35-yr)', years: 35, rateAdj: -0.057, minDown: 0.1, minScore: 600, maxDti: 0.35, arm: true, reset: 1 },
  } },
  KR: { closing: 0.04, stress: 0.015, products: {
    bogeumjari: { name: 'Bogeumjari loan (fixed, 30-yr)', years: 30, rateAdj: -0.025, minDown: 0.3, minScore: 600, maxDti: 0.4 },
    bank: { name: 'Bank mixed-rate loan (30-yr)', years: 30, rateAdj: -0.022, minDown: 0.3, minScore: 620, maxDti: 0.4, arm: true, reset: 5 },
  } },
  IT: { closing: 0.06, products: {
    fisso: { name: 'Mutuo a tasso fisso (25-yr)', years: 25, rateAdj: -0.033, minDown: 0.2, minScore: 620, maxDti: 0.33 },
    variabile: { name: 'Mutuo a tasso variabile (25-yr)', years: 25, rateAdj: -0.035, minDown: 0.2, minScore: 620, maxDti: 0.33, arm: true, reset: 1 },
  } },
  MX: { closing: 0.06, products: {
    infonavit: { name: 'INFONAVIT credit (30-yr)', years: 30, rateAdj: 0.0, minDown: 0.05, minScore: 560, maxDti: 0.3, formalJob: true },
    banco: { name: 'Bank mortgage (20-yr fixed)', years: 20, rateAdj: 0.04, minDown: 0.15, minScore: 640, maxDti: 0.35 },
  } },
  PH: { closing: 0.05, products: {
    pagibig: { name: 'Pag-IBIG housing loan (30-yr)', years: 30, rateAdj: -0.004, minDown: 0.1, minScore: 560, maxDti: 0.35, formalJob: true },
    bank: { name: 'Bank home loan (20-yr)', years: 20, rateAdj: 0.012, minDown: 0.2, minScore: 620, maxDti: 0.35, arm: true, reset: 5 },
  } },
  IN: { closing: 0.07, products: {
    floating: { name: 'Home loan, floating rate (20-yr)', years: 20, rateAdj: 0.02, minDown: 0.2, minScore: 650, maxDti: 0.5, arm: true, reset: 1 },
  } },
  AU: { closing: 0.045, stress: 0.03, products: {
    variable: { name: 'Variable rate with offset (30-yr)', years: 30, rateAdj: -0.003, minDown: 0.05, minScore: 600, maxDti: 0.4, arm: true, reset: 1 },
    fixed3: { name: '3-yr fixed (30-yr)', years: 30, rateAdj: -0.006, minDown: 0.1, minScore: 620, maxDti: 0.4, arm: true, reset: 3 },
  } },
  FR: { closing: 0.075, products: {
    fixe25: { name: 'Prêt immobilier à taux fixe (25-yr)', years: 25, rateAdj: -0.033, minDown: 0.1, minScore: 600, maxDti: 0.35 },
    fixe20: { name: 'Prêt immobilier à taux fixe (20-yr)', years: 20, rateAdj: -0.035, minDown: 0.1, minScore: 600, maxDti: 0.35 },
  } },
};

/* ------------------------------------------------------------------ */
/* Trade unions                                                        */
/* ------------------------------------------------------------------ */

/** The kind of union each US union in the game is, so each country can name its own. */
const UNION_KIND = {
  'Fraternal Order of Police Lodge 7': 'police', 'Airport Police Officers Association': 'police', 'Transit Police Benevolent Association': 'police', 'State Troopers Association': 'police', 'University Police Officers Association': 'police', 'Fraternal Order of Police — Special Police Lodge': 'police',
  'IAFF Local 22': 'fire', 'IAFF Airport Firefighters Local': 'fire', 'Contract Firefighters Union': 'fire', 'State Firefighters Local': 'fire',
  'Teamsters EMS Local 1199': 'ems', 'AFSCME EMS Local 2507': 'ems',
  'National Nurses United': 'health', 'SEIU Healthcare': 'health', 'AFSCME Public Health Local': 'health',
  'State Education Association': 'education', 'Faculty Federation': 'education', 'Faculty Association': 'education',
  AFSCME: 'public', 'AFSCME Council 31': 'public', 'AFSCME Local 1001': 'public', 'AFSCME Highway Workers': 'public', 'SEIU State Workers': 'public', 'Public Defenders Union': 'public', 'National Treasury Employees Union': 'public', 'Probation & Parole Officers Association': 'public', 'Communications Workers Local': 'public',
  'Correctional Peace Officers Association': 'prisons', 'AFSCME Detention Officers Local': 'prisons', 'Correctional Workers United': 'prisons',
  'Teamsters Local 710': 'transport', Teamsters: 'transport', 'Amalgamated Transit Union Local 241': 'transport', 'Amalgamated Transit Union Local 1181': 'transport', 'Transport Workers Union Local 100': 'transport', 'SMART Transportation Division': 'rail', 'Seafarers International Union': 'transport', 'School Bus Drivers Local': 'transport', 'Teamsters Airline Division': 'aviation',
  'Air Line Pilots Association': 'pilots', 'Association of Flight Attendants–CWA': 'aviation', 'National Air Traffic Controllers Association': 'aviation',
  'IBEW Local 98': 'trades', 'IBEW Outside Local 1245': 'trades', 'UA Plumbers & Pipefitters Local 130': 'trades', 'United Association (UA) Local 597': 'trades', 'International Brotherhood of Boilermakers': 'trades', 'United Brotherhood of Carpenters Local 1': 'trades', 'Iron Workers Local 40': 'trades', 'Operating Engineers Local 150': 'trades',
  'United Auto Workers (UAW)': 'industry', 'UFCW Local 400': 'retail', 'UNITE HERE Local 1': 'hospitality', 'UNITE HERE Local 11': 'hospitality', 'SEIU Security Officers United': 'services', 'Workers United (SEIU)': 'services',
  NewsGuild: 'media', 'Tech Workers Union': 'tech', 'SAG-AFTRA': 'arts', 'American Federation of Musicians': 'arts', 'Players Association': 'arts', 'National Association of Letter Carriers': 'postal',
  // US federal and county bodies: no counterpart abroad.
  'AFGE TSA Council 100': null, 'Deputy Sheriffs\' Association': null, 'AFGE Council of Prison Locals': null, 'Federal Law Enforcement Officers Association': null, 'AFGE National Council of SSA Field Operations Locals': null, 'National Border Patrol Council': null,
};
/**
 * Each country's unions by kind. null: workers in that service may not unionize
 * (police in Japan, Korea, Mexico, the Philippines and India; firefighters in Japan).
 */
export const UNIONS = {
  CA: { police: 'Police Association', fire: 'IAFF Canada Local', ems: 'CUPE Paramedics Local', health: 'Nurses\' Union', education: 'Teachers\' Federation', public: 'CUPE', prisons: 'Union of Canadian Correctional Officers', transport: 'Unifor (transportation)', rail: 'Teamsters Canada Rail Conference', aviation: 'CUPE Airline Division', pilots: 'Air Canada Pilots Association', trades: 'Building Trades Council', industry: 'Unifor', retail: 'UFCW Canada', hospitality: 'UNITE HERE Canada', services: 'SEIU Canada', media: 'Unifor Media', tech: 'Unifor (tech)', arts: 'ACTRA', postal: 'Canadian Union of Postal Workers' },
  GB: { police: 'Police Federation', fire: 'Fire Brigades Union', ems: 'Unison (ambulance)', health: 'Royal College of Nursing', education: 'National Education Union', public: 'Unison', prisons: 'Prison Officers\' Association', transport: 'Unite (transport)', rail: 'RMT', aviation: 'Unite (aviation)', pilots: 'BALPA', trades: 'Unite (construction)', industry: 'Unite', retail: 'Usdaw', hospitality: 'GMB (hospitality)', services: 'GMB', media: 'National Union of Journalists', tech: 'Prospect', arts: 'Equity', postal: 'Communication Workers Union' },
  DE: { police: 'Gewerkschaft der Polizei (GdP)', fire: 'komba Feuerwehr', ems: 'ver.di Rettungsdienst', health: 'ver.di Gesundheit', education: 'GEW', public: 'ver.di', prisons: 'BSBD', transport: 'ver.di Verkehr', rail: 'EVG', aviation: 'UFO', pilots: 'Vereinigung Cockpit', trades: 'IG BAU', industry: 'IG Metall', retail: 'ver.di Handel', hospitality: 'NGG', services: 'ver.di', media: 'DJV', tech: 'IG Metall (IT)', arts: 'GDBA', postal: 'ver.di Post' },
  JP: { police: null, fire: null, ems: null, health: 'Japan Federation of Medical Workers\' Unions', education: 'Japan Teachers\' Union (Nikkyōso)', public: 'Jichirō', prisons: null, transport: 'Kōtsū Rōren', rail: 'JR Rengō', aviation: 'Kōkū Rengō', pilots: 'ALPA Japan', trades: 'Zenkensōren', industry: 'JAM', retail: 'UA Zensen', hospitality: 'UA Zensen', services: 'UA Zensen', media: 'Shimbun Rōren', tech: 'Denki Rengō', arts: 'Japan Actors Union', postal: 'JP Union' },
  KR: { police: null, fire: 'Korean Government Employees\' Union (fire)', ems: 'Korean Government Employees\' Union (fire)', health: 'Korean Health and Medical Workers\' Union', education: 'Korean Teachers and Education Workers\' Union', public: 'Korean Government Employees\' Union', prisons: null, transport: 'Korean Public Service and Transport Workers\' Union', rail: 'Korean Railway Workers\' Union', aviation: 'Korean Air Cabin Crew Union', pilots: 'Korean Air Pilots Union', trades: 'Korean Construction Workers\' Union', industry: 'Korean Metal Workers\' Union', retail: 'Korean Service Workers\' Union', hospitality: 'Korean Service Workers\' Union', services: 'Korean Service Workers\' Union', media: 'National Union of Media Workers', tech: 'Korean Financial and IT Workers\' Union', arts: 'Korean Broadcasting Actors\' Union', postal: 'Korea Postal Workers\' Union' },
  IT: { police: 'SIULP', fire: 'FP CGIL Vigili del Fuoco', ems: 'FP CGIL Sanità', health: 'Nursind', education: 'FLC CGIL', public: 'FP CGIL', prisons: 'SAPPE', transport: 'FILT CGIL', rail: 'FILT CGIL Ferrovieri', aviation: 'ANPAC', pilots: 'ANPAC', trades: 'FILLEA CGIL', industry: 'FIOM CGIL', retail: 'FILCAMS CGIL', hospitality: 'FILCAMS CGIL', services: 'FILCAMS CGIL', media: 'FNSI', tech: 'FIOM CGIL (ICT)', arts: 'SLC CGIL', postal: 'SLP CISL' },
  MX: { police: null, fire: 'Sindicato de Bomberos', ems: 'SNTSA', health: 'SNTSA', education: 'SNTE', public: 'FSTSE', prisons: null, transport: 'CTM Transporte', rail: 'Sindicato de Trabajadores Ferrocarrileros', aviation: 'ASSA de México', pilots: 'ASPA', trades: 'CTM Construcción', industry: 'CTM', retail: 'CROC', hospitality: 'CROC', services: 'CROC', media: 'SITATYR', tech: 'Sindicato de Telefonistas', arts: 'ANDA', postal: 'Sindicato de Correos de México' },
  PH: { police: null, fire: null, ems: 'PSLINK', health: 'Alliance of Health Workers', education: 'Alliance of Concerned Teachers', public: 'PSLINK', prisons: null, transport: 'PISTON', rail: 'PNR Workers Union', aviation: 'Flight Attendants and Stewards Association of the Philippines', pilots: 'Airline Pilots Association of the Philippines', trades: 'Associated Labor Unions (construction)', industry: 'Kilusang Mayo Uno', retail: 'ALU-TUCP', hospitality: 'NUWHRAIN', services: 'ALU-TUCP', media: 'NUJP', tech: 'BIEN', arts: null, postal: 'PhilPost Employees Union' },
  IN: { police: null, fire: null, ems: 'EMRI Workers\' Union', health: 'All India Nurses\' Federation', education: 'All India Federation of Teachers\' Organisations', public: 'Confederation of Central Government Employees', prisons: null, transport: 'All India Road Transport Workers\' Federation', rail: 'All India Railwaymen\'s Federation', aviation: 'Air India Employees Union', pilots: 'Indian Commercial Pilots\' Association', trades: 'Construction Workers Federation of India', industry: 'CITU', retail: 'INTUC', hospitality: 'INTUC', services: 'INTUC', media: 'Indian Journalists Union', tech: 'NITES', arts: 'FWICE', postal: 'National Federation of Postal Employees' },
  AU: { police: 'Police Association', fire: 'United Firefighters Union', ems: 'Ambulance Employees Association', health: 'Australian Nursing and Midwifery Federation', education: 'Australian Education Union', public: 'Community and Public Sector Union', prisons: 'CPSU (corrections)', transport: 'Transport Workers\' Union', rail: 'Rail, Tram and Bus Union', aviation: 'Flight Attendants\' Association of Australia', pilots: 'Australian Federation of Air Pilots', trades: 'CFMEU', industry: 'AMWU', retail: 'SDA', hospitality: 'United Workers Union', services: 'United Workers Union', media: 'MEAA', tech: 'Professionals Australia', arts: 'MEAA Equity', postal: 'CEPU' },
  FR: { police: 'Alliance Police nationale', fire: 'SNSPP-PATS', ems: 'SUD Santé', health: 'CGT Santé', education: 'SNES-FSU', public: 'CGT Fonction publique', prisons: 'FO Pénitentiaire', transport: 'CGT Transports', rail: 'SUD-Rail', aviation: 'SNPNC', pilots: 'SNPL', trades: 'CGT Construction', industry: 'CGT Métallurgie', retail: 'CFDT Services', hospitality: 'CFDT Services', services: 'CFDT Services', media: 'SNJ', tech: 'CGT Informatique', arts: 'SFA-CGT', postal: 'SUD PTT' },
};
/** A US union's counterpart where you live: a name, null (none here), or the US name in the US. */
export function localUnionName(countryId, usName) {
  if (!countryId || countryId === 'US' || !UNIONS[countryId]) return usName;
  if (!(usName in UNION_KIND)) return Object.values(UNIONS[countryId]).includes(usName) ? usName : UNIONS[countryId].services ?? null;
  const kind = UNION_KIND[usName];
  return kind ? UNIONS[countryId][kind] ?? null : null;
}

/* ------------------------------------------------------------------ */
/* Cadets, foreign-service exams, prosecutors                          */
/* ------------------------------------------------------------------ */

/** School cadet programs in place of JROTC and the US Sea Cadets (null: none in schools there). */
export const CADETS = {
  CA: { jrotc: 'Royal Canadian Army Cadets', seaCadets: 'Royal Canadian Sea Cadets' },
  GB: { jrotc: 'Combined Cadet Force', seaCadets: 'Sea Cadets' },
  DE: { jrotc: null, seaCadets: null },
  JP: { jrotc: null, seaCadets: null },
  KR: { jrotc: null, seaCadets: null },
  IT: { jrotc: null, seaCadets: null },
  MX: { jrotc: null, seaCadets: null },
  PH: { jrotc: 'Citizenship Advancement Training (CAT)', seaCadets: null },
  IN: { jrotc: 'National Cadet Corps (NCC)', seaCadets: 'NCC Naval Wing' },
  AU: { jrotc: 'Australian Army Cadets', seaCadets: 'Australian Navy Cadets' },
  FR: { jrotc: 'Cadets de la Défense', seaCadets: null },
};
/** The diplomatic-service entrance exam. */
export const FOREIGN_SERVICE_EXAM = {
  CA: 'Foreign Service Exam (FSE)', GB: 'FCDO Fast Stream assessment', DE: 'Auswahlverfahren für den höheren Auswärtigen Dienst', JP: 'National Public Service Exam (Comprehensive)',
  KR: 'Diplomatic Candidate Selection Exam', IT: 'Concorso diplomatico', MX: 'Servicio Exterior Mexicano entrance exam', PH: 'Foreign Service Officer Examination (FSOE)',
  IN: 'UPSC Civil Services Examination (IFS)', AU: 'DFAT Graduate Program assessment', FR: 'Concours d\'Orient / INSP',
};
/** Public prosecution services, legal aid offices and probation services. */
export const PROSECUTORS = {
  CA: ['Crown Prosecutor\'s Office', 'Legal Aid Office', 'Probation Services'],
  GB: ['Crown Prosecution Service', 'Public Defender Service', 'Probation Service'],
  DE: ['Staatsanwaltschaft', 'Pflichtverteidiger chambers', 'Bewährungshilfe'],
  JP: ['Public Prosecutors Office', 'Japan Legal Support Center (Hōterasu)', 'Probation Office'],
  KR: ['Prosecutors\' Office', 'Public Defender\'s Office (Gukseon)', 'Probation Office'],
  IT: ['Procura della Repubblica', 'Difensori d\'ufficio', 'UEPE (probation service)'],
  MX: ['Fiscalía General', 'Defensoría Pública', 'Supervision of Precautionary Measures'],
  PH: ['Office of the City Prosecutor (DOJ)', 'Public Attorney\'s Office', 'Parole and Probation Administration'],
  IN: ['Directorate of Prosecution', 'Legal Services Authority', 'Probation Office'],
  AU: ['Office of the Director of Public Prosecutions', 'Legal Aid Commission', 'Community Corrections'],
  FR: ['Parquet (ministère public)', 'Bureau d\'aide juridictionnelle', 'SPIP (probation)'],
};

/** Volunteer emergency services by their local names (null: no such service there). */
export const VOLUNTEER_SERVICES = {
  CA: { fire: 'Volunteer Fire Department', police: 'Auxiliary Police', sar: 'Ground Search and Rescue', ambulance: 'St. John Ambulance', wildland: 'Forest Fire Crew', auxiliary: 'Canadian Coast Guard Auxiliary', cap: 'Civil Air Search and Rescue Association (CASARA)', cert: 'Community Emergency Response Team', redcross: 'Canadian Red Cross Disaster Team', skiPatrol: 'Canadian Ski Patrol', mrc: null },
  GB: { fire: 'On-Call (Retained) Fire Service', police: 'Special Constabulary', sar: 'Mountain Rescue Team', ambulance: 'St John Ambulance', wildland: null, auxiliary: 'RNLI Lifeboat Crew', cap: null, cert: 'Community Resilience Team', redcross: 'British Red Cross Emergency Response', skiPatrol: null, mrc: null },
  DE: { fire: 'Freiwillige Feuerwehr', police: 'Sicherheitswacht', sar: 'Bergwacht', ambulance: 'ASB Volunteer Ambulance', wildland: null, auxiliary: 'DGzRS Sea Rescue', cap: null, cert: 'Technisches Hilfswerk (THW)', redcross: 'Deutsches Rotes Kreuz Bereitschaft', skiPatrol: 'Bergwacht Ski Patrol', mrc: null },
  JP: { fire: 'Shōbōdan (Volunteer Fire Corps)', police: null, sar: 'Mountain Rescue Team', ambulance: null, wildland: null, auxiliary: null, cap: null, cert: 'Jishu Bōsai Soshiki (Neighborhood Disaster Group)', redcross: 'Japanese Red Cross Volunteers', skiPatrol: 'Ski Patrol', mrc: null },
  KR: { fire: 'Volunteer Fire Brigade (Uiyong Sobangdae)', police: 'Citizen Patrol (Jayul Bangbeomdae)', sar: 'Mountain Rescue Team', ambulance: null, wildland: null, auxiliary: 'Coast Guard Auxiliary', cap: null, cert: 'Civil Defense Corps (Minbangwidae)', redcross: 'Korean Red Cross Volunteers', skiPatrol: 'Ski Patrol', mrc: null },
  IT: { fire: 'Vigili del Fuoco Volontari', police: null, sar: 'Soccorso Alpino (CNSAS)', ambulance: 'Misericordia Volunteer Ambulance', wildland: 'Antincendio Boschivo Volunteers', auxiliary: null, cap: null, cert: 'Protezione Civile Volunteers', redcross: 'Croce Rossa Italiana', skiPatrol: 'Soccorso Piste', mrc: null },
  MX: { fire: 'Bomberos Voluntarios', police: null, sar: 'Brigada de Rescate Topos', ambulance: 'Cruz Roja Volunteer Paramedics', wildland: 'CONAFOR Volunteer Brigade', auxiliary: null, cap: null, cert: 'Brigada de Protección Civil', redcross: 'Cruz Roja Mexicana', skiPatrol: null, mrc: null },
  PH: { fire: 'Fire Volunteer Brigade', police: 'Barangay Tanod', sar: 'Rescue Volunteers', ambulance: null, wildland: null, auxiliary: 'Philippine Coast Guard Auxiliary', cap: null, cert: 'Barangay Disaster Response Team', redcross: 'Philippine Red Cross', skiPatrol: null, mrc: null },
  IN: { fire: null, police: 'Home Guards', sar: 'NDRF Volunteer Rescuers', ambulance: 'St John Ambulance India', wildland: null, auxiliary: null, cap: null, cert: 'Civil Defence Volunteers', redcross: 'Indian Red Cross Society', skiPatrol: null, mrc: null },
  AU: { fire: 'Rural Fire Service', police: null, sar: 'SES Search and Rescue', ambulance: 'St John Ambulance Australia', wildland: 'RFS Bushfire Crew', auxiliary: 'Marine Rescue', cap: null, cert: 'State Emergency Service (SES)', redcross: 'Australian Red Cross', skiPatrol: 'Ski Patrol', mrc: null },
  FR: { fire: 'Sapeurs-Pompiers Volontaires', police: 'Réserve opérationnelle de la Gendarmerie', sar: 'Secours en Montagne', ambulance: 'Protection Civile', wildland: 'Comités Communaux Feux de Forêts', auxiliary: 'SNSM Sea Rescue', cap: null, cert: 'Réserve Communale de Sécurité Civile', redcross: 'Croix-Rouge française', skiPatrol: 'Pisteurs-Secouristes', mrc: null },
};
const US_SERVICE_NAMES = { fire: 'Volunteer Fire Department', police: 'Police Reserve Unit', sar: 'Search & Rescue Team', ambulance: 'Volunteer Ambulance Corps', wildland: 'Wildland Fire Crew', auxiliary: 'Coast Guard Auxiliary', cap: 'Civil Air Patrol', cert: 'Community Emergency Response Team', redcross: 'Red Cross Disaster Action Team', skiPatrol: 'National Ski Patrol', mrc: 'Medical Reserve Corps' };
/** Whether a volunteer service exists where you live. */
export const volunteerServiceHere = (countryId, serviceId) => !VOLUNTEER_SERVICES[countryId] || Boolean(VOLUNTEER_SERVICES[countryId][serviceId]);
/** Display swaps for the volunteer services' names. */
export function volunteerTerms(countryId) {
  const v = VOLUNTEER_SERVICES[countryId];
  if (!v) return {};
  return Object.fromEntries(Object.entries(US_SERVICE_NAMES).filter(([id]) => v[id]).map(([id, n]) => [n, v[id]]));
}

/* ------------------------------------------------------------------ */
/* Retirement and savings accounts                                     */
/* ------------------------------------------------------------------ */

/**
 * Each country's tax-advantaged accounts in place of the 401(k) and IRAs (2025 limits, PPP).
 *   dc           the workplace plan
 *   roth         taxed going in, tax-free coming out (TFSA, ISA, NISA…); null: none
 *   traditional  deductible now, taxed later (RRSP, SIPP, iDeCo…); share caps it at a share of earned income
 */
export const ACCOUNTS = {
  CA: { dc: 'Group RRSP / pension plan', roth: { name: 'TFSA', limit: ppp(7000, CAD) }, traditional: { name: 'RRSP', limit: ppp(32490, CAD), share: 0.18 } },
  GB: { dc: 'Workplace pension', roth: { name: 'Stocks & Shares ISA', limit: ppp(20000, GBP) }, traditional: { name: 'SIPP', limit: ppp(60000, GBP), share: 1 } },
  DE: { dc: 'Betriebsrente (bAV)', roth: null, traditional: { name: 'Riester-Rente', limit: ppp(2100, EUR) } },
  JP: { dc: 'Corporate DC plan', roth: { name: 'NISA', limit: ppp(3600000, JPY) }, traditional: { name: 'iDeCo', limit: ppp(276000, JPY) } },
  KR: { dc: 'Retirement pension (DC type)', roth: { name: 'ISA', limit: ppp(20000000, KRW) }, traditional: { name: 'IRP / pension savings', limit: ppp(18000000, KRW) } },
  IT: { dc: 'Fondo pensione negoziale', roth: { name: 'PIR', limit: ppp(40000, EUR_IT) }, traditional: { name: 'Fondo pensione aperto', limit: ppp(5164, EUR_IT) } },
  MX: { dc: 'AFORE', roth: { name: 'AFORE voluntary savings', limit: ppp(100000, MXN) }, traditional: { name: 'Plan Personal de Retiro (PPR)', limit: ppp(198000, MXN), share: 0.1 } },
  PH: { dc: 'SSS WISP', roth: { name: 'Pag-IBIG MP2', limit: ppp(200000, PHP) }, traditional: { name: 'PERA', limit: ppp(200000, PHP) } },
  IN: { dc: 'EPF', roth: { name: 'PPF', limit: ppp(150000, INR) }, traditional: { name: 'NPS Tier I', limit: ppp(200000, INR) } },
  AU: { dc: 'Superannuation', roth: { name: 'Non-concessional super', limit: ppp(120000, AUD) }, traditional: { name: 'Concessional super', limit: ppp(30000, AUD) } },
  FR: { dc: 'PER collectif / épargne salariale', roth: { name: 'PEA', limit: ppp(30000, EUR_FR) }, traditional: { name: 'PER individuel', limit: ppp(35194, EUR_FR), share: 0.1 } },
};

/* ------------------------------------------------------------------ */
/* Referendums                                                         */
/* ------------------------------------------------------------------ */

/**
 * Votes put to the people in place of US local ballot measures (effects as in civic/Local
 * MEASURES: services, safety, a yearly levy or a property-tax multiplier). quorum: void
 * unless half the electorate turns out (Italy's abrogative referendums usually fall short).
 * Japan has never held a national referendum and India has none.
 */
export const REFERENDUMS = {
  CA: {
    electoralReform: { name: 'Provincial referendum on proportional representation', icon: '🗳️', support: 0.42, effects: { services: 1 }, pitch: 'Replace first-past-the-post with a proportional system.' },
    transitLevy: { name: 'Municipal transit levy plebiscite', icon: '🚇', support: 0.5, effects: { levy: 200, services: 5 }, pitch: 'A dedicated levy for buses and light rail.' },
  },
  GB: {
    localMayor: { name: 'Referendum on a directly elected mayor', icon: '🏛️', support: 0.45, effects: { services: 2 }, pitch: 'Replace the council leader with a mayor elected by everyone.' },
    councilTax: { name: 'Council tax referendum (above-cap rise)', icon: '🧾', support: 0.4, effects: { levy: 150, services: 6 }, pitch: 'Raise council tax beyond the cap to protect local services.' },
  },
  DE: {
    buergerentscheid: { name: 'Bürgerentscheid on a new tram line', icon: '🚋', support: 0.52, effects: { levy: 120, services: 5 }, pitch: 'Build the long-planned tram extension.' },
    housingVolksentscheid: { name: 'Volksentscheid on expropriating large landlords', icon: '🏘️', support: 0.48, effects: { services: 3, taxMult: 0.02 }, pitch: 'Buy out landlords owning 3,000+ flats to cap rents.' },
  },
  KR: {
    constitution: { name: 'Constitutional referendum (presidential term)', icon: '📜', support: 0.5, effects: { services: 1 }, pitch: 'Two four-year presidential terms instead of one five-year term.' },
  },
  IT: {
    abrogativeLabour: { name: 'Abrogative referendum on labour law', icon: '✊', support: 0.6, quorum: true, effects: { services: 2 }, pitch: 'Repeal limits on reinstatement after unfair dismissal.' },
    abrogativeCitizenship: { name: 'Abrogative referendum on citizenship residency', icon: '🛂', support: 0.55, quorum: true, effects: { services: 1 }, pitch: 'Cut the residence needed to naturalize from 10 years to 5.' },
  },
  MX: {
    consulta: { name: 'Consulta popular on prosecuting former presidents', icon: '⚖️', support: 0.9, quorum: true, effects: { safety: 1 }, pitch: 'Should the authorities investigate past administrations?' },
  },
  PH: {
    plebiscite: { name: 'Plebiscite on dividing the province', icon: '🗺️', support: 0.5, effects: { services: 3, levy: 40 }, pitch: 'Split the province in two, with new capitals and offices.' },
  },
  AU: {
    constitution: { name: 'Constitutional referendum', icon: '📜', support: 0.42, effects: { services: 1 }, pitch: 'Amend the constitution (needs a national majority and a majority of states).' },
    councilAmalgamation: { name: 'Council amalgamation poll', icon: '🏛️', support: 0.45, effects: { levy: -60, services: -1 }, pitch: 'Merge neighbouring councils to cut costs.' },
  },
  FR: {
    referendumLocal: { name: 'Référendum local on a new tram line', icon: '🚋', support: 0.53, effects: { levy: 110, services: 5 }, pitch: 'Build the tram extension the region proposes.' },
  },
};

/* ------------------------------------------------------------------ */
/* University entrance exams (used by SchoolPaths)                     */
/* ------------------------------------------------------------------ */

/**
 *   name    the exam; prep the cram school and its yearly cost (PPP)
 *   weight  how much the score decides admission (0–1)
 *   resit   whether people commonly re-sit a year later
 */
export const ENTRANCE_EXAMS = {
  CA: { name: 'provincial diploma exams', prep: { name: 'tutoring', cost: ppp(3000, 1.2) }, weight: 0.3 },
  GB: { name: 'A-levels', prep: { name: 'private tutoring', cost: ppp(3000, 0.68) }, weight: 0.7 },
  DE: { name: 'Abitur', prep: { name: 'Nachhilfe tutoring', cost: ppp(1800, 0.72) }, weight: 0.6 },
  JP: { name: 'Common Test for University Admissions', prep: { name: 'juku (cram school)', cost: ppp(600000, 96) }, weight: 0.9, resit: 'rōnin' },
  KR: { name: 'suneung (CSAT)', prep: { name: 'hagwon (cram school)', cost: ppp(8000000, 830) }, weight: 1, resit: 'jaesu' },
  IT: { name: 'maturità', prep: { name: 'ripetizioni (tutoring)', cost: ppp(1500, 0.64) }, weight: 0.3 },
  MX: { name: 'EXANI-II / UNAM entrance exam', prep: { name: 'prep course', cost: ppp(12000, 10.5) }, weight: 0.6, resit: 'retry' },
  PH: { name: 'UPCAT and college entrance tests', prep: { name: 'review center', cost: ppp(15000, 19.5) }, weight: 0.6 },
  IN: { name: 'JEE / NEET / CUET', prep: { name: 'coaching centre (Kota)', cost: ppp(150000, 22) }, weight: 1, resit: 'drop year' },
  AU: { name: 'ATAR (Year 12 exams)', prep: { name: 'private tutoring', cost: ppp(3000, 1.45) }, weight: 0.7 },
  FR: { name: 'baccalauréat', prep: { name: 'cours particuliers', cost: ppp(1500, 0.71) }, weight: 0.4 },
};
