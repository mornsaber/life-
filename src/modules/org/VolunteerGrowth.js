/**
 * Growing a volunteer agency into something bigger.
 *
 *   Stations      A well-run company can open a substation: more coverage,
 *                 more calls, more members — and more to maintain.
 *   Neighbours    Two to four neighbouring agencies drift along beside you.
 *                 When one is struggling (too few members, an empty bank
 *                 account) its members can vote to merge into yours.
 *   Contracts     Counties and the state pay agencies that can deliver:
 *                 fire protection for unincorporated land, the 911
 *                 ambulance contract, a state wildland agreement. A
 *                 contract pays every year and demands readiness; fall
 *                 below it and the county cancels.
 *   Paid staff    Contract money and funds can hire paid firefighters,
 *                 medics or an administrator: daytime coverage the
 *                 volunteers can't give. Payroll comes out of funds, and an
 *                 empty account means layoffs. With paid staff and a
 *                 contract, the chief's post can become a paid one.
 *
 *   Incorporation An independent agency that takes on payroll or a contract
 *                 incorporates: a nonprofit corporation (a 501(c)(3) in the
 *                 US, a registered association abroad) with a board of
 *                 directors, employer on-costs, insurance and an annual
 *                 audit. With paid staff it's a combination department, and
 *                 the board — not the membership — decides on a paid chief.
 *   A parent      Abroad, many units belong to a national or state service
 *                 (FENZ, a county fire and rescue service, the THW). The
 *                 parent funds them, so there are no county contracts to bid
 *                 for; career staff and stations are asked of the parent,
 *                 which also appoints the senior officers.
 *
 * org.district = { stations, neighbors: [{ id, name, members, readiness, funds, stations }],
 *                  contracts: [{ id, name, annual, minReadiness, until }], paid: [{ id, role, salary, personId, parentPaid }], paidChief }
 * org.corp = { kind, since, board: [{ name, rel }] }   org.parent = { name, level, funds, grant, paid } | null
 */
import { clamp } from '../../core/Random.js';
import { randomName } from '../../core/State.js';

/** What each kind of agency can contract for, and the paid roles it can hire. */
export const GROWTH = {
  fire: {
    stationCost: 450000, stationWord: 'substation',
    contracts: [
      { id: 'countyFire', name: 'County fire protection contract (unincorporated area)', annual: [90000, 260000], minReadiness: 60, years: 5 },
      { id: 'wildland', name: 'State cooperative wildland fire agreement', annual: [40000, 120000], minReadiness: 55, years: 3 },
      { id: 'ems', name: 'County first-response EMS agreement', annual: [30000, 90000], minReadiness: 55, years: 3 },
    ],
    roles: [{ id: 'ff', role: 'Paid firefighter/EMT (day shift)', salary: 52000, readiness: 5 }, { id: 'admin', role: 'Paid administrator', salary: 48000, readiness: 2, funds: 0.08 }, { id: 'mechanic', role: 'Paid apparatus mechanic', salary: 55000, readiness: 3 }],
    paidChief: { title: 'Paid Fire Chief', salary: 82000 },
  },
  ambulance: {
    stationCost: 300000, stationWord: 'ambulance post',
    contracts: [
      { id: '911', name: 'County 911 ambulance contract', annual: [150000, 600000], minReadiness: 65, years: 5 },
      { id: 'interfacility', name: 'Hospital interfacility transport contract', annual: [60000, 200000], minReadiness: 55, years: 3 },
    ],
    roles: [{ id: 'medic', role: 'Paid paramedic (day shift)', salary: 58000, readiness: 6 }, { id: 'emt', role: 'Paid EMT', salary: 42000, readiness: 4 }, { id: 'admin', role: 'Paid billing administrator', salary: 46000, readiness: 1, funds: 0.12 }],
    paidChief: { title: 'Paid Chief of Operations', salary: 76000 },
  },
  sar: {
    stationCost: 150000, stationWord: 'team base',
    contracts: [{ id: 'countySar', name: 'County search & rescue agreement', annual: [20000, 70000], minReadiness: 55, years: 3 }],
    roles: [{ id: 'coord', role: 'Paid team coordinator', salary: 45000, readiness: 4 }],
    paidChief: null,
  },
  police: {
    stationCost: 0,
    contracts: [{ id: 'events', name: 'County special-events policing agreement', annual: [20000, 60000], minReadiness: 55, years: 2 }],
    roles: [],
    paidChief: null,
  },
};
const NAMES = {
  fire: ['Volunteer Fire Company', 'Fire District', 'Volunteer Fire Department'],
  ambulance: ['Rescue Squad', 'Volunteer Ambulance Corps'],
  sar: ['Search & Rescue', 'Mountain Rescue Team'],
  police: ['Police Reserve Unit'],
};
const PLACES = ['North', 'South', 'East', 'West', 'Valley', 'Lake', 'Ridge', 'Mill Creek', 'Oak Hill', 'Pine Grove', 'Cedar', 'River'];

