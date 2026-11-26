/**
 * The last places on the map: the smallest inhabited territories, the places nobody is born in, and
 * the empty ones.
 *
 *   Lived in     Pitcairn (the Bounty's descendants), Niue and Tokelau (New Zealand's realm), Norfolk
 *                Island (self-governing 1979–2015), Christmas Island and the Cocos (Keeling) Islands
 *                (the Clunies-Ross "kings" until 1978), Wallis and Futuna (three kings under the
 *                Republic), St Pierre and Miquelon (Prohibition rum, the cod), St Barthélemy (Swedish
 *                until 1878), French St Martin, the Caribbean Netherlands (Bonaire, Sint Eustatius,
 *                Saba), and Åland (Russian, then Finnish, autonomous and demilitarised from 1921).
 *   Nobody born  Vatican City (citizenship comes with an office), Svalbard (no maternity ward: mothers
 *                go to the mainland to give birth), the Chagos (the islanders were deported 1968–73).
 *   Empty        Antarctica, Bouvet Island, Heard and McDonald Islands, the French Southern Lands,
 *                South Georgia (whalers until 1966), the US Minor Outlying Islands: stations, a garrison,
 *                penguins. Nobody is born there or settles there (world/Habitation.js).
 *
 * Built with sketch() (../Sketch.js).
 */
import { sketch } from '../Sketch.js';

const C = (id, name, demonym, capital, cur, ppp, family, o) => sketch({ id, name, demonym, capital, cur, ppp, family, regimes: null, sovereign: [], warChance: 0, navy: false, ...o });
const BRIT_POLICE = ['Police Constable', 'Police Constable', 'Sergeant', 'Inspector', 'Chief Inspector', 'Superintendent', 'Chief Superintendent', 'Assistant Commissioner', 'Deputy Commissioner', 'Commissioner of Police'];
const BRIT = { ranks: { enlisted: ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Warrant Officer Class 2', 'Warrant Officer Class 1', 'Regimental Sergeant Major', 'Regimental Sergeant Major'], officer: ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier', 'Major General', 'Lieutenant General', 'General'] } };
const AU_POLICE = { name: 'Australian Federal Police', head: 'Officer in Charge', ranks: ['Constable', 'Senior Constable', 'Leading Senior Constable', 'Sergeant', 'Station Sergeant', 'Superintendent', 'Commander', 'Assistant Commissioner', 'Deputy Commissioner', 'Commissioner'] };
const AU_FORCES = { army: 'Australian Army', navy: 'Royal Australian Navy', air: 'Royal Australian Air Force', ...BRIT };
const NZ_FORCES = { army: 'New Zealand Army (Niueans and Tokelauans are New Zealand citizens)', navy: 'Royal New Zealand Navy', air: null, ...BRIT };
const FR_RANKS = { enlisted: ['Soldat de 2e classe', 'Soldat de 1re classe', 'Caporal', 'Caporal-chef', 'Sergent', 'Sergent-chef', 'Adjudant', 'Adjudant-chef', 'Major'], officer: ['Sous-lieutenant', 'Lieutenant', 'Capitaine', 'Commandant', 'Lieutenant-colonel', 'Colonel', 'Général de brigade', 'Général de division', 'Général de corps d\'armée', 'Général d\'armée'] };
const FR_FORCES = { army: 'Armée de terre', navy: 'Marine nationale', air: 'Armée de l\'air et de l\'espace', ranks: FR_RANKS };
const FR_POLICE = (where) => ({ name: `Gendarmerie nationale (${where})`, head: 'the commandant of the gendarmerie', ranks: ['Gendarme adjoint', 'Gendarme', 'Maréchal des logis-chef', 'Adjudant', 'Adjudant-chef', 'Major', 'Lieutenant', 'Capitaine', 'Commandant', 'Lieutenant-colonel'] });
const FR_COURTS = { top: 'Cour de cassation (in Paris)', high: 'Tribunal de première instance', appeal: 'Cour d\'appel', magistrate: 'Juge', appointedBy: 'the President of the Republic, on the Conseil supérieur de la magistrature' };
const FR_TAX = { allowance: 11000, brackets: [[17000, 0.11], [50000, 0.3], [Infinity, 0.41]], vat: 0, corporate: 0.25, label: 'Direction générale des Finances publiques' };
const NOTAX = (label) => ({ brackets: [[Infinity, 0]], vat: 0, corporate: 0, label });
const STATION = (name) => ({ name, head: 'the station leader', ranks: ['Station hand', 'Station hand', 'Technician', 'Senior technician', 'Deputy station leader', 'Station leader', 'Station leader', 'Station leader', 'Programme director', 'Programme director'] });
const NO_FORCES = { army: null, navy: null, air: null };
const EMPTY_GOV = (body, head) => ['parliamentary', body, 1, null, head];

