/**
 * Money tab: finances, every retirement income source (pensions with
 * vesting status, 401(k)/TSP, Social Security estimate, military/VA), and
 * where you live (cost of living, locality, relocation).
 */
import { bankruptcyOptions } from '../../modules/life/Bankruptcy.js';
import { esc, money, button, card, chip, kv, empty, disclosure } from '../Components.js';
import { netWorth, investmentsValue, creditLimit, availableCredit } from '../../core/State.js';
import { investView } from './InvestView.js';
import { planStatus, socialSecurityEstimate, primaryInsuranceAmount, SS_FULL_AGE, earlyRetirementEligible } from '../../modules/retirement/RetirementEngine.js';
import { PENSION_PLANS } from '../../modules/retirement/PensionPlans.js';
import { REGIONS, MOVE_COST, regionOf } from '../../modules/life/Regions.js';
import { hasHousingBenefit, healthPremium } from '../../modules/life/Finances.js';
import { CARD_TYPES, cardApr, applyCheck, minimumPayoff } from '../../modules/life/CreditCards.js';
import { standardDeduction, auditOdds, PASSPORT_THRESHOLD } from '../../modules/life/Taxes.js';
import { regionsHere } from '../../modules/life/Regions.js';

/** Your wallet: cards, rewards, payoff strategy and balance transfers. */
function walletSection(state) {
  const c = state.finances.cards;
  if (!c) return '';
  const debt = Math.max(0, -state.finances.cash);
  const held = c.held.map((x) => {
    const t = CARD_TYPES[x.typeId];
    return `<li class="fund-row"><span>${t.icon} <b>${esc(t.name)}</b> <small>${(t.apr * 100).toFixed(1)}% APR${t.fee ? ` · ${money(t.fee)}/yr fee` : ''}${t.rewards ? ` · ${(t.rewards * 100).toFixed(1)}% back` : ''} · since ${x.opened}</small></span>${button('Close', 'cards.close', { arg: x.id, variant: 'tiny ghost' })}</li>`;
  }).join('');
  const offers = Object.entries(CARD_TYPES).filter(([id]) => !c.held.some((x) => x.typeId === id)).map(([id, t]) => {
    const ok = applyCheck(state, id);
    return button(`${t.icon} ${t.name}`, 'cards.apply', { arg: id, variant: 'tiny', disabled: !ok.ok, hint: ok.ok ? t.desc : ok.reason });
  }).join('');
  const trap = debt > 1000 ? minimumPayoff(debt, cardApr(state)) : null;
  const hasPromoCard = c.held.some((x) => CARD_TYPES[x.typeId].promo);
  return `<h4 class="sub">Wallet</h4>
    ${held ? `<ul class="history">${held}</ul>` : '<p class="muted">No cards of your own yet — you\'re on a basic bank card.</p>'}
    ${c.rewards ? `<p class="fine">Lifetime rewards earned: ${money(c.rewards)}.</p>` : ''}
    ${c.transfer ? `<p>🔁 ${money(c.transfer.amount)} at 0% until age ${c.transfer.untilAge}.</p>` : ''}
    <h4 class="sub">Paying it down</h4><div class="toggle-row">
      ${button('🔥 Pay it down hard', 'cards.strategy', { arg: 'payoff', variant: c.strategy !== 'minimum' ? 'small on' : 'small', hint: 'Tighter budget, out of debt fast' })}
      ${button('🐌 Minimum payments', 'cards.strategy', { arg: 'minimum', variant: c.strategy === 'minimum' ? 'small on' : 'small', hint: trap ? `${trap.years >= 60 ? 'Never' : `${trap.years} yr`} to clear · ${money(trap.interest)} interest` : 'More to spend now, much more interest' })}
      ${hasPromoCard && !c.transfer && debt >= 500 ? button('🔁 Transfer balance to 0%', 'cards.transfer', { variant: 'small', hint: `4% fee (${money(debt * 0.04)}) · 2 years interest-free` }) : ''}
    </div>
    ${disclosure('credit.apply', '💳 Apply for a card', `<div class="toggle-row">${offers}</div>`)}`;
}

