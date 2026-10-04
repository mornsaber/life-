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
import { competitionFactor } from '../org/Businesses.js';
import { royaltiesOn, franchisorFinancials } from './Franchising.js';

export const SS_WAGE_CAP = 176100;
/** Net revenue effect of a price point (price × volume) and policy cost multipliers — see OwnerActions. */
/** Premium prices pay when quality earns them; budget prices win volume when it doesn't. */
export const priceFactor = (level, quality) => (level === 'premium' ? 0.94 + (quality - 40) / 300 : level === 'budget' ? 0.96 + (50 - quality) / 500 : 1);
const SUPPLIER_COGS = { cheap: 0.95, standard: 1, premium: 1.05 };
const PAY_POLICY = { below: 0.92, market: 1, above: 1.08 };
export const CORPORATE_TAX = 0.21;
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
  if (!sizesFor(type).includes(size)) return { ok: false, reason: `Can't open as ${SIZE_OPTIONS[size]?.label ?? size}` };
  const minExp = SIZE_OPTIONS[size]?.minExperience ?? 0;
  if (minExp && experienceYears(state, type) + (state.business?.history?.length ?? 0) * 3 < minExp) return { ok: false, reason: `A ${SIZE_OPTIONS[size].label.toLowerCase()} needs ${minExp}+ yrs of industry or ownership experience` };
  const scale = SIZE_OPTIONS[size]?.scale ?? 1;
  return fundingCheck(state, startupCostFor(type, size), funding, type, { cashFlow: type.startup ? 0 : projectedCashFlow(state, typeId) * scale });
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

/** Your skill as an operator: relevant experience and smarts. */
export function ownerSkill(state, type) {
  // Past businesses and management experience help a little on top of industry years.
  const owned = Math.min(4, (state.business?.history ?? []).reduce((s, h) => s + (h.years ?? 0), 0) * 0.5);
  const managed = state.career.history.some((h) => (h.peakGrade ?? 0) >= 6) ? 2 : 0;
  return Math.min(30, experienceYears(state, type) * 3) + state.stats.smarts * 0.25 + owned + managed;
}

export function debtBalance(biz) {
  return (biz.debts.sba?.balance ?? 0) + (biz.debts.loc ?? 0) + (biz.debts.payables ?? 0);
}

/** Debts you signed for personally (SBA loans and credit lines always carry a personal guarantee). */
export function guaranteedDebt(biz) {
  return (biz.debts.sba?.balance ?? 0) + (biz.debts.loc ?? 0);
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
  const demand = (1 + (phase - 1) * type.cyclical) * (0.55 + biz.quality / 110) * (0.6 + biz.reputation / 125) * MARKETING[biz.marketing].lift * (biz.fit ?? 1) * (biz.franchise?.lift ?? 1) * competition;
  const ramp = biz.years <= 1 ? 0.7 : biz.years === 2 ? 0.9 : 1;
  // Owner policies: price point, supplier quality, pay level (OwnerActions).
  const price = priceFactor(biz.priceLevel ?? 'standard', biz.quality);
  const revenue = Math.round(type.startup ? biz.arr : type.revenue * biz.scale ** 0.95 * demand * price * ramp * rng.float(0.88, 1.12) * Math.sqrt(col));
  const cogs = Math.round(revenue * type.cogs * (SUPPLIER_COGS[biz.supplier ?? 'standard'] ?? 1));
  const benefitsLoad = 1.08 + (biz.benefits.health ? 0.12 : 0) + biz.benefits.match;
  // Hours and part-timers flex with demand, so payroll is partly variable (startups pay their whole team).
  const busy = type.startup ? 1 : clamp(revenue / Math.max(1, type.revenue * biz.scale ** 0.95 * Math.sqrt(col)), 0.5, 1.6);
  const payroll = Math.round(biz.staff.headcount * type.wage * Math.sqrt(col) * mode.costMult * (1 + biz.staff.costPremium) * benefitsLoad * (0.55 + 0.45 * busy) * (PAY_POLICY[biz.payLevel ?? 'market'] ?? 1));
  const delegated = Object.keys(DUTIES).filter((d) => biz.staff.delegation[d]);
  const overhead = Math.round(payroll * (mode.adminOverhead + delegated.reduce((s, d) => s + DUTIES[d].overhead, 0)));
  // A manager's pay scales with the operation: a food truck's lead isn't paid like a restaurant group's GM.
  const management = (biz.role === 'absentee' ? Math.round(clamp(revenue * 0.08, 40000, 120000)) : 0) + (biz.licensedManager ? LICENSED_MANAGER : 0);
  const rent = Math.round(type.rent * biz.scale * col);
  const insurance = Math.round(type.insurance * biz.scale);
  const marketing = Math.round(revenue * MARKETING[biz.marketing].share);
  const admin = ENTITIES[biz.entity].admin;
  const sba = biz.debts.sba;
  const interest = Math.round((sba?.balance ?? 0) * (sba?.rate ?? 0) + (biz.debts.loc ?? 0) * 0.12);
  // Franchisees pay royalties and the ad fund off the top; franchisors collect fees and royalties and pay for support.
  const royalties = royaltiesOn(biz, revenue);
  const { franchiseFees, royaltyIncome, franchiseSupport } = franchisorFinancials(biz, type);
  const operatingIncome = revenue - cogs - payroll - overhead - management - rent - insurance - marketing - admin - royalties + franchiseFees + royaltyIncome - franchiseSupport;
  // S- and C-corp owners who work in the business take a W-2 salary (employer payroll tax applies).
  const entity = ENTITIES[biz.entity];
  // Funded startup founders pay themselves a modest salary out of the raise.
  const ownerSalary = biz.role !== 'operator' || !entity.payroll ? 0
    : type.startup ? (biz.cash > 300000 ? 80000 : 0)
      : Math.round(clamp(operatingIncome * 0.4, 0, 150000));
  const payrollTax = Math.round(ownerSalary * 0.0765);
  const pretax = operatingIncome - interest - ownerSalary - payrollTax;
  const corporateTax = entity.passThrough ? 0 : Math.round(Math.max(0, pretax) * CORPORATE_TAX);
  const netIncome = pretax - corporateTax;
  return { revenue, cogs, payroll, overhead, management, rent, insurance, marketing, admin, royalties, franchiseFees, royaltyIncome, franchiseSupport, interest, operatingIncome, ownerSalary, payrollTax, corporateTax, netIncome };
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
  // Proven brands sell for more; a franchise system's royalty stream is worth more still.
  const multiple = 2.5 * (0.7 + biz.reputation / 170) * (biz.franchise ? 1.15 : 1) * (biz.franchisor?.units ? 1.3 : 1);
  const ev = Math.max(0, sde) * multiple + biz.assets;
  return Math.max(0, Math.round(ev + Math.max(0, biz.cash) - debt));
}

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
    fit: fit ?? Math.round(rng.float(0.7, 1.2) * 100) / 100,
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
  };
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
