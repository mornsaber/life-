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

const LOAN_RATE = 0.05;
const DEBT_RATE = 0.15;
const HOUSING_SHARE = 0.45;

/** Marketplace health premiums when no employer plan covers you (subsidized at low incomes). */
export function healthPremium(state, income) {
  const age = state.character.age;
  if (age < 26 || age >= 65 || isOnActiveDuty(state) || state.legal.incarceration) return 0;
  if (state.career.job?.employer.benefits.health) return 0;
  return income < 40000 ? 1500 : 6500;
}

export function hasHousingBenefit(state) {
  const job = state.career.job;
  return Boolean(job?.employer.benefits.housing || job?.posting?.housing);
}

export const Finances = {
  id: 'finances',
  order: 90,

  onYearEnd(ctx) {
    const { state } = ctx;
    const f = state.finances;
    const age = state.character.age;
    const gross = f.ledger.income.reduce((sum, i) => sum + i.amount, 0);
    const deductions = f.ledger.deductions.reduce((sum, d) => sum + d.amount, 0);
    const taxable = Math.max(0, gross - deductions);
    let federalTax = calculateIncomeTax(taxable);
    let stateTax = stateIncomeTax(stateIdOf(state), Math.max(0, taxable - 5000));
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
        if (!state.education.enrolled.giBillThisYear) f.loans += 8000;
      }
      else {
        // Housing (rent, mortgage, upkeep) is charged by the housing module;
        // this is everything else, nudged by the state's sales tax.
        living = Math.round((9000 + gross * 0.3) * region.col * (1 - HOUSING_SHARE) * (1 + STATES[region.state].salesTax / 2));
      }
      insurance = healthPremium(state, gross);
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
        `Year-end finances: earned $${gross.toLocaleString()}${deductions ? ` ($${deductions.toLocaleString()} pre-tax to retirement)` : ''}, paid $${federalTax.toLocaleString()} federal${stateTax ? ` + $${stateTax.toLocaleString()} ${stateIdOf(state)}` : ''} tax and $${living.toLocaleString()} living costs` +
          (insurance ? `, $${insurance.toLocaleString()} health insurance` : '') +
          (loanPayment ? `, $${loanPayment.toLocaleString()} toward loans` : '') +
          (interest ? `, $${interest.toLocaleString()} card interest` : '') +
          '.',
        '🧾',
        'finance',
      );
    }

    f.lastYear = { gross, deductions, tax, federalTax, stateTax, living, insurance, loanPayment, interest };
    f.ledger = { income: [], expenses: [], deductions: [] };
  },
};
