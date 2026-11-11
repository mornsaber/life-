/**
 * Africa's remaining states: French, British, Portuguese, Belgian, German, Italian and Spanish
 * colonies that became independent between 1956 and 1993, Algeria and Tunisia, the kingdoms of
 * Lesotho and Eswatini, and Madagascar. Built with sketch() (../Sketch.js).
 */
import { sketch } from '../Sketch.js';

const C = (id, name, demonym, capital, cur, ppp, family, o) => sketch({ id, name, demonym, capital, cur, ppp, family, ...o });
const CFA = ['XOF', 'CFA'];
const CFAC = ['XAF', 'FCFA'];
// Name pools West and Central Africa share.
const FR_M = 'Moussa Ibrahim Abdoulaye Mamadou Jean Pierre Paul Joseph Emmanuel Serge';
const FR_F = 'Aminata Fatou Mariam Aïcha Awa Marie Françoise Christine Rose Grâce';

export const DZ = C('DZ', 'Algeria', 'Algerian', 'Algiers', ['DZD', 'DA'], 37, 'maghreb', {
  languages: ['Arabic', 'Tamazight', 'French'], pop: 44700, gdp: 13000, life: 76,
  m: 'Mohamed Ahmed Yacine Amine Karim Sofiane Riad Walid Rachid Mehdi', f: 'Amina Fatima Sarah Lina Yasmine Meriem Imane Nour Lynda Sabrina', l: 'Benali Bouziane Belkacem Haddad Saidi Mansouri Hamidi Boudiaf Cherif Meziane',
  cities: [['algiers', 'Algiers', '🕌', 'Capital region', 'large', 3400000, 0.42, 0.33], ['oran', 'Oran', '⚓', 'Coastal metro', 'large', 1500000, 0.4, 0.31], ['constantine', 'Constantine', '🌉', 'Mid-size city', 'medium', 950000, 0.37, 0.28], ['tamanrasset', 'Tamanrasset', '🏜️', 'Rural', 'small', 90000, 0.3, 0.22]],
  provinceWord: 'Wilaya', gov: ['presidential', 'People\'s National Assembly', 407, ['Front of Socialist Forces', 'National Liberation Front (FLN)']],
  tax: { allowance: 240000, brackets: [[240000, 0.23], [480000, 0.27], [960000, 0.3], [Infinity, 0.35]], vat: 0.19, corporate: 0.26, label: 'Directorate General of Taxes' },
  regimes: [[1962, 'oneparty', 0, 0], [1965, 'mil', 0, 0], [1979, 'oneparty', 0, 0], [1992, 'mil', 0, 0], [1999, 'multiauth', 0, 0]],
  forces: { army: 'National People\'s Army', conscription: { kind: 'universal', age: 19, months: 12, branch: 'army', genders: ['male'], name: 'national service', text: 'Every young man owes a year of national service.' } }, centralBank: 'Bank of Algeria',
});

export const AO = C('AO', 'Angola', 'Angolan', 'Luanda', ['AOA', 'Kz'], 230, 'lusoAfrica', {
  languages: ['Portuguese'], pop: 34500, gdp: 6500, life: 62,
  m: 'João Manuel António José Francisco Paulo Domingos Miguel Pedro Eduardo', f: 'Maria Ana Joana Teresa Luísa Rosa Isabel Esperança Madalena Lúcia', l: 'Dos Santos Lourenço Fernandes Pereira Domingos Silva Neto Gonçalves Kiala Mbala',
  cities: [['luanda', 'Luanda', '🏙️', 'Capital region', 'large', 2600000, 0.6, 0.38], ['huambo', 'Huambo', '🌄', 'Mid-size city', 'medium', 600000, 0.45, 0.28], ['lobito', 'Lobito', '⚓', 'Coastal metro', 'medium', 360000, 0.48, 0.3], ['lubango', 'Lubango', '⛰️', 'Mid-size city', 'medium', 400000, 0.45, 0.28]],
  provinceWord: 'Province', gov: ['presidential', 'National Assembly', 220, ['UNITA', 'MPLA']],
  tax: { allowance: 1200000, brackets: [[3600000, 0.13], [Infinity, 0.25]], vat: 0.14, corporate: 0.25, label: 'General Tax Administration (AGT)' },
  ruled: [['PT', 'Portuguese Angola', 1975, { war: true }]], regimes: [[1975, 'oneparty', 0, 0], [1992, 'multiauth', 0, 0]],
  forces: { army: 'Angolan Armed Forces (FAA)' }, centralBank: 'National Bank of Angola',
});

export const BJ = C('BJ', 'Benin', 'Beninese', 'Porto-Novo', CFA, 210, 'francoAfrica', {
  languages: ['French', 'Fon'], pop: 12500, gdp: 3300, life: 60,
  m: `${FR_M} Koffi Sèna`, f: `${FR_F} Ablavi Sènami`, l: 'Agossou Houngbédji Dossou Ahouansou Kpodo Adjovi Zinsou Soglo Hounkpatin Gbaguidi',
  cities: [['cotonou', 'Cotonou', '🏙️', 'Coastal metro', 'large', 680000, 0.4, 0.28], ['portonovo', 'Porto-Novo', '🏛️', 'Capital region', 'medium', 260000, 0.36, 0.25], ['parakou', 'Parakou', '🌾', 'Mid-size city', 'medium', 250000, 0.32, 0.22]],
  gov: ['presidential', 'National Assembly', 109, ['Republican Bloc', 'Progressive Union for Renewal']],
  tax: { allowance: 720000, brackets: [[480000, 0.1], [600000, 0.15], [1200000, 0.19], [Infinity, 0.3]], vat: 0.18 },
  ruled: [['FR', 'French Dahomey', 1960, { from: 1894 }]], periodNames: [[1975, 'Dahomey']],
  regimes: [[1960, 'pres', 0, 0], [1963, 'mil', 0, 0], [1972, 'oneparty', 0, 0], [1991, 'pres', 1, 0], [2019, 'multiauth', 0, 0]], sovereign: [[1960, null]],
});

