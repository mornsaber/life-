/**
 * Politics under colonial rule, and in Hong Kong and Macao after their handovers.
 *
 * A colony had no parliament of its own, but it had politics: a Legislative Council where the
 * Governor's officials sat with a few nominated "unofficial" members, a town council or sanitary
 * board that ratepayers elected, petitions, deputations, and, in the last years before
 * independence, elections, a Chief Minister and talks in the imperial capital.
 *
 *   Steps      each place's constitutional history as dated steps (what the council was called,
 *              who could vote for it, whether locals could be nominated, whether there was an
 *              elected leader). Places without their own history follow their ruler's pattern.
 *   Franchise  'none' (all nominated), 'settlers' (only the ruler's own nationals: Kenya's
 *              European electorate from 1920), 'property' (a means or education test: the jury
 *              list, a £100 income), 'indirect' (functional constituencies, electoral colleges,
 *              chiefs' councils), 'universal', and 'vetted' (Hong Kong after 2021: every
 *              candidate passed by a review committee).
 *   You        petition and cultivate Government House; stand for the town council or the
 *              Legislative Council where seats were elected; accept or refuse a nomination;
 *              ask questions and vote in Council; lead the government where the constitution
 *              gave the elected side a leader, and press for self-rule.
 *
 * Sources for the dates: the constitutional histories of each colony (Hong Kong: Miners, The
 * Government and Politics of Hong Kong; India: the Councils Acts of 1861, 1892, 1909, the 1919
 * and 1935 Acts; Singapore: the Rendel Commission, 1954; Kenya: the Lyttelton and Lennox-Boyd
 * constitutions; Nigeria: the Clifford, Richards, Macpherson and Lyttelton constitutions; the
 * Gold Coast: the Guggisberg and Burns constitutions; Jamaica: the 1866 surrender and the 1944
 * constitution; Ceylon: the Colebrooke, McCallum, Donoughmore and Soulbury reforms; Macao: the
 * 1976 Organic Statute; the Basic Laws of Hong Kong and Macao, and Hong Kong's 2021 changes).
 */
import { Random } from '../../core/Random.js';
import { currentYear, netWorth, yearlyCount, bumpYearly } from '../../core/State.js';
import { colonialHere, autonomyHere, rulerAdj, rulerName, yearNow } from '../world/Eras.js';
import { COUNTRIES, isCitizen, priceLevel } from '../world/Countries.js';
import { councilQuestion } from '../world/PrivyCouncil.js';

const S = (year, o) => [year, o];

