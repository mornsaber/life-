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
import { randomName } from '../../core/State.js';
import { rivalsTick, effectiveReputation, underPriceWar, rivalProfile } from '../business/Rivals.js';
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
  const post = biz.role === 'executive' ? { ceo: 'Owner & Chief Executive Officer', president: 'Owner, President & COO', chair: 'Owner & Executive Chair' }[biz.ownerPost?.post] : null;
  const title = post ?? (biz.role === 'operator' ? (big ? 'Owner & CEO' : 'Owner') : ceo ? 'Owner & Chairman' : 'Owner (absentee)');
  const stake = biz.ownerPct < 1 ? `${Math.round(biz.ownerPct * 100)}% owner` : 'sole owner';
  return { title, stake, runsIt: biz.role === 'operator' || (biz.role === 'executive' && biz.ownerPost?.post !== 'chair'), ceo };
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
  // People you hired into a specific department stay counted there.
  const extra = biz.staff.extra ?? {};
  for (const id of Object.keys(extra)) if (!org.departments[id] || extra[id] <= 0) delete extra[id];
  let extraTotal = Object.values(extra).reduce((a, b) => a + b, 0);
  if (extraTotal > n - branchStaff) {
    const f = (n - branchStaff) / extraTotal;
    for (const id of Object.keys(extra)) extra[id] = Math.floor(extra[id] * f);
    extraTotal = Object.values(extra).reduce((a, b) => a + b, 0);
  }
  const main = n - branchStaff - extraTotal;
  const primary = depts[0];
  const others = depts.slice(1);
  const otherShare = others.length ? Math.min(0.35, 0.1 * others.length) : 0;
  // Every support department has at least one person once there are enough staff to go around.
  const each = Math.round((main * otherShare) / Math.max(1, others.length));
  for (const d of others) d.headcount = main >= depts.length * 2 ? Math.max(1, each) : each;
  primary.headcount = Math.max(0, main - others.reduce((sum, d) => sum + d.headcount, 0));
  for (const d of depts) d.headcount += extra[d.id] ?? 0;
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
    const picks = Object.values(org.people).filter((p) => p.handPicked && p.deptId === d.id).length;
    // People you promoted or demoted onto rungs the plan doesn't staff still count toward the department.
    const planned = new Set([entry?.id, skilled?.id, lead?.id].filter(Boolean));
    const offPlan = Object.entries(d.seats[occ] ?? {}).filter(([lvl]) => !planned.has(lvl)).reduce((n, [, ids]) => n + ids.filter((id) => org.people[id]).length, 0);
    // The head is one of the department's people, not an extra.
    const named = Math.max(0, Math.min(6 + picks, d.headcount - (personOf(org, d.head) ? 1 : 0) - offPlan));
    const leads = lead && d.headcount >= TIERS.manager ? Math.min(3, Math.ceil(d.headcount / 12)) : 0;
    const plan = [[skilled, Math.ceil(named * 0.6)], [entry, Math.floor(named * 0.4)], ...(lead ? [[lead, leads]] : [])];
    for (const [level, count] of plan) {
      if (!level) continue;
      // People you picked yourself are the last to go.
      const kept = (p) => (p.handPicked || p.placed ? 1 : 0);
      const have = (d.seats[occ]?.[level.id] ?? []).filter((id) => org.people[id]).sort((a, b) => kept(org.people[b]) - kept(org.people[a]));
      if (have.length > count) {
        const leaders = new Set([org.ceo, ...Object.values(org.departments).map((x) => x.head)]);
        const keep = have.filter((id, i) => i < count || leaders.has(id) || org.people[id].handPicked || org.people[id].placed);
        for (const id of have) if (!keep.includes(id)) delete org.people[id];
        d.seats[occ][level.id] = keep;
      } else if (count) {
        for (const p of seatHolders(state, org, d.id, occ, level.id, count)) if (p.selection === 'internal' && p.years > 0 && !p.hiredBy) { p.selection = 'hired'; p.hiredBy = 'founder'; }
      }
    }
  }

  // Who runs it day to day.
  // You at the top (running it yourself, or as CEO/President of your own company): no hired chief executive.
  if (biz.role === 'operator' || (biz.role === 'executive' && biz.ownerPost?.post !== 'chair')) {
    if (org.ceo) delete org.people[org.ceo];
    org.ceo = null;
  } else if (!personOf(org, org.ceo)) {
    org.ceo = newPerson(rng, org, { title: n >= TIERS.executives ? 'Chief Executive Officer' : 'General Manager', selection: 'hired', age: rng.int(38, 60), years: 0, performance: rng.int(50, 80) }).id;
  } else personOf(org, org.ceo).title = n >= TIERS.executives ? 'Chief Executive Officer' : 'General Manager';
  return org;
}

