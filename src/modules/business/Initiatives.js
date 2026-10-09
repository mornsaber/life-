/**
 * Levers for businesses that don't run on contracts: ongoing initiatives,
 * yearly promotions and key accounts.
 *
 *   initiatives  switch on for a one-time setup cost; each moves revenue,
 *                costs, reputation or staff in a known direction (the
 *                Advisor's forecast shows what each is worth to you)
 *   promotions   once a year: a sale, a community sponsorship
 *   key accounts recurring clients — a hospital system's catering, a
 *                corporate wellness deal, a property manager's retainer —
 *                offered each year like contracts. They add steady revenue
 *                but walk if quality slips.
 *
 * biz.initiatives = { [id]: sinceAge }, biz.accounts = [{ id, client, value, years, yearsLeft }],
 * biz.accountOffers = [...], biz.promo = { id, age }
 */
import { clamp } from '../../core/Random.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { OPERATIONS } from './Operations.js';

/**
 * fx: revenue (×), cogs (×), payroll (×), rent (×), share (cost as a share
 * of revenue), fixed (cost per location per year); yearly: drift applied in
 * the tick. setup: one-time cost per location.
 */
export const INITIATIVES = {
  loyalty: { name: 'Loyalty program', icon: '💳', setup: 5000, fx: { revenue: 1.04, share: 0.015 }, yearly: { reputation: 1 }, desc: 'Repeat customers come back more often. Costs about 1.5% of revenue in rewards.' },
  online: { name: 'Online booking & ordering', icon: '🛒', setup: 15000, fx: { revenue: 1.06, share: 0.03 }, desc: 'A new channel for customers. The platform takes about 3% of revenue.' },
  extendedHours: { name: 'Extended hours', icon: '🌙', setup: 0, fx: { revenue: 1.08, payroll: 1.07 }, yearly: { morale: -1 }, desc: 'Open earlier and later: more sales, more payroll, tired staff.' },
  premiumLine: { name: 'Premium services line', icon: '💎', setup: 20000, fx: { revenue: 1.05, cogs: 1.02 }, minQuality: 60, desc: 'Higher-end offerings for customers who\'ll pay. Needs quality 60+ to sell.' },
  leanInventory: { name: 'Inventory & waste control', icon: '📦', setup: 8000, fx: { cogs: 0.96 }, yearly: { quality: -1 }, desc: 'Tighter ordering cuts cost of goods about 4%; shortages nibble at quality.' },
  energy: { name: 'Energy-efficiency retrofit', icon: '💡', setup: 30000, fx: { rent: 0.92 }, desc: 'LED lighting, HVAC and controls cut occupancy costs about 8% for good.' },
  training: { name: 'Staff training program', icon: '🎓', setup: 6000, fx: { payroll: 1.02 }, yearly: { productivity: 3, morale: 2 }, desc: 'Better-trained staff work better and stay longer. About 2% more payroll.' },
  reviews: { name: 'Reviews & reputation management', icon: '⭐', setup: 2000, fx: { fixed: 6000 }, yearly: { reputation: 2 }, desc: 'Ask happy customers for reviews and answer the unhappy ones. $6,000 a year per location.' },
};
export const PROMOTIONS = {
  sale: { name: 'Run a seasonal sale', icon: '🏷️', desc: 'More customers this year at thinner margins; a little goodwill.' },
  sponsor: { name: 'Sponsor a community event', icon: '🎪', desc: 'Local goodwill and visibility.', cost: 4000 },
};
const ACCOUNT_CLIENTS = ['A hospital system', 'The state university', 'A corporate campus', 'The county government', 'A regional property manager', 'A hotel group', 'The school district', 'A senior-living chain', 'An insurance carrier', 'A tech company\'s local office'];

/** Businesses that don't run on contracts get key accounts. */
export const usesAccounts = (biz) => !OPERATIONS[biz.typeId] && !BUSINESS_TYPES[biz.typeId]?.startup;
export const initiativeCost = (biz, id) => Math.round(INITIATIVES[id].setup * (biz.scale ?? 1));

/** Multipliers and costs for the P&L (Business.yearFinancials). */
export function initiativeEffects(biz, age) {
  const out = { revenue: 1, cogs: 1, payroll: 1, rent: 1, share: 0, fixed: 0, accounts: 0 };
  for (const id of Object.keys(biz.initiatives ?? {})) {
    const i = INITIATIVES[id];
    if (!i) continue;
    const fx = i.fx;
    const works = !i.minQuality || biz.quality >= i.minQuality;
    if (fx.revenue) out.revenue *= works ? fx.revenue : 1 + (fx.revenue - 1) / 4;
    if (fx.cogs) out.cogs *= fx.cogs;
    if (fx.payroll) out.payroll *= fx.payroll;
    if (fx.rent) out.rent *= fx.rent;
    if (fx.share) out.share += fx.share;
    if (fx.fixed) out.fixed += fx.fixed * (biz.scale ?? 1);
  }
  if (biz.promo?.age === age && biz.promo.id === 'sale') {
    out.revenue *= 1.07;
    out.cogs *= 1.05;
  }
  out.accounts = (biz.accounts ?? []).reduce((s, a) => s + a.value, 0);
  return out;
}

function accountOffer(rng, biz, type) {
  const value = Math.round(type.revenue * (biz.scale ?? 1) * rng.float(0.04, 0.12) / 1000) * 1000;
  return { id: rng.id('ka_'), client: rng.pick(ACCOUNT_CLIENTS), value, years: rng.int(1, 3), minQuality: rng.pick([0, 50, 60]) };
}

