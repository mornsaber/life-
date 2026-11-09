/**
 * Private-sector professions, merged with the municipal and federal
 * professions defined by the public-service module into one catalog.
 *
 * Profession fields:
 *   id/field          id doubles as the career field majors map to
 *   sector            'private' | 'municipal' | 'state' | 'federal'
 *   payMultiplier     market premium over the G-scale
 *   sizes             employer-size weights when generating an employer
 *   union             { chance, name, strike } — chance the employer is unionized
 *   benefits          overrides on the sector's default benefits package
 *   background        'strict' | 'standard' | 'lenient' criminal-record screening
 *   exam              civil-service exam required to apply (public sector)
 *   valued            credentials that improve hiring odds
 *   remote            job survives relocation
 *   flightHoursPerYear logs pilot time while employed
 *   levels            the ladder (see Ladder.js)
 */
import { clergyCareerFor, CLERGY_CAREERS } from '../community/HolyOrders.js';
import { PRIVATE_TITLES } from '../world/PrivateTitles.js';
import { PROFESSION_TITLES } from '../world/ProfessionStandards.js';
import { L, addGovernmentTiers } from './Ladder.js';
import { REQUIRED_BY, CREDENTIALS } from '../credentials/CredentialRegistry.js';
import { TRADITIONS, clergyEligibility } from '../community/Religions.js';
import { PACK_PROFESSIONS, MUNICIPAL_PROFESSIONS, STATE_PROFESSIONS, FEDERAL_PROFESSIONS } from '../content/careerPacks.js';
import { AGENCIES, NEUTRAL_TITLES, nationalProfessionId } from '../world/NationalAgencies.js';
import { LOCAL_AGENCIES, agencyExists } from '../world/LocalAgencies.js';
import { currentCountry } from '../../core/Locale.js';
import { stateIdOf, REGIONS } from '../life/Regions.js';
import { dioceseName, anglicanDioceseName } from '../community/Dioceses.js';

/** Private-sector professions: the careers-private pack and the other career packs (content/careerPacks.js), plus the careers still written as code. */
export const PRIVATE_PROFESSIONS = {};

// Career packs (content/careerPacks.js) first; the careers still written as code follow.
const PUBLIC_PACKS = new Set([...Object.keys(MUNICIPAL_PROFESSIONS), ...Object.keys(STATE_PROFESSIONS), ...Object.keys(FEDERAL_PROFESSIONS)]);
Object.assign(PRIVATE_PROFESSIONS, Object.fromEntries(Object.entries(PACK_PROFESSIONS).filter(([id]) => !PUBLIC_PACKS.has(id))));

export const PROFESSIONS = { ...PRIVATE_PROFESSIONS, ...MUNICIPAL_PROFESSIONS, ...STATE_PROFESSIONS, ...FEDERAL_PROFESSIONS };
export const PROFESSION_LIST = Object.values(PROFESSIONS);
// Government careers get tiny-agency and major-agency rank structures (Ladder).
for (const p of PROFESSION_LIST) addGovernmentTiers(p);

// Index which careers require which credentials (employers fund what their own ladders demand).
for (const p of PROFESSION_LIST) {
  for (const l of p.levels) for (const c of l.req?.credentials ?? []) (REQUIRED_BY[c] ??= new Set()).add(p.id);
}
// A course your own ladder requires is always open to you: add the career to any membership gate.
const openTo = (req, id) => {
  if (!req) return;
  if (req.anyOf) return req.anyOf.forEach((r) => openTo(r, id));
  if (req.affiliation && !req.affiliation.includes(id)) req.affiliation.push(id);
};
for (const [credId, careers] of Object.entries(REQUIRED_BY)) for (const id of careers) openTo(CREDENTIALS[credId]?.requires, id);

