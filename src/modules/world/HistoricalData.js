/**
 * Readers for the open historical datasets in world/data/ (see data/SOURCES.md):
 *
 *   dataRegime        form of government by country and year (Anckar & Fredriksson)
 *   regionStateAt     the state a city belonged to before unification, partition or after a
 *                     split (dates from the Gleditsch & Ward state list): Munich in the Kingdom of
 *                     Bavaria, Naples in the Two Sicilies, Leipzig in East Germany
 *   demographyAt      GDP per head, population and life expectancy (Maddison, OWID)
 *   eraMortality      how much likelier an adult was to die in a year then than now
 *   eraFirstNames     the popular US first names of a birth decade (SSA)
 *   periodCurrency    the money of the day (ISO 4217 history and official conversion rates)
 *   warsStarting / warsEnding   Correlates of War wars our countries fought
 */
import { REGIME_YEARS } from './data/regimes.js';
import { DEMOGRAPHY, DEMOGRAPHY_YEARS } from './data/demography.js';
import { US_NAMES_BY_DECADE } from './data/names.js';
import { CURRENCY_HISTORY } from './data/currencies.js';
import { WARS } from './data/wars.js';
import { STATES, SOVEREIGN_YEARS } from './data/states.js';
import { PACKS } from './packs/index.js';

// Country packs bring their own history (packs/Sketch.js) where the datasets have none.
for (const p of PACKS) {
  const h = p.history;
  if (!h) continue;
  if (h.regimes && !REGIME_YEARS[p.id]) REGIME_YEARS[p.id] = h.regimes;
  if (h.sovereign && !SOVEREIGN_YEARS[p.id]) SOVEREIGN_YEARS[p.id] = h.sovereign;
  if (h.demography && !DEMOGRAPHY[p.id]) DEMOGRAPHY[p.id] = h.demography;
  if (h.money && !CURRENCY_HISTORY[p.id]) CURRENCY_HISTORY[p.id] = h.money;
}

/* ---------------------------------------------------------------- government */

/** The countries the regime data covers. */
export const DATA_COUNTRIES = Object.keys(REGIME_YEARS);

const MONARCHIC = ['absmon', 'semimon', 'monolig'];
/** The data's regime in a year: { cat, democracy, monarchy } or null (not sovereign, or no data). */
export function dataRegime(cc, year) {
  const rows = REGIME_YEARS[cc];
  if (!rows || year < rows[0][0]) return null;
  if (!sovereignIn(cc, year)) return null;
  let row = rows[0];
  for (const r of rows) if (r[0] <= year) row = r;
  const [, cat, democracy, monarchy] = row;
  return { cat, democracy: Boolean(democracy), monarchy: Boolean(monarchy) || MONARCHIC.includes(cat) };
}
/** Was the country an independent state in that year (Gleditsch & Ward; from 1816)? */
export function sovereignIn(cc, year) {
  const spans = SOVEREIGN_YEARS[cc];
  if (!spans) return true;
  if (year < 1816) return true;
  return spans.some(([from, until]) => year >= from && (until == null || year <= until));
}
const gw = (code) => STATES[String(code)];
/** The years a Gleditsch & Ward state existed: [start, end] (end null: still exists). */
const spanOf = (code) => { const s = gw(code)?.spans?.[0]; return s ? [s[0], s[1]] : [1816, null]; };
const until = (code) => spanOf(code)[1];

/* ---------------------------------------------------------------- splits and mergers */

const THALER = ['DET', 'Tlr ', 'thaler', null, 1.40];
const GULDEN = ['DEG', 'fl. ', 'gulden', null, 2.40];
const FLORIN = ['ATF', 'fl. ', 'Austrian florin', null, 2.07];
const PRUSSIA = ['the Kingdom of Prussia', 'the King of Prussia', 'monarchy', 'prussia', THALER];
const BAVARIA = ['the Kingdom of Bavaria', 'the King of Bavaria', 'monarchy', 'bavaria', GULDEN];
const LOMBARDY = ['the Kingdom of Lombardy–Venetia, ruled by Austria', 'the Emperor of Austria', 'colony', 'habsburg', FLORIN];
const TWO_SICILIES = ['the Kingdom of the Two Sicilies', 'the King of the Two Sicilies', 'absolute', 'twoSicilies', ['ITD', 'D. ', 'ducat', null, 1.22]];
const PAPAL = ['the Papal States', 'the Pope', 'absolute', 'papal', ['ITS', 'sc. ', 'scudo', null, 0.97]];
const GDR = ['the German Democratic Republic (East Germany)', 'the First Secretary', 'eastbloc', 'gdr', ['DDM', 'M ', 'Mark der DDR', null, 2.4]];
const SAFRICAN = ['the South African Republic (the Transvaal)', 'the State President', 'republic', 'transvaal'];
const OFS = ['the Orange Free State', 'the State President', 'republic', 'orangeFreeState'];
const CAPE = ['the Cape Colony', 'the Governor', 'colony', 'blueEnsign'];
const NATAL = ['the Colony of Natal', 'the Governor', 'colony', 'blueEnsign'];
const R = (from, to, [name, leader, kind, flag = null, currency = null]) => ({ from, to, name, leader, kind, flag, currency });

