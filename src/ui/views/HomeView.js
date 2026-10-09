/**
 * Home tab: residence & lease, credit gauge, listings with financing,
 * property portfolio (mortgage, HELOC, costs, tenants, renovations).
 */
import { esc, money, button, card, chip, meter, kv, empty } from '../Components.js';
import { REGIONS } from '../../modules/life/Regions.js';
import {
  housingStatus, primaryHome, STATUS_LABEL, PROPERTY_TYPES, RENT_TIERS, tierRent, sellingCostRate, LOAN_TYPES, quote, creditBand, helocLimit,
  RENOVATIONS, carryingCosts, rentableUnits, diyFactor, marketRent, loansFor, expectedNoi, isLand, isResidential, ZONING, buildQuote, demolitionQuote,
  ownBuilder, canDiy, REZONE_COST, SUBDIVIDE_LOTS,
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
    const noi = expectedNoi(state, l.type, l.regionId, l.price);
    const quotes = loansFor(l.type).map((id) => [id, quote(state, l.price, id, { noi })]);
    const best = quotes.find(([, q]) => q.ok);
    return `<li class="listing">
      <span class="listing-icon">${t.icon}</span>
      <div class="job-info"><b>${t.name}</b><small>${money(l.price)}${isLand(l.type) ? ` · zoned for ${esc(ZONING[l.type].map((id) => PROPERTY_TYPES[id].name.split(' (')[0].toLowerCase()).join(', '))}` : ` · condition ${l.condition}/100`}${t.units > 1 ? ` · ${t.units} ${t.kind === 'commercial' ? 'leasable spaces' : 'units'} (~${money(marketRent(state, l.type, l.regionId))}/mo each${noi ? `, NOI ≈${money(noi)}/yr` : ''})` : ''}${t.vacation ? ' · short-term rental or getaway' : ''}${t.hoa ? ` · HOA ${money(t.hoa)}/yr` : ''}</small>
        <small class="${best ? 'req' : 'why'}">${best ? `✓ Pre-approved: ${LOAN_TYPES[best[0]].name} ${(best[1].rate * 100).toFixed(2)}%, ${money(best[1].cashNeeded)} down+closing, ${money(Math.round((best[1].payment + best[1].mip) / 12))}/mo` : `✗ ${esc(quotes.at(-1)[1].reason)}`}</small></div>
      ${button('Make offer', 'housing.buy', { arg: l.id, variant: 'small' })}
    </li>`;
  }).join('');
  return card('Listings', `<p class="fine">Five homes and three investment properties come up each year: apartment buildings and commercial property (commercial loans need 25% down and rents that cover the payment 1.25×) and land to build on.</p><p class="muted">Base mortgage rate ${(state.housing.rates.base * 100).toFixed(2)}% · economy in ${state.economy.phase}. Selling costs ${Math.round(sellingCostRate(state) * 100)}%${sellingCostRate(state) < 0.05 ? ' (you\'re a licensed agent)' : ''}.</p><ul class="job-board">${rows || '<li>No listings this year.</li>'}</ul>`, { icon: '🪧' });
}

const USE_CHIP = { primary: ['🏡 Your home', 'good'], rental: ['🔑 Rental', ''], vacant: ['🚪 Vacant', ''], vacation: ['🏖️ Your getaway', 'good'] };

