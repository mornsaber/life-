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
 * org.district = { stations, neighbors: [{ id, name, members, readiness, funds, stations }],
 *                  contracts: [{ id, name, annual, minReadiness, until }], paid: [{ id, role, salary }], paidChief }
 */
import { clamp } from '../../core/Random.js';

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
  const word = NAMES[org.serviceId] ?? ['Volunteers'];
  org.district = {
    stations: 1, contracts: [], paid: [], paidChief: false,
    neighbors: Array.from({ length: n }, (_, i) => ({ id: `nb${i}`, name: `${rng.pick(PLACES)} ${rng.pick(word)}`, members: rng.int(6, 30), readiness: rng.int(25, 75), funds: rng.int(5, 120) * 1000, stations: 1 })),
  };
  return org.district;
}

const memberCount = (org) => Object.keys(org.people).length + 1;
const payroll = (d) => d.paid.reduce((s, p) => s + p.salary, 0);
export const struggling = (n) => n.members < 10 || n.readiness < 40 || n.funds < 15000;

/** Can you do this? { ok, reason, odds } for each growth action. */
export function growthCheck(state, org, kind, arg) {
  const g = growthOf(org.serviceId);
  if (!g) return { ok: false, reason: 'Not for this kind of service' };
  const d = org.district;
  if (!d) return { ok: false, reason: 'Not yet' };
  if (kind === 'expand') {
    if (!g.stationCost) return { ok: false, reason: 'No stations to open' };
    if (org.readiness < 60) return { ok: false, reason: 'Get readiness to 60% first' };
    if (memberCount(org) < 15 * d.stations) return { ok: false, reason: `Needs ${15 * d.stations} members to staff another ${g.stationWord}` };
    if (org.funds < g.stationCost) return { ok: false, reason: `Costs $${g.stationCost.toLocaleString()} (funds or a grant)` };
    return { ok: true };
  }
  if (kind === 'merge') {
    const n = d.neighbors.find((x) => x.id === arg);
    if (!n) return { ok: false, reason: 'No such agency' };
    if (!struggling(n)) return { ok: false, reason: `${n.name} is doing fine on its own` };
    if (org.readiness < 55) return { ok: false, reason: 'Your own house needs to be in order (readiness 55%+)' };
    return { ok: true, odds: clamp(0.35 + (org.readiness - 55) / 100 + (n.readiness < 30 ? 0.15 : 0) + (n.members < 6 ? 0.15 : 0), 0.15, 0.85) };
  }
  if (kind === 'contract') {
    const c = g.contracts.find((x) => x.id === arg);
    if (!c) return { ok: false, reason: 'No such contract' };
    if (d.contracts.some((x) => x.id === c.id)) return { ok: false, reason: 'Already under contract' };
    if (org.readiness < c.minReadiness) return { ok: false, reason: `The county wants ${c.minReadiness}% readiness` };
    return { ok: true, odds: clamp(0.3 + (org.readiness - c.minReadiness) / 60 + d.stations * 0.05 + d.paid.length * 0.05, 0.15, 0.85) };
  }
  if (kind === 'hire') {
    const r = g.roles.find((x) => x.id === arg);
    if (!r) return { ok: false, reason: 'No such role' };
    const income = d.contracts.reduce((s, c) => s + c.annual, 0);
    if (org.funds < r.salary && income < payroll(d) + r.salary) return { ok: false, reason: `Needs a year's salary ($${r.salary.toLocaleString()}) in funds or contract income to cover it` };
    return { ok: true };
  }
  if (kind === 'paidChief') {
    if (!g.paidChief) return { ok: false, reason: 'No paid post here' };
    if (d.paidChief) return { ok: false, reason: 'Already paid' };
    if (d.paid.length < 2 || !d.contracts.length) return { ok: false, reason: 'Needs at least two paid staff and a contract' };
    return { ok: true, odds: clamp(0.4 + (org.readiness - 60) / 80, 0.2, 0.85) };
  }
  return { ok: false, reason: 'Unknown action' };
}

/** A growth action by the agency's leader (arg is the neighbour, contract or role id). */
export function growthAction(ctx, org, service, member, kind, arg) {
  const { state, rng } = ctx;
  const g = growthOf(service.id);
  const d = districtOf(org, rng);
  const check = growthCheck(state, org, kind, arg);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  if (kind === 'expand') {
    org.funds -= g.stationCost;
    d.stations += 1;
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
    org.recruited = (org.recruited ?? 0) + n.members;
    (d.absorbed ??= []).push(n.name);
    member.xp += 15;
    return ctx.log(`${n.name} merged into ${org.name}: ${n.members} members, ${n.stations} station${n.stations > 1 ? 's' : ''} and $${n.funds.toLocaleString()} came with it.`, '🤝', 'milestone');
  }
  if (kind === 'contract') {
    const c = g.contracts.find((x) => x.id === arg);
    if (!rng.chance(check.odds)) return ctx.log(`The county awarded the ${c.name.toLowerCase()} to another provider.`, '📄', 'warn');
    const annual = rng.int(c.annual[0] / 1000, c.annual[1] / 1000) * 1000;
    d.contracts.push({ id: c.id, name: c.name, annual, minReadiness: c.minReadiness, until: state.character.age + c.years });
    return ctx.log(`${org.name} won the ${c.name}: $${annual.toLocaleString()} a year for ${c.years} years — if readiness stays at ${c.minReadiness}% or better.`, '📄', 'milestone');
  }
  if (kind === 'hire') {
    const r = g.roles.find((x) => x.id === arg);
    d.paid.push({ id: `${r.id}${d.paid.length}`, role: r.role, salary: r.salary, readiness: r.readiness, funds: r.funds ?? 0 });
    return ctx.log(`${org.name} hired its ${d.paid.length === 1 ? 'first' : 'next'} paid staff member: a ${r.role.toLowerCase()}.`, '💼', 'good');
  }
  if (kind === 'paidChief') {
    if (!rng.chance(check.odds)) return ctx.log('The board and membership voted to keep the chief a volunteer post — for now.', '🗳️', 'warn');
    d.paidChief = true;
    return ctx.log(`${org.name} made your post a paid one: ${g.paidChief.title}, $${g.paidChief.salary.toLocaleString()} a year.`, '💼', 'milestone');
  }
  return null;
}

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
  // Payroll and what paid staff add.
  const pay = payroll(d) + (d.paidChief ? g.paidChief.salary : 0);
  org.funds -= pay;
  org.funds += Math.round(d.paid.reduce((s, p) => s + (p.funds ?? 0), 0) * d.contracts.reduce((s, c) => s + c.annual, 0));
  while (org.funds < 0 && d.paid.length) {
    const cut = d.paid.pop();
    org.funds += cut.salary;
    if (leading) ctx.log(`${org.name} couldn't make payroll and laid off its ${cut.role.toLowerCase()}.`, '📉', 'bad');
  }
  if (org.funds < 0 && d.paidChief) {
    d.paidChief = false;
    org.funds += g.paidChief.salary;
    if (leading) ctx.log('The money ran out: the chief\'s post went back to being a volunteer one.', '📉', 'bad');
  }
  org.readiness = Math.round(clamp(org.readiness + d.paid.reduce((s, p) => s + (p.readiness ?? 0), 0) * 0.5 + (d.stations - 1) * 1, 0, 100));
  if (leading && d.paidChief) ctx.earn(g.paidChief.salary, `${g.paidChief.title} — ${org.name}`, { wage: true });
}

/** Coverage multiplier on calls and members: more stations, more of both. */
export const districtScale = (org) => (org?.district ? 1 + (org.district.stations - 1) * 0.6 : 1);
