/**
 * Garage tab: what you drive, sail and fly — loans, leases, insurance on
 * your driving record — and the showroom.
 */
import { MODES, transitQuality, modeAvailable, resolvedMode, passCost, rideshareCost, commutes } from '../../modules/transit/Transit.js';
import { regionOf } from '../../modules/life/Regions.js';
import { esc, money, button, card, kv, chip } from '../Components.js';
import { VEHICLE_TYPES, CATEGORIES, vehiclesOf, typeOf, premiumFor, riskMultiplier, purchaseCheck, autoRate, loanPayment, leasePayment } from '../../modules/vehicles/Vehicles.js';
import { hasCredential } from '../../modules/credentials/LicensingEngine.js';

function ownedCard(state) {
  const list = vehiclesOf(state);
  const r = state.vehicles.record;
  const rows = list.map((v) => {
    const t = typeOf(v);
    const terms = v.loan ? `loan ${money(v.loan.balance)} left · ${money(v.loan.payment)}/yr · ${v.loan.yearsLeft} yr` : v.lease ? `lease ${money(v.lease.payment)}/yr · ${v.lease.yearsLeft} yr left` : 'owned outright';
    const underwater = v.loan && v.loan.balance > v.value ? ` ${chip('underwater', 'bad')}` : '';
    return `<li class="fund-row"><span>${t.icon} <b>${esc(t.name)}</b> <small>${v.lease ? 'leased' : `worth ${money(v.value)}`} · ${terms} · ${v.insured ? `insured ${money(premiumFor(state, v))}/yr` : '<span class="neg">uninsured</span>'} · upkeep ${money(t.upkeep)}/yr</small>${underwater}</span>
      ${v.loan ? button('Pay off', 'vehicles.payoff', { arg: v.id, variant: 'tiny', hint: money(v.loan.balance) }) : ''}
      ${button(v.insured ? 'Drop insurance' : 'Insure', 'vehicles.toggleInsurance', { arg: v.id, variant: 'tiny ghost' })}
      ${button(v.lease ? 'End lease' : 'Sell', 'vehicles.sell', { arg: v.id, variant: 'tiny danger' })}</li>`;
  }).join('');
  return card('Your Vehicles', `
    ${kv([
      ['Driving record', `${r.points} point${r.points === 1 ? '' : 's'} · ${r.accidents.filter((a) => state.character.age - a < 5).length} at-fault accident(s) in 5 yr`],
      ['Insurance rating', `×${riskMultiplier(state).toFixed(2)} of base`],
      state.vehicles.repos.length ? ['Repossessions', `<span class="neg">${state.vehicles.repos.length}</span>`] : null,
    ])}
    ${rows ? `<ul class="history">${rows}</ul>` : '<p class="muted">No vehicles. You get around by bus, bike and favors.</p>'}
    <div class="toggle-row">${button('🚦 Defensive driving course', 'vehicles.trafficSchool', { variant: 'small', disabled: !r.points || Boolean(state.yearly['vehicles.school']), hint: '$150 · −2 points' })}</div>
    <p class="fine">Points, at-fault accidents and DUIs raise your premiums for years. Lenders require full coverage, and repossess when you fall far behind — you still owe what the auction doesn't cover.</p>`, { icon: '🚗', accent: 'cyan' });
}

function showroom(state) {
  const groups = {};
  for (const [id, t] of Object.entries(VEHICLE_TYPES)) (groups[t.category] ??= []).push([id, t]);
  const rows = Object.entries(groups).map(([cat, list]) => `<h4 class="sub">${esc(CATEGORIES[cat])}</h4><ul class="history">${list.map(([id, t]) => {
    const how = (h) => purchaseCheck(state, id, h);
    const cash = how('cash');
    const loan = how('loan');
    const lease = t.lease ? how('lease') : null;
    const needs = t.license && !hasCredential(state, t.license) ? ` ${chip(`needs ${t.license === 'privatePilot' ? 'pilot license' : t.license === 'motorcycle' ? 'motorcycle endorsement' : "driver's license"}`, 'warn')}` : '';
    return `<li class="fund-row"><span>${t.icon} <b>${esc(t.name)}</b> <small>${money(t.price)} · ins. ≈${money(t.insurance)}/yr · upkeep ${money(t.upkeep)}/yr${t.fun ? ' · fun' : ''}</small>${needs}</span>
      ${button('Cash', 'vehicles.buy', { arg: `${id}:cash`, variant: 'tiny', disabled: !cash.ok, title: cash.reason ?? '' })}
      ${button('Finance', 'vehicles.buy', { arg: `${id}:loan`, variant: 'tiny', disabled: !loan.ok, title: loan.reason ?? '', hint: loan.ok ? `${money(loanPayment(t.price * 0.9, autoRate(state, t.used), 5))}/yr` : '' })}
      ${lease ? button('Lease', 'vehicles.buy', { arg: `${id}:lease`, variant: 'tiny', disabled: !lease.ok, title: lease.reason ?? '', hint: lease.ok ? `${money(leasePayment(state, t).payment)}/yr` : '' }) : ''}</li>`;
  }).join('')}</ul>`).join('');
  return card('Showroom', `${rows}<p class="fine">Loans: 10% down over 5 years at a rate set by your credit score. Leases: 3 years, then turn it in or buy it out.</p>`, { icon: '🏪' });
}

export function garageView(state) {
  if (!state.vehicles) return '';
  return `${commuteCard(state)}${ownedCard(state)}${state.character.age >= 16 ? showroom(state) : ''}`;
}

/** How you get to work or school, and what it costs. */
function commuteCard(state) {
  if (!state.transit || state.character.age < 14) return '';
  const q = transitQuality(state);
  const region = regionOf(state);
  const mode = state.transit.mode ?? 'auto';
  const resolved = resolvedMode(state);
  const last = state.transit.last;
  const buttons = [['auto', '🔄 Automatic', 'Car if you have one, then transit, then walking']].concat(Object.entries(MODES).map(([id, m]) => {
    const check = modeAvailable(state, id);
    const cost = id === 'transit' ? `${money(passCost(state))}/yr pass` : id === 'rideshare' ? `≈${money(rideshareCost(state))}/yr` : id === 'drive' ? 'Your car costs' : 'Free';
    return [id, `${m.icon} ${m.label}`, check.ok ? cost : check.reason, !check.ok];
  })).map(([id, label, hint, disabled]) => button(label, 'transit.setMode', { arg: id, variant: mode === id ? 'tiny on' : 'tiny', hint, disabled })).join('');
  const quality = q >= 70 ? 'Excellent — frequent rail and buses' : q >= 40 ? 'Decent — buses and some rail' : q >= 15 ? 'Limited — infrequent buses' : 'None to speak of';
  return card('Commute', `${kv([
    ['Transit here', `${quality} (${q}/100)`],
    ['Monthly pass', region.fare ? money(region.fare) : '—'],
    ['Getting around', !commutes(state) ? 'Not commuting this year' : resolved === 'stranded' ? '<span class="neg">No way to get to work — buy a car or move somewhere with transit</span>' : `${MODES[resolved].icon} ${MODES[resolved].label}`],
    last?.cost ? ['Last year', money(last.cost)] : null,
  ])}
    <div class="toggle-row chips-row">${buttons}</div>
    <p class="fine">Reliable transit lets you read on the way; unreliable transit makes you late. Large employers offer pre-tax commuter benefits; seniors and students ride half fare.</p>`, { icon: '🚇' });
}
