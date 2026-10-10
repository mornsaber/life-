/**
 * South Korea, Italy, Mexico, the Philippines and India: the same shape as
 * the entries in Countries.js (see its header). Amounts are converted from
 * local currency to US dollars at purchasing-power parity (OECD/World Bank
 * 2023 PPP factors) and cite their year.
 *
 *   informality  the share of private jobs that are informal: cash pay, no contract,
 *                no payroll contributions and no pension credit (Mexico, the Philippines, India)
 */

const ppp = (local, perUsd) => Math.round(local / perUsd);

/* ------------------------------------------------------------------ */
/* South Korea                                                         */
/* ------------------------------------------------------------------ */

const KRW = 830;
export const KR = {
  id: 'KR',
  name: 'South Korea',
  flag: '🇰🇷',
  demonym: 'South Korean',
  capital: 'Seoul',
  currency: { code: 'KRW', symbol: '₩', perUsd: KRW },
  languages: ['Korean'],
  retirementAge: 65,
  tax: {
    // 2025: 6% to ₩14M, 15% to ₩50M, 24% to ₩88M, 35% to ₩150M, 38% to ₩300M, 40% to ₩500M, 42% to ₩1B, 45% above;
    // local income tax adds 10% of the national tax. Earned-income and basic deductions ≈ ₩14M for a typical salary.
    allowance: ppp(14000000, KRW),
    brackets: [[ppp(14000000, KRW), 0.06], [ppp(50000000, KRW), 0.15], [ppp(88000000, KRW), 0.24], [ppp(150000000, KRW), 0.35], [ppp(300000000, KRW), 0.38], [ppp(500000000, KRW), 0.4], [ppp(1e9, KRW), 0.42], [Infinity, 0.45]],
    surtax: 0.1,
    // 2025 employee shares: National Pension 4.5% to ₩6.37M/month, health 3.545% + long-term care ≈0.46%, employment insurance 0.9%.
    contributions: [
      { name: 'National Pension', rate: 0.045, from: 0, to: ppp(76440000, KRW) },
      { name: 'National Health Insurance', rate: 0.04, from: 0, to: Infinity },
      { name: 'Employment Insurance', rate: 0.009, from: 0, to: Infinity },
    ],
    contribDeductible: 1,
    label: 'National Tax Service',
  },
  // NPS: about 41.5% of career-average earnings for 40 years of contributions (2025; 43% from 2026), 10 years minimum.
  pension: { kind: 'avgReplace', name: 'National Pension', replace: 0.415, years: 40, minYears: 10, cap: ppp(76440000, KRW), ages: [60, 70] },
  health: { name: 'National Health Insurance Service', short: 'NHIS', deductible: 0, coinsurance: 0.25, oopMax: 3500 },
  // Child allowance: ₩100,000 a month under 8 (counted here across childhood).
  childBenefit: { amount: ppp(600000, KRW), phaseOutFrom: Infinity, name: 'Child allowance' },
  terms: { 'Federal income tax': 'National income tax', 'Social Security': 'National Pension', '401(k)': 'retirement pension (IRP)', 'IRS': 'National Tax Service', 'Medicaid': 'NHIS', 'Medicare': 'NHIS', 'GI Bill': 'veterans education support' },
  names: {
    male: ['Min-jun', 'Seo-jun', 'Do-yun', 'Ha-jun', 'Ji-ho', 'Joon-ho', 'Hyun-woo', 'Ji-hoon', 'Sung-min', 'Tae-yang', 'Woo-jin', 'Jae-won', 'Dong-hyun', 'Sang-woo', 'Eun-ho', 'Yoon-seok'],
    female: ['Seo-yeon', 'Ji-woo', 'Ha-eun', 'Seo-ah', 'Min-seo', 'Ji-yoo', 'Su-ah', 'Yu-na', 'Ji-min', 'Hye-jin', 'Eun-ji', 'Soo-jin', 'Na-yeon', 'Da-eun', 'Ye-jin', 'Bo-ra'],
    last: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang'],
  },
  provinces: {
    'KR-11': { name: 'Seoul', incomeTax: [], propertyTax: 0.002, salesTax: 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 1.8, suspendYears: 1 }, minWage: ppp(10030, KRW), population: 'mega', disasters: { flood: 0.03, hurricane: 0.03 } },
    'KR-41': { name: 'Gyeonggi', incomeTax: [], propertyTax: 0.002, salesTax: 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 1.8, suspendYears: 1 }, minWage: ppp(10030, KRW), population: 'mega', disasters: { flood: 0.03, hurricane: 0.03 } },
    'KR-26': { name: 'Busan', incomeTax: [], propertyTax: 0.002, salesTax: 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 1.8, suspendYears: 1 }, minWage: ppp(10030, KRW), population: 'large', disasters: { hurricane: 0.06 } },
    'KR-47': { name: 'North Gyeongsang', incomeTax: [], propertyTax: 0.002, salesTax: 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 1.8, suspendYears: 1 }, minWage: ppp(10030, KRW), population: 'large', disasters: { earthquake: 0.02, hurricane: 0.04 } },
    'KR-50': { name: 'Jeju', incomeTax: [], propertyTax: 0.002, salesTax: 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 1.8, suspendYears: 1 }, minWage: ppp(10030, KRW), population: 'small', disasters: { hurricane: 0.1 } },
  },
  cities: {
    seoul: { name: 'Seoul', icon: '🏙️', type: 'High-cost metro', state: 'KR-11', col: 1.15, market: 0.85, locality: 0.22, transit: 95, fare: ppp(62000, KRW), walkable: true, size: 'mega', population: [9400000, 9400000] },
    pyeongtaek: { name: 'Pyeongtaek, Gyeonggi', icon: '🪖', type: 'Mid-size city', state: 'KR-41', col: 0.85, market: 0.75, locality: 0.18, transit: 45, fare: ppp(55000, KRW), walkable: false, size: 'medium', population: [600000, 600000] },
    suwon: { name: 'Suwon, Gyeonggi', icon: '🏯', type: 'Major metro', state: 'KR-41', col: 0.95, market: 0.82, locality: 0.2, transit: 75, fare: ppp(55000, KRW), walkable: true, size: 'large', population: [1190000, 1190000] },
    busan: { name: 'Busan', icon: '🌊', type: 'Coastal metro', state: 'KR-26', col: 0.92, market: 0.74, locality: 0.2, transit: 75, fare: ppp(55000, KRW), walkable: true, size: 'enterprise', population: [3300000, 3300000] },
    pohang: { name: 'Pohang', icon: '🏭', type: 'Mid-size city', state: 'KR-47', col: 0.8, market: 0.76, locality: 0.18, transit: 35, fare: ppp(50000, KRW), walkable: false, size: 'medium', population: [500000, 500000] },
    jeju: { name: 'Jeju City', icon: '🍊', type: 'Small town', state: 'KR-50', col: 0.9, market: 0.66, locality: 0.17, transit: 25, fare: ppp(45000, KRW), walkable: false, size: 'small', population: [490000, 490000] },
  },
  hometowns: ['seoul', 'seoul', 'suwon', 'busan', 'pyeongtaek', 'pohang', 'jeju'],
  population: { 'KR-11': 9.4e6, 'KR-41': 13.6e6, 'KR-26': 3.3e6, 'KR-47': 2.6e6, 'KR-50': 0.67e6 },
};

