/**
 * Self-built and informal homes: how most families in poorer countries come to own one. No bank,
 * no mortgage: you buy a plot (or build on land nobody has title to) and put the house up a room
 * at a time, paying cash for each stage as you have it. Once the roof is on you move in and
 * finish around yourselves.
 *
 *   plot      a small plot at the edge of town, bought for cash (title deeds and all)
 *   stages    foundations, walls, roof, finishing: one a year at most, each paid in cash;
 *             after the roof it's a home you can live in (and later sell or rent out)
 *   shack     a room of block and sheet metal on land nobody has title to, for very little.
 *             No rent, no tax; the risk is a clearance (the bulldozers, sometimes a little
 *             compensation). Settlements that last are often regularized: the state grants
 *             the title, and the house is worth something. A shack can be built up in stages
 *             like any plot (in-situ upgrading).
 *
 * Offered where most homes were built this way (the country's wages under 60% of America's).
 * Costs are local (Countries.priceLevel): labour is a neighbour's wage, not a contractor's.
 *
 * property.selfBuild = { stage, spent, paid }   (stage = stages done, 0–4; paid toward the next)
 * property.informal  = true while there's no title
 */
import { PROPERTY_TYPES, priceOf } from './PropertyMarket.js';
import { primaryHome, endLease } from './HousingEngine.js';
import { REGIONS } from '../life/Regions.js';
import { priceLevel, isAbroad } from '../world/Countries.js';
import { countryWageFactor } from '../economy/EraEconomy.js';
import { propertyBlock } from '../world/Regimes.js';
import { yearNow } from '../world/Eras.js';
import { isIncarcerated, yearlyCount, bumpYearly } from '../../core/State.js';
import { Random } from '../../core/Random.js';

/** What a modest self-built house costs in today's US dollars, before local prices. */
export const HOUSE_COST = 120000;
export const PLOT_COST = 30000;
export const SHACK_COST = 9000;
export const STAGES = [
  { id: 'foundations', name: 'Foundations', icon: '🧱', share: 0.25 },
  { id: 'walls', name: 'Walls', icon: '🏗️', share: 0.3 },
  { id: 'roof', name: 'Roof', icon: '🛖', share: 0.2 },
  { id: 'finish', name: 'Plaster, floors and doors', icon: '🚪', share: 0.25 },
];
/** Stages done when you can live in it. */
export const LIVABLE = 3;
const CLEARANCE_ODDS = 0.03;
const REGULARIZE_ODDS = 0.05;

const money = (n) => `$${Math.round(n).toLocaleString()}`;
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 7919 + state.character.age * 389 + 0x5b1d) >>> 0);

/** Is self-building how homes get made here? */
export function selfBuildHere(state) {
  if (!state.character || propertyBlock(state)) return false;
  return isAbroad(state) && countryWageFactor(state) < 0.6;
}

export const plotPrice = (state) => Math.round(PLOT_COST * priceLevel(state) * (REGIONS[state.character.regionId]?.type === 'Rural' ? 0.5 : 1));
export const shackCost = (state) => Math.round(SHACK_COST * priceLevel(state));
export const stageCost = (state, stage) => Math.round(HOUSE_COST * STAGES[stage].share * priceLevel(state));
const SELF_TYPES = ['plot', 'shack', 'selfbuilt'];
export const selfBuilds = (state) => state.housing.properties.filter((p) => p.selfBuild && SELF_TYPES.includes(p.type) && p.selfBuild.stage < STAGES.length);
export const nextStage = (p) => (p.selfBuild && SELF_TYPES.includes(p.type) && p.selfBuild.stage < STAGES.length ? STAGES[p.selfBuild.stage] : null);

/** Why you can't start one now, or null. */
export function cantStart(state) {
  if (!selfBuildHere(state)) return 'Not how homes are made here';
  if (state.character.age < 18) return 'Too young to own land';
  if (isIncarcerated(state)) return 'Not from a cell';
  if (selfBuilds(state).length) return 'Finish the house you\'re building first';
  return null;
}

