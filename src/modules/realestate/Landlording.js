/**
 * Landlording: rental units, tenants, vacancies, late rent, damage and
 * evictions. A property manager (a delegation toggle, like ManagementEngine's)
 * takes 10% of collected rent and handles tenant problems for you.
 * Rental income is taxable; depreciation (building value / 27.5 yrs) is a
 * deduction.
 */
import { PROPERTY_TYPES, marketRent } from './PropertyMarket.js';

const TENANT_NAMES = ['the Garcias', 'Jamal', 'the Lees', 'Brittany', 'the Novaks', 'Omar', 'the Pattersons', 'Lin', 'the O\'Briens', 'Dmitri'];
export const MANAGER_FEE = 0.1;

export function rentableUnits(property) {
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
  const managed = state.housing.manager;

  // Fill vacancies
  const fillChance = 0.55 + property.condition / 300 + (managed ? 0.1 : 0) + (state.economy.phase === 'recession' ? -0.15 : 0);
  while (property.tenants.length < units && rng.chance(fillChance)) property.tenants.push(newTenant(ctx, property));

  let collected = 0;
  for (const t of [...property.tenants]) {
    const paid = rng.chance(t.reliability);
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
