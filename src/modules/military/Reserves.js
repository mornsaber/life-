/**
 * Reserve component: one weekend a month plus two weeks of annual training,
 * served alongside a civilian career or school. Reservists can be mobilized
 * (involuntarily or by volunteering), at which point they deploy exactly like
 * active-duty members and their civilian job is protected under USERRA.
 */
import { clamp } from '../../core/Random.js';
import { BRANCHES, SPECIALTIES, rankOf, specialtyName, monthlyBasePay, annualActivePay, updateEvaluation, tryPromotion } from './MilitaryEngine.js';
import { annualReview } from './MedalEngine.js';
import { runDeployment, openContractReview } from './ActiveDuty.js';

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
    const school = svc.track === 'officer' ? branch.officerSchool : branch.basic;
    ctx.log(`You completed ${school} and ${specialtyName(svc)} school, then reported to your reserve unit.`, '🎖️', 'military');
    ctx.stat('fitness', rng.int(5, 10));
  }

  svc.yearsOfService += 1;
  svc.yearsInGrade += 1;
  svc.contractYearsLeft -= 1;
  updateEvaluation(ctx, svc);

  const exposure = SPECIALTIES[svc.specialty].exposure;
  const mobilizeChance = 0.08 * exposure + (svc.deploymentRequested ? 0.6 : 0);
  if (rng.chance(clamp(mobilizeChance, 0, 0.9))) {
    ctx.earn(annualActivePay(svc), `Mobilized pay — ${rankOf(svc).code}`);
    runDeployment(ctx, svc, { mobilized: true });
  } else {
    ctx.earn(monthlyBasePay(svc) * DRILL_PAY_MONTHS, `Reserve drill pay — ${rankOf(svc).code}`);
    ctx.log(`${rng.pick(DRILL_FLAVOR)} Evaluation: ${svc.eval}/100.`, branch.icon, 'military');
    ctx.stat('fitness', 1);
  }

  annualReview(ctx, svc);
  tryPromotion(ctx, svc);
  if (svc.contractYearsLeft <= 0 || svc.yearsOfService >= 30 || ctx.state.character.age >= 62) openContractReview(ctx, svc);
}
