/**
 * Farming and ranching, wherever you live: own (or lease) land, lay out your
 * fields, run a herd, and live with the weather, the markets and the rules of
 * your country's farm policy.
 *
 *  - Land: priced by country and place (Iowa cropland is dear, Montana ranchland
 *    cheap; Dutch and Korean land dearer still). Bought with a farm lender's loan
 *    or cash, or leased from a neighbour by the year. In China rural land belongs
 *    to the village collective: you contract the land-use rights instead.
 *  - Fields: the land is worked as four fields, each with its own crop and its own
 *    history. Rotation matters — corn after corn loses yield, a legume or a ley
 *    before a cereal adds it. Vineyards and orchards take years to come into bearing.
 *  - Soil health rises with rotations, cover crops and no-till, falls with
 *    continuous cropping and overgrazing, and moves every yield.
 *  - Livestock: beef cows, a dairy herd (needs a milking parlour) or sheep, on the
 *    fields you leave in pasture. Overstock and you buy feed; drought makes it worse.
 *  - Machinery: own a line (depreciation and repairs) or hire contractors (dearer per
 *    acre, and they get to you late some years).
 *  - Labour: big farms, herds and specialty crops need hands; a farmer with an off-farm
 *    job needs more of them.
 *  - Organic: three years of transition at lower yields, then a price premium.
 *  - Marketing: sell at harvest, store grain for next year's price, or forward-contract
 *    half the crop before the season at today's price.
 *  - Policy by country: US crop insurance and price-loss payments; the EU's Common
 *    Agricultural Policy; Britain's Sustainable Farming Incentive; Canada's
 *    AgriStability; rice payments in Japan and Korea; India's PM-KISAN and minimum
 *    support prices; New Zealand's no-subsidy farming.
 *  - Sidelines: a farm shop, and the solar developer's lease offer.
 *
 * state.farm = { acres, leased, valuePerAcre, regionId, mode: 'operate'|'rent',
 *   fields: [{ crop, last, establish }], rotate, soil, herd: { kind, head }, parlour,
 *   machinery: { value } | null, bins, practices: { cover, noTill, organic },
 *   marketing: 'harvest'|'store'|'forward', stored, insured, coverage,
 *   loan: { balance, payment, rate } | null, prices: { [commodity]: index },
 *   extras: { shop, solar: { acres, rent, until } }, lastYear, history: [{ age, net }] }
 */
import { REGIONS } from '../life/Regions.js';
import { PACKS } from '../world/packs/index.js';

export const HA = 2.471;
export const DOWN = 0.2;
export const LOAN_RATE = 0.07;
export const LOAN_YEARS = 20;
/** Property tax on farmland, a share of its value (Britain, Ireland and Australia don't tax farmland). */
export const PROPERTY_TAX = 0.006;
const LAND_TAX = { US: 0.006, GB: 0, IE: 0, AU: 0, NZ: 0.003, FR: 0.003, DE: 0.002, CA: 0.004 };
export const landTaxRate = (state) => LAND_TAX[countryOf(state)] ?? 0.002;
export const RENT_YIELD = 0.03;
/** Coverage level → the farmer's share of the premium, as a share of expected revenue. */
export const COVERAGE = { 0.7: 0.025, 0.85: 0.06 };
const PRIVATE_PREMIUM = 0.04;
export const FIELDS = 4;
const HAND_WAGE = 42000;
const CONTRACTOR_PER_ACRE = 45;
const CERT_FEE = 1500;
export const SHOP_COST = 60000;
export const BINS_COST = 60000;
export const PARLOUR_PER_HEAD = 3000;

/** Per acre at normal yields and prices, before machinery (US-scale; scaled by each country's productivity). */
export const CROPS = {
  corn: { name: 'Corn (maize)', icon: '🌽', revenue: 900, cost: 660, group: 'cereal', storable: true, labor: 1 },
  soybeans: { name: 'Soybeans', icon: '🫘', revenue: 650, cost: 440, group: 'legume', storable: true, labor: 0.8 },
  wheat: { name: 'Wheat', icon: '🌾', revenue: 420, cost: 290, group: 'cereal', storable: true, labor: 0.7 },
  barley: { name: 'Barley', icon: '🌾', revenue: 380, cost: 265, group: 'cereal', storable: true, labor: 0.7 },
  canola: { name: 'Canola (oilseed rape)', icon: '🌼', revenue: 520, cost: 350, group: 'broadleaf', storable: true, labor: 0.8 },
  rice: { name: 'Rice', icon: '🍚', revenue: 1100, cost: 820, group: 'cereal', storable: true, labor: 2 },
  cotton: { name: 'Cotton', icon: '☁️', revenue: 750, cost: 570, group: 'broadleaf', storable: false, labor: 1.2 },
  potatoes: { name: 'Potatoes', icon: '🥔', revenue: 4000, cost: 3150, group: 'broadleaf', storable: true, labor: 4 },
  vegetables: { name: 'Vegetables', icon: '🥬', revenue: 6000, cost: 4750, group: 'broadleaf', storable: false, labor: 8 },
  hay: { name: 'Hay & silage', icon: '🌿', revenue: 450, cost: 290, group: 'forage', storable: false, labor: 0.6 },
  vineyard: { name: 'Vineyard', icon: '🍇', revenue: 7000, cost: 5300, group: 'perennial', storable: false, labor: 6, establish: 3, plant: 15000 },
  orchard: { name: 'Orchard', icon: '🍎', revenue: 6000, cost: 4600, group: 'perennial', storable: false, labor: 5, establish: 4, plant: 12000 },
  pasture: { name: 'Pasture (grazing)', icon: '🐄', revenue: 0, cost: 30, group: 'forage', storable: false, labor: 0.1 },
};
/** Per head a year. `acres` of pasture each needs where grass is average. */
export const LIVESTOCK = {
  beef: { name: 'Beef cows (cow-calf)', icon: '🐄', revenue: 1000, cost: 780, acres: 4, value: 1600, labor: 1 / 150 },
  dairy: { name: 'Dairy cows', icon: '🥛', revenue: 4800, cost: 4150, acres: 1.6, value: 1900, labor: 1 / 60, parlour: true },
  sheep: { name: 'Breeding ewes', icon: '🐑', revenue: 190, cost: 140, acres: 0.6, value: 220, labor: 1 / 700 },
};

/**
 * Farming country by country. price: $ an acre of rural land (null: can't be bought);
 * unit: how land is measured; plots: what comes up for sale, in that unit;
 * prod: yields and costs against the US; grass: pasture growth; drought/flood: how often;
 * scheme: farm policy; insurance: 'subsidized' or 'private'.
 */
