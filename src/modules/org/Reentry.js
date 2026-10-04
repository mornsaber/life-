/**
 * Leaving and re-entering the workforce, going back to a former employer,
 * and moving between occupations inside the same organization.
 *
 *  - Time away: every year out of work past the first makes hiring managers
 *    warier (less so after military service or school).
 *  - Former employers remember how you left: 'good' standing helps you back
 *    in, 'neutral' is a coin flip, 'ineligible' (fired for cause) is a no.
 *    Coming back soon can bridge your seniority; after a long absence you
 *    may come back a rung lower.
 *  - Internal moves: an organization with several occupations (a city has
 *    police, fire, dispatch, public works…) lets you change careers without
 *    leaving — keeping your seniority and pension service.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { getProfession } from '../career/JobTrees.js';
import { levelById, previousLevel, ladderFor } from '../career/Ladder.js';
import { createEmployer } from '../career/Employers.js';
import { applicationEligibility, bestEntryLevel, levelCheck, hire } from '../career/CareerEngine.js';
import { traineeProgram } from '../career/Tenure.js';
import { orgOf, orgType, standingWith, departmentFor, divisionName, supervises } from './Organizations.js';
import { BUSINESS_TYPES } from '../business/BusinessTypes.js';

/** Years since you last worked (0 while employed or before your first job). */
export function workforceGap(state) {
  if (state.career.job || !state.career.history.length) return 0;
  // Running your own business is work; owning one passively isn't.
  if (state.business?.current?.role === 'operator') return 0;
  const ranOwn = (state.business?.history ?? []).filter((h) => h.role === 'operator').map((h) => h.endAge);
  const lastEnd = Math.max(...state.career.history.map((h) => h.endAge), ...ranOwn);
  return Math.max(0, state.character.age - lastEnd);
}

/** Hiring penalty for time out of the workforce. */
export function reentryPenalty(state) {
  const gap = workforceGap(state);
  if (gap <= 1) return 0;
  const lastEnd = state.character.age - gap;
  const servedSince = (state.military.history ?? []).some((h) => (h.endAge ?? 0) > lastEnd) || state.military.service;
  const studied = (state.education.degrees ?? []).some((d) => (d.year ?? 0) > lastEnd);
  return Math.min(0.2, 0.03 * (gap - 1)) * (servedSince || studied ? 0.4 : 1);
}

/** Years you ran (not just owned) businesses in this career's field. */
export function ownerYearsIn(state, professionId) {
  const runs = [...(state.business?.history ?? []), ...(state.business?.current ? [{ ...state.business.current, role: state.business.current.role }] : [])];
  return runs.filter((h) => h.role === 'operator' && BUSINESS_TYPES[h.typeId]?.professions.includes(professionId)).reduce((s, h) => s + (h.years ?? 0), 0);
}

/** Hiring managers value having run a business in the field. */
export const ownerExperienceBonus = (state, profession) => Math.min(0.08, ownerYearsIn(state, profession.id) * 0.015);

/**
 * Former owners can come back in above the entry level: five years running
 * a business in the field qualifies you for the first management level you
 * meet the requirements for.
 */
export function ownerEntryLevel(state, profession, size) {
  if (ownerYearsIn(state, profession.id) < 5) return null;
  const ladder = ladderFor(profession, size);
  const mgmt = ladder.find((l) => supervises(l) && !l.appointed && !l.abilities.includes('exec') && levelCheck(state, l).ok);
  return mgmt ?? null;
}

/** Rehire adjustment at an organization: { blocked, bonus }. */
export function rehireStanding(state, orgId) {
  const s = standingWith(state, orgId);
  if (!s) return { blocked: false, bonus: 0, standing: null };
  if (s.standing === 'ineligible') return { blocked: true, bonus: 0, standing: s.standing };
  return { blocked: false, bonus: s.standing === 'good' ? 0.12 : 0, standing: s.standing };
}

/** Former employers you could ask to take you back (most recent first, one per organization). */
export function formerEmployers(state) {
  const seen = new Set();
  const list = [];
  for (const h of [...state.career.history].reverse()) {
    if (!h.orgId || seen.has(h.orgId)) continue;
    seen.add(h.orgId);
    if (state.career.job?.employer?.orgId === h.orgId) continue;
    // Closed (or merged-away) employers can't take you back.
    if (!orgOf(state, h.orgId) || orgOf(state, h.orgId).closed || !getProfession(h.professionId)) continue;
    const years = state.character.age - h.endAge;
    list.push({ ...h, yearsAgo: years, h });
  }
  return list.slice(0, 5);
}

export function rehireCheck(state, entry) {
  if (entry.standing === 'ineligible') return { ok: false, reason: 'Not eligible for rehire' };
  if (entry.yearsAgo > 15) return { ok: false, reason: 'Too long ago — apply as a new hire' };
  if (state.career.job?.professionId === entry.professionId && state.career.job?.employer?.orgId === entry.orgId) return { ok: false, reason: 'You work there' };
  const elig = applicationEligibility({ ...state, career: { ...state.career, job: null } }, entry.professionId);
  if (!elig.ok) return elig;
  return { ok: true };
}

/** The level a returning employee comes back at. */
function returnLevel(state, profession, size, entry) {
  let level = levelById(profession, entry.levelId);
  const ladder = ladderFor(profession, size);
  if (!level || !ladder.includes(level)) level = ladder[0];
  // Long absences or lapsed qualifications: one rung lower.
  for (let i = 0; i < 3 && level && (!levelCheck(state, level).ok || (entry.yearsAgo > 5 && i === 0)); i++) level = previousLevel(profession, size, level.id) ?? level;
  return levelCheck(state, level).ok ? level : bestEntryLevel(state, profession, size);
}