/** Career fields for the job board (every profession appears in exactly one). */
export const JOB_FIELDS = {
  service: { label: 'Shops, Food & Hospitality', icon: '🛍️', ids: ['retail', 'culinary', 'hospitality', 'cruise', 'travellingSales', 'milkRound', 'domesticService'] },
  personal: { label: 'Personal Care & Childcare', icon: '💇', ids: ['cosmetology', 'fitness', 'caregiving', 'childcare', 'funeral'] },
  arts: { label: 'Arts, Media & Sport', icon: '🎭', ids: ['acting', 'music', 'athletics', 'design', 'contentCreator', 'journalism', 'interpreter'] },
  trades: { label: 'Skilled Trades', icon: '🔧', ids: ['trades', 'plumbing', 'hvac', 'welding', 'carpentry', 'ironworking', 'craneOperator', 'automotive', 'lineworker', 'blacksmith'] },
  industry: { label: 'Factories, Mines & Energy', icon: '🏭', ids: ['manufacturing', 'millWork', 'coalMining', 'oilGas', 'renewableEnergy', 'waterUtility', 'publicWorks', 'lamplighter'] },
  land: { label: 'Farming, Fishing & Forestry', icon: '🌾', ids: ['agriculture', 'plantation', 'fishing', 'whaling', 'forester'] },
  transport: { label: 'Driving, Delivery & Transit', icon: '🚚', ids: ['trucking', 'logistics', 'docks', 'coachman', 'transit', 'transitMaintenance', 'schoolBus', 'paratransit'] },
  travel: { label: 'Air, Sea, Rail & Space', icon: '✈️', ids: ['aviation', 'charterAviation', 'flightAttendant', 'airTrafficControl', 'merchantMarine', 'railroad', 'steamRailway', 'spaceIndustry'] },
  business: { label: 'Business, Finance & Property', icon: '📈', ids: ['corporate', 'marketing', 'sales', 'humanResources', 'finance', 'accounting', 'actuary', 'insurance', 'realestate', 'propertyManagement', 'tradingCompany'] },
  office: { label: 'Office, Post & Communications', icon: '📞', ids: ['typingPool', 'switchboard', 'telegraph', 'postal'] },
  digital: { label: 'Technology & Computing', icon: '💻', ids: ['tech', 'cybersecurity', 'dataScience', 'aiOps', 'gameDevelopment'] },
  tech: { label: 'Science & Engineering', icon: '🔬', ids: ['research', 'nationalLab', 'engineering', 'structuralEng', 'mechanicalEng', 'electricalEng', 'chemicalEng', 'aerospaceEng', 'petroleumEng', 'nuclearEng', 'architecture', 'surveying', 'environmental', 'meteorology'] },
  health: { label: 'Medicine, Nursing & Ambulance', icon: '🩺', ids: ['medical', 'nursing', 'travelNursing', 'physicianAssistant', 'dentistry', 'pharmacy', 'veterinary', 'ems', 'privateEms'] },
  therapy: { label: 'Therapy & Allied Health', icon: '🧠', ids: ['counseling', 'psychology', 'physicalTherapy', 'occupationalTherapy', 'speechPathology', 'respiratoryTherapy', 'imaging', 'dentalHygiene', 'dietitian', 'optometry', 'chiropractic'] },
  social: { label: 'Social Work & Charities', icon: '🤝', ids: ['socialWork', 'cps', 'publicHealth', 'nonprofit'] },
  education: { label: 'Teaching & Libraries', icon: '🍎', ids: ['education', 'university', 'college', 'communityCollege', 'maritimeFaculty', 'library'] },
  safety: { label: 'Police, Fire & Emergency', icon: '🚓', ids: ['police', 'sheriff', 'statePolice', 'gendarmerie', 'transitPolice', 'universityPolice', 'airportPolice', 'privatePolice', 'fire', 'stateFire', 'airportFire', 'privateFire', 'dispatch', 'emergencyManagement'] },
  security: { label: 'Security, Parks & Wardens', icon: '🛡️', ids: ['tsa', 'privateSecurity', 'privateMilitary', 'gameWarden', 'parkService', 'animalControl'] },
  corrections: { label: 'Prisons & Investigations', icon: '🔐', ids: ['corrections', 'jail', 'federalPrisons', 'privatePrisons', 'probation', 'forensics', 'privateInvestigator', 'bailBonds'] },
  law: { label: 'Law & the Courts', icon: '⚖️', ids: ['legalSupport', 'law', 'courts', 'prosecution', 'publicDefender', 'oig'] },
  government: { label: 'Civil Service & Diplomacy', icon: '🏛️', ids: ['municipalAdmin', 'councilInspector', 'legislativeStaff', 'benefitsClaims', 'revenue', 'regulatory', 'dot', 'planning', 'foreignService'] },
  federalLE: { label: 'Federal Law Enforcement', icon: '🦅', ids: ['fbi', 'dea', 'atf', 'usms', 'usss', 'borderPatrol'] },
  intel: { label: 'Intelligence', icon: '🕶️', ids: ['intelligence', 'caseOfficer', 'sigint'] },
  empire: { label: 'Empire & the Colonies', icon: '🌍', ids: ['colonialService', 'colonialPolice', 'colonialTroops', 'colonialMedical', 'gurkhaContingent'] },
  intl: { label: 'International Organisations', icon: '🌐', ids: ['unSecretariat', 'unAgencies', 'euInstitutions', 'nato', 'intlFinance', 'intlJustice', 'icrc', 'maltaRelief', 'maltaDiplomacy'] },
  holySee: { label: 'Faith & the Church', icon: '⛪', ids: ['clergy', 'catholicClergy', 'anglicanClergy', 'jesuits', 'moc', 'romanCuria', 'holySeeDiplomacy', 'swissGuard', 'vaticanGendarmerie'] },
};