export const BW = C('BW', 'Botswana', 'Motswana', 'Gaborone', ['BWP', 'P'], 4.6, 'angloAfrica', {
  languages: ['English', 'Setswana'], pop: 2600, gdp: 15000, life: 66,
  m: 'Kabelo Thabo Tumelo Kagiso Mpho Lesego Onalenna Tebogo Neo Kgosi', f: 'Boitumelo Kefilwe Masego Naledi Onkemetse Lorato Keneilwe Gofaone Tshepiso Mpho', l: 'Molefe Masire Khama Mogae Seretse Kgosi Mokgosi Tlhalerwa Moeng Ramotswe',
  cities: [['gaborone', 'Gaborone', '🏙️', 'Capital region', 'medium', 250000, 0.55, 0.42], ['francistown', 'Francistown', '⛏️', 'Mid-size city', 'small', 100000, 0.48, 0.36], ['maun', 'Maun, Okavango', '🦓', 'Small town', 'small', 85000, 0.45, 0.33]],
  provinceWord: 'District', gov: ['presidential', 'National Assembly', 61, ['Botswana Democratic Party', 'Umbrella for Democratic Change']],
  tax: { allowance: 48000, brackets: [[36000, 0.05], [36000, 0.125], [36000, 0.1875], [Infinity, 0.25]], vat: 0.14, corporate: 0.22, label: 'Botswana Unified Revenue Service' },
  ruled: [['GB', 'the Bechuanaland Protectorate', 1966, { from: 1885, leader: 'the Resident Commissioner' }]], regimes: [[1966, 'pres', 1, 0]], navy: false,
  forces: { army: 'Botswana Defence Force' }, centralBank: 'Bank of Botswana',
});

export const BF = C('BF', 'Burkina Faso', 'Burkinabè', 'Ouagadougou', CFA, 210, 'francoAfrica', {
  languages: ['French', 'Mooré'], pop: 22700, gdp: 2100, life: 60,
  m: `${FR_M} Ousmane Boukary`, f: `${FR_F} Salamata Rasmata`, l: 'Ouédraogo Sawadogo Compaoré Kaboré Zongo Traoré Sankara Ouattara Kiemdé Zoungrana',
  cities: [['ouagadougou', 'Ouagadougou', '🏙️', 'Capital region', 'large', 2400000, 0.33, 0.22], ['bobodioulasso', 'Bobo-Dioulasso', '🕌', 'Mid-size city', 'large', 900000, 0.3, 0.2], ['koudougou', 'Koudougou', '🌾', 'Small town', 'small', 115000, 0.27, 0.18]],
  gov: ['military', 'Transitional Legislative Assembly', 71, ['Congress for Democracy and Progress', 'People\'s Movement for Progress']], navy: false,
  tax: { brackets: [[Infinity, 0.2]], vat: 0.18 },
  ruled: [['FR', 'French Upper Volta', 1960, { from: 1896 }]], periodNames: [[1984, 'Upper Volta']],
  regimes: [[1960, 'oneparty', 0, 0], [1966, 'mil', 0, 0], [1991, 'multiauth', 0, 0], [2015, 'pres', 1, 0], [2022, 'mil', 0, 0]], sovereign: [[1960, null]],
});

export const BI = C('BI', 'Burundi', 'Burundian', 'Gitega', ['BIF', 'FBu'], 900, 'francoAfrica', {
  languages: ['Kirundi', 'French'], pop: 12900, gdp: 750, life: 62,
  m: 'Jean Pierre Claude Emmanuel Eric Gaston Thierry Alain Didier Évariste', f: 'Marie Claudine Josiane Aline Espérance Goreth Diane Annick Béatrice Ange', l: 'Ndayishimiye Nkurunziza Niyonzima Hakizimana Bizimana Ndikumana Nshimirimana Irakoze Niyongabo Manirakiza',
  cities: [['bujumbura', 'Bujumbura', '🌊', 'Mid-size city', 'large', 1000000, 0.3, 0.18], ['gitega', 'Gitega', '🏛️', 'Capital region', 'small', 135000, 0.27, 0.16], ['ngozi', 'Ngozi', '☕', 'Small town', 'small', 40000, 0.25, 0.15]],
  provinceWord: 'Province', gov: ['presidential', 'National Assembly', 111, ['National Congress for Liberty', 'CNDD-FDD']], navy: false,
  tax: { brackets: [[Infinity, 0.2]], vat: 0.18 },
  religion: { catholic: 60, evangelical: 25, traditional: 8, sunni: 3, mainline: 4 },
  ruled: [['DE', 'German East Africa (Urundi)', 1916, { from: 1890, leader: 'the German Resident' }], ['BE', 'Ruanda-Urundi (a Belgian mandate)', 1962, { leader: 'the Belgian Resident' }]],
  regimes: [[1962, 'semimon', 0, 1], [1966, 'mil', 0, 0], [1993, 'pres', 1, 0], [1996, 'mil', 0, 0], [2005, 'multiauth', 0, 0]], sovereign: [[1962, null]],
});

export const CV = C('CV', 'Cabo Verde', 'Cabo Verdean', 'Praia', ['CVE', 'Esc'], 48, 'lusoAfrica', {
  languages: ['Portuguese', 'Cape Verdean Creole'], pop: 590, gdp: 7000, life: 74,
  m: 'José João Carlos António Manuel Mário Pedro Jorge Rui Nuno', f: 'Maria Ana Fátima Sandra Carla Joana Elsa Luísa Cesária Sofia', l: 'Silva Lopes Pires Monteiro Tavares Fortes Gomes Semedo Veiga Rodrigues',
  cities: [['praia', 'Praia, Santiago', '🏖️', 'Capital region', 'medium', 160000, 0.5, 0.35], ['mindelo', 'Mindelo, São Vicente', '🎶', 'Coastal metro', 'small', 75000, 0.48, 0.33]],
  provinceWord: 'Island', provinces: ['Santiago', 'São Vicente'], gov: ['semi', 'National Assembly', 72, ['PAICV', 'Movement for Democracy (MpD)']],
  tax: { brackets: [[960000, 0.165], [Infinity, 0.235]], vat: 0.15, corporate: 0.22 },
  religion: { catholic: 77, evangelical: 10, none: 13 },
  ruled: [['PT', 'Portuguese Cape Verde', 1975]], regimes: [[1975, 'oneparty', 0, 0], [1991, 'semi', 1, 0]], emergency: '132',
});

