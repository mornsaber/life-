/**
 * Immigration law for every playable country (2025 rules, simplified).
 * Fees and money thresholds are in PPP dollars, like everything else.
 *
 *   visas        routes in: work, transfer (intra-company), student, family, investor, retiree
 *                  odds     chance an application is approved (the US H-1B is a lottery)
 *                  years    how long the visa lasts before renewal
 *                  degree   needs a bachelor's degree or a professional license
 *                  amount   investment (investor) or savings (retiree) you must show
 *                  minAge   retiree visas only
 *                  permanent the visa is (or leads straight to) permanent residence
 *                  postStudy years of work rights after you graduate (student)
 *   pr           permanent residence: { name, years } (null: no general route in)
 *   nat          naturalization: { years, married, needsPR, fee, fromArrival, prMin }
 *                  fromArrival  years count from arrival, with prMin years held as a permanent resident
 *   dualIn       may keep your old passport when you naturalize here
 *   dualOut      citizens keep this passport when they naturalize elsewhere
 *   birthright   born here = citizen (true), or { parentPR: true } (Germany: a parent with settled status)
 *   prLapse      years away before permanent residence is lost
 *   surcharge    yearly charge on temporary visas (the UK's Immigration Health Surcharge)
 *   intlTuition  { mult, floor }: what international students pay (floor per year, PPP)
 *   backlog      extra years before PR for some nationalities (US employment green cards)
 */
import { COUNTRIES } from './Countries.js';
import { investmentsValue } from '../../core/State.js';
import { fromPacks, joinGroup, mutual, joinPairs, PACKS } from './packs/index.js';

export const VISA_KINDS = {
  work: { icon: '💼', label: 'Work visa' },
  transfer: { icon: '🏢', label: 'Intra-company transfer' },
  student: { icon: '🎓', label: 'Student visa' },
  family: { icon: '💍', label: 'Spouse / family visa' },
  investor: { icon: '💰', label: 'Investor visa' },
  retiree: { icon: '🌴', label: 'Retiree visa' },
  nomad: { icon: '💻', label: 'Digital nomad visa' },
  workingHoliday: { icon: '🎒', label: 'Working holiday visa' },
};

/**
 * Working holidays (2025): a year or two of any work for young citizens of partner countries.
 *   partners  { [nationality]: max age }    years  length    once: never renewed
 */
const WHV = (name, years, partners) => ({ name, odds: 0.92, years, fee: 300, once: true, partners });
export const WORKING_HOLIDAY = {
  AU: WHV('Working Holiday visa (subclass 417/462)', 2, { GB: 35, CA: 35, FR: 35, IT: 35, DE: 30, JP: 30, KR: 30, US: 30, IN: 30 }),
  CA: WHV('International Experience Canada (Working Holiday)', 2, { AU: 35, GB: 35, FR: 35, IT: 35, DE: 35, JP: 30, KR: 30, MX: 29 }),
  GB: WHV('Youth Mobility Scheme visa', 2, { AU: 35, CA: 35, JP: 30, KR: 30, IN: 30 }),
  JP: WHV('Working Holiday visa', 1, { AU: 30, CA: 30, GB: 30, DE: 30, FR: 30, IT: 30, KR: 30, MX: 29 }),
  KR: WHV('Working Holiday visa (H-1)', 1, { AU: 30, CA: 30, GB: 30, DE: 30, FR: 30, IT: 30, JP: 30, MX: 30 }),
  DE: WHV('Working Holiday visa', 1, { AU: 30, CA: 35, JP: 30, KR: 30 }),
  FR: WHV('Visa vacances-travail', 1, { AU: 35, CA: 35, JP: 30, KR: 30, MX: 30 }),
  IT: WHV('Working holiday visa', 1, { AU: 30, CA: 35, JP: 30, KR: 30 }),
};
fromPacks(WORKING_HOLIDAY, 'WORKING_HOLIDAY');
// Working-holiday schemes are reciprocal: a pack's partners take its young people too.
for (const p of PACKS) {
  for (const [other, age] of Object.entries(WORKING_HOLIDAY[p.id]?.partners ?? {})) {
    const scheme = WORKING_HOLIDAY[other];
    if (scheme?.partners && scheme.partners[p.id] === undefined) scheme.partners[p.id] = age;
  }
}
/** Digital nomad visas (2025): remote workers earning from abroad. income: yearly minimum (PPP). */
const NOMAD = {
  IT: { name: 'Digital nomad visa', odds: 0.8, years: 1, income: 38000, fee: 120, nomad: true },
  KR: { name: 'Workation visa (F-1-D)', odds: 0.8, years: 1, income: 90000, fee: 90, nomad: true },
  JP: { name: 'Digital nomad visa (Designated Activities)', odds: 0.8, years: 1, income: 80000, fee: 60, nomad: true, once: true },
  MX: { name: 'Temporary resident visa (remote work)', odds: 0.85, years: 1, income: 50000, fee: 450, nomad: true },
  PH: { name: 'Digital nomad visa', odds: 0.85, years: 1, income: 24000, fee: 300, nomad: true },
  DE: { name: 'Freelance residence permit (Freiberufler)', odds: 0.6, years: 2, income: 40000, fee: 140, nomad: true },
};

