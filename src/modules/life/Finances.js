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
import { ltcgTax } from '../investing/Assets.js';
import { coverage } from '../health/Insurance.js';

const LOAN_RATE = 0.05;
const DEBT_RATE = 0.15;
const HOUSING_SHARE = 0.45;
/** Lifestyle spending: a regional floor plus a share of discretionary income (after tax, housing and 401k). */
export const LIVING_FLOOR = 8000;
export const LIFESTYLE_SHARE = 0.85;
const LIVING_MINIMUM = 6000;
/** Living at home: parents cover most of it. */
const LIVING_AT_HOME = 2000;
const HOUSING_EXPENSE = /^(Rent|Mortgage|Property costs|HELOC interest)/;

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
  return (state.career.job?.salary ?? 0) + pensions + (state.retirement.socialSecurity?.annual ?? 0);
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
    const ordinary = gross - ltcg;
    const deductions = f.ledger.deductions.reduce((sum, d) => sum + d.amount, 0);
    const taxable = Math.max(0, ordinary - deductions);
    const capitalGainsTax = ltcgTax(taxable, ltcg);
    let federalTax = calculateIncomeTax(taxable) + capitalGainsTax;
    // States tax capital gains as ordinary income.
    let stateTax = stateIncomeTax(stateIdOf(state), Math.max(0, taxable + ltcg - 5000));
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
        const housing = f.ledger.expenses.filter((x) => HOUSING_EXPENSE.test(x.reason)).reduce((s, x) => s + x.amount, 0);
        // Card debt: interest plus a real effort to pay it down.
        const cardDebt = Math.max(0, -f.cash);
        const obligations = healthPremium(state, ordinary) + (f.loans > 0 ? Math.min(f.loans, Math.max(3000, f.loans * 0.12)) : 0) + cardDebt * (DEBT_RATE + 0.25);
        // Lifestyle follows steady income; windfalls (severance, settlements, prizes) mostly get saved.
        const base = Math.min(ordinary, Math.max(steadyIncome(state), ordinary * 0.5));
        const discretionary = base - tax * (base / Math.max(1, ordinary)) - housing - deductions - obligations;
        const atHome = state.housing.withParents && !state.housing.rental && !state.housing.properties.some((p) => p.use === 'primary');
        const minimum = atHome ? LIVING_AT_HOME : LIVING_MINIMUM;
        const lifestyle = (LIVING_FLOOR * Math.sqrt(region.col) + Math.max(0, discretionary) * LIFESTYLE_SHARE) * (1 + STATES[region.state].salesTax / 2);
        // Spending flexes down when money is tight, but never below the bare minimum.
        living = Math.round(Math.max(minimum, Math.min(lifestyle, discretionary * 0.92)));
      }
      insurance = healthPremium(state, ordinary);
    }

    f.cash -= tax + living + insurance;
    f.taxesPaid += tax;

    let loanPayment = 0;
    if (f.loans > 0) {
      f.loans = Math.round(f.loans * (1 + LOAN_RATE));
      if (!state.education.enrolled && f.cash > 0) {
        loanPayment = Math.min(f.loans, Math.max(3000, Math.round(f.loans * 0.12)), f.cash);
        f.loans -= loanPayment;
        f.cash -= loanPayment;
      }
    }

    let interest = 0;
    if (f.cash < 0) {
      interest = Math.round(-f.cash * DEBT_RATE);
      f.cash -= interest;
      if (-f.cash > Math.max(60000, gross * 1.5)) {
        ctx.log(`You declared bankruptcy, wiping out $${(-f.cash).toLocaleString()} in debt. Your credit is wrecked.`, '💸', 'bad');
        ctx.toast('Declared bankruptcy', 'bad');
        f.cash = 0;
        f.bankruptcies += 1;
        ctx.emit('credit:event', { type: 'bankruptcy' });
        ctx.stat('happiness', -15);
        ctx.stat('stress', 10);
      } else if (f.cash < -25000) {
        ctx.stat('stress', 8);
        ctx.stat('happiness', -4);
        ctx.log(`Debt collectors keep calling. You owe $${(-f.cash).toLocaleString()} on credit cards.`, '📞', 'warn');
      }
    }

    if (gross > 0 || living > 0) {
      ctx.log(
        `Year-end finances: earned $${gross.toLocaleString()}${deductions ? ` ($${deductions.toLocaleString()} pre-tax to retirement)` : ''}, paid $${federalTax.toLocaleString()} federal${capitalGainsTax ? ` (incl. $${capitalGainsTax.toLocaleString()} capital gains)` : ''}${stateTax ? ` + $${stateTax.toLocaleString()} ${stateIdOf(state)}` : ''} tax and $${living.toLocaleString()} living costs` +
          (insurance ? `, $${insurance.toLocaleString()} health insurance` : '') +
          (loanPayment ? `, $${loanPayment.toLocaleString()} toward loans` : '') +
          (interest ? `, $${interest.toLocaleString()} card interest` : '') +
          '.',
        '🧾',
        'finance',
      );
    }

    f.lastYear = { gross, ltcg, capitalGainsTax, deductions, tax, federalTax, stateTax, living, insurance, loanPayment, interest };
    f.ledger = { income: [], expenses: [], deductions: [] };
  },
};
