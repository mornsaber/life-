/**
 * Home tab: residence & lease, credit gauge, listings with financing,
 * property portfolio (mortgage, HELOC, costs, tenants, renovations).
 */
import { esc, money, button, card, chip, meter, kv, empty } from '../Components.js';
import { REGIONS } from '../../modules/life/Regions.js';
import {
  housingStatus, primaryHome, STATUS_LABEL, PROPERTY_TYPES, RENT_TIERS, tierRent, sellingCostRate, LOAN_TYPES, quote, creditBand, helocLimit,
  RENOVATIONS, carryingCosts, rentableUnits, diyFactor, marketRent,
} from '../../modules/realestate/index.js';

function creditGauge(score) {
  const pct = ((score - 300) / 550) * 100;
  const tone = score >= 740 ? 'good' : score >= 640 ? 'mid' : 'bad';
  return `<div class="credit">
    <div class="credit-score ${tone}">${score}</div>
    <div class="credit-meta"><b>${creditBand(score)}</b>${meter(pct, { tone, suffix: '' }).replace(/<b>.*?<\/b>/, '')}<small>300 ··· 580 ··· 670 ··· 740 ··· 850</small></div>
  </div>`;
}

function residence(state) {
  const status = housingStatus(state);
  const s = STATUS_LABEL[status];
  const h = state.housing;
  const regionId = state.character.regionId;
  const rentRows = Object.entries(RENT_TIERS).filter(([, t]) => !t.subsidized).map(([id, t]) => {
    const current = h.rental?.tier === id;
    return `<li class="region-row ${current ? 'here' : ''}"><span>${t.icon} <b>${t.name}</b></span><small>${money(tierRent(state, id, regionId))}/mo · deposit ${money(tierRent(state, id, regionId) * 2)}</small>
      ${current ? chip('Your lease', 'good') : button('Rent', 'housing.rent', { arg: id, variant: 'tiny', disabled: state.character.age < 18 || ['owner', 'military', 'employerProvided', 'incarcerated'].includes(status) })}</li>`;
  }).join('');
  return card('Where You Live', `
    <p class="big-status">${s.icon} <b>${s.label}</b> · ${esc(REGIONS[regionId].name)}</p>
    ${h.rental ? kv([['Rent', `${money(h.rental.rent)}/mo`], ['Housing', RENT_TIERS[h.rental.tier].name]]) : ''}
    ${status === 'homeless' ? `<p class="why">You've been homeless ${h.homelessYears} yr. Health, happiness and job performance suffer every year.</p>` : ''}
    ${status === 'military' ? '<p class="fine">Barracks or base housing — no rent while on active duty.</p>' : ''}
    ${status === 'employerProvided' ? '<p class="fine">Your employer provides housing (park quarters / embassy residence).</p>' : ''}
    <h4 class="sub">Rentals in ${esc(REGIONS[regionId].name)}</h4><ul class="history">${rentRows}</ul>
    <div class="row-end">${button('🛋️ Move in with parents', 'housing.moveInWithParents', { variant: 'small ghost', disabled: status === 'parents' || state.character.age >= 45 })}</div>`, { icon: '🏠', accent: 'cyan' });
}

function listings(state) {
  if (state.character.age < 18) return '';
  const rows = state.housing.listings.map((l) => {
    const t = PROPERTY_TYPES[l.type];
    const best = Object.keys(LOAN_TYPES).map((id) => [id, quote(state, l.price, id)]).find(([, q]) => q.ok);
    return `<li class="listing">
      <span class="listing-icon">${t.icon}</span>
      <div class="job-info"><b>${t.name}</b><small>${money(l.price)} · condition ${l.condition}/100${t.units > 1 ? ` · ${t.units} units (rents ~${money(marketRent(state, l.type, l.regionId))}/unit)` : ''}${t.hoa ? ` · HOA ${money(t.hoa)}/yr` : ''}</small>
        <small class="${best ? 'req' : 'why'}">${best ? `✓ Pre-approved: ${LOAN_TYPES[best[0]].name} ${(best[1].rate * 100).toFixed(2)}%, ${money(best[1].cashNeeded)} down+closing, ${money(Math.round((best[1].payment + best[1].mip) / 12))}/mo` : `✗ ${esc(quote(state, l.price, 'fha').reason)}`}</small></div>
      ${button('Make offer', 'housing.buy', { arg: l.id, variant: 'small' })}
    </li>`;
  }).join('');
  return card('Listings', `<p class="muted">Base mortgage rate ${(state.housing.rates.base * 100).toFixed(2)}% · economy in ${state.economy.phase}. Selling costs ${Math.round(sellingCostRate(state) * 100)}%${sellingCostRate(state) < 0.05 ? ' (you\'re a licensed agent)' : ''}.</p><ul class="job-board">${rows || '<li>No listings this year.</li>'}</ul>`, { icon: '🪧' });
}

function propertyCard(state, p) {
  const t = PROPERTY_TYPES[p.type];
  const m = p.mortgage;
  const costs = carryingCosts(p, state);
  const equity = p.value - (m?.balance ?? 0) - (p.heloc?.balance ?? 0);
  const units = rentableUnits(p);
  const reno = Object.entries(RENOVATIONS).map(([id, r]) => button(`${r.icon} ${r.name}`, 'housing.renovate', { arg: `${p.id}:${id}`, variant: 'tiny', hint: `${money(Math.round(p.value * r.costPct * diyFactor(state)))} → +${Math.round(r.valuePct * 100)}%` })).join('');
  const here = p.regionId === state.character.regionId;
  return card(`${t.name} · ${esc(REGIONS[p.regionId].name)}`, `
    <p>${chip(p.use === 'primary' ? '🏡 Your home' : p.use === 'rental' ? '🔑 Rental' : '🚪 Vacant', p.use === 'primary' ? 'good' : '')} ${chip(`Equity ${money(equity)}`, equity < 0 ? 'bad' : 'green')} ${p.floodInsured ? chip('🌊 Flood insured') : ''}</p>
    ${kv([
      ['Value', money(p.value)],
      ['Bought', `${money(p.purchasePrice)} at ${p.purchaseAge}`],
      ['Condition', `${p.condition}/100`],
      m ? ['Mortgage', `${money(m.balance)} @ ${(m.rate * 100).toFixed(2)}% (${LOAN_TYPES[m.type]?.name ?? m.type}, ${m.yearsLeft} yrs)`] : ['Mortgage', 'Paid off'],
      m ? ['Payment', `${money(Math.round((m.payment + m.mip) / 12))}/mo${m.mip ? ' incl. PMI/MIP' : ''}${m.delinquent ? ` · <span class="neg">${m.delinquent} yr delinquent</span>` : ''}`] : null,
      p.heloc ? ['HELOC', `${money(p.heloc.balance)} @ ${(p.heloc.rate * 100).toFixed(2)}%`] : null,
      ['Tax + insurance + HOA', `${money(costs.tax + costs.insurance + costs.hoa)}/yr`],
      units ? ['Tenants', `${p.tenants.length}/${units} units${p.lastRent ? ` · ${money(p.lastRent)} collected` : ''}`] : null,
    ])}
    <div class="toggle-row">
      ${here && p.use !== 'primary' ? button('🏡 Live here', 'housing.setUse', { arg: `${p.id}:primary`, variant: 'small' }) : ''}
      ${p.use !== 'rental' ? button('🔑 Rent it out', 'housing.setUse', { arg: `${p.id}:rental`, variant: 'small' }) : button('🚪 Leave vacant', 'housing.setUse', { arg: `${p.id}:vacant`, variant: 'small' })}
      ${button('🏦 Refinance', 'housing.refinance', { arg: p.id, variant: 'small', disabled: !m })}
      ${button(`💳 HELOC draw`, 'housing.heloc', { arg: p.id, variant: 'small', hint: `${money(helocLimit(p))} available`, disabled: helocLimit(p) < 5000 })}
      ${p.heloc ? button('Pay down HELOC', 'housing.repayHeloc', { arg: p.id, variant: 'small' }) : ''}
      ${button(p.floodInsured ? 'Drop flood insurance' : '🌊 Add flood insurance', 'housing.floodInsurance', { arg: p.id, variant: 'small' })}
      ${button('🪧 Sell', 'housing.sell', { arg: p.id, variant: 'small danger', hint: `≈${money(Math.round(p.value * (1 - sellingCostRate(state)) - (m?.balance ?? 0) - (p.heloc?.balance ?? 0)))} net` })}
      ${button('🔥 "Insurance fire"', 'housing.arson', { arg: p.id, variant: 'small danger', hint: 'Arson is a felony' })}
    </div>
    <h4 class="sub">Renovate (one project a year)</h4><div class="toggle-row">${reno}</div>`, { icon: t.icon, accent: p.use === 'primary' ? 'green' : '' });
}

export function homeView(state) {
  const h = state.housing;
  const rentals = h.properties.filter((p) => rentableUnits(p) > 0).length;
  return `${residence(state)}
    ${card('Credit', `${creditGauge(h.credit.score)}${kv([['On-time payments', h.credit.onTime], ['Derogatory marks', h.credit.events.length ? h.credit.events.map((e) => `${e.type} (age ${e.age})`).join(', ') : 'None']])}<p class="fine">Built from on-time rent and mortgage payments; hurt by late payments, evictions, foreclosures, bankruptcy and credit-card debt. Marks fade after 3–10 years.</p>`, { icon: '📊' })}
    ${listings(state)}
    ${h.properties.length ? `${rentals ? card('Landlording', `<p class="muted">${rentals} rental propert${rentals > 1 ? 'ies' : 'y'}.</p>${button(h.manager ? '🧑‍💼 Property manager: ON (10% of rents)' : '🧑‍💼 Hire a property manager', 'housing.toggleManager', { variant: h.manager ? 'small on' : 'small', hint: 'Handles tenants, evictions and vacancies' })}`, { icon: '🔑' }) : ''}${h.properties.map((p) => propertyCard(state, p)).join('')}` : card('Portfolio', empty('You don\'t own any property yet.'), { icon: '🏘️' })}`;
}
