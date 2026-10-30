/**
 * The stock market card (Money tab, under Invest): named companies, your
 * shares, shorts and options, and the current mania if there is one.
 */
import { esc, money, button, card, chip, kv, select, disclosure } from '../Components.js';
import { ALL_COMPANIES, listed, stockValue, optionValue, premiumRate, SHORT_FEE } from '../../modules/investing/StockMarket.js';
import { SECTORS } from '../../modules/economy/EconomyEngine.js';

const price = (n) => `$${n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(2)}`;

export function stocksCard(state) {
  const s = state.stocks;
  if (!s || !state.investing) return '';
  const adult = state.character.age >= 18;
  const v = stockValue(state);
  const board = listed(state).map(([id, c]) => {
    const d = ALL_COMPANIES[id];
    const pos = s.positions[id];
    const sh = s.shorts[id];
    return `<li class="region-row"><span>${SECTORS[d.sector]?.icon ?? '📈'} <b>${esc(d.ticker)}</b> <small>${esc(d.name)}</small></span>
      <small>${price(c.price)} · P/E ${Math.round(c.price / Math.max(0.01, c.eps))}${d.div ? ` · yield ${(d.div * 100).toFixed(1)}%` : ''}${pos ? ` · <b>you hold ${money(pos.shares * c.price)}</b>` : ''}${sh ? ` · <b>short ${money(sh.shares * sh.entry)}</b>` : ''}</small>
      ${pos ? button('Sell', 'stocks.sell', { arg: id, variant: 'tiny' }) : ''}${sh ? button('Cover', 'stocks.cover', { arg: id, variant: 'tiny' }) : ''}</li>`;
  }).join('');
  const opts = s.options.map((o) => `<li>🎟️ <b>${esc(ALL_COMPANIES[o.companyId].ticker)} ${o.kind}</b> — strike ${price(o.strike)}, paid ${money(o.premium)}, worth ${money(optionValue(state, o))} now <small>expires at ${o.expires}</small></li>`).join('');
  const amounts = [1000, 5000, 10000, 25000, 100000].map((n) => ({ value: String(n), label: money(n), disabled: state.finances.cash < n }));
  const tickers = listed(state).map(([id]) => ({ value: id, label: `${ALL_COMPANIES[id].ticker} — ${ALL_COMPANIES[id].name}` }));
  const trade = adult ? `<div class="toggle-row" data-collect-root>
      ${select('company', tickers, { label: 'Stock' })}
      ${select('amount', amounts, { label: 'Amount' })}
      ${button('🛒 Buy', 'stocks.buy', { variant: 'small', collect: true, disabled: state.finances.cash < 1000 })}
      ${button('📉 Short', 'stocks.short', { variant: 'small', collect: true, disabled: state.finances.cash < 1000, hint: `Needs equal cash as margin · ${Math.round(SHORT_FEE * 100)}%/yr borrow fee` })}
    </div>
    <div class="toggle-row" data-collect-root>
      ${select('company', tickers, { label: 'Options on' })}
      ${select('kind', [{ value: 'call', label: '📈 Calls (it rises)' }, { value: 'put', label: '📉 Puts (it falls)' }], { label: 'Bet' })}
      ${select('amount', amounts.slice(0, 4), { label: 'Premium' })}
      ${button('🎟️ Buy options', 'stocks.option', { variant: 'small', collect: true, disabled: state.finances.cash < 1000, hint: 'One year, at today\'s price; worthless if wrong' })}
    </div>` : '<p class="muted">You can trade at 18.</p>';
  return card('Stock Market', `
    <p>${s.bubble ? chip(`🫧 ${SECTORS[s.bubble.sector].name} mania — year ${s.bubble.years}`, 'warn') : ''} ${chip(`${listed(state).length} listed`)}</p>
    ${kv([['Shares', money(v.long)], ['Shorts (P&L)', money(v.short)], ['Options', money(v.options)]])}
    ${opts ? `<h4 class="sub">Options</h4><ul class="history">${opts}</ul>` : ''}
    ${trade}
    ${disclosure('stocks.board', '📋 The board', `<ul class="history">${board}</ul>`)}
    <p class="fine">Single stocks swing far more than an index: earnings beats and misses, manias that pop, the odd collapse. Option premiums run about ${Math.round(premiumRate('carewell') * 100)}–${Math.round(premiumRate('stratus') * 100)}% of the position, depending on how volatile the stock is.</p>`, { icon: '🏛️', accent: 'cyan', summary: v.total ? money(v.total) : '' });
}
