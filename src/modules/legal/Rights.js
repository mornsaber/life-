/**
 * Your rights, by country and year: the law that decided what you could do beyond work.
 *
 *   Credit        before the equal-credit laws (America's Equal Credit Opportunity Act 1974,
 *                 Britain's Sex Discrimination Act 1975, French wives' own bank accounts 1965…),
 *                 a bank wanted a husband's signature, and a single woman was often turned away.
 *   Custody       the father's right to his children (England until the Custody of Infants Act
 *                 1839, France's puissance paternelle until 1970); then the "tender years" rule
 *                 that gave young children to their mother; then the child's best interests, and
 *                 joint custody from about 1980.
 *   Mixed marriage  barred by race laws: most American states at one time (sixteen still in 1967,
 *                 until Loving v. Virginia), South Africa's Prohibition of Mixed Marriages Act
 *                 1949–85, the Nuremberg Laws 1935–45.
 *   Partnerships  two men or two women: registered partnerships before marriage (Denmark 1989,
 *                 France's PACS 1999, Britain's civil partnership 2005…).
 *   The vote, property, divorce and private life come from the statute book (politics/StatuteBook.js).
 *
 * Everything here is read by other modules (CreditCards, PeopleEngine) and shown in one place,
 * the "Your Rights" card on the Legal tab.
 */
import { yearNow, PRESENT } from '../world/Eras.js';
import { statuteIn, SUFFRAGE_FROM, WIVES_OWN, DIVORCE_FROM, NO_FAULT_FROM, DECRIMINALIZED, SAME_SEX_MARRIAGE } from '../politics/StatuteBook.js';
import { skinToneOf, personTone } from '../people/SkinTone.js';
import { stateIdOf } from '../life/Regions.js';
import { spouseOf } from '../people/People.js';

const cc = (state) => state.character?.countryId ?? 'US';
const historic = (state) => Boolean(state?.era) && yearNow(state) < PRESENT;
const female = (state) => state.character.gender === 'female';

/** The year a woman could get credit in her own name. */
export const WOMEN_CREDIT_FROM = { US: 1974, GB: 1975, IE: 1976, CA: 1974, AU: 1984, NZ: 1977, FR: 1965, DE: 1958, IT: 1975, ES: 1975, PT: 1976, NL: 1957, BE: 1976, CH: 1988, AT: 1975, SE: 1921, NO: 1927, DK: 1925, JP: 1947, ZA: 1984, '*': 1975 };

/** A reason a woman can't open credit here and now, or null. */
export function womenCreditBlock(state) {
  if (!female(state) || !historic(state)) return null;
  const from = WOMEN_CREDIT_FROM[cc(state)] ?? WOMEN_CREDIT_FROM['*'];
  if (yearNow(state) >= from) return null;
  return spouseOf(state)
    ? null // in her husband's name, with his signature: see creditInHusbandsName
    : `Banks won't give credit to a single woman without a man to co-sign (until ${from})`;
}
/** A married woman's card or loan is in her husband's name before the equal-credit law. */
export const creditInHusbandsName = (state) => female(state) && historic(state) && Boolean(spouseOf(state)) && yearNow(state) < (WOMEN_CREDIT_FROM[cc(state)] ?? WOMEN_CREDIT_FROM['*']);

/* ------------------------------------------------------------------ custody */
const FATHERS_RIGHT_UNTIL = { GB: 1839, IE: 1839, US: 1850, CA: 1855, AU: 1860, NZ: 1860, FR: 1970, DE: 1958, IT: 1975, ES: 1981, PT: 1977, BE: 1974, NL: 1947, CH: 1978, JP: 1947, '*': 1900 };
const BEST_INTERESTS_FROM = { GB: 1973, IE: 1997, US: 1975, CA: 1986, AU: 1975, NZ: 1980, FR: 1987, DE: 1980, SE: 1983, '*': 1985 };
/** How the courts decide who keeps the children: 'father' | 'tender' | 'best'. */
export function custodyRule(state) {
  const y = yearNow(state);
  if (!historic(state)) return 'best';
  const c = cc(state);
  if (y < (FATHERS_RIGHT_UNTIL[c] ?? FATHERS_RIGHT_UNTIL['*'])) return 'father';
  if (y < (BEST_INTERESTS_FROM[c] ?? BEST_INTERESTS_FROM['*'])) return 'tender';
  return 'best';
}
/** Added to the custody roll (higher: the children are likelier to go to the other parent). */
export function custodyTilt(state) {
  const rule = custodyRule(state);
  const her = female(state);
  if (rule === 'father') return her ? 0.7 : -0.6;
  if (rule === 'tender') return her ? -0.3 : 0.3;
  return 0;
}
export const jointCustodyExists = (state) => custodyRule(state) === 'best';