/**
 * Three people applying for a job in a department: a green, cheap hire; a
 * solid one at the going rate; and a star who wants top dollar.
 */
export function recruitCandidates(state, biz, deptId) {
  const org = businessOrg(state, biz);
  const d = org?.departments[deptId];
  if (!d) return [];
  const t = orgType(org.typeId);
  const primary = Object.values(org.departments).find((x) => !x.branch);
  const occ = d.branch ? occupationOf(t, primary?.id) : occupationOf(t, deptId);
  const profession = occ && getProfession(occ);
  if (!profession) return [];
  const { entry, skilled } = staffLevels(profession, org.size);
  const rng = sideRng(state);
  const make = (level, perf, years, wage, pitch) => {
    const gender = rng.pick(['male', 'female']);
    const n = randomName(rng, gender);
    return { name: `${n.firstName} ${n.lastName}`, gender, age: Math.min(62, 21 + years + rng.int(0, 8)), years, performance: perf, professionId: occ, levelId: level.id, title: level.title, wage, pitch };
  };
  return [
    make(entry, rng.int(42, 62), rng.int(0, 1), 0.85, 'Just finished training: cheap and eager, still learning'),
    make(skilled, rng.int(58, 74), rng.int(3, 8), 1, 'Solid and experienced; asks the going rate'),
    make(skilled, rng.int(74, 92), rng.int(8, 20), 1.3, 'A star from a competitor — wants top dollar'),
  ];
}