/** Each place's own constitutional steps, by ruler ('SAR' for after a handover). */
const POLITY = {
  HK: {
    GB: [
      S(1843, { council: 'Legislative Council', vote: 'none', note: 'The Legislative Council first meets: the Governor and his officials make the laws.' }),
      S(1850, { note: 'The first unofficial members are appointed, from the British merchant houses.' }),
      S(1880, { local: true, note: 'Ng Choy becomes the first Chinese member of the Legislative Council.' }),
      S(1883, { municipal: 'Sanitary Board', mvote: 'none' }),
      S(1888, { mvote: 'property', women: 1947, note: 'Ratepayers on the jury list elect two members of the Sanitary Board.' }),
      S(1936, { municipal: 'Urban Council', note: 'The Sanitary Board becomes the Urban Council.' }),
      S(1952, { note: 'Urban Council elections resume after the war, on a small franchise.' }),
      S(1982, { municipal: 'District Board', mvote: 'universal', note: 'The first District Board elections: every adult resident may vote.' }),
      S(1985, { vote: 'indirect', term: 3, note: 'The first indirect elections to the Legislative Council: 24 members chosen by functional constituencies and an electoral college.' }),
      S(1991, { vote: 'universal', term: 4, note: 'The first direct elections: 18 of the 60 seats.' }),
      S(1995, { note: 'Governor Patten\'s reforms: all 60 seats elected, 20 of them directly.' }),
    ],
    SAR: [
      S(1997, { council: 'Provisional Legislative Council', vote: 'indirect', municipal: 'District Board', mvote: 'universal', leader: 'Chief Executive', leaderBy: 'committee', note: 'At the handover the council elected in 1995 is dissolved; a Provisional Legislative Council, chosen in Shenzhen, sits for a year.' }),
      S(1998, { council: 'Legislative Council', vote: 'universal', term: 4, note: '20 of the 60 seats directly elected; the rest by functional constituencies and an Election Committee.' }),
      S(2000, { municipal: 'District Council', note: 'The District Boards become District Councils; the Urban Councils are abolished.' }),
      S(2004, { note: '30 of the 60 seats directly elected.' }),
      S(2012, { note: '35 of the 70 seats directly elected.' }),
      S(2021, { vote: 'vetted', note: 'The electoral overhaul: 20 of 90 seats directly elected, and every candidate vetted as a "patriot".' }),
      S(2023, { mvote: 'vetted', note: 'The District Councils remade: most seats appointed or chosen by committees.' }),
    ],
  },
  MO: {
    PT: [
      S(1800, { council: 'Council of Government', vote: 'none', municipal: 'Leal Senado', mvote: 'settlers', women: 1976, note: 'The Leal Senado, the city\'s old senate, is chosen by its Portuguese citizens; the Governor rules with an advisory council.' }),
      S(1964, { council: 'Legislative Council', note: 'A Legislative Council of appointed and indirectly chosen members advises the Governor.' }),
      S(1976, { council: 'Legislative Assembly', vote: 'settlers', local: true, term: 4, note: 'The Organic Statute: a Legislative Assembly with 6 of 17 seats directly elected, by a small electorate of Portuguese citizens.' }),
      S(1984, { vote: 'universal', mvote: 'universal', note: 'The vote opened to Chinese residents.' }),
      S(1992, { note: '8 of the 23 seats directly elected.' }),
    ],
    SAR: [
      S(1999, { council: 'Legislative Assembly', vote: 'universal', term: 4, municipal: 'Provisional Municipal Council', mvote: 'none', leader: 'Chief Executive', leaderBy: 'committee', note: '8 of the 23 seats directly elected; the Chief Executive chosen by an Election Committee.' }),
      S(2001, { note: '10 of the 27 seats directly elected.' }),
      S(2002, { municipal: null, note: 'The municipal councils are replaced by an appointed bureau.' }),
      S(2005, { note: '12 of the 29 seats directly elected.' }),
      S(2013, { note: '14 of the 33 seats directly elected.' }),
      S(2021, { vote: 'vetted', note: 'Pro-democracy candidates disqualified as disloyal.' }),
    ],
  },
  IN: {
    GB: [
      S(1800, { council: 'Governor-General\'s Council', vote: 'none' }),
      S(1861, { council: 'Imperial Legislative Council', local: true, note: 'The Indian Councils Act: the Viceroy may nominate Indians to his Legislative Council.' }),
      S(1882, { municipal: 'Municipal Board', mvote: 'property', note: 'Lord Ripon\'s local self-government: elected municipal boards.' }),
      S(1892, { vote: 'indirect', term: 3, note: 'The Indian Councils Act: members recommended by municipalities, universities and chambers of commerce.' }),
      S(1909, { vote: 'property', note: 'The Morley-Minto Reforms: elected seats, with separate electorates for Muslims.' }),
      S(1921, { council: 'Central Legislative Assembly', term: 3, note: 'The Montagu-Chelmsford Reforms: an elected majority, on a franchise of about one man in thirty.' }),
      S(1926, { women: 1926 }),
      S(1937, { leader: 'Premier', term: 5, note: 'The Government of India Act: provincial elections, and Indian premiers in the provinces.' }),
      S(1946, { leader: 'Vice-President of the Executive Council', note: 'The Interim Government: Indian ministers around the Viceroy\'s table.' }),
    ],
  },
  SG: {
    GB: [
      S(1819, { council: 'Resident\'s council', vote: 'none' }),
      S(1856, { municipal: 'Municipal Commission', mvote: 'property', note: 'A Municipal Commission, partly elected by the ratepayers.' }),
      S(1867, { council: 'Legislative Council of the Straits Settlements', note: 'The Straits Settlements become a Crown colony with a Legislative Council.' }),
      S(1869, { local: true, note: 'Hoo Ah Kay (Whampoa) becomes the first Asian member of the Legislative Council.' }),
      S(1913, { mvote: 'none', note: 'Elections to the Municipal Commission are abolished.' }),
      S(1946, { council: 'Legislative Council of Singapore', note: 'Singapore becomes a colony of its own.' }),
      S(1948, { vote: 'property', women: 1948, term: 3, note: 'The first election: 6 of 22 seats, voted for by British subjects who registered.' }),
      S(1949, { mvote: 'property', note: 'Municipal elections resume.' }),
      S(1951, { municipal: 'City Council' }),
      S(1955, { council: 'Legislative Assembly', vote: 'universal', leader: 'Chief Minister', term: 4, note: 'The Rendel constitution: 25 of 32 seats elected; David Marshall becomes Chief Minister.' }),
      S(1959, { leader: 'Prime Minister', term: 4, note: 'Self-government: all 51 seats elected, and a Prime Minister.' }),
    ],
  },
  KE: {
    GB: [
      S(1907, { council: 'Legislative Council', vote: 'none', note: 'A Legislative Council of officials and nominated settlers.' }),
      S(1919, { municipal: 'Nairobi Municipal Council', mvote: 'settlers' }),
      S(1920, { vote: 'settlers', women: 1920, term: 4, note: 'European settlers elect 11 members of the Legislative Council (Indians get elected seats in 1924).' }),
      S(1944, { local: true, note: 'Eliud Mathu becomes the first African member of the Legislative Council, by nomination.' }),
      S(1957, { vote: 'property', mvote: 'property', note: 'The first African elections: 8 seats, on a qualified franchise.' }),
      S(1961, { vote: 'universal', mvote: 'universal', leader: 'Leader of Government Business', note: 'An African majority on the Legislative Council.' }),
      S(1963, { leader: 'Prime Minister', note: 'Internal self-government; Jomo Kenyatta becomes Prime Minister.' }),
    ],
  },
  NG: {
    GB: [
      S(1900, { council: 'Legislative Council', vote: 'none', local: true }),
      S(1920, { municipal: 'Lagos Town Council', mvote: 'property' }),
      S(1923, { vote: 'property', term: 5, note: 'The Clifford constitution: four elected seats for Lagos and Calabar, on a £100 income franchise. Herbert Macaulay founds the NNDP.' }),
      S(1947, { note: 'The Richards constitution: regional houses, and an unofficial majority.' }),
      S(1951, { vote: 'indirect', note: 'The Macpherson constitution: elected regional houses send members to a central House.' }),
      S(1954, { vote: 'universal', leader: 'Premier', note: 'A federation: elected regional governments under Premiers (Awolowo, Azikiwe, the Sardauna of Sokoto).' }),
      S(1957, { leader: 'Prime Minister', note: 'Abubakar Tafawa Balewa becomes Prime Minister of the Federation.' }),
    ],
  },
  GH: {
    GB: [
      S(1874, { council: 'Legislative Council', vote: 'none', local: true }),
      S(1925, { vote: 'indirect', municipal: 'Accra Town Council', mvote: 'property', term: 4, note: 'The Guggisberg constitution: chiefs\' councils elect six members, and Accra, Cape Coast and Sekondi one each.' }),
      S(1946, { note: 'The Burns constitution: the first African unofficial majority in a British colony.' }),
      S(1951, { vote: 'universal', leader: 'Leader of Government Business', note: 'The first general election: Kwame Nkrumah\'s CPP wins it while he is in prison.' }),
      S(1952, { leader: 'Prime Minister' }),
    ],
  },
  JM: {
    GB: [
      S(1800, { council: 'House of Assembly', vote: 'settlers', municipal: 'Parish Vestry', mvote: 'settlers', term: 7, women: 1919, note: 'An elected House of Assembly of planters and merchants, voted for by white freeholders.' }),
      S(1830, { vote: 'property', mvote: 'property', note: 'Free people of colour win the vote on the same property terms.' }),
      S(1866, { council: 'Legislative Council', vote: 'none', local: true, note: 'After Morant Bay the Assembly votes itself away: Crown colony rule.' }),
      S(1884, { vote: 'property', term: 5, note: 'A partly elected Legislative Council: nine members, on a property franchise.' }),
      S(1923, { municipal: 'Kingston and St Andrew Corporation' }),
      S(1944, { council: 'House of Representatives', vote: 'universal', mvote: 'universal', term: 5, note: 'The first election under universal suffrage: Bustamante\'s Jamaica Labour Party wins.' }),
      S(1953, { leader: 'Chief Minister' }),
      S(1959, { leader: 'Premier', note: 'Full internal self-government.' }),
    ],
  },
  LK: {
    GB: [
      S(1800, { council: 'Governor\'s Council', vote: 'none' }),
      S(1833, { council: 'Legislative Council', local: true, note: 'The Colebrooke reforms: a Legislative Council with Ceylonese unofficial members.' }),
      S(1866, { municipal: 'Colombo Municipal Council', mvote: 'property' }),
      S(1910, { vote: 'property', term: 5, women: 1931, note: 'The McCallum reforms: one seat elected by "educated Ceylonese".' }),
      S(1931, { council: 'State Council', vote: 'universal', mvote: 'universal', leader: 'Leader of the State Council', term: 5, note: 'The Donoughmore constitution: universal suffrage, the first in Asia.' }),
      S(1947, { council: 'House of Representatives', leader: 'Prime Minister', note: 'The Soulbury constitution: a parliament and a Prime Minister.' }),
    ],
  },
  MY: {
    GB: [
      S(1874, { council: 'State Council', vote: 'none', local: true, note: 'The Residents advise the Sultans, through State Councils.' }),
      S(1909, { council: 'Federal Council', note: 'A Federal Council for the Federated Malay States.' }),
      S(1948, { council: 'Federal Legislative Council', note: 'The Federation of Malaya: a nominated Federal Legislative Council.' }),
      S(1952, { municipal: 'Kuala Lumpur Municipal Council', mvote: 'property', note: 'The first municipal elections.' }),
      S(1955, { vote: 'universal', leader: 'Chief Minister', term: 5, note: 'The first federal election: 52 of 98 seats; the Alliance wins 51, and Tunku Abdul Rahman becomes Chief Minister.' }),
    ],
  },
  SN: {
    FR: [
      S(1817, { council: 'Conseil privé', vote: 'none' }),
      S(1872, { municipal: 'commune of Saint-Louis', mvote: 'property', women: 1945, note: 'Saint-Louis and Gorée become communes: their originaires vote.' }),
      S(1879, { council: 'Conseil général', vote: 'property', term: 4, local: true, note: 'An elected Conseil général for the citizens of the Four Communes.' }),
      S(1914, { note: 'Blaise Diagne, elected for the Four Communes, becomes the first African deputy in Paris.' }),
      S(1946, { council: 'Territorial Assembly', note: 'The Fourth Republic: an elected territorial assembly and deputies in Paris.' }),
      S(1956, { vote: 'universal', mvote: 'universal', note: 'The Loi-cadre: universal suffrage in a single college.' }),
      S(1957, { leader: 'Vice-President of the Government Council' }),
      S(1959, { leader: 'Prime Minister' }),
    ],
  },
  PH: {
    US: [
      S(1900, { council: 'Philippine Commission', vote: 'none', local: true }),
      S(1907, { council: 'Philippine Assembly', vote: 'property', term: 4, women: 1937, note: 'The first elected Philippine Assembly, on a literacy and property franchise.' }),
      S(1916, { council: 'Philippine Legislature', note: 'The Jones Act: an elected Senate as well.' }),
      S(1935, { council: 'National Assembly', leader: 'President of the Commonwealth', term: 6, note: 'The Commonwealth: Manuel Quezon elected President.' }),
    ],
  },
  ID: {
    NL: [
      S(1800, { council: 'Council of the Indies', vote: 'none' }),
      S(1905, { municipal: 'gemeenteraad (municipal council)', mvote: 'property' }),
      S(1918, { council: 'Volksraad', vote: 'indirect', local: true, term: 4, note: 'The Volksraad, the People\'s Council: half appointed, half chosen by local councils, and only advisory.' }),
    ],
  },
};
/** Where a place has no history of its own: how its ruler's colonies usually went. */
const BY_RULER = {
  GB: [
    S(0, { council: 'Legislative Council', vote: 'none', note: 'A Legislative Council of officials and nominated members.' }),
    S(1900, { municipal: 'Town Board', mvote: 'property' }),
    S(1920, { local: true }),
    S(1946, { vote: 'property', term: 5, note: 'The first elected seats on the Legislative Council.' }),
    S(1955, { vote: 'universal', mvote: 'universal', note: 'Universal suffrage, and an elected majority.' }),
    S(1958, { leader: 'Chief Minister' }),
  ],
  FR: [
    S(0, { council: 'Conseil privé (the Governor\'s council)', vote: 'none' }),
    S(1946, { council: 'Territorial Assembly', vote: 'property', local: true, term: 5, note: 'The Fourth Republic: elected territorial assemblies, with a separate college for French citizens.' }),
    S(1956, { vote: 'universal', municipal: 'commune', mvote: 'universal', note: 'The Loi-cadre: universal suffrage in a single college.' }),
    S(1957, { leader: 'Vice-President of the Government Council' }),
  ],
  NL: [S(0, { council: 'Governor\'s council', vote: 'none' }), S(1937, { council: 'Staten', vote: 'property', local: true, term: 4 }), S(1949, { vote: 'universal' })],
  PT: [S(0, { council: 'Council of Government', vote: 'none' }), S(1920, { council: 'Legislative Council', vote: 'settlers', local: false, term: 4, note: 'A Legislative Council, partly elected by Portuguese citizens.' }), S(1961, { vote: 'property', local: true, note: 'The native statute abolished: Africans made Portuguese citizens on paper.' })],
  BE: [S(0, { council: 'the Colonial Council in Brussels', vote: 'none' }), S(1957, { municipal: 'commune', mvote: 'universal', note: 'The first municipal elections, in Léopoldville, Élisabethville and Jadotville.' })],
  US: [S(0, { council: 'territorial council', vote: 'none', local: true }), S(1920, { council: 'territorial legislature', vote: 'universal', term: 2 })],
  JP: [S(0, { council: 'Government-General', vote: 'none', nobody: true, note: 'The Governor-General rules by decree: there is no legislature.' }), S(1935, { municipal: 'local council', mvote: 'property', note: 'Half the seats on local councils elected, by those who pay enough tax.' })],
  DE: [S(0, { council: 'Governor\'s council', vote: 'none', nobody: true })],
  IT: [S(0, { council: 'Governor\'s council', vote: 'none', nobody: true })],
  ES: [S(0, { council: 'Governor\'s council', vote: 'none' })],
  DK: [S(0, { council: 'Governor\'s council', vote: 'none' })],
};

