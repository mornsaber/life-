/**
 * The holding company as an employer: a headquarters office, an executive
 * team and the staff under them — and mergers between subsidiaries in the
 * same line of business.
 *
 * state.business.conglomerate gains:
 *   office      virtual | suite | floor | tower | own   (own: a suite in an office building you own)
 *   officePropertyId
 *   executives  { [role]: { name, skill, salary, since } }
 *
 * Executives cost real money and each improves the whole group a little
 * every year (more with more skill). Your office decides how many
 * executives and headquarters staff you can house.
 */
import { clamp } from '../../core/Random.js';
import { randomName } from '../../core/State.js';
import { REGIONS } from '../life/Regions.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { valuation } from './Business.js';
import { syncBusinessOrg, releaseBusinessOrg, locationsByRegion, openBranch } from '../org/Businesses.js';
import { marketRent } from '../realestate/PropertyMarket.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
const group = (state) => state.business?.conglomerate ?? null;
const subs = (state) => [state.business.current, ...(state.business.holdings ?? [])].filter(Boolean);
const groupRevenue = (state) => subs(state).reduce((s, b) => s + (b.lastYear?.revenue ?? 0), 0);

export const EXEC_ROLES = {
  president: { title: 'Group President & CEO', icon: '🧭', base: 420000, desc: 'Runs the group day to day: every subsidiary\'s management gets sharper (quality and productivity).' },
  cfo: { title: 'Chief Financial Officer', icon: '📊', base: 320000, desc: 'Invests the treasury (interest on idle cash) and tightens shared services.' },
  coo: { title: 'Chief Operating Officer', icon: '⚙️', base: 310000, desc: 'Operational discipline: subsidiaries\' quality climbs.' },
  cmo: { title: 'Chief Marketing Officer', icon: '📣', base: 260000, desc: 'Group-wide brand work: subsidiaries\' reputations climb.' },
  chro: { title: 'Chief People Officer', icon: '🧑‍🤝‍🧑', base: 230000, desc: 'Pay bands, training and benefits: morale rises, turnover falls.' },
  counsel: { title: 'General Counsel', icon: '⚖️', base: 290000, desc: 'Keeps the group out of trouble: lower legal and audit costs at headquarters.' },
  corpdev: { title: 'Head of Corporate Development', icon: '🤝', base: 270000, desc: 'A deal team: acquisitions cost less.' },
};

export const OFFICES = {
  virtual: { name: 'Virtual office', icon: '📮', rent: 0, execs: 2, staff: 3, desc: 'A registered agent and a mail drop. Room for two executives working remotely.' },
  suite: { name: 'Executive suite', icon: '🏢', rent: 120000, execs: 4, staff: 10, desc: 'A furnished suite downtown for a small headquarters team.' },
  floor: { name: 'Downtown office floor', icon: '🏙️', rent: 480000, execs: 7, staff: 35, rep: 1, desc: 'A full floor: the whole executive team and a real corporate staff. A little prestige.' },
  tower: { name: 'Corporate headquarters building', icon: '🏛️', rent: 1600000, execs: 7, staff: 120, rep: 2, minRevenue: 40_000_000, desc: 'Your name on the building. Prestige every subsidiary feels.' },
  own: { name: 'Your own office building', icon: '🏢', rent: 0, execs: 7, staff: 35, rep: 1, desc: 'Headquarters leases a suite in a building you own: the rent comes back to you.' },
};

const regionCol = (state) => REGIONS[state.character.regionId]?.col ?? 1;
export const officeOf = (c) => OFFICES[c?.office ?? 'virtual'] ?? OFFICES.virtual;

/** Yearly office rent paid by the treasury. */
export function officeCost(c, state = null) {
  const o = officeOf(c);
  if (c?.office === 'own') return c.ownRent ?? 0;
  return Math.round(o.rent * (state ? regionCol(state) : 1));
}

/** Yearly executive payroll (with benefits). */
export const execPayroll = (c) => Math.round(Object.values(c?.executives ?? {}).reduce((s, e) => s + e.salary, 0) * 1.25);

/** People the holding company employs: executives plus headquarters staff (finance, HR, legal, IT). */
export function hqHeadcount(c) {
  const execs = Object.keys(c?.executives ?? {}).length;
  return execs + Math.min(officeOf(c).staff, 2 + execs * 4);
}

