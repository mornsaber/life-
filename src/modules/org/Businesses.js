/**
 * Businesses as organizations.
 *
 * A business (business/BusinessEngine: the money side — P&L, debt, valuation)
 * is also an organization in state.orgs, built from the same parts as any
 * employer: departments staffed by careers from JobTrees, named people on
 * those careers' ladders, a chain of command. What differs is the top:
 *
 *   org.owner = { kind: 'player' | 'npc', name, pct }
 *   org.ceo   = personId | null — null while the owner runs it themselves
 *
 * The player's position is a real seat: Owner (running it), Owner & CEO,
 * or Owner & Chairman (a hired CEO/general manager runs it). Ownership and
 * employment are separate: you can own while working elsewhere.
 *
 * The structure grows with headcount — under 8 staff everyone reports to the
 * owner; then supervisors and an operations manager; at 50+ finance and HR
 * departments with executives; branches when you open new locations.
 *
 * NPC businesses compete in the same market (same business type, same
 * region), grow and fail; good employees sometimes leave to start rivals;
 * when you sell, the organization lives on under its new owner.
 */
import { clamp } from '../../core/Random.js';
import { REGIONS } from '../life/Regions.js';
import { BUSINESS_TYPES } from '../business/BusinessTypes.js';
import { getProfession } from '../career/JobTrees.js';
import { ladderFor, levelById } from '../career/Ladder.js';
import { orgType, sideRng, newPerson, seatHolders, supervises, personOf, initOrgs } from './Organizations.js';
import { departure, seat } from './Vacancies.js';
import { rememberDeparture } from './Churn.js';

const SURNAMES = ['Kowalski', 'Nguyen', 'Romero', 'Okafor', 'Lindqvist', 'Haddad', 'Brennan', 'Castillo', 'Murphy', 'Takahashi', 'Patel', 'Reyes'];

/** Employer-size bucket for a headcount (which ladder levels exist). */
export const sizeForHeadcount = (n) => (n < 10 ? 'small' : n < 50 ? 'medium' : n < 500 ? 'large' : 'enterprise');

/** Headcount at which the structure adds a layer. */
export const TIERS = { manager: 8, executives: 50 };

export const bizOrgId = (biz) => biz?.orgId ?? (biz ? `biz:${biz.id}` : null);
export const businessOrg = (state, biz) => state.orgs?.byId?.[bizOrgId(biz)] ?? null;

/** The career that staffs a department of this business. */
const occupationOf = (t, deptId) => t.departments.find((d) => d.id === deptId)?.occupations[0];

/** The player's seat at the top of their own business. */
export function ownerPosition(state, biz) {
  const org = businessOrg(state, biz);
  const ceo = personOf(org, org?.ceo);
  const big = (biz.staff?.headcount ?? 0) >= TIERS.executives;
  const title = biz.role === 'operator' ? (big ? 'Owner & CEO' : 'Owner') : ceo ? 'Owner & Chairman' : 'Owner (absentee)';
  const stake = biz.ownerPct < 1 ? `${Math.round(biz.ownerPct * 100)}% owner` : 'sole owner';
  return { title, stake, runsIt: biz.role === 'operator', ceo };
}

/** Create (or find) the organization for a business the player owns. */
export function ensureBusinessOrg(state, biz) {
  initOrgs(state);
  const existing = businessOrg(state, biz);
  if (existing) return existing;
  const regionId = biz.regionId ?? state.character.regionId;
  const t = orgType(`biz:${biz.typeId}`);
  const org = {
    id: `biz:${biz.id}`,
    typeId: `biz:${biz.typeId}`,
    name: biz.name,
    scope: 'market',
    sector: 'private',
    regionId,
    stateId: (REGIONS[regionId] ?? REGIONS.midcity).state,
    size: sizeForHeadcount(biz.staff.headcount),
    head: null,
    ceo: null,
    owner: { kind: 'player', name: `${state.character.firstName} ${state.character.lastName}`, pct: biz.ownerPct },
    business: { typeId: biz.typeId, reputation: biz.reputation },
    departments: {},
    branches: [],
    people: {},
    founded: biz.foundedAge ?? state.character.age,
  };
  for (const d of t.departments) if (!d.minStaff || biz.staff.headcount >= d.minStaff) org.departments[d.id] = { id: d.id, name: d.name, head: null, headcount: 0, seats: {} };
  state.orgs.byId[org.id] = org;
  biz.orgId = org.id;
  biz.regionId = regionId;
  syncBusinessOrg(state, biz);
  return org;
}