export const IMMIGRATION = {
  US: {
    visas: {
      work: { name: 'H-1B specialty occupation', odds: 0.3, years: 3, degree: true, fee: 5000 },
      transfer: { name: 'L-1 intracompany transferee', odds: 0.85, years: 3, fee: 4000 },
      student: { name: 'F-1 student visa', odds: 0.8, years: 4, postStudy: 1, fee: 535 },
      family: { name: 'CR-1 spousal green card', odds: 0.9, permanent: true, fee: 2400 },
      investor: { name: 'EB-5 immigrant investor', odds: 0.85, amount: 800000, permanent: true, fee: 11000 },
    },
    pr: { name: 'Green card', years: 5, fee: 3000 },
    backlog: { IN: 12, PH: 2, MX: 3 },
    nat: { years: 5, married: 3, needsPR: true, fee: 760 },
    dualIn: true, dualOut: true, birthright: true, prLapse: 1,
    intlTuition: { outOfState: true },
  },
  CA: {
    visas: {
      work: { name: 'LMIA work permit', odds: 0.7, years: 2, degree: true, fee: 400 },
      transfer: { name: 'Intra-company transferee permit', odds: 0.9, years: 3, fee: 400 },
      student: { name: 'Study permit', odds: 0.6, years: 4, postStudy: 3, fee: 125 },
      family: { name: 'Spousal sponsorship', odds: 0.9, permanent: true, fee: 1000 },
    },
    pr: { name: 'Permanent residence (Express Entry)', years: 1, fee: 1270 },
    nat: { years: 3, needsPR: true, fee: 525 },
    dualIn: true, dualOut: true, birthright: true, prLapse: 3,
    intlTuition: { mult: 4 },
  },
  GB: {
    visas: {
      work: { name: 'Skilled Worker visa', odds: 0.8, years: 3, degree: true, fee: 2300 },
      transfer: { name: 'Global Business Mobility visa', odds: 0.9, years: 3, fee: 2300 },
      student: { name: 'Student visa', odds: 0.85, years: 3, postStudy: 2, fee: 730 },
      family: { name: 'Family visa (spouse)', odds: 0.85, years: 3, fee: 2900 },
    },
    pr: { name: 'Indefinite Leave to Remain', years: 5, fee: 4500 },
    nat: { years: 6, married: 3, needsPR: true, fromArrival: true, prMin: 1, fee: 2400 },
    dualIn: true, dualOut: true, birthright: false, prLapse: 2,
    surcharge: 1550,
    intlTuition: { mult: 1, floor: 33000 },
  },
  DE: {
    visas: {
      work: { name: 'EU Blue Card', odds: 0.85, years: 4, degree: true, fee: 140 },
      transfer: { name: 'ICT card', odds: 0.9, years: 3, fee: 140 },
      student: { name: 'Student residence permit', odds: 0.8, years: 4, postStudy: 2, fee: 110 },
      family: { name: 'Family reunification visa', odds: 0.85, years: 3, fee: 110 },
    },
    pr: { name: 'Niederlassungserlaubnis (settlement permit)', years: 4, fee: 155 },
    nat: { years: 5, married: 3, needsPR: true, fromArrival: true, prMin: 0, fee: 350 },
    dualIn: true, dualOut: true, birthright: { parentPR: true }, prLapse: 1,
    intlTuition: { mult: 1 },
  },
  JP: {
    visas: {
      work: { name: 'Engineer / Specialist in Humanities visa', odds: 0.75, years: 3, degree: true, fee: 60 },
      transfer: { name: 'Intra-company Transferee visa', odds: 0.9, years: 3, fee: 60 },
      student: { name: 'College Student visa', odds: 0.8, years: 4, postStudy: 1, fee: 60 },
      family: { name: 'Spouse of a Japanese National visa', odds: 0.85, years: 3, fee: 60 },
      investor: { name: 'Business Manager visa', odds: 0.6, amount: 310000, years: 3, fee: 60 },
    },
    pr: { name: 'Permanent residence (eijūken)', years: 10, fee: 85 },
    nat: { years: 5, married: 3, needsPR: false, fee: 0 },
    dualIn: false, dualOut: false, birthright: false, prLapse: 1,
    intlTuition: { mult: 1 },
  },
  KR: {
    visas: {
      work: { name: 'E-7 professional visa', odds: 0.65, years: 3, degree: true, fee: 90 },
      transfer: { name: 'D-7 intra-company transfer', odds: 0.85, years: 2, fee: 90 },
      student: { name: 'D-2 student visa', odds: 0.8, years: 4, postStudy: 1, fee: 90 },
      family: { name: 'F-6 marriage migrant visa', odds: 0.85, years: 3, fee: 90 },
      investor: { name: 'D-8 corporate investor visa', odds: 0.7, amount: 115000, years: 3, fee: 90 },
    },
    pr: { name: 'F-5 permanent residence', years: 5, fee: 230 },
    nat: { years: 5, married: 2, needsPR: true, fromArrival: true, prMin: 0, fee: 345 },
    dualIn: false, dualOut: false, birthright: false, prLapse: 2,
    intlTuition: { mult: 1 },
  },
  IT: {
    visas: {
      work: { name: 'Work visa (EU Blue Card / decreto flussi)', odds: 0.6, years: 2, degree: true, fee: 200 },
      transfer: { name: 'ICT permit', odds: 0.9, years: 3, fee: 200 },
      student: { name: 'Study visa', odds: 0.85, years: 4, postStudy: 1, fee: 200 },
      family: { name: 'Family reunification permit', odds: 0.85, years: 2, fee: 200 },
      investor: { name: 'Investor visa for Italy', odds: 0.8, amount: 420000, years: 2, fee: 200 },
      retiree: { name: 'Elective residence visa', odds: 0.75, amount: 300000, minAge: 50, years: 2, fee: 200 },
    },
    pr: { name: 'EU long-term residence permit', years: 5, fee: 330 },
    nat: { years: 10, married: 3, needsPR: false, fee: 420 },
    dualIn: true, dualOut: true, birthright: false, prLapse: 1,
    intlTuition: { mult: 1 },
  },
  MX: {
    visas: {
      work: { name: 'Temporary resident visa (work)', odds: 0.8, years: 4, fee: 450 },
      transfer: { name: 'Temporary resident visa (intra-company)', odds: 0.9, years: 4, fee: 450 },
      student: { name: 'Temporary resident student visa', odds: 0.85, years: 4, postStudy: 0, fee: 300 },
      family: { name: 'Family unity residence', odds: 0.9, years: 1, fee: 450 },
      retiree: { name: 'Residence by economic solvency', odds: 0.85, amount: 120000, permanent: true, minAge: 50, fee: 900 },
    },
    pr: { name: 'Permanent resident card', years: 4, fee: 900 },
    nat: { years: 5, married: 2, needsPR: true, fromArrival: true, prMin: 0, fee: 750 },
    dualIn: true, dualOut: true, birthright: true, prLapse: 2,
    intlTuition: { mult: 1 },
  },
  PH: {
    visas: {
      work: { name: '9(g) pre-arranged employment visa', odds: 0.7, years: 2, degree: true, fee: 500 },
      transfer: { name: '9(g) visa (intra-company)', odds: 0.85, years: 2, fee: 500 },
      student: { name: '9(f) student visa', odds: 0.85, years: 4, postStudy: 0, fee: 300 },
      family: { name: '13(a) marriage visa', odds: 0.85, permanent: true, fee: 600 },
      investor: { name: 'Special Investor\'s Resident Visa (SIRV)', odds: 0.85, amount: 220000, permanent: true, fee: 600 },
      retiree: { name: 'Special Resident Retiree\'s Visa (SRRV)', odds: 0.9, amount: 58000, minAge: 50, permanent: true, fee: 4500 },
    },
    pr: null,
    nat: { years: 10, married: 5, needsPR: false, fee: 1800 },
    dualIn: false, dualOut: true, birthright: false, prLapse: 1,
    intlTuition: { mult: 1.5 },
  },
  AU: {
    visas: {
      work: { name: 'Skills in Demand visa (subclass 482)', odds: 0.7, years: 4, degree: true, fee: 2200 },
      transfer: { name: 'Skills in Demand visa (intra-company)', odds: 0.9, years: 4, fee: 2200 },
      student: { name: 'Student visa (subclass 500)', odds: 0.75, years: 4, postStudy: 2, fee: 1380 },
      family: { name: 'Partner visa (subclass 820/801)', odds: 0.85, years: 2, fee: 6200 },
    },
    pr: { name: 'Permanent residency (subclass 186/189)', years: 3, fee: 3290 },
    nat: { years: 4, needsPR: true, fromArrival: true, prMin: 1, fee: 390 },
    dualIn: true, dualOut: true, birthright: { parentPR: true }, prLapse: 5,
    intlTuition: { mult: 3.5 },
  },
  FR: {
    visas: {
      work: { name: 'Passeport talent / titre de séjour salarié', odds: 0.7, years: 4, degree: true, fee: 320 },
      transfer: { name: 'Passeport talent (salarié en mission)', odds: 0.9, years: 3, fee: 320 },
      student: { name: 'VLS-TS étudiant', odds: 0.8, years: 4, postStudy: 1, fee: 140 },
      family: { name: 'Carte vie privée et familiale (spouse)', odds: 0.85, years: 1, fee: 320 },
      investor: { name: 'Passeport talent — investisseur', odds: 0.8, amount: 422000, years: 4, fee: 320 },
      retiree: { name: 'Visa long séjour visiteur', odds: 0.8, amount: 42000, minAge: 50, years: 1, fee: 140 },
    },
    pr: { name: 'Carte de résident (10 years)', years: 5, fee: 320 },
    nat: { years: 5, married: 4, needsPR: false, fee: 80 },
    dualIn: true, dualOut: true, birthright: false, prLapse: 3,
    intlTuition: { mult: 1, floor: 3900 },
  },
  IN: {
    visas: {
      work: { name: 'Employment visa', odds: 0.75, years: 2, degree: true, fee: 450 },
      transfer: { name: 'Employment visa (intra-company)', odds: 0.85, years: 2, fee: 450 },
      student: { name: 'Student visa', odds: 0.85, years: 4, postStudy: 0, fee: 300 },
      family: { name: 'Entry (X) visa for spouses', odds: 0.85, years: 5, fee: 300 },
    },
    pr: null,
    nat: { years: 12, married: 7, needsPR: false, fee: 400 },
    dualIn: false, dualOut: false, birthright: false, prLapse: 1,
    intlTuition: { mult: 4 },
  },
};
fromPacks(IMMIGRATION, 'IMMIGRATION');

