/**
 * Personal bankruptcy (U.S. Bankruptcy Code), simplified:
 *
 *   Chapter 7   Liquidation. Pass the means test (income at or below your
 *               state's median for your household), give up non-exempt
 *               assets (brokerage accounts and cash beyond a wildcard
 *               exemption, rental properties, home equity above the state
 *               homestead exemption), and card and medical debt is wiped.
 *               Once every 8 years.
 *   Chapter 13  Reorganization. Keep everything; pay what you can afford for
 *               3 years (5 if you earn above the median), then the rest is
 *               discharged.
 *
 * Never discharged: student loans, child-support arrears, court fines.
 * Retirement accounts (401(k), IRA, pensions) are always protected.
 */
import { clamp } from '../../core/Random.js';
import { stateIdOf } from './Regions.js';

export const CH7_FEE = 1500;
export const CH13_FEE = 4000;
export const CH7_WAIT = 8;
export const CH13_WAIT = 2;
/** Federal wildcard exemption for cash and investments (simplified). */
export const WILDCARD_EXEMPTION = 15000;
/** Homestead exemption by state (equity in your home you keep). Infinity = unlimited. */
export const HOMESTEAD = { TX: Infinity, FL: Infinity, IA: Infinity, DC: Infinity, CA: 600000, MA: 500000, MT: 350000, CO: 250000, NY: 170000, OH: 160000, WA: 125000, IL: 15000 };
const DEFAULT_HOMESTEAD = 50000;
/** Median income for a one-person household (means test); larger households scale up. */
export const MEDIAN_INCOME = { CA: 77000, TX: 62000, FL: 60000, NY: 70000, IL: 68000, OH: 60000, IA: 62000, MT: 60000, CO: 75000, WA: 80000, DC: 90000, MA: 85000 };

export const homesteadExemption = (state) => HOMESTEAD[stateIdOf(state)] ?? DEFAULT_HOMESTEAD;

function householdSize(state) {
  const list = state.people?.list ?? [];
  const spouse = list.some((p) => p.alive && p.relation === 'spouse');
  const kids = list.filter((p) => p.alive && p.relation === 'child' && state.character.age + p.ageOffset < 18 && p.custody !== 'ex').length;
  return 1 + (spouse ? 1 : 0) + kids;
}

export function medianIncome(state) {
  const base = MEDIAN_INCOME[stateIdOf(state)] ?? 65000;
  const size = householdSize(state);
  return Math.round(base * (size === 1 ? 1 : size === 2 ? 1.3 : 1.3 + 0.15 * (size - 2)));
}

const annualIncome = (state) => Math.max(state.finances.lastYear?.gross ?? 0, state.career.job?.salary ?? 0);

/** Debts bankruptcy can wipe out. */
export function dischargeableDebt(state) {
  return Math.max(0, -state.finances.cash) + (state.health?.medicalDebt ?? 0);
}

/** What a Chapter 7 trustee would take, and whether the house goes. */
export function liquidationPreview(state) {
  const inv = state.investing;
  const brokerage = inv ? Object.values(inv.holdings).reduce((s, h) => s + h.value, 0) + inv.speculative.reduce((s, p) => s + (p.value ?? 0), 0) : 0;
  const cash = Math.max(0, state.finances.cash);
  const wildcardTaken = Math.max(0, brokerage + cash - WILDCARD_EXEMPTION);
  const rentals = state.housing.properties.filter((p) => p.use !== 'primary');
  const home = state.housing.properties.find((p) => p.use === 'primary');
  const equity = home ? Math.max(0, home.value - (home.mortgage?.balance ?? 0) - (home.heloc?.balance ?? 0)) : 0;
  const homeLost = Boolean(home) && equity > homesteadExemption(state);
  return { brokerage, wildcardTaken, rentals: rentals.length, homeLost, equity, exemption: homesteadExemption(state) };
}

