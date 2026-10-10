/**
 * Reductions in force in the public sector.
 *
 * Government agencies don't lay people off on a whim: a budget hole (a city
 * in fiscal trouble, a state in recession, a federal agency starved by
 * Congress, or a legislated pay cut) leads the agency to announce a RIF of a
 * share of a department. Who goes is set by civil-service retention rules:
 *
 *   tenure group   probationary employees go first, career employees last;
 *                  tenured teachers and judges are exempt
 *   seniority      last in, first out (union contracts make it strict)
 *   veterans       preference keeps veterans on the rolls (federal, state)
 *   performance    a strong rating earns extra retention credit
 *
 * A notice comes with choices real civil servants have: "bump" or "retreat"
 * into a lower position you're qualified for, take priority placement in
 * another agency, take early retirement with a buyout if you're eligible,
 * or accept separation — with severance and three years of recall rights.
 *
 * Department headcount shrinks by the cut and recovers as budgets do (Churn).
 *
 * state.career.recall = { employer, professionId, levelId, title, untilAge } | null
 */
import { clamp } from '../../core/Random.js';
import { unemploymentBenefit, severancePay } from '../world/CountryLaw.js';
import { lawValue } from '../politics/Laws.js';
import { orgOf } from '../org/Organizations.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;

/** 0–1: how badly the employer's budget is squeezed. */
export function budgetPressure(state, job) {
  if (!job || job.sector === 'private') return 0;
  const pay = lawValue(state, 'publicPay');
  if (job.sector === 'municipal') {
    const fh = state.publicService?.city?.fiscalHealth ?? 60;
    return clamp((35 - fh) / 35, 0, 1) + ((pay?.city ?? 0) < 0 ? 0.25 : 0);
  }
  if (job.sector === 'state' || job.sector === 'public') {
    return (state.economy?.phase === 'recession' ? 0.35 : 0) + ((pay?.state ?? 0) < 0 ? 0.25 : 0);
  }
  if (job.sector === 'federal') {
    const stab = state.publicService?.federal?.stability ?? 60;
    return clamp((40 - stab) / 40, 0, 1) + ((pay?.federal ?? 0) < 0 ? 0.25 : 0);
  }
  return 0;
}

const isVeteran = (state) => (state.military?.history?.length ?? 0) > 0;

/** How exposed you are if your department cuts staff (1 = average). */
export function retentionRisk(state, job) {
  if (job.abilities.includes('tenure') || job.tenured) return 0;
  let r = job.probationLeft > 0 ? 3 : job.yearsAtEmployer < 3 ? 1.8 : job.yearsAtEmployer < 10 ? 1 : job.yearsAtEmployer < 20 ? 0.5 : 0.3;
  if (job.unionMember) r *= job.yearsAtEmployer >= 5 ? 0.6 : 1.2; // strict seniority cuts both ways
  if (isVeteran(state) && job.sector !== 'municipal') r *= 0.4;
  if (job.performance >= 80) r *= 0.7;
  if (job.performance < 40) r *= 1.4;
  return r;
}

/** Early retirement (VERA / state incentive): enough age and service. */
export const earlyRetirementEligible = (state, job) => (job.yearsAtEmployer >= 20 && state.character.age >= 50) || job.yearsAtEmployer >= 25;
export const buyoutFor = (job) => (job.sector === 'federal' ? 25000 : Math.round(Math.min(40000, job.salary * 0.25)));

