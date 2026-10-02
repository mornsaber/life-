/**
 * Application entry point: builds the engine with every domain module,
 * restores the saved life (migrating old saves), applies settings, and
 * routes all DOM input to the engine through delegated handlers.
 *
 * Keyboard (see the ⌨️ panel):
 *   Space / Enter  → Age up            1–9   → Choose a decision option
 *   ← → Home End   → Move along tabs   [ ]   → Previous / next tab
 *   /              → Search the story  S     → Saves     ?  → Shortcuts
 *   Esc            → Close a panel     Tab   → Stays inside open dialogs
 */
import { Engine } from './core/Engine.js';
import { Store } from './core/State.js';
import { Random } from './core/Random.js';
import { routineChoice } from './core/Routine.js';
import { MODULES } from './modules/registry.js';
import { Renderer, TABS, SECTIONS, sectionOf } from './ui/Renderer.js';
import { loadSettings, saveSettings, applyTheme } from './ui/Settings.js';

const store = new Store();
const engine = new Engine({ store, rng: new Random(), modules: MODULES });
const renderer = new Renderer({
  root: document.getElementById('app'),
  toastRoot: document.getElementById('toasts'),
  engine,
});

let settings = loadSettings();
function applySettings() {
  applyTheme(settings.theme);
  engine.autoResolver = settings.autoResolve ? routineChoice : null;
  renderer.settings = settings;
}
applySettings();
globalThis.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => applyTheme(settings.theme));

engine.bus.on('change', (state) => renderer.render(state));
engine.bus.on('toast', ({ text, kind }) => renderer.toast(text, kind));
engine.bus.on('ageUp', () => window.scrollTo({ top: 0 }));

function startNewLife(form) {
  const data = new FormData(form);
  const gender = data.get('gender');
  renderer.panel = null;
  engine.newLife({
    firstName: data.get('firstName'),
    lastName: data.get('lastName'),
    gender: gender === 'random' ? undefined : gender,
  });
}

/** Buttons marked data-collect build their arg from the <select>/<input data-part> fields beside them. */
function collectArg(el) {
  const root = el.closest('[data-collect-root]');
  if (!root) return el.dataset.arg;
  return [...root.querySelectorAll('[data-part]')].map((field) => field.value).join(':');
}

function downloadLife() {
  const text = engine.exportLife();
  if (!text) return;
  const c = engine.state.character;
  const name = `${c.firstName}-${c.lastName}-age${c.age}`.replace(/[^a-z0-9-]+/gi, '_');
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${name}.lifesim.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  renderer.toast('Life exported.', 'good');
}

async function importLife(file) {
  try {
    const state = engine.importLife(await file.text());
    renderer.panel = null;
    renderer.render(state);
    renderer.toast(`Imported ${state.character.firstName} ${state.character.lastName} into slot ${engine.store.activeSlot.replace('slot', '')}.`, 'good');
  } catch (err) {
    renderer.toast(err.message, 'bad');
  }
}

/** Arrow keys on the section bar move between sections (remembering each section's screen). */
function setSectionByOffset(offset, absolute = null) {
  const ids = SECTIONS.map((s) => s.id);
  const current = ids.indexOf(sectionOf(renderer.tab).id);
  const next = SECTIONS[absolute ?? (current + offset + ids.length) % ids.length];
  renderer.setTab(renderer.lastTab?.[next.id] ?? next.tabs[0].id);
  document.getElementById(`section-${next.id}`)?.focus();
}

function setTabByOffset(offset) {
  const ids = TABS.map((t) => t.id);
  const next = ids[(ids.indexOf(renderer.tab) + offset + ids.length) % ids.length];
  renderer.setTab(next);
  document.getElementById(`tab-${next}`)?.focus();
}