const ALL_FIELD = ['corn', 'soybeans', 'wheat', 'barley', 'vegetables', 'hay', 'pasture'];
export const FARM_COUNTRY = {
  US: { price: 4000, unit: 'acre', plots: [80, 160, 320, 640, 1280], lender: 'Farm Credit', scheme: 'us', insurance: 'subsidized', prod: 1, grass: 1, drought: 1, flood: 1, crops: ['corn', 'soybeans', 'wheat', 'barley', 'canola', 'rice', 'cotton', 'potatoes', 'vegetables', 'hay', 'vineyard', 'orchard', 'pasture'] },
  CA: { price: 3500, unit: 'acre', plots: [160, 320, 640, 1280, 2560], lender: 'Farm Credit Canada', scheme: 'ca', insurance: 'subsidized', prod: 0.9, grass: 0.8, drought: 1, flood: 0.8, crops: ['wheat', 'canola', 'barley', 'corn', 'soybeans', 'potatoes', 'vegetables', 'hay', 'orchard', 'vineyard', 'pasture'] },
  GB: { price: 9000, unit: 'acre', plots: [50, 100, 250, 500, 1000], lender: 'an agricultural mortgage lender', scheme: 'gb', insurance: 'private', prod: 1.05, grass: 1.6, drought: 0.6, flood: 1.3, crops: ['wheat', 'barley', 'canola', 'potatoes', 'vegetables', 'hay', 'orchard', 'pasture'] },
  IE: { price: 10000, unit: 'ha', plots: [20, 40, 80, 150, 300], lender: 'a farm lender', scheme: 'eu', insurance: 'private', prod: 1, grass: 2, drought: 0.4, flood: 1.4, crops: ['barley', 'wheat', 'potatoes', 'vegetables', 'hay', 'pasture'] },
  FR: { price: 3500, unit: 'ha', plots: [25, 50, 100, 200, 400], lender: 'Crédit Agricole', scheme: 'eu', insurance: 'subsidized', prod: 1.05, grass: 1.2, drought: 1, flood: 1, crops: ['wheat', 'corn', 'barley', 'canola', 'potatoes', 'vegetables', 'hay', 'vineyard', 'orchard', 'pasture'] },
  DE: { price: 12000, unit: 'ha', plots: [25, 50, 100, 200, 400], lender: 'Landwirtschaftliche Rentenbank', scheme: 'eu', insurance: 'private', prod: 1.1, grass: 1.2, drought: 0.8, flood: 1, crops: ['wheat', 'barley', 'canola', 'corn', 'potatoes', 'vegetables', 'hay', 'vineyard', 'pasture'] },
  NL: { price: 30000, unit: 'ha', plots: [10, 25, 50, 100, 200], lender: 'Rabobank', scheme: 'eu', insurance: 'private', prod: 1.25, grass: 1.8, drought: 0.5, flood: 1.2, crops: ['potatoes', 'vegetables', 'wheat', 'corn', 'hay', 'pasture'] },
  IT: { price: 10000, unit: 'ha', plots: [10, 25, 50, 100, 200], lender: 'an agricultural bank', scheme: 'eu', insurance: 'subsidized', prod: 0.95, grass: 1, drought: 1.3, flood: 1, crops: ['wheat', 'corn', 'rice', 'vegetables', 'hay', 'vineyard', 'orchard', 'pasture'] },
  ES: { price: 5500, unit: 'ha', plots: [10, 25, 50, 100, 250], lender: 'an agricultural bank', scheme: 'eu', insurance: 'subsidized', prod: 0.85, grass: 0.7, drought: 1.6, flood: 0.8, crops: ['wheat', 'barley', 'rice', 'vegetables', 'hay', 'vineyard', 'orchard', 'pasture'] },
  SE: { price: 3500, unit: 'ha', plots: [25, 50, 100, 200, 400], lender: 'Landshypotek Bank', scheme: 'eu', insurance: 'private', prod: 0.9, grass: 1, drought: 0.7, flood: 0.8, crops: ['wheat', 'barley', 'canola', 'potatoes', 'hay', 'pasture'] },
  AU: { price: 1500, unit: 'ha', plots: [200, 500, 1000, 2000, 5000], lender: 'an agribusiness bank', scheme: 'au', insurance: 'private', prod: 0.55, grass: 0.35, drought: 2.2, flood: 0.9, crops: ['wheat', 'barley', 'canola', 'cotton', 'rice', 'hay', 'vineyard', 'orchard', 'pasture'] },
  NZ: { price: 9000, unit: 'ha', plots: [40, 80, 150, 300, 600], lender: 'a rural bank', scheme: 'none', insurance: 'private', prod: 1, grass: 2.2, drought: 0.8, flood: 1, crops: ['pasture', 'hay', 'barley', 'wheat', 'vegetables', 'vineyard', 'orchard'] },
  JP: { price: 30000, unit: 'ha', plots: [1, 2, 5, 10, 20], lender: 'JA Bank (the farm co-op)', scheme: 'jp', insurance: 'subsidized', prod: 1, grass: 1, drought: 0.5, flood: 1.6, crops: ['rice', 'vegetables', 'soybeans', 'wheat', 'orchard', 'pasture'] },
  KR: { price: 60000, unit: 'ha', plots: [1, 2, 5, 10, 20], lender: 'NongHyup (the farm co-op)', scheme: 'jp', insurance: 'subsidized', prod: 1, grass: 0.9, drought: 0.6, flood: 1.5, crops: ['rice', 'vegetables', 'soybeans', 'orchard', 'pasture'] },
  CN: { price: null, rent: 300, unit: 'mu', plots: [10, 30, 100, 300, 1000], lender: 'the Agricultural Bank of China', scheme: 'cn', insurance: 'subsidized', prod: 0.8, grass: 0.8, drought: 1.2, flood: 1.3, crops: ['rice', 'wheat', 'corn', 'soybeans', 'cotton', 'vegetables', 'orchard', 'pasture'] },
  IN: { price: 20000, unit: 'acre', plots: [2, 5, 10, 25, 50], lender: 'a cooperative bank (Kisan Credit Card)', scheme: 'in', insurance: 'subsidized', prod: 0.45, grass: 0.7, drought: 1.4, flood: 1.4, crops: ['rice', 'wheat', 'cotton', 'soybeans', 'potatoes', 'vegetables', 'pasture'] },
  PH: { price: 8000, unit: 'ha', plots: [1, 3, 5, 10, 25], lender: 'Land Bank of the Philippines', scheme: 'none', insurance: 'subsidized', prod: 0.5, grass: 1, drought: 0.9, flood: 2, crops: ['rice', 'corn', 'vegetables', 'orchard', 'pasture'] },
  ID: { price: 7000, unit: 'ha', plots: [1, 3, 5, 10, 25], lender: 'Bank Rakyat Indonesia', scheme: 'none', insurance: 'private', prod: 0.6, grass: 1, drought: 0.9, flood: 1.5, crops: ['rice', 'corn', 'vegetables', 'orchard', 'pasture'] },
  BR: { price: 3000, unit: 'ha', plots: [50, 100, 500, 1000, 3000], lender: 'Banco do Brasil', scheme: 'none', insurance: 'subsidized', prod: 0.8, grass: 1.2, drought: 1, flood: 1, crops: ['soybeans', 'corn', 'cotton', 'vegetables', 'orchard', 'pasture'] },
  MX: { price: 3000, unit: 'ha', plots: [5, 10, 25, 50, 100], lender: 'FIRA (the farm development fund)', scheme: 'none', insurance: 'private', prod: 0.6, grass: 0.7, drought: 1.4, flood: 1, crops: ['corn', 'wheat', 'vegetables', 'orchard', 'pasture'] },
  NG: { price: 2000, unit: 'ha', plots: [1, 3, 5, 10, 25], lender: 'the Bank of Agriculture', scheme: 'none', insurance: 'private', prod: 0.35, grass: 0.8, drought: 1.3, flood: 1.3, crops: ['corn', 'rice', 'vegetables', 'pasture'] },
  KE: { price: 4000, unit: 'acre', plots: [2, 5, 10, 25, 50], lender: 'the Agricultural Finance Corporation', scheme: 'none', insurance: 'private', prod: 0.4, grass: 0.7, drought: 1.6, flood: 1, crops: ['corn', 'wheat', 'vegetables', 'orchard', 'pasture'] },
  ZA: { price: 1500, unit: 'ha', plots: [100, 250, 500, 1000, 2500], lender: 'the Land Bank', scheme: 'none', insurance: 'private', prod: 0.6, grass: 0.5, drought: 1.6, flood: 0.8, crops: ['corn', 'wheat', 'vineyard', 'orchard', 'pasture'] },
  IL: { price: 25000, unit: 'dunam', plots: [50, 100, 250, 500, 1000], lender: 'an agricultural bank', scheme: 'none', insurance: 'subsidized', prod: 1, grass: 0.5, drought: 1.5, flood: 0.5, crops: ['vegetables', 'orchard', 'wheat', 'pasture'] },
  PS: { price: 8000, unit: 'dunam', plots: [5, 10, 25, 50, 100], lender: 'a microfinance lender', scheme: 'none', insurance: 'private', prod: 0.5, grass: 0.5, drought: 1.5, flood: 0.5, crops: ['orchard', 'vegetables', 'wheat', 'pasture'] },
};
/** Acres in one of each unit. */
const UNIT = { acre: 1, ha: HA, mu: 0.1647, dunam: 0.2471 };
const UNIT_NAME = { acre: ['acre', 'acres'], ha: ['hectare', 'hectares'], mu: ['mu', 'mu'], dunam: ['dunam', 'dunams'] };
const DEFAULT_FARM = { price: 3000, unit: 'ha', plots: [5, 10, 25, 50, 100], lender: 'an agricultural bank', scheme: 'none', insurance: 'private', prod: 0.8, grass: 1, drought: 1, flood: 1, crops: ALL_FIELD };
// Countries added as packs can describe their own farming.
for (const p of PACKS) if (p.farm) FARM_COUNTRY[p.id] ??= { ...DEFAULT_FARM, ...p.farm };
/** US land prices by place (the rest follow the place's type). */
export const LAND_PRICE = { marfa: 600, decorah: 9500, galena: 9000, wellsboro: 5000, natchitoches: 3200, waycross: 3800, burns: 900, moab: 2500, cookeville: 6000, athens: 5500, flagstaff: 3000, smalltown: 11000, rural: 1200, gunnison: 2500, sunbelt: 3500, midcity: 8500, denver: 3000, amarillo: 2200, appalachia: 3500, elko: 900, fairbanks: 1800, bend: 6000, asheville: 9000, minneapolis: 7500, raleigh: 6500, nashville: 7000 };
/** Farmland near a city costs more; in the big metros there's none. */
const PLACE_FACTOR = { Rural: 1, 'Small town': 1.2, 'Mid-size city': 1.6 };

