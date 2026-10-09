/**
 * How a company is organized, and what a chief executive can change.
 *
 *   design      functional (the default), regional divisions (each city
 *               runs itself: better local quality, more managers) or lean
 *               (a layer of middle management cut: cheaper, but the people
 *               left carry more)
 *   divisions   corporate functions you can stand up or shut down:
 *               business development, R&D, legal & compliance, people &
 *               culture, procurement — each a real department with a head,
 *               a cost and an effect on the company
 *   spin-off    carve a city's locations out into a separate company you
 *               keep as a holding
 *   public      list the company yourself (an IPO when it qualifies), sell
 *               shares, buy them back, or take it private again
 *
 * Restructuring is the chief executive's job: you need to hold the CEO,
 * president or chair post (or run it yourself), and big moves count against
 * the year's executive moves.
 *
 * biz.structure = { design, divisions: [id], changedAge }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, canAfford } from '../../core/State.js';
import { REGIONS } from '../life/Regions.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { charge } from './TaxBook.js';
import { businessOrg, closeBranch, syncBusinessOrg, locationsByRegion, npcBusiness } from '../org/Businesses.js';
import { addToGroup, holdingsCap, conglomerateOf } from './Conglomerate.js';
import { exitProceeds } from './Business.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;

export const DESIGNS = {
  functional: { label: 'Functional', icon: '🏢', desc: 'One company, organized by function. The default.' },
  regional: { label: 'Regional divisions', icon: '🗺️', desc: 'Each city runs as its own division: +quality where you operate, but every division needs a leader.', minCities: 2 },
  lean: { label: 'Lean (delayered)', icon: '✂️', desc: 'Cut a layer of middle management: payroll −4%, but morale and quality slip.' },
};

export const DIVISIONS = {
  bizdev: { name: 'Business Development', icon: '🤝', minStaff: 20, desc: 'A sales team: +3% revenue.', cost: { revenue: 0.008 } },
  rnd: { name: 'R&D & Innovation', icon: '🔬', minStaff: 40, desc: 'New services and better processes: +2 quality a year.', cost: { revenue: 0.012 } },
  compliance: { name: 'Legal & Compliance', icon: '⚖️', minStaff: 30, desc: 'Halves regulatory fines; better odds in court.', cost: { revenue: 0.004 } },
  people: { name: 'People & Culture', icon: '🧑‍🤝‍🧑', minStaff: 25, desc: '+3 morale a year; unions find less to organize.', cost: { payroll: 0.01 } },
  procurement: { name: 'Procurement', icon: '📦', minStaff: 30, desc: 'Buying power: −2% cost of goods.', cost: { revenue: 0.003 } },
};

export const structureOf = (biz) => biz.structure ?? { design: 'functional', divisions: [] };
export const hasDivision = (biz, id) => structureOf(biz).divisions.includes(id);
const citiesOf = (state, biz) => Object.keys(locationsByRegion(state, biz)).length;

/** Who can restructure: the owner running it, or the owner in a top post. */
export function canRestructure(biz) {
  if (!biz) return { ok: false, reason: 'No business' };
  if (biz.role === 'operator') return { ok: true };
  if (biz.role === 'executive' && biz.ownerPost) return { ok: true };
  return { ok: false, reason: 'Take the CEO, president or chair post first' };
}

/** Effects on the year's books (Business.yearFinancials). */
export function structureEffects(state, biz) {
  const s = structureOf(biz);
  const fx = { revenue: 1, payroll: 1, cogs: 1, cost: 0, costShare: 0, payrollShare: 0 };
  if (s.design === 'lean') fx.payroll *= 0.96;
  if (s.design === 'regional') fx.cost += Math.max(0, citiesOf(state, biz) - 1) * 140_000;
  for (const id of s.divisions) {
    const d = DIVISIONS[id];
    if (!d) continue;
    fx.costShare += d.cost.revenue ?? 0;
    fx.payrollShare += d.cost.payroll ?? 0;
    if (id === 'bizdev') fx.revenue *= 1.03;
    if (id === 'procurement') fx.cogs *= 0.98;
  }
  return fx;
}

