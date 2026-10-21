/**
 * Postings abroad: a deployment, an overseas tour, a UN or Interpol
 * secondment, a training exercise or a diplomatic mission puts you in a real
 * country, and you live there for the duration — the top bar says where you
 * are, you pick up the language, your volunteer service at home is on hold
 * and you come home when it ends. Home (your region, residency, taxes) stays
 * where it was: this is where you are, not where you're from.
 *
 * state.character.posting = { place, country, language, atSea, kind, since, until }
 *   kind: 'deployment' | 'tour' | 'secondment' | 'exercise' | 'mission'
 */
import { COUNTRIES } from './Countries.js';
import { speaks, LANGUAGE_FLUENT } from './Immigration.js';

/** Countries a posting can be in, with the language you'd pick up there. */
export const WORLD = {
  Syria: 'Arabic', Iraq: 'Arabic', Qatar: 'Arabic', Bahrain: 'Arabic', Kuwait: 'Arabic', Jordan: 'Arabic', Lebanon: 'Arabic', 'Saudi Arabia': 'Arabic', 'United Arab Emirates': 'Arabic', Egypt: 'Arabic',
  Djibouti: 'French', Mali: 'French', Niger: 'French', Chad: 'French', 'Central African Republic': 'French', 'DR Congo': 'French', Haiti: 'French', France: 'French',
  Somalia: 'Somali', 'South Sudan': 'English', Kenya: 'Swahili', Afghanistan: 'Pashto', Kosovo: 'Albanian', Cyprus: 'Greek', Türkiye: 'Turkish',
  Lithuania: 'Lithuanian', Estonia: 'Estonian', Latvia: 'Latvian', Poland: 'Polish', Romania: 'Romanian', Norway: 'Norwegian', Greenland: 'Danish', Germany: 'German',
  Japan: 'Japanese', 'South Korea': 'Korean', Philippines: 'Tagalog', Brunei: 'Malay', Singapore: 'English', Australia: 'English', 'Solomon Islands': 'English', 'Papua New Guinea': 'Tok Pisin',
  Italy: 'Italian', Spain: 'Spanish', Netherlands: 'Dutch', Argentina: 'Spanish', Colombia: 'Spanish', 'United Kingdom': 'English', Gibraltar: 'English', 'Falkland Islands': 'English', Guam: 'English',
  'United States': 'English', Belgium: 'French',
};
/** Regions and missions that stand for a country. */
const ALIASES = [
  [/Sahel/, 'Mali'], [/Horn of Africa/, 'Djibouti'], [/Baltic/, 'Lithuania'], [/Kurd|Peshmerga/, 'Iraq'], [/West Africa/, 'Niger'], [/Okinawa|Yokosuka|Iwakuni|Zama|Kadena|Yokota/, 'Japan'],
  [/Turkey/, 'Türkiye'], [/Ramstein|Grafenwöhr|Stuttgart|Bavaria/, 'Germany'], [/Humphreys|Osan|Mujuk/, 'South Korea'], [/Lyon/, 'France'], [/The Hague/, 'Netherlands'], [/Golan/, 'Syria'],
  [/Kabul/, 'Afghanistan'], [/Lakenheath|Fylingdales/, 'United Kingdom'], [/Pituffik/, 'Greenland'], [/Rota/, 'Spain'], [/Naples|Aviano|Vicenza/, 'Italy'],
];
/** At sea: a deployment aboard ship has no country to live in. */
const AT_SEA = /\bSea\b|Strait|Gulf\b|Pacific|Caribbean|Mediterranean|Atlantic|amphibious|maritime task force|aboard/i;

/** Which country (and language) a place is in. */
export function placeCountry(text) {
  const s = String(text ?? '');
  if (AT_SEA.test(s) && !/\bBase\b|\bStation\b|Camp\b/.test(s)) return { country: null, language: null, atSea: true };
  const names = { ...Object.fromEntries(Object.values(COUNTRIES).map((c) => [c.name, c.languages?.[0] ?? 'English'])), ...WORLD };
  let country = Object.keys(names).filter((n) => s.includes(n)).sort((a, b) => b.length - a.length)[0] ?? null;
  if (!country) country = ALIASES.find(([re]) => re.test(s))?.[1] ?? null;
  return { country, language: country ? names[country] ?? null : null, atSea: false };
}

export const postingOf = (state) => state.character?.posting ?? null;

/** Post the player abroad for `years` (a deployment inside the year: 1). */
export function postAbroad(ctx, { place, kind = 'deployment', years = 1, country = null }) {
  const { state } = ctx;
  const where = country ? { country, language: WORLD[country] ?? Object.values(COUNTRIES).find((c) => c.name === country)?.languages?.[0] ?? null, atSea: false } : placeCountry(place);
  // A posting to the country you already live in is just work.
  const home = COUNTRIES[state.character.countryId ?? 'US']?.name ?? 'United States';
  if (where.country === home) return null;
  state.character.posting = { place, ...where, kind, since: state.character.age, until: state.character.age + years };
  // Volunteer service at home goes on hold while you're away.
  for (const [id, m] of Object.entries(state.emergency ?? {})) {
    if (id === 'history' || !m || m.onLeave) continue;
    m.onLeave = true;
    m.postingLeave = true;
  }
  return state.character.posting;
}

/** Back home: the posting ends and your volunteer service picks up again. */
export function endPosting(ctx, why) {
  const { state } = ctx;
  const p = postingOf(state);
  if (!p) return;
  state.character.posting = null;
  for (const [id, m] of Object.entries(state.emergency ?? {})) {
    if (id === 'history' || !m?.postingLeave) continue;
    m.onLeave = false;
    delete m.postingLeave;
  }
  if (why) ctx.log(why, '🛬', 'info');
}

/** A label for where you are: "Camp Humphreys, South Korea" or "at sea". */
export const postingLabel = (p) => (p.atSea ? `${p.place} (at sea)` : p.country && !p.place.includes(p.country) ? `${p.place}, ${p.country}` : p.place);

export const PostingModule = {
  id: 'posting',
  // Before military, careers and secondments, so a new posting can start the year an old one ends.
  order: 1.5,
  onAgeUp(ctx) {
    const { state } = ctx;
    const p = postingOf(state);
    if (!p) return;
    // Living there teaches you the language (a ship teaches you nothing of the kind).
    const lang = p.language;
    state.migration ??= { birthCountry: state.character.countryId ?? 'US', residences: {}, languages: {}, history: [] };
    if (lang && !speaks(state, lang)) {
      const before = state.migration.languages[lang] ?? 0;
      state.migration.languages[lang] = Math.min(LANGUAGE_FLUENT, before + Math.round(6 + state.stats.smarts / 12));
      if (state.migration.languages[lang] >= LANGUAGE_FLUENT) ctx.log(`Your ${lang} is fluent now — a souvenir of ${p.country}.`, '🗣️', 'good');
    }
    if (state.character.age >= p.until) endPosting(ctx, p.kind === 'deployment' ? null : `Your time in ${postingLabel(p)} ended. You came home.`);
  },
};
