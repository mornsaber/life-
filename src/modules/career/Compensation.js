/**
 * Applies the pay-grade formula to a live job snapshot. Kept separate from
 * CareerEngine so management, union and public-service code can re-price a
 * job without importing the whole career engine.
 */
import { getProfession } from './JobTrees.js';
import { salaryBreakdown } from './PayGrades.js';
import { stateOf } from '../life/Regions.js';
import { clearedPremium } from './ClearedWork.js';
import { lawValue } from '../politics/Laws.js';

export function recalcSalary(state, job) {
  const profession = getProfession(job.professionId);
  job.pay = salaryBreakdown({
    grade: job.grade,
    step: job.step,
    merit: job.merit,
    // Job-specific adjustments (a physician's specialty) ride on top of the profession's market premium.
    // Cleared roles on classified programs pay a premium.
    payMultiplier: profession.payMultiplier * (job.payAdjust ?? 1) * (1 + clearedPremium(job)),
    sector: job.sector,
    size: job.employer.size,
    regionId: state.character.regionId,
    posting: job.posting,
    exec: job.abilities.includes('exec'),
  });
  // State minimum wage floors full-time pay (2,080 hours).
  const floor = Math.round((lawValue(state, 'minWage') ?? stateOf(state).minWage) * 2080);
  // Legislated pay adjustments for government employees at that level.
  const adj = lawValue(state, 'publicPay');
  const publicAdj = job.sector === 'federal' ? adj?.federal : job.sector === 'state' ? adj?.state : job.sector === 'municipal' ? adj?.city : 0;
  job.salary = Math.max(publicAdj ? Math.round(job.pay.total * (1 + publicAdj)) : job.pay.total, job.sector === 'federal' ? 0 : floor);
  return job.salary;
}
