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
import { dataRegime, regionStateAt, eraMortality, periodCurrency as dataCurrency, DATA_COUNTRIES, setDataYear } from './HistoricalData.js';
import { PACKS } from './packs/index.js';

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
  railway: 1830, photography: 1840, telegraph: 1845, telephone: 1880, electricLight: 1900, automobile: 1905, airTravel: 1950, emergencyNumber: 1968, ged: 1942, highSchool: 1920, cctv: 1980, video: 1980, dna: 1987, doorbellCam: 2015,
  radio: 1922, tv: 1950, creditCards: 1960, personalComputer: 1980, mobilePhone: 1990,
  internet: 1995, onlineDating: 1997, drones: 2001, vaping: 2010, socialMedia: 2006, streaming: 2007, smartphone: 2008, crypto: 2010, gigApps: 2012,
};
export const hasTech = (state, id) => !(TECH[id] > yearNow(state));

/** Words that give an event away as modern, by the technology they need (latest first). */
const TECH_WORDS = [
  ['crypto', /\bcrypto|bitcoin|\bNFTs?\b|blockchain/i],
  ['doorbellCam', /porch pirate|doorbell cam|Ring camera|parcels? (?:stolen|left)|packages? (?:stolen|left)|stealing your packages/i],
  ['dna', /\bDNA\b/],
  ['cctv', /\bCCTV\b|security camera|dashcam|body ?cam/i],
  ['video', /\bvideo\b|camcorder|\bVHS\b|\bDVD/i],
  ['emergencyNumber', /(?<![\d,.$])\b(?:911|999)\b(?![,.]?\d)|emergency number/i],
  ['airTravel', /\bairports?\b|\bflights?\b|airline|plane ticket|jet lag|budget airline|boarding pass/i],
  ['gigApps', /rideshare|\bUber\b|\bLyft\b|DoorDash|gig app|delivery app|Airbnb/i],
  ['smartphone', /smartphone|\bapps?\b|app store|selfie|\bswip|Tinder|Instagram|TikTok|WhatsApp|FaceTime|group chat|Zoom call|influencer|viral|hashtag|doomscroll/i],
  ['vaping', /\bvap(?:e|es|ed|ing)\b|e-cig/i],
  ['drones', /\bdrones?\b|\bUAVs?\b|Reaper|Predator strike/i],
  ['streaming', /Netflix|streaming|binge-watch|Spotify|podcast/i],
  ['socialMedia', /social media|Facebook|Twitter|YouTube|followers online|went viral|\bposted (?:it|a|about|online)/i],
  ['internet', /internet|video calls?|upload|\bonline\b|website|\be-?mails?\b|Google|Wi-?Fi|\bweb\b|download|\bblog|\bforums?\b|emoji|\bGPS\b|Amazon (?:order|package|delivery)|webcam|\bDMs?\b|\bDM'd/i],
  ['mobilePhone', /📱|phone maker|cell ?phone|mobile phone|\btext(?:ed|ing|s)? (?:you|me|him|her|them|back)|text message|voicemail|ringtone|on (?:your|her|his|their) phone|phone screen|\bphones? buzz/i],
  ['personalComputer', /laptop|\bPC\b|spreadsheet|video ?games?|PlayStation|Xbox|Nintendo|gaming|printer/i],
  ['creditCards', /credit card/i],
  ['tv', /\bTV\b|television|sitcom|reality show/i],
  ['radio', /\bradio\b|\bwireless set\b/i],
  ['ged', /\bGED\b/],
  ['highSchool', /high school reunion|reunion in the old gym/i],
  ['automobile', /\b(?:cars?|car park|parking|driveway|trucks?|motorway|highway|garage|petrol|gas station|traffic)\b/i],
  ['electricLight', /\blight switch|electric(?:ity)?\b|power cut|fridge|refrigerator|washing machine/i],
  ['telephone', /\bphoned?\b|telephone|rang (?:you|her|him|them)|on the phone|📞|\bcalls at \d|\bcall(?:ed)? (?:you|me|him|her|them) at\b/i],
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
  railroad: 1830, transit: 1860, transitMaintenance: 1905, socialWork: 1900, accounting: 1850, journalism: 1800, pharmacy: 1820,
  mechanicalEng: 1850, chemicalEng: 1880, structuralEng: 1880, plumbing: 1870, insurance: 1850, realestate: 1850, sheriff: 1800, library: 1850,
  tech: 1955, cybersecurity: 1990, dataScience: 2010, contentCreator: 2006, gameDevelopment: 1975, design: 1930,
  renewableEnergy: 2000, physicianAssistant: 1967, respiratoryTherapy: 1950, imaging: 1920, dentalHygiene: 1915,
  occupationalTherapy: 1920, speechPathology: 1925, airTrafficControl: 1930, ems: 1970, privateEms: 1960, paratransit: 1975,
  dispatch: 1968, tsa: 2002, travelNursing: 1980, emergencyManagement: 1979, atf: 1972, dea: 1973, fbi: 1908,
  nato: 1949, unSecretariat: 1920, unAgencies: 1919, euInstitutions: 1952, intlFinance: 1945, intlJustice: 1922, maltaRelief: 1953, icrc: 1863,
  caseOfficer: 1947, sigint: 1952, intelligence: 1947, nuclearEng: 1945, aerospaceEng: 1940, petroleumEng: 1915,
  flightAttendant: 1930, aviation: 1920, charterAviation: 1925, communityCollege: 1920, nationalLab: 1943, environmental: 1970,
  oig: 1978, privateMilitary: 1990, borderPatrol: 1924, federalPrisons: 1930, usss: 1865, caregiving: 1965, benefitsClaims: 1935, counseling: 1960, psychology: 1920, regulatory: 1915,
  airportPolice: 1950, airportFire: 1950, cruise: 1970, privatePrisons: 1983, cps: 1974, publicDefender: 1914,
  gurkhaContingent: 1949, forensics: 1925, hvac: 1930, schoolBus: 1920, parkService: 1916, foreignService: 1924,
  humanResources: 1920, marketing: 1920, fitness: 1960, cosmetology: 1910, dietitian: 1920, optometry: 1910,
  physicalTherapy: 1920, actuary: 1900, lineworker: 1900, meteorology: 1900, interpreter: 1900, interpretation: 1900,
  moc: 1950, privateSecurity: 1910, bailBonds: 1910, propertyManagement: 1920, insurance: 1900, gig: 2012,
  welding: 1905, chiropractic: 1897, transitPolice: 1904, logistics: 1950, oilGas: 1860, dot: 1916, planning: 1910, gameWarden: 1880, universityPolice: 1894, stateFire: 1905, probation: 1878,
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
  { cc: ['PL', 'RO', 'HU', 'CZ', 'SK', 'BG', 'AL', 'MN'], regime: EAST_BLOC, active: (s) => hap(s, 'coldWar') && !hap(s, 'sovietCollapse') },
  // Tito's Yugoslavia: one party and social ownership, but its people could work abroad from the 1960s.
  { cc: ['RS', 'HR', 'SI', 'BA', 'MK', 'ME'], regime: { ...EAST_BLOC, name: 'socialist Yugoslavia, under the League of Communists', leader: 'Marshal Tito', exit: 'restricted' }, active: (s) => yearNow(s) >= 1945 && yearNow(s) < 1990 },
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
];

/* ------------------------------------------------------------------ */
/* Thrones that still stood                                            */
/* ------------------------------------------------------------------ */

/** Monarchies that reigned in early starts, and the year they fell in our history (History.js decides in this one). */
/**
 * Thrones that have since fallen, with the years each reigned: the Kaiser and the Tsar, the
 * Napoleons and the Orléans kings, the Ottoman sultans and the Qing emperors, the shahs of Persia
 * and Iran, the kings of Egypt, Greece, Afghanistan, Iraq and Libya, Ethiopia's emperors, Korea's,
 * Vietnam's and Burma's last dynasties, Mexico's Habsburg emperor and Nepal's kings.
 */
export const PERIOD_THRONE_YEARS = {
  DE: [[1800, 1918]], AT: [[1800, 1918]], RU: [[1800, 1917]], IT: [[1800, 1946]], RO: [[1866, 1947]], BR: [[1822, 1889]],
  FR: [[1804, 1848], [1852, 1870]], PT: [[1800, 1910]], TR: [[1800, 1922]], CN: [[1800, 1912]], IR: [[1800, 1979]], EG: [[1805, 1953]],
  GR: [[1832, 1924], [1935, 1973]], ET: [[1800, 1974]], AF: [[1823, 1973]], LY: [[1951, 1969]], IQ: [[1921, 1958]], KR: [[1800, 1910]],
  VN: [[1802, 1945]], MX: [[1864, 1867]], NP: [[1800, 2008]], YE: [[1918, 1962]], MM: [[1800, 1885]],
};
/** Thrones whose fall comes from a history event (a lost war, a revolution) rather than its date. */
export const EVENT_THRONES = ['DE', 'AT', 'RU', 'IT', 'RO', 'BR'];
/** When each throne finally fell (the end of its last reign). */
export const PERIOD_THRONES = Object.fromEntries(Object.entries(PERIOD_THRONE_YEARS).map(([cc, r]) => [cc, r.at(-1)[1]]));
export const periodThrone = (cc, year) => (PERIOD_THRONE_YEARS[cc] ?? []).some(([from, until]) => year >= from && year < until);
/** Today's monarchies that were republics for a time (Spain's First and Second Republics, and Franco). */
export const REPUBLIC_GAPS = { ES: [[1873, 1875], [1931, 1975]] };
export const republicGap = (cc, year) => (REPUBLIC_GAPS[cc] ?? []).some(([from, until]) => year >= from && year < until);

/* ------------------------------------------------------------------ */
/* Colonies                                                            */
/* ------------------------------------------------------------------ */

const RULER = { DK: 'Danish', RO: 'Romanian', HT: 'Haitian', BR: 'Brazilian', ID: 'Indonesian', AT: 'Austrian', ZA: 'South African', NZ: 'New Zealand', ET: 'Ethiopian', HU: 'Hungarian', CO: 'Colombian', ES: 'Spanish', SE: 'Swedish', CN: 'Chinese', GB: 'British', FR: 'French', PT: 'Portuguese', NL: 'Dutch', BE: 'Belgian', US: 'American', IT: 'Italian', JP: 'Japanese', RU: 'Russian', TR: 'Ottoman', AU: 'Australian', PK: 'Pakistani', MY: 'Malaysian', DE: 'German' };
export const RULER_CAPITAL = { DK: 'Copenhagen', RO: 'Bucharest', HT: 'Port-au-Prince', BR: 'Rio de Janeiro', ID: 'Jakarta', AT: 'Vienna', ZA: 'Pretoria', NZ: 'Wellington', ET: 'Addis Ababa', HU: 'Budapest', CO: 'Bogotá', ES: 'Madrid', SE: 'Stockholm', CN: 'Peking', GB: 'London', FR: 'Paris', PT: 'Lisbon', NL: 'The Hague', BE: 'Brussels', US: 'Washington', IT: 'Rome', JP: 'Tokyo', RU: 'Moscow', TR: 'Constantinople', AU: 'Canberra', PK: 'Karachi', MY: 'Kuala Lumpur', DE: 'Berlin' };
export const RULER_NAME = { DK: 'Denmark', RO: 'Romania', HT: 'Haiti', BR: 'the Empire of Brazil', ID: 'Indonesia', AT: 'Austria-Hungary', ZA: 'South Africa', NZ: 'New Zealand', ET: 'Ethiopia', HU: 'Hungary', CO: 'Colombia', ES: 'Spain', SE: 'Sweden', CN: 'the Qing Empire', TR: 'the Ottoman Empire', RU: 'Russia', GB: 'Britain', FR: 'France', PT: 'Portugal', NL: 'the Netherlands', BE: 'Belgium', US: 'the United States', IT: 'Italy', JP: 'Japan', AU: 'Australia', PK: 'Pakistan', MY: 'Malaysia', DE: 'Germany' };
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
// Country packs bring their own foreign rule (packs/Sketch.js `ruled`).
for (const p of PACKS) if (p.history?.ruled?.length && !COLONIES[p.id]) COLONIES[p.id] = p.history.ruled.map(([ruler, name, until, o]) => (ruler === 'TR' && until === 1918 && !o ? OTTOMAN(name) : S(ruler, name, until, o ?? {})));
const PACK_NAMES = Object.fromEntries(PACKS.filter((p) => p.history?.names).map((p) => [p.id, p.history.names]));
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
/** Whose pattern a colonial uniform follows: the ruler of your colony, or your own country posted out. */
export const insigniaCountry = (state, profession) => (profession?.colonial ? colonyHere(state)?.ruler ?? state.character.countryId ?? 'US' : state.character.countryId ?? 'US');
/** The territories a country rules in the year being played. */
const HOME_REALMS = ['IE', 'NO', 'FI', 'PL', 'EE', 'LV', 'LT', 'UA', 'BY', 'CZ', 'SK', 'HU', 'HR', 'SI', 'BA', 'RS', 'ME', 'MK', 'AL', 'XK', 'GR', 'BG', 'RO', 'MD', 'IS', 'BE', 'NL', 'LU', 'PT', 'ES', 'IT', 'AT', 'DE', 'FR', 'CH', 'DK', 'SE'];
/**
 * The empires that ran overseas colonial services (district officers, governors, a colonial
 * office). Russia, the Soviet Union, the Ottomans, Austria, Sweden and China ruled their
 * subject lands as provinces of the state itself: no colonial service, no handover at midnight.
 */
export const OVERSEAS_EMPIRES = ['GB', 'FR', 'NL', 'PT', 'ES', 'BE', 'DE', 'IT', 'JP', 'US', 'DK'];
/** Is this stage of foreign rule a colony with a colonial administration (not an annexed province or a Soviet republic)? */
export const isColonialRule = (cc, st) => Boolean(st) && st.ruler !== cc && OVERSEAS_EMPIRES.includes(st.ruler) && !HOME_REALMS.includes(cc);
/** The colonial administration you live under, or null (also null in a Soviet republic or an Ottoman province). */
export const colonialHere = (state) => { const cc = state.character.countryId ?? 'US'; const st = colonyStage(state, cc); return isColonialRule(cc, st) ? st : null; };
/** The overseas territories a country rules in the year being played (not Europe's own subject nations: Ireland, Poland, Finland...). */
export const empireColonies = (state, cc) => (state?.era && OVERSEAS_EMPIRES.includes(cc) ? Object.keys(COLONIES).filter((id) => id !== cc && !HOME_REALMS.includes(id) && colonyStage(state, id)?.ruler === cc) : []);
/** Colonial work is open: you live in a colony, or your country still rules one. */
const COLONIAL_OPEN = new WeakMap();
export const colonialWorkOpen = (state) => {
  const home = state.character.posting?.home?.countryId ?? state.character.countryId ?? 'US';
  // Asked once per profession on every job list: the answer changes only with the year, where you are, and a colony going free.
  const freed = state.era?.colonies ? Object.values(state.era.colonies).reduce((n, r) => n + (r?.done?.length ?? 0), 0) : 0;
  const key = `${yearNow(state)}|${state.character.countryId}|${home}|${freed}`;
  const hit = COLONIAL_OPEN.get(state);
  if (hit?.key === key) return hit.value;
  const value = Boolean(colonialHere(state)) || empireColonies(state, home).length > 0;
  COLONIAL_OPEN.set(state, { key, value });
  return value;
};

/** The planned end year of a stage (event-ended stages: when that event happened, else never). */
export const stageEnd = (state, st) => (typeof st.until === 'number' ? st.until : state.era?.events?.[st.until]?.year ?? Infinity);

/* ------------------------------------------------------------------ */
/* Governments by year, where no period above decides                  */
/* ------------------------------------------------------------------ */

const KING = (name, leader = 'the King', o = {}) => G({ kind: 'monarchy', name, elections: 'controlled', press: 'state', surveillance: 0.06, leader, ...o });
const JUNTA = (name, leader = 'the junta', o = {}) => G({ kind: 'junta', name, elections: 'none', press: 'state', surveillance: 0.2, ratings: false, leader, ...o });
const ONE = (name, leader = 'the President', o = {}) => G({ kind: 'oneParty', name, elections: 'sham', press: 'state', surveillance: 0.15, ratings: false, leader, ...o });
const AUTH = (name, leader = 'the President', o = {}) => G({ kind: 'authoritarian', name, elections: 'controlled', press: 'state', surveillance: 0.12, leader, ...o });
const WAR = (name, leader = 'whoever holds the capital', o = {}) => G({ kind: 'fragile', name, elections: 'none', press: 'state', surveillance: 0.05, ratings: false, banking: 'domestic', leader, ...o });
const DEMO = (name, leader = 'the President', o = {}) => G({ kind: 'democracy', name, leader, ...o });
const OLIGARCHY = (name, leader = 'the President', o = {}) => G({ kind: 'hybrid', name, elections: 'controlled', press: 'free', surveillance: 0.04, leader, ...o });
const TOTAL = (name, leader, o = {}) => G({ kind: 'totalitarian', name, elections: 'sham', press: 'state', exit: 'closed', business: 'state', religion: 'restricted', surveillance: 0.35, banking: 'state', jobs: 'assigned', ratings: false, leader, ...o });
const PRECOLONIAL = (name, leader = 'the ruler') => MONARCH(name, leader, { women: 'restricted', banking: 'domestic' });
const OTTOMAN_RULE = (name) => G({ kind: 'colony', name: `${name}, ruled from Constantinople`, elections: 'none', press: 'state', leader: 'the Ottoman governor', colony: 'TR' });

/**
 * Each country's governments, oldest first, as [until, regime]: the first whose `until` is after the
 * year applies; after the last, today's government (Regimes.js). Colonial rule (COLONIES) and the
 * history-driven periods above take precedence.
 */
const TIMELINES = {
  AF: [[1826, WAR('the warring Durrani princes')], [1926, MONARCH('the Emirate of Afghanistan', 'the Emir', { women: 'restricted' })], [1973, MONARCH('the Kingdom of Afghanistan', 'the King', { women: 'restricted' })],
    [1978, AUTH('Daoud Khan\'s republic', 'President Daoud')], [1992, TOTAL('the Democratic Republic of Afghanistan, a Soviet-backed communist state at war', 'the General Secretary')],
    [1996, WAR('the civil war of the mujahideen factions')], [2001, G({ kind: 'theocracy', name: 'the Taliban\'s first Islamic Emirate', elections: 'none', press: 'state', religion: 'state', women: 'barred', alcohol: false, ratings: false, surveillance: 0.25, leader: 'the Amir al-Mu\'minin' })],
    [2021, OLIGARCHY('the Islamic Republic of Afghanistan, at war with the Taliban', 'the President', { women: 'restricted' })]],
  MX: [[1823, MONARCH('the First Mexican Empire', 'the Emperor')], [1864, WAR('a republic of coups and civil wars', 'the President (Santa Anna, as often as not)')], [1867, MONARCH('the Second Mexican Empire, under a Habsburg emperor', 'the Emperor')],
    [1876, OLIGARCHY('the Restored Republic', 'the President')], [1911, DICTATOR('the Porfiriato: Porfirio Díaz\'s dictatorship', 'President Díaz')], [1929, WAR('the Mexican Revolution and its aftermath')],
    [2000, ONE('the PRI\'s one-party state, in all but name', 'the President')]],
  AR: [[1852, DICTATOR('Rosas\'s Argentine Confederation', 'the Governor of Buenos Aires')], [1916, OLIGARCHY('a conservative oligarchic republic')], [1930, DEMO('the Radical republic')], [1943, OLIGARCHY('the Infamous Decade of rigged elections')],
    [1955, AUTH('Perón\'s government', 'President Perón')], [1973, JUNTA('a republic of coups')], [1976, AUTH('Perón\'s return')], [1983, JUNTA('the military junta of the Dirty War')]],
  CL: [[1891, OLIGARCHY('the conservative republic')], [1925, OLIGARCHY('the Parliamentary Republic')], [1973, DEMO('the Chilean republic')], [1990, DICTATOR('Pinochet\'s military dictatorship', 'General Pinochet')]],
  CO: [[1903, WAR('a republic of civil wars')], [1948, OLIGARCHY('a republic of two parties')], [1958, WAR('La Violencia')], [1974, OLIGARCHY('the National Front: the two parties take turns')]],
  GT: [[1865, DICTATOR('Carrera\'s dictatorship', 'President Carrera')], [1944, DICTATOR('the liberal dictators', 'the President')], [1954, DEMO('the October Revolution\'s democracy')], [1986, JUNTA('military rule and civil war')]],
  HT: [[1859, MONARCH('the Second Empire of Haiti', 'the Emperor')], [1915, WAR('a republic of coups')], [1934, G({ kind: 'colony', name: 'Haiti under US occupation', elections: 'controlled', press: 'state', leader: 'the American High Commissioner', colony: 'US' })],
    [1957, AUTH('a fragile republic')], [1986, DICTATOR('the Duvaliers\' dictatorship', 'the President for Life')], [2004, WAR('a republic of coups and crises')]],
  PE: [[1895, OLIGARCHY('a republic of caudillos')], [1919, OLIGARCHY('the Aristocratic Republic')], [1930, AUTH('Leguía\'s Oncenio')], [1968, OLIGARCHY('a republic of elections and coups')], [1980, JUNTA('the Revolutionary Government of the Armed Forces')]],
  VE: [[1908, AUTH('a republic of caudillos')], [1935, DICTATOR('Juan Vicente Gómez\'s dictatorship', 'General Gómez')], [1948, OLIGARCHY('a republic in transition')], [1958, JUNTA('Pérez Jiménez\'s dictatorship')], [1999, DEMO('the Punto Fijo democracy')]],
  CR: [[1948, OLIGARCHY('a coffee republic')]],
  LR: [[1980, OLIGARCHY('an Americo-Liberian republic, where only the settlers\' descendants rule')], [1990, JUNTA('Samuel Doe\'s regime')], [2003, WAR('the Liberian civil wars')]],
  TH: [[1932, MONARCH('the Kingdom of Siam', 'the King')], [1973, JUNTA('a kingdom ruled by its generals', 'the Prime Minister (a field marshal)')], [1976, DEMO('a constitutional monarchy', 'the Prime Minister')],
    [1992, OLIGARCHY('a military-guided democracy', 'the Prime Minister')], [2006, DEMO('a constitutional monarchy', 'the Prime Minister')], [2023, JUNTA('a kingdom under military-backed government', 'the Prime Minister')]],
  NP: [[1846, MONARCH('the Kingdom of Nepal', 'the King')], [1951, DICTATOR('the Rana regime: hereditary prime ministers rule in the King\'s name', 'the Rana Prime Minister')], [1960, KING('a kingdom finding a constitution')],
    [1990, MONARCH('the Panchayat system: the King rules', 'the King')], [2008, KING('a constitutional monarchy at war with Maoist rebels', 'the King')]],
  BT: [[1907, MONARCH('Bhutan under its Druk Desi and penlops', 'the Druk Desi')], [2008, MONARCH('the Kingdom of Bhutan', 'the Druk Gyalpo')]],
  ET: [[1974, MONARCH('the Ethiopian Empire', 'the Emperor')], [1991, TOTAL('the Derg, a Marxist military regime', 'the Chairman')]],
  YE: [[1918, OTTOMAN_RULE('Ottoman Yemen')], [1962, MONARCH('the Mutawakkilite Kingdom', 'the Imam')], [1990, AUTH('the Yemen Arab Republic', 'the President')], [2014, AUTH('Saleh\'s Republic of Yemen', 'President Saleh')]],
  SA: [[1932, MONARCH('the Emirate of Nejd and the Hejaz', 'the Emir')]],
  OM: [[1970, MONARCH('the Sultanate of Muscat and Oman', 'the Sultan', { exit: 'closed' })]],
  JO: [[1946, G({ kind: 'colony', name: 'the Emirate of Transjordan, a British mandate', elections: 'none', press: 'state', leader: 'the Emir', colony: 'GB' })], [1989, MONARCH('the Hashemite Kingdom of Jordan, under martial law', 'the King')]],
  IQ: [[1958, KING('the Hashemite Kingdom of Iraq', 'the King')], [1968, JUNTA('a republic of coups')], [2003, TOTAL('Saddam Hussein\'s Ba\'athist Iraq', 'the President')], [2005, WAR('Iraq under occupation')]],
  SY: [[1963, WAR('a republic of coups')], [1970, JUNTA('the Ba\'athist military committee')], [2024, TOTAL('the Assads\' dictatorship', 'the President')]],
  LY: [[1969, KING('the Kingdom of Libya', 'the King')], [2011, DICTATOR('Gaddafi\'s Jamahiriya', 'the Brotherly Leader')]],
  LB: [[1975, DEMO('a confessional republic')], [1990, WAR('the Lebanese civil war')]],
  TR: [[1950, ONE('the Kemalist one-party republic', 'the President')], [1960, DEMO('a democracy')], [1961, JUNTA('the 1960 junta')], [1980, DEMO('a democracy of coups and crises')], [1983, JUNTA('the 1980 junta')]],
  PK: [[1958, OLIGARCHY('a dominion finding its constitution', 'the Prime Minister')], [1971, JUNTA('Ayub Khan\'s and Yahya Khan\'s military rule')], [1977, DEMO('Bhutto\'s democracy', 'the Prime Minister')], [1988, JUNTA('Zia\'s military rule')], [1999, OLIGARCHY('a fragile democracy', 'the Prime Minister')], [2008, JUNTA('Musharraf\'s military rule')]],
  ID: [[1957, DEMO('the parliamentary republic')], [1966, AUTH('Sukarno\'s Guided Democracy', 'President Sukarno')], [1998, AUTH('Suharto\'s New Order', 'President Suharto')]],
  PH: [[1972, DEMO('the Philippine republic')], [1986, DICTATOR('Marcos\'s martial-law dictatorship', 'President Marcos')]],
  KR: [[1897, MONARCH('the Joseon kingdom', 'the King', { exit: 'closed' })], [1910, MONARCH('the Korean Empire', 'the Emperor')]],
  KP: [[1897, MONARCH('the Joseon kingdom', 'the King', { exit: 'closed' })], [1910, MONARCH('the Korean Empire', 'the Emperor')], [1948, G({ kind: 'colony', name: 'Korea north of the 38th parallel, under Soviet occupation', elections: 'none', press: 'state', leader: 'the Soviet Civil Administration', colony: 'RU' })]],
  VN: [[1945, MONARCH('the Nguyễn empire', 'the Emperor')], [1976, ONE('a divided Vietnam: the communist North and the authoritarian South at war', 'the President')]],
  KH: [[1953, MONARCH('the Kingdom of Cambodia', 'the King')], [1970, KING('Sihanouk\'s kingdom', 'Prince Sihanouk')], [1975, WAR('the Khmer Republic at war')], [1979, TOTAL('Democratic Kampuchea, the Khmer Rouge state', 'Brother Number One')], [1993, ONE('the Vietnamese-backed People\'s Republic')]],
  MM: [[1885, MONARCH('the Konbaung kingdom', 'the King')], [1962, DEMO('the Union of Burma')], [2011, JUNTA('military rule')], [2021, OLIGARCHY('a military-guided democracy')]],
  MY: [[1874, MONARCH('the Malay sultanates', 'the Sultan')]],
  CN: [],
  BA: [[1878, OTTOMAN_RULE('Ottoman Bosnia')], [1918, G({ kind: 'colony', name: 'Bosnia under Austria-Hungary', elections: 'none', press: 'state', leader: 'the Governor', colony: 'AT' })], [1941, KING('the Kingdom of Yugoslavia', 'the King')],
    [1945, TOTAL('the Independent State of Croatia, an Axis puppet', 'the Poglavnik')], [1992, ONE('Tito\'s Yugoslavia', 'Marshal Tito')], [1996, WAR('the Bosnian war')]],
  XK: [[1912, OTTOMAN_RULE('the Vilayet of Kosovo')], [1945, KING('the Kingdom of Serbia, then Yugoslavia', 'the King')], [1999, ONE('Kosovo under Belgrade', 'the President of Yugoslavia')], [2008, G({ kind: 'transitional', name: 'Kosovo under UN administration', elections: 'controlled', leader: 'the UN Special Representative' })]],
  GH: [[1874, PRECOLONIAL('the Asante Empire', 'the Asantehene')], [1964, DEMO('Nkrumah\'s Ghana', 'Prime Minister Nkrumah')], [1966, ONE('Nkrumah\'s one-party state')], [1992, JUNTA('a republic of coups')]],
  NG: [[1900, PRECOLONIAL('the Sokoto Caliphate and the Yoruba and Igbo states', 'the Sultan of Sokoto')], [1966, DEMO('the First Republic')], [1979, JUNTA('military rule')], [1983, DEMO('the Second Republic')], [1999, JUNTA('military rule')]],
  KE: [[1895, PRECOLONIAL('the Swahili coast and the peoples of the interior', 'the elders')], [1991, ONE('KANU\'s one-party state', 'the President')], [2002, OLIGARCHY('a multiparty republic under Moi')]],
  MW: [[1891, PRECOLONIAL('the Maravi and Ngoni chiefdoms', 'the paramount chief')], [1994, DICTATOR('Hastings Banda\'s one-party state', 'the Life President')]],
  CI: [[1893, PRECOLONIAL('the Kong Empire and the Baoulé chiefdoms', 'the king')], [1990, ONE('Houphouët-Boigny\'s one-party state')], [2011, WAR('a republic in crisis and civil war')]],
  ML: [[1892, PRECOLONIAL('the Toucouleur Empire', 'the Almamy')], [1968, ONE('Modibo Keïta\'s socialist state')], [1991, JUNTA('Moussa Traoré\'s military rule')], [2012, DEMO('the Malian republic')]],
  NE: [[1900, PRECOLONIAL('the Sultanate of Damagaram and the Tuareg confederations', 'the Sultan')], [1974, ONE('Diori\'s one-party state')], [1991, JUNTA('military rule')], [2023, OLIGARCHY('a fragile republic')]],
  TD: [[1900, PRECOLONIAL('the Sultanates of Wadai and Bornu', 'the Sultan')], [1990, WAR('a republic at war with itself')]],
  CD: [[1885, PRECOLONIAL('the Kingdom of Kongo and the Luba and Lunda states', 'the Mani Kongo')], [1965, WAR('the Congo crisis')], [1997, DICTATOR('Mobutu\'s Zaire', 'President Mobutu')], [2003, WAR('the Congo wars')]],
  CF: [[1894, PRECOLONIAL('the sultanates of the savanna', 'the Sultan')], [1966, ONE('Dacko\'s one-party state')], [1979, DICTATOR('Bokassa\'s regime (an empire from 1976)', 'Bokassa')]],
  SO: [[1889, PRECOLONIAL('the Somali sultanates', 'the Sultan')], [1969, DEMO('the Somali Republic')], [1991, DICTATOR('Siad Barre\'s regime', 'President Barre')], [2012, WAR('Somalia without a national government')]],
  DJ: [[1884, PRECOLONIAL('the Afar sultanates', 'the Sultan')], [1999, ONE('Gouled\'s one-party state')]],
  SD: [[1885, G({ kind: 'colony', name: 'the Turkiyya: Sudan under Egyptian rule', elections: 'none', press: 'state', leader: 'the Governor-General', colony: 'EG' })], [1899, G({ kind: 'theocracy', name: 'the Mahdist state', elections: 'none', press: 'state', religion: 'state', alcohol: false, leader: 'the Khalifa' })],
    [1969, OLIGARCHY('a republic of coups')], [1985, DICTATOR('Nimeiry\'s regime')], [1989, DEMO('a brief democracy')], [2019, AUTH('Bashir\'s military-Islamist regime', 'President Bashir')]],
  SS: [[1956, G({ kind: 'colony', name: 'southern Sudan, ruled from Khartoum', elections: 'none', press: 'state', leader: 'the Governor', colony: 'GB' })], [2011, WAR('southern Sudan at war with Khartoum')]],
  MA: [[1912, MONARCH('the Sultanate of Morocco', 'the Sultan')], [1999, MONARCH('Hassan II\'s kingdom: the Years of Lead', 'the King')]],
  TO: [[1875, MONARCH('the Tongan kingdom', 'the King')], [2010, KING('a kingdom where the nobles hold the parliament', 'the King')]],
  ES: [[1923, OLIGARCHY('the Restoration monarchy of rigged elections', 'the Prime Minister')], [1931, DICTATOR('Primo de Rivera\'s dictatorship', 'General Primo de Rivera')], [1936, DEMO('the Second Republic', 'the President')], [1939, WAR('the Spanish Civil War')]],
  GR: [[1832, OTTOMAN_RULE('Ottoman Greece')], [1924, KING('the Kingdom of Greece')], [1935, DEMO('the Second Hellenic Republic')], [1936, KING('the restored Kingdom of Greece', 'the Prime Minister')], [1941, DICTATOR('Metaxas\'s dictatorship, under the King', 'General Metaxas')], [1945, G({ kind: 'colony', name: 'Greece under Axis occupation', elections: 'none', press: 'state', leader: 'the occupation authorities', colony: 'DE' })], [1967, KING('the Kingdom of Greece, after its civil war')], [1974, JUNTA('the Regime of the Colonels')]],
  PT: [[1910, KING('the Kingdom of Portugal')], [1926, WAR('the First Republic of coups and crises')]],
  EG: [[1953, KING('the Kingdom of Egypt, under British influence', 'the King')]],
  IR: [],
};
for (const [cc, rows] of Object.entries(TIMELINES)) if (!rows.length) delete TIMELINES[cc];
/** Today's kingdoms (their crowns stood through any military or one-party rule). */
const TODAY_CROWNS = ['GB', 'JP', 'SE', 'NL', 'ES', 'NO', 'DK', 'BE', 'LU', 'TH', 'MY', 'BN', 'KH', 'BT', 'TO', 'JO', 'SA', 'MA', 'KW', 'QA', 'BH', 'AE', 'OM'];
/** A monarch's title where the data says a crown ruled and no period above names one. */
const CROWN_TITLE = { JP: 'the Emperor', CN: 'the Emperor', ET: 'the Emperor', VN: 'the Emperor', KR: 'the King', TR: 'the Sultan', MA: 'the Sultan', OM: 'the Sultan', BN: 'the Sultan', MY: 'the Sultan',
  IR: 'the Shah', AF: 'the Emir', KW: 'the Emir', QA: 'the Emir', BH: 'the Emir', AE: 'the rulers of the emirates', LU: 'the Grand Duke', BT: 'the Druk Gyalpo', RU: 'the Tsar', AT: 'the Emperor', DE: 'the King of Prussia' };
/**
 * A government from the data (Anckar & Fredriksson's regime of each country-year), for the years
 * no period or timeline above describes.
 */
export function dataRegimeAt(cc, y) {
  if (y >= PRESENT - 10) return null;
  const d = dataRegime(cc, y);
  if (!d) return null;
  const crown = CROWN_TITLE[cc] ?? 'the King';
  // Generals, dictators or one party ruling under a king (Thailand, Japan, Iran, Nepal…).
  const crowned = periodThrone(cc, y) || (TODAY_CROWNS.includes(cc) && !republicGap(cc, y) && !(cc === 'KH' && y >= 1970 && y < 1993));
  if (crowned && ['mil', 'pers', 'oneparty', 'multiauth', 'olig'].includes(d.cat)) {
    if (d.cat === 'mil') return JUNTA('a kingdom ruled by its generals', 'the Prime Minister (a general)');
    if (d.cat === 'pers') return KING(`a kingdom ruled by ${crown === 'the King' ? 'the King\'s strongman' : 'a strongman'}`, 'the Prime Minister');
    if (d.cat === 'oneparty') return KING('a kingdom ruled by a single party', 'the Prime Minister');
    return KING('a kingdom with a managed parliament', 'the Prime Minister');
  }
  switch (d.cat) {
    case 'parl': return d.democracy ? DEMO(d.monarchy ? 'a parliamentary monarchy' : 'a parliamentary republic', 'the Prime Minister') : d.monarchy ? KING('a monarchy whose parliament is chosen by a narrow electorate', 'the Prime Minister') : OLIGARCHY('a parliamentary republic with a narrow franchise', 'the Prime Minister');
    case 'pres': if (cc === 'CH') return DEMO('the Swiss Confederation, governed by its Federal Council', 'the Federal Council');
      return d.democracy ? DEMO('a presidential republic', 'the President') : OLIGARCHY('a presidential republic with a narrow franchise', 'the President');
    case 'semi': return d.democracy ? DEMO('a semi-presidential republic', 'the President') : OLIGARCHY('a semi-presidential republic with a narrow franchise', 'the President');
    case 'absmon': return MONARCH('an absolute monarchy', crown);
    case 'semimon': return KING('a monarchy where the crown still governs', crown);
    case 'monolig': return KING('a monarchy ruled by its nobility', crown);
    case 'olig': return OLIGARCHY('an oligarchic republic', 'the President');
    case 'mil': return JUNTA('military rule', 'the junta');
    case 'pers': return DICTATOR('a personal dictatorship', 'the dictator');
    case 'oneparty': return ONE('a one-party state', 'the party leader');
    case 'multiauth': return AUTH('an authoritarian state with token opposition parties', 'the President');
    default: return null;
  }
}
/** A republic's presidency exists in the year being played: the country is sovereign and has no crown (the regime data). */
export function presidencyInEra(state, cc) {
  if (!state?.era) return true;
  const y = yearNow(state);
  if (y >= PRESENT - 10) return true;
  if (colonyStage(state, cc)) return false;
  const d = dataRegime(cc, y);
  return d ? !d.monarchy : !periodThrone(cc, y);
}

/** A city's own state before unification or after a split (HistoricalData REGION_STATES), as a government. */
export function regionRegimeAt(regionId, y) {
  const r = regionStateAt(regionId, y);
  if (!r) return null;
  const by = { monarchy: () => KING(r.name, r.leader), absolute: () => MONARCH(r.name, r.leader), city: () => OLIGARCHY(r.name, r.leader), republic: () => OLIGARCHY(`${r.name}, a republic where only white men vote`, r.leader),
    colony: () => G({ kind: 'monarchy', name: r.name, elections: 'controlled', press: 'state', leader: r.leader }), eastbloc: () => ({ ...EAST_BLOC, name: r.name, leader: r.leader }), authoritarian: () => AUTH(r.name, r.leader) };
  return by[r.kind]?.() ?? null;
}

/** A country's government from its timeline in a year, or null. */
export function timelineRegime(cc, y) {
  const row = TIMELINES[cc]?.find(([until]) => y < until);
  return row ? { ...row[1] } : null;
}

/** Every country's era regime now: { [cc]: regime }. Colonies over periods. */
export function eraLayer(state) {
  const out = {};
  if (!state?.era || yearNow(state) >= PRESENT) return out;
  for (const p of PERIODS) if (p.active(state)) for (const cc of p.cc) out[cc] = { ...p.regime };
  const y = yearNow(state);
  for (const cc of Object.keys(TIMELINES)) if (!out[cc]) { const r = timelineRegime(cc, y); if (r) out[cc] = r; }
  // Everywhere else, the regime data (until a decade ago; then today's government).
  for (const cc of DATA_COUNTRIES) if (!out[cc] && !colonyStage(state, cc)) { const r = dataRegimeAt(cc, y); if (r) out[cc] = r; }
  for (const cc of Object.keys(COLONIES)) {
    const st = colonyStage(state, cc);
    if (!st) continue;
    if (st.ruler === 'RU' && out.RU?.kind === 'totalitarian') { out[cc] = { ...out.RU, name: `${st.name}, a Soviet republic ruled from Moscow` }; continue; }
    out[cc] = G({ kind: 'colony', name: `${st.name}, ruled from ${RULER_CAPITAL[st.ruler] ?? 'abroad'}`, elections: 'none', press: 'state', surveillance: 0.08, leader: st.leader ?? 'the Governor', colony: st.ruler });
  }
  // Your own city's state, where it wasn't yet (or no longer) the country's: Bavaria, the Two Sicilies, East Germany.
  const here = state.character?.countryId ?? 'US';
  const local = state.character?.regionId ? regionRegimeAt(state.character.regionId, y) : null;
  if (local) out[here] = local;
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
  if (!state?.era) return 1;
  // In the past, adults died younger (life expectancy then and now, by country: HistoricalData).
  const y = yearNow(state);
  // The diseases of the day are rolled one by one now (health/PeriodHealth.js); the rest of the
  // past's excess deaths stays in this factor (about two-thirds of it).
  const raw = y < PRESENT - 10 ? eraMortality(state.character?.countryId ?? 'US', y, age) : 1;
  const past = 1 + (raw - 1) * 0.65;
  if (age < 50) return past;
  return past * (futureOn(state, 'longevity') ? 0.75 : 1) * (futureOn(state, 'agingTherapy') ? 0.6 : 1);
}

/** The money of the day where you live (francs before the euro, the old peso, the Reichsmark). */
export function periodCurrency(cc, currency) {
  if (ERA_YEAR >= PRESENT) return currency;
  // Your city's own state had its own money (the gulden in Munich, the ducat in Naples).
  const s = ERA_STATE;
  if (s && cc === (s.character?.countryId ?? 'US') && s.character?.regionId) {
    const local = regionStateAt(s.character.regionId, ERA_YEAR);
    if (local?.currency && currency) { const [code, symbol, name, perModern, fx] = local.currency; return ofTheDay({ code, symbol, name, perUsd: perModern == null ? null : currency.perUsd * perModern, perModern, fx }, currency); }
  }
  return ofTheDay(dataCurrency(cc, ERA_YEAR, currency), currency);
}
/**
 * Money of the day: before 1914 (or where no fixed rate links an old currency to today's), today's
 * dollars are deflated to that year's prices and converted at the period exchange rate (the gold
 * parity), so a labourer's wage in 1850 Munich reads as a few hundred gulden, not tens of thousands.
 */
function ofTheDay(c, modern) {
  if (!c || c === modern) return c;
  if (c.fx != null && (ERA_YEAR < 1914 || c.perModern == null)) return { code: c.code, symbol: c.symbol, name: c.name, perUsd: c.fx * priceIndex(ERA_YEAR), ofTheDay: true };
  return c.perUsd == null ? modern : { code: c.code, symbol: c.symbol, name: c.name, perUsd: c.perUsd };
}
/** The money where you are is shown as it was then (prices of the day), not in today's value. */
export const moneyOfTheDay = (state) => Boolean(periodCurrency(state?.character?.countryId ?? 'US', { perUsd: 1 })?.ofTheDay);

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
  if (p.colonial && !colonialWorkOpen(state)) return true;
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

/**
 * A credential can exist years before employers ask for it: driving licences were issued from the
 * 1910s, but nobody hired a policeman, a postman or a lorry driver on condition of one until the
 * licence was universal. Before these years a job doesn't require it.
 */
const REQUIRED_FROM = { driverLicense: 1950, learnerPermit: 1950, motorcycle: 1960 };
/** Does a job in this year require this credential? */
export const credentialRequired = (state, id) => credentialExists(state, id) && !(REQUIRED_FROM[id] > yearNow(state));
/** Civil-service entrance exams: Britain from 1870 (Northcote–Trevelyan), the US federal service from 1883 (Pendleton), cities and states from about 1900. Before, jobs went by patronage. */
const EXAM_FROM = { municipal: 1900, publicSafety: 1900, state: 1905, federal: 1883, foreignService: 1924 };
export const examRequired = (state, examId) => {
  const y = yearNow(state);
  if ((state.character.countryId ?? 'US') === 'GB' && examId !== 'foreignService') return y >= 1870;
  return !(EXAM_FROM[examId] > y);
};
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
/** Licences of their day, abolished or replaced later (the Board of Trade certificates gave way to STCW, the chauffeur's licence to the ordinary one). */
export const CREDENTIAL_UNTIL = {
  indentures: 1970, hackneyLicence: 1930, chauffeurLicence: 1965, mateCertificate: 1984, mastersCertificate: 1984, wirelessOperator: 1995, telegraphist: 1975,
  shotfirer: 1995, mineManager: 1995, apothecary: 1907, teachersCertificate: 1975, pitmanShorthand: 1995, publican: 2005, dockRegistration: 1989,
};
Object.assign(CREDENTIAL_FROM, {
  indentures: 1800, hackneyLicence: 1838, chauffeurLicence: 1903, mateCertificate: 1850, mastersCertificate: 1850, wirelessOperator: 1912, telegraphist: 1850,
  shotfirer: 1872, mineManager: 1872, apothecary: 1815, midwife: 1902, teachersCertificate: 1846, pitmanShorthand: 1870, pedlar: 1871, publican: 1800, dockRegistration: 1947,
});
/** Did this licence or certification exist in the year you're living in? */
export const credentialExists = (state, id) => !(CREDENTIAL_FROM[id] > yearNow(state)) && !(CREDENTIAL_UNTIL[id] <= yearNow(state));
/** Before the 1940s most working people had left school at 14: a high-school diploma wasn't asked for. */
export const diplomaExpected = (state) => yearNow(state) >= 1945;
/** Before 1900 jobs and licences asked for no degree (apprenticeship, reading law, patronage). */
export const DEGREES_FROM = 1900;
export const degreesOptional = (state) => yearNow(state) < DEGREES_FROM;

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
  if (uni && state.character.gender === 'female') { const g = UNI_GATE ? UNI_GATE(state) : y < 1870 ? 'Universities don\'t admit women yet' : null; if (g) return g; }
  return null;
}
/** The age most children left school in this year (14 before the 1940s; 12 before the 1880s). */
// The place's own laws register themselves (education/SchoolingOfTheDay.js); Eras stays a leaf.
let LEAVING_HERE = null;
let UNI_GATE = null;
export const setLeavingAge = (fn) => { LEAVING_HERE = fn; };
export const setUniversityGate = (fn) => { UNI_GATE = fn; };
export const leavingAge = (state) => (LEAVING_HERE ? LEAVING_HERE(state) : yearNow(state) < 1880 ? 12 : yearNow(state) < 1945 ? 14 : null);
/** The GI Bill (1944) and federal student loans (1958). */
export const giBillExists = (state) => yearNow(state) >= 1944;
export const studentLoansExist = (state) => yearNow(state) >= 1958;

