/**
 * High society (life/HighSociety.js): the calendar of the day, the clubs, the toys, the giving.
 */
import { esc, button, card, kv, meter } from '../Components.js';
import { inSociety, eventsNow, clubsNow, LUXURIES, societyOf } from '../../modules/life/HighSociety.js';
import { yearNow } from '../../modules/world/Eras.js';

const money = (n) => `$${Math.round(n).toLocaleString()}`;

/** Imperial Brazil: a barony for a gift to the Emperor's causes (world/NobleWays.js). */
function baronyCard(state) {
  const y = yearNow(state);
  if ((state.character.countryId ?? 'US') !== 'BR' || y < 1822 || y >= 1889 || state.character.peerage || state.character.age < 25) return '';
  return card('A Title from the Emperor', '<p>The Emperor rewards those who give generously to his causes with a title: baron, viscount, even count. Brazilian titles are for life: they die with you.</p><div class="toggle-row">' + button('☕ Make the gift and ask for a barony', 'nobleWays.buyBarony', { variant: 'small' }) + '</div>', { icon: '👑' });
}

export function societyView(state) {
  if (!inSociety(state)) return baronyCard(state) + card('High Society', '<p class="muted">The invitations come with a fortune (about $10 million in today\'s money) or a title.</p>', { icon: '🥂' });
  const barony = baronyCard(state);
  const s = societyOf(state) ?? { standing: 30, oldMoney: false, attended: {}, clubs: [], yacht: 0, jet: 0, horses: 0, art: [] };
  const y = yearNow(state);
  const done = s.attended?.[y] ?? [];
  const events = eventsNow(state).map((e) => button(`${e.icon} ${e.label}`, 'highSociety.attend', { arg: e.id, variant: done.includes(e.id) ? 'small on' : 'small', disabled: done.includes(e.id), hint: done.includes(e.id) ? 'Been this year' : `${money(e.cost)} · ${e.text}` })).join('');
  const clubs = clubsNow(state).map((c) => button(`${c.icon} ${c.label}`, 'highSociety.joinClub', { arg: c.id, variant: s.clubs.includes(c.id) ? 'small on' : 'small', disabled: s.clubs.includes(c.id) || c.closed, hint: s.clubs.includes(c.id) ? 'Member' : c.closed ? (state.character.gender === 'female' ? 'Men only' : 'Women only') : c.text })).join('');
  const toys = Object.entries(LUXURIES).filter(([, l]) => y >= l.from).map(([id, l]) => button(`${l.icon} ${l.label(y)}`, 'highSociety.buy', { arg: id, variant: 'small', hint: `About ${money(l.price)} in today's money` })).join('');
  const owned = [s.yacht ? `🛥️ ${s.yacht} yacht${s.yacht > 1 ? 's' : ''}` : '', s.jet ? `🛩️ ${s.jet} jet${s.jet > 1 ? 's' : ''}` : '', s.horses ? `🐎 ${s.horses} racehorse${s.horses > 1 ? 's' : ''}` : '', s.art?.length ? `🖼️ ${s.art.length} painting${s.art.length > 1 ? 's' : ''} (worth ${money(s.art.reduce((a, b) => a + b.value, 0))})` : ''].filter(Boolean).join(' · ');
  return `${barony}${card('High Society', `${meter(s.standing, { label: `🥂 Standing${s.oldMoney ? ' · old money' : ' · new money'}`, tone: s.standing >= 65 ? 'good' : s.standing >= 35 ? 'mid' : 'bad' })}
    ${kv([['Clubs', s.clubs.length ? esc(s.clubs.map((id) => clubsNow(state).find((c) => c.id === id)?.label ?? id).join(', ')) : 'None yet'], ...(owned ? [['Yours', owned]] : []), ...(s.foundation ? [['Giving', `${esc(s.foundation.name)} · ${money(s.foundation.endowment)}`]] : []), ...(s.rival ? [['Rival', esc(s.rival)]] : [])])}
    <p class="fine">${s.oldMoney ? 'Old money: the doors open of their own accord.' : y < 1960 ? 'New money: expect a few doors to stay shut, and a few duchesses to look straight through you.' : 'New money: the old families still notice.'} Stay away a year and people forget you.</p>`, { icon: '🥂' })}
    ${card(`The Calendar, ${y}`, `<div class="action-grid">${events || '<p class="muted">Nothing this year.</p>'}</div>`, { icon: '📅' })}
    ${clubs ? card('Clubs', `<p class="fine">A member proposes you; a single black ball keeps you out.</p><div class="action-grid">${clubs}</div>`, { icon: '🎩' }) : ''}
    ${card('Toys and Giving', `<div class="action-grid">${toys}${s.art?.length ? button('🔨 Sell a painting', 'highSociety.sellArt', { variant: 'small' }) : ''}${button('🎗️ Endow a foundation', 'highSociety.foundation', { variant: 'small', hint: 'A fifth of your cash; a big gift names a hospital wing' })}</div>`, { icon: '🛥️' })}`;
}
