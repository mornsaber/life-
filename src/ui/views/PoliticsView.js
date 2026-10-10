/**
 * Politics tab: current office and approval, an active campaign (funds,
 * endorsements, projected vote share), offices you could run for, history.
 */
import { esc, money, button, card, chip, meter, kv, empty, disclosure } from '../Components.js';
import { OFFICES, OFFICE_ORDER, ENDORSEMENTS, runEligibility, voteShare, scandalPenalty } from '../../modules/politics/index.js';
import { appointmentEligibility } from '../../modules/politics/Campaigns.js';
import { stateOf } from '../../modules/life/Regions.js';
import { appointmentsInReach, APPOINTEE_KINDS } from '../../modules/org/Government.js';
import { officeRoster, DEPUTY_KINDS, OFFICE_ACTIONS } from '../../modules/org/ElectedOffices.js';
import { ratingLabel } from '../../modules/career/PayGrades.js';
import { legislatureCards } from './LegislatureView.js';
import { officeOrderFor } from '../../modules/politics/NationalOffices.js';
import { stateIdOf } from '../../modules/life/Regions.js';

export function politicsView(state) {
  const p = state.politics;
  const o = p.office;
  const c = p.campaign;
  const office = o && OFFICES[o.id];
  const current = o
    ? card(`${office.icon} ${office.name}`, `
        ${meter(o.approval, { label: '🗳️ Approval' })}
        ${kv([['Term', `${o.terms}${office.termLimit ? ` of ${office.termLimit}` : ''} · ${o.termYearsLeft} yr left`], ['Salary', `${money(office.salary)}/yr`], ['Type', office.fullTime ? 'Full-time' : 'Part-time (keep your job)'], ['Pension', office.pension === 'fers' ? 'FERS' : 'Elected Officials Retirement Plan']])}
        <div class="row-end">${button('👋 Resign', 'politics.resign', { variant: 'danger small' })}</div>`, { icon: '🏛️', accent: 'yellow' })
    : '';
  const campaign = c
    ? card(`Campaign: ${OFFICES[c.officeId].name}`, `
        ${meter(Math.min(100, (c.funds / OFFICES[c.officeId].cost) * 100), { label: `💰 War chest ${money(c.funds)} of ~${money(OFFICES[c.officeId].cost)}`, suffix: '%' })}
        ${meter(Math.round(voteShare(state, c.officeId, c) * 100), { label: '📊 Projected vote share', tone: voteShare(state, c.officeId, c) > 0.5 ? 'good' : 'mid' })}
        ${c.vsIncumbent ? `<p class="why">You're challenging an entrenched incumbent.</p>` : ''}
        <div class="abilities">${Object.entries(ENDORSEMENTS).map(([id, e]) => c.endorsements.includes(id) ? chip(`${e.icon} ${e.name} ✓`, 'good') : button(`${e.icon} Seek ${e.name}`, 'politics.endorse', { arg: id, variant: 'tiny' })).join(' ')}</div>
        <div class="action-grid">
          ${button('📞 Fundraise', 'politics.fundraise', { hint: 'Twice a year' })}
          ${button('💵 Self-fund (25% of cash)', 'politics.selfFund')}
          ${button('🚪 Canvass', 'politics.canvass', { hint: '+Name recognition' })}
          ${button('🎤 Debate', 'politics.debate', { hint: 'Once' })}
          ${button('🏳️ Drop out', 'politics.dropOut', { variant: 'danger' })}
        </div>
        <p class="fine">The election is held when you next age up. Scandal drag: −${Math.round(scandalPenalty(state) * 100)} pts.</p>`, { icon: '🗳️', accent: 'green' })
    : '';
  const openIds = new Set();
  const rowsFor = (id) => {
    const of = OFFICES[id];
    const appointed = Boolean(of.appointedBy);
    const check = appointed ? appointmentEligibility(state, id) : runEligibility(state, id);
    if (check.ok) openIds.add(id);
    const est = check.ok && !appointed ? Math.round(voteShare(state, id, { funds: of.cost * 0.4, endorsements: [] }) * 100) : null;
    return `<li class="job-row ${check.ok ? '' : 'locked'}">
      <span class="job-icon">${of.icon}</span>
      <div class="job-info"><b>${of.name}</b><small>${money(of.salary)}/yr · ${appointed ? `${of.term}-yr contract · hired by ${of.appointedBy}` : `${of.term}-yr term${of.termLimit ? `, ${of.termLimit}-term limit` : ''} · campaign ~${money(of.cost)}`} · ${of.fullTime ? 'full-time' : 'part-time'}${of.judicial ? ' · usually filled by appointment' : ''}</small>
        ${est !== null ? `<small class="req">Projected ≈${est}% with a typical campaign</small>` : ''}</div>
      ${appointed ? button(check.ok ? 'Apply' : '🔒', 'politics.applyAppointed', { arg: id, variant: 'small', disabled: !check.ok, title: check.reason ?? '' }) : button(check.ok ? 'Run' : '🔒', 'politics.run', { arg: id, variant: 'small', disabled: !check.ok || Boolean(c), title: check.reason ?? '' })}
      ${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}
    </li>`;
  };
  const order = officeOrderFor(state.character.countryId ?? 'US', stateIdOf(state), OFFICE_ORDER);
  const allRows = order.map((id) => [id, rowsFor(id)]);
  const openRows = allRows.filter(([id]) => openIds.has(id)).map(([, r]) => r).join('');
  const lockedRows = allRows.filter(([id]) => !openIds.has(id)).map(([, r]) => r).join('');
  const ladder = `${openRows || '<li class="muted">No office is open to you yet.</li>'}${lockedRows ? `<li>${disclosure('politics.locked', '🔒 Offices not open to you yet', `<ul class="job-board">${lockedRows}</ul>`, { count: order.length - openIds.size })}</li>` : ''}`;
  const history = p.history.length ? `<ul class="history">${p.history.map((h) => `<li>${OFFICES[h.officeId].icon} <b>${OFFICES[h.officeId].name}</b> <small>age ${h.startAge}–${h.endAge}, ${h.terms} term${h.terms > 1 ? 's' : ''} — ${esc(h.reason)}</small></li>`).join('')}</ul>` : empty('No offices held yet.');
  return `${current}${officeCard(state)}${appointmentsCard(state)}${campaign}
    ${card('Run for Office', `<p class="muted">${esc(stateOf(state).name)} · name recognition ${p.recognition}/100. Experience in lower office, money, endorsements and honors win races; your legal record loses them. Governors appoint judges and agency heads.</p><ul class="job-board">${ladder}</ul>`, { icon: '🗳️' })}
    ${legislatureCards(state)}
    ${card('Political History', history, { icon: '🗂️' })}`;
}

/** The agency heads your office appoints, and who holds each post now. */
function appointmentsCard(state) {
  const posts = appointmentsInReach(state, { ensure: false });
  if (!posts.length) return '';
  const used = state.yearly['orgs.appoint'] ?? 0;
  const rows = posts.map((a) => {
    const arg = `${a.org.id}|${a.deptId ?? '-'}`;
    return `<li class="report-row"><div><b>${esc(a.title)}</b> <small class="muted">${esc(a.org.name)}${a.org.performance != null ? ` · performance ${a.org.performance}` : ''}</small><br><small>${a.holder ? `${esc(a.holder.name)}${a.holder.appointedByPlayer ? ' (your appointee)' : ''}` : 'Vacant'}</small></div>
      <div class="toggle-row">${Object.entries(APPOINTEE_KINDS).map(([kind, k]) => button(k.label, 'orgs.appoint', { arg: `${arg}|${kind}`, variant: 'tiny', hint: k.hint, disabled: used >= 2 })).join('')}</div></li>`;
  }).join('');
  return card('Your Appointments', `<p class="fine">Your office names these leaders. Their results shape your approval. ${2 - used} appointment${2 - used === 1 ? '' : 's'} left this year.</p><ul class="history">${rows}</ul>`, { icon: '⭐' });
}

/** The organization your office runs: performance, your second-in-command, named staff (or department heads). */
function officeCard(state) {
  const r = officeRoster(state);
  if (!r) return '';
  const s = r.seat;
  const h = s.holder;
  const left = OFFICE_ACTIONS - (state.yearly['orgs.officeAct'] ?? 0);
  const person = (p, deputy = false) => `<li class="report-row"><div><b>${esc(p.name)}</b> <small class="muted">${esc(p.title)} · ${p.years} yr · rated ${ratingLabel(p.performance)} · likes you ${p.rel}%${p.discipline ? ` · ${p.discipline} on file` : ''}${p.appointedByPlayer ? ' · your appointee' : ''}</small></div>
    <div class="toggle-row">${button('🏅 Commend', 'orgs.officeCommend', { arg: p.id, variant: 'tiny', disabled: left <= 0 })}${button('📝 Discipline', 'orgs.officeDiscipline', { arg: p.id, variant: 'tiny', disabled: left <= 0 })}${deputy ? '' : button('⬆️ Promote', 'orgs.officePromote', { arg: p.id, variant: 'tiny', disabled: left <= 0 })}${button('🚪 Fire', 'orgs.officeFire', { arg: p.id, variant: 'tiny danger', disabled: left <= 0 })}</div></li>`;
  const name = s.deptId ? s.dept.name : s.org.name;
  const body = s.deptId
    ? `<h4 class="sub">${esc(r.deputyTitle)}</h4>
      ${r.deputy ? `<ul class="history">${person(r.deputy, true)}</ul>` : '<p class="warn-text">Vacant — appoint someone.</p>'}
      <div class="toggle-row">${Object.entries(DEPUTY_KINDS).map(([k, d]) => button(`${d.label}`, 'orgs.officeAppoint', { arg: k, variant: 'tiny', disabled: left <= 0, hint: r.deputy ? 'Replace your deputy' : 'Fill the post' })).join('')}</div>
      <h4 class="sub">Staff</h4><ul class="history">${r.staff.map((p) => person(p)).join('')}</ul>
      <p class="fine">Deputies and staff attorneys are civil servants: firing one without cause usually ends in a grievance that reinstates them. Your own appointee serves at your pleasure.</p>`
    : `<h4 class="sub">Departments</h4><ul class="history">${r.heads.map((x) => `<li>${esc(x.dept.name)} <small class="muted">${x.person ? `${esc(x.person.name)}, ${esc(x.person.title)}` : x.def.head.office ? 'elected separately' : 'vacant'}${x.def.head.appointedBy ? ` · appointed by ${esc(x.def.head.appointedBy)}` : ''}</small></li>`).join('')}</ul>
      <p class="fine">Appoint department heads in "Your Appointments" below.</p>`;
  return card(`You run ${esc(name)}`, `
    ${meter(h.performance ?? 55, { label: '📊 Office performance' })}
    ${meter(h.morale ?? 60, { label: '😊 Staff morale' })}
    <p class="fine">How well the office runs moves your approval every year. ${left > 0 ? `${left} management action${left > 1 ? 's' : ''} left this year.` : 'No management actions left this year.'}</p>
    ${body}`, { icon: '🏛️', accent: 'yellow' });
}
