/**
 * The Americas' remaining states: Spanish America's republics, Cuba and the Dominican Republic,
 * the British Caribbean, the Guianas and Belize. Built with sketch() (../Sketch.js).
 */
import { sketch } from '../Sketch.js';

const C = (id, name, demonym, capital, cur, ppp, family, o) => sketch({ id, name, demonym, capital, cur, ppp, family, ...o });
const XCD = ['XCD', 'EC$'];
const CARIB_M = 'Kevin Andre Jason Marlon Shane Damian Ryan Kirk Terrence Dwayne';
const CARIB_F = 'Keisha Shanice Tamika Kerry-Ann Nadia Simone Natasha Kimberly Latoya Danielle';
const LATIN_M = 'José Juan Carlos Luis Miguel Jorge Diego Javier Andrés Mateo';
const LATIN_F = 'María Ana Sofía Valentina Camila Gabriela Lucía Daniela Isabella Fernanda';
const island = (ruler, name, until, o) => [[ruler, name, until, o ?? {}]];

export const AG = C('AG', 'Antigua and Barbuda', 'Antiguan', 'St. John\'s', XCD, 2.0, 'caribbean', {
  languages: ['English'], pop: 95, gdp: 20000, life: 77, m: CARIB_M, f: CARIB_F, l: 'Bird Browne Joseph Samuel Roberts Simon Henry Thomas Francis Christian',
  cities: [['stjohns', 'St. John\'s, Antigua', '⛵', 'Capital region', 'small', 22000, 0.75, 0.5], ['codrington', 'Codrington, Barbuda', '🏝️', 'Small town', 'small', 1500, 0.7, 0.45]],
  provinceWord: 'Parish', gov: ['monarchy', 'House of Representatives', 17, ['United Progressive Party', 'Antigua and Barbuda Labour Party'], 'Prime Minister'],
  tax: { brackets: [[Infinity, 0]], vat: 0.17, corporate: 0.25 }, ruled: island('GB', 'the Colony of Antigua', 1981), regimes: [[1981, 'parl', 1, 1]],
  forces: { army: 'Antigua and Barbuda Defence Force', navy: 'Coast Guard' },
});

export const BB = C('BB', 'Barbados', 'Barbadian', 'Bridgetown', ['BBD', 'Bds$'], 2.4, 'caribbean', {
  languages: ['English'], pop: 282, gdp: 15000, life: 78, m: CARIB_M, f: CARIB_F, l: 'Mottley Barrow Adams Sandiford Arthur Thompson Stuart Griffith Worrell Clarke',
  cities: [['bridgetown', 'Bridgetown', '⛵', 'Capital region', 'small', 110000, 0.8, 0.55], ['speightstown', 'Speightstown', '🏖️', 'Small town', 'small', 3600, 0.75, 0.5], ['oistins', 'Oistins', '🐟', 'Small town', 'small', 2300, 0.75, 0.5]],
  provinceWord: 'Parish', gov: ['parliamentary', 'House of Assembly', 30, ['Democratic Labour Party', 'Barbados Labour Party'], 'Prime Minister', ['Senate', 21, 'Senator', false]],
  tax: { allowance: 25000, brackets: [[50000, 0.125], [Infinity, 0.285]], vat: 0.175, label: 'Barbados Revenue Authority' },
  ruled: island('GB', 'the Colony of Barbados', 1966), regimes: [[1966, 'parl', 1, 1], [2021, 'parl', 1, 0]],
  forces: { army: 'Barbados Defence Force', navy: 'Barbados Coast Guard' }, police: { name: 'Royal Barbados Police Force' },
});

