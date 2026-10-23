/**
 * Employer organizations: persistent employers with departments, leadership
 * and named people, shared by every career.
 *
 * An organization is an instance of an ORG_TYPE (OrgTypes.js) in a place:
 * one City of X per city, one state Department of Corrections per state, one
 * FBI nationwide, several competing hospital systems or law firms per region.
 * A job is a position (occupation + ladder level) in one department of one
 * organization; the employer object a job carries stays the department's
 * profile (size, union, benefits, training budget), now tagged with
 * `orgId` / `deptId`.
 *
 * People: each organization has a head and department heads, plus named
 * holders of the positions around the player's own (the supervisor, the
 * manager above them, coworkers at the same level, direct reports). Everyone
 * else is a headcount. Names are generated lazily on a side random stream so
 * organizations never shift the main game's dice.
 *
 * state.orgs = {
 *   seed,                    side random stream
 *   byId: { [orgId]: { id, typeId, name, scope, sector, regionId, stateId, size,
 *                      head: personId, departments: { [deptId]: Dept }, people: { [id]: Person },
 *                      founded } },
 * }
 * Dept   = { id, name, head: personId, headcount, seats: { [professionId]: { [levelId]: [personId] } } }
 * Person = { id, name, gender, age, professionId, levelId, title, deptId, years, performance,
 *            rel (how they get along with the player), selection ('appointed'|'elected'|'board'|'internal'|'hired') }
 */
import { Random } from '../../core/Random.js';
import { applyStaffing, STAFFING_VERSION, NATIONAL_POLICE } from './Staffing.js';
import { randomName } from '../../core/State.js';
import { REGIONS } from '../life/Regions.js';
import { STATES } from '../life/States.js';
import { ORG_TYPES, orgTypesFor, soloType, bodyType, businessOrgType } from './OrgTypes.js';
import { getProfession, professionsFor } from '../career/JobTrees.js';
import { localAgency, serviceAuthority, serviceBody, isNationalService } from '../world/LocalAgencies.js';
import { ladderFor, levelById } from '../career/Ladder.js';
import { seatsAt, NAMED_SEATS, layerExists } from './Vacancies.js';

const HEADCOUNT = { micro: [3, 30], small: [12, 45], medium: [50, 400], large: [400, 4000], enterprise: [4000, 40000], mega: [15000, 60000] };
const SIZE_RANK = { micro: -1, small: 0, medium: 1, large: 2, enterprise: 3, mega: 4 };

/** The organizations side stream (an LCG seed kept in the save). */
export function sideRng(state) {
  state.orgs ??= { seed: 1, byId: {} };
  state.orgs.seed = ((state.orgs.seed ?? 1) * 1664525 + 1013904223) >>> 0;
  return new Random(state.orgs.seed);
}

export function initOrgs(state, seed = 1) {
  state.orgs ??= { seed: (seed ^ 0x0a6) >>> 0, byId: {} };
  state.orgs.byId ??= {};
}

export const orgOf = (state, ref) => state.orgs?.byId?.[typeof ref === 'string' ? ref : ref?.orgId] ?? null;
export const deptOf = (state, job) => orgOf(state, job?.employer)?.departments[job?.employer?.deptId] ?? null;
export const personOf = (org, id) => (id ? org?.people[id] ?? null : null);

export function orgType(typeId) {
  if (typeId?.startsWith('biz:')) return businessOrgType(typeId.slice(4));
  if (typeId?.startsWith('solo:')) {
    const p = getProfession(typeId.slice(5));
    return p ? soloType(p) : null;
  }
  if (typeId?.startsWith('body:')) {
    const p = getProfession(typeId.slice(5));
    return p ? bodyType(p) : null;
  }
  return ORG_TYPES[typeId] ?? null;
}

const stateOfRegion = (regionId) => (REGIONS[regionId] ?? REGIONS.midcity).state;
const cityOf = (regionId) => (REGIONS[regionId] ?? REGIONS.midcity).name.split(',')[0];

/** Organization types that employ this profession, matching its sector when possible. */
function candidateTypes(profession, abroad = false) {
  // A type (or the department that would employ you) that exists only abroad, or only in the US.
  const fits = (id) => {
    const t = orgType(id);
    const d = t?.departments.find((x) => x.occupations.includes(profession.id));
    return abroad ? !d?.usOnly : !t?.abroadOnly && !d?.abroadOnly;
  };
  const all = orgTypesFor(profession.id).filter(fits);
  // Abroad, emergency services are bodies of their own, not city departments.
  if (abroad && all.includes('emergencyService')) return ['emergencyService'];
  const same = all.filter((id) => orgType(id)?.sector === profession.sector);
  return same.length ? same : all;
}

export function newPerson(rng, org, fields) {
  const gender = rng.pick(['male', 'female']);
  const n = randomName(rng, gender);
  const person = {
    id: rng.id('np_'),
    name: `${n.firstName} ${n.lastName}`,
    gender,
    age: fields.age ?? rng.int(28, 60),
    professionId: null,
    levelId: null,
    title: '',
    deptId: null,
    years: rng.int(1, 15),
    performance: rng.int(45, 85),
    rel: rng.int(40, 65),
    selection: 'internal',
    ...fields,
  };
  org.people[person.id] = person;
  return person;
}

