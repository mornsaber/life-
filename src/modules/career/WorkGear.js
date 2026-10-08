/**
 * Equipment you buy for your own job — the way plenty of working people
 * really do it:
 *
 *   Owner-operator   A truck driver buys a truck and leases onto a carrier:
 *                    paid a share of the freight instead of a wage, minus
 *                    fuel, maintenance, insurance and the carrier's cut.
 *                    Good years beat a company paycheck; bad ones don't.
 *   Booth rental     A stylist rents a chair and keeps the service revenue.
 *   Tools            Mechanics buy their own tool sets (on the tool truck's
 *                    payment plan); tradespeople their own tools and a van
 *                    for side jobs; musicians instruments; creators cameras.
 *
 * Gear makes you better at the job (performance), earns money on the side
 * or changes how you're paid, wears out, and can be sold. Big purchases can
 * be financed. Gear for a job you no longer do sits idle until you sell it.
 *
 * state.gear = { owned: [{ id, itemId, age, used, value }], loan: { balance, rate, annual } | null, lastYear: { [gearId]: net } }
 */
import { clamp } from '../../core/Random.js';
import { yearsInProfession } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { credentialName } from '../credentials/CredentialRegistry.js';

export const GEAR_LOAN = { rate: 0.095, years: 5, down: 0.1 };
const PHASE = { expansion: 1.04, peak: 1.08, recession: 0.82, recovery: 0.95 };
const TRADES = ['trades', 'plumbing', 'hvac', 'welding', 'carpentry', 'ironworking', 'lineworker', 'renewableEnergy'];

/**
 * mode: how it pays — 'perf' (better at the job), 'side' (extra income),
 * 'ownerOp' / 'booth' (replaces your wage with what you net).
 */
