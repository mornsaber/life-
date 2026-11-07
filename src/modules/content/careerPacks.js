/**
 * Career packs, compiled into the profession catalog (career/JobTrees.js merges them in).
 * Kept apart from the event packs so the career catalog doesn't pull in the people and
 * life modules the events need.
 */
import { compileCareer, validateCareer } from './Careers.js';
import { CREDENTIALS } from '../credentials/CredentialRegistry.js';
import careersPrivate from './packs/careers-private.js';
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
import careersMunicipal from './packs/careers-municipal.js';
import careersState from './packs/careers-state.js';
import careersFederal from './packs/careers-federal.js';
import careersGovernment from './packs/careers-government.js';
import careersContractors from './packs/careers-contractors.js';
import careersIntel from './packs/careers-intel.js';
import careersIntlOrgs from './packs/careers-intl-orgs.js';

export const CAREER_PACKS = [careersPrivate, careersMore, careersAllied, careersTransport, careersAcademic, careersAirport, careersForeignForces, careersReligiousOrders, careersTransit, careersEngineering, careersJustice, careersWorkforce, careersHealthScience, careersTrades, careersMunicipal, careersState, careersFederal, careersGovernment, careersContractors, careersIntel, careersIntlOrgs];

export const CAREER_PROBLEMS = [];
export const PACK_PROFESSIONS = {};
for (const pack of CAREER_PACKS) {
  for (const [id, def] of Object.entries(pack.careers ?? {})) {
    const problems = validateCareer(id, def, { known: new Set(Object.keys(PACK_PROFESSIONS)), credentials: CREDENTIALS });
    if (problems.length) { CAREER_PROBLEMS.push(...problems.map((p) => `${pack.id}: ${p}`)); continue; }
    PACK_PROFESSIONS[id] = compileCareer(id, def);
  }
}

/** The public-service catalogs by level of government, as packs (the job board and Gov view list them apart). */
const pick = (pack) => Object.fromEntries(Object.keys(pack.careers).map((id) => [id, PACK_PROFESSIONS[id]]).filter(([, p]) => p));
export const MUNICIPAL_PROFESSIONS = pick(careersMunicipal);
export const STATE_PROFESSIONS = pick(careersState);
export const FEDERAL_PROFESSIONS = pick(careersFederal);
export const CONTRACTOR_PROFESSIONS = pick(careersContractors);
export const INTL_ORG_PROFESSIONS = pick(careersIntlOrgs);