export const CM = C('CM', 'Cameroon', 'Cameroonian', 'Yaoundé', CFAC, 220, 'francoAfrica', {
  languages: ['French', 'English'], pop: 27900, gdp: 3500, life: 61,
  m: `${FR_M} Samuel Patrick`, f: `${FR_F} Brigitte Pauline`, l: 'Mbarga Ngono Atangana Fotso Kamga Nkemelu Tchoua Ewane Onana Biya',
  cities: [['yaounde', 'Yaoundé', '🏛️', 'Capital region', 'large', 4100000, 0.4, 0.27], ['douala', 'Douala', '⚓', 'Coastal metro', 'large', 3900000, 0.42, 0.29], ['garoua', 'Garoua', '🌾', 'Mid-size city', 'medium', 440000, 0.32, 0.22], ['bamenda', 'Bamenda', '⛰️', 'Mid-size city', 'medium', 500000, 0.33, 0.22]],
  gov: ['presidential', 'National Assembly', 180, ['Social Democratic Front', 'Cameroon People\'s Democratic Movement'], undefined, ['Senate', 100, 'Senator']],
  tax: { brackets: [[2000000, 0.1], [1000000, 0.15], [2000000, 0.25], [Infinity, 0.35]], vat: 0.1925 },
  religion: { catholic: 35, evangelical: 25, mainline: 10, sunni: 24, traditional: 6 },
  ruled: [['DE', 'Kamerun (German)', 1916, { from: 1884 }], ['FR', 'French Cameroun (a mandate)', 1960, { war: true }]],
  regimes: [[1960, 'pres', 0, 0], [1966, 'oneparty', 0, 0], [1992, 'multiauth', 0, 0]], sovereign: [[1960, null]],
});

export const KM = C('KM', 'Comoros', 'Comorian', 'Moroni', ['KMF', 'CF'], 210, 'francoAfrica', {
  languages: ['Comorian', 'Arabic', 'French'], pop: 850, gdp: 3000, life: 65,
  m: 'Ahmed Ali Said Mohamed Abdou Youssouf Ibrahim Houmed Soilihi Ismail', f: 'Fatima Zaharia Mariama Anrafa Hadidja Saandia Faïza Nadia Echata Ramla', l: 'Abdallah Said Ali Mohamed Soilihi Ahmed Djohar Azali Sambi Bacar',
  cities: [['moroni', 'Moroni, Grande Comore', '🕌', 'Capital region', 'small', 62000, 0.4, 0.27], ['mutsamudu', 'Mutsamudu, Anjouan', '🌴', 'Small town', 'small', 30000, 0.37, 0.25]],
  provinceWord: 'Island', provinces: ['Grande Comore (Ngazidja)', 'Anjouan (Ndzuani)'], gov: ['presidential', 'Assembly of the Union', 33, ['Juwa', 'Convention for the Renewal of the Comoros']],
  tax: { brackets: [[Infinity, 0.2]], vat: 0.1 }, religion: { sunni: 98, catholic: 2 },
  ruled: [['FR', 'the Comoro Islands (French)', 1975, { from: 1886 }]], regimes: [[1975, 'mil', 0, 0], [1978, 'pers', 0, 0], [1990, 'multiauth', 0, 0], [1999, 'mil', 0, 0], [2002, 'pres', 0, 0]], redCrescent: true,
});

export const CG = C('CG', 'Republic of the Congo', 'Congolese', 'Brazzaville', CFAC, 260, 'francoAfrica', {
  languages: ['French', 'Lingala', 'Kituba'], pop: 6100, gdp: 3700, life: 64,
  m: `${FR_M} Christian Denis`, f: `${FR_F} Antoinette Gisèle`, l: 'Sassou Nguesso Lissouba Kolélas Mabiala Ngouabi Massamba Bouanga Moukoko Ondongo',
  cities: [['brazzaville', 'Brazzaville', '🏙️', 'Capital region', 'large', 2000000, 0.45, 0.3], ['pointenoire', 'Pointe-Noire', '🛢️', 'Coastal metro', 'large', 1200000, 0.47, 0.32], ['dolisie', 'Dolisie', '🌳', 'Small town', 'small', 130000, 0.37, 0.25]],
  provinceWord: 'Department', gov: ['presidential', 'National Assembly', 151, ['UPADS', 'Congolese Party of Labour (PCT)']],
  tax: { brackets: [[464000, 0.01], [536000, 0.1], [2000000, 0.25], [Infinity, 0.4]], vat: 0.18 },
  religion: { catholic: 50, evangelical: 35, mainline: 5, traditional: 8, sunni: 2 },
  ruled: [['FR', 'French Middle Congo', 1960, { from: 1880 }]], regimes: [[1960, 'pres', 0, 0], [1963, 'oneparty', 0, 0], [1968, 'mil', 0, 0], [1970, 'oneparty', 0, 0], [1992, 'pres', 1, 0], [1997, 'pers', 0, 0]], sovereign: [[1960, null]],
});

export const GQ = C('GQ', 'Equatorial Guinea', 'Equatoguinean', 'Malabo', CFAC, 260, 'francoAfrica', {
  languages: ['Spanish', 'French', 'Fang'], pop: 1700, gdp: 15000, life: 61,
  m: 'Teodoro Francisco José Juan Santiago Pedro Antonio Manuel Agustín Gabriel', f: 'María Constancia Ana Carmen Isabel Rosa Teresa Pilar Mercedes Lucía', l: 'Obiang Nguema Mbasogo Ondo Esono Ndong Mba Nsue Abaga Edjang',
  cities: [['malabo', 'Malabo, Bioko', '🛢️', 'Capital region', 'medium', 300000, 0.6, 0.4], ['bata', 'Bata', '🌊', 'Coastal metro', 'medium', 250000, 0.55, 0.36]],
  gov: ['presidential', 'Chamber of Deputies', 100, ['Convergence for Social Democracy', 'Democratic Party of Equatorial Guinea']],
  tax: { brackets: [[Infinity, 0.25]], vat: 0.15 }, religion: { catholic: 80, evangelical: 10, sunni: 4, traditional: 6 },
  police: { ranks: ['Agente en formación', 'Agente', 'Cabo', 'Sargento', 'Subteniente', 'Teniente', 'Capitán', 'Comandante', 'Coronel', 'General'] },
  ruled: [['ES', 'Spanish Guinea', 1968, { from: 1844 }]], regimes: [[1968, 'pers', 0, 0]], sovereign: [[1968, null]],
});

