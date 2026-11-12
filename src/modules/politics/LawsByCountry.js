/**
 * Laws by country: what a law is called where you live, and whether it exists there yet.
 *
 *   Names      Britain's Corporation Tax and Council Tax, Germany's Mindestlohn, France's SMIC;
 *              elsewhere the plain name ("Corporate tax rate", not "Federal corporate tax rate").
 *   Dates      a minimum wage from its year (New Zealand 1894, Australia 1907, the US 1938, France
 *              1950, Britain 1999, Germany 2015) and never in the Nordic countries, Austria, Italy
 *              or Switzerland, where unions and employers set wages; income tax from its year;
 *              recreational cannabis only where and when it was legalised; private prisons only
 *              where they exist.
 *
 * The law's display name follows the country of the life being played (set on load and on a move).
 */
import { LAWS } from './Laws.js';
import { eraYear } from '../world/Eras.js';

let HERE = 'US';
export const lawCountry = () => HERE;

/** When a law first existed in a country (null: never). Countries not listed use the general dates. */
const FROM = {
  minWage: { US: 1912, NZ: 1894, AU: 1907, CA: 1918, MX: 1917, GB: 1999, IE: 2000, FR: 1950, DE: 2015, JP: 1959, KR: 1988, IN: 1948, BR: 1940, AR: 1964, ES: 1963, PT: 1974, NL: 1968, BE: 1975, LU: 1944, GR: 1953, IL: 1987, ZA: 2019, CN: 1993, RU: 1991, PL: 1956, TR: 1951, SE: null, NO: null, DK: null, FI: null, IS: null, AT: null, IT: null, CH: null, '*': 1950 },
  incomeTax: { US: 1913, GB: 1842, FR: 1914, DE: 1920, JP: 1887, CA: 1917, AU: 1915, NZ: 1891, IT: 1864, SE: 1903, NL: 1914, IN: 1860, ES: 1932, RU: 1916, IE: 1922, '*': 1920 },
  corporateRate: { US: 1909, GB: 1965, FR: 1948, DE: 1920, JP: 1899, CA: 1917, AU: 1915, NZ: 1916, IT: 1954, '*': 1920 },
  paidLeave: { US: 1990, DE: 1883, GB: 1911, FR: 1928, JP: 1922, SE: 1955, NZ: 1938, AU: 1970, CA: 1971, '*': 1950 },
  cannabis: { US: 2012, UY: 2013, CA: 2018, MT: 2021, LU: 2023, DE: 2024, TH: 2022, '*': null },
  privatePrisons: { US: 1983, GB: 1992, AU: 1990, NZ: 2000, ZA: 2001, '*': null },
  antitrust: { US: 1890, CA: 1889, GB: 1948, JP: 1947, DE: 1957, FR: 1953, AU: 1906, '*': 1958 },
  rentControl: { US: 1920, GB: 1915, FR: 1914, DE: 1917, '*': 1920 },
  zoning: { US: 1916, GB: 1947, DE: 1960, FR: 1943, '*': 1920 },
  workplaceSafety: { US: 1910, GB: 1833, DE: 1891, FR: 1893, '*': 1900 },
};
export function lawFrom(lawId, cc = HERE) {
  const t = FROM[lawId];
  if (!t) return undefined;
  return cc in t ? t[cc] : t['*'];
}
/** Whether a law exists in a country in the year being played. */
export function lawExistsHere(lawId, cc = HERE, y = eraYear()) {
  const from = lawFrom(lawId, cc);
  if (from === undefined) return true;
  return from !== null && y >= from;
}

/** What laws are called where they're made. */
const LOCAL = {
  GB: { minWage: 'National Minimum Wage', corporateRate: 'Corporation Tax', incomeTax: 'Income Tax', propertyTax: (y) => (y >= 1993 ? 'Council Tax' : y >= 1990 ? 'Community Charge (the poll tax)' : 'Local rates'), antitrust: 'Competition law', paidLeave: 'Statutory sick and parental pay', zoning: 'Planning rules', workplaceSafety: 'Health and safety law', infrastructure: 'Public investment', publicPay: 'Public-sector pay', rentControl: 'Rent controls' },
  IE: { corporateRate: 'Corporation Tax', propertyTax: 'Local Property Tax', minWage: 'National Minimum Wage' },
  AU: { minWage: (y) => (y >= 2009 ? 'National Minimum Wage (Fair Work)' : 'Basic wage (the Harvester judgment)'), propertyTax: 'Council rates', corporateRate: 'Company tax' },
  NZ: { propertyTax: 'Council rates', corporateRate: 'Company tax' },
  CA: { minWage: 'Provincial minimum wage', businessTax: 'Provincial corporate tax', stateIncomeTax: 'Provincial income tax', corporateRate: 'Federal corporate tax rate' },
  DE: { minWage: 'Mindestlohn (minimum wage)', corporateRate: 'Körperschaftsteuer (corporate tax)', incomeTax: 'Einkommensteuer (income tax)', propertyTax: 'Grundsteuer (property tax)', businessTax: 'Gewerbesteuer (trade tax)', paidLeave: 'Lohnfortzahlung and Elterngeld (sick and parental pay)' },
  FR: { minWage: (y) => (y >= 1970 ? 'SMIC (minimum wage)' : 'SMIG (minimum wage)'), corporateRate: 'Impôt sur les sociétés (corporate tax)', incomeTax: 'Impôt sur le revenu (income tax)', propertyTax: 'Taxe foncière (property tax)' },
  JP: { minWage: 'Prefectural minimum wage', corporateRate: 'Corporate tax', propertyTax: 'Fixed-asset tax' },
  IN: { minWage: 'Minimum Wages Act rates', corporateRate: 'Corporate tax', stateIncomeTax: 'State taxes' },
  '*': { corporateRate: 'Corporate tax rate', incomeTax: 'Income tax', propertyTax: 'Local property tax', businessTax: 'Regional business tax', stateIncomeTax: 'Regional income tax', minWage: 'Minimum wage' },
};
const EFFECT = {
  corporateRate: 'The tax on company profits.',
  cannabis: 'Legal to buy and grow under national law.',
};
export function localLawName(lawId, cc = HERE, y = eraYear()) {
  if (cc === 'US') return null;
  const n = LOCAL[cc]?.[lawId] ?? LOCAL['*'][lawId];
  return typeof n === 'function' ? n(y) : n ?? null;
}

// Every law's name and effect read the country of the life being played.
for (const [id, law] of Object.entries(LAWS)) {
  const baseName = law.name;
  const baseEffect = law.effect;
  Object.defineProperty(law, 'baseName', { value: baseName, enumerable: false });
  Object.defineProperty(law, 'name', { get: () => localLawName(id) ?? baseName, enumerable: true, configurable: true });
  Object.defineProperty(law, 'effect', { get: () => (HERE !== 'US' && EFFECT[id]) || baseEffect, enumerable: true, configurable: true });
}

export const LawsByCountryModule = {
  id: 'lawsHere',
  order: 0.95,
  setup(engine) {
    engine.bus.on('migration:moved', ({ to }) => { HERE = to ?? 'US'; });
  },
  init(state) { HERE = state.character?.countryId ?? 'US'; },
};
