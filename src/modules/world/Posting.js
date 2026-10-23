/**
 * Postings abroad: a deployment, an overseas tour, a UN or Interpol
 * secondment, a training exercise or a diplomatic mission puts you in a real
 * country, and you live there for the duration — the top bar says where you
 * are, you pick up the language, your volunteer service at home is on hold
 * and you come home when it ends. Home (your region, residency, taxes) stays
 * where it was: this is where you are, not where you're from.
 *
 * Every country a posting can send you to is a playable country, so the posting
 * moves you there for its duration: you live in one of its cities (the one
 * named, the base's town, or the capital), the top bar shows it, and its war
 * and its language are yours while you're there. Territories count as their
 * country (Guam, Greenland, Gibraltar, the Falklands).
 *
 * state.character.posting = { place, country, countryId, regionId, language, atSea, kind, since, until }
 *   kind: 'deployment' | 'tour' | 'secondment' | 'exercise' | 'mission'
 */
import { COUNTRIES, FOREIGN_CITIES } from './Countries.js';
import { speaks, LANGUAGE_FLUENT } from './Immigration.js';
import { FORCES } from './NationalForces.js';
import { INTL_ORG_PROFESSIONS, HARDSHIP, ordainedPriest } from '../career/IntlOrgCareers.js';

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
/** Territories, and the country they belong to. */
const TERRITORIES = { Greenland: 'DK', Guam: 'US', 'Puerto Rico': 'US', Gibraltar: 'GB', 'Falkland Islands': 'GB', 'Diego Garcia': 'GB', Okinawa: 'JP', 'New Caledonia': 'FR', 'French Guiana': 'FR', Mayotte: 'FR', Réunion: 'FR', Curaçao: 'NL', Aruba: 'NL' };
/** Other spellings of playable countries. */
const OTHER_NAMES = { 'Democratic Republic of the Congo': 'CD', Turkey: 'TR', 'Republic of Korea': 'KR', Burma: 'MM', UAE: 'AE', 'Gaza': 'PS', 'West Bank': 'PS' };
/** The playable country a place name belongs to (by name, territory or other spelling). */
export function countryIdOfName(name) {
  if (!name) return null;
  return Object.values(COUNTRIES).find((c) => c.name === name)?.id ?? TERRITORIES[name] ?? OTHER_NAMES[name] ?? null;
}
/** Where in that country you live: a city named in the place, the base's town, or the capital. */
/** Bases and missions, and the town you'd live in. */
const CITY_HINTS = [
  [/Ramstein|Landstuhl/, 'kaiserslautern'], [/Grafenwöhr|Vilseck/, 'grafenwoehr'], [/Pituffik|Greenland/, 'nuuk'], [/UNIFIL/, 'naqoura'], [/Golan|UNDOF/, 'damascus'],
  // NATO's battlegroups on the eastern flank (the country check picks the right one).
  [/Forward Presence|battlegroup|Rukla/, 'rukla'], [/Forward Presence|battlegroup|Ādaži|Adazi/, 'adazi'], [/Forward Presence|battlegroup|Tapa\b/, 'tapa'],
  [/Forward Presence|battlegroup|Żagań|Zagan/, 'zagan'], [/Forward Presence|battlegroup|Kogălniceanu|Kogalniceanu/, 'kogalniceanu'], [/KFOR|Bondsteel/, 'ferizaj'], [/EUFOR|Butmir/, 'butmir'],
  [/Arifjan/, 'arifjan'], [/Buehring|Ali Al Salem/, 'jahra'], [/Udeid/, 'aludeid'], [/Al Asad/, 'alasad'], [/Erbil|Kurd|Peshmerga/, 'erbil'], [/Bagram/, 'bagram'], [/Incirlik/, 'incirlik'],
  [/Baledogle/, 'baledogle'], [/Lemonnier/, 'djibouti'], [/Agadez|Air Base 201/, 'agadez'], [/Gao\b|MINUSMA/, 'gao'], [/MONUSCO/, 'goma'], [/MINUSCA/, 'bangui'], [/UNMISS/, 'juba'], [/UNFICYP/, 'nicosia'],
];
function cityFor(countryId, place) {
  const cities = Object.entries(FOREIGN_CITIES).filter(([, c]) => c.country === countryId);
  if (!cities.length) return null;
  const s = String(place ?? '');
  const hinted = CITY_HINTS.find(([re, id]) => re.test(s) && FOREIGN_CITIES[id]?.country === countryId);
  if (hinted) return hinted[1];
  const named = cities.find(([, c]) => s.includes(c.name.split(',')[0]));
  if (named) return named[0];
  const bases = Object.values(FORCES[countryId]?.bases ?? {}).flat();
  const base = bases.find(([, name]) => s.includes(String(name).split(/[ ,(]/)[0]));
  if (base) return base[0];
  const capital = COUNTRIES[countryId]?.capital;
  return (cities.find(([, c]) => c.name.split(',')[0] === capital) ?? cities[0])[0];
}

/** At sea: a deployment aboard ship has no country to live in. */
const AT_SEA = /\bSea\b|Strait|Gulf\b|Pacific|Caribbean|Mediterranean|Atlantic|amphibious|maritime task force|aboard|Mozambique Channel/i;

/** Which country (and language) a place is in. */
export function placeCountry(text) {
  const s = String(text ?? '');
  if (AT_SEA.test(s) && !/\bBase\b|\bStation\b|Camp\b/.test(s)) return { country: null, language: null, atSea: true };
  const names = { ...Object.fromEntries(Object.values(COUNTRIES).map((c) => [c.name, c.languages?.[0] ?? 'English'])), ...WORLD };
  let country = Object.keys(names).filter((n) => s.includes(n)).sort((a, b) => b.length - a.length)[0] ?? null;
  if (!country) country = ALIASES.find(([re]) => re.test(s))?.[1] ?? null;
  const countryId = countryIdOfName(country);
  return { country, countryId, regionId: countryId ? cityFor(countryId, s) : null, language: country ? names[country] ?? COUNTRIES[countryId]?.languages?.[0] ?? null : null, atSea: false };
}

export const postingOf = (state) => state.character?.posting ?? null;

/** Post the player abroad for `years` (a deployment inside the year: 1). */
export function postAbroad(ctx, { place, kind = 'deployment', years = 1, country = null }) {
  const { state } = ctx;
  const id = country ? countryIdOfName(country) : null;
  const where = country ? { country, countryId: id, regionId: id ? cityFor(id, place) : null, language: WORLD[country] ?? COUNTRIES[id]?.languages?.[0] ?? null, atSea: false } : placeCountry(place);
  // A posting to the country you already live in is just work.
  const home = state.character.countryId ?? 'US';
  if (where.countryId === home || where.country === COUNTRIES[home]?.name) return null;
  state.character.posting = { place, ...where, kind, since: state.character.age, until: state.character.age + years };
  // Volunteer service at home goes on hold while you're away.
  for (const [id, m] of Object.entries(state.emergency ?? {})) {
    if (id === 'history' || !m || m.onLeave) continue;
    m.onLeave = true;
    m.postingLeave = true;
  }
  return state.character.posting;
}

/**
 * Where you live at an international duty station: 'provided' (a compound at a hardship post,
 * the Swiss Guard's barracks, a nunciature, a Vatican apartment) or 'local' (you rent in the city,
 * with a rental subsidy at first). Null when you aren't on an international posting.
 */
export function postedHousing(state) {
  const p = postingOf(state);
  if (!p || p.kind !== 'intl') return null;
  const job = state.career.job;
  if (HARDSHIP.includes(p.place)) return 'provided';
  if (['swissGuard', 'holySeeDiplomacy'].includes(job?.professionId)) return 'provided';
  if (job?.professionId === 'romanCuria' && ordainedPriest(state)) return 'provided';
  return 'local';
}

/** Back home: the posting ends and your volunteer service picks up again. `moving`: straight on to another post. */
export function endPosting(ctx, why, { moving = false } = {}) {
  const { state } = ctx;
  const p = postingOf(state);
  if (!p) return;
  state.character.posting = null;
  if (!moving && (p.kind === 'intl' || state.housing?.rental?.posted)) ctx.emit('housing:postingEnded', {});
  for (const [id, m] of Object.entries(state.emergency ?? {})) {
    if (id === 'history' || !m?.postingLeave) continue;
    m.onLeave = false;
    delete m.postingLeave;
  }
  if (why) ctx.log(why, '🛬', 'info');
}

/** A label for where you are: "Camp Humphreys, South Korea" or "at sea". */
export const postingLabel = (p) => {
  const town = p.regionId ? FOREIGN_CITIES[p.regionId]?.name.split(',')[0] : null;
  const base = p.atSea ? `${p.place} (at sea)` : p.country && !p.place.includes(p.country) ? `${p.place}, ${p.country}` : p.place;
  return `${p.countryId ? `${COUNTRIES[p.countryId]?.flag ?? ''} ` : ''}${base}${town && !base.includes(town) ? ` · ${town}` : ''}`;
};

/** Where you physically are: the country and city of a posting, or home. */
export function whereNow(state) {
  const p = postingOf(state);
  if (p?.countryId) return { countryId: p.countryId, regionId: p.regionId ?? null, posted: true };
  return { countryId: state.character.countryId ?? 'US', regionId: state.character.regionId, posted: false };
}

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
    // An international organisation moves its staff between stations itself (IntlOrgs.js): no gap at the end of a tour.
    const intlJob = INTL_ORG_PROFESSIONS[state.career.job?.professionId];
    if (p.kind === 'intl' && intlJob) return;
    if (state.character.age >= p.until || p.kind === 'intl') endPosting(ctx, p.kind === 'deployment' ? null : `Your time in ${postingLabel(p)} ended. You came home.`);
  },
};