/**
 * Asylum (2025 rules, simplified). You claim on arrival; a decision follows.
 *   odds          share of claims granted in ordinary times (rises sharply for people fleeing a war)
 *   humanitarian  a lesser stay-on-humanitarian-grounds status where refugee status is rarely granted
 *   decision      years to a first decision     workAfter  years before asylum seekers may work
 *   prYears       years from a grant to permanent residence (0: it comes with the grant; null: none)
 *   support       yearly cash support while the claim is pending (PPP)
 *   temporary     EU temporary protection for people fleeing a full-scale war: granted at once
 */
export const ASYLUM = {
  US: { name: 'Asylum application', odds: 0.45, decision: 2, workAfter: 1, prYears: 1, support: 0 },
  CA: { name: 'Refugee claim (IRB)', odds: 0.65, decision: 2, workAfter: 0, prYears: 0, support: 9000 },
  GB: { name: 'Asylum claim', odds: 0.6, decision: 1, workAfter: 1, prYears: 5, support: 3300 },
  DE: { name: 'Asylantrag (BAMF)', odds: 0.55, decision: 1, workAfter: 1, prYears: 3, support: 7000, temporary: 'Temporary protection (§24 AufenthG)' },
  FR: { name: 'Demande d\'asile (OFPRA)', odds: 0.4, decision: 1, workAfter: 1, prYears: 0, support: 5500, temporary: 'Protection temporaire' },
  IT: { name: 'Protezione internazionale', odds: 0.45, decision: 2, workAfter: 1, prYears: 5, support: 3000, temporary: 'Protezione temporanea' },
  JP: { name: 'Refugee status application', odds: 0.03, humanitarian: 0.35, decision: 3, workAfter: 1, prYears: 5, support: 2000 },
  KR: { name: 'Refugee status application', odds: 0.03, humanitarian: 0.3, decision: 2, workAfter: 1, prYears: 5, support: 1500 },
  MX: { name: 'Solicitud de refugio (COMAR)', odds: 0.6, decision: 1, workAfter: 0, prYears: 0, support: 0 },
  PH: { name: 'Refugee status determination', odds: 0.5, decision: 2, workAfter: 1, prYears: 1, support: 0 },
  IN: { name: 'UNHCR refugee registration', odds: 0.3, decision: 2, workAfter: 1, prYears: null, support: 0 },
  AU: { name: 'Protection visa (subclass 866)', odds: 0.4, decision: 2, workAfter: 0, prYears: 0, support: 0 },
};
fromPacks(ASYLUM, 'ASYLUM');
/** What a claim costs to make (travel, smugglers, papers), PPP. */
export const ASYLUM_COST = 2500;

