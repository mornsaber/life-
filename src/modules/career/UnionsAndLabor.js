/**
 * Unions & industrial action.
 *
 * As an employee at a unionized employer you can join (dues ≈1.3% of pay,
 * grievance protection against termination, a vote on contracts) or not.
 * Contracts expire every three years: members vote on the tentative
 * agreement; rejection means a strike where the law allows it (public safety
 * goes to binding arbitration instead). During a strike everyone chooses:
 * walk the picket line (lost wages, strike-fund support, solidarity) or
 * cross it (keep pay, burn bridges). Rare wildcat sick-outs happen where
 * strikes are illegal.
 *
 * As a manager you track your department's unionization risk (driven by
 * morale), face organizing drives — where illegal union-busting is a real
 * legal risk — and handle disputes with organized staff.
 */
import { clamp } from '../../core/Random.js';
import { recalcSalary } from './Compensation.js';

const isSupervisor = (job) => job.abilities.includes('supervise');

function applyRaise(ctx, job, pct) {
  job.merit = Math.round((job.merit + pct / 100) * 1000) / 1000;
  recalcSalary(ctx.state, job);
}

/* ------------------------------------------------------------------ */
/* Employee side                                                       */
/* ------------------------------------------------------------------ */

export function unionEmployeeTick(ctx, job) {
  const { rng } = ctx;
  const union = job.employer.union;
  if (!union) return;
  if (job.unionMember) {
    const dues = Math.round(job.salary * union.duesRate);
    ctx.spend(dues, `${union.name} dues`, { allowDebt: true });
  } else if (union.agencyFee && !isSupervisor(job) && job.sector === 'private') {
    // Outside right-to-work states, covered non-members pay an agency fee.
    ctx.spend(Math.round(job.salary * union.duesRate * 0.6), `${union.name} agency fee`, { allowDebt: true });
  }

  union.contractYearsLeft -= 1;
  if (union.contractYearsLeft <= 0) {
    union.contractYearsLeft = 3;
    // Contracts chase inflation plus a real raise.
    const offer = Math.max(1, Math.round(ctx.state.economy.inflation * 100)) + rng.int(0, 3);
    if (job.unionMember && !isSupervisor(job)) {
      ctx.prompt({
        type: 'career.cbaVote',
        icon: '🗳️',
        title: `${union.name}: Contract Vote`,
        text: `The bargaining committee reached a tentative agreement with ${job.employer.name}: a ${offer}% raise over three years.\n${union.strike ? 'Rejecting it authorizes a strike.' : 'Rejecting it sends the contract to binding arbitration (strikes are illegal for your job).'}`,
        options: [
          { id: 'ratify', label: `✅ Ratify the ${offer}% deal` },
          { id: 'reject', label: union.strike ? '✊ Reject — authorize a strike' : '⚖️ Reject — go to arbitration' },
        ],
        data: { offer },
      });
    } else {
      // Non-members and supervisors are covered by whatever the membership decides.
      const struck = union.strike && rng.chance(0.2);
      if (struck) strikePrompt(ctx, job, offer);
      else {
        applyRaise(ctx, job, offer);
        ctx.log(`${union.name} ratified a new contract: +${offer}% for the bargaining unit.`, '📜');
      }
    }
  } else if (!union.strike && job.unionMember && rng.chance(0.03)) {
    ctx.prompt({
      type: 'career.wildcat',
      icon: '🤒',
      title: 'Wildcat Sick-Out',
      text: 'Frustrated with stalled talks, coworkers are organizing an unsanctioned "blue flu" sick-out. Strikes are illegal for your job.',
      options: [
        { id: 'join', label: '🤒 Call in "sick" with everyone', hint: 'Solidarity, discipline risk' },
        { id: 'work', label: '🫡 Show up for your shift' },
      ],
    });
  }
}

function strikePrompt(ctx, job, offer) {
  ctx.prompt({
    type: 'career.strike',
    icon: '✊',
    title: 'On Strike!',
    text: `${job.employer.union.name} walked out at ${job.employer.name}. Picket lines are up outside.`,
    options: [
      { id: 'picket', label: '✊ Walk the picket line', hint: 'Lost wages, strike fund, solidarity' },
      { id: 'cross', label: '🚶 Cross the picket line', hint: 'Keep pay — coworkers won\'t forget' },
    ],
    data: { offer },
  });
}

