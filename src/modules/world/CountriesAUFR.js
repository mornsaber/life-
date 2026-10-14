/**
 * Australia and France: the same shape as the entries in Countries.js (see
 * its header). Amounts are converted from local currency to US dollars at
 * purchasing-power parity (OECD 2023 PPP factors) and cite their year.
 */

const ppp = (local, perUsd) => Math.round(local / perUsd);

/* ------------------------------------------------------------------ */
/* Australia                                                           */
/* ------------------------------------------------------------------ */

const AUD = 1.45;
const auState = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.0035, salesTax: 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: ppp(24.95, AUD), population: 'large', disasters: { wildfire: 0.05, flood: 0.03 }, ...extra });
export const AU = {
  id: 'AU',
  name: 'Australia',
  flag: '🇦🇺',
  demonym: 'Australian',
  capital: 'Canberra',
  currency: { code: 'AUD', symbol: 'A$', perUsd: AUD },
  languages: ['English'],
  retirementAge: 67,
  tax: {
    // 2025–26 resident rates: tax-free to A$18,200; 16% to A$45,000; 30% to A$135,000; 37% to A$190,000; 45% above
    // (bands below are on income after the tax-free threshold).
    allowance: ppp(18200, AUD),
    brackets: [[ppp(26800, AUD), 0.16], [ppp(116800, AUD), 0.3], [ppp(171800, AUD), 0.37], [Infinity, 0.45]],
    // The 2% Medicare levy on all taxable income (low earners are exempt below about A$27,200). Super is paid by the employer on top of wages.
    contributions: [{ name: 'Medicare levy', rate: 0.02, from: 0, to: Infinity }],
    label: 'Australian Taxation Office',
  },
  // Age Pension 2025: about A$29,900 a year for a single full pensioner, after 10 years' residence (means-tested).
  pension: { kind: 'flat', name: 'Age Pension', full: ppp(29874, AUD), years: 10, minYears: 10, ages: [67, 67] },
  // Superannuation Guarantee: employers pay 12% of wages into your super fund (2025).
  employerSuper: 0.12,
  health: { name: 'Medicare', short: 'Medicare', deductible: 0, coinsurance: 0.1, oopMax: 1500 },
  // Family Tax Benefit Part A: up to about A$6,800 a child a year, tapered from about A$65,000 family income.
  childBenefit: { amount: ppp(6000, AUD), phaseOutFrom: ppp(80000, AUD), name: 'Family Tax Benefit' },
  terms: { 'Federal government': 'Commonwealth government', 'Federal income tax': 'Income tax', 'State income tax': 'State tax', 'Social Security': 'Age Pension', '401(k)': 'super', IRA: 'super', IRS: 'ATO', Medicaid: 'Medicare', 'GI Bill': 'DVA education support', deductible: 'excess', Deductible: 'Excess' },
  names: {
    male: ['Oliver', 'Noah', 'Jack', 'William', 'Leo', 'Henry', 'Lucas', 'Thomas', 'Charlie', 'James', 'Liam', 'Ethan', 'Mason', 'Hudson', 'Lachlan', 'Cooper'],
    female: ['Charlotte', 'Olivia', 'Amelia', 'Isla', 'Mia', 'Ava', 'Grace', 'Willow', 'Harper', 'Chloe', 'Matilda', 'Ruby', 'Sienna', 'Zoe', 'Ella', 'Sophie'],
    last: ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Anderson', 'Thompson', 'Ryan', 'Kelly', 'Walker', 'Harris', 'Campbell'],
  },
  provinces: {
    'AU-NSW': auState('New South Wales', { population: 'mega', disasters: { wildfire: 0.06, flood: 0.05 } }),
    'AU-VIC': auState('Victoria', { population: 'mega', disasters: { wildfire: 0.06, flood: 0.03 } }),
    'AU-QLD': auState('Queensland', { population: 'enterprise', disasters: { hurricane: 0.05, flood: 0.06, wildfire: 0.03 } }),
    'AU-WA': auState('Western Australia', { disasters: { wildfire: 0.04, hurricane: 0.03 } }),
    'AU-SA': auState('South Australia', { population: 'medium', disasters: { wildfire: 0.05 } }),
    'AU-ACT': auState('Australian Capital Territory', { population: 'small', cannabis: true, disasters: { wildfire: 0.04 } }),
    'AU-NT': auState('Northern Territory', { population: 'small', disasters: { hurricane: 0.08, flood: 0.04 } }),
    'AU-TAS': auState('Tasmania', { population: 'small', disasters: { wildfire: 0.04, flood: 0.02 } }),
  },
  cities: {
    sydney: { name: 'Sydney', icon: '🌉', type: 'High-cost metro', state: 'AU-NSW', col: 1.35, market: 0.95, locality: 0.25, transit: 75, fare: ppp(200, AUD), walkable: true, size: 'mega', population: [5450000, 5450000] },
    melbourne: { name: 'Melbourne', icon: '🚋', type: 'Major metro', state: 'AU-VIC', col: 1.2, market: 0.9, locality: 0.23, transit: 75, fare: ppp(180, AUD), walkable: true, size: 'mega', population: [5200000, 5200000] },
    brisbane: { name: 'Brisbane', icon: '☀️', type: 'Major metro', state: 'AU-QLD', col: 1.1, market: 0.87, locality: 0.21, transit: 55, fare: ppp(150, AUD), walkable: false, size: 'enterprise', population: [2700000, 2700000] },
    perth: { name: 'Perth', icon: '⛏️', type: 'Major metro', state: 'AU-WA', col: 1.1, market: 0.92, locality: 0.21, transit: 50, fare: ppp(150, AUD), walkable: false, size: 'enterprise', population: [2300000, 2300000] },
    adelaide: { name: 'Adelaide', icon: '🍷', type: 'Mid-size city', state: 'AU-SA', col: 1.0, market: 0.84, locality: 0.2, transit: 45, fare: ppp(130, AUD), walkable: false, size: 'large', population: [1400000, 1400000] },
    canberra: { name: 'Canberra', icon: '🏛️', type: 'Capital region', state: 'AU-ACT', col: 1.1, market: 0.95, locality: 0.24, transit: 40, fare: ppp(120, AUD), walkable: false, size: 'medium', population: [470000, 470000] },
    darwin: { name: 'Darwin', icon: '🐊', type: 'Small town', state: 'AU-NT', col: 1.05, market: 0.9, locality: 0.2, transit: 20, fare: ppp(100, AUD), walkable: false, size: 'small', population: [150000, 150000] },
    townsville: { name: 'Townsville, Queensland', icon: '🪖', type: 'Mid-size city', state: 'AU-QLD', col: 0.95, market: 0.82, locality: 0.18, transit: 20, fare: ppp(100, AUD), walkable: false, size: 'medium', population: [200000, 200000] },
    hobart: { name: 'Hobart', icon: '⛰️', type: 'Mid-size city', state: 'AU-TAS', col: 0.95, market: 0.8, locality: 0.18, transit: 30, fare: ppp(100, AUD), walkable: true, size: 'medium', population: [250000, 250000] },
  },
  hometowns: ['sydney', 'sydney', 'melbourne', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra', 'hobart', 'townsville', 'darwin'],
  population: { 'AU-NSW': 8.5e6, 'AU-VIC': 7e6, 'AU-QLD': 5.6e6, 'AU-WA': 3e6, 'AU-SA': 1.9e6, 'AU-ACT': 0.47e6, 'AU-NT': 0.25e6, 'AU-TAS': 0.58e6 },
};

/* ------------------------------------------------------------------ */
/* France                                                              */
/* ------------------------------------------------------------------ */

const EUR_FR = 0.71;
const frRegion = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.007, salesTax: 0.2, rightToWork: false, cannabis: false, dui: { fineMult: 1.3, suspendYears: 1 }, minWage: ppp(11.88, EUR_FR), population: 'large', disasters: { flood: 0.03 }, ...extra });
export const FR = {
  id: 'FR',
  name: 'France',
  flag: '🇫🇷',
  demonym: 'French',
  capital: 'Paris',
  currency: { code: 'EUR', symbol: '€', perUsd: EUR_FR },
  languages: ['French'],
  retirementAge: 64,
  tax: {
    // Impôt sur le revenu 2025 (one part): 0% to €11,497; 11% to €29,315; 30% to €83,823; 41% to €180,294; 45% above
    // (bands below are on income after the 0% band).
    allowance: ppp(11497, EUR_FR),
    brackets: [[ppp(17818, EUR_FR), 0.11], [ppp(72326, EUR_FR), 0.3], [ppp(168797, EUR_FR), 0.41], [Infinity, 0.45]],
    // Employee shares 2025: old-age insurance 7.3% to the PASS (€47,100), Agirc-Arrco 4.01% / 9.72% above, CSG/CRDS 9.7%.
    contributions: [
      { name: 'Assurance vieillesse', rate: 0.073, from: 0, to: ppp(47100, EUR_FR) },
      { name: 'Agirc-Arrco', rate: 0.0401, from: 0, to: ppp(47100, EUR_FR) },
      { name: 'Agirc-Arrco', rate: 0.0972, from: ppp(47100, EUR_FR), to: ppp(376800, EUR_FR) },
      { name: 'CSG/CRDS', rate: 0.097, from: 0, to: Infinity },
    ],
    contribDeductible: 0.7,
    label: 'DGFiP',
  },
  // CNAV basic pension (50% of the best 25 years, capped at the PASS) plus Agirc-Arrco points: about 62% in all.
  pension: { kind: 'cpp', name: 'Retraite (CNAV + Agirc-Arrco)', years: 25, cap: ppp(47100, EUR_FR), replace: 0.62, flat: 0, ages: [62, 67] },
  health: { name: 'Assurance Maladie (with a mutuelle)', short: 'Assurance Maladie', deductible: 0, coinsurance: 0.03, oopMax: 600 },
  // Allocations familiales and the allocation de rentrée scolaire, averaged per child.
  childBenefit: { amount: ppp(1200, EUR_FR), phaseOutFrom: Infinity, name: 'Allocations familiales' },
  terms: { 'Federal government': 'National government', 'State government': 'Regional council', 'Federal income tax': 'Impôt sur le revenu', 'State income tax': 'Local taxes', 'Social Security': 'retraite (CNAV)', '401(k)': 'PER collectif', IRS: 'DGFiP', Medicaid: 'Assurance Maladie', Medicare: 'Assurance Maladie', 'GI Bill': 'veterans training support' },
  names: {
    male: ['Gabriel', 'Léo', 'Raphaël', 'Louis', 'Jules', 'Adam', 'Arthur', 'Lucas', 'Hugo', 'Maël', 'Paul', 'Nathan', 'Théo', 'Antoine', 'Julien', 'Mathis'],
    female: ['Jade', 'Louise', 'Ambre', 'Alba', 'Emma', 'Rose', 'Alice', 'Romy', 'Anna', 'Lina', 'Chloé', 'Léa', 'Manon', 'Camille', 'Juliette', 'Clara'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'Fournier'],
  },
  provinces: {
    'FR-IDF': frRegion('Île-de-France', { population: 'mega', propertyTax: 0.005 }),
    'FR-ARA': frRegion('Auvergne-Rhône-Alpes', { population: 'enterprise', disasters: { flood: 0.03, blizzard: 0.02 } }),
    'FR-PAC': frRegion('Provence-Alpes-Côte d\'Azur', { population: 'enterprise', disasters: { wildfire: 0.05, flood: 0.03, earthquake: 0.01 } }),
    'FR-OCC': frRegion('Occitanie', { disasters: { flood: 0.04, wildfire: 0.03 } }),
    'FR-NAQ': frRegion('Nouvelle-Aquitaine', { disasters: { wildfire: 0.03, flood: 0.03 } }),
    'FR-BRE': frRegion('Brittany', { population: 'medium', disasters: { hurricane: 0.03, flood: 0.02 } }),
    'FR-GES': frRegion('Grand Est', { disasters: { flood: 0.03 } }),
    'FR-HDF': frRegion('Hauts-de-France', { disasters: { flood: 0.03 } }),
  },
  cities: {
    paris: { name: 'Paris', icon: '🗼', type: 'High-cost metro', state: 'FR-IDF', col: 1.3, market: 0.9, locality: 0.25, transit: 95, fare: ppp(88.8, EUR_FR), walkable: true, size: 'mega', population: [2100000, 12300000] },
    lyon: { name: 'Lyon', icon: '🦁', type: 'Major metro', state: 'FR-ARA', col: 1.05, market: 0.82, locality: 0.21, transit: 80, fare: ppp(68, EUR_FR), walkable: true, size: 'enterprise', population: [520000, 2300000] },
    marseille: { name: 'Marseille', icon: '⛵', type: 'Coastal metro', state: 'FR-PAC', col: 0.98, market: 0.75, locality: 0.2, transit: 60, fare: ppp(55, EUR_FR), walkable: true, size: 'enterprise', population: [870000, 1900000] },
    toulon: { name: 'Toulon', icon: '⚓', type: 'Mid-size city', state: 'FR-PAC', col: 0.95, market: 0.75, locality: 0.19, transit: 40, fare: ppp(45, EUR_FR), walkable: true, size: 'medium', population: [180000, 580000] },
    toulouse: { name: 'Toulouse', icon: '✈️', type: 'Major metro', state: 'FR-OCC', col: 0.98, market: 0.8, locality: 0.2, transit: 60, fare: ppp(55, EUR_FR), walkable: true, size: 'large', population: [500000, 1400000] },
    bordeaux: { name: 'Bordeaux', icon: '🍷', type: 'Major metro', state: 'FR-NAQ', col: 1.0, market: 0.79, locality: 0.2, transit: 60, fare: ppp(50, EUR_FR), walkable: true, size: 'large', population: [260000, 1000000] },
    brest: { name: 'Brest', icon: '🌊', type: 'Mid-size city', state: 'FR-BRE', col: 0.88, market: 0.74, locality: 0.18, transit: 40, fare: ppp(45, EUR_FR), walkable: true, size: 'medium', population: [140000, 420000] },
    strasbourg: { name: 'Strasbourg', icon: '🇪🇺', type: 'Mid-size city', state: 'FR-GES', col: 0.95, market: 0.78, locality: 0.19, transit: 65, fare: ppp(52, EUR_FR), walkable: true, size: 'medium', population: [290000, 800000] },
    lille: { name: 'Lille', icon: '🧇', type: 'Major metro', state: 'FR-HDF', col: 0.92, market: 0.76, locality: 0.19, transit: 65, fare: ppp(65, EUR_FR), walkable: true, size: 'large', population: [240000, 1500000] },
  },
  hometowns: ['paris', 'paris', 'paris', 'lyon', 'marseille', 'toulouse', 'bordeaux', 'lille', 'strasbourg', 'brest', 'toulon'],
  population: { 'FR-IDF': 12.3e6, 'FR-ARA': 8.1e6, 'FR-PAC': 5.1e6, 'FR-OCC': 6e6, 'FR-NAQ': 6.1e6, 'FR-BRE': 3.4e6, 'FR-GES': 5.6e6, 'FR-HDF': 6e6 },
};
