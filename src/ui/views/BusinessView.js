/**
 * Business tab: start or buy a business, then run it — P&L, staff and
 * delegation, benefits, marketing, funding (SBA, venture rounds), valuation
 * and exits.
 */
import { esc, money, button, card, chip, kv, meter, select, empty, disclosure } from '../Components.js';
import { OPERATIONS, opsOf, capacity, contracted, offerEligibility, resaleValue, EQUIPMENT_LOAN } from '../../modules/business/Operations.js';
import { BUSINESS_TYPES, BUSINESS_GROUPS, ENTITIES, MARKETING, ROUNDS, SBA, SIZE_OPTIONS, sizesFor, startupCostFor, businessesFor } from '../../modules/business/BusinessTypes.js';
import { ownershipRules } from '../../modules/business/OwnershipRules.js';
import { ventureBacked, maxScale, expansionCost } from '../../modules/business/BusinessEngine.js';
import { STRATEGIES, canDelegate } from '../../modules/business/GrowthPlan.js';
import { BUSINESS_LICENSES, licensesFor, requiredLicenses, openingLicenseFees, licenseEligibility } from '../../modules/business/BusinessLicenses.js';
import { forecast, businessAdvice } from '../../modules/business/Advisor.js';
import { PRICE_LEVELS, PAY_LEVELS, SUPPLIERS, OWNER_DECISIONS, acquisitionPrice, relocationCost } from '../../modules/business/OwnerActions.js';
import { businessOrg, businessRoster, ownerPosition, competitorsOf, TIERS } from '../../modules/org/Businesses.js';
import { REGIONS } from '../../modules/life/Regions.js';
import { currentBusiness, typeOf, startEligibility, fundingCheck, yearFinancials, newBusiness, holdsLicense, debtBalance, guaranteedDebt, LICENSEE_ONLY, staffFactor } from '../../modules/business/Business.js';
import { WORKFORCE_MODES } from '../../modules/career/ContractingSystem.js';
import { DUTIES } from '../../modules/career/ManagementEngine.js';
import { credentialName } from '../../modules/credentials/CredentialRegistry.js';
import { equipmentCard } from './EquipmentView.js';
import { FRANCHISE_BRANDS, FDD_COST, startupCost, franchiseEligibility, franchisorEligibility } from '../../modules/business/Franchising.js';

const MEAN_RNG = { float: (a, b) => (a + b) / 2, int: (a, b) => Math.round((a + b) / 2), chance: () => false, pick: (xs) => xs[0], id: () => 'probe' };
const entityOptions = (value = 'llc') => Object.entries(ENTITIES).map(([id, e]) => ({ value: id, label: `${e.icon} ${e.name}` })).sort((a, b) => (a.value === value ? -1 : b.value === value ? 1 : 0));

/** Typical profit at full ramp for a new owner-operator (deterministic estimate). */
function estimate(state, typeId) {
  const probe = newBusiness(MEAN_RNG, state, typeId, { years: 3, quality: 55, reputation: 50 });
  probe.role = 'operator';
  const ly = yearFinancials(state, probe, MEAN_RNG);
  return ly.netIncome + ly.ownerSalary;
}

/** Careers you have (or had): their businesses are listed first. */
function yourCareers(state) {
  return new Set([state.career.job?.professionId, ...state.career.history.map((h) => h.professionId)].filter(Boolean));
}

function startCard(state) {
  const mine = yourCareers(state);
  const fromCareer = new Set([...mine].flatMap((p) => businessesFor(p)));
  const rules = ownershipRules(state);
  const row = (id) => {
    const t = BUSINESS_TYPES[id];
    const cash = startEligibility(state, id, 'cash');
    const sba = startEligibility(state, id, 'sba');
    const sizes = sizesFor(t);
    const costs = sizes.map((z) => money(startupCostFor(t, z))).join(' – ');
    const blocked = !cash.ok && !sba.ok;
    const lic = requiredLicenses(id).filter((l) => l !== 'businessLicense').map((l) => BUSINESS_LICENSES[l].name);
    const needs = `${t.credentials.length ? `You need ${t.credentials.map(credentialName).join(' or ')}${t.minExperience ? ` + ${t.minExperience} yrs experience` : ''}` : 'No personal license needed'}${lic.length ? ` · the business needs a ${lic.join(' + ')}` : ''} · ${money(openingLicenseFees(id))} in license fees`;
    const o = OPERATIONS[id];
    const est = t.startup ? 'Venture-scale: most fail, a few get huge' : `≈${money(estimate(state, id))}/yr to the owner once established${o?.unit ? ` · starts with ${o.start} ${o.start === 1 ? o.unit.name : o.unit.plural}${t.startUsed ? ' (used)' : ''}; buy more and sign contracts` : o ? ' · sign contracts and hire to grow' : ''}`;
    return `<li class="program ${blocked ? 'locked' : ''}" data-collect-root>
      <div><b>${t.icon} ${esc(t.name)}</b> ${fromCareer.has(id) ? chip('From your career', 'cyan') : ''}<small>${costs} to start · ${esc(needs)} · ${esc(est)}</small>
        ${blocked ? `<small class="why">${esc(cash.reason)}</small>` : ''}</div>
      <div class="enroll-form">
        <input type="hidden" data-part="type" value="${id}">
        ${select('funding', [
          ...(cash.ok || t.startup ? [{ value: 'cash', label: '💵 Pay cash' }] : []),
          ...(!t.startup ? [{ value: 'sba', label: `🏦 SBA loan (${money(t.cost * SBA.downPayment)} down)` }] : []),
        ])}
        ${select('entity', entityOptions(t.startup ? 'ccorp' : 'llc'))}
        ${select('size', sizes.map((z) => ({ value: z, label: `${SIZE_OPTIONS[z].label} · ${money(startupCostFor(t, z))}` })), { value: 'standard' })}
        <input type="text" data-part="name" maxlength="40" placeholder="Business name (optional)" aria-label="Business name">
        ${button('Start', 'business.start', { variant: 'small primary', collect: true, disabled: blocked })}
      </div>
    </li>`;
  };
  // Your careers' businesses first (open), then every category behind a click.
  const mineIds = Object.keys(BUSINESS_TYPES).filter((id) => fromCareer.has(id));
  const groups = Object.entries(BUSINESS_GROUPS).map(([gid, g]) => {
    const ids = g.ids.filter((id) => !fromCareer.has(id));
    if (!ids.length) return '';
    const open = ids.filter((id) => startEligibility(state, id, 'cash').ok || startEligibility(state, id, 'sba').ok).length;
    return disclosure(`biz.group.${gid}`, `${g.icon} ${g.label}`, `<ul class="programs">${ids.map(row).join('')}</ul>`, { count: `${open} of ${ids.length} open to you` });
  }).join('');
  const rows = `${mineIds.length ? `<h4 class="sub">From your career</h4><ul class="programs">${mineIds.map(row).join('')}</ul>` : ''}${groups}`;
  return card('Start a Business', `${!rules.canOperate ? `<p class="fine">⚖️ ${esc(rules.notes.at(-1) ?? 'You can own a business but someone else will have to run it.')}</p>` : ''}${fromCareer.size ? '<p class="fine">Businesses that grow out of your career are listed first — your experience makes you a better owner.</p>' : ''}<p class="muted">Licensed trades and professions need the license. Pay cash or take an SBA 7(a) loan (10% down, ${Math.round(SBA.rate * 1000) / 10}% for ${SBA.years} years, ${SBA.minScore}+ credit, personal guarantee). Your legal structure decides taxes and how much of your life is on the line if it fails.</p>
    ${rows}
    <h4 class="sub">Legal structures</h4><ul class="history">${Object.values(ENTITIES).map((e) => `<li>${e.icon} <b>${esc(e.name)}</b> <small>${esc(e.desc)}${e.admin ? ` · ${money(e.admin)}/yr in filings` : ''}</small></li>`).join('')}</ul>`, { icon: '🏪', accent: 'green' });
}

