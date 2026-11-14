/**
 * The statute book of history: changes that happened on a date because a law was passed —
 * Prohibition, abolishing the gallows, decriminalising sex between men, same-sex marriage,
 * divorce, deposit insurance, the old-age pension, Right to Buy, fair housing, the dominions'
 * honours, debtors' prisons, transportation.
 *
 * Each is a national law (a 'flag' in Laws.js). Its value follows history's date in that country
 * until a legislature in this world passes a bill to change it; from then on the bill decides.
 * The legislators of the game don't bring these up on their own (the background world keeps
 * history's dates); you can, from a seat in a legislature or as head of government.
 *
 * statuteIn(state, id, cc)  the law in force in country cc this year (true/false)
 */
import { yearNow, eraYear, PRESENT } from '../world/Eras.js';

/* ---- History's dates ---- */
export const PROHIBITION = { US: [1920, 1933], FI: [1919, 1932], NO: [1916, 1927], IS: [1915, 1935], RU: [1914, 1925] };
export const ABOLISHED = { GB: 1965, IE: 1990, FR: 1981, DE: 1949, AT: 1950, IT: 1948, ES: 1978, PT: 1867, NL: 1870, BE: 1996, SE: 1921, NO: 1905, DK: 1933, FI: 1949, CH: 1942, CA: 1976, AU: 1985, NZ: 1961, IS: 1928, LU: 1979, GR: 1993, ZA: 1995, MX: 1929, BR: 1889, AR: 1984, CO: 1910, VE: 1863, UY: 1907, CR: 1877, EC: 1906 };
export const SUSPENDED = { IT: [[1889, 1926]], NZ: [[1941, 1950]], RU: [[1947, 1950]], US: [[1972, 1976]] };
export const DECRIMINALIZED = { GB: 1967, IE: 1993, US: 2003, CA: 1969, AU: 1990, NZ: 1986, DE: 1969, AT: 1971, CH: 1942, SE: 1944, DK: 1933, NO: 1972, FI: 1971, IS: 1940, ES: 1979, PT: 1982, IT: 1890, RU: 1993, UA: 1991, BY: 1994, PL: 1932, CZ: 1962, SK: 1962, HU: 1961, RO: 1996, BG: 1968, RS: 1994, HR: 1977, CN: 1997, IN: 2018, ZA: 1998, IL: 1988, CL: 1999, EC: 1997, CU: 1979, NI: 2008, SG: 2022, HK: 1991, TW: 1912 };
export const SAME_SEX_MARRIAGE = { NL: 2001, BE: 2003, ES: 2005, CA: 2005, ZA: 2006, NO: 2009, SE: 2009, PT: 2010, IS: 2010, AR: 2010, DK: 2012, BR: 2013, FR: 2013, UY: 2013, NZ: 2013, GB: 2014, LU: 2015, US: 2015, IE: 2015, CO: 2016, FI: 2017, MT: 2017, DE: 2017, AU: 2017, AT: 2019, TW: 2019, EC: 2019, CR: 2020, CL: 2022, CH: 2022, SI: 2022, MX: 2022, CU: 2022, AD: 2023, EE: 2024, GR: 2024, LI: 2025, TH: 2025 };
export const DIVORCE_FROM = { IE: 1996, IT: 1970, ES: 1981, PT: 1910, AR: 1987, BR: 1977, CL: 2004, MT: 2011, CO: 1976, GB: 1857, FR: 1884, PY: 1991 };
export const INSURED_FROM = { US: 1934, DE: 1966, GB: 1979, FR: 1980, IT: 1987, ES: 1977, NL: 1979, BE: 1974, JP: 1971, CA: 1967, IN: 1962, AU: 2008, NZ: 2024, AR: 1995, IS: 1985 };
export const PENSION_FROM = { DE: 1889, GB: 1909, NZ: 1898, AU: 1909, FR: 1910, US: 1937, CA: 1927, SE: 1913, DK: 1891, JP: 1942, IT: 1919, NL: 1919 };
export const DEBTORS_UNTIL = { GB: 1869, IE: 1872, US: 1833, FR: 1867, DE: 1868, BE: 1871, NL: 1896, CA: 1870, AU: 1880 };
/** How each dominion got its honours: [from, until, mode]. 'british' with titles, 'britishNoTitles', 'dual', 'national', 'none'. */
export const DOMINION_HONOURS = {
  CA: [[0, 1919, 'british'], [1919, 1933, 'none'], [1933, 1936, 'british'], [1936, 1943, 'none'], [1943, 1947, 'britishNoTitles'], [1947, 1967, 'none'], [1967, 9999, 'national']],
  AU: [[0, 1975, 'british'], [1975, 1992, 'dual'], [1992, 9999, 'national']],
  NZ: [[0, 1996, 'british'], [1996, 9999, 'national']],
  ZA: [[0, 1925, 'british'], [1925, 2002, 'none'], [2002, 9999, 'national']],
  IE: [[0, 1922, 'british'], [1922, 9999, 'national']],
  IN: [[0, 1947, 'british'], [1947, 1954, 'none'], [1954, 9999, 'national']],
};
export const dominionMode = (cc, y) => (DOMINION_HONOURS[cc] ?? []).find(([a, b]) => y >= a && y < b)?.[2] ?? null;