/* ================================================================ lived in ================================================================ */
export const PN = C('PN', 'the Pitcairn Islands', 'Pitkerner', 'Adamstown', ['NZD', '$'], 1.45, 'pacific', {
  languages: ['Pitkern', 'English'], pop: 0.05, gdp: 15000, life: 75,
  m: 'Fletcher Thursday|October John Matthew Steve Shawn Randy Brian Mike Dennis', f: 'Mary Dorothy Mavis Olive Brenda Meralda Carol Charlene Darralyn Nadine', l: 'Christian Young Warren Brown McCoy Adams Quintal Buffett Nobbs Evans',
  cities: [['pn_adamstown', 'Adamstown', '⛵', 'Capital region', 'small', 50, 1.2, 0.8]],
  provinceWord: 'Island', gov: ['parliamentary', 'Island Council', 10, null, 'the Mayor'],
  tax: NOTAX('the Island Council'),
  police: { name: 'Pitcairn Police (one officer, from New Zealand)', head: 'Police Officer', ranks: BRIT_POLICE },
  forces: NO_FORCES,
  courts: { top: 'Judicial Committee of the Privy Council', high: 'Supreme Court of Pitcairn', appeal: 'Court of Appeal', magistrate: 'Island Magistrate', appointedBy: 'the Governor (the British High Commissioner in Wellington)' },
  religion: { evangelical: 90, none: 10 }, emergency: '999', retire: 65,
  regimes: [[1800, 'olig', 0, 0]], sovereign: [[1800, 1838]],
  ruled: [['GB', 'the Pitcairn Islands, a British settlement', 1970, { from: 1838, leader: 'the Chief Magistrate (the High Commissioner for the Western Pacific)', fixed: true, noMovement: true, arrive: 'A British captain has written the islanders a constitution: Pitcairn is under the Crown, and women vote here, the first in the Empire.' }]],
});

export const NU = C('NU', 'Niue', 'Niuean', 'Alofi', ['NZD', '$'], 1.45, 'pacific', {
  languages: ['Niuean', 'English'], pop: 1.6, gdp: 15000, life: 73,
  m: 'Robert Toke Frank Young Hunkin Sisilia Dalton Billy Pokotoa Talagi', f: 'Sisilia Mona Hima Ainsley Fisa Pule Gina Moka Tagaloa Mititaiagimene', l: 'Talagi Rex Lui Vivian Tagelagi Pihigia Togiamua Ikimau Tongatule Viliamu',
  cities: [['nu_alofi', 'Alofi', '🌺', 'Capital region', 'small', 600, 1.1, 0.8]],
  provinceWord: 'Village', gov: ['parliamentary', 'Niue Assembly', 20, null, 'Premier'],
  tax: { allowance: 0, brackets: [[Infinity, 0.15]], vat: 0.125, corporate: 0.125, label: 'Niue Treasury' },
  police: { name: 'Niue Police', head: 'Chief of Police', ranks: BRIT_POLICE }, forces: NZ_FORCES,
  courts: { top: 'Court of Appeal of Niue', high: 'High Court of Niue', appeal: 'Court of Appeal', magistrate: 'Commissioner', appointedBy: 'the Governor-General of New Zealand' },
  religion: { mainline: 65, catholic: 10, evangelical: 15, none: 10 }, emergency: '999', retire: 60,
  regimes: [[1800, 'absmon', 0, 1]], sovereign: [[1800, 1900]],
  ruled: [['GB', 'the British protectorate of Niue', 1901, { from: 1900, leader: 'the British Resident', fixed: true, noMovement: true }],
    ['NZ', 'Niue, a New Zealand dependency', 1974, { leader: 'the Resident Commissioner', fixed: true, noMovement: true }]],
});

export const TK = C('TK', 'Tokelau', 'Tokelauan', 'Fakaofo (the capital rotates)', ['NZD', '$'], 1.45, 'pacific', {
  languages: ['Tokelauan', 'English'], pop: 1.4, gdp: 7000, life: 70,
  m: 'Kuresa Pio Foua Siopili Aliki|Faipule Kerisiano Faipule Tapu Fuimaono Pita', f: 'Lui Sefo Tali Lose Saini Mele Lagi Fili Tina Ioana', l: 'Toloa Nasau Perez Tuisano Kalolo Pasilio Aukuso Patelesio Ioane Lopa',
  cities: [['tk_fakaofo', 'Fakaofo', '🏝️', 'Capital region', 'small', 500, 1.0, 0.7], ['tk_nukunonu', 'Nukunonu', '🌴', 'Small town', 'small', 450, 1.0, 0.7]],
  provinceWord: 'Atoll', gov: ['parliamentary', 'General Fono', 20, null, 'Ulu-o-Tokelau (the head, rotating each year)'],
  tax: { allowance: 0, brackets: [[Infinity, 0.1]], vat: 0, corporate: 0, label: 'Tokelau Public Service' },
  police: { name: 'Tokelau Police (the village police)', head: 'Senior Police Officer', ranks: BRIT_POLICE }, forces: NZ_FORCES,
  courts: { top: 'High Court of New Zealand', high: 'Village Court (the Taupulega)', appeal: 'High Court of New Zealand', magistrate: 'Commissioner', appointedBy: 'the Administrator' },
  religion: { mainline: 60, catholic: 38, none: 2 }, emergency: '111', retire: 60,
  ruled: [['GB', 'the Union Islands, a British protectorate', 1926, { from: 1889, leader: 'the Resident Commissioner of the Gilbert and Ellice Islands', fixed: true, noMovement: true }],
    ['NZ', 'Tokelau, a New Zealand territory', 1994, { leader: 'the Administrator of Tokelau', fixed: true, noMovement: true }]],
  regimes: [[1800, 'olig', 0, 0]], sovereign: [[1800, 1889]],
});

