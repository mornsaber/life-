/**
 * Spain, built on France: a civil-law EU state with a national police and
 * a military-status gendarmerie (the Guardia Civil), municipal police in
 * every town, regional police in Catalonia and the Basque Country, and
 * autonomous communities with their own parliaments.
 *
 * Amounts are euros converted at OECD 2023 PPP (€0.61 per US$), 2025 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const EUR = 0.61;
const ppp = (local) => Math.round(local / EUR);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const R = (...colors) => colors.map((c) => [c, 1]);
const region = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.006, salesTax: 0.21, rightToWork: false, cannabis: false, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: ppp(8.9), population: 'large', disasters: { wildfire: 0.03, flood: 0.03 }, ...extra });
const city = (c) => c.split(',')[0];
const ARMY_OFFICERS = ['Alférez', 'Teniente', 'Capitán', 'Comandante', 'Teniente coronel', 'Coronel', 'General de brigada', 'General de división', 'Teniente general', 'General de ejército'];
const ARMY_ENLISTED = ['Soldado', 'Cabo', 'Cabo primero', 'Sargento', 'Sargento primero', 'Brigada', 'Subteniente', 'Suboficial mayor', 'Suboficial mayor (Jefe de Estado Mayor)'];
/** Regional police in two communities; the Policía Nacional everywhere else. */
const REGIONAL_POLICE = { 'ES-CT': 'Mossos d\'Esquadra', 'ES-PV': 'Ertzaintza' };
const EMS = { Madrid: 'SAMUR-Protección Civil (Ayuntamiento de Madrid)', Barcelona: 'Sistema d\'Emergències Mèdiques (SEM)', Bilbao: 'Osakidetza — Emergencias' };