const cc = (state) => state.character?.countryId ?? 'US';
/** The polity here and now: steps merged up to this year, or null where none applies. */
export function polityHere(state) {
  const c = cc(state);
  const col = colonialHere(state);
  const sar = !col && ['HK', 'MO'].includes(c) && autonomyHere(state);
  const key = col ? col.ruler : sar ? 'SAR' : null;
  if (!key) return null;
  const steps = POLITY[c]?.[key] ?? BY_RULER[key];
  if (!steps) return null;
  const y = yearNow(state);
  const out = { key, ruler: col?.ruler ?? 'CN', sar: Boolean(sar), colony: col?.name ?? sar?.short ?? c, notes: [], term: 4, local: false };
  for (const [from, o] of steps) {
    if (from > y) break;
    const { note, ...rest } = o;
    Object.assign(out, rest);
    if (note) out.notes.push([from, note]);
  }
  return out.council || out.municipal ? out : null;
}

/** Your colonial politics: seats, standing, the record. */
const cp = (state) => (state.colonyPolitics ??= { recognition: 0, standing: 50, voice: 30, seats: {}, history: [] });
const crng = (state, salt) => new Random((((state.world?.seed ?? 1) * 7919) ^ (currentYear(state) * 131) ^ salt) >>> 0);
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
/** You belong to the ruling power: a settler or official, not a "native" or subject. */
const ofRuler = (state, p) => !p.sar && (isCitizen(state, p.ruler) || state.character.posting?.home?.countryId === p.ruler);
const VOTE_LABEL = { none: 'no elections: every unofficial member nominated', settlers: `elected by the ruling power's own citizens only`, property: 'elected on a property or education franchise', indirect: 'chosen by functional constituencies, colleges or chiefs\' councils', universal: 'elected by every adult', vetted: 'elected, but every candidate vetted first' };
/** Whose confidence counts: the Governor's, or (after a handover) Beijing's. */
export const patronOf = (p) => (p.sar ? 'Beijing\'s confidence' : 'the Governor\'s confidence');
/** Who governs: the Governor; in a SAR, the Chief Executive. */
const governor = (state, p) => (p.sar ? 'the Chief Executive' : colonialHere(state)?.leader ?? 'the Governor');