function handleAction(el) {
  const action = el.dataset.action;
  const arg = el.hasAttribute('data-collect') ? collectArg(el) : el.dataset.arg;
  switch (action) {
    case 'ui.tab':
      return renderer.setTab(arg);
    case 'ui.panel':
      return renderer.openPanel(arg);
    case 'ui.closePanel':
      renderer.panel = null;
      return renderer.render(engine.state);
    case 'ui.jobField':
      renderer.ui.jobField = arg;
      return renderer.render(engine.state);
    case 'ui.logMore':
      renderer.ui.logLimit += 40;
      return renderer.render(engine.state);
    case 'engine.ageUp':
      return engine.ageUp();
    case 'engine.continueAs':
      renderer.panel = null;
      if (engine.continueAsChild?.(arg)) {
        renderer.setTab('people');
        renderer.toast('A new generation begins.', 'good');
      }
      return undefined;
    case 'engine.undo':
      if (engine.undoYear()) renderer.toast('Rewound one year.', 'info');
      return undefined;
    case 'engine.resolve':
      return engine.resolvePrompt(el.dataset.prompt, el.dataset.option);
    case 'engine.newLife':
      return startNewLife(el.closest('form'));
    case 'engine.abandon':
      renderer.panel = null;
      if (arg === 'skipConfirm' || window.confirm('Abandon this life and start over? This cannot be undone.')) engine.abandonLife();
      return undefined;
    case 'save.switch':
      renderer.panel = null;
      return engine.switchSlot(arg);
    case 'save.new':
      renderer.panel = null;
      return engine.newSlot();
    case 'save.delete':
      if (window.confirm('Delete this saved life? This cannot be undone.')) {
        engine.deleteSlot(arg);
        renderer.render(engine.state);
      }
      return undefined;
    case 'save.export':
      return downloadLife();
    case 'save.import':
      return document.getElementById('import-file')?.click();
    default:
      return engine.dispatch(action, arg);
  }
}

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled) return;
  event.preventDefault();
  try {
    handleAction(el);
  } catch (err) {
    console.error(err);
    renderer.toast(`Something went wrong: ${err.message}`, 'bad');
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'new-life-form') return;
  event.preventDefault();
  startNewLife(event.target);
});

// Settings toggles, the import file picker and the log filter.
document.addEventListener('change', (event) => {
  const el = event.target;
  if (el.id === 'import-file' && el.files?.[0]) return importLife(el.files[0]);
  if (el.dataset.setting) {
    settings = { ...settings, [el.dataset.setting]: el.type === 'checkbox' ? el.checked : el.value };
    saveSettings(settings);
    applySettings();
    renderer.render(engine.state);
    return undefined;
  }
  if (el.id === 'log-kind') {
    renderer.ui.logFilter.kind = el.value;
    renderer.applyLogFilter();
  }
  return undefined;
});
document.addEventListener('input', (event) => {
  if (event.target.id !== 'log-search') return;
  renderer.ui.logFilter.query = event.target.value;
  renderer.applyLogFilter();
});

/** Keep Tab / Shift+Tab inside an open dialog. */
function trapFocus(event, dialog) {
  const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([hidden]), select, [href]')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    last.focus();
    event.preventDefault();
  } else if (!event.shiftKey && document.activeElement === last) {
    first.focus();
    event.preventDefault();
  } else if (!dialog.contains(document.activeElement)) {
    first.focus();
    event.preventDefault();
  }
}

document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const dialog = document.querySelector('.overlay[role="dialog"]');
  if (event.key === 'Tab' && dialog) return trapFocus(event, dialog);
  if (event.key === 'Escape' && renderer.panel) {
    renderer.panel = null;
    renderer.render(engine.state);
    return undefined;
  }
  const tag = event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return undefined;

  // Tab bar: roving focus with arrows / Home / End.
  if (event.target.dataset?.section && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    if (event.key === 'Home') return setSectionByOffset(0, 0);
    if (event.key === 'End') return setSectionByOffset(0, SECTIONS.length - 1);
    return setSectionByOffset(event.key === 'ArrowLeft' ? -1 : 1);
  }
  if (event.target.getAttribute?.('role') === 'tab' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const tabs = sectionOf(renderer.tab).tabs;
    const i = tabs.findIndex((t) => t.id === renderer.tab);
    const j = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (i + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
    renderer.setTab(tabs[j].id);
    document.getElementById(`tab-${tabs[j].id}`)?.focus();
    return undefined;
  }

  const state = engine.state;
  if (event.key === '?') return renderer.openPanel('help');
  if (event.key === 's' || event.key === 'S') return renderer.openPanel('saves');
  if (event.key === 'm' || event.key === 'M') return renderer.openPanel('menu');
  if (!state?.character.alive || renderer.panel) return undefined;

  const prompt = state.prompts[0];
  if (prompt && /^[1-9]$/.test(event.key)) {
    const option = prompt.options[Number(event.key) - 1];
    if (option && !option.disabled) engine.resolvePrompt(prompt.id, option.id);
    event.preventDefault();
    return undefined;
  }
  if (prompt) return undefined;
  if (event.key === '[' || event.key === ']') return setTabByOffset(event.key === '[' ? -1 : 1);
  if (event.key === '/') {
    event.preventDefault();
    if (renderer.tab !== 'life') renderer.setTab('life');
    document.getElementById('log-search')?.focus();
    return undefined;
  }
  if ((event.key === ' ' || event.key === 'Enter') && tag !== 'BUTTON' && tag !== 'A') {
    event.preventDefault();
    engine.ageUp();
  }
  return undefined;
});

if (!engine.boot()) renderer.render(null);
else if (store.migratedFrom != null) renderer.toast(`Your save was upgraded from version ${store.migratedFrom}.`, 'good');
