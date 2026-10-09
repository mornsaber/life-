/**
 * Working in your own company once it's big: a post at the top instead of
 * running the shop floor.
 *
 *   Chief Executive Officer  full time; your leadership drives the company
 *   President & COO          full time; operations-focused, a little less pay
 *   Executive Chair          part time (you can hold another job); a hired
 *                            CEO runs it day to day and you set direction
 *
 * The post pays a salary (set with the board; a W-2 wage from the company),
 * a bonus after a strong year, and takes stress. Each year you set a
 * strategic focus and get a few executive moves — town halls, landing a
 * major client, restructuring, an innovation push, an investor day. The
 * board reviews you every year; a board you don't control can replace you.
 * Leaving the post adds it to your career history.
 *
 * biz.role = 'executive', biz.ownerPost = { post, since, salary, payLevel, focus, performance, years }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { charge } from './TaxBook.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;

export const POSTS = {
  ceo: { title: 'Chief Executive Officer', icon: '👑', pay: 1, lead: 1, stress: 5, fullTime: true, desc: 'Full time. Your leadership sets the company\'s course.' },
  president: { title: 'President & Chief Operating Officer', icon: '⚙️', pay: 0.8, lead: 0.85, stress: 4, fullTime: true, desc: 'Full time. You run operations; a little less pay and pressure.' },
  chair: { title: 'Executive Chair', icon: '🪑', pay: 0.45, lead: 0.4, stress: 1, fullTime: false, desc: 'Part time — keep another job. A hired CEO runs it day to day.' },
};
export const FOCUS = {
  growth: { label: 'Growth', icon: '📈', desc: 'Revenue +3%; the pace wears on people.', fx: { revenue: 1.03 }, yearly: { morale: -1 } },
  efficiency: { label: 'Efficiency', icon: '✂️', desc: 'Cost of goods −2%.', fx: { cogs: 0.98 }, yearly: { morale: -1 } },
  quality: { label: 'Quality', icon: '⭐', desc: 'Quality climbs every year.', yearly: { quality: 3 } },
  people: { label: 'People', icon: '🧑‍🤝‍🧑', desc: 'Morale and productivity climb; payroll +1%.', fx: { payroll: 1.01 }, yearly: { morale: 4, productivity: 2 } },
  brand: { label: 'Brand', icon: '📣', desc: 'Reputation climbs every year.', yearly: { reputation: 3 } },
};
export const EXEC_MOVES = {
  townHall: { label: 'Hold an all-hands town hall', icon: '🎤', desc: 'Morale +5.' },
  bigClient: { label: 'Close a major client yourself', icon: '🤝', desc: 'Revenue this year, reputation; odds rise with your skill.' },
  restructure: { label: 'Restructure', icon: '✂️', desc: 'Cut 5% of staff: lower payroll, morale −10.' },
  innovation: { label: 'Fund an innovation push', icon: '💡', desc: 'Costs 2% of revenue; 60% chance of a lasting +4% revenue.' },
  investorDay: { label: 'Host an investor day', icon: '📊', desc: 'Reputation +2; impresses the board.' },
};
export const EXEC_MOVES_PER_YEAR = 3;

/** Big enough to need someone at the top who isn't on the shop floor. */
export const postEligible = (biz) => (biz.staff?.headcount ?? 0) >= 20 || (biz.scale ?? 1) >= 3 || (biz.lastYear?.revenue ?? 0) >= 5_000_000;
export const PAY_LEVELS = { modest: 0.6, market: 1, top: 1.5 };

export function postSalary(biz, post, payLevel = 'market') {
  const revenue = biz.lastYear?.revenue ?? 0;
  return Math.round(clamp(revenue * 0.012, 120000, 1_800_000) * POSTS[post].pay * (PAY_LEVELS[payLevel] ?? 1) / 1000) * 1000;
}

/** Your leadership as a skill for the company (like a hired CEO's). */
export function executiveSkill(state, biz, ownerSkill, managerSkill) {
  const p = biz.ownerPost;
  const lead = POSTS[p?.post]?.lead ?? 0;
  const yours = ownerSkill + state.stats.smarts * 0.1 + Math.min(12, (p?.years ?? 0) * 1.5);
  return Math.round(lead * yours + (1 - lead) * managerSkill);
}

