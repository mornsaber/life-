/**
 * A country from a short description. The full packs (KE.js, IE.js…) spell
 * out every table by hand; `nation(spec)` builds the same shape from a spec of
 * the things that make a country itself — its money, taxes, places, names,
 * government, police, armed forces, courts, schools, honours and wars — and
 * names everything else from those (the "Ghana Police Service", the
 * "Norwegian Armed Forces"…). Like every pack it is plain data: no imports.
 *
 * Every nation is built on the Philippines (`basedOn: 'PH'`, as Kenya is): the
 * tables that matter are all overridden here, and what's left is structure.
 *
 * A spec (amounts in local currency; `ppp` is local units per US$ at PPP):
 *   id, name, flag, demonym, capital, cur: [code, symbol], ppp, languages,
 *   emergency, retire, informality, tax: { allowance, brackets: [[width, rate]],
 *   contributions: [[name, rate, cap]], label, short, vat, corporate },
 *   pension: { name, short, kind: 'account'|'flat', rate, flat }, health: { name, short,
 *   coinsurance, oopMax, wait }, names: { male, female, last },
 *   provinces: [[code, name, population]], provinceWord, cities: [[id, name, icon, type,
 *   province, size, population, col, market]], hometowns,
 *   gov: { system: 'presidential'|'semi'|'parliamentary'|'monarchy'|'absolute'|'military'|'oneParty',
 *     head, lower: [name, seats, member], upper: [name, seats, member, elected], term,
 *     local: [executive, assembly], parties: [left, right], pardon },
 *   police: { name, local, academy, head, ranks }, fire, ems, prosecution, prosecutor,
 *   intel, foreign, prisons, border, statistics, parks, audit,
 *   forces: { army, navy, air, reserve, academy, basic, staffCollege, head, conscription (Conscription.js shape),
 *     ranks: { enlisted, officer, navyEnlisted, navyOfficer }, bases: { army: [[city, base]] },
 *     overseas: [[country, mission]], sof: [name, course, unit, badge, desc], units },
 *   war: [{ id, name, adversary, intensity, home, weight, internal }], warChance,
 *   orders: [[post-nominal, name]], medals: { top, valour, service, campaign },
 *   courts: { top, high, appeal, magistrate, appointedBy },
 *   edu: { exam, state, private, elite, tvet, open, academy, tech, words },
 *   immig: { work, pr, natYears, dual, birthright, asylum },
 *   unions: federation, stock, lender, redCrescent, monarchy, religion, farm, volunteer,
 *   terms, groups, freeMovement, licenceExchange, cityFare
 */

const town = (c) => String(c).split(',')[0];
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const R = (...colors) => colors.map((c) => [c, 1]);

