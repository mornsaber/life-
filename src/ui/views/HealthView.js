/**
 * Health tab: coverage, conditions (treatment toggles and yearly cost under
 * your plan), mental health and trauma, addiction and rehab, medical debt,
 * disability coverage and VA rating.
 */
import { esc, money, button, card, chip, meter, kv, empty } from '../Components.js';
import {
  CONDITIONS, KINDS, REHAB_COST, coverage, estimateOutOfPocket, vaCovers, dutyDisqualifier, disablingConditions, conditionMortality, VA_COMPENSATION, DUTY_STANDARD,
} from '../../modules/health/index.js';

import { THERAPIES, MEDS, therapyCost, isMental } from '../../modules/health/MentalHealth.js';
import { STAGES, ssdiEligibility, ssdiAmount, approvalOdds, ATTORNEY_CAP } from '../../modules/health/SSDI.js';

/** Therapy and medication choices for depression, anxiety and PTSD. */
function carePlan(state, c) {
  if (!isMental(c) || c.remission) return '';
  const care = c.care;
  const therapies = Object.entries(THERAPIES).filter(([, t]) => !t.ptsd || c.id === 'ptsd').map(([id, t]) => button(`${t.icon} ${t.name}`, 'mental.therapy', { arg: `${c.id}:${id}`, variant: care?.therapy === id ? 'tiny on' : 'tiny', hint: t.desc })).join('');
  const meds = Object.entries(MEDS).filter(([, m]) => (!m.anxietyOnly || c.id === 'anxiety') && (!m.ptsdOnly || c.id === 'ptsd')).map(([id, m]) => button(`${m.icon} ${m.name}`, 'mental.meds', { arg: `${c.id}:${id}`, variant: care?.meds === id ? 'tiny on' : 'tiny', hint: `${m.desc} Side effects: ${m.sideEffects}.` })).join('');
  const status = care ? [
    care.therapy ? `${THERAPIES[care.therapy].name}${care.waitlist ? ' (waitlisted)' : ''}${care.inNetwork ? '' : ' · out of network'} · ≈${money(therapyCost(state, { ...care, waitlist: false }))}/yr` : null,
    care.meds ? `${MEDS[care.meds].name.split(' (')[0]} · year ${care.medYears}${care.taper ? ' · tapering' : ''}` : null,
  ].filter(Boolean).join(' · ') : 'No care plan';
  return `<div class="care-plan"><small>${esc(status)}</small>
    <div class="toggle-row chips-row">${therapies}${care?.therapy ? button('Switch therapist', 'mental.switchTherapist', { arg: c.id, variant: 'tiny ghost' }) + button('Stop therapy', 'mental.therapy', { arg: `${c.id}:none`, variant: 'tiny ghost' }) : ''}</div>
    <div class="toggle-row chips-row">${meds}${care?.meds ? button('📉 Taper off', 'mental.meds', { arg: `${c.id}:taper`, variant: 'tiny ghost', hint: 'Safer than stopping cold turkey' }) + button('Stop now', 'mental.meds', { arg: `${c.id}:stop`, variant: 'tiny ghost' }) : ''}</div></div>`;
}

const fmtPct = (x) => (x === Infinity ? 'all' : `${Math.round(x * 100)}%`);
const fmtMoney = (x) => (x === Infinity ? 'none' : money(x));

