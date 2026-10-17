/**
 * Indonesia, built on the Philippines: a presidential republic of provinces,
 * each with a governor and DPRD; one national police force (Polri) organised
 * in regional (Polda) and resort (Polres) commands; city fire services
 * (Damkar) and PSC 119 ambulances; BPJS health and employment insurance; a
 * large informal economy; and the TNI, whose combat is mostly in Papua.
 *
 * Amounts are rupiah converted at 2023 PPP (Rp4,800 per US$), 2025 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const IDR = 4800;
const ppp = (local) => Math.round(local / IDR);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const R = (...colors) => colors.map((c) => [c, 1]);
const prov = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.002, salesTax: 0.12, rightToWork: false, cannabis: false, dui: { fineMult: 1, suspendYears: 1 }, minWage: ppp(5000000 * 12 / 2080), population: 'enterprise', disasters: { flood: 0.06, earthquake: 0.02 }, ...extra });
const ENLISTED = ['Prajurit Dua', 'Prajurit Satu', 'Kopral Dua', 'Kopral Satu', 'Sersan Dua', 'Sersan Satu', 'Sersan Kepala', 'Pembantu Letnan Dua', 'Pembantu Letnan Satu'];
const OFFICERS = ['Letnan Dua', 'Letnan Satu', 'Kapten', 'Mayor', 'Letnan Kolonel', 'Kolonel', 'Brigadir Jenderal', 'Mayor Jenderal', 'Letnan Jenderal', 'Jenderal'];
const town = (c) => c.split(',')[0];
const only = (mine) => (b) => ({ ...Object.fromEntries(Object.keys(b ?? {}).map((k) => [k, null])), ...mine });

export const ID = {
  id: 'ID',
  basedOn: 'PH',
  groups: [],
  agreements: [],
  licenceExchange: [],
  peers: [],
  country: {
    name: 'Indonesia',
    flag: '🇮🇩',
    demonym: 'Indonesian',
    capital: 'Jakarta',
    currency: { code: 'IDR', symbol: 'Rp', perUsd: IDR },
    languages: ['Indonesian'],
    emergency: '110 / 112 / 119',
    retirementAge: 59,
    informality: 0.59,
    tax: {
      // PPh 21: Rp54 million non-taxable income (single), then 5%, 15%, 25%, 30% and 35% above Rp5 billion.
      allowance: ppp(54000000),
      brackets: [[ppp(60000000), 0.05], [ppp(190000000), 0.15], [ppp(250000000), 0.25], [ppp(4500000000), 0.3], [Infinity, 0.35]],
      contributions: [{ name: 'BPJS Kesehatan', rate: 0.01, from: 0, to: ppp(144000000) }, { name: 'BPJS Ketenagakerjaan (JHT + JP)', rate: 0.03, from: 0, to: ppp(126000000) }],
      label: 'Direktorat Jenderal Pajak',
    },
    // Jaminan Pensiun: about 1% of average wages per year of contributions (15 years minimum), plus the JHT lump sum.
    pension: { kind: 'tiered', name: 'Jaminan Pensiun (BPJS Ketenagakerjaan)', basic: 0, years: 15, cap: ppp(126000000), accrual: 0.01, ages: [59, 59] },
    employerSuper: 0.057,
    health: { name: 'BPJS Kesehatan (JKN)', short: 'BPJS', deductible: 0, coinsurance: 0.1, oopMax: ppp(15000000) },
    childBenefit: { amount: ppp(900000), phaseOutFrom: ppp(30000000), name: 'Program Keluarga Harapan (PKH)' },
    terms: {
      'Federal government': 'Central government', 'State government': 'Provincial government', 'Federal income tax': 'Income tax (PPh 21)', 'State income tax': 'Income tax (PPh 21)',
      'Social Security': 'BPJS Ketenagakerjaan', '401(k)': 'DPLK pension', IRA: 'DPLK pension', IRS: 'Direktorat Jenderal Pajak', Medicaid: 'BPJS Kesehatan (PBI)', Medicare: 'BPJS Kesehatan', 'GI Bill': 'TNI education support',
      'SSS pension': 'Jaminan Pensiun', SSS: 'BPJS Ketenagakerjaan', PhilHealth: 'BPJS Kesehatan', 'Pag-IBIG': 'Tapera',
    },
    names: {
      male: ['Budi', 'Agus', 'Ahmad', 'Dimas', 'Rizky', 'Fajar', 'Andi', 'Arief', 'Bayu', 'Eko', 'Hendra', 'Irfan', 'Muhammad', 'Putra', 'Wahyu', 'Yusuf'],
      female: ['Siti', 'Dewi', 'Putri', 'Ayu', 'Rina', 'Sri', 'Nur', 'Fitri', 'Indah', 'Lestari', 'Maya', 'Ratna', 'Wulan', 'Yuni', 'Anisa', 'Kartika'],
      last: ['Santoso', 'Wijaya', 'Saputra', 'Hidayat', 'Setiawan', 'Kurniawan', 'Pratama', 'Nugroho', 'Hakim', 'Siregar', 'Simanjuntak', 'Gunawan', 'Halim', 'Susanto', 'Rahman', 'Lubis'],
    },
    provinces: {
      'ID-JK': prov('DKI Jakarta', { population: 'mega', disasters: { flood: 0.1 } }),
      'ID-JB': prov('West Java', { population: 'mega', disasters: { flood: 0.06, earthquake: 0.03 } }),
      'ID-JI': prov('East Java', { population: 'mega', disasters: { flood: 0.05, earthquake: 0.02 } }),
      'ID-BA': prov('Bali', { population: 'large', disasters: { earthquake: 0.02 } }),
      'ID-SU': prov('North Sumatra', { disasters: { earthquake: 0.03, flood: 0.05 } }),
      'ID-SN': prov('South Sulawesi', { disasters: { flood: 0.05 } }),
    },
    cities: {
      jakarta: { name: 'Jakarta', icon: '🏙️', type: 'High-cost metro', state: 'ID-JK', col: 0.85, market: 0.75, locality: 0.18, transit: 45, fare: ppp(2400000), walkable: false, size: 'mega', population: [10600000, 34000000] },
      bandung: { name: 'Bandung', icon: '⛰️', type: 'Major metro', state: 'ID-JB', col: 0.65, market: 0.55, locality: 0.14, transit: 20, fare: ppp(1800000), walkable: true, size: 'enterprise', population: [2500000, 8500000] },
      surabaya: { name: 'Surabaya', icon: '🦈', type: 'Major metro', state: 'ID-JI', col: 0.7, market: 0.6, locality: 0.15, transit: 20, fare: ppp(1800000), walkable: true, size: 'enterprise', population: [3000000, 9900000] },
      denpasar: { name: 'Denpasar', icon: '🌺', type: 'Coastal metro', state: 'ID-BA', col: 0.75, market: 0.65, locality: 0.15, transit: 10, fare: ppp(1500000), walkable: false, size: 'large', population: [730000, 4300000] },
      medan: { name: 'Medan', icon: '🌴', type: 'Major metro', state: 'ID-SU', col: 0.6, market: 0.5, locality: 0.13, transit: 15, fare: ppp(1500000), walkable: true, size: 'enterprise', population: [2500000, 4700000] },
      makassar: { name: 'Makassar', icon: '⛵', type: 'Coastal metro', state: 'ID-SN', col: 0.6, market: 0.5, locality: 0.13, transit: 10, fare: ppp(1400000), walkable: true, size: 'large', population: [1500000, 2900000] },
    },
    hometowns: ['jakarta', 'jakarta', 'jakarta', 'bandung', 'bandung', 'surabaya', 'surabaya', 'denpasar', 'medan', 'makassar'],
    population: { 'ID-JK': 10.6e6, 'ID-JB': 50e6, 'ID-JI': 41e6, 'ID-BA': 4.3e6, 'ID-SU': 15.4e6, 'ID-SN': 9.4e6 },
  },
  offices: {
    id_dprd: { country: 'ID', name: 'Member of the Provincial DPRD', icon: '🏛️', level: 3, term: 5, termLimit: 0, salary: 40000, minAge: 21, residency: 1, cost: 60000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    id_governor: { country: 'ID', name: 'Governor', icon: '⭐', level: 4, term: 5, termLimit: 2, salary: 50000, minAge: 30, residency: 1, cost: 2000000, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
    id_dpr: { country: 'ID', name: 'Member of the DPR (House of Representatives)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 90000, minAge: 21, residency: 1, cost: 400000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    id_dpd: { country: 'ID', name: 'Member of the DPD (Regional Representative Council)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 80000, minAge: 21, residency: 1, cost: 300000, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    id_president: { country: 'ID', name: 'President of Indonesia', icon: '🇮🇩', level: 5, term: 5, termLimit: 2, salary: 60000, minAge: 40, residency: 1, cost: 40000000, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  tables: {
    /* Law and money */
    JUSTICE: { trial: 'bench', sentence: 1.2, jail: (c) => `Rutan ${town(c)} (detention centre)`, prison: 'a Lapas (correctional institution)', legalAid: 'a legal aid lawyer (LBH)', privatePrisons: 0 },
    INSOLVENCY: { liquidation: { name: 'Kepailitan (Commercial Court)', wait: 5 }, plan: { name: 'PKPU (debt suspension)', years: 3, wait: 2 }, homestead: 0, wildcard: ppp(10000000), creditYears: 5 },
    INHERITANCE: { name: 'no inheritance tax', exemption: Infinity, brackets: [[Infinity, 0]] },
    UNEMPLOYMENT: { name: 'Jaminan Kehilangan Pekerjaan (JKP)', rate: 0.45, cap: ppp(30000000), years: 0.5 },
    SEVERANCE: { perYear: 0.08, base: 0.08 },
    DISABILITY: { name: 'Jaminan Kecelakaan Kerja (work-injury benefit)', rate: 0.5, floor: ppp(6000000), cap: ppp(60000000), minYears: 0, odds: 0.7, stages: ['BPJS assessment', 'Review', 'Industrial Relations Court'] },
    SELF_EMPLOYED: { name: 'BPJS Ketenagakerjaan (informal workers)', rate: 0.02, cap: ppp(60000000) },
    CREDIT: { name: 'credit history (SLIK OJK)' },
    SMALL_BIZ_LOAN: 'KUR (People\'s Business Credit)',
    VETERANS: { orgs: ['Legiun Veteran Republik Indonesia', 'PEPABRI'], care: 'ASABRI and the military hospitals (RSPAD)' },
    STOCK_INDEX: 'IDX Composite (IHSG)',
    MORTGAGES: { closing: 0.07, stress: 0.02, products: { kpr: { name: 'KPR (home loan, 20-yr floating)', years: 20, rateAdj: 0.04, minDown: 0.15, minScore: 600, maxDti: 0.35, arm: true, reset: 3 }, flpp: { name: 'KPR FLPP (subsidised, 5% fixed)', years: 20, rateAdj: 0.0, minDown: 0.01, minScore: 550, maxDti: 0.3 } } },
    UNIONS: { police: null, fire: 'KSPSI (public sector)', ems: 'Persatuan Perawat Nasional Indonesia', health: 'Persatuan Perawat Nasional Indonesia (PPNI)', education: 'PGRI (teachers\' association)', public: 'KORPRI', prisons: null, transport: 'KSPSI (transport)', rail: 'Serikat Pekerja Kereta Api', aviation: 'Serikat Karyawan Garuda', pilots: 'Asosiasi Pilot Garuda', trades: 'KSPSI (construction)', industry: 'KSPI (metalworkers)', retail: 'KSPSI (commerce)', hospitality: 'FSP Pariwisata', services: 'KSPSI', media: 'Aliansi Jurnalis Independen (AJI)', tech: 'KSPI', arts: null, postal: 'Serikat Pekerja Pos Indonesia' },
    CADETS: { jrotc: 'Pramuka (scouts)', seaCadets: 'Saka Bahari (sea scouts)' },
    FOREIGN_SERVICE_EXAM: 'CPNS Kementerian Luar Negeri (diplomat selection)',
    PROSECUTORS: ['Kejaksaan (Public Prosecution Service)', 'Legal aid (LBH)', 'Bapas (probation)'],
    VOLUNTEER_SERVICES: { fire: 'Relawan Pemadam Kebakaran (Redkar)', police: 'Linmas (community protection)', sar: 'Potensi SAR (Basarnas volunteers)', ambulance: 'PMI ambulance volunteer', wildland: 'Manggala Agni (forest-fire brigade volunteers)', auxiliary: null, cap: null, cert: 'Tagana (disaster preparedness cadets)', redcross: 'Palang Merah Indonesia (PMI)', skiPatrol: null, mrc: null },
    VOLUNTEER_PARENTS: { sar: { name: 'Basarnas', level: 'national', funds: 0.6, grant: null }, cert: { name: 'BNPB (National Disaster Management Agency)', level: 'national', funds: 0.6, grant: null } },
    NATIONAL_SERVICE: { overseas: null, domestic: 'Indonesia Mengajar (teaching corps)' },
    ACCOUNTS: { dc: 'DPLK pension', roth: { name: 'Reksa dana / stock account', limit: ppp(1000000000) }, traditional: { name: 'DPLK voluntary contribution', limit: ppp(50000000), share: 0.2 } },
    REFERENDUMS: {},
    ENTRANCE_EXAMS: { name: 'UTBK-SNBT (university entrance test)', prep: { name: 'bimbel (cram school)', cost: ppp(8000000) }, weight: 0.85 },
    AVIATION_AUTHORITY: 'Directorate General of Civil Aviation',
    COUNTY: 'Regency (Kabupaten)',
    LONG_TERM_CARE: { name: 'family care (no public long-term care)', covers: 0, safetyNet: 'Kementerian Sosial' },
    WORKPLACE: { equality: 'the Industrial Relations Court', reservist: 'Komponen Cadangan job protection', labourBoard: 'the Industrial Relations Court' },
    EQUIPMENT: { 'Digital radio + body camera kit': 'Police radio + body camera', 'Patrol sedan': 'Patrol car (Toyota Corolla Altis)', 'Police SUV': 'Patrol SUV (Mitsubishi Pajero)', 'Pumper engine': 'Mobil pemadam (fire engine)', '100-ft aerial ladder truck': 'Snorkel ladder truck', HMMWV: 'Pindad Maung', JLTV: 'Pindad Komodo', 'M2 Bradley': 'Pindad Anoa', Stryker: 'Pindad Anoa', 'M1A2 Abrams': 'Leopard 2RI', 'F-16': 'F-16C/D Block 52ID', 'F-35A': 'Dassault Rafale', 'C-130J': 'C-130J Super Hercules', 'MH-60R Seahawk': 'AS565 Panther', 'F/A-18E/F Super Hornet': 'Su-30MK2', 'AAV-7 amphibious assault vehicle': 'BMP-3F (Marinir)' },
    LOCAL_ENTITIES: { sole: 'Usaha perseorangan (sole proprietorship)', llc: 'PT (Perseroan Terbatas)', ccorp: 'PT Tbk (public company)' },
    PRIVATE_TITLES: { 'Chief Executive Officer': 'Direktur Utama' },

    /* Schools and credentials */
    EDUCATION: {
      tuition: { community: ppp(5000000), technical: ppp(8000000), online: ppp(3000000), state: ppp(12000000), private: ppp(40000000), elite: ppp(15000000) },
      schools: { community: 'Politeknik Negeri (D3)', technical: 'Institut Teknologi Sepuluh Nopember (ITS)', online: 'Universitas Terbuka', state: 'Universitas Gadjah Mada', private: 'Universitas Bina Nusantara', elite: 'Universitas Indonesia', academy: 'the Akademi Militer, Magelang' },
      words: { 'High School': 'Senior High School (SMA)', 'high-school diploma': 'SMA certificate', 'high school': 'senior high school (SMA)', GED: 'Paket C equivalency' },
      licenses: {
        'State Bar License': 'Advokat (PERADI)', 'Medical License (MD)': 'STR (Medical Council registration)', 'Board Certification': 'Specialist (Sp.) certification', 'Certified Public Accountant (CPA)': 'CPA Indonesia (IAPI)',
        'Peace Officer (POST Basic Academy)': 'SPN (Polri basic training)', 'Registered Nurse (RN)': 'Ners (STR)', 'Commercial Driver License (Class A)': 'SIM B2', 'Commercial Driver License (Class B)': 'SIM B1', 'Driver\'s License (Class D)': 'SIM A', 'Learner\'s Permit': 'Driving school certificate',
        'Professional Engineer (PE)': 'Insinyur Profesional (PII)', 'EMT (NREMT)': 'Emergency nurse (PSC 119)', 'Paramedic (NRP)': 'Ners (emergency, PSC 119)', 'Pharmacist License (NAPLEX + MPJE)': 'Apoteker (STRA)',
      },
    },
    SHORT_CYCLE: 'Diploma (D3)',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'SIM A', 'Heavy goods vehicle licence (articulated)': 'SIM B2', 'Heavy goods vehicle licence (rigid)': 'SIM B1', 'Bus & coach licence': 'SIM B1 Umum', 'Security licence': 'Satpam Gada Pratama certificate', 'Construction site safety card': 'K3 certificate' },
    PROFESSIONAL_DEGREES: { jd: 'Sarjana Hukum + PKPA (advocate training)', md: 'Pendidikan Dokter (six years)' },
    UNDERGRAD_ENTRY: { jd: 4, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'Pemagangan (apprenticeship, BLK)', years: 1, pay: ppp(40000000), exam: 'BNSP competency certificate' },

    /* Moving here */
    WORKING_HOLIDAY: { name: 'Working Holiday Visa (Australia–Indonesia)', odds: 0.6, years: 1, fee: 150, once: true, partners: { AU: 30 } },
    IMMIGRATION: {
      visas: {
        work: { name: 'KITAS (work permit, RPTKA)', odds: 0.6, years: 2, degree: true, fee: 1200 },
        transfer: { name: 'KITAS (intra-company)', odds: 0.8, years: 2, fee: 1200 },
        student: { name: 'Student KITAS', odds: 0.85, years: 4, postStudy: 0, fee: 200 },
        family: { name: 'Family KITAS (spouse of a citizen)', odds: 0.85, years: 2, fee: 200 },
        retiree: { name: 'Retirement KITAS', odds: 0.85, amount: ppp(36000000), minAge: 55, permanent: false, fee: 300 },
      },
      pr: { name: 'KITAP (permanent stay permit)', years: 5, fee: 500 },
      nat: { years: 5, married: 5, needsPR: true, fromArrival: true, prMin: 0, fee: 400 },
      dualIn: false, dualOut: false, birthright: false, prLapse: 1,
      intlTuition: { mult: 2 },
    },
    ASYLUM: { name: 'UNHCR refugee status determination', odds: 0.4, decision: 3, workAfter: 99, prYears: 0, support: 0 },
    LICENCE_EXCHANGE: [],
    PEERS: [],
    OVERSTAY_BAN: 6,
    BIRTH_REGISTRATION: { name: 'Birth registration at an Indonesian mission', fee: 10, deadline: true },
    PARENT_VISAS: { name: 'Family KITAS (parent)', needs: 'citizen', odds: 0.7, wait: 1, fee: 200 },
    DIASPORA: { share: 0.01, from: [['chinese', 3]] },

    /* Government and politics */
    LEGISLATURES: {
      prov: { name: (p) => `DPRD ${p}`, seats: 100, presiding: 'Ketua DPRD', office: 'id_dprd', exec: 'Governor', execOffice: 'id_governor', veto: false },
      lower: { name: 'People\'s Representative Council (DPR)', seats: 580, presiding: 'Speaker of the DPR', office: 'id_dpr' },
      upper: { name: 'Regional Representative Council (DPD)', seats: 152, presiding: 'Speaker of the DPD', office: 'id_dpd' },
      exec: 'President of Indonesia', execOffice: 'id_president', veto: false,
    },
    PARTY_NAMES: { labor: 'PDI-P (Indonesian Democratic Party of Struggle)', business: 'Gerindra' },
    CORPORATE_RATE: 0.22,
    HEALTH_SYSTEMS: { wait: 6, waitName: 'BPJS referral queue', private: { name: 'Private health insurance', premium: ppp(10000000), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military'], association: [] },
    AGENCIES: only({
      fbi: { name: 'Bareskrim Polri (Criminal Investigation Agency)', employers: ['Bareskrim Polri — Jakarta'], titles: { trainee: 'Penyidik (trainee)', agent: 'Penyidik', senior: 'Penyidik Madya', bau: 'Psikolog forensik', ssa: 'Kanit (Unit Head)', asac: 'Kasubdit', sac_cmd1: 'Direktur', sac_cmd2: 'Wakabareskrim', sac_cmd3: 'Kabareskrim (deputy)', sac: 'Kepala Bareskrim' } },
      dea: { name: 'Badan Narkotika Nasional (BNN)', employers: ['BNN — Jakarta', 'BNNP Bali'] },
      usss: { name: 'Paspampres (Presidential Security Forces)', employers: ['Paspampres — Istana Merdeka'] },
      borderPatrol: { name: 'Directorate General of Immigration', employers: ['Imigrasi — Soekarno-Hatta Airport', 'Imigrasi — Ngurah Rai Airport'] },
      federalPrisons: { name: 'Directorate General of Corrections (Lapas)', employers: ['Lapas Cipinang', 'Lapas Nusakambangan'] },
      postal: { name: 'Pos Indonesia', employers: ['Pos Indonesia — mail processing centre'] },
      benefitsClaims: { name: 'BPJS Ketenagakerjaan', employers: ['BPJS Ketenagakerjaan — branch office'] },
      caseOfficer: { name: 'Badan Intelijen Negara (BIN)', employers: ['BIN — Jakarta'] },
      intelligence: { name: 'Badan Intelijen Negara (BIN)', employers: ['BIN — Jakarta'] },
      meteorology: { name: 'BMKG (Meteorology, Climatology and Geophysics Agency)', employers: ['BMKG — Jakarta'] },
      regulatory: { name: 'Financial Regulation (Bank Indonesia · OJK · DJP)', employers: ['Bank Indonesia', 'Otoritas Jasa Keuangan (OJK)'] },
      foreignService: { name: 'Kementerian Luar Negeri (Foreign Ministry)', employers: ['Kemlu — Jakarta'] },
      parkService: { name: 'National park rangers (Ministry of Forestry)', employers: ['Taman Nasional Komodo', 'Taman Nasional Gunung Leuser'] },
      airTrafficControl: { name: 'AirNav Indonesia', employers: ['Jakarta Air Traffic Service Center', 'Makassar Air Traffic Service Center'] },
      oig: { name: 'BPK (Audit Board of Indonesia)', employers: ['BPK — Jakarta'] },
    }),
    LOCAL_AGENCIES: (b) => ({
      ...b,
      jail: null, statePolice: null, transitPolice: null, corrections: null,
      education: { name: 'Public schools (Dinas Pendidikan)', employer: (c) => `Dinas Pendidikan ${town(c)} — sekolah negeri`, titles: { sub: 'Guru honorer (contract teacher)', teacher: 'Guru (PNS)', senior: 'Guru Madya', coach: 'Pengawas sekolah', specialist: 'Wakil Kepala Sekolah (kurikulum)', chair: 'Koordinator mata pelajaran', ap: 'Wakil Kepala Sekolah', principal: 'Kepala Sekolah', director: 'Kepala Bidang, Dinas Pendidikan', assistantSuper: 'Sekretaris Dinas Pendidikan', ...cmd('superintendent', ['Kepala Dinas Pendidikan (city)'], 'Kepala Dinas Pendidikan Provinsi') } },
      municipalAdmin: { name: 'City government (Pemkot)', employer: (c) => `Pemerintah Kota ${town(c)}`, titles: { clerk: 'Staf (PNS golongan II)', deputyClerk: 'Pengadministrasi', cityClerk: 'Sekretaris DPRD', analyst: 'Analis Keuangan', seniorAnalyst: 'Analis Keuangan Madya', financeDirector: 'Kepala BPKAD (finance)', manager: 'Kepala Dinas', acm: 'Asisten Sekda', ...cmd('cityManager', ['Wakil Sekda'], 'Sekretaris Daerah (Sekda)') } },
      police: {
        name: 'Polri (Indonesian National Police)', employer: (c) => `Polres ${town(c)}`,
        titles: { recruit: 'Bhayangkara Dua (SPN trainee)', officer: 'Brigadir Dua (Bripda)', senior: 'Brigadir', detective: 'Penyidik Pembantu (Reskrim)', seniorDetective: 'Penyidik (Reskrim)', detSergeant: 'Aiptu (Reskrim)', detLieutenant: 'Iptu (Kanit Reskrim)', detCaptain: 'AKP (Kasat Reskrim)', sergeant: 'Brigadir Kepala (Bripka)', lieutenant: 'Inspektur Polisi Dua (Ipda)', captain: 'Ajun Komisaris Polisi (Kapolsek)', deputyChief: 'Komisaris Polisi (Kompol)', ...cmd('chief', ['AKBP (Kapolres)', 'Komisaris Besar (Kombes)', 'Brigadir Jenderal (Kapolda)', 'Inspektur Jenderal'], 'Jenderal Polisi (Kapolri)') },
      },
      fire: {
        name: 'Dinas Pemadam Kebakaran (Damkar)', employer: (c) => `Damkar ${town(c)}`,
        titles: { recruit: 'Petugas Damkar (trainee)', firefighter: 'Petugas Pemadam Kebakaran', engineer: 'Operator mobil pemadam', inspector: 'Inspektur kebakaran', investigator: 'Investigator kebakaran', lieutenant: 'Kepala Regu', captain: 'Kepala Pos (station chief)', battalion: 'Kepala Sektor', deputyChief: 'Kepala Bidang Operasi', ...cmd('chief', ['Sekretaris Dinas'], 'Kepala Dinas Damkar') },
      },
      ems: {
        name: 'PSC 119 (Public Safety Center)', employer: (c) => `PSC 119 ${town(c)}`,
        titles: { emt: 'Emergency nurse (perawat)', paramedic: 'Senior emergency nurse', criticalCare: 'Emergency physician', flight: 'Air ambulance nurse', fto: 'Instructor (BTCLS)', supervisor: 'Team Leader', captain: 'Koordinator PSC', deputy: 'Kepala Seksi Kegawatdaruratan', ...cmd('chief', ['Kepala Bidang Pelayanan Kesehatan'], 'Kepala Dinas Kesehatan') },
      },
      dispatch: { name: '112 Command Center', employer: (c) => `Command Center 112 ${town(c)}`, titles: { trainee: 'Operator (trainee)', telecommunicator: '112 Operator', senior: 'Senior Operator', training: 'Trainer', supervisor: 'Shift Supervisor', ...cmd('director', ['Kepala Command Center'], 'Kepala Dinas Kominfo') } },
      prosecution: { name: 'Kejaksaan', employer: (c) => `Kejaksaan Negeri ${town(c)}`, titles: { clerk: 'Staf Tata Usaha', ada: 'Jaksa Pratama', senior: 'Jaksa Muda', trial: 'Jaksa Madya', chiefDeputy: 'Kepala Kejaksaan Negeri', ...cmd('first', ['Kepala Kejaksaan Tinggi', 'Jaksa Agung Muda'], 'Jaksa Agung (Attorney General)') } },
    }),
    NATIONAL_SERVICES: ['police'],
    POLICE_UNITS: { k9: 'Unit K9 (Satwa)', swat: 'Brimob (Mobile Brigade)', traffic: 'Satlantas (traffic police)', narcotics: 'Satresnarkoba', gang: 'Jatanras (violent crime squad)', negotiator: 'Negotiation unit', sro: 'Bhabinkamtibmas (village police)', instructor: 'SPN (police school)', ia: 'Propam (internal affairs)', protection: 'Densus 88 (counter-terrorism)' },
    POLICE_BUREAUS: { homicide: 'Satreskrim (major crimes)', svu: 'Unit PPA (women and children)', property: 'Satreskrim (property)', robbery: 'Jatanras', cyber: 'Direktorat Siber' },
    VOLUNTEER_MEDAL: 'Penghargaan relawan',

    /* The Indonesian National Armed Forces (TNI) */
    FORCES: {
      pay: 0.35, exposure: 0.4,
      conscription: null,
      branches: {
        army: { name: 'TNI Angkatan Darat (Army)', icon: '🇮🇩', motto: 'Kartika Eka Paksi', basic: 'basic training at a Rindam (regional training regiment)', officerSchool: 'the Akademi Militer, Magelang', enlisted: ENLISTED, officer: OFFICERS },
        navy: { name: 'TNI Angkatan Laut (Navy)', icon: '⚓', motto: 'Jalesveva Jayamahe', basic: 'Kodiklatal, Surabaya', officerSchool: 'the Akademi Angkatan Laut, Surabaya', enlisted: ENLISTED, officer: ['Letnan Dua', 'Letnan Satu', 'Kapten', 'Mayor', 'Letnan Kolonel', 'Kolonel', 'Laksamana Pertama', 'Laksamana Muda', 'Laksamana Madya', 'Laksamana'] },
        airforce: { name: 'TNI Angkatan Udara (Air Force)', icon: '✈️', motto: 'Swa Bhuwana Paksa', basic: 'Kodiklatau training centre', officerSchool: 'the Akademi Angkatan Udara, Yogyakarta', enlisted: ENLISTED, officer: ['Letnan Dua', 'Letnan Satu', 'Kapten', 'Mayor', 'Letnan Kolonel', 'Kolonel', 'Marsekal Pertama', 'Marsekal Muda', 'Marsekal Madya', 'Marsekal'] },
        marines: { name: 'Korps Marinir', icon: '⚓', motto: 'Jalesu Bhumyamca Jayamahe', basic: 'marine recruit training, Surabaya', officerSchool: 'the Akademi Angkatan Laut', enlisted: ENLISTED, officer: OFFICERS },
        guard: { name: 'Komponen Cadangan (Reserve Component)', icon: '🛡️', motto: 'Kartika Eka Paksi', basic: 'reserve basic training', officerSchool: 'the reserve officers\' course', enlisted: ENLISTED, officer: OFFICERS },
      },
      bases: {
        army: [['jakarta', 'Mabes TNI (Cilangkap)'], ['bandung', 'Kodam III/Siliwangi'], ['surabaya', 'Kodam V/Brawijaya'], ['medan', 'Kodam I/Bukit Barisan'], ['makassar', 'Kodam XIV/Hasanuddin'], ['denpasar', 'Kodam IX/Udayana']],
        navy: [['surabaya', 'Koarmada II (Ujung Naval Base)'], ['jakarta', 'Koarmada I (Tanjung Priok)'], ['makassar', 'Lantamal VI']],
        airforce: [['jakarta', 'Halim Perdanakusuma Air Base'], ['makassar', 'Sultan Hasanuddin Air Base'], ['medan', 'Soewondo Air Base']],
        marines: [['surabaya', 'Pasmar 1, Surabaya']],
      },
      overseas: {
        army: [['Lebanon', 'UNIFIL (Garuda Contingent)', 1, false], ['Democratic Republic of the Congo', 'MONUSCO (Garuda Contingent)', 1, false]],
        navy: [['Lebanon', 'UNIFIL Maritime Task Force', 1, false]],
        airforce: [['Central African Republic', 'MINUSCA air unit', 1, false]],
        marines: [['Lebanon', 'UNIFIL (Garuda Contingent)', 1, false]],
      },
    },
    MIL_SPECIAL: { drill: { names: 'Rindam basic training instructor' }, recruiter: { names: 'Ajendam recruitment officer' }, honorGuard: { names: 'Paspampres honour guard', desc: 'State ceremonies at the Istana Merdeka and 17 August.' }, rotc: { names: 'Instructor, Akademi Militer' }, joint: { names: 'Staff officer, Mabes TNI' }, fellow: { names: 'Fellow, Lemhannas (National Resilience Institute)' }, commissioning: 'Sekolah Calon Perwira (officer candidate school) from the ranks', chiefs: { army: 'Kepala Staf Angkatan Darat (KSAD)', navy: 'Kepala Staf Angkatan Laut (KSAL)', airforce: 'Kepala Staf Angkatan Udara (KSAU)', marines: 'Komandan Korps Marinir' }, chairman: 'Panglima TNI (Commander of the Armed Forces)' },
    PME: { enlisted: ['Secaba (NCO school)', 'Susbaint', 'Sussarcab', 'Sus Bintara Tinggi', 'Sus Pembantu Letnan'], officer: ['Suslapa (company officers\' course)', 'Seskoad (army staff college)', 'Lemhannas'] },
    QUALS: { airborne: 'Kursus Para Dasar (airborne)', rangerSchool: 'Kursus Raider', jumpmaster: 'Jumpmaster course', pathfinder: 'Kursus Intai Tempur (combat recon)', combatDiver: 'Kursus Kopaska', dli: 'Language school (Pusdiklat Bahasa)', instructor: 'Instructors\' course', sere: 'Survival course (jungle)', expertBadge: 'Raider qualification' },
    SOF: {
      ranger: sf('Kopassus', 'the Kopassus selection and commando course', 'Kopassus, Cijantung', 'red beret', 'The army\'s special forces: counter-terrorism, reconnaissance and raids.', ['an operation in the Papuan highlands', 'a counter-terrorism standby in Jakarta']),
      seal: sf('Kopaska', 'the Kopaska combat swimmer course', 'Kopaska (Navy combat frogmen)', 'Kopaska badge', 'Navy combat divers and maritime counter-terrorism.', ['a maritime counter-terrorism exercise in the Malacca Strait']),
      raider: sf('Denjaka', 'Denjaka selection', 'Detasemen Jala Mangkara (Marine Corps)', 'Denjaka badge', 'Marine Corps counter-terrorism detachment.', ['a hostage-rescue exercise at sea']),
      pararescue: sf('Kopasgat', 'Kopasgat selection', 'Korps Pasukan Gerak Cepat (Air Force)', 'orange beret', 'Air Force special forces: airfield seizure and combat search and rescue.', ['a combat search and rescue mission']),
    },
    MIL_UNITS: { ground: ['Kostrad (Army Strategic Reserve)', 'Kopassus', 'Yonif 330 Raider', 'Kodam Jaya'], naval: ['KRI Raden Eddy Martadinata', 'KRI I Gusti Ngurah Rai', 'KRI Nagapasa (submarine)'], air: ['Skadron Udara 3 (F-16)', 'Skadron Udara 11 (Su-30)', 'Skadron Udara 31 (C-130)'], marines: ['Pasmar 1', 'Pasmar 2', 'Denjaka'] },
    MIL_SUMMARY: 'a disciplinary punishment by your commander (Law on Military Discipline)',
    SERVICE_TERMS: { maxYears: { enlisted: 35, officer: 35 }, ages: { enlisted: 58, officer: 58, flag: 60 }, join: { enlisted: [18, 22], officer: [18, 24] }, name: 'ikatan dinas' },
    MILITARY_JUSTICE: { code: 'the Military Criminal Code (KUHPM)', court: 'a military court (Pengadilan Militer)', prison: 'a military prison (Masmil)', counsel: 'Military legal aid (Babinkum)' },
    VETTING: { form: 'security screening (litsus)', publicTrust: 'Terbatas', secret: 'Rahasia', topSecret: 'Sangat Rahasia' },
    CAMPUS: null,
    ACADEMY_NAMES: { army: 'the Akademi Militer, Magelang', navy: 'the Akademi Angkatan Laut, Surabaya', airforce: 'the Akademi Angkatan Udara, Yogyakarta' },
    THEATERS: [
      { id: 'papua', name: 'security operations in the Papuan highlands', adversary: 'armed separatists', intensity: 1, home: 0.2, weight: 40, internal: true },
      { id: 'peacekeeping', name: 'a UN peacekeeping mission that turned into combat', adversary: 'militias', intensity: 1, home: 0, weight: 15 },
    ],
    WAR_START_CHANCE: 0.005,
    MEDALS: {
      moh: { name: 'Bintang Sakti', ribbon: R('#ff0000', '#ffffff', '#ff0000') }, serviceCross: { name: 'Bintang Dharma' }, silverStar: { name: 'Bintang Yudha Dharma Nararya' },
      dsm: { name: 'Bintang Yudha Dharma Utama' }, legionOfMerit: { name: 'Bintang Kartika Eka Pakçi Nararya' }, bronzeStar: { name: 'Satyalancana Dharma Nusa' },
      purpleHeart: null, msm: { name: 'Satyalancana Kesetiaan (16 years)' }, commendation: { name: 'Commander\'s commendation (Piagam Penghargaan)' }, achievement: { name: 'Satyalancana Dwidya Sistha' },
      combatAction: null, goodConduct: { name: 'Satyalancana Kesetiaan (8 years)' }, humanitarian: { name: 'Satyalancana Kebaktian Sosial' }, expeditionary: { name: 'Satyalancana Santi Dharma (peacekeeping)' }, ndsm: null,
    },
    ORDERS: {
      minAge: 35,
      tiers: [
        { id: 'wiraKarya', name: 'Satyalancana Wira Karya', min: 40, ribbon: R('#ff0000', '#ffffff', '#ff0000') },
        { id: 'jasaPratama', name: 'Bintang Jasa Pratama', min: 80, ribbon: R('#ff0000', '#ffffff', '#ff0000') },
        { id: 'jasaUtama', name: 'Bintang Jasa Utama', min: 130, ribbon: R('#ff0000', '#ffd700', '#ff0000') },
        { id: 'mahaputeraNararya', name: 'Bintang Mahaputera Nararya', min: 190, ribbon: R('#ff0000', '#ffd700', '#ff0000') },
        { id: 'mahaputeraUtama', name: 'Bintang Mahaputera Utama', min: 260, ribbon: R('#ff0000', '#ffd700', '#ff0000') },
      ],
    },
    PARDON: 'the President (grasi)',
    COMBAT_TEMPO: 0.25,
    MIL_PENSIONS: { name: 'ASABRI pension', rate: 0.025, cap: 0.75, vest: 10, immediate: { enlisted: 20, officer: 20 }, deferredAge: 58, lumpSum: 0.05 },
    DIRECT_ENTRY: {
      police: [
        { id: 'akpol', name: 'Akademi Kepolisian (Akpol) cadetship', levelId: 'lieutenant', education: 'highschool', maxAge: 22, odds: 0.05, school: 'four years at Akpol, Semarang' },
        { id: 'sipss', name: 'SIPSS (graduate officer entry)', levelId: 'lieutenant', education: 'bachelor', maxAge: 30, odds: 0.1, school: 'the Sekolah Inspektur Polisi Sumber Sarjana' },
      ],
    },
    BENCHES: {
      route: 'career', appointedBy: 'the Supreme Court (Mahkamah Agung)', retire: 65,
      school: { name: 'judicial training (Badan Strategi Kebijakan dan Diklat Hukum)', exam: 'Calon Hakim selection (CPNS)', years: 2, maxAge: 32, practiceInstead: 0, stipend: 6000, minSmarts: 60 },
      ladder: [
        { id: 'pn', name: 'Hakim Pengadilan Negeri (District Court Judge)', icon: '⚖️', salary: 20000, entry: true },
        { id: 'ketuaPn', name: 'Ketua Pengadilan Negeri (Chief Judge, District Court)', icon: '🔨', salary: 26000, after: 10 },
        { id: 'pt', name: 'Hakim Pengadilan Tinggi (High Court Judge)', icon: '📜', salary: 32000, after: 18 },
        { id: 'ma', name: 'Hakim Agung (Supreme Court Justice)', icon: '🏛️', salary: 45000, pick: 'nominated', minYears: 20, appointedBy: 'the DPR, from the Judicial Commission\'s nominees' },
      ],
    },
  },
};