function franchiseCard(state) {
  if (state.character.age < 21) return '';
  const rows = Object.entries(FRANCHISE_BRANDS).map(([id, b]) => {
    const t = BUSINESS_TYPES[b.typeId];
    const elig = franchiseEligibility(state, id);
    const price = startupCost(b);
    const cash = fundingCheck(state, price, 'cash', t);
    const sba = fundingCheck(state, price, 'sba', { ...t, credentials: ['franchise'] });
    const blocked = !elig.ok || (!cash.ok && !sba.ok);
    return `<li class="program ${blocked ? 'locked' : ''}">
      <div><b>${b.icon} ${esc(b.name)}</b><small>${esc(t.name)} · ${money(price)} all-in (${money(b.fee)} fee) · royalties ${Math.round((b.royalty + b.adFund) * 1000) / 10}% of revenue · ${b.term}-yr term · ${money(b.minNetWorth)} net worth</small>
        ${!elig.ok ? `<small class="why">${esc(elig.reason)}</small>` : !cash.ok && !sba.ok ? `<small class="why">${esc(sba.reason)}</small>` : ''}</div>
      <div class="toggle-row">${button('💵 Cash', 'business.franchise', { arg: `${id}:cash:llc`, variant: 'tiny', disabled: !elig.ok || !cash.ok })}${button('🏦 SBA', 'business.franchise', { arg: `${id}:sba:llc`, variant: 'tiny', disabled: !elig.ok || !sba.ok, hint: sba.ok ? `${money(sba.down)} down` : '' })}</div>
    </li>`;
  }).join('');
  return card('Buy a Franchise', `<p class="muted">A proven brand brings customers and a playbook — no industry experience needed — in exchange for a franchise fee, a pricier build-out, and royalties off the top of every sale. The franchisor inspects you, and the agreement runs a fixed term.</p><ul class="programs">${rows}</ul>`, { icon: '🍔' });
}

function franchiseStatus(state, biz) {
  if (biz.franchise) {
    const f = biz.franchise;
    return `<h4 class="sub">Franchise</h4>${kv([['Brand', esc(f.name)], ['Royalties + ad fund', `${Math.round((f.royalty + f.adFund) * 1000) / 10}% of revenue`], ['Agreement', `${Math.max(0, f.term - f.signedYears)} of ${f.term} yrs left`]])}<p class="fine">Keep quality above 40 or face a default notice. Selling requires the franchisor's approval and a transfer fee.</p>`;
  }
  if (biz.franchisor) {
    const fr = biz.franchisor;
    return `<h4 class="sub">Franchise system</h4>${kv([['Franchised units', fr.units], ['Opened / closed', `${fr.opened} / ${fr.failed}`], ['Fee per unit', money(fr.fee)], ['Royalty', `${Math.round(fr.royalty * 100)}%`]])}`;
  }
  const elig = franchisorEligibility(state, biz);
  if (typeOf(biz).startup) return '';
  return `<h4 class="sub">Franchise it</h4><div class="toggle-row">${button(`🗺️ Franchise ${esc(biz.name)}`, 'business.franchiseOut', { variant: 'small', disabled: !elig.ok, hint: elig.ok ? `${money(FDD_COST)} for the FDD and registrations` : elig.reason })}</div>`;
}

