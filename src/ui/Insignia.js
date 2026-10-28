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
const UK_STYLE = ['GB', 'IE', 'AU', 'NZ', 'SG', 'MY', 'IN', 'HK', 'CA', 'PK', 'KE', 'NG', 'GH', 'ZA'];
const GALONS = ['FR', 'IT', 'ES', 'BE', 'PT', 'LU', 'MC', 'MX', 'BR', 'AR', 'CO', 'PE', 'CL', 'VA', 'CH'];

/** A row of shoulder stripes (galons, or a pilot's / ship's officer's bars). */
const galons = (n, color = GOLD) => svg(34, Array.from({ length: n }, (_, i) => `<rect x="5" y="${6 + i * 5}" width="24" height="3" rx="1" fill="${i === 1 && n === 5 ? SILVER : color}"/>`).join(''));
const sleeve = (n, color = GOLD) => svg(34, Array.from({ length: n }, (_, i) => `<rect x="4" y="${26 - i * 6}" width="26" height="3.4" rx="1" fill="${color}"/>`).join(''));

/** Rank keys: sgt, ssgt (senior NCO), lt, capt, major, col, 1star…4star; fire: f1…f5. */
const CMD = (id) => { const m = /_cmd(\d)$/.exec(id); return m ? Number(m[1]) : 0; };
const TOP = /^(chief|superintendent|undersheriff|administrator|director|regional|usMarshal|chiefPatrol|fsd)$/;
function policeRank(id, key) {
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
const US_DRAW = { sgt: () => chevrons(3, 0, '', SILVER), ssgt: () => chevrons(3, 1, '', SILVER), lt: () => bars(1, GOLD), capt: () => bars(2, GOLD), major: () => leaf(GOLD), col: () => eagle(), '1star': () => stars(1, GOLD), '2star': () => stars(2, GOLD), '3star': () => stars(3, GOLD), '4star': () => stars(4, GOLD) };
const UK_DRAW = { sgt: () => chevrons(3, 0, '', SILVER), ssgt: () => chevrons(3, 0, 'star', SILVER), lt: () => pips(2, false, SILVER), capt: () => pips(3, false, SILVER), major: () => pips(0, true, SILVER), col: () => pips(1, true, SILVER), '1star': () => swordBaton(), '2star': () => swordBaton(), '3star': () => swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${SILVER}">✦</text>`), '4star': () => swordBaton(`<text x="19" y="33" font-size="9" text-anchor="middle" fill="${SILVER}">♛</text>`) };
const GALON_DRAW = { sgt: () => chevrons(2), ssgt: () => chevrons(3), lt: () => galons(2), capt: () => galons(3), major: () => galons(4), col: () => galons(5), '1star': () => stars(2, GOLD), '2star': () => stars(3, GOLD), '3star': () => stars(3, GOLD), '4star': () => stars(4, GOLD) };
const FIRE_DRAW = { f1: () => bugles(1), f2: () => bugles(2), f2x: () => bugles(2, true), f3: () => bugles(3, true), f4: () => bugles(4, true), f5: () => bugles(5, true) };
const draw = (rank, cc) => {
  if (!rank) return '';
  const table = UK_STYLE.includes(cc) ? UK_DRAW : GALONS.includes(cc) ? GALON_DRAW : US_DRAW;
  return (table[rank] ?? US_DRAW[rank])?.() ?? '';
};

const POLICE_LIKE = ['police', 'sheriff', 'statePolice', 'transitPolice', 'airportPolice', 'universityPolice', 'privatePolice', 'borderPatrol', 'corrections', 'jail', 'federalPrisons', 'privatePrisons', 'gameWarden'];
const FIRE_LIKE = ['fire', 'airportFire', 'stateFire', 'privateFire'];
const EMS_LIKE = ['ems', 'privateEms'];
/** Officers' stripes at sea and in the air (deck and engine; first officers and captains). */
const STRIPES = {
  merchantMarine: { thirdMate: 1, thirdAE: 1, firstAE: 3, chiefMate: 3, chiefEngineer: 4, master: 4, portCaptain: 4 },
  cruise: { asstCd: 2, cruiseDirector: 3, hotelDirector: 4, vpHotelOps: 4, maitred: 2 },
  aviation: { cfi: 2, fo: 3, majorFo: 3, captain: 4, majorCaptain: 4, widebodyCaptain: 4, checkAirman: 4, chiefPilot: 4, dfo: 4 },
  charterAviation: { charterFo: 3, cargoFo: 3, charterCaptain: 4, cargoCaptain: 4, corporatePilot: 4, leadPilot: 4, flightDeptManager: 4 },
  tsa: { officer: 2, lead: 3, bdo: 3, inspector: 3, supervisor: 4, manager: 4 },
};
/** Ranks of the Vatican's and Singapore's own services, and the Swiss Guard. */
const OWN = {
  vaticanGendarmerie: { viceBrigadier: 'sgt', brigadier: 'ssgt', inspector: 'lt', viceCommissioner: 'capt', commissioner: 'major', commandant: 'col' },
  swissGuard: { viceCorporal: () => chevrons(1), corporal: () => chevrons(2), sergeant: () => chevrons(3), sergeantMajor: () => chevrons(3, 1), lieutenant: () => galons(2), captain: () => galons(3), ltColonel: () => galons(4), commandant: () => galons(5) },
  gurkhaContingent: { corporal: () => chevrons(2, 0, '', SILVER), sergeant: () => chevrons(3, 0, '', SILVER), staffSergeant: () => chevrons(3, 0, 'star', SILVER), seniorStaffSergeant: () => chevrons(3, 1, 'star', SILVER), stationInspector: () => pips(2, false, SILVER), asp: () => pips(3, false, SILVER), dsp: () => pips(0, true, SILVER) },
  privateSecurity: { supervisor: () => chevrons(3, 0, '', SILVER), siteManager: () => bars(2, SILVER) },
};

/** Insignia for a job, if its people wear rank (null otherwise). */
export function jobInsignia(job, profession, country = 'US') {
  const key = profession?.template ?? profession?.id ?? job?.professionId;
  const id = job?.levelId;
  if (!key || !id) return null;
  const own = OWN[key]?.[id];
  if (own) return (typeof own === 'function' ? own() : draw(own, key === 'vaticanGendarmerie' ? 'VA' : country)) || null;
  if (OWN[key]) return null;
  if (STRIPES[key]) return STRIPES[key][id] ? sleeve(STRIPES[key][id], key === 'tsa' ? SILVER : GOLD) : null;
  if (POLICE_LIKE.includes(key)) return draw(policeRank(id, key), country) || null;
  if (FIRE_LIKE.includes(key)) return fireRank(id) ? FIRE_DRAW[fireRank(id)]() : null;
  if (EMS_LIKE.includes(key)) return draw(emsRank(id), country) || null;
  return null;
}

/** For the insignia sheet: a rank key drawn in a country's style. */
export const rankInsignia = (rank, cc = 'US') => (rank?.startsWith('f') ? FIRE_DRAW[rank]?.() ?? '' : draw(rank, cc));
