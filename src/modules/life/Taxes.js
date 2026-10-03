/**
 * Taxes beyond the bracket math in Finances: itemized deductions, IRS
 * audits, unpaid tax debt, payment plans, offers in compromise, liens and
 * levies.
 *
 * state.finances.tax = {
 *   debt          unpaid federal tax (penalties and interest accrue)
 *   plan          { annual } installment agreement | null
 *   lien          age a federal tax lien was filed | null
 *   unpaidYears   years in a row with debt and no plan
 *   audits        [{ age, result, owed }]
 * }
 */
import { STANDARD_DEDUCTION } from '../career/CareerEngine.js';

/** 2025 law: $40,000 SALT cap, phased down by 30% of income over $500,000 to a $10,000 floor. */
export const SALT_CAP = 40000;
const SALT_FLOOR = 10000;
const SALT_PHASE = 500000;
const MEDICAL_FLOOR = 0.075;
const DEBT_GROWTH = 0.08;
const PLAN_YEARS = 6;
const PLAN_FEE = 130;
const LEVY_SHARE = 0.15;
/** "Seriously delinquent" tax debt: the State Department can deny or revoke your passport. */
export const PASSPORT_THRESHOLD = 64000;

export const taxState = (state) => state.finances.tax;

/** Itemizable amounts from this year's ledger plus state income tax. */
export function itemizedDeductions(state, { stateTax, agi }) {
  const items = state.finances.ledger.itemize ?? [];
  const sum = (kind) => items.filter((i) => i.kind === kind).reduce((s, i) => s + i.amount, 0);
  const cap = Math.max(SALT_FLOOR, SALT_CAP - Math.max(0, agi - SALT_PHASE) * 0.3);
  const salt = Math.min(cap, stateTax + sum('propertyTax'));
  const mortgageInterest = sum('mortgageInterest');
  const charity = Math.min(agi * 0.6, state.community?.givenThisYear ?? 0);
  const medicalSpent = state.finances.ledger.expenses.filter((x) => /^Medical/.test(x.reason)).reduce((s, x) => s + x.amount, 0);
  const medical = Math.max(0, medicalSpent - agi * MEDICAL_FLOOR);
  return { salt, mortgageInterest, charity, medical, total: Math.round(salt + mortgageInterest + charity + medical) };
}

export const standardDeduction = (married) => STANDARD_DEDUCTION * (married ? 2 : 1);

/** Yearly odds the IRS audits last year's return. */
export function auditOdds(state) {
  const ly = state.finances.lastYear;
  if (!ly || state.character.age < 18) return 0;
  const gross = ly.gross ?? 0;
  let odds = gross > 10000000 ? 0.08 : gross > 1000000 ? 0.02 : gross > 500000 ? 0.01 : gross > 25000 ? 0.004 : 0.002;
  if (state.business?.current) odds *= 1.6;
  if (ly.itemized && (ly.itemized.charity ?? 0) > gross * 0.1) odds *= 2;
  if (state.legal.flags.taxCheatAge === state.character.age - 1) odds = Math.max(odds, 0.35);
  return odds;
}

/** Unpaid tax at year end becomes IRS debt instead of card debt. Called by Finances. */
export function carryUnpaidTax(ctx, tax) {
  const f = ctx.state.finances;
  if (f.cash >= 0 || tax <= 0) return 0;
  const unpaid = Math.min(tax, -f.cash);
  f.cash += unpaid;
  f.tax.debt += unpaid;
  ctx.log(`You couldn't pay $${unpaid.toLocaleString()} of your taxes. The IRS adds penalties and interest until it's paid.`, '🧾', 'bad');
  return unpaid;
}