export const countryOf = (state) => state.character.countryId ?? 'US';
export const farmCountry = (state, cc = countryOf(state)) => FARM_COUNTRY[cc] ?? (cc === 'SG' ? null : DEFAULT_FARM);

/** $ an acre to buy here (null: none for sale). */
export function landPrice(state) {
  const cc = countryOf(state);
  const fc = farmCountry(state, cc);
  if (!fc) return null;
  const regionId = state.character.regionId;
  if (cc === 'US' && LAND_PRICE[regionId]) return LAND_PRICE[regionId];
  const factor = PLACE_FACTOR[REGIONS[regionId]?.type];
  if (!factor) return null;
  return fc.price ? Math.round(fc.price * factor) : null;
}
/** $ an acre a year to lease land in (a share of its price; China's land rights by the mu). */
export function leaseRent(state) {
  const fc = farmCountry(state);
  const factor = PLACE_FACTOR[REGIONS[state.character.regionId]?.type] ?? (countryOf(state) === 'US' && LAND_PRICE[state.character.regionId] ? 1 : 0);
  if (!fc || !factor) return null;
  if (fc.rent) return Math.round(fc.rent * factor);
  const p = landPrice(state);
  return p ? Math.round(p * RENT_YIELD * 1.15) : null;
}
export const landAvailable = (state) => Boolean(landPrice(state));
export const canFarmHere = (state) => Boolean(landPrice(state) || leaseRent(state));

/** Land in the country's own unit: '160 acres', '65 hectares', '600 mu'. */
export function area(state, acres) {
  const unit = farmCountry(state)?.unit ?? 'acre';
  const n = Math.round((acres / UNIT[unit]) * (unit === 'acre' ? 1 : 10)) / (unit === 'acre' ? 1 : 10);
  return `${n.toLocaleString()} ${UNIT_NAME[unit][n === 1 ? 0 : 1]}`;
}
/** Plot sizes for sale here, in acres. */
export const plotsFor = (state) => (farmCountry(state)?.plots ?? []).map((n) => Math.round(n * UNIT[farmCountry(state).unit]));
export const PLOTS = FARM_COUNTRY.US.plots;
export const cropsHere = (state) => farmCountry(state)?.crops ?? ALL_FIELD;

export const farmedAcres = (f) => (f.acres ?? 0) + (f.leased ?? 0) - (f.extras?.solar?.acres ?? 0);
export const landValue = (state) => Math.round((state.farm?.acres ?? 0) * (state.farm?.valuePerAcre ?? 0));
export const herdValue = (f) => (f.herd?.head ? f.herd.head * LIVESTOCK[f.herd.kind].value : 0);
/** Land, herd, machinery and stored grain, less the farm loan. */
export const farmEquity = (state) => {
  const f = state.farm;
  if (!f) return 0;
  return Math.max(0, landValue(state) + herdValue(f) + (f.machinery?.value ?? 0) + Math.round((f.stored ?? 0) * 0.97) - (f.loan?.balance ?? 0));
};

const pay = (principal) => Math.round((principal * LOAN_RATE) / (1 - (1 + LOAN_RATE) ** -LOAN_YEARS));

/** Fill in what an older save is missing. */
export function ensureFarm(f) {
  f.leased ??= 0;
  f.fields ??= Array.from({ length: FIELDS }, () => ({ crop: f.crop ?? 'corn', last: null, establish: 0 }));
  f.soil ??= 60;
  f.herd ??= { kind: 'beef', head: 0 };
  f.parlour ??= 0;
  f.machinery ??= null;
  f.bins ??= false;
  f.practices ??= { cover: false, noTill: false, organic: null };
  f.rotate ??= true;
  f.marketing ??= 'harvest';
  f.stored ??= 0;
  f.extras ??= { shop: false, solar: null };
  f.history ??= [];
  f.prices ??= {};
  return f;
}

export function buyCheck(state, acres, financing) {
  const price = landPrice(state);
  if (countryOf(state) === 'CN') return { ok: false, reason: 'Rural land belongs to the village collective — contract the land-use rights (lease) instead' };
  if (!price) return { ok: false, reason: 'No farmland for sale around here' };
  if (state.character.age < 18) return { ok: false, reason: 'Must be 18' };
  const f = state.farm;
  if ((f.acres || f.leased) && f.regionId !== state.character.regionId) return { ok: false, reason: 'Sell or give up your other farm first' };
  const total = acres * (f.acres ? f.valuePerAcre : price);
  const due = financing ? Math.round(total * DOWN) : total;
  if (state.finances.cash < due) return { ok: false, reason: `Needs $${due.toLocaleString()} ${financing ? 'down' : 'cash'}` };
  if (financing && (state.housing.credit?.score ?? 650) < 640) return { ok: false, reason: `${farmCountry(state).lender} wants a 640+ credit score` };
  return { ok: true, price: total, due };
}
export function leaseCheck(state, acres) {
  const rent = leaseRent(state);
  if (!rent) return { ok: false, reason: 'No farmland to lease around here' };
  if (state.character.age < 18) return { ok: false, reason: 'Must be 18' };
  const f = state.farm;
  if ((f.acres || f.leased) && f.regionId !== state.character.regionId) return { ok: false, reason: 'Give up your other farm first' };
  if (f.mode === 'rent') return { ok: false, reason: 'You\'re renting your own land out' };
  const first = Math.round(acres * rent);
  if (state.finances.cash < first) return { ok: false, reason: `First year's rent: $${first.toLocaleString()}` };
  return { ok: true, rent: first };
}

