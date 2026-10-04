/**
 * Supervisory & executive management.
 *
 * Any level with the `supervise` ability gives you a department:
 *   { headcount, morale, productivity, budget, spent, workforce,
 *     delegation: { hiring, reviews, scheduling }, unionized, unionRisk }
 *
 * Running it yourself (micromanaging) adds workload and stress but gives a
 * small productivity edge and generates decisions every year. Once a
 * department is large (8+ staff) or you run a whole department, you can
 * delegate each duty to middle managers: less load and fewer interruptions,
 * at a management-overhead cost against the department budget.
 *
 * The department's results feed your own annual performance rating.
 */
import { clamp } from '../../core/Random.js';
import { EMPLOYER_SIZES } from './PayGrades.js';
import { WORKFORCE_MODES, vendorTick } from './ContractingSystem.js';
import { unionManagerTick } from './UnionsAndLabor.js';
import { teamTick, weakestReport, removeFromTeam, hireOntoTeam, reportsOf } from '../org/Supervision.js';
import { randomName } from '../../core/State.js';

export const DUTIES = {
  hiring: { label: 'Hiring', icon: '🤝', overhead: 0.025 },
  reviews: { label: 'Performance reviews', icon: '📋', overhead: 0.03 },
  scheduling: { label: 'Shift scheduling', icon: '🗓️', overhead: 0.02 },
};

export function canDelegate(job) {
  return Boolean(job.department && (job.department.headcount >= 8 || job.abilities.includes('delegate')));
}

/** Create, resize or remove the department to match the job's level. */
export function ensureDepartment(job, level) {
  if (!level.abilities.includes('supervise')) {
    job.department = null;
    return;
  }
  const headcount = Math.max(2, Math.round((level.reports ?? 4) * EMPLOYER_SIZES[job.employer.size].reportScale));
  if (job.department) {
    job.department.headcount = headcount;
    return;
  }
  job.department = {
    headcount,
    morale: 60,
    productivity: 55,
    budget: 0,
    spent: 0,
    workforce: 'direct',
    costPremium: 0,
    transitionPenalty: 0,
    delegation: { hiring: false, reviews: false, scheduling: false },
    unionized: Boolean(job.employer.union),
    unionRisk: 20,
    lastResult: null,
  };
}

/** Yearly department operations. Returns the bonus/penalty to your own rating. */
export function departmentTick(ctx, job) {
  const { state, rng } = ctx;
  const dept = job.department;
  if (!dept) return 0;
  const mode = WORKFORCE_MODES[dept.workforce];
  const delegable = canDelegate(job);
  const delegated = Object.keys(DUTIES).filter((d) => delegable && dept.delegation[d]);
  const micromanaged = delegable ? Object.keys(DUTIES).filter((d) => !dept.delegation[d]) : [];

  // Budget
  const laborCost = dept.headcount * job.salary * 0.55 * mode.costMult * (1 + (dept.costPremium ?? 0));
  const overhead = mode.adminOverhead + delegated.reduce((s, d) => s + DUTIES[d].overhead, 0);
  dept.budget = Math.round(laborCost * (1 + mode.adminOverhead) * 1.04);
  dept.spent = Math.round(laborCost * (1 + overhead) * rng.float(0.96, 1.07));

  // Morale (direct staff only matter)
  if (mode.fixedQuality === null) {
    dept.morale = Math.round(clamp(dept.morale + (55 - dept.morale) * 0.2 + delegated.length - micromanaged.length * 2 + rng.int(-5, 5), 0, 100));
  }

  // Productivity
  const quality = mode.fixedQuality ?? 38 + dept.morale * 0.35;
  const team = teamTick(state, job);
  dept.productivity = Math.round(clamp(quality + team + state.stats.smarts * 0.1 + micromanaged.length * 2 - (dept.delegation.reviews && delegable ? 2 : 0) - (dept.transitionPenalty ?? 0) + rng.int(-8, 8), 0, 100));
  dept.transitionPenalty = 0;

  if (micromanaged.length) ctx.stat('stress', micromanaged.length * 3);
  const variance = (dept.budget - dept.spent) / dept.budget;
  job.boss = Math.round(clamp(job.boss + variance * 40, 0, 100));
  dept.lastResult = { productivity: dept.productivity, budget: dept.budget, spent: dept.spent, overheadPct: Math.round(overhead * 100) };
  ctx.log(`Your ${dept.headcount}-person department: productivity ${dept.productivity}, ${dept.spent <= dept.budget ? 'under' : 'over'} budget by $${Math.abs(dept.budget - dept.spent).toLocaleString()}${delegated.length ? ` (${Math.round(overhead * 100)}% overhead incl. delegation)` : ''}.`, '🏢', 'muted');

  // Decisions land on your desk for every duty you haven't delegated.
  const duties = delegable ? micromanaged : Object.keys(DUTIES);
  if (duties.length && rng.chance(0.55)) {
    const duty = rng.pick(duties);
    MANAGEMENT_EVENTS[duty](ctx, dept, job);
  }
  vendorTick(ctx, job);
  unionManagerTick(ctx, job);

  return (dept.productivity - 50) * 0.3;
}

