/**
 * The Pacific and Asia's remaining states: Fiji and the island republics, Timor-Leste, Laos,
 * Mongolia and the Maldives. Built with sketch() (../Sketch.js).
 */
import { sketch } from '../Sketch.js';

const C = (id, name, demonym, capital, cur, ppp, family, o) => sketch({ id, name, demonym, capital, cur, ppp, family, ...o });
// The Carolines and the Marianas changed hands with every empire in the Pacific.
const TRUST = (place, until) => [['ES', `the ${place} (Spanish)`, 1899, { noMovement: true }], ['DE', `German New Guinea (the ${place})`, 1914, { noMovement: true }], ['JP', 'the South Seas Mandate', 1945, { noMovement: true }], ['US', 'the Trust Territory of the Pacific Islands', until, { leader: 'the High Commissioner' }]];

export const FJ = C('FJ', 'Fiji', 'Fijian', 'Suva', ['FJD', 'FJ$'], 1.0, 'pacific', {
  languages: ['English', 'Fijian', 'Fiji Hindi'], pop: 930, gdp: 12000, life: 68,
  m: 'Josefa Sitiveni Ratu Jone Ilaitia Peni Vijay Rahul Ashwin Mosese', f: 'Adi Litia Mere Salote Ana Priya Sunita Kelera Vani Asenaca', l: 'Rabuka Bainimarama Qarase Chaudhry Naidu Waqa Tuilagi Seruvakula Prasad Kumar',
  cities: [['suva', 'Suva', '🏛️', 'Capital region', 'medium', 185000, 0.6, 0.4], ['lautoka', 'Lautoka', '🌾', 'Mid-size city', 'small', 72000, 0.55, 0.37], ['nadi', 'Nadi', '✈️', 'Small town', 'small', 72000, 0.58, 0.38], ['labasa', 'Labasa, Vanua Levu', '🌴', 'Small town', 'small', 28000, 0.5, 0.33]],
  provinceWord: 'Division', gov: ['parliamentary', 'Parliament of Fiji', 55, ['People\'s Alliance', 'FijiFirst'], 'Prime Minister'],
  tax: { allowance: 30000, brackets: [[20000, 0.18], [Infinity, 0.2]], vat: 0.15, label: 'Fiji Revenue and Customs Service' },
  religion: { mainline: 35, evangelical: 15, catholic: 9, hindu: 28, sunni: 6, lds: 2, none: 5 },
  ruled: [['GB', 'the Colony of Fiji', 1970, { from: 1874 }]], regimes: [[1970, 'parl', 1, 1], [1987, 'mil', 0, 0], [1992, 'parl', 0, 0], [1999, 'parl', 1, 0], [2006, 'mil', 0, 0], [2014, 'parl', 0, 0], [2022, 'parl', 1, 0]],
  forces: { army: 'Republic of Fiji Military Forces', navy: 'Republic of Fiji Navy', overseas: [['Lebanon', 'UN Interim Force in Lebanon (UNIFIL)'], ['Egypt', 'Multinational Force and Observers, Sinai']] },
});

export const KI = C('KI', 'Kiribati', 'I-Kiribati', 'South Tarawa', ['AUD', 'A$'], 1.5, 'pacific', {
  languages: ['Gilbertese', 'English'], pop: 130, gdp: 2000, life: 67,
  m: 'Taneti Teburoro Anote Tito Ioteba Kautu Tekena Bauro Kaiea Toka', f: 'Tekarara Teretia Tabwena Rereao Nei Kiata Teraaka Taoiaki Tebwebwe Bwaiti', l: 'Maamau Tong Tito Tabai Teannaki Kirata Tetabo Onorio Tekeaa Kaitu',
  cities: [['southtarawa', 'South Tarawa', '🏝️', 'Capital region', 'small', 63000, 0.55, 0.32], ['kiritimati', 'London, Kiritimati', '🐟', 'Small town', 'small', 7000, 0.5, 0.3]],
  provinceWord: 'Island group', provinces: ['Gilbert Islands', 'Line Islands'], gov: ['presidential', 'House of Assembly (Maneaba ni Maungatabu)', 45, ['Boutokaan Kiribati Moa Party', 'Tobwaan Kiribati Party'], 'Beretitenti (President)'],
  tax: { allowance: 3000, brackets: [[20000, 0.2], [Infinity, 0.3]], vat: 0.125 }, religion: { catholic: 57, mainline: 31, lds: 5, evangelical: 7 },
  ruled: [['GB', 'the Gilbert and Ellice Islands', 1979, { from: 1892 }]], regimes: [[1979, 'pres', 1, 0]], forces: { army: 'Kiribati Police Service (no armed forces)' },
});

