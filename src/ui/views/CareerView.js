/**
 * Career tab: current job (grade/step pay breakdown, abilities, benefits,
 * union, branching ladder), management console (department, delegation,
 * workforce model), job board grouped by sector, and history.
 */
import { clearedPremium } from '../../modules/career/ClearedWork.js';
import { teenJobsCard } from './K12View.js';
import { traineeProgram, isTenured, USERRA_YEARS } from '../../modules/career/Tenure.js';
import { esc, money, compactMoney, button, card, chip, meter, kv, empty, rankBadge, trackLadder, disclosure } from '../Components.js';
import { currentLevel, seniorityTier, AGE_LIMIT_121, railBoard, RAIL_BOARDS } from '../../modules/career/Transport.js';
import { SPECIALTIES as MED_SPECIALTIES, FELLOWSHIPS, malpracticePremium, employerCoversPremium, paidClaims, isDoctor, TRAINING_LEVELS } from '../../modules/career/Medicine.js';
import { laneOf, contractStep, isClassroom, SUMMER_JOBS, NBCT_STIPEND } from '../../modules/career/Teaching.js';
import { hasCredential as holds } from '../../modules/credentials/LicensingEngine.js';
import { PROFESSION_LIST, getProfession, SECTOR_LABEL, JOB_FIELDS } from '../../modules/career/JobTrees.js';
import { applicationEligibility, promotionStatus, levelCheck } from '../../modules/career/CareerEngine.js';
import { ladderFor, ABILITIES, TRACK_LABEL, lateralLevel } from '../../modules/career/Ladder.js';
import { EMPLOYER_SIZES, ratingLabel } from '../../modules/career/PayGrades.js';
import { benefitsSummary } from '../../modules/career/Employers.js';
import { chainOfCommand } from '../../modules/org/Organizations.js';
import { BUSINESS_TYPES, businessesFor } from '../../modules/business/BusinessTypes.js';
import { ownershipRules } from '../../modules/business/OwnershipRules.js';
import { ownerPosition } from '../../modules/org/Businesses.js';
import { executiveEligibility, executiveOdds, executiveRecord, EXEC_APPLICATIONS } from '../../modules/org/Executives.js';
import { canTerminate, SUPERVISION_PER_YEAR } from '../../modules/org/Supervision.js';
import { internalMoves, formerEmployers, rehireCheck, workforceGap } from '../../modules/org/Reentry.js';
import { WORKPLACE_ACTIONS } from '../../modules/career/WorkplaceActions.js';
import { APPLICATIONS_PER_YEAR } from '../../modules/career/InterviewSystem.js';
import { DUTIES, canDelegate } from '../../modules/career/ManagementEngine.js';
import { WORKFORCE_MODES } from '../../modules/career/ContractingSystem.js';
import { PENSION_PLANS } from '../../modules/retirement/PensionPlans.js';
import { REGIONS } from '../../modules/life/Regions.js';
import { WORK_MODES, workModeOf, NONCOMPETE_BANS } from '../../modules/career/JobMarket.js';
import { GIGS, HOURS, gigEligibility } from '../../modules/career/GigWork.js';
import { BASES } from '../../modules/career/WorkplaceClaims.js';
import { emeritusEligibility, COURSE_STIPEND, MIN_YEARS, EMERITUS_BY_PROFESSION } from '../../modules/career/Emeritus.js';
import { researchCard } from './AcademiaView.js';
import { medPracticeCard } from './MedicalView.js';
import { emsCard } from './EmsView.js';
import { clinicalCard } from './ClinicalView.js';
import { publishingCard, adjunctCard } from './HigherEdView.js';
import { labCard } from './LabView.js';

/** Emeritus faculty: title, teaching, research — or, for current faculty, whether retiring would confer it. */
function emeritusCard(state) {
  const e = state.career.emeritus;
  if (e) {
    return card(e.title, `${kv([
      ['Institution', esc(e.employer)],
      ['Emeritus since', `age ${e.sinceAge}`],
      e.publications ? ['Publications since retiring', String(e.publications)] : null,
    ])}
    <div class="toggle-row">
      ${button('🧑‍🏫 Teach a seminar each year', 'emeritus.teach', { variant: e.teaching ? 'small on' : 'small', hint: `${money(COURSE_STIPEND)} stipend` })}
      ${button('🔬 Keep researching', 'emeritus.research', { variant: e.research ? 'small on' : 'small', hint: 'Office, lab access, the odd paper' })}
      ${button('🎤 Give a guest lecture', 'emeritus.lecture', { variant: 'small', disabled: Boolean(state.yearly['emeritus.lecture']) })}
    </div>`, { icon: '🎓', accent: 'yellow' });
  }
  const job = state.career.job;
  if (!EMERITUS_BY_PROFESSION[job?.professionId]) return '';
  const check = emeritusEligibility(state);
  return `<p class="fine">🎓 ${check.ok ? `Retire from here and you'll be named <b>${esc(check.title)}</b>.` : `Emeritus status on retirement needs: ${esc(check.reason)}.`} (${MIN_YEARS}+ years at a senior rank.)</p>`;
}

