/**
 * The sovereign's own powers, used when you choose to rather than when the year brings them.
 *
 *   Influence    How far the government listens: built by audiences, the State Opening and
 *                state visits, worn away a little each year. It decides whether a warning is
 *                heeded and whether a bid for power can succeed.
 *   Constitutional  The weekly audience (encourage, warn, or leak your view), the State
 *                Opening of Parliament, hosting a state visit, and royal charters.
 *   Executive    A monarch with real powers (a restored throne that chose them, or one who
 *                seized them) rules by decree and can dismiss the government. Every decree
 *                stirs unrest; unrest and unpopularity end in revolution and a republic.
 *   Seizing power  A popular, influential constitutional monarch can suspend parliament and
 *                govern. It may work. If it doesn't, the realm votes on the monarchy.
 *
 * state.royal.influence (0–100), state.royal.unrest (0–100), state.royal.executive
 */
import { yearlyCount, bumpYearly, currentYear } from '../../core/State.js';
import { clamp, Random } from '../../core/Random.js';
import { CROWNS } from './Crown.js';
import { COUNTRIES } from './Countries.js';
import { abolish } from './Houses.js';

const reigning = (state) => Boolean(state.royal?.reigning);
const bump = (r, key, d) => { r[key] = Math.round(clamp((r[key] ?? (key === 'influence' ? 30 : 0)) + d, 0, 100)); };
const pop = (r, d) => { r.popularity = Math.round(clamp((r.popularity ?? 60) + d, 0, 100)); };

/** Decrees an executive monarch can issue: popularity and unrest each one costs or buys. */
export const DECREES = {
  amnesty: { label: '🕊️ A general amnesty', pop: 4, unrest: -6, text: 'You decreed an amnesty for political prisoners. The squares cheered; the security services did not.' },
  works: { label: '🏗️ A programme of public works', pop: 5, unrest: -3, cost: true, text: 'You decreed roads, hospitals and schools in your name. The treasury groaned.' },
  taxes: { label: '💰 Cut taxes by decree', pop: 6, unrest: 2, text: 'You cut taxes by decree. Popular now; the deficit will be someone\'s problem.' },
  press: { label: '📰 Curb the press', pop: -6, unrest: 14, text: 'You curbed the newspapers that criticised you. The criticism moved abroad and online.' },
  crackdown: { label: '🚔 Ban the opposition\'s rallies', pop: -8, unrest: 20, text: 'You banned the opposition\'s rallies. Thousands came anyway.' },
};

/** Whether a bid to rule can work this year, and why not. */
export function seizeCheck(state) {
  const r = state.royal;
  if (!reigning(state)) return { ok: false, reason: 'Only the reigning monarch' };
  if (r.executive) return { ok: false, reason: 'You already rule' };
  if (yearlyCount(state, 'sovereign.seize')) return { ok: false, reason: 'Once a year' };
  if ((r.popularity ?? 60) < 55) return { ok: false, reason: 'Needs 55%+ popularity' };
  return { ok: true, odds: clamp(((r.popularity ?? 60) - 50) / 100 + (r.influence ?? 30) / 200, 0.05, 0.7) };
}

