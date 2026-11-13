/**
 * Career tab: the licenses and certifications that matter for your job —
 * what your position requires, what the next rungs require, and what your
 * field values — each with its status and a button to pursue it.
 */
import { esc, card, button } from '../Components.js';
import { professionsFor } from '../../modules/career/JobTrees.js';
import { applicationEligibility } from '../../modules/career/CareerEngine.js';
import { hasCredential } from '../../modules/credentials/LicensingEngine.js';
import { credentialRequired } from '../../modules/world/Eras.js';
import { promotionCredentials } from '../../modules/career/JobLicensing.js';
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

/** Credentials that would open jobs you can't apply for yet: each with the jobs it opens. */
export function doorOpeners(state, limit = 6) {
  const opens = new Map();
  for (const p of professionsFor(state)) {
    if (applicationEligibility(state, p.id).ok) continue;
    const need = [...new Set([...(p.entry?.credentials ?? []), ...(p.levels[0]?.req?.credentials ?? [])])].filter((c) => usable(c) && credentialRequired(state, c) && !hasCredential(state, c));
    // Only where the credential is the thing standing in the way (one missing licence).
    if (need.length !== 1) continue;
    if (!opens.has(need[0])) opens.set(need[0], []);
    opens.get(need[0]).push(p.name);
  }
  return [...opens.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, limit);
}

/** Your career's credentials, all in one place: now, to move up, valued, and what opens doors. */
export function careerCredentialsCard(state, ui = {}) {
  const job = state.career.job;
  const profession = job ? getProfession(job.professionId) : null;
  const sections = [];
  const section = (title, ids, note = () => '') => (ids.length ? `<h4 class="sub">${title}</h4><ul class="certs">${ids.map((id) => credentialRow(state, getCredential(id)).replace('</li>', `${note(id)}</li>`)).join('')}</ul>` : '');
  const focus = ui.licFocus && getCredential(ui.licFocus) ? ui.licFocus : null;
  if (focus) sections.push(section('🔎 You were looking at', [focus]));
  if (profession) {
    const ladder = ladderFor(profession, job.employer.size);
    const idx = ladder.findIndex((l) => l.id === job.levelId);
    const now = new Set((ladder[idx]?.req?.credentials ?? []).filter(usable));
    const ahead = new Map();
    for (const l of ladder.slice(idx + 1, idx + 4)) for (const id of l.req?.credentials ?? []) if (usable(id) && !now.has(id) && !ahead.has(id)) ahead.set(id, l.title);
    const valued = valuedCredentials(profession).filter((id) => usable(id) && !now.has(id) && !ahead.has(id) && id !== focus);
    sections.push(section('Required for your position', [...now].filter((id) => id !== focus)));
    sections.push(section('Required to move up', [...ahead.keys()].filter((id) => id !== focus), (id) => `<small class="fine">for ${esc(ahead.get(id))}</small>`));
    sections.push(section('Valued in your field', valued.slice(0, 6), () => '<small class="fine">better hiring and promotion odds</small>'));
  }
  const doors = doorOpeners(state).filter(([id]) => id !== focus);
  sections.push(section('Would open new jobs', doors.map(([id]) => id), (id) => { const jobs = doors.find(([x]) => x === id)?.[1] ?? []; return `<small class="fine">opens ${jobs.slice(0, 3).map(esc).join(', ')}${jobs.length > 3 ? ` +${jobs.length - 3} more` : ''}</small>`; }));
  const body = sections.filter(Boolean).join('');
  if (!body) return '';
  return card(profession ? `Your Career: ${esc(profession.name)}` : 'Your Career', `${profession ? `<p class="fine">${esc(job.title)}. Your employer covers the licences your job requires; for the next rank, some still pay from the training budget.</p>` : '<p class="fine">Licences that stand between you and a job.</p>'}${body}`, { icon: '💼', accent: 'cyan' });
}

/** On the Career tab: where your credentials stand, in one line, and the way to them. */
export function careerCredentialsSummary(state) {
  const job = state.career.job;
  const doors = doorOpeners(state, 3);
  if (!job && !doors.length) return '';
  const promo = job ? promotionCredentials(state) : [];
  const bits = [
    job ? `${Object.values(state.credentials.held).filter((h) => h.status === 'active').length} held` : null,
    promo.length ? `${promo.length} needed to move up` : null,
    doors.length ? `${doors.length === 3 ? '3+' : doors.length} would open new jobs` : null,
  ].filter(Boolean).join(' · ');
  return card('Licenses & Certs', `<p>${esc(bits)}</p><div class="row-end">${button('🪪 See them', 'ui.tab', { arg: 'licenses', variant: 'small' })}</div>`, { icon: '🪪' });
}
