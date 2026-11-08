/**
 * Working for an empire: the colonial administration (the Indian Civil Service, the Colonial
 * Administrative Service and its French, Portuguese, Dutch and Belgian equivalents), its police
 * and medical services, its locally raised troops (sepoys, askaris, tirailleurs), the chartered
 * trading companies, and the plantations.
 *
 * Open where a territory is ruled from abroad, and to people of the ruling country, posted out
 * (world/Eras.js colonialWorkOpen). The services end with independence, or when an empire has no
 * territories left: they are wound up, with compensation for loss of career (world/History.js).
 */
import { colonyHere, rulerAdj, empireColonies, RULER_NAME } from '../../world/Eras.js';
import { COUNTRIES } from '../../world/Countries.js';

/** Where you'd serve: your own colony, or (from the ruling country) one of its territories. */
export function colonialPosting(state) {
  const st = colonyHere(state);
  if (st) return { ok: true, note: `The ${rulerAdj(st.ruler)} administration of ${st.name}` };
  const cc = state.character.countryId ?? 'US';
  const terr = empireColonies(state, cc);
  if (!terr.length) return { ok: false, reason: 'Only in a colony, or for a country that still rules one' };
  const names = terr.slice(0, 3).map((id) => COUNTRIES[id]?.name ?? id).join(', ');
  return { ok: true, note: `Posted abroad by ${RULER_NAME[cc] ?? cc}: ${names}${terr.length > 3 ? ' and more' : ''}` };
}

const COLONIAL = { sector: 'state', payMultiplier: 1.05, minAge: 18, sizes: { enterprise: 1 }, dutyStation: true, background: 'strict', layoffRate: 0, union: null, noMarket: true, colonial: true, eligible: colonialPosting };

