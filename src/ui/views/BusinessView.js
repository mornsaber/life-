/**
 * Business tab: start or buy a business, then run it — P&L, staff and
 * delegation, benefits, marketing, funding (SBA, venture rounds), valuation
 * and exits.
 */
import { esc, money, button, card, chip, kv, meter, select, empty } from '../Components.js';
import { BUSINESS_TYPES, ENTITIES, MARKETING, ROUNDS, SBA } from '../../modules/business/BusinessTypes.js';
import { currentBusiness, typeOf, startEligibility, fundingCheck, yearFinancials, newBusiness, holdsLicense, debtBalance, guaranteedDebt, LICENSEE_ONLY } from '../../modules/business/Business.js';
import { WORKFORCE_MODES } from '../../modules/career/ContractingSystem.js';
import { DUTIES } from '../../modules/career/ManagementEngine.js';
import { credentialName } from '../../modules/credentials/CredentialRegistry.js';

const MEAN_RNG = { float: (a, b) => (a + b) / 2, int: (a, b) => Math.round((a + b) / 2), chance: () => false, pick: (xs) => xs[0], id: () => 'probe' };
const entityOptions = (value = 'llc') => Object.entries(ENTITIES).map(([id, e]) => ({ value: id, label: `${e.icon} ${e.name}` })).sort((a, b) => (a.value === value ? -1 : b.value === value ? 1 : 0));

/** Typical profit at full ramp for a new owner-operator (deterministic estimate). */
function estimate(state, typeId) {
  const probe = newBusiness(MEAN_RNG, state, typeId, { years: 3, quality: 55, reputation: 50 });
  probe.role = 'operator';
  const ly = yearFinancials(state, probe, MEAN_RNG);
  return ly.netIncome + ly.ownerSalary;
}

function startCard(state) {
  const rows = Object.entries(BUSINESS_TYPES).map(([id, t]) => {
    const cash = startEligibility(state, id, 'cash');
    const sba = startEligibility(state, id, 'sba');
    const blocked = !cash.ok && !sba.ok;
    const needs = t.credentials.length ? `Needs ${t.credentials.map(credentialName).join(' or ')}${t.minExperience ? ` + ${t.minExperience} yrs experience` : ''}` : 'No license needed';
    const est = t.startup ? 'Venture-scale: most fail, a few get huge' : `≈${money(estimate(state, id))}/yr to the owner once established`;
    return `<li class="program ${blocked ? 'locked' : ''}" data-collect-root>
      <div><b>${t.icon} ${esc(t.name)}</b><small>${money(t.cost)} to start · ${esc(needs)} · ${esc(est)}</small>
        ${blocked ? `<small class="why">${esc(cash.reason)}</small>` : ''}</div>
      <div class="enroll-form">
        <input type="hidden" data-part="type" value="${id}">
        ${select('funding', [
          ...(cash.ok || t.startup ? [{ value: 'cash', label: '💵 Pay cash' }] : []),
          ...(!t.startup ? [{ value: 'sba', label: `🏦 SBA loan (${money(t.cost * SBA.downPayment)} down)` }] : []),
        ])}
        ${select('entity', entityOptions(t.startup ? 'ccorp' : 'llc'))}
        ${button('Start', 'business.start', { variant: 'small primary', collect: true, disabled: blocked })}
      </div>
    </li>`;
  }).join('');
  return card('Start a Business', `<p class="muted">Licensed trades and professions need the license. Pay cash or take an SBA 7(a) loan (10% down, ${Math.round(SBA.rate * 1000) / 10}% for ${SBA.years} years, ${SBA.minScore}+ credit, personal guarantee). Your legal structure decides taxes and how much of your life is on the line if it fails.</p>
    <ul class="programs">${rows}</ul>
    <h4 class="sub">Legal structures</h4><ul class="history">${Object.values(ENTITIES).map((e) => `<li>${e.icon} <b>${esc(e.name)}</b> <small>${esc(e.desc)}${e.admin ? ` · ${money(e.admin)}/yr in filings` : ''}</small></li>`).join('')}</ul>`, { icon: '🏪', accent: 'green' });
}

function listingsCard(state) {
  const listings = state.business.listings;
  if (!listings.length || state.character.age < 21) return '';
  const rows = listings.map((l) => {
    const t = BUSINESS_TYPES[l.typeId];
    const lic = LICENSEE_ONLY.includes(l.typeId) && !holdsLicense(state, t);
    const cash = fundingCheck(state, l.price, 'cash', t);
    const sba = fundingCheck(state, l.price, 'sba', t);
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
  return card('Business History', `<ul class="history">${[...h].reverse().map((b) => `<li>${BUSINESS_TYPES[b.typeId]?.icon ?? '🏪'} <b>${esc(b.name)}</b> <small>age ${b.startAge}–${b.endAge} · ${esc(b.outcome)}${b.proceeds ? ` · ${money(b.proceeds)}` : ''}</small></li>`).join('')}</ul>`, { icon: '🗂️' });
}

function pnl(ly) {
  if (!ly) return '<p class="muted">First results come at the end of the year.</p>';
  const rows = [
    ['Revenue', ly.revenue], ['Cost of goods', -ly.cogs], ['Payroll & benefits', -ly.payroll], ['HR / delegation overhead', -ly.overhead], ['Managers', -ly.management],
    ['Rent', -ly.rent], ['Insurance', -ly.insurance], ['Marketing', -ly.marketing], ['Filings & accounting', -ly.admin], ['Interest', -ly.interest],
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
    <div class="action-grid">${button('🪧 Put it up for sale', 'business.sell', { disabled: Boolean(state.yearly['business.sell']) || biz.valuation <= 0, hint: `≈${money(biz.valuation * biz.ownerPct)} for your stake` })}${button('🔒 Close it', 'business.close', { variant: 'danger' })}${button('⚖️ Business bankruptcy', 'business.bankrupt', { variant: 'danger' })}</div>`, { icon: '🚪' });
  return `${overview}${ops}${funding}${exit}`;
}

export function businessView(state) {
  if (!state.business) return '';
  const biz = currentBusiness(state);
  if (biz) return `${ownedView(state, biz)}${historyCard(state)}`;
  if (state.character.age < 18) return card('Business', empty('You can start a business at 18. For now, try a part-time job.'), { icon: '🏪' });
  return `${startCard(state)}${listingsCard(state)}${historyCard(state)}`;
}
