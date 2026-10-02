/**
 * Money tab: finances, every retirement income source (pensions with
 * vesting status, 401(k)/TSP, Social Security estimate, military/VA), and
 * where you live (cost of living, locality, relocation).
 */
import { esc, money, button, card, chip, kv, empty } from '../Components.js';
import { netWorth } from '../../core/State.js';
import { planStatus, socialSecurityEstimate, primaryInsuranceAmount, SS_FULL_AGE } from '../../modules/retirement/RetirementEngine.js';
import { PENSION_PLANS } from '../../modules/retirement/PensionPlans.js';
import { REGIONS, MOVE_COST, regionOf } from '../../modules/life/Regions.js';
import { hasHousingBenefit, healthPremium } from '../../modules/life/Finances.js';

export function moneyView(state) {
  const f = state.finances;
  const r = state.retirement;
  const age = state.character.age;
  const ly = f.lastYear;

  const finances = card('Finances', `${kv([
    ['Cash', `<b class="${f.cash < 0 ? 'neg' : 'pos'}">${money(f.cash)}</b>`],
    ['Retirement accounts', money(r.dc)],
    ['Student loans', f.loans ? `<span class="neg">${money(f.loans)}</span>` : '$0'],
    ['Net worth', `<b>${money(netWorth(state))}</b>`],
    ['Lifetime earnings', money(f.lifetimeEarnings)],
    ['Lifetime taxes', money(f.taxesPaid)],
    f.bankruptcies ? ['Bankruptcies', `<span class="neg">${f.bankruptcies}</span>`] : null,
  ])}
  ${ly ? `<h4 class="sub">Last year</h4>${kv([['Gross income', money(ly.gross)], ['Pre-tax retirement', money(ly.deductions ?? 0)], ['Income tax', money(ly.tax)], ['Living costs', money(ly.living)], ['Health insurance', money(ly.insurance ?? 0)], ['Loan payments', money(ly.loanPayment)]])}` : ''}`, { icon: '💰', accent: 'green' });

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
      ${button('🏖️ Retire', 'retirement.retire', { disabled: r.retired || age < 50, hint: 'Ends your job; eligible pensions start' })}
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

  return `${finances}${retirement}${home}`;
}
