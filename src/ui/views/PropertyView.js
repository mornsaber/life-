/**
 * The Property tab: everything you own and what it costs to keep, and the household staff.
 */
import { esc, money, button, card, kv, empty } from '../Components.js';
import { propertyLedger, staffOf, rolesOpen, staffName, STAFF, staffWages, PERKS } from '../../modules/life/Property.js';
import { yearNow } from '../../modules/world/Eras.js';
import { estateOf, greatHouse, villasNow, collectablesNow, COLLECTABLES, LOT } from '../../modules/life/Estate.js';
import { priceLevel } from '../../modules/world/Countries.js';
import { protectionCard } from './ProtectionCard.js';

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
  const word = (n, hi, mid, lo) => (n >= 80 ? hi : n >= 55 ? mid : lo);
  const lis = staff.map((s) => `<li class="region-row"><span>${STAFF[s.role].icon} <b>${esc(s.name)}</b> <small>${esc(staffName(s.role, y))} · since age ${s.since} · ${word(s.skill ?? 60, 'excellent', 'capable', 'learning')} · ${word(s.loyalty ?? 65, 'devoted', 'loyal', 'restless')}</small><small class="muted">${esc(PERKS[s.role] ?? '')}</small></span><small>${money(s.wage)}/yr</small>${button('🎁 Bonus', 'property.reward', { arg: s.id, variant: 'tiny ghost', hint: money(Math.round(s.wage * 0.1)) })}${button('Let go', 'property.dismiss', { arg: s.id, variant: 'tiny ghost' })}</li>`).join('');
  const agency = y >= 1880;
  const open = rolesOpen(state, y).map((r) => button(`${r.icon} ${r.name}`, 'property.hire', { arg: agency ? `${r.id}|agency` : r.id, variant: 'small', hint: `${money(r.wage)}/yr${agency ? ' + agency fee' : ''} · ${PERKS[r.id] ?? ''}`, disabled: state.finances.cash < r.wage })).join('');
  const era = y < 1914 ? 'Service is cheap and everyone with means keeps a maid at least; a great house has a dozen.' : y < 1960 ? 'Since the war, good servants are hard to find: the young go to the factories and the shops.' : 'Staff are a luxury now: a cleaner, a nanny, and for the rich a chef, a driver and a PA.';
  return card('Household Staff', `${lis ? `<ul class="history">${lis}</ul>` : empty('Nobody in service.')}
    ${open ? `<h4 class="sub">Take someone on</h4><div class="action-grid">${open}</div>` : ''}
    <p class="fine">${esc(era)} A butler needs a household of three below him; footmen go with a butler.</p>`, { icon: '🤵', summary: staff.length ? `${staff.length} · ${money(staffWages(state))}/yr` : '' });
}

function estateCard(state) {
  const house = greatHouse(state);
  if (!house) return '';
  const e = estateOf(state);
  return card('The Estate', `<p class="muted">Your ${esc(house.typeName ?? 'great house')} comes with its tenant farms. The rents keep the roof on, for now.</p>
    ${kv([['Land agent', e.agent ? 'Yes' : 'You deal with the tenants yourself'], ['Open to the public', e.opened ? `Since ${e.opened}` : 'No']])}
    ${button(e.agent ? 'Let the land agent go' : '📒 Take on a land agent', 'estate.agent', { variant: 'small ghost' })}`, { icon: '🏰' });
}

function villaCard(state) {
  if (state.character.age < 21) return '';
  const e = estateOf(state);
  const mine = e.villas.map((v) => `<li class="region-row"><span>🏡 <b>${esc(v.place)}</b> <small>since ${v.since}</small></span><small>worth ${money(v.value)}</small>${button('Sell', 'estate.sellVilla', { arg: v.id, variant: 'tiny ghost' })}</li>`).join('');
  const open = villasNow(state).filter((v) => !e.villas.some((x) => x.id === v.id));
  if (!mine && !open.some((v) => state.finances.cash >= v.cost)) return '';
  return card('A House Abroad', `${mine ? `<ul class="history">${mine}</ul>` : ''}<div class="action-grid">${open.map((v) => button(`${v.icon} ${v.place[0].toUpperCase()}${v.place.slice(1)}`, 'estate.villa', { arg: v.id, variant: 'small', hint: money(v.cost), disabled: state.finances.cash < v.cost })).join('')}</div>`, { icon: '🌴', open: Boolean(mine) });
}

function collectionCard(state) {
  if (state.character.age < 18) return '';
  const e = estateOf(state);
  const kinds = collectablesNow(state);
  const groups = kinds.map((c) => { const lots = e.collection.filter((x) => x.kind === c.id); return lots.length ? `<li class="region-row"><span>${c.icon} <b>${esc(c.label)}</b> <small>${lots.length} lot${lots.length === 1 ? '' : 's'}</small></span><small>worth ${money(lots.reduce((s, x) => s + x.value, 0))}</small>${button('Sell at auction', 'estate.sellCollection', { arg: c.id, variant: 'tiny ghost' })}</li>` : ''; }).join('');
  const cost = Math.round(LOT * priceLevel(state));
  return card('Collections', `${groups ? `<ul class="history">${groups}</ul>` : ''}<div class="action-grid">${kinds.map((c) => button(`${c.icon} ${c.label}`, 'estate.collect', { arg: c.id, variant: 'small', hint: money(cost), disabled: state.finances.cash < cost })).join('')}</div><p class="fine">Markets rise and fall by decade; some lots turn out to be fakes. The auctioneer takes a fifth when you sell.</p>`, { icon: '🖼️', open: Boolean(groups) });
}

export function propertyView(state) {
  return ledgerCard(state) + estateCard(state) + staffCard(state) + protectionCard(state) + villaCard(state) + collectionCard(state);
}