/* ------------------------------------------------------------------ */
/* The season                                                          */
/* ------------------------------------------------------------------ */

export const WEATHER = [
  { id: 'bumper', label: 'a bumper crop', yield: 1.18, weight: 18 },
  { id: 'normal', label: 'a normal year', yield: 1, weight: 50 },
  { id: 'dry', label: 'a dry summer', yield: 0.78, weight: 18, dry: true },
  { id: 'drought', label: 'drought', yield: 0.45, weight: 7, disaster: true, dry: true },
  { id: 'flood', label: 'flooding', yield: 0.4, weight: 4, disaster: true, wet: true },
  { id: 'hail', label: 'hail that flattened the fields', yield: 0.35, weight: 3, disaster: true },
];
const weatherFor = (fc) => WEATHER.map((w) => ({ ...w, weight: w.weight * (w.dry ? fc.drought : w.wet ? fc.flood : 1) }));

/** Commodity prices drift, mean-revert, and now and then jump on world news. */
const COMMODITIES = [...Object.keys(CROPS).filter((id) => id !== 'pasture'), ...Object.keys(LIVESTOCK)];
const SHOCKS = [
  { text: 'A trade war shut a big export market for soybeans.', ids: ['soybeans'], move: 0.72 },
  { text: 'A failed harvest abroad sent wheat prices soaring.', ids: ['wheat', 'barley'], move: 1.35 },
  { text: 'An ethanol mandate lifted corn prices.', ids: ['corn'], move: 1.2 },
  { text: 'A milk glut collapsed dairy prices.', ids: ['dairy'], move: 0.7 },
  { text: 'Beef prices hit records as the national herd shrank.', ids: ['beef'], move: 1.3 },
  { text: 'Fertilizer prices doubled — and grain followed them up.', ids: ['corn', 'wheat', 'canola', 'rice'], move: 1.15 },
];
function movePrices(f, rng) {
  for (const id of COMMODITIES) {
    const p = f.prices[id] ?? 1;
    f.prices[id] = Math.round(Math.max(0.55, Math.min(1.6, (p + (1 - p) * 0.35) * Math.exp(rng.float(-0.16, 0.16)))) * 100) / 100;
  }
  if (!rng.chance(0.12)) return null;
  const shock = rng.pick(SHOCKS);
  for (const id of shock.ids) f.prices[id] = Math.round(Math.max(0.55, Math.min(1.6, f.prices[id] * shock.move)) * 100) / 100;
  return shock.text;
}

/** Rotation: a cereal after the same cereal loses yield; a legume or a ley before a crop adds it. */
function rotation(field) {
  const crop = CROPS[field.crop];
  const last = CROPS[field.last];
  if (!last || crop.group === 'perennial' || field.crop === 'pasture') return 1;
  if (field.last === field.crop) return crop.group === 'cereal' ? 0.9 : crop.group === 'broadleaf' ? 0.88 : 0.97;
  if (last.group === 'legume' || last.group === 'forage') return 1.06;
  return 1;
}
const soilFactor = (soil) => 0.85 + soil * 0.003;

/** How much work the farm is, in full-time people. */
export function workload(f) {
  const per = farmedAcres(f) / FIELDS;
  const fields = f.fields.reduce((s, x) => s + (CROPS[x.crop].labor * per) / 1000, 0);
  const herd = f.herd?.head ? f.herd.head * LIVESTOCK[f.herd.kind].labor : 0;
  return Math.round((fields + herd + (f.extras?.shop ? 0.4 : 0)) * 100) / 100;
}
/** What you can do yourself: less with a job, less when you're old. */
export const ownLabour = (state) => (state.career?.job ? 0.25 : state.character.age >= 75 ? 0.3 : state.character.age >= 65 ? 0.6 : 1);

export const pastureAcres = (f) => (farmedAcres(f) / FIELDS) * f.fields.filter((x) => x.crop === 'pasture').length;
/** Head the pasture carries in a normal year. */
export const capacity = (state, f = state.farm) => Math.floor((pastureAcres(f) * (farmCountry(state)?.grass ?? 1)) / LIVESTOCK[f.herd.kind].acres);

/** The year's farm-policy payments, by country. */
function policy(state, f, s) {
  const fc = farmCountry(state);
  const acres = farmedAcres(f);
  const green = f.practices.cover || f.practices.noTill || f.practices.organic != null;
  const lines = [];
  const add = (label, amount) => {
    if (amount <= 0) return;
    const l = lines.find((x) => x.label === label);
    if (l) l.amount += Math.round(amount);
    else lines.push({ label, amount: Math.round(amount) });
  };
  switch (fc.scheme) {
    case 'us': {
      // Price Loss Coverage: program crops below the reference price.
      for (const c of s.crops) if (['corn', 'soybeans', 'wheat', 'barley', 'rice', 'cotton'].includes(c.id) && c.price < 0.9) add(`Price Loss Coverage (${CROPS[c.id].name})`, c.base * (0.9 - c.price) * 0.85);
      if (s.weather.disaster && s.rng.chance(0.5)) add('Federal disaster aid', s.base * 0.15);
      if (f.practices.cover) add('Conservation Stewardship Program', acres * 25);
      break;
    }
    case 'eu':
      add('CAP basic income support', acres * 90);
      if (green) add('CAP eco-scheme', acres * 30);
      if (state.character.age < 40) add('CAP young farmer payment', Math.min(acres, 220) * 40);
      if (s.weather.disaster && s.rng.chance(0.3)) add('EU crisis reserve aid', s.base * 0.08);
      break;
    case 'gb':
      // Direct payments are gone; the Sustainable Farming Incentive pays for practices.
      add('Sustainable Farming Incentive', acres * (green ? 55 : 10));
      break;
    case 'ca': {
      const avg = f.history.length >= 3 ? f.history.slice(-5).reduce((a, h) => a + h.net, 0) / Math.min(5, f.history.length) : null;
      if (avg != null && avg > 0 && s.net < avg * 0.7) add('AgriStability', (avg * 0.7 - s.net) * 0.7);
      break;
    }
    case 'au':
      if (s.weather.dry && s.net < 0) add('Farm Household Allowance', 14000);
      break;
    case 'jp':
      for (const c of s.crops) add(c.id === 'rice' ? 'Rice income support' : 'Paddy-diversion payment', c.acres * (c.id === 'rice' ? 350 : ['wheat', 'soybeans'].includes(c.id) ? 150 : 0));
      break;
    case 'cn':
      for (const c of s.crops) if (['rice', 'wheat', 'corn', 'soybeans'].includes(c.id)) add('Grain producer subsidy', c.acres * 35);
      break;
    case 'in':
      add('PM-KISAN income support', 250);
      break;
    default:
  }
  return lines;
}

