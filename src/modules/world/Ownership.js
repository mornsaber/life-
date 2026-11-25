/**
 * Public and private sector: who owns the place you work.
 *
 *   Planned economies   every workplace is the state's: a kolkhoz or a sovkhoz, a Gastronom, a
 *                       Polish PGR or Społem cooperative, a VEB in the GDR, a Czechoslovak národní
 *                       podnik, a Yugoslav self-managed enterprise, a Chinese danwei. Some left a
 *                       little private: Poland's peasant farms, Hungary's small traders after 1982.
 *   Market economies    the sectors history nationalised (OwnershipHistory.js): the National Coal
 *                       Board, British Rail, EDF, the SNCF, Japanese National Railways, Air India,
 *                       the NHS hospitals; and sold again.
 *   Your laws           each sector is a statute ("Public ownership of the railways"): a government
 *                       in this world can nationalise it or privatise it (StatuteBook.js). A planned
 *                       economy that privatises small trade lets people open shops and cafés again.
 *
 * When the owner changes, your employer changes with it: nationalised (the firm becomes the state
 * board, and in a revolution nothing is paid for it) or privatised (a new name, and shares offered).
 * state.ownership = { seen: { [sector]: 'state'|'private' } }
 */
import { yearNow } from './Eras.js';
import { COUNTRIES } from './Countries.js';
import { statuteOverride } from '../politics/StatuteBook.js';
import { SECTORS, PLANNED_EXCEPTIONS, OWNERSHIP } from './OwnershipHistory.js';
import { getProfession } from '../career/JobTrees.js';

export { SECTORS };
// Regimes.js hands over its lookup (importing it here would loop through the career modules).
let regimeOf = () => null;
export const setRegimeLookup = (f) => { regimeOf = f; };
const rowAt = (rows, y) => rows?.find(([a, b]) => y >= a && y < b);
const SOVIET = ['RU', 'UA', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'UZ', 'KG', 'TJ', 'TM', 'MD', 'EE', 'LV', 'LT'];
const YUGO = ['RS', 'HR', 'SI', 'BA', 'MK', 'ME'];
const BY_ID = Object.fromEntries(Object.entries(SECTORS).flatMap(([s, d]) => d.professions.map((p) => [p, s])));

/** The sector a profession works in (null: none that is nationalised as such). */
export const sectorOf = (profession) => (profession ? BY_ID[profession.id] ?? BY_ID[profession.template] ?? null : null);
export const statuteId = (sector) => `ownership_${sector}`;
const planned = (cc) => regimeOf(cc)?.business === 'state';

/** The share of a sector's employers the state owns here and now (0–1). */
export function stateShare(state, sector, cc = state.character.countryId ?? 'US', y = yearNow(state)) {
  if (sector) {
    const o = statuteOverride(state, statuteId(sector), cc);
    if (o === true) return 1;
    if (o === false) return 0;
  }
  if (planned(cc)) {
    const ex = sector ? rowAt(PLANNED_EXCEPTIONS[cc]?.[sector], y) : null;
    return ex ? ex[2] : 1;
  }
  if (!sector) return 0;
  const t = OWNERSHIP[sector] ?? {};
  return rowAt(t[cc] ?? t['*'], y)?.[2] ?? 0;
}
/** Does a job in this profession here and now go to a state employer? (rolled per employer) */
export function stateEmployerFor(state, profession, cc, rng) {
  if (!profession || profession.sector !== 'private' || profession.intl || profession.campus) return false;
  const share = stateShare(state, sectorOf(profession), cc);
  return share >= 1 || (share > 0 && rng.chance(share));
}