const skillOf = (c, role) => c?.executives?.[role]?.skill ?? 0;
/** How much an executive moves the needle: 0 (nobody) to ~2.3 (a star). */
const lift = (c, role) => skillOf(c, role) / 40;

/** Discount the deal team gets on acquisitions. */
export const dealDiscount = (c) => (c?.executives?.corpdev ? Math.round(skillOf(c, 'corpdev') / 10) / 100 : 0);
/** Share of headquarters overhead the general counsel saves. */
export const counselSaving = (c) => (c?.executives?.counsel ? skillOf(c, 'counsel') / 900 : 0);

/** A salary for an executive of this skill at a group this size. */
export function execSalary(state, role, skill) {
  const size = clamp(Math.sqrt(groupRevenue(state) / 20_000_000), 0.6, 3);
  return Math.round(EXEC_ROLES[role].base * (0.7 + skill / 150) * size / 1000) * 1000;
}

/** Three candidates for a role. */
export function execCandidates(rng, state, role) {
  return Array.from({ length: 3 }, () => {
    const g = rng.pick(['male', 'female']);
    const n = randomName(rng, g);
    const skill = rng.int(42, 94);
    return { name: `${n.firstName} ${n.lastName}`, skill, salary: execSalary(state, role, skill), from: rng.pick(['a Fortune 500 company', 'a private-equity portfolio company', 'a rival group', 'a Big Four accounting firm', 'a regional chain', 'a consulting firm']) };
  });
}

export function hireExec(ctx, role) {
  const { state, rng } = ctx;
  const c = group(state);
  if (!c || !EXEC_ROLES[role]) return;
  if (c.executives?.[role]) return ctx.toast(`You already have a ${EXEC_ROLES[role].title.toLowerCase()}.`, 'warn');
  if (Object.keys(c.executives ?? {}).length >= officeOf(c).execs) return ctx.toast(`Your ${officeOf(c).name.toLowerCase()} has room for ${officeOf(c).execs} executives — move to a bigger office.`, 'warn');
  const candidates = execCandidates(rng, state, role);
  ctx.prompt({
    type: 'business.execHire',
    icon: EXEC_ROLES[role].icon,
    title: `Hiring a ${EXEC_ROLES[role].title}`,
    text: `An executive search firm sent three finalists. ${EXEC_ROLES[role].desc}`,
    options: [
      ...candidates.map((x, i) => ({ id: `c${i}`, label: `👔 ${x.name} — skill ${x.skill}`, hint: `${money(x.salary)}/yr · from ${x.from}` })),
      { id: 'none', label: '↩️ Keep looking' },
    ],
    data: { role, candidates },
  });
}

export function resolveExecHire(ctx, data, optionId) {
  const c = group(ctx.state);
  const pick = data.candidates[Number(String(optionId).slice(1))];
  if (!c || !pick || optionId === 'none') return;
  c.executives ??= {};
  c.executives[data.role] = { ...pick, since: ctx.state.character.age };
  // A search fee: a third of first-year pay.
  c.treasury -= Math.round(pick.salary / 3);
  ctx.log(`${c.name} hired ${pick.name} as ${EXEC_ROLES[data.role].title} (${money(pick.salary)}/yr).`, EXEC_ROLES[data.role].icon, 'milestone');
}

export function fireExec(ctx, role) {
  const c = group(ctx.state);
  const e = c?.executives?.[role];
  if (!e) return;
  const severance = Math.round(e.salary * 0.75);
  c.treasury -= severance;
  delete c.executives[role];
  ctx.log(`${c.name} parted ways with ${e.name}, its ${EXEC_ROLES[role].title.toLowerCase()} (${money(severance)} severance).`, '🚪', 'warn');
}

/** Ownable office buildings in your region with a free suite. */
export function ownOffices(state) {
  return (state.housing?.properties ?? []).filter((p) => p.type === 'office' && !p.project && p.regionId === state.character.regionId && ((p.tenants ?? []).length < 10 || (p.tenants ?? []).some((t) => t.hq)));
}