const careers = {
  colonialService: {
    ...COLONIAL, id: 'colonialService', name: 'Colonial Service', icon: '🏛️',
    employers: ['the Colonial Administrative Service', 'the Indian Civil Service', 'the Colonial Secretariat'],
    entry: { education: { level: 'highschool' } },
    ladder: [
      ['clerk', 'Government Clerk', 1, { years: 2 }],
      ['seniorClerk', 'Senior Clerk', 2, { years: 2 }],
      ['cadet', 'Cadet (Assistant District Officer)', 3, { entry: true, req: { education: { level: 'bachelor' } }, years: 2 }],
      ['districtOfficer', 'District Officer', 4, { abilities: ['supervise'], reports: 40, years: 3 }],
      ['seniorDistrictOfficer', 'Senior District Officer', 5, { abilities: ['supervise'], reports: 80, years: 3 }],
      ['districtCommissioner', 'District Commissioner', 6, { abilities: ['supervise', 'budget'], reports: 160, years: 3 }],
      ['resident', 'Resident (Provincial Commissioner)', 7, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports: 600, years: 3 }],
      ['colonialSecretary', 'Colonial Secretary', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 2000, years: 3 }],
      ['chiefSecretary', 'Chief Secretary', 9, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 3000 }],
      ['governor', 'Governor', 10, { track: 'mgmt', appointed: true, appointedBy: 'the Crown', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 12000 }],
    ],
  },
  colonialPolice: {
    ...COLONIAL, id: 'colonialPolice', name: 'Colonial Police', icon: '👮', payMultiplier: 0.95,
    employers: ['the Colonial Police', 'the Imperial Police', 'the Constabulary'],
    entry: {},
    ladder: [
      ['constable', 'Constable', 1, { years: 2 }],
      ['headConstable', 'Head Constable', 2, { years: 2 }],
      ['subInspector', 'Sub-Inspector', 3, { years: 2, abilities: ['arrest'] }],
      ['inspector', 'Inspector', 4, { abilities: ['arrest', 'supervise'], reports: 30, years: 3 }],
      ['asp', 'Assistant Superintendent', 5, { entry: true, req: { education: { level: 'bachelor' } }, abilities: ['arrest', 'supervise'], reports: 80, years: 3 }],
      ['superintendent', 'Superintendent of Police', 6, { abilities: ['supervise', 'budget'], reports: 300, years: 3 }],
      ['seniorSuperintendent', 'Senior Superintendent', 7, { abilities: ['supervise', 'budget'], reports: 800, years: 3 }],
      ['deputyIG', 'Deputy Inspector-General', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports: 3000, years: 3 }],
      ['ig', 'Inspector-General of Police', 9, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 12000 }],
    ],
  },
  colonialTroops: {
    ...COLONIAL, id: 'colonialTroops', name: 'Colonial Troops (Sepoys, Askaris, Tirailleurs)', icon: '🪖', payMultiplier: 0.75, minAge: 16, cyclical: 0,
    employers: ['a native infantry regiment', 'the colonial rifles', 'the frontier force'],
    entry: {},
    ladder: [
      ['recruit', 'Recruit', 1, { years: 1 }],
      ['private', 'Sepoy (Askari, Tirailleur)', 1, { years: 2 }],
      ['lanceNaik', 'Lance Naik', 2, { years: 2 }],
      ['naik', 'Naik (Corporal)', 2, { years: 2, abilities: ['supervise'], reports: 8 }],
      ['havildar', 'Havildar (Sergeant)', 3, { years: 3, abilities: ['supervise'], reports: 30 }],
      ['havildarMajor', 'Havildar-Major', 4, { years: 3, abilities: ['supervise'], reports: 120 }],
      ['jemadar', 'Jemadar (Native Officer)', 5, { years: 3, abilities: ['supervise'], reports: 40 }],
      ['subedar', 'Subedar', 6, { years: 3, abilities: ['supervise'], reports: 120 }],
      ['subedarMajor', 'Subedar-Major', 7, { abilities: ['supervise', 'delegate'], reports: 800 }],
    ],
  },
  colonialMedical: {
    ...COLONIAL, id: 'colonialMedical', name: 'Colonial Medical Service', icon: '⚕️', payMultiplier: 1.0,
    employers: ['the Colonial Medical Service', 'the Indian Medical Service', 'the Government Hospital'],
    entry: {},
    ladder: [
      ['dresser', 'Dresser', 1, { years: 2 }],
      ['hospitalAssistant', 'Hospital Assistant', 2, { years: 2 }],
      ['subAssistantSurgeon', 'Sub-Assistant Surgeon', 3, { years: 3 }],
      ['medicalOfficer', 'Medical Officer', 5, { entry: true, req: { education: { program: 'md' } }, years: 3 }],
      ['seniorMO', 'Senior Medical Officer', 6, { abilities: ['supervise'], reports: 40, years: 3 }],
      ['pmo', 'Principal Medical Officer', 7, { abilities: ['supervise', 'budget'], reports: 200, years: 3 }],
      ['dms', 'Director of Medical Services', 9, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 2000 }],
    ],
  },
  tradingCompany: {
    ...COLONIAL, id: 'tradingCompany', name: 'Chartered Trading Company', icon: '⛵', sector: 'private', payMultiplier: 1.1, untilYear: 1960, cyclical: 1.2,
    employers: ['the East India Company', 'the Royal Niger Company', 'the Hudson\'s Bay Company', 'the Dutch East India trading house', 'the British South Africa Company'],
    entry: {},
    ladder: [
      ['apprentice', 'Apprentice Clerk', 1, { years: 2 }],
      ['writer', 'Writer', 2, { years: 2 }],
      ['factor', 'Factor', 3, { years: 3 }],
      ['juniorMerchant', 'Junior Merchant', 4, { years: 3 }],
      ['seniorMerchant', 'Senior Merchant', 5, { abilities: ['supervise'], reports: 30, years: 3 }],
      ['agent', 'Agent (Head of a Station)', 6, { abilities: ['supervise', 'budget'], reports: 120, years: 3 }],
      ['chiefAgent', 'Chief Agent', 7, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports: 600, years: 3 }],
      ['director', 'Director of the Company', 9, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 5000 }],
    ],
  },
  plantation: {
    ...COLONIAL, id: 'plantation', name: 'Plantations (Tea, Rubber, Sugar)', icon: '🌿', sector: 'private', payMultiplier: 0.8, untilYear: 1975, cyclical: 1.3, minAge: 14,
    employers: ['a tea estate', 'a rubber estate', 'a sugar estate', 'a coffee estate'],
    entry: {},
    ladder: [
      ['labourer', 'Estate Labourer', 1, { years: 1 }],
      ['kangany', 'Gang Foreman (Kangany)', 2, { years: 2, abilities: ['supervise'], reports: 25 }],
      ['conductor', 'Field Conductor', 3, { years: 2, abilities: ['supervise'], reports: 80 }],
      ['creeper', 'Assistant Manager ("Creeper")', 4, { entry: true, years: 3 }],
      ['manager', 'Estate Manager', 5, { abilities: ['supervise', 'budget'], reports: 400, years: 3 }],
      ['superintendent', 'Superintendent (Several Estates)', 6, { abilities: ['supervise', 'budget'], reports: 1500, years: 3 }],
      ['visitingAgent', 'Visiting Agent', 7, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports: 4000, years: 3 }],
      ['director', 'Plantation Company Director', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 10000 }],
    ],
  },
};

export default { id: 'careers-colonial', version: 2, careers };
