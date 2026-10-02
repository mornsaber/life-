/**
 * Workforce model for a department you manage:
 *
 *   Direct staff   lowest labor cost and best margins, skills stay in-house,
 *                  but needs HR/admin overhead, has morale to manage, and can
 *                  unionize and strike.
 *   Contractors    flat vendor fee (≈28% premium), near-zero management
 *                  friction or benefit costs, no strikes — but fixed, middling
 *                  quality and vendor price hikes.
 *   Mixed          in between.
 */
import { clamp } from '../../core/Random.js';

export const WORKFORCE_MODES = {
  direct: { label: 'Direct Staff', icon: '👷', costMult: 1.0, adminOverhead: 0.12, fixedQuality: null, strikes: true, desc: 'Cheapest labor, best quality ceiling. Morale, HR overhead, union risk.' },
  mixed: { label: 'Mixed Workforce', icon: '🧩', costMult: 1.12, adminOverhead: 0.07, fixedQuality: null, strikes: true, desc: 'Core staff plus contractors for peaks.' },
  contracted: { label: 'Third-Party Contractors', icon: '📃', costMult: 1.28, adminOverhead: 0.02, fixedQuality: 55, strikes: false, desc: 'Flat fee, no labor friction, fixed middling quality.' },
};

/** Switch workforce model. Layoffs hurt morale and anger unions; insourcing costs a ramp-up year. */
export function setWorkforce(ctx, job, mode) {
  const dept = job.department;
  if (!dept || dept.workforce === mode || !WORKFORCE_MODES[mode]) return;
  const from = dept.workforce;
  dept.workforce = mode;
  if (mode === 'contracted' || (mode === 'mixed' && from === 'direct')) {
    const layoffs = Math.round(dept.headcount * (mode === 'contracted' ? 0.9 : 0.4));
    dept.morale = Math.round(clamp(dept.morale - (mode === 'contracted' ? 25 : 12), 0, 100));
    ctx.log(`You outsourced ${layoffs} positions to a staffing vendor.`, '📃', 'warn');
    if (dept.unionized) {
      dept.unionRisk = 100;
      job.coworkers = Math.round(clamp(job.coworkers - 25, 0, 100));
      ctx.log('The union filed a grievance over the outsourcing.', '✊', 'warn');
    }
    if (mode === 'contracted') dept.unionized = false;
  } else {
    dept.transitionPenalty = 8;
    ctx.log(`You brought the work back in-house (${WORKFORCE_MODES[mode].label}). Expect a ramp-up year.`, '👷');
  }
  ctx.toast(`Workforce: ${WORKFORCE_MODES[mode].label}`, 'info');
}

/** Vendor drama for departments using contractors. */
export function vendorTick(ctx, job) {
  const dept = job.department;
  if (!dept || dept.workforce === 'direct' || !ctx.rng.chance(0.25)) return;
  ctx.prompt({
    type: 'career.vendor',
    icon: '📃',
    title: 'Vendor Contract Renewal',
    text: 'Your staffing vendor wants an 8% rate increase to renew, citing labor costs.',
    options: [
      { id: 'accept', label: '✍️ Accept the increase', hint: 'Higher costs, no disruption' },
      { id: 'rebid', label: '📢 Rebid the contract', hint: 'Cheaper, but a rough transition' },
      { id: 'insource', label: '👷 Bring the work in-house', hint: 'Switch to direct staff' },
    ],
  });
}

export const ContractingResolvers = {
  vendor(ctx, _data, optionId) {
    const job = ctx.state.career.job;
    const dept = job?.department;
    if (!dept) return;
    if (optionId === 'accept') {
      dept.costPremium = Math.round(((dept.costPremium ?? 0) + 0.08) * 100) / 100;
      ctx.log('You renewed the vendor at the higher rate.', '📃');
    } else if (optionId === 'rebid') {
      dept.costPremium = Math.max(0, (dept.costPremium ?? 0) - 0.05);
      dept.transitionPenalty = 6;
      ctx.log('You switched vendors. Cheaper, but the new crew needs training.', '📃');
    } else {
      setWorkforce(ctx, job, 'direct');
    }
  },
};