function listingsCard(state) {
  const listings = state.business.listings;
  if (!listings.length || state.character.age < 21) return '';
  const rows = listings.map((l) => {
    const t = BUSINESS_TYPES[l.typeId];
    const lic = LICENSEE_ONLY.includes(l.typeId) && !holdsLicense(state, t);
    const cash = fundingCheck(state, l.price, 'cash', t);
    const sba = fundingCheck(state, l.price, 'sba', t, { cashFlow: l.profit });
    return `<li class="program ${lic || (!cash.ok && !sba.ok) ? 'locked' : ''}">
      <div><b>${t.icon} ${esc(l.name)}</b><small>${l.years} yrs old · ${l.scale > 1 ? `${l.scale} locations · ` : ''}${money(l.revenue)} revenue · ≈${money(l.profit)}/yr before a manager · asking ${money(l.price)}</small>
        ${lic ? `<small class="why">Only a ${esc(t.credentials.map(credentialName).join(' or '))} holder can own it</small>` : !cash.ok && !sba.ok ? `<small class="why">${esc(sba.reason)}</small>` : ''}</div>
      <div class="toggle-row">${button('💵 Buy', 'business.buy', { arg: `${l.id}:cash`, variant: 'tiny', disabled: lic || !cash.ok })}${button('🏦 SBA', 'business.buy', { arg: `${l.id}:sba`, variant: 'tiny', disabled: lic || !sba.ok, hint: sba.ok ? `${money(sba.down)} down` : '' })}</div>
    </li>`;
  }).join('');
  return card('Businesses for Sale', `<p class="muted">Established businesses sell for a few years of owner earnings. New listings every year.</p><ul class="programs">${rows}</ul>`, { icon: '🪧' });
}

function historyCard(state) {
  const h = state.business.history;
  if (!h.length) return '';
  return card('Business History', `<ul class="history">${[...h].reverse().map((b) => `<li>${BUSINESS_TYPES[b.typeId]?.icon ?? '🏪'} <b>${esc(b.name)}</b> <small>age ${b.startAge}–${b.endAge} · ${esc(b.outcome)}${b.proceeds ? ` · ${money(b.proceeds)}` : ''}${orgFate(state, b)}</small></li>`).join('')}</ul>`, { icon: '🗂️' });
}

/** What became of a business you owned (organizations outlive their owners). */
function orgFate(state, b) {
  const org = b.orgId && state.orgs?.byId?.[b.orgId];
  if (!org) return '';
  if (org.mergedInto) return ' · merged into another company';
  if (org.closed) return ' · closed';
  return org.owner?.kind === 'npc' ? ` · still open under ${esc(org.owner.name)}` : '';
}

/** The organization: your seat, who runs what, and what you can do about each person. */
function orgCard(state, biz) {
  const org = businessOrg(state, biz);
  if (!org) return '';
  const pos = ownerPosition(state, biz);
  const used = state.yearly['business.decide'] ?? 0;
  const left = OWNER_DECISIONS - used;
  const depts = businessRoster(state, biz);
  const otherDepts = Object.values(org.departments);
  const personRow = (p) => `<li class="report-row"><div><b>${esc(p.name)}</b> <small class="muted">${esc(p.title)} · age ${p.age} · ${p.years} yr · performance ${p.performance} · likes you ${p.rel}%</small></div>
    <div class="toggle-row">${[
      ['🏅', 'Commend', 'business.staffCommend'], ['💵', 'Raise', 'business.staffRaise'], ['⬆️', 'Promote', 'business.staffPromote'], ['⬇️', 'Demote', 'business.staffDemote'],
    ].map(([i, l, a]) => button(`${i} ${l}`, a, { arg: p.id, variant: 'tiny', disabled: left <= 0 })).join('')}
    ${otherDepts.length > 1 ? `<span data-collect-root><input type="hidden" data-part="p" value="${p.id}">${select('dept', otherDepts.filter((d) => d.id !== p.deptId).map((d) => ({ value: d.id, label: d.name })))}${button('🔀 Move', 'business.staffTransfer', { variant: 'tiny', collect: true, disabled: left <= 0 })}</span>` : ''}
    ${button('🚪 Fire', 'business.staffFire', { arg: p.id, variant: 'tiny danger', disabled: left <= 0 })}</div></li>`;
  const searches = 6 - (state.yearly['business.recruit'] ?? 0);
  const sections = depts.map(({ dept, head, people }) => `<h4 class="sub">${esc(dept.name)} <small class="muted">~${dept.headcount} staff</small> ${button('👋 Hire', 'business.recruit', { arg: dept.id, variant: 'tiny', disabled: searches <= 0, hint: searches > 0 ? 'Interview three applicants' : 'No more searches this year' })}</h4>
    ${head ? `<p class="fine">👤 ${esc(head.name)}, ${esc(head.title)}</p>` : `<p class="fine">Reports directly to you.</p>`}
    ${people.length ? `<ul class="history">${people.map(personRow).join('')}</ul>` : ''}`).join('');
  const ceo = pos.ceo;
  return card('Organization', `
    <p>${chip(`👑 ${pos.title}`, 'honor')} ${chip(pos.stake)} ${chip(`${biz.staff.headcount} staff`)}${org.branches.length ? ` ${chip(`${org.branches.length + 1} locations`)}` : ''}</p>
    ${ceo ? `<p>👔 <b>${esc(ceo.name)}</b> runs it day to day as ${esc(ceo.title)} (performance ${ceo.performance}).</p>` : '<p class="muted">You run it day to day.</p>'}
    <p class="fine">The structure grows with you: a manager layer at ${TIERS.manager}+ staff, executives and finance/HR departments at ${TIERS.executives}+. ${left > 0 ? `${left} people decision${left > 1 ? 's' : ''} left this year.` : 'No more people decisions this year.'}</p>
    <div class="action-grid">${button(ceo ? '👔 Replace the chief executive' : '👔 Hire someone to run it', 'business.appointCeo', { hint: 'You stay the owner' })}${ceo ? button('🗂️ Step back to a passive owner', 'business.makePassive', { hint: 'Frees you to start or buy another business' }) : ''}</div>
    <p class="fine">👋 Hire into any department below: you pick from three applicants, from a cheap beginner to an expensive star (${Math.max(0, searches)} search${searches === 1 ? '' : 'es'} left this year). Firing someone leaves the seat empty.</p>
    ${sections}`, { icon: '🏢' });
}