// (Copied, so a pack that inherits its base's rules doesn't overwrite the base's scheme.)
for (const [cc, rule] of Object.entries(WORKING_HOLIDAY)) if (IMMIGRATION[cc]) IMMIGRATION[cc] = { ...IMMIGRATION[cc], visas: { ...IMMIGRATION[cc].visas, workingHoliday: rule } };
for (const [cc, rule] of Object.entries(NOMAD)) IMMIGRATION[cc].visas.nomad = rule;

/** Social-security agreements (totalization) in force, 2025. */
const AGREEMENTS = [
  ['US', 'CA'], ['US', 'GB'], ['US', 'DE'], ['US', 'JP'], ['US', 'KR'], ['US', 'IT'],
  ['CA', 'GB'], ['CA', 'DE'], ['CA', 'JP'], ['CA', 'KR'], ['CA', 'IT'], ['CA', 'MX'], ['CA', 'PH'], ['CA', 'IN'],
  ['DE', 'IT'], ['DE', 'JP'], ['DE', 'KR'], ['DE', 'IN'], ['GB', 'DE'], ['GB', 'IT'], ['GB', 'JP'], ['GB', 'KR'], ['GB', 'PH'],
  ['JP', 'KR'], ['JP', 'IT'], ['JP', 'IN'], ['JP', 'PH'], ['KR', 'IT'], ['KR', 'IN'], ['IT', 'PH'], ['MX', 'DE'], ['MX', 'IT'],
  ['US', 'AU'], ['US', 'FR'], ['CA', 'AU'], ['CA', 'FR'], ['DE', 'AU'], ['DE', 'FR'], ['JP', 'AU'], ['JP', 'FR'], ['KR', 'AU'], ['KR', 'FR'],
  ['IT', 'AU'], ['IT', 'FR'], ['IN', 'AU'], ['IN', 'FR'], ['GB', 'FR'], ['MX', 'FR'], ['PH', 'FR'],
];
joinPairs(AGREEMENTS, 'agreements');
export const totalizes = (a, b) => AGREEMENTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** The cost of an international move (flights, shipping, deposits, paperwork), PPP. */
export const EMIGRATION_COST = 9000;

