/**
 * The rest of the world's inhabited territories: places still under another state's flag, each with
 * its own story under it.
 *
 *   British     Anguilla (the 1967 Revolution and the 1969 "invasion"), the British Virgin Islands,
 *               the Turks and Caicos (direct rule 2009–12), Montserrat (the volcano, 1995–97), the
 *               Falklands (occupied by Argentina April–June 1982), St Helena (Napoleon's exile).
 *   American    Guam (Japanese-occupied 1941–44), the US Virgin Islands (bought from Denmark in 1917),
 *               American Samoa (US nationals, not citizens), the Northern Marianas (Spanish, German,
 *               Japanese, then a UN trust territory).
 *   French      the overseas departments since 1946 (French Guiana, Guadeloupe, Martinique, Réunion;
 *               Mayotte from 2011), New Caledonia (the Kanak struggle, three referendums) and
 *               French Polynesia (the nuclear tests at Moruroa).
 *   Dutch       Aruba, Curaçao and Sint Maarten: the Netherlands Antilles from 1954, then countries
 *               of their own within the Kingdom (Aruba 1986, the others 2010).
 *   New Zealand's realm: the Cook Islands, self-governing in free association since 1965.
 *   Western Sahara: Spanish Sahara until 1975; the Green March; administered by Morocco since,
 *               claimed by the Polisario's Sahrawi Republic.
 *
 * Built with sketch() (../Sketch.js). Self-government (world/Eras.js AUTONOMOUS) says whose honours
 * and forces their people have; rank insignia follow the sovereign's pattern (ui/Insignia.js).
 */
import { sketch } from '../Sketch.js';

const C = (id, name, demonym, capital, cur, ppp, family, o) => sketch({ id, name, demonym, capital, cur, ppp, family, regimes: null, sovereign: [], warChance: 0, ...o });

/* ---- the sovereigns' ranks ---- */
const BRIT_POLICE = ['Police Constable', 'Police Constable', 'Sergeant', 'Inspector', 'Chief Inspector', 'Superintendent', 'Chief Superintendent', 'Assistant Commissioner', 'Deputy Commissioner', 'Commissioner of Police'];
const BRIT_ENLISTED = ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Warrant Officer Class 2', 'Warrant Officer Class 1', 'Regimental Sergeant Major', 'Regimental Sergeant Major'];
const BRIT_OFFICERS = ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier', 'Major General', 'Lieutenant General', 'General'];
const BRIT = { ranks: { enlisted: BRIT_ENLISTED, officer: BRIT_OFFICERS } };
const US_ENLISTED = ['Private', 'Private First Class', 'Specialist', 'Sergeant', 'Staff Sergeant', 'Sergeant First Class', 'Master Sergeant', 'First Sergeant', 'Sergeant Major'];
const US_OFFICERS = ['Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'];
const US_FORCES = { army: 'United States Army (and the territory\'s National Guard)', navy: 'United States Navy', air: 'United States Air Force', ranks: { enlisted: US_ENLISTED, officer: US_OFFICERS } };
const US_POLICE = ['Police Officer', 'Police Officer II', 'Corporal', 'Sergeant', 'Lieutenant', 'Captain', 'Major', 'Deputy Chief', 'Assistant Chief', 'Chief of Police'];
const FR_POLICE = ['Élève gardien de la paix', 'Gardien de la paix', 'Brigadier', 'Brigadier-chef', 'Major de police', 'Lieutenant de police', 'Capitaine de police', 'Commandant de police', 'Commissaire', 'Commissaire divisionnaire'];
const FR_ENLISTED = ['Soldat de 2e classe', 'Soldat de 1re classe', 'Caporal', 'Caporal-chef', 'Sergent', 'Sergent-chef', 'Adjudant', 'Adjudant-chef', 'Major'];
const FR_OFFICERS = ['Sous-lieutenant', 'Lieutenant', 'Capitaine', 'Commandant', 'Lieutenant-colonel', 'Colonel', 'Général de brigade', 'Général de division', 'Général de corps d\'armée', 'Général d\'armée'];
const FR_FORCES = { army: 'Armée de terre (the RSMA, the overseas adapted military service)', navy: 'Marine nationale', air: 'Armée de l\'air et de l\'espace', ranks: { enlisted: FR_ENLISTED, officer: FR_OFFICERS } };
const FR_COURTS = { top: 'Cour de cassation (in Paris)', high: 'Tribunal judiciaire', appeal: 'Cour d\'appel', magistrate: 'Juge des contentieux de la protection', appointedBy: 'the President of the Republic, on the Conseil supérieur de la magistrature' };
const FR_POLICE_OF = (where) => ({ name: `Police nationale and Gendarmerie (${where})`, head: 'the Prefect (Directeur territorial de la police)', ranks: FR_POLICE, academy: 'the École nationale de police' });
const FR_TAX = (vat) => ({ allowance: 11000, brackets: [[17000, 0.11], [50000, 0.3], [100000, 0.41], [Infinity, 0.45]], vat, corporate: 0.25, label: 'Direction générale des Finances publiques', contributions: [['CSG/CRDS', 0.097, null], ['Sécurité sociale', 0.11, null]] });
const DOM_GOV = (council, seats, left, right) => ['parliamentary', council, seats, [left, right], 'President of the Regional Council'];
const NL_ENLISTED = ['Soldaat', 'Korporaal', 'Korporaal der 1e klasse', 'Sergeant', 'Sergeant-majoor', 'Opperwachtmeester', 'Adjudant-onderofficier', 'Adjudant-onderofficier', 'Adjudant-onderofficier'];
const NL_OFFICERS = ['Tweede luitenant', 'Eerste luitenant', 'Kapitein', 'Majoor', 'Luitenant-kolonel', 'Kolonel', 'Brigadegeneraal', 'Generaal-majoor', 'Luitenant-generaal', 'Generaal'];
const NL_FORCES = (local) => ({ army: `Royal Netherlands Army (${local})`, navy: 'Royal Netherlands Navy (the Caribbean command at Parera)', air: null, ranks: { enlisted: NL_ENLISTED, officer: NL_OFFICERS } });
const NL_POLICE = ['Agent', 'Hoofdagent', 'Brigadier', 'Inspecteur', 'Hoofdinspecteur', 'Commissaris', 'Hoofdcommissaris', 'Korpschef'];
const NL_COURTS = { top: 'Supreme Court of the Netherlands (Hoge Raad, in The Hague)', high: 'Court of First Instance', appeal: 'Joint Court of Justice of Aruba, Curaçao, Sint Maarten and of Bonaire, Sint Eustatius and Saba', magistrate: 'Judge of the Court of First Instance', appointedBy: 'the King, by royal decree' };
const ANTILLES = (land) => [['NL', `the Dutch colony of Curaçao and Dependencies (${land})`, 1954, { leader: 'the Governor', fixed: true, noMovement: true }]];
const LEEWARD = (land, until, o = {}) => ['GB', `${land}, in the Leeward Islands colony`, until, { leader: 'the Administrator (under the Governor at Antigua)', fixed: true, noMovement: true, ...o }];

