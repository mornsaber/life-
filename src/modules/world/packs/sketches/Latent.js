/**
 * States that don't exist yet, and may never: each comes into being only if this world makes it
 * (world/StateChanges.js), and until then nobody is born in it or moves to it (world/Habitation.js).
 *
 *   XS Scotland   XW Wales   XQ Quebec   XC Catalonia   XF Flanders   XD Kurdistan   XR Republika Srpska
 *
 * Each has its own cities (the same places as its parent's, under the new flag), government, police,
 * forces, courts, taxes and honours. The parent's laws and money carry over at first, as they did in
 * the new states of history. Codes are in the user-assigned X- range, as Kosovo's XK is.
 */
import { sketch } from '../Sketch.js';

const C = (id, name, demonym, capital, cur, ppp, family, o) => sketch({ id, name, demonym, capital, cur, ppp, family, regimes: null, sovereign: [], warChance: 0, ...o });
const BRIT_POLICE = ['Police Constable', 'Police Constable', 'Sergeant', 'Inspector', 'Chief Inspector', 'Superintendent', 'Chief Superintendent', 'Assistant Chief Constable', 'Deputy Chief Constable', 'Chief Constable'];
const BRIT = { ranks: { enlisted: ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Warrant Officer Class 2', 'Warrant Officer Class 1', 'Regimental Sergeant Major', 'Regimental Sergeant Major'], officer: ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier', 'Major General', 'Lieutenant General', 'General'] } };
const UK_TAX = { allowance: 12570, brackets: [[2306, 0.19], [11685, 0.2], [17101, 0.21], [31338, 0.42], [Infinity, 0.48]], vat: 0.2, corporate: 0.25 };

export const XS = C('XS', 'Scotland', 'Scottish', 'Edinburgh', ['GBP', '£'], 0.75, 'micro', {
  languages: ['English', 'Scots', 'Scottish Gaelic'], pop: 5500, gdp: 46000, life: 79,
  m: 'James John Robert David William Andrew Alexander Thomas Iain Callum Euan Fraser', f: 'Margaret Mary Elizabeth Catherine Isla Ailsa Morag Fiona Eilidh Kirsty Mhairi Shona', l: 'Smith Brown Wilson Campbell Stewart Thomson Robertson Anderson MacDonald Scott Reid Murray',
  cities: [['xs_edinburgh', 'Edinburgh', '🏰', 'Capital region', 'large', 514000, 1.08, 0.92], ['xs_glasgow', 'Glasgow', '🦄', 'Major metro', 'large', 632000, 0.92, 0.85], ['xs_inverness', 'Inverness', '🦌', 'Small town', 'small', 48000, 0.88, 0.8], ['xs_dumfries', 'Dumfries', '🐄', 'Small town', 'small', 33000, 0.7, 0.66]],
  provinceWord: 'Council area', gov: ['parliamentary', 'Scottish Parliament (Pàrlamaid na h-Alba)', 129, ['Scottish Labour', 'Scottish National Party'], 'First Minister'],
  tax: { ...UK_TAX, label: 'Revenue Scotland' },
  police: { name: 'Police Scotland', head: 'Chief Constable', ranks: BRIT_POLICE, academy: 'the Scottish Police College, Tulliallan' },
  forces: { army: 'Scottish Defence Force', navy: 'Scottish Navy (Faslane)', air: 'Scottish Air Force', ...BRIT },
  courts: { top: 'Court of Session (Inner House) and High Court of Justiciary', high: 'Court of Session', appeal: 'High Court of Justiciary (appeal)', magistrate: 'Sheriff', appointedBy: 'the First Minister, on the Judicial Appointments Board' },
  religion: { mainline: 35, catholic: 15, none: 50 }, emergency: '999', retire: 66,
  orders: [['', 'Order of Scotland (Member)'], ['', 'Order of Scotland (Officer)'], ['', 'Order of Scotland (Companion)']],
  ribbon: ['#005EB8', '#ffffff', '#005EB8'],
  ruled: [], centralBank: 'the Bank of Scotland (the new central bank)',
});

