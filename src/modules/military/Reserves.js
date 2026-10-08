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
import { BRANCHES, ranksOf, rankOf, specialtyName, exposureOf, flightHoursOf, completeTraining, entrySchool, monthlyBasePay, annualActivePay, updateEvaluation, tryPromotion } from './MilitaryEngine.js';
import { annualReview } from './MedalEngine.js';
import { warFactor } from '../world/War.js';
import { runDeployment, openContractReview } from './ActiveDuty.js';
import { upOrOut, noTenureLimit, mustRetire } from './Separation.js';

/** 48 drill periods (each a day's pay) + 15 days annual training ≈ 2.1 months of base pay. */
export const DRILL_PAY_MONTHS = 2.1;

const DRILL_FLAVOR = [
  'Weekend drills: weapons qualification and land navigation.',
  'Annual Training: two weeks of field exercises at a regional training center.',
  'Drill weekend: equipment maintenance, briefings, and a ruck march.',
  'Annual Training: joint exercise with active-duty units.',
];

export function reserveTick(ctx, svc) {
  const { rng } = ctx;
  const branch = BRANCHES[svc.branch];

  if (svc.isNew) {
    svc.isNew = false;
    ctx.log(`You completed ${entrySchool(svc)} and ${specialtyName(svc)} school, then reported to your reserve unit.`, '🎖️', 'military');
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
  const mobilizeChance = 0.08 * exposure * warFactor(ctx.state) ** 1.5 + (svc.deploymentRequested ? 0.6 : 0);
  if (rng.chance(clamp(mobilizeChance, 0, 0.9))) {
    ctx.earn(annualActivePay(svc), `Mobilized pay — ${rankOf(svc).code}`, { wage: true });
    runDeployment(ctx, svc, { mobilized: true });
  } else {
    ctx.earn(monthlyBasePay(svc) * DRILL_PAY_MONTHS, `Reserve drill pay — ${rankOf(svc).code}`, { wage: true });
    if (flightHoursOf(svc)) ctx.emit('logbook:add', { hours: flightHoursOf(svc) });
    ctx.log(`${rng.pick(DRILL_FLAVOR)} Evaluation: ${svc.eval}/100.`, branch.icon, 'military');
    ctx.stat('fitness', 1);
  }

  annualReview(ctx, svc);
  tryPromotion(ctx, svc);
  if (upOrOut(ctx, svc)) return;
  if (svc.contractYearsLeft <= 0 || mustRetire(ctx.state, svc)) openContractReview(ctx, svc);
}
