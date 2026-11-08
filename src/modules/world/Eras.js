/**
 * Eras: what the year you live in allows. A life can start in 1910, 1930, 1950, 1970, 1990
 * or today. The year decides which jobs exist (no programmers in 1930, no paramedics before
 * the 1970s), which are still closed to women, which technology you have, how each country
 * is governed (the Tsar, the Soviet Union, Franco, the Shah, apartheid), and who rules the
 * colonies (British India, French Algeria, the Dutch East Indies).
 *
 * History plays out loosely (world/History.js): the events are real, the timing drifts, and
 * some can go differently. The period rules here follow what has happened in this world:
 * the Soviet layer lasts until the Soviet Union falls, whenever that turns out to be.
 *
 * Money stays in today's dollars in every era.
 *
 * state.era = { start, events: { [id]: { year, ended?, outcome? } }, colonies: { [cc]: { done: [stage…], since, pressure, joined, loyal } } }
 */
import { currentYear } from '../../core/State.js';
import { skinToneOf } from '../people/SkinTone.js';

export const PRESENT = 2026;
/** The eras the start screen offers; each spans [from, to] and a life can start in any year of one. */
export const START_ERAS = [
  { id: 'today', label: 'Today', sub: 'The world as it is', from: PRESENT, to: PRESENT },
  { id: 'modern', label: 'The End of the Century', sub: 'The Cold War ends, the internet arrives, the war on terror', from: 1980, to: PRESENT - 1 },
  { id: 'postwar', label: 'The Post-War World', sub: 'Empires break up, the Cold War, Vietnam, the oil shock', from: 1946, to: 1979 },
  { id: 'worldWars', label: 'The World Wars', sub: 'The Great War, the Depression, the dictators, another war', from: 1914, to: 1945 },
  { id: 'empire', label: 'The Age of Empire', sub: 'Steam, telegraphs, the scramble for Africa, the Tsar', from: 1871, to: 1913 },
  { id: 'revolutions', label: 'The Age of Revolutions', sub: 'Railways, 1848, slavery and its end, unification', from: 1815, to: 1870 },
  { id: 'napoleonic', label: 'The Napoleonic Era', sub: 'Napoleon, sailing ships, empires in the Americas', from: 1800, to: 1814 },
];
export const eraById = (id) => START_ERAS.find((e) => e.id === id) ?? null;
export const EARLIEST = 1800;
/** Any year from 1800 to today (anything else: today). 'random' is resolved by State with the life's dice. */
export const validStartYear = (y) => { const n = Math.round(Number(y)); return Number.isFinite(n) && n >= EARLIEST && n <= PRESENT ? n : PRESENT; };

export const yearNow = (state) => (state?.character?.birthYear != null ? currentYear(state) : PRESENT);
const hap = (s, id) => Boolean(s.era?.events?.[id]);
const over = (s, id) => s.era?.events?.[id]?.ended != null;

/* ------------------------------------------------------------------ */
/* Technology                                                          */
/* ------------------------------------------------------------------ */

export const TECH = {
  railway: 1830, photography: 1840, telegraph: 1845, telephone: 1880, electricLight: 1900, automobile: 1905,
  radio: 1922, tv: 1950, creditCards: 1960, personalComputer: 1980, mobilePhone: 1990,
  internet: 1995, onlineDating: 1997, drones: 2001, vaping: 2010, socialMedia: 2006, streaming: 2007, smartphone: 2008, crypto: 2010, gigApps: 2012,
};
export const hasTech = (state, id) => !(TECH[id] > yearNow(state));

