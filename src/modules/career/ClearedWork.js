/**
 * Cleared work: why people guard their security clearances.
 *
 *   Pay         Private-sector jobs on classified programs pay a premium
 *               over the same job uncleared (≈10% for Secret, ≈22% for
 *               TS/SCI, more with a full-scope polygraph).
 *   Hiring      Agencies and contractors would rather hire someone already
 *               cleared than wait a year for an investigation: holders get a
 *               hiring edge for any job that needs one, and defense
 *               contractor recruiters call them.
 *   Sponsorship Big employers in defense-adjacent fields can sponsor your
 *               clearance for a classified program.
 *   Keeping it  A cleared role keeps it active (and reinvestigated); out of
 *               one, it stays "current" for two years and then lapses.
 *
 * job.cleared = clearance level of a cleared private-sector role.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { getProfession } from './JobTrees.js';
import { levelById, ladderFor } from './Ladder.js';
import { CLEARANCES, hasClearance, adjudicate } from '../publicservice/PublicServiceEngine.js';
import { MOS } from '../military/MOS.js';

/** Private-sector fields with classified work (defense, intelligence and space contractors). */
export const CLEARED_FIELDS = ['tech', 'cybersecurity', 'dataScience', 'engineering', 'research', 'corporate', 'logistics', 'privateMilitary', 'privateSecurity', 'accounting', 'finance', 'aviation', 'manufacturing'];
export const CLEARANCE_PREMIUM = { publicTrust: 0.03, secret: 0.1, topSecret: 0.22 };
export const POLY_PREMIUM = 0.06;
const SPONSOR_GAP = 3;

export const CONTRACTORS = ['Northgate Defense Systems', 'Aegis Mission Solutions', 'Sentinel Federal Technologies', 'Orion Space & Intelligence', 'Ironbridge Analytics', 'Keystone National Security'];

const clearance = (state) => state.publicService.clearance;
export const clearanceLevel = (state) => clearance(state)?.level ?? null;

/** Salary multiplier for a cleared private-sector role. */
export function clearedPremium(job) {
  if (!job?.cleared || job.sector !== 'private') return 0;
  return (CLEARANCE_PREMIUM[job.cleared] ?? 0) + (job.cleared === 'topSecret' && job.poly ? POLY_PREMIUM : 0);
}

/** Hiring edge: an existing clearance saves an employer months of investigation. */
export function clearanceHiringBonus(state, profession) {
  const c = clearance(state);
  if (!c) return 0;
  const needed = profession.levels.map((l) => l.req?.clearance).filter(Boolean);
  const rank = CLEARANCES[c.level].rank;
  if (needed.length) return needed.some((lvl) => CLEARANCES[lvl].rank <= rank) ? 0.12 + 0.03 * rank : 0.04;
  if (CLEARED_FIELDS.includes(profession.id) && profession.sector === 'private') return 0.03 * rank;
  return 0;
}

/** The field a cleared candidate would be recruited into (current job, past work, or military specialty). */
function recruitField(state) {
  const job = state.career.job;
  if (job) return CLEARED_FIELDS.includes(job.professionId) && job.sector === 'private' ? job.professionId : null;
  const past = [...state.career.history].reverse().find((h) => CLEARED_FIELDS.includes(h.professionId));
  if (past) return past.professionId;
  const mil = [...state.military.history].reverse()[0];
  const m = mil?.mos && MOS[mil.mos];
  const bySpecialty = { cyber: 'cybersecurity', intel: 'dataScience', logistics: 'logistics', infantry: 'privateSecurity', engineer: 'engineering', aviation: 'aviation' };
  const field = (m?.civilian && CLEARED_FIELDS.includes(m.civilian) ? m.civilian : null) ?? bySpecialty[mil?.specialty];
  return field && getProfession(field) ? field : null;
}

/** The level a recruiter would offer: your current level if it exists at a big contractor, else the best you qualify for. */
function offerLevel(state, profession, levelCheck, bestEntryLevel) {
  const job = state.career.job;
  const ladder = ladderFor(profession, 'enterprise');
  if (job?.professionId === profession.id) {
    const l = levelById(profession, job.levelId);
    if (l && ladder.includes(l)) return l;
  }
  // Your most recent level in the field, if you still qualify for it.
  const past = [...state.career.history].reverse().find((h) => h.professionId === profession.id);
  const prev = past && levelById(profession, past.levelId);
  if (prev && ladder.includes(prev) && levelCheck(state, prev).ok) return prev;
  const level = bestEntryLevel(state, profession, 'enterprise');
  return level && levelCheck(state, level).ok ? level : null;
}

