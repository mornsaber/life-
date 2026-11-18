/**
 * Employers of the period trades by their names in the country (careers-period.js names them in
 * English, as in Britain): a German mill hand works for a Spinnerei, a docker in Bombay for the Port
 * Trust, a French railwayman for the Compagnie du Nord. Built from the city where you live.
 *
 *   localEmployer(professionId, cc, city, year, rng) → a name, or null to keep the English one.
 */
const ANGLO = ['US', 'GB', 'IE', 'CA', 'AU', 'NZ', 'ZA'];

const T = {
  DE: {
    millWork: (c) => [`Baumwollspinnerei ${c} AG`, `Mechanische Weberei ${c}`, `Kammgarnspinnerei ${c}`],
    docks: () => ['Hamburger Hafen- und Lagerhaus-AG', 'Bremer Lagerhaus-Gesellschaft'],
    coalMining: () => ['Zeche Zollverein', 'Gelsenkirchener Bergwerks-AG', 'Harpener Bergbau AG', 'Zeche Hibernia'],
    steamRailway: (c, y) => (y < 1920 ? ['the Royal State Railways'] : y < 1994 ? ['Deutsche Reichsbahn'] : ['Deutsche Bahn']),
    domesticService: (c) => [`a manufacturer's villa in ${c}`, 'a Junker estate in the country', `a professor's household in ${c}`],
    milkRound: (c) => [`Molkerei ${c}`],
    blacksmith: (c) => [`Hufschmiede ${c}`, 'the village smithy'],
    telegraph: (c, y) => (y < 1920 ? ['Kaiserliche Reichspost und Telegraphie'] : ['Deutsche Reichspost']),
    travellingSales: (c) => [`Tuchhandlung ${c}`, `Kolonialwaren-Großhandel ${c}`],
  },
  AT: {
    millWork: (c) => [`Spinnerei ${c}`, 'Vöslauer Kammgarnfabrik'],
    coalMining: () => ['Ostrauer Kohlengruben', 'Grazer-Köflacher Bergbaugesellschaft'],
    steamRailway: (c, y) => (y < 1919 ? ['k.k. Staatsbahnen', 'Kaiser Ferdinands-Nordbahn'] : ['Österreichische Bundesbahnen']),
    domesticService: (c) => [`a household in ${c}`, 'a palais on the Ringstraße'],
  },
  FR: {
    millWork: (c) => [`Filature de ${c}`, `Tissage de ${c}`, 'Filatures Motte-Bossut'],
    docks: () => ['Docks et entrepôts du Havre', 'Docks de Marseille', 'Port de Bordeaux'],
    coalMining: () => ['Compagnie des mines d\'Anzin', 'Compagnie des mines de Lens', 'Houillères du Nord'],
    steamRailway: (c, y) => (y < 1938 ? ['Compagnie du chemin de fer du Nord', 'Compagnie PLM', 'Compagnie de l\'Est'] : ['SNCF']),
    domesticService: (c) => [`a bourgeois household in ${c}`, 'a château in the provinces'],
    milkRound: (c) => [`Laiterie de ${c}`],
    blacksmith: () => ['the village forge'],
    telegraph: () => ['Postes et Télégraphes'],
    travellingSales: (c) => [`Maison de nouveautés de ${c}`],
  },
  BE: {
    millWork: (c) => [`Filature de ${c}`, 'Filature gantoise'],
    coalMining: () => ['Charbonnages du Hainaut', 'Charbonnages de Marcinelle'],
    steamRailway: (c, y) => (y < 1926 ? ['Chemins de fer de l\'État belge'] : ['SNCB']),
    docks: () => ['Port d\'Anvers'],
  },
  NL: {
    millWork: (c) => [`Textielfabriek ${c}`, 'Twentsche Katoenspinnerij'],
    docks: () => ['Havenbedrijf Rotterdam', 'Holland-Amerika Lijn (kade)'],
    steamRailway: (c, y) => (y < 1938 ? ['Hollandsche IJzeren Spoorweg-Maatschappij'] : ['Nederlandse Spoorwegen']),
    domesticService: (c) => [`a canal house in ${c}`],
  },
  IT: {
    millWork: (c) => [`Cotonificio di ${c}`, `Lanificio di ${c}`, 'Cotonificio Cantoni'],
    docks: () => ['Compagnia Unica del Porto di Genova', 'Porto di Napoli', 'Porto di Trieste'],
    coalMining: () => ['Miniere di Carbonia', 'Miniera di Sulcis'],
    steamRailway: (c, y) => (y < 1905 ? ['Società per le Strade Ferrate del Mediterraneo', 'Rete Adriatica'] : ['Ferrovie dello Stato']),
    domesticService: (c) => [`a gentleman's household in ${c}`, 'a noble palazzo'],
  },
  ES: {
    millWork: (c) => [`Fábrica textil de ${c}`, 'La España Industrial'],
    coalMining: () => ['Hulleras de Turón', 'Minas de Asturias'],
    steamRailway: (c, y) => (y < 1941 ? ['Compañía de los Caminos de Hierro del Norte de España', 'Compañía MZA'] : ['RENFE']),
    domesticService: (c) => [`a grand house in ${c}`],
  },
  RU: {
    millWork: (c) => [`${c} Cotton Mill`, 'Trekhgornaya Manufaktura', 'Nikolskaya Manufaktura'],
    coalMining: () => ['Donetsk coal trust', 'Donbass mines'],
    steamRailway: (c, y) => (y < 1918 ? ['Imperial Russian Railways'] : ['People\'s Commissariat of Railways']),
    domesticService: (c) => [`a merchant\'s household in ${c}`, 'a landowner\'s estate'],
  },
  IN: {
    millWork: (c) => [`${c} Spinning and Weaving Mills`, `${c} Cotton Mills Ltd`],
    docks: () => ['Bombay Port Trust', 'Calcutta Port Trust', 'Madras Port Trust'],
    coalMining: () => ['Bengal Coal Company', 'Jharia coalfield collieries'],
    steamRailway: (c, y) => (y < 1951 ? ['Great Indian Peninsula Railway', 'East Indian Railway', 'Bombay, Baroda and Central India Railway'] : ['Indian Railways']),
    domesticService: (c) => [`a bungalow in the ${c} cantonment`, `a merchant\'s household in ${c}`],
    milkRound: (c) => [`a ${c} dairy`],
    telegraph: () => ['Indian Posts and Telegraphs'],
  },
  JP: {
    millWork: (c) => [`${c} Bōseki`, 'Kanebō', 'Tomioka Silk Mill'],
    docks: () => ['Port of Yokohama', 'Port of Kobe'],
    coalMining: () => ['Miike mine (Mitsui)', 'Hashima mine (Mitsubishi)'],
    steamRailway: (c, y) => (y < 1949 ? ['Imperial Government Railways'] : y < 1987 ? ['Japanese National Railways'] : ['JR']),
    domesticService: (c) => [`a merchant house in ${c}`],
  },
};

export function localEmployer(professionId, cc, city, year, rng) {
  if (!cc || ANGLO.includes(cc)) return null;
  const f = T[cc]?.[professionId];
  if (!f) return null;
  const names = f(city || 'the town', year);
  return names?.length ? rng.pick(names) : null;
}
