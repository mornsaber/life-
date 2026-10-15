/**
 * Courts abroad: each country's own judicial ladder, and how you get onto it.
 *
 *   appointed  Common-law benches (Britain, Ireland, Australia, Canada, New Zealand, the
 *              Philippines, Korea): judges are chosen from experienced lawyers by an
 *              appointments commission or the government. Years of practice open each
 *              rung; strong reputations draw invitations to higher courts.
 *   career     Civil-law judiciaries (Germany, France, Italy, Spain, the Netherlands,
 *              Sweden, Japan, Brazil, India): judging is a career you enter young, by a
 *              competitive exam and a judges' school (France's École nationale de la
 *              magistrature), then rise through by seniority; the top courts are chosen.
 *   elected    Mexico since the 2025 reform: judges stand for election.
 *
 * Lay benches sit alongside a day job: magistrates (JPs) in England and Wales, Schöffen in
 * Germany, nämndemän in Sweden, jueces de paz in Spain.
 *
 * A rung: { id, name (or { male, female }), icon, salary, minYears (law practice + bench),
 *   entry (can be your first seat), after (career: years in the rung below before seniority
 *   promotion), pick ('seniority' | 'nominated' | 'elected'), term (a fixed, non-renewable
 *   term), partTime (sits alongside practice), honour ({ male, female, prefix }), noLaw }.
 * Ids become `${country}.${id}` (or `${country}-${region}.${id}` for Scotland).
 */
import { fromPacks } from '../world/packs/index.js';

const R = (id, name, icon, salary, opts = {}) => ({ id, name, icon, salary, ...opts });
const KNIGHT = { male: 'Knight Bachelor', female: 'Dame Commander of the Order of the British Empire (DBE)', prefix: { male: 'Sir', female: 'Dame' } };

