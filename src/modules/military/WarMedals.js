/**
 * The medals of the wars of history (world/History.js), by country: what a veteran of the
 * Great War or the Second World War actually wore. Each has its ribbon colours (stripes,
 * left to right, [colour, width]); a victory medal goes only to the winning side.
 *
 *   warMedals(warId, cc, won) → [{ name, ribbon, prestige }]
 */
import { WARS } from '../world/data/wars.js';
import { addHonor } from '../../core/State.js';
import { colonyHere } from '../world/Eras.js';
import { COUNTRIES } from '../world/Countries.js';

const R = (...s) => s.map((x) => (Array.isArray(x) ? x : [x, 1]));
const RAINBOW = R('#d0021b', '#f5a623', '#f8e71c', '#7ed321', '#4a90e2', '#9013fe', '#4a90e2', '#7ed321', '#f8e71c', '#f5a623', '#d0021b'); // the Inter-Allied Victory ribbon
const GB_WW1 = [
  { name: '1914–15 Star', ribbon: R('#d0021b', '#ffffff', '#1f3f8f'), prestige: 3 },
  { name: 'British War Medal', ribbon: R('#f5a623', '#ffffff', '#000000', '#1f3f8f', ['#f5a623', 3], '#1f3f8f', '#000000', '#ffffff', '#f5a623'), prestige: 3 },
];
const GB_WW2 = [
  { name: '1939–45 Star', ribbon: R('#1f3f8f', ['#d0021b', 1], '#4a90e2'), prestige: 3 },
  { name: 'Defence Medal', ribbon: R('#f5a623', ['#2e7d32', 3], '#000000', ['#2e7d32', 3], '#f5a623'), prestige: 2 },
  { name: 'War Medal 1939–1945', ribbon: R('#d0021b', '#1f3f8f', '#ffffff', ['#d0021b', 2], '#ffffff', '#1f3f8f', '#d0021b'), prestige: 3 },
];