/* ------------------------------------------------------------------ */
/* Italy                                                               */
/* ------------------------------------------------------------------ */

const EUR_IT = 0.64;
const itRegion = (name, surcharge, extra = {}) => ({ name, incomeTax: [[Infinity, surcharge]], propertyTax: 0.008, salesTax: 0.22, rightToWork: false, cannabis: false, dui: { fineMult: 1.3, suspendYears: 1 }, minWage: ppp(9, EUR_IT), population: 'large', disasters: { earthquake: 0.02, flood: 0.03 }, ...extra });
export const IT = {
  id: 'IT',
  name: 'Italy',
  flag: '🇮🇹',
  demonym: 'Italian',
  capital: 'Rome',
  currency: { code: 'EUR', symbol: '€', perUsd: EUR_IT },
  languages: ['Italian'],
  retirementAge: 67,
  tax: {
    // IRPEF 2025: 23% to €28,000, 35% to €50,000, 43% above; the employee credit leaves about €8,500 untaxed.
    allowance: ppp(8500, EUR_IT),
    brackets: [[ppp(28000, EUR_IT), 0.23], [ppp(50000, EUR_IT), 0.35], [Infinity, 0.43]],
    // INPS employee share 9.19% (plus 1% over about €55,000), to the €120,607 ceiling.
    contributions: [
      { name: 'INPS', rate: 0.0919, from: 0, to: ppp(120607, EUR_IT) },
      { name: 'INPS', rate: 0.01, from: ppp(55448, EUR_IT), to: ppp(120607, EUR_IT) },
    ],
    contribDeductible: 1,
    label: 'Agenzia delle Entrate',
  },
  // Contribution-based (notional) pension: 33% of pay accrues, converted at 67 with a coefficient of about 5.6%.
  pension: { kind: 'notional', name: 'INPS pension', rate: 0.33, coefficient: 0.0561, cap: ppp(120607, EUR_IT), minYears: 20, ages: [64, 71] },
  health: { name: 'Servizio Sanitario Nazionale', short: 'SSN', deductible: 0, coinsurance: 0.05, oopMax: 800 },
  // Assegno unico: €57–€201 a month per child by household means (ISEE).
  childBenefit: { amount: ppp(1800, EUR_IT), phaseOutFrom: ppp(45000, EUR_IT), name: 'Assegno unico' },
  terms: { 'Federal income tax': 'IRPEF', 'State income tax': 'Regional and municipal surcharge', 'Social Security': 'INPS pension', '401(k)': 'fondo pensione', 'IRS': 'Agenzia delle Entrate', 'Medicaid': 'the SSN', 'Medicare': 'the SSN', 'GI Bill': 'Forze Armate education support' },
  names: {
    male: ['Leonardo', 'Francesco', 'Alessandro', 'Lorenzo', 'Mattia', 'Andrea', 'Gabriele', 'Riccardo', 'Tommaso', 'Edoardo', 'Marco', 'Giuseppe', 'Antonio', 'Luca', 'Matteo', 'Davide'],
    female: ['Sofia', 'Giulia', 'Aurora', 'Alice', 'Ginevra', 'Emma', 'Giorgia', 'Greta', 'Beatrice', 'Anna', 'Chiara', 'Martina', 'Francesca', 'Sara', 'Elena', 'Valentina'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa'],
  },
  provinces: {
    // Regional IRPEF surcharge plus a typical 0.8% municipal surcharge (2025).
    'IT-62': itRegion('Lazio', 0.0413, { population: 'enterprise' }),
    'IT-25': itRegion('Lombardy', 0.0253, { population: 'mega', disasters: { flood: 0.03 } }),
    'IT-72': itRegion('Campania', 0.0363, { population: 'enterprise', disasters: { earthquake: 0.03, flood: 0.02 } }),
    'IT-34': itRegion('Veneto', 0.0203, { disasters: { flood: 0.05 } }),
    'IT-36': itRegion('Friuli-Venezia Giulia', 0.0150, { population: 'medium', disasters: { earthquake: 0.02 } }),
    'IT-82': itRegion('Sicily', 0.0253, { population: 'large', disasters: { earthquake: 0.03, wildfire: 0.04 } }),
  },
  cities: {
    rome: { name: 'Rome', icon: '🏛️', type: 'Capital region', state: 'IT-62', col: 1.12, market: 0.82, locality: 0.22, transit: 70, fare: ppp(35, EUR_IT), walkable: true, size: 'mega', population: [2750000, 4230000] },
    milan: { name: 'Milan', icon: '👗', type: 'High-cost metro', state: 'IT-25', col: 1.3, market: 0.95, locality: 0.25, transit: 85, fare: ppp(39, EUR_IT), walkable: true, size: 'enterprise', population: [1370000, 3220000] },
    naples: { name: 'Naples', icon: '🍕', type: 'Major metro', state: 'IT-72', col: 0.85, market: 0.66, locality: 0.18, transit: 55, fare: ppp(35, EUR_IT), walkable: true, size: 'enterprise', population: [910000, 2970000] },
    vicenza: { name: 'Vicenza', icon: '🎭', type: 'Mid-size city', state: 'IT-34', col: 0.95, market: 0.82, locality: 0.2, transit: 40, fare: ppp(35, EUR_IT), walkable: true, size: 'medium', population: [110000, 850000] },
    aviano: { name: 'Aviano, Pordenone', icon: '✈️', type: 'Rural', state: 'IT-36', col: 0.85, market: 0.78, locality: 0.17, transit: 15, fare: ppp(30, EUR_IT), walkable: false, size: 'small', population: [9000, 310000] },
    palermo: { name: 'Palermo', icon: '🍋', type: 'Coastal metro', state: 'IT-82', col: 0.8, market: 0.6, locality: 0.17, transit: 40, fare: ppp(30, EUR_IT), walkable: true, size: 'large', population: [630000, 1200000] },
  },
  hometowns: ['rome', 'milan', 'milan', 'naples', 'vicenza', 'palermo', 'aviano'],
  population: { 'IT-62': 5.7e6, 'IT-25': 10e6, 'IT-72': 5.6e6, 'IT-34': 4.8e6, 'IT-36': 1.2e6, 'IT-82': 4.8e6 },
};

/* ------------------------------------------------------------------ */
/* Mexico                                                              */
/* ------------------------------------------------------------------ */

const MXN = 10.5;
const mxState = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.001, salesTax: 0.16, rightToWork: false, cannabis: false, dui: { fineMult: 0.8, suspendYears: 1 }, minWage: ppp(34.85, MXN), population: 'large', disasters: {}, ...extra });
export const MX = {
  id: 'MX',
  name: 'Mexico',
  flag: '🇲🇽',
  demonym: 'Mexican',
  capital: 'Mexico City',
  currency: { code: 'MXN', symbol: 'MX$', perUsd: MXN },
  languages: ['Spanish'],
  retirementAge: 65,
  informality: 0.55,
  tax: {
    // ISR 2025 annual table: 1.92% to $8,952, 6.4% to $75,984, 10.88% to $133,536, 16% to $155,229, 17.92% to $185,852,
    // 21.36% to $374,837, 23.52% to $590,795, 30% to $1,127,926, 32% to $1,503,902, 34% to $4,511,707, 35% above.
    allowance: 0,
    brackets: [[ppp(8952, MXN), 0.0192], [ppp(75984, MXN), 0.064], [ppp(133536, MXN), 0.1088], [ppp(155229, MXN), 0.16], [ppp(185852, MXN), 0.1792], [ppp(374837, MXN), 0.2136], [ppp(590795, MXN), 0.2352], [ppp(1127926, MXN), 0.3], [ppp(1503902, MXN), 0.32], [ppp(4511707, MXN), 0.34], [Infinity, 0.35]],
    // IMSS employee share ≈2.8% (retirement, disability, health in kind and cash), to 25 UMA.
    contributions: [{ name: 'IMSS', rate: 0.028, from: 0, to: ppp(1036000, MXN) }],
    label: 'SAT',
  },
  // AFORE individual account (contributions rising toward 15% of pay by 2030; ≈10% average here) annuitized at 65,
  // plus the universal Pensión para el Bienestar (₱6,200 every two months in 2025).
  pension: { kind: 'account', name: 'AFORE + Pensión Bienestar', rate: 0.1, growth: 0.03, annuity: 18, flat: ppp(37200, MXN), cap: ppp(1036000, MXN), ages: [60, 70] },
  health: { name: 'IMSS / IMSS-Bienestar', short: 'IMSS', deductible: 0, coinsurance: 0.15, oopMax: 2500 },
  childBenefit: { amount: ppp(10000, MXN), phaseOutFrom: Infinity, name: 'Becas Benito Juárez' },
  terms: { 'Federal income tax': 'ISR', 'Social Security': 'pensión (AFORE)', '401(k)': 'AFORE', 'IRA': 'voluntary AFORE savings', 'IRS': 'SAT', 'Medicaid': 'IMSS-Bienestar', 'Medicare': 'IMSS', 'GI Bill': 'SEDENA education support' },
  names: {
    male: ['Santiago', 'Mateo', 'Sebastián', 'Leonardo', 'Diego', 'Emiliano', 'José Luis', 'Juan Carlos', 'Miguel Ángel', 'Alejandro', 'Fernando', 'Jorge', 'Ricardo', 'Luis', 'Carlos', 'Iker'],
    female: ['Sofía', 'Valentina', 'Regina', 'Camila', 'Ximena', 'María José', 'Guadalupe', 'Fernanda', 'Daniela', 'Andrea', 'Mariana', 'Lucía', 'Paola', 'Natalia', 'Renata', 'Itzel'],
    last: ['Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Gómez', 'Morales', 'Vázquez', 'Reyes', 'Jiménez'],
  },
  provinces: {
    'MX-CMX': mxState('Mexico City', { population: 'mega', disasters: { earthquake: 0.05, flood: 0.03 } }),
    'MX-JAL': mxState('Jalisco', { population: 'enterprise', disasters: { earthquake: 0.02, hurricane: 0.02 } }),
    'MX-NLE': mxState('Nuevo León', { population: 'enterprise', disasters: { flood: 0.03, hurricane: 0.02 } }),
    'MX-YUC': mxState('Yucatán', { population: 'medium', disasters: { hurricane: 0.1 } }),
    'MX-ROO': mxState('Quintana Roo', { population: 'medium', disasters: { hurricane: 0.12 } }),
    'MX-OAX': mxState('Oaxaca', { population: 'large', minWage: ppp(34.85, MXN), disasters: { earthquake: 0.05, hurricane: 0.04 } }),
  },
  cities: {
    cdmx: { name: 'Mexico City', icon: '🌮', type: 'Capital region', state: 'MX-CMX', col: 0.5, market: 0.32, locality: 0.2, transit: 75, fare: ppp(600, MXN), walkable: true, size: 'mega', population: [9200000, 21800000] },
    guadalajara: { name: 'Guadalajara', icon: '🎺', type: 'Major metro', state: 'MX-JAL', col: 0.45, market: 0.28, locality: 0.18, transit: 45, fare: ppp(500, MXN), walkable: true, size: 'enterprise', population: [1380000, 5300000] },
    monterrey: { name: 'Monterrey', icon: '⛰️', type: 'Major metro', state: 'MX-NLE', col: 0.5, market: 0.34, locality: 0.2, transit: 40, fare: ppp(500, MXN), walkable: false, size: 'enterprise', population: [1140000, 5300000] },
    merida: { name: 'Mérida', icon: '🏛️', type: 'Mid-size city', state: 'MX-YUC', col: 0.4, market: 0.25, locality: 0.17, transit: 25, fare: ppp(400, MXN), walkable: false, size: 'large', population: [995000, 1300000] },
    cancun: { name: 'Cancún', icon: '🏖️', type: 'Coastal metro', state: 'MX-ROO', col: 0.48, market: 0.27, locality: 0.17, transit: 25, fare: ppp(400, MXN), walkable: false, size: 'medium', population: [888000, 934000] },
    oaxaca: { name: 'Oaxaca de Juárez', icon: '🌽', type: 'Small town', state: 'MX-OAX', col: 0.32, market: 0.17, locality: 0.17, transit: 15, fare: ppp(300, MXN), walkable: true, size: 'small', population: [270000, 670000] },
  },
  hometowns: ['cdmx', 'cdmx', 'guadalajara', 'monterrey', 'merida', 'cancun', 'oaxaca'],
  population: { 'MX-CMX': 9.2e6, 'MX-JAL': 8.3e6, 'MX-NLE': 5.8e6, 'MX-YUC': 2.3e6, 'MX-ROO': 1.9e6, 'MX-OAX': 4.1e6 },
};

