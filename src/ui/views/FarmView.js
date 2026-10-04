/**
 * Farm tab: buy farmland, choose crops or cattle, crop insurance, and last
 * season's results (weather, prices, insurance, farm programs).
 */
import { esc, money, button, card, kv, empty } from '../Components.js';
import { CROPS, PLOTS, LAND_PRICE, COVERAGE, DOWN, buyCheck, landValue, landAvailable } from '../../modules/farm/Farm.js';
import { regionOf } from '../../modules/life/Regions.js';

function buyCard(state) {
  const f = state.farm;
  if (!landAvailable(state)) return card('Buy Farmland', empty(`There's no farmland for sale around ${esc(regionOf(state).name)}. Farm country: Iowa, Montana, Colorado, Texas Hill Country, central Ohio.`), { icon: '🌾' });
  const perAcre = f.acres ? f.valuePerAcre : LAND_PRICE[state.character.regionId];
  const rows = PLOTS.map((acres) => {
    const loan = buyCheck(state, acres, true);
    const cash = buyCheck(state, acres, false);
    return `<li class="fund-row"><span>🌾 <b>${acres} acres</b> <small>${money(acres * perAcre)} · ${money(acres * perAcre * DOWN)} down with a Farm Credit loan</small>${!loan.ok && !cash.ok ? `<small class="why">${esc(loan.reason)}</small>` : ''}</span>
      <span class="toggle-row">${button('🏦 Loan', 'farm.buy', { arg: `${acres}:loan`, variant: 'tiny', disabled: !loan.ok })}${button('💵 Cash', 'farm.buy', { arg: `${acres}:cash`, variant: 'tiny', disabled: !cash.ok })}</span></li>`;
  }).join('');
  return card(f.acres ? 'Buy More Land' : 'Buy Farmland', `<p class="muted">Land here runs about ${money(perAcre)} an acre. Farm Credit lends with ${DOWN * 100}% down over 20 years. Land is a farmer's real wealth — it usually appreciates even when the crops don't pay.</p><ul class="history">${rows}</ul>`, { icon: '🌾' });
}

function farmCard(state) {
  const f = state.farm;
  if (!f.acres) return '';
  const ly = f.lastYear;
  const crops = Object.entries(CROPS).map(([id, c]) => button(`${c.icon} ${c.name}`, 'farm.setCrop', { arg: id, variant: f.crop === id ? 'tiny on' : 'tiny', hint: `≈${money(c.revenue - c.cost)}/acre margin in a normal year · price ${Math.round((f.prices[id] ?? 1) * 100)}%` })).join('');
  const insurance = [['0', 'No insurance'], ['0.7', '70% coverage'], ['0.85', '85% coverage']].map(([lvl, label]) => button(label, 'farm.insurance', { arg: lvl, variant: (lvl === '0' ? !f.insured : f.insured && String(f.coverage) === lvl) ? 'tiny on' : 'tiny', hint: lvl === '0' ? 'Gamble on the weather' : `Premium ≈${COVERAGE[lvl] * 100}% of expected revenue` })).join('');
  const last = !ly ? '<p class="muted">Your first season comes at the end of the year.</p>' : ly.mode === 'rent' ? `<p>Cash rent: <b>${money(ly.rent)}</b> · property tax ${money(ly.tax)}</p>` : kv([
    ['Weather', esc(ly.weather)],
    ['Gross revenue', money(ly.revenue)],
    ['Costs', money(ly.costs)],
    ly.insurance ? ['Crop insurance', `${money(-ly.insurance)} premium${ly.indemnity ? ` · ${money(ly.indemnity)} paid out` : ''}`] : null,
    ly.programs ? ['Farm-program payments', money(ly.programs)] : null,
    ly.disasterAid ? ['Federal disaster aid', money(ly.disasterAid)] : null,
    ['Net', `<b class="${ly.net < 0 ? 'neg' : 'pos'}">${money(ly.net)}</b>`],
  ]);
  return card(`Your Farm — ${f.acres} acres`, `${kv([
    ['Land value', `${money(landValue(state))} (${money(f.valuePerAcre)}/acre)`],
    ['Farm Credit loan', f.loan ? `${money(f.loan.balance)} · ${money(f.loan.payment)}/yr` : 'Paid off'],
  ])}
    <h4 class="sub">Who works the land</h4><div class="toggle-row chips-row">${button('🚜 Farm it yourself', 'farm.setMode', { arg: 'operate', variant: f.mode === 'operate' ? 'tiny on' : 'tiny', hint: state.career.job ? 'You have a job: a custom operator takes 10%' : 'Weather and prices are your problem' })}${button('🤝 Cash-rent it to a neighbor', 'farm.setMode', { arg: 'rent', variant: f.mode === 'rent' ? 'tiny on' : 'tiny', hint: 'Steady ~3% of land value a year' })}</div>
    ${f.mode === 'operate' ? `<h4 class="sub">This season</h4><div class="toggle-row chips-row">${crops}</div><h4 class="sub">Crop insurance</h4><div class="toggle-row chips-row">${insurance}</div>` : ''}
    <h4 class="sub">Last season</h4>${last}
    <div class="toggle-row">${button('🪧 Sell the farm', 'farm.sell', { variant: 'small danger', hint: `≈${money(landValue(state) * 0.94)} after commissions` })}</div>`, { icon: '🚜', accent: 'green' });
}

export function farmView(state) {
  if (!state.farm) return '';
  if (state.character.age < 18) return card('Farm', empty('You can buy farmland at 18.'), { icon: '🚜' });
  return `${farmCard(state)}${buyCard(state)}`;
}
