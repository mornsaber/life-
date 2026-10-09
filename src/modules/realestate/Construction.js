/**
 * Building and tearing down: develop land you own into homes, apartments or
 * commercial buildings; tear down what's there to build something better;
 * split raw land into lots; petition to rezone a lot for commercial use.
 *
 * A project lives on the land it's built on:
 *   property.project = { kind: 'build', target, cost, paid, yearsLeft, years,
 *                        contractor: gc|own|diy, loan: { balance, rate } | null, stalled }
 *
 * Construction costs follow local wages (cost of living), not land prices,
 * so building pays best where land is dear — and in a boom, when finished
 * buildings sell high. Each year draws a share of the budget; overruns and
 * delays are common (more so in a hot market). A construction loan funds 75%
 * of each draw, interest-only, and turns into a permanent mortgage when the
 * building is done.
 *
 * Owning a construction company or home builder lets you build at cost; a
 * demolition contractor tears down at half price. People in the trades can
 * be their own builder on smaller homes.
 */
import { REGIONS } from '../life/Regions.js';
import { PROPERTY_TYPES, ZONING, priceOf, isLand, isResidential, isCommercial } from './PropertyMarket.js';
import { annualPayment, canCover, foreclose } from './MortgageSystem.js';
import { diyFactor } from './Maintenance.js';

export const PERMIT_RATE = 0.02;
export const LOAN_SHARE = 0.75;
export const SUBDIVIDE_LOTS = 3;
export const REZONE_COST = 40000;
const BUILDERS = { residential: ['constructionCo', 'homeBuilder', 'developer'], commercial: ['constructionCo', 'developer'] };
const DEMOLISHERS = { demolitionCo: 0.5, constructionCo: 0.8, excavation: 0.7 };
const money = (n) => `$${Math.round(n).toLocaleString()}`;

const yourBusinesses = (state) => [state.business?.current, ...(state.business?.holdings ?? [])].filter(Boolean);
/** Construction costs rise with local wages, a bit slower than land prices (col^1.6). */
const localCost = (regionId) => REGIONS[regionId].col ** 1.4 * 1.08;

/** A business of yours that can do the work, if any. */
export function ownBuilder(state, target) {
  const kinds = isCommercial(target) || PROPERTY_TYPES[target].units > 4 ? BUILDERS.commercial : BUILDERS.residential;
  return yourBusinesses(state).find((b) => kinds.includes(b.typeId)) ?? null;
}

/** Can you be your own builder? Small residential buildings, if you know the trades. */
export const canDiy = (state, target) => isResidential(target) && PROPERTY_TYPES[target].units <= 2 && diyFactor(state) < 1;

/** What it costs to build `target` on this land with this contractor. */
export function buildQuote(state, land, target, contractor = 'gc') {
  const def = PROPERTY_TYPES[target];
  if (!def?.build) return { ok: false, reason: 'Not something you can build' };
  if (!isLand(land.type)) return { ok: false, reason: 'Tear down what\'s there first' };
  if (!(ZONING[land.type] ?? []).includes(target)) return { ok: false, reason: `Not zoned for ${def.name.toLowerCase()}` };
  if (land.project) return { ok: false, reason: 'Already under construction' };
  const factor = contractor === 'own' ? 0.82 : contractor === 'diy' ? 0.7 : 1;
  if (contractor === 'own' && !ownBuilder(state, target)) return { ok: false, reason: 'You don\'t own a builder that does this work' };
  if (contractor === 'diy' && !canDiy(state, target)) return { ok: false, reason: 'Only tradespeople can owner-build, and only small homes' };
  const cost = Math.round(def.build.cost * localCost(land.regionId) * factor / 1000) * 1000;
  const years = def.build.years + (contractor === 'diy' ? 1 : 0);
  const permits = Math.round(cost * PERMIT_RATE);
  const finished = Math.round(priceOf(state, target, land.regionId) * 1.05);
  return { ok: true, cost, years, permits, finished, profit: finished - land.value - cost - permits, def };
}

