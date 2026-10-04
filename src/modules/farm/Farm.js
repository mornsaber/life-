/**
 * Farming and ranching: own land, decide what to grow (or graze), and live
 * with the weather and the markets.
 *
 *  - Land: bought by the acre (Farm Credit loans, 20% down), priced by
 *    region — Iowa cropland is dear, Montana ranchland cheap. It appreciates
 *    over time and is the farmer's real wealth.
 *  - Operate it yourself, or cash-rent it to a neighbor for a steady check.
 *  - Weather sets yields: bumper crops, ordinary years, droughts and floods.
 *    Commodity prices move on their own.
 *  - Crop insurance (Revenue Protection) pays when revenue falls below your
 *    coverage level; the federal government subsidizes most of the premium.
 *  - Farm programs pay when prices fall below reference prices, and
 *    Congress often passes disaster aid after a bad year.
 *
 * state.farm = { acres, valuePerAcre, crop, mode: 'operate'|'rent', insured, coverage,
 *                loan: { balance, payment, rate } | null, prices: { crop: index }, lastYear }
 */
import { regionOf } from '../life/Regions.js';

/** revenue / cost per acre at normal yields and prices. */
export const CROPS = {
  corn: { name: 'Corn', icon: '🌽', revenue: 900, cost: 760 },
  soybeans: { name: 'Soybeans', icon: '🫘', revenue: 650, cost: 520 },
  wheat: { name: 'Wheat', icon: '🌾', revenue: 420, cost: 330 },
  hay: { name: 'Hay', icon: '🌿', revenue: 450, cost: 330 },
  cattle: { name: 'Cow-calf cattle', icon: '🐄', revenue: 230, cost: 165 },
};
/** Land price per acre where farming makes sense. */
export const LAND_PRICE = { smalltown: 11000, rural: 1200, gunnison: 2500, sunbelt: 3500, midcity: 8500, denver: 3000 };
export const PLOTS = [80, 160, 320, 640, 1280];
export const DOWN = 0.2;
export const LOAN_RATE = 0.07;
export const LOAN_YEARS = 20;
export const PROPERTY_TAX = 0.006;
export const RENT_YIELD = 0.03;
export const COVERAGE = { 0.7: 0.025, 0.85: 0.06 };
const WEATHER = [
  { label: 'a bumper crop', yield: 1.18, weight: 18 },
  { label: 'a normal year', yield: 1, weight: 50 },
  { label: 'a dry summer', yield: 0.78, weight: 18 },
  { label: 'drought', yield: 0.45, weight: 7, disaster: true },
  { label: 'flooding', yield: 0.4, weight: 4, disaster: true },
  { label: 'hail that flattened the fields', yield: 0.35, weight: 3, disaster: true },
];

const pay = (principal) => Math.round((principal * LOAN_RATE) / (1 - (1 + LOAN_RATE) ** -LOAN_YEARS));

export const landAvailable = (state) => Boolean(LAND_PRICE[state.character.regionId]);
export const landValue = (state) => Math.round((state.farm?.acres ?? 0) * (state.farm?.valuePerAcre ?? 0));
export const farmEquity = (state) => Math.max(0, landValue(state) - (state.farm?.loan?.balance ?? 0));

export function buyCheck(state, acres, financing) {
  if (!landAvailable(state)) return { ok: false, reason: 'No farmland for sale around here' };
  if (state.character.age < 18) return { ok: false, reason: 'Must be 18' };
  if (state.farm.acres && state.farm.regionId !== state.character.regionId) return { ok: false, reason: 'Sell your other farm first' };
  const price = acres * (state.farm.acres ? state.farm.valuePerAcre : LAND_PRICE[state.character.regionId]);
  const due = financing ? Math.round(price * DOWN) : price;
  if (state.finances.cash < due) return { ok: false, reason: `Needs $${due.toLocaleString()} ${financing ? 'down' : 'cash'}` };
  if (financing && (state.housing.credit?.score ?? 650) < 640) return { ok: false, reason: 'Farm Credit wants a 640+ credit score' };
  return { ok: true, price, due };
}

/** Expected revenue for the insurance guarantee. */
const expectedRevenue = (f) => f.acres * CROPS[f.crop].revenue * (f.prices[f.crop] ?? 1);

