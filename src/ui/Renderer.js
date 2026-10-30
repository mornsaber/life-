/**
 * Main DOM driver. Re-renders synchronously on every engine 'change' event
 * (no diffing, no animation delays — state → HTML in one pass), manages the
 * active tab and shows toasts. Each tab's body lives in ui/views/.
 */
import { courtTitle } from '../modules/legal/Judiciary.js';
import { ceremonialPosts } from '../modules/world/Ceremonial.js';
import { styledName, postNominals } from '../modules/world/Honours.js';
import { OFFICES } from '../modules/politics/Offices.js';
import { CROWNS } from '../modules/world/Crown.js';
import { currentYear, netWorth, commitmentLoad, getCommitments, prestige, randomName, hasFelony, fixMoneySigns, tidyText } from '../core/State.js';
import { Random } from '../core/Random.js';
import {
  esc, money, compactMoney, button, card, chip, meter, statPanel, statStrip, kv, ribbonRack, medalCase, ribbon, ribbonFor, insignia, logView, logControls, promptModal, newLifeForm, tombstone, disclosure,
} from './Components.js';
import { savesPanel, settingsPanel, helpPanel, menuPanel } from './views/SystemViews.js';
import { getProfession, PROFESSIONS } from '../modules/career/JobTrees.js';
import { rankOf } from '../modules/military/MilitaryEngine.js';
import { pensionMultiplier, militaryHonors } from '../modules/military/MedalEngine.js';
import { SERVICE_LIST, rankOfMember } from '../modules/emergency/EmergencyEngine.js';
import { PROGRAMS } from '../modules/education/Catalog.js';
import { ACTIVITIES, activityCost } from '../modules/life/Activities.js';
import { HOBBIES, MAX_HOBBIES, hobbiesOf, tierOf } from '../modules/life/Hobbies.js';
import { priceLevel } from '../modules/world/Countries.js';
import { regionOf } from '../modules/life/Regions.js';
import { careerView } from './views/CareerView.js';
import { govView } from './views/GovView.js';
import { licensesView } from './views/LicensesView.js';
import { schoolView } from './views/SchoolView.js';
import { businessView } from './views/BusinessView.js';
import { moneyView } from './views/MoneyView.js';
import { legalView } from './views/LegalView.js';
import { casesView, crimeView, underworldView } from './views/CrimeView.js';
import { militaryView, emergencyView } from './views/ServiceViews.js';
import { civicServiceView } from './views/CivicServiceView.js';
import { homeView } from './views/HomeView.js';
import { moveView } from './views/MoveView.js';
import { politicsView } from './views/PoliticsView.js';
import { healthView } from './views/HealthView.js';
import { peopleView, heirChoices } from './views/PeopleView.js';
import { achievementsView } from './views/AchievementsView.js';
import { ACHIEVEMENTS, CHALLENGES } from '../modules/life/Achievements.js';
import { difficultyOf, difficultyId } from '../core/Difficulty.js';
import { communityView } from './views/CommunityView.js';
import { garageView } from './views/GarageView.js';
import { farmView } from './views/FarmView.js';
import { housingStatus, STATUS_LABEL } from '../modules/realestate/index.js';
import { homeEquity } from '../core/State.js';
import { PHASES } from '../modules/economy/EconomyEngine.js';
import { causeOf } from '../modules/economy/Shocks.js';
import { obituaryHeadline, lifeStoryFacts } from '../modules/life/LifeStory.js';
import { COUNTRIES, countryOf, localizeHtml, localizeMoney, localizeTerms } from '../modules/world/Countries.js';
import { branchOf } from '../modules/military/MilitaryEngine.js';
import { postingLabel } from '../modules/world/Posting.js';
import { gradePrefix } from '../modules/career/PayGrades.js';
import { fameSummary } from '../modules/life/Fame.js';
import { officialResidence } from '../modules/world/Residences.js';
import { retirementLifeSummary } from '../modules/retirement/RetirementLife.js';