/* ------------------------------------------------------------------ */
/* The Philippines                                                     */
/* ------------------------------------------------------------------ */

const PHP = 19.5;
const phRegion = (name, minWage, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.01, salesTax: 0.12, rightToWork: false, cannabis: false, dui: { fineMult: 0.6, suspendYears: 1 }, minWage: ppp(minWage, PHP), population: 'large', disasters: { hurricane: 0.15, flood: 0.08, earthquake: 0.03 }, ...extra });
export const PH = {
  id: 'PH',
  name: 'Philippines',
  flag: '🇵🇭',
  demonym: 'Filipino',
  capital: 'Manila',
  currency: { code: 'PHP', symbol: '₱', perUsd: PHP },
  languages: ['Filipino', 'English'],
  retirementAge: 65,
  informality: 0.4,
  tax: {
    // TRAIN law, 2023 onward: 0% to ₱250,000, 15% to ₱400,000, 20% to ₱800,000, 25% to ₱2M, 30% to ₱8M, 35% above.
    allowance: 0,
    brackets: [[ppp(250000, PHP), 0], [ppp(400000, PHP), 0.15], [ppp(800000, PHP), 0.2], [ppp(2000000, PHP), 0.25], [ppp(8000000, PHP), 0.3], [Infinity, 0.35]],
    // 2025 employee shares: SSS 5% to a ₱35,000 monthly salary credit, PhilHealth 2.5% to ₱100,000/month, Pag-IBIG ₱200/month.
    contributions: [
      { name: 'SSS', rate: 0.05, from: 0, to: ppp(420000, PHP) },
      { name: 'PhilHealth', rate: 0.025, from: 0, to: ppp(1200000, PHP) },
      { name: 'Pag-IBIG', rate: 0.02, from: 0, to: ppp(120000, PHP) },
    ],
    contribDeductible: 1,
    label: 'Bureau of Internal Revenue',
  },
  // SSS: ₱300 + 20% of average monthly salary credit + 2% per year beyond 10 (or 40%, whichever is higher); 10 years minimum.
  pension: { kind: 'sss', name: 'SSS pension', base: ppp(3600, PHP), cap: ppp(420000, PHP), minYears: 10, ages: [60, 65] },
  health: { name: 'PhilHealth', short: 'PhilHealth', deductible: 0, coinsurance: 0.35, oopMax: 3500 },
  childBenefit: { amount: ppp(6000, PHP), phaseOutFrom: ppp(150000, PHP), name: '4Ps cash grant' },
  terms: { 'Federal income tax': 'Income tax', 'Social Security': 'SSS pension', '401(k)': 'PERA', 'IRS': 'BIR', 'Medicaid': 'PhilHealth', 'Medicare': 'PhilHealth', 'GI Bill': 'AFP education support' },
  names: {
    male: ['Jose', 'John Paul', 'Mark', 'Christian', 'Juan', 'Angelo', 'Jericho', 'Miguel', 'Carlo', 'Rafael', 'Joshua', 'Paolo', 'Ramon', 'Gabriel', 'Nathaniel', 'Emmanuel'],
    female: ['Maria', 'Angel', 'Princess', 'Mary Grace', 'Kristine', 'Andrea', 'Bea', 'Camille', 'Isabel', 'Joy', 'Patricia', 'Rose', 'Jasmine', 'Nicole', 'Althea', 'Luz'],
    last: ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andrada', 'Castillo', 'Flores', 'Villanueva', 'Ramos', 'Aquino', 'Dela Cruz'],
  },
  provinces: {
    'PH-NCR': phRegion('Metro Manila', 87, { population: 'mega' }),
    'PH-03': phRegion('Central Luzon', 68, { population: 'enterprise' }),
    'PH-07': phRegion('Central Visayas', 63, { population: 'large' }),
    'PH-11': phRegion('Davao Region', 59, { population: 'large', disasters: { earthquake: 0.05, flood: 0.06 } }),
  },
  cities: {
    manila: { name: 'Manila', icon: '🌆', type: 'Capital region', state: 'PH-NCR', col: 0.42, market: 0.24, locality: 0.2, transit: 55, fare: ppp(2000, PHP), walkable: true, size: 'mega', population: [1850000, 13500000] },
    angeles: { name: 'Angeles City (Clark)', icon: '✈️', type: 'Mid-size city', state: 'PH-03', col: 0.33, market: 0.18, locality: 0.17, transit: 25, fare: ppp(1500, PHP), walkable: false, size: 'medium', population: [460000, 460000] },
    cebu: { name: 'Cebu City', icon: '🏝️', type: 'Major metro', state: 'PH-07', col: 0.36, market: 0.2, locality: 0.18, transit: 35, fare: ppp(1500, PHP), walkable: true, size: 'large', population: [960000, 3000000] },
    davao: { name: 'Davao City', icon: '🥭', type: 'Major metro', state: 'PH-11', col: 0.32, market: 0.18, locality: 0.17, transit: 25, fare: ppp(1300, PHP), walkable: false, size: 'large', population: [1780000, 1780000] },
  },
  hometowns: ['manila', 'manila', 'cebu', 'davao', 'angeles'],
  population: { 'PH-NCR': 13.5e6, 'PH-03': 12.4e6, 'PH-07': 8.1e6, 'PH-11': 5.2e6 },
};

