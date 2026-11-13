/**
 * Money tab: "Money of <year>": the money of the day, this year's inflation against the decade's,
 * a crash or hyperinflation where you live, and what things cost then (economy/MoneyOfTheDay.js).
 */
import { esc, card, chip, money } from '../Components.js';
import { yearNow, PRESENT, periodCurrency } from '../../modules/world/Eras.js';
import { COUNTRIES } from '../../modules/world/Countries.js';
import { BASKET, priceThen, decadeInflation, hyperHere, livingStandard } from '../../modules/economy/MoneyOfTheDay.js';

const pct = (x) => `${x >= 0 ? '' : '−'}${Math.abs(Math.round(x * 1000) / 10)}%`;
const dollarsThen = (n) => (n >= 100 ? `$${Math.round(n).toLocaleString()}` : n >= 1 ? `$${n.toFixed(2)}` : `${Math.max(1, Math.round(n * 100))}¢`);

export function moneyDayCard(state) {
  const y = yearNow(state);
  const e = state.economy;
  if (!state.era || y >= PRESENT || !e) return '';
  const cc = state.character.countryId ?? 'US';
  const c = COUNTRIES[cc];
  const cur = c?.currency ? periodCurrency(cc, c.currency) : null;
  const us = cc === 'US';
  const hyper = hyperHere(state);
  const rate = e.periodInflation ?? e.inflation;
  const rows = BASKET.map((item) => {
    const p = priceThen(state, item);
    if (!p) return '';
    return `<tr><td>${item.icon} ${esc(item.label)}</td><td>${us ? dollarsThen(p.ofTheDay) : money(p.real)}</td>${us ? `<td class="muted">${money(p.real)}</td>` : ''}</tr>`;
  }).join('');
  // How far a working wage went, against today (the wage's own elasticity in the basket).
  const standard = livingStandard(state) ** 0.55;
  return card(`Money of ${y}`, `
    ${hyper ? `<p class="why">🔥 Hyperinflation: the ${esc(hyper.money)} is collapsing. ${esc(hyper.text)}</p>` : ''}
    <p>${cur?.name ? `The money is the <b>${esc(cur.name)}</b>. ` : ''}Prices ${rate < 0 && !hyper ? 'fell' : 'rose'} ${chip(hyper ? 'out of all measure' : pct(Math.abs(rate)), rate >= 0.08 || hyper ? 'bad' : rate < 0 ? 'mid' : '')} this year; ${decadeInflation(state) < 0 ? `prices usually fell about ${pct(-decadeInflation(state))} a year` : `about ${pct(decadeInflation(state))} a year is usual`} for the decade here.</p>
    <table class="kv-table"><thead><tr><th></th><th>${us ? `In ${y} dollars` : 'Price'}</th>${us ? '<th>In today\'s money</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>
    <p class="fine">${standard < 0.9 ? `A wage here goes about ${Math.round(standard * 100)}% as far as it does today: food and rent take most of it, and ${yearNow(state) < 1900 ? 'a piano or a good coat' : yearNow(state) < 1925 ? 'a bicycle or a gramophone' : 'a car or a radio'} is a luxury.` : 'A wage here goes about as far as it does today.'}</p>`, { icon: '🪙', accent: hyper ? 'red' : rate >= 0.08 ? 'yellow' : '' });
}