export const NF = C('NF', 'Norfolk Island', 'Norfolk Islander', 'Kingston', ['AUD', '$'], 1.45, 'pacific', {
  languages: ['English', 'Norf\'k'], pop: 2.2, gdp: 25000, life: 80,
  m: 'Gary David John Andre Graham Neville Owen Robin Tim Darren', f: 'Alice Mary Marie Emily Lisle Kerry Robin Tracey Vicky Jo', l: 'Christian Quintal Buffett Nobbs Adams Evans McCoy Young Snell Robinson',
  cities: [['nf_burntpine', 'Burnt Pine', '🌲', 'Capital region', 'small', 800, 1.2, 0.9], ['nf_kingston', 'Kingston', '⛓️', 'Small town', 'small', 200, 1.2, 0.9]],
  provinceWord: 'District', gov: ['parliamentary', 'Legislative Assembly (1979–2015), then the Regional Council', 9, null, 'Chief Minister (the Administrator from 2015)'],
  tax: { allowance: 18200, brackets: [[26800, 0.19], [Infinity, 0.325]], vat: 0.12, corporate: 0.3, label: 'the Australian Taxation Office (from 2016)' },
  police: AU_POLICE, forces: AU_FORCES,
  courts: { top: 'High Court of Australia', high: 'Supreme Court of Norfolk Island', appeal: 'Federal Court of Australia', magistrate: 'Chief Magistrate', appointedBy: 'the Governor-General of Australia' },
  religion: { mainline: 60, catholic: 12, none: 28 }, emergency: '000', retire: 67,
  ruled: [['GB', 'the penal settlement on Norfolk Island', 1856, { leader: 'the Commandant', fixed: true, noMovement: true }],
    ['GB', 'Norfolk Island, the Pitcairners\' home', 1914, { leader: 'the Governor of New South Wales', fixed: true, noMovement: true, arrive: 'The convicts are gone, and the descendants of the Bounty mutineers have come from Pitcairn in the Morayshire: 194 of them, given the island and its houses.' }],
    ['AU', 'Norfolk Island, an Australian territory', 1979, { leader: 'the Administrator', fixed: true, noMovement: true }]],
});

export const CX = C('CX', 'Christmas Island', 'Christmas Islander', 'Flying Fish Cove', ['AUD', '$'], 1.45, 'asia', {
  languages: ['English', 'Malay', 'Chinese'], pop: 1.7, gdp: 20000, life: 80,
  m: 'Ahmad Lim Tan Gordon Kaye Zainal Foo Abdul Chong Ismail', f: 'Siti Mei|Ling Aishah Lily Kim Nurul Hui Fatimah Jenny Rosnah', l: 'Lim Tan Bin|Ahmad Chong Foo Ismail Lee Wong Hassan Thomson',
  cities: [['cx_flyingfishcove', 'Flying Fish Cove (the Settlement)', '🦀', 'Capital region', 'small', 1200, 1.1, 0.8]],
  provinceWord: 'District', gov: ['parliamentary', 'Shire Council', 9, null, 'Shire President (the Administrator for Australia)'],
  tax: { allowance: 18200, brackets: [[26800, 0.19], [Infinity, 0.325]], vat: 0, corporate: 0.3, label: 'the Australian Taxation Office' },
  police: AU_POLICE, forces: AU_FORCES,
  courts: { top: 'High Court of Australia', high: 'Supreme Court of Western Australia', appeal: 'Court of Appeal (Western Australia)', magistrate: 'Magistrate', appointedBy: 'the Governor-General of Australia' },
  religion: { buddhist: 20, sunni: 20, mainline: 15, none: 45 }, emergency: '000', retire: 67,
  ruled: [['GB', 'Christmas Island (unsettled; claimed by Britain)', 1888, { leader: 'nobody', fixed: true, noMovement: true }],
    ['GB', 'Christmas Island, in the Straits Settlements (the phosphate company\'s island)', 1942, { leader: 'the District Officer (and the Christmas Island Phosphate Company)', fixed: true, noMovement: true, arrive: 'Britain has annexed the island for its phosphate. Labourers are shipped in from Singapore and Malaya; the company runs everything.' }],
    ['JP', 'Japanese-occupied Christmas Island', 1945, { leader: 'the Japanese garrison', fixed: true, noMovement: true, occupation: true }],
    ['GB', 'Christmas Island, in the Colony of Singapore', 1958, { leader: 'the District Officer', fixed: true, noMovement: true }]],
});

