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
export const SEAT_OFFICES = Object.fromEntries(Object.entries(BODY_DEFS).map(([k, d]) => [d.office, k]));

export const COMMITTEES = {
  labor: { name: 'Labor & Workforce', laws: ['minWage', 'rightToWork', 'cardCheck', 'paidLeave'] },
  commerce: { name: 'Commerce & Business', laws: ['businessTax', 'corporateRate', 'smallBizCredit', 'antitrust', 'licensing', 'rentControl'] },
  appropriations: { name: 'Appropriations', laws: ['infrastructure', 'publicPay'] },
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
const whereFor = (state, level) => (level === 'city' ? state.character.regionId : level === 'state' ? homeState(state) : 'US');
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
  for (const [level, kinds] of Object.entries(CHAMBERS)) {
    const where = whereFor(state, level);
    for (const kind of kinds) {
      const id = bodyId(kind, where);
      if (!state.legislature.bodies[id]) state.legislature.bodies[id] = newBody(state, kind, where, legRng(state));
      out.push(state.legislature.bodies[id]);
    }
  }
  // The executive is shared by the chambers of one legislature.
  for (const kinds of Object.values(CHAMBERS)) {
    const [a, b] = kinds.map((k) => state.legislature.bodies[bodyId(k, whereFor(state, BODY_DEFS[k].level))]);
    if (a && b) b.executive = a.executive;
  }
  return out;
}

/** Read-only for views. */
export function bodiesHere(state) {
  return Object.entries(CHAMBERS).flatMap(([level, kinds]) => kinds.map((k) => state.legislature?.bodies?.[bodyId(k, whereFor(state, level))]).filter(Boolean));
}
export const mySeat = (state) => state.legislature?.seat ?? null;
export const myBody = (state) => (mySeat(state) ? state.legislature.bodies[state.legislature.seat.bodyId] ?? null : null);
export const inMajority = (state) => {
  const s = mySeat(state);
  const b = myBody(state);
  return Boolean(s && b && ((s.caucus === 'labor') === (b.labor * 2 > b.seats)));
};

/** What the executive above a body is: you (as mayor or governor), or an NPC. */
function executiveIsYou(state, level) {
  const o = state.politics?.office?.id;
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
  const kinds = CHAMBERS[bill.level];
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
    bill.no = v.no;
    if (v.yes * 2 <= body.seats) return finish(ctx, bill, 'dead', `failed in the ${body.name} ${v.yes}–${v.no}`);
    myVote = null;
  }
  // The executive signs or vetoes.
  if (executiveIsYou(state, bill.level)) {
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
  const body = state.legislature.bodies[bodyId(CHAMBERS[bill.level][0], bill.where)];
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
  const laws = Object.keys(LAWS).filter((id) => LAWS[id].levels.includes(body.level));
  const laborMajority = body.labor * 2 > body.seats;
  const out = [];
  for (let i = rng.int(0, 2); i > 0; i--) {
    const lawId = rng.pick(laws);
    const wantLabor = rng.chance(0.75) ? laborMajority : !laborMajority;
    const direction = (LAWS[lawId].lean === 'labor') === wantLabor ? 'up' : 'down';
    const b = newBill(state, rng, body.level, body.where, lawId, direction, personName(rng));
    if (b && !out.some((x) => x.lawId === lawId)) out.push(b);
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
    if (seat) state.legislature.seat = null;
    return null;
  }
  const id = bodyId(kind, whereFor(state, BODY_DEFS[kind].level));
  if (seat?.bodyId === id) return seat;
  const caucus = (state.politics.laborVotes ?? 0) > 1 || state.career.job?.unionMember ? 'labor' : state.business?.current || state.business?.holdings?.length ? 'business' : (state.legislature.bodies[id]?.labor ?? 0) * 2 > (state.legislature.bodies[id]?.seats ?? 1) ? 'labor' : 'business';
  state.legislature.seat = { bodyId: id, caucus, post: null, committee: null, staff: [], record: [] };
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
    for (const [level, kinds] of Object.entries(CHAMBERS)) {
      const where = whereFor(state, level);
      const origin = state.legislature.bodies[bodyId(kinds[0], where)];
      const pending = (origin.bills ?? []).filter((b) => b.stage === 'introduced');
      const bills = [...pending, ...npcBills(state, origin, rng)];
      for (const b of bills) runBill(ctx, b, rng);
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
      if (!LAWS[lawId]?.levels.includes(body.level)) return ctx.toast('Not something this body can pass.', 'warn');
      if (yearlyCount(state, 'legislature.act') >= legActionsPerYear(seat)) return ctx.toast(`${legActionsPerYear(seat)} legislative actions a year.`, 'warn');
      const origin = state.legislature.bodies[bodyId(CHAMBERS[body.level][0], body.where)];
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
      if (!LAWS[lawId]?.levels.includes(level)) return;
      if (yearlyCount(state, 'legislature.lobby') >= 2) return ctx.toast('Two lobbying campaigns a year.', 'warn');
      ensureBodies(state);
      const where = whereFor(state, level);
      const origin = state.legislature.bodies[bodyId(CHAMBERS[level][0], where)];
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
    sign(ctx, data, optionId) {
      const { state } = ctx;
      const bill = Object.values(state.legislature.bodies).flatMap((b) => b.bills).find((b) => b.id === data.id);
      if (!bill || bill.stage !== 'desk') return;
      if (optionId === 'sign') {
        finish(ctx, bill, 'law', 'signed into law by you');
        if (state.politics.office) state.politics.office.approval = Math.min(100, state.politics.office.approval + 1);
      } else {
        // A veto can be overridden by two-thirds.
        const bodies = CHAMBERS[bill.level].map((k) => state.legislature.bodies[bodyId(k, bill.where)]);
        const rng = legRng(state);
        const override = bodies.every((b) => floorVote(b, bill, pressure(state, bill, bill.level, bill.where), rng).yes * 3 >= b.seats * 2);
        if (override) finish(ctx, bill, 'law', 'became law over your veto');
        else finish(ctx, bill, 'dead', 'vetoed by you');
      }
    },
  },
};
