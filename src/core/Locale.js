/**
 * The country the current life is played in. One life plays at a time, so
 * country-specific data (names, local agencies) can key off it without
 * threading state through every lookup. Set when a life starts, loads or moves.
 */
let current = 'US';
export const currentCountry = () => current;
export function setCurrentCountry(countryId) {
  current = countryId ?? 'US';
}
