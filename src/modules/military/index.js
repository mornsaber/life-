/**
 * Military domain module: routes the yearly tick to ActiveDuty or Reserves,
 * reacts to civilian convictions, and exposes service actions. Retired pay
 * and VA benefits are paid by the retirement module.
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import {
  BRANCHES, SPECIALTIES, ENLIST_CONTRACT, RETIREMENT_YEARS,
  enlistmentEligibility, enlist, discharge, commission, rankOf, specialtyName, branchOf, branchFor } from './MilitaryEngine.js';
import { activeDutyTick, ActiveDutyResolvers } from './ActiveDuty.js';
import { monthlyBasePay, requiredClearance, clearanceDenied } from './MilitaryEngine.js';
import { hasClearance, adjudicate, backgroundIssues, CLEARANCES } from '../publicservice/PublicServiceEngine.js';
import { awardMedal } from './MedalEngine.js';
import { reserveTick } from './Reserves.js';
import { MOS, mosFor, mosEligibility, hasDirectPath, directGrade, directCredit, enlistedStartGrade, defaultMos, DIRECT_COMMISSIONS, DIRECT_MAX_AGE } from './MOS.js';
import { transferBranch, leaveServicePrompt, resolveLeaveService } from './Separation.js';
import { LeadershipActions, LeadershipResolvers } from '../org/MilitaryUnits.js';
import { SpecialOpsActions, SpecialOpsResolvers } from './SpecialOps.js';
import { UcmjResolvers, imposeNjp } from './UCMJ.js';
import { MilitaryLifeActions, MilitaryLifeResolvers, militaryLifeTick } from './MilitaryLife.js';
import { SchoolActions, SchoolResolvers } from './Schools.js';
import { CareerFieldActions, CareerFieldResolvers } from './CareerFields.js';
import { TransitionActions, TransitionResolvers, transitionTick, veteranTick, onSeparation, onBusinessStarted } from './Transition.js';
import { AssignmentActions, AssignmentResolvers } from './Assignments.js';

const ENLISTED_CODE = (grade) => `E-${grade + 1}`;

/** Prompt options for every job in a branch, with entry standards and starting rank. */
export function mosOptions(state, branch, track, { allowDirect = true, component = 'reserve' } = {}) {
  return mosFor(branch, track).filter((m) => allowDirect || !m.direct).map((m) => {
    const s = SPECIALTIES[m.specialty];
    const fit = mosEligibility(state, m, { smartsFloor: s.minSmarts ?? 0 });
    const level = requiredClearance({ track, specialty: m.specialty, mos: m.id });
    const notes = [m.desc ?? s.desc];
    if (m.direct && fit.ok) {
      const c = directCredit(state, m, component);
      const ranks = BRANCHES[branch].officer;
      notes.unshift(`Direct commission as O-${c.grade + 1} ${ranks[c.grade]} (${c.years} yrs constructive credit${c.capped ? `; ${component === 'active' ? 'active duty' : 'the Reserve'} tops out at O-${c.cap + 1} for this corps` : ''})`);
    } else if (m.direct) notes.unshift(DIRECT_COMMISSIONS[m.direct].needs);
    if (track === 'enlisted') {
      const g = enlistedStartGrade(state, branch, m);
      if (g > 0) notes.unshift(`Starts as ${ENLISTED_CODE(g)} ${BRANCHES[branch].enlisted[g]}`);
    }
    if (m.selection) notes.push('Selection required');
    if (m.grants?.length) notes.push('Earns civilian credentials');
    if (level) notes.push(`${CLEARANCES[level].name} clearance`);
    if (!fit.ok) notes.unshift(fit.reason);
    return { id: m.id, label: `${s.icon} ${m.code} ${m.title}`, hint: notes.join(' · '), disabled: !fit.ok };
  });
}

function withService(ctx) {
  const svc = ctx.state.military.service;
  if (!svc) ctx.toast("You're not in the military.", 'warn');
  return svc;
}

function switchComponent(ctx, svc) {
  svc.assignment = null;
  svc.commissioning = null;
  const { state } = ctx;
  const to = svc.component === 'active' ? 'reserve' : 'active';
  if (to === 'active' && state.education.enrolled) return ctx.toast('Finish or drop school before going active.', 'warn');
  if (to === 'active' && branchOf(svc).reserveOnly) return ctx.toast('The Guard has no active component — transfer to the Army first.', 'warn');
  if (branchOf(svc).activeOnly) return ctx.toast(`The ${branchOf(svc).name} has no reserve component.`, 'warn');
  svc.component = to;
  svc.contractYearsLeft = ENLIST_CONTRACT[to];
  svc.deploymentRequested = false;
  if (to === 'active' && state.career.job) ctx.emit('career:militaryLeave', { reason: 'transferred to active duty' });
  if (to === 'reserve') ctx.emit('military:releasedFromActive', {});
  ctx.log(to === 'active' ? 'You transferred to full-time active duty.' : 'You transferred to the Reserve. Weekend drills from here on.', branchOf(svc).icon, 'milestone');
  ctx.toast(to === 'active' ? 'Now on active duty' : 'Now in the Reserves', 'good');
}

