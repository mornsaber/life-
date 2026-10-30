/**
 * Running a property empire, on top of Landlording's tenants and leases:
 *
 *  - Rent policy: each year residential rents are reviewed — to market, a fair
 *    halfway, or held. Pushing to market fills the books and empties units.
 *  - Rent control: a city can propose capping rises where you own; lobby
 *    against it, stay out of it, or back it. Where it passes, rises are capped.
 *  - Reputation: run-down buildings bring inspectors, fines and a slumlord name;
 *    a big landlord pushing rents hard can face a tenants' union rent strike.
 *  - Your own management company: past a few buildings, bring management in
 *    house — a salaried team in place of the 10% fee.
 *
 * state.housing.empire = { policy, reputation, company: { since, staff } | null, strikes }
 * state.housing.rentControl = { [regionId]: { cap, since } }
 */
import { Random } from '../../core/Random.js';
import { REGIONS } from '../life/Regions.js';
import { PROPERTY_TYPES, marketRent, isCommercial } from './PropertyMarket.js';
import { rentableUnits } from './Landlording.js';
import { priceLevel } from '../world/Countries.js';

export const RENT_POLICIES = {
  market: { label: '📈 Market rents', hint: 'Raise to market each year; more turnover', share: 1 },
  fair: { label: '⚖️ Fair rises', hint: 'Halfway to market; tenants stay', share: 0.5 },
  hold: { label: '🤝 Hold rents', hint: 'No rises; loyal tenants, better name', share: 0 },
};
export const RENT_CONTROL_CAP = 0.03;
export const COMPANY_MIN_PROPERTIES = 4;
/** In-house management: a fixed team plus a per-unit cost, in place of 10% of rents. */
export const companyCost = (state, units) => Math.round((40000 + units * 650) * priceLevel(state));

const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 70607 + state.character.age * 1291 + 0xe3b) >>> 0);
const pending = (state, type) => state.prompts.some((p) => p.type === type);

/** Rented homes and apartments (not commercial leases or holiday lets). */
export const residentialRentals = (state) => state.housing.properties.filter((p) => p.use === 'rental' && !p.project && !isCommercial(p.type) && !PROPERTY_TYPES[p.type]?.vacation && PROPERTY_TYPES[p.type]?.kind !== 'land');
export const allRentals = (state) => state.housing.properties.filter((p) => rentableUnits(p) > 0 && p.use === 'rental');
export function empireOf(state) {
  return state.housing.empire ?? { policy: 'market', reputation: 60, company: null, strikes: 0 };
}
export function ensureEmpire(state) {
  state.housing.empire ??= { policy: 'market', reputation: 60, company: null, strikes: 0 };
  return state.housing.empire;
}
export function portfolio(state) {
  const rentals = allRentals(state);
  const units = rentals.reduce((s, p) => s + rentableUnits(p), 0);
  const let_ = rentals.reduce((s, p) => s + (p.tenants?.length ?? 0), 0);
  const value = rentals.reduce((s, p) => s + p.value, 0);
  const debt = rentals.reduce((s, p) => s + (p.mortgage?.balance ?? 0) + (p.heloc?.balance ?? 0), 0);
  const roll = rentals.reduce((s, p) => s + (p.lastRent ?? 0), 0);
  const condition = rentals.length ? Math.round(rentals.reduce((s, p) => s + p.condition, 0) / rentals.length) : 0;
  return { properties: rentals.length, units, let: let_, value, debt, roll, condition };
}
export const capHere = (state, regionId) => state.housing.rentControl?.[regionId]?.cap ?? null;