export const ER = C('ER', 'Eritrea', 'Eritrean', 'Asmara', ['ERN', 'Nkf'], 7, 'angloAfrica', {
  languages: ['Tigrinya', 'Arabic', 'English'], pop: 3700, gdp: 1600, life: 67,
  m: 'Yonas Dawit Samuel Tesfay Mehari Abraham Habte Biniam Filmon Kidane', f: 'Helen Saba Senait Selam Tsega Mebrat Ruth Luwam Yordanos Hiwet', l: 'Tesfamariam Haile Ghebremariam Woldemichael Kidane Berhane Tekle Andemariam Mehari Ghebreyesus',
  cities: [['asmara', 'Asmara', '⛪', 'Capital region', 'medium', 900000, 0.35, 0.22], ['keren', 'Keren', '🐪', 'Mid-size city', 'small', 120000, 0.3, 0.2], ['massawa', 'Massawa', '⚓', 'Coastal metro', 'small', 55000, 0.32, 0.21]],
  gov: ['oneParty', 'National Assembly', 150, ['none', 'People\'s Front for Democracy and Justice']],
  tax: { brackets: [[Infinity, 0.3]], vat: 0.05 }, religion: { orthodox: 50, sunni: 46, catholic: 4 },
  ruled: [['IT', 'Italian Eritrea', 1941, { from: 1890 }], ['GB', 'British-administered Eritrea', 1952, { noMovement: true, leader: 'the Chief Administrator' }], ['ET', 'Eritrea, federated with and then annexed by Ethiopia', 1991, { war: true, leader: 'the Emperor\'s representative' }]],
  regimes: [[1991, 'oneparty', 0, 0]], sovereign: [[1993, null]],
  forces: { army: 'Eritrean Defence Forces', conscription: { kind: 'universal', age: 18, months: 120, branch: 'army', genders: ['male', 'female'], name: 'national service (indefinite)', text: 'National service is compulsory for men and women, and in practice open-ended.' } },
});

export const SZ = C('SZ', 'Eswatini', 'Swazi', 'Mbabane', ['SZL', 'L'], 7, 'angloAfrica', {
  languages: ['Swazi', 'English'], pop: 1200, gdp: 8500, life: 58,
  m: 'Sibusiso Mandla Sipho Bongani Thulani Mduduzi Sandile Musa Themba Nkosinathi', f: 'Nomsa Thandeka Zanele Lindiwe Nokuthula Phindile Siphiwe Ntombi Gugu Lungile', l: 'Dlamini Simelane Mamba Nxumalo Shongwe Magagula Mkhonta Hlophe Masilela Motsa',
  cities: [['mbabane', 'Mbabane', '⛰️', 'Capital region', 'small', 95000, 0.45, 0.33], ['manzini', 'Manzini', '🏙️', 'Mid-size city', 'small', 110000, 0.43, 0.31], ['lobamba', 'Lobamba', '👑', 'Small town', 'small', 12000, 0.4, 0.28]],
  gov: ['absolute', 'House of Assembly', 65, ['People\'s United Democratic Movement (banned)', 'independents (tinkhundla)'], 'Prime Minister'],
  tax: { allowance: 41000, brackets: [[59000, 0.2], [100000, 0.25], [Infinity, 0.33]], vat: 0.15 }, navy: false,
  ruled: [['GB', 'the British protectorate of Swaziland', 1968, { from: 1903, leader: 'the Resident Commissioner', noMovement: true }]], periodNames: [[2018, 'Swaziland']],
  regimes: [[1968, 'semimon', 0, 1], [1973, 'absmon', 0, 1]], monarchy: true,
});

export const GA = C('GA', 'Gabon', 'Gabonese', 'Libreville', CFAC, 260, 'francoAfrica', {
  languages: ['French', 'Fang'], pop: 2400, gdp: 14000, life: 66,
  m: `${FR_M} Ali Omar`, f: `${FR_F} Sylvia Rose-Francine`, l: 'Bongo Ondimba Mba Nguema Oligui Ndong Moussavou Mboumba Nzé Obame',
  cities: [['libreville', 'Libreville', '🏙️', 'Capital region', 'medium', 800000, 0.6, 0.42], ['portgentil', 'Port-Gentil', '🛢️', 'Coastal metro', 'medium', 140000, 0.58, 0.4], ['franceville', 'Franceville', '⛏️', 'Small town', 'small', 110000, 0.5, 0.33]],
  provinceWord: 'Province', gov: ['military', 'National Assembly', 143, ['National Union', 'Gabonese Democratic Party']],
  tax: { brackets: [[1500000, 0.05], [1920000, 0.1], [4200000, 0.15], [Infinity, 0.35]], vat: 0.18 },
  ruled: [['FR', 'French Gabon', 1960, { from: 1885 }]], regimes: [[1960, 'pres', 0, 0], [1968, 'oneparty', 0, 0], [1990, 'multiauth', 0, 0], [2023, 'mil', 0, 0]], sovereign: [[1960, null]],
});

export const GN = C('GN', 'Guinea', 'Guinean', 'Conakry', ['GNF', 'FG'], 3000, 'francoAfrica', {
  languages: ['French', 'Pular', 'Malinké'], pop: 14000, gdp: 2700, life: 59,
  m: 'Mamadou Alpha Ibrahima Sekou Ousmane Abdoulaye Lansana Moussa Thierno Amadou', f: 'Mariama Fatoumata Aïssatou Kadiatou Hawa Djénabou Mariame Nènè Oumou Fanta', l: 'Diallo Bah Camara Sylla Condé Touré Barry Keita Soumah Doumbouya',
  cities: [['conakry', 'Conakry', '🏙️', 'Capital region', 'large', 1900000, 0.35, 0.22], ['nzerekore', 'Nzérékoré', '🌳', 'Mid-size city', 'medium', 200000, 0.3, 0.2], ['kankan', 'Kankan', '🕌', 'Mid-size city', 'medium', 200000, 0.3, 0.2]],
  gov: ['military', 'National Transitional Council', 81, ['Rally of the Guinean People', 'Union of Democratic Forces of Guinea']],
  tax: { brackets: [[Infinity, 0.2]], vat: 0.18 }, religion: { sunni: 85, catholic: 8, traditional: 7 },
  ruled: [['FR', 'French Guinea', 1958, { from: 1891 }]], regimes: [[1958, 'oneparty', 0, 0], [1984, 'mil', 0, 0], [1993, 'multiauth', 0, 0], [2008, 'mil', 0, 0], [2010, 'pres', 0, 0], [2021, 'mil', 0, 0]], sovereign: [[1958, null]],
});

export const LS = C('LS', 'Lesotho', 'Mosotho', 'Maseru', ['LSL', 'L'], 6.5, 'angloAfrica', {
  languages: ['Sesotho', 'English'], pop: 2300, gdp: 2700, life: 53,
  m: 'Thabo Tšepo Lerato Mpho Teboho Motlatsi Lehlohonolo Retšelisitsoe Katleho Rethabile', f: 'Palesa Lineo Mamello Nthabiseng Puleng Lerato Mpho Limpho Rethabile Ntsoaki', l: 'Mokoena Letsie Mosisili Thabane Matekane Mohapi Mokhothu Ntsekhe Molapo Seeiso',
  cities: [['maseru', 'Maseru', '⛰️', 'Capital region', 'medium', 330000, 0.42, 0.28], ['teyateyaneng', 'Teyateyaneng', '🧵', 'Small town', 'small', 75000, 0.36, 0.24], ['mafeteng', 'Mafeteng', '🐑', 'Small town', 'small', 40000, 0.34, 0.22]],
  provinceWord: 'District', gov: ['monarchy', 'National Assembly', 120, ['All Basotho Convention', 'Revolution for Prosperity'], 'Prime Minister', ['Senate', 33, 'Senator', false]], navy: false,
  tax: { allowance: 0, brackets: [[70000, 0.2], [Infinity, 0.3]], vat: 0.15 },
  ruled: [['GB', 'Basutoland', 1966, { from: 1868, leader: 'the Resident Commissioner' }]], regimes: [[1966, 'parl', 0, 1], [1970, 'semimon', 0, 1], [1986, 'mil', 0, 1], [1993, 'parl', 1, 1]], monarchy: true,
});