/** Rivals in your market, and deals you can make with them. */
function marketCard(state, biz) {
  const rivals = competitorsOf(state, biz);
  if (!rivals.length) return '';
  const rows = rivals.map((o) => {
    const price = acquisitionPrice(biz, o);
    return `<li class="report-row"><div><b>${esc(o.name)}</b> <small class="muted">owner ${esc(o.owner.name)} · ~${o.business.staff} staff · reputation ${o.business.reputation} · ${o.business.years ?? 0} yrs${o.business.founderId ? ' · founded by a former employee' : ''}</small></div>
      <div class="toggle-row">${button(`🤝 Acquire · ${money(price)}`, 'business.acquire', { arg: o.id, variant: 'tiny', disabled: biz.cash < price, hint: 'From the business account' })}${button('🔗 Merge (stock)', 'business.merge', { arg: o.id, variant: 'tiny' })}</div></li>`;
  }).join('');
  return card('Your Market', `<p class="muted">Competitors take a share of customers; your reputation against theirs decides who wins. They grow, fail and open around you.</p><ul class="history">${rows}</ul>`, { icon: '🏁' });
}

/** Prices, pay, suppliers, investment, debt and locations. */
function policyCard(state, biz) {
  const org = businessOrg(state, biz);
  const type = typeOf(biz);
  const regions = Object.values(REGIONS);
  return card('Strategy & Policy', `
    <h4 class="sub">Prices</h4><div class="toggle-row chips-row">${Object.entries(PRICE_LEVELS).map(([id, l]) => button(l.label, 'business.setPrice', { arg: id, variant: (biz.priceLevel ?? 'standard') === id ? 'tiny on' : 'tiny', hint: id === 'premium' ? 'Pays when quality is high' : id === 'budget' ? 'Wins volume' : '' })).join('')}</div>
    <h4 class="sub">Wages</h4><div class="toggle-row chips-row">${Object.entries(PAY_LEVELS).map(([id, l]) => button(l.label, 'business.setPay', { arg: id, variant: (biz.payLevel ?? 'market') === id ? 'tiny on' : 'tiny', hint: `${l.payroll > 1 ? '+' : ''}${Math.round((l.payroll - 1) * 100)}% payroll · morale ${l.morale >= 0 ? '+' : ''}${l.morale}` })).join('')}</div>
    <h4 class="sub">Suppliers</h4><div class="toggle-row chips-row">${Object.entries(SUPPLIERS).map(([id, l]) => button(l.label, 'business.setSupplier', { arg: id, variant: (biz.supplier ?? 'standard') === id ? 'tiny on' : 'tiny' })).join('')}</div>
    <div class="action-grid">${!type.startup ? button('🚚 Move to a better location', 'business.relocate', { hint: `${money(relocationCost(biz))} · location luck ${Math.round((biz.fit ?? 1) * 100)}%` }) : ''}${button('🛠️ Buy equipment', 'business.invest', { arg: 'equipment', hint: `${money(type.cost * 0.15 * Math.max(1, biz.scale))} · +quality` })}${button('🖥️ Invest in technology', 'business.invest', { arg: 'technology', hint: `${money(type.cost * 0.08 * Math.max(1, biz.scale))} · +quality` })}${button('🏦 Pay down debt', 'business.payDown', { disabled: !biz.debts.sba })}</div>
    ${!type.startup ? `<h4 class="sub">Locations</h4>
      <ul class="history"><li>📍 Main location${org ? ` · ${esc((REGIONS[org.regionId] ?? REGIONS.midcity).name.split(',')[0])}` : ''}</li>${(org?.branches ?? []).map((b) => `<li>📍 ${esc(org.departments[b.deptId]?.name ?? b.city)} ${button('Close', 'business.closeLocation', { arg: b.deptId, variant: 'tiny danger' })}</li>`).join('')}</ul>
      <p class="fine">Next location opens in: ${regions.map((r) => button(r.name.split(',')[0], 'business.expandTo', { arg: r.id, variant: (biz.expandTo ?? state.character.regionId) === r.id ? 'tiny on' : 'tiny' })).join(' ')}</p>` : ''}`, { icon: '🧭' });
}

/** Next year's forecast, what would raise profit, and whether your manager handles routine calls. */
function advisorCard(state, biz) {
  const f = forecast(state, biz);
  const advice = businessAdvice(state, biz);
  const rows = advice.map((a) => `<li class="report-row"><div>${a.icon} ${esc(a.text)}</div>${a.action ? `<div class="toggle-row">${button(esc(a.label), a.action, { arg: a.arg ?? undefined, variant: 'tiny' })}</div>` : ''}</li>`).join('');
  return card('Advisor', `
    ${kv([
      ['Forecast revenue', money(f.revenue)],
      ['Forecast profit', `<b class="${f.netIncome < 0 ? 'neg' : 'pos'}">${money(f.netIncome)}</b>`],
      ['Cash after a year', `<span class="${f.cashAfter < 0 ? 'neg' : ''}">${money(f.cashAfter)}</span>`],
    ])}
    ${rows ? `<h4 class="sub">What would help</h4><ul class="history">${rows}</ul>` : '<p class="muted">Nothing obvious to change — the business is running about as well as it can right now.</p>'}
    <div class="toggle-row chips-row">${button(biz.autopilot ? '🤖 Autopilot: your manager handles routine decisions' : '🧑‍💼 Hands-on: every decision comes to you', 'business.toggleAutopilot', { variant: biz.autopilot ? 'tiny on' : 'tiny', hint: 'Big decisions (offers, cash crunches, unions) always come to you' })}</div>
    <p class="fine">Forecasts assume an average year at today's quality and prices.</p>`, { icon: '🧭', accent: 'cyan' });
}

