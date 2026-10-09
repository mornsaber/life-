/**
 * Business tab: start or buy a business, then run it — P&L, staff and
 * delegation, benefits, marketing, funding (SBA, venture rounds), valuation
 * and exits.
 */
import { esc, money, button, card, chip, kv, meter, select, empty, disclosure } from '../Components.js';
import { OPERATIONS, opsOf, capacity, contracted, offerEligibility, resaleValue, EQUIPMENT_LOAN, growthTier } from '../../modules/business/Operations.js';
import { BUSINESS_TYPES, BUSINESS_GROUPS, ENTITIES, MARKETING, ROUNDS, SBA, SIZE_OPTIONS, sizesFor, startupCostFor, businessesFor } from '../../modules/business/BusinessTypes.js';
import { ownershipRules } from '../../modules/business/OwnershipRules.js';
import { ventureBacked, maxScale, expansionCost, nextExpansionCost } from '../../modules/business/BusinessEngine.js';
import { canAfford } from '../../core/State.js';
import { STRATEGIES, canDelegate } from '../../modules/business/GrowthPlan.js';
import { airportBidEligibility, airportTender, AIRPORT_BID_COST } from '../../modules/business/FleetActions.js';
import { conglomerateOf, subsidiaries, formEligibility, holdingsCap, acquisitionTargets, appraise, synergyRate, hqCost, FORM_COST, CONGLOMERATE_HOLDINGS } from '../../modules/business/Conglomerate.js';
import { BUSINESS_LICENSES, licensesFor, requiredLicenses, openingLicenseFees, licenseEligibility } from '../../modules/business/BusinessLicenses.js';
import { forecast, businessAdvice } from '../../modules/business/Advisor.js';
import { EXEC_ROLES, OFFICES, officeOf, officeCost, execPayroll, hqHeadcount, ownOffices, mergeCandidates, MERGE_COST, dealDiscount } from '../../modules/business/HoldingCo.js';
import { withdrawable, buyBackQuote, openingsPerYear } from '../../modules/business/Capital.js';
import { personCreds, endorsementsFor, certCost, crewSize } from '../../modules/business/StaffCerts.js';
import { getProfession } from '../../modules/career/JobTrees.js';
import { levelById } from '../../modules/career/Ladder.js';
import { POSTS, FOCUS, EXEC_MOVES, EXEC_MOVES_PER_YEAR, PAY_LEVELS as POST_PAY, postEligible, postSalary } from '../../modules/business/OwnerJob.js';
import { EXPERTISE, VERDICTS, boardRequired, boardSize, vacantSeats, youChair, directorFee } from '../../modules/business/Board.js';
import { rivalGroups, portfolio, takeoverPrice, GROUP_STYLES } from '../../modules/business/RivalGroups.js';
import { premisesPrice, PREMISES_CARRY } from '../../modules/business/Business.js';
import { INITIATIVES, PROMOTIONS, initiativesFor, promotionsFor, leverFamily, usesAccounts, initiativeCost, accountEligibility } from '../../modules/business/Initiatives.js';
import { PRICE_LEVELS, PAY_LEVELS, SUPPLIERS, OWNER_DECISIONS, acquisitionPrice, relocationCost } from '../../modules/business/OwnerActions.js';
import { businessOrg, businessRoster, ownerPosition, competitorsOf, TIERS } from '../../modules/org/Businesses.js';
import { RIVAL_STRATEGIES, marketShare, underPriceWar } from '../../modules/business/Rivals.js';
import { locationsByRegion, marketRoom } from '../../modules/org/Businesses.js';
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
  const sections = depts.map(({ dept, head, people }) => disclosure(`biz.dept.${biz.id}.${dept.id}`, `${esc(dept.name)}`, `<p class="fine">${head ? `👤 ${esc(head.name)}, ${esc(head.title)}` : 'Reports directly to you.'} ${button('👋 Hire', 'business.recruit', { arg: dept.id, variant: 'tiny', disabled: searches <= 0, hint: searches > 0 ? 'Interview three applicants' : 'No more searches this year' })}</p>
    ${people.length ? `<ul class="history">${people.map(personRow).join('')}</ul>` : ''}`, { count: `~${dept.headcount} staff` })).join('');
  const ceo = pos.ceo;
  return card('Organization', `
    <p>${chip(`👑 ${pos.title}`, 'honor')} ${chip(pos.stake)} ${chip(`${biz.staff.headcount} staff`)}${org.branches.length ? ` ${chip(`${org.branches.length + 1} locations`)}` : ''}</p>
    ${ceo ? `<p>👔 <b>${esc(ceo.name)}</b> runs it day to day as ${esc(ceo.title)} (performance ${ceo.performance}).</p>` : '<p class="muted">You run it day to day.</p>'}
    <p class="fine">The structure grows with you: a manager layer at ${TIERS.manager}+ staff, executives and finance/HR departments at ${TIERS.executives}+. ${left > 0 ? `${left} people decision${left > 1 ? 's' : ''} left this year.` : 'No more people decisions this year.'}</p>
    <div class="action-grid">${button(ceo ? '👔 Replace the chief executive' : '👔 Hire someone to run it', 'business.appointCeo', { hint: 'You stay the owner' })}${ceo ? button('🗂️ Step back to a passive owner', 'business.makePassive', { hint: 'Frees you to start or buy another business' }) : ''}</div>
    <p class="fine">👋 Hire into any department below: you pick from three applicants, from a cheap beginner to an expensive star (${Math.max(0, searches)} search${searches === 1 ? '' : 'es'} left this year). Firing someone leaves the seat empty.</p>
    ${positionsSection(state, biz, org)}
    ${sections}`, { icon: '🏢' });
}