/* ------------------------------------------------------------- mixed marriage */
/** US states and the year their ban on marriage across the colour line ended. */
const US_BANS = { AL: 1967, AR: 1967, DE: 1967, FL: 1967, GA: 1967, KY: 1967, LA: 1967, MS: 1967, MO: 1967, NC: 1967, OK: 1967, SC: 1967, TN: 1967, TX: 1967, VA: 1967, WV: 1967, MD: 1967, CA: 1948, OR: 1951, MT: 1953, ND: 1955, CO: 1957, SD: 1957, ID: 1959, NV: 1959, AZ: 1962, NE: 1963, UT: 1963, IN: 1965, WY: 1965 };
const NATIONAL_BANS = { ZA: [1949, 1985, 'the Prohibition of Mixed Marriages Act'], DE: [1935, 1945, 'the Nuremberg Laws'] };
/** The law against marrying across the colour line here: { until, name } or null. */
export function mixedMarriageBan(state) {
  if (!historic(state)) return null;
  const y = yearNow(state);
  const c = cc(state);
  if (c === 'US') {
    const st = stateIdOf(state);
    const until = US_BANS[st];
    return until && y < until ? { until, name: 'the state\'s law against "miscegenation"' } : null;
  }
  const b = NATIONAL_BANS[c];
  return b && y >= b[0] && y < b[1] ? { until: b[1], name: b[2] } : null;
}
/** Why you can't marry this person under the race laws, or null. */
export function mixedMarriageBlock(state, person) {
  const ban = mixedMarriageBan(state);
  if (!ban || !person) return null;
  const a = skinToneOf(state);
  const b = personTone(state, person);
  // Germany's laws were about descent, not colour: the game can't see that, so only colour counts.
  return Math.abs(a - b) >= 2 && (a >= 4 || b >= 4) ? `Marriage across the colour line is against ${ban.name} (until ${ban.until})` : null;
}

/* ------------------------------------------------------------- partnerships */
export const CIVIL_UNION_FROM = { DK: 1989, NO: 1993, SE: 1995, IS: 1996, NL: 1998, FR: 1999, BE: 2000, DE: 2001, FI: 2002, NZ: 2005, GB: 2005, CH: 2007, CZ: 2006, SI: 2006, HU: 2009, AT: 2010, IE: 2011, BR: 2011, CO: 2007, UY: 2008, AU: 2009, US: 2000, IT: 2016, GR: 2015, CL: 2015, EE: 2016, CY: 2015, HR: 2014, MT: 2014, '*': 9999 };
const sameSex = (state, person) => person && person.gender && person.gender === state.character.gender;
/** 'marriage' | 'partnership' | null: what two men or two women can have here. */
export function sameSexUnion(state) {
  if (!historic(state)) return 'marriage';
  if (statuteIn(state, 'sameSexMarriage')) return 'marriage';
  return yearNow(state) >= (CIVIL_UNION_FROM[cc(state)] ?? 9999) ? 'partnership' : null;
}
/** Why you can't marry this partner, or null. */
export function marriageBlock(state, person) {
  if (sameSex(state, person) && !sameSexUnion(state)) return 'Two men or two women can\'t marry here, nor register a partnership';
  return mixedMarriageBlock(state, person);
}
export const isCivilPartnership = (state, person) => sameSex(state, person) && sameSexUnion(state) === 'partnership';

