/**
 * Places that govern themselves under another state's sovereignty (world/Eras.js AUTONOMOUS):
 *
 *   Puerto Rico   Spanish until 1898, an American territory ("Porto Rico" until 1932), a
 *                 Commonwealth from 1952 (the Estado Libre Asociado); US citizens since 1917.
 *   Greenland     a Danish colony until 1953, then a county of Denmark; home rule 1979, self-rule 2009.
 *   The Faroes    a Danish county; British-occupied 1940–45; home rule 1948.
 *   Gibraltar, Bermuda, the Cayman Islands
 *                 British colonies still, self-governing under their constitutions (1969, 1968, 1972):
 *                 British Overseas Territories.
 *   Jersey, Guernsey, the Isle of Man
 *                 Crown dependencies: the Crown's, never the United Kingdom's; their own parliaments
 *                 (the States, Tynwald), laws, courts and money. The Channel Islands were occupied by
 *                 Germany 1940–45.
 *
 * Built with sketch() (../Sketch.js).
 */
import { sketch } from '../Sketch.js';

const C = (id, name, demonym, capital, cur, ppp, family, o) => sketch({ id, name, demonym, capital, cur, ppp, family, ...o });
const BRIT_POLICE = ['Police Constable', 'Police Constable', 'Sergeant', 'Inspector', 'Chief Inspector', 'Superintendent', 'Chief Superintendent', 'Assistant Commissioner', 'Deputy Commissioner', 'Commissioner of Police'];
const US_ENLISTED = ['Private', 'Private First Class', 'Specialist', 'Sergeant', 'Staff Sergeant', 'Sergeant First Class', 'Master Sergeant', 'First Sergeant', 'Sergeant Major'];
const US_OFFICERS = ['Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'];
const DK_ENLISTED = ['Menig', 'Overkonstabel', 'Korporal', 'Sergent', 'Oversergent', 'Seniorsergent', 'Chefsergent', 'Chefsergent', 'Chefsergent'];
const DK_OFFICERS = ['Løjtnant', 'Premierløjtnant', 'Kaptajn', 'Major', 'Oberstløjtnant', 'Oberst', 'Brigadegeneral', 'Generalmajor', 'Generalløjtnant', 'General'];
const BRIT_ENLISTED = ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Warrant Officer Class 2', 'Warrant Officer Class 1', 'Regimental Sergeant Major', 'Regimental Sergeant Major'];
const BRIT_OFFICERS = ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier', 'Major General', 'Lieutenant General', 'General'];
const CROWN_COURTS = (top) => ({ top, high: 'Royal Court', appeal: 'Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the Crown' });
const occupied = (island) => [['DE', `German-occupied ${island}`, 1945, { from: 1940, noMovement: true, fixed: true, occupation: true, leader: 'the German Feldkommandantur',
  arrive: `The Germans landed in ${island} on 1 July 1940, after the British government had decided not to defend the islands. Curfews, ration books, the radios confiscated; then, in 1944, near starvation until the Red Cross ship came.` }]];

export const PR = C('PR', 'Puerto Rico', 'Puerto Rican', 'San Juan', ['USD', '$'], 1, 'latin', {
  languages: ['Spanish', 'English'], pop: 3200, gdp: 35000, life: 80,
  m: 'José Luis Carlos Juan Miguel Ángel Jorge Luis|Ángel Héctor Rafael', f: 'María Carmen Ana Gloria Luz Nilda Lourdes Milagros Iris Yolanda', l: 'Rivera Rodríguez Colón Torres Ortiz Cruz Ramos Vázquez Santiago Díaz',
  cities: [['pr_sanjuanpr', 'San Juan', '🏰', 'Capital region', 'large', 340000, 0.9, 0.7], ['pr_ponce', 'Ponce', '🦁', 'Mid-size city', 'medium', 130000, 0.75, 0.6], ['pr_mayaguez', 'Mayagüez', '🌴', 'Small town', 'small', 70000, 0.7, 0.55]],
  provinceWord: 'Municipality', gov: ['presidential', 'House of Representatives', 51, ['Popular Democratic Party', 'New Progressive Party'], 'Governor', ['Senate', 27, 'Senator', true]],
  tax: { allowance: 9000, brackets: [[9000, 0], [16000, 0.07], [16000, 0.14], [Infinity, 0.33]], vat: 0.115, corporate: 0.375, label: 'Hacienda (Department of the Treasury)' },
  police: { name: 'Puerto Rico Police', head: 'Commissioner of Police', ranks: ['Agente', 'Agente', 'Sargento', 'Teniente II', 'Teniente I', 'Capitán', 'Inspector', 'Comandante', 'Teniente coronel', 'Coronel'] },
  forces: { army: 'United States Army (the 65th Infantry; the Puerto Rico National Guard)', navy: 'United States Navy', air: 'United States Air Force', ranks: { enlisted: US_ENLISTED, officer: US_OFFICERS } },
  courts: { top: 'Supreme Court of Puerto Rico', high: 'Court of First Instance', appeal: 'Court of Appeals', magistrate: 'Municipal judge', appointedBy: 'the Governor, with the Senate' },
  religion: { catholic: 56, evangelical: 33, none: 11 }, emergency: '911', retire: 65, warChance: 0,
  ruled: [['ES', 'Spanish Puerto Rico', 1898, { leader: 'the Captain General', fixed: true, noMovement: true }],
    ['US', 'Porto Rico, an American territory', 1952, { leader: 'the Governor (appointed in Washington until 1948)', fixed: true, noMovement: true,
      arrive: 'American troops landed at Guánica in July 1898. Puerto Rico belongs to the United States now: "Porto Rico", the new rulers spell it.' }]],
  regimes: null, sovereign: [],
});

