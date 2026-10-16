/**
 * Brazil, built on Mexico: a presidential federation where each state runs a
 * military police for patrol, a civil police for investigation and a military
 * fire brigade; cities keep municipal guards. The SUS gives everyone free
 * healthcare, a large informal economy works off the books, and anyone born
 * on Brazilian soil is Brazilian.
 *
 * Amounts are reais converted at OECD 2023 PPP (R$2.5 per US$), 2025 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const BRL = 2.5;
const ppp = (local) => Math.round(local / BRL);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const R = (...colors) => colors.map((c) => [c, 1]);
const state = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.008, salesTax: 0.18, rightToWork: false, cannabis: false, dui: { fineMult: 1.5, suspendYears: 1 }, minWage: ppp(6.9), population: 'large', disasters: { flood: 0.05 }, ...extra });
const town = (c) => c.split(',')[0];
const ARMY_OFFICERS = ['Segundo-tenente', 'Primeiro-tenente', 'Capitão', 'Major', 'Tenente-coronel', 'Coronel', 'General de brigada', 'General de divisão', 'General de exército', 'Marechal'];
const ARMY_ENLISTED = ['Soldado', 'Cabo', 'Terceiro-sargento', 'Segundo-sargento', 'Primeiro-sargento', 'Subtenente', 'Subtenente (adjunto de comando)', 'Subtenente (adjunto do comandante militar de área)', 'Adjunto de Comando do Exército'];
/** Each state's military police (PM) — patrol and public order. */
const PM = { 'BR-SP': 'PMESP', 'BR-RJ': 'PMERJ', 'BR-MG': 'PMMG', 'BR-BA': 'PMBA', 'BR-DF': 'PMDF', 'BR-RS': 'Brigada Militar (RS)', 'BR-PE': 'PMPE' };