/* ================================================================ British ================================================================ */
export const AI = C('AI', 'Anguilla', 'Anguillian', 'The Valley', ['XCD', 'EC$'], 2.0, 'caribbean', {
  languages: ['English'], pop: 15, gdp: 20000, life: 81,
  m: 'Ronald Hubert Victor Ellis Kenneth Atlin Osbourne Evans Cardigan Haydn', f: 'Pam Evalie Cora Iris Lorna Mary Lolita Ingrid Palestina Delphine', l: 'Webster Gumbs Richardson Hodge Carty Connor Fleming Rogers Lake Harrigan',
  cities: [['ai_valley', 'The Valley', '🏝️', 'Capital region', 'small', 1100, 1.4, 1.2], ['ai_sandyground', 'Sandy Ground', '⛵', 'Small town', 'small', 1000, 1.4, 1.2]],
  provinceWord: 'District', gov: ['parliamentary', 'House of Assembly', 11, ['Anguilla Progressive Movement', 'Anguilla United Front'], 'Premier'],
  tax: { brackets: [[Infinity, 0]], vat: 0.13, corporate: 0, label: 'Inland Revenue Department', contributions: [['Interim stabilisation levy', 0.03, null]] },
  police: { name: 'Royal Anguilla Police Force', head: 'Commissioner of Police', ranks: BRIT_POLICE },
  forces: { army: 'British Army (Anguillian recruits)', navy: null, air: null, ...BRIT }, navy: false,
  courts: { top: 'Judicial Committee of the Privy Council', high: 'High Court (Eastern Caribbean Supreme Court)', appeal: 'Eastern Caribbean Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the Judicial and Legal Services Commission' },
  religion: { mainline: 50, evangelical: 35, catholic: 5, none: 10 }, emergency: '911', retire: 65,
  ruled: [LEEWARD('Anguilla (St Christopher-Nevis-Anguilla)', 1958),
    ['GB', 'Anguilla, in the colony of St Kitts-Nevis-Anguilla', 1967, { leader: 'the Administrator at Basseterre', fixed: true, noMovement: true }],
    ['GB', 'Anguilla, under a British Commissioner', 1980, { leader: 'the British Commissioner', fixed: true, noMovement: true, arrive: 'The Revolution: in May 1967 the islanders threw the St Kitts police off Anguilla and declared they would never be ruled from Basseterre. In 1969 three hundred British paratroopers and forty Metropolitan policemen landed to restore order, and were met by goats and cheering crowds. Anguilla is a British dependency again, at its own request.' }]],
});

export const VG = C('VG', 'the British Virgin Islands', 'Virgin Islander', 'Road Town', ['USD', '$'], 1, 'caribbean', {
  languages: ['English'], pop: 31, gdp: 40000, life: 79,
  m: 'Lavity Ralph Orlando Andrew Myron Julian Natalio Hamilton Kedrick Omar', f: 'Eileene Marlene Delores Sharie Alvera Mitsy Lorna Rosemarie Natalie Janice', l: 'Stoutt Smith Penn Wheatley Fahie Romney Malone Vanterpool Skelton O\'Neal',
  cities: [['vg_roadtown', 'Road Town, Tortola', '⚓', 'Capital region', 'small', 12000, 1.3, 1.2], ['vg_spanishtown', 'Spanish Town, Virgin Gorda', '🪨', 'Small town', 'small', 4000, 1.3, 1.2]],
  provinceWord: 'District', gov: ['parliamentary', 'House of Assembly', 15, ['Virgin Islands Party', 'National Democratic Party'], 'Premier'],
  tax: { brackets: [[Infinity, 0]], vat: 0, corporate: 0, label: 'Inland Revenue Department', contributions: [['Payroll tax', 0.08, null]] },
  police: { name: 'Royal Virgin Islands Police Force', head: 'Commissioner of Police', ranks: BRIT_POLICE },
  forces: { army: 'British Army (Virgin Islander recruits)', navy: null, air: null, ...BRIT }, navy: false,
  courts: { top: 'Judicial Committee of the Privy Council', high: 'High Court (Eastern Caribbean Supreme Court)', appeal: 'Eastern Caribbean Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the Judicial and Legal Services Commission' },
  religion: { evangelical: 45, mainline: 35, catholic: 8, none: 12 }, emergency: '999', retire: 65,
  ruled: [LEEWARD('the Virgin Islands', 1956), ['GB', 'the Crown Colony of the Virgin Islands', 1967, { leader: 'the Administrator', fixed: true, noMovement: true, arrive: 'The Leeward Islands federation is dissolved: the Virgin Islands are a colony on their own now.' }]],
});

export const TC = C('TC', 'the Turks and Caicos Islands', 'Turks and Caicos Islander', 'Cockburn Town', ['USD', '$'], 1, 'caribbean', {
  languages: ['English', 'Haitian Creole'], pop: 45, gdp: 25000, life: 80,
  m: 'Norman Derek Washington Oswald Clayton Galmo Michael Royal Lillian Hilly', f: 'Delores Sharlene Carlena Erlin Lillian Josephine Ruth Kissa Arabella Shaniqua', l: 'Saunders Missick Ewing Forbes Williams Robinson Gardiner Lightbourne Taylor Handfield',
  cities: [['tc_cockburntown', 'Cockburn Town, Grand Turk', '🧂', 'Capital region', 'small', 4000, 1.3, 1.1], ['tc_providenciales', 'Providenciales', '🏖️', 'Small town', 'small', 30000, 1.4, 1.2]],
  provinceWord: 'District', gov: ['parliamentary', 'House of Assembly', 19, ['Progressive National Party', 'People\'s Democratic Movement'], 'Premier'],
  tax: { brackets: [[Infinity, 0]], vat: 0, corporate: 0, label: 'Revenue Control Unit' },
  police: { name: 'Royal Turks and Caicos Islands Police Force', head: 'Commissioner of Police', ranks: BRIT_POLICE },
  forces: { army: 'Turks and Caicos Islands Regiment (from 2020)', navy: null, air: null, ...BRIT }, navy: false,
  courts: { top: 'Judicial Committee of the Privy Council', high: 'Supreme Court of the Turks and Caicos Islands', appeal: 'Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the Governor' },
  religion: { evangelical: 55, mainline: 25, catholic: 12, none: 8 }, emergency: '911', retire: 65,
  ruled: [['GB', 'the Turks and Caicos Islands, a dependency of Jamaica', 1962, { leader: 'the Commissioner (under the Governor of Jamaica)', fixed: true, noMovement: true }],
    ['GB', 'the Crown Colony of the Turks and Caicos Islands', 1976, { leader: 'the Administrator', fixed: true, noMovement: true, arrive: 'Jamaica is independent; the Turks and Caicos stay British, a colony on their own (governed from Nassau until 1973).' }]],
});