export const BZ = C('BZ', 'Belize', 'Belizean', 'Belmopan', ['BZD', 'BZ$'], 1.2, 'caribbean', {
  languages: ['English', 'Spanish', 'Kriol'], pop: 410, gdp: 7000, life: 72, m: `${CARIB_M} José Luis`, f: `${CARIB_F} María Rosa`, l: 'Briceño Barrow Musa Esquivel Price Young Flowers Castillo Cal Lopez',
  cities: [['belmopan', 'Belmopan', '🏛️', 'Capital region', 'small', 24000, 0.55, 0.38], ['belizecity', 'Belize City', '⚓', 'Coastal metro', 'small', 64000, 0.58, 0.4], ['sanignacio', 'San Ignacio, Cayo', '🌳', 'Small town', 'small', 22000, 0.5, 0.35]],
  provinceWord: 'District', gov: ['monarchy', 'House of Representatives', 31, ['People\'s United Party', 'United Democratic Party'], 'Prime Minister', ['Senate', 13, 'Senator', false]],
  tax: { allowance: 26000, brackets: [[Infinity, 0.25]], vat: 0.125 }, religion: { catholic: 40, evangelical: 30, mainline: 12, none: 18 },
  ruled: island('GB', 'British Honduras', 1981), regimes: [[1981, 'parl', 1, 1]], forces: { army: 'Belize Defence Force' },
});

export const BO = C('BO', 'Bolivia', 'Bolivian', 'Sucre', ['BOB', 'Bs'], 2.7, 'latin', {
  languages: ['Spanish', 'Quechua', 'Aymara'], pop: 12200, gdp: 8000, life: 68, m: `${LATIN_M} Evo Álvaro`, f: `${LATIN_F} Jeanine Wara`, l: 'Mamani Quispe Condori Choque Flores Morales Arce Mesa Paz Sánchez',
  cities: [['lapaz', 'La Paz', '🏔️', 'Mid-size city', 'large', 900000, 0.38, 0.28], ['santacruz', 'Santa Cruz de la Sierra', '🏙️', 'Mid-size city', 'large', 1900000, 0.42, 0.31], ['cochabamba', 'Cochabamba', '🌽', 'Mid-size city', 'medium', 630000, 0.38, 0.27], ['sucre', 'Sucre', '🏛️', 'Capital region', 'medium', 300000, 0.36, 0.26], ['potosi', 'Potosí', '⛏️', 'Small town', 'small', 190000, 0.32, 0.23]],
  provinceWord: 'Department', gov: ['presidential', 'Chamber of Deputies', 130, ['Movement for Socialism (MAS)', 'Civic Community'], 'President of Bolivia', ['Chamber of Senators', 36, 'Senator']], navy: false,
  tax: { flat: 0.13, vat: 0.13, corporate: 0.25, label: 'National Tax Service (SIN)' }, religion: { catholic: 70, evangelical: 20, none: 10 },
  ruled: [['ES', 'the Audiencia of Charcas (Upper Peru)', 1825, { war: true, leader: 'the President of the Audiencia' }]],
  regimes: [[1825, 'mil', 0, 0], [1880, 'olig', 0, 0], [1936, 'mil', 0, 0], [1952, 'pres', 0, 0], [1964, 'mil', 0, 0], [1982, 'pres', 1, 0], [2019, 'pres', 0, 0], [2020, 'pres', 1, 0]],
  forces: { army: 'Bolivian Army', navy: 'Bolivian Navy (on Lake Titicaca)' },
});

export const CU = C('CU', 'Cuba', 'Cuban', 'Havana', ['CUP', '$'], 3, 'latin', {
  languages: ['Spanish'], pop: 11100, gdp: 8000, life: 78, m: `${LATIN_M} Raúl Yoandri`, f: `${LATIN_F} Yanelis Mayelín`, l: 'González Rodríguez Hernández Pérez García Díaz Fernández Martínez López Castro',
  cities: [['havana', 'Havana', '🚗', 'Capital region', 'large', 2100000, 0.38, 0.2], ['santiagodecuba', 'Santiago de Cuba', '🎺', 'Mid-size city', 'medium', 510000, 0.33, 0.18], ['camaguey', 'Camagüey', '⛪', 'Mid-size city', 'medium', 320000, 0.32, 0.17], ['varadero', 'Varadero', '🏖️', 'Small town', 'small', 27000, 0.4, 0.2]],
  provinceWord: 'Province', gov: ['oneParty', 'National Assembly of People\'s Power', 470, ['none', 'Communist Party of Cuba'], 'President of Cuba'],
  tax: { brackets: [[Infinity, 0.15]], vat: 0.1, corporate: 0.35 }, religion: { catholic: 55, evangelical: 10, none: 35 }, informality: 0.4,
  ruled: [['ES', 'the Captaincy General of Cuba (Spanish)', 1898, { war: true, leader: 'the Captain General' }], ['US', 'Cuba under American military government', 1902, { noMovement: true, leader: 'the Military Governor' }]],
  regimes: [[1902, 'pres', 0, 0], [1933, 'mil', 0, 0], [1940, 'pres', 1, 0], [1952, 'pers', 0, 0], [1959, 'oneparty', 0, 0]],
  forces: { army: 'Revolutionary Armed Forces (FAR)', conscription: { kind: 'universal', age: 17, months: 24, branch: 'army', genders: ['male'], name: 'Servicio Militar Activo', text: 'Young men serve two years in the Revolutionary Armed Forces.' } },
  police: { name: 'Revolutionary National Police (PNR)' },
});