/** Find or create the organization a job with this profession belongs to. */
export function findOrCreateOrg(state, profession, regionId, { size, name } = {}) {
  initOrgs(state);
  const rng = sideRng(state);
  // Private careers: sometimes the opening is at a business someone in town owns (an NPC's, or one you sold).
  if (profession.sector === 'private') {
    const local = Object.values(state.orgs.byId).filter((o) => o.business && !o.closed && o.owner?.kind === 'npc' && o.regionId === regionId
      && Object.values(o.departments).some((d) => !d.branch && orgType(o.typeId)?.departments.find((x) => x.id === d.id)?.occupations.includes(profession.id)));
    if (local.length && rng.chance(0.25)) return rng.pick(local);
  }
  const types = candidateTypes(profession, (state.character?.countryId ?? 'US') !== 'US');
  // Prefer an organization type that already exists here (one city government, not three).
  const stateId = stateOfRegion(regionId);
  // A local unit of a national or state service belongs to that service.
  if (types[0] === 'emergencyService') {
    const body = serviceBody(state.character?.countryId, profession.id, STATES[stateId]?.name);
    if (body) { name = body; size = SIZE_RANK[size] > SIZE_RANK.enterprise ? size : 'enterprise'; }
    // A national service is one body for the whole country, not the town's.
    if (isNationalService(state.character?.countryId, profession.id)) {
      size = 'mega';
      const key = orgKey('emergencyService', ORG_TYPES.emergencyService, regionId, stateId, name);
      const org = state.orgs.byId[key] ?? buildOrg(state, rng, 'emergencyService', key, regionId, stateId, { size, name, profession, national: true });
      Object.assign(org, { size: 'mega', regionId: null, stateId: null, national: true, countryId: org.countryId ?? state.character?.countryId });
      return org;
    }
  }
  // Abroad, public services sit where they really do: the council, or a body of their own.
  const home = abroadHome(state, profession, name, types, regionId);
  if (home?.kind === 'council') return findCouncil(state, regionId, size);
  if (home?.kind === 'body') {
    const typeId = `body:${profession.id}`;
    const key = `${typeId}:${home.name}`;
    const org = state.orgs.byId[key];
    if (org) { if (size && SIZE_RANK[size] > SIZE_RANK[org.size]) org.size = size; return org; }
    const built = buildOrg(state, rng, typeId, key, regionId, stateId, { size: home.national ? 'mega' : size, name: home.name, profession, national: home.national, servedBy: home.servedBy, primaryPolice: home.primaryPolice });
    return built;
  }
  const keyFor = (typeId, t) => orgKey(typeId, t, regionId, stateId, name);
  const keys = types.map((typeId) => ({ typeId, t: orgType(typeId), key: keyFor(typeId, orgType(typeId)) }));
  const existing = keys.find((k) => state.orgs.byId[k.key]);
  const pick = existing ?? rng.pick(keys);
  if (state.orgs.byId[pick.key]) {
    const org = state.orgs.byId[pick.key];
    addMissingDepartments(state, org);
    if (size && SIZE_RANK[size] > SIZE_RANK[org.size]) org.size = size;
    return org;
  }
  return buildOrg(state, rng, pick.typeId, pick.key, regionId, stateId, { size, name, profession });
}

/** Careers a local council runs abroad, and those it also runs in particular countries. */
const COUNCIL_CAREERS = ['municipalAdmin', 'publicWorks', 'councilInspector', 'planning', 'library', 'waterUtility'];
const COUNCIL_ALSO = {
  GB: ['education', 'schoolBus', 'cps', 'publicHealth', 'animalControl'], SE: ['education', 'schoolBus', 'cps', 'animalControl'],
  NL: ['cps', 'schoolBus', 'animalControl'], DE: ['cps', 'publicHealth', 'animalControl'], JP: ['education', 'schoolBus'],
  CA: ['publicHealth', 'animalControl'], IT: ['schoolBus', 'animalControl'], FR: ['schoolBus', 'animalControl'], '*': ['animalControl'],
};
/** An employer name that says it's the council's ("Manchester City Council — Schools", "Gemeente Utrecht"). */
const COUNCIL_NAME = /\bCouncil\b|\bcouncil\b|Gemeente|kommun\b|Mairie|Comune|Ayuntamiento|Stadtverwaltung|City Hall|Municipio|Prefeitura|Municipal Corporation|District Office/;
/** Places, so "Roads authority — Scotland" is one body and "NCA — Investigations" a unit of the NCA. */
let CITY_NAMES = null;
let PROVINCE_NAMES = null;
const plain = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const placeSets = () => {
  // (Foreign provinces aren't enumerable on STATES: reach them through the cities.)
  CITY_NAMES ??= new Set(Object.getOwnPropertyNames(REGIONS).map((id) => REGIONS[id]?.name?.split(',')[0]).filter(Boolean).map(plain));
  PROVINCE_NAMES ??= new Set(Object.getOwnPropertyNames(STATES).map((id) => STATES[id]?.name).filter(Boolean).map(plain));
};
const isCity = (s) => { placeSets(); return CITY_NAMES.has(plain(s)); };
const isProvince = (s) => { placeSets(); return PROVINCE_NAMES.has(plain(s)) && !CITY_NAMES.has(plain(s)); };
const isPlace = (s) => isCity(s) || isProvince(s);
/** Countries whose provinces or states run their own justice, prisons and social services. */
const FEDERAL = ['US', 'CA', 'AU', 'DE', 'IN', 'MX', 'ES', 'IT', 'BR', 'NG'];
/**
 * State-level services that are one body for the whole country in a unitary state (the Irish
 * Prison Service, the Courts Service, Oranga Tamariki) and one per province in a federal one.
 */