export const MS = C('MS', 'Montserrat', 'Montserratian', 'Plymouth', ['XCD', 'EC$'], 2.0, 'caribbean', {
  languages: ['English'], pop: 5, gdp: 12000, life: 75,
  m: 'William John Reuben Austin David Lowell Joseph Easton Donaldson Cedric', f: 'Mary Margaret Sarah Ann Veronica Joyce Grace Elizabeth Shirley Florence', l: 'Osborne Meade Romeo Brandt Ryan Farrell Allen Greenaway Cassell Tuitt',
  cities: [['ms_plymouth', 'Plymouth', '🌋', 'Capital region', 'small', 4000, 1.1, 0.9], ['ms_brades', 'Brades', '🏘️', 'Small town', 'small', 1000, 1.1, 0.9]],
  provinceWord: 'Parish', gov: ['parliamentary', 'Legislative Assembly', 9, ['Movement for Change and Prosperity', 'United Alliance'], 'Premier'],
  tax: { allowance: 25000, brackets: [[8000, 0.1], [Infinity, 0.3]], vat: 0, corporate: 0.3, label: 'Inland Revenue Department' },
  police: { name: 'Royal Montserrat Police Service', head: 'Commissioner of Police', ranks: BRIT_POLICE },
  forces: { army: 'Royal Montserrat Defence Force', navy: null, air: null, ...BRIT }, navy: false,
  courts: { top: 'Judicial Committee of the Privy Council', high: 'High Court (Eastern Caribbean Supreme Court)', appeal: 'Eastern Caribbean Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the Judicial and Legal Services Commission' },
  religion: { mainline: 50, evangelical: 30, catholic: 12, none: 8 }, emergency: '999', retire: 65,
  ruled: [LEEWARD('Montserrat', 1956), ['GB', 'the Crown Colony of Montserrat', 1960, { leader: 'the Administrator', fixed: true, noMovement: true }]],
});

export const FK = C('FK', 'the Falkland Islands', 'Falkland Islander', 'Stanley', ['FKP', '£'], 0.75, 'micro', {
  sovereign: [[1800, 1833]], regimes: [[1800, 'mil', 0, 0]], languages: ['English'], pop: 3.5, gdp: 70000, life: 80,
  m: 'John Terence Gerald Mike Patrick Neil Roger Ian Les Tony', f: 'Mary Sheila Rose Nidge Jan Barbara Teslyn Leona Phyl Sukey', l: 'Biggs Short Summers Berntsen Goss Betts Clifton Ford McKay Watson',
  cities: [['fk_stanley', 'Stanley', '🐧', 'Capital region', 'small', 2500, 1.4, 1.2], ['fk_campgoose', 'Goose Green (the Camp)', '🐑', 'Small town', 'small', 40, 1.3, 1.1]],
  provinceWord: 'Settlement', gov: ['parliamentary', 'Legislative Assembly', 8, ['independents (Stanley)', 'independents (Camp)'], 'Chief Executive (the Governor presides)'],
  tax: { allowance: 17000, brackets: [[12000, 0.21], [Infinity, 0.26]], vat: 0, corporate: 0.26, label: 'Falkland Islands Government Taxation Office' },
  police: { name: 'Royal Falkland Islands Police', head: 'Chief Police Officer', ranks: BRIT_POLICE },
  forces: { army: 'Falkland Islands Defence Force', navy: null, air: null, ...BRIT }, navy: false,
  courts: { top: 'Judicial Committee of the Privy Council', high: 'Supreme Court of the Falkland Islands', appeal: 'Court of Appeal', magistrate: 'Senior Magistrate', appointedBy: 'the Governor' },
  religion: { mainline: 55, catholic: 10, none: 35 }, emergency: '999', retire: 65,
  ruled: [['GB', 'the Crown Colony of the Falkland Islands', 1982, { from: 1833, leader: 'the Governor', fixed: true, noMovement: true }],
    ['AR', 'Argentine-occupied Islas Malvinas', 1982, { from: 1982, leader: 'the Argentine military governor', fixed: true, noMovement: true, occupation: true, arrive: 'On 2 April 1982 Argentine marines landed at dawn; by midday the Governor had surrendered at Government House. Stanley is "Puerto Argentino" now: driving on the right, curfews, conscripts in every paddock. A British task force is on its way, eight thousand miles.' }],
    ['GB', 'the Falkland Islands, a British dependency', 1985, { leader: 'the Governor', fixed: true, noMovement: true, arrive: 'On 14 June 1982 the Argentine garrison in Stanley surrendered. 255 British servicemen, 649 Argentines and three islanders had died. The Union Flag is back up over Government House.' }]],
});

export const SH = C('SH', 'St Helena', 'Saint', 'Jamestown', ['SHP', '£'], 0.75, 'micro', {
  languages: ['English'], pop: 4.5, gdp: 12000, life: 79,
  m: 'Derek Basil Cyril Eric Tony Lionel Clive Ivan Gavin Mervyn', f: 'Doris Ivy Edna Gloria Cathy Brenda Rita Joan Sharon Dulcie', l: 'Thomas Yon Leo Crowie Benjamin Henry Duncan George Constantine Joshua',
  cities: [['sh_jamestown', 'Jamestown', '⚓', 'Capital region', 'small', 600, 1.2, 0.9], ['sh_halftreehollow', 'Half Tree Hollow', '🏘️', 'Small town', 'small', 900, 1.2, 0.9]],
  provinceWord: 'District', gov: ['parliamentary', 'Legislative Council', 12, ['independents', 'independents'], 'Chief Minister (Chief Councillor before 2021)'],
  tax: { allowance: 6000, brackets: [[10000, 0.25], [Infinity, 0.31]], vat: 0.05, corporate: 0.25, label: 'Income Tax Office' },
  police: { name: 'St Helena Police Service', head: 'Chief of Police', ranks: BRIT_POLICE },
  forces: { army: 'British Army (the St Helena Volunteer Force, disbanded)', navy: null, air: null, ...BRIT }, navy: false,
  courts: { top: 'Judicial Committee of the Privy Council', high: 'Supreme Court of St Helena', appeal: 'Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the Governor' },
  religion: { mainline: 80, evangelical: 10, catholic: 2, none: 8 }, emergency: '999', retire: 65,
  ruled: [['GB', 'St Helena, under the East India Company', 1834, { leader: 'the Company\'s Governor', fixed: true, noMovement: true }],
    ['GB', 'the Crown Colony of St Helena', 1967, { leader: 'the Governor', fixed: true, noMovement: true, arrive: 'The Company\'s rule is over: St Helena is a Crown colony, and the Company\'s soldiers and pensioners are paid off.' }]],
});