/** The fields, in the broad kinds of work they belong to (the job board's headings). */
export const FIELD_GROUPS = [
  ['Everyday work', ['service', 'personal', 'arts']],
  ['Hands-on & on the move', ['trades', 'industry', 'land', 'transport', 'travel']],
  ['Office & professional', ['business', 'office', 'digital', 'tech', 'law']],
  ['Care & teaching', ['health', 'therapy', 'social', 'education']],
  ['Public service & security', ['safety', 'security', 'corrections', 'government', 'federalLE', 'intel']],
  ['Empire, the world & the Church', ['empire', 'intl', 'holySee']],
];

/* ------------------------------------------------------------------ */
/* National government careers abroad                                  */
/* ------------------------------------------------------------------ */

/**
 * Each country's counterparts of the US federal careers (world/NationalAgencies.js), built from
 * the US ladder they mirror. They resolve by id (getProfession) but stay out of PROFESSION_LIST,
 * so US job boards, picks and seeds are unchanged.
 */
export const NATIONAL_PROFESSIONS = {};
for (const [cc, agencies] of Object.entries(AGENCIES)) {
  for (const [templateId, a] of Object.entries(agencies)) {
    const t = PROFESSIONS[templateId];
    if (!t || !a) continue;
    const id = nationalProfessionId(cc, templateId);
    const p = {
      ...t,
      id,
      name: a.name,
      country: cc,
      template: templateId,
      employers: a.employers,
      employerName: undefined,
      // National pensions cover these jobs; US exams, unions and federal age caps don't apply.
      exam: templateId === 'foreignService' ? t.exam : null,
      union: t.union ? { ...t.union, name: `${a.name} staff association` } : null,
      benefits: { ...(t.benefits ?? {}), pension: null },
      eligible: undefined,
      templateOnly: false,
      ...(a.fromYear ? { fromYear: a.fromYear } : {}), ...(a.untilYear ? { untilYear: a.untilYear } : {}),
      levels: t.levels.map((l) => { const title = a.titles?.[l.id] ?? NEUTRAL_TITLES[templateId]?.[l.id]; return title ? { ...l, title } : l; }),
    };
    NATIONAL_PROFESSIONS[id] = p;
    Object.defineProperty(PROFESSIONS, id, { value: p, enumerable: false });
    for (const l of p.levels) for (const c of l.req?.credentials ?? []) openTo(CREDENTIALS[c]?.requires, id);
  }
}

/**
 * State and local careers as each country runs them (world/LocalAgencies.js): same id,
 * the local agency's name, employer and ranks. PROFESSIONS[id] resolves to the version
 * for the country the life is played in.
 */
