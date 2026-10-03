/**
 * Cars, bikes, boats and planes: buy, finance or lease; insurance priced on
 * your driving record; accidents, depreciation and repossession.
 *
 * state.vehicles = {
 *   owned: [{ id, typeId, value, age, insured, loan?: { balance, rate, payment, yearsLeft }, lease?: { payment, yearsLeft, residual } }]
 *   record: { points, accidents: [age], claims: [age] }
 *   repos: [age]
 * }
 *
 * Car costs (payments, insurance, fuel and upkeep) are fixed obligations:
 * lifestyle spending shrinks to make room, as it does for rent.
 */
import { canAfford } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { hasCredential } from '../credentials/LicensingEngine.js';

/**
 * price       sticker price (new)
 * depreciation yearly loss of value (first year doubles for new vehicles)
 * insurance   base yearly premium for a clean adult driver
 * upkeep      fuel, maintenance, registration, storage/hangar
 * license     credential needed to operate it
 * lease       can be leased (cars and bikes)
 * fun         yearly happiness
 * risk        accident odds multiplier
 */
export const VEHICLE_TYPES = {
  beater: { name: 'Used Beater', icon: '🚗', category: 'car', price: 5000, depreciation: 0.12, insurance: 900, upkeep: 2600, license: 'driverLicense', used: true, risk: 1.1 },
  usedSedan: { name: 'Used Sedan', icon: '🚗', category: 'car', price: 18000, depreciation: 0.12, insurance: 1500, upkeep: 2400, license: 'driverLicense', used: true },
  sedan: { name: 'New Sedan', icon: '🚙', category: 'car', price: 30000, depreciation: 0.15, insurance: 1900, upkeep: 2200, license: 'driverLicense', lease: true },
  ev: { name: 'Electric Car', icon: '🔋', category: 'car', price: 45000, depreciation: 0.17, insurance: 2400, upkeep: 1200, license: 'driverLicense', lease: true },
  suv: { name: 'SUV', icon: '🚙', category: 'car', price: 48000, depreciation: 0.15, insurance: 2200, upkeep: 3000, license: 'driverLicense', lease: true },
  pickup: { name: 'Pickup Truck', icon: '🛻', category: 'car', price: 55000, depreciation: 0.12, insurance: 2100, upkeep: 3400, license: 'driverLicense', lease: true },
  luxury: { name: 'Luxury Sedan', icon: '🚘', category: 'car', price: 90000, depreciation: 0.2, insurance: 3600, upkeep: 3500, license: 'driverLicense', lease: true, fun: 2 },
  sports: { name: 'Sports Car', icon: '🏎️', category: 'car', price: 130000, depreciation: 0.15, insurance: 5500, upkeep: 4500, license: 'driverLicense', lease: true, fun: 4, risk: 2 },
  motorcycle: { name: 'Motorcycle', icon: '🏍️', category: 'bike', price: 14000, depreciation: 0.12, insurance: 800, upkeep: 900, license: 'motorcycle', fun: 3, risk: 1.8, deadly: 0.01 },
  rv: { name: 'RV', icon: '🚐', category: 'fun', price: 140000, depreciation: 0.12, insurance: 2000, upkeep: 6000, license: 'driverLicense', fun: 3, risk: 0.5 },
  jetSki: { name: 'Jet Ski', icon: '🌊', category: 'boat', price: 15000, depreciation: 0.12, insurance: 400, upkeep: 1200, fun: 3, risk: 0.6 },
  boat: { name: 'Cabin Cruiser', icon: '🚤', category: 'boat', price: 90000, depreciation: 0.09, insurance: 1800, upkeep: 9000, fun: 4, risk: 0.3 },
  yacht: { name: 'Yacht', icon: '🛥️', category: 'boat', price: 1500000, depreciation: 0.08, insurance: 25000, upkeep: 150000, fun: 7, risk: 0.2 },
  plane: { name: 'Single-Engine Plane', icon: '🛩️', category: 'air', price: 280000, depreciation: 0.04, insurance: 4000, upkeep: 25000, license: 'privatePilot', fun: 5, risk: 0.3, deadly: 0.15 },
  jet: { name: 'Private Jet', icon: '🛫', category: 'air', price: 9000000, depreciation: 0.07, insurance: 60000, upkeep: 900000, fun: 9, risk: 0.1, deadly: 0.1, crew: true },
};