const STATE_SERVICES = ['emergencyManagement', 'corrections', 'probation', 'courts', 'prosecution', 'publicDefender', 'cps', 'forensics', 'forester', 'dot', 'environmental', 'revenue', 'stateFire', 'gameWarden'];
/** A composite agency label rather than an organization's name ("Financial Regulation (FCA · HMRC)"). */
const LABEL_ONLY = /·|\/|\bRanger\b|\bOfficer\b|\bAnalysis\b|\bTechnical\b|\bInstitutes\b|\bRegulat|\bScreening\b|\bProtective\b/;
/** "Department of Conservation Ranger" → the Department of Conservation; null when the label names no agency. */
function agencyOfLabel(label) {
  const m = String(label).match(/^(.*?)\s+Ranger(?:\s+\((.+)\))?$/);
  if (!m) return null;
  const agency = m[2] ?? m[1];
  return /^National Park$/.test(agency) || LABEL_ONLY.test(agency) ? null : agency;
}

/**
 * Where a public career sits abroad: the council, or a body of its own (a national
 * agency with the office as your unit, or a regional body). null: as at home.
 *
 * Employer names say which: "Courts Service — Cork" is the Cork office of a national (or,
 * in a federal country, provincial) body; "Forestry Service — Quebec" is a province's body.
 */
