/**
 * Gig work: rideshare, delivery, freelancing and odd jobs. Paid as a 1099
 * contractor — no health plan, no 401(k) match, no unemployment — plus
 * self-employment tax, but you pick your hours: a side hustle next to a job
 * or school, or full time.
 *
 * state.gig = { active: { gigId, hours: 'side'|'full', rating, since } | null, lastYear: { gross, expenses, net } | null, history: [] }
 */
import { clamp } from '../../core/Random.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { meetsEducation } from '../../core/State.js';

/**
 * rate      gross pay per hour at a 4.8 rating in a normal economy
 * expenses  share of gross eaten by gas, wear, fees and supplies
 * needs     what it takes to sign up
 * cyclical  how hard a recession cuts demand
 */
export const GIGS = {
  rideshare: { name: 'Rideshare Driver', icon: '🚕', rate: 24, expenses: 0.38, minAge: 21, needs: 'car', cyclical: 0.5, driving: true, desc: 'Drive passengers on your own schedule. Your car does the wearing out.' },
  delivery: { name: 'Food Delivery', icon: '🛵', rate: 19, expenses: 0.3, minAge: 18, needs: 'license', cyclical: 0.2, driving: true, desc: 'Lunch and dinner rushes; tips make or break it.' },
  shopper: { name: 'Grocery Shopper', icon: '🛒', rate: 18, expenses: 0.25, minAge: 18, needs: 'license', cyclical: 0.1, driving: true, desc: 'Pick, pack and deliver other people\'s groceries.' },
  handyman: { name: 'Handyman / Task Apps', icon: '🔧', rate: 32, expenses: 0.15, minAge: 18, needs: null, cyclical: 0.5, desc: 'Furniture, mounting, small repairs.' },
  petCare: { name: 'Pet Sitting & Dog Walking', icon: '🐕', rate: 20, expenses: 0.05, minAge: 16, needs: null, cyclical: 0.3, desc: 'Walks, boarding and drop-ins.' },
  tutoring: { name: 'Online Tutoring', icon: '📚', rate: 30, expenses: 0.1, minAge: 18, needs: 'degree', cyclical: 0.1, desc: 'Test prep and homework help.' },
  freelance: { name: 'Freelancer (design, writing, code)', icon: '💻', rate: 55, expenses: 0.15, minAge: 18, needs: 'degree', cyclical: 0.6, utilization: 0.55, desc: 'Good rates, but you spend unpaid hours finding clients.' },
};

/** Cars the platforms accept (sports cars, trucks and RVs don't qualify for standard rides). */
const RIDESHARE_CARS = ['beater', 'usedSedan', 'sedan', 'ev', 'suv', 'luxury'];

export const HOURS = { side: { label: 'Side hustle', hours: 520, load: 1 }, full: { label: 'Full time', hours: 2000, load: 3 } };
const SE_TAX = 0.153;
const DEACTIVATION_RATING = 4.6;

export const gigState = (state) => state.gig;

export function gigEligibility(state, gigId, hours = 'side') {
  const g = GIGS[gigId];
  if (!g) return { ok: false, reason: 'Unknown gig' };
  if (state.character.age < g.minAge) return { ok: false, reason: `${g.minAge}+` };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (hours === 'full' && state.career.job) return { ok: false, reason: 'You already have a full-time job' };
  if (g.needs === 'car' && !(state.vehicles?.owned ?? []).some((v) => RIDESHARE_CARS.includes(v.typeId) && v.insured)) return { ok: false, reason: 'An insured car (Garage)' };
  if (g.driving && !hasCredential(state, 'driverLicense')) return { ok: false, reason: "A driver's license" };
  if (g.driving && (state.legal.record ?? []).some((r) => /dui/i.test(r.offenseId) && state.character.age - r.age < 7)) return { ok: false, reason: 'Background check: DUI in the last 7 years' };
  if (g.needs === 'degree' && !meetsEducation(state, { level: 'bachelor' })) return { ok: false, reason: "A bachelor's degree (or a portfolio you don't have)" };
  if (state.gig.deactivated?.[gigId] && state.character.age - state.gig.deactivated[gigId] < 3) return { ok: false, reason: 'Deactivated by the platform' };
  return { ok: true };
}

