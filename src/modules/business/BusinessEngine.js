/**
 * Business & entrepreneurship: start, buy, inherit, run and exit a business.
 *
 * Operations reuse the career systems: the staff block is a department
 * (WORKFORCE_MODES from ContractingSystem, delegation DUTIES from the
 * ManagementEngine, morale-driven union risk as in UnionsAndLabor), and the
 * business acts as an Employer — you choose its benefits. Money flows through
 * the ledger: salaries and draws via ctx.earn, pass-through profit kept in the
 * business as `retained` (taxed, no cash), C-corp dividends as LTCG.
 *
 * Runs after the career module (order 31) so a year's work is in the ledger
 * before Finances settles taxes.
 */
import { clamp } from '../../core/Random.js';
import { businessUnionYear } from '../career/LaborUnions.js';
import { regulationYear, antitrustResolver } from './Regulation.js';
import { StructureActions, PublicActions, structureYear } from './Structure.js';
import { REGIONS } from '../life/Regions.js';
import { yearlyCount, bumpYearly, canAfford, currentYear } from '../../core/State.js';
import { setWorkforce, WORKFORCE_MODES } from '../career/ContractingSystem.js';
import { DUTIES } from '../career/ManagementEngine.js';
import { BUSINESS_TYPES, ENTITIES, ROUNDS, SBA, MARKETING, SIZE_OPTIONS, startupCostFor } from './BusinessTypes.js';
import { ownershipRules } from './OwnershipRules.js';
import {
  ensureBusinessOrg, syncBusinessOrg, seedCompetitors, businessStaffTick, marketTick, managerSkill, openBranch, releaseBusinessOrg, competitorsOf, nextMarket, locationsByRegion, marketRoom,
} from '../org/Businesses.js';
import { OwnerActions, OwnerResolvers } from './OwnerActions.js';
import { runPlan, STRATEGIES, canDelegate } from './GrowthPlan.js';
import { InitiativeActions, initiativesTick } from './Initiatives.js';
import { conglomerateTick, conglomerateOf, formEligibility, holdingsCap, acquireCompany, FORM_COST } from './Conglomerate.js';
import { hireExec, fireExec, resolveExecHire, setOffice, mergeSubsidiaries } from './HoldingCo.js';
import { POSTS, takePost, leavePost, setFocus, setPay, execMove, postYear, executiveSkill, boardHooks } from './OwnerJob.js';
import { syncBoard, boardMeeting, appointDirector, removeDirector } from './Board.js';
import { rivalGroupsTick, bidForGroup } from './RivalGroups.js';
import { ensureCerts, certsYear, certifyCrew } from './StaffCerts.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { businessById, inject, withdraw, withdrawable, moveTreasury, buyBack, openingsPerYear, buyPremises, saleLeaseback } from './Capital.js';
import { FleetActions, FleetResolvers, opsTick, payEquipmentLoan, ensureOps } from './FleetActions.js';
import { makeOffers, OPERATIONS } from './Operations.js';
import { charge } from './TaxBook.js';
import { sideRng } from '../org/Organizations.js';
import {
  grantOpeningLicenses, grandfatherLicenses, licensesTick, suspendLicense, applyForLicense, openingLicenseFees, BUSINESS_LICENSES, requiredLicenses,
} from './BusinessLicenses.js';
import {
  currentBusiness, typeOf, holdsLicense, startEligibility, fundingCheck, ownerSkill, debtBalance, guaranteedDebt,
  yearFinancials, valuation, newBusiness, exitProceeds, annualPayment, businessName, SS_WAGE_CAP, LICENSEE_ONLY, PHASE_DEMAND, premisesPrice,
} from './Business.js';
import {
  FRANCHISE_BRANDS, FDD_COST, TRANSFER_FEE, startupCost, franchiseEligibility, franchisorEligibility, franchisorTick, franchiseeTick, deBrand,
} from './Franchising.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
/** Venture investors hold C-corp preferred stock (private stake buyers and merger partners don't lock your structure). */
export const ventureBacked = (biz) => biz.investors.some((i) => ROUNDS.some((r) => r.id === i.round));
const PHASE_STARTUP = { expansion: 0.1, peak: 0.15, recession: -0.25, recovery: 0 };
const FAMILY_RELATIONS = ['spouse', 'partner', 'fiance', 'child', 'sibling', 'mother', 'father'];
const MAX_HEADCOUNT = 6000;

/* ------------------------------------------------------------------ */
/* Yearly operations                                                   */
/* ------------------------------------------------------------------ */

function staffTick(ctx, biz) {
  const { rng, state } = ctx;
  const s = biz.staff;
  if (!s.headcount) return;
  const mode = WORKFORCE_MODES[s.workforce];
  const delegated = s.headcount >= 8 ? Object.keys(DUTIES).filter((d) => s.delegation[d]) : [];
  if (mode.fixedQuality === null) {
    const target = 50 + (biz.benefits.health ? 6 : 0) + biz.benefits.match * 100 + (s.unionized ? 4 : 0) - (biz.family.length > 2 ? 3 : 0) + ({ below: -8, above: 8 }[biz.payLevel] ?? 0);
    s.morale = Math.round(clamp(s.morale + (target - s.morale) * 0.25 + delegated.length + rng.int(-6, 6), 0, 100));
  }
  const quality = mode.fixedQuality ?? 38 + s.morale * 0.35;
  s.productivity = Math.round(clamp(quality + state.stats.smarts * 0.08 + (['operator', 'executive'].includes(biz.role) ? 3 : 0) + rng.int(-8, 8), 0, 100));
  if (mode.strikes && !s.unionized && s.headcount >= 5) s.unionRisk = Math.round(clamp(s.unionRisk + (s.morale < 45 ? (45 - s.morale) / 2 : -4), 0, 100));
  if (biz.role === 'operator') ctx.stat('stress', 2 + (s.headcount >= 8 ? 3 - delegated.length : 1));
}

/** Startups: launch a product, then grow (or shrink) annual recurring revenue. */
function startupGrowth(ctx, biz) {
  const { state, rng } = ctx;
  if (!biz.arr) {
    biz.growth = 0;
    if (rng.chance(clamp(0.3 + biz.quality / 120 + biz.staff.headcount * 0.05, 0.2, 0.95))) {
      biz.arr = Math.round(rng.int(20000, 150000) * (0.5 + biz.quality / 100));
      ctx.log(`${biz.name} launched its product. First customers: ${money(biz.arr)} in annual recurring revenue.`, '🚀', 'milestone');
    } else ctx.log(`${biz.name} is still building its product.`, '🛠️');
    return;
  }
  const scaleDrag = biz.arr > 20000000 ? 0.25 : biz.arr > 5000000 ? 0.1 : 0;
  const g = clamp(-0.45 + ((biz.fit ?? 1) - 1) * 0.8 + biz.quality / 65 + Math.min(biz.staff.headcount, 60) * 0.012 + (biz.marketing - 1) * 0.12 + (PHASE_STARTUP[state.economy.phase] ?? 0) + rng.float(-0.55, 0.6) - scaleDrag, -0.6, 3);
  biz.arr = Math.max(0, Math.round(biz.arr * (1 + g)));
  biz.growth = Math.round(g * 100) / 100;
}

function payDebts(biz) {
  const sba = biz.debts.sba;
  if (sba) {
    const principal = Math.max(0, Math.min(sba.balance, sba.annual - Math.round(sba.balance * sba.rate)));
    sba.balance -= principal;
    biz.cash -= principal;
    if (sba.balance <= 0) biz.debts.sba = null;
  }
  if (biz.debts.payables) {
    biz.cash -= biz.debts.payables;
    biz.debts.payables = 0;
  }
}

/** Pass-through losses offset other income up to the excess-business-loss limit. */
export const EXCESS_LOSS_LIMIT = 313000;
/** Rough top-bracket rate a tax distribution covers on profit left in the business. */
const TAX_DISTRIBUTION_RATE = 0.4;

/**
 * Salaries, draws, dividends and pass-through taxes. Returns what reached you.
 *
 * Pass-through (LLC, S-corp, sole prop): your share of the year's *taxable*
 * profit (book profit less write-offs: off-book expenses and bonus
 * depreciation) is taxed to you whether or not you take it out. Cash you
 * take beyond that is a tax-free return of profit already taxed. A loss
 * offsets your other income. When management reinvests the profit, the
 * business still pays you a tax distribution so the bill isn't on your card.
 * C-corp: the company paid its own tax; what it pays you is a dividend.
 */
function payOwner(ctx, biz, ly) {
  const entity = ENTITIES[biz.entity];
  let ownerPay = 0;
  if (ly.ownerSalary) {
    ctx.earn(ly.ownerSalary, `Salary — ${biz.name}`, { wage: true });
    ctx.spend(ly.payrollTax, 'Payroll tax (FICA)', { allowDebt: true });
    ownerPay += ly.ownerSalary;
  }
  const taxable = Math.round((ly.taxableProfit ?? ly.netIncome) * biz.ownerPct);
  let dist = Math.round(Math.max(0, Math.min(ly.netIncome, biz.cash)) * biz.drawPct);
  if (entity.passThrough && taxable > 0) {
    // Tax distribution on profit left in the business.
    const owed = Math.round(Math.max(0, taxable - dist * biz.ownerPct) * TAX_DISTRIBUTION_RATE / biz.ownerPct);
    const room = Math.max(0, biz.cash - dist);
    const extra = Math.min(owed, room);
    if (extra > 0) {
      dist += extra;
      ly.taxDistribution = extra;
    }
  }
  biz.cash -= dist;
  const mine = Math.round(dist * biz.ownerPct);
  if (entity.passThrough) {
    const wage = !entity.payroll;
    const taxedNow = Math.min(mine, Math.max(0, taxable));
    if (taxedNow) ctx.earn(taxedNow, `Owner draw — ${biz.name}`, { wage });
    // Beyond this year's taxable profit: earnings already taxed (or sheltered by depreciation).
    if (mine > taxedNow) ctx.state.finances.cash += mine - taxedNow;
    const retained = Math.max(0, taxable - taxedNow);
    if (retained) ctx.earn(retained, `Retained profit — ${biz.name}`, { retained: true, wage });
    if (taxable < 0) {
      ly.lossDeducted = Math.min(-taxable, EXCESS_LOSS_LIMIT);
      ctx.deduct(ly.lossDeducted, `Business loss — ${biz.name}`, { nonCash: true });
    }
    if (wage && taxable > 0) {
      ly.seTax = Math.round(Math.min(taxable * 0.9235, SS_WAGE_CAP) * 0.153);
      ctx.spend(ly.seTax, 'Self-employment tax', { allowDebt: true });
    }
  } else if (mine) ctx.earn(mine, `Dividends — ${biz.name}`, { ltcg: true });
  ly.distributions = dist;
  return ownerPay + mine;
}

function inspectionTick(ctx, biz, type) {
  const { state, rng } = ctx;
  const age = state.character.age;
  if (type.inspection === 'health' && rng.chance(0.6)) {
    const score = biz.quality * 0.7 + 15 + rng.int(-25, 25);
    if (score >= 40) return;
    biz.violations = [...biz.violations.filter((a) => age - a < 5), age];
    const fine = rng.int(2000, 10000);
    biz.cash -= fine;
    biz.reputation = Math.max(0, biz.reputation - 8);
    if (biz.violations.length >= 3) {
      ctx.log(`The health department revoked ${biz.name}'s permit after a third failed inspection.`, '🚫', 'bad');
      if (state.business.current === biz) closeBusiness(ctx, 'Shut down by the health department', { liquidation: 0.4 });
      else closeHolding(ctx, biz, 'Shut down by the health department');
      return;
    }
    ctx.log(`${biz.name} failed a health inspection (${biz.violations.length}/3 in five years): ${money(fine)} fine and a bad grade in the window.`, '🧪', 'bad');
    if (biz.violations.length >= 2) suspendLicense(ctx, biz, 'foodPermit', 1, 'repeat health violations');
  } else if (type.inspection === 'board' && rng.chance(0.04) && biz.quality < 45 && rng.chance(0.5)) {
    const held = type.credentials.filter((c) => state.credentials.held[c]?.status === 'active');
    ctx.emit('credential:suspend', { ids: held, years: 1, reason: `licensing-board complaint against ${biz.name}` });
    const industry = requiredLicenses(biz.typeId).find((id) => id !== 'businessLicense');
    if (industry) suspendLicense(ctx, biz, industry, 1, 'board complaint');
    biz.reputation = Math.max(0, biz.reputation - 10);
  }
}

