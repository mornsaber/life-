/**
 * Pure view helpers. Every function takes data and returns an HTML string;
 * none of them touch the DOM or mutate state. Interactive elements carry
 * `data-action` / `data-arg` attributes that index.js routes to the engine.
 */
import { STAT_META, STAT_KEYS } from '../core/State.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const money = (n) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString()}`;

export const compactMoney = (n) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs)}`;
};

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

const LEADING_EMOJI = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D|\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator})*)\s*/u;

/** Hide a label's leading decorative emoji from screen readers (the words carry the meaning). */
export function a11yLabel(label) {
  const m = String(label).match(LEADING_EMOJI);
  return m ? `<span aria-hidden="true">${m[1]}</span> ${String(label).slice(m[0].length)}` : label;
}

/** `collect: true` builds the arg from the <select data-part> fields in the nearest [data-collect-root]. */
export function button(label, action, { arg, variant = '', disabled = false, hint = '', title = '', collect = false } = {}) {
  return `<button class="btn ${variant}" data-action="${esc(action)}"${arg !== undefined ? ` data-arg="${esc(arg)}"` : ''}${collect ? ' data-collect' : ''}${disabled ? ' disabled' : ''}${title ? ` title="${esc(title)}"` : ''}>
    <span class="btn-label">${a11yLabel(label)}</span>${hint ? `<span class="btn-hint">${esc(hint)}</span>` : ''}
  </button>`;
}

export function card(title, body, { icon = '', accent = '', extra = '', className = '' } = {}) {
  return `<section class="card ${accent ? `accent-${accent}` : ''} ${className}">
    ${title ? `<header class="card-head"><h3>${icon ? `<span class="card-icon" aria-hidden="true">${icon}</span>` : ''}${title}</h3>${extra}</header>` : ''}
    <div class="card-body">${body}</div>
  </section>`;
}

export function chip(text, tone = '') {
  return `<span class="chip ${tone}">${a11yLabel(text)}</span>`;
}

export function meter(value, { max = 100, tone = 'auto', label = '', suffix = '%' } = {}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const t = tone === 'auto' ? (pct >= 70 ? 'good' : pct >= 40 ? 'mid' : 'bad') : tone;
  return `<div class="meter ${t}" role="meter" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.round(value)}"${label ? ` aria-label="${esc(String(label).replace(/<[^>]+>/g, ''))}"` : ''}>
    ${label ? `<div class="meter-label"><span>${label}</span><b>${Math.round(value)}${suffix}</b></div>` : ''}
    <div class="meter-track"><div class="meter-fill" style="width:${pct}%"></div></div>
  </div>`;
}

export function statBar(key, value) {
  const meta = STAT_META[key];
  const effective = meta.inverse ? 100 - value : value;
  const tone = effective >= 70 ? 'good' : effective >= 40 ? 'mid' : 'bad';
  return `<div class="stat" role="meter" aria-label="${meta.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}">
    <span class="stat-icon" aria-hidden="true">${meta.icon}</span>
    <span class="stat-name">${meta.label}</span>
    <div class="meter-track" aria-hidden="true"><div class="meter-fill ${tone}" style="width:${value}%"></div></div>
    <b class="stat-val">${value}</b>
  </div>`;
}

export function statPanel(stats) {
  return STAT_KEYS.map((k) => statBar(k, stats[k])).join('');
}

export function kv(pairs) {
  return `<dl class="kv">${pairs.filter(Boolean).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

export function empty(text) {
  return `<p class="empty">${text}</p>`;
}

/* ------------------------------------------------------------------ */
/* Badges & ladders                                                    */
/* ------------------------------------------------------------------ */

const METALS = ['iron', 'bronze', 'bronze', 'silver', 'silver', 'gold', 'platinum'];

/** `level` 0..1 picks the badge metal. */
export function rankBadge(code, title, level = 0, { icon = '' } = {}) {
  const metal = METALS[Math.min(METALS.length - 1, Math.floor(level * (METALS.length - 1) + 0.0001))];
  return `<div class="rank-badge metal-${metal}">
    <div class="rank-code">${icon ? `<span>${icon}</span>` : ''}${esc(code)}</div>
    <div class="rank-title">${esc(title)}</div>
  </div>`;
}

export function ladder(steps, current, { compact = false } = {}) {
  return `<ol class="ladder ${compact ? 'compact' : ''}">${steps
    .map((s, i) => {
      const state = i < current ? 'done' : i === current ? 'now' : 'todo';
      return `<li class="${state}" title="${esc(s.title)}${s.sub ? ` — ${esc(s.sub)}` : ''}">
        <span class="ladder-dot">${i < current ? '✓' : i + 1}</span>
        <span class="ladder-title">${esc(s.title)}</span>
        ${s.sub ? `<span class="ladder-sub">${esc(s.sub)}</span>` : ''}
      </li>`;
    })
    .join('')}</ol>`;
}

/* ------------------------------------------------------------------ */
/* Medals                                                              */
/* ------------------------------------------------------------------ */

export function ribbon(stripes, { device = null, count = 1, title = '' } = {}) {
  const total = stripes.reduce((s, [, w]) => s + w, 0);
  let at = 0;
  const stops = stripes
    .map(([color, w]) => {
      const from = (at / total) * 100;
      at += w;
      return `${color} ${from}% ${(at / total) * 100}%`;
    })
    .join(', ');
  const marks = [device === 'V' ? '<i class="dev-v">V</i>' : '', count > 1 ? `<i class="dev-oak">${'🍂'.repeat(Math.min(count - 1, 3))}</i>` : ''].join('');
  return `<span class="ribbon" style="background:linear-gradient(90deg, ${stops})" title="${esc(title)}">${marks}</span>`;
}

/** Ribbon rack grouped by award (with oak-leaf clusters for repeats). */
export function ribbonRack(honors) {
  if (!honors.length) return empty('No decorations yet.');
  const groups = new Map();
  for (const h of honors) {
    const key = `${h.source}:${h.name}`;
    const g = groups.get(key) ?? { ...h, count: 0, valor: false };
    g.count += 1;
    g.valor ||= h.device === 'V';
    groups.set(key, g);
  }
  const sorted = [...groups.values()].sort((a, b) => (a.precedence ?? 99) - (b.precedence ?? 99));
  return `<div class="rack">${sorted
    .map((g) => ribbon(g.ribbon, { device: g.valor ? 'V' : null, count: g.count, title: `${g.name}${g.count > 1 ? ` ×${g.count}` : ''}` }))
    .join('')}</div>`;
}

export function medalCase(honors) {
  if (!honors.length) return empty('Your medal case is empty. Serve with distinction to fill it.');
  const sorted = [...honors].sort((a, b) => (a.precedence ?? 99) - (b.precedence ?? 99) || a.age - b.age);
  return `<ul class="medal-list">${sorted
    .map(
      (h) => `<li class="medal ${h.posthumous ? 'posthumous' : ''}">
        <div class="medal-art">${ribbon(h.ribbon, { device: h.device })}<span class="medal-icon">${h.icon}</span></div>
        <div class="medal-text">
          <b>${esc(h.name)}${h.device ? ' <em>with "V"</em>' : ''}${h.posthumous ? ' <em>(posthumous)</em>' : ''}</b>
          <small>Age ${h.age} · ${h.year} · ${h.source === 'military' ? 'Military' : 'Civil'} · +${h.prestige} prestige</small>
          ${h.citation ? `<p>${esc(h.citation)}</p>` : ''}
        </div>
      </li>`,
    )
    .join('')}</ul>`;
}

/* ------------------------------------------------------------------ */
/* Life log                                                            */
/* ------------------------------------------------------------------ */

/** Log kinds grouped for the filter menu. */
export const LOG_FILTERS = {
  all: 'Everything',
  milestone: 'Milestones',
  good: 'Good news',
  bad: 'Bad news',
  finance: 'Money',
  warn: 'Warnings',
};

export function logView(log, { limit = Infinity } = {}) {
  const years = [...log].reverse().slice(0, limit);
  return `<div class="log">${years
    .map(
      (y, i) => `<article class="log-year ${i === 0 ? 'latest' : ''}" aria-label="Age ${y.age}, ${y.year}">
        <header><span class="log-age">Age ${y.age}</span><span class="log-yr">${y.year}</span>${y.compacted ? '<span class="log-compact" title="Older years keep only their headline moments">highlights</span>' : ''}</header>
        <ul>${y.entries.map((e) => `<li class="log-${e.kind ?? 'info'}" data-kind="${e.kind ?? 'info'}"><span class="log-icon" aria-hidden="true">${e.icon ?? '•'}</span><span class="log-text">${esc(e.text)}</span></li>`).join('')}</ul>
      </article>`,
    )
    .join('')}</div>`;
}

/** Search box + kind filter; index.js filters the rendered entries in place (no re-render). */
export function logControls({ query = '', kind = 'all' } = {}) {
  return `<div class="log-controls" role="search">
    <label class="sel"><span>Search the story</span><input type="search" id="log-search" value="${esc(query)}" placeholder="e.g. promoted, medal, Denver" aria-controls="life-log"></label>
    <label class="sel"><span>Show</span><select id="log-kind" aria-controls="life-log">${Object.entries(LOG_FILTERS).map(([id, label]) => `<option value="${id}"${id === kind ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
    <span class="log-count" id="log-count" aria-live="polite"></span>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

export function promptModal(prompt, queued) {
  const [lead, ...rest] = String(prompt.text ?? '').split('\n');
  return `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="prompt-title" aria-describedby="prompt-text">
    <div class="modal">
      <div class="modal-icon" aria-hidden="true">${prompt.icon}</div>
      <h2 id="prompt-title">${esc(prompt.title)}</h2>
      <div id="prompt-text">${rest.length ? `<p class="modal-lead">${esc(lead)}</p><p class="modal-text">${esc(rest.join('\n'))}</p>` : `<p class="modal-text">${esc(lead)}</p>`}</div>
      <div class="modal-options">${prompt.options
        .map(
          (o, i) => `<button class="option ${o.tone ?? ''}" data-action="engine.resolve" data-prompt="${esc(prompt.id)}" data-option="${esc(o.id)}"${o.disabled ? ' disabled' : ''}>
            <kbd aria-hidden="true">${i + 1}</kbd><span class="option-label">${a11yLabel(esc(o.label))}</span>${o.hint ? `<span class="option-hint">${esc(o.hint)}</span>` : ''}
          </button>`,
        )
        .join('')}</div>
      ${queued > 1 ? `<p class="modal-queue">${queued - 1} more decision${queued > 2 ? 's' : ''} waiting this year</p>` : ''}
    </div>
  </div>`;
}

export function newLifeForm(rngName) {
  return `<div class="splash">
    <div class="splash-card">
      <h1 class="logo big">LIFE<span>//</span>SIM</h1>
      <p class="tagline">Careers · Service · School · Home · Health · Money</p>
      <form id="new-life-form" autocomplete="off">
        <div class="form-row">
          <label>First name<input name="firstName" maxlength="20" placeholder="${esc(rngName.firstName)}"></label>
          <label>Last name<input name="lastName" maxlength="20" placeholder="${esc(rngName.lastName)}"></label>
        </div>
        <fieldset class="gender">
          <legend>Gender</legend>
          <label><input type="radio" name="gender" value="random" checked> 🎲 Random</label>
          <label><input type="radio" name="gender" value="female"> 👩 Female</label>
          <label><input type="radio" name="gender" value="male"> 👨 Male</label>
        </fieldset>
        <button type="submit" class="btn primary huge" data-action="engine.newLife">▶ PRESS START</button>
      </form>
      <p class="fine">Your progress saves automatically in this browser.</p>
    </div>
  </div>`;
}

export function tombstone({ name, born, died, age, cause, epitaph, facts, honors }, extra = '') {
  return `<div class="tombstone-wrap">
    <div class="tombstone">
      <div class="rip">R.I.P.</div>
      <h2>${esc(name)}</h2>
      <p class="dates">${born} – ${died} · Age ${age}</p>
      <p class="cause">${esc(cause)}</p>
      <p class="epitaph">“${esc(epitaph)}”</p>
      ${honors.length ? `<div class="tomb-rack">${ribbonRack(honors)}</div>` : ''}
      ${kv(facts)}
      ${extra}
      <button class="btn ${extra ? '' : 'primary'} huge" data-action="engine.abandon" data-arg="skipConfirm">▶ ${extra ? 'Start a brand-new life' : 'NEW LIFE'}</button>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Forms & career ladders                                              */
/* ------------------------------------------------------------------ */

/** A <select> whose value is collected into the action arg (see index.js data-collect). */
export function select(part, options, { label = '', value = '' } = {}) {
  return `<label class="sel">${label ? `<span>${esc(label)}</span>` : ''}<select data-part="${part}">${options
    .map((o) => `<option value="${esc(o.value)}"${o.value === value ? ' selected' : ''}${o.disabled ? ' disabled' : ''}>${esc(o.label)}</option>`)
    .join('')}</select></label>`;
}

/**
 * Branching ladder: shared levels, then Specialist and Management rows.
 * `available(level)` → false greys out levels this employer doesn't have.
 */
export function trackLadder(levels, currentId, available = () => true) {
  const row = (list, label) => {
    if (!list.length) return '';
    const currentIdx = list.findIndex((l) => l.id === currentId);
    return `<div class="track-row"><span class="track-label">${label}</span><ol class="ladder compact">${list
      .map((l, i) => {
        const cls = l.id === currentId ? 'now' : currentIdx > -1 && i < currentIdx ? 'done' : available(l) ? 'todo' : 'na';
        return `<li class="${cls}" title="${esc(l.title)} [G${l.grade}]${available(l) ? '' : ' — not at this employer'}">
          <span class="ladder-dot">G${l.grade}</span><span class="ladder-title">${esc(l.title)}</span></li>`;
      })
      .join('')}</ol></div>`;
  };
  return `<div class="tracks">${row(levels.filter((l) => l.track === 'shared'), 'Core')}${row(levels.filter((l) => l.track === 'ic'), '🧠 Specialist')}${row(levels.filter((l) => l.track === 'mgmt'), '👥 Management')}</div>`;
}

export function statusPill(status) {
  const tone = { active: 'good', suspended: 'warn', expired: 'warn', revoked: 'bad', training: 'cyan' }[status] ?? '';
  return chip(status, tone);
}

/**
 * A collapsible section. `key` lets the renderer keep it open (or closed)
 * across re-renders, since the whole view is rebuilt on every change.
 */
export function disclosure(key, summary, body, { open = false, count = null } = {}) {
  return `<details class="disclosure" data-key="${esc(key)}"${open ? ' open' : ''}><summary>${summary}${count != null ? ` <span class="count">${count}</span>` : ''}</summary><div class="disclosure-body">${body}</div></details>`;
}

/** A compact choice row: icon, title, one line of detail, a status line (odds or what's missing) and an action. */
export function optionRow({ icon = '', title, sub = '', meta = '', tone = '', action = '', locked = false }) {
  return `<li class="job-row opt-row ${locked ? 'locked' : ''}"><span class="job-icon" aria-hidden="true">${icon}</span><div class="job-info"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}${meta ? `<small class="opt-meta ${tone}">${meta}</small>` : ''}</div>${action}</li>`;
}
