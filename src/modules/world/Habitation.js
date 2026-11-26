/**
 * Where a life can begin and where one can settle. Most places both; some neither:
 *
 *   Vatican City     citizenship comes with an office (cardinals, the Swiss Guard, a few employees),
 *                    and lapses with it; nobody is born a Vatican citizen, and nobody immigrates.
 *   Svalbard         anyone may live and work there (the 1920 treaty), but there is no maternity ward:
 *                    mothers go to the mainland to give birth. Settle, yes; be born, no.
 *   The Chagos       born there until the islanders were deported, 1968–73; nobody since.
 *   The empty places Antarctica, Bouvet, Heard and McDonald, the French Southern Lands, South Georgia,
 *                    the US Minor Outlying Islands: stations, not homes.
 *
 * No imports: safe for anything to ask.
 */
const NOBODY = ['VA', 'AQ', 'BV', 'HM', 'TF', 'GS', 'UM'];
/** Born there until this year (the islanders deported). */
const BORN_UNTIL = { IO: 1971, SJ: 0 };
/** Could settle there until this year. */
const SETTLE_UNTIL = { IO: 1968 };

/** States that exist only if this world makes them (packs/sketches/Latent.js), and the year each formed. */
export const LATENT = ['XS', 'XW', 'XQ', 'XC', 'XF', 'XD', 'XR'];
let FORMED = {};
export const setFormed = (o = {}) => { FORMED = o ?? {}; };
export const formedIn = (cc) => FORMED[cc] ?? null;
const exists = (cc, year) => !LATENT.includes(cc) || (FORMED[cc] != null && year >= FORMED[cc]);

export const bornIn = (cc, year = 9999) => !NOBODY.includes(cc) && exists(cc, year) && !(year >= (BORN_UNTIL[cc] ?? Infinity));
export const settleIn = (cc, year = 9999) => !NOBODY.includes(cc) && exists(cc, year) && !(year >= (SETTLE_UNTIL[cc] ?? Infinity));
