/**
 * Credit cards. Card debt is still negative cash (so every purchase and bill
 * works the same); this module decides what it costs you.
 *
 *   cards      the cards in your wallet — each adds to your limit
 *   APR        your cards' rate (an implicit basic card at 21.5% if you hold none)
 *   rewards    cash back / points on everyday spending — worth it only if
 *              you pay in full; interest swamps them otherwise
 *   strategy   'payoff' (pay down hard) or 'minimum' (the minimum-payment trap:
 *              more to spend now, a balance that barely moves)
 *   transfer   a 0% balance-transfer promo on part of the debt, for two years
 *
 * state.finances.cards = { held: [{ id, typeId, opened }], strategy, transfer: { amount, untilAge } | null, rewards }
 */
import { clamp } from '../../core/Random.js';

export const CARD_TYPES = {
  secured: { name: 'Secured Card', icon: '🔒', apr: 0.26, fee: 0, rewards: 0, minScore: 300, deposit: 500, desc: 'A $500 deposit is your limit. Builds credit from nothing.' },
  basic: { name: 'Basic Card', icon: '💳', apr: 0.215, fee: 0, rewards: 0, minScore: 580, desc: 'No frills, no fee.' },
  store: { name: 'Store Card', icon: '🛍️', apr: 0.3, fee: 0, rewards: 0.01, minScore: 600, desc: '5% off at one store — about 1% overall. Brutal APR.' },
  cashback: { name: 'Cash-Back Card', icon: '💵', apr: 0.24, fee: 0, rewards: 0.015, minScore: 670, desc: '1.5% back on everything.' },
  transfer: { name: 'Balance-Transfer Card', icon: '🔁', apr: 0.24, fee: 0, rewards: 0, minScore: 670, promo: true, desc: '0% on transferred balances for two years (4% transfer fee).' },
  travel: { name: 'Travel Rewards Card', icon: '✈️', apr: 0.26, fee: 95, rewards: 0.02, minScore: 690, desc: '2 points per dollar, worth about 2% in travel.' },
  premium: { name: 'Premium Card', icon: '💎', apr: 0.27, fee: 695, rewards: 0.03, minScore: 740, perks: true, desc: 'Lounges and credits; about 3% back if you use the perks.' },
};

export const DEFAULT_APR = 0.215;
export const MAX_CARDS = 5;
const TRANSFER_FEE = 0.04;
const PROMO_YEARS = 2;

export const cardState = (state) => state.finances.cards;
export const heldCards = (state) => cardState(state)?.held ?? [];

/** Your APR: the average of your cards' rates (most people carry on several). */
export function cardApr(state) {
  const held = heldCards(state);
  if (!held.length) return DEFAULT_APR;
  return held.reduce((s, c) => s + CARD_TYPES[c.typeId].apr, 0) / held.length;
}

/** More cards (that you've had a while) mean a bigger total limit. Secured-only = the deposit. */
export function limitMultiplier(state) {
  const held = heldCards(state).filter((c) => c.typeId !== 'secured');
  if (!held.length) return heldCards(state).length ? null : 1;
  return 1 + (held.length - 1) * 0.4;
}

export function applyCheck(state, typeId) {
  const t = CARD_TYPES[typeId];
  if (!t) return { ok: false, reason: 'Unknown card' };
  if (state.character.age < 18) return { ok: false, reason: '18+ (or a parent co-signer)' };
  if (heldCards(state).length >= MAX_CARDS) return { ok: false, reason: `${MAX_CARDS} cards is plenty` };
  if (heldCards(state).some((c) => c.typeId === typeId)) return { ok: false, reason: 'Already have one' };
  const score = state.housing?.credit?.score ?? 650;
  if (score < t.minScore) return { ok: false, reason: `Needs a ${t.minScore}+ credit score` };
  if (t.deposit && state.finances.cash < t.deposit) return { ok: false, reason: `$${t.deposit} deposit` };
  return { ok: true };
}

/** Years and total interest to clear a balance paying only the minimum (interest + 1%). */
export function minimumPayoff(balance, apr) {
  let b = balance;
  let paid = 0;
  let years = 0;
  while (b > 25 && years < 60) {
    const pay = Math.max(b * (apr + 0.01) * 1.0, Math.min(b, 300));
    paid += pay;
    b = b * (1 + apr) - pay;
    years += 1;
  }
  return { years, interest: Math.round(paid - balance) };
}

/** Yearly paydown the household budgets for card debt (Finances obligations). */
export function cardObligation(state, debt) {
  const c = cardState(state);
  const apr = cardApr(state);
  return debt * (c?.strategy === 'minimum' ? apr + 0.01 : apr + 0.25);
}

/**
 * Year-end: annual fees, rewards on spending, and interest (with any 0% promo).
 * Returns the interest charged. Called by Finances after living costs.
 */
