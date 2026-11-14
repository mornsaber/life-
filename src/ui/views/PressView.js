/**
 * The press: owning a paper, a station or a channel, in the forms of the day.
 */
import { esc, button, card, kv } from '../Components.js';
import { outletsNow, LINES, salePrice } from '../../modules/world/Institutions.js';
import { regimeHere } from '../../modules/world/Regimes.js';

export function pressCard(state) {
  if (state.character.age < 21) return '';
  const p = state.press;
  if (p) {
    return card(p.outlet, `${kv([
      ['Since', p.since],
      [p.kind === 'paper' ? 'Readers' : 'Audience', p.readers.toLocaleString()],
      ['Influence', `${p.influence}/100`],
      ['Libel writs', p.writs],
    ])}
      <h4 class="sub">Editorial line</h4><div class="toggle-row">${Object.entries(LINES).map(([id, l]) => button(l, 'publicLife.line', { arg: id, variant: p.line === id ? 'tiny on' : 'tiny' })).join('')}</div>
      <div class="action-grid">${button(`💼 Sell it (about $${salePrice(state, p).toLocaleString()})`, 'publicLife.sellOutlet', { variant: 'small ghost' })}</div>
      <p class="fine">Scandal sells and draws libel writs; a crusade builds influence; influence helps anyone in politics you back — yourself included.</p>`, { icon: '📰' });
  }
  const outlets = outletsNow(state);
  if (!outlets.length) return regimeHere(state)?.press !== 'free' ? card('The Press', '<p class="muted">The state owns or controls every paper and station. There is nothing to buy.</p>', { icon: '📰' }) : '';
  const cash = state.finances?.cash ?? 0;
  const rows = outlets.map((o) => `<li class="fund-row"><span><b>${o.icon} ${esc(o.label.replace(/^./, (c) => c.toUpperCase()))}</b></span>${button(`Local $${o.local.toLocaleString()}`, 'publicLife.buyOutlet', { arg: `${o.id}:local`, variant: 'tiny', disabled: cash < o.local })}${button(`National $${o.national.toLocaleString()}`, 'publicLife.buyOutlet', { arg: `${o.id}:national`, variant: 'tiny', disabled: cash < o.national })}</li>`).join('');
  return card('The Press', `<p class="muted">Own a voice: what's for sale in this day.</p><ul class="funds">${rows}</ul>`, { icon: '📰' });
}
