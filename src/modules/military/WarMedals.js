/**
 * The medals of the wars of history (world/History.js), by country: what a veteran of the
 * Great War or the Second World War actually wore. Each has its ribbon colours (stripes,
 * left to right, [colour, width]); a victory medal goes only to the winning side.
 *
 *   warMedals(warId, cc, won) → [{ name, ribbon, prestige }]
 */
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
  spanishCivilWar: {
    '*': [{ name: 'Medalla de la Campaña 1936–1939', ribbon: R('#d0021b', '#f8e71c', '#d0021b'), prestige: 3 }],
  },
};

/** The medals for a war, for your country; the victory medal if your side won. */
export function warMedals(warId, cc, won) {
  const w = WAR_MEDALS[warId];
  if (!w) return [];
  const own = w[cc] ?? w['*'] ?? [];
  const out = [...own];
  if (w.common) out.push(w.common);
  if (won && w.victory && !own.some((m) => m.victory)) out.push(w.victory);
  return out;
}
/** Wars fought for independence get the new country's medal. */
export const independenceMedal = (countryName) => ({ name: `${countryName} War of Independence Medal`, ribbon: R('#2e7d32', '#ffffff', '#d0021b', '#ffffff', '#2e7d32'), prestige: 4 });
