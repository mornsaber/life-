/**
 * The real sovereigns of the main crowns, year by year. In a life that isn't born into a royal
 * house, the throne follows history: Victoria, the Meiji Emperor, Napoleon III, Wilhelm II. A life
 * in the royal family itself keeps the game's own invented line (world/Crown.js), since you could
 * inherit.
 *
 *   realMonarch(crownId, year) → { name, number, gender, born, from, house, title?, ended? } |
 *                                 null (no monarch that year) | undefined (no record: invented)
 */
// [from, name, number, gender, born, house, how the reign ended ('abdicated' / 'deposed'), title]
const M = 'male';
const F = 'female';
const R = (from, name, number, gender, born, house, ended = 'died', title = null) => ({ from, name, number, gender, born, house, ended, title });

const REIGNS = {
  GB: [
    R(1760, 'George', 3, M, 1738, 'Hanover'), R(1820, 'George', 4, M, 1762, 'Hanover'), R(1830, 'William', 4, M, 1765, 'Hanover'),
    R(1837, 'Victoria', 1, F, 1819, 'Hanover'), R(1901, 'Edward', 7, M, 1841, 'Saxe-Coburg and Gotha'), R(1910, 'George', 5, M, 1865, 'Windsor'),
    R(1936, 'Edward', 8, M, 1894, 'Windsor', 'abdicated'), R(1937, 'George', 6, M, 1895, 'Windsor'), R(1952, 'Elizabeth', 2, F, 1926, 'Windsor'),
    R(2022, 'Charles', 3, M, 1948, 'Windsor'),
  ],
  JP: [
    R(1817, 'Ninkō', 1, M, 1800, 'the Imperial House'), R(1846, 'Kōmei', 1, M, 1831, 'the Imperial House'), R(1867, 'Meiji', 1, M, 1852, 'the Imperial House'),
    R(1912, 'Taishō', 1, M, 1879, 'the Imperial House'), R(1926, 'Shōwa (Hirohito)', 1, M, 1901, 'the Imperial House'),
    R(1989, 'Akihito', 1, M, 1933, 'the Imperial House', 'abdicated'), R(2019, 'Naruhito', 1, M, 1960, 'the Imperial House'),
  ],
  SE: [
    R(1818, 'Karl XIV Johan', 1, M, 1763, 'Bernadotte'), R(1844, 'Oscar', 1, M, 1799, 'Bernadotte'), R(1859, 'Karl XV', 1, M, 1826, 'Bernadotte'),
    R(1872, 'Oscar', 2, M, 1829, 'Bernadotte'), R(1907, 'Gustaf V', 1, M, 1858, 'Bernadotte'), R(1950, 'Gustaf VI Adolf', 1, M, 1882, 'Bernadotte'),
    R(1973, 'Carl XVI Gustaf', 1, M, 1946, 'Bernadotte'),
  ],
  NL: [
    R(1815, 'Willem', 1, M, 1772, 'Orange-Nassau', 'abdicated'), R(1840, 'Willem', 2, M, 1792, 'Orange-Nassau'), R(1849, 'Willem', 3, M, 1817, 'Orange-Nassau'),
    R(1890, 'Wilhelmina', 1, F, 1880, 'Orange-Nassau', 'abdicated'), R(1948, 'Juliana', 1, F, 1909, 'Orange-Nassau', 'abdicated'),
    R(1980, 'Beatrix', 1, F, 1938, 'Orange-Nassau', 'abdicated'), R(2013, 'Willem-Alexander', 1, M, 1967, 'Orange-Nassau'),
  ],
  ES: [
    R(1814, 'Fernando', 7, M, 1784, 'Bourbon'), R(1833, 'Isabel', 2, F, 1830, 'Bourbon', 'deposed'), [1868, null],
    R(1871, 'Amadeo', 1, M, 1845, 'Savoy', 'abdicated'), [1873, null], R(1875, 'Alfonso', 12, M, 1857, 'Bourbon'),
    R(1886, 'Alfonso', 13, M, 1886, 'Bourbon', 'deposed'), [1931, null], R(1975, 'Juan Carlos', 1, M, 1938, 'Bourbon', 'abdicated'),
    R(2014, 'Felipe', 6, M, 1968, 'Bourbon'),
  ],
  DK: [
    R(1808, 'Frederik', 6, M, 1768, 'Oldenburg'), R(1839, 'Christian', 8, M, 1786, 'Oldenburg'), R(1848, 'Frederik', 7, M, 1808, 'Oldenburg'),
    R(1863, 'Christian', 9, M, 1818, 'Glücksburg'), R(1906, 'Frederik', 8, M, 1843, 'Glücksburg'), R(1912, 'Christian', 10, M, 1870, 'Glücksburg'),
    R(1947, 'Frederik', 9, M, 1899, 'Glücksburg'), R(1972, 'Margrethe', 2, F, 1940, 'Glücksburg', 'abdicated'), R(2024, 'Frederik', 10, M, 1968, 'Glücksburg'),
  ],
  BE: [
    R(1831, 'Leopold', 1, M, 1790, 'Saxe-Coburg'), R(1865, 'Leopold', 2, M, 1835, 'Saxe-Coburg'), R(1909, 'Albert', 1, M, 1875, 'Saxe-Coburg'),
    R(1934, 'Leopold', 3, M, 1901, 'Saxe-Coburg', 'abdicated'), R(1951, 'Baudouin', 1, M, 1930, 'Saxe-Coburg'),
    R(1993, 'Albert', 2, M, 1934, 'Saxe-Coburg', 'abdicated'), R(2013, 'Philippe', 1, M, 1960, 'Saxe-Coburg'),
  ],
  DE: [
    R(1797, 'Friedrich Wilhelm', 3, M, 1770, 'Hohenzollern', 'died', ['King of Prussia', 'Queen of Prussia']),
    R(1840, 'Friedrich Wilhelm', 4, M, 1795, 'Hohenzollern', 'died', ['King of Prussia', 'Queen of Prussia']),
    R(1861, 'Wilhelm', 1, M, 1797, 'Hohenzollern', 'died', ['King of Prussia', 'Queen of Prussia']),
    R(1871, 'Wilhelm', 1, M, 1797, 'Hohenzollern', 'died', ['German Emperor', 'German Empress']),
    R(1888, 'Friedrich', 3, M, 1831, 'Hohenzollern', 'died', ['German Emperor', 'German Empress']),
    R(1889, 'Wilhelm', 2, M, 1859, 'Hohenzollern', 'abdicated', ['German Emperor', 'German Empress']), [1918, null],
  ],
  FR: [
    R(1814, 'Louis', 18, M, 1755, 'Bourbon'), R(1824, 'Charles', 10, M, 1757, 'Bourbon', 'deposed'),
    R(1830, 'Louis-Philippe', 1, M, 1773, 'Orléans', 'deposed', ['King of the French', 'Queen of the French']), [1848, null],
    R(1852, 'Napoléon', 3, M, 1808, 'Bonaparte', 'deposed', ['Emperor of the French', 'Empress of the French']), [1870, null],
  ],
  PT: [
    R(1816, 'João', 6, M, 1767, 'Braganza'), R(1826, 'Pedro', 4, M, 1798, 'Braganza', 'abdicated'), R(1834, 'Maria', 2, F, 1819, 'Braganza'),
    R(1853, 'Pedro', 5, M, 1837, 'Braganza'), R(1861, 'Luís', 1, M, 1838, 'Braganza'), R(1889, 'Carlos', 1, M, 1863, 'Braganza'),
    R(1908, 'Manuel', 2, M, 1889, 'Braganza', 'deposed'), [1910, null],
  ],
};
const PRESENT_FROM = 2026;

/** The real sovereign in a year (undefined: no record for that crown or year). */
export function realMonarch(crownId, year) {
  const rows = REIGNS[crownId];
  if (!rows || year >= PRESENT_FROM + 1) return undefined;
  let row;
  for (const r of rows) if ((Array.isArray(r) ? r[0] : r.from) <= year) row = r;
  if (!row) return undefined;
  return Array.isArray(row) ? null : row;
}
/** The reign before this one (for "X died; Y accedes"). */
export function previousReign(crownId, reign) {
  const rows = (REIGNS[crownId] ?? []).filter((r) => !Array.isArray(r));
  const i = rows.indexOf(reign);
  return i > 0 ? rows[i - 1] : null;
}
/** Does a regnal name come round again in this crown (so the first gets his "I")? */
export const nameRecurs = (crownId, name) => (REIGNS[crownId] ?? []).filter((r) => !Array.isArray(r) && r.name === name).map((r) => r.number).some((n) => n > 1);
