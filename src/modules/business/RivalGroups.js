/**
 * Competing conglomerates: holding groups that own businesses across
 * industries and cities, the way yours does.
 *
 *   roll-up         buys up one industry — often yours — and merges what it buys
 *   private equity  buys, pumps up and sells on; bids for your companies
 *   diversified     buys a bit of everything
 *
 * Each year a group grows its war chest, buys independents (in your markets
 * when it's hunting you), sometimes spins a company off, bids for your
 * businesses, bids against you when you buy, and — if you've taken a company
 * public and don't control it — may try a hostile takeover. With a big
 * enough treasury you can buy a whole rival group.
 *
 * state.business.rivalGroups = [{ name, style, treasury, founded, moves: [text], acquisitions }]
 * A group's companies are the NPC organizations whose business.parent is its name.
 */
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { GROUPS } from './Rivals.js';
import { appraise, setContestingGroup, addToGroup, conglomerateOf, holdingsCap } from './Conglomerate.js';
import { canAfford } from '../../core/State.js';
import { mergerReview } from './Regulation.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
export const GROUP_STYLES = {
  rollup: { label: 'Industry roll-up', icon: '🧲', buy: 0.5, offer: 0.07 },
  pe: { label: 'Private equity', icon: '💼', buy: 0.4, offer: 0.1 },
  diversified: { label: 'Diversified conglomerate', icon: '🏛️', buy: 0.3, offer: 0.05 },
};
const STYLE_FOR = { 'Summit Capital Partners': 'pe', 'Northstar Holdings': 'diversified', 'Keystone Brands': 'rollup', 'Meridian Group': 'diversified', 'Ironwood Equity': 'pe', 'Atlas Consolidated': 'rollup' };
const NEW_GROUPS = ['Crestline Partners', 'Harborview Capital', 'Pinnacle Brands', 'Redwood Holdings', 'Sterling Industries', 'Bluewater Group'];

export function rivalGroups(state) {
  state.business ??= {};
  state.business.rivalGroups ??= GROUPS.map((name, i) => ({ name, style: STYLE_FOR[name] ?? 'diversified', treasury: 60_000_000 + i * 35_000_000, founded: 1950 + i * 9, moves: [], acquisitions: 0 }));
  return state.business.rivalGroups;
}

/** The companies a group owns. */
export const portfolio = (state, g) => Object.values(state.orgs?.byId ?? {}).filter((o) => o.business && !o.closed && o.business.parent === g.name);

const yours = (state) => [state.business.current, ...(state.business.holdings ?? [])].filter(Boolean);
const yourMarkets = (state) => new Set(yours(state).flatMap((b) => [state.orgs?.byId?.[b.orgId]?.regionId ?? b.regionId, ...(state.orgs?.byId?.[b.orgId]?.branches ?? []).map((x) => x.regionId)]).filter(Boolean));

/** A group's estimated worth: its companies at appraisal plus its cash. */
export function groupValue(state, g) {
  return portfolio(state, g).reduce((s, o) => s + appraise(state, o).price, 0) + g.treasury;
}

/** What it would take to buy the whole group (a 30% control premium on its companies). */
export const takeoverPrice = (state, g) => Math.round(portfolio(state, g).reduce((s, o) => s + appraise(state, o).price, 0) * 1.3);

function note(g, text) {
  g.moves = [...g.moves.slice(-4), text];
}