/** Start building. finance: cash | loan */
export function startBuild(ctx, land, target, contractor, finance) {
  const { state } = ctx;
  const q = buildQuote(state, land, target, contractor);
  if (!q.ok) return ctx.toast(q.reason, 'warn');
  if (land.use === 'primary') return ctx.toast('Move out first.', 'warn');
  const loan = finance === 'loan';
  if (loan && state.housing.credit.score < 660) return ctx.toast('Construction loans need a 660+ credit score.', 'warn');
  const firstDraw = q.cost / q.years;
  const upFront = q.permits + (loan ? firstDraw * (1 - LOAN_SHARE) : firstDraw);
  if (state.finances.cash < upFront) return ctx.toast(`You need ${money(upFront)} in cash for permits and the first draw${loan ? ' (your 25% share)' : ''}.`, 'warn');
  ctx.spend(q.permits, `Building permits — ${q.def.name}`);
  land.project = {
    kind: 'build', target, cost: q.cost, paid: 0, years: q.years, yearsLeft: q.years, contractor, stalled: 0,
    loan: loan ? { balance: 0, rate: Math.round((state.housing.rates.base + 0.02) * 10000) / 10000 } : null, startedAge: state.character.age,
  };
  land.purchasePrice += q.permits;
  const who = contractor === 'own' ? ownBuilder(state, target).name : contractor === 'diy' ? 'you, as your own builder' : 'a general contractor';
  ctx.log(`Permits approved: ${who} broke ground on a ${q.def.name.toLowerCase()} on your ${land.typeName.toLowerCase()}. Budget ${money(q.cost)} over ${q.years} year${q.years > 1 ? 's' : ''}${loan ? ', 75% from a construction loan' : ''}.`, '🏗️', 'milestone');
  if (contractor === 'own') ownBuilder(state, target).reputation = Math.min(100, ownBuilder(state, target).reputation + 1);
}

/** A year on the job site. Returns true if the building was finished, 'foreclosed' if the lender took it. */
export function constructionTick(ctx, land) {
  const { state, rng } = ctx;
  const p = land.project;
  if (!p) return false;
  const def = PROPERTY_TYPES[p.target];
  const hot = state.economy.phase === 'peak' || state.economy.phase === 'expansion';
  // Interest on what's been drawn so far.
  if (p.loan?.balance) ctx.spend(Math.round(p.loan.balance * p.loan.rate), 'Construction loan interest', { allowDebt: true });
  // Surprises: overruns (materials, change orders) and delays (weather, inspections, labor).
  if (rng.chance(hot ? 0.3 : 0.18)) {
    const extra = Math.round((p.cost - p.paid) * rng.float(0.05, 0.18));
    p.cost += extra;
    ctx.log(`${rng.pick(['Lumber and steel prices jumped', 'The soil report meant a deeper foundation', 'Change orders added up', 'An inspector made the crew redo the framing'])} on your ${def.name.toLowerCase()}: ${money(extra)} over budget.`, '📈', 'warn');
  }
  if (rng.chance(hot ? 0.22 : 0.1) || (p.contractor === 'diy' && rng.chance(0.2))) {
    p.yearsLeft += 1;
    ctx.log(`${rng.pick(['A wet spring', 'A short-handed crew', 'A backlog at the permit office', 'A late shipment of windows'])} pushed your ${def.name.toLowerCase()} back a year.`, '⏳', 'warn');
  }
  const draw = Math.round((p.cost - p.paid) / Math.max(1, p.yearsLeft));
  const fromLoan = p.loan ? Math.round(draw * LOAN_SHARE) : 0;
  const yours = draw - fromLoan;
  if (!canCover(state, yours)) {
    p.stalled += 1;
    ctx.log(`Work stopped on your ${def.name.toLowerCase()}: you couldn't make the ${money(yours)} draw.${p.stalled >= 2 ? ' The site is sitting idle and the crew has moved on.' : ''}`, '🚧', 'bad');
    // Three idle years and the construction lender takes the site.
    if (p.loan?.balance && p.stalled >= 3) {
      foreclose(ctx, land);
      return 'foreclosed';
    }
    return false;
  }
  ctx.spend(yours, `Construction draw — ${def.name}`, { allowDebt: true });
  if (p.loan) p.loan.balance += fromLoan;
  p.paid += draw;
  p.yearsLeft -= 1;
  if (p.contractor === 'diy') {
    ctx.stat('stress', 6);
    if (rng.chance(0.08)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(15, 40) });
  }
  if (p.yearsLeft > 0) return false;
  finish(ctx, land);
  return true;
}

