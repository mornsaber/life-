/**
 * Applies the pay-grade formula to a live job snapshot. Kept separate from
 * CareerEngine so management, union and public-service code can re-price a
 * job without importing the whole career engine.
 */
import { getProfession } from './JobTrees.js';
import { salaryBreakdown } from './PayGrades.js';

export function recalcSalary(state, job) {
  const profession = getProfession(job.professionId);
  job.pay = salaryBreakdown({
    grade: job.grade,
    step: job.step,
    merit: job.merit,
    payMultiplier: profession.payMultiplier,
    sector: job.sector,
    size: job.employer.size,
    regionId: state.character.regionId,
    posting: job.posting,
    exec: job.abilities.includes('exec'),
  });
  job.salary = job.pay.total;
  return job.salary;
}