export const growthOf = (serviceId) => GROWTH[serviceId] ?? null;

/** The district around your agency (made on first look). */
export function districtOf(org, rng) {
  if (org.district) return org.district;
  const n = rng.int(2, 4);
  // Abroad the neighbours are units of the same local service (the part of your unit's name before the town).
  const local = org.countryId && org.countryId !== 'US' && org.name.includes(' — ') ? org.name.split(' — ')[0] : null;
  const word = local ? [local] : NAMES[org.serviceId] ?? ['Volunteers'];
  org.district = {
    stations: 1, contracts: [], paid: [], paidChief: false,
    neighbors: Array.from({ length: n }, (_, i) => ({ id: `nb${i}`, name: local ? `${local} — ${rng.pick(PLACES)}` : `${rng.pick(PLACES)} ${rng.pick(word)}`, members: rng.int(6, 30), readiness: rng.int(25, 75), funds: rng.int(5, 120) * 1000, stations: 1 })),
  };
  return org.district;
}

const memberCount = (org) => Object.keys(org.people).length + 1;
/** What the agency pays its own staff (the parent pays the ones it sends). */
const payroll = (d) => d.paid.reduce((s, p) => s + (p.parentPaid ? 0 : p.salary), 0);
/** Employer on-costs once incorporated: payroll taxes, workers' compensation. */
export const ON_COST = 0.1;
/** A year as a corporation: liability insurance, the audit and the filings. */
export const corpOverhead = (d) => 6000 + Math.round(payroll(d) * 0.02) + (d.contracts.length ? 4000 : 0);
/** The national or state service the unit belongs to, if any. */
const parentOf = (org) => org.parent ?? null;
/** A combination department: paid staff alongside the volunteers. */
export const isCombination = (org) => Boolean(org.district?.paid?.length || org.district?.paidChief);
const CORP = { US: '501(c)(3) nonprofit corporation', '*': 'registered nonprofit association' };
export const corpKind = (countryId) => CORP[countryId ?? 'US'] ?? CORP['*'];

/** An independent agency taking on payroll or public money incorporates (once). */
export function incorporate(ctx, org, why) {
  if (org.corp || parentOf(org)) return;
  const { rng, state } = ctx;
  const board = Array.from({ length: 5 }, () => { const n = randomName(rng, rng.pick(['male', 'female'])); return { name: `${n.firstName} ${n.lastName}`, rel: rng.int(40, 70) }; });
  org.corp = { kind: corpKind(state.character.countryId), since: state.character.age, board };
  ctx.log(`${why} ${org.name} incorporated as a ${org.corp.kind}, with a five-member board of directors, payroll, insurance and an annual audit.`, '🏢', 'milestone');
}
/** What the funds must keep back from equipment for next year: payroll, overheads and training. */
export function fundsFloor(org) {
  const d = org.district;
  if (!d) return 5000;
  const g = growthOf(org.serviceId);
  const chief = d.paidChief && g?.paidChief ? g.paidChief.salary : 0;
  return 5000 + Math.round((payroll(d) + chief) * (org.corp ? 1 + ON_COST : 1)) + (org.corp ? corpOverhead(d) : 0);
}
const boardMood = (org) => (org.corp?.board?.length ? org.corp.board.reduce((s, b) => s + b.rel, 0) / org.corp.board.length : 55);
export const struggling = (n) => n.members < 10 || n.readiness < 40 || n.funds < 15000;

