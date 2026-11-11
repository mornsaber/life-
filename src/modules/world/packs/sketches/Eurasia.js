/**
 * The Caucasus and Central Asia: the Soviet republics that became states in 1991.
 * Built with sketch() (../Sketch.js).
 */
import { sketch } from '../Sketch.js';

const C = (id, name, demonym, capital, cur, ppp, o) => sketch({ id, name, demonym, capital, cur, ppp, family: 'postSoviet', ...o });
const soviet = (empire, ssr, conquered, from) => [['RU', `the Russian Empire (${empire})`, 1918, { from: conquered }], ['RU', `a Soviet republic (${ssr})`, 'sovietCollapse', { from }]];

export const AM = C('AM', 'Armenia', 'Armenian', 'Yerevan', ['AMD', '֏'], 150, {
  languages: ['Armenian'], pop: 2960, gdp: 14000, life: 75,
  m: 'Davit Narek Hayk Aram Tigran Arman Gor Levon Samvel Erik', f: 'Anahit Mariam Ani Nare Lilit Gayane Hasmik Anna Sona Arpi', l: 'Grigoryan Hovhannisyan Sargsyan Harutyunyan Khachatryan Petrosyan Vardanyan Karapetyan Gevorgyan Avetisyan',
  cities: [['yerevan', 'Yerevan', '⛰️', 'Capital region', 'large', 1090000, 0.45, 0.36], ['gyumri', 'Gyumri', '🏛️', 'Mid-size city', 'small', 112000, 0.38, 0.3], ['vanadzor', 'Vanadzor', '🌲', 'Mid-size city', 'small', 76000, 0.36, 0.28]],
  gov: ['parliamentary', 'National Assembly', 107, ['Civil Contract', 'Armenia Alliance'], 'Prime Minister'], navy: false,
  tax: { flat: 0.2, vat: 0.2, corporate: 0.18, label: 'State Revenue Committee' },
  religion: { orthodox: 93, catholic: 1, evangelical: 1, none: 5 },
  ruled: soviet('Erivan Governorate', 'Armenia', 1828, 1920), regimes: [[1991, 'semi', 0, 0], [2018, 'parl', 1, 0]],
});

export const AZ = C('AZ', 'Azerbaijan', 'Azerbaijani', 'Baku', ['AZN', '₼'], 0.65, {
  languages: ['Azerbaijani'], pop: 10100, gdp: 14000, life: 73,
  m: 'Yusif Ali Huseyn Murad Elvin Rashad Farid Orkhan Tural Kamran', f: 'Zahra Leyla Aysel Nargiz Gunay Sevinj Fidan Narmin Aynur Nigar', l: 'Mammadov Aliyev Hasanov Huseynov Guliyev Ismayilov Abdullayev Rzayev Babayev Ahmadov',
  cities: [['baku', 'Baku', '🛢️', 'Capital region', 'large', 2300000, 0.5, 0.42], ['ganja', 'Ganja', '🏛️', 'Mid-size city', 'medium', 335000, 0.4, 0.33], ['sumqayit', 'Sumqayit', '🏭', 'Coastal metro', 'medium', 345000, 0.42, 0.35]],
  gov: ['presidential', 'Milli Majlis', 125, ['Musavat', 'New Azerbaijan Party']],
  tax: { brackets: [[96000, 0.14], [Infinity, 0.25]], vat: 0.18, corporate: 0.2, label: 'State Tax Service' },
  religion: { shia: 85, sunni: 10, orthodox: 2, none: 3 },
  ruled: soviet('Baku Governorate', 'Azerbaijan', 1813, 1920), regimes: [[1991, 'pres', 0, 0], [1993, 'pers', 0, 0]], redCrescent: true,
});

export const GE = C('GE', 'Georgia', 'Georgian', 'Tbilisi', ['GEL', '₾'], 1.0, {
  languages: ['Georgian'], pop: 3700, gdp: 15000, life: 72,
  m: 'Giorgi Davit Luka Nikoloz Levan Irakli Sandro Zurab Dachi Lasha', f: 'Nino Mariam Ana Elene Tamar Salome Natia Ketevan Nana Lika', l: 'Beridze Kapanadze Gelashvili Maisuradze Giorgadze Lomidze Tsiklauri Bolkvadze Kvaratskhelia Mamedov',
  cities: [['tbilisi', 'Tbilisi', '🏙️', 'Capital region', 'large', 1200000, 0.45, 0.36], ['batumi', 'Batumi', '🏖️', 'Coastal metro', 'medium', 170000, 0.45, 0.35], ['kutaisi', 'Kutaisi', '⛪', 'Mid-size city', 'medium', 130000, 0.38, 0.3]],
  gov: ['parliamentary', 'Parliament of Georgia', 150, ['United National Movement', 'Georgian Dream'], 'Prime Minister'],
  tax: { flat: 0.2, vat: 0.18, corporate: 0.15, label: 'Revenue Service' },
  religion: { orthodox: 84, sunni: 10, none: 6 },
  ruled: soviet('Tiflis Governorate', 'Georgia', 1801, 1921), regimes: [[1991, 'pres', 0, 0], [2004, 'semi', 1, 0], [2013, 'parl', 1, 0]],
});

