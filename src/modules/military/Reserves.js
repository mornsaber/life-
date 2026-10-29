/**
 * Reserve component: one weekend a month plus two weeks of annual training,
 * served alongside a civilian career or school. Reservists can be mobilized
 * (involuntarily or by volunteering), at which point they deploy exactly like
 * active-duty members and their civilian job is protected under USERRA.
 */
import { unitTick } from '../org/MilitaryUnits.js';
import { sofTick } from './SpecialOps.js';
import { serviceLifeTick } from './MilitaryLife.js';
import { schoolTick } from './Schools.js';
import { clamp } from '../../core/Random.js';
import { BRANCHES, ranksOf, rankOf, specialtyName, exposureOf, flightHoursOf, completeTraining, finishOfficerAcademy, entrySchool, monthlyBasePay, annualActivePay, updateEvaluation, tryPromotion, branchOf } from './MilitaryEngine.js';
import { annualReview } from './MedalEngine.js';
import { serviceWar, serviceWarFactor } from '../world/War.js';
import { runDeployment, openContractReview } from './ActiveDuty.js';
import { upOrOut, mustRetire } from './Separation.js';

/** 48 drill periods (each a day's pay) + 15 days annual training ≈ 2.1 months of base pay. */
export const DRILL_PAY_MONTHS = 2.1;

const DRILL_FLAVOR = [
  'Weekend drills: weapons qualification and land navigation.',
  'Annual Training: two weeks of field exercises at a regional training center.',
  'Drill weekend: equipment maintenance, briefings, and a ruck march.',
  'Annual Training: joint exercise with active-duty units.',
];

/** What a Strategic Sealift Officer's reserve year looks like. */
const SEALIFT_DRILLS = [
  'Sealift drill: a week aboard a Ready Reserve ship, testing her break-out from reduced operating status.',
  'Annual training at a fleet headquarters, planning a convoy across a contested ocean.',
  'Naval Cooperation and Guidance for Shipping course: how merchant ships sail under navy protection.',
  'Two weeks with Military Sealift Command, standing watches on a fleet oiler.',
];

export function reserveTick(ctx, svc) {
  const { rng } = ctx;
  const branch = branchOf(svc);

  if (svc.isNew) {
    svc.isNew = false;
    ctx.log(`You completed ${entrySchool(svc)} and ${specialtyName(svc)} school, then reported to your reserve unit.`, '🎖️', 'military');
    finishOfficerAcademy(ctx, svc);
    completeTraining(ctx, svc);
    ctx.stat('fitness', rng.int(5, 10));
  }

  svc.yearsOfService += 1;
  svc.yearsInGrade += 1;
  svc.contractYearsLeft -= 1;
  updateEvaluation(ctx, svc);
  svc.eval = Math.round(clamp(svc.eval + unitTick(ctx, svc, ranksOf(svc)), 0, 100));
  sofTick(ctx, svc);
  serviceLifeTick(ctx, svc);
  schoolTick(ctx, svc);

  const exposure = exposureOf(svc);
  // General mobilization calls up nearly every reservist.
  const mobilizeChance = (serviceWar(ctx.state, svc)?.mobilized ? 0.7 : 0) + 0.08 * exposure * serviceWarFactor(ctx.state, svc) ** 1.5 + (svc.deploymentRequested ? 0.6 : 0);
  if (rng.chance(clamp(mobilizeChance, 0, 0.9))) {
    ctx.earn(annualActivePay(svc), `Mobilized pay — ${rankOf(svc).code}`, { wage: true });
    if (svc.mos === 'navy.1665') ctx.log(rng.pick(['Mobilized as a Strategic Sealift Officer: orders to an MSC ship loading tanks and ammunition for the theatre.', 'Your sealift orders came: chief mate of a Ready Reserve roll-on/roll-off ship, activated in five days.', 'You traded your merchant company\'s uniform for the Navy\'s and joined a convoy staff.']), '⚓', 'military');
    runDeployment(ctx, svc, { mobilized: true });
  } else {
    ctx.earn(monthlyBasePay(svc) * DRILL_PAY_MONTHS, `Reserve drill pay — ${rankOf(svc).code}`, { wage: true });
    if (flightHoursOf(svc)) ctx.emit('logbook:add', { hours: flightHoursOf(svc) });
    ctx.log(`${rng.pick(svc.mos === 'navy.1665' ? SEALIFT_DRILLS : DRILL_FLAVOR)} Evaluation: ${svc.eval}/100.`, branch.icon, 'military');
    ctx.stat('fitness', 1);
  }

  annualReview(ctx, svc);
  tryPromotion(ctx, svc);
  if (upOrOut(ctx, svc)) return;
  if (svc.contractYearsLeft <= 0 || mustRetire(ctx.state, svc)) openContractReview(ctx, svc);
}