export const GEAR = {
  ownTruck: {
    name: 'Your own truck (owner-operator)', icon: '🚛', professions: ['trucking'], mode: 'ownerOp', cost: 165000, usedCost: 70000, life: 10,
    needs: { credentials: ['cdlA'], years: 2 }, notLevels: ['trainee', 'dispatcher', 'fleet', 'terminal', 'vpOps'],
    desc: 'Lease onto a carrier: you get ~70% of the freight revenue and pay fuel, maintenance, insurance and the truck payment.',
  },
  boothRental: {
    name: 'Rent a booth', icon: '💇', professions: ['cosmetology'], mode: 'booth', cost: 2500, life: 99, rent: 15000,
    needs: { years: 2 }, desc: 'Pay the salon about $1,250 a month for a chair and keep what your clients pay you.',
  },
  mechanicTools: {
    name: 'Professional tool set', icon: '🧰', professions: ['automotive', 'transitMaintenance'], mode: 'perf', cost: 28000, usedCost: 9000, life: 15, perf: 6, raise: 0.1,
    desc: 'Flat-rate technicians with better tools beat book time: more billed hours, more pay.',
  },
  tradeTools: {
    name: 'Your own professional tools', icon: '🛠️', professions: TRADES, mode: 'perf', cost: 7000, usedCost: 2500, life: 10, perf: 4,
    desc: 'Your own cordless kit, meters and specialty tools — faster, cleaner work.',
  },
  workVan: {
    name: 'A work van for side jobs', icon: '🚐', professions: [...TRADES, 'automotive'], mode: 'side', cost: 48000, usedCost: 18000, life: 10, side: [10000, 26000],
    needs: { years: 3 }, desc: 'Weekend and evening jobs for neighbors and referrals. Longer weeks.',
  },
  chefKnives: {
    name: 'Chef\'s knives and kit', icon: '🔪', professions: ['culinary'], mode: 'perf', cost: 1800, life: 20, perf: 3,
    desc: 'A real knife roll. Sharper work, and a chef notices.',
  },
  catering: {
    name: 'Catering equipment for private gigs', icon: '🥘', professions: ['culinary'], mode: 'side', cost: 12000, usedCost: 5000, life: 10, side: [6000, 18000],
    needs: { years: 3 }, desc: 'Chafing dishes, a trailer and a commercial-kitchen rental for weekend events.',
  },
  instrument: {
    name: 'A professional instrument', icon: '🎸', professions: ['music'], mode: 'perf', cost: 9000, usedCost: 4000, life: 30, perf: 5,
    desc: 'The sound you\'ve been chasing. Directors hear the difference.',
  },
  homeStudio: {
    name: 'A home recording studio', icon: '🎙️', professions: ['music', 'contentCreator', 'acting'], mode: 'side', cost: 18000, usedCost: 8000, life: 8, side: [5000, 22000],
    desc: 'Session work, voice-overs and mixing for other artists.',
  },
  cameraGear: {
    name: 'Cameras, lenses and lighting', icon: '📷', professions: ['contentCreator', 'journalism', 'design', 'marketing'], mode: 'perf', cost: 7500, usedCost: 3500, life: 6, perf: 5, raise: 0.05,
    desc: 'Better footage, better work.',
  },
  workstation: {
    name: 'A high-end workstation', icon: '🖥️', professions: ['tech', 'dataScience', 'gameDevelopment', 'design', 'architecture', 'engineering', 'cybersecurity'], mode: 'perf', cost: 5000, life: 5, perf: 3,
    desc: 'Builds compile faster; renders finish before lunch.',
  },
  tractor: {
    name: 'A tractor and implements for custom work', icon: '🚜', professions: ['agriculture'], mode: 'side', cost: 140000, usedCost: 55000, life: 15, side: [18000, 45000],
    needs: { years: 3 }, desc: 'Plow, plant and bale for neighbors at custom-hire rates.',
  },
  surveillanceKit: {
    name: 'Surveillance kit', icon: '🕵️', professions: ['privateInvestigator'], mode: 'perf', cost: 6000, life: 6, perf: 5, raise: 0.08,
    desc: 'Long lenses, a GPS-ready vehicle and recording gear: more billable cases.',
  },
  dutyGear: {
    name: 'Your own duty gear', icon: '🦺', professions: ['privateSecurity', 'privatePolice', 'privateMilitary', 'bailBonds'], mode: 'perf', cost: 2500, life: 8, perf: 3,
    desc: 'Better armor, radio and boots than the company issues.',
  },
  fitnessStudio: {
    name: 'A garage gym for private clients', icon: '🏋️', professions: ['fitness', 'athletics'], mode: 'side', cost: 15000, usedCost: 6000, life: 10, side: [6000, 20000],
    desc: 'Train private clients before and after your shifts.',
  },
  pilotHeadset: {
    name: 'Headset, iPad and charts', icon: '🎧', professions: ['aviation', 'charterAviation'], mode: 'perf', cost: 2200, life: 8, perf: 2,
    desc: 'Every pilot buys their own.',
  },
  boatShare: {
    name: 'A share in a fishing boat', icon: '🎣', professions: ['fishing'], mode: 'side', cost: 90000, life: 20, side: [8000, 40000],
    needs: { years: 3 }, desc: 'Own a piece of the boat: a share of every season\'s catch on top of your crew share.',
  },
};

const g = (state) => state.gear;
export const gearOf = (state, itemId) => g(state)?.owned.filter((x) => x.itemId === itemId) ?? [];
export const gearFor = (job) => Object.entries(GEAR).filter(([, item]) => job && item.professions.includes(job.professionId));
export const activeFor = (item, job) => Boolean(job) && item.professions.includes(job.professionId) && !(item.notLevels ?? []).includes(job.levelId);

export function buyEligibility(state, itemId, used = false) {
  const item = GEAR[itemId];
  const job = state.career.job;
  if (!item) return { ok: false, reason: 'Unknown item' };
  if (!activeFor(item, job)) return { ok: false, reason: 'Not for your current job' };
  if (gearOf(state, itemId).length) return { ok: false, reason: 'You already have one' };
  if (used && !item.usedCost) return { ok: false, reason: 'Not sold used' };
  for (const c of item.needs?.credentials ?? []) if (!hasCredential(state, c)) return { ok: false, reason: `Needs ${credentialName(c)}` };
  if (item.needs?.years && yearsInProfession(state, item.professions) < item.needs.years) return { ok: false, reason: `Needs ${item.needs.years} years in the trade` };
  return { ok: true };
}