export const LA = C('LA', 'Laos', 'Lao', 'Vientiane', ['LAK', '₭'], 4500, 'asia', {
  languages: ['Lao'], pop: 7500, gdp: 7500, life: 68,
  m: 'Somphone Khamphoui Bounmy Souksavanh Phonsavanh Vilaykone Thongsavath Saysamone Kaysone Sisouk', f: 'Khamla Noy Phonsavanh Souda Vilayvanh Dara Malaythong Chanthala Bounmy Kesone', l: 'Phomvihane Siphandone Sisoulith Vongsay Keomany Phommachanh Souvannavong Inthavong Xaysomphone Chanthavong',
  cities: [['vientiane', 'Vientiane', '🛕', 'Capital region', 'medium', 950000, 0.35, 0.24], ['luangprabang', 'Luang Prabang', '🛕', 'Small town', 'small', 90000, 0.36, 0.23], ['savannakhet', 'Savannakhet', '🌾', 'Mid-size city', 'small', 125000, 0.3, 0.2], ['pakse', 'Pakse', '☕', 'Mid-size city', 'small', 90000, 0.3, 0.2]],
  provinceWord: 'Province', gov: ['oneParty', 'National Assembly', 164, ['none', 'Lao People\'s Revolutionary Party'], 'Prime Minister'], navy: false,
  tax: { allowance: 1300000 * 12, brackets: [[3700000 * 12, 0.05], [5000000 * 12, 0.1], [Infinity, 0.2]], vat: 0.1 },
  ruled: [['FR', 'French Indochina (Laos)', 1953, { from: 1893 }]], regimes: [[1953, 'semimon', 0, 1], [1975, 'oneparty', 0, 0]], sovereign: [[1953, null]],
  forces: { army: 'Lao People\'s Army' },
});

export const MV = C('MV', 'Maldives', 'Maldivian', 'Malé', ['MVR', 'Rf'], 8, 'asia', {
  languages: ['Dhivehi', 'English'], pop: 520, gdp: 18000, life: 80,
  m: 'Mohamed Ahmed Ibrahim Ali Hassan Abdulla Ismail Hussain Adam Moosa', f: 'Aishath Fathimath Mariyam Hawwa Aminath Khadheeja Shifa Zulfa Nasheeda Raufa', l: 'Nasheed Solih Yameen Gayoom Muizzu Waheed Didi Manik Rasheed Shareef',
  cities: [['male', 'Malé', '🏙️', 'Capital region', 'medium', 210000, 0.7, 0.45], ['addu', 'Addu City', '🏝️', 'Small town', 'small', 34000, 0.6, 0.4]],
  provinceWord: 'Atoll', provinces: ['Kaafu Atoll', 'Addu Atoll'], gov: ['presidential', 'People\'s Majlis', 93, ['Maldivian Democratic Party', 'People\'s National Congress'], 'President of the Maldives'],
  tax: { allowance: 720000, brackets: [[480000, 0.055], [360000, 0.08], [Infinity, 0.15]], vat: 0.08 }, religion: { sunni: 100 }, redCrescent: true,
  police: { name: 'Maldives Police Service', ranks: ['Police cadet', 'Constable', 'Lance Corporal', 'Corporal', 'Sergeant', 'Sub-Inspector', 'Inspector', 'Chief Inspector', 'Superintendent', 'Commissioner'] },
  courts: { top: 'Supreme Court', high: 'High Court', appeal: 'High Court', magistrate: 'Magistrate', appointedBy: 'the Judicial Service Commission' },
  ruled: [['GB', 'the Maldive Islands, a British protectorate', 1965, { from: 1887, noMovement: true, leader: 'the Governor of Ceylon' }]],
  regimes: [[1800, 'absmon', 0, 1], [1968, 'pres', 0, 0], [2008, 'pres', 1, 0], [2013, 'pres', 0, 0], [2018, 'pres', 1, 0]],
  forces: { army: 'Maldives National Defence Force', navy: 'MNDF Coast Guard' },
});