/** Once a year: what the design and divisions do to the people and the product. */
export function structureYear(state, biz) {
  const s = biz.structure;
  if (!s) return;
  if (s.design === 'lean') {
    biz.staff.morale = Math.max(0, biz.staff.morale - 2);
    biz.quality = Math.max(0, biz.quality - 1);
  }
  if (s.design === 'regional' && citiesOf(state, biz) >= 2) biz.quality = Math.min(100, biz.quality + 1);
  if (s.divisions.includes('rnd')) biz.quality = Math.min(100, biz.quality + 2);
  if (s.divisions.includes('people')) {
    biz.staff.morale = Math.min(100, biz.staff.morale + 3);
    biz.staff.unionRisk = Math.max(0, (biz.staff.unionRisk ?? 0) - 5);
  }
  // Divisions you stood up become departments with their own heads.
  const org = businessOrg(state, biz);
  if (org) {
    for (const id of s.divisions) if (!org.departments[`div_${id}`]) org.departments[`div_${id}`] = { id: `div_${id}`, name: DIVISIONS[id].name, head: null, headcount: 0, seats: {} };
    for (const k of Object.keys(org.departments)) if (k.startsWith('div_') && !s.divisions.includes(k.slice(4))) delete org.departments[k];
  }
}

function moveAllowed(ctx, biz) {
  const check = canRestructure(biz);
  if (!check.ok) { ctx.toast(check.reason, 'warn'); return false; }
  if (yearlyCount(ctx.state, `business.restructure.${biz.id}`) >= 2) { ctx.toast('Two reorganizations a year is all a company can absorb.', 'warn'); return false; }
  return true;
}

export const StructureActions = {
  /** arg: design id */
  setDesign(ctx, design) {
    const { state } = ctx;
    const biz = state.business.current;
    if (!biz || !DESIGNS[design] || !moveAllowed(ctx, biz)) return;
    const s = (biz.structure ??= { design: 'functional', divisions: [] });
    if (s.design === design) return;
    if (DESIGNS[design].minCities && citiesOf(state, biz) < DESIGNS[design].minCities) return ctx.toast('Regional divisions need locations in two or more cities.', 'warn');
    if (biz.staff.headcount < 15) return ctx.toast('A company this small has nothing to reorganize.', 'warn');
    bumpYearly(state, `business.restructure.${biz.id}`);
    // A reorganization costs a little and rattles people.
    const cost = Math.round(clamp(biz.staff.headcount * 1500, 20000, 2_000_000));
    charge(biz, cost);
    biz.staff.morale = Math.max(0, biz.staff.morale - (design === 'lean' ? 10 : 4));
    if (design === 'lean') {
      const cut = Math.min(biz.staff.headcount, Math.max(1, Math.round(biz.staff.headcount * 0.04)));
      biz.staff.headcount -= cut;
    }
    s.design = design;
    s.changedAge = state.character.age;
    syncBusinessOrg(state, biz);
    ctx.log(`You reorganized ${biz.name}: ${DESIGNS[design].label.toLowerCase()} (${money(cost)} in consultants and severance).`, DESIGNS[design].icon, 'milestone');
  },
  /** arg: division id — stand it up, or shut it down. */
  toggleDivision(ctx, id) {
    const { state } = ctx;
    const biz = state.business.current;
    const d = DIVISIONS[id];
    if (!biz || !d || !moveAllowed(ctx, biz)) return;
    const s = (biz.structure ??= { design: 'functional', divisions: [] });
    bumpYearly(state, `business.restructure.${biz.id}`);
    if (s.divisions.includes(id)) {
      s.divisions = s.divisions.filter((x) => x !== id);
      biz.staff.morale = Math.max(0, biz.staff.morale - 3);
      const org = businessOrg(state, biz);
      if (org?.departments[`div_${id}`]) {
        for (const pid of [org.departments[`div_${id}`].head].filter(Boolean)) delete org.people[pid];
        delete org.departments[`div_${id}`];
      }
      syncBusinessOrg(state, biz);
      return ctx.log(`You shut down ${biz.name}'s ${d.name} division.`, '🔒', 'warn');
    }
    if (biz.staff.headcount < d.minStaff) return ctx.toast(`${d.name} makes sense from ${d.minStaff} staff.`, 'warn');
    s.divisions.push(id);
    // Staffing it: a few hires and a head.
    const hires = Math.max(2, Math.round(biz.staff.headcount * 0.02));
    biz.staff.headcount += hires;
    biz.staff.extra = { ...(biz.staff.extra ?? {}), [`div_${id}`]: hires };
    const org = businessOrg(state, biz);
    if (org && !org.departments[`div_${id}`]) org.departments[`div_${id}`] = { id: `div_${id}`, name: d.name, head: null, headcount: 0, seats: {} };
    syncBusinessOrg(state, biz);
    ctx.log(`${biz.name} stood up a ${d.name} division (${hires} hires). ${d.desc}`, d.icon, 'milestone');
    return undefined;
  },
  /** arg: regionId — carve that city's locations out into a separate company you keep. */
  spinOff(ctx, regionId) {
    const { state } = ctx;
    const biz = state.business.current;
    if (!biz || !moveAllowed(ctx, biz)) return;
    const org = businessOrg(state, biz);
    const home = org?.regionId;
    if (!org || regionId === home) return ctx.toast('You can\'t spin off the home market.', 'warn');
    if ((state.business.holdings ?? []).length >= Math.max(3, conglomerateOf(state) ? holdingsCap(state) : 3)) return ctx.toast('You hold as many companies as you can manage — form or grow a holding company.', 'warn');
    const branches = org.branches.filter((b) => (org.departments[b.deptId]?.regionId ?? b.regionId) === regionId);
    if (!branches.length) return;
    bumpYearly(state, `business.restructure.${biz.id}`);
    const per = (biz.valuation ?? 0) / Math.max(1, biz.scale);
    for (const b of branches) closeBranch(state, biz, b.deptId);
    const n = branches.length;
    const moved = Math.round(biz.staff.headcount * n / Math.max(1, biz.scale));
    biz.staff.headcount = Math.max(1, biz.staff.headcount - moved);
    biz.scale -= n;
    const cashShare = Math.round(Math.max(0, biz.cash) * n / (biz.scale + n));
    biz.cash -= cashShare;
    syncBusinessOrg(state, biz);
    // The new company: an organization of its own in that city, held by you (or your holding company).
    const o = npcBusiness(state, biz.typeId, regionId, { name: `${biz.name} ${(REGIONS[regionId]?.name ?? '').split(',')[0]}`, reputation: biz.reputation });
    o.business.scale = n;
    o.business.staff = moved;
    o.business.years = biz.years;
    const spun = addToGroup(ctx, o, Math.round(per * n));
    spun.cash = cashShare;
    spun.ownerPct = biz.ownerPct;
    spun.basis = Math.round((biz.basis ?? 0) * n / (biz.scale + n));
    biz.basis = Math.max(0, (biz.basis ?? 0) - spun.basis);
    spun.quality = biz.quality;
    ctx.log(`You spun off ${biz.name}'s ${n} ${(REGIONS[regionId]?.name ?? 'regional').split(',')[0]} location${n === 1 ? '' : 's'} as ${spun.name}, a separate company you hold.`, '🧬', 'milestone');
  },
};