/** Last return, deductions, IRS debt and audits. */
function taxCard(state) {
  const f = state.finances;
  const t = f.tax;
  const ly = f.lastYear;
  if (state.character.age < 18 || !t) return '';
  const it = ly?.itemized;
  const married = Boolean(ly?.married);
  return card('Taxes', `${kv([
    ly ? ['Last return', `${money(ly.federalTax ?? 0)} federal + ${money(ly.stateTax ?? 0)} state · ${it ? 'itemized' : 'standard deduction'}`] : null,
    it ? ['Itemized', `${money(it.total)} (mortgage interest ${money(it.mortgageInterest)}, SALT ${money(it.salt)}, charity ${money(it.charity)}${it.medical ? `, medical ${money(it.medical)}` : ''}) vs. standard ${money(standardDeduction(married))}`] : ['Standard deduction', money(standardDeduction(married))],
    ['Audit risk this year', `${(auditOdds(state) * 100).toFixed(1)}%`],
    t.debt ? ['Owed to the IRS', `<span class="neg">${money(t.debt)}</span>${t.plan ? ` · plan ${money(t.plan.annual)}/yr` : ' · no payment plan'}`] : null,
    t.lien != null ? ['Federal tax lien', `<span class="neg">filed at ${t.lien}</span>`] : null,
    t.passport ? ['Passport', `<span class="neg">certified seriously delinquent (over ${money(PASSPORT_THRESHOLD)})</span>`] : null,
    t.audits.length ? ['Audits', t.audits.map((a) => `${a.age}: ${a.result}${a.owed ? ` (${money(a.owed)})` : ''}`).join(' · ')] : null,
  ])}
  ${t.debt ? `<div class="toggle-row">${button('💵 Pay the IRS', 'taxes.payDebt', { variant: 'small', disabled: f.cash <= 0 })}${t.plan ? '' : button('📅 Request an installment plan', 'taxes.requestPlan', { variant: 'small', hint: '$130 setup · stops liens and levies' })}</div>` : ''}
  <p class="fine">You itemize automatically when mortgage interest, state and local taxes (capped at $40,000), charity and large medical bills beat the standard deduction. Taxes you can't pay become IRS debt with penalties and interest.</p>`, { icon: '🧾' });
}

/** Credit cards, debt and bankruptcy. */
function debtCard(state) {
  const f = state.finances;
  if (state.character.age < 18) return '';
  const limit = creditLimit(state);
  const cardDebt = Math.max(0, -f.cash);
  const medical = state.health?.medicalDebt ?? 0;
  const opts = bankruptcyOptions(state);
  const filing = opts.debt >= 5000 || f.ch13;
  const option = (o, chapter, label, hint) => button(label, 'finances.fileBankruptcy', { arg: String(chapter), variant: 'small danger', disabled: !o.ok, hint: o.ok ? hint : o.reason });
  return card('Credit & Debt', `${kv([
    ['Credit limit', `${money(limit)} <small>(score ${state.housing.credit.score})</small>`],
    ['Card balance', cardDebt ? `<span class="neg">${money(cardDebt)}</span> at ${(cardApr(state) * 100).toFixed(1)}% APR` : '$0'],
    ['Available credit', money(availableCredit(state))],
    medical ? ['Medical debt', `<span class="neg">${money(medical)}</span>`] : null,
    f.loans ? ['Student loans', `${money(f.loans)} <small>(not dischargeable)</small>`] : null,
    f.ch13 ? ['Chapter 13 plan', `${money(f.ch13.annual)}/yr · ${f.ch13.yearsLeft} yr left`] : null,
    f.lastBankruptcy ? ['Last bankruptcy', `Chapter ${f.lastBankruptcy.chapter} at age ${f.lastBankruptcy.age}`] : null,
  ])}
  <p class="fine">Purchases you choose go on cash, then cards up to your limit — past it, they're declined. Bills and fines still pile up.</p>
  ${walletSection(state)}
  ${filing ? `<h4 class="sub">Bankruptcy</h4>
    <p class="fine">Means test: income ${money(opts.income)} vs. your state median ${money(opts.median)}. Homestead exemption: ${Number.isFinite(opts.preview.exemption) ? money(opts.preview.exemption) : 'unlimited'}${opts.preview.homeLost ? ' — Chapter 7 would sell your home' : ''}. Student loans and child support survive either chapter.</p>
    <div class="toggle-row">${option(opts.ch7, 7, '⚖️ File Chapter 7', 'Wipes card & medical debt; non-exempt assets sold; 10 yrs on credit')}${option(opts.ch13, 13, '📆 File Chapter 13', opts.ch13.ok ? `${opts.ch13.years} yrs × ${money(opts.ch13.annual)}; keep your property` : '')}</div>` : ''}`, { icon: '💳', accent: cardDebt > limit ? 'red' : '' });
}