export const UnionResolvers = {
  cbaVote(ctx, data, optionId) {
    const { rng } = ctx;
    const job = ctx.state.career.job;
    if (!job?.employer.union) return;
    const union = job.employer.union;
    // Your vote is one of many — the membership decides.
    const rejected = rng.chance(optionId === 'reject' ? 0.6 : 0.2);
    if (!rejected) {
      applyRaise(ctx, job, data.offer);
      ctx.log(`Members ratified the contract (+${data.offer}%).`, '📜', 'good');
    } else if (union.strike) {
      ctx.log('Members rejected the deal and authorized a strike.', '✊', 'warn');
      strikePrompt(ctx, job, data.offer);
    } else {
      const award = data.offer + rng.int(-1, 3);
      applyRaise(ctx, job, award);
      ctx.log(`The arbitrator awarded a ${award}% raise.`, '⚖️');
    }
  },

  strike(ctx, data, optionId) {
    const { rng } = ctx;
    const job = ctx.state.career.job;
    if (!job) return;
    const weeks = rng.int(2, 10);
    const won = rng.chance(0.55);
    const raise = won ? data.offer + rng.int(2, 4) : Math.max(1, data.offer - 2);
    if (optionId === 'picket') {
      const lost = Math.round((job.salary * weeks) / 52);
      ctx.spend(lost, 'Lost wages (strike)', { allowDebt: true });
      if (job.unionMember) ctx.earn(500 * weeks, 'Union strike fund');
      job.coworkers = Math.round(clamp(job.coworkers + 15, 0, 100));
      job.boss = Math.round(clamp(job.boss - 5, 0, 100));
      ctx.stat('stress', 8);
      ctx.log(`You walked the picket line for ${weeks} weeks ($${lost.toLocaleString()} in lost wages).`, '✊');
    } else {
      job.coworkers = Math.round(clamp(job.coworkers - 30, 0, 100));
      job.boss = Math.round(clamp(job.boss + 5, 0, 100));
      ctx.stat('happiness', -6);
      if (job.unionMember) {
        job.unionMember = false;
        ctx.log('The union expelled you for crossing the picket line.', '🚫', 'bad');
      }
      ctx.log(`You crossed the picket line for ${weeks} weeks. "Scab" was spray-painted on your car.`, '🚶', 'warn');
    }
    applyRaise(ctx, job, raise);
    ctx.log(`The strike ended after ${weeks} weeks: ${won ? 'the union won' : 'the union settled'} a ${raise}% raise.`, '📜', won ? 'good' : 'info');
  },

  wildcat(ctx, _data, optionId) {
    const { rng } = ctx;
    const job = ctx.state.career.job;
    if (!job) return;
    if (optionId === 'join') {
      job.coworkers = Math.round(clamp(job.coworkers + 10, 0, 100));
      if (rng.chance(0.35)) {
        job.warnings += 1;
        ctx.log('Management disciplined sick-out participants. You got a written reprimand.', '📝', 'bad');
      } else {
        ctx.log('The sick-out got management back to the table.', '🤒', 'good');
      }
    } else {
      job.coworkers = Math.round(clamp(job.coworkers - 12, 0, 100));
      job.boss = Math.round(clamp(job.boss + 4, 0, 100));
      ctx.log('You showed up while most of your shift called out.', '🫡');
    }
  },

  organizingDrive(ctx, _data, optionId) {
    const { rng } = ctx;
    const job = ctx.state.career.job;
    const dept = job?.department;
    if (!dept) return;
    if (optionId === 'recognize') {
      dept.unionized = true;
      dept.morale = Math.min(100, dept.morale + 10);
      dept.costPremium = (dept.costPremium ?? 0) + 0.06;
      ctx.log('You voluntarily recognized the union. Morale soared; so did labor costs.', '🤝', 'good');
    } else if (optionId === 'raise') {
      dept.unionRisk = Math.max(0, dept.unionRisk - 30);
      dept.morale = Math.min(100, dept.morale + 5);
      dept.costPremium = (dept.costPremium ?? 0) + 0.08;
      ctx.log('You raised wages. The organizing drive lost steam.', '💵');
    } else if (optionId === 'meetings') {
      dept.unionRisk = Math.max(0, dept.unionRisk - 15);
      dept.morale = Math.max(0, dept.morale - 5);
      ctx.log('You held mandatory "information sessions" about unions.', '📽️');
      if (rng.chance(0.2)) ctx.emit('legal:offense', { offenseId: 'unfairLaborPractice', context: 'coercive captive-audience meetings', caught: true });
      else if (rng.chance(0.5)) { dept.unionized = true; ctx.log('The union won the election anyway.', '✊', 'warn'); }
    } else {
      dept.unionRisk = Math.max(0, dept.unionRisk - 40);
      dept.morale = Math.max(0, dept.morale - 20);
      ctx.log('You fired the lead organizers.', '🚪', 'bad');
      if (rng.chance(0.6)) ctx.emit('legal:offense', { offenseId: 'unfairLaborPractice', context: 'retaliatory firing of union organizers', caught: true });
    }
  },

  laborDispute(ctx, _data, optionId) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const dept = job?.department;
    if (!dept) return;
    if (optionId === 'negotiate') {
      if (state.stats.smarts + rng.int(-15, 15) >= 55) {
        dept.costPremium = (dept.costPremium ?? 0) + 0.02;
        dept.morale = Math.min(100, dept.morale + 5);
        ctx.log('You negotiated a fair settlement.', '🤝', 'good');
        job.boss = Math.min(100, job.boss + 4);
      } else {
        dept.productivity = Math.max(0, dept.productivity - 10);
        ctx.log('Talks broke down and staff worked to rule for months.', '🐌', 'warn');
      }
    } else if (optionId === 'accept') {
      dept.costPremium = (dept.costPremium ?? 0) + 0.07;
      dept.morale = Math.min(100, dept.morale + 10);
      job.boss = Math.max(0, job.boss - 6);
      ctx.log('You accepted the union\'s demands.', '📜');
    } else {
      dept.workforce = 'mixed';
      dept.morale = Math.max(0, dept.morale - 25);
      job.coworkers = Math.max(0, job.coworkers - 25);
      job.boss = Math.round(clamp(job.boss + (rng.chance(0.5) ? 8 : -8), 0, 100));
      ctx.log('You brought in replacement contractors to break the strike. Local news ran the picket-line footage for a week.', '📺', 'warn');
    }
  },
};