export const ENLISTED = ['Private', 'Private First Class', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Sergeant First Class', 'Master Sergeant', 'Sergeant Major', 'Command Sergeant Major'];
export const OFFICERS = ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'];
export const NAVY_ENLISTED = ['Seaman Recruit', 'Seaman', 'Leading Seaman', 'Petty Officer', 'Chief Petty Officer', 'Senior Chief Petty Officer', 'Master Chief Petty Officer', 'Warrant Officer', 'Fleet Master Chief'];
export const NAVY_OFFICERS = ['Ensign', 'Lieutenant (junior grade)', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Commodore', 'Rear Admiral', 'Vice Admiral', 'Admiral'];
const POLICE_RANKS = ['Police Recruit', 'Police Constable', 'Senior Constable', 'Sergeant', 'Inspector', 'Chief Inspector', 'Superintendent', 'Senior Superintendent', 'Assistant Commissioner', 'Deputy Commissioner'];

const SIZE_POP = { mega: 'enterprise', enterprise: 'enterprise', large: 'large', medium: 'medium', small: 'small' };

export function nation(s) {
  const P = (local) => Math.round(local / s.ppp);
  const id = s.id;
  const lc = id.toLowerCase();
  const g = s.gov ?? {};
  const term = g.term ?? 5;
  const dem = s.demonym;
  const cityName = (cid) => s.cities.find((c) => c[0] === cid)?.[1] ?? s.capital;
  const firstCity = (type) => (s.cities.find((c) => c[3] === type) ?? s.cities[0])[0];
  const capitalId = s.cities[0][0];
  const second = (s.cities[1] ?? s.cities[0])[0];
  const coastal = (s.cities.find((c) => /Coastal|port/i.test(c[3])) ?? s.cities[1] ?? s.cities[0])[0];
  const pw = s.provinceWord ?? 'Province';
  const police = { name: `${s.name} National Police`, local: (c) => `${s.police?.name ?? `${s.name} National Police`} — ${town(c)}`, academy: `the National Police Academy`, head: 'Inspector-General of Police', ...s.police };
  const pr = police.ranks ?? POLICE_RANKS;
  const forces = s.forces ?? {};
  const fr = forces.ranks ?? {};
  const enlisted = fr.enlisted ?? ENLISTED;
  const officer = fr.officer ?? OFFICERS;
  const navyEnlisted = fr.navyEnlisted ?? NAVY_ENLISTED;
  const navyOfficer = fr.navyOfficer ?? NAVY_OFFICERS;
  const academy = forces.academy ?? `the ${s.name} Military Academy`;
  const basic = forces.basic ?? 'basic training at the recruit training centre';
  const armyName = forces.army ?? `${s.name} Army`;
  const navyName = forces.navy === null ? null : forces.navy ?? `${s.name} Navy`;
  const airName = forces.air ?? `${s.name} Air Force`;
  const reserveName = forces.reserve ?? `${dem} Army Reserve`;
  const tax = s.tax ?? {};
  const pension = { name: `${dem} state pension`, short: 'the state pension', kind: 'account', rate: 0.1, ...s.pension };
  const health = { name: 'the public health service', short: 'public health', coinsurance: 0.3, oopMax: s.ppp * 2500, wait: 6, ...s.health };
  const courts = { top: 'Supreme Court', high: 'High Court', appeal: 'Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the Judicial Service Commission', ...s.courts };
  const edu = { exam: 'national school-leaving examination', state: `University of ${s.capital}`, private: `${s.capital} Private University`, elite: `National University of ${s.name}`, tvet: 'Technical and Vocational College', open: `Open University of ${s.name}`, tech: `${s.name} University of Technology`, ...s.edu };
  const immig = { work: 'Work permit', pr: 'Permanent residence', natYears: 10, dual: true, birthright: false, ...s.immig };
  const lender = s.lender ?? 'a commercial bank';
  const crescent = s.redCrescent ? `${s.name} Red Crescent` : `${s.name} Red Cross`;
  const left = g.parties?.[0] ?? 'Social Democratic Party';
  const right = g.parties?.[1] ?? 'National Party';
  const elected = !['absolute', 'military', 'oneParty'].includes(g.system);
  const presidential = ['presidential', 'semi'].includes(g.system);
  const head = g.head ?? (presidential ? `President of ${s.name}` : 'Prime Minister');

  // Offices: the lower house, an elected upper house, a president (or a prime minister who leads from the lower house).
  const offices = {};
  if (elected) {
    offices[`${lc}_mp`] = { country: id, name: g.lower?.[2] ?? `Member of the ${g.lower?.[0] ?? 'National Assembly'}`, icon: '🏛️', level: 4, term, termLimit: 0, salary: 60000, minAge: 21, residency: 1, cost: 150000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' };
    if (g.upper && g.upper[3] !== false) offices[`${lc}_senator`] = { country: id, name: g.upper[2] ?? 'Senator', icon: '🏛️', level: 4, term: g.upper[4] ?? term, termLimit: 0, salary: 70000, minAge: 30, residency: 1, cost: 250000, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'legislative' };
    if (presidential) offices[`${lc}_president`] = { country: id, name: head, icon: s.flag, level: 5, term: g.presTerm ?? term, termLimit: g.termLimit ?? 2, salary: 120000, minAge: 35, residency: 1, cost: 15000000, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true };
    else offices[`${lc}_pm`] = { country: id, name: head, icon: s.flag, level: 5, term, termLimit: 0, salary: 150000, minAge: 21, residency: 1, cost: 600000, requires: [`${lc}_mp`], leader: true, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true };
  }
  if (elected && g.local) offices[`${lc}_governor`] = { country: id, name: g.local[0], icon: '⭐', level: 4, term, termLimit: 2, salary: 50000, minAge: 30, residency: 1, cost: 800000, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true };
  if (elected && g.local?.[1]) offices[`${lc}_mpa`] = { country: id, name: `Member of the ${g.local[1]}`, icon: '🏛️', level: 3, term, termLimit: 0, salary: 25000, minAge: 21, residency: 1, cost: 30000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' };

  const county = (name, popM) => ({ name, incomeTax: [], propertyTax: s.propertyTax ?? 0.005, salesTax: tax.vat ?? 0.1, rightToWork: false, cannabis: false, dui: { fineMult: 1, suspendYears: 1 }, minWage: s.minWage ? P(s.minWage) : P(s.ppp * 3), population: popM >= 8 ? 'enterprise' : popM >= 3 ? 'large' : popM >= 1 ? 'medium' : 'small', disasters: s.disasters ?? { flood: 0.03 } });
  const fare = (col) => Math.round((s.cityFare ?? 30) * col);

  const country = {
    name: s.name,
    flag: s.flag,
    demonym: dem,
    capital: s.capital,
    currency: { code: s.cur[0], symbol: s.cur[1], perUsd: s.ppp },
    languages: s.languages,
    emergency: s.emergency ?? '112',
    retirementAge: s.retire ?? 60,
    informality: s.informality ?? 0.3,
    tax: {
      allowance: P(tax.allowance ?? 0),
      brackets: (tax.brackets ?? [[Infinity, 0.2]]).map(([w, r]) => [w === Infinity ? Infinity : P(w), r]),
      contributions: (tax.contributions ?? []).map(([name, rate, cap]) => ({ name, rate, from: 0, to: cap == null ? Infinity : P(cap) })),
      label: tax.label ?? `${s.name} Revenue Authority`,
    },
    pension: pension.kind === 'flat'
      ? { kind: 'flat', name: pension.name, full: P(pension.flat ?? 0), years: pension.years ?? 30, minYears: 10, ages: [s.retire ?? 60, s.retire ?? 60] }
      : { kind: 'account', name: pension.name, rate: pension.rate, growth: 0.05, cap: P(pension.cap ?? s.ppp * 60000), annuity: 15, flat: 0, ages: [(s.retire ?? 60) - 5, s.retire ?? 60] },
    health: { name: health.name, short: health.short, deductible: 0, coinsurance: health.coinsurance, oopMax: P(health.oopMax) },
    childBenefit: s.childBenefit ? { amount: P(s.childBenefit[0]), phaseOutFrom: Infinity, name: s.childBenefit[1] } : { amount: 0, phaseOutFrom: Infinity, name: 'no child benefit' },
    terms: {
      'Federal government': 'National Government', 'State government': `${pw} Government`, 'Federal income tax': tax.short ?? 'income tax', 'State income tax': tax.short ?? 'income tax',
      'Social Security': pension.short, '401(k)': 'occupational pension scheme', IRA: 'personal pension plan', IRS: tax.short ?? 'the tax authority', Medicaid: health.short, Medicare: health.short, 'GI Bill': 'veterans\' education support',
      'SSS pension': pension.name, SSS: pension.short, PhilHealth: health.short, 'Pag-IBIG': 'housing fund',
      ...s.terms,
    },
    names: s.names,
    provinces: Object.fromEntries(s.provinces.map(([code, name, popM]) => [code, county(name, popM ?? 1)])),
    cities: Object.fromEntries(s.cities.map(([cid, name, icon, type, prov, size, popN, col = 0.6, market = 0.45]) => [cid, { name, icon, type, state: prov, col, market, locality: 0.12, transit: type === 'Rural' ? 3 : size === 'small' ? 10 : 35, fare: type === 'Rural' ? 0 : fare(col), walkable: type !== 'Rural', size: SIZE_POP[size] ?? 'medium', population: [popN, popN] }])),
    hometowns: s.hometowns ?? [capitalId, capitalId, ...s.cities.map((c) => c[0])],
    population: Object.fromEntries(s.provinces.map(([code, , popM]) => [code, (popM ?? 1) * 1e6])),
  };

  const ordersTiers = (s.orders ?? [['NOM', `National Order of Merit (Knight)`], ['ONM', 'National Order of Merit (Officer)'], ['CNM', 'National Order of Merit (Commander)'], ['GONM', 'National Order of Merit (Grand Officer)']])
    .map(([pn, name], i, all) => ({ id: pn, name: `${name}${pn ? ` (${pn})` : ''}`.replace(/ \(\)$/, ''), min: [40, 80, 130, 190, 260][Math.min(4, i + (5 - all.length))], ribbon: R(...(s.ribbon ?? ['#cc0000', '#ffffff', '#cc0000'])) }));
  const medals = { top: `${s.name} Medal of Valour`, valour: 'Medal for Gallantry', service: 'Distinguished Service Medal', merit: 'Meritorious Service Medal', campaign: forces.overseas?.length ? `${forces.overseas[0][0]} Campaign Medal` : 'Operational Service Medal', ...s.medals };

  const tables = {
    /* Law and money */
    JUSTICE: { trial: s.jury ? 'jury' : 'bench', ...(s.jury ? { juror: s.juror ?? 'jury service', jurorPay: 40 } : {}), ...(s.death ? { death: { status: 'active', method: s.death } } : {}), sentence: s.sentence ?? 1, jail: (c) => `${town(c)} remand prison`, prison: `a ${s.prisons ?? `${s.name} Prison Service`} prison`, legalAid: s.legalAid ?? 'a legal aid lawyer', privatePrisons: 0 },
    INSOLVENCY: { liquidation: { name: s.insolvency ?? 'Bankruptcy', wait: 4 }, plan: { name: 'Debt settlement arrangement', years: 3, wait: 2 }, homestead: 0, wildcard: P(s.ppp * 3000), creditYears: 5 },
    INHERITANCE: s.inheritance ?? { name: 'no inheritance tax', exemption: Infinity, brackets: [[Infinity, 0]] },
    UNEMPLOYMENT: s.unemployment ? { name: s.unemployment[0], rate: s.unemployment[1], cap: P(s.unemployment[2] ?? s.ppp * 30000), years: s.unemployment[3] ?? 0.5 } : { name: 'no unemployment benefit', flat: 0, years: 0 },
    SEVERANCE: { perYear: s.severance ?? 15 / 365, base: 0 },
    DISABILITY: { name: `${pension.short} invalidity benefit`, rate: 0.35, floor: P(s.ppp * 1500), cap: P(s.ppp * 15000), minYears: 3, odds: 0.65, stages: ['Medical board', 'Review', `${courts.high}`] },
    SELF_EMPLOYED: { name: `${pension.short} voluntary contributions`, rate: pension.rate ?? 0.1, cap: P(s.ppp * 60000) },
    CREDIT: { name: s.creditBureau ?? 'credit report (credit bureau)' },
    SMALL_BIZ_LOAN: s.smallBiz ?? 'SME development bank loan',
    VETERANS: { orgs: [s.veterans ?? `${dem} Veterans Association`], care: forces.hospital ?? `the ${s.name} Armed Forces Hospital` },
    STOCK_INDEX: s.stock ?? `${s.capital} Stock Exchange index`,
    MORTGAGES: { closing: 0.04, stress: 0.03, products: { bank: { name: `Mortgage from ${lender} (20-yr)`, years: 20, rateAdj: s.mortgageRate ?? 0.04, minDown: 0.2, minScore: 600, maxDti: 0.35 } } },
    UNIONS: { police: null, fire: s.unions ?? null, ems: s.unions ?? null, health: s.unions ?? null, education: s.teachersUnion ?? s.unions ?? null, public: s.unions ?? null, prisons: null, transport: s.unions ?? null, rail: s.unions ?? null, aviation: s.unions ?? null, pilots: null, trades: s.unions ?? null, industry: s.unions ?? null, retail: s.unions ?? null, hospitality: s.unions ?? null, services: s.unions ?? null, media: s.unions ?? null, tech: null, arts: null, postal: s.unions ?? null },
    CADETS: { jrotc: s.cadets ?? 'Scouts', seaCadets: null },
    FOREIGN_SERVICE_EXAM: `${s.foreign ?? 'Ministry of Foreign Affairs'} diplomatic entrance examination`,
    PROSECUTORS: [s.prosecution ?? 'Public Prosecution Service', s.legalAidBody ?? 'Legal Aid Office', 'Probation Service'],
    VOLUNTEER_SERVICES: { fire: s.volunteer?.fire ?? null, police: s.volunteer?.police ?? null, sar: `${crescent} search and rescue`, ambulance: `${crescent} ambulance volunteers`, wildland: null, auxiliary: null, cap: null, cert: s.volunteer?.civil ?? 'Civil Defence volunteers', redcross: `${crescent} Society`, skiPatrol: null, mrc: null },
    VOLUNTEER_PARENTS: {},
    NATIONAL_SERVICE: { overseas: null, domestic: s.nationalService ?? null },
    ACCOUNTS: { dc: 'Occupational pension scheme', roth: { name: 'Investment fund / shares', limit: P(s.ppp * 50000) }, traditional: { name: 'Personal pension plan', limit: P(s.ppp * 5000), share: 0.3 } },
    REFERENDUMS: {},
    ENTRANCE_EXAMS: { name: edu.exam, prep: { name: 'tutoring and revision classes', cost: P(s.ppp * 600) }, weight: 0.85 },
    AVIATION_AUTHORITY: s.aviation ?? `${s.name} Civil Aviation Authority`,
    COUNTY: pw,
    LONG_TERM_CARE: { name: s.longTermCare ?? 'family care (no public long-term care)', covers: s.longTermCare ? 0.5 : 0, safetyNet: s.safetyNet ?? 'social assistance' },
    WORKPLACE: { equality: s.labourCourt ?? 'the labour court', reservist: 'job protection for reservists', labourBoard: s.labourCourt ?? 'the labour court' },
    EQUIPMENT: { 'Digital radio + body camera kit': 'Police radio', 'Patrol sedan': 'Patrol car', 'Police SUV': 'Police 4×4', 'Pumper engine': 'Fire engine', '100-ft aerial ladder truck': 'Aerial ladder', HMMWV: 'Light utility vehicle', JLTV: 'MRAP', 'M2 Bradley': 'Infantry fighting vehicle', Stryker: 'Armoured personnel carrier', 'M1A2 Abrams': 'Main battle tank', 'F-16': 'Fighter jet', 'F-35A': 'Fighter jet', 'C-130J': 'Transport aircraft', 'MH-60R Seahawk': 'Naval helicopter', 'F/A-18E/F Super Hornet': 'Fighter jet', ...s.equipment },
    LOCAL_ENTITIES: { sole: 'Sole proprietorship', llc: 'Private limited company', ccorp: 'Public limited company' },
    PRIVATE_TITLES: { 'Chief Executive Officer': 'Managing Director' },

    /* Schools and credentials */
    EDUCATION: {
      tuition: { community: P(s.ppp * 400), technical: P(s.ppp * 700), online: P(s.ppp * 500), state: P(s.ppp * (s.fees ?? 900)), private: P(s.ppp * 4000), elite: P(s.ppp * (s.fees ?? 900)) },
      schools: { community: edu.tvet, technical: edu.tech, online: edu.open, state: edu.state, private: edu.private, elite: edu.elite, academy: academy },
      words: { 'High School': 'Secondary School', 'high-school diploma': `${edu.exam} certificate`, 'high school': 'secondary school', GED: `${edu.exam} (private candidate)`, ...edu.words },
      licenses: {
        'State Bar License': `Admission to the bar (${s.bar ?? `${s.name} Bar Association`})`, 'Medical License (MD)': `Medical registration (${s.medicalCouncil ?? 'Medical Council'})`, 'Board Certification': 'Specialist registration', 'Certified Public Accountant (CPA)': 'Chartered Accountant',
        'Peace Officer (POST Basic Academy)': police.academy.replace(/^the /, ''), 'Registered Nurse (RN)': 'Registered nurse (Nursing Council)', 'Commercial Driver License (Class A)': 'Driving licence class CE', 'Commercial Driver License (Class B)': 'Driving licence class C', 'Driver\'s License (Class D)': 'Driving licence class B', 'Learner\'s Permit': 'Learner driving permit',
        'Professional Engineer (PE)': 'Registered Professional Engineer', 'EMT (NREMT)': 'Emergency Medical Technician', 'Paramedic (NRP)': 'Paramedic', 'Pharmacist License (NAPLEX + MPJE)': 'Registered Pharmacist',
      },
    },
    SHORT_CYCLE: 'Technical diploma',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'Driving licence class B', 'Heavy goods vehicle licence (articulated)': 'Driving licence class CE', 'Heavy goods vehicle licence (rigid)': 'Driving licence class C', 'Bus & coach licence': 'Driving licence class D', 'Security licence': 'Private security licence', 'Construction site safety card': 'Construction safety card', 'Learner licence': 'Learner driving permit' },
    PROFESSIONAL_DEGREES: { jd: 'Bachelor of Laws (LL.B.) + bar training', md: 'Bachelor of Medicine (six years)' },
    UNDERGRAD_ENTRY: { jd: 4, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'Vocational apprenticeship', years: 2, pay: P(s.ppp * 3000), exam: 'trade test' },

    /* Moving here */
    WORKING_HOLIDAY: null,
    IMMIGRATION: {
      visas: {
        work: { name: immig.work, odds: 0.5, years: 2, degree: true, fee: 1000 },
        transfer: { name: `${immig.work} (intra-company)`, odds: 0.7, years: 2, fee: 1000 },
        student: { name: 'Student visa', odds: 0.85, years: 4, postStudy: 0, fee: 100 },
        family: { name: 'Family residence permit (spouse of a citizen)', odds: 0.8, years: 2, fee: 100 },
      },
      pr: { name: immig.pr, years: immig.prYears ?? 5, fee: 1000 },
      nat: { years: immig.natYears, married: immig.married ?? Math.max(3, immig.natYears - 3), needsPR: true, fromArrival: true, prMin: 0, fee: 500 },
      dualIn: immig.dual, dualOut: immig.dual, birthright: immig.birthright, prLapse: 5,
      intlTuition: { mult: 1.5 },
    },
    ASYLUM: immig.asylum === false ? null : { name: immig.asylum ?? 'Refugee status', odds: 0.4, decision: 2, workAfter: 2, prYears: 0, support: 0 },
    LICENCE_EXCHANGE: [],
    PEERS: [],
    OVERSTAY_BAN: 5,
    BIRTH_REGISTRATION: { name: `Registration of a birth abroad (${dem} embassy)`, fee: 10, deadline: false },
    PARENT_VISAS: { name: 'Dependant residence permit (parent)', needs: 'resident', odds: 0.6, wait: 1, fee: 100 },
    DIASPORA: { share: s.diaspora ?? 0.03, from: s.diasporaFrom ?? [['IN', 1], ['PH', 1]] },

    /* Government and politics */
    LEGISLATURES: {
      ...(g.local?.[1] ? { prov: { name: (p) => `${p} ${g.local[1]}`, seats: 40, presiding: 'Speaker', office: elected ? `${lc}_mpa` : null, exec: g.local[0], execOffice: elected ? `${lc}_governor` : null, veto: true } } : {}),
      lower: { name: g.lower?.[0] ?? 'National Assembly', seats: g.lower?.[1] ?? 200, presiding: g.lower?.[3] ?? 'Speaker', office: elected ? `${lc}_mp` : null },
      ...(g.upper ? { upper: { name: g.upper[0], seats: g.upper[1], presiding: 'President of the ' + g.upper[0], office: elected && g.upper[3] !== false ? `${lc}_senator` : null } } : {}),
      exec: head, execOffice: elected ? (presidential ? `${lc}_president` : `${lc}_pm`) : null, veto: presidential,
    },
    PARTY_NAMES: { labor: left, business: right },
    CORPORATE_RATE: tax.corporate ?? 0.25,
    HEALTH_SYSTEMS: { wait: health.wait, waitName: 'public hospital queue', private: { name: s.privateHealth ?? 'Private health insurance', premium: P(s.ppp * 1200), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military'], association: [] },
    AGENCIES: (b) => ({
      ...Object.fromEntries(Object.keys(b ?? {}).map((k) => [k, null])),
      fbi: { name: s.cid ?? `${police.name} Criminal Investigation Department`, employers: [`CID Headquarters — ${s.capital}`, `CID — ${cityName(second)}`], titles: { trainee: 'Detective (probation)', agent: 'Detective', senior: 'Senior Detective', bau: 'Criminal intelligence analyst', ssa: 'Detective Inspector', asac: 'Detective Superintendent', sac_cmd1: 'Detective Chief Superintendent', sac_cmd2: 'Assistant Director of CID', sac_cmd3: 'Deputy Director of CID', sac: 'Director of Criminal Investigations' } },
      borderPatrol: { name: s.border ?? `${s.name} Immigration and Border Service`, employers: [`${s.capital} international airport`, 'Border crossing post'] },
      federalPrisons: { name: s.prisons ?? `${s.name} Prison Service`, employers: [`${s.capital} Central Prison`, `${cityName(second)} Prison`] },
      postal: { name: s.post ?? `${s.name} Post`, employers: [`${s.name} Post — ${s.capital} head office`] },
      benefitsClaims: { name: s.pensionAgency ?? pension.short.replace(/^the /, ''), employers: [`${s.pensionAgency ?? 'Social insurance'} — ${s.capital}`] },
      ...(s.intel === null ? {} : { caseOfficer: { name: s.intel ?? `${s.name} Intelligence Service`, employers: [`${s.intel ?? 'Intelligence Service'} — ${s.capital}`] }, intelligence: { name: s.intel ?? `${s.name} Intelligence Service`, employers: [`${s.intel ?? 'Intelligence Service'} — ${s.capital}`] } }),
      meteorology: { name: s.met ?? `${s.name} Meteorological Department`, employers: [`Meteorological Department — ${s.capital}`] },
      regulatory: { name: `Financial Regulation (${s.centralBank ?? `Central Bank of ${s.name}`})`, employers: [s.centralBank ?? `Central Bank of ${s.name}`] },
      foreignService: { name: s.foreign ?? 'Ministry of Foreign Affairs', employers: [`${s.foreign ?? 'Ministry of Foreign Affairs'} — ${s.capital}`] },
      parkService: { name: s.parks ?? `${s.name} National Parks Authority`, employers: ['A national park', 'A wildlife reserve'] },
      airTrafficControl: { name: `${s.aviation ?? `${s.name} Civil Aviation Authority`} air navigation services`, employers: [`${s.capital} area control centre`] },
      nationalLab: { name: s.research ?? `${s.name} National Research Council`, employers: [`${s.research ?? 'National Research Council'} — ${s.capital}`] },
      oig: { name: s.audit ?? 'Office of the Auditor-General', employers: [`${s.audit ?? 'Office of the Auditor-General'} — ${s.capital}`] },
    }),
    LOCAL_AGENCIES: (b) => ({
      ...b,
      jail: null, statePolice: null, transitPolice: null, corrections: null,
      education: { name: s.education ?? 'Ministry of Education', employer: (c) => `public school in ${town(c)}`, titles: { sub: 'Trainee Teacher', teacher: 'Teacher', senior: 'Senior Teacher', coach: 'Subject Adviser', specialist: 'Head of Department', chair: 'Senior Master', ap: 'Deputy Head', principal: 'Head Teacher', director: 'District Education Officer', assistantSuper: `${pw} Director of Education`, ...cmd('superintendent', ['Deputy Minister\'s Office'], 'Permanent Secretary for Education') } },
      municipalAdmin: { name: s.localGov ?? 'Municipal Council', employer: (c) => `${town(c)} ${s.localGovWord ?? 'Municipality'}`, titles: { clerk: 'Clerical Officer', deputyClerk: 'Administrative Officer', cityClerk: 'Council Secretary', analyst: 'Accountant', seniorAnalyst: 'Senior Accountant', financeDirector: 'Director of Finance', manager: 'Director', acm: 'Deputy Town Manager', ...cmd('cityManager', ['Town Manager'], s.mayorTitle ?? 'Mayor (municipal chief executive)') } },
      police: {
        name: police.name, employer: police.local,
        titles: { recruit: pr[0], officer: pr[1], senior: pr[2], detective: `Detective ${pr[1].replace(/^Police /, '')}`, seniorDetective: `Detective ${pr[2]}`, detSergeant: `Detective ${pr[3]}`, detLieutenant: `Detective ${pr[4]}`, detCaptain: `Detective ${pr[5]}`, sergeant: pr[3], lieutenant: pr[4], captain: pr[5], deputyChief: pr[6], ...cmd('chief', [pr[7], pr[8], pr[9]], police.head) },
      },
      fire: {
        name: s.fire ?? (s.civilDefence ? `${s.civilDefence}` : `${s.name} Fire Service`), employer: (c) => `${s.fire ?? s.civilDefence ?? 'Fire Service'} — ${town(c)} station`,
        titles: { recruit: 'Firefighter (recruit)', firefighter: 'Firefighter', engineer: 'Leading Firefighter (driver)', inspector: 'Fire Safety Inspector', investigator: 'Fire Investigator', lieutenant: 'Sub-Officer', captain: 'Station Officer', battalion: 'Divisional Officer', deputyChief: 'Deputy Chief Fire Officer', ...cmd('chief', ['Assistant Director'], s.fireHead ?? 'Director-General of the Fire Service') },
      },
      ems: {
        name: s.ems ?? 'Emergency Medical Services', employer: (c) => `${s.ems ?? 'Emergency Medical Services'} — ${town(c)}`,
        titles: { emt: 'Emergency Medical Technician', paramedic: 'Paramedic', criticalCare: 'Critical Care Paramedic', flight: 'Flight paramedic', fto: 'EMS Trainer', supervisor: 'Shift Supervisor', captain: 'Station Coordinator', deputy: 'Deputy Director', ...cmd('chief', ['Director of Ambulance Services'], 'Director-General of Emergency Medical Services') },
      },
      dispatch: { name: `${s.emergency ?? '112'} Emergency Call Centre`, employer: (c) => `Emergency Call Centre — ${town(c)}`, titles: { trainee: 'Call handler (trainee)', telecommunicator: 'Emergency Call Handler', senior: 'Senior Call Handler', training: 'Trainer', supervisor: 'Duty Officer', ...cmd('director', ['Centre Manager'], 'Head of the Emergency Call Service') } },
      prosecution: { name: s.prosecution ?? 'Public Prosecution Service', employer: (c) => `${s.prosecution ?? 'Public Prosecution Service'} — ${town(c)}`, titles: { clerk: 'Legal Clerk', ada: 'Prosecutor', senior: 'Senior Prosecutor', trial: 'Chief Prosecutor', chiefDeputy: 'Deputy Prosecutor-General', ...cmd('first', ['Assistant Prosecutor-General'], s.prosecutor ?? 'Prosecutor-General') } },
    }),
    NATIONAL_SERVICES: ['police', ...(s.nationalFire ? ['fire'] : [])],
    POLICE_UNITS: { k9: 'Police Dog Unit', swat: s.swat ?? 'Special Intervention Unit', traffic: 'Traffic Police', narcotics: 'Anti-Narcotics Unit', gang: 'Organised Crime Unit', negotiator: 'Crisis negotiation team', sro: 'Community policing', instructor: police.academy.replace(/^the /, ''), ia: 'Internal Affairs', protection: 'VIP Protection Unit' },
    POLICE_BUREAUS: { homicide: 'CID Homicide Unit', svu: 'Family and Child Protection Unit', property: 'CID Property Crimes', robbery: 'Robbery Squad', cyber: 'Cybercrime Unit' },
    VOLUNTEER_MEDAL: 'Volunteer service award',

    /* The armed forces */
    FORCES: {
      pay: forces.pay ?? 0.5, exposure: forces.exposure ?? 0.5,
      conscription: forces.conscription ?? null,
      branches: {
        army: { name: armyName, icon: s.flag, motto: forces.motto ?? '', basic, officerSchool: academy, enlisted, officer },
        ...(navyName ? { navy: { name: navyName, icon: '⚓', motto: forces.motto ?? '', basic, officerSchool: forces.navalAcademy ?? academy, enlisted: navyEnlisted, officer: navyOfficer } } : {}),
        airforce: { name: airName, icon: '✈️', motto: forces.motto ?? '', basic, officerSchool: forces.airAcademy ?? academy, enlisted, officer },
        guard: { name: reserveName, icon: '🛡️', motto: forces.motto ?? '', basic: 'reserve training', officerSchool: academy, enlisted, officer },
      },
      bases: {
        army: forces.bases?.army ?? [[capitalId, `${armyName} headquarters`], [second, `${cityName(second)} garrison`]],
        ...(navyName ? { navy: forces.bases?.navy ?? [[coastal, `${cityName(coastal)} naval base`]] } : {}),
        airforce: forces.bases?.airforce ?? [[capitalId, `${s.capital} air base`]],
      },
      overseas: {
        army: (forces.overseas ?? []).map(([where, mission]) => [where, mission, 1, false]),
        ...(navyName ? { navy: forces.navalOverseas ?? [] } : {}),
        airforce: (forces.overseas ?? []).slice(0, 1).map(([where, mission]) => [where, `${mission} (air component)`, 1, false]),
      },
    },
    MIL_SPECIAL: { drill: { names: 'Recruit instructor' }, recruiter: { names: 'Military recruitment officer' }, honorGuard: { names: forces.guardOfHonour ?? `${armyName} Guard of Honour`, desc: 'State ceremonies and national days.' }, rotc: { names: `Instructor, ${academy.replace(/^the /, '')}` }, joint: { names: 'Staff officer, General Staff' }, fellow: { names: `Fellow, ${forces.defenceCollege ?? 'National Defence College'}` }, commissioning: 'officer cadet course from the ranks', chiefs: { army: `Commander of the ${armyName}`, ...(navyName ? { navy: `Commander of the ${navyName}` } : {}), airforce: `Commander of the ${airName}` }, chairman: forces.head ?? 'Chief of the General Staff' },
    PME: { enlisted: ['Junior NCO course', 'Senior NCO course', 'Warrant officers\' course', 'Sergeants major course', 'Senior enlisted leaders\' course'], officer: ['Young officers\' course', forces.staffCollege ?? 'Command and Staff College', forces.defenceCollege ?? 'National Defence College'] },
    QUALS: { airborne: 'Parachute course', rangerSchool: 'Commando course', jumpmaster: 'Jumpmaster course', pathfinder: 'Reconnaissance course', combatDiver: 'Combat diver course', dli: 'Language course', instructor: 'Instructors\' course', sere: 'Survival course', expertBadge: 'Counter-IED course' },
    SOF: {
      ranger: forces.sof ? { name: forces.sof[0], course: forces.sof[1], unitName: forces.sof[2], badge: forces.sof[3] ?? 'special forces badge', desc: forces.sof[4] ?? 'Counter-terrorism, raids and reconnaissance.', deployments: forces.sof[5] ?? ['a counter-terrorism standby in the capital'] } : { name: `${armyName} Special Forces`, course: 'the special forces selection course', unitName: 'Special Forces Group', badge: 'special forces badge', desc: 'Counter-terrorism, raids and reconnaissance.', deployments: ['a counter-terrorism standby in the capital'] },
      ...(navyName ? { seal: { name: `${navyName} Special Boat Unit`, course: 'the naval special warfare course', unitName: 'Naval Special Operations Unit', badge: 'combat diver badge', desc: 'Maritime special operations.', deployments: ['a boarding at sea'] } } : {}),
    },
    MIL_UNITS: { ground: forces.units ?? ['1st Infantry Brigade', '2nd Mechanised Brigade', 'Presidential Guard Battalion', '1st Artillery Regiment'].map((u) => (g.system === 'monarchy' || g.system === 'absolute' ? u.replace('Presidential', 'Royal') : u)), naval: forces.ships ?? ['the flagship frigate', 'a patrol vessel'], air: ['Fighter squadron', 'Transport squadron'] },
    MIL_SUMMARY: 'a summary trial before your commanding officer',
    SERVICE_TERMS: { maxYears: { enlisted: 30, officer: 35 }, ages: { enlisted: 50, officer: 55, flag: 62 }, join: { enlisted: [18, 26], officer: [21, 27] }, name: 'engagement' },
    MILITARY_JUSTICE: { code: forces.code ?? 'the military penal code', court: 'a military court', prison: 'military detention', counsel: 'Defending officer' },
    VETTING: { form: `${s.intel ?? 'security service'} vetting`, publicTrust: 'Restricted', secret: 'Secret', topSecret: 'Top Secret' },
    CAMPUS: null,
    ACADEMY_NAMES: { army: academy, ...(navyName ? { navy: forces.navalAcademy ?? academy } : {}), airforce: forces.airAcademy ?? academy },
    THEATERS: s.war ?? [],
    WAR_START_CHANCE: s.warChance ?? 0.005,
    MEDALS: {
      moh: { name: medals.top, ribbon: R(...(s.ribbon ?? ['#cc0000', '#ffffff', '#cc0000'])) }, serviceCross: { name: medals.valour }, silverStar: { name: `${medals.valour} (second class)` },
      dsm: { name: medals.service }, legionOfMerit: { name: medals.merit }, bronzeStar: { name: 'Commendation for Bravery' },
      purpleHeart: medals.wound ? { name: medals.wound } : null, msm: { name: 'Long Service and Good Conduct Medal' }, commendation: { name: 'Chief of the General Staff commendation' }, achievement: { name: 'Commander\'s commendation' },
      combatAction: null, goodConduct: { name: 'Good Conduct Medal' }, humanitarian: null, expeditionary: { name: medals.campaign }, ndsm: null,
    },
    ORDERS: s.orders === null ? null : { minAge: 35, tiers: ordersTiers },
    PARDON: g.pardon ?? (g.system === 'monarchy' || g.system === 'absolute' ? 'the King (royal pardon)' : `the ${head}`),
    COMBAT_TEMPO: forces.tempo ?? 0.3,
    MIL_PENSIONS: { name: 'Armed Forces pension', rate: 0.025, cap: 0.8, vest: 10, immediate: { enlisted: 20, officer: 20 }, deferredAge: s.retire ?? 60 },
    DIRECT_ENTRY: { police: [{ id: 'cadetInspector', name: `Cadet ${pr[4]} (graduate entry)`, levelId: 'lieutenant', education: 'bachelor', maxAge: 30, odds: 0.1, school: police.academy }] },
    BENCHES: {
      route: s.judgeRoute ?? 'appointed', appointedBy: courts.appointedBy, retire: courts.retire ?? 70,
      ...(s.judgeRoute === 'career' ? { school: courts.school ?? `the ${s.name} judicial training institute` } : {}),
      ladder: [
        { id: 'magistrate', name: courts.magistrate, icon: '🔨', salary: 30000, minYears: 3, entry: true },
        { id: 'high', name: `Judge of the ${courts.high}`, icon: '⚖️', salary: 55000, minYears: 10, entry: true },
        { id: 'appeal', name: `Judge of the ${courts.appeal}`, icon: '📜', salary: 65000, minYears: 15 },
        { id: 'supreme', name: `Justice of the ${courts.top}`, icon: '🏛️', salary: 80000, minYears: 15 },
      ],
    },
  };
  return {
    id,
    basedOn: 'PH',
    groups: s.groups ?? [],
    agreements: s.agreements ?? [],
    licenceExchange: s.licenceExchange ?? [],
    peers: [],
    freeMovement: s.freeMovement ?? [],
    religion: s.religion,
    farm: s.farm,
    monarchy: g.system === 'monarchy' || g.system === 'absolute',
    nation: true,
    country,
    offices,
    tables: { ...tables, ...s.tables },
  };
}
