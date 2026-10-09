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
import { clamp, Random } from '../../core/Random.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { PHASES } from '../economy/EconomyEngine.js';
import { isAbroad } from '../world/Countries.js';
import { regionsHere } from '../life/Regions.js';

/**
 * kind     home (live in or rent out) · multi (apartments) · commercial
 *          (leased to businesses) · land (build on it)
 * units    rentable units; rent is per unit per month
 * build    { cost, years }: building one on a lot (see Construction.js);
 *          cost scales with local construction costs, not land prices
 * lot      the land it sits on: what's left if you tear it down
 * vacation short-term rental (or your own getaway)
 */
export const PROPERTY_TYPES = {
  condo: { name: 'Condo', icon: '🏢', kind: 'home', base: 285000, hoa: 3000, units: 1, rent: 1500, lot: null },
  townhouse: { name: 'Townhouse', icon: '🏘️', kind: 'home', base: 420000, hoa: 2400, units: 1, rent: 2100, lot: 'lot', build: { cost: 220000, years: 1 } },
  starter: { name: 'Starter Home', icon: '🏠', kind: 'home', base: 350000, hoa: 0, units: 1, rent: 1800, lot: 'lot', build: { cost: 175000, years: 1 } },
  family: { name: 'Family Home', icon: '🏡', kind: 'home', base: 540000, hoa: 0, units: 1, rent: 2600, lot: 'lot', build: { cost: 330000, years: 1 } },
  fixer: { name: 'Fixer-Upper', icon: '🏚️', kind: 'home', base: 265000, hoa: 0, units: 1, rent: 1500, condition: 35, lot: 'lot' },
  rural: { name: 'Rural Acreage', icon: '🌾', kind: 'home', base: 400000, hoa: 0, units: 1, rent: 1700, ruralOnly: true, lot: 'acreage', build: { cost: 180000, years: 1 } },
  luxury: { name: 'Luxury Home', icon: '🏰', kind: 'home', base: 1450000, hoa: 7000, units: 1, rent: 6000, lot: 'lot', build: { cost: 1080000, years: 2 } },
  mansion: { name: 'Estate Mansion', icon: '🏯', kind: 'home', base: 4500000, hoa: 15000, units: 1, rent: 18000, lot: 'acreage', build: { cost: 3400000, years: 3 } },
  vacation: { name: 'Vacation Home', icon: '🏖️', kind: 'home', base: 820000, hoa: 4000, units: 1, rent: 3800, vacation: true, lot: 'lot', build: { cost: 560000, years: 1 } },
  duplex: { name: 'Duplex', icon: '🏘️', kind: 'multi', base: 600000, hoa: 0, units: 2, rent: 1600, lot: 'lot', build: { cost: 380000, years: 1 } },
  multiunit: { name: 'Fourplex', icon: '🏘️', kind: 'multi', base: 800000, hoa: 0, units: 4, rent: 1300, lot: 'lot', build: { cost: 540000, years: 1 } },
  aptBuilding: { name: 'Apartment Building (12 units)', icon: '🏬', kind: 'multi', base: 2800000, hoa: 0, units: 12, rent: 1600, lot: 'commercialLot', build: { cost: 1900000, years: 2 } },
  aptComplex: { name: 'Apartment Complex (60 units)', icon: '🏙️', kind: 'multi', base: 12000000, hoa: 0, units: 60, rent: 1650, lot: 'commercialLot', build: { cost: 9200000, years: 3 } },
  stripMall: { name: 'Retail Strip Center (6 shops)', icon: '🛍️', kind: 'commercial', base: 2400000, hoa: 0, units: 6, rent: 3700, lot: 'commercialLot', build: { cost: 1550000, years: 2 } },
  office: { name: 'Office Building (10 suites)', icon: '🏢', kind: 'commercial', base: 6000000, hoa: 0, units: 10, rent: 5300, lot: 'commercialLot', build: { cost: 4500000, years: 2 } },
  warehouse: { name: 'Industrial Warehouse (2 bays)', icon: '🏭', kind: 'commercial', base: 3200000, hoa: 0, units: 2, rent: 12000, lot: 'commercialLot', build: { cost: 2200000, years: 1 } },
  lot: { name: 'Residential Lot', icon: '🟫', kind: 'land', base: 120000, hoa: 0, units: 0, rent: 0, zone: 'residential' },
  commercialLot: { name: 'Commercial Lot', icon: '🅿️', kind: 'land', base: 450000, hoa: 0, units: 0, rent: 0, zone: 'commercial' },
  acreage: { name: 'Raw Land (40 acres)', icon: '🌄', kind: 'land', base: 160000, hoa: 0, units: 0, rent: 0, zone: 'rural' },
};
/** What each kind of land is zoned for. */
export const ZONING = {
  lot: ['starter', 'townhouse', 'family', 'luxury', 'vacation', 'duplex', 'multiunit'],
  commercialLot: ['stripMall', 'office', 'warehouse', 'aptBuilding', 'aptComplex'],
  acreage: ['rural', 'family', 'luxury', 'mansion', 'vacation'],
};
export const isLand = (type) => PROPERTY_TYPES[type]?.kind === 'land';
export const isCommercial = (type) => PROPERTY_TYPES[type]?.kind === 'commercial';
/** Homes you can live in (and finance with a home mortgage): one to four units. */
export const isResidential = (type) => ['home', 'multi'].includes(PROPERTY_TYPES[type]?.kind) && PROPERTY_TYPES[type].units <= 4;

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

