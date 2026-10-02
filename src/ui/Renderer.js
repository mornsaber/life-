/**
 * Main DOM driver. Re-renders synchronously on every engine 'change' event
 * (no diffing, no animation delays — state → HTML in one pass), manages the
 * active tab and shows toasts. Each tab's body lives in ui/views/.
 */
import { fullName, currentYear, netWorth, commitmentLoad, getCommitments, prestige, randomName } from '../core/State.js';
import { Random } from '../core/Random.js';
import {
  esc, money, compactMoney, button, card, chip, meter, statPanel, kv, ribbonRack, medalCase, logView, promptModal, newLifeForm, tombstone,
} from './Components.js';
import { getProfession } from '../modules/career/JobTrees.js';
import { BRANCHES, rankOf } from '../modules/military/MilitaryEngine.js';
import { pensionMultiplier, militaryHonors } from '../modules/military/MedalEngine.js';
import { SERVICE_LIST, rankOfMember } from '../modules/emergency/EmergencyEngine.js';
import { PROGRAMS } from '../modules/education/Catalog.js';
import { ACTIVITIES, activityCost } from '../modules/life/Activities.js';
import { regionOf } from '../modules/life/Regions.js';
import { RISKY_ACTIONS } from '../modules/legal/index.js';
import { careerView } from './views/CareerView.js';
import { govView } from './views/GovView.js';
import { licensesView } from './views/LicensesView.js';
import { schoolView } from './views/SchoolView.js';
import { moneyView } from './views/MoneyView.js';
import { legalView } from './views/LegalView.js';
import { militaryView, emergencyView } from './views/ServiceViews.js';
import { homeView } from './views/HomeView.js';
import { moveView } from './views/MoveView.js';
import { politicsView } from './views/PoliticsView.js';
import { housingStatus, STATUS_LABEL } from '../modules/realestate/index.js';
import { homeEquity } from '../core/State.js';

export const TABS = [
  { id: 'life', label: 'Life', icon: '📜' },
  { id: 'career', label: 'Career', icon: '💼' },
  { id: 'gov', label: 'Gov', icon: '🏛️' },
  { id: 'politics', label: 'Politics', icon: '🗳️' },
  { id: 'military', label: 'Military', icon: '🎖️' },
  { id: 'emergency', label: 'Reserves', icon: '🚨' },
  { id: 'school', label: 'School', icon: '🎓' },
  { id: 'licenses', label: 'Licenses', icon: '🪪' },
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'move', label: 'Move', icon: '🗺️' },
  { id: 'money', label: 'Money', icon: '💰' },
  { id: 'legal', label: 'Legal', icon: '⚖️' },
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

export const VIEWS = {
  life: (state) => card('Life Story', logView(state.log), { icon: '📜' }),
  career: careerView,
  gov: govView,
  military: militaryView,
  emergency: emergencyView,
  school: schoolView,
  licenses: licensesView,
  money: moneyView,
  legal: legalView,
  home: homeView,
  move: moveView,
  politics: politicsView,
  activities(state) {
    const items = ACTIVITIES.map((a) => {
      const done = Boolean(state.yearly[`activity.${a.id}`]);
      const tooYoung = state.character.age < a.minAge;
      const cost = activityCost(state, a);
      return button(`${a.icon} ${a.label}`, 'activities.do', { arg: a.id, disabled: done || tooYoung, hint: done ? 'Done this year' : tooYoung ? `Age ${a.minAge}+` : `${a.desc}${cost ? ` ($${cost.toLocaleString()})` : ''}` });
    }).join('');
    const risky = RISKY_ACTIONS.map((r) => button(`${r.icon} ${r.label}`, `legal.${r.id}`, { variant: 'danger', disabled: state.character.age < r.minAge || Boolean(state.yearly[`risky.${r.id}`]), hint: r.desc })).join('');
    return `${card('Activities', `<p class="muted">Each activity can be done once per year.</p><div class="action-grid">${items}</div>`, { icon: '🏃' })}
      ${card('Risky Business', `<p class="muted">Every one of these can follow you: records, suspended licenses, denied clearances.</p><div class="action-grid">${risky}</div>`, { icon: '😈', accent: 'red' })}`;
  },
  honors(state) {
    const mil = militaryHonors(state);
    return `${card('Ribbon Rack', `${ribbonRack(state.honors)}${kv([['Total prestige', `⭐ ${prestige(state)}`], ['Military decorations', mil.length], ['Civil awards', state.honors.length - mil.length], ['Pension multiplier', `×${pensionMultiplier(state).toFixed(2)}`]])}`, { icon: '🎖️', accent: 'yellow' })}${card('Medal Case', medalCase(state.honors), { icon: '🏅' })}`;
  },
};

export class Renderer {
  constructor({ root, toastRoot, engine }) {
    this.root = root;
    this.toastRoot = toastRoot;
    this.engine = engine;
    this.tab = readTab();
    this.nameRng = new Random();
  }