/** Whether you may stand for a body, or why not. */
export function standCheck(state, body) {
  const p = polityHere(state);
  if (!p) return 'No such body here';
  const name = body === 'municipal' ? p.municipal : p.council;
  const kind = body === 'municipal' ? p.mvote : p.vote;
  if (!name || !kind || kind === 'none') return `Nobody is elected to the ${name ?? 'council'}: members are nominated`;
  const age = state.character.age;
  const y = yearNow(state);
  if (age < (y >= 1970 ? 21 : 25)) return 'Too young to stand';
  if (state.character.gender === 'female' && y < (p.women ?? 1930) && kind !== 'universal' && kind !== 'vetted') return 'Women may not stand yet';
  if (kind === 'settlers' && !ofRuler(state, p)) return `Only ${rulerAdj(p.ruler)} citizens vote and stand here`;
  if (kind === 'property' && netWorth(state) < 15000 && !(state.housing?.properties ?? []).length && !(state.education?.degrees ?? []).length) return 'The franchise asks for property, income or education you do not have';
  if (kind === 'indirect' && body === 'council' && netWorth(state) < 50000 && !(state.education?.degrees ?? []).length && cp(state).recognition < 30) return 'Seats are chosen by professions, trades and colleges: you need standing in one';
  if (kind === 'vetted' && cp(state).voice > cp(state).standing) return 'The Candidate Eligibility Review Committee would not pass you';
  if (cp(state).seats[body]) return 'You already hold a seat';
  if (cp(state).candidacy) return 'You are already standing';
  return null;
}