export const MG = C('MG', 'Madagascar', 'Malagasy', 'Antananarivo', ['MGA', 'Ar'], 1500, 'francoAfrica', {
  languages: ['Malagasy', 'French'], pop: 29600, gdp: 1500, life: 65,
  m: 'Andry Hery Rija Fanomezana Tiana Mamy Faly Haja Lova Toky', f: 'Fanja Hanta Lalao Noro Voahangy Miora Tiana Rova Fara Hasina', l: 'Rakotomalala Rasoanaivo Randriamampionona Razafindrakoto Rakotoarisoa Andrianarivo Ravalomanana Rajoelina Ratsiraka Randrianasolo',
  cities: [['antananarivo', 'Antananarivo', '🏙️', 'Capital region', 'large', 1600000, 0.32, 0.2], ['toamasina', 'Toamasina', '⚓', 'Coastal metro', 'medium', 330000, 0.3, 0.19], ['antsirabe', 'Antsirabe', '♨️', 'Mid-size city', 'medium', 260000, 0.28, 0.18], ['nosybe', 'Hell-Ville, Nosy Be', '🏝️', 'Small town', 'small', 45000, 0.33, 0.2]],
  gov: ['presidential', 'National Assembly', 163, ['TIM', 'IRMAR']],
  tax: { allowance: 4200000, brackets: [[Infinity, 0.2]], vat: 0.2 },
  religion: { evangelical: 35, mainline: 10, catholic: 30, traditional: 20, sunni: 5 },
  ruled: [['FR', 'French Madagascar', 1960, { from: 1896, war: false }]],
  regimes: [[1800, 'absmon', 0, 1], [1896, 'absmon', 0, 1], [1960, 'pres', 0, 0], [1972, 'mil', 0, 0], [1975, 'oneparty', 0, 0], [1993, 'pres', 1, 0], [2009, 'mil', 0, 0], [2014, 'pres', 0, 0]], sovereign: [[1800, 1896], [1960, null]],
});

export const MR = C('MR', 'Mauritania', 'Mauritanian', 'Nouakchott', ['MRU', 'UM'], 13, 'maghreb', {
  languages: ['Arabic', 'French', 'Pulaar'], pop: 4900, gdp: 5000, life: 65,
  m: 'Mohamed Ahmed Sidi Cheikh Abdallahi Moulaye Brahim Mohamedou Ely Isselmou', f: 'Fatimetou Mariem Aïchetou Khadijetou Mounina Lalla Toutou Vatimetou Salka Zeinabou', l: 'Ould Abdel Aziz|Ghazouani Ould Daddah Ould Taya Ould Cheikh Vall Ould Mohamed Diop Ba Sy',
  cities: [['nouakchott', 'Nouakchott', '🏜️', 'Capital region', 'large', 1300000, 0.38, 0.25], ['nouadhibou', 'Nouadhibou', '🐟', 'Coastal metro', 'medium', 120000, 0.38, 0.26], ['atar', 'Atar, Adrar', '🐪', 'Rural', 'small', 25000, 0.3, 0.2]],
  provinceWord: 'Wilaya', gov: ['presidential', 'National Assembly', 176, ['Tawassoul', 'El Insaf']],
  tax: { brackets: [[90000, 0.15], [180000, 0.25], [Infinity, 0.4]], vat: 0.16 }, religion: { sunni: 100 },
  ruled: [['FR', 'French Mauritania', 1960, { from: 1903 }]], regimes: [[1960, 'oneparty', 0, 0], [1978, 'mil', 0, 0], [1992, 'multiauth', 0, 0], [2005, 'mil', 0, 0], [2009, 'multiauth', 0, 0]], sovereign: [[1960, null]],
});

export const MU = C('MU', 'Mauritius', 'Mauritian', 'Port Louis', ['MUR', 'Rs'], 18, 'angloAfrica', {
  languages: ['English', 'French', 'Mauritian Creole'], pop: 1260, gdp: 21000, life: 75,
  m: 'Rohan Arvind Navin Ravi Jean-Claude Kevin Yusuf Anil Pravind Ashok', f: 'Priya Anjali Nadia Marie-Claire Sharmila Leela Aisha Kavita Stéphanie Sita', l: 'Ramgoolam Jugnauth Bérenger Ramdin Boolell Seegobin Goburdhun Duval Chung Lim',
  cities: [['portlouis', 'Port Louis', '⚓', 'Capital region', 'medium', 150000, 0.55, 0.42], ['curepipe', 'Curepipe', '🌧️', 'Mid-size city', 'small', 80000, 0.52, 0.4], ['grandbaie', 'Grand Baie', '🏖️', 'Small town', 'small', 12000, 0.58, 0.42]],
  provinceWord: 'District', gov: ['parliamentary', 'National Assembly', 70, ['Labour Party', 'Militant Socialist Movement'], 'Prime Minister'],
  tax: { allowance: 390000, brackets: [[Infinity, 0.15]], vat: 0.15, corporate: 0.15, label: 'Mauritius Revenue Authority' },
  religion: { hindu: 48, catholic: 26, sunni: 17, evangelical: 6, mainline: 3 },
  ruled: [['FR', 'Isle de France (French)', 1810, { noMovement: true }], ['GB', 'British Mauritius', 1968]], regimes: [[1968, 'parl', 1, 1], [1992, 'parl', 1, 0]],
  forces: { army: 'Special Mobile Force', navy: 'National Coast Guard' }, police: { name: 'Mauritius Police Force', head: 'Commissioner of Police' }, jury: true,
});