export function farmTick(ctx) {
  const { state, rng } = ctx;
  const f = ensureFarm(state.farm);
  if (!f.acres && !f.leased) return;
  const fc = farmCountry(state) ?? DEFAULT_FARM;
  // The land market.
  if (f.acres) f.valuePerAcre = Math.round(f.valuePerAcre * (1 + rng.float(-0.03, 0.08) - (state.economy?.phase === 'recession' ? 0.05 : 0)));
  // Last year's prices are this season's forward prices.
  const forward = { ...f.prices };
  const news = movePrices(f, rng);
  if (news) ctx.log(`Farm markets: ${news}`, '📈', 'info');

  const tax = Math.round(landValue(state) * landTaxRate(state));
  if (tax) ctx.spend(tax, 'Farmland property tax', { allowDebt: true });
  if (f.loan) {
    ctx.spend(f.loan.payment, `${fc.lender} loan payment`, { allowDebt: true });
    f.loan.balance = Math.max(0, Math.round(f.loan.balance * (1 + LOAN_RATE) - f.loan.payment));
    if (!f.loan.balance) f.loan = null;
  }
  if (f.extras.solar) {
    ctx.earn(f.extras.solar.rent, 'Solar farm lease');
    if (state.character.age >= f.extras.solar.until) {
      ctx.log('The solar lease ran out; the panels came down and the land came back to you.', '☀️');
      f.extras.solar = null;
    }
  }

  if (f.mode === 'rent') {
    const rent = Math.round(landValue(state) * RENT_YIELD);
    ctx.earn(rent, 'Cash rent from farmland');
    f.lastYear = { mode: 'rent', rent, tax };
    return;
  }

  const weather = rng.weighted(weatherFor(fc), (w) => w.weight);
  const per = farmedAcres(f) / FIELDS;
  const own = Boolean(f.machinery);
  const late = !own && rng.chance(0.3);
  const organic = f.practices.organic;
  const transition = organic != null && state.character.age - organic < 3;
  const certified = organic != null && !transition;
  const soilF = soilFactor(f.soil);
  const crops = [];
  let revenue = 0;
  let costs = 0;
  let base = 0;
  let establishing = 0;
  let grazing = 0;
  for (const field of f.fields) {
    const crop = CROPS[field.crop];
    const price = f.prices[field.crop] ?? 1;
    let cost = per * crop.cost * fc.prod * (organic != null ? 0.9 : 1) * (f.practices.noTill ? 0.95 : 1) + (f.practices.cover ? per * 30 : 0);
    if (field.crop === 'pasture') {
      costs += cost;
      // No herd of your own: a neighbour's stock grazes it for a rent.
      if (!f.herd.head) grazing += Math.round(per * 25 * fc.grass * fc.prod);
      continue;
    }
    if (field.establish > 0) {
      // Young vines and trees: costs, no crop yet.
      costs += cost * 0.5;
      field.establish -= 1;
      establishing += 1;
      continue;
    }
    const yieldF = weather.yield * soilF * rotation(field) * (organic != null ? 0.8 : 1) * (late && crop.group !== 'perennial' ? 0.95 : 1) * (crop.group === 'perennial' ? (weather.yield + 1) / 2 / weather.yield : 1);
    const minPrice = fc.scheme === 'in' && ['wheat', 'rice'].includes(field.crop) ? Math.max(price, 0.95) : price;
    const fieldBase = per * crop.revenue * fc.prod;
    let rev = fieldBase * yieldF * minPrice * (certified ? 1.4 : 1);
    // Forward contracts: half the storable crop at the price locked before the season.
    if (f.marketing === 'forward' && crop.storable) {
      const locked = forward[field.crop] ?? price;
      rev = rev / minPrice * (0.5 * minPrice + 0.5 * locked);
      if (yieldF < 0.5) cost += rev * 0.05; // short of what you contracted: buying back the shortfall
    }
    // Storing: half the storable crop goes in the bins, to sell next year.
    if (f.marketing === 'store' && f.bins && crop.storable) {
      f.storedNew = (f.storedNew ?? 0) + (rev / 2) / minPrice;
      f.storedCrop = field.crop;
      rev /= 2;
    }
    revenue += rev;
    costs += cost;
    base += fieldBase;
    crops.push({ id: field.crop, acres: per, base: fieldBase, price: minPrice, revenue: Math.round(rev) });
  }
  revenue += grazing;
  // Last year's stored grain goes out at this year's price.
  let storedSale = 0;
  if (f.stored) {
    storedSale = Math.round(f.stored * (f.prices[f.storedFrom ?? 'corn'] ?? 1) * 0.97);
    revenue += storedSale;
    f.stored = 0;
  }
  if (f.storedNew) {
    f.stored = Math.round(f.storedNew);
    f.storedFrom = f.storedCrop;
    delete f.storedNew;
    delete f.storedCrop;
  }

  // The herd: what the pasture carries; past that, bought-in feed (dearer in a dry year).
  let herdNet = 0;
  let feed = 0;
  if (f.herd.head) {
    const kind = LIVESTOCK[f.herd.kind];
    const cap = Math.max(1, capacity(state, f) * (weather.dry ? weather.yield : 1));
    const over = Math.max(0, f.herd.head - cap);
    feed = Math.round(over * kind.cost * 0.35 * (weather.dry ? 1.4 : 1));
    const hRev = f.herd.head * kind.revenue * fc.prod * (f.prices[f.herd.kind] ?? 1) * (certified ? 1.25 : 1);
    const hCost = f.herd.head * kind.cost * fc.prod + feed;
    herdNet = hRev - hCost;
    revenue += hRev;
    costs += hCost;
    base += f.herd.head * kind.revenue * fc.prod;
    if (over > cap * 0.25) f.soil = Math.max(0, f.soil - 3); // overgrazing
  }

  // Machinery or contractors.
  const cropped = per * f.fields.filter((x) => x.crop !== 'pasture').length;
  let machinery = 0;
  if (own) {
    machinery = Math.round(f.machinery.value * 0.03);
    f.machinery.value = Math.round(f.machinery.value * 0.9);
  } else machinery = Math.round(cropped * CONTRACTOR_PER_ACRE * fc.prod);
  costs += machinery;

  // Labour.
  const work = workload(f);
  const hands = Math.max(0, work - ownLabour(state));
  const wages = Math.round(hands * HAND_WAGE * Math.max(0.3, fc.prod));
  costs += wages;
  if (certified || transition) costs += CERT_FEE;

  // A farm shop.
  const shop = f.extras.shop ? Math.round(rng.int(8000, 40000) * (state.economy?.phase === 'recession' ? 0.7 : 1)) : 0;
  revenue += shop;

  // Insurance.
  let premium = 0;
  let indemnity = 0;
  const expected = crops.reduce((s, c) => s + c.base * (forward[c.id] ?? 1), 0);
  if (f.insured && expected) {
    const level = fc.insurance === 'subsidized' ? f.coverage : 0.7;
    premium = Math.round(expected * (fc.insurance === 'subsidized' ? COVERAGE[level] : PRIVATE_PREMIUM));
    const cropRevenue = crops.reduce((s, c) => s + c.revenue, 0) * (f.marketing === 'store' && f.bins ? 2 : 1);
    indemnity = Math.max(0, Math.round(level * expected - cropRevenue));
    if (fc.insurance !== 'subsidized' && !weather.disaster) indemnity = 0; // private hail and storm cover pays on named perils only
  }
  let net = Math.round(revenue - costs - premium + indemnity);
  const programs = policy(state, f, { crops, weather, base, net, rng });
  const aid = programs.reduce((s, l) => s + l.amount, 0);
  net += aid;

  if (net >= 0) ctx.earn(net, 'Farm income');
  else ctx.spend(-net, 'Farm operating loss', { allowDebt: true });
  ctx.stat('stress', (weather.disaster ? 8 : 2) + Math.round(Math.min(work, ownLabour(state)) * 3));
  ctx.stat('happiness', weather.yield >= 1 ? 2 : -2);

  // Soil and rotation history.
  let soil = -0.5;
  for (const field of f.fields) {
    const g = CROPS[field.crop].group;
    soil += field.last === field.crop && g !== 'perennial' && g !== 'forage' ? -1 : g === 'legume' || g === 'forage' ? 0.5 : 0;
    field.last = field.crop;
  }
  // A rotation: next year each field takes the annual crop the field before it grew.
  if (f.rotate) {
    const annual = f.fields.filter((x) => !['perennial'].includes(CROPS[x.crop].group) && x.crop !== 'pasture');
    const crops = annual.map((x) => x.crop);
    annual.forEach((x, i) => { x.crop = crops[(i + crops.length - 1) % crops.length]; });
  }
  if (f.practices.cover) soil += 3;
  if (f.practices.noTill) soil += 2;
  if (weather.wet && !f.practices.cover) soil -= 1;
  f.soil = Math.max(0, Math.min(100, Math.round(f.soil + soil)));

  const what = [...new Set(f.fields.map((x) => `${CROPS[x.crop].icon} ${CROPS[x.crop].name}`))].join(', ');
  ctx.log(`The farm: ${weather.label}. ${what}${f.herd.head ? `; ${f.herd.head} ${LIVESTOCK[f.herd.kind].name.toLowerCase()}` : ''} — $${Math.round(revenue).toLocaleString()} gross${indemnity ? `, $${indemnity.toLocaleString()} from crop insurance` : ''}${aid ? `, $${aid.toLocaleString()} from farm programs` : ''}. Net ${net >= 0 ? '' : '−'}$${Math.abs(net).toLocaleString()}.`, '🚜', net >= 0 ? 'finance' : 'warn');
  if (weather.disaster) f.disasters = (f.disasters ?? 0) + 1;
  f.lastYear = { mode: 'operate', weather: weather.label, revenue: Math.round(revenue), costs: Math.round(costs), insurance: premium, indemnity, programs: aid, lines: programs, disasterAid: 0, net, tax, machinery, wages, hands: Math.round(hands * 10) / 10, feed, herd: Math.round(herdNet), shop, storedSale, establishing, grazing, soil: f.soil, crops };
  f.history = [...f.history.slice(-19), { age: state.character.age, net }];
}