function businessTick(ctx, biz) {
  const { state, rng } = ctx;
  const type = typeOf(biz);
  biz.years += 1;
  if (biz.role === 'operator' && (state.legal.incarceration || state.career.job || !ownershipRules(state).canOperate)) biz.role = 'absentee';
  if (biz.role === 'executive' && (state.legal.incarceration || (POSTS[biz.ownerPost?.post]?.fullTime && state.career.job))) leavePost(ctx, biz, state.legal.incarceration ? 'Incarcerated' : 'Took another job');
  // A conflict of interest from a new job: divest within a year.
  if (biz.divestBy != null && ownershipRules(state, biz.typeId).ok) biz.divestBy = null;
  if (biz.divestBy != null && state.character.age >= biz.divestBy) {
    ctx.log(`Ethics rules forced you to sell ${biz.name}.`, '⚖️', 'warn');
    exitBusiness(ctx, Math.round(biz.valuation * 0.85), 'Forced sale (conflict of interest)');
    return;
  }
  ensureBusinessOrg(state, biz);
  grandfatherLicenses(state, biz);
  const lic = licensesTick(ctx, biz);
  if (lic.shutDown) {
    ctx.log(`${lic.shutDown}.`, '🚫', 'bad');
    closeBusiness(ctx, 'Shut down for operating unlicensed', { liquidation: 0.4 });
    return;
  }

  // You need the license to run it. Law firms, practices and CPA firms must be owned by a licensee.
  if (!holdsLicense(state, type) && !biz.franchise?.waiveLicense) {
    if (LICENSEE_ONLY.includes(biz.typeId) && !biz.mso) {
      // An inherited practice gets two years to find a licensed buyer or partner; losing your own license forces a quick sale.
      if (biz.inherited) {
        biz.licenseGraceUntil ??= state.character.age + 2;
        if (state.character.age < biz.licenseGraceUntil) {
          ctx.log(`Only a licensed ${type.name.toLowerCase().replace(/ (firm|practice)$/, '')} can own ${biz.name}. You have until age ${biz.licenseGraceUntil} to sell it or restructure with a licensed partner (a management-services company).`, '🪪', 'warn');
        } else {
          ctx.log(`The grace period ran out: ${biz.name} was sold to a licensed buyer.`, '🪪', 'warn');
          exitBusiness(ctx, Math.round(biz.valuation * 0.92), 'Sold by the estate (licensed buyer)');
          return;
        }
      } else {
        ctx.log(`Without your ${type.name.toLowerCase()} license you can't own ${biz.name}. You had to sell it fast.`, '🪪', 'bad');
        exitBusiness(ctx, Math.round(biz.valuation * 0.7), 'Forced sale (license lost)');
        return;
      }
    }
    if (!biz.licensedManager) ctx.log(`You hired a licensed manager to keep ${biz.name} legal.`, '🪪', 'warn');
    biz.licensedManager = true;
  } else biz.licensedManager = false;

  staffTick(ctx, biz);
  // Absentee owners rely on the general manager or CEO they hired.
  const skill = biz.role === 'operator' ? ownerSkill(state, type) : biz.role === 'executive' ? executiveSkill(state, biz, ownerSkill(state, type), managerSkill(state, biz)) : managerSkill(state, biz);
  // A franchisor's operations manual and field consultants stand in for experience.
  const target = biz.staff.productivity * 0.55 + Math.max(skill, biz.franchise ? 22 : 0) * 0.6 + 12 + (biz.licensedManager ? -5 : 0) + ({ cheap: -3, premium: 3 }[biz.supplier] ?? 0);
  biz.quality = Math.round(clamp(biz.quality + (target - biz.quality) * 0.35 + rng.int(-4, 4), 0, 100));
  biz.reputation = Math.round(clamp(biz.reputation + (biz.quality - biz.reputation) * 0.25 + rng.int(-3, 3), 0, 100));
  biz.fit = Math.round(clamp((biz.fit ?? 1) + rng.float(-0.05, 0.05), 0.5, 1.4) * 100) / 100;
  if (type.startup) startupGrowth(ctx, biz);
  if (biz.franchisor) franchisorTick(ctx, biz, PHASE_DEMAND[state.economy.phase] ?? 1);

  ensureOps(rng, biz);
  const ly = yearFinancials(state, biz, rng);
  delete biz.strike;
  biz.taxBook = { expense: 0, capex: 0 };
  biz.cash += ly.netIncome;
  payDebts(biz);
  payEquipmentLoan(biz);
  biz.assets = Math.round(biz.assets * 0.9);
  ly.ownerPay = payOwner(ctx, biz, ly);
  biz.lastYear = ly;
  biz.valuation = valuation(biz, ly);
  recordBooks(state, biz, ly);
  governanceYear(ctx, biz);
  ensureCerts(biz, (id) => hasCredential(state, id));
  certsYear(ctx, biz);
  businessUnionYear(ctx, biz, { decide: state.business.current === biz && ['operator', 'executive'].includes(biz.role) && !biz.autopilot });
  structureYear(state, biz);
  opsTick(ctx, biz, ly);
  ctx.log(`${biz.name}: ${money(ly.revenue)} revenue, ${ly.netIncome >= 0 ? `${money(ly.netIncome)} profit` : `${money(-ly.netIncome)} loss`}${ly.ownerPay ? `; you took ${money(ly.ownerPay)}` : ''}. Valued at ${money(biz.valuation)}.`, type.icon, ly.netIncome >= 0 ? 'finance' : 'warn');

  inspectionTick(ctx, biz, type);
  if (state.business.current !== biz) return;
  initiativesTick(ctx, biz);
  // The organization: staff come and go, rivals rise and fall, the structure follows the headcount.
  businessStaffTick(ctx, biz);
  marketTick(ctx, biz);
  syncBusinessOrg(state, biz);
  // A growth plan: management carries out your strategy and reports once.
  if (biz.plan) {
    runPlan(ctx, biz, PLAN_DEPS);
    syncBusinessOrg(state, biz);
  }
  const handsOff = biz.autopilot && biz.role !== 'operator';
  if (biz.franchise) {
    const notice = franchiseeTick(ctx, biz);
    if (notice) ctx.prompt(notice);
  }
  if (biz.staff.unionRisk >= 100 && !biz.staff.unionized) {
    // Hands off: management runs a lawful campaign rather than asking you.
    if (handsOff) BusinessEngine.resolvers.union(ctx, null, 'campaign');
    else unionDrive(ctx, biz);
  } else if (rng.chance(0.35)) eventPrompt(ctx, biz);
  // Cheating is the owner's own choice — hired managers don't bring it to you.
  if (!handsOff && rng.chance(0.08)) temptationPrompt(ctx, biz);
  offerTick(ctx, biz);
  capitalOffers(ctx, biz);
  if (biz.cash < 0) cashCrunch(ctx, biz);
}

/** How many locations a business can run: five while you run it yourself; a professionally managed chain can grow to sixty across many cities. */
export const MANAGED_MAX_SCALE = 60;
export function maxScale(state, biz) {
  return biz.role !== 'operator' ? MANAGED_MAX_SCALE : 5;
}

/** What opening another location costs: build-out and equipment, priced like the city it opens in. */
export const expansionCost = (biz, regionId = biz.expandTo) => Math.round(typeOf(biz).cost * 0.8 * (REGIONS[regionId]?.col ?? 1));
/** Where the next location goes: the city you picked, or the best market with room. */
export const expansionTarget = (state, biz) => (biz.expandTo && REGIONS[biz.expandTo] ? biz.expandTo : nextMarket(state, biz));
export const nextExpansionCost = (state, biz) => expansionCost(biz, expansionTarget(state, biz));

/** Open another location, paid from the business account or with an SBA loan. Returns { ok, reason }. */
const PLAN_DEPS = { expandBusiness: (...a) => expandBusiness(...a), maxScale: (...a) => maxScale(...a), expansionCost: (...a) => expansionCost(...a) };

