/**
 * Main DOM driver. Re-renders synchronously on every engine 'change' event
 * (no diffing, no animation delays — state → HTML in one pass), manages the
 * active tab and shows toasts.
 */
import {
  fullName, currentYear, netWorth, commitmentLoad, getCommitments, prestige, hasDegree, randomName,
} from '../core/State.js';
import { Random } from '../core/Random.js';
import {
  esc, money, compactMoney, button, card, chip, meter, statPanel, kv, empty, rankBadge, ladder,
  ribbonRack, medalCase, logView, promptModal, newLifeForm, tombstone,
} from './Components.js';
import { PROFESSION_LIST, getProfession, describeRequirement, TIER_COUNT } from '../modules/career/JobTrees.js';
import { applicationEligibility, promotionStatus } from '../modules/career/CareerEngine.js';
import { WORKPLACE_ACTIONS } from '../modules/career/WorkplaceActions.js';
import { APPLICATIONS_PER_YEAR } from '../modules/career/InterviewSystem.js';
import {
  BRANCHES, SPECIALTIES, rankOf, specialtyName, enlistmentEligibility, promotionOutlook, annualActivePay,
  DISCHARGE_LABEL, RETIREMENT_YEARS,
} from '../modules/military/MilitaryEngine.js';
import { pensionMultiplier, militaryHonors } from '../modules/military/MedalEngine.js';
import { SERVICES, SERVICE_LIST, joinEligibility, certEligibility, nextRankStatus, rankOfMember } from '../modules/emergency/EmergencyEngine.js';
import { PROGRAMS, MAJORS, programEligibility } from '../modules/education/EducationEngine.js';
import { ACTIVITIES } from '../modules/life/Activities.js';

export const TABS = [
  { id: 'life', label: 'Life', icon: '📜' },
  { id: 'career', label: 'Career', icon: '💼' },
  { id: 'military', label: 'Military', icon: '🎖️' },
  { id: 'emergency', label: 'Reserves', icon: '🚨' },
  { id: 'school', label: 'School', icon: '🎓' },
  { id: 'activities', label: 'Activities', icon: '🏃' },
  { id: 'honors', label: 'Honors', icon: '🏅' },
];

const TAB_KEY = 'lifesim.ui.tab';

function readTab() {
  try {
    const saved = localStorage.getItem(TAB_KEY);
    return TABS.some((t) => t.id === saved) ? saved : 'life';
  } catch {
    return 'life';
  }
}

export class Renderer {
  constructor({ root, toastRoot, engine }) {
    this.root = root;
    this.toastRoot = toastRoot;
    this.engine = engine;
    this.tab = readTab();
    this.nameRng = new Random();
  }

  setTab(tab) {
    if (!TABS.some((t) => t.id === tab)) return;
    this.tab = tab;
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
    this.render(this.engine.state);
  }

  toast(text, kind = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.toastRoot.prepend(el);
    while (this.toastRoot.children.length > 5) this.toastRoot.lastChild.remove();
    setTimeout(() => el.remove(), 3200);
  }

  render(state) {
    if (!state) {
      this.root.innerHTML = newLifeForm(randomName(this.nameRng, this.nameRng.pick(['male', 'female'])));
      this.root.querySelector('input[name=firstName]')?.focus();
      return;
    }
    if (!state.character.alive) {
      this.root.innerHTML = `${this.topbar(state)}${tombstone(this.obituary(state))}<div class="layout single">${card('Life Story', logView(state.log), { icon: '📜' })}</div>`;
      return;
    }
    const prompt = state.prompts[0];
    this.root.innerHTML = `
      ${this.topbar(state)}
      <main class="layout">
        <aside class="sidebar">${this.sidebar(state)}</aside>
        <section class="main">
          <nav class="tabs" role="tablist">${TABS.map((t) => `<button role="tab" class="tab ${t.id === this.tab ? 'active' : ''}" data-action="ui.tab" data-arg="${t.id}" aria-selected="${t.id === this.tab}"><span>${t.icon}</span><span class="tab-label">${t.label}</span></button>`).join('')}</nav>
          <div class="tab-panel">${this[`tab_${this.tab}`](state)}</div>
        </section>
      </main>
      <footer class="agebar">
        <button class="btn age-up" data-action="engine.ageUp"${this.engine.canAgeUp() ? '' : ' disabled'}>
          <span class="age-plus">AGE +1</span><span class="age-sub">${prompt ? 'Decide first' : `Turn ${state.character.age + 1} · Space`}</span>
        </button>
      </footer>
      ${prompt ? promptModal(prompt, state.prompts.length) : ''}`;
  }

