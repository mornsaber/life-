/**
 * Ways into a job above the bottom rung at a new employer:
 *
 *  - Outside chief searches. Cities and counties often hire their police
 *    chief, fire chief or department head from another agency: a big-city
 *    lieutenant runs a village department, a captain a small city's, a
 *    deputy chief a large one's.
 *  - Federal transfers. A federal employee can move to another agency at
 *    the same GS grade (and keep their step) if they qualify for the job.
 *  - Executive searches. Companies recruit VPs and chief executives from
 *    outside; a senior director elsewhere is a VP candidate, a VP a CEO
 *    candidate at a smaller company.
 *  - Lateral hires. Police officers and firefighters can move departments:
 *    they come in at the working rank (rank is earned inside the
 *    department) but are credited pay steps for their years of experience.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, yearsInProfession, prestige } from '../../core/State.js';
import { REGIONS } from '../life/Regions.js';
import { getProfession, PROFESSIONS } from './JobTrees.js';
import { ladderFor, levelById, entryLevels, SIZE_ORDER } from './Ladder.js';
import { createEmployer } from './Employers.js';
import { hire, levelCheck, backgroundCheck } from './CareerEngine.js';
import { checkRequirements } from '../credentials/LicensingEngine.js';
import { recalcSalary } from './Compensation.js';
import { candidateScore } from '../org/Vacancies.js';

/** Government careers whose ranks are earned inside the department (not federal: GS grades transfer). */
export const RANK_SECTORS = ['municipal', 'state', 'public'];
/** Highest step a lateral can be credited. */
export const LATERAL_MAX_STEP = 7;
/** The grade you need to be a credible chief candidate at an agency of each size. */
export const CHIEF_GRADE = { micro: 6, small: 7, medium: 7, large: 8, enterprise: 8, mega: 9 };

const sizeIdx = (s) => Math.max(0, SIZE_ORDER.indexOf(s));
/** Qualifications for a job at another employer: tenure there doesn't exist yet. */
const qualifies = (state, level) => {
  const { tenure, ...req } = level.req ?? {};
  return levelCheck(state, { ...level, req }).ok;
};
const supervisor = (level) => Boolean(level?.abilities?.includes('supervise'));

/** What a job would pay, priced where it is (an offer in another city carries that city's locality). */
export function previewPay(state, { professionId, levelId, employer, step = 1, merit = 0, regionId = state.character.regionId }) {
  const profession = getProfession(professionId);
  const level = levelById(profession, levelId);
  const job = { professionId, sector: profession.sector, employer, step, merit, posting: null, grade: level.grade, levelId, abilities: [...level.abilities] };
  const home = state.character.regionId;
  state.character.regionId = regionId;
  try { return recalcSalary(state, job); } finally { state.character.regionId = home; }
}

/* ------------------------------------------------------------------ */
/* Lateral hires                                                       */
/* ------------------------------------------------------------------ */

/** Pay step credited to an experienced officer or firefighter joining a new department. */
export function lateralStep(state, profession) {
  if (!RANK_SECTORS.includes(profession.sector)) return null;
  const years = yearsInProfession(state, [profession.id]);
  if (years < 1) return null;
  return 1 + Math.min(LATERAL_MAX_STEP - 1, years);
}

