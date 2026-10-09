/**
 * Franchising, from both sides of the agreement.
 *
 * Franchisee: buy into a proven brand. You pay an up-front franchise fee and
 * a bigger build-out, then royalties and an ad-fund contribution off the top
 * of revenue every year. In return the brand brings customers (a demand
 * lift), the concept is proven (less location luck), and the franchisor's
 * training stands in for industry experience. The franchisor polices
 * standards — let quality slide and you get a default notice — and the
 * agreement runs a fixed term before renewal.
 *
 * Franchisor: once your own business is established and well-regarded, file
 * a Franchise Disclosure Document and sell units to other owners. Each unit
 * pays a fee up front and royalties every year; you pay for the support
 * staff, and failed units and franchisee lawsuits come with the territory.
 *
 * biz.franchise  = { brandId, name, royalty, adFund, lift, term, signedYears, defaults }
 * biz.franchisor = { units, opened, failed, fee, royalty, startYears, newUnits }
 */
import { clamp } from '../../core/Random.js';
import { netWorth } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { credentialName } from '../credentials/CredentialRegistry.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { charge } from './TaxBook.js';

/**
 * typeId     the business type the unit operates as
 * fee        initial franchise fee
 * costMult   build-out vs. an independent of the same type (brand standards, signage, equipment)
 * scale      unit size vs. a typical independent
 * lift       demand from the brand
 * royalty / adFund  shares of gross revenue
 * term       agreement length in years
 * minNetWorth  franchisors screen buyers' net worth
 * waiveLicense  the owner needn't hold the trade license (the franchisor certifies the unit's managers)
 */
export const FRANCHISE_BRANDS = {
  burger: { name: 'Burger Barn', icon: '🍔', typeId: 'restaurant', fee: 45000, costMult: 1.5, scale: 1, lift: 1.4, royalty: 0.045, adFund: 0.04, term: 20, minNetWorth: 750000, waiveLicense: true },
  pizza: { name: 'Slice Republic Pizza', icon: '🍕', typeId: 'restaurant', fee: 25000, costMult: 0.8, scale: 0.6, lift: 1.2, royalty: 0.055, adFund: 0.03, term: 10, minNetWorth: 300000, waiveLicense: true },
  convenience: { name: 'QuickStop Market', icon: '🏪', typeId: 'retail', fee: 40000, costMult: 1.2, scale: 1, lift: 1.25, royalty: 0.04, adFund: 0.015, term: 10, minNetWorth: 250000 },
  salon: { name: 'ClipJoint Express', icon: '💈', typeId: 'salon', fee: 29500, costMult: 1.3, scale: 1, lift: 1.25, royalty: 0.06, adFund: 0.05, term: 10, minNetWorth: 200000, waiveLicense: true },
  gym: { name: 'IronWorks Fitness', icon: '🏋️', typeId: 'gym', fee: 50000, costMult: 1.2, scale: 1, lift: 1.3, royalty: 0.06, adFund: 0.02, term: 10, minNetWorth: 500000 },
  cleaning: { name: 'SparkleClean', icon: '🧽', typeId: 'cleaning', fee: 35000, costMult: 1.5, scale: 1, lift: 1.3, royalty: 0.07, adFund: 0.02, term: 10, minNetWorth: 100000 },
  tutoring: { name: 'Bright Minds Learning', icon: '📚', typeId: 'tutoring', fee: 40000, costMult: 1.3, scale: 1, lift: 1.3, royalty: 0.08, adFund: 0.02, term: 10, minNetWorth: 150000 },
  realty: { name: 'Keystone Realty Group', icon: '🏘️', typeId: 'brokerage', fee: 25000, costMult: 1, scale: 1, lift: 1.2, royalty: 0.06, adFund: 0.01, term: 5, minNetWorth: 100000 },
};

/** Filing an FDD, state registrations, an operations manual and a franchise-sales team. */
export const FDD_COST = 120000;
/** Corporate support: field consultants, training, the franchise-development staff. */
export const SUPPORT_BASE = 60000;
export const SUPPORT_PER_UNIT = 8000;
export const OPENING_SUPPORT = 12000;
export const TRANSFER_FEE = 10000;

export const startupCost = (brand) => Math.round(BUSINESS_TYPES[brand.typeId].cost * brand.costMult * brand.scale + brand.fee);