/* -------------------------------------------------------------- the vote */
/** Can you vote here? { ok, why } */
export function voteHere(state) {
  const y = yearNow(state);
  const c = cc(state);
  if (state.character.age < 21 && y < 1970) return { ok: false, why: 'Not until 21' };
  if (state.character.age < 18) return { ok: false, why: 'Not until 18' };
  if (female(state) && !statuteIn(state, 'womensSuffrage')) return { ok: false, why: `Women can't vote here (until ${SUFFRAGE_FROM[c] ?? SUFFRAGE_FROM['*']})` };
  if (historic(state) && c === 'ZA' && y < 1994 && skinToneOf(state) >= 3) return { ok: false, why: 'Only white South Africans vote (until 1994)' };
  if (historic(state) && c === 'US' && y < 1965 && skinToneOf(state) >= 4 && ['AL', 'AR', 'FL', 'GA', 'LA', 'MS', 'NC', 'SC', 'TN', 'TX', 'VA'].includes(stateIdOf(state))) {
    return { ok: false, why: 'Poll taxes and literacy tests keep Black voters off the rolls (until the Voting Rights Act, 1965)' };
  }
  return { ok: true, why: null };
}

/** Everything in one list, for the Rights card: [{ icon, label, text, bad }]. */
export function rightsSummary(state) {
  const y = yearNow(state);
  const c = cc(state);
  const her = female(state);
  const rows = [];
  const vote = voteHere(state);
  rows.push({ icon: '🗳️', label: 'The vote', text: vote.ok ? 'You can vote.' : `${vote.why}.`, bad: !vote.ok && state.character.age >= 18 });
  if (her) {
    const own = statuteIn(state, 'marriedWomensProperty');
    const credit = WOMEN_CREDIT_FROM[c] ?? WOMEN_CREDIT_FROM['*'];
    rows.push({ icon: '👛', label: 'Your money', text: `${own ? 'A married woman owns her own property and wages.' : `Marry, and your property and wages become your husband's (until ${WIVES_OWN[c] ?? 'reform'}).`} ${historic(state) && y < credit ? `Credit needs a husband's signature (until ${credit}).` : 'You can get credit in your own name.'}`, bad: !own || (historic(state) && y < credit) });
  }
  const ban = mixedMarriageBan(state);
  const union = sameSexUnion(state);
  rows.push({ icon: '💍', label: 'Who you may marry', text: `${ban ? `Not across the colour line: ${ban.name} (until ${ban.until}). ` : ''}${union === 'marriage' ? 'Two men or two women may marry.' : union === 'partnership' ? `Two men or two women may register a partnership, but not marry${SAME_SEX_MARRIAGE[c] ? ` (until ${SAME_SEX_MARRIAGE[c]})` : ''}.` : 'Two men or two women cannot marry.'}`, bad: Boolean(ban) || union !== 'marriage' });
  const divorce = statuteIn(state, 'divorce');
  const noFault = statuteIn(state, 'noFaultDivorce');
  rows.push({ icon: '💔', label: 'Divorce', text: !divorce ? `No divorce here${DIVORCE_FROM[c] ? ` (until ${DIVORCE_FROM[c]})` : ''}.` : noFault ? 'A marriage can end without anyone at fault.' : `Only on grounds: adultery, cruelty or desertion${NO_FAULT_FROM[c] ? ` (no-fault from ${NO_FAULT_FROM[c]})` : ''}.`, bad: !divorce });
  const rule = custodyRule(state);
  rows.push({ icon: '🧸', label: 'Custody', text: rule === 'father' ? 'Children belong to their father: a divorced mother may lose them.' : rule === 'tender' ? 'Young children usually go to their mother; fathers get visits.' : 'The court decides by the child\'s best interests; joint custody is common.', bad: (rule === 'father' && her) || (rule === 'tender' && !her) });
  if (statuteIn(state, 'sodomyLaw') && historic(state)) rows.push({ icon: '🚫', label: 'Private life', text: `Sex between men is a crime${DECRIMINALIZED[c] ? ` (until ${DECRIMINALIZED[c]})` : ''}.`, bad: !her });
  if (her || state.people?.list?.some((p) => p.relation === 'spouse' && p.gender === 'female')) {
    rows.push({ icon: '🏥', label: 'Abortion', text: statuteIn(state, 'abortion') ? 'Lawful, by a doctor.' : 'A crime.', bad: !statuteIn(state, 'abortion') });
  }
  return rows;
}
