/**
 * Child labour laws: the youngest a child could be set to work in a mill or factory, and down a
 * mine, by country from the year of each law. Farm work, service and errands weren't covered.
 * Before a country's first law there was no limit; in the game nobody works before ten.
 */
import { yearNow } from './Eras.js';

const CHILD_LABOUR = {
  GB: [[1833, 9, 0], [1842, 9, 10], [1872, 9, 12], [1874, 10, 12], [1891, 11, 12], [1901, 12, 13], [1918, 14, 14]],
  IE: [[1833, 9, 0], [1842, 9, 10], [1872, 9, 12], [1874, 10, 12], [1891, 11, 12], [1901, 12, 13], [1918, 14, 14]],
  FR: [[1841, 8, 8], [1874, 12, 12], [1892, 13, 13]],
  DE: [[1839, 9, 9], [1853, 12, 12], [1891, 13, 13]],
  BE: [[1889, 12, 12]], NL: [[1874, 12, 12]], AT: [[1859, 10, 10], [1885, 12, 14]], CH: [[1877, 14, 14]], IT: [[1886, 9, 10], [1902, 12, 13]], ES: [[1873, 10, 10], [1900, 10, 16]],
  SE: [[1881, 12, 12]], NO: [[1892, 12, 12]], DK: [[1873, 10, 10]], RU: [[1882, 12, 12]],
  US: [[1910, 12, 14], [1938, 16, 16]], CA: [[1884, 12, 12]], AU: [[1885, 13, 13]], NZ: [[1894, 14, 14]],
  JP: [[1916, 12, 12]], IN: [[1881, 7, 0], [1891, 9, 0], [1922, 12, 13]],
};
/** The youngest age for work of this kind here and now. */
export function childWorkAge(state, professionId) {
  const rows = CHILD_LABOUR[state.character.countryId ?? 'US'] ?? [];
  const y = yearNow(state);
  let row = null;
  for (const r of rows) if (r[0] <= y) row = r;
  const industrial = ['millWork', 'manufacturing'].includes(professionId) ? row?.[1] : professionId === 'coalMining' ? row?.[2] : 0;
  return Math.max(10, industrial || 0);
}
