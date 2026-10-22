/**
 * African countries in the game: the Sahel and Central Africa (UN and French
 * missions), the Horn (Djibouti's bases, Somalia, the Sudans), Libya, and
 * Ghana and Morocco. Built with nation(); PPP factors World Bank 2023, rough
 * where the currency is unstable. CFA francs are pegged to the euro.
 */
import { nation } from '../Nation.js';

const FR_ENLISTED = ['Soldat de 2e classe', 'Soldat de 1re classe', 'Caporal', 'Caporal-chef', 'Sergent', 'Sergent-chef', 'Adjudant', 'Adjudant-chef', 'Major'];
const FR_OFFICERS = ['Sous-lieutenant', 'Lieutenant', 'Capitaine', 'Commandant', 'Lieutenant-colonel', 'Colonel', 'Général de brigade', 'Général de division', 'Général de corps d\'armée', 'Général d\'armée'];
const FR_POLICE = ['Élève gardien de la paix', 'Gardien de la paix', 'Brigadier', 'Brigadier-chef', 'Lieutenant de police', 'Capitaine de police', 'Commandant de police', 'Commissaire', 'Commissaire divisionnaire', 'Contrôleur général'];
/** A French-speaking Sahel or Central African state: CFA franc, civil law, gendarmerie, military rule in several. */
const francophone = (o) => ({
  languages: ['French'], emergency: '17 / 18', retire: 60, informality: 0.9, cityFare: 2, fees: 50000,
  tax: { allowance: 0, brackets: [[600000, 0], [900000, 0.1], [1500000, 0.2], [Infinity, 0.3]], contributions: [['Caisse nationale de sécurité sociale', 0.05, null]], label: 'Direction générale des impôts', vat: 0.18, corporate: 0.3 },
  pension: { name: 'CNSS pension', short: 'the CNSS', rate: 0.1 }, health: { name: 'public health centres', short: 'public health centres', coinsurance: 0.7, oopMax: 300000, wait: 10 },
  jury: false, death: 'shooting', sentence: 1,
  police: { name: `Police nationale`, local: (c) => `Commissariat central — ${c.split(',')[0]}`, academy: 'the École nationale de police', head: 'Directeur général de la Police nationale', ranks: FR_POLICE },
  fire: 'Sapeurs-pompiers / Protection civile', ems: 'SAMU / Protection civile ambulances', prosecution: 'Parquet (Procureur de la République)', prosecutor: 'Procureur général près la Cour suprême',
  courts: { top: 'Cour suprême', high: 'Tribunal de grande instance', appeal: 'Cour d\'appel', magistrate: 'Juge d\'instance', appointedBy: 'the Conseil supérieur de la magistrature' }, judgeRoute: 'career',
  immig: { work: 'Carte de séjour (travail)', pr: 'Carte de résident', natYears: 10, dual: true }, nationalFire: true,
  ...o,
});
const sahelNames = (last) => ({ male: ['Moussa', 'Mamadou', 'Ibrahim', 'Oumar', 'Abdoulaye', 'Amadou', 'Souleymane', 'Boubacar', 'Issa', 'Seydou', 'Adama', 'Hamidou'], female: ['Aminata', 'Fatoumata', 'Mariam', 'Aïcha', 'Kadiatou', 'Hawa', 'Oumou', 'Djeneba', 'Rokia', 'Salimata', 'Bintou', 'Ramatou'], last });

export const ML = nation(francophone({
  id: 'ML', name: 'Mali', flag: '🇲🇱', demonym: 'Malian', capital: 'Bamako', cur: ['XOF', 'CFA'], ppp: 210, languages: ['French', 'Bambara'],
  names: sahelNames(['Traoré', 'Coulibaly', 'Diarra', 'Keïta', 'Konaté', 'Sidibé', 'Touré', 'Diallo', 'Sangaré', 'Maïga', 'Cissé', 'Dembélé']),
  provinceWord: 'Region', provinces: [['ML-BKO', 'Bamako District', 2.8], ['ML-6', 'Tombouctou Region', 0.9], ['ML-7', 'Gao Region', 0.7], ['ML-4', 'Ségou Region', 3.0]],
  cities: [['bamako', 'Bamako', '🌍', 'Capital region', 'ML-BKO', 'large', 2800000, 0.35, 0.15], ['gao', 'Gao', '🏜️', 'Small town', 'ML-7', 'small', 90000, 0.3, 0.12], ['timbuktu', 'Timbuktu', '📜', 'Small town', 'ML-6', 'small', 55000, 0.28, 0.1], ['segou', 'Ségou', '🌾', 'Rural', 'ML-4', 'small', 140000, 0.28, 0.1]],
  gov: { system: 'military', head: 'President of the Transition', lower: ['National Transitional Council', 147], parties: ['(parties dissolved)', '(parties dissolved)'], pardon: 'the President of the Transition' },
  intel: 'Agence nationale de la sécurité d\'État', foreign: 'Ministère des Affaires étrangères', prisons: 'Direction nationale de l\'administration pénitentiaire', post: 'La Poste du Mali', centralBank: 'BCEAO', audit: 'Bureau du Vérificateur général',
  forces: { army: 'Forces armées maliennes (FAMa)', navy: null, air: 'Armée de l\'air du Mali', reserve: 'Garde nationale', academy: 'the École militaire interarmes de Koulikoro', head: 'Chef d\'état-major général des armées', ranks: { enlisted: FR_ENLISTED, officer: FR_OFFICERS }, pay: 0.2, exposure: 1, tempo: 0.8, bases: { army: [['bamako', 'Camp Soundiata Keïta, Kati'], ['gao', 'Gao camp']], airforce: [['bamako', 'Base aérienne 101, Sénou']] }, overseas: [] },
  war: [{ id: 'jihadist', name: 'the jihadist insurgency in the north and centre', adversary: 'JNIM and the Islamic State Sahel', intensity: 2, home: 0.4, weight: 60, internal: true }], warChance: 0.02,
  orders: [['', 'Ordre national du Mali (Chevalier)'], ['', 'Ordre national du Mali (Officier)'], ['', 'Ordre national du Mali (Commandeur)'], ['', 'Ordre national du Mali (Grand officier)']],
  edu: { exam: 'Baccalauréat malien', state: 'Université des sciences sociales et de gestion de Bamako', private: 'Université Kankou Moussa', elite: 'Université des sciences, des techniques et des technologies de Bamako', tvet: 'centre de formation professionnelle' },
  unions: 'Union nationale des travailleurs du Mali (UNTM)', stock: 'BRVM Composite', lender: 'Banque de développement du Mali',
  religion: { sunni: 93, catholic: 2, evangelical: 1, none: 4 },
}));

export const NE = nation(francophone({
  id: 'NE', name: 'Niger', flag: '🇳🇪', demonym: 'Nigerien', capital: 'Niamey', cur: ['XOF', 'CFA'], ppp: 210, languages: ['French', 'Hausa'],
  names: sahelNames(['Issoufou', 'Mahamadou', 'Bazoum', 'Tchiani', 'Ousmane', 'Abdou', 'Hamani', 'Seyni', 'Garba', 'Moumouni', 'Saidou', 'Tandja']),
  provinceWord: 'Region', provinces: [['NE-8', 'Niamey', 1.3], ['NE-1', 'Agadez Region', 0.6], ['NE-7', 'Zinder Region', 4.8]],
  cities: [['niamey', 'Niamey', '🌍', 'Capital region', 'NE-8', 'large', 1300000, 0.33, 0.13], ['agadez', 'Agadez', '🏜️', 'Small town', 'NE-1', 'small', 125000, 0.3, 0.12], ['zinder', 'Zinder', '🏰', 'Mid-size city', 'NE-7', 'medium', 330000, 0.28, 0.1]],
  gov: { system: 'military', head: 'President of the National Council for the Safeguard of the Homeland', lower: ['Consultative Council of the Refoundation', 179], parties: ['(parties suspended)', '(parties suspended)'] },
  intel: 'Direction générale de la documentation et de la sécurité extérieure', foreign: 'Ministère des Affaires étrangères', prisons: 'administration pénitentiaire', post: 'Niger Poste', centralBank: 'BCEAO', audit: 'Cour des comptes',
  forces: { army: 'Forces armées nigériennes', navy: null, air: 'Armée de l\'air du Niger', reserve: 'Garde nationale du Niger', academy: 'the École de formation des officiers des FAN', head: 'Chef d\'état-major des armées', ranks: { enlisted: FR_ENLISTED, officer: FR_OFFICERS }, pay: 0.2, exposure: 0.9, tempo: 0.6, bases: { army: [['niamey', 'Niamey garrison'], ['agadez', 'Agadez (former Air Base 201)']], airforce: [['niamey', 'Base aérienne 101, Niamey']] }, overseas: [] },
  war: [{ id: 'jihadist', name: 'the jihadist insurgency in the tri-border area', adversary: 'the Islamic State Sahel', intensity: 2, home: 0.3, weight: 50, internal: true }], warChance: 0.02,
  orders: [['', 'Ordre national du Niger (Chevalier)'], ['', 'Ordre national du Niger (Officier)'], ['', 'Ordre national du Niger (Commandeur)'], ['', 'Ordre national du Niger (Grand-croix)']],
  edu: { exam: 'Baccalauréat', state: 'Université Abdou Moumouni de Niamey', private: 'Université islamique au Niger', elite: 'École des mines, de l\'industrie et de la géologie', tvet: 'lycée technique' },
  unions: 'Union des syndicats des travailleurs du Niger', stock: 'BRVM Composite', lender: 'Banque agricole du Niger',
  religion: { sunni: 98, catholic: 1, none: 1 },
}));

