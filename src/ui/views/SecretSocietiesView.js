/**
 * Secret societies (civic/SecretSocieties.js): what you belong to, and what you could.
 */
import { esc, button, card } from '../Components.js';
import { societiesOpen, memberOf, masonDegree } from '../../modules/civic/SecretSocieties.js';

export function secretSocietiesCard(state) {
  if (state.character.age < 16) return '';
  const open = societiesOpen(state);
  const m = memberOf(state);
  const members = open.filter((s) => s.member).map((s) => `<li>${s.icon} <b>${esc(s.name)}</b>${s.id === 'masons' ? ` · ${esc(masonDegree(state))}` : ''} · since age ${m[s.id].since}${m[s.id].exposed ? ' · 📰 known' : ''} ${button('Resign', 'secretSocieties.leave', { arg: s.id, variant: 'tiny ghost' })}</li>`).join('');
  const ask = open.filter((s) => !s.member && !s.invite).map((s) => button(`${s.icon} Ask to join ${s.name}`, 'secretSocieties.petition', { arg: s.id, variant: 'small', disabled: !s.ok, hint: s.ok ? 'A member proposes you' : s.why })).join('');
  const invites = open.filter((s) => !s.member && s.invite && s.ok).map((s) => `<li>${s.icon} ${esc(s.name)}: they may ask you.</li>`).join('');
  if (!members && !ask && !invites) return '';
  return card('Secret Societies', `${members ? `<ul class="history">${members}</ul>` : ''}${ask ? `<div class="action-grid">${ask}</div>` : ''}${invites ? `<p class="fine">By invitation only:</p><ul class="history">${invites}</ul>` : ''}<p class="fine">Connections in business and public life — and the risk that one day the list is published.</p>`, { icon: '🤫' });
}