/** The year's budget: maybe a RIF, maybe your notice. Returns true if a notice went out. */
export function publicRifTick(ctx, job, deps) {
  const { state, rng } = ctx;
  const p = budgetPressure(state, job);
  if (p <= 0 || !rng.chance(Math.min(0.6, p * 0.5))) return false;
  const cut = Math.round(rng.float(0.03, 0.04 + p * 0.1) * 100) / 100;
  const org = orgOf(state, job.employer);
  const dept = org?.departments?.[job.employer.deptId];
  if (dept) dept.budgetCut = cut;
  ctx.log(`${job.employer.name} announced a reduction in force: ${Math.round(cut * 100)}% of positions${dept ? ` in ${dept.name}` : ''} to close a budget gap.`, '📉', 'warn');
  const risk = retentionRisk(state, job);
  if (!risk || !rng.chance(clamp(cut * 3 * risk, 0, 0.9))) {
    ctx.log(risk ? 'Your retention standing kept you off the RIF list.' : 'Your tenure protects you from the RIF.', '🛡️', 'good');
    return false;
  }
  const canBump = Boolean(deps.previousLevel(job));
  const placement = job.sector === 'federal' || job.sector === 'state';
  const retire = earlyRetirementEligible(state, job);
  ctx.prompt({
    type: 'career.rifNotice', icon: '📄', title: 'Reduction-in-Force Notice',
    text: `${job.employer.name} issued you a RIF notice: your position as ${job.title} is being abolished in 60 days.${isVeteran(state) && job.sector !== 'municipal' ? ' (Your veterans\' preference wasn\'t enough this time.)' : ''}`,
    options: [
      { id: 'bump', label: '⬇️ Bump to a lower position', hint: canBump ? 'Keep your job and seniority; lower grade' : 'No lower position you qualify for', disabled: !canBump },
      { id: 'placement', label: '🔁 Priority placement in another agency', hint: placement ? 'Same pay if a slot opens (≈60%)' : 'Not offered by city governments', disabled: !placement },
      { id: 'retire', label: '🏖️ Take early retirement', hint: retire ? `${money(buyoutFor(job))} buyout` : 'Needs 20 years at 50+, or 25 years', disabled: !retire },
      { id: 'accept', label: '📦 Accept separation', hint: 'Severance + three years of recall rights' },
    ],
    data: { cut },
  });
  return true;
}

/** Laid off with recall rights: when the budget recovers, the agency calls you back. */
export function recallTick(ctx, deps) {
  const { state, rng } = ctx;
  const r = state.career.recall;
  if (!r) return;
  if (state.character.age > r.untilAge) {
    state.career.recall = null;
    return;
  }
  // Only once the budget has recovered.
  if (state.career.job || budgetPressure(state, { sector: r.employer.sector ?? 'municipal' }) > 0.2 || !rng.chance(0.6)) return;
  ctx.prompt({
    type: 'career.rifRecall', icon: '📞', title: 'Recalled',
    text: `${r.employer.name} is restoring positions and offers you your old job back as ${r.title}, with your seniority intact.`,
    options: [{ id: 'return', label: '✅ Come back' }, { id: 'decline', label: '🙅 Decline' }],
  });
  void deps;
}

export function rifResolvers(deps) {
  return {
    rifNotice(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return;
      if (optionId === 'bump' && deps.demote(ctx, 'bumped to a lower position in a reduction in force')) {
        // Saved pay: the old salary holds for two years.
        job.merit = Math.round((job.merit + 0.04) * 1000) / 1000;
        deps.recalcSalary(state, job);
        ctx.log('Under the RIF rules you bumped into a lower position. Your seniority carries over and saved-pay rules soften the cut.', '⬇️', 'warn');
        return;
      }
      if (optionId === 'placement' && rng.chance(0.6)) {
        job.boss = 55;
        job.coworkers = 50;
        ctx.log('Priority placement found you a matching position in another office — same grade, same pay.', '🔁', 'good');
        return;
      }
      if (optionId === 'retire' && earlyRetirementEligible(state, job)) {
        const buyout = buyoutFor(job);
        deps.leaveJob(ctx, 'Took early retirement in a reduction in force');
        ctx.earn(buyout, 'Separation incentive (buyout)', { wage: true });
        ctx.log(`You took early retirement with a ${money(buyout)} buyout.`, '🏖️', 'milestone');
        return;
      }
      // Separation: severance, unemployment, and recall rights.
      const severance = Math.round((job.salary / 52) * Math.min(52, Math.max(4, job.yearsAtEmployer)));
      const recall = { employer: job.employer, professionId: job.professionId, levelId: job.levelId, title: job.title, untilAge: state.character.age + 3 };
      deps.leaveJob(ctx, 'Separated in a reduction in force');
      ctx.earn(severance, 'Severance pay', { wage: true });
      { const ui = unemploymentBenefit(ctx.state.character.countryId, job.salary); ctx.earn(ui.amount, ui.name); }
      state.career.recall = recall;
      ctx.log(`You were separated in the RIF with ${money(severance)} in severance. You're on the recall list for three years.`, '📦', 'bad');
      ctx.stat('stress', 8);
    },
    rifRecall(ctx, _data, optionId) {
      const { state } = ctx;
      const r = state.career.recall;
      state.career.recall = null;
      if (!r || optionId !== 'return' || state.career.job) return;
      if (deps.hire(ctx, { professionId: r.professionId, levelId: r.levelId, employer: r.employer })) {
        ctx.log(`You're back at ${r.employer.name} as ${r.title}.`, '📞', 'good');
      }
    },
  };
}