/* ================================================================ American ================================================================ */
export const GU = C('GU', 'Guam', 'Guamanian (Chamorro)', 'Hagåtña', ['USD', '$'], 1, 'pacific', {
  languages: ['English', 'Chamorro', 'Filipino'], pop: 170, gdp: 35000, life: 79,
  m: 'Joaquin Jose Juan Vicente Antonio Francisco Jesus Ricardo Eddie Frank', f: 'Maria Rosa Carmen Ana Josefina Lourdes Dolores Rita Bernadita Annie', l: 'Cruz Santos Perez Camacho Taitano Leon|Guerrero Flores San|Nicolas Quinata Borja',
  cities: [['gu_hagatna', 'Hagåtña (Agana)', '⛪', 'Capital region', 'small', 1000, 1.1, 1.0], ['gu_tamuning', 'Tamuning–Tumon', '🏨', 'Mid-size city', 'medium', 19000, 1.15, 1.0], ['gu_dededo', 'Dededo', '🏘️', 'Suburb', 'medium', 45000, 1.0, 0.9]],
  provinceWord: 'Village', gov: ['presidential', 'Legislature of Guam', 15, ['Democratic Party of Guam', 'Republican Party of Guam'], 'Governor'],
  tax: { allowance: 13850, brackets: [[11000, 0.1], [33725, 0.12], [50650, 0.22], [Infinity, 0.32]], vat: 0.05, corporate: 0.21, label: 'Department of Revenue and Taxation', contributions: [['Social Security and Medicare', 0.0765, null]] },
  police: { name: 'Guam Police Department', head: 'Chief of Police', ranks: US_POLICE },
  forces: US_FORCES,
  courts: { top: 'Supreme Court of Guam', high: 'Superior Court of Guam', appeal: 'Supreme Court of Guam', magistrate: 'Superior Court judge', appointedBy: 'the Governor, with the Legislature' },
  religion: { catholic: 80, evangelical: 10, none: 10 }, emergency: '911', retire: 67,
  ruled: [['ES', 'Spanish Guam (the Marianas)', 1898, { leader: 'the Spanish governor', fixed: true, noMovement: true }],
    ['US', 'Guam, under the United States Navy', 1941, { leader: 'the Naval Governor', fixed: true, noMovement: true, arrive: 'The USS Charleston fired on Fort Santa Cruz in June 1898; the Spanish garrison hadn\'t heard there was a war. Guam is American now, governed by a naval officer.' }],
    ['JP', 'Japanese-occupied Guam (Ōmiya-jima)', 1944, { leader: 'the Japanese garrison commander', fixed: true, noMovement: true, occupation: true, arrive: 'Japan took Guam in December 1941, hours after Pearl Harbor. Ōmiya-jima, they call it: forced labour, Japanese in the schools, and in 1944 the march to the camps at Manengon.' }],
    ['US', 'Guam, under the United States Navy', 1950, { leader: 'the Naval Governor', fixed: true, noMovement: true, arrive: 'The Marines landed in July 1944. Liberation Day, 21 July, will be the island\'s great holiday.' }]],
});

export const VI = C('VI', 'the US Virgin Islands', 'Virgin Islander', 'Charlotte Amalie', ['USD', '$'], 1, 'caribbean', {
  languages: ['English', 'Spanish', 'Virgin Islands Creole'], pop: 100, gdp: 37000, life: 80,
  m: 'Ralph Cyril Melvin Alexander Juan Roy Kenneth Albert Lionel Earle', f: 'Terrie Lorraine Alicia Myrna Shawna Ruby Cornelia Elsa Edith Rosalie', l: 'de|Jongh Turnbull Evans Mapp King Christian Francis Hendricks George Bryan',
  cities: [['vi_charlotteamalie', 'Charlotte Amalie, St Thomas', '⚓', 'Capital region', 'small', 18000, 1.3, 1.1], ['vi_christiansted', 'Christiansted, St Croix', '🏰', 'Small town', 'small', 3000, 1.15, 1.0], ['vi_frederiksted', 'Frederiksted, St Croix', '🌴', 'Small town', 'small', 3000, 1.1, 0.95]],
  provinceWord: 'District', gov: ['presidential', 'Legislature of the Virgin Islands', 15, ['Democratic Party of the Virgin Islands', 'Independent Citizens Movement'], 'Governor'],
  tax: { allowance: 13850, brackets: [[11000, 0.1], [33725, 0.12], [50650, 0.22], [Infinity, 0.32]], vat: 0.05, corporate: 0.21, label: 'Bureau of Internal Revenue', contributions: [['Social Security and Medicare', 0.0765, null]] },
  police: { name: 'Virgin Islands Police Department', head: 'Commissioner of Police', ranks: US_POLICE },
  forces: US_FORCES,
  courts: { top: 'Supreme Court of the Virgin Islands', high: 'Superior Court of the Virgin Islands', appeal: 'Supreme Court of the Virgin Islands', magistrate: 'Magistrate', appointedBy: 'the Governor, with the Legislature' },
  religion: { evangelical: 45, catholic: 30, mainline: 15, none: 10 }, emergency: '911', retire: 67,
  ruled: [['DK', 'the Danish West Indies', 1917, { leader: 'the Danish governor-general', fixed: true, noMovement: true }],
    ['US', 'the Virgin Islands of the United States, under the Navy', 1931, { leader: 'the Naval Governor', fixed: true, noMovement: true, arrive: 'Denmark has sold the islands to the United States for $25 million in gold, for fear the Germans would take them. The Dannebrog came down on 31 March 1917. Citizenship will take ten more years.' }],
    ['US', 'the US Virgin Islands, an American territory', 1970, { leader: 'the appointed Governor', fixed: true, noMovement: true }]],
});

export const AS = C('AS', 'American Samoa', 'American Samoan', 'Pago Pago', ['USD', '$'], 1, 'pacific', {
  sovereign: [[1800, 1900]], regimes: [[1800, 'olig', 0, 0]], languages: ['Samoan', 'English'], pop: 45, gdp: 12000, life: 74,
  m: 'Tuiasosopo Faleomavaega Aumua Fofo Lolo Tauese Peter Sialega Uifa\'atali Amata', f: 'Mary Aumua Salote Lealaiauloto Malia Fa\'amausili Ana Tele Pele Sina', l: 'Tuiasosopo Sunia Lutali Coleman Moliga Amata Falani Tauese Pulu Faleomavaega',
  cities: [['as_pagopago', 'Pago Pago, Tutuila', '⛰️', 'Capital region', 'small', 3500, 1.0, 0.8], ['as_tafuna', 'Tafuna', '✈️', 'Small town', 'small', 8000, 1.0, 0.8]],
  provinceWord: 'District', gov: ['presidential', 'House of Representatives (the Fono)', 21, ['Democratic Party', 'Republican Party'], 'Governor', ['Senate', 18, 'Senator', false]],
  tax: { allowance: 13850, brackets: [[11000, 0.1], [33725, 0.12], [50650, 0.22], [Infinity, 0.32]], vat: 0, corporate: 0.21, label: 'Tax Office', contributions: [['Social Security and Medicare', 0.0765, null]] },
  police: { name: 'American Samoa Department of Public Safety', head: 'Commissioner of Public Safety', ranks: US_POLICE },
  forces: { ...US_FORCES, army: 'United States Army (one of its highest enlistment rates anywhere)' },
  courts: { top: 'High Court of American Samoa', high: 'High Court (Trial Division)', appeal: 'High Court (Appellate Division)', magistrate: 'District Court judge', appointedBy: 'the US Secretary of the Interior' },
  religion: { evangelical: 60, catholic: 20, mainline: 15, none: 5 }, emergency: '911', retire: 67,
  ruled: [['US', 'Tutuila, under the United States Navy (American Samoa)', 1951, { from: 1900, leader: 'the Naval Governor', fixed: true, noMovement: true, arrive: 'The chiefs of Tutuila have ceded their islands to the United States: a coaling station at Pago Pago, governed by the Navy. Samoans are American nationals now, not citizens.' }],
    ['US', 'American Samoa, under the Department of the Interior', 1977, { leader: 'the appointed Governor', fixed: true, noMovement: true }]],
});

