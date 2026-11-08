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
export const START_YEARS = [
  { year: PRESENT, label: 'Today', sub: 'The world as it is' },
  { year: 1990, label: '1990', sub: 'The Cold War is ending' },
  { year: 1970, label: '1970', sub: 'Vietnam, the oil shock, colonies winning freedom' },
  { year: 1950, label: '1950', sub: 'After the war: empires breaking up, the Cold War' },
  { year: 1930, label: '1930', sub: 'The Depression, the dictators, another war coming' },
  { year: 1910, label: '1910', sub: 'Empires, the Tsar, the Great War ahead' },
];
export const validStartYear = (y) => (START_YEARS.some((s) => s.year === Number(y)) ? Number(y) : PRESENT);

export const yearNow = (state) => (state?.character?.birthYear != null ? currentYear(state) : PRESENT);
const hap = (s, id) => Boolean(s.era?.events?.[id]);
const over = (s, id) => s.era?.events?.[id]?.ended != null;

/* ------------------------------------------------------------------ */
/* Technology                                                          */
/* ------------------------------------------------------------------ */

export const TECH = {
  radio: 1922, tv: 1950, creditCards: 1960, personalComputer: 1980, mobilePhone: 1990,
  internet: 1995, onlineDating: 1997, socialMedia: 2006, streaming: 2007, smartphone: 2008, crypto: 2010, gigApps: 2012,
};
export const hasTech = (state, id) => !(TECH[id] > yearNow(state));

/* ------------------------------------------------------------------ */
/* Jobs: when they exist, and when women could do them                 */
/* ------------------------------------------------------------------ */