export const KZ = C('KZ', 'Kazakhstan', 'Kazakh', 'Astana', ['KZT', '₸'], 190, {
  languages: ['Kazakh', 'Russian'], pop: 19800, gdp: 25000, life: 72,
  m: 'Alikhan Nursultan Daniyar Yerlan Arman Aidos Bauyrzhan Timur Askar Ruslan', f: 'Aisha Dana Aruzhan Madina Zhanna Gulnara Aigerim Saule Dinara Ainur', l: 'Akhmetov Omarov Suleimenov Abenov Iskakov Nurlanov Zhaksybekov Bekov Tokayev Seitkali',
  cities: [['astana', 'Astana', '🏙️', 'Capital region', 'large', 1300000, 0.5, 0.45], ['almaty', 'Almaty', '🏔️', 'Mid-size city', 'large', 2200000, 0.52, 0.47], ['shymkent', 'Shymkent', '🌾', 'Mid-size city', 'large', 1100000, 0.42, 0.36], ['karaganda', 'Karaganda', '⛏️', 'Mid-size city', 'medium', 500000, 0.42, 0.38]],
  gov: ['presidential', 'Mazhilis', 98, ['Ak Zhol', 'Amanat']], navy: false,
  tax: { flat: 0.1, vat: 0.12, corporate: 0.2, contributions: [['Unified Accumulative Pension Fund', 0.1, null]], label: 'State Revenue Committee' },
  religion: { sunni: 70, orthodox: 24, none: 6 },
  ruled: [['RU', 'the Russian Empire (the Kazakh Steppe)', 1918, { from: 1847 }], ['RU', 'a Soviet republic (Kazakhstan)', 'sovietCollapse', { from: 1920 }]], regimes: [[1991, 'pers', 0, 0]],
  stock: 'Kazakhstan Stock Exchange (KASE)', centralBank: 'National Bank of Kazakhstan',
});

export const KG = C('KG', 'Kyrgyzstan', 'Kyrgyz', 'Bishkek', ['KGS', 'с'], 25, {
  languages: ['Kyrgyz', 'Russian'], pop: 7000, gdp: 5000, life: 71,
  m: 'Nurbek Aibek Bakyt Azamat Daniyar Emil Ruslan Timur Erlan Almaz', f: 'Aizada Ainura Bermet Gulzat Nurzhan Aigul Cholpon Zarina Elnura Aidai', l: 'Asanov Tashiev Japarov Sadyrov Mamatov Usenov Abdyldaev Bakirov Omurbekov Kadyrov',
  cities: [['bishkek', 'Bishkek', '🏔️', 'Capital region', 'large', 1100000, 0.38, 0.3], ['osh', 'Osh', '🕌', 'Mid-size city', 'medium', 320000, 0.33, 0.25], ['karakol', 'Karakol, Issyk-Kul', '🏞️', 'Small town', 'small', 85000, 0.32, 0.24]],
  gov: ['presidential', 'Jogorku Kenesh', 90, ['Social Democrats', 'Ata-Zhurt Kyrgyzstan']], navy: false,
  tax: { flat: 0.1, vat: 0.12, corporate: 0.1, label: 'State Tax Service' },
  religion: { sunni: 88, orthodox: 8, none: 4 },
  ruled: [['RU', 'Russian Turkestan (Semirechye)', 1918, { from: 1876 }], ['RU', 'a Soviet republic (Kirghizia)', 'sovietCollapse', { from: 1924 }]], regimes: [[1991, 'pres', 0, 0], [2010, 'parl', 0, 0], [2021, 'pres', 0, 0]],
});