export function expandBusiness(ctx, biz, funding = 'cash') {
  const { state } = ctx;
  const type = typeOf(biz);
  if (type.startup) return { ok: false, reason: 'Startups grow by hiring and raising money.' };
  if (biz.scale >= maxScale(state, biz)) return { ok: false, reason: biz.scale >= MANAGED_MAX_SCALE ? 'That\'s as many locations as you can run.' : 'Five locations is as many as you can run yourself — hand it to a management team to keep growing.' };
  if (biz.years < 2) return { ok: false, reason: 'Get through two years first.' };
  const target = expansionTarget(state, biz);
  const cost = expansionCost(biz, target);
  if (funding === 'sba') {
    if (state.housing.credit.score < SBA.minScore) return { ok: false, reason: `SBA lenders want a ${SBA.minScore}+ credit score.` };
    if (biz.cash < cost * SBA.downPayment) return { ok: false, reason: `The business needs ${money(cost * SBA.downPayment)} for the down payment.` };
    charge(biz, cost * SBA.downPayment, 'capex', cost * (1 - SBA.downPayment));
    const loan = Math.round(cost * (1 - SBA.downPayment)) + (biz.debts.sba?.balance ?? 0);
    biz.debts.sba = { balance: loan, rate: SBA.rate, annual: annualPayment(loan, SBA.rate, SBA.years), guaranteed: true };
  } else {
    if (biz.cash < cost) return { ok: false, reason: `Opening another location costs ${money(cost)} from the business account.` };
    charge(biz, cost, 'capex');
  }
  biz.scale += 1;
  biz.assets += Math.round(cost * 0.6);
  biz.staff.headcount = Math.min(MAX_HEADCOUNT, Math.max(biz.staff.headcount, Math.round(type.staff * biz.scale) + biz.family.length));
  if (ensureOps(ctx.rng, biz)) {
    const o = OPERATIONS[biz.typeId];
    if (o.unit) for (let i = 0; i < o.start; i++) biz.ops.units.push({ id: ctx.rng.id('u_'), age: 0, used: Boolean(type.startUsed) });
    biz.staff.headcount = Math.min(MAX_HEADCOUNT, Math.max(biz.staff.headcount, (o.unit ? biz.ops.units.length : 0) * o.crew));
  }
  bump(biz, 'quality', -5);
  const branch = openBranch(state, biz, target);
  // Keep opening in the chosen city until it's full, then move on to the next market.
  if (biz.expandTo && (locationsByRegion(state, biz)[biz.expandTo] ?? 0) >= marketRoom(biz.expandTo)) biz.expandTo = null;
  ctx.log(`${biz.name} opened location #${biz.scale}: the ${branch.name}, run by a branch manager.`, type.icon, 'milestone');
  return { ok: true, cost };
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

const bump = (obj, key, d) => {
  obj[key] = Math.round(clamp(obj[key] + d, 0, 100));
};

export const BUSINESS_EVENTS = [
  { id: 'bigClient', title: 'A Big Contract', text: 'A large client wants to sign a contract that would stretch your capacity to the limit.', options: [
    { id: 'accept', label: '✍️ Sign it', apply: (ctx, b) => { b.cash += Math.round((b.lastYear?.revenue ?? 50000) * 0.12); bump(b, 'quality', -5); bump(b.staff, 'morale', -6); return 'You signed. The money is great; the team is exhausted.'; } },
    { id: 'decline', label: '🙅 Stay the size you are', apply: (ctx, b) => { bump(b.staff, 'morale', 3); return 'You passed. The team appreciated it.'; } },
  ] },
  { id: 'poached', title: 'Poaching Attempt', text: 'A competitor offered your best employee a raise to jump ship.', minStaff: 2, options: [
    { id: 'match', label: '💵 Match the offer', apply: (ctx, b) => { b.staff.costPremium = Math.round((b.staff.costPremium + 0.02) * 100) / 100; bump(b.staff, 'morale', 4); return 'You matched it. Your best person stayed.'; } },
    { id: 'let', label: '👋 Let them go', apply: (ctx, b) => { bump(b.staff, 'productivity', -8); bump(b, 'quality', -4); return 'They left — and took a couple of clients.'; } },
  ] },
  { id: 'lawsuit', title: 'Served With a Lawsuit', text: 'A customer is suing over an injury on your premises.', options: [
    { id: 'settle', label: '🤝 Settle', apply: (ctx, b) => { const c = ctx.rng.int(15000, 60000); charge(b, c); return `You settled for ${money(c)}.`; } },
    { id: 'fight', label: '⚖️ Fight it in court', apply: (ctx, b) => { if (ctx.rng.chance(0.6)) { charge(b, 20000); return 'You won, after $20,000 in legal fees.'; } const c = ctx.rng.int(60000, 200000); charge(b, c); bump(b, 'reputation', -6); return `You lost: a ${money(c)} judgment, and it made the local news.`; } },
  ] },
  { id: 'competitor', title: 'New Competition', text: 'A well-funded competitor opened nearby.', options: [
    { id: 'price', label: '🏷️ Cut prices', apply: (ctx, b) => { charge(b, (b.lastYear?.revenue ?? 50000) * 0.05); bump(b, 'reputation', 3); return 'You cut prices and kept your customers — at a cost.'; } },
    { id: 'quality', label: '✨ Out-serve them', apply: (ctx, b) => { if (ctx.state.stats.smarts + ctx.rng.int(-20, 20) > 60) { bump(b, 'quality', 6); return 'You doubled down on quality and customers noticed.'; } bump(b, 'reputation', -4); return 'You tried to out-serve them. They outspent you.'; } },
    { id: 'ignore', label: '🙈 Ignore them', apply: (ctx, b) => { bump(b, 'reputation', -6); return 'You ignored them. Some regulars drifted away.'; } },
  ] },
  { id: 'supplier', title: 'Supplier Price Hike', text: 'Your main supplier raised prices 15%.', notStartup: true, options: [
    { id: 'absorb', label: '🧾 Absorb it', apply: (ctx, b) => { charge(b, (b.lastYear?.cogs ?? 20000) * 0.15); return 'You absorbed the increase.'; } },
    { id: 'switch', label: '🔄 Find a cheaper supplier', apply: (ctx, b) => { bump(b, 'quality', -5); return 'The new supplier is cheaper — and worse.'; } },
    { id: 'raise', label: '📈 Raise your prices', apply: (ctx, b) => { bump(b, 'reputation', -3); return 'You passed it on to customers. Some grumbled.'; } },
  ] },
  { id: 'hiring', title: 'Hiring Decision', text: 'You have one open position and three finalists.', minStaff: 3, duty: 'hiring', options: [
    { id: 'veteran', label: '🧓 The seasoned pro who wants top dollar', apply: (ctx, b) => { bump(b.staff, 'productivity', 5); b.staff.costPremium = Math.round((b.staff.costPremium + 0.01) * 100) / 100; return 'You hired the seasoned pro.'; } },
    { id: 'promising', label: '🌱 The promising new grad', apply: (ctx, b) => { bump(b.staff, 'productivity', 2); bump(b.staff, 'morale', 2); return 'You took a chance on the new grad.'; } },
    { id: 'friend', label: '👔 A friend who needs a job', apply: (ctx, b) => { bump(b.staff, 'productivity', -4); ctx.stat('happiness', 2); return 'You hired your friend. It\'s… fine.'; } },
  ] },
  { id: 'underperformer', title: 'Underperformer', text: 'One of your people has missed every target this year.', minStaff: 3, duty: 'reviews', options: [
    { id: 'coach', label: '🧑‍🏫 Coach them', apply: (ctx, b) => { if (ctx.state.stats.smarts + ctx.rng.int(-15, 15) >= 50) { bump(b.staff, 'productivity', 4); return 'Your coaching turned them around.'; } ctx.stat('stress', 4); return 'Hours of coaching went nowhere.'; } },
    { id: 'fire', label: '🚪 Let them go', apply: (ctx, b) => { bump(b.staff, 'productivity', 4); bump(b.staff, 'morale', -6); b.staff.unionRisk = Math.min(100, b.staff.unionRisk + 6); return 'You let them go. The team is rattled.'; } },
  ] },
];

/** What a sensible manager does with each routine event. */
export const AUTOPILOT_CHOICE = { bigClient: 'decline', poached: 'match', lawsuit: 'settle', competitor: 'price', supplier: 'raise', hiring: 'promising', underperformer: 'fire' };

function eventPrompt(ctx, biz) {
  const { rng } = ctx;
  const type = typeOf(biz);
  const delegated = biz.staff.headcount >= 8 ? Object.keys(DUTIES).filter((d) => biz.staff.delegation[d]) : [];
  const pool = BUSINESS_EVENTS.filter((e) => (!e.minStaff || biz.staff.headcount >= e.minStaff) && !(e.notStartup && type.startup) && !(e.duty && delegated.includes(e.duty)));
  const event = rng.pick(pool);
  if (!event) return;
  // On autopilot, your manager handles routine calls the sensible way and tells you what they did.
  if (biz.autopilot && AUTOPILOT_CHOICE[event.id]) {
    const option = event.options.find((o) => o.id === AUTOPILOT_CHOICE[event.id]);
    const line = option.apply(ctx, biz);
    ctx.log(`${biz.name} — ${event.title}: your manager handled it. ${line}`, type.icon);
    return;
  }
  ctx.prompt({ type: 'business.event', icon: type.icon, title: `${biz.name}: ${event.title}`, text: event.text, options: event.options.map(({ id, label }) => ({ id, label })), data: { eventId: event.id } });
}

function unionDrive(ctx, biz) {
  ctx.prompt({
    type: 'business.union',
    icon: '✊',
    title: `${biz.name}: Union Drive`,
    text: 'Your employees filed for a union election with the NLRB.',
    options: [
      { id: 'recognize', label: '🤝 Recognize the union', hint: 'Higher labor costs, better morale' },
      { id: 'campaign', label: '📣 Campaign against it (legally)', hint: 'Captive-audience meetings; may still lose' },
      { id: 'bust', label: '🔥 Fire the organizers', hint: 'Illegal — NLRB charges likely', tone: 'danger' },
    ],
  });
}

/** Ways to cheat that pay now and may surface later. */
const TEMPTATIONS = {
  payrollTax: { title: 'Payroll Taxes Due', text: 'Cash is tight. You could quietly skip remitting the payroll taxes you withheld from your employees this quarter.', take: '💸 Skip the payroll tax deposit', offenseId: 'payrollTaxEvasion', discovery: 0.35, when: (b) => b.staff.headcount >= 2, gain: (b) => Math.round((b.lastYear?.payroll ?? 50000) * 0.15) },
  wageTheft: { title: 'Overtime', text: 'Your staff worked a lot of overtime. You could pay them straight time and call them "salaried."', take: '⏱️ Skip the overtime pay', offenseId: 'wageTheft', discovery: 0.25, when: (b) => b.staff.headcount >= 3, gain: (b) => Math.round((b.lastYear?.payroll ?? 50000) * 0.08) },
  cookBooks: { title: 'The Board Meeting', text: 'Investors expect growth you didn\'t hit. You could count signed-but-unpaid deals as revenue.', take: '📊 Book the revenue anyway', offenseId: 'securitiesFraud', discovery: 0.25, when: (b) => b.investors.length > 0, gain: () => 0 },
  arson: { title: 'Insurance Policy', text: 'The business is going under. A fire would pay out the insurance policy in full.', take: '🔥 Arrange a "kitchen fire"', offenseId: 'arson', discovery: 0.4, when: (b) => (b.lastYear?.netIncome ?? 0) < 0 && b.assets > 10000, gain: (b) => Math.round(b.assets * 1.3) },
};

function temptationPrompt(ctx, biz) {
  const options = Object.entries(TEMPTATIONS).filter(([, t]) => t.when(biz));
  if (!options.length) return;
  const [id, t] = ctx.rng.pick(options);
  ctx.prompt({
    type: 'business.temptation',
    icon: '😈',
    title: `${biz.name}: ${t.title}`,
    text: t.text,
    options: [
      { id: 'take', label: t.take, tone: 'danger' },
      { id: 'honest', label: '🙂 Do it by the book' },
    ],
    data: { id },
  });
}

/** The executive post and the board's annual review. */
function governanceYear(ctx, biz) {
  const { state } = ctx;
  // Its own random stream: governance never reshuffles the rest of the year.
  const rng = sideRng(state);
  ctx = { ...ctx, rng };
  postYear(ctx, biz);
  const org = ensureBusinessOrg(state, biz);
  const ceo = org?.ceo ? org.people[org.ceo] : null;
  const board = syncBoard(state, rng, biz, { ceoName: ceo?.name ?? null });
  if (!board) return;
  boardMeeting(ctx, biz, boardHooks(ctx, biz, () => {
    const gone = org.people[org.ceo]?.name;
    delete org.people[org.ceo];
    org.ceo = null;
    syncBusinessOrg(state, biz);
    return `The board replaced ${gone ?? 'the chief executive'} with ${org.people[org.ceo]?.name ?? 'a new hire'}.`;
  }));
}

/** Ten years of results, for the history table. */
function recordBooks(state, biz, ly) {
  biz.books = [...(biz.books ?? []).slice(-9), { age: state.character.age, revenue: ly.revenue, netIncome: ly.netIncome, scale: biz.scale, staff: biz.staff.headcount, valuation: biz.valuation, ownerPay: ly.ownerPay ?? 0 }];
}

/**
 * Capital for established companies: growth-equity investors once revenue
 * passes $10M, and an IPO (staying public, with you as the largest
 * shareholder) once a corporation passes $75M.
 */
function capitalOffers(ctx, biz) {
  const { state } = ctx;
  const rng = sideRng(state);
  const type = typeOf(biz);
  const revenue = biz.lastYear?.revenue ?? 0;
  if (type.startup || biz.public || state.prompts.some((p) => ['business.growthEquity', 'business.publicOffering'].includes(p.type))) return;
  const good = ['expansion', 'peak'].includes(state.economy.phase) && (biz.lastYear?.netIncome ?? 0) > 0;
  if (good && biz.entity === 'ccorp' && revenue >= 75_000_000 && rng.chance(0.25)) {
    const price = Math.round(biz.valuation * rng.float(1.1, 1.4));
    ctx.prompt({ type: 'business.publicOffering', icon: '🔔', title: `${biz.name}: Go Public?`, text: `Investment banks want to take ${biz.name} public at about ${money(price)}. The company would sell 20% in new shares (cash for growth) and you'd sell 10% of yours. You'd stay the largest shareholder — with a public board and quarterly scrutiny.`, options: [{ id: 'ipo', label: '🔔 Take it public' }, { id: 'wait', label: '⏳ Stay private' }], data: { price, id: biz.id } });
  } else if (good && revenue >= 10_000_000 && biz.ownerPct > 0.6 && rng.chance(0.12)) {
    const amount = Math.round(biz.valuation / 3);
    ctx.prompt({ type: 'business.growthEquity', icon: '💼', title: `${biz.name}: Growth Investors`, text: `A growth-equity fund offers ${money(amount)} of new money for a quarter of ${biz.name}, plus a board seat.`, options: [{ id: 'accept', label: '🤝 Take the money' }, { id: 'decline', label: '🙅 Stay independent' }], data: { amount, id: biz.id } });
  }
}

/** Buyers come calling: acquisition offers and (rarely) an IPO. */
function offerTick(ctx, biz) {
  const { state, rng } = ctx;
  const type = typeOf(biz);
  if (type.startup && biz.arr >= 100000000 && biz.growth >= 0.3 && ['expansion', 'peak'].includes(state.economy.phase) && biz.entity === 'ccorp' && rng.chance(0.35)) {
    const price = Math.round(biz.arr * rng.float(8, 15));
    ctx.prompt({ type: 'business.ipo', icon: '🔔', title: `${biz.name}: IPO`, text: `Bankers think ${biz.name} could go public at a ${money(price)} valuation. Your ${Math.round(biz.ownerPct * 100)}% stake would be worth ${money(price * biz.ownerPct)}.`, options: [{ id: 'ipo', label: '🔔 Ring the bell' }, { id: 'wait', label: '⏳ Stay private for now' }], data: { price } });
    return;
  }
  const chance = type.startup ? (biz.arr >= 2000000 ? 0.06 + Math.max(0, biz.growth) * 0.03 : 0) : (biz.lastYear?.netIncome ?? 0) > 0 && biz.years >= 3 ? 0.05 : 0;
  if (!chance || !rng.chance(chance)) return;
  const price = Math.round(biz.valuation * rng.float(type.startup ? 0.6 : 0.85, type.startup ? 1.3 : 1.25));
  if (price <= 0) return;
  const who = rng.pick(['A private-equity firm', 'A larger competitor', 'A strategic buyer', 'A family office']);
  const rival = who === 'A larger competitor' ? competitorsOf(state, biz).sort((a, b) => b.business.staff - a.business.staff)[0] : null;
  ctx.prompt({ type: 'business.offer', icon: '🤝', title: `${biz.name}: Acquisition Offer`, text: `${rival ? rival.name : who} offered ${money(price)} for the whole business. Your share: ${money(price * biz.ownerPct)}.`, options: [{ id: 'accept', label: '✍️ Sell' }, { id: 'decline', label: '🙅 Not for sale' }], data: { price, buyer: rival?.name ?? null } });
}

function cashCrunch(ctx, biz) {
  const { state } = ctx;
  if (state.prompts.some((p) => p.type === 'business.cashCrunch')) return;
  const need = Math.round(-biz.cash + 10000);
  const revenue = biz.lastYear?.revenue ?? 0;
  const canLoc = state.housing.credit.score >= 600 && !typeOf(biz).startup && (biz.debts.loc ?? 0) < Math.max(50000, revenue * 0.4);
  ctx.prompt({
    type: 'business.cashCrunch',
    icon: '🏦',
    title: `${biz.name}: Out of Cash`,
    text: `The business account is ${money(-biz.cash)} in the red. Payroll and vendors are due.`,
    options: [
      { id: 'inject', label: `💰 Put in ${money(need)} of your own money`, disabled: !canAfford(state, need) },
      { id: 'loc', label: '🏦 Draw on a business credit line', hint: 'Personal guarantee, 12% interest', disabled: !canLoc },
      { id: 'bridge', label: '🌉 Ask your investors for a bridge round', hint: 'Heavy dilution, maybe', disabled: !biz.investors.length },
      { id: 'cut', label: '✂️ Lay off a third of the staff', hint: 'Vendors wait a year', disabled: biz.staff.headcount < 3 },
      { id: 'close', label: '🔒 Close the business', tone: 'danger' },
      { id: 'bankrupt', label: '⚖️ File business bankruptcy', hint: ENTITIES[biz.entity].liability ? 'Limited liability — except debts you guaranteed' : 'Sole proprietors are personally liable', tone: 'danger' },
    ],
    data: { need },
  });
}

/* ------------------------------------------------------------------ */
/* Exits                                                               */
/* ------------------------------------------------------------------ */

function releaseFamily(state, biz) {
  for (const id of biz.family) {
    const p = state.people?.list.find((x) => x.id === id);
    if (p && p.job?.includes(biz.name)) p.job = null;
  }
}

function retire(state, biz, outcome, proceeds, { closed = false, buyer = null } = {}) {
  releaseFamily(state, biz);
  const org = releaseBusinessOrg(state, biz, { closed, buyer });
  state.business.history.push({ name: biz.name, typeId: biz.typeId, startAge: biz.foundedAge, endAge: state.character.age, years: biz.years, outcome, proceeds: Math.round(proceeds), orgId: org?.id ?? null, role: biz.role, ownedFromAge: biz.ownedFromAge ?? biz.foundedAge, peakStaff: Math.max(biz.peakStaff ?? 0, biz.staff.headcount) });
  if (state.business.history.length > 20) state.business.history.shift();
  state.business.current = null;
}

/** Sell your stake for `price` (whole-company equity value). */
export function exitBusiness(ctx, price, outcome, { buyer = null } = {}) {
  const { state } = ctx;
  const biz = currentBusiness(state);
  // Franchisors charge a transfer fee (and must approve the buyer).
  if (biz.franchise) price = Math.max(0, price - TRANSFER_FEE);
  const e = exitProceeds(biz, price);
  state.finances.cash += e.basisBack + e.qsbs;
  if (e.taxable) ctx.earn(e.taxable, `Capital gain — sale of ${biz.name}`, { ltcg: true });
  ctx.log(`${outcome}: you received ${money(e.proceeds)} for your ${Math.round(biz.ownerPct * 100)}% of ${biz.name}${e.qsbs ? ` (${money(e.qsbs)} of the gain tax-free as qualified small business stock)` : ''}.`, '💰', 'milestone');
  retire(state, biz, outcome, e.proceeds, { buyer });
}

/**
 * Wind the business down: assets sold at a discount pay creditors. LLCs and
 * corporations shield you from what's left — except debts you personally
 * guaranteed; sole proprietors owe all of it.
 */
export function closeBusiness(ctx, outcome, { liquidation = 0.5, bankruptcy = false } = {}) {
  const { state } = ctx;
  const biz = currentBusiness(state);
  const debts = debtBalance(biz) + Math.max(0, -biz.cash);
  const raised = Math.round(biz.assets * liquidation) + Math.max(0, biz.cash);
  const net = raised - debts;
  let personal = 0;
  if (net >= 0) {
    const share = Math.round(net * biz.ownerPct);
    state.finances.cash += share;
    ctx.log(`${biz.name} closed. After paying its debts, ${money(share)} came back to you.`, '🔒', 'warn');
  } else {
    const shortfall = -net;
    personal = ENTITIES[biz.entity].liability ? Math.min(shortfall, guaranteedDebt(biz)) : shortfall;
    if (personal) {
      state.finances.cash -= personal;
      if (bankruptcy) ctx.emit('credit:event', { type: 'default' });
    }
    ctx.log(`${biz.name} ${bankruptcy ? 'went through bankruptcy' : 'closed'} owing ${money(shortfall)}.${personal ? ` You're personally on the hook for ${money(personal)}${ENTITIES[biz.entity].liability ? ' you guaranteed' : ' (sole proprietors have no shield)'}.` : ' Your LLC/corporation shielded your personal assets.'}`, bankruptcy ? '⚖️' : '🔒', 'bad');
  }
  ctx.stat('happiness', -10);
  retire(state, biz, outcome, Math.max(0, net), { closed: true });
}

/* ------------------------------------------------------------------ */
/* Starting and buying                                                 */
/* ------------------------------------------------------------------ */

function fund(ctx, price, check) {
  const { state } = ctx;
  state.finances.cash -= check.down;
  return { sbaLoan: check.loan, basis: check.down };
}

function startBusiness(ctx, typeId, funding, entity, size = 'standard', name = '') {
  const { state, rng } = ctx;
  if (!SIZE_OPTIONS[size]) size = 'standard';
  const check = startEligibility(state, typeId, funding, size);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const type = BUSINESS_TYPES[typeId];
  const fees = openingLicenseFees(typeId);
  const cost = startupCostFor(type, size);
  const { sbaLoan, basis } = fund(ctx, cost + fees, check);
  const clean = String(name ?? '').replace(/[<>]/g, '').trim().slice(0, 40);
  const biz = newBusiness(rng, state, typeId, { name: clean || undefined, scale: SIZE_OPTIONS[size].scale, entity: ENTITIES[entity] ? entity : 'llc', cash: Math.round(cost * 0.4), assets: Math.round(cost * 0.6), sbaLoan, basis, quality: Math.round(clamp(35 + ownerSkill(state, type) * 0.6, 20, 75)) });
  state.business.current = biz;
  if (OPERATIONS[biz.typeId] && biz.ops) biz.ops.offers = makeOffers(ctx.rng, biz);
  biz.autopilot = true;
  grantOpeningLicenses(state, biz);
  ensureBusinessOrg(state, biz);
  seedCompetitors(state, biz);
  ctx.log(`You founded ${biz.name} (${ENTITIES[biz.entity].name})${sbaLoan ? ` with a ${money(sbaLoan)} SBA loan you personally guaranteed` : ''}.`, type.icon, 'milestone');
  ctx.toast(`Founded ${biz.name}`, 'good');
  ctx.stat('stress', 6);
  ctx.emit('business:started', { biz });
  return undefined;
}

function buyFranchise(ctx, brandId, funding, entity) {
  const { state, rng } = ctx;
  const brand = FRANCHISE_BRANDS[brandId];
  const elig = franchiseEligibility(state, brandId);
  if (!elig.ok) return ctx.toast(elig.reason, 'warn');
  const type = BUSINESS_TYPES[brand.typeId];
  const price = startupCost(brand);
  // Lenders like franchises: the brand's track record substitutes for your own.
  const check = fundingCheck(state, price, funding, { ...type, credentials: ['franchise'] }, { cashFlow: null });
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const { sbaLoan, basis } = fund(ctx, price, check);
  const biz = newBusiness(rng, state, brand.typeId, {
    name: `${brand.name} — ${state.character.lastName} Unit`, entity: ENTITIES[entity] ? entity : 'llc', scale: brand.scale,
    cash: Math.round(price * 0.3), assets: Math.round((price - brand.fee) * 0.6), sbaLoan, basis,
    quality: 55, reputation: 50, fit: Math.round(rng.float(0.92, 1.12) * 100) / 100,
  });
  biz.franchise = { brandId, name: brand.name, royalty: brand.royalty, adFund: brand.adFund, lift: brand.lift, term: brand.term, signedYears: 0, waiveLicense: Boolean(brand.waiveLicense) };
  state.business.current = biz;
  if (OPERATIONS[biz.typeId] && biz.ops) biz.ops.offers = makeOffers(ctx.rng, biz);
  biz.autopilot = true;
  grandfatherLicenses(state, biz);
  ensureBusinessOrg(state, biz);
  seedCompetitors(state, biz);
  ctx.log(`You signed a ${brand.term}-year franchise agreement and opened ${biz.name} (${money(brand.fee)} franchise fee, ${money(price)} all-in${sbaLoan ? `, ${money(sbaLoan)} SBA loan` : ''}). Royalties: ${Math.round((brand.royalty + brand.adFund) * 1000) / 10}% of revenue.`, brand.icon, 'milestone');
  ctx.toast(`Opened ${brand.name}`, 'good');
  ctx.stat('stress', 5);
  ctx.emit('business:started', { biz });
  return undefined;
}

/** A couple of established businesses come up for sale each year. */
function listingsTick(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < 21) {
    state.business.listings = [];
    return;
  }
  const ids = Object.keys(BUSINESS_TYPES).filter((id) => !BUSINESS_TYPES[id].startup);
  state.business.listings = Array.from({ length: 2 }, () => {
    const typeId = rng.pick(ids);
    const probe = newBusiness(rng, state, typeId, { name: businessName(rng, state, BUSINESS_TYPES[typeId], { seller: true }), years: rng.int(3, 20), scale: rng.pick([1, 1, 2]), quality: rng.int(45, 75), reputation: rng.int(40, 75), assets: Math.round(BUSINESS_TYPES[typeId].cost * 0.4), fit: Math.round(rng.float(0.9, 1.2) * 100) / 100 });
    probe.role = 'absentee';
    const ly = yearFinancials(state, probe, rng);
    probe.lastYear = ly;
    const price = Math.max(20000, Math.round(valuation(probe, ly) * rng.float(0.95, 1.25)));
    return { id: rng.id('lst_'), typeId, name: probe.name, years: probe.years, scale: probe.scale, quality: probe.quality, reputation: probe.reputation, fit: probe.fit, revenue: ly.revenue, profit: ly.netIncome + ly.management, price };
  }).filter((l) => l.profit > 0);
}

function buyBusiness(ctx, listingId, funding) {
  const { state, rng } = ctx;
  const listing = state.business.listings.find((l) => l.id === listingId);
  if (!listing) return;
  const type = BUSINESS_TYPES[listing.typeId];
  if (currentBusiness(state)) return ctx.toast('You already own a business.', 'warn');
  if (LICENSEE_ONLY.includes(listing.typeId) && !holdsLicense(state, type)) return ctx.toast(`Only a licensee can own a ${type.name.toLowerCase()}.`, 'warn');
  const check = fundingCheck(state, listing.price, funding, type, { cashFlow: listing.profit });
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const { sbaLoan, basis } = fund(ctx, listing.price, check);
  const biz = newBusiness(rng, state, listing.typeId, { name: listing.name, years: listing.years, scale: listing.scale, quality: listing.quality, reputation: listing.reputation, fit: listing.fit, cash: Math.round(listing.price * 0.1), assets: Math.round(listing.price * 0.4), sbaLoan, basis });
  state.business.current = biz;
  if (OPERATIONS[biz.typeId] && biz.ops) biz.ops.offers = makeOffers(ctx.rng, biz);
  biz.ownedFromAge = state.character.age;
  biz.autopilot = true;
  grandfatherLicenses(state, biz);
  ensureBusinessOrg(state, biz);
  seedCompetitors(state, biz);
  state.business.listings = state.business.listings.filter((l) => l !== listing);
  biz.valuation = Math.max(0, listing.price - sbaLoan);
  ctx.log(`You bought ${biz.name} for ${money(listing.price)}${sbaLoan ? ` (${money(sbaLoan)} SBA loan, personally guaranteed)` : ''}.`, type.icon, 'milestone');
  ctx.toast(`Bought ${biz.name}`, 'good');
}

/* ------------------------------------------------------------------ */
/* Passive holdings: businesses you own but someone else runs          */
/* ------------------------------------------------------------------ */

/** A year for a business you hold passively: hired management, books, distributions. */
function holdingTick(ctx, biz) {
  const { state, rng } = ctx;
  // The same rules as an active business: licensee-only types and conflicts of interest.
  const type = typeOf(biz);
  const conflict = !ownershipRules(state, biz.typeId).ok;
  if ((LICENSEE_ONLY.includes(biz.typeId) && !holdsLicense(state, type)) || (conflict && biz.divestBy != null && state.character.age >= biz.divestBy)) {
    ctx.log(`You had to sell your stake in ${biz.name} (${conflict ? 'conflict of interest' : 'license lost'}).`, '⚖️', 'warn');
    sellHoldingAt(ctx, biz, Math.round(biz.valuation * 0.8), 'Forced sale (held)');
    return;
  }
  if (conflict && biz.divestBy == null) biz.divestBy = state.character.age + 1;
  if (!conflict) biz.divestBy = null;
  const lic = licensesTick(ctx, biz);
  if (lic.shutDown) {
    ctx.log(`${lic.shutDown}.`, '🚫', 'bad');
    releaseBusinessOrg(state, biz, { closed: true });
    state.business.history.push({ name: biz.name, typeId: biz.typeId, startAge: biz.foundedAge, endAge: state.character.age, years: biz.years, outcome: 'Shut down (unlicensed)', proceeds: 0, orgId: biz.orgId, role: 'absentee' });
    state.business.holdings = state.business.holdings.filter((h) => h !== biz);
    return;
  }
  biz.years += 1;
  if (biz.role !== 'executive') biz.role = 'absentee';
  ensureBusinessOrg(state, biz);
  const target = biz.staff.productivity * 0.55 + managerSkill(state, biz) * 0.6 + 12;
  biz.quality = Math.round(clamp(biz.quality + (target - biz.quality) * 0.35 + rng.int(-4, 4), 0, 100));
  biz.reputation = Math.round(clamp(biz.reputation + (biz.quality - biz.reputation) * 0.25 + rng.int(-3, 3), 0, 100));
  if (typeOf(biz).startup) startupGrowth(ctx, biz);
  ensureOps(rng, biz);
  const ly = yearFinancials(state, biz, rng);
  delete biz.strike;
  biz.taxBook = { expense: 0, capex: 0 };
  biz.cash += ly.netIncome;
  payDebts(biz);
  payEquipmentLoan(biz);
  opsTick(ctx, biz, ly);
  biz.assets = Math.round(biz.assets * 0.9);
  ly.ownerPay = payOwner(ctx, biz, ly);
  biz.lastYear = ly;
  biz.valuation = valuation(biz, ly);
  recordBooks(state, biz, ly);
  governanceYear(ctx, biz);
  ensureCerts(biz, (id) => hasCredential(state, id));
  certsYear(ctx, biz);
  businessUnionYear(ctx, biz);
  structureYear(state, biz);
  businessStaffTick(ctx, biz);
  initiativesTick(ctx, biz);
  managedYear(ctx, biz);
  if (!state.business.holdings.includes(biz)) return;
  if (biz.plan) runPlan(ctx, biz, PLAN_DEPS);
  syncBusinessOrg(state, biz);
  ctx.log(`${biz.name} (held): ${money(ly.revenue)} revenue, ${ly.netIncome >= 0 ? `${money(ly.netIncome)} profit` : `${money(-ly.netIncome)} loss`}${ly.ownerPay ? `; ${money(ly.ownerPay)} to you` : ''}.`, typeOf(biz).icon, 'finance');
  // Hired management can run it into the ground: a deep hole closes it.
  if (biz.cash < -Math.max(50000, (ly.revenue ?? 0) * 0.3)) {
    const owed = debtBalance(biz) + Math.max(0, -biz.cash) - Math.round(biz.assets * 0.4);
    const personal = ENTITIES[biz.entity].liability ? Math.min(Math.max(0, owed), guaranteedDebt(biz)) : Math.max(0, owed);
    if (personal) state.finances.cash -= personal;
    ctx.log(`${biz.name} failed under its managers and closed.${personal ? ` You owed ${money(personal)} you had guaranteed.` : ''}`, '🔒', 'bad');
    releaseBusinessOrg(state, biz, { closed: true });
    state.business.history.push({ name: biz.name, typeId: biz.typeId, startAge: biz.foundedAge, endAge: state.character.age, years: biz.years, outcome: 'Failed (held passively)', proceeds: 0, orgId: biz.orgId, role: 'absentee' });
    state.business.holdings = state.business.holdings.filter((h) => h !== biz);
  }
}

/** A held business shuts its doors. */
function closeHolding(ctx, h, outcome) {
  const { state } = ctx;
  releaseBusinessOrg(state, h, { closed: true });
  state.business.history.push({ name: h.name, typeId: h.typeId, startAge: h.foundedAge, endAge: state.character.age, years: h.years, outcome, proceeds: 0, orgId: h.orgId, role: 'absentee' });
  state.business.holdings = state.business.holdings.filter((x) => x !== h);
}

/**
 * Management handles a held business's year the way you'd handle yours:
 * competitors, inspections, the odd crisis, a union drive — and tells you.
 */
function managedYear(ctx, biz) {
  const { state } = ctx;
  const rng = sideRng(state);
  ctx = { ...ctx, rng };
  const type = typeOf(biz);
  marketTick(ctx, biz);
  inspectionTick(ctx, biz, type);
  if (!state.business.holdings.includes(biz)) return;
  if (biz.staff.unionRisk >= 100 && !biz.staff.unionized) {
    biz.staff.unionized = rng.chance(0.5);
    biz.staff.unionRisk = biz.staff.unionized ? 0 : 60;
    ctx.log(`${biz.name}'s staff ${biz.staff.unionized ? 'voted to unionize' : 'voted down a union'} — management ran a lawful campaign.`, '✊', biz.staff.unionized ? 'warn' : undefined);
  } else if (rng.chance(0.3)) {
    const pool = BUSINESS_EVENTS.filter((e) => (!e.minStaff || biz.staff.headcount >= e.minStaff) && !(e.notStartup && type.startup));
    const event = rng.pick(pool);
    if (event) {
      const option = event.options.find((o) => o.id === AUTOPILOT_CHOICE[event.id]) ?? event.options[0];
      ctx.log(`${biz.name} — ${event.title}: management handled it. ${option.apply(ctx, biz)}`, type.icon);
    }
  }
}

/** Sell a passive holding for `price` (whole-company equity value). */
function sellHoldingAt(ctx, h, price, outcome) {
  const { state } = ctx;
  const e = exitProceeds(h, price);
  state.finances.cash += e.basisBack + e.qsbs;
  if (e.taxable) ctx.earn(e.taxable, `Capital gain — sale of ${h.name}`, { ltcg: true });
  const org = releaseBusinessOrg(state, h, {});
  state.business.history.push({ name: h.name, typeId: h.typeId, startAge: h.foundedAge, endAge: state.character.age, years: h.years, outcome, proceeds: e.proceeds, orgId: org?.id ?? null, role: 'absentee' });
  state.business.holdings = state.business.holdings.filter((x) => x !== h);
  return e;
}
const REG_DEPS = { sellHolding: (ctx, h, price, outcome) => sellHoldingAt(ctx, h, price, outcome) };

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

const withBiz = (ctx) => {
  const biz = currentBusiness(ctx.state);
  if (!biz) ctx.toast('You don\'t own a business.', 'warn');
  return biz;
};

/** The staff block looks like a department to the shared workforce code. */
const asDepartment = (biz) => ({ department: biz.staff, coworkers: 50 });

export const BusinessEngine = {
  id: 'business',
  order: 31,

  init(state) {
    state.business ??= { current: null, history: [], listings: [], holdings: [] };
    state.business.holdings ??= [];
    for (const h of state.business.holdings) if (!h.orgId && state.character) ensureBusinessOrg(state, h);
    // Saves from before businesses were organizations.
    if (state.business.current && !state.business.current.orgId && state.character) ensureBusinessOrg(state, state.business.current);
    // Saves from before business licenses: existing businesses hold what they need.
    for (const b of [state.business.current, ...state.business.holdings].filter(Boolean)) if (!b.licenses && state.character) grandfatherLicenses(state, b);
  },

  setup(engine) {
    engine.bus.on('career:hired', ({ ctx }) => {
      const biz = currentBusiness(ctx.state);
      if (biz && !ownershipRules(ctx.state, biz.typeId).ok && biz.divestBy == null) {
        biz.divestBy = ctx.state.character.age + 1;
        ctx.log(`${ownershipRules(ctx.state, biz.typeId).reason}. You have a year to sell ${biz.name}.`, '⚖️', 'warn');
      }
      if (biz?.role === 'operator') {
        biz.role = 'absentee';
        ctx.log(`You took a job, so a general manager now runs ${biz.name} day to day.`, '🏪');
      }
      for (const b of [ctx.state.business.current, ...(ctx.state.business.holdings ?? [])]) if (b?.role === 'executive' && POSTS[b.ownerPost?.post]?.fullTime) leavePost(ctx, b, 'Took another job');
    });
  },

  onAgeUp(ctx) {
    listingsTick(ctx);
    const biz = currentBusiness(ctx.state);
    if (biz) businessTick(ctx, biz);
    for (const h of [...(ctx.state.business.holdings ?? [])]) holdingTick(ctx, h);
    conglomerateTick(ctx, PLAN_DEPS);
    // Rival conglomerates move once you're in business.
    if (ctx.state.business.current || ctx.state.business.holdings?.length || ctx.state.business.rivalGroups) rivalGroupsTick({ ...ctx, rng: sideRng(ctx.state) });
    // Regulators: antitrust, compliance (Regulation).
    if (ctx.state.business.current || ctx.state.business.holdings?.length) regulationYear(ctx, REG_DEPS);
  },

  actions: {
    ...OwnerActions,
    ...FleetActions,
    ...StructureActions,
    ...PublicActions,
    ...InitiativeActions,
    /** arg: 'typeId:cash|sba:entity[:size[:name]]' */
    start(ctx, arg) {
      const [typeId, funding = 'cash', entity = 'llc', size = 'standard', ...name] = String(arg).split(':');
      startBusiness(ctx, typeId, funding, entity, size, name.join(':'));
    },
    /** arg: 'brandId:cash|sba:entity' */
    franchise(ctx, arg) {
      const [brandId, funding = 'cash', entity = 'llc'] = String(arg).split(':');
      buyFranchise(ctx, brandId, funding, entity);
    },
    /** File an FDD and start selling franchises of your own business. */
    franchiseOut(ctx) {
      const { state } = ctx;
      const biz = withBiz(ctx);
      if (!biz) return;
      const check = franchisorEligibility(state, biz);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const fromBiz = Math.min(Math.max(0, biz.cash), FDD_COST);
      charge(biz, fromBiz);
      state.finances.cash -= FDD_COST - fromBiz;
      biz.franchisor = { units: 0, opened: 0, failed: 0, fee: Math.round((25000 + typeOf(biz).cost * 0.08) / 500) * 500, royalty: 0.05, startYears: biz.years, newUnits: 0 };
      ctx.log(`You filed a Franchise Disclosure Document and registered ${biz.name} to sell franchises: ${money(biz.franchisor.fee)} per unit plus 5% royalties.`, '🗺️', 'milestone');
      ctx.toast('Now franchising', 'good');
    },
    /** arg: 'listingId:cash|sba' */
    buy(ctx, arg) {
      const [listingId, funding = 'cash'] = String(arg).split(':');
      buyBusiness(ctx, listingId, funding);
    },
    setRole(ctx, role) {
      const biz = withBiz(ctx);
      if (!biz || !['operator', 'absentee'].includes(role)) return;
      if (biz.role === 'executive') leavePost(ctx, biz, 'Stepped down');
      if (role === 'operator' && ctx.state.career.job) return ctx.toast('Quit your job to run the business full-time.', 'warn');
      if (role === 'operator' && ctx.state.legal.incarceration) return;
      if (role === 'operator' && !ownershipRules(ctx.state).canOperate) return ctx.toast(ownershipRules(ctx.state).notes.at(-1) ?? 'You can\'t run it yourself right now.', 'warn');
      biz.role = role;
      ctx.toast(role === 'operator' ? 'You run it yourself' : 'A general manager runs it', 'info');
    },
    setMarketing(ctx, level) {
      const biz = withBiz(ctx);
      const n = Number(level);
      if (biz && MARKETING[n]) biz.marketing = n;
    },
    setDraw(ctx, pct) {
      const biz = withBiz(ctx);
      const n = Number(pct);
      if (biz && [0, 0.5, 1].includes(n)) biz.drawPct = n;
    },
    setWorkforce(ctx, mode) {
      const biz = withBiz(ctx);
      if (!biz || !WORKFORCE_MODES[mode] || !biz.staff.headcount) return;
      setWorkforce(ctx, asDepartment(biz), mode);
      if (mode === 'contracted') biz.staff.unionized = false;
    },
    toggleDelegation(ctx, duty) {
      const biz = withBiz(ctx);
      if (!biz || !DUTIES[duty]) return;
      if (biz.staff.headcount < 8) return ctx.toast('Hire managers once you have 8+ staff.', 'warn');
      biz.staff.delegation[duty] = !biz.staff.delegation[duty];
    },
    toggleHealth(ctx) {
      const biz = withBiz(ctx);
      if (biz) biz.benefits.health = !biz.benefits.health;
    },
    setMatch(ctx, pct) {
      const biz = withBiz(ctx);
      const n = Number(pct);
      if (biz && [0, 0.03, 0.05].includes(n)) biz.benefits.match = n;
    },
    /** Startups: grow or shrink the team. */
    hire(ctx, n) {
      const biz = withBiz(ctx);
      if (!biz) return;
      const add = Math.max(1, Number(n) || 1);
      biz.staff.headcount = Math.min(MAX_HEADCOUNT, biz.staff.headcount + add);
      ctx.log(`${biz.name} hired ${add} more ${add === 1 ? 'person' : 'people'} (${biz.staff.headcount} on staff).`, '🤝');
      syncBusinessOrg(ctx.state, biz);
    },
    /** Let one person go (morale dips a little). */
    letGo(ctx) {
      const biz = withBiz(ctx);
      if (!biz || !biz.staff.headcount) return;
      biz.staff.headcount -= 1;
      bump(biz.staff, 'morale', -3);
      ctx.log(`${biz.name} let one employee go (${biz.staff.headcount} on staff).`, '✂️', 'warn');
      syncBusinessOrg(ctx.state, biz);
    },
    layoff(ctx) {
      const biz = withBiz(ctx);
      if (!biz || !biz.staff.headcount) return;
      const cut = Math.max(1, Math.round(biz.staff.headcount * 0.3));
      biz.staff.headcount -= cut;
      bump(biz.staff, 'morale', -15);
      biz.staff.unionRisk = Math.min(100, biz.staff.unionRisk + 10);
      ctx.log(`${biz.name} laid off ${cut} people.`, '✂️', 'warn');
      syncBusinessOrg(ctx.state, biz);
    },
    /** arg: 'cash' | 'sba', optionally ':count' — open one or several locations this year. */
    expand(ctx, arg = 'cash') {
      const biz = withBiz(ctx);
      if (!biz) return;
      const [funding, raw] = String(arg).split(':');
      const limit = openingsPerYear(biz);
      const done = yearlyCount(ctx.state, 'business.expand');
      const want = Math.max(1, Math.min(Number(raw) || 1, limit - done));
      if (done >= limit) return ctx.toast(`${biz.role === 'operator' ? 'Two openings a year is all you can manage yourself' : `Your team can open ${limit} locations a year at this size`}.`, 'warn');
      let opened = 0;
      for (let i = 0; i < want; i++) {
        const r = expandBusiness(ctx, biz, funding === 'sba' ? 'sba' : 'cash');
        if (!r.ok) {
          if (!opened) return ctx.toast(r.reason, 'warn');
          ctx.toast(`Opened ${opened}: ${r.reason}`, 'info');
          break;
        }
        opened += 1;
        bumpYearly(ctx.state, 'business.expand');
      }
    },
    /** arg: 'bizId:amount' — put your own money into a business. */
    capitalIn(ctx, arg) {
      const [id, amount] = String(arg).split(':');
      const biz = businessById(ctx.state, id);
      if (biz) inject(ctx, biz, Number(amount));
    },
    /** arg: 'bizId:amount' (amount 'max' for everything spare) — take money out of a business. */
    capitalOut(ctx, arg) {
      const [id, amount] = String(arg).split(':');
      const biz = businessById(ctx.state, id);
      if (biz) withdraw(ctx, biz, amount === 'max' ? withdrawable(biz) : Number(amount));
    },
    /** arg: signed amount — into (+) or out of (−) the holding company's treasury. */
    treasury(ctx, amount) {
      moveTreasury(ctx, Number(amount));
    },
    /** arg: 'bizId:pct:you|company' — buy back equity you sold or investors hold (pct 'all' for everything). */
    buyBack(ctx, arg) {
      const [id, pct, source = 'you'] = String(arg).split(':');
      const biz = businessById(ctx.state, id);
      if (!biz) return;
      buyBack(ctx, biz, pct === 'all' ? 1 : Number(pct), source);
    },
    /** arg: credential id — certify the whole crew (hazmat, school bus, paramedic…). */
    certifyCrew(ctx, id) {
      const biz = withBiz(ctx);
      if (biz) certifyCrew(ctx, biz, id);
    },
    /** arg: group name — buy a whole rival conglomerate. */
    bidForGroup(ctx, name) {
      bidForGroup(ctx, name);
    },
    /** arg: 'ceo' | 'president' | 'chair' — work in your own company. */
    takePost(ctx, post) {
      const biz = withBiz(ctx);
      if (biz) takePost(ctx, biz, post);
    },
    leavePost(ctx) {
      const biz = withBiz(ctx);
      if (biz) leavePost(ctx, biz);
    },
    /** arg: focus id. */
    setFocus(ctx, focus) {
      const biz = withBiz(ctx);
      if (biz) setFocus(ctx, biz, focus);
    },
    /** arg: 'modest' | 'market' | 'top'. */
    setPay(ctx, level) {
      const biz = withBiz(ctx);
      if (biz) setPay(ctx, biz, level);
    },
    /** arg: move id — one of the year's executive moves. */
    execMove(ctx, move) {
      const { state } = ctx;
      const biz = withBiz(ctx);
      if (biz) execMove(ctx, biz, move, executiveSkill(state, biz, ownerSkill(state, typeOf(biz)), managerSkill(state, biz)));
    },
    /** arg: expertise — appoint an independent director (or start an advisory board). */
    appointDirector(ctx, expertise) {
      const biz = withBiz(ctx);
      if (biz) appointDirector(ctx, biz, expertise);
    },
    removeDirector(ctx, seatId) {
      const biz = withBiz(ctx);
      if (biz) removeDirector(ctx, biz, seatId);
    },
    /**
     * Keep a licensed-professional practice you can't own outright: a licensed partner owns the
     * practice; your management-services company owns everything else and takes most of the profit.
     */
    formMso(ctx) {
      const biz = withBiz(ctx);
      if (!biz || !LICENSEE_ONLY.includes(biz.typeId) || biz.mso) return;
      charge(biz, 35000);
      biz.mso = true;
      biz.licensedManager = true;
      biz.ownerPct = Math.round(Math.min(biz.ownerPct, 0.85) * 10000) / 10000;
      biz.investors.push({ round: 'licensed partner', pct: Math.round((1 - biz.ownerPct) * 10000) / 10000, invested: 0, partner: 'Licensed professional partner' });
      biz.licenseGraceUntil = null;
      ctx.log(`${biz.name} restructured: a licensed partner owns the practice, and your management-services company runs everything else for about ${Math.round(biz.ownerPct * 100)}% of the profit.`, '🪪', 'milestone');
    },
    /** arg: 'cash' | 'loan' — buy the building one location rents. */
    buyPremises(ctx, how) {
      const biz = withBiz(ctx);
      if (biz) buyPremises(ctx, biz, how === 'loan' ? 'loan' : 'cash', { premisesPrice, sba: SBA });
    },
    saleLeaseback(ctx) {
      const biz = withBiz(ctx);
      if (biz) saleLeaseback(ctx, biz);
    },
    /** arg: holding id — switch which of your businesses you're looking after (management keeps running both). */
    focus(ctx, id) {
      const { state } = ctx;
      const h = (state.business.holdings ?? []).find((x) => x.id === id);
      if (!h) return;
      const cur = state.business.current;
      if (cur && ['operator', 'executive'].includes(cur.role)) return ctx.toast(`You work at ${cur.name} yourself — hand it to management before focusing on another company.`, 'warn');
      state.business.holdings = [...state.business.holdings.filter((x) => x !== h), ...(cur ? [cur] : [])];
      state.business.current = h;
      ctx.toast(`Now overseeing ${h.name}`, 'info');
    },
    /** arg: strategy — the same growth plan for every company you own (one click for a big group). */
    planAll(ctx, strategy) {
      const { state } = ctx;
      if (!STRATEGIES[strategy]) return;
      let n = 0;
      for (const b of [state.business.current, ...(state.business.holdings ?? [])].filter(Boolean)) {
        if (b.role === 'operator' || typeOf(b).startup) continue;
        b.plan = { ...(b.plan ?? {}), strategy, sinceAge: state.character.age };
        b.autopilot = true;
        n += 1;
      }
      ctx.log(`All ${n} managed companies are now on a ${STRATEGIES[strategy].name.toLowerCase()} plan.`, STRATEGIES[strategy].icon);
    },
    /** arg: role — run an executive search for the holding company. */
    hireExec(ctx, role) {
      hireExec(ctx, role);
    },
    fireExec(ctx, role) {
      fireExec(ctx, role);
    },
    /** arg: office tier, or 'own:propertyId'. */
    hqOffice(ctx, arg) {
      setOffice(ctx, arg);
    },
    /** arg: 'survivorId:otherId' — merge two subsidiaries in the same line of business. */
    mergeSubsidiaries(ctx, arg) {
      mergeSubsidiaries(ctx, arg, { maxScale });
    },
    /** SBA working-capital loan for an established, profitable business. */
    loan(ctx) {
      const { state } = ctx;
      const biz = withBiz(ctx);
      if (!biz) return;
      if (typeOf(biz).startup) return ctx.toast('Banks don\'t lend to startups — raise from investors.', 'warn');
      if (biz.years < 2 || (biz.lastYear?.netIncome ?? 0) <= 0) return ctx.toast('Lenders want two years of profits.', 'warn');
      if (state.housing.credit.score < SBA.minScore) return ctx.toast(`SBA lenders want a ${SBA.minScore}+ credit score.`, 'warn');
      if (yearlyCount(state, 'business.loan')) return ctx.toast('One application a year.', 'warn');
      bumpYearly(state, 'business.loan');
      const amount = Math.round(Math.min(SBA.max, (biz.lastYear?.revenue ?? 0) * 0.25));
      const balance = amount + (biz.debts.sba?.balance ?? 0);
      biz.debts.sba = { balance, rate: SBA.rate, annual: annualPayment(balance, SBA.rate, SBA.years), guaranteed: true };
      biz.cash += amount;
      ctx.log(`${biz.name} borrowed ${money(amount)} through an SBA 7(a) loan. You signed a personal guarantee.`, '🏦', 'finance');
    },
    /** Startups: raise the next round from angels and VCs. */
    raise(ctx) {
      const { state, rng } = ctx;
      const biz = withBiz(ctx);
      if (!biz) return;
      if (biz.entity !== 'ccorp') return ctx.toast('Venture investors only buy C-corporation stock. Convert first.', 'warn');
      const round = ROUNDS[biz.roundsRaised ?? 0];
      if (!round) return ctx.toast('You\'re past venture rounds — the next step is an acquisition or an IPO.', 'warn');
      if (yearlyCount(state, 'business.raise')) return ctx.toast('One fundraise a year.', 'warn');
      if (biz.arr < round.minArr || biz.growth < round.minGrowth) return ctx.toast(`${round.name} investors want ${money(round.minArr)}+ ARR growing ${Math.round(round.minGrowth * 100)}%+.`, 'warn');
      bumpYearly(state, 'business.raise');
      const phase = PHASE_STARTUP[state.economy.phase] ?? 0;
      const chance = clamp(0.25 + (biz.quality - 50) / 100 + (biz.growth - round.minGrowth) * 0.25 + ownerSkill(state, typeOf(biz)) / 300 + phase, 0.05, 0.8);
      if (!rng.chance(chance)) {
        ctx.log(`Investors passed on ${biz.name}'s ${round.name.toLowerCase()}.`, '📭', 'warn');
        return ctx.toast('Investors passed', 'bad');
      }
      const raised = rng.int(...round.raise);
      const dilution = Math.round(rng.float(...round.dilution) * 100) / 100;
      biz.ownerPct = Math.round(biz.ownerPct * (1 - dilution) * 10000) / 10000;
      biz.investors.push({ round: round.id, pct: dilution, invested: raised });
      biz.roundsRaised = (biz.roundsRaised ?? 0) + 1;
      biz.cash += raised;
      biz.lastRound = { id: round.id, post: Math.round(raised / dilution), year: biz.years };
      biz.staff.headcount = Math.min(MAX_HEADCOUNT, Math.max(biz.staff.headcount, Math.round(raised / (typeOf(biz).wage * 2.2))));
      biz.valuation = valuation(biz);
      ctx.log(`${biz.name} closed a ${money(raised)} ${round.name.toLowerCase()} at a ${money(biz.lastRound.post)} valuation. You own ${Math.round(biz.ownerPct * 100)}% now; the team grew to ${biz.staff.headcount}.`, '💸', 'milestone');
      ctx.toast(`Raised ${money(raised)}`, 'good');
      return undefined;
    },
    /** arg: entity id. Conversions cost legal fees; investors lock you into a C-corp. */
    convert(ctx, entity) {
      const biz = withBiz(ctx);
      if (!biz || !ENTITIES[entity] || biz.entity === entity) return;
      if (ventureBacked(biz) && entity !== 'ccorp') return ctx.toast('Your investors hold C-corp stock — you can\'t convert away.', 'warn');
      if (!ctx.spend(1500, 'Business conversion legal fees', { credit: true })) return ctx.toast('The attorney wants $1,500.', 'warn');
      biz.entity = entity;
      ctx.log(`${biz.name} is now a${entity === 'llc' ? 'n' : ''} ${ENTITIES[entity].name}.`, ENTITIES[entity].icon);
    },
    hireRelative(ctx, personId) {
      const { state } = ctx;
      const biz = withBiz(ctx);
      if (!biz) return;
      const p = state.people?.list.find((x) => x.id === personId);
      if (!p || !p.alive || !FAMILY_RELATIONS.includes(p.relation)) return;
      if (state.character.age + p.ageOffset < 16) return ctx.toast('They\'re too young to work.', 'warn');
      if (biz.family.includes(p.id)) return;
      if (biz.family.length >= 5) return ctx.toast('That\'s enough family on the payroll.', 'warn');
      biz.family.push(p.id);
      biz.staff.headcount += 1;
      p.job = `${biz.name} (family business)`;
      p.relationship = Math.min(100, p.relationship + 8);
      ctx.log(`${p.firstName} came to work at ${biz.name}.`, '👨‍👩‍👧', 'good');
    },
    /** arg: license id — apply for an optional license, or renew a lapsed one. */
    getLicense(ctx, id) {
      const biz = withBiz(ctx);
      if (!biz) return;
      const r = applyForLicense(ctx, biz, id);
      if (!r.ok) return ctx.toast(r.reason, 'warn');
      const l = BUSINESS_LICENSES[id];
      ctx.log(`${biz.name} ${r.pending ? 'applied for' : 'obtained'} ${/^[aeiou]/i.test(l.name) ? 'an' : 'a'} ${l.name} (${money(r.fee)}).${r.pending ? ' A decision comes next year.' : ''}`, l.icon, 'milestone');
    },
    /** arg: 'off' | 'steady' | 'aggressive' | 'harvest' — the strategy management carries out each year. */
    setPlan(ctx, strategy) {
      const biz = withBiz(ctx);
      if (!biz || !STRATEGIES[strategy]) return;
      if (strategy !== 'off' && !canDelegate(biz)) return ctx.toast('You need managers to delegate to: 8+ staff or a second location.', 'warn');
      biz.plan = { ...(biz.plan ?? {}), strategy, sinceAge: ctx.state.character.age };
      ctx.log(strategy === 'off' ? `You took growth decisions at ${biz.name} back into your own hands.` : `${biz.name} is on a ${STRATEGIES[strategy].name.toLowerCase()} plan. ${STRATEGIES[strategy].desc}`, STRATEGIES[strategy].icon);
    },
    /** Incorporate a holding company over everything you own. arg: optional name. */
    formConglomerate(ctx, name) {
      const { state } = ctx;
      const ok = formEligibility(state);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      ctx.spend(FORM_COST, 'Holding company formation', { credit: true });
      const clean = String(name ?? '').trim().slice(0, 40);
      state.business.conglomerate = { name: clean || `${state.character.lastName} Holdings`, foundedAge: state.character.age, treasury: 0, payout: 0.5, acquisitions: 0, lastReport: [] };
      ctx.log(`You incorporated ${state.business.conglomerate.name}, a holding company over your businesses. Shared services, a central treasury and room for up to ${holdingsCap(state)} companies.`, '🏛️', 'milestone');
    },
    /** arg: '0' | '0.25' | '0.5' | '1' — share of the treasury above its reserve paid to you each year. */
    setPayout(ctx, pct) {
      const c = conglomerateOf(ctx.state);
      const n = Number(pct);
      if (c && [0, 0.25, 0.5, 1].includes(n)) c.payout = n;
    },
    /** arg: orgId — buy a business in your market into the group. */
    acquireCompany(ctx, orgId) {
      acquireCompany(ctx, orgId);
    },
    /** arg: 'holdingId:strategy' — the plan for a business you hold passively. */
    setHoldingPlan(ctx, arg) {
      const [id, strategy] = String(arg).split(':');
      const h = (ctx.state.business.holdings ?? []).find((x) => x.id === id);
      if (!h || !STRATEGIES[strategy]) return;
      h.plan = { ...(h.plan ?? {}), strategy, sinceAge: ctx.state.character.age };
      ctx.log(`${h.name}'s management is now on a ${STRATEGIES[strategy].name.toLowerCase()} plan.`, STRATEGIES[strategy].icon);
    },
    /** One click: managers run it day to day, handle routine calls and every delegable duty, on a steady growth plan. */
    handOff(ctx) {
      const biz = withBiz(ctx);
      if (!biz) return;
      if (ctx.state.legal.incarceration) return;
      // Handing off means hiring a general manager, at any size (they cost at least $40,000 a year).
      biz.role = 'absentee';
      biz.autopilot = true;
      if (biz.staff.headcount >= 8) for (const d of Object.keys(DUTIES)) biz.staff.delegation[d] = true;
      biz.plan = { ...(biz.plan ?? {}), strategy: biz.plan?.strategy && biz.plan.strategy !== 'off' ? biz.plan.strategy : 'steady', sinceAge: ctx.state.character.age };
      ensureBusinessOrg(ctx.state, biz);
      syncBusinessOrg(ctx.state, biz);
      // Equipment too: staff keep it at standard.
      const equip = ctx.state.deptEquip?.[`biz:${biz.id}`];
      if (equip) equip.auto = true;
      biz.equipAuto = true;
      ctx.log(`You handed ${biz.name} to its management team: they run it day to day on a ${STRATEGIES[biz.plan.strategy].name.toLowerCase()} plan and send you a yearly report.`, '🗂️', 'milestone');
    },
    /** Let your manager handle routine decisions (on by default). */
    toggleAutopilot(ctx) {
      const biz = withBiz(ctx);
      if (!biz) return;
      biz.autopilot = !biz.autopilot;
      ctx.toast(biz.autopilot ? 'Your manager handles routine decisions' : 'Every decision comes to you', 'info');
    },
    /** Step back to a passive owner: your hired chief executive runs it, and you're free to start or buy another. */
    makePassive(ctx) {
      const { state } = ctx;
      const biz = withBiz(ctx);
      if (!biz) return;
      const org = ensureBusinessOrg(state, biz);
      if (!org.ceo) return ctx.toast('Hire someone to run it first.', 'warn');
      if ((state.business.holdings ?? []).length >= holdingsCap(state)) return ctx.toast(conglomerateOf(state) ? `${conglomerateOf(state).name} is holding all it can.` : 'That\'s as many businesses as you can keep an eye on — form a holding company to own more.', 'warn');
      biz.role = 'absentee';
      state.business.holdings.push(biz);
      state.business.current = null;
      ctx.log(`You stepped back from ${biz.name}. It's now a passive holding run by its management.`, '🗂️', 'milestone');
    },
    /** arg: business id — take a holding back as the business you actively manage. */
    takeBack(ctx, id) {
      const { state } = ctx;
      const h = (state.business.holdings ?? []).find((x) => x.id === id);
      if (!h) return;
      if (currentBusiness(state)) return ctx.toast('Step back from your current business first.', 'warn');
      state.business.holdings = state.business.holdings.filter((x) => x !== h);
      state.business.current = h;
      ctx.log(`You took back the reins at ${h.name}.`, '🗂️');
    },
    /** arg: business id — sell a passive holding. */
    sellHolding(ctx, id) {
      const { state, rng } = ctx;
      const h = (state.business.holdings ?? []).find((x) => x.id === id);
      if (!h) return;
      if (h.valuation <= 0) return ctx.toast('No buyer for a business with no value.', 'warn');
      const e = sellHoldingAt(ctx, h, Math.round(h.valuation * rng.float(0.85, 1.1)), 'Sold (held passively)');
      ctx.log(`You sold your ${Math.round(h.ownerPct * 100)}% of ${h.name} for ${money(e.proceeds)}.`, '💰', 'milestone');
    },
    /** arg: personId — hand the business to a family member (a gift; it stays in the family). */
    giveToFamily(ctx, personId) {
      const { state } = ctx;
      const biz = withBiz(ctx);
      if (!biz) return;
      const p = state.people?.list.find((x) => x.id === personId && x.alive && FAMILY_RELATIONS.includes(x.relation));
      if (!p) return;
      if (state.character.age + (p.ageOffset ?? 0) < 18) return ctx.toast('They\'re too young to own it.', 'warn');
      if (debtBalance(biz) > 0 && guaranteedDebt(biz)) ctx.log(`You're still the guarantor on ${money(guaranteedDebt(biz))} of ${biz.name}'s loans.`, '🏦', 'warn');
      p.job = `Owner, ${biz.name}`;
      p.relationship = Math.min(100, p.relationship + 10);
      ctx.log(`You handed ${biz.name} to ${p.firstName}. It stays in the family.`, '👨‍👩‍👧', 'milestone');
      // A child keeps it: continue as them and it's still theirs. The gift uses up lifetime exemption above the annual exclusion.
      if (p.relation === 'child') {
        p.business = { ...structuredClone(biz), heritage: { since: biz.heritage?.since ?? currentYear(state) - biz.years, founder: biz.heritage?.founder ?? `${state.character.firstName} ${state.character.lastName}`, generation: (biz.heritage?.generation ?? 1) + 1 } };
        const plan = state.people.plan;
        if (plan) plan.exemptionUsed += Math.max(0, Math.round(biz.valuation * biz.ownerPct) - 19000);
      }
      retire(state, biz, `Passed to ${p.firstName}`, 0, { buyer: `${p.firstName} ${p.lastName ?? state.character.lastName}` });
    },
    sell(ctx) {
      const { state, rng } = ctx;
      const biz = withBiz(ctx);
      if (!biz) return;
      if (yearlyCount(state, 'business.sell')) return ctx.toast('You already had it on the market this year.', 'warn');
      bumpYearly(state, 'business.sell');
      const price = Math.round(biz.valuation * rng.float(0.8, 1.1));
      if (price <= 0) return ctx.toast('Nobody will buy a business with no value — close it instead.', 'warn');
      ctx.prompt({ type: 'business.offer', icon: '🪧', title: `Selling ${biz.name}`, text: `The best offer from a broker's buyers: ${money(price)}. Your share: ${money(price * biz.ownerPct)}.`, options: [{ id: 'accept', label: '✍️ Sell' }, { id: 'decline', label: '🙅 Keep it' }], data: { price } });
    },
    close(ctx) {
      if (!withBiz(ctx)) return;
      closeBusiness(ctx, 'Closed by the owner');
    },
    bankrupt(ctx) {
      if (!withBiz(ctx)) return;
      closeBusiness(ctx, 'Business bankruptcy', { liquidation: 0.35, bankruptcy: true });
    },
  },

  resolvers: {
    execHire: resolveExecHire,
    groupOffer(ctx, data, optionId) {
      const { state } = ctx;
      const b = businessById(state, data.bizId);
      if (!b || optionId !== 'accept') return;
      if (state.business.current === b) exitBusiness(ctx, data.price, `Sold to ${data.group}`, { buyer: data.group });
      else sellHoldingAt(ctx, b, data.price, `Sold to ${data.group}`);
      ctx.log(`You sold ${b.name} to ${data.group} for ${money(data.price)} (your share ${money(data.price * b.ownerPct)}).`, '🤝', 'milestone');
    },
    hostileBid(ctx, data, optionId) {
      const { state, rng } = ctx;
      const b = businessById(state, data.bizId);
      if (!b) return;
      if (optionId === 'fight') {
        charge(b, b.valuation * 0.02);
        if (rng.chance(0.6)) return ctx.log(`${b.name} fought off ${data.group}'s hostile bid — shareholders stayed with you.`, '🛡️', 'good');
        ctx.log(`Shareholders tendered to ${data.group}. ${b.name} was taken over.`, '⚔️', 'bad');
      } else ctx.log(`You took ${data.group}'s premium for ${b.name}.`, '🤝', 'milestone');
      if (state.business.current === b) exitBusiness(ctx, data.price, `Taken over by ${data.group}`, { buyer: data.group });
      else sellHoldingAt(ctx, b, data.price, `Taken over by ${data.group}`);
    },
    growthEquity(ctx, data, optionId) {
      const biz = businessById(ctx.state, data.id);
      if (!biz || optionId !== 'accept') return;
      const pct = Math.round(biz.ownerPct * 0.25 * 10000) / 10000;
      biz.cash += data.amount;
      biz.ownerPct = Math.round((biz.ownerPct - pct) * 10000) / 10000;
      biz.investors.push({ round: 'growth equity', pct, invested: data.amount, partner: 'Growth fund' });
      ctx.log(`${biz.name} took ${money(data.amount)} from a growth-equity fund for 25% of the company. You own ${Math.round(biz.ownerPct * 100)}% now; the fund has a board seat.`, '💼', 'milestone');
    },
    publicOffering(ctx, data, optionId) {
      const { state } = ctx;
      const biz = businessById(state, data.id);
      if (!biz || optionId !== 'ipo') return;
      // New shares: 20% of the company, cash into the business.
      const raised = Math.round(data.price * 0.2);
      biz.cash += raised;
      const afterNew = biz.ownerPct * 0.8;
      // Your secondary sale: 10% of your shares.
      const sold = Math.round(data.price * afterNew * 0.1);
      const portion = { ...biz, ownerPct: afterNew * 0.1, basis: Math.round(biz.basis * 0.1) };
      const e = exitProceeds(portion, data.price);
      state.finances.cash += e.basisBack + e.qsbs;
      if (e.taxable) ctx.earn(e.taxable, `IPO share sale — ${biz.name}`, { ltcg: true });
      biz.basis -= portion.basis;
      biz.ownerPct = Math.round(afterNew * 0.9 * 10000) / 10000;
      biz.investors.push({ round: 'public', pct: Math.round((1 - biz.ownerPct - biz.investors.reduce((s, i) => s + i.pct, 0)) * 10000) / 10000, invested: raised });
      biz.public = { since: state.character.age, ipoPrice: data.price };
      ctx.log(`${biz.name} went public at a ${money(data.price)} valuation! The company raised ${money(raised)}; you sold ${money(sold)} of stock and still own ${Math.round(biz.ownerPct * 100)}%.`, '🔔', 'milestone');
      ctx.stat('happiness', 15);
    },
    ...OwnerResolvers,
    ...FleetResolvers,
    franchiseDefault(ctx, data, optionId) {
      const biz = currentBusiness(ctx.state);
      if (!biz?.franchise) return;
      if (optionId === 'cure') {
        charge(biz, data.cure, 'capex');
        bump(biz, 'quality', 15);
        biz.staff.productivity = Math.min(100, biz.staff.productivity + 5);
        return ctx.log(`You remodeled and retrained. ${biz.franchise.name} withdrew the default notice.`, '🧹', 'good');
      }
      if (ctx.rng.chance(0.6)) deBrand(ctx, biz, `${biz.franchise.name} terminated your franchise agreement.`);
      else ctx.log(`${biz.franchise.name} let it slide — this time.`, '📋', 'warn');
    },
    franchiseRenewal(ctx, data, optionId) {
      const biz = currentBusiness(ctx.state);
      if (!biz?.franchise) return;
      if (optionId === 'renew') {
        charge(biz, data.cost);
        biz.franchise.signedYears = 0;
        bump(biz, 'quality', 6);
        return ctx.log(`You renewed with ${biz.franchise.name} for another ${biz.franchise.term} years and refreshed the store.`, '✍️', 'good');
      }
      deBrand(ctx, biz, `You let your ${biz.franchise.name} agreement expire.`);
    },
    event(ctx, data, optionId) {
      const biz = currentBusiness(ctx.state);
      const event = BUSINESS_EVENTS.find((e) => e.id === data.eventId);
      const option = event?.options.find((o) => o.id === optionId);
      if (!biz || !option) return;
      ctx.log(option.apply(ctx, biz), typeOf(biz).icon);
    },
    antitrust: (ctx, data, optionId) => antitrustResolver(REG_DEPS)(ctx, data, optionId),
    union(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const biz = currentBusiness(state);
      if (!biz) return;
      const s = biz.staff;
      if (optionId === 'recognize' || (optionId === 'campaign' && rng.chance(0.45))) {
        s.unionized = true;
        s.costPremium = Math.round((s.costPremium + 0.08) * 100) / 100;
        bump(s, 'morale', 12);
        ctx.log(optionId === 'recognize' ? `You recognized the union at ${biz.name}.` : `Your staff voted the union in despite your campaign.`, '✊', 'warn');
      } else if (optionId === 'campaign') {
        bump(s, 'morale', -6);
        ctx.log('The union lost the election. Some staff are bitter.', '📣');
      } else {
        bump(s, 'morale', -18);
        if (rng.chance(0.5)) {
          const fine = rng.int(10000, 60000);
          charge(biz, fine); // back pay is wages
          s.unionized = true;
          state.legal.record.push({ offenseId: 'unfairLaborPractice', name: 'Unfair Labor Practice (NLRB)', severity: 'civil', age: state.character.age, sentence: `$${fine.toLocaleString()} back pay; union recognized` });
          ctx.log(`The NLRB ruled you fired the organizers illegally: ${money(fine)} in back pay, reinstatement, and a union anyway.`, '⚖️', 'bad');
        } else ctx.log('You fired the organizers. The drive collapsed — for now.', '🔥', 'warn');
      }
      s.unionRisk = 0;
    },
    temptation(ctx, data, optionId) {
      const biz = currentBusiness(ctx.state);
      const t = TEMPTATIONS[data.id];
      if (!biz || !t) return;
      if (optionId !== 'take') {
        bump(biz, 'reputation', 2);
        return ctx.log('You did it by the book.', '🙂');
      }
      const gain = t.gain(biz);
      biz.cash += gain;
      if (data.id === 'arson') {
        ctx.log(`${biz.name} burned down. The insurance company paid ${money(gain)}… and opened an investigation.`, '🔥', 'bad');
        ctx.emit('legal:offense', { offenseId: t.offenseId, context: `fire at ${biz.name}`, discovery: t.discovery, evidence: 0.8 });
        closeBusiness(ctx, 'Destroyed by fire', { liquidation: 0 });
        return;
      }
      ctx.log(`${t.take.slice(2).trim()}: ${gain ? `${money(gain)} stayed in the business` : 'the numbers look great'}.`, '😈', 'warn');
      ctx.emit('legal:offense', { offenseId: t.offenseId, context: biz.name, discovery: t.discovery, evidence: 0.8 });
    },
    offer(ctx, data, optionId) {
      if (optionId !== 'accept' || !currentBusiness(ctx.state)) return;
      exitBusiness(ctx, data.price, data.buyer ? `Sold to ${data.buyer}` : 'Sold', { buyer: data.buyer });
    },
    ipo(ctx, data, optionId) {
      const { state } = ctx;
      const biz = currentBusiness(state);
      if (!biz || optionId !== 'ipo') return;
      // Founders sell a slice at the IPO; the rest is stock that rides the market after the lockup.
      const stake = Math.round(data.price * biz.ownerPct);
      const sold = Math.round(stake * 0.15);
      const e = exitProceeds({ ...biz, ownerPct: 1 }, sold);
      state.finances.cash += e.basisBack + e.qsbs;
      if (e.taxable) ctx.earn(e.taxable, `IPO share sale — ${biz.name}`, { ltcg: true });
      ctx.emit('investing:windfall', { asset: 'tech', amount: stake - sold });
      ctx.log(`${biz.name} went public at a ${money(data.price)} valuation! You sold ${money(sold)} of stock; the rest of your stake (${money(stake - sold)}) is now in your brokerage account.`, '🔔', 'milestone');
      ctx.toast('IPO!', 'good');
      ctx.stat('happiness', 20);
      retire(state, biz, 'IPO', stake);
    },
    cashCrunch(ctx, data, optionId) {
      const { state, rng } = ctx;
      const biz = currentBusiness(state);
      if (!biz) return;
      const need = data.need;
      if (optionId === 'inject') {
        if (!ctx.spend(need, `Capital injection — ${biz.name}`, { credit: true })) {
          ctx.toast('You don\'t have that much cash or credit.', 'warn');
          return cashCrunch(ctx, biz);
        }
        biz.cash += need;
        biz.basis += need;
        ctx.log(`You put ${money(need)} of your own money into ${biz.name}.`, '💰', 'warn');
      } else if (optionId === 'loc') {
        biz.debts.loc = (biz.debts.loc ?? 0) + need;
        biz.cash += need;
        ctx.log(`${biz.name} drew ${money(need)} on a credit line you personally guaranteed.`, '🏦', 'warn');
      } else if (optionId === 'bridge' && biz.investors.length && rng.chance(0.5)) {
        const raised = need * 2;
        biz.cash += raised;
        biz.ownerPct = Math.round(biz.ownerPct * 0.8 * 10000) / 10000;
        biz.investors.push({ round: 'bridge', pct: 0.2, invested: raised });
        ctx.log(`Your investors put in a ${money(raised)} bridge round. You gave up a fifth of your stake.`, '🌉', 'warn');
      } else if (optionId === 'cut' && biz.staff.headcount >= 3) {
        const cut = Math.round(biz.staff.headcount / 3);
        biz.staff.headcount -= cut;
        bump(biz.staff, 'morale', -15);
        // Vendors only carry what's actually short (cash may have recovered since the crunch).
        if (biz.cash < 0) {
          biz.debts.payables = (biz.debts.payables ?? 0) + Math.round(-biz.cash);
          biz.cash = 0;
        }
        ctx.log(`You laid off ${cut} people at ${biz.name}; vendors agreed to wait a year.`, '✂️', 'warn');
      } else if (optionId === 'bankrupt') {
        closeBusiness(ctx, 'Business bankruptcy', { liquidation: 0.35, bankruptcy: true });
      } else {
        closeBusiness(ctx, optionId === 'bridge' ? 'Closed after investors passed on a bridge' : 'Closed (out of cash)');
      }
    },
  },
};