function debtTick(ctx) {
  const { state, rng } = ctx;
  const t = taxState(state);
  if (t.debt <= 0) {
    t.debt = 0;
    t.plan = null;
    t.unpaidYears = 0;
    return;
  }
  t.debt = Math.round(t.debt * (1 + DEBT_GROWTH));
  if (t.plan) {
    const pay = Math.min(t.debt, t.plan.annual);
    ctx.spend(pay, 'IRS installment payment', { allowDebt: true });
    t.debt -= pay;
    if (t.debt <= 0) {
      t.plan = null;
      ctx.log('You made the last payment on your IRS installment plan.', '🧾', 'good');
      if (t.lien != null) {
        t.lien = null;
        ctx.log('The IRS released its tax lien.', '📜', 'good');
      }
    }
    return;
  }
  t.unpaidYears += 1;
  if (t.unpaidYears === 1 && !state.prompts.some((p) => p.type === 'taxes.debt')) {
    const plan = Math.ceil(t.debt / PLAN_YEARS);
    const insolvent = state.finances.cash + (state.retirement.dc ?? 0) * 0.5 < t.debt;
    ctx.prompt({
      type: 'taxes.debt', icon: '🏛️', title: 'You Owe the IRS',
      text: `You owe $${t.debt.toLocaleString()} in back taxes, penalties and interest.`,
      options: [
        { id: 'plan', label: `📅 Installment agreement ($${plan.toLocaleString()}/yr for ${PLAN_YEARS} yr)`, hint: `$${PLAN_FEE} setup fee; stops collection` },
        { id: 'oic', label: '🤝 Offer in compromise', hint: insolvent ? 'Settle for a fraction — you qualify on paper' : 'Rarely accepted unless you truly can\'t pay', disabled: false },
        { id: 'pay', label: '💵 Pay it in full', hint: 'Cash or card' },
        { id: 'ignore', label: '🙈 Ignore the letters', hint: 'Liens, then wage levies', tone: 'danger' },
      ],
      data: { insolvent },
    });
  }
  // Collections escalate: a lien after two years, then levies on wages.
  if (t.unpaidYears >= 2 && t.lien == null && t.debt > 10000) {
    t.lien = state.character.age;
    ctx.emit('credit:event', { type: 'lien' });
    ctx.log(`The IRS filed a federal tax lien against you for $${t.debt.toLocaleString()}.`, '📜', 'bad');
  }
  if (t.unpaidYears >= 3) {
    const wages = state.career.job?.salary ?? 0;
    if (wages > 0) {
      const levy = Math.min(t.debt, Math.round(wages * LEVY_SHARE));
      ctx.spend(levy, 'IRS wage levy', { allowDebt: true });
      t.debt -= levy;
      ctx.log(`The IRS levied your wages: $${levy.toLocaleString()} taken from your paychecks.`, '🏛️', 'bad');
    }
    if (t.debt > PASSPORT_THRESHOLD && !t.passport && rng.chance(0.5)) {
      t.passport = true;
      ctx.log('The IRS certified you as seriously delinquent. The State Department can now refuse your passport.', '🛂', 'warn');
    }
  }
}

function auditTick(ctx) {
  const { state, rng } = ctx;
  if (state.legal.incarceration || state.prompts.some((p) => p.type === 'taxes.audit')) return;
  if (!rng.chance(auditOdds(state))) return;
  const ly = state.finances.lastYear;
  const big = (ly.gross ?? 0) > 1000000;
  ctx.prompt({
    type: 'taxes.audit', icon: '🔎', title: 'IRS Audit',
    text: `The IRS is examining last year's return ($${(ly.gross ?? 0).toLocaleString()} reported income${ly.itemized ? ', itemized' : ''}).`,
    options: [
      { id: 'cpa', label: `🧮 Hire a CPA ($${(big ? 12000 : 3000).toLocaleString()})`, hint: 'Lower penalties; better odds of a clean result' },
      { id: 'self', label: '📂 Handle it yourself', hint: 'Free, stressful, riskier' },
    ],
    data: { cheated: state.legal.flags.taxCheatAge === state.character.age - 1, federalTax: ly.federalTax ?? 0, big },
  });
}