export const MP = C('MP', 'the Northern Mariana Islands', 'Northern Mariana Islander', 'Saipan', ['USD', '$'], 1, 'pacific', {
  languages: ['English', 'Chamorro', 'Carolinian', 'Filipino'], pop: 50, gdp: 20000, life: 77,
  m: 'Benigno Pedro Juan Lorenzo Froilan Ralph Eloy Jesus Felix Arnold', f: 'Maria Rita Rosa Josefina Lucia Teresita Lourdes Esther Arlene Bernadita', l: 'Tenorio Fitial Babauta Guerrero Inos Torres Sablan Camacho Palacios Kaipat',
  cities: [['mp_saipan', 'Saipan (Garapan)', '🏝️', 'Capital region', 'small', 48000, 1.0, 0.9], ['mp_tinian', 'Tinian', '✈️', 'Small town', 'small', 3000, 0.95, 0.8]],
  provinceWord: 'Municipality', gov: ['presidential', 'House of Representatives', 20, ['Democratic Party', 'Republican Party'], 'Governor', ['Senate', 9, 'Senator', false]],
  tax: { allowance: 13850, brackets: [[11000, 0.1], [33725, 0.12], [50650, 0.22], [Infinity, 0.32]], vat: 0, corporate: 0.21, label: 'Division of Revenue and Taxation', contributions: [['Social Security and Medicare', 0.0765, null]] },
  police: { name: 'Commonwealth Department of Public Safety', head: 'Commissioner of Public Safety', ranks: US_POLICE },
  forces: US_FORCES,
  courts: { top: 'Supreme Court of the Commonwealth', high: 'Superior Court', appeal: 'Supreme Court of the Commonwealth', magistrate: 'Superior Court judge', appointedBy: 'the Governor, with the Senate' },
  religion: { catholic: 85, evangelical: 10, none: 5 }, emergency: '911', retire: 67,
  ruled: [['ES', 'the Spanish Marianas', 1899, { leader: 'the Spanish governor (from Guam)', fixed: true, noMovement: true }],
    ['DE', 'the German Mariana Islands', 1914, { leader: 'the German district officer', fixed: true, noMovement: true, arrive: 'Spain, beaten in Cuba and the Philippines, has sold the Marianas north of Guam to Germany.' }],
    ['JP', 'the South Seas Mandate (a Japanese mandate)', 1944, { leader: 'the Nan\'yō-chō (South Seas Government)', fixed: true, noMovement: true, mandate: true, arrive: 'Japan took the islands from Germany in 1914, and holds them now as a League of Nations mandate: sugar plantations, and soon more Japanese settlers than islanders.' }],
    ['US', 'the Trust Territory of the Pacific Islands (a UN trust territory)', 1978, { leader: 'the High Commissioner', fixed: true, noMovement: true, mandate: true, arrive: 'The Battle of Saipan, summer 1944: thousands of Japanese civilians jumped from the cliffs at Marpi Point rather than surrender. From Tinian, a year later, the B-29s will fly to Hiroshima and Nagasaki. The islands are an American trust territory now.' }]],
});

/* ================================================================ French ================================================================ */
const FR_CARIB = { forces: FR_FORCES, courts: FR_COURTS, emergency: '112', retire: 64, jury: true };
export const GF = C('GF', 'French Guiana', 'Guianese', 'Cayenne', ['EUR', '€'], 0.75, 'caribbean', {
  ...FR_CARIB, languages: ['French', 'Guianese Creole'], pop: 300, gdp: 18000, life: 79,
  m: 'Jean Joseph Gaston Léon Rodolphe Antoine Christiane Michel Georges Patrick', f: 'Marie Christiane Josette Yvette Lucienne Félicité Gisèle Monique Hélène Odile', l: 'Taubira Monnerville Éboué Ho-A-Chuck Patient Karam Alexandre Bertrand Lama Sylvestre',
  cities: [['gf_cayenne', 'Cayenne', '🌶️', 'Capital region', 'medium', 63000, 1.1, 0.9], ['gf_kourou', 'Kourou', '🚀', 'Small town', 'small', 25000, 1.15, 1.0], ['gf_stlaurent', 'Saint-Laurent-du-Maroni', '⛓️', 'Small town', 'small', 45000, 0.95, 0.8]],
  provinceWord: 'Arrondissement', gov: DOM_GOV('Assemblée de Guyane', 51, 'Parti socialiste guyanais', 'Guyane Rassemblement'),
  tax: FR_TAX(0), police: FR_POLICE_OF('Guyane'),
  religion: { catholic: 75, evangelical: 10, none: 15 },
  ruled: [['FR', 'the colony of French Guiana (the bagne, from 1852)', 1946, { leader: 'the Governor', fixed: true, noMovement: true }]],
});

export const GP = C('GP', 'Guadeloupe', 'Guadeloupean', 'Basse-Terre', ['EUR', '€'], 0.75, 'caribbean', {
  ...FR_CARIB, languages: ['French', 'Guadeloupean Creole'], pop: 390, gdp: 25000, life: 81,
  m: 'Jean Joseph Victor Max Daniel Gérard Henri Luc Ary Lucien', f: 'Marie Lucette Josette Simone Maryse Gisèle Ginette Solange Rosan Yvette', l: 'Chammougon Lurel Jalton Bangou Michaux-Chevry Lollia Domota Gillot Jean-Baptiste Nicolas',
  cities: [['gp_pointeapitre', 'Pointe-à-Pitre', '⚓', 'Major city', 'medium', 16000, 1.1, 0.95], ['gp_basseterre', 'Basse-Terre', '🌋', 'Capital region', 'small', 10000, 1.05, 0.9], ['gp_lesabymes', 'Les Abymes', '🏘️', 'Suburb', 'medium', 53000, 1.0, 0.9]],
  provinceWord: 'Arrondissement', gov: DOM_GOV('Conseil régional de la Guadeloupe', 41, 'Parti socialiste', 'Les Républicains'),
  tax: FR_TAX(0.085), police: FR_POLICE_OF('Guadeloupe'),
  religion: { catholic: 80, evangelical: 10, none: 10 },
  ruled: [['FR', 'the colony of Guadeloupe', 1946, { leader: 'the Governor', fixed: true, noMovement: true }]],
});

