/**
 * The Netherlands, built on Germany: an EU civil-law state with one national
 * police force (Nationale Politie), fire services run by safety regions,
 * compulsory private health insurance, the AOW state pension and a two-
 * chamber parliament whose senate is chosen by the provinces.
 *
 * Amounts are euros converted at OECD 2023 PPP (€0.76 per US$), 2025 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const EUR = 0.76;
const ppp = (local) => Math.round(local / EUR);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const R = (...colors) => colors.map((c) => [c, 1]);
const province = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.001, salesTax: 0.21, rightToWork: false, cannabis: true, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: ppp(14.06), population: 'large', disasters: { flood: 0.03, hurricane: 0.01 }, ...extra });
const town = (c) => c.split(',')[0];
const ARMY_OFFICERS = ['Tweede luitenant', 'Eerste luitenant', 'Kapitein', 'Majoor', 'Luitenant-kolonel', 'Kolonel', 'Brigadegeneraal', 'Generaal-majoor', 'Luitenant-generaal', 'Generaal'];
const ARMY_ENLISTED = ['Soldaat', 'Korporaal', 'Korporaal der 1e klasse', 'Sergeant', 'Sergeant der 1e klasse', 'Sergeant-majoor', 'Adjudant', 'Adjudant (bataljonsadjudant)', 'Sergeant-majoor van de Landmacht'];
/** Each city's safety region, which runs its fire service and 112 control room. */
const REGION = { Amsterdam: 'Amsterdam-Amstelland', Rotterdam: 'Rotterdam-Rijnmond', 'The Hague': 'Haaglanden', Utrecht: 'Utrecht', Eindhoven: 'Brabant-Zuidoost', Groningen: 'Groningen', Nijmegen: 'Gelderland-Zuid' };
const regio = (c) => REGION[town(c)] ?? town(c);