/**
 * Yearly: defense contractor recruiters call clearance holders who aren't
 * already in a cleared role (more often for TS/SCI).
 */
export function recruiterTick(ctx, { levelCheck, bestEntryLevel }) {
  const { state, rng } = ctx;
  const c = clearance(state);
  if (!c || state.career.job?.cleared || state.military.service?.component === 'active' || state.legal.incarceration || state.character.age >= 65) return;
  if (state.prompts.some((p) => p.type === 'cleared.offer')) return;
  const field = recruitField(state);
  if (!field || !rng.chance(0.15 + 0.12 * CLEARANCES[c.level].rank)) return;
  const profession = getProfession(field);
  const level = offerLevel(state, profession, levelCheck, bestEntryLevel);
  if (!level) return;
  const premium = CLEARANCE_PREMIUM[c.level];
  ctx.prompt({
    type: 'cleared.offer',
    icon: CLEARANCES[c.level].icon,
    title: 'A Cleared Recruiter Calls',
    text: `${rng.pick(CONTRACTORS)} is hiring: ${level.title}, for someone with an active ${CLEARANCES[c.level].name} clearance for a classified program, and holders are scarce. They're offering about ${Math.round(premium * 100)}% over market pay, and your clearance stays active.${state.career.job ? `\nYou'd leave your job as ${state.career.job.title}.` : ''}`,
    options: [
      { id: 'accept', label: '🔐 Take the cleared job', hint: `+${Math.round(premium * 100)}% pay` },
      { id: 'decline', label: '🙅 Not now' },
    ],
    data: { field, levelId: level.id, level: c.level },
  });
}

export function sponsorEligibility(state) {
  const job = state.career.job;
  if (!job) return { ok: false, reason: 'Needs a job' };
  if (job.cleared) return { ok: false, reason: 'Already in a cleared role' };
  if (job.sector !== 'private' || !CLEARED_FIELDS.includes(job.professionId)) return { ok: false, reason: 'Your field has no classified work' };
  if (!['large', 'enterprise'].includes(job.employer.size)) return { ok: false, reason: 'Only large employers run classified programs' };
  if (job.lastSponsorAge != null && state.character.age - job.lastSponsorAge < SPONSOR_GAP) return { ok: false, reason: `Once every ${SPONSOR_GAP} years` };
  if (yearlyCount(state, 'cleared.sponsor')) return { ok: false, reason: 'Once a year' };
  return { ok: true };
}

/** Ask your employer to put you on a classified program (they sponsor the investigation). */
export function requestSponsorship(ctx) {
  const { state, rng } = ctx;
  const check = sponsorEligibility(state);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'cleared.sponsor');
  const job = state.career.job;
  job.lastSponsorAge = state.character.age;
  if (!rng.chance(clamp(0.35 + (job.performance - 60) / 100, 0.1, 0.8))) return ctx.log('Your manager put your name in, but the program filled its cleared slots with other people.', '🔐', 'warn');
  const level = rng.chance(0.4) ? 'topSecret' : 'secret';
  if (hasClearance(state, level)) {
    makeCleared(ctx, job, clearanceLevel(state));
    return;
  }
  const r = adjudicate(state, level, true, rng);
  if (!r.granted) return ctx.log(`Your ${CLEARANCES[level].name} investigation was denied (${r.reason.toLowerCase()}).`, '🚫', 'bad');
  ctx.emit('clearance:grant', { level, concealed: false });
  makeCleared(ctx, job, level);
}

export function makeCleared(ctx, job, level) {
  job.cleared = level;
  job.clearance = job.clearance && CLEARANCES[job.clearance].rank >= CLEARANCES[level].rank ? job.clearance : level;
  if (level === 'topSecret' && ctx.rng.chance(0.4)) job.poly = true;
  ctx.log(`You moved onto a classified program as a cleared ${job.title}${job.poly ? ' (with a full-scope polygraph)' : ''}.`, CLEARANCES[level].icon, 'good');
}

/** Lost the clearance: a cleared role can't continue. */
export function loseClearedRole(ctx) {
  const job = ctx.state.career.job;
  if (!job?.cleared) return false;
  job.cleared = null;
  job.poly = false;
  job.clearance = null;
  ctx.log('Without your clearance you were moved off the classified program, and your pay dropped to market rate.', '🔓', 'bad');
  return true;
}
