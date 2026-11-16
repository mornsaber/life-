/**
 * After the deal, for founders (the deals themselves live in BusinessEngine.js, OwnerActions.js
 * and Structure.js):
 *
 *   Staying on   a buyer wants you to run what you built, inside their company, for three
 *                years: a senior corporate job (career/CompanyLife.js tracks the buyer) and an
 *                earn-out paid on how those years go. Walk early and you forfeit it.
 *   Listed life  a public company you founded faces results day, and once your stake is
 *                small, shareholders who want changes: settle, fight a vote, or sell.
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { eraScale, countryWageFactor } from '../economy/EraEconomy.js';
import { getProfession } from '../career/JobTrees.js';
import { createEmployer } from '../career/Employers.js';
import { hire } from '../career/CareerEngine.js';
import { corpOf } from '../career/CompanyLife.js';
import { currentBusiness } from './Business.js';
import { exitBusiness } from './BusinessEngine.js';

const money = (n) => `$${Math.round(n).toLocaleString()}`;
const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 5521) ^ (state.character.age * 911 + 0xf0e)) >>> 0);
const scale = (state) => eraScale(state, 'wage') * countryWageFactor(state);
const EARN_OUT_YEARS = 3;

/** The post a buyer offers, by the size of the deal. */
const postFor = (state, price) => (price >= 50_000_000 * scale(state) ? 'vp' : price >= 5_000_000 * scale(state) ? 'seniorDirector' : 'director');

const PREFIX = ['Consolidated', 'United', 'General', 'National', 'Allied', 'Standard', 'Northern', 'Atlas', 'Meridian', 'Summit'];
const SUFFIX = ['Group', 'Holdings', 'Industries'];
/** A buyer described rather than named ("a private equity firm") gets a name. */
const named = (state, buyer) => (/^[A-Z]/.test(buyer) ? buyer : `${sideRng(state).pick(PREFIX)} ${sideRng({ ...state, character: { ...state.character, age: state.character.age + 7 } }).pick(SUFFIX)}`);

function offerToStay(ctx, { name, price, buyer: rawBuyer }) {
  const { state } = ctx;
  const buyer = rawBuyer ? named(state, rawBuyer) : null;
  if (!buyer || price < 1_000_000 * scale(state) || state.character.age >= 66 || state.prompts.some((p) => p.type === 'founderExits.stay')) return;
  const bonus = Math.round(price * 0.15);
  const modern = yearNow(state) >= 1960;
  ctx.prompt({
    type: 'founderExits.stay',
    icon: '🤝',
    title: `${buyer} wants you to stay`,
    text: `${buyer} would like you to keep running ${name} inside their company for ${EARN_OUT_YEARS} years${modern ? `, with an earn-out of up to ${money(bonus)} if it does well` : `, with a bonus of up to ${money(bonus)} at the end`}.`,
    options: [
      { id: 'stay', label: `🏢 Stay on as President, ${name}`, hint: 'A senior salary, a boss for the first time in years, and the earn-out' },
      { id: 'go', label: '🌴 Take the money and go', hint: 'Free, and done' },
    ],
    data: { name, price, buyer, bonus },
  });
}

/** The earn-out year: the culture clash, and the payment at the end. */
function earnOutYear(ctx, rng) {
  const { state } = ctx;
  const job = state.career?.job;
  const e = job?.earnOut;
  if (!e) return;
  if (state.character.age < e.until) {
    if (rng.chance(0.3)) {
      job.boss = Math.max(0, (job.boss ?? 50) - 8);
      ctx.log(rng.pick([`${e.buyer}'s head office sent another layer of approvals. You used to just decide.`, `Your old team asked you whether ${e.buyer} would keep the office open. You didn't know.`, `${e.buyer} renamed one of your products. You found out from a customer.`]), '🏢', 'warn');
    }
    return;
  }
  const c = corpOf(state, job);
  const record = (job.performance ?? 55) + ((c?.health ?? 50) - 50) / 2;
  const share = record >= 70 ? 1 : record >= 55 ? 0.6 : record >= 40 ? 0.25 : 0;
  delete job.earnOut;
  if (share) {
    ctx.earn(Math.round(e.bonus * share), `Earn-out: ${e.name}`, { ltcg: true });
    ctx.log(`Your ${EARN_OUT_YEARS} years at ${e.buyer} are up. The earn-out paid ${money(e.bonus * share)}${share < 1 ? ` of a possible ${money(e.bonus)}` : ' in full'}. You're free to go, or to stay.`, '💰', 'good');
  } else ctx.log(`Your ${EARN_OUT_YEARS} years at ${e.buyer} are up. ${e.name} missed its targets: no earn-out. You're free to go, or to stay.`, '💸', 'warn');
}

