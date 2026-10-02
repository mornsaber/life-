/**
 * Legal tab: criminal record, probation, incarceration and open exposure.
 */
import { esc, card, chip, kv, empty } from '../Components.js';
import { SEVERITY_LABEL } from '../../modules/legal/index.js';

export function legalView(state) {
  const l = state.legal;
  const inc = l.incarceration;
  const status = inc
    ? `<p class="why">🔒 Incarcerated at ${esc(inc.facility)} — ${inc.yearsLeft} of ${inc.total} years remaining. Most actions are unavailable.</p>`
    : l.probationYears ? `<p>${chip(`⚖️ On probation: ${l.probationYears} yr`, 'warn')}</p>` : '<p class="pos">No current sentence.</p>';
  const record = l.record.length
    ? `<ul class="history">${[...l.record].reverse().map((r) => `<li>${chip(SEVERITY_LABEL[r.severity], r.severity === 'felony' ? 'bad' : r.severity === 'misdemeanor' ? 'warn' : '')} <b>${esc(r.name)}</b>${r.abroad ? ' (abroad)' : ''} <small>age ${r.age} — ${esc(r.sentence || 'no sentence')}</small></li>`).join('')}</ul>`
    : empty('Clean record.');
  return `${card('Legal Status', `${status}${kv([
    ['Felonies', l.record.filter((r) => r.severity === 'felony').length],
    ['Misdemeanors', l.record.filter((r) => r.severity === 'misdemeanor').length],
    ['Things that could still catch up with you', l.investigations.length ? `<span class="neg">${l.investigations.length}</span>` : '0'],
  ])}<p class="fine">Felonies bar most licensed professions, clearances, police reserves and military enlistment. Diplomatic immunity only shields you from host-country law.</p>`, { icon: '⚖️', accent: 'red' })}
  ${card('Criminal Record', record, { icon: '🗂️' })}`;
}