function newProperty(ctx, type, extra) {
  const { state } = ctx;
  const regionId = state.character.regionId;
  const p = {
    id: ctx.rng.id('prop_'), type, typeName: PROPERTY_TYPES[type].name, regionId, value: 0, valueAdj: 1, purchasePrice: 0,
    purchaseAge: state.character.age, condition: 60, use: 'vacant', mortgage: null, heloc: null, tenants: [], insured: false, floodInsured: false,
    ...extra,
  };
  state.housing.properties.push(p);
  return p;
}

/** Value tracks the market (PropertyMarket.priceOf) from what it cost to make, with a margin for the work. */
function setValue(state, p, worth) {
  const market = priceOf(state, p.type, p.regionId) || 1;
  p.valueAdj = Math.round((worth / market) * 1000) / 1000;
  p.value = Math.round(worth);
}

function moveIn(ctx, p) {
  const { state } = ctx;
  if (primaryHome(state) || p.regionId !== state.character.regionId) return false;
  p.use = 'primary';
  endLease(ctx, null);
  state.housing.withParents = false;
  state.housing.everOwned = true;
  return true;
}

export function buyPlot(ctx) {
  const { state } = ctx;
  const why = cantStart(state);
  if (why) return ctx.toast(why, 'warn');
  const price = plotPrice(state);
  if (!ctx.spend(price, 'Building plot')) return ctx.toast(`A plot costs ${money(price)} in cash: no bank lends on a plot here.`, 'warn');
  const p = newProperty(ctx, 'plot', { purchasePrice: price, condition: 100, selfBuild: { stage: 0, spent: price } });
  setValue(state, p, price);
  ctx.log(`You bought a plot on the edge of ${REGIONS[p.regionId].name} for ${money(price)}. Next: foundations, when you have the money.`, '🟫', 'good');
}

export function buildShack(ctx) {
  const { state } = ctx;
  const why = cantStart(state);
  if (why) return ctx.toast(why, 'warn');
  if (primaryHome(state)) return ctx.toast('You have a home already.', 'warn');
  const cost = shackCost(state);
  if (!ctx.spend(cost, 'Blocks and roofing sheets')) return ctx.toast(`The blocks and sheets come to ${money(cost)}.`, 'warn');
  const p = newProperty(ctx, 'shack', { purchasePrice: cost, condition: 45, informal: true, selfBuild: { stage: 1, spent: cost }, title: { form: 'sole', share: 1, how: 'no title: built on unclaimed land' } });
  setValue(state, p, cost);
  moveIn(ctx, p);
  ctx.log(`You and some neighbours put up a room on unclaimed land in ${REGIONS[p.regionId].name}: no rent, no title. Build it up as you can.`, '🛖', 'good');
}

/** What's still owed on the stage under way. */
export const stageLeft = (state, p) => Math.max(0, stageCost(state, p.selfBuild.stage) - (p.selfBuild.paid ?? 0));
/** The least you can put in a year: a tenth of the stage (or what's left of it). */
export const minPayment = (state, p) => Math.min(stageLeft(state, p), Math.round(stageCost(state, p.selfBuild.stage) * 0.1));

/**
 * Put money into the next stage, in cash: all of what's left on it if you have it, or whatever
 * you can (a tenth of the stage at least). One payment a year; a stage is done when it's paid.
 */
