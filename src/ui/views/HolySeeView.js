/**
 * The Holy See on the Career tab: the reigning pope, your place in the Church's hierarchy (a
 * cardinal elector, the Pope himself), the papal actions, and your pontifical honours.
 */
import { esc, button, card, kv } from '../Components.js';
import { holySeeOf, isPope, isCardinal, isElector, papabile, papalHonourOptions } from '../../modules/world/HolySee.js';
import { currentYear } from '../../core/State.js';
import { catholicPriest } from '../../modules/community/HolyOrders.js';

const VATICAN_JOBS = ['romanCuria', 'holySeeDiplomacy', 'swissGuard', 'vaticanGendarmerie', 'catholicClergy'];

export function holySeeCard(state) {
  const job = state.career.job;
  const hs = state.holySee;
  const catholic = ['catholic', 'tradCatholic'].includes(state.community?.faith?.traditionId);
  if (!catholic && !VATICAN_JOBS.includes(job?.professionId) && !hs?.pope && !hs?.emeritus) return '';
  const w = holySeeOf(state);
  const age = state.character.age;
  const pope = isPope(state);
  const honours = state.honors.filter((h) => h.id.startsWith('holySee.') && h.id !== 'holySee.cardinal');
  const rows = [
    ['Reigning pope', pope ? `${esc(w.pope.name)} (you) · since ${w.pope.since}` : `${esc(w.pope.name)} · since ${w.pope.since}, aged ${currentYear(state) - w.pope.born}`],
    w.conclaves.length ? ['Last conclave', `${w.conclaves.at(-1).year}: ${esc(w.conclaves.at(-1).elected)}`] : null,
    hs?.emeritus ? ['You', `Pope Emeritus ${esc(hs.emeritus)}`] : null,
    !pope && isCardinal(state) ? ['You', `Cardinal since ${hs?.cardinal?.since ?? age} · ${isElector(state) ? `an elector (until 80) · papabile ~${Math.round(papabile(state) * 100)}%` : 'over 80: no vote in a conclave'}`] : null,
    pope ? ['Pontificate', `${hs.encyclicals} encyclical${hs.encyclicals === 1 ? '' : 's'} · ${hs.journeys} journey${hs.journeys === 1 ? '' : 's'} · ${hs.canonized} canonization${hs.canonized === 1 ? '' : 's'} · ${hs.consistories} consistor${hs.consistories === 1 ? 'y' : 'ies'}`] : null,
    pope ? ['Popularity', `${hs.popularity}%`] : null,
    job?.professionId === 'swissGuard' ? ['The Guard', 'Minimum 26 months · may marry after 3 years, as a corporal and from 25 · Benemerenti medal after 3 years'] : null,
    honours.length ? ['Pontifical honours', esc(honours.map((h) => h.name).join(' · '))] : null,
  ].filter(Boolean);
  const actions = pope ? `<div class="action-grid">
      ${button('📜 Publish an encyclical', 'holySee.encyclical', { hint: 'One a year' })}
      ${button('✈️ Apostolic journey', 'holySee.journey', { hint: 'Two a year' })}
      ${button('😇 Canonize a saint', 'holySee.canonize', { hint: 'Once a year' })}
      ${button('🟥 Hold a consistory', 'holySee.consistory', { hint: 'Create cardinals' })}
      ${button('⛪ Convene a synod of bishops', 'holySee.synod', { hint: 'Every three years' })}
      ${button('🕊️ Renounce the papacy', 'holySee.renounce', { variant: 'danger', hint: 'As Benedict XVI did: Pope Emeritus' })}
    </div>
    <h4 class="sub">Papal honours <small class="muted">three a year</small></h4><div class="toggle-row chips-row">${papalHonourOptions(state).map((p) => button(`🇻🇦 Honour ${esc(p.firstName)}`, 'holySee.honour', { arg: p.id, variant: 'tiny' })).join('')}</div>` : isCardinal(state) ? `<div class="action-grid">${button('🟥 Quietly build support', 'holySee.cultivate', { hint: 'Once a year; don\'t look ambitious' })}</div>` : '';
  const rome = job?.professionId === 'catholicClergy' && catholicPriest(state) ? `<div class="action-grid">${button('🇻🇦 Ask to be sent to the Academy', 'holyOrders.toRome', { arg: 'academy', hint: 'Diplomatic service · under 40' })}${button('🏛️ Ask to serve in the Curia', 'holyOrders.toRome', { arg: 'curia', hint: 'A dicastery in Rome' })}</div>` : '';
  const path = !pope && !isCardinal(state) && catholic ? '<p class="fine">The road to Rome: a priest (Catholic Priesthood) can be sent to the Pontifical Ecclesiastical Academy for the Holy See\'s diplomatic service, or called to the Curia; archbishops of great sees, Prefects and the Secretary of State are made cardinals, and cardinals under 80 elect the Pope. Swiss Catholic men of 19–30 can join the Pontifical Swiss Guard. Lay Catholics of distinction receive the papal orders.</p>' : '';
  return card(pope ? 'The Apostolic Palace' : 'The Holy See', `${kv(rows)}${actions}${rome}${path}`, { icon: '🇻🇦' });
}