/* ------------------------------------------------------------------ */
/* Public markets                                                      */
/* ------------------------------------------------------------------ */

export const IPO_MIN_REVENUE = 25_000_000;
export function ipoEligibility(state, biz) {
  if (!biz) return { ok: false, reason: 'No business' };
  if (biz.public) return { ok: false, reason: 'Already public' };
  if (BUSINESS_TYPES[biz.typeId]?.startup) return { ok: false, reason: 'Startups list through a venture IPO' };
  if (biz.entity !== 'ccorp') return { ok: false, reason: 'Convert to a C-corporation first' };
  if ((biz.lastYear?.revenue ?? 0) < IPO_MIN_REVENUE) return { ok: false, reason: `${money(IPO_MIN_REVENUE)}+ revenue` };
  if ((biz.lastYear?.netIncome ?? 0) <= 0) return { ok: false, reason: 'Needs a profitable year' };
  if ((biz.books ?? []).length < 3 && biz.years < 3) return { ok: false, reason: 'Three years of audited books' };
  return { ok: true };
}

/** What bankers think it's worth on the market: a premium in good times, a discount in a recession. */
export const ipoPrice = (state, biz) => Math.round((biz.valuation ?? 0) * ({ expansion: 1.3, peak: 1.4, recession: 0.9 }[state.economy?.phase] ?? 1.15));

