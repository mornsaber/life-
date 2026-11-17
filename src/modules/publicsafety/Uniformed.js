/**
 * Which uniformed service you're in (a leaf: health and career modules read it).
 *   'police' | 'fire' | 'ems' | 'corrections' | 'military' | null
 */
import { getProfession } from '../career/JobTrees.js';

const POLICE = new Set(['police', 'sheriff', 'statePolice', 'transitPolice', 'airportPolice', 'universityPolice', 'gendarmerie', 'borderPatrol', 'fbi', 'usms', 'dea', 'atf', 'usss']);
const FIRE = new Set(['fire', 'airportFire', 'stateFire', 'privateFire', 'wildland']);
const EMS = new Set(['ems']);
const CORRECTIONS = new Set(['corrections', 'jail', 'federalPrisons']);

/** The service a job belongs to (national careers by their US template). */
export function serviceOfJob(job) {
  if (!job?.professionId) return null;
  let id = job.professionId;
  try { id = getProfession(job.professionId)?.template ?? id; } catch { /* an old or retired career id */ }
  return POLICE.has(id) ? 'police' : FIRE.has(id) ? 'fire' : EMS.has(id) ? 'ems' : CORRECTIONS.has(id) ? 'corrections' : null;
}
/** Your uniformed service now: the forces first, then a civilian job. */
export const uniformedRole = (state) => (state.military?.service ? 'military' : serviceOfJob(state.career?.job));