export const CATEGORIES = { car: 'Cars & Trucks', bike: 'Motorcycles', fun: 'RVs', boat: 'Boats', air: 'Aircraft' };

const LOAN_YEARS = 5;
const LEASE_YEARS = 3;
const MAX_VEHICLES = 6;
const DEDUCTIBLE = 1000;

export const vehiclesOf = (state) => state.vehicles?.owned ?? [];
export const typeOf = (v) => VEHICLE_TYPES[v.typeId];
export { vehicleEquity } from '../../core/State.js';
const creditScore = (state) => state.housing?.credit?.score ?? 650;

/** Auto-loan APR by credit tier (Experian 2024 averages, rounded). */
export function autoRate(state, used) {
  const s = creditScore(state);
  const base = s >= 780 ? 0.055 : s >= 660 ? 0.07 : s >= 600 ? 0.1 : s >= 500 ? 0.14 : 0.19;
  return base + (used ? 0.02 : 0);
}

export function loanPayment(principal, rate, years) {
  return Math.round(principal * rate / (1 - (1 + rate) ** -years));
}

/** Yearly lease payment: the depreciation you use up plus a money factor. */
export function leasePayment(state, type) {
  const residual = Math.round(type.price * (1 - type.depreciation) ** LEASE_YEARS);
  return { payment: Math.round((type.price - residual) / LEASE_YEARS + (type.price + residual) * autoRate(state, false) / 2), residual };
}

/** Driving-record multiplier on insurance: points, recent accidents and claims, DUIs, youth. */
export function riskMultiplier(state) {
  const r = state.vehicles.record;
  const age = state.character.age;
  const recent = (list) => list.filter((a) => age - a < 5).length;
  const duis = state.legal.record.filter((x) => /dui/i.test(x.offenseId) && age - x.age < 5).length;
  return clamp((age < 25 ? 1.6 : age >= 75 ? 1.25 : 1) * (1 + r.points * 0.08) * (1 + recent(r.accidents) * 0.35) * (1 + duis * 0.9), 0.8, 5);
}

export const premiumFor = (state, v) => Math.round(typeOf(v).insurance * (typeOf(v).category === 'car' || typeOf(v).category === 'bike' ? riskMultiplier(state) : 1));

