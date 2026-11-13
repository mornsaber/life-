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

export const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
export const FIVE_EYES = ['US', 'GB', 'CA', 'AU', 'NZ'];
/** Offences of their day: crimes once, disregarded now and never held against you abroad. */
const OF_THEIR_DAY = new Set(['grossIndecency', 'bootlegging', 'serviceRefusal', 'draftEvasion']);
/** Crimes that travel: Interpol notices, sex-offender and terror lists. */
const travels = (o) => Boolean(o.violent || o.sexual || o.registry || o.capital || o.drug === 'trafficking');

/** Where a conviction was handed down (older saves: the country you were born in). */
export const recordCountry = (state, rec) => rec.country ?? state.migration?.birthCountry ?? 'US';

/** Is this conduct a crime in that country at all (dual criminality)? */
function crimeIn(cc, rec) {
  if (rec.offenseId === 'drugPossession') return drugLawOf(cc).possession === 'crime';
  return true;
}

/**
 * Whether a conviction is seen in a country, by whom ('job' — employers, licensing boards,
 * courts, offices; 'border' — a visa, residence or citizenship application).
 */
export function seenIn(state, rec, cc, purpose = 'job') {
  const from = recordCountry(state, rec);
  if (from === cc) return true;
  const o = OFFENSES[rec.offenseId] ?? {};
  if (['infraction', 'civil'].includes(rec.severity)) return false;
  if (o.political || OF_THEIR_DAY.has(rec.offenseId)) return false;
  if ((o.military || rec.court === 'court-martial') && !travels(o)) return false;
  if (!crimeIn(cc, rec)) return false;
  if (purpose === 'border') return rec.severity === 'felony' || state.character.age - (rec.age ?? 0) < 10;
  if (EU.includes(from) && EU.includes(cc)) return true;
  if (FIVE_EYES.includes(from) && FIVE_EYES.includes(cc) && rec.severity === 'felony') return true;
  return travels(o);
}

/** Why a conviction is or isn't seen where you are, in a few words (for the record view). */
export function seenWhy(state, rec, cc) {
  const from = recordCountry(state, rec);
  if (from === cc) return { seen: true, why: 'convicted here' };
  const o = OFFENSES[rec.offenseId] ?? {};
  if (['infraction', 'civil'].includes(rec.severity)) return { seen: false, why: 'a ticket or civil matter: it stays where it was' };
  if (o.political) return { seen: false, why: 'a political conviction: no free country counts it' };
  if (OF_THEIR_DAY.has(rec.offenseId)) return { seen: false, why: 'an offence of its day: disregarded now' };
  if ((o.military || rec.court === 'court-martial') && !travels(o)) return { seen: false, why: 'another country\'s military justice' };
  if (!crimeIn(cc, rec)) return { seen: false, why: 'not a crime here' };
  if (EU.includes(from) && EU.includes(cc)) return { seen: true, why: 'shared across the EU (ECRIS)' };
  if (FIVE_EYES.includes(from) && FIVE_EYES.includes(cc) && rec.severity === 'felony') return { seen: true, why: 'a serious conviction shared between the Five Eyes' };
  if (travels(o)) return { seen: true, why: 'the kind of crime that travels (Interpol)' };
  return { seen: false, why: 'not shared with employers here — but declared on a visa application' };
}

export const RecordAbroadModule = {
  id: 'recordAbroad',
  order: 1.5,
  setup() {
    RECORD_VIEW.fn = (state, rec, cc, purpose) => seenIn(state, rec, cc, purpose);
  },
};
