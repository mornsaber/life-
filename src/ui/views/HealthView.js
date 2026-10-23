/**
 * Health tab: coverage, conditions (treatment toggles and yearly cost under
 * your plan), mental health and trauma, addiction and rehab, medical debt,
 * disability coverage and VA rating.
 */
import { systemHere, privatePremium, goPrivateCost, levySurcharge } from '../../modules/health/HealthSystems.js';
import { esc, money, button, card, chip, meter, kv, empty, select } from '../Components.js';
import {
  CONDITIONS, KINDS, REHAB_COST, coverage, estimateOutOfPocket, vaCovers, dutyDisqualifier, disablingConditions, conditionMortality, VA_COMPENSATION, DUTY_STANDARD,
} from '../../modules/health/index.js';

import { THERAPIES, MEDS, therapyCost, isMental } from '../../modules/health/MentalHealth.js';
import { ssdiEligibility, ssdiAmount, approvalOdds, ATTORNEY_CAP, disabilityHere, disabilityName, stageLabel } from '../../modules/health/SSDI.js';
import { countryOf } from '../../modules/world/Countries.js';
import { VETERANS } from '../../modules/world/CountryLaw.js';

/** Therapy and medication for depression, anxiety and PTSD: two pickers, not a wall of buttons. */
function carePlan(state, c) {
  if (!isMental(c) || c.remission) return '';
  const care = c.care ?? {};
  const therapies = Object.entries(THERAPIES).filter(([, t]) => !t.ptsd || c.id === 'ptsd');
  const meds = Object.entries(MEDS).filter(([, m]) => (!m.anxietyOnly || c.id === 'anxiety') && (!m.ptsdOnly || c.id === 'ptsd'));
  const t = care.therapy ? THERAPIES[care.therapy] : null;
  const m = care.meds ? MEDS[care.meds] : null;
  const therapyOpts = [...therapies.map(([id, x]) => ({ value: id, label: `${x.icon} ${x.name}` })), ...(t ? [{ value: 'none', label: 'Stop therapy' }] : [])];
  const medOpts = [...meds.map(([id, x]) => ({ value: id, label: `${x.icon} ${x.name.split(' (')[0]}` })), ...(m ? [{ value: 'taper', label: '📉 Taper off (safer)' }, { value: 'stop', label: 'Stop now' }] : [])];
  return `<div class="care-plan">
    <div class="care-line" data-collect-root>
      <span class="care-label">Therapy</span>
      <input type="hidden" data-part="c" value="${esc(c.id)}">${select('t', therapyOpts, { value: care.therapy ?? '' })}
      ${button(t ? 'Change' : 'Start', 'mental.therapy', { variant: 'tiny', collect: true })}
    </div>
    ${t ? `<small class="care-note">${esc(t.name)}${care.waitlist ? ' · waitlisted' : ''}${care.inNetwork ? '' : ' · out of network'} · ≈${money(therapyCost(state, { ...care, waitlist: false }))}/yr ${button('Switch therapist', 'mental.switchTherapist', { arg: c.id, variant: 'tiny ghost' })}</small>` : `<small class="care-note">${esc(therapies[0][1].desc)}</small>`}
    <div class="care-line" data-collect-root>
      <span class="care-label">Medication</span>
      <input type="hidden" data-part="c" value="${esc(c.id)}">${select('m', medOpts, { value: care.meds ?? '' })}
      ${button(m ? 'Change' : 'Start', 'mental.meds', { variant: 'tiny', collect: true })}
    </div>
    ${m ? `<small class="care-note">${esc(m.name.split(' (')[0])} · year ${care.medYears}${care.taper ? ' · tapering' : ''} · side effects: ${esc(m.sideEffects)}</small>` : ''}
  </div>`;
}

const fmtPct = (x) => (x === Infinity ? 'all' : `${Math.round(x * 100)}%`);
const fmtMoney = (x) => (x === Infinity ? 'none' : money(x));