/** Rivals in your market, and deals you can make with them. */
function marketCard(state, biz) {
  const rivals = competitorsOf(state, biz);
  if (!rivals.length) return '';
  const age = state.character.age;
  const share = marketShare(state, biz, rivals);
  const war = underPriceWar(state, biz, rivals);
  const rows = rivals.map((o) => {
    const b = o.business;
    const st = RIVAL_STRATEGIES[b.strategy];
    const price = acquisitionPrice(biz, o);
    return `<li class="report-row"><div><b>${esc(o.name)}</b> ${st ? chip(`${st.icon} ${st.label}`) : ''} ${(b.scale ?? 1) > 1 ? chip(`📍 ${b.scale} locations`) : ''} ${b.priceWarUntil >= age ? chip('🏷️ Price war', 'warn') : b.price === 'premium' ? chip('💎 Premium prices') : ''}
      <small class="muted">${b.parent ? `owned by ${esc(b.parent)}` : `owner ${esc(o.owner.name)}`} · ~${b.staff} staff · reputation ${b.reputation} · ${b.years ?? 0} yrs${b.founderId ? ' · founded by a former employee' : ''}${b.lastMove ? ` · last move: ${esc(b.lastMove)}` : ''}</small></div>
      <div class="toggle-row">${button(`🤝 Acquire · ${money(price)}`, 'business.acquire', { arg: o.id, variant: 'tiny', disabled: biz.cash < price, hint: 'From the business account' })}${button('🔗 Merge (stock)', 'business.merge', { arg: o.id, variant: 'tiny' })}</div></li>`;
  }).join('');
  return card('Your Market', `${meter(Math.round(share * 100), { max: 100, label: '📊 Your market share', suffix: '%', tone: share >= 0.35 ? 'good' : share >= 0.15 ? 'mid' : 'bad' })}
    ${war ? '<p class="why">🏷️ A rival is running a price war. Match on price (Strategy & Policy) or out-serve them to hold your customers.</p>' : ''}
    <p class="muted">Rivals act every year — price wars, expansions, raiding your staff, ad blitzes, underbidding your contracts — and outside groups buy them up. Reputation, size and price decide who wins customers.</p><ul class="history">${rows}</ul>`, { icon: '🏁' });
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
      ['Locations', `${biz.scale} of ${type.startup ? '—' : maxScale(state, biz)}${!type.startup ? ` · next ${money(nextExpansionCost(state, biz))}` : ''}`],
      !type.startup && biz.scale > 1 ? ['By city', Object.entries(locationsByRegion(state, biz)).map(([r, n]) => `${esc((REGIONS[r]?.name ?? r).split(',')[0])} ${n}/${marketRoom(r)}`).join(' · ')] : null,
    ])}
    ${ok ? '' : '<p class="why">Delegation needs managers: 8+ staff or a second location.</p>'}
    <h4 class="sub">Growth strategy</h4><div class="toggle-row chips-row">${strategies}</div>
    ${report ? `<p class="fine">📋 Last year: ${report.length ? esc(report.join('; ')) : 'nothing needed doing'}.</p>` : ''}
    <div class="action-grid">${button(handedOff ? '✅ Management runs it' : '🗂️ Hand it to management', 'business.handOff', { variant: 'small', disabled: handedOff, hint: 'A general manager (from $40,000 a year) and managers run it day to day, handle routine calls and every delegable duty, on a steady growth plan — you get one report a year' })}
      ${biz.role !== 'operator' ? button('🧑‍💼 Take back day-to-day control', 'business.setRole', { arg: 'operator', variant: 'small', disabled: Boolean(state.career.job), hint: state.career.job ? 'Quit your job first' : 'Run it yourself again' }) : ''}</div>
    <p class="fine">A plan expands from profits, staffs each location, sets marketing and grows the fleet on its own. You can run up to five locations yourself; a management team can grow a chain to sixty across many cities (and fleets to 400 units). Each city only supports so many locations — past that they steal each other's customers, so growth plans open in new cities. Bigger chains get buying power, brand recognition and better-run operations.</p>`, { icon: '🗂️', accent: 'green' });
}

/** Profit levers: initiatives (with what each is worth), promotions and key accounts. */
function leversCard(state, biz) {
  const type = typeOf(biz);
  if (type.startup) return '';
  const age = state.character.age;
  const base = forecast(state, biz).netIncome;
  const on = biz.initiatives ?? {};
  const family = leverFamily(biz.typeId);
  const rows = Object.entries({ ...initiativesFor(biz), ...Object.fromEntries(Object.keys(on).filter((id) => INITIATIVES[id]).map((id) => [id, INITIATIVES[id]])) }).map(([id, i]) => {
    const active = on[id] != null;
    const toggled = { ...on };
    if (active) delete toggled[id];
    else toggled[id] = age;
    const gain = forecast(state, biz, { biz: { initiatives: toggled } }).netIncome - base;
    const worth = active ? -gain : gain;
    const cost = initiativeCost(biz, id);
    return `<li class="report-row"><div>${i.icon} <b>${esc(i.name)}</b> ${active ? chip('On', 'good') : ''} <small class="muted">${esc(i.desc)} · <span class="${worth >= 0 ? 'pos' : 'neg'}">≈${worth >= 0 ? '+' : '−'}${money(Math.abs(worth))}/yr profit</span>${!active && cost ? ` · ${money(cost)} to set up` : ''}</small></div>
      ${button(active ? 'Stop' : 'Start', 'business.toggleInitiative', { arg: id, variant: active ? 'tiny' : 'tiny on', disabled: !active && biz.cash < cost })}</li>`;
  }).join('');
  const promo = biz.promo?.age === age;
  const promos = Object.entries(promotionsFor(biz)).map(([id, p]) => button(`${p.icon} ${p.name}`, 'business.promote', { arg: id, variant: promo && biz.promo.id === id ? 'tiny on' : 'tiny', disabled: promo, hint: `${p.desc}${p.cost ? ` · ${money(p.cost * biz.scale)}` : ''}` })).join('');
  let accounts = '';
  if (usesAccounts(biz)) {
    const mine = (biz.accounts ?? []).map((a) => `<li>🤝 <b>${esc(a.client)}</b> <small>${money(a.value)}/yr · ${a.yearsLeft} of ${a.years} yr left</small> ${button('Walk away', 'business.dropAccount', { arg: a.id, variant: 'tiny', hint: 'Reputation hit' })}</li>`).join('');
    const offers = (biz.accountOffers ?? []).map((k) => {
      const ok = accountEligibility(biz, k);
      return `<li class="${ok.ok ? '' : 'locked'}">${k.renewal ? '🔁' : '📨'} <b>${esc(k.client)}</b> <small>${money(k.value)}/yr · ${k.years} yr${ok.ok ? '' : ` · ${esc(ok.reason)}`}</small> ${button('Sign', 'business.signAccount', { arg: k.id, variant: 'tiny', disabled: !ok.ok })}</li>`;
    }).join('');
    accounts = `<h4 class="sub">${family === 'consumer' ? 'Key accounts' : 'Anchor clients'}</h4><p class="fine">Recurring clients add steady revenue on top of walk-in customers. They renew if quality stays 55+, and leave if it drops below 45.</p>
      ${mine ? `<ul class="history">${mine}</ul>` : '<p class="muted">No key accounts yet.</p>'}
      ${offers ? `<ul class="history">${offers}</ul>` : '<p class="fine">New account offers arrive each year.</p>'}`;
  }
  return card('Profit Levers', `<p class="fine">${{ consumer: 'Levers for a business that serves customers who walk in or book online.', b2b: 'Levers for a firm that sells to other businesses: winning and keeping clients, pricing and utilization.', field: 'Levers for crews, fleets and job sites: bidding, safety, routing and maintenance.' }[family]}</p>
    <ul class="history">${rows}</ul>
    <h4 class="sub">This year's promotion</h4><div class="toggle-row chips-row">${promos}</div>
    ${accounts}
    <p class="fine">Estimates are next year's profit with and without each change. A growth plan (Management & Growth) switches these on and off and signs accounts for you.</p>`, { icon: '🎛️', accent: 'cyan' });
}

