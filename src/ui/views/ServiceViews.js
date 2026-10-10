/**
 * Military (Armed Forces) and Reserves (volunteer emergency services) tabs.
 */
import { unitView, billetTitle, leads, canImposeNjp, LEADER_ACTIONS } from '../../modules/org/MilitaryUnits.js';
import { PIPELINES, pipelinesFor, selectionEligibility, courseOdds, MAX_ATTEMPTS } from '../../modules/military/SpecialOps.js';
import { reportName, giBillTransferEligibility } from '../../modules/military/MilitaryLife.js';
import { TRACKS, skillBridgeEligibility, civilianField, FAIR_YEARS } from '../../modules/military/Transition.js';
import { PROFESSION_LIST } from '../../modules/career/JobTrees.js';
import { retrainTargets, warrantTargets, retrainEligibility, retrainOdds, warrantEligibility, warrantOdds } from '../../modules/military/CareerFields.js';
import { officers, roster, leadsOrg, topRank, isElectedRank, CHIEF_ACTIONS, LEADERSHIP } from '../../modules/org/VolunteerOrgs.js';
import { QUALS, schoolName, schoolEligibility, passOdds, requiredPme, hasSchool } from '../../modules/military/Schools.js';
import { MOS, DIRECT_COMMISSIONS, DIRECT_MAX_AGE, hasDirectPath } from '../../modules/military/MOS.js';
import { ASSIGNMENTS, assignmentName, assignmentEligibility, commissioningEligibility, COMMISSIONING } from '../../modules/military/Assignments.js';
import { CLEARANCES } from '../../modules/publicservice/PublicServiceEngine.js';
import { PATHWAYS } from '../../modules/emergency/PaidOpportunities.js';
import { getProfession } from '../../modules/career/JobTrees.js';
import { esc, money, button, card, chip, meter, kv, rankBadge, ladder, ribbonRack, select, disclosure, optionRow } from '../Components.js';
import { meetsEducation } from '../../core/State.js';
import {
  BRANCHES, SPECIALTIES, rankOf, specialtyName, enlistmentEligibility, promotionOutlook, FLAG_LOOKS, annualActivePay, commissionedYears, DISCHARGE_LABEL, RETIREMENT_YEARS,
} from '../../modules/military/MilitaryEngine.js';
import { pensionMultiplier, militaryHonors } from '../../modules/military/MedalEngine.js';
import { serviceLimit, transferEligibility, transferChance, UP_OR_OUT_GRADES, PASSOVER_LIMIT } from '../../modules/military/Separation.js';
import { SERVICES, SERVICE_LIST, joinEligibility, nextRankStatus, rankOfMember } from '../../modules/emergency/EmergencyEngine.js';
import { getCredential } from '../../modules/credentials/CredentialRegistry.js';
import { equipmentCard } from './EquipmentView.js';
import { hasCredential, pursueEligibility, findSponsor } from '../../modules/credentials/LicensingEngine.js';
import { branchOf, branchFor } from '../../modules/military/MilitaryEngine.js';
import { nationalBranchIds } from '../../modules/world/NationalForces.js';
import { isAbroad, countryOf } from '../../modules/world/Countries.js';

function recruitingOffice(state) {
  const abroad = isAbroad(state);
  const branches = abroad ? nationalBranchIds(countryOf(state).id).map((id) => branchFor(state, id)) : Object.values(BRANCHES);
  const rows = branches.map((b) => {
    const enlisted = enlistmentEligibility(state, b.id, 'enlisted', b.activeOnly ? 'active' : 'reserve');
    const officer = enlistmentEligibility(state, b.id, 'officer', b.activeOnly ? 'active' : 'reserve', { maxOfficerAge: hasDirectPath(state, b.id) ? DIRECT_MAX_AGE : 39 });
    const btn = (track, component, base, label) => {
      const check = b.reserveOnly && component === 'active' ? { ok: false, reason: 'Part-time state force' } : b.activeOnly && component !== 'active' ? { ok: false, reason: 'Active duty only' } : base;
      return button(label, 'military.enlist', { arg: `${b.id}:${track}:${component}`, disabled: !check.ok, variant: 'small', title: check.reason ?? '' });
    };
    const open = [!b.officerOnly && enlisted.ok && 'enlisted', officer.ok && 'officer'].filter(Boolean);
    return `<li class="branch-row"><details class="branch-fold" data-key="recruit.${b.id}">
      <summary class="branch-name"><span class="branch-icon">${b.icon}</span><div><b>${b.name}</b><small>${open.length ? `Open to you: ${open.join(' and ')}` : 'Not open to you now'}</small></div></summary>
      <small class="fine">${esc(b.motto)}</small>
      <div class="branch-btns">
        ${b.officerOnly ? '' : `${btn('enlisted', 'active', enlisted, 'Enlist · Active')}${btn('enlisted', 'reserve', enlisted, 'Enlist · Reserve')}`}
        ${btn('officer', 'active', officer, b.officerOnly ? 'Apply for a commission' : 'Officer · Active')}${b.activeOnly ? '' : btn('officer', 'reserve', officer, 'Officer · Reserve')}${b.id === 'army' && !abroad ? btn('warrant', 'active', enlistmentEligibility(state, b.id, 'warrant', 'active'), 'Warrant · Flight School') : ''}
      </div>
      ${b.nonCombat ? `<small>${b.id === 'usphs' ? 'Uniformed health professionals: physicians, nurses, pharmacists, engineers, scientists. Deploys to public-health emergencies, not combat.' : 'STEM officers who run NOAA\'s research ships and hurricane-hunter aircraft.'}</small>` : ''}
      <small class="why">${[!b.officerOnly && !enlisted.ok && `Enlisted: ${enlisted.reason}`, !officer.ok && `Officer: ${officer.reason}`].filter(Boolean).map(esc).join(' · ')}</small>
    </details></li>`;
  }).join('');
  return card('Recruiting Office', `<details class="fine"><summary>How military service works</summary><p class="muted">Enlisted E-1 → E-9; officers O-1 → O-10 (bachelor's required). Each branch has its own jobs (MOS, ratings, AFSCs); paramedics, truckers and IT pros enlist a few grades up, and lawyers, doctors, nurses, pharmacists, clergy and tech veterans can take a <b>direct commission</b> at a rank that matches their experience. <b>Active duty</b> is your full-time job with base housing. <b>Reserve</b> service runs alongside a civilian career. Veterans earn the GI Bill, veterans' preference on civil-service exams, and a pension at 20 years.</p></details><ul class="branch-list">${rows}</ul>`, { icon: abroad ? countryOf(state).flag : '🇺🇸', accent: 'green' });
}

