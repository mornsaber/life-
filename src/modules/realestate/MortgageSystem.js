/**
 * Credit & mortgages.
 *
 * Credit score (300–850) is rebuilt every year from payment history and
 * dated derogatory events (late payments, defaults, foreclosures, evictions,
 * bankruptcy) that age off, plus credit-card balances and length of history.
 *
 * Loans: 30-yr fixed, 15-yr fixed, 5/1 ARM, FHA (3.5% down + MIP, 580+
 * score) and VA (0% down for eligible veterans, funding fee, no PMI).
 * Underwriting checks score, down payment and debt-to-income. Payments
 * amortize yearly; two missed years → foreclosure. Refinance and HELOC.
 */
import { spouseIncome } from '../people/People.js';
import { clamp } from '../../core/Random.js';

export const LOAN_TYPES = {
  conv30: { name: '30-yr Fixed', years: 30, rateAdj: 0, minDown: 0.05, minScore: 620, maxDti: 0.43 },
  conv15: { name: '15-yr Fixed', years: 15, rateAdj: -0.006, minDown: 0.05, minScore: 620, maxDti: 0.43 },
  arm: { name: '5/1 ARM', years: 30, rateAdj: -0.0075, minDown: 0.05, minScore: 640, maxDti: 0.43, arm: true },
  fha: { name: 'FHA 30-yr', years: 30, rateAdj: -0.002, minDown: 0.035, minScore: 580, maxDti: 0.5, mip: 0.0055 },
  va: { name: 'VA 30-yr', years: 30, rateAdj: -0.0035, minDown: 0, minScore: 580, maxDti: 0.5, fundingFee: 0.0215, va: true },
};

const EVENT_IMPACT = {
  late: { points: 35, years: 3 },
  default: { points: 80, years: 7 },
  foreclosure: { points: 140, years: 7 },
  eviction: { points: 70, years: 7 },
  bankruptcy: { points: 170, years: 10 },
  chapter13: { points: 130, years: 7 },
};

export const CARD_CAPACITY = 15000;

/* ------------------------------------------------------------------ */
/* Credit                                                              */
/* ------------------------------------------------------------------ */

export function recordCreditEvent(state, type) {
  state.housing.credit.events.push({ type, age: state.character.age });
}

export function computeCreditScore(state) {
  const age = state.character.age;
  const c = state.housing.credit;
  let score = 650 + Math.min(c.onTime * 4, 120) + Math.min(Math.max(0, age - 18), 30);
  for (const e of c.events) {
    const impact = EVENT_IMPACT[e.type];
    const elapsed = age - e.age;
    if (elapsed < impact.years) score -= impact.points * (1 - elapsed / impact.years / 2);
  }
  if (state.finances.cash < 0) score -= Math.min(110, -state.finances.cash / 300);
  if (state.legal.incarceration) score -= 30;
  return Math.round(clamp(score, 300, 850));
}