/* ------------------------------------------------------------------ */
/* Things that come up                                                 */
/* ------------------------------------------------------------------ */

function offers(ctx) {
  const { state, rng } = ctx;
  const f = state.farm;
  if (f.mode !== 'operate' || !(f.acres || f.leased) || state.prompts.some((p) => p.type === 'farm.offer') || !rng.chance(0.3)) return;
  const price = landPrice(state);
  const list = [];
  if (price && countryOf(state) !== 'CN') list.push('land');
  if (leaseRent(state)) list.push('lease');
  if (f.acres >= 100 && !f.extras.solar) list.push('solar');
  if (f.herd.head >= 20) list.push('disease');
  if (f.herd.head && state.farm.lastYear?.feed) list.push('feed');
  const kind = rng.pick(list);
  if (!kind) return;
  const plot = rng.pick(plotsFor(state).slice(0, 3)) ?? 80;
  if (kind === 'land') {
    const ask = Math.round(plot * (f.valuePerAcre || price) * rng.float(1.05, 1.25));
    return ctx.prompt({ type: 'farm.offer', icon: '🪧', title: 'The Neighbouring Farm', text: `The farm next door is for sale: ${area(state, plot)} for $${ask.toLocaleString()}. Land next to yours comes up maybe once in a generation.`, options: [
      { id: 'buy', label: `🏦 Buy it with a ${farmCountry(state).lender} loan`, hint: `$${Math.round(ask * DOWN).toLocaleString()} down` },
      { id: 'pass', label: 'Let it go' },
    ], data: { kind, plot, ask } });
  }
  if (kind === 'lease') {
    const rent = Math.round(plot * leaseRent(state));
    return ctx.prompt({ type: 'farm.offer', icon: '🤝', title: 'Land to Rent', text: `A retiring neighbour would rather rent their ${area(state, plot)} to you than sell: $${rent.toLocaleString()} a year.`, options: [
      { id: 'take', label: '🤝 Take on the lease' },
      { id: 'pass', label: 'No thanks' },
    ], data: { kind, plot } });
  }
  if (kind === 'solar') {
    const acres = Math.round(Math.min(f.acres * 0.25, 200));
    const rent = Math.round(acres * rng.int(700, 1100));
    return ctx.prompt({ type: 'farm.offer', icon: '☀️', title: 'The Solar Developer', text: `A solar developer wants to lease ${area(state, acres)} of your land for 25 years: $${rent.toLocaleString()} a year, guaranteed. Some neighbours will grumble about losing farmland.`, options: [
      { id: 'sign', label: '☀️ Sign the lease' },
      { id: 'pass', label: 'Keep farming it' },
    ], data: { kind, acres, rent } });
  }
  if (kind === 'disease') {
    const what = f.herd.kind === 'sheep' ? 'scrapie' : countryOf(state) === 'GB' || countryOf(state) === 'IE' || countryOf(state) === 'NZ' ? 'bovine TB' : 'brucellosis';
    return ctx.prompt({ type: 'farm.offer', icon: '🩺', title: 'A Positive Test', text: `The vet found ${what} in your herd. Test and cull now (compensation covers part of it), or keep quiet and hope it doesn't spread — and that nobody finds out.`, options: [
      { id: 'cull', label: '🩺 Report it, test and cull' },
      { id: 'hide', label: '🤫 Say nothing', tone: 'danger' },
    ], data: { kind } });
  }
  if (kind === 'feed') {
    const cost = Math.round(f.lastYear.feed * 1.2);
    return ctx.prompt({ type: 'farm.offer', icon: '🌾', title: 'Short of Grass', text: `Your pasture isn't carrying the herd: last year you bought $${f.lastYear.feed.toLocaleString()} of feed. Sell some of the herd, or keep them all and keep buying feed?`, options: [
      { id: 'destock', label: '🐄 Sell down to what the grass carries' },
      { id: 'keep', label: `Keep them all (≈$${cost.toLocaleString()} of feed)` },
    ], data: { kind } });
  }
}

