/**
 * Career domain module: wires CareerEngine (annual loop), InterviewSystem and
 * WorkplaceActions into a single engine module under the `career.` namespace.
 */
import { careerOnAgeUp, leaveJob } from './CareerEngine.js';
import { InterviewSystem } from './InterviewSystem.js';
import { WorkplaceActions } from './WorkplaceActions.js';

export const CareerModule = {
  id: 'career',
  order: 30,

  setup(engine) {
    // Other domains (e.g. military active duty) can force a resignation.
    engine.bus.on('career:resign', ({ ctx, reason }) => leaveJob(ctx, reason));
  },

  init(state) {
    state.career ??= { job: null, history: [], retired: false };
  },

  onAgeUp: careerOnAgeUp,

  actions: { ...InterviewSystem.actions, ...WorkplaceActions.actions },
  resolvers: { ...InterviewSystem.resolvers, ...WorkplaceActions.resolvers },
};
