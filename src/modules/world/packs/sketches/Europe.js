/**
 * Europe's remaining states: the old Eastern bloc, Yugoslavia's successors, Moldova and Belarus,
 * Iceland and the microstates. Built with sketch() (../Sketch.js). PPP factors are World Bank 2023
 * (local currency per US$); GDP per head in 2011 dollars (Maddison scale).
 */
import { sketch } from '../Sketch.js';

const C = (id, name, demonym, capital, cur, ppp, family, o) => sketch({ id, name, demonym, capital, cur, ppp, family, ...o });
const EU_FREE = ['IE', 'NL', 'ES', 'FR', 'DE', 'IT', 'SE', 'PL', 'AT', 'BE', 'PT', 'GR', 'FI', 'DK', 'LU', 'EE', 'LV', 'LT', 'RO', 'MT', 'CY'];
// Yugoslavia's governments, 1918–1990 (the kingdom, the royal dictatorship, the war, Tito's state).
const YUGO = [[1918, 'semimon', 0, 1], [1929, 'absmon', 0, 1], [1941, 'mil', 0, 0], [1945, 'oneparty', 0, 0]];

export const AL = C('AL', 'Albania', 'Albanian', 'Tirana', ['ALL', 'L'], 41, 'eastBloc', {
  languages: ['Albanian'], pop: 2800, gdp: 13000, life: 79,
  m: 'Ardit Erion Klajdi Endri Arbër Besnik Dritan Gentian Ilir Kristi', f: 'Ana Era Klea Amelia Elira Jonida Arta Besiana Elona Mira', l: 'Hoxha Shehu Gjoka Leka Prifti Dervishi Kola Muça Bregu Gjika',
  cities: [['tirana', 'Tirana', '🏙️', 'Capital region', 'large', 560000, 0.45, 0.35], ['durres', 'Durrës', '⚓', 'Coastal metro', 'medium', 175000, 0.42, 0.33], ['vlore', 'Vlorë', '🏖️', 'Coastal metro', 'small', 130000, 0.4, 0.3], ['shkoder', 'Shkodër', '🏰', 'Mid-size city', 'small', 135000, 0.38, 0.3]],
  gov: ['parliamentary', 'Kuvendi (Parliament)', 140, ['Socialist Party (PS)', 'Democratic Party (PD)']],
  tax: { allowance: 480000, brackets: [[1440000, 0.13], [Infinity, 0.23]], vat: 0.2, corporate: 0.15, label: 'General Directorate of Taxation' },
  religion: { sunni: 57, catholic: 10, orthodoxChristian: 7, none: 26 },
  ruled: [['TR', 'Ottoman Albania', 1912]],
  regimes: [[1912, 'semimon', 0, 1], [1925, 'pers', 0, 0], [1928, 'absmon', 0, 1], [1939, 'mil', 0, 0], [1944, 'oneparty', 0, 0], [1991, 'multiauth', 0, 0], [1997, 'parl', 1, 0]],
  stock: 'Tirana Stock Exchange', centralBank: 'Bank of Albania',
});

export const AD = C('AD', 'Andorra', 'Andorran', 'Andorra la Vella', ['EUR', '€'], 0.62, 'micro', {
  languages: ['Catalan', 'Spanish', 'French'], pop: 80, gdp: 48000, life: 84,
  m: 'Marc Jordi Pau Joan Xavier Albert Oriol Gerard Àlex Pere', f: 'Laia Marta Núria Anna Montserrat Clara Júlia Mireia Carla Maria', l: 'Riba Pujol Calvó Font Cerqueda Armengol Martí Coma Viladomat Rossell',
  cities: [['andorralavella', 'Andorra la Vella', '⛰️', 'Capital region', 'small', 23000, 1.0, 0.85], ['escaldes', 'Escaldes-Engordany', '♨️', 'Small town', 'small', 14000, 1.0, 0.85]],
  provinces: ['Andorra la Vella parish', 'Escaldes-Engordany parish'], provinceWord: 'Parish',
  gov: ['monarchy', 'General Council (Consell General)', 28, ['Social Democratic Party', 'Democrats for Andorra'], 'Head of Government (Cap de Govern)'],
  tax: { allowance: 24000, brackets: [[16000, 0.05], [Infinity, 0.1]], vat: 0.045, corporate: 0.1 },
  regimes: [[1800, 'monolig', 0, 1], [1993, 'parl', 1, 1]],
  police: { name: 'Andorran Police (Policia d\'Andorra)', head: 'Director of Police' },
  forces: { army: 'Andorran Civil Protection (Andorra has no army)' }, navy: false, freeMovement: ['ES', 'FR'],
});