/* ------------------------------------------------------------------ */
/* Manager side                                                        */
/* ------------------------------------------------------------------ */

export function unionManagerTick(ctx, job) {
  const { rng } = ctx;
  const dept = job.department;
  if (!dept) return;
  if (dept.workforce === 'contracted') {
    dept.unionRisk = 0;
    return;
  }
  dept.unionRisk = Math.round(clamp(dept.unionRisk + (50 - dept.morale) * 0.3 + rng.int(-5, 8), 0, 100));
  if (!dept.unionized && dept.unionRisk >= 70 && rng.chance(0.5)) {
    ctx.prompt({
      type: 'career.organizingDrive',
      icon: '✊',
      title: 'Organizing Drive',
      text: `Your staff have filed for a union election (unionization risk ${dept.unionRisk}/100).`,
      options: [
        { id: 'recognize', label: '🤝 Voluntarily recognize the union' },
        { id: 'raise', label: '💵 Raise wages and fix conditions' },
        { id: 'meetings', label: '📽️ Hold mandatory anti-union meetings', hint: 'Legal gray area' },
        { id: 'fire', label: '🚪 Fire the organizers', hint: 'Illegal retaliation', tone: 'danger' },
      ],
    });
  } else if (dept.unionized && rng.chance(0.2)) {
    ctx.prompt({
      type: 'career.laborDispute',
      icon: '⚖️',
      title: 'Labor Dispute',
      text: 'The union is demanding higher staffing levels and threatening job action.',
      options: [
        { id: 'negotiate', label: '🤝 Negotiate a compromise', hint: 'Smarts check' },
        { id: 'accept', label: '📜 Accept their demands', hint: 'Costly, peaceful' },
        { id: 'breakers', label: '📃 Hire replacement contractors', hint: 'Strike-breaking' },
      ],
    });
  }
}

export const UnionActions = {
  joinUnion(ctx) {
    const job = ctx.state.career.job;
    if (!job?.employer.union) return ctx.toast('Your workplace isn\'t unionized.', 'warn');
    if (isSupervisor(job)) return ctx.toast('Supervisors are excluded from the bargaining unit.', 'warn');
    if (job.unionMember) return;
    job.unionMember = true;
    job.coworkers = Math.round(clamp(job.coworkers + 5, 0, 100));
    ctx.log(`You joined ${job.employer.union.name}.`, '✊', 'good');
  },
  leaveUnion(ctx) {
    const job = ctx.state.career.job;
    if (!job?.unionMember) return;
    job.unionMember = false;
    job.coworkers = Math.round(clamp(job.coworkers - 5, 0, 100));
    ctx.log(`You dropped your ${job.employer.union.name} membership.`, '🚪');
  },
};
