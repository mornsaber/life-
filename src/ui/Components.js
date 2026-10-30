/**
 * Pure view helpers. Every function takes data and returns an HTML string;
 * none of them touch the DOM or mutate state. Interactive elements carry
 * `data-action` / `data-arg` attributes that index.js routes to the engine.
 */
import { STAT_META, STAT_KEYS, tidyText } from '../core/State.js';
import { CHALLENGES } from '../modules/life/Achievements.js';
import { ROYAL_LEVELS } from '../modules/world/Crown.js';
import { DIFFICULTIES } from '../core/Difficulty.js';
import { COUNTRIES, PLANNED } from '../modules/world/Countries.js';
import { ROYAL_HOMES, SHARED_CROWN, HOUSE_HOMES } from '../core/State.js';
import { CONTINENT } from '../modules/world/Travel.js';
import { titleInsignia } from './Insignia.js';

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

/** A stable key for a card's fold state, from its title. */
const foldKey = (title) => `card.${String(title).replace(/<[^>]+>/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}`;

/**
 * A titled panel. Every titled card folds: tap the header to collapse it, and the choice is
 * remembered. `open: false` starts it collapsed (catalogs and secondary panels); `summary` is a
 * short line shown in the header, useful when it's folded.
 */
/** Catalogs and secondary panels start folded (one tap to open; the game remembers). */
const FOLDED_BY_DEFAULT = new Set(['Showroom', 'Buy a Franchise', 'Businesses for Sale', 'Disaster Response Teams', 'Executive Search', 'Businesses in Your Field', 'Risky Business', 'Volunteering & Mentoring', 'Licenses for Your Job', 'Convert', 'Find a Congregation', 'Career History', 'Political History', 'Laws in Force', 'Legislatures', 'Veterans Posts', 'Selective Service', 'Government Climate', 'Department Fleet & Facilities', 'Labor in Texas', 'Diplomas',
  // Career tab reference cards: the year's decisions live in "This Year at Work".
  'Organization', 'Your Work Gear', 'Job Market', 'Former Employers']);

