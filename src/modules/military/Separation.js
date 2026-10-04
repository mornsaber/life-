/**
 * Leaving (or being moved within) the service:
 *
 *   Up-or-out      Officers twice not selected for O-3, O-4 or O-5 are
 *                  separated (DOPMA); everyone has a high-year-tenure limit
 *                  for their grade. Involuntary separation pays 10% × years ×
 *                  annual base pay (6+ years); 18+ years is a sanctuary that
 *                  carries you to a 20-year retirement.
 *   Inter-service  Transferring branches needs a conditional release from
 *   transfer       your current service — rarely granted — and enlisted
 *                  members usually give up a stripe.
 *   Early exit     Request early separation, apply as a conscientious
 *                  objector, or desert: dropped from the rolls with an Other
 *                  Than Honorable discharge and a desertion warrant with no
 *                  statute of limitations. If caught: court-martial,
 *                  prison and a dishonorable discharge.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { BRANCHES, ENLIST_CONTRACT, RETIREMENT_YEARS, rankOf, annualActivePay, discharge } from './MilitaryEngine.js';
import { equivalentMos } from './MOS.js';

/** High-year tenure: maximum years of service at each grade (index = grade, 0-based). */
export const ENLISTED_HYT = [6, 6, 8, 10, 14, 20, 26, 29, 32];
export const OFFICER_MAX_SERVICE = [8, 10, 20, 20, 28, 30, 35, 35, 38, 40];
/** Officer grades where two non-selections mean separation: O-2→O-3, O-3→O-4, O-4→O-5. */
export const UP_OR_OUT_GRADES = [1, 2, 3];
export const PASSOVER_LIMIT = 2;
export const SANCTUARY_YEARS = 18;

export const serviceLimit = (svc) => (svc.track === 'officer' ? OFFICER_MAX_SERVICE : ENLISTED_HYT)[svc.grade] ?? 30;

/** Involuntary separation pay (full rate): 10% × years × annual base pay, for 6–20 years. */
export function separationPay(svc) {
  if (svc.yearsOfService < 6 || svc.yearsOfService >= RETIREMENT_YEARS) return 0;
  return Math.round(0.1 * svc.yearsOfService * annualActivePay(svc) * (svc.component === 'reserve' ? 0.5 : 1));
}

/** Apply up-or-out and high-year tenure. Returns true if you were separated. */
export function upOrOut(ctx, svc) {
  const rank = rankOf(svc);
  const passedOver = svc.track === 'officer' && UP_OR_OUT_GRADES.includes(svc.grade) && (svc.passovers ?? 0) >= PASSOVER_LIMIT;
  const overLimit = svc.yearsOfService >= serviceLimit(svc);
  if (!passedOver && !overLimit) return false;
  if (svc.yearsOfService >= RETIREMENT_YEARS) {
    discharge(ctx, 'retired', overLimit ? `Reached the high-year tenure limit for ${rank.title}.` : `Retired after twice being passed over for ${rankOf({ ...svc, grade: svc.grade + 1 }).title}.`);
    return true;
  }
  if (svc.yearsOfService >= SANCTUARY_YEARS) {
    if (!svc.sanctuary) ctx.log('Within two years of retirement, you were selectively continued to reach 20 years.', '🛡️', 'good');
    svc.sanctuary = true;
    return false;
  }
  const pay = separationPay(svc);
  discharge(ctx, 'honorable', passedOver
    ? `Involuntarily separated after twice being passed over for ${rankOf({ ...svc, grade: svc.grade + 1 }).title} (up-or-out).`
    : `Separated at the high-year tenure limit for ${rank.title} (${serviceLimit(svc)} years).`);
  if (pay) ctx.earn(pay, 'Involuntary separation pay', { wage: true });
  ctx.stat('happiness', -6);
  return true;
}

/* ------------------------------------------------------------------ */
/* Inter-service transfer                                              */
/* ------------------------------------------------------------------ */

export function transferEligibility(state, branchId) {
  const svc = state.military.service;
  const target = BRANCHES[branchId];
  if (!svc || !target) return { ok: false, reason: 'Not serving' };
  if (branchId === svc.branch) return { ok: false, reason: 'Your branch' };
  if (target.reserveOnly && svc.component === 'active') return { ok: false, reason: 'The Guard only takes reservists' };
  if (target.nonCombat || BRANCHES[svc.branch].nonCombat) return { ok: false, reason: 'USPHS and NOAA officers resign and apply anew' };
  if (svc.yearsOfService < 2) return { ok: false, reason: 'Serve 2 years first' };
  if (svc.deployedThisYear) return { ok: false, reason: 'Not while deployed' };
  if (svc.disciplinary) return { ok: false, reason: 'Disciplinary record' };
  if (branchId === 'marines' && state.stats.fitness < 65) return { ok: false, reason: 'Marine standards: fitness 65+' };
  if (branchId === 'airforce' && state.stats.smarts < 60) return { ok: false, reason: 'Air Force ASVAB line scores: smarts 60+' };
  if (yearlyCount(state, 'military.transferBranch')) return { ok: false, reason: 'One request a year' };
  return { ok: true };
}