export function setOffice(ctx, arg) {
  const { state } = ctx;
  const c = group(state);
  if (!c) return;
  const [tier, propId] = String(arg).split(':');
  const o = OFFICES[tier];
  if (!o) return;
  if (o.minRevenue && groupRevenue(state) < o.minRevenue) return ctx.toast(`A headquarters building makes sense past ${money(o.minRevenue)} in group revenue.`, 'warn');
  const execs = Object.keys(c.executives ?? {}).length;
  if (execs > o.execs) return ctx.toast(`Your ${execs} executives won't fit in a ${o.name.toLowerCase()}.`, 'warn');
  moveOut(state, c);
  if (tier === 'own') {
    const prop = ownOffices(state).find((p) => p.id === propId);
    if (!prop) return ctx.toast('You need an office building of your own here with a free suite.', 'warn');
    const rent = marketRent(state, 'office', prop.regionId);
    prop.use = 'rental';
    prop.tenants = [...(prop.tenants ?? []), { name: c.name, rent, reliability: 1, yearsLeft: 99, business: true, hq: true }];
    c.officePropertyId = prop.id;
    c.ownRent = rent * 12;
  }
  // Moving costs: build-out and furniture.
  c.treasury -= Math.round((o.rent || 60000) * 0.25);
  c.office = tier;
  ctx.log(`${c.name} moved its headquarters into ${tier === 'own' ? 'your own office building' : `a ${o.name.toLowerCase()}`}.`, o.icon, 'milestone');
}

function moveOut(state, c) {
  if (c.office !== 'own') return;
  const prop = (state.housing?.properties ?? []).find((p) => p.id === c.officePropertyId);
  if (prop) prop.tenants = (prop.tenants ?? []).filter((t) => !t.hq);
  c.officePropertyId = null;
  c.ownRent = 0;
}

/** What the executive team and the office do for the group each year. Returns report lines. */
export function execTick(ctx, c, list) {
  const { state, rng } = ctx;
  const lines = [];
  // Selling the building you were housed in ends the lease.
  if (c.office === 'own' && !(state.housing?.properties ?? []).some((p) => p.id === c.officePropertyId)) {
    c.office = 'virtual';
    c.ownRent = 0;
    lines.push('lost its offices when you sold the building');
  }
  const bump = (b, path, by, cap = 100) => {
    const [a, k] = path.split('.');
    const obj = k ? b[a] : b;
    const key = k ?? a;
    obj[key] = Math.round(clamp(obj[key] + by, 0, cap));
  };
  for (const b of list) {
    if (c.executives?.president) { bump(b, 'quality', lift(c, 'president') * 0.6); bump(b, 'staff.productivity', lift(c, 'president')); }
    if (c.executives?.coo) bump(b, 'quality', lift(c, 'coo'));
    if (c.executives?.cmo) bump(b, 'reputation', lift(c, 'cmo'), 92);
    if (c.executives?.chro) bump(b, 'staff.morale', lift(c, 'chro') * 1.3);
    if (officeOf(c).rep) bump(b, 'reputation', officeOf(c).rep * 0.5, 90);
  }
  // The CFO puts idle treasury cash to work.
  if (c.executives?.cfo && c.treasury > 0) {
    const interest = Math.round(c.treasury * (0.02 + skillOf(c, 'cfo') / 4000));
    c.treasury += interest;
    ctx.earn(interest, `${c.name} treasury interest`, { retained: true });
    lines.push(`the CFO earned ${money(interest)} on the treasury`);
  }
  // Executives move on.
  for (const [role, e] of Object.entries(c.executives ?? {})) {
    if (rng.chance(0.06)) {
      delete c.executives[role];
      lines.push(`${e.name} (${EXEC_ROLES[role].title}) left for another company`);
    } else e.salary = Math.round(e.salary * 1.03);
  }
  return lines;
}

/* ------------------------------------------------------------------ */
/* Mergers between subsidiaries                                        */
/* ------------------------------------------------------------------ */

export const MERGE_COST = 40000;

/** Pairs of subsidiaries in the same line of business. */
export function mergeCandidates(state) {
  const byType = {};
  for (const b of subs(state)) if (!BUSINESS_TYPES[b.typeId]?.startup && !b.franchise) (byType[b.typeId] ??= []).push(b);
  return Object.values(byType).filter((l) => l.length > 1);
}

/**
 * Fold one subsidiary into another of the same kind: locations, staff,
 * fleets, contracts, cash and debt combine under the survivor's name. One
 * management team and one back office instead of two.
 */