const MANAGEMENT_EVENTS = {
  hiring(ctx) {
    const { rng } = ctx;
    const names = [0, 1, 2].map(() => { const g = rng.pick(['male', 'female']); const n = randomName(rng, g); return { name: `${n.firstName} ${n.lastName}`, gender: g }; });
    ctx.prompt({
      type: 'career.mgmtHiring', icon: '🤝', title: 'Hiring Decision',
      text: 'You have one open position and three finalists.',
      options: [
        { id: 'veteran', label: `🧓 ${names[0].name}, the seasoned pro who wants top dollar`, hint: 'Strong, pricey' },
        { id: 'promising', label: `🌱 ${names[1].name}, the promising new grad`, hint: 'Cheap, upside' },
        { id: 'nephew', label: `👔 ${names[2].name}, your boss's nephew`, hint: 'Politics' },
      ],
      data: { names },
    });
  },
  reviews(ctx, _dept, job) {
    const weak = job && weakestReport(ctx.state, job);
    ctx.prompt({
      type: 'career.mgmtReview', icon: '📋', title: 'Underperformer',
      text: `${weak ? weak.name : 'One of your reports'} has missed every target this year and morale around them is slipping.`,
      data: { personId: weak?.id ?? null },
      options: [
        { id: 'coach', label: '🧑‍🏫 Coach them personally', hint: 'Smarts check' },
        { id: 'pip', label: '📄 Put them on a performance plan' },
        { id: 'fire', label: '🚪 Let them go' },
      ],
    });
  },
  scheduling(ctx, _dept, job) {
    const team = job ? reportsOf(ctx.state, job) : [];
    // Sometimes it's one person's leave request rather than the holiday roster.
    if (team.length && ctx.rng.chance(0.4)) {
      const p = ctx.rng.pick(team);
      ctx.prompt({
        type: 'career.mgmtLeave', icon: '🗓️', title: 'Leave Request',
        text: `${p.name} asks for three weeks off for a family emergency, during your busiest stretch.`,
        options: [
          { id: 'approve', label: '✅ Approve it' },
          { id: 'partial', label: '🤝 Approve one week, revisit later' },
          { id: 'deny', label: '❌ Deny — the work has to get done' },
        ],
        data: { personId: p.id },
      });
      return;
    }
    ctx.prompt({
      type: 'career.mgmtScheduling', icon: '🗓️', title: 'Holiday Coverage',
      text: 'Half the team requested the same holiday week off. Someone has to cover.',
      options: [
        { id: 'mandate', label: '📢 Mandate overtime by seniority' },
        { id: 'rotate', label: '🔄 Build a fair rotation' },
        { id: 'self', label: '🙋 Cover the gaps yourself' },
      ],
    });
  },
};

function bump(dept, key, delta) {
  dept[key] = Math.round(clamp(dept[key] + delta, 0, 100));
}

