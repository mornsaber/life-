/**
 * Year-end money settlement: income tax on the year's ledger (after pre-tax
 * retirement deductions), cost of living by region, housing benefits,
 * health insurance, student loans and credit-card interest on debt.
 * Runs after every other module (order 90) so the ledger is complete.
 */
import { calculateIncomeTax } from '../career/CareerEngine.js';
import { isOnActiveDuty } from '../../core/State.js';
import { regionOf, stateIdOf } from './Regions.js';
import { stateIncomeTax, STATES } from './States.js';
import { lawValue } from '../politics/Laws.js';
import { ltcgTax } from '../investing/Assets.js';
import { coverage } from '../health/Insurance.js';
import { isMarried, spouseIncome, minorChildren, ageOf } from '../people/People.js';
import { fileBankruptcy, ch13Tick, debtCrisisPrompt } from './Bankruptcy.js';
import { itemizedDeductions, standardDeduction, carryUnpaidTax } from './Taxes.js';
import { cardObligation, settleCards } from './CreditCards.js';
import { countryOf, nationalIncomeTax, socialContributions, childBenefit } from '../world/Countries.js';

/** Child Tax Credit per child under 17 (non-refundable here). */
export const CHILD_TAX_CREDIT = 2000;

const LOAN_RATE = 0.05;
const HOUSING_SHARE = 0.45;
/** Lifestyle spending: a regional floor plus a share of discretionary income (after tax, housing and 401k). */
export const LIVING_FLOOR = 8000;
export const LIFESTYLE_SHARE = 0.85;
const LIVING_MINIMUM = 6000;
/** Living at home: parents cover most of it. */
const LIVING_AT_HOME = 2000;
const HOUSING_EXPENSE = /^(Rent|Mortgage|Property costs|HELOC interest)/;
/** Kids, support, premiums — and money you pour into your own business — come off the top before lifestyle spending. */
const FAMILY_EXPENSE = /^(Child expenses|Childcare|Child support|Alimony paid|Life insurance premium|Capital injection|Self-employment tax|Payroll tax \(FICA\)|Elder care|Vehicle|IRS)|personal spending$/;

/** Your share of health-insurance premiums for whichever plan covers you this year (see health/Insurance). */
export function healthPremium(state, income) {
  if (state.character.age < 18) return 0;
  return coverage(state, income).premium;
}

export function hasHousingBenefit(state) {
  const job = state.career.job;
  return Boolean(job?.employer.benefits.housing || job?.posting?.housing);
}

/** Salary, pensions and Social Security: the income people set their lifestyle by. */
function steadyIncome(state) {
  const age = state.character.age;
  const pensions = state.retirement.pensions.filter((p) => age >= p.startAge).reduce((s, p) => s + p.annual * (p.colaFactor ?? 1), 0);
  const ownerPay = state.business?.current?.lastYear?.ownerPay ?? 0;
  const gig = state.gig?.active ? state.gig.lastYear?.net ?? 0 : 0;
  return (state.career.job?.salary ?? 0) + pensions + (state.retirement.socialSecurity?.annual ?? 0) + spouseIncome(state) + ownerPay + gig;
}

/** This year's student-loan payment: income-contingent in the UK (9% over the threshold), else at least 12% of the balance. */
function loanDue(state, balance, gross, { exact = false } = {}) {
  const e = countryOf(state).education;
  if (e?.loans === 'icr') return Math.min(balance, Math.max(0, Math.round(0.09 * (gross - e.loanThreshold))));
  return exact ? Math.min(balance, Math.max(3000, balance * 0.12)) : Math.min(balance, Math.max(3000, Math.round(balance * 0.12)));
}