export const TD = nation(francophone({
  id: 'TD', name: 'Chad', flag: '🇹🇩', demonym: 'Chadian', capital: 'N\'Djamena', cur: ['XAF', 'FCFA'], ppp: 220, languages: ['French', 'Arabic'],
  names: sahelNames(['Déby', 'Idriss', 'Mahamat', 'Kaka', 'Abakar', 'Hissène', 'Ngarlejy', 'Djimadoum', 'Allamine', 'Tom', 'Oumar', 'Saleh']),
  provinces: [['TD-ND', 'N\'Djamena', 1.6], ['TD-OD', 'Ouaddaï', 0.9], ['TD-BG', 'Borkou', 0.1]],
  cities: [['ndjamena', 'N\'Djamena', '🌍', 'Capital region', 'TD-ND', 'large', 1600000, 0.33, 0.12], ['abeche', 'Abéché', '🐪', 'Mid-size city', 'TD-OD', 'small', 120000, 0.28, 0.1], ['faya', 'Faya-Largeau', '🏜️', 'Rural', 'TD-BG', 'small', 15000, 0.25, 0.08]],
  gov: { system: 'presidential', head: 'President of Chad', lower: ['National Assembly', 188, 'Député'], upper: ['Senate', 69, 'Senator', false], term: 5, parties: ['Rassemblement national des démocrates tchadiens', 'Mouvement patriotique du salut (MPS)'] },
  intel: 'Agence nationale de sécurité', foreign: 'Ministère des Affaires étrangères', prisons: 'administration pénitentiaire', post: 'Société tchadienne des postes', centralBank: 'BEAC', audit: 'Cour des comptes',
  forces: { army: 'Armée nationale tchadienne', navy: null, air: 'Armée de l\'air tchadienne', reserve: 'Garde nationale et nomade', academy: 'the École militaire interarmes', head: 'Chef d\'état-major général des armées', ranks: { enlisted: FR_ENLISTED, officer: FR_OFFICERS }, pay: 0.2, exposure: 0.8, tempo: 0.6, bases: { army: [['ndjamena', 'Camp Kosseï'], ['abeche', 'Abéché garrison']], airforce: [['ndjamena', 'Base aérienne Adji Kossei']] }, overseas: [['Mali', 'UN mission (MINUSMA)']] },
  war: [{ id: 'lakeChad', name: 'fighting Boko Haram around Lake Chad', adversary: 'Boko Haram', intensity: 2, home: 0.2, weight: 40, internal: true }], warChance: 0.015,
  orders: [['', 'Ordre national du Tchad (Chevalier)'], ['', 'Ordre national du Tchad (Officier)'], ['', 'Ordre national du Tchad (Commandeur)'], ['', 'Ordre national du Tchad (Grand officier)']],
  edu: { exam: 'Baccalauréat', state: 'Université de N\'Djamena', private: 'Université HEC Tchad', elite: 'Institut national supérieur des sciences et techniques d\'Abéché', tvet: 'centre de formation technique' },
  unions: 'Union des syndicats du Tchad', stock: 'BVMAC', lender: 'Société générale Tchad',
  religion: { sunni: 55, catholic: 20, evangelical: 14, none: 11 },
}));

export const CF = nation(francophone({
  id: 'CF', name: 'Central African Republic', flag: '🇨🇫', demonym: 'Central African', capital: 'Bangui', cur: ['XAF', 'FCFA'], ppp: 250, languages: ['French', 'Sango'],
  names: { male: ['Jean', 'Faustin', 'Serge', 'Didier', 'Martin', 'Thierry', 'Patrice', 'Rodrigue', 'Ahmat', 'Ali', 'Firmin', 'Gaston'], female: ['Marie', 'Catherine', 'Sylvie', 'Brigitte', 'Odette', 'Joséphine', 'Nadège', 'Fatimé', 'Clarisse', 'Prisca', 'Huguette', 'Lucienne'], last: ['Touadéra', 'Bozizé', 'Ngouandji', 'Kolingba', 'Djotodia', 'Sarandji', 'Ndoutingaï', 'Yakété', 'Mbaïkoua', 'Gbazi', 'Ngakola', 'Dacko'] },
  provinceWord: 'Prefecture', provinces: [['CF-BGF', 'Bangui', 0.9], ['CF-OP', 'Ouham-Pendé', 0.6], ['CF-HK', 'Haute-Kotto', 0.1]],
  cities: [['bangui', 'Bangui', '🌳', 'Capital region', 'CF-BGF', 'medium', 900000, 0.3, 0.1], ['bouar', 'Bouar', '🪖', 'Small town', 'CF-OP', 'small', 40000, 0.26, 0.08], ['bria', 'Bria', '💎', 'Rural', 'CF-HK', 'small', 45000, 0.25, 0.07]],
  gov: { system: 'presidential', head: 'President of the Central African Republic', lower: ['National Assembly', 140, 'Député'], term: 5, presTerm: 7, parties: ['Union pour le renouveau centrafricain', 'Mouvement Cœurs Unis'] },
  intel: 'Office central de répression du banditisme / intelligence services', foreign: 'Ministère des Affaires étrangères', prisons: 'administration pénitentiaire', post: 'Office national des postes', centralBank: 'BEAC', audit: 'Cour des comptes',
  forces: { army: 'Forces armées centrafricaines (FACA)', navy: null, air: 'FACA air wing', reserve: 'FACA reserve', academy: 'the École spéciale des officiers', head: 'Chef d\'état-major des armées', ranks: { enlisted: FR_ENLISTED, officer: FR_OFFICERS }, pay: 0.15, exposure: 0.9, tempo: 0.6, bases: { army: [['bangui', 'Camp Kassaï'], ['bouar', 'Bouar garrison']], airforce: [['bangui', 'M\'Poko air base']] }, overseas: [] },
  war: [{ id: 'rebels', name: 'the civil conflict with armed groups', adversary: 'the CPC rebel coalition', intensity: 2, home: 0.5, weight: 60, internal: true }], warChance: 0.02,
  orders: [['', 'Ordre centrafricain du Mérite (Chevalier)'], ['', 'Ordre de la Reconnaissance centrafricaine (Officier)'], ['', 'Ordre de la Reconnaissance centrafricaine (Commandeur)'], ['', 'Ordre de la Reconnaissance centrafricaine (Grand-croix)']],
  edu: { exam: 'Baccalauréat', state: 'Université de Bangui', private: 'Université privée de Bangui', elite: 'Université de Bangui', tvet: 'lycée technique' },
  unions: 'Union syndicale des travailleurs de Centrafrique', stock: 'BVMAC', lender: 'Ecobank Centrafrique',
  religion: { catholic: 29, evangelical: 40, sunni: 15, none: 16 },
}));

export const CD = nation(francophone({
  id: 'CD', name: 'DR Congo', flag: '🇨🇩', demonym: 'Congolese', capital: 'Kinshasa', cur: ['CDF', 'FC'], ppp: 1000, languages: ['French', 'Lingala', 'Swahili'], emergency: '112',
  tax: { allowance: 0, brackets: [[1944000, 0], [20000000, 0.15], [Infinity, 0.3]], contributions: [['CNSS', 0.05, null]], label: 'Direction générale des impôts', vat: 0.16, corporate: 0.3 },
  names: { male: ['Jean', 'Joseph', 'Patrice', 'Félix', 'Moïse', 'Christian', 'Dieudonné', 'Héritier', 'Glody', 'Junior', 'Exaucé', 'Trésor'], female: ['Marie', 'Grâce', 'Esther', 'Ruth', 'Jolie', 'Divine', 'Merveille', 'Sarah', 'Rachel', 'Chancelle', 'Nathalie', 'Gloire'], last: ['Tshisekedi', 'Kabila', 'Lumumba', 'Mukwege', 'Katumbi', 'Fayulu', 'Kabeya', 'Mbuyi', 'Ilunga', 'Kasongo', 'Ngoy', 'Mutombo'] },
  provinceWord: 'Province', provinces: [['CD-KN', 'Kinshasa', 17], ['CD-NK', 'North Kivu', 8.9], ['CD-HK', 'Haut-Katanga', 5.0], ['CD-IT', 'Ituri', 6.0]],
  cities: [['kinshasa', 'Kinshasa', '🌍', 'Capital region', 'CD-KN', 'mega', 17000000, 0.4, 0.15], ['goma', 'Goma', '🌋', 'Mid-size city', 'CD-NK', 'medium', 700000, 0.35, 0.12], ['lubumbashi', 'Lubumbashi', '⛏️', 'Major metro', 'CD-HK', 'large', 2600000, 0.38, 0.15], ['bunia', 'Bunia', '🌳', 'Small town', 'CD-IT', 'small', 900000, 0.3, 0.1]],
  gov: { system: 'semi', head: 'President of the DRC', lower: ['National Assembly', 500, 'Député national'], upper: ['Senate', 109, 'Senator', false], local: ['Provincial Governor', 'Provincial Assembly'], term: 5, parties: ['Ensemble pour la République', 'Union pour la démocratie et le progrès social (UDPS)'] },
  police: { name: 'Police nationale congolaise (PNC)', local: (c) => `PNC — ${c.split(',')[0]}`, academy: 'the École de formation de la PNC', head: 'Commissaire général de la PNC', ranks: FR_POLICE },
  intel: 'Agence nationale de renseignements (ANR)', foreign: 'Ministère des Affaires étrangères', prisons: 'administration pénitentiaire', post: 'Société congolaise des postes', centralBank: 'Banque centrale du Congo', audit: 'Cour des comptes', parks: 'Institut congolais pour la conservation de la nature (ICCN)',
  forces: { army: 'Forces armées de la RDC (FARDC)', navy: 'Marine nationale congolaise', air: 'Force aérienne congolaise', reserve: 'Volunteers for the Defence of the Homeland (VDP)', academy: 'the Académie militaire de Kananga', head: 'Chef d\'état-major général', ranks: { enlisted: FR_ENLISTED, officer: FR_OFFICERS }, pay: 0.15, exposure: 0.9, tempo: 0.7, bases: { army: [['kinshasa', 'Camp Kokolo'], ['goma', 'Goma (3rd defence zone)'], ['bunia', 'Bunia garrison']], navy: [['kinshasa', 'Kinshasa river base']], airforce: [['kinshasa', 'N\'Djili air base']] }, overseas: [] },
  war: [{ id: 'east', name: 'the war in the eastern Congo', adversary: 'the M23 rebels', intensity: 3, home: 0.3, weight: 70, internal: true }], warChance: 0.02,
  orders: [['', 'Ordre national des Héros nationaux Kabila-Lumumba (Chevalier)'], ['', 'Ordre national (Officier)'], ['', 'Ordre national (Commandeur)'], ['', 'Ordre national (Grand cordon)']],
  edu: { exam: 'Examen d\'État', state: 'Université de Kinshasa', private: 'Université protestante au Congo', elite: 'Université de Lubumbashi', tvet: 'institut supérieur technique' },
  unions: 'Union nationale des travailleurs du Congo', stock: 'no stock exchange', lender: 'Rawbank',
  religion: { catholic: 29, evangelical: 27, pentecostal: 20, sunni: 2, none: 22 },
}));