export const ManagementResolvers = {
  mgmtHiring(ctx, data, optionId) {
    const job = ctx.state.career.job;
    const dept = job?.department;
    if (!dept) return;
    const pick = data?.names?.[{ veteran: 0, promising: 1, nephew: 2 }[optionId]];
    if (pick) hireOntoTeam(ctx.state, job, { name: pick.name, gender: pick.gender, performance: { veteran: 72, promising: 58, nephew: 42 }[optionId], age: { veteran: 48, promising: 23, nephew: 27 }[optionId] });
    if (optionId === 'veteran') { bump(dept, 'productivity', 5); dept.costPremium = (dept.costPremium ?? 0) + 0.01; }
    if (optionId === 'promising') { bump(dept, 'productivity', 2); bump(dept, 'morale', 2); }
    if (optionId === 'nephew') { job.boss = Math.min(100, job.boss + 8); bump(dept, 'productivity', -5); bump(dept, 'morale', -4); }
    ctx.log({ veteran: 'You hired the seasoned pro.', promising: 'You took a chance on the new grad.', nephew: 'You hired the boss\'s nephew. Your boss is delighted; your team is not.' }[optionId], '🤝');
  },
  mgmtReview(ctx, data, optionId) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const dept = job?.department;
    if (!dept) return;
    const person = data?.personId ? reportsOf(state, job).find((p) => p.id === data.personId) : null;
    if (person) {
      if (optionId === 'coach') { person.rel = Math.min(100, person.rel + 8); person.performance = Math.min(98, person.performance + 6); }
      if (optionId === 'pip') { person.rel = Math.max(0, person.rel - 8); person.discipline = (person.discipline ?? 0) + 1; }
      if (optionId === 'fire') removeFromTeam(state, job, person);
    }
    if (optionId === 'coach') {
      if (state.stats.smarts + rng.int(-15, 15) >= 50) { bump(dept, 'productivity', 4); bump(dept, 'morale', 4); ctx.log('Your coaching turned them around.', '🧑‍🏫', 'good'); }
      else { ctx.stat('stress', 4); ctx.log('Hours of coaching went nowhere.', '🧑‍🏫', 'warn'); }
    } else if (optionId === 'pip') {
      bump(dept, 'productivity', 3); bump(dept, 'morale', -3);
      ctx.log('The performance plan put everyone on notice.', '📄');
    } else {
      bump(dept, 'productivity', 4); bump(dept, 'morale', -8);
      if (dept.unionized) { job.coworkers = Math.max(0, job.coworkers - 10); dept.unionRisk = Math.min(100, dept.unionRisk + 10); ctx.log('You terminated them. The union filed a grievance.', '✊', 'warn'); }
      else ctx.log('You let them go. The team is rattled.', '🚪');
    }
  },
  mgmtLeave(ctx, data, optionId) {
    const { state } = ctx;
    const job = state.career.job;
    const dept = job?.department;
    if (!dept) return;
    const p = reportsOf(state, job).find((x) => x.id === data?.personId);
    const delta = { approve: 12, partial: 3, deny: -15 }[optionId] ?? 0;
    if (p) p.rel = Math.round(clamp(p.rel + delta, 0, 100));
    if (optionId === 'approve') { bump(dept, 'productivity', -3); bump(dept, 'morale', 3); }
    if (optionId === 'deny') { bump(dept, 'productivity', 2); bump(dept, 'morale', -4); }
    ctx.log(`${optionId === 'deny' ? 'You denied' : optionId === 'partial' ? 'You approved part of' : 'You approved'} ${p ? `${p.name}'s` : 'the'} leave request.`, '🗓️');
  },
  mgmtScheduling(ctx, _data, optionId) {
    const dept = ctx.state.career.job?.department;
    if (!dept) return;
    if (optionId === 'mandate') { bump(dept, 'productivity', 4); bump(dept, 'morale', -8); }
    if (optionId === 'rotate') { bump(dept, 'morale', 4); }
    if (optionId === 'self') { bump(dept, 'morale', 6); ctx.stat('stress', 8); ctx.stat('happiness', -3); }
    ctx.log({ mandate: 'You mandated holiday overtime.', rotate: 'You built a fair rotation.', self: 'You worked the holiday so your team didn\'t have to.' }[optionId], '🗓️');
  },
};

export const ManagementActions = {
  toggleDelegation(ctx, duty) {
    const job = ctx.state.career.job;
    if (!job?.department || !DUTIES[duty]) return;
    if (!canDelegate(job)) return ctx.toast('Your team is too small to delegate — you do it all.', 'warn');
    job.department.delegation[duty] = !job.department.delegation[duty];
    ctx.toast(`${DUTIES[duty].label}: ${job.department.delegation[duty] ? 'delegated to middle managers' : 'handling it yourself'}`, 'info');
  },
  teamBuilding(ctx) {
    const job = ctx.state.career.job;
    const dept = job?.department;
    if (!dept) return;
    if (ctx.state.yearly['career.teamBuilding']) return ctx.toast('One offsite per year.', 'warn');
    ctx.state.yearly['career.teamBuilding'] = 1;
    const cost = Math.round(dept.headcount * 150);
    if (job.employer.budget.left >= cost) job.employer.budget.left -= cost;
    else dept.costPremium = (dept.costPremium ?? 0) + 0.01;
    bump(dept, 'morale', 8);
    dept.unionRisk = Math.max(0, dept.unionRisk - 8);
    ctx.log(`You ran a team offsite ($${cost.toLocaleString()}). Morale is up.`, '🎳', 'good');
  },
};