export const DM = C('DM', 'Dominica', 'Dominican', 'Roseau', XCD, 2.0, 'caribbean', {
  languages: ['English', 'Kwéyòl'], pop: 72, gdp: 12000, life: 74, m: CARIB_M, f: CARIB_F, l: 'Skerrit Charles Douglas Linton Joseph John Baptiste Pierre Christian Felix',
  cities: [['roseau', 'Roseau', '🌋', 'Capital region', 'small', 15000, 0.65, 0.42], ['portsmouthdm', 'Portsmouth, Dominica', '⛵', 'Small town', 'small', 3600, 0.6, 0.4]],
  provinceWord: 'Parish', gov: ['parliamentary', 'House of Assembly', 32, ['United Workers\' Party', 'Dominica Labour Party'], 'Prime Minister'],
  tax: { allowance: 30000, brackets: [[20000, 0.15], [30000, 0.25], [Infinity, 0.35]], vat: 0.15 }, religion: { catholic: 60, evangelical: 25, mainline: 10, none: 5 },
  ruled: island('GB', 'the Colony of Dominica', 1978), regimes: [[1978, 'parl', 1, 0]], forces: { army: 'Dominica Police Force Special Services Unit' },
});

export const DO = C('DO', 'Dominican Republic', 'Dominican', 'Santo Domingo', ['DOP', 'RD$'], 24, 'latin', {
  languages: ['Spanish'], pop: 11200, gdp: 18000, life: 74, m: `${LATIN_M} Rafael Leonel`, f: `${LATIN_F} Yokasta Raquel`, l: 'Rodríguez Pérez García Martínez Sánchez Báez Abinader Fernández Medina Peña',
  cities: [['santodomingo', 'Santo Domingo', '🏙️', 'Capital region', 'large', 3500000, 0.45, 0.32], ['santiagodr', 'Santiago de los Caballeros', '🚬', 'Mid-size city', 'large', 1000000, 0.42, 0.3], ['puntacana', 'Punta Cana', '🏖️', 'Small town', 'small', 100000, 0.5, 0.33], ['puertoplata', 'Puerto Plata', '⚓', 'Coastal metro', 'medium', 160000, 0.42, 0.3]],
  provinceWord: 'Province', gov: ['presidential', 'Chamber of Deputies', 190, ['Dominican Liberation Party', 'Modern Revolutionary Party'], undefined, ['Senate', 32, 'Senator']],
  tax: { allowance: 416220, brackets: [[208000, 0.15], [242000, 0.2], [Infinity, 0.25]], vat: 0.18, label: 'General Directorate of Internal Taxes (DGII)' },
  ruled: [['ES', 'Santo Domingo (Spanish)', 1821], ['HT', 'Santo Domingo, under Haiti', 1844, { war: true, leader: 'the Haitian governor' }]],
  regimes: [[1844, 'pers', 0, 0], [1861, 'mil', 0, 0], [1865, 'pers', 0, 0], [1916, 'mil', 0, 0], [1924, 'pres', 0, 0], [1930, 'pers', 0, 0], [1961, 'mil', 0, 0], [1966, 'pres', 0, 0], [1978, 'pres', 1, 0]],
});