export const NL = {
  id: 'NL',
  basedOn: 'DE',
  groups: ['EU', 'RICH_SYSTEMS'],
  agreements: ['US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'IE', 'JP', 'KR', 'AU', 'NZ', 'MX', 'PH', 'IN'],
  licenceExchange: ['GB', 'IE', 'CA', 'JP', 'KR', 'AU', 'NZ'],
  peers: [],
  country: {
    name: 'Netherlands',
    flag: '🇳🇱',
    demonym: 'Dutch',
    capital: 'Amsterdam',
    emergency: '112',
    currency: { code: 'EUR', symbol: '€', perUsd: EUR },
    languages: ['Dutch'],
    retirementAge: 67,
    tax: {
      // Box 1 2025, national insurance included: 35.82% to €38,441; 37.48% to €76,817; 49.5% above.
      // The general and labour tax credits work like an allowance of about €18,000.
      allowance: ppp(18000),
      // (The first band's 35.82% is 8.17% tax plus 27.65% national insurance — AOW, Anw and Wlz.)
      brackets: [[ppp(20441), 0.0817], [ppp(58817), 0.3748], [Infinity, 0.495]],
      contributions: [{ name: 'Volksverzekeringen (AOW, Anw, Wlz)', rate: 0.2765, from: ppp(18000), to: ppp(38441) }],
      label: 'Belastingdienst',
    },
    // AOW 2025: about €17,600 a year for a single person at 67, building 2% a year over 50 years' residence.
    pension: { kind: 'flat', name: 'AOW', full: ppp(17600), years: 50, minYears: 1, ages: [67, 67] },
    // Basic insurance is compulsory and private: about €1,900 a year, with a €385 compulsory excess.
    health: { name: 'basisverzekering (Zorgverzekeringswet)', short: 'Zvw', deductible: ppp(385), coinsurance: 0, oopMax: ppp(385) },
    childBenefit: { amount: ppp(1350), phaseOutFrom: Infinity, name: 'Kinderbijslag' },
    terms: {
      'Federal government': 'Rijksoverheid', 'National government': 'Rijksoverheid', 'State government': 'Province', 'Federal income tax': 'Inkomstenbelasting', 'State income tax': 'Gemeentelijke belastingen',
      'Social Security': 'AOW', '401(k)': 'pensioenfonds', IRA: 'lijfrente', IRS: 'Belastingdienst', Medicaid: 'zorgtoeslag', Medicare: 'Zvw', 'GI Bill': 'Veteraneninstituut support',
      deductible: 'eigen risico', Deductible: 'Eigen risico', 'high school': 'secondary school', 'High School': 'Secondary School',
    },
    names: {
      male: ['Noah', 'Luca', 'Liam', 'Sem', 'Finn', 'Daan', 'Levi', 'Milan', 'Bram', 'Jesse', 'Thijs', 'Ruben', 'Lars', 'Mohammed', 'Sven', 'Jan'],
      female: ['Emma', 'Julia', 'Mila', 'Tess', 'Sophie', 'Zoë', 'Sara', 'Nora', 'Fenna', 'Lotte', 'Eva', 'Anna', 'Saar', 'Noor', 'Fleur', 'Sanne'],
      last: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Janssen', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'de Groot', 'Bos', 'Vos', 'Peters'],
    },
    provinces: {
      'NL-NH': province('North Holland', { population: 'enterprise' }),
      'NL-ZH': province('South Holland', { population: 'enterprise', disasters: { flood: 0.04 } }),
      'NL-UT': province('Utrecht', { population: 'medium' }),
      'NL-NB': province('North Brabant'),
      'NL-GR': province('Groningen', { population: 'small', disasters: { earthquake: 0.02, flood: 0.03 } }),
      'NL-GE': province('Gelderland', { disasters: { flood: 0.04 } }),
    },
    cities: {
      amsterdam: { name: 'Amsterdam', icon: '🚲', type: 'High-cost metro', state: 'NL-NH', col: 1.3, market: 0.95, locality: 0.24, transit: 90, fare: ppp(100), walkable: true, size: 'large', population: [930000, 2500000] },
      rotterdam: { name: 'Rotterdam', icon: '⚓', type: 'Major metro', state: 'NL-ZH', col: 1.05, market: 0.9, locality: 0.21, transit: 80, fare: ppp(90), walkable: true, size: 'large', population: [665000, 1800000] },
      thehague: { name: 'The Hague', icon: '⚖️', type: 'Capital region', state: 'NL-ZH', col: 1.1, market: 0.92, locality: 0.22, transit: 80, fare: ppp(90), walkable: true, size: 'large', population: [560000, 1100000] },
      utrecht: { name: 'Utrecht', icon: '🏰', type: 'Mid-size city', state: 'NL-UT', col: 1.15, market: 0.92, locality: 0.22, transit: 80, fare: ppp(90), walkable: true, size: 'medium', population: [370000, 920000] },
      eindhoven: { name: 'Eindhoven', icon: '💡', type: 'Mid-size city', state: 'NL-NB', col: 1.0, market: 0.9, locality: 0.2, transit: 60, fare: ppp(80), walkable: true, size: 'medium', population: [240000, 780000] },
      groningen: { name: 'Groningen', icon: '🎓', type: 'Mid-size city', state: 'NL-GR', col: 0.92, market: 0.82, locality: 0.19, transit: 65, fare: ppp(75), walkable: true, size: 'medium', population: [240000, 370000] },
      nijmegen: { name: 'Nijmegen', icon: '🌉', type: 'Mid-size city', state: 'NL-GE', col: 0.95, market: 0.84, locality: 0.19, transit: 60, fare: ppp(75), walkable: true, size: 'medium', population: [180000, 750000] },
    },
    hometowns: ['amsterdam', 'amsterdam', 'rotterdam', 'thehague', 'utrecht', 'eindhoven', 'groningen', 'nijmegen'],
    population: { 'NL-NH': 2.95e6, 'NL-ZH': 3.8e6, 'NL-UT': 1.4e6, 'NL-NB': 2.65e6, 'NL-GR': 0.6e6, 'NL-GE': 2.2e6 },
  },
  offices: {
    nl_tk: { country: 'NL', name: 'Member of the House of Representatives (Tweede Kamer)', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 165000, minAge: 18, residency: 0, cost: 30000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    // The Senate is elected by the members of the provincial councils: hold a council seat first.
    nl_ek: { country: 'NL', name: 'Senator (Eerste Kamer)', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 50000, minAge: 18, residency: 0, cost: 20000, requires: ['cityCouncil', 'mayor', 'nl_tk'], kind: 'legislative', pension: 'electedOfficials' },
    nl_mp: { country: 'NL', name: 'Minister-President', icon: '🇳🇱', level: 5, term: 4, termLimit: 0, salary: 260000, minAge: 18, residency: 0, cost: 600000, requires: ['nl_tk'], leader: true, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  communities: {
    surinamese: { male: ['Ricardo', 'Raoul', 'Glenn', 'Rishi', 'Sunil', 'Romano', 'Dwight'], female: ['Shanti', 'Priya', 'Ingrid', 'Ashley', 'Kavita', 'Naomi', 'Sharon'], last: ['Ramdin', 'Pinas', 'Biharie', 'Doelwijt', 'Sewdien', 'Kartosen', 'Fung A Loi'] },
  },
  tables: {
    JUSTICE: { trial: 'bench', sentence: 0.35, jail: (c) => `Huis van Bewaring ${town(c)}`, prison: 'a penitentiaire inrichting', legalAid: 'pro deo advocaat (Raad voor Rechtsbijstand)', privatePrisons: 0 },
    INSOLVENCY: { liquidation: { name: 'Faillissement', wait: 6 }, plan: { name: 'Wettelijke schuldsanering (WSNP)', years: 1.5, wait: 2 }, homestead: 0, wildcard: ppp(3000), creditYears: 5, registry: true },
    INHERITANCE: { name: 'Erfbelasting', perHeir: true, exemption: ppp(26230), brackets: [[ppp(152368), 0.1], [Infinity, 0.2]] },
    UNEMPLOYMENT: { name: 'WW-uitkering', rate: 0.72, cap: ppp(75000), years: 2 },
    SEVERANCE: { perYear: 0.33 },
    DISABILITY: { name: 'WIA-uitkering', rate: 0.7, floor: ppp(10000), cap: ppp(75000), minYears: 0, odds: 1.2, stages: ['Wachttijd (two years of sickness pay)', 'UWV assessment', 'Bezwaar', 'Rechtbank'] },
    SELF_EMPLOYED: { name: 'no compulsory social insurance (zzp)', rate: 0 },
    CREDIT: { name: 'BKR credit registration', registry: true },
    SMALL_BIZ_LOAN: 'Qredits microcredit',
    VETERANS: { orgs: ['Veteraneninstituut', 'Bond van Nederlandse Militaire Oorlogs- en Dienstslachtoffers'], care: 'the Veteraneninstituut and the Landelijk Zorgsysteem voor Veteranen' },
    STOCK_INDEX: 'AEX',
    MORTGAGES: {
      closing: 0.04, stress: 0.01,
      products: {
        annuity10: { name: 'Annuïteitenhypotheek, 10-yr fixed (30-yr)', years: 30, rateAdj: -0.03, minDown: 0, minScore: 600, maxDti: 0.33 },
        annuity20: { name: 'Annuïteitenhypotheek, 20-yr fixed (30-yr)', years: 30, rateAdj: -0.028, minDown: 0, minScore: 600, maxDti: 0.33 },
        variable: { name: 'Variabele rente (30-yr)', years: 30, rateAdj: -0.032, minDown: 0, minScore: 600, maxDti: 0.33, arm: true, reset: 1 },
      },
    },
    UNIONS: { police: 'Nederlandse Politiebond', fire: 'FNV Brandweer', ems: 'FNV Zorg & Welzijn (ambulance)', health: 'NU\'91', education: 'AOb', public: 'FNV Overheid', prisons: 'FNV Justitie', transport: 'FNV Transport & Logistiek', rail: 'VVMC', aviation: 'FNV Luchtvaart', pilots: 'VNV (Dutch Airline Pilots Association)', trades: 'FNV Bouwen & Wonen', industry: 'FNV Metaal', retail: 'FNV Handel', hospitality: 'FNV Horeca', services: 'CNV Vakmensen', media: 'NVJ', tech: 'De Unie', arts: 'Kunstenbond', postal: 'FNV Post' },
    CADETS: { jrotc: null, seaCadets: 'Zeekadetkorps Nederland' },
    FOREIGN_SERVICE_EXAM: 'Diplomatieke opleiding ("het klasje") assessment',
    PROSECUTORS: ['Openbaar Ministerie', 'Raad voor Rechtsbijstand', 'Reclassering Nederland'],
    VOLUNTEER_SERVICES: { fire: 'Vrijwillige brandweer', police: 'Politievrijwilliger', sar: null, ambulance: 'EHBO-vereniging', wildland: null, auxiliary: 'KNRM reddingsstation', cap: null, cert: null, redcross: 'Nederlandse Rode Kruis Noodhulpteam', skiPatrol: null, mrc: null },
    VOLUNTEER_RANKS: { fire: ['Aspirant brandwacht', 'Brandwacht', 'Manschap A', 'Chauffeur/pompbediende', 'Bevelvoerder', 'Officier van dienst', 'Postcommandant'], police: ['Aspirant politievrijwilliger', 'Politievrijwilliger (surveillant)', 'Politievrijwilliger (agent)', 'Politievrijwilliger (hoofdagent)', 'Brigadier (vrijwilliger)', 'Inspecteur (vrijwilliger)', 'Coördinator politievrijwilligers'], auxiliary: ['Aspirant opstapper', 'Opstapper', 'Schipper', 'Plaatsvervangend schipper-coördinator', 'Schipper-coördinator'] },
    NATIONAL_SERVICE: { overseas: null, domestic: 'Maatschappelijke Diensttijd' },
    ACCOUNTS: { dc: 'Pensioenfonds (ABP, PFZW…)', roth: { name: 'Beleggingsrekening (box 3)', limit: ppp(60000) }, traditional: { name: 'Lijfrente', limit: ppp(10000), share: 1 } },
    REFERENDUMS: {
      gemeentelijk: { name: 'Gemeentelijk referendum on a new residential district', icon: '🏘️', support: 0.5, effects: { levy: 40, services: 2 }, pitch: 'Build 5,000 homes on the edge of town, as the council proposes.' },
    },
    ENTRANCE_EXAMS: { name: 'VWO eindexamen', prep: { name: 'bijles (tutoring)', cost: ppp(1200) }, weight: 0.5 },
    AVIATION_AUTHORITY: 'ILT (Inspectie Leefomgeving en Transport)',
    COUNTY: 'Gemeente',
    LONG_TERM_CARE: { name: 'Wet langdurige zorg (Wlz)', covers: 0.85, safetyNet: 'the CAK' },
    WORKPLACE: { equality: 'College voor de Rechten van de Mens', reservist: 'reservist job protection (Wet ambtenaren defensie)', labourBoard: 'the kantonrechter' },
    EQUIPMENT: {
      'Digital radio + body camera kit': 'C2000 portofoon + bodycam', 'Patrol sedan': 'Politieauto (Volkswagen Touran)', 'Police SUV': 'Politiebus (Mercedes Vito)', 'Pumper engine': 'Tankautospuit (TS)', '100-ft aerial ladder truck': 'Autoladder (AL)',
      HMMWV: 'Fennek', JLTV: 'Bushmaster', 'M2 Bradley': 'CV90', Stryker: 'Boxer', 'M1A2 Abrams': 'Leopard 2A8', 'F-16': 'F-35A Lightning II', 'F-35A': 'F-35A Lightning II', 'C-130J': 'C-390 Millennium', 'MH-60R Seahawk': 'NH90 NFH', 'F/A-18E/F Super Hornet': 'NH90 NFH', 'AAV-7 amphibious assault vehicle': 'BvS10 Viking', 'MV-22 Osprey': 'CH-47F Chinook',
    },
    LOCAL_ENTITIES: { sole: 'Eenmanszaak', llc: 'Vennootschap onder firma (VOF)', ccorp: 'Besloten vennootschap (B.V.)' },
    PRIVATE_TITLES: { 'Junior Analyst': 'Junior analist', 'Senior Analyst': 'Senior analist', 'Team Supervisor': 'Teamleider', 'Operations Manager': 'Operationeel manager', 'Senior Director': 'Divisiedirecteur', 'Vice President': 'Directeur', 'Chief Executive Officer': 'Algemeen directeur (CEO)', 'Store Manager': 'Filiaalmanager' },

    EDUCATION: {
      // Statutory tuition about €2,600 a year (halved in the first year); the studievoorschot is repaid at 4% of income above the threshold.
      tuition: { community: ppp(1400), technical: ppp(2600), online: ppp(1500), state: ppp(2600), private: ppp(15000), elite: ppp(2600) },
      loans: 'icr', loanThreshold: ppp(27000), loanRate: 0.04,
      schools: { community: 'MBO college (ROC)', technical: 'Hogeschool (HBO)', online: 'Open Universiteit', state: 'Universiteit Utrecht', private: 'Nyenrode Business Universiteit', elite: 'Universiteit Leiden', academy: 'Koninklijke Militaire Academie (KMA), Breda' },
      words: { 'High School': 'Secondary School', 'high-school diploma': 'VWO diploma', 'high school': 'secondary school', GED: 'Staatsexamen VWO' },
      licenses: {
        'State Bar License': 'Advocaat (NOvA beroepsopleiding)', 'Medical License (MD)': 'BIG-registratie arts', 'Board Certification': 'Specialistenregistratie (RGS)', 'Certified Public Accountant (CPA)': 'Registeraccountant (RA)',
        'Peace Officer (POST Basic Academy)': 'Politieacademie (basispolitiezorg)', 'Registered Nurse (RN)': 'BIG-registratie verpleegkundige', 'Commercial Driver License (Class A)': 'Rijbewijs CE', 'Commercial Driver License (Class B)': 'Rijbewijs C',
        'Driver\'s License (Class D)': 'Rijbewijs B', 'Learner\'s Permit': '2toDrive (begeleid rijden)', 'Professional Engineer (PE)': 'Ingenieur (ir.)', 'EMT (NREMT)': 'Ambulancechauffeur', 'Paramedic (NRP)': 'Ambulanceverpleegkundige', 'Pharmacist License (NAPLEX + MPJE)': 'BIG-registratie apotheker',
      },
    },
    SHORT_CYCLE: 'Associate degree (Ad)',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'Rijbewijs B', 'Heavy goods vehicle licence (articulated)': 'Rijbewijs CE', 'Heavy goods vehicle licence (rigid)': 'Rijbewijs C', 'Bus & coach licence': 'Rijbewijs D', 'Security licence': 'Diploma Beveiliger (ND Justis)', 'Construction site safety card': 'VCA-certificaat' },
    PROFESSIONAL_DEGREES: { jd: 'Master Rechtsgeleerdheid', md: 'Geneeskunde (bachelor + master, 6 years)' },
    UNDERGRAD_ENTRY: { jd: 4, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'MBO-BBL (beroepsbegeleidende leerweg)', years: 3, pay: ppp(22000), exam: 'MBO diploma (niveau 3–4)' },

    WORKING_HOLIDAY: { name: 'Working Holiday Scheme (verblijfsvergunning)', odds: 0.9, years: 1, fee: 80, once: true, partners: { AU: 30, NZ: 30, CA: 30, JP: 30, KR: 30 } },
    IMMIGRATION: {
      visas: {
        work: { name: 'Kennismigrant (highly skilled migrant) permit', odds: 0.85, years: 5, degree: true, fee: 420 },
        transfer: { name: 'ICT-richtlijn (intra-corporate transferee) permit', odds: 0.9, years: 3, fee: 420 },
        student: { name: 'Studie residence permit', odds: 0.85, years: 4, postStudy: 1, fee: 230 },
        family: { name: 'Partner residence permit (MVV)', odds: 0.8, years: 5, fee: 230 },
      },
      pr: { name: 'Verblijfsvergunning onbepaalde tijd (permanent residence)', years: 5, fee: 220 },
      // Five years' legal residence; dual nationality only for spouses and a few other exceptions.
      nat: { years: 5, married: 3, needsPR: false, fee: 1100 },
      dualIn: false, dualOut: false, birthright: false, prLapse: 1,
      intlTuition: { mult: 1, floor: ppp(15000) },
    },
    ASYLUM: { name: 'Asielaanvraag (IND)', odds: 0.55, decision: 1.5, workAfter: 0.5, prYears: 0, support: ppp(4000), temporary: 'Tijdelijke bescherming' },
    LICENCE_EXCHANGE: ['GB', 'IE', 'CA', 'JP', 'KR', 'AU', 'NZ'],
    OVERSTAY_BAN: 5,
    BIRTH_REGISTRATION: { name: 'registration in the Basisregistratie Personen (abroad)', fee: 0, deadline: false },
    PARENT_VISAS: { name: 'Family reunification (dependent parent)', needs: 'resident', odds: 0.05, wait: 1, fee: 230 },
    DIASPORA: { share: 0.27, from: [['turkish', 3], ['maghreb', 3], ['surinamese', 2], ['polish', 2], ['DE', 1], ['IN', 1]] },

    LEGISLATURES: {
      lower: { name: 'Tweede Kamer', seats: 150, presiding: 'Voorzitter van de Tweede Kamer', office: 'nl_tk' },
      upper: { name: 'Eerste Kamer', seats: 75, presiding: 'Voorzitter van de Eerste Kamer', office: 'nl_ek' },
      exec: 'Minister-President', execOffice: 'nl_mp', veto: false,
    },
    PARTY_NAMES: { labor: 'GroenLinks-PvdA', business: 'VVD' },
    CORPORATE_RATE: 0.258,
    HEALTH_SYSTEMS: { wait: 4, waitName: 'wachtlijst (specialist waiting list)', private: { name: 'Aanvullende verzekering (top-up cover)', premium: ppp(400), skipsWait: false } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military'], association: [] },
    AGENCIES: {
      fbi: { name: 'Landelijke Eenheid (national police unit)', employers: ['Landelijke Recherche', 'Dienst Landelijke Informatieorganisatie'], titles: { trainee: 'Aspirant rechercheur', agent: 'Rechercheur', senior: 'Senior rechercheur', bau: 'Gedragsdeskundige', ssa: 'Teamleider recherche', asac: 'Hoofd recherche', sac: 'Hoofdcommissaris' } },
      usss: { name: 'Dienst Koninklijke en Diplomatieke Beveiliging', employers: ['DKDB — Den Haag'] },
      borderPatrol: { name: 'Koninklijke Marechaussee', employers: ['Marechaussee — Schiphol', 'Marechaussee — Rotterdam haven'], titles: { trainee: 'Leerling-marechaussee', agent: 'Marechaussee', senior: 'Wachtmeester', supervisory: 'Opperwachtmeester', watch: 'Adjudant', pail: 'Brigadecommandant' } },
      tsa: { name: 'Beveiliging Schiphol', employers: ['Schiphol Security Services'] },
      postal: { name: 'PostNL', employers: ['PostNL — sorteercentrum'] },
      benefitsClaims: { name: 'UWV / SVB', employers: ['UWV WERKbedrijf', 'Sociale Verzekeringsbank'] },
      caseOfficer: { name: 'AIVD (Buitenland)', employers: ['AIVD — Zoetermeer'] },
      sigint: { name: 'Joint Sigint Cyber Unit', employers: ['JSCU — Zoetermeer'] },
      intelligence: { name: 'AIVD', employers: ['AIVD — Zoetermeer'] },
      meteorology: { name: 'KNMI', employers: ['KNMI — De Bilt'] },
      regulatory: { name: 'Financial Regulation (AFM · DNB · Belastingdienst)', employers: ['Autoriteit Financiële Markten', 'De Nederlandsche Bank', 'Belastingdienst'] },
      foreignService: { name: 'Ministerie van Buitenlandse Zaken', employers: ['BZ — Den Haag'] },
      airTrafficControl: { name: 'LVNL air traffic control', employers: ['LVNL — Schiphol'] },
      nationalLab: { name: 'TNO', employers: ['TNO — Delft'] },
      oig: { name: 'Algemene Rekenkamer', employers: ['Algemene Rekenkamer'] },
      federalPrisons: { name: 'Dienst Justitiële Inrichtingen', employers: ['PI Vught', 'PI Rotterdam'] },
    },
    LOCAL_AGENCIES: (b) => ({
      ...b,
      education: { name: 'Openbaar onderwijs', employer: (c) => `Openbare scholengemeenschap ${town(c)}`, titles: { sub: 'Invalkracht', teacher: 'Leraar (LB)', senior: 'Leraar (LC)', coach: 'Leraar (LD)', specialist: 'Zorgcoördinator', chair: 'Sectievoorzitter', ap: 'Conrector', principal: 'Rector', director: 'Inspecteur van het onderwijs', assistantSuper: 'Bestuurder (scholengroep)', ...cmd('superintendent', ['Voorzitter college van bestuur', 'Inspecteur-generaal'], 'Directeur-generaal Onderwijs') } },
      municipalAdmin: { name: 'Gemeente', employer: (c) => `Gemeente ${town(c)}`, titles: { clerk: 'Medewerker publiekszaken', deputyClerk: 'Beleidsmedewerker', cityClerk: 'Griffier', analyst: 'Financieel adviseur', seniorAnalyst: 'Senior beleidsadviseur', financeDirector: 'Concerncontroller', manager: 'Afdelingshoofd', acm: 'Directeur', ...cmd('cityManager', ['Concerndirecteur', 'Adjunct-gemeentesecretaris', 'Algemeen directeur'], 'Gemeentesecretaris') } },
      prosecution: { name: 'Openbaar Ministerie', employer: (c) => `Arrondissementsparket ${town(c)}`, titles: { clerk: 'Parketsecretaris', ada: 'Officier van justitie', senior: 'Senior officier van justitie', trial: 'Advocaat-generaal', chiefDeputy: 'Hoofdofficier van justitie', ...cmd('first', ['Hoofdadvocaat-generaal', 'Lid College van procureurs-generaal'], 'Voorzitter College van procureurs-generaal') } },
      revenue: null,
      probation: { name: 'Reclassering Nederland', employer: (c) => `Reclassering Nederland — ${town(c)}`, titles: { trainee: 'Werkervaringsplaats reclassering', officer: 'Reclasseringswerker', senior: 'Senior reclasseringswerker', specialized: 'Reclasseringswerker (toezicht zedendelinquenten)', supervisor: 'Unitmanager', chief: 'Algemeen directeur Reclassering Nederland' } },
      police: null,
      statePolice: {
        name: 'Nationale Politie', employer: (c) => `Politie Eenheid ${['Amsterdam', 'Rotterdam', 'The Hague'].includes(town(c)) ? (town(c) === 'The Hague' ? 'Den Haag' : town(c)) : town(c) === 'Utrecht' ? 'Midden-Nederland' : town(c) === 'Eindhoven' ? 'Oost-Brabant' : town(c) === 'Groningen' ? 'Noord-Nederland' : 'Oost-Nederland'}`,
        titles: { cadet: 'Aspirant (Politieacademie)', trooper: 'Agent', senior: 'Hoofdagent', investigator: 'Rechercheur', majorCrimes: 'Rechercheur (Team Grootschalige Opsporing)', detSergeant: 'Brigadier (recherche)', detLieutenant: 'Inspecteur (recherche)', detCaptain: 'Hoofdinspecteur (recherche)', sergeant: 'Brigadier', lieutenant: 'Inspecteur', captain: 'Hoofdinspecteur', major: 'Commissaris', ...cmd('superintendent', ['Hoofdcommissaris', 'Politiechef van de eenheid', 'Plaatsvervangend korpschef', 'Lid korpsleiding'], 'Korpschef') },
      },
      corrections: { name: 'Dienst Justitiële Inrichtingen', employer: (c) => `Penitentiaire inrichting ${town(c)}` },
      fire: {
        name: 'Brandweer (veiligheidsregio)', employer: (c) => `Brandweer ${regio(c)}`,
        titles: { recruit: 'Aspirant brandwacht', firefighter: 'Manschap', engineer: 'Chauffeur/pompbediende', inspector: 'Specialist brandveiligheid', investigator: 'Brandonderzoeker', lieutenant: 'Bevelvoerder', captain: 'Officier van dienst', battalion: 'Hoofdofficier van dienst', deputyChief: 'Sectorhoofd', ...cmd('chief', ['Clustercommandant', 'Plaatsvervangend regionaal commandant'], 'Regionaal commandant brandweer') },
      },
      ems: {
        name: 'Ambulancezorg (RAV)', employer: (c) => `Ambulancezorg ${regio(c)}`,
        titles: { emt: 'Ambulancechauffeur', paramedic: 'Ambulanceverpleegkundige', criticalCare: 'Ambulanceverpleegkundige (MICU)', flight: 'Verpleegkundige traumaheli (MMT)', fto: 'Praktijkopleider', supervisor: 'Teamleider', captain: 'Manager zorg', deputy: 'Medisch manager ambulancezorg', ...cmd('chief', ['Directeur zorg', 'Plaatsvervangend directeur'], 'Directeur RAV') },
      },
      dispatch: { name: 'Meldkamer 112', employer: (c) => `Meldkamer ${regio(c)}`, titles: { trainee: 'Aspirant centralist', telecommunicator: 'Centralist 112', senior: 'Senior centralist', training: 'Opleider meldkamer', supervisor: 'Calamiteitencoördinator', ...cmd('director', ['Hoofd meldkamer', 'Directeur meldkamer'], 'Directeur Landelijke Meldkamer Samenwerking') } },
    }),
    POLICE_UNITS: { k9: 'Politiehondenbrigade', swat: 'Aanhoudings- en ondersteuningsteam (AOT)', traffic: 'Verkeerspolitie', narcotics: 'Team Synthetische Drugs', gang: 'Ondermijningsteam', negotiator: 'Onderhandelaar (DSI)', ia: 'Veiligheid, Integriteit en Klachten (VIK)', protection: 'Dienst Koninklijke en Diplomatieke Beveiliging' },
    POLICE_BUREAUS: { homicide: 'Team Grootschalige Opsporing', svu: 'Team Zeden', property: 'Team High Impact Crimes', robbery: 'Team Overvallen', cyber: 'Team High Tech Crime' },
    VOLUNTEER_MEDAL: 'Vrijwilligersprijs (gemeente)',

    FORCES: {
      pay: 0.8, exposure: 0.6,
      branches: {
        army: { name: 'Koninklijke Landmacht', icon: '🇳🇱', motto: 'Trouw aan de Koning', basic: 'Algemene Militaire Opleiding (Ermelo)', officerSchool: 'the Koninklijke Militaire Academie, Breda', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
        navy: { name: 'Koninklijke Marine', icon: '⚓', motto: 'Je maintiendrai', basic: 'Initiële militaire opleiding, Den Helder', officerSchool: 'the Koninklijk Instituut voor de Marine, Den Helder',
          enlisted: ['Matroos der 3e klasse', 'Matroos der 1e klasse', 'Korporaal', 'Sergeant', 'Sergeant-majoor', 'Adjudant', 'Adjudant (commandoadjudant)', 'Adjudant (vlootadjudant)', 'Adjudant (Marine-adjudant)'],
          officer: ['Adelborst', 'Luitenant ter zee der 3e klasse', 'Luitenant ter zee der 2e klasse', 'Luitenant ter zee der 1e klasse', 'Kapitein-luitenant ter zee', 'Kapitein ter zee', 'Commandeur', 'Schout-bij-nacht', 'Vice-admiraal', 'Admiraal'] },
        airforce: { name: 'Koninklijke Luchtmacht', icon: '✈️', motto: 'Parvus numero magnus merito', basic: 'Algemene Militaire Opleiding (Woensdrecht)', officerSchool: 'the Koninklijke Militaire Academie, Breda', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
        marines: { name: 'Korps Mariniers', icon: '🗡️', motto: 'Qua patet orbis', basic: 'Elementaire Mariniers Opleiding, Rotterdam', officerSchool: 'the Koninklijk Instituut voor de Marine, Den Helder',
          enlisted: ['Marinier der 3e klasse', 'Marinier der 1e klasse', 'Korporaal', 'Sergeant', 'Sergeant-majoor', 'Adjudant', 'Adjudant (bataljonsadjudant)', 'Adjudant (korpsadjudant)', 'Korpsadjudant der Mariniers'], officer: ARMY_OFFICERS },
        guard: { name: 'Natres (Nationale Reserve)', icon: '🛡️', motto: 'Pro Rege et Patria', basic: 'reservist training, Harskamp', officerSchool: 'the reserve officer course at the KMA', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
      },
      bases: {
        army: [['nijmegen', 'Generaal Spoorkazerne (Nijmegen area)'], ['utrecht', 'Kromhoutkazerne'], ['eindhoven', 'Generaal-majoor De Ruyter van Steveninckkazerne, Oirschot'], ['groningen', 'Johannes Postkazerne, Havelte'], ['thehague', 'Frederikkazerne']],
        navy: [['amsterdam', 'Marinekazerne Amsterdam'], ['rotterdam', 'Van Ghentkazerne'], ['thehague', 'Marinebasis Den Helder (fleet)']],
        airforce: [['eindhoven', 'Vliegbasis Eindhoven'], ['groningen', 'Vliegbasis Leeuwarden'], ['nijmegen', 'Vliegbasis Volkel']],
        marines: [['rotterdam', 'Van Ghentkazerne (Korps Mariniers)'], ['amsterdam', 'Marinekazerne Doorn']],
      },
      overseas: {
        army: [['Lithuania', 'NATO enhanced Forward Presence', 1, false], ['Iraq', 'Coalition training mission', 1, false]],
        navy: [['Curaçao', 'Marinekazerne Parera (Caribbean)', 2, true], ['Mediterranean', 'Standing NATO Maritime Group 2', 1, false]],
        airforce: [['Poland', 'NATO air defence (Patriot)', 1, false]],
        marines: [['Aruba', 'Marinierskazerne Savaneta', 2, true], ['Norway', 'Cold Response winter training', 1, false]],
      },
    },
    MIL_SPECIAL: {
      drill: { names: 'Instructeur Algemene Militaire Opleiding' },
      recruiter: { names: 'Defensie werving en selectie adviseur' },
      honorGuard: { names: 'Garderegiment Grenadiers en Jagers (erewacht)', desc: 'Prinsjesdag, state visits at the Royal Palace and the National Remembrance on 4 May.' },
      rotc: null,
      joint: { names: 'Stafofficier, Commando Landstrijdkrachten / Defensiestaf (Den Haag)' },
      fellow: { names: 'Defensie-onderzoeker, Clingendael' },
      commissioning: 'Officiersopleiding vanuit de rangen (KMA)',
      chiefs: { army: 'Commandant Landstrijdkrachten', navy: 'Commandant Zeestrijdkrachten', airforce: 'Commandant Luchtstrijdkrachten', marines: 'Commandant Korps Mariniers' },
      chairman: 'Commandant der Strijdkrachten',
    },
    PME: { enlisted: ['Korporaalsopleiding', 'Onderofficiersopleiding', 'Middelbare Kaderopleiding', 'Hogere Kaderopleiding', 'Adjudantenopleiding'], officer: ['Kapiteinsopleiding', 'Hogere Defensievorming (Instituut Defensie Leergangen)', 'Topopleiding Defensie'] },
    QUALS: { airborne: 'Brevet parachutist (Air Assault Training Centre, Schaarsbergen)', rangerSchool: 'ECO-opleiding (Elementaire Commando Opleiding)', jumpmaster: 'Jumpmaster course', pathfinder: 'Pathfinder course', combatDiver: 'Gevechtszwemmer course', dli: 'Defensie Taleninstituut', instructor: 'Instructeursopleiding', sere: 'SERE course' },
    SOF: {
      ranger: sf('Korps Commandotroepen', 'the Elementaire Commando Opleiding', 'Korps Commandotroepen, Roosendaal', 'groene baret', 'The Dutch Army\'s special forces: reconnaissance, raids and counter-terrorism.', ['a special operations task group in the Sahel', 'a counter-terrorism standby at home']),
      seal: sf('Maritime Special Operations Forces (MARSOF)', 'MARSOF selection', 'MARSOF, Doorn', 'MARSOF badge', 'Maritime counter-terrorism and special operations of the Korps Mariniers.', ['a maritime counter-terrorism standby', 'a hostage-rescue alert in the Gulf']),
      raider: sf('Maritime Special Operations Forces (MARSOF)', 'MARSOF selection', 'MARSOF, Doorn', 'MARSOF badge', 'Maritime counter-terrorism and special operations of the Korps Mariniers.', ['a maritime counter-terrorism standby']),
    },
    BILLETS: { ground: { member: 'Schutter', teamLeader: 'Groepscommandant (korporaal)', squadLeader: 'Groepscommandant', platoonSergeant: 'Pelotonssergeant', opsNco: 'Operationeel onderofficier', firstSergeant: 'Compagnies sergeant-majoor', seniorStaffNco: 'Bataljonsonderofficier', csm: 'Bataljonsadjudant', platoonLeader: 'Pelotonscommandant', xo: 'Plaatsvervangend compagniescommandant', companyCommander: 'Compagniescommandant', staff: 'S3', battalionCommander: 'Bataljonscommandant', higher: 'Brigadestaf', units: { squad: 'Groep', platoon: 'Peloton', company: 'Compagnie', battalion: 'Bataljon' } } },
    MIL_UNITS: { ground: ['11 Luchtmobiele Brigade', '13 Lichte Brigade', '43 Gemechaniseerde Brigade', 'Garderegiment Grenadiers en Jagers'], naval: ['Zr.Ms. De Ruyter', 'Zr.Ms. Karel Doorman', 'Zr.Ms. Johan de Witt', 'Zr.Ms. Holland'], air: ['322 Squadron', '313 Squadron', '336 Squadron'], marines: ['1 Mariniersbataljon', '2 Mariniersbataljon', '3 Mariniersbataljon'] },
    MIL_SUMMARY: 'a disciplinary hearing by your commanding officer',
    SERVICE_TERMS: { maxYears: { enlisted: 40, officer: 40 }, ages: { enlisted: 60, officer: 60, flag: 64 }, join: { enlisted: [17, 40], officer: [17, 32] }, name: 'aanstelling' },
    MILITARY_JUSTICE: { code: 'the Wetboek van Militair Strafrecht', court: 'Militaire kamer, Rechtbank Gelderland (Arnhem)', prison: 'the Militair Penitentiair Centrum, Stroe', counsel: 'advocaat' },
    VETTING: { form: 'Verklaring van geen bezwaar (MIVD security screening)', publicTrust: 'VGB C (vertrouwelijk)', secret: 'VGB B (geheim)', topSecret: 'VGB A (zeer geheim)' },
    CAMPUS: null,
    ACADEMY_NAMES: { army: 'Koninklijke Militaire Academie (Breda)', navy: 'Koninklijk Instituut voor de Marine (Den Helder)', airforce: 'Koninklijke Militaire Academie (Breda)' },
    THEATERS: [
      { id: 'natoEast', name: 'a NATO war on the eastern flank after an invasion of the Baltic states', adversary: 'Russia', intensity: 2, home: 0.04, weight: 16, alliance: 'nato' },
      { id: 'peacekeeping', name: 'a UN peacekeeping mission that turned into combat', adversary: 'militias', intensity: 1, home: 0, weight: 16 },
      { id: 'coalitionAir', name: 'a coalition air campaign in the Middle East', adversary: 'an armed movement', intensity: 1, home: 0, weight: 18 },
      { id: 'major', name: 'a great-power war', adversary: 'a rival bloc', intensity: 3, home: 0.12, weight: 4, alliance: 'all' },
    ],
    WAR_START_CHANCE: 0.008,
    MEDALS: {
      moh: { name: 'Militaire Willems-Orde (Ridder 4e klasse)', ribbon: R('#f47920', '#1f5fbf', '#f47920') }, serviceCross: { name: 'Bronzen Leeuw' }, silverStar: { name: 'Bronzen Kruis' },
      dsm: { name: 'Officier in de Orde van Oranje-Nassau (met de zwaarden)' }, legionOfMerit: { name: 'Kruis van Verdienste' }, bronzeStar: { name: 'Vliegerkruis' }, purpleHeart: { name: 'Draaginsigne Gewonden' },
      msm: { name: 'Eervolle Vermelding' }, commendation: { name: 'Dankbetuiging van de Commandant der Strijdkrachten' }, achievement: { name: 'Tevredenheidsbetuiging' },
      combatAction: { name: 'Herinneringsmedaille Multinationale Operaties' }, goodConduct: { name: 'Onderscheidingsteken voor Langdurige Dienst' }, humanitarian: { name: 'Herinneringsmedaille Vredesoperaties' }, expeditionary: { name: 'Herinneringsmedaille Multinationale Operaties' }, ndsm: null,
    },
    ORDERS: {
      minAge: 30,
      tiers: [
        { id: 'lidOON', name: 'Lid in de Orde van Oranje-Nassau', min: 35, ribbon: R('#f47920', '#1f5fbf', '#f47920') },
        { id: 'offOON', name: 'Officier in de Orde van Oranje-Nassau', min: 80, ribbon: R('#f47920', '#1f5fbf', '#f47920') },
        { id: 'ridderNL', name: 'Ridder in de Orde van de Nederlandse Leeuw', min: 130, ribbon: R('#1f5fbf', '#ffd100', '#1f5fbf') },
        { id: 'commOON', name: 'Commandeur in de Orde van Oranje-Nassau', min: 180, ribbon: R('#f47920', '#1f5fbf', '#f47920') },
      ],
    },
    PARDON: 'the King (gratie, on the Minister of Justice\'s advice)',
  },
};
