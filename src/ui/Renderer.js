/**
 * Main DOM driver. Re-renders synchronously on every engine 'change' event
 * (no diffing, no animation delays — state → HTML in one pass), manages the
 * active tab and shows toasts. Each tab's body lives in ui/views/.
 */
import { fullName, currentYear, netWorth, commitmentLoad, getCommitments, prestige, randomName, hasFelony } from '../core/State.js';
import { Random } from '../core/Random.js';
import {
  esc, money, compactMoney, button, card, chip, meter, statPanel, statStrip, kv, ribbonRack, medalCase, logView, logControls, promptModal, newLifeForm, tombstone, disclosure,
} from './Components.js';
import { savesPanel, settingsPanel, helpPanel, menuPanel } from './views/SystemViews.js';
import { getProfession } from '../modules/career/JobTrees.js';
import { BRANCHES, rankOf } from '../modules/military/MilitaryEngine.js';
import { pensionMultiplier, militaryHonors } from '../modules/military/MedalEngine.js';
import { SERVICE_LIST, rankOfMember } from '../modules/emergency/EmergencyEngine.js';
import { PROGRAMS } from '../modules/education/Catalog.js';
import { ACTIVITIES, activityCost } from '../modules/life/Activities.js';
import { regionOf } from '../modules/life/Regions.js';
import { RISKY_ACTIONS, CRIME_GROUPS, TASK_FORCE_HEAT } from '../modules/legal/index.js';
import { careerView } from './views/CareerView.js';
import { govView } from './views/GovView.js';
import { licensesView } from './views/LicensesView.js';
import { schoolView } from './views/SchoolView.js';
import { businessView } from './views/BusinessView.js';
import { moneyView } from './views/MoneyView.js';
import { legalView } from './views/LegalView.js';
import { militaryView, emergencyView } from './views/ServiceViews.js';
import { civicServiceView } from './views/CivicServiceView.js';
import { homeView } from './views/HomeView.js';
import { moveView } from './views/MoveView.js';
import { politicsView } from './views/PoliticsView.js';
import { healthView } from './views/HealthView.js';
import { peopleView, heirChoices } from './views/PeopleView.js';
import { communityView } from './views/CommunityView.js';
import { garageView } from './views/GarageView.js';
import { farmView } from './views/FarmView.js';
import { housingStatus, STATUS_LABEL } from '../modules/realestate/index.js';
import { homeEquity } from '../core/State.js';
import { PHASES } from '../modules/economy/EconomyEngine.js';