export function settleCards(ctx, { living }) {
  const { state } = ctx;
  const f = state.finances;
  const c = cardState(state);
  let fees = 0;
  for (const card of c.held) fees += CARD_TYPES[card.typeId].fee;
  if (fees) {
    f.cash -= fees;
    f.ledger.expenses.push({ reason: 'Card annual fees', amount: fees });
  }
  // Rewards on everyday spending, credited as statement credits.
  const rate = Math.max(0, ...c.held.map((x) => CARD_TYPES[x.typeId].rewards));
  const rewards = Math.round(living * rate);
  if (rewards > 0) {
    f.cash += rewards;
    c.rewards += rewards;
  }
  if (c.held.some((x) => CARD_TYPES[x.typeId].perks)) ctx.stat('happiness', 1);
  // Promo balance shrinks as the debt does, and expires.
  const debt = Math.max(0, -f.cash);
  if (c.transfer) {
    c.transfer.amount = Math.min(c.transfer.amount, debt);
    if (state.character.age >= c.transfer.untilAge || c.transfer.amount <= 0) {
      if (c.transfer.amount > 0) ctx.log(`Your 0% balance-transfer promo ended. The remaining $${c.transfer.amount.toLocaleString()} now accrues ${(cardApr(state) * 100).toFixed(1)}% APR.`, '🔁', 'warn');
      c.transfer = null;
    }
  }
  const promo = c.transfer?.amount ?? 0;
  const interest = Math.round(Math.max(0, debt - promo) * cardApr(state));
  if (c.strategy === 'minimum' && debt > 3000 && state.character.age % 5 === 0) {
    const p = minimumPayoff(debt, cardApr(state));
    ctx.log(`Paying only the minimum on $${debt.toLocaleString()}, you'd be debt-free in ${p.years >= 60 ? 'never' : `${p.years} years`} after $${p.interest.toLocaleString()} in interest.`, '🐌', 'warn');
  }
  return { interest, fees, rewards };
}

export const CreditCards = {
  id: 'cards',
  order: 89,

  init(state) {
    state.finances.cards ??= { held: [], strategy: 'payoff', transfer: null, rewards: 0 };
  },

  actions: {
    apply(ctx, typeId) {
      const { state, rng } = ctx;
      const check = applyCheck(state, typeId);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const t = CARD_TYPES[typeId];
      ctx.emit('credit:event', { type: 'inquiry' });
      // Issuers also weigh income and existing debt.
      const debt = Math.max(0, -state.finances.cash);
      const income = state.finances.lastYear?.gross ?? 0;
      if (!t.deposit && debt > Math.max(5000, income * 0.5) && !rng.chance(0.3)) {
        return ctx.log(`${t.name}: application denied — too much existing debt.`, '🙅', 'warn');
      }
      if (t.deposit) ctx.spend(t.deposit, 'Secured card deposit');
      cardState(state).held.push({ id: rng.id('card_'), typeId, opened: state.character.age, deposit: t.deposit ?? 0 });
      ctx.log(`You were approved for a ${t.name}.`, t.icon, 'good');
    },
    close(ctx, id) {
      const { state } = ctx;
      const c = cardState(state);
      const card = c.held.find((x) => x.id === id);
      if (!card) return;
      c.held = c.held.filter((x) => x.id !== id);
      if (card.deposit) state.finances.cash += card.deposit;
      ctx.log(`You closed your ${CARD_TYPES[card.typeId].name}.${Math.max(0, -state.finances.cash) > 0 ? ' Your limit shrank, so your utilization went up.' : ''}`, '✂️');
    },
    strategy(ctx, mode) {
      if (!['payoff', 'minimum'].includes(mode)) return;
      cardState(ctx.state).strategy = mode;
      ctx.toast(mode === 'minimum' ? 'Minimum payments: more spending money, much slower payoff.' : 'Paying down card debt aggressively.', 'info');
    },
    /** Move your balance to a 0% promo card. */
    transfer(ctx) {
      const { state } = ctx;
      const c = cardState(state);
      if (!c.held.some((x) => CARD_TYPES[x.typeId].promo)) return ctx.toast('You need a balance-transfer card.', 'warn');
      if (c.transfer) return ctx.toast('You already have a promo balance.', 'warn');
      const debt = Math.max(0, -state.finances.cash);
      if (debt < 500) return ctx.toast('Nothing worth transferring.', 'warn');
      const fee = Math.round(debt * TRANSFER_FEE);
      ctx.spend(fee, 'Balance transfer fee', { allowDebt: true });
      c.transfer = { amount: debt + fee, untilAge: state.character.age + PROMO_YEARS };
      ctx.log(`You moved $${debt.toLocaleString()} to a 0% promo for two years ($${fee.toLocaleString()} fee). Pay it off before the rate jumps.`, '🔁', 'good');
    },
  },
};

/** Utilization (0–1+) for the credit score: balances against your total limit. */
export const utilization = (debt, limit) => clamp(limit > 0 ? debt / limit : 1, 0, 3);
