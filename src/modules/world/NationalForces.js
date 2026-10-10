/**
 * Every country's armed forces, laid over the military engine's US branch
 * templates (army, navy, airforce, marines, guard). A national branch keeps
 * the engine's specialties, promotion boards, deployments and discharges,
 * and brings its own name, ranks, training, bases, overseas postings, pay
 * level and combat exposure.
 *
 *   branches   template id → { name, icon, motto, basic, officerSchool, enlisted[9], officer[10] }
 *   bases      template id → [[regionId, base name]]
 *   overseas   template id → [[country, posting, years, accompaniable]]
 *   pay        multiplier on the engine's (US) pay scale, in PPP terms
 *   exposure   multiplier on combat exposure (Japan's forces don't fight abroad)
 *   conscription  see Conscription.js
 */

const ARMY_OFFICERS_EN = ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier', 'Major General', 'Lieutenant General', 'General'];

export const FORCES = {
  CA: {
    pay: 0.9, exposure: 0.6,
    branches: {
      army: { name: 'Canadian Army', icon: '🍁', motto: 'Vigilamus pro te', basic: 'Basic Military Qualification at CFLRS Saint-Jean', officerSchool: 'Basic Military Officer Qualification at Saint-Jean',
        enlisted: ['Private (Basic)', 'Private (Trained)', 'Corporal', 'Master Corporal', 'Sergeant', 'Warrant Officer', 'Master Warrant Officer', 'Chief Warrant Officer', 'Chief Warrant Officer (Command)'],
        officer: ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant-Colonel', 'Colonel', 'Brigadier-General', 'Major-General', 'Lieutenant-General', 'General'] },
      navy: { name: 'Royal Canadian Navy', icon: '⚓', motto: 'Ready Aye Ready', basic: 'Basic Military Qualification at CFLRS Saint-Jean', officerSchool: 'Naval Officer Training Centre Venture',
        enlisted: ['Sailor Third Class', 'Sailor Second Class', 'Sailor First Class', 'Master Sailor', 'Petty Officer 2nd Class', 'Petty Officer 1st Class', 'Chief Petty Officer 2nd Class', 'Chief Petty Officer 1st Class', 'Command Chief Petty Officer'],
        officer: ['Acting Sub-Lieutenant', 'Sub-Lieutenant', 'Lieutenant(N)', 'Lieutenant-Commander', 'Commander', 'Captain(N)', 'Commodore', 'Rear-Admiral', 'Vice-Admiral', 'Admiral'] },
      airforce: { name: 'Royal Canadian Air Force', icon: '✈️', motto: 'Sic itur ad astra', basic: 'Basic Military Qualification at CFLRS Saint-Jean', officerSchool: 'Basic Military Officer Qualification at Saint-Jean',
        enlisted: ['Aviator (Basic)', 'Aviator (Trained)', 'Corporal', 'Master Corporal', 'Sergeant', 'Warrant Officer', 'Master Warrant Officer', 'Chief Warrant Officer', 'Chief Warrant Officer (Command)'],
        officer: ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant-Colonel', 'Colonel', 'Brigadier-General', 'Major-General', 'Lieutenant-General', 'General'] },
      guard: { name: 'Canadian Army Reserve', icon: '🛡️', motto: 'Citizen soldiers', basic: 'Basic Military Qualification (Reserve)', officerSchool: 'Basic Military Officer Qualification (Reserve)',
        enlisted: ['Private (Basic)', 'Private (Trained)', 'Corporal', 'Master Corporal', 'Sergeant', 'Warrant Officer', 'Master Warrant Officer', 'Chief Warrant Officer', 'Chief Warrant Officer (Command)'],
        officer: ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant-Colonel', 'Colonel', 'Brigadier-General', 'Major-General', 'Lieutenant-General', 'General'] },
    },
    bases: {
      army: [['calgary', 'CFB Edmonton (3rd Canadian Division)'], ['ottawa', 'Garrison Petawawa'], ['montreal', 'CFB Valcartier'], ['halifax', 'CFB Gagetown']],
      navy: [['halifax', 'CFB Halifax'], ['vancouver', 'CFB Esquimalt']],
      airforce: [['ottawa', '8 Wing Trenton'], ['moosejaw', '15 Wing Moose Jaw'], ['calgary', '4 Wing Cold Lake'], ['halifax', '14 Wing Greenwood']],
    },
    overseas: {
      army: [['Latvia', 'NATO Multinational Brigade Latvia, Ādaži', 1, false], ['Germany', 'NATO Geilenkirchen', 3, true]],
      navy: [['Bahrain', 'Combined Maritime Forces', 1, false]],
      airforce: [['Germany', 'NATO AWACS, Geilenkirchen', 3, true], ['Kuwait', 'Operation IMPACT', 1, false]],
    },
  },
  GB: {
    pay: 0.78, exposure: 0.8,
    branches: {
      army: { name: 'British Army', icon: '🦁', motto: 'Be the Best', basic: 'Phase 1 training at ATC Pirbright', officerSchool: 'the Royal Military Academy Sandhurst',
        enlisted: ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Warrant Officer Class 2', 'Warrant Officer Class 1', 'Warrant Officer Class 1 (Senior)', 'Army Sergeant Major'], officer: ARMY_OFFICERS_EN },
      navy: { name: 'Royal Navy', icon: '⚓', motto: 'Si vis pacem, para bellum', basic: 'HMS Raleigh', officerSchool: 'Britannia Royal Naval College, Dartmouth',
        enlisted: ['Able Rating (in training)', 'Able Rating', 'Leading Rating', 'Petty Officer', 'Chief Petty Officer', 'Warrant Officer Class 2', 'Warrant Officer Class 1', 'Warrant Officer Class 1 (Senior)', 'Warrant Officer to the Royal Navy'],
        officer: ['Midshipman', 'Sub-Lieutenant', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Commodore', 'Rear Admiral', 'Vice Admiral', 'Admiral'] },
      airforce: { name: 'Royal Air Force', icon: '✈️', motto: 'Per ardua ad astra', basic: 'RAF Halton', officerSchool: 'RAF College Cranwell',
        enlisted: ['Aircraftman', 'Leading Aircraftman', 'Senior Aircraftman', 'Corporal', 'Sergeant', 'Flight Sergeant', 'Warrant Officer', 'Master Aircrew', 'Chief of the Air Staff\'s Warrant Officer'],
        officer: ['Pilot Officer', 'Flying Officer', 'Flight Lieutenant', 'Squadron Leader', 'Wing Commander', 'Group Captain', 'Air Commodore', 'Air Vice-Marshal', 'Air Marshal', 'Air Chief Marshal'] },
      marines: { name: 'Royal Marines', icon: '🗡️', motto: 'Per mare per terram', basic: 'the Commando Training Centre, Lympstone', officerSchool: 'Young Officer training at Lympstone',
        enlisted: ['Marine', 'Lance Corporal', 'Corporal', 'Sergeant', 'Colour Sergeant', 'Warrant Officer Class 2', 'Warrant Officer Class 1', 'Warrant Officer Class 1 (Senior)', 'Corps Regimental Sergeant Major'], officer: ARMY_OFFICERS_EN },
      guard: { name: 'Army Reserve', icon: '🛡️', motto: 'Be the Best', basic: 'Reserve recruit training', officerSchool: 'the Reserve Commissioning Course at Sandhurst',
        enlisted: ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Warrant Officer Class 2', 'Warrant Officer Class 1', 'Warrant Officer Class 1 (Senior)', 'Army Sergeant Major'], officer: ARMY_OFFICERS_EN },
    },
    bases: {
      army: [['cornwall', 'Tidworth Garrison'], ['birmingham', 'Catterick Garrison'], ['edinburgh', 'Redford Barracks'], ['cardiff', 'Brecon'], ['london', 'Aldershot Garrison'], ['belfast', 'Thiepval Barracks']],
      navy: [['cornwall', 'HMNB Devonport'], ['glasgow', 'HMNB Clyde (Faslane)'], ['london', 'HMNB Portsmouth']],
      airforce: [['london', 'RAF Brize Norton'], ['edinburgh', 'RAF Lossiemouth'], ['manchester', 'RAF Coningsby']],
      marines: [['cornwall', '42 Commando, Bickleigh'], ['glasgow', '45 Commando, Arbroath']],
    },
    overseas: {
      army: [['Estonia', 'Operation Cabrit, Tapa', 1, false], ['Cyprus', 'British Forces Cyprus, Dhekelia', 2, true], ['Brunei', 'British Forces Brunei', 3, true]],
      navy: [['Bahrain', 'UK Naval Support Facility', 2, true], ['Gibraltar', 'HMNB Gibraltar', 2, true]],
      airforce: [['Cyprus', 'RAF Akrotiri', 2, true], ['Falkland Islands', 'RAF Mount Pleasant', 1, false]],
      marines: [['Norway', 'Arctic deployment, Bardufoss', 1, false]],
    },
  },
  DE: {
    pay: 0.85, exposure: 0.5,
    branches: {
      army: { name: 'Heer (German Army)', icon: '🦅', motto: 'Wir. Dienen. Deutschland.', basic: 'Allgemeine Grundausbildung', officerSchool: 'the Offizierschule des Heeres, Dresden',
        enlisted: ['Schütze', 'Gefreiter', 'Obergefreiter', 'Hauptgefreiter', 'Unteroffizier', 'Feldwebel', 'Oberfeldwebel', 'Hauptfeldwebel', 'Oberstabsfeldwebel'],
        officer: ['Leutnant', 'Oberleutnant', 'Hauptmann', 'Major', 'Oberstleutnant', 'Oberst', 'Brigadegeneral', 'Generalmajor', 'Generalleutnant', 'General'] },
      navy: { name: 'Deutsche Marine', icon: '⚓', motto: 'Wir. Dienen. Deutschland.', basic: 'Marineunteroffizierschule Plön', officerSchool: 'the Marineschule Mürwik',
        enlisted: ['Matrose', 'Gefreiter', 'Obergefreiter', 'Hauptgefreiter', 'Maat', 'Bootsmann', 'Oberbootsmann', 'Hauptbootsmann', 'Oberstabsbootsmann'],
        officer: ['Leutnant zur See', 'Oberleutnant zur See', 'Kapitänleutnant', 'Korvettenkapitän', 'Fregattenkapitän', 'Kapitän zur See', 'Flottillenadmiral', 'Konteradmiral', 'Vizeadmiral', 'Admiral'] },
      airforce: { name: 'Luftwaffe', icon: '✈️', motto: 'Wir. Dienen. Deutschland.', basic: 'Allgemeine Grundausbildung (Luftwaffe)', officerSchool: 'the Offizierschule der Luftwaffe, Fürstenfeldbruck',
        enlisted: ['Flieger', 'Gefreiter', 'Obergefreiter', 'Hauptgefreiter', 'Unteroffizier', 'Feldwebel', 'Oberfeldwebel', 'Hauptfeldwebel', 'Oberstabsfeldwebel'],
        officer: ['Leutnant', 'Oberleutnant', 'Hauptmann', 'Major', 'Oberstleutnant', 'Oberst', 'Brigadegeneral', 'Generalmajor', 'Generalleutnant', 'General'] },
    },
    bases: {
      army: [['grafenwoehr', 'Truppenübungsplatz Grafenwöhr'], ['munich', 'Gebirgsjägerbrigade 23, Bad Reichenhall'], ['hamburg', 'Panzergrenadierbrigade 41, Neubrandenburg'], ['kaiserslautern', 'Division Schnelle Kräfte'], ['leipzig', 'Panzerbrigade 12']],
      navy: [['hamburg', 'Marinestützpunkt Kiel'], ['hamburg', 'Marinestützpunkt Wilhelmshaven']],
      airforce: [['cologne', 'Fliegerhorst Nörvenich'], ['munich', 'Taktisches Luftwaffengeschwader 74, Neuburg'], ['kaiserslautern', 'Fliegerhorst Büchel']],
    },
    overseas: {
      army: [['Lithuania', 'Panzerbrigade 45, Rūdninkai', 3, true], ['Kosovo', 'KFOR', 1, false]],
      navy: [['Lebanon', 'UNIFIL Maritime Task Force', 1, false]],
      airforce: [['Jordan', 'Al-Azraq Air Base', 1, false], ['United States', 'Holloman AFB training center', 3, true]],
    },
    conscription: 'questionnaire',
  },
  JP: {
    pay: 0.7, exposure: 0.1,
    branches: {
      army: { name: 'Japan Ground Self-Defense Force', icon: '🗾', motto: 'Defend the nation', basic: 'recruit training at a GSDF training unit', officerSchool: 'the GSDF Officer Candidate School, Kurume',
        enlisted: ['Private (2-shi)', 'Private First Class (1-shi)', 'Leading Private (Shichō)', 'Sergeant (3-sō)', 'Sergeant First Class (2-sō)', 'Master Sergeant (1-sō)', 'Sergeant Major (Sōchō)', 'Warrant Officer (Jun-i)', 'Senior Enlisted Advisor'],
        officer: ['Second Lieutenant (3-i)', 'First Lieutenant (2-i)', 'Captain (1-i)', 'Major (3-sa)', 'Lieutenant Colonel (2-sa)', 'Colonel (1-sa)', 'Major General (Shōho)', 'Lieutenant General (Shō)', 'Chief of Staff, GSDF', 'Chief of Staff, Joint Staff'] },
      navy: { name: 'Japan Maritime Self-Defense Force', icon: '⚓', motto: 'Guard the seas', basic: 'recruit training at Yokosuka', officerSchool: 'the MSDF Officer Candidate School, Etajima',
        enlisted: ['Seaman (2-shi)', 'Leading Seaman (1-shi)', 'Petty Officer (Shichō)', 'Petty Officer 3rd Class (3-sō)', 'Petty Officer 2nd Class (2-sō)', 'Petty Officer 1st Class (1-sō)', 'Chief Petty Officer (Sōchō)', 'Warrant Officer (Jun-i)', 'Senior Enlisted Advisor'],
        officer: ['Ensign (3-i)', 'Lieutenant JG (2-i)', 'Lieutenant (1-i)', 'Lieutenant Commander (3-sa)', 'Commander (2-sa)', 'Captain (1-sa)', 'Rear Admiral (Shōho)', 'Vice Admiral (Shō)', 'Chief of Staff, MSDF', 'Chief of Staff, Joint Staff'] },
      airforce: { name: 'Japan Air Self-Defense Force', icon: '✈️', motto: 'Guard the skies', basic: 'recruit training at Kumagaya', officerSchool: 'the ASDF Officer Candidate School, Nara',
        enlisted: ['Airman (2-shi)', 'Airman First Class (1-shi)', 'Leading Airman (Shichō)', 'Staff Sergeant (3-sō)', 'Technical Sergeant (2-sō)', 'Master Sergeant (1-sō)', 'Senior Master Sergeant (Sōchō)', 'Warrant Officer (Jun-i)', 'Senior Enlisted Advisor'],
        officer: ['Second Lieutenant (3-i)', 'First Lieutenant (2-i)', 'Captain (1-i)', 'Major (3-sa)', 'Lieutenant Colonel (2-sa)', 'Colonel (1-sa)', 'Major General (Shōho)', 'Lieutenant General (Shō)', 'Chief of Staff, ASDF', 'Chief of Staff, Joint Staff'] },
    },
    bases: {
      army: [['tokyo', 'Camp Asaka'], ['sapporo', 'Camp Makomanai'], ['fukuoka', 'Camp Kurume'], ['okinawa', 'Camp Naha'], ['osaka', 'Camp Itami']],
      navy: [['yokosuka', 'Yokosuka District'], ['osaka', 'Maizuru District'], ['fukuoka', 'Sasebo District']],
      airforce: [['tokyo', 'Iruma Air Base'], ['okinawa', 'Naha Air Base'], ['sapporo', 'Chitose Air Base'], ['fukuoka', 'Tsuiki Air Base']],
    },
    overseas: {
      army: [['Djibouti', 'JSDF Base Djibouti', 1, false]],
      navy: [['Djibouti', 'Deployment Surface Force for Counter-Piracy', 1, false]],
      airforce: [['Djibouti', 'JSDF Base Djibouti', 1, false]],
    },
  },
  KR: {
    pay: 0.6, exposure: 0.3,
    branches: {
      army: { name: 'Republic of Korea Army', icon: '🇰🇷', motto: 'Strong and trustworthy', basic: 'the Army Training Center, Nonsan', officerSchool: 'the Korea Army Academy at Yeongcheon',
        enlisted: ['Private (Ibyeong)', 'Private First Class (Ilbyeong)', 'Corporal (Sangbyeong)', 'Sergeant (Byeongjang)', 'Staff Sergeant (Hasa)', 'Sergeant First Class (Jungsa)', 'Master Sergeant (Sangsa)', 'Sergeant Major (Wonsa)', 'Warrant Officer (Junwi)'],
        officer: ['Second Lieutenant (Sowi)', 'First Lieutenant (Jungwi)', 'Captain (Daewi)', 'Major (Soryeong)', 'Lieutenant Colonel (Jungryeong)', 'Colonel (Daeryeong)', 'Brigadier General (Junjang)', 'Major General (Sojang)', 'Lieutenant General (Jungjang)', 'General (Daejang)'] },
      navy: { name: 'Republic of Korea Navy', icon: '⚓', motto: 'Protect the seas', basic: 'the Naval Education and Training Command, Jinhae', officerSchool: 'the Naval Officer Candidate School, Jinhae',
        enlisted: ['Seaman Recruit (Ibyeong)', 'Seaman Apprentice (Ilbyeong)', 'Seaman (Sangbyeong)', 'Leading Seaman (Byeongjang)', 'Petty Officer 3rd Class (Hasa)', 'Petty Officer 2nd Class (Jungsa)', 'Petty Officer 1st Class (Sangsa)', 'Chief Petty Officer (Wonsa)', 'Warrant Officer (Junwi)'],
        officer: ['Ensign (Sowi)', 'Lieutenant JG (Jungwi)', 'Lieutenant (Daewi)', 'Lieutenant Commander (Soryeong)', 'Commander (Jungryeong)', 'Captain (Daeryeong)', 'Rear Admiral LH (Junjang)', 'Rear Admiral (Sojang)', 'Vice Admiral (Jungjang)', 'Admiral (Daejang)'] },
      airforce: { name: 'Republic of Korea Air Force', icon: '✈️', motto: 'Guard the skies', basic: 'the Air Force Basic Military Training Wing, Jinju', officerSchool: 'the Air Force Officer Candidate School, Jinju',
        enlisted: ['Airman Basic (Ibyeong)', 'Airman (Ilbyeong)', 'Airman First Class (Sangbyeong)', 'Senior Airman (Byeongjang)', 'Staff Sergeant (Hasa)', 'Technical Sergeant (Jungsa)', 'Master Sergeant (Sangsa)', 'Chief Master Sergeant (Wonsa)', 'Warrant Officer (Junwi)'],
        officer: ['Second Lieutenant (Sowi)', 'First Lieutenant (Jungwi)', 'Captain (Daewi)', 'Major (Soryeong)', 'Lieutenant Colonel (Jungryeong)', 'Colonel (Daeryeong)', 'Brigadier General (Junjang)', 'Major General (Sojang)', 'Lieutenant General (Jungjang)', 'General (Daejang)'] },
      marines: { name: 'Republic of Korea Marine Corps', icon: '🦅', motto: 'Once a Marine, always a Marine', basic: 'the Marine Corps Training Center, Pohang', officerSchool: 'the Marine Officer Candidate School, Pohang',
        enlisted: ['Private (Ibyeong)', 'Private First Class (Ilbyeong)', 'Corporal (Sangbyeong)', 'Sergeant (Byeongjang)', 'Staff Sergeant (Hasa)', 'Sergeant First Class (Jungsa)', 'Master Sergeant (Sangsa)', 'Sergeant Major (Wonsa)', 'Warrant Officer (Junwi)'],
        officer: ['Second Lieutenant (Sowi)', 'First Lieutenant (Jungwi)', 'Captain (Daewi)', 'Major (Soryeong)', 'Lieutenant Colonel (Jungryeong)', 'Colonel (Daeryeong)', 'Brigadier General (Junjang)', 'Major General (Sojang)', 'Lieutenant General (Jungjang)', 'General (Daejang)'] },
    },
    bases: {
      army: [['pyeongtaek', 'Camp Humphreys (ROK Army liaison)'], ['suwon', 'Capital Defense Command'], ['seoul', 'Capital Mechanized Infantry Division'], ['pohang', '50th Infantry Division'], ['busan', '53rd Infantry Division']],
      navy: [['busan', 'Republic of Korea Fleet, Busan'], ['pyeongtaek', '2nd Fleet, Pyeongtaek'], ['jeju', 'Jeju Naval Base']],
      airforce: [['suwon', '10th Fighter Wing, Suwon'], ['pyeongtaek', 'Osan Air Base (ROKAF)'], ['busan', '5th Air Mobility Wing, Gimhae']],
      marines: [['pohang', '1st Marine Division, Pohang'], ['jeju', 'Jeju Defense Command']],
    },
    overseas: {
      army: [['Lebanon', 'Dongmyeong Unit (UNIFIL)', 1, false], ['South Sudan', 'Hanbit Unit (UNMISS)', 1, false], ['United Arab Emirates', 'Akh Unit', 1, false]],
      navy: [['Gulf of Aden', 'Cheonghae Unit', 1, false]],
    },
    conscription: 'korea',
  },
  IT: {
    pay: 0.7, exposure: 0.45,
    branches: {
      army: { name: 'Esercito Italiano', icon: '🇮🇹', motto: 'Salus rei publicae suprema lex esto', basic: 'the RAV training regiment', officerSchool: 'the Accademia Militare di Modena',
        enlisted: ['Soldato', 'Caporale', 'Caporal Maggiore', 'Caporal Maggiore Capo', 'Sergente', 'Sergente Maggiore', 'Maresciallo', 'Maresciallo Capo', 'Primo Luogotenente'],
        officer: ['Sottotenente', 'Tenente', 'Capitano', 'Maggiore', 'Tenente Colonnello', 'Colonnello', 'Generale di Brigata', 'Generale di Divisione', 'Generale di Corpo d\'Armata', 'Generale'] },
      navy: { name: 'Marina Militare', icon: '⚓', motto: 'Patria e onore', basic: 'the Scuola Sottufficiali, Taranto', officerSchool: 'the Accademia Navale, Livorno',
        enlisted: ['Comune di 2ª classe', 'Comune di 1ª classe', 'Sottocapo', 'Sottocapo Capo', 'Sergente', 'Secondo Capo', 'Capo di 3ª classe', 'Capo di 1ª classe', 'Primo Luogotenente'],
        officer: ['Guardiamarina', 'Sottotenente di Vascello', 'Tenente di Vascello', 'Capitano di Corvetta', 'Capitano di Fregata', 'Capitano di Vascello', 'Contrammiraglio', 'Ammiraglio di Divisione', 'Ammiraglio di Squadra', 'Ammiraglio'] },
      airforce: { name: 'Aeronautica Militare', icon: '✈️', motto: 'Virtute siderum tenus', basic: 'the Scuola Volontari, Taranto', officerSchool: 'the Accademia Aeronautica, Pozzuoli',
        enlisted: ['Aviere', 'Aviere Scelto', 'Primo Aviere', 'Primo Aviere Capo', 'Sergente', 'Sergente Maggiore', 'Maresciallo', 'Maresciallo Capo', 'Primo Luogotenente'],
        officer: ['Sottotenente', 'Tenente', 'Capitano', 'Maggiore', 'Tenente Colonnello', 'Colonnello', 'Generale di Brigata Aerea', 'Generale di Divisione Aerea', 'Generale di Squadra Aerea', 'Generale'] },
    },
    bases: {
      army: [['rome', 'Comando Forze Operative Terrestri'], ['vicenza', 'Caserma Ederle (Italian Army detachment)'], ['naples', 'Comando Forze Operative Sud'], ['aviano', 'Brigata Alpina Julia'], ['milan', 'Comando Militare Lombardia']],
      navy: [['naples', 'Naples naval base'], ['palermo', 'Augusta naval base'], ['rome', 'La Spezia naval base']],
      airforce: [['aviano', 'Aviano Air Base (Italian detachment)'], ['rome', 'Pratica di Mare'], ['palermo', 'Trapani-Birgi'], ['vicenza', 'Istrana']],
    },
    overseas: {
      army: [['Lebanon', 'UNIFIL Sector West', 1, false], ['Latvia', 'NATO eFP Latvia', 1, false], ['Kosovo', 'KFOR', 1, false]],
      navy: [['Djibouti', 'Base Militare Italiana di Supporto', 1, false]],
      airforce: [['Kuwait', 'Task Force Air Kuwait', 1, false]],
    },
  },
  MX: {
    pay: 0.32, exposure: 0.7,
    branches: {
      army: { name: 'Ejército Mexicano (SEDENA)', icon: '🇲🇽', motto: 'Lealtad, Honor, Valor', basic: 'basic training at a Centro de Adiestramiento', officerSchool: 'the Heroico Colegio Militar',
        enlisted: ['Recluta', 'Soldado', 'Cabo', 'Sargento Segundo', 'Sargento Primero', 'Sargento Primero (antiguo)', 'Subteniente (ascendido)', 'Teniente (ascendido)', 'Capitán Segundo (ascendido)'],
        officer: ['Subteniente', 'Teniente', 'Capitán Segundo', 'Capitán Primero', 'Mayor', 'Teniente Coronel', 'Coronel', 'General Brigadier', 'General de Brigada', 'General de División'] },
      navy: { name: 'Armada de México (SEMAR)', icon: '⚓', motto: 'Proteger a México', basic: 'the Centro de Capacitación Naval', officerSchool: 'the Heroica Escuela Naval Militar, Veracruz',
        enlisted: ['Marinero', 'Cabo', 'Tercer Maestre', 'Segundo Maestre', 'Primer Maestre', 'Primer Maestre (antiguo)', 'Teniente de Corbeta (ascendido)', 'Teniente de Fragata (ascendido)', 'Teniente de Navío (ascendido)'],
        officer: ['Guardiamarina', 'Teniente de Corbeta', 'Teniente de Fragata', 'Teniente de Navío', 'Capitán de Corbeta', 'Capitán de Fragata', 'Capitán de Navío', 'Contralmirante', 'Vicealmirante', 'Almirante'] },
      airforce: { name: 'Fuerza Aérea Mexicana', icon: '✈️', motto: 'Lealtad, Honor, Valor', basic: 'basic training at the Escuela Militar de Tropas Especialistas', officerSchool: 'the Colegio del Aire, Zapopan',
        enlisted: ['Recluta', 'Soldado', 'Cabo', 'Sargento Segundo', 'Sargento Primero', 'Sargento Primero (antiguo)', 'Subteniente (ascendido)', 'Teniente (ascendido)', 'Capitán Segundo (ascendido)'],
        officer: ['Subteniente', 'Teniente', 'Capitán Segundo', 'Capitán Primero', 'Mayor', 'Teniente Coronel', 'Coronel', 'General de Ala', 'General de Grupo', 'General de División'] },
    },
    bases: {
      army: [['cdmx', 'Campo Militar 1-A'], ['guadalajara', '15ª Zona Militar'], ['monterrey', '7ª Zona Militar'], ['merida', '32ª Zona Militar'], ['oaxaca', '28ª Zona Militar']],
      navy: [['cancun', 'Quinta Región Naval'], ['merida', 'Base Naval Yukalpetén'], ['cdmx', 'Secretaría de Marina headquarters']],
      airforce: [['cdmx', 'Base Aérea Militar No. 1, Santa Lucía'], ['monterrey', 'Base Aérea Militar No. 14'], ['guadalajara', 'Base Aérea Militar No. 5, Zapopan']],
    },
    overseas: {},
    conscription: 'smn',
  },
  PH: {
    pay: 0.28, exposure: 0.75,
    branches: {
      army: { name: 'Philippine Army', icon: '🇵🇭', motto: 'Serving the People, Securing the Land', basic: 'Candidate Soldier Course', officerSchool: 'the Philippine Military Academy, Baguio',
        enlisted: ['Private', 'Private First Class', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Technical Sergeant', 'Master Sergeant', 'Senior Master Sergeant', 'Chief Master Sergeant'],
        officer: ['Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'] },
      navy: { name: 'Philippine Navy', icon: '⚓', motto: 'Para sa Bayan', basic: 'the Naval Education, Training and Doctrine Command', officerSchool: 'the Philippine Military Academy',
        enlisted: ['Apprentice Seaman', 'Seaman Second Class', 'Seaman First Class', 'Petty Officer III', 'Petty Officer II', 'Petty Officer I', 'Chief Petty Officer', 'Senior Chief Petty Officer', 'Master Chief Petty Officer'],
        officer: ['Ensign', 'Lieutenant Junior Grade', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Commodore', 'Rear Admiral', 'Vice Admiral', 'Admiral'] },
      airforce: { name: 'Philippine Air Force', icon: '✈️', motto: 'Guardians of Our Precious Skies', basic: 'Candidate Airman Course', officerSchool: 'the Philippine Military Academy',
        enlisted: ['Airman', 'Airman First Class', 'Sergeant', 'Staff Sergeant', 'Technical Sergeant', 'Master Sergeant', 'Senior Master Sergeant', 'Chief Master Sergeant', 'First Chief Master Sergeant'],
        officer: ['Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'] },
      marines: { name: 'Philippine Marine Corps', icon: '🦅', motto: 'Karangalan, Katungkulan, Katapatan', basic: 'Marine Basic Training', officerSchool: 'the Marine Officer Candidate Course',
        enlisted: ['Private', 'Private First Class', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Technical Sergeant', 'Master Sergeant', 'Senior Master Sergeant', 'Chief Master Sergeant'],
        officer: ['Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'] },
    },
    bases: {
      army: [['manila', 'Fort Bonifacio'], ['angeles', 'Fort Magsaysay'], ['davao', '10th Infantry Division'], ['cebu', '3rd Infantry Division']],
      navy: [['manila', 'Naval Station Jose Andrada'], ['cebu', 'Naval Forces Central'], ['davao', 'Naval Forces Eastern Mindanao']],
      airforce: [['angeles', 'Clark Air Base'], ['manila', 'Villamor Air Base'], ['cebu', 'Mactan–Benito Ebuen Air Base']],
      marines: [['manila', 'Marine Barracks Rudiardo Brown'], ['davao', '2nd Marine Brigade']],
    },
    overseas: { navy: [['South China Sea', 'BRP Sierra Madre rotation, Ayungin Shoal', 1, false]] },
  },
  IN: {
    pay: 0.3, exposure: 0.75,
    branches: {
      army: { name: 'Indian Army', icon: '🇮🇳', motto: 'Service Before Self', basic: 'recruit training at a regimental centre', officerSchool: 'the Indian Military Academy, Dehradun',
        enlisted: ['Sepoy (Agniveer)', 'Lance Naik', 'Naik', 'Havildar', 'Naib Subedar', 'Subedar', 'Subedar Major', 'Honorary Lieutenant', 'Honorary Captain'],
        officer: ['Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier', 'Major General', 'Lieutenant General', 'Vice Chief of the Army Staff', 'General (Chief of the Army Staff)'] },
      navy: { name: 'Indian Navy', icon: '⚓', motto: 'Shaṃ No Varuṇaḥ', basic: 'INS Chilka', officerSchool: 'the Indian Naval Academy, Ezhimala',
        enlisted: ['Sailor (Agniveer)', 'Seaman 1', 'Leading Seaman', 'Petty Officer', 'Chief Petty Officer', 'Master Chief Petty Officer 2nd Class', 'Master Chief Petty Officer 1st Class', 'Honorary Sub Lieutenant', 'Honorary Lieutenant'],
        officer: ['Sub Lieutenant', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Commodore', 'Rear Admiral', 'Vice Admiral', 'Vice Chief of the Naval Staff', 'Admiral'] },
      airforce: { name: 'Indian Air Force', icon: '✈️', motto: 'Touch the Sky with Glory', basic: 'Airmen Training School, Belagavi', officerSchool: 'the Air Force Academy, Dundigal',
        enlisted: ['Airman (Agniveer)', 'Leading Aircraftman', 'Corporal', 'Sergeant', 'Junior Warrant Officer', 'Warrant Officer', 'Master Warrant Officer', 'Honorary Flying Officer', 'Honorary Flight Lieutenant'],
        officer: ['Flying Officer', 'Flight Lieutenant', 'Squadron Leader', 'Wing Commander', 'Group Captain', 'Air Commodore', 'Air Vice Marshal', 'Air Marshal', 'Vice Chief of the Air Staff', 'Air Chief Marshal'] },
    },
    bases: {
      army: [['delhi', 'Delhi Cantonment'], ['varanasi', 'Varanasi Cantonment'], ['kolkata', 'Eastern Command, Fort William'], ['bengaluru', 'ASC Centre, Bengaluru'], ['chennai', 'Dakshin Bharat Area']],
      navy: [['mumbai', 'Western Naval Command'], ['chennai', 'INS Adyar'], ['kolkata', 'INS Netaji Subhas']],
      airforce: [['delhi', 'Air Force Station Palam'], ['bengaluru', 'Air Force Station Yelahanka'], ['chennai', 'Air Force Station Tambaram']],
    },
    overseas: {
      army: [['Democratic Republic of the Congo', 'MONUSCO', 1, false], ['Lebanon', 'UNIFIL', 1, false], ['South Sudan', 'UNMISS', 1, false]],
      navy: [['Gulf of Aden', 'anti-piracy patrol', 1, false]],
    },
  },
};

/** The national branch laid over a template, or null. */
export function nationalBranch(countryId, templateId) {
  const def = FORCES[countryId]?.branches?.[templateId];
  return def ? { ...def, warrant: [], country: countryId } : null;
}

/** Template ids of a country's forces, in display order. */
export const nationalBranchIds = (countryId) => Object.keys(FORCES[countryId]?.branches ?? {});
export const nationalBases = (countryId, templateId) => FORCES[countryId]?.bases?.[templateId] ?? FORCES[countryId]?.bases?.army ?? [];
export const nationalOverseas = (countryId, templateId) => FORCES[countryId]?.overseas?.[templateId] ?? [];
export const nationalPay = (countryId) => FORCES[countryId]?.pay ?? 1;
export const nationalExposure = (countryId) => FORCES[countryId]?.exposure ?? 1;