/** Shop your skills, set where you work, and see non-competes and open claims. */
function jobMarketCard(state) {
  const job = state.career.job;
  const nc = state.career.nonCompete;
  const claims = state.career.claims;
  if (!job && !nc && !claims?.active && !claims?.history.length) return '';
  const mode = workModeOf(job);
  const modes = job ? Object.entries(WORK_MODES).map(([id, m]) => button(`${m.icon} ${m.label}`, 'jobMarket.workMode', { arg: id, variant: mode === id ? 'small on' : 'small', disabled: mode === id || Boolean(state.yearly['jobMarket.mode']), hint: m.desc })).join('') : '';
  const c = claims?.active;
  const stage = c && { reported: 'Reported to HR', eeoc: 'EEOC investigation', rightToSue: 'Right-to-sue letter issued', lawsuit: 'Lawsuit pending' }[c.stage];
  return card('Job Market', `
    ${kv([
      job ? ['Where you work', `${WORK_MODES[mode].icon} ${WORK_MODES[mode].label}`] : null,
      job?.nonCompete ? ['Your contract', `${job.nonCompete.years}-year non-compete if you leave${NONCOMPETE_BANS.includes(job.employer.stateId) ? ' (unenforceable in this state)' : ''}`] : null,
      nc ? ['Non-compete', `Bars you from ${esc(getProfession(nc.professionId).name)} until age ${nc.untilAge} (${esc(nc.employer)})`] : null,
      c ? ['Open claim', `${esc(BASES[c.basis])} vs. ${esc(c.employer)} — ${stage}${c.retaliated ? ' · retaliation' : ''}`] : null,
      claims?.history.length ? ['Past claims', claims.history.map((h) => `${h.age}: ${h.result}${h.net ? ` (${money(h.net)})` : ''}`).join(' · ')] : null,
    ])}
    ${job ? `<div class="toggle-row">${button('🔎 Look for a new employer', 'jobMarket.search', { variant: 'small', disabled: Boolean(state.yearly['jobMarket.search']), hint: 'Same career, different company: up to 3 offers' })}</div>
    <h4 class="sub">Work arrangement</h4><div class="toggle-row">${modes}</div>` : ''}
    <p class="fine">Strong performers get calls from recruiters. A competing offer can win you a raise where you are — but your boss will remember. Remote work means no commute, but you're out of sight when promotions come up.</p>`, { icon: '📨' });
}

/** Rideshare, delivery and freelance work: 1099 income, no benefits, your hours. */
function gigCard(state) {
  if (state.character.age < 16 || !state.gig) return '';
  const a = state.gig.active;
  const ly = state.gig.lastYear;
  const rows = Object.entries(GIGS).map(([id, g]) => {
    const side = gigEligibility(state, id, 'side');
    const full = gigEligibility(state, id, 'full');
    return `<li class="fund-row"><span>${g.icon} <b>${esc(g.name)}</b> <small>≈$${g.rate}/hr gross · ${Math.round(g.expenses * 100)}% costs · ${esc(g.desc)}</small>${side.ok ? '' : ` <span class="why">${esc(side.reason)}</span>`}</span>
      ${button('Side hustle', 'gig.start', { arg: `${id}:side`, variant: a?.gigId === id && a.hours === 'side' ? 'tiny on' : 'tiny', disabled: !side.ok })}
      ${button('Full time', 'gig.start', { arg: `${id}:full`, variant: a?.gigId === id && a.hours === 'full' ? 'tiny on' : 'tiny', disabled: !full.ok, title: full.reason ?? '' })}</li>`;
  }).join('');
  return card('Gig Work', `
    ${a ? `${kv([
      ['Working', `${GIGS[a.gigId].icon} ${esc(GIGS[a.gigId].name)} · ${HOURS[a.hours].label.toLowerCase()} since ${a.since}`],
      ['Rating', `${a.rating.toFixed(2)} ★${a.rating < 4.7 ? ' <span class="neg">— near deactivation</span>' : ''}`],
      ly ? ['Last year', `${money(ly.gross)} gross − ${money(ly.expenses)} costs = ${money(ly.net)} (before self-employment tax)`] : null,
    ])}<div class="toggle-row">${button('Log off for good', 'gig.stop', { variant: 'small ghost' })}</div>` : ''}
    <ul class="history">${rows}</ul>
    <p class="fine">Gig pay is 1099 income: you owe 15.3% self-employment tax, there's no employer health plan or 401(k) match, and the app can deactivate you. Drivers put real miles on their cars.</p>`, { icon: '📱' });
}

function payBreakdown(job) {
  const p = job.pay;
  if (!p) return '';
  const pct = (x) => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;
  return `<p class="fine">G${job.grade} base ${money(p.base)} × market ${pct(p.payMultiplier)} × employer ${pct(p.sizeMult)} × step ${job.step} ${pct(p.steps)} × ${job.sector === 'federal' ? 'locality' : 'region'} ${pct(p.locality)}${p.merit ? ` × merit +${Math.round(p.merit * 100)}%` : ''}</p>`;
}

