/**
 * Farm tab: buy or lease land, lay out the four fields, run a herd, choose how
 * you farm (machinery, practices, organic, marketing), and see last season's
 * results with the country's farm-policy payments.
 */
import { esc, money, button, card, kv, empty, meter } from '../Components.js';
import { CROPS, LIVESTOCK, COVERAGE, DOWN, FIELDS, buyCheck, leaseCheck, landValue, landPrice, leaseRent, canFarmHere, area, plotsFor, cropsHere, farmCountry, farmedAcres, ensureFarm, workload, ownLabour, capacity, pastureAcres, buildCost, herdValue, countryOf } from '../../modules/farm/Farm.js';
import { regionOf } from '../../modules/life/Regions.js';

function landCard(state) {
  const f = state.farm;
  if (!canFarmHere(state)) return card('Farmland', empty(`There's no farmland around ${esc(regionOf(state).name)}. Farms are in the country — move to a rural area or a small town.`), { icon: '🌾' });
  const fc = farmCountry(state);
  const price = landPrice(state);
  const rent = leaseRent(state);
  const perAcre = f.acres ? f.valuePerAcre : price;
  const rows = plotsFor(state).map((acres) => {
    const loan = buyCheck(state, acres, true);
    const cash = buyCheck(state, acres, false);
    const lease = leaseCheck(state, acres);
    const why = !loan.ok && !cash.ok && !lease.ok ? (price ? loan.reason : lease.reason) : '';
    return `<li class="fund-row"><span>🌾 <b>${esc(area(state, acres))}</b> <small>${price && countryOf(state) !== 'CN' ? `${money(acres * perAcre)} · ${money(acres * perAcre * DOWN)} down` : ''}${rent ? `${price && countryOf(state) !== 'CN' ? ' · ' : ''}lease ${money(acres * rent)}/yr` : ''}</small>${why ? `<small class="why">${esc(why)}</small>` : ''}</span>
      <span class="toggle-row">${price && countryOf(state) !== 'CN' ? `${button('🏦 Loan', 'farm.buy', { arg: `${acres}:loan`, variant: 'tiny', disabled: !loan.ok })}${button('💵 Cash', 'farm.buy', { arg: `${acres}:cash`, variant: 'tiny', disabled: !cash.ok })}` : ''}${rent ? button('🤝 Lease', 'farm.lease', { arg: String(acres), variant: 'tiny', disabled: !lease.ok }) : ''}</span></li>`;
  }).join('');
  const intro = countryOf(state) === 'CN'
    ? `Rural land in China belongs to the village collective: you contract the land-use rights, about ${money(rent)} a mu a year.`
    : `Land here runs about ${money(perAcre)} an acre${rent ? `, or leases for about ${money(rent)} an acre a year` : ''}. ${fc.lender} lends with ${DOWN * 100}% down over 20 years. Owned land is a farmer's real wealth — it usually appreciates even when the crops don't pay.`;
  return card(f.acres || f.leased ? 'More Land' : 'Start a Farm', `<p class="muted">${esc(intro)}</p><ul class="history">${rows}</ul>${f.leased ? button(`Give up the leases (${area(state, f.leased)})`, 'farm.unlease', { variant: 'small ghost' }) : ''}`, { icon: '🌾' });
}

function fieldsCard(state) {
  const f = state.farm;
  const crops = cropsHere(state);
  const per = farmedAcres(f) / FIELDS;
  const rows = f.fields.map((field, i) => {
    const c = CROPS[field.crop];
    const status = field.establish ? ` · <small class="muted">${field.establish} yr until it bears</small>` : field.last === field.crop && !['perennial', 'forage'].includes(c.group) ? ` · <small class="why">same crop as last year</small>` : field.last && ['legume', 'forage'].includes(CROPS[field.last].group) && field.crop !== 'pasture' ? ' · <small class="pos">rotation bonus</small>' : '';
    const chips = crops.map((id) => button(`${CROPS[id].icon} ${CROPS[id].name}`, 'farm.setField', { arg: `${i}:${id}`, variant: field.crop === id ? 'tiny on' : 'tiny', hint: CROPS[id].establish ? `Planting ${money(per * CROPS[id].plant)}; ${CROPS[id].establish} years to bear` : id === 'pasture' ? 'Grazing for the herd' : `≈${money(CROPS[id].revenue - CROPS[id].cost)}/acre margin · price ${Math.round((f.prices[id] ?? 1) * 100)}%` })).join('');
    return `<h4 class="sub">Field ${i + 1} — ${esc(area(state, per))}: ${c.icon} ${esc(c.name)}${status}</h4><div class="toggle-row chips-row">${chips}</div>`;
  }).join('');
  return card('Fields', `<p class="fine">Rotate: a cereal after the same cereal loses about a tenth of its yield; after soybeans, hay or pasture it gains. Vineyards and orchards take years to bear.</p>
    ${kv([['Soil health', meter(f.soil, { label: `${f.soil}/100` })]])}
    <div class="toggle-row chips-row">${button('🔄 Rotate crops each year', 'farm.practice', { arg: 'rotate', variant: f.rotate ? 'tiny on' : 'tiny', hint: 'Each field takes the crop the field before it grew' })}</div>${rows}`, { icon: '🌱', summary: `${area(state, farmedAcres(f))} · soil ${f.soil}` });
}

