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
import { independentSince, dynamicRegionState, dissolvedInto, breakupSovereign, regionHistoryYear } from './NewStates.js';
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
  // A spell of personal rule between two monarchic periods is still a crown (Afghanistan's emirs
  // fighting over the throne, 1823–80): no republic was ever proclaimed.
  const i = rows.indexOf(row);
  const crowned = (r) => Boolean(r?.[3]) || MONARCHIC.includes(r?.[1]);
  const interregnum = cat === 'pers' && i > 0 && crowned(rows[i - 1]) && rows.slice(i + 1).some(crowned);
  return { cat, democracy: Boolean(democracy), monarchy: Boolean(monarchy) || MONARCHIC.includes(cat) || interregnum };
}
/** Was the country an independent state in that year (Gleditsch & Ward; from 1816)? */
export function sovereignIn(cc, year) {
  const since = independentSince(cc);
  if (since != null && year >= since) return true;
  if (dissolvedInto(cc, year)) return false;
  const held = breakupSovereign(cc, year);
  if (held !== undefined) return held;
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
const MEX_TEXAS = ['Coahuila y Tejas, a state of Mexico', 'the Governor of Coahuila y Tejas', 'colony', 'mx'];
const TEXAS = ['the Republic of Texas', 'the President of Texas', 'republic', 'texas', ['TXD', '$', 'Texas dollar ("redback")', null, 1.5]];
const ZANZIBAR = ['the Sultanate of Zanzibar', 'the Sultan of Zanzibar', 'absolute', 'zanzibar', ['ZAR', 'Rs ', 'Zanzibari rupee', null, 3.0]];
const BIAFRA = ['the Republic of Biafra (seceded from Nigeria; at war)', 'Colonel Ojukwu, Head of State', 'authoritarian', 'biafra', ['BIP', '£', 'Biafran pound', null, 0.36]];
const SOMALILAND = ['the Republic of Somaliland (independent in fact since 1991, unrecognised)', 'the President of Somaliland', 'city', 'somaliland', ['SLS', 'Sl. Sh. ', 'Somaliland shilling', null, 8000]];
const RYUKYU = ['the Ryukyu Kingdom (tributary to China and to Satsuma)', 'the King of Ryukyu', 'absolute', null];
const USCAR = ['the Ryukyu Islands under United States administration (USCAR)', 'the High Commissioner of the Ryukyu Islands', 'colony', 'us', ['USD', '$', 'US dollar (the B-yen until 1958)', null, 1.0]];
const SIKKIM = ['the Kingdom of Sikkim', 'the Chogyal', 'absolute', 'sikkim'];
const SARDINIA = ['the Kingdom of Sardinia (Piedmont)', 'the King of Sardinia', 'monarchy', 'sardinia', ['ITL', 'L. ', 'Piedmontese lira', null, 5.0]];
const NORTH_CYPRUS = ['the Turkish Republic of Northern Cyprus (recognised only by Turkey)', 'the President of the TRNC', 'city', 'northCyprus', ['TRY', '₺', 'Turkish lira', null, 3]];
const CRIMEA = ['Russian-annexed Crimea (unrecognised)', 'the Russian-installed head of Crimea', 'authoritarian', 'ru', ['RUB', '₽', 'Russian ruble', null, 30]];
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
  // China's treaty ports and leased territories: a city's own masters inside the Qing Empire and the Republic.
  shanghai: [R(1854, 1941, ['the Shanghai International Settlement, run by the Shanghai Municipal Council (the French Concession beside it)', 'the Shanghai Municipal Council', 'city', null]),
    R(1941, 1945, ['Japanese-occupied Shanghai', 'the Japanese army', 'colony', null])],
  qingdao: [R(1898, 1914, ['Kiautschou Bay, a German leased territory (Tsingtao)', 'the German Governor', 'colony', 'germanEmpire']), R(1914, 1922, ['Japanese-occupied Tsingtao', 'the Japanese Governor', 'colony', null]),
    R(1938, 1945, ['Japanese-occupied Tsingtao', 'the Japanese army', 'colony', null])],
  weihai: [R(1898, 1930, ['Weihaiwei, a British leased territory', 'the Commissioner', 'colony', 'blueEnsign'])],
  dalian: [R(1898, 1905, ['the Kwantung Leased Territory (Russian Dalny and Port Arthur)', 'the Russian Governor', 'colony', null]), R(1905, 1945, ['the Kwantung Leased Territory (Japanese Dairen)', 'the Governor-General of Kwantung', 'colony', null]),
    R(1945, 1955, ['Dalian under Soviet military administration', 'the Soviet commandant', 'colony', null])],
  zhanjiang: [R(1898, 1945, ['Kouang-Tchéou-Wan, a French leased territory', 'the French Administrator', 'colony', null])],
  // International cities: Tangier, Memel, Fiume (Danzig is above).
  tangier: [R(1925, 1940, ['the Tangier International Zone, run by the powers', 'the Committee of Control', 'city', null]), R(1940, 1945, ['Spanish-occupied Tangier', 'the Spanish administrator', 'colony', null]),
    R(1945, 1956, ['the Tangier International Zone, run by the powers', 'the Committee of Control', 'city', null])],
  klaipeda: [R(1800, 1871, ['the Kingdom of Prussia (Memel)', 'the King of Prussia', 'colony', 'prussia']), R(1871, 1920, ['the German Empire (Memel)', 'the Kaiser', 'colony', 'germanEmpire']),
    R(1920, 1923, ['the Memel Territory, under a French administrator for the Allies', 'the French Prefect', 'colony', null]), R(1923, 1939, ['the Klaipėda Region, autonomous within Lithuania', 'the Directorate', 'city', null]),
    R(1939, 1945, ['Nazi Germany (Memel)', 'the Führer', 'colony', 'germanEmpire'])],
  rijeka: [R(1800, 1918, ['Fiume, a corpus separatum of the Kingdom of Hungary', 'the Governor of Fiume', 'colony', 'habsburg']), R(1919, 1920, ['the Italian Regency of Carnaro, D\'Annunzio\'s', 'the Comandante (Gabriele D\'Annunzio)', 'authoritarian', null]),
    R(1920, 1924, ['the Free State of Fiume', 'the President of the Free State', 'city', null]), R(1924, 1945, ['the Kingdom of Italy (Fiume)', 'the Duce', 'colony', null])],
  // Zones under other masters: the Canal Zone, Trieste, the Saar (Åland is its own: packs/sketches/Remote.js).
  balboa: [R(1904, 1979, ['the Panama Canal Zone, an American territory', 'the Governor of the Canal Zone', 'colony', null]), R(1979, 2000, ['the former Canal Zone, under joint US–Panamanian administration of the Canal', 'the Panama Canal Commission', 'city', null])],
  trieste: [R(1800, 1918, ['the Austrian Littoral (Trieste, the Habsburgs\' port)', 'the Emperor of Austria', 'colony', 'habsburg', FLORIN]), R(1945, 1947, ['Trieste under Allied military government', 'the Allied Military Government', 'colony', null]),
    R(1947, 1954, ['the Free Territory of Trieste (Zone A, under Allied military government)', 'the Allied Military Government', 'city', null])],
  saarbruecken: [R(1815, 1871, PRUSSIA), R(1920, 1935, ['the Saar Territory, governed by the League of Nations', 'the League\'s Governing Commission', 'city', null]),
    R(1947, 1957, ['the Saar Protectorate, under France', 'the French High Commissioner', 'colony', null])],
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
  // ---- More states that no longer exist, and some that exist only in fact ----
  // North America: the Dominion of Newfoundland, the Republic of Texas, the Kingdom of Hawaii, Mexican California.
  ca_stjohns: [R(1800, 1855, ['the Colony of Newfoundland (governed from London)', 'the Governor', 'colony', 'blueEnsign', ['NFD', '$', 'Newfoundland dollar', null, 1.0]]),
    R(1855, 1907, ['the Colony of Newfoundland (responsible government)', 'the Premier', 'colony', 'blueEnsign', ['NFD', '$', 'Newfoundland dollar', null, 1.0]]),
    R(1907, 1934, ['the Dominion of Newfoundland', 'the Prime Minister of Newfoundland', 'city', 'newfoundland', ['NFD', '$', 'Newfoundland dollar', null, 1.0]]),
    R(1934, 1949, ['the Dominion of Newfoundland, under the Commission of Government (its parliament suspended)', 'the Governor and Commission', 'colony', 'newfoundland', ['NFD', '$', 'Newfoundland dollar', null, 1.0]])],
  houston: [R(1821, 1836, MEX_TEXAS), R(1836, 1846, TEXAS)], dallas: [R(1821, 1836, MEX_TEXAS), R(1836, 1846, TEXAS)], sanantonio: [R(1800, 1821, ['Spanish Texas (New Spain)', 'the Viceroy of New Spain', 'colony', 'spainOld']), R(1821, 1836, MEX_TEXAS), R(1836, 1846, TEXAS)],
  sunbelt: [R(1836, 1846, TEXAS)],
  honolulu: [R(1810, 1893, ['the Kingdom of Hawaii', 'the King of Hawaii', 'monarchy', 'hawaii', ['HAD', '$', 'Hawaiian dollar', null, 1.0]]), R(1893, 1898, ['the Republic of Hawaii (the planters\' republic, after the Queen was deposed)', 'the President (Sanford Dole)', 'city', 'hawaii']),
    R(1898, 1959, ['the Territory of Hawaii, an American territory', 'the Governor', 'colony', null])],
  losangeles: [R(1800, 1821, ['Spanish Alta California (New Spain)', 'the Viceroy of New Spain', 'colony', 'spainOld']), R(1821, 1848, ['Alta California, a territory of Mexico', 'the Governor of Alta California', 'colony', 'mx'])],
  sf: [R(1800, 1821, ['Spanish Alta California (the Presidio of San Francisco)', 'the Viceroy of New Spain', 'colony', 'spainOld']), R(1821, 1846, ['Alta California, a territory of Mexico', 'the Governor of Alta California', 'colony', 'mx'])],
  merida: [R(1841, 1848, ['the Republic of Yucatán', 'the Governor of Yucatán', 'city', 'yucatan'])],
  // Africa: Zanzibar, Biafra, Katanga, Somaliland.
  zanzibar: [R(1856, 1890, ZANZIBAR), R(1890, 1963, ['the Sultanate of Zanzibar, a British protectorate', 'the Sultan (and the British Resident)', 'colony', 'zanzibar', ['ZAR', 'Rs ', 'Zanzibari rupee', null, 3.0]]),
    R(1963, 1964, ZANZIBAR), R(1964, 1965, ['the People\'s Republic of Zanzibar (after the revolution)', 'the Revolutionary Council', 'authoritarian', null])],
  enugu: [R(1967, 1970, BIAFRA)], nsukka: [R(1967, 1970, BIAFRA)],
  lubumbashi: [R(1960, 1963, ['the State of Katanga (seceded from the Congo, backed by Belgian mining money)', 'President Moïse Tshombe', 'authoritarian', 'katanga'])],
  hargeisa: [R(1884, 1960, ['British Somaliland', 'the Governor', 'colony', 'blueEnsign']), R(1991, null, SOMALILAND)], berbera: [R(1884, 1960, ['British Somaliland', 'the Governor', 'colony', 'blueEnsign']), R(1991, null, SOMALILAND)],
  // Asia: Tibet, Manchukuo, the princely states, the Ryukyu Kingdom, US-ruled Okinawa.
  lhasa: [R(1800, 1913, ['Tibet under the Qing (the Ganden Phodrang, with the Amban)', 'the Dalai Lama (and the Qing Amban)', 'absolute', 'tibet']), R(1913, 1951, ['Tibet (independent in fact: the Ganden Phodrang)', 'the Dalai Lama', 'absolute', 'tibet', ['TBS', 'srang ', 'Tibetan srang', null, 2.0]])],
  changchun: [R(1932, 1945, ['Manchukuo (Japan\'s puppet empire; Changchun is Hsinking, its capital)', 'the Emperor Puyi (and the Kwantung Army)', 'authoritarian', 'manchukuo', ['MKY', '¥', 'Manchukuo yuan', null, 3.5]])],
  hyderabad: [R(1800, 1947, ['the State of Hyderabad, a princely state under British paramountcy', 'the Nizam', 'absolute', 'hyderabad', ['HYR', 'Rs ', 'Hyderabadi rupee', null, 1.0]]), R(1947, 1948, ['the State of Hyderabad (refusing to join India)', 'the Nizam', 'absolute', 'hyderabad'])],
  mysuru: [R(1800, 1947, ['the Kingdom of Mysore, a princely state under British paramountcy', 'the Maharaja of Mysore', 'absolute', null])],
  srinagar: [R(1846, 1947, ['the princely state of Jammu and Kashmir', 'the Maharaja (the Dogra dynasty)', 'absolute', null])],
  gangtok: [R(1800, 1890, SIKKIM), R(1890, 1950, ['the Kingdom of Sikkim, a British protectorate', 'the Chogyal (and the Political Officer)', 'absolute', 'sikkim']), R(1950, 1975, ['the Kingdom of Sikkim, an Indian protectorate', 'the Chogyal', 'absolute', 'sikkim'])],
  okinawa: [R(1800, 1879, RYUKYU), R(1945, 1972, USCAR)],
  ishigaki: [R(1800, 1879, RYUKYU), R(1945, 1972, USCAR)],
  // Europe: the Italian states before 1861, Hanover, Schleswig-Holstein, Crete.
  turin: [R(1800, 1814, ['Piedmont, annexed to Napoleonic France', 'the French Prefect', 'colony', 'fr']), R(1814, 1861, SARDINIA)],
  florence: [R(1800, 1859, ['the Grand Duchy of Tuscany', 'the Grand Duke of Tuscany', 'monarchy', 'tuscany', ['ITF', 'L. ', 'Tuscan lira', null, 1.0]]), R(1859, 1860, ['Tuscany under a provisional government (voting to join Piedmont)', 'Baron Ricasoli', 'city', null])],
  parma: [R(1814, 1859, ['the Duchy of Parma (Marie Louise, Napoleon\'s widow, then the Bourbons)', 'the Duke of Parma', 'monarchy', null])],
  modena: [R(1814, 1859, ['the Duchy of Modena and Reggio (the Habsburg-Este dukes)', 'the Duke of Modena', 'absolute', null])],
  hanover: [R(1814, 1866, ['the Kingdom of Hanover (in personal union with Britain until 1837)', 'the King of Hanover', 'monarchy', 'hanover', THALER]), R(1866, 1871, PRUSSIA)],
  kiel: [R(1800, 1864, ['the Duchy of Holstein, under the Danish king', 'the King of Denmark, as Duke', 'colony', 'dk']), R(1864, 1866, ['Holstein under Austrian administration', 'the Austrian governor', 'colony', 'habsburg']), R(1866, 1871, PRUSSIA)],
  heraklion: [R(1800, 1898, ['Ottoman Crete', 'the Ottoman Pasha', 'colony', 'tr']), R(1898, 1913, ['the Cretan State (autonomous under the Sultan, guarded by the Powers)', 'the High Commissioner (Prince George of Greece)', 'city', 'crete'])],
  // States that exist only in fact: Transnistria, Abkhazia, Northern Cyprus, Artsakh; Russian rule in Crimea and Donetsk.
  tiraspol: [R(1990, null, ['the Pridnestrovian Moldavian Republic (Transnistria): unrecognised, guarded by Russian troops', 'the President of Pridnestrovie', 'authoritarian', 'transnistria', ['PRB', 'руб ', 'Transnistrian ruble', null, 8.0]])],
  sukhumi: [R(1993, null, ['the Republic of Abkhazia (recognised by Russia and a handful of others)', 'the President of Abkhazia', 'authoritarian', 'abkhazia', ['RUB', '₽', 'Russian ruble', null, 30]])],
  kyrenia: [R(1974, 1983, ['the Turkish Federated State of Cyprus (north of the Green Line)', 'Rauf Denktaş', 'city', 'northCyprus', ['TRY', '₺', 'Turkish lira', null, 3]]), R(1983, null, NORTH_CYPRUS)],
  famagusta: [R(1974, 1983, ['the Turkish Federated State of Cyprus (north of the Green Line)', 'Rauf Denktaş', 'city', 'northCyprus', ['TRY', '₺', 'Turkish lira', null, 3]]), R(1983, null, NORTH_CYPRUS)],
  stepanakert: [R(1991, 2023, ['the Republic of Artsakh (Nagorno-Karabakh): Armenian, unrecognised', 'the President of Artsakh', 'authoritarian', 'artsakh', ['AMD', '֏', 'Armenian dram', null, 200]])],
  donetsk: [R(2014, 2022, ['the "Donetsk People\'s Republic" (Russian-backed, unrecognised)', 'the head of the DPR', 'authoritarian', 'dpr', ['RUB', '₽', 'Russian ruble', null, 30]]), R(2022, null, ['Russian-occupied Donetsk (annexed by Russia, unrecognised)', 'the Russian-installed head', 'authoritarian', 'ru', ['RUB', '₽', 'Russian ruble', null, 30]])],
  simferopol: [R(2014, null, CRIMEA)], sevastopol: [R(2014, null, CRIMEA)],
};
/** The state a city belonged to in a year, or null. */
/** The East German cities, whose GDR years follow this world's fall of the Wall (History.js sovietCollapse). */
export const GDR_CITIES = () => Object.keys(REGION_STATES).filter((id) => REGION_STATES[id].some((r) => r.name === GDR[0]));
export function regionStateAt(regionId, year) {
  const redrawn = dynamicRegionState(regionId, year);
  if (redrawn !== undefined) return redrawn;
  year = regionHistoryYear(regionId, year);
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
  // (Before, not 1900: a series that starts in 1950 carries 1950's value back to 1900, not 2016's.)
  const at = (arr) => mix(arr) ?? (year < ys[Math.max(0, arr.findIndex((v) => v != null))] ? firstOf(arr) : [...arr].reverse().find((v) => v != null) ?? null);
  return { gdp: at(d.gdp), pop: at(d.pop), life: at(d.life) };
}
/** Life expectancy at birth today, for comparison (the series' last value). */
const lifeNow = (cc) => [...(DEMOGRAPHY[cc]?.life ?? [])].reverse().find((v) => v != null) ?? 78;