export const XW = C('XW', 'Wales', 'Welsh', 'Cardiff', ['GBP', '£'], 0.75, 'micro', {
  languages: ['English', 'Welsh'], pop: 3100, gdp: 38000, life: 79,
  m: 'David John Rhys Dafydd Gareth Huw Ieuan Owain Gethin Emyr Aled Tomos', f: 'Megan Ffion Catrin Rhian Siân Nia Bethan Gwen Eluned Angharad Seren Cerys', l: 'Jones Williams Davies Evans Thomas Roberts Hughes Lewis Morgan Griffiths Price Rees',
  cities: [['xw_cardiff', 'Cardiff (Caerdydd)', '🐉', 'Capital region', 'medium', 372000, 0.9, 0.82], ['xw_aberystwyth', 'Aberystwyth', '🐉', 'Rural', 'small', 19000, 0.8, 0.76], ['xw_llandudno', 'Llandudno', '🏖️', 'Small town', 'small', 20000, 0.66, 0.65]],
  provinceWord: 'County', gov: ['parliamentary', 'Senedd Cymru', 96, ['Welsh Labour', 'Plaid Cymru'], 'First Minister'],
  tax: { ...UK_TAX, brackets: [[37700, 0.2], [87440, 0.4], [Infinity, 0.45]], label: 'Welsh Revenue Authority (Awdurdod Cyllid Cymru)' },
  police: { name: 'Heddlu Cymru (Police Wales)', head: 'Chief Constable', ranks: BRIT_POLICE },
  forces: { army: 'Welsh Defence Force', navy: null, air: null, ...BRIT }, navy: false,
  courts: { top: 'Supreme Court of Wales', high: 'High Court of Wales', appeal: 'Court of Appeal of Wales', magistrate: 'District judge', appointedBy: 'the First Minister, on the Judicial Appointments Commission' },
  religion: { mainline: 40, catholic: 5, none: 55 }, emergency: '999', retire: 66,
  orders: [['', 'Order of St David (Member)'], ['', 'Order of St David (Officer)'], ['', 'Order of St David (Companion)']],
  ruled: [],
});

export const XQ = C('XQ', 'Quebec', 'Québécois', 'Quebec City', ['CAD', '$'], 1.25, 'micro', {
  languages: ['French', 'English'], pop: 9000, gdp: 46000, life: 83,
  m: 'Jean Pierre Michel Luc Jacques François Gabriel Mathieu Simon Étienne Olivier Félix', f: 'Marie Sophie Julie Isabelle Geneviève Catherine Chloé Léa Émilie Marie-Ève Mélanie Josée', l: 'Tremblay Gagnon Roy Côté Bouchard Gauthier Morin Lavoie Fortin Gagné Ouellet Pelletier',
  cities: [['xq_quebeccity', 'Quebec City', '🏰', 'Capital region', 'large', 550000, 0.9, 0.85], ['xq_montreal', 'Montreal', '⚜️', 'Major metro', 'enterprise', 1762000, 0.98, 0.85], ['xq_rimouski', 'Rimouski', '🌊', 'Small town', 'small', 49000, 0.62, 0.68]],
  provinceWord: 'Region', gov: ['parliamentary', 'National Assembly of Quebec', 125, ['Parti Québécois', 'Coalition Avenir Québec'], 'Prime Minister (Premier ministre)'],
  tax: { allowance: 18000, brackets: [[50000, 0.25], [50000, 0.34], [30000, 0.4], [Infinity, 0.5]], vat: 0.14975, corporate: 0.265, label: 'Revenu Québec' },
  police: { name: 'Sûreté du Québec', head: 'Directeur général', ranks: ['Agent', 'Sergent', 'Lieutenant', 'Capitaine', 'Inspecteur', 'Inspecteur-chef', 'Directeur adjoint', 'Directeur général adjoint', 'Directeur général', 'Directeur général'] },
  forces: { army: 'Forces armées du Québec', navy: 'Marine québécoise', air: 'Aviation québécoise', ...BRIT },
  courts: { top: 'Cour suprême du Québec', high: 'Cour supérieure', appeal: 'Cour d\'appel du Québec', magistrate: 'Juge de la Cour du Québec', appointedBy: 'the Government of Quebec' },
  religion: { catholic: 54, mainline: 5, none: 41 }, emergency: '911', retire: 65,
  orders: [['CQ', 'Ordre national du Québec (Chevalier)'], ['OQ', 'Ordre national du Québec (Officier)'], ['GOQ', 'Ordre national du Québec (Grand officier)']],
  ruled: [],
});