/** Can you buy this, and how? */
export function purchaseCheck(state, typeId, how) {
  const t = VEHICLE_TYPES[typeId];
  if (!t) return { ok: false, reason: 'Unknown vehicle' };
  if (state.character.age < 16) return { ok: false, reason: 'You must be 16+' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (vehiclesOf(state).length >= MAX_VEHICLES) return { ok: false, reason: 'Your garage is full' };
  if (how === 'lease' && !t.lease) return { ok: false, reason: 'Not available to lease' };
  if (how !== 'cash') {
    if (state.character.age < 18) return { ok: false, reason: 'Loans and leases need an adult signer' };
    const min = how === 'lease' ? 620 : 500;
    if (creditScore(state) < min) return { ok: false, reason: `Credit score ${min}+ required` };
    // Lenders cap payments around 15% of income.
    const income = Math.max(state.career.job?.salary ?? 0, state.finances.lastYear?.gross ?? 0);
    const pay = how === 'lease' ? leasePayment(state, t).payment : loanPayment(t.price * 0.9, autoRate(state, t.used), LOAN_YEARS);
    if (pay > income * 0.15) return { ok: false, reason: `Payment ${money(pay)}/yr is too much for your income` };
  }
  const due = how === 'cash' ? t.price : how === 'loan' ? Math.round(t.price * 0.1) : Math.round(leasePayment(state, t).payment * 0.25);
  if (!canAfford(state, due)) return { ok: false, reason: `You need ${money(due)} up front` };
  return { ok: true, due };
}

const money = (n) => `$${Math.round(n).toLocaleString()}`;

/* ------------------------------------------------------------------ */
/* Yearly                                                              */
/* ------------------------------------------------------------------ */

function payTick(ctx) {
  const { state } = ctx;
  for (const v of [...vehiclesOf(state)]) {
    const t = typeOf(v);
    // Depreciation (the first year off the lot hurts most).
    v.value = Math.max(Math.round(t.price * 0.05), Math.round(v.value * (1 - t.depreciation * (v.age === 0 && !t.used ? 1.6 : 1))));
    v.age += 1;
    ctx.spend(t.upkeep, `Vehicle upkeep — ${t.name}`, { allowDebt: true });
    if (v.insured) ctx.spend(premiumFor(state, v), `Vehicle insurance — ${t.name}`, { allowDebt: true });
    if (t.fun) ctx.stat('happiness', t.fun / (1 + vehiclesOf(state).filter((x) => typeOf(x).fun).length * 0.5));
    if (v.loan) {
      ctx.spend(v.loan.payment, `Vehicle loan — ${t.name}`, { allowDebt: true });
      const interest = Math.round(v.loan.balance * v.loan.rate);
      v.loan.balance = Math.max(0, v.loan.balance + interest - v.loan.payment);
      v.loan.yearsLeft -= 1;
      if (v.loan.yearsLeft <= 0 || v.loan.balance === 0) {
        delete v.loan;
        ctx.log(`You paid off your ${t.name}. 🎉`, t.icon, 'good');
      }
    }
    if (v.lease) {
      ctx.spend(v.lease.payment, `Vehicle lease — ${t.name}`, { allowDebt: true });
      v.lease.yearsLeft -= 1;
      if (v.lease.yearsLeft <= 0 && !ctx.state.prompts.some((p) => p.type === 'vehicles.leaseEnd' && p.data.id === v.id)) {
        ctx.prompt({
          type: 'vehicles.leaseEnd', icon: t.icon, title: 'Your Lease Is Up',
          text: `Your ${t.name} lease ended. You can turn it in or buy it for the residual (${money(v.lease.residual)}).`,
          options: [{ id: 'return', label: '🔑 Turn it in' }, { id: 'buy', label: `💵 Buy it out (${money(v.lease.residual)})`, hint: 'Cash or card' }],
          data: { id: v.id },
        });
      }
    }
  }
}

/** Behind on everything: lenders repossess financed vehicles. */
function repoTick(ctx) {
  const { state, rng } = ctx;
  const deep = state.finances.cash < -Math.max(15000, (state.finances.lastYear?.gross ?? 0) * 0.6);
  if (!deep) return;
  for (const v of vehiclesOf(state).filter((x) => x.loan || x.lease)) {
    if (!rng.chance(0.45)) continue;
    const t = typeOf(v);
    const auction = Math.round(v.value * 0.7);
    // Deficiency: what you still owe after the auction (leases: the remaining payments).
    const owed = v.loan ? v.loan.balance : v.lease.payment * v.lease.yearsLeft;
    const deficiency = Math.max(0, owed - (v.loan ? auction : 0));
    removeVehicle(state, v);
    if (deficiency) ctx.spend(deficiency, 'Repossession deficiency', { allowDebt: true });
    state.vehicles.repos.push(state.character.age);
    ctx.emit('credit:event', { type: 'default' });
    ctx.stat('happiness', -6);
    ctx.log(`The lender repossessed your ${t.name} from the driveway at 3 a.m.${deficiency ? ` You still owe ${money(deficiency)}.` : ''}`, '🪝', 'bad');
  }
}

/** Accidents: odds rise with youth, points, risky vehicles and DUIs. */
function accidentTick(ctx) {
  const { state, rng } = ctx;
  const age = state.character.age;
  const r = state.vehicles.record;
  r.points = Math.max(0, r.points - 1);
  for (const v of vehiclesOf(state)) {
    const t = typeOf(v);
    const drives = t.category === 'car' || t.category === 'bike';
    const base = drives ? 0.035 : 0.01;
    const odds = base * (t.risk ?? 1) * (age < 25 ? 1.8 : age >= 80 ? 1.6 : 1) * (1 + r.points * 0.05) * (state.stats.stress >= 75 ? 1.3 : 1);
    if (!rng.chance(odds)) continue;
    const atFault = rng.chance(age < 25 ? 0.65 : 0.5);
    const severe = rng.chance(0.15);
    const damage = severe ? v.value : Math.round(v.value * rng.float(0.1, 0.4));
    let text = `${t.icon} You ${t.category === 'boat' ? 'ran your boat aground' : t.category === 'air' ? 'had a hard landing' : `were in a ${severe ? 'serious ' : ''}crash in your ${t.name}`}${atFault ? '' : ' (not your fault)'}.`;
    if (atFault) {
      r.accidents.push(age);
      if (drives) r.points += 3;
    }
    if (v.insured || !atFault) {
      if (atFault) ctx.spend(Math.min(DEDUCTIBLE, damage), 'Insurance deductible', { allowDebt: true });
      r.claims.push(age);
      text += severe ? ' Insurance totaled it and paid out its value.' : ' Insurance covered the repairs.';
      if (severe) {
        const payout = Math.max(0, v.value - (v.loan?.balance ?? 0));
        removeVehicle(state, v);
        if (payout) state.finances.cash += payout;
      }
    } else {
      // Uninsured and at fault: repairs, the other driver's damages, and a suspended license.
      const liability = drives ? rng.int(8000, severe ? 90000 : 25000) : 0;
      ctx.spend(Math.min(damage, v.value) + liability, 'Uninsured accident', { allowDebt: true });
      text += ` No insurance: you owe ${money(damage + liability)}${liability ? ' including the other driver\'s damages' : ''}.`;
      if (drives) ctx.emit('credential:suspend', { ids: ['driverLicense', 'motorcycle'].filter((id) => state.credentials.held[id]), years: 1, reason: 'uninsured at-fault accident' });
      if (severe) removeVehicle(state, v);
    }
    if (severe && rng.chance(0.6)) ctx.emit('health:injury', { conditionId: rng.pick(['backInjury', 'tbi']), severity: rng.int(20, 70) });
    ctx.stat('stress', 8);
    ctx.log(text, '💥', 'bad');
    if (severe && t.deadly && rng.chance(t.deadly * 3)) return ctx.die(t.category === 'air' ? 'Plane crash' : 'Motorcycle crash');
    return; // one wreck a year is plenty
  }
}

function removeVehicle(state, v) {
  state.vehicles.owned = state.vehicles.owned.filter((x) => x.id !== v.id);
}

export const Vehicles = {
  id: 'vehicles',
  order: 46,

  setup(engine) {
    // Chapter 7: the trustee sells vehicle equity above the motor-vehicle exemption.
    engine.bus.on('bankruptcy:liquidate', ({ ctx }) => {
      const { state } = ctx;
      let exemption = 5025;
      for (const v of [...vehiclesOf(state)].sort((a, b) => (a.value - (a.loan?.balance ?? 0)) - (b.value - (b.loan?.balance ?? 0)))) {
        if (v.lease) continue;
        const equity = v.value - (v.loan?.balance ?? 0);
        if (equity <= exemption && typeOf(v).category === 'car') {
          exemption -= Math.max(0, equity);
          continue;
        }
        removeVehicle(state, v);
        ctx.log(`The bankruptcy trustee sold your ${typeOf(v).name}.`, '⚖️', 'warn');
      }
    });
  },

  init(state) {
    state.vehicles ??= { owned: [], record: { points: 0, accidents: [], claims: [] }, repos: [] };
  },

  guard(state, actionId) {
    if (actionId.startsWith('vehicles.') && state.legal.incarceration && actionId !== 'vehicles.sell') return 'Not from prison.';
    return null;
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.vehicles.owned.length) return;
    // Prison: insurance lapses, payments keep coming.
    if (state.legal.incarceration) for (const v of state.vehicles.owned) v.insured = false;
    payTick(ctx);
    if (!state.legal.incarceration) accidentTick(ctx);
    if (state.character.alive) repoTick(ctx);
  },

  actions: {
    /** arg: "typeId:cash|loan|lease" */
    buy(ctx, arg) {
      const { state, rng } = ctx;
      const [typeId, how = 'cash'] = String(arg).split(':');
      const check = purchaseCheck(state, typeId, how);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const t = VEHICLE_TYPES[typeId];
      if (!ctx.spend(check.due, how === 'cash' ? `Bought a ${t.name}` : how === 'loan' ? `Down payment — ${t.name}` : `Lease signing — ${t.name}`, { credit: true })) return ctx.toast('Card declined.', 'warn');
      const v = { id: rng.id('veh_'), typeId, value: t.price, age: 0, insured: true };
      if (how === 'loan') {
        const rate = autoRate(state, t.used);
        const principal = t.price - check.due;
        v.loan = { balance: principal, rate, payment: loanPayment(principal, rate, LOAN_YEARS), yearsLeft: LOAN_YEARS };
      }
      if (how === 'lease') v.lease = { ...leasePayment(state, t), yearsLeft: LEASE_YEARS };
      state.vehicles.owned.push(v);
      ctx.stat('happiness', 4);
      const license = t.license && !hasCredential(state, t.license) ? ' (You don\'t have the license to operate it yet.)' : '';
      ctx.log(`${how === 'lease' ? 'You leased' : 'You bought'} a ${t.name}${how === 'loan' ? ` with a ${LOAN_YEARS}-year loan at ${(v.loan.rate * 100).toFixed(1)}% (${money(v.loan.payment)}/yr)` : how === 'lease' ? ` for ${money(v.lease.payment)}/yr` : ` for ${money(t.price)}`}.${license}`, t.icon, 'milestone');
    },
    sell(ctx, id) {
      const { state } = ctx;
      const v = vehiclesOf(state).find((x) => x.id === id);
      if (!v) return;
      const t = typeOf(v);
      if (v.lease) {
        // Early lease termination: pay most of what's left.
        const fee = Math.round(v.lease.payment * v.lease.yearsLeft * 0.7);
        ctx.spend(fee, `Lease termination — ${t.name}`, { allowDebt: true });
        removeVehicle(state, v);
        return ctx.log(`You broke your ${t.name} lease early (${money(fee)} fee).`, t.icon, 'warn');
      }
      const price = Math.round(v.value * 0.92);
      const owed = v.loan?.balance ?? 0;
      if (price >= owed) state.finances.cash += price - owed;
      else ctx.spend(owed - price, `Underwater on ${t.name}`, { allowDebt: true });
      removeVehicle(state, v);
      ctx.log(`You sold your ${t.name} for ${money(price)}${owed ? `; ${money(owed)} went to pay off the loan${price < owed ? ' — you were underwater' : ''}` : ''}.`, t.icon);
    },
    toggleInsurance(ctx, id) {
      const v = vehiclesOf(ctx.state).find((x) => x.id === id);
      if (!v) return;
      if ((v.loan || v.lease) && v.insured) return ctx.toast('Your lender requires full coverage.', 'warn');
      v.insured = !v.insured;
      ctx.log(v.insured ? `You insured your ${typeOf(v).name}.` : `You dropped insurance on your ${typeOf(v).name}. Driving uninsured is illegal in almost every state.`, '🛡️', v.insured ? undefined : 'warn');
    },
    /** Pay a loan off early. */
    payoff(ctx, id) {
      const v = vehiclesOf(ctx.state).find((x) => x.id === id);
      if (!v?.loan) return;
      if (!ctx.spend(v.loan.balance, `Loan payoff — ${typeOf(v).name}`, { credit: true })) return ctx.toast(`You need ${money(v.loan.balance)}.`, 'warn');
      delete v.loan;
      ctx.log(`You paid off your ${typeOf(v).name} loan early.`, '💵', 'good');
    },
    /** Defensive driving course: −2 points, once a year. */
    trafficSchool(ctx) {
      const { state } = ctx;
      if (state.vehicles.record.points <= 0) return ctx.toast('Your record is clean.', 'info');
      if (state.yearly['vehicles.school']) return ctx.toast('Once a year.', 'warn');
      if (!ctx.spend(150, 'Defensive driving course', { credit: true })) return ctx.toast('$150 needed.', 'warn');
      state.yearly['vehicles.school'] = 1;
      state.vehicles.record.points = Math.max(0, state.vehicles.record.points - 2);
      ctx.log('You sat through eight hours of defensive driving videos. Two points came off your record.', '🚦');
    },
  },

  resolvers: {
    leaseEnd(ctx, data, optionId) {
      const { state } = ctx;
      const v = vehiclesOf(state).find((x) => x.id === data.id);
      if (!v?.lease) return;
      const t = typeOf(v);
      if (optionId === 'buy' && ctx.spend(v.lease.residual, `Lease buyout — ${t.name}`, { credit: true })) {
        v.value = v.lease.residual;
        delete v.lease;
        return ctx.log(`You bought out your ${t.name} lease.`, t.icon);
      }
      removeVehicle(state, v);
      ctx.log(`You turned in your leased ${t.name}.`, '🔑');
    },
  },
};

