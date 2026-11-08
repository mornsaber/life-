/**
 * A coat of arms drawn as one SVG: the shield (field, division, ordinary, charges — counterchanged
 * on a divided field) and around it whatever the life has earned (modules/world/Heraldry.js):
 * command insignia behind, supporters, the circlet of an order, a coronet or crown, the helm or
 * an ecclesiastical hat, badges below and the motto on a scroll.
 */
import { TINCTURES, CHARGES } from '../modules/world/Heraldry.js';

const GOLD = '#d4a017';
const STEEL = '#9aa3ad';
const T = (t) => TINCTURES[t].hex;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let uid = 0;

const SHIELD = 'M65 70 H135 V112 Q135 140 100 152 Q65 140 65 112 Z';
/** The part of the field in the second tincture, by division. */
const SECOND = {
  perPale: 'M100 60 H140 V160 H100 Z', perFess: 'M60 108 H140 V160 H60 Z', perBend: 'M60 64 L140 158 L60 158 Z',
  quarterly: 'M100 60 H140 V108 H100 Z M60 108 H100 V160 H60 Z', perChevron: 'M60 160 L100 100 L140 160 Z',
};
const ORDINARY = {
  fess: '<rect x="60" y="98" width="80" height="22"/>', pale: '<rect x="89" y="60" width="22" height="100"/>',
  bend: '<path d="M52 66 L66 54 L148 150 L134 162 Z"/>', chevron: '<path d="M56 146 L100 98 L144 146 L144 128 L100 80 L56 128 Z"/>',
  cross: '<rect x="91" y="60" width="18" height="100"/><rect x="60" y="100" width="80" height="18"/>',
  saltire: '<path d="M56 64 L68 56 L144 150 L132 158 Z M144 64 L132 56 L56 150 L68 158 Z"/>', chief: '<rect x="60" y="60" width="80" height="36"/>',
};
const SPOTS = {
  none: { 1: [[100, 112, 34]], 2: [[83, 108, 22], [117, 108, 22]], 3: [[82, 92, 20], [118, 92, 20], [100, 130, 20]] },
  fess: { 2: [[100, 86, 16], [100, 136, 16]], 3: [[82, 86, 15], [118, 86, 15], [100, 137, 15]] },
  pale: { 2: [[77, 108, 16], [123, 108, 16]], 3: [[77, 92, 15], [123, 92, 15], [77, 128, 15]] },
  bend: { 2: [[119, 86, 16], [80, 132, 16]], 3: [[112, 82, 14], [127, 99, 14], [80, 132, 15]] },
  chevron: { 3: [[80, 84, 15], [120, 84, 15], [100, 138, 15]] },
  cross: { 2: [[80, 87, 14], [120, 132, 14]], 3: [[80, 87, 14], [120, 87, 14], [80, 132, 14]] },
  saltire: { 2: [[100, 82, 14], [100, 139, 14]], 3: [[100, 82, 14], [77, 110, 14], [123, 110, 14]] },
  chief: { 1: [[100, 81, 18]], 2: [[86, 81, 15], [114, 81, 15]], 3: [[79, 81, 14], [100, 81, 14], [121, 81, 14]] },
};
const charge = (glyph, [x, y, size], fill) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central" fill="${fill}" stroke="rgba(0,0,0,.25)" stroke-width="0.4">${glyph}︎</text>`;

function shieldBody(a, id) {
  const glyph = CHARGES[a.charge][0];
  const spots = SPOTS[a.ordinary]?.[a.count] ?? SPOTS[a.ordinary]?.[3] ?? SPOTS.none[a.count];
  const marks = (fill) => `<g fill="${fill}">${ORDINARY[a.ordinary] ?? ''}</g>${spots.map((s) => charge(glyph, s, fill)).join('')}`;
  let b = `<rect x="60" y="60" width="80" height="100" fill="${T(a.field)}"/>`;
  if (a.division === 'plain') {
    if (a.ordinary === 'chief') b += `<g fill="${T(a.second)}">${ORDINARY.chief}</g>${spots.map((s) => charge(glyph, s, T(a.field))).join('')}`;
    else b += marks(T(a.second));
  } else {
    // Counterchanged: each half shows the marks in the other half's tincture.
    b += `<path d="${SECOND[a.division]}" fill="${T(a.second)}"/>`;
    b += `<g mask="url(#first${id})">${marks(T(a.second))}</g><g clip-path="url(#second${id})">${marks(T(a.field))}</g>`;
  }
  return b;
}