/** Can you do this? { ok, reason, odds } for each growth action. */
export function growthCheck(state, org, kind, arg) {
  const g = growthOf(org.serviceId);
  if (!g) return { ok: false, reason: 'Not for this kind of service' };
  const d = org.district;
  if (!d) return { ok: false, reason: 'Not yet' };
  const parent = parentOf(org);
  if (kind === 'expand') {
    if (!g.stationCost) return { ok: false, reason: 'No stations to open' };
    if (org.readiness < 60) return { ok: false, reason: 'Get readiness to 60% first' };
    if (memberCount(org) < 15 * d.stations) return { ok: false, reason: `Needs ${15 * d.stations} members to staff another ${g.stationWord}` };
    const share = stationShare(org, g);
    if (org.funds < share) return { ok: false, reason: parent ? `${parent.name} wants a local contribution of $${share.toLocaleString()}` : `Costs $${g.stationCost.toLocaleString()} (funds or a grant)` };
    return parent ? { ok: true, odds: clamp(0.3 + (org.readiness - 60) / 80, 0.15, 0.75) } : { ok: true };
  }
  if (kind === 'merge') {
    const n = d.neighbors.find((x) => x.id === arg);
    if (!n) return { ok: false, reason: 'No such agency' };
    if (!struggling(n)) return { ok: false, reason: `${n.name} is doing fine on its own` };
    if (org.readiness < 55) return { ok: false, reason: 'Your own house needs to be in order (readiness 55%+)' };
    return { ok: true, odds: clamp(0.35 + (org.readiness - 55) / 100 + (n.readiness < 30 ? 0.15 : 0) + (n.members < 6 ? 0.15 : 0), 0.15, 0.85) };
  }
  if (kind === 'contract') {
    if (parent) return { ok: false, reason: `Funded by ${parent.name}: there are no county contracts to bid for` };
    const c = g.contracts.find((x) => x.id === arg);
    if (!c) return { ok: false, reason: 'No such contract' };
    if (d.contracts.some((x) => x.id === c.id)) return { ok: false, reason: 'Already under contract' };
    if (org.readiness < c.minReadiness) return { ok: false, reason: `The county wants ${c.minReadiness}% readiness` };
    return { ok: true, odds: clamp(0.3 + (org.readiness - c.minReadiness) / 60 + d.stations * 0.05 + d.paid.length * 0.05, 0.15, 0.85) };
  }
  if (kind === 'hire') {
    const r = g.roles.find((x) => x.id === arg);
    if (!r) return { ok: false, reason: 'No such role' };
    // Under a parent, career staff are asked for, and the parent pays them.
    if (parent) {
      if (org.readiness < 55) return { ok: false, reason: `${parent.name} won't post career staff to a unit below 55% readiness` };
      return { ok: true, odds: clamp(0.25 + (org.readiness - 55) / 100 + (d.stations - 1) * 0.08 - d.paid.length * 0.06, 0.08, 0.7) };
    }
    const income = d.contracts.reduce((s, c) => s + c.annual, 0);
    if (org.funds < r.salary && income < payroll(d) + r.salary) return { ok: false, reason: `Needs a year's salary ($${r.salary.toLocaleString()}) in funds or contract income to cover it` };
    return { ok: true };
  }
  if (kind === 'paidChief') {
    if (!g.paidChief) return { ok: false, reason: 'No paid post here' };
    if (parent) return { ok: false, reason: `Senior posts are appointed and paid by ${parent.name}` };
    if (d.paidChief) return { ok: false, reason: 'Already paid' };
    if (d.paid.length < 2 || !d.contracts.length) return { ok: false, reason: 'Needs at least two paid staff and a contract' };
    // The board of the incorporated agency decides.
    return { ok: true, odds: clamp(0.25 + (org.readiness - 60) / 80 + (boardMood(org) - 50) / 100, 0.15, 0.85) };
  }
  return { ok: false, reason: 'Unknown action' };
}