function rentReview(ctx, e) {
  const { state } = ctx;
  const rng = sideRng(state);
  const pol = RENT_POLICIES[e.policy] ?? RENT_POLICIES.market;
  let left = 0;
  for (const p of residentialRentals(state)) {
    const market = marketRent(state, p.type, p.regionId);
    const cap = capHere(state, p.regionId);
    for (const t of [...(p.tenants ?? [])]) {
      if (t.personId) continue;
      let target = t.rent + Math.max(0, market - t.rent) * pol.share;
      if (cap != null) target = Math.min(target, t.rent * (1 + cap));
      const rise = target / t.rent - 1;
      t.rent = Math.round(target);
      // Big rises push people out; held rents keep them.
      if (rise > 0.08 && rng.chance(Math.min(0.5, rise * 2))) {
        p.tenants = p.tenants.filter((x) => x !== t);
        left += 1;
      } else if (pol.share === 0) t.reliability = Math.min(0.99, t.reliability + 0.02);
    }
  }
  if (left) ctx.log(`${left} tenant${left > 1 ? 's' : ''} moved out rather than pay the new rent.`, '📦', 'info');
  e.reputation = Math.max(0, Math.min(100, e.reputation + (e.policy === 'hold' ? 3 : e.policy === 'fair' ? 1 : -2)));
}

function rentControlVote(ctx) {
  const { state } = ctx;
  const rng = sideRng(state);
  state.housing.rentControl ??= {};
  const regions = [...new Set(residentialRentals(state).map((p) => p.regionId))];
  for (const [id, rc] of Object.entries(state.housing.rentControl)) {
    if (state.character.age - rc.since >= 6 && rng.chance(0.06)) {
      delete state.housing.rentControl[id];
      ctx.log(`Rent control in ${REGIONS[id]?.name ?? 'the city'} was repealed.`, '🏛️', 'info');
    }
  }
  const target = regions.find((r) => !state.housing.rentControl[r]);
  if (!target || pending(state, 'propertyEmpire.rentControl') || !rng.chance(state.economy.phase === 'peak' ? 0.06 : 0.03)) return;
  ctx.prompt({
    type: 'propertyEmpire.rentControl', icon: '🏛️', title: 'Rent Control on the Ballot',
    text: `With rents soaring, ${REGIONS[target]?.name ?? 'the city'} is voting on a cap of ${Math.round(RENT_CONTROL_CAP * 100)}% a year on rent rises. Landlords are being asked to chip in to fight it.`,
    options: [
      { id: 'lobby', label: '💸 Fund the campaign against it', hint: `≈$${Math.round(25000 * priceLevel(state)).toLocaleString()}` },
      { id: 'quiet', label: '🤐 Stay out of it' },
      { id: 'support', label: '✊ Back it publicly', hint: 'Your tenants will remember' },
    ],
    data: { regionId: target },
  });
}

function reputationTick(ctx, e, pf) {
  const { state } = ctx;
  const rng = sideRng(state);
  // Run-down buildings: complaints, inspectors and fines.
  if (pf.properties >= 2 && pf.condition < 40 && rng.chance(0.3)) {
    const fine = Math.round((2000 + pf.units * 400) * priceLevel(state));
    ctx.spend(fine, 'Housing code violations', { allowDebt: true });
    e.reputation = Math.max(0, e.reputation - 10);
    ctx.log(`Housing inspectors found mould, broken heating and dodgy wiring across your buildings: ${`$${fine.toLocaleString()}`} in fines.${e.reputation < 25 ? ' The local paper called you a slumlord.' : ''}`, '🏚️', 'bad');
  }
  // A tenants' union.
  if (pf.units >= 12 && e.policy === 'market' && e.reputation < 55 && !pending(state, 'propertyEmpire.strike') && rng.chance(0.15)) {
    ctx.prompt({
      type: 'propertyEmpire.strike', icon: '✊', title: 'A Rent Strike',
      text: `Your tenants have formed a union and stopped paying until you freeze rents and fix the repairs list.`,
      options: [
        { id: 'negotiate', label: '🤝 Negotiate', hint: 'Rents frozen, repairs done' },
        { id: 'evict', label: '📦 Evict the organisers', hint: 'Legal costs and headlines' },
        { id: 'wait', label: '⏳ Wait them out', hint: 'Months without rent' },
      ],
      data: {},
    });
  }
}

export function empireTick(ctx) {
  const { state } = ctx;
  const pf = portfolio(state);
  if (!pf.properties && !state.housing.empire) return;
  const e = ensureEmpire(state);
  if (!pf.properties) { if (e.company) { e.company = null; ctx.log('With no rentals left, you wound up your property management company.', '🏢', 'info'); } return; }
  // The in-house team: salaries in place of the fee (Landlording skips the 10% when it's yours).
  if (e.company) {
    state.housing.manager = true;
    e.company.staff = Math.max(2, Math.ceil(pf.units / 40));
    ctx.spend(companyCost(state, pf.units), 'Property management company payroll', { allowDebt: true });
  }
  rentReview(ctx, e);
  rentControlVote(ctx);
  reputationTick(ctx, e, pf);
}