export const MN = C('MN', 'Mongolia', 'Mongolian', 'Ulaanbaatar', ['MNT', '₮'], 1200, 'asia', {
  languages: ['Mongolian'], pop: 3400, gdp: 12000, life: 71,
  m: 'Bat-Erdene Temuujin Ganbold Enkhbayar Batbayar Munkh-Erdene Sukhbaatar Tsogt Bold Erdene', f: 'Oyunchimeg Enkhjargal Altantsetseg Bolormaa Sarangerel Narantuya Odgerel Tsetseg Anu Khulan', l: 'Batbold Enkhbayar Elbegdorj Battulga Khurelsukh Oyun-Erdene Sukhbaatar Tsedenbal Choibalsan Ganbaatar',
  cities: [['ulaanbaatar', 'Ulaanbaatar', '🏙️', 'Capital region', 'large', 1600000, 0.42, 0.33], ['erdenet', 'Erdenet', '⛏️', 'Mid-size city', 'small', 100000, 0.38, 0.3], ['darkhan', 'Darkhan', '🏭', 'Mid-size city', 'small', 85000, 0.37, 0.29], ['olgii', 'Ölgii', '🦅', 'Rural', 'small', 30000, 0.32, 0.24]],
  provinceWord: 'Aimag', gov: ['semi', 'State Great Khural', 126, ['Democratic Party', 'Mongolian People\'s Party'], 'Prime Minister'], navy: false,
  tax: { flat: 0.1, vat: 0.1, corporate: 0.1, label: 'Mongolian Tax Administration' }, religion: { buddhist: 52, sunni: 3, evangelical: 1, none: 44 },
  police: { ranks: ['Police cadet', 'Police private', 'Junior sergeant', 'Sergeant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant colonel', 'Colonel', 'General'], head: 'Chief of the General Police Department' },
  courts: { top: 'Supreme Court of Mongolia', high: 'Aimag Court', appeal: 'Appellate Court', magistrate: 'Soum court judge', appointedBy: 'the President on the Judicial General Council\'s nomination' },
  ruled: [['CN', 'Outer Mongolia, under the Qing', 1911, { leader: 'the Qing amban' }]], regimes: [[1911, 'absmon', 0, 1], [1924, 'oneparty', 0, 0], [1990, 'semi', 1, 0]],
  forces: { army: 'Mongolian Armed Forces', overseas: [['South Sudan', 'UN Mission in South Sudan (UNMISS)']], conscription: { kind: 'universal', age: 18, months: 12, branch: 'army', genders: ['male'], name: 'compulsory military service', text: 'Young men serve a year, or pay a fee in its place.' } },
});

export const FM = C('FM', 'Micronesia', 'Micronesian', 'Palikir', ['USD', '$'], 0.9, 'pacific', {
  languages: ['English', 'Chuukese', 'Pohnpeian'], pop: 115, gdp: 3500, life: 68,
  m: 'Wesley David Peter John Joseph Manny Leo Emanuel Lorin Joe', f: 'Maria Lisa Rose Joyce Emma Grace Kathy Lucy Ruth Mary', l: 'Simina Panuelo Christian Mori Urusemal Falcam Nakayama Olter Hagelgam Ehsa',
  cities: [['palikir', 'Palikir, Pohnpei', '🌴', 'Capital region', 'small', 7000, 0.55, 0.32], ['weno', 'Weno, Chuuk', '🐠', 'Small town', 'small', 14000, 0.5, 0.3], ['kolonia', 'Kolonia, Pohnpei', '🏝️', 'Small town', 'small', 6000, 0.52, 0.3]],
  provinceWord: 'State', provinces: ['Pohnpei', 'Chuuk', 'Pohnpei'], gov: ['presidential', 'Congress of the Federated States', 14, ['independents', 'independents'], 'President of the Federated States'],
  tax: { brackets: [[11000, 0.06], [Infinity, 0.1]], vat: 0.05 }, religion: { catholic: 55, mainline: 40, lds: 5 },
  ruled: TRUST('Caroline Islands', 1986), regimes: [[1986, 'pres', 1, 0]], forces: { army: 'FSM National Police (defence by the United States)' }, freeMovement: ['US'],
});