export const CC = C('CC', 'the Cocos (Keeling) Islands', 'Cocos Islander', 'West Island', ['AUD', '$'], 1.45, 'asia', {
  languages: ['Cocos Malay', 'English'], pop: 0.6, gdp: 15000, life: 76,
  m: 'Parson Abdul Mohammed Hadji Bujang Rahim Wahin Shamsuddin Ahmad Ismail', f: 'Aishah Rosnah Mina Fatimah Siti Hawa Noor Rubiah Halimah Zainab', l: 'Bin|Bynie Bin|Mohammed Bin|Hadji Clunies-Ross Bin|Abdul Bin|Rahim Bin|Ismail Bin|Wahin Bin|Ahmad Bin|Parson',
  cities: [['cc_homeisland', 'Bantam, Home Island', '🌴', 'Capital region', 'small', 450, 1.0, 0.7], ['cc_westisland', 'West Island', '✈️', 'Small town', 'small', 120, 1.1, 0.8]],
  provinceWord: 'Island', gov: ['parliamentary', 'Shire Council', 7, null, 'Shire President (the Administrator for Australia)'],
  tax: { allowance: 18200, brackets: [[26800, 0.19], [Infinity, 0.325]], vat: 0, corporate: 0.3, label: 'the Australian Taxation Office' },
  police: AU_POLICE, forces: AU_FORCES,
  courts: { top: 'High Court of Australia', high: 'Supreme Court of Western Australia', appeal: 'Court of Appeal (Western Australia)', magistrate: 'Magistrate', appointedBy: 'the Governor-General of Australia' },
  religion: { sunni: 75, none: 25 }, emergency: '000', retire: 67,
  ruled: [['GB', 'the Cocos Islands, ruled by the Clunies-Ross family', 1955, { from: 1827, leader: 'the Clunies-Ross "King of the Cocos"', fixed: true, noMovement: true, arrive: 'John Clunies-Ross has settled the atolls with Malay labourers. His family will rule here like kings, paying the workers in their own plastic tokens, for a hundred and fifty years.' }],
    ['AU', 'the Cocos Islands, an Australian territory (still the Clunies-Ross estate)', 1984, { leader: 'the Administrator (and John Clunies-Ross)', fixed: true, noMovement: true }]],
  regimes: [[1800, 'olig', 0, 0]], sovereign: [[1800, 1827]],
});

export const WF = C('WF', 'Wallis and Futuna', 'Wallisian', 'Mata-Utu', ['XPF', '₣'], 110, 'pacific', {
  forces: FR_FORCES, courts: FR_COURTS, police: FR_POLICE('Wallis-et-Futuna'), emergency: '17', retire: 62,
  languages: ['Wallisian', 'Futunan', 'French'], pop: 11, gdp: 12000, life: 79,
  m: 'Tomasi Petelo Sosefo Kalisito Soane Atonio Mikaele Lafaele Patalione Malia', f: 'Malia Sosefina Losa Felisita Telesia Atonia Kataline Mele Sapeta Losana', l: 'Tauvale Lakina Fakataulavelua Polelei Talomafaia Mulikihaamea Tauhavili Kulimoetoke Vanai Muni',
  cities: [['wf_matautu', 'Mata-Utu, Wallis (Uvea)', '⛪', 'Capital region', 'small', 1000, 1.0, 0.8], ['wf_leava', 'Leava, Futuna', '🌴', 'Small town', 'small', 500, 0.95, 0.75]],
  provinceWord: 'Kingdom', gov: ['parliamentary', 'Territorial Assembly', 20, null, 'the Administrator Superior (beside the three kings)'],
  tax: NOTAX('the Territorial Assembly'), religion: { catholic: 99, none: 1 },
  regimes: [[1800, 'absmon', 0, 1]], sovereign: [[1800, 1887]],
  ruled: [['FR', 'the French protectorate of Wallis and Futuna', 1961, { from: 1887, leader: 'the French Resident (beside the Lavelua, the King of Uvea)', fixed: true, noMovement: true }]],
});

