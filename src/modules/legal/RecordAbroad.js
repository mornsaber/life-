/**
 * A criminal record belongs to the country that convicted you. Who else sees it depends on who
 * is asking and where:
 *
 *   At home        Everything (sealed, pardoned and spent convictions aside, as before).
 *   Employers and  Another country's record shows only where records are actually shared:
 *   licensing      across the EU (ECRIS), between the Five Eyes for serious convictions, and
 *   boards abroad  anywhere for the crimes that travel on Interpol notices — violence, sexual
 *                  offences, trafficking, the capital crimes.
 *   The border     A visa or citizenship application asks about convictions anywhere: you
 *                  declare them. Felonies always count; lesser ones fall away after ten years.
 *
 *   Never abroad   Tickets and civil matters; political "crimes" (anti-state activity, illegal
 *                  worship, attempted defection) and offences of their day (gross indecency,
 *                  bootlegging); another country's military justice; and conduct that isn't a
 *                  crime where you are now (drug possession where it's decriminalised).
 *
 * record[i].country — where you were convicted (stamped by addRecord in core/State.js).
 */
import { OFFENSES } from './Offenses.js';
import { drugLawOf } from '../crime/CrimeWorld.js';
import { RECORD_VIEW } from '../../core/State.js';
import { yearNow, PRESENT } from '../world/Eras.js';
import { gayCrimeIn, prohibitionIn } from './LawOfTheDay.js';

export const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
export const FIVE_EYES = ['US', 'GB', 'CA', 'AU', 'NZ'];
export { euMemberIn } from '../world/EuMembership.js';
import { euMemberIn } from '../world/EuMembership.js';
/**
 * When each kind of sharing began: Interpol (the ICPC, 1923) for crimes that travel; the
 * European Convention on Mutual Assistance (1959) between Community members, then ECRIS (2012);
 * the Five Country Conference's data sharing (2009); and visa forms that ask about convictions
 * (America's Immigration Act of 1917, Britain's Aliens Order of 1920 — before, a border barely asked).
 */
export const SHARING_FROM = { interpol: 1923, eu: 1959, ecris: 2012, fiveEyes: 2009, border: 1917 };
const yearOf = (state) => yearNow(state);
/** When a country's possession decriminalisation took effect (drugLawOf gives today's law). */
const POSSESSION_DECRIMINALISED = { PT: 2001, MX: 2009, CO: 2012 };
/** Offences of their day: crimes once, disregarded now and never held against you abroad. */
const OF_THEIR_DAY = new Set(['grossIndecency', 'bootlegging', 'serviceRefusal', 'draftEvasion']);
/** Whether an offence of its day is still a crime in a country that year (else it doesn't count there). */
function stillACrime(id, cc, y) {
  if (id === 'grossIndecency') return gayCrimeIn(cc, y);
  if (id === 'bootlegging') return prohibitionIn(cc, y);
  return false; // one country's draft is no other country's business
}
/** Crimes that travel: Interpol notices, sex-offender and terror lists. */
const travels = (o) => Boolean(o.violent || o.sexual || o.registry || o.capital || o.drug === 'trafficking');

/** Where a conviction was handed down (older saves: the country you were born in). */
export const recordCountry = (state, rec) => rec.country ?? state.migration?.birthCountry ?? state.character?.countryId ?? 'US';

/** Is this conduct a crime in that country at all (dual criminality)? */
function crimeIn(cc, rec, y = PRESENT) {
  if (rec.offenseId === 'drugPossession') {
    if (y < 1920) return false; // before the drug laws of 1914–20, possession was nobody's crime
    return drugLawOf(cc).possession === 'crime' || y < (POSSESSION_DECRIMINALISED[cc] ?? PRESENT);
  }
  return true;
}

/**
 * Whether a conviction is seen in a country, by whom ('job' — employers, licensing boards,
 * courts, offices; 'border' — a visa, residence or citizenship application).
 */
/** Whether conduct is a crime in a country in a year (drug possession is the case that varies). */
export const conductIsCrime = (cc, offenseId, y) => crimeIn(cc, { offenseId }, y);

export function seenIn(state, rec, cc, purpose = 'job') {
  return seenWhy(state, rec, cc, purpose).seen;
}

/** Why a conviction is or isn't seen where you are, in a few words (for the record view). */
export function seenWhy(state, rec, cc, purpose = 'job') {
  const from = recordCountry(state, rec);
  if (from === cc) return { seen: true, why: 'convicted here' };
  const y = yearOf(state);
  const o = OFFENSES[rec.offenseId] ?? {};
  if (['infraction', 'civil'].includes(rec.severity)) return { seen: false, why: 'a ticket or civil matter: it stays where it was' };
  if (o.political) return { seen: false, why: 'a political conviction: no free country counts it' };
  if (OF_THEIR_DAY.has(rec.offenseId) && !stillACrime(rec.offenseId, cc, y)) return { seen: false, why: y >= PRESENT ? 'an offence of its day: disregarded now' : 'not a crime here' };
  if ((o.military || rec.court === 'court-martial') && !travels(o)) return { seen: false, why: 'another country\'s military justice' };
  if (!crimeIn(cc, rec, y)) return { seen: false, why: 'not a crime here' };
  if (purpose === 'border') {
    if (y < SHARING_FROM.border) return { seen: false, why: 'the border doesn\'t ask yet' };
    return rec.severity === 'felony' || state.character.age - (rec.age ?? 0) < 10 ? { seen: true, why: 'declared on your visa forms' } : { seen: false, why: 'too old to ask about' };
  }
  if (y >= SHARING_FROM.eu && euMemberIn(from, y) && euMemberIn(cc, y)) return { seen: true, why: y >= SHARING_FROM.ecris ? 'shared across the EU (ECRIS)' : 'shared between Community members' };
  if (y >= SHARING_FROM.fiveEyes && FIVE_EYES.includes(from) && FIVE_EYES.includes(cc) && rec.severity === 'felony') return { seen: true, why: 'a serious conviction shared between the Five Eyes' };
  if (y >= SHARING_FROM.interpol && travels(o)) return { seen: true, why: y >= 1956 ? 'the kind of crime that travels (Interpol)' : 'the kind of crime that travels (the International Criminal Police Commission)' };
  return { seen: false, why: y >= SHARING_FROM.border ? 'not shared with employers here — but declared on a visa application' : 'records don\'t cross borders in this day' };
}

/** The footnote under a record with convictions abroad, in the words of the day. */
export function sharingNote(state) {
  const y = yearOf(state);
  const parts = [];
  if (y >= SHARING_FROM.eu) parts.push(y >= 1993 ? 'across the EU' : 'between Community members');
  if (y >= SHARING_FROM.fiveEyes) parts.push('between the US, UK, Canada, Australia and New Zealand for serious crimes');
  const shared = parts.length ? ` Abroad, employers see it only where records are shared (${parts.join('; ')})${y >= SHARING_FROM.interpol ? ' or for crimes that travel on Interpol notices' : ''}.` : y >= SHARING_FROM.interpol ? ' Abroad, employers see it only for crimes that travel on police notices.' : ' Abroad, nobody will know unless you tell them.';
  return `A conviction belongs to the country that handed it down.${shared}${y >= SHARING_FROM.border ? ' A visa or citizenship application asks about every conviction anywhere.' : ''}`;
}

export const RecordAbroadModule = {
  id: 'recordAbroad',
  order: 1.5,
  setup() {
    RECORD_VIEW.fn = (state, rec, cc, purpose) => seenIn(state, rec, cc, purpose);
  },
};