/** The holding company: subsidiaries, treasury, payout and acquisitions. */
function conglomerateCard(state) {
  const c = conglomerateOf(state);
  const subs = subsidiaries(state);
  if (!c) {
    if (!subs.length) return '';
    const ok = formEligibility(state);
    return card('Holding Company', `<p class="muted">Incorporate a parent company over your businesses: shared services cut every subsidiary's costs, a central treasury moves cash where it's needed and pays you dividends, and you can own up to ${CONGLOMERATE_HOLDINGS} companies — buying businesses of any kind into the group.</p>
      <div class="action-grid">${button('🏛️ Form a holding company', 'business.formConglomerate', { variant: 'small', disabled: !ok.ok, hint: ok.ok ? `${money(FORM_COST)} in legal fees` : ok.reason })}</div>`, { icon: '🏛️' });
  }
  const revenue = subs.reduce((s, b) => s + (b.lastYear?.revenue ?? 0), 0);
  const profit = subs.reduce((s, b) => s + (b.lastYear?.netIncome ?? 0), 0);
  const value = subs.reduce((s, b) => s + (b.valuation ?? 0) * b.ownerPct, 0) + c.treasury;
  const rows = subs.map((b) => `<li>${BUSINESS_TYPES[b.typeId]?.icon ?? '🏪'} <b>${esc(b.name)}</b> <small class="muted">${esc(BUSINESS_TYPES[b.typeId]?.name ?? '')} · ${b.scale} location${b.scale > 1 ? 's' : ''} · ${money(b.lastYear?.revenue ?? 0)} revenue · <span class="${(b.lastYear?.netIncome ?? 0) < 0 ? 'neg' : 'pos'}">${money(b.lastYear?.netIncome ?? 0)}</span> profit · ${b === state.business.current ? 'you run it' : `${STRATEGIES[b.plan?.strategy ?? 'off'].name.toLowerCase()} plan`}</small></li>`).join('');
  const targets = acquisitionTargets(state).map((o) => ({ o, a: appraise(state, o) })).sort((x, y) => y.a.profit - x.a.profit).slice(0, 8);
  const full = (state.business.holdings ?? []).length >= holdingsCap(state);
  const buys = targets.map(({ o, a }) => `<li class="report-row"><div><b>${BUSINESS_TYPES[o.business.typeId].icon} ${esc(o.name)}</b> <small class="muted">${esc(BUSINESS_TYPES[o.business.typeId].name)} · ~${o.business.staff} staff · reputation ${o.business.reputation} · est. ${money(a.revenue)} revenue, ${money(a.profit)} profit</small></div>
    ${button(`🏛️ Acquire · ${money(a.price)}`, 'business.acquireCompany', { arg: o.id, variant: 'tiny', disabled: full || !canAfford(state, Math.max(0, a.price - c.treasury)), hint: 'Treasury first, then your own money' })}</li>`).join('');
  return card(c.name, `
    ${kv([
      ['Companies', `${subs.length} of ${CONGLOMERATE_HOLDINGS + 1}`],
      ['Group revenue', money(revenue)],
      ['Group profit', `<span class="${profit < 0 ? 'neg' : 'pos'}">${money(profit)}</span>`],
      ['Treasury', money(c.treasury)],
      ['Your stake, all in', money(value)],
      ['Shared-services savings', `${(synergyRate(subs.length) * 100).toFixed(1)}% of revenue · HQ overhead ${money(hqCost(revenue))}/yr`],
      ['Headquarters', `${officeOf(c).icon} ${esc(officeOf(c).name)} · ${hqHeadcount(c)} people · executives ${money(execPayroll(c))}/yr · office ${money(officeCost(c, state))}/yr`],
    ])}
    ${c.lastReport?.length ? `<p class="fine">📋 Last year: ${esc(c.lastReport.join('; '))}.</p>` : ''}
    ${hqSection(state, c)}
    <h4 class="sub">Treasury</h4><div class="toggle-row chips-row">${[100000, 1000000].map((a) => button(`💵 Put in ${money(a)}`, 'business.treasury', { arg: String(a), variant: 'tiny', disabled: !canAfford(state, a) })).join('')}${button(`💸 Take out ${money(Math.max(0, c.treasury - 50000))}`, 'business.treasury', { arg: String(-Math.max(0, c.treasury - 50000)), variant: 'tiny', disabled: c.treasury <= 50000, hint: 'Already taxed — no tax due' })}</div>
    ${mergeSection(state)}
    <h4 class="sub">Dividend to you</h4><div class="toggle-row chips-row">${[0, 0.25, 0.5, 1].map((p) => button(p === 0 ? 'Reinvest all' : `${p * 100}% of spare cash`, 'business.setPayout', { arg: String(p), variant: c.payout === p ? 'tiny on' : 'tiny' })).join('')}</div>
    <ul class="history">${rows}</ul>
    ${disclosure('cong.buy', '🛒 Buy a company into the group', buys ? `<ul class="history">${buys}</ul>` : '<p class="muted">No independent businesses for sale in your market right now.</p>', { count: targets.length })}
    <p class="fine">Each year headquarters sweeps spare cash from subsidiaries (keeping a cushion), covers any that run short, funds the best grower's next location and pays you a dividend. Savings grow with the number of companies; with only two, headquarters may cost more than it saves.</p>`, { icon: '🏛️', accent: 'yellow' });
}