/** Working levels of a ladder for staff (not management) and the first supervisory level. */
function staffLevels(profession, size) {
  const ladder = ladderFor(profession, size);
  const work = ladder.filter((l) => !supervises(l) && !l.abilities.includes('exec'));
  return { entry: work[0] ?? ladder[0], skilled: work[Math.min(1, work.length - 1)] ?? ladder[0], lead: ladder.find((l) => supervises(l) && !l.abilities.includes('exec')) ?? null };
}

/**
 * Match the organization to the business: department headcounts, which
 * departments and layers exist, named staff (trimmed after layoffs), and a
 * hired chief executive when the owner isn't running it.
 */
export function syncBusinessOrg(state, biz) {
  const org = businessOrg(state, biz);
  if (!org) return null;
  const rng = sideRng(state);
  const t = orgType(org.typeId);
  const n = biz.staff.headcount;
  org.name = biz.name;
  org.size = sizeForHeadcount(n);
  org.owner.pct = biz.ownerPct;
  org.business.reputation = biz.reputation;
  // Departments appear as the business grows (and stay once created).
  for (const d of t.departments) if (!org.departments[d.id] && (!d.minStaff || n >= d.minStaff)) org.departments[d.id] = { id: d.id, name: d.name, head: null, headcount: 0, seats: {} };
  const depts = Object.values(org.departments).filter((d) => !d.branch);
  const branchStaff = org.branches.length ? Math.round(n * (org.branches.length / (org.branches.length + 1))) : 0;
  const main = n - branchStaff;
  const primary = depts[0];
  const others = depts.slice(1);
  const otherShare = others.length ? Math.min(0.35, 0.1 * others.length) : 0;
  primary.headcount = Math.max(0, Math.round(main * (1 - otherShare)));
  for (const d of others) d.headcount = Math.round((main * otherShare) / others.length);
  for (const b of org.branches) org.departments[b.deptId].headcount = Math.round(branchStaff / org.branches.length);

  // Layers: department heads once there's someone to lead; executives at scale.
  const managed = n >= TIERS.manager;
  for (const d of Object.values(org.departments)) {
    const def = t.departments.find((x) => x.id === d.id);
    const needsHead = d.branch || (managed && d.headcount >= 3) || (n >= TIERS.executives && def);
    if (needsHead && !personOf(org, d.head)) {
      const title = d.branch ? 'Branch Manager' : n >= TIERS.executives && def?.id === primary.id ? 'Chief Operating Officer' : def?.head.title ?? 'Manager';
      const occ = d.branch ? occupationOf(t, primary.id) : occupationOf(t, d.id);
      d.head = newPerson(rng, org, { title, deptId: d.id, professionId: occ ?? null, selection: 'hired', age: rng.int(32, 58), years: 0 }).id;
    }
    if (!needsHead && d.head && !d.branch) {
      delete org.people[d.head];
      d.head = null;
    }
  }

  // Named staff on the careers' own ladders.
  for (const d of Object.values(org.departments)) {
    const occ = d.branch ? occupationOf(t, primary.id) : occupationOf(t, d.id);
    const profession = occ && getProfession(occ);
    if (!profession) continue;
    const { entry, skilled, lead } = staffLevels(profession, org.size);
    const named = Math.min(6, d.headcount);
    const leads = lead && d.headcount >= TIERS.manager ? Math.min(3, Math.ceil(d.headcount / 12)) : 0;
    const plan = [[skilled, Math.ceil(named * 0.6)], [entry, Math.floor(named * 0.4)], ...(lead ? [[lead, leads]] : [])];
    for (const [level, count] of plan) {
      if (!level) continue;
      const have = (d.seats[occ]?.[level.id] ?? []).filter((id) => org.people[id]);
      if (have.length > count) {
        for (const id of have.slice(count)) delete org.people[id];
        d.seats[occ][level.id] = have.slice(0, count);
      } else if (count) {
        for (const p of seatHolders(state, org, d.id, occ, level.id, count)) if (p.selection === 'internal' && p.years > 0 && !p.hiredBy) { p.selection = 'hired'; p.hiredBy = 'founder'; }
      }
    }
  }

  // Who runs it day to day.
  if (biz.role === 'operator') {
    if (org.ceo) delete org.people[org.ceo];
    org.ceo = null;
  } else if (!personOf(org, org.ceo)) {
    org.ceo = newPerson(rng, org, { title: n >= TIERS.executives ? 'Chief Executive Officer' : 'General Manager', selection: 'hired', age: rng.int(38, 60), years: 0, performance: rng.int(50, 80) }).id;
  } else personOf(org, org.ceo).title = n >= TIERS.executives ? 'Chief Executive Officer' : 'General Manager';
  return org;
}