/* ---- Names ---- */
const n = (rng, a = 1, b = 30) => rng.int(a, b);
const KOLKHOZ = ['Lenin', 'Red October', 'Path to Communism', 'Kirov', 'Bright Dawn', 'Red Banner', 'Thirty Years of October'];
/** How the bloc named things: by kind of work. */
const BLOC = {
  su: { farm: (c, r) => [`the "${r.pick(KOLKHOZ)}" collective farm (kolkhoz)`, `the ${c} state farm (sovkhoz)`], shop: (c, r) => [`${c} Gastronom No. ${n(r)}`, `the ${c} Univermag (department store)`], canteen: (c, r) => [`${c} public catering trust (stolovaya No. ${n(r)})`, `the Intourist hotel in ${c}`],
    factory: (c, r) => [`the ${c} Machine-Building Plant`, `${c} state works No. ${n(r)}`, `the ${c} Tractor Works`], build: (c, r) => [`${c} construction trust No. ${n(r, 1, 12)}`], office: (c) => [`the ${c} regional trust`, `a ministry trust in ${c}`],
    design: (c, r) => [`the ${c} scientific research institute (NII-${n(r, 1, 60)})`, `design bureau OKB-${n(r, 1, 50)}`], transport: (c, r) => [`${c} motor transport combine No. ${n(r, 1, 9)}`], bank: () => ['Gosbank (the State Bank of the USSR)'],
    rail: (c, y) => [y < 1946 ? 'the People\'s Commissariat of Railways' : 'the Ministry of Railways (MPS)'], airline: () => ['Aeroflot'], coal: () => ['Donetsk coal trust', 'the Kuzbass coal combine'], hospital: (c, r) => [`${c} City Hospital No. ${n(r, 1, 40)}`, `${c} polyclinic No. ${n(r, 1, 40)}`] },
  pl: { farm: (c) => [`PGR ${c} (state farm)`, `the ${c} agricultural cooperative (RSP)`], shop: (c) => [`PSS Społem ${c} (consumer cooperative)`, `Domy Towarowe Centrum, ${c}`], canteen: (c) => [`the Orbis hotel in ${c}`, `a milk bar run by Społem ${c}`],
    factory: (c) => [`Zakłady Mechaniczne ${c} (state enterprise)`, `Zakłady Przemysłowe ${c}`], build: (c) => [`Przedsiębiorstwo Budownictwa ${c}`], office: (c) => [`an industrial union (zjednoczenie) in ${c}`], design: (c) => [`Biuro Projektów ${c}`, `the ${c} research institute`],
    transport: (c) => [`PKS ${c} (state road transport)`], bank: () => ['PKO (the state savings bank)', 'Narodowy Bank Polski'], rail: () => ['PKP (Polish State Railways)'], airline: () => ['LOT Polish Airlines'], coal: () => ['the Wujek colliery (state mine)', 'Katowice coal union'], hospital: (c, r) => [`Szpital Miejski nr ${n(r, 1, 6)}, ${c}`, `the ${c} voivodeship hospital`] },
  dd: { farm: (c) => [`LPG ${c} (agricultural cooperative)`, `VEG ${c} (state farm)`], shop: (c) => [`HO ${c} (Handelsorganisation)`, `Konsum ${c}`], canteen: (c) => [`HO-Gaststätte ${c}`, `Interhotel ${c}`],
    factory: (c) => [`VEB Maschinenbau ${c}`, `VEB Kombinat ${c}`], build: (c) => [`VEB Bau ${c}`], office: (c) => [`VEB Kombinat ${c} (head office)`], design: (c) => [`VEB Projektierung ${c}`, `an Academy of Sciences institute in ${c}`],
    transport: (c) => [`VEB Kraftverkehr ${c}`], bank: () => ['Staatsbank der DDR', 'the Sparkasse'], rail: () => ['Deutsche Reichsbahn'], airline: () => ['Interflug'], coal: () => ['VEB Braunkohlenwerk (lignite combine)'], hospital: (c) => [`Bezirkskrankenhaus ${c}`, `Poliklinik ${c}`] },
  cs: { farm: (c) => [`JZD ${c} (unified agricultural cooperative)`, `a state farm (státní statek) near ${c}`], shop: (c) => [`Jednota ${c} (consumer cooperative)`, `Pramen ${c}`], canteen: (c) => [`Restaurace a jídelny ${c}`, `Interhotel ${c}`],
    factory: (c) => [`${c} strojírny, národní podnik`, `a národní podnik in ${c}`], build: (c) => [`Pozemní stavby ${c}, n.p.`], office: (c) => [`the directorate of a národní podnik in ${c}`], design: (c) => [`Výzkumný ústav ${c}`, `Projektový ústav ${c}`],
    transport: (c) => [`ČSAD ${c}`], bank: () => ['Státní banka československá'], rail: () => ['ČSD (Czechoslovak State Railways)'], airline: () => ['ČSA (Czechoslovak Airlines)'], coal: () => ['OKD (Ostrava-Karviná Mines)'], hospital: (c) => [`OÚNZ ${c} (district health institute)`] },
  hu: { farm: (c) => [`${c} Termelőszövetkezet (cooperative farm)`, `an állami gazdaság (state farm) near ${c}`], shop: (c) => [`Közért ${c}`, `ÁFÉSZ ${c} (cooperative)`], canteen: (c) => [`Vendéglátó Vállalat ${c}`, `HungarHotels ${c}`],
    factory: (c) => [`${c} Gépgyár (state enterprise)`, `a vállalat in ${c}`], build: (c) => [`${c} Állami Építőipari Vállalat`], office: (c) => [`a state trust in ${c}`], design: (c) => [`${c} Tervező Iroda (design office)`], transport: (c) => [`Volán ${c}`],
    bank: () => ['Magyar Nemzeti Bank', 'OTP (the National Savings Bank)'], rail: () => ['MÁV (Hungarian State Railways)'], airline: () => ['Malév'], coal: () => ['the Tatabánya coal mines (state trust)'], hospital: (c) => [`${c} Megyei Kórház (county hospital)`] },
  ro: { farm: (c) => [`CAP ${c} (collective farm)`, `IAS ${c} (state farm)`], shop: (c) => [`Magazinul Universal ${c}`, `the ${c} consumer cooperative`], canteen: (c) => [`an ONT Carpați hotel in ${c}`],
    factory: (c) => [`Întreprinderea Mecanică ${c}`, `Combinatul ${c}`], build: (c) => [`Trustul de Construcții ${c}`], office: (c) => [`Centrala Industrială ${c}`], design: (c) => [`Institutul de Proiectări ${c}`], transport: (c) => [`ITA ${c} (state transport)`],
    bank: () => ['Banca Națională', 'CEC (the state savings bank)'], rail: () => ['CFR (Romanian Railways)'], airline: () => ['TAROM'], coal: () => ['the Jiu Valley coal combine'], hospital: (c) => [`Spitalul Județean ${c}`] },
  bg: { farm: (c) => [`TKZS ${c} (cooperative farm)`, `an agro-industrial complex near ${c}`], shop: (c) => [`the ${c} cooperative store`], canteen: (c) => [`a Balkantourist hotel in ${c}`], factory: (c) => [`Zavod ${c} (state works)`, `DSO ${c} (state economic association)`],
    build: (c) => [`Stroitelen trust ${c}`], office: (c) => [`DSO ${c} (head office)`], design: (c) => [`a research institute in ${c}`], transport: (c) => [`DAP ${c} (state motor transport)`], bank: () => ['the Bulgarian National Bank'], rail: () => ['BDŽ (Bulgarian State Railways)'], airline: () => ['Balkan Bulgarian Airlines'], coal: () => ['the Pernik mines'], hospital: (c) => [`${c} district hospital`] },
  al: { farm: (c) => [`Kooperativa Bujqësore ${c} (cooperative farm)`, `Ndërmarrja Bujqësore ${c} (state farm)`], shop: (c) => [`Ndërmarrja Tregtare ${c} (state shop)`], canteen: (c) => [`the Albturist hotel in ${c}`], factory: (c) => [`Kombinati ${c}`, `Uzina ${c} (state works)`],
    build: (c) => [`Ndërmarrja e Ndërtimit ${c} (state builders)`], office: (c) => [`Ndërmarrja ${c} (state enterprise)`], design: (c) => [`Instituti i Studimeve dhe Projektimeve ${c}`], transport: (c) => [`Ndërmarrja e Transportit ${c}`], bank: () => ['Banka e Shtetit Shqiptar (the State Bank of Albania)'],
    rail: () => ['Hekurudha Shqiptare (Albanian Railways)'], airline: () => ['Albtransport'], coal: () => ['the Memaliaj coal mine'], hospital: (c) => [`Spitali i Rrethit ${c} (district hospital)`] },
  yu: { farm: (c) => [`PIK ${c} (agro-industrial combine)`, `a socially owned farm near ${c}`], shop: (c) => [`Robna kuća ${c} (department store)`], canteen: (c) => [`Hotel ${c} (socially owned)`], factory: (c) => [`a workers' self-managed enterprise (OOUR) in ${c}`, `${c} metal works (socially owned)`],
    build: (c) => [`Građevinsko preduzeće ${c}`], office: (c) => [`SOUR ${c} (composite organisation of associated labour)`], design: (c) => [`Institut ${c}`], transport: (c) => [`Autotransport ${c}`], bank: () => ['Jugobanka', 'Beogradska banka'], rail: () => ['JŽ (Yugoslav Railways)'], airline: () => ['JAT Yugoslav Airlines'], coal: () => ['the Kolubara mines'], hospital: (c) => [`the ${c} general hospital (health centre)`] },
  cn: { farm: (c, r, y) => (y < 1983 ? [`the ${c} people's commune`, 'a state farm'] : ['your family plot (household responsibility)']), shop: (c, r) => [`the ${c} No. ${n(r, 1, 9)} Department Store`, `the ${c} supply and marketing cooperative`], canteen: (c) => [`a state-run restaurant in ${c}`, `the ${c} Friendship Hotel`],
    factory: (c, r) => [`${c} No. ${n(r, 1, 12)} State-Owned Factory`], build: (c, r) => [`${c} Construction Company No. ${n(r, 1, 9)}`], office: (c) => [`a work unit (danwei) in ${c}`], design: (c) => [`the ${c} Design Institute`, `an Academy of Sciences institute in ${c}`], transport: (c) => [`the ${c} Transport Company`],
    bank: () => ['the People\'s Bank of China'], rail: () => ['the Ministry of Railways'], airline: () => ['CAAC (Civil Aviation Administration of China)'], coal: () => ['the Datong coal mines (state-owned)'], hospital: (c, r) => [`${c} People's Hospital No. ${n(r, 1, 6)}`] },
  gen: { farm: (c) => [`the state farm outside ${c}`, `the ${c} agricultural cooperative`], shop: (c) => [`the ${c} state shop`, `the people's store in ${c}`], canteen: (c) => [`the ${c} people's canteen`, `the state hotel in ${c}`], factory: (c, r) => [`${c} state enterprise No. ${n(r, 1, 20)}`],
    build: (c) => [`the ${c} state construction enterprise`], office: (c) => [`a state enterprise in ${c}`], design: (c) => [`the ${c} state design institute`], transport: (c) => [`the ${c} state transport enterprise`], bank: (c, r, y, name) => [`the State Bank of ${name}`], rail: (c, r, y, name) => [`the ${name} State Railways`],
    airline: (c, r, y, name) => [`${name} state airline`], coal: () => ['the state coal enterprise'], hospital: (c) => [`the ${c} state hospital`],
    power: (c, r, y, name) => [`the ${name} State Electricity Board`], telecom: (c, r, y, name) => [`the ${name} Posts and Telecommunications`] },
};
const styleOf = (state, cc) => (SOVIET.includes(cc) ? 'su' : YUGO.includes(cc) ? 'yu' : cc === 'DE' || cc === 'DD' ? 'dd' : ({ PL: 'pl', CZ: 'cs', SK: 'cs', HU: 'hu', RO: 'ro', BG: 'bg', AL: 'al', CN: 'cn' })[cc] ?? 'gen');