export const EC = C('EC', 'Ecuador', 'Ecuadorian', 'Quito', ['USD', '$'], 0.55, 'latin', {
  languages: ['Spanish', 'Kichwa'], pop: 18000, gdp: 11000, life: 77, m: `${LATIN_M} Rafael Guillermo`, f: `${LATIN_F} Paola Daniela`, l: 'Moreno Correa Noboa Lasso Andrade Vera Zambrano Cevallos Mendoza Villacís',
  cities: [['quito', 'Quito', '🏔️', 'Capital region', 'large', 2000000, 0.45, 0.33], ['guayaquil', 'Guayaquil', '⚓', 'Coastal metro', 'large', 2700000, 0.43, 0.32], ['cuenca', 'Cuenca', '⛪', 'Mid-size city', 'medium', 400000, 0.42, 0.3], ['galapagos', 'Puerto Ayora, Galápagos', '🐢', 'Small town', 'small', 12000, 0.6, 0.35]],
  provinceWord: 'Province', gov: ['presidential', 'National Assembly', 151, ['Citizen Revolution', 'National Democratic Action (ADN)']],
  tax: { allowance: 11900, brackets: [[3800, 0.05], [10000, 0.15], [30000, 0.25], [Infinity, 0.37]], vat: 0.15, label: 'Internal Revenue Service (SRI)' },
  ruled: [['ES', 'the Audiencia of Quito', 1822, { war: true, leader: 'the President of the Audiencia' }], ['CO', 'a department of Gran Colombia', 1830, { noMovement: true, leader: 'the Intendant' }]],
  regimes: [[1830, 'mil', 0, 0], [1860, 'pers', 0, 0], [1895, 'olig', 0, 0], [1948, 'pres', 1, 0], [1963, 'mil', 0, 0], [1979, 'pres', 1, 0]],
  money: [[2000, 'ECS', 'S/', 'Ecuadorian sucre', 25000]],
});

export const SV = C('SV', 'El Salvador', 'Salvadoran', 'San Salvador', ['USD', '$'], 0.5, 'latin', {
  languages: ['Spanish'], pop: 6300, gdp: 9000, life: 72, m: `${LATIN_M} Nayib Óscar`, f: `${LATIN_F} Gabriela Elena`, l: 'Hernández Martínez López Rivera Flores Bukele Duarte Cristiani Romero Sánchez',
  cities: [['sansalvador', 'San Salvador', '🌋', 'Capital region', 'large', 1100000, 0.42, 0.3], ['santaana', 'Santa Ana', '☕', 'Mid-size city', 'medium', 260000, 0.38, 0.27], ['sanmiguel', 'San Miguel', '🌾', 'Mid-size city', 'medium', 250000, 0.37, 0.26], ['lalibertad', 'La Libertad', '🏄', 'Small town', 'small', 40000, 0.42, 0.28]],
  gov: ['presidential', 'Legislative Assembly', 60, ['FMLN', 'Nuevas Ideas']], provinceWord: 'Department',
  tax: { allowance: 4800, brackets: [[2800, 0.1], [12000, 0.2], [Infinity, 0.3]], vat: 0.13 },
  ruled: [['ES', 'the Captaincy General of Guatemala (El Salvador)', 1821]],
  regimes: [[1841, 'olig', 0, 0], [1931, 'mil', 0, 0], [1984, 'pres', 1, 0], [2021, 'pers', 0, 0]], money: [[2001, 'SVC', '₡', 'Salvadoran colón', 8.75]],
});

export const GD = C('GD', 'Grenada', 'Grenadian', 'St. George\'s', XCD, 2.0, 'caribbean', {
  languages: ['English'], pop: 126, gdp: 14000, life: 75, m: CARIB_M, f: CARIB_F, l: 'Mitchell Bishop Gairy Mitchell Keith Charles Joseph Noel Thomas Pierre',
  cities: [['stgeorges', 'St. George\'s', '🌶️', 'Capital region', 'small', 34000, 0.7, 0.45], ['gouyave', 'Gouyave', '🐟', 'Small town', 'small', 3000, 0.62, 0.4]],
  provinceWord: 'Parish', gov: ['monarchy', 'House of Representatives', 15, ['New National Party', 'National Democratic Congress'], 'Prime Minister'],
  tax: { allowance: 36000, brackets: [[24000, 0.1], [Infinity, 0.28]], vat: 0.15 }, religion: { catholic: 45, anglican: 12, evangelical: 33, none: 10 },
  ruled: island('GB', 'the Colony of Grenada', 1974), regimes: [[1974, 'parl', 0, 1], [1979, 'oneparty', 0, 1], [1984, 'parl', 1, 1]],
  forces: { army: 'Royal Grenada Police Force Special Services Unit' },
});