export const DJ = nation(francophone({
  id: 'DJ', name: 'Djibouti', flag: '🇩🇯', demonym: 'Djiboutian', capital: 'Djibouti', cur: ['DJF', 'Fdj'], ppp: 95, languages: ['French', 'Arabic', 'Somali'], informality: 0.6, redCrescent: true,
  names: { male: ['Ismaïl', 'Omar', 'Mohamed', 'Hassan', 'Abdourahman', 'Ahmed', 'Ali', 'Daher', 'Moussa', 'Houssein', 'Aden', 'Guelleh'], female: ['Fatouma', 'Hodan', 'Amina', 'Kadra', 'Safia', 'Hibo', 'Asma', 'Deka', 'Ifrah', 'Khadija', 'Saïda', 'Zahra'], last: ['Guelleh', 'Ahmed', 'Omar', 'Hassan', 'Ali', 'Abdi', 'Farah', 'Houmed', 'Daoud', 'Robleh', 'Waberi', 'Doualeh'] },
  provinceWord: 'Region', provinces: [['DJ-DJ', 'Djibouti City', 0.62], ['DJ-AR', 'Arta Region', 0.04]],
  cities: [['djibouti', 'Djibouti', '⚓', 'Capital region', 'DJ-DJ', 'medium', 620000, 0.55, 0.35], ['arta', 'Arta', '⛰️', 'Rural', 'DJ-AR', 'small', 13000, 0.45, 0.28]],
  gov: { system: 'presidential', head: 'President of Djibouti', lower: ['National Assembly', 65, 'Député'], term: 5, parties: ['opposition coalition', 'Union pour la majorité présidentielle'] },
  intel: 'Service de documentation et de sécurité', foreign: 'Ministère des Affaires étrangères', prisons: 'administration pénitentiaire', post: 'La Poste de Djibouti', centralBank: 'Banque centrale de Djibouti', audit: 'Cour des comptes',
  forces: { army: 'Forces armées djiboutiennes', navy: 'Marine nationale djiboutienne', air: 'Force aérienne djiboutienne', reserve: 'Garde républicaine', academy: 'the Académie militaire d\'Arta', head: 'Chef d\'état-major général des armées', ranks: { enlisted: FR_ENLISTED, officer: FR_OFFICERS }, pay: 0.3, bases: { army: [['djibouti', 'Camp Lemonnier area'], ['arta', 'Arta training centre']], navy: [['djibouti', 'Djibouti naval base']], airforce: [['djibouti', 'Ambouli air base']] }, overseas: [['Somalia', 'African Union mission (AUSSOM)']] },
  orders: [['', 'Ordre national du 27 juin (Chevalier)'], ['', 'Ordre national (Officier)'], ['', 'Ordre national (Commandeur)'], ['', 'Ordre national (Grand officier)']],
  edu: { exam: 'Baccalauréat', state: 'Université de Djibouti', private: 'Université de Djibouti', elite: 'Université de Djibouti', tvet: 'lycée industriel et commercial' },
  unions: 'Union djiboutienne du travail', stock: 'no stock exchange', lender: 'BCIMR',
  religion: { sunni: 94, catholic: 4, none: 2 },
}));

const somaliNames = { male: ['Mohamed', 'Abdi', 'Ahmed', 'Hassan', 'Ali', 'Omar', 'Abdullahi', 'Yusuf', 'Farah', 'Ismail', 'Mahad', 'Liban'], female: ['Fadumo', 'Hodan', 'Amina', 'Sahra', 'Ifrah', 'Hawa', 'Asha', 'Ubah', 'Khadra', 'Faiza', 'Ayan', 'Halima'], last: ['Mohamed', 'Hassan', 'Abdi', 'Ali', 'Ahmed', 'Farah', 'Warsame', 'Jama', 'Osman', 'Hussein', 'Aden', 'Yusuf'] };

export const SO = nation({
  id: 'SO', name: 'Somalia', flag: '🇸🇴', demonym: 'Somali', capital: 'Mogadishu', cur: ['USD', 'US$'], ppp: 0.5, languages: ['Somali', 'Arabic'], emergency: '888', retire: 60, informality: 0.9, cityFare: 1, redCrescent: true, death: 'shooting',
  tax: { allowance: 0, brackets: [[2400, 0], [Infinity, 0.12]], contributions: [], label: 'Ministry of Finance (Inland Revenue)', vat: 0.05, corporate: 0.1 },
  pension: { name: 'civil service pension', short: 'the pension fund', rate: 0.05 }, health: { name: 'public and NGO clinics', short: 'clinics', coinsurance: 0.8, oopMax: 600, wait: 12 },
  names: somaliNames, provinceWord: 'State', provinces: [['SO-BN', 'Banaadir', 2.6], ['SO-JH', 'Jubaland', 1.0], ['SO-PL', 'Puntland', 1.5]],
  cities: [['mogadishu', 'Mogadishu', '🌊', 'Capital region', 'SO-BN', 'large', 2600000, 0.35, 0.12], ['kismayo', 'Kismayo', '⚓', 'Coastal metro', 'SO-JH', 'small', 180000, 0.3, 0.1], ['bosaso', 'Bosaso', '🚢', 'Coastal metro', 'SO-PL', 'small', 400000, 0.3, 0.1], ['baledogle', 'Baledogle, Lower Shabelle', '✈️', 'Rural', 'SO-BN', 'small', 5000, 0.25, 0.08]],
  gov: { system: 'parliamentary', head: 'Prime Minister', lower: ['House of the People', 275, 'Member of the House of the People'], upper: ['Upper House', 54, 'Senator', false], local: ['State President', 'State Assembly'], term: 4, parties: ['Forum for National Parties', 'Justice and Solidarity Party'], pardon: 'the President of Somalia' },
  police: { name: 'Somali Police Force', local: (c) => `Somali Police Force — ${c.split(',')[0]} division`, academy: 'the General Kahiye Police Academy', head: 'Commissioner of the Somali Police Force' },
  prosecution: 'Attorney General\'s Office', intel: 'National Intelligence and Security Agency (NISA)', foreign: 'Ministry of Foreign Affairs', prisons: 'Somali Custodial Corps', post: 'Somali Post', centralBank: 'Central Bank of Somalia', nationalFire: true, civilDefence: 'Banadir fire brigade',
  forces: { army: 'Somali National Army', navy: 'Somali Navy', air: 'Somali Air Force', reserve: 'Macawisley (clan militias)', academy: 'the Somali military academy', head: 'Chief of Defence Forces', pay: 0.1, exposure: 1, tempo: 0.9, bases: { army: [['mogadishu', 'General Dhagabadan Training Centre'], ['baledogle', 'Baledogle airfield']], navy: [['mogadishu', 'Mogadishu port']], airforce: [['mogadishu', 'Aden Adde airport']] }, overseas: [], sof: ['Danab ("Lightning") Advanced Infantry Brigade', 'the Danab course', 'Danab Brigade, Baledogle', 'Danab badge', 'Raids against al-Shabaab.'] },
  war: [{ id: 'shabaab', name: 'the war against al-Shabaab', adversary: 'al-Shabaab', intensity: 3, home: 0.6, weight: 100, internal: true }], warChance: 0.02,
  orders: [['', 'Medal of Merit'], ['', 'Order of the Somali Star (Knight)'], ['', 'Order of the Somali Star (Commander)'], ['', 'Order of the Somali Star (Grand Officer)']],
  courts: { top: 'Supreme Court of Somalia', high: 'Regional Court', appeal: 'Court of Appeal', magistrate: 'District Court judge', appointedBy: 'the Judicial Service Commission' },
  edu: { exam: 'national secondary examination', state: 'Somali National University', private: 'SIMAD University', elite: 'Mogadishu University', tvet: 'vocational centre' },
  immig: { work: 'Work permit', pr: 'Residence permit', natYears: 7, dual: true, asylum: false }, unions: 'Federation of Somali Trade Unions', stock: 'no stock exchange', lender: 'Premier Bank', fees: 600,
  religion: { sunni: 99, none: 1 },
});

export const SS = nation({
  id: 'SS', name: 'South Sudan', flag: '🇸🇸', demonym: 'South Sudanese', capital: 'Juba', cur: ['SSP', 'SSP'], ppp: 350, languages: ['English', 'Arabic'], emergency: '777', retire: 65, informality: 0.9, cityFare: 2, death: 'hanging',
  tax: { allowance: 0, brackets: [[Infinity, 0.15]], contributions: [['National Social Insurance Fund', 0.08, null]], label: 'National Revenue Authority', vat: 0.18, corporate: 0.3 },
  pension: { name: 'National Social Insurance Fund pension', short: 'the NSIF', rate: 0.17 }, health: { name: 'public and NGO clinics', short: 'clinics', coinsurance: 0.8, oopMax: 350 * 1200, wait: 12 },
  names: { male: ['John', 'James', 'Peter', 'Garang', 'Deng', 'Machar', 'Kiir', 'Akol', 'Lual', 'Majok', 'Manyang', 'Wani'], female: ['Mary', 'Rebecca', 'Nyandeng', 'Achol', 'Ayen', 'Nyakuoth', 'Akuol', 'Abuk', 'Agum', 'Nyibol', 'Elizabeth', 'Sarah'], last: ['Garang', 'Deng', 'Machar', 'Mayardit', 'Akol', 'Lual', 'Kuol', 'Majok', 'Malual', 'Nyuon', 'Wani', 'Lado'] },
  provinceWord: 'State', provinces: [['SS-EC', 'Central Equatoria', 1.1], ['SS-JG', 'Jonglei', 1.6], ['SS-UY', 'Unity', 0.9]],
  cities: [['juba', 'Juba', '🌍', 'Capital region', 'SS-EC', 'medium', 525000, 0.45, 0.12], ['bor', 'Bor', '🐄', 'Small town', 'SS-JG', 'small', 315000, 0.35, 0.08], ['bentiu', 'Bentiu', '🛢️', 'Rural', 'SS-UY', 'small', 110000, 0.33, 0.07]],
  gov: { system: 'presidential', head: 'President of South Sudan', lower: ['Transitional National Legislative Assembly', 550, 'Member of the Assembly'], upper: ['Council of States', 100, 'Member of the Council of States', false], term: 5, parties: ['SPLM-IO', 'Sudan People\'s Liberation Movement (SPLM)'] },
  police: { name: 'South Sudan National Police Service', local: (c) => `SSNPS — ${c.split(',')[0]}`, academy: 'the Rajaf Police Training Centre', head: 'Inspector General of Police' },
  prosecution: 'Ministry of Justice (public prosecution)', intel: 'National Security Service', foreign: 'Ministry of Foreign Affairs and International Cooperation', prisons: 'National Prisons Service', post: 'South Sudan Post', centralBank: 'Bank of South Sudan', nationalFire: true, civilDefence: 'Civil Defence Service',
  forces: { army: 'South Sudan People\'s Defence Forces (SSPDF)', navy: null, air: 'SSPDF Air Force', reserve: 'SSPDF reserve', academy: 'the SSPDF Military Academy', head: 'Chief of Defence Forces', pay: 0.1, exposure: 0.9, tempo: 0.6, bases: { army: [['juba', 'Bilpam general headquarters'], ['bor', 'Bor garrison']], airforce: [['juba', 'Juba air base']] }, overseas: [] },
  war: [{ id: 'conflict', name: 'renewed fighting between government and opposition forces', adversary: 'SPLA-IO and armed groups', intensity: 2, home: 0.5, weight: 60, internal: true }], warChance: 0.02,
  orders: [['', 'Order of Merit'], ['', 'Order of the Republic'], ['', 'Order of Bravery'], ['', 'Order of the Grand Star']],
  courts: { top: 'Supreme Court of South Sudan', high: 'High Court', appeal: 'Court of Appeal', magistrate: 'County Court judge', appointedBy: 'the President, on the Judicial Service Council\'s recommendation' },
  edu: { exam: 'South Sudan Certificate of Secondary Education', state: 'University of Juba', private: 'Catholic University of South Sudan', elite: 'University of Juba', tvet: 'vocational training centre' },
  immig: { work: 'Work permit', pr: 'Residence permit', natYears: 10, dual: true }, unions: 'Workers Trade Union Federation', stock: 'no stock exchange', lender: 'Ivory Bank', fees: 350 * 300,
  religion: { catholic: 38, evangelical: 22, pentecostal: 10, sunni: 6, none: 24 },
});

