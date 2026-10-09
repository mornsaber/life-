/**
 * Countries you can be born in. The United States is the default and is
 * described by States.js and Regions.js; every other country is data here.
 *
 * Money: all simulation math stays in US dollars at purchasing-power parity
 * (PPP). `currency.perUsd` converts for display only (OECD 2023 PPP
 * conversion factors). Wage and price levels live in each city's `market`
 * and `col`, relative to the US average, so the same job pays what it
 * really does there in PPP terms.
 *
 * Every rate and threshold below is converted from local currency to PPP
 * dollars (local ÷ perUsd) and cites its year.
 *
 *   provinces  the legal and fiscal layer (STATES entries): provincial/state income tax,
 *              property and sales/VAT rates, minimum wage, cannabis, DUI rules, disasters
 *   cities     REGIONS entries: col, market, transit, size
 *   tax        national income tax brackets ([upper, marginal rate]), the allowance taxed at 0%,
 *              and payroll social contributions ([rate, from, to] on wages)
 *   pension    the national pension formula (see pensionFor)
 *   health     the national coverage plan
 *   childBenefit cash paid per child under 18 (income-tested where noted)
 *   closed     what non-citizens of the US can't do here (US federal jobs, US forces, US offices)
 */

const ppp = (local, perUsd) => Math.round(local / perUsd);

/* ------------------------------------------------------------------ */
/* Canada                                                              */
/* ------------------------------------------------------------------ */

