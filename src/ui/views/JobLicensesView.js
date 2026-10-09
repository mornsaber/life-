/**
 * Career tab: the licenses and certifications that matter for your job —
 * what your position requires, what the next rungs require, and what your
 * field values — each with its status and a button to pursue it.
 */
import { esc, card } from '../Components.js';
import { getCredential, valuedCredentials, CREDENTIALS } from '../../modules/credentials/CredentialRegistry.js';
import { getProfession } from '../../modules/career/JobTrees.js';
import { ladderFor } from '../../modules/career/Ladder.js';
import { credentialRow } from './LicensesView.js';

const usable = (id) => CREDENTIALS[id] && !CREDENTIALS[id].retired && id !== 'driverLicense';

export function jobLicensesCard(state) {
  const job = state.career.job;
  if (!job) return '';
  const profession = getProfession(job.professionId);
  if (!profession) return '';
  const ladder = ladderFor(profession, job.employer.size);
  const idx = ladder.findIndex((l) => l.id === job.levelId);
  const now = new Set((ladder[idx]?.req?.credentials ?? []).filter(usable));
  // The next few rungs up (and any specialist track reachable from here).
  const ahead = new Map();
  for (const l of ladder.slice(idx + 1, idx + 4)) for (const id of l.req?.credentials ?? []) if (usable(id) && !now.has(id) && !ahead.has(id)) ahead.set(id, l.title);
  const valued = valuedCredentials(profession).filter((id) => usable(id) && !now.has(id) && !ahead.has(id));
  if (!now.size && !ahead.size && !valued.length) return '';
  const section = (title, ids, note = () => '') => (ids.length ? `<h4 class="sub">${title}</h4><ul class="certs">${ids.map((id) => credentialRow(state, getCredential(id)).replace('</li>', `${note(id)}</li>`)).join('')}</ul>` : '');
  return card(`Licenses for Your Job`, `
    <p class="fine">${esc(profession.name)} · ${esc(job.title)}. Employers often pay for job-relevant credentials from their training budget. The full registry is on the Licenses tab.</p>
    ${section('Required for your position', [...now])}
    ${section('Required to move up', [...ahead.keys()], (id) => `<small class="fine">for ${esc(ahead.get(id))}</small>`)}
    ${section('Valued in your field', valued.slice(0, 8), () => '<small class="fine">better hiring and promotion odds</small>')}`, { icon: '🪪' });
}