export const GY = C('GY', 'Guyana', 'Guyanese', 'Georgetown', ['GYD', 'G$'], 105, 'caribbean', {
  languages: ['English', 'Guyanese Creole'], pop: 810, gdp: 25000, life: 70, m: `${CARIB_M} Bharrat Irfaan`, f: `${CARIB_F} Priya Shabnam`, l: 'Jagdeo Ali Granger Burnham Jagan Persaud Singh Ramotar Williams Hoyte',
  cities: [['georgetowngy', 'Georgetown', '🛶', 'Capital region', 'medium', 200000, 0.55, 0.4], ['linden', 'Linden', '⛏️', 'Small town', 'small', 30000, 0.48, 0.34], ['newamsterdam', 'New Amsterdam', '🌾', 'Small town', 'small', 18000, 0.47, 0.33]],
  gov: ['presidential', 'National Assembly', 65, ['A Partnership for National Unity', 'People\'s Progressive Party/Civic'], 'President of Guyana'],
  tax: { allowance: 1560000, brackets: [[3120000, 0.25], [Infinity, 0.35]], vat: 0.14, label: 'Guyana Revenue Authority' },
  religion: { hindu: 25, evangelical: 25, anglican: 7, mainline: 14, catholic: 7, sunni: 7, none: 15 },
  ruled: [['NL', 'Dutch Demerara and Essequibo', 1814, { noMovement: true }], ['GB', 'British Guiana', 1966]], regimes: [[1966, 'parl', 0, 1], [1970, 'pres', 0, 0], [1980, 'oneparty', 0, 0], [1992, 'pres', 1, 0]],
  forces: { army: 'Guyana Defence Force' },
});

export const HN = C('HN', 'Honduras', 'Honduran', 'Tegucigalpa', ['HNL', 'L'], 12, 'latin', {
  languages: ['Spanish'], pop: 10300, gdp: 5500, life: 72, m: `${LATIN_M} Juan Orlando Manuel`, f: `${LATIN_F} Xiomara Iris`, l: 'Hernández López Martínez Rodríguez Zelaya Castro Flores Reyes Mejía Maradiaga',
  cities: [['tegucigalpa', 'Tegucigalpa', '⛰️', 'Capital region', 'large', 1300000, 0.37, 0.25], ['sanpedrosula', 'San Pedro Sula', '🏭', 'Mid-size city', 'large', 800000, 0.37, 0.26], ['laceiba', 'La Ceiba', '🌴', 'Coastal metro', 'medium', 200000, 0.35, 0.24], ['roatan', 'Roatán, Bay Islands', '🐠', 'Small town', 'small', 30000, 0.45, 0.28]],
  provinceWord: 'Department', gov: ['presidential', 'National Congress', 128, ['Libre', 'National Party']],
  tax: { allowance: 200000, brackets: [[300000, 0.15], [200000, 0.2], [Infinity, 0.25]], vat: 0.15 },
  ruled: [['ES', 'the Captaincy General of Guatemala (Honduras)', 1821]],
  regimes: [[1838, 'pers', 0, 0], [1880, 'olig', 0, 0], [1933, 'pers', 0, 0], [1956, 'mil', 0, 0], [1982, 'pres', 1, 0], [2009, 'pres', 0, 0]],
});

