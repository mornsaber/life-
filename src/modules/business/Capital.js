/**
 * Moving money between you and your businesses, and buying back equity.
 *
 *   inject     a capital contribution from your own cash: raises your basis
 *   withdraw   a distribution to the owners (co-owners get their share).
 *              Pass-through profit was taxed as it was earned, so taking it
 *              out is tax-free; a C-corp returns your contributed capital
 *              tax-free and pays the rest as a taxed dividend.
 *   treasury   the same, for a holding company's treasury
 *   buyBack    buy out investors and partners, from your pocket or (a
 *              redemption) from the company's cash, at a premium to value
 *
 * Openings: a management team can open several locations a year — more as
 * the chain grows and it has a development team.
 */
import { clamp } from '../../core/Random.js';
import { canAfford } from '../../core/State.js';
import { ENTITIES } from './BusinessTypes.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
export const allBusinesses = (state) => [state.business?.current, ...(state.business?.holdings ?? [])].filter(Boolean);
export const businessById = (state, id) => allBusinesses(state).find((b) => b.id === id) ?? (id ? null : state.business?.current ?? null);

/** Premium investors want to sell back to you. */
export const BUYBACK_PREMIUM = 1.2;

/** Locations a business can open in one year. */
export function openingsPerYear(biz) {
  if (biz.role === 'operator') return 2;
  return clamp(2 + Math.floor((biz.scale ?? 1) / 6), 2, 8);
}

export function inject(ctx, biz, amount) {
  const { state } = ctx;
  const a = Math.round(amount);
  if (!(a > 0)) return;
  if (!canAfford(state, a)) return ctx.toast(`You don't have ${money(a)}.`, 'warn');
  ctx.spend(a, `Capital contribution — ${biz.name}`, { credit: true });
  biz.cash += a;
  biz.basis = (biz.basis ?? 0) + a;
  biz.contributed = (biz.contributed ?? 0) + a;
  ctx.log(`You put ${money(a)} into ${biz.name}. The business account now holds ${money(biz.cash)}.`, '💵', 'finance');
}

/** Most you can take out: cash above a working cushion, and lenders want more left when there's debt. */
export function withdrawable(biz) {
  const debt = (biz.debts?.sba?.balance ?? 0) + (biz.debts?.loc ?? 0) + (biz.ops?.loan?.balance ?? 0);
  const cushion = Math.max(10000, (biz.lastYear?.revenue ?? 0) * 0.05) + (debt ? Math.min(debt, (biz.lastYear?.revenue ?? 0) * 0.1) : 0);
  return Math.max(0, Math.round(biz.cash - cushion));
}

export function withdraw(ctx, biz, amount) {
  const { state } = ctx;
  const a = Math.min(Math.round(amount), withdrawable(biz));
  if (!(a > 0)) return ctx.toast('There\'s no spare cash to take out — the business needs a working cushion.', 'warn');
  biz.cash -= a;
  const mine = Math.round(a * biz.ownerPct);
  const partners = a - mine;
  if (ENTITIES[biz.entity]?.passThrough) {
    // Already taxed as it was earned: a tax-free distribution that lowers your basis.
    state.finances.cash += mine;
    biz.basis = Math.max(0, (biz.basis ?? 0) - mine);
    biz.contributed = Math.max(0, (biz.contributed ?? 0) - mine);
  } else {
    // C-corp: your contributed capital comes back first; the rest is a dividend.
    const back = Math.min(mine, biz.contributed ?? 0);
    biz.contributed = (biz.contributed ?? 0) - back;
    biz.basis = Math.max(0, (biz.basis ?? 0) - back);
    state.finances.cash += back;
    if (mine - back > 0) ctx.earn(mine - back, `Dividend — ${biz.name}`, { ltcg: true });
  }
  ctx.log(`You took ${money(mine)} out of ${biz.name}${partners ? ` (your partners received ${money(partners)})` : ''}.${ENTITIES[biz.entity]?.passThrough ? ' Its profit was already taxed to you, so there\'s no tax on the distribution.' : ''}`, '💸', 'finance');
}

/** Move money into (+) or out of (−) a holding company's treasury. */
export function moveTreasury(ctx, amount) {
  const { state } = ctx;
  const c = state.business?.conglomerate;
  const a = Math.round(amount);
  if (!c || !a) return;
  if (a > 0) {
    if (!canAfford(state, a)) return ctx.toast(`You don't have ${money(a)}.`, 'warn');
    ctx.spend(a, `Capital contribution — ${c.name}`, { credit: true });
    c.treasury += a;
    c.contributed = (c.contributed ?? 0) + a;
    return ctx.log(`You put ${money(a)} into ${c.name}'s treasury.`, '🏛️', 'finance');
  }
  const out = Math.min(-a, Math.max(0, c.treasury - 50000));
  if (out <= 0) return ctx.toast('The treasury needs to keep a reserve.', 'warn');
  c.treasury -= out;
  state.finances.cash += out;
  ctx.log(`You took ${money(out)} out of ${c.name}'s treasury (already-taxed money — no tax due).`, '🏛️', 'finance');
}

/** What buying back `pct` of the company costs. */
export function buyBackQuote(biz, pct) {
  const outside = Math.max(0, 1 - biz.ownerPct);
  const p = Math.min(pct, outside);
  return { pct: Math.round(p * 10000) / 10000, price: Math.round(Math.max(0, biz.valuation ?? 0) * p * BUYBACK_PREMIUM), outside };
}

/** Buy back equity. source: 'you' (your own money) | 'company' (the business redeems the shares). */
export function buyBack(ctx, biz, pct, source = 'you') {
  const { state } = ctx;
  const q = buyBackQuote(biz, pct);
  if (q.pct <= 0) return ctx.toast('You already own all of it.', 'warn');
  if (q.price <= 0) return ctx.toast('The business has no value to price a buyout.', 'warn');
  if (source === 'company') {
    if (withdrawable(biz) < q.price) return ctx.toast(`The company would need ${money(q.price)} in spare cash.`, 'warn');
    biz.cash -= q.price;
  } else {
    if (!canAfford(state, q.price)) return ctx.toast(`Buying them out costs ${money(q.price)}.`, 'warn');
    ctx.spend(q.price, `Buyout of investors — ${biz.name}`, { credit: true });
    biz.basis = (biz.basis ?? 0) + q.price;
  }
  biz.ownerPct = Math.round(Math.min(1, biz.ownerPct + q.pct) * 10000) / 10000;
  // Investors are bought out newest first.
  let left = q.pct;
  for (const inv of [...(biz.investors ?? [])].reverse()) {
    if (left <= 0) break;
    const take = Math.min(inv.pct, left);
    inv.pct = Math.round((inv.pct - take) * 10000) / 10000;
    left -= take;
  }
  biz.investors = (biz.investors ?? []).filter((i) => i.pct > 0.0001);
  ctx.log(`${source === 'company' ? `${biz.name} redeemed` : 'You bought back'} ${Math.round(q.pct * 1000) / 10}% of ${biz.name} for ${money(q.price)}. You own ${Math.round(biz.ownerPct * 1000) / 10}% now.`, '🔁', 'milestone');
}