export const MQ = C('MQ', 'Martinique', 'Martinican', 'Fort-de-France', ['EUR', '€'], 0.75, 'caribbean', {
  ...FR_CARIB, languages: ['French', 'Martinican Creole'], pop: 360, gdp: 26000, life: 82,
  m: 'Aimé Joseph Camille Édouard Pierre Victor Alfred Serge Claude Raphaël', f: 'Marie Paulette Jeanne Suzanne Josette Mireille Annick Christiane Madeleine Lucie', l: 'Césaire Fanon Glissant Chamoiseau Letchimy Marie-Jeanne Darsières Nardal Lise Zobel',
  cities: [['mq_fortdefrance', 'Fort-de-France', '⚓', 'Capital region', 'medium', 78000, 1.1, 0.95], ['mq_stpierre', 'Saint-Pierre', '🌋', 'Small town', 'small', 4000, 1.0, 0.85], ['mq_lelamentin', 'Le Lamentin', '✈️', 'Suburb', 'medium', 40000, 1.05, 0.9]],
  provinceWord: 'Arrondissement', gov: DOM_GOV('Assemblée de Martinique', 51, 'Parti progressiste martiniquais', 'Mouvement indépendantiste martiniquais'),
  tax: FR_TAX(0.085), police: FR_POLICE_OF('Martinique'),
  religion: { catholic: 80, evangelical: 10, none: 10 },
  ruled: [['FR', 'the colony of Martinique', 1946, { leader: 'the Governor', fixed: true, noMovement: true }]],
});

export const RE = C('RE', 'Réunion', 'Réunionese', 'Saint-Denis', ['EUR', '€'], 0.75, 'pacific', {
  ...FR_CARIB, languages: ['French', 'Réunion Creole'], pop: 860, gdp: 24000, life: 81,
  m: 'Jean Michel Paul Jacques Raymond Gilbert Didier Thierry Huguette Wilfrid', f: 'Marie Huguette Josiane Nadia Jocelyne Sabine Monique Catherine Nassimah Ericka', l: 'Payet Hoarau Grondin Fontaine Rivière Vergès Robert Técher Lebon Maillot',
  cities: [['re_stdenis', 'Saint-Denis', '🌺', 'Capital region', 'medium', 150000, 1.1, 0.95], ['re_stpierre', 'Saint-Pierre', '🌊', 'Mid-size city', 'medium', 85000, 1.05, 0.9], ['re_cilaos', 'Cilaos', '⛰️', 'Small town', 'small', 5500, 0.95, 0.8]],
  provinceWord: 'Arrondissement', gov: DOM_GOV('Conseil régional de La Réunion', 45, 'Parti communiste réunionnais', 'Les Républicains'),
  tax: FR_TAX(0.085), police: FR_POLICE_OF('La Réunion'),
  religion: { catholic: 80, hindu: 7, sunni: 4, none: 9 },
  ruled: [['FR', 'the colony of Réunion (Île Bourbon until 1848)', 1946, { leader: 'the Governor', fixed: true, noMovement: true }]],
});

export const YT = C('YT', 'Mayotte', 'Mahoran', 'Mamoudzou', ['EUR', '€'], 0.75, 'africa', {
  ...FR_CARIB, sovereign: [[1800, 1841]], regimes: [[1800, 'absmon', 0, 1]], languages: ['Shimaore', 'Kibushi', 'French'], pop: 300, gdp: 9000, life: 76,
  m: 'Ali Ahmed Saïd Mohamed Abdou Hamada Younoussa Mansour Zaïdou Houssaini', f: 'Zaïna Fatima Mariama Echati Zéna Hadia Ramlati Moinaecha Anfiati Toiba', l: 'Ahamada Abdallah Madi Saïd Ali Attoumani Soilihi Houmadi Mansour Chanfi',
  cities: [['yt_mamoudzou', 'Mamoudzou', '🌴', 'Capital region', 'medium', 71000, 0.9, 0.7], ['yt_dzaoudzi', 'Dzaoudzi, Petite-Terre', '⚓', 'Small town', 'small', 17000, 0.9, 0.7]],
  provinceWord: 'Commune', gov: DOM_GOV('Conseil départemental de Mayotte', 26, 'Parti socialiste', 'Mouvement départementaliste mahorais'),
  tax: FR_TAX(0), police: FR_POLICE_OF('Mayotte'),
  religion: { sunni: 95, catholic: 3, none: 2 },
  ruled: [['FR', 'Mayotte, in the colony of the Comoros', 1976, { from: 1841, leader: 'the Governor (from Dzaoudzi, then Moroni)', fixed: true, noMovement: true }]],
});

export const NC = C('NC', 'New Caledonia', 'New Caledonian', 'Nouméa', ['XPF', '₣'], 110, 'pacific', {
  forces: FR_FORCES, courts: { ...FR_COURTS, high: 'Tribunal de première instance de Nouméa' }, emergency: '17', retire: 62, jury: true,
  sovereign: [[1800, 1853]], regimes: [[1800, 'olig', 0, 0]], languages: ['French', 'Drehu', 'Nengone', 'Paicî'], pop: 270, gdp: 30000, life: 78,
  m: 'Jean-Marie Jacques Roch Paul Louis Éloi Pierre Philippe Daniel Yeiwéné', f: 'Marie Déwé Christiane Isabelle Sonia Marie-Claude Nicole Hnadrune Wassissi Eugénie', l: 'Tjibaou Lafleur Wamytan Machoro Ukeiwé Pidjot Néaoutyine Frogier Gomès Mapou',
  cities: [['nc_noumea', 'Nouméa', '🏙️', 'Capital region', 'medium', 95000, 1.3, 1.1], ['nc_kone', 'Koné (Province Nord)', '⛏️', 'Small town', 'small', 8000, 1.1, 0.9], ['nc_lifou', 'Wé, Lifou (Loyalty Islands)', '🏝️', 'Small town', 'small', 2000, 1.0, 0.8]],
  provinces: ['Province Sud', 'Province Nord', 'Province des îles Loyauté'], provinceWord: 'Province',
  gov: ['parliamentary', 'Congress of New Caledonia', 54, ['FLNKS (Kanak and Socialist National Liberation Front)', 'Les Loyalistes'], 'President of the Government'],
  tax: { allowance: 1000000, brackets: [[1500000, 0.04], [2500000, 0.12], [3000000, 0.25], [Infinity, 0.4]], vat: 0.11, corporate: 0.3, label: 'Direction des services fiscaux de la Nouvelle-Calédonie' },
  police: FR_POLICE_OF('Nouvelle-Calédonie'),
  religion: { catholic: 55, mainline: 25, sunni: 3, none: 17 },
  ruled: [['FR', 'the colony of New Caledonia (the bagne, 1864–97)', 1946, { from: 1853, leader: 'the Governor', fixed: true, noMovement: true, arrive: 'In September 1853 Admiral Febvrier-Despointes raised the tricolour at Balade: New Caledonia is French. Settlers will follow, and convicts, and the Kanak will be pushed into reserves.' }],
    ['FR', 'New Caledonia, a French overseas territory', 1988, { leader: 'the High Commissioner', fixed: true, noMovement: true }]],
});

