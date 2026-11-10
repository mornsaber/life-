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
import { regionStateAt } from './HistoricalData.js';
import { encodePicks, decodePicks } from './StartPicks.js';

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

const BY_COUNTRY = {};
for (const [id, r] of Object.entries(REGIONS)) if (r.country) (BY_COUNTRY[r.country] ??= []).push(id);
const US_TOWNS = ['smalltown', 'midcity', 'sunbelt', 'chicago', 'denver', 'miami', 'atlanta', 'philadelphia', 'phoenix', 'detroit', 'nashville', 'charlotte', 'pittsburgh', 'amarillo'];

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
  const add = (name, flag, cc, regions, spec) => {
    const key = sortName(name).toLowerCase();
    const e = out.get(key) ?? { name: cap(name), flag, spec, home: cc, picks: [] };
    const same = e.picks.find(([c]) => c === cc);
    if (same && same[1] && regions) same[1].push(...regions);
    else if (!same) e.picks.push([cc, regions]);
    out.set(key, e);
  };
  for (const cc of Object.keys(COUNTRIES)) {
    const towns = cc === 'US' ? US_TOWNS : [...new Set([...(COUNTRIES[cc].hometowns ?? []), ...(BY_COUNTRY[cc] ?? [])])];
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