function buyLand(ctx, acres, total, loan) {
  const { state } = ctx;
  const f = ensureFarm(state.farm);
  const due = loan ? Math.round(total * DOWN) : total;
  state.finances.cash -= due;
  if (!f.acres && !f.leased) startFarm(state);
  if (!f.acres) f.valuePerAcre = Math.round(total / acres);
  else f.valuePerAcre = Math.round((f.valuePerAcre * f.acres + total) / (f.acres + acres));
  f.acres += acres;
  if (loan) {
    const principal = total - due + (f.loan?.balance ?? 0);
    f.loan = { balance: principal, payment: pay(principal), rate: LOAN_RATE };
  }
}
/** A new farm: fields laid out for the place (cattle country stays in grass). */
function startFarm(state) {
  const f = state.farm;
  const crops = cropsHere(state);
  const price = landPrice(state) ?? 3000;
  const ranch = price < 2000 && crops.includes('pasture');
  const first = ['corn', 'wheat', 'rice', 'barley'].find((c) => crops.includes(c)) ?? crops[0];
  const second = ['soybeans', 'canola', 'hay'].find((c) => crops.includes(c) && c !== first) ?? first;
  f.regionId = state.character.regionId;
  f.fields = Array.from({ length: FIELDS }, (_, i) => ({ crop: ranch ? (i < 3 ? 'pasture' : 'hay') : i % 2 ? second : first, last: null, establish: 0 }));
  f.herd = { kind: 'beef', head: 0 };
  for (const id of COMMODITIES) f.prices[id] ??= 1;
}

export const FarmModule = {
  id: 'farm',
  order: 47,

  init(state) {
    state.farm ??= ensureFarm({ acres: 0, valuePerAcre: 0, regionId: null, mode: 'operate', insured: true, coverage: 0.7, loan: null, prices: {}, lastYear: null });
  },

  onAgeUp(ctx) {
    const f = ensureFarm(ctx.state.farm);
    if (!f.acres && !f.leased) return;
    // Away from the farm (prison, a move): a neighbour cash-rents the land, and leased land goes back.
    const away = ctx.state.legal.incarceration || (f.regionId && f.regionId !== ctx.state.character.regionId);
    if (away && f.mode === 'operate') {
      f.mode = 'rent';
      if (f.leased) f.leased = 0;
      if (f.herd.head) {
        ctx.earn(Math.round(herdValue(f) * 0.85), 'Herd dispersal sale');
        f.herd.head = 0;
      }
      ctx.log(ctx.state.legal.incarceration ? 'While you were locked up, a neighbour cash-rented your land and the herd was sold.' : 'You can\'t farm from away: a neighbour cash-rents your land now, and the herd was sold.', '🚜');
    }
    if (f.leased && !f.acres && f.mode === 'rent') f.leased = 0;
    // Leased land: the rent, due every year.
    if (f.leased && f.mode === 'operate') ctx.spend(Math.round(f.leased * (leaseRent(ctx.state) ?? 0)), countryOf(ctx.state) === 'CN' ? 'Land-use rights (village collective)' : 'Rent on leased farmland', { allowDebt: true });
    farmTick(ctx);
    offers(ctx);
  },

  actions: {
    /** arg: 'acres:loan|cash' */
    buy(ctx, arg) {
      const { state } = ctx;
      const [a, how = 'loan'] = String(arg).split(':');
      const acres = Number(a);
      if (!plotsFor(state).includes(acres)) return;
      const check = buyCheck(state, acres, how === 'loan');
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      buyLand(ctx, acres, check.price, how === 'loan');
      ctx.log(`You bought ${area(state, acres)} for $${check.price.toLocaleString()}${how === 'loan' ? ` with a loan from ${farmCountry(state).lender}` : ''}. You now farm ${area(state, farmedAcres(state.farm))}.`, '🌾', 'milestone');
    },
    /** arg: acres to lease in. */
    lease(ctx, arg) {
      const { state } = ctx;
      const acres = Number(arg);
      if (!plotsFor(state).includes(acres)) return;
      const check = leaseCheck(state, acres);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const f = ensureFarm(state.farm);
      if (!f.acres && !f.leased) startFarm(state);
      f.leased += acres;
      ctx.log(countryOf(state) === 'CN' ? `You contracted the land-use rights to ${area(state, acres)} from the village collective.` : `You leased ${area(state, acres)} at $${check.rent.toLocaleString()} a year.`, '🤝', 'milestone');
    },
    unlease(ctx) {
      const f = ctx.state.farm;
      if (!f.leased) return;
      ctx.log(`You gave up the lease on ${area(ctx.state, f.leased)}.`, '🤝');
      f.leased = 0;
      if (!f.acres) closeFarm(ctx);
    },
    sell(ctx) {
      const { state } = ctx;
      const f = ensureFarm(state.farm);
      if (!f.acres && !f.leased) return;
      const proceeds = Math.round(landValue(state) * 0.94);
      const kit = Math.round(herdValue(f) * 0.9 + (f.machinery?.value ?? 0) * 0.85 + f.stored * (f.prices[f.storedFrom ?? 'corn'] ?? 1));
      const owed = f.loan?.balance ?? 0;
      state.finances.cash += proceeds + kit - owed;
      ctx.log(`You sold up: ${f.acres ? `${area(state, f.acres)} for $${proceeds.toLocaleString()}` : 'gave up the leases'}${kit ? `, and $${kit.toLocaleString()} for the herd, machinery and grain` : ''}${owed ? `; $${owed.toLocaleString()} went to pay off the loan` : ''}.`, '🪧', 'milestone');
      closeFarm(ctx);
    },
    /** Every field to one crop (arg: crop id). */
    setCrop(ctx, id) {
      const f = ensureFarm(ctx.state.farm);
      if (!CROPS[id] || !cropsHere(ctx.state).includes(id)) return;
      for (let i = 0; i < FIELDS; i++) plant(ctx, f, i, id);
    },
    /** arg: 'field:crop' */
    setField(ctx, arg) {
      const [i, id] = String(arg).split(':');
      const f = ensureFarm(ctx.state.farm);
      if (!CROPS[id] || !cropsHere(ctx.state).includes(id) || !f.fields[Number(i)]) return;
      plant(ctx, f, Number(i), id);
    },
    setMode(ctx, mode) {
      if (!['operate', 'rent'].includes(mode)) return;
      const f = ensureFarm(ctx.state.farm);
      if (mode === 'rent' && !f.acres) return ctx.toast('You only lease land — there\'s nothing of yours to rent out', 'warn');
      f.mode = mode;
      if (mode === 'rent') {
        if (f.leased) f.leased = 0;
        if (f.herd.head) { ctx.earn(Math.round(herdValue(f) * 0.85), 'Herd dispersal sale'); f.herd.head = 0; }
      }
      ctx.toast(mode === 'rent' ? 'Cash-renting the land to a neighbour (leases given up, herd sold)' : 'Farming it yourself', 'info');
    },
    /** arg: '0' (none) | '0.7' | '0.85' */
    insurance(ctx, level) {
      const f = ctx.state.farm;
      if (level === '0') f.insured = false;
      else if (COVERAGE[level]) {
        f.insured = true;
        f.coverage = farmCountry(ctx.state)?.insurance === 'subsidized' ? Number(level) : 0.7;
      }
    },
    /** arg: 'cover' | 'noTill' | 'organic' | 'rotate' — toggles a practice. */
    practice(ctx, id) {
      const { state } = ctx;
      const p = ensureFarm(state.farm).practices;
      if (id === 'organic') {
        p.organic = p.organic == null ? state.character.age : null;
        return ctx.toast(p.organic == null ? 'Back to conventional farming' : 'Organic conversion begins: three years of transition before the premium', 'info');
      }
      if (id === 'rotate') return void (state.farm.rotate = !state.farm.rotate);
      if (!['cover', 'noTill'].includes(id)) return;
      p[id] = !p[id];
    },
    /** arg: 'harvest' | 'store' | 'forward' */
    marketing(ctx, how) {
      const f = ensureFarm(ctx.state.farm);
      if (!['harvest', 'store', 'forward'].includes(how)) return;
      if (how === 'store' && !f.bins) return ctx.toast('You need grain bins to store a crop', 'warn');
      f.marketing = how;
    },
    /** arg: 'machinery' | 'bins' | 'shop' | 'parlour' */
    build(ctx, what) {
      const { state } = ctx;
      const f = ensureFarm(state.farm);
      const cost = buildCost(f, what);
      if (cost == null) return;
      if (state.finances.cash < cost) return ctx.toast(`Needs $${cost.toLocaleString()}`, 'warn');
      state.finances.cash -= cost;
      if (what === 'machinery') f.machinery = { value: cost };
      if (what === 'bins') f.bins = true;
      if (what === 'shop') f.extras.shop = true;
      if (what === 'parlour') f.parlour = Math.max(f.parlour, Math.max(60, f.herd.head));
      ctx.log({ machinery: `You bought a line of machinery for $${cost.toLocaleString()}: no more waiting on contractors.`, bins: 'You put up grain bins: now you can hold a crop for a better price.', shop: 'You opened a farm shop at the gate.', parlour: `You built a milking parlour for ${f.parlour} cows.` }[what], '🏗️', 'milestone');
    },
    sellMachinery(ctx) {
      const f = ensureFarm(ctx.state.farm);
      if (!f.machinery) return;
      ctx.earn(Math.round(f.machinery.value * 0.85), 'Machinery sale');
      f.machinery = null;
    },
    /** arg: 'beef' | 'dairy' | 'sheep' — switch kinds (sells the current herd). */
    herdKind(ctx, kind) {
      const f = ensureFarm(ctx.state.farm);
      if (!LIVESTOCK[kind] || f.herd.kind === kind) return;
      if (f.herd.head) ctx.earn(Math.round(herdValue(f) * 0.9), 'Herd sale');
      f.herd = { kind, head: 0 };
    },
    /** arg: '+10' / '-10' etc. */
    stock(ctx, arg) {
      const { state } = ctx;
      const f = ensureFarm(state.farm);
      const n = Math.trunc(Number(arg));
      if (!n || f.mode !== 'operate') return;
      const kind = LIVESTOCK[f.herd.kind];
      if (n > 0) {
        if (kind.parlour && f.herd.head + n > f.parlour) return ctx.toast(`Your parlour milks ${f.parlour} cows — build a bigger one`, 'warn');
        if (!pastureAcres(f)) return ctx.toast('Put a field down to pasture first', 'warn');
        const cost = n * kind.value;
        if (state.finances.cash < cost) return ctx.toast(`Needs $${cost.toLocaleString()}`, 'warn');
        state.finances.cash -= cost;
        f.herd.head += n;
      } else {
        const sold = Math.min(f.herd.head, -n);
        if (!sold) return;
        ctx.earn(Math.round(sold * kind.value * 0.9), 'Livestock sale');
        f.herd.head -= sold;
      }
    },
  },

  resolvers: {
    offer(ctx, data, optionId) {
      const { state, rng } = ctx;
      const f = ensureFarm(state.farm);
      if (data.kind === 'land' && optionId === 'buy') {
        if (state.finances.cash < data.ask * DOWN) return ctx.log('You couldn\'t raise the deposit; the neighbouring farm went to someone else.', '🪧', 'warn');
        buyLand(ctx, data.plot, data.ask, true);
        return ctx.log(`You bought the neighbouring farm: ${area(state, data.plot)}. You now farm ${area(state, farmedAcres(f))}.`, '🌾', 'milestone');
      }
      if (data.kind === 'lease' && optionId === 'take') {
        f.leased += data.plot;
        return ctx.log(`You took on the lease: ${area(state, data.plot)} more to farm.`, '🤝', 'good');
      }
      if (data.kind === 'solar' && optionId === 'sign') {
        f.extras.solar = { acres: data.acres, rent: data.rent, until: state.character.age + 25 };
        return ctx.log(`You signed a 25-year solar lease on ${area(state, data.acres)}: $${data.rent.toLocaleString()} a year.`, '☀️', 'finance');
      }
      if (data.kind === 'disease') {
        if (optionId === 'cull') {
          const lost = Math.max(1, Math.round(f.herd.head * rng.float(0.1, 0.3)));
          f.herd.head -= lost;
          ctx.earn(Math.round(lost * LIVESTOCK[f.herd.kind].value * 0.6), 'Government compensation for culled stock');
          ctx.stat('happiness', -4);
          return ctx.log(`The herd was tested; ${lost} went for slaughter, and the farm was under movement restrictions for months.`, '🩺', 'warn');
        }
        if (rng.chance(0.4)) {
          const lost = Math.round(f.herd.head * rng.float(0.4, 0.7));
          f.herd.head -= lost;
          ctx.spend(5000, 'Fine for failing to report a notifiable disease', { allowDebt: true });
          return ctx.log(`It spread. The authorities traced it to your farm: ${lost} animals were destroyed with no compensation, and you were fined.`, '⚠️', 'bad');
        }
        return ctx.log('You said nothing. This time, it seemed to burn itself out.', '🤫');
      }
      if (data.kind === 'feed' && optionId === 'destock') {
        const cap = capacity(state, f);
        const sold = Math.max(0, f.herd.head - cap);
        if (sold) {
          ctx.earn(Math.round(sold * LIVESTOCK[f.herd.kind].value * 0.85), 'Livestock sale');
          f.herd.head -= sold;
          ctx.log(`You sold ${sold} head: the herd fits the grass again.`, '🐄');
        }
      }
    },
  },
};