export function moneyView(state) {
  const f = state.finances;
  const r = state.retirement;
  const age = state.character.age;
  const ly = f.lastYear;

  const finances = card('Finances', `${kv([
    ['Cash', `<b class="${f.cash < 0 ? 'neg' : 'pos'}">${money(f.cash)}</b>`],
    ['Retirement accounts', money(r.dc)],
    state.investing ? ['Investments', money(investmentsValue(state))] : null,
    ['Student loans', f.loans ? `<span class="neg">${money(f.loans)}</span>` : '$0'],
    ['Net worth', `<b>${money(netWorth(state))}</b>`],
    ['Lifetime earnings', money(f.lifetimeEarnings)],
    ['Lifetime taxes', money(f.taxesPaid)],
    ['Credit score', state.housing.credit.score],
    f.bankruptcies ? ['Bankruptcies', `<span class="neg">${f.bankruptcies}</span>`] : null,
  ])}
  ${ly ? `<h4 class="sub">Last year</h4>${kv([['Gross income', money(ly.gross)], ly.ltcg ? ['…of which LTCG/dividends', money(ly.ltcg)] : null, ['Pre-tax retirement', money(ly.deductions ?? 0)], ['Federal income tax', money(ly.federalTax ?? ly.tax)], ['State income tax', money(ly.stateTax ?? 0)], ['Living costs', money(ly.living)], ['Health insurance', money(ly.insurance ?? 0)], ['Loan payments', money(ly.loanPayment)]])}` : ''}`, { icon: '💰', accent: 'green' });

  const plans = Object.keys(r.plans).map((id) => {
    const s = planStatus(state, id);
    return `<li><b>🏦 ${esc(s.def.name)}</b> ${s.plan.started ? chip('Paying', 'good') : s.vested ? chip('Vested', 'good') : chip(`Vesting ${s.plan.years}/${s.def.vest}`, 'warn')} ${s.active ? chip('Active job') : ''}
      <small>${s.plan.years} yrs credit · est. ${money(s.annuity)}/yr · ${esc(s.def.rule)}${s.def.ssCovered ? '' : ' · ⚠️ no Social Security'}</small></li>`;
  }).join('');
  const pensions = r.pensions.map((p) => `<li><b>${esc(p.label)}</b> — ${money(p.annual)}/yr${age < p.startAge ? ` starting at ${p.startAge}` : ''}${p.cola ? ` <small>+${(p.cola * 100).toFixed(1)}% COLA</small>` : ''}</li>`).join('');
  const pia = primaryInsuranceAmount(r.ssEarnings);
  const retirement = card('Retirement', `
    ${kv([
      ['Status', r.retired ? '🏖️ Retired' : 'Working age'],
      ['401(k)/403(b)/457/TSP', money(r.dc)],
      ['Covered earning years', `${r.ssEarnings.length} of 35`],
      ['Social Security', r.socialSecurity ? `${money(r.socialSecurity.annual)}/yr (claimed at ${r.socialSecurity.claimAge})` : `≈${money(pia * 12)}/yr at ${SS_FULL_AGE}${age >= 62 ? ` · ${money(socialSecurityEstimate(state))} if claimed now` : ''}`],
    ])}
    <h4 class="sub">Pension plans</h4>${plans ? `<ul class="history">${plans}</ul>` : empty('No pension service credit. Public employers and some union/corporate jobs offer pensions.')}
    <h4 class="sub">Income in retirement</h4>${pensions ? `<ul class="history">${pensions}</ul>` : empty('No pensions or benefits yet.')}
    <div class="action-grid">
      ${button('🏖️ Retire', 'retirement.retire', { disabled: r.retired || (age < 50 && !earlyRetirementEligible(state)), hint: age < 50 && earlyRetirementEligible(state) ? 'Early retirement: your pension pays out now' : 'Ends your job; eligible pensions start' })}
      ${r.retired ? button('💼 Un-retire', 'retirement.unretire') : ''}
      ${button('🇺🇸 Claim Social Security', 'retirement.claimSocialSecurity', { disabled: Boolean(r.socialSecurity) || age < 62, hint: 'Age 62–70; waiting raises it 8%/yr' })}
      ${button('🏧 Withdraw $10K', 'retirement.withdraw', { disabled: r.dc <= 0, hint: age < 60 ? '10% early penalty' : 'Penalty-free' })}
    </div>
    <p class="fine">Plans: ${Object.values(PENSION_PLANS).map((p) => p.short).join(' · ')}. Medals raise military retired pay.</p>`, { icon: '🏦', accent: 'yellow' });

  const here = regionOf(state);
  const rows = regionsHere(state).map((rg) => `<li class="region-row ${rg.id === here.id ? 'here' : ''}">
    <span>${rg.icon} <b>${esc(rg.name)}</b> <small>${rg.type}</small></span>
    <small>Cost of living ×${rg.col.toFixed(2)} · private pay ×${rg.market.toFixed(2)} · federal locality +${Math.round(rg.locality * 100)}%</small>
    ${rg.id === here.id ? chip('You live here', 'good') : button('Move', 'region.move', { arg: rg.id, variant: 'tiny', disabled: age < 18, title: state.career.job && !state.career.job.remote ? 'You will have to leave your job' : '' })}
  </li>`).join('');
  const home = card('Where You Live', `
    <p>${here.icon} <b>${esc(here.name)}</b> ${hasHousingBenefit(state) ? chip('🏡 Housing provided by employer', 'good') : ''} ${healthPremium(state, ly?.gross ?? 0) ? chip('🩺 Buying marketplace insurance', 'warn') : ''}</p>
    <p class="fine">Moving costs ${money(MOVE_COST)} and ends jobs that can't follow you (remote jobs and big employers can transfer you instead).</p>
    ${disclosure('money.regions', 'All places', `<ul class="history">${rows}</ul>`, { count: regionsHere(state).length })}`, { icon: '🗺️' });

  return `${finances}${debtCard(state)}${taxCard(state)}${investView(state)}${retirement}`;
}