export const NR = C('NR', 'Nauru', 'Nauruan', 'Yaren', ['AUD', 'A$'], 1.5, 'pacific', {
  languages: ['Nauruan', 'English'], pop: 12, gdp: 12000, life: 64,
  m: 'Baron Lionel David Marcus Sprent Russ Hammer Ludwig Kieren Rennier', f: 'Charmaine Ruby Valdon Iriane Leila Sharon Vinia Alamanda Joanne Lisa', l: 'Waqa Adeang Dabwido Stephen Scotty Kun Aingimea Harris Dowiyogo DeRoburt',
  cities: [['yaren', 'Yaren', '🏝️', 'Capital region', 'small', 1000, 0.6, 0.35], ['aiwo', 'Aiwo', '⛏️', 'Small town', 'small', 1300, 0.58, 0.34]],
  provinceWord: 'District', provinces: ['Yaren', 'Aiwo'], gov: ['parliamentary', 'Parliament of Nauru', 19, ['independents', 'independents'], 'President of Nauru'],
  tax: { brackets: [[Infinity, 0.1]], vat: 0 }, religion: { mainline: 60, catholic: 33, evangelical: 7 },
  ruled: [['DE', 'German New Guinea (Nauru)', 1914, { from: 1888 }], ['AU', 'the Trust Territory of Nauru', 1968, { leader: 'the Administrator' }]], regimes: [[1968, 'parl', 1, 0]],
  forces: { army: 'Nauru Police Force (defence by Australia)' },
});

export const PW = C('PW', 'Palau', 'Palauan', 'Ngerulmud', ['USD', '$'], 0.9, 'pacific', {
  languages: ['Palauan', 'English'], pop: 18, gdp: 15000, life: 72,
  m: 'Surangel Tommy Johnson Kuniwo Haruo Lazarus Billy Gustav Hersey Raynold', f: 'Sandra Ngirmang Valerie Kathy Rose Uduch Elsa Debbie Faustina Ann', l: 'Whipps Remengesau Toribiong Nakamura Kesolei Salii Olkeriil Etpison Ngiraked Rengiil',
  cities: [['koror', 'Koror', '🐠', 'Mid-size city', 'small', 11000, 0.65, 0.4], ['ngerulmud', 'Ngerulmud, Melekeok', '🏛️', 'Capital region', 'small', 300, 0.6, 0.38]],
  provinceWord: 'State', provinces: ['Koror', 'Melekeok'], gov: ['presidential', 'House of Delegates (Olbiil Era Kelulau)', 16, ['independents', 'independents'], 'President of Palau', ['Senate', 13, 'Senator']],
  tax: { brackets: [[8000, 0.06], [Infinity, 0.12]], vat: 0.1 }, religion: { catholic: 45, mainline: 30, evangelical: 15, none: 10 },
  ruled: TRUST('Palau Islands', 1994), regimes: [[1994, 'pres', 1, 0]], forces: { army: 'Palau Bureau of Public Safety (defence by the United States)' }, freeMovement: ['US'],
});

