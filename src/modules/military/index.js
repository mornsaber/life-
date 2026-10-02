/**
 * Military domain module: routes the yearly tick to ActiveDuty or Reserves,
 * pays retirement/disability benefits, and exposes service actions.
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import {
  BRANCHES, SPECIALTIES, ENLIST_CONTRACT, RETIREMENT_YEARS,
  enlistmentEligibility, enlist, discharge, commission, rankOf, specialtyName,
} from './MilitaryEngine.js';
import { activeDutyTick, ActiveDutyResolvers } from './ActiveDuty.js';
import { reserveTick } from './Reserves.js';

function withService(ctx) {
  const svc = ctx.state.military.service;
  if (!svc) ctx.toast("You're not in the military.", 'warn');
  return svc;
}

function switchComponent(ctx, svc) {
  const { state } = ctx;
  const to = svc.component === 'active' ? 'reserve' : 'active';
  if (to === 'active' && state.education.enrolled) return ctx.toast('Finish or drop school before going active.', 'warn');
  svc.component = to;
  svc.contractYearsLeft = ENLIST_CONTRACT[to];
  svc.deploymentRequested = false;
  if (to === 'active' && state.career.job) ctx.emit('career:resign', { reason: 'Transferred to active duty' });
  ctx.log(to === 'active' ? 'You transferred to full-time active duty.' : 'You transferred to the Reserve. Weekend drills from here on.', BRANCHES[svc.branch].icon, 'milestone');
  ctx.toast(to === 'active' ? 'Now on active duty' : 'Now in the Reserves', 'good');
}

export const MilitaryModule = {
  id: 'military',
  order: 20,

  init(state) {
    state.military ??= { service: null, history: [], benefits: [] };
    state.military.benefits ??= [];
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    for (const benefit of state.military.benefits) {
      if (state.character.age >= benefit.startAge) ctx.earn(benefit.annual, benefit.label);
    }
    const svc = state.military.service;
    if (!svc) return;
    svc.deployedThisYear = false;
    if (svc.component === 'active') activeDutyTick(ctx, svc);
    else reserveTick(ctx, svc);
  },

  actions: {
    /** arg: 'branch:track:component' — opens the specialty selection. */
    enlist(ctx, arg) {
      const [branch, track, component] = String(arg).split(':');
      const check = enlistmentEligibility(ctx.state, branch, track);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      if (component === 'active' && ctx.state.education.enrolled) return ctx.toast('Finish or drop school first (or join the Reserves).', 'warn');
      const b = BRANCHES[branch];
      const svcPreview = { branch };
      ctx.prompt({
        type: 'military.chooseSpecialty',
        icon: b.icon,
        title: `${b.name} — Choose Your ${track === 'officer' ? 'Branch Specialty' : 'Job (MOS/Rating)'}`,
        text: `${component === 'active' ? 'Active duty' : 'Reserve'} ${track} contract.` +
          (component === 'active' && ctx.state.career.job ? `\nYou'll resign as ${ctx.state.career.job.title}.` : '') +
          '\nHigher combat exposure means more deployments, more danger, and more chances for valor.',
        options: [
          ...Object.entries(SPECIALTIES).map(([id, s]) => ({
            id,
            label: `${s.icon} ${specialtyName({ ...svcPreview, specialty: id })}`,
            hint: s.desc,
            disabled: Boolean(s.minSmarts && ctx.state.stats.smarts < s.minSmarts),
          })),
          { id: 'cancel', label: '↩️ Walk out of the recruiter\'s office' },
        ],
        data: { branch, track, component },
      });
    },

    pt(ctx) {
      const svc = withService(ctx);
      if (!svc) return;
      const n = bumpYearly(ctx.state, 'military.pt');
      if (n > 2) return ctx.toast('Your body needs recovery time.', 'warn');
      svc.ptSessions = (svc.ptSessions ?? 0) + 1;
      ctx.stat('fitness', ctx.rng.int(3, 6));
      ctx.stat('stress', -2);
      ctx.log('You crushed extra PT sessions before dawn.', '🏃');
      ctx.toast('Fitness up, evaluation boosted', 'good');
    },

    extraDuty(ctx) {
      const svc = withService(ctx);
      if (!svc) return;
      if (yearlyCount(ctx.state, 'military.extraDuty')) return ctx.toast('Already volunteered this year.', 'warn');
      bumpYearly(ctx.state, 'military.extraDuty');
      svc.extraDuty = true;
      ctx.stat('stress', 5);
      ctx.log(ctx.rng.pick(['You volunteered as staff duty NCO over the holidays.', 'You took on an additional duty as unit safety officer.', 'You led the battalion color guard.']), '🫡');
      ctx.toast('Volunteered for extra duty', 'good');
    },

    requestDeployment(ctx) {
      const svc = withService(ctx);
      if (!svc) return;
      svc.deploymentRequested = !svc.deploymentRequested;
      ctx.toast(svc.deploymentRequested ? 'Volunteered for the next deployment' : 'Deployment request withdrawn', 'info');
    },

    applyOCS(ctx) {
      const { state, rng } = ctx;
      const svc = withService(ctx);
      if (!svc) return;
      if (svc.track === 'officer') return ctx.toast('Already an officer.', 'warn');
      if (!state.education.degrees.some((d) => ['bachelor', 'mba', 'jd', 'md'].includes(d.type))) return ctx.toast("OCS requires a bachelor's degree.", 'warn');
      if (yearlyCount(state, 'military.ocs')) return ctx.toast('You already applied this year.', 'warn');
      bumpYearly(state, 'military.ocs');
      const chance = clamp(0.25 + (svc.eval - 50) / 80 + (state.stats.smarts - 50) / 200, 0.05, 0.9);
      if (rng.chance(chance)) commission(ctx, svc);
      else {
        ctx.log('The OCS selection board did not pick up your packet this year.', '📭', 'warn');
        ctx.toast('OCS packet not selected', 'bad');
      }
    },

    switchComponent(ctx) {
      const svc = withService(ctx);
      if (!svc) return;
      if (svc.yearsOfService < 2) return ctx.toast('Finish your initial 2-year obligation first.', 'warn');
      switchComponent(ctx, svc);
    },

    retire(ctx) {
      const svc = withService(ctx);
      if (!svc) return;
      if (svc.yearsOfService < RETIREMENT_YEARS) return ctx.toast(`Retirement requires ${RETIREMENT_YEARS} years of service.`, 'warn');
      discharge(ctx, 'retired', `${svc.yearsOfService} years of faithful service.`);
    },
  },

  resolvers: {
    chooseSpecialty(ctx, data, optionId) {
      if (optionId === 'cancel') return;
      const check = enlistmentEligibility(ctx.state, data.branch, data.track);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      enlist(ctx, { ...data, specialty: optionId });
    },

    ...ActiveDutyResolvers,

    contractEnd(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const svc = state.military.service;
      if (!svc) return;
      if (optionId === 'reenlist') {
        svc.contractYearsLeft = ENLIST_CONTRACT[svc.component];
        if (svc.track === 'enlisted' && svc.eval >= 60) {
          const bonus = rng.int(2, 8) * 5000;
          ctx.earn(bonus, 'Re-enlistment bonus');
          ctx.log(`You re-enlisted and pocketed a $${bonus.toLocaleString()} bonus.`, '✍️', 'good');
        } else {
          ctx.log(`You signed on for another ${svc.contractYearsLeft} years as a ${rankOf(svc).title}.`, '✍️', 'good');
        }
      } else if (optionId === 'switch') {
        switchComponent(ctx, svc);
      } else if (optionId === 'retire') {
        discharge(ctx, 'retired', `${svc.yearsOfService} years of faithful service.`);
      } else {
        const type = svc.disciplinary >= 2 || svc.eval < 35 ? 'general' : 'honorable';
        discharge(ctx, type, 'Completed your service obligation.');
      }
    },
  },
};
