import { fromPacks, packRows, PACKS } from '../world/packs/index.js';
/**
 * Elected offices abroad, on the same shape as Offices.js (salaries and
 * campaign costs in PPP dollars, 2025 pay scales). Local office (council,
 * mayor) uses the shared US entries; these cover provincial/regional
 * assemblies and executives, national parliaments and heads of government.
 *
 *   country    where the office exists
 *   provinces  only in these provinces (the UK's devolved parliaments)
 *   requires   an office you must hold to stand (party leaders come from the house)
 *   leader     chosen by the governing party in parliament, not by voters directly
 */

const legislative = { fullTime: true, pension: 'electedOfficials', kind: 'legislative' };
const executive = { fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true };

export const NATIONAL_OFFICES = {
  // Canada
  ca_mpp: { country: 'CA', name: 'Member of the Provincial Legislature (MPP/MLA)', icon: '🍁', level: 3, term: 4, termLimit: 0, salary: 97000, minAge: 18, residency: 0, cost: 150000, ...legislative },
  ca_premier: { country: 'CA', name: 'Premier', icon: '⭐', level: 4, term: 4, termLimit: 0, salary: 174000, minAge: 18, residency: 0, cost: 400000, requires: ['ca_mpp'], leader: true, ...executive },
  ca_mp: { country: 'CA', name: 'Member of Parliament (House of Commons)', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 175000, minAge: 18, residency: 0, cost: 250000, ...legislative },
  ca_pm: { country: 'CA', name: 'Prime Minister of Canada', icon: '🇨🇦', level: 5, term: 4, termLimit: 0, salary: 350000, minAge: 18, residency: 0, cost: 2000000, requires: ['ca_mp'], leader: true, statewide: true, ...executive },
  // United Kingdom
  gb_msp: { country: 'GB', provinces: ['GB-SCT'], name: 'Member of the Scottish Parliament', icon: '🏴', level: 3, term: 5, termLimit: 0, salary: 106000, minAge: 18, residency: 0, cost: 60000, ...legislative },
  gb_ms: { country: 'GB', provinces: ['GB-WLS'], name: 'Member of the Senedd', icon: '🐉', level: 3, term: 5, termLimit: 0, salary: 106000, minAge: 18, residency: 0, cost: 60000, ...legislative },
  gb_mla: { country: 'GB', provinces: ['GB-NIR'], name: 'Member of the Legislative Assembly (Stormont)', icon: '🏛️', level: 3, term: 5, termLimit: 0, salary: 80000, minAge: 18, residency: 0, cost: 50000, ...legislative },
  gb_firstMinister: { country: 'GB', provinces: ['GB-SCT', 'GB-WLS', 'GB-NIR'], name: 'First Minister', icon: '⭐', level: 4, term: 5, termLimit: 0, salary: 241000, minAge: 18, residency: 0, cost: 200000, requires: ['gb_msp', 'gb_ms', 'gb_mla'], leader: true, ...executive },
  gb_mp: { country: 'GB', name: 'Member of Parliament (House of Commons)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 138000, minAge: 18, residency: 0, cost: 90000, ...legislative },
  gb_pm: { country: 'GB', name: 'Prime Minister of the United Kingdom', icon: '🇬🇧', level: 5, term: 5, termLimit: 0, salary: 253000, minAge: 18, residency: 0, cost: 1500000, requires: ['gb_mp'], leader: true, statewide: true, ...executive },
  // Germany
  de_mdl: { country: 'DE', name: 'Member of the Landtag', icon: '🦅', level: 3, term: 5, termLimit: 0, salary: 147000, minAge: 18, residency: 0, cost: 80000, ...legislative },
  de_ministerpraesident: { country: 'DE', name: 'Ministerpräsident', icon: '⭐', level: 4, term: 5, termLimit: 0, salary: 278000, minAge: 18, residency: 0, cost: 400000, requires: ['de_mdl'], leader: true, ...executive },
  de_mdb: { country: 'DE', name: 'Member of the Bundestag', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 197000, minAge: 18, residency: 0, cost: 150000, ...legislative },
  de_kanzler: { country: 'DE', name: 'Bundeskanzler', icon: '🇩🇪', level: 5, term: 4, termLimit: 0, salary: 500000, minAge: 18, residency: 0, cost: 3000000, requires: ['de_mdb'], leader: true, statewide: true, ...executive },
  // Japan
  jp_prefAssembly: { country: 'JP', name: 'Prefectural Assembly Member', icon: '🗾', level: 3, term: 4, termLimit: 0, salary: 135000, minAge: 25, residency: 0, cost: 150000, ...legislative },
  jp_governor: { country: 'JP', name: 'Prefectural Governor', icon: '⭐', level: 4, term: 4, termLimit: 0, salary: 208000, minAge: 30, residency: 0, cost: 1500000, ...executive },
  jp_hor: { country: 'JP', name: 'Member of the House of Representatives', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 229000, minAge: 25, residency: 0, cost: 400000, ...legislative },
  jp_hoc: { country: 'JP', name: 'Member of the House of Councillors', icon: '🏛️', level: 4, term: 6, termLimit: 0, salary: 229000, minAge: 30, residency: 0, cost: 500000, ...legislative },
  jp_pm: { country: 'JP', name: 'Prime Minister of Japan', icon: '🇯🇵', level: 5, term: 3, termLimit: 0, salary: 417000, minAge: 25, residency: 0, cost: 2000000, requires: ['jp_hor'], leader: true, statewide: true, ...executive },
  // South Korea
  kr_provCouncil: { country: 'KR', name: 'Provincial Council Member', icon: '🇰🇷', level: 3, term: 4, termLimit: 0, salary: 72000, minAge: 18, residency: 0, cost: 120000, ...legislative },
  kr_governor: { country: 'KR', name: 'Governor / Metropolitan Mayor', icon: '⭐', level: 4, term: 4, termLimit: 3, salary: 169000, minAge: 18, residency: 0, cost: 1500000, ...executive },
  kr_assembly: { country: 'KR', name: 'Member of the National Assembly', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 189000, minAge: 18, residency: 0, cost: 400000, ...legislative },
  kr_president: { country: 'KR', name: 'President of the Republic of Korea', icon: '🇰🇷', level: 5, term: 5, termLimit: 1, salary: 316000, minAge: 40, residency: 5, cost: 40000000, statewide: true, ...executive },
  // Italy
  it_regional: { country: 'IT', name: 'Regional Councillor', icon: '🇮🇹', level: 3, term: 5, termLimit: 0, salary: 156000, minAge: 18, residency: 0, cost: 120000, ...legislative },
  it_regionPresident: { country: 'IT', name: 'President of the Region', icon: '⭐', level: 4, term: 5, termLimit: 2, salary: 219000, minAge: 18, residency: 0, cost: 1200000, ...executive },
  it_deputato: { country: 'IT', name: 'Deputy (Camera dei Deputati)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 234000, minAge: 25, residency: 0, cost: 250000, ...legislative },
  it_senatore: { country: 'IT', name: 'Senator (Senato della Repubblica)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 234000, minAge: 40, residency: 0, cost: 300000, ...legislative },
  it_pm: { country: 'IT', name: 'President of the Council of Ministers', icon: '🇮🇹', level: 5, term: 5, termLimit: 0, salary: 360000, minAge: 25, residency: 0, cost: 2000000, requires: ['it_deputato', 'it_senatore'], leader: true, statewide: true, ...executive },
  // Mexico
  mx_dipLocal: { country: 'MX', name: 'State Deputy (Diputado local)', icon: '🇲🇽', level: 3, term: 3, termLimit: 4, salary: 95000, minAge: 21, residency: 0, cost: 200000, ...legislative },
  mx_gobernador: { country: 'MX', name: 'Governor (Gobernador)', icon: '⭐', level: 4, term: 6, termLimit: 1, salary: 143000, minAge: 30, residency: 5, cost: 3000000, ...executive },
  mx_dipFederal: { country: 'MX', name: 'Federal Deputy (Cámara de Diputados)', icon: '🏛️', level: 4, term: 3, termLimit: 4, salary: 143000, minAge: 21, residency: 0, cost: 400000, ...legislative },
  mx_senador: { country: 'MX', name: 'Senator (Senado de la República)', icon: '🏛️', level: 4, term: 6, termLimit: 2, salary: 171000, minAge: 25, residency: 0, cost: 1500000, ...legislative },
  mx_presidente: { country: 'MX', name: 'President of Mexico', icon: '🇲🇽', level: 5, term: 6, termLimit: 1, salary: 190000, minAge: 35, residency: 20, cost: 50000000, statewide: true, ...executive },
  // Philippines
  ph_boardMember: { country: 'PH', name: 'Provincial Board Member', icon: '🇵🇭', level: 3, term: 3, termLimit: 3, salary: 41000, minAge: 23, residency: 1, cost: 60000, ...legislative },
  ph_governor: { country: 'PH', name: 'Provincial Governor', icon: '⭐', level: 4, term: 3, termLimit: 3, salary: 77000, minAge: 23, residency: 1, cost: 600000, ...executive },
  ph_representative: { country: 'PH', name: 'District Representative (House)', icon: '🏛️', level: 4, term: 3, termLimit: 3, salary: 164000, minAge: 25, residency: 1, cost: 500000, ...legislative },
  ph_senator: { country: 'PH', name: 'Senator of the Philippines', icon: '🏛️', level: 4, term: 6, termLimit: 2, salary: 164000, minAge: 35, residency: 2, cost: 8000000, statewide: true, ...legislative },
  ph_president: { country: 'PH', name: 'President of the Philippines', icon: '🇵🇭', level: 5, term: 6, termLimit: 1, salary: 236000, minAge: 40, residency: 10, cost: 30000000, statewide: true, ...executive },
  // Australia
  au_mlaState: { country: 'AU', name: 'Member of the State Parliament (MLA/MP)', icon: '🦘', level: 3, term: 4, termLimit: 0, salary: 131000, minAge: 18, residency: 0, cost: 100000, ...legislative },
  au_premier: { country: 'AU', name: 'Premier', icon: '⭐', level: 4, term: 4, termLimit: 0, salary: 310000, minAge: 18, residency: 0, cost: 300000, requires: ['au_mlaState'], leader: true, ...executive },
  au_mp: { country: 'AU', name: 'Member of the House of Representatives', icon: '🏛️', level: 4, term: 3, termLimit: 0, salary: 160000, minAge: 18, residency: 0, cost: 170000, ...legislative },
  au_senator: { country: 'AU', name: 'Senator for your state', icon: '🏛️', level: 4, term: 6, termLimit: 0, salary: 160000, minAge: 18, residency: 0, cost: 400000, statewide: true, ...legislative },
  au_pm: { country: 'AU', name: 'Prime Minister of Australia', icon: '🇦🇺', level: 5, term: 3, termLimit: 0, salary: 418000, minAge: 18, residency: 0, cost: 2000000, requires: ['au_mp'], leader: true, statewide: true, ...executive },
  // France
  fr_regional: { country: 'FR', name: 'Conseiller régional', icon: '🇫🇷', level: 3, term: 6, termLimit: 0, salary: 42000, minAge: 18, residency: 0, cost: 40000, ...legislative },
  fr_regionPresident: { country: 'FR', name: 'Président du conseil régional', icon: '⭐', level: 4, term: 6, termLimit: 0, salary: 140000, minAge: 18, residency: 0, cost: 150000, requires: ['fr_regional'], leader: true, ...executive },
  fr_depute: { country: 'FR', name: 'Député (Assemblée nationale)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 128000, minAge: 18, residency: 0, cost: 80000, ...legislative },
  // Senators are chosen by local elected officials (grands électeurs): hold a local or regional seat first.
  fr_senateur: { country: 'FR', name: 'Sénateur', icon: '🏛️', level: 4, term: 6, termLimit: 0, salary: 128000, minAge: 24, residency: 0, cost: 50000, requires: ['cityCouncil', 'mayor', 'fr_regional', 'fr_depute'], ...legislative },
  fr_president: { country: 'FR', name: 'Président de la République', icon: '🇫🇷', level: 5, term: 5, termLimit: 2, salary: 256000, minAge: 18, residency: 0, cost: 21000000, statewide: true, ...executive },
  // India
  in_mla: { country: 'IN', name: 'Member of the Legislative Assembly (MLA)', icon: '🇮🇳', level: 3, term: 5, termLimit: 0, salary: 109000, minAge: 25, residency: 0, cost: 300000, ...legislative },
  in_cm: { country: 'IN', name: 'Chief Minister', icon: '⭐', level: 4, term: 5, termLimit: 0, salary: 164000, minAge: 25, residency: 0, cost: 2000000, requires: ['in_mla'], leader: true, ...executive },
  in_mp: { country: 'IN', name: 'Member of Parliament (Lok Sabha)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 136000, minAge: 25, residency: 0, cost: 800000, ...legislative },
  in_pm: { country: 'IN', name: 'Prime Minister of India', icon: '🇮🇳', level: 5, term: 5, termLimit: 0, salary: 150000, minAge: 25, residency: 0, cost: 20000000, requires: ['in_mp'], leader: true, statewide: true, ...executive },
};
// Countries from packs bring their own offices.
Object.assign(NATIONAL_OFFICES, packRows('offices'));

/**
 * Ceremonial heads of state, where the head of state isn't the head of government (and isn't a
 * monarch). They sign laws, receive ambassadors, grant pardons and honours, and ask a party to
 * form a government — and are chosen in their own way:
 *   selection 'parliament'  elected by parliament or a special assembly (Germany's Federal
 *                           Convention, Italy's joint session, the Knesset, India's electoral college)
 *   selection 'popular'     a national election (Ireland, Singapore)
 *   selection 'appointed'   named by the monarch on the prime minister's advice (a Governor-General)
 *   stature                 the political (or public) standing it takes to be considered: a past
 *                           office at this level or higher, or high name recognition
 */
const ceremonial = { fullTime: true, pension: 'electedOfficials', kind: 'head', ceremonial: true, headOfState: true, level: 6, residency: 0, termLimit: 0 };
Object.assign(NATIONAL_OFFICES, {
  de_praesident: { ...ceremonial, country: 'DE', name: 'Bundespräsident', icon: '🇩🇪', term: 5, termLimit: 2, salary: 290000, minAge: 40, cost: 0, selection: 'parliament', chosenBy: 'the Federal Convention', stature: 4 },
  it_presidente: { ...ceremonial, country: 'IT', name: 'Presidente della Repubblica', icon: '🇮🇹', term: 7, salary: 280000, minAge: 50, cost: 0, selection: 'parliament', chosenBy: 'Parliament in joint session', stature: 4 },
  in_president: { ...ceremonial, country: 'IN', name: 'President of India', icon: '🇮🇳', term: 5, salary: 120000, minAge: 35, cost: 0, selection: 'parliament', chosenBy: 'the electoral college of MPs and MLAs', stature: 4 },
  il_president: { ...ceremonial, country: 'IL', name: 'President of Israel', icon: '🇮🇱', term: 7, termLimit: 1, salary: 190000, minAge: 35, cost: 0, selection: 'parliament', chosenBy: 'the Knesset', stature: 4 },
  ie_president: { ...ceremonial, country: 'IE', name: 'Uachtarán na hÉireann (President of Ireland)', icon: '🇮🇪', term: 7, termLimit: 2, salary: 260000, minAge: 35, cost: 1200000, selection: 'popular', stature: 4 },
  sg_president: { ...ceremonial, country: 'SG', name: 'President of Singapore', icon: '🇸🇬', term: 6, salary: 1100000, minAge: 45, cost: 800000, selection: 'popular', stature: 5 },
  ca_gg: { ...ceremonial, country: 'CA', name: 'Governor General of Canada', icon: '🍁', term: 5, salary: 260000, minAge: 45, cost: 0, selection: 'appointed', chosenBy: 'the King on the Prime Minister\'s advice', stature: 4 },
  au_gg: { ...ceremonial, country: 'AU', name: 'Governor-General of Australia', icon: '🇦🇺', term: 5, salary: 340000, minAge: 45, cost: 0, selection: 'appointed', chosenBy: 'the King on the Prime Minister\'s advice', stature: 4 },
  // Held by the General Secretary of the Communist Party (CommunistParty.js), elected by the NPC.
  cn_president: { ...ceremonial, country: 'CN', name: 'President of the People\'s Republic of China', icon: '🇨🇳', term: 5, salary: 30000, minAge: 45, cost: 0, selection: 'appointed', chosenBy: 'the National People\'s Congress on the Party\'s nomination (the General Secretary)', stature: 6 },
  kp_president: { ...ceremonial, country: 'KP', name: 'President of the State Affairs Commission', icon: '🇰🇵', term: 5, salary: 10000, minAge: 30, cost: 0, selection: 'appointed', chosenBy: 'the Supreme People\'s Assembly on the Workers\' Party\'s nomination (the General Secretary)', stature: 6 },
  vn_president: { ...ceremonial, country: 'VN', name: 'President of Vietnam', icon: '🇻🇳', term: 5, salary: 20000, minAge: 45, cost: 0, selection: 'appointed', chosenBy: 'the National Assembly on the Party\'s nomination', stature: 5 },
  // One-party states: government posts the Party fills from its cadres (CommunistParty.js, the government track).
  cn_governor: { ...executive, provincial: true, country: 'CN', name: 'Provincial Governor', icon: '🏯', level: 4, kind: 'executive', term: 5, termLimit: 0, salary: 28000, fullTime: true, minAge: 35, residency: 0, cost: 0, selection: 'appointed', chosenBy: 'the Party (the provincial people\'s congress confirms)', viaParty: true },
  vn_governor: { ...executive, provincial: true, country: 'VN', name: 'Chairman of the Provincial People\'s Committee', icon: '🏯', level: 4, kind: 'executive', term: 5, termLimit: 0, salary: 16000, fullTime: true, minAge: 35, residency: 0, cost: 0, selection: 'appointed', chosenBy: 'the Party (the provincial people\'s council confirms)', viaParty: true },
  kp_governor: { ...executive, provincial: true, country: 'KP', name: 'Chairman of the Provincial People\'s Committee', icon: '🏯', level: 4, kind: 'executive', term: 5, termLimit: 0, salary: 6000, fullTime: true, minAge: 35, residency: 0, cost: 0, selection: 'appointed', chosenBy: 'the Workers\' Party', viaParty: true },
  vn_pm: { ...executive, national: true, country: 'VN', name: 'Prime Minister of Vietnam', icon: '🇻🇳', level: 5, kind: 'executive', term: 5, termLimit: 2, salary: 22000, fullTime: true, minAge: 45, residency: 0, cost: 0, selection: 'appointed', chosenBy: 'the National Assembly on the Party\'s nomination', viaParty: true },
  kp_premier: { ...executive, national: true, country: 'KP', name: 'Premier of the Cabinet', icon: '🇰🇵', level: 5, kind: 'executive', term: 5, termLimit: 0, salary: 8000, fullTime: true, minAge: 45, residency: 0, cost: 0, selection: 'appointed', chosenBy: 'the Supreme People\'s Assembly on the Workers\' Party\'s nomination', viaParty: true },
  // The Crown below the Governor-General: in each province, state and county.
  ca_lg: { ...ceremonial, country: 'CA', name: 'Lieutenant Governor', icon: '🍁', level: 5, term: 5, salary: 160000, minAge: 45, cost: 0, selection: 'appointed', chosenBy: 'the Governor General on the Prime Minister\'s advice', stature: 3 },
  au_governor: { ...ceremonial, country: 'AU', name: 'State Governor', icon: '🇦🇺', level: 5, term: 5, salary: 280000, minAge: 45, cost: 0, selection: 'appointed', chosenBy: 'the Crown on the Premier\'s advice', stature: 3 },
  gb_lordLieutenant: { ...ceremonial, country: 'GB', name: 'Lord-Lieutenant of the County', icon: '🏰', level: 4, term: 10, salary: 0, fullTime: false, minAge: 50, cost: 0, serveTo: 75, selection: 'appointed', chosenBy: 'the Crown on the Prime Minister\'s advice', stature: 3 },
  gb_deputyLieutenant: { ...ceremonial, country: 'GB', name: 'Deputy Lieutenant', icon: '🏰', level: 3, term: 10, salary: 0, fullTime: false, minAge: 40, cost: 0, serveTo: 75, selection: 'appointed', chosenBy: 'the Lord-Lieutenant', stature: 2 },
  nz_gg: { ...ceremonial, country: 'NZ', name: 'Governor-General of New Zealand', icon: '🇳🇿', term: 5, salary: 340000, minAge: 45, cost: 0, selection: 'appointed', chosenBy: 'the King on the Prime Minister\'s advice', stature: 4 },
});
/**
 * Members of the European Parliament: elected in each member state on national lists every
 * five years, all paid the same salary from the EU budget. They sit in Brussels and Strasbourg.
 */
const EU_STATES = [...new Set(['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'IE', ...PACKS.filter((p) => p.groups?.includes('EU')).map((p) => p.id)])];
for (const cc of EU_STATES) {
  NATIONAL_OFFICES[`${cc.toLowerCase()}_mep`] = { country: cc, name: 'Member of the European Parliament (MEP)', icon: '🇪🇺', level: 4, term: 5, termLimit: 0, salary: 140000, minAge: 18, residency: 0, cost: 120000, statewide: true, european: true, ...legislative };
}

/** Countries whose head of state is a monarch (no office to hold; their representatives are above). */
export const MONARCHIES = ['GB', 'CA', 'AU', 'NZ', 'JP', 'SE', 'NL', 'ES', ...PACKS.filter((p) => p.monarchy).map((p) => p.id)];

/** Local office (shared with the US list) that every country has. */
export const LOCAL_OFFICE_IDS = ['schoolBoard', 'cityCouncil', 'mayor', 'cityManager'];

/** The ladder shown on the Politics tab where you live. */
export function officeOrderFor(countryId, provinceId, usOrder) {
  if (countryId === 'US') return usOrder;
  const national = Object.entries(NATIONAL_OFFICES)
    .filter(([, o]) => o.country === countryId && (!o.provinces || o.provinces.includes(provinceId)))
    .sort((a, b) => a[1].level - b[1].level)
    .map(([id]) => id);
  return [...LOCAL_OFFICE_IDS, ...national];
}

/**
 * Each country's legislatures, for Legislature.js. Provincial assemblies are unicameral
 * (and England has none); the national parliament has one or two chambers.
 *   office   the elected office that sits in the chamber (null: appointed or indirect)
 *   exec     who heads the government above it
 *   veto     whether that executive can veto bills (presidents and some governors);
 *            parliamentary governments come from the majority and don't
 *   execOffice the office whose holder is that executive
 *   upper.office null: an appointed or indirectly chosen chamber (no elections of its own)
 *   upper.peers   life peers (Honours.js) sit in it
 *   upper.revising it can only delay a bill, not kill it (the UK's Parliament Acts)
 *   leaders  local titles for the majority and minority leaders
 */
export const LEGISLATURES = {
  CA: {
    prov: { name: (p) => `Legislative Assembly of ${p}`, seats: 90, presiding: 'Speaker', office: 'ca_mpp', exec: 'Premier', execOffice: 'ca_premier', veto: false },
    lower: { name: 'House of Commons', seats: 343, presiding: 'Speaker of the House of Commons', office: 'ca_mp' },
    upper: { name: 'Senate of Canada', seats: 105, presiding: 'Speaker of the Senate', office: null },
    exec: 'Prime Minister', execOffice: 'ca_pm', veto: false,
  },
  GB: {
    prov: { name: (p) => ({ Scotland: 'Scottish Parliament', Wales: 'Senedd Cymru', 'Northern Ireland': 'Northern Ireland Assembly' }[p] ?? `${p} Assembly`), seats: 90, presiding: 'Presiding Officer', office: (prov) => ({ 'GB-SCT': 'gb_msp', 'GB-WLS': 'gb_ms', 'GB-NIR': 'gb_mla' }[prov]), exec: 'First Minister', execOffice: 'gb_firstMinister', veto: false, none: ['GB-ENG'] },
    lower: { name: 'House of Commons', seats: 650, presiding: 'Speaker of the House of Commons', office: 'gb_mp', leaders: { majority: 'Leader of the House', minority: 'Leader of the Opposition' } },
    upper: { name: 'House of Lords', seats: 800, presiding: 'Lord Speaker', office: null, peers: true, revising: 'the Parliament Acts', leaders: { majority: 'Leader of the House of Lords', minority: 'Opposition Leader in the Lords' } },
    exec: 'Prime Minister', execOffice: 'gb_pm', veto: false,
  },
  DE: {
    prov: { name: (p) => `Landtag of ${p}`, seats: 130, presiding: 'Landtag President', office: 'de_mdl', exec: 'Ministerpräsident', execOffice: 'de_ministerpraesident', veto: false },
    lower: { name: 'Bundestag', seats: 630, presiding: 'President of the Bundestag', office: 'de_mdb' },
    upper: { name: 'Bundesrat', seats: 69, presiding: 'President of the Bundesrat', office: null },
    exec: 'Chancellor', execOffice: 'de_kanzler', veto: false,
  },
  JP: {
    prov: { name: (p) => `${p} Prefectural Assembly`, seats: 80, presiding: 'Assembly Chair', office: 'jp_prefAssembly', exec: 'Governor', execOffice: 'jp_governor', veto: true },
    lower: { name: 'House of Representatives', seats: 465, presiding: 'Speaker of the House', office: 'jp_hor' },
    upper: { name: 'House of Councillors', seats: 248, presiding: 'President of the House of Councillors', office: 'jp_hoc' },
    exec: 'Prime Minister', execOffice: 'jp_pm', veto: false,
  },
  KR: {
    prov: { name: (p) => `${p} Council`, seats: 60, presiding: 'Council Chair', office: 'kr_provCouncil', exec: 'Governor', execOffice: 'kr_governor', veto: true },
    lower: { name: 'National Assembly', seats: 300, presiding: 'Speaker of the National Assembly', office: 'kr_assembly' },
    exec: 'President', execOffice: 'kr_president', veto: true,
  },
  IT: {
    prov: { name: (p) => `Regional Council of ${p}`, seats: 50, presiding: 'Council President', office: 'it_regional', exec: 'President of the Region', execOffice: 'it_regionPresident', veto: false },
    lower: { name: 'Chamber of Deputies', seats: 400, presiding: 'President of the Chamber', office: 'it_deputato' },
    upper: { name: 'Senate of the Republic', seats: 205, presiding: 'President of the Senate', office: 'it_senatore' },
    exec: 'Prime Minister', execOffice: 'it_pm', veto: false,
  },
  MX: {
    prov: { name: (p) => `Congress of ${p}`, seats: 40, presiding: 'President of the Congress', office: 'mx_dipLocal', exec: 'Governor', execOffice: 'mx_gobernador', veto: true },
    lower: { name: 'Chamber of Deputies', seats: 500, presiding: 'President of the Chamber', office: 'mx_dipFederal' },
    upper: { name: 'Senate of the Republic', seats: 128, presiding: 'President of the Senate', office: 'mx_senador' },
    exec: 'President', execOffice: 'mx_presidente', veto: true,
  },
  PH: {
    prov: { name: (p) => `Sangguniang Panlalawigan of ${p}`, seats: 14, presiding: 'Vice Governor', office: 'ph_boardMember', exec: 'Governor', execOffice: 'ph_governor', veto: true },
    lower: { name: 'House of Representatives', seats: 316, presiding: 'Speaker of the House', office: 'ph_representative' },
    upper: { name: 'Senate of the Philippines', seats: 24, presiding: 'Senate President', office: 'ph_senator' },
    exec: 'President', execOffice: 'ph_president', veto: true,
  },
  IN: {
    prov: { name: (p) => `${p} Legislative Assembly`, seats: 200, presiding: 'Speaker', office: 'in_mla', exec: 'Chief Minister', execOffice: 'in_cm', veto: false },
    lower: { name: 'Lok Sabha', seats: 543, presiding: 'Speaker of the Lok Sabha', office: 'in_mp' },
    upper: { name: 'Rajya Sabha', seats: 245, presiding: 'Chairman of the Rajya Sabha', office: null },
    exec: 'Prime Minister', execOffice: 'in_pm', veto: false,
  },
  AU: {
    prov: { name: (p) => `Parliament of ${p}`, seats: 90, presiding: 'Speaker', office: 'au_mlaState', exec: 'Premier', execOffice: 'au_premier', veto: false },
    lower: { name: 'House of Representatives', seats: 150, presiding: 'Speaker of the House', office: 'au_mp' },
    upper: { name: 'Senate', seats: 76, presiding: 'President of the Senate', office: 'au_senator' },
    exec: 'Prime Minister', execOffice: 'au_pm', veto: false,
  },
  FR: {
    prov: { name: (p) => `Regional Council of ${p}`, seats: 150, presiding: 'President of the Regional Council', office: 'fr_regional', exec: 'President of the Region', execOffice: 'fr_regionPresident', veto: false },
    lower: { name: 'National Assembly', seats: 577, presiding: 'President of the National Assembly', office: 'fr_depute' },
    upper: { name: 'Senate', seats: 348, presiding: 'President of the Senate', office: 'fr_senateur' },
    exec: 'President of the Republic', execOffice: 'fr_president', veto: false,
  },
};
fromPacks(LEGISLATURES, 'LEGISLATURES');