export const PF = C('PF', 'French Polynesia', 'French Polynesian', 'Papeete', ['XPF', '₣'], 110, 'pacific', {
  forces: FR_FORCES, courts: { ...FR_COURTS, high: 'Tribunal de première instance de Papeete' }, emergency: '17', retire: 62, jury: true,
  sovereign: [[1800, 1842]], regimes: [[1800, 'absmon', 0, 1]], languages: ['French', 'Tahitian'], pop: 280, gdp: 22000, life: 78,
  m: 'Gaston Oscar Pouvanaa Teva Moana Édouard Tavana Heimana Tehau Manutea', f: 'Hina Vaea Tiare Moerani Heimata Maeva Tumata Poerava Mareva Teura', l: 'Flosse Temaru Brotherson Fritch Tong|Sang Teriierooiterai Sanford Tetuanui Buillard Teariki',
  cities: [['pf_papeete', 'Papeete, Tahiti', '🌺', 'Capital region', 'medium', 26000, 1.35, 1.1], ['pf_faaa', 'Faaʻa, Tahiti', '✈️', 'Suburb', 'medium', 30000, 1.3, 1.05], ['pf_bora', 'Vaitape, Bora Bora', '🏝️', 'Small town', 'small', 5000, 1.5, 1.2]],
  provinceWord: 'Archipelago', gov: ['parliamentary', 'Assembly of French Polynesia', 57, ['Tavini Huiraatira (independence)', 'Tapura Huiraatira (autonomist)'], 'President of French Polynesia'],
  tax: { brackets: [[Infinity, 0]], vat: 0.16, corporate: 0.25, label: 'Direction des impôts et des contributions publiques', contributions: [['CST (contribution de solidarité territoriale)', 0.05, null]] },
  police: FR_POLICE_OF('Polynésie française'),
  religion: { mainline: 50, catholic: 35, evangelical: 5, none: 10 },
  ruled: [['FR', 'the French protectorate of Tahiti (the Kingdom of the Pōmare)', 1880, { from: 1842, leader: 'the French Commissioner', fixed: true, noMovement: true, arrive: 'Queen Pōmare IV has been made to accept a French protectorate: French troops in Papeete, a French commissioner beside the throne.' }],
    ['FR', 'the French Settlements in Oceania (a colony)', 1946, { leader: 'the Governor', fixed: true, noMovement: true, arrive: 'King Pōmare V has signed his kingdom away to France for a pension. Tahiti is a colony now.' }],
    ['FR', 'French Polynesia, a French overseas territory', 1984, { leader: 'the Governor (High Commissioner)', fixed: true, noMovement: true }]],
});

/* ================================================================ Dutch ================================================================ */
const NL_CARIB = { courts: NL_COURTS, emergency: '911', retire: 65, jury: false };
export const AW = C('AW', 'Aruba', 'Aruban', 'Oranjestad', ['AWG', 'ƒ'], 1.5, 'caribbean', {
  ...NL_CARIB, languages: ['Papiamento', 'Dutch', 'Spanish', 'English'], pop: 107, gdp: 35000, life: 76,
  m: 'Betico Henny Mike Nelson Glenbert Juancho Marco Evelyn Rudy Dowe', f: 'Evelyn Mary Glenda Xiomara Evelyna Ursell Rosa Ana Arends Lucille', l: 'Croes Eman Oduber Wever Arends Kock Tromp Werleman Maduro Lacle',
  cities: [['aw_oranjestad', 'Oranjestad', '🏖️', 'Capital region', 'small', 30000, 1.2, 1.05], ['aw_sannicolas', 'San Nicolas', '🏭', 'Small town', 'small', 15000, 1.05, 0.9]],
  provinceWord: 'District', gov: ['parliamentary', 'Estates of Aruba (Staten)', 21, ['People\'s Electoral Movement (MEP)', 'Aruban People\'s Party (AVP)'], 'Prime Minister'],
  tax: { allowance: 30000, brackets: [[34000, 0.14], [30000, 0.25], [60000, 0.42], [Infinity, 0.52]], vat: 0.07, corporate: 0.25, label: 'Departamento di Impuesto' },
  police: { name: 'Korps Politie Aruba', head: 'Korpschef', ranks: NL_POLICE },
  forces: NL_FORCES('the Aruba Militia, ARUMIL'),
  religion: { catholic: 75, evangelical: 10, mainline: 5, none: 10 },
  ruled: ANTILLES('Aruba'),
});

export const CW = C('CW', 'Curaçao', 'Curaçaoan', 'Willemstad', ['ANG', 'ƒ'], 1.5, 'caribbean', {
  ...NL_CARIB, languages: ['Papiamentu', 'Dutch', 'English', 'Spanish'], pop: 155, gdp: 25000, life: 78,
  m: 'Wilson Gerrit Miguel Moises Helmin Gilmar Eugene Etienne Hensley Ivar', f: 'Emily Lucinda Suzy Maria Susanne Margo Ivonne Myrna Sylvia Gisela', l: 'Godett Martina Pourier Schotte Rhuggenaath Pisas Asjes Wiels Doran Evertsz',
  cities: [['cw_willemstad', 'Willemstad', '🏘️', 'Capital region', 'medium', 130000, 1.1, 0.95], ['cw_bandabou', 'Barber, Bandabou', '🌵', 'Small town', 'small', 3000, 1.0, 0.85]],
  provinceWord: 'District', gov: ['parliamentary', 'Estates of Curaçao (Staten)', 21, ['Movement for the Future of Curaçao (MFK)', 'Real Alternative Party (PAR)'], 'Prime Minister'],
  tax: { allowance: 10000, brackets: [[30000, 0.095], [40000, 0.23], [60000, 0.3], [Infinity, 0.465]], vat: 0.06, corporate: 0.22, label: 'Inspectie der Belastingen' },
  police: { name: 'Korps Politie Curaçao', head: 'Korpschef', ranks: NL_POLICE },
  forces: NL_FORCES('the Curaçao Militia, CURMIL'),
  religion: { catholic: 70, evangelical: 12, mainline: 5, none: 13 },
  ruled: ANTILLES('Curaçao'),
});