  setTab(tab) {
    if (!VIEWS[tab]) return;
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
          <nav class="tabs" role="tablist">${TABS.map((t) => `<button role="tab" class="tab ${t.id === this.tab ? 'active' : ''}" data-action="ui.tab" data-arg="${t.id}" aria-selected="${t.id === this.tab}" title="${t.label}"><span>${t.icon}</span><span class="tab-label">${t.label}</span></button>`).join('')}</nav>
          <div class="tab-panel">${VIEWS[this.tab](state)}</div>
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
    const region = regionOf(state);
    return `<header class="topbar">
      <div class="logo">LIFE<span>//</span>SIM</div>
      <div class="topbar-mid">${chip(`📅 ${currentYear(state)}`)} ${chip(`${region.icon} ${esc(region.name)}`)} ${chip(`💵 ${compactMoney(state.finances.cash)}`, state.finances.cash < 0 ? 'bad' : 'good')} ${chip(`⭐ ${prestige(state)}`, 'honor')}</div>
      <button class="btn ghost small" data-action="engine.abandon">↺ New Life</button>
    </header>`;
  }

  statusLine(state) {
    const parts = [];
    if (state.legal.incarceration) parts.push(`🔒 Inmate, ${state.legal.incarceration.facility}`);
    if (state.education.enrolled) parts.push(`🎓 ${PROGRAMS[state.education.enrolled.programId].name} student`);
    const job = state.career.job;
    if (job) parts.push(`${getProfession(job.professionId).icon} ${job.title} [G${job.grade}]`);
    const svc = state.military.service;
    if (svc) parts.push(`${BRANCHES[svc.branch].icon} ${rankOf(svc).code} ${rankOf(svc).title}${svc.component === 'reserve' ? ' (Res.)' : ''}`);
    for (const s of SERVICE_LIST) {
      const m = state.emergency[s.id];
      if (m) parts.push(`${s.icon} ${rankOfMember(s.id, m).title}`);
    }
    if (state.politics.office) parts.push(`🗳️ ${state.politics.office.id === 'governor' ? 'Governor' : state.politics.office.id}`.replace('cityCouncil', 'City Council').replace('stateRep', 'State Rep').replace('stateSenator', 'State Senator').replace('usRep', 'U.S. Rep').replace('usSenator', 'U.S. Senator').replace('mayor', 'Mayor').replace('judge', 'Judge'));
    if (!parts.length) parts.push(state.character.age < 18 ? '🧒 Kid' : state.retirement.retired ? '🏖️ Retired' : '🛋️ Unemployed');
    const hs = STATUS_LABEL[housingStatus(state)];
    parts.push(`${hs.icon} ${hs.label}`);
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
        ['Retirement', money(state.retirement.dc)],
        state.housing.properties.length ? ['Home equity', money(homeEquity(state))] : null,
        ['Credit', `${state.housing.credit.score}`],
        f.loans ? ['Student loans', `<span class="neg">${money(f.loans)}</span>`] : null,
        ['Net worth', `<b>${money(netWorth(state))}</b>`],
      ]), { icon: '💰' })}
      ${card('Time Commitments', `${meter(Math.min(load, 10), { max: 10, tone: load > 7 ? 'bad' : load > 4.5 ? 'mid' : 'good', label: 'Load', suffix: '/10' })}
        ${commitments.length ? `<ul class="commit-list">${commitments.map((x) => `<li>${esc(x.label)}<span>${x.load}</span></li>`).join('')}</ul>` : '<p class="muted">Free as a bird.</p>'}`, { icon: '⏱️' })}`;
  }

  /* -------------------------------------------------------------- */
  /* Death                                                           */
  /* -------------------------------------------------------------- */

  obituary(state) {
    const c = state.character;
    const jobs = [...state.career.history, state.career.job && { ...state.career.job, employerName: state.career.job.employer.name }].filter(Boolean);
    const peakJob = jobs.sort((a, b) => b.peakGrade - a.peakGrade)[0];
    const svc = state.military.service;
    const tours = [...state.military.history, svc && { ...svc, rankCode: rankOf(svc).code, rankTitle: rankOf(svc).title }].filter(Boolean);
    const topMil = tours.sort((a, b) => (b.track === 'officer') - (a.track === 'officer') || b.rankCode.localeCompare(a.rankCode, undefined, { numeric: true }))[0];
    const activeResponders = SERVICE_LIST.filter((s) => state.emergency[s.id]).map((s) => ({ rankTitle: rankOfMember(s.id, state.emergency[s.id]).title, saves: state.emergency[s.id].saves }));
    const responders = [...state.emergency.history, ...activeResponders];
    const responder = responders.sort((a, b) => b.saves - a.saves)[0];
    const moh = state.honors.some((h) => h.id === 'moh');
    const felon = state.legal.record.some((r) => r.severity === 'felony');

    let epitaph = 'They lived a quiet life.';
    if (moh) epitaph = 'Above and beyond the call of duty.';
    else if (topMil?.discharge === 'kia') epitaph = 'Greater love hath no one than this.';
    else if (responders.some((h) => h.saves >= 10)) epitaph = 'They ran toward danger so others could live.';
    else if (felon) epitaph = 'Complicated. Remembered anyway.';
    else if (topMil) epitaph = 'Served with honor.';
    else if (peakJob?.peakGrade >= 9) epitaph = 'Made it to the top.';
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
        peakJob ? ['Career peak', `${esc(peakJob.title)} [G${peakJob.peakGrade}]`] : null,
        topMil ? ['Military', `${esc(topMil.rankTitle)}, ${BRANCHES[topMil.branch].name}`] : null,
        responder ? ['First responder', esc(responder.rankTitle)] : null,
        ['Credentials', Object.values(state.credentials.held).filter((h) => h.status === 'active').length],
        ['Honors', `${state.honors.length} (⭐ ${prestige(state)})`],
        felon ? ['Record', 'Felony conviction'] : null,
      ],
    };
  }
}
