/**
 * Business tab: start or buy a business, then run it — P&L, staff and
 * delegation, benefits, marketing, funding (SBA, venture rounds), valuation
 * and exits.
 */
import { esc, money, button, card, chip, kv, meter, select, empty } from '../Components.js';
import { BUSINESS_TYPES, ENTITIES, MARKETING, ROUNDS, SBA, SIZE_OPTIONS, sizesFor, startupCostFor, businessesFor } from '../../modules/business/BusinessTypes.js';
import { ownershipRules } from '../../modules/business/OwnershipRules.js';
import { PRICE_LEVELS, PAY_LEVELS, SUPPLIERS, OWNER_DECISIONS, acquisitionPrice } from '../../modules/business/OwnerActions.js';
import { businessOrg, businessRoster, ownerPosition, competitorsOf, TIERS } from '../../modules/org/Businesses.js';
import { REGIONS } from '../../modules/life/Regions.js';
import { currentBusiness, typeOf, startEligibility, fundingCheck, yearFinancials, newBusiness, holdsLicense, debtBalance, guaranteedDebt, LICENSEE_ONLY } from '../../modules/business/Business.js';
import { WORKFORCE_MODES } from '../../modules/career/ContractingSystem.js';
import { DUTIES } from '../../modules/career/ManagementEngine.js';
import { credentialName } from '../../modules/credentials/CredentialRegistry.js';
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
  const order = Object.entries(BUSINESS_TYPES).sort(([a], [b]) => (fromCareer.has(b) ? 1 : 0) - (fromCareer.has(a) ? 1 : 0));
  const rows = order.map(([id, t]) => {
    const cash = startEligibility(state, id, 'cash');
    const sba = startEligibility(state, id, 'sba');
    const sizes = sizesFor(t);
    const costs = sizes.map((z) => money(startupCostFor(t, z))).join(' – ');
    const blocked = !cash.ok && !sba.ok;
    const needs = t.credentials.length ? `Needs ${t.credentials.map(credentialName).join(' or ')}${t.minExperience ? ` + ${t.minExperience} yrs experience` : ''}` : 'No license needed';
    const est = t.startup ? 'Venture-scale: most fail, a few get huge' : `≈${money(estimate(state, id))}/yr to the owner once established`;
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
  }).join('');
  return card('Start a Business', `${!rules.canOperate ? `<p class="fine">⚖️ ${esc(rules.notes.at(-1) ?? 'You can own a business but someone else will have to run it.')}</p>` : ''}${fromCareer.size ? '<p class="fine">Businesses that grow out of your career are listed first — your experience makes you a better owner.</p>' : ''}<p class="muted">Licensed trades and professions need the license. Pay cash or take an SBA 7(a) loan (10% down, ${Math.round(SBA.rate * 1000) / 10}% for ${SBA.years} years, ${SBA.minScore}+ credit, personal guarantee). Your legal structure decides taxes and how much of your life is on the line if it fails.</p>
    <ul class="programs">${rows}</ul>
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
  const sections = depts.map(({ dept, head, people }) => `<h4 class="sub">${esc(dept.name)} <small class="muted">~${dept.headcount} staff</small></h4>
    ${head ? `<p class="fine">👤 ${esc(head.name)}, ${esc(head.title)}</p>` : `<p class="fine">Reports directly to you.</p>`}
    ${people.length ? `<ul class="history">${people.map(personRow).join('')}</ul>` : ''}`).join('');
  const ceo = pos.ceo;
  return card('Organization', `
    <p>${chip(`👑 ${pos.title}`, 'honor')} ${chip(pos.stake)} ${chip(`${biz.staff.headcount} staff`)}${org.branches.length ? ` ${chip(`${org.branches.length + 1} locations`)}` : ''}</p>
    ${ceo ? `<p>👔 <b>${esc(ceo.name)}</b> runs it day to day as ${esc(ceo.title)} (performance ${ceo.performance}).</p>` : '<p class="muted">You run it day to day.</p>'}
    <p class="fine">The structure grows with you: a manager layer at ${TIERS.manager}+ staff, executives and finance/HR departments at ${TIERS.executives}+. ${left > 0 ? `${left} people decision${left > 1 ? 's' : ''} left this year.` : 'No more people decisions this year.'}</p>
    <div class="action-grid">${button(ceo ? '👔 Replace the chief executive' : '👔 Hire someone to run it', 'business.appointCeo', { hint: 'You stay the owner' })}${ceo ? button('🗂️ Step back to a passive owner', 'business.makePassive', { hint: 'Frees you to start or buy another business' }) : ''}</div>
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
    <div class="action-grid">${button('🛠️ Buy equipment', 'business.invest', { arg: 'equipment', hint: `${money(type.cost * 0.15 * Math.max(1, biz.scale))} · +quality` })}${button('🖥️ Invest in technology', 'business.invest', { arg: 'technology', hint: `${money(type.cost * 0.08 * Math.max(1, biz.scale))} · +quality` })}${button('🏦 Pay down debt', 'business.payDown', { disabled: !biz.debts.sba })}</div>
    ${!type.startup ? `<h4 class="sub">Locations</h4>
      <ul class="history"><li>📍 Main location${org ? ` · ${esc((REGIONS[org.regionId] ?? REGIONS.midcity).name.split(',')[0])}` : ''}</li>${(org?.branches ?? []).map((b) => `<li>📍 ${esc(org.departments[b.deptId]?.name ?? b.city)} ${button('Close', 'business.closeLocation', { arg: b.deptId, variant: 'tiny danger' })}</li>`).join('')}</ul>
      <p class="fine">Next location opens in: ${regions.map((r) => button(r.name.split(',')[0], 'business.expandTo', { arg: r.id, variant: (biz.expandTo ?? state.character.regionId) === r.id ? 'tiny on' : 'tiny' })).join(' ')}</p>` : ''}`, { icon: '🧭' });
}

/** Businesses you own but don't run. */
function holdingsCard(state) {
  const hs = state.business.holdings ?? [];
  if (!hs.length) return '';
  return card('Your Holdings', `<p class="muted">Businesses you own while their management runs them. Profits come to you as distributions.</p><ul class="history">${hs.map((h) => {
    const org = businessOrg(state, h);
    const ceo = org?.people?.[org.ceo];
    return `<li class="report-row"><div><b>${BUSINESS_TYPES[h.typeId]?.icon ?? '🏪'} ${esc(h.name)}</b> <small class="muted">${Math.round(h.ownerPct * 100)}% · valued ${money(h.valuation)} · ${h.staff.headcount} staff${ceo ? ` · run by ${esc(ceo.name)}` : ''}${h.lastYear ? ` · last year ${money(h.lastYear.netIncome)}` : ''}</small></div>
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
      ${type.startup ? `${button('🤝 Hire 5', 'business.hire', { arg: '5' })}${button('✂️ Lay off 30%', 'business.layoff', { variant: 'danger', disabled: !s.headcount })}` : button('🏗️ Open another location', 'business.expand', { arg: 'cash', hint: `${money(type.cost * 0.8)} from the business`, disabled: biz.scale >= 5 || biz.years < 2 })}
    </div>
    ${relatives.length ? `<h4 class="sub">Family business</h4><div class="toggle-row chips-row">${relatives.map((p) => button(`👪 Hire ${esc(p.firstName)}`, 'business.hireRelative', { arg: p.id, variant: 'tiny' })).join('')}</div>` : ''}`, { icon: '⚙️' });

  const funding = card('Funding & Structure', `
    <div class="action-grid">
      ${type.startup ? button(nextRound ? `💸 Raise a ${nextRound.name}` : '💸 No more rounds', 'business.raise', { disabled: !nextRound || biz.entity !== 'ccorp', hint: biz.entity !== 'ccorp' ? 'Convert to a C-corp first' : nextRound ? `${money(nextRound.minArr)}+ ARR, ${Math.round(nextRound.minGrowth * 100)}%+ growth` : 'IPO or acquisition next' }) : button('🏦 SBA working-capital loan', 'business.loan', { hint: '25% of revenue · personal guarantee', disabled: biz.years < 2 })}
      ${!type.startup && biz.scale < 5 ? button('🏗️ Expand with an SBA loan', 'business.expand', { arg: 'sba', disabled: biz.years < 2 }) : ''}
    </div>
    <h4 class="sub">Legal structure</h4><div class="toggle-row chips-row">${Object.entries(ENTITIES).map(([id, e]) => button(`${e.icon} ${e.name}`, 'business.convert', { arg: id, variant: biz.entity === id ? 'tiny on' : 'tiny', disabled: biz.entity === id || (biz.investors.length && id !== 'ccorp'), hint: biz.entity === id ? '' : '$1,500 to convert' })).join('')}</div>
    ${biz.investors.length ? `<h4 class="sub">Investors</h4><ul class="history">${biz.investors.map((i) => `<li>💼 ${esc(i.round)} · ${money(i.invested)} for ${Math.round(i.pct * 100)}%</li>`).join('')}</ul>` : ''}`, { icon: '🏦' });

  const exit = card('Exit', `<p class="muted">Sell to a buyer, wind it down, or file business bankruptcy. ${entity.liability ? 'Your entity shields personal assets — except debts you personally guaranteed.' : 'As a sole proprietor, every business debt is yours.'}</p>
    <div class="action-grid">${button('💼 Sell a 25% stake', 'business.sellStake', { arg: '0.25', disabled: biz.ownerPct < 0.45 || biz.valuation <= 0 })}${button('💼 Sell a 49% stake', 'business.sellStake', { arg: '0.49', disabled: biz.ownerPct < 0.69 || biz.valuation <= 0 })}${(state.people?.list ?? []).filter((p) => p.alive && ['spouse', 'partner', 'child', 'sibling'].includes(p.relation) && state.character.age + p.ageOffset >= 18).map((p) => button(`👪 Hand it to ${esc(p.firstName)}`, 'business.giveToFamily', { arg: p.id })).join('')}</div>
    <div class="action-grid">${button('🪧 Put it up for sale', 'business.sell', { disabled: Boolean(state.yearly['business.sell']) || biz.valuation <= 0, hint: `≈${money(biz.valuation * biz.ownerPct)} for your stake` })}${button('🔒 Close it', 'business.close', { variant: 'danger' })}${button('⚖️ Business bankruptcy', 'business.bankrupt', { variant: 'danger' })}</div>`, { icon: '🚪' });
  return `${overview}${orgCard(state, biz)}${marketCard(state, biz)}${ops}${policyCard(state, biz)}${funding}${exit}`;
}

export function businessView(state) {
  if (!state.business) return '';
  const biz = currentBusiness(state);
  if (biz) return `${ownedView(state, biz)}${holdingsCard(state)}${historyCard(state)}`;
  if (state.character.age < 18) return card('Business', empty('You can start a business at 18. For now, try a part-time job.'), { icon: '🏪' });
  return `${holdingsCard(state)}${startCard(state)}${franchiseCard(state)}${listingsCard(state)}${historyCard(state)}`;
}
