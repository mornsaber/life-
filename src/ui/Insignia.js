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
const pips = (n, crown = false, color = GOLD) => svg(10 + (n + (crown ? 1 : 0)) * 12, `${crown ? `<text x="11" y="23" font-size="15" text-anchor="middle" fill="${color}">♛</text>` : ''}${Array.from({ length: n }, (_, i) => `<text x="${(crown ? 23 : 11) + i * 12}" y="23" font-size="13" text-anchor="middle" fill="${color}">✦</text>`).join('')}`);
const swordBaton = (extra = '') => svg(38, `<path d="M8 28 L30 6 M30 28 L8 6" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>${extra}`);
/** A fire service bugle (speaking trumpet): mouthpiece, tube and bell. */
const bugle = (x, y, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M-11 -1.5 L5 -2.5 L11 -7 L11 7 L5 2.5 L-11 1.5 Z" fill="${GOLD}"/><rect x="-13" y="-2.5" width="3" height="5" rx="1" fill="${GOLD}"/></g>`;
const bugles = (n, crossed = false) => {
  if (!crossed) return svg(n * 11 + 10, Array.from({ length: n }, (_, i) => bugle(10 + i * 11, 17, -90)).join(''));
  const extra = Math.max(0, n - 2);
  return svg(34 + extra * 10, `${bugle(17, 17, -45)}${bugle(17, 17, 45)}${Array.from({ length: extra }, (_, i) => bugle(36 + i * 10, 17, -90)).join('')}`);
};
/* --- military ------------------------------------------------------- */
const COMMONWEALTH = ['GB', 'AU', 'NZ', 'CA', 'IN', 'PK', 'ZA', 'IE', 'SG', 'MY', 'NG', 'KE', 'GH'];

/** Insignia for a military rank code (E-5, O-6, W-3, OR-6, OF-3), on its nation's pattern. */
export function militaryInsignia(code, nation = null) {
  const m = /^(E|W|O|OR|OF)-(\d+)/.exec(code ?? '');
  if (!m) return '';
  const n = Number(m[2]);
  const commonwealth = COMMONWEALTH.includes(nation ?? '');
  if (m[1] === 'OF' && commonwealth) {
    // Second lieutenant to brigadier: pips and crowns; generals: crossed sword and baton.
    // Major-general a pip, lieutenant-general a crown, general a crown and pip, over the crossed sword and baton.
    if (n >= 7) return swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${GOLD}">${['✦', '♛', '♛✦', '♛'][Math.min(3, n - 7)]}</text>`);
    return [pips(1), pips(1), pips(3), pips(0, true), pips(1, true), pips(2, true), pips(3, true)][n];
  }
  const kind = m[1] === 'OR' ? 'E' : m[1] === 'OF' ? 'O' : m[1];
  const g = m[1] === 'OF' ? Math.min(11, n + 1) : n;
  if (kind === 'E') {
    if (commonwealth && g >= 8) return svg(30, `<text x="15" y="25" font-size="20" text-anchor="middle" fill="${GOLD}">${g >= 9 ? '⚜' : '♛'}</text>`);
    return ['', chevrons(1), chevrons(1, 1), chevrons(2), chevrons(3), chevrons(3, 1), chevrons(3, 2), chevrons(3, 3, 'diamond'), chevrons(3, 3, 'star')][Math.max(0, g - 1)] ?? chevrons(3, 3, 'star');
  }
  if (kind === 'W') return warrant(Math.max(1, g));
  // Officers: O-1 gold bar … O-10 four stars, five stars above.
  return [bars(1, GOLD), bars(1, SILVER), bars(2, SILVER), leaf(GOLD), leaf(SILVER), eagle(), stars(1), stars(2), stars(3), stars(4), stars(5, GOLD)][Math.max(0, g - 1)] ?? stars(5, GOLD);
}

/* --- police and fire ------------------------------------------------ */
const UK_STYLE = ['GB', 'IE', 'AU', 'NZ', 'SG', 'MY', 'IN', 'HK'];

/** Insignia from a uniformed job's title (police, sheriff, corrections, fire, EMS). */
export function serviceInsignia(title, kind, country = 'US') {
  const t = (title ?? '').toLowerCase();
  if (kind === 'fire') {
    if (/\bchief\b/.test(t) && !/battalion|deputy|assistant|division/.test(t)) return bugles(5, true);
    if (/deputy|assistant|division/.test(t) && /chief/.test(t)) return bugles(4, true);
    if (/battalion|district chief|station commander|group manager/.test(t)) return bugles(2, true);
    if (/captain|watch manager|crew manager/.test(t)) return bugles(2);
    if (/lieutenant|sub-officer|leading/.test(t)) return bugles(1);
    if (/engineer|driver|senior firefighter/.test(t)) return chevrons(2, 0, '', '#c8102e');
    return '';
  }
  // Police, sheriffs, corrections and the like.
  if (UK_STYLE.includes(country)) {
    if (/chief constable|commissioner/.test(t)) return swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${SILVER}">♛</text>`);
    if (/deputy chief|assistant chief|commander/.test(t)) return swordBaton();
    if (/chief superintendent/.test(t)) return pips(1, true, SILVER);
    if (/superintendent/.test(t)) return pips(0, true, SILVER);
    if (/chief inspector/.test(t)) return pips(3, false, SILVER);
    if (/inspector/.test(t)) return pips(2, false, SILVER);
    if (/sergeant/.test(t)) return chevrons(3, 0, '', SILVER);
    return '';
  }
  if (/^chief|sheriff$|^sheriff|commissioner|superintendent/.test(t) && !/deputy|assistant/.test(t)) return stars(4, GOLD);
  if (/deputy chief|undersheriff|assistant chief|deputy commissioner/.test(t)) return stars(2, GOLD);
  if (/inspector|commander/.test(t)) return stars(1, GOLD);
  if (/colonel/.test(t)) return eagle();
  if (/major/.test(t)) return leaf(GOLD);
  if (/captain|warden/.test(t)) return bars(2, GOLD);
  if (/lieutenant/.test(t)) return bars(1, GOLD);
  if (/sergeant/.test(t)) return chevrons(3, 0, '', SILVER);
  if (/corporal/.test(t)) return chevrons(2, 0, '', SILVER);
  return '';
}

const POLICE_LIKE = ['police', 'sheriff', 'statePolice', 'transitPolice', 'airportPolice', 'universityPolice', 'privatePolice', 'borderPatrol', 'corrections', 'jail', 'federalPrisons', 'privatePrisons', 'gameWarden', 'parkService', 'vaticanGendarmerie', 'gurkhaContingent'];
const FIRE_LIKE = ['fire', 'airportFire', 'stateFire', 'privateFire', 'ems', 'privateEms'];

/** Insignia for a civilian job, if its people wear rank (null otherwise). */
export function jobInsignia(job, profession, country = 'US') {
  const key = profession?.template ?? profession?.id ?? job?.professionId;
  if (POLICE_LIKE.includes(key) || /police/.test(key ?? '')) return serviceInsignia(job.title, 'police', country) || null;
  if (FIRE_LIKE.includes(key) || /fire/.test(key ?? '')) return serviceInsignia(job.title, 'fire', country) || null;
  return null;
}