/** Seven sections across the top; related screens sit in a compact sub-tab row. */
export const SECTIONS = [
  { id: 'life', label: 'Life', icon: '📜', tabs: [{ id: 'life', label: 'Story', icon: '📜' }, { id: 'people', label: 'People', icon: '👪' }, { id: 'community', label: 'Community', icon: '🙏' }, { id: 'activities', label: 'Activities', icon: '🏃' }, { id: 'honors', label: 'Honors', icon: '🏅' }, { id: 'achievements', label: 'Achievements', icon: '🏆' }] },
  { id: 'work', label: 'Work', icon: '💼', tabs: [{ id: 'career', label: 'Career', icon: '💼' }, { id: 'business', label: 'Business', icon: '🏪' }, { id: 'gov', label: 'Public Service', icon: '🏛️' }, { id: 'politics', label: 'Politics', icon: '🗳️' }] },
  { id: 'service', label: 'Service', icon: '🎖️', tabs: [{ id: 'military', label: 'Military', icon: '🎖️' }, { id: 'emergency', label: 'Emergency Services', icon: '🚨' }, { id: 'civic', label: 'Civic Service', icon: '🤝' }] },
  { id: 'learn', label: 'School', icon: '🎓', tabs: [{ id: 'school', label: 'School', icon: '🎓' }, { id: 'licenses', label: 'Licenses', icon: '🪪' }] },
  { id: 'home', label: 'Home', icon: '🏠', tabs: [{ id: 'home', label: 'Home', icon: '🏠' }, { id: 'garage', label: 'Garage', icon: '🚗' }, { id: 'farm', label: 'Farm', icon: '🚜' }, { id: 'move', label: 'Move', icon: '🗺️' }] },
  { id: 'money', label: 'Money', icon: '💰', tabs: [{ id: 'money', label: 'Money', icon: '💰' }, { id: 'health', label: 'Health', icon: '🩺' }] },
  { id: 'legal', label: 'Legal', icon: '⚖️', tabs: [{ id: 'legal', label: 'Status', icon: '⚖️' }, { id: 'cases', label: 'Cases', icon: '🗂️' }, { id: 'crime', label: 'Crime', icon: '🕶️' }, { id: 'underworld', label: 'Underworld', icon: '🕴️' }] },
];
/** Every screen, in section order (keyboard [ ] walks this list). */
export const TABS = SECTIONS.flatMap((s) => s.tabs.map((t) => ({ ...t, section: s.id })));
export const sectionOf = (tabId) => SECTIONS.find((s) => s.tabs.some((t) => t.id === tabId)) ?? SECTIONS[0];

const TAB_KEY = 'lifesim.ui.tab';
const FOLD_KEY = 'lifesim.ui.folds';

