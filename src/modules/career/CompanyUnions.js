/**
 * Unions meet company life (career/LaborUnions.js × career/CompanyLife.js):
 *
 *   Concessions   a struggling company asks its union for a pay cut to survive. As a member you
 *                 vote: take the cut, strike, or (as a steward or officer) bargain it down.
 *   Across the    as a senior manager at a unionized company, you're on the other side of the
 *   table         table: settle, take a hard line (and risk a strike), or offer gain-sharing.
 *   New owners    after a takeover, new owners may derecognize the union (where the law lets them).
 *   Record years  a strong union wins a bigger settlement when the company is booming.
 */
import { Random, clamp } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { isCorporate, corpOf } from './CompanyLife.js';
import { unionFor, strikeWinChance, myRole } from './LaborUnions.js';
import { leaveJob } from './CareerEngine.js';
import { recalcSalary } from './Compensation.js';
import { skill as skillOf } from '../life/Skills.js';

const money = (n) => `$${Math.round(n).toLocaleString()}`;
const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 6007) ^ (state.character.age * 389 + 0x0c0)) >>> 0);
const DERECOGNIZE = ['US', 'GB', 'AU', 'NZ'];

const cut = (state, job, by) => { job.payAdjust = Math.round((job.payAdjust ?? 1) * (1 - by) * 1000) / 1000; recalcSalary(state, job); };
const lostWages = (ctx, job, share) => {
  const lost = Math.round((job.salary ?? 0) * share);
  ctx.state.finances.cash = Math.max(0, ctx.state.finances.cash - lost);
  return lost;
};
export const strikeOdds = (state, job) => {
  const u = unionFor(state, job.employer.union);
  const c = corpOf(state, job);
  // A company with nothing left can't pay whatever the strike wins.
  return clamp(strikeWinChance(u) * (0.5 + (c?.health ?? 40) / 80), 0.1, 0.85);
};
const bargainOdds = (state) => clamp(0.4 + (skillOf(state, 'leadership') ?? 0) / 250, 0.4, 0.85);

function year(ctx) {
  const { state } = ctx;
  const job = state.career?.job;
  if (!isCorporate(job) || !job.employer?.union) return;
  const c = corpOf(state, job);
  if (!c) return;
  const rng = sideRng(state);
  const age = state.character.age;
  // New owners and the union.
  const fresh = c.history[0];
  if (fresh?.kind === 'acquired' && fresh.age === age && DERECOGNIZE.includes((state.character.countryId ?? 'US')) && yearNow(state) >= 1980 && rng.chance(0.25)) {
    const name = job.employer.union.name;
    delete job.employer.union;
    job.unionMember = false;
    return ctx.log(`The new owners derecognized ${name}. No more collective agreement: pay is set by management now.`, '🚫', 'warn');
  }
  if (job.concessionAge != null && age - job.concessionAge < 4) return;
  const member = Boolean(job.unionMember);
  if (c.health <= 30 && rng.chance(0.5)) {
    job.concessionAge = age;
    if (member) {
      const role = myRole(state);
      return ctx.prompt({
        type: 'companyUnions.vote',
        icon: '🗳️',
        title: 'The concessions vote',
        text: `${job.employer.name} says it will close sites unless the union takes a 10% pay cut. Your local is putting it to a vote.`,
        options: [
          { id: 'accept', label: '✋ Vote to take the cut', hint: 'Less pay, and the company lives to fight another year' },
          ...(job.employer.union.strike !== false ? [{ id: 'strike', label: `✊ Vote to strike (${Math.round(strikeOdds(state, job) * 100)}%)`, hint: 'Weeks without pay; win and there\'s no cut, lose and there are layoffs' }] : []),
          ...(['steward', 'officer', 'president'].includes(role) ? [{ id: 'bargain', label: `🤝 Bargain it down at the table (${Math.round(bargainOdds(state) * 100)}%)`, hint: 'A smaller cut for job guarantees' }] : []),
        ],
      });
    }
    if ((job.grade ?? 0) >= 7) {
      return ctx.prompt({
        type: 'companyUnions.management',
        icon: '🏭',
        title: 'Across the table',
        text: `${job.employer.name} needs savings to survive, and the board wants them from the union contract. You're leading the talks.`,
        options: [
          { id: 'settle', label: '🤝 Settle for a modest freeze', hint: 'Peace, but the savings are small' },
          { id: 'hard', label: '🪨 Demand a 10% cut', hint: 'Big savings if they fold; a strike if they don\'t' },
          { id: 'share', label: `📊 Offer gain-sharing (${Math.round(bargainOdds(state) * 100)}%)`, hint: 'A cut now, paid back from profits later' },
        ],
      });
    }
    return;
  }
  // A record year: a strong union wins a bigger settlement.
  if (member && c.health >= 78 && rng.chance(0.4)) {
    job.concessionAge = age;
    cut(state, job, -0.03);
    ctx.log(`With ${job.employer.name} booming, the union won a bigger settlement: 3% on top of the usual raise.`, '✊', 'good');
  }
}