/** Delegate and automate: a growth strategy management carries out, and a one-click hand-off. */
function managementCard(state, biz) {
  const type = typeOf(biz);
  const plan = biz.plan?.strategy ?? 'off';
  const ok = canDelegate(biz);
  const delegated = biz.staff.headcount >= 8 ? Object.keys(DUTIES).filter((d) => biz.staff.delegation[d]).length : 0;
  const strategies = Object.entries(STRATEGIES).map(([id, st]) => button(`${st.icon} ${st.name}`, 'business.setPlan', { arg: id, variant: plan === id ? 'tiny on' : 'tiny', disabled: !ok && id !== 'off', hint: st.desc })).join('');
  const handedOff = biz.role !== 'operator' && biz.autopilot && plan !== 'off';
  const report = biz.plan?.lastReport;
  return card('Management & Growth', `
    ${kv([
      ['Who runs it', biz.role === 'operator' ? 'You, day to day' : 'Your management team'],
      ['Routine decisions', biz.autopilot ? '🤖 Handled by your managers' : '🧑‍💼 Brought to you'],
      ['Delegated duties', biz.staff.headcount >= 8 ? `${delegated} of ${Object.keys(DUTIES).length}` : 'Needs 8+ staff'],
      ['Locations', `${biz.scale} of ${type.startup ? '—' : maxScale(state, biz)}${!type.startup ? ` · next ${money(expansionCost(biz))}` : ''}`],
    ])}
    ${ok ? '' : '<p class="why">Delegation needs managers: 8+ staff or a second location.</p>'}
    <h4 class="sub">Growth strategy</h4><div class="toggle-row chips-row">${strategies}</div>
    ${report ? `<p class="fine">📋 Last year: ${report.length ? esc(report.join('; ')) : 'nothing needed doing'}.</p>` : ''}
    <div class="action-grid">${button(handedOff ? '✅ Management runs it' : '🗂️ Hand it to management', 'business.handOff', { variant: 'small', disabled: !ok || handedOff, hint: 'Managers run it day to day, handle routine calls and every delegable duty, on a steady growth plan — you get one report a year' })}
      ${biz.role !== 'operator' ? button('🧑‍💼 Take back day-to-day control', 'business.setRole', { arg: 'operator', variant: 'small', disabled: Boolean(state.career.job), hint: state.career.job ? 'Quit your job first' : 'Run it yourself again' }) : ''}</div>
    <p class="fine">A plan expands from profits, staffs each location, sets marketing and grows the fleet on its own. Owner-run businesses top out at five locations; with a CEO and 40+ staff they can grow to twelve.</p>`, { icon: '🗂️', accent: 'green' });
}

/** Licenses the business holds or could get. */
function licensesCard(state, biz) {
  const ids = licensesFor(biz.typeId);
  const rows = ids.map((id) => {
    const l = BUSINESS_LICENSES[id];
    const rec = biz.licenses?.[id];
    const status = !rec ? (l.required ? '<span class="neg">Missing</span>' : 'Not held')
      : rec.status === 'active' ? `✅ Active · renews at age ${rec.renewAge} (${money(l.renewal.fee)})`
        : rec.status === 'pending' ? `⏳ In review · decision at age ${rec.readyAge}`
          : rec.status === 'suspended' ? `<span class="neg">⛔ Suspended until age ${rec.until}</span>`
            : '<span class="neg">Lapsed — renew to keep operating</span>';
    const elig = licenseEligibility(state, id, biz.typeId, biz);
    const canApply = !rec || rec.status === 'lapsed';
    return `<li class="report-row"><div>${l.icon} <b>${esc(l.name)}</b> ${l.required ? chip('Required', 'warn') : chip('Optional')} <small class="muted">${esc(l.desc)}</small><br><small>${status}</small>${canApply && !elig.ok ? ` <small class="why">${esc(elig.reason)}</small>` : ''}</div>
      ${canApply ? `<div class="toggle-row">${button(rec?.status === 'lapsed' ? `Renew (${money(l.renewal.fee * 2)})` : `Apply (${money(l.fee)})`, 'business.getLicense', { arg: id, variant: 'tiny', disabled: !elig.ok })}</div>` : ''}</li>`;
  }).join('');
  return card('Licenses & Permits', `<p class="muted">What the business itself needs to operate (your own professional licenses are separate). Renewals come out of the business account automatically.</p><ul class="history">${rows}</ul>`, { icon: '📃' });
}

/** Businesses you own but don't run. */
function holdingsCard(state) {
  const hs = state.business.holdings ?? [];
  if (!hs.length) return '';
  return card('Your Holdings', `<p class="muted">Businesses you own while their management runs them. Profits come to you as distributions.</p><ul class="history">${hs.map((h) => {
    const org = businessOrg(state, h);
    const ceo = org?.people?.[org.ceo];
    return `<li class="report-row"><div><b>${BUSINESS_TYPES[h.typeId]?.icon ?? '🏪'} ${esc(h.name)}</b> <small class="muted">${Math.round(h.ownerPct * 100)}% · valued ${money(h.valuation)} · ${h.staff.headcount} staff${ceo ? ` · run by ${esc(ceo.name)}` : ''}${h.lastYear ? ` · last year ${money(h.lastYear.netIncome)}` : ''}</small></div>
      <div class="toggle-row chips-row">${Object.entries(STRATEGIES).map(([id, st]) => button(`${st.icon} ${st.name}`, 'business.setHoldingPlan', { arg: `${h.id}:${id}`, variant: (h.plan?.strategy ?? 'off') === id ? 'tiny on' : 'tiny', hint: st.desc })).join('')}</div>${h.plan?.lastReport?.length ? `<small class="fine">📋 ${esc(h.plan.lastReport.join('; '))}</small>` : ''}
      <div class="toggle-row">${button('🧑‍💼 Take it back', 'business.takeBack', { arg: h.id, variant: 'tiny', disabled: Boolean(currentBusiness(state)) })}${button('🪧 Sell', 'business.sellHolding', { arg: h.id, variant: 'tiny' })}</div></li>`;
  }).join('')}</ul>`, { icon: '🗂️' });
}