export const SD = nation({
  id: 'SD', name: 'Sudan', flag: '🇸🇩', demonym: 'Sudanese', capital: 'Port Sudan (wartime)', cur: ['SDG', 'ج.س'], ppp: 300, languages: ['Arabic', 'English'], emergency: '999', retire: 60, informality: 0.85, cityFare: 2, redCrescent: true, death: 'hanging',
  tax: { allowance: 0, brackets: [[Infinity, 0.15]], contributions: [['National Social Insurance Fund', 0.08, null]], label: 'Taxation Chamber', vat: 0.17, corporate: 0.3 },
  pension: { name: 'National Pension Fund pension', short: 'the pension fund', rate: 0.17 }, health: { name: 'public hospitals (largely destroyed)', short: 'public hospitals', coinsurance: 0.8, oopMax: 300 * 1500, wait: 12 },
  names: { male: ['Mohamed', 'Ahmed', 'Osman', 'Abdelrahman', 'Hamdan', 'Abdalla', 'Khalid', 'Mustafa', 'Yasir', 'Hassan', 'Elfatih', 'Babiker'], female: ['Fatima', 'Amna', 'Hiba', 'Rania', 'Sara', 'Nahid', 'Alaa', 'Mawada', 'Tasneem', 'Hanan', 'Sumaya', 'Ikhlas'], last: ['Abdelrahman', 'Elbashir', 'Burhan', 'Dagalo', 'Hamdok', 'Mohamed', 'Osman', 'Ali', 'Abbas', 'Elmahdi', 'Taha', 'Nimeiri'] },
  provinceWord: 'State', provinces: [['SD-RS', 'Red Sea State', 1.5], ['SD-KH', 'Khartoum State', 6.0], ['SD-DN', 'North Darfur', 2.0]],
  cities: [['portsudan', 'Port Sudan', '⚓', 'Coastal metro', 'SD-RS', 'medium', 500000, 0.35, 0.12], ['khartoum', 'Khartoum', '🌍', 'Capital region', 'SD-KH', 'large', 6000000, 0.3, 0.1], ['elfasher', 'El Fasher', '🏜️', 'Small town', 'SD-DN', 'small', 260000, 0.25, 0.08]],
  gov: { system: 'military', head: 'Chairman of the Transitional Sovereignty Council', lower: ['Transitional Legislative Council (unformed)', 300], parties: ['(wartime)', '(wartime)'] },
  police: { name: 'Sudan Police Force', local: (c) => `${c.split(',')[0]} State Police`, academy: 'the Police Academy', head: 'Director General of the Police' },
  prosecution: 'Public Prosecution', intel: 'General Intelligence Service', foreign: 'Ministry of Foreign Affairs', prisons: 'Prisons and Reform Directorate', post: 'Sudapost', centralBank: 'Central Bank of Sudan', nationalFire: true, civilDefence: 'Civil Defence',
  forces: { army: 'Sudanese Armed Forces', navy: 'Sudanese Navy', air: 'Sudanese Air Force', reserve: 'Popular Defence Forces', academy: 'the Sudan Military College', head: 'Commander-in-Chief', pay: 0.1, exposure: 1, tempo: 1, bases: { army: [['portsudan', 'Port Sudan garrison'], ['elfasher', 'El Fasher (6th Infantry Division)']], navy: [['portsudan', 'Flamingo naval base']], airforce: [['portsudan', 'Port Sudan air base']] }, overseas: [] },
  war: [{ id: 'rsf', name: 'the civil war with the Rapid Support Forces', adversary: 'the RSF', intensity: 4, home: 0.8, weight: 100, internal: true }], warChance: 0.03,
  orders: [['', 'Order of Merit'], ['', 'Order of the Two Niles (3rd class)'], ['', 'Order of the Two Niles (1st class)'], ['', 'Order of the Republic']],
  courts: { top: 'Supreme Court of Sudan', high: 'General Court', appeal: 'Court of Appeal', magistrate: 'District judge', appointedBy: 'the Supreme Judicial Council' },
  edu: { exam: 'Sudan School Certificate', state: 'University of Khartoum', private: 'Ahfad University for Women', elite: 'Sudan University of Science and Technology', tvet: 'technical college' },
  immig: { work: 'Work permit', pr: 'Residence permit', natYears: 10, dual: true, asylum: false }, unions: 'Sudan Workers Trade Unions Federation', stock: 'Khartoum Stock Exchange', lender: 'Bank of Khartoum', fees: 300 * 300,
  religion: { sunni: 91, catholic: 3, evangelical: 3, none: 3 },
});

export const LY = nation({
  id: 'LY', name: 'Libya', flag: '🇱🇾', demonym: 'Libyan', capital: 'Tripoli', cur: ['LYD', 'ل.د'], ppp: 1.5, languages: ['Arabic'], emergency: '1515', retire: 65, informality: 0.4, cityFare: 2, redCrescent: true, death: 'shooting',
  tax: { allowance: 1800, brackets: [[12000, 0.05], [Infinity, 0.1]], contributions: [['Social Security Fund', 0.0375, null]], label: 'Tax Department', vat: 0, corporate: 0.2 },
  pension: { name: 'Social Security Fund pension', short: 'the Social Security Fund', rate: 0.14 }, health: { name: 'public hospitals', short: 'public hospitals', coinsurance: 0.4, oopMax: 3000, wait: 8 },
  names: { male: ['Mohammed', 'Ahmed', 'Ali', 'Abdulhamid', 'Khalifa', 'Fathi', 'Salem', 'Mustafa', 'Faraj', 'Omar', 'Abdullah', 'Nouri'], female: ['Fatima', 'Aisha', 'Salma', 'Najla', 'Khadija', 'Asma', 'Amal', 'Hana', 'Huda', 'Rabia', 'Mabruka', 'Zainab'], last: ['Dbeibah', 'Haftar', 'Al-Senussi', 'Bashagha', 'Al-Mishri', 'Zeidan', 'Jibril', 'Al-Megarief', 'Abushagur', 'Al-Kabir', 'Belhaj', 'Al-Obeidi'] },
  provinceWord: 'District', provinces: [['LY-TB', 'Tripoli District', 1.2], ['LY-BA', 'Benghazi District', 0.8], ['LY-MI', 'Misrata District', 0.55]],
  cities: [['tripoli', 'Tripoli', '🏛️', 'Capital region', 'LY-TB', 'large', 1200000, 0.55, 0.35], ['benghazi', 'Benghazi', '⚓', 'Coastal metro', 'LY-BA', 'medium', 800000, 0.5, 0.32], ['misrata', 'Misrata', '🏭', 'Coastal metro', 'LY-MI', 'medium', 400000, 0.5, 0.32]],
  gov: { system: 'military', head: 'Prime Minister of the Government of National Unity', lower: ['House of Representatives', 200], upper: ['High Council of State', 145, 'Member of the High Council of State', false], parties: ['(elections postponed)', '(elections postponed)'], pardon: 'the Presidential Council' },
  police: { name: 'Libyan police (Ministry of Interior)', local: (c) => `${c.split(',')[0]} Security Directorate`, academy: 'the Police Academy', head: 'Minister of the Interior' },
  prosecution: 'Attorney General\'s Office', intel: 'Libyan Intelligence Service', foreign: 'Ministry of Foreign Affairs', prisons: 'Judicial Police (prisons)', post: 'Libya Post', centralBank: 'Central Bank of Libya', audit: 'Audit Bureau', nationalFire: true, civilDefence: 'Civil Defence',
  forces: { army: 'Libyan Army', navy: 'Libyan Navy', air: 'Libyan Air Force', reserve: 'aligned armed groups', academy: 'the Libyan Military Academy', head: 'Chief of the General Staff', pay: 0.4, exposure: 0.8, tempo: 0.5, bases: { army: [['tripoli', 'Tripoli garrison'], ['benghazi', 'Benghazi (Libyan National Army)']], navy: [['tripoli', 'Abu Sitta naval base']], airforce: [['misrata', 'Misrata air base']] }, overseas: [] },
  war: [{ id: 'east-west', name: 'the struggle between the rival governments', adversary: 'rival armed factions', intensity: 2, home: 0.4, weight: 50, internal: true }], warChance: 0.015,
  orders: [['', 'Medal of Merit'], ['', 'Order of Courage'], ['', 'Order of the Republic'], ['', 'Order of Independence']],
  courts: { top: 'Supreme Court of Libya', high: 'Court of First Instance', appeal: 'Court of Appeal', magistrate: 'Summary court judge', appointedBy: 'the Supreme Judicial Council' },
  edu: { exam: 'secondary education certificate', state: 'University of Tripoli', private: 'Libyan International Medical University', elite: 'University of Benghazi', tvet: 'higher technical institute' },
  immig: { work: 'Work visa', pr: 'Residence permit', natYears: 10, dual: false, asylum: false }, unions: 'General National Union of Workers', stock: 'Libyan Stock Market', lender: 'Jumhouria Bank', fees: 0,
  religion: { sunni: 97, catholic: 1, none: 2 },
});