/* ------------------------------------------------------------------ */
/* India                                                               */
/* ------------------------------------------------------------------ */

const INR = 22;
const inState = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.002, salesTax: 0.12, rightToWork: false, cannabis: false, dui: { fineMult: 0.6, suspendYears: 1 }, minWage: ppp(80, INR), population: 'mega', disasters: { flood: 0.06 }, deathPenalty: 'rare', ...extra });
export const IN = {
  id: 'IN',
  name: 'India',
  flag: '🇮🇳',
  demonym: 'Indian',
  capital: 'New Delhi',
  currency: { code: 'INR', symbol: '₹', perUsd: INR },
  languages: ['Hindi', 'English'],
  retirementAge: 60,
  informality: 0.85,
  tax: {
    // New regime FY 2025–26: 0 to ₹4L, 5% to ₹8L, 10% to ₹12L, 15% to ₹16L, 20% to ₹20L, 25% to ₹24L, 30% above,
    // with a ₹75,000 standard deduction and the section 87A rebate: no tax up to ₹12L of taxable income. Plus 4% cess.
    allowance: ppp(75000, INR),
    brackets: [[ppp(400000, INR), 0], [ppp(800000, INR), 0.052], [ppp(1200000, INR), 0.104], [ppp(1600000, INR), 0.156], [ppp(2000000, INR), 0.208], [ppp(2400000, INR), 0.26], [Infinity, 0.312]],
    rebateUpTo: ppp(1200000, INR),
    // EPF: 12% employee contribution on wages up to ₹15,000 a month (most only on that ceiling).
    contributions: [{ name: 'EPF', rate: 0.12, from: 0, to: ppp(180000, INR) }],
    label: 'Income Tax Department',
  },
  // EPS: pensionable salary (capped at ₹15,000 a month) × years ÷ 70, from 58 (60 here) after 10 years.
  pension: { kind: 'eps', name: 'EPS pension', cap: ppp(180000, INR), divisor: 70, minYears: 10, ages: [58, 60] },
  health: { name: 'Ayushman Bharat / public hospitals', short: 'PM-JAY', deductible: 0, coinsurance: 0.45, oopMax: 6000 },
  childBenefit: null,
  terms: { 'Federal income tax': 'Income tax', 'Social Security': 'EPS pension', '401(k)': 'EPF', 'IRA': 'PPF', 'IRS': 'Income Tax Department', 'Medicaid': 'Ayushman Bharat', 'Medicare': 'Ayushman Bharat', 'GI Bill': 'ex-servicemen education support' },
  names: {
    male: ['Aarav', 'Vihaan', 'Arjun', 'Rohan', 'Aditya', 'Rahul', 'Amit', 'Vikram', 'Sai', 'Karthik', 'Rajesh', 'Suresh', 'Ishaan', 'Kabir', 'Mohammed', 'Harpreet'],
    female: ['Aadhya', 'Ananya', 'Diya', 'Priya', 'Saanvi', 'Pooja', 'Neha', 'Kavya', 'Lakshmi', 'Meera', 'Riya', 'Sunita', 'Fatima', 'Ishita', 'Anjali', 'Divya'],
    last: ['Sharma', 'Singh', 'Kumar', 'Patel', 'Gupta', 'Reddy', 'Iyer', 'Nair', 'Das', 'Khan', 'Mehta', 'Joshi', 'Rao', 'Banerjee', 'Verma', 'Pillai'],
  },
  provinces: {
    'IN-MH': inState('Maharashtra', { disasters: { flood: 0.07, hurricane: 0.03 } }),
    'IN-KA': inState('Karnataka', { population: 'mega', disasters: { flood: 0.04 } }),
    'IN-DL': inState('Delhi', { population: 'mega', minWage: ppp(89, INR), disasters: { earthquake: 0.02, flood: 0.03 } }),
    'IN-TN': inState('Tamil Nadu', { disasters: { hurricane: 0.06, flood: 0.06 } }),
    'IN-WB': inState('West Bengal', { disasters: { hurricane: 0.07, flood: 0.08 } }),
    'IN-UP': inState('Uttar Pradesh', { disasters: { flood: 0.08 } }),
  },
  cities: {
    mumbai: { name: 'Mumbai', icon: '🌊', type: 'High-cost metro', state: 'IN-MH', col: 0.42, market: 0.3, locality: 0.2, transit: 70, fare: ppp(1500, INR), walkable: true, size: 'mega', population: [12400000, 21300000] },
    bengaluru: { name: 'Bengaluru', icon: '💻', type: 'Major metro', state: 'IN-KA', col: 0.38, market: 0.33, locality: 0.2, transit: 45, fare: ppp(1500, INR), walkable: false, size: 'mega', population: [8400000, 13600000] },
    delhi: { name: 'New Delhi', icon: '🏛️', type: 'Capital region', state: 'IN-DL', col: 0.38, market: 0.28, locality: 0.2, transit: 65, fare: ppp(1200, INR), walkable: true, size: 'mega', population: [16800000, 32900000] },
    chennai: { name: 'Chennai', icon: '🛕', type: 'Major metro', state: 'IN-TN', col: 0.33, market: 0.24, locality: 0.18, transit: 45, fare: ppp(1000, INR), walkable: true, size: 'enterprise', population: [7100000, 11700000] },
    kolkata: { name: 'Kolkata', icon: '🚋', type: 'Major metro', state: 'IN-WB', col: 0.3, market: 0.2, locality: 0.18, transit: 60, fare: ppp(900, INR), walkable: true, size: 'enterprise', population: [4500000, 15100000] },
    varanasi: { name: 'Varanasi', icon: '🪔', type: 'Mid-size city', state: 'IN-UP', col: 0.22, market: 0.11, locality: 0.17, transit: 20, fare: ppp(600, INR), walkable: true, size: 'medium', population: [1200000, 1600000] },
  },
  hometowns: ['mumbai', 'bengaluru', 'delhi', 'delhi', 'chennai', 'kolkata', 'varanasi', 'varanasi'],
  population: { 'IN-MH': 126e6, 'IN-KA': 68e6, 'IN-DL': 21e6, 'IN-TN': 77e6, 'IN-WB': 100e6, 'IN-UP': 240e6 },
};
