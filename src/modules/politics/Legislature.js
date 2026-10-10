/**
 * Legislatures: your city council, your state's house and senate, and
 * Congress. Each body has seats split between a labor bloc and a business
 * bloc, named leaders, committees and staff. Every year bills come up — to
 * raise the minimum wage, pass right-to-work or card-check, change taxes,
 * fund public works, give public employees a raise — and the votes, the
 * lobbying (unions' clout, business money) and the executive's signature or
 * veto decide whether they become law (Laws.js), which in turn changes
 * paychecks, unions and businesses across the game.
 *
 * Win a seat (city council, state representative or senator, U.S.
 * representative or senator) and you're in it: sponsor bills, cast the
 * deciding vote in a close one, climb from committee chair to majority
 * leader and the presiding chair, and hire the staff who make an office
 * work. As a mayor or governor, bills land on your desk to sign or veto.
 * Outside the chamber, a business owner can lobby with money and a union
 * officer with the union's clout.
 *
 * state.legislature = { seed, bodies: { [id]: body }, seat: { bodyId, caucus, post, committee, staff[], record[] } | null, lobby: {} }
 * body = { id, level, where, name, seats, labor, leaders: { presiding, majority, minority }, staffCount,
 *          nextElection, bills: [bill], history: [{ age, text }] }
 * bill = { id, lawId, direction, value, sponsor, stage, yes, no, push, outcome }
 */
import { Random, clamp } from '../../core/Random.js';
import { randomName, yearlyCount, bumpYearly } from '../../core/State.js';
import { REGIONS } from '../life/Regions.js';
import { STATES } from '../life/States.js';
import { OFFICES } from './Offices.js';
import { LEGISLATURES } from './NationalOffices.js';
import { LAWS, levelValue, lawValue, enact, proposedValue, favorsLabor, describeValue, ensureLaws } from './Laws.js';
import { unionsInState, myUnion, isOfficer, unionPower } from '../career/LaborUnions.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;

/** The bodies above a place, smallest first. */
export const BODY_DEFS = {
  council: { level: 'city', name: (w) => `${REGIONS[w]?.name.split(',')[0] ?? 'City'} City Council`, seats: () => 9, presiding: 'Council President', office: 'cityCouncil', executive: 'Mayor', staffCount: 25, allowance: 1 },
  house: { level: 'state', name: (w) => `${STATES[w]?.name ?? w} House of Representatives`, seats: () => 100, presiding: 'Speaker of the House', office: 'stateRep', executive: 'Governor', staffCount: 420, allowance: 3 },
  senate: { level: 'state', name: (w) => `${STATES[w]?.name ?? w} State Senate`, seats: () => 40, presiding: 'Senate President', office: 'stateSenator', executive: 'Governor', staffCount: 260, allowance: 4 },
  usHouse: { level: 'federal', name: () => 'U.S. House of Representatives', seats: () => 435, presiding: 'Speaker of the House', office: 'usRep', executive: 'President', staffCount: 9000, allowance: 14 },
  usSenate: { level: 'federal', name: () => 'U.S. Senate', seats: () => 100, presiding: 'Senate Majority Leader', office: 'usSenator', executive: 'President', staffCount: 6000, allowance: 20 },
};
/** Bicameral legislatures: a bill passes one chamber, then the other. */
const CHAMBERS = { city: ['council'], state: ['house', 'senate'], federal: ['usHouse', 'usSenate'] };
const LEVELS = ['city', 'state', 'federal'];

// Other countries' assemblies and parliaments, from NationalOffices.LEGISLATURES.
const extraOffices = [];
for (const [cc, L] of Object.entries(LEGISLATURES)) {
  if (L.prov) {
    BODY_DEFS[`prov_${cc}`] = { level: 'state', country: cc, name: (w) => L.prov.name(STATES[w]?.name ?? w), seats: () => L.prov.seats, presiding: L.prov.presiding, office: typeof L.prov.office === 'string' ? L.prov.office : null, executive: L.prov.exec, execOffice: L.prov.execOffice, veto: L.prov.veto, staffCount: 150, allowance: 3 };
    if (typeof L.prov.office === 'function') for (const st of Object.keys(STATES).concat(Object.getOwnPropertyNames(STATES))) { const o = L.prov.office(st); if (o) extraOffices.push([o, `prov_${cc}`]); }
  }
  BODY_DEFS[`lower_${cc}`] = { level: 'federal', country: cc, name: () => L.lower.name, seats: () => L.lower.seats, presiding: L.lower.presiding, office: L.lower.office, executive: L.exec, execOffice: L.execOffice, veto: L.veto, staffCount: 3000, allowance: 10 };
  if (L.upper) BODY_DEFS[`upper_${cc}`] = { level: 'federal', country: cc, name: () => L.upper.name, seats: () => L.upper.seats, presiding: L.upper.presiding, office: L.upper.office, executive: L.exec, execOffice: L.execOffice, veto: L.veto, staffCount: 1500, allowance: 10 };
}
export const SEAT_OFFICES = Object.fromEntries([...Object.entries(BODY_DEFS).filter(([, d]) => d.office).map(([k, d]) => [d.office, k]), ...extraOffices]);

/** The chambers a bill passes at a level, in a place (a city, a state or province, or a country). */
export function chambersFor(level, where) {
  if (level === 'city') return CHAMBERS.city;
  const cc = level === 'state' ? STATES[where]?.country ?? 'US' : where ?? 'US';
  if (cc === 'US') return CHAMBERS[level];
  const L = LEGISLATURES[cc];
  if (!L) return [];
  if (level === 'state') return L.prov && !L.prov.none?.includes(where) ? [`prov_${cc}`] : [];
  return [`lower_${cc}`, ...(L.upper ? [`upper_${cc}`] : [])];
}
/** Laws that only exist in US law (union-security and card-check rules), and the national minimum wage abroad (set by province). */
export const lawHere = (lawId, level, where) => {
  const cc = level === 'state' ? STATES[where]?.country ?? 'US' : level === 'federal' ? where ?? 'US' : REGIONS[where]?.country ?? 'US';
  if (cc === 'US') return true;
  if (['rightToWork', 'cardCheck'].includes(lawId)) return false;
  return !(level === 'federal' && lawId === 'minWage');
};