/** Headquarters: the office and the executive team. */
function hqSection(state, c) {
  const office = officeOf(c);
  const execs = c.executives ?? {};
  const full = Object.keys(execs).length >= office.execs;
  const team = Object.entries(EXEC_ROLES).map(([role, r]) => {
    const e = execs[role];
    return `<li class="report-row"><div>${r.icon} <b>${esc(r.title)}</b> <small class="muted">${e ? `${esc(e.name)} · skill ${e.skill} · ${money(e.salary)}/yr` : esc(r.desc)}</small></div>
      ${e ? button('Let go', 'business.fireExec', { arg: role, variant: 'tiny ghost', hint: `${money(e.salary * 0.75)} severance` }) : button('Hire', 'business.hireExec', { arg: role, variant: 'tiny', disabled: full, hint: full ? `Your ${office.name.toLowerCase()} is full` : 'An executive search: three finalists' })}</li>`;
  }).join('');
  const own = ownOffices(state);
  const offices = Object.entries(OFFICES).filter(([id]) => id !== 'own').map(([id, o]) => button(`${o.icon} ${o.name}`, 'business.hqOffice', { arg: id, variant: (c.office ?? 'virtual') === id ? 'tiny on' : 'tiny', hint: `${o.rent ? `${money(o.rent)}/yr` : 'Free'} · up to ${o.execs} executives · ${o.desc}` }))
    .concat(own.map((p) => button(`🏢 Move into your ${esc(p.typeName.split(' (')[0])}`, 'business.hqOffice', { arg: `own:${p.id}`, variant: c.officePropertyId === p.id ? 'tiny on' : 'tiny', hint: OFFICES.own.desc }))).join('');
  return `<h4 class="sub">Headquarters</h4><div class="toggle-row chips-row">${offices}</div>
    <h4 class="sub">Executive team</h4><ul class="history">${team}</ul>${dealDiscount(c) ? `<p class="fine">Your deal team takes ${Math.round(dealDiscount(c) * 100)}% off acquisitions.</p>` : ''}`;
}

/** Subsidiaries in the same line of business can merge into one. */
function mergeSection(state) {
  const groups = mergeCandidates(state);
  if (!groups.length) return '';
  const rows = groups.map((list) => {
    const [a, ...rest] = [...list].sort((x, y) => (y === state.business.current) - (x === state.business.current) || y.scale - x.scale);
    return rest.map((b) => `<li class="report-row"><div>🔗 <b>${esc(b.name)}</b> → <b>${esc(a.name)}</b> <small class="muted">${a.scale + b.scale} locations, ${a.staff.headcount + b.staff.headcount} staff combined</small></div>
      ${button('Merge', 'business.mergeSubsidiaries', { arg: `${a.id}:${b.id}`, variant: 'tiny', hint: `≈${money(MERGE_COST + (a.scale + b.scale) * 5000)} legal & integration` })}</li>`).join('');
  }).join('');
  return `<h4 class="sub">Merge companies</h4><ul class="history">${rows}</ul><p class="fine">One management team and one back office instead of two; locations, fleets, contracts, cash and debt combine.</p>`;
}

/** Your own post in the company: CEO, President & COO or Executive Chair — a job once it's big. */
function postCard(state, biz) {
  const p = biz.ownerPost;
  if (biz.role !== 'executive' || !p) {
    if (!postEligible(biz)) return '';
    const posts = Object.entries(POSTS).map(([id, x]) => button(`${x.icon} ${x.title}`, 'business.takePost', { arg: id, variant: 'small', disabled: x.fullTime && Boolean(state.career.job), hint: `${money(postSalary(biz, id))}/yr · ${x.desc}${x.fullTime && state.career.job ? ' · leave your job first' : ''}` })).join('');
    return card('Work in Your Company', `<p class="muted">${esc(biz.name)} is big enough to need someone at the top who isn't on the shop floor. Take a post: a salary, a bonus after a strong year, a strategy to set and a few big moves a year — reviewed by the board.</p><div class="action-grid">${posts}</div>`, { icon: '👔', accent: 'cyan' });
  }
  const P = POSTS[p.post];
  const used = state.yearly[`business.execMove.${biz.id}`] ?? 0;
  const moves = Object.entries(EXEC_MOVES).map(([id, m]) => button(`${m.icon} ${m.label}`, 'business.execMove', { arg: id, variant: 'small', disabled: used >= EXEC_MOVES_PER_YEAR || Boolean(state.yearly[`business.execMove.${biz.id}.${id}`]), hint: m.desc })).join('');
  const last = biz.board?.meetings?.at(-1);
  return card(`Your Job: ${P.title}`, `
    ${kv([
      ['Company', `${esc(biz.name)} · since age ${p.since} (${p.years} yr in the post)`],
      ['Salary', `${money(p.salary)}/yr (${p.payLevel} pay)`],
      ['Last board review', last ? `${VERDICTS[last.verdict].icon} ${VERDICTS[last.verdict].label} (score ${last.score})` : 'Not yet'],
      ['Big moves this year', `${used} of ${EXEC_MOVES_PER_YEAR}`],
    ])}
    <h4 class="sub">Strategic focus</h4><div class="toggle-row chips-row">${Object.entries(FOCUS).map(([id, f]) => button(`${f.icon} ${f.label}`, 'business.setFocus', { arg: id, variant: p.focus === id ? 'tiny on' : 'tiny', hint: f.desc })).join('')}</div>
    <h4 class="sub">Your pay</h4><div class="toggle-row chips-row">${Object.keys(POST_PAY).map((l) => button(l === 'modest' ? 'Modest' : l === 'market' ? 'Market rate' : 'Top of market', 'business.setPay', { arg: l, variant: p.payLevel === l ? 'tiny on' : 'tiny', hint: money(postSalary(biz, p.post, l)) })).join('')}</div>
    <h4 class="sub">This year's moves</h4><div class="action-grid">${moves}</div>
    <div class="toggle-row">${Object.entries(POSTS).filter(([id]) => id !== p.post).map(([id, x]) => button(`Switch to ${x.title}`, 'business.takePost', { arg: id, variant: 'tiny', disabled: x.fullTime && Boolean(state.career.job) })).join('')}${button('🚪 Step down', 'business.leavePost', { variant: 'tiny danger', hint: 'A hired CEO takes over; the post goes on your record' })}</div>
    <p class="fine">${esc(P.desc)} A board you don't control can replace you after a crisis year or two weak ones in a row.</p>`, { icon: P.icon, accent: 'cyan' });
}

