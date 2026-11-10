/**
 * Country pickers that show real flags (the drawn historical ones and the flag-icons set): a
 * button and a searchable list laid over a native <select>, which stays in the form and keeps
 * its value, its change events and its keyboard fallback. Options carry their flag as
 * data-flag ("img:DE", "id:gdr"); a two-letter value is taken as a country code.
 */
import { flagFrom, parseFlagSpec } from './Flags.js';
import { esc } from './Components.js';

const SELECTORS = 'select[name="countryId"], #royal-country, #house-country, select[name="nobleCountry"]';
/** The label without its leading emoji flag or symbol. */
const bare = (text) => String(text).replace(/^\s*(?:[\u{1F1E6}-\u{1F1FF}]{2}|[^\p{L}\p{N}"'(]+)\s*/u, '').trim();
function flagFor(opt) {
  const spec = parseFlagSpec(opt.dataset.flag);
  if (spec) return flagFrom(spec);
  const v = opt.value.split(/[@|]/)[0];
  if (/^[A-Z]{2}$/.test(v)) return flagFrom({ img: v });
  return `<span class="flag-symbol" aria-hidden="true">${esc((opt.textContent.match(/^\s*(\S+)/) ?? ['', '🏳️'])[1])}</span>`;
}

function build(select) {
  const wrap = document.createElement('div');
  wrap.className = 'flag-picker';
  wrap.innerHTML = `<button type="button" class="flag-picker-btn" aria-haspopup="listbox" aria-expanded="false"></button>
    <div class="flag-picker-panel" hidden><input type="search" class="flag-picker-search" placeholder="Search…" aria-label="Search"><div class="flag-picker-list" role="listbox"></div></div>`;
  select.after(wrap);
  select.classList.add('flag-select-native');
  const btn = wrap.querySelector('.flag-picker-btn');
  const panel = wrap.querySelector('.flag-picker-panel');
  const search = wrap.querySelector('.flag-picker-search');
  const list = wrap.querySelector('.flag-picker-list');

  const sync = () => {
    const opt = select.selectedOptions[0] ?? select.options[0];
    btn.innerHTML = opt ? `${flagFor(opt)} <span>${esc(bare(opt.textContent))}</span><span class="caret" aria-hidden="true">▾</span>` : '';
    btn.disabled = select.disabled;
  };
  const fill = () => {
    const q = search.value.trim().toLowerCase();
    const row = (o) => (o.disabled || (q && !o.textContent.toLowerCase().includes(q)) ? ''
      : `<button type="button" role="option" class="flag-picker-item${o.selected ? ' on' : ''}" data-value="${esc(o.value)}" aria-selected="${o.selected}">${flagFor(o)} <span>${esc(bare(o.textContent))}</span></button>`);
    let html = '';
    for (const child of select.children) {
      if (child.tagName === 'OPTGROUP') {
        const rows = [...child.children].map(row).join('');
        if (rows) html += `<div class="flag-picker-group">${esc(child.label)}</div>${rows}`;
      } else html += row(child);
    }
    list.innerHTML = html || '<p class="fine">Nothing matches.</p>';
  };
  const open = (on) => {
    panel.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    if (on) { search.value = ''; fill(); search.focus(); list.querySelector('.on')?.scrollIntoView({ block: 'nearest' }); }
  };
  btn.addEventListener('click', () => open(panel.hidden));
  search.addEventListener('input', fill);
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.flag-picker-item');
    if (!item) return;
    select.value = item.dataset.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    sync();
    open(false);
    btn.focus();
  });
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') { open(false); btn.focus(); } });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) open(false); });
  select.addEventListener('change', sync);
  select._flagPicker = { sync };
  sync();
}

/** Lay pickers over the start screen's country selects (once each). */
export function enhanceFlagSelects(root) {
  for (const s of root.querySelectorAll(SELECTORS)) if (!s._flagPicker) build(s);
}
/** After a select's options were replaced (a new year picked). */
export function syncFlagSelects(root) {
  for (const s of root.querySelectorAll(SELECTORS)) s._flagPicker?.sync();
}