export const NA = C('NA', 'Namibia', 'Namibian', 'Windhoek', ['NAD', 'N$'], 7.5, 'angloAfrica', {
  languages: ['English', 'Oshiwambo', 'Afrikaans'], pop: 2600, gdp: 9500, life: 64,
  m: 'Johannes Petrus Sam Hage Nangolo Tjiuongua Kalenga Elia Frans Mbumba', f: 'Netumbo Maria Ndapewa Selma Monica Hilma Martha Saara Ester Rosalia', l: 'Nujoma Pohamba Geingob Nandi-Ndaitwah Shikongo Amupanda Hamutenya Angula Iipumbu Kaapanda',
  cities: [['windhoek', 'Windhoek', '🏙️', 'Capital region', 'medium', 430000, 0.55, 0.42], ['walvisbay', 'Walvis Bay', '⚓', 'Coastal metro', 'small', 65000, 0.52, 0.4], ['oshakati', 'Oshakati', '🌾', 'Small town', 'small', 40000, 0.42, 0.3], ['swakopmund', 'Swakopmund', '🏜️', 'Small town', 'small', 45000, 0.55, 0.4]],
  gov: ['presidential', 'National Assembly', 104, ['Popular Democratic Movement', 'SWAPO']],
  tax: { allowance: 100000, brackets: [[50000, 0.18], [150000, 0.25], [450000, 0.28], [Infinity, 0.37]], vat: 0.15, corporate: 0.3, label: 'Namibia Revenue Agency' },
  religion: { lutheran: 45, catholic: 18, evangelical: 20, mainline: 10, traditional: 7 },
  ruled: [['DE', 'German South West Africa', 1915, { from: 1884 }], ['ZA', 'South West Africa (ruled by South Africa)', 1990, { war: true, leader: 'the Administrator-General' }]],
  regimes: [[1990, 'pres', 1, 0]], sovereign: [[1990, null]],
});

export const RW = C('RW', 'Rwanda', 'Rwandan', 'Kigali', ['RWF', 'FRw'], 400, 'francoAfrica', {
  languages: ['Kinyarwanda', 'English', 'French'], pop: 13800, gdp: 2300, life: 67,
  m: 'Jean Eric Patrick Olivier Emmanuel Claude Innocent Jean-Paul Fabrice Aimable', f: 'Marie Claudine Diane Aline Jeanne Chantal Divine Alice Grace Uwase', l: 'Uwimana Habimana Niyonsenga Mugabo Nshimiyimana Kagame Uwase Mukamana Ndayisaba Iradukunda',
  cities: [['kigali', 'Kigali', '🏙️', 'Capital region', 'large', 1300000, 0.35, 0.22], ['huye', 'Huye (Butare)', '🎓', 'Mid-size city', 'small', 90000, 0.3, 0.19], ['rubavu', 'Rubavu (Gisenyi)', '🌋', 'Small town', 'small', 150000, 0.3, 0.19]],
  provinceWord: 'Province', gov: ['presidential', 'Chamber of Deputies', 80, ['Social Democratic Party', 'Rwandan Patriotic Front']], navy: false,
  tax: { allowance: 720000, brackets: [[480000, 0.2], [Infinity, 0.3]], vat: 0.18, label: 'Rwanda Revenue Authority' },
  religion: { catholic: 40, evangelical: 40, mainline: 13, sunni: 2, traditional: 5 },
  ruled: [['DE', 'German East Africa (Ruanda)', 1916, { from: 1897, leader: 'the German Resident' }], ['BE', 'Ruanda-Urundi (a Belgian mandate)', 1962, { leader: 'the Belgian Resident' }]],
  regimes: [[1962, 'pres', 0, 0], [1973, 'mil', 0, 0], [1978, 'oneparty', 0, 0], [1994, 'mil', 0, 0], [2003, 'multiauth', 0, 0]], sovereign: [[1962, null]],
  forces: { army: 'Rwanda Defence Force' },
});

export const ST = C('ST', 'São Tomé and Príncipe', 'Santomean', 'São Tomé', ['STN', 'Db'], 11, 'lusoAfrica', {
  languages: ['Portuguese', 'Forro'], pop: 230, gdp: 4000, life: 70,
  m: 'Manuel Carlos Jorge Patrice Evaristo Fradique Miguel Américo Delfim Osvaldo', f: 'Maria Ana Elsa Celeste Natália Alda Filomena Graça Lúcia Conceição', l: 'Trovoada Pinto da Costa|Menezes Neves Vila Nova|Bragança Carvalho Espírito Santo|Viegas Afonso',
  cities: [['saotome', 'São Tomé', '🌴', 'Capital region', 'small', 80000, 0.48, 0.3], ['santoantonio', 'Santo António, Príncipe', '🏝️', 'Small town', 'small', 1500, 0.45, 0.28]],
  provinceWord: 'Island', provinces: ['São Tomé', 'Príncipe'], gov: ['semi', 'National Assembly', 55, ['MLSTP/PSD', 'Independent Democratic Action (ADI)']],
  tax: { brackets: [[Infinity, 0.2]], vat: 0.15 }, religion: { catholic: 70, evangelical: 15, none: 15 },
  ruled: [['PT', 'Portuguese São Tomé and Príncipe', 1975]], regimes: [[1975, 'oneparty', 0, 0], [1991, 'semi', 1, 0]],
});

export const SC = C('SC', 'Seychelles', 'Seychellois', 'Victoria', ['SCR', 'Rs'], 7.5, 'angloAfrica', {
  languages: ['Seychellois Creole', 'English', 'French'], pop: 100, gdp: 28000, life: 74,
  m: 'Jean-Paul Patrick Wavel Danny James Ralph Joël Bernard Alain Marco', f: 'Marie-Antoinette Sylvette Sheila Linda Nathalie Rose Jeanne Bernadette Michelle Anne', l: 'Michel Ramkalawan Hoarau Payet Pillay Rene Dubel Faure Lablache Mancham',
  cities: [['victoriasc', 'Victoria, Mahé', '🏝️', 'Capital region', 'small', 27000, 0.7, 0.5], ['praslin', 'Baie Sainte Anne, Praslin', '🌴', 'Small town', 'small', 7000, 0.68, 0.48]],
  provinceWord: 'Island', provinces: ['Mahé', 'Praslin'], gov: ['presidential', 'National Assembly', 35, ['United Seychelles', 'Linyon Demokratik Seselwa']],
  tax: { allowance: 8555 * 12, brackets: [[Infinity, 0.15]], vat: 0.15, label: 'Seychelles Revenue Commission' },
  religion: { catholic: 76, anglican: 6, evangelical: 7, hindu: 5, none: 6 },
  ruled: [['FR', 'the Séchelles (French)', 1810, { noMovement: true }], ['GB', 'the Colony of Seychelles', 1976]], regimes: [[1976, 'pres', 0, 0], [1977, 'oneparty', 0, 0], [1993, 'multiauth', 0, 0], [2020, 'pres', 1, 0]],
  forces: { army: 'Seychelles Defence Forces', navy: 'Seychelles Coast Guard' },
});