function pnl(ly) {
  if (!ly) return '<p class="muted">First results come at the end of the year.</p>';
  const rows = [
    ['Revenue', ly.revenue], ['Cost of goods', -ly.cogs], ['Payroll & benefits', -ly.payroll], ['HR / delegation overhead', -ly.overhead], ['Managers', -ly.management],
    ['Rent', -ly.rent], ['Insurance', -ly.insurance], ['Marketing', -ly.marketing], ['Filings & accounting', -ly.admin], ['Royalties & ad fund', -(ly.royalties ?? 0)], ['Franchise fees received', ly.franchiseFees ?? 0], ['Royalties received', ly.royaltyIncome ?? 0], ['Franchise support', -(ly.franchiseSupport ?? 0)], ['Interest', -ly.interest],
    ['Your salary', -ly.ownerSalary], ['Payroll tax on your salary', -ly.payrollTax], ['Corporate tax', -ly.corporateTax],
  ].filter(([, v]) => v);
  return `<table class="pnl">${rows.map(([k, v]) => `<tr><td>${k}</td><td class="${v < 0 ? 'neg' : ''}">${money(v)}</td></tr>`).join('')}
    <tr class="total"><td>Net income</td><td class="${ly.netIncome < 0 ? 'neg' : 'pos'}">${money(ly.netIncome)}</td></tr></table>
    <p class="fine">You took home ${money(ly.ownerPay ?? 0)}${ly.seTax ? ` and paid ${money(ly.seTax)} self-employment tax` : ''}.</p>`;
}

/** Fleet, crews and the contract book (Operations). */
function fleetCard(state, biz) {
  const o = opsOf(biz);
  if (!o) return '';
  const ops = biz.ops;
  const c = capacity(biz);
  const booked = contracted(biz);
  const short = booked - c.capacity;
  const unitWord = o.unit ? o.unit.plural : `${o.crewName} posts`;
  const fleet = o.unit ? (() => {
    const ages = ops.units.map((u) => u.age);
    const avg = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
    const worn = ops.units.filter((u) => u.age >= o.unit.life).length;
    return `${ops.units.length} ${ops.units.length === 1 ? o.unit.name : o.unit.plural} · average age ${avg} yr${worn ? ` · <span class="neg">${worn} past ${o.unit.life} yr</span>` : ''}`;
  })() : null;
  const loanDown = (price) => money(price * EQUIPMENT_LOAN.down);
  const buy = o.unit ? `
    ${button(`${o.unit.icon} Buy new · ${money(o.unit.newCost)}`, 'business.buyUnit', { arg: 'new', variant: 'small', disabled: biz.cash < o.unit.newCost, hint: 'From the business account; low upkeep, rarely breaks' })}
    ${button(`🏦 Finance new · ${loanDown(o.unit.newCost)} down`, 'business.buyUnit', { arg: 'new:loan', variant: 'small', disabled: biz.cash < o.unit.newCost * EQUIPMENT_LOAN.down, hint: `${Math.round(EQUIPMENT_LOAN.rate * 1000) / 10}% over ${EQUIPMENT_LOAN.years} years, personally guaranteed` })}
    ${button(`♻️ Buy used · ${money(o.unit.usedCost)}`, 'business.buyUnit', { arg: 'used', variant: 'small', disabled: biz.cash < o.unit.usedCost, hint: 'Cheaper; older, breaks down more' })}
    ${button(`🏦 Finance used · ${loanDown(o.unit.usedCost)} down`, 'business.buyUnit', { arg: 'used:loan', variant: 'small', disabled: biz.cash < o.unit.usedCost * EQUIPMENT_LOAN.down })}
    ${button(`💲 Sell the oldest`, 'business.sellUnit', { variant: 'small', disabled: ops.units.length <= 1, hint: ops.units.length > 1 ? `≈${money(resaleValue(o, [...ops.units].sort((a, b) => b.age - a.age)[0]))}` : 'You need at least one' })}` : '';
  const contracts = ops.contracts.map((k) => `<li>📄 <b>${esc(k.client)}</b> <small>${k.units} ${k.units === 1 ? (o.unit?.name ?? `${o.crewName} post`) : unitWord} · ≈${money(k.units * o.perUnit * k.rate)}/yr · ${k.yearsLeft} of ${k.years} yr left</small> ${button('Walk away', 'business.dropContract', { arg: k.id, variant: 'tiny', hint: `Fee ≈${money(k.units * o.perUnit * k.rate * 0.15)}; reputation hit` })}</li>`).join('');
  const offers = (ops.offers ?? []).map((k) => {
    const ok = offerEligibility(state, biz, k);
    const fits = booked + k.units <= c.capacity;
    return `<li class="${ok.ok ? '' : 'locked'}">${k.renewal ? '🔁' : '📨'} <b>${esc(k.client)}</b> <small>${k.units} ${k.units === 1 ? (o.unit?.name ?? `${o.crewName} post`) : unitWord} · ${k.years} yr · ${Math.round(k.rate * 100)}% of the going rate · ≈${money(k.units * o.perUnit * k.rate)}/yr${ok.ok && !fits ? ' · <span class="neg">more than your free capacity</span>' : ''}${ok.ok ? '' : ` · ${esc(ok.reason)}`}</small> ${button('Sign', 'business.acceptContract', { arg: k.id, variant: 'tiny', disabled: !ok.ok })}</li>`;
  }).join('');
  return card(o.unit ? 'Fleet & Contracts' : 'Crews & Contracts', `
    ${kv([
      fleet ? ['Fleet', fleet] : null,
      ['Staff', `${biz.staff.headcount}${biz.role === 'operator' ? ' + you' : ''} · ${o.crew > 1 ? `crews of ${o.crew}` : `one ${o.crewName} per ${o.unit?.name ?? 'post'}`}`],
      ['Capacity', `${c.capacity} ${unitWord} working${o.unit && c.crews < c.units ? ` · <span class="neg">${c.units - c.crews} idle for lack of ${o.crewName}s</span>` : ''}${o.unit && c.units < c.crews ? ` · ${c.crews - c.units} spare crew${c.crews - c.units > 1 ? 's' : ''}` : ''}`],
      ['Under contract', `${booked} of ${c.capacity}${short > 0 ? ` · <span class="neg">${short} short — penalties at year's end</span>` : ''}`],
      ops.lastUtil != null ? ['Last year', `${Math.min(100, Math.round(ops.lastUtil * 100))}% busy`] : null,
      ops.loan ? ['Equipment loan', `<span class="neg">${money(ops.loan.balance)}</span> · ${money(ops.loan.annual)}/yr`] : null,
      ['Each unit earns', `about ${money(o.perUnit)}/yr fully booked`],
    ])}
    <div class="action-grid">
      ${buy}
      ${button(`🤝 Hire ${o.crew > 1 ? `a crew of ${o.crew}` : `a ${o.crewName}`}`, 'business.hireCrew', { variant: 'small' })}
      ${button(`✂️ Let ${o.crew > 1 ? 'a crew' : `a ${o.crewName}`} go`, 'business.cutCrew', { variant: 'small', disabled: biz.staff.headcount < o.crew })}
      ${button('📨 Bid for more work', 'business.bid', { variant: 'small', disabled: Boolean(state.yearly['business.bid']), hint: 'Two more offers this year' })}
    </div>
    <h4 class="sub">Contracts</h4>${contracts ? `<ul class="history">${contracts}</ul>` : '<p class="muted">No contracts — all your work is one-off spot jobs, which swing with the economy.</p>'}
    <h4 class="sub">Offers this year</h4>${offers ? `<ul class="history">${offers}</ul>` : '<p class="muted">No offers right now. Bid for work, or wait for next year.</p>'}
    <p class="fine">Capacity is whichever runs out first, ${o.unit ? `${o.unit.plural} or ${o.crewName}s` : `${o.crewName}s`}. Contracts pay a set rate whatever the economy does; spare capacity chases spot work. Promise more than you can cover and you pay penalties and lose clients.${biz.role !== 'operator' ? ' Your manager signs offers that fit.' : ''}</p>`, { icon: o.unit?.icon ?? '🤝', accent: 'cyan' });
}