/** Seven sections across the top; related screens sit in a compact sub-tab row. */
export const SECTIONS = [
  { id: 'life', label: 'Life', icon: '📜', tabs: [{ id: 'life', label: 'Story', icon: '📜' }, { id: 'people', label: 'People', icon: '👪' }, { id: 'community', label: 'Community', icon: '🙏' }, { id: 'activities', label: 'Activities', icon: '🏃' }, { id: 'honors', label: 'Honors', icon: '🏅' }] },
  { id: 'work', label: 'Work', icon: '💼', tabs: [{ id: 'career', label: 'Career', icon: '💼' }, { id: 'business', label: 'Business', icon: '🏪' }, { id: 'gov', label: 'Public Service', icon: '🏛️' }, { id: 'politics', label: 'Politics', icon: '🗳️' }] },
  { id: 'service', label: 'Service', icon: '🎖️', tabs: [{ id: 'military', label: 'Military', icon: '🎖️' }, { id: 'emergency', label: 'Emergency Services', icon: '🚨' }, { id: 'civic', label: 'Civic Service', icon: '🤝' }] },
  { id: 'learn', label: 'School', icon: '🎓', tabs: [{ id: 'school', label: 'School', icon: '🎓' }, { id: 'licenses', label: 'Licenses', icon: '🪪' }] },
  { id: 'home', label: 'Home', icon: '🏠', tabs: [{ id: 'home', label: 'Home', icon: '🏠' }, { id: 'garage', label: 'Garage', icon: '🚗' }, { id: 'farm', label: 'Farm', icon: '🚜' }, { id: 'move', label: 'Move', icon: '🗺️' }] },
  { id: 'money', label: 'Money', icon: '💰', tabs: [{ id: 'money', label: 'Money', icon: '💰' }, { id: 'health', label: 'Health', icon: '🩺' }] },
  { id: 'legal', label: 'Legal', icon: '⚖️', tabs: [{ id: 'legal', label: 'Legal', icon: '⚖️' }] },
];
/** Every screen, in section order (keyboard [ ] walks this list). */
export const TABS = SECTIONS.flatMap((s) => s.tabs.map((t) => ({ ...t, section: s.id })));
export const sectionOf = (tabId) => SECTIONS.find((s) => s.tabs.some((t) => t.id === tabId)) ?? SECTIONS[0];

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
  life: (state, ui = {}) => {
    const limit = ui.logLimit ?? 40;
    const more = state.log.length > limit ? `<div class="row-end">${button(`Show ${Math.min(40, state.log.length - limit)} older years`, 'ui.logMore', { variant: 'small ghost' })}</div>` : '';
    return card('Life Story', `${logControls(ui.logFilter)}<div id="life-log">${logView(state.log, { limit })}</div>${more}`, { icon: '📜' });
  },
  career: careerView,
  business: businessView,
  community: communityView,
  garage: garageView,
  farm: farmView,
  gov: govView,
  military: militaryView,
  emergency: emergencyView,
  civic: civicServiceView,
  school: schoolView,
  licenses: licensesView,
  money: moneyView,
  health: healthView,
  people: peopleView,
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
    const partnered = (state.people?.list ?? []).some((p) => p.alive && ['spouse', 'partner', 'fiance'].includes(p.relation));
    const crimeButton = (r) => {
      const why = r.needs?.(state);
      return button(`${r.icon} ${r.label}`, `legal.${r.id}`, { variant: 'danger', disabled: state.character.age < r.minAge || Boolean(state.yearly[`risky.${r.id}`]) || (r.needsPartner && !partnered) || Boolean(why), hint: why ?? (state.character.age < r.minAge ? `Age ${r.minAge}+` : r.desc) });
    };
    const groups = Object.entries(CRIME_GROUPS).map(([gid, g]) => {
      const list = RISKY_ACTIONS.filter((r) => (r.group ?? 'personal') === gid);
      if (!list.length) return '';
      const body = `<div class="action-grid">${list.map(crimeButton).join('')}</div>`;
      return gid === 'personal' ? `<h4 class="sub">${g.icon} ${g.label}</h4>${body}` : disclosure(`crime.${gid}`, `${g.icon} ${g.label}`, body, { count: list.length });
    }).join('');
    const crime = state.legal.crime;
    const heat = crime?.heat ?? 0;
    const heatPanel = crime ? `${meter(heat, { max: 100, label: '🚨 Heat', suffix: '/100', tone: heat >= TASK_FORCE_HEAT ? 'bad' : heat >= 35 ? 'mid' : 'good' })}
      <p class="fine">Heat makes arrests likelier and old cases resurface; above ${TASK_FORCE_HEAT} a task force builds cases against you. It fades each year — faster if you lay low.${crime.earned ? ` Criminal earnings: $${Math.round(crime.earned).toLocaleString()}.` : ''}</p>
      <div class="action-grid">${button('🙈 Lay low this year', 'legal.layLow', { variant: 'small', disabled: crime.layingLow || !heat, hint: 'Heat falls ~70% instead of ~40%' })}</div>` : '';
    return `${card('Activities', `<p class="muted">Each activity can be done once per year.</p><div class="action-grid">${items}</div>`, { icon: '🏃' })}
      ${card('Risky Business', `<p class="muted">Every one of these can follow you: records, suspended licenses, denied clearances. Experience pays — each kind of job gets more lucrative and less sloppy the more you do it.</p>${heatPanel}${groups}`, { icon: '😈', accent: 'red' })}`;
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
    /** Transient UI state: open panel, log paging and filter, settings. */
    this.panel = null;
    this.ui = { logLimit: 40, logFilter: { query: '', kind: 'all' } };
    this.settings = {};
  }

  openPanel(panel) {
    this.panel = this.panel === panel ? null : panel;
    this.render(this.engine.state);
  }

  setTab(tab) {
    if (!VIEWS[tab]) return;
    this.tab = tab;
    (this.lastTab ??= {})[sectionOf(tab).id] = tab;
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

  /**
   * The whole app re-renders from state on every change (synchronous, no
   * diffing). Only the active tab's view is built. Keyboard focus survives
   * re-renders: the focused control is found again by its action/arg.
   */
  render(state) {
    if (!this.root) return;
    const focusKey = focusKeyOf(document.activeElement);
    // Collapsible sections remember whether you opened or closed them.
    this.disclosures ??= {};
    for (const d of this.root.querySelectorAll('details[data-key]')) this.disclosures[d.dataset.key] = d.open;
    this.root.innerHTML = this.html(state);
    for (const d of this.root.querySelectorAll('details[data-key]')) if (d.dataset.key in this.disclosures) d.open = this.disclosures[d.dataset.key];
    this.restoreFocus(focusKey, state);
    this.applyLogFilter();
    this.applyJobFilter();
  }

  html(state) {
    const panel = this.panel ? this.panelHtml(state) : '';
    if (!state) {
      return `${newLifeForm(randomName(this.nameRng, this.nameRng.pick(['male', 'female'])))}<div class="layout single splash-saves">${savesPanel(this.engine.store, null, { inline: true })}</div>${panel}`;
    }
    if (!state.character.alive) {
      return `${this.topbar(state)}<main id="main">${tombstone(this.obituary(state), heirChoices(state))}<div class="layout single">${VIEWS.life(state, this.ui)}</div></main>${panel}`;
    }
    const prompt = state.prompts[0];
    return `
      <a class="skip-link" href="#tabpanel">Skip to content</a>
      ${this.topbar(state)}
      <main class="layout" id="main">
        <aside class="sidebar" aria-label="Character">${this.ageButton(state, prompt)}${this.sidebar(state)}</aside>
        <section class="main">
          ${this.tabNav()}
          <div class="tab-panel" id="tabpanel" role="tabpanel" aria-labelledby="${sectionOf(this.tab).tabs.length > 1 ? `tab-${this.tab}` : `section-${sectionOf(this.tab).id}`}" tabindex="-1">${VIEWS[this.tab](state, this.ui)}</div>
        </section>
      </main>
      ${prompt ? promptModal(prompt, state.prompts.length) : panel}`;
  }

  /** Section bar plus (when the section has several screens) a compact sub-tab row. */
  tabNav() {
    const section = sectionOf(this.tab);
    const top = SECTIONS.map((s) => {
      const on = s.id === section.id;
      const target = this.lastTab?.[s.id] ?? s.tabs[0].id;
      return `<button role="tab" id="section-${s.id}" data-section="${s.id}" class="tab ${on ? 'active' : ''}" data-action="ui.tab" data-arg="${target}" aria-selected="${on}" aria-controls="tabpanel" tabindex="${on ? 0 : -1}" title="${s.label}"><span aria-hidden="true">${s.icon}</span><span class="tab-label">${s.label}</span></button>`;
    }).join('');
    const subs = section.tabs.length > 1
      ? `<nav class="subtabs" role="tablist" aria-label="${section.label}">${section.tabs.map((t) => `<button role="tab" id="tab-${t.id}" class="subtab ${t.id === this.tab ? 'active' : ''}" data-action="ui.tab" data-arg="${t.id}" aria-selected="${t.id === this.tab}" aria-controls="tabpanel" tabindex="${t.id === this.tab ? 0 : -1}"><span aria-hidden="true">${t.icon}</span> ${t.label}</button>`).join('')}</nav>`
      : '';
    return `<nav class="tabs" role="tablist" aria-label="Sections">${top}</nav>${subs}`;
  }

  panelHtml(state) {
    switch (this.panel) {
      case 'menu': return menuPanel(state, { canUndo: this.engine.canUndo(), debugUndo: this.settings.debugUndo });
      case 'saves': return savesPanel(this.engine.store, state);
      case 'settings': return settingsPanel(this.settings, { canUndo: this.engine.canUndo() });
      case 'help': return helpPanel();
      default: return '';
    }
  }

  restoreFocus(key, state) {
    const doc = this.root.ownerDocument;
    // An open dialog takes focus.
    const dialog = this.root.querySelector('.overlay[role="dialog"]');
    if (dialog && !dialog.contains(doc.activeElement)) {
      const target = (key && dialog.querySelector(key)) || dialog.querySelector('button:not([disabled]), input, select');
      target?.focus();
      return;
    }
    if (!key) {
      if (!state) this.root.querySelector('input[name=firstName]')?.focus();
      return;
    }
    const el = this.root.querySelector(key);
    if (el && !el.disabled) el.focus({ preventScroll: true });
    else if (state && key.includes('engine.resolve')) this.root.querySelector('#tabpanel')?.focus({ preventScroll: true });
  }

  /** Job board search: show matching jobs (opening their field groups), hide the rest. */
  applyJobFilter() {
    const box = this.root.querySelector('#job-search');
    if (!box) return;
    const q = (this.ui.jobQuery ?? '').trim().toLowerCase();
    if (box.value !== (this.ui.jobQuery ?? '')) box.value = this.ui.jobQuery ?? '';
    const panel = box.closest('.card-body') ?? this.root;
    let shown = 0;
    for (const li of panel.querySelectorAll('li.job-row')) {
      const match = !q || li.textContent.toLowerCase().includes(q);
      li.hidden = q ? !match : li.hasAttribute('data-extra');
      if (match && !li.hidden) shown += 1;
    }
    for (const group of panel.querySelectorAll('.job-groups details')) {
      const any = [...group.querySelectorAll('li.job-row')].some((li) => !li.hidden);
      group.hidden = Boolean(q) && !any;
      if (q && any) group.open = true;
    }
    const more = panel.querySelector('#job-more');
    if (more) more.hidden = Boolean(q);
    const count = panel.querySelector('#job-count');
    if (count) count.textContent = q ? `${shown} job${shown === 1 ? '' : 's'} match "${q}"` : '';
  }

  /** Hide log entries that don't match the search box / kind filter. */
  applyLogFilter() {
    const log = this.root.querySelector('#life-log');
    if (!log) return;
    const { query, kind } = this.ui.logFilter;
    const q = query.trim().toLowerCase();
    let shown = 0;
    for (const year of log.querySelectorAll('.log-year')) {
      let any = false;
      for (const li of year.querySelectorAll('li')) {
        const match = (kind === 'all' || li.dataset.kind === kind) && (!q || li.textContent.toLowerCase().includes(q));
        li.hidden = !match;
        if (match) {
          any = true;
          shown += 1;
        }
      }
      year.hidden = !any;
    }
    const count = this.root.querySelector('#log-count');
    if (count) count.textContent = q || kind !== 'all' ? `${shown} match${shown === 1 ? '' : 'es'}` : '';
  }

  /* -------------------------------------------------------------- */
  /* Chrome                                                          */
  /* -------------------------------------------------------------- */

  /** Top of the sticky sidebar on desktop; a small corner button on phones. */
  ageButton(state, prompt) {
    return `<button class="btn age-up" data-action="engine.ageUp" aria-keyshortcuts="Space" aria-label="Age up to ${state.character.age + 1}"${this.engine.canAgeUp() ? '' : ' disabled'}>
      <span class="age-plus">AGE +1</span><span class="age-sub">${prompt ? 'Decide first' : `Turn ${state.character.age + 1} · Space`}</span>
    </button>`;
  }

  topbar(state) {
    const region = regionOf(state);
    return `<header class="topbar">
      <div class="logo">LIFE<span>//</span>SIM</div>
      <div class="topbar-mid">${chip(`📅 ${currentYear(state)}`)} ${chip(`${PHASES[state.economy.phase].icon} ${PHASES[state.economy.phase].label} · ${(state.economy.unemployment * 100).toFixed(1)}% unemp · S&P ${Math.round(state.economy.marketIndex)}`, state.economy.phase === 'recession' ? 'bad' : state.economy.phase === 'peak' ? 'warn' : 'cyan')} ${chip(`${region.icon} ${esc(region.name)}`)} ${chip(`💵 ${compactMoney(state.finances.cash)}`, state.finances.cash < 0 ? 'bad' : 'good')} ${chip(`⭐ ${prestige(state)}`, 'honor')}</div>
      <div class="mobile-status" aria-hidden="true">${esc(state.character.firstName)} · ${state.character.age} · <span class="${state.finances.cash < 0 ? 'neg' : 'pos'}">${compactMoney(state.finances.cash)}</span></div>
      <nav class="topbar-actions" aria-label="Game">
        ${this.settings.debugUndo ? `<button class="btn ghost small" data-action="engine.undo"${this.engine.canUndo() ? '' : ' disabled'} title="Debug: rewind the last age-up">↶ Undo</button>` : ''}
        <button class="btn ghost small" data-action="ui.panel" data-arg="menu" aria-haspopup="dialog"><span aria-hidden="true">☰</span> Menu</button>
      </nav>
      ${state.character?.alive === false ? '' : statStrip(state.stats)}
    </header>`;
  }

  statusLine(state) {
    const parts = [];
    if (state.legal.incarceration) parts.push(`🔒 Inmate, ${state.legal.incarceration.facility}`);
    if (state.education.enrolled) parts.push(`🎓 ${PROGRAMS[state.education.enrolled.programId].name} student`);
    const job = state.career.job;
    if (job) parts.push(`${getProfession(job.professionId).icon} ${job.title} [G${job.grade}]`);
    const biz = state.business?.current;
    if (biz) parts.push(`🏪 ${biz.role === 'operator' ? 'Running' : 'Owner of'} ${biz.name}`);
    const svc = state.military.service;
    if (svc) parts.push(`${BRANCHES[svc.branch].icon} ${rankOf(svc).code} ${rankOf(svc).title}${svc.component === 'reserve' ? ' (Res.)' : ''}`);
    for (const s of SERVICE_LIST) {
      const m = state.emergency[s.id];
      if (m) parts.push(`${s.icon} ${rankOfMember(s.id, m).title}`);
    }
    if (state.politics.office) parts.push(`🗳️ ${state.politics.office.id === 'governor' ? 'Governor' : state.politics.office.id}`.replace('cityCouncil', 'City Council').replace('stateRep', 'State Rep').replace('stateSenator', 'State Senator').replace('usRep', 'U.S. Rep').replace('usSenator', 'U.S. Senator').replace('mayor', 'Mayor').replace('judge', 'Judge'));
    if (state.career.emeritus && !job) parts.push(`🎓 ${state.career.emeritus.title}`);
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
    const felon = hasFelony(state);

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

/** A CSS selector that finds the "same" control after a re-render. */
function focusKeyOf(el) {
  if (!el || el === el.ownerDocument?.body) return null;
  if (el.id) return `#${CSS.escape(el.id)}`;
  const action = el.dataset?.action;
  if (!action) return null;
  let key = `[data-action="${CSS.escape(action)}"]`;
  if (el.dataset.arg != null) key += `[data-arg="${CSS.escape(el.dataset.arg)}"]`;
  if (el.dataset.option != null) key += `[data-option="${CSS.escape(el.dataset.option)}"]`;
  return key;
}
