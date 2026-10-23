/**
 * Politics tab: current office and approval, an active campaign (funds,
 * endorsements, projected vote share), offices you could run for, history.
 */
import { honourPowers, nominees } from '../../modules/politics/Patronage.js';
import { CATALOG, ARRANGEMENTS, canChoose, executiveChoice, arrangementOf } from '../../modules/politics/PublicServices.js';
import { executiveLevel } from '../../modules/politics/Budgets.js';
import { governmentCard, partyCard } from './GovernmentCard.js';
import { oneParty, partyHere, rankTitle, govPostRanks } from '../../modules/politics/CommunistParty.js';
import { crownCards } from './CrownCard.js';
import { LAWS, levelValue, describeValue } from '../../modules/politics/Laws.js';
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
import { ISSUES, ISSUE_IDS, platformView, ideology, ideologyLabel, credibility, recordOn } from '../../modules/politics/Platform.js';
import { electorateOf, generalShare, primaryShare, nextElectionYear, FILING_WINDOW, outsideCalendar, opponentLabel, isPartisan } from '../../modules/politics/Elections.js';
import { partyName } from '../../modules/politics/Parties.js';
import { currentYear } from '../../core/State.js';

/** As an executive: how each service at your level is delivered, and what you can change. */
function cityServicesCard(state) {
  const level = executiveLevel(state.politics.office?.id) ?? (/mayor/i.test(state.politics.office?.id ?? '') ? 'city' : null);
  if (!level) return '';
  const rows = Object.entries(CATALOG).filter(([id, s]) => s.level === level && canChoose(state, id)).map(([id, s]) => {
    const now = arrangementOf(state, id);
    const c = executiveChoice(state, id);
    const opts = c.options ?? [];
    return `<li class="report-row"><div><b>${s.icon} ${esc(s.label)}</b> <small class="muted">${ARRANGEMENTS[now].icon} ${esc(ARRANGEMENTS[now].label)}</small></div>
      <div class="toggle-row">${opts.length ? opts.map((o) => button(o.label, 'cityServices.decide', { arg: `${id}|${o.to}`, variant: 'tiny', disabled: !o.ok || !c.ok && c.reason === 'One change a year', hint: o.ok ? o.effect : o.reason })).join('') : `<small class="why">${esc(c.reason ?? '')}</small>`}</div></li>`;
  }).join('');
  return rows ? card('Public Services', `<ul class="history">${rows}</ul><p class="fine">Contracting out and privatizing save money and cost approval; abolishing a service saves it all. Bringing one back in-house is popular and expensive. Private providers need the law's permission (private policing, ambulances, prisons, fire). The people who work there transfer or are laid off.</p>`, { icon: '🏙️' }) : '';
}

/** What an executive (or a cabinet secretary) can do this year. */
function executiveConsole(state) {
  const o = state.politics.office;
  if (o?.id === 'cabinetSecretary') return `<div class="action-grid">${button('💼 Fight for your department\'s budget', 'executive.lobbyDepartment', { hint: 'Once a budget cycle' })}</div>`;
  const level = executiveLevel(o?.id);
  if (!level) return '';
  const lv = level === 'national' ? 'federal' : level;
  const laws = Object.entries(LAWS).filter(([, l]) => l.levels.includes(lv));
  const agenda = laws.map(([id, l]) => `<li class="report-row"><div>${l.icon} ${esc(l.name)} <small class="muted">${esc(describeValue(id, levelValue(state, id, lv, lv === 'city' ? state.character.regionId : lv === 'state' ? stateIdOf(state) : (state.character.countryId && state.character.countryId !== 'US' ? state.character.countryId : null))))}</small></div>
    <div class="toggle-row">${button('▼', 'legislature.executiveBill', { arg: `${id}|down`, variant: 'tiny', hint: 'Send a bill to weaken / cut it' })}${button('▲', 'legislature.executiveBill', { arg: `${id}|up`, variant: 'tiny', hint: 'Send a bill to strengthen / raise it' })}</div></li>`).join('');
  return `<div class="action-grid">
      ${button('🎤 Address the public', 'executive.address', { hint: 'Once a year' })}
      ${button('🧊 Freeze hiring', 'executive.hiringFreeze', { hint: 'Every department ~3% leaner' })}
      ${level !== 'city' ? button('🕊️ Grant a pardon', 'executive.pardon', { hint: 'A gamble with the public' }) : ''}
    </div>
    ${disclosure('politics.agenda', '📜 Your legislative agenda (2 bills a year)', `<ul class="history">${agenda}</ul><p class="fine">Your bills go to the legislature with your standing behind them; it still has to pass them. Budgets are in "Your Government" below.</p>`)}`;
}