/** Can you buy this franchise? (Funding is checked separately.) */
export function franchiseEligibility(state, brandId) {
  const brand = FRANCHISE_BRANDS[brandId];
  if (!brand) return { ok: false, reason: 'Unknown brand' };
  const type = BUSINESS_TYPES[brand.typeId];
  if (state.character.age < 21) return { ok: false, reason: 'Franchisors want owners 21+' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (state.business?.current) return { ok: false, reason: 'You already own a business' };
  if (!brand.waiveLicense && type.credentials.length && !type.credentials.some((c) => hasCredential(state, c))) return { ok: false, reason: `Needs ${type.credentials.map(credentialName).join(' or ')}` };
  if (netWorth(state) < brand.minNetWorth) return { ok: false, reason: `${brand.name} requires $${brand.minNetWorth.toLocaleString()} net worth` };
  return { ok: true };
}

/** Royalties and ad fund on a year's revenue. */
export function royaltiesOn(biz, revenue) {
  const f = biz.franchise;
  return f ? Math.round(revenue * (f.royalty + f.adFund)) : 0;
}

/** Franchisor income and costs for the year (pure; units/newUnits set by the tick). */
export function franchisorFinancials(biz, type) {
  const fr = biz.franchisor;
  if (!fr) return { franchiseFees: 0, royaltyIncome: 0, franchiseSupport: 0 };
  const unitRevenue = type.revenue * 0.9;
  const royaltyIncome = Math.round(fr.units * unitRevenue * fr.royalty);
  const franchiseFees = fr.newUnits * fr.fee;
  const franchiseSupport = SUPPORT_BASE + fr.units * SUPPORT_PER_UNIT + fr.newUnits * OPENING_SUPPORT;
  return { franchiseFees, royaltyIncome, franchiseSupport };
}

export function franchisorEligibility(state, biz) {
  if (!biz) return { ok: false, reason: 'You don\'t own a business' };
  const type = BUSINESS_TYPES[biz.typeId];
  if (biz.franchisor) return { ok: false, reason: 'Already franchising' };
  if (biz.franchise) return { ok: false, reason: 'Franchisees can\'t sub-franchise' };
  if (type.startup) return { ok: false, reason: 'Startups scale with capital, not franchises' };
  if (['lawFirm', 'practice', 'cpaFirm'].includes(biz.typeId)) return { ok: false, reason: 'Licensed professions can\'t be franchised to lay owners' };
  if (biz.years < 3) return { ok: false, reason: 'Needs 3 years of operating history' };
  if (biz.reputation < 65) return { ok: false, reason: 'Needs a 65+ reputation — nobody buys an unknown brand' };
  if (!(biz.lastYear?.netIncome > 0)) return { ok: false, reason: 'Needs a profitable year to show buyers' };
  if (biz.cash + state.finances.cash < FDD_COST) return { ok: false, reason: `Costs $${FDD_COST.toLocaleString()} (FDD, registrations, manuals)` };
  return { ok: true };
}

/** Yearly franchisor growth: units sold, units that fail, and the odd franchisee lawsuit. */
export function franchisorTick(ctx, biz, phase) {
  const { rng } = ctx;
  const fr = biz.franchisor;
  const appeal = clamp((biz.reputation - 50) / 80, 0.05, 0.6) * phase;
  const tries = 3 + Math.floor(fr.units * 0.15);
  let sold = 0;
  for (let i = 0; i < tries; i++) if (rng.chance(appeal)) sold += 1;
  const failRate = biz.quality < 50 ? 0.08 : 0.03;
  let failed = 0;
  for (let i = 0; i < fr.units; i++) if (rng.chance(failRate)) failed += 1;
  fr.newUnits = sold;
  fr.units = Math.max(0, fr.units + sold - failed);
  fr.opened += sold;
  fr.failed += failed;
  if (sold || failed) ctx.log(`Franchising: ${sold} new ${biz.name} unit${sold === 1 ? '' : 's'} sold${failed ? `, ${failed} closed` : ''}. ${fr.units} franchised locations.`, '🗺️', sold > failed ? 'good' : 'warn');
  // Unhappy franchisees sue: misrepresentation in the FDD, encroachment, the ad fund.
  if (fr.units && rng.chance(Math.min(0.25, fr.units / 120))) {
    const cost = rng.int(40000, 250000);
    charge(biz, cost);
    biz.reputation = Math.max(0, biz.reputation - 4);
    ctx.log(`A group of franchisees sued over ${rng.pick(['encroachment from a new unit next door', 'how the ad fund was spent', 'earnings claims in your disclosure document'])}. Settling cost $${cost.toLocaleString()}.`, '⚖️', 'bad');
  }
}

/** Franchisee standards and the agreement term. Returns a prompt to queue, or null. */
export function franchiseeTick(ctx, biz) {
  const f = biz.franchise;
  f.signedYears += 1;
  if (biz.quality < 40 && !ctx.state.prompts.some((p) => p.type === 'business.franchiseDefault')) {
    const cure = Math.round(BUSINESS_TYPES[biz.typeId].cost * 0.12 * (FRANCHISE_BRANDS[f.brandId]?.scale ?? 1));
    return {
      type: 'business.franchiseDefault', icon: '📋', title: `${f.name}: Notice of Default`,
      text: `A field consultant failed ${biz.name} on brand standards (quality ${biz.quality}/100). Cure the default within 90 days or ${f.name} can terminate your agreement.`,
      options: [
        { id: 'cure', label: `🧹 Remodel and retrain ($${cure.toLocaleString()})` },
        { id: 'ignore', label: '🙈 Let it ride', tone: 'danger' },
      ],
      data: { cure },
    };
  }
  if (f.signedYears >= f.term && !ctx.state.prompts.some((p) => p.type === 'business.franchiseRenewal')) {
    const brand = FRANCHISE_BRANDS[f.brandId];
    const fee = Math.round((brand?.fee ?? 30000) * 0.25);
    const refresh = Math.round(BUSINESS_TYPES[biz.typeId].cost * 0.15 * (brand?.scale ?? 1));
    return {
      type: 'business.franchiseRenewal', icon: '📝', title: `${f.name}: Your Agreement Is Up`,
      text: `Your ${f.term}-year franchise agreement has run its course. Renewal means a renewal fee and a store refresh to current brand standards.`,
      options: [
        { id: 'renew', label: `✍️ Renew ($${(fee + refresh).toLocaleString()})` },
        { id: 'leave', label: '🏷️ Go independent', hint: 'No more royalties — and no more brand' },
      ],
      data: { cost: fee + refresh },
    };
  }
  return null;
}

/** Strip the brand: the business carries on independently. */
export function deBrand(ctx, biz, reason) {
  const name = biz.franchise.name;
  biz.franchise = null;
  biz.reputation = Math.max(0, biz.reputation - 10);
  biz.name = biz.name.replace(name, `${ctx.state.character.lastName}'s`);
  ctx.log(`${reason} You took down the ${name} signs; the business carries on as ${biz.name}.`, '🏷️', 'warn');
}