function finish(ctx, land) {
  const { state } = ctx;
  const p = land.project;
  const def = PROPERTY_TYPES[p.target];
  land.type = p.target;
  land.typeName = def.name;
  land.condition = 100;
  land.valueAdj = 1.05; // new construction premium
  land.value = Math.round(priceOf(state, p.target, land.regionId) * land.valueAdj * (0.7 + 100 / 333));
  land.purchasePrice += p.paid;
  land.tenants = [];
  land.use = isResidential(p.target) && def.kind === 'home' ? 'vacant' : 'rental';
  land.builtAge = state.character.age;
  // The construction loan rolls into a permanent mortgage (with any land loan).
  if (p.loan?.balance) {
    const type = isResidential(p.target) ? 'conv30' : 'commercial';
    const years = type === 'conv30' ? 30 : 25;
    const balance = p.loan.balance + (land.mortgage?.balance ?? 0);
    const rate = Math.round((state.housing.rates.base + (type === 'commercial' ? 0.0125 : 0)) * 10000) / 10000;
    land.mortgage = { type, rate, termYears: years, yearsLeft: years, balance, original: balance, payment: annualPayment(balance, rate, years), mip: 0, delinquent: 0, armResetIn: null };
  }
  const profit = land.value - land.purchasePrice;
  ctx.log(`Your ${def.name.toLowerCase()} is finished! Worth about ${money(land.value)} against ${money(land.purchasePrice)} all-in${profit > 0 ? ` — ${money(profit)} of value created` : ''}.${land.use === 'rental' ? ' Leasing starts this year.' : ' Move in, rent it out or sell it.'}`, def.icon, profit > 0 ? 'milestone' : 'warn');
  ctx.stat('happiness', 6);
  land.project = null;
}

/** What tearing a building down costs (and what you'd owe tenants). */
export function demolitionQuote(state, prop) {
  const def = PROPERTY_TYPES[prop.type];
  if (!def || isLand(prop.type)) return { ok: false, reason: 'Nothing to tear down' };
  if (!def.lot) return { ok: false, reason: 'You own a unit, not the building' };
  if (prop.project) return { ok: false, reason: 'Under construction' };
  if (prop.use === 'primary') return { ok: false, reason: 'Move out first' };
  const own = yourBusinesses(state).map((b) => DEMOLISHERS[b.typeId]).filter(Boolean);
  const factor = own.length ? Math.min(...own) : 1;
  const base = def.kind === 'home' ? 22000 + def.base * 0.01 : 40000 + def.units * 15000 + def.base * 0.01;
  const cost = Math.round(base * localCost(prop.regionId) * factor / 1000) * 1000;
  const tenants = prop.tenants ?? [];
  const buyouts = Math.round(tenants.reduce((s, t) => s + (t.business ? t.rent * 12 * Math.max(1, t.yearsLeft ?? 1) * 0.3 : 3000), 0));
  return { ok: true, cost, buyouts, lot: def.lot, own: factor < 1 };
}