export const NI = C('NI', 'Nicaragua', 'Nicaraguan', 'Managua', ['NIO', 'C$'], 13, 'latin', {
  languages: ['Spanish'], pop: 6900, gdp: 5500, life: 74, m: `${LATIN_M} Daniel Augusto`, f: `${LATIN_F} Violeta Rosario`, l: 'Ortega Somoza Chamorro Murillo Sandino García López Martínez Reyes Gutiérrez',
  cities: [['managua', 'Managua', '🌋', 'Capital region', 'large', 1100000, 0.35, 0.24], ['leon', 'León', '⛪', 'Mid-size city', 'medium', 210000, 0.32, 0.22], ['granada', 'Granada', '🏛️', 'Mid-size city', 'small', 130000, 0.33, 0.22], ['bluefields', 'Bluefields', '🌴', 'Small town', 'small', 55000, 0.3, 0.2]],
  provinceWord: 'Department', gov: ['presidential', 'National Assembly', 92, ['Constitutionalist Liberal Party', 'Sandinista National Liberation Front (FSLN)']],
  tax: { allowance: 100000, brackets: [[100000, 0.15], [150000, 0.2], [150000, 0.25], [Infinity, 0.3]], vat: 0.15 },
  ruled: [['ES', 'the Captaincy General of Guatemala (Nicaragua)', 1821]],
  regimes: [[1838, 'olig', 0, 0], [1912, 'olig', 0, 0], [1936, 'pers', 0, 0], [1979, 'oneparty', 0, 0], [1990, 'pres', 1, 0], [2007, 'pers', 0, 0]],
});

export const PY = C('PY', 'Paraguay', 'Paraguayan', 'Asunción', ['PYG', '₲'], 2600, 'latin', {
  languages: ['Spanish', 'Guaraní'], pop: 6900, gdp: 12500, life: 74, m: `${LATIN_M} Santiago Horacio`, f: `${LATIN_F} Lilian Rocío`, l: 'González Benítez Martínez López Giménez Duarte Cartes Peña Stroessner Villalba',
  cities: [['asuncion', 'Asunción', '🏛️', 'Capital region', 'large', 520000, 0.42, 0.3], ['ciudaddeleste', 'Ciudad del Este', '🛍️', 'Mid-size city', 'medium', 300000, 0.4, 0.3], ['encarnacion', 'Encarnación', '🏖️', 'Mid-size city', 'small', 130000, 0.38, 0.27]],
  provinceWord: 'Department', gov: ['presidential', 'Chamber of Deputies', 80, ['Authentic Radical Liberal Party', 'Colorado Party'], undefined, ['Chamber of Senators', 45, 'Senator']], navy: false,
  tax: { flat: 0.1, vat: 0.1, corporate: 0.1 },
  ruled: [['ES', 'the Intendancy of Paraguay', 1811, { leader: 'the Governor-Intendant' }]],
  regimes: [[1811, 'pers', 0, 0], [1870, 'olig', 0, 0], [1940, 'mil', 0, 0], [1954, 'pers', 0, 0], [1989, 'pres', 0, 0], [1993, 'pres', 1, 0]],
});

export const KN = C('KN', 'Saint Kitts and Nevis', 'Kittitian', 'Basseterre', XCD, 2.0, 'caribbean', {
  languages: ['English'], pop: 48, gdp: 26000, life: 72, m: CARIB_M, f: CARIB_F, l: 'Douglas Harris Drew Simmonds Bradshaw Liburd Brantley Herbert Williams Phipps',
  cities: [['basseterre', 'Basseterre, St Kitts', '⛵', 'Capital region', 'small', 14000, 0.75, 0.5], ['charlestown', 'Charlestown, Nevis', '🏝️', 'Small town', 'small', 2000, 0.72, 0.48]],
  provinceWord: 'Island', provinces: ['Saint Kitts', 'Nevis'], gov: ['monarchy', 'National Assembly', 15, ['People\'s Action Movement', 'St Kitts-Nevis Labour Party'], 'Prime Minister'],
  tax: { brackets: [[Infinity, 0]], vat: 0.17 }, ruled: island('GB', 'the Colony of Saint Christopher-Nevis-Anguilla', 1983), regimes: [[1983, 'parl', 1, 1]],
  forces: { army: 'St Kitts and Nevis Defence Force' },
});