export const XC = C('XC', 'Catalonia', 'Catalan', 'Barcelona', ['EUR', '€'], 0.7, 'micro', {
  languages: ['Catalan', 'Spanish', 'Aranese'], pop: 7800, gdp: 40000, life: 84,
  m: 'Jordi Josep Joan Marc Pere Pau Oriol Arnau Xavier Albert Carles Martí', f: 'Montserrat Núria Laia Marta Mireia Anna Maria Mercè Roser Gemma Berta Clara', l: 'Garcia Martínez Puig Vidal Ferrer Pujol Soler Serra Roca Font Sala Mas',
  cities: [['xc_barcelona', 'Barcelona', '⛪', 'High-cost metro', 'enterprise', 1660000, 1.15, 0.85], ['xc_girona', 'Girona', '🏰', 'Mid-size city', 'medium', 100000, 0.95, 0.8], ['xc_olot', 'Olot, Garrotxa', '🌋', 'Rural', 'small', 36000, 0.94, 0.72]],
  provinceWord: 'Vegueria', gov: ['parliamentary', 'Parliament of Catalonia', 135, ['Esquerra Republicana', 'Junts per Catalunya'], 'President of the Generalitat'],
  tax: { allowance: 5550, brackets: [[12450, 0.21], [20200, 0.24], [35200, 0.33], [Infinity, 0.48]], vat: 0.21, corporate: 0.25, label: 'Agència Tributària de Catalunya' },
  police: { name: 'Mossos d\'Esquadra', head: 'Major dels Mossos', ranks: ['Mosso', 'Caporal', 'Sergent', 'Sotsinspector', 'Inspector', 'Intendent', 'Comissari', 'Major'] },
  forces: { army: 'Forces Armades de Catalunya', navy: null, air: null, ranks: { enlisted: ['Soldat', 'Caporal', 'Caporal primer', 'Sergent', 'Sergent primer', 'Brigada', 'Sotstinent', 'Sotstinent', 'Sotstinent'], officer: ['Alferes', 'Tinent', 'Capità', 'Comandant', 'Tinent coronel', 'Coronel', 'General de brigada', 'General de divisió', 'Tinent general', 'General'] } }, navy: false,
  courts: { top: 'Tribunal Suprem de Catalunya', high: 'Audiència Provincial', appeal: 'Tribunal Superior de Justícia de Catalunya', magistrate: 'Jutge de primera instància', appointedBy: 'the Consell de la Justícia' },
  religion: { catholic: 50, sunni: 7, none: 43 }, emergency: '112', retire: 67,
  orders: [['', 'Creu de Sant Jordi'], ['', 'Medalla d\'Or de la Generalitat']],
  ruled: [],
});

export const XF = C('XF', 'Flanders', 'Flemish', 'Brussels (Brussel)', ['EUR', '€'], 0.8, 'micro', {
  languages: ['Dutch (Flemish)'], pop: 6800, gdp: 52000, life: 83,
  m: 'Jan Peter Luc Wim Dirk Koen Bart Tom Pieter Joris Bram Stijn', f: 'Maria An Els Sofie Katrien Lies Hilde Inge Eline Lotte Fien Marie', l: 'Peeters Janssens Maes Jacobs Mertens Willems Claes Goossens Wouters De|Smet Dubois Hermans',
  cities: [['xf_antwerp', 'Antwerp (Antwerpen)', '💎', 'Coastal metro', 'large', 530000, 1.05, 0.98], ['xf_ghent', 'Ghent (Gent)', '🏰', 'Mid-size city', 'medium', 265000, 1.0, 0.95], ['xf_bruges', 'Bruges (Brugge)', '⛵', 'Small town', 'small', 118000, 1.0, 0.9]],
  provinceWord: 'Province', gov: ['parliamentary', 'Flemish Parliament', 124, ['Vooruit', 'N-VA'], 'Prime Minister'],
  tax: { allowance: 10570, brackets: [[15200, 0.25], [11630, 0.4], [19210, 0.45], [Infinity, 0.5]], vat: 0.21, corporate: 0.25, label: 'Vlaamse Belastingdienst' },
  police: { name: 'Vlaamse Politie', head: 'Commissaris-generaal', ranks: ['Agent', 'Inspecteur', 'Hoofdinspecteur', 'Commissaris', 'Hoofdcommissaris', 'Commissaris-generaal'] },
  forces: { army: 'Vlaamse Defensie', navy: 'Vlaamse Marine', air: null, ranks: { enlisted: ['Soldaat', 'Korporaal', 'Korporaal-chef', 'Sergeant', 'Eerste sergeant', 'Eerste sergeant-chef', 'Adjudant', 'Adjudant-chef', 'Adjudant-majoor'], officer: ['Onderluitenant', 'Luitenant', 'Kapitein', 'Majoor', 'Luitenant-kolonel', 'Kolonel', 'Brigadegeneraal', 'Generaal-majoor', 'Luitenant-generaal', 'Generaal'] } },
  courts: { top: 'Hof van Cassatie (Vlaanderen)', high: 'Rechtbank van eerste aanleg', appeal: 'Hof van Beroep', magistrate: 'Vrederechter', appointedBy: 'the Hoge Raad voor de Justitie' },
  religion: { catholic: 50, sunni: 7, none: 43 }, emergency: '112', retire: 67,
  orders: [['', 'Orde van de Vlaamse Leeuw (Ridder)'], ['', 'Orde van de Vlaamse Leeuw (Officier)'], ['', 'Orde van de Vlaamse Leeuw (Commandeur)']],
  ruled: [],
});

