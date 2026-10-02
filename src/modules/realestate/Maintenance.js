/**
 * Owning costs and upkeep: state property tax, homeowners insurance priced
 * by the state's disaster risk, HOA dues, routine upkeep, condition decay,
 * repair emergencies and renovations. People in the trades (electricians,
 * plumbers, engineers) do their own work at a steep discount.
 */
import { clamp } from '../../core/Random.js';
import { STATES } from '../life/States.js';
import { REGIONS } from '../life/Regions.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { PROPERTY_TYPES } from './PropertyMarket.js';

export const RENOVATIONS = {
  curb: { name: 'Curb appeal & paint', icon: '🎨', costPct: 0.012, valuePct: 0.025, condition: 8 },
  bath: { name: 'Bathroom remodel', icon: '🛁', costPct: 0.03, valuePct: 0.045, condition: 10 },
  kitchen: { name: 'Kitchen remodel', icon: '🍳', costPct: 0.065, valuePct: 0.09, condition: 15 },
  addition: { name: 'Home addition', icon: '🧱', costPct: 0.14, valuePct: 0.17, condition: 5 },
};

const REPAIRS = [
  { id: 'roof', name: 'The roof is leaking', costPct: 0.025 },
  { id: 'hvac', name: 'The HVAC system died', cost: 11000 },
  { id: 'plumbing', name: 'A pipe burst in the wall', cost: 6500 },
  { id: 'foundation', name: 'Cracks spread across the foundation', costPct: 0.035 },
  { id: 'electrical', name: 'The old wiring is a fire hazard', cost: 8000 },
];

/** DIY cost multiplier for people who know how to do the work. */
export function diyFactor(state) {
  const pro = ['trades', 'plumbing', 'engineering'].includes(state.career.job?.professionId) || hasCredential(state, 'journeymanElectrician') || hasCredential(state, 'journeymanPlumber');
  return pro ? 0.55 : 1;
}

export function insurancePremium(property) {
  const risk = Object.values(STATES[REGIONS[property.regionId].state].disasters).reduce((s, p) => s + p, 0);
  return Math.round(property.value * 0.0035 * (1 + risk * 8));
}

export function carryingCosts(property) {
  const st = STATES[REGIONS[property.regionId].state];
  return {
    tax: Math.round(property.value * st.propertyTax),
    insurance: property.insured ? insurancePremium(property) : 0,
    hoa: PROPERTY_TYPES[property.type].hoa,
    upkeep: Math.round(property.value * (property.condition < 50 ? 0.015 : 0.01)),
  };
}

export function maintenanceTick(ctx, property) {
  const { rng } = ctx;
  const c = carryingCosts(property);
  ctx.spend(c.tax + c.insurance + c.hoa + c.upkeep, `Property costs — ${property.typeName}`, { allowDebt: true });
  property.lastCosts = c;
  property.condition = Math.round(clamp(property.condition - rng.int(2, 5), 0, 100));

  if (rng.chance(0.18)) {
    const r = rng.pick(REPAIRS);
    const cost = Math.round(r.cost ?? property.value * r.costPct);
    ctx.prompt({
      type: 'housing.repair',
      icon: '🔧',
      title: `Repair Needed: ${property.typeName}`,
      text: `${r.name}. A contractor quotes $${cost.toLocaleString()}.`,
      options: [
        { id: 'contractor', label: `👷 Hire a contractor ($${cost.toLocaleString()})` },
        { id: 'diy', label: `🧰 Do it yourself (~$${Math.round(cost * diyFactor(ctx.state) * 0.6).toLocaleString()})`, hint: diyFactor(ctx.state) < 1 ? 'You know this work' : 'Risky if you don\'t' },
        { id: 'defer', label: '⏳ Put it off', hint: 'Condition and value drop' },
      ],
      data: { propertyId: property.id, cost },
    });
  }
}

export function resolveRepair(ctx, data, optionId) {
  const { state, rng } = ctx;
  const p = state.housing.properties.find((x) => x.id === data.propertyId);
  if (!p) return;
  if (optionId === 'contractor' && !ctx.spend(data.cost, 'Home repair', { credit: true })) {
    ctx.log(`You couldn't pay the contractor $${data.cost.toLocaleString()}, so the repair waits.`, '💳', 'warn');
    p.condition = Math.max(0, p.condition - 5);
    return;
  }
  if (optionId === 'contractor') {
    p.condition = Math.min(100, p.condition + 10);
    ctx.log(`Contractors fixed it for $${data.cost.toLocaleString()}.`, '👷');
  } else if (optionId === 'diy') {
    const pro = diyFactor(state) < 1;
    ctx.spend(Math.round(data.cost * diyFactor(state) * 0.6), 'DIY repair materials', { allowDebt: true });
    if (pro || rng.chance(0.55)) {
      p.condition = Math.min(100, p.condition + 8);
      ctx.log('You fixed it yourself over a few weekends.', '🧰', 'good');
    } else {
      p.condition = Math.max(0, p.condition - 10);
      ctx.stat('health', -rng.int(2, 8));
      ctx.log('Your DIY fix made it worse. You also hurt your back.', '🤕', 'bad');
    }
  } else {
    p.condition = Math.max(0, p.condition - 15);
    ctx.log('You put the repair off. It\'s getting worse.', '⏳', 'warn');
  }
}

export function renovate(ctx, property, kind) {
  const r = RENOVATIONS[kind];
  if (!r) return;
  const cost = Math.round(property.value * r.costPct * diyFactor(ctx.state));
  if (ctx.state.finances.cash < cost) return ctx.toast(`Needs $${cost.toLocaleString()} cash.`, 'warn');
  ctx.spend(cost, r.name);
  property.valueAdj = Math.round(((property.valueAdj ?? 1) * (1 + r.valuePct)) * 1000) / 1000;
  property.value = Math.round(property.value * (1 + r.valuePct));
  property.condition = Math.min(100, property.condition + r.condition);
  property.renovations = [...(property.renovations ?? []), kind];
  ctx.log(`${r.icon} ${r.name} on your ${property.typeName}: $${cost.toLocaleString()}${diyFactor(ctx.state) < 1 ? ' (you did much of the work yourself)' : ''}. Value now ~$${property.value.toLocaleString()}.`, '🔨', 'good');
}
