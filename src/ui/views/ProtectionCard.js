/**
 * Protection: your cover against the danger your name draws, and what you can do about it
 * (life/Protection.js). Shown on the Property tab, in office and at court.
 */
import { esc, money, button, card, kv, meter } from '../Components.js';
import { coverOf, threatOf, stateCover, worthGuarding, POSTURES, FIRMS, firmName, ARMOUR_FROM, PROTECTION_FACTS } from '../../modules/life/Protection.js';
import { yearNow } from '../../modules/world/Eras.js';
import { priceLevel } from '../../modules/world/Countries.js';

export function protectionCard(state) {
  if (!worthGuarding(state)) return '';
  const p = state.protection ?? {};
  const y = yearNow(state);
  const pl = priceLevel(state);
  const { cover, parts } = coverOf(state);
  const { threat, kidnap } = threatOf(state);
  const s = stateCover(state);
  const fee = (t) => Math.round(FIRMS[t].cost * pl * (y < 1950 ? 0.4 : 1));
  const posture = Object.entries(POSTURES).map(([id, x]) => button(x.label, 'protection.posture', { arg: id, variant: (p.posture ?? 'standard') === id ? 'small' : 'small ghost', hint: x.note, disabled: (p.posture ?? 'standard') === id })).join('');
  const firms = [1, 2, 3].map((t) => button(`🛡️ ${firmName(t, y)}`, 'protection.firm', { arg: t, variant: p.firm === t ? 'small' : 'small ghost', hint: `${money(fee(t))}/yr`, disabled: p.firm === t })).join('') + (p.firm ? button('Let them go', 'protection.firm', { arg: 0, variant: 'small ghost' }) : '');
  const kit = [
    y >= ARMOUR_FROM && !p.armoured ? button('🚙 An armoured car', 'protection.armour', { variant: 'small', hint: money(Math.round(PROTECTION_FACTS.ARMOUR_COST * pl)) }) : '',
    !p.secureHome ? button('🏰 Secure the house', 'protection.secureHome', { variant: 'small', hint: PROTECTION_FACTS.secureName(y) }) : '',
    !p.vetted ? button('🔍 Vet the household', 'protection.vet', { variant: 'small', hint: 'Background checks on your staff' }) : '',
    s || p.declined ? button(p.declined ? '🛡️ Accept state protection again' : '🙅 Turn down state protection', 'protection.decline', { variant: 'small ghost', hint: p.declined ? '' : 'Freedom, and the risk that comes with it' }) : '',
  ].join('');
  return card('Protection', `${meter(threat, { label: '⚠️ Threat', tone: threat >= 50 ? 'bad' : 'mid' })}${meter(cover, { label: '🛡️ Cover', tone: cover >= threat ? 'good' : 'mid' })}
    ${kv([
      ['From the state', s ? esc(s.agency) : p.declined ? 'Declined' : 'None'],
      ['Your cover', parts.map(([l, v]) => `${esc(l)} <small class="muted">+${v}</small>`).join(' · ') || 'None'],
      kidnap >= 25 ? ['Kidnap risk', kidnap >= 60 ? '<span class="neg">High: kidnapping is an industry here</span>' : 'Real'] : null,
    ])}
    <h4 class="sub">Posture</h4><div class="toggle-row">${posture}</div>
    <h4 class="sub">Your own team</h4><div class="action-grid">${firms}</div>
    ${kit ? `<h4 class="sub">Arrangements</h4><div class="action-grid">${kit}</div>` : ''}`, { icon: '🛡️', summary: `cover ${cover} · threat ${threat}` });
}