export function farmTick(ctx) {
  const { state, rng } = ctx;
  const f = state.farm;
  if (!f.acres) return;
  // Land market.
  const phase = state.economy.phase;
  f.valuePerAcre = Math.round(f.valuePerAcre * (1 + rng.float(-0.03, 0.08) - (phase === 'recession' ? 0.05 : 0)));
  // Commodity prices drift and mean-revert.
  for (const id of Object.keys(CROPS)) f.prices[id] = Math.round(Math.max(0.55, Math.min(1.6, ((f.prices[id] ?? 1) + (1 - (f.prices[id] ?? 1)) * 0.35) * Math.exp(rng.float(-0.18, 0.18)))) * 100) / 100;

  const tax = Math.round(landValue(state) * PROPERTY_TAX);
  ctx.spend(tax, 'Farmland property tax', { allowDebt: true });
  if (f.loan) {
    ctx.spend(f.loan.payment, 'Farm Credit loan payment', { allowDebt: true });
    f.loan.balance = Math.max(0, Math.round(f.loan.balance * (1 + LOAN_RATE) - f.loan.payment));
    if (!f.loan.balance) f.loan = null;
  }

  if (f.mode === 'rent') {
    const rent = Math.round(landValue(state) * RENT_YIELD);
    ctx.earn(rent, 'Cash rent from farmland');
    f.lastYear = { mode: 'rent', rent, tax };
    return;
  }

  const crop = CROPS[f.crop];
  const total = WEATHER.reduce((s, w) => s + w.weight, 0);
  let roll = rng.float(0, total);
  const weather = WEATHER.find((w) => (roll -= w.weight) <= 0) ?? WEATHER[1];
  const price = f.prices[f.crop];
  const revenue = Math.round(f.acres * crop.revenue * weather.yield * price * (f.crop === 'cattle' ? (weather.yield + 1) / 2 : 1));
  // Big farms need hired help; part-time farmers pay a custom operator.
  const hired = (f.acres > 640 ? f.acres * 40 : 0) + (state.career.job ? Math.round(revenue * 0.1) : 0);
  const costs = Math.round(f.acres * crop.cost) + hired;
  let insurance = 0;
  let indemnity = 0;
  if (f.insured) {
    insurance = Math.round(expectedRevenue(f) * COVERAGE[f.coverage]);
    indemnity = Math.max(0, Math.round(f.coverage * expectedRevenue(f) - revenue));
  }
  // Price-loss coverage: payments when prices fall below the reference level.
  const programs = price < 0.9 ? Math.round(f.acres * crop.revenue * (0.9 - price) * 0.85) : 0;
  const disasterAid = weather.disaster && rng.chance(0.5) ? Math.round(f.acres * crop.revenue * 0.15) : 0;
  const net = revenue - costs - insurance + indemnity + programs + disasterAid;
  if (net >= 0) ctx.earn(net, `Farm income (${crop.name})`);
  else ctx.spend(-net, `Farm operating loss (${crop.name})`, { allowDebt: true });
  ctx.stat('stress', weather.disaster ? 8 : 2);
  ctx.stat('happiness', weather.yield >= 1 ? 2 : -2);
  ctx.log(`The farm: ${weather.label}. ${crop.icon} ${crop.name} at ${Math.round(price * 100)}% of normal prices — $${revenue.toLocaleString()} gross${indemnity ? `, $${indemnity.toLocaleString()} from crop insurance` : ''}${programs ? `, $${programs.toLocaleString()} in farm-program payments` : ''}${disasterAid ? `, $${disasterAid.toLocaleString()} in federal disaster aid` : ''}. Net ${net >= 0 ? '' : '−'}$${Math.abs(net).toLocaleString()}.`, '🚜', net >= 0 ? 'finance' : 'warn');
  f.lastYear = { mode: 'operate', weather: weather.label, revenue, costs, insurance, indemnity, programs, disasterAid, net, tax };
}

export const FarmModule = {
  id: 'farm',
  order: 47,

  init(state) {
    state.farm ??= { acres: 0, valuePerAcre: 0, regionId: null, crop: 'corn', mode: 'operate', insured: true, coverage: 0.7, loan: null, prices: {}, lastYear: null };
  },

  onAgeUp(ctx) {
    if (!ctx.state.legal.incarceration || ctx.state.farm.mode === 'rent') farmTick(ctx);
    else if (ctx.state.farm.acres) {
      ctx.state.farm.mode = 'rent';
      ctx.log('While you were locked up, a neighbor cash-rented your land.', '🚜');
      farmTick(ctx);
    }
  },

  actions: {
    /** arg: 'acres:loan|cash' */
    buy(ctx, arg) {
      const { state } = ctx;
      const [a, how = 'loan'] = String(arg).split(':');
      const acres = Number(a);
      if (!PLOTS.includes(acres)) return;
      const check = buyCheck(state, acres, how === 'loan');
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const f = state.farm;
      state.finances.cash -= check.due;
      if (!f.acres) {
        f.valuePerAcre = LAND_PRICE[state.character.regionId];
        f.regionId = state.character.regionId;
        f.crop = state.character.regionId === 'rural' || state.character.regionId === 'gunnison' ? 'cattle' : 'corn';
        for (const id of Object.keys(CROPS)) f.prices[id] = 1;
      }
      f.acres += acres;
      if (how === 'loan') {
        const principal = check.price - check.due + (f.loan?.balance ?? 0);
        f.loan = { balance: principal, payment: pay(principal), rate: LOAN_RATE };
      }
      ctx.log(`You bought ${acres} acres for $${check.price.toLocaleString()}${how === 'loan' ? ' with a Farm Credit loan' : ''}. You now farm ${f.acres} acres.`, '🌾', 'milestone');
    },
    sell(ctx) {
      const { state } = ctx;
      const f = state.farm;
      if (!f.acres) return;
      const proceeds = Math.round(landValue(state) * 0.94);
      const owed = f.loan?.balance ?? 0;
      state.finances.cash += proceeds - owed;
      ctx.log(`You sold your ${f.acres} acres for $${proceeds.toLocaleString()}${owed ? ` and paid off $${owed.toLocaleString()} in loans` : ''}.`, '🪧', 'milestone');
      Object.assign(f, { acres: 0, valuePerAcre: 0, regionId: null, loan: null, lastYear: null });
    },
    setCrop(ctx, id) {
      if (!CROPS[id]) return;
      ctx.state.farm.crop = id;
      ctx.toast(`Next season: ${CROPS[id].name}`, 'info');
    },
    setMode(ctx, mode) {
      if (!['operate', 'rent'].includes(mode)) return;
      ctx.state.farm.mode = mode;
      ctx.toast(mode === 'rent' ? 'Cash-renting the land to a neighbor' : 'Farming it yourself', 'info');
    },
    /** arg: '0' (none) | '0.7' | '0.85' */
    insurance(ctx, level) {
      const f = ctx.state.farm;
      if (level === '0') f.insured = false;
      else if (COVERAGE[level]) {
        f.insured = true;
        f.coverage = Number(level);
      }
    },
  },
};

