/**
 * Landlording: rental units, tenants, vacancies, late rent, damage and
 * evictions. A property manager (a delegation toggle, like ManagementEngine's)
 * takes 10% of collected rent and handles tenant problems for you.
 * Rental income is taxable; depreciation (building value / 27.5 yrs, 39 for
 * commercial) is a deduction.
 *
 * Commercial property leases to businesses on multi-year triple-net leases
 * (tenants reimburse property tax and insurance) with yearly escalators:
 * slower to fill, steadier once leased, and a new tenant needs a build-out.
 * Vacation homes rent short-term: more per night, seasonal occupancy, and
 * cleaning and platform fees. Relatives can rent from you at a family rate.
 */
import { PROPERTY_TYPES, marketRent, isCommercial } from './PropertyMarket.js';
import { carryingCosts } from './Maintenance.js';

const TENANT_NAMES = ['the Garcias', 'Jamal', 'the Lees', 'Brittany', 'the Novaks', 'Omar', 'the Pattersons', 'Lin', 'the O\'Briens', 'Dmitri'];
const BUSINESS_TENANTS = {
  stripMall: ['a nail salon', 'a pizza place', 'a dental office', 'a vape shop', 'a tax preparer', 'a dry cleaner', 'a mattress store', 'a taqueria', 'a phone repair shop', 'a martial-arts studio'],
  office: ['an insurance agency', 'a law firm', 'a startup', 'a staffing agency', 'an accounting firm', 'a therapy practice', 'a regional bank office', 'an engineering firm'],
  warehouse: ['a logistics company', 'an e-commerce seller', 'a cabinet maker', 'a beverage distributor', 'a moving company', 'an auto-parts wholesaler'],
};
export const MANAGER_FEE = 0.1;

export function rentableUnits(property) {
  if (property.project) return 0;
  const units = PROPERTY_TYPES[property.type].units;
  if (property.use === 'rental') return units;
  if (property.use === 'primary' && units > 1) return units - 1; // house hacking
  return 0;
}

function newTenant(ctx, property) {
  const { rng, state } = ctx;
  return { name: rng.pick(TENANT_NAMES), rent: Math.round(marketRent(state, property.type, property.regionId) * rng.float(0.92, 1.05)), reliability: rng.float(0.6, 0.99) };
}

export function landlordTick(ctx, property) {
  const { state, rng } = ctx;
  const units = rentableUnits(property);
  property.tenants = (property.tenants ?? []).slice(0, units);
  if (!units) return;
  if (isCommercial(property.type)) return commercialTick(ctx, property, units);
  if (PROPERTY_TYPES[property.type].vacation) return shortTermTick(ctx, property);
  const managed = state.housing.manager;

  // Fill vacancies
  const fillChance = 0.55 + property.condition / 300 + (managed ? 0.1 : 0) + (state.economy.phase === 'recession' ? -0.15 : 0);
  while (property.tenants.length < units && rng.chance(fillChance)) property.tenants.push(newTenant(ctx, property));

  let collected = 0;
  for (const t of [...property.tenants]) {
    const paid = rng.chance(t.reliability);
    if (!paid && t.personId) {
      // Family behind on rent: you let it slide.
      collected += t.rent * 9;
      ctx.log(`${t.name} came up short on rent this year. You let it go.`, '💛');
      continue;
    }
    if (paid) collected += t.rent * 12;
    else if (managed) {
      property.tenants = property.tenants.filter((x) => x !== t);
      collected += t.rent * 6;
      ctx.spend(3000, 'Eviction (property manager)', { allowDebt: true });
      ctx.log(`Your property manager evicted ${t.name} for non-payment.`, '📦', 'warn');
    } else {
      collected += t.rent * 6;
      ctx.prompt({
        type: 'housing.lateRent',
        icon: '📬',
        title: 'Tenant Behind on Rent',
        text: `${t.name} at your ${property.typeName} is six months behind on rent.`,
        options: [
          { id: 'plan', label: '🤝 Set up a payment plan', hint: 'They might catch up' },
          { id: 'evict', label: '📦 File for eviction', hint: '$3,000 + months of vacancy' },
          { id: 'forgive', label: '💛 Forgive it — they\'re going through a lot' },
        ],
        data: { propertyId: property.id, tenant: t.name },
      });
    }
  }
  if (!managed && property.tenants.length && rng.chance(0.12)) {
    const cost = rng.int(1500, 9000);
    ctx.spend(cost, 'Tenant damage', { allowDebt: true });
    property.condition = Math.max(0, property.condition - 5);
    ctx.log(`Tenants damaged your ${property.typeName}: $${cost.toLocaleString()} in repairs.`, '🔨', 'warn');
  }
  if (managed && collected) ctx.spend(Math.round(collected * MANAGER_FEE), 'Property manager fee', { allowDebt: true });
  if (collected) ctx.earn(collected, `Rental income — ${property.typeName}`);
  const share = units / PROPERTY_TYPES[property.type].units;
  ctx.deduct(Math.round(((property.purchasePrice * 0.8) / 27.5) * share), 'Rental depreciation');
  property.lastRent = collected;
}