export const LC = C('LC', 'Saint Lucia', 'Saint Lucian', 'Castries', XCD, 2.0, 'caribbean', {
  languages: ['English', 'Kwéyòl'], pop: 180, gdp: 14000, life: 73, m: CARIB_M, f: CARIB_F, l: 'Pierre Compton Chastanet Anthony King Joseph Jean-Baptiste Charles Louis Fontenelle',
  cities: [['castries', 'Castries', '⛵', 'Capital region', 'small', 70000, 0.68, 0.45], ['vieuxfort', 'Vieux Fort', '✈️', 'Small town', 'small', 16000, 0.62, 0.42], ['soufriere', 'Soufrière', '🌋', 'Small town', 'small', 8000, 0.62, 0.4]],
  provinceWord: 'Quarter', gov: ['monarchy', 'House of Assembly', 17, ['United Workers Party', 'Saint Lucia Labour Party'], 'Prime Minister'],
  tax: { allowance: 18000, brackets: [[10000, 0.1], [10000, 0.15], [Infinity, 0.3]], vat: 0.125 }, religion: { catholic: 61, evangelical: 25, anglican: 2, none: 12 },
  ruled: island('GB', 'the Colony of Saint Lucia', 1979), regimes: [[1979, 'parl', 1, 1]],
});

export const VC = C('VC', 'Saint Vincent and the Grenadines', 'Vincentian', 'Kingstown', XCD, 2.0, 'caribbean', {
  languages: ['English'], pop: 104, gdp: 13000, life: 72, m: CARIB_M, f: CARIB_F, l: 'Gonsalves Mitchell Friday Cato Browne Williams Joshua Ollivierre Daniel John',
  cities: [['kingstownvc', 'Kingstown', '⛵', 'Capital region', 'small', 25000, 0.65, 0.42], ['bequia', 'Port Elizabeth, Bequia', '⛵', 'Small town', 'small', 4300, 0.65, 0.42]],
  provinceWord: 'Parish', gov: ['monarchy', 'House of Assembly', 21, ['New Democratic Party', 'Unity Labour Party'], 'Prime Minister'],
  tax: { allowance: 25000, brackets: [[20000, 0.1], [Infinity, 0.3]], vat: 0.16 }, religion: { anglican: 17, evangelical: 45, mainline: 18, catholic: 7, none: 13 },
  ruled: island('GB', 'the Colony of Saint Vincent', 1979), regimes: [[1979, 'parl', 1, 1]],
});

export const SR = C('SR', 'Suriname', 'Surinamese', 'Paramaribo', ['SRD', 'Sr$'], 12, 'caribbean', {
  languages: ['Dutch', 'Sranan Tongo'], pop: 620, gdp: 15000, life: 72, m: 'Ramesh Chan Ronnie Desi Dino Johan Henk Ricardo Anand Sunil', f: 'Jennifer Sharmila Chantal Radjeshwari Marlies Ingrid Anouk Sita Nadia Ruth', l: 'Santokhi Bouterse Venetiaan Wijdenbosch Ramdin Sewdien Kartosen Simons Brunswijk Abrahams',
  cities: [['paramaribo', 'Paramaribo', '🛶', 'Capital region', 'medium', 240000, 0.5, 0.35], ['lelydorp', 'Lelydorp', '🌾', 'Small town', 'small', 20000, 0.45, 0.32], ['nieuwnickerie', 'Nieuw Nickerie', '🍚', 'Small town', 'small', 13000, 0.43, 0.3]],
  provinceWord: 'District', gov: ['presidential', 'National Assembly (De Nationale Assemblée)', 51, ['Progressive Reform Party (VHP)', 'National Democratic Party (NDP)'], 'President of Suriname'],
  tax: { allowance: 108000, brackets: [[42000, 0.08], [42000, 0.18], [Infinity, 0.38]], vat: 0.1 },
  religion: { hindu: 22, evangelical: 25, catholic: 20, sunni: 14, mainline: 5, none: 14 }, groups: [], jury: false,
  police: { name: 'Korps Politie Suriname', ranks: ['Aspirant', 'Agent', 'Hoofdagent', 'Brigadier', 'Inspecteur', 'Hoofdinspecteur', 'Commissaris', 'Hoofdcommissaris', 'Waarnemend Korpschef', 'Korpschef'] },
  courts: { top: 'High Court of Justice (Hof van Justitie)', high: 'Cantonal Court (Kantongerecht)', appeal: 'Court of Appeal', magistrate: 'Cantonal judge', appointedBy: 'the President' },
  edu: { exam: 'VWO diploma', state: 'Anton de Kom University of Suriname', elite: 'Anton de Kom University of Suriname' },
  ruled: island('NL', 'Dutch Suriname', 1975), regimes: [[1975, 'parl', 1, 0], [1980, 'mil', 0, 0], [1988, 'pres', 0, 0], [1991, 'pres', 1, 0]], forces: { army: 'National Army (Nationaal Leger)' },
});