export function creditBand(score) {
  if (score >= 800) return 'Exceptional';
  if (score >= 740) return 'Very good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

/* ------------------------------------------------------------------ */
/* Underwriting                                                        */
/* ------------------------------------------------------------------ */

export function annualPayment(principal, rate, years) {
  if (principal <= 0) return 0;
  const r = rate / 12;
  const n = years * 12;
  return Math.round((principal * r) / (1 - (1 + r) ** -n) * 12);
}

function scoreSpread(score) {
  if (score >= 760) return 0;
  if (score >= 720) return 0.0025;
  if (score >= 680) return 0.005;
  if (score >= 640) return 0.01;
  if (score >= 620) return 0.015;
  return 0.025;
}

export function vaEligible(state) {
  const years = state.military.history.filter((h) => ['honorable', 'retired', 'medical'].includes(h.discharge)).reduce((s, h) => s + h.yearsOfService, 0) + (state.military.service?.yearsOfService ?? 0);
  return years >= 2;
}

/** Annual qualifying income: last year's gross or current salary. */
/**
 * Income a lender counts: steady pay (salary, pensions, Social Security).
 * One-off windfalls — severance, bonuses, capital gains — don't count; other
 * income without a job (gig work, rents) counts at half.
 */
export function qualifyingIncome(state) {
  const age = state.character.age;
  const salary = state.career.job?.salary ?? 0;
  const pensions = state.retirement.pensions.filter((p) => age >= p.startAge).reduce((s, p) => s + p.annual * (p.colaFactor ?? 1), 0);
  const ss = state.retirement.socialSecurity?.annual ?? 0;
  // Dual-income households qualify on both incomes.
  const steady = salary + pensions + ss + spouseIncome(state);
  if (steady > 0) return Math.round(steady);
  const ly = state.finances.lastYear;
  return Math.round(Math.max(0, (ly?.gross ?? 0) - (ly?.ltcg ?? 0)) * 0.5);
}

export function existingDebtService(state) {
  const mortgages = state.housing.properties.reduce((s, p) => s + (p.mortgage?.payment ?? 0) + (p.heloc ? p.heloc.balance * p.heloc.rate : 0), 0);
  return mortgages + state.finances.loans * 0.1;
}

/**
 * Quote a loan. `inflateIncome` models a fraudulent application.
 * Returns { ok, reason, rate, down, principal, payment, mip, fee, dti }.
 */
export function quote(state, price, typeId, { downPct = null, inflateIncome = false } = {}) {
  const t = LOAN_TYPES[typeId];
  const score = state.housing.credit.score;
  const rate = Math.round((state.housing.rates.base + t.rateAdj + scoreSpread(score)) * 10000) / 10000;
  const pct = Math.max(t.minDown, downPct ?? t.minDown);
  const down = Math.round(price * pct);
  const fee = t.fundingFee ? Math.round((price - down) * t.fundingFee) : 0;
  const principal = price - down + fee;
  const payment = annualPayment(principal, rate, t.years);
  const mip = t.mip ? Math.round(principal * t.mip) : pct < 0.2 && !t.va ? Math.round(principal * 0.005) : 0;
  const income = qualifyingIncome(state) * (inflateIncome ? 1.6 : 1);
  const housingCost = payment + mip + price * 0.012;
  const dti = income > 0 ? (housingCost + existingDebtService(state)) / income : Infinity;
  const closing = Math.round(price * 0.03);
  // Lenders want three months of payments in reserve after closing.
  const reserves = Math.round((payment + mip) / 4);
  const base = { rate, down, principal, payment, mip, fee, dti, closing, reserves, cashNeeded: down + closing };
  if (t.va && !vaEligible(state)) return { ok: false, reason: 'VA loans need 2+ years of honorable service', ...base };
  if (score < t.minScore) return { ok: false, reason: `Needs a ${t.minScore}+ credit score`, ...base };
  if (state.finances.cash < down + closing + reserves) return { ok: false, reason: `Needs $${(down + closing + reserves).toLocaleString()} cash (down payment, closing, reserves)`, ...base };
  if (dti > t.maxDti) return { ok: false, reason: `Debt-to-income ${Math.round(dti * 100)}% (max ${Math.round(t.maxDti * 100)}%)`, dtiFail: true, ...base };
  return { ok: true, ...base };
}

export function originate(property, typeId, q) {
  property.mortgage = {
    type: typeId,
    rate: q.rate,
    termYears: LOAN_TYPES[typeId].years,
    yearsLeft: LOAN_TYPES[typeId].years,
    balance: q.principal,
    original: q.principal,
    payment: q.payment,
    mip: q.mip,
    delinquent: 0,
    armResetIn: LOAN_TYPES[typeId].arm ? 5 : null,
  };
}

/* ------------------------------------------------------------------ */
/* Servicing                                                           */
/* ------------------------------------------------------------------ */

/** Can you cover a bill (cash plus remaining card capacity)? */
export function canCover(state, amount) {
  return state.finances.cash - amount >= -(CARD_CAPACITY + qualifyingIncome(state) * 0.15);
}

export function foreclose(ctx, property) {
  const { state } = ctx;
  const sale = Math.round(property.value * 0.8);
  const owed = (property.mortgage?.balance ?? 0) + (property.heloc?.balance ?? 0);
  const surplus = Math.max(0, sale - owed);
  if (surplus) state.finances.cash += surplus;
  state.housing.properties = state.housing.properties.filter((p) => p !== property);
  recordCreditEvent(state, 'foreclosure');
  ctx.log(`The bank foreclosed on your ${property.typeName} and sold it at auction for $${sale.toLocaleString()}.${surplus ? ` You received the $${surplus.toLocaleString()} surplus.` : ' The deficiency was written off.'}`, '🏚️', 'bad');
  ctx.toast('Foreclosure', 'bad');
  ctx.stat('happiness', -18);
  ctx.stat('stress', 15);
}

/** Yearly mortgage + HELOC servicing for one property. Returns false if foreclosed. */
export function serviceDebt(ctx, property) {
  const { state } = ctx;
  const m = property.mortgage;
  if (property.heloc?.balance > 0) {
    const interest = Math.round(property.heloc.balance * property.heloc.rate);
    if (canCover(state, interest)) ctx.spend(interest, 'HELOC interest', { allowDebt: true });
    else property.heloc.balance += interest;
  }
  if (!m) return true;
  if (m.armResetIn !== null && m.armResetIn !== undefined) {
    m.armResetIn -= 1;
    if (m.armResetIn === 0) {
      const newRate = Math.min(m.rate + 0.02, state.housing.rates.base + 0.0225);
      if (newRate > m.rate) ctx.log(`Your ARM reset from ${(m.rate * 100).toFixed(2)}% to ${(newRate * 100).toFixed(2)}%.`, '📈', 'warn');
      m.rate = newRate;
      m.payment = annualPayment(m.balance, m.rate, m.yearsLeft);
      m.armResetIn = 1;
    }
  }
  const due = m.payment + m.mip;
  if (!canCover(state, due)) {
    m.delinquent += 1;
    recordCreditEvent(state, 'late');
    ctx.log(`You missed your mortgage payments on the ${property.typeName}. The bank sent a notice of default.`, '📬', 'bad');
    if (m.delinquent >= 2) {
      foreclose(ctx, property);
      return false;
    }
    // One year to fix it: sell while there's equity, or ask for a modification.
    const equity = Math.round(property.value * 0.92 - m.balance - (property.heloc?.balance ?? 0));
    ctx.prompt({
      type: 'housing.distress',
      icon: '📬',
      title: 'Notice of Default',
      text: `You're a year behind on the ${property.typeName}. Another missed year and the bank forecloses.${equity > 0 ? `\nSelling now would leave you about $${equity.toLocaleString()} after paying off the loan.` : '\nYou owe more than a sale would bring.'}`,
      options: [
        { id: 'sell', label: '🪧 Sell before the bank forecloses', hint: equity > 0 ? `≈$${equity.toLocaleString()} back` : 'Short sale — the bank may forgive the rest', disabled: false },
        { id: 'modify', label: '🤝 Apply for a loan modification', hint: 'Longer term, lower rate; needs income' },
        { id: 'hold', label: '🤞 Hope next year is better', tone: 'danger' },
      ],
      data: { propertyId: property.id },
    });
    return true;
  }
  ctx.spend(due, `Mortgage — ${property.typeName}`, { allowDebt: true });
  const interest = Math.round(m.balance * m.rate);
  m.balance = Math.max(0, m.balance - Math.max(0, m.payment - interest));
  m.yearsLeft -= 1;
  m.delinquent = 0;
  state.housing.credit.onTime += 1;
  // Conventional PMI drops off at 78% loan-to-value.
  if (m.mip && m.type !== 'fha' && m.balance < property.value * 0.78) {
    m.mip = 0;
    ctx.log('Your PMI dropped off — you hit 22% equity.', '🎉', 'good');
  }
  if (m.balance <= 0 || m.yearsLeft <= 0) {
    property.mortgage = null;
    ctx.log(`You paid off the mortgage on your ${property.typeName}! 🎉`, '🏡', 'milestone');
    ctx.stat('happiness', 8);
  }
  return true;
}

export function refinance(ctx, property) {
  const { state } = ctx;
  const m = property.mortgage;
  if (!m) return ctx.toast('No mortgage to refinance.', 'warn');
  const newRate = Math.round((state.housing.rates.base + scoreSpread(state.housing.credit.score)) * 10000) / 10000;
  if (newRate > m.rate - 0.005) return ctx.toast(`Today's rate (${(newRate * 100).toFixed(2)}%) isn't low enough to beat ${(m.rate * 100).toFixed(2)}%.`, 'warn');
  if (state.housing.credit.score < 620) return ctx.toast('Needs a 620+ credit score.', 'warn');
  const closing = Math.round(m.balance * 0.02);
  m.balance += closing;
  m.rate = newRate;
  m.yearsLeft = 30;
  m.termYears = 30;
  m.type = 'conv30';
  m.armResetIn = null;
  m.payment = annualPayment(m.balance, m.rate, 30);
  ctx.log(`You refinanced into a 30-year fixed at ${(newRate * 100).toFixed(2)}% (closing costs $${closing.toLocaleString()} rolled in). New payment: $${Math.round(m.payment / 12).toLocaleString()}/mo.`, '🏦', 'good');
}

export function helocLimit(property) {
  return Math.max(0, Math.round(property.value * 0.8 - (property.mortgage?.balance ?? 0) - (property.heloc?.balance ?? 0)));
}

export function drawHeloc(ctx, property, amount = 25000) {
  const { state } = ctx;
  if (state.housing.credit.score < 660) return ctx.toast('HELOCs need a 660+ credit score.', 'warn');
  const draw = Math.min(amount, helocLimit(property));
  if (draw < 5000) return ctx.toast('Not enough equity for a HELOC draw.', 'warn');
  property.heloc ??= { balance: 0, rate: state.housing.rates.base + 0.015 };
  property.heloc.balance += draw;
  state.finances.cash += draw;
  ctx.log(`You drew $${draw.toLocaleString()} from a HELOC on your ${property.typeName}.`, '🏦');
}

export function repayHeloc(ctx, property) {
  const h = property.heloc;
  if (!h?.balance) return;
  const pay = Math.min(h.balance, Math.max(0, ctx.state.finances.cash));
  if (pay <= 0) return ctx.toast('No cash to pay it down.', 'warn');
  ctx.spend(pay, 'HELOC paydown');
  h.balance -= pay;
  if (h.balance <= 0) property.heloc = null;
  ctx.log(`You paid down $${pay.toLocaleString()} of your HELOC.`, '🏦');
}

/** Loan modification: lenders stretch the term and trim the rate when you have income to pay something. */
export function modifyLoan(ctx, property) {
  const { state, rng } = ctx;
  const m = property.mortgage;
  if (!m) return false;
  const income = qualifyingIncome(state);
  const newRate = Math.max(0.02, m.rate - 0.01);
  const newPayment = annualPayment(m.balance, newRate, 40);
  if (income <= 0 || newPayment > income * 0.45 || !rng.chance(0.7)) {
    ctx.log(`The lender denied your loan modification on the ${property.typeName}.`, '🏦', 'bad');
    return false;
  }
  Object.assign(m, { rate: newRate, payment: newPayment, yearsLeft: 40, termYears: 40, armResetIn: null, delinquent: 0 });
  ctx.log(`The lender modified your loan: 40 years at ${(newRate * 100).toFixed(2)}%, $${Math.round(newPayment / 12).toLocaleString()}/mo.`, '🤝', 'good');
  return true;
}