export const BR = {
  id: 'BR',
  basedOn: 'MX',
  groups: [],
  agreements: ['US', 'CA', 'DE', 'FR', 'IT', 'ES', 'JP', 'KR', 'MX', 'PH'],
  licenceExchange: ['MX', 'ES', 'IT', 'DE', 'FR', 'JP', 'KR', 'US', 'CA'],
  peers: [],
  country: {
    name: 'Brazil',
    flag: '🇧🇷',
    demonym: 'Brazilian',
    capital: 'Brasília',
    emergency: '190',
    currency: { code: 'BRL', symbol: 'R$', perUsd: BRL },
    languages: ['Portuguese'],
    retirementAge: 65,
    informality: 0.38,
    tax: {
      // IRPF 2025, annualised: exempt to about R$28,500; 7.5%, 15%, 22.5%, then 27.5% above about R$56,000.
      allowance: ppp(28467),
      brackets: [[ppp(5453), 0.075], [ppp(16546), 0.15], [ppp(27509), 0.225], [Infinity, 0.275]],
      // INSS employee contributions, progressive 7.5–14% up to the ceiling (about 9% overall).
      contributions: [{ name: 'INSS', rate: 0.09, from: 0, to: ppp(97884) }],
      label: 'Receita Federal',
    },
    // INSS retirement: about 70% of average earnings after 20 years (men 65, women 62), capped at the ceiling.
    pension: { kind: 'cpp', name: 'Aposentadoria (INSS)', years: 20, cap: ppp(97884), replace: 0.7, flat: ppp(18216), ages: [62, 65] },
    health: { name: 'the SUS (Sistema Único de Saúde)', short: 'SUS', deductible: 0, coinsurance: 0, oopMax: ppp(1000) },
    // Bolsa Família: about R$600 a month a family plus R$150 a child under 6, for low incomes.
    childBenefit: { amount: ppp(1800), phaseOutFrom: ppp(15000), name: 'Bolsa Família' },
    terms: {
      'Federal government': 'Governo Federal', 'State government': 'Governo do Estado', 'Federal income tax': 'Imposto de Renda', 'State income tax': 'Imposto estadual',
      'Social Security': 'INSS', '401(k)': 'previdência complementar', IRA: 'PGBL', IRS: 'Receita Federal', Medicaid: 'the SUS', Medicare: 'the SUS', 'GI Bill': 'veterans\' education support',
      'high school': 'ensino médio', 'High School': 'Ensino Médio',
    },
    names: {
      male: ['Miguel', 'Arthur', 'Gael', 'Heitor', 'Theo', 'Davi', 'Gabriel', 'Bernardo', 'Samuel', 'João', 'Pedro', 'Lucas', 'Rafael', 'Mateus', 'Thiago', 'Felipe'],
      female: ['Helena', 'Alice', 'Laura', 'Maria', 'Valentina', 'Heloísa', 'Manuela', 'Sophia', 'Júlia', 'Isabella', 'Ana', 'Beatriz', 'Larissa', 'Camila', 'Fernanda', 'Mariana'],
      last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Nascimento'],
    },
    provinces: {
      'BR-SP': state('São Paulo', { population: 'mega' }),
      'BR-RJ': state('Rio de Janeiro', { population: 'enterprise', disasters: { flood: 0.07 } }),
      'BR-MG': state('Minas Gerais', { population: 'enterprise', disasters: { flood: 0.05 } }),
      'BR-BA': state('Bahia', { population: 'enterprise', disasters: { flood: 0.03, wildfire: 0.03 } }),
      'BR-DF': state('Distrito Federal', { population: 'medium', disasters: { wildfire: 0.04 } }),
      'BR-RS': state('Rio Grande do Sul', { disasters: { flood: 0.08, blizzard: 0.01 } }),
      'BR-PE': state('Pernambuco', { disasters: { flood: 0.05 } }),
    },
    cities: {
      saopaulo: { name: 'São Paulo', icon: '🏙️', type: 'High-cost metro', state: 'BR-SP', col: 1.0, market: 0.7, locality: 0.2, transit: 70, fare: ppp(220), walkable: true, size: 'mega', population: [11450000, 21500000] },
      riodejaneiro: { name: 'Rio de Janeiro', icon: '🏖️', type: 'Coastal metro', state: 'BR-RJ', col: 0.95, market: 0.66, locality: 0.19, transit: 55, fare: ppp(200), walkable: true, size: 'mega', population: [6200000, 12000000] },
      belohorizonte: { name: 'Belo Horizonte', icon: '⛰️', type: 'Major metro', state: 'BR-MG', col: 0.85, market: 0.62, locality: 0.18, transit: 45, fare: ppp(180), walkable: true, size: 'enterprise', population: [2300000, 5000000] },
      salvador: { name: 'Salvador', icon: '🥁', type: 'Coastal metro', state: 'BR-BA', col: 0.78, market: 0.55, locality: 0.16, transit: 40, fare: ppp(170), walkable: true, size: 'enterprise', population: [2400000, 3900000] },
      brasilia: { name: 'Brasília', icon: '🏛️', type: 'Capital region', state: 'BR-DF', col: 1.0, market: 0.8, locality: 0.2, transit: 35, fare: ppp(180), walkable: false, size: 'large', population: [2800000, 4500000] },
      portoalegre: { name: 'Porto Alegre', icon: '🧉', type: 'Major metro', state: 'BR-RS', col: 0.85, market: 0.63, locality: 0.18, transit: 45, fare: ppp(180), walkable: true, size: 'large', population: [1330000, 4300000] },
      recife: { name: 'Recife', icon: '🌴', type: 'Coastal metro', state: 'BR-PE', col: 0.78, market: 0.55, locality: 0.16, transit: 40, fare: ppp(160), walkable: true, size: 'large', population: [1500000, 4000000] },
    },
    hometowns: ['saopaulo', 'saopaulo', 'saopaulo', 'riodejaneiro', 'riodejaneiro', 'belohorizonte', 'salvador', 'brasilia', 'portoalegre', 'recife'],
    population: { 'BR-SP': 46e6, 'BR-RJ': 17e6, 'BR-MG': 21e6, 'BR-BA': 14e6, 'BR-DF': 2.9e6, 'BR-RS': 11e6, 'BR-PE': 9.5e6 },
  },
  offices: {
    br_depEstadual: { country: 'BR', name: 'Deputado estadual (state assembly)', icon: '🇧🇷', level: 3, term: 4, termLimit: 0, salary: 100000, minAge: 21, residency: 1, cost: 400000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    br_governador: { country: 'BR', name: 'Governador', icon: '⭐', level: 4, term: 4, termLimit: 2, salary: 130000, minAge: 30, residency: 1, cost: 6000000, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
    br_depFederal: { country: 'BR', name: 'Deputado federal (Câmara dos Deputados)', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 180000, minAge: 21, residency: 1, cost: 1500000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    br_senador: { country: 'BR', name: 'Senador (Senado Federal)', icon: '🏛️', level: 4, term: 8, termLimit: 0, salary: 180000, minAge: 35, residency: 1, cost: 5000000, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    br_presidente: { country: 'BR', name: 'President of Brazil', icon: '🇧🇷', level: 5, term: 4, termLimit: 2, salary: 190000, minAge: 35, residency: 10, cost: 60000000, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  tables: {
    JUSTICE: { trial: 'bench', sentence: 0.7, jail: (c) => `Centro de Detenção Provisória de ${town(c)}`, prison: 'a state penitentiary (Polícia Penal)', legalAid: 'defensor público (Defensoria Pública)', privatePrisons: 0.05 },
    INSOLVENCY: { liquidation: { name: 'Insolvência civil', wait: 5 }, plan: { name: 'Repactuação de dívidas (Lei do Superendividamento)', years: 5, wait: 2 }, homestead: 0, wildcard: ppp(5000), creditYears: 5 },
    // ITCMD: each state taxes inheritances at 4–8%.
    INHERITANCE: { name: 'ITCMD (state inheritance tax)', perHeir: true, exemption: 0, brackets: [[Infinity, 0.06]] },
    UNEMPLOYMENT: { name: 'Seguro-desemprego', flat: ppp(9200), years: 0.4 },
    // The 40% FGTS fine on dismissal without cause, on top of the fund itself.
    SEVERANCE: { perYear: 0.45, base: 1 },
    DISABILITY: { name: 'Aposentadoria por incapacidade permanente (INSS)', rate: 0.6, floor: ppp(18216), cap: ppp(97884), minYears: 1, odds: 1.2 },
    SELF_EMPLOYED: { name: 'MEI (microempreendedor individual)', rate: 0.05, cap: ppp(81000) },
    CREDIT: { name: 'Serasa score' },
    SMALL_BIZ_LOAN: 'Pronampe loan',
    VETERANS: { orgs: ['Associação Nacional dos Veteranos da FEB', 'Associação de Militares da Reserva'], care: 'the Fundo de Saúde do Exército (FuSEx)' },
    STOCK_INDEX: 'Ibovespa',
    MORTGAGES: {
      closing: 0.05, stress: 0.02,
      products: {
        sac: { name: 'Financiamento SFH (SAC, 30 anos)', years: 30, rateAdj: 0.02, minDown: 0.2, minScore: 600, maxDti: 0.3 },
        mcmv: { name: 'Minha Casa, Minha Vida (subsidised)', years: 30, rateAdj: -0.01, minDown: 0.05, minScore: 550, maxDti: 0.3 },
      },
    },
    UNIONS: { police: 'Associação de Cabos e Soldados da PM', fire: 'Associação dos Bombeiros Militares', ems: 'Sindicato dos Trabalhadores da Saúde', health: 'Sindicato dos Enfermeiros', education: 'APEOESP', public: 'Sindicato dos Servidores Públicos', prisons: 'Sindicato dos Policiais Penais', transport: 'Sindicato dos Motoristas', rail: 'Sindicato dos Ferroviários', aviation: 'Sindicato Nacional dos Aeronautas', pilots: 'Sindicato Nacional dos Aeronautas (pilotos)', trades: 'Sindicato da Construção Civil', industry: 'Sindicato dos Metalúrgicos', retail: 'Sindicato dos Comerciários', hospitality: 'Sindicato dos Trabalhadores em Hotéis', services: 'Sindicato dos Trabalhadores em Serviços', media: 'Sindicato dos Jornalistas', tech: 'Sindicato dos Trabalhadores em TI', arts: 'Sindicato dos Artistas (SATED)', postal: 'Sindicato dos Trabalhadores dos Correios' },
    CADETS: { jrotc: 'Colégio Militar', seaCadets: null },
    FOREIGN_SERVICE_EXAM: 'Concurso de Admissão à Carreira de Diplomata (Instituto Rio Branco)',
    PROSECUTORS: ['Ministério Público', 'Defensoria Pública', 'Vara de Execuções Penais'],
    VOLUNTEER_SERVICES: { fire: 'Brigada de bombeiros voluntários', police: null, sar: 'Defesa Civil (voluntários)', ambulance: null, wildland: 'Brigada de incêndio florestal (PrevFogo)', auxiliary: null, cap: null, cert: 'NUDEC (Núcleo Comunitário de Defesa Civil)', redcross: 'Cruz Vermelha Brasileira', skiPatrol: null, mrc: null },
    VOLUNTEER_RANKS: { fire: ['Aspirante a bombeiro voluntário', 'Bombeiro voluntário', 'Bombeiro voluntário experiente', 'Motorista', 'Chefe de guarnição', 'Chefe de unidade', 'Comandante da corporação'], wildland: ['Brigadista em formação', 'Brigadista', 'Brigadista experiente', 'Chefe de esquadrão', 'Chefe de brigada', 'Gerente do fogo', 'Coordenador regional'] },
    NATIONAL_SERVICE: { overseas: null, domestic: null },
    ACCOUNTS: { dc: 'Previdência complementar (fundo de pensão)', roth: { name: 'Tesouro Direto / ações', limit: ppp(100000) }, traditional: { name: 'PGBL', limit: ppp(15000), share: 0.12 } },
    REFERENDUMS: {
      plebiscito: { name: 'Plebiscito on splitting the state', icon: '🗺️', support: 0.35, effects: { services: -1 }, pitch: 'Create a new state from the interior, as local politicians propose.' },
    },
    ENTRANCE_EXAMS: { name: 'ENEM / vestibular', prep: { name: 'cursinho pré-vestibular', cost: ppp(4000) }, weight: 0.85 },
    AVIATION_AUTHORITY: 'ANAC',
    COUNTY: 'Município',
    LONG_TERM_CARE: { name: 'family care (no public long-term care)', covers: 0.1, safetyNet: 'the SUAS social assistance system' },
    WORKPLACE: { equality: 'Justiça do Trabalho', reservist: 'CLT job protection for reservists', labourBoard: 'the Justiça do Trabalho' },
    EQUIPMENT: {
      'Digital radio + body camera kit': 'Rádio digital + câmera corporal', 'Patrol sedan': 'Viatura (Chevrolet Spin)', 'Police SUV': 'Viatura (Toyota Hilux)', 'Pumper engine': 'Auto Bomba Tanque (ABT)', '100-ft aerial ladder truck': 'Auto Escada Mecânica',
      HMMWV: 'Agrale Marruá', JLTV: 'LMV-BR', 'M2 Bradley': 'VBTP Guarani', Stryker: 'VBTP Guarani', 'M1A2 Abrams': 'Leopard 1A5 BR', 'F-16': 'F-39 Gripen', 'F-35A': 'F-39 Gripen', 'C-130J': 'KC-390 Millennium', 'MH-60R Seahawk': 'SH-16 Seahawk', 'F/A-18E/F Super Hornet': 'SH-16 Seahawk', 'AAV-7 amphibious assault vehicle': 'AAV-7A1 (Fuzileiros Navais)', 'MV-22 Osprey': 'H225M Caracal',
    },
    LOCAL_ENTITIES: { sole: 'MEI (microempreendedor individual)', llc: 'Sociedade Limitada Unipessoal (SLU)', ccorp: 'Sociedade Anônima (S.A.)' },
    PRIVATE_TITLES: { 'Junior Analyst': 'Analista júnior', Analyst: 'Analista pleno', 'Senior Analyst': 'Analista sênior', 'Team Supervisor': 'Supervisor', 'Operations Manager': 'Gerente de operações', Director: 'Diretor', 'Senior Director': 'Diretor executivo', 'Vice President': 'Vice-presidente', 'Chief Executive Officer': 'Presidente (CEO)', 'Store Manager': 'Gerente de loja' },

    EDUCATION: {
      // Federal and state universities are free; private universities charge (FIES loans help).
      tuition: { community: 0, technical: 0, online: ppp(3000), state: 0, private: ppp(20000), elite: 0 },
      loans: undefined,
      schools: { community: 'Instituto Federal (curso técnico)', technical: 'Instituto Federal (tecnólogo)', online: 'EAD (distance learning)', state: 'Universidade Federal', private: 'Private university (PUC)', elite: 'Universidade de São Paulo (USP)', academy: 'Academia Militar das Agulhas Negras (AMAN)' },
      words: { 'High School': 'Ensino Médio', 'high-school diploma': 'ensino médio diploma', 'high school': 'ensino médio', GED: 'Encceja' },
      licenses: {
        'State Bar License': 'OAB (Exame de Ordem)', 'Medical License (MD)': 'CRM registration', 'Board Certification': 'Título de especialista (residência médica)', 'Certified Public Accountant (CPA)': 'Contador (CRC)',
        'Peace Officer (POST Basic Academy)': 'Academia de Polícia Militar', 'Registered Nurse (RN)': 'COREN (enfermeiro)', 'Commercial Driver License (Class A)': 'CNH categoria E', 'Commercial Driver License (Class B)': 'CNH categoria C',
        'Driver\'s License (Class D)': 'CNH categoria B', 'Learner\'s Permit': 'LADV (licença de aprendizagem)', 'Professional Engineer (PE)': 'Engenheiro (CREA)', 'EMT (NREMT)': 'Técnico de enfermagem (SAMU)', 'Paramedic (NRP)': 'Enfermeiro (SAMU)', 'Pharmacist License (NAPLEX + MPJE)': 'Farmacêutico (CRF)',
      },
    },
    SHORT_CYCLE: 'Tecnólogo',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'CNH categoria B', 'Heavy goods vehicle licence (articulated)': 'CNH categoria E', 'Heavy goods vehicle licence (rigid)': 'CNH categoria C', 'Bus & coach licence': 'CNH categoria D', 'Security licence': 'Curso de vigilante (Polícia Federal)', 'Construction site safety card': 'NR-35 / NR-18 safety certificate' },
    PROFESSIONAL_DEGREES: { jd: 'Bacharelado em Direito + Exame da OAB', md: 'Medicina (6 anos)' },
    UNDERGRAD_ENTRY: { jd: 5, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'Jovem Aprendiz (SENAI)', years: 2, pay: ppp(18000), exam: 'certificado SENAI' },

    WORKING_HOLIDAY: { name: 'Visto de férias-trabalho', odds: 0.9, years: 1, fee: 100, once: true, partners: { NZ: 30, FR: 30, DE: 30 } },
    IMMIGRATION: {
      visas: {
        work: { name: 'Visto temporário de trabalho (VITEM V)', odds: 0.7, years: 2, degree: true, fee: 100 },
        transfer: { name: 'Visto temporário (transferência intragrupo)', odds: 0.85, years: 2, fee: 100 },
        student: { name: 'Visto temporário de estudo (VITEM IV)', odds: 0.85, years: 4, postStudy: 0, fee: 80 },
        family: { name: 'Autorização de residência por reunião familiar', odds: 0.9, permanent: true, fee: 100 },
        retiree: { name: 'Visto de aposentado', odds: 0.85, amount: ppp(24000), minAge: 50, permanent: true, fee: 100 },
      },
      pr: { name: 'Autorização de residência por prazo indeterminado', years: 4, fee: 100 },
      // Naturalização ordinária: four years' residence (one if married to a Brazilian).
      nat: { years: 4, married: 1, needsPR: true, fromArrival: true, prMin: 0, fee: 40 },
      dualIn: true, dualOut: true, birthright: true, prLapse: 2,
      intlTuition: { mult: 1 },
    },
    ASYLUM: { name: 'Solicitação de refúgio (CONARE)', odds: 0.5, decision: 2, workAfter: 0, prYears: 4, support: 0, humanitarian: 0.7 },
    LICENCE_EXCHANGE: ['MX', 'ES', 'IT', 'DE', 'FR', 'JP', 'KR', 'US', 'CA'],
    OVERSTAY_BAN: 2,
    BIRTH_REGISTRATION: { name: 'registro consular (citizenship by descent)', fee: 0, deadline: false },
    PARENT_VISAS: { name: 'Reunião familiar (parent)', needs: 'resident', odds: 0.85, wait: 1, fee: 100 },
    DIASPORA: { share: 0.01, from: [['latinAmerican', 3], ['JP', 1], ['IT', 1], ['chinese', 1]] },

    LEGISLATURES: {
      prov: { name: (p) => `Assembleia Legislativa de ${p}`, seats: 70, presiding: 'Presidente da Assembleia', office: 'br_depEstadual', exec: 'Governador', execOffice: 'br_governador', veto: true },
      lower: { name: 'Câmara dos Deputados', seats: 513, presiding: 'Presidente da Câmara', office: 'br_depFederal' },
      upper: { name: 'Senado Federal', seats: 81, presiding: 'Presidente do Senado', office: 'br_senador' },
      exec: 'President of Brazil', execOffice: 'br_presidente', veto: true,
    },
    PARTY_NAMES: { labor: 'Partido dos Trabalhadores (PT)', business: 'Partido Liberal (PL)' },
    CORPORATE_RATE: 0.34,
    HEALTH_SYSTEMS: { wait: 12, waitName: 'fila do SUS', private: { name: 'Plano de saúde (Unimed, Bradesco Saúde)', premium: ppp(4000), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military', 'fire'], association: ['police', 'fire'] },
    AGENCIES: {
      fbi: { name: 'Polícia Federal', employers: ['Polícia Federal — Superintendência em São Paulo', 'Polícia Federal — Brasília'], titles: { trainee: 'Aluno (Academia Nacional de Polícia)', agent: 'Agente de Polícia Federal', senior: 'Escrivão de Polícia Federal', bau: 'Perito criminal federal', ssa: 'Delegado de Polícia Federal', asac: 'Superintendente regional', sac_cmd1: 'Diretor', sac_cmd2: 'Diretor-executivo', sac_cmd3: 'Diretor de Investigação', sac: 'Diretor-Geral da Polícia Federal' } },
      usss: { name: 'Gabinete de Segurança Institucional (segurança presidencial)', employers: ['GSI — Palácio do Planalto'] },
      borderPatrol: { name: 'Polícia Federal (imigração) / Receita Federal', employers: ['Polícia Federal — Aeroporto de Guarulhos', 'Receita Federal — Porto de Santos'] },
      tsa: { name: 'Segurança aeroportuária', employers: ['Guarulhos Airport Security'] },
      federalPrisons: { name: 'Sistema Penitenciário Federal', employers: ['Penitenciária Federal de Brasília', 'Penitenciária Federal de Catanduvas'] },
      postal: { name: 'Correios', employers: ['Correios — centro de distribuição'] },
      benefitsClaims: { name: 'INSS', employers: ['Agência da Previdência Social'] },
      caseOfficer: { name: 'ABIN (Agência Brasileira de Inteligência)', employers: ['ABIN — Brasília'] },
      intelligence: { name: 'ABIN', employers: ['ABIN — Brasília'] },
      sigint: { name: 'Centro de Inteligência do Exército', employers: ['CIE — Brasília'] },
      meteorology: { name: 'INMET', employers: ['INMET — Brasília'] },
      regulatory: { name: 'Financial Regulation (CVM · Banco Central · Receita Federal)', employers: ['CVM', 'Banco Central do Brasil', 'Receita Federal'] },
      foreignService: { name: 'Itamaraty (Ministério das Relações Exteriores)', employers: ['Itamaraty — Brasília'] },
      parkService: { name: 'ICMBio (analista ambiental)', employers: ['Parque Nacional do Iguaçu', 'Parque Nacional da Tijuca'] },
      airTrafficControl: { name: 'DECEA air traffic control', employers: ['CINDACTA I — Brasília', 'CINDACTA II — Curitiba'] },
      nationalLab: { name: 'Fiocruz / Embrapa', employers: ['Fiocruz — Rio de Janeiro', 'Embrapa'] },
      oig: { name: 'Tribunal de Contas da União (TCU)', employers: ['TCU — Brasília'] },
    },
    LOCAL_AGENCIES: (b) => ({
      ...b,
      education: { name: 'Rede estadual de ensino', employer: (c, s, sn) => `Secretaria da Educação de ${sn} — escola estadual em ${town(c)}`, titles: { sub: 'Professor eventual', teacher: 'Professor (PEB II)', senior: 'Professor (classe superior)', coach: 'Professor coordenador', specialist: 'Coordenador pedagógico', chair: 'Professor coordenador de área', ap: 'Vice-diretor', principal: 'Diretor de escola', director: 'Supervisor de ensino', assistantSuper: 'Dirigente regional de ensino', ...cmd('superintendent', ['Coordenador da educação básica', 'Secretário-executivo'], 'Secretário de Estado da Educação') } },
      municipalAdmin: { name: 'Prefeitura', employer: (c) => `Prefeitura de ${town(c)}`, titles: { clerk: 'Auxiliar administrativo', deputyClerk: 'Assistente administrativo', cityClerk: 'Chefe de gabinete', analyst: 'Analista de finanças', seniorAnalyst: 'Analista sênior', financeDirector: 'Secretário municipal da Fazenda', manager: 'Diretor de departamento', acm: 'Secretário municipal', ...cmd('cityManager', ['Secretário-adjunto', 'Secretário de Governo'], 'Secretário municipal da Casa Civil') } },
      police: {
        name: 'Guarda Civil Municipal', employer: (c) => `Guarda Civil Municipal de ${town(c)}`,
        titles: { recruit: 'Guarda em formação', officer: 'Guarda civil municipal', senior: 'Guarda civil (classe especial)', detective: 'Guarda (inteligência)', seniorDetective: 'Guarda (inteligência, sênior)', detSergeant: 'Subinspetor (inteligência)', detLieutenant: 'Inspetor (inteligência)', detCaptain: 'Inspetor regional (inteligência)', sergeant: 'Subinspetor', lieutenant: 'Inspetor', captain: 'Inspetor regional', deputyChief: 'Subcomandante', ...cmd('chief', ['Inspetor superintendente', 'Corregedor'], 'Comandante da Guarda Civil') },
      },
      probation: { name: 'Central de Penas e Medidas Alternativas', employer: (c) => `Central de Penas e Medidas Alternativas — ${town(c)}`, titles: { trainee: 'Estagiário (penas alternativas)', officer: 'Analista de execução penal', senior: 'Analista sênior', specialized: 'Psicólogo da execução penal', supervisor: 'Coordenador da central', chief: 'Coordenador estadual de alternativas penais' } },
      jail: { name: 'Centro de Detenção Provisória', employer: (c) => `CDP de ${town(c)}` },
      statePolice: {
        name: 'Polícia Militar', employer: (c, s, sn) => `${PM[s] ?? `Polícia Militar de ${sn}`} — batalhão de ${town(c)}`,
        titles: { cadet: 'Soldado (curso de formação)', trooper: 'Soldado PM', senior: 'Cabo PM', investigator: 'Investigador (Polícia Civil)', majorCrimes: 'Investigador (DHPP)', detSergeant: 'Escrivão-chefe (Polícia Civil)', detLieutenant: 'Delegado de polícia', detCaptain: 'Delegado titular', sergeant: 'Sargento PM', lieutenant: 'Tenente PM', captain: 'Capitão PM', major: 'Major PM', ...cmd('superintendent', ['Tenente-coronel PM', 'Coronel PM', 'Subcomandante-geral', 'Chefe do Estado-Maior'], 'Comandante-geral da PM') },
      },
      corrections: { name: 'Polícia Penal', employer: (c, s, sn) => `Secretaria de Administração Penitenciária de ${sn}` },
      revenue: { name: 'Secretaria da Fazenda', employer: (c, s, sn) => `Secretaria da Fazenda de ${sn} (SEFAZ)` },
      fire: {
        name: 'Corpo de Bombeiros Militar', employer: (c, s, sn) => `Corpo de Bombeiros Militar de ${sn} — ${town(c)}`,
        titles: { recruit: 'Soldado BM (curso de formação)', firefighter: 'Soldado BM', engineer: 'Cabo BM (motorista)', inspector: 'Sargento BM (vistoria)', investigator: 'Perito de incêndio', lieutenant: 'Segundo-tenente BM', captain: 'Capitão BM', battalion: 'Major BM', deputyChief: 'Tenente-coronel BM', ...cmd('chief', ['Coronel BM', 'Subcomandante-geral'], 'Comandante-geral do Corpo de Bombeiros') },
      },
      ems: {
        name: 'SAMU 192', employer: (c) => `SAMU 192 — ${town(c)}`,
        titles: { emt: 'Técnico de enfermagem (SAMU)', paramedic: 'Enfermeiro intervencionista', criticalCare: 'Enfermeiro (Unidade de Suporte Avançado)', flight: 'Enfermeiro (aeromédico)', fto: 'Instrutor do Núcleo de Educação', supervisor: 'Coordenador de enfermagem', captain: 'Coordenador da base', deputy: 'Diretor técnico', ...cmd('chief', ['Coordenador regional', 'Diretor-geral adjunto'], 'Coordenador-geral do SAMU') },
      },
      dispatch: { name: 'Central de Regulação 190/192/193', employer: (c) => `Central de Emergências de ${town(c)} (190/192/193)`, titles: { trainee: 'Teleatendente em treinamento', telecommunicator: 'Teleatendente', senior: 'Rádio-operador', training: 'Instrutor', supervisor: 'Supervisor de plantão', ...cmd('director', ['Coordenador da central', 'Diretor de operações'], 'Diretor da Central de Emergências') } },
      prosecution: { name: 'Ministério Público', employer: (c, s, sn) => `Ministério Público de ${sn} — Promotoria de ${town(c)}`, titles: { clerk: 'Oficial de promotoria', ada: 'Promotor de justiça substituto', senior: 'Promotor de justiça', trial: 'Promotor de justiça (entrância final)', chiefDeputy: 'Procurador de justiça', ...cmd('first', ['Subprocurador-geral de justiça', 'Corregedor-geral do MP'], 'Procurador-geral de justiça') } },
    }),
    POLICE_UNITS: { k9: 'Canil (COE)', swat: 'BOPE / GATE', traffic: 'Polícia Rodoviária Estadual', narcotics: 'DENARC', gang: 'ROTA / Força Tática', negotiator: 'Negociador (GATE)', ia: 'Corregedoria', protection: 'Casa Militar (segurança de autoridades)' },
    POLICE_BUREAUS: { homicide: 'DHPP (homicídios)', svu: 'Delegacia da Mulher (DDM)', property: 'Delegacia de Furtos e Roubos', robbery: 'DEIC (roubos)', cyber: 'Delegacia de Crimes Cibernéticos' },
    VOLUNTEER_MEDAL: 'Medalha do Mérito Voluntário',

    FORCES: {
      pay: 0.5, exposure: 0.4,
      // Alistamento militar: every man registers at 18; only about one in twenty is called up (12 months).
      conscription: { kind: 'lottery', age: 18, months: 12, share: 0.05, branch: 'army', name: 'Alistamento Militar', text: 'Every Brazilian man must register for military service in the year he turns 18. Most are released as "excesso de contingente"; about one in twenty is called up for twelve months.' },
      branches: {
        army: { name: 'Exército Brasileiro', icon: '🇧🇷', motto: 'Braço forte, mão amiga', basic: 'serviço militar inicial at a battalion', officerSchool: 'the Academia Militar das Agulhas Negras (AMAN), Resende', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
        navy: { name: 'Marinha do Brasil', icon: '⚓', motto: 'Protegendo nossas riquezas, cuidando da nossa gente', basic: 'Escola de Aprendizes-Marinheiros', officerSchool: 'the Escola Naval, Rio de Janeiro',
          enlisted: ['Marinheiro', 'Cabo', 'Terceiro-sargento', 'Segundo-sargento', 'Primeiro-sargento', 'Suboficial', 'Suboficial (adjunto de comando)', 'Suboficial-mor', 'Suboficial-mor da Marinha'],
          officer: ['Guarda-marinha', 'Segundo-tenente', 'Primeiro-tenente', 'Capitão-tenente', 'Capitão de corveta', 'Capitão de fragata', 'Capitão de mar e guerra', 'Contra-almirante', 'Vice-almirante', 'Almirante de esquadra'] },
        airforce: { name: 'Força Aérea Brasileira', icon: '✈️', motto: 'Asas que protegem o país', basic: 'Escola de Especialistas de Aeronáutica, Guaratinguetá', officerSchool: 'the Academia da Força Aérea (AFA), Pirassununga',
          enlisted: ARMY_ENLISTED, officer: ['Segundo-tenente', 'Primeiro-tenente', 'Capitão', 'Major', 'Tenente-coronel', 'Coronel', 'Brigadeiro', 'Major-brigadeiro', 'Tenente-brigadeiro', 'Marechal do ar'] },
        marines: { name: 'Corpo de Fuzileiros Navais', icon: '⚓', motto: 'ADSUMUS', basic: 'Centro de Instrução Almirante Sylvio de Camargo', officerSchool: 'the Escola Naval, Rio de Janeiro', enlisted: ['Soldado fuzileiro naval', 'Cabo', 'Terceiro-sargento', 'Segundo-sargento', 'Primeiro-sargento', 'Suboficial', 'Suboficial (adjunto de comando)', 'Suboficial-mor', 'Suboficial-mor do CFN'], officer: ARMY_OFFICERS },
        guard: { name: 'Reserva do Exército (Tiro de Guerra)', icon: '🛡️', motto: 'Braço forte, mão amiga', basic: 'Tiro de Guerra instruction', officerSchool: 'the CPOR (reserve officer school)', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
      },
      bases: {
        army: [['riodejaneiro', 'Vila Militar (Rio de Janeiro)'], ['saopaulo', 'Comando Militar do Sudeste'], ['brasilia', 'Setor Militar Urbano'], ['portoalegre', 'Comando Militar do Sul'], ['recife', 'Comando Militar do Nordeste']],
        navy: [['riodejaneiro', 'Base Naval do Rio de Janeiro'], ['salvador', 'Base Naval de Aratu']],
        airforce: [['brasilia', 'Base Aérea de Anápolis'], ['saopaulo', 'Base Aérea de São Paulo (Guarulhos)'], ['portoalegre', 'Base Aérea de Canoas']],
        marines: [['riodejaneiro', 'Ilha do Governador (Divisão Anfíbia)']],
      },
      overseas: {
        army: [['Lebanon', 'UNIFIL', 1, false], ['Democratic Republic of the Congo', 'MONUSCO', 1, false]],
        navy: [['Lebanon', 'UNIFIL Maritime Task Force', 1, false]],
        airforce: [['Antarctica', 'Operação Antártica (PROANTAR)', 1, false]],
        marines: [['Haiti', 'Caribbean training mission', 1, false]],
      },
    },
    MIL_SPECIAL: {
      drill: { names: 'Instrutor de recrutas' },
      recruiter: { names: 'Junta de Serviço Militar' },
      honorGuard: { names: 'Batalhão da Guarda Presidencial (Dragões da Independência)', desc: 'The Palácio do Planalto, Independence Day on 7 September and state visits.' },
      rotc: { names: { army: 'Instrutor, CPOR/NPOR' }, desc: 'Train reserve officer candidates at a CPOR.' },
      joint: { names: 'Oficial do Estado-Maior Conjunto das Forças Armadas (Brasília)' },
      fellow: { names: 'Pesquisador, Escola Superior de Guerra' },
      commissioning: 'Escola de Sargentos to oficial (quadro auxiliar)',
      chiefs: { army: 'Comandante do Exército', navy: 'Comandante da Marinha', airforce: 'Comandante da Aeronáutica', marines: 'Comandante-geral do Corpo de Fuzileiros Navais' },
      chairman: 'Chefe do Estado-Maior Conjunto das Forças Armadas',
    },
    PME: { enlisted: ['Curso de Formação de Cabos', 'Curso de Formação de Sargentos', 'Curso de Aperfeiçoamento de Sargentos', 'Curso de Habilitação ao Quadro Auxiliar', 'Curso de Adjunto de Comando'], officer: ['Escola de Aperfeiçoamento de Oficiais (EsAO)', 'Escola de Comando e Estado-Maior do Exército (ECEME)', 'Escola Superior de Guerra'] },
    QUALS: { airborne: 'Curso Básico Paraquedista (Brigada de Infantaria Paraquedista)', rangerSchool: 'Curso de Ações de Comandos', jumpmaster: 'Curso de Mestre de Salto', pathfinder: 'Curso de Precursor Paraquedista', combatDiver: 'Curso de Mergulhador de Combate', dli: 'Centro de Estudos de Pessoal (idiomas)', instructor: 'Curso de instrutor', sere: 'Curso de sobrevivência na selva (CIGS)', expertBadge: 'Curso de Operações na Selva (CIGS, Manaus)' },
    SOF: {
      ranger: sf('Comando de Operações Especiais', 'the Curso de Forças Especiais', '1º Batalhão de Forças Especiais, Goiânia', 'gorro preto', 'The Brazilian Army\'s special forces: jungle, counter-terrorism and raids.', ['an operation on the Amazon border', 'a counter-terrorism standby in Brasília']),
      seal: sf('GRUMEC (Grupo de Mergulhadores de Combate)', 'the Curso de Mergulhador de Combate', 'GRUMEC, Niterói', 'mergulhador de combate badge', 'The Navy\'s combat divers.', ['a maritime counter-terrorism standby', 'an oil-platform protection task']),
      raider: sf('Batalhão de Operações Especiais de Fuzileiros Navais (Tonelero)', 'the Curso de Comandos Anfíbios', 'Batalhão Tonelero, Rio de Janeiro', 'COMANF badge', 'Amphibious commandos of the Corpo de Fuzileiros Navais.', ['an amphibious raid exercise']),
      pararescue: sf('PARA-SAR', 'PARA-SAR selection', 'Esquadrão Aeroterrestre de Salvamento, Campo Grande', 'PARA-SAR badge', 'The Air Force\'s parachute search and rescue.', ['a jungle rescue in the Amazon']),
    },
    BILLETS: { ground: { member: 'Atirador', teamLeader: 'Cabo (chefe de esquadra)', squadLeader: 'Comandante de grupo de combate', platoonSergeant: 'Adjunto de pelotão', opsNco: 'Sargento de operações', firstSergeant: 'Sargenteante da companhia', seniorStaffNco: 'Subtenente do batalhão', csm: 'Adjunto de comando', platoonLeader: 'Comandante de pelotão', xo: 'Subcomandante de companhia', companyCommander: 'Comandante de companhia', staff: 'Oficial de operações (S3)', battalionCommander: 'Comandante de batalhão', higher: 'Estado-maior da brigada', units: { squad: 'Grupo de combate', platoon: 'Pelotão', company: 'Companhia', battalion: 'Batalhão' } } },
    MIL_UNITS: { ground: ['Brigada de Infantaria Paraquedista', '1º Batalhão de Infantaria de Selva', '5ª Brigada de Cavalaria Blindada', 'Batalhão da Guarda Presidencial'], naval: ['NAM Atlântico', 'Fragata Defensora', 'Submarino Riachuelo', 'Corveta Barroso'], air: ['1º Grupo de Defesa Aérea (Gripen)', '1º Grupo de Transporte de Tropa (KC-390)', 'Esquadrilha da Fumaça'], marines: ['Divisão Anfíbia', 'Batalhão Riachuelo', 'Batalhão Humaitá'] },
    MIL_SUMMARY: 'a disciplinary sanction (Regulamento Disciplinar)',
    SERVICE_TERMS: { maxYears: { enlisted: 35, officer: 35 }, ages: { enlisted: 56, officer: 60, flag: 66 }, name: 'tempo de serviço' },
    MILITARY_JUSTICE: { code: 'the Código Penal Militar', court: 'Justiça Militar da União (auditoria militar)', prison: 'a military prison (presídio militar)', counsel: 'advogado (Defensoria Pública da União)' },
    VETTING: { form: 'credencial de segurança (GSI)', publicTrust: 'Credencial reservado', secret: 'Credencial secreto', topSecret: 'Credencial ultrassecreto' },
    CAMPUS: { army: 'CPOR / NPOR (reserve officer training)', navy: null, airforce: null, obligation: false },
    ACADEMY_NAMES: { army: 'Academia Militar das Agulhas Negras (AMAN)', navy: 'Escola Naval', airforce: 'Academia da Força Aérea (AFA)' },
    THEATERS: [
      { id: 'peacekeeping', name: 'a UN peacekeeping mission that turned into combat', adversary: 'militias', intensity: 1, home: 0, weight: 20 },
      { id: 'amazonBorder', name: 'an operation against armed trafficking groups on the Amazon border', adversary: 'armed trafficking groups', intensity: 1, home: 0.15, weight: 25, internal: true },
    ],
    WAR_START_CHANCE: 0.006,
    MEDALS: {
      moh: { name: 'Medalha Sangue do Brasil (bravura)', ribbon: R('#009c3b', '#ffdf00', '#009c3b') }, serviceCross: { name: 'Ordem do Mérito Militar (Comendador)' }, silverStar: { name: 'Medalha de Campanha' },
      dsm: { name: 'Ordem do Mérito Militar (Grande-Oficial)' }, legionOfMerit: { name: 'Ordem do Mérito Militar (Oficial)' }, bronzeStar: { name: 'Medalha do Pacificador com Palma' }, purpleHeart: { name: 'Medalha Sangue do Brasil' },
      msm: { name: 'Medalha Militar de Ouro' }, commendation: { name: 'Elogio do Comandante do Exército' }, achievement: { name: 'Elogio individual' },
      combatAction: null, goodConduct: { name: 'Medalha Militar (tempo de serviço)' }, humanitarian: { name: 'Medalha de Serviços Humanitários' }, expeditionary: { name: 'Medalha das Nações Unidas' }, ndsm: { name: 'Medalha do Pacificador' },
    },
    ORDERS: {
      minAge: 30,
      tiers: [
        { id: 'cavaleiroRB', name: 'Cavaleiro da Ordem de Rio Branco', min: 40, ribbon: R('#1f5fbf', '#fff', '#1f5fbf') },
        { id: 'oficialRB', name: 'Oficial da Ordem de Rio Branco', min: 80, ribbon: R('#1f5fbf', '#fff', '#1f5fbf') },
        { id: 'comendadorMN', name: 'Comendador da Ordem Nacional do Mérito', min: 120, ribbon: R('#009c3b', '#fff', '#009c3b') },
        { id: 'grandeOficialRB', name: 'Grande-Oficial da Ordem de Rio Branco', min: 175, ribbon: R('#1f5fbf', '#ffdf00', '#1f5fbf') },
        { id: 'graCruzCS', name: 'Grã-Cruz da Ordem Nacional do Cruzeiro do Sul', min: 240, ribbon: R('#1f5fbf', '#ffdf00', '#1f5fbf') },
      ],
    },
    PARDON: 'the President (indulto)',
  },
};