const annualPayment = (p, r, y) => Math.round((p * r) / (1 - (1 + r) ** -y));

/** One year of an owner-operator's truck: gross, costs, net. */
export function ownerOpYear(state, gearItem, rng, job) {
  const phase = PHASE[state.economy?.phase] ?? 1;
  const perf = job?.performance ?? 60;
  const gross = Math.round(rng.float(190000, 245000) * phase * (0.85 + perf / 400));
  const fuel = Math.round(gross * 0.3);
  const maint = Math.round(12000 * (1 + Math.max(0, gearItem.age - 4) * 0.25) * (gearItem.used ? 1.3 : 1));
  const insurance = 14000;
  const carrier = Math.round(gross * 0.12); // the carrier's lease fee and dispatch
  const net = gross - fuel - maint - insurance - carrier;
  return { gross, fuel, maint, insurance, carrier, net };
}

/** A year in a rented booth. */
export function boothYear(state, item, rng, job) {
  const perf = job?.performance ?? 60;
  const gross = Math.round(rng.float(60000, 95000) * (0.7 + perf / 200) * (PHASE[state.economy?.phase] ?? 1));
  const supplies = Math.round(gross * 0.1);
  return { gross, rent: item.rent, supplies, net: gross - item.rent - supplies };
}

export const WorkGearModule = {
  id: 'gear',
  order: 30.9,
  init(state) {
    state.gear ??= { owned: [], loan: null, lastYear: {} };
  },
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const gs = g(state);
    if (!gs.owned.length && !gs.loan) return;
    const job = state.career.job;
    gs.lastYear = {};
    for (const x of gs.owned) {
      const item = GEAR[x.itemId];
      x.age += 1;
      x.value = Math.round(x.value * 0.85);
      const worn = x.age > item.life;
      const working = activeFor(item, job) && job.paidThisYear && !state.legal.incarceration;
      if (!working) continue;
      if (item.mode === 'perf') {
        if (job.performance < 92) job.performance = Math.min(100, job.performance + Math.round((item.perf ?? 2) / (worn ? 2 : 1) / 2));
        if (item.raise) {
          const extra = Math.round(job.salary * item.raise * (worn ? 0.5 : 1));
          ctx.earn(extra, `${item.name}: more billable work`, { wage: true });
          gs.lastYear[x.id] = extra;
        }
      } else if (item.mode === 'side') {
        const [lo, hi] = item.side;
        const amount = Math.round(rng.int(lo, hi) * (worn ? 0.6 : 1) * (PHASE[state.economy?.phase] ?? 1));
        ctx.earn(amount, `Side work (${item.name.toLowerCase()})`, { wage: true });
        ctx.stat('stress', 2);
        gs.lastYear[x.id] = amount;
      } else if (item.mode === 'ownerOp' || item.mode === 'booth') {
        // You're paid what you net instead of a wage: settle the difference.
        const y = item.mode === 'ownerOp' ? ownerOpYear(state, x, rng, job) : boothYear(state, item, rng, job);
        const diff = y.net - job.salary;
        if (diff >= 0) ctx.earn(diff, item.mode === 'ownerOp' ? 'Owner-operator settlements' : 'Booth rental earnings', { wage: true });
        else ctx.spend(-diff, item.mode === 'ownerOp' ? 'Owner-operator shortfall' : 'Booth rent shortfall', { allowDebt: true });
        gs.lastYear[x.id] = y.net;
        ctx.log(item.mode === 'ownerOp'
          ? `Owner-operator year: $${y.gross.toLocaleString()} in freight, $${(y.fuel + y.maint + y.insurance + y.carrier).toLocaleString()} in fuel, upkeep, insurance and the carrier's cut — you netted $${y.net.toLocaleString()} (a company driver earns about $${job.salary.toLocaleString()}).`
          : `Booth year: $${y.gross.toLocaleString()} from your clients, $${(y.rent + y.supplies).toLocaleString()} in rent and supplies — you kept $${y.net.toLocaleString()}.`, item.icon, diff >= 0 ? 'good' : 'warn');
        if (item.mode === 'ownerOp' && rng.chance(clamp(0.05 + Math.max(0, x.age - 6) * 0.05, 0, 0.5))) {
          const repair = rng.int(6000, 25000);
          ctx.spend(repair, 'Truck repair', { allowDebt: true });
          ctx.log(`Your truck broke down on the road: $${repair.toLocaleString()} and a week without loads.`, '🔧', 'bad');
        }
      }
      if (worn && x.age === item.life + 1) ctx.log(`Your ${item.name.toLowerCase()} is worn out — it does less for you now. Time to replace it?`, item.icon, 'warn');
    }
    // The loan payment.
    if (gs.loan) {
      const pay = Math.min(gs.loan.annual, Math.round(gs.loan.balance * (1 + gs.loan.rate)));
      ctx.spend(pay, 'Equipment loan payment', { allowDebt: true });
      gs.loan.balance = Math.max(0, Math.round(gs.loan.balance * (1 + gs.loan.rate)) - pay);
      if (gs.loan.balance <= 0) gs.loan = null;
    }
  },
  actions: {
    /** arg: 'itemId[:used][:loan]' */
    buy(ctx, arg) {
      const { state, rng } = ctx;
      const [itemId, ...flags] = String(arg).split(':');
      const used = flags.includes('used');
      const loan = flags.includes('loan');
      const ok = buyEligibility(state, itemId, used);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      const item = GEAR[itemId];
      const price = used ? item.usedCost : item.cost;
      if (loan) {
        if (price < 10000) return ctx.toast('Too small to finance', 'warn');
        if ((state.housing?.credit?.score ?? 650) < 600) return ctx.toast('Lenders want a 600+ credit score', 'warn');
        const down = Math.round(price * GEAR_LOAN.down);
        if (state.finances.cash < down) return ctx.toast(`Needs $${down.toLocaleString()} down`, 'warn');
        ctx.spend(down, `${item.name} (down payment)`);
        const balance = (g(state).loan?.balance ?? 0) + price - down;
        g(state).loan = { balance, rate: GEAR_LOAN.rate, annual: annualPayment(balance, GEAR_LOAN.rate, GEAR_LOAN.years) };
      } else {
        if (state.finances.cash < price) return ctx.toast(`Costs $${price.toLocaleString()}${price >= 10000 ? ' — or finance it' : ''}`, 'warn');
        ctx.spend(price, item.name);
      }
      g(state).owned.push({ id: rng.id('gear_'), itemId, age: used ? rng.int(3, Math.max(4, Math.floor(item.life * 0.5))) : 0, used, value: Math.round(price * 0.85) });
      const job = state.career.job;
      if (item.mode === 'perf') job.performance = Math.min(100, job.performance + (item.perf ?? 2));
      ctx.log(`You bought ${used ? 'a used ' : ''}${item.name.toLowerCase().replace(/^your own |^a |^an /, '')} for $${price.toLocaleString()}${loan ? ' on an equipment loan' : ''}. ${item.desc}`, item.icon, 'good');
    },
    sell(ctx, id) {
      const { state } = ctx;
      const x = g(state).owned.find((y) => y.id === id);
      if (!x) return;
      g(state).owned = g(state).owned.filter((y) => y !== x);
      ctx.earn(x.value, `Sold ${GEAR[x.itemId].name.toLowerCase()}`);
      if (g(state).loan && !g(state).owned.length) {
        const payoff = Math.min(g(state).loan.balance, x.value);
        ctx.spend(payoff, 'Equipment loan payoff');
        g(state).loan.balance -= payoff;
        if (g(state).loan.balance <= 0) g(state).loan = null;
      }
      ctx.log(`You sold your ${GEAR[x.itemId].name.toLowerCase().replace(/^your own |^a |^an /, '')} for $${x.value.toLocaleString()}.`, GEAR[x.itemId].icon);
    },
  },
};