/** Build options on land you own. */
function buildSection(state, p) {
  if (p.project) {
    const pr = p.project;
    const def = PROPERTY_TYPES[pr.target];
    return `<h4 class="sub">🏗️ Under construction: ${esc(def.name)}</h4>${kv([
      ['Budget', `${money(pr.cost)} · ${money(pr.paid)} spent`],
      ['Finish', `${pr.yearsLeft} more year${pr.yearsLeft === 1 ? '' : 's'}${pr.stalled ? ` · <span class="neg">stalled ${pr.stalled} yr</span>` : ''}`],
      pr.loan ? ['Construction loan', `${money(pr.loan.balance)} @ ${(pr.loan.rate * 100).toFixed(2)}% (interest only)`] : null,
      ['Builder', pr.contractor === 'own' ? 'Your own company (at cost)' : pr.contractor === 'diy' ? 'You (owner-builder)' : 'General contractor'],
    ])}`;
  }
  const rows = (ZONING[p.type] ?? []).map((target) => {
    const contractors = ['gc', ...(ownBuilder(state, target) ? ['own'] : []), ...(canDiy(state, target) ? ['diy'] : [])];
    const q = buildQuote(state, p, target, contractors.at(-1));
    const gc = buildQuote(state, p, target, 'gc');
    if (!gc.ok) return '';
    const t = PROPERTY_TYPES[target];
    const label = { gc: 'Hire a GC', own: `Your company`, diy: 'Build it yourself' };
    const btns = contractors.flatMap((c) => {
      const cq = buildQuote(state, p, target, c);
      return ['cash', 'loan'].map((f) => button(`${label[c]} · ${f === 'cash' ? 'cash' : '75% loan'}`, 'housing.build', { arg: `${p.id}:${target}:${c}:${f}`, variant: 'tiny', hint: `${money(cq.cost)} over ${cq.years} yr` }));
    }).join('');
    return `<li class="fund-row"><span>${t.icon} <b>${esc(t.name)}</b> <small>≈${money(gc.cost)} + ${money(gc.permits)} permits · ${gc.years} yr · worth ≈${money(gc.finished)} done · <span class="${q.profit >= 0 ? 'pos' : 'neg'}">${q.profit >= 0 ? '+' : ''}${money(q.profit)}</span> vs. land and costs</small></span>${btns}</li>`;
  }).join('');
  const extra = [
    p.type === 'acreage' ? button(`📐 Subdivide into ${SUBDIVIDE_LOTS} lots`, 'housing.subdivide', { arg: p.id, variant: 'small', hint: `≈${money(60000 * REGIONS[p.regionId].col)} roads & utilities` }) : '',
    p.type === 'lot' && !p.rezoneTried ? button('📜 Petition to rezone commercial', 'housing.rezone', { arg: p.id, variant: 'small', hint: `${money(REZONE_COST)} · long odds` }) : '',
  ].join('');
  return `<h4 class="sub">Build on it</h4><ul class="history">${rows}</ul>${extra ? `<div class="toggle-row">${extra}</div>` : ''}
    <p class="fine">Construction costs follow local wages; finished buildings sell at local prices — building pays best where land is dear and in a boom. Expect overruns and delays. A construction loan covers 75% of each draw and becomes your mortgage when it's done.</p>`;
}

function tenantList(p) {
  if (!p.tenants?.length) return '';
  return `<ul class="history">${p.tenants.map((t) => `<li>${t.business ? '🏪' : t.personId ? '👪' : '🔑'} ${esc(t.name)} <small>${money(t.rent)}/mo${t.yearsLeft ? ` · ${t.yearsLeft} yr left on lease` : ''}${t.personId ? ' · family rate' : ''}</small></li>`).join('')}</ul>`;
}