  /* -------------------------------------------------------------- */
  /* Chrome                                                          */
  /* -------------------------------------------------------------- */

  topbar(state) {
    return `<header class="topbar">
      <div class="logo">LIFE<span>//</span>SIM</div>
      <div class="topbar-mid">${chip(`📅 ${currentYear(state)}`)} ${chip(`💵 ${compactMoney(state.finances.cash)}`, state.finances.cash < 0 ? 'bad' : 'good')} ${chip(`⭐ ${prestige(state)} prestige`, 'honor')}</div>
      <button class="btn ghost small" data-action="engine.abandon">↺ New Life</button>
    </header>`;
  }

  statusLine(state) {
    const parts = [];
    if (state.education.enrolled) parts.push(`🎓 ${PROGRAMS[state.education.enrolled.program].short} student`);
    if (state.career.job) parts.push(`${getProfession(state.career.job.professionId).icon} ${state.career.job.title}`);
    const svc = state.military.service;
    if (svc) parts.push(`${BRANCHES[svc.branch].icon} ${rankOf(svc).code} ${rankOf(svc).title}${svc.component === 'reserve' ? ' (Res.)' : ''}`);
    for (const s of SERVICE_LIST) {
      const m = state.emergency[s.id];
      if (m) parts.push(`${s.icon} ${rankOfMember(s.id, m).title}`);
    }
    if (!parts.length) parts.push(state.character.age < 18 ? '🧒 Kid' : state.career.retired ? '🏖️ Retired' : '🛋️ Unemployed');
    return parts.map((p) => `<li>${esc(p)}</li>`).join('');
  }

  sidebar(state) {
    const c = state.character;
    const avatar = c.age < 3 ? '👶' : c.age < 13 ? (c.gender === 'female' ? '👧' : '👦') : c.age < 60 ? (c.gender === 'female' ? '👩' : '👨') : c.gender === 'female' ? '👵' : '👴';
    const f = state.finances;
    const load = commitmentLoad(state);
    const commitments = getCommitments(state);
    return `
      ${card('', `<div class="profile">
          <div class="avatar">${avatar}</div>
          <div><h2>${esc(fullName(state))}</h2><p class="age">Age <b>${c.age}</b></p></div>
        </div>
        <ul class="status-line">${this.statusLine(state)}</ul>`, { className: 'profile-card' })}
      ${card('Stats', statPanel(state.stats), { icon: '📊' })}
      ${card('Money', kv([
        ['Cash', `<b class="${f.cash < 0 ? 'neg' : 'pos'}">${money(f.cash)}</b>`],
        ['401(k)', money(f.retirement)],
        f.loans ? ['Student loans', `<span class="neg">${money(f.loans)}</span>`] : null,
        ['Net worth', `<b>${money(netWorth(state))}</b>`],
        f.lastYear ? ['Last year', `${money(f.lastYear.gross)} gross · ${money(f.lastYear.tax)} tax`] : null,
      ]), { icon: '💰' })}
      ${card('Time Commitments', `${meter(Math.min(load, 10), { max: 10, tone: load > 7 ? 'bad' : load > 4.5 ? 'mid' : 'good', label: 'Load', suffix: '/10' })}
        ${commitments.length ? `<ul class="commit-list">${commitments.map((x) => `<li>${esc(x.label)}<span>${x.load}</span></li>`).join('')}</ul>` : '<p class="muted">Free as a bird.</p>'}`, { icon: '⏱️' })}`;
  }

  /* -------------------------------------------------------------- */
  /* Tabs                                                            */
  /* -------------------------------------------------------------- */

  tab_life(state) {
    return card('Life Story', logView(state.log), { icon: '📜' });
  }