/** Everyone named in the business, grouped for display: [{ dept, head, people[] }]. */
export function businessRoster(state, biz) {
  const org = businessOrg(state, biz);
  if (!org) return [];
  return Object.values(org.departments).map((d) => {
    const people = Object.values(d.seats).flatMap((byLevel) => Object.values(byLevel).flat()).map((id) => org.people[id]).filter(Boolean);
    return { dept: d, head: personOf(org, d.head), people };
  });
}

/** A hired chief executive's skill stands in for the owner's when they don't run it. */
export function managerSkill(state, biz) {
  const ceo = personOf(businessOrg(state, biz), businessOrg(state, biz)?.ceo);
  return ceo ? clamp(10 + (ceo.performance - 62) / 4, 4, 18) : 10;
}

/* ------------------------------------------------------------------ */
/* Yearly life of the business organization                           */
/* ------------------------------------------------------------------ */

/**
 * Staff age, drift and leave; the best sometimes leave to start a rival.
 * Returns { left: [person], founders: [person] }.
 */
export function businessStaffTick(ctx, biz) {
  const { state } = ctx;
  const org = businessOrg(state, biz);
  if (!org) return { left: [], founders: [] };
  const rng = sideRng(state);
  const left = [];
  const founders = [];
  const moraleDrag = (55 - (biz.staff.morale ?? 55)) / 400;
  for (const p of Object.values(org.people)) {
    if (p.id === org.ceo) continue;
    p.age += 1;
    p.years += 1;
    p.performance = Math.round(clamp(p.performance + (p.rel - 50) / 30 + rng.float(-5, 5), 15, 98));
    let why = departure(rng, p);
    if (!why && rng.chance(Math.max(0, moraleDrag))) why = 'quit over working conditions';
    if (!why && p.performance >= 70 && p.years >= 5 && p.age < 55 && rng.chance(0.04)) why = 'left to start a competing business';
    if (!why) continue;
    if (why.startsWith('was promoted')) why = 'took a better offer elsewhere';
    const dept = org.departments[p.deptId];
    if (dept) {
      if (dept.head === p.id) dept.head = null;
      for (const byLevel of Object.values(dept.seats)) for (const k of Object.keys(byLevel)) byLevel[k] = byLevel[k].filter((id) => id !== p.id);
    }
    rememberDeparture(state, org, p, why);
    delete org.people[p.id];
    left.push({ ...p, why });
    if (why === 'left to start a competing business') founders.push(p);
  }
  for (const p of founders) foundRival(ctx, biz, p);
  if (left.length) {
    biz.staff.morale = Math.round(clamp(biz.staff.morale - left.length, 0, 100));
    const named = left.slice(0, 3).map((p) => `${p.name} (${p.title}) ${p.why}`).join('; ');
    ctx.log(`${biz.name} staff changes: ${named}${left.length > 3 ? `, and ${left.length - 3} more` : ''}.${biz.staff.delegation?.hiring || biz.role !== 'operator' ? ' Replacements were hired.' : ' You hired replacements.'}`, '🪑');
  }
  return { left, founders };
}

