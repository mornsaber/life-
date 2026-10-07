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
  'caseOfficer.trainee': { next: 'officer', grace: 0, label: 'the Farm' },
  'sigint.intern': { next: 'analyst', grace: 0, label: 'the SIGINT development program' },
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
  'catholicClergy.seminarian': { next: 'deacon', grace: 1, label: 'priestly formation in seminary' },
  'privateSecurity.trainee': { next: 'officer', grace: 0, academy: true, label: 'guard-card training' },
  'privatePolice.recruit': { next: 'officer', grace: 1, academy: true, label: 'the police academy' },
  'tsa.trainee': { next: 'officer', grace: 0, academy: true, label: 'TSA screener training' },
  'sheriff.recruit': { next: 'deputy', grace: 1, academy: true, label: 'the sheriff\'s academy' },
  'jail.trainee': { next: 'officer', grace: 1, academy: true, label: 'the detention academy' },
  'federalPrisons.trainee': { next: 'officer', grace: 1, academy: true, label: 'BOP training at FLETC Glynco' },
  'privatePrisons.trainee': { next: 'officer', grace: 1, academy: true, label: 'pre-service corrections training' },
  'probation.trainee': { next: 'officer', grace: 1, academy: true, label: 'the probation officer academy' },
  'dispatch.trainee': { next: 'telecommunicator', grace: 1, academy: true, label: '911 telecommunicator training' },
  'hvac.apprentice': { next: 'tech', grace: 1, academy: true, label: 'your HVAC apprenticeship and EPA 608 certification' },
  'welding.helper': { next: 'welder', grace: 1, academy: true, label: 'your welding certification test' },
  'lineworker.apprentice': { next: 'journeyman', grace: 1, academy: true, label: 'your lineworker apprenticeship' },
  'airTrafficControl.trainee': { next: 'cpc', grace: 0, academy: true, label: 'FAA Academy and facility certification' },
  'transit.trainee': { next: 'operator', grace: 1, academy: true, label: 'bus operator training (CDL and passenger endorsement)' },
  'transitPolice.recruit': { next: 'officer', grace: 1, academy: true, label: 'the police academy' },
  'railroad.trainee': { next: 'conductor', grace: 1, academy: true, label: 'conductor training' },
  'schoolBus.trainee': { next: 'driver', grace: 1, academy: true, label: 'school bus driver training' },
  'postal.cca': { next: 'carrier', grace: 1, label: 'your City Carrier Assistant years before conversion to career' },
  'waterUtility.trainee': { next: 'operator', grace: 1, academy: true, label: 'operator-in-training certification' },
  'borderPatrol.trainee': { next: 'agent', grace: 0, academy: true, label: 'the Border Patrol Academy in Artesia' },
  'fbi.trainee': { next: 'agent', grace: 0, academy: true, label: 'the FBI Academy at Quantico' },
  'dea.trainee': { next: 'agent', grace: 0, academy: true, label: 'the DEA Academy at Quantico' },
  'atf.trainee': { next: 'agent', grace: 0, academy: true, label: 'ATF special agent training at FLETC' },
  'usms.trainee': { next: 'agent', grace: 0, academy: true, label: 'Deputy Marshal training at FLETC' },
  'usss.trainee': { next: 'agent', grace: 0, academy: true, label: 'Secret Service training at FLETC and Beltsville' },
  'benefitsClaims.trainee': { next: 'specialist', grace: 0, label: 'claims specialist training' },
  'carpentry.apprentice': { next: 'journeyman', grace: 1, academy: true, label: 'your carpentry apprenticeship' },
  'ironworking.apprentice': { next: 'journeyman', grace: 1, academy: true, label: 'your ironworker apprenticeship' },
  'craneOperator.oiler': { next: 'operator', grace: 1, academy: true, label: 'NCCCO crane operator certification' },
  'fishing.greenhorn': { next: 'deckhand', grace: 0, label: 'your greenhorn season' },
  'flightAttendant.trainee': { next: 'reserve', grace: 1, academy: true, label: 'flight attendant initial training' },
  'merchantMarine.ordinary': { next: 'able', grace: 1, academy: true, label: 'your first sea time and Able Seaman endorsement' },
  'cruise.steward': { next: 'waiter', grace: 1, academy: true, label: 'STCW safety training and your first contract' },
  'catholicClergy.deacon': { next: 'vicar', grace: 0, label: 'your diaconate year before priestly ordination' },
};
export const traineeProgram = (job) => (job ? TRAINEE_LEVELS[`${job.professionId}.${job.levelId}`] ?? null : null);

/** Credentials in the order they must be earned (prerequisites first). */
/** Prerequisite credentials; for either/or requirements, the branch you're closest to. */
function prerequisites(state, req) {
  if (!req) return [];
  if (!req.anyOf) return req.credentials ?? [];
  const missing = (r) => (r.credentials ?? []).filter((c) => !hasCredential(state, c)).length;
  return [...req.anyOf].sort((a, b) => missing(a) - missing(b))[0].credentials ?? [];
}

export function credentialPlan(state, ids, seen = new Set()) {
  const plan = [];
  for (const id of ids) {
    if (seen.has(id) || hasCredential(state, id) || !CREDENTIALS[id]) continue;
    seen.add(id);
    plan.push(...credentialPlan(state, prerequisites(state, CREDENTIALS[id].requires), seen), id);
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