  tab_career(state) {
    const job = state.career.job;
    let current;
    if (job) {
      const profession = getProfession(job.professionId);
      const status = promotionStatus(state);
      const yearlyApps = state.yearly['career.apply'] ?? 0;
      current = card(`${esc(job.title)}`, `
        <div class="job-head">
          ${rankBadge(`TIER ${job.tier + 1}`, job.title, job.tier / (TIER_COUNT - 1), { icon: profession.icon })}
          <div class="job-meta">
            <p class="muted">${esc(job.company)} · ${profession.name}</p>
            ${kv([
              ['Salary', `<b>${money(job.salary)}</b>/yr`],
              ['In role', `${job.yearsInTier} yr${job.yearsInTier === 1 ? '' : 's'}`],
              ['At company', `${job.yearsAtCompany} yr${job.yearsAtCompany === 1 ? '' : 's'}`],
              ['Warnings', job.warnings ? `<span class="neg">${job.warnings}</span>` : '0'],
            ])}
          </div>
        </div>
        ${meter(job.performance, { label: '📈 Performance' })}
        ${meter(job.boss, { label: '🤝 Boss relationship' })}
        <p class="promo ${status.eligible ? 'ready' : ''}">${status.eligible ? `🌟 Eligible for ${esc(status.next.title)} — review triggers at 75%+ performance` : `🪜 Next promotion: ${esc(status.reason)}`}</p>
        ${ladder(profession.tiers.map((t) => ({ title: t.title, sub: compactMoney(t.salary) })), job.tier)}
        <div class="action-grid">${WORKPLACE_ACTIONS.map((a) => button(`${a.icon} ${a.label}`, `career.${a.id}`, { hint: a.desc })).join('')}</div>
        <div class="row-end">${state.character.age >= 55 ? button('🏖️ Retire', 'career.retire', { variant: 'ghost small' }) : ''}${button('🚪 Quit', 'career.quit', { variant: 'danger small' })}</div>
        <p class="fine">Applications this year: ${yearlyApps}/${APPLICATIONS_PER_YEAR}</p>`, { icon: profession.icon, accent: 'cyan' });
    } else {
      current = card('Employment', empty(state.character.age < 16 ? 'Too young to work. Enjoy being a kid!' : state.career.retired ? 'You are retired. You can still un-retire by applying below.' : 'You are unemployed. Apply for a job below.'), { icon: '💼' });
    }

    const board = PROFESSION_LIST.map((p) => {
      const check = applicationEligibility(state, p.id);
      return `<li class="job-row ${check.ok ? '' : 'locked'}">
        <span class="job-icon">${p.icon}</span>
        <div class="job-info"><b>${p.name}</b><small>${esc(p.tiers[0].title)} → ${esc(p.tiers[6].title)} · ${compactMoney(p.tiers[0].salary)}–${compactMoney(p.tiers[6].salary)}</small><small class="req">Req: ${esc(describeRequirement(p.entry))}${p.minAge > 16 ? ` · ${p.minAge}+` : ''}</small></div>
        ${button(check.ok ? 'Apply' : '🔒', 'career.apply', { arg: p.id, disabled: !check.ok, variant: 'small', title: check.reason ?? '' })}
        ${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}
      </li>`;
    }).join('');

    const history = state.career.history.length
      ? `<ul class="history">${[...state.career.history].reverse().map((h) => `<li><b>${esc(h.title)}</b> · ${esc(h.company)} <small>(age ${h.startAge}–${h.endAge}) — ${esc(h.reason)}</small></li>`).join('')}</ul>`
      : empty('No previous jobs.');

    return `${current}${card('Job Board', `<ul class="job-board">${board}</ul>`, { icon: '📰' })}${card('Career History', history, { icon: '🗂️' })}`;
  }