/**
 * Cities whose state was not the country's: [from, until) spans. End years come from the state
 * list where it has the state (Bavaria and Württemberg to 1871, the Two Sicilies to 1861, the
 * Papal States to 1870, the Boer republics and the GDR); the rest are the annexation years.
 */
export const REGION_STATES = {
  // Germany before 1871, and the East.
  munich: [R(1800, until(245), BAVARIA)], passau: [R(1800, until(245), BAVARIA)], garmisch: [R(1800, until(245), BAVARIA)], grafenwoehr: [R(1800, until(245), BAVARIA)],
  kaiserslautern: [R(1816, until(245), ['the Kingdom of Bavaria (the Palatinate)', 'the King of Bavaria', 'monarchy', 'bavaria', GULDEN])],
  stuttgart: [R(1800, until(271), ['the Kingdom of Württemberg', 'the King of Württemberg', 'monarchy', 'wurttemberg', GULDEN])],
  leipzig: [R(1800, until(269), ['the Kingdom of Saxony', 'the King of Saxony', 'monarchy', 'saxony', THALER]), R(spanOf(265)[0], until(265), GDR)],
  goerlitz: [R(1815, 1871, PRUSSIA), R(spanOf(265)[0], until(265), GDR)],
  titisee: [R(1806, until(267), ['the Grand Duchy of Baden', 'the Grand Duke of Baden', 'monarchy', 'baden', GULDEN])],
  hamburg: [R(1815, 1871, ['the Free and Hanseatic City of Hamburg', 'the Senate', 'city', 'hamburg', ['DEH', 'M. ', 'mark courant', null, 3.5]])],
  frankfurt: [R(1815, 1866, ['the Free City of Frankfurt', 'the Senate', 'city', 'frankfurt', GULDEN]), R(1866, 1871, PRUSSIA)],
  fulda: [R(1815, 1866, ['the Electorate of Hesse', 'the Elector of Hesse', 'monarchy', 'hesse', THALER]), R(1866, 1871, PRUSSIA)],
  berlin: [R(1800, 1871, PRUSSIA)], cologne: [R(1815, 1871, PRUSSIA)], winterberg: [R(1815, 1871, PRUSSIA)], cochem: [R(1815, 1871, PRUSSIA)],
  // Italy before 1861 (Venetia to 1866, Rome to 1870, Cortina Austrian until 1918).
  naples: [R(1816, until(329), TWO_SICILIES)], palermo: [R(1816, until(329), TWO_SICILIES)], enna: [R(1816, until(329), TWO_SICILIES)], corleone: [R(1816, until(329), TWO_SICILIES)],
  rome: [R(1800, until(327), PAPAL)], rieti: [R(1800, 1860, PAPAL)], benevento: [R(1800, 1860, ['the Papal States (the enclave of Benevento)', 'the Pope', 'absolute', 'papal', ['ITS', 'sc. ', 'scudo', null, 0.97]])],
  milan: [R(1815, 1859, LOMBARDY)], sondrio: [R(1815, 1859, LOMBARDY)],
  vicenza: [R(1815, 1866, LOMBARDY)], belluno: [R(1815, 1866, LOMBARDY)], aviano: [R(1815, 1866, LOMBARDY)], tolmezzo: [R(1815, 1866, LOMBARDY)],
  cortina: [R(1800, 1918, ['the County of Tyrol (Austria)', 'the Emperor of Austria', 'colony', 'habsburg', FLORIN])],
  // Poland partitioned, then the interwar borders.
  krakow: [R(1815, 1846, ['the Free City of Kraków', 'the Senate', 'city', 'krakow']), R(1846, 1918, ['Galicia, a crown land of Austria', 'the Emperor of Austria', 'colony', 'habsburg'])],
  gdansk: [R(1800, 1871, ['the Kingdom of Prussia (Danzig)', 'the King of Prussia', 'colony', 'prussia']), R(1871, 1920, ['the German Empire (Danzig)', 'the Kaiser', 'colony', 'germanEmpire']),
    R(1920, 1939, ['the Free City of Danzig, under the League of Nations', 'the Senate', 'city', 'danzig']), R(1939, 1945, ['Nazi Germany (Danzig)', 'the Führer', 'colony', 'germanEmpire'])],
  zagan: [R(1800, 1871, ['the Kingdom of Prussia (Silesia)', 'the King of Prussia', 'colony', 'prussia']), R(1871, 1918, ['the German Empire (Silesia)', 'the Kaiser', 'colony', 'germanEmpire']),
    R(1918, 1933, ['the Weimar Republic (Silesia)', 'the President of Germany', 'colony', 'weimar']), R(1933, 1945, ['Nazi Germany (Silesia)', 'the Führer', 'colony', 'germanEmpire'])],
  lviv: [R(1800, 1918, ['Galicia, a crown land of Austria', 'the Emperor of Austria', 'colony', 'habsburg']), R(1919, 1939, ['the Second Polish Republic (Lwów)', 'the President of Poland', 'colony', 'pl'])],
  // South Africa before the Union of 1910.
  johannesburg: [R(spanOf(563)[0], 1902, SAFRICAN), R(1902, 1910, ['the Transvaal Colony', 'the Governor', 'colony', 'blueEnsign'])],
  pretoria: [R(spanOf(563)[0], 1902, SAFRICAN), R(1902, 1910, ['the Transvaal Colony', 'the Governor', 'colony', 'blueEnsign'])],
  cullinan: [R(spanOf(563)[0], 1902, SAFRICAN), R(1902, 1910, ['the Transvaal Colony', 'the Governor', 'colony', 'blueEnsign'])],
  bloemfontein: [R(spanOf(564)[0], 1902, OFS), R(1902, 1910, ['the Orange River Colony', 'the Governor', 'colony', 'blueEnsign'])],
  clarens: [R(spanOf(564)[0], 1902, OFS), R(1902, 1910, ['the Orange River Colony', 'the Governor', 'colony', 'blueEnsign'])],
  durban: [R(1843, 1910, NATAL)], ladysmith: [R(1843, 1910, NATAL)],
  eshowe: [R(1800, 1879, ['the Zulu Kingdom', 'the King of the Zulu', 'absolute', 'zulu']), R(1887, 1910, NATAL)],
  capetown: [R(1806, 1910, CAPE)], gqeberha: [R(1806, 1910, CAPE)], oudtshoorn: [R(1806, 1910, CAPE)], clanwilliam: [R(1806, 1910, CAPE)], graaffreinet: [R(1806, 1910, CAPE)],
  // Yemen, north and south; Vietnam, north and south.
  aden: [R(1839, 1967, ['the Colony of Aden (British)', 'the Governor', 'colony', 'blueEnsign']), R(spanOf(680)[0], until(680) + 1, ['the People\'s Democratic Republic of Yemen (South Yemen)', 'the General Secretary', 'eastbloc', 'southYemen', ['YDD', 'YD ', 'South Yemeni dinar', null, 0.345]])],
  mukalla: [R(1882, 1967, ['the Qu\'aiti Sultanate, a British protectorate', 'the Sultan', 'colony', 'quaiti']), R(spanOf(680)[0], until(680) + 1, ['the People\'s Democratic Republic of Yemen (South Yemen)', 'the General Secretary', 'eastbloc', 'southYemen', ['YDD', 'YD ', 'South Yemeni dinar', null, 0.345]])],
  hanoi: [R(spanOf(816)[0], 1976, ['the Democratic Republic of Vietnam (North Vietnam)', 'the Chairman', 'eastbloc', 'vn', ['VND', '₫', 'North Vietnamese đồng', null, 4]])], ninhbinh: [R(spanOf(816)[0], 1976, ['the Democratic Republic of Vietnam (North Vietnam)', 'the Chairman', 'eastbloc', 'vn', ['VND', '₫', 'North Vietnamese đồng', null, 4]])],
  hcmc: [R(spanOf(817)[0], until(817) + 1, ['the Republic of Vietnam (South Vietnam)', 'the President', 'authoritarian', 'southVietnam', ['VNS', '₫', 'South Vietnamese đồng', null, 90]])], danang: [R(spanOf(817)[0], until(817) + 1, ['the Republic of Vietnam (South Vietnam)', 'the President', 'authoritarian', 'southVietnam', ['VNS', '₫', 'South Vietnamese đồng', null, 90]])],
};
/** The state a city belonged to in a year, or null. */
export function regionStateAt(regionId, year) {
  return (REGION_STATES[regionId] ?? []).find((r) => year >= r.from && (r.to == null || year < r.to)) ?? null;
}

