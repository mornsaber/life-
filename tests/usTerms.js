/**
 * Words that mark a US-only institution, program or habit, for scanning lives
 * played abroad (tests/abroad.js, and tests/simulate.js with COUNTRY set).
 */
import { COUNTRIES, localizeHtml } from '../src/modules/world/Countries.js';

/** US-only things, and the countries where the same word is genuinely local. */
export const US_TERMS = [
  [/\bSocial Security\b/], [/\b401\(k\)/], [/\bIRS\b/], [/\bMedicaid\b/], [/\bMedicare\b/, ['AU']], [/\bGED\b/, ['CA']], [/\bFAFSA\b/], [/\bDMV\b/],
  [/\bSAT\b/, ['MX', 'JP']], [/\bCongress(ional)?\b/, ['IN', 'MX', 'PH']], [/\bU\.S\./], [/\bSheriff/], [/\bTrooper\b/], [/\bDistrict Attorney\b/], [/Selective Service/], [/Hatch Act/],
  [/Section 8\b/], [/Peace Corps/], [/AmeriCorps/], [/\bFEMA\b/], [/National Guard/], [/GI Bill/], [/\bthe VA\b/], [/(?<![\d,.£€¥$])\b911\b(?![\d,])/, ['CA', 'MX', 'PH']], [/\bNCLEX\b/], [/\bUSMLE\b/],
  [/\bNCAA\b|\bNFL\b|\bNBA\b|\bMLB\b/], [/Thanksgiving|Fourth of July/], [/\b(?:the|a|state|your|our) governor\b(?!-General)|\bgovernor's\b|\bGovernor of\b/i, ['MX', 'PH', 'JP', 'KR', 'IN', 'AU', 'CA', 'IT']],
  [/\b[Cc]ounty\b/, ['GB', 'IE', 'CA', 'KR', 'NZ']], [/\bState (Police|Senate|Legislature|Assembly)\b/, ['AU', 'IN', 'MX', 'DE']], [/\bstate (tax|income tax)\b/i, ['AU', 'IN', 'MX', 'DE', 'CA']],
  [/\bGreen Card\b/i], [/\bW-2\b|\b1099(?:-| form| contractor)/], [/\bOSHA\b|\bEEOC\b|\bNLRB\b/], [/\bFBI\b|\bDEA\b|\bATF\b|\bCIA\b|\bNSA\b/], [/\bPOST\b/], [/\bHOA\b/], [/\bUSERRA\b/], [/(?<!(?:top|every|spare) )\bdollars?\b/i],
];

const BAD_TEXT = /undefined|NaN|\[object |\bnull\b|Infinity/;
/** Problems in one piece of screen text: [message] (empty when clean). */
export function usLeftovers(cc, text) {
  const out = [];
  if (!text) return out;
  if (BAD_TEXT.test(text)) out.push(`${cc} broken text: "${text.slice(0, 160)}"`);
  for (const [re, ok] of US_TERMS) {
    if (ok?.includes(cc)) continue;
    const m = text.match(re);
    if (m) out.push(`${cc} "${m[0]}": "…${text.slice(Math.max(0, m.index - 70), m.index + 60)}"`);
  }
  if (!COUNTRIES[cc].currency.symbol.endsWith('$')) { const m = text.match(/(?<![A-Z])\$\d/); if (m) out.push(`${cc} dollar amount: "…${text.slice(Math.max(0, m.index - 60), m.index + 30)}"`); }
  return out;
}
/** Screen text of a rendered view, through the country's swaps, in sentence-sized pieces. */
export const screenText = (html, country) => localizeHtml(html, country).replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').split(/(?<=[.!?])\s|\s{2,}/);
