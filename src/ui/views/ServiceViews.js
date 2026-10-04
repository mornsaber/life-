/**
 * Military (Armed Forces) and Reserves (volunteer emergency services) tabs.
 */
import { unitView, billetTitle, leads, canImposeNjp, LEADER_ACTIONS } from '../../modules/org/MilitaryUnits.js';
import { PIPELINES, pipelinesFor, selectionEligibility, courseOdds, MAX_ATTEMPTS } from '../../modules/military/SpecialOps.js';
import { reportName, giBillTransferEligibility } from '../../modules/military/MilitaryLife.js';
import { officers, roster, leadsOrg, topRank, isElectedRank, CHIEF_ACTIONS, LEADERSHIP } from '../../modules/org/VolunteerOrgs.js';
import { PROGRAMS, programEligibility } from '../../modules/service/NationalService.js';
import { STATE_DEFENSE_FORCES, SDF_RANKS, sdfEligibility } from '../../modules/service/StateForces.js';
import { TEAMS, teamEligibility } from '../../modules/service/DisasterTeams.js';
import { POSTS, POST_RANKS, postEligibility, postLeader } from '../../modules/service/VeteranPosts.js';
import { stateIdOf } from '../../modules/life/Regions.js';
import { MOS, DIRECT_COMMISSIONS, hasDirectPath } from '../../modules/military/MOS.js';
import { CLEARANCES } from '../../modules/publicservice/PublicServiceEngine.js';
import { PATHWAYS } from '../../modules/emergency/PaidOpportunities.js';
import { getProfession } from '../../modules/career/JobTrees.js';
import { esc, money, button, card, chip, meter, kv, rankBadge, ladder, ribbonRack, select } from '../Components.js';
import { meetsEducation } from '../../core/State.js';
import {
  BRANCHES, SPECIALTIES, rankOf, specialtyName, enlistmentEligibility, promotionOutlook, annualActivePay, DISCHARGE_LABEL, RETIREMENT_YEARS,
} from '../../modules/military/MilitaryEngine.js';
import { pensionMultiplier, militaryHonors } from '../../modules/military/MedalEngine.js';
import { serviceLimit, transferEligibility, transferChance, UP_OR_OUT_GRADES, PASSOVER_LIMIT } from '../../modules/military/Separation.js';
import { SERVICES, SERVICE_LIST, joinEligibility, nextRankStatus, rankOfMember } from '../../modules/emergency/EmergencyEngine.js';
import { getCredential } from '../../modules/credentials/CredentialRegistry.js';
import { hasCredential, pursueEligibility, findSponsor } from '../../modules/credentials/LicensingEngine.js';

