/**
 * Dynamic competitors. Every rival in your market has a strategy and makes
 * moves each year — some against you, some in reaction to you:
 *
 *   discounter   starts price wars that pull customers from anyone not
 *                matching on price
 *   premium      chases quality and reputation, charges more
 *   expander     opens new locations when it's doing well
 *   poacher      lures your best people away
 *   marketer     ad blitzes that lift its name and dent yours
 *
 * Fleet and crew rivals also underbid you for contracts. Outside groups
 * (private equity, national chains, conglomerates) buy rivals and roll
 * them up into bigger competitors, and a national chain sometimes opens in
 * your town.
 *
 * Rival data lives on org.business: { strategy, scale, price,
 * priceWarUntil, parent, lastMove }.
 */
import { clamp } from '../../core/Random.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';

export const RIVAL_STRATEGIES = {
  discounter: { label: 'Discounter', icon: '🏷️' },
  premium: { label: 'Premium', icon: '✨' },
  expander: { label: 'Expanding', icon: '🏗️' },
  poacher: { label: 'Talent raider', icon: '🧲' },
  marketer: { label: 'Big advertiser', icon: '📣' },
};
const GROUPS = ['Summit Capital Partners', 'Northstar Holdings', 'Keystone Brands', 'Meridian Group', 'Ironwood Equity', 'Atlas Consolidated'];

/** Fill in strategy and scale for rivals created before they had them. */
export function rivalProfile(rng, o) {
  const b = o.business;
  b.strategy ??= rng.pick(Object.keys(RIVAL_STRATEGIES));
  b.scale ??= 1;
  b.price ??= b.strategy === 'discounter' ? 'budget' : b.strategy === 'premium' ? 'premium' : 'standard';
  return b;
}

/** A competitor's pull on customers in reputation points: size and price matter, not just reputation. */
export function effectiveReputation(b, age) {
  const priceEdge = b.price === 'budget' ? 8 : b.price === 'premium' ? (b.reputation >= 70 ? 4 : -5) : 0;
  return (b.reputation ?? 50) + 10 * ((b.scale ?? 1) - 1) + priceEdge + (b.priceWarUntil >= age ? 4 : 0);
}

/** Your share of the market: your pull against every rival's. */
export function marketShare(state, biz, rivals) {
  const age = state.character.age;
  const pull = (r, scale) => Math.max(5, r) ** 2 * scale;
  const mine = pull(effectiveReputation({ reputation: biz.reputation, scale: biz.scale, price: biz.priceLevel }, age), biz.scale ?? 1);
  const theirs = rivals.reduce((s, o) => s + pull(effectiveReputation(o.business, age), o.business.scale ?? 1), 0);
  return mine / Math.max(1, mine + theirs);
}

/** Is a rival waging a price war you're not matching? */
export const underPriceWar = (state, biz, rivals) => (biz.priceLevel ?? 'standard') !== 'budget' && rivals.some((o) => (o.business.priceWarUntil ?? -1) >= state.character.age);

/**
 * The year's moves in your market. `npc` makes a new rival (the market's
 * npcBusiness), `rng` is the side RNG. Returns what happened, for the log.
 */