export const GL = C('GL', 'Greenland', 'Greenlander', 'Nuuk', ['DKK', 'kr.'], 7.5, 'micro', {
  languages: ['Greenlandic (Kalaallisut)', 'Danish'], pop: 56, gdp: 48000, life: 72,
  m: 'Aputsiaq Inunnguaq Malik Minik Nuka Pipaluk|Hans Kristian Hans Jens Ole', f: 'Aviaja Najaaraq Nivi Paninnguaq Ivalu Arnaq Pipaluk Nukannguaq Malene Karen', l: 'Kristiansen Olsen Petersen Lyberth Kleist Lynge Motzfeldt Egede Berthelsen Heilmann',
  cities: [['gl_nuuk', 'Nuuk (Godthåb)', '🧊', 'Capital region', 'small', 19000, 1.1, 0.9], ['gl_sisimiut', 'Sisimiut', '🐋', 'Small town', 'small', 5500, 1.0, 0.8], ['gl_ilulissat', 'Ilulissat', '🏔️', 'Small town', 'small', 4700, 1.0, 0.8]],
  provinceWord: 'Municipality', gov: ['parliamentary', 'Inatsisartut (Parliament)', 31, ['Inuit Ataqatigiit', 'Siumut'], 'Premier (Naalakkersuisut siulittaasuat)'],
  tax: { brackets: [[Infinity, 0.42]], vat: 0, corporate: 0.25, label: 'Akileraartarnermut Aqutsisoqarfik (Tax Agency)' },
  police: { name: 'Greenland Police (Danish National Police)', head: 'Chief of Police of Greenland', ranks: ['Politibetjent', 'Politibetjent', 'Politiassistent', 'Politiassistent', 'Vicepolitikommissær', 'Politikommissær', 'Politiinspektør', 'Vicepolitidirektør', 'Politidirektør', 'Politimester'] },
  forces: { army: 'Danish Defence (Joint Arctic Command; the Sirius sled patrol)', navy: 'Royal Danish Navy', air: 'Royal Danish Air Force', ranks: { enlisted: DK_ENLISTED, officer: DK_OFFICERS } },
  courts: { top: 'Supreme Court of Denmark', high: 'Court of Greenland', appeal: 'High Court of Greenland', magistrate: 'District court judge', appointedBy: 'the Danish Crown' },
  religion: { mainline: 95, none: 5 }, emergency: '112', retire: 65, warChance: 0,
  orders: [['', 'Nersornaat (silver)'], ['', 'Nersornaat (gold)']],
  ruled: [['DK', 'the colony of Greenland (Danish)', 1953, { leader: 'the Danish governor (landsfoged)', fixed: true, noMovement: true }],
    ['DK', 'Greenland, a county of Denmark', 1979, { leader: 'the Danish governor (landshøvding)', fixed: true, noMovement: true, arrive: 'The colony is over: Greenland is a county of Denmark now, its people Danish citizens. The Danes are building towns, and moving the settlements into them.' }]],
  regimes: null, sovereign: [],
});