export const COMMITTEES = {
  labor: { name: 'Labor & Workforce', laws: ['minWage', 'rightToWork', 'cardCheck', 'paidLeave', 'publicBargaining', 'workplaceSafety', 'nonCompeteBan'] },
  commerce: { name: 'Commerce & Business', laws: ['businessTax', 'corporateRate', 'smallBizCredit', 'antitrust', 'licensing', 'rentControl', 'environmental', 'zoning'] },
  appropriations: { name: 'Appropriations & Revenue', laws: ['infrastructure', 'publicPay', 'stateIncomeTax'] },
  judiciary: { name: 'Judiciary & Public Safety', laws: ['cannabis'] },
};
export const committeeOf = (lawId) => Object.keys(COMMITTEES).find((k) => COMMITTEES[k].laws.includes(lawId)) ?? 'commerce';

export const CAUCUSES = {
  labor: { name: 'Labor bloc', icon: '✊' },
  business: { name: 'Business bloc', icon: '💼' },
};

export const POSTS = {
  chair: { title: 'Committee Chair', pay: 0.08, push: 0.03, minTerms: 2, majority: true },
  whip: { title: 'Whip', pay: 0.1, push: 0.03, minTerms: 2, majority: false },
  majority: { title: 'Majority Leader', pay: 0.2, push: 0.05, minTerms: 3, majority: true },
  presiding: { title: 'Presiding Officer', pay: 0.3, push: 0.07, minTerms: 4, majority: true },
};

export const STAFF_ROLES = {
  chiefOfStaff: { title: 'Chief of Staff', desc: 'One more legislative action a year.' },
  legislativeDirector: { title: 'Legislative Director', desc: 'Your bills draw more votes.' },
  communications: { title: 'Communications Director', desc: 'Approval and name recognition.' },
  caseworker: { title: 'Constituent Caseworker', desc: 'Approval at home.' },
};
export const SPONSOR_PER_YEAR = 2;

/* ------------------------------------------------------------------ */
/* Bodies                                                              */
/* ------------------------------------------------------------------ */

export function legRng(state) {
  state.legislature ??= { seed: 11, bodies: {}, seat: null };
  state.legislature.seed = ((state.legislature.seed ?? 11) * 22695477 + 1) >>> 0;
  return new Random(state.legislature.seed);
}
const personName = (rng) => {
  const n = randomName(rng, rng.pick(['male', 'female']));
  return `${n.firstName} ${n.lastName}`;
};
const homeState = (state) => (REGIONS[state.character.regionId] ?? REGIONS.midcity).state;
const whereFor = (state, level) => (level === 'city' ? state.character.regionId : level === 'state' ? homeState(state) : state.character.countryId ?? 'US');
export const bodyId = (kind, where) => `${kind}:${where}`;

function laborShareFor(state, kind, where) {
  if (kind === 'council') return REGIONS[where]?.size === 'small' || ['rural', 'smalltown'].includes(where) ? 0.42 : 0.6;
  if (kind === 'house' || kind === 'senate') return STATES[where]?.rightToWork ? 0.38 : 0.58;
  return 0.49;
}