export function rivalsTick(ctx, biz, rivals, { rng, npc }) {
  const { state } = ctx;
  const age = state.character.age;
  const type = BUSINESS_TYPES[biz.typeId];
  const lines = [];
  const say = (text, icon = '🏁', kind) => { if (lines.length < 3) { lines.push(text); ctx.log(text, icon, kind); } };
  for (const o of rivals) rivalProfile(rng, o);
  const avgRep = rivals.length ? rivals.reduce((s, o) => s + effectiveReputation(o.business, age), 0) / rivals.length : 50;
  const myRep = effectiveReputation({ reputation: biz.reputation, scale: biz.scale, price: biz.priceLevel }, age);

  for (const o of rivals) {
    const b = o.business;
    // Reacting to you: a market leader draws price cuts and copycat expansion.
    if (myRep > avgRep + 15 && b.strategy !== 'discounter' && rng.chance(0.15)) {
      b.strategy = 'discounter';
      b.lastMove = 'switched to discounting to fight you';
    }
    if ((biz.scale ?? 1) > (b.scale ?? 1) + 1 && b.strategy !== 'expander' && rng.chance(0.1)) b.strategy = 'expander';
    if (!rng.chance(0.3)) continue;
    switch (b.strategy) {
      case 'discounter':
        if ((b.priceWarUntil ?? -1) < age) {
          b.price = 'budget';
          b.priceWarUntil = age + rng.int(1, 2);
          b.lastMove = 'started a price war';
          say(`${o.name} slashed its prices. ${biz.priceLevel === 'budget' ? 'You\'re already the cheap option.' : 'A price war is pulling customers away — match their prices or out-serve them.'}`, '🏷️', 'warn');
        }
        break;
      case 'premium':
        b.reputation = Math.round(clamp(b.reputation + rng.int(2, 6), 10, 95));
        b.price = 'premium';
        b.lastMove = 'renovated and went upscale';
        say(`${o.name} renovated and went upscale.`, '✨');
        break;
      case 'expander':
        if (b.reputation >= 45) {
          b.scale = (b.scale ?? 1) + 1;
          b.staff = Math.round((b.staff ?? type.staff) + type.staff * rng.float(0.7, 1.1));
          b.lastMove = `opened location #${b.scale}`;
          say(`${o.name} opened location #${b.scale}.`, '🏗️', 'warn');
        }
        break;
      case 'poacher':
        if (biz.staff.headcount >= 3 && biz.staff.morale < 70) {
          // You hire a replacement, but it costs a recruiting fee and the new person needs time to get up to speed.
          const fee = Math.round(type.wage * 0.25);
          biz.cash -= fee;
          biz.staff.productivity = Math.max(0, biz.staff.productivity - 3);
          biz.staff.morale = Math.max(0, biz.staff.morale - 2);
          b.staff = (b.staff ?? 1) + 1;
          b.lastMove = 'hired away one of your people';
          say(`${o.name} hired away one of your best people with a raise. Replacing them cost ${'$'}${fee.toLocaleString()} and some momentum. (Higher pay and morale make your staff harder to poach.)`, '🧲', 'warn');
        }
        break;
      case 'marketer':
        b.reputation = Math.round(clamp(b.reputation + rng.int(1, 4), 10, 95));
        biz.reputation = Math.max(0, biz.reputation - rng.int(1, 3));
        b.lastMove = 'ran an ad blitz';
        say(`${o.name} ran an ad blitz across town.`, '📣');
        break;
      default:
    }
    // Fleets and crews: underbidding for your open offers.
    const offers = biz.ops?.offers?.filter((k) => !k.renewal) ?? [];
    if (offers.length && rng.chance(b.price === 'budget' ? 0.35 : 0.15)) {
      const lost = rng.pick(offers);
      biz.ops.offers = biz.ops.offers.filter((k) => k !== lost);
      b.lastMove = `underbid you for ${lost.client}`;
      say(`${o.name} underbid you for the ${lost.client} contract.`, '📉', 'warn');
    }
  }

  // Outside money: a group buys a rival and rolls it into something bigger.
  const independents = rivals.filter((o) => !o.business.parent);
  if (independents.length && rng.chance(0.05)) {
    const target = rng.pick(independents);
    const group = rng.pick(GROUPS);
    target.business.parent = group;
    target.owner = { kind: 'npc', name: group, pct: 1 };
    target.business.reputation = Math.round(clamp(target.business.reputation + 5, 10, 95));
    target.business.scale = (target.business.scale ?? 1) + 1;
    target.business.strategy = 'expander';
    target.business.lastMove = `bought by ${group}`;
    say(`${group} bought ${target.name} and is pouring money into it.`, '🏦', 'warn');
  }
  // Two rivals merge.
  if (rivals.length >= 3 && rng.chance(0.03)) {
    const [a, b] = rng.shuffle([...rivals]);
    a.business.scale = (a.business.scale ?? 1) + (b.business.scale ?? 1);
    a.business.staff = (a.business.staff ?? 1) + (b.business.staff ?? 1);
    a.business.reputation = Math.max(a.business.reputation, b.business.reputation);
    a.business.lastMove = `merged with ${b.name}`;
    b.closed = age;
    b.mergedInto = a.id;
    say(`${a.name} and ${b.name} merged into one bigger competitor.`, '🔗', 'warn');
  }
  // A national chain moves into town.
  if (!type.startup && rng.chance(state.economy?.phase === 'recession' ? 0.01 : 0.03)) {
    const group = rng.pick(GROUPS);
    const o = npc();
    Object.assign(o.business, { parent: group, scale: rng.int(3, 6), reputation: rng.int(55, 75), strategy: rng.pick(['discounter', 'marketer', 'expander']), lastMove: 'entered your market' });
    o.business.staff = Math.round(type.staff * o.business.scale * 0.6);
    o.business.price = o.business.strategy === 'discounter' ? 'budget' : 'standard';
    o.name = `${group.split(' ')[0]} ${type.name}`;
    o.owner = { kind: 'npc', name: group, pct: 1 };
    o.business.tickedAge = age;
    say(`A national chain — ${o.name}, owned by ${group} — opened in your market.`, '🏬', 'warn');
  }
  return lines;
}