export const ES = {
  id: 'ES',
  basedOn: 'FR',
  groups: ['EU', 'RICH_SYSTEMS'],
  agreements: ['US', 'CA', 'GB', 'DE', 'FR', 'IT', 'JP', 'KR', 'MX', 'PH', 'AU', 'IE'],
  licenceExchange: ['DE', 'FR', 'IT', 'IE', 'GB', 'JP', 'KR', 'MX', 'PH'],
  country: {
    name: 'Spain',
    flag: '🇪🇸',
    demonym: 'Spanish',
    capital: 'Madrid',
    currency: { code: 'EUR', symbol: '€', perUsd: EUR },
    languages: ['Spanish'],
    emergency: '112',
    retirementAge: 67,
    tax: {
      // IRPF 2025, state and average regional scale combined: 19% to €12,450; 24% to €20,200; 30% to €35,200;
      // 37% to €60,000; 45% to €300,000; 47% above. The €5,550 personal minimum works as an allowance.
      allowance: ppp(5550),
      brackets: [[ppp(6900), 0.19], [ppp(14650), 0.24], [ppp(29650), 0.3], [ppp(54450), 0.37], [ppp(294450), 0.45], [Infinity, 0.47]],
      // Employee social security 6.48% (common contingencies, unemployment, training, MEI) up to the €58,914 maximum base.
      contributions: [{ name: 'Seguridad Social', rate: 0.0648, from: 0, to: ppp(58914) }],
      label: 'Agencia Tributaria',
    },
    // Retirement pension: up to 100% of the regulatory base (the best 25 years) after 36½ years; 15 years minimum.
    pension: { kind: 'cpp', name: 'Pensión de jubilación (Seguridad Social)', years: 25, cap: ppp(58914), replace: 0.8, flat: 0, ages: [65, 67] },
    health: { name: 'the Sistema Nacional de Salud', short: 'SNS', deductible: 0, coinsurance: 0.02, oopMax: ppp(300) },
    // The child supplement to the minimum income (CAPI), for lower-income families.
    childBenefit: { amount: ppp(1300), phaseOutFrom: ppp(30000), name: 'Complemento de ayuda para la infancia' },
    terms: {
      'Federal government': 'Gobierno de España', 'National government': 'Gobierno de España', 'State government': 'Comunidad autónoma', 'Regional council': 'Comunidad autónoma',
      'Federal income tax': 'IRPF', 'State income tax': 'IRPF (tramo autonómico)', 'Social Security': 'pensión (Seguridad Social)', '401(k)': 'plan de pensiones de empleo',
      IRS: 'Agencia Tributaria', DGFiP: 'Agencia Tributaria', Medicaid: 'SNS', Medicare: 'SNS', 'Assurance Maladie': 'SNS', 'GI Bill': 'veterans training support',
      'Impôt sur le revenu': 'IRPF', 'retraite (CNAV)': 'pensión (Seguridad Social)', 'PER collectif': 'plan de pensiones de empleo',
    },
    names: {
      male: ['Hugo', 'Martín', 'Lucas', 'Mateo', 'Leo', 'Daniel', 'Alejandro', 'Pablo', 'Manuel', 'Álvaro', 'Javier', 'Adrián', 'Diego', 'Jorge', 'Iker', 'Pol'],
      female: ['Lucía', 'Sofía', 'Martina', 'María', 'Julia', 'Paula', 'Valeria', 'Emma', 'Daniela', 'Carla', 'Alba', 'Noa', 'Carmen', 'Laura', 'Elena', 'Ainhoa'],
      last: ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Puig'],
    },
    provinces: {
      'ES-MD': region('Comunidad de Madrid', { population: 'enterprise', disasters: { wildfire: 0.02, blizzard: 0.01 } }),
      'ES-CT': region('Catalonia', { population: 'enterprise', disasters: { wildfire: 0.04, flood: 0.03 } }),
      'ES-AN': region('Andalusia', { population: 'enterprise', disasters: { wildfire: 0.05, flood: 0.03, earthquake: 0.01 } }),
      'ES-VC': region('Valencian Community', { disasters: { flood: 0.06, wildfire: 0.04 } }),
      'ES-PV': region('Basque Country', { population: 'medium', disasters: { flood: 0.04 } }),
      'ES-AR': region('Aragon', { population: 'medium', disasters: { wildfire: 0.03, flood: 0.02 } }),
    },
    cities: {
      madrid: { name: 'Madrid', icon: '🐻', type: 'High-cost metro', state: 'ES-MD', col: 1.15, market: 0.85, locality: 0.22, transit: 90, fare: ppp(30), walkable: true, size: 'mega', population: [3400000, 6900000] },
      barcelona: { name: 'Barcelona', icon: '⛪', type: 'High-cost metro', state: 'ES-CT', col: 1.15, market: 0.85, locality: 0.22, transit: 90, fare: ppp(40), walkable: true, size: 'enterprise', population: [1660000, 5700000] },
      seville: { name: 'Seville', icon: '💃', type: 'Major metro', state: 'ES-AN', col: 0.92, market: 0.72, locality: 0.18, transit: 55, fare: ppp(35), walkable: true, size: 'large', population: [685000, 1550000] },
      malaga: { name: 'Málaga', icon: '🏖️', type: 'Coastal metro', state: 'ES-AN', col: 1.0, market: 0.75, locality: 0.18, transit: 50, fare: ppp(35), walkable: true, size: 'large', population: [590000, 1000000] },
      valenciaES: { name: 'Valencia, Spain', icon: '🍊', type: 'Major metro', state: 'ES-VC', col: 0.95, market: 0.74, locality: 0.18, transit: 65, fare: ppp(35), walkable: true, size: 'large', population: [800000, 1600000] },
      bilbao: { name: 'Bilbao', icon: '🏛️', type: 'Mid-size city', state: 'ES-PV', col: 1.02, market: 0.82, locality: 0.2, transit: 70, fare: ppp(40), walkable: true, size: 'medium', population: [345000, 1000000] },
      zaragoza: { name: 'Zaragoza', icon: '⛲', type: 'Mid-size city', state: 'ES-AR', col: 0.9, market: 0.74, locality: 0.18, transit: 55, fare: ppp(30), walkable: true, size: 'large', population: [680000, 780000] },
    },
    hometowns: ['madrid', 'madrid', 'madrid', 'barcelona', 'barcelona', 'seville', 'malaga', 'valenciaES', 'bilbao', 'zaragoza'],
    population: { 'ES-MD': 7e6, 'ES-CT': 8e6, 'ES-AN': 8.6e6, 'ES-VC': 5.3e6, 'ES-PV': 2.2e6, 'ES-AR': 1.35e6 },
  },
  offices: {
    es_diputadoAut: { country: 'ES', name: 'Diputado autonómico (regional parliament)', icon: '🇪🇸', level: 3, term: 4, termLimit: 0, salary: 80000, minAge: 18, residency: 0, cost: 40000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    es_presidenteAut: { country: 'ES', name: 'Presidente de la comunidad autónoma', icon: '⭐', level: 4, term: 4, termLimit: 0, salary: 150000, minAge: 18, residency: 0, cost: 200000, requires: ['es_diputadoAut'], leader: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
    es_diputado: { country: 'ES', name: 'Diputado (Congreso de los Diputados)', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 90000, minAge: 18, residency: 0, cost: 80000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    es_senador: { country: 'ES', name: 'Senador', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 90000, minAge: 18, residency: 0, cost: 60000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    es_presidente: { country: 'ES', name: 'Presidente del Gobierno', icon: '🇪🇸', level: 5, term: 4, termLimit: 0, salary: 150000, minAge: 18, residency: 0, cost: 1500000, requires: ['es_diputado'], leader: true, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  communities: {
    latinAmerican: { male: ['Juan', 'Carlos', 'Luis', 'José', 'Andrés', 'Santiago', 'Sebastián'], female: ['Valentina', 'Camila', 'Gabriela', 'Daniela', 'Mariana', 'Andrea', 'Natalia'], last: ['Rojas', 'Castillo', 'Vargas', 'Ramírez', 'Torres', 'Morales', 'Herrera'] },
  },
  tables: {
    /* Law and money */
    JUSTICE: { trial: 'jury', juror: 'service on a jurado popular (Tribunal del Jurado)', jurorPay: ppp(67), sentence: 0.45, jail: (c) => `Centro Penitenciario ${city(c)}`, prison: 'a centro penitenciario', legalAid: 'abogado de oficio (justicia gratuita)', privatePrisons: 0 },
    INSOLVENCY: { liquidation: { name: 'Ley de Segunda Oportunidad (exoneración)', wait: 2, plan: 3 }, plan: { name: 'Plan de pagos (segunda oportunidad)', years: 5, wait: 2 }, homestead: 0, wildcard: ppp(3000), creditYears: 6 },
    // Inheritance tax is set by each region; most now nearly exempt children up to about €1 million.
    INHERITANCE: { name: 'Impuesto sobre Sucesiones', perHeir: true, exemption: ppp(1000000), brackets: [[ppp(800000), 0.15], [Infinity, 0.3]] },
    UNEMPLOYMENT: { name: 'Prestación por desempleo (paro)', rate: 0.6, cap: ppp(27000), years: 2 },
    SEVERANCE: { perYear: 0.67 },
    DISABILITY: { name: 'Incapacidad permanente (INSS)', rate: 0.55, floor: ppp(8000), cap: ppp(40000), minYears: 2, odds: 1.2 },
    SELF_EMPLOYED: { name: 'cuota de autónomos (RETA)', rate: 0.3, cap: ppp(58914) },
    CREDIT: { name: 'CIRBE and ASNEF credit files', registry: true },
    SMALL_BIZ_LOAN: 'ICO-backed loan',
    VETERANS: { orgs: ['Asociación de Veteranos de las Fuerzas Armadas', 'Hermandad de Veteranos de las FAS y la Guardia Civil'], care: 'the Ministerio de Defensa (Subdirección de Reclutamiento y Orientación Laboral)' },
    STOCK_INDEX: 'IBEX 35',
    MORTGAGES: {
      // Banks lend 80% of value; buyers pay transfer tax (ITP) or VAT on new homes.
      closing: 0.1, stress: 0.01,
      products: {
        fijo25: { name: 'Hipoteca a tipo fijo (25-yr)', years: 25, rateAdj: -0.03, minDown: 0.2, minScore: 600, maxDti: 0.35 },
        variable: { name: 'Hipoteca variable (Euríbor + diferencial)', years: 30, rateAdj: -0.034, minDown: 0.2, minScore: 600, maxDti: 0.35, arm: true, reset: 1 },
      },
    },
    UNIONS: { police: 'JUPOL / SUP', fire: 'CSIF Bomberos', ems: 'CCOO Sanidad', health: 'SATSE', education: 'CCOO Enseñanza', public: 'CSIF', prisons: 'ACAIP-UGT', transport: 'CCOO Transportes', rail: 'SEMAF', aviation: 'USO-Sector Aéreo', pilots: 'SEPLA', trades: 'CCOO Construcción', industry: 'UGT FICA', retail: 'FeSMC-UGT', hospitality: 'CCOO Hostelería', services: 'UGT Servicios', media: 'FeSP', tech: 'CCOO Servicios (TIC)', arts: 'Unión de Actores', postal: 'CCOO Correos' },
    CADETS: { jrotc: null, seaCadets: null },
    FOREIGN_SERVICE_EXAM: 'Oposición a la Carrera Diplomática',
    PROSECUTORS: ['Ministerio Fiscal', 'Turno de oficio', 'Servicio de Gestión de Penas y Medidas Alternativas'],
    VOLUNTEER_RANKS: { fire: ['Bombero voluntario en prácticas', 'Bombero voluntario', 'Bombero voluntario veterano', 'Conductor', 'Cabo', 'Sargento', 'Jefe de agrupación'], ambulance: ['Voluntario en formación', 'Voluntario de Protección Civil', 'Técnico en Emergencias Sanitarias', 'Jefe de equipo', 'Jefe de sección', 'Jefe de unidad', 'Jefe de agrupación'], cert: ['Voluntario', 'Jefe de equipo', 'Jefe de sección', 'Coordinador de la agrupación'] },
    VOLUNTEER_SERVICES: { fire: 'Bomberos voluntarios', police: null, sar: 'Grupo de Rescate de Montaña', ambulance: 'Protección Civil (voluntarios)', wildland: 'Agrupación de Defensa Forestal', auxiliary: 'Salvamento Marítimo (voluntarios)', cap: null, cert: 'Protección Civil municipal', redcross: 'Cruz Roja Española', skiPatrol: 'Socorristas de pista', mrc: null },
    NATIONAL_SERVICE: { overseas: 'Cuerpo Europeo de Solidaridad', domestic: null },
    ACCOUNTS: { dc: 'Plan de pensiones de empleo', roth: { name: 'Fondo de inversión (traspasable)', limit: ppp(60000) }, traditional: { name: 'Plan de pensiones individual', limit: ppp(1500), share: 1 } },
    REFERENDUMS: {
      consultaLocal: { name: 'Consulta popular municipal on pedestrianising the centre', icon: '🚶', support: 0.55, effects: { services: 2 }, pitch: 'Close the old town to cars, as the council proposes.' },
    },
    ENTRANCE_EXAMS: { name: 'PAU (selectividad)', prep: { name: 'an exam academy', cost: ppp(1500) }, weight: 0.6 },
    AVIATION_AUTHORITY: 'AESA',
    COUNTY: 'Provincia',
    LONG_TERM_CARE: { name: 'Ley de Dependencia care allowance', covers: 0.45, safetyNet: 'the autonomous community\'s social services' },
    WORKPLACE: { equality: 'Inspección de Trabajo and the juzgado de lo social', reservist: 'reservist job protection (Ley de la Carrera Militar)', labourBoard: 'the juzgado de lo social' },
    EQUIPMENT: {
      'Digital radio + body camera kit': 'Emisora SIRDEE + cámara corporal', 'Patrol sedan': 'Coche patrulla (Seat León)', 'Police SUV': 'Todoterreno policial (Nissan X-Trail)', 'Pumper engine': 'Bomba urbana pesada (BUP)', '100-ft aerial ladder truck': 'Autoescala (AEA)',
      HMMWV: 'URO VAMTAC', JLTV: 'RG-31 Nyala', 'M2 Bradley': 'Pizarro', Stryker: 'Dragón (VCR 8×8)', 'M1A2 Abrams': 'Leopardo 2E', 'F-16': 'Eurofighter Typhoon', 'F-35A': 'Eurofighter Halcón', 'C-130J': 'A400M', 'MH-60R Seahawk': 'SH-60B Seahawk', 'F/A-18E/F Super Hornet': 'EF-18M Hornet', 'AAV-7 amphibious assault vehicle': 'Piraña IIIC', 'MV-22 Osprey': 'AV-8B Harrier II Plus',
    },
    LOCAL_ENTITIES: { sole: 'Autónomo', llc: null, ccorp: 'Sociedad Limitada (S.L.)' },
    PRIVATE_TITLES: { 'Junior Analyst': 'Analista junior', Analyst: 'Analista', 'Senior Analyst': 'Analista sénior', 'Team Supervisor': 'Jefe de equipo', 'Operations Manager': 'Responsable de operaciones', Director: 'Director', 'Senior Director': 'Director de área', 'Vice President': 'Director general adjunto', 'Chief Executive Officer': 'Consejero delegado', 'Store Manager': 'Director de tienda' },

    /* Schools and credentials */
    EDUCATION: {
      // Public university about €1,200 a year; no student-loan system.
      tuition: { community: ppp(0), technical: ppp(0), online: ppp(1000), state: ppp(1200), private: ppp(10000), elite: ppp(1500) },
      schools: { community: 'Ciclo Formativo de Grado Superior', technical: 'Instituto de Formación Profesional', online: 'UNED', state: 'Universidad de Sevilla', private: 'Universidad de Navarra', elite: 'Universidad Complutense de Madrid', academy: 'Academia General Militar (Zaragoza)' },
      words: { 'High School': 'Instituto', 'high-school diploma': 'Bachillerato', 'high school': 'instituto', GED: 'Prueba de acceso para mayores de 25' },
      licenses: {
        'State Bar License': 'Colegiación como abogado (Máster de Acceso + examen estatal)', 'Medical License (MD)': 'Colegiación médica (Grado en Medicina)', 'Board Certification': 'Título de especialista (MIR)',
        'Certified Public Accountant (CPA)': 'Auditor de cuentas (ROAC)', 'Peace Officer (POST Basic Academy)': 'Escuela Nacional de Policía (Ávila)', 'Registered Nurse (RN)': 'Colegiación de enfermería',
        'Commercial Driver License (Class A)': 'Permiso C+E', 'Commercial Driver License (Class B)': 'Permiso C', 'Driver\'s License (Class D)': 'Permiso de conducir B', 'Learner\'s Permit': 'Permiso en prácticas (L)',
        'Professional Engineer (PE)': 'Ingeniero colegiado', 'EMT (NREMT)': 'Técnico en Emergencias Sanitarias (TES)', 'Paramedic (NRP)': 'Enfermero de emergencias extrahospitalarias', 'Pharmacist License (NAPLEX + MPJE)': 'Colegiación farmacéutica',
      },
    },
    SHORT_CYCLE: 'Técnico Superior (FP de Grado Superior)',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'Permiso B', 'Heavy goods vehicle licence (articulated)': 'Permiso C+E', 'Heavy goods vehicle licence (rigid)': 'Permiso C', 'Bus & coach licence': 'Permiso D', 'Security licence': 'TIP de vigilante de seguridad', 'Construction site safety card': 'Tarjeta Profesional de la Construcción' },
    PROFESSIONAL_DEGREES: { jd: 'Grado en Derecho + Máster de Acceso a la Abogacía', md: 'Grado en Medicina (6 años)' },
    UNDERGRAD_ENTRY: { jd: 4, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'FP Dual', years: 2, pay: ppp(9000), exam: 'título de Técnico' },

    /* Moving here */
    WORKING_HOLIDAY: { name: 'Visado de vacaciones y trabajo', odds: 0.9, years: 1, fee: 100, once: true, partners: { AU: 30, NZ: 30, CA: 35, JP: 30, KR: 30 } },
    IMMIGRATION: {
      visas: {
        work: { name: 'Autorización de residencia y trabajo (cuenta ajena)', odds: 0.6, years: 1, degree: true, fee: 200 },
        transfer: { name: 'Traslado intraempresarial (Ley de Emprendedores)', odds: 0.9, years: 3, fee: 200 },
        student: { name: 'Autorización de estancia por estudios', odds: 0.85, years: 4, postStudy: 1, fee: 100 },
        family: { name: 'Tarjeta de familiar de ciudadano de la UE', odds: 0.85, years: 5, fee: 20 },
        retiree: { name: 'Visado de residencia no lucrativa', odds: 0.8, amount: ppp(28800), minAge: 18, years: 1, fee: 100 },
      },
      pr: { name: 'Residencia de larga duración', years: 5, fee: 25 },
      // Ten years' legal residence (two for Ibero-Americans and Filipinos, one if married to a Spaniard).
      nat: { years: 10, married: 1, fast: { MX: 2, PH: 2 }, needsPR: false, fee: 120 },
      dualIn: false, dualOut: false, birthright: false, prLapse: 1,
      intlTuition: { mult: 1.5, floor: ppp(2000) },
    },
    ASYLUM: { name: 'Solicitud de protección internacional (OAR)', odds: 0.2, decision: 2, workAfter: 0.5, prYears: 0, support: ppp(4000), temporary: 'Protección temporal' },
    LICENCE_EXCHANGE: ['DE', 'FR', 'IT', 'IE', 'GB', 'JP', 'KR', 'MX', 'PH'],
    OVERSTAY_BAN: 5,
    BIRTH_REGISTRATION: { name: 'inscripción en el Registro Civil Consular', fee: 0, deadline: false },
    PARENT_VISAS: { name: 'Reagrupación familiar de ascendientes', needs: 'resident', odds: 0.3, wait: 2, fee: 100 },
    DIASPORA: { share: 0.18, from: [['latinAmerican', 4], ['maghreb', 3], ['romanian', 2], ['GB', 1], ['IT', 1], ['chinese', 1]] },

    /* Government and politics */
    LEGISLATURES: {
      prov: { name: (p) => `Parliament of ${p}`, seats: 100, presiding: 'President of the Parliament', office: 'es_diputadoAut', exec: 'Presidente autonómico', execOffice: 'es_presidenteAut', veto: false },
      lower: { name: 'Congreso de los Diputados', seats: 350, presiding: 'Presidente del Congreso', office: 'es_diputado' },
      upper: { name: 'Senado', seats: 266, presiding: 'Presidente del Senado', office: 'es_senador' },
      exec: 'Presidente del Gobierno', execOffice: 'es_presidente', veto: false,
    },
    PARTY_NAMES: { labor: 'PSOE', business: 'Partido Popular' },
    CORPORATE_RATE: 0.25,
    HEALTH_SYSTEMS: { wait: 5, waitName: 'lista de espera quirúrgica', private: { name: 'Seguro médico privado (Sanitas, Adeslas)', premium: ppp(700), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military'], association: ['police'] },
    AGENCIES: {
      fbi: { name: 'Policía Nacional — Policía Judicial', employers: ['Comisaría General de Policía Judicial (UDEV, UDYCO)', 'Brigada Provincial de Policía Judicial, Madrid'], titles: { trainee: 'Alumno (Escuela Nacional de Policía)', agent: 'Policía', senior: 'Oficial de policía', bau: 'Analista de conducta (SAC)', ssa: 'Subinspector', asac: 'Inspector jefe', sac_cmd1: 'Comisario', sac_cmd2: 'Comisario principal', sac_cmd3: 'Director Adjunto Operativo', sac: 'Comisario General de Policía Judicial' } },
      usms: { name: 'Guardia Civil', employers: ['Guardia Civil — puesto territorial', 'Guardia Civil — UCO'], titles: { trainee: 'Guardia alumno (Baeza)', agent: 'Guardia civil', senior: 'Cabo', ssa: 'Sargento', asac: 'Teniente', sac: 'General de la Guardia Civil' } },
      usss: { name: 'Policía Nacional — Protección (Casa Real y Gobierno)', employers: ['Unidad Central de Protección'] },
      dea: { name: 'Unidad de Drogas y Crimen Organizado (UDYCO)', employers: ['UDYCO Central'] },
      borderPatrol: { name: 'Policía Nacional — Fronteras / Vigilancia Aduanera', employers: ['Puesto fronterizo, Aeropuerto Adolfo Suárez Madrid-Barajas', 'Vigilancia Aduanera — Algeciras'] },
      federalPrisons: { name: 'Instituciones Penitenciarias', employers: ['Centro Penitenciario Madrid VII (Estremera)', 'Centre Penitenciari Brians 1'] },
      postal: { name: 'Correos', employers: ['Correos — unidad de reparto'] },
      benefitsClaims: { name: 'INSS / SEPE', employers: ['Centro de Atención e Información de la Seguridad Social', 'Oficina de empleo (SEPE)'] },
      caseOfficer: { name: 'Centro Nacional de Inteligencia (CNI)', employers: ['CNI — Madrid'] },
      sigint: { name: 'CNI / Centro Criptológico Nacional', employers: ['Centro Criptológico Nacional'] },
      intelligence: { name: 'CNI — Inteligencia', employers: ['CNI — Madrid'] },
      meteorology: { name: 'AEMET', employers: ['AEMET — Madrid'] },
      regulatory: { name: 'Financial Regulation (CNMV · Banco de España · AEAT)', employers: ['CNMV', 'Banco de España', 'Agencia Tributaria'] },
      foreignService: { name: 'Ministerio de Asuntos Exteriores', employers: ['Palacio de Santa Cruz'] },
      parkService: { name: 'Agente Forestal / Parques Nacionales', employers: ['Parque Nacional de Doñana', 'Parque Nacional del Teide'] },
      airTrafficControl: { name: 'ENAIRE air traffic control', employers: ['ENAIRE — Centro de Control de Madrid', 'ENAIRE — Centro de Control de Barcelona'] },
      nationalLab: { name: 'CSIC', employers: ['CSIC', 'CIEMAT'] },
      oig: { name: 'Tribunal de Cuentas', employers: ['Tribunal de Cuentas'] },
    },
    LOCAL_AGENCIES: (b) => ({
      ...b,
      education: { name: 'Enseñanza pública', citizensOnly: true, employer: (c) => `IES — ${city(c)} (Consejería de Educación)`, titles: { sub: 'Profesor interino', teacher: 'Profesor de secundaria', senior: 'Catedrático de secundaria', coach: 'Asesor de formación', specialist: 'Orientador', chair: 'Jefe de departamento', ap: 'Jefe de estudios', principal: 'Director de instituto', director: 'Inspector de educación', assistantSuper: 'Inspector jefe', ...cmd('superintendent', ['Director territorial de educación', 'Viceconsejero de educación'], 'Consejero de educación') } },
      municipalAdmin: { name: 'Ayuntamiento', employer: (c) => `Ayuntamiento de ${city(c)}`, titles: { clerk: 'Auxiliar administrativo', deputyClerk: 'Administrativo', cityClerk: 'Secretario del ayuntamiento', analyst: 'Técnico de administración general', seniorAnalyst: 'Técnico superior', financeDirector: 'Interventor', manager: 'Jefe de servicio', acm: 'Director general', ...cmd('cityManager', ['Coordinador general', 'Gerente de área', 'Director de gabinete'], 'Gerente municipal') } },
      police: {
        name: 'Policía Local', employer: (c) => `Policía Municipal de ${city(c)}`,
        titles: { recruit: 'Policía en prácticas', officer: 'Policía', senior: 'Policía (agente tutor)', detective: 'Policía (unidad de investigación)', seniorDetective: 'Policía (policía judicial)', detSergeant: 'Oficial (investigación)', detLieutenant: 'Subinspector (investigación)', detCaptain: 'Inspector (investigación)', sergeant: 'Oficial', lieutenant: 'Subinspector', captain: 'Inspector', deputyChief: 'Intendente', ...cmd('chief', ['Intendente principal', 'Comisario', 'Comisario principal'], 'Jefe del Cuerpo de Policía Local') },
      },
      statePolice: {
        name: 'Policía Nacional (Seguridad Ciudadana)', citizensOnly: true, employer: (c, s) => (REGIONAL_POLICE[s] ? `${REGIONAL_POLICE[s]} — ${city(c)}` : `Comisaría de Policía Nacional, ${city(c)}`),
        titles: { cadet: 'Alumno (Escuela Nacional de Policía)', trooper: 'Policía', senior: 'Oficial de policía', investigator: 'Policía (Policía Judicial)', majorCrimes: 'Policía (Grupo de Homicidios)', detSergeant: 'Subinspector (Policía Judicial)', detLieutenant: 'Inspector (Policía Judicial)', detCaptain: 'Inspector jefe (Policía Judicial)', sergeant: 'Subinspector', lieutenant: 'Inspector', captain: 'Inspector jefe', major: 'Comisario', ...cmd('superintendent', ['Comisario principal', 'Jefe Superior de Policía', 'Comisario General', 'Director Adjunto Operativo'], 'Director General de la Policía') },
      },
      fire: {
        name: 'Bomberos', employer: (c) => ({ Madrid: 'Cuerpo de Bomberos del Ayuntamiento de Madrid', Barcelona: 'Bombers de Barcelona', Bilbao: 'Bomberos de Bilbao' }[city(c)] ?? `Bomberos de ${city(c)}`),
        titles: { recruit: 'Bombero en prácticas', firefighter: 'Bombero', engineer: 'Bombero conductor', inspector: 'Técnico de prevención', investigator: 'Investigador de incendios', lieutenant: 'Cabo', captain: 'Sargento', battalion: 'Suboficial', deputyChief: 'Oficial', ...cmd('chief', ['Jefe de zona', 'Jefe de guardia', 'Subjefe del cuerpo'], 'Jefe del Cuerpo de Bomberos') },
      },
      ems: {
        name: 'Emergencias sanitarias', employer: (c, s) => EMS[city(c)] ?? (s === 'ES-AN' ? 'EPES 061 Andalucía' : '112 — Servicio de Urgencias Médicas'),
        titles: { emt: 'Técnico en Emergencias Sanitarias (TES)', paramedic: 'Enfermero de emergencias', criticalCare: 'Enfermero de UVI móvil', flight: 'Enfermero de helicóptero sanitario', fto: 'Formador de emergencias', supervisor: 'Supervisor de guardia', captain: 'Jefe de sección', deputy: 'Jefe de servicio', ...cmd('chief', ['Subdirector asistencial', 'Director asistencial', 'Gerente adjunto'], 'Gerente de emergencias') },
      },
      dispatch: { name: 'Centro 112', employer: (c, s, sn) => `Centro de Emergencias 112 — ${sn}`, titles: { trainee: 'Teleoperador en prácticas', telecommunicator: 'Gestor de emergencias 112', senior: 'Coordinador de sala', training: 'Formador 112', supervisor: 'Jefe de sala', ...cmd('director', ['Jefe de turno', 'Subdirector del 112'], 'Director del 112') } },
      prosecution: { name: 'Ministerio Fiscal', employer: (c) => `Fiscalía Provincial de ${city(c)}`, titles: { clerk: 'Tramitador procesal', ada: 'Abogado fiscal', senior: 'Fiscal', trial: 'Fiscal de sala', chiefDeputy: 'Teniente fiscal', ...cmd('first', ['Fiscal jefe provincial', 'Fiscal superior de la comunidad', 'Teniente Fiscal del Tribunal Supremo'], 'Fiscal General del Estado') } },
      corrections: { name: 'Instituciones Penitenciarias', employer: (c, s) => (s === 'ES-CT' ? 'Serveis Penitenciaris de Catalunya' : `Centro Penitenciario ${city(c)}`) },
    }),
    POLICE_UNITS: { k9: 'Unidad de Guías Caninos', swat: 'Grupo Especial de Operaciones (GEO)', traffic: 'Agrupación de Tráfico', narcotics: 'Grupo de Estupefacientes', gang: 'Unidad de Prevención y Reacción (UPR)', negotiator: 'Negociador (GEO)', ia: 'Unidad de Asuntos Internos', protection: 'Unidad Central de Protección' },
    POLICE_BUREAUS: { homicide: 'Grupo de Homicidios', svu: 'Unidad de Atención a la Familia y Mujer (UFAM)', property: 'Grupo de Delincuencia Patrimonial', robbery: 'Grupo de Atracos', cyber: 'Unidad Central de Ciberdelincuencia' },
    VOLUNTEER_MEDAL: 'Medalla al Mérito de la Protección Civil',

    /* The armed forces (Fuerzas Armadas) */
    FORCES: {
      pay: 0.6, exposure: 0.6,
      branches: {
        army: { name: 'Ejército de Tierra', icon: '🇪🇸', motto: 'Todo por la Patria', basic: 'the Centro de Formación de Tropa, Cáceres', officerSchool: 'the Academia General Militar, Zaragoza', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
        navy: { name: 'Armada Española', icon: '⚓', motto: 'Todo por la Patria', basic: 'the Escuela de Especialidades Antonio de Escaño, Ferrol', officerSchool: 'the Escuela Naval Militar, Marín',
          enlisted: ['Marinero', 'Cabo', 'Cabo primero', 'Sargento', 'Sargento primero', 'Brigada', 'Subteniente', 'Suboficial mayor', 'Suboficial mayor de la Armada'],
          officer: ['Alférez de fragata', 'Alférez de navío', 'Teniente de navío', 'Capitán de corbeta', 'Capitán de fragata', 'Capitán de navío', 'Contraalmirante', 'Vicealmirante', 'Almirante', 'Almirante general'] },
        airforce: { name: 'Ejército del Aire y del Espacio', icon: '✈️', motto: 'Per aspera ad astra', basic: 'the Escuela de Técnicas Aeronáuticas, Torrejón', officerSchool: 'the Academia General del Aire, San Javier',
          enlisted: ['Soldado', 'Cabo', 'Cabo primero', 'Sargento', 'Sargento primero', 'Brigada', 'Subteniente', 'Suboficial mayor', 'Suboficial mayor del Ejército del Aire'], officer: ARMY_OFFICERS },
        marines: { name: 'Infantería de Marina', icon: '⚓', motto: 'Valientes por tierra y por mar', basic: 'the Escuela de Infantería de Marina General Albacete y Fuster, Cartagena', officerSchool: 'the Escuela Naval Militar, Marín', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
        guard: { name: 'Reservistas voluntarios', icon: '🛡️', motto: 'Todo por la Patria', basic: 'formación militar básica de reservistas', officerSchool: 'the reserve officer course at the Academia General Militar', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
      },
      bases: {
        army: [['madrid', 'Base Príncipe, Paracuellos (Brigada Paracaidista)'], ['zaragoza', 'Base San Jorge (Brigada Aragón)'], ['seville', 'Base Cerro Muriano'], ['valenciaES', 'Base Jaime I, Bétera'], ['malaga', 'Base Álvarez de Sotomayor, Viator'], ['bilbao', 'Acuartelamiento Soyeche']],
        navy: [['malaga', 'Base Naval de Rota'], ['madrid', 'Cuartel General de la Armada']],
        airforce: [['madrid', 'Base Aérea de Torrejón'], ['zaragoza', 'Base Aérea de Zaragoza'], ['seville', 'Base Aérea de Morón']],
        marines: [['malaga', 'Tercio de Armada, San Fernando']],
      },
      overseas: {
        army: [['Lebanon', 'UNIFIL (Brigada Líbano)', 1, false], ['Latvia', 'NATO Forward Land Forces', 1, false], ['Mali', 'EUTM', 1, false]],
        navy: [['Indian Ocean', 'Operación Atalanta', 1, false], ['Mediterranean', 'Operación Sea Guardian', 1, false]],
        airforce: [['Lithuania', 'NATO Baltic Air Policing', 1, false], ['Djibouti', 'Destacamento Orión', 1, false]],
        marines: [['Somalia coast', 'Operación Atalanta (boarding team)', 1, false]],
      },
    },
    MIL_SPECIAL: {
      drill: { names: 'Instructor de formación básica' },
      recruiter: { names: 'Orientador de reclutamiento (Subdelegación de Defensa)' },
      honorGuard: { names: 'Guardia Real', desc: 'Palacio Real, the Fiesta Nacional parade on 12 October and state visits.' },
      rotc: null,
      joint: { names: 'Oficial del Estado Mayor de la Defensa (Retamares)' },
      fellow: null,
      commissioning: 'Promoción interna to the Academia General Militar',
      chiefs: { army: 'Jefe de Estado Mayor del Ejército de Tierra', navy: 'Almirante Jefe de Estado Mayor de la Armada', airforce: 'Jefe de Estado Mayor del Ejército del Aire y del Espacio', marines: 'Comandante General de la Infantería de Marina' },
      chairman: 'Jefe de Estado Mayor de la Defensa',
    },
    PME: { enlisted: ['Curso de ascenso a cabo', 'Curso de acceso a la Escala de Suboficiales', 'Curso de ascenso a brigada', 'Curso de capacitación para subteniente', 'Curso de suboficial mayor'], officer: ['Curso de capacitación para comandante', 'Curso de Estado Mayor (ESFAS)', 'Curso Superior de Defensa Nacional (CESEDEN)'] },
    QUALS: { airborne: 'Curso de paracaidista (Escuela Militar de Paracaidismo, Alcantarilla)', rangerSchool: 'Curso de Operaciones Especiales (Jaca)', jumpmaster: 'Curso de jefe de salto', pathfinder: 'Curso de precursor paracaidista', combatDiver: 'Curso de buceador de combate', dli: 'Escuela Conjunta de Idiomas', instructor: 'Curso de instructor', sere: 'Curso de supervivencia, evasión y resistencia' },
    SOF: {
      ranger: sf('Mando de Operaciones Especiales (MOE)', 'el Curso de Operaciones Especiales en Jaca', 'Grupo de Operaciones Especiales "Valencia" III, Alicante', 'boina verde', 'Las "boinas verdes" del Ejército: reconocimiento y acción directa.', ['una misión en el Sahel', 'una alerta de rescate de rehenes']),
      seal: sf('Fuerza de Guerra Naval Especial (FGNE)', 'el curso de Guerra Naval Especial en Cartagena', 'Fuerza de Guerra Naval Especial, Cartagena', 'distintivo de Guerra Naval Especial', 'Operaciones especiales de la Armada.', ['un abordaje en el Índico (Atalanta)', 'una alerta antiterrorista marítima']),
      pararescue: sf('Escuadrón de Zapadores Paracaidistas (EZAPAC)', 'la selección EZAPAC', 'EZAPAC, Alcantarilla', 'distintivo EZAPAC', 'Rescate de personal y guía aérea.', ['una alerta de recuperación de pilotos']),
    },
    BILLETS: { ground: { member: 'Fusilero', teamLeader: 'Jefe de equipo (cabo)', squadLeader: 'Jefe de pelotón', platoonSergeant: 'Suboficial de sección', opsNco: 'Suboficial de operaciones', firstSergeant: 'Suboficial de compañía', seniorStaffNco: 'Brigada de batallón', csm: 'Suboficial mayor del batallón', platoonLeader: 'Jefe de sección', xo: 'Segundo jefe de compañía', companyCommander: 'Jefe de compañía', staff: 'Oficial de operaciones (S3)', battalionCommander: 'Jefe de batallón', higher: 'Estado mayor de brigada', units: { squad: 'Pelotón', platoon: 'Sección', company: 'Compañía', battalion: 'Batallón' } } },
    MIL_UNITS: { ground: ['Brigada Paracaidista "Almogávares" VI', 'Regimiento de Infantería "Inmemorial del Rey" n.º 1', 'Legión Española — Tercio "Gran Capitán"', 'Brigada Acorazada "Guadarrama" XII'], naval: ['Portaaviones Juan Carlos I', 'Fragata Álvaro de Bazán', 'Fragata Blas de Lezo', 'Buque de Acción Marítima Audaz'], air: ['Ala 11 (Morón)', 'Ala 12 (Torrejón)', 'Ala 31 (Zaragoza)'], marines: ['Tercio de Armada', 'Tercio del Norte', 'Tercio de Levante'] },
    MIL_SUMMARY: 'an expediente disciplinario',
    SERVICE_TERMS: { maxYears: { enlisted: 45, officer: 45 }, ages: { enlisted: 65, officer: 65, flag: 65 }, join: { enlisted: [18, 29], officer: [18, 30] }, name: 'compromiso' },
    MILITARY_JUSTICE: { code: 'the Código Penal Militar', court: 'Tribunal Militar Territorial', prison: 'the Establecimiento Penitenciario Militar de Alcalá de Henares', counsel: 'abogado defensor' },
    VETTING: { form: 'cuestionario de habilitación personal de seguridad (Oficina Nacional de Seguridad)', publicTrust: 'Difusión limitada', secret: 'Habilitación Reservado', topSecret: 'Habilitación Secreto' },
    CAMPUS: null,
    ACADEMY_NAMES: { army: 'Academia General Militar (Zaragoza)', navy: 'Escuela Naval Militar (Marín)', airforce: 'Academia General del Aire (San Javier)' },
    THEATERS: [
      { id: 'peacekeeping', name: 'a UN peacekeeping mission in Lebanon that turned into combat', adversary: 'militias', intensity: 1, home: 0, weight: 20 },
      { id: 'sahel', name: 'an EU training mission in the Sahel that turned into combat', adversary: 'jihadist groups', intensity: 1, home: 0.01, weight: 15 },
      { id: 'natoEast', name: 'a NATO war on the eastern flank after an invasion of the Baltic states', adversary: 'Russia', intensity: 2, home: 0.03, weight: 10, alliance: 'nato' },
      { id: 'major', name: 'a great-power war', adversary: 'a rival bloc', intensity: 3, home: 0.1, weight: 4, alliance: 'all' },
    ],
    WAR_START_CHANCE: 0.008,
    MEDALS: {
      moh: { name: 'Cruz Laureada de San Fernando', ribbon: R('#c8102e', '#ffd100', '#c8102e') }, serviceCross: { name: 'Medalla Militar' }, silverStar: { name: 'Cruz de Guerra' },
      dsm: { name: 'Gran Cruz del Mérito Militar' }, legionOfMerit: { name: 'Cruz del Mérito Militar con distintivo blanco' }, bronzeStar: { name: 'Cruz del Mérito Militar con distintivo rojo' }, purpleHeart: { name: 'Cruz del Mérito Militar (por heridas en acto de servicio)' },
      msm: { name: 'Cruz del Mérito Naval / Aeronáutico' }, commendation: { name: 'Mención honorífica' }, achievement: { name: 'Felicitación individual' },
      combatAction: null, goodConduct: { name: 'Cruz a la Constancia en el Servicio' }, humanitarian: { name: 'Medalla de Operaciones de Mantenimiento de la Paz' }, expeditionary: { name: 'Medalla OTAN / UE' }, ndsm: null,
    },
    ORDERS: {
      minAge: 30,
      tiers: [
        { id: 'cruzMC', name: 'Cruz de la Orden del Mérito Civil', min: 40, ribbon: R('#1f5fbf', '#fff', '#1f5fbf') },
        { id: 'encomienda', name: 'Encomienda de la Orden de Isabel la Católica', min: 80, ribbon: R('#ffd100', '#fff', '#ffd100') },
        { id: 'encomiendaNum', name: 'Encomienda de Número de la Orden del Mérito Civil', min: 120, ribbon: R('#1f5fbf', '#fff', '#1f5fbf') },
        { id: 'granCruz', name: 'Gran Cruz de la Orden de Carlos III', min: 180, ribbon: R('#1f5fbf', '#fff', '#1f5fbf') },
        { id: 'titulo', name: { male: 'Marqués (a hereditary title from the King)', female: 'Marquesa (a hereditary title from the King)' }, min: 260, peer: true, ribbon: R('#c8102e', '#ffd100', '#c8102e') },
      ],
    },
  },
};