export const PM = C('PM', 'St Pierre and Miquelon', 'Saint-Pierrais', 'Saint-Pierre', ['EUR', '€'], 0.75, 'micro', {
  forces: FR_FORCES, courts: FR_COURTS, police: FR_POLICE('Saint-Pierre-et-Miquelon'), emergency: '17', retire: 64,
  languages: ['French'], pop: 6, gdp: 35000, life: 80,
  m: 'Jean Pierre Marc Stéphane Gérard Victor Denis Albert Bernard Henri', f: 'Marie Annick Karine Catherine Danielle Josette Anne Françoise Patricia Nicole', l: 'Detcheverry Girardin Briand Claireaux Lebailly Hélène Lafitte Gautier Coste Hacala',
  cities: [['pm_stpierre', 'Saint-Pierre', '🐟', 'Capital region', 'small', 5500, 1.2, 1.0], ['pm_miquelon', 'Miquelon', '🌫️', 'Small town', 'small', 600, 1.2, 0.9]],
  provinceWord: 'Commune', gov: ['parliamentary', 'Territorial Council', 19, null, 'President of the Territorial Council'],
  tax: FR_TAX, religion: { catholic: 95, none: 5 },
  ruled: [['FR', 'the colony of St Pierre and Miquelon', 1946, { leader: 'the Governor', fixed: true, noMovement: true }]],
});

export const BL = C('BL', 'St Barthélemy', 'Barth', 'Gustavia', ['EUR', '€'], 0.75, 'caribbean', {
  forces: FR_FORCES, courts: FR_COURTS, police: FR_POLICE('Saint-Barthélemy'), emergency: '17', retire: 64,
  languages: ['French', 'Saint-Barth French', 'English'], pop: 10, gdp: 45000, life: 82,
  m: 'Bruno Michel Jean Bernard Xavier Nils Maxime Yves Romain Daniel', f: 'Marie Hélène Nicole Sylvie Micheline Brigitte Annie Joëlle Sophie Line', l: 'Magras Gréaux Laplace Questel Lédée Brin Bernier Aubin Danet Turbé',
  cities: [['bl_gustavia', 'Gustavia', '🛥️', 'Capital region', 'small', 2500, 2.0, 1.6]],
  provinceWord: 'Quarter', gov: ['parliamentary', 'Territorial Council', 19, null, 'President of the Territorial Council'],
  tax: NOTAX('the Collectivity'), religion: { catholic: 90, none: 10 },
  ruled: [['SE', 'Swedish St Barthélemy', 1878, { leader: 'the Swedish governor', fixed: true, noMovement: true }],
    ['FR', 'St Barthélemy, a commune of Guadeloupe', 2007, { leader: 'the sub-prefect', fixed: true, noMovement: true, arrive: 'Sweden has sold the island back to France, after ninety-four years. The capital keeps its Swedish name, Gustavia.' }]],
});

export const MF = C('MF', 'St Martin', 'St Martiner', 'Marigot', ['EUR', '€'], 0.75, 'caribbean', {
  forces: FR_FORCES, courts: FR_COURTS, police: FR_POLICE('Saint-Martin'), emergency: '17', retire: 64,
  languages: ['French', 'English', 'Spanish'], pop: 32, gdp: 17000, life: 80,
  m: 'Louis Daniel Alain Jean Aline Albert Pierre Wendel Guy Ramona', f: 'Aline Ramona Louise Annick Marie Jeanne Valérie Sylvie Inés Rosette', l: 'Gibbs Constant Fleming Richardson Hodge Arnell Hanson Questel Ferdinand Gumbs',
  cities: [['mf_marigot', 'Marigot', '⛵', 'Capital region', 'small', 5700, 1.15, 0.9], ['mf_grandcase', 'Grand-Case', '🍽️', 'Small town', 'small', 1500, 1.2, 0.95]],
  provinceWord: 'Quarter', gov: ['parliamentary', 'Territorial Council', 23, null, 'President of the Territorial Council'],
  tax: FR_TAX, religion: { catholic: 70, evangelical: 20, none: 10 },
  ruled: [['FR', 'French St Martin, in the colony of Guadeloupe', 1946, { leader: 'the Governor (at Basse-Terre)', fixed: true, noMovement: true }],
    ['FR', 'St Martin, a commune of Guadeloupe', 2007, { leader: 'the sub-prefect', fixed: true, noMovement: true }]],
});