function plant(ctx, f, i, id) {
  const field = f.fields[i];
  if (field.crop === id) return;
  const crop = CROPS[id];
  if (crop.establish) {
    const cost = Math.round((farmedAcres(f) / FIELDS) * crop.plant * (farmCountry(ctx.state)?.prod ?? 1));
    if (ctx.state.finances.cash < cost) return ctx.toast(`Planting a ${crop.name.toLowerCase()} costs $${cost.toLocaleString()}`, 'warn');
    ctx.spend(cost, `Planting a ${crop.name.toLowerCase()}`);
    field.establish = crop.establish;
  } else field.establish = 0;
  field.crop = id;
}

export function buildCost(f, what) {
  const cropped = (farmedAcres(f) / FIELDS) * f.fields.filter((x) => x.crop !== 'pasture').length;
  if (what === 'machinery') return f.machinery ? null : Math.round(Math.min(1200000, Math.max(60000, cropped * 350)));
  if (what === 'bins') return f.bins ? null : BINS_COST;
  if (what === 'shop') return f.extras.shop ? null : SHOP_COST;
  if (what === 'parlour') return f.herd.kind !== 'dairy' ? null : Math.max(60, f.herd.head + 40) * PARLOUR_PER_HEAD - f.parlour * PARLOUR_PER_HEAD;
  return null;
}

function closeFarm(ctx) {
  const f = ctx.state.farm;
  Object.assign(f, { acres: 0, leased: 0, valuePerAcre: 0, regionId: null, loan: null, lastYear: null, herd: { kind: 'beef', head: 0 }, parlour: 0, machinery: null, bins: false, stored: 0, marketing: 'harvest', extras: { shop: false, solar: null }, mode: 'operate' });
}