export const BY = C('BY', 'Belarus', 'Belarusian', 'Minsk', ['BYN', 'Br'], 0.9, 'postSoviet', {
  languages: ['Belarusian', 'Russian'], pop: 9200, gdp: 18000, life: 74,
  m: 'Aliaksandr Dzmitry Mikhail Ivan Artsiom Maksim Andrei Siarhei Pavel Yauhen', f: 'Anastasiya Darya Maryia Kseniya Alena Volha Hanna Tatsiana Yuliya Katsiaryna', l: 'Ivanou Kavalenka Navumenka Shevchuk Kazlou Melnik Bondar Lukashevich Karpovich Novik',
  cities: [['minsk', 'Minsk', '🏙️', 'Capital region', 'large', 2000000, 0.5, 0.42], ['gomel', 'Gomel', '🏭', 'Mid-size city', 'medium', 500000, 0.45, 0.38], ['brestby', 'Brest', '🏰', 'Mid-size city', 'medium', 350000, 0.45, 0.38], ['vitebsk', 'Vitebsk', '🎨', 'Mid-size city', 'medium', 360000, 0.43, 0.36]],
  gov: ['presidential', 'House of Representatives', 110, ['Communist Party of Belarus', 'Belaya Rus']],
  tax: { flat: 0.13, vat: 0.2, corporate: 0.2, label: 'Ministry of Taxes and Duties' },
  religion: { orthodoxChristian: 73, catholic: 12, none: 15 },
  ruled: [['RU', 'the Russian Empire (Belarus)', 1918], ['RU', 'a Soviet republic (Byelorussia)', 'sovietCollapse', { from: 1919 }]],
  regimes: [[1991, 'pres', 1, 0], [1995, 'pers', 0, 0]], navy: false,
  police: { name: 'Militsiya (Ministry of Internal Affairs)' }, intel: 'KGB of Belarus', stock: 'Belarusian Currency and Stock Exchange',
});

export const BG = C('BG', 'Bulgaria', 'Bulgarian', 'Sofia', ['BGN', 'лв'], 0.75, 'eastBloc', {
  languages: ['Bulgarian'], pop: 6450, gdp: 22000, life: 75,
  m: 'Georgi Ivan Dimitar Nikolay Aleksandar Petar Hristo Stoyan Kaloyan Martin', f: 'Maria Ivana Elena Viktoria Desislava Gergana Petya Raya Yana Teodora', l: 'Ivanov Georgiev Dimitrov Petrov Nikolov Hristov Stoyanov Todorov Iliev Angelov',
  cities: [['sofia', 'Sofia', '🏙️', 'Capital region', 'large', 1300000, 0.5, 0.42], ['plovdiv', 'Plovdiv', '🏛️', 'Mid-size city', 'medium', 345000, 0.45, 0.38], ['varna', 'Varna', '⚓', 'Coastal metro', 'medium', 335000, 0.47, 0.39], ['burgas', 'Burgas', '🏖️', 'Coastal metro', 'medium', 200000, 0.45, 0.37]],
  gov: ['parliamentary', 'National Assembly (Narodno Sabranie)', 240, ['Bulgarian Socialist Party', 'GERB']],
  tax: { flat: 0.1, vat: 0.2, corporate: 0.1, label: 'National Revenue Agency' },
  religion: { orthodoxChristian: 70, sunni: 10, none: 20 },
  ruled: [['TR', 'Ottoman Bulgaria', 1878, { war: true, leader: 'the Ottoman governor' }]],
  regimes: [[1878, 'semimon', 0, 1], [1934, 'absmon', 0, 1], [1946, 'oneparty', 0, 0], [1990, 'parl', 1, 0]],
  freeMovement: EU_FREE, stock: 'Bulgarian Stock Exchange (SOFIX)', centralBank: 'Bulgarian National Bank',
});