export const GH = nation({
  id: 'GH', name: 'Ghana', flag: '🇬🇭', demonym: 'Ghanaian', capital: 'Accra', cur: ['GHS', 'GH₵'], ppp: 5.5, languages: ['English', 'Twi'], emergency: '112', retire: 60, informality: 0.8, cityFare: 3,
  tax: { allowance: 5880, brackets: [[1320, 0.05], [1560, 0.1], [38000, 0.175], [192000, 0.25], [366240, 0.3], [Infinity, 0.35]], contributions: [['SSNIT', 0.055, null]], label: 'Ghana Revenue Authority', vat: 0.15, corporate: 0.25 },
  pension: { name: 'SSNIT pension', short: 'SSNIT', rate: 0.135 }, health: { name: 'the National Health Insurance Scheme (NHIS)', short: 'the NHIS', coinsurance: 0.3, oopMax: 8000, wait: 6 },
  names: { male: ['Kwame', 'Kofi', 'Kwaku', 'Yaw', 'Kojo', 'Kwabena', 'Kwesi', 'Nana', 'Emmanuel', 'Isaac', 'Samuel', 'Daniel'], female: ['Ama', 'Akosua', 'Abena', 'Adwoa', 'Afia', 'Akua', 'Yaa', 'Efua', 'Esi', 'Gifty', 'Comfort', 'Patience'], last: ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Osei', 'Agyeman', 'Addo', 'Appiah', 'Darko', 'Ofori', 'Amoah', 'Quaye'] },
  provinceWord: 'Region', provinces: [['GH-AA', 'Greater Accra', 5.5], ['GH-AH', 'Ashanti', 5.4], ['GH-NP', 'Northern', 2.3]],
  cities: [['accra', 'Accra', '🌍', 'Capital region', 'GH-AA', 'large', 2600000, 0.5, 0.25], ['kumasi', 'Kumasi', '👑', 'Major metro', 'GH-AH', 'large', 3500000, 0.45, 0.22], ['tamale', 'Tamale', '🌾', 'Mid-size city', 'GH-NP', 'medium', 370000, 0.4, 0.18], ['tema', 'Tema', '⚓', 'Coastal metro', 'GH-AA', 'medium', 400000, 0.48, 0.24]],
  gov: { system: 'presidential', head: 'President of Ghana', lower: ['Parliament of Ghana', 276, 'Member of Parliament'], term: 4, parties: ['National Democratic Congress (NDC)', 'New Patriotic Party (NPP)'] },
  police: { name: 'Ghana Police Service', local: (c) => `Ghana Police Service — ${c.split(',')[0]} Regional Command`, academy: 'the National Police Training School', head: 'Inspector-General of Police', ranks: ['Recruit', 'Constable', 'Lance Corporal', 'Corporal', 'Sergeant', 'Inspector', 'Assistant Superintendent', 'Superintendent', 'Chief Superintendent', 'Deputy Commissioner'] },
  fire: 'Ghana National Fire Service', ems: 'National Ambulance Service', prosecution: 'Office of the Attorney-General (prosecutions)', prosecutor: 'Director of Public Prosecutions', intel: 'National Intelligence Bureau', foreign: 'Ministry of Foreign Affairs and Regional Integration', prisons: 'Ghana Prisons Service', border: 'Ghana Immigration Service', post: 'Ghana Post', pensionAgency: 'SSNIT', centralBank: 'Bank of Ghana', audit: 'Ghana Audit Service', nationalFire: true, jury: true,
  forces: { army: 'Ghana Army', navy: 'Ghana Navy', air: 'Ghana Air Force', reserve: 'Ghana Army Reserve', academy: 'the Ghana Military Academy, Teshie', head: 'Chief of the Defence Staff', ranks: { enlisted: ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Warrant Officer II', 'Warrant Officer I', 'Regimental Sergeant Major', 'Chief Warrant Officer'], officer: ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'] }, bases: { army: [['accra', 'Burma Camp'], ['tamale', 'Tamale garrison']], navy: [['tema', 'Tema naval base']], airforce: [['accra', 'Air Force Base Accra']] }, overseas: [['Lebanon', 'UN mission (UNIFIL)'], ['South Sudan', 'UN mission (UNMISS)'], ['DR Congo', 'UN mission (MONUSCO)']] },
  orders: [['MOV', 'Order of the Volta (Member)'], ['OV', 'Order of the Volta (Officer)'], ['CV', 'Order of the Volta (Companion)'], ['', 'Order of the Star of Ghana (Companion)']],
  courts: { top: 'Supreme Court of Ghana', high: 'High Court', appeal: 'Court of Appeal', magistrate: 'District Magistrate', appointedBy: 'the President, on the Judicial Council\'s advice' },
  edu: { exam: 'WASSCE', state: 'University of Ghana', private: 'Ashesi University', elite: 'Kwame Nkrumah University of Science and Technology', tvet: 'technical university' },
  immig: { work: 'Work and residence permit (GIS)', pr: 'Indefinite residence', natYears: 7, dual: true }, unions: 'Ghana Trades Union Congress', stock: 'GSE Composite Index', lender: 'GCB Bank', fees: 2500, nationalService: 'National Service Scheme (a year after university)',
  religion: { pentecostal: 31, evangelical: 18, catholic: 10, mainline: 12, sunni: 20, none: 9 },
  farm: { price: 2500, unit: 'acre', plots: [2, 5, 10, 25, 50], prod: 0.4, grass: 0.8, drought: 1.2, flood: 1.1, crops: ['corn', 'rice', 'vegetables', 'orchard', 'pasture'] },
});

export const MA = nation({
  id: 'MA', name: 'Morocco', flag: '🇲🇦', demonym: 'Moroccan', capital: 'Rabat', cur: ['MAD', 'DH'], ppp: 4.3, languages: ['Arabic', 'Berber', 'French'], emergency: '19 / 15 / 177', retire: 63, informality: 0.6, cityFare: 4, redCrescent: true, death: 'hanging',
  tax: { allowance: 40000, brackets: [[20000, 0.1], [20000, 0.2], [20000, 0.3], [80000, 0.34], [Infinity, 0.37]], contributions: [['CNSS', 0.0448, 72000], ['AMO health insurance', 0.0226, null]], label: 'Direction générale des impôts', vat: 0.2, corporate: 0.31 },
  pension: { name: 'CNSS pension', short: 'the CNSS', rate: 0.1344, cap: 72000 }, health: { name: 'AMO compulsory health insurance', short: 'AMO', coinsurance: 0.3, oopMax: 12000, wait: 6 },
  names: { male: ['Mohamed', 'Youssef', 'Amine', 'Hamza', 'Mehdi', 'Omar', 'Rachid', 'Karim', 'Adil', 'Said', 'Anas', 'Ayoub'], female: ['Fatima', 'Khadija', 'Salma', 'Meryem', 'Imane', 'Hajar', 'Sara', 'Nadia', 'Leila', 'Zineb', 'Houda', 'Samira'], last: ['Alaoui', 'Bennani', 'El Idrissi', 'Tazi', 'Benjelloun', 'Chraibi', 'Berrada', 'El Amrani', 'Fassi', 'Lahlou', 'Ouazzani', 'Ziani'] },
  provinceWord: 'Region', provinces: [['MA-04', 'Rabat-Salé-Kénitra', 5.1], ['MA-06', 'Casablanca-Settat', 7.7], ['MA-07', 'Marrakesh-Safi', 4.9], ['MA-01', 'Tanger-Tétouan-Al Hoceïma', 3.9]],
  cities: [['rabat', 'Rabat', '🏛️', 'Capital region', 'MA-04', 'medium', 580000, 0.5, 0.3], ['casablanca', 'Casablanca', '⚓', 'Coastal metro', 'MA-06', 'large', 3800000, 0.52, 0.32], ['marrakesh', 'Marrakesh', '🌴', 'Major metro', 'MA-07', 'large', 1000000, 0.48, 0.28], ['tangier', 'Tangier', '🚢', 'Coastal metro', 'MA-01', 'large', 950000, 0.48, 0.3], ['ouarzazate', 'Ouarzazate', '🏜️', 'Rural', 'MA-07', 'small', 70000, 0.38, 0.2]],
  gov: { system: 'monarchy', head: 'Head of Government', lower: ['House of Representatives', 395, 'Member of the House of Representatives'], upper: ['House of Councillors', 120, 'Councillor', false], term: 5, parties: ['Justice and Development Party (PJD)', 'National Rally of Independents (RNI)'], pardon: 'the King' },
  police: { name: 'Sûreté nationale (DGSN)', local: (c) => `Préfecture de police de ${c.split(',')[0]}`, academy: 'the Institut royal de police, Kénitra', head: 'Director General of National Security', ranks: ['Élève gardien', 'Gardien de la paix', 'Brigadier', 'Brigadier-chef', 'Officier de police', 'Officier principal', 'Commissaire de police', 'Commissaire principal', 'Commissaire divisionnaire', 'Contrôleur général'] },
  fire: 'Protection civile', ems: 'Protection civile ambulances / SAMU', prosecution: 'Ministère public (Présidence du ministère public)', prosecutor: 'Prosecutor General of the King', intel: 'Direction générale des études et de la documentation (DGED)', foreign: 'Ministry of Foreign Affairs', prisons: 'Délégation générale à l\'administration pénitentiaire', post: 'Barid Al-Maghrib', pensionAgency: 'CNSS', centralBank: 'Bank Al-Maghrib', audit: 'Cour des comptes', nationalFire: true, civilDefence: 'Protection civile',
  forces: { army: 'Royal Moroccan Army', navy: 'Royal Moroccan Navy', air: 'Royal Moroccan Air Force', reserve: 'Royal Moroccan Gendarmerie', academy: 'the Royal Military Academy, Meknes', head: 'Inspector General of the Royal Armed Forces', ranks: { enlisted: FR_ENLISTED, officer: FR_OFFICERS }, conscription: { kind: 'lottery', age: 19, months: 12, share: 0.05, branch: 'army', genders: ['male', 'female'], name: 'Service militaire obligatoire', text: 'Morocco brought back a year of military service in 2019 for 19- to 25-year-olds, called up in small cohorts.' }, bases: { army: [['rabat', 'Rabat garrison'], ['ouarzazate', 'Southern Zone command']], navy: [['casablanca', 'Casablanca naval base']], airforce: [['rabat', 'Sidi Slimane air base']] }, overseas: [['Central African Republic', 'UN mission (MINUSCA)'], ['DR Congo', 'UN mission (MONUSCO)']] },
  orders: [['', 'Order of the Throne (Knight)'], ['', 'Order of the Throne (Officer)'], ['', 'Order of the Throne (Commander)'], ['', 'Order of the Throne (Grand Cordon)'], ['', 'Order of Muhammad']],
  courts: { top: 'Court of Cassation', high: 'Court of First Instance', appeal: 'Court of Appeal', magistrate: 'Juge de proximité', appointedBy: 'the King, on the Supreme Council of the Judicial Power\'s proposal' }, judgeRoute: 'career',
  edu: { exam: 'Baccalauréat marocain', state: 'Mohammed V University', private: 'Al Akhawayn University', elite: 'Mohammed VI Polytechnic University', tvet: 'OFPPT institute' },
  immig: { work: 'Work contract (ANAPEC) and residence card', pr: 'Ten-year residence card', natYears: 5, dual: true }, unions: 'Union marocaine du travail (UMT)', stock: 'MASI', lender: 'Attijariwafa Bank', fees: 0,
  religion: { sunni: 99, catholic: 0.5, none: 0.5 },
});

