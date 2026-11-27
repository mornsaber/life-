/**
 * Employers of the period trades by their names in the country (careers-period.js names them in
 * English, as in Britain): a German mill hand works for a Spinnerei, a docker in Bombay for the Port
 * Trust, a French railwayman for the Compagnie du Nord. Built from the city where you live.
 *
 *   localEmployer(professionId, cc, city, year, rng, profession, regionId) → a name, or null to keep the English one.
 *
 * Britain, Ireland and the Dominions take their private firms from AngloEmployers.js (solicitors,
 * chartered accountants, the Co-op, the BBC and ITV); the US keeps the professions' own lists.
 */
import { COUNTRIES } from './Countries.js';
import { angloEmployer } from './AngloEmployers.js';

const ANGLO = ['US', 'GB', 'IE', 'CA', 'AU', 'NZ', 'ZA'];

const T = {
  DE: {
    millWork: (c) => [`Baumwollspinnerei ${c} AG`, `Mechanische Weberei ${c}`, `Kammgarnspinnerei ${c}`],
    docks: () => ['Hamburger Hafen- und Lagerhaus-AG', 'Bremer Lagerhaus-Gesellschaft'],
    coalMining: () => ['Zeche Zollverein', 'Gelsenkirchener Bergwerks-AG', 'Harpener Bergbau AG', 'Zeche Hibernia'],
    steamRailway: (c, y) => (y < 1920 ? ['the Royal State Railways'] : y < 1949 ? ['Deutsche Reichsbahn'] : y < 1994 ? ['Deutsche Bundesbahn'] : ['Deutsche Bahn']),
    domesticService: (c) => [`a manufacturer's villa in ${c}`, 'a Junker estate in the country', `a professor's household in ${c}`],
    milkRound: (c) => [`Molkerei ${c}`],
    blacksmith: (c) => [`Hufschmiede ${c}`, 'the village smithy'],
    telegraph: (c, y) => (y < 1920 ? ['Kaiserliche Reichspost und Telegraphie'] : y < 1949 ? ['Deutsche Reichspost'] : ['Deutsche Bundespost']),
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
    telegraph: () => ['Poste e Telegrafi'],
    millWork: (c) => [`Cotonificio di ${c}`, `Lanificio di ${c}`, 'Cotonificio Cantoni'],
    docks: () => ['Compagnia Unica del Porto di Genova', 'Porto di Napoli', 'Porto di Trieste'],
    coalMining: () => ['Miniere di Carbonia', 'Miniera di Sulcis'],
    steamRailway: (c, y) => (y < 1905 ? ['Società per le Strade Ferrate del Mediterraneo', 'Rete Adriatica'] : ['Ferrovie dello Stato']),
    domesticService: (c) => [`a gentleman's household in ${c}`, 'a noble palazzo'],
  },
  ES: {
    telegraph: () => ['Cuerpo de Telégrafos'],
    millWork: (c) => [`Fábrica textil de ${c}`, 'La España Industrial'],
    coalMining: () => ['Hulleras de Turón', 'Minas de Asturias'],
    steamRailway: (c, y) => (y < 1941 ? ['Compañía de los Caminos de Hierro del Norte de España', 'Compañía MZA'] : ['RENFE']),
    domesticService: (c) => [`a grand house in ${c}`],
  },
  RU: {
    millWork: (c) => [`${c} Cotton Mill`, 'Trekhgornaya Manufaktura', 'Nikolskaya Manufaktura'],
    coalMining: () => ['Donetsk coal trust', 'Donbass mines'],
    steamRailway: (c, y) => (y < 1918 ? ['Imperial Russian Railways'] : ['People\'s Commissariat of Railways']),
    telegraph: (c, y) => (y < 1918 ? ['the Imperial Posts and Telegraphs'] : ['the People\'s Commissariat of Posts and Telegraphs']),
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
    telegraph: () => ['the Ministry of Communications (telegraphs)'],
    millWork: (c) => [`${c} Bōseki`, 'Kanebō', 'Tomioka Silk Mill'],
    docks: () => ['Port of Yokohama', 'Port of Kobe'],
    coalMining: () => ['Miike mine (Mitsui)', 'Hashima mine (Mitsubishi)'],
    steamRailway: (c, y) => (y < 1949 ? ['Imperial Government Railways'] : y < 1987 ? ['Japanese National Railways'] : ['JR']),
    domesticService: (c) => [`a merchant house in ${c}`],
  },
};

/**
 * Any other private employer abroad: a hospital by its local name, or a firm named for a local
 * family in the country's style (Maison Durand, Gebrüder Koch, Tanaka Shōten), where the game's
 * own list is American (Mercy General, Meridian Hotel Group).
 */