export const HR = C('HR', 'Croatia', 'Croatian', 'Zagreb', ['EUR', '€'], 0.38, 'yugoslav', {
  languages: ['Croatian'], pop: 3870, gdp: 28000, life: 78,
  m: 'Luka Ivan Marko Petar Josip Ante Matej David Filip Jakov', f: 'Ana Marija Ivana Petra Lucija Mia Sara Ema Lana Katarina', l: 'Horvat Kovačević Babić Marić Jurić Novak Kovačić Knežević Vuković Marković',
  cities: [['zagreb', 'Zagreb', '🏙️', 'Capital region', 'large', 770000, 0.6, 0.5], ['split', 'Split', '⛵', 'Coastal metro', 'medium', 160000, 0.6, 0.48], ['rijeka', 'Rijeka', '⚓', 'Coastal metro', 'medium', 108000, 0.57, 0.47], ['osijek', 'Osijek', '🌾', 'Mid-size city', 'small', 96000, 0.5, 0.42]],
  gov: ['parliamentary', 'Sabor', 151, ['Social Democratic Party (SDP)', 'Croatian Democratic Union (HDZ)']],
  tax: { allowance: 6720, brackets: [[50400, 0.2], [Infinity, 0.3]], vat: 0.25, corporate: 0.18, label: 'Tax Administration (Porezna uprava)' },
  religion: { catholic: 79, orthodoxChristian: 3, sunni: 1.5, none: 16.5 },
  ruled: [['AT', 'Austria-Hungary (Croatia-Slavonia)', 1918, { noMovement: true, leader: 'the Ban' }]],
  regimes: [...YUGO, [1991, 'semi', 1, 0], [2000, 'parl', 1, 0]],
  money: [[2023, 'HRK', 'kn', 'Croatian kuna', 7.5345]], freeMovement: EU_FREE, centralBank: 'Croatian National Bank', stock: 'Zagreb Stock Exchange (CROBEX)',
});

export const CZ = C('CZ', 'Czechia', 'Czech', 'Prague', ['CZK', 'Kč'], 13, 'eastBloc', {
  languages: ['Czech'], pop: 10700, gdp: 38000, life: 79,
  m: 'Jakub Jan Tomáš Lukáš Matyáš Adam Vojtěch Ondřej Petr Jiří', f: 'Eliška Tereza Anna Adéla Natálie Karolína Lucie Barbora Kateřina Jana', l: 'Novák Svoboda Novotný Dvořák Černý Procházka Kučera Veselý Horák Němec',
  cities: [['prague', 'Prague', '🏰', 'Capital region', 'large', 1350000, 0.75, 0.62], ['brno', 'Brno', '🏙️', 'Mid-size city', 'large', 400000, 0.65, 0.55], ['ostrava', 'Ostrava', '🏭', 'Mid-size city', 'medium', 285000, 0.55, 0.5], ['plzen', 'Plzeň', '🍺', 'Mid-size city', 'medium', 185000, 0.58, 0.52]],
  gov: ['parliamentary', 'Chamber of Deputies', 200, ['Social Democrats (SOCDEM)', 'ODS'], 'Prime Minister', ['Senate', 81, 'Senator']],
  tax: { allowance: 30840, brackets: [[1600000, 0.15], [Infinity, 0.23]], vat: 0.21, corporate: 0.21, label: 'Financial Administration (Finanční správa)' },
  religion: { catholic: 9, mainline: 1, none: 90 },
  ruled: [['AT', 'Austria-Hungary (Bohemia and Moravia)', 1918, { noMovement: true, leader: 'the Governor' }]],
  regimes: [[1918, 'parl', 1, 0], [1939, 'mil', 0, 0], [1945, 'parl', 1, 0], [1948, 'oneparty', 0, 0], [1990, 'parl', 1, 0]],
  freeMovement: EU_FREE, centralBank: 'Czech National Bank', stock: 'Prague Stock Exchange (PX)', groups: ['RICH_SYSTEMS'],
  police: { name: 'Police of the Czech Republic (Policie ČR)', head: 'Police President' },
});