function recruitingOffice(state) {
  const rows = Object.values(BRANCHES).map((b) => {
    const enlisted = enlistmentEligibility(state, b.id, 'enlisted', b.activeOnly ? 'active' : 'reserve');
    const officer = enlistmentEligibility(state, b.id, 'officer', b.activeOnly ? 'active' : 'reserve', { maxOfficerAge: hasDirectPath(state, b.id) ? 42 : 39 });
    const btn = (track, component, base, label) => {
      const check = b.reserveOnly && component === 'active' ? { ok: false, reason: 'Part-time state force' } : b.activeOnly && component !== 'active' ? { ok: false, reason: 'Active duty only' } : base;
      return button(label, 'military.enlist', { arg: `${b.id}:${track}:${component}`, disabled: !check.ok, variant: 'small', title: check.reason ?? '' });
    };
    return `<li class="branch-row">
      <div class="branch-name"><span class="branch-icon">${b.icon}</span><div><b>${b.name}</b><small>${esc(b.motto)}</small></div></div>
      <div class="branch-btns">
        ${b.officerOnly ? '' : `${btn('enlisted', 'active', enlisted, 'Enlist · Active')}${btn('enlisted', 'reserve', enlisted, 'Enlist · Reserve')}`}
        ${btn('officer', 'active', officer, b.officerOnly ? 'Apply for a commission' : 'Officer · Active')}${b.activeOnly ? '' : btn('officer', 'reserve', officer, 'Officer · Reserve')}
      </div>
      ${b.nonCombat ? `<small>${b.id === 'usphs' ? 'Uniformed health professionals: physicians, nurses, pharmacists, engineers, scientists. Deploys to public-health emergencies, not combat.' : 'STEM officers who run NOAA\'s research ships and hurricane-hunter aircraft.'}</small>` : ''}
      <small class="why">${[!b.officerOnly && !enlisted.ok && `Enlisted: ${enlisted.reason}`, !officer.ok && `Officer: ${officer.reason}`].filter(Boolean).map(esc).join(' · ')}</small>
    </li>`;
  }).join('');
  return card('Recruiting Office', `<p class="muted">Enlisted E-1 → E-9; officers O-1 → O-10 (bachelor's required). Each branch has its own jobs (MOS, ratings, AFSCs); paramedics, truckers and IT pros enlist a few grades up, and lawyers, doctors, nurses, pharmacists, clergy and tech veterans can take a <b>direct commission</b> at a rank that matches their experience. <b>Active duty</b> is your full-time job with base housing. <b>Reserve</b> service runs alongside a civilian career. Veterans earn the GI Bill, veterans' preference on civil-service exams, and a pension at 20 years.</p><ul class="branch-list">${rows}</ul>`, { icon: '🇺🇸', accent: 'green' });
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

export function militaryView(state) {
  const svc = state.military.service;
  const history = state.military.history.length
    ? card('Service Record', `<ul class="history">${[...state.military.history].reverse().map((h) => `<li><b>${BRANCHES[h.branch].icon} ${esc(h.rankTitle)} (${h.rankCode})</b> · ${BRANCHES[h.branch].name} ${h.component === 'reserve' ? 'Reserve' : ''} <small>${h.mos && MOS[h.mos] ? `${esc(MOS[h.mos].code)} ${esc(MOS[h.mos].title)} · ` : ''}age ${h.startAge}–${h.endAge}, ${h.yearsOfService} yrs, ${h.deployments} deployments — ${DISCHARGE_LABEL[h.discharge]}</small></li>`).join('')}</ul><p class="fine">Retired pay and VA benefits appear under 💰 Money → Retirement.</p>`, { icon: '🗂️' })
    : '';
  const deserter = state.military.deserter
    ? card('Wanted: Desertion', `<p class="neg">You deserted the ${esc(BRANCHES[state.military.deserter.branch].name)} at age ${state.military.deserter.age}. A federal warrant stays open — desertion has no statute of limitations. If you're caught: court-martial, prison and a dishonorable discharge.</p>`, { icon: '🏃', accent: 'red' })
    : '';
  if (!svc) return `${deserter}${recruitingOffice(state)}${history}`;

  const branch = BRANCHES[svc.branch];
  const rank = rankOf(svc);
  const outlook = promotionOutlook(svc);
  const titles = branch[svc.track];
  const hasBachelor = meetsEducation(state, { level: 'bachelor' });
  return `${card(branch.name, `
    <div class="job-head">
      ${rankBadge(rank.code, rank.title, svc.grade / rank.max, { icon: branch.icon })}
      <div class="job-meta">
        <p>${chip(svc.component === 'active' ? '🪖 Active Duty' : '🏡 Reserve', svc.component === 'active' ? 'cyan' : 'green')} ${chip(`${SPECIALTIES[svc.specialty].icon} ${esc(specialtyName(svc))}`)} ${chip(svc.track === 'officer' ? 'Officer' : 'Enlisted')} ${svc.direct ? chip(`🎓 Direct commission · ${esc(DIRECT_COMMISSIONS[svc.direct].name)}`, 'green') : ''} ${svc.clearance ? chip(`${CLEARANCES[svc.clearance].icon} ${CLEARANCES[svc.clearance].name}`, 'cyan') : ''} ${svc.deploymentRequested ? chip('✋ Deployment requested', 'warn') : ''}</p>
        ${kv([
          ['Base pay', `${money(annualActivePay(svc))}/yr${svc.component === 'reserve' ? ' (active rate)' : ''}`],
          ['Service', `${svc.yearsOfService} yrs`],
          ['Time in grade', `${svc.yearsInGrade} yrs`],
          ['Contract', svc.contractYearsLeft > 0 ? `${svc.contractYearsLeft} yrs left` : 'Up for renewal'],
          ['Duty station', svc.overseas ? `🌍 ${esc(svc.overseas.base)}, ${esc(svc.overseas.country)} (${svc.overseas.accompanied ? 'accompanied' : 'unaccompanied'}, until ${svc.overseas.until})` : esc(svc.station ?? 'Initial training')],
          ['Deployments', `${svc.deployments} (${svc.combatTours} combat)`],
          svc.reports?.length ? [`Last ${reportName(svc)}s`, svc.reports.slice(-3).map((r) => `<span class="${r.block === 'Most Qualified' ? 'pos' : r.block === 'Not Qualified' ? 'neg' : ''}">${esc(r.block)}</span>`).join(' · ')] : null,
          ['Retirement', svc.retirementPlan === 'brs' ? 'Blended (2%/yr + matched TSP)' : svc.retirementPlan === 'legacy' ? 'Legacy (2.5%/yr at 20)' : 'Legacy until year 2'],
          ['Wounds', svc.wounds ? `<span class="neg">${svc.wounds}</span>` : '0'],
          svc.disciplinary ? ['Disciplinary', `<span class="neg">${svc.disciplinary}${svc.njp?.length ? ` · ${svc.njp.length} Article 15${svc.njp.length > 1 ? 's' : ''}` : ''}${svc.courtsMartial ? ` · ${svc.courtsMartial} court-martial` : ''}${svc.reprimand ? ' · reprimand on file' : ''}</span>`] : null,
          ['Up-or-out', `${svc.track === 'officer' && UP_OR_OUT_GRADES.includes(svc.grade) ? `${svc.passovers ?? 0}/${PASSOVER_LIMIT} non-selections · ` : ''}max ${serviceLimit(svc)} yrs at this grade${svc.sanctuary ? ' · sanctuary to 20' : ''}`],
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
      ${((g) => button('🎓 Transfer GI Bill', 'military.transferGiBill', { hint: g.ok ? 'To your children · +4 yrs' : g.reason, disabled: !g.ok }))(giBillTransferEligibility(state))}
      ${button('🎖️ Retire', 'military.retire', { hint: `${RETIREMENT_YEARS}+ yrs · ×${pensionMultiplier(state).toFixed(2)} pension`, disabled: svc.yearsOfService < RETIREMENT_YEARS })}
      ${button('🚪 Leave the Service', 'military.leaveService', { variant: 'danger', hint: 'Early separation, objector status or desertion', disabled: Boolean(state.yearly['military.leave']) })}
    </div>
    ${transferForm(state)}
    <div class="rack-inline">${ribbonRack(militaryHonors(state))}</div>`, { icon: branch.icon, accent: 'green' })}${unitCard(state, svc)}${specialOpsCard(state, svc)}${history}`;
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
      <h4 class="sub">Certifications</h4><ul class="certs">${certList(state, svc.id)}</ul>
      ${PATHWAYS[svc.id] ? `<p class="fine">💼 Experienced members get offered paid work${PATHWAYS[svc.id].gig ? ` (${esc(PATHWAYS[svc.id].gig.label.toLowerCase())})` : ''}${PATHWAYS[svc.id].jobs.length ? ` and job offers in ${PATHWAYS[svc.id].jobs.map((id) => esc(getProfession(id).name)).join(' or ')}` : ''}.</p>` : ''}
      <div class="action-grid">
        ${button('🏋️ Extra Training', 'emergency.train', { arg: svc.id, hint: '+25 XP, once/yr', disabled: member.onLeave })}
        ${button('📟 Pick Up Shifts', 'emergency.shift', { arg: svc.id, hint: 'More calls, +XP', disabled: member.onLeave })}
        ${button('🚪 Resign', 'emergency.resign', { arg: svc.id, variant: 'danger' })}
      </div>`, { icon: svc.icon, accent: { fire: 'red', police: 'blue', ambulance: 'cyan', wildland: 'green', auxiliary: 'blue' }[svc.id] ?? 'orange' });
  }).join('');
  const join = open ? card('Join a Service', `<p class="muted">Volunteer and reserve services run alongside your job, school or military reserve duty. Certifications you earn here count toward paid careers — and units often hire their own volunteers for paid gigs and jobs.</p><ul class="job-board">${open}</ul>`, { icon: '🚨' }) : '';
  const history = state.emergency.history.length
    ? card('Past Service', `<ul class="history">${[...state.emergency.history].reverse().map((h) => `<li><b>${SERVICES[h.serviceId].icon} ${esc(h.rankTitle)}</b> · ${esc(h.unit)} <small>${h.mos && MOS[h.mos] ? `${esc(MOS[h.mos].code)} ${esc(MOS[h.mos].title)} · ` : ''}age ${h.startAge}–${h.endAge}, ${h.calls} calls, ${h.saves} saves — ${esc(h.reason)}</small></li>`).join('')}</ul>`, { icon: '🗂️' })
    : '';
  return `${cards ? `<div class="grid-2">${cards}</div>` : ''}${join}${serviceCards(state)}${history}`;
}

/** Your volunteer organization: officers (elected or appointed), members, and your powers if you lead it. */
function volunteerOrgSection(state, svc, member) {
  const org = state.orgs?.byId?.[member.orgId];
  if (!org) return '';
  const lead = leadsOrg(org, svc.id);
  const L = LEADERSHIP[svc.id];
  const left = CHIEF_ACTIONS - (state.yearly['emergency.lead'] ?? 0);
  const offs = officers(org, svc.ranks).map((o) => `<li><small class="muted">${esc(o.title)}${isElectedRank(svc.id, o.idx) ? ' (elected)' : ''}</small> <b>${o.person === 'PLAYER' ? 'You' : o.person ? esc(o.person.name) : '<span class="muted">vacant</span>'}</b></li>`).join('');
  const members = roster(org).sort((a, b) => b.years - a.years).slice(0, lead ? 8 : 0).map((p) => `<li class="report-row"><div><b>${esc(p.name)}</b> <small class="muted">${esc(svc.ranks[p.rankIndex]?.title ?? '')} · ${p.years} yrs · trusts you ${p.rel}%${p.discipline ? ` · ${p.discipline} suspension${p.discipline > 1 ? 's' : ''}` : ''}</small></div>
    <div class="toggle-row">${button('🎖️ Recognize', 'emergency.commendMember', { arg: `${svc.id}:${p.id}`, variant: 'tiny', disabled: left <= 0 })}${button('⭐ Appoint officer', 'emergency.appointMember', { arg: `${svc.id}:${p.id}`, variant: 'tiny', disabled: left <= 0 })}${button('⚖️ Discipline', 'emergency.disciplineMember', { arg: `${svc.id}:${p.id}`, variant: 'tiny danger', disabled: left <= 0 })}</div></li>`).join('');
  return `<h4 class="sub">${esc(org.name)} · ${Object.keys(org.people).length + 1} members · readiness ${org.readiness}%${lead ? ` · funds ${money(org.funds)}` : ''}</h4>
    <ul class="history">${offs}</ul>
    <p class="fine">${L?.elected.length ? `The membership elects its ${svc.ranks[L.elected.at(-1)].title}${L.elected.length > 1 ? ` and ${svc.ranks[L.elected[0]].title}` : ''} every two years (next at age ${org.nextElection}).` : 'Officer seats open when someone steps down.'} Officer ranks need an open seat as well as experience.</p>
    ${lead ? `<div class="action-grid">${button('📣 Recruitment drive', 'emergency.recruit', { arg: svc.id, disabled: left <= 0 })}${button('🥞 Fundraiser', 'emergency.fundraise', { arg: svc.id, disabled: left <= 0 })}${button('🏛️ Apply for a federal grant', 'emergency.grant', { arg: svc.id, disabled: left <= 0 })}</div><p class="fine">${left} leadership action${left === 1 ? '' : 's'} left this year.</p><ul class="history">${members}</ul>` : ''}`;
}

/** National service, state guards, federal disaster teams and veterans' posts. */
function serviceCards(state) {
  const s = state.service;
  if (!s) return '';
  const out = [];
  // AmeriCorps / Peace Corps
  if (s.program) {
    const p = PROGRAMS[s.program.id];
    out.push(card(p.name, `<p>${chip(`${p.icon} ${esc(p.tracks[s.program.track].name)}`, 'green')} ${chip(esc(s.program.site))}</p>${kv([['Year', `${s.program.years + 1} of ${s.program.term}`], ['Living allowance', `${money(p.stipend)}/yr`], ['On completion', p.award ? `${money(p.award)} Segal Education Award per year` : `${money(p.readjustment)} readjustment allowance`]])}<p class="fine">Federal student loans are in forbearance while you serve.</p><div class="action-grid">${button('🚪 Leave early', 'service.quitProgram', { variant: 'danger', hint: 'No award' })}</div>`, { icon: p.icon, accent: 'green' }));
  } else {
    const rows = Object.entries(PROGRAMS).flatMap(([id, p]) => Object.entries(p.tracks).map(([tid, t]) => {
      const check = programEligibility(state, id, tid);
      return `<li class="job-row ${check.ok ? '' : 'locked'}"><span class="job-icon" aria-hidden="true">${p.icon}</span><div class="job-info"><b>${esc(t.name)}</b><small>${esc(t.desc)} · ${p.termYears === 1 ? '1-year terms' : '27 months'} · ${money(p.stipend)}/yr stipend</small></div>${button('Serve', 'service.joinProgram', { arg: `${id}:${tid}`, disabled: !check.ok, variant: 'small' })}${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}</li>`;
    })).join('');
    out.push(card('National Service', `<p class="muted">A year (or two) of full-time service with a living stipend. Finish and you get an education award (AmeriCorps) or a readjustment allowance (Peace Corps), plus <b>noncompetitive eligibility</b> for federal jobs${(s.nceUntil ?? 0) >= state.character.age ? ` — <b>yours runs through age ${s.nceUntil}</b>` : ''}. Returned Peace Corps Volunteers have an edge in the Foreign Service.${state.education.segalAward ? ` Saved education award: ${money(state.education.segalAward)}.` : ''}</p><ul class="job-board">${rows}</ul>`, { icon: '🤝' }));
  }
  // State Defense Force
  const sdfName = STATE_DEFENSE_FORCES[stateIdOf(state)];
  if (s.sdf) {
    out.push(card(s.sdf.name, `<p>${chip(`🛡️ ${SDF_RANKS[s.sdf.rankIndex]}`, 'green')}</p>${kv([['Years', s.sdf.years], ['State activations', s.sdf.activations]])}<p class="fine">A volunteer state force: monthly drills, called up by the governor for emergencies. It can never be federalized or sent overseas.</p><div class="action-grid">${button('🚪 Resign', 'service.leaveSdf', { variant: 'danger' })}</div>`, { icon: '🛡️' }));
  } else if (sdfName) {
    const check = sdfEligibility(state);
    out.push(card(sdfName, `<p class="muted">Your state's volunteer defense force: shelters, communications and search and rescue when the governor calls. Unpaid except on state active duty; prior service keeps its rank.</p><div class="action-grid">${button('🛡️ Join', 'service.joinSdf', { disabled: !check.ok, hint: check.reason ?? 'Ages 18–65' })}</div>`, { icon: '🛡️' }));
  }
  // FEMA / DMAT
  const teamRows = Object.entries(TEAMS).map(([id, t]) => {
    const m = s.teams[id];
    if (m) return `<li class="job-row"><span class="job-icon" aria-hidden="true">${t.icon}</span><div class="job-info"><b>${esc(t.name)}</b><small>${esc(t.ranks[m.rankIndex])} · ${m.years} yrs · ${m.deployments} deployments</small></div>${button('Resign', 'service.leaveTeam', { arg: id, variant: 'small danger' })}</li>`;
    const check = teamEligibility(state, id);
    return `<li class="job-row ${check.ok ? '' : 'locked'}"><span class="job-icon" aria-hidden="true">${t.icon}</span><div class="job-info"><b>${esc(t.name)}</b><small>${esc(t.desc)} · ≈${money(t.dailyPay)}/day deployed</small></div>${button('Join', 'service.joinTeam', { arg: id, disabled: !check.ok, variant: 'small' })}${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}</li>`;
  }).join('');
  out.push(card('Federal Disaster Teams', `<p class="muted">Intermittent federal service: keep your job, deploy for weeks when disasters strike anywhere in the country.</p><ul class="job-board">${teamRows}</ul>`, { icon: '🏕️' }));
  // Veterans' posts
  const postRows = Object.entries(POSTS).map(([id, p]) => {
    const m = s.posts[id];
    const org = m && state.orgs?.byId?.[m.orgId];
    if (org) {
      const lead = postLeader(org);
      const left = 3 - (state.yearly['service.post'] ?? 0);
      return `<li class="job-row"><span class="job-icon" aria-hidden="true">${p.icon}</span><div class="job-info"><b>${esc(org.name)}</b><small>${esc(POST_RANKS[m.rankIndex])} · ${m.years} yrs · ${org.members} members · standing ${m.standing}${lead ? ` · post funds ${money(org.funds)}` : ''} · officers elected yearly</small>
        <div class="toggle-row">${button('🐟 Volunteer', 'service.postActivity', { arg: `${id}:volunteer`, variant: 'tiny', disabled: left <= 0 })}${button('🎺 Honor guard', 'service.postActivity', { arg: `${id}:honorGuard`, variant: 'tiny', disabled: left <= 0 })}${button('📋 Help a vet with a claim', 'service.postActivity', { arg: `${id}:mentor`, variant: 'tiny', disabled: left <= 0 })}${lead ? `${button('💵 Fundraiser', 'service.postActivity', { arg: `${id}:fundraise`, variant: 'tiny', disabled: left <= 0 })}${button('🎓 Fund a scholarship', 'service.postActivity', { arg: `${id}:scholarship`, variant: 'tiny', disabled: left <= 0 })}${button('🏛️ Testify for veterans', 'service.postActivity', { arg: `${id}:advocate`, variant: 'tiny', disabled: left <= 0 })}` : ''}</div></div>${button('Leave', 'service.leavePost', { arg: id, variant: 'small danger' })}</li>`;
    }
    const check = postEligibility(state, id);
    return `<li class="job-row ${check.ok ? '' : 'locked'}"><span class="job-icon" aria-hidden="true">${p.icon}</span><div class="job-info"><b>${esc(p.name)}</b><small>${esc(p.needs)} · $${p.dues}/yr dues</small></div>${button('Join', 'service.joinPost', { arg: id, disabled: !check.ok, variant: 'small' })}${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}</li>`;
  }).join('');
  out.push(card('Veterans Posts', `<p class="muted">Your local VFW and American Legion posts: fish fries, honor guards and helping younger veterans. Members elect officers every year, and a post commander is a voice in local politics.</p><ul class="job-board">${postRows}</ul>`, { icon: '🎖️' }));
  return out.join('');
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

/** Special operations: your team if you're in one, else the selection courses open to you. */
function specialOpsCard(state, svc) {
  if (svc.sof) {
    const p = PIPELINES[svc.sof.pipeline];
    return card(p.name, `<p>${chip(`${p.icon} ${esc(p.badge)}`, 'honor')} ${chip(esc(svc.sof.unitName))}</p>
      ${kv([['Since age', svc.sof.since], ['Special pay', `${money(svc.sof.specialPay)}/yr`], ['Team missions', svc.sof.missions]])}
      <p class="fine">${esc(p.desc)} Operators deploy more often, to places conventional units don't go. Bodies wear out: low fitness or health (or age 45) rotates you back to a conventional unit.</p>
      <div class="action-grid">${button('🔁 Leave the teams', 'military.leaveSof', { variant: 'small', hint: 'Return to a conventional unit' })}</div>`, { icon: p.icon, accent: 'yellow' });
  }
  const ids = pipelinesFor(svc);
  if (!ids.length) return '';
  const rows = ids.map((id) => {
    const p = PIPELINES[id];
    const check = selectionEligibility(state, id);
    const tries = svc.selectionAttempts?.[id] ?? 0;
    return `<li class="job-row ${check.ok ? '' : 'locked'}">
      <span class="job-icon" aria-hidden="true">${p.icon}</span>
      <div class="job-info"><b>${esc(p.name)}</b><small>${esc(p.desc)}<br>${p.phases.map((ph) => esc(ph.name)).join(' → ')} · ${p.minFitness}+ fitness${p.minSmarts ? `, ${p.minSmarts}+ smarts` : ''} · age ≤ ${p.maxAge} · +${money(p.specialPay)}/yr${tries ? ` · attempt ${tries}/${MAX_ATTEMPTS} used` : ''}</small></div>
      ${button('Volunteer', 'military.volunteerSelection', { arg: id, disabled: !check.ok, variant: 'small' })}
      <span class="${check.ok ? 'fine' : 'why'}">${check.ok ? `~${Math.round(courseOdds(state, id) * 100)}% finish` : esc(check.reason)}</span>
    </li>`;
  }).join('');
  return card('Special Operations', `<p class="muted">Selection courses wash out most volunteers. ${p0(ids)} Graduates join a special operations unit with special-duty pay, more deployments and their own missions. You get ${MAX_ATTEMPTS} tries per course.</p><ul class="job-board">${rows}</ul>`, { icon: '🗡️' });
}
const p0 = (ids) => (ids.some((id) => PIPELINES[id].mental) ? 'Some test the mind more than the body.' : 'Phases test body and mind; quitting is always an option.');