export const SL = C('SL', 'Sierra Leone', 'Sierra Leonean', 'Freetown', ['SLE', 'Le'], 7, 'angloAfrica', {
  languages: ['English', 'Krio'], pop: 8600, gdp: 1700, life: 61,
  m: 'Mohamed Ibrahim Abdul Alhaji Joseph Samuel John Foday Ernest Julius', f: 'Fatmata Mariama Aminata Isatu Hawa Kadiatu Christiana Elizabeth Zainab Adama', l: 'Kamara Sesay Koroma Conteh Bangura Kanu Turay Bio Jalloh Mansaray',
  cities: [['freetown', 'Freetown', '⚓', 'Capital region', 'large', 1200000, 0.35, 0.22], ['bo', 'Bo', '💎', 'Mid-size city', 'medium', 175000, 0.3, 0.2], ['kenema', 'Kenema', '🌳', 'Mid-size city', 'medium', 200000, 0.3, 0.2]],
  provinceWord: 'Province', gov: ['presidential', 'Parliament', 146, ['Sierra Leone People\'s Party', 'All People\'s Congress']],
  tax: { allowance: 7200, brackets: [[2880, 0.15], [2880, 0.2], [2880, 0.25], [Infinity, 0.3]], vat: 0.15 },
  religion: { sunni: 77, mainline: 10, catholic: 5, evangelical: 5, traditional: 3 },
  ruled: [['GB', 'the Colony of Sierra Leone', 1961]], regimes: [[1961, 'parl', 1, 1], [1967, 'mil', 0, 0], [1971, 'pres', 0, 0], [1978, 'oneparty', 0, 0], [1992, 'mil', 0, 0], [1996, 'pres', 0, 0], [2002, 'pres', 1, 0]],
  forces: { army: 'Republic of Sierra Leone Armed Forces' },
});

export const TG = C('TG', 'Togo', 'Togolese', 'Lomé', CFA, 210, 'francoAfrica', {
  languages: ['French', 'Ewe', 'Kabiyé'], pop: 9000, gdp: 2200, life: 61,
  m: `${FR_M} Kossi Kodjo`, f: `${FR_F} Akossiwa Afi`, l: 'Gnassingbé Eyadéma Olympio Agbéyomé Kodjo Fabre Adjamagbo Amouzou Mensah Atsu',
  cities: [['lome', 'Lomé', '⚓', 'Capital region', 'large', 1900000, 0.38, 0.25], ['sokode', 'Sokodé', '🌾', 'Mid-size city', 'medium', 120000, 0.3, 0.2], ['kara', 'Kara', '⛰️', 'Mid-size city', 'medium', 110000, 0.3, 0.2]],
  gov: ['presidential', 'National Assembly', 113, ['National Alliance for Change', 'Union for the Republic (UNIR)']],
  tax: { allowance: 900000, brackets: [[2100000, 0.03], [3000000, 0.1], [Infinity, 0.25]], vat: 0.18 },
  ruled: [['DE', 'Togoland (German)', 1916, { from: 1884 }], ['FR', 'French Togoland (a mandate)', 1960]], regimes: [[1960, 'pres', 0, 0], [1963, 'mil', 0, 0], [1969, 'oneparty', 0, 0], [1991, 'multiauth', 0, 0]], sovereign: [[1960, null]],
});

export const TN = C('TN', 'Tunisia', 'Tunisian', 'Tunis', ['TND', 'DT'], 1.0, 'maghreb', {
  languages: ['Arabic', 'French'], pop: 12200, gdp: 11000, life: 76,
  m: 'Mohamed Ahmed Ali Youssef Amine Skander Aziz Hamza Mehdi Karim', f: 'Fatma Mariem Amira Nour Yasmine Salma Ines Sarra Rania Eya', l: 'Ben Ali|Trabelsi Bouazizi Jebali Ghannouchi Saied Mejri Gharbi Hamdi Ayari Chebbi',
  cities: [['tunis', 'Tunis', '🕌', 'Capital region', 'large', 2400000, 0.4, 0.3], ['sfax', 'Sfax', '🫒', 'Coastal metro', 'medium', 330000, 0.38, 0.28], ['sousse', 'Sousse', '🏖️', 'Coastal metro', 'medium', 270000, 0.4, 0.29], ['kairouan', 'Kairouan', '🕌', 'Mid-size city', 'small', 190000, 0.33, 0.24]],
  provinceWord: 'Governorate', gov: ['presidential', 'Assembly of the Representatives of the People', 161, ['Ennahda', 'Free Destourian Party']],
  tax: { allowance: 5000, brackets: [[15000, 0.26], [10000, 0.28], [20000, 0.32], [Infinity, 0.35]], vat: 0.19, corporate: 0.15, label: 'Directorate General of Taxes' },
  ruled: [['TR', 'the Beylik of Tunis (under the Ottomans)', 1881, { noMovement: true, leader: 'the Bey' }], ['FR', 'the French protectorate of Tunisia', 1956, { leader: 'the Resident-General' }]],
  regimes: [[1956, 'semimon', 0, 1], [1957, 'oneparty', 0, 0], [1987, 'multiauth', 0, 0], [2011, 'semi', 1, 0], [2021, 'pers', 0, 0]], centralBank: 'Central Bank of Tunisia',
});

export const UG = C('UG', 'Uganda', 'Ugandan', 'Kampala', ['UGX', 'USh'], 1300, 'angloAfrica', {
  languages: ['English', 'Swahili', 'Luganda'], pop: 47000, gdp: 2200, life: 63,
  m: 'Moses Joseph Robert Peter Ronald Brian Ivan Isaac Godfrey Yoweri', f: 'Sarah Grace Esther Mary Ruth Agnes Rebecca Juliet Florence Winnie', l: 'Museveni Okello Mukasa Ssemwogerere Kyagulanyi Besigye Namugga Atim Opio Kizza',
  cities: [['kampala', 'Kampala', '🏙️', 'Capital region', 'large', 1800000, 0.33, 0.22], ['gulu', 'Gulu', '🌾', 'Mid-size city', 'medium', 180000, 0.28, 0.18], ['mbarara', 'Mbarara', '🐄', 'Mid-size city', 'medium', 200000, 0.3, 0.19], ['jinja', 'Jinja', '🌊', 'Mid-size city', 'medium', 300000, 0.3, 0.2]],
  provinceWord: 'District', gov: ['presidential', 'Parliament', 529, ['National Unity Platform', 'National Resistance Movement']], navy: false,
  tax: { allowance: 2820000, brackets: [[1200000, 0.1], [1080000, 0.2], [Infinity, 0.3]], vat: 0.18, label: 'Uganda Revenue Authority' },
  religion: { catholic: 39, anglican: 32, evangelical: 11, sunni: 14, traditional: 4 },
  ruled: [['GB', 'the Uganda Protectorate', 1962, { from: 1894 }]], regimes: [[1962, 'parl', 1, 1], [1966, 'pers', 0, 0], [1971, 'mil', 0, 0], [1979, 'pres', 0, 0], [1985, 'mil', 0, 0], [1986, 'multiauth', 0, 0]],
  forces: { army: 'Uganda People\'s Defence Force' }, police: { name: 'Uganda Police Force' },
});