function abroadHome(state, profession, employerName, types, regionId) {
  const cc = state.character?.countryId ?? 'US';
  if (cc === 'US' || profession.sector === 'private' || !employerName) return null;
  if (types[0] === 'emergencyService' || types.some((id) => id === 'airportAuthority')) return null;
  const [before, after] = String(employerName).split(' — ');
  const stateId = stateOfRegion(regionId);
  const province = STATES[stateId]?.name;
  // National agencies: the agency is the organization; the office (or the park) is your unit.
  if (profession.country || profession.sector === 'federal') {
    const label = profession.name;
    const parks = agencyOfLabel(label);
    if (parks) return { kind: 'body', national: true, name: parks };
    // A national park with its own authority (the Lake District): a small body of its own.
    if (/Ranger/.test(label) && /National Park/.test(employerName)) return { kind: 'body', name: employerName, servedBy: 'local' };
    return { kind: 'body', national: true, name: !LABEL_ONLY.test(label) ? label : after && !isPlace(after) ? before : employerName };
  }
  if (COUNCIL_CAREERS.includes(profession.id) || (COUNCIL_ALSO[cc] ?? COUNCIL_ALSO['*']).includes(profession.id) || COUNCIL_NAME.test(employerName)) {
    const t = orgType('cityGov');
    if (t.departments.some((d) => d.occupations.includes(profession.id))) return { kind: 'council' };
  }
  const federal = FEDERAL.includes(cc);
  const stateLevel = STATE_SERVICES.includes(profession.id) || profession.sector === 'state';
  // "Courts Service — Cork": the Cork office of the national courts service (or the province's).
  if (after && isCity(after)) {
    if (stateLevel && federal && province) return { kind: 'body', name: `${before} — ${province}`, servedBy: 'province' };
    if (stateLevel) return { kind: 'body', national: true, name: before };
    return { kind: 'body', name: employerName, servedBy: 'local' };
  }
  // "Forestry Service — Canterbury": a province's own body, or (in a unitary state) the nation's regional office.
  if (after && isProvince(after)) {
    if (stateLevel && !federal) return { kind: 'body', national: true, name: before };
    return { kind: 'body', name: employerName, servedBy: 'province' };
  }
  const agency = localAgency(cc, profession.id);
  // A national police force (the Nationale Politie, Polismyndigheten): its regions and stations are units of it.
  if (profession.id === 'statePolice' && NATIONAL_POLICE.includes(cc) && agency?.name) {
    return { kind: 'body', national: true, primaryPolice: true, name: agency.name.replace(/\s*\(.*\)$/, '') };
  }
  // "Cork Prison", "Canterbury Division of Probation": a unit of the national service in a unitary state.
  const serviceName = agency?.name ?? (after && !isPlace(after) ? before : null);
  if (stateLevel && !federal && STATE_SERVICES.includes(profession.id) && serviceName && !/^(Schools?|Children's Services)$/.test(serviceName)) {
    return { kind: 'body', national: true, name: serviceName };
  }
  // A regional body is named for its region (and covers it); a unit of a body ("— Investigations") belongs to it.
  const regional = (stateLevel && federal) || (province && plain(employerName).includes(plain(province)));
  // Where there are no local police, the prefecture's or province's police are the police.
  const primaryPolice = profession.id === 'statePolice' && agency !== undefined && localAgency(cc, 'police') === null;
  return { kind: 'body', name: after && !isPlace(after) ? before : employerName, servedBy: regional ? 'province' : 'local', ...(primaryPolice ? { primaryPolice } : {}) };
}

/** The local council where you live (one per town). */
function findCouncil(state, regionId, size) {
  const key = orgKey('cityGov', ORG_TYPES.cityGov, regionId, stateOfRegion(regionId), null);
  const org = state.orgs.byId[key];
  if (org) { addMissingDepartments(state, org); if (size && SIZE_RANK[size] > SIZE_RANK[org.size]) org.size = size; return org; }
  return buildOrg(state, sideRng(state), 'cityGov', key, regionId, stateOfRegion(regionId), { size, profession: getProfession('municipalAdmin') });
}

/** The key an organization of this type has in a place. */
function orgKey(typeId, t, regionId, stateId, name) {
  return t.scope === 'named' ? `${typeId}:${name ?? 'service'}` : t.scope === 'nation' ? typeId : t.scope === 'state' ? `${typeId}:${stateId}` : t.scope === 'region' ? `${typeId}:${regionId}` : `${typeId}:${regionId}:${name ?? 'firm'}`;
}

/** Find or create a specific organization type in a place (e.g. every state agency a governor runs). */
export function ensureOrgOfType(state, typeId, regionId, { size = 'medium' } = {}) {
  initOrgs(state);
  const t = orgType(typeId);
  if (!t || t.business) return null;
  const stateId = stateOfRegion(regionId);
  const rng = sideRng(state);
  // Private (market) types: reuse a firm of this kind in town before founding another.
  if (t.scope === 'market') {
    const local = Object.values(state.orgs.byId).find((o) => o.typeId === typeId && o.regionId === regionId && !o.closed);
    if (local) return addMissingDepartments(state, local);
  }
  const name = t.scope === 'market' && t.name ? t.name({ city: cityOf(regionId), state: STATES[stateId]?.name ?? 'the State', rng }) : undefined;
  const key = orgKey(typeId, t, regionId, stateId, name);
  if (state.orgs.byId[key]) return addMissingDepartments(state, state.orgs.byId[key]);
  const profession = getProfession(t.departments[0]?.occupations[0]);
  return buildOrg(state, rng, typeId, key, regionId, stateId, { size, name, profession });
}

/**
 * Abroad, a government body takes its local agency's names: a department is the local
 * service (An Garda Síochána, not "State Police"), headed by that service's own top rank.
 */
function localLabels(state, occupations) {
  const cc = state.character?.countryId ?? 'US';
  const occ = occupations?.find((id) => localAgency(cc, id));
  if (cc === 'US' || !occ) return null;
  const p = getProfession(occ);
  const top = p?.levels.filter((l) => !l.id.includes('_cmd')).at(-1);
  return { name: p?.name, head: top?.title, agency: localAgency(cc, occ) };
}

/**
 * A post as an organization abroad names it: a department's head takes the local
 * service's top rank, and an appointment by "the governor" is one by the government.
 */
export function localizePost(org, deptId, def) {
  if (!def) return def;
  // A body with its own posts (an emergency service abroad) names them itself.
  const own = org?.posts?.[deptId ?? 'org'];
  if (own) return { ...def, ...own };
  const cc = REGIONS[org?.regionId]?.country ?? (org?.stateId ? STATES[org.stateId]?.country : null) ?? 'US';
  if (cc === 'US') return def;
  const t = orgType(org.typeId);
  const occupations = deptId ? t?.departments.find((d) => d.id === deptId)?.occupations : t?.departments.length === 1 ? t.departments[0].occupations : null;
  const local = t?.sector !== 'private' ? localLabels({ character: { countryId: cc } }, occupations) : null;
  const appointedBy = def.appointedBy && /governor|President|Senate/i.test(def.appointedBy) ? 'the government' : def.appointedBy;
  // US elected posts (sheriff, district attorney) are career appointments abroad; local offices stay elected.
  const usElected = def.office && !['mayor', 'cityCouncil', 'schoolBoard', 'cityManager'].includes(def.office);
  if (!local?.head && appointedBy === def.appointedBy && !usElected) return def;
  return { ...def, title: local?.head ?? def.title, appointedBy: usElected ? 'the government' : appointedBy, ...(usElected ? { selection: 'appointed', office: undefined } : {}) };
}

function buildOrg(state, rng, typeId, key, regionId, stateId, { size, name, profession, national = false, servedBy = null, primaryPolice = false }) {
  const t = orgType(typeId);
  const pick = { typeId, key };
  const ctx = { city: cityOf(regionId), state: STATES[stateId]?.name ?? 'the State', rng, name };
  const org = {
    id: pick.key,
    typeId: pick.typeId,
    name: t.scope === 'market' || t.solo || !t.name ? name ?? profession?.name ?? 'Organization' : t.name(ctx),
    scope: t.scope,
    sector: t.sector,
    regionId: t.scope === 'nation' ? null : regionId,
    stateId: t.scope === 'nation' ? null : stateId,
    // National agencies and state departments are big; local offices default to mid-size.
    size: size ?? (t.scope === 'nation' || t.sector === 'federal' ? 'mega' : t.scope === 'state' ? 'large' : 'medium'),
    head: null,
    departments: {},
    people: {},
    founded: state.character?.age ?? 0,
    ...(national ? { national: true, countryId: state.character?.countryId ?? 'US' } : {}),
    ...(servedBy ? { servedBy } : {}),
    ...(primaryPolice ? { primaryPolice } : {}),
  };
  // A service named for its state or province (NSW Police Force, Victoria Police) covers all of it.
  if (typeId === 'emergencyService' && !national && !org.servedBy) {
    const code = String(stateId ?? '').split('-')[1];
    const prov = STATES[stateId]?.name;
    if ((prov && plain(org.name).includes(plain(prov))) || (code && code.length > 1 && new RegExp(`\\b${code}\\b`).test(org.name))) org.servedBy = 'province';
  }
  // Abroad: a state-level body is named for its first local service (the Hokkaido Prefectural Police).
  const lead = t.scope !== 'market' && t.sector !== 'private' ? localLabels(state, t.departments[0]?.occupations) : null;
  if (lead?.agency?.employer && t.scope === 'state') org.name = lead.agency.employer(ctx.city, stateId, ctx.state);
  // Abroad a city government is the local council (Manchester City Council, Gemeinde, Comune).
  const council = typeId === 'cityGov' && (state.character?.countryId ?? 'US') !== 'US' ? localAgency(state.character.countryId, 'municipalAdmin') : null;
  if (council?.employer) org.name = council.employer(ctx.city, stateId, ctx.state);
  // A service's own posts first, so its chief is a Chief Fire Officer, not the type's first occupation's head.
  if (typeId === 'emergencyService' || typeId.startsWith('body:')) serviceOrgPosts(state, org, profession, rng);
  const head = newPerson(rng, org, { title: org.posts?.org?.title ?? (lead && t.departments.length === 1 ? lead.head ?? t.head.title : t.head.title), selection: t.head.selection, age: rng.int(45, 66), professionId: t.head.occupation ?? null, levelId: t.head.levelId ?? null, years: rng.int(1, 8) });
  org.head = head.id;
  for (const d of t.departments) {
    if (d.usOnly && (state.character?.countryId ?? 'US') !== 'US') continue;
    if (d.abroadOnly && (state.character?.countryId ?? 'US') === 'US') continue;
    const range = HEADCOUNT[org.size];
    // A department is named for its own service (an emergency service's operations, for its service).
    const local = t.sector !== 'private' ? localLabels(state, org.serviceId ? [org.serviceId] : d.occupations) : null;
    const dept = { id: d.id, name: local?.name ?? d.name, head: null, headcount: Math.round(rng.int(range[0], range[1]) / Math.max(1, t.departments.length)), seats: {} };
    const post = localizePost(org, d.id, d.head);
    const dh = newPerson(rng, org, { title: post.title, selection: post.selection, deptId: d.id, age: rng.int(40, 62) });
    dept.head = dh.id;
    org.departments[d.id] = dept;
  }
  // Government bodies are staffed for the population they serve (Staffing).
  applyStaffing(org);
  state.orgs.byId[org.id] = org;
  return org;
}

/**
 * An emergency service abroad: its chief is the top of the service's own ladder, appointed by
 * whoever governs it there; its head of operations is the rank below.
 */
function serviceOrgPosts(state, org, profession, rng) {
  if (!profession) return;
  const cc = state.character?.countryId ?? 'US';
  const ladder = profession.levels.filter((l) => !l.id.includes('_cmd'));
  const top = ladder.at(-1);
  const deputy = [...ladder].reverse().find((l) => l !== top && (l.track === 'mgmt' || l.abilities?.includes('supervise'))) ?? ladder.at(-2);
  org.serviceId = profession.id;
  // Emergency services answer to their own authorities; other bodies to the government (or the council).
  org.authority = ['police', 'fire', 'ems', 'dispatch'].includes(profession.id) ? serviceAuthority(cc, profession.id, stateOfRegion(org.regionId))
    : profession.country || profession.sector === 'federal' ? 'the government' : profession.sector === 'state' ? (['CA', 'AU', 'DE', 'IN', 'MX', 'ES', 'IT', 'BR'].includes(cc) ? 'the regional government' : 'the government') : 'the local authority';
  org.posts = {
    org: { title: top.title, selection: 'appointed', appointedBy: org.authority, occupation: profession.id, levelId: top.id },
    operations: { title: deputy?.title ?? 'Head of Operations', selection: 'internal', occupation: profession.id, levelId: deputy?.id },
  };
  void rng;
}

/** Organizations from older saves gain departments their type has added since. */
export function addMissingDepartments(state, org) {
  if (!org || org.business || org.closed) return org;
  // Older saves: a service's chief was titled for the type's first occupation (a fire service's "Chief Constable").
  const chief = org.posts?.org && !org.playerHead ? org.people[org.head] : null;
  // Older saves: a national service (FENZ) built as one town's.
  if (org.typeId === 'emergencyService' && !org.national && isNationalService(state.character?.countryId, org.serviceId)) Object.assign(org, { size: 'mega', regionId: null, stateId: null, national: true });
  if (chief && chief.title !== org.posts.org.title) chief.title = org.posts.org.title;
  if (org.staffing !== STAFFING_VERSION) applyStaffing(org);
  const t = orgType(org.typeId);
  let added = false;
  const abroad = (state.character?.countryId ?? 'US') !== 'US';
  for (const d of t?.departments ?? []) {
    if (org.departments[d.id] || (d.abroadOnly && !abroad) || (d.usOnly && abroad)) continue;
    org.departments[d.id] = { id: d.id, name: d.name, head: null, headcount: Math.round((HEADCOUNT[org.size ?? 'medium'][0] + HEADCOUNT[org.size ?? 'medium'][1]) / 2 / t.departments.length), seats: {} };
    added = true;
  }
  if (added) ensureHeads(state, org);
  return org;
}

/** The department of `org` that employs this profession. */
export function departmentFor(org, professionId) {
  const t = orgType(org.typeId);
  if (org.business) {
    const d = t?.departments.find((x) => x.occupations.includes(professionId) && org.departments[x.id]);
    return d ? org.departments[d.id] : Object.values(org.departments).find((x) => !x.branch) ?? null;
  }
  const d = t?.departments.find((x) => x.occupations.includes(professionId)) ?? t?.departments[0];
  return d ? org.departments[d.id] : null;
}

/** Division label inside a department (e.g. "Police Division"), if the type defines one. */
export function divisionName(org, deptId, professionId) {
  return orgType(org.typeId)?.departments.find((d) => d.id === deptId)?.divisions?.[professionId] ?? null;
}

/**
 * Tag a freshly generated employer profile with its organization and
 * department. Called by createEmployer for every employer in the game.
 */
export function attachOrg(state, employer, profession, regionId) {
  const org = findOrCreateOrg(state, profession, regionId, { size: employer.size, name: employer.name });
  const dept = departmentFor(org, profession.id);
  employer.orgId = org.id;
  employer.deptId = dept?.id ?? null;
  if (org.business) employer.name = org.name;
  employer.orgName = org.name;
  employer.deptName = dept?.name ?? null;
  employer.division = dept ? divisionName(org, dept.id, profession.id) : null;
  // A unit of a bigger service: the station, office or command you work in.
  if ((org.typeId === 'emergencyService' || org.typeId?.startsWith('body:') || (org.typeId === 'cityGov' && dept?.id !== 'administration')) && org.name !== employer.name) employer.division = employer.name;
  return employer;
}

/* ------------------------------------------------------------------ */
/* Positions and the chain of command                                  */
/* ------------------------------------------------------------------ */

export const supervises = (l) => l.abilities?.includes('supervise') || l.track === 'mgmt';

/** Named holders of a position, generated up to `count`. */
export function seatHolders(state, org, deptId, professionId, levelId, count = 1, generate = true) {
  const dept = org.departments[deptId];
  if (!dept) return [];
  if (!generate) return (dept.seats[professionId]?.[levelId] ?? []).map((id) => org.people[id]).filter(Boolean).slice(0, count);
  dept.seats[professionId] ??= {};
  const list = (dept.seats[professionId][levelId] ??= []).filter((id) => org.people[id]);
  dept.seats[professionId][levelId] = list;
  if (list.length < count) {
    const rng = sideRng(state);
    const profession = getProfession(professionId);
    const level = levelById(profession, levelId);
    while (list.length < count) {
      const p = newPerson(rng, org, {
        title: level?.title ?? profession?.name ?? 'Staff',
        professionId,
        levelId,
        deptId,
        age: Math.min(64, 24 + (level?.grade ?? 3) * 3 + rng.int(0, 10)),
        years: rng.int(0, 4 + (level?.grade ?? 3)),
      });
      list.push(p.id);
    }
  }
  return list.slice(0, count).map((id) => org.people[id]);
}

/** Supervisory levels of this ladder above `levelId`, nearest first. */
function levelsAbove(profession, size, levelId) {
  const ladder = ladderFor(profession, size);
  const idx = ladder.findIndex((l) => l.id === levelId);
  const current = ladder[idx];
  if (!current) return [];
  return ladder.slice(idx + 1).filter((l) => supervises(l) && l.grade > current.grade && !l.appointed && (l.track === 'mgmt' || l.track === 'shared' || l.track === current.track));
}

/** A business's owner, shown at the top of the chain. */
function ownerOf(org) {
  return org.owner ? { id: null, name: org.owner.name, title: org.owner.kind === 'player' ? 'Owner (you)' : 'Owner', selection: 'owner', rel: 50, years: 0 } : null;
}

/** The body a top executive answers to (a board, an elected official, the voters). */
function overseer(t) {
  const by = t.head.appointedBy ?? (t.head.selection === 'elected' ? 'the voters' : 'the board');
  return { id: null, name: by.charAt(0).toUpperCase() + by.slice(1), title: t.head.selection === 'elected' ? 'Electorate' : t.head.selection === 'board' ? 'Board' : 'Appointing authority', body: true, rel: 50 };
}

/** Re-seat NPC heads where nobody (and not the player) holds the post. */
/** Whether a department's work exists where you live (no sheriff's office or DA abroad). */
function deptHere(state, d) {
  if ((state.character?.countryId ?? 'US') === 'US' || !d.occupations?.length) return true;
  if (d.usOnly) return false;
  const here = new Set(professionsFor(state).map((p) => p.id));
  return d.occupations.some((id) => here.has(id));
}

export function ensureHeads(state, org) {
  if (!org || org.business || org.closed) return;
  const t = orgType(org.typeId);
  if (!t) return;
  const rng = sideRng(state);
  // Older saves: generic employers once had a "Department Head" and an "Owner / Chief Executive".
  if (t.solo && !org.retitled) {
    org.retitled = true;
    const retitle = (h, post) => { if (h && post && /^(Department Head|Owner \/ Chief Executive)$/.test(h.title)) Object.assign(h, { title: post.title, selection: post.selection }); };
    retitle(org.people[org.head], localizePost(org, null, t.head));
    for (const d of t.departments) retitle(org.people[org.departments[d.id]?.head], localizePost(org, d.id, d.head));
  }
  if (!org.head && !org.playerHead && !org.officeHead) org.head = newPerson(rng, org, { title: t.head.title, selection: t.head.selection === 'internal' ? 'internal' : t.head.selection, age: rng.int(45, 64), years: 0 }).id;
  for (const d of t.departments) {
    const dept = org.departments[d.id];
    const post = org.business ? d.head : localizePost(org, d.id, d.head);
    if (dept && !dept.head && !dept.playerHead && !dept.officeHead && deptHere(state, d)) dept.head = newPerson(rng, org, { title: post.title, selection: post.selection, deptId: d.id, age: rng.int(40, 62), years: 0 }).id;
  }
}

/**
 * Who the player works with: { org, dept, division, supervisor, manager,
 * deptHead, orgHead, coworkers[], reports[] }. With generate: false
 * (views) it only reads people who already exist. Supervisor and manager are
 * the holders of the next supervisory levels above the player's own in the
 * same occupation; above the occupation's ladder it's the department head.
 */
export function chainOfCommand(state, job, { generate = true } = {}) {
  const org = orgOf(state, job?.employer);
  if (!org) return null;
  const dept = org.departments[job.employer.deptId];
  if (!dept) return null;
  if (generate) ensureHeads(state, org);
  if (job.headOf && job.headOf.orgId === org.id) return headChain(state, org, dept, job, generate);
  const profession = getProfession(job.professionId);
  const size = job.employer.size;
  // A post that's vacant (waiting to be filled) has no holder: report to the next one up.
  const vacant = (levelId) => (dept.vacancies ?? []).some((v) => v.professionId === job.professionId && v.levelId === levelId);
  const chain = [];
  for (const l of levelsAbove(profession, size, job.levelId)) {
    if (chain.length >= 2) break;
    // A layer of management the department is too small to have.
    if (!layerExists(org, dept.id, profession, l, size) && !seatHolders(state, org, dept.id, job.professionId, l.id, 1, false).length) continue;
    const holder = vacant(l.id) ? seatHolders(state, org, dept.id, job.professionId, l.id, 1, false)[0] : seatHolders(state, org, dept.id, job.professionId, l.id, 1, generate)[0];
    if (holder) chain.push(holder);
  }
  const t = orgType(org.typeId);
  // The player holds the organization's top job: they answer to whoever appointed or elected them.
  const isHead = t?.head.occupation === job.professionId && t.head.levelId === job.levelId;
  // In a small organization the department head and the boss are one level: show the boss.
  const tiny = Object.values(org.departments).reduce((n, d) => n + (d.headcount ?? 0), 0) < 15 && Boolean(org.head ?? org.ceo);
  const deptHead = isHead || tiny ? null : personOf(org, dept.head);
  const orgHead = isHead ? overseer(t) : personOf(org, org.head) ?? personOf(org, org.ceo) ?? ownerOf(org);
  const supervisor = chain[0] ?? (deptHead && !job.abilities?.includes('exec') ? deptHead : orgHead);
  const manager = chain[1] ?? (chain[0] ? deptHead : supervisor === deptHead ? orgHead : null);
  // Named posts have few seats, and you hold one of them.
  const cap = (levelId, wanted, includesPlayer) => {
    const level = levelById(profession, levelId);
    const seats = level && !org.business ? seatsAt(org, dept.id, profession, level, size) : Infinity;
    return seats <= NAMED_SEATS ? Math.max(0, Math.min(wanted, seats - (includesPlayer ? 1 : 0))) : wanted;
  };
  const peers = cap(job.levelId, job.abilities?.includes('exec') ? 1 : 3, true);
  const coworkers = peers ? seatHolders(state, org, dept.id, job.professionId, job.levelId, peers, generate) : [];
  const ladder = ladderFor(profession, job.employer.size);
  const idx = ladder.findIndex((l) => l.id === job.levelId);
  const below = idx > 0 ? ladder.slice(0, idx).reverse().find((l) => l.track === 'shared' || l.track === ladder[idx].track) : null;
  const reports = job.department && below ? seatHolders(state, org, dept.id, job.professionId, below.id, cap(below.id, Math.min(4, job.department.headcount), false), generate) : [];
  return {
    org,
    dept,
    division: divisionName(org, dept.id, job.professionId),
    supervisor,
    manager: manager && manager !== supervisor ? manager : null,
    deptHead: deptHead !== supervisor && deptHead !== manager ? deptHead : null,
    orgHead: orgHead !== supervisor && orgHead !== manager ? orgHead : null,
    coworkers,
    reports,
  };
}

/** The chain for a player who heads a department or the whole organization. */
function headChain(state, org, dept, job, generate) {
  const t = orgType(org.typeId);
  const h = job.headOf;
  const size = job.employer.size;
  const headOfDept = (id) => personOf(org, org.departments[id]?.head);
  if (!h.deptId) {
    // You run the organization: you answer to the board or whoever appointed you; department heads report to you.
    const reports = t.departments.filter((d) => deptHere(state, d)).map((d) => headOfDept(d.id)).filter(Boolean);
    return { org, dept, division: null, supervisor: overseer(t), manager: null, deptHead: null, orgHead: null, coworkers: [], reports, leads: 'org' };
  }
  const hdept = org.departments[h.deptId] ?? dept;
  const orgHead = personOf(org, org.head) ?? personOf(org, org.ceo) ?? ownerOf(org) ?? overseer(t);
  const coworkers = t.departments.filter((d) => d.id !== h.deptId && deptHere(state, d)).map((d) => headOfDept(d.id)).filter(Boolean).slice(0, 4);
  // Your reports: the senior managers of each career in your department.
  const def = t.departments.find((d) => d.id === h.deptId);
  const reports = (def?.occupations ?? []).flatMap((occ) => {
    const prof = getProfession(occ);
    if (!prof) return [];
    const top = [...ladderFor(prof, size)].reverse().find((l) => supervises(l) && !l.appointed && !(occ === job.professionId && l.id === job.levelId) && !l.abilities.includes('exec'));
    return top ? seatHolders(state, org, hdept.id, occ, top.id, 1, generate) : [];
  }).slice(0, 4);
  return { org, dept: hdept, division: null, supervisor: orgHead, manager: null, deptHead: null, orgHead: null, coworkers, reports, leads: 'dept' };
}

/* ------------------------------------------------------------------ */
/* Separation records                                                  */
/* ------------------------------------------------------------------ */

/**
 * How the organization remembers you: 'good' (eligible for rehire),
 * 'neutral', or 'ineligible' (fired for cause).
 */
export function separationStanding(job, fired) {
  if (fired) return 'ineligible';
  if ((job.performance ?? 50) >= 60 && (job.boss ?? 50) >= 45) return 'good';
  return 'neutral';
}

/** Fields an employment-history entry records about the organization. */
export function historyOrgFields(job, fired) {
  const e = job.employer ?? {};
  return { orgId: e.orgId ?? null, orgName: e.orgName ?? null, deptName: e.deptName ?? null, division: e.division ?? null, standing: separationStanding(job, fired) };
}

/** Your record with an organization (most recent separation), or null. */
export function standingWith(state, orgId) {
  const h = [...state.career.history].reverse().find((x) => x.orgId === orgId);
  return h ? { standing: h.standing ?? 'neutral', endAge: h.endAge, title: h.title, fired: h.fired } : null;
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const OrganizationsModule = {
  id: 'orgs',
  order: 29.5,

  init(state, rng) {
    initOrgs(state, rng?.seed ?? 1);
    // Saves from before organizations existed: give current and held jobs an organization.
    const jobs = [state.career?.job, state.career?.leave?.job].filter(Boolean);
    for (const job of jobs) {
      if (job.employer?.orgId && state.orgs.byId[job.employer.orgId]) continue;
      const profession = getProfession(job.professionId);
      if (!profession || !job.employer) continue;
      attachOrg(state, job.employer, profession, state.character.regionId);
      if (job.levelId) chainOfCommand(state, job);
    }
  },
};