const cost = (state, body) => Math.max(5, Math.round((body === 'municipal' ? 300 : 1500) * Math.min(3, priceLevel(state))));

function addSeat(ctx, p, body, how) {
  const s = cp(ctx.state);
  const y = currentYear(ctx.state);
  s.seats[body] = { body, name: body === 'municipal' ? p.municipal : p.council, how, cc: cc(ctx.state), since: y, ends: y + (body === 'municipal' ? 3 : how === 'nominated' ? 4 : p.term ?? 4), key: p.key };
}
function endSeat(state, body, reason) {
  const s = cp(state);
  const seat = s.seats[body];
  if (!seat) return;
  s.history.push({ ...seat, until: currentYear(state), reason });
  delete s.seats[body];
  if (body === 'council') s.leader = null;
}
/** The odds of winning a seat. */
function winChance(state, p, body, incumbent = false) {
  const s = cp(state);
  const kind = body === 'municipal' ? p.mvote : p.vote;
  let x = 0.22 + s.recognition / 220 + (state.civic?.party ? 0.1 : 0) + (s.seats.municipal && body === 'council' ? 0.06 : 0) + (incumbent ? 0.12 : 0);
  if (['settlers', 'property', 'indirect'].includes(kind)) x += Math.min(0.15, Math.max(0, Math.log10(Math.max(1, netWorth(state))) - 4) / 10) + s.standing / 600;
  else x += s.voice / 400;
  if (kind === 'vetted') x += s.standing / 400;
  return Math.max(0.05, Math.min(0.85, x));
}

