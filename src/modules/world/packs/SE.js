/**
 * Sweden, built on Germany: an EU state (and NATO member since 2024) with
 * one national police authority, municipal rescue services, regions that
 * run healthcare, a one-chamber Riksdag, no inheritance tax, and no orders
 * of chivalry for its citizens since 1975 — only the King's and the
 * government's medals.
 *
 * Amounts are kronor converted at OECD 2023 PPP (SEK 8.8 per US$), 2025 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const SEK = 8.8;
const ppp = (local) => Math.round(local / SEK);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const R = (...colors) => colors.map((c) => [c, 1]);
const region = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.0075, salesTax: 0.25, rightToWork: false, cannabis: false, dui: { fineMult: 1.5, suspendYears: 1 }, minWage: ppp(130), population: 'large', disasters: { blizzard: 0.03, wildfire: 0.02 }, ...extra });
const town = (c) => c.split(',')[0];
const ARMY_OFFICERS = ['Fänrik', 'Löjtnant', 'Kapten', 'Major', 'Överstelöjtnant', 'Överste', 'Brigadgeneral', 'Generalmajor', 'Generallöjtnant', 'General'];
const ARMY_ENLISTED = ['Menig', 'Vicekorpral', 'Korpral', 'Furir', 'Sergeant', 'Översergeant', 'Fanjunkare', 'Förvaltare', 'Regementsförvaltare'];
const FIRE = { Stockholm: 'Storstockholms brandförsvar', Gothenburg: 'Räddningstjänsten Storgöteborg', 'Malmö': 'Räddningstjänsten Syd' };

export const SE = {
  id: 'SE',
  basedOn: 'DE',
  groups: ['EU', 'RICH_SYSTEMS'],
  agreements: ['US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'IE', 'NL', 'JP', 'KR', 'AU', 'IN'],
  licenceExchange: ['GB', 'CA', 'JP', 'KR', 'AU', 'NZ', 'US'],
  peers: [],
  country: {
    name: 'Sweden',
    flag: '🇸🇪',
    demonym: 'Swedish',
    capital: 'Stockholm',
    emergency: '112',
    currency: { code: 'SEK', symbol: 'kr ', perUsd: SEK },
    languages: ['Swedish'],
    retirementAge: 67,
    tax: {
      // 2025: municipal and regional tax about 32.4% everywhere, plus 20% state tax above SEK 625,800.
      // The basic allowance and the job tax credit work like an allowance of about SEK 60,000.
      allowance: ppp(60000),
      // (Shown as 25.4% tax plus the 7% general pension fee, which is credited back against tax.)
      brackets: [[ppp(565800), 0.254], [Infinity, 0.524]],
      contributions: [{ name: 'Allmän pensionsavgift', rate: 0.07, from: ppp(60000), to: ppp(614000) }],
      label: 'Skatteverket',
    },
    // Income pension plus premium pension: about 55% of earnings up to the income ceiling; a guarantee pension below.
    pension: { kind: 'cpp', name: 'Allmän pension (inkomstpension)', years: 40, cap: ppp(614000), replace: 0.55, flat: ppp(110000), ages: [63, 67] },
    // Patient fees are capped at SEK 1,450 a year (högkostnadsskydd).
    health: { name: 'regional healthcare (högkostnadsskydd)', short: 'Region', deductible: 0, coinsurance: 0.05, oopMax: ppp(1450) },
    childBenefit: { amount: ppp(15000), phaseOutFrom: Infinity, name: 'Barnbidrag' },
    terms: {
      'Federal government': 'Regeringen', 'National government': 'Regeringen', 'State government': 'Region', 'Federal income tax': 'Statlig inkomstskatt', 'State income tax': 'Kommunalskatt',
      'Social Security': 'allmän pension', '401(k)': 'tjänstepension', IRA: 'privat pensionssparande (ISK)', IRS: 'Skatteverket', Medicaid: 'regional healthcare', Medicare: 'regional healthcare', 'GI Bill': 'veterans\' support',
      'high school': 'upper secondary school', 'High School': 'Upper Secondary School',
    },
    names: {
      male: ['William', 'Liam', 'Noah', 'Hugo', 'Lucas', 'Oliver', 'Elias', 'Adam', 'Alexander', 'Axel', 'Leo', 'Viktor', 'Erik', 'Karl', 'Nils', 'Oscar'],
      female: ['Alice', 'Maja', 'Elsa', 'Astrid', 'Wilma', 'Freja', 'Ella', 'Alma', 'Olivia', 'Ebba', 'Saga', 'Selma', 'Agnes', 'Klara', 'Ingrid', 'Linnea'],
      last: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson', 'Lindberg', 'Lindqvist', 'Berg', 'Holm'],
    },
    provinces: {
      'SE-AB': region('Stockholm County', { population: 'enterprise' }),
      'SE-O': region('Västra Götaland', { population: 'enterprise', disasters: { flood: 0.03, hurricane: 0.01 } }),
      'SE-M': region('Skåne', { disasters: { flood: 0.02, hurricane: 0.02 } }),
      'SE-C': region('Uppsala County', { population: 'medium' }),
      'SE-AC': region('Västerbotten', { population: 'small', disasters: { blizzard: 0.08, wildfire: 0.03 } }),
      'SE-E': region('Östergötland', { population: 'medium' }),
    },
    cities: {
      stockholm: { name: 'Stockholm', icon: '👑', type: 'High-cost metro', state: 'SE-AB', col: 1.25, market: 0.95, locality: 0.24, transit: 90, fare: ppp(1060), walkable: true, size: 'large', population: [990000, 2450000] },
      gothenburg: { name: 'Gothenburg', icon: '⚓', type: 'Major metro', state: 'SE-O', col: 1.05, market: 0.88, locality: 0.21, transit: 75, fare: ppp(900), walkable: true, size: 'large', population: [600000, 1100000] },
      malmo: { name: 'Malmö', icon: '🌉', type: 'Mid-size city', state: 'SE-M', col: 1.0, market: 0.84, locality: 0.2, transit: 70, fare: ppp(800), walkable: true, size: 'medium', population: [360000, 750000] },
      uppsala: { name: 'Uppsala', icon: '🎓', type: 'Mid-size city', state: 'SE-C', col: 1.02, market: 0.85, locality: 0.2, transit: 60, fare: ppp(700), walkable: true, size: 'medium', population: [240000, 400000] },
      linkoping: { name: 'Linköping', icon: '✈️', type: 'Mid-size city', state: 'SE-E', col: 0.95, market: 0.84, locality: 0.19, transit: 55, fare: ppp(650), walkable: true, size: 'medium', population: [165000, 170000] },
      umea: { name: 'Umeå', icon: '🌌', type: 'Small town', state: 'SE-AC', col: 0.92, market: 0.82, locality: 0.18, transit: 45, fare: ppp(600), walkable: true, size: 'small', population: [130000, 155000] },
    },
    hometowns: ['stockholm', 'stockholm', 'stockholm', 'gothenburg', 'gothenburg', 'malmo', 'uppsala', 'linkoping', 'umea'],
    population: { 'SE-AB': 2.45e6, 'SE-O': 1.75e6, 'SE-M': 1.42e6, 'SE-C': 0.4e6, 'SE-AC': 0.28e6, 'SE-E': 0.47e6 },
  },
  offices: {
    se_rd: { country: 'SE', name: 'Member of the Riksdag (riksdagsledamot)', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 105000, minAge: 18, residency: 0, cost: 25000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    se_sm: { country: 'SE', name: 'Prime Minister (statsminister)', icon: '🇸🇪', level: 5, term: 4, termLimit: 0, salary: 230000, minAge: 18, residency: 0, cost: 500000, requires: ['se_rd'], leader: true, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  tables: {
    JUSTICE: { trial: 'lay', juror: 'service as a nämndeman (lay judge)', jurorPay: ppp(800), sentence: 0.35, jail: (c) => `Häktet ${town(c)}`, prison: 'a Kriminalvården anstalt', legalAid: 'offentlig försvarare', privatePrisons: 0 },
    INSOLVENCY: { liquidation: { name: 'Konkurs', wait: 5 }, plan: { name: 'Skuldsanering (Kronofogden)', years: 5, wait: 2 }, homestead: 0, wildcard: ppp(30000), creditYears: 3 },
    INHERITANCE: { none: 'Sweden abolished inheritance and gift tax in 2005.' },
    UNEMPLOYMENT: { name: 'Arbetslöshetsersättning (a-kassa)', rate: 0.8, cap: ppp(409000), years: 1.2 },
    SEVERANCE: { perYear: 0 },
    DISABILITY: { name: 'Sjukersättning (Försäkringskassan)', rate: 0.64, floor: ppp(120000), cap: ppp(480000), minYears: 0, odds: 1.1, stages: ['Försäkringskassan decision', 'Omprövning', 'Förvaltningsrätten'] },
    SELF_EMPLOYED: { name: 'egenavgifter', rate: 0.29, cap: ppp(614000) },
    CREDIT: { name: 'UC credit report', registry: true },
    SMALL_BIZ_LOAN: 'Almi start-up loan',
    VETERANS: { orgs: ['Sveriges Veteranförbund Fredsbaskrarna', 'Invidzonen'], care: 'Försvarsmaktens veteranenhet' },
    STOCK_INDEX: 'OMXS30',
    MORTGAGES: {
      // Banks lend up to 90% (bolånetak); loans over 50% must be amortised.
      closing: 0.03, stress: 0.03,
      products: {
        rorlig: { name: 'Rörligt bolån (3-month rate)', years: 50, rateAdj: -0.032, minDown: 0.1, minScore: 600, maxDti: 0.35, arm: true, reset: 1 },
        bunden3: { name: 'Bundet bolån, 3 år', years: 50, rateAdj: -0.03, minDown: 0.1, minScore: 600, maxDti: 0.35, arm: true, reset: 3 },
      },
    },
    UNIONS: { police: 'Polisförbundet', fire: 'Brandmännens Riksförbund', ems: 'Vårdförbundet (ambulans)', health: 'Vårdförbundet', education: 'Sveriges Lärare', public: 'Vision', prisons: 'Seko Kriminalvården', transport: 'Transportarbetareförbundet', rail: 'Seko Spårtrafik', aviation: 'Unionen (flyg)', pilots: 'Svensk Pilotförening', trades: 'Byggnads', industry: 'IF Metall', retail: 'Handels', hospitality: 'Hotell- och restaurangfacket', services: 'Kommunal', media: 'Journalistförbundet', tech: 'Unionen', arts: 'Scen & Film', postal: 'Seko Posten' },
    CADETS: { jrotc: 'Ungdomsverksamhet (Hemvärnsungdom)', seaCadets: 'Sjövärnskåren ungdom' },
    FOREIGN_SERVICE_EXAM: 'Diplomatprogrammet (UD) selection',
    PROSECUTORS: ['Åklagarmyndigheten', 'Offentlig försvarare', 'Frivården (Kriminalvården)'],
    VOLUNTEER_SERVICES: { fire: 'Räddningstjänst i beredskap (RIB)', police: null, sar: 'Frivilliga Resursgruppen (FRG)', ambulance: null, wildland: null, auxiliary: 'Sjöräddningssällskapet', cap: null, cert: 'Frivilliga försvarsorganisationer', redcross: 'Svenska Röda Korset', skiPatrol: 'Pistpatrull', mrc: null },
    VOLUNTEER_RANKS: { fire: ['Brandman under utbildning', 'Brandman i beredskap', 'Erfaren brandman', 'Chaufför', 'Styrkeledare', 'Stationsansvarig', 'Insatsledare'], auxiliary: ['Aspirant', 'Besättningsmedlem', 'Båtförare', 'Räddningsledare', 'Stationsansvarig'] },
    NATIONAL_SERVICE: { overseas: null, domestic: null },
    ACCOUNTS: { dc: 'Tjänstepension (ITP/SAF-LO)', roth: { name: 'Investeringssparkonto (ISK)', limit: ppp(1000000) }, traditional: { name: 'Privat pensionssparande (IPS)', limit: ppp(0), share: 0 } },
    REFERENDUMS: {
      kommunal: { name: 'Kommunal folkomröstning on closing a rural school', icon: '🏫', support: 0.35, effects: { levy: -30, services: -2 }, pitch: 'Merge the village school into the town\'s, as the municipality proposes.' },
    },
    ENTRANCE_EXAMS: { name: 'Gymnasiebetyg / högskoleprovet', prep: { name: 'högskoleprovet prep course', cost: ppp(3000) }, weight: 0.6 },
    AVIATION_AUTHORITY: 'Transportstyrelsen',
    COUNTY: 'Kommun',
    LONG_TERM_CARE: { name: 'municipal elderly care (äldreomsorg)', covers: 0.9, safetyNet: 'the municipality' },
    WORKPLACE: { equality: 'Diskrimineringsombudsmannen (DO)', reservist: 'the Act on Leave for Military Service (Lagen om rätt till ledighet)', labourBoard: 'the Arbetsdomstolen' },
    EQUIPMENT: {
      'Digital radio + body camera kit': 'Rakel radio + kroppskamera', 'Patrol sedan': 'Polisbil (Volvo V90)', 'Police SUV': 'Polisbuss (Volkswagen Transporter)', 'Pumper engine': 'Släckbil (Scania)', '100-ft aerial ladder truck': 'Höjdfordon (stegbil)',
      HMMWV: 'Terrängbil 16 (Patria)', JLTV: 'Bv 410', 'M2 Bradley': 'Stridsfordon 90', Stryker: 'Pansarterrängbil 360', 'M1A2 Abrams': 'Stridsvagn 122', 'F-16': 'JAS 39 Gripen', 'F-35A': 'JAS 39E Gripen', 'C-130J': 'C-130H Hercules (Tp 84)', 'MH-60R Seahawk': 'Helikopter 14 (NH90)', 'F/A-18E/F Super Hornet': 'JAS 39 Gripen', 'AAV-7 amphibious assault vehicle': 'Stridsbåt 90', 'MV-22 Osprey': 'Helikopter 16 (UH-60M)',
    },
    LOCAL_ENTITIES: { sole: 'Enskild firma', llc: 'Handelsbolag', ccorp: 'Aktiebolag (AB)' },
    PRIVATE_TITLES: { 'Junior Analyst': 'Junior analytiker', 'Senior Analyst': 'Senior analytiker', 'Team Supervisor': 'Teamledare', 'Operations Manager': 'Driftchef', 'Senior Director': 'Divisionschef', 'Vice President': 'Vice vd', 'Chief Executive Officer': 'Verkställande direktör (vd)', 'Store Manager': 'Butikschef' },

    EDUCATION: {
      // Free tuition for EU citizens; CSN student loans are repaid over 25 years.
      tuition: { community: 0, technical: 0, online: 0, state: 0, private: 0, elite: 0 },
      loans: undefined,
      schools: { community: 'Yrkeshögskola', technical: 'KTH Royal Institute of Technology', online: 'Distance course (Linnaeus University)', state: 'Uppsala University', private: 'Stockholm School of Economics', elite: 'Karolinska Institutet', academy: 'Militärhögskolan Karlberg' },
      words: { 'High School': 'Upper Secondary School', 'high-school diploma': 'Gymnasieexamen', 'high school': 'upper secondary school', GED: 'Komvux' },
      licenses: {
        'State Bar License': 'Advokat (Sveriges advokatsamfund)', 'Medical License (MD)': 'Läkarlegitimation (Socialstyrelsen)', 'Board Certification': 'Specialistbevis', 'Certified Public Accountant (CPA)': 'Auktoriserad revisor',
        'Peace Officer (POST Basic Academy)': 'Polisutbildningen', 'Registered Nurse (RN)': 'Sjuksköterskelegitimation', 'Commercial Driver License (Class A)': 'Körkort CE', 'Commercial Driver License (Class B)': 'Körkort C',
        'Driver\'s License (Class D)': 'Körkort B', 'Learner\'s Permit': 'Övningskörningstillstånd', 'Professional Engineer (PE)': 'Civilingenjör', 'EMT (NREMT)': 'Ambulanssjukvårdare', 'Paramedic (NRP)': 'Specialistsjuksköterska (ambulanssjukvård)', 'Pharmacist License (NAPLEX + MPJE)': 'Apotekarlegitimation',
      },
    },
    SHORT_CYCLE: 'Yrkeshögskoleexamen',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'Körkort B', 'Heavy goods vehicle licence (articulated)': 'Körkort CE', 'Heavy goods vehicle licence (rigid)': 'Körkort C', 'Bus & coach licence': 'Körkort D', 'Security licence': 'Väktarutbildning', 'Construction site safety card': 'ID06 card' },
    PROFESSIONAL_DEGREES: { jd: 'Juristexamen', md: 'Läkarexamen (6 years)' },
    UNDERGRAD_ENTRY: { jd: 4.5, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'Lärlingsutbildning (gymnasial lärling)', years: 3, pay: ppp(200000), exam: 'Gesällbrev' },

    WORKING_HOLIDAY: { name: 'Working holiday residence permit', odds: 0.9, years: 1, fee: 150, once: true, partners: { AU: 30, NZ: 30, CA: 30, JP: 30, KR: 30 } },
    IMMIGRATION: {
      visas: {
        work: { name: 'Arbetstillstånd (work permit)', odds: 0.75, years: 2, degree: true, fee: 230 },
        transfer: { name: 'ICT permit (intra-corporate transfer)', odds: 0.9, years: 3, fee: 230 },
        student: { name: 'Residence permit for studies', odds: 0.85, years: 3, postStudy: 1, fee: 150 },
        family: { name: 'Uppehållstillstånd för anhöriga (spouse)', odds: 0.8, years: 2, fee: 210 },
      },
      pr: { name: 'Permanent uppehållstillstånd', years: 4, fee: 230 },
      nat: { years: 5, married: 3, needsPR: true, fromArrival: true, prMin: 0, fee: 170 },
      dualIn: true, dualOut: true, birthright: false, prLapse: 2,
      intlTuition: { mult: 1, floor: ppp(120000) },
    },
    ASYLUM: { name: 'Asylum application (Migrationsverket)', odds: 0.35, decision: 1, workAfter: 0, prYears: 0, support: ppp(25000), temporary: 'Tillfälligt skydd' },
    LICENCE_EXCHANGE: ['GB', 'CA', 'JP', 'KR', 'AU', 'NZ', 'US'],
    OVERSTAY_BAN: 5,
    BIRTH_REGISTRATION: { name: 'registration with Skatteverket (folkbokföring)', fee: 0, deadline: false },
    PARENT_VISAS: { name: 'Family reunification (parent)', needs: 'resident', odds: 0.05, wait: 2, fee: 210 },
    DIASPORA: { share: 0.26, from: [['IN', 1], ['polish', 2], ['turkish', 1], ['westAfrican', 1], ['maghreb', 1], ['DE', 1], ['IT', 1]] },

    LEGISLATURES: {
      lower: { name: 'Riksdag', seats: 349, presiding: 'Talman', office: 'se_rd' },
      exec: 'Statsminister', execOffice: 'se_sm', veto: false,
    },
    PARTY_NAMES: { labor: 'Socialdemokraterna', business: 'Moderaterna' },
    CORPORATE_RATE: 0.206,
    HEALTH_SYSTEMS: { wait: 6, waitName: 'vårdgaranti waiting list', private: { name: 'Sjukvårdsförsäkring (private cover)', premium: ppp(5000), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['military'], association: [] },
    AGENCIES: {
      fbi: { name: 'Nationella operativa avdelningen (NOA)', employers: ['NOA — Stockholm'], titles: { trainee: 'Polisassistent (NOA)', agent: 'Kriminalinspektör', senior: 'Senior kriminalinspektör', bau: 'Gärningsmannaprofilerare', ssa: 'Kriminalkommissarie', asac: 'Polisintendent', sac: 'Chef NOA' } },
      usss: { name: 'Säkerhetspolisen — personskydd', employers: ['Säpo — Solna'] },
      borderPatrol: { name: 'Gränspolisen / Tullverket', employers: ['Gränspolisen — Arlanda', 'Tullverket — Göteborgs hamn'] },
      tsa: { name: 'Swedavia säkerhetskontroll', employers: ['Arlanda Airport Security'] },
      postal: { name: 'PostNord', employers: ['PostNord — utdelningskontor'] },
      benefitsClaims: { name: 'Försäkringskassan / Pensionsmyndigheten', employers: ['Försäkringskassan', 'Pensionsmyndigheten'] },
      caseOfficer: { name: 'Must (Militära underrättelse- och säkerhetstjänsten)', employers: ['Must — Lidingö'] },
      sigint: { name: 'Försvarets radioanstalt (FRA)', employers: ['FRA — Lovön'] },
      intelligence: { name: 'Säkerhetspolisen (Säpo)', employers: ['Säpo — Solna'] },
      meteorology: { name: 'SMHI', employers: ['SMHI — Norrköping'] },
      regulatory: { name: 'Financial Regulation (Finansinspektionen · Riksbanken · Skatteverket)', employers: ['Finansinspektionen', 'Sveriges riksbank', 'Skatteverket'] },
      foreignService: { name: 'Utrikesdepartementet', employers: ['UD — Stockholm'] },
      parkService: { name: 'Naturvårdsverket / länsstyrelsen naturbevakare', employers: ['Abisko nationalpark', 'Sarek nationalpark'] },
      airTrafficControl: { name: 'LFV air traffic control', employers: ['LFV — Stockholm ATCC', 'LFV — Malmö ATCC'] },
      nationalLab: { name: 'RISE / FOI', employers: ['RISE Research Institutes of Sweden', 'FOI (Totalförsvarets forskningsinstitut)'] },
      oig: { name: 'Riksrevisionen', employers: ['Riksrevisionen'] },
      federalPrisons: { name: 'Kriminalvården', employers: ['Anstalten Kumla', 'Anstalten Hall'] },
    },
    LOCAL_AGENCIES: (b) => ({
      ...b,
      education: { name: 'Kommunal skola', employer: (c) => `${town(c)} kommun — grundskolor och gymnasier`, titles: { sub: 'Vikarie', teacher: 'Lärare', senior: 'Förstelärare', coach: 'Lektor', specialist: 'Speciallärare', chair: 'Ämnesansvarig', ap: 'Biträdande rektor', principal: 'Rektor', director: 'Verksamhetschef', assistantSuper: 'Utbildningschef', ...cmd('superintendent', ['Förvaltningschef', 'Skolinspektör (Skolinspektionen)'], 'Generaldirektör, Skolverket') } },
      municipalAdmin: { name: 'Kommun', employer: (c) => `${town(c)} kommun`, titles: { clerk: 'Handläggare', deputyClerk: 'Nämndsekreterare', cityClerk: 'Kanslichef', analyst: 'Controller', seniorAnalyst: 'Ekonom', financeDirector: 'Ekonomidirektör', manager: 'Enhetschef', acm: 'Förvaltningschef', ...cmd('cityManager', ['Biträdande stadsdirektör', 'Stabschef'], 'Kommundirektör') } },
      prosecution: { name: 'Åklagarmyndigheten', employer: (c) => `Åklagarkammaren i ${town(c)}`, titles: { clerk: 'Åklagarassistent', ada: 'Åklagare', senior: 'Kammaråklagare', trial: 'Chefsåklagare', chiefDeputy: 'Vice överåklagare', ...cmd('first', ['Överåklagare', 'Biträdande riksåklagare'], 'Riksåklagaren') } },
      revenue: null,
      probation: { name: 'Frivården (Kriminalvården)', employer: (c) => `Frivården ${town(c)}`, titles: { trainee: 'Frivårdsinspektör (introduktion)', officer: 'Frivårdsinspektör', senior: 'Senior frivårdsinspektör', specialized: 'Frivårdsinspektör (sexualbrottsprogram)', supervisor: 'Kriminalvårdschef', chief: 'Regionchef, Kriminalvården' } },
      police: null,
      statePolice: {
        name: 'Polismyndigheten', employer: (c) => `Polisregion ${{ Stockholm: 'Stockholm', Gothenburg: 'Väst', 'Malmö': 'Syd', Uppsala: 'Öst', 'Linköping': 'Öst', 'Umeå': 'Nord' }[town(c)] ?? 'Mitt'}`,
        titles: { cadet: 'Polisaspirant', trooper: 'Polisassistent', senior: 'Polisinspektör', investigator: 'Kriminalinspektör', majorCrimes: 'Kriminalinspektör (grova brott)', detSergeant: 'Gruppchef (utredning)', detLieutenant: 'Kriminalkommissarie', detCaptain: 'Polisintendent (utredning)', sergeant: 'Gruppchef', lieutenant: 'Poliskommissarie', captain: 'Polisintendent', major: 'Biträdande polisområdeschef', ...cmd('superintendent', ['Polisområdeschef', 'Regionpolischef', 'Biträdande rikspolischef', 'Biträdande rikspolischef (operativ)'], 'Rikspolischef') },
      },
      corrections: { name: 'Kriminalvården', employer: (c) => `Anstalten ${town(c)}` },
      fire: {
        name: 'Räddningstjänst', employer: (c) => FIRE[town(c)] ?? `Räddningstjänsten ${town(c)}`,
        titles: { recruit: 'Brandman (SMO-utbildning)', firefighter: 'Brandman', engineer: 'Chaufför', inspector: 'Brandinspektör', investigator: 'Brandutredare', lieutenant: 'Styrkeledare', captain: 'Insatsledare', battalion: 'Brandmästare', deputyChief: 'Räddningschef i beredskap', ...cmd('chief', ['Biträdande räddningschef', 'Förbundsdirektör'], 'Räddningschef') },
      },
      ems: {
        name: 'Ambulanssjukvård (region)', employer: (c, s, sn) => `Ambulanssjukvården, Region ${sn.replace(' County', '')}`,
        titles: { emt: 'Ambulanssjukvårdare', paramedic: 'Ambulanssjuksköterska', criticalCare: 'Specialistsjuksköterska (ambulanssjukvård)', flight: 'Ambulanshelikoptersjuksköterska', fto: 'Klinisk handledare', supervisor: 'Stationschef', captain: 'Områdeschef', deputy: 'Verksamhetschef', ...cmd('chief', ['Medicinskt ansvarig läkare', 'Ambulansöverläkare'], 'Prehospital direktör') },
      },
      dispatch: { name: 'SOS Alarm 112', employer: (c) => `SOS Alarm — ${town(c)}`, titles: { trainee: 'SOS-operatör under utbildning', telecommunicator: 'SOS-operatör', senior: 'Senior SOS-operatör', training: 'Utbildare', supervisor: 'Vakthavande', ...cmd('director', ['Centralchef', 'Driftdirektör'], 'Vd, SOS Alarm') } },
    }),
    POLICE_UNITS: { k9: 'Hundenheten', swat: 'Nationella insatsstyrkan (NI)', traffic: 'Trafikpolisen', narcotics: 'Narkotikaenheten', gang: 'Gängenheten', negotiator: 'Förhandlare', ia: 'Särskilda utredningar (SU)', protection: 'Säkerhetspolisen personskydd' },
    POLICE_BUREAUS: { homicide: 'Grova brott (våldsrotel)', svu: 'Brott i nära relation', property: 'Bedrägerirotel', robbery: 'Rånrotel', cyber: 'IT-brottscentrum' },
    VOLUNTEER_MEDAL: 'Svenska Röda Korsets förtjänsttecken',

    FORCES: {
      pay: 0.75, exposure: 0.5,
      branches: {
        army: { name: 'Armén', icon: '🇸🇪', motto: 'För Sverige – i tiden', basic: 'grundutbildning (värnplikt) at a regiment', officerSchool: 'Militärhögskolan Karlberg', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
        navy: { name: 'Marinen', icon: '⚓', motto: 'Gud och fäderneslandet', basic: 'grundutbildning, Karlskrona', officerSchool: 'Sjöstridsskolan, Karlskrona',
          enlisted: ['Matros', 'Vicekorpral', 'Korpral', 'Furir', 'Sergeant', 'Översergeant', 'Flottiljförvaltare', 'Förvaltare', 'Flottans förvaltare'],
          officer: ['Fänrik', 'Löjtnant', 'Kapten', 'Örlogskapten', 'Kommendörkapten', 'Kommendör', 'Flottiljamiral', 'Konteramiral', 'Viceamiral', 'Amiral'] },
        airforce: { name: 'Flygvapnet', icon: '✈️', motto: 'Per aspera ad astra', basic: 'grundutbildning at a wing', officerSchool: 'Luftstridsskolan, Uppsala', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
        guard: { name: 'Hemvärnet', icon: '🛡️', motto: 'Hemvärnet – Försvarsmakten', basic: 'Hemvärnets grundutbildning', officerSchool: 'Hemvärnets befälsskola', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
      },
      bases: {
        army: [['stockholm', 'Livgardet, Kungsängen'], ['gothenburg', 'Skaraborgs regemente, Skövde'], ['malmo', 'Södra skånska regementet, Revinge'], ['umea', 'Norrlands dragonregemente, Arvidsjaur'], ['uppsala', 'Upplands regemente, Enköping']],
        navy: [['malmo', 'Marinbasen Karlskrona'], ['stockholm', 'Berga örlogsbas'], ['gothenburg', 'Älvsborgs amfibieregemente']],
        airforce: [['linkoping', 'Malmen (Livgrenadjärsregementet)'], ['uppsala', 'Uppsala garnison (Luftstridsskolan)'], ['umea', 'Norrbottens flygflottilj, Luleå']],
      },
      overseas: {
        army: [['Latvia', 'NATO Forward Land Forces', 1, false], ['Mali', 'EU training mission', 1, false]],
        navy: [['Baltic Sea', 'Standing NATO Maritime Group 1', 1, false]],
        airforce: [['Poland', 'NATO air policing', 1, false]],
      },
    },
    MIL_SPECIAL: {
      drill: { names: 'Instruktör, grundutbildning' },
      recruiter: { names: 'Rekryteringsofficer (Försvarsmakten)' },
      honorGuard: { names: 'Högvakten', desc: 'The King\'s Guard at the Royal Palace and the National Day parade.' },
      rotc: null,
      joint: { names: 'Stabsofficer, Högkvarteret (Lidingö)' },
      fellow: { names: 'Forskare, Försvarshögskolan' },
      commissioning: 'Officersprogrammet from the ranks',
      chiefs: { army: 'Arméchefen', navy: 'Marinchefen', airforce: 'Flygvapenchefen' },
      chairman: 'Överbefälhavaren (ÖB)',
    },
    PME: { enlisted: ['Gruppbefälsutbildning', 'Specialistofficersutbildning', 'Fortsättningsutbildning för specialistofficerare', 'Förvaltarutbildning', 'Högre specialistofficersutbildning'], officer: ['Taktisk-teknisk utbildning', 'Högre stabsofficersutbildning (Försvarshögskolan)', 'Chefsprogrammet'] },
    QUALS: { airborne: 'Fallskärmsjägarutbildning (Karlsborg)', rangerSchool: 'Jägarutbildning', jumpmaster: 'Hoppmästarutbildning', pathfinder: 'Fallskärmsjägare', combatDiver: 'Attackdykarutbildning', dli: 'Försvarsmaktens tolkskola', instructor: 'Instruktörsutbildning', sere: 'Överlevnadsutbildning (SERE)' },
    SOF: {
      ranger: sf('Särskilda operationsgruppen (SOG)', 'SOG selection', 'Särskilda operationsgruppen, Karlsborg', 'SOG badge', 'Sweden\'s special forces: counter-terrorism, raids and reconnaissance.', ['a hostage-rescue alert abroad', 'a special operations task group with NATO']),
      seal: sf('Attackdykare', 'the attack diver course in Berga', 'Attackdykarna, Berga', 'attack diver badge', 'Maritime special operations and underwater demolition.', ['a harbour-protection standby', 'a Baltic Sea reconnaissance task']),
    },
    BILLETS: { ground: { member: 'Soldat', teamLeader: 'Stf gruppchef', squadLeader: 'Gruppchef', platoonSergeant: 'Ställföreträdande plutonchef', opsNco: 'Stabsassistent', firstSergeant: 'Kompanikvartermästare', seniorStaffNco: 'Bataljonsförvaltare', csm: 'Regementsförvaltare', platoonLeader: 'Plutonchef', xo: 'Ställföreträdande kompanichef', companyCommander: 'Kompanichef', staff: 'S3', battalionCommander: 'Bataljonschef', higher: 'Brigadstab', units: { squad: 'Grupp', platoon: 'Pluton', company: 'Kompani', battalion: 'Bataljon' } } },
    MIL_UNITS: { ground: ['Livgardet', 'Norrbottens regemente (I 19)', 'Skaraborgs regemente (P 4)', 'Södra skånska regementet (P 7)'], naval: ['HMS Visby', 'HMS Helsingborg', 'HMS Gotland', 'HMS Carlskrona'], air: ['Skaraborgs flygflottilj (F 7)', 'Blekinge flygflottilj (F 17)', 'Norrbottens flygflottilj (F 21)'] },
    MIL_SUMMARY: 'a disciplinary hearing (Försvarsmaktens personalansvarsnämnd)',
    SERVICE_TERMS: { maxYears: { enlisted: 40, officer: 40 }, ages: { enlisted: 61, officer: 61, flag: 65 }, name: 'anställning' },
    MILITARY_JUSTICE: { code: 'the Brottsbalken (no military courts in peacetime)', court: null, prison: 'a Kriminalvården anstalt', counsel: 'offentlig försvarare' },
    VETTING: { form: 'säkerhetsprövning (Säpo registerkontroll)', publicTrust: 'Säkerhetsklass 3', secret: 'Säkerhetsklass 2', topSecret: 'Säkerhetsklass 1' },
    CAMPUS: null,
    ACADEMY_NAMES: { army: 'Militärhögskolan Karlberg', navy: 'Sjöstridsskolan (Karlskrona)', airforce: 'Militärhögskolan Karlberg' },
    THEATERS: [
      { id: 'natoEast', name: 'a NATO war on the eastern flank after an invasion of the Baltic states', adversary: 'Russia', intensity: 2, home: 0.08, weight: 18, alliance: 'nato' },
      { id: 'peacekeeping', name: 'a UN peacekeeping mission that turned into combat', adversary: 'militias', intensity: 1, home: 0, weight: 14 },
      { id: 'major', name: 'a great-power war', adversary: 'a rival bloc', intensity: 3, home: 0.15, weight: 4, alliance: 'all' },
    ],
    WAR_START_CHANCE: 0.006,
    MEDALS: {
      moh: { name: 'Försvarsmaktens förtjänstmedalj i guld med svärd', ribbon: R('#1f5fbf', '#ffd100', '#1f5fbf') }, serviceCross: { name: 'Försvarsmaktens förtjänstmedalj i silver med svärd' }, silverStar: { name: 'Försvarsmaktens förtjänstmedalj i brons med svärd' },
      dsm: { name: 'Försvarsmaktens förtjänstmedalj i guld' }, legionOfMerit: { name: 'Försvarsmaktens förtjänstmedalj i silver' }, bronzeStar: { name: 'Försvarsmaktens förtjänstmedalj i brons' }, purpleHeart: { name: 'Försvarsmaktens medalj för sårade i strid' },
      msm: { name: 'Försvarsmaktens förtjänstmedalj' }, commendation: { name: 'ÖB:s tack' }, achievement: { name: 'Förbandschefens tack' },
      combatAction: null, goodConduct: { name: 'Försvarsmaktens medalj för god tjänst' }, humanitarian: { name: 'Försvarsmaktens medalj för internationella insatser' }, expeditionary: { name: 'Försvarsmaktens medalj för internationella insatser' }, ndsm: null,
    },
    // No orders for Swedish citizens since 1975: the King's medal and the government's Illis quorum.
    ORDERS: {
      minAge: 35,
      tiers: [
        { id: 'kungensMedalj', name: 'H.M. Konungens medalj', min: 70, ribbon: R('#1f5fbf') },
        { id: 'illisQuorum', name: 'Illis quorum (gold medal)', min: 160, ribbon: R('#1f5fbf', '#ffd100', '#1f5fbf') },
      ],
    },
    PARDON: 'the Government (nåd)',
  },
};