/** The West's nationalised boards. */
const WEST = {
  GB: { coal: (c, y) => [y < 1987 ? 'the National Coal Board' : 'British Coal'], rail: (c, y) => [y < 1965 ? 'British Railways' : 'British Rail'], power: (c, y) => [y < 1958 ? 'the British Electricity Authority' : 'the Central Electricity Generating Board', 'the area Electricity Board'],
    telecom: (c, y) => [y < 1969 ? 'the General Post Office (telephones)' : y < 1981 ? 'Post Office Telecommunications' : 'British Telecom'], airline: (c, y) => (y < 1946 ? ['BOAC'] : y < 1974 ? ['BOAC', 'BEA'] : ['British Airways']), banking: () => ['the Bank of England'],
    health: (c) => [`${c} General Hospital (NHS)`, `the ${c} Royal Infirmary (NHS)`] },
  FR: { coal: () => ['Charbonnages de France (Houillères du bassin du Nord)'], rail: () => ['SNCF'], power: () => ['Électricité de France (EDF)'], telecom: (c, y) => [y < 1988 ? 'the PTT (Télécommunications)' : 'France Télécom'], airline: () => ['Air France'],
    banking: (c, y) => (y < 1966 ? ['Crédit Lyonnais', 'Société Générale', 'Comptoir national d\'escompte'] : ['Crédit Lyonnais', 'Société Générale', 'BNP (Banque Nationale de Paris)']) },
  DE: { rail: (c, y) => [y < 1949 ? 'Deutsche Reichsbahn' : y < 1994 ? 'Deutsche Bundesbahn' : 'Deutsche Bahn'], telecom: (c, y) => [y < 1949 ? 'Deutsche Reichspost' : 'Deutsche Bundespost (telephones)'], airline: () => ['Deutsche Lufthansa'] },
  IT: { rail: () => ['Ferrovie dello Stato'], power: () => ['ENEL'], telecom: () => ['SIP (IRI-STET)'], airline: () => ['Alitalia'], coal: () => ['Carbosarda (state mines)'], banking: () => ['Banca Commerciale Italiana (IRI)', 'Credito Italiano (IRI)', 'Banco di Roma (IRI)'], health: (c) => [`the ${c} Unità Sanitaria Locale (hospital)`] },
  JP: { rail: (c, y) => [y < 1949 ? 'Imperial Government Railways' : 'Japanese National Railways'], telecom: (c, y) => [y < 1952 ? 'the Ministry of Communications (telephones)' : 'Nippon Telegraph and Telephone Public Corporation'], airline: () => ['Japan Air Lines'] },
  IN: { rail: () => ['Indian Railways'], coal: () => ['Coal India'], power: (c) => ['the State Electricity Board'], telecom: (c, y) => [y < 1985 ? 'Indian Posts and Telegraphs' : 'the Department of Telecommunications'], airline: () => ['Air India', 'Indian Airlines'],
    banking: () => ['the State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank'] },
  US: { rail: (c, y) => (y >= 1976 && y < 1987 ? ['Amtrak', 'Conrail'] : ['Amtrak']), power: () => ['the Tennessee Valley Authority'] },
  CA: { rail: () => ['Canadian National Railways'], airline: (c, y) => [y < 1965 ? 'Trans-Canada Air Lines' : 'Air Canada'], power: () => ['the provincial hydro-electric commission'] },
  AU: { rail: () => ['the state Government Railways'], telecom: (c, y) => [y < 1975 ? 'the Postmaster-General\'s Department' : 'Telecom Australia'], airline: () => ['Qantas', 'Trans Australia Airlines'], power: () => ['the State Electricity Commission'] },
  NZ: { rail: () => ['New Zealand Railways'], telecom: () => ['the New Zealand Post Office (telephones)'], airline: (c, y) => [y < 1965 ? 'TEAL' : 'Air New Zealand'], power: () => ['the New Zealand Electricity Department'], health: (c) => [`the ${c} public hospital`] },
  MX: { banking: () => ['Bancomer (nationalised)', 'Banamex (nationalised)'], rail: () => ['Ferrocarriles Nacionales de México'], power: () => ['Comisión Federal de Electricidad'] },
  ES: { rail: () => ['RENFE'], airline: () => ['Iberia'], telecom: () => ['Telefónica'], health: (c) => [`Hospital del INSALUD, ${c}`] },
};
const KIND = (profession) => {
  const id = profession.template ?? profession.id;
  const s = sectorOf(profession);
  if (s === 'farming') return 'farm';
  if (s === 'health') return 'hospital';
  if (['coal', 'rail', 'airline', 'power', 'telecom'].includes(s)) return s;
  if (s === 'banking' || ['accounting', 'insurance', 'actuary'].includes(id)) return 'bank';
  if (['retail', 'milkRound', 'pharmacy', 'optometry'].includes(id)) return 'shop';
  if (['culinary', 'hospitality', 'cruise'].includes(id)) return 'canteen';
  if (['trucking', 'logistics', 'docks', 'craneOperator', 'merchantMarine'].includes(id)) return 'transport';
  if (['trades', 'plumbing', 'carpentry', 'hvac', 'ironworking', 'welding', 'lineworker', 'surveying', 'architecture'].includes(id)) return 'build';
  if (/Eng$|engineering|tech|research|design|dataScience|cybersecurity|gameDevelopment|aerospace|spaceIndustry/.test(id)) return 'design';
  if (['corporate', 'humanResources', 'sales', 'law', 'legalSupport', 'journalism', 'interpreter'].includes(id)) return 'office';
  return 'factory';
};