function propertyCard(state, p) {
  const t = PROPERTY_TYPES[p.type];
  const m = p.mortgage;
  const costs = carryingCosts(p, state);
  const owedProject = p.project?.loan?.balance ?? 0;
  const equity = p.value - (m?.balance ?? 0) - (p.heloc?.balance ?? 0) - owedProject;
  const units = rentableUnits(p);
  const land = isLand(p.type);
  const building = !land && !p.project;
  const reno = building ? Object.entries(RENOVATIONS).map(([id, r]) => button(`${r.icon} ${r.name}`, 'housing.renovate', { arg: `${p.id}:${id}`, variant: 'tiny', hint: `${money(Math.round(p.value * r.costPct * diyFactor(state)))} → +${Math.round(r.valuePct * 100)}%` })).join('') : '';
  const here = p.regionId === state.character.regionId;
  const demo = building ? demolitionQuote(state, p) : null;
  const [useLabel, useTone] = p.project ? ['🏗️ Construction site', 'warn'] : land ? ['🟫 Land', ''] : USE_CHIP[p.use] ?? USE_CHIP.vacant;
  const uses = !building ? '' : [
    here && p.use !== 'primary' && isResidential(p.type) ? button('🏡 Live here', 'housing.setUse', { arg: `${p.id}:primary`, variant: 'small' }) : '',
    t.vacation && p.use !== 'vacation' ? button('🏖️ Keep it as a getaway', 'housing.setUse', { arg: `${p.id}:vacation`, variant: 'small', hint: 'Happiness every year' }) : '',
    p.use !== 'rental' ? button(t.vacation ? '🔑 Short-term rental' : t.kind === 'commercial' ? '🏪 Lease it out' : '🔑 Rent it out', 'housing.setUse', { arg: `${p.id}:rental`, variant: 'small' }) : button('🚪 Leave vacant', 'housing.setUse', { arg: `${p.id}:vacant`, variant: 'small' }),
  ].join('');
  return card(`${t.name} · ${esc(REGIONS[p.regionId].name)}`, `
    <p>${chip(useLabel, useTone)} ${chip(`Equity ${money(equity)}`, equity < 0 ? 'bad' : 'green')} ${p.floodInsured ? chip('🌊 Flood insured') : ''}${p.builtAge ? ` ${chip(`Built ${p.builtAge}`, 'green')}` : ''}</p>
    ${kv([
      ['Value', money(p.value)],
      ['Bought', `${money(p.purchasePrice)} all-in · since ${p.purchaseAge}`],
      land || p.project ? null : ['Condition', `${p.condition}/100`],
      m ? ['Mortgage', `${money(m.balance)} @ ${(m.rate * 100).toFixed(2)}% (${LOAN_TYPES[m.type]?.name ?? m.type}, ${m.yearsLeft} yrs)`] : ['Mortgage', 'Paid off'],
      m ? ['Payment', `${money(Math.round((m.payment + m.mip) / 12))}/mo${m.mip ? ' incl. PMI/MIP' : ''}${m.delinquent ? ` · <span class="neg">${m.delinquent} yr delinquent</span>` : ''}`] : null,
      p.heloc ? ['HELOC', `${money(p.heloc.balance)} @ ${(p.heloc.rate * 100).toFixed(2)}%`] : null,
      [land ? 'Property tax' : 'Tax + insurance + HOA', `${money(costs.tax + costs.insurance + costs.hoa)}/yr${t.kind === 'commercial' ? ' (tenants reimburse their share)' : ''}`],
      units ? ['Tenants', `${p.tenants.length}/${units} ${t.kind === 'commercial' ? 'spaces leased' : 'units'}${p.lastRent ? ` · ${money(p.lastRent)} collected` : ''}`] : null,
      t.vacation && p.use === 'rental' && p.occupancy ? ['Bookings', `${p.occupancy}% occupancy · ${money(p.lastRent ?? 0)} gross`] : null,
    ])}
    ${tenantList(p)}
    <div class="toggle-row">
      ${uses}
      ${button('🏦 Refinance', 'housing.refinance', { arg: p.id, variant: 'small', disabled: !m })}
      ${building ? button(`💳 HELOC draw`, 'housing.heloc', { arg: p.id, variant: 'small', hint: `${money(helocLimit(p))} available`, disabled: helocLimit(p) < 5000 }) : ''}
      ${p.heloc ? button('Pay down HELOC', 'housing.repayHeloc', { arg: p.id, variant: 'small' }) : ''}
      ${building ? button(p.floodInsured ? 'Drop flood insurance' : '🌊 Add flood insurance', 'housing.floodInsurance', { arg: p.id, variant: 'small' }) : ''}
      ${demo?.ok ? button('🧨 Tear it down', 'housing.demolish', { arg: p.id, variant: 'small danger', hint: `${money(demo.cost + demo.buyouts)}${demo.buyouts ? ' incl. tenant buyouts' : ''} → ${PROPERTY_TYPES[demo.lot].name.toLowerCase()}${demo.own ? ' · your crews' : ''}` }) : ''}
      ${button('🪧 Sell', 'housing.sell', { arg: p.id, variant: 'small danger', hint: `≈${money(Math.round(p.value * (1 - sellingCostRate(state)) - (m?.balance ?? 0) - (p.heloc?.balance ?? 0) - owedProject))} net` })}
      ${building ? button('🔥 "Insurance fire"', 'housing.arson', { arg: p.id, variant: 'small danger', hint: 'Arson is a felony' }) : ''}
    </div>
    ${land || p.project ? buildSection(state, p) : `<h4 class="sub">Renovate (one project a year)</h4><div class="toggle-row">${reno}</div>`}`, { icon: t.icon, accent: p.use === 'primary' ? 'green' : '' });
}

export function homeView(state) {
  const h = state.housing;
  const rentals = h.properties.filter((p) => rentableUnits(p) > 0).length;
  const worth = h.properties.reduce((n, p) => n + p.value, 0);
  return `${residence(state)}
    ${card('Credit', `${creditGauge(h.credit.score)}${kv([['On-time payments', h.credit.onTime], ['Derogatory marks', h.credit.events.length ? h.credit.events.map((e) => `${e.type} (age ${e.age})`).join(', ') : 'None']])}<p class="fine">Built from on-time rent and mortgage payments; hurt by late payments, evictions, foreclosures, bankruptcy and credit-card debt. Marks fade after 3–10 years.</p>`, { icon: '📊' })}
    ${listings(state)}
    ${h.properties.length ? `${rentals ? card('Landlording', `<p class="muted">${rentals} rental propert${rentals > 1 ? 'ies' : 'y'}.</p>${button(h.manager ? '🧑‍💼 Property manager: ON (10% of rents)' : '🧑‍💼 Hire a property manager', 'housing.toggleManager', { variant: h.manager ? 'small on' : 'small', hint: 'Handles tenants, evictions and vacancies' })}`, { icon: '🔑' }) : ''}${h.properties.map((p) => propertyCard(state, p)).join('')}` : card('Portfolio', empty('You don\'t own any property yet.'), { icon: '🏘️' })}
    ${h.properties.length > 1 ? `<p class="fine">Portfolio: ${h.properties.length} properties worth ${money(worth)}.</p>` : ''}`;
}