export const SX = C('SX', 'Sint Maarten', 'Sint Maartener', 'Philipsburg', ['ANG', 'ƒ'], 1.5, 'caribbean', {
  ...NL_CARIB, languages: ['English', 'Dutch', 'Spanish', 'Papiamento'], pop: 42, gdp: 30000, life: 77,
  m: 'Claude William Theodore Leona Silveria Ruby Clyde Romeo Theo Lloyd', f: 'Sarah Silveria Leona Marlene Rhoda Gracita Josianne Carmen Ruby Ingrid', l: 'Wathey Wescot-Williams Jacobs Marlin Richardson Romeo Heyliger Gumbs Lake Arrindell',
  cities: [['sx_philipsburg', 'Philipsburg', '🛳️', 'Capital region', 'small', 1900, 1.3, 1.15], ['sx_simpsonbay', 'Simpson Bay', '✈️', 'Small town', 'small', 3000, 1.35, 1.2]],
  provinceWord: 'District', gov: ['parliamentary', 'Estates of Sint Maarten (Staten)', 15, ['United People\'s Party', 'National Alliance'], 'Prime Minister'],
  tax: { allowance: 30000, brackets: [[40000, 0.125], [60000, 0.3], [Infinity, 0.475]], vat: 0.05, corporate: 0.345, label: 'Belastingdienst Sint Maarten' },
  police: { name: 'Korps Politie Sint Maarten', head: 'Korpschef', ranks: NL_POLICE },
  forces: NL_FORCES('Dutch Caribbean marines'),
  religion: { evangelical: 45, catholic: 35, none: 20 },
  ruled: ANTILLES('Sint Maarten'),
});

/* ================================================================ New Zealand's realm ================================================================ */
export const CK = C('CK', 'the Cook Islands', 'Cook Islander', 'Avarua', ['NZD', '$'], 1.45, 'pacific', {
  sovereign: [[1800, 1888]], regimes: [[1800, 'olig', 0, 0]], languages: ['Cook Islands Māori', 'English'], pop: 17, gdp: 20000, life: 76,
  m: 'Albert Tom Geoffrey Henry Teariki Mark Tamarua Tupou Pupuke Ngamau', f: 'Pa Mere Teupoko Tepaeru Ngapoko Tina Marie Teina Ana Rongo', l: 'Henry Davis Brown Puna Marurai Heather Browne Tutakiau Short George',
  cities: [['ck_avarua', 'Avarua, Rarotonga', '🌺', 'Capital region', 'small', 5000, 1.1, 0.9], ['ck_aitutaki', 'Arutanga, Aitutaki', '🏝️', 'Small town', 'small', 1800, 1.05, 0.85]],
  provinceWord: 'Island', gov: ['parliamentary', 'Parliament of the Cook Islands', 24, ['Cook Islands Party', 'Democratic Party'], 'Prime Minister'],
  tax: { allowance: 14600, brackets: [[15400, 0.17], [Infinity, 0.3]], vat: 0.15, corporate: 0.2, label: 'Revenue Management Division' },
  police: { name: 'Cook Islands Police Service', head: 'Commissioner of Police', ranks: BRIT_POLICE },
  forces: { army: 'New Zealand Army (Cook Islanders are New Zealand citizens)', navy: 'Royal New Zealand Navy', air: null, ...BRIT },
  courts: { top: 'Judicial Committee of the Privy Council', high: 'High Court of the Cook Islands', appeal: 'Court of Appeal', magistrate: 'Justice of the Peace', appointedBy: 'the Queen\'s Representative' },
  religion: { mainline: 50, catholic: 17, evangelical: 25, none: 8 }, emergency: '999', retire: 60,
  ruled: [['GB', 'the British protectorate of the Cook Islands', 1901, { from: 1888, leader: 'the British Resident', fixed: true, noMovement: true }],
    ['NZ', 'the Cook Islands, a New Zealand dependency', 1965, { leader: 'the Resident Commissioner', fixed: true, noMovement: true, arrive: 'The islands have been annexed to New Zealand, ruled from Wellington by a Resident Commissioner in Avarua.' }]],
});

/* ================================================================ Western Sahara ================================================================ */
export const EH = C('EH', 'Western Sahara', 'Sahrawi', 'El Aaiún (Laayoune)', ['MAD', 'DH'], 4, 'maghreb', {
  sovereign: [[1800, 1884]], regimes: [[1800, 'olig', 0, 0]], languages: ['Hassaniya Arabic', 'Spanish', 'Berber', 'French'], pop: 600, gdp: 3000, life: 70,
  m: 'Mohamed Brahim Ahmed Mahfoud Bachir Sidi Salek Lahbib Abdelaziz Ali', f: 'Fatma Mariem Aminatou Salka Mbarka Khadija Galia Nguia Toufa Aicha', l: 'Ghali Abdelaziz Haidar Bouhali Ould|Salek Beiruk Mahfoud Bachir Sayed Lahbib',
  cities: [['eh_laayoune', 'El Aaiún (Laayoune)', '🏜️', 'Capital region', 'medium', 220000, 0.75, 0.6], ['eh_dakhla', 'Dakhla (Villa Cisneros)', '🐟', 'Small town', 'small', 100000, 0.75, 0.6], ['eh_smara', 'Smara', '🐪', 'Small town', 'small', 60000, 0.65, 0.5]],
  provinceWord: 'Region', gov: ['presidential', 'Moroccan Parliament (the Southern Provinces\' members)', 395, ['Istiqlal', 'National Rally of Independents'], 'Wali of Laâyoune-Sakia El Hamra'],
  tax: { allowance: 30000, brackets: [[20000, 0.1], [20000, 0.2], [20000, 0.3], [Infinity, 0.38]], vat: 0.2, corporate: 0.2, label: 'Direction générale des Impôts (Morocco)' },
  police: { name: 'Sûreté nationale (Morocco)', head: 'Director General of National Security', ranks: ['Gardien de la paix', 'Brigadier', 'Brigadier-chef', 'Officier de paix', 'Inspecteur', 'Officier de police', 'Commissaire', 'Commissaire principal', 'Commissaire divisionnaire', 'Directeur général'] },
  forces: { army: 'Royal Moroccan Armed Forces (the Polisario\'s Sahrawi People\'s Liberation Army, from the camps at Tindouf)', navy: 'Royal Moroccan Navy', air: 'Royal Moroccan Air Force' },
  courts: { top: 'Court of Cassation (Rabat)', high: 'Court of First Instance', appeal: 'Court of Appeal of Laayoune', magistrate: 'Judge of the Court of First Instance', appointedBy: 'the King, on the Supreme Council of the Judiciary' },
  religion: { sunni: 99, none: 1 }, emergency: '19', retire: 63,
  ruled: [['ES', 'Spanish Sahara (Río de Oro and Saguia el-Hamra)', 1975, { from: 1884, leader: 'the Spanish Governor-General', fixed: true, noMovement: true }],
    ['MA', 'Western Sahara under Moroccan administration (the "Southern Provinces")', 9999, { leader: 'the Wali (for the King of Morocco)', fixed: true, noMovement: true,
      arrive: 'The Green March: in November 1975, 350,000 Moroccans walked across the border with Qurans and flags, and Franco, dying, signed the territory over to Morocco and Mauritania. The Polisario Front has proclaimed a Sahrawi Republic and gone to war; tens of thousands of Sahrawis are fleeing to the camps at Tindouf in Algeria.' }]],
});