export const BENCHES = {
  GB: {
    route: 'appointed', appointedBy: 'the Judicial Appointments Commission', retire: 75,
    lay: { id: 'jp', name: 'Magistrate (Justice of the Peace)', icon: '🧑‍⚖️', allowance: 1200, minAge: 18, maxAge: 65, noLaw: true, desc: 'Volunteer magistrates hear nine in ten criminal cases: at least 13 sittings a year alongside your job. No law degree needed.' },
    ladder: [
      R('recorder', 'Recorder (part-time Crown Court judge)', '🎗️', 70000, { minYears: 7, entry: true, partTime: true }),
      R('districtJudge', 'District Judge (Magistrates\' Courts)', '🔨', 150000, { minYears: 5, entry: true }),
      R('circuit', 'Circuit Judge', '⚖️', 190000, { minYears: 7, entry: true }),
      R('high', { male: 'High Court Judge (Mr Justice)', female: 'High Court Judge (Mrs Justice)' }, '👑', 250000, { minYears: 10, honour: KNIGHT }),
      R('appeal', { male: 'Lord Justice of Appeal', female: 'Lady Justice of Appeal' }, '📜', 270000, { minYears: 15 }),
      R('supreme', 'Justice of the Supreme Court', '🏛️', 290000, { minYears: 15 }),
    ],
    regions: {
      'GB-SCT': {
        appointedBy: 'the Judicial Appointments Board for Scotland',
        lay: { id: 'jp', name: 'Justice of the Peace', icon: '🧑‍⚖️', allowance: 1000, minAge: 18, maxAge: 70, noLaw: true, desc: 'Lay justices sit in the Justice of the Peace courts on minor crime.' },
        ladder: [
          R('partSheriff', 'Part-time Sheriff', '🎗️', 70000, { minYears: 10, entry: true, partTime: true }),
          R('sheriff', 'Sheriff', '⚖️', 175000, { minYears: 10, entry: true }),
          R('principal', 'Sheriff Principal', '🔨', 200000, { minYears: 12 }),
          R('senator', { male: 'Senator of the College of Justice (Lord)', female: 'Senator of the College of Justice (Lady)' }, '👑', 250000, { minYears: 15 }),
          R('supreme', 'Justice of the Supreme Court', '🏛️', 290000, { minYears: 15 }),
        ],
      },
    },
  },
  IE: {
    route: 'appointed', appointedBy: 'the President, on the advice of the Government and the Judicial Appointments Commission', retire: 70,
    ladder: [
      R('district', 'Judge of the District Court', '🔨', 160000, { minYears: 10, entry: true }),
      R('circuit', 'Judge of the Circuit Court', '⚖️', 190000, { minYears: 10, entry: true }),
      R('high', 'Judge of the High Court', '📜', 230000, { minYears: 12, entry: true }),
      R('appeal', 'Judge of the Court of Appeal', '🏛️', 250000, { minYears: 12 }),
      R('supreme', 'Judge of the Supreme Court', '🏛️', 270000, { minYears: 12 }),
    ],
  },
  AU: {
    route: 'appointed', appointedBy: 'the Attorney-General', retire: 70,
    lay: { id: 'jp', name: 'Justice of the Peace', icon: '🖋️', allowance: 0, minAge: 18, maxAge: 75, noLaw: true, desc: 'Witness statutory declarations and affidavits for your community. Unpaid, and a respected local role.' },
    ladder: [
      R('magistrate', 'Magistrate (Local Court)', '🔨', 200000, { minYears: 5, entry: true }),
      R('district', 'Judge of the District Court', '⚖️', 260000, { minYears: 8, entry: true }),
      R('supreme', 'Justice of the State Supreme Court', '📜', 300000, { minYears: 10, entry: true }),
      R('federal', 'Judge of the Federal Court', '🦘', 310000, { minYears: 10 }),
      R('high', 'Justice of the High Court of Australia', '🏛️', 340000, { minYears: 15 }),
    ],
  },
  CA: {
    route: 'appointed', appointedBy: 'the Judicial Appointments Advisory Committee', retire: 75,
    ladder: [
      R('jp', 'Justice of the Peace', '🖋️', 130000, { minYears: 0, entry: true, noLaw: true }),
      R('provincial', 'Judge of the Provincial Court', '⚖️', 230000, { minYears: 10, entry: true }),
      R('superior', 'Justice of the Superior Court', '📜', 260000, { minYears: 10, entry: true }),
      R('appeal', 'Justice of the Court of Appeal', '🏛️', 285000, { minYears: 10 }),
      R('scc', 'Justice of the Supreme Court of Canada', '🍁', 350000, { minYears: 15 }),
    ],
  },
  NZ: {
    route: 'appointed', appointedBy: 'the Attorney-General', retire: 70,
    lay: { id: 'jp', name: 'Justice of the Peace', icon: '🖋️', allowance: 0, minAge: 18, maxAge: 75, noLaw: true, desc: 'Witness documents and, with training, sit on minor matters in the District Court.' },
    ladder: [
      R('communityMagistrate', 'Community Magistrate', '🔨', 90000, { minYears: 0, entry: true, noLaw: true }),
      R('district', 'District Court Judge', '⚖️', 230000, { minYears: 7, entry: true }),
      R('high', 'Judge of the High Court', '📜', 300000, { minYears: 7, entry: true }),
      R('appeal', 'Judge of the Court of Appeal', '🏛️', 320000, { minYears: 10 }),
      R('supreme', 'Judge of the Supreme Court', '🏛️', 340000, { minYears: 10 }),
    ],
  },
  DE: {
    route: 'career', appointedBy: 'the Land justice ministry', retire: 67,
    school: { name: 'appointment as a Richter auf Probe', exam: 'Bewerbung für den Richterdienst (Prädikatsexamen)', years: 0, maxAge: 40, practiceInstead: 0, minSmarts: 60 },
    lay: { id: 'schoeffe', name: 'Schöffe (lay judge)', icon: '🧑‍⚖️', allowance: 800, minAge: 25, maxAge: 69, noLaw: true, desc: 'Lay judges vote with the professional judges on guilt and sentence, for five-year terms.' },
    ladder: [
      R('probe', 'Richter auf Probe', '🎓', 62000, { entry: true }),
      R('amtsgericht', 'Richter am Amtsgericht', '⚖️', 78000, { after: 3 }),
      R('landgericht', 'Vorsitzender Richter am Landgericht', '🔨', 95000, { after: 8 }),
      R('olg', 'Richter am Oberlandesgericht', '📜', 105000, { after: 5 }),
      R('bgh', 'Richter am Bundesgerichtshof', '🏛️', 140000, { pick: 'nominated', minYears: 15, appointedBy: 'the Richterwahlausschuss' }),
      R('bverfg', 'Richter des Bundesverfassungsgerichts', '🦅', 190000, { pick: 'nominated', term: 12, appointedBy: 'the Bundestag and Bundesrat' }),
    ],
  },
  FR: {
    route: 'career', appointedBy: 'the Conseil supérieur de la magistrature', retire: 68,
    school: { name: 'the École nationale de la magistrature (ENM), Bordeaux', exam: 'concours d\'accès à l\'ENM', years: 3, maxAge: 31, practiceInstead: 4, stipend: 30000, minSmarts: 55 },
    lay: { id: 'prudhomme', name: 'Conseiller prud\'homal (labour court)', icon: '🧑‍⚖️', allowance: 1500, minAge: 21, maxAge: 70, noLaw: true, desc: 'Employers\' and employees\' representatives judge workplace disputes side by side.' },
    ladder: [
      R('juge', 'Juge au tribunal judiciaire (second grade)', '⚖️', 55000, { entry: true }),
      R('vp', 'Vice-président du tribunal judiciaire (premier grade)', '🔨', 75000, { after: 7 }),
      R('conseiller', 'Conseiller à la cour d\'appel', '📜', 90000, { after: 5 }),
      R('president', 'Président de chambre à la cour d\'appel', '📜', 110000, { after: 5 }),
      R('premier', 'Premier président de cour d\'appel', '🏛️', 135000, { pick: 'nominated', minYears: 20 }),
      R('cassation', 'Conseiller à la Cour de cassation', '🏛️', 140000, { pick: 'nominated', minYears: 20 }),
    ],
  },
  IT: {
    route: 'career', appointedBy: 'the Consiglio superiore della magistratura (CSM)', retire: 70,
    school: { name: 'the Scuola superiore della magistratura (tirocinio)', exam: 'concorso in magistratura', years: 2, maxAge: 45, practiceInstead: 0, stipend: 25000, minSmarts: 62 },
    lay: { id: 'pace', name: 'Giudice di pace (honorary judge)', icon: '🧑‍⚖️', allowance: 15000, minAge: 27, maxAge: 70, desc: 'Honorary judges paid by the case for small claims and minor offences.' },
    ladder: [
      R('tribunale', 'Giudice del tribunale', '⚖️', 60000, { entry: true }),
      R('appello', 'Consigliere di corte d\'appello', '📜', 95000, { after: 8 }),
      R('cassazione', 'Consigliere della Corte di cassazione', '🏛️', 120000, { after: 8 }),
      R('presidente', 'Presidente di sezione della Cassazione', '🏛️', 140000, { pick: 'nominated', minYears: 25 }),
      R('consulta', 'Giudice della Corte costituzionale', '🦅', 300000, { pick: 'nominated', term: 9, appointedBy: 'the President, Parliament and the high courts' }),
    ],
  },
  ES: {
    route: 'career', appointedBy: 'the Consejo General del Poder Judicial (CGPJ)', retire: 72,
    school: { name: 'the Escuela Judicial, Barcelona', exam: 'oposiciones a la carrera judicial', years: 2, maxAge: 45, practiceInstead: 10, stipend: 22000, minSmarts: 62 },
    lay: { id: 'paz', name: 'Juez de paz', icon: '🧑‍⚖️', allowance: 3000, minAge: 18, maxAge: 72, noLaw: true, desc: 'Towns without a court elect a resident as justice of the peace for small claims and civil registry.' },
    ladder: [
      R('juez', 'Juez (juzgado de primera instancia)', '⚖️', 50000, { entry: true }),
      R('magistrado', 'Magistrado', '🔨', 70000, { after: 5 }),
      R('audiencia', 'Magistrado de la Audiencia Provincial', '📜', 82000, { after: 6 }),
      R('supremo', 'Magistrado del Tribunal Supremo', '🏛️', 130000, { pick: 'nominated', minYears: 15 }),
      R('constitucional', 'Magistrado del Tribunal Constitucional', '🦅', 150000, { pick: 'nominated', term: 9, appointedBy: 'the Cortes, the Government and the CGPJ' }),
    ],
  },
  NL: {
    route: 'career', appointedBy: 'the Crown, on the advice of the Raad voor de rechtspraak', retire: 70,
    school: { name: 'the rechter-in-opleiding (RIO) programme', exam: 'selectie voor de rechterlijke macht', years: 2, maxAge: 50, practiceInstead: 0, stipend: 50000, minSmarts: 60 },
    ladder: [
      R('rechter', 'Rechter', '⚖️', 95000, { entry: true }),
      R('senior', 'Senior rechter', '🔨', 115000, { after: 6 }),
      R('raadsheer', 'Raadsheer in het gerechtshof', '📜', 125000, { after: 6 }),
      R('hogeRaad', 'Raadsheer in de Hoge Raad', '🏛️', 155000, { pick: 'nominated', minYears: 18, appointedBy: 'the Crown, from the Tweede Kamer\'s list' }),
    ],
  },
  SE: {
    route: 'career', appointedBy: 'the Government, on the Judges Proposals Board\'s advice', retire: 67,
    school: { name: 'the domarbana (notarie at a district court, then fiskal at a court of appeal)', exam: 'application for the judicial training track', years: 4, maxAge: 40, practiceInstead: 0, stipend: 40000, minSmarts: 60 },
    lay: { id: 'namndeman', name: 'Nämndeman (lay judge)', icon: '🧑‍⚖️', allowance: 1500, minAge: 18, maxAge: 70, noLaw: true, desc: 'Lay judges nominated by the parties sit with the professional judge and vote.' },
    ladder: [
      R('radman', 'Rådman (district court judge)', '⚖️', 95000, { entry: true }),
      R('hovrattsrad', 'Hovrättsråd (court of appeal judge)', '📜', 105000, { after: 6 }),
      R('lagman', 'Lagman (chief judge)', '🔨', 120000, { pick: 'nominated', minYears: 15 }),
      R('justitierad', 'Justitieråd (Supreme Court)', '🏛️', 150000, { pick: 'nominated', minYears: 20 }),
    ],
  },
  JP: {
    route: 'career', appointedBy: 'the Cabinet', retire: 65,
    school: { name: 'the Legal Training and Research Institute', exam: 'national bar examination (shihō shiken)', years: 1, maxAge: 40, practiceInstead: 0, stipend: 20000, minSmarts: 65 },
    ladder: [
      R('hanjiho', 'Assistant Judge (Hanji-ho)', '⚖️', 60000, { entry: true }),
      R('hanji', 'Judge (Hanji)', '🔨', 100000, { after: 10 }),
      R('high', 'Judge of a High Court', '📜', 130000, { after: 8 }),
      R('president', 'President of a High Court', '🏛️', 165000, { pick: 'nominated', minYears: 25 }),
      R('supreme', 'Justice of the Supreme Court', '🏛️', 200000, { pick: 'nominated', minYears: 25 }),
    ],
  },
  KR: {
    route: 'appointed', appointedBy: 'the Chief Justice', retire: 70,
    ladder: [
      R('district', 'District Court Judge', '⚖️', 90000, { minYears: 5, entry: true }),
      R('bujang', 'Presiding Judge (Bujang)', '🔨', 110000, { minYears: 12 }),
      R('high', 'High Court Judge', '📜', 125000, { minYears: 15 }),
      R('supreme', 'Supreme Court Justice', '🏛️', 170000, { minYears: 20, appointedBy: 'the President, with the National Assembly\'s consent' }),
      R('constitutional', 'Justice of the Constitutional Court', '🦅', 170000, { minYears: 15, term: 6, appointedBy: 'the President, the National Assembly and the Chief Justice' }),
    ],
  },
  MX: {
    route: 'elected', appointedBy: 'voters (judicial elections since the 2025 reform)', retire: 70,
    ladder: [
      R('juez', 'Juez de distrito', '⚖️', 90000, { minYears: 5, entry: true, pick: 'elected' }),
      R('magistrado', 'Magistrado de circuito', '📜', 110000, { minYears: 8, pick: 'elected' }),
      R('ministro', 'Ministro de la Suprema Corte de Justicia', '🏛️', 150000, { minYears: 10, term: 12, pick: 'elected' }),
    ],
  },
  BR: {
    route: 'career', appointedBy: 'the Tribunal de Justiça', retire: 75,
    school: { name: 'the Escola da Magistratura', exam: 'concurso para juiz substituto', years: 1, maxAge: 55, practiceInstead: 0, minPractice: 3, stipend: 60000, minSmarts: 62 },
    ladder: [
      R('substituto', 'Juiz substituto', '🎓', 110000, { entry: true }),
      R('direito', 'Juiz de direito', '⚖️', 130000, { after: 2 }),
      R('desembargador', 'Desembargador (Tribunal de Justiça)', '📜', 150000, { after: 12 }),
      R('stj', 'Ministro do Superior Tribunal de Justiça', '🏛️', 175000, { pick: 'nominated', minYears: 20, appointedBy: 'the President, confirmed by the Senate' }),
      R('stf', 'Ministro do Supremo Tribunal Federal', '🦅', 185000, { pick: 'nominated', minYears: 20, appointedBy: 'the President, confirmed by the Senate' }),
    ],
  },
  IN: {
    route: 'career', appointedBy: 'the High Court', retire: 62,
    school: { name: 'the State Judicial Academy', exam: 'Judicial Services Examination (PCS-J)', years: 1, maxAge: 35, practiceInstead: 0, stipend: 15000, minSmarts: 60 },
    ladder: [
      R('juniorCivil', 'Civil Judge (Junior Division)', '⚖️', 40000, { entry: true }),
      R('seniorCivil', 'Civil Judge (Senior Division)', '🔨', 55000, { after: 5 }),
      R('district', 'District and Sessions Judge', '📜', 80000, { after: 7 }),
      R('high', 'Judge of the High Court', '🏛️', 110000, { pick: 'nominated', minYears: 18, appointedBy: 'the Supreme Court collegium' }),
      R('supreme', 'Judge of the Supreme Court of India', '🏛️', 130000, { pick: 'nominated', minYears: 25, appointedBy: 'the Supreme Court collegium' }),
    ],
  },
  PH: {
    route: 'appointed', appointedBy: 'the President, from the Judicial and Bar Council\'s shortlist', retire: 70,
    lay: { id: 'lupon', name: 'Lupon Tagapamayapa (barangay conciliator)', icon: '🤝', allowance: 0, minAge: 18, maxAge: 75, noLaw: true, desc: 'Settle neighbourhood disputes in the barangay before they reach a court.' },
    ladder: [
      R('mtc', 'Municipal Trial Court Judge', '🔨', 60000, { minYears: 5, entry: true }),
      R('rtc', 'Regional Trial Court Judge', '⚖️', 75000, { minYears: 10, entry: true }),
      R('appeals', 'Associate Justice of the Court of Appeals', '📜', 95000, { minYears: 15 }),
      R('supreme', 'Associate Justice of the Supreme Court', '🏛️', 120000, { minYears: 15 }),
    ],
  },
  '*': {
    route: 'appointed', appointedBy: 'the judicial appointments council', retire: 70,
    ladder: [
      R('magistrate', 'Magistrate', '🔨', 90000, { minYears: 5, entry: true }),
      R('trial', 'Judge of the trial court', '⚖️', 120000, { minYears: 8, entry: true }),
      R('appeal', 'Judge of the Court of Appeal', '📜', 150000, { minYears: 12 }),
      R('supreme', 'Justice of the Supreme Court', '🏛️', 180000, { minYears: 15 }),
    ],
  },
};
fromPacks(BENCHES, 'BENCHES');

