/**
 * The empire at a glance (Money tab): everything you own that earns, in one card —
 * companies, rental property, patents and shares.
 */
import { esc, money, card, kv } from '../Components.js';
import { businessEquity, stocksValue } from '../../core/State.js';
import { portfolio } from '../../modules/realestate/PropertyEmpire.js';
import { inventionsOf } from '../../modules/business/Inventions.js';

export function empireCard(state) {
  const bizs = [state.business?.current, ...(state.business?.holdings ?? [])].filter(Boolean);
  const pf = portfolio(state);
  const pats = inventionsOf(state).patents.filter((p) => ['held', 'licensed', 'company'].includes(p.status));
  const royalties = pats.reduce((s, p) => s + (p.status === 'licensed' ? p.royalty : 0), 0);
  const shares = stocksValue(state);
  if (!bizs.length && !pf.properties && !pats.length && !shares) return '';
  const rows = [
    bizs.length ? ['🏢 Companies', `${bizs.length} · your stake ${money(businessEquity(state))}${bizs.length === 1 ? ` <small>(${esc(bizs[0].name)})</small>` : ''}`] : null,
    pf.properties ? ['🏘️ Rental property', `${pf.properties} propert${pf.properties === 1 ? 'y' : 'ies'}, ${pf.units} units · equity ${money(pf.value - pf.debt)} · rent ${money(pf.roll)}/yr`] : null,
    pats.length ? ['📜 Patents', `${pats.length} in force${royalties ? ` · ${money(royalties)}/yr royalties` : ''}`] : null,
    shares ? ['🏛️ Shares & options', money(shares)] : null,
  ].filter(Boolean);
  const total = businessEquity(state) + Math.max(0, pf.value - pf.debt) + shares;
  return card('Your Empire', kv(rows), { icon: '👑', accent: 'yellow', summary: money(total) });
}
