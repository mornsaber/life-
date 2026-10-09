/**
 * Conglomerates: a holding company over everything you own. Once you own two
 * or more businesses (or one worth $3M+), you can incorporate a parent
 * company. It:
 *
 *   - lets you hold up to 15 businesses instead of 4
 *   - runs shared services (purchasing, payroll, IT, insurance) that save
 *     every subsidiary a slice of revenue — more the bigger the group —
 *     against the cost of a corporate headquarters
 *   - sweeps cash above each subsidiary's cushion into a central treasury,
 *     rescues subsidiaries that run short, and backs the healthiest ones'
 *     growth
 *   - pays you a dividend from the treasury each year
 *   - buys businesses of any kind in your market straight into the group
 *
 * state.business.conglomerate = { name, foundedAge, treasury, payout,
 *   acquisitions, lastReport: [lines] }
 */
import { clamp } from '../../core/Random.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { newBusiness, yearFinancials, valuation, LICENSEE_ONLY, holdsLicense } from './Business.js';
import { grandfatherLicenses } from './BusinessLicenses.js';
import { syncBusinessOrg, sizeForHeadcount } from '../org/Businesses.js';
import { canAfford } from '../../core/State.js';

export const FORM_COST = 25000;
export const CONGLOMERATE_HOLDINGS = 15;
export const BASE_HOLDINGS = 4;
const AVERAGE = { float: (a, b) => (a + b) / 2, int: (a, b) => Math.round((a + b) / 2), chance: () => false, pick: (xs) => xs[0], id: () => 'probe', next: () => 0.5, shuffle: (xs) => xs };
const money = (x) => `$${Math.round(x).toLocaleString()}`;

export const conglomerateOf = (state) => state.business?.conglomerate ?? null;
export const subsidiaries = (state) => [state.business.current, ...(state.business.holdings ?? [])].filter(Boolean);
export const holdingsCap = (state) => (conglomerateOf(state) ? CONGLOMERATE_HOLDINGS : BASE_HOLDINGS);

export function formEligibility(state) {
  if (conglomerateOf(state)) return { ok: false, reason: 'You already run a holding company' };
  const subs = subsidiaries(state);
  const value = subs.reduce((s, b) => s + (b.valuation ?? 0) * b.ownerPct, 0);
  if (subs.length < 2 && value < 3_000_000) return { ok: false, reason: 'Own two businesses, or one worth $3M+' };
  if (!canAfford(state, FORM_COST)) return { ok: false, reason: `${money(FORM_COST)} in legal and accounting fees` };
  return { ok: true };
}

/** Shared services save each subsidiary this share of revenue. */
export const synergyRate = (n) => (n >= 2 ? Math.min(0.03, 0.006 * n) : 0);
/** Headquarters: executives, audit, legal. */
export const hqCost = (revenue) => Math.round(150000 + revenue * 0.004);

/**
 * The year at headquarters, after every subsidiary has closed its books.
 * `deps.maxScale`/`deps.expansionCost` come from the engine.
 */
export function conglomerateTick(ctx, deps) {
  const { state } = ctx;
  const c = conglomerateOf(state);
  if (!c) return;
  const subs = subsidiaries(state);
  const lines = [];
  if (!subs.length) {
    // Nothing left to hold: pay out what's left and wind it up.
    state.finances.cash += c.treasury;
    ctx.log(`${c.name} had nothing left to hold and was wound up; ${money(c.treasury)} came back to you.`, '🏛️', 'warn');
    state.business.conglomerate = null;
    return;
  }
  const revenue = subs.reduce((s, b) => s + (b.lastYear?.revenue ?? 0), 0);
  // Shared services.
  const rate = synergyRate(subs.length);
  let saved = 0;
  for (const b of subs) {
    const gain = Math.round((b.lastYear?.revenue ?? 0) * rate);
    b.cash += gain;
    saved += gain;
  }
  if (saved) lines.push(`shared services saved the group ${money(saved)}`);
  // Sweep cash above each subsidiary's cushion (your share of it — co-owners keep theirs).
  let swept = 0;
  for (const b of subs) {
    const cushion = Math.max(25000, (b.lastYear?.revenue ?? 0) * 0.15);
    const excess = Math.max(0, b.cash - cushion);
    const take = Math.round(excess * 0.7 * b.ownerPct);
    b.cash -= take;
    swept += take;
  }
  c.treasury += swept;
  if (swept) lines.push(`swept ${money(swept)} of spare cash to the treasury`);
  const hq = hqCost(revenue);
  c.treasury -= hq;
  // Rescue anyone short of cash before they bounce payroll.
  for (const b of subs.filter((x) => x.cash < 0)) {
    const need = Math.min(-b.cash + 10000, Math.max(0, c.treasury));
    if (!need) continue;
    b.cash += need;
    c.treasury -= need;
    lines.push(`covered a ${money(need)} shortfall at ${b.name}`);
  }
  // Back the best grower: fund its next location.
  const growers = subs.filter((b) => b.plan && ['steady', 'aggressive'].includes(b.plan.strategy) && (b.lastYear?.netIncome ?? 0) > 0 && b.scale < deps.maxScale(state, b) && !BUSINESS_TYPES[b.typeId].startup)
    .sort((a, b) => (b.lastYear.netIncome / Math.max(1, b.lastYear.revenue)) - (a.lastYear.netIncome / Math.max(1, a.lastYear.revenue)));
  const pick = growers[0];
  if (pick && c.treasury > deps.expansionCost(pick) * 1.5) {
    const amount = deps.expansionCost(pick);
    pick.cash += amount;
    c.treasury -= amount;
    lines.push(`gave ${pick.name} ${money(amount)} to open another location`);
  }
  // Dividend to you; the rest stays as a reserve.
  const reserve = Math.max(100000, hq);
  const dividend = Math.round(Math.max(0, c.treasury - reserve) * c.payout);
  if (dividend > 0) {
    c.treasury -= dividend;
    state.finances.cash += dividend;
    lines.push(`paid you a ${money(dividend)} dividend`);
  }
  // An overdrawn treasury borrows from you rather than going negative.
  if (c.treasury < 0) {
    state.finances.cash += c.treasury;
    lines.push(`you covered ${money(-c.treasury)} of headquarters costs`);
    c.treasury = 0;
  }
  c.lastReport = lines;
  ctx.log(`🏛️ ${c.name}: ${subs.length} companies, ${money(revenue)} revenue. Headquarters (${money(hq)}) ${lines.join('; ')}.`, '🏛️', 'finance');
}

