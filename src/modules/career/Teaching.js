/**
 * K-12 teaching: the union salary schedule, the administrator ladder, and
 * summers.
 *
 *  - Salary schedule: classroom teachers aren't paid on merit. The district
 *    contract sets a step for each year of experience and a lane for each
 *    degree (BA, MA, doctorate), plus a stipend for National Board
 *    certification. Teaching experience from other districts carries over.
 *  - Administration: assistant principal and up need an administrative
 *    services credential (master's + 3 years teaching); larger districts add
 *    a curriculum director and assistant superintendent.
 *  - Summers: teach summer school, run a camp, tutor, take a seasonal job —
 *    or actually rest.
 *
 * state.teaching = { summer }
 */
import { yearsInProfession } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { MAX_STEP } from './PayGrades.js';
import { recalcSalary } from './Compensation.js';

export const LANES = [
  { id: 'doctorate', label: 'Doctorate lane', mult: 1.16, test: (s) => s.education.degrees.some((d) => ['doctorate'].includes(d.type) || d.programId === 'phd') },
  { id: 'ma', label: 'Master\'s lane', mult: 1.09, test: (s) => s.education.degrees.some((d) => ['master', 'professional'].includes(d.type)) },
  { id: 'ba', label: 'Bachelor\'s lane', mult: 1, test: () => true },
];
export const NBCT_STIPEND = 0.05;

export const SUMMER_JOBS = {
  rest: { label: '🏖️ Rest and recharge', desc: 'Stress −6, happiness +3', stress: -6, happy: 3 },
  summerSchool: { label: '📚 Teach summer school', desc: '+8% of salary', share: 0.08, stress: 3 },
  camp: { label: '⛺ Run a summer camp', desc: '+$4,000, happiness +2', pay: 4000, happy: 2, stress: 1 },
  tutoring: { label: '✏️ Private tutoring', desc: '+$6,000', pay: 6000, stress: 2 },
  seasonal: { label: '🛒 Seasonal job', desc: '+$5,000', pay: 5000, stress: 3, happy: -1 },
  curriculum: { label: '🗂️ Write district curriculum', desc: '+$3,500, counts toward admin', pay: 3500, stress: 2, perf: 4 },
};

export const isClassroom = (job) => job?.professionId === 'education' && job.track !== 'mgmt';

export function laneOf(state) {
  return LANES.find((l) => l.test(state));
}

/** Contract step: one per year of teaching experience. */
export const contractStep = (state) => Math.min(MAX_STEP, 1 + yearsInProfession(state, ['education']));

export function applySchedule(state, job) {
  if (!isClassroom(job)) {
    if (job?.professionId === 'education') job.payAdjust = 1;
    return;
  }
  job.step = contractStep(state);
  job.payAdjust = laneOf(state).mult + (hasCredential(state, 'nationalBoard') ? NBCT_STIPEND : 0);
  job.merit = 0;
  recalcSalary(state, job);
}

export const TeachingModule = {
  id: 'teaching',
  order: 30.8,

  init(state) {
    state.teaching ??= { summer: 'rest' };
  },

  setup(engine) {
    engine.bus.on('career:hired', ({ ctx, job }) => applySchedule(ctx.state, job));
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (job?.professionId !== 'education' || !job.paidThisYear) return;
    applySchedule(state, job);
    if (job.track === 'mgmt') return;
    const s = SUMMER_JOBS[state.teaching.summer] ?? SUMMER_JOBS.rest;
    const pay = s.share ? Math.round(job.salary * s.share) : s.pay ?? 0;
    if (pay) ctx.earn(pay, `Summer: ${s.label.replace(/^\S+ /, '')}`, { wage: true });
    if (s.stress) ctx.stat('stress', s.stress);
    if (s.happy) ctx.stat('happiness', s.happy);
    if (s.perf) job.performance = Math.min(100, job.performance + s.perf);
    if (state.teaching.summer === 'rest' && rng.chance(0.3)) ctx.log('You spent the summer actually resting. You came back in August a better teacher.', '🏖️', 'good');
  },

  actions: {
    summer(ctx, id) {
      if (!SUMMER_JOBS[id]) return;
      ctx.state.teaching.summer = id;
      ctx.toast(`Summer plan: ${SUMMER_JOBS[id].label.replace(/^\S+ /, '')}`, 'info');
    },
  },
};