/** A year of gig income: hours × rate × demand × rating, less expenses. */
export function gigYear(state, active, rng) {
  const g = GIGS[active.gigId];
  const demand = state.economy.phase === 'recession' ? 1 - g.cyclical * 0.35 : state.economy.phase === 'boom' ? 1.08 : 1;
  const ratingMult = clamp(1 + (active.rating - 4.8) * 0.5, 0.75, 1.1);
  const hours = HOURS[active.hours].hours * (g.utilization ?? 1);
  const gross = Math.round(hours * g.rate * demand * ratingMult * rng.float(0.85, 1.15));
  const expenses = Math.round(gross * g.expenses);
  return { gross, expenses, net: gross - expenses };
}

export const GigWork = {
  id: 'gig',
  order: 32.5,

  setup(engine) {
    // A full-time job turns full-time gigging into a side hustle.
    engine.bus.on('career:hired', ({ ctx }) => {
      const a = ctx.state.gig?.active;
      if (a?.hours === 'full') a.hours = 'side';
    });
  },

  init(state) {
    state.gig ??= { active: null, lastYear: null, history: [], deactivated: {} };
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const gig = state.gig;
    const a = gig.active;
    if (!a) return;
    if (state.legal.incarceration || !gigEligibility(state, a.gigId, a.hours).ok) {
      ctx.log(`You stopped ${GIGS[a.gigId].name.toLowerCase()} work.`, GIGS[a.gigId].icon);
      gig.history.push({ ...a, endAge: state.character.age });
      gig.active = null;
      return;
    }
    const g = GIGS[a.gigId];
    const year = gigYear(state, a, rng);
    gig.lastYear = year;
    // 1099 income: you pay both halves of Social Security and Medicare.
    ctx.earn(year.net, `${g.name} (1099)`, { wage: true });
    ctx.spend(Math.round(year.net * 0.9235 * SE_TAX), 'Self-employment tax', { allowDebt: true });
    if (g.driving && a.hours === 'full') ctx.stat('health', -1);
    // Ratings drift; a bad stretch can get you deactivated.
    a.rating = Math.round(clamp(a.rating + rng.float(-0.15, 0.12) + (state.stats.looks - 50) / 2000 + (state.stats.stress >= 75 ? -0.08 : 0), 4.2, 5) * 100) / 100;
    if (a.rating < DEACTIVATION_RATING && rng.chance(0.4)) {
      gig.deactivated[a.gigId] = state.character.age;
      gig.history.push({ ...a, endAge: state.character.age, deactivated: true });
      gig.active = null;
      ctx.log(`The ${g.name.toLowerCase()} app deactivated your account (rating ${a.rating.toFixed(2)}). No appeal, no explanation.`, '📵', 'bad');
      ctx.stat('happiness', -5);
      return;
    }
    if (a.hours === 'full' && state.character.age % 3 === 0) ctx.log(`Another year gigging full time: $${year.gross.toLocaleString()} gross, $${year.expenses.toLocaleString()} in costs, no health plan, no retirement match, no paid days off.`, g.icon);
  },

  actions: {
    /** arg: "gigId:side|full" */
    start(ctx, arg) {
      const { state } = ctx;
      const [gigId, hours = 'side'] = String(arg).split(':');
      if (!HOURS[hours]) return;
      const check = gigEligibility(state, gigId, hours);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      if (state.gig.active) state.gig.history.push({ ...state.gig.active, endAge: state.character.age });
      state.gig.active = { gigId, hours, rating: 4.85, since: state.character.age };
      ctx.log(`You signed up as a ${GIGS[gigId].name.toLowerCase()} (${HOURS[hours].label.toLowerCase()}).`, GIGS[gigId].icon, 'good');
    },
    stop(ctx) {
      const a = ctx.state.gig.active;
      if (!a) return;
      ctx.state.gig.history.push({ ...a, endAge: ctx.state.character.age });
      ctx.state.gig.active = null;
      ctx.log(`You logged off ${GIGS[a.gigId].name.toLowerCase()} for good.`, GIGS[a.gigId].icon);
    },
    hours(ctx, hours) {
      const a = ctx.state.gig.active;
      if (!a || !HOURS[hours]) return;
      if (hours === 'full' && ctx.state.career.job) return ctx.toast('Not while you hold a full-time job.', 'warn');
      a.hours = hours;
      ctx.toast(`${HOURS[hours].label}.`, 'info');
    },
  },
};

/** Gig drivers crash more (vehicles reads this). */
export const gigDriving = (state) => Boolean(state.gig?.active && GIGS[state.gig.active.gigId].driving);
