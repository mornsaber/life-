/**
 * Runs cleared work each year (recruiters) and handles the offer, the
 * employer-sponsorship action and losing a clearance mid-job.
 */
import { getProfession } from './JobTrees.js';
import { levelById } from './Ladder.js';
import { hire, levelCheck, bestEntryLevel } from './CareerEngine.js';
import { recalcSalary } from './Compensation.js';
import { employerAt } from '../org/Reentry.js';
import { ensureOrgOfType } from '../org/Organizations.js';
import { CLEARANCES } from '../publicservice/PublicServiceEngine.js';
import { recruiterTick, requestSponsorship, makeCleared, loseClearedRole, clearanceLevel } from './ClearedWork.js';

export const ClearedModule = {
  id: 'cleared',
  order: 30.97,

  setup(engine) {
    // A revoked clearance ends a cleared program role; jobs whose level itself needs one are handled by the career module.
    engine.bus.on('career:clearanceRevoked', ({ ctx }) => {
      const job = ctx.state.career.job;
      if (!job?.cleared) return;
      const level = levelById(getProfession(job.professionId), job.levelId);
      if (level?.req?.clearance) return;
      if (loseClearedRole(ctx)) recalcSalary(ctx.state, job);
    });
  },

  onAgeUp(ctx) {
    recruiterTick(ctx, { levelCheck, bestEntryLevel });
  },

  actions: {
    requestSponsorship(ctx) {
      requestSponsorship(ctx);
      if (ctx.state.career.job) recalcSalary(ctx.state, ctx.state.career.job);
    },
  },

  resolvers: {
    offer(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'accept' || !clearanceLevel(state)) return;
      const profession = getProfession(data.field);
      const level = levelById(profession, data.levelId);
      if (!profession || !level || !levelCheck(state, level).ok) return ctx.toast('The offer fell through.', 'warn');
      const org = ensureOrgOfType(state, 'defenseContractor', state.character.regionId, { size: 'enterprise' });
      const employer = employerAt(ctx, org.id, profession);
      employer.size = 'enterprise';
      employer.name = org.name;
      hire(ctx, { professionId: profession.id, levelId: level.id, employer, step: 2 });
      const job = state.career.job;
      if (!job) return;
      makeCleared(ctx, job, clearanceLevel(state));
      recalcSalary(state, job);
      ctx.log(`You joined ${employer.orgName ?? employer.name} on a classified program: $${job.salary.toLocaleString()}/yr.`, CLEARANCES[job.cleared].icon, 'milestone');
    },
  },
};