const CAD = 1.2; // OECD 2023 PPP, CAD per USD
const CA = {
  id: 'CA',
  name: 'Canada',
  flag: '🇨🇦',
  demonym: 'Canadian',
  capital: 'Ottawa',
  currency: { code: 'CAD', symbol: 'C$', perUsd: CAD },
  languages: ['English', 'French'],
  retirementAge: 65,
  tax: {
    // 2025 federal brackets: 15% to $57,375, 20.5% to $114,750, 26% to $177,882, 29% to $253,414, 33% above;
    // basic personal amount $16,129.
    allowance: ppp(16129, CAD),
    brackets: [[ppp(57375, CAD), 0.15], [ppp(114750, CAD), 0.205], [ppp(177882, CAD), 0.26], [ppp(253414, CAD), 0.29], [Infinity, 0.33]],
    // 2025 CPP 5.95% on $3,500–$71,300 (YMPE), CPP2 4% to $81,200; EI 1.64% to $65,700.
    contributions: [
      { name: 'CPP', rate: 0.0595, from: ppp(3500, CAD), to: ppp(71300, CAD) },
      { name: 'CPP2', rate: 0.04, from: ppp(71300, CAD), to: ppp(81200, CAD) },
      { name: 'EI', rate: 0.0164, from: 0, to: ppp(65700, CAD) },
    ],
    label: 'Canada Revenue Agency',
    // Base CPP and EI earn credits at the lowest rate; enhanced CPP is deductible: about half counts.
    contribDeductible: 0.5,
    // Provincial basic personal amount (Ontario 2025: $12,747).
    provincialAllowance: ppp(12747, CAD),
  },
  // CPP replaces 25% of average earnings up to the YMPE (2025 max about $16,375/yr at 65); OAS about $8,600/yr.
  pension: { kind: 'cpp', name: 'CPP + OAS', replace: 0.25, cap: ppp(71300, CAD), years: 39, flat: ppp(8600, CAD), ages: [60, 70] },
  health: { name: 'Provincial health insurance', short: 'Medicare (provincial)', deductible: 0, coinsurance: 0.05, oopMax: 900 },
  // Canada Child Benefit 2025: up to $7,787 under 6 / $6,570 6–17, reduced above about $37,000 family income.
  childBenefit: { amount: ppp(6000, CAD), phaseOutFrom: ppp(80000, CAD), name: 'Canada Child Benefit' },
  terms: { 'State income tax': 'Provincial income tax', 'Social Security': 'CPP/OAS', '401(k)': 'RRSP', 'IRS': 'CRA', 'Medicaid': 'provincial health care', 'Medicare': 'provincial health care', 'GI Bill': 'veterans education benefit' },
  names: {
    male: ['Liam', 'Noah', 'William', 'Lucas', 'Benjamin', 'Ethan', 'Jacob', 'Logan', 'Félix', 'Mathis', 'Arjun', 'Owen', 'Nathan', 'Samuel', 'Wei', 'Thomas'],
    female: ['Olivia', 'Emma', 'Charlotte', 'Amelia', 'Chloé', 'Léa', 'Sophia', 'Ava', 'Maya', 'Florence', 'Harper', 'Priya', 'Zoé', 'Isla', 'Mei', 'Abigail'],
    last: ['Smith', 'Tremblay', 'Martin', 'Roy', 'Wilson', 'MacDonald', 'Gagnon', 'Brown', 'Lee', 'Singh', 'Côté', 'Campbell', 'Bouchard', 'Wong', 'Anderson', 'Gill'],
  },
  provinces: {
    'CA-ON': { name: 'Ontario', incomeTax: [[ppp(52886, CAD), 0.0505], [ppp(105775, CAD), 0.0915], [ppp(150000, CAD), 0.1116], [ppp(220000, CAD), 0.1216], [Infinity, 0.1316]], propertyTax: 0.008, salesTax: 0.13, rightToWork: false, cannabis: true, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: ppp(17.6, CAD), population: 'enterprise', disasters: { blizzard: 0.05, flood: 0.02 } },
    'CA-QC': { name: 'Quebec', incomeTax: [[ppp(53255, CAD), 0.14], [ppp(106495, CAD), 0.19], [ppp(129590, CAD), 0.24], [Infinity, 0.2575]], propertyTax: 0.008, salesTax: 0.14975, rightToWork: false, cannabis: true, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: ppp(16.1, CAD), population: 'large', disasters: { blizzard: 0.07, flood: 0.03 } },
    'CA-BC': { name: 'British Columbia', incomeTax: [[ppp(49279, CAD), 0.0506], [ppp(98560, CAD), 0.077], [ppp(113158, CAD), 0.105], [ppp(137407, CAD), 0.1229], [ppp(186306, CAD), 0.147], [ppp(259829, CAD), 0.168], [Infinity, 0.205]], propertyTax: 0.003, salesTax: 0.12, rightToWork: false, cannabis: true, dui: { fineMult: 1.3, suspendYears: 1 }, minWage: ppp(17.85, CAD), population: 'large', disasters: { wildfire: 0.08, earthquake: 0.02, flood: 0.03 } },
    'CA-AB': { name: 'Alberta', incomeTax: [[ppp(60000, CAD), 0.08], [ppp(151234, CAD), 0.1], [ppp(181481, CAD), 0.12], [ppp(241974, CAD), 0.13], [ppp(362961, CAD), 0.14], [Infinity, 0.15]], propertyTax: 0.0065, salesTax: 0.05, rightToWork: false, cannabis: true, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: ppp(15, CAD), population: 'large', disasters: { wildfire: 0.07, blizzard: 0.06, flood: 0.03 } },
    'CA-NS': { name: 'Nova Scotia', incomeTax: [[ppp(30507, CAD), 0.0879], [ppp(61015, CAD), 0.1495], [ppp(95883, CAD), 0.1667], [ppp(154650, CAD), 0.175], [Infinity, 0.21]], propertyTax: 0.012, salesTax: 0.14, rightToWork: false, cannabis: true, dui: { fineMult: 1.1, suspendYears: 1 }, minWage: ppp(16.5, CAD), population: 'medium', disasters: { hurricane: 0.04, blizzard: 0.07 } },
    'CA-SK': { name: 'Saskatchewan', incomeTax: [[ppp(53463, CAD), 0.105], [ppp(152750, CAD), 0.125], [Infinity, 0.145]], propertyTax: 0.01, salesTax: 0.11, rightToWork: false, cannabis: true, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: ppp(15.35, CAD), population: 'medium', disasters: { blizzard: 0.09, tornado: 0.02, wildfire: 0.03 } },
  },
  cities: {
    toronto: { name: 'Toronto, ON', icon: '🏙️', type: 'Major metro', state: 'CA-ON', col: 1.35, market: 0.98, locality: 0.25, transit: 75, fare: ppp(156, CAD), walkable: true, size: 'enterprise', population: [2794000, 3025000] },
    ottawa: { name: 'Ottawa, ON', icon: '🍁', type: 'Capital region', state: 'CA-ON', col: 1.1, market: 0.95, locality: 0.25, transit: 50, fare: ppp(128, CAD), walkable: false, size: 'large', population: [1017000, 1017000] },
    montreal: { name: 'Montreal, QC', icon: '⚜️', type: 'Major metro', state: 'CA-QC', col: 0.98, market: 0.85, locality: 0.2, transit: 75, fare: ppp(97, CAD), walkable: true, size: 'enterprise', population: [1762000, 2004000] },
    vancouver: { name: 'Vancouver, BC', icon: '🌊', type: 'High-cost metro', state: 'CA-BC', col: 1.5, market: 0.96, locality: 0.25, transit: 65, fare: ppp(110, CAD), walkable: true, size: 'large', population: [662000, 2643000] },
    calgary: { name: 'Calgary, AB', icon: '🤠', type: 'Major metro', state: 'CA-AB', col: 1.08, market: 1.02, locality: 0.22, transit: 40, fare: ppp(115, CAD), walkable: false, size: 'large', population: [1306000, 1306000] },
    halifax: { name: 'Halifax, NS', icon: '⚓', type: 'Coastal metro', state: 'CA-NS', col: 0.98, market: 0.82, locality: 0.18, transit: 30, fare: ppp(82, CAD), walkable: false, size: 'medium', population: [440000, 440000] },
    moosejaw: { name: 'Moose Jaw, SK', icon: '🌾', type: 'Small town', state: 'CA-SK', col: 0.75, market: 0.82, locality: 0.17, transit: 5, fare: 0, walkable: false, size: 'small', population: [34000, 34000] },
  },
  hometowns: ['toronto', 'toronto', 'montreal', 'vancouver', 'calgary', 'ottawa', 'halifax', 'moosejaw'],
};

/* ------------------------------------------------------------------ */
/* United Kingdom                                                      */
/* ------------------------------------------------------------------ */

