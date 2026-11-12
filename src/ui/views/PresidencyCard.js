/**
 * Office tab: running the country — the cabinet, divided or minority government, executive
 * orders in force (and a new one), court appointments, and a reshuffle (politics/Presidency.js).
 */
import { card, button, esc, select } from '../Components.js';
import { LAWS, describeValue } from '../../modules/politics/Laws.js';
import { runsCountry, presidential, dividedGovernment, minorityGovernment, CABINET_STYLES, orderOptions } from '../../modules/politics/Presidency.js';

export function presidencyCard(state) {
  if (!runsCountry(state)) return '';
  const pr = state.presidency ?? {};
  const pres = presidential(state);
  const style = CABINET_STYLES[pr.cabinet?.style];
  const status = pres
    ? (dividedGovernment(state) ? '⚠️ Divided government: the other side holds a chamber. Your bills will struggle, and your nominees too.' : '✅ Your side holds the legislature.')
    : (minorityGovernment(state) ? '⚠️ A minority government: you can be brought down by a vote of no confidence.' : '✅ Your government commands a majority.');
  const orders = (pr.orders ?? []).map((o) => `<li>🖋️ ${esc(LAWS[o.lawId].name)} → ${esc(describeValue(o.lawId, o.to))} <small class="muted">since ${o.year}</small></li>`).join('');
  const used = state.yearly?.['presidency.order'] ?? 0;
  const opts = pres ? orderOptions(state) : [];
  const orderForm = pres && opts.length ? `<div data-collect-root class="toggle-row">${select('order', opts.map((o) => ({ value: `${o.id}|${o.dir}`, label: `${LAWS[o.id].icon} ${LAWS[o.id].name}: ${describeValue(o.id, o.cur)} → ${describeValue(o.id, o.to)}` })), { label: 'Executive order' })}${button('🖋️ Sign it', 'presidency.order', { collect: true, variant: 'small', disabled: used >= 2, hint: `${2 - used} left this year · the courts may strike it down` })}</div>` : '';
  return card(pres ? 'The Presidency' : 'The Government', `
    <p>${esc(status)}</p>
    <p class="fine">${style ? `Cabinet: ${esc(style.label)}${pr.cabinet.rejected ? ` · ${pr.cabinet.rejected} nominee${pr.cabinet.rejected > 1 ? 's' : ''} rejected` : ''}.` : 'Your cabinet is being formed.'}${pres && pr.judges ? ` You have put ${pr.judges} justice${pr.judges > 1 ? 's' : ''} on the court.` : ''}${!pres && pr.motions ? ` You have faced ${pr.motions} confidence motion${pr.motions > 1 ? 's' : ''}.` : ''}</p>
    ${orders ? `<h4 class="sub">Orders in force</h4><ul class="history">${orders}</ul>` : ''}
    ${orderForm}
    <div class="toggle-row">${button('🔄 Reshuffle the cabinet', 'presidency.reshuffle', { variant: 'small ghost', disabled: pr.reshuffled === state.character.age, hint: 'Once a year' })}</div>`, { icon: pres ? '🦅' : '🏛️', accent: 'yellow' });
}
