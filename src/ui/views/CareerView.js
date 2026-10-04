/**
 * Career tab: current job (grade/step pay breakdown, abilities, benefits,
 * union, branching ladder), management console (department, delegation,
 * workforce model), job board grouped by sector, and history.
 */
import { teenJobsCard } from './K12View.js';
import { traineeProgram, isTenured, USERRA_YEARS } from '../../modules/career/Tenure.js';
import { esc, money, compactMoney, button, card, chip, meter, kv, empty, rankBadge, trackLadder } from '../Components.js';
import { currentLevel, seniorityTier, AGE_LIMIT_121 } from '../../modules/career/Transport.js';
import { SPECIALTIES as MED_SPECIALTIES, FELLOWSHIPS, malpracticePremium, employerCoversPremium, paidClaims, isDoctor, TRAINING_LEVELS } from '../../modules/career/Medicine.js';
import { laneOf, contractStep, isClassroom, SUMMER_JOBS, NBCT_STIPEND } from '../../modules/career/Teaching.js';
import { hasCredential as holds } from '../../modules/credentials/LicensingEngine.js';
import { PROFESSION_LIST, getProfession, SECTOR_LABEL, JOB_FIELDS } from '../../modules/career/JobTrees.js';
import { applicationEligibility, promotionStatus, levelCheck } from '../../modules/career/CareerEngine.js';
import { ladderFor, ABILITIES, TRACK_LABEL, lateralLevel } from '../../modules/career/Ladder.js';
import { EMPLOYER_SIZES, ratingLabel } from '../../modules/career/PayGrades.js';
import { benefitsSummary } from '../../modules/career/Employers.js';
import { WORKPLACE_ACTIONS } from '../../modules/career/WorkplaceActions.js';
import { APPLICATIONS_PER_YEAR } from '../../modules/career/InterviewSystem.js';
import { DUTIES, canDelegate } from '../../modules/career/ManagementEngine.js';
import { WORKFORCE_MODES } from '../../modules/career/ContractingSystem.js';
import { PENSION_PLANS } from '../../modules/retirement/PensionPlans.js';
import { REGIONS } from '../../modules/life/Regions.js';
import { WORK_MODES, workModeOf, NONCOMPETE_BANS } from '../../modules/career/JobMarket.js';
import { GIGS, HOURS, gigEligibility } from '../../modules/career/GigWork.js';
import { BASES } from '../../modules/career/WorkplaceClaims.js';
import { emeritusEligibility, COURSE_STIPEND, MIN_YEARS } from '../../modules/career/Emeritus.js';

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
  if (job?.professionId !== 'university') return '';
  const check = emeritusEligibility(state);
  return `<p class="fine">🎓 ${check.ok ? `Retire from here and you'll be named <b>${esc(check.title)}</b>.` : `Emeritus status on retirement needs: ${esc(check.reason)}.`} (${MIN_YEARS}+ years, Associate Professor or higher.)</p>`;
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
        <p>${chip(esc(job.employer.name))} ${chip(EMPLOYER_SIZES[size].label + ' employer')} ${chip(TRACK_LABEL[job.track], job.track === 'mgmt' ? 'cyan' : job.track === 'ic' ? 'green' : '')} ${chip(SECTOR_LABEL[job.sector])} ${job.posting ? chip(`🛂 ${esc(job.posting.city)} — immunity`, 'honor') : ''}${job.clearance ? chip(`🔐 ${job.clearance}`) : ''}</p>
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

function jobRow(state, p) {
  const check = applicationEligibility(state, p.id);
  const top = p.levels.reduce((a, l) => (l.grade > a.grade ? l : a));
  return `<li class="job-row ${check.ok ? '' : 'locked'}">
      <span class="job-icon" aria-hidden="true">${p.icon}</span>
      <div class="job-info"><b>${esc(p.name)}</b> <small class="muted">${SECTOR_LABEL[p.sector]}</small><small>${esc(p.levels[0].title)} [G${p.levels[0].grade}] → ${esc(top.title)} [G${top.grade}] · ${p.levels.length} levels${p.exam ? ' · civil-service exam' : ''}${p.dutyStation ? ' · rural duty station + housing' : ''}</small>
        ${check.ok ? `<small class="req">Entry: ${esc(check.level.title)} [G${check.level.grade}]</small>` : ''}</div>
      ${button(check.ok ? 'Apply' : '🔒', 'career.apply', { arg: p.id, disabled: !check.ok, variant: 'small', title: check.reason ?? '' })}
      ${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}
    </li>`;
}

/** Field filter chips; "Open to me" (default) lists only jobs you can apply for right now. */
function jobBoard(state, ui = {}) {
  const field = ui.jobField ?? 'open';
  const open = PROFESSION_LIST.filter((p) => applicationEligibility(state, p.id).ok);
  const chips = [['open', `✅ Open to me (${open.length})`], ...Object.entries(JOB_FIELDS).map(([id, f]) => [id, `${f.icon} ${f.label}`])]
    .map(([id, label]) => button(label, 'ui.jobField', { arg: id, variant: id === field ? 'tiny on' : 'tiny' })).join('');
  const list = field === 'open' ? open : JOB_FIELDS[field].ids.map(getProfession);
  const rows = list.map((p) => jobRow(state, p)).join('');
  return `<div class="toggle-row chips-row" role="group" aria-label="Filter jobs by field">${chips}</div>
    <ul class="job-board">${rows || '<li class="empty">Nothing you can apply for right now — pick a field to see what each job requires.</li>'}</ul>`;
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
    ? currentJob(state) + managementConsole(job)
    : card('Employment', empty(state.character.age < 16 ? state.character.age >= 12 ? 'Full jobs start at 16 — try a part-time job below.' : 'Too young to work. Enjoy being a kid!' : state.legal.incarceration ? 'You are incarcerated.' : state.retirement.retired ? 'You are retired. Applying for a job will un-retire you.' : 'You are unemployed. Apply for a job below.'), { icon: '💼' });
  const history = state.career.history.length
    ? `<ul class="history">${[...state.career.history].reverse().map((h) => `<li><b>${esc(h.title)}</b> · ${esc(h.employerName)} <small>(G${h.peakGrade} peak, age ${h.startAge}–${h.endAge}) — ${esc(h.reason)}</small></li>`).join('')}</ul>`
    : empty('No previous jobs.');
  return `${current}${emeritusCard(state)}${jobMarketCard(state)}${militaryLeaveCard(state)}${teenJobsCard(state)}${gigCard(state)}${card('Job Board', jobBoard(state, ui), { icon: '📰' })}${card('Career History', history, { icon: '🗂️' })}`;
}

export { compactMoney };

/** Seniority bids, the FAA medical, the age-65 rule and time away for air and sea crews. */
function transportRows(state, job, profession) {
  const level = currentLevel(job);
  const rows = [];
  if (profession.seniority) rows.push(['Seniority list', { junior: '🗓️ Junior — reserve & holidays', mid: '📅 Mid-list', senior: '⭐ Senior — holds the best trips' }[seniorityTier(job)]]);
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
