/**
 * Career domain module: wires CareerEngine (annual loop) with the interview,
 * workplace, management, contracting and union subsystems under the
 * `career.` namespace, and listens for cross-domain events.
 */
import { clamp } from '../../core/Random.js';
import { careerOnAgeUp, leaveJob, recalcSalary, promote, hire } from './CareerEngine.js';
import { getProfession } from './JobTrees.js';
import { ladderFor } from './Ladder.js';
import { createEmployer } from './Employers.js';
import { REGIONS } from '../life/Regions.js';
import { InterviewSystem } from './InterviewSystem.js';
import { WorkplaceActions } from './WorkplaceActions.js';
import { ManagementActions, ManagementResolvers } from './ManagementEngine.js';
import { ContractingResolvers, setWorkforce } from './ContractingSystem.js';
import { UnionActions, UnionResolvers } from './UnionsAndLabor.js';

export const CareerModule = {
  id: 'career',
  order: 30,

  setup(engine) {
    const bus = engine.bus;
    // Old saves: v1 jobs were tier-based; re-create them on today's ladder at the same employer name.
    bus.on('save:migrated', ({ ctx }) => {
      const { state } = ctx;
      const old = state.career.legacyJob;
      delete state.career.legacyJob;
      const job = state.career.job;
      if (job?.employer && !job.employer.stateId) job.employer.stateId = (REGIONS[state.character.regionId] ?? REGIONS.midcity).state;
      const profession = old && getProfession(old.professionId);
      if (!profession) return;
      const employer = createEmployer(ctx.rng, state, profession, state.character.regionId);
      if (old.company) employer.name = old.company;
      const ladder = ladderFor(profession, employer.size);
      const level = ladder[Math.min(old.tier ?? 0, ladder.length - 1)];
      hire(ctx, { professionId: profession.id, levelId: level.id, employer });
      Object.assign(state.career.job, { startAge: old.startAge ?? state.character.age, yearsAtEmployer: old.yearsAtCompany ?? 0, performance: old.performance ?? 60, boss: old.boss ?? 60 });
      state.prompts = state.prompts.filter((p) => p.type !== 'career.chooseTrack');
    });
    // Other domains (active duty, relocation, councils, prisons) can end a job.
    bus.on('career:resign', ({ ctx, reason, fired }) => leaveJob(ctx, reason, { fired }));
    // Gubernatorial appointment to an appointed post (superintendent, director...).
    bus.on('career:appoint', ({ ctx, levelId }) => {
      if (ctx.state.career.job && promote(ctx, levelId)) ctx.log('The governor appointed you. The press release went out that afternoon.', '⭐', 'milestone');
    });
    bus.on('career:adjust', ({ ctx, performance = 0, boss = 0, coworkers = 0 }) => {
      const job = ctx.state.career.job;
      if (!job) return;
      job.performance = Math.round(clamp(job.performance + performance, 0, 100));
      job.boss = Math.round(clamp(job.boss + boss, 0, 100));
      job.coworkers = Math.round(clamp(job.coworkers + coworkers, 0, 100));
    });
    bus.on('career:posting', ({ ctx, posting }) => {
      const job = ctx.state.career.job;
      if (!job) return;
      job.posting = posting;
      job.postingYears = 0;
      recalcSalary(ctx.state, job);
    });
    bus.on('budget:charge', ({ ctx, sponsor, amount }) => {
      const job = ctx.state.career.job;
      if (sponsor.type === 'employer' && !sponsor.academy && job) job.employer.budget.left = Math.max(0, job.employer.budget.left - amount);
    });
    bus.on('career:clearanceRevoked', ({ ctx }) => {
      if (ctx.state.career.job?.clearance) leaveJob(ctx, 'Your security clearance was revoked', { fired: true });
    });
    bus.on('legal:convicted', ({ ctx, severity, jobRelated, name }) => {
      const job = ctx.state.career.job;
      if (!job) return;
      if (severity === 'felony' || jobRelated) leaveJob(ctx, `Terminated after a ${name} conviction`, { fired: true });
      else if (severity === 'misdemeanor') {
        job.warnings += 1;
        job.boss = Math.max(0, job.boss - 10);
        ctx.log(`Your employer found out about the ${name} conviction. Formal warning.`, '⚠️', 'warn');
      }
    });
    bus.on('legal:incarcerated', ({ ctx }) => leaveJob(ctx, 'You were incarcerated', { fired: true }));
    // Remote workers and transferred employees are re-priced for the new region.
    bus.on('region:changed', ({ ctx }) => {
      const job = ctx.state.career.job;
      if (!job) return;
      const before = job.salary;
      recalcSalary(ctx.state, job);
      if (job.remote && job.salary !== before) ctx.log(`${job.employer.name} geo-adjusted your remote pay: $${before.toLocaleString()} → $${job.salary.toLocaleString()}.`, '🌐', job.salary < before ? 'warn' : 'good');
    });
  },

  init(state) {
    state.career ??= { job: null, history: [] };
  },

  onAgeUp: careerOnAgeUp,

  actions: {
    ...InterviewSystem.actions,
    ...WorkplaceActions.actions,
    ...ManagementActions,
    ...UnionActions,
    setWorkforce(ctx, mode) {
      const job = ctx.state.career.job;
      if (!job?.department) return;
      if (!job.abilities.includes('hire') && !job.abilities.includes('delegate')) return ctx.toast('You need hiring authority to restructure your workforce.', 'warn');
      setWorkforce(ctx, job, mode);
    },
  },
  resolvers: {
    ...InterviewSystem.resolvers,
    ...WorkplaceActions.resolvers,
    ...ManagementResolvers,
    ...ContractingResolvers,
    ...UnionResolvers,
  },
};