/* ------------------------------------------------------------------ */
/* The market: NPC businesses                                          */
/* ------------------------------------------------------------------ */

/** NPC businesses of the same type in the same region. */
export function competitorsOf(state, biz) {
  const org = businessOrg(state, biz);
  const regionId = org?.regionId ?? state.character.regionId;
  return Object.values(state.orgs?.byId ?? {}).filter((o) => o.typeId === `biz:${biz.typeId}` && o.regionId === regionId && o.id !== org?.id && o.owner?.kind !== 'player' && !o.closed);
}

function npcBusiness(state, typeId, regionId, { name, founder = null, reputation } = {}) {
  initOrgs(state);
  const rng = sideRng(state);
  const type = BUSINESS_TYPES[typeId];
  const id = rng.id('nbz_');
  const owner = founder?.name ?? `${rng.pick(['Dana', 'Luis', 'Priya', 'Sam', 'Grace', 'Omar', 'Hannah', 'Victor'])} ${rng.pick(SURNAMES)}`;
  const org = {
    id: `biz:${id}`,
    typeId: `biz:${typeId}`,
    name: name ?? `${owner.split(' ')[1]} ${type.name}`,
    scope: 'market',
    sector: 'private',
    regionId,
    stateId: (REGIONS[regionId] ?? REGIONS.midcity).state,
    size: 'small',
    head: null,
    ceo: null,
    owner: { kind: 'npc', name: owner, pct: 1 },
    business: { typeId, reputation: reputation ?? rng.int(35, 70), staff: Math.max(1, Math.round(type.staff * rng.float(0.5, 1.6))), years: founder ? 0 : rng.int(2, 25), founderId: founder?.id ?? null },
    departments: {},
    branches: [],
    people: {},
    founded: state.character.age,
  };
  const t = orgType(org.typeId);
  for (const d of t.departments) if (!d.minStaff || org.business.staff >= d.minStaff) org.departments[d.id] = { id: d.id, name: d.name, head: null, headcount: 0, seats: {} };
  state.orgs.byId[org.id] = org;
  return org;
}

/** Make sure a market has a few established competitors when you open. */
export function seedCompetitors(state, biz) {
  const regionId = businessOrg(state, biz)?.regionId ?? state.character.regionId;
  const rng = sideRng(state);
  const want = BUSINESS_TYPES[biz.typeId]?.startup ? 2 : rng.int(2, 4);
  const have = competitorsOf(state, biz).length;
  for (let i = have; i < want; i++) npcBusiness(state, biz.typeId, regionId);
  return competitorsOf(state, biz);
}

/** A former employee opens a rival nearby. */
function foundRival(ctx, biz, person) {
  const org = businessOrg(ctx.state, biz);
  const rival = npcBusiness(ctx.state, biz.typeId, org?.regionId ?? ctx.state.character.regionId, { founder: person, name: `${person.name.split(' ')[1]} ${BUSINESS_TYPES[biz.typeId].name}`, reputation: Math.round(clamp(person.performance * 0.7, 30, 70)) });
  ctx.log(`${person.name}, your ${person.title.toLowerCase()}, left to open ${rival.name} — a competitor.`, '🏁', 'warn');
  return rival;
}

/**
 * Competitive pressure on demand: your reputation against the field and how
 * crowded it is. About 1.0 for an average business in an average market.
 */
export function competitionFactor(state, biz) {
  const rivals = competitorsOf(state, biz);
  if (!rivals.length) return 1.05;
  const avg = rivals.reduce((s, o) => s + (o.business.reputation ?? 50), 0) / rivals.length;
  return clamp(1 + ((biz.reputation ?? 50) - avg) / 250 - (rivals.length - 3) * 0.02, 0.85, 1.12);
}