/** West and southern African countries named by ECOWAS and SADC missions, the French forces and the Peace Corps. */
export const SN = nation(francophone({
  id: 'SN', name: 'Senegal', flag: '🇸🇳', demonym: 'Senegalese', capital: 'Dakar', cur: ['XOF', 'CFA'], ppp: 230, languages: ['French', 'Wolof'], informality: 0.85, death: null,
  names: { male: ['Mamadou', 'Moussa', 'Ousmane', 'Cheikh', 'Abdoulaye', 'Ibrahima', 'Modou', 'Pape', 'Serigne', 'Babacar', 'Lamine', 'Alioune'], female: ['Fatou', 'Aminata', 'Awa', 'Mariama', 'Khady', 'Ndeye', 'Aïssatou', 'Coumba', 'Astou', 'Bineta', 'Sokhna', 'Rokhaya'], last: ['Diop', 'Ndiaye', 'Fall', 'Sow', 'Diallo', 'Faye', 'Gueye', 'Ba', 'Sarr', 'Mbaye', 'Cissé', 'Seck'] },
  provinceWord: 'Region', provinces: [['SN-DK', 'Dakar Region', 4.0], ['SN-TH', 'Thiès Region', 2.2], ['SN-ZG', 'Ziguinchor Region', 0.7]],
  cities: [['dakar', 'Dakar', '🌊', 'Capital region', 'SN-DK', 'large', 3900000, 0.45, 0.2], ['thies', 'Thiès', '🚂', 'Mid-size city', 'SN-TH', 'medium', 400000, 0.38, 0.16], ['ziguinchor', 'Ziguinchor', '🌴', 'Small town', 'SN-ZG', 'small', 200000, 0.35, 0.14], ['kaolack', 'a village near Kaolack', '🥜', 'Rural', 'SN-TH', 'small', 5000, 0.3, 0.12]],
  gov: { system: 'presidential', head: 'President of Senegal', lower: ['National Assembly', 165, 'Député'], term: 5, parties: ['PASTEF', 'Alliance pour la République'] },
  intel: 'Direction générale du renseignement intérieur', foreign: 'Ministère de l\'Intégration africaine et des Affaires étrangères', prisons: 'Direction de l\'administration pénitentiaire', post: 'La Poste Sénégal', centralBank: 'BCEAO', audit: 'Cour des comptes',
  forces: { army: 'Armée de terre sénégalaise', navy: 'Marine nationale sénégalaise', air: 'Armée de l\'air sénégalaise', reserve: 'Gendarmerie nationale', academy: 'the École nationale des officiers d\'active, Thiès', head: 'Chef d\'état-major général des armées', ranks: { enlisted: FR_ENLISTED, officer: FR_OFFICERS }, bases: { army: [['dakar', 'Camp Dial Diop'], ['thies', 'Thiès garrison']], navy: [['dakar', 'Base navale de Dakar']], airforce: [['dakar', 'Base aérienne de Ouakam']] }, overseas: [['Gambia', 'ECOWAS Mission in The Gambia (ECOMIG)'], ['Central African Republic', 'UN mission (MINUSCA)']] },
  war: [{ id: 'casamance', name: 'the Casamance conflict', adversary: 'MFDC separatists', intensity: 1, home: 0.05, weight: 10, internal: true }], warChance: 0.003,
  orders: [['', 'Ordre national du Lion (Chevalier)'], ['', 'Ordre national du Lion (Officier)'], ['', 'Ordre national du Lion (Commandeur)'], ['', 'Ordre national du Lion (Grand-croix)']],
  edu: { exam: 'Baccalauréat sénégalais', state: 'Université Cheikh Anta Diop', private: 'Institut supérieur de management', elite: 'École supérieure polytechnique de Dakar', tvet: 'lycée technique' },
  unions: 'Confédération nationale des travailleurs du Sénégal', stock: 'BRVM Composite', lender: 'CBAO', fees: 50000,
  religion: { sunni: 96, catholic: 4 },
}));

export const CI = nation(francophone({
  id: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', demonym: 'Ivorian', capital: 'Yamoussoukro', cur: ['XOF', 'CFA'], ppp: 230, languages: ['French'], informality: 0.85, death: null,
  names: { male: ['Kouassi', 'Konan', 'Yao', 'Kouadio', 'Didier', 'Serge', 'Ibrahim', 'Seydou', 'Alassane', 'Moussa', 'Franck', 'Eric'], female: ['Aya', 'Adjoua', 'Amenan', 'Akissi', 'Affoué', 'Mariam', 'Fatou', 'Awa', 'Christelle', 'Nadège', 'Marie', 'Estelle'], last: ['Kouassi', 'Konan', 'Koffi', 'Yao', 'Kouamé', 'Ouattara', 'Traoré', 'Coulibaly', 'Bamba', 'Touré', 'Gbagbo', 'Bédié'] },
  provinceWord: 'District', provinces: [['CI-AB', 'Abidjan', 5.6], ['CI-YM', 'Yamoussoukro', 0.4], ['CI-VB', 'Vallée du Bandama (Bouaké)', 1.6]],
  cities: [['abidjan', 'Abidjan', '🌆', 'Major metro', 'CI-AB', 'large', 5600000, 0.45, 0.22], ['yamoussoukro', 'Yamoussoukro', '⛪', 'Capital region', 'CI-YM', 'small', 360000, 0.38, 0.16], ['bouake', 'Bouaké', '🌾', 'Mid-size city', 'CI-VB', 'medium', 830000, 0.36, 0.15]],
  gov: { system: 'presidential', head: 'President of Côte d\'Ivoire', lower: ['National Assembly', 255, 'Député'], upper: ['Senate', 99, 'Senator', false], term: 5, parties: ['PDCI-RDA', 'RHDP'] },
  intel: 'Conseil national de sécurité', foreign: 'Ministère des Affaires étrangères', prisons: 'administration pénitentiaire', post: 'La Poste de Côte d\'Ivoire', centralBank: 'BCEAO', audit: 'Cour des comptes',
  forces: { army: 'Forces armées de Côte d\'Ivoire', navy: 'Marine nationale ivoirienne', air: 'Armée de l\'air ivoirienne', reserve: 'Gendarmerie nationale', academy: 'the École des forces armées, Zambakro', head: 'Chef d\'état-major général des armées', ranks: { enlisted: FR_ENLISTED, officer: FR_OFFICERS }, bases: { army: [['abidjan', 'Camp d\'Akouédo'], ['bouake', 'Bouaké garrison']], navy: [['abidjan', 'Base navale de Locodjro']], airforce: [['abidjan', 'Base aérienne d\'Abidjan']] }, overseas: [['Mali', 'UN mission (MINUSMA)']] },
  orders: [['', 'Ordre national de Côte d\'Ivoire (Chevalier)'], ['', 'Ordre national (Officier)'], ['', 'Ordre national (Commandeur)'], ['', 'Ordre national (Grand-croix)']],
  edu: { exam: 'Baccalauréat', state: 'Université Félix Houphouët-Boigny', private: 'Université internationale de Grand-Bassam', elite: 'Institut national polytechnique Félix Houphouët-Boigny', tvet: 'lycée professionnel' },
  unions: 'Union générale des travailleurs de Côte d\'Ivoire', stock: 'BRVM Composite', lender: 'Société Générale Côte d\'Ivoire', fees: 50000,
  religion: { sunni: 42, catholic: 17, evangelical: 12, pentecostal: 10, none: 19 },
}));

export const GM = nation({
  id: 'GM', name: 'Gambia', flag: '🇬🇲', demonym: 'Gambian', capital: 'Banjul', cur: ['GMD', 'D'], ppp: 20, languages: ['English', 'Mandinka', 'Wolof'], emergency: '117', retire: 60, informality: 0.85, cityFare: 2,
  tax: { allowance: 24000, brackets: [[10000, 0.05], [10000, 0.1], [10000, 0.15], [10000, 0.2], [Infinity, 0.25]], contributions: [['Social Security and Housing Finance Corporation', 0.05, null]], label: 'Gambia Revenue Authority', vat: 0.15, corporate: 0.27 },
  pension: { name: 'SSHFC pension', short: 'the SSHFC', rate: 0.15 }, health: { name: 'public health centres', short: 'public clinics', coinsurance: 0.6, oopMax: 20000, wait: 10 },
  names: { male: ['Lamin', 'Ebrima', 'Modou', 'Ousman', 'Alieu', 'Sainey', 'Momodou', 'Abdoulie', 'Bakary', 'Yusupha', 'Musa', 'Omar'], female: ['Fatou', 'Isatou', 'Mariama', 'Awa', 'Haddy', 'Kaddy', 'Binta', 'Ndey', 'Aji', 'Sainabou', 'Jainaba', 'Oumie'], last: ['Jallow', 'Ceesay', 'Touray', 'Sanneh', 'Bah', 'Sowe', 'Darboe', 'Barrow', 'Jammeh', 'Njie', 'Camara', 'Faal'] },
  provinceWord: 'Region', provinces: [['GM-B', 'Banjul', 0.4], ['GM-W', 'West Coast Region', 0.9]],
  cities: [['banjul', 'Banjul', '⚓', 'Capital region', 'GM-B', 'medium', 400000, 0.4, 0.15], ['brikama', 'Brikama', '🌴', 'Small town', 'GM-W', 'small', 100000, 0.35, 0.12]],
  gov: { system: 'presidential', head: 'President of the Gambia', lower: ['National Assembly', 58, 'Member of the National Assembly'], term: 5, parties: ['United Democratic Party', 'National People\'s Party'] },
  police: { name: 'Gambia Police Force', local: (c) => `Gambia Police Force — ${c.split(',')[0]}`, academy: 'the Police Training School', head: 'Inspector General of Police', ranks: ['Recruit', 'Constable', 'Lance Corporal', 'Corporal', 'Sergeant', 'Sub-Inspector', 'Inspector', 'Assistant Superintendent', 'Superintendent', 'Commissioner'] },
  prosecution: 'Attorney General\'s Chambers', intel: 'State Intelligence Services', foreign: 'Ministry of Foreign Affairs', prisons: 'Gambia Prison Service', post: 'Gambia Postal Services', centralBank: 'Central Bank of the Gambia', nationalFire: true, civilDefence: 'Gambia Fire and Rescue Service',
  forces: { army: 'Gambia Armed Forces', navy: 'Gambia Navy', air: 'Gambia Armed Forces air wing', reserve: 'GAF reserve', academy: 'the Gambia Armed Forces training school', head: 'Chief of Defence Staff', bases: { army: [['banjul', 'Yundum barracks']], navy: [['banjul', 'Banjul naval base']], airforce: [['banjul', 'Banjul airfield']] }, overseas: [['Sudan', 'UN mission']] },
  orders: [['', 'Order of the Republic of the Gambia (Officer)'], ['', 'Order of the Republic (Commander)'], ['', 'Order of the Republic (Grand Officer)'], ['', 'Order of the Republic (Grand Commander)']],
  courts: { top: 'Supreme Court of the Gambia', high: 'High Court', appeal: 'Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the President, on the Judicial Service Commission\'s advice' },
  edu: { exam: 'WASSCE', state: 'University of the Gambia', private: 'American International University West Africa', elite: 'University of the Gambia', tvet: 'Gambia Technical Training Institute' },
  immig: { work: 'Work permit', pr: 'Residence permit', natYears: 15, dual: true }, unions: 'Gambia Workers\' Confederation', stock: 'no stock exchange', lender: 'Trust Bank', fees: 20000, groups: ['COMMON_LAW'],
  religion: { sunni: 96, catholic: 2, evangelical: 2 },
});