function herdCard(state) {
  const f = state.farm;
  const kind = LIVESTOCK[f.herd.kind];
  const cap = capacity(state, f);
  const pasture = pastureAcres(f);
  const parlour = buildCost(f, 'parlour');
  return card('Livestock', `
    <div class="toggle-row chips-row">${Object.entries(LIVESTOCK).map(([id, l]) => button(`${l.icon} ${l.name}`, 'farm.herdKind', { arg: id, variant: f.herd.kind === id ? 'tiny on' : 'tiny', hint: `${money(l.value)} a head${f.herd.head && f.herd.kind !== id ? ' · sells your herd' : ''}` })).join('')}</div>
    ${kv([
      ['Herd', `${f.herd.head} ${esc(kind.name.toLowerCase())} · worth ${money(herdValue(f))}`],
      ['Pasture', pasture ? `${esc(area(state, pasture))} — carries about ${cap} head${f.herd.head > cap ? ' <small class="why">overstocked: you\'ll buy feed</small>' : ''}${f.herd.head ? '' : ' <small class="muted">· let to a neighbour for grazing until you stock it</small>'}` : '<span class="why">No field in pasture</span>'],
      kind.parlour ? ['Milking parlour', f.parlour ? `${f.parlour} cows` : '<span class="why">None — dairy cows need one</span>'] : null,
    ])}
    <div class="toggle-row">${[10, 50].map((n) => button(`＋${n}`, 'farm.stock', { arg: `+${n}`, variant: 'tiny', hint: money(n * kind.value), disabled: !pasture || (kind.parlour && f.herd.head + n > f.parlour) })).join('')}${[10, 50].map((n) => button(`－${n}`, 'farm.stock', { arg: `-${n}`, variant: 'tiny', disabled: f.herd.head < 1 })).join('')}
    ${parlour ? button(`🥛 ${f.parlour ? 'Expand' : 'Build'} the parlour`, 'farm.build', { arg: 'parlour', variant: 'tiny', hint: money(parlour), disabled: state.finances.cash < parlour }) : ''}</div>`, { icon: kind.icon, summary: `${f.herd.head} head` });
}

function runningCard(state) {
  const f = state.farm;
  const fc = farmCountry(state);
  const work = workload(f);
  const mine = ownLabour(state);
  const machinery = buildCost(f, 'machinery');
  const subsidized = fc.insurance === 'subsidized';
  const levels = subsidized ? [['0', 'No insurance'], ['0.7', '70% coverage'], ['0.85', '85% coverage']] : [['0', 'No insurance'], ['0.7', 'Hail & storm cover']];
  const insurance = levels.map(([lvl, label]) => button(label, 'farm.insurance', { arg: lvl, variant: (lvl === '0' ? !f.insured : f.insured && String(f.coverage) === lvl) ? 'tiny on' : 'tiny', hint: lvl === '0' ? 'Gamble on the weather' : subsidized ? `Premium ≈${COVERAGE[lvl] * 100}% of expected revenue (subsidized)` : 'Private cover: pays on disasters only, ≈6% premium' })).join('');
  const p = f.practices;
  const organic = p.organic == null ? 'Conventional' : state.character.age - p.organic < 3 ? `In conversion (${3 - (state.character.age - p.organic)} yr to go)` : 'Certified organic';
  return card('Running the Farm', `
    ${kv([
      ['Work', `${work} full-time ${work === 1 ? 'person' : 'people'} · you cover ${mine}${work > mine ? ` · hired help ≈${money((work - mine) * 42000)}/yr` : ''}`],
      ['Machinery', f.machinery ? `Your own line, worth ${money(f.machinery.value)}` : 'Contractors (≈$55 an acre; sometimes late)'],
      ['Grain', f.bins ? `Bins on the farm${f.stored ? ` · ${money(f.stored)} stored at today's price` : ''}` : 'No storage'],
      ['Organic', organic],
    ])}
    <div class="toggle-row">${machinery ? button('🚜 Buy machinery', 'farm.build', { arg: 'machinery', variant: 'tiny', hint: money(machinery), disabled: state.finances.cash < machinery }) : button('Sell the machinery', 'farm.sellMachinery', { variant: 'tiny ghost', hint: money(f.machinery.value * 0.85) })}
    ${!f.bins ? button('🛢️ Grain bins', 'farm.build', { arg: 'bins', variant: 'tiny', hint: money(buildCost(f, 'bins')), disabled: state.finances.cash < buildCost(f, 'bins') }) : ''}
    ${!f.extras.shop ? button('🧺 Farm shop', 'farm.build', { arg: 'shop', variant: 'tiny', hint: money(buildCost(f, 'shop')), disabled: state.finances.cash < buildCost(f, 'shop') }) : ''}</div>
    <h4 class="sub">Practices</h4><div class="toggle-row chips-row">
      ${button('🌱 Cover crops', 'farm.practice', { arg: 'cover', variant: p.cover ? 'tiny on' : 'tiny', hint: '+$30/acre; builds soil' })}
      ${button('🚫 No-till', 'farm.practice', { arg: 'noTill', variant: p.noTill ? 'tiny on' : 'tiny', hint: 'Cheaper; builds soil' })}
      ${button('🍃 Organic', 'farm.practice', { arg: 'organic', variant: p.organic != null ? 'tiny on' : 'tiny', hint: '−20% yields, +40% prices once certified' })}</div>
    <h4 class="sub">Selling the crop</h4><div class="toggle-row chips-row">
      ${button('At harvest', 'farm.marketing', { arg: 'harvest', variant: f.marketing === 'harvest' ? 'tiny on' : 'tiny', hint: 'Whatever the price is' })}
      ${button('Store half', 'farm.marketing', { arg: 'store', variant: f.marketing === 'store' ? 'tiny on' : 'tiny', disabled: !f.bins, hint: 'Sell next year at next year\'s price' })}
      ${button('Forward-contract half', 'farm.marketing', { arg: 'forward', variant: f.marketing === 'forward' ? 'tiny on' : 'tiny', hint: 'Lock in today\'s price before the season' })}</div>
    <h4 class="sub">Crop insurance</h4><div class="toggle-row chips-row">${insurance}</div>`, { icon: '🛠️' });
}