export const BQ = C('BQ', 'the Caribbean Netherlands', 'Bonairean', 'Kralendijk', ['USD', '$'], 1, 'caribbean', {
  languages: ['Papiamentu', 'Dutch', 'English'], pop: 30, gdp: 25000, life: 79,
  m: 'Edison Clark Ramonsito Jopie Hubert Burney Gerald Chris Jonathan Elvis', f: 'Gisela Shirley Ann Edna Marie Lourdes Yolanda Cecilia Milly Daisy', l: 'Rijna Abraham Domacassé Thielman Gerharts Anthony Martis Soliana Statia Hassell',
  cities: [['bq_kralendijk', 'Kralendijk, Bonaire', '🐠', 'Capital region', 'small', 10000, 1.2, 1.0], ['bq_oranjestad', 'Oranjestad, Sint Eustatius', '🏰', 'Small town', 'small', 3000, 1.2, 1.0], ['bq_saba', 'The Bottom, Saba', '⛰️', 'Small town', 'small', 500, 1.2, 1.0]],
  provinceWord: 'Island', gov: ['parliamentary', 'Island Council', 9, null, 'Lieutenant Governor (Gezaghebber)'],
  tax: { allowance: 0, brackets: [[Infinity, 0.305]], vat: 0.08, corporate: 0, label: 'Belastingdienst Caribisch Nederland' },
  police: { name: 'Korps Politie Caribisch Nederland', head: 'Korpschef', ranks: ['Agent', 'Hoofdagent', 'Brigadier', 'Inspecteur', 'Hoofdinspecteur', 'Commissaris', 'Hoofdcommissaris', 'Korpschef'] },
  forces: { army: 'Royal Netherlands Army', navy: 'Royal Netherlands Navy', air: null, ranks: { enlisted: ['Soldaat', 'Korporaal', 'Korporaal der 1e klasse', 'Sergeant', 'Sergeant-majoor', 'Opperwachtmeester', 'Adjudant-onderofficier', 'Adjudant-onderofficier', 'Adjudant-onderofficier'], officer: ['Tweede luitenant', 'Eerste luitenant', 'Kapitein', 'Majoor', 'Luitenant-kolonel', 'Kolonel', 'Brigadegeneraal', 'Generaal-majoor', 'Luitenant-generaal', 'Generaal'] } },
  courts: { top: 'Supreme Court of the Netherlands', high: 'Court of First Instance', appeal: 'Joint Court of Justice', magistrate: 'Judge', appointedBy: 'the King, by royal decree' },
  religion: { catholic: 70, evangelical: 15, none: 15 }, emergency: '911', retire: 65,
  ruled: [['NL', 'the Dutch colony of Curaçao and Dependencies (Bonaire, Sint Eustatius, Saba)', 1954, { leader: 'the Lieutenant Governor', fixed: true, noMovement: true }]],
});

export const AX = C('AX', 'Åland', 'Ålander', 'Mariehamn', ['EUR', '€'], 0.85, 'micro', {
  languages: ['Swedish'], pop: 30, gdp: 45000, life: 83,
  m: 'Erik Karl Johan Anders Mats Roger Camilla Henrik Tage Jörgen', f: 'Anna Maria Kristina Camilla Britt-Marie Gunilla Veronica Annika Katrin Ulla', l: 'Karlsson Eriksson Mattsson Jansson Gustafsson Sundblom Lindholm Danielsson Nordlund Mörn',
  cities: [['ax_mariehamn', 'Mariehamn', '⛵', 'Capital region', 'small', 11700, 1.1, 1.0], ['ax_jomala', 'Jomala', '🌾', 'Small town', 'small', 5000, 1.05, 0.95]],
  provinceWord: 'Municipality', gov: ['parliamentary', 'Lagting', 30, ['Åländsk Center', 'Liberalerna på Åland'], 'Premier (Lantråd)'],
  tax: { allowance: 20000, brackets: [[20000, 0.06], [30000, 0.19], [Infinity, 0.31]], vat: 0.24, corporate: 0.2, label: 'the Finnish Tax Administration' },
  police: { name: 'Ålands polismyndighet', head: 'Police Chief', ranks: ['Polis', 'Överkonstapel', 'Äldre överkonstapel', 'Kommissarie', 'Överkommissarie', 'Polischef'] },
  forces: { army: null, navy: null, air: null },
  courts: { top: 'Supreme Court of Finland', high: 'Åland District Court', appeal: 'Turku Court of Appeal', magistrate: 'District judge', appointedBy: 'the President of Finland' },
  religion: { mainline: 80, none: 20 }, emergency: '112', retire: 65,
  ruled: [['RU', 'Åland, in the Grand Duchy of Finland (the Russian Empire)', 1917, { leader: 'the Tsar\'s governor at Turku', fixed: true, noMovement: true }],
    ['FI', 'Åland, claimed by Finland and by Sweden', 1921, { leader: 'the Finnish government', fixed: true, noMovement: true, arrive: 'Finland is independent, and Åland wants to join Sweden. Helsinki will not let it go; the League of Nations must decide.' }]],
});