/** The bench where you live: the country's (or Scotland's) ladder, lay bench and school. */
export function benchFor(countryId, stateId) {
  if (!countryId || countryId === 'US') return null;
  const base = BENCHES[countryId] ?? BENCHES['*'];
  const region = base.regions?.[stateId];
  const key = region ? stateId : countryId in BENCHES ? countryId : '*';
  return { ...base, ...(region ?? {}), key, regions: undefined };
}

/**
 * Every court abroad as a flat map, the way the US COURTS table is keyed:
 * `${key}.${rung}` → { name, icon, salary, rank, term, life: false, system: 'national', next, … }.
 */
export const ABROAD_COURTS = {};
function addBench(key, bench) {
  bench.ladder.forEach((r, i) => {
    const next = bench.ladder[i + 1];
    ABROAD_COURTS[`${key}.${r.id}`] = {
      ...r, key, rank: i + 1, term: r.term ?? 0, life: false, system: 'national', route: bench.route,
      pick: r.pick ?? (bench.route === 'career' ? (r.after ? 'seniority' : 'entry') : bench.route === 'elected' ? 'elected' : 'nominated'),
      appointedBy: r.appointedBy ?? bench.appointedBy, retire: bench.retire, next: next ? `${key}.${next.id}` : null,
    };
  });
}
for (const [cc, b] of Object.entries(BENCHES)) {
  addBench(cc, b);
  for (const [region, r] of Object.entries(b.regions ?? {})) addBench(region, { ...b, ...r });
}

/** A court's name for you (some are gendered: Lord or Lady Justice). */
export const courtName = (c, gender) => (typeof c?.name === 'string' ? c.name : c?.name?.[gender === 'female' ? 'female' : 'male'] ?? '');