const HELM = {
  esquire: { fill: STEEL, visor: '<path d="M100 47 H112" stroke="#333" stroke-width="2"/>', profile: true },
  knight: { fill: STEEL, visor: '<rect x="92" y="44" width="16" height="10" rx="2" fill="#2a2a2a"/>' },
  peer: { fill: '#d9dde2', visor: [92, 96, 100, 104, 108].map((x) => `<path d="M${x} 42 V56" stroke="${GOLD}" stroke-width="1.6"/>`).join('') },
  royal: { fill: GOLD, visor: [92, 96, 100, 104, 108].map((x) => `<path d="M${x} 42 V56" stroke="#7a5a10" stroke-width="1.6"/>`).join('') },
};
function helm(kind, a, dy) {
  const h = HELM[kind];
  if (!h) return '';
  const mantle = `<path d="M90 ${60 + dy} C66 ${54 + dy} 52 ${74 + dy} 58 ${100 + dy} C62 ${86 + dy} 72 ${78 + dy} 80 ${76 + dy}" fill="${T(a.field)}" stroke="${T(a.second)}" stroke-width="2"/><path d="M110 ${60 + dy} C134 ${54 + dy} 148 ${74 + dy} 142 ${100 + dy} C138 ${86 + dy} 128 ${78 + dy} 120 ${76 + dy}" fill="${T(a.field)}" stroke="${T(a.second)}" stroke-width="2"/>`;
  const shape = h.profile ? `<path d="M88 ${62 + dy} Q86 ${38 + dy} 100 ${36 + dy} Q116 ${38 + dy} 116 ${54 + dy} L112 ${62 + dy} Z" fill="${h.fill}" stroke="#555"/>` : `<path d="M86 ${62 + dy} Q86 ${36 + dy} 100 ${34 + dy} Q114 ${36 + dy} 114 ${62 + dy} Z" fill="${h.fill}" stroke="#555"/>`;
  return `${mantle}${shape}<g transform="translate(0 ${dy})">${h.visor}</g>`;
}