export const PropertyEmpireModule = {
  id: 'propertyEmpire',
  order: 45.5,

  onAgeUp(ctx) {
    if (ctx.state.character.age >= 18) empireTick(ctx);
  },

  actions: {
    policy(ctx, id) {
      if (!RENT_POLICIES[id]) return;
      ensureEmpire(ctx.state).policy = id;
      ctx.toast(`Rent policy: ${RENT_POLICIES[id].label}`, 'info');
    },
    foundCompany(ctx) {
      const { state } = ctx;
      const e = ensureEmpire(state);
      if (e.company) return ctx.toast('You already run one.', 'warn');
      if (allRentals(state).length < COMPANY_MIN_PROPERTIES) return ctx.toast(`You need at least ${COMPANY_MIN_PROPERTIES} rental properties.`, 'warn');
      e.company = { since: state.character.age, staff: 2 };
      state.housing.manager = true;
      ctx.log(`You set up ${state.character.lastName} Property Management to run your buildings in house.`, '🏢', 'milestone');
    },
    closeCompany(ctx) {
      const e = ensureEmpire(ctx.state);
      if (!e.company) return;
      e.company = null;
      ctx.log('You wound up your management company and went back to an outside manager.', '🏢', 'info');
    },
  },

  resolvers: {
    rentControl(ctx, data, optionId) {
      const { state } = ctx;
      const e = ensureEmpire(state);
      const rng = sideRng(state);
      let odds = 0.5;
      if (optionId === 'lobby') { ctx.spend(Math.round(25000 * priceLevel(state)), 'Campaign against rent control', { allowDebt: true }); odds = 0.3; e.reputation = Math.max(0, e.reputation - 5); }
      if (optionId === 'support') { odds = 0.65; e.reputation = Math.min(100, e.reputation + 10); }
      const city = REGIONS[data.regionId]?.name ?? 'the city';
      if (rng.chance(odds)) {
        (state.housing.rentControl ??= {})[data.regionId] = { cap: RENT_CONTROL_CAP, since: state.character.age };
        return ctx.log(`Rent control passed in ${city}: rises are capped at ${Math.round(RENT_CONTROL_CAP * 100)}% a year.`, '🏛️', optionId === 'support' ? 'good' : 'warn');
      }
      ctx.log(`The rent-control measure failed in ${city}.`, '🏛️', optionId === 'lobby' ? 'good' : 'info');
    },
    strike(ctx, _data, optionId) {
      const { state } = ctx;
      const e = ensureEmpire(state);
      e.strikes += 1;
      const rentals = residentialRentals(state);
      const monthly = rentals.reduce((s, p) => s + (p.tenants ?? []).reduce((t, x) => t + x.rent, 0), 0);
      if (optionId === 'negotiate') {
        e.policy = 'fair';
        for (const p of rentals) p.condition = Math.min(100, p.condition + 10);
        ctx.spend(Math.round(rentals.length * 6000 * priceLevel(state)), 'Repairs agreed with the tenants\' union', { allowDebt: true });
        e.reputation = Math.min(100, e.reputation + 15);
        return ctx.log('You sat down with the union: rents moved to fair rises and the repairs got done. The strike ended.', '🤝', 'good');
      }
      if (optionId === 'evict') {
        ctx.spend(Math.round(30000 * priceLevel(state)), 'Eviction proceedings', { allowDebt: true });
        e.reputation = Math.max(0, e.reputation - 20);
        for (const p of rentals) p.tenants = (p.tenants ?? []).slice(1);
        return ctx.log('You evicted the organisers. The strike collapsed — and the headlines were brutal.', '📦', 'bad');
      }
      ctx.spend(Math.round(monthly * 4), 'Rent strike: unpaid rent', { allowDebt: true });
      e.reputation = Math.max(0, e.reputation - 5);
      ctx.log('You waited them out. Four months without rent before the strike fizzled.', '⏳', 'warn');
    },
  },
};