export const TJ = C('TJ', 'Tajikistan', 'Tajik', 'Dushanbe', ['TJS', 'SM'], 3.2, {
  languages: ['Tajik', 'Russian'], pop: 10100, gdp: 3800, life: 71,
  m: 'Muhammad Firdavs Rustam Farrukh Davron Behruz Jamshed Sohib Bahrom Umed', f: 'Madina Zarina Shahnoza Nilufar Gulnora Farzona Mehrona Sitora Dilnoza Parvina', l: 'Rahmonov Karimov Saidov Nazarov Sharipov Rahimov Hakimov Safarov Davlatov Ismoilov',
  cities: [['dushanbe', 'Dushanbe', '🏔️', 'Capital region', 'large', 870000, 0.32, 0.24], ['khujand', 'Khujand', '🏛️', 'Mid-size city', 'medium', 190000, 0.3, 0.22], ['bokhtar', 'Bokhtar', '🌾', 'Small town', 'small', 110000, 0.28, 0.2]],
  gov: ['presidential', 'Majlisi Namoyandagon', 63, ['Communist Party', 'People\'s Democratic Party']], navy: false,
  tax: { flat: 0.12, vat: 0.14, corporate: 0.18, label: 'Tax Committee' },
  religion: { sunni: 95, shia: 3, none: 2 },
  ruled: [['RU', 'the Emirate of Bukhara, a Russian protectorate', 1920, { from: 1868, leader: 'the Emir', noMovement: true }], ['RU', 'a Soviet republic (Tajikistan)', 'sovietCollapse', { from: 1924 }]], regimes: [[1991, 'pers', 0, 0]],
});

export const TM = C('TM', 'Turkmenistan', 'Turkmen', 'Ashgabat', ['TMT', 'm'], 1.6, {
  languages: ['Turkmen', 'Russian'], pop: 6300, gdp: 14000, life: 69,
  m: 'Serdar Myrat Batyr Dovlet Arslan Merdan Rustam Begench Yhlas Kerim', f: 'Ogulgerek Aylar Maral Jennet Gulshat Selbi Bahar Leyli Ayna Enejan', l: 'Berdimuhamedov Atayev Orazov Annayev Muradov Charyyev Ovezov Hojayev Nurmuhammedov Garayev',
  cities: [['ashgabat', 'Ashgabat', '🏛️', 'Capital region', 'large', 1000000, 0.4, 0.3], ['turkmenabat', 'Türkmenabat', '🌾', 'Mid-size city', 'medium', 250000, 0.35, 0.26], ['dashoguz', 'Daşoguz', '🏜️', 'Mid-size city', 'small', 170000, 0.33, 0.24]],
  gov: ['oneParty', 'Mejlis', 125, ['Agrarian Party', 'Democratic Party of Turkmenistan']],
  tax: { flat: 0.1, vat: 0.15, corporate: 0.08 },
  religion: { sunni: 93, orthodox: 6, none: 1 },
  ruled: soviet('Transcaspia', 'Turkmenistan', 1881, 1924), regimes: [[1991, 'pers', 0, 0]],
});

export const UZ = C('UZ', 'Uzbekistan', 'Uzbek', 'Tashkent', ['UZS', 'so\'m'], 3500, {
  languages: ['Uzbek', 'Russian'], pop: 35600, gdp: 7500, life: 71,
  m: 'Muhammad Abdulloh Jasur Sardor Bekzod Otabek Shohruh Javohir Akmal Dilshod', f: 'Madina Sevara Dilnoza Gulnora Nigora Shahzoda Malika Zarina Kamola Mohira', l: 'Karimov Rakhimov Yusupov Tursunov Usmonov Abdullayev Ergashev Mirzayev Nazarov Ismoilov',
  cities: [['tashkent', 'Tashkent', '🕌', 'Capital region', 'large', 2900000, 0.38, 0.3], ['samarkand', 'Samarkand', '🏛️', 'Mid-size city', 'medium', 550000, 0.33, 0.25], ['namangan', 'Namangan', '🌾', 'Mid-size city', 'medium', 650000, 0.3, 0.22], ['bukhara', 'Bukhara', '🏺', 'Mid-size city', 'medium', 280000, 0.32, 0.24]],
  gov: ['presidential', 'Legislative Chamber (Oliy Majlis)', 150, ['Milliy Tiklanish', 'Liberal Democratic Party']], navy: false,
  tax: { flat: 0.12, vat: 0.12, corporate: 0.15, label: 'State Tax Committee' },
  religion: { sunni: 93, orthodox: 4, none: 3 },
  ruled: [['RU', 'Russian Turkestan', 1918, { from: 1867, leader: 'the Governor-General' }], ['RU', 'a Soviet republic (Uzbekistan)', 'sovietCollapse', { from: 1924 }]], regimes: [[1991, 'pers', 0, 0]],
});