/* ------------------------------------------------------------------ */
/* People and passports                                                */
/* ------------------------------------------------------------------ */

/** Older lives stored a nationality as a country name. */
const NAME_TO_CODE = { 'United States': 'US', Canada: 'CA', Mexico: 'MX', Germany: 'DE', India: 'IN', 'the Philippines': 'PH', 'South Korea': 'KR', Japan: 'JP', Italy: 'IT', 'United Kingdom': 'GB' };

/** A person's nationality as a playable country code, or null for one that isn't playable. */
export function nationalityCode(person) {
  const n = person?.nationality;
  if (!n) return null;
  return COUNTRIES[n] ? n : NAME_TO_CODE[n] ?? null;
}
/** A person's nationality for display. */
/** A person's nationality for display ("the Philippines", "the United Kingdom"). */
export const nationalityName = (person) => { const n = COUNTRIES[person?.nationality]?.name ?? person?.nationality ?? ''; return /^(Philippines|United States|United Kingdom|Netherlands)$/.test(n) ? `the ${n}` : n; };

/** Where you were born (the country you lived in before your first move abroad). */
export const birthCountryOf = (state) => state.migration?.birthCountry ?? state.character.countryId ?? 'US';

/** The record of your right to live in each country you aren't a citizen of. */
export const residencesOf = (state) => state.migration?.residences ?? {};
/** Your immigration status where you live now: null when you're a citizen here. */
export function residencyOf(state) {
  const here = state.character.countryId ?? 'US';
  if ((state.character.citizenships ?? [birthCountryOf(state)]).includes(here)) return null;
  return residencesOf(state)[here] ?? null;
}
/** On a temporary visa where you live (pays international tuition, can't vote, must keep its conditions). */
export const onTemporaryVisa = (state) => residencyOf(state)?.status === 'visa';
/** Visas whose years don't count toward settling or naturalizing. */
export const NON_QUALIFYING_VISAS = ['student', 'workingHoliday', 'nomad', 'asylum'];

/** What international students pay at a school here, given the citizen's price. */
export function internationalTuition(state, price, costFactor = 1) {
  if (!onTemporaryVisa(state)) return price;
  const rule = IMMIGRATION[state.character.countryId ?? 'US']?.intlTuition ?? {};
  return Math.round(Math.max(price * (rule.mult ?? 1), (rule.floor ?? 0) * costFactor));
}

/* ------------------------------------------------------------------ */
/* Languages                                                           */
/* ------------------------------------------------------------------ */