/** Honours you can put names forward for (Patronage.js). */
function patronageCard(state) {
  const powers = honourPowers(state);
  if (!powers) return '';
  const used = state.yearly?.['patronage.nominate'] ?? 0;
  const left = powers.kind === 'resignation' ? powers.perYear : Math.max(0, powers.perYear - used);
  const rows = nominees(state).map((n) => `<li class="report-row"><div><b>${esc(n.name)}</b> <small class="muted">${esc(n.who)}${n.kind === 'family' ? ' · nepotism risk' : n.kind === 'personal' ? ' · cronyism risk' : ''}</small></div><div class="toggle-row">${button('🎗️ Nominate', 'patronage.nominate', { arg: n.id, variant: 'tiny', disabled: !left })}${powers.peers && n.kind !== 'family' ? button('👑 Peerage', 'patronage.nominate', { arg: `${n.id}|peer`, variant: 'tiny', disabled: !left }) : ''}</div></li>`).join('');
  return card(powers.label, `<p class="fine">${left} nomination${left === 1 ? '' : 's'} left${powers.kind === 'resignation' ? '' : ' this year'}. The worthy are popular; friends, family and staff can make headlines.</p>${rows ? `<ul class="history">${rows}</ul>` : '<p class="muted">No names this year.</p>'}`, { icon: '🎗️' });
}

/** One-party states: no races to run. Every post is filled by the Party from its cadres. */
function partyPostsCard(state) {
  const pt = partyHere(state);
  const gov = govPostRanks(state);
  const rows = Object.entries(gov).filter(([id]) => OFFICES[id]).map(([id, rank]) => `<li class="job-row"><span class="job-icon">${OFFICES[id].icon}</span><div class="job-info"><b>${esc(OFFICES[id].name)}</b><small>Offered to a cadre promoted to ${esc(rankTitle(state, rank))}, instead of the Party post</small></div></li>`).join('');
  const top = OFFICES[pt.office];
  return card('Posts in the Party-State', `<p class="muted">There are no open races here. ${esc(pt.short[0].toUpperCase() + pt.short.slice(1))} nominates every deputy and appoints every mayor, governor and minister from its own cadres. To hold office, rise in ${esc(pt.name)} (below): at some promotions the Organization Department lets you serve on the government side instead.</p>
    <ul class="job-board">${rows}${top ? `<li class="job-row"><span class="job-icon">${top.icon}</span><div class="job-info"><b>${esc(top.name)}</b><small>Held by the General Secretary, who also chairs ${esc(pt.cmc)}</small></div></li>` : ''}
    <li class="job-row"><span class="job-icon">🏛️</span><div class="job-info"><b>Deputy to ${esc(pt.congress)}</b><small>Senior cadres (city level and up) are put on the Party's list and returned unopposed</small></div></li></ul>`, { icon: '☭', accent: 'red' });
}