/** Elections, nominations, terms and leaders, once a year. */
function yearly(ctx) {
  const { state } = ctx;
  const s = state.colonyPolitics;
  const p = polityHere(state);
  const y = currentYear(state);
  if (s && !p) {
    // Independence, or moving away: what you held goes into the record.
    const any = Object.keys(s.seats).length;
    const stayed = Object.values(s.seats).some((x) => (x.cc ?? cc(state)) === cc(state));
    if (any && stayed) {
      for (const body of Object.keys(s.seats)) endSeat(state, body, 'independence');
      if (state.politics) state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + Math.round(s.recognition / 3));
      ctx.log(`Independence: the colonial councils gave way to the new state's own. Your years on them made your name: voters know who you are.`, '🗳️', 'milestone');
    } else if (any) for (const body of Object.keys(s.seats)) endSeat(state, body, 'left');
    return;
  }
  if (!p || state.character.age < 18) return;
  const c = cp(state);
  // A handover ends the old council (Hong Kong's 1995 Legislative Council did not ride the "through train").
  for (const body of Object.keys(c.seats)) if (c.seats[body].key !== p.key && body === 'council') { endSeat(state, body, 'handover'); ctx.log(`At the handover the ${p.sar ? 'colonial ' : ''}council you sat on was dissolved.`, '🏛️', 'info'); }
  // The body was abolished or stopped being elected.
  for (const body of Object.keys(c.seats)) { const name = body === 'municipal' ? p.municipal : p.council; if (!name) { endSeat(state, body, 'abolished'); ctx.log('The council you sat on was abolished.', '🏛️', 'info'); } }
  const rng = crng(state, 0xc0105);
  // A candidacy: the poll.
  if (c.candidacy) {
    const { body } = c.candidacy;
    c.candidacy = null;
    const won = rng.next() < winChance(state, p, body);
    const name = body === 'municipal' ? p.municipal : p.council;
    c.recognition = clamp(c.recognition + (won ? 10 : 4));
    if (won) { addSeat(ctx, p, body, 'elected'); ctx.log(`You were elected to the ${name}.${body === 'council' && !p.sar ? ' You are "The Hon." while you sit.' : ''}`, '🗳️', 'milestone'); }
    else ctx.log(`You stood for the ${name} and lost.`, '🗳️', 'warn');
  }
  // Terms run out.
  for (const body of Object.keys(c.seats)) {
    const seat = c.seats[body];
    if (y < seat.ends) continue;
    if (seat.how === 'nominated') {
      if (c.standing >= 45 && rng.next() < 0.7) { seat.ends = y + 4; ctx.log(`${governor(state, p)[0].toUpperCase()}${governor(state, p).slice(1)} reappointed you to the ${seat.name}.`, '🏛️', 'info'); }
      else { endSeat(state, body, 'not reappointed'); ctx.log(`Your term on the ${seat.name} ended, and you were not reappointed.`, '🏛️', 'warn'); }
    } else {
      const kind = body === 'municipal' ? p.mvote : p.vote;
      if (!kind || kind === 'none') { endSeat(state, body, 'seat abolished'); continue; }
      if (kind === 'vetted' && c.voice > c.standing) { endSeat(state, body, 'disqualified'); ctx.log(`When your term ended, the review committee ruled you ineligible to stand again for the ${seat.name}.`, '🚫', 'bad'); continue; }
      if (rng.next() < winChance(state, p, body, true)) { seat.ends = y + (body === 'municipal' ? 3 : p.term ?? 4); ctx.log(`You held your seat on the ${seat.name} at the election.`, '🗳️', 'good'); }
      else { endSeat(state, body, 'defeated'); ctx.log(`You lost your seat on the ${seat.name}.`, '🗳️', 'bad'); }
    }
  }
  // A nomination to the Council: the Governor's choice of a notable.
  const nominated = p.council && !p.nobody && ['none', 'settlers', 'property', 'indirect'].includes(p.vote ?? 'none') && !p.sar;
  if (nominated && !c.seats.council && state.character.age >= 30 && (p.local || ofRuler(state, p)) && c.standing >= 45 && !state.prompts.some((x) => x.type === 'colonyPolitics.nominate')) {
    const notable = c.recognition + c.standing / 2 + Math.min(30, Math.max(0, Math.log10(Math.max(1, netWorth(state))) - 4) * 10) + ((state.education?.degrees ?? []).length ? 10 : 0);
    if (rng.next() < Math.max(0, (notable - 55) / 400)) {
      ctx.prompt({ type: 'colonyPolitics.nominate', icon: '🏛️', title: 'A Letter from Government House', text: `${governor(state, p)[0].toUpperCase()}${governor(state, p).slice(1)} proposes to nominate you an unofficial member of the ${p.council}. You would be "The Hon.", and one of the few ${ofRuler(state, p) ? 'unofficial' : COUNTRIES[cc(state)]?.demonym ?? 'local'} voices in it; some of your own people would call you the Governor's creature.`, options: [
        { id: 'accept', label: '🏛️ Accept the nomination', hint: 'A seat, and the Governor\'s ear' },
        { id: 'decline', label: '🙅 Decline it', hint: 'Your own people will remember' },
      ] });
    }
  }
  // An elected leader: the Chief Minister, the Premier, the Leader of Government Business.
  if (p.leader && p.leaderBy !== 'committee' && c.seats.council?.how === 'elected' && !c.leader && state.civic?.party && c.recognition >= 60 && rng.next() < 0.2) {
    c.leader = { title: p.leader, since: y };
    ctx.log(`Your party won the most seats, and you became ${p.leader}${p.leader === 'Premier' && cc(state) === 'IN' ? ' of your province' : ''}. ${p.sar ? '' : `${governor(state, p)[0].toUpperCase()}${governor(state, p).slice(1)} still holds the reserve powers, but the day-to-day government is yours.`}`, '🏛️', 'milestone');
  }
  // A SAR's Chief Executive: chosen by the Election Committee, and in practice by Beijing.
  if (p.leaderBy === 'committee' && !c.leader && state.character.age >= 45 && c.standing >= 80 && c.recognition >= 50 && ceYear(cc(state), y) && rng.next() < 0.12) {
    c.leader = { title: p.leader, since: y };
    ctx.log(`The Election Committee chose you as ${p.leader}, with Beijing's blessing. You were sworn in before the Premier of the State Council.`, '🏛️', 'milestone');
  } else if (c.leader && p.leaderBy === 'committee' && y - c.leader.since >= 5 && ceYear(cc(state), y)) {
    if (c.standing >= 70 && y - c.leader.since < 10) { c.leader.since = y; ctx.log('The Election Committee returned you for a second term as Chief Executive.', '🏛️', 'good'); }
    else { s.history.push({ body: 'leader', name: p.leader, how: 'committee', since: c.leader.since, until: y, reason: 'term ended' }); c.leader = null; ctx.log('Your time as Chief Executive is over: Beijing has chosen someone else.', '🏛️', 'info'); }
  }
  c.recognition = clamp(c.recognition - 1);
}
/** Chief Executive election years. */
const ceYear = (c, y) => (c === 'HK' ? [1996, 2002, 2005, 2007, 2012, 2017, 2022, 2027, 2032] : [1999, 2004, 2009, 2014, 2019, 2024, 2029, 2034]).includes(y);