/** Coronets of rank and the crowns, sitting on the shield's top edge (y ≈ 70). */
function coronet(kind, y = 58, continental = false) {
  const band = `<rect x="78" y="${y + 6}" width="44" height="8" rx="2" fill="${GOLD}" stroke="#7a5a10" stroke-width=".6"/>`;
  const pearl = (x, py = y + 3, r = 2.6) => `<circle cx="${x}" cy="${py}" r="${r}" fill="#f4f1ea" stroke="#999" stroke-width=".5"/>`;
  const leaf = (x) => `<path d="M${x - 4} ${y + 6} Q${x} ${y - 6} ${x + 4} ${y + 6} Z" fill="${GOLD}" stroke="#7a5a10" stroke-width=".5"/>`;
  const spike = (x) => `<path d="M${x} ${y + 6} L${x} ${y - 4}" stroke="${GOLD}" stroke-width="1.5"/>${pearl(x, y - 6)}`;
  if (continental && ['baron', 'viscount', 'earl', 'marquess', 'duke'].includes(kind)) {
    // Continental coronets of rank: pearls on points for a baron (7) and a count (9); a viscount's
    // four pearls; a marquis's leaves and pearl trefoils; a duke's five leaves.
    switch (kind) {
      case 'baron': return band + [82, 88, 94, 100, 106, 112, 118].map((x) => spike(x)).join('').replace(/r="2.6"/g, 'r="2"');
      case 'earl': return band + [80, 85, 90, 95, 100, 105, 110, 115, 120].map((x) => `<path d="M${x} ${y + 6} L${x} ${y - 2}" stroke="${GOLD}" stroke-width="1.2"/>${pearl(x, y - 4, 2)}`).join('');
      case 'viscount': return band + [84, 95, 105, 116].map((x) => pearl(x, y + 2, 3)).join('');
      case 'marquess': return band + [84, 100, 116].map(leaf).join('') + [92, 108].map((x) => pearl(x, y - 1, 1.8) + pearl(x - 2.4, y + 2.5, 1.8) + pearl(x + 2.4, y + 2.5, 1.8)).join('');
      default: return band + [80, 90, 100, 110, 120].map(leaf).join('');
    }
  }
  switch (kind) {
    case 'baron': return band + [84, 95, 105, 116].map((x) => pearl(x)).join('');
    case 'viscount': return band + [82, 88, 94, 100, 106, 112, 118].map((x) => pearl(x, y + 3, 2)).join('');
    case 'earl': return band + [83, 100, 117].map(spike).join('') + [91, 109].map(leaf).join('');
    case 'marquess': return band + [86, 114].map(leaf).join('') + [100].map(spike).join('') + pearl(93, y + 3, 2) + pearl(107, y + 3, 2);
    case 'duke': return band + [84, 100, 116].map(leaf).join('') + [92, 108].map((x) => `<path d="M${x - 3} ${y + 6} Q${x} ${y - 2} ${x + 3} ${y + 6} Z" fill="${GOLD}"/>`).join('');
    case 'royal': return band + [84, 100, 116].map((x) => `<text x="${x}" y="${y + 6}" font-size="9" text-anchor="middle" fill="${GOLD}">✠</text>`).join('') + [92, 108].map((x) => `<text x="${x}" y="${y + 6}" font-size="8" text-anchor="middle" fill="${GOLD}">⚜︎</text>`).join('');
    case 'heir': return band + `<path d="M80 ${y + 6} Q100 ${y - 14} 120 ${y + 6}" fill="none" stroke="${GOLD}" stroke-width="2.4"/><text x="100" y="${y - 8}" font-size="9" text-anchor="middle" fill="${GOLD}">✠</text>`;
    case 'sovereign': return `<path d="M78 ${y + 6} Q78 ${y - 18} 100 ${y - 18} Q122 ${y - 18} 122 ${y + 6} Z" fill="#a3122a"/>${band}<path d="M80 ${y + 6} Q100 ${y - 22} 120 ${y + 6} M100 ${y - 20} V${y + 6}" fill="none" stroke="${GOLD}" stroke-width="2.4"/><text x="100" y="${y - 20}" font-size="10" text-anchor="middle" fill="${GOLD}">✠</text>`;
    default: return '';
  }
}

/** Ecclesiastical hats (the galero) with their tassels, and the papal tiara. */
function hat(kind) {
  if (kind === 'tiara') return `<path d="M90 64 Q88 32 100 26 Q112 32 110 64 Z" fill="#f4f1ea" stroke="#999"/>${[38, 48, 58].map((y) => `<rect x="${y === 38 ? 93 : 90}" y="${y}" width="${y === 38 ? 14 : 20}" height="4" fill="${GOLD}"/>`).join('')}<text x="100" y="26" font-size="8" text-anchor="middle" fill="${GOLD}">✠</text>`;
  const colour = { priest: '#1d1d1d', bishop: '#1f6b3a', cardinal: '#b3121f' }[kind];
  const rows = { priest: 1, bishop: 3, cardinal: 5 }[kind];
  let t = '';
  for (let r = 0; r < rows; r++) for (let i = 0; i <= r; i++) for (const side of [-1, 1]) t += `<circle cx="${100 + side * (40 + (r - i) * 7 + i * 7 - r * 3)}" cy="${70 + r * 9}" r="3" fill="${colour}"/>`;
  return `<path d="M100 44 L${100 - 40} 70 M100 44 L${100 + 40} 70" stroke="${colour}" stroke-width="1.2"/><ellipse cx="100" cy="46" rx="26" ry="5" fill="${colour}"/><path d="M88 46 Q88 30 100 30 Q112 30 112 46 Z" fill="${colour}"/>${t}`;
}

