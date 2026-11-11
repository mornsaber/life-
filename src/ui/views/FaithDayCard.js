/**
 * Community tab: "Faith & Societies in <year>" — the established church and what it barred,
 * persecution, the decline of churchgoing, and the clubs and societies of the day
 * (community/FaithOfTheDay.js).
 */
import { card, button, esc } from '../Components.js';
import { yearNow, PRESENT } from '../../modules/world/Eras.js';
import { TRADITIONS } from '../../modules/community/Religions.js';
import { CLUBS, clubsHere, clubsOf, clubEligibility, establishedHere, faithBar, officialAtheism, persecutedAsJew } from '../../modules/community/FaithOfTheDay.js';

export function faithDayCard(state) {
  if (!state.community) return '';
  const y = yearNow(state);
  const historic = state.era && y < PRESENT;
  const e = historic ? establishedHere(state) : null;
  const lines = [
    e ? `The ${TRADITIONS[e.church]?.name ?? 'established'} church is the established church.` : '',
    historic && faithBar(state, 'office') ? `${faithBar(state, 'office')}.` : '',
    historic && faithBar(state, 'university') ? `${faithBar(state, 'university')}.` : '',
    historic && officialAtheism(state) ? 'The state is officially atheist: churchgoing is watched and held against you.' : '',
    historic && persecutedAsJew(state) ? 'Jews are being persecuted under the regime\'s racial laws.' : '',
    historic && y < 1960 && !officialAtheism(state) ? 'Nearly everyone belongs to a church, chapel, synagogue or mosque.' : '',
  ].filter(Boolean);
  const mine = clubsOf(state);
  const ids = [...new Set([...mine.map((m) => m.id), ...clubsHere(state)])];
  if (!lines.length && !ids.length) return '';
  const rows = ids.map((id) => {
    const c = CLUBS[id];
    const member = mine.some((m) => m.id === id);
    const r = clubEligibility(state, id);
    return `<li class="fund-row"><span><b>${c.icon} ${esc(c.name)}</b> <small>${esc(c.desc)} $${c.dues}/yr${member || r.ok ? '' : ` <span class="why">${esc(r.reason)}</span>`}</small></span>${member ? button('Leave', 'faithDay.leave', { arg: id, variant: 'tiny ghost' }) : button('Join', 'faithDay.join', { arg: id, variant: 'tiny', disabled: !r.ok })}</li>`;
  }).join('');
  const title = historic ? `Faith & Societies in ${y}` : 'Clubs & Societies';
  return card(title, `${lines.length ? `<p>${esc(lines.join(' '))}</p>` : ''}${rows ? `<ul class="funds">${rows}</ul>` : ''}`, { icon: '🏛️', summary: mine.length ? `${mine.length} club${mine.length > 1 ? 's' : ''}` : undefined });
}