/** The year: drifts from initiatives, key accounts renew or walk, new offers arrive. */
export function initiativesTick(ctx, biz) {
  const { rng } = ctx;
  const type = BUSINESS_TYPES[biz.typeId];
  for (const id of Object.keys(biz.initiatives ?? {})) {
    const y = INITIATIVES[id]?.yearly;
    if (!y) continue;
    if (y.reputation) biz.reputation = Math.round(clamp(biz.reputation + y.reputation, 0, 100));
    if (y.quality) biz.quality = Math.round(clamp(biz.quality + y.quality, 0, 100));
    if (y.productivity) biz.staff.productivity = Math.round(clamp(biz.staff.productivity + y.productivity, 0, 100));
    if (y.morale) biz.staff.morale = Math.round(clamp(biz.staff.morale + y.morale, 0, 100));
  }
  if (!usesAccounts(biz)) return;
  biz.accounts ??= [];
  for (const a of biz.accounts) a.yearsLeft -= 1;
  const renewing = [];
  for (const a of biz.accounts.filter((x) => x.yearsLeft <= 0)) {
    if (biz.quality >= 55 && rng.chance(0.6)) renewing.push({ ...a, id: rng.id('ka_'), years: rng.int(1, 3), value: Math.round(a.value * 1.05), renewal: true });
    else ctx.log(`${biz.name}'s account with ${a.client.toLowerCase()} ended.`, '📄');
  }
  biz.accounts = biz.accounts.filter((a) => a.yearsLeft > 0);
  // Slipping quality loses accounts mid-term.
  if (biz.quality < 45 && biz.accounts.length && rng.chance(0.4)) {
    const lost = rng.pick(biz.accounts);
    biz.accounts = biz.accounts.filter((a) => a !== lost);
    ctx.log(`${lost.client} dropped ${biz.name} over slipping quality.`, '📉', 'bad');
  }
  biz.accountOffers = [...renewing, ...Array.from({ length: rng.int(1, 2) }, () => accountOffer(rng, biz, type))];
}

/** Accounts and the staffing they need: about one person per slice of a location's revenue. */
export function accountEligibility(biz, offer) {
  if (offer.minQuality && biz.quality < offer.minQuality) return { ok: false, reason: `Wants quality ${offer.minQuality}+` };
  const type = BUSINESS_TYPES[biz.typeId];
  const booked = (biz.accounts ?? []).reduce((s, a) => s + a.value, 0);
  if (booked + offer.value > type.revenue * (biz.scale ?? 1) * 0.35) return { ok: false, reason: 'More account work than you can take on — open another location' };
  return { ok: true };
}

export const InitiativeActions = {
  /** arg: initiative id — switch it on (paying setup) or off. */
  toggleInitiative(ctx, id) {
    const biz = ctx.state.business.current;
    const i = INITIATIVES[id];
    if (!biz || !i || BUSINESS_TYPES[biz.typeId].startup) return;
    biz.initiatives ??= {};
    if (biz.initiatives[id] != null) {
      delete biz.initiatives[id];
      return ctx.log(`${biz.name} ended its ${i.name.toLowerCase()}.`, i.icon);
    }
    const cost = initiativeCost(biz, id);
    if (biz.cash < cost) return ctx.toast(`Setup costs ${`$${cost.toLocaleString()}`} from the business account.`, 'warn');
    biz.cash -= cost;
    biz.initiatives[id] = ctx.state.character.age;
    ctx.log(`${biz.name} launched a ${i.name.toLowerCase()}${cost ? ` ($${cost.toLocaleString()} to set up)` : ''}.`, i.icon, 'good');
  },
  /** arg: promotion id — once a year. */
  promote(ctx, id) {
    const { state } = ctx;
    const biz = state.business.current;
    const p = PROMOTIONS[id];
    if (!biz || !p) return;
    if (biz.promo?.age === state.character.age) return ctx.toast('One promotion a year.', 'warn');
    const cost = Math.round((p.cost ?? 0) * (biz.scale ?? 1));
    if (cost && biz.cash < cost) return ctx.toast(`Costs $${cost.toLocaleString()}.`, 'warn');
    biz.cash -= cost;
    biz.promo = { id, age: state.character.age };
    biz.reputation = Math.round(clamp(biz.reputation + (id === 'sponsor' ? 4 : 1), 0, 100));
    ctx.log(id === 'sale' ? `${biz.name} is running a seasonal sale this year: more customers, thinner margins.` : `${biz.name} sponsored a community festival. People noticed.`, p.icon, 'good');
  },
  /** arg: offer id. */
  signAccount(ctx, id) {
    const biz = ctx.state.business.current;
    const offer = biz?.accountOffers?.find((k) => k.id === id);
    if (!offer) return;
    const ok = accountEligibility(biz, offer);
    if (!ok.ok) return ctx.toast(ok.reason, 'warn');
    signAccount(biz, offer);
    ctx.log(`${biz.name} signed ${offer.client.toLowerCase()} as a key account: about $${offer.value.toLocaleString()} a year for ${offer.years} year${offer.years > 1 ? 's' : ''}.`, '🤝', 'good');
  },
  /** arg: account id — walk away (with a reputation cost). */
  dropAccount(ctx, id) {
    const biz = ctx.state.business.current;
    const a = biz?.accounts?.find((x) => x.id === id);
    if (!a) return;
    biz.accounts = biz.accounts.filter((x) => x !== a);
    biz.reputation = Math.max(0, biz.reputation - 3);
    ctx.log(`${biz.name} walked away from ${a.client.toLowerCase()}.`, '📄', 'warn');
  },
};

export function signAccount(biz, offer) {
  biz.accounts ??= [];
  biz.accounts.push({ id: offer.id, client: offer.client, value: offer.value, years: offer.years, yearsLeft: offer.years });
  biz.accountOffers = (biz.accountOffers ?? []).filter((k) => k.id !== offer.id);
}