/** The board of directors (or an advisory board). */
function boardCard(state, biz) {
  const b = biz.board;
  if (!b) {
    return card('Board', `<p class="muted">${boardRequired(biz) ? 'A board forms at the end of the year.' : 'No board yet. An advisory board of experienced directors helps a growing business — each brings an expertise that pays off every year.'}</p>
      ${boardRequired(biz) ? '' : `<div class="toggle-row chips-row">${Object.entries(EXPERTISE).map(([id, e]) => button(`${e.icon} ${e.label}`, 'business.appointDirector', { arg: id, variant: 'tiny', hint: `${money(directorFee(biz))}/yr · ${e.desc}` })).join('')}</div>`}`, { icon: '🪑' });
  }
  const KIND = { owner: '👑 You', investor: '💼 Investor director', ceo: '👔 Chief executive', independent: '🎓 Independent' };
  const seats = b.seats.map((x) => `<li>${KIND[x.kind]} · <b>${esc(x.name)}</b> <small class="muted">${x.expertise ? `${EXPERTISE[x.expertise].label} · skill ${x.skill}` : x.partner ? esc(x.partner) : ''}${x.fee ? ` · ${money(x.fee)}/yr` : ''}${x.kind === 'owner' && youChair(biz) ? ' · Chair' : ''}</small> ${x.kind === 'independent' && youChair(biz) ? button('Remove', 'business.removeDirector', { arg: x.id, variant: 'tiny ghost' }) : ''}</li>`).join('');
  const open = vacantSeats(biz);
  const meetings = (b.meetings ?? []).slice().reverse().map((m) => `<li>${VERDICTS[m.verdict].icon} Age ${m.age}: ${VERDICTS[m.verdict].label} (score ${m.score})${m.notes.length ? ` — ${esc(m.notes.join(' '))}` : ''}</li>`).join('');
  return card(b.advisory ? 'Advisory Board' : 'Board of Directors', `
    <p>${chip(`${b.seats.length} of ${b.size ?? boardSize(biz)} seats`)} ${chip(youChair(biz) ? '👑 You chair it' : '⚠️ You don\'t control it', youChair(biz) ? 'green' : 'warn')} ${biz.public ? chip('🔔 Public company') : ''}</p>
    <ul class="history">${seats}</ul>
    ${open ? `<h4 class="sub">Fill an open seat (${open})</h4><div class="toggle-row chips-row">${Object.entries(EXPERTISE).map(([id, e]) => button(`${e.icon} ${e.label}`, 'business.appointDirector', { arg: id, variant: 'tiny', hint: `${money(directorFee(biz))}/yr · ${e.desc}` })).join('')}</div>` : ''}
    ${meetings ? `<h4 class="sub">Board meetings</h4><ul class="history">${meetings}</ul>` : ''}
    <p class="fine">Once a year the board reviews growth, margins and quality. A strong year earns the chief executive a bonus; a board you don't control replaces a CEO — even you — after a crisis or two weak years.</p>`, { icon: '🪑' });
}

/** Every position in the company, rung by rung: who holds it and how many. */
function positionsSection(state, biz, org) {
  const rows = [];
  const pos = ownerPosition(state, biz);
  rows.push(`<tr><td>👑 ${esc(pos.title)}</td><td>${esc(state.character.firstName)} ${esc(state.character.lastName)} (you)</td></tr>`);
  const ceo = org.ceo ? org.people[org.ceo] : null;
  if (ceo) rows.push(`<tr><td>👔 ${esc(ceo.title)}</td><td>${esc(ceo.name)} · performance ${ceo.performance}</td></tr>`);
  for (const d of Object.values(org.departments)) {
    const head = d.head ? org.people[d.head] : null;
    rows.push(`<tr class="total"><td colspan="2">${esc(d.name)} · ~${d.headcount} staff</td></tr>`);
    if (head) rows.push(`<tr><td>🧭 ${esc(head.title)}</td><td>${esc(head.name)}</td></tr>`);
    let named = 0;
    for (const [, levels] of Object.entries(d.seats ?? {})) {
      for (const [, ids] of Object.entries(levels)) {
        const people = ids.map((id) => org.people[id]).filter(Boolean);
        if (!people.length) continue;
        named += people.length;
        const creds = personCreds(people[0], getProfession, levelById);
        rows.push(`<tr><td>${esc(people[0].title)} (${people.length})${creds.length ? `<br><small class="muted">🪪 ${esc(creds.join(', '))}</small>` : ''}</td><td>${people.map((x) => `${esc(x.name)} <small class="muted">${x.age}</small>`).join(', ')}</td></tr>`);
      }
    }
    const rest = Math.max(0, d.headcount - named - (head ? 1 : 0));
    if (rest) rows.push(`<tr><td class="muted">Other staff</td><td class="muted">${rest} people</td></tr>`);
  }
  for (const s of biz.board?.seats ?? []) if (s.kind !== 'owner') rows.push(`<tr><td>🪑 Director</td><td>${esc(s.name)}</td></tr>`);
  return disclosure(`biz.positions.${biz.id}`, '📋 All positions', `<table class="pnl">${rows.join('')}</table>`, { count: rows.length });
}

