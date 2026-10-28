/**
 * Applies the pay-grade formula to a live job snapshot. Kept separate from
 * CareerEngine so management, union and public-service code can re-price a
 * job without importing the whole career engine.
 */
import { getProfession } from './JobTrees.js';
import { levelById } from './Ladder.js';
import { salaryBreakdown, onBands, bandFromStep, payCap } from './PayGrades.js';
import { stateOf } from '../life/Regions.js';
import { clearedPremium } from './ClearedWork.js';
import { lawValue } from '../politics/Laws.js';
import { knob } from '../../core/Difficulty.js';

/**
 * Government command staff (grade 7+) are paid more at bigger agencies (a big-city chief vs a
 * small-town chief); rank-and-file and first-line supervisors follow the union scale and locality,
 * and federal pay is set nationally.
 */
export const PUBLIC_MGMT_SCALE = { micro: 0.85, small: 0.93, medium: 1, large: 1.06, enterprise: 1.12, mega: 1.2 };

export function recalcSalary(state, job) {
  const profession = getProfession(job.professionId);
  const level = profession ? levelById(profession, job.levelId) : null;
  const managerial = Boolean(level?.abilities?.includes('supervise'));
  const rankPay = (level?.rankPay ?? 1) * (job.employer.size === 'mega' && level?.megaHeadPay ? level.megaHeadPay : 1);
  // Command staff only (lieutenants and sergeants are on the union scale); federal pay is set nationally.
  const agencyScale = ['municipal', 'state', 'public'].includes(job.sector) && managerial && (level?.grade ?? 0) >= 7 ? PUBLIC_MGMT_SCALE[job.employer.size] ?? 1 : 1;
  // Old saves: a company job's position in its band starts where its step put it.
  if (onBands(job)) job.band ??= bandFromStep(job.step);
  job.pay = salaryBreakdown({
    grade: job.grade,
    step: job.step,
    band: onBands(job) ? job.band : null,
    merit: job.merit,
    // Job-specific adjustments (a physician's specialty) ride on top of the profession's market premium.
    // Cleared roles on classified programs pay a premium.
    payMultiplier: profession.payMultiplier * (job.payAdjust ?? 1) * (1 + clearedPremium(job)) * rankPay * agencyScale,
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
  // Difficulty: everyone's paid a little more (Story) or less (Hard, Brutal).
  const total = Math.round(job.pay.total * knob(state, 'income'));
  // Government pay stops at the legal cap, however senior the post.
  const cap = Math.round(payCap(job, state.character.countryId) * knob(state, 'income'));
  const capped = Math.min(publicAdj ? Math.round(total * (1 + publicAdj)) : total, cap);
  job.pay.capped = capped < total;
  // Vowed religious draw no salary: the order houses and feeds them.
  job.salary = profession.unpaid ? 0 : Math.max(capped, job.sector === 'federal' ? 0 : floor);
  return job.salary;
}