const GBP = 0.68; // OECD 2023 PPP, GBP per USD
// Bands on taxable income after the personal allowance: basic 20% on the first £37,700, higher 40% to £125,140, additional 45%.
const RUK_BANDS = [[ppp(37700, GBP), 0.2], [ppp(125140, GBP), 0.4], [Infinity, 0.45]];
const GB = {
  id: 'GB',
  name: 'United Kingdom',
  flag: '🇬🇧',
  demonym: 'British',
  capital: 'London',
  currency: { code: 'GBP', symbol: '£', perUsd: GBP },
  languages: ['English'],
  retirementAge: 66,
  tax: {
    // 2025/26 England, Wales and NI: personal allowance £12,570 (withdrawn £1 per £2 over £100,000),
    // basic 20% to £50,270, higher 40% to £125,140, additional 45%. Scotland sets its own bands (see GB-SCT).
    allowance: ppp(12570, GBP),
    brackets: RUK_BANDS,
    taperFrom: ppp(100000, GBP),
    // Class 1 National Insurance 2025/26: 8% on £12,570–£50,270, 2% above.
    contributions: [
      { name: 'National Insurance', rate: 0.08, from: ppp(12570, GBP), to: ppp(50270, GBP) },
      { name: 'National Insurance', rate: 0.02, from: ppp(50270, GBP), to: Infinity },
    ],
    label: 'HMRC',
  },
  // New State Pension 2025/26: £230.25 a week (£11,973/yr) with 35 qualifying years; 10 years minimum.
  pension: { kind: 'flat', name: 'State Pension', full: ppp(11973, GBP), years: 35, minYears: 10, ages: [66, 66] },
  health: { name: 'NHS', short: 'NHS', deductible: 0, coinsurance: 0.02, oopMax: 300 },
  // Child Benefit 2025/26: £26.05/week eldest, £17.25 others; clawed back from £60,000 income.
  childBenefit: { amount: ppp(1100, GBP), phaseOutFrom: ppp(60000, GBP), name: 'Child Benefit' },
  terms: { 'Federal income tax': 'Income tax', 'State income tax': 'Scottish income tax', 'Social Security': 'State Pension', '401(k)': 'workplace pension', 'IRA': 'ISA', 'IRS': 'HMRC', 'Medicaid': 'the NHS', 'Medicare': 'the NHS', 'GI Bill': 'Forces education support', 'high school': 'secondary school' },
  names: {
    male: ['Oliver', 'George', 'Harry', 'Jack', 'Noah', 'Muhammad', 'Leo', 'Arthur', 'Oscar', 'Charlie', 'Freddie', 'Alfie', 'Callum', 'Rhys', 'Finn', 'Kwame'],
    female: ['Olivia', 'Amelia', 'Isla', 'Ava', 'Lily', 'Freya', 'Grace', 'Sophie', 'Poppy', 'Ella', 'Aisha', 'Mia', 'Evie', 'Niamh', 'Eilidh', 'Ffion'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Davies', 'Evans', 'Thomas', 'Johnson', 'Roberts', 'Walker', 'Khan', 'Patel', 'Campbell', 'Murphy'],
  },
  provinces: {
    'GB-ENG': { name: 'England', incomeTax: [], propertyTax: 0.006, salesTax: 0.2, rightToWork: false, cannabis: false, dui: { fineMult: 1.3, suspendYears: 1 }, minWage: ppp(12.21, GBP), population: 'mega', disasters: { flood: 0.04 } },
    'GB-SCT': { name: 'Scotland', ownIncomeTax: true,
      // 2025/26 Scottish bands on non-savings income: starter 19% from £12,571, basic 20% from £15,398,
      // intermediate 21% from £27,492, higher 42% from £43,663, advanced 45% from £75,001, top 48% over £125,140.
      incomeTax: [[ppp(12570, GBP), 0], [ppp(15397, GBP), 0.19], [ppp(27491, GBP), 0.2], [ppp(43662, GBP), 0.21], [ppp(75000, GBP), 0.42], [ppp(125140, GBP), 0.45], [Infinity, 0.48]],
      propertyTax: 0.006, salesTax: 0.2, rightToWork: false, cannabis: false, dui: { fineMult: 1.3, suspendYears: 1 }, minWage: ppp(12.21, GBP), population: 'large', disasters: { flood: 0.04, blizzard: 0.03 } },
    'GB-WLS': { name: 'Wales', incomeTax: [], propertyTax: 0.007, salesTax: 0.2, rightToWork: false, cannabis: false, dui: { fineMult: 1.3, suspendYears: 1 }, minWage: ppp(12.21, GBP), population: 'medium', disasters: { flood: 0.05 } },
    'GB-NIR': { name: 'Northern Ireland', incomeTax: [], propertyTax: 0.006, salesTax: 0.2, rightToWork: false, cannabis: false, dui: { fineMult: 1.3, suspendYears: 1 }, minWage: ppp(12.21, GBP), population: 'medium', disasters: { flood: 0.03 } },
  },
  cities: {
    london: { name: 'London', icon: '🎡', type: 'High-cost metro', state: 'GB-ENG', col: 1.55, market: 1.12, locality: 0.3, transit: 95, fare: ppp(180, GBP), walkable: true, size: 'mega', population: [8866000, 9748000] },
    manchester: { name: 'Manchester', icon: '🐝', type: 'Major metro', state: 'GB-ENG', col: 1.0, market: 0.88, locality: 0.2, transit: 65, fare: ppp(80, GBP), walkable: true, size: 'large', population: [568000, 2867000] },
    birmingham: { name: 'Birmingham', icon: '🏭', type: 'Major metro', state: 'GB-ENG', col: 0.95, market: 0.86, locality: 0.2, transit: 55, fare: ppp(72, GBP), walkable: false, size: 'enterprise', population: [1145000, 2919000] },
    cornwall: { name: 'Truro, Cornwall', icon: '🌊', type: 'Small town', state: 'GB-ENG', col: 0.92, market: 0.76, locality: 0.17, transit: 10, fare: ppp(60, GBP), walkable: false, size: 'small', population: [21000, 575000] },
    edinburgh: { name: 'Edinburgh', icon: '🏰', type: 'Capital region', state: 'GB-SCT', col: 1.08, market: 0.92, locality: 0.2, transit: 60, fare: ppp(65, GBP), walkable: true, size: 'large', population: [514000, 514000] },
    glasgow: { name: 'Glasgow', icon: '🦄', type: 'Major metro', state: 'GB-SCT', col: 0.92, market: 0.85, locality: 0.18, transit: 55, fare: ppp(60, GBP), walkable: true, size: 'large', population: [632000, 1800000] },
    cardiff: { name: 'Cardiff', icon: '🐉', type: 'Capital region', state: 'GB-WLS', col: 0.9, market: 0.82, locality: 0.18, transit: 40, fare: ppp(65, GBP), walkable: true, size: 'medium', population: [372000, 372000] },
    belfast: { name: 'Belfast', icon: '🚢', type: 'Capital region', state: 'GB-NIR', col: 0.82, market: 0.78, locality: 0.17, transit: 35, fare: ppp(60, GBP), walkable: true, size: 'medium', population: [345000, 345000] },
  },
  hometowns: ['london', 'london', 'manchester', 'birmingham', 'edinburgh', 'glasgow', 'cardiff', 'belfast', 'cornwall'],
};

/* ------------------------------------------------------------------ */
/* Germany                                                             */
/* ------------------------------------------------------------------ */

const EUR = 0.72; // OECD 2023 PPP, EUR per USD (Germany)
const DE = {
  id: 'DE',
  name: 'Germany',
  flag: '🇩🇪',
  demonym: 'German',
  capital: 'Berlin',
  currency: { code: 'EUR', symbol: '€', perUsd: EUR },
  languages: ['German'],
  retirementAge: 67,
  tax: {
    // 2025 Grundtarif: basic allowance €12,096; marginal rate rises 14%→24% to €17,443, 24%→42% to €68,480,
    // 42% to €277,825, 45% above (linear zones approximated in steps). Länder levy no income tax of their own.
    allowance: 0,
    brackets: [[ppp(12096, EUR), 0], [ppp(17443, EUR), 0.19], [ppp(30000, EUR), 0.27], [ppp(45000, EUR), 0.32], [ppp(68480, EUR), 0.38], [ppp(277825, EUR), 0.42], [Infinity, 0.45]],
    // 2025 employee shares: pension 9.3% and unemployment 1.3% to €96,600; health ~8.55% and care 1.8% to €66,150.
    contributions: [
      { name: 'Rentenversicherung', rate: 0.093, from: 0, to: ppp(96600, EUR) },
      { name: 'Arbeitslosenversicherung', rate: 0.013, from: 0, to: ppp(96600, EUR) },
      { name: 'Krankenversicherung', rate: 0.0855, from: 0, to: ppp(66150, EUR) },
      { name: 'Pflegeversicherung', rate: 0.018, from: 0, to: ppp(66150, EUR) },
    ],
    label: 'Finanzamt',
    // Pension, health and care contributions are largely deductible (Vorsorgeaufwendungen), plus the €1,230 work allowance.
    contribDeductible: 0.8,
    workAllowance: ppp(1230, EUR),
  },
  // Points pension: one Entgeltpunkt per year at average earnings (€50,493 in 2025), worth €40.79/month (July 2025).
  pension: { kind: 'points', name: 'Gesetzliche Rente', average: ppp(50493, EUR), pointValue: ppp(40.79 * 12, EUR), cap: ppp(96600, EUR), ages: [63, 67] },
  health: { name: 'Gesetzliche Krankenversicherung', short: 'GKV', deductible: 0, coinsurance: 0.02, oopMax: 600 },
  // Kindergeld 2025: €255 a month per child, not income-tested.
  childBenefit: { amount: ppp(3060, EUR), phaseOutFrom: Infinity, name: 'Kindergeld' },
  terms: { 'Federal income tax': 'Income tax', 'Social Security': 'Gesetzliche Rente', '401(k)': 'Betriebsrente', 'IRA': 'Riester plan', 'IRS': 'Finanzamt', 'Medicaid': 'statutory health insurance', 'Medicare': 'statutory health insurance', 'GI Bill': 'Bundeswehr education support' },
  names: {
    male: ['Lukas', 'Leon', 'Finn', 'Jonas', 'Paul', 'Felix', 'Maximilian', 'Elias', 'Ben', 'Noah', 'Emil', 'Mehmet', 'Tobias', 'Moritz', 'Niklas', 'Jan'],
    female: ['Emma', 'Mia', 'Hannah', 'Sophia', 'Lena', 'Lea', 'Marie', 'Emilia', 'Clara', 'Anna', 'Lina', 'Elif', 'Johanna', 'Laura', 'Katharina', 'Greta'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Yılmaz', 'Wolf', 'Neumann', 'Braun'],
  },
  provinces: {
    'DE-BE': { name: 'Berlin', incomeTax: [], propertyTax: 0.0035, salesTax: 0.19, rightToWork: false, cannabis: true, dui: { fineMult: 1.4, suspendYears: 1 }, minWage: ppp(12.82, EUR), population: 'large', disasters: { flood: 0.01 } },
    'DE-BY': { name: 'Bavaria', incomeTax: [], propertyTax: 0.003, salesTax: 0.19, rightToWork: false, cannabis: true, dui: { fineMult: 1.4, suspendYears: 1 }, minWage: ppp(12.82, EUR), population: 'enterprise', disasters: { flood: 0.03, blizzard: 0.04 } },
    'DE-HE': { name: 'Hesse', incomeTax: [], propertyTax: 0.0035, salesTax: 0.19, rightToWork: false, cannabis: true, dui: { fineMult: 1.4, suspendYears: 1 }, minWage: ppp(12.82, EUR), population: 'large', disasters: { flood: 0.02 } },
    'DE-HH': { name: 'Hamburg', incomeTax: [], propertyTax: 0.0035, salesTax: 0.19, rightToWork: false, cannabis: true, dui: { fineMult: 1.4, suspendYears: 1 }, minWage: ppp(12.82, EUR), population: 'medium', disasters: { flood: 0.03 } },
    'DE-NW': { name: 'North Rhine-Westphalia', incomeTax: [], propertyTax: 0.004, salesTax: 0.19, rightToWork: false, cannabis: true, dui: { fineMult: 1.4, suspendYears: 1 }, minWage: ppp(12.82, EUR), population: 'mega', disasters: { flood: 0.04 } },
    'DE-RP': { name: 'Rhineland-Palatinate', incomeTax: [], propertyTax: 0.0035, salesTax: 0.19, rightToWork: false, cannabis: true, dui: { fineMult: 1.4, suspendYears: 1 }, minWage: ppp(12.82, EUR), population: 'medium', disasters: { flood: 0.03 } },
    'DE-BW': { name: 'Baden-Württemberg', incomeTax: [], propertyTax: 0.0035, salesTax: 0.19, rightToWork: false, cannabis: true, dui: { fineMult: 1.4, suspendYears: 1 }, minWage: ppp(12.82, EUR), population: 'enterprise', disasters: { flood: 0.02 } },
    'DE-SN': { name: 'Saxony', incomeTax: [], propertyTax: 0.003, salesTax: 0.19, rightToWork: false, cannabis: true, dui: { fineMult: 1.4, suspendYears: 1 }, minWage: ppp(12.82, EUR), population: 'large', disasters: { flood: 0.04 } },
  },
  cities: {
    berlin: { name: 'Berlin', icon: '🐻', type: 'Capital region', state: 'DE-BE', col: 1.05, market: 0.9, locality: 0.22, transit: 90, fare: ppp(58, EUR), walkable: true, size: 'enterprise', population: [3878000, 3878000] },
    munich: { name: 'Munich', icon: '🍺', type: 'High-cost metro', state: 'DE-BY', col: 1.35, market: 1.08, locality: 0.25, transit: 85, fare: ppp(58, EUR), walkable: true, size: 'large', population: [1510000, 1510000] },
    grafenwoehr: { name: 'Grafenwöhr, Bavaria', icon: '🌲', type: 'Rural', state: 'DE-BY', col: 0.82, market: 0.8, locality: 0.17, transit: 15, fare: ppp(58, EUR), walkable: false, size: 'small', population: [6600, 72000] },
    frankfurt: { name: 'Frankfurt', icon: '🏦', type: 'Major metro', state: 'DE-HE', col: 1.2, market: 1.06, locality: 0.25, transit: 85, fare: ppp(58, EUR), walkable: true, size: 'large', population: [773000, 773000] },
    hamburg: { name: 'Hamburg', icon: '⚓', type: 'Coastal metro', state: 'DE-HH', col: 1.15, market: 1.0, locality: 0.22, transit: 85, fare: ppp(58, EUR), walkable: true, size: 'large', population: [1892000, 1892000] },
    cologne: { name: 'Cologne', icon: '⛪', type: 'Major metro', state: 'DE-NW', col: 1.05, market: 0.95, locality: 0.2, transit: 80, fare: ppp(58, EUR), walkable: true, size: 'large', population: [1084000, 1084000] },
    kaiserslautern: { name: 'Kaiserslautern', icon: '✈️', type: 'Mid-size city', state: 'DE-RP', col: 0.88, market: 0.86, locality: 0.18, transit: 40, fare: ppp(58, EUR), walkable: false, size: 'medium', population: [101000, 101000] },
    stuttgart: { name: 'Stuttgart', icon: '🚗', type: 'Major metro', state: 'DE-BW', col: 1.2, market: 1.06, locality: 0.24, transit: 75, fare: ppp(58, EUR), walkable: true, size: 'large', population: [633000, 633000] },
    leipzig: { name: 'Leipzig', icon: '🎼', type: 'Mid-size city', state: 'DE-SN', col: 0.82, market: 0.78, locality: 0.18, transit: 70, fare: ppp(58, EUR), walkable: true, size: 'medium', population: [619000, 619000] },
  },
  hometowns: ['berlin', 'munich', 'hamburg', 'cologne', 'frankfurt', 'stuttgart', 'leipzig', 'kaiserslautern', 'grafenwoehr'],
};

/* ------------------------------------------------------------------ */
/* Japan                                                               */
/* ------------------------------------------------------------------ */

const JPY = 96; // OECD 2023 PPP, JPY per USD
const JP = {
  id: 'JP',
  name: 'Japan',
  flag: '🇯🇵',
  demonym: 'Japanese',
  capital: 'Tokyo',
  currency: { code: 'JPY', symbol: '¥', perUsd: JPY },
  languages: ['Japanese'],
  retirementAge: 65,
  tax: {
    // National income tax 2025: 5% to ¥1.95M, 10% to ¥3.3M, 20% to ¥6.95M, 23% to ¥9M, 33% to ¥18M,
    // 40% to ¥40M, 45% above, ×1.021 reconstruction surtax. Basic and employment-income deductions
    // average about ¥1.5M for a salaried worker.
    allowance: ppp(1500000, JPY),
    brackets: [[ppp(1950000, JPY), 0.051], [ppp(3300000, JPY), 0.102], [ppp(6950000, JPY), 0.204], [ppp(9000000, JPY), 0.235], [ppp(18000000, JPY), 0.337], [ppp(40000000, JPY), 0.408], [Infinity, 0.459]],
    // Employee shares 2025: welfare pension 9.15% to ¥7.8M a year, health ~5%, employment insurance 0.55%.
    contributions: [
      { name: 'Kōsei nenkin', rate: 0.0915, from: 0, to: ppp(7800000, JPY) },
      { name: 'Kenkō hoken', rate: 0.05, from: 0, to: ppp(16680000, JPY) },
      { name: 'Koyō hoken', rate: 0.0055, from: 0, to: Infinity },
    ],
    label: 'National Tax Agency',
    // Social insurance premiums are fully deductible (shakai hoken-ryō kōjo) from both income and resident tax.
    contribDeductible: 1,
    // Resident-tax deductions for a salaried worker (basic ¥430,000 + employment-income deduction) ≈ ¥1.43M.
    provincialAllowance: ppp(1430000, JPY),
  },
  // Basic pension 2025: ¥831,700/yr for 40 years of contributions; the employees' pension adds
  // average annual earnings × 0.5481% per year covered.
  pension: { kind: 'tiered', name: 'National + Employees\' Pension', basic: ppp(831700, JPY), years: 40, accrual: 0.005481, cap: ppp(7800000, JPY), ages: [60, 75] },
  health: { name: 'National Health Insurance', short: 'NHI', deductible: 0, coinsurance: 0.3, oopMax: 4000 },
  // Child allowance (jidō teate) from 2024: ¥10,000–15,000 a month, no income cap.
  childBenefit: { amount: ppp(144000, JPY), phaseOutFrom: Infinity, name: 'Child allowance' },
  terms: { 'Federal income tax': 'National income tax', 'State income tax': 'Resident tax', 'Social Security': 'national pension', '401(k)': 'iDeCo', 'IRA': 'NISA', 'IRS': 'National Tax Agency', 'Medicaid': 'national health insurance', 'Medicare': 'national health insurance', 'GI Bill': 'SDF education support' },
  names: {
    male: ['Haruto', 'Sota', 'Yuto', 'Riku', 'Ren', 'Hinata', 'Minato', 'Sora', 'Kaito', 'Takumi', 'Daiki', 'Kenji', 'Hiroshi', 'Yuki', 'Shota', 'Ryota'],
    female: ['Yui', 'Himari', 'Mei', 'Aoi', 'Sakura', 'Rin', 'Hina', 'Yuna', 'Mio', 'Akari', 'Emi', 'Haruka', 'Nanami', 'Miyu', 'Kaede', 'Saki'],
    last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue'],
  },
  provinces: {
    // Resident tax (jūminzei): 10% flat (6% municipal + 4% prefectural) on the same base.
    'JP-13': { name: 'Tokyo', incomeTax: [[Infinity, 0.1]], propertyTax: 0.014, salesTax: 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 2, suspendYears: 2 }, minWage: ppp(1226, JPY), population: 'mega', disasters: { earthquake: 0.05, hurricane: 0.04, flood: 0.02 } },
    'JP-14': { name: 'Kanagawa', incomeTax: [[Infinity, 0.1]], propertyTax: 0.014, salesTax: 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 2, suspendYears: 2 }, minWage: ppp(1225, JPY), population: 'enterprise', disasters: { earthquake: 0.05, hurricane: 0.04 } },
    'JP-27': { name: 'Osaka', incomeTax: [[Infinity, 0.1]], propertyTax: 0.014, salesTax: 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 2, suspendYears: 2 }, minWage: ppp(1177, JPY), population: 'enterprise', disasters: { earthquake: 0.03, hurricane: 0.05 } },
    'JP-40': { name: 'Fukuoka', incomeTax: [[Infinity, 0.1]], propertyTax: 0.014, salesTax: 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 2, suspendYears: 2 }, minWage: ppp(1057, JPY), population: 'large', disasters: { hurricane: 0.06, flood: 0.04 } },
    'JP-01': { name: 'Hokkaido', incomeTax: [[Infinity, 0.1]], propertyTax: 0.014, salesTax: 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 2, suspendYears: 2 }, minWage: ppp(1075, JPY), population: 'large', disasters: { blizzard: 0.08, earthquake: 0.03 } },
    'JP-47': { name: 'Okinawa', incomeTax: [[Infinity, 0.1]], propertyTax: 0.014, salesTax: 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 2, suspendYears: 2 }, minWage: ppp(1023, JPY), population: 'medium', disasters: { hurricane: 0.12 } },
  },
  cities: {
    tokyo: { name: 'Tokyo', icon: '🗼', type: 'High-cost metro', state: 'JP-13', col: 1.15, market: 0.85, locality: 0.22, transit: 98, fare: ppp(10000, JPY), walkable: true, size: 'mega', population: [14180000, 14180000] },
    yokosuka: { name: 'Yokosuka, Kanagawa', icon: '⚓', type: 'Coastal metro', state: 'JP-14', col: 1.0, market: 0.78, locality: 0.2, transit: 80, fare: ppp(9000, JPY), walkable: true, size: 'medium', population: [383000, 383000] },
    osaka: { name: 'Osaka', icon: '🏯', type: 'Major metro', state: 'JP-27', col: 1.0, market: 0.8, locality: 0.2, transit: 92, fare: ppp(9000, JPY), walkable: true, size: 'enterprise', population: [2750000, 2750000] },
    fukuoka: { name: 'Fukuoka', icon: '🍜', type: 'Major metro', state: 'JP-40', col: 0.88, market: 0.74, locality: 0.18, transit: 75, fare: ppp(8000, JPY), walkable: true, size: 'large', population: [1640000, 1640000] },
    sapporo: { name: 'Sapporo, Hokkaido', icon: '❄️', type: 'Major metro', state: 'JP-01', col: 0.85, market: 0.72, locality: 0.18, transit: 70, fare: ppp(8000, JPY), walkable: true, size: 'large', population: [1960000, 1960000] },
    okinawa: { name: 'Okinawa City', icon: '🌺', type: 'Coastal metro', state: 'JP-47', col: 0.82, market: 0.66, locality: 0.17, transit: 20, fare: ppp(6000, JPY), walkable: false, size: 'medium', population: [142000, 142000] },
  },
  hometowns: ['tokyo', 'tokyo', 'osaka', 'fukuoka', 'sapporo', 'yokosuka', 'okinawa'],
};

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const US = {
  id: 'US',
  name: 'United States',
  flag: '🇺🇸',
  demonym: 'American',
  capital: 'Washington, D.C.',
  currency: { code: 'USD', symbol: '$', perUsd: 1 },
  languages: ['English'],
  retirementAge: 67,
};