/** A state employer's name for this work, here and now. */
export function stateEnterpriseName(state, profession, cc, city, rng) {
  const y = yearNow(state);
  const c = city || 'the town';
  // "the Polish Posts and Telecommunications", not "the the Polish People's Republic …".
  const name = COUNTRIES[cc]?.demonym ?? (COUNTRIES[cc]?.name ?? cc).replace(/^the /, '');
  const sector = sectorOf(profession);
  if (!planned(cc)) {
    const w = WEST[cc]?.[sector];
    const list = w ? w(c, y) : (BLOC.gen[KIND(profession)] ?? BLOC.gen.factory)(c, rng, y, name);
    return list?.length ? rng.pick(list) : null;
  }
  const style = state.character.countryId === cc && /German Democratic Republic/.test(regimeOf(cc)?.name ?? '') ? 'dd' : styleOf(state, cc);
  const kind = KIND(profession);
  const f = BLOC[style]?.[kind] ?? BLOC.gen[kind] ?? BLOC.gen.factory;
  const list = f(c, rng, y, name);
  return list?.length ? rng.pick(list) : null;
}

/* ---- Changing hands in your lifetime ---- */
const PRIVATE_AFTER = {
  GB: { coal: ['RJB Mining'], rail: ['a private train operating company', 'English Welsh & Scottish Railway'], power: ['National Power', 'PowerGen', 'a regional electricity company'], telecom: ['BT'], airline: ['British Airways plc'] },
  FR: { telecom: ['France Télécom (listed)'], airline: ['Air France–KLM'], banking: ['Société Générale (privatised)', 'BNP (privatised)'] },
  DE: { telecom: ['Deutsche Telekom'], airline: ['Deutsche Lufthansa AG'] },
  JP: { rail: ['JR East', 'JR Central', 'JR West'], telecom: ['NTT'], airline: ['Japan Airlines (privatised)'] },
  IT: { power: ['Enel (listed)'], telecom: ['Telecom Italia'], airline: ['Alitalia (privatised)'] },
  NZ: { rail: ['Tranz Rail'], telecom: ['Telecom New Zealand'] },
  AU: { telecom: ['Telstra'], airline: ['Qantas (privatised)'] },
};
/**
 * A private employer's name where history sold the sector (British Rail's train operating companies,
 * BT, PowerGen), or a planned economy left it private (a peasant smallholding). null: the usual list.
 */