export const MilitaryModule = {
  id: 'military',
  order: 20,

  setup(engine) {
    // Conscripts and national-service volunteers (Conscription.js) report for duty.
    engine.bus.on('conscription:enlist', ({ ctx, branch, months }) => {
      enlist(ctx, { branch, track: 'enlisted', component: 'active', conscript: true, specialty: ctx.rng.chance(0.7) ? 'infantry' : ctx.rng.pick(['logistics', 'medic', 'engineer']) });
      const svc = ctx.state.military.service;
      if (svc) svc.contractYearsLeft = Math.max(1, Math.round(months / 12));
    });
    // Losing your clearance: enlisted members are reclassified; officers are separated.
    engine.bus.on('career:clearanceRevoked', ({ ctx }) => {
      const svc = ctx.state.military.service;
      if (!svc?.clearance) return;
      svc.clearance = null;
      if (svc.track !== 'enlisted') return discharge(ctx, 'general', 'Separated after your security clearance was revoked.');
      if (SPECIALTIES[svc.specialty].clearance) {
        svc.specialty = 'logistics';
        svc.eval = Math.max(0, svc.eval - 15);
        ctx.log('Without a clearance, you were pulled from your specialty and reclassified into Logistics.', '🚫', 'bad');
      }
    });
    engine.bus.on('legal:convicted', ({ ctx, severity, name, courtMartial }) => {
      const svc = ctx.state.military.service;
      if (!svc || courtMartial) return;
      if (severity === 'felony') discharge(ctx, 'oth', `Separated after a civilian ${name} conviction.`);
      else if (severity === 'misdemeanor') {
        ctx.log(`Your command learned of your ${name} conviction.`, '⚖️', 'bad');
        imposeNjp(ctx, /dui/i.test(name) ? 'dui' : 'disobey');
      }
    });
    engine.bus.on('military:discharged', ({ ctx, type, svc }) => onSeparation(ctx, svc, type));
    engine.bus.on('business:started', ({ ctx }) => onBusinessStarted(ctx));
    // Governors activate the Guard for disasters, unrest and border missions (service/StateForces.js).
    // Caught deserters: the court-martial upgrades the discharge to dishonorable.
    engine.bus.on('legal:convicted', ({ ctx, offenseId }) => {
      if (offenseId !== 'desertion') return;
      const record = [...ctx.state.military.history].reverse().find((h) => h.discharge === 'oth' || h.discharge === 'dishonorable');
      if (record) record.discharge = 'dishonorable';
      ctx.state.military.deserter = null;
    });
    engine.bus.on('legal:incarcerated', ({ ctx }) => {
      if (ctx.state.military.service) discharge(ctx, 'oth', 'Administratively separated while incarcerated.');
    });
  },

  init(state) {
    state.military ??= { service: null, history: [] };
    state.military.deserter ??= null;
    state.military.selection ??= null;
    state.military.academyCredit ??= 0;
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    militaryLifeTick(ctx);
    veteranTick(ctx);
    const svc = state.military.service;
    if (!svc) return;
    svc.deployedThisYear = false;
    if (svc.component === 'active') activeDutyTick(ctx, svc);
    else reserveTick(ctx, svc);
    if (state.military.service === svc && state.character.alive) transitionTick(ctx, svc);
  },

  actions: {
    ...LeadershipActions,
    ...SpecialOpsActions,
    ...MilitaryLifeActions,
    ...SchoolActions,
    ...CareerFieldActions,
    ...TransitionActions,
    ...AssignmentActions,
    /** arg: 'branch:track:component' — opens the job (MOS) selection. */
    enlist(ctx, arg) {
      const { state } = ctx;
      const [branch, track, component] = String(arg).split(':');
      const direct = track === 'officer' && hasDirectPath(state, branch);
      const check = enlistmentEligibility(state, branch, track, component, { maxOfficerAge: direct ? DIRECT_MAX_AGE : 39 });
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      if (component === 'active' && state.education.enrolled) return ctx.toast('Finish or drop school first (or join the Reserves).', 'warn');
      const b = branchFor(state, branch) ?? BRANCHES[branch];
      ctx.prompt({
        type: 'military.chooseSpecialty',
        icon: b.icon,
        title: `${b.name} — Choose Your ${track === 'officer' ? 'Officer Specialty' : track === 'warrant' ? 'Warrant Officer Specialty' : 'Job (MOS/Rating)'}`,
        text: `${component === 'active' ? 'Active duty' : 'Reserve'} ${track} contract.` +
          (component === 'active' && state.career.job ? `\nYou'll resign as ${state.career.job.title}.` : '') +
          '\nHigher combat exposure means more deployments, more danger, and more chances for valor.' +
          (track === 'officer' ? '\nLawyers, doctors, nurses, pharmacists, clergy and tech veterans can take a direct commission at a rank that reflects their experience.' : ''),
        options: [
          ...mosOptions(state, branch, track, { component }).filter((o) => track !== 'warrant' || MOS[o.id]?.flight),
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
      if (svc.assignment || svc.commissioning || svc.topPost) return ctx.toast('Not during a special assignment.', 'warn');
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
      if (svc.assignment || svc.commissioning || svc.topPost) return ctx.toast('Not during a special assignment.', 'warn');
      switchComponent(ctx, svc);
    },

    transferBranch(ctx, branchId) {
      if (!withService(ctx)) return;
      transferBranch(ctx, branchId);
    },

    leaveService(ctx) {
      if (!withService(ctx)) return;
      leaveServicePrompt(ctx);
    },

    retire(ctx) {
      const svc = withService(ctx);
      if (!svc) return;
      if (svc.yearsOfService < RETIREMENT_YEARS) return ctx.toast(`Retirement requires ${RETIREMENT_YEARS} years of service.`, 'warn');
      discharge(ctx, 'retired', `${svc.yearsOfService} years of faithful service.`);
    },
  },

  resolvers: {
    ...LeadershipResolvers,
    ...SpecialOpsResolvers,
    ...UcmjResolvers,
    ...MilitaryLifeResolvers,
    ...SchoolResolvers,
    ...CareerFieldResolvers,
    ...TransitionResolvers,
    ...AssignmentResolvers,
    leaveService: resolveLeaveService,

    chooseSpecialty(ctx, data, optionId) {
      if (optionId === 'cancel') return;
      // A broad specialty id (older callers) picks that specialty's first job.
      const job = MOS[optionId] ?? defaultMos(data.branch, data.track, optionId);
      if (!job) return ctx.toast('That job isn\'t open in this branch.', 'warn');
      const check = enlistmentEligibility(ctx.state, data.branch, data.track, data.component, { maxOfficerAge: job.direct ? DIRECT_COMMISSIONS[job.direct].maxAge : 39 });
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const fit = mosEligibility(ctx.state, job, { smartsFloor: SPECIALTIES[job.specialty].minSmarts ?? 0 });
      if (!fit.ok) return ctx.toast(fit.reason, 'warn');
      const specialtyId = job.specialty;
      // Cleared specialties (and all officers) go through an SF-86. With anything in your background, honesty is a choice.
      const level = requiredClearance({ track: data.track, specialty: specialtyId, mos: job.id });
      const issues = backgroundIssues(ctx.state).filter((i) => !i.hidden);
      if (level && !hasClearance(ctx.state, level) && issues.length) {
        ctx.prompt({
          type: 'military.clearance', icon: CLEARANCES[level].icon,
          title: `SF-86: ${CLEARANCES[level].name} Investigation`,
          text: `Your ${data.track === 'officer' ? 'commission' : 'specialty'} requires a ${CLEARANCES[level].name} clearance${CLEARANCES[level].polygraph ? ', including a polygraph' : ''}.\nYour background includes: ${issues.map((i) => i.label).join('; ')}.`,
          options: [
            { id: 'disclose', label: '📝 Disclose everything truthfully', hint: 'Candor mitigates issues' },
            { id: 'omit', label: '🙈 Leave the problems off the form', hint: 'Lying on an SF-86 is a federal crime', tone: 'danger' },
          ],
          data: { ...data, specialty: specialtyId, mos: job.id, level },
        });
        return;
      }
      enlist(ctx, { ...data, specialty: specialtyId, mos: job.id });
    },

    clearance(ctx, data, optionId) {
      const { state, rng } = ctx;
      const r = adjudicate(state, data.level, optionId === 'disclose', rng);
      if (r.caught) {
        ctx.log(`${r.reason}. The recruiter tore up your contract and referred the false statement to federal prosecutors.`, '🕵️', 'bad');
        ctx.emit('legal:offense', { offenseId: 'falseStatement', context: 'lying on a military SF-86', caught: true, evidence: 0.85 });
        return;
      }
      if (r.granted) {
        ctx.emit('clearance:grant', { level: data.level, concealed: r.concealed });
        return enlist(ctx, { ...data, cleared: true });
      }
      const specialty = clearanceDenied(ctx, data.track, data.level);
      if (specialty) enlist(ctx, { ...data, specialty, mos: null, cleared: true });
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