export const Taxes = {
  id: 'taxes',
  order: 88,

  init(state) {
    state.finances.tax ??= { debt: 0, plan: null, lien: null, unpaidYears: 0, audits: [], passport: false };
  },

  onAgeUp(ctx) {
    if (ctx.state.character.age < 18) return;
    debtTick(ctx);
    auditTick(ctx);
  },

  actions: {
    payDebt(ctx) {
      const t = taxState(ctx.state);
      if (!t.debt) return;
      const pay = Math.min(t.debt, Math.max(0, ctx.state.finances.cash));
      if (!pay) return ctx.toast('No cash to pay with.', 'warn');
      ctx.spend(pay, 'IRS payment');
      t.debt -= pay;
      ctx.log(`You paid the IRS $${pay.toLocaleString()}.${t.debt ? ` $${t.debt.toLocaleString()} still owed.` : ' Your tax debt is cleared.'}`, '🧾', t.debt ? undefined : 'good');
      if (!t.debt) {
        t.plan = null;
        t.unpaidYears = 0;
        if (t.lien != null) t.lien = null;
      }
    },
    requestPlan(ctx) {
      const t = taxState(ctx.state);
      if (!t.debt || t.plan) return;
      ctx.spend(PLAN_FEE, 'IRS installment setup fee', { allowDebt: true });
      t.plan = { annual: Math.ceil(t.debt / PLAN_YEARS) };
      t.unpaidYears = 0;
      ctx.log(`You set up an IRS installment agreement: $${t.plan.annual.toLocaleString()}/yr.`, '📅');
    },
  },

  resolvers: {
    debt(ctx, data, optionId) {
      const { state, rng } = ctx;
      const t = taxState(state);
      if (optionId === 'plan') return Taxes.actions.requestPlan(ctx);
      if (optionId === 'pay') {
        if (ctx.spend(t.debt, 'IRS payment', { credit: true })) {
          ctx.log(`You paid off $${t.debt.toLocaleString()} in back taxes.`, '🧾', 'good');
          t.debt = 0;
          t.unpaidYears = 0;
          return;
        }
        ctx.log('You couldn\'t cover it, even on credit.', '💸', 'warn');
        return Taxes.actions.requestPlan(ctx);
      }
      if (optionId === 'oic') {
        // Accepted roughly 1 in 3 times overall, mostly when you genuinely can't pay.
        if (rng.chance(data.insolvent ? 0.45 : 0.05)) {
          const settle = Math.round(t.debt * rng.float(0.1, 0.3));
          ctx.spend(settle, 'Offer in compromise', { allowDebt: true });
          ctx.log(`The IRS accepted your offer in compromise: $${settle.toLocaleString()} settles $${t.debt.toLocaleString()}. You must file and pay on time for five years.`, '🤝', 'good');
          t.debt = 0;
          t.unpaidYears = 0;
          return;
        }
        ctx.log('The IRS rejected your offer in compromise. You can still set up a payment plan.', '🙅', 'warn');
        return;
      }
      ctx.log('You stopped opening the envelopes from the IRS.', '🙈', 'warn');
    },
    audit(ctx, data, optionId) {
      const { state, rng } = ctx;
      const t = taxState(state);
      const cpa = optionId === 'cpa';
      if (cpa) ctx.spend(data.big ? 12000 : 3000, 'CPA fees', { allowDebt: true });
      else ctx.stat('stress', 10);
      let owed = 0;
      let result;
      if (data.cheated) {
        // Unreported income: the tax you dodged, plus a 20% accuracy penalty (CPA) or 75% civil fraud penalty.
        const dodged = Math.round(data.federalTax / 0.7 * 0.3);
        owed = Math.round(dodged * (cpa ? 1.2 : 1.75));
        result = 'fraud';
        if (rng.chance(cpa ? 0.15 : 0.45)) ctx.emit('legal:offense', { offenseId: 'taxEvasion', caught: true, context: 'criminal referral from an IRS audit', evidence: 0.85 });
      } else if (rng.chance(cpa ? 0.15 : 0.35)) {
        owed = Math.round(Math.max(500, data.federalTax * rng.float(0.02, 0.08)) * 1.2);
        result = 'adjusted';
      } else result = 'clean';
      t.audits.push({ age: state.character.age, result, owed });
      if (owed) {
        t.debt += owed;
        t.unpaidYears = 0;
      }
      ctx.log(result === 'clean' ? 'The audit closed with no change. Your records held up.' : result === 'adjusted' ? `The IRS disallowed some deductions: $${owed.toLocaleString()} in back taxes, interest and penalties.` : `The IRS found the income you didn't report: $${owed.toLocaleString()} in back taxes and ${cpa ? 'accuracy' : 'fraud'} penalties.`, '🔎', result === 'clean' ? 'good' : 'bad');
    },
  },
};
