/**
 * Your club (business/ClubOwnership.js): buy one, run it, and see the season's result.
 */
import { esc, button, card, kv, meter } from '../Components.js';
import { buyOptions, CLUB_SPORTS, divisionName } from '../../modules/business/ClubOwnership.js';

const money = (n) => `$${Math.round(n).toLocaleString()}`;
const ord = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`;

export function clubCard(state) {
  if (state.character.age < 21) return '';
  const c = state.club;
  if (!c) {
    const opts = buyOptions(state);
    if (!opts.length) return '';
    const cash = state.finances?.cash ?? 0;
    // Only show what's within sight: anything you could afford, plus the cheapest you can't.
    const shown = opts.filter((o) => o.price <= cash * 3).slice(0, 6);
    const rows = (shown.length ? shown : opts.slice(0, 2)).map((o) => button(`${o.label} · ${money(o.price)}`, 'clubOwnership.buy', { arg: `${o.sport}:${o.tier}`, variant: 'small', disabled: cash < o.price, hint: cash < o.price ? 'More than you have' : 'Buy it' })).join('');
    return card('Buy a Sports Club', `<p class="fine">Own the club: the squad, the manager, the ground and the fans' fury. Most clubs barely break even; promotion and a rising market are where the money is.</p><div class="action-grid">${rows}</div>`, { icon: '🏟️', summary: `From ${money(Math.min(...opts.map((o) => o.price)))}` });
  }
  const s = CLUB_SPORTS[c.sport];
  const last = c.seasons.at(-1);
  // The season's result, as a card of its own.
  const result = last ? `<div class="result-card ${last.note === 'champions' || last.note === 'promoted' ? 'good' : last.note === 'relegated' ? 'bad' : ''}"><div class="result-big">${ord(last.pos)}</div><div><b>${esc(last.div)}, ${last.year}</b><br><small>${last.note === 'champions' ? '🏆 Champions' : last.note === 'promoted' ? '⬆️ Promoted' : last.note === 'relegated' ? '⬇️ Relegated' : last.note === 'playoffs' ? 'Playoffs' : `of ${last.of}`}${last.cup ? ' · 🏆 Cup winners' : ''} · ${last.net >= 0 ? `+${money(last.net)}` : `−${money(-last.net)}`}</small></div></div>` : '';
  const history = c.seasons.slice(-6, -1).reverse().map((x) => `<li>${x.year}: ${ord(x.pos)} in ${esc(x.div)}${x.note ? ` · ${x.note}` : ''}</li>`).join('');
  const tickets = ['low', 'normal', 'high'].map((t) => button(t[0].toUpperCase() + t.slice(1), 'clubOwnership.ticket', { arg: t, variant: c.ticket === t ? 'tiny on' : 'tiny' })).join('');
  return card(c.name, `${result}
    ${kv([
    ['Sport', `${s.icon} ${esc(s.label)} · ${esc(divisionName(state, c.sport, c.tier))}`],
    ['Value', money(c.value)],
    ['Wage budget', `${money(c.wages)} a year`],
    [s.franchise ? 'Head coach' : 'Manager', `${esc(c.manager.name)} (${c.manager.rating}/100)`],
    ['Ground', `${c.stadium.owned ? 'Owned' : 'Rented'} · ${c.stadium.capacity.toLocaleString()} seats${c.stadium.tenant ? ` · leased to a tenant club (${c.stadium.tenant.years} yrs; it can't be sold from under them)` : ''}`],
  ])}
    ${meter(c.squad, { label: '💪 Squad', tone: c.squad >= 65 ? 'good' : c.squad >= 45 ? 'mid' : 'bad' })}
    ${meter(c.fans, { label: '📣 Fans', tone: c.fans >= 60 ? 'good' : c.fans >= 30 ? 'mid' : 'bad' })}
    <h4 class="sub">Tickets</h4><div class="toggle-row chips-row">${tickets}</div>
    <div class="action-grid">
      ${button('✍️ Sign a star', 'clubOwnership.sign', { variant: 'small', disabled: Boolean(state.yearly['club.sign']), hint: `About ${money(c.wages * 0.4)}` })}
      ${button('💸 Sell your best player', 'clubOwnership.sellStar', { variant: 'small', disabled: Boolean(state.yearly['club.sellStar']) })}
      ${button('⬆️ Raise the wage budget', 'clubOwnership.wages', { arg: 'up', variant: 'small', hint: 'A stronger squad over time' })}
      ${button('⬇️ Cut the wage budget', 'clubOwnership.wages', { arg: 'down', variant: 'small' })}
      ${button(`🧑‍💼 New ${s.franchise ? 'head coach' : 'manager'}`, 'clubOwnership.manager', { variant: 'small', disabled: Boolean(state.yearly['club.manager']) })}
      ${button(c.stadium.owned ? '🏗️ Build a new stand' : '🏟️ Buy the ground', 'clubOwnership.expand', { variant: 'small' })}
      ${button('🤝 Sell the club', 'clubOwnership.sell', { variant: 'small ghost', hint: money(c.value) })}
    </div>
    ${history ? `<p class="fine">Earlier seasons:</p><ul class="history">${history}</ul>` : ''}`, { icon: s.icon, summary: last ? `${ord(last.pos)} in ${last.div}` : 'First season ahead' });
}
