/**
 * Terms of employment that sit on top of the career ladder:
 *
 *   Probation  New public-sector hires serve a probationary year (K-12
 *              teachers three) and can be let go for any poor review;
 *              afterwards civil-service rules protect them. Teachers who
 *              finish probation earn tenure.
 *   Trainees   Recruits, cadets, apprentices, residents and interns move up
 *              automatically once they hold what the next level needs —
 *              academies enroll their recruits for free — and are let go if
 *              they haven't finished by the deadline.
 *   USERRA     Going on active duty puts your civilian job on protected
 *              military leave for up to five years; you come back with the
 *              seniority, steps and pension credit you would have earned.
 *
 * Pure helpers only; CareerEngine and the career module apply them.
 */
import { CREDENTIALS } from '../credentials/CredentialRegistry.js';
import { hasCredential, pursueCredential, pursueEligibility } from '../credentials/LicensingEngine.js';

export const SECTOR_PROBATION = { federal: 1, state: 1, municipal: 1, private: 0 };
const PROFESSION_PROBATION = { education: 3 };
/** Professions whose probation ends in tenure (continuing contract). */
export const TENURE_PROFESSIONS = ['education'];
export const USERRA_YEARS = 5;
/** Performance below this during probation ends the job. */
export const PROBATION_BAR = 45;

export const probationYears = (profession) => PROFESSION_PROBATION[profession.id] ?? SECTOR_PROBATION[profession.sector] ?? 0;
export const isTenured = (job) => job.abilities.includes('tenure') || Boolean(job.tenured);

/**
 * Training positions: `next` is where they lead, `grace` the extra years you
 * get to finish after the scheduled program length, `academy` = the employer
 * enrolls you in the required courses at no cost.
 */
export const TRAINEE_LEVELS = {
  'police.recruit': { next: 'officer', grace: 1, academy: true, label: 'the police academy' },
  'fire.recruit': { next: 'firefighter', grace: 1, academy: true, label: 'the fire academy' },
  'statePolice.cadet': { next: 'trooper', grace: 1, academy: true, label: 'the trooper academy' },
  'gameWarden.cadet': { next: 'warden', grace: 1, academy: true, label: 'the warden academy' },
  'trucking.trainee': { next: 'driver', grace: 1, academy: true, label: 'CDL school' },
  'trades.apprentice': { next: 'journeyman', grace: 2, label: 'your electrical apprenticeship' },
  'plumbing.apprentice': { next: 'journeyman', grace: 2, label: 'your plumbing apprenticeship' },
  'medical.resident': { next: 'chiefResident', grace: 1, label: 'residency (medical license)' },
  'pharmacy.intern': { next: 'pharmacist', grace: 1, label: 'your internship (pharmacist license)' },
  'regulatory.trainee': { next: 'examiner', grace: 0, label: 'examiner training' },
};
export const traineeProgram = (job) => (job ? TRAINEE_LEVELS[`${job.professionId}.${job.levelId}`] ?? null : null);

/** Credentials in the order they must be earned (prerequisites first). */
export function credentialPlan(state, ids, seen = new Set()) {
  const plan = [];
  for (const id of ids) {
    if (seen.has(id) || hasCredential(state, id) || !CREDENTIALS[id]) continue;
    seen.add(id);
    plan.push(...credentialPlan(state, CREDENTIALS[id].requires?.credentials ?? [], seen), id);
  }
  return plan;
}

/**
 * The academy: enroll in (or sit) everything the next level still needs.
 * Courses the employer runs don't count against your own yearly limit.
 * Returns the credentials still missing afterwards.
 */
export function runAcademy(ctx, nextLevel) {
  const { state } = ctx;
  const needed = nextLevel.req?.credentials ?? [];
  for (const id of credentialPlan(state, needed)) {
    if (state.credentials.training.some((t) => t.id === id)) continue;
    if (!pursueEligibility(state, id, { academy: true }).ok) continue;
    pursueCredential(ctx, id, { academy: true, quiet: true });
  }
  return needed.filter((id) => !hasCredential(state, id));
}