/** Ten years of results. */
function historyTable(biz) {
  const books = biz.books ?? [];
  if (books.length < 2) return '';
  return disclosure(`biz.books.${biz.id}`, '📈 Results by year', `<table class="pnl"><tr><td><b>Age</b></td><td><b>Revenue</b></td><td><b>Profit</b></td><td><b>Locations</b></td><td><b>Value</b></td></tr>${books.slice().reverse().map((b) => `<tr><td>${b.age}</td><td>${money(b.revenue)}</td><td class="${b.netIncome < 0 ? 'neg' : 'pos'}">${money(b.netIncome)}</td><td>${b.scale}</td><td>${money(b.valuation)}</td></tr>`).join('')}</table>`, { count: books.length });
}

/** Rival conglomerates: who's buying up your markets, and a bid for a whole group. */
function rivalGroupsCard(state) {
  const groups = state.business?.rivalGroups;
  if (!groups?.length) return '';
  const mine = conglomerateOf(state);
  const rows = groups.map((g) => {
    const owned = portfolio(state, g);
    const style = GROUP_STYLES[g.style] ?? GROUP_STYLES.diversified;
    const industries = [...new Set(owned.map((o) => BUSINESS_TYPES[o.business.typeId]?.name).filter(Boolean))].slice(0, 4);
    const price = takeoverPrice(state, g);
    return `<li class="report-row"><div>${style.icon} <b>${esc(g.name)}</b> <small class="muted">${style.label} · ${owned.length} companies${industries.length ? ` (${esc(industries.join(', '))})` : ''} · war chest ${money(g.treasury)}${g.moves?.length ? ` · lately: ${esc(g.moves.slice(-2).join('; '))}` : ''}</small></div>
      ${mine && owned.length ? button(`🏛️ Bid ${money(price)}`, 'business.bidForGroup', { arg: g.name, variant: 'tiny', disabled: !canAfford(state, Math.max(0, price - mine.treasury)), hint: 'Buy the whole group: its companies join yours' }) : ''}</li>`;
  }).join('');
  return card('Rival Conglomerates', `<ul class="history">${rows}</ul><p class="fine">Groups buy up independents — roll-ups go after your industry — bid against you when you buy, make offers for your companies, and try hostile takeovers of public companies you don't control.${mine ? '' : ' Form a holding company to bid for one.'}</p>`, { icon: '⚔️' });
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
/** Put money in, take it out, buy back equity. */
function capitalControls(state, biz) {
  const unit = Math.max(25000, Math.round((biz.lastYear?.revenue ?? 100000) * 0.1 / 25000) * 25000);
  const spare = withdrawable(biz);
  const out = [
    ...[unit, unit * 4].map((a) => button(`💵 Put in ${money(a)}`, 'business.capitalIn', { arg: `${biz.id}:${a}`, variant: 'tiny', disabled: !canAfford(state, a), hint: 'Your money becomes business cash' })),
    button(`💸 Take out ${money(spare)}`, 'business.capitalOut', { arg: `${biz.id}:max`, variant: 'tiny', disabled: spare <= 0, hint: biz.ownerPct < 1 ? `You get ${Math.round(biz.ownerPct * 100)}%; partners get the rest` : 'Spare cash above a working cushion' }),
  ];
  if (biz.ownerPct < 1) {
    const ten = buyBackQuote(biz, 0.1);
    const all = buyBackQuote(biz, 1);
    out.push(button(`🔁 Buy back ${Math.round(ten.pct * 100)}%`, 'business.buyBack', { arg: `${biz.id}:0.1:you`, variant: 'tiny', disabled: !canAfford(state, ten.price) || ten.price <= 0, hint: `${money(ten.price)} of your money` }));
    out.push(button(`🔁 Buy out everyone (${Math.round(all.pct * 1000) / 10}%)`, 'business.buyBack', { arg: `${biz.id}:all:you`, variant: 'tiny', disabled: !canAfford(state, all.price) || all.price <= 0, hint: `${money(all.price)} of your money` }));
    out.push(button('🏦 Company redeems 10%', 'business.buyBack', { arg: `${biz.id}:0.1:company`, variant: 'tiny', disabled: spare < ten.price || ten.price <= 0, hint: `${money(ten.price)} from business cash` }));
  }
  return `<div class="toggle-row chips-row">${out.join('')}</div>`;
}

function holdingsCard(state) {
  const hs = state.business.holdings ?? [];
  if (!hs.length) return '';
  return card('Your Holdings', `<p class="muted">Businesses you own while their management runs them. Profits come to you as distributions.</p>
    <div class="toggle-row chips-row">${Object.entries(STRATEGIES).filter(([id]) => id !== 'off').map(([id, st]) => button(`${st.icon} All on ${st.name}`, 'business.planAll', { arg: id, variant: 'tiny', hint: 'Every company you own (except one you run yourself)' })).join('')}</div><ul class="history">${hs.map((h) => {
    const org = businessOrg(state, h);
    const ceo = org?.people?.[org.ceo];
    return `<li class="report-row"><div><b>${BUSINESS_TYPES[h.typeId]?.icon ?? '🏪'} ${esc(h.name)}</b> <small class="muted">${Math.round(h.ownerPct * 100)}% · valued ${money(h.valuation)} · ${h.staff.headcount} staff${ceo ? ` · run by ${esc(ceo.name)}` : ''}${h.lastYear ? ` · last year ${money(h.lastYear.netIncome)}` : ''}</small></div>
      <div class="toggle-row chips-row">${Object.entries(STRATEGIES).map(([id, st]) => button(`${st.icon} ${st.name}`, 'business.setHoldingPlan', { arg: `${h.id}:${id}`, variant: (h.plan?.strategy ?? 'off') === id ? 'tiny on' : 'tiny', hint: st.desc })).join('')}</div>${h.plan?.lastReport?.length ? `<small class="fine">📋 ${esc(h.plan.lastReport.join('; '))}</small>` : ''}
      <div class="toggle-row">${button('📂 Manage', 'business.focus', { arg: h.id, variant: 'tiny', hint: 'Open its full controls (management keeps running it)' })}${button('🧑‍💼 Take it back', 'business.takeBack', { arg: h.id, variant: 'tiny', disabled: Boolean(currentBusiness(state)) })}${button('🪧 Sell', 'business.sellHolding', { arg: h.id, variant: 'tiny' })}</div>${capitalControls(state, h)}</li>`;
  }).join('')}</ul>`, { icon: '🗂️' });
}

function pnl(ly) {
  if (!ly) return '<p class="muted">First results come at the end of the year.</p>';
  const rows = [
    ['Revenue', ly.revenue], ['Cost of goods', -ly.cogs], ['Payroll & benefits', -ly.payroll], ['HR / delegation overhead', -ly.overhead], ['Managers', -ly.management],
    ['Rent', -ly.rent], ['Insurance', -ly.insurance], ['Marketing', -ly.marketing], ['Initiatives', -(ly.initiatives ?? 0)], ['Filings & accounting', -ly.admin], ['Royalties & ad fund', -(ly.royalties ?? 0)], ['Franchise fees received', ly.franchiseFees ?? 0], ['Royalties received', ly.royaltyIncome ?? 0], ['Franchise support', -(ly.franchiseSupport ?? 0)], ['Interest', -ly.interest],
    ['Your salary', -ly.ownerSalary], ['Payroll tax on your salary', -ly.payrollTax], ['Corporate tax', -ly.corporateTax],
  ].filter(([, v]) => v);
  return `<table class="pnl">${rows.map(([k, v]) => `<tr><td>${k}</td><td class="${v < 0 ? 'neg' : ''}">${money(v)}</td></tr>`).join('')}
    <tr class="total"><td>Net income</td><td class="${ly.netIncome < 0 ? 'neg' : 'pos'}">${money(ly.netIncome)}</td></tr>
    ${ly.writeOffs ? `<tr><td>Write-offs (off-book expenses, bonus depreciation)</td><td class="neg">${money(-ly.writeOffs)}</td></tr><tr><td>Taxable profit</td><td>${money(ly.taxableProfit)}</td></tr>` : ''}</table>
    <p class="fine">You took home ${money(ly.ownerPay ?? 0)}${ly.taxDistribution ? ` (including a ${money(ly.taxDistribution)} tax distribution)` : ''}${ly.seTax ? ` and paid ${money(ly.seTax)} self-employment tax` : ''}${ly.lossDeducted ? `; ${money(ly.lossDeducted)} of losses offset your other income` : ''}.</p>`;
}

/** Open one or several locations this year. */
function expandButtons(state, biz) {
  const limit = openingsPerYear(biz);
  const done = state.yearly['business.expand'] ?? 0;
  const left = Math.max(0, Math.min(limit - done, maxScale(state, biz) - biz.scale));
  const cost = nextExpansionCost(state, biz);
  const disabled = biz.years < 2 || left <= 0;
  const hint = `${money(cost)} each from the business · ${done}/${limit} opened this year`;
  const many = Math.min(left, Math.floor(Math.max(0, biz.cash) / cost));
  return `${button('🏗️ Open a location', 'business.expand', { arg: 'cash:1', hint, disabled: disabled || biz.cash < cost })}${many > 1 ? button(`🏗️ Open ${many} locations`, 'business.expand', { arg: `cash:${many}`, hint, disabled }) : ''}`;
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
  const endorse = endorsementsFor(biz.typeId);
  const crew = crewSize(biz);
  const certRows = endorse.map((id) => {
    const holders = biz.certs ? biz.certs[id] ?? 0 : crew;
    return `<li>🪪 <b>${esc(credentialName(id))}</b> <small class="muted">${holders} of ${crew} crew certified</small> ${holders < crew ? button(`Certify ${crew - holders}`, 'business.certifyCrew', { arg: id, variant: 'tiny', disabled: biz.cash < (crew - holders) * certCost(id), hint: `${money((crew - holders) * certCost(id))} · contracts that need it are staffed by certified people` }) : ''}</li>`;
  }).join('');
  return card(o.unit ? 'Fleet & Contracts' : 'Crews & Contracts', `${certRows ? `<h4 class="sub">Crew certifications</h4><ul class="history">${certRows}</ul>` : ''}
    ${kv([
      fleet ? ['Fleet', fleet] : null,
      ['Staff', `${biz.staff.headcount}${biz.role === 'operator' ? ' + you' : ''} · ${o.crew > 1 ? `crews of ${o.crew}` : `one ${o.crewName} per ${o.unit?.name ?? 'post'}`}`],
      ['Accounts you can win', ((t) => `${['Local', 'Regional', 'Multi-state', 'National'][t]}${t < 3 ? ` · grow to ${[2, 4, 8][t] * o.start}+ ${o.unit ? o.unit.plural : `${o.crewName} crews`} for ${['regional', 'multi-state', 'national'][t]} work` : ''}`)(growthTier(biz))],
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
      ${biz.typeId === 'privateFireService' ? ((ok, t) => button(`✈️ Bid on the ${t.airport} ARFF contract`, 'business.airportBid', { variant: 'small', disabled: !ok.ok, hint: ok.ok ? `${t.units} station${t.units > 1 ? 's' : ''}, ${t.years} years · $${AIRPORT_BID_COST.toLocaleString()} proposal` : ok.reason }))(airportBidEligibility(state, biz), airportTender(state, biz)) : ''}
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
      biz.heritage ? ['Founded', `${biz.heritage.since} by ${esc(biz.heritage.founder)} · ${biz.heritage.generation}${['th', 'st', 'nd', 'rd'][biz.heritage.generation] ?? 'th'}-generation family business`] : ['Founded', `age ${biz.foundedAge} (${biz.years} yr)`],
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
    <h4 class="sub">Last year</h4>${pnl(biz.lastYear)}${historyTable(biz)}`, { icon: type.icon, accent: 'green' });

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
      ${type.startup ? '' : expandButtons(state, biz)}
    </div>
    ${relatives.length ? `<h4 class="sub">Family business</h4><div class="toggle-row chips-row">${relatives.map((p) => button(`👪 Hire ${esc(p.firstName)}`, 'business.hireRelative', { arg: p.id, variant: 'tiny' })).join('')}</div>` : ''}`, { icon: '⚙️' });

  const funding = card('Funding & Structure', `
    <div class="action-grid">
      ${type.startup ? button(nextRound ? `💸 Raise a ${nextRound.name}` : '💸 No more rounds', 'business.raise', { disabled: !nextRound || biz.entity !== 'ccorp', hint: biz.entity !== 'ccorp' ? 'Convert to a C-corp first' : nextRound ? `${money(nextRound.minArr)}+ ARR, ${Math.round(nextRound.minGrowth * 100)}%+ growth` : 'IPO or acquisition next' }) : button('🏦 SBA working-capital loan', 'business.loan', { hint: '25% of revenue · personal guarantee', disabled: biz.years < 2 })}
      ${!type.startup && biz.scale < maxScale(state, biz) ? button('🏗️ Expand with an SBA loan', 'business.expand', { arg: 'sba', disabled: biz.years < 2 || (state.yearly['business.expand'] ?? 0) >= openingsPerYear(biz) }) : ''}
    </div>
    <h4 class="sub">Owner's capital</h4>${capitalControls(state, biz)}
    ${type.startup || !type.rent ? '' : `<h4 class="sub">Premises</h4><p class="fine">You own ${biz.premises?.owned ?? 0} of ${biz.scale} location buildings${biz.premises?.value ? ` (worth ${money(biz.premises.value)})` : ''}. Owning swaps rent for property tax and upkeep (${Math.round(PREMISES_CARRY * 100)}% of value a year).</p>
    <div class="toggle-row chips-row">${button(`🏢 Buy a building · ${money(premisesPrice(state, biz))}`, 'business.buyPremises', { arg: 'cash', variant: 'tiny', disabled: (biz.premises?.owned ?? 0) >= biz.scale || biz.cash < premisesPrice(state, biz) })}${button('🏦 Buy with an SBA 504 loan', 'business.buyPremises', { arg: 'loan', variant: 'tiny', disabled: (biz.premises?.owned ?? 0) >= biz.scale, hint: `${money(premisesPrice(state, biz) * 0.15)} down` })}${biz.premises?.owned ? button('🔁 Sale-leaseback', 'business.saleLeaseback', { variant: 'tiny', hint: 'Sell one building, rent it back' }) : ''}</div>`}
    ${biz.public ? `<p>${chip('🔔 Public company')} Listed at age ${biz.public.since} at a ${money(biz.public.ipoPrice)} valuation.</p>` : ''}
    <h4 class="sub">Legal structure</h4><div class="toggle-row chips-row">${Object.entries(ENTITIES).map(([id, e]) => button(`${e.icon} ${e.name}`, 'business.convert', { arg: id, variant: biz.entity === id ? 'tiny on' : 'tiny', disabled: biz.entity === id || (ventureBacked(biz) && id !== 'ccorp'), hint: biz.entity === id ? '' : '$1,500 to convert' })).join('')}</div>
    ${biz.investors.length ? `<h4 class="sub">Investors</h4><ul class="history">${biz.investors.map((i) => `<li>💼 ${esc(i.round)} · ${money(i.invested)} for ${Math.round(i.pct * 100)}%</li>`).join('')}</ul>` : ''}`, { icon: '🏦' });

  const exit = card('Exit', `<p class="muted">Sell to a buyer, wind it down, or file business bankruptcy. ${entity.liability ? 'Your entity shields personal assets — except debts you personally guaranteed.' : 'As a sole proprietor, every business debt is yours.'}</p>
    <div class="action-grid">${button('💼 Sell a 25% stake', 'business.sellStake', { arg: '0.25', disabled: biz.ownerPct < 0.45 || biz.valuation <= 0 })}${button('💼 Sell a 49% stake', 'business.sellStake', { arg: '0.49', disabled: biz.ownerPct < 0.69 || biz.valuation <= 0 })}${(state.people?.list ?? []).filter((p) => p.alive && ['spouse', 'partner', 'child', 'sibling'].includes(p.relation) && state.character.age + p.ageOffset >= 18).map((p) => button(`👪 Hand it to ${esc(p.firstName)}`, 'business.giveToFamily', { arg: p.id })).join('')}</div>
    <div class="action-grid">${button('🪧 Put it up for sale', 'business.sell', { disabled: Boolean(state.yearly['business.sell']) || biz.valuation <= 0, hint: `≈${money(biz.valuation * biz.ownerPct)} for your stake` })}${button('🔒 Close it', 'business.close', { variant: 'danger' })}${button('⚖️ Business bankruptcy', 'business.bankrupt', { variant: 'danger' })}</div>`, { icon: '🚪' });
  return `${overview}${postCard(state, biz)}${managementCard(state, biz)}${boardCard(state, biz)}${advisorCard(state, biz)}${leversCard(state, biz)}${fleetCard(state, biz)}${equipmentCard(state, 'business')}${licensesCard(state, biz)}${orgCard(state, biz)}${marketCard(state, biz)}${ops}${policyCard(state, biz)}${funding}${exit}`;
}

export function businessView(state) {
  if (!state.business) return '';
  const biz = currentBusiness(state);
  if (biz) return `${conglomerateCard(state)}${ownedView(state, biz)}${holdingsCard(state)}${rivalGroupsCard(state)}${historyCard(state)}`;
  if (state.character.age < 18) return card('Business', empty('You can start a business at 18. For now, try a part-time job.'), { icon: '🏪' });
  return `${conglomerateCard(state)}${holdingsCard(state)}${rivalGroupsCard(state)}${startCard(state)}${franchiseCard(state)}${listingsCard(state)}${historyCard(state)}`;
}
