/**
 * Business types. Licensed trades and professions are gated through the
 * credential registry; everything is in today's dollars at "scale 1"
 * (a typical single-location small business).
 *
 *   credentials  anyOf: you must hold one of these
 *   cost         startup cost (equipment, build-out, first-year working capital)
 *   revenue      annual revenue at full ramp, average quality and reputation
 *   cogs         cost of goods / materials / agent splits as a share of revenue
 *   staff, wage  employees and average loaded wage
 *   rent, insurance  annual fixed costs (rent scales with local cost of living)
 *   cyclical     0–1: how hard a recession hits demand
 *   inspection   'health' (food) or 'board' (licensing board) or null
 *   professions  career experience that makes you a better operator
 *   startup      venture-scale tech startup (ARR growth model, VC eligible)
 */
export const BUSINESS_TYPES = {
  foodTruck: { name: 'Food Truck', icon: '🚚', credentials: ['servSafe'], cost: 90000, revenue: 260000, cogs: 0.32, staff: 3, wage: 32000, rent: 12000, insurance: 8000, cyclical: 0.7, inspection: 'health', professions: ['culinary', 'hospitality'] },
  restaurant: { name: 'Restaurant', icon: '🍽️', credentials: ['servSafe'], minExperience: 3, cost: 400000, revenue: 1200000, cogs: 0.32, staff: 18, wage: 30000, rent: 100000, insurance: 20000, cyclical: 0.9, inspection: 'health', professions: ['culinary', 'hospitality'] },
  salon: { name: 'Hair Salon', icon: '💇', credentials: ['cosmetologyLicense'], cost: 70000, revenue: 350000, cogs: 0.12, staff: 5, wage: 35000, rent: 36000, insurance: 6000, cyclical: 0.5, inspection: 'board', professions: ['cosmetology'] },
  retail: { name: 'Retail Store', icon: '🛍️', credentials: [], cost: 150000, revenue: 700000, cogs: 0.55, staff: 6, wage: 30000, rent: 60000, insurance: 8000, cyclical: 0.8, inspection: null, professions: ['retail'] },
  electrical: { name: 'Electrical Contractor', icon: '⚡', credentials: ['masterElectrician'], cost: 60000, revenue: 1150000, cogs: 0.4, staff: 6, wage: 65000, rent: 30000, insurance: 30000, cyclical: 0.8, inspection: 'board', professions: ['trades'] },
  plumbing: { name: 'Plumbing Contractor', icon: '🚰', credentials: ['masterPlumber'], cost: 60000, revenue: 1050000, cogs: 0.38, staff: 6, wage: 62000, rent: 28000, insurance: 28000, cyclical: 0.6, inspection: 'board', professions: ['plumbing'] },
  trucking: { name: 'Trucking Company', icon: '🚛', credentials: ['cdlA'], cost: 220000, revenue: 600000, cogs: 0.38, staff: 3, wage: 60000, rent: 15000, insurance: 40000, cyclical: 0.9, inspection: null, professions: ['trucking'] },
  lawFirm: { name: 'Law Firm', icon: '⚖️', credentials: ['barLicense'], cost: 50000, revenue: 600000, cogs: 0.05, staff: 4, wage: 70000, rent: 60000, insurance: 15000, cyclical: 0.3, inspection: 'board', professions: ['law', 'prosecution', 'publicDefender'] },
  practice: { name: 'Private Medical Practice', icon: '🩺', credentials: ['medicalLicense', 'np'], cost: 300000, revenue: 1200000, cogs: 0.1, staff: 9, wage: 55000, rent: 100000, insurance: 60000, cyclical: 0.2, inspection: 'board', professions: ['medical', 'nursing'] },
  cpaFirm: { name: 'CPA Firm', icon: '🧮', credentials: ['cpa'], cost: 30000, revenue: 500000, cogs: 0.05, staff: 4, wage: 60000, rent: 40000, insurance: 12000, cyclical: 0.3, inspection: 'board', professions: ['accounting'] },
  brokerage: { name: 'Real Estate Brokerage', icon: '🏘️', credentials: ['brokerLicense'], cost: 40000, revenue: 700000, cogs: 0.55, staff: 3, wage: 45000, rent: 40000, insurance: 10000, cyclical: 1.0, inspection: 'board', professions: ['realestate'] },
  propertyMgmt: { name: 'Property Management Company', icon: '🏢', credentials: ['realEstate'], cost: 20000, revenue: 300000, cogs: 0.1, staff: 3, wage: 45000, rent: 24000, insurance: 8000, cyclical: 0.3, inspection: null, professions: ['propertyManagement', 'realestate'] },
  techStartup: { name: 'Tech Startup', icon: '🚀', credentials: [], cost: 25000, revenue: 0, cogs: 0.2, staff: 0, wage: 140000, rent: 6000, insurance: 2000, cyclical: 0.6, inspection: null, professions: ['tech', 'engineering'], startup: true },
};

/** Legal structure: liability protection, taxes and paperwork. */
export const ENTITIES = {
  sole: { name: 'Sole Proprietorship', icon: '🧍', liability: false, admin: 0, passThrough: true, payroll: false, desc: 'No paperwork. Profit is taxed as yours, plus 15.3% self-employment tax. You are personally liable for every debt.' },
  llc: { name: 'LLC', icon: '🛡️', liability: true, admin: 500, passThrough: true, payroll: false, desc: 'Same taxes as a sole proprietor, but your personal assets are shielded from business debts (except ones you personally guarantee).' },
  scorp: { name: 'S Corporation', icon: '📑', liability: true, admin: 2500, passThrough: true, payroll: true, desc: 'You pay yourself a reasonable salary (payroll tax applies); the rest passes through without payroll tax. Investors can\'t buy in.' },
  ccorp: { name: 'C Corporation', icon: '🏛️', liability: true, admin: 4000, passThrough: false, payroll: true, desc: '21% corporate tax, then dividends are taxed again. Required for venture capital and an IPO. Stock held 5+ years may sell tax-free (QSBS).' },
};

/** Startup funding rounds: what traction investors want, how much they put in, and what they take. */
export const ROUNDS = [
  { id: 'seed', name: 'Seed round', minArr: 0, minGrowth: 0, raise: [500000, 2000000], dilution: [0.15, 0.25] },
  { id: 'seriesA', name: 'Series A', minArr: 1000000, minGrowth: 1.0, raise: [5000000, 15000000], dilution: [0.18, 0.25] },
  { id: 'seriesB', name: 'Series B', minArr: 5000000, minGrowth: 0.7, raise: [20000000, 40000000], dilution: [0.15, 0.22] },
  { id: 'seriesC', name: 'Series C', minArr: 20000000, minGrowth: 0.5, raise: [50000000, 120000000], dilution: [0.12, 0.18] },
];

/** SBA 7(a): 10% down, 10-year term, about prime + 2.75%. Personal guarantee required. */
export const SBA = { downPayment: 0.1, years: 10, rate: 0.105, minScore: 650, max: 5000000 };

/** Marketing levels: share of revenue spent and the demand lift it buys. */
export const MARKETING = [
  { label: 'None', share: 0, lift: 0.9 },
  { label: 'Light', share: 0.02, lift: 1.0 },
  { label: 'Steady', share: 0.05, lift: 1.07 },
  { label: 'Aggressive', share: 0.09, lift: 1.12 },
];