  tab_military(state) {
    const svc = state.military.service;
    const benefits = state.military.benefits.length
      ? card('Benefits', kv(state.military.benefits.map((b) => [esc(b.label), `${money(b.annual)}/yr${state.character.age < b.startAge ? ` from age ${b.startAge}` : ''}`])), { icon: '🏦' })
      : '';
    const history = state.military.history.length
      ? card('Service Record', `<ul class="history">${[...state.military.history].reverse().map((h) => `<li><b>${BRANCHES[h.branch].icon} ${esc(h.rankTitle)} (${h.rankCode})</b> · ${BRANCHES[h.branch].name} ${h.component === 'reserve' ? 'Reserve' : ''} <small>age ${h.startAge}–${h.endAge}, ${h.yearsOfService} yrs, ${h.deployments} deployments — ${DISCHARGE_LABEL[h.discharge]}</small></li>`).join('')}</ul>`, { icon: '🗂️' })
      : '';

    if (!svc) return `${this.recruitingOffice(state)}${benefits}${history}`;

    const branch = BRANCHES[svc.branch];
    const rank = rankOf(svc);
    const outlook = promotionOutlook(svc);
    const titles = branch[svc.track];
    const hasBachelor = hasDegree(state, 'bachelor');
    return `${card(`${branch.name}`, `
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
      <div class="rack-inline">${ribbonRack(militaryHonors(state))}</div>`, { icon: branch.icon, accent: 'green' })}
      ${benefits}${history}`;
  }

  recruitingOffice(state) {
    const rows = Object.values(BRANCHES).map((b) => {
      const enlisted = enlistmentEligibility(state, b.id, 'enlisted');
      const officer = enlistmentEligibility(state, b.id, 'officer');
      const btn = (track, component, check, label) => button(label, 'military.enlist', { arg: `${b.id}:${track}:${component}`, disabled: !check.ok, variant: 'small', title: check.reason ?? '' });
      return `<li class="branch-row">
        <div class="branch-name"><span class="branch-icon">${b.icon}</span><div><b>${b.name}</b><small>${esc(b.motto)}</small></div></div>
        <div class="branch-btns">
          ${btn('enlisted', 'active', enlisted, 'Enlist · Active')}
          ${btn('enlisted', 'reserve', enlisted, 'Enlist · Reserve')}
          ${btn('officer', 'active', officer, 'Officer · Active')}
          ${btn('officer', 'reserve', officer, 'Officer · Reserve')}
        </div>
        <small class="why">${[!enlisted.ok && `Enlisted: ${enlisted.reason}`, !officer.ok && `Officer: ${officer.reason}`].filter(Boolean).map(esc).join(' · ')}</small>
      </li>`;
    }).join('');
    return card('Recruiting Office', `
      <p class="muted">Enlisted ranks run E-1 → E-9. The officer track (O-1 → O-10) requires a bachelor's degree.
      <b>Active duty</b> is your full-time job (you'll resign any civilian job). <b>Reserve</b> service is one weekend a month plus two weeks a year, alongside your career — until you're mobilized.</p>
      <ul class="branch-list">${rows}</ul>`, { icon: '🇺🇸', accent: 'green' });
  }