/** The working rank a lateral comes in at: the best entry rung, never a supervisory one. */
export function lateralEntryLevel(state, profession, size) {
  const entries = entryLevels(profession, size).filter((l) => !supervisor(l) && qualifies(state, l));
  return entries.sort((a, b) => b.grade - a.grade)[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Outside chief searches                                              */
/* ------------------------------------------------------------------ */

/** Can you compete for the top job at another agency? */
export function chiefSearchEligibility(state) {
  const job = state.career.job;
  if (!job) return { ok: false, reason: 'You need a job in public service first' };
  const profession = getProfession(job.professionId);
  if (!RANK_SECTORS.includes(profession.sector)) return { ok: false, reason: 'For city, county and state agencies' };
  const level = levelById(profession, job.levelId);
  if (!supervisor(level)) return { ok: false, reason: 'Search committees want command experience' };
  if (level.grade < CHIEF_GRADE.micro) return { ok: false, reason: `Reach G${CHIEF_GRADE.micro} command rank first` };
  if (yearsInProfession(state, [profession.id]) < 10) return { ok: false, reason: '10 years in the field first' };
  const top = profession.levels.at(-1);
  if (top.appointed) return { ok: false, reason: `${top.title} is a political appointment` };
  if (job.probationLeft > 0) return { ok: false, reason: 'Finish probation first' };
  return { ok: true, profession, level };
}

/** Odds a search committee picks you. Bigger agencies' commanders are favored at smaller ones. */
export function chiefOdds(state, job, opening) {
  const margin = job.grade - CHIEF_GRADE[opening.employer.size];
  const pedigree = (sizeIdx(job.employer.size) - sizeIdx(opening.employer.size)) * 0.05;
  const record = (candidateScore(state, job) - 55) / 200;
  return clamp(0.3 + margin * 0.12 + pedigree + record + prestige(state) / 2000, 0.05, 0.85);
}

/** Openings for the top job at agencies elsewhere that would consider you. */
export function chiefOpenings(ctx, profession, job) {
  const { state, rng } = ctx;
  const regions = rng.shuffle(Object.keys(REGIONS).filter((r) => r !== state.character.regionId));
  const openings = [];
  for (const regionId of regions) {
    if (openings.length >= 3) break;
    if (!rng.chance(0.5)) continue;
    const employer = createEmployer(rng, state, profession, regionId);
    if (job.grade < CHIEF_GRADE[employer.size]) continue;
    const top = ladderFor(profession, employer.size).at(-1);
    if (!top || top.appointed || !qualifies(state, top)) continue;
    const salary = previewPay(state, { professionId: profession.id, levelId: top.id, employer, step: 1, regionId });
    openings.push({ regionId, employer, levelId: top.id, title: top.title, salary });
  }
  return openings;
}

/* ------------------------------------------------------------------ */
/* Federal transfers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Can a current federal employee move into this agency? Status candidates skip the open-competition
 * exam, and a law-enforcement officer already under LEO retirement isn't held to the entry age cap.
 */
export function transferEligibility(state, profession, from) {
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  const entry = checkRequirements(state, profession.entry);
  if (!entry.ok) return { ok: false, reason: `Needs ${entry.missing.join(', ')}` };
  const bg = backgroundCheck(state, profession);
  if (!bg.ok) return bg;
  const leo = (p) => Boolean(p?.mandatoryRetirement);
  if (profession.eligible && !(leo(profession) && leo(from))) {
    const extra = profession.eligible(state);
    if (!extra.ok) return extra;
  }
  return { ok: true };
}

/** Jobs at other federal agencies at your grade (or the closest one below it) that you qualify for. */
export function federalTransfers(state) {
  const job = state.career.job;
  if (!job || job.sector !== 'federal') return [];
  const mine = levelById(getProfession(job.professionId), job.levelId);
  const out = [];
  for (const profession of Object.values(PROFESSIONS)) {
    if (profession.sector !== 'federal' || profession.id === job.professionId) continue;
    if (!transferEligibility(state, profession, getProfession(job.professionId)).ok) continue;
    const ladder = ladderFor(profession, 'large');
    const fits = ladder.filter((l) => !l.appointed && !l.abilities.includes('exec') && l.grade <= job.grade && qualifies(state, l) && !levelCheck(state, l).clearanceNeeded);
    if (!fits.length) continue;
    const best = Math.max(...fits.map((l) => l.grade));
    // Keep a supervisor on the management track where the agency has one at that grade.
    const atBest = fits.filter((l) => l.grade === best);
    const level = atBest.find((l) => supervisor(l) === supervisor(mine)) ?? atBest[0];
    out.push({ professionId: profession.id, name: profession.name, levelId: level.id, title: level.title, grade: level.grade, same: level.grade === job.grade });
  }
  return out.sort((a, b) => b.grade - a.grade || a.name.localeCompare(b.name));
}

/* ------------------------------------------------------------------ */
/* Executive searches                                                  */
/* ------------------------------------------------------------------ */

/** Can a search firm place you in an executive role? */
export function execRecruiterEligibility(state) {
  const job = state.career.job;
  if (!job || job.sector !== 'private') return { ok: false, reason: 'For private-sector managers' };
  if (job.track !== 'mgmt' || job.grade < 7) return { ok: false, reason: 'Reach director level first' };
  if (job.abilities.includes('exec') && job.grade >= 10) return { ok: false, reason: 'You already run the company' };
  return { ok: true };
}

/** An executive offer at another company: one or two grades up, usually at a company no bigger than yours. */
export function execOffer(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const profession = getProfession(job.professionId);
  for (let tries = 0; tries < 4; tries++) {
    const employer = createEmployer(rng, state, profession, state.character.regionId);
    // A CEO seat goes to a VP from a company at least as big.
    const levels = ladderFor(profession, employer.size).filter((l) => l.abilities.includes('exec') && !l.appointed && l.grade > job.grade && l.grade <= job.grade + 2 && qualifies(state, l)
      && (l.grade < 10 || sizeIdx(employer.size) <= sizeIdx(job.employer.size)));
    if (!levels.length) continue;
    const level = levels.sort((a, b) => a.grade - b.grade)[0];
    const base = previewPay(state, { professionId: profession.id, levelId: level.id, employer });
    const salary = Math.max(base, Math.round(job.salary * rng.float(1.15, 1.35)));
    const signing = Math.round(salary * rng.float(0.1, 0.3) / 1000) * 1000;
    return { professionId: profession.id, levelId: level.id, title: level.title, employer, salary, workMode: 'onsite', nonCompete: rng.chance(0.6) ? 2 : 0, signing, exec: true };
  }
  return null;
}

export function execOdds(state, job) {
  return clamp(0.25 + (job.performance - 60) / 120 + (job.grade - 7) * 0.08 + prestige(state) / 2000, 0.05, 0.8);
}

/* ------------------------------------------------------------------ */
/* Actions and resolvers (career.*)                                    */
/* ------------------------------------------------------------------ */

export const SeniorMoveActions = {
  /** Put your name in for police chief, fire chief or department head somewhere else. */
  chiefSearch(ctx) {
    const { state } = ctx;
    const check = chiefSearchEligibility(state);
    if (!check.ok) return ctx.toast(check.reason, 'warn');
    if (yearlyCount(state, 'career.chiefSearch')) return ctx.toast('You already applied for chief jobs this year.', 'warn');
    bumpYearly(state, 'career.chiefSearch');
    const job = state.career.job;
    const openings = chiefOpenings(ctx, check.profession, job);
    if (!openings.length) return ctx.log(`No ${check.profession.levels.at(-1).title} searches you'd be competitive for opened this year.`, '📭', 'warn');
    ctx.prompt({
      type: 'career.chiefSearch', icon: '🏛️', title: 'Chief Searches',
      text: `Agencies hiring from outside. A search committee interviews finalists and the ${job.sector === 'state' ? 'governor' : 'mayor or city manager'} makes the call. Taking the job means moving there.`,
      options: [
        ...openings.map((o, i) => ({ id: String(i), label: `${o.title}, ${o.employer.name} (${REGIONS[o.regionId].name})`, hint: `${o.employer.size} agency · ~$${o.salary.toLocaleString()}/yr · ${Math.round(chiefOdds(state, job, o) * 100)}% chance` })),
        { id: 'none', label: '🏠 Stay where you are' },
      ],
      data: { openings },
    });
  },

  /** Move to another federal agency at your grade. arg: professionId */
  fedTransfer(ctx, professionId) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (!job || job.sector !== 'federal') return ctx.toast('For federal employees', 'warn');
    if (job.probationLeft > 0) return ctx.toast('Finish probation first', 'warn');
    const options = federalTransfers(state);
    if (!professionId) {
      if (!options.length) return ctx.toast('No other agency has a job at your grade you qualify for.', 'warn');
      return ctx.prompt({
        type: 'career.fedTransfer', icon: '🦅', title: 'Transfer to Another Agency',
        text: `Federal employees can move between agencies at their grade and keep their step (step ${job.step}). You're G${job.grade}.`,
        options: [...options.slice(0, 12).map((o) => ({ id: o.professionId, label: `${o.name}: ${o.title}`, hint: o.same ? `Same grade (G${o.grade})` : `G${o.grade}: a downgrade` })), { id: 'none', label: '↩️ Never mind' }],
        data: {},
      });
    }
    const pick = options.find((o) => o.professionId === professionId);
    if (!pick) return ctx.toast('That transfer isn\'t open to you.', 'warn');
    if (yearlyCount(state, 'career.fedTransfer')) return ctx.toast('You already applied for a transfer this year.', 'warn');
    bumpYearly(state, 'career.fedTransfer');
    const odds = clamp(0.45 + (job.performance - 55) / 120, 0.15, 0.85);
    if (!rng.chance(odds)) return ctx.log(`${getProfession(professionId).name} selected another candidate for the ${pick.title} opening.`, '📭', 'warn');
    const profession = getProfession(professionId);
    const employer = createEmployer(rng, state, profession, state.character.regionId);
    const step = job.step;
    const from = job.employer.name;
    const hired = hire(ctx, { professionId, levelId: pick.levelId, employer, step, merit: 0 });
    if (hired) {
      hired.probationLeft = 0;
      ctx.log(`Transferred from ${from} at G${pick.grade}, step ${step}. Your federal service, leave and retirement carry over.`, '🦅', 'good');
    }
  },

  /** Retain an executive search firm. */
  execRecruiter(ctx) {
    const { state, rng } = ctx;
    const check = execRecruiterEligibility(state);
    if (!check.ok) return ctx.toast(check.reason, 'warn');
    if (yearlyCount(state, 'career.execRecruiter')) return ctx.toast('You already met the search firms this year.', 'warn');
    bumpYearly(state, 'career.execRecruiter');
    const job = state.career.job;
    if (!rng.chance(execOdds(state, job))) return ctx.log('The search firms took your call, but no board shortlisted you this year.', '📭', 'warn');
    const offer = execOffer(ctx);
    if (!offer) return ctx.log('No executive searches in your field fit you this year.', '📭', 'warn');
    execPrompt(ctx, offer);
  },
};

function execPrompt(ctx, offer) {
  ctx.prompt({
    type: 'jobMarket.headhunter', icon: '🎩', title: 'Executive Recruiter',
    text: `A search firm has you as the board's pick: ${offer.title} at ${offer.employer.name} (${offer.employer.size}), $${offer.salary.toLocaleString()}/yr${offer.signing ? ` plus a $${offer.signing.toLocaleString()} signing bonus` : ''}${offer.nonCompete ? `, ${offer.nonCompete}-year non-compete` : ''}.`,
    options: [
      { id: 'accept', label: '✅ Take it' },
      { id: 'counter', label: '🃏 Take it to your boss for a counteroffer' },
      { id: 'decline', label: '🙅 Not interested' },
    ],
    data: { offer },
  });
}

/** A recruiter calls strong senior managers on their own. Called yearly by the job market. */
export function execRecruiterTick(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!execRecruiterEligibility(state).ok || job.performance < 65 || state.prompts.some((p) => p.type === 'jobMarket.headhunter')) return;
  if (!rng.chance(clamp(0.03 + (job.performance - 65) / 300, 0, 0.12))) return;
  const offer = execOffer(ctx);
  if (offer) execPrompt(ctx, offer);
}

export const SeniorMoveResolvers = {
  chiefSearch(ctx, data, optionId) {
    const { state, rng } = ctx;
    const opening = data.openings?.[Number(optionId)];
    if (!opening) return ctx.log('You withdrew from the chief searches.', '🏠');
    const job = state.career.job;
    if (!job) return;
    if (!rng.chance(chiefOdds(state, job, opening))) {
      ctx.log(`You were a finalist for ${opening.title} of ${opening.employer.name}, but they went with another candidate.`, '📭', 'warn');
      return ctx.stat('happiness', -3);
    }
    const from = `${job.title} at ${job.employer.name}`;
    ctx.emit('region:relocate', { regionId: opening.regionId, reason: `You moved to become ${opening.title} of ${opening.employer.name}.` });
    const hired = hire(ctx, { professionId: job.professionId, levelId: opening.levelId, employer: opening.employer, step: 1 });
    if (!hired) return;
    hired.probationLeft = 0;
    ctx.log(`Hired from outside as ${hired.title} of ${opening.employer.name}, after serving as ${from}.`, '🏛️', 'milestone');
  },
  fedTransfer(ctx, _data, optionId) {
    if (optionId !== 'none') SeniorMoveActions.fedTransfer(ctx, optionId);
  },
};