/** Odds your current service grants a conditional release and the new one takes you. */
export function transferChance(state, branchId) {
  const svc = state.military.service;
  const reserveSwap = svc.component === 'reserve' && ['guard', 'army'].includes(branchId) && ['guard', 'army'].includes(svc.branch);
  return clamp(0.12 + (svc.eval - 60) / 150 + (svc.contractYearsLeft <= 1 ? 0.15 : 0) + (reserveSwap ? 0.25 : 0), 0.03, 0.6);
}

export function transferBranch(ctx, branchId) {
  const { state, rng } = ctx;
  const svc = state.military.service;
  const check = transferEligibility(state, branchId);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'military.transferBranch');
  const from = BRANCHES[svc.branch];
  const to = BRANCHES[branchId];
  if (!rng.chance(transferChance(state, branchId))) {
    ctx.log(`The ${from.name} denied your conditional release to join the ${to.name}.`, '📭', 'warn');
    ctx.stat('stress', 3);
    return ctx.toast('Transfer denied', 'bad');
  }
  const reduced = svc.track === 'enlisted' && svc.grade >= 3;
  svc.mos = equivalentMos(svc, branchId)?.id ?? null;
  svc.branch = branchId;
  if (reduced) svc.grade -= 1;
  svc.yearsInGrade = 0;
  svc.passovers = 0;
  svc.contractYearsLeft = ENLIST_CONTRACT[svc.component] + (svc.track === 'officer' ? 1 : 0);
  svc.isNew = true;
  svc.stationYears = 99;
  ctx.log(`Inter-service transfer approved: you left the ${from.name} for the ${to.name} as a ${rankOf(svc).title}${reduced ? ' (reduced one grade to match their structure)' : ''}. New ${svc.contractYearsLeft}-year obligation.`, to.icon, 'milestone');
  ctx.toast(`Joined the ${to.name}`, 'good');
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Early exit: separation, conscientious objection, desertion          */
/* ------------------------------------------------------------------ */

export function leaveServicePrompt(ctx) {
  const { state } = ctx;
  const svc = state.military.service;
  if (!svc) return;
  if (yearlyCount(state, 'military.leave')) return ctx.toast('Your command already ruled on a request this year.', 'warn');
  ctx.prompt({
    type: 'military.leaveService',
    icon: '🚪',
    title: 'Leaving Before Your Contract Is Up',
    text: `${rankOf(svc).title} · ${svc.contractYearsLeft} year${svc.contractYearsLeft === 1 ? '' : 's'} left on your obligation. The service doesn't let people go easily.`,
    options: [
      { id: 'separate', label: '📝 Request early separation (hardship / school)', hint: 'Rarely approved; honorable or general discharge' },
      { id: 'objector', label: '🕊️ Apply as a conscientious objector', hint: 'Long shot; honorable discharge if approved' },
      { id: 'desert', label: '🏃 Desert your unit', hint: 'OTH discharge, a federal warrant, court-martial if caught', tone: 'danger' },
      { id: 'stay', label: '🫡 Never mind — serve out your contract' },
    ],
  });
}

export function resolveLeaveService(ctx, _data, optionId) {
  const { state, rng } = ctx;
  const svc = state.military.service;
  if (!svc || optionId === 'stay') return;
  bumpYearly(state, 'military.leave');
  const kids = (state.people?.list ?? []).some((p) => p.alive && p.relation === 'child' && state.character.age + p.ageOffset < 18);
  if (optionId === 'separate') {
    const chance = clamp(0.15 + (kids ? 0.15 : 0) + (state.stats.health < 50 ? 0.15 : 0) + (svc.contractYearsLeft <= 1 ? 0.25 : 0), 0.05, 0.7);
    if (rng.chance(chance)) discharge(ctx, svc.eval < 45 || svc.disciplinary ? 'general' : 'honorable', 'Early separation approved.');
    else {
      ctx.log('Your request for early separation was denied. You owe the rest of your contract.', '📭', 'warn');
      svc.eval = Math.max(0, svc.eval - 3);
    }
    return;
  }
  if (optionId === 'objector') {
    const chance = svc.combatTours ? 0.08 : 0.2;
    if (rng.chance(chance)) discharge(ctx, 'honorable', 'Separated as a conscientious objector.');
    else {
      ctx.log('The board found your objection insincere. Your unit noticed.', '🕊️', 'bad');
      svc.eval = Math.max(0, svc.eval - 8);
      ctx.stat('stress', 6);
    }
    return;
  }
  // Desertion.
  const branch = BRANCHES[svc.branch].name;
  const deployed = svc.deployedThisYear;
  discharge(ctx, 'oth', 'Dropped from the rolls as a deserter.');
  state.military.deserter = { age: state.character.age, branch: svc.branch };
  ctx.emit('legal:offense', { offenseId: 'desertion', context: `${branch}${deployed ? ', while deployed' : ''}`, discovery: 0.2, evidence: 0.9, yearsLeft: 99 });
  ctx.log(`You walked away from the ${branch} and didn't come back. A federal desertion warrant now has your name on it.`, '🏃', 'bad');
  ctx.stat('stress', 12);
  ctx.stat('happiness', -4);
}