/** Hire a candidate into a department: one more on staff, and a named person on the roster. */
export function hireCandidate(state, biz, deptId, c) {
  const org = businessOrg(state, biz);
  const d = org?.departments[deptId];
  if (!d || !c) return null;
  const p = newPerson(sideRng(state), org, { name: c.name, gender: c.gender, age: c.age, years: 0, performance: c.performance, professionId: c.professionId, levelId: c.levelId, title: c.title, deptId, selection: 'hired', hiredBy: 'owner', handPicked: true, rel: 62 });
  ((d.seats[c.professionId] ??= {})[c.levelId] ??= []).unshift(p.id);
  const s = biz.staff;
  s.headcount += 1;
  s.extra = { ...(s.extra ?? {}), [deptId]: (s.extra?.[deptId] ?? 0) + 1 };
  // Pay and skill average into the team's.
  s.costPremium = Math.round(((s.costPremium ?? 0) + (c.wage - 1) / s.headcount) * 10000) / 10000;
  s.productivity = Math.round(clamp((s.productivity ?? 55) + (c.performance - (s.productivity ?? 55)) / s.headcount, 0, 100));
  syncBusinessOrg(state, biz);
  return p;
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
/**
 * How well hired management runs the place: the CEO or general manager's
 * ability, plus the systems a bigger company can afford (training, process,
 * district managers). A good team at a sizable chain runs it about as well
 * as a seasoned owner-operator.
 */
export function managerSkill(state, biz) {
  const ceo = personOf(businessOrg(state, biz), businessOrg(state, biz)?.ceo);
  const ability = ceo ? clamp(32 + (ceo.performance - 62) / 3, 18, 44) : 28;
  const systems = Math.min(15, 3 * ((biz.scale ?? 1) - 1));
  return ability + systems;
}

/** How many locations one market can support before they eat each other's customers. */
export const MARKET_ROOM = { Rural: 2, 'Small town': 3, 'Mid-size city': 6, 'Sun Belt metro': 8, 'Coastal metro': 8, 'Mountain metro': 8, 'Capital region': 10, 'Major metro': 12, 'High-cost metro': 14 };
export const marketRoom = (regionId) => MARKET_ROOM[REGIONS[regionId]?.type] ?? 6;

/** Your locations by city: the main location plus each branch. */
export function locationsByRegion(state, biz) {
  const org = businessOrg(state, biz);
  const home = org?.regionId ?? state.character.regionId;
  const out = { [home]: 1 };
  for (const b of org?.branches ?? []) {
    const r = org.departments[b.deptId]?.regionId ?? b.regionId ?? home;
    out[r] = (out[r] ?? 0) + 1;
  }
  const counted = Object.values(out).reduce((a, n) => a + n, 0);
  // Locations not opened yet (a forecast of the next one) go where you plan to open.
  const next = biz.expandTo && REGIONS[biz.expandTo] ? biz.expandTo : home;
  if (counted < (biz.scale ?? 1)) out[next] = (out[next] ?? 0) + (biz.scale ?? 1) - counted;
  return out;
}

/** Locations that pull their full weight: ones past a market's room cannibalize each other. */
export function effectiveLocations(state, biz) {
  if (!biz.orgId || !state.orgs?.byId?.[biz.orgId]) return biz.scale ?? 1;
  let e = 0;
  for (const [r, n] of Object.entries(locationsByRegion(state, biz))) {
    const cap = marketRoom(r);
    e += n <= cap ? n : cap + (n - cap) * 0.35;
  }
  return e;
}

/** The city a growing chain should open in next: home first, then the biggest markets with room. */
export function nextMarket(state, biz) {
  const have = locationsByRegion(state, biz);
  const home = businessOrg(state, biz)?.regionId ?? state.character.regionId;
  if ((have[home] ?? 0) < marketRoom(home)) return home;
  const homeState = REGIONS[home]?.state;
  const open = Object.values(REGIONS).filter((r) => (have[r.id] ?? 0) < marketRoom(r.id))
    .sort((a, b) => (b.state === homeState) - (a.state === homeState) || marketRoom(b.id) - marketRoom(a.id));
  return open[0]?.id ?? home;
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
  // Promote from within: the best performer one rung down steps into a senior seat that opened.
  const promoted = [];
  for (const gone of left) {
    const dept = org.departments[gone.deptId];
    const profession = gone.professionId && getProfession(gone.professionId);
    if (!dept || !profession || !gone.levelId) continue;
    const ladder = ladderFor(profession, org.size);
    const idx = ladder.findIndex((l) => l.id === gone.levelId);
    const below = ladder[idx - 1];
    if (idx <= 0 || !below) continue;
    const pick = (dept.seats[gone.professionId]?.[below.id] ?? []).map((id) => org.people[id]).filter((p) => p && p.years >= 2).sort((a, b) => b.performance - a.performance)[0];
    if (!pick || pick.performance < 60) continue;
    seat(org, dept.id, gone.professionId, gone.levelId, pick, ladder[idx].title);
    pick.rel = Math.min(100, (pick.rel ?? 50) + 8);
    promoted.push(`${pick.name} to ${ladder[idx].title}`);
  }
  if (promoted.length) ctx.log(`${biz.name} promoted from within: ${promoted.slice(0, 3).join('; ')}${promoted.length > 3 ? `, and ${promoted.length - 3} more` : ''}.`, '⬆️', 'good');
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
/** Rivals in every city where you have a location. */
export function competitorsOf(state, biz) {
  const org = businessOrg(state, biz);
  const home = org?.regionId ?? state.character.regionId;
  const cities = new Set([home, ...(org?.branches ?? []).map((b) => b.regionId).filter(Boolean)]);
  return Object.values(state.orgs?.byId ?? {}).filter((o) => o.typeId === `biz:${biz.typeId}` && cities.has(o.regionId) && o.id !== org?.id && o.owner?.kind !== 'player' && !o.closed);
}

export function npcBusiness(state, typeId, regionId, { name, founder = null, reputation } = {}) {
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
  const age = state.character.age;
  // Rivals pull customers by reputation, size and price; your own prices and locations count elsewhere.
  const avg = rivals.reduce((s, o) => s + effectiveReputation(o.business, age), 0) / rivals.length;
  // Crowding is per market: rival locations per city you're in.
  const org = businessOrg(state, biz);
  const cities = new Set([org?.regionId ?? state.character.regionId, ...(org?.branches ?? []).map((b) => b.regionId).filter(Boolean)]).size;
  const locations = rivals.reduce((s, o) => s + (o.business.scale ?? 1), 0) / cities;
  const priceWar = underPriceWar(state, biz, rivals) ? 0.04 : 0;
  return clamp(1 + ((biz.reputation ?? 50) - avg) / 250 - (locations - 3) * 0.02 - priceWar, 0.8, 1.12);
}

/**
 * NPC businesses everywhere grow, shrink and fail once a year, whether or not
 * you own a competitor. If one you work for closes, you're laid off.
 */
export function npcBusinessesTick(ctx) {
  const { state } = ctx;
  const age = state.character.age;
  const rng = sideRng(state);
  const phase = state.economy?.phase ?? 'expansion';
  const failBase = phase === 'recession' ? 0.09 : 0.04;
  const mine = state.business?.current;
  const myRivals = new Set(mine ? competitorsOf(state, mine).map((o) => o.id) : []);
  for (const o of Object.values(state.orgs?.byId ?? {})) {
    if (!o.business || o.closed || o.owner?.kind !== 'npc' || o.business.tickedAge === age) continue;
    const b = o.business;
    b.tickedAge = age;
    b.years = (b.years ?? 0) + 1;
    b.reputation = Math.round(clamp((b.reputation ?? 50) + rng.int(-5, 5), 10, 95));
    b.staff = Math.max(1, Math.round((b.staff ?? 3) * (1 + (b.reputation - 50) / 300 + rng.float(-0.08, 0.1))));
    // Struggling chains close locations; price wars end.
    if ((b.scale ?? 1) > 1 && b.reputation < 40 && rng.chance(0.25)) b.scale -= 1;
    if (b.priceWarUntil != null && b.priceWarUntil < age && b.strategy !== 'discounter') b.price = 'standard';
    o.size = sizeForHeadcount(b.staff);
    const fail = failBase * (b.years <= 3 ? 2 : 1) * (b.reputation < 35 ? 2 : 1);
    if (!rng.chance(fail)) continue;
    dissolve(o, age);
    const job = state.career.job;
    if (job?.employer?.orgId === o.id) {
      ctx.log(`${o.name} went out of business.`, '🔒', 'bad');
      ctx.emit('career:resign', { reason: `Laid off — ${o.name} went out of business` });
    } else if (myRivals.has(o.id)) ctx.log(`${o.name}, a competitor of ${mine.name}, closed its doors.`, '🔒');
  }
}

/** Your market each year: the NPC economy moves, and now and then a new rival opens. */
export function marketTick(ctx, biz) {
  const { state } = ctx;
  npcBusinessesTick(ctx);
  const rng = sideRng(state);
  const regionId = businessOrg(state, biz)?.regionId ?? state.character.regionId;
  if (rng.chance(state.economy?.phase === 'recession' ? 0.04 : 0.1)) {
    const o = npcBusiness(state, biz.typeId, regionId);
    o.business.tickedAge = state.character.age;
    rivalProfile(rng, o);
    ctx.log(`A new competitor opened: ${o.name} (${o.business.strategy === 'discounter' ? 'a discounter' : o.business.strategy === 'premium' ? 'going upscale' : 'hungry for customers'}).`, '🏁');
  }
  // Nobody left to compete with? Fat margins draw newcomers fast.
  const left = competitorsOf(state, biz).length;
  if (left < 2 && rng.chance(left === 0 ? 0.6 : 0.3)) {
    const o = npcBusiness(state, biz.typeId, regionId, { reputation: rng.int(40, 65) });
    o.business.tickedAge = state.character.age;
    rivalProfile(rng, o);
    if (rng.chance(0.3)) Object.assign(o.business, { strategy: 'discounter', price: 'budget' });
    ctx.log(left === 0 ? `With the market to yourself, your margins drew a newcomer: ${o.name} opened to take a piece of it.` : `Seeing little competition, ${o.name} opened to take on ${biz.name}.`, '🏁', 'warn');
  }
  // Every city you've moved into has local businesses of its own.
  const org = businessOrg(state, biz);
  for (const city of new Set((org?.branches ?? []).map((b) => b.regionId).filter((r) => r && r !== regionId))) {
    const local = Object.values(state.orgs.byId).filter((o) => o.typeId === `biz:${biz.typeId}` && o.regionId === city && o.owner?.kind !== 'player' && !o.closed).length;
    if (local < 2 && rng.chance(local === 0 ? 0.7 : 0.25)) {
      const o = npcBusiness(state, biz.typeId, city, { reputation: rng.int(40, 70) });
      o.business.tickedAge = state.character.age;
      rivalProfile(rng, o);
    }
  }
  // Rivals act: price wars, expansions, poaching, ad blitzes, buyouts.
  rivalsTick(ctx, biz, competitorsOf(state, biz), { rng, npc: () => npcBusiness(state, biz.typeId, regionId) });
}

/* ------------------------------------------------------------------ */
/* Branches                                                            */
/* ------------------------------------------------------------------ */

/** A new location becomes a branch department with its own manager. */
export function openBranch(state, biz, regionId) {
  const org = ensureBusinessOrg(state, biz);
  const city = (REGIONS[regionId] ?? REGIONS.midcity).name.split(',')[0];
  // Branch ids are never reused (closed branches leave gaps).
  org.nextBranch = Math.max(org.nextBranch ?? 2, org.branches.length + 2);
  const deptId = `branch${org.nextBranch}`;
  org.nextBranch += 1;
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
    dissolve(org, state.character.age);
    return org;
  }
  const rng = sideRng(state);
  const name = buyer ?? `${rng.pick(['Summit', 'Keystone', 'Atlas', 'Pinnacle', 'Harbor'])} ${rng.pick(['Holdings', 'Partners', 'Services Group', 'Capital'])}`;
  org.owner = { kind: 'npc', name, pct: 1 };
  org.business = { ...org.business, staff: biz.staff.headcount, years: biz.years, reputation: biz.reputation };
  if (!personOf(org, org.ceo)) org.ceo = newPerson(rng, org, { title: 'General Manager', selection: 'hired', age: rng.int(38, 58), years: 0 }).id;
  return org;
}

/** A closed organization employs nobody: no people, no seats, no heads. */
export function dissolve(org, age) {
  org.closed = age;
  org.people = {};
  org.ceo = null;
  org.head = null;
  for (const d of Object.values(org.departments)) {
    d.seats = {};
    d.head = null;
  }
}

/** Businesses you've owned that still exist under other owners (for the history view). */
export function formerBusinesses(state) {
  return (state.business?.history ?? []).map((h) => ({ ...h, org: h.orgId ? state.orgs?.byId?.[h.orgId] ?? null : null }));
}

export { levelById };