export const FO = C('FO', 'the Faroe Islands', 'Faroese', 'Tórshavn', ['DKK', 'kr.'], 7.0, 'micro', {
  languages: ['Faroese', 'Danish'], pop: 54, gdp: 55000, life: 82,
  m: 'Jógvan Rógvi Hans Pól Sjúrður Bárður Heðin Óli Tróndur Jákup', f: 'Guðrun Marjun Sigrid Turið Elin Rakul Bára Ása Maria Anna', l: 'Joensen Hansen Jacobsen Olsen Poulsen Petersen Johannesen Thomsen Rasmussen Nielsen',
  cities: [['fo_torshavn', 'Tórshavn', '⛵', 'Capital region', 'small', 14000, 1.1, 0.9], ['fo_klaksvik', 'Klaksvík', '🐟', 'Small town', 'small', 5000, 1.0, 0.85]],
  provinceWord: 'Region', gov: ['parliamentary', 'Løgting', 33, ['Social Democratic Party (Javnaðarflokkurin)', 'People\'s Party (Fólkaflokkurin)'], 'Prime Minister (Løgmaður)'],
  tax: { allowance: 30000, brackets: [[Infinity, 0.35]], vat: 0.25, corporate: 0.18, label: 'TAKS' },
  police: { name: 'Faroe Islands Police', head: 'Chief of Police (Landfúti)', ranks: ['Politibetjent', 'Politibetjent', 'Politiassistent', 'Politiassistent', 'Vicepolitikommissær', 'Politikommissær', 'Politiinspektør', 'Vicepolitidirektør', 'Politidirektør', 'Politimester'] },
  forces: { army: 'Danish Defence (Joint Arctic Command)', navy: 'Royal Danish Navy', air: 'Royal Danish Air Force', ranks: { enlisted: DK_ENLISTED, officer: DK_OFFICERS } },
  courts: { top: 'Supreme Court of Denmark', high: 'Faroe Islands Court', appeal: 'Eastern High Court', magistrate: 'District judge', appointedBy: 'the Danish Crown' },
  religion: { mainline: 90, none: 10 }, emergency: '112', retire: 67, warChance: 0,
  ruled: [['DK', 'the Faroe Islands, an amt of Denmark', 1940, { leader: 'the Danish amtmand', fixed: true, noMovement: true }],
    ['GB', 'British-occupied Faroe Islands', 1945, { leader: 'the British commander', fixed: true, noMovement: true, occupation: true, arrive: 'Germany has taken Denmark, and the Royal Navy has taken the Faroes: British soldiers in Tórshavn, and the Faroese flag flown on the fishing boats for the first time.' }],
    ['DK', 'the Faroe Islands, an amt of Denmark', 1948, { leader: 'the Danish amtmand', fixed: true, noMovement: true, arrive: 'The British have gone home. The islands voted for independence in 1946, narrowly; Copenhagen offered home rule instead.' }]],
  regimes: null, sovereign: [],
});

export const GI = C('GI', 'Gibraltar', 'Gibraltarian', 'Gibraltar', ['GIP', '£'], 0.75, 'micro', {
  languages: ['English', 'Spanish (Llanito)'], pop: 34, gdp: 60000, life: 82,
  m: 'John Joseph James Charles Peter Albert Fabian Keith Gilbert Manuel', f: 'Mary Maria Rose Elizabeth Josephine Carmen Lourdes Charlotte Sarah Emma', l: 'Hassan Caruana Bossano Picardo Garcia Linares Montegriffo Cortes Bonfante Isola',
  cities: [['gi_gibraltartown', 'Gibraltar', '🪨', 'Capital region', 'small', 34000, 1.3, 1.1]],
  provinceWord: 'Territory', gov: ['parliamentary', 'Gibraltar Parliament', 17, ['Gibraltar Socialist Labour Party', 'Gibraltar Social Democrats'], 'Chief Minister'],
  tax: { allowance: 3000, brackets: [[17000, 0.16], [Infinity, 0.28]], vat: 0, corporate: 0.15, label: 'Income Tax Office' },
  police: { name: 'Royal Gibraltar Police', head: 'Commissioner of Police', ranks: BRIT_POLICE },
  forces: { army: 'Royal Gibraltar Regiment (British Army)', navy: null, air: null, ranks: { enlisted: BRIT_ENLISTED, officer: BRIT_OFFICERS } }, navy: false,
  courts: { top: 'Court of Appeal (Privy Council)', high: 'Supreme Court of Gibraltar', appeal: 'Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the Governor' },
  religion: { catholic: 72, mainline: 8, sunni: 4, none: 16 }, emergency: '112', retire: 65, warChance: 0,
  ruled: [['GB', 'the Crown Colony of Gibraltar', 1969, { leader: 'the Governor', fixed: true, noMovement: true }]],
  regimes: null, sovereign: [],
});

