/**
 * Military (Armed Forces) and Reserves (volunteer emergency services) tabs.
 */
import { esc, money, button, card, chip, meter, kv, rankBadge, ladder, ribbonRack } from '../Components.js';
import { meetsEducation } from '../../core/State.js';
import {
  BRANCHES, SPECIALTIES, rankOf, specialtyName, enlistmentEligibility, promotionOutlook, annualActivePay, DISCHARGE_LABEL, RETIREMENT_YEARS,
} from '../../modules/military/MilitaryEngine.js';
import { pensionMultiplier, militaryHonors } from '../../modules/military/MedalEngine.js';
import { SERVICES, SERVICE_LIST, joinEligibility, nextRankStatus, rankOfMember } from '../../modules/emergency/EmergencyEngine.js';
import { getCredential } from '../../modules/credentials/CredentialRegistry.js';
import { hasCredential, pursueEligibility, findSponsor } from '../../modules/credentials/LicensingEngine.js';

function recruitingOffice(state) {
  const rows = Object.values(BRANCHES).map((b) => {
    const enlisted = enlistmentEligibility(state, b.id, 'enlisted');
    const officer = enlistmentEligibility(state, b.id, 'officer');
    const btn = (track, component, check, label) => button(label, 'military.enlist', { arg: `${b.id}:${track}:${component}`, disabled: !check.ok, variant: 'small', title: check.reason ?? '' });
    return `<li class="branch-row">
      <div class="branch-name"><span class="branch-icon">${b.icon}</span><div><b>${b.name}</b><small>${esc(b.motto)}</small></div></div>
      <div class="branch-btns">
        ${btn('enlisted', 'active', enlisted, 'Enlist · Active')}${btn('enlisted', 'reserve', enlisted, 'Enlist · Reserve')}
        ${btn('officer', 'active', officer, 'Officer · Active')}${btn('officer', 'reserve', officer, 'Officer · Reserve')}
      </div>
      <small class="why">${[!enlisted.ok && `Enlisted: ${enlisted.reason}`, !officer.ok && `Officer: ${officer.reason}`].filter(Boolean).map(esc).join(' · ')}</small>
    </li>`;
  }).join('');
  return card('Recruiting Office', `<p class="muted">Enlisted E-1 → E-9; officers O-1 → O-10 (bachelor's required). <b>Active duty</b> is your full-time job with base housing. <b>Reserve</b> service runs alongside a civilian career. Veterans earn the GI Bill, veterans' preference on civil-service exams, and a pension at 20 years.</p><ul class="branch-list">${rows}</ul>`, { icon: '🇺🇸', accent: 'green' });
}

