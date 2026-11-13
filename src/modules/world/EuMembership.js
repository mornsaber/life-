/**
 * EEC/EU membership by year (no imports: safe for any module to use).
 */
/** Membership of the EEC/EU by year, for record sharing (Britain until it left in 2020). */
const EU_YEARS = {
  BE: [1958], DE: [1958], FR: [1958], IT: [1958], LU: [1958], NL: [1958], DK: [1973], IE: [1973], GB: [1973, 2021], GR: [1981], ES: [1986], PT: [1986], AT: [1995], FI: [1995], SE: [1995],
  CY: [2004], CZ: [2004], EE: [2004], HU: [2004], LV: [2004], LT: [2004], MT: [2004], PL: [2004], SK: [2004], SI: [2004], BG: [2007], RO: [2007], HR: [2013],
};
export const euMemberIn = (cc, y) => { const m = EU_YEARS[cc]; return Boolean(m) && y >= m[0] && !(m[1] <= y); };