export const CompanyUnionsModule = {
  id: 'companyUnions',
  // After the company's year (29.7), before the career engine's review (30).
  order: 29.75,
  onAgeUp(ctx) { year(ctx); },
  resolvers: {
    vote(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return;
      const c = corpOf(state, job);
      if (optionId === 'accept') {
        cut(state, job, 0.1);
        if (c) c.health = clamp(c.health + 8, 0, 100);
        return ctx.log(`The members voted to take the cut. Your pay fell to ${money(job.salary)}. The sites stayed open.`, '✋', 'warn');
      }
      if (optionId === 'bargain') {
        if (rng.chance(bargainOdds(state))) {
          cut(state, job, 0.05);
          job.noLayoffUntil = state.character.age + 3;
          if (c) c.health = clamp(c.health + 5, 0, 100);
          return ctx.log('You bargained it down: a 5% cut, and no compulsory layoffs for three years. The members ratified it.', '🤝', 'good');
        }
        cut(state, job, 0.1);
        return ctx.log('The company wouldn\'t move. The members took the full 10% cut.', '🤝', 'warn');
      }
      const lost = lostWages(ctx, job, 0.1);
      ctx.stat('stress', 8);
      if (rng.chance(strikeOdds(state, job))) {
        if (c) c.health = clamp(c.health - 5, 0, 100);
        return ctx.log(`Six weeks on the picket line (${money(lost)} in lost wages), and the company backed down: no cut.`, '✊', 'good');
      }
      if (c) c.health = clamp(c.health - 10, 0, 100);
      if (rng.chance(0.35)) {
        ctx.log(`The strike was lost after ${money(lost)} in lost wages. The company closed a site, and yours was one of the jobs that went.`, '✊', 'bad');
        return leaveJob(ctx, `Laid off after a lost strike at ${job.employer.name}`);
      }
      cut(state, job, 0.15);
      ctx.log(`The strike was lost after ${money(lost)} in lost wages. You went back on worse terms: a 15% cut.`, '✊', 'bad');
    },
    management(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return;
      const c = corpOf(state, job);
      const u = unionFor(state, job.employer.union);
      if (optionId === 'settle') {
        if (c) c.health = clamp(c.health + 3, 0, 100);
        return ctx.log('You settled for a pay freeze. The board called it timid; the shop floor called it fair.', '🤝', 'info');
      }
      if (optionId === 'share') {
        if (rng.chance(bargainOdds(state))) {
          if (c) c.health = clamp(c.health + 8, 0, 100);
          job.boss = clamp((job.boss ?? 50) + 8, 0, 100);
          return ctx.log('The union took gain-sharing: a cut now, repaid from profits. Talks that were meant to end in a strike ended in a handshake.', '📊', 'good');
        }
        if (c) c.health = clamp(c.health + 2, 0, 100);
        return ctx.log('The union didn\'t trust the profit figures. You settled for a freeze.', '📊', 'info');
      }
      // The hard line: do they fold?
      if (rng.chance(1 - strikeWinChance(u))) {
        if (c) c.health = clamp(c.health + 12, 0, 100);
        job.boss = clamp((job.boss ?? 50) + 10, 0, 100);
        return ctx.log('The union folded and took the 10% cut. The board was delighted. The car park was very quiet.', '🪨', 'good');
      }
      if (c) c.health = clamp(c.health - 12, 0, 100);
      job.boss = clamp((job.boss ?? 50) - 15, 0, 100);
      ctx.stat('stress', 10);
      ctx.log('The union walked out. Eight weeks of picket lines and lost orders, then a settlement close to what they first asked for. The board wanted to know whose idea it was.', '🪨', 'bad');
    },
  },
};