/** Playable countries, in picker order. */
export const COUNTRIES = { US, CA, GB, DE, JP };

/** Countries already in the story (postings, embassies, spouses' homelands) that aren't playable yet. */
export const PLANNED = {
  KR: { name: 'South Korea', flag: '🇰🇷', phase: 2, why: 'conscription' },
  IT: { name: 'Italy', flag: '🇮🇹', phase: 2 },
  MX: { name: 'Mexico', flag: '🇲🇽', phase: 3, why: 'informal economy' },
  PH: { name: 'Philippines', flag: '🇵🇭', phase: 3 },
  IN: { name: 'India', flag: '🇮🇳', phase: 3 },
};

/** Why a US-only path is closed to a life abroad. */
export const US_ONLY = {
  federalJobs: 'U.S. federal jobs require U.S. citizenship',
  military: 'The U.S. armed forces enlist U.S. citizens and green-card holders',
  office: 'Abroad, only local office (council, mayor, school board) is open for now',
  service: 'A U.S. program, for U.S. residents',
};
/** Offices a life abroad can hold (local government works much the same everywhere). */
export const LOCAL_OFFICES = ['schoolBoard', 'cityCouncil', 'mayor', 'cityManager'];

export const countryOf = (state) => COUNTRIES[state?.character?.countryId ?? 'US'] ?? US;
export const isAbroad = (state) => (state?.character?.countryId ?? 'US') !== 'US';