export function bankruptcyOptions(state) {
  const f = state.finances;
  const age = state.character.age;
  const debt = dischargeableDebt(state);
  const last = f.lastBankruptcy;
  const income = annualIncome(state);
  const median = medianIncome(state);
  const base = age < 18 ? 'Must be 18' : state.legal.incarceration ? 'Not while incarcerated' : f.ch13 ? 'Already in a Chapter 13 plan' : debt < 5000 ? 'Not enough debt to file' : null;
  const ch7 = base ? { ok: false, reason: base }
    : last && age - last.age < (last.chapter === 7 ? CH7_WAIT : 4) ? { ok: false, reason: `Last discharge was ${age - last.age} yr ago (${last.chapter === 7 ? CH7_WAIT : 4} required)` }
      : income > median ? { ok: false, reason: `Fails the means test: income $${income.toLocaleString()} > state median $${median.toLocaleString()}` }
        : { ok: true };
  const ch13 = base ? { ok: false, reason: base }
    : last && age - last.age < CH13_WAIT ? { ok: false, reason: `Filed ${age - last.age} yr ago (${CH13_WAIT} required)` }
      : income < 12000 ? { ok: false, reason: 'Needs regular income to fund a plan' }
        : { ok: true, years: income > median ? 5 : 3, annual: ch13Payment(state, debt) };
  return { debt, income, median, ch7, ch13, preview: liquidationPreview(state) };
}

/** Disposable income above the median-based allowance, but at least a token payment. */
function ch13Payment(state, debt) {
  const income = annualIncome(state);
  const years = income > medianIncome(state) ? 5 : 3;
  const disposable = Math.max(0, (income - medianIncome(state) * 0.8) * 0.5);
  return Math.round(clamp(disposable, 1200, debt / years));
}

function wipe(state) {
  const f = state.finances;
  const wiped = dischargeableDebt(state);
  f.cash = Math.max(0, f.cash);
  if (state.health) {
    state.health.medicalDebt = 0;
    state.health.collections = false;
  }
  return wiped;
}

/** File. Returns true if the case was accepted. */
export function fileBankruptcy(ctx, chapter) {
  const { state } = ctx;
  const f = state.finances;
  const opts = bankruptcyOptions(state);
  const option = chapter === 7 ? opts.ch7 : opts.ch13;
  if (!option.ok) {
    ctx.toast(option.reason, 'warn');
    return false;
  }
  const age = state.character.age;
  if (chapter === 7) {
    const p = opts.preview;
    const wiped = opts.debt;
    // The trustee sells non-exempt property; you keep the homestead amount and the wildcard.
    for (const rental of state.housing.properties.filter((x) => x.use !== 'primary')) ctx.emit('housing:sell', { propertyId: rental.id });
    ctx.emit('bankruptcy:liquidate', {});
    if (p.homeLost) ctx.emit('housing:sell', { propertyId: state.housing.properties.find((x) => x.use === 'primary').id });
    const inv = state.investing;
    let investments = 0;
    if (inv) {
      investments = Object.values(inv.holdings).reduce((sum, h) => sum + h.value, 0) + inv.speculative.reduce((sum, x) => sum + (x.value ?? 0), 0);
      inv.holdings = {};
      inv.speculative = [];
    }
    const liquid = Math.max(0, f.cash) + investments;
    const exempt = WILDCARD_EXEMPTION + (p.homeLost ? Math.min(p.exemption, p.equity) : 0);
    const taken = Math.max(0, liquid - exempt);
    f.cash = liquid - taken;
    wipe(state);
    const fee = f.cash >= CH7_FEE ? CH7_FEE : 0;
    if (fee) ctx.spend(fee, 'Bankruptcy attorney & filing fee');
    const sold = [p.homeLost ? 'your home (equity above the exemption)' : '', p.rentals ? 'your rental properties' : '', taken ? `$${taken.toLocaleString()} in non-exempt savings and investments` : ''].filter(Boolean);
    ctx.log(`You filed for Chapter 7 bankruptcy. $${wiped.toLocaleString()} in card and medical debt was discharged${sold.length ? `; the trustee took ${sold.join(', ')}` : ''}. Retirement accounts were protected.${fee ? '' : ' Filing fee waived.'}${f.loans ? ' Student loans survive bankruptcy.' : ''}`, '⚖️', 'bad');
    ctx.emit('credit:event', { type: 'bankruptcy' });
  } else {
    const years = option.years;
    const debt = opts.debt;
    const annual = option.annual;
    wipe(state);
    f.ch13 = { yearsLeft: years, annual, total: annual * years, debt };
    ctx.spend(CH13_FEE, 'Chapter 13 attorney & filing fee', { allowDebt: true });
    ctx.log(`You filed for Chapter 13 bankruptcy: a ${years}-year plan paying $${annual.toLocaleString()}/yr toward $${debt.toLocaleString()} in debt. You keep your home and investments; what's left is discharged when the plan ends.`, '⚖️', 'warn');
    ctx.emit('credit:event', { type: 'chapter13' });
  }
  f.bankruptcies += 1;
  f.lastBankruptcy = { chapter, age };
  ctx.stat('stress', -8);
  ctx.stat('happiness', -6);
  return true;
}