function behind(kind) {
  switch (kind) {
    case 'swords': return `<g stroke="${STEEL}" stroke-width="4" stroke-linecap="round"><path d="M50 58 L150 164"/><path d="M150 58 L50 164"/></g><g stroke="${GOLD}" stroke-width="5"><path d="M48 150 L60 162"/><path d="M152 150 L140 162"/></g>`;
    case 'batons': return `<g stroke="#a3122a" stroke-width="7" stroke-linecap="round"><path d="M52 60 L148 162"/><path d="M148 60 L52 162"/></g><g fill="${GOLD}"><circle cx="52" cy="60" r="4"/><circle cx="148" cy="60" r="4"/><circle cx="52" cy="162" r="4"/><circle cx="148" cy="162" r="4"/></g>`;
    case 'anchors': return `<text x="62" y="160" font-size="30" text-anchor="middle" fill="${GOLD}" transform="rotate(-30 62 140)">⚓︎</text><text x="138" y="160" font-size="30" text-anchor="middle" fill="${GOLD}" transform="rotate(30 138 140)">⚓︎</text>`;
    case 'wings': return `<path d="M66 82 C40 70 26 86 22 104 C36 96 48 98 64 100 Z" fill="${STEEL}"/><path d="M134 82 C160 70 174 86 178 104 C164 96 152 98 136 100 Z" fill="${STEEL}"/>`;
    default: return '';
  }
}
const SUPPORTER_EMOJI = { lions: '🦁', horses: '🐎', griffins: '🦅', stags: '🦌', 'sea-horses': '🐉' };
const supporters = (kind) => (kind ? `<text x="40" y="128" font-size="38" text-anchor="middle">${SUPPORTER_EMOJI[kind] ?? '🦁'}</text><text x="-160" y="128" font-size="38" text-anchor="middle" transform="scale(-1 1)">${SUPPORTER_EMOJI[kind] ?? '🦁'}</text>` : '');

function circlet(c, id) {
  if (!c) return '';
  const path = 'M58 112 V66 H142 V112 Q142 146 100 160 Q58 146 58 112 Z';
  // The motto runs right round the circlet, starting at the foot.
  return `<path d="${path}" fill="none" stroke="${c.colour}" stroke-width="10"/><path id="circ${id}" d="M100 162 Q56 148 56 112 V64 H144 V112 Q144 148 100 162" fill="none"/><text font-size="6" font-weight="700" fill="${GOLD}" letter-spacing=".8" dominant-baseline="central"><textPath href="#circ${id}" startOffset="50%" text-anchor="middle">${esc(c.motto)}</textPath></text>`;
}
const badges = (list) => list.map((b, i) => {
  const x = 100 + (i - (list.length - 1) / 2) * 22;
  if (b.viceRegal) return `<rect x="${x - 3}" y="156" width="6" height="7" fill="${b.colour}"/><circle cx="${x}" cy="169" r="7" fill="#1f2b6f" stroke="${GOLD}"/><text x="${x}" y="167" font-size="5" text-anchor="middle" fill="${GOLD}">♛</text><text x="${x}" y="173" font-size="5" text-anchor="middle" fill="${GOLD}">🦁</text>`;
  return `<rect x="${x - 3}" y="156" width="6" height="9" fill="${b.colour}"/><text x="${x}" y="173" font-size="${b.valour ? 12 : 11}" text-anchor="middle" fill="${b.valour ? '#b87333' : GOLD}" stroke="#5a3d0c" stroke-width=".4">${b.valour ? '✠' : '✦'}︎</text>`;
}).join('');
const motto = (text, id) => `<path d="M40 192 Q48 184 56 190 L144 190 Q152 184 160 192 Q152 206 144 202 L56 202 Q48 206 40 192 Z" fill="#f4ecd6" stroke="#8a7a5a"/><path id="motto${id}" d="M50 199 H150" fill="none"/><text font-size="8" font-style="italic" font-family="Georgia, serif" fill="#3a2e1a"><textPath href="#motto${id}" startOffset="50%" text-anchor="middle">${esc(text)}</textPath></text>`;

