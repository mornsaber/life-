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

