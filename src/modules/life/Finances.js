/**
 * Year-end money settlement: income tax on the year's ledger, cost of living,
 * student loans, retirement-account growth and credit-card interest on debt.
 * Runs after every other module (order 90) so the ledger is complete.
 */
import { calculateIncomeTax } from '../career/CareerEngine.js';
import { isOnActiveDuty } from '../../core/State.js';

const LOAN_RATE = 0.05;
const DEBT_RATE = 0.15;
const RETIREMENT_GROWTH = 0.06;

export const Finances = {
  id: 'finances',
  order: 90,

  onYearEnd(ctx) {
    const { state } = ctx;
    const f = state.finances;
    const age = state.character.age;

    // Retirement account
    if (f.retirement > 0) {
      f.retirement = Math.round(f.retirement * (1 + RETIREMENT_GROWTH));
      if (state.career.retired && age >= 60) {
        const withdrawal = Math.round(f.retirement * 0.04);
        f.retirement -= withdrawal;
        ctx.earn(withdrawal, '401(k) withdrawal');
      }
    }

    const taxable = f.ledger.income.reduce((sum, i) => sum + i.amount, 0);
    const tax = calculateIncomeTax(taxable);

    // Cost of living scales with lifestyle. The military houses active members;
    // students roll living costs into their loans; the broke live frugally.
    let living = 0;
    if (age >= 18) {
      if (isOnActiveDuty(state)) living = 3000 + Math.round(taxable * 0.1);
      else if (state.education.enrolled) f.loans += 8000;
      else living = 7000 + Math.round(taxable * 0.25);
    }

    f.cash -= tax + living;
    f.taxesPaid += tax;

    // Student loans
    let loanPayment = 0;
    if (f.loans > 0) {
      f.loans = Math.round(f.loans * (1 + LOAN_RATE));
      if (!state.education.enrolled && f.cash > 0) {
        loanPayment = Math.min(f.loans, Math.max(3000, Math.round(f.loans * 0.12)), f.cash);
        f.loans -= loanPayment;
        f.cash -= loanPayment;
      }
    }

    // Negative cash is credit-card debt.
    let interest = 0;
    if (f.cash < 0) {
      interest = Math.round(-f.cash * DEBT_RATE);
      f.cash -= interest;
      // Bankruptcy wipes card debt once it dwarfs your income.
      if (-f.cash > Math.max(60000, taxable * 1.5)) {
        ctx.log(`You declared bankruptcy, wiping out $${(-f.cash).toLocaleString()} in debt. Your credit is wrecked.`, '💸', 'bad');
        ctx.toast('Declared bankruptcy', 'bad');
        f.cash = 0;
        f.bankruptcies = (f.bankruptcies ?? 0) + 1;
        ctx.stat('happiness', -15);
        ctx.stat('stress', 10);
      } else if (f.cash < -25000) {
        ctx.stat('stress', 8);
        ctx.stat('happiness', -4);
        ctx.log(`Debt collectors keep calling. You owe $${(-f.cash).toLocaleString()} on credit cards.`, '📞', 'warn');
      }
    }

    if (taxable > 0 || living > 0) {
      ctx.log(
        `Year-end finances: earned $${taxable.toLocaleString()}, paid $${tax.toLocaleString()} tax and $${living.toLocaleString()} living costs` +
          (loanPayment ? `, $${loanPayment.toLocaleString()} toward loans` : '') +
          (interest ? `, $${interest.toLocaleString()} card interest` : '') +
          '.',
        '🧾',
        'finance',
      );
    }

    f.lastYear = { gross: taxable, tax, living, loanPayment, interest };
    f.ledger = { income: [], expenses: [] };
  },
};
