/**
 * The Property tab: everything you own and what it costs to keep, and the household staff.
 */
import { esc, money, button, card, kv, empty } from '../Components.js';
import { propertyLedger, staffOf, rolesOpen, staffName, STAFF, staffWages } from '../../modules/life/Property.js';
import { yearNow } from '../../modules/world/Eras.js';

function ledgerCard(state) {
  const rows = propertyLedger(state);
  if (!rows.length) return card('What You Own', empty('Nothing of note yet: no house, no carriage, nobody in service.'), { icon: '🗝️' });
  const worth = rows.reduce((s, r) => s + r.value, 0);
  const yearly = rows.reduce((s, r) => s + r.yearly, 0);
  const lis = rows.map((r) => `<li class="region-row"><span>${r.icon} <b>${esc(r.label)}</b> <small>${r.kind === 'farm' ? `${r.count.toLocaleString()} acres` : `× ${r.count}`}</small></span><small>${r.value ? `worth ${money(r.value)}` : ''}${r.value && r.yearly ? ' · ' : ''}${r.yearly ? `${money(r.yearly)}/yr to keep` : ''}</small></li>`).join('');
  return card('What You Own', `<ul class="history">${lis}</ul>${kv([['Worth (net of loans)', money(worth)], ['Yearly running costs', money(yearly)]])}`, { icon: '🗝️', summary: `${money(worth)} · ${money(yearly)}/yr` });
}

function staffCard(state) {
  if (state.character.age < 18) return '';
  const y = yearNow(state);
  const staff = staffOf(state);
  const lis = staff.map((s) => `<li class="region-row"><span>${STAFF[s.role].icon} <b>${esc(s.name)}</b> <small>${esc(staffName(s.role, y))} · since age ${s.since}</small></span><small>${money(s.wage)}/yr</small>${button('Let go', 'property.dismiss', { arg: s.id, variant: 'tiny ghost' })}</li>`).join('');
  const open = rolesOpen(state, y).map((r) => button(`${r.icon} ${r.name}`, 'property.hire', { arg: r.id, variant: 'small', hint: `${money(r.wage)}/yr`, disabled: state.finances.cash < r.wage })).join('');
  const era = y < 1914 ? 'Service is cheap and everyone with means keeps a maid at least; a great house has a dozen.' : y < 1960 ? 'Since the war, good servants are hard to find: the young go to the factories and the shops.' : 'Staff are a luxury now: a cleaner, a nanny, and for the rich a chef, a driver and a PA.';
  return card('Household Staff', `${lis ? `<ul class="history">${lis}</ul>` : empty('Nobody in service.')}
    ${open ? `<h4 class="sub">Take someone on</h4><div class="action-grid">${open}</div>` : ''}
    <p class="fine">${esc(era)} A butler needs a household of three below him; footmen go with a butler.</p>`, { icon: '🤵', summary: staff.length ? `${staff.length} · ${money(staffWages(state))}/yr` : '' });
}

export function propertyView(state) {
  return ledgerCard(state) + staffCard(state);
}