/** Business multipliers from your strategic focus (read by yearFinancials). */
export function focusEffects(biz) {
  const f = biz.role === 'executive' ? FOCUS[biz.ownerPost?.focus]?.fx ?? {} : {};
  return { revenue: (f.revenue ?? 1) * (biz.innovation ?? 1), cogs: f.cogs ?? 1, payroll: f.payroll ?? 1 };
}

export function takePost(ctx, biz, post) {
  const { state } = ctx;
  const P = POSTS[post];
  if (!P) return;
  if (!postEligible(biz)) return ctx.toast('A company this size is run hands-on — run it yourself (owner-operator) instead.', 'warn');
  if (state.legal.incarceration) return;
  if (P.fullTime && state.career.job) return ctx.toast('Leave your job first — this is full time.', 'warn');
  const other = [state.business.current, ...(state.business.holdings ?? [])].find((b) => b && b !== biz && b.role === 'executive' && POSTS[b.ownerPost?.post]?.fullTime);
  if (P.fullTime && other) return ctx.toast(`You already work full time at ${other.name}.`, 'warn');
  if (biz.board && !biz.board.advisory && biz.ownerPct < 0.5 && post !== 'chair' && (biz.board.meetings.at(-1)?.verdict === 'crisis')) return ctx.toast('The board won\'t appoint you after the last review.', 'warn');
  const was = biz.ownerPost;
  biz.role = 'executive';
  biz.autopilot = post === 'chair';
  biz.ownerPost = { post, since: was?.since ?? state.character.age, salary: postSalary(biz, post, was?.payLevel), payLevel: was?.payLevel ?? 'market', focus: was?.focus ?? 'growth', performance: was?.performance ?? 60, years: was?.years ?? 0 };
  ctx.log(`You took the post of ${P.title} at ${biz.name} (${money(biz.ownerPost.salary)} a year).`, P.icon, 'milestone');
}

/** Step down: the post goes on your record; a hired CEO takes over. */
export function leavePost(ctx, biz, reason = 'Stepped down') {
  const { state } = ctx;
  const p = biz.ownerPost;
  if (!p || biz.role !== 'executive') return;
  state.career.history.push({ professionId: 'corporate', title: POSTS[p.post].title, levelId: 'exec', employerName: biz.name, sector: 'private', peakGrade: p.post === 'chair' ? 9 : 10, startAge: p.since, endAge: state.character.age, reason, ownCompany: true });
  biz.role = 'absentee';
  biz.autopilot = true;
  biz.ownerPost = null;
  ctx.log(`You ${reason === 'Removed by the board' ? 'were removed as' : 'stepped down as'} ${POSTS[p.post].title.toLowerCase()} of ${biz.name}. A hired chief executive runs it now.`, '🚪', reason === 'Removed by the board' ? 'bad' : 'info');
}

export function setFocus(ctx, biz, focus) {
  if (biz.role !== 'executive' || !FOCUS[focus]) return;
  biz.ownerPost.focus = focus;
  ctx.toast(`Strategic focus: ${FOCUS[focus].label}`, 'info');
}

export function setPay(ctx, biz, level) {
  if (biz.role !== 'executive' || !PAY_LEVELS[level]) return;
  if (biz.board && !biz.board.advisory && biz.ownerPct < 0.5 && level === 'top') return ctx.toast('The compensation committee won\'t approve top-of-market pay.', 'warn');
  biz.ownerPost.payLevel = level;
  biz.ownerPost.salary = postSalary(biz, biz.ownerPost.post, level);
  if (level === 'top') biz.staff.morale = Math.max(0, biz.staff.morale - 3);
  ctx.log(`Your pay at ${biz.name} is now ${money(biz.ownerPost.salary)} a year.`, '💼');
}