/* ------------------------------------------------------------------ */
/* Ranks and titles of their time                                      */
/* ------------------------------------------------------------------ */

/** The year of the life being played, for code that has no state to hand (rank tables, job titles). Set by History. */
let ERA_YEAR = PRESENT;
export const setEraYear = (y) => { ERA_YEAR = y ?? PRESENT; setDataYear(ERA_YEAR < PRESENT ? ERA_YEAR : 9999); };
export const eraYear = () => ERA_YEAR;

/** Job titles as they were: [pattern, replacement, until]. */
const OLD_TITLES = [
  [/\bAccountant\b/, 'Bookkeeper', 1880], [/\bPharmacist\b/, 'Apothecary', 1870], [/\bReal Estate Agent\b/, 'Land Agent', 1900], [/\bVeterinarian\b/, 'Horse Doctor', 1880],
  [/\bPsychiatrist\b/, 'Alienist', 1920], [/\bSocial Worker\b/, 'Almoner', 1930], [/\bChef\b/, 'Cook', 1900], [/\bTruck Driver\b/, 'Carter', 1920], [/\bBus Driver\b/, 'Omnibus Driver', 1930],
  [/\bSales Associate\b/, 'Shop Assistant', 1980], [/\bCashier\b/, 'Shop Clerk', 1920], [/\bPhotographer\b/, 'Daguerreotypist', 1860], [/\bNurse Practitioner\b/, 'Nurse', 1970],
  [/\bTeacher\b/, 'Schoolteacher', 1900],
  [/\bPolice Officer\b/, 'Patrolman', 1975], [/\bPolice Recruit\b/, 'Probationary Patrolman', 1975], [/\bFirefighter\b/, 'Fireman', 1975],
  [/\bFlight Attendant\b/, 'Stewardess', 1975], [/\bCDL Driver Trainee\b/, 'Driver\'s Mate', 1986], [/\bCDL /, '', 1986], [/\bPatrolman\b/, 'Constable', 1890], [/\bProbationary Patrolman\b/, 'Probationary Constable', 1890], [/\bServer\b/, 'Waiter', 1990], [/\bMail Carrier\b/, 'Mailman', 1980], [/\bLetter Carrier\b/, 'Postman', 1980],
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
  // The United States: no admirals before 1862, no lieutenant-generals between Washington and Grant.
  ['US', 'navy', 'officer', 4, 'Master Commandant', 1838], ['US', 'navy', 'officer', 0, 'Passed Midshipman', 1862], ['US', 'navy', 'officer', 3, 'Lieutenant', 1862],
  ['US', 'navy', 'officer', 7, 'Flag Officer', 1862], ['US', 'navy', 'officer', 8, 'Flag Officer', 1864], ['US', 'navy', 'officer', 9, 'Flag Officer', 1866], ['US', 'navy', 'officer', 1, 'Master', 1883],
  ['US', 'army', 'officer', 8, 'Major General', 1864], ['US', 'army', 'officer', 9, 'Major General', 1866], ['US', 'army', 'enlisted', 2, 'Private', 1920],
  ['US', 'marines', 'enlisted', 1, 'Private', 1958], ['US', 'marines', 'enlisted', 2, 'Private First Class', 1958], ['US', 'marines', 'officer', 9, 'Major General', 1945],
  // Britain: ensigns until 1871, brigadier-generals until 1922, colour-sergeants before warrant officers.
  ['GB', 'army', 'officer', 0, 'Ensign', 1871], ['GB', 'army', 'officer', 0, 'Sub-Lieutenant', 1877], ['GB', 'army', 'officer', 6, 'Brigadier-General', 1922], ['GB', 'army', 'officer', 6, 'Colonel-Commandant', 1928],
  ['GB', 'army', 'enlisted', 6, 'Sergeant Major', 1881], ['GB', 'army', 'enlisted', 5, 'Colour Sergeant', 1915], ['GB', 'army', 'enlisted', 7, 'Regimental Sergeant Major', 1915], ['GB', 'army', 'enlisted', 8, 'Regimental Sergeant Major', 2015],
  ['GB', 'navy', 'officer', 1, 'Mate', 1861], ['GB', 'navy', 'enlisted', 0, 'Ordinary Seaman', 1999], ['GB', 'navy', 'enlisted', 1, 'Able Seaman', 1999], ['GB', 'navy', 'enlisted', 2, 'Leading Seaman', 1999],
  ['GB', 'navy', 'enlisted', 6, 'Chief Petty Officer', 1970], ['GB', 'navy', 'enlisted', 5, 'Chief Petty Officer', 2004],
  // Russia: the Tsar's army, the Red Army's commanders without ranks, the commanders' ranks of 1935–40.
  ['RU', 'army', 'officer', 0, 'Praporshchik (Ensign)', 1917], ['RU', 'army', 'officer', 1, 'Podporuchik', 1917], ['RU', 'army', 'officer', 2, 'Poruchik', 1917], ['RU', 'army', 'officer', 3, 'Shtabs-Kapitan', 1917],
  ['RU', 'army', 'officer', 4, 'Major', 1884], ['RU', 'army', 'officer', 4, 'Kapitan', 1917], ['RU', 'army', 'officer', 5, 'Podpolkovnik', 1917], ['RU', 'army', 'officer', 6, 'Polkovnik', 1917],
  ['RU', 'army', 'officer', 7, 'General-Major', 1917], ['RU', 'army', 'officer', 8, 'General-Leytenant', 1917], ['RU', 'army', 'officer', 9, 'General of Infantry', 1917],
  ['RU', 'army', 'enlisted', 0, 'Ryadovoy', 1917], ['RU', 'army', 'enlisted', 1, 'Yefreytor', 1917], ['RU', 'army', 'enlisted', 2, 'Junior Unter-Ofitser', 1917], ['RU', 'army', 'enlisted', 3, 'Senior Unter-Ofitser', 1917],
  ['RU', 'army', 'enlisted', 4, 'Feldfebel', 1917], ['RU', 'army', 'enlisted', 5, 'Podpraporshchik', 1917], ['RU', 'army', 'enlisted', 6, 'Zauryad-Praporshchik', 1917],
  ['RU', 'army', 'officer', 0, 'Komvzvoda (Platoon Commander)', 1935], ['RU', 'army', 'officer', 1, 'Komvzvoda (Platoon Commander)', 1935], ['RU', 'army', 'officer', 2, 'Pomkomroty (Deputy Company Commander)', 1935],
  ['RU', 'army', 'officer', 3, 'Komroty (Company Commander)', 1935], ['RU', 'army', 'officer', 4, 'Kombat (Battalion Commander)', 1935], ['RU', 'army', 'officer', 5, 'Pomkompolka (Deputy Regimental Commander)', 1935],
  ['RU', 'army', 'officer', 6, 'Kompolka (Regimental Commander)', 1935], ['RU', 'army', 'officer', 7, 'Kombrig', 1940], ['RU', 'army', 'officer', 8, 'Komdiv', 1940], ['RU', 'army', 'officer', 9, 'Komkor', 1940],
  ['RU', 'army', 'officer', 0, 'Lieutenant', 1937], ['RU', 'army', 'officer', 5, 'Major', 1939],
  ['RU', 'army', 'enlisted', 0, 'Krasnoarmeyets (Red Army Man)', 1946], ['RU', 'army', 'enlisted', 1, 'Krasnoarmeyets (Red Army Man)', 1940], ['RU', 'army', 'enlisted', 2, 'Otdelyonny (Section Leader)', 1940],
  ['RU', 'army', 'enlisted', 3, 'Pomkomvzvoda (Deputy Platoon Leader)', 1940], ['RU', 'army', 'enlisted', 6, 'Starshina', 1972], ['RU', 'army', 'enlisted', 7, 'Starshina', 1981], ['RU', 'army', 'enlisted', 8, 'Starshina', 1981],
  ['RU', 'navy', 'officer', 9, 'Admiral of the Fleet', 1917], ['RU', 'navy', 'officer', 3, 'Lieutenant', 1917],
  // Germany: no brigadier-generals before the Bundeswehr; a general "of the infantry" and a Generaloberst.
  ['DE', 'army', 'officer', 6, 'Generalmajor', 1956], ['DE', 'army', 'officer', 7, 'Generalleutnant', 1956], ['DE', 'army', 'officer', 8, 'General der Infanterie', 1956], ['DE', 'army', 'officer', 9, 'Generaloberst', 1956],
  ['DE', 'army', 'officer', 0, 'Sekondeleutnant', 1899], ['DE', 'army', 'officer', 1, 'Premierleutnant', 1899],
  ['DE', 'navy', 'officer', 6, 'Kommodore', 1956],
  // France: corps and army generals were appointments, not ranks, until 1939.
  ['FR', 'army', 'officer', 8, 'Général de division (commandant de corps d\'armée)', 1939], ['FR', 'army', 'officer', 9, 'Général de division (commandant d\'armée)', 1939],
  ['FR', 'army', 'officer', 3, 'Chef de bataillon', 1880], ['FR', 'army', 'enlisted', 8, 'Adjudant-chef', 1975],
  // Japan's imperial forces.
  ['JP', 'army', 'officer', 0, 'Shōi (Second Lieutenant)', 1945], ['JP', 'army', 'officer', 1, 'Chūi (First Lieutenant)', 1945], ['JP', 'army', 'officer', 2, 'Tai-i (Captain)', 1945], ['JP', 'army', 'officer', 3, 'Shōsa (Major)', 1945],
  ['JP', 'army', 'officer', 4, 'Chūsa (Lieutenant Colonel)', 1945], ['JP', 'army', 'officer', 5, 'Taisa (Colonel)', 1945], ['JP', 'army', 'officer', 6, 'Shōshō (Major General)', 1945], ['JP', 'army', 'officer', 7, 'Chūjō (Lieutenant General)', 1945],
  ['JP', 'army', 'officer', 8, 'Taishō (General)', 1945], ['JP', 'army', 'officer', 9, 'Gensui (Field Marshal)', 1945],
  ['JP', 'navy', 'officer', 6, 'Shōshō (Rear Admiral)', 1945], ['JP', 'navy', 'officer', 7, 'Chūjō (Vice Admiral)', 1945], ['JP', 'navy', 'officer', 8, 'Taishō (Admiral)', 1945], ['JP', 'navy', 'officer', 9, 'Gensui (Fleet Admiral)', 1945],
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
/** A service's name in its day: the Red Army, the Kaiser's army, the Wehrmacht, the Grande Armée. [nation, branch, name, until] */
const OLD_BRANCHES = [
  ['RU', 'army', 'Imperial Russian Army', 1918], ['RU', 'army', 'Red Army', 1946], ['RU', 'army', 'Soviet Army', 1992], ['RU', 'navy', 'Imperial Russian Navy', 1918], ['RU', 'navy', 'Soviet Navy', 1992], ['RU', 'airforce', 'Soviet Air Forces', 1992],
  ['DE', 'army', 'Prussian Army', 1871], ['DE', 'army', 'Imperial German Army', 1919], ['DE', 'army', 'Reichswehr', 1935], ['DE', 'army', 'Wehrmacht (Heer)', 1946],
  ['DE', 'navy', 'Prussian Navy', 1871], ['DE', 'navy', 'Imperial German Navy (Kaiserliche Marine)', 1919], ['DE', 'navy', 'Reichsmarine', 1935], ['DE', 'navy', 'Kriegsmarine', 1946], ['DE', 'airforce', 'Luftwaffe of the Wehrmacht', 1946],
  ['FR', 'army', 'Grande Armée', 1815], ['FR', 'army', 'Armée française', 1945],
  ['IT', 'army', 'Regio Esercito (Royal Army)', 1946], ['IT', 'navy', 'Regia Marina (Royal Navy)', 1946], ['IT', 'airforce', 'Regia Aeronautica', 1946],
  ['JP', 'army', 'Imperial Japanese Army', 1946], ['JP', 'navy', 'Imperial Japanese Navy', 1946],
  ['US', 'airforce', 'U.S. Army Air Forces', 1947], ['IN', 'army', 'British Indian Army', 1947], ['AU', 'army', 'Australian Military Forces', 1980],
];
export function periodBranch(nation, branch, name) {
  if (ERA_YEAR >= PRESENT) return name;
  return OLD_BRANCHES.find(([n, b, , until]) => n === (nation ?? 'US') && b === branch && ERA_YEAR < until)?.[2] ?? name;
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

/** Stars on the US flag in a year (it changes on the 4th of July after a state joins). */
const US_STARS = [[1795, 15], [1818, 20], [1819, 21], [1820, 23], [1822, 24], [1836, 25], [1837, 26], [1845, 27], [1846, 28], [1847, 29], [1848, 30], [1851, 31], [1858, 32], [1859, 33], [1861, 34], [1863, 35], [1865, 36], [1867, 37], [1877, 38], [1890, 43], [1891, 44], [1896, 45], [1908, 46], [1912, 48], [1959, 49], [1960, 50]];
export const usStars = (y) => US_STARS.filter(([from]) => from <= y).at(-1)?.[1] ?? 15;

/**
 * The flag flown in the year being played, as { id } for a historical flag drawn by the game
 * (ui/Flags.js) or { img: cc } for a country's flag image (icons/flags, from flag-icons, MIT).
 * A colony flies its ruler's flag of the day. Loose history decides: if the Soviet Union never
 * falls in this world, the red flag keeps flying.
 */
export function periodFlag(state, cc) {
  if (!state?.era || yearNow(state) >= PRESENT) return { img: cc };
  const y = yearNow(state);
  // Your own city's state flies its own flag (Bavaria's lozenges, the Transvaal's Vierkleur).
  if (cc === (state.character?.countryId ?? 'US') && state.character?.regionId) {
    const local = regionStateAt(state.character.regionId, y);
    if (local?.flag) return local.flag.length === 2 ? { img: local.flag.toUpperCase() } : { id: local.flag };
  }
  const st = colonyStage(state, cc);
  if (st && st.ruler !== cc) return periodFlag(state, st.ruler);
  const ussr = hap(state, 'russianRevolution') && !hap(state, 'sovietCollapse');
  switch (cc) {
    case 'US': return y < 1960 ? { id: 'usStars', n: usStars(y) } : { img: cc };
    case 'GB': return y < 1801 ? { id: 'gbPre1801' } : { img: cc };
    case 'RU': return ussr ? { id: 'ussr' } : { img: cc };
    case 'UA': case 'BY': case 'KZ': case 'UZ': case 'GE': case 'AM': case 'AZ': case 'KG': case 'TJ': case 'TM': case 'MD':
      return ussr && y >= 1922 ? { id: 'ussr' } : y < 1917 ? { img: 'RU' } : { img: cc };
    case 'EE': case 'LV': case 'LT': return ussr && y >= 1940 ? { id: 'ussr' } : y < 1918 ? { img: 'RU' } : { img: cc };
    case 'FI': return y < 1917 ? { img: 'RU' } : { img: cc };
    case 'DE': return !hap(state, 'germanUnification') ? { id: 'prussia' } : y < 1919 || (y >= 1933 && y < 1946) ? { id: 'germanEmpire' } : { img: cc };
    case 'IT': return y < 1848 ? { id: 'sardinia' } : y < 1946 ? { id: 'italyKingdom' } : { img: cc };
    case 'FR': return y >= 1815 && y < 1830 ? { id: 'bourbon' } : { img: cc };
    case 'CN': return !hap(state, 'xinhai') ? { id: 'qing' } : y < 1928 ? { id: 'fiveRaces' } : !hap(state, 'prc') ? { img: 'TW' } : { img: cc };
    case 'IR': return y < 1979 ? { id: 'iranLionSun' } : { img: cc };
    case 'CA': return y < 1965 ? { id: 'redEnsign' } : { img: cc };
    case 'ZA': return y < 1928 ? { id: 'redEnsign' } : y < 1994 ? { id: 'southAfrica1928' } : { img: cc };
    case 'BR': return y < 1889 ? { id: 'brazilEmpire' } : { img: cc };
    case 'EG': return y >= 1922 && y < 1953 ? { id: 'egyptKingdom' } : { img: cc };
    case 'PT': return y < 1910 ? { id: 'portugalMonarchy' } : { img: cc };
    case 'LY': return y >= 1977 && y < 2011 ? { id: 'libyaGreen' } : { img: cc };
    case 'CZ': case 'SK': return y < 1918 ? { img: 'AT' } : y < 1993 ? { img: 'CZ' } : { img: cc };
    case 'HR': case 'SI': case 'BA': return y < 1918 ? { img: 'AT' } : y < 1991 ? { id: 'yugoslavia' } : { img: cc };
    case 'RS': case 'MK': case 'ME': return y >= 1918 && y < 1991 ? { id: 'yugoslavia' } : { img: cc };
    case 'PL': return y < 1918 ? { img: 'RU' } : { img: cc };
    case 'IE': return y < 1922 ? { img: 'GB' } : { img: cc };
    case 'BD': return y >= 1947 && y < 1971 ? { img: 'PK' } : { img: cc };
    case 'KR': case 'KP': return y >= 1910 && y < 1945 ? { img: 'JP' } : y < 1948 ? { img: 'KR' } : { img: cc };
    case 'VN': return y >= 1887 && y < 1945 ? { img: 'FR' } : { img: cc };
    case 'YE': return y < 1918 ? { img: 'TR' } : { img: cc };
    case 'HU': return y < 1918 ? { img: 'AT' } : { img: cc };
    default: return { img: cc };
  }
}

/** A country's name in the year being played: the Russian Empire, the Soviet Union, Prussia, Siam, Ceylon. */
export function periodCountryName(state, cc, name) {
  if (!state?.era || yearNow(state) >= PRESENT) return name;
  const y = yearNow(state);
  if (cc === (state.character?.countryId ?? 'US') && state.character?.regionId) {
    const local = regionStateAt(state.character.regionId, y);
    if (local) return local.name;
  }
  // A colony goes by its colonial name (British India, French Algeria, the Gold Coast).
  const st = colonyStage(state, cc);
  if (st && st.ruler !== cc && st.name) return st.name;
  const ussr = hap(state, 'russianRevolution') && !hap(state, 'sovietCollapse');
  const soviet = (ssr) => (ussr && y >= 1922 ? `the Soviet Union (${ssr})` : null);
  const R = {
    RU: y < 1917 ? 'the Russian Empire' : ussr ? (y < 1922 ? 'Soviet Russia' : 'the Soviet Union') : null,
    UA: soviet('the Ukrainian SSR') ?? (y < 1917 ? 'the Russian Empire (Ukraine)' : null), BY: soviet('the Byelorussian SSR'), KZ: soviet('the Kazakh SSR'), UZ: soviet('the Uzbek SSR'), GE: soviet('the Georgian SSR'),
    AM: soviet('the Armenian SSR'), AZ: soviet('the Azerbaijan SSR'), EE: y >= 1940 ? soviet('the Estonian SSR') : y < 1918 ? 'the Russian Empire (Estonia)' : null, LV: y >= 1940 ? soviet('the Latvian SSR') : null, LT: y >= 1940 ? soviet('the Lithuanian SSR') : null,
    FI: y < 1917 ? 'the Grand Duchy of Finland (Russian Empire)' : null,
    DE: !hap(state, 'germanUnification') ? 'Prussia (the German Confederation)' : y < 1919 ? 'the German Empire' : y < 1933 ? 'the Weimar Republic' : y < 1945 ? 'Nazi Germany' : y < 1949 ? 'Allied-occupied Germany' : y < 1990 ? 'West Germany' : null,
    IT: !hap(state, 'italianUnification') ? 'the Kingdom of Sardinia (the Italian states)' : y < 1946 ? 'the Kingdom of Italy' : null,
    JP: !hap(state, 'meiji') ? 'Tokugawa Japan' : y < 1947 ? 'the Empire of Japan' : null,
    CN: !hap(state, 'xinhai') ? 'Qing China' : !hap(state, 'prc') ? 'the Republic of China' : null,
    TR: !hap(state, 'ottomanEnd') ? 'the Ottoman Empire' : null,
    IR: y < 1935 ? 'Persia' : y < 1979 ? 'Imperial Iran' : null,
    AT: y < 1867 ? 'the Austrian Empire' : y < 1918 ? 'Austria-Hungary' : y >= 1938 && y < 1945 ? 'Austria (annexed to Germany)' : null,
    HU: y >= 1867 && y < 1918 ? 'Austria-Hungary (Kingdom of Hungary)' : null,
    CZ: y < 1918 ? 'Austria-Hungary (Bohemia)' : y < 1993 ? 'Czechoslovakia' : null, SK: y < 1918 ? 'Austria-Hungary (Upper Hungary)' : y < 1993 ? 'Czechoslovakia' : null,
    HR: y >= 1918 && y < 1991 ? 'Yugoslavia' : null, SI: y >= 1918 && y < 1991 ? 'Yugoslavia' : null, BA: y >= 1918 && y < 1992 ? 'Yugoslavia' : null, MK: y >= 1918 && y < 1991 ? 'Yugoslavia' : null,
    RS: y >= 1918 && y < 1992 ? 'Yugoslavia' : y >= 1992 && y < 2006 ? 'Serbia and Montenegro' : null, ME: y >= 1918 && y < 1992 ? 'Yugoslavia' : y < 2006 && y >= 1992 ? 'Serbia and Montenegro' : null,
    PL: y < 1918 ? 'Congress Poland (Russian Empire)' : y >= 1945 && y < 1989 ? "the Polish People's Republic" : null,
    GB: y < 1801 ? 'the Kingdom of Great Britain' : y < 1922 ? 'the United Kingdom of Great Britain and Ireland' : null,
    IE: y < 1922 ? 'Ireland (United Kingdom)' : y < 1937 ? 'the Irish Free State' : null,
    BR: y < 1889 ? 'the Empire of Brazil' : null, ZA: y >= 1910 && y < 1961 ? 'the Union of South Africa' : null,
    LK: y < 1972 ? 'Ceylon' : null, MM: y < 1989 ? 'Burma' : null, TH: y < 1939 ? 'Siam' : null, CD: y >= 1971 && y < 1997 ? 'Zaire' : null,
    BD: y >= 1947 && y < 1971 ? 'East Pakistan' : null,
    KR: y < 1897 ? 'Joseon Korea' : y < 1910 ? 'the Korean Empire' : y < 1945 ? 'Korea under Japanese rule' : y < 1948 ? 'Korea under Allied occupation' : null,
    KP: y < 1897 ? 'Joseon Korea' : y < 1910 ? 'the Korean Empire' : y < 1945 ? 'Korea under Japanese rule' : y < 1948 ? 'Korea under Allied occupation' : null,
    VN: y < 1887 ? 'the Nguyễn Empire (Đại Nam)' : y < 1945 ? 'French Indochina' : y < 1954 ? 'Vietnam (at war with France)' : y < 1976 ? 'Vietnam (divided)' : null,
    YE: y < 1918 ? 'the Ottoman Empire (Yemen)' : y < 1962 ? 'the Mutawakkilite Kingdom of Yemen' : y < 1990 ? 'North Yemen (the Yemen Arab Republic)' : null,
    FR: y < 1804 ? 'the French Republic (the Consulate)' : y < 1814 ? 'the French Empire' : y < 1848 ? 'the Kingdom of France' : y < 1852 ? 'the Second Republic' : y < 1870 ? 'the Second French Empire' : y >= 1940 && y < 1944 ? 'Vichy France' : null,
    MX: y >= 1864 && y < 1867 ? 'the Second Mexican Empire' : null, EG: y < 1914 ? 'the Khedivate of Egypt' : y < 1953 ? 'the Kingdom of Egypt' : null,
  };
  return R[cc] ?? PACK_NAMES[cc]?.find(([until]) => y < until)?.[1] ?? name;
}

/* ------------------------------------------------------------------ */
/* Money of its time: taxes, pensions, accounts, investments           */
/* ------------------------------------------------------------------ */

/**
 * How much of today's tax bill applied: the US had no income tax before 1913 (bar the Civil War
 * years) and until the Second World War it fell on the well-off; Britain's came and went with the
 * Napoleonic Wars, then stayed from 1842; most countries brought one in between the 1880s and 1914.
 */
export function eraTaxShare(state) {
  const y = yearNow(state);
  if (y >= 1945) return 1;
  const cc = state.character.countryId ?? 'US';
  if (cc === 'US') return y < 1862 ? 0 : y < 1873 ? 0.15 : y < 1913 ? 0 : y < 1942 ? 0.3 : 0.8;
  if (cc === 'GB') return y < 1799 ? 0 : y < 1817 ? 0.2 : y < 1842 ? 0 : y < 1914 ? 0.25 : 0.6;
  return y < 1890 ? 0.1 : y < 1914 ? 0.25 : 0.6;
}
/** When a state pension first covered workers: Bismarck's in 1889, Britain's 1909/1925, Social Security from 1937. */
const PENSION_FROM = { DE: 1889, GB: 1909, NZ: 1898, AU: 1909, FR: 1910, US: 1937, CA: 1927, SE: 1913, DK: 1891, JP: 1942, IT: 1919, NL: 1919 };
export const statePensionExists = (state, cc = state.character.countryId ?? 'US') => !((PENSION_FROM[cc] ?? 1950) > yearNow(state));
/** Defined-contribution accounts: the 401(k) from 1978, IRAs from 1974, Roth IRAs from 1998; elsewhere personal pensions from about 1990. */
export const dcExists = (state) => yearNow(state) >= ((state.character.countryId ?? 'US') === 'US' ? 1978 : 1990);
export const iraExists = (state) => yearNow(state) >= 1974;
export const rothExists = (state) => yearNow(state) >= 1998;
/** Investments: index funds from 1976, tech shares from the 1970s, crypto from 2010. */
const ASSET_FROM = { crypto: 2010, tech: 1975 };
export const assetExists = (state, id) => !(ASSET_FROM[id] > yearNow(state));
/** Old names for the same kind of holding. */
export function periodAssetName(state, id, name) {
  const y = yearNow(state);
  if (id === 'index' && y < 1976) return 'Blue-chip shares (a spread)';
  if (id === 'bonds' && y < 1986) return (state.character.countryId ?? 'US') === 'GB' ? 'Consols and gilts' : 'Government and railway bonds';
  if (id === 'treasuries' && y < 1929) return 'Savings bank deposit';
  return name;
}
/** Credit cards from 1960 (charge cards from 1950), credit scores from 1989. */
export const creditScoresExist = (state) => yearNow(state) >= 1989;

/* ------------------------------------------------------------------ */
/* Crime of its time                                                   */
/* ------------------------------------------------------------------ */

/** When each street crime became possible: no porch pirates before parcel deliveries, no carjacking before cars. */
const CRIME_FROM = {
  porchPirate: 2000, fakeIds: 1970, streetRace: 1930, catalytic: 1975, torchCar: 1920, identity: 1995, ransomware: 2013, knockoffs: 1980,
  growOp: 1975, carjack: 1925, scam: 1995, carTheft: 1910, catalyticConverter: 1975, cyberFraud: 1995, sim: 2000, skimmer: 1990, phishing: 2000, creditFraud: 1960,
};
export const crimeInEra = (state, id) => !(CRIME_FROM[id] > yearNow(state));
/** Drugs and how they were made: cocaine and heroin are old; meth, ecstasy and fentanyl pills are not. */
const DRUG_FROM = { meth: 1970, mdma: 1985, fentanyl: 2013 };
const LAB_FROM = { grow: 1975, cook: 1980, press: 2014 };
export const drugInEra = (state, id) => !(DRUG_FROM[id] > yearNow(state));
export const labInEra = (state, id) => !(LAB_FROM[id] > yearNow(state));

/* ------------------------------------------------------------------ */
/* Businesses of their time                                            */
/* ------------------------------------------------------------------ */

/** When each kind of business could be started (the rest are as old as trade). */
const BUSINESS_FROM = {
  foodTruck: 2008, techStartup: 1995, softwareShop: 1980, solarInstaller: 2005, ambulanceService: 1970, privatePoliceAgency: 1970, privateFireService: 1980,
  nemt: 1990, cdlSchool: 1986, flightSchool: 1927, indieGameStudio: 2005, itSecurityFirm: 1995, medicalBilling: 1970, answeringService: 1950, homeHealth: 1965,
  homeCareAgency: 1965, counselingPractice: 1950, ptClinic: 1925, chiroClinic: 1900, nutritionPractice: 1970, personalTraining: 1980, testPrep: 1950, daycare: 1940,
  hvacContractor: 1930, electrical: 1890, autoShop: 1910, towing: 1915, craneRental: 1950, excavation: 1920, staffingAgency: 1950, productionCompany: 1910,
  recordingStudio: 1925, homeInspection: 1970, shootingRange: 1950, busCharter: 1925, trucking: 1915, charterOperator: 1930, bailBondsAgency: 1898, designStudio: 1920,
  consulting: 1920, vetClinic: 1880, cpaFirm: 1896, salon: 1900, gym: 1900, marketingAgency: 1900, propertyMgmt: 1900, fireProtection: 1900, pestControl: 1900,
  landscaping: 1900, demolitionCo: 1900, movingCompany: 1920, tourBoat: 1900, courier: 1900,
  warehouse3pl: 1975, tutoring: 1975, translationAgency: 1950, opticalShop: 1900, cleaning: 1890, catering: 1880, wasteHauling: 1895,
  developer: 1890, kennel: 1920, securityCompany: 1855, piAgency: 1850, insuranceAgency: 1840, funeralHome: 1850, machineShop: 1840,
  photoStudio: 1850,
};
/** Businesses of the past: no longer started once their day is done. */
const BUSINESS_UNTIL = {
  generalStore: 1965, liveryStable: 1930, smithy: 1955, iceHouse: 1955, boardingHouse: 1965, gristMill: 1945, coalMerchant: 1975,
  dairyRound: 1990, tailorShop: 1975, printShop: 1995, photoStudio: 2005,
};
/** What a kind of business was called before its modern name: [until year, name], oldest first. */
const BUSINESS_NAMES = {
  retail: [[1930, 'Dry Goods Store']],
  restaurant: [[1880, 'Eating House'], [1920, 'Dining Rooms']],
  gym: [[1950, 'Physical Culture Studio']],
  salon: [[1925, 'Barber & Hairdresser']],
  cleaning: [[1950, 'Laundry & Charring Service']],
  autoShop: [[1940, 'Motor Garage']],
  trucking: [[1935, 'Haulage Firm']],
  courier: [[1920, 'Carrier & Express Office']],
  pharmacyStore: [[1950, 'Chemist & Druggist']],
  opticalShop: [[1950, 'Optician']],
  funeralHome: [[1920, 'Undertaker']],
  practice: [[1940, 'Doctor\'s Surgery']],
  dentalPractice: [[1930, 'Dental Surgery']],
  insuranceAgency: [[1930, 'Insurance Office']],
  securityCompany: [[1940, 'Detective & Watchman Agency']],
  piAgency: [[1940, 'Private Detective Agency']],
  catering: [[1940, 'Caterer & Confectioner']],
  developer: [[1945, 'Land & Building Company']],
  consulting: [[1950, 'Efficiency Engineers']],
  marketingAgency: [[1950, 'Advertising Agency']],
  staffingAgency: [[1960, 'Employment Bureau']],
  movingCompany: [[1940, 'Furniture Removers']],
  wasteHauling: [[1950, 'Refuse Carting Company']],
  propertyMgmt: [[1950, 'Rent Collecting Agency']],
  kennel: [[1950, 'Boarding Kennels']],
  homeBuilder: [[1940, 'Housebuilder']],
  constructionCo: [[1920, 'Building Contractor']],
  fireProtection: [[1950, 'Fire Appliance Company']],
  landscaping: [[1950, 'Jobbing Gardener']],
  tourBoat: [[1950, 'Excursion Steamer']],
  pestControl: [[1940, 'Rat-Catcher & Exterminator']],
  privateSchool: [[1900, 'Private Academy']],
};
export const businessInEra = (state, id) => !(BUSINESS_FROM[id] > yearNow(state)) && !(BUSINESS_UNTIL[id] <= yearNow(state));
export const businessUntil = (id) => BUSINESS_UNTIL[id] ?? null;
/** A kind of business by its name in the year being played. */
export function periodBusinessName(id, base) {
  const y = ERA_YEAR;
  return (BUSINESS_NAMES[id] ?? []).find(([until]) => y < until)?.[1] ?? base;
}
export const businessFrom = (id) => BUSINESS_FROM[id] ?? null;
/** Company forms: US LLCs from 1977 (Britain's LLPs from 2000), S corporations from 1958; the SBA lends from 1953; franchising from the 1950s. */
export function entityInEra(state, id) {
  const y = yearNow(state);
  const cc = state.character.countryId ?? 'US';
  if (id === 'llc') return y >= (cc === 'GB' ? 2000 : 1977);
  if (id === 'scorp') return y >= 1958;
  if (id === 'ccorp') return y >= (cc === 'GB' ? 1856 : cc === 'DE' ? 1892 : 1850);
  return true;
}
export const smallBizLoansExist = (state) => yearNow(state) >= 1953;
export const franchisesExist = (state) => yearNow(state) >= 1950;

/* ------------------------------------------------------------------ */
/* Civil society of its time                                           */
/* ------------------------------------------------------------------ */

/** When volunteer services, disaster teams, national-service programmes and veterans' posts were founded. */
const ORG_FROM = {
  'svc:ambulance': 1930, 'svc:cap': 1941, 'svc:auxiliary': 1939, 'svc:cert': 1993, 'svc:mrc': 2002, 'svc:police': 1920, 'svc:redcross': 1863, 'svc:sar': 1950,
  'svc:skiPatrol': 1938, 'svc:wildland': 1910,
  'team:fema': 1979, 'team:dmat': 1984, 'team:usar': 1989, 'team:teamRubicon': 2010, 'team:ares': 1935, 'team:sdf': 1917,
  'program:americorps': 1994, 'program:peaceCorps': 1961,
  'role:casa': 1977, 'role:crisisLine': 1958, 'role:pollWorker': 1850, 'role:coach': 1900, 'role:scouts': 1908, 'role:hospice': 1975, 'role:habitat': 1976, 'role:blood': 1940,
  'post:vfw': 1899, 'post:legion': 1919,
};
export const orgInEra = (state, key) => !(ORG_FROM[key] > yearNow(state));
export const orgFrom = (key) => ORG_FROM[key] ?? null;

/* ------------------------------------------------------------------ */
/* Housing of its time                                                 */
/* ------------------------------------------------------------------ */

/** Kinds of property that didn't exist yet: condominiums from the 1960s, strip malls after the war. */
const PROPERTY_FROM = { condo: 1960, stripMall: 1950, aptComplex: 1920 };
export const propertyInEra = (state, id) => !(PROPERTY_FROM[id] > yearNow(state));
/**
 * Home loans as they were: before 1934, a short loan for half the price, renewed or paid off in a lump;
 * FHA loans from 1934, VA loans from 1944, the long fixed-rate mortgage from about 1948, ARMs from 1981.
 */
const LOAN_FROM = { fha: 1934, va: 1944, conv30: 1948, conv15: 1948, arm: 1981, commercial: 1900 };
export const loanInEra = (state, id) => !(LOAN_FROM[id] > yearNow(state)) && !(id === 'balloon' && yearNow(state) >= 1948);
/** Housing help: public housing from 1937, vouchers from 1974. */
export const housingVouchersExist = (state) => yearNow(state) >= 1974;
/** The place's own words for rented homes (realestate/HomesOfTheDay.js registers them; Eras stays a leaf). */
let RENT_HERE = null;
export const setRentNames = (fn) => { RENT_HERE = fn; };
/** A rental's name in its day. */
export function periodRentName(state, id, name) {
  const here = RENT_HERE?.(state, id, name);
  if (here) return here;
  const y = yearNow(state);
  if (id === 'apartment' && y < 1920) return 'Rooms in a tenement';
  if (id === 'roommates' && y < 1950) return 'A room in a lodging house';
  if (id === 'subsidized' && y < 1974) return 'Public housing';
  return name;
}

/* ------------------------------------------------------------------ */
/* Country names of the day, everywhere                                 */
/* ------------------------------------------------------------------ */

let ERA_STATE = null;
/** The life being played, so a country's name (Countries.js) reads as it did that year. Set by History. */
export const setEraState = (state) => { ERA_STATE = state?.era && state.era.start < PRESENT ? state : null; };
/** A country's name in the year being played, or its name today. */
export const eraCountryName = (cc, base) => (ERA_STATE ? periodCountryName(ERA_STATE, cc, base) : base);
export const getEraState = () => ERA_STATE;
export const eraCountryFlag = (cc, base) => (ERA_STATE ? periodFlagEmoji(ERA_STATE, cc) : base);

/** A two-letter code as its flag emoji. */
export const codeEmoji = (code) => String(code).toUpperCase().replace(/[A-Z]/g, (ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65));
/** Flags no emoji draws, as the nearest symbol: the eagle of Prussia and the Reich, the hammer of the Soviets. */
const FLAG_SYMBOL = {
  ussr: '☭', prussia: '🦅', germanEmpire: '🦅', weimar: '🦅', habsburg: '🦅', gdr: '⚒️', yugoslavia: '⭐', qing: '🐉', fiveRaces: '🏳️', papal: '✝️',
  twoSicilies: '⚜️', bourbon: '⚜️', sardinia: '✠', italyKingdom: '🇮🇹', usStars: '🇺🇸', gbPre1801: '🇬🇧', redEnsign: '🇬🇧', blueEnsign: '🇬🇧',
  iranLionSun: '🦁', brazilEmpire: '🇧🇷', egyptKingdom: '🇪🇬', portugalMonarchy: '🇵🇹', libyaGreen: '🟩', southAfrica1928: '🇿🇦', bavaria: '🔷',
  wurttemberg: '🦌', saxony: '🟩', baden: '🟨', hamburg: '🏰', frankfurt: '🦅', hesse: '🦁', krakow: '🏰', danzig: '⚓', transvaal: '🇿🇦',
  orangeFreeState: '🍊', zulu: '🛡️', quaiti: '🏳️', southVietnam: '🇻🇳', southYemen: '🇾🇪',
};
/** A flag of the day as an emoji (for lists and pickers that can't draw images). */
export function flagEmoji(f) {
  if (!f) return '🏳️';
  if (typeof f === 'string') return f.length === 2 ? codeEmoji(f) : FLAG_SYMBOL[f] ?? '🏳️';
  return f.img ? codeEmoji(f.img) : FLAG_SYMBOL[f.id] ?? '🏳️';
}
export const periodFlagEmoji = (state, cc) => flagEmoji(periodFlag(state, cc));

/** The state a city of your country belonged to this year (East Germany, Bavaria), or null where it's the country's own. */
export function cityStateOfDay(state, regionId) {
  if (!state?.era || yearNow(state) >= PRESENT) return null;
  const r = regionStateAt(regionId, yearNow(state));
  return r ? { name: r.name, flag: flagEmoji(r.flag), spec: r.flag ? (r.flag.length === 2 ? { img: r.flag.toUpperCase() } : { id: r.flag }) : periodFlag(state, state.character?.countryId ?? 'US'), kind: r.kind } : null;
}
/**
 * A border inside today's country (the inner German border, the 17th parallel): why you can't simply
 * move from one city to the other this year, or null. Communist states kept their people in.
 */
export function innerBorder(state, fromRegion, toRegion) {
  const a = cityStateOfDay(state, fromRegion);
  const b = cityStateOfDay(state, toRegion);
  if ((a?.name ?? null) === (b?.name ?? null)) return null;
  if (a?.kind === 'eastbloc' || b?.kind === 'eastbloc') return `The border between ${a?.name ?? 'here'} and ${b?.name ?? 'there'} is closed`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Names of institutions in their day                                  */
/* ------------------------------------------------------------------ */

/**
 * Agencies and programmes by the names of the year being played, applied to rendered text in past
 * lives: the Bureau of Investigation before the FBI, the Bureau of Internal Revenue before the IRS,
 * CHAMPUS before TRICARE, a crisis line before 988, the Dow before the S&P 500.
 */
const RENAMES = [
  [/\bIRS debt\b/g, 1953, () => 'tax debt'],
  [/\bIRS\b/g, 1953, (y) => (y >= 1862 ? 'Bureau of Internal Revenue' : 'tax collector')],
  [/\bFBI\b/g, 1935, (y) => (y >= 1908 ? 'Bureau of Investigation' : 'Pinkertons')],
  [/\bDEA\b/g, 1973, (y) => (y >= 1930 ? 'Federal Bureau of Narcotics' : 'narcotics')],
  [/\bATF\b/g, 1972, (y) => (y >= 1920 ? 'Prohibition Bureau' : 'revenue')],
  [/\bOSHA\b/g, 1971, () => 'safety'],
  [/\bTRICARE\b/g, 1995, (y) => (y >= 1966 ? 'CHAMPUS' : 'military care')],
  [/\b(?:Call or text|call or text|text) 988\b/g, 2022, (y) => (y >= 1958 ? 'Call a crisis line' : 'Send for the doctor')],
  [/\b988 (?=\(|Suicide)/g, 2022, () => ''],
  [/\bS&(?:amp;)?P(?: 500)?\b/g, 1957, (y) => (y >= 1896 ? 'Dow' : 'the market')],
  [/\bcredit score\b/gi, 1989, () => 'credit'],
  [/\bSecret Service\b/g, 1865, () => 'Treasury'],
  [/\bSSDI\b/g, 1956, () => 'disability'],
  [/Film, TV &(?:amp;)? Theater/g, 1950, (y) => (y < 1910 ? 'the Stage' : 'Stage &amp; Screen')],
  [/\bCDL\b/g, 1986, (y) => (y >= 1920 ? 'Chauffeur\'s' : 'Carter\'s')],
  [/Member of the Bundestag/g, 1949, (y) => (y >= 1871 ? 'Member of the Reichstag' : 'Member of the Prussian Landtag')],
  [/\bBundeskanzler\b/g, 1949, (y) => (y >= 1871 ? 'Reichskanzler' : 'Minister-President of Prussia')],
  [/\bBundespräsident\b/g, 1949, () => 'Reichspräsident'],
  [/\bBundestag\b/g, 1949, (y) => (y >= 1871 ? 'Reichstag' : 'Landtag')],
  [/Member of the Landtag/g, 1946, (y) => (y >= 1919 ? 'Member of the Landtag' : 'Member of the state Diet (Landtag)')],
  [/United Nations Secretariat/g, 1946, () => 'League of Nations Secretariat'],
  [/UN Agencies, Funds &(?:amp;)? Programmes/g, 1946, () => 'League of Nations Technical Organisations'],
  [/EU Institutions \(European Civil Service\)/g, 1993, (y) => (y < 1958 ? 'The European Coal and Steel Community' : 'The European Communities (European Civil Service)')],
  [/Order of Malta — Malteser International/g, 2005, () => 'Order of Malta — Relief Service'],
  [/\bFire and Rescue Service\b/g, 2004, (y) => (y >= 1866 ? 'Fire Brigade' : 'insurance fire brigade')],
  [/\bBritish Transport Police\b/g, 1949, (y) => (y >= 1830 ? 'Railway Police' : 'parish constables')],
  [/\bTerritorial Police Force\b/g, 1839, () => 'Borough Watch'],
  [/\bU\.S\. Air Force\b/g, 1947, (y) => (y >= 1941 ? 'U.S. Army Air Forces' : y >= 1926 ? 'U.S. Army Air Corps' : 'U.S. Army Signal Corps')],
];
/**
 * International organisations before today's: the League of Nations (1920–46) before the UN, the
 * Permanent Court of International Justice before the ICJ, the Coal and Steel Community and the
 * European Communities before the EU. [until, employers] per career, oldest first; later years
 * keep the career's own list, less any body not founded yet (EMPLOYER_FROM).
 */
const PERIOD_EMPLOYERS = {
  unSecretariat: [[1946, ['the League of Nations Secretariat (Geneva)', 'the League of Nations Secretariat — Mandates Section', 'the League of Nations Secretariat — Minorities Section']]],
  unAgencies: [[1946, ['the International Labour Office (Geneva)', 'the League of Nations Health Organisation', 'the Nansen International Office for Refugees', 'the International Institute of Intellectual Co-operation (Paris)']]],
  intlJustice: [[1946, ['the Permanent Court of International Justice (The Hague)']], [1993, ['International Court of Justice']], [2002, ['International Court of Justice', 'the International Criminal Tribunal for the former Yugoslavia (The Hague)', 'the International Criminal Tribunal for Rwanda (Arusha)']]],
  euInstitutions: [[1958, ['the High Authority of the European Coal and Steel Community (Luxembourg)', 'the Common Assembly of the ECSC (Secretariat)', 'the Court of Justice of the ECSC']],
    [1993, ['the Commission of the European Communities', 'the European Parliament (Secretariat)', 'the Council of the European Communities (General Secretariat)', 'the Court of Justice of the European Communities']]],
  maltaRelief: [[2005, ['the Order of Malta\'s relief service (Malteser Hilfsdienst)', 'the Order of Malta\'s hospitals']]],
};
/** Employers founded later than the career they belong to. */
const EMPLOYER_FROM = {
  UNICEF: 1946, 'UNHCR (the UN Refugee Agency)': 1950, 'World Food Programme': 1961, 'World Health Organization': 1948, UNDP: 1965, 'International Atomic Energy Agency': 1957,
  'International Criminal Court': 2002, 'European External Action Service': 2010, 'European Central Bank': 1998, 'NATO Communications and Information Agency': 2012,
  'UN peace operations (Department of Peace Operations)': 1948, 'United Nations Office at Geneva': 1946, 'Court of Justice of the European Union': 2009,
};
/** A career's employers in the year being played. */
export function periodEmployers(professionId, employers) {
  const y = ERA_YEAR;
  if (y >= PRESENT) return employers;
  const old = (PERIOD_EMPLOYERS[professionId] ?? []).find(([until]) => y < until);
  if (old) return old[1];
  const now = (employers ?? []).filter((e) => !(EMPLOYER_FROM[e] > y));
  return now.length ? now : employers;
}

/** Text as it would have read in the year being played (unchanged for today's lives). */
export function periodText(text) {
  if (ERA_YEAR >= PRESENT || typeof text !== 'string') return text;
  let t = text;
  for (const [re, from, to] of RENAMES) if (ERA_YEAR < from) t = t.replace(re, () => to(ERA_YEAR));
  return t;
}

/** When a credential existed (additions: radio amateurs, enrolled agents, OSHA cards, drone pilots). */
Object.assign(CREDENTIAL_FROM, { hamTech: 1951, enrolledAgent: 1884, oshaSafety: 1971, forklift: 1999, drone: 2016, epa608: 1993 });
/** Inventions of their time: no software before computers, no clean-energy patents before the 1970s. */
const INVENTION_FROM = { software: 1960, gadget: 1920, green: 1970, medical: 1880 };
export const inventionInEra = (state, id) => !(INVENTION_FROM[id] > yearNow(state));
/** Universities and majors founded later: the Air Force Academy (1954), Computer Science (1965). */
const UNI_FROM = { usafa: 1954 };
const MAJOR_FROM = {
  computerScience: 1965, cybersecurity: 2000, dataScience: 2010, nursing: 1909, business: 1881, accounting: 1900, internationalRelations: 1919, criminalJustice: 1960,
  publicAdministration: 1924, environmentalScience: 1970, urbanStudies: 1960, paramedicine: 1990, fireScience: 1970, aviation: 1925, marineTransportation: 1874,
  communications: 1908, socialWork: 1904, hospitalityMgmt: 1922, forensicScience: 1950, architecture: 1865, kinesiology: 1960, marketing: 1910, earlyChildhood: 1920,
  supplyChain: 1980, psychology: 1880, nutrition: 1910, atmosphericScience: 1940, geomatics: 1950, communicationDisorders: 1940, militaryScience: 1916, agriculture: 1855,
  economics: 1820, politicalScience: 1880, education: 1880, engineering: 1820,
};
/** Majors that stopped being offered as such (none yet: Classics, the backbone of a nineteenth-century degree, is still taught). */
const MAJOR_UNTIL = {};
export const uniInEra = (state, u) => !(UNI_FROM[u.id] > yearNow(state)) && !(SCHOOL_FROM[u.type] > yearNow(state));
export const majorInEra = (state, id) => !(MAJOR_FROM[id] > yearNow(state)) && !(MAJOR_UNTIL[id] <= yearNow(state));
/** Programmes by when they began: the first junior colleges (1901), MBAs (1908), nurse-anaesthesia, PA and dual degrees later. */
const PROGRAM_ID_FROM = {
  teacherPrep: 1984, premedPostbacc: 1960, linemanSchool: 1950, culinaryArts: 1946, interpreterCert: 1941, msAccounting: 1960, counselingMaster: 1960, dieteticsMS: 1970,
  imd: 1970, mdphd: 1964, jdmba: 1970, paMaster: 1967, mph: 1916, mba: 1908, mpa: 1924, msw: 1904, mls: 1887, mortuaryScience: 1882, do: 1892, dc: 1897, od: 1910,
  associate: 1901, phd: 1861, maritimeAcademy: 1874, dvm: 1879, machinistTech: 1900, radiologyTech: 1920, respiratoryTech: 1950,
};
export const PRESENT_PROGRAM_FROM = PROGRAM_ID_FROM;
export const programIdInEra = (state, id) => !(PROGRAM_ID_FROM[id] > yearNow(state));
/** What a degree was called in its day: the LL.B. before the J.D., Natural Philosophy before Physics. [until, name]. */
const OLD_DEGREE_NAMES = {
  jd: [[1965, 'Bachelor of Laws (LL.B., Law School)']], pharmd: [[1950, 'Graduate in Pharmacy (Ph.G.)'], [2000, 'Bachelor of Pharmacy (B.Pharm.)']],
  dpt: [[1960, 'Physical Therapy Certificate'], [2000, 'B.S. Physical Therapy']], mot: [[1960, 'Occupational Therapy Diploma'], [2007, 'B.S. Occupational Therapy']],
  crnaProgram: [[1990, 'Nurse Anesthesia Certificate'], [2022, 'Master of Nurse Anesthesia (CRNA)']], psyd: [[1973, 'Ph.D. in Clinical Psychology']], paMaster: [[2000, 'Physician Assistant Certificate']],
  dds: [[1900, 'Doctor of Dental Surgery (Dental College)']], md: [[1910, 'Doctor of Medicine (Medical College)']], seminary: [[1900, 'Bachelor of Divinity (Seminary)']],
  // Majors.
  physics: [[1900, 'Natural Philosophy']], economics: [[1900, 'Political Economy']], biology: [[1880, 'Natural History'], [1960, 'Biology / Pre-Medical']], psychology: [[1900, 'Mental Philosophy']],
  business: [[1950, 'Commerce']], nursing: [[1960, 'Nursing (Diploma)']], communications: [[1960, 'Journalism']], kinesiology: [[1990, 'Physical Education']], liberalArts: [[1900, 'Arts (Classical Course)']],
  languages: [[1900, 'Modern Languages']], agriculture: [[1900, 'Agriculture (Land-Grant)']],
};
/** A degree's or major's name in the year being played. */
export const degreeNameOfDay = (id, base) => (OLD_DEGREE_NAMES[id] ?? []).find(([until]) => eraYear() < until)?.[1] ?? base;

/** Courses of their time, by the course's name: [pattern, first year]. */
const PROGRAM_FROM = [
  [/Cyber|Homeland/i, 2000], [/Data Science|Analytics/i, 2010], [/Computer|Software|Information Tech/i, 1965], [/Solar|Wind|Renewable/i, 2005],
  [/Paralegal|Medical Assistant|Fire Science|Physician Assistant/i, 1967], [/Emergency Medical|Paramedic|\bEMT\b/i, 1970], [/Nurse Practitioner|Nurse Anesthe/i, 1965],
  [/Sonograph|Ultrasound|\bMRI\b|\bCT\b/i, 1975], [/Respiratory/i, 1950], [/Radiolog|Imaging|X-ray/i, 1920], [/Criminal Justice/i, 1960], [/HVAC|Refrigeration/i, 1930],
  [/Aviation|Pilot|Aeronaut/i, 1925], [/Electrical|Electronics/i, 1890], [/Automotive|Diesel/i, 1910], [/Dental Hygien/i, 1915], [/Occupational Therapy|Physical Therapy|Speech/i, 1920],
  [/Cosmetology|Esthetic/i, 1920], [/Welding/i, 1920], [/\bMBA\b|Business Administration/i, 1908], [/Public Health/i, 1916], [/Social Work/i, 1900],
];
export const programInEra = (state, name) => !PROGRAM_FROM.some(([re, from]) => re.test(name ?? '') && yearNow(state) < from);