/**
 * The statutes. history(cc, y): the law as it stood in history. `where`: the countries it applies to.
 * lean: which bloc pushes it ('labor' the reformers, 'business' the conservatives), for votes.
 */
export const STATUTES = {
  prohibition: { name: 'Prohibition of alcohol', icon: '🚱', lean: 'business', from: 1850,
    history: (cc, y) => { const p = PROHIBITION[cc]; return Boolean(p) && y >= p[0] && y < p[1]; },
    effect: 'Bans making and selling alcohol: the bars shut, the bootleggers move in.' },
  deathPenalty: { name: 'Capital punishment', icon: '⚰️', lean: 'business', where: (cc) => cc !== 'US',
    history: (cc, y) => !(ABOLISHED[cc] && y >= ABOLISHED[cc]) && !(SUSPENDED[cc] ?? []).some(([a, b]) => y >= a && y < b),
    effect: 'Whether murder can be punished by death.' },
  sodomyLaw: { name: 'Criminal law against sex between men', icon: '🚫', lean: 'business',
    history: (cc, y) => DECRIMINALIZED[cc] != null && y < DECRIMINALIZED[cc],
    effect: 'Makes sex between men a crime.' },
  sameSexMarriage: { name: 'Same-sex marriage', icon: '💍', lean: 'labor', from: 1970,
    history: (cc, y) => y >= PRESENT || y >= (SAME_SEX_MARRIAGE[cc] ?? Infinity),
    effect: 'Two men or two women may marry.' },
  divorce: { name: 'Divorce', icon: '💔', lean: 'labor',
    history: (cc, y) => !(DIVORCE_FROM[cc] && y < DIVORCE_FROM[cc]),
    effect: 'Married couples may divorce through the courts.' },
  depositInsurance: { name: 'Deposit insurance', icon: '🏦', lean: 'labor', from: 1900,
    history: (cc, y) => y >= (INSURED_FROM[cc] ?? 1995),
    effect: 'The state guarantees savings in the bank: no more runs.' },
  statePension: { name: 'State old-age pension', icon: '👵', lean: 'labor', from: 1880,
    history: (cc, y) => y >= (PENSION_FROM[cc] ?? 1950),
    effect: 'A pension from the state in old age.' },
  rightToBuy: { name: 'Right to Buy', icon: '🔑', lean: 'business', from: 1950,
    history: (cc, y) => cc === 'GB' && y >= 1980,
    effect: 'Council and social tenants may buy their homes at a discount.' },
  fairHousing: { name: 'Fair housing (no redlining)', icon: '🏘️', lean: 'labor', where: (cc) => cc === 'US', from: 1934,
    history: (cc, y) => y >= 1968,
    effect: 'Bans race discrimination in lending and housing: no redlined districts.' },
  imperialHonours: { name: 'British honours for citizens', icon: '🎖️', lean: 'business', where: (cc) => cc in DOMINION_HONOURS,
    history: (cc, y) => ['british', 'britishNoTitles', 'dual'].includes(dominionMode(cc, y)),
    effect: 'Whether the government recommends its citizens for British honours, knighthoods and peerages.' },
  debtorsPrison: { name: 'Imprisonment for debt', icon: '⛓️', lean: 'business',
    history: (cc, y) => y < (DEBTORS_UNTIL[cc] ?? 0),
    effect: 'Unpaid debts can land you in prison until they are paid.' },
  transportation: { name: 'Transportation to the colonies', icon: '⛵', lean: 'business', where: (cc) => ['GB', 'IE'].includes(cc), to: 1900,
    history: (cc, y) => y < 1857,
    effect: 'Felons may be sentenced to transportation to Australia.' },
};

/** The book of national laws for a country in this life (enacted bills). */
const bookOf = (state, cc) => (cc === 'US' ? state.laws?.federal : state.laws?.nations?.[cc]);
/** Whether a bill in this world has set the statute (and to what): undefined when history still rules. */
export function statuteOverride(state, id, cc = state.character?.countryId ?? 'US') {
  const b = bookOf(state, cc);
  return b && id in b ? b[id] : undefined;
}
/** The statute in force in country cc this year: the bill passed in this world, or history's law. */
export function statuteIn(state, id, cc = state.character?.countryId ?? 'US', y = yearNow(state)) {
  const o = statuteOverride(state, id, cc);
  if (o !== undefined && o !== null) return Boolean(o);
  return Boolean(STATUTES[id]?.history(cc, y));
}

/** The statutes as laws in the law book (Laws.js): national flags, history's value by default. */
export function statuteLaws() {
  return Object.fromEntries(Object.entries(STATUTES).map(([id, s]) => [id, {
    name: s.name, icon: s.icon, kind: 'flag', levels: ['federal'], lean: s.lean, combine: 'federal', statute: true,
    where: s.where, from: s.from ?? 1800, to: s.to,
    base: { federal: (cc) => Boolean(s.history(cc ?? 'US', eraYear())) },
    effect: s.effect,
  }]));
}