export function mergeSubsidiaries(ctx, arg, { maxScale }) {
  const { state } = ctx;
  const c = group(state);
  if (!c) return ctx.toast('Form a holding company first.', 'warn');
  const [aId, bId] = String(arg).split(':');
  let a = subs(state).find((x) => x.id === aId);
  let b = subs(state).find((x) => x.id === bId);
  if (!a || !b || a === b || a.typeId !== b.typeId) return ctx.toast('Only two companies in the same line of business can merge.', 'warn');
  // The one you run yourself survives.
  if (b === state.business.current) [a, b] = [b, a];
  if (a.scale + b.scale > maxScale(state, { ...a, role: 'absentee' })) return ctx.toast('The combined company would have more locations than one management team can run.', 'warn');
  const cost = MERGE_COST + Math.round((a.scale + b.scale) * 5000);
  if (c.treasury < cost && state.finances.cash < cost) return ctx.toast(`Lawyers and integration: ${money(cost)}.`, 'warn');
  if (c.treasury >= cost) c.treasury -= cost;
  else ctx.spend(cost, `Merger of ${b.name} into ${a.name}`, { credit: true });
  // b's locations become branches of a, city by city.
  const bLocations = locationsByRegion(state, b);
  const va = Math.max(1, a.valuation ?? 1);
  const vb = Math.max(1, b.valuation ?? 1);
  const w = (x, y) => Math.round((x * va + y * vb) / (va + vb));
  a.ownerPct = Math.round(((a.ownerPct * va + b.ownerPct * vb) / (va + vb)) * 10000) / 10000;
  a.quality = w(a.quality, b.quality);
  a.reputation = w(a.reputation, b.reputation);
  a.staff.morale = w(a.staff.morale, b.staff.morale) - 5;
  a.staff.productivity = w(a.staff.productivity, b.staff.productivity);
  a.scale += b.scale;
  a.staff.headcount += b.staff.headcount;
  a.cash += b.cash;
  a.assets += b.assets;
  a.basis += b.basis;
  a.years = Math.max(a.years, b.years);
  a.debts.loc = (a.debts.loc ?? 0) + (b.debts.loc ?? 0);
  if (b.debts.sba) a.debts.sba = a.debts.sba ? { ...a.debts.sba, balance: a.debts.sba.balance + b.debts.sba.balance, annual: a.debts.sba.annual + b.debts.sba.annual } : b.debts.sba;
  if (a.ops && b.ops) {
    a.ops.units.push(...b.ops.units);
    a.ops.contracts.push(...b.ops.contracts);
    a.ops.offers = [...(a.ops.offers ?? []), ...(b.ops.offers ?? [])];
    if (b.ops.loan) a.ops.loan = a.ops.loan ? { ...a.ops.loan, balance: a.ops.loan.balance + b.ops.loan.balance, annual: a.ops.loan.annual + b.ops.loan.annual } : b.ops.loan;
  }
  a.accounts = [...(a.accounts ?? []), ...(b.accounts ?? [])];
  a.initiatives = { ...(b.initiatives ?? {}), ...(a.initiatives ?? {}) };
  a.licenses = { ...(b.licenses ?? {}), ...(a.licenses ?? {}) };
  a.investors = [...(a.investors ?? []), ...(b.investors ?? [])];
  a.family = [...new Set([...(a.family ?? []), ...(b.family ?? [])])];
  a.taxBook = { expense: (a.taxBook?.expense ?? 0) + (b.taxBook?.expense ?? 0) + cost, capex: (a.taxBook?.capex ?? 0) + (b.taxBook?.capex ?? 0) };
  if (a.lastYear) a.valuation = valuation(a, a.lastYear);
  releaseBusinessOrg(state, b, { closed: true });
  for (const [regionId, n] of Object.entries(bLocations)) for (let i = 0; i < n; i++) openBranch(state, a, regionId);
  state.business.history.push({ name: b.name, typeId: b.typeId, startAge: b.foundedAge, endAge: state.character.age, years: b.years, outcome: `Merged into ${a.name}`, proceeds: 0, orgId: b.orgId ?? null, role: 'absentee' });
  if (state.business.current === b) state.business.current = null;
  state.business.holdings = (state.business.holdings ?? []).filter((x) => x !== b);
  syncBusinessOrg(state, a);
  ctx.log(`${c.name} merged ${b.name} into ${a.name}: ${a.scale} locations and ${a.staff.headcount} staff under one management team (${money(cost)} in legal and integration costs).`, '🔗', 'milestone');
}
