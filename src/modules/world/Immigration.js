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
 *   nat          naturalization: { years, married, needsPR, fee }
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

export const VISA_KINDS = {
  work: { icon: '💼', label: 'Work visa' },
  transfer: { icon: '🏢', label: 'Intra-company transfer' },
  student: { icon: '🎓', label: 'Student visa' },
  family: { icon: '💍', label: 'Spouse / family visa' },
  investor: { icon: '💰', label: 'Investor visa' },
  retiree: { icon: '🌴', label: 'Retiree visa' },
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
    nat: { years: 6, married: 3, needsPR: true, fee: 2400 },
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
    nat: { years: 5, married: 3, needsPR: false, fee: 350 },
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
    nat: { years: 5, married: 2, needsPR: false, fee: 345 },
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
    nat: { years: 5, married: 2, needsPR: false, fee: 750 },
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

/** Social-security agreements (totalization) in force, 2025. */
const AGREEMENTS = [
  ['US', 'CA'], ['US', 'GB'], ['US', 'DE'], ['US', 'JP'], ['US', 'KR'], ['US', 'IT'],
  ['CA', 'GB'], ['CA', 'DE'], ['CA', 'JP'], ['CA', 'KR'], ['CA', 'IT'], ['CA', 'MX'], ['CA', 'PH'], ['CA', 'IN'],
  ['DE', 'IT'], ['DE', 'JP'], ['DE', 'KR'], ['DE', 'IN'], ['GB', 'DE'], ['GB', 'IT'], ['GB', 'JP'], ['GB', 'KR'], ['GB', 'PH'],
  ['JP', 'KR'], ['JP', 'IT'], ['JP', 'IN'], ['JP', 'PH'], ['KR', 'IT'], ['KR', 'IN'], ['IT', 'PH'], ['MX', 'DE'], ['MX', 'IT'],
];
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
export const nationalityName = (person) => COUNTRIES[person?.nationality]?.name ?? person?.nationality ?? '';

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
const EU = ['DE', 'IT'];
/** Common-law countries, where a lawyer can requalify by exam; civil-law countries want a local law degree. */
const COMMON_LAW = ['US', 'CA', 'GB', 'IN', 'PH'];
/** Driving licences each country swaps without a test (designated-country lists, 2025). */
const LICENCE_EXCHANGE = {
  US: ['CA', 'DE', 'KR', 'JP'], CA: ['US', 'GB', 'DE', 'JP', 'KR'], GB: ['CA', 'DE', 'IT', 'JP', 'KR'],
  DE: ['CA', 'GB', 'IT', 'JP', 'KR', 'US'], JP: ['CA', 'DE', 'GB', 'IT', 'KR'], KR: ['CA', 'DE', 'GB', 'IT', 'JP', 'US'],
  IT: ['DE', 'GB', 'JP', 'KR'], MX: [], PH: [], IN: [],
};
const DRIVING = ['learnerPermit', 'driverLicense', 'motorcycle', 'cdlA', 'cdlB', 'passengerEndorsement', 'schoolBusEndorsement', 'hazmatEndorsement'];
/** Regulated professions that need the local language and a full exam. */
const REGULATED = ['medicalLicense', 'barLicense', 'rn', 'np', 'pharmacistLicense', 'dentalLicense', 'teachingCert', 'psychLicense', 'lcsw', 'lpc', 'paLicense', 'ptLicense', 'otLicense', 'crnaLicense', 'vetLicense', 'architectLicense', 'pe', 'cpa', 'post', 'correctionsAcademy'];

/** How a credential earned in `fromCountries` is recognized in `to`. */
export function recognitionRoute(credId, fromCountries, to) {
  if (DRIVING.includes(credId)) {
    return fromCountries.some((c) => LICENCE_EXCHANGE[to]?.includes(c) || (EU.includes(c) && EU.includes(to))) ? { method: 'exchange', exam: false, costMult: 0.3 } : { method: 'foreignExam', exam: true, difficulty: 0.25, costMult: 0.5 };
  }
  if (fromCountries.some((c) => EU.includes(c)) && EU.includes(to)) return { method: 'mutual', exam: false, costMult: 0.4, language: REGULATED.includes(credId) };
  if (credId === 'barLicense' && (!COMMON_LAW.includes(to) || !fromCountries.some((c) => COMMON_LAW.includes(c)))) return { method: 'requalify', exam: true, difficulty: 0.55, costMult: 4, language: true };
  if (REGULATED.includes(credId)) return { method: 'foreignExam', exam: true, difficulty: 0.4, costMult: 1.5, language: true };
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
  if (kind === 'family' && nationalityCode(spouse) !== to) return { ok: false, reason: `Needs a ${COUNTRIES[to].demonym} spouse` };
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
  if (!res || res.status !== 'visa' || !law.pr) return null;
  if (['student', 'retiree'].includes(res.visa)) return null;
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
  const years = spouse && law.married && nationalityCode(spouse) === here ? law.married : law.years;
  const since = law.needsPR ? res.permanentSince ?? null : res.arrived;
  if (since == null) return null;
  return Math.max(0, years - (state.character.age - since));
}

/**
 * The passports a child inherits: every parent's citizenship by descent, plus the
 * country of birth where birth there is enough (the Americas; Germany when a parent is settled).
 */
export function heirCitizenships(parentState, child) {
  const out = new Set(parentState.character.citizenships ?? [birthCountryOf(parentState)]);
  const born = nationalityCode(child) ?? parentState.character.countryId ?? 'US';
  const rule = IMMIGRATION[born]?.birthright;
  if (rule === true || (rule?.parentPR && residencesOf(parentState)[born]?.status === 'permanent')) out.add(born);
  const other = parentState.people?.list?.find((p) => p.id === child.otherParentId);
  const otherCode = nationalityCode(other);
  if (otherCode) out.add(otherCode);
  return { citizenships: [...out], born };
}