function farmCard(state) {
  const f = state.farm;
  const ly = f.lastYear;
  const last = !ly ? '<p class="muted">Your first season comes at the end of the year.</p>' : ly.mode === 'rent' ? `<p>Cash rent: <b>${money(ly.rent)}</b> · property tax ${money(ly.tax)}</p>` : kv([
    ['Weather', esc(ly.weather)],
    ['Gross revenue', `${money(ly.revenue)}${ly.storedSale ? ` <small class="muted">incl. ${money(ly.storedSale)} of stored grain</small>` : ''}`],
    ly.grazing ? ['Grazing rent', money(ly.grazing)] : null,
    ['Costs', `${money(ly.costs)}${ly.wages ? ` <small class="muted">· hired help ${money(ly.wages)}</small>` : ''}${ly.feed ? ` <small class="muted">· feed ${money(ly.feed)}</small>` : ''}`],
    ly.insurance ? ['Crop insurance', `${money(-ly.insurance)} premium${ly.indemnity ? ` · ${money(ly.indemnity)} paid out` : ''}`] : null,
    ...(ly.lines ?? []).map((l) => [esc(l.label), money(l.amount)]),
    ['Net', `<b class="${ly.net < 0 ? 'neg' : 'pos'}">${money(ly.net)}</b>`],
  ]);
  const solar = f.extras.solar;
  return card(`Your Farm — ${area(state, f.acres + f.leased)}`, `${kv([
    f.acres ? ['Land you own', `${esc(area(state, f.acres))} · ${money(landValue(state))}`] : null,
    f.leased ? ['Leased in', esc(area(state, f.leased))] : null,
    solar ? ['Solar lease', `${esc(area(state, solar.acres))} · ${money(solar.rent)}/yr until age ${solar.until}`] : null,
    f.acres ? [`${esc(farmCountry(state).lender)} loan`, f.loan ? `${money(f.loan.balance)} · ${money(f.loan.payment)}/yr` : 'Paid off'] : null,
  ])}
    ${f.acres ? `<h4 class="sub">Who works the land</h4><div class="toggle-row chips-row">${button('🚜 Farm it yourself', 'farm.setMode', { arg: 'operate', variant: f.mode === 'operate' ? 'tiny on' : 'tiny', hint: 'Weather, prices and work are yours' })}${button('🤝 Cash-rent it out', 'farm.setMode', { arg: 'rent', variant: f.mode === 'rent' ? 'tiny on' : 'tiny', hint: 'Steady ~3% of land value a year' })}</div>` : ''}
    <h4 class="sub">Last season</h4>${last}
    <div class="toggle-row">${button('🪧 Sell up', 'farm.sell', { variant: 'small danger', hint: f.acres ? `≈${money(landValue(state) * 0.94)} for the land` : 'Give up the leases' })}</div>`, { icon: '🚜', accent: 'green' });
}

export function farmView(state) {
  if (!state.farm) return '';
  if (state.character.age < 18) return card('Farm', empty('You can buy or lease farmland at 18.'), { icon: '🚜' });
  const f = ensureFarm(state.farm);
  if (!f.acres && !f.leased) return landCard(state);
  return `${farmCard(state)}${f.mode === 'operate' ? `${fieldsCard(state)}${herdCard(state)}${runningCard(state)}` : ''}${landCard(state)}`;
}