/** NPC businesses grow, shrink, fail and open each year. Returns notable lines. */
export function marketTick(ctx, biz) {
  const { state } = ctx;
  const rng = sideRng(state);
  const phase = state.economy?.phase ?? 'expansion';
  const failBase = phase === 'recession' ? 0.09 : 0.04;
  for (const o of competitorsOf(state, biz)) {
    const b = o.business;
    b.years = (b.years ?? 0) + 1;
    b.reputation = Math.round(clamp(b.reputation + rng.int(-5, 5), 10, 95));
    b.staff = Math.max(1, Math.round(b.staff * (1 + (b.reputation - 50) / 300 + rng.float(-0.08, 0.1))));
    o.size = sizeForHeadcount(b.staff);
    const fail = failBase * (b.years <= 3 ? 2 : 1) * (b.reputation < 35 ? 2 : 1);
    if (rng.chance(fail)) {
      o.closed = state.character.age;
      ctx.log(`${o.name}, a competitor of ${biz.name}, closed its doors.`, '🔒');
    }
  }
  // Someone new opens now and then.
  if (rng.chance(phase === 'recession' ? 0.04 : 0.1)) {
    const o = npcBusiness(state, biz.typeId, businessOrg(state, biz)?.regionId ?? state.character.regionId);
    ctx.log(`A new competitor opened: ${o.name}.`, '🏁');
  }
}

/* ------------------------------------------------------------------ */
/* Branches                                                            */
/* ------------------------------------------------------------------ */

/** A new location becomes a branch department with its own manager. */
export function openBranch(state, biz, regionId) {
  const org = ensureBusinessOrg(state, biz);
  const city = (REGIONS[regionId] ?? REGIONS.midcity).name.split(',')[0];
  const deptId = `branch${org.branches.length + 2}`;
  org.departments[deptId] = { id: deptId, name: `${city} Branch`, head: null, headcount: 0, seats: {}, branch: true, regionId };
  org.branches.push({ deptId, regionId, city, openedAge: state.character.age });
  syncBusinessOrg(state, biz);
  return org.departments[deptId];
}

export function closeBranch(state, biz, deptId) {
  const org = businessOrg(state, biz);
  const dept = org?.departments[deptId];
  if (!dept?.branch) return false;
  for (const id of [dept.head, ...Object.values(dept.seats).flatMap((x) => Object.values(x).flat())]) if (id) delete org.people[id];
  delete org.departments[deptId];
  org.branches = org.branches.filter((b) => b.deptId !== deptId);
  return true;
}

/* ------------------------------------------------------------------ */
/* Exits                                                               */
/* ------------------------------------------------------------------ */

/**
 * The player's stake ends. A sale or transfer leaves the organization
 * running under its new owner (its employees keep their jobs); a closure
 * dissolves it.
 */
export function releaseBusinessOrg(state, biz, { closed = false, buyer = null } = {}) {
  const org = businessOrg(state, biz);
  if (!org) return null;
  if (closed) {
    org.closed = state.character.age;
    org.people = {};
    for (const d of Object.values(org.departments)) d.seats = {};
    return org;
  }
  const rng = sideRng(state);
  const name = buyer ?? `${rng.pick(['Summit', 'Keystone', 'Atlas', 'Pinnacle', 'Harbor'])} ${rng.pick(['Holdings', 'Partners', 'Services Group', 'Capital'])}`;
  org.owner = { kind: 'npc', name, pct: 1 };
  org.business = { ...org.business, staff: biz.staff.headcount, years: biz.years, reputation: biz.reputation };
  if (!personOf(org, org.ceo)) org.ceo = newPerson(rng, org, { title: 'General Manager', selection: 'hired', age: rng.int(38, 58), years: 0 }).id;
  return org;
}

/** Businesses you've owned that still exist under other owners (for the history view). */
export function formerBusinesses(state) {
  return (state.business?.history ?? []).map((h) => ({ ...h, org: h.orgId ? state.orgs?.byId?.[h.orgId] ?? null : null }));
}

export { levelById };