export function execMove(ctx, biz, move, skill) {
  const { state, rng } = ctx;
  if (biz.role !== 'executive' || !EXEC_MOVES[move]) return;
  if (yearlyCount(state, `business.execMove.${biz.id}`) >= EXEC_MOVES_PER_YEAR) return ctx.toast(`${EXEC_MOVES_PER_YEAR} big moves a year — next year.`, 'warn');
  if (yearlyCount(state, `business.execMove.${biz.id}.${move}`)) return ctx.toast('Once a year.', 'warn');
  bumpYearly(state, `business.execMove.${biz.id}`);
  bumpYearly(state, `business.execMove.${biz.id}.${move}`);
  const revenue = biz.lastYear?.revenue ?? 0;
  const p = biz.ownerPost;
  switch (move) {
    case 'townHall':
      biz.staff.morale = Math.min(100, biz.staff.morale + 5);
      ctx.log(`You held an all-hands at ${biz.name}: straight talk about where the company is going. People left fired up.`, '🎤', 'good');
      break;
    case 'bigClient': {
      if (rng.chance(clamp(0.35 + skill / 150, 0.3, 0.85))) {
        const deal = Math.round(revenue * rng.float(0.02, 0.05));
        biz.cash += deal;
        biz.reputation = Math.min(100, biz.reputation + 2);
        p.performance = Math.min(100, p.performance + 4);
        ctx.log(`You personally closed a major client for ${biz.name}: about ${money(deal)} of business this year.`, '🤝', 'good');
      } else ctx.log(`You pitched a major client yourself. They went with a competitor.`, '🤝', 'warn');
      break;
    }
    case 'restructure': {
      if (!biz.staff.headcount) return ctx.toast('There is no staff to restructure.', 'warn');
      const cut = Math.min(biz.staff.headcount, Math.max(1, Math.round(biz.staff.headcount * 0.05)));
      biz.staff.headcount -= cut;
      biz.staff.morale = Math.max(0, biz.staff.morale - 10);
      charge(biz, cut * 15000);
      ctx.log(`${biz.name} restructured: ${cut} roles eliminated (${money(cut * 15000)} in severance). Leaner — and nervous.`, '✂️', 'warn');
      break;
    }
    case 'innovation': {
      const cost = Math.round(revenue * 0.02);
      if (biz.cash < cost) return ctx.toast(`An innovation push costs ${money(cost)}.`, 'warn');
      charge(biz, cost);
      if (rng.chance(0.6)) {
        biz.innovation = Math.round(Math.min(1.25, (biz.innovation ?? 1) * 1.04) * 1000) / 1000;
        ctx.log(`${biz.name}'s innovation push paid off: a new product line that should add about 4% to revenue for good.`, '💡', 'good');
      } else ctx.log(`${biz.name}'s innovation push (${money(cost)}) didn't find a market.`, '💡', 'warn');
      break;
    }
    case 'investorDay':
      biz.reputation = Math.min(100, biz.reputation + 2);
      p.performance = Math.min(100, p.performance + 3);
      ctx.log(`You hosted an investor day for ${biz.name}. The story landed.`, '📊', 'good');
      break;
    default:
  }
}

/** Your year in the post: pay, the focus's drift, stress. (Pay itself is booked in yearFinancials.) */
export function postYear(ctx, biz) {
  const p = biz.ownerPost;
  if (!p || biz.role !== 'executive') return;
  const P = POSTS[p.post];
  p.years += 1;
  p.salary = postSalary(biz, p.post, p.payLevel);
  const y = FOCUS[p.focus]?.yearly ?? {};
  if (y.morale) biz.staff.morale = Math.round(clamp(biz.staff.morale + y.morale, 0, 100));
  if (y.productivity) biz.staff.productivity = Math.round(clamp(biz.staff.productivity + y.productivity, 0, 100));
  if (y.quality) biz.quality = Math.round(clamp(biz.quality + y.quality, 0, 100));
  if (y.reputation) biz.reputation = Math.round(clamp(biz.reputation + y.reputation, 0, 95));
  ctx.stat('stress', P.stress);
  if ((biz.lastYear?.netIncome ?? 0) > 0) ctx.stat('happiness', 2);
}

/** Board hooks for the annual review of you as chief executive. */
export function boardHooks(ctx, biz, replaceCeo) {
  const p = biz.ownerPost;
  const you = biz.role === 'executive' && p && p.post !== 'chair';
  return {
    you,
    hasCeo: !you,
    bonus: () => {
      const bonus = Math.round(p.salary * 0.3);
      if (biz.cash < bonus) return 'The board would have paid you a bonus, but cash is tight.';
      biz.cash -= bonus;
      ctx.earn(bonus, `Bonus — ${biz.name}`, { wage: true });
      p.performance = Math.min(100, p.performance + 5);
      return `The board awarded you a ${money(bonus)} bonus.`;
    },
    removeYou: () => {
      leavePost(ctx, biz, 'Removed by the board');
      return 'The board voted to replace you as chief executive.';
    },
    replaceCeo,
  };
}