const LOCAL_VARIANTS = {};
for (const [cc, table] of Object.entries(LOCAL_AGENCIES)) {
  for (const [id, a] of Object.entries(table)) {
    const t = PROFESSIONS[id];
    if (!a || !t) continue;
    (LOCAL_VARIANTS[id] ??= {})[cc] = {
      ...t,
      name: a.name ?? t.name,
      localCountry: cc,
      ...(a.citizensOnly ? { citizensOnly: true } : {}),
      ...(a.employer ? { employerName: (city, _rng, stateName, stateId) => a.employer(city, stateId, stateName) } : {}),
      levels: t.levels.map((l) => (a.titles?.[l.id] ? { ...l, title: a.titles[l.id] } : l)),
    };
  }
}
// Private employers abroad use the country's own corporate titles.
for (const [cc, map] of Object.entries(PRIVATE_TITLES)) {
  for (const t of PROFESSION_LIST) {
    if (t.sector !== 'private' || !t.levels.some((l) => map[l.title])) continue;
    const prior = LOCAL_VARIANTS[t.id]?.[cc] ?? t;
    (LOCAL_VARIANTS[t.id] ??= {})[cc] = { ...prior, levels: prior.levels.map((l) => (map[l.title] ? { ...l, title: map[l.title] } : l)) };
  }
}
// Doctors, lawyers and academics carry their country's own ranks (world/ProfessionStandards).
for (const [cc, byProfession] of Object.entries(PROFESSION_TITLES)) {
  for (const [id, titles] of Object.entries(byProfession ?? {})) {
    const t = PROFESSIONS[id];
    if (!t || !titles) continue;
    const prior = LOCAL_VARIANTS[id]?.[cc] ?? t;
    (LOCAL_VARIANTS[id] ??= {})[cc] = { ...prior, levels: prior.levels.map((l) => (titles[l.id] ? { ...l, title: titles[l.id] } : l)) };
  }
}
for (const [id, byCountry] of Object.entries(LOCAL_VARIANTS)) {
  const base = PROFESSIONS[id];
  Object.defineProperty(PROFESSIONS, id, { get: () => byCountry[currentCountry()] ?? base, enumerable: true, configurable: true });
}

/** County offices with no counterpart abroad (sheriffs). */
export const US_ONLY_PROFESSIONS = ['sheriff'];

/** Careers on the job board where you live: everything except US federal jobs abroad, plus your country's own. */
/** Politics registers who's hiring: services contracted out or abolished, private careers the law has closed. */
const availabilityFilters = [];
/** Hide professions that don't exist for this life (public services, the era). Several may register. */
export const setAvailabilityFilter = (fn) => { availabilityFilters.push(fn); };
const availabilityFilter = (state, p) => availabilityFilters.every((f) => f(state, p));

export function professionsFor(state) {
  const cc = state?.character?.countryId ?? 'US';
  // One ministry per faith: your own church's clergy career, not three side by side.
  const ministry = state?.community ? clergyCareerFor(state.community.faith?.traditionId ?? state.community.orders?.tradition) : null;
  const local = (p) => (!ministry || !CLERGY_CAREERS.includes(p.id) || p.id === ministry) && (!availabilityFilters.length || !state?.character || availabilityFilter(state, p));
  if (cc === 'US') {
    const list = PROFESSION_LIST.filter(local);
    return list.length === PROFESSION_LIST.length ? PROFESSION_LIST : list;
  }
  const province = state.character.regionId ? stateIdOf(state) : null;
  return [...PROFESSION_LIST.filter((p) => p.sector !== 'federal' && !US_ONLY_PROFESSIONS.includes(p.id) && agencyExists(cc, p.id, province) && local(p)).map((p) => PROFESSIONS[p.id]), ...Object.values(NATIONAL_PROFESSIONS).filter((p) => p.country === cc && local(p))];
}

/** A job-board field's careers where you live (US federal ids swap for national counterparts abroad). */
export function fieldIdsFor(state, fieldId) {
  const cc = state?.character?.countryId ?? 'US';
  const ids = JOB_FIELDS[fieldId]?.ids ?? [];
  if (cc === 'US') return ids;
  const province = state.character?.regionId ? stateIdOf(state) : null;
  return ids.filter((id) => !US_ONLY_PROFESSIONS.includes(id) && agencyExists(cc, id, province)).map((id) => (PROFESSIONS[id]?.sector === 'federal' ? (NATIONAL_PROFESSIONS[nationalProfessionId(cc, id)] ? nationalProfessionId(cc, id) : null) : id)).filter(Boolean);
}

export const SECTOR_LABEL = { private: 'Private sector', municipal: 'Local government & schools', state: 'State government', federal: 'Federal government' };

export function getProfession(id) {
  const profession = PROFESSIONS[id];
  if (!profession) throw new Error(`Unknown profession: ${id}`);
  return profession;
}