function coverageCard(state) {
  const plan = coverage(state);
  const sys = systemHere(state);
  const abroad = (state.character.countryId ?? 'US') !== 'US';
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
      ${abroad ? '' : button(h.marketplace ? '🛒 Marketplace backup: ON' : '🛒 Marketplace backup: OFF', 'health.toggleMarketplace', { variant: h.marketplace ? 'small on' : 'small', hint: 'Buy an ACA plan when nothing else covers you' })}
      ${sys?.private && (plan.id === 'national' || h.privateCover) ? button(h.privateCover ? `🛡️ ${sys.private.name}: ON` : `🛡️ ${sys.private.name}: OFF`, 'health.togglePrivateCover', { variant: h.privateCover ? 'small on' : 'small', hint: `${money(privatePremium(state))}/yr · ${sys.private.skipsWait ? 'skip waiting lists' : 'covers co-payments'}` }) : ''}
    </div>
    ${sys ? `<p class="fine">${sys.wait ? `⏳ Non-urgent specialist care waits about ${sys.wait} months on the ${esc(sys.waitName)}.` : 'No waiting lists to speak of.'}${sys.note ? ` ${esc(sys.note)}` : ''}${levySurcharge(state) ? ` You pay a ${money(levySurcharge(state))} Medicare Levy Surcharge without private hospital cover.` : ''}</p>` : ''}
    <p class="fine">${abroad ? `Everyone who lives here is covered by ${esc(countryOf(state).health.name)}, paid for through taxes and contributions: small co-payments, capped each year, and no medical debt spiral.` : 'Plans by circumstance: employer, TRICARE, a parent\'s plan to 26, Medicare at 65 (or after 2 yrs of SSDI), Medicaid on low income (not in TX/FL unless disabled), marketplace, or nothing.'}</p>`, { icon: '🏥', accent: plan.id === 'none' ? 'red' : 'green' });
}

function conditionRow(state, c) {
  const def = CONDITIONS[c.id];
  const cost = def.annualCost ? estimateOutOfPocket(state, def.annualCost, c) : 0;
  const addiction = def.kind === 'addiction';
  const risk = conditionMortality(c);
  const action = c.remission ? '' : addiction
    ? button('🏥 Rehab', 'health.rehab', { arg: c.id, variant: 'tiny', disabled: Boolean(state.yearly['health.rehab']), hint: `~${money(estimateOutOfPocket(state, REHAB_COST, c))}` })
    : c.waitUntil != null ? button('🏥 Go private', 'health.goPrivate', { arg: c.id, variant: 'tiny', hint: money(goPrivateCost(state, def)) })
      : isMental(c) ? '' : button(c.treated ? 'Stop treatment' : 'Treat', 'health.treat', { arg: c.id, variant: 'tiny' });
  const status = c.remission ? chip('Remission', 'good') : c.waitUntil != null ? chip(`⏳ Waiting list to ${c.waitUntil}`, 'warn') : c.treated || (isMental(c) && (c.care?.therapy || c.care?.meds)) ? chip(isMental(c) ? 'In care' : 'Treated', 'good') : chip(addiction ? 'Active' : 'Untreated', 'bad');
  const meta = [KINDS[def.kind].name, `since age ${c.onsetAge}`, risk >= 0.005 ? `${(risk * 100).toFixed(1)}%/yr mortality` : null, def.annualCost && !c.remission && !isMental(c) ? `treatment ~${money(cost)}/yr${vaCovers(state, c) ? ' (VA)' : ''}` : null, c.serviceConnected ? 'service-connected' : null].filter(Boolean).join(' · ');
  return `<li class="cond-row">
    <div class="cond-head"><span class="cond-name">${def.icon} <b>${esc(def.name)}</b></span>${status}</div>
    <small class="cond-meta">${esc(meta)}</small>
    ${c.remission ? '' : `<div class="cond-body">${meter(c.severity, { tone: c.severity >= 70 ? 'bad' : c.severity >= 40 ? 'mid' : 'good', label: 'Severity', suffix: '' })}${action}</div>`}
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
    ${active.length ? `<ul class="cond-list">${active.map((c) => conditionRow(state, c)).join('')}</ul>` : empty('No diagnosed conditions. Annual checkups catch silent ones (blood pressure, diabetes, early cancer).')}
    ${past.length ? `<h4 class="sub">In remission / recovery</h4><ul class="cond-list">${past.map((c) => conditionRow(state, c)).join('')}</ul>` : ''}
    ${standard ? `<p class="${ffd ? 'why' : 'req'}">${ffd ? `✗ Fails the ${standard} fitness-for-duty standard: ${esc(CONDITIONS[ffd.id].name)}` : `✓ Meets the ${standard} fitness-for-duty standard`}</p>` : ''}`, { icon: '🩺', accent: active.some((c) => !c.treated) ? 'yellow' : '' });

  const mind = card('Mind & Trauma', `
    ${meter(Math.min(100, h.trauma), { tone: h.trauma >= 40 ? 'bad' : h.trauma >= 20 ? 'mid' : 'good', label: 'Traumatic exposure', suffix: '' })}
    <p class="fine">Combat, emergency calls, first-responder and CPS casework, prison and disasters build up exposure; it fades with time. High exposure can become PTSD — therapy (or VA care for service-connected PTSD) helps.</p>
    <p class="fine">Therapy works slowly and lasts; medication works faster with side effects; together they work best. In a crisis, call or text <b>988</b> (Suicide &amp; Crisis Lifeline) any time.</p>`, { icon: '🧠' });

  const benefits = d.benefits.map((b) => `<li><b>${esc(b.label)}</b> — ${money(b.annual)}/yr until ${b.endAge}</li>`).join('');
  // Veterans of other countries' forces claim through their own veterans' agency.
  const lastNation = state.military.history.at(-1)?.nation;
  const vetCare = lastNation ? VETERANS[lastNation]?.care ?? null : null;
  const disability = card(vetCare || state.character.countryId ? 'Disability & Veterans' : 'Disability & VA', `
    ${kv([
      ['Long-term disability policy', d.policy ? 'Yes (1.5% of salary)' : 'No'],
      !vetCare && !h.va.rating && (state.character.countryId ?? 'US') !== 'US' ? null : [vetCare ? 'Service disability rating' : 'VA rating', h.va.rating ? `${h.va.rating}% · ${money(VA_COMPENSATION[h.va.rating])}/yr` : 'None'],
      h.disability.ssdiYears ? [`Years on ${disabilityName(state)}`, h.disability.ssdiYears] : null,
      d.ssdiClaim ? [`${disabilityName(state)} claim`, `${stageLabel(state, d.ssdiClaim.stage)} · filed at ${d.ssdiClaim.filedAge}${d.ssdiClaim.denials ? ` · denied ${d.ssdiClaim.denials}×` : ''}${d.ssdiClaim.lawyer ? ' · attorney' : ''} · ≈${Math.round(approvalOdds(state, d.ssdiClaim.stage, d.ssdiClaim.lawyer) * 100)}% odds`] : null,
      state.retirement.ssEarnings?.length >= (disabilityHere(state)?.minYears ?? 5) ? [`${disabilityName(state)} if approved`, `${money(ssdiAmount(state))}/yr`] : null,
    ])}
    ${benefits ? `<ul class="history">${benefits}</ul>` : ''}
    ${disabling.length ? `<p class="why">Disabling: ${disabling.map((c) => esc(CONDITIONS[c.id].name)).join(', ')}</p>` : ''}
    <div class="toggle-row">
      ${button(d.policy ? '🛡️ Cancel disability policy' : '🛡️ Buy disability insurance', 'health.toggleDisabilityPolicy', { variant: d.policy ? 'small on' : 'small', hint: 'Pays 60% of salary if you can\'t work' })}
      ${button('♿ Claim disability', 'health.claimDisability', { variant: 'small', disabled: !disabling.length || d.benefits.length > 0, hint: `LTD, a ${disabilityName(state)} application and disability retirement` })}
      ${(() => { const e = ssdiEligibility(state); return button(`📨 Apply for ${disabilityName(state)}`, 'ssdi.apply', { variant: 'small', disabled: !e.ok, hint: e.ok ? (disabilityHere(state) ? 'A medical assessment decides it' : 'Most first applications are denied; appeals often win') : e.reason }); })()}
      ${state.military.history.length ? button(vetCare ? `🎖️ Claim through ${vetCare}` : '🇺🇸 File VA claim', 'health.vaClaim', { variant: 'small', hint: 'Re-rate service-connected conditions' }) : ''}
    </div>
    <p class="fine">${disabilityHere(state) ? `${esc(disabilityName(state))}: a medical assessment of your capacity to work; refusals can be reviewed and appealed to a tribunal.` : `SSDI: 5-month waiting period; initial decisions approve about 1 in 3; a hearing before a judge comes a year or more later. Disability attorneys take 25% of back pay (max ${money(ATTORNEY_CAP)}). Medicare after 24 months of benefits.`}</p>`, { icon: '♿' });

  const debt = h.medicalDebt ? card('Medical Debt', `
    <p><b class="neg">${money(h.medicalDebt)}</b> ${h.collections ? chip('In collections', 'bad') : ''}</p>
    ${button('💵 Pay it down', 'health.payMedicalDebt', { variant: 'small', disabled: state.finances.cash <= 0 })}
    <p class="fine">Payments of 10%/yr come out automatically. Big balances relative to income can be discharged in bankruptcy.</p>`, { icon: '🧾', accent: 'red' }) : '';

  const history = h.history.length ? card('Medical History', `<ul class="history">${[...h.history].reverse().slice(0, 12).map((e) => `<li><small>Age ${e.age}</small> ${esc(e.text)}</li>`).join('')}</ul>`, { icon: '📋' }) : '';

  return `${coverageCard(state)}${conditions}${debt}${mind}${disability}${history}`;
}