export function politicsView(state) {
  const p = state.politics;
  const o = p.office;
  const c = p.campaign;
  const office = o && OFFICES[o.id];
  const current = o
    ? card(`${office.icon} ${esc(o.title ?? office.name)}`, `
        ${meter(o.approval, { label: '🗳️ Approval' })}
        ${o.drivers?.length ? `<p class="fine">Last year: ${o.drivers.map((d) => `${esc(d.label)} <span class="${d.delta >= 0 ? 'pos' : 'neg'}">${d.delta >= 0 ? '+' : ''}${d.delta}</span>`).join(' · ')}</p>` : ''}
        ${executiveConsole(state)}
        ${kv([['Term', o.viaParty ? 'Until the Party moves you' : `${o.terms}${office.termLimit ? ` of ${office.termLimit}` : ''} · ${o.termYearsLeft} yr left`], ['Salary', `${money(o.salary ?? office.salary)}/yr`], ['Type', office.fullTime ? 'Full-time' : 'Part-time (keep your job)'], ['Pension', o.viaParty ? 'Cadre pension (civil service)' : office.pension === 'fers' ? 'FERS' : 'Elected Officials Retirement Plan']])}
        <div class="row-end">${button('👋 Resign', 'politics.resign', { variant: 'danger small' })}</div>`, { icon: '🏛️', accent: 'yellow' })
    : '';
  const campaign = c ? campaignCard(state, c) : '';
  const openIds = new Set();
  const rowsFor = (id) => {
    const of = OFFICES[id];
    const appointed = Boolean(of.appointedBy);
    const check = appointed ? appointmentEligibility(state, id) : runEligibility(state, id);
    if (check.ok) openIds.add(id);
    const est = check.ok && !appointed ? Math.round(voteShare(state, id, { funds: of.cost * 0.4, endorsements: [] }) * 100) : null;
    // The calendar: when the next election is, and whether filing is open.
    const legacy = appointed || outsideCalendar(state, id);
    const year = legacy ? null : nextElectionYear(state, id);
    const filing = legacy || year - currentYear(state) <= FILING_WINDOW(id);
    return `<li class="job-row ${check.ok ? '' : 'locked'}">
      <span class="job-icon">${of.icon}</span>
      <div class="job-info"><b>${of.name}</b><small>${money(of.salary)}/yr · ${appointed ? `${of.term}-yr contract · hired by ${of.appointedBy}` : `${of.term}-yr term${of.termLimit ? `, ${of.termLimit}-term limit` : ''} · campaign ~${money(of.cost)}`} · ${of.fullTime ? 'full-time' : 'part-time'}${of.judicial ? ' · usually filled by appointment' : ''}</small>
        ${est !== null ? `<small class="req">Projected ≈${est}% with a typical campaign${year ? ` · election ${year}${filing ? ' · filing open' : ` · filing opens ${year - FILING_WINDOW(id)}`}` : ''}</small>` : ''}</div>
      ${appointed ? button(check.ok ? 'Apply' : '🔒', 'politics.applyAppointed', { arg: id, variant: 'small', disabled: !check.ok, title: check.reason ?? '' }) : button(check.ok ? (filing ? 'Run' : 'Not yet') : '🔒', 'politics.run', { arg: id, variant: 'small', disabled: !check.ok || !filing || Boolean(c), title: check.reason ?? (filing ? '' : `Filing opens ${year - FILING_WINDOW(id)}`) })}
      ${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}
    </li>`;
  };
  const order = officeOrderFor(state.character.countryId ?? 'US', stateIdOf(state), OFFICE_ORDER);
  const allRows = order.map((id) => [id, rowsFor(id)]);
  const openRows = allRows.filter(([id]) => openIds.has(id)).map(([, r]) => r).join('');
  const lockedRows = allRows.filter(([id]) => !openIds.has(id)).map(([, r]) => r).join('');
  const ladder = `${openRows || '<li class="muted">No office is open to you yet.</li>'}${lockedRows ? `<li>${disclosure('politics.locked', '🔒 Offices not open to you yet', `<ul class="job-board">${lockedRows}</ul>`, { count: order.length - openIds.size })}</li>` : ''}`;
  const results = (p.results ?? []).length ? `<h4 class="sub">Election results</h4><ul class="history">${p.results.slice().reverse().map((r) => `<li>${r.won ? '✅' : '❌'} ${r.year} ${r.stage === 'primary' ? 'primary' : 'election'} · ${esc(OFFICES[r.officeId]?.name ?? r.officeId)} <small>${r.share}%${r.against ? ` vs ${esc(r.against)}` : ''}</small></li>`).join('')}</ul>` : '';
  const history = p.history.length ? `<ul class="history">${p.history.map((h) => `<li>${OFFICES[h.officeId].icon} <b>${OFFICES[h.officeId].name}</b> <small>age ${h.startAge}–${h.endAge}, ${h.terms} term${h.terms > 1 ? 's' : ''} — ${esc(h.reason)}</small></li>`).join('')}</ul>` : empty('No offices held yet.');
  return `${current}${cityServicesCard(state)}${officeCard(state)}${appointmentsCard(state)}${campaign}
    ${patronageCard(state)}
    ${crownCards(state)}
    ${oneParty(state) ? partyPostsCard(state) : `${platformCard(state)}
    ${card('Run for Office', `<p class="muted">${esc(stateOf(state).name)} · name recognition ${p.recognition}/100. Elections come in their cycle years; file within a year of the vote (two for governor, senator or president). Your party and the district's lean, how close your platform is to the voters, money, experience and scandals decide it.</p><ul class="job-board">${ladder}</ul>`, { icon: '🗳️' })}`}
    ${partyCard(state)}
    ${governmentCard(state)}
    ${legislatureCards(state)}
    ${card('Political History', `${history}${results}`, { icon: '🗂️' })}`;
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

/** Where you stand: your platform on each issue, your record, your credibility — and, when you're running or serving, your voters. */
function platformCard(state) {
  const p = state.politics;
  const pf = platformView(state);
  const officeId = p.campaign?.officeId ?? p.office?.id ?? null;
  const e = officeId && OFFICES[officeId] && !OFFICES[officeId].appointedBy ? electorateOf(state, officeId) : null;
  const rows = ISSUE_IDS.map((id) => {
    const i = ISSUES[id];
    const v = pf[id];
    const rec = recordOn(state, id);
    const voters = e ? Math.round(e.median[id]) : null;
    const gap = voters === null ? null : Math.abs(v - e.median[id]);
    return `<li class="report-row"><div>${i.icon} <b>${esc(i.name)}</b> <small class="muted">"${esc(i.stances[v + 2])}"</small>
        ${voters !== null ? `<br><small class="${gap >= 1.5 ? 'neg' : gap <= 0.5 ? 'pos' : ''}">Your voters: "${esc(i.stances[voters + 2])}"</small>` : ''}
        ${rec !== null ? `<br><small class="${Math.sign(rec) && Math.sign(v) && Math.sign(rec) !== Math.sign(v) ? 'neg' : 'muted'}">Your record: ${rec < -0.3 ? 'votes with the left' : rec > 0.3 ? 'votes with the right' : 'mixed'}</small>` : ''}</div>
      <div class="toggle-row">${button('◀ Left', 'politics.stance', { arg: `${id}|${v - 1}`, variant: 'tiny', disabled: v <= -2 })}${button('Right ▶', 'politics.stance', { arg: `${id}|${v + 1}`, variant: 'tiny', disabled: v >= 2 })}</div></li>`;
  }).join('');
  const x = ideology(state);
  return card('Where You Stand', `
    <p class="muted">${esc(ideologyLabel(x))}${state.civic?.party ? ` · ${esc(partyName(state, state.civic.party.bloc))}` : ' · no party'}${e ? ` · your electorate: ${esc(e.label)}` : ''}</p>
    ${meter(credibility(state), { label: '🤝 Credibility', tone: credibility(state) >= 60 ? 'good' : 'mid' })}
    <ul class="history">${rows}</ul>
    <p class="fine">Primary voters want you on their side of every issue; general-election voters want you near them. Change one stance a year; a big swing, or any change in the last year of a campaign, is a flip-flop. Votes against your own platform cost credibility.${(p.flipflops ?? []).length ? ` Flip-flops on record: ${p.flipflops.length}.` : ''}</p>`, { icon: '🧭' });
}

/** A campaign: the race, the polls, the other candidate, and the work. */
function campaignCard(state, c) {
  const office = OFFICES[c.officeId];
  if (c.legacy) {
    return card(`Campaign: ${office.name}`, `
      ${meter(Math.min(100, (c.funds / office.cost) * 100), { label: `💰 War chest ${money(c.funds)} of ~${money(office.cost)}`, suffix: '%' })}
      ${meter(Math.round(voteShare(state, c.officeId, c) * 100), { label: '📊 Projected support', tone: voteShare(state, c.officeId, c) > 0.5 ? 'good' : 'mid' })}
      <div class="abilities">${Object.entries(ENDORSEMENTS).map(([id, e]) => c.endorsements.includes(id) ? chip(`${e.icon} ${e.name} ✓`, 'good') : button(`${e.icon} Seek ${e.name}`, 'politics.endorse', { arg: id, variant: 'tiny' })).join(' ')}</div>
      <div class="action-grid">${button('📞 Fundraise', 'politics.fundraise', { hint: 'Twice a year' })}${button('🚪 Canvass', 'politics.canvass')}${button('🎤 Debate', 'politics.debate')}${button('🏳️ Drop out', 'politics.dropOut', { variant: 'danger' })}</div>
      <p class="fine">Decided when you next age up.</p>`, { icon: '🗳️', accent: 'green' });
  }
  const primary = c.stage === 'primary';
  const g = generalShare(state, c.officeId, c, { incumbent: c.incumbent });
  const share = primary ? primaryShare(state, c.officeId, c) : g.share;
  const opp = c.opponent;
  const years = c.electionYear - currentYear(state);
  const polls = (c.polls ?? []).map((x) => `${x.you}%`).join(' → ');
  const adCost = Math.round(office.cost * 0.1);
  return card(`${c.incumbent ? 'Re-election' : 'Campaign'}: ${office.name}`, `
    <p class="muted">${primary ? `${isPartisan(c.officeId) ? 'Primary' : 'Election'} first` : 'General election'} · ${years > 0 ? `election in ${c.electionYear} (${years} yr)` : 'election this year — at your next birthday'}${polls ? ` · polls: ${polls}` : ''}</p>
    ${meter(Math.round(share * 100), { label: primary ? '📊 Primary projection' : '📊 Projected vote share', tone: share > 0.5 ? 'good' : 'mid' })}
    ${meter(Math.min(100, (c.funds / office.cost) * 100), { label: `💰 War chest ${money(c.funds)} (${opp ? `${esc(opp.name)}: ${money(opp.funds)}` : `~${money(office.cost)} typical`})`, suffix: '%' })}
    ${opp ? `<p><b>${primary ? 'Waiting in the general' : 'Your opponent'}:</b> ${esc(opponentLabel(state, opp))}, ${esc(opp.background)} · quality ${opp.quality}${opp.scandal ? ` · <span class="neg">${opp.scandal} scandal${opp.scandal > 1 ? 's' : ''}</span>` : ''}${c.oppoDone ? ` · file: ${esc(opp.weakness)}` : ''}</p>` : ''}
    ${primary && c.rivals.length ? `<p><b>Primary field:</b> ${c.rivals.map((r) => `${esc(r.name)} (quality ${r.quality})`).join(', ')}. Primary voters want a candidate firmly on their side.</p>` : ''}
    ${primary ? '' : `<p class="fine">${g.parts.map((x) => `${esc(x.label)} <span class="${x.v >= 0 ? 'pos' : 'neg'}">${x.v >= 0 ? '+' : ''}${Math.round(x.v * 1000) / 10}</span>`).join(' · ')}</p>`}
    <div class="abilities">${Object.entries(ENDORSEMENTS).map(([id, e]) => c.endorsements.includes(id) ? chip(`${e.icon} ${e.name} ✓`, 'good') : button(`${e.icon} Seek ${e.name}`, 'politics.endorse', { arg: id, variant: 'tiny' })).join(' ')}</div>
    <div class="action-grid">
      ${button('📞 Fundraise', 'politics.fundraise', { hint: 'Twice a year' })}
      ${button('💵 Self-fund (25% of cash)', 'politics.selfFund')}
      ${button('📺 Run an ad', 'politics.ad', { arg: 'positive', hint: money(adCost), disabled: c.funds < adCost })}
      ${button('🗡️ Attack ad', 'politics.ad', { arg: 'attack', hint: money(adCost), disabled: c.funds < adCost })}
      ${button('🚪 Canvass', 'politics.canvass', { hint: '+Name recognition' })}
      ${button('🔎 Opposition research', 'politics.oppo', { hint: money(office.cost * 0.05), disabled: c.oppoDone })}
      ${button('🎤 Debate', 'politics.debate', { hint: 'Once a year' })}
      ${button('🏳️ Drop out', 'politics.dropOut', { variant: 'danger' })}
    </div>
    ${disclosure('politics.townhall', '🏟️ Town halls: make the race about an issue', `<div class="toggle-row">${ISSUE_IDS.map((id) => button(`${ISSUES[id].icon} ${ISSUES[id].name}`, 'politics.townHall', { arg: id, variant: 'tiny' })).join('')}</div><p class="fine">Pick one where you're closer to the voters than ${esc(opp?.name ?? 'your opponent')} is.</p>`)}`, { icon: '🗳️', accent: 'green' });
}