function coverageCard(state) {
  const plan = coverage(state);
  const h = state.health;
  return card('Coverage', `
    <p class="big-status">${plan.icon} <b>${esc(plan.name)}</b> ${plan.id === 'none' ? chip('Uninsured', 'bad') : ''}</p>
    ${kv([
      ['Your premium', `${money(plan.premium)}/yr`],
      ['Deductible', fmtMoney(plan.deductible)],
      ['Coinsurance', fmtPct(plan.coinsurance)],
      ['Out-of-pocket max', fmtMoney(plan.oopMax)],
      ['Paid this year', money(state.yearly['health.oop'] ?? 0)],
      h.va.rating ? ['VA care', `Service-connected care covered (${h.va.rating}% rating)`] : null,
    ])}
    <div class="toggle-row">
      ${button('🩺 Annual checkup', 'health.checkup', { variant: 'small', disabled: Boolean(state.yearly['health.checkup']), hint: 'Free preventive care; catches silent conditions early' })}
      ${button(h.marketplace ? '🛒 Marketplace backup: ON' : '🛒 Marketplace backup: OFF', 'health.toggleMarketplace', { variant: h.marketplace ? 'small on' : 'small', hint: 'Buy an ACA plan when nothing else covers you' })}
    </div>
    <p class="fine">Plans by circumstance: employer, TRICARE, a parent's plan to 26, Medicare at 65 (or after 2 yrs of SSDI), Medicaid on low income (not in TX/FL unless disabled), marketplace, or nothing.</p>`, { icon: '🏥', accent: plan.id === 'none' ? 'red' : 'green' });
}

function conditionRow(state, c) {
  const def = CONDITIONS[c.id];
  const cost = def.annualCost ? estimateOutOfPocket(state, def.annualCost, c) : 0;
  const addiction = def.kind === 'addiction';
  const risk = conditionMortality(c);
  const action = c.remission ? '' : addiction
    ? button('🏥 Rehab', 'health.rehab', { arg: c.id, variant: 'tiny', disabled: Boolean(state.yearly['health.rehab']), hint: `~${money(estimateOutOfPocket(state, REHAB_COST, c))}` })
    : isMental(c) ? '' : button(c.treated ? 'Stop treatment' : 'Treat', 'health.treat', { arg: c.id, variant: 'tiny' });
  return `<li class="cond-row">
    <span class="cond-name">${def.icon} <b>${esc(def.name)}</b> ${chip(KINDS[def.kind].name)} ${c.serviceConnected ? chip('Service-connected', 'warn') : ''} ${c.remission ? chip('Remission', 'good') : c.treated ? chip('Treated', 'good') : chip(addiction ? 'Active' : 'Untreated', 'bad')}</span>
    ${c.remission ? '<span></span>' : meter(c.severity, { tone: c.severity >= 70 ? 'bad' : c.severity >= 40 ? 'mid' : 'good', label: 'Severity', suffix: '' })}
    ${action || '<span></span>'}
    <small>since age ${c.onsetAge}${risk >= 0.005 ? ` · ${(risk * 100).toFixed(1)}%/yr mortality` : ''}${def.annualCost && !c.remission && !isMental(c) ? ` · treatment ~${money(cost)}/yr out of pocket${vaCovers(state, c) ? ' (VA)' : ''}` : ''}</small>
    ${carePlan(state, c)}
  </li>`;
}

