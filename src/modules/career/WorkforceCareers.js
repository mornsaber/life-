/**
 * More of the workforce: the arts and sports (acting, music, professional
 * athletes, fitness), business functions found in every large employer
 * (marketing, sales, HR, data, cybersecurity, design), architecture,
 * warehouses and factories, care work (childcare, home care, funeral
 * services), nonprofits, and local and federal public servants (libraries,
 * water utilities, animal services, the Border Patrol).
 *
 * Real-world rules worth knowing:
 *   - Actors and musicians mostly earn from gigs: pay swings year to year
 *     (commission). SAG-AFTRA membership opens union film and TV work.
 *   - Architects need an accredited degree, years of supervised experience
 *     and the ARE exams to be licensed.
 *   - Water operators, funeral directors and child-care teachers hold state
 *     certifications; Border Patrol agents train at the academy in Artesia
 *     and must be hired before 40.
 *   - Professional athletes need elite fitness and a short window: the
 *     careers that outlast the playing years are coaching and front offices.
 */
import { L } from './Ladder.js';

/** Local charities and advocacy groups, named for the place they serve. */
export const NONPROFIT_NAMES = [
  (c) => `${c} Community Foundation`, (c) => `${c} Food Bank`, (c) => `${c} Legal Aid Society`, (c) => `${c} Youth Services`,
  (c) => `${c} Housing Coalition`, (c) => `${c} Literacy Council`, (c) => `${c} Environmental Council`, (c) => `${c} Refugee & Immigrant Services`,
];

export const BORDER_PATROL_MAX_AGE = 39;

export const fitnessGate = (min, maxAge) => (state) => {
  if (state.stats.fitness < min) return { ok: false, reason: `Needs elite fitness (${min}+)` };
  if (maxAge && state.character.age > maxAge) return { ok: false, reason: `Teams sign players by age ${maxAge}` };
  return { ok: true };
};

/* The careers themselves (WORKFORCE_PROFESSIONS) live in content/packs/careers-workforce.js. */