export const WAR_MEDALS = {
  napoleonicWars: {
    GB: [{ name: 'Military General Service Medal', ribbon: R('#d0021b', ['#1f3f8f', 2], '#d0021b'), prestige: 3 }],
    FR: [{ name: 'Médaille de Sainte-Hélène', ribbon: R('#2e7d32', '#d0021b', '#2e7d32', '#d0021b', '#2e7d32'), prestige: 3 }],
    '*': [{ name: 'Campaign Medal 1813–1815', ribbon: R('#f5a623', '#000000', '#f5a623'), prestige: 3 }],
    victory: { name: 'Waterloo Medal', ribbon: R('#d0021b', ['#1f3f8f', 3], '#d0021b'), prestige: 4 },
  },
  crimeanWar: {
    GB: [{ name: 'Crimea Medal', ribbon: R('#4a90e2', ['#f8e71c', 1], '#4a90e2'), prestige: 3 }], TR: [{ name: 'Turkish Crimea Medal', ribbon: R('#d0021b', '#2e7d32', '#d0021b'), prestige: 3 }],
    FR: [{ name: 'Médaille de Crimée', ribbon: R('#4a90e2', '#f8e71c', '#4a90e2'), prestige: 3 }], '*': [{ name: 'Crimean War Medal', ribbon: R('#000000', '#f5a623', '#000000'), prestige: 3 }],
  },
  usCivilWar: { '*': [{ name: 'Civil War Campaign Medal', ribbon: R('#1f3f8f', ['#9e9e9e', 2], '#1f3f8f'), prestige: 3 }] },
  indianRebellion: { '*': [{ name: 'Indian Mutiny Medal', ribbon: R('#ffffff', '#d0021b', '#ffffff', '#d0021b', '#ffffff'), prestige: 3 }] },
  boerWar: { GB: [{ name: 'Queen\'s South Africa Medal', ribbon: R('#d0021b', '#1f3f8f', ['#f5a623', 2], '#1f3f8f', '#d0021b'), prestige: 3 }], CA: [{ name: 'Queen\'s South Africa Medal', ribbon: R('#d0021b', '#1f3f8f', ['#f5a623', 2], '#1f3f8f', '#d0021b'), prestige: 3 }], AU: [{ name: 'Queen\'s South Africa Medal', ribbon: R('#d0021b', '#1f3f8f', ['#f5a623', 2], '#1f3f8f', '#d0021b'), prestige: 3 }], NZ: [{ name: 'Queen\'s South Africa Medal', ribbon: R('#d0021b', '#1f3f8f', ['#f5a623', 2], '#1f3f8f', '#d0021b'), prestige: 3 }], '*': [] },
  spanishAmericanWar: { US: [{ name: 'Spanish Campaign Medal', ribbon: R('#f8e71c', ['#d0021b', 1], '#f8e71c', '#1f3f8f'), prestige: 3 }], '*': [] },
  mexicanAmericanWar: { US: [{ name: 'Mexican War Service Medal', ribbon: R('#2e7d32', '#ffffff', '#d0021b'), prestige: 3 }], '*': [] },
  ww1: {
    GB: GB_WW1, CA: GB_WW1, AU: GB_WW1, NZ: GB_WW1, IN: GB_WW1, IE: GB_WW1,
    US: [{ name: 'World War I Victory Medal', ribbon: RAINBOW, prestige: 3, victory: true }],
    FR: [{ name: 'Médaille commémorative de la guerre 1914–1918', ribbon: R('#d0021b', '#ffffff', '#d0021b', '#ffffff', '#d0021b'), prestige: 3 }],
    IT: [{ name: 'Medaglia commemorativa della guerra 1915–1918', ribbon: R('#d0021b', '#ffffff', '#2e7d32', '#ffffff', '#d0021b'), prestige: 3 }],
    DE: [{ name: 'Ehrenkreuz des Weltkrieges', ribbon: R('#000000', '#ffffff', ['#d0021b', 3], '#ffffff', '#000000'), prestige: 3 }],
    AT: [{ name: 'Kriegserinnerungsmedaille', ribbon: R('#d0021b', '#ffffff', '#d0021b', '#ffffff', '#d0021b'), prestige: 3 }],
    RU: [{ name: 'Medal "For Zeal"', ribbon: R('#d0021b', '#f5a623'), prestige: 2 }],
    '*': [{ name: 'Great War Service Medal', ribbon: R('#5d4037', '#ffffff', '#5d4037'), prestige: 3 }],
    victory: { name: 'Victory Medal (Inter-Allied)', ribbon: RAINBOW, prestige: 3 },
  },
  ww2: {
    GB: GB_WW2, AU: [...GB_WW2, { name: 'Australia Service Medal 1939–45', ribbon: R('#1f3f8f', '#d0021b', '#ffffff', '#d0021b', '#1f3f8f'), prestige: 2 }],
    NZ: [...GB_WW2, { name: 'New Zealand War Service Medal', ribbon: R('#000000', ['#ffffff', 3], '#000000'), prestige: 2 }],
    CA: [...GB_WW2, { name: 'Canadian Volunteer Service Medal', ribbon: R('#2e7d32', '#d0021b', '#1f3f8f', '#d0021b', '#2e7d32'), prestige: 2 }], IN: GB_WW2,
    US: [{ name: 'American Campaign Medal', ribbon: R('#4a90e2', '#ffffff', '#d0021b', '#ffffff', '#000000', '#ffffff', '#d0021b', '#ffffff', '#4a90e2'), prestige: 2 },
      { name: 'European–African–Middle Eastern Campaign Medal', ribbon: R('#5d4037', '#2e7d32', '#ffffff', '#d0021b', '#ffffff', '#2e7d32', '#5d4037'), prestige: 3 }],
    FR: [{ name: 'Médaille commémorative de la guerre 1939–1945', ribbon: R('#d0021b', '#ffffff', '#1f3f8f', '#ffffff', '#d0021b'), prestige: 3 }],
    RU: [{ name: 'Medal "For the Victory over Germany"', ribbon: R('#f5a623', '#000000', '#f5a623', '#000000', '#f5a623'), prestige: 3, victory: true }],
    PL: [{ name: 'Krzyż Walecznych', ribbon: R('#d0021b', '#ffffff', '#d0021b'), prestige: 4 }],
    '*': [{ name: 'War Service Medal 1939–1945', ribbon: R('#1f3f8f', '#ffffff', '#1f3f8f'), prestige: 3 }],
    victory: { name: 'World War II Victory Medal', ribbon: RAINBOW, prestige: 3 },
  },
  koreanWar: {
    GB: [{ name: 'Korea Medal', ribbon: R('#f5a623', '#4a90e2', '#f5a623', '#4a90e2', '#f5a623'), prestige: 3 }],
    CA: [{ name: 'Canadian Korea Medal', ribbon: R('#f5a623', '#4a90e2', '#f5a623'), prestige: 3 }],
    AU: [{ name: 'Korea Medal', ribbon: R('#f5a623', '#4a90e2', '#f5a623', '#4a90e2', '#f5a623'), prestige: 3 }],
    NZ: [{ name: 'Korea Medal', ribbon: R('#f5a623', '#4a90e2', '#f5a623', '#4a90e2', '#f5a623'), prestige: 3 }],
    US: [{ name: 'Korean Service Medal', ribbon: R('#4a90e2', '#ffffff', '#4a90e2'), prestige: 3 }],
    '*': [],
    common: { name: 'United Nations Korea Medal', ribbon: R('#4a90e2', '#ffffff', '#4a90e2', '#ffffff', '#4a90e2', '#ffffff', '#4a90e2'), prestige: 2 },
  },
  vietnamWar: {
    US: [{ name: 'Vietnam Service Medal', ribbon: R('#f8e71c', '#2e7d32', '#f8e71c', '#d0021b', '#f8e71c', '#d0021b', '#f8e71c', '#2e7d32', '#f8e71c'), prestige: 3 }],
    AU: [{ name: 'Vietnam Medal', ribbon: R('#f8e71c', '#d0021b', '#f8e71c', '#4a90e2'), prestige: 3 }],
    NZ: [{ name: 'Vietnam Medal', ribbon: R('#f8e71c', '#d0021b', '#f8e71c', '#4a90e2'), prestige: 3 }],
    KR: [{ name: 'Vietnam War Service Medal', ribbon: R('#f8e71c', '#d0021b', '#f8e71c'), prestige: 3 }],
    '*': [],
    common: { name: 'Republic of Vietnam Campaign Medal', ribbon: R('#2e7d32', '#ffffff', ['#2e7d32', 3], '#ffffff', '#2e7d32'), prestige: 2 },
  },
  afghanistan: {
    US: [{ name: 'Afghanistan Campaign Medal', ribbon: R('#2e7d32', '#ffffff', '#d0021b', '#000000', '#d0021b', '#ffffff', '#2e7d32'), prestige: 3 }],
    GB: [{ name: 'Operational Service Medal (Afghanistan)', ribbon: R('#d0021b', '#1f3f8f', '#5d4037', '#1f3f8f', '#d0021b'), prestige: 3 }],
    CA: [{ name: 'General Campaign Star (South-West Asia)', ribbon: R('#f5a623', '#d0021b', '#f5a623'), prestige: 3 }],
    AU: [{ name: 'Afghanistan Medal', ribbon: R('#000000', '#d0021b', '#2e7d32', '#d0021b', '#000000'), prestige: 3 }],
    '*': [],
    common: { name: 'NATO Medal (ISAF)', ribbon: R('#1f3f8f', '#ffffff', ['#1f3f8f', 3], '#ffffff', '#1f3f8f'), prestige: 2 },
  },
  greatPowerWar: {
    '*': [{ name: 'Pacific War Service Medal', ribbon: R('#1f3f8f', '#ffffff', '#d0021b', '#ffffff', '#1f3f8f'), prestige: 3 }],
    victory: { name: 'Pacific Victory Medal', ribbon: RAINBOW, prestige: 3 },
  },
  gulfWar: {
    US: [{ name: 'Southwest Asia Service Medal', ribbon: R('#c8a165', '#000000', '#c8a165', '#ffffff', '#d0021b', '#ffffff', '#1f3f8f', '#2e7d32', '#c8a165'), prestige: 3 }],
    GB: [{ name: 'Gulf Medal', ribbon: R('#c8a165', '#1f3f8f', '#d0021b', '#1f3f8f', '#c8a165'), prestige: 3 }],
    FR: [{ name: 'Médaille commémorative française (Moyen-Orient)', ribbon: R('#c8a165', '#1f3f8f', '#ffffff', '#d0021b', '#c8a165'), prestige: 3 }],
    CA: [{ name: 'Gulf and Kuwait Medal', ribbon: R('#c8a165', '#d0021b', '#ffffff', '#2e7d32', '#000000', '#c8a165'), prestige: 3 }],
    AU: [{ name: 'Australian Active Service Medal (Kuwait)', ribbon: R('#2e7d32', '#f5a623', '#d0021b', '#f5a623', '#2e7d32'), prestige: 3 }],
    '*': [],
    common: { name: 'Kuwait Liberation Medal (Saudi Arabia)', ribbon: R('#2e7d32', '#ffffff', '#2e7d32', '#ffffff', '#2e7d32'), prestige: 2 },
  },
  iraqWar: {
    US: [{ name: 'Iraq Campaign Medal', ribbon: R('#2e7d32', '#ffffff', '#000000', '#d0021b', '#c8a165', '#d0021b', '#000000', '#ffffff', '#2e7d32'), prestige: 3 }],
    GB: [{ name: 'Iraq Medal', ribbon: R('#c8a165', '#000000', '#d0021b', '#1f3f8f', '#d0021b', '#000000', '#c8a165'), prestige: 3 }],
    AU: [{ name: 'Iraq Medal', ribbon: R('#c8a165', '#000000', '#d0021b', '#000000', '#c8a165'), prestige: 3 }],
    '*': [],
  },
  kosovo: {
    US: [{ name: 'Kosovo Campaign Medal', ribbon: R('#1f3f8f', '#d0021b', '#ffffff', '#d0021b', '#1f3f8f'), prestige: 3 }],
    '*': [],
    common: { name: 'NATO Medal (Kosovo)', ribbon: R('#1f3f8f', '#ffffff', '#1f3f8f', '#ffffff', '#1f3f8f'), prestige: 2 },
  },
  falklands: { GB: [{ name: 'South Atlantic Medal', ribbon: R('#4a90e2', '#ffffff', '#2e7d32', '#ffffff', '#4a90e2'), prestige: 3 }], '*': [] },
  boxer: {
    GB: [{ name: 'China War Medal (1900)', ribbon: R('#d0021b', '#f5a623', '#d0021b'), prestige: 3 }],
    US: [{ name: 'China Relief Expedition Medal', ribbon: R('#f8e71c', '#1f3f8f', '#f8e71c'), prestige: 3 }],
    DE: [{ name: 'China-Denkmünze', ribbon: R('#f5a623', '#000000', '#ffffff', '#d0021b', '#f5a623'), prestige: 3 }],
    FR: [{ name: 'Médaille commémorative de l\'expédition de Chine', ribbon: R('#f8e71c', '#2e7d32', '#f8e71c'), prestige: 3 }],
    '*': [],
  },
  francoPrussian: {
    DE: [{ name: 'Kriegsdenkmünze für 1870/71', ribbon: R('#000000', '#ffffff', '#d0021b', '#ffffff', '#000000'), prestige: 3 }],
    FR: [{ name: 'Médaille commémorative de la guerre 1870–1871', ribbon: R('#2e7d32', '#000000', '#2e7d32', '#000000', '#2e7d32'), prestige: 3 }],
    '*': [],
  },
  russoJapanese: {
    JP: [{ name: 'Meiji 37–38 War Medal', ribbon: R('#ffffff', '#2e7d32', '#ffffff'), prestige: 3 }],
    RU: [{ name: 'Medal "In Memory of the Russo-Japanese War"', ribbon: R('#f5a623', '#000000', '#ffffff'), prestige: 3 }],
    '*': [],
  },
  suez: {
    GB: [{ name: 'General Service Medal (clasp: Near East)', ribbon: R('#8b0a1d', '#1f6f43', '#8b0a1d'), prestige: 3 }],
    FR: [{ name: 'Médaille commémorative des opérations du Moyen-Orient', ribbon: R('#c8a165', '#2e7d32', '#c8a165'), prestige: 3 }],
    '*': [],
  },
  egypt1882: {
    GB: [{ name: 'Egypt Medal', ribbon: R('#1f3f8f', '#ffffff', '#1f3f8f', '#ffffff', '#1f3f8f'), prestige: 3 }, { name: 'Khedive\'s Star', ribbon: R('#1f3f8f'), prestige: 2 }],
    '*': [],
  },
  spanishCivilWar: {
    '*': [{ name: 'Medalla de la Campaña 1936–1939', ribbon: R('#d0021b', '#f8e71c', '#d0021b'), prestige: 3 }],
  },
};