/** Province populations (2023–24 estimates), for sizing provincial agencies. */
export const PROVINCE_POPULATION = {
  'CA-ON': 15.6e6, 'CA-QC': 9e6, 'CA-BC': 5.6e6, 'CA-AB': 4.8e6, 'CA-NS': 1.07e6, 'CA-SK': 1.2e6,
  'GB-ENG': 57e6, 'GB-SCT': 5.5e6, 'GB-WLS': 3.1e6, 'GB-NIR': 1.9e6,
  'DE-BE': 3.9e6, 'DE-BY': 13.4e6, 'DE-HE': 6.4e6, 'DE-HH': 1.9e6, 'DE-NW': 18.1e6, 'DE-RP': 4.2e6, 'DE-BW': 11.3e6, 'DE-SN': 4.1e6,
  'JP-13': 14.2e6, 'JP-14': 9.2e6, 'JP-27': 8.8e6, 'JP-40': 5.1e6, 'JP-01': 5.1e6, 'JP-47': 1.47e6,
};

/** Every foreign province and city, keyed by id, tagged with its country. */
export const FOREIGN_PROVINCES = Object.fromEntries(Object.values(COUNTRIES).flatMap((c) => Object.entries(c.provinces ?? {}).map(([id, p]) => [id, { ...p, country: c.id }])));
export const FOREIGN_CITIES = Object.fromEntries(Object.values(COUNTRIES).flatMap((c) => Object.entries(c.cities ?? {}).map(([id, r]) => [id, { id, ...r, country: c.id }])));