function unionPanel(job) {
  const u = job.employer.union;
  if (!u) return '';
  const supervisor = job.abilities.includes('supervise');
  return `<div class="union">
    <b>✊ ${esc(u.name)}</b> ${chip(u.strike ? 'Strikes allowed' : 'No-strike clause → arbitration', u.strike ? 'warn' : '')} ${chip(`Contract: ${u.contractYearsLeft} yr left`)}
    ${supervisor ? '<p class="fine">Supervisors are excluded from the bargaining unit.</p>' : job.unionMember
      ? `<p class="fine">Member · dues ${(u.duesRate * 100).toFixed(1)}% · grievance protection (3 warnings before termination) · contract votes.</p>${button('Leave union', 'career.leaveUnion', { variant: 'ghost small' })}`
      : `<p class="fine">You're covered by the contract but not a member.</p>${button('✊ Join the union', 'career.joinUnion', { variant: 'small' })}`}
  </div>`;
}

function managementConsole(job) {
  const d = job.department;
  if (!d) return '';
  const delegable = canDelegate(job);
  const r = d.lastResult;
  const mode = WORKFORCE_MODES[d.workforce];
  const canRestructure = job.abilities.includes('hire') || job.abilities.includes('delegate');
  return card(`Your Department · ${d.headcount} staff`, `
    ${meter(d.productivity, { label: '⚙️ Productivity' })}
    ${mode.fixedQuality === null ? meter(d.morale, { label: '🙂 Team morale' }) : '<p class="fine">Contractor quality is fixed by the vendor — no morale to manage.</p>'}
    ${meter(d.unionRisk, { label: d.unionized ? '✊ Union pressure' : '✊ Unionization risk', tone: d.unionRisk > 70 ? 'bad' : d.unionRisk > 40 ? 'mid' : 'good' })}
    ${r ? kv([['Budget', money(r.budget)], ['Spent', `<span class="${r.spent > r.budget ? 'neg' : 'pos'}">${money(r.spent)}</span>`], ['Overhead', `${r.overheadPct}%`]]) : '<p class="fine">Results arrive at year end.</p>'}
    <h4 class="sub">Delegation ${delegable ? '' : '— team too small, you do it all'}</h4>
    <div class="toggle-row">${Object.entries(DUTIES).map(([id, duty]) => button(`${duty.icon} ${duty.label}: ${d.delegation[id] && delegable ? 'Delegated' : 'You'}`, 'career.toggleDelegation', { arg: id, disabled: !delegable, variant: d.delegation[id] && delegable ? 'small on' : 'small', hint: d.delegation[id] && delegable ? `+${Math.round(duty.overhead * 100)}% overhead` : 'Load + stress' })).join('')}</div>
    <h4 class="sub">Workforce model</h4>
    <div class="toggle-row">${Object.entries(WORKFORCE_MODES).map(([id, m]) => button(`${m.icon} ${m.label}`, 'career.setWorkforce', { arg: id, disabled: !canRestructure || d.workforce === id, variant: d.workforce === id ? 'small on' : 'small', hint: `×${m.costMult.toFixed(2)} cost` })).join('')}</div>
    <p class="fine">${esc(mode.desc)}</p>
    <div class="row-end">${button('🎳 Team offsite', 'career.teamBuilding', { variant: 'small', hint: '+Morale' })}</div>`, { icon: '🏢', accent: 'yellow' });
}

function currentJob(state) {
  const job = state.career.job;
  const profession = getProfession(job.professionId);
  const status = promotionStatus(state);
  const size = job.employer.size;
  const lateral = lateralLevel(profession, size, job.levelId);
  const b = job.employer.benefits;
  const relocatable = job.remote || job.sector === 'federal' || ['large', 'enterprise'].includes(size);
  const nextHint = status.eligible
    ? `🌟 Eligible for ${status.options.map((o) => `${esc(o.title)} [G${o.grade}]`).join(' or ')} — reviews trigger at 75%+ performance`
    : `🪜 Next: ${esc(status.reason)}`;
  const needs = status.all?.map((l) => ({ l, c: levelCheck(state, l) })).filter((x) => x.c.clearanceNeeded);
  const trainee = traineeProgram(job);

  return card(esc(job.title), `
    <div class="job-head">
      ${rankBadge(`G${job.grade} · S${job.step}`, job.title, (job.grade - 1) / 9, { icon: profession.icon })}
      <div class="job-meta">
        <p>${chip(esc(job.employer.name))} ${chip(EMPLOYER_SIZES[size].label + ' employer')} ${chip(TRACK_LABEL[job.track], job.track === 'mgmt' ? 'cyan' : job.track === 'ic' ? 'green' : '')} ${chip(SECTOR_LABEL[job.sector])} ${job.posting ? chip(`🛂 ${esc(job.posting.city)} — immunity`, 'honor') : ''}${job.cleared ? chip(`🔐 Cleared program · +${Math.round(clearedPremium(job) * 100)}% pay`, 'honor') : job.clearance ? chip(`🔐 ${job.clearance}`) : ''}</p>
        ${kv([
          ['Salary', `<b>${money(job.salary)}</b>/yr`],
          ['Rating', ratingLabel(job.performance)],
          ['In level', `${job.yearsInLevel} yr`],
          ['Seniority', `${job.yearsAtEmployer} yr`],
          trainee ? ['Training', `<span class="warn-text">${esc(trainee.label)}</span>`] : job.probationLeft > 0 ? ['Status', `<span class="warn-text">Probation · ${job.probationLeft} yr left</span>`] : isTenured(job) ? ['Status', '🎓 Tenured'] : null,
          ['Warnings', job.warnings ? `<span class="neg">${job.warnings}</span>` : '0'],
          job.passovers ? ['Passed over', `<span class="neg">${job.passovers}/3</span>`] : null,
          ...transportRows(state, job, profession),
          ...medicineRows(state, job),
          ...teachingRows(state, job),
          ['Training budget', `${money(job.employer.budget.left)} of ${money(job.employer.budget.annual)}`],
        ])}
      </div>
    </div>
    ${payBreakdown(job)}
    ${meter(job.performance, { label: '📈 Performance' })}
    ${meter(job.boss, { label: '🤝 Boss relationship' })}
    ${meter(job.coworkers, { label: '👥 Coworker relationships' })}
    <p class="promo ${status.eligible ? 'ready' : ''}">${nextHint}</p>
    ${needs?.length ? `<p class="fine">🔐 Promotion to ${esc(needs[0].l.title)} triggers a ${esc(needs[0].c.clearanceNeeded)} clearance investigation.</p>` : ''}
    ${trackLadder(profession.levels, job.levelId, (l) => ladderFor(profession, size).includes(l))}
    ${job.abilities.length ? `<div class="abilities">${job.abilities.map((a) => chip(`${ABILITIES[a].icon} ${ABILITIES[a].label}`)).join(' ')}</div>` : ''}
    <div class="benefits">${benefitsSummary(b).map((x) => chip(esc(x))).join(' ')}${b.pension ? ` ${chip(`🏦 ${PENSION_PLANS[b.pension].short}`, 'green')}` : ''}</div>
    ${unionPanel(job)}
    ${summerPanel(state, job)}
    <div class="action-grid">${WORKPLACE_ACTIONS.map((a) => button(`${a.icon} ${a.label}`, `career.${a.id}`, { hint: a.id === 'askRaise' && job.sector !== 'private' ? 'Quality Step Increase' : a.desc })).join('')}
      ${button(`🔀 ${lateral ? `Move to ${esc(lateral.title)}` : 'Switch track'}`, 'career.switchTrack', { hint: lateral ? `${TRACK_LABEL[lateral.track]} track` : 'Available after the fork', disabled: !lateral })}
    </div>
    <div class="row-end">
      ${relocatable && !profession.dutyStation ? `<span class="transfer" data-collect-root>${Object.values(REGIONS).filter((r) => r.id !== state.character.regionId).length ? `<select data-part="region">${Object.values(REGIONS).filter((r) => r.id !== state.character.regionId).map((r) => `<option value="${r.id}">${r.icon} ${esc(r.name)}</option>`).join('')}</select>` : ''}${button('📍 Request transfer', 'career.transfer', { variant: 'small', collect: true })}</span>` : ''}
      ${button('🚪 Quit', 'career.quit', { variant: 'danger small' })}
    </div>
    <p class="fine">Applications this year: ${state.yearly['career.apply'] ?? 0}/${APPLICATIONS_PER_YEAR}</p>`, { icon: profession.icon, accent: 'cyan' });
}

const SELECTION_LABEL = { appointed: 'appointed', elected: 'elected', board: 'hired by the board', internal: 'promoted from within', hired: 'external hire' };

/** Who you work for and with: organization, department, chain of command, coworkers and reports. */
function organizationCard(state, job) {
  const c = chainOfCommand(state, job, { generate: false });
  if (!c) return '';
  const who = (p, extra = '') => (p ? `<b>${esc(p.name)}</b> <small class="muted">${esc(p.title)}${p.body ? '' : `${p.selection && p.selection !== 'internal' ? ` · ${SELECTION_LABEL[p.selection] ?? p.selection}` : ''}`}${extra}</small>` : '—');
  const people = (list) => list.map((p) => `<li>${esc(p.name)} <small class="muted">${esc(p.title)} · ${p.years} yr</small></li>`).join('');
  const lead = c.leads === 'org' ? `<p>${chip(`👑 You run ${esc(c.org.name)}`, 'honor')} ${job.headOf.appointedBy ? chip(`Serves at the pleasure of ${esc(job.headOf.appointedBy)}`, job.headOf.selection === 'appointed' ? 'warn' : '') : ''}</p>`
    : c.leads === 'dept' ? `<p>${chip(`🏢 You head ${esc(c.dept.name)}`, 'honor')} ${job.headOf.selection === 'appointed' && job.headOf.appointedBy ? chip(`Appointed by ${esc(job.headOf.appointedBy)}`, 'warn') : ''}</p>` : '';
  return card('🏢 Organization', `${lead}${kv([
    ['Employer', `<b>${esc(c.org.name)}</b>${c.org.name !== job.employer.name ? ` <small class="muted">${esc(job.employer.name)}</small>` : ''}`],
    ['Department', `${esc(c.dept.name)}${c.division ? ` · ${esc(c.division)}` : ''} <small class="muted">~${c.dept.headcount.toLocaleString()} staff${c.dept.lastYear ? ` · last year +${c.dept.lastYear.hired} hired, −${c.dept.lastYear.left} left` : ''}</small>`],
    [c.leads ? 'You answer to' : 'Supervisor', who(c.supervisor, c.supervisor && !c.supervisor.body ? ` · gets along with you: ${job.boss}%` : '')],
    c.manager ? ['Manager', who(c.manager)] : null,
    c.deptHead ? ['Department head', who(c.deptHead)] : null,
    c.orgHead ? ['Leadership', who(c.orgHead)] : null,
  ])}
  ${c.coworkers.length ? `<p class="fine">👥 Coworkers at your level</p><ul class="mini-list">${people(c.coworkers)}</ul>` : ''}
  ${c.reports.length ? reportsPanel(state, job, c.reports) : ''}
  ${openingsLine(job)}
  ${internalMovesRow(state)}`, { icon: '🏢' });
}

/** Your named reports, with what a supervisor can do about each. */
function reportsPanel(state, job, reports) {
  const used = state.yearly['orgs.supervise'] ?? 0;
  const left = SUPERVISION_PER_YEAR - used;
  const fire = canTerminate(job);
  const rows = reports.map((p) => `<li class="report-row"><div><b>${esc(p.name)}</b> <small class="muted">${esc(p.title)} · ${p.years} yr · rated ${ratingLabel(p.performance)} · likes you ${p.rel}%${p.discipline ? ` · ${p.discipline} write-up${p.discipline > 1 ? 's' : ''}` : ''}</small></div>
    <div class="toggle-row">${[
      ['🏅', 'Commend', 'orgs.commend'],
      ['📝', 'Write up', 'orgs.discipline'],
      ['⬆️', 'Recommend for promotion', 'orgs.recommend'],
      ['🔀', 'Approve transfer', 'orgs.transferOut'],
      ['🚪', fire ? 'Terminate' : 'Recommend termination', 'orgs.terminate'],
    ].map(([icon, label, action]) => button(`${icon} ${label}`, action, { arg: p.id, variant: action === 'orgs.terminate' ? 'tiny danger' : 'tiny', disabled: left <= 0 })).join('')}</div></li>`).join('');
  return `<p class="fine">🧑‍💼 Your direct reports${job.department ? ` (${job.department.headcount} staff in all)` : ''} — ${left > 0 ? `${left} management action${left > 1 ? 's' : ''} left this year` : 'no management time left this year'}${fire ? '' : ' · firing needs your manager\'s sign-off'}</p><ul class="history">${rows}</ul>`;
}

/** Executive openings at other organizations, and how you stack up. */
function executiveSearchCard(state) {
  const search = state.career.execSearch;
  if (!search?.listings?.length || state.character.age < 30) return '';
  const r = executiveRecord(state);
  const used = state.yearly['orgs.applyExec'] ?? 0;
  const rows = search.listings.map((l) => {
    const e = executiveEligibility(state, l);
    const odds = e.ok ? Math.round(executiveOdds(state, l) * 100) : 0;
    return `<li class="job-row ${e.ok ? '' : 'locked'}"><span class="job-icon" aria-hidden="true">👔</span>
      <div class="job-info"><b>${esc(l.title)}</b> <small class="muted">${esc(l.orgName)}${l.deptName ? ` · ${esc(l.deptName)}` : ''}</small><small>${l.selection === 'appointed' ? `Appointed by ${esc(l.appointedBy)}` : l.selection === 'board' ? 'Chosen by the board' : 'Executive search'} · ${l.deptId ? `6+ yrs in ${esc(l.occupations.map((o) => getProfession(o)?.name ?? o).join(' / '))}` : '15+ yrs, graduate degree (MBA) or senior-executive record'}</small>
        ${e.ok ? `<small class="req">≈${odds}% chance the search committee picks you</small>` : ''}</div>
      ${button(e.ok ? 'Apply' : '🔒', 'orgs.applyExec', { arg: l.id, variant: 'small', disabled: !e.ok || used >= EXEC_APPLICATIONS, title: e.reason ?? '' })}
      ${e.ok ? '' : `<span class="why">${esc(e.reason)}</span>`}</li>`;
  }).join('');
  return card('Executive Search', `<p class="muted">Leadership posts open at other organizations this year. Your record: ${r.years} yrs of work · peak grade G${r.peakGrade}${r.headed ? ' · has led a department or organization' : ''}${r.ownerYears ? ` · ran a business ${r.ownerYears} yrs` : ''}${r.mba ? ' · MBA' : r.graduate ? ' · graduate degree' : ''}. ${EXEC_APPLICATIONS - used} application${EXEC_APPLICATIONS - used === 1 ? '' : 's'} left this year.</p><ul class="job-board">${rows}</ul>`, { icon: '👔' });
}

/** Posts one rung up this year: open, or who holds them. */
function openingsLine(job) {
  const o = Object.entries(job.openings ?? {});
  if (!o.length) return '';
  const profession = getProfession(job.professionId);
  return `<p class="fine">🪑 Above you: ${o.map(([id, v]) => `${esc(profession.levels.find((l) => l.id === id)?.title ?? id)} — ${v === 'open' ? '<b class="pos">opening this year</b>' : v === 'filled' ? 'no opening this year' : `held by ${esc(v)}`}`).join(' · ')}</p>`;
}

/** Other occupations in the same organization (keep your seniority). */
function internalMovesRow(state) {
  const moves = internalMoves(state);
  if (!moves.length) return '';
  return `<p class="fine">🔀 Move to another occupation here (keeps your seniority):</p><div class="toggle-row">${moves.map((m) => button(`${m.profession.icon} ${esc(m.profession.name)}`, 'orgs.internalMove', { arg: m.profession.id, variant: 'tiny', disabled: !m.check.ok, title: m.check.ok ? (m.dept?.name ?? '') : m.check.reason })).join('')}</div>`;
}

/** Former employers you could go back to. */
function formerEmployersCard(state) {
  const list = formerEmployers(state);
  if (!list.length) return '';
  const gap = workforceGap(state);
  const rows = list.map((e) => {
    const check = rehireCheck(state, e);
    return `<li class="job-row ${check.ok ? '' : 'locked'}"><div class="job-info"><b>${esc(e.employerName)}</b> <small class="muted">${esc(e.orgName ?? '')}</small><small>${esc(e.title)} · left ${e.yearsAgo} yr ago · ${e.standing === 'good' ? '✅ eligible for rehire' : e.standing === 'ineligible' ? '⛔ not eligible for rehire' : '➖ neutral reference'}</small></div>
      ${button(check.ok ? '🔁 Ask to return' : '🔒', 'orgs.rehire', { arg: e.orgId, variant: 'small', disabled: !check.ok, title: check.reason ?? '' })}</li>`;
  }).join('');
  return card('Former Employers', `${gap > 1 ? `<p class="fine">⏳ ${gap} years out of the workforce — employers will ask about the gap.</p>` : ''}<ul class="job-board">${rows}</ul>`, { icon: '🔁' });
}

function jobRow(state, p, extra = false) {
  const check = applicationEligibility(state, p.id);
  const top = p.levels.reduce((a, l) => (l.grade > a.grade ? l : a));
  return `<li class="job-row ${check.ok ? '' : 'locked'}"${extra ? ' data-extra hidden' : ''}>
      <span class="job-icon" aria-hidden="true">${p.icon}</span>
      <div class="job-info"><span class="job-title"><b>${esc(p.name)}</b> <small class="muted">· ${SECTOR_LABEL[p.sector]}</small></span><small>${esc(p.levels[0].title)} [G${p.levels[0].grade}] → ${esc(top.title)} [G${top.grade}] · ${p.levels.length} levels${p.exam ? ' · civil-service exam' : ''}${p.dutyStation ? ' · rural duty station + housing' : ''}</small>
        ${check.ok ? `<small class="req">Entry: ${esc(check.level.title)} [G${check.level.grade}]</small>` : ''}</div>
      ${button(check.ok ? 'Apply' : '🔒', 'career.apply', { arg: p.id, disabled: !check.ok, variant: 'small', title: check.reason ?? '' })}
      ${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}
    </li>`;
}

/** Pay ceiling of a career: its top grade. */
const topGrade = (p) => p.levels.reduce((a, l) => Math.max(a, l.grade), 0);
const SORTS = { pay: ['💰 Top pay', (a, b) => topGrade(b) - topGrade(a)], entry: ['🚪 Entry level', (a, b) => a.levels[0].grade - b.levels[0].grade], name: ['🔤 A–Z', (a, b) => a.name.localeCompare(b.name)] };
const PAGE = 12;

/**
 * The job board: search as you type, sort, field filter chips, and — for
 * "Open to me" — collapsible groups by field so the list never runs on forever.
 */
function jobBoard(state, ui = {}) {
  const field = ui.jobField ?? 'open';
  const sort = SORTS[ui.jobSort] ? ui.jobSort : 'pay';
  const limit = Number(ui.jobLimit) || PAGE;
  const open = PROFESSION_LIST.filter((p) => applicationEligibility(state, p.id).ok);
  const chips = [['open', `✅ Open to me (${open.length})`], ['all', `📋 All (${PROFESSION_LIST.length})`], ...Object.entries(JOB_FIELDS).map(([id, f]) => [id, `${f.icon} ${f.label} (${f.ids.length})`])]
    .map(([id, label]) => button(label, 'ui.jobField', { arg: id, variant: id === field ? 'tiny on' : 'tiny' })).join('');
  const sorts = Object.entries(SORTS).map(([id, [label]]) => button(label, 'ui.set', { arg: `jobSort=${id}`, variant: id === sort ? 'tiny on' : 'tiny' })).join('');
  const tools = `<div class="job-tools"><input type="search" id="job-search" placeholder="Search jobs…" aria-label="Search jobs" autocomplete="off"><div class="toggle-row" role="group" aria-label="Sort jobs">${sorts}</div></div>`;
  const header = `<div class="toggle-row chips-row" role="group" aria-label="Filter jobs by field">${chips}</div>${tools}`;
  const sorted = (list) => [...list].sort(SORTS[sort][1]);
  if (field === 'open') {
    if (!open.length) return `${header}<ul class="job-board"><li class="empty">Nothing you can apply for right now — pick a field to see what each job requires.</li></ul>`;
    // Group open jobs by field; the first group starts expanded.
    const seen = new Set();
    const groups = Object.entries(JOB_FIELDS).map(([id, f]) => {
      const jobs = sorted(open.filter((p) => f.ids.includes(p.id) && !seen.has(p.id)));
      jobs.forEach((p) => seen.add(p.id));
      return { id, f, jobs };
    }).filter((g) => g.jobs.length);
    const rest = sorted(open.filter((p) => !seen.has(p.id)));
    if (rest.length) groups.push({ id: 'other', f: { icon: '🧩', label: 'Other' }, jobs: rest });
    const html = groups.map((g, i) => disclosure(`jobs.${g.id}`, `${g.f.icon} ${esc(g.f.label)}`, `<ul class="job-board">${g.jobs.map((p) => jobRow(state, p)).join('')}</ul>`, { count: g.jobs.length, open: i === 0 })).join('');
    return `${header}<div class="job-groups">${html}</div><p class="fine" id="job-count"></p>`;
  }
  const list = sorted(field === 'all' ? PROFESSION_LIST : JOB_FIELDS[field].ids.map(getProfession));
  // Every row is in the page (so search finds them all); rows past the limit start hidden.
  const rows = list.map((p, i) => jobRow(state, p, i >= limit)).join('');
  const more = list.length > limit ? `<div class="row-end" id="job-more">${button(`Show ${Math.min(PAGE, list.length - limit)} more (${list.length - limit} left)`, 'ui.set', { arg: `jobLimit=${limit + PAGE}`, variant: 'small ghost' })}</div>` : '';
  return `${header}<ul class="job-board">${rows}</ul>${more}<p class="fine" id="job-count"></p>`;
}

/** A civilian job held for you while on active duty (USERRA). */
function militaryLeaveCard(state) {
  const leave = state.career.leave;
  if (!leave) return '';
  const years = state.character.age - leave.startAge;
  const active = state.military.service?.component === 'active';
  return card('Military Leave (USERRA)', `<p>Your job as <b>${esc(leave.job.title)}</b> at <b>${esc(leave.job.employer.name)}</b> is protected while you serve: ${years} of ${USERRA_YEARS} years used. You'll come back with the seniority, steps and pension credit you would have earned.</p>
    <div class="toggle-row">${button('🏢 Return to work', 'career.returnFromLeave', { variant: 'small primary', disabled: active, hint: active ? 'After your active duty ends' : '' })}${button('🚪 Resign', 'career.resignFromLeave', { variant: 'small ghost' })}</div>`, { icon: '🛡️', accent: 'green' });
}

export function careerView(state, ui = {}) {
  const job = state.career.job;
  const current = job
    ? currentJob(state) + organizationCard(state, job) + managementConsole(job)
    : card('Employment', empty(state.character.age < 16 ? state.character.age >= 12 ? 'Full jobs start at 16 — try a part-time job below.' : 'Too young to work. Enjoy being a kid!' : state.legal.incarceration ? 'You are incarcerated.' : state.retirement.retired ? 'You are retired. Applying for a job will un-retire you.' : 'You are unemployed. Apply for a job below.'), { icon: '💼' });
  // Jobs and businesses you ran, one timeline.
  const stints = [
    ...state.career.history.map((h) => ({ kind: 'job', h, end: h.endAge })),
    ...(state.business?.history ?? []).map((b) => ({ kind: 'biz', b, end: b.endAge })),
  ].sort((a, b) => b.end - a.end);
  const bizLine = (b) => `<li>${BUSINESS_TYPES[b.typeId]?.icon ?? '🏪'} <b>${b.role === 'operator' ? 'Owner-operator' : 'Owner'}</b> · ${esc(b.name)} <small>(age ${b.ownedFromAge ?? b.startAge}–${b.endAge}) — ${esc(b.outcome)}</small></li>`;
  const history = stints.length
    ? `<ul class="history">${stints.map((x) => (x.kind === 'biz' ? bizLine(x.b) : jobLine(x.h))).join('')}</ul>`
    : empty('No previous jobs.');
  // No job: the job board comes first, before everything else on this screen.
  const board = card('Job Board', jobBoard(state, ui), { icon: '📰' });
  return `${current}${job ? '' : board}${ownerSeatCard(state)}${fieldBusinessesCard(state)}${medPracticeCard(state)}${emsCard(state)}${clinicalCard(state)}${researchCard(state)}${labCard(state)}${publishingCard(state)}${adjunctCard(state)}${emeritusCard(state)}${jobMarketCard(state)}${militaryLeaveCard(state)}${formerEmployersCard(state)}${executiveSearchCard(state)}${teenJobsCard(state)}${gigCard(state)}${job ? board : ''}${card('Career History', history, { icon: '🗂️' })}`;
}

/** One past job in the history list. */
function jobLine(h) {
  return `<li><b>${esc(h.title)}</b> · ${esc(h.employerName)}${h.orgName && h.orgName !== h.employerName ? ` <small class="muted">(${esc(h.orgName)})</small>` : ''}${h.standing ? ` ${chip(h.standing === 'good' ? '✅ Eligible for rehire' : h.standing === 'ineligible' ? '⛔ Not eligible for rehire' : '➖ Neutral reference', h.standing === 'good' ? 'green' : h.standing === 'ineligible' ? 'bad' : '')}` : ''} <small>(G${h.peakGrade} peak, age ${h.startAge}–${h.endAge}) — ${esc(h.reason)}</small></li>`;
}

export { compactMoney };

/** Seniority bids, the FAA medical, the age-65 rule and time away for air and sea crews. */
function transportRows(state, job, profession) {
  const level = currentLevel(job);
  const rows = [];
  if (profession.id === 'railroad' && level?.track !== 'mgmt') rows.push(['Seniority board', RAIL_BOARDS[railBoard(job)].label]);
  else if (profession.seniority) rows.push(['Seniority list', { junior: '🗓️ Junior — reserve & holidays', mid: '📅 Mid-list', senior: '⭐ Senior — holds the best trips' }[seniorityTier(job)]]);
  if (level?.flying) rows.push(['FAA medical', job.grounded ? '<span class="neg">Deferred — grounded</span>' : '✅ First-class, current']);
  if (level?.part121) rows.push(['Age-65 rule', `${Math.max(0, AGE_LIMIT_121 - state.character.age)} yr of airline flying left`]);
  if (profession.rotation) rows.push(['Time away', `${Math.round(profession.rotation.away * 100)}% of the year ${esc(profession.rotation.label)}`]);
  return rows;
}

/** Specialty, fellowship and malpractice for physicians. */
function medicineRows(state, job) {
  if (!isDoctor(job) || !state.medicine) return [];
  const m = state.medicine;
  const s = MED_SPECIALTIES[m.specialty];
  const rows = [['Specialty', s ? `${s.icon} ${esc(s.name)}${TRAINING_LEVELS.includes(job.levelId) ? ` · ${s.years}-yr residency` : ''}` : '<span class="warn-text">Unmatched</span>']];
  if (m.fellowship) rows.push(['Fellowship', `${esc(FELLOWSHIPS[m.fellowship].name)}${m.fellowshipYearsLeft ? ` · ${m.fellowshipYearsLeft} yr left (fellow's pay)` : ' · complete'}`]);
  if (!TRAINING_LEVELS.includes(job.levelId)) {
    rows.push(['Malpractice', `${employerCoversPremium(job) ? 'Covered by your hospital' : `${money(malpracticePremium(state))}/yr premium`} · ${paidClaims(state)} paid claim${paidClaims(state) === 1 ? '' : 's'} (10 yrs)`]);
  }
  return rows;
}

/** Salary-schedule lane and step for classroom teachers. */
function teachingRows(state, job) {
  if (!isClassroom(job)) return [];
  return [['Salary schedule', `${laneOf(state).label} · step ${contractStep(state)}${holds(state, 'nationalBoard') ? ` · +${NBCT_STIPEND * 100}% National Board stipend` : ''}`]];
}

function summerPanel(state, job) {
  if (!isClassroom(job) || !state.teaching) return '';
  return `<h4 class="sub">Summer plans</h4><div class="toggle-row chips-row">${Object.entries(SUMMER_JOBS).map(([id, j]) => button(j.label, 'teaching.summer', { arg: id, variant: state.teaching.summer === id ? 'tiny on' : 'tiny', hint: j.desc })).join('')}</div>`;
}

/** Owning a business is a position too: shown alongside (or instead of) a job. */
function ownerSeatCard(state) {
  const biz = state.business?.current;
  const holdings = state.business?.holdings ?? [];
  if (!biz && !holdings.length) return '';
  const rows = [biz, ...holdings].filter(Boolean).map((b) => {
    const pos = ownerPosition(state, b);
    return `<li>${BUSINESS_TYPES[b.typeId]?.icon ?? '🏪'} <b>${esc(pos.title)}</b> · ${esc(b.name)} <small>${esc(pos.stake)} · ${b.staff.headcount} staff${pos.ceo ? ` · run by ${esc(pos.ceo.name)}` : ''}${b === biz ? '' : ' · passive holding'}</small></li>`;
  }).join('');
  return card('Ownership', `<ul class="history">${rows}</ul><p class="fine">Manage it from the Business tab. Running your own business counts as work experience if you return to employment.</p>`, { icon: '👑' });
}

/** Businesses your current career could grow into, and whether your position allows it. */
function fieldBusinessesCard(state) {
  const job = state.career.job;
  if (!job || state.business?.current) return '';
  const ids = businessesFor(job.professionId);
  if (!ids.length) return '';
  const items = ids.map((id) => {
    const r = ownershipRules(state, id);
    return `${chip(`${BUSINESS_TYPES[id].icon} ${BUSINESS_TYPES[id].name}`, r.ok ? 'green' : 'bad')}${r.ok ? '' : ` <small class="why">${esc(r.reason)}</small>`}`;
  }).join(' ');
  const rule = ownershipRules(state);
  return card('Businesses in Your Field', `<p>${items}</p><p class="fine">Start one from the Business tab. ${rule.canOperate ? '' : esc(rule.notes.at(-1) ?? '')}</p>`, { icon: '🏪' });
}
