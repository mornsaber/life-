/**
 * Career packs, compiled into the profession catalog (career/JobTrees.js merges them in).
 * Kept apart from the event packs so the career catalog doesn't pull in the people and
 * life modules the events need.
 */
import { compileCareer, validateCareer } from './Careers.js';
import { CREDENTIALS } from '../credentials/CredentialRegistry.js';
import careersMore from './packs/careers-more.js';

export const CAREER_PACKS = [careersMore];

export const CAREER_PROBLEMS = [];
export const PACK_PROFESSIONS = {};
for (const pack of CAREER_PACKS) {
  for (const [id, def] of Object.entries(pack.careers ?? {})) {
    const problems = validateCareer(id, def, { known: new Set(Object.keys(PACK_PROFESSIONS)), credentials: CREDENTIALS });
    if (problems.length) { CAREER_PROBLEMS.push(...problems.map((p) => `${pack.id}: ${p}`)); continue; }
    PACK_PROFESSIONS[id] = compileCareer(id, def);
  }
}