/** An employer profile at a specific organization (reusing the department of that occupation). */
export function employerAt(ctx, orgId, profession, name) {
  const { state, rng } = ctx;
  const org = orgOf(state, orgId);
  const employer = createEmployer(rng, state, profession, org?.regionId ?? state.character.regionId);
  if (!org) return employer;
  const dept = departmentFor(org, profession.id);
  Object.assign(employer, { orgId: org.id, deptId: dept?.id ?? null, orgName: org.name, deptName: dept?.name ?? null, division: dept ? divisionName(org, dept.id, profession.id) : null });
  if (name) employer.name = name;
  if (org.size && ['large', 'enterprise'].includes(org.size) && employer.size === 'small') employer.size = org.size;
  return employer;
}

/** Other occupations in your organization you could move into. */
export function internalMoves(state) {
  const job = state.career.job;
  const org = orgOf(state, job?.employer);
  if (!org) return [];
  const t = orgType(org.typeId);
  const ids = [...new Set(t?.departments.flatMap((d) => d.occupations) ?? [])].filter((id) => id !== job.professionId && getProfession(id));
  return ids.map((id) => {
    const p = getProfession(id);
    const check = applicationEligibility({ ...state, career: { ...state.career, job: null } }, id);
    return { profession: p, check, dept: departmentFor(org, id) };
  });
}

export const ReentryActions = {
  /** Ask a former employer to take you back. arg: orgId */
  rehire(ctx, orgId) {
    const { state, rng } = ctx;
    const entry = formerEmployers(state).find((e) => e.orgId === orgId);
    if (!entry) return;
    const check = rehireCheck(state, entry);
    if (!check.ok) return ctx.toast(check.reason, 'warn');
    if (yearlyCount(state, 'orgs.rehire')) return ctx.toast('One return request per year.', 'warn');
    bumpYearly(state, 'orgs.rehire');
    const profession = getProfession(entry.professionId);
    const employer = employerAt(ctx, orgId, profession, entry.employerName);
    const level = returnLevel(state, profession, employer.size, entry);
    if (!level) return ctx.toast('You no longer meet their requirements.', 'warn');
    const chance = clamp((entry.standing === 'good' ? 0.8 : 0.45) - reentryPenalty(state) - (state.economy.unemployment - 0.045) * 2, 0.05, 0.95);
    if (!rng.chance(chance)) {
      ctx.log(`${entry.employerName} had no place for you right now.`, '📭', 'warn');
      return ctx.toast('No opening for you there', 'warn');
    }
    // Back within a couple of years: your old service counts.
    const bridged = entry.yearsAgo <= 2 ? Math.max(0, entry.endAge - entry.startAge) : 0;
    ctx.prompt({
      type: 'orgs.rehireOffer',
      icon: '🔁',
      title: 'Welcome Back?',
      text: `${entry.employerName} (${entry.orgName ?? 'your old employer'}) will take you back as ${level.title} [G${level.grade}]${level.id !== entry.levelId ? ` — a step down from the ${entry.title} post you left` : ''}.${bridged ? ` Because you're back within two years, your ${bridged} years of service carry over.` : ''}${state.career.job ? `\nAccepting means resigning as ${state.career.job.title}.` : ''}`,
      options: [
        { id: 'accept', label: '✅ Go back' },
        { id: 'decline', label: '❌ Not now' },
      ],
      data: { professionId: profession.id, levelId: level.id, employer, bridged },
    });
    return undefined;
  },

  /** Move to another occupation inside your organization. arg: professionId */
  internalMove(ctx, professionId) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const move = internalMoves(state).find((m) => m.profession.id === professionId);
    if (!job || !move) return;
    if (!move.check.ok) return ctx.toast(move.check.reason, 'warn');
    if (yearlyCount(state, 'orgs.internalMove')) return ctx.toast('One internal move per year.', 'warn');
    bumpYearly(state, 'orgs.internalMove');
    const chance = clamp(0.35 + (job.performance - 50) / 120 + (job.boss - 50) / 200, 0.1, 0.9);
    if (!rng.chance(chance)) {
      ctx.log(`${move.dept?.name ?? 'The other department'} passed on your internal transfer request this year.`, '🔀', 'warn');
      return ctx.toast('Internal move declined', 'warn');
    }
    const p = move.profession;
    const employer = employerAt(ctx, job.employer.orgId, p);
    const level = bestEntryLevel(state, p, employer.size) ?? move.check.level;
    const seniority = job.yearsAtEmployer;
    const from = job.title;
    hire(ctx, { professionId: p.id, levelId: level.id, employer });
    const now = state.career.job;
    if (now) {
      now.yearsAtEmployer = seniority;
      // Same employer: no new probation (training programs still run their course).
      if (!traineeProgram(now)) now.probationLeft = 0;
      ctx.log(`You moved from ${from} to ${now.title} inside ${employer.orgName ?? employer.name}, keeping ${seniority} years of seniority.`, '🔀', 'milestone');
    }
    return undefined;
  },
};

export const ReentryResolvers = {
  rehireOffer(ctx, data, optionId) {
    if (optionId !== 'accept') return ctx.log('You decided not to go back.', '🚪');
    hire(ctx, { professionId: data.professionId, levelId: data.levelId, employer: data.employer });
    const job = ctx.state.career.job;
    if (!job) return undefined;
    job.rehired = true;
    if (data.bridged) {
      job.yearsAtEmployer = data.bridged;
      job.probationLeft = 0;
    }
    ctx.log(`You're back at ${data.employer.name}.`, '🔁', 'good');
    return undefined;
  },
};
