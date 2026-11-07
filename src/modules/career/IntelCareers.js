/**
 * The Intelligence Community's operational careers (analysts live in
 * FederalAgencies as `intelligence`).
 *
 * Real-world rules worth knowing:
 *   - Every job needs a TS/SCI clearance and, at CIA and NSA, a full-scope
 *     polygraph. Conditional offers are rescinded for failing either.
 *   - CIA operations officers train at "the Farm", then serve overseas under
 *     official cover (diplomatic immunity) or non-official cover (a business
 *     identity: better pay, no immunity if caught).
 *   - New clandestine officers are usually hired in their twenties or early
 *     thirties.
 *   - NSA cryptologists, language analysts and SIGINT developers come in
 *     through development programs; technical directors are the senior
 *     experts.
 */
import { L } from './Ladder.js';
import careersPack, { CLANDESTINE_MAX_AGE, IC_PROFESSIONS, clandestineGate } from '../content/packs/careers-intel.js';
export { CLANDESTINE_MAX_AGE, IC_PROFESSIONS, clandestineGate };

/* The careers themselves live in content/packs/careers-intel.js. */