export const BM = C('BM', 'Bermuda', 'Bermudian', 'Hamilton', ['BMD', '$'], 1.7, 'caribbean', {
  languages: ['English'], pop: 64, gdp: 100000, life: 81,
  m: 'Michael David Kevin Craig Wayne Dennis Lamar Troy Marc Ewart', f: 'Patricia Debra Cheryl Lisa Michelle Andrea Renee Kim Lois Jennifer', l: 'Burch Smith Simmons Brown Outerbridge Trott Swan Gibbons Butterfield Tucker',
  cities: [['bm_hamiltonbm', 'Hamilton', '🏝️', 'Capital region', 'small', 1000, 1.9, 1.6], ['bm_stgeorgesbm', 'St. George\'s', '⛪', 'Small town', 'small', 1800, 1.8, 1.5]],
  provinceWord: 'Parish', gov: ['parliamentary', 'House of Assembly', 36, ['Progressive Labour Party', 'One Bermuda Alliance'], 'Premier', ['Senate', 11, 'Senator', false]],
  tax: { brackets: [[Infinity, 0]], vat: 0, corporate: 0, label: 'Office of the Tax Commissioner', contributions: [['Payroll tax', 0.09, null]] },
  police: { name: 'Bermuda Police Service', head: 'Commissioner of Police', ranks: BRIT_POLICE },
  forces: { army: 'Royal Bermuda Regiment', navy: null, air: null, ranks: { enlisted: BRIT_ENLISTED, officer: BRIT_OFFICERS } }, navy: false,
  religion: { mainline: 40, catholic: 15, evangelical: 25, none: 20 }, retire: 65, warChance: 0,
  ruled: [['GB', 'the Colony of Bermuda', 1968, { leader: 'the Governor', fixed: true, noMovement: true }]],
  regimes: null, sovereign: [],
});

export const KY = C('KY', 'the Cayman Islands', 'Caymanian', 'George Town', ['KYD', 'CI$'], 1.1, 'caribbean', {
  languages: ['English'], pop: 69, gdp: 70000, life: 82,
  m: 'Kurt Wayne Dwayne Alden McKeeva Roy Ezzard Truman Joey Stefan', f: 'Julianna Tara Juliana Monique Sheena Arden Ivy Leonie Gail Nicola', l: 'Ebanks Bodden McLaughlin Bush Connolly Jackson Rivers Seymour Panton Miller',
  cities: [['ky_georgetownky', 'George Town', '🏦', 'Capital region', 'small', 35000, 1.6, 1.4], ['ky_westbay', 'West Bay', '🐢', 'Small town', 'small', 15000, 1.5, 1.3]],
  provinceWord: 'District', gov: ['parliamentary', 'Parliament of the Cayman Islands', 19, ['People\'s Progressive Movement', 'Cayman Democratic Party'], 'Premier'],
  tax: { brackets: [[Infinity, 0]], vat: 0, corporate: 0, label: 'Department of Customs and Border Control' },
  police: { name: 'Royal Cayman Islands Police Service', head: 'Commissioner of Police', ranks: BRIT_POLICE },
  forces: { army: 'Cayman Islands Regiment (from 2019)', navy: 'Cayman Islands Coast Guard', air: null, ranks: { enlisted: BRIT_ENLISTED, officer: BRIT_OFFICERS } },
  religion: { evangelical: 45, mainline: 25, catholic: 10, none: 20 }, retire: 65, warChance: 0,
  ruled: [['GB', 'the Cayman Islands, a dependency of Jamaica', 1962, { leader: 'the Commissioner (under the Governor of Jamaica)', fixed: true, noMovement: true }],
    ['GB', 'the Crown Colony of the Cayman Islands', 1972, { leader: 'the Administrator', fixed: true, noMovement: true, arrive: 'Jamaica has gone its own way to independence; the Caymanians chose to stay a British colony.' }]],
  regimes: null, sovereign: [],
});

export const JE = C('JE', 'Jersey', 'Jersey', 'St Helier', ['JEP', '£'], 0.8, 'micro', {
  languages: ['English', 'Jèrriais', 'Portuguese'], pop: 103, gdp: 60000, life: 82,
  m: 'John Peter David Philip Michael Richard James Andrew Paul Ian', f: 'Mary Margaret Susan Elizabeth Anne Sarah Jane Helen Rachel Emma', l: 'Le Brocq Le Sueur Renouf Le Marquand de Gruchy Gallichan Le Cornu Vibert Le Maistre Pinel',
  cities: [['je_sthelier', 'St Helier', '🏰', 'Capital region', 'small', 35000, 1.3, 1.2], ['je_gorey', 'Gorey, St Martin', '⚓', 'Small town', 'small', 4000, 1.25, 1.15]],
  provinceWord: 'Parish', gov: ['parliamentary', 'States Assembly', 49, ['Reform Jersey', 'Jersey Liberal Conservatives'], 'Chief Minister'],
  tax: { brackets: [[Infinity, 0.2]], vat: 0.05, corporate: 0, label: 'Revenue Jersey' },
  police: { name: 'States of Jersey Police (and the honorary parish police)', head: 'Chief Officer of Police', ranks: BRIT_POLICE },
  forces: { army: 'Jersey Field Squadron (Royal Engineers reserve)', navy: null, air: null, ranks: { enlisted: BRIT_ENLISTED, officer: BRIT_OFFICERS } }, navy: false,
  courts: CROWN_COURTS('Judicial Committee of the Privy Council'), religion: { mainline: 45, catholic: 22, none: 33 }, emergency: '999', retire: 66, warChance: 0,
  ruled: occupied('Jersey'), regimes: null, sovereign: [],
});