export const HU = C('HU', 'Hungary', 'Hungarian', 'Budapest', ['HUF', 'Ft'], 200, 'eastBloc', {
  languages: ['Hungarian'], pop: 9600, gdp: 31000, life: 76,
  m: 'Bence Máté Levente Dávid Ádám Balázs Péter László Zoltán Gábor', f: 'Hanna Anna Zsófia Lili Luca Eszter Réka Katalin Judit Noémi', l: 'Nagy Kovács Tóth Szabó Horváth Varga Kiss Molnár Németh Farkas',
  cities: [['budapest', 'Budapest', '🏛️', 'Capital region', 'large', 1700000, 0.6, 0.5], ['debrecen', 'Debrecen', '🎓', 'Mid-size city', 'medium', 200000, 0.5, 0.42], ['szeged', 'Szeged', '🌶️', 'Mid-size city', 'medium', 160000, 0.5, 0.42], ['pecs', 'Pécs', '⛪', 'Mid-size city', 'medium', 140000, 0.48, 0.4]],
  gov: ['parliamentary', 'National Assembly (Országgyűlés)', 199, ['Tisza', 'Fidesz']],
  tax: { flat: 0.15, vat: 0.27, corporate: 0.09, contributions: [['Social security contribution', 0.185, null]], label: 'National Tax and Customs Administration (NAV)' },
  religion: { catholic: 40, mainline: 13, lutheran: 2, none: 45 }, navy: false,
  ruled: [['AT', 'the Austrian Empire (Kingdom of Hungary)', 1867, { war: true, noMovement: true, leader: 'the Emperor' }]],
  regimes: [[1867, 'monolig', 0, 1], [1918, 'semi', 0, 0], [1920, 'monolig', 0, 1], [1944, 'pers', 0, 0], [1946, 'parl', 0, 0], [1949, 'oneparty', 0, 0], [1990, 'parl', 1, 0]],
  freeMovement: EU_FREE, centralBank: 'Magyar Nemzeti Bank', stock: 'Budapest Stock Exchange (BUX)',
});

export const IS = C('IS', 'Iceland', 'Icelandic', 'Reykjavík', ['ISK', 'kr'], 145, 'micro', {
  languages: ['Icelandic'], pop: 380, gdp: 52000, life: 83,
  m: 'Jón Sigurður Guðmundur Gunnar Ólafur Einar Kristján Magnús Stefán Aron', f: 'Guðrún Anna Kristín Sigríður Margrét Helga Sara Katrín Emilía Embla', l: 'Jónsson Sigurðsson Guðmundsson Gunnarsson Ólafsson Jónsdóttir Sigurðardóttir Guðmundsdóttir Einarsdóttir Magnúsdóttir',
  cities: [['reykjavik', 'Reykjavík', '🌋', 'Capital region', 'medium', 240000, 1.25, 1.05], ['akureyri', 'Akureyri', '🏔️', 'Small town', 'small', 20000, 1.15, 1.0], ['isafjordur', 'Ísafjörður, Westfjords', '🐟', 'Rural', 'small', 2600, 1.05, 0.95]],
  gov: ['parliamentary', 'Althing', 63, ['Social Democratic Alliance', 'Independence Party']],
  tax: { brackets: [[5000000, 0.3145], [4000000, 0.3795], [Infinity, 0.4625]], vat: 0.24, corporate: 0.2, label: 'Iceland Revenue and Customs (Skatturinn)' },
  religion: { lutheran: 60, catholic: 4, none: 36 },
  ruled: [['DK', 'Iceland, a dependency of the Danish crown', 1918, { noMovement: true, leader: 'the Governor (stiftamtmaður)' }]],
  regimes: [[1918, 'parl', 1, 1], [1944, 'parl', 1, 0]],
  forces: { army: 'Icelandic Crisis Response Unit (Iceland has no army)', navy: 'Icelandic Coast Guard', air: 'Icelandic Air Defence System' },
  police: { name: 'Icelandic Police (Lögreglan)', head: 'National Commissioner of Police' }, freeMovement: EU_FREE, groups: ['RICH_SYSTEMS'], jury: false,
});