  tab_emergency(state) {
    const cards = SERVICE_LIST.map((svc) => {
      const member = state.emergency[svc.id];
      if (!member) {
        const check = joinEligibility(state, svc.id);
        return card(svc.name, `
          <p class="muted">${svc.ranks[0].title} → ${svc.ranks[6].title}. Runs alongside your job, school or reserve duty.</p>
          ${kv([
            ['Min age', `${svc.minAge}+`],
            ['Requirements', Object.entries(svc.requirements).map(([k, v]) => `${v}+ ${k}`).join(', ')],
            ['Call volume', `${svc.callsPerYear[0]}–${svc.callsPerYear[1]}/yr${svc.stipendPerCall ? ` · $${svc.stipendPerCall}/call` : ' · unpaid'}`],
          ])}
          <div class="row-end">${button(`${svc.icon} Join`, 'emergency.join', { arg: svc.id, disabled: !check.ok, variant: 'primary' })}${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}</div>`, { icon: svc.icon });
      }
      const rank = rankOfMember(svc.id, member);
      const next = nextRankStatus(svc.id, member);
      const certs = svc.certifications.map((c) => {
        if (member.certs.includes(c.id)) return `<li class="cert done" title="${esc(c.desc)}">${c.icon} ${esc(c.name)} ✓</li>`;
        const check = certEligibility(state, svc.id, c.id);
        return `<li class="cert" title="${esc(c.desc)}">${c.icon} ${esc(c.name)}
          ${button(c.cost ? `Train · $${c.cost.toLocaleString()}` : 'Train · Free', 'emergency.certify', { arg: `${svc.id}:${c.id}`, disabled: !check.ok, variant: 'tiny', title: check.reason ?? c.desc })}
          ${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}</li>`;
      }).join('');
      const nextXp = next.next?.xp ?? member.xp;
      return card(svc.name, `
        <div class="job-head">
          ${rankBadge(`RANK ${member.rankIndex + 1}`, rank.title, member.rankIndex / (svc.ranks.length - 1), { icon: svc.icon })}
          <div class="job-meta">
            <p class="muted">${esc(member.unit)} ${member.onLeave ? chip('🪖 Military leave', 'warn') : ''}</p>
            ${kv([
              ['Years', member.years],
              ['Calls run', member.calls.toLocaleString()],
              ['Lives saved', member.saves],
              ['Injuries', member.injuries],
              member.complaints ? ['Complaints', `<span class="neg">${member.complaints}/3</span>`] : null,
            ])}
          </div>
        </div>
        ${next.next ? meter(member.xp, { max: nextXp, label: `XP → ${esc(next.next.title)}`, suffix: ` / ${nextXp}`, tone: next.ready ? 'good' : 'mid' }) : '<p class="promo ready">⭐ Highest rank achieved</p>'}
        ${next.next && !next.ready ? `<p class="promo">🪜 Needs: ${esc(next.reason)}</p>` : ''}
        ${ladder(svc.ranks.map((r) => ({ title: r.title, sub: `${r.xp} XP` })), member.rankIndex, { compact: true })}
        ${member.k9 ? `<div class="k9">🐕 <b>K9 ${esc(member.k9.name)}</b> · ${esc(member.k9.breed)}, age ${member.k9.age}</div>` : ''}
        <h4 class="sub">Certifications</h4>
        <ul class="certs">${certs}</ul>
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

  tab_school(state) {
    const e = state.education.enrolled;
    let current = '';
    if (e) {
      const p = PROGRAMS[e.program];
      current = card(`${p.name}${e.major ? ` — ${MAJORS[e.major].name}` : ''}`, `
        ${meter(e.yearsCompleted, { max: p.years, label: 'Progress', suffix: ` / ${p.years} yrs`, tone: 'good' })}
        ${kv([['GPA', e.yearsCompleted ? e.gpa.toFixed(2) : '—'], ['Tuition', `${money(p.tuition)}/yr (loans)`], ['Studying hard', e.studiedThisYear ? 'Yes' : 'Not yet']])}
        <div class="action-grid">${button('📖 Study Hard', 'education.study', { hint: '+GPA, +Stress' })}${button('🚪 Drop Out', 'education.dropOut', { variant: 'danger' })}</div>`, { icon: '🏛️', accent: 'yellow' });
    }
    const programs = Object.entries(PROGRAMS).map(([id, p]) => {
      const check = programEligibility(state, id);
      const actions = id === 'bachelor'
        ? `<div class="major-btns">${Object.entries(MAJORS).map(([mid, m]) => button(`${m.icon} ${m.name}`, 'education.enroll', { arg: `bachelor:${mid}`, disabled: !check.ok, variant: 'tiny' })).join('')}</div>`
        : button('Enroll', 'education.enroll', { arg: id, disabled: !check.ok, variant: 'small' });
      return `<li class="program ${check.ok ? '' : 'locked'}"><div><b>${p.name}</b><small>${p.years} yrs · ${money(p.tuition)}/yr${check.ok ? '' : ` · <span class="why">${esc(check.reason)}</span>`}</small></div>${actions}</li>`;
    }).join('');
    const degrees = state.education.degrees.length
      ? `<ul class="history">${state.education.degrees.map((d) => `<li>🎓 <b>${d.type === 'highschool' ? 'High School Diploma' : PROGRAMS[d.type].name}</b>${d.major ? ` — ${MAJORS[d.major].name}` : ''}${d.gpa ? ` <small>GPA ${d.gpa.toFixed(2)}</small>` : ''}</li>`).join('')}</ul>`
      : empty('No diplomas yet.');
    return `${current}
      ${card('Degree Programs', `<p class="muted">Preview of the education system — campus life, housing and internships arrive in Step 2.</p><ul class="programs">${programs}</ul>`, { icon: '🏫' })}
      ${card('Diplomas', degrees, { icon: '📜' })}`;
  }

  tab_activities(state) {
    const items = ACTIVITIES.map((a) => {
      const done = Boolean(state.yearly[`activity.${a.id}`]);
      const tooYoung = state.character.age < a.minAge;
      return button(`${a.icon} ${a.label}`, 'activities.do', { arg: a.id, disabled: done || tooYoung, hint: done ? 'Done this year' : tooYoung ? `Age ${a.minAge}+` : a.desc });
    }).join('');
    return card('Activities', `<p class="muted">Each activity can be done once per year.</p><div class="action-grid">${items}</div>`, { icon: '🏃' });
  }

  tab_honors(state) {
    const mil = militaryHonors(state);
    return `${card('Ribbon Rack', `${ribbonRack(state.honors)}
        ${kv([
          ['Total prestige', `⭐ ${prestige(state)}`],
          ['Military decorations', mil.length],
          ['Civil awards', state.honors.length - mil.length],
          ['Pension multiplier', `×${pensionMultiplier(state).toFixed(2)}`],
        ])}`, { icon: '🎖️', accent: 'yellow' })}
      ${card('Medal Case', medalCase(state.honors), { icon: '🏅' })}`;
  }

  /* -------------------------------------------------------------- */
  /* Death                                                           */
  /* -------------------------------------------------------------- */

  obituary(state) {
    const c = state.character;
    const jobs = [...state.career.history, state.career.job].filter(Boolean);
    const peakJob = jobs.sort((a, b) => b.peakTier - a.peakTier)[0];
    const svc = state.military.service;
    const tours = [...state.military.history, svc && { ...svc, rankCode: rankOf(svc).code, rankTitle: rankOf(svc).title }].filter(Boolean);
    const topMil = tours.sort((a, b) => (b.track === 'officer') - (a.track === 'officer') || b.rankCode.localeCompare(a.rankCode, undefined, { numeric: true }))[0];
    const activeResponders = SERVICE_LIST.filter((s) => state.emergency[s.id]).map((s) => ({ rankTitle: rankOfMember(s.id, state.emergency[s.id]).title, saves: state.emergency[s.id].saves }));
    const responders = [...state.emergency.history, ...activeResponders];
    const responder = responders.sort((a, b) => b.saves - a.saves)[0];
    const moh = state.honors.some((h) => h.id === 'moh');

    let epitaph = 'They lived a quiet life.';
    if (moh) epitaph = 'Above and beyond the call of duty.';
    else if (topMil?.discharge === 'kia') epitaph = 'Greater love hath no one than this.';
    else if (responders.some((h) => h.saves >= 10)) epitaph = 'They ran toward danger so others could live.';
    else if (topMil) epitaph = 'Served with honor.';
    else if (peakJob?.peakTier >= 6) epitaph = 'Made it to the top.';
    else if (netWorth(state) > 1e6) epitaph = 'Died rich.';

    return {
      name: fullName(state),
      born: c.birthYear,
      died: currentYear(state),
      age: c.age,
      cause: c.causeOfDeath,
      epitaph,
      honors: state.honors,
      facts: [
        ['Net worth', money(netWorth(state))],
        ['Lifetime earnings', money(state.finances.lifetimeEarnings)],
        peakJob ? ['Career peak', `${esc(getProfession(peakJob.professionId).tiers[peakJob.peakTier].title)}`] : null,
        topMil ? ['Military', `${esc(topMil.rankTitle)}, ${BRANCHES[topMil.branch].name}`] : null,
        responder ? ['First responder', `${esc(responder.rankTitle)}`] : null,
        ['Honors', `${state.honors.length} (⭐ ${prestige(state)})`],
      ],
    };
  }
}