export const ColonialPoliticsModule = {
  id: 'colonyPolitics',
  order: 33.2,
  onAgeUp(ctx) { yearly(ctx); },
  actions: {
    /** Put your name to a petition: to the Governor, to London, to the Legislative Council. */
    petition(ctx) {
      const { state } = ctx;
      const p = polityHere(state);
      if (!p || state.character.age < 16) return ctx.toast('No petition to sign here.', 'warn');
      if (yearlyCount(state, 'colonyPolitics.petition')) return ctx.toast('You petitioned this year.', 'warn');
      bumpYearly(state, 'colonyPolitics.petition');
      const c = cp(state);
      c.voice = clamp(c.voice + 5); c.recognition = clamp(c.recognition + 3); c.standing = clamp(c.standing - 3);
      const rec = state.era?.colonies?.[cc(state)];
      if (rec && !p.sar) rec.pressure = (rec.pressure ?? 0) + 0.5;
      const to = p.sar ? 'the Legislative Council' : rng1(state) < 0.5 ? governor(state, p) : `the ${rulerAdj(p.ruler) === 'British' ? 'Colonial Office in London' : `government in ${rulerName(p.ruler)}`}`;
      ctx.log(`You gathered signatures for a petition to ${to}${p.sar ? ' about housing and the cost of living' : ' for more say in how the colony is run'}. It was received, and filed.`, '✍️', 'info');
    },
    /** Be seen at Government House: the levée, the Governor's garden party, the Chamber of Commerce dinner. */
    cultivate(ctx) {
      const { state } = ctx;
      const p = polityHere(state);
      if (!p || state.character.age < 21) return ctx.toast('Not here.', 'warn');
      if (yearlyCount(state, 'colonyPolitics.cultivate')) return ctx.toast('You have been seen this year.', 'warn');
      if (!ctx.spend(cost(state, 'municipal'), 'Subscriptions and dinners')) return ctx.toast('You cannot afford the round.', 'warn');
      bumpYearly(state, 'colonyPolitics.cultivate');
      const c = cp(state);
      c.standing = clamp(c.standing + 7); c.recognition = clamp(c.recognition + 2); c.voice = clamp(c.voice - 2);
      ctx.log(p.sar
        ? `You went to the ${yearNow(state) >= 2000 ? 'Liaison Office' : 'Xinhua News Agency'}'s National Day reception and sat on two advisory committees. People in the right places noticed.`
        : `You were at ${governor(state, p)}'s levée and the garden party, and subscribed to the right charities. People at Government House began to know your name.`, '🎩', 'info');
    },
    /** Stand for the town council or the Legislative Council at the next election. */
    stand(ctx, body = 'municipal') {
      const { state } = ctx;
      const p = polityHere(state);
      const why = standCheck(state, body);
      if (why) return ctx.toast(why, 'warn');
      if (!ctx.spend(cost(state, body), 'Election expenses')) return ctx.toast('You cannot afford a campaign.', 'warn');
      cp(state).candidacy = { body, year: currentYear(state) };
      ctx.log(`You put your name forward for the ${body === 'municipal' ? p.municipal : p.council}. The poll comes this year.`, '🗳️', 'info');
    },
    /** Ask a question in Council: the unofficial member's weapon. */
    question(ctx) {
      const { state } = ctx;
      const p = polityHere(state);
      const seat = cp(state).seats.council;
      if (!p || !seat) return ctx.toast('You do not sit on the Council.', 'warn');
      if (yearlyCount(state, 'colonyPolitics.question')) return ctx.toast('You have asked your questions this session.', 'warn');
      bumpYearly(state, 'colonyPolitics.question');
      const c = cp(state);
      c.voice = clamp(c.voice + 4); c.recognition = clamp(c.recognition + 4);
      const topic = (crng(state, 0x9e7).next() < 0.5) ? (yearNow(state) >= 1950 ? 'the waiting list for public housing' : 'the water supply in the crowded districts') : (yearNow(state) >= 1930 ? 'why so few senior posts go to local officers' : 'the opium revenue and what it pays for');
      ctx.log(`You asked the ${p.sar ? 'Secretary' : 'Colonial Secretary'} in Council about ${topic}. The answer was evasive, and the papers printed both.`, '❓', 'info');
    },
    /** The year's business before the Council: vote with the officials, or against them. */
    debate(ctx) {
      const { state } = ctx;
      const p = polityHere(state);
      if (!p || !cp(state).seats.council) return ctx.toast('You do not sit on the Council.', 'warn');
      if (yearlyCount(state, 'colonyPolitics.debate')) return ctx.toast('The session is over.', 'warn');
      if (state.prompts.some((x) => x.type === 'colonyPolitics.debate')) return;
      bumpYearly(state, 'colonyPolitics.debate');
      const q = councilQuestion(state, crng(state, 0xdeb));
      ctx.prompt({ type: 'colonyPolitics.debate', icon: '🏛️', title: `In the ${p.council}`, text: q.text, data: { id: q.id }, options: [
        { id: 'official', label: `🏛️ ${q.official}`, hint: `Good for ${patronOf(p).replace(' confidence', '')}` },
        { id: 'local', label: `🗣️ ${q.local}`, hint: 'Good for your name outside' },
        { id: 'quiet', label: '🤐 Abstain' },
      ] });
    },
    /** As Chief Minister or Premier: press the imperial capital for self-government. */
    selfRule(ctx) {
      const { state } = ctx;
      const p = polityHere(state);
      const c = cp(state);
      if (!p || p.sar || !c.leader) return ctx.toast('Only the leader of an elected government can lead the talks.', 'warn');
      if ((c.lastTalks ?? -99) > currentYear(state) - 2) return ctx.toast('The last conference was not long ago.', 'warn');
      c.lastTalks = currentYear(state);
      const rec = state.era?.colonies?.[cc(state)];
      if (rec) rec.pressure = (rec.pressure ?? 0) + 3;
      c.voice = clamp(c.voice + 8); c.standing = clamp(c.standing - 5);
      ctx.stat('stress', 5);
      const capital = p.ruler === 'GB' ? 'Lancaster House in London' : p.ruler === 'FR' ? 'Paris' : p.ruler === 'PT' ? 'Lisbon' : p.ruler === 'NL' ? 'The Hague' : p.ruler === 'BE' ? 'Brussels' : `${rulerName(p.ruler)}`;
      ctx.log(`You led your delegation to a constitutional conference at ${capital}, and came home with a date being talked about.`, '✈️', 'milestone');
    },
    /** A Chief Executive's annual Policy Address. */
    policyAddress(ctx) {
      const { state } = ctx;
      const p = polityHere(state);
      const c = cp(state);
      if (!p?.sar || !c.leader) return ctx.toast('Only the Chief Executive delivers the Policy Address.', 'warn');
      if (yearlyCount(state, 'colonyPolitics.policyAddress')) return ctx.toast('You gave this year\'s Policy Address.', 'warn');
      bumpYearly(state, 'colonyPolitics.policyAddress');
      c.recognition = clamp(c.recognition + 3);
      ctx.stat('stress', 4);
      ctx.log(`You delivered the Policy Address to the ${p.council}: land supply, housing, and ${yearNow(state) >= 2019 ? 'national security' : 'integration with the mainland'}. The applause came from one side of the chamber.`, '📜', 'info');
    },
    /** Resign a seat. */
    resign(ctx, body = 'council') {
      const { state } = ctx;
      const seat = cp(state).seats[body];
      if (!seat) return ctx.toast('You hold no such seat.', 'warn');
      endSeat(state, body, 'resigned');
      const c = cp(state);
      c.voice = clamp(c.voice + 6); c.standing = clamp(c.standing - 10);
      ctx.log(`You resigned your seat on the ${seat.name}.`, '🚪', 'info');
    },
  },
  resolvers: {
    nominate(ctx, data, optionId) {
      const { state } = ctx;
      const p = polityHere(state);
      if (!p?.council) return;
      const c = cp(state);
      if (optionId === 'accept') {
        addSeat(ctx, p, 'council', 'nominated');
        c.standing = clamp(c.standing + 5); c.voice = clamp(c.voice - 5); c.recognition = clamp(c.recognition + 8);
        return ctx.log(`You took your seat as a nominated member of the ${p.council}. You are "The Hon." while you sit.`, '🏛️', 'honor');
      }
      c.voice = clamp(c.voice + 10); c.standing = clamp(c.standing - 10);
      ctx.log(`You declined a seat on the ${p.council}. The nationalist papers made much of it.`, '🙅', 'info');
    },
    debate(ctx, data, optionId) {
      const { state } = ctx;
      const p = polityHere(state);
      const c = cp(state);
      if (optionId === 'official') { c.standing = clamp(c.standing + 7); c.voice = clamp(c.voice - 6); return ctx.log('You voted with the officials. The motion carried.', '🏛️', 'info'); }
      if (optionId === 'local') {
        c.standing = clamp(c.standing - 8); c.voice = clamp(c.voice + 9); c.recognition = clamp(c.recognition + 3);
        const rec = state.era?.colonies?.[cc(state)];
        if (rec && !p?.sar) rec.pressure = (rec.pressure ?? 0) + 1;
        const elected = ['universal', 'vetted'].includes(p?.vote) && c.leader;
        return ctx.log(elected ? 'You carried the vote against the officials.' : 'You spoke and voted against the officials. They had the numbers, as they always did, but your speech went round the city.', '🗣️', elected ? 'good' : 'info');
      }
      ctx.log('You abstained.', '🤐', 'info');
    },
  },
};
const rng1 = (state) => crng(state, 0x1).next();

/** For the views: the polity, your seats, and what you can do. */
export function colonyPoliticsInfo(state) {
  const p = polityHere(state);
  if (!p) return null;
  const c = state.colonyPolitics ?? { recognition: 0, standing: 50, voice: 30, seats: {}, history: [] };
  return { p, c, governor: governor(state, p), voteLabel: VOTE_LABEL, standMunicipal: p.municipal ? standCheck(state, 'municipal') : 'none', standCouncil: p.council ? standCheck(state, 'council') : 'none', cost: { municipal: cost(state, 'municipal'), council: cost(state, 'council') } };
}