export const TT = C('TT', 'Trinidad and Tobago', 'Trinidadian', 'Port of Spain', ['TTD', 'TT$'], 4, 'caribbean', {
  languages: ['English'], pop: 1400, gdp: 25000, life: 74, m: `${CARIB_M} Ravi Keith`, f: `${CARIB_F} Kamla Indira`, l: 'Persad-Bissessar Rowley Manning Panday Robinson Williams Ramdeen Mohammed Ali Singh',
  cities: [['portofspain', 'Port of Spain', '🎭', 'Capital region', 'medium', 300000, 0.62, 0.45], ['sanfernando', 'San Fernando', '🛢️', 'Mid-size city', 'medium', 50000, 0.58, 0.43], ['chaguanas', 'Chaguanas', '🛍️', 'Mid-size city', 'medium', 85000, 0.55, 0.4], ['scarborough', 'Scarborough, Tobago', '🏝️', 'Small town', 'small', 17000, 0.6, 0.42]],
  provinceWord: 'Region', gov: ['parliamentary', 'House of Representatives', 41, ['United National Congress', 'People\'s National Movement'], 'Prime Minister', ['Senate', 31, 'Senator', false]],
  tax: { allowance: 90000, brackets: [[1000000, 0.25], [Infinity, 0.3]], vat: 0.125, label: 'Board of Inland Revenue' },
  religion: { catholic: 21, hindu: 18, evangelical: 26, anglican: 6, mainline: 6, sunni: 5, none: 18 },
  ruled: [['ES', 'Spanish Trinidad', 1797, { noMovement: true }], ['GB', 'the Colony of Trinidad and Tobago', 1962]], regimes: [[1962, 'parl', 1, 1], [1976, 'parl', 1, 0]],
  forces: { army: 'Trinidad and Tobago Defence Force', navy: 'Trinidad and Tobago Coast Guard' }, police: { name: 'Trinidad and Tobago Police Service' },
});

export const UY = C('UY', 'Uruguay', 'Uruguayan', 'Montevideo', ['UYU', '$U'], 30, 'latin', {
  languages: ['Spanish'], pop: 3400, gdp: 22000, life: 78, m: `${LATIN_M} Martín Santiago`, f: `${LATIN_F} Florencia Agustina`, l: 'Rodríguez González Fernández Martínez Pereira Silva Sosa Mujica Vázquez Lacalle',
  cities: [['montevideo', 'Montevideo', '🧉', 'Capital region', 'large', 1400000, 0.65, 0.5], ['salto', 'Salto', '♨️', 'Mid-size city', 'medium', 110000, 0.55, 0.42], ['paysandu', 'Paysandú', '🌾', 'Mid-size city', 'small', 76000, 0.53, 0.4], ['puntadeleste', 'Punta del Este', '🏖️', 'Small town', 'small', 12000, 0.75, 0.48]],
  provinceWord: 'Department', gov: ['presidential', 'Chamber of Representatives', 99, ['Broad Front', 'National Party'], undefined, ['Chamber of Senators', 30, 'Senator']],
  tax: { allowance: 500000, brackets: [[220000, 0.1], [400000, 0.15], [1000000, 0.24], [2000000, 0.25], [Infinity, 0.36]], vat: 0.22, corporate: 0.25, label: 'General Tax Directorate (DGI)' },
  religion: { catholic: 40, evangelical: 10, mainline: 3, none: 47 }, informality: 0.25,
  ruled: [['ES', 'the Banda Oriental', 1811], ['BR', 'the Cisplatine Province', 1828, { war: true, leader: 'the Brazilian governor' }]],
  regimes: [[1828, 'pers', 0, 0], [1875, 'mil', 0, 0], [1890, 'olig', 0, 0], [1919, 'pres', 1, 0], [1933, 'pers', 0, 0], [1942, 'pres', 1, 0], [1973, 'mil', 0, 0], [1985, 'pres', 1, 0]],
});