export function privateEmployerName(state, profession, cc, city, rng) {
  const sector = sectorOf(profession);
  if (!sector) return null;
  const y = yearNow(state);
  if (planned(cc)) {
    if (sector === 'farming') return rng.pick([`the family smallholding outside ${city || 'the village'}`, 'a peasant farm of a few hectares']);
    if (sector === 'smallTrade') return rng.pick([`a licensed private workshop in ${city || 'town'}`, `a small private business in ${city || 'town'} (with a state licence)`]);
    return null;
  }
  const rows = OWNERSHIP[sector]?.[cc];
  const sold = rows?.some(([, until]) => until <= y);
  const list = PRIVATE_AFTER[cc]?.[sector];
  if (!sold || !list) return null;
  // Britain's coal: RJB Mining, then UK Coal (2001).
  if (cc === 'GB' && sector === 'coal' && y >= 2001) return 'UK Coal';
  return rng.pick(list);
}
const own = (state) => (state.ownership ??= { seen: {} });

export const OwnershipModule = {
  id: 'ownership',
  order: 22.7,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career?.job;
    if (!state.character.alive || !job?.employer) return;
    let profession;
    try { profession = getProfession(job.professionId); } catch { return; }
    if (profession.sector !== 'private' || profession.intl || profession.campus) return;
    const cc = state.character.countryId ?? 'US';
    const sector = sectorOf(profession);
    const share = stateShare(state, sector, cc);
    // First sight of this job (an older save, or a new hire): note who owns it, quietly.
    const o = own(state);
    if (o.jobId !== job.employer.id) {
      o.jobId = job.employer.id;
      if (share >= 1) job.employer.ownership = 'state';
      return;
    }
    const wasState = job.employer.ownership === 'state';
    // Only a clear change of hands moves an existing employer: a sector all the state's, or all sold.
    if (!wasState && share >= 1) {
      const old = job.employer.name;
      const name = stateEnterpriseName(state, profession, cc, job.employer.city, rng) ?? `the state ${SECTORS[sector]?.label ?? 'enterprise'}`;
      job.employer.name = name; job.employer.ownership = 'state';
      const org = state.orgs?.byId?.[job.employer.orgId]; if (org) org.name = name;
      const revolution = planned(cc);
      ctx.log(revolution
        ? `${old} was taken into state ownership without compensation. The owners are gone; you now work for ${name}, and the Party secretary sits in on meetings.`
        : `${SECTORS[sector]?.label ? `${SECTORS[sector].label[0].toUpperCase()}${SECTORS[sector].label.slice(1)} were nationalised` : 'Your firm was nationalised'}: ${old} is now part of ${name}. Same work, a new sign over the gate, and the shareholders paid in government stock.`, '🏛️', 'milestone');
    } else if (wasState && share <= 0) {
      const old = job.employer.name;
      const list = PRIVATE_AFTER[cc]?.[sector];
      const bare = old.replace(/\s*\([^)]*\)\s*$/, '');
      const name = list ? rng.pick(list) : sector === 'farming' ? `${bare.replace(/^the /, 'the former ')}, now a private farming company` : `${bare} (privatised)`;
      job.employer.name = name; job.employer.ownership = null;
      const org = state.orgs?.byId?.[job.employer.orgId]; if (org) org.name = name;
      const shares = Math.round((job.salary ?? 20000) * 0.04);
      if (shares > 0) ctx.earn(shares, 'Free shares for staff at privatisation', {});
      ctx.log(`${old} was privatised${name !== old ? ` as ${name}` : ''}. Staff were given a few free shares; the new owners talk about efficiency, and there are rumours of cuts.`, '📈', 'warn');
      if (rng.chance(0.2)) ctx.stat('stress', 4);
    }
  },
};