export const PublicActions = {
  goPublic(ctx) {
    const { state } = ctx;
    const biz = state.business.current;
    const check = ipoEligibility(state, biz);
    if (!check.ok) return ctx.toast(check.reason, 'warn');
    if (yearlyCount(state, `business.ipo.${biz.id}`)) return ctx.toast('The bankers will try again next year.', 'warn');
    bumpYearly(state, `business.ipo.${biz.id}`);
    const price = ipoPrice(state, biz);
    // Underwriting fees and a roadshow.
    charge(biz, Math.round(price * 0.2 * 0.06));
    ctx.prompt({
      type: 'business.publicOffering', icon: '🔔', title: `${biz.name}: The Roadshow`,
      text: `Underwriters will price ${biz.name} at about ${money(price)}. The company sells 20% in new shares; you sell 10% of yours. Public companies answer to a public board and shareholders every quarter.`,
      options: [{ id: 'ipo', label: '🔔 Ring the bell' }, { id: 'wait', label: '⏳ Pull the offering' }],
      data: { price, id: biz.id },
    });
    return undefined;
  },
  /** Sell 5% of the company from your shares on the market. */
  sellShares(ctx) {
    const { state } = ctx;
    const biz = state.business.current;
    if (!biz?.public) return;
    if (biz.ownerPct <= 0.1) return ctx.toast('You\'re down to a 10% stake.', 'warn');
    if (yearlyCount(state, `business.shares.${biz.id}`) >= 2) return ctx.toast('Insider-trading windows: twice a year.', 'warn');
    bumpYearly(state, `business.shares.${biz.id}`);
    const pct = Math.min(0.05, biz.ownerPct - 0.1);
    const price = biz.valuation;
    const portion = { ...biz, ownerPct: pct, basis: Math.round(biz.basis * pct / biz.ownerPct) };
    const e = exitProceeds(portion, price);
    state.finances.cash += e.basisBack + e.qsbs;
    if (e.taxable) ctx.earn(e.taxable, `Share sale — ${biz.name}`, { ltcg: true });
    biz.basis -= portion.basis;
    biz.ownerPct = Math.round((biz.ownerPct - pct) * 10000) / 10000;
    ctx.log(`You sold ${Math.round(pct * 100)}% of ${biz.name} on the market for ${money(e.proceeds)}. You own ${Math.round(biz.ownerPct * 100)}%.`, '📉', 'finance');
  },
  /** The company buys back 5% of its shares with its own cash: your stake grows. */
  buyback(ctx) {
    const { state } = ctx;
    const biz = state.business.current;
    if (!biz?.public) return;
    const outside = 1 - biz.ownerPct;
    if (outside <= 0.05) return;
    const pct = Math.min(0.05, outside - 0.05);
    const cost = Math.round(biz.valuation * pct * 1.05);
    if (biz.cash < cost) return ctx.toast(`A 5% buyback costs ${money(cost)} — the company has ${money(biz.cash)}.`, 'warn');
    biz.cash -= cost;
    biz.ownerPct = Math.round((biz.ownerPct / (1 - pct)) * 10000) / 10000;
    ctx.log(`${biz.name} bought back ${Math.round(pct * 100)}% of its stock (${money(cost)}). Your stake rose to ${Math.round(biz.ownerPct * 100)}%.`, '🔁', 'finance');
  },
  /** Buy out the public shareholders at a premium and delist. */
  takePrivate(ctx) {
    const { state } = ctx;
    const biz = state.business.current;
    if (!biz?.public) return;
    const outside = 1 - biz.ownerPct;
    const cost = Math.round(biz.valuation * outside * 1.3);
    const fromCompany = Math.min(Math.max(0, biz.cash - 500_000), Math.round(cost * 0.4));
    const fromYou = cost - fromCompany;
    if (!canAfford(state, fromYou)) return ctx.toast(`Taking it private costs ${money(cost)} (30% premium) — ${money(fromYou)} from you after the company's cash.`, 'warn');
    biz.cash -= fromCompany;
    ctx.spend(fromYou, `Take-private of ${biz.name}`, { credit: true });
    biz.basis = (biz.basis ?? 0) + fromYou;
    biz.ownerPct = 1;
    biz.investors = (biz.investors ?? []).filter((i) => i.round !== 'public');
    biz.public = null;
    ctx.log(`You took ${biz.name} private for ${money(cost)}. No more quarterly calls.`, '🔒', 'milestone');
  },
};
