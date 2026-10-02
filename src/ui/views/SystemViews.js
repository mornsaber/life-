/**
 * System panels: save slots (load, new, delete, export, import), settings
 * (theme, auto-resolve, debug undo) and the keyboard-shortcut reference.
 * Rendered as dialogs over the game; the slot list also appears on the
 * New Life screen.
 */
import { esc, button } from '../Components.js';
import { STATE_VERSION } from '../../core/State.js';
import { ROUTINE } from '../../core/Routine.js';

function dialog(id, title, body) {
  return `<div class="overlay panel-overlay" role="dialog" aria-modal="true" aria-labelledby="${id}-title" data-panel="${id}">
    <div class="modal panel-modal">
      <header class="panel-head"><h2 id="${id}-title">${title}</h2>${button('✕ Close', 'ui.closePanel', { variant: 'small ghost', title: 'Close (Esc)' })}</header>
      ${body}
    </div>
  </div>`;
}

const when = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export function savesPanel(store, state, { inline = false } = {}) {
  const slots = store.listSlots();
  const rows = slots.map((s) => `<li class="slot ${s.active ? 'here' : ''}">
      <div class="slot-info"><b>${s.empty || !s.name ? 'Empty slot' : esc(s.name)}</b>
        <small>${s.empty || !s.name ? '' : `${s.alive === false ? '🪦 Died' : 'Age'} ${s.age} · `}${when(s.updated)}${s.version && s.version < STATE_VERSION ? ` · v${s.version} (will upgrade)` : ''}</small></div>
      <div class="slot-actions">
        ${s.active ? '<span class="chip good">Playing</span>' : button('▶ Load', 'save.switch', { arg: s.id, variant: 'tiny' })}
        ${button('🗑 Delete', 'save.delete', { arg: s.id, variant: 'tiny danger', title: 'Delete this save' })}
      </div>
    </li>`).join('');
  const body = `
    <p class="muted">Each slot holds one life and saves automatically. Old saves upgrade to this version (v${STATE_VERSION}) when loaded.</p>
    <ul class="slots">${rows || '<li class="empty">No saved lives yet.</li>'}</ul>
    <div class="toggle-row">
      ${button('➕ New slot', 'save.new', { variant: 'small' })}
      ${button('⬇ Export this life', 'save.export', { variant: 'small', disabled: !state, hint: 'Download as a .json file' })}
      ${button('⬆ Import a life', 'save.import', { variant: 'small', hint: 'Load a .json file into an empty or new slot' })}
    </div>
    <input type="file" id="import-file" accept="application/json,.json" hidden>`;
  return inline ? `<section class="card"><header class="card-head"><h3><span class="card-icon" aria-hidden="true">💾</span>Saved Lives</h3></header><div class="card-body">${body}</div></section>` : dialog('saves', '💾 Saved Lives', body);
}

export function settingsPanel(settings, { canUndo = false } = {}) {
  const radio = (value, label) => `<label><input type="radio" name="theme" value="${value}" data-setting="theme"${settings.theme === value ? ' checked' : ''}> ${label}</label>`;
  return dialog('settings', '⚙️ Settings', `
    <fieldset class="setting"><legend>Theme</legend>${radio('auto', 'Match my device')}${radio('dark', 'Dark arcade')}${radio('light', 'Light')}</fieldset>
    <fieldset class="setting"><legend>Decisions</legend>
      <label><input type="checkbox" data-setting="autoResolve"${settings.autoResolve ? ' checked' : ''}> Auto-resolve routine decisions</label>
      <p class="fine">Answers only decisions with one obviously safe choice (and any decision with a single option), and notes each one in your life story: ${Object.keys(ROUTINE).map((t) => esc(t.split('.')[1])).join(', ')}.</p>
    </fieldset>
    <fieldset class="setting"><legend>Debug</legend>
      <label><input type="checkbox" data-setting="debugUndo"${settings.debugUndo ? ' checked' : ''}> Show “Undo year” (keeps the last 5 years in memory)</label>
      ${settings.debugUndo ? button('↶ Undo last year', 'engine.undo', { variant: 'small', disabled: !canUndo }) : ''}
    </fieldset>`);
}

export const SHORTCUTS = [
  ['Space / Enter', 'Age up (when nothing else is focused)'],
  ['1 – 9', 'Choose an option in an open decision'],
  ['← → (on the section bar or sub-tabs)', 'Move between sections or screens; Home / End jump to the ends'],
  ['[ and ]', 'Previous / next screen from anywhere'],
  ['/', 'Search your life story'],
  ['S', 'Saves'],
  ['M', 'Menu'],
  ['Esc', 'Close a panel'],
  ['Tab / Shift+Tab', 'Move through controls (focus stays inside open dialogs)'],
  ['?', 'This list'],
];

export function helpPanel() {
  return dialog('help', '⌨️ Keyboard Shortcuts', `<dl class="kv shortcuts">${SHORTCUTS.map(([k, v]) => `<div><dt><kbd>${esc(k)}</kbd></dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <p class="fine">Every control is a real button or form field, so screen readers and switch access work throughout.</p>`);
}

/** The ☰ menu: everything that isn't part of playing a year. */
export function menuPanel(state, { canUndo = false, debugUndo = false } = {}) {
  return dialog('menu', '☰ Menu', `<div class="menu-list">
    ${button('💾 Saved lives', 'ui.panel', { arg: 'saves', hint: 'Slots, export, import' })}
    ${button('⚙️ Settings', 'ui.panel', { arg: 'settings', hint: 'Theme, auto-decisions, debug' })}
    ${button('⌨️ Keyboard shortcuts', 'ui.panel', { arg: 'help' })}
    ${debugUndo ? button('↶ Undo last year', 'engine.undo', { disabled: !canUndo }) : ''}
    ${state ? button('↺ Start a new life', 'engine.abandon', { variant: 'danger', hint: 'Abandons this life' }) : ''}
  </div>`);
}