export const XD = C('XD', 'Kurdistan', 'Kurdish', 'Erbil (Hewlêr)', ['IQD', 'ع.د'], 600, 'maghreb', {
  languages: ['Kurdish (Sorani)', 'Kurdish (Kurmanji)', 'Arabic'], pop: 6000, gdp: 8000, life: 72,
  m: 'Masoud Jalal Barzan Nechirvan Kosrat Hoshyar Fuad Rebwar Shwan Karwan Diyar Aram', f: 'Hero Shirin Nazanin Avin Rozhan Narin Lana Dilan Shilan Sara Hana Vian', l: 'Barzani Talabani Rasul Mustafa Ahmed Mahmoud Qadir Karim Salih Abdullah Hama Aziz',
  cities: [['xd_erbil', 'Erbil (Hewlêr)', '🏰', 'Capital region', 'large', 1600000, 0.5, 0.4], ['xd_sulaymaniyah', 'Sulaymaniyah (Silêmanî)', '⛰️', 'Mid-size city', 'large', 900000, 0.48, 0.38], ['xd_duhok', 'Duhok', '🏔️', 'Mid-size city', 'medium', 350000, 0.45, 0.36]],
  provinceWord: 'Governorate', gov: ['parliamentary', 'Kurdistan Parliament', 111, ['Patriotic Union of Kurdistan', 'Kurdistan Democratic Party'], 'President of Kurdistan'],
  tax: { allowance: 2500000, brackets: [[1000000, 0.03], [1000000, 0.05], [Infinity, 0.15]], vat: 0, corporate: 0.15, label: 'Kurdistan Ministry of Finance' },
  police: { name: 'Asayish and Kurdistan Police', head: 'Director General of Police', ranks: ['Police private', 'Police corporal', 'Police sergeant', 'Police lieutenant', 'Police captain', 'Police major', 'Police lieutenant colonel', 'Police colonel', 'Police brigadier', 'Police major general'] },
  forces: { army: 'the Peshmerga', navy: null, air: null }, navy: false,
  courts: { top: 'Court of Cassation of Kurdistan', high: 'Court of First Instance', appeal: 'Court of Appeal', magistrate: 'Investigative judge', appointedBy: 'the Judicial Council' },
  religion: { sunni: 85, mainline: 3, none: 12 }, emergency: '104', retire: 63,
  ruled: [],
});

export const XR = C('XR', 'Republika Srpska', 'Serb (of Republika Srpska)', 'Banja Luka', ['BAM', 'KM'], 0.9, 'yugoslav', {
  languages: ['Serbian'], pop: 1100, gdp: 16000, life: 77,
  m: 'Milorad Nenad Dragan Zoran Milan Nikola Stefan Marko Vladimir Goran Bojan Siniša', f: 'Jelena Milica Ana Marija Dragana Snežana Ivana Tijana Jovana Biljana Sanja Željka', l: 'Dodik Cvijanović Stanivuković Karan Petrović Jovanović Nikolić Marković Đurić Ilić Savić Kovačević',
  cities: [['xr_banjaluka', 'Banja Luka', '🏞️', 'Capital region', 'medium', 185000, 0.55, 0.42], ['xr_bijeljina', 'Bijeljina', '🌾', 'Small town', 'small', 107000, 0.5, 0.4], ['xr_trebinje', 'Trebinje', '🌉', 'Small town', 'small', 30000, 0.5, 0.4]],
  provinceWord: 'Region', gov: ['parliamentary', 'National Assembly of Republika Srpska', 83, ['Party of Democratic Progress', 'Alliance of Independent Social Democrats'], 'President of the Republic'],
  tax: { allowance: 0, brackets: [[Infinity, 0.08]], vat: 0.17, corporate: 0.1, label: 'Poreska uprava Republike Srpske' },
  police: { name: 'Police of Republika Srpska', head: 'Director of Police', ranks: ['Policajac', 'Mlađi inspektor', 'Inspektor', 'Viši inspektor', 'Samostalni inspektor', 'Glavni inspektor', 'Generalni inspektor', 'Direktor policije'] },
  forces: { army: 'Army of Republika Srpska', navy: null, air: null, ranks: { enlisted: ['Vojnik', 'Desetar', 'Mlađi vodnik', 'Vodnik', 'Vodnik I klase', 'Stariji vodnik', 'Stariji vodnik I klase', 'Zastavnik', 'Zastavnik I klase'], officer: ['Potporučnik', 'Poručnik', 'Kapetan', 'Major', 'Potpukovnik', 'Pukovnik', 'Brigadni general', 'General-major', 'General-potpukovnik', 'General'] } }, navy: false,
  courts: { top: 'Supreme Court of Republika Srpska', high: 'District Court', appeal: 'Supreme Court', magistrate: 'Basic Court judge', appointedBy: 'the High Judicial Council' },
  religion: { orthodox: 90, none: 10 }, emergency: '122', retire: 65,
  ruled: [],
});