/** For the business screen: can you open this kind of business here? (null: yes) */
const BUSINESS_SECTOR = {
  restaurant: 'smallTrade', foodTruck: 'smallTrade', catering: 'smallTrade', retail: 'smallTrade', generalStore: 'smallTrade', salon: 'smallTrade', tailorShop: 'smallTrade', photoStudio: 'smallTrade', printShop: 'smallTrade', boardingHouse: 'smallTrade',
  autoShop: 'smallTrade', plumbing: 'smallTrade', electrical: 'smallTrade', hvacContractor: 'smallTrade', cleaning: 'smallTrade', tutoring: 'smallTrade', privateTutoring: 'smallTrade', landscaping: 'smallTrade', roofing: 'smallTrade', smithy: 'smallTrade', dairyRound: 'smallTrade',
  pharmacyStore: 'smallTrade', opticalShop: 'smallTrade', kennel: 'smallTrade', personalTraining: 'smallTrade', gym: 'smallTrade', daycare: 'smallTrade', cpaFirm: 'smallTrade', designStudio: 'smallTrade',
  machineShop: 'industry', trucking: 'industry', warehouse3pl: 'industry', movingCompany: 'industry', courier: 'industry', fishingBoat: 'farming', charterOperator: 'airline', flightSchool: 'airline', dentalPractice: 'smallTrade', vetClinic: 'smallTrade',
};
export function privateBusinessBlock(state, typeId) {
  const cc = state.character.countryId ?? 'US';
  if (!planned(cc)) return null;
  const sector = BUSINESS_SECTOR[typeId];
  if (sector && stateShare(state, sector, cc) < 1) return null;
  return `Private enterprise is illegal here — ${cc === 'KP' ? 'the markets (jangmadang) are as far as it goes' : 'a little trading on the black market is as far as it goes'}`;
}
