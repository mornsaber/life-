/**
 * Skin tone for the people emoji (👩🏽, 👴🏿…). Yours is chosen on the new-life form or drawn at
 * birth from where you were born, weighted by the country's population (every tone can occur
 * anywhere). Blood relatives share it, a child of two parents takes after one of them, and
 * everyone else — partners, friends, colleagues — gets a steady tone of their own drawn from the
 * country they're from.
 *
 * state.character.skinTone = 1–5 (the five emoji tones, light to dark); people may carry p.skinTone.
 */
import { Random } from '../../core/Random.js';

export const TONES = ['', '🏻', '🏼', '🏽', '🏾', '🏿'];
export const TONE_LABELS = ['', 'Light', 'Medium-light', 'Medium', 'Medium-dark', 'Dark'];

/** Weights for tones 1–5 by region. */
const W = {
  north: [55, 33, 9, 2, 1], south: [15, 42, 33, 8, 2], mena: [6, 30, 44, 17, 3], south_asia: [1, 8, 44, 40, 7],
  east_asia: [30, 55, 14, 1, 0], se_asia: [4, 32, 50, 13, 1], africa: [0, 1, 6, 35, 58], horn: [0, 2, 20, 50, 28],
  latam: [15, 28, 35, 16, 6], caribbean: [2, 6, 17, 40, 35], central_asia: [22, 45, 27, 5, 1], pacific: [1, 6, 30, 45, 18],
  US: [45, 16, 18, 12, 9], GB: [62, 18, 10, 5, 5], anglo: [56, 20, 14, 6, 4], BR: [26, 24, 29, 13, 8], ZA: [6, 6, 12, 26, 50],
};
const REGION = {};
const put = (region, ccs) => ccs.forEach((cc) => { REGION[cc] = region; });
put('north', ['IE', 'NL', 'BE', 'LU', 'DE', 'AT', 'CH', 'FR', 'DK', 'NO', 'SE', 'FI', 'IS', 'PL', 'EE', 'LV', 'LT', 'CZ', 'SK', 'HU', 'RU', 'BY', 'UA']);
put('south', ['ES', 'PT', 'IT', 'GR', 'CY', 'MT', 'MC', 'VA', 'SM', 'RO', 'BG', 'BA', 'XK', 'RS', 'HR', 'AL', 'TR', 'IL', 'AM', 'AZ', 'GE']);
put('mena', ['EG', 'SA', 'AE', 'IQ', 'SY', 'JO', 'KW', 'QA', 'BH', 'OM', 'YE', 'LY', 'MA', 'DZ', 'TN', 'LB', 'PS', 'IR', 'AF']);
put('south_asia', ['IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'MV']);
put('east_asia', ['CN', 'JP', 'KR', 'KP', 'TW', 'MN', 'HK']);
put('se_asia', ['TH', 'VN', 'KH', 'LA', 'MM', 'MY', 'SG', 'ID', 'PH', 'BN', 'TL']);
put('africa', ['NG', 'GH', 'KE', 'CD', 'CF', 'CI', 'ML', 'NE', 'SN', 'TD', 'GM', 'GW', 'MW', 'MZ', 'SS', 'LR', 'UG', 'TZ', 'ZW', 'ZM', 'CM', 'AO', 'RW', 'BJ', 'BF', 'TG', 'SL', 'GN']);
put('horn', ['ET', 'SO', 'DJ', 'ER', 'SD']);
put('latam', ['MX', 'AR', 'CO', 'PE', 'CL', 'VE', 'EC', 'BO', 'UY', 'PY', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'DO']);
put('caribbean', ['JM', 'HT', 'BS', 'TT', 'BB']);
put('central_asia', ['KZ', 'UZ', 'KG', 'TJ', 'TM']);
put('pacific', ['PG', 'SB', 'VU', 'TO', 'FJ', 'WS', 'MH']);
put('anglo', ['CA', 'AU', 'NZ']);
const weightsFor = (cc) => W[cc] ?? W[REGION[cc]] ?? W.south;

const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
/** A tone drawn for someone from `cc`, steady for the same key. */
export function toneFrom(cc, key) {
  const rng = new Random(hash(`${cc}:${key}`));
  const w = weightsFor(cc);
  return rng.weighted([1, 2, 3, 4, 5], (t) => w[t - 1]) ?? 3;
}

const BLOOD = ['mother', 'father', 'parent', 'sibling', 'grandparent', 'grandchild', 'aunt', 'uncle', 'cousin', 'niece', 'nephew'];
const birthCountry = (state) => state.migration?.birthCountry ?? state.character.countryId ?? 'US';
/** Your tone. */
export const skinToneOf = (state) => state.character.skinTone || toneFrom(birthCountry(state), `${state.character.firstName}${state.character.lastName}${state.character.birthYear}`);
/** Someone else's tone: family share yours; a child takes after you or their other parent. */
export function personTone(state, p) {
  if (!p) return skinToneOf(state);
  if (p.skinTone) return p.skinTone;
  if (BLOOD.includes(p.relation)) return skinToneOf(state);
  if (p.relation === 'child' || p.relation === 'stepchild') {
    const other = p.otherParentId ? (state.people?.list ?? []).find((x) => x.id === p.otherParentId) : null;
    const theirs = other ? personTone(state, other) : skinToneOf(state);
    return hash(p.id) % 2 ? skinToneOf(state) : theirs;
  }
  return toneFrom(p.countryId ?? state.character.countryId ?? 'US', p.id ?? p.firstName);
}

/** Emoji that take a skin tone (the people ones); anything else is left alone. */
const TONEABLE = /^(👶|👧|👦|👩|👨|🧒|🧑|🧓|👵|👴|👱|🧔|👮|👷|💂|🕵|👸|🤴|🙋|🙇|🧕|👳|🤰|👲|🧙|🧚|🧛|🧜|🧝|🙍|🙎|🙅|🙆|💁|🤷|🤦|🏃|🚶|🧘|💪|👋|🤝)/u;
/** Put a tone on a people emoji (it goes after the first character of a ZWJ sequence). */
export function toned(emoji, tone) {
  if (!tone || !emoji) return emoji;
  const m = TONEABLE.exec(emoji);
  if (!m) return emoji;
  return m[1] + TONES[tone] + emoji.slice(m[1].length).replace(/^[\u{1F3FB}-\u{1F3FF}]/u, '');
}
