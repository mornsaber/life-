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
import { applyStaffing, STAFFING_VERSION } from './Staffing.js';
import { randomName } from '../../core/State.js';
import { REGIONS } from '../life/Regions.js';
import { STATES } from '../life/States.js';
import { ORG_TYPES, orgTypesFor, soloType, businessOrgType } from './OrgTypes.js';
import { getProfession } from '../career/JobTrees.js';
import { ladderFor, levelById } from '../career/Ladder.js';
import { seatsAt, NAMED_SEATS } from './Vacancies.js';

const HEADCOUNT = { small: [12, 45], medium: [50, 400], large: [400, 4000], enterprise: [4000, 40000] };
const SIZE_RANK = { small: 0, medium: 1, large: 2, enterprise: 3 };

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
  return ORG_TYPES[typeId] ?? null;
}

const stateOfRegion = (regionId) => (REGIONS[regionId] ?? REGIONS.midcity).state;
const cityOf = (regionId) => (REGIONS[regionId] ?? REGIONS.midcity).name.split(',')[0];

/** Organization types that employ this profession, matching its sector when possible. */
function candidateTypes(profession) {
  const all = orgTypesFor(profession.id);
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
  const types = candidateTypes(profession);
  // Prefer an organization type that already exists here (one city government, not three).
  const stateId = stateOfRegion(regionId);
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

/** The key an organization of this type has in a place. */
function orgKey(typeId, t, regionId, stateId, name) {
  return t.scope === 'nation' ? typeId : t.scope === 'state' ? `${typeId}:${stateId}` : t.scope === 'region' ? `${typeId}:${regionId}` : `${typeId}:${regionId}:${name ?? 'firm'}`;
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

function buildOrg(state, rng, typeId, key, regionId, stateId, { size, name, profession }) {
  const t = orgType(typeId);
  const pick = { typeId, key };
  const ctx = { city: cityOf(regionId), state: STATES[stateId]?.name ?? 'the State', rng };
  const org = {
    id: pick.key,
    typeId: pick.typeId,
    name: t.scope === 'market' || t.solo || !t.name ? name ?? profession?.name ?? 'Organization' : t.name(ctx),
    scope: t.scope,
    sector: t.sector,
    regionId: t.scope === 'nation' ? null : regionId,
    stateId: t.scope === 'nation' ? null : stateId,
    size: size ?? 'medium',
    head: null,
    departments: {},
    people: {},
    founded: state.character?.age ?? 0,
  };
  const head = newPerson(rng, org, { title: t.head.title, selection: t.head.selection, age: rng.int(45, 66), professionId: t.head.occupation ?? null, levelId: t.head.levelId ?? null, years: rng.int(1, 8) });
  org.head = head.id;
  for (const d of t.departments) {
    const range = HEADCOUNT[org.size];
    const dept = { id: d.id, name: d.name, head: null, headcount: Math.round(rng.int(range[0], range[1]) / Math.max(1, t.departments.length)), seats: {} };
    const dh = newPerson(rng, org, { title: d.head.title, selection: d.head.selection, deptId: d.id, age: rng.int(40, 62) });
    dept.head = dh.id;
    org.departments[d.id] = dept;
  }
  // Government bodies are staffed for the population they serve (Staffing).
  applyStaffing(org);
  state.orgs.byId[org.id] = org;
  return org;
}

/** Organizations from older saves gain departments their type has added since. */
export function addMissingDepartments(state, org) {
  if (!org || org.business || org.closed) return org;
  if (org.staffing !== STAFFING_VERSION) applyStaffing(org);
  const t = orgType(org.typeId);
  let added = false;
  for (const d of t?.departments ?? []) {
    if (org.departments[d.id]) continue;
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
export function ensureHeads(state, org) {
  if (!org || org.business || org.closed) return;
  const t = orgType(org.typeId);
  if (!t) return;
  const rng = sideRng(state);
  if (!org.head && !org.playerHead && !org.officeHead) org.head = newPerson(rng, org, { title: t.head.title, selection: t.head.selection === 'internal' ? 'internal' : t.head.selection, age: rng.int(45, 64), years: 0 }).id;
  for (const d of t.departments) {
    const dept = org.departments[d.id];
    if (dept && !dept.head && !dept.playerHead && !dept.officeHead) dept.head = newPerson(rng, org, { title: d.head.title, selection: d.head.selection, deptId: d.id, age: rng.int(40, 62), years: 0 }).id;
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
    const holder = vacant(l.id) ? seatHolders(state, org, dept.id, job.professionId, l.id, 1, false)[0] : seatHolders(state, org, dept.id, job.professionId, l.id, 1, generate)[0];
    if (holder) chain.push(holder);
  }
  const t = orgType(org.typeId);
  // The player holds the organization's top job: they answer to whoever appointed or elected them.
  const isHead = t?.head.occupation === job.professionId && t.head.levelId === job.levelId;
  const deptHead = isHead ? null : personOf(org, dept.head);
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
    const reports = t.departments.map((d) => headOfDept(d.id)).filter(Boolean);
    return { org, dept, division: null, supervisor: overseer(t), manager: null, deptHead: null, orgHead: null, coworkers: [], reports, leads: 'org' };
  }
  const hdept = org.departments[h.deptId] ?? dept;
  const orgHead = personOf(org, org.head) ?? personOf(org, org.ceo) ?? ownerOf(org) ?? overseer(t);
  const coworkers = t.departments.filter((d) => d.id !== h.deptId).map((d) => headOfDept(d.id)).filter(Boolean).slice(0, 4);
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