/** Roughly when each line of work opens up (the US dates, loosely; elsewhere similar). */
export const PROFESSION_FROM = {
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

/** Why this work isn't open to you in this year, or null. */
export function eraWorkBlock(state, profession) {
  const y = yearNow(state);
  if (y >= PRESENT) return null;
  const id = profession?.id;
  const from = PROFESSION_FROM[id] ?? profession?.fromYear;
  if (from && y < from) return `Doesn't exist yet (from about ${from})`;
  const menUntil = MEN_ONLY_UNTIL[id] ?? MEN_ONLY_UNTIL[profession?.template];
  if (menUntil && y < menUntil && state.character.gender === 'female') return menUntil > PRESENT ? 'Closed to women' : `Closed to women (until about ${menUntil})`;
  if (apartheidHere(state) && skinToneOf(state) >= 3 && APARTHEID_RESERVED.includes(id)) return 'Reserved for white workers under apartheid';
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
  { cc: ['RU'], regime: MONARCH('the Russian Empire, ruled by the Tsar', 'the Tsar', { religion: 'state' }), active: (s) => !hap(s, 'russianRevolution') },
  { cc: ['RU'], regime: SOVIET, active: (s) => hap(s, 'russianRevolution') && !hap(s, 'sovietCollapse') },
  { cc: ['PL', 'RO'], regime: EAST_BLOC, active: (s) => hap(s, 'coldWar') && !hap(s, 'sovietCollapse') },
  { cc: ['DE'], regime: G({ kind: 'monarchy', name: 'the German Empire under the Kaiser', elections: 'controlled', leader: 'the Kaiser' }), active: (s) => !over(s, 'ww1') },
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
/* Colonies                                                            */
/* ------------------------------------------------------------------ */

const RULER = { GB: 'British', FR: 'French', PT: 'Portuguese', NL: 'Dutch', BE: 'Belgian', US: 'American', IT: 'Italian', JP: 'Japanese', RU: 'Russian', TR: 'Ottoman', AU: 'Australian', PK: 'Pakistani', MY: 'Malaysian', DE: 'German' };
export const RULER_CAPITAL = { GB: 'London', FR: 'Paris', PT: 'Lisbon', NL: 'The Hague', BE: 'Brussels', US: 'Washington', IT: 'Rome', JP: 'Tokyo', RU: 'Moscow', TR: 'Constantinople', AU: 'Canberra', PK: 'Karachi', MY: 'Kuala Lumpur', DE: 'Berlin' };
export const RULER_NAME = { TR: 'the Ottoman Empire', RU: 'Russia', GB: 'Britain', FR: 'France', PT: 'Portugal', NL: 'the Netherlands', BE: 'Belgium', US: 'the United States', IT: 'Italy', JP: 'Japan', AU: 'Australia', PK: 'Pakistan', MY: 'Malaysia', DE: 'Germany' };
const S = (ruler, name, until, o = {}) => ({ ruler, name, until, ...o });
const OTTOMAN = (name) => S('TR', name, 1918, { leader: 'the Ottoman governor', noMovement: true });

/**
 * Who ruled each territory, stage by stage. until: the year it ended in our history (or an
 * event id); war: independence came through a war; from: the stage starts later than the last.
 */
export const COLONIES = {
  IN: [S('GB', 'British India', 1947, { leader: 'the Viceroy', partition: true })],
  PK: [S('GB', 'British India', 1947, { leader: 'the Viceroy', partition: true })],
  BD: [S('GB', 'British India (Bengal)', 1947, { leader: 'the Viceroy', partition: true }), S('PK', 'East Pakistan', 1971, { war: true, leader: 'the Governor of East Pakistan' })],
  LK: [S('GB', 'British Ceylon', 1948)], MM: [S('GB', 'British Burma', 1948)], MY: [S('GB', 'British Malaya', 1957, { war: true })],
  SG: [S('GB', 'the Straits Settlements', 1963), S('MY', 'a state of Malaysia', 1965, { leader: 'the Prime Minister of Malaysia', noMovement: true })],
  KE: [S('GB', 'Kenya Colony', 1963, { war: true })], NG: [S('GB', 'Colonial Nigeria', 1960)], GH: [S('GB', 'the Gold Coast', 1957)],
  GM: [S('GB', 'the Gambia Colony', 1965)], SD: [S('GB', 'the Anglo-Egyptian Sudan', 1956, { leader: 'the Governor-General' })],
  MW: [S('GB', 'Nyasaland', 1964)], SO: [S('IT', 'Italian Somaliland', 1960)], JM: [S('GB', 'the Colony of Jamaica', 1962)],
  BS: [S('GB', 'the Bahamas', 1973)], CY: [S('GB', 'British Cyprus', 1960, { war: true })], MT: [S('GB', 'the Crown Colony of Malta', 1964)],
  IE: [S('GB', 'Ireland, ruled from Westminster', 1922, { war: true, leader: 'the Lord Lieutenant' })],
  IL: [OTTOMAN('Ottoman Palestine'), S('GB', 'Mandatory Palestine', 1948, { war: true, leader: 'the High Commissioner' })],
  PS: [OTTOMAN('Ottoman Palestine'), S('GB', 'Mandatory Palestine', 1948, { leader: 'the High Commissioner' })],
  JO: [OTTOMAN('Ottoman Syria'), S('GB', 'the Emirate of Transjordan (a British mandate)', 1946, { leader: 'the British Resident' })],
  IQ: [OTTOMAN('Ottoman Mesopotamia'), S('GB', 'Mandatory Iraq', 1932, { leader: 'the High Commissioner' })],
  SY: [OTTOMAN('Ottoman Syria'), S('FR', 'the French Mandate of Syria', 1946, { leader: 'the High Commissioner' })],
  LB: [OTTOMAN('Ottoman Syria'), S('FR', 'Greater Lebanon (a French mandate)', 1943, { leader: 'the High Commissioner' })],
  EG: [S('GB', 'the British protectorate of Egypt', 1922, { leader: 'the British High Commissioner' })],
  KW: [S('GB', 'Kuwait, a British protectorate', 1961, { leader: 'the Political Agent', noMovement: true })],
  BH: [S('GB', 'Bahrain, a British protectorate', 1971, { leader: 'the Political Agent', noMovement: true })],
  QA: [S('GB', 'Qatar, a British protectorate', 1971, { leader: 'the Political Agent', noMovement: true })],
  AE: [S('GB', 'the Trucial States', 1971, { leader: 'the Political Agent', noMovement: true })],
  BN: [S('GB', 'the British protectorate of Brunei', 1984, { leader: 'the High Commissioner', noMovement: true })],
  SB: [S('GB', 'the British Solomon Islands', 1978)], VU: [S('GB', 'the New Hebrides (an Anglo-French condominium)', 1980, { leader: 'the Resident Commissioners' })],
  TO: [S('GB', 'Tonga, a British protected state', 1970, { leader: 'the British Agent', noMovement: true })],
  PG: [S('AU', 'the Territory of Papua and New Guinea', 1975, { leader: 'the Administrator' })],
  MH: [S('DE', 'German New Guinea (the Marshall Islands)', 1914, { noMovement: true }), S('JP', 'the South Seas Mandate', 1945, { noMovement: true }), S('US', 'the Trust Territory of the Pacific Islands', 1986, { leader: 'the High Commissioner' })],
  DZ: [S('FR', 'French Algeria', 1962, { war: true, leader: 'the Governor-General' })], MA: [S('FR', 'the French protectorate of Morocco', 1956, { leader: 'the Resident-General' })],
  SN: [S('FR', 'French West Africa (Senegal)', 1960)], CI: [S('FR', 'French West Africa (Ivory Coast)', 1960)], ML: [S('FR', 'French Sudan', 1960)],
  NE: [S('FR', 'French West Africa (Niger)', 1960)], TD: [S('FR', 'French Equatorial Africa (Chad)', 1960)], CF: [S('FR', 'Ubangi-Shari', 1960)],
  DJ: [S('FR', 'French Somaliland', 1977)], VN: [S('FR', 'French Indochina', 1954, { war: true })], KH: [S('FR', 'French Indochina (Cambodia)', 1953)],
  MZ: [S('PT', 'Portuguese Mozambique', 1975, { war: true })], GW: [S('PT', 'Portuguese Guinea', 1974, { war: true })],
  ID: [S('NL', 'the Dutch East Indies', 1949, { war: true })], CD: [S('BE', 'the Belgian Congo', 1960)],
  PH: [S('US', 'the Philippine Islands, an American territory', 1946)], LY: [S('IT', 'Italian Libya', 1951)],
  KR: [S('JP', 'Korea under Japanese rule', 1945, { leader: 'the Governor-General' })], KP: [S('JP', 'Korea under Japanese rule', 1945, { leader: 'the Governor-General' })],
  TW: [S('JP', 'Taiwan under Japanese rule', 1945, { leader: 'the Governor-General' })],
  FI: [S('RU', 'the Grand Duchy of Finland, under the Tsar', 1917, { leader: 'the Governor-General' })], PL: [S('RU', 'Russian Poland', 1918)],
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