export function healthView(state) {
  const h = state.health;
  if (!h) return '';
  const known = h.conditions.filter((c) => c.diagnosed);
  const active = known.filter((c) => !c.remission);
  const past = known.filter((c) => c.remission);
  const ffd = dutyDisqualifier(state);
  const standard = state.military.service ? 'military' : DUTY_STANDARD[state.career.job?.professionId];
  const disabling = disablingConditions(state);
  const d = h.disability;

  const conditions = card('Conditions', `
    ${active.length ? `<ul class="history">${active.map((c) => conditionRow(state, c)).join('')}</ul>` : empty('No diagnosed conditions. Annual checkups catch silent ones (blood pressure, diabetes, early cancer).')}
    ${past.length ? `<h4 class="sub">In remission / recovery</h4><ul class="history">${past.map((c) => conditionRow(state, c)).join('')}</ul>` : ''}
    ${standard ? `<p class="${ffd ? 'why' : 'req'}">${ffd ? `✗ Fails the ${standard} fitness-for-duty standard: ${esc(CONDITIONS[ffd.id].name)}` : `✓ Meets the ${standard} fitness-for-duty standard`}</p>` : ''}`, { icon: '🩺', accent: active.some((c) => !c.treated) ? 'yellow' : '' });

  const mind = card('Mind & Trauma', `
    ${meter(Math.min(100, h.trauma), { tone: h.trauma >= 40 ? 'bad' : h.trauma >= 20 ? 'mid' : 'good', label: 'Traumatic exposure', suffix: '' })}
    <p class="fine">Combat, emergency calls, first-responder and CPS casework, prison and disasters build up exposure; it fades with time. High exposure can become PTSD — therapy (or VA care for service-connected PTSD) helps.</p>
    <p class="fine">Therapy works slowly and lasts; medication works faster with side effects; together they work best. In a crisis, call or text <b>988</b> (Suicide &amp; Crisis Lifeline) any time.</p>`, { icon: '🧠' });

  const benefits = d.benefits.map((b) => `<li><b>${esc(b.label)}</b> — ${money(b.annual)}/yr until ${b.endAge}</li>`).join('');
  const disability = card('Disability & VA', `
    ${kv([
      ['Long-term disability policy', d.policy ? 'Yes (1.5% of salary)' : 'No'],
      ['VA rating', h.va.rating ? `${h.va.rating}% · ${money(VA_COMPENSATION[h.va.rating])}/yr` : 'None'],
      h.disability.ssdiYears ? ['Years on SSDI', h.disability.ssdiYears] : null,
      d.ssdiClaim ? ['SSDI claim', `${STAGES[d.ssdiClaim.stage].label} · filed at ${d.ssdiClaim.filedAge}${d.ssdiClaim.denials ? ` · denied ${d.ssdiClaim.denials}×` : ''}${d.ssdiClaim.lawyer ? ' · attorney' : ''} · ≈${Math.round(approvalOdds(state, d.ssdiClaim.stage, d.ssdiClaim.lawyer) * 100)}% odds`] : null,
      state.retirement.ssEarnings?.length >= 5 ? ['SSDI if approved', `${money(ssdiAmount(state))}/yr`] : null,
    ])}
    ${benefits ? `<ul class="history">${benefits}</ul>` : ''}
    ${disabling.length ? `<p class="why">Disabling: ${disabling.map((c) => esc(CONDITIONS[c.id].name)).join(', ')}</p>` : ''}
    <div class="toggle-row">
      ${button(d.policy ? '🛡️ Cancel disability policy' : '🛡️ Buy disability insurance', 'health.toggleDisabilityPolicy', { variant: d.policy ? 'small on' : 'small', hint: 'Pays 60% of salary if you can\'t work' })}
      ${button('♿ Claim disability', 'health.claimDisability', { variant: 'small', disabled: !disabling.length || d.benefits.length > 0, hint: 'LTD, an SSDI application and disability retirement' })}
      ${(() => { const e = ssdiEligibility(state); return button('📨 Apply for SSDI', 'ssdi.apply', { variant: 'small', disabled: !e.ok, hint: e.ok ? 'Most first applications are denied; appeals often win' : e.reason }); })()}
      ${state.military.history.length ? button('🇺🇸 File VA claim', 'health.vaClaim', { variant: 'small', hint: 'Re-rate service-connected conditions' }) : ''}
    </div>
    <p class="fine">SSDI: 5-month waiting period; initial decisions approve about 1 in 3; a hearing before a judge comes a year or more later. Disability attorneys take 25% of back pay (max ${money(ATTORNEY_CAP)}). Medicare after 24 months of benefits.</p>`, { icon: '♿' });

  const debt = h.medicalDebt ? card('Medical Debt', `
    <p><b class="neg">${money(h.medicalDebt)}</b> ${h.collections ? chip('In collections', 'bad') : ''}</p>
    ${button('💵 Pay it down', 'health.payMedicalDebt', { variant: 'small', disabled: state.finances.cash <= 0 })}
    <p class="fine">Payments of 10%/yr come out automatically. Big balances relative to income can be discharged in bankruptcy.</p>`, { icon: '🧾', accent: 'red' }) : '';

  const history = h.history.length ? card('Medical History', `<ul class="history">${[...h.history].reverse().slice(0, 12).map((e) => `<li><small>Age ${e.age}</small> ${esc(e.text)}</li>`).join('')}</ul>`, { icon: '📋' }) : '';

  return `${coverageCard(state)}${conditions}${debt}${mind}${disability}${history}`;
}