/** Words that give an event away as modern, by the technology they need (latest first). */
const TECH_WORDS = [
  ['crypto', /\bcrypto|bitcoin|\bNFTs?\b|blockchain/i],
  ['gigApps', /rideshare|\bUber\b|\bLyft\b|DoorDash|gig app|delivery app|Airbnb/i],
  ['smartphone', /smartphone|\bapps?\b|app store|selfie|\bswip|Tinder|Instagram|TikTok|WhatsApp|FaceTime|group chat|Zoom call|influencer|viral|hashtag|doomscroll/i],
  ['vaping', /\bvap(?:e|es|ed|ing)\b|e-cig/i],
  ['drones', /\bdrones?\b|\bUAVs?\b|Reaper|Predator strike/i],
  ['streaming', /Netflix|streaming|binge-watch|Spotify|podcast/i],
  ['socialMedia', /social media|Facebook|Twitter|YouTube|followers online|went viral|\bposted (?:it|a|about|online)/i],
  ['internet', /internet|\bonline\b|website|\be-?mails?\b|Google|Wi-?Fi|\bweb\b|download|\bblog|\bforums?\b|emoji|\bGPS\b|Amazon (?:order|package|delivery)|webcam|\bDMs?\b|\bDM'd/i],
  ['mobilePhone', /cell ?phone|mobile phone|\btext(?:ed|ing|s)? (?:you|me|him|her|them|back)|text message|voicemail|ringtone|on (?:your|her|his|their) phone|phone screen|\bphones? buzz/i],
  ['personalComputer', /laptop|\bPC\b|spreadsheet|video ?games?|PlayStation|Xbox|Nintendo|gaming|printer/i],
  ['creditCards', /credit card/i],
  ['tv', /\bTV\b|television|sitcom|reality show/i],
  ['automobile', /\b(?:cars?|car park|parking|driveway|trucks?|motorway|highway|garage|petrol|gas station|traffic)\b/i],
  ['electricLight', /\blight switch|electric(?:ity)?\b|power cut|fridge|refrigerator|washing machine/i],
  ['telephone', /\bphoned?\b|telephone|rang (?:you|her|him|them)|on the phone/i],
];
/** The newest technology a piece of content needs, or null (cached on the object). */
export function techNeeded(content) {
  if (content == null) return null;
  if (typeof content === 'object' && '_tech' in content) return content._tech;
  const text = typeof content === 'string' ? content : JSON.stringify(content, (k, v) => (k === '_tech' ? undefined : v));
  const hit = TECH_WORDS.filter(([, re]) => re.test(text)).sort((a, b) => TECH[b[0]] - TECH[a[0]])[0]?.[0] ?? null;
  if (typeof content === 'object') Object.defineProperty(content, '_tech', { value: hit, enumerable: false, writable: true });
  return hit;
}
/** Can this content happen in this year? (Today, everything can.) */
export const fitsEra = (state, content) => yearNow(state) >= PRESENT || !techNeeded(content) || hasTech(state, techNeeded(content));

/* ------------------------------------------------------------------ */
/* Jobs: when they exist, and when women could do them                 */
/* ------------------------------------------------------------------ */

/** Roughly when each line of work opens up (the US dates, loosely; elsewhere similar). */
export const PROFESSION_FROM = {
  police: 1830, statePolice: 1905, fire: 1853, trucking: 1910, automotive: 1900, trades: 1882, electricalEng: 1882, nursing: 1860,
  railroad: 1830, transit: 1860, transitMaintenance: 1860, socialWork: 1900, accounting: 1850, journalism: 1800, pharmacy: 1820,
  mechanicalEng: 1850, chemicalEng: 1880, structuralEng: 1880, plumbing: 1870, insurance: 1850, realestate: 1850, sheriff: 1800, library: 1850,
  tech: 1955, cybersecurity: 1990, dataScience: 2010, contentCreator: 2006, gameDevelopment: 1975, design: 1930,
  renewableEnergy: 1980, physicianAssistant: 1967, respiratoryTherapy: 1950, imaging: 1920, dentalHygiene: 1915,
  occupationalTherapy: 1920, speechPathology: 1925, airTrafficControl: 1930, ems: 1970, privateEms: 1960, paratransit: 1975,
  dispatch: 1968, tsa: 2002, travelNursing: 1980, emergencyManagement: 1979, atf: 1972, dea: 1973, fbi: 1908,
  nato: 1949, unSecretariat: 1945, unAgencies: 1945, euInstitutions: 1958, intlFinance: 1945, intlJustice: 1946, maltaRelief: 1953,
  caseOfficer: 1947, sigint: 1952, intelligence: 1947, nuclearEng: 1945, aerospaceEng: 1940, petroleumEng: 1915,
  flightAttendant: 1930, aviation: 1920, charterAviation: 1925, communityCollege: 1920, nationalLab: 1943, environmental: 1970,
  oig: 1978, privateMilitary: 1990, benefitsClaims: 1935, counseling: 1960, psychology: 1920, regulatory: 1915,
  airportPolice: 1950, airportFire: 1950, cruise: 1970, privatePrisons: 1983, cps: 1974, publicDefender: 1914,
  gurkhaContingent: 1949, forensics: 1925, hvac: 1930, schoolBus: 1920, parkService: 1916, foreignService: 1924,
  humanResources: 1920, marketing: 1920, fitness: 1960, cosmetology: 1910, dietitian: 1920, optometry: 1910,
  physicalTherapy: 1920, actuary: 1900, lineworker: 1900, meteorology: 1900, interpreter: 1900, interpretation: 1900,
  moc: 1950, privateSecurity: 1910, bailBonds: 1910, propertyManagement: 1920, insurance: 1900, gig: 2012,
};
/** Work closed to women until about this year (loosely: the first women in, then the doors opening). */
export const MEN_ONLY_UNTIL = {
  fire: 1975, airportFire: 1975, stateFire: 1975, privateFire: 1975, police: 1968, statePolice: 1972, sheriff: 1970,
  transitPolice: 1970, borderPatrol: 1975, fbi: 1972, usss: 1971, usms: 1975, atf: 1975, dea: 1975, aviation: 1973,
  charterAviation: 1973, merchantMarine: 1974, oilGas: 1975, ironworking: 1975, craneOperator: 1975, carpentry: 1975,
  plumbing: 1975, trades: 1975, welding: 1975, lineworker: 1975, hvac: 1975, railroad: 1970, trucking: 1970, finance: 1970,
  engineering: 1955, mechanicalEng: 1955, electricalEng: 1955, chemicalEng: 1955, aerospaceEng: 1960, petroleumEng: 1970,
  nuclearEng: 1965, structuralEng: 1960, law: 1920, anglicanClergy: 1994, clergy: 1956, airTrafficControl: 1960,
  athletics: 1972, privateMilitary: 2000, caseOfficer: 1960, foreignService: 1925, swissGuard: 9999, vaticanGendarmerie: 9999,
};
/** Skilled work reserved for white South Africans under apartheid's job reservation. */
const APARTHEID_RESERVED = ['trades', 'plumbing', 'welding', 'carpentry', 'ironworking', 'craneOperator', 'lineworker', 'railroad', 'aviation', 'airTrafficControl', 'manufacturing', 'mechanicalEng', 'electricalEng'];

/** More rules, registered by world/History.js (segregation needs your US state, which this leaf can't import). */
const EXTRA_WORK = [];
export const addEraWorkRule = (fn) => { EXTRA_WORK.push(fn); };

/** Why this work isn't open to you in this year, or null. */
export function eraWorkBlock(state, profession) {
  const y = yearNow(state);
  const fb = futureWorkBlock(state, profession);
  if (fb) return fb;
  if (profession?.untilYear && y >= profession.untilYear) return 'This work has all but disappeared';
  if (y >= PRESENT) return null;
  const id = profession?.id;
  const from = PROFESSION_FROM[id] ?? profession?.fromYear;
  if (from && y < from) return `Doesn't exist yet (from about ${from})`;
  if (profession?.untilYear && y >= profession.untilYear) return 'This work has all but disappeared';
  const menUntil = MEN_ONLY_UNTIL[id] ?? MEN_ONLY_UNTIL[profession?.template];
  if (menUntil && y < menUntil && state.character.gender === 'female') return menUntil > PRESENT ? 'Closed to women' : `Closed to women (until about ${menUntil})`;
  if (apartheidHere(state) && skinToneOf(state) >= 3 && APARTHEID_RESERVED.includes(id)) return 'Reserved for white workers under apartheid';
  for (const rule of EXTRA_WORK) { const r = rule(state, profession); if (r) return r; }
  return null;
}
export const apartheidHere = (state) => (state.character.countryId === 'ZA') && hap(state, 'apartheid') && !hap(state, 'apartheidEnds');

/* ------------------------------------------------------------------ */
/* How countries were governed                                         */
/* ------------------------------------------------------------------ */

/** A full regime (era layers replace today's regime rather than adjusting it). */
const G = (o) => ({ kind: 'democracy', elections: 'free', press: 'free', exit: 'free', business: 'free', religion: 'free', internet: 'none', surveillance: 0.03, women: 'equal', alcohol: true, banking: 'open', jobs: 'market', ratings: true, ...o });
const SOVIET = G({ kind: 'totalitarian', name: 'the Soviet Union, a one-party communist state', elections: 'sham', press: 'state', exit: 'closed', business: 'state', religion: 'restricted', surveillance: 0.3, banking: 'state', jobs: 'assigned', ratings: false, party: true, leader: 'the General Secretary' });
const EAST_BLOC = G({ kind: 'oneParty', name: 'a communist state in the Soviet bloc', elections: 'sham', press: 'state', exit: 'closed', business: 'state', religion: 'restricted', surveillance: 0.22, banking: 'state', jobs: 'assigned', ratings: false, party: true, leader: 'the First Secretary' });
const DICTATOR = (name, leader, o = {}) => G({ kind: 'dictatorship', name, elections: 'none', press: 'state', surveillance: 0.15, leader, ...o });
const MONARCH = (name, leader, o = {}) => G({ kind: 'absoluteMonarchy', name, elections: 'none', press: 'state', surveillance: 0.1, leader, ...o });

/** Periods of rule, each active while its condition holds in this world's history. */
export const PERIODS = [
  // ---- The nineteenth century ----
  { cc: ['FR'], regime: DICTATOR('the Consulate of Napoleon Bonaparte', 'the First Consul'), active: (s) => yearNow(s) < 1804 },
  { cc: ['FR'], regime: MONARCH('the Empire of the French, under Napoleon', 'the Emperor'), active: (s) => yearNow(s) >= 1804 && !hap(s, 'napoleonFalls') },
  { cc: ['FR'], regime: G({ kind: 'monarchy', name: 'the restored kingdom of France', elections: 'controlled', press: 'state', leader: 'the King' }), active: (s) => hap(s, 'napoleonFalls') && !hap(s, 'revolutions1848') },
  { cc: ['FR'], regime: MONARCH('the Second Empire, under Napoleon III', 'the Emperor', { elections: 'controlled' }), active: (s) => hap(s, 'secondEmpire') && !hap(s, 'francoPrussianWar') },
  { cc: ['DE'], regime: G({ kind: 'monarchy', name: 'the German Confederation, led by Prussia and Austria', elections: 'none', press: 'state', leader: 'the King of Prussia' }), active: (s) => !hap(s, 'germanUnification') },
  { cc: ['IT'], regime: G({ kind: 'monarchy', name: 'the Italian states (Austria in the north, the Pope in Rome, Bourbons in Naples)', elections: 'none', press: 'state', leader: 'your prince' }), active: (s) => !hap(s, 'italianUnification') },
  { cc: ['JP'], regime: G({ kind: 'militarist', name: 'the Tokugawa shogunate', elections: 'none', press: 'state', exit: 'closed', surveillance: 0.15, leader: 'the Shōgun' }), active: (s) => !hap(s, 'meiji') },
  { cc: ['JP'], regime: MONARCH('the Empire of Japan, modernising under the Emperor Meiji', 'the Emperor'), active: (s) => hap(s, 'meiji') && yearNow(s) < 1890 },
  { cc: ['TR'], regime: MONARCH('the Ottoman Empire, under the Sultan', 'the Sultan', { religion: 'state' }), active: (s) => !hap(s, 'ottomanEnd') },
  { cc: ['GB', 'BE', 'NL', 'SE', 'DK', 'NO', 'ES', 'PT', 'GR'], regime: G({ kind: 'monarchy', name: 'a monarchy where only men of property vote', elections: 'controlled', leader: 'the Crown' }), active: (s) => yearNow(s) < 1885 },
  { cc: ['US'], regime: G({ kind: 'democracy', name: 'a republic where slavery is legal in the South', elections: 'controlled', leader: 'the President' }), active: (s) => !hap(s, 'usCivilWar') || !over(s, 'usCivilWar') },
  { cc: ['BR'], regime: MONARCH('the Empire of Brazil', 'the Emperor', { elections: 'controlled' }), active: (s) => yearNow(s) >= 1822 && !hap(s, 'brazilRepublic') },
  { cc: ['RU'], regime: MONARCH('the Russian Empire, where serfs are bound to the land', 'the Tsar', { religion: 'state', exit: 'restricted', jobs: 'assigned' }), active: (s) => !hap(s, 'serfdomEnds') },
  { cc: ['RU'], regime: MONARCH('the Russian Empire, ruled by the Tsar', 'the Tsar', { religion: 'state' }), active: (s) => hap(s, 'serfdomEnds') && !hap(s, 'russianRevolution') },
  { cc: ['RU'], regime: SOVIET, active: (s) => hap(s, 'russianRevolution') && !hap(s, 'sovietCollapse') },
  { cc: ['PL', 'RO'], regime: EAST_BLOC, active: (s) => hap(s, 'coldWar') && !hap(s, 'sovietCollapse') },
  { cc: ['DE'], regime: G({ kind: 'monarchy', name: 'the German Empire under the Kaiser', elections: 'controlled', leader: 'the Kaiser' }), active: (s) => hap(s, 'germanUnification') && !over(s, 'ww1') },
  { cc: ['AT'], regime: G({ kind: 'monarchy', name: 'Austria-Hungary under the Emperor', elections: 'controlled', leader: 'the Emperor' }), active: (s) => !over(s, 'ww1') },
  { cc: ['DE', 'AT'], regime: DICTATOR('a totalitarian dictatorship, the Third Reich', 'the Führer', { kind: 'totalitarian', elections: 'sham', surveillance: 0.35, exit: 'restricted', party: true }), active: (s) => hap(s, 'fascismDE') && !(over(s, 'ww2') && !s.era.events.ww2.axisWon) },
  { cc: ['IT'], regime: DICTATOR('a fascist dictatorship', 'Il Duce', { elections: 'sham', surveillance: 0.2, party: true }), active: (s) => hap(s, 'fascismIT') && !(over(s, 'ww2') && !s.era.events.ww2.axisWon) },
  { cc: ['JP'], regime: G({ kind: 'militarist', name: 'an empire ruled by its generals', elections: 'controlled', press: 'state', surveillance: 0.2, leader: 'the Emperor' }), active: (s) => hap(s, 'militarismJP') && !(over(s, 'ww2') && !s.era.events.ww2.axisWon) },
  { cc: ['ES'], regime: DICTATOR('Franco\'s dictatorship', 'the Caudillo', { religion: 'state' }), active: (s) => over(s, 'spanishCivilWar') && !hap(s, 'francoDies') },
  { cc: ['PT'], regime: DICTATOR('the Estado Novo dictatorship', 'the Prime Minister', { elections: 'sham' }), active: (s) => yearNow(s) >= 1926 && !hap(s, 'carnationRevolution') },
  { cc: ['CN'], regime: MONARCH('the Qing Empire', 'the Emperor'), active: (s) => !hap(s, 'xinhai') },
  { cc: ['CN'], regime: G({ kind: 'fragile', name: 'the Republic of China, torn by warlords and war', elections: 'none', press: 'state', surveillance: 0.08, ratings: false, banking: 'domestic', leader: 'the President' }), active: (s) => hap(s, 'xinhai') && !hap(s, 'prc') },
  { cc: ['CN'], regime: G({ kind: 'totalitarian', name: 'Mao\'s People\'s Republic', elections: 'none', press: 'state', exit: 'closed', business: 'state', religion: 'banned', surveillance: 0.35, banking: 'state', jobs: 'assigned', ratings: false, party: true, leader: 'the Chairman' }), active: (s) => hap(s, 'prc') && !hap(s, 'reformOpening') },
  { cc: ['KR'], regime: G({ kind: 'authoritarian', name: 'an authoritarian republic', elections: 'controlled', press: 'state', surveillance: 0.12, leader: 'the President' }), active: (s) => yearNow(s) >= 1945 && !hap(s, 'koreaDemocracy') },
  { cc: ['TW'], regime: G({ kind: 'oneParty', name: 'a one-party state under martial law', elections: 'controlled', press: 'state', surveillance: 0.15, leader: 'the President' }), active: (s) => yearNow(s) >= 1945 && !hap(s, 'taiwanDemocracy') },
  { cc: ['ZA'], regime: G({ kind: 'apartheid', name: 'the apartheid state (only white South Africans vote)', elections: 'controlled', press: 'state', surveillance: 0.15, leader: 'the Prime Minister' }), active: (s) => hap(s, 'apartheid') && !hap(s, 'apartheidEnds') },
  { cc: ['IR'], regime: MONARCH('the Shah\'s monarchy', 'the Shah', { elections: 'controlled', surveillance: 0.15 }), active: (s) => !hap(s, 'iranRevolution') },
  { cc: ['AF'], regime: MONARCH('the Kingdom of Afghanistan', 'the King', { women: 'restricted' }), active: (s) => yearNow(s) < 1973 },
  { cc: ['AF'], regime: G({ kind: 'fragile', name: 'a country at war with itself', elections: 'none', press: 'state', women: 'restricted', ratings: false, banking: 'domestic', leader: 'whoever holds Kabul' }), active: (s) => yearNow(s) >= 1973 && yearNow(s) < 1996 },
];

/* ------------------------------------------------------------------ */
/* Thrones that still stood                                            */
/* ------------------------------------------------------------------ */

/** Monarchies that reigned in early starts, and the year they fell in our history (History.js decides in this one). */
export const PERIOD_THRONES = { DE: 1918, AT: 1918, RU: 1917, IT: 1946, RO: 1947, BR: 1889 };
export const periodThrone = (cc, year) => year < (PERIOD_THRONES[cc] ?? -Infinity);

/* ------------------------------------------------------------------ */
/* Colonies                                                            */
/* ------------------------------------------------------------------ */

const RULER = { ES: 'Spanish', SE: 'Swedish', CN: 'Chinese', GB: 'British', FR: 'French', PT: 'Portuguese', NL: 'Dutch', BE: 'Belgian', US: 'American', IT: 'Italian', JP: 'Japanese', RU: 'Russian', TR: 'Ottoman', AU: 'Australian', PK: 'Pakistani', MY: 'Malaysian', DE: 'German' };
export const RULER_CAPITAL = { ES: 'Madrid', SE: 'Stockholm', CN: 'Peking', GB: 'London', FR: 'Paris', PT: 'Lisbon', NL: 'The Hague', BE: 'Brussels', US: 'Washington', IT: 'Rome', JP: 'Tokyo', RU: 'Moscow', TR: 'Constantinople', AU: 'Canberra', PK: 'Karachi', MY: 'Kuala Lumpur', DE: 'Berlin' };
export const RULER_NAME = { ES: 'Spain', SE: 'Sweden', CN: 'the Qing Empire', TR: 'the Ottoman Empire', RU: 'Russia', GB: 'Britain', FR: 'France', PT: 'Portugal', NL: 'the Netherlands', BE: 'Belgium', US: 'the United States', IT: 'Italy', JP: 'Japan', AU: 'Australia', PK: 'Pakistan', MY: 'Malaysia', DE: 'Germany' };
const S = (ruler, name, until, o = {}) => ({ ruler, name, until, ...o });
const OTTOMAN = (name) => S('TR', name, 1918, { leader: 'the Ottoman governor', noMovement: true });

/**
 * Who ruled each territory, stage by stage. until: the year it ended in our history (or an
 * event id); war: independence came through a war; from: the stage starts later than the last.
 */
export const COLONIES = {
  // ---- The Americas, and Europe's own subject nations, in the 1800s ----
  MX: [S('ES', 'New Spain', 1821, { war: true, leader: 'the Viceroy' })], GT: [S('ES', 'the Captaincy General of Guatemala', 1821, { leader: 'the Captain General' })],
  CR: [S('ES', 'the Captaincy General of Guatemala (Costa Rica)', 1821)], CO: [S('ES', 'the Viceroyalty of New Granada', 1819, { war: true, leader: 'the Viceroy' })],
  VE: [S('ES', 'the Captaincy General of Venezuela', 1821, { war: true, leader: 'the Captain General' })], PA: [S('ES', 'New Granada (Panama)', 1821), S('CO', 'a department of Colombia', 1903, { noMovement: true, leader: 'the Governor' })],
  PE: [S('ES', 'the Viceroyalty of Peru', 1824, { war: true, leader: 'the Viceroy' })], AR: [S('ES', 'the Viceroyalty of the Río de la Plata', 1816, { war: true, leader: 'the Viceroy' })],
  CL: [S('ES', 'the Captaincy General of Chile', 1818, { war: true, leader: 'the Captain General' })], BR: [S('PT', 'the State of Brazil (Portuguese)', 1822, { leader: 'the Viceroy' })],
  HT: [S('FR', 'Saint-Domingue', 1804, { war: true, leader: 'the Governor' })],
  GR: [S('TR', 'Ottoman Greece', 1830, { war: true, leader: 'the Pasha' })], BE: [S('NL', 'the Southern Netherlands', 1830, { war: true, leader: 'the King of the Netherlands', noMovement: false })],
  NO: [S('SE', 'Norway, in union with Sweden', 1905, { leader: 'the King of Sweden' })], RO: [S('TR', 'the Danubian Principalities (under the Ottomans)', 1878, { war: true })],
  IN: [S('GB', 'Company rule in India (the East India Company)', 1858, { leader: 'the Governor-General', noMovement: true }), S('GB', 'British India', 1947, { leader: 'the Viceroy', partition: true })],
  PK: [S('GB', 'Company rule in India (the East India Company)', 1858, { leader: 'the Governor-General', noMovement: true }), S('GB', 'British India', 1947, { leader: 'the Viceroy', partition: true })],
  BD: [S('GB', 'British India (Bengal)', 1947, { leader: 'the Viceroy', partition: true }), S('PK', 'East Pakistan', 1971, { war: true, leader: 'the Governor of East Pakistan' })],
  LK: [S('GB', 'British Ceylon', 1948)], MM: [S('GB', 'British Burma', 1948, { from: 1885 })], MY: [S('GB', 'British Malaya', 1957, { war: true, from: 1874 })],
  SG: [S('GB', 'the Straits Settlements', 1963, { from: 1819 }), S('MY', 'a state of Malaysia', 1965, { leader: 'the Prime Minister of Malaysia', noMovement: true })],
  KE: [S('GB', 'Kenya Colony', 1963, { war: true, from: 1895 })], NG: [S('GB', 'Colonial Nigeria', 1960, { from: 1900 })], GH: [S('GB', 'the Gold Coast', 1957, { from: 1874 })],
  GM: [S('GB', 'the Gambia Colony', 1965)], SD: [S('GB', 'the Anglo-Egyptian Sudan', 1956, { leader: 'the Governor-General', from: 1899 })],
  MW: [S('GB', 'Nyasaland', 1964, { from: 1891 })], SO: [S('IT', 'Italian Somaliland', 1960, { from: 1889 })], JM: [S('GB', 'the Colony of Jamaica', 1962)],
  BS: [S('GB', 'the Bahamas', 1973)], CY: [OTTOMAN('Ottoman Cyprus'), S('GB', 'British Cyprus', 1960, { war: true, from: 1878 })], MT: [S('GB', 'the Crown Colony of Malta', 1964)],
  IE: [S('GB', 'Ireland, ruled from Westminster', 1922, { war: true, leader: 'the Lord Lieutenant' })],
  IL: [OTTOMAN('Ottoman Palestine'), S('GB', 'Mandatory Palestine', 1948, { war: true, leader: 'the High Commissioner' })],
  PS: [OTTOMAN('Ottoman Palestine'), S('GB', 'Mandatory Palestine', 1948, { leader: 'the High Commissioner' })],
  JO: [OTTOMAN('Ottoman Syria'), S('GB', 'the Emirate of Transjordan (a British mandate)', 1946, { leader: 'the British Resident' })],
  IQ: [OTTOMAN('Ottoman Mesopotamia'), S('GB', 'Mandatory Iraq', 1932, { leader: 'the High Commissioner' })],
  SY: [OTTOMAN('Ottoman Syria'), S('FR', 'the French Mandate of Syria', 1946, { leader: 'the High Commissioner' })],
  LB: [OTTOMAN('Ottoman Syria'), S('FR', 'Greater Lebanon (a French mandate)', 1943, { leader: 'the High Commissioner' })],
  EG: [S('TR', 'the Khedivate of Egypt (under the Ottomans)', 1882, { noMovement: true, leader: 'the Khedive' }), S('GB', 'the British protectorate of Egypt', 1922, { leader: 'the British High Commissioner' })],
  KW: [S('GB', 'Kuwait, a British protectorate', 1961, { leader: 'the Political Agent', noMovement: true, from: 1899 })],
  BH: [S('GB', 'Bahrain, a British protectorate', 1971, { leader: 'the Political Agent', noMovement: true, from: 1861 })],
  QA: [S('GB', 'Qatar, a British protectorate', 1971, { leader: 'the Political Agent', noMovement: true, from: 1916 })],
  AE: [S('GB', 'the Trucial States', 1971, { leader: 'the Political Agent', noMovement: true, from: 1820 })],
  BN: [S('GB', 'the British protectorate of Brunei', 1984, { leader: 'the High Commissioner', noMovement: true, from: 1888 })],
  SB: [S('GB', 'the British Solomon Islands', 1978, { from: 1893 })], VU: [S('GB', 'the New Hebrides (an Anglo-French condominium)', 1980, { leader: 'the Resident Commissioners', from: 1906 })],
  TO: [S('GB', 'Tonga, a British protected state', 1970, { leader: 'the British Agent', noMovement: true, from: 1900 })],
  PG: [S('AU', 'the Territory of Papua and New Guinea', 1975, { leader: 'the Administrator', from: 1906 })],
  MH: [S('DE', 'German New Guinea (the Marshall Islands)', 1914, { noMovement: true, from: 1885 }), S('JP', 'the South Seas Mandate', 1945, { noMovement: true }), S('US', 'the Trust Territory of the Pacific Islands', 1986, { leader: 'the High Commissioner' })],
  DZ: [OTTOMAN('the Regency of Algiers'), S('FR', 'French Algeria', 1962, { war: true, leader: 'the Governor-General', from: 1830 })], MA: [S('FR', 'the French protectorate of Morocco', 1956, { leader: 'the Resident-General', from: 1912 })],
  SN: [S('FR', 'French West Africa (Senegal)', 1960)], CI: [S('FR', 'French West Africa (Ivory Coast)', 1960, { from: 1893 })], ML: [S('FR', 'French Sudan', 1960, { from: 1892 })],
  NE: [S('FR', 'French West Africa (Niger)', 1960, { from: 1900 })], TD: [S('FR', 'French Equatorial Africa (Chad)', 1960, { from: 1900 })], CF: [S('FR', 'Ubangi-Shari', 1960, { from: 1903 })],
  DJ: [S('FR', 'French Somaliland', 1977, { from: 1884 })], VN: [S('FR', 'French Indochina', 1954, { war: true, from: 1883 })], KH: [S('FR', 'French Indochina (Cambodia)', 1953, { from: 1863 })],
  MZ: [S('PT', 'Portuguese Mozambique', 1975, { war: true })], GW: [S('PT', 'Portuguese Guinea', 1974, { war: true })],
  ID: [S('NL', 'the Dutch East Indies', 1949, { war: true })], CD: [S('BE', 'the Congo Free State, King Leopold\'s private colony', 1908, { from: 1885, leader: 'King Leopold\'s agents', noMovement: true }), S('BE', 'the Belgian Congo', 1960)],
  PH: [S('ES', 'the Spanish East Indies', 1898, { war: true, leader: 'the Governor-General' }), S('US', 'the Philippine Islands, an American territory', 1946)], LY: [OTTOMAN('Ottoman Tripolitania'), S('IT', 'Italian Libya', 1951, { from: 1911 })],
  KR: [S('JP', 'Korea under Japanese rule', 1945, { leader: 'the Governor-General', from: 1910 })], KP: [S('JP', 'Korea under Japanese rule', 1945, { leader: 'the Governor-General', from: 1910 })],
  TW: [S('CN', 'Taiwan prefecture of the Qing Empire', 1895, { noMovement: true, leader: 'the Qing governor' }), S('JP', 'Taiwan under Japanese rule', 1945, { leader: 'the Governor-General' })],
  FI: [S('SE', 'the eastern half of the Swedish realm', 1809, { noMovement: true }), S('RU', 'the Grand Duchy of Finland, under the Tsar', 1917, { leader: 'the Governor-General' })], PL: [S('RU', 'Russian Poland', 1918)],
  UA: [S('RU', 'Ukraine, ruled from Moscow', 'sovietCollapse')],
  EE: [S('RU', 'the Russian Empire (Estonia)', 1918), S('RU', 'a Soviet republic (Estonia)', 'sovietCollapse', { from: 1940 })],
  LV: [S('RU', 'the Russian Empire (Latvia)', 1918), S('RU', 'a Soviet republic (Latvia)', 'sovietCollapse', { from: 1940 })],
  LT: [S('RU', 'the Russian Empire (Lithuania)', 1918), S('RU', 'a Soviet republic (Lithuania)', 'sovietCollapse', { from: 1940 })],
};
export const rulerAdj = (cc) => RULER[cc] ?? cc;
export const rulerName = (cc) => RULER_NAME[cc] ?? cc;

/** The stage of foreign rule a territory is in now, or null when it governs itself. */
export function colonyStage(state, cc) {
  const stages = COLONIES[cc];
  const rec = state.era?.colonies?.[cc];
  if (!stages || !state.era) return null;
  const y = yearNow(state);
  for (let i = 0; i < stages.length; i++) {
    if ((rec?.done ?? []).includes(i)) continue;
    const st = stages[i];
    if (st.from && y < st.from) return null;
    return { ...st, index: i };
  }
  return null;
}
export const colonyHere = (state) => colonyStage(state, state.character.countryId ?? 'US');

/** The planned end year of a stage (event-ended stages: when that event happened, else never). */
export const stageEnd = (state, st) => (typeof st.until === 'number' ? st.until : state.era?.events?.[st.until]?.year ?? Infinity);

/** Every country's era regime now: { [cc]: regime }. Colonies over periods. */
export function eraLayer(state) {
  const out = {};
  if (!state?.era || yearNow(state) >= PRESENT) return out;
  for (const p of PERIODS) if (p.active(state)) for (const cc of p.cc) out[cc] = { ...p.regime };
  for (const cc of Object.keys(COLONIES)) {
    const st = colonyStage(state, cc);
    if (!st) continue;
    if (st.ruler === 'RU' && out.RU?.kind === 'totalitarian') { out[cc] = { ...out.RU, name: `${st.name}, a Soviet republic ruled from Moscow` }; continue; }
    out[cc] = G({ kind: 'colony', name: `${st.name}, ruled from ${RULER_CAPITAL[st.ruler] ?? 'abroad'}`, elections: 'none', press: 'state', surveillance: 0.08, leader: st.leader ?? 'the Governor', colony: st.ruler });
  }
  return out;
}

/**
 * Subjects of an empire could settle in its heart: British subjects in Britain until the
 * Commonwealth Immigrants Act of 1962, Algerians in France until 1962, Portuguese colonial
 * nationals until 1975. The right lasts until then even after independence.
 */
export const SUBJECT_UNTIL = { GB: 1962, FR: 1962, PT: 1975, NL: 1955, BE: 1960, IT: 1950, JP: 1945, US: 1934 };
const SUBJECT_WORD = { GB: 'British subject', FR: 'French national', PT: 'Portuguese national', NL: 'Dutch subject', BE: 'Belgian colonial subject', IT: 'Italian colonial subject', JP: 'Japanese imperial subject', US: 'American national' };
export function subjectRight(state, to) {
  const y = yearNow(state);
  if (!state.era || y >= PRESENT || !(y < (SUBJECT_UNTIL[to] ?? 0))) return null;
  const born = state.migration?.birthCountry ?? state.character.countryId ?? 'US';
  const ruled = (COLONIES[born] ?? []).some((st) => st.ruler === to && (st.from ?? 0) <= y);
  return ruled ? `${SUBJECT_WORD[to]} (until ${SUBJECT_UNTIL[to]})` : null;
}


/* ------------------------------------------------------------------ */
/* Loose futures: what this world's future has brought (History.js)    */
/* ------------------------------------------------------------------ */

/** Has this future arrived? (Future events are recorded like past ones.) */
export const futureOn = (state, id) => Boolean(state?.era?.events?.[id]) && !state.era.events[id].skipped;

/** How exposed each line of work is to each wave of automation (extra yearly layoff risk). */
const AUTOMATION = {
  aiWave: { retail: 0.02, legalSupport: 0.05, accounting: 0.04, insurance: 0.04, interpreter: 0.07, marketing: 0.03, design: 0.03, journalism: 0.03, humanResources: 0.03, sales: 0.02, tech: 0.02, dataScience: 0.01, benefitsClaims: 0.04, corporate: 0.015, dispatch: 0.02 },
  selfDriving: { trucking: 0.08, logistics: 0.03, schoolBus: 0.05, transit: 0.04, paratransit: 0.05, railroad: 0.02 },
  humanoidRobots: { manufacturing: 0.06, logistics: 0.05, culinary: 0.04, retail: 0.03, caregiving: 0.02, agriculture: 0.03, hospitality: 0.03, welding: 0.03 },
  fusionPower: { oilGas: 0.08, petroleumEng: 0.05 },
};
/** Extra yearly layoff risk for a profession from the automation this world has had. */
export function automationRisk(state, professionId) {
  if (!state?.era) return 0;
  let r = 0;
  for (const [wave, table] of Object.entries(AUTOMATION)) if (futureOn(state, wave)) r += table[professionId] ?? 0;
  return r;
}
export const AUTOMATED_BY = (professionId) => Object.entries(AUTOMATION).filter(([, t]) => t[professionId]).map(([w]) => w);

/** Medicine pushes death back: background mortality falls after longevity breakthroughs. */
export function longevityFactor(state, age) {
  if (!state?.era || age < 50) return 1;
  return (futureOn(state, 'longevity') ? 0.75 : 1) * (futureOn(state, 'agingTherapy') ? 0.6 : 1);
}

/** Past a climate tipping point, weather disasters climb faster. */
export const climateTipped = (state) => futureOn(state, 'climateTipping');

/** Great-power tension makes every war likelier. */
export const tensionFactor = (state) => (futureOn(state, 'blocTension') && !futureOn(state, 'detente') ? 1.6 : 1);

/** Future work that needs its future (careers-future.js), and work the future closed. */
export function futureWorkBlock(state, profession) {
  const need = profession?.futureNeeds;
  if (need && !futureOn(state, need)) return 'Doesn\'t exist yet';
  return null;
}

/** Professions this life's world doesn't have at all: not yet invented, long gone, a future that never came, a colony's service where there's no colony. The job board hides them. */
export function eraHidden(state, p) {
  if (p.templateOnly) return true;
  const y = yearNow(state);
  const from = PROFESSION_FROM[p.id] ?? p.fromYear;
  if (from && y < from) return true;
  if (p.untilYear && y >= p.untilYear) return true;
  if (p.futureNeeds && !futureOn(state, p.futureNeeds)) return true;
  if (p.colonial && !colonyHere(state)) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Money then: amounts stay in today's dollars; this says what they were */
/* ------------------------------------------------------------------ */

/** Consumer prices by year (US CPI, 1982–84 = 100), loosely; 2026 ≈ 330. */
const CPI = [[1900, 8], [1910, 9.1], [1920, 20], [1930, 16.7], [1940, 14], [1950, 24.1], [1960, 29.6], [1970, 38.8], [1980, 82.4], [1990, 130.7], [2000, 172.2], [2010, 218.1], [2020, 258.8], [2026, 330]];
/** What today's dollar was worth in a given year (0.03 in 1930). */
export function priceIndex(year) {
  if (year >= PRESENT) return 1;
  if (year <= CPI[0][0]) return CPI[0][1] / 330;
  const i = CPI.findIndex(([y]) => y > year);
  const [y0, c0] = CPI[i - 1];
  const [y1, c1] = CPI[i];
  return (c0 + ((c1 - c0) * (year - y0)) / (y1 - y0)) / 330;
}
/** An amount in the money of the year you're living in, or null today. */
export const periodDollars = (state, amount) => (yearNow(state) < PRESENT ? Math.round(amount * priceIndex(yearNow(state))) : null);


/* ------------------------------------------------------------------ */
/* Licences and certifications: when each existed (loosely, US dates)  */
/* ------------------------------------------------------------------ */

export const CREDENTIAL_FROM = {
  learnerPermit: 1930, driverLicense: 1910, motorcycle: 1920, cdlA: 1986, cdlB: 1986, passengerEndorsement: 1986, schoolBusEndorsement: 1986, hazmatEndorsement: 1986,
  studentPilot: 1927, privatePilot: 1927, instrumentRating: 1932, commercialPilot: 1927, cfi: 1930, atp: 1938, firstClassMedical: 1926, typeRating: 1960,
  cna: 1987, emr: 1995, evoc: 1980, emt: 1970, paramedic: 1972, np: 1965, boardCertified: 1917, ccrn: 1975, crnaLicense: 1956, ccp: 1990, flightParamedic: 1985,
  rnSpecialty: 1975, cen: 1980, cnor: 1979, rncOb: 1980, cpn: 1990, ocn: 1986, pccn: 2004, cmsrn: 1995, pmhn: 1975, bcps: 1997, ocs: 1985, cht: 1980, arrtCt: 1995, arrtMr: 1995,
  rdms: 1975, nrcpn: 1990, caqPa: 2011, paLicense: 1970, acls: 1974, rrt: 1969, rdn: 1969, otLicense: 1975, cccSlp: 1952, ptLicense: 1925, dcLicense: 1925, arrt: 1922, rdh: 1915,
  ff1: 1975, ff2: 1975, hazmatOps: 1980, driverOperator: 1975, cem: 1993, fireOfficer1: 1975, fireOfficer2: 1975, fireInspector: 1960, arff: 1970,
  postReserve: 1965, post: 1959, correctionsAcademy: 1970, fto: 1972, cit: 1988, trafficEnforcement: 1950, firearmsInstructor: 1950, supervisorCourse: 1950, commandCollege: 1960,
  fletc: 1970, fbiAcademy: 1935, deaAcademy: 1973, cbpAcademy: 2003, tsaCert: 2002, k9Handler: 1960, apco: 1980, probationCert: 1960, forensicCert: 1975,
  epa608: 1993, awsWelder: 1940, ase: 1972, journeymanLineman: 1940, atcCert: 1936, soaASA: 1949, soaFSA: 1949, sesCert: 1979, rehs: 1970, cph: 2008,
  nccco: 1996, h2s: 1980, wellControl: 1980, fishingMaster: 1950, railOperatorCert: 1990, conductorCert: 2012, locomotiveEngineer: 1991,
  guardCard: 1975, armedGuard: 1975, execProtection: 1980, piLicense: 1920, bailAgent: 1960, wildlandFF2: 1975, wildlandFF1: 1975, boatCrew: 1950, coxswain: 1950,
  wfr: 1985, landNav: 1950, ropeRescue: 1985, swiftwater: 1990, avalanche: 1980, ics300: 2005, paralegalCP: 1976, fe: 1965, pe: 1907, realEstate: 1919, brokerLicense: 1919,
  lcsw: 1970, insuranceProducer: 1920, journeymanElectrician: 1910, masterElectrician: 1910, cosmetologyLicense: 1930, oshaSafety: 1971, series7: 1974, series66: 1999,
  pmp: 1984, sixSigmaGreen: 1990, sixSigmaBlack: 1990, leadershipProgram: 1960, awsCert: 2013, cissp: 1994, languageProficiency: 1955, cgfm: 1994, aicp: 1978,
  buildingInspector: 1960, faCertificate: 2004, twic: 2007, stcw: 1984, mmc: 2009, servSafe: 1990, alcoholServer: 1985, acfChef: 1976, cha: 1980, cpm: 1970,
  adminCert: 1960, nationalBoard: 1994, ptoe: 1996, cfa: 1963, shrm: 1997, securityPlus: 2002, hazwoper: 1990, flagger: 1980, courtManager: 1970, lpc: 1976,
  psychLicense: 1950, pls: 1950, nabcep: 2003, courtInterpreter: 1978, sagAftra: 1933, cpt: 1990, forklift: 1999, cda: 1975, waterOperator: 1975, animalControlCert: 1980, drone: 2016,
};
/** Did this licence or certification exist in the year you're living in? */
export const credentialExists = (state, id) => !(CREDENTIAL_FROM[id] > yearNow(state));
/** Before the 1940s most working people had left school at 14: a high-school diploma wasn't asked for. */
export const diplomaExpected = (state) => yearNow(state) >= 1945;

/* ------------------------------------------------------------------ */
/* Schools and universities by era                                     */
/* ------------------------------------------------------------------ */

/** Kinds of school that came later (K12 types; university types). */
export const SCHOOL_FROM = { magnet: 1970, charter: 1991, online: 1998, community: 1920 };
/** Why this school or university isn't open to you in this year, or null. */
export function eraStudyBlock(state, { schoolType, uni } = {}) {
  const y = yearNow(state);
  if (y >= PRESENT) return null;
  const t = schoolType ?? uni?.type;
  if (SCHOOL_FROM[t] > y) return `No ${t === 'community' ? 'community colleges' : `${t} schools`} yet (from about ${SCHOOL_FROM[t]})`;
  if (uni && state.character.gender === 'female' && y < 1870) return 'Universities don\'t admit women yet';
  return null;
}
/** The age most children left school in this year (14 before the 1940s; 12 before the 1880s). */
export const leavingAge = (state) => (yearNow(state) < 1880 ? 12 : yearNow(state) < 1945 ? 14 : null);
/** The GI Bill (1944) and federal student loans (1958). */
export const giBillExists = (state) => yearNow(state) >= 1944;
export const studentLoansExist = (state) => yearNow(state) >= 1958;

/* ------------------------------------------------------------------ */
/* Ranks and titles of their time                                      */
/* ------------------------------------------------------------------ */

/** The year of the life being played, for code that has no state to hand (rank tables, job titles). Set by History. */
let ERA_YEAR = PRESENT;
export const setEraYear = (y) => { ERA_YEAR = y ?? PRESENT; };
export const eraYear = () => ERA_YEAR;

/** Job titles as they were: [pattern, replacement, until]. */
const OLD_TITLES = [
  [/\bPolice Officer\b/, 'Patrolman', 1975], [/\bPolice Recruit\b/, 'Probationary Patrolman', 1975], [/\bFirefighter\b/, 'Fireman', 1975],
  [/\bFlight Attendant\b/, 'Stewardess', 1975], [/\bServer\b/, 'Waiter', 1990], [/\bMail Carrier\b/, 'Mailman', 1980], [/\bLetter Carrier\b/, 'Postman', 1980],
  [/\bChief Executive Officer\b/, 'Managing Director', 1975], [/\bAdministrative Assistant\b/, 'Secretary', 1985], [/\bSanitation Worker\b/, 'Dustman', 1980],
  [/\bChairperson\b/, 'Chairman', 1985], [/\bEMT\b/, 'Ambulance Attendant', 1970], [/\bParamedic\b/, 'Ambulance Driver', 1970], [/\bSoftware Engineer\b/, 'Programmer', 1985],
  [/\bHuman Resources\b/, 'Personnel', 1985], [/\bCustodian\b/, 'Janitor', 1990], [/\bNursing Assistant\b/, 'Orderly', 1987],
];
/** A job title in the words of its year. */
export function periodTitle(title) {
  if (!title || ERA_YEAR >= PRESENT) return title;
  let t = title;
  for (const [re, old, until] of OLD_TITLES) if (ERA_YEAR < until) t = t.replace(re, old);
  return t;
}

/** Military ranks as they were (US forces especially changed): [nation|'*', branch, track, index, title, until]. */
const OLD_RANKS = [
  ['US', 'army', 'enlisted', 0, 'Private', 1920], ['US', 'army', 'enlisted', 1, 'Private', 1920], ['US', 'army', 'enlisted', 3, 'Corporal', 1955],
  ['US', 'army', 'enlisted', 6, 'Technical Sergeant', 1948], ['US', 'army', 'enlisted', 7, 'Master Sergeant', 1958], ['US', 'army', 'enlisted', 8, 'First Sergeant', 1958],
  ['US', 'navy', 'enlisted', 0, 'Apprentice Seaman', 1948], ['US', 'navy', 'enlisted', 1, 'Seaman Second Class', 1948], ['US', 'navy', 'enlisted', 2, 'Seaman First Class', 1948],
  ['US', 'navy', 'enlisted', 7, 'Chief Petty Officer', 1958], ['US', 'navy', 'enlisted', 8, 'Chief Petty Officer', 1958], ['US', 'navy', 'officer', 6, 'Commodore', 1950],
  ['US', 'airforce', 'enlisted', 0, 'Private', 1952], ['US', 'airforce', 'enlisted', 1, 'Private First Class', 1952], ['US', 'airforce', 'enlisted', 3, 'Airman First Class', 1976],
  ['US', 'airforce', 'enlisted', 8, 'Master Sergeant', 1958], ['US', 'marines', 'enlisted', 3, 'Corporal', 1958],
  ['GB', 'army', 'enlisted', 0, 'Private', 1920], ['GB', 'airforce', 'officer', 0, 'Pilot Officer', 9999],
];
/** A rank title in the words of its year (the year being played). */
export function periodRank(nation, branch, track, index, title) {
  if (ERA_YEAR >= PRESENT) return title;
  const hit = OLD_RANKS.find(([n, b, t, i, , until]) => (n === (nation ?? 'US') || n === '*') && b === branch && t === track && i === index && ERA_YEAR < until);
  return hit ? hit[4] : title;
}
/** When each branch existed: air forces from the 1910s–30s, the US Air Force from 1947, the Space Force from 2019. */
const BRANCH_FROM = { US: { airforce: 1947, spaceforce: 2019, coastguard: 1915 }, GB: { airforce: 1918 }, CA: { airforce: 1924 }, AU: { airforce: 1921 }, NZ: { airforce: 1937 }, DE: { airforce: 1935 }, IN: { airforce: 1932 }, '*': { airforce: 1920, spaceforce: 2019 } };
export function branchExists(state, cc, branch) {
  const y = yearNow(state);
  const from = BRANCH_FROM[cc]?.[branch] ?? BRANCH_FROM['*'][branch];
  return !(from > y);
}
export const branchFrom = (cc, branch) => BRANCH_FROM[cc]?.[branch] ?? BRANCH_FROM['*'][branch] ?? null;

/* ------------------------------------------------------------------ */
/* Flags of their time                                                 */
/* ------------------------------------------------------------------ */

/** Flags that aren't today's (no emoji exists for most old flags; these stand in). */
const PERIOD_FLAG = { soviet: '🚩', qing: '🐉', shogunate: '🎌', ottoman: '🌙', confederation: '🏳️' };
/** The flag a country flew in the year being played: a colony flies its ruler's; the Soviet Union the red flag. */
export function eraFlag(state, cc, countries) {
  const today = countries?.[cc]?.flag ?? '🏳️';
  if (!state?.era || yearNow(state) >= PRESENT) return today;
  const st = colonyStage(state, cc);
  if (st) return st.ruler === 'TR' ? PERIOD_FLAG.ottoman : st.ruler === 'RU' && hap(state, 'russianRevolution') && !hap(state, 'sovietCollapse') ? PERIOD_FLAG.soviet : countries?.[st.ruler]?.flag ?? today;
  if (cc === 'RU' && hap(state, 'russianRevolution') && !hap(state, 'sovietCollapse')) return PERIOD_FLAG.soviet;
  if (cc === 'CN' && !hap(state, 'xinhai')) return PERIOD_FLAG.qing;
  if (cc === 'TR' && !hap(state, 'ottomanEnd')) return PERIOD_FLAG.ottoman;
  if (cc === 'JP' && !hap(state, 'meiji')) return PERIOD_FLAG.shogunate;
  if ((cc === 'DE' && !hap(state, 'germanUnification')) || (cc === 'IT' && !hap(state, 'italianUnification'))) return PERIOD_FLAG.confederation;
  return today;
}