export const LI = C('LI', 'Liechtenstein', 'Liechtensteiner', 'Vaduz', ['CHF', 'Fr.'], 1.1, 'micro', {
  languages: ['German'], pop: 39, gdp: 95000, life: 83,
  m: 'Lukas Fabian Simon David Elias Noah Luca Jonas Marco Thomas', f: 'Laura Lea Sophie Elena Anna Julia Lara Nina Sarah Mia', l: 'Frick Büchel Marxer Beck Kaiser Ritter Hasler Wohlwend Vogt Oehri',
  cities: [['vaduz', 'Vaduz', '🏰', 'Capital region', 'small', 5800, 1.4, 1.25], ['schaan', 'Schaan', '🏔️', 'Small town', 'small', 6100, 1.35, 1.2]],
  provinces: ['Oberland', 'Unterland'], provinceWord: 'Region',
  gov: ['monarchy', 'Landtag', 25, ['Free List', 'Progressive Citizens\' Party (FBP)'], 'Prime Minister (Regierungschef)'],
  tax: { allowance: 15000, brackets: [[Infinity, 0.08]], vat: 0.081, corporate: 0.125, label: 'Fiscal Authority (Steuerverwaltung)' },
  regimes: [[1806, 'absmon', 0, 1], [1921, 'parl', 1, 1]],
  forces: { army: 'National Police (Liechtenstein abolished its army in 1868)' }, navy: false,
  police: { name: 'Liechtenstein National Police (Landespolizei)', head: 'Chief of the National Police' }, freeMovement: [...EU_FREE, 'CH'],
});

export const MC = C('MC', 'Monaco', 'Monégasque', 'Monaco', ['EUR', '€'], 0.9, 'micro', {
  languages: ['French'], pop: 39, gdp: 110000, life: 86,
  m: 'Louis Gabriel Raphaël Jules Hugo Léo Arthur Antoine Pierre Albert', f: 'Charlotte Camille Louise Jade Alice Emma Léa Chloé Inès Gabrielle', l: 'Grimaldi Boisson Médecin Notari Pastor Fissore Bellando Rey Barral Gastaud',
  cities: [['montecarlo', 'Monte Carlo', '🎰', 'Capital region', 'small', 16000, 2.2, 1.6], ['lacondamine', 'La Condamine', '🛥️', 'Small town', 'small', 3900, 2.0, 1.5]],
  provinces: ['Monte Carlo ward', 'La Condamine ward'], provinceWord: 'Ward',
  gov: ['monarchy', 'National Council', 24, ['Monaco Priorités', 'Union Monégasque'], 'Minister of State'],
  tax: { brackets: [[Infinity, 0]], vat: 0.2, corporate: 0.25, label: 'Department of Tax Services' },
  regimes: [[1800, 'absmon', 0, 1], [1911, 'semimon', 0, 1], [1962, 'semimon', 1, 1]],
  forces: { army: 'Compagnie des Carabiniers du Prince', navy: null }, police: { name: 'Sûreté Publique', head: 'Director of Public Security' }, freeMovement: ['FR'],
});

