/**
 * Retirement: one place for every source of retirement income.
 *
 *   • Defined-benefit pensions (FERS, municipal, police & fire, teachers,
 *     union, corporate) with vesting, immediate vs. deferred annuities and COLA
 *   • Defined-contribution accounts (401(k)/403(b)/457/TSP) with employer match
 *   • Social Security from covered earnings, claimable 62–70
 *   • Military retired pay, VA disability and Medal of Honor pensions
 *     (added by the military module over the bus)
 *
 * This module only *reads* the job and service records; it accrues service
 * credit and contributions itself at year end.
 */
import { spousalBenefit } from '../people/People.js';
import { clamp } from '../../core/Random.js';
import { PENSION_PLANS, annuityFor } from './PensionPlans.js';
import { OFFICES } from '../politics/Offices.js';
import { DC_FUNDS, profileReturn, realReturn } from '../investing/Assets.js';

export const SS_WAGE_CAP = 176100;
export const SS_FULL_AGE = 67;
/** Default 401(k) deferral (typical auto-enrollment); players can change it. */
export const DEFAULT_DC_RATE = 0.04;
export const DC_RATES = [0, 0.02, 0.04, 0.06, 0.1, 0.15];
const DC_FEE = 0.005;
const dcRate = (state) => state.retirement.dcRate ?? DEFAULT_DC_RATE;

/* ------------------------------------------------------------------ */
/* Social Security                                                     */
/* ------------------------------------------------------------------ */

/** Primary insurance amount (monthly) from the top 35 years of covered earnings. */
export function primaryInsuranceAmount(earnings) {
  const top = [...earnings].sort((a, b) => b - a).slice(0, 35);
  const aime = top.reduce((s, x) => s + x, 0) / 420;
  const pia = 0.9 * Math.min(aime, 1226) + 0.32 * clamp(aime - 1226, 0, 7391 - 1226) + 0.15 * Math.max(0, aime - 7391);
  return Math.round(pia);
}

export function claimFactor(age) {
  if (age < SS_FULL_AGE) return 1 - (SS_FULL_AGE - age) * 0.0667;
  return 1 + Math.min(age, 70) * 0.08 - SS_FULL_AGE * 0.08;
}

export function socialSecurityEstimate(state, age = state.character.age) {
  return Math.round(primaryInsuranceAmount(state.retirement.ssEarnings) * 12 * claimFactor(age));
}

/* ------------------------------------------------------------------ */
/* Pensions                                                            */
/* ------------------------------------------------------------------ */

function addPension(state, pension) {
  state.retirement.pensions.push({ cola: 0, ...pension });
}

/** Status of a pension plan you have service credit in. */
export function planStatus(state, planId) {
  const plan = state.retirement.plans[planId];
  const def = PENSION_PLANS[planId];
  const age = state.character.age;
  const vested = plan.years >= def.vest;
  return {
    def,
    plan,
    vested,
    eligibleNow: vested && def.eligible(age, plan.years),
    annuity: annuityFor(planId, plan, Math.max(age, def.normalAge)),
    active: state.career.job?.employer.benefits.pension === planId,
  };
}

function startPlanAnnuity(ctx, planId, reason) {
  const { state } = ctx;
  const plan = state.retirement.plans[planId];
  if (!plan || plan.started) return;
  const def = PENSION_PLANS[planId];
  const annual = annuityFor(planId, plan, state.character.age);
  plan.started = true;
  addPension(state, { id: `plan.${planId}`, label: def.name, annual, startAge: state.character.age, source: 'pension', cola: def.cola });
  ctx.log(`${reason} Your ${def.short} pension begins: $${annual.toLocaleString()}/yr (${plan.years} yrs of service credit).`, '🏦', 'finance');
}

/** Can the current job's pension pay out right now (before 50)? */
export function earlyRetirementEligible(state) {
  const planId = state.career.job?.employer.benefits.pension;
  return Boolean(planId && state.retirement.plans[planId] && planStatus(state, planId).eligibleNow);
}