export const SovereignModule = {
  id: 'sovereign',
  order: 33.7,
  onAgeUp(engineCtx) {
    const { state } = engineCtx;
    const r = state.royal;
    if (!r?.reigning) return;
    // A side stream, so the throne's politics don't reshuffle the rest of the life.
    const rng = new Random(((state.world?.seed ?? 1) * 1103515245 + currentYear(state) * 613 + 0x50b) >>> 0);
    const ctx = { ...engineCtx, rng };
    if ((r.influence ?? 30) > 20) bump(r, 'influence', -3);
    if (!r.executive) { bump(r, 'unrest', -10); return; }
    // Rule by decree: unrest ebbs slowly, and a hated ruler falls (restored thrones are watched by Houses.js too).
    bump(r, 'unrest', -4);
    const risk = 0.02 + (r.unrest ?? 0) / 250 + Math.max(0, 45 - (r.popularity ?? 60)) / 300;
    if (rng.chance(risk)) {
      ctx.log('The protests became a revolution. The army would not fire on the crowds, and a provisional government declared a republic.', '🔥', 'bad');
      for (const cc of CROWNS[r.crownId]?.realms ?? []) delete state.world.suspendedParliament?.[cc];
      abolish(ctx, r.crownId);
    } else if ((r.unrest ?? 0) >= 50) ctx.log('Unrest is spreading: strikes, marches, and graffiti on the palace walls.', '🔥', 'warn');
  },
  actions: {
    /** The weekly audience with the prime minister. */
    audience(ctx) {
      const { state } = ctx;
      if (!reigning(state)) return ctx.toast('Only the sovereign', 'warn');
      if (yearlyCount(state, 'sovereign.audience')) return ctx.toast('The audiences this year are done', 'warn');
      if (state.prompts.length) return ctx.toast('Make your decision first.', 'warn');
      bumpYearly(state, 'sovereign.audience');
      return ctx.prompt({ type: 'sovereign.audience', icon: '🤝', title: 'The Weekly Audience', text: 'The prime minister comes to the palace. Nobody takes notes; nothing is ever said about it. The right to be consulted, to encourage and to warn is yours.', options: [
        { id: 'encourage', label: '👍 Encourage the government', hint: 'Builds trust' },
        { id: 'warn', label: '⚠️ Warn against a policy', hint: 'Heeded if they trust you' },
        { id: 'leak', label: '📰 Let your view be known to the papers', hint: 'Popular, but a breach of trust', tone: 'danger' },
      ] });
    },
    /** Open Parliament and read the government's programme from the throne. */
    openParliament(ctx) {
      const { state } = ctx;
      const r = state.royal;
      if (!reigning(state) || r.executive) return ctx.toast(r?.executive ? 'Parliament is suspended under your rule' : 'Only the sovereign', 'warn');
      if (yearlyCount(state, 'sovereign.open')) return ctx.toast('Once a session', 'warn');
      bumpYearly(state, 'sovereign.open');
      bump(r, 'influence', 4);
      pop(r, 1);
      return ctx.log('You opened Parliament in state, crowned and robed, and read the government\'s programme from the throne.', '🏛️', 'good');
    },
    /** Host a foreign head of state: banquet, carriage procession, speeches. */
    stateVisit(ctx) {
      const { state, rng } = ctx;
      const r = state.royal;
      if (!reigning(state)) return ctx.toast('Only the sovereign', 'warn');
      if (yearlyCount(state, 'sovereign.visit')) return ctx.toast('One state visit a year', 'warn');
      bumpYearly(state, 'sovereign.visit');
      const realms = CROWNS[r.crownId]?.realms ?? [];
      const guests = Object.entries(COUNTRIES).filter(([cc]) => !realms.includes(cc));
      const [, guest] = guests.length ? rng.pick(guests) : [null, { name: 'a neighbouring state' }];
      const good = rng.chance(0.8);
      bump(r, 'influence', good ? 5 : 1);
      pop(r, good ? 2 : -2);
      return ctx.log(good
        ? `You hosted the head of state of ${guest.name} on a state visit: a carriage procession, a banquet for 160 and a trade deal signed the next morning.`
        : `The state visit from ${guest.name} went badly: protests along the procession route and a gaffe at the banquet.`, '🌍', good ? 'good' : 'warn');
    },
    /** Grant a royal charter to an institution. */
    charter(ctx) {
      const { state, rng } = ctx;
      if (!reigning(state)) return ctx.toast('Only the sovereign', 'warn');
      if (yearlyCount(state, 'sovereign.charter')) return ctx.toast('One charter a year', 'warn');
      bumpYearly(state, 'sovereign.charter');
      pop(state.royal, 1);
      const who = rng.pick(['a new university', 'a learned society of engineers', 'a city that asked for city status', 'a national ballet company', 'a medical college', 'a veterans\' charity']);
      return ctx.log(`You granted a royal charter to ${who}. It will carry the word "Royal" for as long as it exists.`, '📜', 'good');
    },
    /** Suspend parliament and rule. */
    seizePower(ctx) {
      const { state, rng } = ctx;
      const r = state.royal;
      const check = seizeCheck(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'sovereign.seize');
      if (rng.chance(check.odds)) {
        r.executive = true;
        state.world.suspendedParliament ??= {};
        for (const cc of CROWNS[r.crownId]?.realms ?? []) state.world.suspendedParliament[cc] = currentYear(state);
        // Whoever governed is out: ministers you name serve at your pleasure.
        if (/_pm$|premier/.test(state.politics?.office?.id ?? '')) ctx.emit('politics:leave', { reason: 'Dismissed when the monarch suspended parliament' });
        bump(r, 'unrest', 30);
        pop(r, -10);
        return ctx.log('You dismissed the government, suspended parliament and announced that you would govern until a new constitution was ready. The army stood by you. The world\'s press called it a royal coup.', '⚔️', 'milestone');
      }
      pop(r, -25);
      bump(r, 'influence', -40);
      for (const cc of CROWNS[r.crownId]?.realms ?? []) (state.world.pendingReferendum ??= {})[cc] = currentYear(state) + 1;
      return ctx.log('Your bid for power failed: the army stayed in its barracks and parliament met anyway. It voted for a referendum on the monarchy.', '⚔️', 'bad');
    },
    /** Rule by decree (executive monarchs). */
    decree(ctx, id) {
      const { state } = ctx;
      const r = state.royal;
      const d = DECREES[id];
      if (!reigning(state) || !r.executive) return ctx.toast('Only a ruling monarch decrees', 'warn');
      if (!d) return undefined;
      if (yearlyCount(state, 'sovereign.decree') >= 2) return ctx.toast('Two decrees a year', 'warn');
      bumpYearly(state, 'sovereign.decree');
      pop(r, d.pop);
      bump(r, 'unrest', d.unrest);
      return ctx.log(d.text, '⚖️', d.pop >= 0 ? 'good' : 'warn');
    },
    /** Dismiss the ministers and appoint your own. */
    dismissGovernment(ctx) {
      const { state, rng } = ctx;
      const r = state.royal;
      if (!reigning(state) || !r.executive) return ctx.toast('Only a ruling monarch', 'warn');
      if (yearlyCount(state, 'sovereign.dismiss')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'sovereign.dismiss');
      const liked = rng.chance(0.5);
      pop(r, liked ? 4 : -5);
      bump(r, 'unrest', liked ? -2 : 8);
      return ctx.log(liked ? 'You dismissed your ministers and appointed technocrats. The markets liked it.' : 'You dismissed your ministers. The new ones were courtiers, and everyone could tell.', '🗳️', liked ? 'good' : 'warn');
    },
    /** Give the powers back to parliament. */
    restoreConstitution(ctx) {
      const { state } = ctx;
      const r = state.royal;
      if (!reigning(state) || !r.executive) return undefined;
      r.executive = false;
      for (const cc of CROWNS[r.crownId]?.realms ?? []) delete state.world.suspendedParliament?.[cc];
      bump(r, 'unrest', -40);
      pop(r, 8);
      return ctx.log('You restored parliament and reigned as a constitutional monarch again. Elections followed within the year.', '🏛️', 'milestone');
    },
  },
  resolvers: {
    audience(ctx, data, optionId) {
      const { state, rng } = ctx;
      const r = state.royal;
      if (optionId === 'encourage') { bump(r, 'influence', 6); return ctx.log('You encouraged the prime minister. The relationship is warmer for it.', '🤝', 'good'); }
      if (optionId === 'leak') {
        bump(r, 'influence', -15);
        pop(r, rng.chance(0.5) ? 4 : -4);
        return ctx.log('"The monarch is said to be dismayed": your view was all over the front pages. The government was furious.', '📰', 'warn');
      }
      const heeded = rng.chance(0.15 + (r.influence ?? 30) / 150);
      bump(r, 'influence', heeded ? 2 : -2);
      return ctx.log(heeded ? 'You warned the prime minister against a policy. Three weeks later it was quietly dropped.' : 'You warned the prime minister. They listened politely and carried on.', '⚠️', heeded ? 'good' : 'info');
    },
  },
};