export const ME = C('ME', 'Montenegro', 'Montenegrin', 'Podgorica', ['EUR', '€'], 0.38, 'yugoslav', {
  languages: ['Montenegrin', 'Serbian'], pop: 620, gdp: 21000, life: 76,
  m: 'Luka Petar Nikola Marko Stefan Lazar Vuk Filip Milan Aleksa', f: 'Milica Jovana Ana Sara Teodora Anđela Marija Dunja Iva Lana', l: 'Popović Vujović Marković Radulović Đukanović Vuković Perović Milić Bulatović Šćekić',
  cities: [['podgorica', 'Podgorica', '🏙️', 'Capital region', 'medium', 190000, 0.5, 0.4], ['niksic', 'Nikšić', '🍺', 'Mid-size city', 'small', 56000, 0.45, 0.36], ['budva', 'Budva', '🏖️', 'Coastal metro', 'small', 20000, 0.6, 0.42]],
  gov: ['parliamentary', 'Parliament of Montenegro (Skupština)', 81, ['Democratic Party of Socialists', 'Europe Now!']],
  tax: { allowance: 8400, brackets: [[3600, 0.09], [Infinity, 0.15]], vat: 0.21, corporate: 0.15 },
  religion: { orthodoxChristian: 72, sunni: 19, catholic: 3, none: 6 },
  regimes: [[1800, 'absmon', 0, 1], [1905, 'semimon', 0, 1], ...YUGO, [1990, 'multiauth', 0, 0], [2006, 'parl', 1, 0]],
});

export const MK = C('MK', 'North Macedonia', 'Macedonian', 'Skopje', ['MKD', 'ден'], 20, 'yugoslav', {
  languages: ['Macedonian', 'Albanian'], pop: 1830, gdp: 16000, life: 75,
  m: 'Aleksandar Nikola David Stefan Marko Bojan Goran Filip Darko Ilija', f: 'Ana Elena Marija Sara Jana Teodora Ivana Simona Katerina Mila', l: 'Stojanovski Nikolovski Trajkovski Petrovski Dimitrovski Jovanovski Ristovski Georgievski Angelovski Kostovski',
  cities: [['skopje', 'Skopje', '🏙️', 'Capital region', 'medium', 530000, 0.42, 0.34], ['bitola', 'Bitola', '🏛️', 'Mid-size city', 'small', 75000, 0.38, 0.3], ['ohrid', 'Ohrid', '⛪', 'Small town', 'small', 40000, 0.4, 0.3]],
  gov: ['parliamentary', 'Assembly (Sobranie)', 120, ['SDSM', 'VMRO-DPMNE']], navy: false,
  tax: { flat: 0.1, vat: 0.18, corporate: 0.1 },
  religion: { orthodoxChristian: 61, sunni: 33, none: 6 },
  ruled: [['TR', 'Ottoman Macedonia', 1912, { war: true, leader: 'the Ottoman governor' }]],
  regimes: [[1912, 'semimon', 0, 1], ...YUGO.slice(1), [1991, 'parl', 1, 0]], periodNames: [[2019, 'Macedonia']],
});

export const MD = C('MD', 'Moldova', 'Moldovan', 'Chișinău', ['MDL', 'L'], 7.6, 'postSoviet', {
  languages: ['Romanian', 'Russian'], pop: 2500, gdp: 13000, life: 71,
  m: 'Ion Alexandru Andrei Vasile Mihai Nicolae Sergiu Dumitru Vlad Daniel', f: 'Maria Ana Elena Cristina Natalia Ecaterina Irina Valentina Daniela Victoria', l: 'Rusu Ceban Ciobanu Turcan Lungu Cebotari Munteanu Moraru Rotari Popa',
  cities: [['chisinau', 'Chișinău', '🍷', 'Capital region', 'medium', 640000, 0.42, 0.33], ['balti', 'Bălți', '🌻', 'Mid-size city', 'small', 100000, 0.38, 0.3], ['cahul', 'Cahul', '🍇', 'Small town', 'small', 30000, 0.35, 0.28]],
  gov: ['parliamentary', 'Parliament', 101, ['Party of Socialists', 'Party of Action and Solidarity (PAS)'], 'Prime Minister'], navy: false,
  tax: { flat: 0.12, vat: 0.2, corporate: 0.12, label: 'State Tax Service' },
  religion: { orthodoxChristian: 90, evangelical: 3, none: 7 },
  ruled: [['RU', 'the Russian Empire (Bessarabia)', 1918, { from: 1812 }], ['RO', 'Bessarabia, a part of Romania', 1940, { noMovement: true, leader: 'the Romanian prefect' }], ['RU', 'a Soviet republic (Moldavia)', 'sovietCollapse']],
  regimes: [[1991, 'semi', 1, 0], [2001, 'parl', 1, 0]], freeMovement: ['RO'],
});

