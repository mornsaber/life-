/**
 * Career packs, compiled into the profession catalog (career/JobTrees.js merges them in).
 * Kept apart from the event packs so the career catalog doesn't pull in the people and
 * life modules the events need.
 */
import { compileCareer, validateCareer } from './Careers.js';
import { CREDENTIALS } from '../credentials/CredentialRegistry.js';
import careersMore from './packs/careers-more.js';
import careersAllied from './packs/careers-allied.js';
import careersTransport from './packs/careers-transport.js';
import careersAcademic from './packs/careers-academic.js';
import careersAirport from './packs/careers-airport.js';
import careersForeignForces from './packs/careers-foreign-forces.js';
import careersReligiousOrders from './packs/careers-religious-orders.js';
import careersTransit from './packs/careers-transit.js';
import careersEngineering from './packs/careers-engineering.js';
import careersJustice from './packs/careers-justice.js';
import careersWorkforce from './packs/careers-workforce.js';
import careersHealthScience from './packs/careers-health-science.js';
import careersTrades from './packs/careers-trades.js';

export const CAREER_PACKS = [careersMore, careersAllied, careersTransport, careersAcademic, careersAirport, careersForeignForces, careersReligiousOrders, careersTransit, careersEngineering, careersJustice, careersWorkforce, careersHealthScience, careersTrades];

export const CAREER_PROBLEMS = [];
export const PACK_PROFESSIONS = {};
for (const pack of CAREER_PACKS) {
  for (const [id, def] of Object.entries(pack.careers ?? {})) {
    const problems = validateCareer(id, def, { known: new Set(Object.keys(PACK_PROFESSIONS)), credentials: CREDENTIALS });
    if (problems.length) { CAREER_PROBLEMS.push(...problems.map((p) => `${pack.id}: ${p}`)); continue; }
    PACK_PROFESSIONS[id] = compileCareer(id, def);
  }
}