/** What opening a station costs the unit itself (a parent pays most of it). */
export const stationShare = (org, g) => Math.round(g.stationCost * (1 - (parentOf(org)?.funds ?? 0) * 0.85));

function staffPerson(rng, role) {
  const gender = rng.pick(['male', 'female']);
  const n = randomName(rng, gender);
  return { id: rng.id('vm_'), name: `${n.firstName} ${n.lastName}`, gender, age: rng.int(24, 55), rankIndex: 2, title: role, paid: role, years: 0, rel: rng.int(45, 70), performance: rng.int(60, 85), discipline: 0 };
}
/** A paid staff member joins the roster as a person. */
function addStaffMember(ctx, org, r, parentPaid) {
  const p = staffPerson(ctx.rng, r.role);
  org.people[p.id] = p;
  org.district.paid.push({ id: `${r.id}${org.district.paid.length}`, role: r.role, salary: r.salary, readiness: r.readiness, funds: parentPaid ? 0 : r.funds ?? 0, personId: p.id, ...(parentPaid ? { parentPaid: true } : {}) });
  return p;
}

/** A growth action by the agency's leader (arg is the neighbour, contract or role id). */
export function growthAction(ctx, org, service, member, kind, arg) {
  const { state, rng } = ctx;
  const g = growthOf(service.id);
  const d = districtOf(org, rng);
  const check = growthCheck(state, org, kind, arg);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const parent = parentOf(org);
  if (kind === 'expand') {
    if (check.odds && !rng.chance(check.odds)) return ctx.log(`${parent.name} turned down the case for a new ${g.stationWord} this year.`, '📄', 'warn');
    org.funds -= stationShare(org, g);
    d.stations += 1;
    org.strength = (org.strength ?? memberCount(org)) + 8;
    ctx.emit('volunteer:grew', { orgId: org.id, serviceId: service.id, stations: 1 });
    org.recruited = (org.recruited ?? 0) + 6;
    org.readiness = Math.max(0, org.readiness - 5);
    return ctx.log(`${org.name} opened its ${d.stations === 2 ? 'second' : `${d.stations}th`} ${g.stationWord}. Response times on the far side of the district dropped by minutes.`, service.icon, 'milestone');
  }
  if (kind === 'merge') {
    const n = d.neighbors.find((x) => x.id === arg);
    if (!rng.chance(check.odds)) {
      n.readiness = Math.min(100, n.readiness + 5);
      return ctx.log(`${n.name}'s members voted down the merger. Old loyalties run deep.`, '🗳️', 'warn');
    }
    d.neighbors = d.neighbors.filter((x) => x !== n);
    d.stations += n.stations;
    org.funds += n.funds;
    // Their members join the roster now, keeping their experience, and the agency's strength grows by them.
    org.strength = (org.strength ?? memberCount(org)) + n.members;
    for (let i = 0; i < n.members; i++) {
      const gender = rng.pick(['male', 'female']);
      const nm = randomName(rng, gender);
      const rank = rng.weighted([[0, 3], [1, 4], [2, 3], [3, 2]], ([, w]) => w)[0];
      const p = { id: rng.id('vm_'), name: `${nm.firstName} ${nm.lastName}`, gender, age: rng.int(19, 66), rankIndex: rank, title: service.ranks[rank]?.title ?? '', years: rng.int(1, 20), rel: rng.int(30, 60), performance: rng.int(40, 80), discipline: 0, from: n.name };
      org.people[p.id] = p;
    }
    (d.absorbed ??= []).push(n.name);
    member.xp += 15;
    // Their apparatus and gear come too.
    ctx.emit('volunteer:grew', { orgId: org.id, serviceId: service.id, stations: n.stations, absorbed: n.name, worn: struggling(n) });
    return ctx.log(`${n.name} merged into ${org.name}${parent ? ` with ${parent.name}'s approval` : ''}: ${n.members} members, ${n.stations} station${n.stations > 1 ? 's' : ''}, their apparatus and $${n.funds.toLocaleString()} came with it.`, '🤝', 'milestone');
  }
  if (kind === 'contract') {
    const c = g.contracts.find((x) => x.id === arg);
    if (!rng.chance(check.odds)) return ctx.log(`The county awarded the ${c.name.toLowerCase()} to another provider.`, '📄', 'warn');
    const annual = rng.int(c.annual[0] / 1000, c.annual[1] / 1000) * 1000;
    d.contracts.push({ id: c.id, name: c.name, annual, minReadiness: c.minReadiness, until: state.character.age + c.years });
    incorporate(ctx, org, 'To sign a public contract,');
    return ctx.log(`${org.name} won the ${c.name}: $${annual.toLocaleString()} a year for ${c.years} years — if readiness stays at ${c.minReadiness}% or better.`, '📄', 'milestone');
  }
  if (kind === 'hire') {
    const r = g.roles.find((x) => x.id === arg);
    if (parent) {
      if (!rng.chance(check.odds)) return ctx.log(`${parent.name} had no career staff to spare for ${org.name} this year.`, '📄', 'warn');
      const p = addStaffMember(ctx, org, r, true);
      return ctx.log(`${parent.name} posted career staff to ${org.name}: ${p.name}, ${r.role.toLowerCase().replace(/^paid /, '')}, on the parent's payroll.`, '💼', 'good');
    }
    incorporate(ctx, org, 'To become an employer,');
    const p = addStaffMember(ctx, org, r, false);
    return ctx.log(`${org.name} hired its ${d.paid.length === 1 ? 'first' : 'next'} paid staff member: ${p.name}, ${r.role.toLowerCase()}.${d.paid.length === 1 ? ' It is now a combination department: paid staff and volunteers.' : ''}`, '💼', 'good');
  }
  if (kind === 'paidChief') {
    if (!rng.chance(check.odds)) {
      for (const b of org.corp?.board ?? []) b.rel = Math.max(0, b.rel - 3);
      return ctx.log('The board voted to keep the chief a volunteer post — for now.', '🗳️', 'warn');
    }
    d.paidChief = true;
    const partTime = Boolean(state.career?.job);
    return ctx.log(`The board of ${org.name} made your post a paid one: ${g.paidChief.title}${partTime ? ' (part-time, alongside your day job)' : ' and chief executive of the corporation'}, $${chiefPay(state, g).toLocaleString()} a year.`, '💼', 'milestone');
  }
  return null;
}

/** The paid chief's salary: full-time, or part-time alongside another job. */
export const chiefPay = (state, g) => Math.round(g.paidChief.salary * (state.career?.job ? 0.4 : 1));

/** Yearly: neighbours drift, contracts pay and judge you, payroll is met (or isn't). */
export function growthTick(ctx, org, service, member, leading) {
  const { state, rng } = ctx;
  const g = growthOf(service.id);
  if (!g) return;
  const d = districtOf(org, rng);
  for (const n of d.neighbors) {
    n.members = Math.max(2, n.members + rng.int(-4, 3));
    n.readiness = Math.round(clamp(n.readiness + rng.int(-8, 6), 5, 95));
    n.funds = Math.max(0, n.funds + rng.int(-25, 15) * 1000);
    if (struggling(n) && leading && rng.chance(0.15) && !state.prompts.some((p) => p.type === 'emergency.mergeOffer')) {
      ctx.prompt({ type: 'emergency.mergeOffer', icon: '🤝', title: `${n.name} Asks to Merge`, text: `${n.name} is down to ${n.members} active members and $${n.funds.toLocaleString()}. Its officers asked whether ${org.name} would take them in.`, options: [{ id: 'yes', label: '🤝 Bring it to a vote' }, { id: 'no', label: '🙅 Not now' }], data: { serviceId: service.id, neighbor: n.id } });
    }
  }
  // Contracts: paid while you deliver.
  for (const c of [...d.contracts]) {
    if (org.readiness < c.minReadiness - 5 && rng.chance(0.5)) {
      d.contracts = d.contracts.filter((x) => x !== c);
      ctx.log(`The county cancelled ${org.name}'s ${c.name.toLowerCase()}: readiness fell to ${org.readiness}%.`, '📄', 'bad');
      continue;
    }
    org.funds += c.annual;
    if (state.character.age >= c.until) {
      d.contracts = d.contracts.filter((x) => x !== c);
      if (org.readiness >= c.minReadiness && rng.chance(0.75)) {
        d.contracts.push({ ...c, until: state.character.age + 3 });
        if (leading) ctx.log(`The county renewed ${org.name}'s ${c.name.toLowerCase()}.`, '📄', 'good');
      } else if (leading) ctx.log(`${org.name}'s ${c.name.toLowerCase()} expired and went out to bid elsewhere.`, '📄', 'warn');
    }
  }
  // Staff who left are replaced, or the post goes.
  for (const p of [...d.paid]) {
    if (!p.personId || org.people[p.personId]) continue;
    if (rng.chance(0.7)) {
      const np = staffPerson(rng, p.role);
      org.people[np.id] = np;
      p.personId = np.id;
    } else d.paid = d.paid.filter((x) => x !== p);
  }
  // Payroll (with employer on-costs) and what paid staff add; a corporation also carries insurance and an audit.
  const pay = Math.round((payroll(d) + (d.paidChief ? chiefPay(state, g) : 0)) * (org.corp ? 1 + ON_COST : 1)) + (org.corp ? corpOverhead(d) : 0);
  org.funds -= pay;
  org.funds += Math.round(d.paid.reduce((s, p) => s + (p.funds ?? 0), 0) * d.contracts.reduce((s, c) => s + c.annual, 0));
  while (org.funds < 0 && d.paid.some((p) => !p.parentPaid)) {
    const cut = [...d.paid].reverse().find((p) => !p.parentPaid);
    d.paid = d.paid.filter((p) => p !== cut);
    if (cut.personId) delete org.people[cut.personId];
    org.funds += cut.salary;
    if (leading) ctx.log(`${org.name} couldn't make payroll and laid off its ${cut.role.toLowerCase()}.`, '📉', 'bad');
  }
  if (org.corp) for (const b of org.corp.board) b.rel = Math.round(clamp(b.rel + (org.readiness - 60) / 10 + (org.funds > 0 ? 1 : -4) + rng.int(-3, 3), 0, 100));
  if (org.funds < 0 && d.paidChief) {
    d.paidChief = false;
    org.funds += chiefPay(state, g);
    if (leading) ctx.log('The money ran out: the chief\'s post went back to being a volunteer one.', '📉', 'bad');
  }
  org.readiness = Math.round(clamp(org.readiness + d.paid.reduce((s, p) => s + (p.readiness ?? 0), 0) * 0.5 + (d.stations - 1) * 1, 0, 100));
  if (leading && d.paidChief) ctx.earn(chiefPay(state, g), `${g.paidChief.title} — ${org.name}`, { wage: true });
  // The paid post is the chief's: it goes back to the board when you stop being chief.
  else if (d.paidChief) d.paidChief = false;
}

/** Coverage multiplier on calls and members: more stations, more of both. */
export const districtScale = (org) => (org?.district ? 1 + (org.district.stations - 1) * 0.6 : 1);
