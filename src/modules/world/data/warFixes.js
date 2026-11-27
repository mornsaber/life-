/**
 * Corrections to the generated war record (wars.js, which isn't edited by hand): the names the wars
 * are known by where the dataset uses a battlefield or a working label, outcomes it leaves open or
 * gets wrong, and a country's part in a war shorter than the war.
 *
 *   name    the war's name as people know it (used as is)
 *   won     the winning side's countries ([] for a stalemate)
 *   drop    countries taken off the war (their part is a separate entry)
 *   add     extra wars (a country's own part of a longer war)
 */
export const WAR_FIXES = {
  // Outcomes.
  166: { name: 'the Indo-Pakistani War of 1965', won: [] }, // a ceasefire and the Tashkent Declaration: no victor
  40: { name: 'the French intervention in Mexico', won: ['MX'] }, // the French withdrew in 1867
  116: { name: 'the Franco-Turkish War', won: ['TR'] }, // the Treaty of Ankara, 1921
  189: { name: 'the Cambodian–Vietnamese War', won: ['VN'] }, // Phnom Penh taken in January 1979
  193: { name: 'the Sino-Vietnamese War', won: [] }, // both sides claimed victory
  227: { name: 'the invasion of Iraq', won: ['AU', 'GB', 'US'] },
  // India's part in Sri Lanka's war: the Peace Keeping Force, 1987–90, not the whole war.
  835: { drop: ['IN'] },
  // Names.
  160: { name: 'the Sino-Indian War' },
  121: { name: 'the Japanese invasion of Manchuria' },
  130: { name: 'the Second Sino-Japanese War' },
  118: { name: 'the Sino-Soviet conflict of 1929' },
  133: { name: 'the Battle of Lake Khasan' },
  136: { name: 'the Battles of Khalkhin Gol' },
  153: { name: 'the First Taiwan Strait Crisis' },
  159: { name: 'the Second Taiwan Strait Crisis' },
  158: { name: 'the Ifni War' },
  184: { name: 'the Turkish invasion of Cyprus' },
  202: { name: 'the Falklands War' },
  205: { name: 'the 1982 Lebanon War' },
  65: { name: 'the Anglo-Egyptian War' },
  49: { name: 'the Paraguayan War' },
  52: { name: 'the Chincha Islands War' },
  55: { name: 'the Austro-Prussian War' },
  10: { name: 'the First Italian War of Independence' },
  28: { name: 'the Second Italian War of Independence' },
  34: { name: 'the invasion of the Papal States' },
  37: { name: 'the Expedition of the Thousand' },
  31: { name: 'the Hispano-Moroccan War' },
  94: { name: 'the Melillan campaign' },
  107: { name: 'the Estonian War of Independence' },
  108: { name: 'the Latvian War of Independence' },
  109: { name: 'the Polish–Soviet War' },
  115: { name: 'the Greco-Turkish War' },
  142: { name: 'the Winter War' },
  156: { name: 'the Soviet invasion of Hungary' },
  147: { name: 'the First Kashmir War' },
  178: { name: 'the Bangladesh Liberation War' },
  176: { name: 'the Cambodian campaign' },
  170: { name: 'the Laotian Civil War' },
  223: { name: 'the Kargil War' },
  588: { name: 'the Boshin War' },
  607: { name: 'the Satsuma Rebellion' },
  643: { name: 'the 1905 Revolution' },
  657: { name: 'the Xinhai Revolution' },
  671: { name: 'the Second Revolution' },
  513: { name: 'the July Revolution' },
  552: { name: 'the June Days uprising' },
  596: { name: 'the Paris Commune' },
  677: { name: 'the Russian Civil War' },
  813: { name: 'the Iranian Revolution' },
  837: { name: 'Operation Blue Star' },
  861: { name: 'the insurgency in Kashmir' },
  888: { name: 'the First Chechen War' },
  915: { name: 'the Second Chechen War' },
  778: { name: 'the Naxalite uprising' },
};
/** Wars the record folds into longer ones. */
export const WAR_ADDITIONS = [
  { id: 9835, name: 'the Indian Peace Keeping Force in Sri Lanka', kind: 'civil', from: 1987, to: 1990, a: ['LK', 'IN'], b: [], deaths: { IN: 1165, LK: 0 }, rebels: 'Tamil Tigers', host: 'LK', known: true },
];

/** The record with its corrections. */
export function correctedWars(wars) {
  const out = wars.map((w) => {
    const f = WAR_FIXES[w.id];
    if (!f) return w;
    const c = { ...w };
    if (f.name) { c.name = f.name; c.known = true; }
    if (f.won) c.won = f.won;
    if (f.drop) { c.a = c.a.filter((x) => !f.drop.includes(x)); c.b = c.b.filter((x) => !f.drop.includes(x)); }
    return c;
  });
  return [...out, ...WAR_ADDITIONS];
}
