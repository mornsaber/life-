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
import { clamp } from '../../core/Random.js';
import { PENSION_PLANS, annuityFor } from './PensionPlans.js';
import { OFFICES } from '../politics/Offices.js';

export const SS_WAGE_CAP = 176100;
export const SS_FULL_AGE = 67;
const DC_GROWTH = 0.06;
const EMPLOYEE_DC_RATE = 0.06;

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
    engine.bus.on('career:separated', ({ ctx, job, reason }) => {
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
    r.dc = Math.round(r.dc * (1 + DC_GROWTH));

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
        const employee = Math.round(job.salary * EMPLOYEE_DC_RATE);
        const match = Math.round(job.salary * benefits.match);
        ctx.spend(employee, `${benefits.dcPlan ?? '401(k)'} contribution`, { allowDebt: true });
        ctx.deduct(employee, `${benefits.dcPlan ?? '401(k)'} pre-tax contribution`);
        r.dc += employee + match;
      }
    }
  },

  actions: {
    retire(ctx) {
      const { state } = ctx;
      if (state.character.age < 50) return ctx.toast('Too young to retire (50+).', 'warn');
      if (state.retirement.retired) return;
      state.retirement.retired = true;
      if (state.career.job) ctx.emit('career:resign', { reason: 'Retired' });
      for (const planId of Object.keys(state.retirement.plans)) {
        const s = planStatus(state, planId);
        if (s.eligibleNow) startPlanAnnuity(ctx, planId, 'You retired.');
      }
      ctx.log('You retired from the workforce. 🏖️', '🏖️', 'milestone');
      ctx.stat('happiness', 10);
      ctx.stat('stress', -20);
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
      if (!r.ssEarnings.length) return ctx.toast('No covered earnings on record.', 'warn');
      r.socialSecurity = { annual: socialSecurityEstimate(state), claimAge: state.character.age };
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