function pickLeaders(body, rng) {
  const laborMajority = body.labor * 2 > body.seats;
  const keep = (l, caucus) => (l && l.caucus === caucus ? l : { name: personName(rng), caucus });
  body.leaders = {
    presiding: keep(body.leaders?.presiding, laborMajority ? 'labor' : 'business'),
    majority: keep(body.leaders?.majority, laborMajority ? 'labor' : 'business'),
    minority: keep(body.leaders?.minority, laborMajority ? 'business' : 'labor'),
  };
  syncMembers(body, rng);
  // Committee chairs come from the majority caucus.
  const majority = laborMajority ? 'labor' : 'business';
  body.chairs ??= {};
  for (const id of Object.keys(COMMITTEES)) {
    const cur = body.chairs[id];
    if (cur?.you) continue;
    if (!cur || cur.caucus !== majority) {
      const pick = (body.members ?? []).filter((m) => m.caucus === majority && !Object.values(body.chairs).some((c) => c?.name === m.name)).sort((a, b) => b.terms - a.terms)[0];
      body.chairs[id] = pick ? { name: pick.name, caucus: majority } : { name: personName(rng), caucus: majority };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Member profiles                                                     */
/* ------------------------------------------------------------------ */

export const BACKGROUNDS = ['Attorney', 'Small-business owner', 'Public-school teacher', 'Union electrician', 'Registered nurse', 'Farmer', 'Retired police officer', 'Army veteran', 'Physician', 'Real estate developer', 'Nonprofit director', 'Accountant', 'Firefighter', 'Pastor', 'Tech executive', 'Community organizer', 'Former city council aide', 'Restaurant owner', 'Professor', 'Banker'];
/** How firmly a member holds the caucus line: moderates cross over; hardliners never do. */
export const leanLabel = (m) => (Math.abs(m.lean) >= 75 ? 'Hardliner' : Math.abs(m.lean) >= 40 ? 'Firm' : 'Moderate');
const PROFILE_LAWS = Object.keys(LAWS);

/** Fill in a member's profile (new members, and older saves). Never leaves undefined fields. */
function fillProfile(m, rng, body) {
  m.id ??= rng.id('leg_');
  m.age ??= rng.int(32, 74);
  m.background ??= rng.pick(BACKGROUNDS);
  if (m.lean == null) m.lean = (m.caucus === 'labor' ? -1 : 1) * rng.int(15, 100);
  m.focus ??= rng.pick(PROFILE_LAWS.filter((id) => LAWS[id].levels.includes(body.level)));
  m.committee ??= rng.pick(Object.keys(COMMITTEES));
  m.rel ??= 50;
  m.votes ??= [];
  m.sponsored ??= [];
  return m;
}

/** A district label that fits the body. */
export const districtLabel = (body, m) => (body.kind === 'council' ? `Ward ${m.district}` : body.kind === 'usSenate' || body.kind === 'senate' ? `${body.kind === 'usSenate' ? 'Seat' : 'District'} ${m.district}` : `District ${m.district}`);

/** How a named member votes on a bill: the caucus line, except moderates sometimes cross over (or follow their pet issue). */
function memberVote(m, bill, rng) {
  if (m.you) return null;
  const labor = favorsLabor(bill.lawId, bill.direction);
  const withCaucus = (m.caucus === 'labor') === labor;
  const firmness = Math.abs(m.lean) / 100;
  let p = withCaucus ? 0.75 + 0.24 * firmness : 0.3 - 0.29 * firmness;
  if (m.focus === bill.lawId) p = withCaucus ? 0.99 : p * 0.5;
  if (bill.sponsor === 'you') p = clamp(p + (m.rel - 50) / 250 + (bill.pledges?.includes(m.id) ? 0.4 : 0), 0.01, 0.99);
  return rng.chance(p);
}

/** Members you can name: everyone on a council, the senior members of a bigger chamber. */
export const ROSTER_SIZE = (body) => Math.min(body.seats, 15);
function syncMembers(body, rng) {
  const n = ROSTER_SIZE(body);
  const laborSeats = Math.round(n * body.labor / body.seats);
  body.members ??= [];
  // Leaders are members too.
  for (const l of Object.values(body.leaders)) if (l && !body.members.some((m) => m.name === l.name)) body.members.push({ name: l.name, caucus: l.caucus, district: 0, terms: rng.int(3, 8), ...(l.you ? { you: true } : {}) });
  // Elections: some members retire or lose; the blocs follow the chamber's makeup.
  let labor = body.members.filter((m) => m.caucus === 'labor').length;
  let biz = body.members.length - labor;
  while (body.members.length > n) {
    const caucus = labor > laborSeats ? 'labor' : 'business';
    const i = body.members.findIndex((m) => m.caucus === caucus && !m.you && !Object.values(body.leaders).some((l) => l?.name === m.name));
    if (i < 0) break;
    body.members.splice(i, 1);
    if (caucus === 'labor') labor -= 1; else biz -= 1;
  }
  while (body.members.length < n) {
    const caucus = labor < laborSeats ? 'labor' : 'business';
    body.members.push({ name: personName(rng), caucus, district: 0, terms: rng.int(1, 6) });
    if (caucus === 'labor') labor += 1; else biz += 1;
  }
  body.members.forEach((m, i) => { m.district = m.district || i + 1; fillProfile(m, rng, body); });
}

function newBody(state, kind, where, rng) {
  const d = BODY_DEFS[kind];
  const seats = d.seats(where);
  const body = {
    id: bodyId(kind, where), kind, level: d.level, where, name: d.name(where), seats,
    labor: Math.round(seats * clamp(laborShareFor(state, kind, where) + rng.float(-0.06, 0.06), 0.2, 0.8)),
    staffCount: d.staffCount, nextElection: rng.int(1, 2), bills: [], history: [],
    executive: { name: personName(rng), caucus: rng.chance(laborShareFor(state, kind, where)) ? 'labor' : 'business' },
  };
  pickLeaders(body, rng);
  return body;
}

/** The legislatures over where you live (made on first sight). */
export function ensureBodies(state) {
  state.legislature ??= { seed: 11, bodies: {}, seat: null };
  ensureLaws(state);
  const out = [];
  for (const level of LEVELS) {
    const where = whereFor(state, level);
    for (const kind of chambersFor(level, where)) {
      const id = bodyId(kind, where);
      if (!state.legislature.bodies[id]) state.legislature.bodies[id] = newBody(state, kind, where, legRng(state));
      // Older saves: name the members and committee chairs.
      const b = state.legislature.bodies[id];
      if (!b.members) pickLeaders(b, legRng(state));
      else if (b.members.some((m) => !m.id)) { const r = legRng(state); for (const m of b.members) fillProfile(m, r, b); }
      out.push(state.legislature.bodies[id]);
    }
  }
  // The executive is shared by the chambers of one legislature.
  for (const level of LEVELS) {
    const [a, b] = chambersFor(level, whereFor(state, level)).map((k) => state.legislature.bodies[bodyId(k, whereFor(state, level))]);
    if (a && b) b.executive = a.executive;
  }
  return out;
}

/** Read-only for views. */
export function bodiesHere(state) {
  return LEVELS.flatMap((level) => chambersFor(level, whereFor(state, level)).map((k) => state.legislature?.bodies?.[bodyId(k, whereFor(state, level))]).filter(Boolean));
}
export const mySeat = (state) => state.legislature?.seat ?? null;
export const myBody = (state) => (mySeat(state) ? state.legislature.bodies[state.legislature.seat.bodyId] ?? null : null);
export const inMajority = (state) => {
  const s = mySeat(state);
  const b = myBody(state);
  return Boolean(s && b && ((s.caucus === 'labor') === (b.labor * 2 > b.seats)));
};

/** What the executive above a body is: you (as mayor or governor), or an NPC. */
function executiveIsYou(state, level, where) {
  const o = state.politics?.office?.id;
  const def = BODY_DEFS[chambersFor(level, where)[0]];
  if (def?.country) return Boolean(o && o === def.execOffice);
  return (level === 'city' && o === 'mayor') || (level === 'state' && o === 'governor');
}

/* ------------------------------------------------------------------ */
/* Votes                                                               */
/* ------------------------------------------------------------------ */

/** Lobbying pressure behind a bill, as a share of seats it moves (positive: toward yes). */
function pressure(state, bill, level, where) {
  const labor = favorsLabor(bill.lawId, bill.direction);
  // Organized labor: the clout of the state's unions.
  const st = level === 'federal' ? null : level === 'state' ? where : (REGIONS[where]?.state ?? homeState(state));
  const unions = st ? unionsInState(state, st) : unionsInState(state);
  const clout = unions.length ? unions.reduce((s, u) => s + u.clout * u.members, 0) / Math.max(1, unions.reduce((s, u) => s + u.members, 0)) : 25;
  let push = (labor ? 1 : -1) * (clout - 25) / 900;
  // Money and campaigns you put behind or against it.
  push += bill.push ?? 0;
  return clamp(push, -0.25, 0.25);
}

function floorVote(body, bill, push, rng) {
  const labor = favorsLabor(bill.lawId, bill.direction);
  const pLabor = labor ? 0.92 : 0.1;
  const pBiz = labor ? 0.12 : 0.9;
  const yes = Math.round(clamp(body.labor * pLabor + (body.seats - body.labor) * pBiz + body.seats * (push + rng.float(-0.04, 0.04)), 0, body.seats));
  return { yes, no: body.seats - yes };
}

/** Each chamber in turn, then the executive. Returns the outcome text; enacts on success. */
function runBill(ctx, bill, rng, { from = 0, myVote = null } = {}) {
  const { state } = ctx;
  const kinds = chambersFor(bill.level, bill.where);
  const bodies = kinds.map((k) => state.legislature.bodies[bodyId(k, bill.where)]);
  const seat = mySeat(state);
  for (let i = from; i < bodies.length; i++) {
    const body = bodies[i];
    const resumed = i === from && myVote !== null && bill.tally;
    let v;
    if (resumed) v = { ...bill.tally };
    else {
      const majorityLabor = body.labor * 2 > body.seats;
      const againstMajority = favorsLabor(bill.lawId, bill.direction) !== majorityLabor;
      const push = pressure(state, bill, bill.level, bill.where);
      // Committee: the majority's chair buries most bills the majority doesn't want.
      const youChair = seat?.bodyId === body.id && seat.post === 'chair' && seat.committee === committeeOf(bill.lawId);
      if (youChair) {
        if (bill.sponsor !== 'you' && (seat.caucus === 'labor') !== favorsLabor(bill.lawId, bill.direction)) return finish(ctx, bill, 'dead', `buried in your ${COMMITTEES[seat.committee].name} committee`);
      } else if (againstMajority && push < 0.06 && rng.chance(0.55)) return finish(ctx, bill, 'dead', `died in committee in the ${body.name}`);
      v = floorVote(body, bill, push, rng);
    }
    // Your vote, in your own chamber: in a close one it decides.
    if (!resumed && seat?.bodyId === body.id && Math.abs(v.yes - v.no) <= 2 && body.seats >= 9) {
      bill.stage = 'floor';
      bill.chamber = i;
      bill.tally = v;
      ctx.prompt({
        type: 'legislature.vote', icon: '🗳️', title: 'A Close Vote',
        text: `${LAWS[bill.lawId].icon} ${billTitle(bill)} is tied up on the floor of the ${body.name}: ${v.yes}–${v.no}. Your vote decides it.`,
        options: [{ id: 'yes', label: '✅ Vote yes' }, { id: 'no', label: '❌ Vote no' }],
        data: { id: bill.id },
      });
      return null;
    }
    if (seat?.bodyId === body.id && myVote !== null) {
      v.yes += myVote ? 1 : -1;
      v.no += myVote ? -1 : 1;
    }
    bill.yes = v.yes;
    bill.floorIn = body.id;
    // The named members' votes go on their records.
    for (const m of body.members ?? []) {
      const vote = memberVote(m, bill, rng);
      if (vote === null) continue;
      m.votes = [...(m.votes ?? []).slice(-7), { age: state.character.age, lawId: bill.lawId, title: billTitle(bill), vote: vote ? 'yes' : 'no' }];
      if (bill.sponsor === 'you') m.rel = Math.round(clamp((m.rel ?? 50) + (vote ? 2 : -1), 0, 100));
    }
    bill.no = v.no;
    if (v.yes * 2 <= body.seats) return finish(ctx, bill, 'dead', `failed in the ${body.name} ${v.yes}–${v.no}`);
    myVote = null;
  }
  // Parliamentary governments come from the majority: what passes is law.
  if (BODY_DEFS[kinds[0]].veto === false) return finish(ctx, bill, 'law', 'passed into law');
  // The executive signs or vetoes.
  if (executiveIsYou(state, bill.level, bill.where)) {
    bill.stage = 'desk';
    ctx.prompt({
      type: 'legislature.sign', icon: '✍️', title: 'On Your Desk',
      text: `${LAWS[bill.lawId].icon} ${billTitle(bill)} passed ${bill.yes}–${bill.no}. Sign it into law or veto it?`,
      options: [{ id: 'sign', label: '✍️ Sign it' }, { id: 'veto', label: '🚫 Veto it' }],
      data: { id: bill.id },
    });
    return null;
  }
  const exec = bodies[0].executive;
  if (exec && exec.caucus !== (favorsLabor(bill.lawId, bill.direction) ? 'labor' : 'business') && rng.chance(0.7)) {
    // An override takes two-thirds of every chamber.
    const override = bodies.every((b) => floorVote(b, bill, pressure(state, bill, bill.level, bill.where), rng).yes * 3 >= b.seats * 2);
    if (!override) return finish(ctx, bill, 'dead', `vetoed by the ${BODY_DEFS[kinds[0]].executive.toLowerCase()}`);
  }
  return finish(ctx, bill, 'law', 'signed into law');
}

export const billTitle = (bill) => {
  const law = LAWS[bill.lawId];
  if (law.kind === 'flag') return `${bill.value ? 'Enact' : 'Repeal'} ${law.name.toLowerCase()}`;
  return `${law.name}: ${describeValue(bill.lawId, bill.value)}`;
};

function finish(ctx, bill, stage, outcome) {
  const { state } = ctx;
  bill.stage = stage;
  bill.outcome = outcome;
  const body = state.legislature.bodies[bodyId(chambersFor(bill.level, bill.where)[0], bill.where)];
  const age = state.character.age;
  if (stage === 'law') {
    enact(state, { level: bill.level, where: bill.where === 'US' ? null : bill.where, lawId: bill.lawId, value: bill.value, sponsor: bill.sponsor, age });
    body.history = [...body.history.slice(-9), { age, text: `${billTitle(bill)} — ${outcome}${bill.sponsor === 'you' ? ' (your bill)' : ''}` }];
    const law = LAWS[bill.lawId];
    ctx.log(`${law.icon} New ${bill.level === 'city' ? 'city ordinance' : bill.level === 'state' ? 'state law' : 'federal law'}: ${billTitle(bill)}.${bill.sponsor === 'you' ? ' Your bill!' : ''}`, '🏛️', bill.sponsor === 'you' ? 'good' : undefined);
    if (bill.sponsor === 'you') {
      state.politics.recognition = Math.min(100, state.politics.recognition + 5);
      if (state.politics.office) state.politics.office.approval = Math.min(100, state.politics.office.approval + 3);
    }
  } else if (bill.sponsor === 'you') ctx.log(`Your bill (${billTitle(bill)}) ${outcome}.`, '📜', 'warn');
  if (bill.sponsor === 'lobby') ctx.log(`The bill you lobbied on (${billTitle(bill)}) ${outcome}.`, '💼');
  return outcome;
}

/* ------------------------------------------------------------------ */
/* The session                                                         */
/* ------------------------------------------------------------------ */

function newBill(state, rng, level, where, lawId, direction, sponsor, push = 0) {
  let current = levelValue(state, lawId, level, where === 'US' ? null : where);
  // A city that never set its own minimum wage starts from the one in force there.
  if ((current === null || current === undefined) && LAWS[lawId].kind === 'number') {
    const inForce = level === 'city' ? lawValue(state, lawId, REGIONS[where]?.state, where) : null;
    current = typeof inForce === 'number' ? inForce : LAWS[lawId].min;
  }
  const value = proposedValue(lawId, current, direction);
  if (value === null || value === undefined) return null;
  return { id: rng.id('bill_'), level, where, lawId, direction, value, sponsor, stage: 'introduced', push };
}

/** Bills the majority brings up on its own. */
function npcBills(state, body, rng) {
  const laws = Object.keys(LAWS).filter((id) => LAWS[id].levels.includes(body.level) && lawHere(id, body.level, body.where));
  const laborMajority = body.labor * 2 > body.seats;
  const out = [];
  for (let i = rng.int(1, 3); i > 0; i--) {
    const lawId = rng.pick(laws);
    const wantLabor = rng.chance(0.75) ? laborMajority : !laborMajority;
    const direction = (LAWS[lawId].lean === 'labor') === wantLabor ? 'up' : 'down';
    // A member of the majority (or whoever champions the issue) carries it.
    const champions = (body.members ?? []).filter((m) => !m.you && (m.focus === lawId || m.caucus === (wantLabor ? 'labor' : 'business')));
    const sponsor = champions.find((m) => m.focus === lawId) ?? (champions.length ? rng.pick(champions) : null);
    const b = newBill(state, rng, body.level, body.where, lawId, direction, sponsor?.name ?? personName(rng));
    if (b && !out.some((x) => x.lawId === lawId)) {
      out.push(b);
      if (sponsor) sponsor.sponsored = [...(sponsor.sponsored ?? []).slice(-5), { age: state.character.age, title: billTitle(b) }];
    }
  }
  return out;
}

function electionYear(ctx, body, rng) {
  const { state } = ctx;
  const majorityLabor = body.labor * 2 > body.seats;
  let swing = rng.float(-0.05, 0.05);
  // A bad economy punishes whoever runs things; strong unions turn out voters.
  if (state.economy?.phase === 'recession') swing += majorityLabor ? -0.04 : 0.04;
  const st = body.level === 'federal' ? null : body.level === 'state' ? body.where : REGIONS[body.where]?.state;
  const unions = st ? unionsInState(state, st) : [];
  if (unions.length) swing += (unions.reduce((s, u) => s + u.clout, 0) / unions.length - 30) / 800;
  const before = body.labor;
  body.labor = Math.round(clamp(body.labor / body.seats + swing, 0.2, 0.8) * body.seats);
  if ((before * 2 > body.seats) !== (body.labor * 2 > body.seats)) {
    body.history = [...body.history.slice(-9), { age: state.character.age, text: `The ${body.labor * 2 > body.seats ? 'labor' : 'business'} bloc took the majority (${Math.max(body.labor, body.seats - body.labor)}–${Math.min(body.labor, body.seats - body.labor)}).` }];
  }
  for (const m of body.members ?? []) m.terms += 1;
  body.members = (body.members ?? []).filter((m) => m.you || !rng.chance(0.18 + Math.max(0, m.terms - 6) * 0.05));
  pickLeaders(body, rng);
  // A player in leadership keeps the post only while the caucus allows.
  const seat = mySeat(state);
  if (seat?.bodyId === body.id && seat.post && POSTS[seat.post].majority && !inMajority(state)) {
    ctx.log(`Your caucus lost the majority — you lost your post as ${POSTS[seat.post].title}.`, '🏛️', 'warn');
    seat.post = null;
  }
  if (rng.chance(0.4)) body.executive = { name: personName(rng), caucus: rng.chance(body.labor / body.seats) ? 'labor' : 'business' };
  body.nextElection = 2;
}

/** Your seat: taken with the office, kept in step with it. */
function syncSeat(ctx) {
  const { state } = ctx;
  const officeId = state.politics?.office?.id;
  const kind = SEAT_OFFICES[officeId];
  const seat = state.legislature.seat;
  if (!kind) {
    if (seat) {
      state.legislature.seat = null;
      // You're no longer a member: your seat goes to someone else.
      for (const b of Object.values(state.legislature.bodies)) {
        if (b.members) b.members = b.members.filter((m) => !m.you);
        for (const k of Object.keys(b.chairs ?? {})) if (b.chairs[k]?.you) delete b.chairs[k];
      }
    }
    return null;
  }
  const id = bodyId(kind, whereFor(state, BODY_DEFS[kind].level));
  if (seat?.bodyId === id) return seat;
  const caucus = (state.politics.laborVotes ?? 0) > 1 || state.career.job?.unionMember ? 'labor' : state.business?.current || state.business?.holdings?.length ? 'business' : (state.legislature.bodies[id]?.labor ?? 0) * 2 > (state.legislature.bodies[id]?.seats ?? 1) ? 'labor' : 'business';
  state.legislature.seat = { bodyId: id, caucus, post: null, committee: null, staff: [], record: [] };
  const body = state.legislature.bodies[id];
  if (body?.members) {
    body.members = body.members.filter((m) => !m.you);
    body.members.unshift(fillProfile({ name: `${state.character.firstName} ${state.character.lastName}`, caucus, district: 1, terms: 1, you: true, age: state.character.age, background: 'You', lean: caucus === 'labor' ? -50 : 50 }, legRng(state), body));
  }
  return state.legislature.seat;
}

const staffAllowance = (seat) => BODY_DEFS[seat.bodyId.split(':')[0]]?.allowance ?? 1;
export const legActionsPerYear = (seat) => SPONSOR_PER_YEAR + (seat?.staff?.some((s) => s.role === 'chiefOfStaff') ? 1 : 0);

function sponsorPush(state, seat) {
  const staff = (seat.staff ?? []).filter((s) => s.role === 'legislativeDirector').reduce((n, s) => n + s.skill / 2500, 0);
  return (state.politics.recognition ?? 0) / 1200 + staff + (seat.post ? POSTS[seat.post].push : 0) + (inMajority(state) ? 0.02 : 0);
}

export const Legislature = {
  id: 'legislature',
  order: 33.5,

  init(state) {
    state.legislature ??= { seed: ((state.orgs?.seed ?? 11) ^ 0x1e9) >>> 0, bodies: {}, seat: null };
    ensureLaws(state);
  },

  setup(engine) {
    engine.bus.on('politics:officeChanged', ({ ctx }) => {
      ensureBodies(ctx.state);
      syncSeat(ctx);
    });
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    if (state.character.age < 18) return;
    ensureBodies(state);
    const seat = syncSeat(ctx);
    const rng = legRng(state);
    // Elections and leadership.
    for (const body of bodiesHere(state)) {
      body.nextElection -= 1;
      if (body.nextElection <= 0) electionYear(ctx, body, rng);
    }
    // Your office: staff pay off in approval; leadership pays a stipend on top of the salary.
    if (seat) {
      const o = state.politics.office;
      const comms = seat.staff.filter((s) => ['communications', 'caseworker'].includes(s.role)).length;
      if (o && comms) o.approval = Math.min(100, o.approval + comms);
      if (seat.post) ctx.earn(Math.round(OFFICES[o.id].salary * POSTS[seat.post].pay), `${POSTS[seat.post].title} stipend`, { wage: true });
    }
    // The session: the year's bills (yours, lobbied ones, the majority's) go to the floor.
    for (const level of LEVELS) {
      const where = whereFor(state, level);
      const kinds = chambersFor(level, where);
      const origin = kinds.length ? state.legislature.bodies[bodyId(kinds[0], where)] : null;
      if (!origin) continue;
      const pending = (origin.bills ?? []).filter((b) => b.stage === 'introduced');
      const bills = [...pending, ...npcBills(state, origin, rng)];
      for (const b of bills) runBill(ctx, b, rng);
      // Members go on the record on the session's biggest bill, close or not.
      if (seat && kinds.some((k) => bodyId(k, where) === seat.bodyId) && !state.prompts.some((p) => p.type === 'legislature.vote' || p.type === 'legislature.recordVote')) {
        const key = bills.find((b) => b.floorIn === seat.bodyId && b.sponsor !== 'you') ?? bills.find((b) => b.floorIn === seat.bodyId);
        if (key) {
          ctx.prompt({
            type: 'legislature.recordVote', icon: '🗳️', title: 'On the Record',
            text: `${LAWS[key.lawId].icon} ${billTitle(key)} — ${key.outcome ?? 'on the floor'} (${key.yes}–${key.no}). How do you vote?`,
            options: [{ id: 'yes', label: '✅ Yes' }, { id: 'no', label: '❌ No' }, { id: 'abstain', label: '🤐 Present (abstain)' }],
            data: { id: key.id },
          });
        }
      }
      origin.bills = [...(origin.bills ?? []).filter((b) => !bills.includes(b) && ['floor', 'desk'].includes(b.stage)), ...bills].slice(-10);
    }
  },

  actions: {
    /** Introduce a bill: "lawId|up" or "lawId|down". */
    sponsor(ctx, arg) {
      const { state } = ctx;
      const seat = mySeat(state);
      const body = myBody(state);
      if (!seat || !body) return ctx.toast('Only members can introduce bills.', 'warn');
      const [lawId, direction] = String(arg).split('|');
      if (!LAWS[lawId]?.levels.includes(body.level) || !lawHere(lawId, body.level, body.where)) return ctx.toast('Not something this body can pass.', 'warn');
      if (yearlyCount(state, 'legislature.act') >= legActionsPerYear(seat)) return ctx.toast(`${legActionsPerYear(seat)} legislative actions a year.`, 'warn');
      const origin = state.legislature.bodies[bodyId(chambersFor(body.level, body.where)[0], body.where)];
      if (origin.bills.some((b) => b.lawId === lawId && b.stage === 'introduced')) return ctx.toast('A bill on that is already in the hopper.', 'warn');
      const bill = newBill(state, legRng(state), body.level, body.where, lawId, direction, 'you', sponsorPush(state, seat));
      if (!bill) return ctx.toast('The law is already as far as it goes.', 'warn');
      bumpYearly(state, 'legislature.act');
      origin.bills.push(bill);
      seat.record = [...seat.record.slice(-19), { age: state.character.age, text: `Introduced: ${billTitle(bill)}` }];
      if (favorsLabor(lawId, direction)) state.politics.laborVotes = (state.politics.laborVotes ?? 0) + 1;
      ctx.log(`You introduced a bill: ${billTitle(bill)}. It comes to the floor this session.`, LAWS[lawId].icon, 'good');
      return undefined;
    },
    /** Get to know a colleague (coffee, a fundraiser, a district visit). arg: member id */
    meet(ctx, memberId) {
      const { state } = ctx;
      const body = myBody(state);
      const m = body?.members?.find((x) => x.id === memberId && !x.you);
      if (!m) return ctx.toast('Only fellow members of your chamber.', 'warn');
      if (yearlyCount(state, 'legislature.meet') >= 3) return ctx.toast('Three one-on-ones a year — your calendar is full.', 'warn');
      if (yearlyCount(state, `legislature.meet.${m.id}`)) return ctx.toast(`You already met ${m.name} this year.`, 'warn');
      bumpYearly(state, 'legislature.meet');
      bumpYearly(state, `legislature.meet.${m.id}`);
      const rng = legRng(state);
      const sameSide = m.caucus === mySeat(state).caucus;
      const gain = Math.round(rng.int(4, 12) + (state.stats.looks - 50) / 10 + (sameSide ? 4 : 0) - (Math.abs(m.lean) >= 75 && !sameSide ? 6 : 0));
      m.rel = Math.round(clamp(m.rel + gain, 0, 100));
      ctx.log(`You had ${rng.pick(['coffee', 'dinner', 'a long walk', 'a drink after session'])} with ${m.name} (${m.background.toLowerCase()}, ${CAUCUSES[m.caucus].name}). Relationship ${m.rel}/100.`, '☕', gain > 0 ? 'good' : undefined);
      return undefined;
    },
    /** Ask a colleague to back your bill this session. arg: member id */
    askSupport(ctx, memberId) {
      const { state } = ctx;
      const body = myBody(state);
      const m = body?.members?.find((x) => x.id === memberId && !x.you);
      if (!m) return;
      const origin = state.legislature.bodies[bodyId(chambersFor(body.level, body.where)[0], body.where)];
      const bill = origin.bills.find((b) => b.sponsor === 'you' && b.stage === 'introduced' && !(b.pledges ?? []).includes(m.id));
      if (!bill) return ctx.toast('Introduce a bill first (or they already pledged).', 'warn');
      if (yearlyCount(state, `legislature.ask.${m.id}`)) return ctx.toast(`You already asked ${m.name} this year.`, 'warn');
      bumpYearly(state, `legislature.ask.${m.id}`);
      const rng = legRng(state);
      const aligned = (m.caucus === 'labor') === favorsLabor(bill.lawId, bill.direction);
      const odds = clamp((aligned ? 0.55 : 0.1) + (m.rel - 50) / 120 - (aligned ? 0 : Math.abs(m.lean) / 250) + (m.focus === bill.lawId ? (aligned ? 0.3 : -0.3) : 0), 0.02, 0.97);
      if (rng.chance(odds)) {
        bill.pledges = [...(bill.pledges ?? []), m.id];
        bill.push = (bill.push ?? 0) + 1 / body.seats + (body.seats > 15 ? 0.01 : 0);
        m.rel = Math.min(100, m.rel + 2);
        ctx.log(`${m.name} agreed to co-sponsor ${billTitle(bill)}${aligned ? '' : ' — crossing the aisle'}.`, '🤝', 'good');
      } else {
        m.rel = Math.max(0, m.rel - 2);
        ctx.log(`${m.name} won't back ${billTitle(bill)}.`, '🙅', 'warn');
      }
      return undefined;
    },
    /** Whip votes for a bill already in the hopper (leaders and chairs). */
    whip(ctx, billId) {
      const { state } = ctx;
      const seat = mySeat(state);
      if (!seat?.post) return ctx.toast('Whipping votes takes a leadership post.', 'warn');
      if (yearlyCount(state, 'legislature.act') >= legActionsPerYear(seat)) return ctx.toast('No legislative actions left this year.', 'warn');
      const bill = Object.values(state.legislature.bodies).flatMap((b) => b.bills).find((b) => b.id === billId && b.stage === 'introduced');
      if (!bill) return;
      bumpYearly(state, 'legislature.act');
      bill.push = (bill.push ?? 0) + POSTS[seat.post].push + 0.03;
      ctx.log(`You whipped votes for ${billTitle(bill)}.`, '📋');
    },
    /** Run for a leadership post in your chamber. */
    runPost(ctx, post) {
      const { state, rng } = ctx;
      const seat = mySeat(state);
      const P = POSTS[post];
      if (!seat || !P) return;
      const o = state.politics.office;
      if (yearlyCount(state, 'legislature.runPost')) return ctx.toast('Leadership races come once a year.', 'warn');
      if (o.terms < P.minTerms) return ctx.toast(`${P.title} takes ${P.minTerms} terms of seniority.`, 'warn');
      if (P.majority && !inMajority(state)) return ctx.toast('Your caucus is in the minority.', 'warn');
      bumpYearly(state, 'legislature.runPost');
      const odds = clamp(0.15 + o.terms * 0.06 + state.politics.recognition / 300 + (o.approval - 50) / 200 + (seat.post ? 0.1 : 0) - (post === 'presiding' ? 0.15 : 0), 0.05, 0.8);
      if (!rng.chance(odds)) return ctx.log(`Your caucus picked someone else as ${P.title.toLowerCase()}.`, '🏛️', 'warn');
      seat.post = post;
      if (post === 'chair') seat.committee ??= 'labor';
      const me = `${state.character.firstName} ${state.character.lastName}`;
      if (post === 'chair') { const b = myBody(state); b.chairs ??= {}; b.chairs[seat.committee] = { name: me, caucus: seat.caucus, you: true }; }
      const body = myBody(state);
      if (post === 'presiding') body.leaders.presiding = { name: `${state.character.firstName} ${state.character.lastName}`, caucus: seat.caucus, you: true };
      if (post === 'majority') body.leaders.majority = { name: `${state.character.firstName} ${state.character.lastName}`, caucus: seat.caucus, you: true };
      state.politics.recognition = Math.min(100, state.politics.recognition + 8);
      ctx.log(`Your colleagues elected you ${P.title}.`, '🏛️', 'milestone');
      return undefined;
    },
    committee(ctx, id) {
      const seat = mySeat(ctx.state);
      if (!seat || !COMMITTEES[id]) return;
      const body = myBody(ctx.state);
      if (seat.post === 'chair' && body) {
        body.chairs ??= {};
        for (const k of Object.keys(body.chairs)) if (body.chairs[k]?.you) delete body.chairs[k];
        body.chairs[id] = { name: `${ctx.state.character.firstName} ${ctx.state.character.lastName}`, caucus: seat.caucus, you: true };
      }
      seat.committee = id;
      ctx.log(`You took a seat on the ${COMMITTEES[id].name} committee${seat.post === 'chair' ? ' as chair' : ''}.`, '🗂️');
    },
    caucus(ctx, id) {
      const { state } = ctx;
      const seat = mySeat(state);
      if (!seat || !CAUCUSES[id] || seat.caucus === id) return;
      seat.caucus = id;
      seat.post = null;
      if (state.politics.office) state.politics.office.approval = Math.max(0, state.politics.office.approval - 8);
      ctx.log(`You switched to the ${CAUCUSES[id].name}. Former allies called it a betrayal.`, '🔀', 'warn');
    },
    hireStaff(ctx, role) {
      const { state, rng } = ctx;
      const seat = mySeat(state);
      if (!seat || !STAFF_ROLES[role]) return;
      if (seat.staff.length >= staffAllowance(seat)) return ctx.toast(`Your office budget covers ${staffAllowance(seat)} staff.`, 'warn');
      const p = { id: rng.id('staff_'), role, name: personName(rng), skill: rng.int(45, 92) };
      seat.staff.push(p);
      ctx.log(`You hired ${p.name} as your ${STAFF_ROLES[role].title.toLowerCase()} (skill ${p.skill}).`, '🧑‍💼');
    },
    fireStaff(ctx, id) {
      const seat = mySeat(ctx.state);
      const p = seat?.staff.find((s) => s.id === id);
      if (!p) return;
      seat.staff = seat.staff.filter((s) => s !== p);
      ctx.log(`You let ${p.name} go.`, '🚪');
    },
    /**
     * Lobby on a law ("lawId|up|level"): business owners spend money; union officers spend the union's clout.
     * The pressure carries a bill on it into this year's session.
     */
    lobby(ctx, arg) {
      const { state } = ctx;
      const [lawId, direction, level] = String(arg).split('|');
      if (!LAWS[lawId]?.levels.includes(level) || !lawHere(lawId, level, whereFor(state, level))) return;
      if (yearlyCount(state, 'legislature.lobby') >= 2) return ctx.toast('Two lobbying campaigns a year.', 'warn');
      ensureBodies(state);
      const where = whereFor(state, level);
      const kinds = chambersFor(level, where);
      if (!kinds.length) return ctx.toast('No legislature at that level here.', 'warn');
      const origin = state.legislature.bodies[bodyId(kinds[0], where)];
      const unionLeader = isOfficer(state) && myUnion(state);
      const owner = state.business?.current || state.business?.holdings?.length;
      if (!unionLeader && !owner) return ctx.toast('Lobbying takes a business or a union behind you.', 'warn');
      const cost = { city: 25000, state: 150000, federal: 1_000_000 }[level];
      let push;
      if (unionLeader && favorsLabor(lawId, direction)) {
        const u = myUnion(state);
        push = 0.03 + unionPower(u) / 1200;
        u.clout = Math.max(0, u.clout - 4);
      } else {
        if (!ctx.spend(cost, `Lobbying (${LAWS[lawId].name.toLowerCase()})`, { credit: true })) return ctx.toast(`A lobbying campaign costs ${money(cost)}.`, 'warn');
        push = 0.06;
      }
      bumpYearly(state, 'legislature.lobby');
      let bill = origin.bills.find((b) => b.lawId === lawId && b.direction === direction && b.stage === 'introduced');
      if (!bill) {
        bill = newBill(state, legRng(state), level, where, lawId, direction, 'lobby');
        if (!bill) return ctx.toast('The law is already as far as it goes.', 'warn');
        origin.bills.push(bill);
      }
      bill.push = (bill.push ?? 0) + push;
      ctx.log(`You lobbied the ${origin.name} to ${billTitle(bill).toLowerCase()}.`, '💼');
      return undefined;
    },
  },

  resolvers: {
    vote(ctx, data, optionId) {
      const { state } = ctx;
      const bill = Object.values(state.legislature.bodies).flatMap((b) => b.bills).find((b) => b.id === data.id);
      const seat = mySeat(state);
      if (!bill || bill.stage !== 'floor') return;
      const yes = optionId === 'yes';
      if (seat) seat.record = [...seat.record.slice(-19), { age: state.character.age, text: `Voted ${yes ? 'yes' : 'no'}: ${billTitle(bill)}` }];
      // Voting with the caucus keeps allies; crossing over wins independents.
      const withCaucus = yes === ((seat?.caucus === 'labor') === favorsLabor(bill.lawId, bill.direction));
      if (state.politics.office) state.politics.office.approval = Math.round(clamp(state.politics.office.approval + (withCaucus ? 1 : -1), 0, 100));
      if (yes && favorsLabor(bill.lawId, bill.direction)) state.politics.laborVotes = (state.politics.laborVotes ?? 0) + 1;
      // Your vote breaks the tie; the bill then goes on to the other chamber and the executive.
      const out = runBill(ctx, bill, legRng(state), { from: bill.chamber ?? 0, myVote: yes });
      if (out) ctx.log(`Your vote decided it: ${billTitle(bill)} ${out}.`, '🗳️', 'milestone');
    },
    /** A recorded vote that didn't decide the bill: your record, your caucus, your voters. */
    recordVote(ctx, data, optionId) {
      const { state } = ctx;
      const bill = Object.values(state.legislature.bodies).flatMap((b) => b.bills).find((b) => b.id === data.id);
      const seat = mySeat(state);
      if (!bill || !seat) return;
      const o = state.politics.office;
      if (optionId === 'abstain') {
        if (o) o.approval = Math.max(0, o.approval - 1);
        seat.record = [...seat.record.slice(-19), { age: state.character.age, text: `Voted present: ${billTitle(bill)}` }];
        return;
      }
      const yes = optionId === 'yes';
      const withCaucus = yes === ((seat.caucus === 'labor') === favorsLabor(bill.lawId, bill.direction));
      if (o) o.approval = Math.round(clamp(o.approval + (withCaucus ? 1 : -1), 0, 100));
      if (!withCaucus) state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 2);
      if (yes && favorsLabor(bill.lawId, bill.direction)) state.politics.laborVotes = (state.politics.laborVotes ?? 0) + 1;
      seat.record = [...seat.record.slice(-19), { age: state.character.age, text: `Voted ${yes ? 'yes' : 'no'}${withCaucus ? '' : ' (broke with your caucus)'}: ${billTitle(bill)}` }];
    },
    sign(ctx, data, optionId) {
      const { state } = ctx;
      const bill = Object.values(state.legislature.bodies).flatMap((b) => b.bills).find((b) => b.id === data.id);
      if (!bill || bill.stage !== 'desk') return;
      if (optionId === 'sign') {
        finish(ctx, bill, 'law', 'signed into law by you');
        if (state.politics.office) state.politics.office.approval = Math.min(100, state.politics.office.approval + 1);
      } else {
        // A veto can be overridden by two-thirds.
        const bodies = chambersFor(bill.level, bill.where).map((k) => state.legislature.bodies[bodyId(k, bill.where)]);
        const rng = legRng(state);
        const override = bodies.every((b) => floorVote(b, bill, pressure(state, bill, bill.level, bill.where), rng).yes * 3 >= b.seats * 2);
        if (override) finish(ctx, bill, 'law', 'became law over your veto');
        else finish(ctx, bill, 'dead', 'vetoed by you');
      }
    },
  },
};