export const WS = C('WS', 'Samoa', 'Samoan', 'Apia', ['WST', 'WS$'], 1.6, 'pacific', {
  languages: ['Samoan', 'English'], pop: 220, gdp: 6000, life: 73,
  m: 'Tuilaepa Fiame Sione Tavita Iosefa Malietoa Lealaiauloto Tupua Peni Aleki', f: 'Naomi Fiame Ana Malia Losa Sina Leilani Tusi Vaitiare Faapisa', l: 'Mataʻafa Sailele Malielegaoi Tamasese Malietoa Leota Faumuina Tuimavave Lealaiauloto Tuala',
  cities: [['apia', 'Apia, Upolu', '🌺', 'Capital region', 'small', 37000, 0.55, 0.33], ['salelologa', 'Salelologa, Savaiʻi', '🌋', 'Small town', 'small', 2500, 0.5, 0.3]],
  provinceWord: 'Island', provinces: ['Upolu', 'Savaiʻi'], gov: ['parliamentary', 'Legislative Assembly (Fono)', 51, ['Human Rights Protection Party', 'FAST'], 'Prime Minister'],
  tax: { allowance: 15000, brackets: [[10000, 0.2], [Infinity, 0.27]], vat: 0.15 }, religion: { mainline: 40, catholic: 18, lds: 17, evangelical: 22, none: 3 },
  ruled: [['DE', 'German Samoa', 1914, { from: 1900 }], ['NZ', 'Western Samoa (a New Zealand mandate)', 1962, { leader: 'the Administrator' }]], periodNames: [[1997, 'Western Samoa']],
  regimes: [[1962, 'parl', 0, 0], [1991, 'parl', 1, 0]], forces: { army: 'Samoa Police Service (defence by New Zealand, under treaty)' },
});

export const TL = C('TL', 'Timor-Leste', 'Timorese', 'Dili', ['USD', '$'], 0.45, 'lusoAfrica', {
  languages: ['Tetum', 'Portuguese'], pop: 1340, gdp: 3500, life: 69,
  m: 'José Xanana Taur Mari Francisco Agio João Manuel António Domingos', f: 'Maria Ana Fernanda Isabel Lurdes Ermelinda Teresa Rosa Lúcia Albertina', l: 'Ramos-Horta Gusmão Alkatiri Matan Ruak Guterres Lu-Olo Soares Pereira da Silva|Ximenes',
  cities: [['dili', 'Dili', '⛪', 'Capital region', 'medium', 280000, 0.45, 0.28], ['baucau', 'Baucau', '🏖️', 'Small town', 'small', 17000, 0.38, 0.24], ['maliana', 'Maliana', '🌾', 'Small town', 'small', 25000, 0.36, 0.22]],
  provinceWord: 'Municipality', gov: ['semi', 'National Parliament', 65, ['FRETILIN', 'National Congress for Timorese Reconstruction (CNRT)'], 'Prime Minister'],
  tax: { allowance: 6000, brackets: [[Infinity, 0.1]], vat: 0.025 }, religion: { catholic: 97, evangelical: 2, sunni: 1 },
  ruled: [['PT', 'Portuguese Timor', 1975], ['ID', 'East Timor, occupied by Indonesia', 2002, { war: true, leader: 'the Indonesian governor' }]], regimes: [[2002, 'semi', 1, 0]], sovereign: [[2002, null]],
  forces: { army: 'FALINTIL-Defence Force of Timor-Leste (F-FDTL)' }, police: { name: 'National Police of Timor-Leste (PNTL)' },
});

export const TV = C('TV', 'Tuvalu', 'Tuvaluan', 'Funafuti', ['AUD', 'A$'], 1.5, 'pacific', {
  languages: ['Tuvaluan', 'English'], pop: 11, gdp: 5000, life: 65,
  m: 'Feleti Kausea Enele Apisai Taukelina Willy Simon Seve Sopoaga Tomasi', f: 'Fale Kaa Selota Teleke Leota Penieli Mataio Silafaga Malama Pulafagu', l: 'Teo Natano Sopoaga Ielemia Puapua Telito Tafua Apinelu Saufatu Paeniu',
  cities: [['funafuti', 'Funafuti', '🏝️', 'Capital region', 'small', 6300, 0.55, 0.32], ['vaitupu', 'Asau, Vaitupu', '🌴', 'Small town', 'small', 1600, 0.5, 0.3]],
  provinceWord: 'Island', provinces: ['Funafuti', 'Vaitupu'], gov: ['monarchy', 'Parliament (Fale i Fono)', 16, ['independents', 'independents'], 'Prime Minister'],
  tax: { brackets: [[Infinity, 0.3]], vat: 0.07 }, religion: { mainline: 92, evangelical: 5, none: 3 },
  ruled: [['GB', 'the Gilbert and Ellice Islands', 1978, { from: 1892 }]], periodNames: [[1975, 'the Ellice Islands']], regimes: [[1978, 'parl', 1, 1]],
  forces: { army: 'Tuvalu Police Force (no armed forces)' },
});
