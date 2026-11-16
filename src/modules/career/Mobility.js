/**
 * Moving between employers: negotiating the offer, your name in the field, garden leave.
 *
 *   Negotiation  an offer in hand (a headhunter's, or the best from a search) can be negotiated
 *                once: more base pay, a signing bonus, the bigger title, a bigger share grant, or
 *                a bluff about a better offer elsewhere. Each shows its odds (your negotiation
 *                skill and your name in the field); pushing too hard can lose the offer.
 *   Reputation   career/Reputation.js: built by strong years and finished work, it brings the
 *                headhunters and better offers (JobMarket reads it).
 *   Levelling    titles mean different things at different sizes: a big firm hires a small one's
 *                senior people a rung down (for more money), a small firm hires a big one's a
 *                rung up (JobMarket.makeOffer).
 *   Garden leave leaving a senior job for a rival, you're paid to stay at home for a few months
 *                before you start (JobMarket.acceptOffer).
 */
import { clamp } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { skill as skillOf, practise } from '../life/Skills.js';
import { getProfession } from './JobTrees.js';
import { nextLevels } from './Ladder.js';
import { levelCheck } from './CareerEngine.js';
import { acceptOffer, offerSummary } from './JobMarket.js';
import { reputationOf, reputationYear } from './Reputation.js';

const ASKS = {
  base: { label: '💵 Ask for more base pay', base: 0.45, withdraw: 0.1 },
  signing: { label: '✍️ Ask for a signing bonus', base: 0.6, withdraw: 0.05 },
  title: { label: '🪜 Ask for the bigger title', base: 0.3, withdraw: 0.1 },
  equity: { label: '📈 Ask for a bigger share grant', base: 0.5, withdraw: 0.05 },
  bluff: { label: '🃏 Say you have a better offer elsewhere', base: 0.45, withdraw: 0.35 },
};
export const askOdds = (state, kind, offer) => clamp(ASKS[kind].base + skillOf(state, 'negotiation') / 300 + reputationOf(state, offer?.professionId) / 400 + (offer?.headhunter ? 0.08 : 0), 0.08, 0.9);

function titleUp(state, offer) {
  const p = getProfession(offer.professionId);
  return p ? nextLevels(p, offer.employer.size, offer.levelId).find((l) => !l.appointed && levelCheck(state, l).ok && !levelCheck(state, l).clearanceNeeded) ?? null : null;
}
/** The asks that make sense for this offer. */
export function asksFor(state, offer) {
  return Object.keys(ASKS).filter((k) => {
    if (offer.transfer) return false;
    if (k === 'signing') return !offer.signing && offer.employer.sector === 'private';
    if (k === 'title') return Boolean(titleUp(state, offer));
    if (k === 'equity') return offer.employer.sector === 'private' && ['large', 'enterprise'].includes(offer.employer.size) && yearNow(state) >= 1990;
    return true;
  });
}

/** Open the negotiation over an offer. */
export function openNegotiation(ctx, offer) {
  const { state } = ctx;
  const asks = asksFor(state, offer);
  ctx.prompt({ type: 'mobility.negotiate', icon: '🤝', title: 'Negotiate', text: `${offerSummary(offer)}.\nYou get one ask before they lose patience.`,
    options: [...asks.map((k) => ({ id: k, label: `${ASKS[k].label} (${Math.round(askOdds(state, k, offer) * 100)}%)` })), { id: 'take', label: '✅ Take it as it is' }, { id: 'walk', label: '🙅 Walk away' }],
    data: { offer } });
}

function finalPrompt(ctx, offer, said) {
  ctx.prompt({ type: 'mobility.final', icon: '📝', title: 'The Final Offer', text: `${said}\n${offerSummary(offer)}.`,
    options: [{ id: 'take', label: '✅ Sign' }, { id: 'walk', label: '🙅 Turn it down' }], data: { offer } });
}

function sign(ctx, offer) {
  const { state } = ctx;
  acceptOffer(ctx, offer);
  const job = state.career.job;
  if (job && offer.equityBoost && job.equity?.grants?.length) {
    const g = job.equity.grants.at(-1);
    g.value = Math.round(g.value * offer.equityBoost);
  }
}

export const MobilityModule = {
  id: 'mobility',
  order: 31,
  onAgeUp(ctx) { if (ctx.state.career) reputationYear(ctx.state); },
  resolvers: {
    negotiate(ctx, data, optionId) {
      const { state, rng } = ctx;
      const offer = { ...data.offer };
      if (optionId === 'take') return sign(ctx, offer);
      if (optionId === 'walk') return ctx.log(`You turned down ${offer.employer.name}.`, '🙅');
      const ask = ASKS[optionId];
      if (!ask) return;
      practise(state, 'negotiation', 3);
      if (rng.chance(askOdds(state, optionId, offer))) {
        if (optionId === 'base') offer.salary = Math.round(offer.salary * rng.float(1.08, 1.15));
        if (optionId === 'signing') offer.signing = Math.round(offer.salary * rng.float(0.08, 0.15) / 1000) * 1000;
        if (optionId === 'title') { const up = titleUp(state, offer); if (up) { offer.levelId = up.id; offer.title = up.title; offer.salary = Math.round(offer.salary * 1.08); } }
        if (optionId === 'equity') offer.equityBoost = 2;
        if (optionId === 'bluff') offer.salary = Math.round(offer.salary * rng.float(1.12, 1.22));
        return finalPrompt(ctx, offer, optionId === 'bluff' ? 'They didn\'t want to lose you to the other firm.' : 'They came back with yes.');
      }
      if (rng.chance(ask.withdraw)) {
        ctx.stat('happiness', -3);
        return ctx.log(optionId === 'bluff' ? `${offer.employer.name} called your bluff and withdrew the offer.` : `${offer.employer.name} decided you weren't the right fit after all, and withdrew the offer.`, '📭', 'bad');
      }
      return finalPrompt(ctx, offer, 'They said no, but the offer stands.');
    },
    final(ctx, data, optionId) {
      if (optionId === 'take') return sign(ctx, data.offer);
      ctx.log(`You turned down ${data.offer.employer.name}.`, '🙅');
    },
  },
};