function ownedView(state, biz) {
  const type = typeOf(biz);
  const entity = ENTITIES[biz.entity];
  const s = biz.staff;
  const debt = debtBalance(biz);
  const nextRound = ROUNDS[biz.roundsRaised ?? 0];
  const relatives = (state.people?.list ?? []).filter((p) => p.alive && ['spouse', 'partner', 'fiance', 'child', 'sibling', 'mother', 'father'].includes(p.relation) && state.character.age + p.ageOffset >= 16 && !biz.family.includes(p.id));
  const overview = card(`${type.icon} ${esc(biz.name)}`, `
    <p>${chip(type.name)} ${chip(`${entity.icon} ${entity.name}`)} ${chip(biz.role === 'operator' ? '🧑‍💼 You run it' : '🧑‍💼 Manager runs it', biz.role === 'operator' ? 'cyan' : '')} ${biz.licensedManager ? chip('🪪 Licensed manager', 'warn') : ''} ${s.unionized ? chip('✊ Unionized') : ''}</p>
    ${kv([
      ['Founded', `age ${biz.foundedAge} (${biz.years} yr)`],
      ['Locations', biz.scale],
      ['Business cash', `<b class="${biz.cash < 0 ? 'neg' : 'pos'}">${money(biz.cash)}</b>`],
      ['Debt', debt ? `<span class="neg">${money(debt)}</span>${guaranteedDebt(biz) ? ' (personally guaranteed)' : ''}` : '$0'],
      ['Valuation', money(biz.valuation)],
      ['Your stake', `${Math.round(biz.ownerPct * 1000) / 10}% · ${money(biz.valuation * biz.ownerPct)}`],
      type.startup ? ['Annual recurring revenue', `${money(biz.arr)}${biz.arr ? ` · ${biz.growth >= 0 ? '+' : ''}${Math.round(biz.growth * 100)}%/yr` : ' (pre-launch)'}`] : null,
      biz.violations.length ? ['Health violations', `<span class="neg">${biz.violations.length}/3 in 5 yrs</span>`] : null,
    ])}
    ${meter(biz.quality, { label: '⭐ Quality' })}
    ${meter(biz.reputation, { label: '📣 Reputation' })}
    ${franchiseStatus(state, biz)}
    <h4 class="sub">Last year</h4>${pnl(biz.lastYear)}`, { icon: type.icon, accent: 'green' });

  const ops = card('Operations', `
    ${s.headcount ? `${kv([['Staff', `${s.headcount}${biz.family.length ? ` (${biz.family.length} family)` : ''}`], ['Union risk', s.unionized ? 'Unionized' : `${s.unionRisk}%`]])}
      ${meter(s.morale, { label: '😊 Morale' })}${meter(s.productivity, { label: '⚙️ Productivity' })}` : '<p class="muted">No employees yet — just you.</p>'}
    <h4 class="sub">Who runs it</h4><div class="toggle-row chips-row">${button('🧑‍💼 Run it yourself', 'business.setRole', { arg: 'operator', variant: biz.role === 'operator' ? 'tiny on' : 'tiny', disabled: Boolean(state.career.job), hint: state.career.job ? 'Quit your job first' : 'Your skill shows; full-time work' })}${button('🧑‍💼 Hire a general manager', 'business.setRole', { arg: 'absentee', variant: biz.role === 'absentee' ? 'tiny on' : 'tiny', hint: 'Salary cost; quality drifts' })}</div>
    <h4 class="sub">Marketing</h4><div class="toggle-row chips-row">${MARKETING.map((m, i) => button(m.label, 'business.setMarketing', { arg: String(i), variant: biz.marketing === i ? 'tiny on' : 'tiny', hint: m.share ? `${Math.round(m.share * 100)}% of revenue` : '' })).join('')}</div>
    <h4 class="sub">Profit you take out</h4><div class="toggle-row chips-row">${[0, 0.5, 1].map((p) => button(p === 0 ? 'Reinvest all' : p === 0.5 ? 'Half' : 'All of it', 'business.setDraw', { arg: String(p), variant: biz.drawPct === p ? 'tiny on' : 'tiny' })).join('')}</div>
    ${s.headcount ? `<h4 class="sub">Workforce</h4><div class="toggle-row chips-row">${Object.entries(WORKFORCE_MODES).map(([id, m]) => button(`${m.icon} ${m.label}`, 'business.setWorkforce', { arg: id, variant: s.workforce === id ? 'tiny on' : 'tiny', hint: m.desc })).join('')}</div>
    <h4 class="sub">Benefits you offer</h4><div class="toggle-row chips-row">${button('🩺 Health plan', 'business.toggleHealth', { variant: biz.benefits.health ? 'tiny on' : 'tiny', hint: '+12% payroll · morale' })}${[0, 0.03, 0.05].map((m) => button(m ? `401(k) ${m * 100}% match` : 'No 401(k)', 'business.setMatch', { arg: String(m), variant: biz.benefits.match === m ? 'tiny on' : 'tiny' })).join('')}</div>
    <h4 class="sub">Delegate to managers</h4><div class="toggle-row chips-row">${Object.entries(DUTIES).map(([id, d]) => button(`${d.icon} ${d.label}`, 'business.toggleDelegation', { arg: id, variant: s.delegation[id] ? 'tiny on' : 'tiny', disabled: s.headcount < 8, hint: s.headcount < 8 ? '8+ staff' : `${Math.round(d.overhead * 100)}% of payroll` })).join('')}</div>` : ''}
    <div class="action-grid">
      ${type.startup ? `${button('🤝 Hire 5', 'business.hire', { arg: '5' })}${button('✂️ Lay off 30%', 'business.layoff', { variant: 'danger', disabled: !s.headcount })}` : ''}
      ${!type.startup && !opsOf(biz) ? `${button('🤝 Hire an employee', 'business.hire', { arg: '1', hint: `Staffing ${Math.round(staffFactor(biz) * 100)}% of normal output` })}${button('✂️ Let one go', 'business.letGo', { disabled: !s.headcount })}` : ''}
      ${type.startup ? '' : button('🏗️ Open another location', 'business.expand', { arg: 'cash', hint: `${money(type.cost * 0.8)} from the business`, disabled: biz.scale >= maxScale(state, biz) || biz.years < 2 })}
    </div>
    ${relatives.length ? `<h4 class="sub">Family business</h4><div class="toggle-row chips-row">${relatives.map((p) => button(`👪 Hire ${esc(p.firstName)}`, 'business.hireRelative', { arg: p.id, variant: 'tiny' })).join('')}</div>` : ''}`, { icon: '⚙️' });

  const funding = card('Funding & Structure', `
    <div class="action-grid">
      ${type.startup ? button(nextRound ? `💸 Raise a ${nextRound.name}` : '💸 No more rounds', 'business.raise', { disabled: !nextRound || biz.entity !== 'ccorp', hint: biz.entity !== 'ccorp' ? 'Convert to a C-corp first' : nextRound ? `${money(nextRound.minArr)}+ ARR, ${Math.round(nextRound.minGrowth * 100)}%+ growth` : 'IPO or acquisition next' }) : button('🏦 SBA working-capital loan', 'business.loan', { hint: '25% of revenue · personal guarantee', disabled: biz.years < 2 })}
      ${!type.startup && biz.scale < maxScale(state, biz) ? button('🏗️ Expand with an SBA loan', 'business.expand', { arg: 'sba', disabled: biz.years < 2 }) : ''}
    </div>
    <h4 class="sub">Legal structure</h4><div class="toggle-row chips-row">${Object.entries(ENTITIES).map(([id, e]) => button(`${e.icon} ${e.name}`, 'business.convert', { arg: id, variant: biz.entity === id ? 'tiny on' : 'tiny', disabled: biz.entity === id || (ventureBacked(biz) && id !== 'ccorp'), hint: biz.entity === id ? '' : '$1,500 to convert' })).join('')}</div>
    ${biz.investors.length ? `<h4 class="sub">Investors</h4><ul class="history">${biz.investors.map((i) => `<li>💼 ${esc(i.round)} · ${money(i.invested)} for ${Math.round(i.pct * 100)}%</li>`).join('')}</ul>` : ''}`, { icon: '🏦' });

  const exit = card('Exit', `<p class="muted">Sell to a buyer, wind it down, or file business bankruptcy. ${entity.liability ? 'Your entity shields personal assets — except debts you personally guaranteed.' : 'As a sole proprietor, every business debt is yours.'}</p>
    <div class="action-grid">${button('💼 Sell a 25% stake', 'business.sellStake', { arg: '0.25', disabled: biz.ownerPct < 0.45 || biz.valuation <= 0 })}${button('💼 Sell a 49% stake', 'business.sellStake', { arg: '0.49', disabled: biz.ownerPct < 0.69 || biz.valuation <= 0 })}${(state.people?.list ?? []).filter((p) => p.alive && ['spouse', 'partner', 'child', 'sibling'].includes(p.relation) && state.character.age + p.ageOffset >= 18).map((p) => button(`👪 Hand it to ${esc(p.firstName)}`, 'business.giveToFamily', { arg: p.id })).join('')}</div>
    <div class="action-grid">${button('🪧 Put it up for sale', 'business.sell', { disabled: Boolean(state.yearly['business.sell']) || biz.valuation <= 0, hint: `≈${money(biz.valuation * biz.ownerPct)} for your stake` })}${button('🔒 Close it', 'business.close', { variant: 'danger' })}${button('⚖️ Business bankruptcy', 'business.bankrupt', { variant: 'danger' })}</div>`, { icon: '🚪' });
  return `${overview}${managementCard(state, biz)}${advisorCard(state, biz)}${fleetCard(state, biz)}${equipmentCard(state, 'business')}${licensesCard(state, biz)}${orgCard(state, biz)}${marketCard(state, biz)}${ops}${policyCard(state, biz)}${funding}${exit}`;
}

export function businessView(state) {
  if (!state.business) return '';
  const biz = currentBusiness(state);
  if (biz) return `${ownedView(state, biz)}${holdingsCard(state)}${historyCard(state)}`;
  if (state.character.age < 18) return card('Business', empty('You can start a business at 18. For now, try a part-time job.'), { icon: '🏪' });
  return `${holdingsCard(state)}${startCard(state)}${franchiseCard(state)}${listingsCard(state)}${historyCard(state)}`;
}