/** The country a region or province belongs to. */
export const countryOfRegion = (regionId) => FOREIGN_CITIES[regionId]?.country ?? 'US';

/* ------------------------------------------------------------------ */
/* Money and words, for display                                        */
/* ------------------------------------------------------------------ */

function formatLocal(usd, currency) {
  const v = usd * currency.perUsd;
  const digits = currency.code === 'JPY' ? -3 : 0;
  const rounded = digits < 0 && Math.abs(v) >= 10000 ? Math.round(v / 1000) * 1000 : Math.round(v);
  return `${currency.symbol}${rounded.toLocaleString('en-US')}`;
}

/** Convert "$12,345", "$1.2M", "$45K" in display text into the country's currency. */
export function localizeMoney(text, country) {
  if (!country || country.id === 'US') return text;
  const cur = country.currency;
  return text.replace(/(-?)\$(\d[\d,]*(?:\.\d+)?)([KMB])?\b/g, (m, sign, num, suffix) => {
    const n = Number(num.replace(/,/g, ''));
    if (!Number.isFinite(n)) return m;
    if (suffix) {
      const v = n * cur.perUsd;
      return `${sign}${cur.symbol}${v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1).replace(/\.0$/, '')}${suffix}`;
    }
    return sign + formatLocal(n, cur);
  });
}