export const TZ = C('TZ', 'Tanzania', 'Tanzanian', 'Dodoma', ['TZS', 'TSh'], 900, 'angloAfrica', {
  languages: ['Swahili', 'English'], pop: 63000, gdp: 2700, life: 66,
  m: 'Juma Hassan Joseph John Emmanuel Baraka Amani Saidi Daudi Julius', f: 'Neema Rehema Mwanaisha Grace Zawadi Amina Esther Halima Upendo Samia', l: 'Nyerere Kikwete Mkapa Magufuli Hassan Mwinyi Lissu Mbowe Mwakyusa Kimaro',
  cities: [['dodoma', 'Dodoma', '🏛️', 'Capital region', 'medium', 450000, 0.3, 0.2], ['daressalaam', 'Dar es Salaam', '⚓', 'Coastal metro', 'large', 5400000, 0.37, 0.25], ['mwanza', 'Mwanza', '🐟', 'Mid-size city', 'medium', 1100000, 0.3, 0.2], ['arusha', 'Arusha', '🏔️', 'Mid-size city', 'medium', 600000, 0.33, 0.22], ['zanzibar', 'Zanzibar City', '🏝️', 'Coastal metro', 'medium', 600000, 0.34, 0.22]],
  gov: ['presidential', 'National Assembly (Bunge)', 393, ['CHADEMA', 'Chama Cha Mapinduzi']],
  tax: { allowance: 3240000, brackets: [[2520000, 0.08], [2520000, 0.2], [2520000, 0.25], [Infinity, 0.3]], vat: 0.18, label: 'Tanzania Revenue Authority' },
  religion: { sunni: 35, catholic: 30, mainline: 13, evangelical: 12, traditional: 10 },
  ruled: [['DE', 'German East Africa', 1919, { from: 1885, war: false }], ['GB', 'Tanganyika (a British mandate)', 1961]], periodNames: [[1964, 'Tanganyika']],
  regimes: [[1961, 'parl', 1, 1], [1962, 'oneparty', 0, 0], [1995, 'multiauth', 0, 0]], forces: { army: 'Tanzania People\'s Defence Force' },
});

export const ZM = C('ZM', 'Zambia', 'Zambian', 'Lusaka', ['ZMW', 'K'], 6.5, 'angloAfrica', {
  languages: ['English', 'Bemba', 'Nyanja'], pop: 20000, gdp: 3500, life: 62,
  m: 'Mwila Chanda Mulenga Bwalya Hakainde Edgar Kenneth Michael Musonda Joseph', f: 'Chilufya Mutale Natasha Precious Mwansa Bupe Thandiwe Inonge Chipo Esther', l: 'Banda Phiri Mwale Tembo Zulu Mulenga Hichilema Lungu Kaunda Sata',
  cities: [['lusaka', 'Lusaka', '🏙️', 'Capital region', 'large', 2700000, 0.38, 0.26], ['ndola', 'Ndola, Copperbelt', '⛏️', 'Mid-size city', 'medium', 520000, 0.34, 0.24], ['kitwe', 'Kitwe, Copperbelt', '⛏️', 'Mid-size city', 'medium', 520000, 0.34, 0.24], ['livingstone', 'Livingstone', '🌊', 'Small town', 'small', 180000, 0.36, 0.24]],
  provinceWord: 'Province', gov: ['presidential', 'National Assembly', 167, ['Patriotic Front', 'United Party for National Development']], navy: false,
  tax: { allowance: 61200, brackets: [[24600, 0.2], [25200, 0.3], [Infinity, 0.37]], vat: 0.16, label: 'Zambia Revenue Authority' },
  religion: { evangelical: 40, catholic: 20, mainline: 30, sunni: 1, traditional: 9 },
  ruled: [['GB', 'Northern Rhodesia', 1964, { from: 1891 }]], regimes: [[1964, 'pres', 1, 0], [1972, 'oneparty', 0, 0], [1991, 'pres', 1, 0]],
});

export const ZW = C('ZW', 'Zimbabwe', 'Zimbabwean', 'Harare', ['USD', 'US$'], 0.45, 'angloAfrica', {
  languages: ['English', 'Shona', 'Ndebele'], pop: 16300, gdp: 3000, life: 61,
  m: 'Tendai Tatenda Farai Tinashe Blessing Simba Takudzwa Nyasha Kudakwashe Emmerson', f: 'Rutendo Tsitsi Chipo Nyasha Ruvimbo Tariro Fadzai Shamiso Vimbai Grace', l: 'Moyo Ncube Sibanda Dube Mpofu Chikore Mugabe Mnangagwa Chamisa Tsvangirai',
  cities: [['harare', 'Harare', '🏙️', 'Capital region', 'large', 1600000, 0.42, 0.28], ['bulawayo', 'Bulawayo', '🏭', 'Mid-size city', 'large', 670000, 0.38, 0.25], ['mutare', 'Mutare', '⛰️', 'Mid-size city', 'medium', 190000, 0.35, 0.23], ['gweru', 'Gweru', '🌾', 'Mid-size city', 'medium', 160000, 0.34, 0.22]],
  provinceWord: 'Province', gov: ['presidential', 'National Assembly', 280, ['Citizens Coalition for Change', 'ZANU-PF']], navy: false,
  tax: { allowance: 1200, brackets: [[2400, 0.2], [6000, 0.3], [Infinity, 0.4]], vat: 0.15, label: 'Zimbabwe Revenue Authority' },
  religion: { evangelical: 45, mainline: 15, catholic: 10, traditional: 25, sunni: 1, none: 4 },
  ruled: [['GB', 'Southern Rhodesia', 1965, { from: 1890, leader: 'the Governor' }], ['GB', 'Rhodesia, under white-minority rule', 1980, { war: true, leader: 'the Prime Minister (Ian Smith)' }]],
  regimes: [[1980, 'parl', 0, 0], [1987, 'pers', 0, 0]], money: [[2009, 'ZWD', 'Z$', 'Zimbabwe dollar', null]],
  forces: { army: 'Zimbabwe National Army' },
});
