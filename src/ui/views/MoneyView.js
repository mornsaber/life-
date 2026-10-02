/**
 * Money tab: finances, every retirement income source (pensions with
 * vesting status, 401(k)/TSP, Social Security estimate, military/VA), and
 * where you live (cost of living, locality, relocation).
 */
import { bankruptcyOptions } from '../../modules/life/Bankruptcy.js';
import { esc, money, button, card, chip, kv, empty } from '../Components.js';
import { netWorth, investmentsValue, creditLimit, availableCredit } from '../../core/State.js';
import { investView } from './InvestView.js';
import { planStatus, socialSecurityEstimate, primaryInsuranceAmount, SS_FULL_AGE, earlyRetirementEligible } from '../../modules/retirement/RetirementEngine.js';
import { PENSION_PLANS } from '../../modules/retirement/PensionPlans.js';
import { REGIONS, MOVE_COST, regionOf } from '../../modules/life/Regions.js';
import { hasHousingBenefit, healthPremium } from '../../modules/life/Finances.js';

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
    ['Card balance', cardDebt ? `<span class="neg">${money(cardDebt)}</span> at 15% APR` : '$0'],
    ['Available credit', money(availableCredit(state))],
    medical ? ['Medical debt', `<span class="neg">${money(medical)}</span>`] : null,
    f.loans ? ['Student loans', `${money(f.loans)} <small>(not dischargeable)</small>`] : null,
    f.ch13 ? ['Chapter 13 plan', `${money(f.ch13.annual)}/yr · ${f.ch13.yearsLeft} yr left`] : null,
    f.lastBankruptcy ? ['Last bankruptcy', `Chapter ${f.lastBankruptcy.chapter} at age ${f.lastBankruptcy.age}`] : null,
  ])}
  <p class="fine">Purchases you choose go on cash, then cards up to your limit — past it, they're declined. Bills, taxes and fines still pile up.</p>
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
  const rows = Object.values(REGIONS).map((rg) => `<li class="region-row ${rg.id === here.id ? 'here' : ''}">
    <span>${rg.icon} <b>${esc(rg.name)}</b> <small>${rg.type}</small></span>
    <small>Cost of living ×${rg.col.toFixed(2)} · private pay ×${rg.market.toFixed(2)} · federal locality +${Math.round(rg.locality * 100)}%</small>
    ${rg.id === here.id ? chip('You live here', 'good') : button('Move', 'region.move', { arg: rg.id, variant: 'tiny', disabled: age < 18, title: state.career.job && !state.career.job.remote ? 'You will have to leave your job' : '' })}
  </li>`).join('');
  const home = card('Where You Live', `
    <p>${here.icon} <b>${esc(here.name)}</b> ${hasHousingBenefit(state) ? chip('🏡 Housing provided by employer', 'good') : ''} ${healthPremium(state, ly?.gross ?? 0) ? chip('🩺 Buying marketplace insurance', 'warn') : ''}</p>
    <p class="fine">Moving costs ${money(MOVE_COST)} and ends jobs that can't follow you (remote jobs and big employers can transfer you instead).</p>
    <ul class="history">${rows}</ul>`, { icon: '🗺️' });

  return `${finances}${debtCard(state)}${investView(state)}${retirement}`;
}