export const RS = C('RS', 'Serbia', 'Serbian', 'Belgrade', ['RSD', 'дин'], 45, 'yugoslav', {
  languages: ['Serbian'], pop: 6700, gdp: 19000, life: 75,
  m: 'Luka Stefan Nikola Lazar Marko Aleksa Filip Dušan Miloš Vuk', f: 'Milica Ana Jovana Teodora Sara Marija Anđela Jelena Katarina Nina', l: 'Jovanović Petrović Nikolić Marković Đorđević Stojanović Ilić Stanković Pavlović Milošević',
  cities: [['belgrade', 'Belgrade', '🏙️', 'Capital region', 'large', 1400000, 0.5, 0.42], ['novisad', 'Novi Sad', '🎪', 'Mid-size city', 'medium', 340000, 0.47, 0.4], ['nis', 'Niš', '🏰', 'Mid-size city', 'medium', 260000, 0.42, 0.35], ['kragujevac', 'Kragujevac', '🚗', 'Mid-size city', 'medium', 180000, 0.42, 0.36]],
  gov: ['parliamentary', 'National Assembly', 250, ['Democratic Party', 'Serbian Progressive Party (SNS)']], navy: false,
  tax: { flat: 0.1, vat: 0.2, corporate: 0.15, contributions: [['Pension and health insurance', 0.199, null]], label: 'Tax Administration (Poreska uprava)' },
  religion: { orthodoxChristian: 82, catholic: 4, sunni: 4, none: 10 },
  ruled: [['TR', 'the Principality of Serbia (under the Ottomans)', 1878, { noMovement: true, leader: 'the Prince' }]],
  regimes: [[1878, 'semimon', 0, 1], ...YUGO, [1990, 'multiauth', 0, 0], [2000, 'parl', 1, 0]],
  centralBank: 'National Bank of Serbia', stock: 'Belgrade Stock Exchange (BELEX15)',
  forces: { conscription: null },
});

export const SM = C('SM', 'San Marino', 'Sammarinese', 'San Marino', ['EUR', '€'], 0.62, 'micro', {
  languages: ['Italian'], pop: 34, gdp: 60000, life: 85,
  m: 'Marco Luca Matteo Alessandro Andrea Francesco Lorenzo Simone Davide Giacomo', f: 'Giulia Sofia Martina Chiara Sara Alessia Francesca Elena Aurora Giorgia', l: 'Gasperoni Giardi Guidi Casadei Gatti Muccioli Stefanelli Ceccoli Bollini Righi',
  cities: [['sanmarino', 'San Marino', '🏰', 'Capital region', 'small', 4000, 0.95, 0.8], ['serravalle', 'Serravalle', '⛰️', 'Small town', 'small', 11000, 0.9, 0.78]],
  provinces: ['Città di San Marino castello', 'Serravalle castello'], provinceWord: 'Castello',
  gov: ['parliamentary', 'Grand and General Council', 60, ['Party of Socialists and Democrats', 'Sammarinese Christian Democratic Party'], 'Captains Regent'],
  tax: { allowance: 9000, brackets: [[16000, 0.09], [24000, 0.17], [Infinity, 0.28]], vat: 0.17, corporate: 0.17 },
  regimes: [[1800, 'olig', 0, 0], [1945, 'parl', 1, 0]],
  forces: { army: 'Guard of the Rock (Guardia di Rocca)', navy: null }, police: { name: 'Gendarmeria of San Marino', head: 'Commander of the Gendarmeria' }, freeMovement: ['IT'],
});