/** Year end: Chapter 13 plan payments (called by Finances before interest). */
export function ch13Tick(ctx) {
  const { state } = ctx;
  const f = state.finances;
  const plan = f.ch13;
  if (!plan) return;
  if (f.cash < -10000) {
    // Missed payments: the trustee moves to dismiss and the debt comes back.
    const remaining = Math.round(plan.debt * (plan.yearsLeft / Math.max(1, plan.yearsLeft + (plan.paidYears ?? 0))));
    f.cash -= remaining;
    f.ch13 = null;
    ctx.log(`Your Chapter 13 plan was dismissed for missed payments. $${remaining.toLocaleString()} in debt is back.`, '⚖️', 'bad');
    return;
  }
  ctx.spend(plan.annual, 'Chapter 13 plan payment', { allowDebt: true });
  plan.yearsLeft -= 1;
  plan.paidYears = (plan.paidYears ?? 0) + 1;
  if (plan.yearsLeft <= 0) {
    f.ch13 = null;
    ctx.log('You completed your Chapter 13 plan. The remaining debt was discharged.', '⚖️', 'good');
    ctx.stat('happiness', 6);
  }
}

/** A debt crisis: offer the chapters you qualify for, or keep struggling. */
export function debtCrisisPrompt(ctx) {
  const { state } = ctx;
  if (state.prompts.some((p) => p.type === 'finances.debtCrisis' || p.type === 'health.bankruptcy')) return;
  const opts = bankruptcyOptions(state);
  if (!opts.ch7.ok && !opts.ch13.ok) return;
  ctx.prompt({
    type: 'finances.debtCrisis',
    icon: '💸',
    title: 'Drowning in Debt',
    text: `You owe $${opts.debt.toLocaleString()} on cards and medical bills, and the interest alone is more than you can pay. A bankruptcy attorney walks you through your options.`,
    options: [
      { id: 'ch7', label: '⚖️ File Chapter 7 (liquidation)', hint: opts.ch7.ok ? `Wipes the debt; non-exempt assets sold${opts.preview.homeLost ? ' — including your home' : ''}` : opts.ch7.reason, disabled: !opts.ch7.ok },
      { id: 'ch13', label: '📆 File Chapter 13 (repayment plan)', hint: opts.ch13.ok ? `${opts.ch13.years} yrs × $${opts.ch13.annual.toLocaleString()}/yr; keep your property` : opts.ch13.reason, disabled: !opts.ch13.ok },
      { id: 'struggle', label: '😰 Keep paying what you can', hint: 'Collectors, 15% interest, ruined credit anyway', tone: 'danger' },
    ],
  });
}