const HEALTH = /nurs|medic|physician|surg|hospital(?!ity)|clinic|therap|anesth|radiolog|respirat|sonograph|phlebot|midwi|dietit|psychiatr/i;
const SOVIET = ['RU', 'UA', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'UZ', 'KG', 'TJ', 'TM', 'MD', 'EE', 'LV', 'LT'];
function hospital(cc, c, y, rng) {
  if (cc === 'FR' || cc === 'BE') return [`l'Hôtel-Dieu de ${c}`, `l'Hôpital de ${c}`];
  if (cc === 'DE' || cc === 'AT' || cc === 'CH') return [`Städtisches Krankenhaus ${c}`, `St.-Josefs-Hospital ${c}`];
  if (cc === 'IT') return [`Ospedale Maggiore di ${c}`, `Ospedale Civile di ${c}`];
  if (cc === 'ES') return [`Hospital Provincial de ${c}`];
  if (cc === 'PT' || cc === 'BR') return [`Santa Casa de Misericórdia de ${c}`];
  if (cc === 'NL') return [`Gemeenteziekenhuis ${c}`];
  if (cc === 'JP') return [`${c} Municipal Hospital`, `${c} Red Cross Hospital`];
  if (cc === 'IN') return [`${c} Civil Hospital`, `the ${c} mission hospital`];
  if (cc === 'CN') return y >= 1949 ? [`${c} People's Hospital No. ${rng.int(1, 6)}`] : [`the ${c} mission hospital`];
  if (SOVIET.includes(cc)) return y >= 1918 && y < 1992 ? [`${c} City Hospital No. ${rng.int(1, 40)}`] : [`the ${c} zemstvo hospital`];
  return [`${c} General Hospital`];
}
function firm(cc, c, y, rng) {
  const S = rng.pick(COUNTRIES[cc]?.names?.last ?? ['Mendes']);
  if (SOVIET.includes(cc) && y >= 1918 && y < 1992) return [`the ${c} state works No. ${rng.int(1, 30)}`, `the ${c} trust`];
  if (cc === 'CN' && y >= 1956 && y < 1980) return [`${c} Municipal Works No. ${rng.int(1, 12)}`];
  if (cc === 'FR' || cc === 'BE') return [`${S} et Fils`, `Maison ${S}`, `Établissements ${S}`];
  if (cc === 'DE' || cc === 'AT' || cc === 'CH') return y < 1900 ? [`${S} & Söhne`, `Gebrüder ${S}`] : [`${S} GmbH`, `${S} & Co.`];
  if (cc === 'IT') return [`${S} & Figli`, `Ditta ${S}`];
  if (cc === 'ES' || cc === 'MX' || cc === 'AR' || cc === 'CL' || cc === 'CO' || cc === 'PE') return [`${S} e Hijos`, `${S} y Cía.`];
  if (cc === 'PT' || cc === 'BR') return [`${S} & Filhos`, `Casa ${S}`];
  if (cc === 'NL') return [`${S} & Zonen`, `Firma ${S}`];
  if (cc === 'JP') return [`${S} Shōten`, `${S} Kōgyō`];
  if (cc === 'IN' || cc === 'PK' || cc === 'BD') return [`${S} & Sons`, `${S} Brothers`];
  return [`${S} & Co.`, `${S} Brothers`];
}

/** A private organisation's name in the country's style (null in the English-speaking world). */
export function localFirmName(cc, city, year, rng, { health = false } = {}) {
  if (!cc || ANGLO.includes(cc)) return null;
  const names = health ? hospital(cc, city || 'the town', year, rng) : firm(cc, city || 'the town', year, rng);
  return names?.length ? rng.pick(names) : null;
}

export function localEmployer(professionId, cc, city, year, rng, profession = null, regionId = null) {
  if (!cc || cc === 'US') return null;
  if (ANGLO.includes(cc)) return profession?.sector && profession.sector !== 'private' ? null : angloEmployer(professionId, cc, city, year, rng, { regionId, profession });
  const generic = profession && !['government', 'federal', 'state', 'municipal'].includes(profession.sector) && !profession.campus && !profession.intl && (profession.employers?.length ?? 0) >= 3
    ? (c, y) => (HEALTH.test(professionId) ? hospital(cc, c, y, rng) : firm(cc, c, y, rng)) : null;
  const f = T[cc]?.[professionId] ?? (professionId === 'agriculture' ? (c, y) => (['RU', 'UA', 'BY'].includes(cc) && y >= 1930 && y < 1992 ? ['the collective farm (kolkhoz)', 'the state farm (sovkhoz)'] : cc === 'CN' && y >= 1958 && y < 1983 ? ['the people\'s commune'] : ['a family farm in the village', 'a landowner\'s estate', 'the big farm outside town']) : generic);
  if (!f) return null;
  const names = f(city || 'the town', year);
  return names?.length ? rng.pick(names) : null;
}