export const GG = C('GG', 'Guernsey', 'Guernsey', 'St Peter Port', ['GGP', '£'], 0.8, 'micro', {
  languages: ['English', 'Guernésiais'], pop: 64, gdp: 55000, life: 82,
  m: 'John Peter David Philip Michael Richard James Andrew Paul Ian', f: 'Mary Margaret Susan Elizabeth Anne Sarah Jane Helen Rachel Emma', l: 'Le Page Ozanne Le Tissier Brehaut Mahy Robilliard Falla Tostevin Le Prevost De Garis',
  cities: [['gg_stpeterport', 'St Peter Port', '⛵', 'Capital region', 'small', 18000, 1.25, 1.15], ['gg_stsampson', 'St Sampson', '🏘️', 'Small town', 'small', 9000, 1.2, 1.1]],
  provinceWord: 'Parish', gov: ['parliamentary', 'States of Deliberation', 38, ['Guernsey Partnership of Independents', 'Guernsey Party'], 'President of the Policy & Resources Committee'],
  tax: { brackets: [[Infinity, 0.2]], vat: 0, corporate: 0, label: 'Revenue Service' },
  police: { name: 'Guernsey Police (States of Guernsey Police Service)', head: 'Chief Officer of Police', ranks: BRIT_POLICE },
  forces: { army: 'British Army (Guernsey recruits; the Royal Guernsey Militia until 1939)', navy: null, air: null, ranks: { enlisted: BRIT_ENLISTED, officer: BRIT_OFFICERS } }, navy: false,
  courts: CROWN_COURTS('Judicial Committee of the Privy Council'), religion: { mainline: 50, catholic: 15, none: 35 }, emergency: '999', retire: 66, warChance: 0,
  ruled: occupied('Guernsey'), regimes: null, sovereign: [],
});

export const IM = C('IM', 'the Isle of Man', 'Manx', 'Douglas', ['IMP', '£'], 0.8, 'micro', {
  languages: ['English', 'Manx Gaelic'], pop: 84, gdp: 45000, life: 82,
  m: 'John William Thomas Robert James David Peter Michael Juan Illiam', f: 'Mary Margaret Elizabeth Jane Ann Sarah Catherine Christine Aalin Breesha', l: 'Quayle Kermode Corlett Kelly Christian Callister Cregeen Quilliam Kinvig Moore',
  cities: [['im_douglasim', 'Douglas', '🐱', 'Capital region', 'small', 27000, 1.05, 0.95], ['im_ramsey', 'Ramsey', '🏍️', 'Small town', 'small', 8000, 1.0, 0.9]],
  provinceWord: 'Sheading', gov: ['parliamentary', 'Tynwald (the House of Keys)', 24, ['Manx Labour Party', 'Liberal Vannin'], 'Chief Minister', ['Legislative Council', 11, 'MLC', false]],
  tax: { allowance: 14500, brackets: [[6500, 0.1], [Infinity, 0.21]], vat: 0.2, corporate: 0, label: 'Income Tax Division' },
  police: { name: 'Isle of Man Constabulary', head: 'Chief Constable', ranks: BRIT_POLICE },
  forces: { army: 'British Army (Manx recruits)', navy: null, air: null, ranks: { enlisted: BRIT_ENLISTED, officer: BRIT_OFFICERS } }, navy: false,
  courts: { top: 'Judicial Committee of the Privy Council', high: 'High Court of Justice of the Isle of Man', appeal: 'Staff of Government Division', magistrate: 'High Bailiff', appointedBy: 'the Crown (the Lieutenant Governor)' },
  religion: { mainline: 55, catholic: 8, none: 37 }, emergency: '999', retire: 66, warChance: 0,
  regimes: null, sovereign: [],
});