/** Once a year, after your businesses' books close. */
export function rivalGroupsTick(ctx) {
  const { state, rng } = ctx;
  const groups = rivalGroups(state);
  const markets = yourMarkets(state);
  const myTypes = new Set(yours(state).map((b) => b.typeId));
  let offered = state.prompts.some((p) => ['business.groupOffer', 'business.hostileBid'].includes(p.type));
  const bidder = groups.length ? rng.pick(groups) : null;
  for (const g of groups) {
    const style = GROUP_STYLES[g.style] ?? GROUP_STYLES.diversified;
    const owned = portfolio(state, g);
    g.treasury = Math.round(g.treasury * 1.04 + owned.reduce((s, o) => s + (o.business.staff ?? 5) * 6000, 0));
    // Buy an independent: roll-ups hunt your industry; everyone prefers your markets.
    if (rng.chance(style.buy)) {
      const pool = Object.values(state.orgs?.byId ?? {}).filter((o) => o.business && !o.closed && o.owner?.kind === 'npc' && !o.business.parent && BUSINESS_TYPES[o.business.typeId] && !BUSINESS_TYPES[o.business.typeId].startup);
      const hunt = pool.filter((o) => markets.has(o.regionId) && (g.style !== 'rollup' || myTypes.has(o.business.typeId)));
      // Most deals happen elsewhere; roll-ups hunting your industry come for your markets more often.
      const target = rng.pick(hunt.length && rng.chance(g.style === 'rollup' ? 0.4 : 0.15) ? hunt : pool.filter((o) => !markets.has(o.regionId)).length ? pool.filter((o) => !markets.has(o.regionId)) : pool);
      if (target) {
        const price = appraise(state, target).price;
        if (g.treasury >= price) {
          g.treasury -= price;
          g.acquisitions += 1;
          // A roll-up folds it into the company it already owns in that industry and city.
          const sibling = g.style === 'rollup' ? owned.find((o) => o.business.typeId === target.business.typeId && o.regionId === target.regionId) : null;
          if (sibling) {
            sibling.business.scale = (sibling.business.scale ?? 1) + (target.business.scale ?? 1);
            sibling.business.staff = (sibling.business.staff ?? 1) + (target.business.staff ?? 1);
            sibling.business.reputation = Math.max(sibling.business.reputation ?? 50, target.business.reputation ?? 50);
            target.closed = state.character.age;
            target.mergedInto = sibling.id;
            note(g, `bought ${target.name} and merged it into ${sibling.name}`);
          } else {
            target.business.parent = g.name;
            target.owner = { kind: 'npc', name: g.name, pct: 1 };
            target.business.reputation = Math.min(90, (target.business.reputation ?? 50) + 3);
            target.business.strategy = rng.pick(['expander', 'marketer', 'discounter']);
            note(g, `bought ${target.name}`);
          }
          if (markets.has(target.regionId) && myTypes.has(target.business.typeId)) ctx.log(`${g.name} (${style.label.toLowerCase()}) bought ${target.name}, a competitor of yours, for about ${money(price)}. Expect a better-funded rival.`, style.icon, 'warn');
        }
      }
    }
    // Spin-offs: private equity sells on what it has fixed up.
    if (g.style === 'pe' && owned.length > 2 && rng.chance(0.15)) {
      const o = rng.pick(owned);
      delete o.business.parent;
      o.owner = { kind: 'npc', name: o.name.split(' ')[0], pct: 1 };
      g.treasury += appraise(state, o).price;
      note(g, `sold ${o.name}`);
    }
    // A bid for one of your companies: one group a year looks, and only at companies worth $1M+.
    const mine = yours(state).filter((b) => b.valuation >= 1_000_000 && !BUSINESS_TYPES[b.typeId].startup);
    if (!offered && g === bidder && mine.length && rng.chance(style.offer)) {
      const b = rng.pick(mine);
      const price = Math.round(b.valuation * rng.float(1.15, 1.5));
      if (g.treasury >= price) {
        offered = true;
        ctx.prompt({ type: 'business.groupOffer', icon: style.icon, title: `${g.name} wants ${b.name}`, text: `${g.name}, a ${style.label.toLowerCase()} with ${owned.length} companies, offered ${money(price)} for ${b.name}. Your share: ${money(price * b.ownerPct)}.`, options: [{ id: 'accept', label: '✍️ Sell to them' }, { id: 'decline', label: '🙅 Not for sale' }], data: { bizId: b.id, group: g.name, price } });
      }
    }
    // Hostile takeovers of public companies you don't control.
    const target = yours(state).find((b) => b.public && b.ownerPct < 0.5);
    if (!offered && target && rng.chance(0.08) && g.treasury >= target.valuation) {
      offered = true;
      const price = Math.round(target.valuation * rng.float(1.25, 1.45));
      ctx.prompt({ type: 'business.hostileBid', icon: '⚔️', title: `Hostile bid for ${target.name}`, text: `${g.name} went straight to your shareholders with a ${money(price)} tender offer for ${target.name}. You own ${Math.round(target.ownerPct * 100)}% — not enough to block it alone.`, options: [{ id: 'accept', label: '🤝 Accept the premium' }, { id: 'fight', label: '🛡️ Fight it', hint: `≈${money(target.valuation * 0.02)} in defense costs; you might lose` }], data: { bizId: target.id, group: g.name, price } });
    }
  }
  // Groups come and go: a new one forms when the field thins out.
  if (groups.length < 4 && rng.chance(0.2)) {
    const name = NEW_GROUPS.find((n) => !groups.some((g) => g.name === n));
    if (name) groups.push({ name, style: rng.pick(Object.keys(GROUP_STYLES)), treasury: rng.int(40, 200) * 1_000_000, founded: state.character.birthYear + state.character.age, moves: ['was founded'], acquisitions: 0 });
  }
}