export const GW = nation({
  id: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', demonym: 'Bissau-Guinean', capital: 'Bissau', cur: ['XOF', 'CFA'], ppp: 230, languages: ['Portuguese', 'Kriol'], emergency: '117 / 121', retire: 60, informality: 0.9, cityFare: 2,
  tax: { allowance: 0, brackets: [[Infinity, 0.1]], contributions: [['INSS', 0.08, null]], label: 'Direção-Geral das Contribuições e Impostos', vat: 0.17, corporate: 0.25 },
  pension: { name: 'INSS pension', short: 'the INSS', rate: 0.2 }, health: { name: 'public hospitals', short: 'public hospitals', coinsurance: 0.7, oopMax: 300000, wait: 12 },
  names: { male: ['João', 'Domingos', 'Umaro', 'Carlos', 'José', 'Mamadu', 'Braima', 'Fernando', 'António', 'Malam', 'Augusto', 'Nuno'], female: ['Maria', 'Fatumata', 'Ana', 'Isabel', 'Aissatu', 'Teresa', 'Carmen', 'Fátima', 'Joana', 'Mariama', 'Rosa', 'Adiato'], last: ['Gomes', 'Pereira', 'Embaló', 'Vieira', 'Sanhá', 'Cabral', 'Djaló', 'Baldé', 'Mendes', 'Sá', 'Indjai', 'Có'] },
  provinces: [['GW-BS', 'Bissau', 0.5], ['GW-BA', 'Bafatá Region', 0.2]],
  cities: [['bissau', 'Bissau', '⚓', 'Capital region', 'GW-BS', 'medium', 500000, 0.35, 0.12], ['bafata', 'Bafatá', '🌾', 'Small town', 'GW-BA', 'small', 25000, 0.3, 0.1]],
  gov: { system: 'semi', head: 'President of Guinea-Bissau', lower: ['National People\'s Assembly', 102, 'Deputy'], term: 4, presTerm: 5, parties: ['PAIGC', 'Madem G15'] },
  police: { name: 'Polícia de Ordem Pública', local: (c) => `Polícia de Ordem Pública — ${c.split(',')[0]}`, academy: 'the police training school', head: 'Commander-General of the Public Order Police' },
  prosecution: 'Ministério Público', intel: 'Serviços de Informação do Estado', foreign: 'Ministry of Foreign Affairs', prisons: 'prison service', post: 'Correios da Guiné-Bissau', centralBank: 'BCEAO', nationalFire: true, civilDefence: 'Serviço Nacional de Proteção Civil',
  forces: { army: 'Armed Forces of Guinea-Bissau', navy: 'Navy of Guinea-Bissau', air: 'Air Force of Guinea-Bissau', reserve: 'reserve', academy: 'the military training centre', head: 'Chief of the General Staff', pay: 0.15, bases: { army: [['bissau', 'Amura fortress']], navy: [['bissau', 'Bissau naval base']], airforce: [['bissau', 'Bissau airfield']] }, overseas: [] },
  orders: [['', 'Medal of Merit'], ['', 'Order of Amílcar Cabral (3rd class)'], ['', 'Order of Amílcar Cabral (2nd class)'], ['', 'Order of Amílcar Cabral (1st class)']],
  courts: { top: 'Supreme Court of Justice', high: 'Regional Court', appeal: 'Court of Appeal', magistrate: 'Sector court judge', appointedBy: 'the Superior Council of the Judiciary' },
  edu: { exam: '12.º ano (secondary diploma)', state: 'Universidade Amílcar Cabral', private: 'Universidade Lusófona da Guiné', elite: 'Universidade Amílcar Cabral', tvet: 'centro de formação profissional' },
  immig: { work: 'Work permit', pr: 'Residence permit', natYears: 10, dual: true }, unions: 'União Nacional dos Trabalhadores da Guiné', stock: 'BRVM Composite', lender: 'Ecobank Guinea-Bissau', fees: 50000,
  religion: { sunni: 46, catholic: 19, evangelical: 3, none: 32 },
});

export const MZ = nation({
  id: 'MZ', name: 'Mozambique', flag: '🇲🇿', demonym: 'Mozambican', capital: 'Maputo', cur: ['MZN', 'MT'], ppp: 22, languages: ['Portuguese'], emergency: '112 / 117', retire: 60, informality: 0.9, cityFare: 2,
  tax: { allowance: 42000, brackets: [[126000, 0.15], [252000, 0.2], [1344000, 0.25], [Infinity, 0.32]], contributions: [['INSS', 0.03, null]], label: 'Autoridade Tributária de Moçambique', vat: 0.16, corporate: 0.32 },
  pension: { name: 'INSS pension', short: 'the INSS', rate: 0.07 }, health: { name: 'National Health Service (SNS)', short: 'the SNS', coinsurance: 0.4, oopMax: 30000, wait: 10 },
  names: { male: ['João', 'José', 'António', 'Manuel', 'Armando', 'Filipe', 'Celso', 'Samora', 'Joaquim', 'Daniel', 'Alberto', 'Ossufo'], female: ['Maria', 'Ana', 'Graça', 'Luísa', 'Isabel', 'Joana', 'Celeste', 'Esperança', 'Fátima', 'Rosa', 'Lurdes', 'Ancha'], last: ['Machel', 'Chissano', 'Guebuza', 'Nyusi', 'Dhlakama', 'Simango', 'Mondlane', 'Cossa', 'Macuácua', 'Nhantumbo', 'Mabunda', 'Langa'] },
  provinces: [['MZ-MPM', 'Maputo City', 1.1], ['MZ-P', 'Cabo Delgado', 2.3], ['MZ-S', 'Sofala (Beira)', 2.3]],
  cities: [['maputo', 'Maputo', '🌊', 'Capital region', 'MZ-MPM', 'large', 1100000, 0.4, 0.15], ['pemba', 'Pemba, Cabo Delgado', '🏝️', 'Coastal metro', 'MZ-P', 'small', 200000, 0.35, 0.12], ['beira', 'Beira', '⚓', 'Coastal metro', 'MZ-S', 'medium', 600000, 0.35, 0.12]],
  gov: { system: 'presidential', head: 'President of Mozambique', lower: ['Assembly of the Republic', 250, 'Deputy'], local: ['Provincial Governor', 'Provincial Assembly'], term: 5, parties: ['RENAMO / Podemos', 'FRELIMO'] },
  police: { name: 'Police of the Republic of Mozambique (PRM)', local: (c) => `PRM — ${c.split(',')[0]} provincial command`, academy: 'the Academia de Ciências Policiais', head: 'Commander-General of the PRM' },
  prosecution: 'Procuradoria-Geral da República', prosecutor: 'Procurador-Geral da República', intel: 'State Information and Security Service (SISE)', foreign: 'Ministry of Foreign Affairs and Cooperation', prisons: 'Serviço Nacional Penitenciário', post: 'Correios de Moçambique', centralBank: 'Banco de Moçambique', audit: 'Tribunal Administrativo', nationalFire: true, civilDefence: 'Serviço Nacional de Salvação Pública',
  forces: { army: 'Mozambique Defence Armed Forces (FADM)', navy: 'Mozambican Navy', air: 'Mozambican Air Force', reserve: 'local militias', academy: 'the Marechal Samora Machel Military Academy', head: 'Chief of the General Staff', pay: 0.2, bases: { army: [['maputo', 'Maputo garrison'], ['pemba', 'Cabo Delgado operational command']], navy: [['beira', 'Beira naval base']], airforce: [['maputo', 'Maputo air base']] }, overseas: [] },
  war: [{ id: 'caboDelgado', name: 'the insurgency in Cabo Delgado', adversary: 'Islamic State Mozambique', intensity: 2, home: 0.15, weight: 50, internal: true }], warChance: 0.012,
  orders: [['', 'Order of Bagamoyo'], ['', 'Order of Eduardo Mondlane (3rd class)'], ['', 'Order of Eduardo Mondlane (2nd class)'], ['', 'Order of Eduardo Mondlane (1st class)']],
  courts: { top: 'Supreme Court', high: 'Provincial Judicial Court', appeal: 'Superior Court of Appeal', magistrate: 'District court judge', appointedBy: 'the Superior Council of the Judiciary' },
  edu: { exam: '12.ª classe (exames nacionais)', state: 'Universidade Eduardo Mondlane', private: 'Universidade Católica de Moçambique', elite: 'Universidade Eduardo Mondlane', tvet: 'instituto industrial' },
  immig: { work: 'Work permit (DIRE)', pr: 'Permanent residence (DIRE)', natYears: 10, dual: true }, unions: 'Organização dos Trabalhadores de Moçambique', stock: 'BVM index', lender: 'Millennium bim', fees: 3000,
  religion: { catholic: 27, sunni: 19, pentecostal: 15, evangelical: 15, none: 24 },
});