/** The wars of the data (cow.N) under the medal tables' names. */
const COW_MEDAL_KEYS = [
  [/^World War I$/, 'ww1'], [/^World War II$/, 'ww2'], [/^Korean$/, 'koreanWar'], [/^Vietnam\b|Second Laotian|Communist Coalition/, 'vietnamWar'], [/^Crimean$/, 'crimeanWar'],
  [/^Mexican-American$/, 'mexicanAmericanWar'], [/^Spanish-American$/, 'spanishAmericanWar'], [/Invasion of Afghanistan/, 'afghanistan'], [/Invasion of Iraq/, 'iraqWar'], [/^Gulf War$/, 'gulfWar'],
  [/War for Kosovo/, 'kosovo'], [/Falkland/, 'falklands'], [/Boxer/, 'boxer'], [/Franco-Prussian/, 'francoPrussian'], [/Russo-Japanese/, 'russoJapanese'], [/Sinai War/, 'suez'], [/Conquest of Egypt/, 'egypt1882'],
];
const COW_BY_ID = new Map(WARS.map((w) => [`cow.${w.id}`, w]));
/** The medal table's key for a war id (the scripted 'ww1', or a data war by its name). */
export function warMedalKey(warId) {
  if (!warId) return null;
  if (WAR_MEDALS[warId]) return warId;
  const w = COW_BY_ID.get(warId);
  return w ? COW_MEDAL_KEYS.find(([re]) => re.test(w.name))?.[1] ?? null : null;
}