/* ================================================================ nobody born here ================================================================ */
export const VA = C('VA', 'Vatican City', 'Vatican', 'Vatican City', ['EUR', '€'], 0.75, 'micro', {
  languages: ['Italian', 'Latin'], pop: 0.8, gdp: 50000, life: 82,
  m: 'Giovanni Pietro Paolo Francesco Giuseppe Carlo Luigi Angelo Pio Benedetto', f: 'Maria Teresa Anna Chiara Lucia Caterina Giovanna Francesca Elena Rosa', l: 'Rossi Bianchi Colombo Ricci Marino Greco Bruno Gallo Conti Romano',
  cities: [['va_vatican', 'Vatican City', '⛪', 'Capital region', 'small', 800, 1.6, 1.2]],
  provinceWord: 'City', gov: ['absolute', 'Pontifical Commission for Vatican City State', 7, null, 'the Pope (through the President of the Governorate)'],
  tax: NOTAX('the Governorate'),
  police: { name: 'Gendarmerie Corps of Vatican City State', head: 'Inspector General', ranks: ['Gendarme', 'Vice-Brigadiere', 'Brigadiere', 'Vice-Ispettore', 'Ispettore', 'Vice-Commissario', 'Commissario', 'Ispettore Generale'] },
  forces: { army: 'the Pontifical Swiss Guard', navy: null, air: null },
  courts: { top: 'Supreme Tribunal of the Apostolic Signatura', high: 'Tribunal of Vatican City State', appeal: 'Court of Appeal', magistrate: 'Single judge', appointedBy: 'the Pope' },
  religion: { catholic: 100 }, emergency: '113', retire: 75,
  regimes: [[1800, 'absmon', 0, 1]], sovereign: [[1800, 1870], [1929, null]],
  ruled: [['IT', 'the Vatican, in the Kingdom of Italy (the Pope a "prisoner in the Vatican")', 1929, { from: 1870, leader: 'the King of Italy (the Pope refuses to recognise him)', fixed: true, noMovement: true }]],
});

export const SJ = C('SJ', 'Svalbard', 'Svalbard resident', 'Longyearbyen', ['NOK', 'kr'], 10, 'micro', {
  languages: ['Norwegian', 'Russian'], pop: 2.5, gdp: 60000, life: 82,
  m: 'Ola Lars Knut Per Bjørn Arne Svein Ivan Sergei Tor', f: 'Kari Ingrid Anne Liv Marit Hilde Olga Tone Solveig Elena', l: 'Hansen Johansen Olsen Larsen Andersen Pedersen Nilsen Ivanov Kristiansen Jensen',
  cities: [['sj_longyearbyen', 'Longyearbyen', '❄️', 'Capital region', 'small', 2400, 1.5, 1.2], ['sj_barentsburg', 'Barentsburg', '⛏️', 'Small town', 'small', 450, 1.2, 0.9]],
  provinceWord: 'Settlement', gov: ['parliamentary', 'Longyearbyen Community Council', 15, null, 'the Governor of Svalbard (Sysselmesteren)'],
  tax: { allowance: 0, brackets: [[Infinity, 0.08]], vat: 0, corporate: 0.1, label: 'the Norwegian Tax Administration (Svalbard tax)' },
  police: { name: 'the Governor of Svalbard (police authority)', head: 'the Governor', ranks: ['Politibetjent', 'Politioverbetjent', 'Politiførstebetjent', 'Politiadvokat', 'Visesysselmester', 'Sysselmester'] },
  forces: { army: null, navy: null, air: null },
  courts: { top: 'Supreme Court of Norway', high: 'Nord-Troms og Senja District Court', appeal: 'Hålogaland Court of Appeal', magistrate: 'District judge', appointedBy: 'the King of Norway' },
  religion: { mainline: 60, orthodox: 10, none: 30 }, emergency: '112', retire: 67,
  ruled: [['NO', 'Spitsbergen (a terra nullius of whalers, trappers and miners)', 1925, { leader: 'nobody (the mining companies)', fixed: true, noMovement: true }]],
});

export const IO = C('IO', 'the British Indian Ocean Territory', 'Chagossian', 'Diego Garcia', ['USD', '$'], 1, 'asia', {
  languages: ['Chagossian Creole', 'English'], pop: 3, gdp: 20000, life: 70,
  m: 'Olivier Louis Marcel Rita Fernand Joseph Raymond Charlesia Lisette Jean', f: 'Rita Lisette Charlesia Marie Josephine Mimose Bernadette Aurélie Liseby Marcelle', l: 'Bancoult Alexis Elysé Talate Pompe Bertin Mandarin Saminaden Vincatassin Jaffar',
  cities: [['io_eastpoint', 'East Point, Diego Garcia', '🌴', 'Capital region', 'small', 500, 0.8, 0.5], ['io_peros', 'Peros Banhos', '🥥', 'Small town', 'small', 300, 0.7, 0.4]],
  provinceWord: 'Atoll', gov: EMPTY_GOV('the BIOT Administration (in London)', 'the Commissioner'),
  tax: NOTAX('the BIOT Administration'),
  police: { name: 'the British Indian Ocean Territory Police (Royal Navy and Royal Marines)', head: 'the Commissioner\'s Representative', ranks: BRIT_POLICE },
  forces: { army: null, navy: 'Royal Navy (Naval Party 1002)', air: null, ...BRIT },
  courts: { top: 'Judicial Committee of the Privy Council', high: 'Supreme Court of BIOT (sitting in London)', appeal: 'Court of Appeal', magistrate: 'Senior Magistrate', appointedBy: 'the Commissioner' },
  religion: { catholic: 95, none: 5 }, emergency: '999', retire: 65,
  ruled: [['GB', 'the Chagos Islands, a dependency of Mauritius (the coconut plantations)', 1965, { from: 1814, leader: 'the Governor of Mauritius', fixed: true, noMovement: true }]],
  regimes: [[1800, 'olig', 0, 0]], sovereign: [],
});