export const MW = nation({
  id: 'MW', name: 'Malawi', flag: '🇲🇼', demonym: 'Malawian', capital: 'Lilongwe', cur: ['MWK', 'MK'], ppp: 330, languages: ['English', 'Chichewa'], emergency: '997 / 998 / 999', retire: 60, informality: 0.9, cityFare: 2,
  tax: { allowance: 1800000, brackets: [[1200000, 0.25], [36000000, 0.3], [Infinity, 0.35]], contributions: [['occupational pension (Pension Act)', 0.05, null]], label: 'Malawi Revenue Authority', vat: 0.165, corporate: 0.3 },
  pension: { name: 'mandatory occupational pension', short: 'the pension fund', rate: 0.15 }, health: { name: 'free public health care', short: 'public clinics', coinsurance: 0.1, oopMax: 330 * 300, wait: 10 },
  names: { male: ['Chikondi', 'Kondwani', 'Mphatso', 'Blessings', 'Gift', 'Lazarus', 'Peter', 'Yamikani', 'Chisomo', 'Thokozani', 'Mwayi', 'Lusungu'], female: ['Chimwemwe', 'Tadala', 'Thandiwe', 'Grace', 'Memory', 'Tiwonge', 'Madalitso', 'Esther', 'Joyce', 'Chifundo', 'Alinafe', 'Kumbukani'], last: ['Banda', 'Phiri', 'Mwale', 'Chirwa', 'Mutharika', 'Chakwera', 'Mbewe', 'Nyirenda', 'Kumwenda', 'Gondwe', 'Chisale', 'Kamwendo'] },
  provinceWord: 'Region', provinces: [['MW-C', 'Central Region', 7.5], ['MW-S', 'Southern Region', 9.0]],
  cities: [['lilongwe', 'Lilongwe', '🌳', 'Capital region', 'MW-C', 'medium', 1100000, 0.35, 0.1], ['blantyre', 'Blantyre', '🏙️', 'Major metro', 'MW-S', 'medium', 800000, 0.35, 0.1], ['dedza', 'a farming town near Dedza', '🌽', 'Rural', 'MW-C', 'small', 30000, 0.28, 0.08]],
  gov: { system: 'presidential', head: 'President of Malawi', lower: ['National Assembly', 229, 'Member of Parliament'], term: 5, parties: ['Malawi Congress Party', 'Democratic Progressive Party'] },
  police: { name: 'Malawi Police Service', local: (c) => `Malawi Police Service — ${c.split(',')[0]}`, academy: 'the Malawi Police Training School', head: 'Inspector General of Police', ranks: ['Recruit', 'Constable', 'Lance Corporal', 'Sergeant', 'Sub-Inspector', 'Inspector', 'Assistant Superintendent', 'Superintendent', 'Assistant Commissioner', 'Deputy Commissioner'] },
  prosecution: 'Director of Public Prosecutions', intel: 'National Intelligence Service', foreign: 'Ministry of Foreign Affairs', prisons: 'Malawi Prisons Service', post: 'Malawi Posts Corporation', centralBank: 'Reserve Bank of Malawi', nationalFire: true, civilDefence: 'city fire brigade',
  forces: { army: 'Malawi Defence Force', navy: 'Malawi Defence Force Marine Unit', air: 'Malawi Defence Force Air Wing', reserve: 'MDF reserve', academy: 'the Malawi Armed Forces College', head: 'Commander of the Malawi Defence Force', pay: 0.2, bases: { army: [['lilongwe', 'Kamuzu Barracks'], ['blantyre', 'Cobbe Barracks']], navy: [['blantyre', 'Monkey Bay naval base']], airforce: [['lilongwe', 'Kamuzu air base']] }, overseas: [['DR Congo', 'UN mission (MONUSCO)'], ['Mozambique', 'SADC mission (Cabo Delgado)']] },
  orders: [['', 'Order of the Lion (Member)'], ['', 'Order of the Lion (Officer)'], ['', 'Order of the Lion (Commander)'], ['', 'Order of the Lion (Grand Commander)']],
  courts: { top: 'Supreme Court of Appeal', high: 'High Court', appeal: 'Supreme Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the President, on the Judicial Service Commission\'s recommendation' },
  edu: { exam: 'Malawi School Certificate of Education (MSCE)', state: 'University of Malawi', private: 'Catholic University of Malawi', elite: 'Malawi University of Science and Technology', tvet: 'technical college' },
  immig: { work: 'Temporary employment permit', pr: 'Permanent residence', natYears: 7, dual: true }, unions: 'Malawi Congress of Trade Unions', stock: 'MSE All Share Index', lender: 'National Bank of Malawi', fees: 330 * 300, groups: ['COMMON_LAW'],
  religion: { evangelical: 30, catholic: 17, pentecostal: 20, anglican: 2, sunni: 14, none: 17 },
  farm: { price: 2000, unit: 'acre', plots: [1, 2, 5, 10, 25], prod: 0.35, grass: 0.8, drought: 1.5, flood: 1.2, crops: ['corn', 'soybeans', 'vegetables', 'pasture'] },
});

export const ET = nation({
  id: 'ET', name: 'Ethiopia', flag: '🇪🇹', demonym: 'Ethiopian', capital: 'Addis Ababa', cur: ['ETB', 'Br'], ppp: 22, languages: ['Amharic', 'Oromo'], emergency: '991 / 939 / 907', retire: 60, informality: 0.85, cityFare: 2,
  tax: { allowance: 7200, brackets: [[12600, 0.1], [18000, 0.15], [25200, 0.2], [31800, 0.25], [36000, 0.3], [Infinity, 0.35]], contributions: [['Pension contribution', 0.07, null]], label: 'the Ministry of Revenues', vat: 0.15, corporate: 0.3 },
  pension: { name: 'Private / public servants\' pension', short: 'the POESSA', rate: 0.18 }, health: { name: 'Community-Based Health Insurance', short: 'CBHI', coinsurance: 0.4, oopMax: 30000, wait: 8 },
  names: { male: ['Abebe', 'Dawit', 'Yonas', 'Tesfaye', 'Bereket', 'Henok', 'Mulugeta', 'Getachew', 'Solomon', 'Tadesse', 'Abdi', 'Kebede'], female: ['Tigist', 'Hiwot', 'Selam', 'Meron', 'Bethlehem', 'Hana', 'Almaz', 'Mekdes', 'Liya', 'Ruth', 'Fatuma', 'Aster'], last: ['Bekele', 'Tadesse', 'Haile', 'Girma', 'Alemu', 'Tesfaye', 'Mekonnen', 'Wolde', 'Getachew', 'Abebe', 'Mohammed', 'Hussein'] },
  provinceWord: 'Region', provinces: [['ET-AA', 'Addis Ababa', 5.5], ['ET-OR', 'Oromia', 40], ['ET-AM', 'Amhara', 23], ['ET-TI', 'Tigray', 6]],
  cities: [['addisababa', 'Addis Ababa', '🕊️', 'Capital region', 'ET-AA', 'large', 5500000, 0.45, 0.22], ['adama', 'Adama', '🌾', 'Mid-size city', 'ET-OR', 'medium', 400000, 0.4, 0.18], ['bahirdar', 'Bahir Dar', '🛶', 'Mid-size city', 'ET-AM', 'medium', 350000, 0.4, 0.18], ['mekelle', 'Mekelle', '⛰️', 'Mid-size city', 'ET-TI', 'medium', 330000, 0.38, 0.16]],
  gov: { system: 'parliamentary', head: 'Prime Minister', lower: ['House of Peoples\' Representatives', 547, 'Member of Parliament'], upper: ['House of Federation', 153, 'Member of the House of Federation', false], term: 5, parties: ['Prosperity Party', 'Opposition coalition'], pardon: 'the President of Ethiopia' },
  police: { name: 'Ethiopian Federal Police', local: (c) => `${c.split(',')[0]} Police Commission`, academy: 'the Ethiopian Police University', head: 'Commissioner General', ranks: ['Recruit', 'Constable', 'Assistant Sergeant', 'Sergeant', 'Inspector', 'Chief Inspector', 'Superintendent', 'Commander', 'Deputy Commissioner', 'Commissioner'] },
  fire: 'Addis Ababa Fire and Emergency Prevention', ems: 'Ethiopian Red Cross ambulance service', prosecution: 'Federal Attorney General', prosecutor: 'Attorney General', intel: 'National Intelligence and Security Service (NISS)', foreign: 'Ministry of Foreign Affairs', prisons: 'Federal Prison Commission', border: 'Immigration and Citizenship Service', post: 'Ethiopian Postal Service', pensionAgency: 'the Pension Agency', centralBank: 'National Bank of Ethiopia', audit: 'Office of the Federal Auditor General', nationalFire: true,
  forces: { army: 'Ethiopian National Defense Force', navy: null, air: 'Ethiopian Air Force', reserve: 'ENDF Reserve', academy: 'the Haile Selassie I Military Academy (Holeta)', head: 'Chief of General Staff', bases: { army: [['addisababa', 'Addis Ababa garrison'], ['bahirdar', 'Bahir Dar command']], airforce: [['adama', 'Bishoftu air base']] }, overseas: [['South Sudan', 'UN mission (UNMISS)'], ['Somalia', 'AU mission (AUSSOM)']] },
  war: [{ id: 'northern', name: 'a civil war in the north', adversary: 'regional forces', intensity: 3, home: 0.4, weight: 10, internal: true }], warChance: 0.02,
  orders: [['', 'Order of the Star of Honour'], ['', 'Order of the Star of Honour (Grand Officer)']],
  courts: { top: 'Federal Supreme Court', high: 'Federal High Court', appeal: 'Federal Supreme Court (cassation)', magistrate: 'Federal First Instance Court judge', appointedBy: 'Parliament, on the Prime Minister\'s nomination' },
  edu: { exam: 'Ethiopian Secondary School Leaving Certificate Exam', state: 'Addis Ababa University', private: 'Unity University', elite: 'Addis Ababa University', tvet: 'TVET college' },
  immig: { work: 'Work permit and residence ID', pr: 'Permanent residence', natYears: 4, dual: false }, unions: 'Confederation of Ethiopian Trade Unions', stock: 'Ethiopian Securities Exchange', lender: 'Commercial Bank of Ethiopia', fees: 1000,
  religion: { orthodoxChristian: 44, sunni: 34, pentecostal: 19, evangelical: 2, catholic: 1 },
  farm: { price: 15000, unit: 'ha', plots: [3, 5, 12, 25], prod: 0.35, grass: 0.9, drought: 1.5, flood: 1.0, crops: ['corn', 'wheat', 'vegetables', 'pasture'] },
});
