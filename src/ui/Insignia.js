/**
 * Rank insignia, drawn as small SVGs: what a uniform actually shows.
 *
 *   US military   enlisted chevrons and rockers (a diamond or star at the top), warrant bars, gold
 *                 and silver bars, oak leaves, the eagle, and one to five stars
 *   Commonwealth  officers' pips (Bath stars) and crowns; generals' crossed sword and baton;
 *                 other ranks' chevrons
 *   Police        US: chevrons for corporals and sergeants, bars, oak leaves and stars for command;
 *                 UK: chevrons, pips and crowns, crossed tipstaves for chief officers
 *   Fire          bugles: one for a lieutenant, two for a captain, two crossed for a battalion chief,
 *                 more for the chiefs
 */
import { localAgency } from '../modules/world/LocalAgencies.js';
import { eraYear, PRESENT, getEraState } from '../modules/world/Eras.js';
import { colonialRuler } from '../modules/world/ColonialForces.js';
import { PACKS } from '../modules/world/packs/index.js';
import { branchOf } from '../modules/military/MilitaryEngine.js';
const GOLD = '#d4a017';
const SILVER = '#c9ced6';
const svg = (w, body, h = 34) => `<svg class="insignia-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;

/* --- primitives ---------------------------------------------------- */
const chevrons = (n, rockers = 0, center = '', color = GOLD) => {
  let body = '';
  for (let i = 0; i < n; i++) body += `<path d="M4 ${10 + i * 5} L17 ${2 + i * 5} L30 ${10 + i * 5}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>`;
  for (let i = 0; i < rockers; i++) body += `<path d="M4 ${22 + i * 4} Q17 ${30 + i * 4} 30 ${22 + i * 4}" fill="none" stroke="${color}" stroke-width="3"/>`;
  if (center === 'star') body += `<text x="17" y="${12 + n * 5}" font-size="9" text-anchor="middle" fill="${color}">★</text>`;
  if (center === 'diamond') body += `<rect x="14" y="${8 + n * 5}" width="6" height="6" transform="rotate(45 17 ${11 + n * 5})" fill="${color}"/>`;
  return svg(34, body, 40);
};
const bars = (n, color) => svg(14 + n * 8, Array.from({ length: n }, (_, i) => `<rect x="${6 + i * 8}" y="5" width="5" height="24" rx="1" fill="${color}"/>`).join(''));
const warrant = (n) => svg(34, `<rect x="5" y="11" width="24" height="12" rx="2" fill="${SILVER}"/>${Array.from({ length: n }, (_, i) => `<rect x="${8 + i * 6}" y="14" width="4" height="6" fill="#1d2b4f"/>`).join('')}`);
const leaf = (color) => svg(30, `<path d="M15 3 C26 9 26 22 15 31 C4 22 4 9 15 3 Z" fill="${color}"/><path d="M15 6 V29" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/>`);
const eagle = () => svg(36, `<text x="18" y="25" font-size="22" text-anchor="middle" fill="${SILVER}">🦅</text>`);
const stars = (n, color = SILVER) => svg(Math.max(16, n * 13 + 4), Array.from({ length: n }, (_, i) => `<text x="${9 + i * 13}" y="23" font-size="15" text-anchor="middle" fill="${color}">★</text>`).join(''));
const pips = (n, crown = false, color = GOLD, emblem = '♛', pip = '✦') => svg(10 + (n + (crown ? 1 : 0)) * 12, `${crown ? `<text x="11" y="23" font-size="15" text-anchor="middle" fill="${color}">${emblem}</text>` : ''}${Array.from({ length: n }, (_, i) => `<text x="${(crown ? 23 : 11) + i * 12}" y="23" font-size="13" text-anchor="middle" fill="${color}">${pip}</text>`).join('')}`);
const swordBaton = (extra = '') => svg(38, `<path d="M8 28 L30 6 M30 28 L8 6" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>${extra}`);
/** A fire service bugle (speaking trumpet): mouthpiece, tube and bell. */
const bugle = (x, y, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M-11 -1.5 L5 -2.5 L11 -7 L11 7 L5 2.5 L-11 1.5 Z" fill="${GOLD}"/><rect x="-13" y="-2.5" width="3" height="5" rx="1" fill="${GOLD}"/></g>`;
const bugles = (n, crossed = false) => {
  if (!crossed) return svg(n * 11 + 10, Array.from({ length: n }, (_, i) => bugle(10 + i * 11, 17, -90)).join(''));
  const extra = Math.max(0, n - 2);
  return svg(34 + extra * 10, `${bugle(17, 17, -45)}${bugle(17, 17, 45)}${Array.from({ length: extra }, (_, i) => bugle(36 + i * 10, 17, -90)).join('')}`);
};

/* --- national patterns ---------------------------------------------- */
/** German police: blue stars for the Meister ranks, silver for Kommissare, gold for the Räte. */
const BLUE = '#5b8def';
const deStars = (n, color) => svg(n * 11 + 8, Array.from({ length: n }, (_, i) => `<text x="${9 + i * 11}" y="22" font-size="13" text-anchor="middle" fill="${color}">✶</text>`).join(''));
/**
 * A shoulder board on the Russian/Soviet pattern (also China, Vietnam, the former USSR):
 * cross stripes for sergeants, a lengthwise stripe for a sergeant-major, one or two
 * lengthwise gaps for junior and senior officers, a zigzag for generals; then stars.
 */
const board = ({ cross = 0, wide = false, wideCross = false, vstars = 0, gaps = 0, small = 0, big = 0, zigzag = false, huge = false, chev = 0 }, color = '#3d4f6e') => {
  let b = `<rect x="6" y="2" width="20" height="36" rx="4" fill="${color}" stroke="${GOLD}" stroke-width="1"/>`;
  for (let i = 0; i < cross; i++) b += `<rect x="7" y="${28 - i * 5}" width="18" height="3" fill="${GOLD}"/>`;
  if (wide) b += `<rect x="13" y="4" width="6" height="32" fill="${GOLD}"/>`;
  if (wideCross) b += `<rect x="7" y="24" width="18" height="7" fill="${GOLD}"/>`;
  for (let i = 0; i < vstars; i++) b += `<text x="16" y="${33 - i * 9}" font-size="8" text-anchor="middle" fill="${GOLD}">★</text>`;
  for (let i = 0; i < chev; i++) b += `<path d="M8 ${30 - i * 5} L16 ${25 - i * 5} L24 ${30 - i * 5}" stroke="${GOLD}" stroke-width="2.2" fill="none"/>`;
  if (gaps === 1) b += `<rect x="15" y="3" width="2" height="34" fill="${GOLD}"/>`;
  if (gaps === 2) b += `<rect x="11" y="3" width="2" height="34" fill="${GOLD}"/><rect x="19" y="3" width="2" height="34" fill="${GOLD}"/>`;
  if (zigzag) b += `<path d="M8 6 L12 10 L8 14 L12 18 L8 22 L12 26 L8 30 M24 6 L20 10 L24 14 L20 18 L24 22 L20 26 L24 30" stroke="${GOLD}" stroke-width="1.2" fill="none"/>`;
  const sp = [[16, 30], [10, 22], [22, 22], [16, 14]];
  for (let i = 0; i < small; i++) b += `<text x="${sp[i][0]}" y="${sp[i][1]}" font-size="7" text-anchor="middle" fill="${GOLD}">★</text>`;
  if (huge) b += `<text x="16" y="26" font-size="17" text-anchor="middle" fill="${GOLD}">★</text>`;
  const bp = [[16, 32], [16, 22], [16, 12]];
  for (let i = 0; i < big; i++) b += `<text x="${bp[i][0]}" y="${bp[i][1]}" font-size="11" text-anchor="middle" fill="${GOLD}">★</text>`;
  return svg(32, b, 40);
};
/** Korean police: mugunghwa (rose of Sharon) leaves and flowers; Japanese police: a rank plate with bars and stars. */
const flowers = (n, leaf = false, color = SILVER) => svg(n * 12 + 8, Array.from({ length: n }, (_, i) => `<text x="${10 + i * 12}" y="23" font-size="${leaf ? 11 : 14}" text-anchor="middle" fill="${color}">${leaf ? '❦' : '✿'}</text>`).join(''));
const plate = (bars, stars, color = GOLD) => svg(40, `<rect x="2" y="6" width="36" height="22" rx="3" fill="#1d2b4f" stroke="${color}"/>${Array.from({ length: bars }, (_, i) => `<rect x="5" y="${9 + i * 4}" width="30" height="2" fill="${color}"/>`).join('')}${Array.from({ length: stars }, (_, i) => `<text x="${12 + i * 8}" y="25" font-size="7" text-anchor="middle" fill="${color}">★</text>`).join('')}`);

/** Private companies' slide-on epaulettes: plain for officers, then one to four bars. */
export const epaulette = (bars, color = SILVER) => svg(26, `<rect x="5" y="2" width="16" height="32" rx="3" fill="#20242c" stroke="#888"/><circle cx="13" cy="7" r="2" fill="${color}"/>${Array.from({ length: bars }, (_, i) => `<rect x="7" y="${28 - i * 5}" width="12" height="3" fill="${color}"/>`).join('')}`, 36);

/** Vice-regal and royal badges: a crown, alone (the sovereign) or over a lion (the Crown's representative). */
export const crownBadge = (kind = 'sovereign') => svg(34, kind === 'viceRegal'
  ? `<circle cx="17" cy="19" r="13" fill="#1d2b6f" stroke="${GOLD}"/><text x="17" y="15" font-size="10" text-anchor="middle" fill="${GOLD}">♛</text><text x="17" y="28" font-size="10" text-anchor="middle" fill="${GOLD}">🦁</text>`
  : kind === 'heir' ? `<text x="17" y="24" font-size="18" text-anchor="middle" fill="${SILVER}">⚜</text>` : kind === 'royal' ? `<text x="17" y="24" font-size="16" text-anchor="middle" fill="${SILVER}">♛</text>` : `<text x="17" y="25" font-size="22" text-anchor="middle" fill="${GOLD}">♛</text>`, 36);

/* --- military ------------------------------------------------------- */
/** Russian/Soviet-pattern shoulder boards. */
const SHOULDER = ['RU', 'BY', 'UA', 'KZ', 'UZ', 'AZ', 'AM', 'KG', 'TJ', 'MN', 'VN', 'KP', 'LA'];
const HISPANIC = ['ES', 'MX', 'AR', 'CO', 'PE', 'CL', 'VE', 'EC', 'BO', 'UY', 'PY', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'DO', 'CU'];
const six = (n, color = GOLD) => svg(n * 12 + 8, Array.from({ length: n }, (_, i) => `<text x="${10 + i * 12}" y="23" font-size="14" text-anchor="middle" fill="${color}">✶</text>`).join(''));
const eight = (n, color = GOLD) => svg(n * 13 + 8, Array.from({ length: n }, (_, i) => `<text x="${10 + i * 13}" y="23" font-size="16" text-anchor="middle" fill="${color}">✷</text>`).join(''));
const diamonds = (n, color = SILVER) => svg(n * 12 + 8, Array.from({ length: n }, (_, i) => `<text x="${10 + i * 12}" y="23" font-size="13" text-anchor="middle" fill="${color}">◆</text>`).join(''));
const slashes = (n, color = '#c0392b') => svg(n * 7 + 14, Array.from({ length: n }, (_, i) => `<rect x="${7 + i * 7}" y="7" width="4" height="20" transform="rotate(20 ${9 + i * 7} 17)" fill="${color}"/>`).join(''));
/**
 * National military patterns built from the shared pieces. Each takes ('E'|'W'|'O', grade) and returns
 * the badge ('' for none); undefined falls back to the US / Commonwealth / Soviet patterns.
 */
const MIL_STYLES = {
  // People's Liberation Army: chevrons for enlisted on a green board, a stripe and stars for company
  // officers, two stripes for field officers, a gold board with stars for generals.
  CN: (k, n) => {
    const g = '#3f5b2c';
    if (k !== 'O') return board(n <= 2 ? { chev: n } : n <= 4 ? { chev: 2, cross: n - 2 } : { chev: 3, cross: Math.min(3, n - 4) }, g);
    return board([{ gaps: 1, vstars: 1 }, { gaps: 1, vstars: 2 }, { gaps: 1, vstars: 3 }, { gaps: 2, vstars: 1 }, { gaps: 2, vstars: 2 }, { gaps: 2, vstars: 3 }, { gaps: 2, small: 4 }, { zigzag: true, vstars: 1 }, { zigzag: true, vstars: 2 }, { zigzag: true, vstars: 3 }, { zigzag: true, huge: true }][Math.min(10, n - 1)], g);
  },
  // India: Commonwealth pips (five-pointed stars) with the Ashoka lion emblem in place of the crown.
  IN: (k, n) => {
    if (eraYear() < 1950) return undefined;
    const lion = '☸';
    // Sepoy plain; Lance Naik, Naik, Havildar chevrons; the junior commissioned officers stars, then the emblem.
    if (k !== 'O') return ['', chevrons(1), chevrons(2), chevrons(3), pips(1, false, GOLD, lion, '★'), pips(2, false, GOLD, lion, '★'), pips(0, true, GOLD, lion), pips(2, false, GOLD, lion, '★'), pips(3, false, GOLD, lion, '★')][Math.min(8, n - 1)];
    // Lieutenant two stars, captain three, major the national emblem, then emblem and stars to brigadier.
    if (n >= 7) return swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${GOLD}">${['★', '☸', '☸★', '☸'][Math.min(3, n - 7)]}</text>`);
    return [pips(2, false, GOLD, lion, '★'), pips(3, false, GOLD, lion, '★'), pips(0, true, GOLD, lion), pips(1, true, GOLD, lion, '★'), pips(2, true, GOLD, lion, '★'), pips(3, true, GOLD, lion, '★')][n - 1];
  },
  // Spain and Spanish America: six-pointed stars for lieutenants and captains, eight-pointed for field
  // officers, crossed sword and baton for generals; red slashes for corporals, gold for sergeants.
  ...Object.fromEntries(HISPANIC.map((cc) => [cc, (k, n) => {
    if (k === 'E') return n <= 1 ? '' : n <= 3 ? slashes(n - 1) : n <= 6 ? slashes(n - 3, GOLD) : chevrons(3, n - 6);
    if (k === 'W') return six(1, SILVER);
    if (n >= 7) return swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${GOLD}">${'✷'.repeat(Math.min(4, n - 6))}</text>`);
    return [six(1), six(2), six(3), eight(1), eight(2), eight(3)][n - 1];
  }])),
  // Israel: chevrons for enlisted; officers' bars, then fallafel leaves; generals a sword, olive and leaves.
  IL: (k, n) => {
    if (k === 'E') return n <= 1 ? '' : chevrons(Math.min(3, n - 1), Math.max(0, n - 4));
    if (k === 'W') return bars(1, SILVER);
    if (n <= 3) return bars(n, '#b08d57');
    if (n <= 6) return svg(n * 9, Array.from({ length: n - 3 }, (_, i) => `<path d="M${10 + i * 12} 4 C${18 + i * 12} 10 ${18 + i * 12} 22 ${10 + i * 12} 30 C${2 + i * 12} 22 ${2 + i * 12} 10 ${10 + i * 12} 4 Z" fill="#b08d57"/>`).join(''));
    return swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${GOLD}">${'❦'.repeat(Math.min(3, n - 6))}</text>`);
  },
  // South Korea: bars for private to sergeant, diamonds for company officers, mugunghwa for field
  // officers, stars for generals.
  KR: (k, n) => {
    if (k === 'E') return n <= 4 ? svg(n * 7 + 12, Array.from({ length: n }, (_, i) => `<rect x="${6 + i * 7}" y="6" width="4" height="22" fill="${SILVER}"/>`).join('')) : chevrons(Math.min(3, n - 4), Math.max(0, n - 7), '', SILVER);
    if (k === 'W') return diamonds(1, GOLD);
    if (n <= 3) return diamonds(n);
    if (n <= 6) return flowers(n - 3);
    return stars(Math.min(4, n - 6), GOLD);
  },
  // Japan Self-Defense Forces: gold plates — one bar and stars for company officers, two for field,
  // none for generals; enlisted chevron-plates.
  JP: (k, n) => {
    if (k === 'E') return n <= 1 ? plate(0, 0, SILVER) : plate(Math.min(3, n - 1), Math.max(0, n - 4), SILVER);
    if (k === 'W') return plate(1, 0);
    if (n <= 3) return plate(1, n);
    if (n <= 7) return plate(2, Math.min(3, n - 3));
    return plate(0, Math.min(4, n - 6));
  },
  // The Bundeswehr: pips for lieutenants and captains, an oak wreath for field officers, gold oak and
  // pips for generals; enlisted slants and chevrons.
  DE: (k, n) => {
    if (k === 'E') return n <= 1 ? '' : n <= 3 ? slashes(n - 1, SILVER) : chevrons(Math.min(3, n - 3), Math.max(0, n - 6), '', SILVER);
    if (k === 'W') return deStars(1, SILVER);
    const wreath = (body, color) => svg(48, `<path d="M6 30 Q24 38 42 30" stroke="${color}" stroke-width="3" fill="none"/>${body}`);
    if (n <= 3) return deStars(n, SILVER);
    if (n <= 6) return wreath(Array.from({ length: n - 3 }, (_, i) => `<text x="${14 + i * 10}" y="22" font-size="12" text-anchor="middle" fill="${SILVER}">✶</text>`).join(''), SILVER);
    return wreath(Array.from({ length: Math.min(4, n - 6) }, (_, i) => `<text x="${12 + i * 9}" y="22" font-size="11" text-anchor="middle" fill="${GOLD}">✶</text>`).join(''), GOLD);
  },
};
const COMMONWEALTH = ['GB', 'AU', 'NZ', 'CA', 'IN', 'PK', 'ZA', 'IE', 'SG', 'MY', 'NG', 'KE', 'GH', 'MT', 'GM', 'MW', 'BN', 'JM', 'BS', 'LK', 'BD', 'PG', 'SB', 'VU', 'TO', 'NP', 'BT', 'ET', 'SO', 'SS'];
/**
 * Commonwealth pips and crowns: monarchies keep the crown; republics wear their own emblem in its
 * place (Pakistan's crescent, Bangladesh's water lily, Malta's cross, Nigeria's eagle).
 */
const CW_EMBLEM = { PK: '☪', ZA: '✵', IE: '✦', SG: '✶', NG: '🦅', KE: '⚔', GH: '★', MT: '✠', GM: '✵', MW: '☀', LK: '❂', BD: '✿', VU: '✵', NP: '⚔', BT: '☸', ET: '✵', SO: '★', SS: '✵' };
/** The year each became a republic (or took its own emblem): before it, the King's crown. */
const CW_REPUBLIC = { PK: 1956, ZA: 1961, IE: 1922, SG: 1965, NG: 1963, KE: 1964, GH: 1960, MT: 1974, GM: 1970, MW: 1966, LK: 1972, BD: 1971, VU: 1980, SS: 2011 };
const cwEmblem = (cc) => (CW_REPUBLIC[cc] && eraYear() < CW_REPUBLIC[cc] ? '♛' : CW_EMBLEM[cc] ?? '♛');

/* --- national families ------------------------------------------------ */
/*
 * Most of the world's armies wear one of a few families of rank, each with national touches.
 *   french      galons: stripes for officers (a lieutenant-colonel's alternate silver), stars for
 *               generals; red chevrons for corporals, gold slants for sergeants (France, francophone
 *               Africa, Haiti, Romania, Switzerland; the Portuguese galões are the same idea)
 *   italian     stellette for company officers, a gold frame for field officers, the greca for generals
 *   arab        stars, then the national emblem (Egypt's eagle, the Saudi swords, Jordan's crown,
 *               Lebanon's cedar), then crossed sword and scimitar for generals
 *   stars       a country's stars for company officers; for field officers the stars sit on a bar,
 *               two bars, a laurel, inside a frame or under an emblem; generals wear the country's
 *               own mark (crossed sword and baton, an emblem, a laurel, the Polish zigzag)
 *   own glyphs  Indonesia's bars, melati and stars; Taiwan's plum blossoms; the Philippines'
 *               triangles, suns and stars
 */
const RED_CHEVRON = '#c0392b';
const row = (n, glyph, color, { y = 21, size = 13, step = 12, x0 = 0, w = 0 } = {}) => {
  const start = x0 || (w ? w / 2 - ((n - 1) * step) / 2 : 10);
  return Array.from({ length: n }, (_, i) => `<text x="${start + i * step}" y="${y}" font-size="${size}" text-anchor="middle" fill="${color}">${glyph}</text>`).join('');
};
/** Stars (or blossoms, roses…) with an optional field-officer mark beneath or around them. */
function starsWith(n, glyph, color, mark = null, emblem = '') {
  const w = Math.max(30, n * 12 + 12);
  let b = '';
  if (mark === 'frame') b += `<rect x="2" y="4" width="${w - 4}" height="26" rx="3" fill="none" stroke="${color}" stroke-width="2"/>`;
  if (emblem) b += `<text x="${w / 2}" y="13" font-size="10" text-anchor="middle" fill="${color}">${emblem}</text>`;
  b += row(n, glyph, color, { y: emblem ? 27 : mark && mark !== 'frame' ? 18 : 22, size: emblem ? 10 : 13, step: emblem ? 10 : 12, w });
  if (mark === 'bar') b += `<rect x="5" y="25" width="${w - 10}" height="3.5" rx="1" fill="${color}"/>`;
  if (mark === 'bars2') b += `<rect x="5" y="24" width="${w - 10}" height="2.6" rx="1" fill="${color}"/><rect x="5" y="29" width="${w - 10}" height="2.6" rx="1" fill="${color}"/>`;
  if (mark === 'wreath') b += `<path d="M4 25 Q${w / 2} 36 ${w - 4} 25" stroke="${color}" stroke-width="3" fill="none"/>`;
  if (mark === 'zigzag') b += `<path d="${Array.from({ length: Math.floor((w - 8) / 4) + 1 }, (_, i) => `${i ? 'L' : 'M'}${4 + i * 4} ${i % 2 ? 25 : 30}`).join(' ')}" stroke="${color}" stroke-width="1.8" fill="none"/>`;
  return svg(w, b);
}
const galonsN = (n, { mixed = false, color = GOLD, thick = false } = {}) => svg(34, Array.from({ length: n }, (_, i) => `<rect x="5" y="${30 - i * 5}" width="24" height="${thick ? 4 : 3}" rx="1" fill="${mixed && i % 2 ? SILVER : color}"/>`).join(''));
const triangles = (n, color = GOLD) => svg(n * 12 + 8, row(n, '▲', color, { size: 12 }));
const suns = (n, color = GOLD) => svg(n * 13 + 8, row(n, '☀', color, { size: 14, step: 13 }));

/** French galons (and the Portuguese galões). */
const frenchStyle = (k, n) => {
  if (k === 'E') return n <= 1 ? '' : n <= 4 ? chevrons(n - 1, 0, '', RED_CHEVRON) : n <= 6 ? slashes(n - 3, GOLD) : n === 7 ? galonsN(1, { color: SILVER }) : galonsN(1, { thick: n >= 9 });
  if (k === 'W') return galonsN(1, { color: SILVER });
  if (n <= 4) return galonsN(n);
  if (n === 5) return galonsN(5, { mixed: true });
  if (n === 6) return galonsN(5);
  return stars(Math.min(5, n - 5), SILVER);
};
/** Italy: stellette, a gold frame (the binario) for field officers, the greca for generals. */
const italianStyle = (k, n) => {
  if (k === 'E') return n <= 1 ? '' : chevrons(Math.min(3, n - 1), Math.max(0, n - 4), '', n >= 5 ? GOLD : RED_CHEVRON);
  if (k === 'W') return starsWith(1, '★', SILVER, 'bar');
  if (n <= 3) return starsWith(n, '★', SILVER);
  if (n <= 6) return starsWith(n - 3, '★', SILVER, 'frame');
  return starsWith(Math.min(4, n - 6), '★', SILVER, 'zigzag');
};
/** The Arab pattern: stars, the national emblem, crossed sword and scimitar for generals. */
const arabStyle = (emblem) => (k, n) => {
  if (k === 'E') return n <= 1 ? '' : n <= 4 ? chevrons(n - 1) : n <= 7 ? chevrons(3, n - 4) : pips(0, true, GOLD, emblem);
  if (k === 'W') return pips(1, true, SILVER, emblem, '★');
  if (n <= 3) return pips(n, false, GOLD, emblem, '★');
  if (n <= 7) return pips(n - 4, true, GOLD, emblem, '★');
  if (n >= 11) return swordBaton(`<circle cx="19" cy="17" r="13" fill="none" stroke="#5fa35a" stroke-width="2"/><text x="19" y="12" font-size="8" text-anchor="middle" fill="${GOLD}">${emblem}</text>`);
  return swordBaton(`<text x="19" y="33" font-size="8" text-anchor="middle" fill="${GOLD}">${emblem}${'★'.repeat(n - 8)}</text>`);
};
/**
 * Stars and bars: company officers' stars; field officers' stars over a mark; generals' own mark.
 * gen: 'swordBaton' | 'zigzag' | 'wreath' | 'emblem'; field: 'bar' | 'bars2' | 'wreath' | 'frame' | 'emblem'.
 */
const starsStyle = ({ glyph = '★', field = 'bar', gen = 'swordBaton', emblem = '', color = GOLD, enlisted = GOLD } = {}) => (k, n) => {
  if (k === 'E') return n <= 1 ? '' : chevrons(Math.min(3, n - 1), Math.max(0, n - 4), '', enlisted);
  if (k === 'W') return starsWith(1, glyph, SILVER, 'bar');
  if (n <= 3) return starsWith(n, glyph, color);
  if (n <= 6) return field === 'emblem' ? starsWith(n - 3, glyph, color, null, emblem) : starsWith(n - 3, glyph, color, field);
  const m = Math.min(4, n - 6);
  if (gen === 'swordBaton') return swordBaton(`<text x="19" y="33" font-size="8" text-anchor="middle" fill="${color}">${emblem}${glyph.repeat(m)}</text>`);
  if (gen === 'emblem') return starsWith(m, glyph, color, null, emblem || '♛');
  return starsWith(m, glyph, color, gen);
};
/** Indonesia: gold bars, then melati (jasmine), then stars. */
const idStyle = (k, n) => {
  if (k === 'E') return n <= 1 ? '' : chevrons(Math.min(3, n - 1), Math.max(0, n - 4), '', n >= 5 ? GOLD : RED_CHEVRON);
  if (k === 'W') return bars(1, SILVER);
  if (n <= 3) return bars(n, GOLD);
  if (n <= 6) return svg((n - 3) * 13 + 8, row(n - 3, '✿', GOLD, { size: 14, step: 13 }));
  return stars(Math.min(4, n - 6), GOLD);
};
/** Taiwan (ROC): plum blossoms; field officers' on a bar; generals stars. */
const twStyle = (k, n) => {
  if (k === 'E') return n <= 1 ? '' : chevrons(Math.min(3, n - 1), Math.max(0, n - 4), '', GOLD);
  if (k === 'W') return starsWith(1, '❀', SILVER, 'bar');
  if (n <= 3) return starsWith(n, '❀', GOLD);
  if (n <= 6) return starsWith(n - 3, '❀', GOLD, 'bar');
  return stars(Math.min(4, n - 6), GOLD);
};
/** The Philippines: triangles, suns, stars. */
const phStyle = (k, n) => {
  if (k === 'E') return n <= 1 ? '' : chevrons(Math.min(3, n - 1), Math.max(0, n - 4), n >= 8 ? 'star' : '', GOLD);
  if (k === 'W') return triangles(1, SILVER);
  if (n <= 3) return triangles(n);
  if (n <= 6) return suns(n - 3);
  return stars(Math.min(4, n - 6), GOLD);
};
const FAMILY = {
  ...Object.fromEntries(['FR', 'CD', 'CF', 'CI', 'DJ', 'ML', 'NE', 'SN', 'TD', 'HT', 'RO', 'CH', 'PT', 'GW', 'MZ'].map((cc) => [cc, frenchStyle])),
  IT: italianStyle,
  ...Object.fromEntries(Object.entries({ EG: '🦅', SA: '⚔', AE: '🦅', IQ: '🦅', SY: '🦅', JO: '♛', KW: '🦅', QA: '⚔', BH: '♛', OM: '⚔', YE: '🦅', LY: '☪', SD: '🦅', PS: '🦅', LB: '🌲', MA: '♛', AF: '✵', IR: '☫' }).map(([cc, e]) => [cc, arabStyle(e)])),
  NL: starsStyle({ glyph: '✶', field: 'bar', gen: 'swordBaton' }),
  BE: starsStyle({ glyph: '✶', field: 'bar', gen: 'emblem', emblem: '♛' }),
  LU: starsStyle({ glyph: '✶', field: 'bar', gen: 'emblem', emblem: '♛' }),
  NO: starsStyle({ glyph: '✦', field: 'bar', gen: 'wreath', color: SILVER }),
  SE: starsStyle({ glyph: '✦', field: 'bar', gen: 'emblem', emblem: '♛♛♛' }),
  DK: starsStyle({ glyph: '✶', field: 'bar', gen: 'wreath', color: SILVER }),
  FI: starsStyle({ glyph: '✿', field: 'bar', gen: 'emblem', emblem: '♌', enlisted: SILVER }),
  PL: starsStyle({ glyph: '★', field: 'bars2', gen: 'zigzag', color: SILVER, enlisted: SILVER }),
  EE: starsStyle({ glyph: '★', field: 'bar', gen: 'wreath' }),
  LV: starsStyle({ glyph: '★', field: 'bar', gen: 'wreath' }),
  LT: starsStyle({ glyph: '★', field: 'bar', gen: 'wreath' }),
  BA: starsStyle({ glyph: '★', field: 'bar', gen: 'wreath' }),
  XK: starsStyle({ glyph: '★', field: 'bar', gen: 'wreath' }),
  AT: starsStyle({ glyph: '✱', field: 'frame', gen: 'wreath', color: SILVER }),
  GR: starsStyle({ glyph: '★', field: 'emblem', emblem: '❂', gen: 'swordBaton' }),
  CY: starsStyle({ glyph: '★', field: 'emblem', emblem: '❂', gen: 'swordBaton' }),
  TR: starsStyle({ glyph: '★', field: 'wreath', gen: 'emblem', emblem: '☾' }),
  BR: starsStyle({ glyph: '★', field: 'emblem', emblem: '✦', gen: 'emblem' }),
  TH: starsStyle({ glyph: '★', field: 'wreath', gen: 'swordBaton', emblem: '♛' }),
  KH: starsStyle({ glyph: '★', field: 'wreath', gen: 'swordBaton' }),
  MM: starsStyle({ glyph: '★', field: 'wreath', gen: 'swordBaton' }),
  ID: idStyle,
  TW: twStyle,
  PH: phStyle,
};
Object.assign(MIL_STYLES, FAMILY);
// Israel Police wear the IDF's family of rank (bars, then leaves).
FAMILY.IL = MIL_STYLES.IL;
/** Police and other uniformed services wear their country's family too: rank keys as military grades. */
const AS_GRADE = { cpl: ['E', 4], sgt: ['E', 5], ssgt: ['E', 7], lt: ['O', 2], capt: ['O', 3], major: ['O', 4], col: ['O', 6], '1star': ['O', 7], '2star': ['O', 8], '3star': ['O', 9], '4star': ['O', 10] };
const familyDraw = (rank, cc) => (FAMILY[cc] && AS_GRADE[rank] ? FAMILY[cc](...AS_GRADE[rank]) : undefined);

/* --- naval ranks ---------------------------------------------------- */
/*
 * Navies wear rank on the sleeve (or on shoulder boards carrying the same lace):
 *   officers   gold stripes, a thin stripe between for the half-grades (Lieutenant (j.g.),
 *              Lieutenant Commander); flag officers one broad stripe and a narrow one per star.
 *              Above the lace, a device: the U.S. Navy's star, the Coast Guard's shield, NOAA's
 *              triangle, the PHS anchor-and-caduceus; Commonwealth and most other navies loop the
 *              top stripe into the executive curl.
 *   enlisted   U.S.: group-rate stripes for seamen, then the crow (eagle over red chevrons),
 *              a rocker and anchor for chiefs, stars for senior and master chiefs.
 *              Commonwealth: a fouled anchor for a leading rating, crossed anchors for petty
 *              officers, a crown over them for chiefs, then the warrant officers' crown and arms.
 */
export const NAVAL_BRANCHES = ['navy', 'coastguard', 'noaa', 'usphs'];
const NAVY = '#1d2b4f';
const RED = '#c0392b';
const AIR_BLUE = '#a9c4e8';
const DEVICE = { navy: '★', coastguard: '⛨', noaa: '▲', usphs: '⚕' };
/** Lace for officer grade n: 1 full stripe, .5 thin, 2 broad. */
const LACE = [[1], [1, 0.5], [1, 1], [1, 0.5, 1], [1, 1, 1], [1, 1, 1, 1], [2], [2, 1], [2, 1, 1], [2, 1, 1, 1], [2, 1, 1, 1, 1]];
function navalLace(n, device = '', curl = false, color = GOLD) {
  const lace = LACE[Math.max(0, Math.min(10, n - 1))];
  let y = 38;
  let body = '';
  for (const w of lace) {
    const h = w === 2 ? 6 : w === 1 ? 3.2 : 1.8;
    y -= h;
    body += `<rect x="4" y="${y}" width="30" height="${h}" rx="0.8" fill="${color}"/>`;
    y -= 2.2;
  }
  const top = y + 2.2;
  if (curl) body += `<circle cx="19" cy="${top - 4.5}" r="4" fill="none" stroke="${GOLD}" stroke-width="2"/>`;
  else if (device) body += `<text x="19" y="${top - 1.5}" font-size="9" text-anchor="middle" fill="${GOLD}">${device}</text>`;
  return svg(38, body, 40);
}
const crow = (n, { rocker = false, starsAbove = 0, color = RED } = {}) => {
  let body = `<text x="17" y="${starsAbove ? 15 : 11}" font-size="10" text-anchor="middle" fill="${SILVER}">🦅</text>`;
  if (starsAbove) body += Array.from({ length: starsAbove }, (_, i) => `<text x="${starsAbove === 1 ? 17 : 11 + i * 12}" y="6" font-size="6" text-anchor="middle" fill="${SILVER}">★</text>`).join('');
  const top = starsAbove ? 17 : 13;
  if (rocker) body += `<path d="M4 ${top + 3} Q17 ${top - 5} 30 ${top + 3}" fill="none" stroke="${color}" stroke-width="2.6"/>`;
  for (let i = 0; i < n; i++) body += `<path d="M4 ${top + 6 + i * 5} L17 ${top + 14 + i * 5} L30 ${top + 6 + i * 5}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linejoin="round"/>`;
  return svg(34, body, Math.max(34, top + 18 + n * 5));
};
const groupRate = (n) => svg(30, Array.from({ length: n }, (_, i) => `<rect x="${6 + i * 7}" y="6" width="4" height="22" transform="rotate(-30 ${8 + i * 7} 17)" fill="${SILVER}" stroke="${NAVY}" stroke-width="0.6"/>`).join(''));
const anchors = (crossed, crown = '') => svg(34, `${crown ? `<text x="17" y="10" font-size="9" text-anchor="middle" fill="${GOLD}">${crown}</text>` : ''}${crossed ? `<text x="12" y="28" font-size="15" text-anchor="middle" fill="${GOLD}" transform="rotate(-25 12 22)">⚓</text><text x="22" y="28" font-size="15" text-anchor="middle" fill="${GOLD}" transform="rotate(25 22 22)">⚓</text>` : `<text x="17" y="28" font-size="17" text-anchor="middle" fill="${GOLD}">⚓</text>`}`);

function navalInsignia(kind, n, nation, branch) {
  const commonwealth = COMMONWEALTH.includes(nation ?? '');
  if (kind === 'W') return warrant(Math.max(1, n));
  if (kind === 'O') return navalLace(n, nation ? '' : DEVICE[branch] ?? '★', Boolean(nation));
  if (nation && !commonwealth) return null;
  if (commonwealth) {
    // Able rating, leading rating, petty officer, chief, then the warrant officers.
    if (n <= 2) return '';
    return [anchors(false), anchors(true), anchors(true, '♛'), svg(30, `<circle cx="15" cy="17" r="12" fill="none" stroke="#5fa35a" stroke-width="2"/><text x="15" y="22" font-size="13" text-anchor="middle" fill="${GOLD}">♛</text>`), svg(30, `<text x="15" y="25" font-size="20" text-anchor="middle" fill="${GOLD}">⚜</text>`)][Math.min(4, n - 3)];
  }
  if (n <= 3) return groupRate(n);
  if (n <= 6) return crow(n - 3);
  // Chiefs add the rocker over three chevrons; stars for senior and master chief.
  return crow(3, { rocker: true, starsAbove: Math.min(2, n - 7) });
}

/** Insignia for a military rank code (E-5, O-6, W-3, OR-6, OF-3), on its nation's pattern; naval branches wear sleeve lace. */
export function militaryInsignia(code, nation = null, { branch = null, title = null } = {}) {
  // A colony's force wears its ruler's badges of rank (the King's African Rifles wear British pips).
  nation = (nation && colonialRuler(getEraState(), nation)) ?? nation;
  const m = /^(E|W|O|OR|OF)-(\d+)/.exec(code ?? '');
  if (!m) return '';
  const n = Number(m[2]);
  // A rank of its period (a Landsman, a Jemadar, an Airman Third Class) wears its own badge; one whose
  // title lives on in today's ladder at another grade wears the badge that title wears today.
  if (title && eraYear() < PRESENT) {
    const byTitle = periodTitleBadge(title, { prefix: m[1], n, nation, branch });
    if (byTitle !== undefined) return byTitle;
  }
  const old = periodInsignia(m[1] === 'OR' || m[1] === 'E' ? 'E' : m[1] === 'W' ? 'W' : 'O', n, nation, branch);
  if (old !== undefined) return old;
  if (nation === 'RU' && !NAVAL_BRANCHES.includes(branch) && (m[1] === 'OF' || m[1] === 'O')) {
    // Junior lieutenant one star, lieutenant two, senior lieutenant three, captain four; field officers
    // big stars on two stripes; generals on the zigzag; a general of the army one great star.
    return board([{ gaps: 1, small: 1 }, { gaps: 1, small: 2 }, { gaps: 1, small: 3 }, { gaps: 1, small: 4 }, { gaps: 2, big: 1 }, { gaps: 2, big: 2 }, { gaps: 2, big: 3 }, { zigzag: true, big: 1 }, { zigzag: true, big: 2 }, { zigzag: true, big: 3 }, { zigzag: true, huge: true }][Math.min(10, n - 1)], '#4b5a3a');
  }
  const commonwealth = COMMONWEALTH.includes(nation ?? '');
  // Commonwealth air forces: officers wear pale-blue lace on the naval pattern, without the curl.
  if (branch === 'airforce' && commonwealth && (m[1] === 'OF' || m[1] === 'O')) return navalLace(n, '', false, AIR_BLUE);
  // A health corps abroad wears its army's rank (Defence Medical Services, Sanitätsdienst).
  if (NAVAL_BRANCHES.includes(branch) && !SHOULDER.includes(nation ?? '') && !(nation && branch === 'usphs')) {
    const naval = navalInsignia(m[1] === 'OR' ? 'E' : m[1] === 'OF' ? 'O' : m[1], n, nation, branch);
    if (naval != null) return naval;
  }
  if (SHOULDER.includes(nation ?? '')) {
    const army = NAVAL_BRANCHES.includes(branch) ? NAVY : '#4b5a3a';
    // A private's board is plain; then cross stripes, then the sergeant-major's lengthwise stripe.
    // Private plain; lance-corporal one stripe; junior sergeant two; sergeant three; senior sergeant a
    // wide stripe; starshina the lengthwise stripe; warrant officers (praporshchik) stars down the middle.
    if (m[1] === 'OR' || m[1] === 'E') return board([{}, { cross: 1 }, { cross: 2 }, { cross: 3 }, { wideCross: true }, { wide: true }, { vstars: 2 }, { vstars: 3 }, { vstars: 3, wideCross: true }][Math.min(8, n - 1)], army);
    if (m[1] === 'W') return board({ small: Math.min(3, n + 1) }, army);
    // Junior lieutenant one star, lieutenant two, captain four; a major's single big star on two stripes.
    return board([{ gaps: 1, small: 1 }, { gaps: 1, small: 2 }, { gaps: 1, small: 4 }, { gaps: 2, big: 1 }, { gaps: 2, big: 2 }, { gaps: 2, big: 3 }, { zigzag: true, big: 1 }, { zigzag: true, big: 2 }, { zigzag: true, big: 3 }, { zigzag: true, huge: true }, { zigzag: true, huge: true, small: 1 }][Math.min(10, n - 1)], army);
  }
  const own = MIL_STYLES[nation ?? '']?.(m[1] === 'OR' || m[1] === 'E' ? 'E' : m[1] === 'W' ? 'W' : 'O', n);
  if (own !== undefined) return own;
  if (m[1] === 'OF' && commonwealth) {
    // Second lieutenant to brigadier: pips and crowns; generals: crossed sword and baton.
    // Major-general a pip, lieutenant-general a crown, general a crown and pip, over the crossed sword and baton.
    // OF-1 second lieutenant … OF-7 brigadier; OF-8 major-general and up.
    // A field marshal: crossed batons in a wreath under the crown.
    if (n >= 11) return swordBaton(`<circle cx="19" cy="17" r="13" fill="none" stroke="#5fa35a" stroke-width="2"/><text x="19" y="9" font-size="9" text-anchor="middle" fill="${GOLD}">♛</text>`);
    const em = cwEmblem(nation);
    if (n >= 8) return swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${GOLD}">${['✦', em, `${em}✦`][Math.min(2, n - 8)]}</text>`);
    return [pips(1), pips(1), pips(2), pips(3), pips(0, true, GOLD, em), pips(1, true, GOLD, em), pips(2, true, GOLD, em), pips(3, true, GOLD, em)][n];
  }
  // OR-/OF- codes here are the grade itself (OF-1 = second lieutenant), like E-/O-.
  const kind = m[1] === 'OR' ? 'E' : m[1] === 'OF' ? 'O' : m[1];
  const g = n;
  if (kind === 'E') {
    if (commonwealth) return cwEnlisted(g, branch, nation);
    return ['', chevrons(1), chevrons(1, 1), chevrons(2), chevrons(3), chevrons(3, 1), chevrons(3, 2), chevrons(3, 3, 'diamond'), chevrons(3, 3, 'star')][Math.max(0, g - 1)] ?? chevrons(3, 3, 'star');
  }
  if (kind === 'W') return warrant(Math.max(1, g));
  // Officers: O-1 gold bar … O-10 four stars, five stars above.
  return [bars(1, GOLD), bars(1, SILVER), bars(2, SILVER), leaf(GOLD), leaf(SILVER), eagle(), stars(1), stars(2), stars(3), stars(4), stars(5, GOLD)][Math.max(0, g - 1)] ?? stars(5, GOLD);
}

/* --- insignia of their time -------------------------------------------- */
/*
 * Before today's insignia:
 *   epaulettes     every army's officers until the mid-19th century: plain for company officers,
 *                  heavy bullion for field officers, stars on the strap for generals
 *   Britain        1855–1902: no badge for a second lieutenant, a star for a lieutenant, two for a
 *                  captain, a crown for a major (the 1880 pattern); pips and crowns as now from 1902
 *   United States  chevrons point down before 1902; a second lieutenant's plain strap before 1917
 *   Russia         the Tsar's shoulder boards (no stars for a colonel or a full general); the Red
 *                  Army's collar tabs, 1918–1943: triangles, squares, bars and diamonds
 */
const bullionEpaulette = (n) => {
  const heavy = n >= 4;
  const device = n === 2 ? `<rect x="11" y="18" width="12" height="2" fill="${SILVER}"/>` : n === 3 ? `<rect x="11" y="16.5" width="12" height="2" fill="${SILVER}"/><rect x="11" y="20.5" width="12" height="2" fill="${SILVER}"/>`
    : n === 4 ? `<text x="17" y="23" font-size="8" text-anchor="middle" fill="${SILVER}">✶</text>` : n === 5 ? `<text x="17" y="23" font-size="8" text-anchor="middle" fill="${SILVER}">♛</text>` : n === 6 ? `<text x="13" y="23" font-size="7" text-anchor="middle" fill="${SILVER}">♛</text><text x="21" y="23" font-size="7" text-anchor="middle" fill="${SILVER}">✶</text>` : '';
  const fringe = Array.from({ length: heavy ? 9 : 6 }, (_, i) => `<rect x="${(heavy ? 5 : 8) + i * (heavy ? 3 : 3.4)}" y="25" width="${heavy ? 2.2 : 1.4}" height="${heavy ? 12 : 8}" rx="1" fill="${GOLD}"/>`).join('');
  const starsOn = n >= 7 ? Array.from({ length: Math.min(3, n - 6) }, (_, i) => `<text x="${(n - 6 === 1 ? 17 : n - 6 === 2 ? 13 : 10) + i * 7}" y="19" font-size="7" text-anchor="middle" fill="${SILVER}">★</text>`).join('') : '';
  return svg(34, `<rect x="12" y="2" width="10" height="14" rx="3" fill="${GOLD}" opacity=".85"/><ellipse cx="17" cy="20" rx="13" ry="6" fill="${GOLD}"/><ellipse cx="17" cy="20" rx="9" ry="3.5" fill="#7a5b10"/>${starsOn}${device}${fringe}`, 40);
};
/** A Red Army collar tab: crimson with the badges of rank. */
const collarTab = (shape, count) => {
  const draw = (i) => {
    const x = 7 + i * 7;
    if (shape === 'triangle') return `<path d="M${x} 21 L${x + 3} 13 L${x + 6} 21 Z" fill="${GOLD}"/>`;
    if (shape === 'square') return `<rect x="${x}" y="13" width="5" height="5" fill="#a01818" stroke="${GOLD}" stroke-width="1"/>`;
    if (shape === 'bar') return `<rect x="${x + 1}" y="11" width="4" height="10" fill="#a01818" stroke="${GOLD}" stroke-width="1"/>`;
    return `<rect x="${x + 1}" y="13" width="5" height="5" transform="rotate(45 ${x + 3.5} 15.5)" fill="#a01818" stroke="${GOLD}" stroke-width="1"/>`;
  };
  return svg(38, `<path d="M3 8 H35 L31 26 H3 Z" fill="#c62828" stroke="#111" stroke-width="1.5"/>${Array.from({ length: count }, (_, i) => draw(i)).join('')}`);
};
/** Flip a drawing upside down: chevrons pointing down. */
const pointDown = (html) => html.replace(/(<svg[^>]*viewBox="0 0 (\d+) (\d+)"[^>]*>)([\s\S]*)(<\/svg>)/, (_, open, w, h, body, close) => `${open}<g transform="translate(0 ${h}) scale(1 -1)">${body}</g>${close}`);

/**
 * The German shoulder strap, 1866–1945 (Prussia, the Kaiser's army, the Reichswehr, the Wehrmacht):
 * flat braid for lieutenants and captains, twisted cord for field officers, gold-and-silver plaited
 * cord for generals; rank told by the pips (zero, one or two; generals up to three), crossed batons
 * for a field marshal. NCOs wore lace (Tresse) round the strap, and Feldwebel ranks pips on it.
 */
const germanStrap = (kind, pips = 0) => {
  const base = '#5b6248';
  let b = `<rect x="7" y="2" width="18" height="34" rx="8" fill="${base}"/>`;
  if (kind === 'flat') for (let i = 0; i < 4; i++) b += `<rect x="${9 + i * 3.6}" y="4" width="2.4" height="30" rx="1.2" fill="${SILVER}"/>`;
  if (kind === 'twist') for (let i = 0; i < 8; i++) b += `<path d="M9 ${5 + i * 3.8} Q16 ${2 + i * 3.8} 23 ${5 + i * 3.8}" stroke="${SILVER}" stroke-width="2.2" fill="none"/>`;
  if (kind === 'general') for (let i = 0; i < 8; i++) b += `<path d="M9 ${5 + i * 3.8} Q16 ${2 + i * 3.8} 23 ${5 + i * 3.8}" stroke="${i % 2 ? SILVER : GOLD}" stroke-width="2.4" fill="none"/>`;
  if (kind === 'tresse') b += `<rect x="7.5" y="2.5" width="17" height="33" rx="8" fill="none" stroke="${SILVER}" stroke-width="2.4"/>`;
  if (kind === 'batons') b += `<path d="M10 30 L22 8 M22 30 L10 8" stroke="${SILVER}" stroke-width="2.4"/>`;
  const at = [[16, 24], [16, 16], [16, 8]];
  for (let i = 0; i < Math.min(3, pips); i++) b += `<rect x="${at[i][0] - 3}" y="${at[i][1] - 3}" width="6" height="6" transform="rotate(45 ${at[i][0]} ${at[i][1]})" fill="${kind === 'general' ? SILVER : GOLD}"/>`;
  return svg(32, b, 40);
};
/** The Imperial Japanese Army's red collar patch: gold bands (none, one, two, or a gold field) and stars. */
const ijaTab = (band, n) => {
  const field = band === 3 ? GOLD : '#b3202a';
  let b = `<rect x="2" y="7" width="36" height="20" rx="2" fill="${field}"/>`;
  if (band === 1) b += `<rect x="2" y="15" width="36" height="4" fill="${GOLD}"/>`;
  if (band === 2) b += `<rect x="2" y="11" width="36" height="3" fill="${GOLD}"/><rect x="2" y="20" width="36" height="3" fill="${GOLD}"/>`;
  for (let i = 0; i < n; i++) b += `<text x="${11 + i * 9}" y="21" font-size="9" text-anchor="middle" fill="${band === 3 ? '#b3202a' : '#f1c40f'}">★</text>`;
  return svg(40, b);
};
/** The Nationalist (ROC) army's collar tab, 1936–49: triangles, with bars for officers and a gold field for generals. */
const rocTab = (bars, n, gold = false) => {
  let b = `<rect x="2" y="7" width="36" height="20" rx="2" fill="${gold ? GOLD : '#b3202a'}" stroke="${GOLD}"/>`;
  for (let i = 0; i < bars; i++) b += `<rect x="${4 + i * 4}" y="7" width="2" height="20" fill="${GOLD}"/>`;
  for (let i = 0; i < n; i++) b += `<path d="M${14 + i * 8} 22 L${17 + i * 8} 13 L${20 + i * 8} 22 Z" fill="${gold ? '#b3202a' : GOLD}"/>`;
  return svg(40, b);
};
/** The PLA's red collar tab without rank (1949–55 and 1965–88, when ranks were abolished). */
const plaTab = () => svg(40, `<rect x="2" y="7" width="36" height="20" rx="2" fill="#c62828"/><text x="20" y="22" font-size="11" text-anchor="middle" fill="${GOLD}">★</text>`);
/** Austria-Hungary's collar patch in the regiment's facing: stars, gold lace for field officers, the zigzag for generals. */
const kukCollar = (n, lace = 0, star = '#f4f4f4') => {
  let b = `<path d="M2 26 L34 26 L34 8 Z" fill="#b3202a"/>`;
  if (lace === 1) b += `<path d="M2 26 L34 26" stroke="${GOLD}" stroke-width="3"/>`;
  if (lace === 2) b += `<path d="M4 25 L8 22 L12 25 L16 22 L20 25 L24 22 L28 25 L32 22" stroke="${GOLD}" stroke-width="2" fill="none"/>`;
  for (let i = 0; i < n; i++) b += `<text x="${18 + i * 6}" y="${22 - i * 3}" font-size="7" text-anchor="middle" fill="${star}">✶</text>`;
  return svg(36, b);
};
/** Armies whose badges of rank changed with the times (army only; navies keep their lace). */
const PERIOD_ARMY = {
  DE: (kind, n, y) => {
    if (y >= 1945) return undefined;
    if (kind === 'O') return n >= 11 ? germanStrap('batons') : n >= 7 ? germanStrap('general', n - 7) : n >= 4 ? germanStrap('twist', n - 4) : germanStrap('flat', n - 1);
    if (kind === 'W') return germanStrap('tresse', 3);
    return ['', pointDown(chevrons(1, 0, '', SILVER)), pointDown(chevrons(2, 0, '', SILVER)), germanStrap('tresse'), germanStrap('tresse'), germanStrap('tresse', 1), germanStrap('tresse', 2), germanStrap('tresse', 3), germanStrap('tresse', 3)][Math.min(8, n - 1)];
  },
  JP: (kind, n, y) => {
    if (y >= 1945) return undefined;
    if (kind === 'O') return n >= 7 ? ijaTab(3, Math.min(3, n - 6)) : n >= 4 ? ijaTab(2, n - 3) : ijaTab(1, n);
    if (kind === 'W') return ijaTab(1, 0);
    return n <= 3 ? ijaTab(0, n) : ijaTab(1, Math.min(3, n - 3));
  },
  CN: (kind, n, y) => {
    if (y < 1949) {
      if (kind === 'O') return n >= 7 ? rocTab(0, Math.min(3, n - 6), true) : n >= 4 ? rocTab(2, n - 3) : rocTab(1, n);
      return n <= 3 ? rocTab(0, n) : rocTab(0, Math.min(3, n - 3), false);
    }
    if (y < 1955 || (y >= 1965 && y < 1988)) return plaTab();
    return undefined;
  },
  AT: (kind, n, y) => {
    if (y >= 1918) return undefined;
    if (kind === 'O') return n >= 7 ? kukCollar(Math.min(3, n - 6), 2, SILVER) : n >= 4 ? kukCollar(n - 3, 1, GOLD) : kukCollar(n, 0, GOLD);
    if (kind === 'W') return kukCollar(3, 1, SILVER);
    return n <= 1 ? kukCollar(0) : n <= 4 ? kukCollar(n - 1) : kukCollar(3, 1);
  },
};
PERIOD_ARMY.HU = PERIOD_ARMY.AT;

/* --- badges by period title ----------------------------------------- */
const stripTitle = (t) => String(t).replace(/^Acting /, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
/** A naval warrant officer's thin gold lace (from 1918; buttons before, drawn the same). */
const thinLace = (n = 1) => svg(36, Array.from({ length: n }, (_, i) => `<rect x="3" y="${12 + i * 6}" width="30" height="2.4" fill="${GOLD}"/>`).join(''));
/** The royal arms of a first-class warrant officer (and a fleet chief petty officer). */
const royalArms = () => svg(30, `<text x="15" y="25" font-size="20" text-anchor="middle" fill="${GOLD}">⚜</text>`);
/** A petty officer's rate badge of the sailing navy: an anchor, with chevrons for the senior rates. */
const anchorBadge = (k = 0, color = GOLD) => svg(34, `<text x="17" y="16" font-size="14" text-anchor="middle" fill="${color}">⚓</text>${Array.from({ length: k }, (_, i) => `<path d="M6 ${24 + i * 5} L17 ${18 + i * 5} L28 ${24 + i * 5}" fill="none" stroke="${color}" stroke-width="2.4"/>`).join('')}`, 40);
/** Ranks that no longer exist, by title: [pattern, (ctx) => badge]. Checked before today's ladder. */
const PERIOD_TITLE_BADGES = [
  [/^(Landsman|Ordinary Seaman|Apprentice Seaman|Seaman Second Class|Seaman First Class|Matros 2nd Class|Matros 1st Class|Krasnoflotets|Krasnoarmeyets|Musketier|Nitōhei|Ittōhei|Nitō Hei|Ittō Hei|Jōtō Hei|Jōtōhei|Sepoy|Worker|Auxiliary)\b/, () => ''],
  [/^(Coxswain|Quartermaster|Boatswain's Mate|Kvartirmeyster|Botsmanmat)$/, () => anchorBadge(1)],
  [/^(Master-at-Arms|Botsman|Senior Botsman)$/, () => anchorBadge(2)],
  [/^(Gunner|Boatswain|Master|Deckoffizier|Konduktor|Heisōchō)\b|^(Chief )?Warrant Officer$/, ({ naval, y }) => (naval && y < 1949 ? thinLace(1) : undefined)],
  [/^Fleet Chief Petty Officer$/, () => royalArms()],
  [/^(Regimental|Garrison) Sergeant Major$/, ({ cw }) => (cw ? royalArms() : chevrons(3, 3))],
  [/^Battalion Sergeant Major$/, () => chevrons(3, 2)],
  [/^Quartermaster Sergeant$/, () => chevrons(3, 1)],
  [/^Sergeant Major$/, ({ cw, y }) => (cw && y < 1881 ? chevrons(4) : undefined)],
  [/^Colour Sergeant$/, () => svg(34, `<text x="17" y="9" font-size="8" text-anchor="middle" fill="${GOLD}">♛</text>${[0, 1, 2].map((k) => `<path d="M4 ${17 + k * 5} L17 ${11 + k * 5} L30 ${17 + k * 5}" fill="none" stroke="${GOLD}" stroke-width="3" stroke-linejoin="round"/>`).join('')}`, 40)],
  [/^Jemadar$/, () => pips(1, false, GOLD)],
  // A WRNS officer's lace was blue, with a diamond in place of the curl.
  [/^(Third|Second|First|Chief) Officer$|^Superintendent$|^Commandant$/, ({ naval, n }) => (naval ? navalLace(Math.max(1, n - 1), '', false, '#4a7fd4') : undefined)],
  [/^Brigadier-General$/, () => swordBaton()],
  [/^Colonel-Commandant$/, () => pips(3, true)],
  [/^Airman (Third|Second|First) Class$/, ({ title }) => chevrons({ Third: 1, Second: 2, First: 3 }[/(Third|Second|First)/.exec(title)[1]], 0, 'star', SILVER)],
  [/^(Kaptenarmus|Feldfebel|Zauryad-Praporshchik|Podpraporshchik)$/, () => undefined],
  // An Imperial Japanese Navy rating: an anchor and cherry blossom, with chevrons for petty officers.
  [/Heisō|Heichō \(Leading Seaman\)/, ({ title }) => anchorBadge(/Jōtō Heisō/.test(title) ? 3 : /Ittō Heisō/.test(title) ? 2 : /Nitō Heisō/.test(title) ? 1 : 0)],
];
/** An American airman before the Air Force had ranks of its own (to 1952): the Army's stripes. */
const usAirArmyStripes = (n) => ['', chevrons(1), chevrons(2), chevrons(3), chevrons(3, 1), chevrons(3, 2), chevrons(3, 3), chevrons(3, 3, 'diamond'), chevrons(3, 3)][Math.max(0, n - 1)] ?? chevrons(3, 3);

function periodTitleBadge(rawTitle, { prefix, n, nation, branch }) {
  const title = stripTitle(rawTitle);
  const y = eraYear();
  const naval = NAVAL_BRANCHES.includes(branch);
  const cw = COMMONWEALTH.includes(nation ?? '');
  const enlisted = prefix === 'E' || prefix === 'OR';
  if (enlisted && branch === 'airforce' && !nation && y < 1952) return usAirArmyStripes(n);
  for (const [re, draw] of PERIOD_TITLE_BADGES) if (re.test(title)) { const b = draw({ title, y, naval, cw, n, nation }); if (b !== undefined) return b; }
  // Art of its own for this period already (the Kaiser's tresse, Red Army collar tabs, epaulettes): keep it.
  const kind = enlisted ? 'E' : prefix === 'W' ? 'W' : 'O';
  if (periodInsignia(kind, n, nation, branch) !== undefined) return undefined;
  // A title that lives on in today's ladder at another grade wears that grade's badge.
  let ladder = [];
  try { ladder = branchOf({ nation: nation ?? undefined, branch: branch ?? 'army', track: enlisted ? 'enlisted' : prefix === 'W' ? 'warrant' : 'officer' })?.[enlisted ? 'enlisted' : prefix === 'W' ? 'warrant' : 'officer'] ?? []; } catch { ladder = []; }
  // Canada before unification wore Britain's ranks and badges: look in the British ladder first.
  if (nation === 'CA' && y < 1968) {
    let gb = [];
    try { gb = branchOf({ nation: 'GB', branch: branch ?? 'army', track: enlisted ? 'enlisted' : 'officer' })?.[enlisted ? 'enlisted' : 'officer'] ?? []; } catch { gb = []; }
    const g = gb.findIndex((t) => stripTitle(t) === title);
    if (g >= 0) return militaryInsignia(`${prefix}-${g + 1}`, 'GB', { branch });
  }
  const at = ladder.findIndex((t) => stripTitle(t) === title);
  if (at >= 0 && at !== n - 1) return militaryInsignia(`${prefix}-${at + 1}`, nation, { branch });
  // The dominions and India wore Britain's badges under Britain's titles (Canada until 1968).
  if (at < 0 && cw && nation !== 'GB') {
    let gb = [];
    try { gb = branchOf({ nation: 'GB', branch: branch ?? 'army', track: enlisted ? 'enlisted' : 'officer' })?.[enlisted ? 'enlisted' : 'officer'] ?? []; } catch { gb = []; }
    const g = gb.findIndex((t) => stripTitle(t) === title);
    if (g >= 0) return militaryInsignia(`${prefix}-${g + 1}`, 'GB', { branch });
  }
  return undefined;
}

/**
 * The British pattern for other ranks (and the dominions'): one, two, three chevrons; a crown over
 * three for a staff sergeant; the crown alone for a warrant officer class 2; the royal arms for a
 * class 1. The RAF's aircraftmen wear a propeller (two blades, then three), then chevrons.
 */
function cwEnlisted(g, branch, nation) {
  const crownTxt = (y = 9) => `<text x="17" y="${y}" font-size="9" text-anchor="middle" fill="${GOLD}">${cwEmblem(nation)}</text>`;
  const chev = (k, y0 = 6) => Array.from({ length: k }, (_, i) => `<path d="M4 ${y0 + 8 + i * 5} L17 ${y0 + i * 5} L30 ${y0 + 8 + i * 5}" fill="none" stroke="${GOLD}" stroke-width="3" stroke-linejoin="round"/>`).join('');
  const crownOverThree = svg(34, crownTxt() + chev(3, 12), 40);
  const crownAlone = svg(30, `<text x="15" y="24" font-size="18" text-anchor="middle" fill="${GOLD}">${cwEmblem(nation)}</text>`);
  const arms = svg(30, `<text x="15" y="25" font-size="20" text-anchor="middle" fill="${GOLD}">⚜</text>`);
  const prop = (blades) => svg(34, `<circle cx="17" cy="17" r="2.5" fill="${GOLD}"/>${Array.from({ length: blades }, (_, i) => `<ellipse cx="17" cy="9" rx="2.6" ry="8" fill="${GOLD}" transform="rotate(${(360 / blades) * i} 17 17)"/>`).join('')}`, 34);
  // Canada since unification (1968): a maple leaf for the master corporal and the sergeant, the crown in a wreath for a master warrant officer.
  if (nation === 'CA' && eraYear() >= 1968) {
    const leaf = (k) => svg(34, `<text x="17" y="${k === 3 ? 9 : 10}" font-size="8" text-anchor="middle" fill="${GOLD}">🍁\uFE0E</text>${chev(k, 12)}`, 40);
    const wreathed = svg(34, `<path d="M6 26 Q17 34 28 26" fill="none" stroke="${GOLD}" stroke-width="2"/><text x="17" y="22" font-size="15" text-anchor="middle" fill="${GOLD}">${cwEmblem(nation)}</text>`, 34);
    return ['', chevrons(1), chevrons(2), leaf(2), leaf(3), crownAlone, wreathed, arms, svg(34, `<text x="17" y="24" font-size="18" text-anchor="middle" fill="${GOLD}">⚜</text><path d="M6 28 Q17 34 28 28" fill="none" stroke="${GOLD}" stroke-width="2"/>`, 34)][Math.max(0, Math.min(8, g - 1))];
  }
  if (branch === 'airforce') return ['', prop(2), prop(3), chevrons(2), chevrons(3), crownOverThree, arms, arms, arms][Math.max(0, Math.min(8, g - 1))];
  return ['', chevrons(1), chevrons(2), chevrons(3), crownOverThree, crownAlone, arms, arms, arms][Math.max(0, Math.min(8, g - 1))];
}

/** Historical insignia for a rank (kind E/W/O, grade n), or undefined to use today's. */
export function periodInsignia(kind, n, nation, branch) {
  const y = eraYear();
  if (y >= PRESENT) return undefined;
  const cc = nation ?? 'US';
  const naval = NAVAL_BRANCHES.includes(branch);
  if (cc === 'RU' && !naval) {
    if (y < 1917) {
      if (kind === 'O') return board([{ gaps: 1, small: 1 }, { gaps: 1, small: 2 }, { gaps: 1, small: 3 }, { gaps: 1, small: 4 }, { gaps: 1 }, { gaps: 2, small: 3 }, { gaps: 2 }, { zigzag: true, big: 2 }, { zigzag: true, big: 3 }, { zigzag: true }][Math.min(9, n - 1)], '#4b5a3a');
      return undefined;
    }
    if (y < 1943) {
      if (kind === 'E') return n <= 2 ? collarTab('triangle', 0) : collarTab('triangle', Math.min(4, n - 2));
      if (kind === 'W') return collarTab('triangle', 4);
      return [collarTab('square', 1), collarTab('square', 2), collarTab('square', 3), collarTab('bar', 1), collarTab('bar', 2), collarTab('bar', 3), collarTab('bar', 4), collarTab('diamond', 1), collarTab('diamond', 2), collarTab('diamond', 3), collarTab('diamond', 4)][Math.min(10, n - 1)];
    }
    return undefined;
  }
  // Armies whose badges changed with the times (Imperial Germany and the Wehrmacht, Imperial Japan,
  // Nationalist China and the rankless PLA, Austria-Hungary).
  if (!naval && PERIOD_ARMY[cc] && !(kind === 'O' && y < 1855)) {
    const p = PERIOD_ARMY[cc](kind, n, y);
    if (p !== undefined) return p;
  }
  // Epaulettes: the officer's badge of rank before shoulder straps and pips.
  if (kind === 'O' && !naval && y < (cc === 'US' ? 1832 : 1855)) return bullionEpaulette(n);
  if (cc === 'GB' || (COMMONWEALTH.includes(cc) && y < 1947)) {
    if (kind === 'O' && !naval && branch !== 'airforce' && y < 1902 && n <= 7) {
      const em = '♛';
      return [svg(16, `<rect x="4" y="4" width="8" height="26" rx="2" fill="none" stroke="${GOLD}" stroke-width="1.2"/>`), pips(1), pips(2), pips(0, true, GOLD, em), pips(1, true, GOLD, em), pips(2, true, GOLD, em), pips(2, true, GOLD, em)][Math.max(0, n - 1)];
    }
    return undefined;
  }
  if (cc === 'US') {
    if (kind === 'E' && !naval && y < 1902) {
      // A private wore none; a corporal two stripes, a sergeant three, a first sergeant's lozenge, a sergeant major's arcs.
      const old = ['', '', '', chevrons(2), chevrons(3), chevrons(3), chevrons(3, 0, 'diamond'), chevrons(3, 3), chevrons(3, 3)][Math.min(8, Math.max(0, n - 1))];
      return old ? pointDown(old) : old;
    }
    // A private's single stripe (E-2) came in 1968 (1958 in the Marines); a private first class wore
    // one chevron from 1920 (1917 in the Marines) and only later the rocker below it.
    if (kind === 'E' && !naval && branch !== 'airforce') {
      const pv2 = branch === 'marines' ? 1958 : 1968;
      if (n === 2 && y < pv2) return '';
      if (n === 3 && y < pv2) return y < (branch === 'marines' ? 1917 : 1920) ? '' : chevrons(1);
    }
    if (kind === 'O' && !naval && n === 1 && y < 1917) return svg(16, `<rect x="4" y="4" width="8" height="26" rx="2" fill="none" stroke="${GOLD}" stroke-width="1.2"/>`);
  }
  return undefined;
}

/* --- civilian uniformed services ------------------------------------ */
/*
 * A uniformed career's insignia comes from its rank (the level id, the same in every country),
 * not its translated title, and is drawn in the country's style:
 *   us       chevrons, bars, oak leaves, the eagle, stars (police, sheriffs, corrections, EMS, wardens)
 *   uk       chevrons, pips and crowns, crossed tipstaves for chief officers (Commonwealth police)
 *   galons   stripes on the shoulder (France, Italy, Spain, Belgium, Portugal, Latin America)
 *   fire     bugles everywhere
 *   stripes  sleeve or shoulder stripes for ship's officers and pilots
 */
const UK_STYLE = ['GB', 'IE', 'AU', 'NZ', 'SG', 'MY', 'IN', 'HK', 'CA', 'PK', 'KE', 'NG', 'GH', 'ZA', 'MT', 'GM', 'MW', 'BN', 'JM', 'BS', 'LK', 'BD', 'PG', 'SB', 'VU', 'TO', 'NP', 'BT', 'ET', 'SO', 'SS'];
const GALONS = ['FR', 'IT', 'ES', 'BE', 'PT', 'LU', 'MC', 'MX', 'BR', 'AR', 'CO', 'PE', 'CL', 'VA', 'CH', 'CD', 'CF', 'CI', 'DJ', 'ML', 'NE', 'SN', 'TD', 'HT', 'RO', 'GW', 'MZ', 'CR', 'GT', 'PA', 'VE'];

// Countries from sketches (world/packs/Sketch.js) wear their family's pattern: Soviet shoulder boards,
// the Warsaw Pact's stars on bars, French galons, Commonwealth pips (the national emblem in a republic),
// Spanish America's six- and eight-pointed stars.
const EAST_STARS = starsStyle({ glyph: '★', field: 'bars2', gen: 'zigzag', color: SILVER, enlisted: SILVER });
const MICRO_STARS = starsStyle({ glyph: '✶', field: 'bar', gen: 'wreath' });
for (const p of PACKS) {
  const cc = p.id;
  if (!p.sketch || SHOULDER.includes(cc) || UK_STYLE.includes(cc)) continue;
  const fam = p.sketch;
  if (fam === 'latin') { if (!GALONS.includes(cc)) GALONS.push(cc); MIL_STYLES[cc] ??= MIL_STYLES.ES; continue; }
  if (MIL_STYLES[cc]) continue;
  if (GALONS.includes(cc)) { MIL_STYLES[cc] = fam === 'micro' ? MICRO_STARS : frenchStyle; continue; }
  if (fam === 'postSoviet' || (fam === 'asia' && p.country.languages?.[0] !== 'Dhivehi')) SHOULDER.push(cc);
  else if (fam === 'eastBloc' || fam === 'yugoslav') { MIL_STYLES[cc] = EAST_STARS; FAMILY[cc] = EAST_STARS; }
  else if (fam === 'micro' || fam === 'asia') { MIL_STYLES[cc] = MICRO_STARS; FAMILY[cc] = MICRO_STARS; }
  else if (fam === 'francoAfrica' || fam === 'maghreb' || fam === 'lusoAfrica') { MIL_STYLES[cc] = frenchStyle; FAMILY[cc] = frenchStyle; GALONS.push(cc); }
  else { COMMONWEALTH.push(cc); UK_STYLE.push(cc); if (!p.monarchy) CW_EMBLEM[cc] ??= '✵'; }
}

/** A row of shoulder stripes (galons, or a pilot's / ship's officer's bars). */
const galons = (n, color = GOLD) => svg(34, Array.from({ length: n }, (_, i) => `<rect x="5" y="${6 + i * 5}" width="24" height="3" rx="1" fill="${i === 1 && n === 5 ? SILVER : color}"/>`).join(''));
/** Sleeve stripes; a ship's engineers wear purple between theirs. */
const sleeve = (n, color = GOLD, between = null) => svg(34, `${between && n > 1 ? `<rect x="4" y="${29.4 - (n - 1) * 6}" width="26" height="${(n - 1) * 6 - 3.4}" fill="${between}"/>` : ''}${Array.from({ length: n }, (_, i) => `<rect x="4" y="${26 - i * 6}" width="26" height="3.4" rx="1" fill="${color}"/>`).join('')}`);

/** Rank keys: cpl (senior officer/corporal), sgt, ssgt (senior NCO), lt, capt, major, col, 1star…4star; fire: f1…f5. */
const CMD = (id) => { const m = /_cmd(\d)$/.exec(id); return m ? Number(m[1]) : 0; };
const TOP = /^(chief|superintendent|undersheriff|administrator|director|regional|usMarshal|chiefPatrol|fsd)$/;
function policeRank(id, key) {
  // Senior patrol officers, senior troopers and senior detention officers wear a corporal's two chevrons.
  if (/^(senior|corporal|seniorTrooper)$/.test(id) && key !== 'gameWarden') return 'cpl';
  if (/^(sergeant|detSergeant|corporalSergeant)$/.test(id)) return 'sgt';
  if (/^(lieutenant|detLieutenant|supervisory)$/.test(id)) return 'lt';
  if (/^(captain|detCaptain|chiefOfSecurity|watch)$/.test(id)) return 'capt';
  if (/^(major|commander|deputyWarden|associateWarden|pail)$/.test(id)) return 'major';
  if (id === 'warden' && key !== 'gameWarden') return 'col';
  if (id === 'deputyChief') return '1star';
  const c = CMD(id);
  if (c) return ['major', 'col', '2star', '3star'][c - 1];
  if (TOP.test(id)) return '4star';
  return null;
}
function fireRank(id) {
  if (/^(lieutenant|helitack)$/.test(id)) return 'f1';
  if (/^(captain|siteChief)$/.test(id)) return 'f2';
  if (/^(battalion|division)$/.test(id)) return 'f2x';
  if (/^(deputyChief|unitChief)$/.test(id)) return 'f3';
  const c = CMD(id);
  if (c) return c >= 2 ? 'f4' : 'f3';
  if (/^(chief|director)$/.test(id)) return 'f5';
  return null;
}
function emsRank(id) {
  if (id === 'supervisor') return 'lt';
  if (id === 'captain' || id === 'manager') return 'capt';
  if (id === 'deputy') return '1star';
  const c = CMD(id);
  if (c) return ['col', '2star', '3star'][c - 1] ?? '3star';
  if (id === 'chief' || id === 'director') return '4star';
  return null;
}
const US_DRAW = { cpl: () => chevrons(2, 0, '', SILVER), sgt: () => chevrons(3, 0, '', SILVER), ssgt: () => chevrons(3, 1, '', SILVER), lt: () => bars(1, GOLD), capt: () => bars(2, GOLD), major: () => leaf(GOLD), col: () => eagle(), '1star': () => stars(1, GOLD), '2star': () => stars(2, GOLD), '3star': () => stars(3, GOLD), '4star': () => stars(4, GOLD) };
const UK_DRAW = { cpl: () => '', sgt: () => chevrons(3, 0, '', SILVER), ssgt: () => chevrons(3, 0, 'star', SILVER), lt: () => pips(2, false, SILVER), capt: () => pips(3, false, SILVER), major: (cc) => pips(0, true, SILVER, cwEmblem(cc)), col: (cc) => pips(1, true, SILVER, cwEmblem(cc)), '1star': () => swordBaton(), '2star': () => swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${SILVER}">✦</text>`), '3star': (cc) => swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${SILVER}">${cwEmblem(cc)}</text>`), '4star': (cc) => swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${SILVER}">${cwEmblem(cc)}✦</text>`) };
const GALON_DRAW = { cpl: () => chevrons(1), sgt: () => chevrons(2), ssgt: () => chevrons(3), lt: () => galons(2), capt: () => galons(3), major: () => galons(4), col: () => galons(5), '1star': () => stars(2, GOLD), '2star': () => stars(3, GOLD), '3star': () => stars(4, GOLD), '4star': () => stars(5, GOLD) };
const CN_DRAW = { cpl: () => board({ chev: 2 }), sgt: () => board({ chev: 3 }), ssgt: () => board({ chev: 3, cross: 1 }), lt: () => board({ gaps: 1, vstars: 1 }), capt: () => board({ gaps: 1, vstars: 3 }), major: () => board({ gaps: 2, vstars: 1 }), col: () => board({ gaps: 2, vstars: 3 }), '1star': () => board({ zigzag: true, vstars: 1 }), '2star': () => board({ zigzag: true, vstars: 2 }), '3star': () => board({ zigzag: true, vstars: 3 }), '4star': () => board({ zigzag: true, huge: true }) };
const IN_DRAW = { cpl: () => chevrons(2, 0, '', SILVER), sgt: () => chevrons(3, 0, '', SILVER), ssgt: () => chevrons(3, 0, 'star', SILVER), lt: () => pips(1, false, SILVER, '☸', '★'), capt: () => pips(3, false, SILVER, '☸', '★'), major: () => pips(0, true, SILVER, '☸'), col: () => pips(1, true, SILVER, '☸', '★'), '1star': () => pips(3, true, SILVER, '☸', '★'), '2star': () => swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${SILVER}">★</text>`), '3star': () => swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${SILVER}">☸</text>`), '4star': () => swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${SILVER}">☸★</text>`) };
const DE_DRAW = { cpl: () => deStars(2, BLUE), sgt: () => deStars(3, BLUE), ssgt: () => deStars(4, BLUE), lt: () => deStars(1, SILVER), capt: () => deStars(2, SILVER), major: () => deStars(3, SILVER), col: () => deStars(1, GOLD), '1star': () => deStars(2, GOLD), '2star': () => deStars(3, GOLD), '3star': () => deStars(4, GOLD), '4star': () => svg(56, `<circle cx="28" cy="17" r="15" fill="none" stroke="${GOLD}" stroke-dasharray="2 2"/>${Array.from({ length: 4 }, (_, i) => `<text x="${13 + i * 10}" y="22" font-size="12" text-anchor="middle" fill="${GOLD}">✶</text>`).join('')}`) };
const BOARD_DRAW = { cpl: () => board({ cross: 2 }), sgt: () => board({ cross: 3 }), ssgt: () => board({ wide: true }), lt: () => board({ gaps: 1, small: 2 }), capt: () => board({ gaps: 1, small: 4 }), major: () => board({ gaps: 2, big: 1 }), col: () => board({ gaps: 2, big: 3 }), '1star': () => board({ zigzag: true, big: 1 }), '2star': () => board({ zigzag: true, big: 2 }), '3star': () => board({ zigzag: true, big: 3 }), '4star': () => board({ zigzag: true, huge: true }) };
const KR_DRAW = { cpl: () => flowers(2, true), sgt: () => flowers(3, true), ssgt: () => flowers(4, true), lt: () => flowers(1), capt: () => flowers(2), major: () => flowers(3), col: () => flowers(4), '1star': () => flowers(1, false, GOLD), '2star': () => flowers(2, false, GOLD), '3star': () => flowers(3, false, GOLD), '4star': () => flowers(4, false, GOLD) };
const JP_DRAW = { cpl: () => plate(1, 0, SILVER), sgt: () => plate(1, 1, SILVER), ssgt: () => plate(1, 2, SILVER), lt: () => plate(2, 1), capt: () => plate(2, 2), major: () => plate(2, 3), col: () => plate(3, 1), '1star': () => plate(3, 2), '2star': () => plate(3, 3), '3star': () => plate(3, 4), '4star': () => plate(4, 4) };
const FIRE_DRAW = { f1: () => bugles(1), f2: () => bugles(2), f2x: () => bugles(2, true), f3: () => bugles(3, true), f4: () => bugles(4, true), f5: () => bugles(5, true) };
const draw = (rank, cc) => {
  if (!rank) return '';
  // Countries with a family of their own (and not a police pattern above) draw it.
  if (!UK_STYLE.includes(cc) && !GALONS.includes(cc) && FAMILY[cc]) { const own = familyDraw(rank, cc); if (own !== undefined) return own; }
  const table = cc === 'CN' ? CN_DRAW : cc === 'IN' ? IN_DRAW : UK_STYLE.includes(cc) ? UK_DRAW : GALONS.includes(cc) ? GALON_DRAW : cc === 'DE' ? DE_DRAW : SHOULDER.includes(cc) ? BOARD_DRAW : cc === 'KR' ? KR_DRAW : cc === 'JP' ? JP_DRAW : US_DRAW;
  return (table[rank] ?? US_DRAW[rank])?.(cc) ?? '';
};

const POLICE_LIKE = ['police', 'sheriff', 'statePolice', 'transitPolice', 'airportPolice', 'universityPolice', 'privatePolice', 'borderPatrol', 'corrections', 'jail', 'federalPrisons', 'privatePrisons', 'gameWarden'];
const FIRE_LIKE = ['fire', 'airportFire', 'stateFire', 'privateFire'];
const EMS_LIKE = ['ems'];
/** Officers' stripes at sea and in the air (deck and engine; first officers and captains). */
const STRIPES = {
  maritimeFaculty: { instructor: 2, professor: 3, deptHead: 3, trainingShipMaster: 4, commandant: 4, superintendent: 4 },
  merchantMarine: { thirdMate: 1, thirdAE: 1, firstAE: 3, chiefMate: 3, chiefEngineer: 4, master: 4, portCaptain: 4 },
  cruise: { asstCd: 2, cruiseDirector: 3, hotelDirector: 4, vpHotelOps: 4, maitred: 2 },
  aviation: { cfi: 2, fo: 3, majorFo: 3, captain: 4, majorCaptain: 4, widebodyCaptain: 4, checkAirman: 4, chiefPilot: 4, dfo: 4 },
  charterAviation: { charterFo: 3, cargoFo: 3, charterCaptain: 4, cargoCaptain: 4, corporatePilot: 4, leadPilot: 4, flightDeptManager: 4 },
  tsa: { officer: 2, lead: 3, bdo: 3, inspector: 3, supervisor: 4, manager: 4 },
  // Cabin crew: pursers and inflight managers wear sleeve stripes (silver), line crew their wings.
  flightAttendant: { purser: 1, intlPurser: 2, supervisor: 2, baseManager: 3, director: 3 },
};
const SILVER_STRIPES = ['tsa', 'flightAttendant'];
const ENGINEERS = /AE$|Engineer$/;
/** Clerical dress as rank: a priest's collar, a monsignor's purple piping, a bishop's purple skullcap and pectoral cross, a cardinal's scarlet, a pope's white. */
const collar = (trim = '#111') => svg(34, `<rect x="6" y="8" width="22" height="20" rx="4" fill="${trim}"/><rect x="14" y="10" width="6" height="5" rx="1" fill="#fff"/>`);
const zucchetto = (color, cross = false) => svg(34, `<path d="M6 22 Q17 4 28 22 Z" fill="${color}" stroke="rgba(0,0,0,.35)" stroke-width="0.8"/>${cross ? '<path d="M17 24 V33 M13.5 27 H20.5" stroke="#d4a017" stroke-width="2.4" stroke-linecap="round"/>' : ''}`);
const PURPLE = '#7b2d8b';
const SCARLET = '#c0182c';
/** An astronaut's wings: gold wings over a shooting star. */
const astronautWings = (color = GOLD) => svg(46, `<path d="M23 20 C14 12 8 14 3 12 C8 18 14 20 23 22 Z M23 20 C32 12 38 14 43 12 C38 18 32 20 23 22 Z" fill="${color}"/><circle cx="23" cy="16" r="4.2" fill="none" stroke="${color}" stroke-width="1.6"/><path d="M23 8 L23 30" stroke="${color}" stroke-width="1.6"/>`);

/** Ranks of the Vatican's and Singapore's own services, and the Swiss Guard. */
/** A railway officer's cap: gold braid bands round the peak (one for an inspector, more up the line); a conductor's cap plate. */
const capBand = (n) => svg(40, `<path d="M6 22 Q20 6 34 22 Z" fill="#1d2433" stroke="#888"/><rect x="5" y="22" width="30" height="7" fill="#11151d"/>${Array.from({ length: n }, (_, i) => `<rect x="5" y="${22 + i * 2.4}" width="30" height="1.6" fill="${GOLD}"/>`).join('')}<path d="M5 29 Q20 34 35 29" fill="none" stroke="#000" stroke-width="2"/>`);
const capPlate = (word) => svg(44, `<rect x="2" y="12" width="40" height="11" rx="2" fill="${SILVER}"/><text x="22" y="20.5" font-size="6.4" text-anchor="middle" fill="#222" font-family="sans-serif">${word}</text>`);
/** Railway grades that wore braid (both the British companies and the American roads). */
const RAILWAY = {
  steamRailway: { inspector: () => capBand(1), shedMaster: () => capBand(2), superintendent: () => capBand(3) },
  railroad: { conductor: () => capPlate('CONDUCTOR'), trainmaster: () => capBand(1), roadForeman: () => capBand(1), superintendent: () => capBand(2), gm: () => capBand(3) },
};
/** Forestry services in the German-speaking countries wear rank: green stars, then silver and gold for the senior grades. */
const FOREST_GREEN = '#5f9b4f';
const FORESTER = { forester: () => deStars(1, FOREST_GREEN), senior: () => deStars(2, FOREST_GREEN), fmo: () => deStars(3, FOREST_GREEN), district: () => deStars(1, SILVER), state_cmd1: () => deStars(2, SILVER), state_cmd2: () => deStars(1, GOLD), state_cmd3: () => deStars(2, GOLD), state: () => deStars(3, GOLD) };
/** Nurses' epaulettes (Britain, Ireland and the Commonwealth services that copied them): bands for the grade. */
const NURSE_BLUE = '#9fc3ea';
const NURSING = { rn: () => epaulette(1, NURSE_BLUE), seniorRn: () => epaulette(2, NURSE_BLUE), icu: () => epaulette(2, NURSE_BLUE), flightNurse: () => epaulette(2, NURSE_BLUE), cns: () => epaulette(3, NURSE_BLUE), np: () => epaulette(3, NURSE_BLUE), charge: () => epaulette(3, '#ffffff'), manager: () => epaulette(4, '#ffffff'), director: () => epaulette(2, GOLD), cno: () => epaulette(3, GOLD) };
const NURSE_EPAULETTES = ['GB', 'IE', 'AU', 'NZ', 'ZA', 'MT'];

const OWN = {
  // National gendarmeries (the Carabinieri, the Gendarmerie nationale, the Guardia Civil, the Jandarma, the Marechaussee):
  // military ranks on their country's pattern.
  gendarmerie: { corporal: 'cpl', sergeant: 'sgt', adjutant: 'ssgt', lieutenant: 'lt', captain: 'capt', major: 'major', ltColonel: 'col', colonel: 'col', general: '2star' },
  catholicClergy: { deacon: () => collar(), vicar: () => collar(), pastor: () => collar(), monsignor: () => collar(PURPLE), vicarGeneral: () => collar(PURPLE), auxBishop: () => zucchetto(PURPLE, true), bishop: () => zucchetto(PURPLE, true), archbishop: () => zucchetto(PURPLE, true), cardinal: () => zucchetto(SCARLET, true) },
  anglicanClergy: { deacon: () => collar(), curate: () => collar(), vicar: () => collar(), canon: () => collar(), ruralDean: () => collar(), archdeacon: () => collar(), dean: () => collar(), suffragan: () => zucchetto(PURPLE, true), bishop: () => zucchetto(PURPLE, true), archbishop: () => zucchetto(PURPLE, true) },
  jesuits: { priest: () => collar(), tertian: () => collar(), professed: () => collar(), rector: () => collar(), socius: () => collar(), provincial: () => collar(), assistantGeneral: () => collar(), general: () => collar() },
  clergy: { associate: () => collar(), minister: () => collar(), chaplain: () => collar(), seniorChaplain: () => collar(), senior: () => collar(), dean: () => collar(), regional: () => collar(), national: () => collar() },
  spaceIndustry: { astronaut: () => astronautWings(SILVER), commander: () => astronautWings(), chiefAstronaut: () => astronautWings() },
  vaticanGendarmerie: { viceBrigadier: 'sgt', brigadier: 'ssgt', inspector: 'lt', viceCommissioner: 'capt', commissioner: 'major', commandant: 'col' },
  swissGuard: { viceCorporal: () => chevrons(1), corporal: () => chevrons(2), sergeant: () => chevrons(3), sergeantMajor: () => chevrons(3, 1), lieutenant: () => galons(2), captain: () => galons(3), ltColonel: () => galons(4), commandant: () => galons(5) },
  gurkhaContingent: { corporal: () => chevrons(2, 0, '', SILVER), sergeant: () => chevrons(3, 0, '', SILVER), staffSergeant: () => chevrons(3, 0, 'star', SILVER), seniorStaffSergeant: () => chevrons(3, 1, 'star', SILVER), stationInspector: () => pips(2, false, SILVER), asp: () => pips(3, false, SILVER), dsp: () => pips(0, true, SILVER) },
  // Contract guard forces: a lead officer's two chevrons, a supervisor's three, then officers' bars.
  // Private companies use their own system: slide-on epaulettes with bars.
  privateSecurity: { lead: () => epaulette(1), supervisor: () => epaulette(2), shiftLieutenant: () => epaulette(3), siteManager: () => epaulette(4), director: () => epaulette(4, GOLD) },
  privateEms: { fto: () => epaulette(1, '#6fcf6f'), supervisor: () => epaulette(2, '#6fcf6f'), manager: () => epaulette(3, '#6fcf6f'), regional: () => epaulette(4, '#6fcf6f') },
  privateMilitary: { teamLead: () => epaulette(2, '#c2a46a'), detailLead: () => epaulette(3, '#c2a46a'), programManager: () => epaulette(4, '#c2a46a') },
  // Uniformed probation departments and animal services wear police-pattern rank.
  probation: { supervisor: 'lt', chief_cmd1: 'major', chief_cmd2: 'col', chief_cmd3: '1star', chief: '2star' },
  animalControl: { senior: 'cpl', supervisor: 'sgt', director_cmd1: 'lt', director_cmd2: 'capt', director_cmd3: 'major', director: 'col' },
};

/**
 * Colonial services wear the ruling power's pattern (`country` is the ruler): rank keys drawn in
 * its style, or (British-pattern native ranks) chevrons, pips and the crown of the Indian Army's
 * VCOs and the Imperial Police. A Governor wears the vice-regal crown.
 */
const VCO = {
  lanceNaik: () => chevrons(1, 0, '', SILVER), naik: () => chevrons(2, 0, '', SILVER), havildar: () => chevrons(3, 0, '', SILVER),
  havildarMajor: () => pips(0, true, SILVER), jemadar: () => pips(1, false, GOLD), subedar: () => pips(2, false, GOLD), subedarMajor: () => pips(1, true, GOLD),
};
const COLONIAL_RANKS = {
  colonialPolice: { headConstable: 'sgt', subInspector: 'ssgt', inspector: 'lt', asp: 'capt', superintendent: 'major', seniorSuperintendent: 'col', deputyIG: '1star', ig: '3star' },
  colonialTroops: { lanceNaik: 'cpl', naik: 'cpl', havildar: 'sgt', havildarMajor: 'ssgt', jemadar: 'lt', subedar: 'capt', subedarMajor: 'major' },
  colonialService: { cadet: 'lt', districtOfficer: 'capt', seniorDistrictOfficer: 'major', districtCommissioner: 'col', resident: '1star', colonialSecretary: '2star', chiefSecretary: '3star', governor: () => crownBadge('viceRegal') },
  colonialMedical: { subAssistantSurgeon: 'lt', medicalOfficer: 'capt', civilSurgeon: 'major', seniorMO: 'major', pmo: 'col', deputyDms: '1star', dms: '2star' },
};
function colonialInsignia(key, id, country) {
  if (key === 'colonialTroops' && !GALONS.includes(country)) return VCO[id]?.() ?? null;
  const r = COLONIAL_RANKS[key]?.[id];
  if (!r) return null;
  return (typeof r === 'function' ? r() : draw(r, country)) || null;
}

/* ------------------------------------------------------------------ */
/* Police and fire ranks by country                                    */
/* ------------------------------------------------------------------ */

/** Crossed tipstaves in a wreath: a British chief police officer (with a pip or crown above for the senior two). */
const tipstaves = (above = '') => svg(40, `${above ? `<text x="20" y="11" font-size="9" text-anchor="middle" fill="${SILVER}">${above}</text>` : ''}<path d="M10 14 L30 30 M30 14 L10 30" stroke="${SILVER}" stroke-width="2.4" stroke-linecap="round"/><path d="M6 20 Q4 30 14 33 M34 20 Q36 30 26 33" fill="none" stroke="${SILVER}" stroke-width="1.6"/>`);
/** British police from sergeant to chief constable. */
const GB_POLICE = {
  sergeant: () => chevrons(3, 0, '', SILVER), detSergeant: () => chevrons(3, 0, '', SILVER),
  lieutenant: () => pips(2, false, SILVER), detLieutenant: () => pips(2, false, SILVER),
  captain: () => pips(3, false, SILVER), detCaptain: () => pips(3, false, SILVER),
  deputyChief: () => pips(0, true, SILVER), major: () => pips(0, true, SILVER),
  chief_cmd1: () => pips(1, true, SILVER), superintendent_cmd1: () => pips(1, true, SILVER),
  chief_cmd2: () => tipstaves(), chief_cmd3: () => tipstaves(), superintendent_cmd2: () => tipstaves(), superintendent_cmd3: () => tipstaves(),
  chief_cmd4: () => tipstaves('✦'), superintendent_cmd4: () => tipstaves('✦'),
  chief: () => tipstaves('♛'), superintendent: () => tipstaves('♛'),
};

/** German police: blue stars for the middle grades, silver for the upper (gehobener Dienst), gold for the senior (höherer Dienst). */
const DE_POLICE = {
  trooper: () => deStars(1, BLUE), senior: () => deStars(2, BLUE), sergeant: () => deStars(3, BLUE),
  lieutenant: () => deStars(1, SILVER), investigator: () => deStars(2, SILVER), captain: () => deStars(3, SILVER), majorCrimes: () => deStars(3, SILVER), detSergeant: () => deStars(4, SILVER),
  major: () => deStars(1, GOLD), detLieutenant: () => deStars(1, GOLD), superintendent_cmd1: () => deStars(2, GOLD), superintendent_cmd2: () => deStars(3, GOLD), detCaptain: () => deStars(3, GOLD),
  superintendent_cmd3: () => deStars(4, GOLD), superintendent_cmd4: () => DE_DRAW['4star'](), superintendent: () => DE_DRAW['4star'](),
};

/** Indian police below the gazetted ranks: stars. */
const IN_POLICE = { investigator: () => stars(1, SILVER), sergeant: () => stars(2, SILVER), majorCrimes: () => stars(2, SILVER), lieutenant: () => stars(3, SILVER), detSergeant: () => stars(3, SILVER), detLieutenant: () => stars(3, SILVER) };

/**
 * National forces built on a plain-clothes agency's ladder (the RCMP, the Carabinieri, the Gendarmerie,
 * Japan's National Police Agency and Imperial Guard, Italy's Polizia di Stato, the CRPF, the AFP, the UK
 * Border Force): they wear rank, read from the rung's own title. Most specific titles first.
 */
const UNIFORMED_NATIONAL = new Set(['ca_fbi', 'jp_fbi', 'it_fbi', 'au_fbi', 'gb_borderPatrol', 'jp_usss', 'ps_usss', 'it_usms', 'fr_usms', 'in_usms']);
const TITLE_RANK = [
  [/Behavioural|Analyst|Task Force|Close Protection|Tactical Team|trainee|Trainee|Élève|Allievo/, null],
  [/Director-General|Director General|Commissioner|Head of Protection|Chief Superintendent|Deputy Inspector General|Général|Generale|^Questore/, '2star'],
  [/Deputy Director|Director of Operations/, '1star'],
  [/Head of Unit|Colonel|Colonnello|Senior Superintendent|Vice Questore|Superintendent of Police|Deputy Head|^Commander/, 'col'],
  [/Commandant|Chef d'escadron|Maggiore|Deputy Commander|Port Director|Superintendent(?! of)/, 'major'],
  [/Deputy Superintendent|Capitaine|Capitano|Captain|Commissario|Duty Manager|Team Leader|Assistant Inspector|Sub-Inspector/, null],
  [/Ispettore/, 'ssgt'],
  [/Inspector/, 'capt'],
  [/Lieutenant|Tenente|Supervisor/, 'lt'],
  [/Adjudant|Maresciallo|Staff Sergeant|Maréchal des logis-chef|Senior (Border |Protection )?Officer/, 'ssgt'],
  [/Sergeant|Brigadiere|Brigadier/, 'sgt'],
  [/Corporal|Appuntato|Caporal/, 'cpl'],
];
/** Ranks for titles the list above leaves to a second look (company officers below the field ranks). */
const TITLE_RANK_2 = [[/Deputy Superintendent|Capitaine|Capitano|Captain|Commissario|Duty Manager/, 'capt'], [/Team Leader|Assistant Inspector|Sub-Inspector/, 'lt']];
function titleRank(title) {
  const t = String(title ?? '');
  for (const [re, rank] of TITLE_RANK) if (re.test(t)) return rank ?? TITLE_RANK_2.find(([r]) => r.test(t))?.[1] ?? null;
  return null;
}

/** A British fire officer's impellers (a wreath round them for principal officers; a bar beneath for an area manager). */
const impellers = (n, wreath = false, bar = false) => svg(12 + n * 12 + (wreath ? 8 : 0), `${wreath ? `<path d="M4 12 Q2 28 12 32 M${8 + n * 12 + 12} 12 Q${10 + n * 12 + 14} 28 ${n * 12 + 8} 32" fill="none" stroke="${SILVER}" stroke-width="1.6"/>` : ''}${Array.from({ length: n }, (_, i) => `<text x="${(wreath ? 14 : 10) + i * 12}" y="22" font-size="13" text-anchor="middle" fill="${SILVER}">✲</text>`).join('')}${bar ? `<rect x="${wreath ? 8 : 4}" y="26" width="${n * 12 + 4}" height="2.5" fill="${SILVER}"/>` : ''}`);
const epaulettebars = (n) => svg(30, Array.from({ length: n }, (_, i) => `<rect x="5" y="${10 + i * 7}" width="20" height="3.5" rx="1" fill="${SILVER}"/>`).join(''));
/** British fire and rescue roles. */
const GB_FIRE = {
  lieutenant: () => epaulettebars(2), captain: () => impellers(2), battalion: () => impellers(3), deputyChief: () => impellers(1, true),
  chief_cmd1: () => impellers(1, true, true), chief_cmd2: () => impellers(2, true), chief_cmd3: () => impellers(3, true), chief: () => impellers(4, true),
};
/** French, Italian and Spanish-pattern fire services: army galons, in silver. */
const GALON_FIRE = {
  engineer: () => chevrons(2), lieutenant: () => galons(1, SILVER), captain: () => galons(1, GOLD), battalion: () => galons(2, SILVER), deputyChief: () => galons(3, SILVER),
  chief_cmd1: () => galons(4, SILVER), chief_cmd2: () => galons(5), chief_cmd3: () => galons(5, SILVER), chief: () => stars(2, SILVER),
};
/** German-speaking fire services: stars stepping from red (the middle grades) to silver and gold. */
const DE_FIRE = {
  firefighter: () => deStars(1, RED_CHEVRON), engineer: () => deStars(2, RED_CHEVRON), lieutenant: () => deStars(3, RED_CHEVRON), captain: () => deStars(1, SILVER), battalion: () => deStars(2, SILVER),
  deputyChief: () => deStars(1, GOLD), chief_cmd1: () => deStars(2, GOLD), chief_cmd2: () => deStars(3, GOLD), chief_cmd3: () => deStars(4, GOLD), chief: () => deStars(4, GOLD),
};
/** Fire services that wear their country's police or army pattern (Japan, Korea, China, the former Soviet states, India). */
const FIRE_AS_RANK = { lieutenant: 'sgt', captain: 'lt', battalion: 'capt', deputyChief: 'major', chief_cmd1: 'col', chief_cmd2: '1star', chief_cmd3: '2star', chief: '3star' };
const RANKED_FIRE = ['JP', 'KR', 'CN', 'TW', 'IN', 'RU'];
/** The fire insignia for a rung in this country (bugles are the American and Canadian pattern). */
function fireInsignia(id, country) {
  if (['GB', 'IE'].includes(country)) return GB_FIRE[id]?.() ?? null;
  if (['DE', 'AT', 'CH'].includes(country)) return DE_FIRE[id]?.() ?? null;
  if (GALONS.includes(country)) return GALON_FIRE[id]?.() ?? null;
  if (RANKED_FIRE.includes(country) || SHOULDER.includes(country)) return draw(FIRE_AS_RANK[id], country) || null;
  return fireRank(id) ? FIRE_DRAW[fireRank(id)]() : null;
}

/** Insignia for a job, if its people wear rank (null otherwise). */
export function jobInsignia(job, profession, country = 'US') {
  const key = profession?.template ?? profession?.id ?? job?.professionId;
  const id = job?.levelId;
  if (!key || !id) return null;
  if (COLONIAL_RANKS[key]) return colonialInsignia(key, id, country);
  if (RAILWAY[key]) return RAILWAY[key][id]?.() ?? null;
  if (key === 'forester') return ['DE', 'AT', 'CH', 'LI'].includes(country) ? FORESTER[id]?.() ?? null : null;
  if (key === 'nursing') return NURSE_EPAULETTES.includes(country) ? NURSING[id]?.() ?? null : null;
  const own = OWN[key]?.[id];
  if (own) return (typeof own === 'function' ? own() : draw(own, key === 'vaticanGendarmerie' ? 'VA' : country)) || null;
  if (OWN[key]) return null;
  if (STRIPES[key]) return STRIPES[key][id] ? sleeve(STRIPES[key][id], SILVER_STRIPES.includes(key) ? SILVER : GOLD, ENGINEERS.test(id) ? '#7b4fa0' : null) : null;
  // British police: pips and crowns, then a chief officer's crossed tipstaves.
  if (UNIFORMED_NATIONAL.has(profession?.id)) {
    const rank = titleRank(profession.levels.find((l) => l.id === id)?.title);
    // A police corporal wears two chevrons even where the army's corporal pattern draws none.
    return draw(rank, profession.country ?? country) || (rank === 'cpl' ? chevrons(2, 0, '', SILVER) : null);
  }
  // Badges of their day (civilian services changed theirs too).
  const old = periodCivilBadge(key, id, country);
  if (old !== undefined) return old;
  if (POLICE_LIKE.includes(key) && country === 'GB') return GB_POLICE[id]?.() ?? null;
  if (POLICE_LIKE.includes(key) && ['DE', 'AT'].includes(country)) return DE_POLICE[id]?.() ?? null;
  // Brazil's Civil Police (the detective rungs) wear no military rank; India's inspectors wear stars.
  if (POLICE_LIKE.includes(key) && country === 'BR' && profession?.levels?.find((l) => l.id === id)?.track === 'ic') return null;
  if (POLICE_LIKE.includes(key) && country === 'IN' && IN_POLICE[id]) return IN_POLICE[id]();
  // A detective rung with a uniformed rank's title (France's Capitaine, Italy's Commissario) wears that rank.
  if (POLICE_LIKE.includes(key)) {
    const titles = localAgency(country, key)?.titles;
    const base = (t) => String(t ?? '').replace(/\s*\(.*\)$/, '');
    const twin = titles && profession?.levels?.find((l) => l.track === 'mgmt' && l.id !== id && base(titles[l.id]) && base(titles[l.id]) === base(titles[id]));
    if (twin) return draw(policeRank(twin.id, key), country) || null;
  }
  if (POLICE_LIKE.includes(key)) return draw(policeRank(id, key), country) || null;
  if (FIRE_LIKE.includes(key)) return fireInsignia(id, country);
  if (EMS_LIKE.includes(key)) return draw(emsRank(id), country) || null;
  return null;
}

/* --- civilian ranks of their day ----------------------------------- */
/** An American officer's breast shield before collar insignia (to about 1900): gold, with his rank's bars on it. */
const officerShield = (n = 1, color = GOLD) => svg(30, `<path d="M15 3 L26 7 V17 Q26 27 15 32 Q4 27 4 17 V7 Z" fill="${color}" stroke="#7a5a10" stroke-width=".8"/>${Array.from({ length: n }, (_, i) => `<rect x="${15 - (n * 4 - 1.5) + i * 8}" y="12" width="5" height="12" rx="1" fill="#fff8e0"/>`).join('')}`, 36);
/** British police officers' cuff braid before shoulder pips (to about 1930): silver rings. */
const cuffBraid = (n) => svg(36, Array.from({ length: n }, (_, i) => `<rect x="3" y="${10 + i * 6}" width="30" height="3" rx="1" fill="${SILVER}"/>`).join(''));
/** A fireman's rank before bugles (to about 1870, the volunteer companies): a foreman's speaking-trumpet badge. */
const BRITISH_POLICE = ['GB', 'IE', 'AU', 'NZ'];
function periodCivilBadge(key, id, country) {
  const y = eraYear();
  if (y >= PRESENT) return undefined;
  const us = !['GB', 'IE', 'AU', 'NZ', 'DE', 'AT', 'FR', 'IT', 'ES', 'IN', 'BR', 'JP', 'CN', 'KR', 'RU'].includes(country);
  if (POLICE_LIKE.includes(key)) {
    // America before about 1900: sergeants wore chevrons; officers a gold shield on the breast.
    if (us && y < 1900) {
      const r = policeRank(id, key);
      if (!r || ['cpl', 'sgt', 'ssgt'].includes(r)) return undefined;
      return officerShield({ lt: 1, capt: 2, major: 3 }[r] ?? 3);
    }
    // British police before about 1930: inspectors and above wore braid on the cuff, not pips.
    if (BRITISH_POLICE.includes(country) && y < 1930) {
      const n = { lieutenant: 1, detLieutenant: 1, captain: 2, detCaptain: 2, deputyChief: 3, major: 3, chief_cmd1: 3, superintendent_cmd1: 3 }[id] ?? (/^(chief|superintendent)/.test(id) ? 4 : 0);
      return n ? cuffBraid(n) : undefined;
    }
  }
  if (FIRE_LIKE.includes(key) && us && y < 1870) {
    // The volunteer companies: the foreman carried a speaking trumpet; the chief engineer a gilt one.
    const r = FIRE_AS_RANK[id];
    if (!r) return undefined;
    return ['sgt', 'lt', 'capt'].includes(r) ? FIRE_DRAW.f1() : FIRE_DRAW.f2();
  }
  return undefined;
}

/** Volunteer emergency services: the ranks that wear insignia (by rank index), on the country's pattern. */
const VOLUNTEER = {
  fire: { 4: () => FIRE_DRAW.f1(), 5: () => FIRE_DRAW.f2(), 6: () => FIRE_DRAW.f5() },
  ambulance: { 3: 'sgt', 4: 'lt', 5: 'capt', 6: 'major' },
  police: { 3: 'cpl', 4: 'sgt', 5: 'lt', 6: 'capt' },
  // Coast Guard Auxiliary officers wear silver lace on the Coast Guard pattern.
  auxiliary: { 3: () => sleeve(2, SILVER), 4: () => sleeve(3, SILVER) },
  cap: { 1: () => chevrons(3, 1, '', SILVER) },
};
export function volunteerInsignia(serviceId, rankIndex, cc = 'US') {
  const r = VOLUNTEER[serviceId]?.[rankIndex];
  if (!r) return '';
  return typeof r === 'function' ? r() : draw(r, cc);
}

/** For the insignia sheet: a rank key drawn in a country's style. */
export const rankInsignia = (rank, cc = 'US') => (rank?.startsWith('f') ? FIRE_DRAW[rank]?.() ?? '' : draw(rank, cc));

/** Honorary and royal military ranks come as titles ("Honorary Colonel", "Air Vice-Marshal"): the rank's insignia, on the country's pattern. */
const TITLE_GRADE = [
  // Most specific first: "Rear Admiral" and "Lieutenant General" also contain the four-star words.
  [/Field Marshal|Admiral of the Fleet|Marshal of the Royal Air Force/, 11],
  [/Lieutenant General|Vice Admiral|Air Marshal/, 9], [/Major General|Rear Admiral|Air Vice-Marshal/, 8], [/Air Chief Marshal|(^|\s)General(?! Officer)|(^|\s)Admiral/, 10], [/Brigadier|Commodore|Air Commodore/, 7],
  [/Lieutenant Colonel|Wing Commander|(^|\s)Commander/, 5], [/Colonel|Captain \(Navy\)|Group Captain|Honorary Captain/, 6], [/Major|Squadron Leader|Lieutenant Commander/, 4],
  [/Captain|Flight Lieutenant|(^|\s)Lieutenant/, 3],
];
export function titleInsignia(title, cc = 'US') {
  const hit = TITLE_GRADE.find(([re]) => re.test(title ?? ''));
  if (!hit) return '';
  const commonwealth = COMMONWEALTH.includes(cc) || SHOULDER.includes(cc);
  const naval = /Admiral|(^|\s)Commodore|Captain \(Navy\)|Lieutenant Commander|(^|\s)Commander(?!.*Air)|Navy|Naval/.test(title) && !/Air Commodore|Wing Commander/.test(title);
  const air = /Air (Chief |Vice-)?Marshal|Air Commodore|Group Captain|Wing Commander|Squadron Leader|Flight Lieutenant|Royal Air Force/.test(title);
  if (hit[1] === 11 && !commonwealth && !naval && !air) return stars(5, GOLD);
  return militaryInsignia(`${commonwealth ? 'OF' : 'O'}-${hit[1]}`, cc, { branch: naval ? 'navy' : air ? 'airforce' : null });
}