/** The medals for a war, for your country; the victory medal if your side won. */
export function warMedals(warId, cc, won) {
  const w = WAR_MEDALS[warMedalKey(warId)];
  if (!w) return [];
  const own = w[cc] ?? w['*'] ?? [];
  const out = [...own];
  if (w.common) out.push(w.common);
  if (won && w.victory && !own.some((m) => m.victory)) out.push(w.victory);
  return out;
}
/** Wars fought for independence get the new country's medal. */
export const independenceMedal = (countryName) => ({ name: `${countryName} War of Independence Medal`, ribbon: R('#2e7d32', '#ffffff', '#d0021b', '#ffffff', '#2e7d32'), prestige: 4 });

/**
 * A war's medals for a serviceman: the campaign and service medals after a first tour in it, the
 * victory medal (won: true) at the peace. A war with no medal of its own gets its campaign medal
 * by name. Medals already held aren't given twice.
 */
export function grantWarMedals(ctx, svc, { won = false, op = null } = {}) {
  const { state } = ctx;
  if (!svc?.warId) return [];
  const opName = op ?? svc.warOp ?? 'the war';
  const cc = svc.nation ?? state.character.countryId ?? 'US';
  const colony = colonyHere(state);
  const list = svc.warId.startsWith('independence.') ? [independenceMedal(COUNTRIES[cc]?.name ?? cc)]
    : warMedals(svc.warId, colony ? colony.ruler : cc, won).filter((m) => won || !(m === WAR_MEDALS[warMedalKey(svc.warId)]?.victory));
  const named = list.length ? list : [genericWarMedal(svc.warId, cc, opName)];
  const fresh = named.filter((m) => !state.honors.some((h) => h.source === 'military' && h.name === m.name));
  for (const m of fresh) addHonor(state, { id: `mil.war.${svc.warId}.${m.name}`, source: 'military', name: m.name, icon: '🎖️', ...(m.ribbon ? { ribbon: m.ribbon } : {}), prestige: m.prestige, precedence: m.generic ? 35 : 34, citation: `For service in ${opName}.` });
  return fresh;
}