/** Swap US institution names in display text for the country's own. */
export function localizeTerms(text, country) {
  if (!country?.terms) return text;
  let out = text;
  for (const [us, local] of Object.entries(country.terms)) out = out.split(us).join(local);
  return out;
}

/** Localize the text between tags of an HTML string (never attributes or button arguments). */
export function localizeHtml(html, country) {
  if (!country || country.id === 'US') return html;
  return html.replace(/>([^<]+)</g, (m, text) => `>${localizeTerms(localizeMoney(text, country), country)}<`);
}

/* ------------------------------------------------------------------ */
/* Systems                                                             */
/* ------------------------------------------------------------------ */

function bracketTax(brackets, amount) {
  let remaining = Math.max(0, amount);
  let lower = 0;
  let tax = 0;
  for (const [upper, rate] of brackets) {
    if (remaining <= 0) break;
    const span = Math.min(remaining, upper - lower);
    tax += span * rate;
    remaining -= span;
    lower = upper;
  }
  return Math.round(tax);
}

/**
 * National income tax on taxable income. Provinces that set their own bands in place of the
 * national ones (Scotland) return 0 here and tax through STATES.
 */
export function nationalIncomeTax(country, taxable, province = null) {
  const t = country.tax;
  if (province?.ownIncomeTax) return 0;
  // The UK withdraws the personal allowance £1 for every £2 over £100,000.
  const allowance = t.taperFrom ? Math.max(0, (t.allowance ?? 0) - Math.max(0, taxable - t.taperFrom) / 2) : t.allowance ?? 0;
  return bracketTax(t.brackets, Math.max(0, taxable - allowance));
}