export function card(title, body, { icon = '', accent = '', extra = '', className = '', open = !FOLDED_BY_DEFAULT.has(String(title).replace(/^Labor in .+/, 'Labor in Texas')), summary = '', fold = true } = {}) {
  const heading = `<h3>${icon ? `<span class="card-icon" aria-hidden="true">${icon}</span>` : ''}${title}</h3>${summary ? `<span class="card-sum">${summary}</span>` : ''}${extra}`;
  if (!title || !fold) {
    return `<section class="card ${accent ? `accent-${accent}` : ''} ${className}">
    ${title ? `<header class="card-head">${heading}</header>` : ''}
    <div class="card-body">${body}</div>
  </section>`;
  }
  return `<section class="card fold ${accent ? `accent-${accent}` : ''} ${className}"><details class="card-fold" data-key="${foldKey(title)}"${open ? ' open' : ''}>
    <summary class="card-head">${heading}</summary>
    <div class="card-body">${body}</div>
  </details></section>`;
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

/** A compact one-line strip of every stat, always visible under the top bar. */
export function statStrip(stats) {
  return `<div class="stat-strip" role="group" aria-label="Your stats">${STAT_KEYS.map((k) => {
    const meta = STAT_META[k];
    const v = Math.round(stats[k] ?? 0);
    const effective = meta.inverse ? 100 - v : v;
    const tone = effective >= 70 ? 'good' : effective >= 40 ? 'mid' : 'bad';
    return `<span class="mini-stat ${tone}" title="${meta.label} ${v}/100"><span aria-hidden="true">${meta.icon}</span><b>${v}</b><span class="mini-track" aria-hidden="true"><span style="width:${v}%"></span></span><span class="sr-only">${meta.label}</span></span>`;
  }).join('')}</div>`;
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
export function rankBadge(code, title, level = 0, { icon = '', insignia = '' } = {}) {
  const metal = METALS[Math.min(METALS.length - 1, Math.floor(level * (METALS.length - 1) + 0.0001))];
  return `<div class="rank-badge metal-${metal}">${insignia ? `<div class="rank-insignia">${insignia}</div>` : ''}
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
        ${s.badge ? `<span class="ladder-badge">${s.badge}</span>` : ''}<span class="ladder-title">${esc(s.title)}</span>
        ${s.sub ? `<span class="ladder-sub">${esc(s.sub)}</span>` : ''}
      </li>`;
    })
    .join('')}</ol>`;
}

/* ------------------------------------------------------------------ */
/* Medals                                                              */
/* ------------------------------------------------------------------ */

export function ribbon(raw, { device = null, count = 1, title = '' } = {}) {
  // Stripes are [color, width] pairs; plain colors count as equal widths; no ribbon gets a neutral one.
  const stripes = Array.isArray(raw) && raw.length ? raw.map((x) => (Array.isArray(x) ? x : [x, 1])) : [['#5b6577', 1], ['#c9b26b', 1], ['#5b6577', 1]];
  const total = stripes.reduce((s, [, w]) => s + w, 0);
  let at = 0;
  const stops = stripes
    .map(([color, w]) => {
      const from = (at / total) * 100;
      at += w;
      return `${color} ${from}% ${(at / total) * 100}%`;
    })
    .join(', ');
  const marks = [device ? `<i class="dev-v">${esc(device)}</i>` : '', count > 1 ? `<i class="dev-oak">${'🍂'.repeat(Math.min(count - 1, 3))}</i>` : ''].join('');
  return `<span class="ribbon" style="background:linear-gradient(90deg, ${stops})" title="${esc(title)}">${marks}</span>`;
}

/* Honours that don't define a ribbon get one of their own, worked out from the name so the same
   award always looks the same and different awards never share the default. */
const RIBBON_PALETTE = ['#1f3f8f', '#c8102e', '#f2c400', '#0a7d3b', '#6b2c91', '#e8742a', '#00a3c4', '#7a1f1f', '#2e2e2e', '#ffffff', '#4a8c2a', '#d64f9b', '#8a6d3b', '#14335c'];
const hashOf = (str) => { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export function ribbonFor(h) {
  if (Array.isArray(h.ribbon) && h.ribbon.length) return h.ribbon;
  const key = h.order ?? h.baseName ?? h.name ?? h.id ?? '';
  const n = hashOf(key);
  const pick = (i) => RIBBON_PALETTE[(n >>> (i * 4)) % RIBBON_PALETTE.length];
  const a = pick(0); let b = pick(1); let c = pick(2);
  if (b === a) b = RIBBON_PALETTE[(RIBBON_PALETTE.indexOf(a) + 5) % RIBBON_PALETTE.length];
  if (c === a || c === b) c = RIBBON_PALETTE[(RIBBON_PALETTE.indexOf(b) + 3) % RIBBON_PALETTE.length];
  switch (n % 5) {
    case 0: return [[a, 3], [b, 1], [a, 3]]; // a centre stripe
    case 1: return [[b, 1], [a, 4], [b, 1]]; // edge stripes
    case 2: return [[a, 1], [b, 1], [c, 1]]; // three bands
    case 3: return [[a, 2], [b, 1], [c, 1], [b, 1], [a, 2]]; // stripes within stripes
    default: return [[a, 1], [c, 1], [a, 1], [c, 1], [a, 1]]; // pinstripes
  }
}
/** What kind of insignia an honour is, for its shape in the medal case. */
export function insigniaKind(h) {
  if (h.sport && /gold/i.test(h.name)) return 'gold';
  if (h.sport && /silver/i.test(h.name)) return 'silver';
  if (h.sport && /bronze/i.test(h.name)) return 'bronze';
  if (h.order || h.source === 'order' || /\bOrder\b/.test(h.name ?? '')) return 'order';
  if (h.source === 'military' && /Cross|Star|Medal of Honor|Victoria/.test(h.name ?? '')) return 'cross';
  return 'disc';
}
/** A small insignia: the honour's own colour, shape by kind, and a rosette for the senior grades of an order. */
export function insignia(h) {
  const colors = ribbonFor(h).map((x) => (Array.isArray(x) ? x[0] : x));
  const main = colors.find((c) => c !== '#ffffff') ?? colors[0];
  const kind = insigniaKind(h);
  const rosette = h.order && (h.grade ?? 0) >= 2 ? '<i class="ins-rosette"></i>' : '';
  return `<span class="insignia ins-${kind}" style="--ins:${main}">${esc(h.icon ?? '🎖️')}${rosette}</span>`;
}

/** Ribbon rack grouped by award (with oak-leaf clusters for repeats). */
export function ribbonRack(honors) {
  if (!honors.length) return empty('No decorations yet.');
  const groups = new Map();
  for (const h of honors) {
    const key = `${h.source}:${h.country ?? ''}:${h.name}`;
    const g = groups.get(key) ?? { ...h, count: 0, valor: false };
    g.count += 1;
    g.valor ||= h.device === 'V';
    groups.set(key, g);
  }
  const sorted = [...groups.values()].sort((a, b) => (a.precedence ?? 99) - (b.precedence ?? 99));
  return `<div class="rack">${sorted
    .map((g) => ribbon(ribbonFor(g), { device: g.valor ? 'V' : g.order && (g.grade ?? 0) >= 2 ? '✦' : null, count: g.count, title: `${g.name}${g.count > 1 ? ` ×${g.count}` : ''}${g.country ? ` (${COUNTRIES[g.country]?.name ?? g.country})` : ''}` }))
    .join('')}</div>`;
}

/** An honour's name as awarded: one with a country keeps that country's name for it wherever you live now. */
export const honorName = (h) => (h.country ? `<span data-raw>${esc(h.name)}</span>` : esc(h.name));

export function medalCase(honors) {
  if (!honors.length) return empty('Your medal case is empty. Serve with distinction to fill it.');
  const sorted = [...honors].sort((a, b) => (a.precedence ?? 99) - (b.precedence ?? 99) || a.age - b.age);
  return `<ul class="medal-list">${sorted
    .map(
      (h) => `<li class="medal ${h.posthumous ? 'posthumous' : ''}">
        <div class="medal-art">${ribbon(ribbonFor(h), { device: h.device })}${h.source === 'honoraryRank' ? titleInsignia(h.name, h.country ?? 'GB') : insignia(h)}</div>
        <div class="medal-text">
          <b>${honorName(h)}${h.post ? ` <em>(${esc(h.post)})</em>` : ''}${h.device === 'V' ? ' <em>with "V"</em>' : ''}${h.posthumous ? ' <em>(posthumous)</em>' : ''}</b>
          <small>Age ${h.age} · ${h.year} · ${h.source === 'military' ? 'Military' : 'Civil'}${h.country ? ` · ${COUNTRIES[h.country]?.flag ?? ''} ${esc(COUNTRIES[h.country]?.name ?? h.country)}` : ''} · +${h.prestige} prestige</small>
          ${h.citation ? `<p>${h.country ? `<span data-raw>${esc(h.citation)}</span>` : esc(h.citation)}</p>` : ''}
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

/** Years shown in full at the top of the story; older years fold to a one-line headline. */
export const LOG_OPEN_YEARS = 3;
const HEADLINE_KINDS = ['death', 'milestone', 'honor', 'bad', 'good'];

function logEntries(y) {
  return `<ul>${y.entries.map((e) => `<li class="log-${e.kind ?? 'info'}" data-kind="${e.kind ?? 'info'}"><span class="log-icon" aria-hidden="true">${e.icon ?? '•'}</span><span class="log-text">${esc(tidyText(e.text, e.icon))}</span></li>`).join('')}</ul>`;
}

export function logView(log, { limit = Infinity, openYears = LOG_OPEN_YEARS } = {}) {
  const years = [...log].reverse().slice(0, limit);
  return `<div class="log">${years
    .map((y, i) => {
      const head = `<span class="log-age">Age ${y.age}</span><span class="log-yr">${y.year}</span>${y.compacted ? '<span class="log-compact" title="Older years keep only their headline moments">highlights</span>' : ''}`;
      if (i < openYears) {
        return `<article class="log-year ${i === 0 ? 'latest' : ''}" aria-label="Age ${y.age}, ${y.year}"><header>${head}</header>${logEntries(y)}</article>`;
      }
      const lead = HEADLINE_KINDS.map((k) => y.entries.find((e) => e.kind === k)).find(Boolean) ?? y.entries[0];
      return `<details class="log-year folded" data-key="log.${y.age}" aria-label="Age ${y.age}, ${y.year}"><summary><header>${head}<span class="log-n">${y.entries.length} event${y.entries.length === 1 ? '' : 's'}</span></header>${lead ? `<span class="log-lead">${lead.icon ?? ''} ${esc(tidyText(lead.text, lead.icon))}</span>` : ''}</summary>${logEntries(y)}</details>`;
    })
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
          (o, i) => `<button class="option ${o.tone ?? ''}${o.illegal ? ' illegal' : ''}" data-action="engine.resolve" data-prompt="${esc(prompt.id)}" data-option="${esc(o.id)}"${o.illegal ? ' data-illegal="1"' : ''}${o.disabled ? ' disabled' : ''}>
            <kbd aria-hidden="true">${i + 1}</kbd><span class="option-label">${a11yLabel(esc(o.label))}</span>${o.hint ? `<span class="option-hint">${esc(o.hint)}</span>` : ''}
          </button>`,
        )
        .join('')}</div>
      ${queued > 1 ? `<p class="modal-queue">${queued - 1} more decision${queued > 2 ? 's' : ''} waiting this year</p>` : ''}
    </div>
  </div>`;
}

/** Countries grouped by continent and sorted by name, kingdoms marked 👑 and former monarchies ⚜️. */
export function countryOptions({ selected = '', only = null, random = '🎲 Random country' } = {}) {
  const mark = (id) => (ROYAL_HOMES.includes(id) ? ' 👑' : SHARED_CROWN.includes(id) ? ' 👑 (British Crown)' : HOUSE_HOMES.includes(id) ? ' ⚜️' : '');
  const placed = new Set(Object.values(CONTINENT).flat());
  const groups = { ...CONTINENT, Elsewhere: Object.keys(COUNTRIES).filter((id) => !placed.has(id)) };
  const opt = (id) => `<option value="${id}"${id === selected ? ' selected' : ''}>${COUNTRIES[id].flag} ${esc(COUNTRIES[id].name)}${mark(id)}</option>`;
  const body = Object.entries(groups).map(([name, ids]) => {
    const list = ids.filter((id) => COUNTRIES[id] && (!only || only.includes(id))).sort((a, b) => COUNTRIES[a].name.localeCompare(COUNTRIES[b].name));
    return list.length ? `<optgroup label="${esc(name)}">${list.map(opt).join('')}</optgroup>` : '';
  }).join('');
  return `${random ? `<option value="random">${random}</option>` : ''}${body}`;
}

const sel = (name, options) => `<select name="${name}">${options.map(([v, label, on]) => `<option value="${v}"${on ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>`;

/** The start screen's "Born into" choice, as new-life options (only the chosen kind of birth counts). */
export function birthOptions(data) {
  const birth = data.get('birth') || 'ordinary';
  const country = data.get('countryId') || 'US';
  const pick = (field) => data.get(field) || country;
  return {
    countryId: birth === 'royal' ? pick('royalCountry') : birth === 'noble' ? pick('nobleCountry') : birth === 'house' ? pick('houseCountry') : country,
    royalLevel: birth === 'royal' ? data.get('royalLevel') || 'child' : 'none',
    nobleRank: birth === 'noble' ? data.get('nobleRank') || 'random' : 'none',
    housePlace: birth === 'house' ? data.get('housePlace') || 'random' : 'none',
    noble: birth === 'ordinary' && data.get('noble') === 'on',
  };
}

export function newLifeForm(rngName) {
  const kingdoms = [...ROYAL_HOMES];
  const birth = (id, icon, title, sub, panel, checked = false) => `<label class="birth-opt"><input type="radio" name="birth" value="${id}"${checked ? ' checked' : ''}><span class="birth-head"><b>${icon} ${title}</b><small>${sub}</small></span><div class="birth-more">${panel}</div></label>`;
  return `<div class="splash">
    <div class="splash-card">
      <h1 class="logo big">LIFE<span>//</span>SIM</h1>
      <p class="tagline">Careers · Service · School · Home · Health · Money</p>
      <form id="new-life-form" autocomplete="off">
        <h3 class="form-step">1 · Who you are</h3>
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
        <h3 class="form-step">2 · Where you're born</h3>
        <label class="country-pick">Country<select name="countryId">${countryOptions({ selected: 'random' })}${Object.values(PLANNED).length ? `<optgroup label="Coming later">${Object.values(PLANNED).map((c) => `<option disabled>${c.flag} ${esc(c.name)}</option>`).join('')}</optgroup>` : ''}</select></label>
        <p class="fine">👑 a kingdom with a royal family · ⚜️ a former monarchy whose royal house still exists.</p>
        <h3 class="form-step">3 · Born into</h3>
        <div class="birth-list">
          ${birth('ordinary', '👤', 'An ordinary family', 'Most lives start here.', '<label class="check"><input type="checkbox" name="noble"> 🏰 A very small chance of being born titled</label>', true)}
          ${birth('royal', '👑', 'The royal family', 'A prince or princess in a kingdom.', `<label class="country-pick">Place in the family${sel('royalLevel', Object.entries(ROYAL_LEVELS).map(([id, l], i) => [id, l.name, i === 1]))}</label>
            <p class="fine">${Object.values(ROYAL_LEVELS).map((l) => `<b>${esc(l.name)}</b>: ${esc(l.desc)}`).join(' ')}</p>
            <label class="country-pick">Kingdom<select name="royalCountry"><option value="">Same as above (if a kingdom)</option>${countryOptions({ only: kingdoms, random: '' })}</select></label>
            <p class="fine">Canada, Australia, New Zealand, Jamaica and the other realms share Britain's royal family, who live in Britain.</p>`)}
          ${birth('noble', '🏰', 'A noble family', 'A titled family: Britain, Spain, the Low Countries, Scandinavia, or the old nobility of France, Italy, Germany, Austria and Portugal.', `<div class="form-row"><label class="country-pick">Rank${sel('nobleRank', [['random', '🎲 Any rank', true], ...['baron', 'viscount', 'earl', 'marquess', 'duke'].map((r) => [r, r[0].toUpperCase() + r.slice(1)])])}</label>
            <label class="country-pick">Place${sel('nobleHeir', [['random', '🎲 Either', true], ['heir', '👑 Heir to the title'], ['younger', '🌿 A younger child']])}</label></div>
            <label class="country-pick">Peerage${sel('nobleCountry', [['', 'The country above, if it has one', true], ['random', '🎲 Any'], ['GB', '🇬🇧 British peerage'], ['ES', '🇪🇸 Spanish nobility'], ['FR', '🇫🇷 French noblesse'], ['BE', '🇧🇪 Belgian nobility'], ['NL', '🇳🇱 Dutch adel'], ['SE', '🇸🇪 Swedish adel'], ['DK', '🇩🇰 Danish adel'], ['IT', '🇮🇹 Italian nobiltà'], ['DE', '🇩🇪 German Adel'], ['AT', '🇦🇹 Austrian Adel'], ['PT', '🇵🇹 Portuguese nobreza']])}</label>`)}
          ${birth('house', '⚜️', 'A former ruling house', 'The family that lost a throne, and may win it back.', `<label class="country-pick">Place in the house${sel('housePlace', [['random', '🎲 Somewhere in the family', true], ['heir', '👑 Heir to the head of the house'], ['head', '⚜️ Head of the house'], ['cadet', '🌿 A cadet branch']])}</label>
            <label class="country-pick">House<select name="houseCountry"><option value="">Same as above (if it had one)</option>${countryOptions({ only: HOUSE_HOMES, random: '' })}</select></label>
            <p class="fine">Hohenzollern (Germany), Orléans (France), Savoy (Italy), Habsburg (Austria), Romanov (Russia), Orléans-Braganza (Brazil), Hohenzollern-Sigmaringen (Romania). Win back the throne in a referendum, or live with the claim.</p>`)}
        </div>
        <details class="disclosure more-options"><summary>⚙️ More options: difficulty and challenges</summary><div class="disclosure-body">
          <fieldset class="gender">
            <legend>Difficulty</legend>
            ${Object.entries(DIFFICULTIES).filter(([id]) => id !== 'royal').map(([id, d]) => `<label title="${esc(d.desc)}"><input type="radio" name="difficulty" value="${id}"${id === 'normal' ? ' checked' : ''}> ${d.icon} ${esc(d.name)}</label>`).join('')}
          </fieldset>
          <label class="country-pick">Challenge<select name="challenge"><option value="">None — just live</option>${Object.entries(CHALLENGES).map(([id, c]) => `<option value="${id}">${c.icon} ${esc(c.name)}: ${esc(c.desc)}</option>`).join('')}</select></label>
        </div></details>
        <button type="submit" class="btn primary huge" data-action="engine.newLife">▶ PRESS START</button>
      </form>
      <p class="fine">Your progress saves automatically in this browser.</p>
    </div>
  </div>`;
}

export function tombstone({ headline, name, born, died, age, cause, epitaph, distinctions = [], facts, honors }, extra = '') {
  return `<div class="tombstone-wrap">
    <div class="tombstone">
      <div class="rip">R.I.P.</div>
      ${headline ? `<p class="headline">📰 ${esc(headline)}</p>` : ''}
      <h2>${esc(name)}</h2>
      <p class="dates">${born} – ${died} · Age ${age}</p>
      <p class="cause">${esc(cause)}</p>
      ${distinctions.length ? `<p class="distinctions">${distinctions.map(esc).join('<br>')}</p>` : ''}
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
export function trackLadder(levels, currentId, available = () => true, prefix = 'G', badge = () => '') {
  const row = (list, label) => {
    if (!list.length) return '';
    const currentIdx = list.findIndex((l) => l.id === currentId);
    return `<div class="track-row"><span class="track-label">${label}</span><ol class="ladder compact">${list
      .map((l, i) => {
        const cls = l.id === currentId ? 'now' : currentIdx > -1 && i < currentIdx ? 'done' : available(l) ? 'todo' : 'na';
        return `<li class="${cls}" title="${esc(l.title)} [${prefix}${l.grade}]${available(l) ? '' : ' — not at this employer'}">
          <span class="ladder-dot">${prefix}${l.grade}</span>${badge(l) ? `<span class="ladder-badge">${badge(l)}</span>` : ''}<span class="ladder-title">${esc(l.title)}</span></li>`;
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

/**
 * An organisational chart (org/OrgChart.js nodes): boxes joined by lines, top down.
 * Open nodes show their children; the rest fold away behind a tap.
 */
export function orgTree(root, { badge = null } = {}) {
  if (!root) return '';
  const box = (n) => `<div class="org-node${n.you ? ' you' : ''}${n.kind ? ` ${n.kind}` : ''}">${badge?.(n) ? `<span class="org-badge">${badge(n)}</span>` : ''}<b>${esc(n.title)}</b>${n.name ? `<span>${esc(n.name)}</span>` : ''}${n.meta ? `<small>${esc(n.meta)}</small>` : ''}</div>`;
  const li = (n) => {
    const kids = (n.children ?? []).filter(Boolean);
    if (!kids.length) return `<li>${box(n)}</li>`;
    const list = `<ul>${kids.map(li).join('')}</ul>`;
    return n.open ? `<li>${box(n)}${list}</li>` : `<li><details><summary>${box(n)} <small class="muted">▸ ${kids.length}</small></summary>${list}</details></li>`;
  };
  return `<div class="org-chart"><ul>${li(root)}</ul></div>`;
}