export function militaryView(state) {
  const svc = state.military.service;
  const history = state.military.history.length
    ? card('Service Record', `<ul class="history">${[...state.military.history].reverse().map((h) => `<li><b>${BRANCHES[h.branch].icon} ${esc(h.rankTitle)} (${h.rankCode})</b> · ${BRANCHES[h.branch].name} ${h.component === 'reserve' ? 'Reserve' : ''} <small>age ${h.startAge}–${h.endAge}, ${h.yearsOfService} yrs, ${h.deployments} deployments — ${DISCHARGE_LABEL[h.discharge]}</small></li>`).join('')}</ul><p class="fine">Retired pay and VA benefits appear under 💰 Money → Retirement.</p>`, { icon: '🗂️' })
    : '';
  if (!svc) return `${recruitingOffice(state)}${history}`;

  const branch = BRANCHES[svc.branch];
  const rank = rankOf(svc);
  const outlook = promotionOutlook(svc);
  const titles = branch[svc.track];
  const hasBachelor = meetsEducation(state, { level: 'bachelor' });
  return `${card(branch.name, `
    <div class="job-head">
      ${rankBadge(rank.code, rank.title, svc.grade / rank.max, { icon: branch.icon })}
      <div class="job-meta">
        <p>${chip(svc.component === 'active' ? '🪖 Active Duty' : '🏡 Reserve', svc.component === 'active' ? 'cyan' : 'green')} ${chip(`${SPECIALTIES[svc.specialty].icon} ${esc(specialtyName(svc))}`)} ${chip(svc.track === 'officer' ? 'Officer' : 'Enlisted')} ${svc.deploymentRequested ? chip('✋ Deployment requested', 'warn') : ''}</p>
        ${kv([
          ['Base pay', `${money(annualActivePay(svc))}/yr${svc.component === 'reserve' ? ' (active rate)' : ''}`],
          ['Service', `${svc.yearsOfService} yrs`],
          ['Time in grade', `${svc.yearsInGrade} yrs`],
          ['Contract', svc.contractYearsLeft > 0 ? `${svc.contractYearsLeft} yrs left` : 'Up for renewal'],
          ['Deployments', `${svc.deployments} (${svc.combatTours} combat)`],
          ['Wounds', svc.wounds ? `<span class="neg">${svc.wounds}</span>` : '0'],
          svc.disciplinary ? ['Disciplinary', `<span class="neg">${svc.disciplinary}</span>`] : null,
        ])}
      </div>
    </div>
    ${meter(svc.eval, { label: '📋 Evaluation' })}
    <p class="promo ${outlook.eligible ? 'ready' : ''}">${outlook.eligible ? `🌟 Board-eligible for ${esc(titles[svc.grade + 1])}` : `🪜 Next grade: ${esc(outlook.reason)}`}</p>
    ${ladder(titles.map((t, i) => ({ title: t, sub: `${svc.track === 'officer' ? 'O' : 'E'}-${i + 1}` })), svc.grade, { compact: true })}
    <div class="action-grid">
      ${button('🏃 Extra PT', 'military.pt', { hint: '+Fitness, +Eval' })}
      ${button('🫡 Volunteer for Duty', 'military.extraDuty', { hint: 'Once/yr, +Eval' })}
      ${button(svc.deploymentRequested ? '✋ Withdraw Request' : '✈️ Request Deployment', 'military.requestDeployment', { hint: svc.component === 'reserve' ? 'Volunteer for mobilization' : 'Higher deploy odds' })}
      ${svc.track === 'enlisted' ? button('🎓 Apply to OCS', 'military.applyOCS', { hint: hasBachelor ? 'Become an officer' : "Needs bachelor's", disabled: !hasBachelor }) : ''}
      ${button(svc.component === 'active' ? '🏡 Transfer to Reserves' : '🪖 Go Active Duty', 'military.switchComponent', { hint: svc.yearsOfService < 2 ? 'After 2 yrs' : 'Resets contract', disabled: svc.yearsOfService < 2 })}
      ${button('🎖️ Retire', 'military.retire', { hint: `${RETIREMENT_YEARS}+ yrs · ×${pensionMultiplier(state).toFixed(2)} pension`, disabled: svc.yearsOfService < RETIREMENT_YEARS })}
    </div>
    <div class="rack-inline">${ribbonRack(militaryHonors(state))}</div>`, { icon: branch.icon, accent: 'green' })}${history}`;
}

function certList(state, serviceId) {
  return SERVICES[serviceId].credentials.map((id) => {
    const c = getCredential(id);
    if (hasCredential(state, id)) return `<li class="cert done">${c.icon} ${esc(c.name)} ✓</li>`;
    const elig = pursueEligibility(state, id);
    const sponsor = findSponsor(state, c);
    const payer = elig.payer === 'sponsor' ? `${sponsor.label} pays` : elig.ok ? (c.cost ? `You pay $${c.cost.toLocaleString()}` : 'Free') : elig.reason;
    return `<li class="cert">${c.icon} ${esc(c.name)}
      ${button(c.trainingYears ? 'Enroll' : 'Train', 'credentials.pursue', { arg: id, disabled: !elig.ok, variant: 'tiny', title: elig.reason ?? '' })}
      <span class="${elig.ok ? 'fine' : 'why'}">${esc(payer)}</span></li>`;
  }).join('');
}