export function buildStage(ctx, propertyId) {
  const { state } = ctx;
  const p = state.housing.properties.find((x) => x.id === propertyId && nextStage(x)) ?? selfBuilds(state)[0];
  const stage = p && nextStage(p);
  if (!stage) return ctx.toast('Nothing left to build.', 'warn');
  if (yearlyCount(state, `selfBuild.${p.id}`)) return ctx.toast('You\'ve put in what you can this year: the builders come back next year.', 'warn');
  const left = stageLeft(state, p);
  const pay = Math.min(left, Math.floor(Math.max(0, state.finances.cash)));
  if (pay < minPayment(state, p)) return ctx.toast(`${stage.name}: put in at least ${money(minPayment(state, p))} (cash only).`, 'warn');
  ctx.spend(pay, `Building: ${stage.name.toLowerCase()}`);
  bumpYearly(state, `selfBuild.${p.id}`);
  p.selfBuild.spent += pay;
  if (pay < left) {
    p.selfBuild.paid = (p.selfBuild.paid ?? 0) + pay;
    setValue(state, p, p.selfBuild.spent * (p.selfBuild.stage >= LIVABLE ? 1.35 : 1.05) * (p.informal ? 0.5 : 1));
    return ctx.log(`${stage.icon} You put ${money(pay)} into the ${stage.name.toLowerCase()} (${money(left - pay)} to go).`, stage.icon);
  }
  p.selfBuild.paid = 0;
  p.selfBuild.stage += 1;
  if (p.selfBuild.stage >= LIVABLE && p.type !== 'selfbuilt') {
    p.type = 'selfbuilt';
    p.typeName = PROPERTY_TYPES.selfbuilt.name;
    p.condition = 65;
  }
  if (p.selfBuild.stage >= STAGES.length) p.condition = 85;
  // The work you put in is worth more than the cash: a finished house sells for about a third over its cost.
  setValue(state, p, p.selfBuild.spent * (p.selfBuild.stage >= LIVABLE ? 1.35 : 1.05) * (p.informal ? 0.5 : 1));
  const livable = p.selfBuild.stage >= LIVABLE;
  const moved = livable && p.use !== 'primary' && moveIn(ctx, p);
  ctx.log(`${stage.icon} ${stage.name} done on your house.${moved ? ' The roof is on: you moved in, and you\'ll finish it around yourselves.' : p.selfBuild.stage >= STAGES.length ? ' The house is finished.' : ''}`, stage.icon, 'good');
}

/** A year in an informal settlement: clearance or a title. */
function settlementYear(ctx) {
  const { state } = ctx;
  const rng = sideRng(state);
  for (const p of state.housing.properties.filter((x) => x.informal)) {
    const years = state.character.age - (p.purchaseAge ?? state.character.age);
    if (years >= 1 && rng.chance(CLEARANCE_ODDS)) {
      const comp = rng.chance(0.4) ? Math.round(p.value * 0.3) : 0;
      state.housing.properties = state.housing.properties.filter((x) => x.id !== p.id);
      if (comp) ctx.earn(comp, 'Clearance compensation');
      ctx.log(`The settlement was cleared: ${yearNow(state) < 1935 ? 'men with crowbars and carts' : 'bulldozers'} at dawn, and your house with the rest.${comp ? ` The city paid ${money(comp)} in compensation.` : ' Nobody paid anything.'}`, '🚜', 'bad');
      ctx.stat('happiness', -15);
      continue;
    }
    if (years >= 4 && rng.chance(REGULARIZE_ODDS)) {
      p.informal = false;
      p.title = { form: 'sole', share: 1, how: 'title granted when the settlement was regularized', since: state.character.age };
      setValue(state, p, p.value * 2.2);
      ctx.log(`The settlement was regularized: the state granted title deeds, and your house is yours on paper now (worth about ${money(p.value)}).`, '📜', 'milestone');
      ctx.stat('happiness', 8);
    }
  }
}

export const SelfBuiltModule = {
  id: 'selfBuild',
  order: 45.5,
  onAgeUp(ctx) {
    if (!ctx.state.housing?.properties?.length) return;
    settlementYear(ctx);
  },
  actions: {
    buyPlot(ctx) { buyPlot(ctx); },
    shack(ctx) { buildShack(ctx); },
    stage(ctx, propertyId) { buildStage(ctx, propertyId); },
  },
};