/** A public company you founded: results day and the shareholders. */
function listedYear(ctx, rng) {
  const { state } = ctx;
  const biz = currentBusiness(state);
  if (!biz?.public) return;
  const net = biz.lastYear?.netIncome ?? 0;
  if (net < 0 && rng.chance(0.5)) {
    biz.valuation = Math.round(biz.valuation * 0.85);
    ctx.log(`${biz.name} missed its numbers. The shares fell 15% on results day.`, '📉', 'warn');
  }
  if (biz.ownerPct >= 0.35 || biz.activist || state.prompts.some((p) => p.type === 'founderExits.activist')) return;
  if (!rng.chance(net < 0 ? 0.12 : 0.04)) return;
  const who = yearNow(state) >= 1980 ? 'An activist fund' : 'A group of big shareholders';
  biz.activist = { age: state.character.age };
  ctx.prompt({
    type: 'founderExits.activist',
    icon: '📣',
    title: `${who} wants changes at ${biz.name}`,
    text: `${who} has built a stake in ${biz.name} and wants two seats on the board, deep cuts, and a "review of strategic options" (a sale). You own ${Math.round(biz.ownerPct * 100)}%.`,
    options: [
      { id: 'settle', label: '🤝 Give them two seats', hint: 'Peace, for now: they will push for a sale' },
      { id: 'fight', label: `🗳️ Fight it at the shareholder vote (${Math.round(fightOdds(biz) * 100)}%)`, hint: 'Win and they go away; lose and the board sells' },
      { id: 'sell', label: `💼 Sell the company (${money(biz.valuation * 1.25)})`, hint: 'A premium for everyone, you included' },
    ],
    data: { bizId: biz.id },
  });
}
export const fightOdds = (biz) => Math.min(0.85, 0.25 + biz.ownerPct + (biz.reputation ?? 50) / 400);

export const FounderExitsModule = {
  id: 'founderExits',
  order: 30.7,
  setup(engine) {
    engine.bus.on('business:sold', ({ ctx, ...deal }) => { if (ctx) offerToStay(ctx, deal); });
    engine.bus.on('career:separated', ({ ctx, job }) => {
      if (ctx && job?.earnOut && ctx.state.character.age < job.earnOut.until) ctx.log(`You left ${job.earnOut.buyer} before the earn-out ended and forfeited it.`, '💸', 'warn');
    });
  },
  onAgeUp(ctx) {
    const rng = sideRng(ctx.state);
    earnOutYear(ctx, rng);
    listedYear(ctx, rng);
  },
  resolvers: {
    stay(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'stay') return ctx.log(`You walked away from ${data.name} with the money.`, '🌴', 'info');
      const profession = getProfession('corporate');
      const employer = createEmployer(sideRng(state), state, profession, state.character.regionId);
      employer.name = data.buyer;
      employer.size = 'enterprise';
      const job = hire(ctx, { professionId: 'corporate', levelId: postFor(state, data.price), employer, title: `President, ${data.name}` });
      if (!job) return;
      job.earnOut = { until: state.character.age + EARN_OUT_YEARS, bonus: data.bonus, buyer: data.buyer, name: data.name };
      const c = corpOf(state, job);
      if (c) c.history.unshift({ age: state.character.age, kind: 'acquired', text: `${data.buyer} bought ${data.name}, and you with it.` });
    },
    activist(ctx, data, optionId) {
      const { state, rng } = ctx;
      const biz = currentBusiness(state);
      if (!biz || biz.id !== data.bizId) return;
      if (optionId === 'settle') {
        biz.activist.settled = true;
        return ctx.log(`You gave the shareholders two board seats. Board meetings got longer.`, '🤝', 'info');
      }
      if (optionId === 'fight') {
        ctx.stat('stress', 8);
        if (rng.chance(fightOdds(biz))) {
          biz.activist.won = true;
          return ctx.log(`You won the shareholder vote. They sold their stake and moved on.`, '🗳️', 'good');
        }
        ctx.log(`You lost the shareholder vote. The new board put ${biz.name} up for sale.`, '🗳️', 'bad');
        return exitBusiness(ctx, Math.round(biz.valuation * 1.1), 'Sold after a lost shareholder vote', { buyer: 'a rival company' });
      }
      exitBusiness(ctx, Math.round(biz.valuation * 1.25), 'Sold at a premium', { buyer: 'a larger rival' });
    },
  },
};