setContestingGroup((state, rng) => {
  const groups = state.business?.rivalGroups ?? [];
  return groups.length && rng.chance(0.25) ? rng.pick(groups).name : null;
});

/** Buy a whole rival group: its companies join your holding company (the rest are sold on). */
export function bidForGroup(ctx, name) {
  const { state, rng } = ctx;
  const c = conglomerateOf(state);
  if (!c) return ctx.toast('Form a holding company first.', 'warn');
  const groups = rivalGroups(state);
  const g = groups.find((x) => x.name === name);
  if (!g) return;
  const companies = portfolio(state, g);
  const price = takeoverPrice(state, g);
  const fromTreasury = Math.min(c.treasury, price);
  if (price - fromTreasury > 0 && !canAfford(state, price - fromTreasury)) return ctx.toast(`Buying ${g.name} takes ${money(price)}; the treasury has ${money(c.treasury)}.`, 'warn');
  // Their board might say no.
  if (rng.chance(0.25)) {
    c.treasury -= Math.round(price * 0.005);
    return ctx.log(`${g.name}'s board rejected your offer of ${money(price)}. Advisers' fees: ${money(price * 0.005)}.`, '⚔️', 'warn');
  }
  c.treasury -= fromTreasury;
  if (price > fromTreasury) ctx.spend(price - fromTreasury, `Takeover of ${g.name}`, { credit: true });
  const room = Math.max(0, holdingsCap(state) - (state.business.holdings ?? []).length);
  const ranked = [...companies].sort((a, b) => appraise(state, b).profit - appraise(state, a).profit);
  let kept = 0;
  let soldBack = 0;
  for (const o of ranked) {
    const value = appraise(state, o).price;
    // Regulators make you sell on any company that would give you too much of a market.
    if (kept < room && mergerReview(state, o).divest === 0 && mergerReview(state, o).ok) {
      addToGroup(ctx, o, value);
      kept += 1;
    } else {
      delete o.business.parent;
      o.owner = { kind: 'npc', name: o.name.split(' ')[0], pct: 1 };
      soldBack += value;
    }
  }
  c.treasury += soldBack + g.treasury;
  state.business.rivalGroups = groups.filter((x) => x !== g);
  c.acquisitions = (c.acquisitions ?? 0) + kept;
  ctx.log(`${c.name} bought ${g.name} for ${money(price)}: ${kept} companies joined the group${soldBack ? `, the rest were sold on for ${money(soldBack)}` : ''}, and its ${money(g.treasury)} war chest is yours.`, '🏛️', 'milestone');
}
