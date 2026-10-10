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
