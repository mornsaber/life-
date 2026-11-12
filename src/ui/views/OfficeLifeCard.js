/**
 * Office tab: life in office — your protection, the threats, your district time, and who
 * investigates officials here (politics/OfficeLife.js).
 */
import { card, button, esc } from '../Components.js';
import { protectionOf, isLegislator, DISTRICT, watchdogHere } from '../../modules/politics/OfficeLife.js';

export function officeLifeCard(state) {
  const o = state.politics?.office;
  const p = protectionOf(state);
  if (!o && !p) return '';
  const ol = state.officeLife ?? {};
  const lines = [
    p ? (p.tier === 'detail' ? `🛡️ You are protected by ${p.agency}: armoured cars, a detail at your door, no going anywhere alone.${o ? '' : p.until == null ? ' For life.' : ` Until you're ${p.until}.`}` : '🛡️ Protection officers travel with you.') : '',
    ol.threats ? `📨 ${ol.threats} threat${ol.threats > 1 ? 's' : ''} against you so far${ol.attempts ? `, and ${ol.attempts} attempt${ol.attempts > 1 ? 's' : ''} on your life` : ''}.` : '',
    o ? `🔎 Officials here answer to ${watchdogHere(state)}.` : '',
  ].filter(Boolean);
  const district = o && isLegislator(state)
    ? `<h4 class="sub">Your district</h4><div class="toggle-row">${Object.entries(DISTRICT).map(([id, d]) => button(d.label, 'officeLife.district', { arg: id, variant: (ol.district ?? 'normal') === id ? 'tiny on' : 'tiny', hint: `${d.approval > 0 ? '+' : ''}${d.approval} approval${d.cost ? ` · $${d.cost.toLocaleString()} travel` : ''}` })).join('')}</div>`
    : '';
  if (!lines.length && !district) return '';
  return card('Life in Office', `${lines.map((l) => `<p class="fine">${esc(l)}</p>`).join('')}${district}`, { icon: '🛡️' });
}