/** Inter-service transfer: pick a branch; the odds are shown because they're low. */
function transferForm(state) {
  const svc = state.military.service;
  const options = Object.values(BRANCHES).filter((b) => b.id !== svc.branch).map((b) => {
    const check = transferEligibility(state, b.id);
    return { value: b.id, label: `${b.icon} ${b.name} — ${check.ok ? `${Math.round(transferChance(state, b.id) * 100)}% odds` : check.reason}` };
  });
  return `<h4 class="sub">Inter-service transfer</h4><p class="fine">Needs a conditional release from your current service. Enlisted members usually lose a grade; you start a new obligation.</p>
    <div class="enroll-form" data-collect-root>${select('branch', options)}${button('🔀 Request transfer', 'military.transferBranch', { variant: 'small', collect: true, disabled: Boolean(state.yearly['military.transferBranch']) })}</div>`;
}

/** General/flag boards: looks left, and whether you're joint-qualified. */
function flagNote(svc) {
  if (svc.track !== 'officer' || svc.grade < 5 || svc.grade >= 9) return '';
  const left = Math.max(0, FLAG_LOOKS - (svc.flagPassovers ?? 0));
  return ` · ${left ? `${left} general-officer board look${left === 1 ? '' : 's'} left` : 'no longer considered for promotion'}${svc.joint ? '' : ' · not joint-qualified (halves your odds)'}`;
}

/** Selective Service: men 18–25 must register. */
const CONSCRIPTION_LABEL = { pending: 'Not yet called up', deferred: 'Deferred while studying', serving: 'Serving now', served: 'Service completed', social: 'Serving as a social service agent', alternative: 'In alternative service', exempt: 'Exempt', evaded: 'Did not serve' };

/** National service status abroad (Korea's conscription, Mexico's SMN, Germany's questionnaire). */
function conscriptionCard(state) {
  const c = state.military.conscription;
  const country = countryOf(state);
  if (!c && !state.military.cartilla) return '';
  const lines = [c ? ['Status', CONSCRIPTION_LABEL[c.status] ?? c.status] : null, c?.grade ? ['Physical grade', String(c.grade)] : null, country.id === 'MX' ? ['Cartilla', state.military.cartilla ? '✅ Released' : '❌ None'] : null].filter(Boolean);
  return card('National Service', `<ul class="history">${lines.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ul>`, { icon: country.flag });
}

function selectiveServiceCard(state) {
  if (isAbroad(state)) return conscriptionCard(state);
  const sss = state.military.sss;
  if (!sss || state.character.gender !== 'male' || state.character.age < 17) return '';
  if (sss.registered && state.character.age >= 26) return '';
  if (sss.registered) return card('Selective Service', '<p class="muted">✅ You\'re registered. Men stay registered until 26; there has been no draft since 1973.</p>', { icon: '📋' });
  if (sss.missed) return card('Selective Service', `<p class="${sss.waived ? 'muted' : 'neg'}">${sss.waived ? '✅ OPM ruled your failure to register wasn\'t knowing and willful — federal jobs are open to you.' : 'You never registered before turning 26. You\'re barred from federal jobs unless OPM rules it wasn\'t knowing and willful.'}</p>${sss.waived ? '' : `<div class="action-grid">${button('📄 Request a status information letter', 'volunteering.sssLetter', { variant: 'small', hint: 'Explain why you didn\'t register' })}</div>`}`, { icon: '📋', accent: sss.waived ? '' : 'red' });
  return card('Selective Service', `<p class="muted">Men must register between 18 and 26 (most are registered automatically with a driver's license). Never registering bars you from federal jobs.</p><div class="action-grid">${button('📋 Register', 'volunteering.sssRegister', { variant: 'small', disabled: state.character.age < 18, hint: state.character.age < 18 ? 'At 18' : 'Takes two minutes online' })}</div>`, { icon: '📋' });
}