export function demolish(ctx, prop) {
  const { state } = ctx;
  const q = demolitionQuote(state, prop);
  if (!q.ok) return ctx.toast(q.reason, 'warn');
  if (!ctx.spend(q.cost + q.buyouts, `Demolition — ${prop.typeName}`, { credit: true })) return ctx.toast(`Demolition and tenant buyouts: ${money(q.cost + q.buyouts)}.`, 'warn');
  const was = prop.typeName;
  for (const t of prop.tenants ?? []) if (t.personId) ctx.log(`${t.name} had to move out before the demolition.`, '📦', 'warn');
  prop.type = q.lot;
  prop.typeName = PROPERTY_TYPES[q.lot].name;
  prop.tenants = [];
  prop.use = 'vacant';
  prop.condition = 100;
  prop.valueAdj = 1;
  prop.renovations = [];
  prop.purchasePrice += q.cost;
  prop.value = Math.round(priceOf(state, q.lot, prop.regionId));
  ctx.log(`The ${was.toLowerCase()} came down${q.own ? ' (your own crews did it)' : ''}: ${money(q.cost)}${q.buyouts ? ` plus ${money(q.buyouts)} to buy out the tenants` : ''}. You're left with a ${prop.typeName.toLowerCase()} worth about ${money(prop.value)}.`, '🧨', 'milestone');
}

/** Split raw land into residential lots: surveys, roads and utilities. */
export function subdivide(ctx, land) {
  const { state, rng } = ctx;
  if (land.type !== 'acreage' || land.project) return ctx.toast('Only raw land can be subdivided.', 'warn');
  const cost = Math.round(60000 * localCost(land.regionId));
  if (!ctx.spend(cost, 'Subdivision: survey, roads and utilities', { credit: true })) return ctx.toast(`Roads, utilities and the plat cost ${money(cost)}.`, 'warn');
  const share = Math.round((land.purchasePrice + cost) / SUBDIVIDE_LOTS);
  const lots = Array.from({ length: SUBDIVIDE_LOTS }, (_, i) => (i === 0 ? land : { ...structuredClone(land), id: rng.id('prop_'), mortgage: null, heloc: null }));
  for (const lot of lots) {
    Object.assign(lot, { type: 'lot', typeName: PROPERTY_TYPES.lot.name, purchasePrice: share, valueAdj: 1, tenants: [], use: 'vacant', condition: 100 });
    lot.value = Math.round(priceOf(state, 'lot', lot.regionId));
  }
  state.housing.properties.push(...lots.slice(1));
  ctx.log(`You subdivided your land into ${SUBDIVIDE_LOTS} buildable lots (${money(cost)} for roads and utilities), each worth about ${money(lots[0].value)}.`, '📐', 'milestone');
}

/** Petition the zoning board to rezone a residential lot for commercial use. Once per lot. */
export function rezone(ctx, land) {
  const { state, rng } = ctx;
  if (land.type !== 'lot' || land.project) return ctx.toast('Only residential lots can be rezoned.', 'warn');
  if (land.rezoneTried) return ctx.toast('The board already ruled on this lot.', 'warn');
  if (!ctx.spend(REZONE_COST, 'Zoning attorney, traffic study and hearings', { credit: true })) return ctx.toast(`A rezoning petition costs ${money(REZONE_COST)}.`, 'warn');
  land.rezoneTried = true;
  land.purchasePrice += REZONE_COST;
  const politics = state.publicService?.elected ? 0.1 : 0;
  if (rng.chance(0.22 + politics)) {
    land.type = 'commercialLot';
    land.typeName = PROPERTY_TYPES.commercialLot.name;
    land.value = Math.round(priceOf(state, 'commercialLot', land.regionId));
    ctx.log(`The zoning board approved your rezoning over the neighbors' objections. Your lot is now commercial, worth about ${money(land.value)}.`, '📜', 'milestone');
  } else ctx.log('The zoning board denied your rezoning after a packed hearing of angry neighbors.', '📜', 'warn');
}
