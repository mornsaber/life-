/**
 * Social Security Disability Insurance as it actually works: you apply,
 * wait, are probably denied, appeal, and maybe win at a hearing years
 * later — with back pay once you do.
 *
 *   eligibility   enough recent work (5+ years of covered earnings), under
 *                 full retirement age, not earning above "substantial
 *                 gainful activity"
 *   stages        initial (≈35% approved) → reconsideration (≈15%) →
 *                 ALJ hearing (≈50%, a year+ later) → Appeals Council (≈12%)
 *   waiting       benefits start 5 months after onset; Medicare after 24
 *                 months of benefits
 *   back pay      paid as a lump sum on approval; a disability attorney
 *                 takes 25%, capped at $9,200
 *   grid rules    being 50+ with limited education makes approval likelier
 *
 * state.health.disability.ssdiClaim = { stage, onsetAge, filedAge, lawyer, denials }
 */
import { clamp } from '../../core/Random.js';
import { primaryInsuranceAmount } from '../retirement/RetirementEngine.js';
import { disablingConditions } from './HealthEngine.js';
import { DEGREE_RANK, yearsInProfession } from '../../core/State.js';

export const STAGES = {
  initial: { label: 'Initial application', odds: 0.35 },
  reconsideration: { label: 'Reconsideration', odds: 0.15 },
  hearing: { label: 'Hearing before an administrative law judge', odds: 0.5 },
  council: { label: 'Appeals Council review', odds: 0.12 },
};
export const ATTORNEY_CAP = 9200;
const WAITING_MONTHS = 5;
const FULL_AGE = 67;

export const ssdiAmount = (state) => primaryInsuranceAmount(state.retirement.ssEarnings) * 12;

export function ssdiEligibility(state) {
  const h = state.health;
  if (state.character.age >= FULL_AGE) return { ok: false, reason: 'Past full retirement age — that\'s regular Social Security' };
  if ((state.retirement.ssEarnings ?? []).length < 5) return { ok: false, reason: 'Not enough work credits (5+ years of covered work)' };
  if (h.disability.benefits.some((b) => b.source === 'ssdi')) return { ok: false, reason: 'Already receiving SSDI' };
  if (h.disability.ssdiClaim) return { ok: false, reason: 'Your claim is pending' };
  if (!disablingConditions(state).length) return { ok: false, reason: 'No condition that keeps you from working' };
  if (state.career.job) return { ok: false, reason: 'You\'re working above the substantial-gainful-activity limit' };
  return { ok: true };
}

/** Approval odds at a stage: severity, age (grid rules), education and a lawyer. */
export function approvalOdds(state, stage, lawyer) {
  const worst = Math.max(0, ...disablingConditions(state).map((c) => c.severity));
  const age = state.character.age;
  const educated = state.education.degrees.some((d) => (DEGREE_RANK[d.type] ?? 0) >= (DEGREE_RANK.bachelor ?? 4));
  const grid = age >= 55 ? 0.2 : age >= 50 ? 0.12 : 0;
  // Former SSA/VA claims staff know exactly what a complete file looks like.
  const insider = yearsInProfession(state, ['benefitsClaims']) >= 2 ? 0.08 : 0;
  return clamp(STAGES[stage].odds + (worst - 80) / 150 + grid * (educated ? 0.5 : 1) + (lawyer && stage === 'hearing' ? 0.15 : 0) + insider, 0.03, 0.9);
}

function file(ctx, onsetAge) {
  const { state } = ctx;
  const check = ssdiEligibility(state);
  if (!check.ok) return false;
  state.health.disability.ssdiClaim = { stage: 'initial', onsetAge: onsetAge ?? state.character.age, filedAge: state.character.age, lawyer: false, denials: 0 };
  ctx.log('You applied for Social Security Disability. A decision takes months; most first applications are denied.', '📨');
  return true;
}