export const SK = C('SK', 'Slovakia', 'Slovak', 'Bratislava', ['EUR', '€'], 0.45, 'eastBloc', {
  languages: ['Slovak'], pop: 5430, gdp: 30000, life: 77,
  m: 'Jakub Adam Samuel Michal Tomáš Lukáš Martin Peter Matej Filip', f: 'Sofia Ema Nina Natália Viktória Laura Lucia Zuzana Katarína Jana', l: 'Horváth Kováč Varga Tóth Nagy Baláž Szabó Molnár Lukáč Kollár',
  cities: [['bratislava', 'Bratislava', '🏰', 'Capital region', 'medium', 475000, 0.65, 0.55], ['kosice', 'Košice', '⛪', 'Mid-size city', 'medium', 230000, 0.52, 0.45], ['presov', 'Prešov', '🏞️', 'Mid-size city', 'small', 85000, 0.48, 0.4], ['zilina', 'Žilina', '🚗', 'Mid-size city', 'small', 80000, 0.5, 0.44]],
  gov: ['parliamentary', 'National Council', 150, ['Smer-SD', 'Progressive Slovakia']], navy: false,
  tax: { allowance: 5600, brackets: [[42000, 0.19], [Infinity, 0.25]], vat: 0.23, corporate: 0.21, label: 'Financial Administration' },
  religion: { catholic: 62, lutheran: 5, evangelical: 3, none: 30 },
  ruled: [['AT', 'Austria-Hungary (Upper Hungary)', 1918, { noMovement: true, leader: 'the Hungarian governor' }]],
  regimes: [[1918, 'parl', 1, 0], [1939, 'oneparty', 0, 0], [1945, 'parl', 1, 0], [1948, 'oneparty', 0, 0], [1990, 'parl', 1, 0]],
  money: [[2009, 'SKK', 'Sk', 'Slovak koruna', 30.126]], freeMovement: EU_FREE, centralBank: 'National Bank of Slovakia',
});

export const SI = C('SI', 'Slovenia', 'Slovenian', 'Ljubljana', ['EUR', '€'], 0.55, 'yugoslav', {
  languages: ['Slovene'], pop: 2120, gdp: 38000, life: 81,
  m: 'Luka Jakob Filip Nik Žan Jan Tim Matej Gregor Aleš', f: 'Zala Ema Eva Lana Sara Mia Nika Ana Maja Špela', l: 'Novak Horvat Krajnc Kovačič Zupančič Potočnik Kovač Mlakar Kos Vidmar',
  cities: [['ljubljana', 'Ljubljana', '🐉', 'Capital region', 'medium', 295000, 0.7, 0.6], ['maribor', 'Maribor', '🍷', 'Mid-size city', 'medium', 97000, 0.62, 0.52], ['koper', 'Koper', '⚓', 'Coastal metro', 'small', 26000, 0.65, 0.54]],
  gov: ['parliamentary', 'National Assembly (Državni zbor)', 90, ['Social Democrats', 'Slovenian Democratic Party']],
  tax: { allowance: 5000, brackets: [[8755, 0.16], [17000, 0.26], [26000, 0.33], [20000, 0.39], [Infinity, 0.5]], vat: 0.22, corporate: 0.22, label: 'Financial Administration (FURS)' },
  religion: { catholic: 72, orthodoxChristian: 2, sunni: 2, none: 24 },
  ruled: [['AT', 'Austria-Hungary (Carniola)', 1918, { noMovement: true, leader: 'the Governor' }]],
  regimes: [...YUGO, [1990, 'parl', 1, 0]],
  money: [[2007, 'SIT', 'SIT', 'Slovenian tolar', 239.64]], freeMovement: EU_FREE, groups: ['RICH_SYSTEMS'],
});