export function militaryView(state) {
  const svc = state.military.service;
  const history = state.military.history.length
    ? card('Service Record', `<ul class="history">${[...state.military.history].reverse().map((h) => `<li><b>${branchOf(h).icon} ${esc(h.rankTitle)} (${h.rankCode})</b> · ${branchOf(h).name}${h.conscript ? ' (conscript)' : ''} ${h.component === 'reserve' ? 'Reserve' : ''} <small>${h.mos && MOS[h.mos] ? `${esc(MOS[h.mos].code)} ${esc(MOS[h.mos].title)} · ` : ''}age ${h.startAge}–${h.endAge}, ${h.yearsOfService} yrs, ${h.deployments} deployments — ${DISCHARGE_LABEL[h.discharge]}</small></li>`).join('')}</ul><p class="fine">Retired pay and VA benefits appear under 💰 Money → Retirement.</p>`, { icon: '🗂️' })
    : '';
  const deserter = state.military.deserter
    ? card('Wanted: Desertion', `<p class="neg">You deserted the ${esc(BRANCHES[state.military.deserter.branch].name)} at age ${state.military.deserter.age}. A federal warrant stays open — desertion has no statute of limitations. If you're caught: court-martial, prison and a dishonorable discharge.</p>`, { icon: '🏃', accent: 'red' })
    : '';
  if (!svc) return `${deserter}${selectiveServiceCard(state)}${veteranCard(state)}${recruitingOffice(state)}${history}`;

  const branch = branchOf(svc);
  const rank = rankOf(svc);
  const outlook = promotionOutlook(svc);
  const titles = branch[svc.track];
  const hasBachelor = meetsEducation(state, { level: 'bachelor' });
  return `${card(branch.name, `
    <div class="job-head">
      ${rankBadge(rank.code, rank.title, svc.grade / rank.max, { icon: branch.icon })}
      <div class="job-meta">
        <p>${chip(svc.component === 'active' ? '🪖 Active Duty' : '🏡 Reserve', svc.component === 'active' ? 'cyan' : 'green')} ${chip(`${SPECIALTIES[svc.specialty].icon} ${esc(specialtyName(svc))}`)} ${chip({ officer: 'Officer', warrant: 'Warrant Officer' }[svc.track] ?? 'Enlisted')} ${svc.direct ? chip(`🎓 Direct commission · ${esc(DIRECT_COMMISSIONS[svc.direct].name)}`, 'green') : ''} ${svc.clearance ? chip(`${CLEARANCES[svc.clearance].icon} ${CLEARANCES[svc.clearance].name}`, 'cyan') : ''} ${svc.deploymentRequested ? chip('✋ Deployment requested', 'warn') : ''}</p>
        ${kv([
          ['Base pay', `${money(annualActivePay(svc))}/yr${svc.component === 'reserve' ? ' (active rate)' : ''}`],
          ['Service', `${svc.yearsOfService} yrs`],
          ['Time in grade', `${svc.yearsInGrade} yrs`],
          ['Contract', svc.contractYearsLeft > 0 ? `${svc.contractYearsLeft} yrs left` : 'Up for renewal'],
          [svc.component === 'reserve' ? 'Home unit' : 'Duty station', svc.component === 'reserve' ? 'Drills near home' : svc.overseas ? `🌍 ${esc(svc.overseas.base)}, ${esc(svc.overseas.country)} (${svc.overseas.accompanied ? 'accompanied' : 'unaccompanied'}, until ${svc.overseas.until})` : esc(svc.station ?? 'Initial training')],
          ['Deployments', `${svc.deployments} (${svc.combatTours} combat)`],
          svc.reports?.length ? [`Last ${reportName(svc)}s`, svc.reports.slice(-3).map((r) => `<span class="${r.block === 'Most Qualified' ? 'pos' : r.block === 'Not Qualified' ? 'neg' : ''}">${esc(r.block)}</span>`).join(' · ')] : null,
          ['Retirement', svc.retirementPlan === 'brs' ? 'Blended (2%/yr + matched TSP)' : svc.retirementPlan === 'legacy' ? 'Legacy (2.5%/yr at 20)' : 'Legacy until year 2'],
          ['Wounds', svc.wounds ? `<span class="neg">${svc.wounds}</span>` : '0'],
          svc.disciplinary ? ['Disciplinary', `<span class="neg">${svc.disciplinary}${svc.njp?.length ? ` · ${svc.njp.length} Article 15${svc.njp.length > 1 ? 's' : ''}` : ''}${svc.courtsMartial ? ` · ${svc.courtsMartial} court-martial` : ''}${svc.reprimand ? ' · reprimand on file' : ''}</span>`] : null,
          ['Up-or-out', `${svc.track === 'officer' && UP_OR_OUT_GRADES.includes(svc.grade) ? `${svc.passovers ?? 0}/${PASSOVER_LIMIT} non-selections · ` : ''}${Number.isFinite(serviceLimit(svc)) ? `max ${serviceLimit(svc)} yrs${svc.track === 'enlisted' ? '' : ` commissioned service (${commissionedYears(svc)} so far)`} at this grade` : 'no tenure limit (serve to age 62)'}${svc.sanctuary ? ' · sanctuary to 20' : ''}`],
        ])}
      </div>
    </div>
    ${meter(svc.eval, { label: '📋 Evaluation' })}
    <p class="promo ${outlook.eligible ? 'ready' : ''}">${outlook.eligible ? `🌟 Board-eligible for ${esc(titles[svc.grade + 1])}` : `🪜 Next grade: ${esc(outlook.reason)}`}${flagNote(svc)}</p>
    ${ladder(titles.map((t, i) => ({ title: t, sub: `${svc.track === 'officer' ? 'O' : 'E'}-${i + 1}` })), svc.grade, { compact: true })}
    <div class="action-grid">
      ${button('🏃 Extra PT', 'military.pt', { hint: '+Fitness, +Eval' })}
      ${button('🫡 Volunteer for Duty', 'military.extraDuty', { hint: 'Once/yr, +Eval' })}
      ${button(svc.deploymentRequested ? '✋ Withdraw Request' : '✈️ Request Deployment', 'military.requestDeployment', { hint: svc.component === 'reserve' ? 'Volunteer for mobilization' : 'Higher deploy odds' })}
      ${svc.track === 'enlisted' ? button('🎓 Apply to OCS', 'military.applyOCS', { hint: hasBachelor ? 'Become an officer' : "Needs bachelor's", disabled: !hasBachelor }) : ''}
      ${button(svc.component === 'active' ? '🏡 Transfer to Reserves' : '🪖 Go Active Duty', 'military.switchComponent', { hint: svc.yearsOfService < 2 ? 'After 2 yrs' : 'Resets contract', disabled: svc.yearsOfService < 2 })}
      ${((g) => button('🎓 Transfer GI Bill', 'military.transferGiBill', { hint: g.ok ? 'To your children · +4 yrs' : g.reason, disabled: !g.ok }))(giBillTransferEligibility(state))}
      ${button('🎖️ Retire', 'military.retire', { hint: `${RETIREMENT_YEARS}+ yrs · ×${pensionMultiplier(state).toFixed(2)} pension`, disabled: svc.yearsOfService < RETIREMENT_YEARS })}
      ${button('🚪 Leave the Service', 'military.leaveService', { variant: 'danger', hint: 'Early separation, objector status or desertion', disabled: Boolean(state.yearly['military.leave']) })}
    </div>
    ${transferForm(state)}
    <div class="rack-inline">${ribbonRack(militaryHonors(state))}</div>`, { icon: branch.icon, accent: 'green' })}${transitionCard(state, svc)}${unitCard(state, svc)}${equipmentCard(state, 'military')}${assignmentsCard(state, svc)}${careerFieldCard(state, svc)}${schoolsCard(state, svc)}${specialOpsCard(state, svc)}${history}`;
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
  const open = SERVICE_LIST.filter((svc) => !state.emergency[svc.id]).map((svc) => {
    const check = joinEligibility(state, svc.id);
    const top = svc.ranks[svc.ranks.length - 1].title;
    return `<li class="job-row ${check.ok ? '' : 'locked'}">
      <span class="job-icon" aria-hidden="true">${svc.icon}</span>
      <div class="job-info"><b>${esc(svc.name)}</b><small>${esc(svc.ranks[0].title)} → ${esc(top)} · ${svc.minAge}+ · ${Object.entries(svc.requirements).map(([k, v]) => `${v}+ ${k}`).join(', ')} · ${svc.callsPerYear[0]}–${svc.callsPerYear[1]} calls/yr${svc.stipendPerCall ? ` · $${svc.stipendPerCall}/call` : ' · unpaid'}</small></div>
      ${button('Join', 'emergency.join', { arg: svc.id, disabled: !check.ok, variant: 'small' })}
      ${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}
    </li>`;
  }).join('');
  const cards = SERVICE_LIST.filter((svc) => state.emergency[svc.id]).map((svc) => {
    const member = state.emergency[svc.id];
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
      ${volunteerOrgSection(state, svc, member)}
      ${member.k9 ? `<div class="k9">🐕 <b>K9 ${esc(member.k9.name)}</b> · ${esc(member.k9.breed)}, age ${member.k9.age}</div>` : ''}
      ${disclosure(`emergency.certs.${svc.id}`, '📜 Certifications', `<ul class="certs">${certList(state, svc.id)}</ul>`, { count: `${svc.credentials.filter((id) => hasCredential(state, id)).length}/${svc.credentials.length} earned` })}
      ${PATHWAYS[svc.id] ? `<p class="fine">💼 Experienced members get offered paid work${PATHWAYS[svc.id].gig ? ` (${esc(PATHWAYS[svc.id].gig.label.toLowerCase())})` : ''}${PATHWAYS[svc.id].jobs.length ? ` and job offers in ${PATHWAYS[svc.id].jobs.map((id) => esc(getProfession(id).name)).join(' or ')}` : ''}.</p>` : ''}
      <div class="action-grid">
        ${button('🏋️ Extra Training', 'emergency.train', { arg: svc.id, hint: '+25 XP, once/yr', disabled: member.onLeave })}
        ${button('📟 Pick Up Shifts', 'emergency.shift', { arg: svc.id, hint: 'More calls, +XP', disabled: member.onLeave })}
        ${button('🚪 Resign', 'emergency.resign', { arg: svc.id, variant: 'danger' })}
      </div>`, { icon: svc.icon, accent: { fire: 'red', police: 'blue', ambulance: 'cyan', wildland: 'green', auxiliary: 'blue' }[svc.id] ?? 'orange' });
  }).join('');
  const gear = SERVICE_LIST.filter((svc) => state.emergency[svc.id]).map((svc) => equipmentCard(state, `vol.${svc.id}`)).join('');
  const join = open ? card('Join a Service', `<p class="muted">Volunteer and reserve services run alongside your job, school or military reserve duty. Certifications you earn here count toward paid careers — and units often hire their own volunteers for paid gigs and jobs.</p>${cards ? disclosure('emergency.join', 'Join another service', `<ul class="job-board">${open}</ul>`) : `<ul class="job-board">${open}</ul>`}`, { icon: '🚨' }) : '';
  const history = state.emergency.history.length
    ? card('Past Service', `<ul class="history">${[...state.emergency.history].reverse().map((h) => `<li><b>${SERVICES[h.serviceId].icon} ${esc(h.rankTitle)}</b> · ${esc(h.unit)} <small>${h.mos && MOS[h.mos] ? `${esc(MOS[h.mos].code)} ${esc(MOS[h.mos].title)} · ` : ''}age ${h.startAge}–${h.endAge}, ${h.calls} calls, ${h.saves} saves — ${esc(h.reason)}</small></li>`).join('')}</ul>`, { icon: '🗂️' })
    : '';
  return `${cards ? `<div class="grid-2">${cards}</div>` : ''}${gear}${join}${history}<p class="fine">National service, the State Guard, disaster teams and veterans posts are on the 🤝 Civic Service tab.</p>`;
}

/** Your unit: billet, chain of command, the people you lead, readiness, command tours. */
function unitCard(state, svc) {
  const v = unitView(state, svc);
  if (!v) return '';
  const left = LEADER_ACTIONS - (state.yearly['military.lead'] ?? 0);
  const iLead = leads(v.billet);
  const chain = v.chain.map((c) => `<li><small class="muted">${esc(c.label)}</small> <b>${esc(c.person.rank)} ${esc(c.person.name)}</b></li>`).join('');
  const team = v.team.map((p) => `<li class="report-row"><div><b>${esc(p.rank)} ${esc(p.name)}</b> <small class="muted">${esc(p.title.split(' — ')[1] ?? '')} · performance ${p.performance} · trusts you ${p.rel}%${p.discipline ? ` · ${p.discipline} Article 15${p.discipline > 1 ? 's' : ''}` : ''}${p.awards ? ` · ${p.awards} award${p.awards > 1 ? 's' : ''}` : ''}</small></div>
    ${iLead ? `<div class="toggle-row">${button('🗣️ Counsel', 'military.counsel', { arg: p.id, variant: 'tiny', disabled: left <= 0 })}${button('🎖️ Award', 'military.award', { arg: p.id, variant: 'tiny', disabled: left <= 0, hint: canImposeNjp(v.billet) ? 'You approve it' : 'Recommend to your commander' })}${button(canImposeNjp(v.billet) ? '⚖️ Article 15' : '⚖️ Recommend Article 15', 'military.njp', { arg: p.id, variant: 'tiny danger', disabled: left <= 0 })}</div>` : ''}</li>`).join('');
  return card(esc(v.org.name), `
    <p>${chip(`🎖️ ${esc(billetTitle(svc, v.billet))}`, v.command ? 'honor' : '')} ${chip(esc(v.dept.name))}${v.command ? ` ${chip(`Command tour ends at age ${v.command.until}`, 'warn')}` : ''}</p>
    ${meter(v.readiness, { label: '🛡️ Unit readiness' })}
    <h4 class="sub">Chain of command</h4><ul class="history">${chain || '<li class="muted">You answer to higher headquarters.</li>'}</ul>
    ${v.team.length ? `<h4 class="sub">${iLead ? 'Your soldiers' : 'Your team'}</h4><ul class="history">${team}</ul>` : ''}
    <p class="fine">${iLead ? `${left > 0 ? `${left} leadership action${left > 1 ? 's' : ''} left this year.` : 'No leadership actions left this year.'} Readiness of the people you lead counts toward your evaluation. ` : ''}Command posts (company command, first sergeant, battalion command, command sergeant major) are filled by selection boards; commanding well is what gets you promoted.</p>`, { icon: '🪖' });
}

/** Your volunteer organization: officers (elected or appointed), members, and your powers if you lead it. */
function volunteerOrgSection(state, svc, member) {
  const org = state.orgs?.byId?.[member.orgId];
  if (!org) return '';
  const lead = leadsOrg(org, svc.id);
  const L = LEADERSHIP[svc.id];
  const left = CHIEF_ACTIONS - (state.yearly['emergency.lead'] ?? 0);
  const offs = officers(org, svc.ranks).map((o) => `<li><small class="muted">${esc(o.title)}${isElectedRank(svc.id, o.idx) ? ' · elected' : ''}</small> <b>${o.person === 'PLAYER' ? 'You' : o.person ? esc(o.person.name) : '<span class="muted">vacant</span>'}</b></li>`).join('');
  const members = roster(org).sort((a, b) => b.years - a.years).slice(0, 8).map((p) => `<li class="report-row"><div><b>${esc(p.name)}</b> <small class="muted">${esc(svc.ranks[p.rankIndex]?.title ?? '')} · ${p.years} yrs · trusts you ${p.rel}%${p.discipline ? ` · ${p.discipline} suspension${p.discipline > 1 ? 's' : ''}` : ''}</small></div>
    <div class="toggle-row">${button('🎖️ Recognize', 'emergency.commendMember', { arg: `${svc.id}:${p.id}`, variant: 'tiny', disabled: left <= 0 })}${button('⭐ Appoint', 'emergency.appointMember', { arg: `${svc.id}:${p.id}`, variant: 'tiny', disabled: left <= 0 })}${button('⚖️ Discipline', 'emergency.disciplineMember', { arg: `${svc.id}:${p.id}`, variant: 'tiny danger', disabled: left <= 0 })}</div></li>`).join('');
  const electNote = L?.elected.length ? `The membership elects its ${L.elected.map((i) => svc.ranks[i].title).join(' and ')} every two years (next at age ${org.nextElection}).` : 'Officer seats open when someone steps down.';
  return `${disclosure(`emergency.org.${svc.id}`, `🏛️ ${esc(org.name)}`, `<ul class="history">${offs}</ul><p class="fine">${electNote} Officer ranks need an open seat as well as experience.</p>${lead ? `<h4 class="sub">Members</h4><ul class="history">${members}</ul>` : ''}`, { count: `${Object.keys(org.people).length + 1} members · readiness ${org.readiness}%` })}
    ${lead ? `<div class="action-grid">${button('📣 Recruit', 'emergency.recruit', { arg: svc.id, disabled: left <= 0 })}${button('🥞 Fundraiser', 'emergency.fundraise', { arg: svc.id, disabled: left <= 0, hint: `Funds ${money(org.funds)}` })}${button('🏛️ Federal grant', 'emergency.grant', { arg: svc.id, disabled: left <= 0 })}</div><p class="fine">You lead ${esc(org.name)}: ${left} leadership action${left === 1 ? '' : 's'} left this year.</p>` : ''}`;
}

/** Special operations: your team if you're in one, else the selection courses open to you. */
function specialOpsCard(state, svc) {
  if (svc.sof) {
    const p = PIPELINES[svc.sof.pipeline];
    return card(p.name, `<p>${chip(`${p.icon} ${esc(p.badge)}`, 'honor')} ${chip(esc(svc.sof.unitName))}</p>
      ${kv([['Since age', svc.sof.since], ['Special pay', `${money(svc.sof.specialPay)}/yr`], ['Team missions', svc.sof.missions]])}
      <p class="fine">${esc(p.desc)} Low fitness or health (or age 45) rotates you back to a conventional unit.</p>
      <div class="action-grid">${button('🔁 Leave the teams', 'military.leaveSof', { variant: 'small' })}</div>`, { icon: p.icon, accent: 'yellow' });
  }
  const ids = pipelinesFor(svc);
  if (!ids.length) return '';
  const rows = ids.map((id) => {
    const p = PIPELINES[id];
    const check = selectionEligibility(state, id);
    const tries = svc.selectionAttempts?.[id] ?? 0;
    return optionRow({ icon: p.icon, title: esc(p.name), sub: `${p.phases.map((ph) => esc(ph.name)).join(' → ')} · +${money(p.specialPay)}/yr`, meta: check.ok ? `About ${Math.round(courseOdds(state, id) * 100)}% finish${tries ? ` · attempt ${tries + 1} of ${MAX_ATTEMPTS}` : ''}` : esc(check.reason), tone: check.ok ? 'good' : 'warn', locked: !check.ok, action: button('Volunteer', 'military.volunteerSelection', { arg: id, disabled: !check.ok, variant: 'small' }) });
  }).join('');
  return card('Special Operations', disclosure('military.sof', 'Selection courses', `<p class="fine">Most volunteers wash out; you get ${MAX_ATTEMPTS} tries per course. Graduates join a special operations unit with special pay and their own missions.</p><ul class="job-board">${rows}</ul>`, { count: `${ids.filter((id) => selectionEligibility(state, id).ok).length} open` }), { icon: '🗡️' });
}

/** Professional military education (required for promotion) and skill qualifications (board points, special pay). */
function schoolsCard(state, svc) {
  const need = requiredPme(svc);
  const titleOf = (p) => branchOf(svc)[svc.track]?.[p.forGrade] ?? '';
  const schoolRow = (id, title, sub) => {
    const check = schoolEligibility(state, id);
    return optionRow({ icon: QUALS[id]?.icon ?? '🎓', title, sub, meta: check.ok ? `${Math.round(passOdds(state, id) * 100)}% to pass` : esc(check.reason), tone: check.ok ? 'good' : 'warn', locked: !check.ok, action: button('Attend', 'military.attendSchool', { arg: id, variant: 'small', disabled: !check.ok }) });
  };
  const done = Object.keys(svc.schools ?? {}).map((id) => chip(`${QUALS[id]?.icon ?? '🎓'} ${esc(QUALS[id]?.badge ?? schoolName(svc, id))}`, QUALS[id] ? 'honor' : '')).join(' ');
  const pmeNext = need && !hasSchool(svc, need.id) ? `<ul class="job-board">${schoolRow(need.id, `⚠️ ${esc(schoolName(svc, need.id))}`, `Required before ${esc(titleOf(need))}. Your command offers seats when you're due.`)}</ul>` : '';
  const quals = Object.entries(QUALS).filter(([id, q]) => q.branches.includes(svc.branch) && !hasSchool(svc, id));
  const open = quals.filter(([id]) => schoolEligibility(state, id).ok);
  const locked = quals.filter(([id]) => !schoolEligibility(state, id).ok);
  const qRow = ([id, q]) => schoolRow(id, esc(q.name), `${esc(q.badge)}${q.pay ? ` · +${money(q.pay)}/yr` : ''}`);
  if (!done && !pmeNext && !quals.length) return '';
  return card('Schools & Qualifications', `${done ? `<div class="chip-row">${done}</div>` : '<p class="muted">No schools yet.</p>'}
    ${pmeNext}
    ${open.length ? disclosure('military.quals', 'Courses you can take', `<ul class="job-board">${open.map(qRow).join('')}</ul>`, { count: open.length }) : ''}
    ${locked.length ? disclosure('military.qualsLocked', 'Not yet open to you', `<ul class="job-board">${locked.map(qRow).join('')}</ul>`, { count: locked.length }) : ''}
    <p class="fine">Leadership courses gate each promotion. Badges and tabs help at promotion boards, and some pay extra. One school a year.</p>`, { icon: '🎓' });
}

/** Special duty and broadening tours, enlisted commissioning programs and top posts. */
function assignmentsCard(state, svc) {
  if (svc.component !== 'active') return '';
  if (svc.topPost) return card('Senior Leadership', `<div class="next-step">⭐ You serve as <b>${esc(svc.topPost.title)}</b>: ${svc.topPost.yearsLeft} year${svc.topPost.yearsLeft === 1 ? '' : 's'} left in your term. You retire when it ends.</div>`, { icon: '⭐', accent: 'yellow' });
  if (svc.commissioning) return card('Commissioning Program', `<div class="next-step">🎓 <b>${esc(svc.commissioning.program)}</b>: college full-time on full pay. ${svc.commissioning.yearsLeft} year${svc.commissioning.yearsLeft === 1 ? '' : 's'} to graduation and your commission.</div>`, { icon: '🎓' });
  const current = svc.assignment ? `<div class="next-step">${ASSIGNMENTS[svc.assignment.id].icon} On assignment as <b>${esc(svc.assignment.name)}</b>${svc.assignment.schoolLeft ? ' (graduate school first)' : ''}: ${svc.assignment.yearsLeft} year${svc.assignment.yearsLeft === 1 ? '' : 's'} left. No deployments until it ends.</div>` : '';
  const done = Object.keys(svc.broadened ?? {}).map((id) => chip(`${ASSIGNMENTS[id].icon} ${esc(assignmentName(svc, id))}`, 'honor')).join(' ') + (svc.joint ? ` ${chip('🏢 Joint qualified', 'honor')}` : '');
  const offered = Object.entries(ASSIGNMENTS).filter(([id, a]) => a.track === svc.track && a.names[svc.branch] && svc.broadened?.[id] == null);
  const rows = offered.map(([id, a]) => {
    const check = assignmentEligibility(state, id);
    const perks = [`${a.years}${a.degree ? ' + 2 school' : ''} yrs`, a.pay ? `+${money(a.pay)}/yr` : null, a.joint ? 'joint credit' : null].filter(Boolean).join(' · ');
    return { ok: check.ok, html: optionRow({ icon: a.icon, title: esc(assignmentName(svc, id)), sub: `${esc(a.desc)} ${perks}`, meta: check.ok ? `About ${Math.round(Math.min(0.9, Math.max(0.1, 0.35 + (svc.eval - 60) / 60)) * 100)}% to be selected` : esc(check.reason), tone: check.ok ? 'good' : 'warn', locked: !check.ok, action: button('Apply', 'military.applyAssignment', { arg: id, variant: 'small', disabled: !check.ok }) }) };
  });
  const open = rows.filter((r) => r.ok);
  const commish = svc.track === 'enlisted' && COMMISSIONING[svc.branch] ? (() => {
    const check = commissioningEligibility(state);
    return `<ul class="job-board">${optionRow({ icon: '🎓', title: esc(COMMISSIONING[svc.branch]), sub: 'Go to college full-time on full pay and commission as an officer at graduation.', meta: check.ok ? 'Board selection' : esc(check.reason), tone: check.ok ? 'good' : 'warn', locked: !check.ok, action: button('Apply', 'military.applyCommissioning', { variant: 'small', disabled: !check.ok }) })}</ul>`;
  })() : '';
  if (!current && !done && !rows.length && !commish) return '';
  return card('Assignments', `${current}${done ? `<div class="chip-row">${done}</div>` : ''}
    ${rows.length ? disclosure('military.assignments', 'Special duty & broadening tours', `<ul class="job-board">${[...open, ...rows.filter((r) => !r.ok)].map((r) => r.html).join('')}</ul>`, { count: `${open.length} open` }) : ''}
    ${commish}
    <p class="fine">Tours away from your field count with promotion boards${svc.track === 'officer' ? ', and general officer boards look for a joint tour' : ''}. You stay home from deployments while on one.</p>`, { icon: '🧭' });
}

/** Change your career field: retrain, apply for warrant officer, and any branch detail. */
function careerFieldCard(state, svc) {
  const row = (m, check, odds, action) => optionRow({ icon: SPECIALTIES[m.specialty].icon, title: `${esc(m.code)} ${esc(m.title)}`, sub: esc(m.desc ?? SPECIALTIES[m.specialty].desc), meta: check.ok ? `About ${Math.round(odds * 100)}% approval` : esc(check.reason), tone: check.ok ? 'good' : 'warn', locked: !check.ok, action: button(action === 'military.applyWarrant' ? 'Apply' : 'Retrain', action, { arg: m.id, disabled: !check.ok, variant: 'small' }) });
  const retrain = retrainTargets(svc).map((m) => ({ m, check: retrainEligibility(state, m.id) }));
  const okRetrain = retrain.filter((x) => x.check.ok);
  const blocked = retrain.length && !okRetrain.length ? retrain[0].check.reason : null;
  const warrant = svc.track === 'enlisted' ? warrantTargets(svc).map((m) => ({ m, check: warrantEligibility(state, m.id) })) : [];
  const okWarrant = warrant.filter((x) => x.check.ok);
  const detail = svc.branchDetail ? `<div class="next-step">🔀 Branch detail: at ${svc.branchDetail.untilYos} years of service you move to <b>${esc(MOS[svc.branchDetail.home]?.title ?? '')}</b>.</div>` : '';
  if (!retrain.length && !warrant.length && !detail) return '';
  const body = `${detail}
    ${retrain.length ? (okRetrain.length
      ? disclosure('military.retrain', 'Retrain into a new job', `<ul class="job-board">${okRetrain.map((x) => row(x.m, x.check, retrainOdds(state, x.m.id), 'military.retrain')).join('')}</ul><p class="fine">Enlisted through E-6 and officers through O-3, once every 3 years. Flight school: age 32 or under, an aptitude test and a board; aviators owe 8 years.</p>`, { count: `${okRetrain.length} open` })
      : `<p class="fine">🔁 Retraining: ${esc(blocked)}.</p>`) : ''}
    ${warrant.length ? disclosure('military.warrant', 'Become a warrant officer', `<ul class="job-board">${[...okWarrant, ...warrant.filter((x) => !x.check.ok)].map((x) => row(x.m, x.check, x.check.ok ? warrantOdds(state, x.m.id) : 0, 'military.applyWarrant')).join('')}</ul><p class="fine">Warrant officers are the technical experts of their field: NCOs (E-5+, 5 years) from that field, or anyone young enough for Army flight school.</p>`, { count: `${okWarrant.length} open` }) : ''}`;
  return card('Career Field', `<p class="muted">Current job: <b>${esc(specialtyName(svc))}</b></p>${body}`, { icon: '🔁' });
}

/** Your last year in uniform: TAP and SkillBridge. */
function transitionCard(state, svc) {
  const near = svc.component === 'active' && (svc.contractYearsLeft <= 1 || svc.yearsOfService >= 19);
  if (!near) return '';
  const track = state.military.transition?.track;
  const field = civilianField(state);
  let bridge;
  if (svc.skillBridge) bridge = `<div class="next-step">🤝 SkillBridge: interning with <b>${esc(svc.skillBridge.employerName)}</b> (${esc(getProfession(svc.skillBridge.professionId).name)}). Expect a job offer when you separate.</div>`;
  else {
    const options = PROFESSION_LIST.filter((p) => skillBridgeEligibility(state, p.id).ok).sort((a, b) => (b.id === field) - (a.id === field) || a.name.localeCompare(b.name)).map((p) => ({ value: p.id, label: `${p.icon} ${p.name}${p.id === field ? ' (matches your job)' : ''}` }));
    bridge = options.length
      ? `<h4 class="sub">SkillBridge internship</h4><p class="fine">Spend your last months with a civilian employer; they usually hire you when you separate.</p><div class="enroll-form" data-collect-root>${select('profession', options)}${button('🤝 Apply', 'military.skillBridge', { variant: 'small', collect: true, disabled: Boolean(state.yearly['military.skillBridge']) })}</div>`
      : `<p class="fine">🤝 SkillBridge: ${esc(skillBridgeEligibility(state, field ?? 'retail').reason ?? 'no internships you qualify for')}.</p>`;
  }
  return card('Transition', `<p class="muted">Your separation is coming up.</p>
    ${track ? `<p>${chip(`${TRACKS[track].icon} TAP: ${TRACKS[track].name}`, 'green')}</p><p class="fine">${esc(TRACKS[track].desc)}</p>` : '<p class="fine">🧭 The Transition Assistance Program will ask you to pick a track.</p>'}
    ${bridge}`, { icon: '🧭', accent: 'green' });
}

/** After service: what the transition still gives you. */
function veteranCard(state) {
  const t = state.military.transition;
  if (!t || t.separatedAge == null) return '';
  const since = state.character.age - t.separatedAge;
  if (since > FAIR_YEARS) return '';
  const field = civilianField(state);
  const items = [
    t.track ? `${TRACKS[t.track].icon} TAP track: <b>${TRACKS[t.track].name}</b> — ${esc(TRACKS[t.track].desc)}` : null,
    field ? `🇺🇸 Veteran hiring fairs offer jobs in <b>${esc(getProfession(field).name)}</b> while you're unemployed (through age ${t.separatedAge + FAIR_YEARS}).` : null,
    (state.health?.va?.rating ?? 0) >= 50 ? '🏥 Your VA rating qualifies you for full VA health care.' : (state.health?.va?.rating ?? 0) > 0 ? '🏥 The VA covers care for your service-connected conditions.' : null,
    '🏠 VA home loans: no down payment, no PMI.',
  ].filter(Boolean);
  return card('Veteran Transition', `<ul class="history">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`, { icon: '🧭', accent: 'green' });
}