/** Payroll social contributions on wages (CPP/EI, National Insurance, Sozialversicherung, shakai hoken). */
export function socialContributions(country, wages) {
  return Math.round((country.tax?.contributions ?? []).reduce((sum, c) => sum + Math.max(0, Math.min(wages, c.to) - c.from) * c.rate, 0));
}

/** Child benefit for this many children, tapered above the threshold. */
export function childBenefit(country, children, income) {
  const cb = country.childBenefit;
  if (!cb || !children) return 0;
  const full = cb.amount * children;
  if (income <= cb.phaseOutFrom) return Math.round(full);
  return Math.round(Math.max(0, full * (1 - (income - cb.phaseOutFrom) / cb.phaseOutFrom)));
}

/**
 * The national pension at the standard age, from a record of covered earnings by year
 * (the same `ssEarnings` list the US system keeps).
 */
export function nationalPension(country, earnings) {
  const p = country.pension;
  if (!p) return 0;
  const years = earnings.filter((e) => e > 0);
  if (p.kind === 'flat') {
    if (years.length < p.minYears) return 0;
    return Math.round(p.full * Math.min(1, years.length / p.years));
  }
  if (p.kind === 'cpp') {
    const best = [...years].map((e) => Math.min(e, p.cap)).sort((a, b) => b - a).slice(0, p.years);
    const avg = best.reduce((s, e) => s + e, 0) / p.years;
    return Math.round(avg * p.replace + p.flat);
  }
  if (p.kind === 'points') {
    const points = years.reduce((s, e) => s + Math.min(e, p.cap) / p.average, 0);
    return Math.round(points * p.pointValue);
  }
  if (p.kind === 'tiered') {
    const basic = p.basic * Math.min(1, years.length / p.years);
    const capped = years.map((e) => Math.min(e, p.cap));
    const avg = capped.reduce((s, e) => s + e, 0) / Math.max(1, capped.length);
    return Math.round(basic + avg * p.accrual * capped.length);
  }
  return 0;
}