function retireNow(ctx, note = '') {
  const { state } = ctx;
  if (state.retirement.retired) return;
  state.retirement.retired = true;
  if (state.career.job) ctx.emit('career:resign', { reason: 'Retired' });
  for (const planId of Object.keys(state.retirement.plans)) {
    const s = planStatus(state, planId);
    if (s.eligibleNow) startPlanAnnuity(ctx, planId, 'You retired.');
  }
  ctx.log(`${note}You retired from the workforce. 🏖️`, '🏖️', 'milestone');
  ctx.stat('happiness', 10);
  ctx.stat('stress', -20);
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const RetirementEngine = {
  id: 'retirement',
  order: 85,

  init(state) {
    state.retirement ??= { retired: false, dc: 0, pensions: [], plans: {}, ssEarnings: [], socialSecurity: null };
  },

  setup(engine) {
    engine.bus.on('retirement:addPension', ({ ctx, pension }) => addPension(ctx.state, pension));
    // Non-job service credit (elected office) accrues through the bus.
    engine.bus.on('retirement:accrue', ({ ctx, planId, salary, employer }) => {
      const plan = (ctx.state.retirement.plans[planId] ??= { years: 0, salaries: [], employers: [], started: false });
      if (plan.started) return;
      plan.years += 1;
      plan.salaries.push(salary);
      if (!plan.employers.includes(employer)) plan.employers.push(employer);
    });
    engine.bus.on('career:hired', ({ ctx }) => {
      ctx.state.retirement.retired = false;
    });
    // Mandatory retirement (federal law enforcement at 57, Foreign Service at 65).
    engine.bus.on('retirement:mandatory', ({ ctx, age }) => retireNow(ctx, `You reached the mandatory retirement age of ${age}. `));
    engine.bus.on('career:separated', ({ ctx, job, reason }) => {
      // Leaving a job before 59½: roll the 401(k) over, or cash it out (taxes + 10% penalty).
      const { state } = ctx;
      const stint = state.character.age - (job.startAge ?? state.character.age);
      const fromThisJob = Math.min(state.retirement.dc, Math.round(job.salary * (dcRate(state) + Math.min(dcRate(state), job.employer.benefits.match ?? 0)) * Math.max(1, stint) * 1.15));
      if (job.employer.benefits.dcPlan && fromThisJob >= 1000 && state.character.age < 59 && !/Retired|disability/i.test(reason ?? '')) {
        ctx.prompt({
          type: 'retirement.rollover',
          icon: '🏦',
          title: `Your ${job.employer.benefits.dcPlan} from ${job.employer.name}`,
          text: `You have about $${fromThisJob.toLocaleString()} from this job in your retirement account.`,
          options: [
            { id: 'rollover', label: '🔁 Roll it over and keep it invested' },
            { id: 'cashout', label: '💸 Cash it out', hint: 'Taxed as income, plus a 10% penalty', tone: 'danger' },
          ],
          data: { amount: fromThisJob },
        });
      }
      const planId = job.employer.benefits.pension;
      const plan = planId && ctx.state.retirement.plans[planId];
      if (!plan || plan.started) return;
      const def = PENSION_PLANS[planId];
      const age = ctx.state.character.age;
      if (reason === 'Retired' && plan.years >= def.vest && def.eligible(age, plan.years)) {
        startPlanAnnuity(ctx, planId, 'You retired with an immediate annuity.');
      } else if (plan.years >= def.vest) {
        ctx.log(`You're vested in the ${def.short} pension (${plan.years} yrs). A deferred annuity starts at age ${def.normalAge}.`, '🏦', 'finance');
      } else if (plan.years > 0) {
        ctx.log(`You left before vesting in the ${def.short} pension (${plan.years}/${def.vest} yrs). Your contributions were refunded to your 401(k).`, '🏦', 'warn');
        ctx.state.retirement.dc += Math.round(plan.salaries.reduce((s, x) => s + x, 0) * 0.008);
        plan.years = 0;
        plan.salaries = [];
      }
    });
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    const r = state.retirement;
    const age = state.character.age;
    // 401(k)/TSP balances ride the market through the chosen fund.
    r.dc = Math.max(0, Math.round(r.dc * (1 + realReturn(state.economy, profileReturn(state.economy, r.dcFund ?? 'balanced')) - DC_FEE)));

    // COLAs track inflation, capped by each plan's COLA ceiling; Social Security gets full CPI.
    const inflation = Math.max(0, state.economy.inflation);
    for (const p of r.pensions) {
      if (age < p.startAge) continue;
      if (age > p.startAge) p.colaFactor = Math.round((p.colaFactor ?? 1) * (1 + Math.min(inflation, p.cola)) * 10000) / 10000;
      ctx.earn(Math.round(p.annual * (p.colaFactor ?? 1)), p.label);
    }
    if (r.socialSecurity) {
      if (age > r.socialSecurity.claimAge) r.socialSecurity.colaFactor = Math.round((r.socialSecurity.colaFactor ?? 1) * (1 + inflation) * 10000) / 10000;
      ctx.earn(Math.round(r.socialSecurity.annual * (r.socialSecurity.colaFactor ?? 1)), 'Social Security');
    }

    // Deferred annuities start automatically at the plan's normal age.
    for (const [planId, plan] of Object.entries(r.plans)) {
      const def = PENSION_PLANS[planId];
      const officePlan = state.politics.office ? OFFICES[state.politics.office.id].pension : null;
      const activeInPlan = state.career.job?.employer.benefits.pension === planId || officePlan === planId;
      if (!plan.started && !activeInPlan && plan.years >= def.vest && age >= def.normalAge) startPlanAnnuity(ctx, planId, 'You reached the plan\'s normal retirement age.');
    }

    if (!r.socialSecurity && age >= 70 && r.ssEarnings.length) {
      r.socialSecurity = { annual: socialSecurityEstimate(state, 70), claimAge: 70 };
      ctx.log(`Social Security kicked in automatically at 70: $${r.socialSecurity.annual.toLocaleString()}/yr.`, '🇺🇸', 'finance');
    }
    if (r.retired && age >= 60 && r.dc > 0) {
      const withdrawal = Math.round(r.dc * 0.04);
      r.dc -= withdrawal;
      ctx.earn(withdrawal, '401(k)/TSP withdrawal');
    }
  },

  /** After career/military pay is in the ledger: accrue credit and contributions. */
  onYearEnd(ctx) {
    const { state } = ctx;
    const r = state.retirement;
    const job = state.career.job;

    const covered = state.finances.ledger.income.filter((i) => i.wage && i.ssCovered !== false).reduce((s, i) => s + i.amount, 0);
    if (covered > 0) r.ssEarnings.push(Math.min(covered, SS_WAGE_CAP));

    if (job?.paidThisYear) {
      const benefits = job.employer.benefits;
      if (benefits.pension) {
        const plan = (r.plans[benefits.pension] ??= { years: 0, salaries: [], employers: [], started: false });
        plan.years += 1;
        plan.salaries.push(job.salary);
        if (!plan.employers.includes(job.employer.name)) plan.employers.push(job.employer.name);
      }
      if (benefits.match > 0 || benefits.dcPlan) {
        // Employers match what you put in, up to their match rate.
        const employee = Math.round(job.salary * dcRate(state));
        const match = Math.round(job.salary * Math.min(dcRate(state), benefits.match));
        ctx.spend(employee, `${benefits.dcPlan ?? '401(k)'} contribution`, { allowDebt: true });
        ctx.deduct(employee, `${benefits.dcPlan ?? '401(k)'} pre-tax contribution`);
        r.dc += employee + match;
      }
    }
  },

  resolvers: {
    rollover(ctx, data, optionId) {
      const r = ctx.state.retirement;
      if (optionId !== 'cashout') return ctx.log('You rolled your old 401(k) into an IRA.', '🔁');
      const amount = Math.min(r.dc, data.amount);
      r.dc -= amount;
      const penalty = Math.round(amount * 0.1);
      ctx.earn(amount - penalty, '401(k) cash-out');
      ctx.log(`You cashed out $${amount.toLocaleString()} from your 401(k) — $${penalty.toLocaleString()} went to the early-withdrawal penalty, and the rest is taxable.`, '💸', 'warn');
    },
  },

  actions: {
    /** arg: contribution rate as a fraction, e.g. '0.06'. */
    setDcRate(ctx, arg) {
      const rate = Number(arg);
      if (!DC_RATES.includes(rate)) return;
      ctx.state.retirement.dcRate = rate;
      ctx.toast(`401(k) contribution: ${Math.round(rate * 100)}% of pay.`, 'good');
    },
    setDcFund(ctx, fundId) {
      if (!DC_FUNDS[fundId]) return;
      ctx.state.retirement.dcFund = fundId;
      ctx.toast(`401(k)/TSP now in the ${DC_FUNDS[fundId].name}.`, 'good');
    },
    retire(ctx) {
      const { state } = ctx;
      // Under 50 you can only retire into an immediate pension (police & fire "20 and out", FERS-LEO 25 yrs).
      if (state.character.age < 50 && !earlyRetirementEligible(state)) return ctx.toast('Too young to retire (50+, or earlier with a pension you qualify for).', 'warn');
      retireNow(ctx);
    },

    unretire(ctx) {
      ctx.state.retirement.retired = false;
      ctx.toast('Back on the job market.', 'info');
    },

    claimSocialSecurity(ctx) {
      const { state } = ctx;
      const r = state.retirement;
      if (r.socialSecurity) return;
      if (state.character.age < 62) return ctx.toast('Social Security starts at 62.', 'warn');
      if (!r.ssEarnings.length && !spousalBenefit(state) && !r.survivorBenefit) return ctx.toast('No covered earnings on record.', 'warn');
      // Your own benefit, or a spousal / survivor benefit if that's larger.
      const own = socialSecurityEstimate(state);
      const family = Math.max(spousalBenefit(state), r.survivorBenefit ?? 0);
      r.socialSecurity = { annual: Math.max(own, family), claimAge: state.character.age, basis: family > own ? (r.survivorBenefit ? 'survivor' : 'spousal') : 'own' };
      ctx.log(`You claimed Social Security at ${state.character.age}: $${r.socialSecurity.annual.toLocaleString()}/yr.`, '🇺🇸', 'milestone');
    },

    /** Early access to the 401(k): 10% penalty before 60. */
    withdraw(ctx) {
      const r = ctx.state.retirement;
      const amount = Math.min(10000, r.dc);
      if (amount <= 0) return ctx.toast('Your account is empty.', 'warn');
      r.dc -= amount;
      const penalty = ctx.state.character.age < 60 ? Math.round(amount * 0.1) : 0;
      ctx.earn(amount - penalty, '401(k) withdrawal');
      ctx.log(`You withdrew $${amount.toLocaleString()} from your retirement account${penalty ? ` and paid a $${penalty.toLocaleString()} early-withdrawal penalty` : ''}.`, '🏧', penalty ? 'warn' : 'finance');
    },
  },
};

export { PENSION_PLANS };