/** A kamon: the family crest in a ring (the imperial chrysanthemum for the imperial house). */
export function monSvg(a, { size = 140, title = 'Kamon' } = {}) {
  const glyph = a.imperial ? '✿' : CHARGES[a.charge][0];
  const petals = a.imperial ? Array.from({ length: 16 }, (_, i) => `<ellipse cx="100" cy="62" rx="7" ry="30" fill="${GOLD}" stroke="#7a5a10" stroke-width=".8" transform="rotate(${i * 22.5} 100 100)"/>`).join('') + `<circle cx="100" cy="100" r="14" fill="${GOLD}" stroke="#7a5a10"/>` : '';
  const body = a.imperial ? petals : `<circle cx="100" cy="100" r="62" fill="#f4f1ea"/><circle cx="100" cy="100" r="62" fill="none" stroke="#1d1d1d" stroke-width="9"/><text x="100" y="104" font-size="64" text-anchor="middle" dominant-baseline="central" fill="#1d1d1d">${glyph}\uFE0E</text>`;
  return `<svg class="arms-svg" viewBox="30 30 140 140" width="${size}" height="${size}" role="img" aria-label="${esc(title)}">${body}</svg>`;
}

/** The whole achievement. size: the drawn width in px. */
export function armsSvg(a, { size = 180, title = 'Coat of arms' } = {}) {
  if (a.mon) return monSvg(a, { size: Math.round(size * 0.8), title });
  const id = ++uid;
  // With a circlet round the shield, the coronet and helm sit higher, above it.
  const lift = a.circlet ? 10 : 0;
  const top = a.hat ? hat(a.hat) : a.coronet && a.helm ? helm(a.helm, a, -14 - lift) + coronet(a.coronet, 58 - lift, a.continental) : a.coronet ? coronet(a.coronet, 58 - lift, a.continental) : helm(a.helm, a, -lift);
  const defs = `<defs><clipPath id="shield${id}"><path d="${SHIELD}"/></clipPath>${a.division !== 'plain' ? `<clipPath id="second${id}"><path d="${SECOND[a.division]}"/></clipPath><mask id="first${id}"><rect x="0" y="0" width="200" height="220" fill="#fff"/><path d="${SECOND[a.division]}" fill="#000"/></mask>` : ''}</defs>`;
  // The keys of Peter, gold and silver, crossed behind the shield.
  const key = (colour, flip) => `<g transform="${flip ? 'translate(200 0) scale(-1 1)' : ''}" stroke="${colour}" fill="none" stroke-width="4" stroke-linecap="round"><path d="M56 168 L146 60"/><circle cx="50" cy="175" r="8"/><path d="M140 67 L148 74 M133 75 L141 82"/></g>`;
  const keys = a.hat === 'tiara' ? key(GOLD, false) + key('#c9ced6', true) : '';
  return `<svg class="arms-svg" viewBox="0 8 200 204" width="${size}" height="${Math.round((size * 204) / 200)}" role="img" aria-label="${esc(title)}">${defs}
    ${behind(a.behind)}${keys}${supporters(a.supporters)}
    <g clip-path="url(#shield${id})">${shieldBody(a, id)}</g><path d="${SHIELD}" fill="none" stroke="#3a3a3a" stroke-width="1.4"/>
    ${circlet(a.circlet, id)}${top}${badges(a.badges ?? [])}${motto(a.motto, id)}</svg>`;
}
