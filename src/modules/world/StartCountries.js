/**
 * The start screen's countries as they stood in the chosen year: West and East Germany, the
 * Kingdom of Bavaria, the Soviet Union, British India, Yugoslavia, with their flags of the day.
 * Each entry names where a life there can begin: a country, and for a state inside today's borders
 * (Saxony, the GDR, the Transvaal) the cities that belonged to it.
 */
import { COUNTRIES } from './Countries.js';
import { REGIONS } from '../life/Regions.js';
import { EVENTS } from './History.js';
import { COLONIES, PRESENT, stageEnd, periodCountryName, periodFlagEmoji, flagEmoji, periodFlag } from './Eras.js';
import { regionStateAt, REGION_STATES } from './HistoricalData.js';
import { encodePicks, decodePicks } from './StartPicks.js';
import { bornIn } from './Habitation.js';

export { encodePicks, decodePicks };

/** A stand-in life born in `year`, with our history's events before it marked as happened. */
export function eraSnapshot(year) {
  const state = { character: { birthYear: year, age: 0, countryId: '--' }, era: { start: year, events: {}, colonies: {} } };
  for (const [id, ev] of Object.entries(EVENTS)) {
    if (ev.at > year) continue;
    const lasts = ev.lasts ? Math.round((ev.lasts[0] + ev.lasts[1]) / 2) : null;
    state.era.events[id] = { year: ev.at, past: true, ...(lasts != null && ev.at + lasts <= year ? { lasts, ended: ev.at + lasts } : {}) };
  }
  for (const [cc, stages] of Object.entries(COLONIES)) {
    const rec = (state.era.colonies[cc] = { done: [], pressure: 0 });
    stages.forEach((st, i) => { if (stageEnd(state, st) <= year) rec.done.push(i); });
  }
  return state;
}

// Every city that was ever part of a state of its own (REGION_STATES), by today's country.
const BY_COUNTRY = {};
for (const id of Object.keys(REGION_STATES)) { const r = REGIONS[id]; if (r) (BY_COUNTRY[r.country ?? 'US'] ??= []).push(id); }
const US_TOWNS = ['smalltown', 'midcity', 'sunbelt', 'chicago', 'denver', 'miami', 'atlanta', 'philadelphia', 'phoenix', 'detroit', 'nashville', 'charlotte', 'pittsburgh', 'amarillo'];

/**
 * A state's short name for the menu: "the Kingdom of Hanover (in personal union with Britain until
 * 1837)" is "the Kingdom of Hanover"; "the State of Hyderabad, a princely state under British
 * paramountcy" is "the State of Hyderabad". The full name is the option's hint.
 */
export const shortStateName = (n) => {
  // A trailing aside goes ("(in personal union…)", "(Japan's puppet empire; …)"); a name in brackets stays ("(Lithuania)").
  const s = String(n).split(': ')[0].replace(/\s*\([^)]*$/, '').replace(/\s*\(([^)]*)\)\s*$/, (m, inner) => (/^[A-Z]/.test(inner) && inner.length <= 24 && !/[;,]/.test(inner) ? m : '')).trim();
  const i = s.search(/, (?:a|an|the|run|ruled|governed|under|autonomous|independent|recognised|part|guarded|claimed|seceded|annexed)\b/);
  return i > 3 ? s.slice(0, i) : s;
};
/** Sort key: "the Kingdom of Bavaria" files under K. */
export const sortName = (n) => n.replace(/^the /i, '');
const cap = (n) => n[0].toUpperCase() + n.slice(1);

/**
 * The countries and states of `year`, merged where several of today's countries were one
 * (Yugoslavia, Czechoslovakia): [{ value, name, flag, home }], `home` being the first country
 * (for grouping by continent). Null for today.
 */
export function startCountries(year) {
  if (!Number.isInteger(year) || year >= PRESENT) return null;
  const s = eraSnapshot(year);
  const out = new Map();
  const add = (full, flag, cc, regions, spec) => {
    const name = shortStateName(full);
    const key = sortName(name).toLowerCase();
    const e = out.get(key) ?? { name: cap(name), full: cap(full), flag, spec, home: cc, picks: [] };
    const same = e.picks.find(([c]) => c === cc);
    if (same && same[1] && regions) same[1].push(...regions);
    else if (!same) e.picks.push([cc, regions]);
    out.set(key, e);
  };
  for (const cc of Object.keys(COUNTRIES)) {
    if (!bornIn(cc, year)) continue;
    const towns = [...new Set([...(cc === 'US' ? US_TOWNS : COUNTRIES[cc].hometowns ?? []), ...(BY_COUNTRY[cc] ?? [])])];
    const own = towns.filter((r) => regionStateAt(r, year));
    const rest = (COUNTRIES[cc].hometowns ?? (cc === 'US' ? US_TOWNS : towns)).filter((r) => !regionStateAt(r, year));
    if (rest.length) add(periodCountryName(s, cc, COUNTRIES[cc].baseName), periodFlagEmoji(s, cc), cc, own.length ? rest : null, periodFlag(s, cc));
    for (const r of own) {
      const st = regionStateAt(r, year);
      add(st.name, st.flag ? flagEmoji(st.flag) : periodFlagEmoji(s, cc), cc, [r], st.flag ? (st.flag.length === 2 ? { img: st.flag.toUpperCase() } : { id: st.flag }) : periodFlag(s, cc));
    }
  }
  return [...out.values()].map((e) => ({ ...e, value: encodePicks(e.picks) }));
}
