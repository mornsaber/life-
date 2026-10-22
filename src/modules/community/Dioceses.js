/** Catholic dioceses by their local names (no imports: careers and organizations both use it). */
/** The local name of a diocese (or archdiocese), by country. */
const DIOCESE = {
  ES: ['Diócesis de', 'Archidiócesis de'], MX: ['Diócesis de', 'Arquidiócesis de'],
  FR: ['Diocèse de', 'Archidiocèse de'], IT: ['Diocesi di', 'Arcidiocesi di'],
  DE: ['Bistum', 'Erzbistum'], NL: ['Bisdom', 'Aartsbisdom'], BR: ['Diocese de', 'Arquidiocese de'],
  SE: ['Stockholms katolska stift', 'Stockholms katolska stift'],
  '*': ['Diocese of', 'Archdiocese of'],
};
/** Sees known by their own names. */
const SEES = {
  Munich: 'Erzbistum München und Freising', Cologne: 'Erzbistum Köln', Berlin: 'Erzbistum Berlin', Hamburg: 'Erzbistum Hamburg',
  Rome: 'Diocesi di Roma', Milan: 'Arcidiocesi di Milano', Naples: 'Arcidiocesi di Napoli', Venice: 'Patriarcato di Venezia',
  'Mexico City': 'Arquidiócesis Primada de México', Manila: 'Archdiocese of Manila', Westminster: 'Archdiocese of Westminster', London: 'Archdiocese of Westminster',
};
export function dioceseName(countryId, city, arch = false) {
  const town = String(city).split(',')[0];
  if (SEES[town]) return SEES[town];
  // Sweden is a single diocese for the whole country.
  if (countryId === 'SE') return 'Stockholms katolska stift';
  const [d, a] = DIOCESE[countryId] ?? DIOCESE['*'];
  return `${arch ? a : d} ${town}`;
}


/** Anglican dioceses: the Church of England's sees, and the other provinces of the Anglican Communion. */
const ANGLICAN_PREFIX = { US: 'Episcopal Diocese of', AU: 'Anglican Diocese of', CA: 'Anglican Diocese of', NZ: 'Anglican Diocese of', NG: 'Anglican Diocese of', KE: 'Anglican Diocese of', ZA: 'Anglican Diocese of', IE: 'Diocese of' };
const ANGLICAN_SEES = { London: 'Diocese of London', Westminster: 'Diocese of London', Manchester: 'Diocese of Manchester', Leeds: 'Diocese of Leeds', Liverpool: 'Diocese of Liverpool', Birmingham: 'Diocese of Birmingham', Bristol: 'Diocese of Bristol', Edinburgh: 'Diocese of Edinburgh (Scottish Episcopal Church)', Glasgow: 'Diocese of Glasgow and Galloway (Scottish Episcopal Church)', Cardiff: 'Diocese of Llandaff (Church in Wales)' };
/** The archbishoprics (the "arch" see of a province) by country. */
const ANGLICAN_ARCH = { GB: 'Diocese of Canterbury', IE: 'Diocese of Armagh', AU: 'Anglican Diocese of Sydney', CA: 'Anglican Diocese of Toronto', NZ: 'Anglican Diocese of Auckland', US: 'Episcopal Diocese of Washington', NG: 'Anglican Diocese of Abuja', KE: 'Anglican Diocese of All Saints Cathedral', ZA: 'Anglican Diocese of Cape Town' };
export function anglicanDioceseName(countryId, city, arch = false) {
  if (arch && ANGLICAN_ARCH[countryId]) return ANGLICAN_ARCH[countryId];
  const town = String(city).split(',')[0];
  if (countryId === 'GB' && ANGLICAN_SEES[town]) return ANGLICAN_SEES[town];
  return `${ANGLICAN_PREFIX[countryId] ?? 'Diocese of'} ${town}`;
}
/** Where the Anglican Communion has dioceses (a clergy loan goes to one of these). */
export const ANGLICAN_PROVINCES = ['GB', 'IE', 'US', 'CA', 'AU', 'NZ', 'NG', 'KE', 'ZA'];