export function emergencyView(state) {
  const cards = SERVICE_LIST.map((svc) => {
    const member = state.emergency[svc.id];
    if (!member) {
      const check = joinEligibility(state, svc.id);
      return card(svc.name, `
        <p class="muted">${svc.ranks[0].title} → ${svc.ranks[6].title}. Runs alongside your job, school or reserve duty. Certifications you earn here count toward paid careers.</p>
        ${kv([['Min age', `${svc.minAge}+`], ['Requirements', Object.entries(svc.requirements).map(([k, v]) => `${v}+ ${k}`).join(', ')], ['Call volume', `${svc.callsPerYear[0]}–${svc.callsPerYear[1]}/yr${svc.stipendPerCall ? ` · $${svc.stipendPerCall}/call` : ' · unpaid'}`], ['Training budget', `$${svc.trainingBudget.toLocaleString()}/yr`]])}
        <div class="row-end">${button(`${svc.icon} Join`, 'emergency.join', { arg: svc.id, disabled: !check.ok, variant: 'primary' })}${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}</div>`, { icon: svc.icon });
    }
    const rank = rankOfMember(svc.id, member);
    const next = nextRankStatus(state, svc.id, member);
    const nextXp = next.next?.xp ?? member.xp;
    return card(svc.name, `
      <div class="job-head">
        ${rankBadge(`RANK ${member.rankIndex + 1}`, rank.title, member.rankIndex / (svc.ranks.length - 1), { icon: svc.icon })}
        <div class="job-meta">
          <p class="muted">${esc(member.unit)} ${member.onLeave ? chip('🪖 Military leave', 'warn') : ''}</p>
          ${kv([['Years', member.years], ['Calls run', member.calls.toLocaleString()], ['Lives saved', member.saves], ['Injuries', member.injuries], ['Unit training budget', `$${member.budget.left.toLocaleString()} left`], member.complaints ? ['Complaints', `<span class="neg">${member.complaints}/3</span>`] : null])}
        </div>
      </div>
      ${next.next ? meter(member.xp, { max: nextXp, label: `XP → ${esc(next.next.title)}`, suffix: ` / ${nextXp}`, tone: next.ready ? 'good' : 'mid' }) : '<p class="promo ready">⭐ Highest rank achieved</p>'}
      ${next.next && !next.ready ? `<p class="promo">🪜 Needs: ${esc(next.reason)}</p>` : ''}
      ${ladder(svc.ranks.map((r) => ({ title: r.title, sub: `${r.xp} XP` })), member.rankIndex, { compact: true })}
      ${member.k9 ? `<div class="k9">🐕 <b>K9 ${esc(member.k9.name)}</b> · ${esc(member.k9.breed)}, age ${member.k9.age}</div>` : ''}
      <h4 class="sub">Certifications</h4><ul class="certs">${certList(state, svc.id)}</ul>
      <div class="action-grid">
        ${button('🏋️ Extra Training', 'emergency.train', { arg: svc.id, hint: '+25 XP, once/yr', disabled: member.onLeave })}
        ${button('📟 Pick Up Shifts', 'emergency.shift', { arg: svc.id, hint: 'More calls, +XP', disabled: member.onLeave })}
        ${button('🚪 Resign', 'emergency.resign', { arg: svc.id, variant: 'danger' })}
      </div>`, { icon: svc.icon, accent: svc.id === 'fire' ? 'red' : svc.id === 'police' ? 'blue' : 'orange' });
  }).join('');
  const history = state.emergency.history.length
    ? card('Past Service', `<ul class="history">${[...state.emergency.history].reverse().map((h) => `<li><b>${SERVICES[h.serviceId].icon} ${esc(h.rankTitle)}</b> · ${esc(h.unit)} <small>age ${h.startAge}–${h.endAge}, ${h.calls} calls, ${h.saves} saves — ${esc(h.reason)}</small></li>`).join('')}</ul>`, { icon: '🗂️' })
    : '';
  return `<div class="grid-2">${cards}</div>${history}`;
}