/** Leases to businesses: multi-year, escalating, triple-net. */
function commercialTick(ctx, property, units) {
  const { state, rng } = ctx;
  const recession = state.economy.phase === 'recession';
  const market = marketRent(state, property.type, property.regionId);
  let collected = 0;
  for (const t of [...property.tenants]) {
    if (recession && rng.chance(1 - t.reliability + 0.06)) {
      property.tenants = property.tenants.filter((x) => x !== t);
      ctx.log(`${cap(t.name)} went out of business and broke its lease at your ${property.typeName}.`, '📉', 'warn');
      collected += t.rent * 4;
      continue;
    }
    collected += t.rent * 12;
    t.rent = Math.round(t.rent * 1.03);
    t.yearsLeft -= 1;
    if (t.yearsLeft <= 0) {
      if (rng.chance(0.65)) {
        t.yearsLeft = rng.int(3, 7);
        t.rent = Math.round((t.rent + market) / 2);
        ctx.log(`${cap(t.name)} renewed its lease at your ${property.typeName} for ${t.yearsLeft} years.`, '📝');
      } else {
        property.tenants = property.tenants.filter((x) => x !== t);
        ctx.log(`${cap(t.name)}'s lease ran out and it moved out of your ${property.typeName}.`, '📦');
      }
    }
  }
  // Leasing up: slower than apartments, faster with a broker (the property manager) and a well-kept building.
  const fill = 0.3 + property.condition / 400 + (state.housing.manager ? 0.1 : 0) + (recession ? -0.15 : state.economy.phase === 'peak' ? 0.1 : 0);
  const names = BUSINESS_TENANTS[property.type] ?? BUSINESS_TENANTS.office;
  for (let i = property.tenants.length; i < units && rng.chance(fill); i++) {
    const name = rng.pick(names);
    const years = rng.int(3, 10);
    const rent = Math.round(market * rng.float(0.9, 1.05));
    // Tenant improvements and broker commission on a new lease.
    ctx.spend(Math.round(rent * 4), `Tenant build-out — ${property.typeName}`, { allowDebt: true });
    property.tenants.push({ name, rent, reliability: rng.float(0.85, 0.98), yearsLeft: years, business: true });
    ctx.log(`You signed ${name} to a ${years}-year lease at your ${property.typeName} ($${rent.toLocaleString()}/mo, +3% a year).`, '🤝', 'good');
  }
  // Triple-net: tenants reimburse their share of property tax and insurance.
  const c = carryingCosts(property, state);
  const nnn = Math.round((c.tax + c.insurance) * (property.tenants.length / units));
  if (state.housing.manager && collected) ctx.spend(Math.round(collected * 0.05), 'Commercial property management', { allowDebt: true });
  if (collected + nnn) ctx.earn(collected + nnn, `Lease income — ${property.typeName}`);
  ctx.deduct(Math.round((property.purchasePrice * 0.75) / 39), 'Commercial depreciation');
  property.lastRent = collected + nnn;
}

/** Short-term rental: seasonal bookings at a premium, with cleaning and platform fees. */
function shortTermTick(ctx, property) {
  const { state, rng } = ctx;
  if (property.use !== 'rental') return;
  const occupancy = rng.float(0.4, 0.75) * (state.economy.phase === 'recession' ? 0.75 : 1) * (0.6 + property.condition / 250);
  const gross = Math.round(marketRent(state, property.type, property.regionId) * 12 * 1.7 * occupancy);
  const fees = Math.round(gross * (state.housing.manager ? 0.3 : 0.18));
  ctx.spend(fees, `Cleaning & booking fees — ${property.typeName}`, { allowDebt: true });
  ctx.earn(gross, `Short-term rentals — ${property.typeName}`);
  ctx.deduct(Math.round((property.purchasePrice * 0.8) / 27.5), 'Rental depreciation');
  property.condition = Math.max(0, property.condition - rng.int(1, 3));
  property.lastRent = gross;
  property.tenants = [];
  property.occupancy = Math.round(occupancy * 100);
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function resolveLateRent(ctx, data, optionId) {
  const { state, rng } = ctx;
  const p = state.housing.properties.find((x) => x.id === data.propertyId);
  if (!p) return;
  const t = p.tenants.find((x) => x.name === data.tenant);
  if (!t) return;
  if (optionId === 'evict') {
    ctx.spend(3000, 'Eviction filing', { allowDebt: true });
    p.tenants = p.tenants.filter((x) => x !== t);
    ctx.log(`You evicted ${t.name}.`, '📦', 'warn');
  } else if (optionId === 'plan') {
    if (rng.chance(0.55)) {
      ctx.earn(t.rent * 6, 'Back rent (payment plan)');
      t.reliability = Math.min(0.99, t.reliability + 0.1);
      ctx.log(`${t.name} caught up on the payment plan.`, '🤝', 'good');
    } else {
      t.reliability -= 0.15;
      ctx.log(`${t.name} fell behind on the payment plan too.`, '🤝', 'warn');
    }
  } else {
    t.reliability = Math.min(0.99, t.reliability + 0.2);
    ctx.stat('happiness', 3);
    ctx.log(`You forgave ${t.name}'s back rent. They were grateful.`, '💛');
  }
}