/**
 * How much likelier an adult was to die in a given year than today, from life expectancy then and
 * now: roughly (now / then)^2.5, capped at 6. Much of the gap in life expectancy was children's
 * deaths, but adults died far younger too: in 1860 a forty-year-old American was about six times
 * likelier to die within the year than today, a seventy-year-old about three times
 * (US and English life tables). Calibrated so a life that reaches twenty in 1850 lives to
 * about 62 on average, in 1900 to about 68, in 1950 to about 75 (tests/erabalance.js).
 */
/**
 * How far a country's adult death rates sit from America's today, by the gap in lifespans:
 * Japan's a little lower, Nigeria's and India's well above. Applies in every year.
 */
export function presentGap(cc) {
  return Math.max(0.7, Math.min(3.5, (lifeNow('US') / lifeNow(cc)) ** 2.5));
}
export function eraMortality(cc, year, age) {
  if (age < 15) return 1;
  const then = demographyAt(cc, year)?.life;
  const own = then ? (lifeNow(cc) / then) ** 2.5 : 1;
  return Math.max(1, Math.min(6, own * Math.max(1, presentGap(cc))));
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
/** A recorded war by its id (the game's war ids are `cow.<id>`). */
const WAR_BY_ID = new Map(WARS.map((w) => [w.id, w]));
export const recordedWar = (id) => WAR_BY_ID.get(Number(id)) ?? null;
export const warFought = ours;
/** How hard a war hit a country: its battle deaths, as the game's intensity (1–4). */
export function warIntensity(w, cc) {
  const d = w.deaths?.[cc] ?? 0;
  return d >= 100000 ? 4 : d >= 20000 ? 3 : d >= 3000 ? 2 : 1;
}