function approve(ctx) {
  const { state } = ctx;
  const d = state.health.disability;
  const claim = d.ssdiClaim;
  const annual = ssdiAmount(state);
  // Back pay from 5 months after onset to now.
  const months = Math.max(0, (state.character.age - claim.onsetAge) * 12 - WAITING_MONTHS);
  const backPay = Math.round(annual / 12 * months);
  const fee = claim.lawyer ? Math.min(ATTORNEY_CAP, Math.round(backPay * 0.25)) : 0;
  d.benefits.push({ source: 'ssdi', label: 'Social Security Disability (SSDI)', annual, endAge: FULL_AGE });
  d.ssdiClaim = null;
  if (backPay - fee > 0) ctx.earn(backPay - fee, 'SSDI back pay', { ssCovered: false });
  ctx.stat('happiness', 8);
  ctx.stat('stress', -10);
  ctx.log(`SSDI approved: $${annual.toLocaleString()}/yr${backPay ? `, plus $${(backPay - fee).toLocaleString()} in back pay${fee ? ` after your attorney's $${fee.toLocaleString()}` : ''}` : ''}. Medicare starts after two years of benefits.`, '♿', 'good');
}

function decide(ctx) {
  const { state, rng } = ctx;
  const claim = state.health.disability.ssdiClaim;
  if (!claim || state.prompts.some((p) => p.type === 'ssdi.denied')) return;
  // You recovered, or went back to work: the claim lapses.
  if (!disablingConditions(state).length || state.career.job) {
    state.health.disability.ssdiClaim = null;
    return ctx.log('Your SSDI claim was closed — you\'re no longer considered disabled under SSA rules.', '📨');
  }
  // Hearings take over a year to schedule.
  if (claim.stage === 'hearing' && state.character.age - claim.stageAge < 1) return ctx.log('Your SSDI hearing is still on the docket. Average wait: well over a year.', '⏳');
  if (rng.chance(approvalOdds(state, claim.stage, claim.lawyer))) return approve(ctx);
  claim.denials += 1;
  const next = { initial: 'reconsideration', reconsideration: 'hearing', hearing: 'council', council: null }[claim.stage];
  ctx.stat('stress', 8);
  ctx.prompt({
    type: 'ssdi.denied', icon: '📨', title: 'SSDI Denied',
    text: `Your claim was denied at the ${STAGES[claim.stage].label.toLowerCase()} stage.${next ? ` You have 60 days to appeal to ${STAGES[next].label.toLowerCase()}.` : ' The Appeals Council declined to review it.'}`,
    options: [
      ...(next ? [{ id: 'appeal', label: `📨 Appeal (${STAGES[next].label})`, hint: `≈${Math.round(approvalOdds(state, next, claim.lawyer) * 100)}% approval` }] : []),
      ...(next && !claim.lawyer ? [{ id: 'lawyer', label: '⚖️ Hire a disability attorney and appeal', hint: `25% of back pay, capped at $${ATTORNEY_CAP.toLocaleString()}; better hearing odds` }] : []),
      { id: 'reapply', label: '🔁 Start over with a new application' },
      { id: 'quit', label: '🙅 Give up' },
    ],
    data: { next },
  });
}

export const SSDI = {
  id: 'ssdi',
  order: 43.5,

  setup(engine) {
    engine.bus.on('ssdi:apply', ({ ctx, onsetAge }) => file(ctx, onsetAge));
  },

  onAgeUp(ctx) {
    if (!ctx.state.health?.disability || ctx.state.legal.incarceration) return;
    decide(ctx);
  },

  actions: {
    apply(ctx) {
      const check = ssdiEligibility(ctx.state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      file(ctx);
    },
  },

  resolvers: {
    denied(ctx, data, optionId) {
      const { state } = ctx;
      const claim = state.health.disability.ssdiClaim;
      if (!claim) return;
      if (optionId === 'quit') {
        state.health.disability.ssdiClaim = null;
        return ctx.log('You gave up on SSDI.', '🙅', 'warn');
      }
      if (optionId === 'reapply') {
        state.health.disability.ssdiClaim = { ...claim, stage: 'initial', filedAge: state.character.age };
        return ctx.log('You filed a brand-new SSDI application.', '📨');
      }
      if (!data.next) return;
      if (optionId === 'lawyer') claim.lawyer = true;
      claim.stage = data.next;
      claim.stageAge = state.character.age;
      ctx.log(`You appealed: ${STAGES[data.next].label.toLowerCase()}${claim.lawyer ? ', with a disability attorney' : ''}.`, '📨');
    },
  },
};
