/**
 * Property market: types, regional prices and rents, a per-region market
 * index driven by the shared economy (booms at the peak, busts in recessions),
 * mortgage rates tied to the economy's interest rate, yearly listings,
 * and selling costs (agent commission — 1% if you hold a real estate
 * license and represent yourself).
 *
 * state.housing.market = { [regionId]: index }
 */
import { REGIONS } from '../life/Regions.js';
import { clamp } from '../../core/Random.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { PHASES } from '../economy/EconomyEngine.js';

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

/** Yearly market move: follows the economic cycle plus regional noise. */
export function marketTick(ctx) {
  const { state, rng } = ctx;
  const h = state.housing;
  const e = state.economy;
  const drift = { expansion: 0.04, peak: 0.07, recession: -0.08, recovery: 0.02 }[e.phase];
  for (const regionId of Object.keys(REGIONS)) {
    h.market[regionId] = Math.round(clamp(marketIndex(state, regionId) * (1 + drift + e.inflation * 0.3 + rng.float(-0.03, 0.03)), 0.4, 8) * 1000) / 1000;
  }
  // Mortgage rates ride on the economy's interest rate.
  h.rates.base = Math.round(clamp(e.interestRate + 0.027 + rng.float(-0.003, 0.003), 0.025, 0.11) * 10000) / 10000;

  for (const p of h.properties) p.value = Math.round(priceOf(state, p.type, p.regionId) * (p.valueAdj ?? 1) * (0.7 + p.condition / 333));
}