function loadFolds() {
  try {
    return JSON.parse(localStorage.getItem(FOLD_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}
function saveFolds(folds) {
  try {
    localStorage.setItem(FOLD_KEY, JSON.stringify(folds));
  } catch {
    /* storage unavailable */
  }
}

function readTab() {
  try {
    const saved = localStorage.getItem(TAB_KEY);
    return TABS.some((t) => t.id === saved) ? saved : 'life';
  } catch {
    return 'life';
  }
}

/** Orders of chivalry and merit: one row per order, at the grade you hold, with its letters and insignia. */
function ordersCard(state, inOrder) {
  const held = state.honors.filter(inOrder).sort((a, b) => (a.precedence ?? 99) - (b.precedence ?? 99) || (b.prestige ?? 0) - (a.prestige ?? 0));
  const declined = state.honoursDeclined ?? [];
  if (!held.length && !declined.length) return '';
  const rows = held.map((h) => `<li class="order-row">
      <span class="order-icon" aria-hidden="true">${insignia(h)}${ribbon(ribbonFor(h), { device: h.order && (h.grade ?? 0) >= 2 ? '✦' : null })}</span>
      <span class="order-text"><small class="order-name">${esc((typeof h.order === 'string' ? h.order : null) ?? h.from?.replace(/^the /, '') ?? 'Order')}${h.country && COUNTRIES[h.country] ? ` · ${COUNTRIES[h.country].flag}` : ''}</small>
        <span><b>${esc(h.name.replace(/ \([A-Z]{2,5}\)$/, ''))}</b>${h.post ? ` ${chip(esc(h.post), 'honor')}` : ''}</span>
        <small class="muted">${h.insignia ? `${esc(h.insignia)} · ` : ''}age ${h.age}${h.source === 'foreign' ? ' · honorary or foreign' : ''}</small></span>
      ${h.source === 'order' && !/^stJohn\./.test(h.id) && !state.royal?.reigning ? button('Return', 'honours.renounce', { arg: h.id, variant: 'tiny ghost', title: 'Hand back the insignia' }) : ''}
    </li>`).join('');
  const no = declined.length ? `<p class="fine">${declined.map((d) => `${d.returned ? 'Returned' : 'Declined'} ${esc(d.name)} at ${d.age}${d.public ? ' (publicly)' : ''}`).join(' · ')}</p>` : '';
  return card('Orders', `${held.length ? `<ul class="order-list">${rows}</ul>` : ''}${no}<p class="fine">A higher grade of an order replaces the lower one. Knighthoods and peerages are offered in confidence first, and can be declined.</p>`, { icon: '🎗️' });
}

/** Fame: one score, where it comes from, and what to do about it. */
function fameCard(state) {
  const f = fameSummary(state);
  if (!f || (f.score < 5 && !f.peak)) return '';
  const [, label, icon] = f.tier;
  return card('Fame', `
    ${meter(f.score, { max: 100, label: `${icon} ${label}${f.infamous ? ' (infamous)' : ''}`, suffix: '/100', tone: f.infamous ? 'bad' : 'good' })}
    ${kv([
      ['Known for', f.sources.slice(0, 4).map((s) => `${esc(s.label)} <small class="muted">${s.value}</small>`).join(' · ') || '—'],
      f.peak > f.score ? ['Peak', `${f.peak}/100`] : null,
      f.deals.length ? ['Endorsements', f.deals.map((d) => `${esc(d.brand)} ($${d.amount.toLocaleString()}/yr to ${d.until})`).join(' · ')] : null,
      f.security ? ['Security', '🛡️ A close-protection team'] : null,
      f.scandals.length ? ['Scandals', f.scandals.slice(-3).map((s) => `${esc(s.headline)} (${s.age})`).join(' · ')] : null,
      state.fame?.cancelled ? ['Status', `<span class="neg">🚫 Cancelled since ${state.fame.cancelled.since}</span>`] : state.fame?.comebacks ? ['Comebacks', state.fame.comebacks] : null,
    ])}
    <div class="toggle-row">
      ${button('🕶️ Lie low this year', 'fame.lieLow', { variant: 'small', disabled: f.lowThisYear, hint: 'Buzz fades fast; fewer cameras' })}
      ${button('📣 Publicity push', 'fame.publicity', { variant: 'small', disabled: f.pushedThisYear || f.lowThisYear, hint: 'A publicist, a cover, a podcast tour — buzz, at a price and a risk' })}
      ${f.security ? button('Let security go', 'fame.dropSecurity', { variant: 'small ghost' }) : ''}
    </div>
    <p class="fine">Fame brings endorsements, talk shows and book deals — and paparazzi, stalkers and scandals that follow you into office, business and your audience.</p>`, { icon: '⭐', accent: 'yellow' });
}

/** Retirement: how you spend the years, the bucket list, where you live. */
function retirementLifeCard(state) {
  const s = retirementLifeSummary(state);
  if (!s) return '';
  const rhythms = Object.entries(s.rhythms).map(([id, r]) => button(r.label, 'retirementLife.rhythm', { arg: id, variant: s.r.rhythm === id ? 'small on' : 'small', disabled: r.needsGrandkids && !s.grandkids, hint: `${r.desc}${r.cost ? ` (~$${r.cost.toLocaleString()}/yr)` : ''}` })).join('');
  const bucket = Object.entries(s.bucket).map(([id, b]) => {
    const done = s.r.bucket[id];
    return button(`${b.label}${done != null ? ` ✓ ${done}` : ''}`, 'retirementLife.bucket', { arg: id, variant: done != null ? 'tiny on' : 'tiny', disabled: done != null || s.bucketThisYear, hint: b.cost ? `$${b.cost.toLocaleString()}` : 'Free' });
  }).join('');
  return card('Retirement', `
    <h4 class="sub">How you spend the year</h4><div class="toggle-row">${rhythms}</div>
    <h4 class="sub">Bucket list <small class="muted">(one a year)</small></h4><div class="toggle-row">${bucket}</div>
    <h4 class="sub">Where you live</h4><div class="toggle-row">
      ${button(s.r.community ? '🏠 Leave the retirement community' : `🏡 Move into a retirement community (~$${s.communityFee.toLocaleString()}/yr)`, 'retirementLife.community', { variant: 'small' })}
      ${s.grandkids ? button('👨‍👩‍👧 Move near the grandchildren', 'retirementLife.nearFamily', { variant: 'small', hint: '~$8,000' }) : ''}
    </div>
    <p class="fine">Hobbies, volunteering and part-time work keep the mind sharp.</p>`, { icon: '🌅', accent: 'green' });
}

export const VIEWS = {
  life: (state, ui = {}) => {
    const limit = ui.logLimit ?? 30;
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
  cases: casesView,
  crime: crimeView,
  underworld: underworldView,
  home: homeView,
  move: moveView,
  politics: politicsView,
  achievements: achievementsView,
  activities(state) {
    const items = ACTIVITIES.map((a) => {
      const done = Boolean(state.yearly[`activity.${a.id}`]);
      const tooYoung = state.character.age < a.minAge;
      const cost = activityCost(state, a);
      return button(`${a.icon} ${a.label}`, 'activities.do', { arg: a.id, disabled: done || tooYoung, hint: done ? 'Done this year' : tooYoung ? `Age ${a.minAge}+` : `${a.desc}${cost ? ` ($${cost.toLocaleString()})` : ''}` });
    }).join('');
    return `${retirementLifeCard(state)}${fameCard(state)}${hobbiesCard(state)}${card('Activities', `<p class="muted">Each activity can be done once per year.</p><div class="action-grid">${items}</div>`, { icon: '🏃' })}
      <p class="fine">😈 Crime, the drug trade and the underworld have moved to ⚖️ Legal → 🕶️ Crime.</p>`;
  },
  honors(state) {
    const mil = militaryHonors(state);
    const inOrder = (h) => Boolean(h.order) || (h.source === 'order' && h.tier !== 'peer');
    const posts = ceremonialPosts(state);
    const duties = posts.length ? card('Ceremonial Duties', `${posts.map((p) => `<p><b>${esc(p.name)}</b>${p.rec ? ` <small class="muted">${p.rec.years} yr · ${p.rec.events} duties</small>` : ''}</p>${meter(p.rec?.standing ?? 50, { label: p.kind === 'lieutenancy' ? '🏰 Standing in the county' : '🎖️ Standing with the regiment' })}`).join('')}<p class="fine">Each year brings a duty: how you handle it decides whether the post is renewed and how you're remembered.</p>`, { icon: '🎖️' }) : '';
    return `${duties}${card('Ribbon Rack', `${ribbonRack(state.honors)}${kv([['Total prestige', `⭐ ${prestige(state)}`], ['Military decorations', mil.length], ['Civil awards', state.honors.length - mil.length], ['Pension multiplier', `×${pensionMultiplier(state).toFixed(2)}`]])}`, { icon: '🎖️', accent: 'yellow' })}${ordersCard(state, inOrder)}${card('Medal Case', medalCase(state.honors.filter((h) => !inOrder(h))), { icon: '🏅' })}`;
  },
};

function hobbiesCard(state) {
  const mine = hobbiesOf(state);
  const ids = Object.keys(mine);
  const rows = ids.map((id) => {
    const d = HOBBIES[id];
    const h = mine[id];
    return `<div class="case-file"><h4>${d.icon} ${esc(d.label)} ${chip(tierOf(h.skill).label, h.skill >= 75 ? 'good' : '')} <small class="muted">since ${h.since}${h.wins ? ` · 🏆 ${h.wins}` : ''}${h.earned ? ` · earned $${h.earned.toLocaleString()}` : ''}</small></h4>
      ${meter(h.skill, { label: 'Skill', suffix: '/100' })}${h.best ? `<p class="fine">Best: ${esc(h.best)}</p>` : ''}
      <div class="action-grid">${button('🔁 Practise', 'hobbies.practise', { arg: id, variant: 'small', disabled: Boolean(state.yearly[`hobby.practise.${id}`]), hint: `$${Math.round(d.cost * priceLevel(state)).toLocaleString()} · skill fades without it` })}${button('🏆 Enter an event', 'hobbies.compete', { arg: id, variant: 'small', disabled: h.skill < 20 || Boolean(state.yearly[`hobby.compete.${id}`]), hint: h.skill < 20 ? 'Amateur level (20+) first' : 'The biggest your level allows' })}${button('✖ Give up', 'hobbies.drop', { arg: id, variant: 'small ghost' })}</div></div>`;
  }).join('<hr>');
  const take = ids.length < MAX_HOBBIES ? Object.entries(HOBBIES).filter(([id, d]) => !mine[id] && state.character.age >= d.minAge).map(([id, d]) => button(`${d.icon} ${d.label}`, 'hobbies.take', { arg: id, variant: 'tiny' })).join('') : '';
  if (!rows && !take) return '';
  return card('Hobbies', `<p class="muted">Up to ${MAX_HOBBIES}. Beginner → amateur → club → competitive → semi-pro → elite. Sport peaks young; the rest keeps improving. Semi-pros get paid.</p>${rows}${take ? `<p class="fine">Take up:</p><div class="toggle-row">${take}</div>` : ''}`, { icon: '🎯' });
}

export class Renderer {
  constructor({ root, toastRoot, engine }) {
    this.root = root;
    this.toastRoot = toastRoot;
    this.engine = engine;
    this.tab = readTab();
    this.nameRng = new Random();
    /** Transient UI state: open panel, log paging and filter, settings. */
    this.panel = null;
    this.ui = { logLimit: 30, logFilter: { query: '', kind: 'all' }, bizTab: 'overview' };
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
    const country = this.engine?.state ? countryOf(this.engine.state) : null;
    el.textContent = country ? localizeTerms(localizeMoney(tidyText(text), country), country) : tidyText(text);
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
    // Collapsible sections remember whether you opened or closed them (across reloads, too).
    this.disclosures ??= loadFolds();
    for (const d of this.root.querySelectorAll('details[data-key]')) this.disclosures[d.dataset.key] = d.open;
    this.watchFolds();
    this.root.innerHTML = localizeHtml(fixMoneySigns(this.html(state)), state ? countryOf(state) : null);
    for (const d of this.root.querySelectorAll('details[data-key]')) if (d.dataset.key in this.disclosures) d.open = this.disclosures[d.dataset.key];
    this.restoreFocus(focusKey, state);
    this.applyLogFilter();
    this.applyJobFilter();
  }

  /** Remember a fold the moment it's toggled (toggle events don't bubble, so listen in the capture phase). */
  watchFolds() {
    if (this.foldsWatched || !this.root?.addEventListener) return;
    this.foldsWatched = true;
    this.root.addEventListener('toggle', (e) => {
      const key = e.target?.dataset?.key;
      if (!key) return;
      this.disclosures ??= loadFolds();
      this.disclosures[key] = e.target.open;
      saveFolds(this.disclosures);
    }, true);
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
      // A search reaches into folded years.
      if ((q || kind !== 'all') && any && year.tagName === 'DETAILS') year.open = true;
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
      <div class="topbar-mid">${chip(`📅 ${currentYear(state)}`)} ${chip(`${PHASES[state.economy.phase].icon} ${PHASES[state.economy.phase].label}${causeOf(state) ? ` (${causeOf(state).label})` : ''}${state.world?.pandemic?.active ? ' · 🦠 pandemic' : ''} · ${(state.economy.unemployment * 100).toFixed(1)}% unemp · S&P ${Math.round(state.economy.marketIndex)}`, state.economy.phase === 'recession' ? 'bad' : state.economy.phase === 'peak' ? 'warn' : 'cyan')} ${state.character.posting ? chip(`📍 ${esc(postingLabel(state.character.posting))}`, 'cyan') : chip(`${region.icon} ${esc(region.name)}`)} ${chip(`💵 ${compactMoney(state.finances.cash)}`, state.finances.cash < 0 ? 'bad' : 'good')} ${chip(`⭐ ${prestige(state)}`, 'honor')}${difficultyId(state) !== 'normal' ? ` ${chip(`${difficultyOf(state).icon} ${difficultyOf(state).name}${state.difficulty?.assisted ? ' (assisted)' : ''}`, difficultyId(state) === 'story' ? 'cyan' : 'bad')}` : ''}</div>
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
    if (job) parts.push(`${getProfession(job.professionId).icon} ${job.title} [${gradePrefix(job)}${job.grade}]`);
    const biz = state.business?.current;
    if (biz) parts.push(`🏪 ${biz.role === 'operator' ? 'Running' : 'Owner of'} ${biz.name}`);
    const svc = state.military.service;
    if (svc) parts.push(`${branchOf(svc).icon} ${rankOf(svc).code} ${rankOf(svc).title}${svc.component === 'reserve' ? ' (Res.)' : ''}`);
    for (const s of SERVICE_LIST) {
      const m = state.emergency[s.id];
      if (m) parts.push(`${s.icon} ${rankOfMember(s.id, m).title}`);
    }
    if (state.politics.office) parts.push(`🗳️ ${state.politics.office.id === 'governor' ? 'Governor' : state.politics.office.id}`.replace('cityCouncil', 'City Council').replace('stateRep', 'State Rep').replace('stateSenator', 'State Senator').replace('usRep', 'U.S. Rep').replace('usSenator', 'U.S. Senator').replace('mayor', 'Mayor').replace('judge', 'Judge'));
    const seat = state.judiciary?.seat;
    if (seat && state.politics.office?.id !== 'judge') parts.push(`🧑‍⚖️ ${courtTitle(state, seat.court)}`);
    if (state.career.emeritus && !job) parts.push(`🎓 ${state.career.emeritus.title}`);
    // The Crown is a role, not unemployment.
    const r = state.royal;
    if (!parts.length && r && !r.abdicated && state.character.age >= 18) parts.push(r.reigning ? `👑 ${CROWNS[r.crownId]?.titles.monarch[state.character.gender === 'female' ? 1 : 0] ?? 'Sovereign'}` : r.working && !r.steppedBack ? '👑 Working royal' : '👑 Member of the royal family');
    if (!parts.length) parts.push(state.character.age < 18 ? '🧒 Kid' : state.retirement.retired ? '🏖️ Retired' : '🛋️ Unemployed');
    const status = housingStatus(state);
    const res = status === 'official' ? officialResidence(state) : null;
    const hs = STATUS_LABEL[status];
    parts.push(res ? `${res.icon} ${res.name.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase())}` : `${hs.icon} ${hs.label}`);
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
          <div><h2>${esc(styledName(state))}${postNominals(state) ? ` <small class="muted">${esc(postNominals(state))}</small>` : ''}</h2><p class="age">Age <b>${c.age}</b></p></div>
        </div>
        <ul class="status-line">${this.statusLine(state)}</ul>`, { className: 'profile-card' })}
      ${card('Stats', statPanel(state.stats), { icon: '📊', className: 'stats-card' })}
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

    // Rank, office and honours: what the stone says beneath the name.
    const r = state.royal;
    const g = c.gender === 'female' ? 1 : 0;
    const offices = [...(state.politics?.history ?? []), state.politics?.office && { officeId: state.politics.office.id, startAge: state.politics.office.startAge, endAge: c.age }]
      .filter((o) => o && OFFICES[o.officeId]);
    const topOffice = offices.sort((a, b) => (OFFICES[b.officeId].level ?? 0) - (OFFICES[a.officeId].level ?? 0))[0];
    const orders = state.honors.filter((h) => h.source === 'order').sort((a, b) => (b.prestige ?? 0) - (a.prestige ?? 0));
    const topHonours = [...orders, ...state.honors.filter((h) => h.source !== 'order').sort((a, b) => (b.prestige ?? 0) - (a.prestige ?? 0))]
      .map((h) => h.name).filter((n, i, a) => n && a.indexOf(n) === i).slice(0, 3);
    const distinctions = [
      r?.reigning ? `${CROWNS[r.crownId]?.titles.monarch[g] ?? 'Sovereign'}, reigned ${currentYear(state) - (state.world.crowns?.[r.crownId]?.since ?? currentYear(state))} years` : null,
      r && !r.reigning ? `${r.line === 1 ? CROWNS[r.crownId]?.titles.heir[g] : CROWNS[r.crownId]?.titles.royal[g]}${r.abdicated ? ', who once reigned' : ''}` : null,
      c.formerRoyal ? (c.formerRoyal.reigned ? `Once ${c.formerRoyal.regnal}, who gave up the throne` : 'Born royal; gave it all up') : null,
      c.style?.peerage ?? null,
      topOffice ? `${OFFICES[topOffice.officeId].name}${topOffice.endAge > topOffice.startAge ? ` (${topOffice.endAge - topOffice.startAge} yr)` : ''}` : null,
      ...topHonours,
    ].filter(Boolean);
    if (r?.reigning) epitaph = `Long live the ${c.gender === 'female' ? 'Queen' : 'King'}.`;
    else if (c.formerRoyal) epitaph = 'They chose their own life.';
    else if (moh) epitaph = 'Above and beyond the call of duty.';
    else if (topOffice && (OFFICES[topOffice.officeId].level ?? 0) >= 5) epitaph = `They served the nation as ${OFFICES[topOffice.officeId].name}.`;
    else if (c.peerage) epitaph = 'A voice in the councils of the realm.';
    else if (orders.length && !felon && epitaph === 'They lived a quiet life.') epitaph = `For services to ${orders[0].citation?.match(/For services to ([^.]+)/)?.[1] ?? 'the community'}.`;

    const headline = obituaryHeadline(state, {
      officeName: topOffice && (OFFICES[topOffice.officeId].level ?? 0) >= 4 ? OFFICES[topOffice.officeId].name : null,
      peakJob, topMil, militaryName: topMil ? branchOf(topMil).name : null, famous: (state.fame?.score ?? 0) >= 60,
    });
    return {
      headline,
      name: `${styledName(state)}${postNominals(state) ? ` ${postNominals(state)}` : ''}`,
      distinctions,
      born: c.birthYear,
      died: currentYear(state),
      age: c.age,
      cause: c.causeOfDeath,
      epitaph,
      honors: state.honors,
      facts: [
        ['Net worth', money(netWorth(state))],
        ['Lifetime earnings', money(state.finances.lifetimeEarnings)],
        peakJob ? ['Career peak', `${esc(peakJob.title)} [${gradePrefix({ ...peakJob, sector: peakJob.sector ?? PROFESSIONS[peakJob.professionId]?.sector })}${peakJob.peakGrade}]`] : null,
        topMil ? ['Military', `${esc(topMil.rankTitle)}, ${esc(branchOf(topMil).name)}`] : null,
        responder ? ['First responder', esc(responder.rankTitle)] : null,
        ['Credentials', Object.values(state.credentials.held).filter((h) => h.status === 'active').length],
        ['Honors', `${state.honors.length} (⭐ ${prestige(state)})`],
        felon ? ['Record', 'Felony conviction'] : null,
        ...lifeStoryFacts(state),
        ['Difficulty', `${difficultyOf(state).icon} ${difficultyOf(state).name}${state.difficulty?.assisted ? ' (assisted)' : ''}`],
        ['Achievements', `${Object.keys(state.achievements ?? {}).length} of ${Object.keys(ACHIEVEMENTS).length}`],
        state.challenge && CHALLENGES[state.challenge.id] ? ['Challenge', `${CHALLENGES[state.challenge.id].icon} ${esc(CHALLENGES[state.challenge.id].name)} — ${state.challenge.status === 'won' ? 'won' : 'failed'}`] : null,
        state.hallOfFame ? ['Hall of Fame', `#${state.hallOfFame.rank} · score ⭐ ${state.hallOfFame.score}`] : null,
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