/* ---------------------------------------------------------------- people and wealth */

/** GDP per head (2011 dollars), population (thousands) and life expectancy, interpolated; nulls where unknown. */
export function demographyAt(cc, year) {
  const d = DEMOGRAPHY[cc];
  if (!d) return null;
  const ys = DEMOGRAPHY_YEARS;
  const y = Math.max(ys[0], Math.min(ys.at(-1), year));
  const i = Math.min(ys.length - 2, Math.floor((y - ys[0]) / 5));
  const t = (y - ys[i]) / 5;
  const mix = (arr) => (arr[i] == null ? arr[i + 1] : arr[i + 1] == null ? arr[i] : arr[i] + (arr[i + 1] - arr[i]) * t);
  // Before a series starts, carry its first value back; after it ends, its last.
  const firstOf = (arr) => arr.find((v) => v != null) ?? null;
  const at = (arr) => mix(arr) ?? (year < 1900 ? firstOf(arr) : [...arr].reverse().find((v) => v != null) ?? null);
  return { gdp: at(d.gdp), pop: at(d.pop), life: at(d.life) };
}
/** Life expectancy at birth today, for comparison (the series' last value). */
const lifeNow = (cc) => [...(DEMOGRAPHY[cc]?.life ?? [])].reverse().find((v) => v != null) ?? 78;