/** The languages you grew up speaking. */
export function nativeLanguages(countryId) {
  const langs = COUNTRIES[countryId]?.languages ?? ['English'];
  return [...new Set([langs[0], ...(langs.includes('English') ? ['English'] : [])])];
}
/** Progress (0–100) in each language you've studied; 100 is working fluency (about B1–B2). */
export const LANGUAGE_FLUENT = 100;
export function speaks(state, language) {
  if (nativeLanguages(birthCountryOf(state)).includes(language)) return true;
  return (state.migration?.languages?.[language] ?? 0) >= LANGUAGE_FLUENT;
}
/** Whether you get by in a country's languages. */
export const speaksLocal = (state, countryId) => (COUNTRIES[countryId]?.languages ?? ['English']).some((l) => speaks(state, l));
/** The language you'd learn to live in a country. */
export const localLanguage = (countryId) => COUNTRIES[countryId]?.languages?.[0] ?? 'English';

/* ------------------------------------------------------------------ */
/* Credential recognition                                              */
/* ------------------------------------------------------------------ */

/** The EU recognizes regulated professions across member states (Directive 2005/36/EC). */
const EU = joinGroup(['DE', 'IT', 'FR'], 'EU');
/** Common-law countries, where a lawyer can requalify by exam; civil-law countries want a local law degree. */
const COMMON_LAW = joinGroup(['US', 'CA', 'GB', 'IN', 'PH', 'AU'], 'COMMON_LAW');
/** Driving licences each country swaps without a test (designated-country lists, 2025). */
const LICENCE_EXCHANGE = {
  US: ['CA', 'DE', 'KR', 'JP', 'FR'], CA: ['US', 'GB', 'DE', 'JP', 'KR', 'AU', 'FR'], GB: ['CA', 'DE', 'IT', 'JP', 'KR', 'AU', 'FR'],
  DE: ['CA', 'GB', 'IT', 'JP', 'KR', 'US', 'AU', 'FR'], JP: ['CA', 'DE', 'GB', 'IT', 'KR', 'AU', 'FR'], KR: ['CA', 'DE', 'GB', 'IT', 'JP', 'US', 'AU', 'FR'],
  IT: ['DE', 'GB', 'JP', 'KR', 'FR'], MX: [], PH: [], IN: [],
  AU: ['US', 'CA', 'GB', 'DE', 'FR', 'IT', 'JP', 'KR'], FR: ['DE', 'IT', 'GB', 'CA', 'AU', 'JP', 'KR', 'US'],
};
fromPacks(LICENCE_EXCHANGE, 'LICENCE_EXCHANGE');
mutual(LICENCE_EXCHANGE, 'licenceExchange');
const DRIVING = ['learnerPermit', 'driverLicense', 'motorcycle', 'cdlA', 'cdlB', 'passengerEndorsement', 'schoolBusEndorsement', 'hazmatEndorsement'];
/** Regulated professions that need the local language and a full exam. */
const REGULATED = ['medicalLicense', 'barLicense', 'rn', 'np', 'pharmacistLicense', 'dentalLicense', 'teachingCert', 'psychLicense', 'lcsw', 'lpc', 'paLicense', 'ptLicense', 'otLicense', 'crnaLicense', 'vetLicense', 'architectLicense', 'pe', 'cpa', 'post', 'correctionsAcademy'];

