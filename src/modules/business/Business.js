/**
 * Business model — pure helpers: eligibility, the yearly P&L, valuation and
 * what an exit pays. BusinessEngine applies them to the game.
 *
 * state.business = {
 *   current: {
 *     id, typeId, name, entity, foundedAge, years, scale,
 *     role: 'operator'|'absentee', marketing (0–3), drawPct (0–1),
 *     quality, reputation (0–100), staff: { headcount, morale, productivity,
 *       workforce, costPremium, delegation, unionized, unionRisk },
 *     benefits: { health, match }, family: [personId], licensedManager,
 *     cash, assets, debts: { sba: { balance, rate, annual, guaranteed }, loc, payables },
 *     ownerPct, basis, investors: [{ round, pct, invested }], lastRound,
 *     arr, growth (startups), valuation, violations: [age], lastYear
 *   } | null,
 *   history: [{ name, typeId, startAge, endAge, outcome, proceeds }],
 *   listings: [...businesses for sale],
 * }
 */
import { clamp } from '../../core/Random.js';
import { yearsInProfession } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { credentialName } from '../credentials/CredentialRegistry.js';
import { regionOf } from '../life/Regions.js';
import { WORKFORCE_MODES } from '../career/ContractingSystem.js';
import { DUTIES } from '../career/ManagementEngine.js';
import { BUSINESS_TYPES, ENTITIES, MARKETING, SBA, SIZE_OPTIONS, sizesFor, startupCostFor } from './BusinessTypes.js';
import { ownershipRules } from './OwnershipRules.js';
import { licenseEffects, openingLicenseBlock, openingLicenseFees } from './BusinessLicenses.js';
import { competitionFactor, effectiveLocations } from '../org/Businesses.js';
import { initiativeEffects } from './Initiatives.js';
import { focusEffects } from './OwnerJob.js';
import { businessLawEffects } from '../politics/Laws.js';
import { structureEffects } from './Structure.js';
export { charge } from './TaxBook.js';
import { royaltiesOn, franchisorFinancials } from './Franchising.js';
import { OPERATIONS, opsOf, newOps, opsRevenue, fleetUpkeep } from './Operations.js';

export const SS_WAGE_CAP = 176100;
/** Net revenue effect of a price point (price × volume) and policy cost multipliers — see OwnerActions. */
/** Premium prices pay when quality earns them; budget prices win volume when it doesn't. */
export const priceFactor = (level, quality) => (level === 'premium' ? 0.94 + (quality - 40) / 300 : level === 'budget' ? 0.96 + (50 - quality) / 500 : 1);
const SUPPLIER_COGS = { cheap: 0.95, standard: 1, premium: 1.05 };
const PAY_POLICY = { below: 0.92, market: 1, above: 1.08 };
export const CORPORATE_TAX = 0.21;
/** Building trades: public works budgets move their demand. */
export const CONSTRUCTION_TYPES = ['electrical', 'plumbing', 'hvacContractor', 'constructionCo', 'demolitionCo', 'homeBuilder', 'engineeringFirm', 'solarInstaller', 'excavation', 'craneRental', 'roofing', 'landscaping', 'surveyFirm'];
export const PHASE_DEMAND = { expansion: 1.05, peak: 1.08, recession: 0.8, recovery: 0.95 };
export const LICENSED_MANAGER = 95000;
/** Types that must be owned by a licensee (no lay owners of law firms or medical practices). */
export const LICENSEE_ONLY = ['lawFirm', 'practice', 'cpaFirm', 'dentalPractice'];

export const currentBusiness = (state) => state.business?.current ?? null;
export const typeOf = (biz) => BUSINESS_TYPES[biz.typeId];

/** Can you legally run this type of business yourself? */
export const holdsLicense = (state, type) => !type.credentials.length || type.credentials.some((c) => hasCredential(state, c));

/** Years of relevant experience you bring (jobs in related professions). */
export const experienceYears = (state, type) => yearsInProfession(state, type.professions);

