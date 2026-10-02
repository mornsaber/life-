/**
 * Property market: types, regional prices and rents, a per-region market
 * index with national boom/bust cycles, mortgage-rate drift, yearly listings,
 * and selling costs (agent commission — 1% if you hold a real estate
 * license and represent yourself).
 *
 * state.housing.market = { [regionId]: index }, state.housing.cycle = { phase, years }
 */
import { REGIONS } from '../life/Regions.js';
import { clamp } from '../../core/Random.js';
import { hasCredential } from '../credentials/LicensingEngine.js';

export const PROPERTY_TYPES = {
  condo: { name: 'Condo', icon: '🏢', base: 285000, hoa: 3000, units: 1, rent: 1500 },
  starter: { name: 'Starter Home', icon: '🏠', base: 350000, hoa: 0, units: 1, rent: 1800 },
  family: { name: 'Family Home', icon: '🏡', base: 540000, hoa: 0, units: 1, rent: 2600 },
  fixer: { name: 'Fixer-Upper', icon: '🏚️', base: 265000, hoa: 0, units: 1, rent: 1500, condition: 35 },
  rural: { name: 'Rural Acreage', icon: '🌾', base: 400000, hoa: 0, units: 1, rent: 1700, ruralOnly: true },
  luxury: { name: 'Luxury Home', icon: '🏰', base: 1450000, hoa: 7000, units: 1, rent: 6000 },
  multiunit: { name: 'Fourplex', icon: '🏘️', base: 800000, hoa: 0, units: 4, rent: 1300 },
};

export const RENT_TIERS = {
  roommates: { name: 'Room with roommates', icon: '🛏️', monthly: 750 },
  apartment: { name: 'One-bedroom apartment', icon: '🏢', monthly: 1350 },
  house: { name: 'Rented house', icon: '🏡', monthly: 2300 },
  subsidized: { name: 'Subsidized housing (voucher)', icon: '🏘️', monthly: 0, subsidized: true },
};

export const marketIndex = (state, regionId) => state.housing.market[regionId] ?? 1;
const priceFactor = (regionId) => REGIONS[regionId].col ** 1.6;

export function priceOf(state, type, regionId) {
  return PROPERTY_TYPES[type].base * priceFactor(regionId) * marketIndex(state, regionId);
}

/** Monthly market rent for one unit of a property type. */
export function marketRent(state, type, regionId) {
  return Math.round(PROPERTY_TYPES[type].rent * REGIONS[regionId].col ** 1.3 * marketIndex(state, regionId) ** 0.5);
}

export function tierRent(state, tier, regionId) {
  // Housing vouchers cap rent at 30% of income.
  if (RENT_TIERS[tier].subsidized) return Math.round(((state.finances.lastYear?.gross ?? 0) * 0.3) / 12);
  return Math.round(RENT_TIERS[tier].monthly * REGIONS[regionId].col ** 1.3 * marketIndex(state, regionId) ** 0.5);
}

/** Fraction of the sale price lost to agents and closing. */
export function sellingCostRate(state) {
  return (hasCredential(state, 'realEstate') ? 0.01 : 0.06) + 0.01;
}

export function generateListings(ctx) {
  const { state, rng } = ctx;
  const regionId = state.character.regionId;
  const rural = REGIONS[regionId].type === 'Rural';
  const types = Object.entries(PROPERTY_TYPES).filter(([, t]) => !t.ruralOnly || rural);
  const listings = [];
  for (let i = 0; i < 5; i++) {
    const [type, def] = rng.weighted(types, ([id]) => ({ condo: 3, starter: 4, family: 3, fixer: 2, rural: 3, luxury: 1, multiunit: 1.5 })[id]);
    listings.push({
      id: rng.id('lst_'),
      type,
      regionId,
      price: Math.round((priceOf(state, type, regionId) * rng.float(0.9, 1.12)) / 1000) * 1000,
      condition: def.condition ?? rng.int(60, 95),
    });
  }
  state.housing.listings = listings.sort((a, b) => a.price - b.price);
}

/** Yearly market move: national cycle + regional noise; rates drift with the cycle. */
export function marketTick(ctx) {
  const { state, rng } = ctx;
  const h = state.housing;
  h.cycle ??= { phase: 'normal', years: 0 };
  const c = h.cycle;
  c.years += 1;
  if (c.phase === 'normal') {
    if (rng.chance(0.06)) Object.assign(c, { phase: 'bust', years: 0 });
    else if (rng.chance(0.08)) Object.assign(c, { phase: 'boom', years: 0 });
  } else if (c.phase === 'boom' && c.years >= 2 && rng.chance(0.3)) Object.assign(c, { phase: 'bust', years: 0 });
  else if (c.phase === 'bust' && c.years >= 2) Object.assign(c, { phase: 'normal', years: 0 });
  if (c.years === 0 && c.phase !== 'normal') ctx.log(c.phase === 'bust' ? '📉 The housing market is crashing. Prices are falling nationwide.' : '📈 A housing boom is underway. Prices are surging.', '🏘️', 'warn');

  const drift = { normal: 0.035, boom: 0.09, bust: -0.09 }[c.phase];
  for (const regionId of Object.keys(REGIONS)) {
    h.market[regionId] = Math.round(clamp(marketIndex(state, regionId) * (1 + drift + rng.float(-0.03, 0.03)), 0.4, 6) * 1000) / 1000;
  }
  const rateTarget = { normal: 0.065, boom: 0.07, bust: 0.045 }[c.phase];
  h.rates.base = Math.round(clamp(h.rates.base + (rateTarget - h.rates.base) * 0.3 + rng.float(-0.004, 0.004), 0.025, 0.1) * 10000) / 10000;

  for (const p of h.properties) p.value = Math.round(priceOf(state, p.type, p.regionId) * (p.valueAdj ?? 1) * (0.7 + p.condition / 333));
}