/** NPC businesses in your market the group could buy (any industry). */
export function acquisitionTargets(state) {
  const regionId = state.business.current ? state.orgs?.byId?.[state.business.current.orgId]?.regionId ?? state.character.regionId : state.character.regionId;
  return Object.values(state.orgs?.byId ?? {})
    .filter((o) => o.business && !o.closed && o.owner?.kind === 'npc' && o.regionId === regionId && BUSINESS_TYPES[o.business.typeId] && !BUSINESS_TYPES[o.business.typeId].startup)
    .filter((o) => !LICENSEE_ONLY.includes(o.business.typeId) || holdsLicense(state, BUSINESS_TYPES[o.business.typeId]));
}

/** What a business would be as one of yours, and what it costs (valuation plus a control premium). */
export function appraise(state, o) {
  const typeId = o.business.typeId;
  const type = BUSINESS_TYPES[typeId];
  const rep = o.business.reputation ?? 50;
  const probe = newBusiness(AVERAGE, state, typeId, { name: o.name, years: o.business.years ?? 5, scale: Math.max(1, o.business.scale ?? 1), quality: rep, reputation: rep, assets: Math.round(type.cost * 0.4 * (o.business.scale ?? 1)) });
  probe.staff.headcount = Math.max(1, o.business.staff ?? type.staff);
  probe.role = 'absentee';
  const ly = yearFinancials(state, probe, AVERAGE);
  const price = Math.round(Math.max(type.cost * 0.5 * (o.business.scale ?? 1), valuation(probe, ly) * 1.25));
  return { price, profit: ly.netIncome, revenue: ly.revenue };
}

/** Buy an NPC business into the group as a holding run by its management. */
export function acquireCompany(ctx, orgId) {
  const { state, rng } = ctx;
  const c = conglomerateOf(state);
  if (!c) return ctx.toast('Form a holding company first.', 'warn');
  if ((state.business.holdings ?? []).length >= holdingsCap(state)) return ctx.toast(`${c.name} can hold ${holdingsCap(state)} companies.`, 'warn');
  const o = acquisitionTargets(state).find((x) => x.id === orgId);
  if (!o) return;
  const { price } = appraise(state, o);
  const fromTreasury = Math.min(c.treasury, price);
  const rest = price - fromTreasury;
  if (rest > 0 && !canAfford(state, rest)) return ctx.toast(`${money(price)} — the treasury has ${money(c.treasury)}.`, 'warn');
  c.treasury -= fromTreasury;
  if (rest > 0) ctx.spend(rest, `Acquisition of ${o.name}`, { credit: true });
  const typeId = o.business.typeId;
  const rep = o.business.reputation ?? 50;
  const biz = newBusiness(rng, state, typeId, { name: o.name, years: o.business.years ?? 5, scale: Math.max(1, o.business.scale ?? 1), quality: clamp(rep, 30, 85), reputation: rep, cash: Math.round(price * 0.08), assets: Math.round(price * 0.4), basis: price });
  biz.staff.headcount = Math.max(1, o.business.staff ?? BUSINESS_TYPES[typeId].staff);
  biz.role = 'absentee';
  biz.autopilot = true;
  biz.plan = { strategy: 'steady', sinceAge: state.character.age };
  biz.ownedFromAge = state.character.age;
  biz.orgId = o.id;
  biz.regionId = o.regionId;
  o.owner = { kind: 'player', name: `${state.character.firstName} ${state.character.lastName}`, pct: 1 };
  delete o.business.parent;
  o.size = sizeForHeadcount(biz.staff.headcount);
  grandfatherLicenses(state, biz);
  syncBusinessOrg(state, biz);
  state.business.holdings.push(biz);
  c.acquisitions = (c.acquisitions ?? 0) + 1;
  ctx.log(`${c.name} acquired ${o.name} (${BUSINESS_TYPES[typeId].name.toLowerCase()}) for ${money(price)}. Its management stays on, on a steady growth plan.`, '🏛️', 'milestone');
}