/** Starting a business: what's required and how you'd pay for it. */
export function startEligibility(state, typeId, funding = 'cash', size = 'standard') {
  const type = BUSINESS_TYPES[typeId];
  if (!type) return { ok: false, reason: 'Unknown business' };
  if (state.character.age < 18) return { ok: false, reason: 'Must be 18' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (currentBusiness(state)) return { ok: false, reason: 'You already own a business' };
  if (!holdsLicense(state, type)) return { ok: false, reason: `Needs ${type.credentials.map(credentialName).join(' or ')}` };
  if (type.minExperience && experienceYears(state, type) < type.minExperience) return { ok: false, reason: `Needs ${type.minExperience} yrs of industry experience` };
  const rules = ownershipRules(state, typeId);
  if (!rules.ok) return { ok: false, reason: rules.reason };
  const licenseBlock = openingLicenseBlock(state, typeId);
  if (licenseBlock) return { ok: false, reason: licenseBlock };
  if (!sizesFor(type).includes(size)) return { ok: false, reason: `Can't open as ${SIZE_OPTIONS[size]?.label ?? size}` };
  const minExp = SIZE_OPTIONS[size]?.minExperience ?? 0;
  if (minExp && experienceYears(state, type) + (state.business?.history?.length ?? 0) * 3 < minExp) return { ok: false, reason: `A ${SIZE_OPTIONS[size].label.toLowerCase()} needs ${minExp}+ yrs of industry or ownership experience` };
  const scale = SIZE_OPTIONS[size]?.scale ?? 1;
  return fundingCheck(state, startupCostFor(type, size) + openingLicenseFees(typeId), funding, type, { cashFlow: type.startup ? 0 : projectedCashFlow(state, typeId) * scale });
}

/** Typical yearly cash flow before debt service once established (a lender's projection). */
export function projectedCashFlow(state, typeId) {
  const mean = { float: (a, b) => (a + b) / 2, int: (a, b) => Math.round((a + b) / 2), pick: (xs) => xs[0], id: () => 'probe' };
  const probe = newBusiness(mean, state, typeId, { name: 'probe', years: 3, quality: 55, reputation: 50, fit: 1 });
  probe.role = 'operator';
  const ly = yearFinancials(state, probe, mean);
  return ly.operatingIncome;
}

/** Lenders want cash flow to cover the loan payment and still pay you something. */
export const DSCR = 1.5;

/** Paying a price with cash or an SBA 7(a) loan (underwritten on cash flow and experience). */
export function fundingCheck(state, price, funding, type = null, { cashFlow = null } = {}) {
  if (funding === 'sba') {
    if (type?.startup) return { ok: false, reason: 'Banks don\'t lend to pre-revenue startups — raise from investors' };
    if (type && !type.credentials.length && experienceYears(state, type) < 2) return { ok: false, reason: 'SBA lenders want 2+ years of industry experience' };
    const annual = annualPayment(price * (1 - SBA.downPayment), SBA.rate, SBA.years);
    if (cashFlow != null && cashFlow < annual * DSCR) return { ok: false, reason: `Lender: projected cash flow ($${Math.round(Math.max(0, cashFlow)).toLocaleString()}) can't cover $${annual.toLocaleString()}/yr payments` };
    if (state.housing.credit.score < SBA.minScore) return { ok: false, reason: `SBA lenders want a ${SBA.minScore}+ credit score` };
    const last = state.finances.lastBankruptcy;
    if (last && state.character.age - last.age < 3) return { ok: false, reason: 'Recent bankruptcy' };
    const down = Math.round(price * SBA.downPayment);
    if (state.finances.cash < down) return { ok: false, reason: `Needs $${down.toLocaleString()} down (10%)` };
    return { ok: true, down, loan: price - down };
  }
  if (state.finances.cash < price) return { ok: false, reason: `Costs $${price.toLocaleString()} cash` };
  return { ok: true, down: price, loan: 0 };
}

/**
 * Short-staffed shops turn customers away; extra hands help a little, with
 * diminishing returns. 1.0 at the type's normal staffing for its size.
 */
export function staffFactor(biz) {
  const type = BUSINESS_TYPES[biz.typeId];
  if (!type?.staff || type.startup) return 1;
  const ratio = biz.staff.headcount / Math.max(1, type.staff * biz.scale);
  return clamp(ratio, 0.3, 1.25) ** (ratio < 1 ? 0.7 : 0.35);
}

/** Your skill as an operator: relevant experience and smarts. */
export function ownerSkill(state, type) {
  // Past businesses and management experience help a little on top of industry years.
  const owned = Math.min(4, (state.business?.history ?? []).reduce((s, h) => s + (h.years ?? 0), 0) * 0.5);
  const managed = state.career.history.some((h) => (h.peakGrade ?? 0) >= 6) ? 2 : 0;
  return Math.min(30, experienceYears(state, type) * 3) + state.stats.smarts * 0.25 + owned + managed;
}

export function debtBalance(biz) {
  return (biz.debts.sba?.balance ?? 0) + (biz.debts.loc ?? 0) + (biz.debts.payables ?? 0) + (biz.ops?.loan?.balance ?? 0);
}

/** Debts you signed for personally (SBA loans and credit lines always carry a personal guarantee). */
export function guaranteedDebt(biz) {
  return (biz.debts.sba?.balance ?? 0) + (biz.debts.loc ?? 0) + (biz.ops?.loan?.balance ?? 0);
}

/**
 * One year of operations. Returns the P&L (dollars, not applied).
 * `rng` drives demand noise; quality, reputation and staff are read, not changed.
 */
export function yearFinancials(state, biz, rng) {
  const type = typeOf(biz);
  const col = regionOf(state).col;
  const mode = WORKFORCE_MODES[biz.staff.workforce];
  const phase = PHASE_DEMAND[state.economy.phase] ?? 1;
  // Rivals in the same market take a share of customers (see org/Businesses).
  const competition = biz.orgId ? competitionFactor(state, biz) : 1;
  // Licenses: optional ones add customers or bigger tickets; a required one still pending means you're barely open.
  const lic = licenseEffects(biz);
  // Laws where it operates: wage floors, paid leave, public works, taxes (politics/Laws).
  const law = businessLawEffects(state, state.character.regionId, { wage: type.wage, revenue: biz.lastYear?.revenue ?? 0, construction: CONSTRUCTION_TYPES.includes(biz.typeId) });
  // A strike or lockout shuts the doors for weeks (LaborUnions).
  const stoppage = biz.strike ? clamp(biz.strike.weeks / 52, 0, 0.5) : 0;
  // How you've organized the company (Structure): divisions, lean or regional design.
  const sfx = structureEffects(state, biz);
  const demand = law.demand * (1 + (phase - 1) * type.cyclical) * (0.55 + biz.quality / 110) * (0.6 + biz.reputation / 125) * MARKETING[biz.marketing].lift * (biz.fit ?? 1) * (biz.franchise?.lift ?? 1) * competition * lic.demand;
  const ramp = (biz.years <= 1 ? 0.7 : biz.years === 2 ? 0.9 : 1) * lic.revenue;
  // New businesses hire as customers arrive rather than staffing up on day one.
  const staffing = biz.years <= 1 ? 0.85 : biz.years === 2 ? 0.95 : 1;
  // Owner policies: price point, supplier quality, pay level (OwnerActions).
  const price = priceFactor(biz.priceLevel ?? 'standard', biz.quality);
  // Fleet and crew businesses earn what their booked capacity earns: contracts first, spot work for the rest (Operations).
  const ops = opsOf(biz) ? opsRevenue(biz, demand, rng) : null;
  // Chains: a brand people recognize, and locations that don't crowd each other out.
  const locations = type.startup ? 1 : effectiveLocations(state, biz);
  const brand = 1 + Math.min(0.12, 0.012 * ((biz.scale ?? 1) - 1));
  // Initiatives, promotions and key accounts (Initiatives.js).
  const ini = type.startup ? null : initiativeEffects(biz, state.character.age);
  // Your strategic focus as an executive (OwnerJob).
  const fx = focusEffects(biz);
  if (ini) {
    ini.revenue *= fx.revenue;
    ini.cogs *= fx.cogs;
    ini.payroll *= fx.payroll;
  }
  const revenue = Math.round(sfx.revenue * (1 - stoppage * 0.85) * (type.startup ? biz.arr
    : ops ? (ops.contractRevenue + ops.spotRevenue) * price * ramp * Math.sqrt(col) * ini.revenue
      : (type.revenue * locations * brand * demand * price * ramp * staffFactor(biz) * rng.float(0.88, 1.12) * ini.revenue + ini.accounts * ramp) * Math.sqrt(col)));
  // Fleet upkeep is booked separately, so it comes out of the cost-of-goods share.
  const cogsRate = ops ? Math.max(0.05, type.cogs - OPERATIONS[biz.typeId].upkeep / OPERATIONS[biz.typeId].perUnit) : type.cogs;
  // Buying power: bigger chains pay suppliers less.
  const buyingPower = 1 - Math.min(0.12, 0.015 * ((biz.scale ?? 1) - 1));
  const cogs = Math.round(revenue * cogsRate * (SUPPLIER_COGS[biz.supplier ?? 'standard'] ?? 1) * (ini?.cogs ?? 1) * buyingPower * sfx.cogs);
  const benefitsLoad = 1.08 + (biz.benefits.health ? 0.12 : 0) + biz.benefits.match;
  // Hours and part-timers flex with demand, so payroll is partly variable (startups pay their whole team).
  const busy = type.startup || ops ? 1 : clamp(revenue / Math.max(1, type.revenue * locations * brand * Math.sqrt(col)), 0.5, 1.6);
  const payroll = Math.round(biz.staff.headcount * type.wage * Math.sqrt(col) * mode.costMult * (1 + biz.staff.costPremium) * benefitsLoad * (0.55 + 0.45 * busy) * (type.startup ? 1 : staffing * Math.min(1, lic.revenue + 0.3)) * (PAY_POLICY[biz.payLevel ?? 'market'] ?? 1) * (ini?.payroll ?? 1) * law.payroll * sfx.payroll * (1 + sfx.payrollShare) * (1 - stoppage * 0.7));
  const delegated = Object.keys(DUTIES).filter((d) => biz.staff.delegation[d]);
  const overhead = Math.round(payroll * (mode.adminOverhead + delegated.reduce((s, d) => s + DUTIES[d].overhead, 0)));
  // A manager's pay scales with the operation: a food truck's lead isn't paid like a restaurant group's GM.
  // A general manager, then district managers as the chain grows (cheaper per location than an owner at every site).
  // As chief executive yourself, you replace the hired general manager (district managers still cost).
  const hiredChief = biz.role === 'absentee' || (biz.role === 'executive' && biz.ownerPost?.post === 'chair');
  // Without the license yourself you need a licensed qualifier. When a hired manager already runs it,
  // hiring a licensed one only costs a premium; otherwise it's a whole extra salary.
  const qualifier = !biz.licensedManager ? 0 : hiredChief || biz.role === 'executive' ? Math.round(clamp(revenue * 0.012, 8000, 30000)) : Math.round(clamp(revenue * 0.06, 40000, LICENSED_MANAGER) * law.licensing);
  const management = (hiredChief ? Math.round(clamp(revenue * 0.05, 40000, 90000)) : 0) + (biz.role !== 'operator' ? Math.max(0, (biz.scale ?? 1) - 1) * 12000 : 0) + qualifier;
  // Locations whose building you own pay property tax and upkeep instead of rent (see Premises).
  const owned = Math.min(biz.scale, biz.premises?.owned ?? 0);
  const rent = Math.round(type.rent * (biz.scale - owned) * col * (ini?.rent ?? 1) + (biz.premises?.value ?? 0) * PREMISES_CARRY);
  const initiatives = ini ? Math.round(revenue * ini.share + ini.fixed * Math.sqrt(col)) : 0;
  const insurance = Math.round(type.insurance * biz.scale * (ini?.insurance ?? 1));
  const marketing = Math.round(revenue * MARKETING[biz.marketing].share);
  const admin = ENTITIES[biz.entity].admin;
  const sba = biz.debts.sba;
  const interest = Math.round((sba?.balance ?? 0) * (sba?.rate ?? 0) + (biz.debts.loc ?? 0) * 0.12 + (biz.ops?.loan?.balance ?? 0) * (biz.ops?.loan?.rate ?? 0));
  // Equipment upkeep, and penalties for contracted work you couldn't cover.
  const fleet = ops ? Math.round(fleetUpkeep(biz) * Math.sqrt(col)) : 0;
  const penalties = ops ? Math.round(ops.shortfall * OPERATIONS[biz.typeId].perUnit * 0.25) : 0;
  // Franchisees pay royalties and the ad fund off the top; franchisors collect fees and royalties and pay for support.
  const royalties = royaltiesOn(biz, revenue);
  const { franchiseFees, royaltyIncome, franchiseSupport } = franchisorFinancials(biz, type);
  const structure = Math.round(revenue * sfx.costShare + sfx.cost);
  const operatingIncome = -structure + revenue - cogs - payroll - overhead - management - rent - insurance - marketing - initiatives - admin - royalties + franchiseFees + royaltyIncome - franchiseSupport - fleet - penalties;
  // S- and C-corp owners who work in the business take a W-2 salary (employer payroll tax applies).
  const entity = ENTITIES[biz.entity];
  // Funded startup founders pay themselves a modest salary out of the raise.
  // An executive post pays its salary as a wage whatever the entity.
  const ownerSalary = biz.role === 'executive' ? (biz.ownerPost?.salary ?? 0)
    : biz.role !== 'operator' || !entity.payroll ? 0
    : type.startup ? (biz.cash > 300000 ? 80000 : 0)
      : Math.round(clamp(operatingIncome * 0.4, 0, 150000));
  const payrollTax = Math.round(ownerSalary * 0.0765);
  const pretax = operatingIncome - interest - ownerSalary - payrollTax;
  // Off-book expenses and capital purchases since the last books (see charge()) are deducted for tax, not again from cash.
  const writeOffs = (biz.taxBook?.expense ?? 0) + (biz.taxBook?.capex ?? 0);
  const taxableProfit = pretax - writeOffs;
  const corporateTax = entity.passThrough ? 0 : Math.round(Math.max(0, taxableProfit) * law.corporateRate * (1 - law.taxCredit));
  const netIncome = pretax - corporateTax;
  return { strikeWeeks: biz.strike?.weeks ?? 0, structure, revenue, cogs, payroll, overhead, management, rent, insurance, marketing, initiatives, admin, royalties, franchiseFees, royaltyIncome, franchiseSupport, interest, operatingIncome, ownerSalary, payrollTax, corporateTax, netIncome, writeOffs, taxableProfit, fleet, penalties, ops };
}

/**
 * Equity value (after business debt). Small businesses sell for a multiple of
 * seller's discretionary earnings; startups for a multiple of revenue that
 * rises with growth — or their last funding round.
 */
export function valuation(biz, ly = biz.lastYear) {
  const type = typeOf(biz);
  const debt = debtBalance(biz);
  if (type.startup) {
    const multiple = clamp(2 + (biz.growth ?? 0) * 5, 1.5, 12);
    const ev = Math.max(biz.arr * multiple, (biz.lastRound?.post ?? 0) * 0.8 ** Math.max(0, (biz.years - (biz.lastRound?.year ?? biz.years))));
    return Math.max(0, Math.round(ev + Math.max(0, biz.cash) - debt));
  }
  const sde = (ly?.netIncome ?? 0) + (ly?.ownerSalary ?? 0) + (ly?.corporateTax ?? 0);
  // Bigger companies sell for higher multiples: a corner shop goes for ~2.5× earnings, a
  // $1M-profit company ~4×, a $10M one ~7×, the largest ~9×. Proven brands and franchise
  // systems sell for more; a public company's shares trade at a premium.
  const sizeMultiple = clamp(2.5 + 2.3 * Math.log10(Math.max(1, sde / 250000)), 2.5, 9);
  const multiple = sizeMultiple * (0.7 + biz.reputation / 170) * (biz.franchise ? 1.15 : 1) * (biz.franchisor?.units ? 1.3 : 1) * (biz.public ? 1.25 : 1);
  const ev = Math.max(0, sde) * multiple + biz.assets;
  return Math.max(0, Math.round(ev + Math.max(0, biz.cash) - debt));
}

/** Owning your premises: priced at ~14× a year's rent (a 7% cap rate); tax and upkeep ~2% of value a year. */
export const PREMISES_CAP_RATE = 0.07;
export const PREMISES_CARRY = 0.02;
export const premisesPrice = (state, biz) => Math.round(BUSINESS_TYPES[biz.typeId].rent * regionOf(state).col / PREMISES_CAP_RATE);

export function annualPayment(principal, rate, years) {
  if (principal <= 0) return 0;
  return Math.round((principal * rate) / (1 - (1 + rate) ** -years));
}

/** A fresh business (start, purchase or inheritance). */
export function newBusiness(rng, state, typeId, { name, entity = 'llc', scale = 1, years = 0, quality = 50, reputation = 45, cash = 0, assets = 0, sbaLoan = 0, basis = 0, fit = null } = {}) {
  const type = BUSINESS_TYPES[typeId];
  const biz = {
    id: rng.id('biz_'),
    typeId,
    name: name ?? businessName(rng, state, type),
    entity,
    foundedAge: state.character.age - years,
    years,
    scale,
    role: state.career.job ? 'absentee' : 'operator',
    marketing: 1,
    drawPct: type.startup ? 0 : 1,
    quality,
    reputation,
    // Location / concept / product-market fit: luck you only discover by opening.
    fit: fit ?? Math.round(rng.float(0.55, 1.2) * 100) / 100,
    staff: {
      headcount: Math.round(type.staff * scale),
      morale: 60,
      productivity: 55,
      workforce: 'direct',
      costPremium: 0,
      delegation: { hiring: false, reviews: false, scheduling: false },
      unionized: false,
      unionRisk: 10,
    },
    benefits: { health: type.wage >= 50000 && type.staff >= 4, match: 0 },
    family: [],
    licensedManager: false,
    cash,
    assets,
    debts: { sba: sbaLoan ? { balance: sbaLoan, rate: SBA.rate, annual: annualPayment(sbaLoan, SBA.rate, SBA.years), guaranteed: true } : null, loc: 0, payables: 0 },
    ownerPct: 1,
    basis,
    investors: [],
    lastRound: null,
    roundsRaised: 0,
    arr: 0,
    growth: 0,
    violations: [],
    lastYear: null,
    valuation: 0,
    franchise: null,
    franchisor: null,
    ops: newOps(rng, typeId, scale, years),
  };
  if (biz.ops && type.startUsed) for (const u of biz.ops.units) u.used = true;
  biz.valuation = Math.max(0, Math.round(cash + assets - sbaLoan));
  return biz;
}

const STARTUP_WORDS = ['Lumen', 'Quanta', 'Nimbus', 'Vertex', 'Kinetic', 'Parallax', 'Hatch', 'Orbit', 'Tandem', 'Cobalt'];
const STARTUP_SUFFIX = ['.ai', ' Labs', ' Health', ' Pay', ' Cloud', ' Robotics'];

const SELLER_NAMES = ['Kowalski', 'Nguyen', 'Romero', 'Okafor', 'Lindqvist', 'Haddad', 'Brennan', 'Castillo', 'Murphy', 'Takahashi'];

export function businessName(rng, state, type, { seller = false } = {}) {
  if (type.startup) return `${rng.pick(STARTUP_WORDS)}${rng.pick(STARTUP_SUFFIX)}`;
  const last = seller ? rng.pick(SELLER_NAMES) : state.character.lastName;
  return rng.pick([`${last}'s ${type.name}`, `${last} & Sons ${type.name}`, `${regionOf(state).name.split(',')[0]} ${type.name}`, `${rng.pick(['Blue Oak', 'Summit', 'Red Door', 'Keystone', 'Northstar', 'Golden Hour'])} ${type.name}`]);
}

/** What the owner walks away with when the equity sells for `price` (gain vs. what you put in). */
export function exitProceeds(biz, price) {
  const proceeds = Math.max(0, Math.round(price * biz.ownerPct));
  const gain = Math.max(0, proceeds - biz.basis);
  // Qualified Small Business Stock: C-corp founders holding 5+ years exclude up to $10M of gain.
  const qsbs = biz.entity === 'ccorp' && biz.years >= 5 ? Math.min(gain, 10000000) : 0;
  return { proceeds, gain, qsbs, taxable: gain - qsbs, basisBack: proceeds - gain };
}