/* ================================================================ empty ================================================================ */
const EMPTY = (id, name, capital, cur, ppp, station, ruler, label, o = {}) => C(id, name, 'expedition member', capital, cur, ppp, 'micro', {
  languages: ['English'], pop: 0.05, gdp: 40000, life: 80,
  m: 'James John Robert Peter David Michael Paul Andrew Richard Thomas', f: 'Anne Mary Susan Helen Jane Sarah Karen Ruth Clare Lucy', l: 'Smith Jones Brown Taylor Wilson Evans Thomas Walker White Martin',
  cities: [[`${id.toLowerCase()}_station`, station, '🐧', 'Capital region', 'small', 50, 1.5, 0.5]],
  provinceWord: 'Station', gov: EMPTY_GOV(label, 'the Commissioner'), tax: NOTAX(label),
  police: STATION(`${name} station`), forces: NO_FORCES,
  courts: { top: 'the courts of the claimant state', high: 'Magistrate', appeal: 'Court of Appeal', magistrate: 'the station leader (as magistrate)', appointedBy: 'the Commissioner' },
  religion: { none: 100 }, emergency: '112', retire: 65,
  ruled: [], ruler,
  ...o,
});
export const AQ = C('AQ', 'Antarctica', 'Antarctic', 'McMurdo Station', ['USD', '$'], 1, 'micro', {
  languages: ['English', 'Russian', 'Spanish'], pop: 1, gdp: 40000, life: 80,
  m: 'Roald Ernest Robert Douglas Richard Vivian Edmund Lars Sergei Juan', f: 'Anne Jackie Edith Lisa Marie Lynn Helen Ann Olga Rosa', l: 'Amundsen Scott Shackleton Mawson Byrd Fuchs Hillary Larsen Ivanov Moreno',
  cities: [['aq_mcmurdo', 'McMurdo Station', '🐧', 'Capital region', 'small', 1000, 1.5, 0.5], ['aq_esperanza', 'Esperanza Base', '❄️', 'Small town', 'small', 55, 1.4, 0.5]],
  provinceWord: 'Claim', gov: EMPTY_GOV('the Antarctic Treaty Consultative Meeting', 'nobody (the Treaty parties)'),
  tax: NOTAX('the station\'s national programme'), police: STATION('Antarctic station'), forces: NO_FORCES,
  courts: { top: 'the courts of each expedition\'s own country', high: 'Station magistrate', appeal: 'the home country\'s courts', magistrate: 'the station leader (as special constable)', appointedBy: 'each Treaty party' },
  religion: { none: 100 }, emergency: '112', retire: 65,
});
export const BV = EMPTY('BV', 'Bouvet Island', 'the automatic weather station', ['NOK', 'kr'], 10, 'the Norwegian Polar Institute\'s weather station', 'NO', 'the Norwegian Polar Institute');
export const HM = EMPTY('HM', 'Heard Island and McDonald Islands', 'Atlas Cove', ['AUD', '$'], 1.45, 'Atlas Cove (the ANARE station, 1947–55)', 'AU', 'the Australian Antarctic Division');
export const TF = EMPTY('TF', 'the French Southern and Antarctic Lands', 'Port-aux-Français', ['EUR', '€'], 0.75, 'Port-aux-Français, Kerguelen', 'FR', 'the Prefect of the TAAF (at Saint-Pierre, Réunion)');
export const GS = EMPTY('GS', 'South Georgia and the South Sandwich Islands', 'King Edward Point', ['GBP', '£'], 0.75, 'Grytviken (the whaling station, 1904–66)', 'GB', 'the Commissioner (the Governor of the Falklands)');
export const UM = EMPTY('UM', 'the United States Minor Outlying Islands', 'Wake Island', ['USD', '$'], 1, 'Wake Island airfield', 'US', 'the US Fish and Wildlife Service and the Air Force');