/** Credentials that never transfer between countries. */
const NOT_PORTABLE = ['post', 'correctionsAcademy'];
/** Clinical licences that strict regulators make you largely redo (USMLE + residency, Japan/Korea's national exams in Japanese/Korean). */
const CLINICAL = ['medicalLicense', 'dentalLicense'];
const STRICT_CLINICAL = joinGroup(['US', 'JP', 'KR', 'CA', 'FR', 'DE'], 'STRICT_CLINICAL');
/** Systems that recognize each other's training with only an assessment (GMC/AHPRA/MCC competent authorities, etc.). */
const PEERS = {
  GB: ['AU', 'CA', 'US'], AU: ['GB', 'CA', 'US'], CA: ['GB', 'AU', 'US'], US: ['CA'],
};
fromPacks(PEERS, 'PEERS');
mutual(PEERS, 'peers');
/** High-income regulators that scrutinize qualifications from elsewhere. */
const RICH_SYSTEMS = joinGroup(['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'JP', 'KR'], 'RICH_SYSTEMS');

/**
 * Free movement: citizens of these areas live and work in each other's countries
 * without a visa (EU free movement, the UK–Ireland Common Travel Area, the
 * Trans-Tasman Travel Arrangement). Packs add pairs with `freeMovement`.
 */
const FREE_PAIRS = [['GB', 'IE', 'Common Travel Area'], ['AU', 'NZ', 'Trans-Tasman Travel Arrangement']];
for (const p of PACKS) for (const other of p.freeMovement ?? []) if (!(EU.includes(p.id) && EU.includes(other)) && !FREE_PAIRS.some(([a, b]) => (a === p.id && b === other) || (a === other && b === p.id))) FREE_PAIRS.push([p.id, other, 'free-movement agreement']);
/** EU member states (for the EU-wide rules: free movement, temporary protection). */
export const isEU = (cc) => EU.includes(cc);
/** The scheme letting a holder of these passports move to `to` freely (null: none). */
export function freeMovementTo(citizenships, to) {
  if (EU.includes(to) && citizenships.some((c) => c !== to && EU.includes(c))) return 'EU free movement';
  const pair = FREE_PAIRS.find(([a, b]) => (to === a && citizenships.includes(b)) || (to === b && citizenships.includes(a)));
  return pair?.[2] ?? null;
}

/** How a credential earned in `fromCountries` is recognized in `to`. */
export function recognitionRoute(credId, fromCountries, to) {
  if (DRIVING.includes(credId)) {
    return fromCountries.some((c) => LICENCE_EXCHANGE[to]?.includes(c) || (EU.includes(c) && EU.includes(to))) ? { method: 'exchange', exam: false, costMult: 0.3 } : { method: 'foreignExam', exam: true, difficulty: 0.25, costMult: 0.5 };
  }
  // Police and prison-officer training is national: you join the local academy.
  if (NOT_PORTABLE.includes(credId)) return { method: 'notRecognized', exam: false, costMult: 0, blocked: 'Not recognized abroad: train locally' };
  if (fromCountries.some((c) => EU.includes(c)) && EU.includes(to)) return { method: 'mutual', exam: false, costMult: 0.4, language: REGULATED.includes(credId) };
  if (credId === 'barLicense' && (!COMMON_LAW.includes(to) || !fromCountries.some((c) => COMMON_LAW.includes(c)))) return { method: 'requalify', exam: true, difficulty: 0.55, costMult: 4, language: true, stages: 2 };
  const peer = fromCountries.some((c) => PEERS[to]?.includes(c));
  // Doctors and dentists from outside a peer system re-sit the licensing exams and redo supervised training.
  if (CLINICAL.includes(credId) && STRICT_CLINICAL.includes(to) && !peer) return { method: 'retrain', exam: true, difficulty: 0.6, costMult: 5, language: true, stages: 2 };
  if (REGULATED.includes(credId)) {
    const unfamiliar = !peer && fromCountries.every((c) => !RICH_SYSTEMS.includes(c)) && RICH_SYSTEMS.includes(to);
    return { method: peer ? 'peerAssessment' : 'foreignExam', exam: true, difficulty: peer ? 0.25 : unfamiliar ? 0.5 : 0.4, costMult: peer ? 0.8 : unfamiliar ? 2.2 : 1.5, language: true };
  }
  return { method: 'foreignExam', exam: true, difficulty: 0.25, costMult: 0.6 };
}

/* ------------------------------------------------------------------ */
/* Visa eligibility (pure)                                             */
/* ------------------------------------------------------------------ */

const hasDegree = (state) => state.education.degrees.some((d) => ['bachelor', 'master', 'doctorate', 'professional'].includes(d.type));
const hasLicense = (state) => Object.entries(state.credentials.held).some(([id, h]) => h.status === 'active' && REGULATED.includes(id));
const liquid = (state) => state.finances.cash + investmentsValue(state);

/** Can you apply for this visa to move to `to`, and what are the odds? */
export function visaEligibility(state, to, kind) {
  const rule = IMMIGRATION[to]?.visas?.[kind];
  if (!rule) return { ok: false, reason: 'No such route' };
  const age = state.character.age;
  const job = state.career.job;
  const spouse = state.people?.list?.find((p) => p.alive && p.relation === 'spouse');
  if (age < 18) return { ok: false, reason: 'Adults only' };
  if (kind === 'work') {
    if (age > 60) return { ok: false, reason: 'Sponsors rarely hire past 60' };
    if (rule.degree && !hasDegree(state) && !hasLicense(state)) return { ok: false, reason: 'Needs a bachelor\'s degree or professional license' };
  }
  if (kind === 'transfer') {
    if (!job || job.remote || job.sector !== 'private' || !['large', 'enterprise'].includes(job.employer?.size)) return { ok: false, reason: 'Needs a job at a large private employer' };
    if ((job.yearsAtEmployer ?? 0) < 1) return { ok: false, reason: 'A year with your employer first' };
  }
  if (kind === 'student') {
    if (!state.education.degrees.some((d) => d.type === 'highschool')) return { ok: false, reason: 'Finish high school first' };
    if (liquid(state) < 20000) return { ok: false, reason: `Show ${'$'}20,000 for a year's fees and living costs` };
  }
  if (kind === 'workingHoliday') {
    const maxAge = Object.entries(rule.partners).filter(([c]) => (state.character.citizenships ?? [birthCountryOf(state)]).includes(c)).reduce((m, [, a]) => Math.max(m, a), 0);
    if (!maxAge) return { ok: false, reason: 'No working-holiday deal with your country' };
    if (age > maxAge) return { ok: false, reason: `Ages 18–${maxAge}` };
    if (state.migration?.whvUsed?.includes(to)) return { ok: false, reason: 'Once in a lifetime' };
    if (liquid(state) < 4000) return { ok: false, reason: `Show ${'$'}4,000 in savings` };
  }
  if (kind === 'nomad') {
    const remote = Boolean(job?.remote) || Boolean(state.business?.current);
    if (!remote) return { ok: false, reason: 'Needs a remote job or your own business' };
    if ((state.finances.lastYear?.gross ?? 0) < rule.income) return { ok: false, reason: `Needs ${'$'}${rule.income.toLocaleString()}/yr income` };
  }
  if (kind === 'family' && nationalityCode(spouse) !== to) return { ok: false, reason: `Needs ${/^[AEIOU]/.test(COUNTRIES[to].demonym) ? 'an' : 'a'} ${COUNTRIES[to].demonym} spouse` };
  if (rule.minAge && age < rule.minAge) return { ok: false, reason: `Age ${rule.minAge}+` };
  if (rule.amount && liquid(state) < rule.amount) return { ok: false, reason: `Needs ${'$'}${rule.amount.toLocaleString()} to invest or show` };
  let odds = rule.odds;
  if (kind === 'work' && !speaksLocal(state, to)) odds *= 0.7;
  if (state.legal.record.some((r) => r.severity === 'felony')) odds *= 0.2;
  return { ok: true, odds: Math.max(0.02, Math.min(0.97, odds)), fee: rule.fee ?? 0, rule };
}

/** Years until you can apply for permanent residence where you live (null: no route; 0: now). */
export function prYearsLeft(state) {
  const here = state.character.countryId ?? 'US';
  const res = residencyOf(state);
  const law = IMMIGRATION[here];
  if (res?.status === 'refugee') {
    const years = ASYLUM[here]?.prYears;
    return years == null ? null : Math.max(0, years - (state.character.age - (res.grantedAt ?? res.arrived)));
  }
  if (!res || res.status !== 'visa' || !law.pr) return null;
  if (['student', 'retiree', 'workingHoliday', 'nomad'].includes(res.visa)) return null;
  const backlog = here === 'US' && res.visa !== 'family' ? law.backlog?.[birthCountryOf(state)] ?? 0 : 0;
  return Math.max(0, law.pr.years + backlog - (state.character.age - res.arrived));
}

/** Years until you can apply to naturalize where you live (0: now). */
export function naturalizationYearsLeft(state) {
  const here = state.character.countryId ?? 'US';
  const res = residencyOf(state);
  if (!res) return null;
  const law = IMMIGRATION[here].nat;
  const spouse = state.people?.list?.find((p) => p.alive && p.relation === 'spouse');
  // `fast`: shorter waits for some nationalities (Spain: two years for Ibero-Americans and Filipinos).
  const fast = Math.min(...(state.character.citizenships ?? []).map((c) => law.fast?.[c] ?? Infinity));
  const years = Math.min(spouse && law.married && nationalityCode(spouse) === here ? law.married : law.years, fast);
  if (law.needsPR && res.permanentSince == null) return null;
  const age = state.character.age;
  // Only lawful, settled-track residence counts: not years as a student, on a working holiday,
  // as a digital nomad or waiting on an asylum claim; time spent abroad pushes the date back.
  const qualifying = res.qualifyingSince ?? res.arrived;
  if (qualifying == null) return null;
  if (law.fromArrival) return Math.max(0, years - (age - qualifying), (law.prMin ?? 0) - (age - res.permanentSince));
  const since = law.needsPR ? Math.max(res.permanentSince, qualifying) : qualifying;
  return Math.max(0, years - (age - since));
}

/**
 * The passports a child inherits: every parent's citizenship by descent, plus the
 * country of birth where birth there is enough (the Americas; Germany when a parent is settled).
 */
export function heirCitizenships(parentState, child) {
  const born = nationalityCode(child) ?? parentState.character.countryId ?? 'US';
  // Children born since births were tracked carry their own passports (registered or not).
  if (child.citizenships?.length) return { citizenships: [...child.citizenships], born };
  const out = new Set(parentState.character.citizenships ?? [birthCountryOf(parentState)]);
  const rule = IMMIGRATION[born]?.birthright;
  if (rule === true || (rule?.parentPR && residencesOf(parentState)[born]?.status === 'permanent')) out.add(born);
  const other = parentState.people?.list?.find((p) => p.id === child.otherParentId);
  const otherCode = nationalityCode(other);
  if (otherCode) out.add(otherCode);
  return { citizenships: [...out], born };
}