const HOME_WEIGHTS = { condo: 3, townhouse: 2, starter: 4, family: 3, fixer: 2, rural: 3, luxury: 1, mansion: 0.25, vacation: 0.8 };
const INVEST_WEIGHTS = { duplex: 2, multiunit: 1.5, aptBuilding: 1, aptComplex: 0.35, stripMall: 0.8, office: 0.5, warehouse: 0.6, lot: 2, commercialLot: 1, acreage: 1 };

function listing(rng, state, type, regionId) {
  const def = PROPERTY_TYPES[type];
  return {
    id: rng.id('lst_'),
    type,
    regionId,
    price: Math.round((priceOf(state, type, regionId) * rng.float(0.9, 1.12)) / 1000) * 1000,
    condition: def.kind === 'land' ? 100 : def.condition ?? rng.int(60, 95),
  };
}

/** Five homes and three investment properties (apartments, commercial, land) each year. */
export function generateListings(ctx) {
  const { state, rng } = ctx;
  const regionId = state.character.regionId;
  const rural = REGIONS[regionId].type === 'Rural';
  const pick = (weights) => rng.weighted(Object.entries(weights).filter(([id]) => !PROPERTY_TYPES[id].ruralOnly || rural), ([id, w]) => w * (rural && ['acreage', 'rural'].includes(id) ? 2 : 1))[0];
  // Investment listings draw from their own stream so they don't reshuffle the rest of the year.
  state.housing.investSeed = (((state.housing.investSeed ?? 0x51ed) * 1664525) + 1013904223) >>> 0;
  const side = new Random(state.housing.investSeed);
  const sidePick = (weights) => side.weighted(Object.entries(weights).filter(([id]) => !PROPERTY_TYPES[id].ruralOnly || rural), ([id, w]) => w * (rural && ['acreage', 'rural'].includes(id) ? 2 : 1))[0];
  const listings = [
    ...Array.from({ length: 5 }, () => listing(rng, state, pick(HOME_WEIGHTS), regionId)),
    ...Array.from({ length: 3 }, () => listing(side, state, sidePick(INVEST_WEIGHTS), regionId)),
  ];
  state.housing.listings = listings.sort((a, b) => a.price - b.price);
}

/** Yearly market move: follows the economic cycle plus regional noise. */
export function marketTick(ctx) {
  const { state, rng } = ctx;
  const h = state.housing;
  const e = state.economy;
  // Prices are in today's dollars (like wages): booms and busts around a
  // flat real trend, with overheated markets drifting back to fundamentals.
  const drift = { expansion: 0.02, peak: 0.04, recession: -0.06, recovery: 0.01 }[e.phase];
  // Abroad, your own country's cities keep a market too (after the US ones, so US results are unchanged).
  for (const regionId of [...Object.keys(REGIONS), ...(isAbroad(state) ? regionsHere(state).map((r) => r.id) : [])]) {
    const idx = marketIndex(state, regionId);
    const pull = (1 - idx) * 0.1;
    h.market[regionId] = Math.round(clamp(idx * (1 + drift + pull + rng.float(-0.03, 0.03)), 0.4, 4) * 1000) / 1000;
  }
  // Mortgage rates ride on the economy's interest rate.
  h.rates.base = Math.round(clamp(e.interestRate + 0.027 + rng.float(-0.003, 0.003), 0.025, 0.11) * 10000) / 10000;

  // A half-built project is worth the land plus most of what's gone into it.
  for (const p of h.properties) p.value = Math.round(priceOf(state, p.type, p.regionId) * (p.valueAdj ?? 1) * (isLand(p.type) ? 1 : 0.7 + p.condition / 333) + (p.project?.paid ?? 0) * 0.7);
}