/**
 * How much likelier an adult was to die in a given year than today, from life expectancy then and
 * now: roughly (now / then)², capped at 3 (most of the gap was children's deaths, not adults').
 */
export function eraMortality(cc, year, age) {
  if (age < 15) return 1;
  const then = demographyAt(cc, year)?.life;
  if (!then) return 1;
  return Math.max(1, Math.min(3, (lifeNow(cc) / then) ** 2));
}

/* ---------------------------------------------------------------- names */

/** The year being played, for the name pools (world/Eras.js setEraYear keeps it). */
let DATA_YEAR = 9999;
export const setDataYear = (y) => { DATA_YEAR = y; };
export const dataYear = () => DATA_YEAR;

/** The popular US first names of someone's birth decade (1880s–2010s), or null. */
export function eraFirstNames(birthYear, gender) {
  const dec = Math.max(1880, Math.min(2010, Math.floor(birthYear / 10) * 10));
  const row = US_NAMES_BY_DECADE[String(dec)];
  return row ? row[gender === 'female' ? 'female' : 'male'] : null;
}

/* ---------------------------------------------------------------- money */

/** The money of the day for a country's modern currency: { code, symbol, name, perUsd } or the modern one. */
export function periodCurrency(cc, year, currency) {
  const row = (CURRENCY_HISTORY[cc] ?? []).find(([u]) => year < u);
  if (!row || !currency) return currency;
  const [, code, symbol, name, perModern, fx] = row;
  return { code, symbol, name, perUsd: perModern == null ? null : currency.perUsd * perModern, fx: fx ?? null, perModern };
}

/* ---------------------------------------------------------------- wars */

/** Wars the history engine already tells in its own words (world/History.js). */
const SCRIPTED = /World War|Crimean|Mexican-American|Franco-Prussian|Spanish-American|Russo-Japanese|^Korean|Vietnam War|Vietnamese|Spanish Civil|Taiping|Boxer|Invasion of Afghanistan|Opium|Union vs|Confederacy|American Civil|Boer|Indian Mutiny|Sepoy|Napoleon/i;
const ours = (w, cc) => w.a.includes(cc) || w.b.includes(cc);
/** Correlates of War wars starting in a year that a country fought (and history doesn't script). */
export const warsStarting = (year) => WARS.filter((w) => w.from === year && !SCRIPTED.test(w.name));
export const warsEnding = (year) => WARS.filter((w) => w.to === year && !SCRIPTED.test(w.name));
export const warFought = ours;
/** How hard a war hit a country: its battle deaths, as the game's intensity (1–4). */
export function warIntensity(w, cc) {
  const d = w.deaths?.[cc] ?? 0;
  return d >= 100000 ? 4 : d >= 20000 ? 3 : d >= 3000 ? 2 : 1;
}