/** A war with no medal table of its own: the medal its country gave for such service. */
const AFEM = R('#1f3f8f', '#f5a623', '#d0021b', '#000000', '#ffffff', '#000000', '#d0021b', '#f5a623', '#1f3f8f');
const US_CAMPAIGNS = [[/Mexic/, 'Mexican Service Medal'], [/Haiti/, 'Haitian Campaign Medal'], [/Nicaragu/, 'Nicaraguan Campaign Medal'], [/Dominican/, 'Dominican Campaign Medal'], [/Philippine/, 'Philippine Campaign Medal'], [/China|Boxer/, 'China Campaign Medal'], [/Cuba/, 'Army of Cuban Pacification Medal']];
function genericWarMedal(warId, cc, opName) {
  const w = COW_BY_ID.get(warId);
  const title = w?.name ?? opName.replace(/^the /, '');
  const from = w?.from ?? 0;
  if (cc === 'US') {
    if (from >= 2001) return { name: 'Global War on Terrorism Expeditionary Medal', ribbon: R('#4b6ea8', '#ffd100', '#ffffff', '#c8102e', '#ffffff', '#ffd100', '#4b6ea8'), prestige: 3 };
    if (from >= 1958) return { name: 'Armed Forces Expeditionary Medal', ribbon: AFEM, prestige: 3 };
    const named = US_CAMPAIGNS.find(([re]) => re.test(title));
    if (named) return { name: named[1], ribbon: R('#2e7d32', '#f8e71c', '#2e7d32'), prestige: 3 };
  }
  if (cc === 'GB' && from >= 1918) return { name: `General Service Medal (clasp: ${title.replace(/^(First|Second|Third|Fourth|Fifth) /, '')})`, ribbon: R('#8b0a1d', '#1f6f43', '#8b0a1d'), prestige: 3 };
  return { name: `${title.replace(/^./, (c) => c.toUpperCase())} Campaign Medal`, ribbon: null, prestige: 3, generic: true };
}