export const Finances = {
  id: 'finances',
  order: 90,

  onYearEnd(ctx) {
    const { state } = ctx;
    const f = state.finances;
    const age = state.character.age;
    const gross = f.ledger.income.reduce((sum, i) => sum + i.amount, 0);
    const ltcg = f.ledger.income.reduce((sum, i) => sum + (i.ltcg ? i.amount : 0), 0);
    // Combat zone pay is excluded from income tax.
    const taxFree = f.ledger.income.reduce((sum, i) => sum + (i.taxFree ?? 0), 0);
    // Informal cash pay is off the books: never reported, so never taxed (and it builds no pension).
    const informalPay = f.ledger.income.reduce((sum, i) => sum + (i.informal ? i.amount : 0), 0);
    const ordinary = gross - ltcg - taxFree - informalPay;
    // Pass-through business profit left in the business is taxed but never reaches your wallet.
    const retained = f.ledger.income.reduce((sum, i) => sum + (i.retained ? i.amount : 0), 0);
    const deductions = f.ledger.deductions.reduce((sum, d) => sum + d.amount, 0);
    // Money that actually left your paycheck (401(k), IRA, commuter benefit) — not depreciation or business losses.
    const cashDeductions = f.ledger.deductions.reduce((sum, d) => sum + (d.nonCash ? 0 : d.amount), 0);
    const agi = Math.max(0, ordinary - deductions);
    // Married filing jointly: brackets and the standard deduction double (≈ splitting income in half).
    const married = isMarried(state);
    const joint = (fn, amount) => (married ? 2 * fn(amount / 2) : fn(amount));
    // States tax capital gains as ordinary income.
    // The legislature can cut or raise the state's rates (politics/Laws).
    const stateRate = { cut: 0.8, standard: 1, hike: 1.2 }[lawValue(state, 'stateIncomeTax')] ?? 1;
    let stateTax = (stateRate === 1 ? (x) => x : (x) => Math.round(x * stateRate))(joint((x) => stateIncomeTax(stateIdOf(state), x), Math.max(0, agi + ltcg - (married ? 10000 : 5000))));
    // Abroad: national income tax, payroll social contributions and child benefit replace the US federal rules.
    const country = countryOf(state);
    const abroad = country.id !== 'US';
    // Itemize when mortgage interest, state and local taxes, charity and big medical bills beat the standard deduction.
    const itemized = abroad ? { total: 0 } : itemizedDeductions(state, { stateTax, agi: agi + ltcg });
    const itemizing = !abroad && itemized.total > standardDeduction(married);
    const taxable = Math.max(0, agi - (itemizing ? itemized.total - standardDeduction(married) : 0));
    const capitalGainsTax = ltcgTax(taxable, ltcg);
    const kids = minorChildren(state).filter((c) => c.custody !== 'ex');
    const kidsCredit = abroad ? 0 : kids.filter((c) => ageOf(state, c) < 17).length * CHILD_TAX_CREDIT;
    const contributions = abroad ? socialContributions(country, Math.max(0, ordinary)) : 0;
    // Where contributions are deductible (Germany, Japan, part of Canada's), they come off taxable income.
    const deductible = abroad ? Math.round(contributions * (country.tax.contribDeductible ?? 0)) + (country.tax.workAllowance ?? 0) : 0;
    if (abroad) {
      const province = STATES[stateIdOf(state)];
      const provincialBase = Math.max(0, agi + ltcg - deductible - (country.tax.provincialAllowance ?? (married ? 10000 : 5000)));
      stateTax = (stateRate === 1 ? (x) => x : (x) => Math.round(x * stateRate))(joint((x) => stateIncomeTax(stateIdOf(state), x), provincialBase));
      if (province?.ownIncomeTax) stateTax = joint((x) => stateIncomeTax(stateIdOf(state), x), Math.max(0, taxable - deductible));
    }
    let federalTax = abroad
      ? joint((x) => nationalIncomeTax(country, x, STATES[stateIdOf(state)]), Math.max(0, taxable - deductible)) + capitalGainsTax + contributions
      : Math.max(0, joint(calculateIncomeTax, taxable) - kidsCredit) + capitalGainsTax;
    // Child benefit (CCB, Child Benefit, Kindergeld, the child allowance) is paid in cash.
    const benefit = abroad ? childBenefit(country, kids.length, gross) : 0;
    if (benefit) f.cash += benefit;
    if (state.legal.flags.taxCheatAge === age) {
      federalTax = Math.round(federalTax * 0.7);
      stateTax = Math.round(stateTax * 0.7);
    }
    const tax = federalTax + stateTax;

    // Cost of living: lifestyle scales with income and region; housing benefits
    // (park housing, embassy quarters, base housing) waive the rent share.
    let living = 0;
    let insurance = 0;
    if (age >= 18 && !state.legal.incarceration) {
      const region = regionOf(state);
      if (isOnActiveDuty(state)) living = 3000 + Math.round(gross * 0.1);
      else if (state.education.enrolled?.pace === 'full' && !state.career.job) {
        // Full-time students borrow for living costs — unless the GI Bill housing allowance covers them.
        if (!state.education.enrolled.giBillThisYear && state.campus?.housing !== 'dorm') f.loans += 8000;
      }
      else {
        // Housing (rent, mortgage, upkeep) is charged by the housing module.
        // Everything else is spent out of what's left after taxes, housing and
        // retirement saving — people with big mortgages spend less elsewhere.
        const housing = f.ledger.expenses.filter((x) => HOUSING_EXPENSE.test(x.reason) || FAMILY_EXPENSE.test(x.reason)).reduce((s, x) => s + x.amount, 0);
        // Card debt: interest plus a real effort to pay it down — or just the minimum (see CreditCards).
        const cardDebt = Math.max(0, -f.cash);
        const obligations = healthPremium(state, ordinary) + (f.loans > 0 ? loanDue(state, f.loans, gross, { exact: true }) : 0) + cardObligation(state, cardDebt);
        // Lifestyle follows steady income; windfalls (severance, settlements, prizes) mostly get saved.
        const spendable = ordinary + informalPay - retained;
        const base = Math.min(spendable, Math.max(steadyIncome(state), spendable * 0.5));
        const discretionary = base - tax * (base / Math.max(1, ordinary + informalPay)) - housing - cashDeductions - obligations;
        const atHome = state.housing.withParents && !state.housing.rental && !state.housing.properties.some((p) => p.use === 'primary');
        const minimum = atHome ? LIVING_AT_HOME : LIVING_MINIMUM;
        // A second adult adds about half again to household needs (OECD equivalence scale).
        const household = married ? 1.5 : 1;
        const lifestyle = (LIVING_FLOOR * household * Math.sqrt(region.col) + Math.max(0, discretionary) * LIFESTYLE_SHARE) * (1 + STATES[region.state].salesTax / 2);
        // Spending flexes down when money is tight, but never below the bare minimum.
        living = Math.round(Math.max(minimum, Math.min(lifestyle, discretionary * 0.92)));
      }
      insurance = healthPremium(state, ordinary);
    }

    f.cash -= tax + living + insurance;
    f.taxesPaid += tax;
    // Taxes you can't pay become IRS debt (see Taxes), not credit-card debt.
    const unpaidTax = carryUnpaidTax(ctx, tax);

    let loanPayment = 0;
    // National service (AmeriCorps, Peace Corps) puts federal student loans in forbearance.
    if (f.loans > 0 && !state.service?.program) {
      const icr = countryOf(state).education?.loans === 'icr';
      f.loans = Math.round(f.loans * (1 + (icr ? 0.03 : LOAN_RATE)));
      // UK student loans are written off after 40 years (around 61), whatever is left.
      if (icr && age >= 61) {
        ctx.log(`Your remaining student loan ($${f.loans.toLocaleString()}) was written off.`, '🎓', 'good');
        f.loans = 0;
      } else if (!state.education.enrolled && f.cash > 0) {
        loanPayment = Math.min(f.loans, loanDue(state, f.loans, gross), f.cash);
        f.loans -= loanPayment;
        f.cash -= loanPayment;
      }
    }

    ch13Tick(ctx);

    let interest = 0;
    const cards = state.character.age >= 18 ? settleCards(ctx, { living }) : { interest: 0 };
    if (f.cash < 0) {
      interest = cards.interest;
      f.cash -= interest;
      if (-f.cash > Math.max(60000, gross * 1.5)) {
        // Unmanageable debt: a bankruptcy attorney lays out the options (or collectors keep calling).
        debtCrisisPrompt(ctx);
        ctx.log(`You owe $${(-f.cash).toLocaleString()} on credit cards — more than you can ever pay off at these interest rates.`, '💸', 'bad');
        ctx.stat('happiness', -6);
        ctx.stat('stress', 10);
      } else if (f.cash < -25000) {
        ctx.stat('stress', 8);
        ctx.stat('happiness', -4);
        ctx.log(`Debt collectors keep calling. You owe $${(-f.cash).toLocaleString()} on credit cards.`, '📞', 'warn');
      }
    }

    if (gross > 0 || living > 0) {
      ctx.log(
        `Year-end finances: earned $${gross.toLocaleString()}${cashDeductions ? ` ($${cashDeductions.toLocaleString()} pre-tax to retirement)` : ''}${deductions > cashDeductions ? ` ($${(deductions - cashDeductions).toLocaleString()} in depreciation and losses written off)` : ''}, paid $${federalTax.toLocaleString()} ${abroad ? 'income tax' : 'federal'}${contributions ? ` (incl. $${contributions.toLocaleString()} ${country.tax.contributions[0].name}${country.tax.contributions.length > 1 ? ' and other contributions' : ''})` : ''}${capitalGainsTax ? ` (incl. $${capitalGainsTax.toLocaleString()} capital gains)` : ''}${stateTax ? ` + $${stateTax.toLocaleString()} ${abroad ? `${STATES[stateIdOf(state)].name} ` : stateIdOf(state)}${abroad ? 'tax' : ''}` : ''}${abroad ? '' : ' tax'} and $${living.toLocaleString()} living costs` +
          (insurance ? `, $${insurance.toLocaleString()} health insurance` : '') +
          (loanPayment ? `, $${loanPayment.toLocaleString()} toward loans` : '') +
          (interest ? `, $${interest.toLocaleString()} card interest` : '') +
          (benefit ? `. ${country.childBenefit.name}: +$${benefit.toLocaleString()}` : '') +
          '.',
        '🧾',
        'finance',
      );
    }

    f.lastYear = { gross, ltcg, capitalGainsTax, married, kidsCredit, ...(abroad ? { contributions, childBenefit: benefit } : {}), deductions, tax, federalTax, stateTax, living, insurance, loanPayment, interest, unpaidTax, itemized: itemizing ? itemized : null };
    f.ledger = { income: [], expenses: [], deductions: [], itemize: [] };
  },

  actions: {
    /** arg: '7' | '13' */
    fileBankruptcy(ctx, chapter) {
      fileBankruptcy(ctx, Number(chapter) === 13 ? 13 : 7);
    },
  },

  resolvers: {
    debtCrisis(ctx, _data, optionId) {
      if (optionId === 'ch7') fileBankruptcy(ctx, 7);
      else if (optionId === 'ch13') fileBankruptcy(ctx, 13);
      else ctx.log('You decided to keep paying what you can. The collectors keep calling.', '📞', 'warn');
    },
  },
};
