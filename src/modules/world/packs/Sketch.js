/**
 * A country in a few lines. `sketch(spec)` fills a nation() spec (./Nation.js) from a family of
 * countries that share an inheritance — the post-Soviet states, the old Eastern bloc, Yugoslavia's
 * successors, Francophone, Anglophone and Lusophone Africa, the Caribbean, Latin America, the
 * Pacific, Europe's microstates, the Maghreb, Asia — and gives the pack a `history` the world reads
 * (world/HistoricalData.js and world/Eras.js): who ruled it before independence, its governments
 * since, its life expectancy, wealth and population over two centuries, and its earlier money.
 *
 * A spec (amounts in local currency; ppp = local units per US$ at PPP):
 *   id, name, demonym, capital, cur: [code, symbol], ppp, family, languages
 *   m, f, l           first names (men, women) and surnames, space-separated ('|' joins two words)
 *   cities            [[id, name, icon, type, size, population, col, market], …] (the first is the capital)
 *   gov               [system, lower house, seats, [left party, right party], head?, upper?]
 *   tax               { flat } or { allowance, brackets: [[width, rate], …] }, vat, corporate
 *   pop, gdp, life    today: population (thousands), GDP per head (2011 $), life expectancy
 *   ruled             foreign rule before independence: [[ruler, name, until, { from, war, leader }], …]
 *   regimes           governments once sovereign: [[from, category, democracy, monarchy], …]
 *                     (categories as in world/data/regimes.js: parl, pres, semi, absmon, semimon,
 *                     monolig, olig, mil, pers, oneparty, multiauth)
 *   sovereign         [[from, until | null], …] — the years it was its own state
 *   money             earlier currencies, as world/data/currencies.js rows
 *   …and any nation() field to override the family's (police, forces, courts, edu, orders…).
 *
 * Plain data: imports only ./Nation.js.
 */
import { nation } from './Nation.js';

const words = (s) => (s ?? '').split(/\s+/).filter(Boolean).map((w) => w.replace(/\|/g, ' '));
const flagOf = (cc) => String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

/* ---- ranks the families share ---- */
const BRIT_POLICE = ['Recruit Constable', 'Constable', 'Corporal', 'Sergeant', 'Inspector', 'Assistant Superintendent', 'Superintendent', 'Senior Superintendent', 'Assistant Commissioner', 'Deputy Commissioner'];
const BRIT_ENLISTED = ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Warrant Officer Class 2', 'Warrant Officer Class 1', 'Regimental Sergeant Major', 'Force Sergeant Major'];
const BRIT_OFFICERS = ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier', 'Major General', 'Lieutenant General', 'General'];
const FR_POLICE = ['Élève gardien de la paix', 'Gardien de la paix', 'Brigadier', 'Brigadier-chef', 'Officier de police', 'Commandant de police', 'Commissaire', 'Commissaire principal', 'Commissaire divisionnaire', 'Directeur général adjoint'];
const FR_ENLISTED = ['Soldat de 2e classe', 'Soldat de 1re classe', 'Caporal', 'Caporal-chef', 'Sergent', 'Sergent-chef', 'Adjudant', 'Adjudant-chef', 'Major'];
const FR_OFFICERS = ['Sous-lieutenant', 'Lieutenant', 'Capitaine', 'Commandant', 'Lieutenant-colonel', 'Colonel', 'Général de brigade', 'Général de division', 'Général de corps d\'armée', 'Général d\'armée'];
const PT_ENLISTED = ['Soldado', 'Primeiro-cabo', 'Cabo-adjunto', 'Furriel', 'Segundo-sargento', 'Primeiro-sargento', 'Sargento-ajudante', 'Sargento-chefe', 'Sargento-mor'];
const PT_OFFICERS = ['Alferes', 'Tenente', 'Capitão', 'Major', 'Tenente-coronel', 'Coronel', 'Brigadeiro-general', 'Major-general', 'Tenente-general', 'General'];
const ES_POLICE = ['Agente en formación', 'Agente', 'Cabo', 'Sargento', 'Suboficial', 'Teniente', 'Capitán', 'Mayor', 'Comisionado', 'Director General'];
const ES_ENLISTED = ['Soldado', 'Cabo', 'Cabo primero', 'Sargento', 'Sargento primero', 'Sargento mayor', 'Suboficial', 'Suboficial mayor', 'Suboficial mayor del ejército'];
const ES_OFFICERS = ['Subteniente', 'Teniente', 'Capitán', 'Mayor', 'Teniente coronel', 'Coronel', 'General de brigada', 'General de división', 'General de ejército', 'Comandante general'];
const POST_SOVIET_POLICE = ['Police cadet', 'Private of police', 'Junior sergeant of police', 'Sergeant of police', 'Lieutenant of police', 'Captain of police', 'Major of police', 'Lieutenant colonel of police', 'Colonel of police', 'Major general of police'];
const POST_SOVIET_ENLISTED = ['Private (ryadovoy)', 'Efreitor', 'Junior Sergeant', 'Sergeant', 'Senior Sergeant', 'Starshina', 'Praporshchik', 'Senior Praporshchik', 'Chief Sergeant'];
const POST_SOVIET_OFFICERS = ['Junior Lieutenant', 'Lieutenant', 'Senior Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Major General', 'Lieutenant General', 'Colonel General'];
const EU_POLICE = ['Police cadet', 'Police officer', 'Senior police officer', 'Sergeant', 'Inspector', 'Chief inspector', 'Superintendent', 'Chief superintendent', 'Deputy Chief of Police', 'Police President'];

/* ---- curves for the history: [year, value]; the last point is today's, scaled per country ---- */
const LIFE = {
  africa: [[1800, 25], [1900, 27], [1930, 31], [1950, 37], [1970, 46], [1990, 51], [2005, 53], [2020, 63]],
  latin: [[1800, 27], [1900, 30], [1930, 36], [1950, 50], [1970, 59], [1990, 67], [2020, 75]],
  caribbean: [[1800, 25], [1900, 33], [1930, 40], [1950, 55], [1970, 64], [1990, 70], [2020, 75]],
  postSoviet: [[1800, 28], [1900, 32], [1930, 40], [1950, 58], [1970, 67], [1990, 68], [2000, 66], [2020, 72]],
  eastBloc: [[1800, 32], [1900, 40], [1930, 50], [1950, 62], [1970, 70], [1990, 71], [2020, 77]],
  micro: [[1800, 35], [1900, 47], [1930, 58], [1950, 68], [1970, 73], [1990, 77], [2020, 83]],
  pacific: [[1800, 25], [1900, 30], [1950, 50], [1970, 58], [1990, 64], [2020, 70]],
  asia: [[1800, 25], [1900, 28], [1950, 40], [1970, 50], [1990, 62], [2020, 70]],
  maghreb: [[1800, 27], [1900, 30], [1950, 42], [1970, 52], [1990, 68], [2020, 76]],
};
const GDP = {
  africa: [[1800, 700], [1900, 850], [1950, 1200], [1970, 1700], [1990, 1600]],
  latin: [[1800, 900], [1900, 1600], [1950, 3000], [1980, 6000], [2000, 7000]],
  caribbean: [[1800, 1000], [1900, 1500], [1950, 3000], [1980, 7000]],
  postSoviet: [[1800, 1000], [1900, 1500], [1950, 3000], [1980, 6000], [1995, 3500]],
  eastBloc: [[1800, 1100], [1900, 2200], [1950, 4000], [1980, 9000], [1992, 8000]],
  micro: [[1800, 2000], [1900, 4000], [1950, 9000], [1980, 30000]],
  pacific: [[1800, 800], [1900, 1000], [1950, 2000], [1980, 4000]],
  asia: [[1800, 800], [1900, 900], [1950, 1000], [1980, 1500], [2000, 2500]],
  maghreb: [[1800, 900], [1900, 1300], [1950, 2200], [1980, 6000]],
};
const POP = { africa: [[1800, 0.1], [1900, 0.15], [1950, 0.25], [1980, 0.5]], other: [[1800, 0.25], [1900, 0.45], [1950, 0.65], [1980, 0.85]] };

/* ---- the families ---- */
const FAMILIES = {
  postSoviet: { curve: 'postSoviet', system: 'presidential', police: { ranks: POST_SOVIET_POLICE, head: 'Minister of Internal Affairs' }, forces: { ranks: { enlisted: POST_SOVIET_ENLISTED, officer: POST_SOVIET_OFFICERS }, conscription: { kind: 'universal', age: 18, months: 12, branch: 'army', genders: ['male'], name: 'compulsory military service', text: 'Every young man is called up for a year or more, as under the Soviet Union.' } }, courts: { top: 'Supreme Court', high: 'Regional Court', appeal: 'Court of Appeal', magistrate: 'Justice of the Peace', appointedBy: 'the President' }, edu: { exam: 'unified state examination', tvet: 'College (tekhnikum)' }, religion: { orthodox: 60, sunni: 10, none: 30 }, informality: 0.3, retire: 63, emergency: '112', unions: 'the Federation of Trade Unions', judgeRoute: 'career', ribbon: ['#cc0000', '#ffffff', '#0033a0'], groups: [] },
  eastBloc: { curve: 'eastBloc', system: 'parliamentary', police: { ranks: EU_POLICE, head: 'Chief of Police' }, forces: {}, courts: { top: 'Supreme Court', high: 'Regional Court', appeal: 'High Court', magistrate: 'District judge', appointedBy: 'the President' }, edu: { exam: 'maturita (school-leaving examination)', tvet: 'Vocational school' }, religion: { catholic: 45, orthodox: 10, mainline: 5, none: 40 }, informality: 0.1, retire: 65, emergency: '112', judgeRoute: 'career', health: { coinsurance: 0.05, wait: 10 }, ribbon: ['#ffffff', '#d52b1e', '#ffffff'], groups: [] },
  yugoslav: { curve: 'eastBloc', system: 'parliamentary', police: { ranks: EU_POLICE, head: 'General Police Director' }, forces: {}, courts: { top: 'Supreme Court', high: 'County Court', appeal: 'High Court', magistrate: 'Municipal judge', appointedBy: 'the State Judicial Council' }, edu: { exam: 'state matura', tvet: 'Vocational school' }, religion: { orthodox: 45, catholic: 30, sunni: 15, none: 10 }, informality: 0.2, retire: 65, emergency: '112', judgeRoute: 'career', health: { coinsurance: 0.05, wait: 12 }, ribbon: ['#c8102e', '#ffffff', '#003da5'], groups: [] },
  micro: { curve: 'micro', system: 'parliamentary', police: { ranks: EU_POLICE, head: 'Chief of Police' }, forces: {}, courts: { top: 'Supreme Court', high: 'Court of First Instance', appeal: 'Court of Appeal', magistrate: 'Justice of the Peace', appointedBy: 'the Sovereign' }, edu: { exam: 'baccalaureate' }, religion: { catholic: 80, none: 20 }, informality: 0.02, retire: 65, emergency: '112', health: { coinsurance: 0.05, wait: 4 }, ribbon: ['#ffffff', '#cc0000', '#ffffff'], groups: ['RICH_SYSTEMS'] },
  francoAfrica: { curve: 'africa', system: 'presidential', police: { ranks: FR_POLICE, head: 'Directeur général de la Police nationale' }, forces: { ranks: { enlisted: FR_ENLISTED, officer: FR_OFFICERS }, basic: 'basic training (formation commune de base)' }, courts: { top: 'Cour suprême', high: 'Tribunal de grande instance', appeal: 'Cour d\'appel', magistrate: 'Juge d\'instance', appointedBy: 'the Conseil supérieur de la magistrature' }, edu: { exam: 'baccalauréat', tvet: 'Lycée technique' }, religion: { sunni: 45, catholic: 25, evangelical: 10, traditional: 15, none: 5 }, informality: 0.7, retire: 60, emergency: '17 / 18', fees: 300, ribbon: ['#009e60', '#fcd116', '#ce1126'], groups: [], judgeRoute: 'career' },
  angloAfrica: { curve: 'africa', system: 'presidential', police: { ranks: BRIT_POLICE, head: 'Inspector-General of Police' }, forces: { ranks: { enlisted: BRIT_ENLISTED, officer: BRIT_OFFICERS } }, courts: { top: 'Supreme Court', high: 'High Court', appeal: 'Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the Judicial Service Commission' }, edu: { exam: 'school certificate examination' }, religion: { mainline: 35, catholic: 25, evangelical: 20, sunni: 10, traditional: 10 }, informality: 0.65, retire: 60, emergency: '999', jury: false, ribbon: ['#006b3f', '#fcd116', '#000000'], groups: ['COMMON_LAW'] },
  lusoAfrica: { curve: 'africa', system: 'presidential', police: { ranks: ['Agente estagiário', 'Agente', 'Agente principal', 'Subchefe', 'Chefe', 'Subcomissário', 'Comissário', 'Superintendente', 'Superintendente-chefe', 'Comandante-geral'], head: 'Comandante-Geral da Polícia' }, forces: { ranks: { enlisted: PT_ENLISTED, officer: PT_OFFICERS } }, courts: { top: 'Supremo Tribunal', high: 'Tribunal Provincial', appeal: 'Tribunal da Relação', magistrate: 'Juiz municipal', appointedBy: 'the Conselho Superior da Magistratura' }, edu: { exam: 'ensino médio diploma' }, religion: { catholic: 50, evangelical: 25, traditional: 15, none: 10 }, informality: 0.7, retire: 60, emergency: '113', ribbon: ['#cc092f', '#000000', '#ffcb00'], groups: [], judgeRoute: 'career' },
  caribbean: { curve: 'caribbean', system: 'monarchy', police: { ranks: BRIT_POLICE, head: 'Commissioner of Police' }, forces: { ranks: { enlisted: BRIT_ENLISTED, officer: BRIT_OFFICERS } }, courts: { top: 'Privy Council (final appeal)', high: 'High Court', appeal: 'Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the Judicial and Legal Service Commission' }, edu: { exam: 'CSEC (Caribbean Secondary Education Certificate)', state: 'University of the West Indies', elite: 'University of the West Indies' }, religion: { mainline: 35, evangelical: 30, catholic: 15, none: 10, hindu: 5, sunni: 5 }, informality: 0.35, retire: 65, emergency: '911', jury: true, ribbon: ['#00267f', '#ffc726', '#00267f'], groups: ['COMMON_LAW'] },
  latin: { curve: 'latin', system: 'presidential', police: { ranks: ES_POLICE, head: 'Director General de la Policía' }, forces: { ranks: { enlisted: ES_ENLISTED, officer: ES_OFFICERS } }, courts: { top: 'Corte Suprema de Justicia', high: 'Juzgado de Primera Instancia', appeal: 'Corte de Apelaciones', magistrate: 'Juez de paz', appointedBy: 'the Congress' }, edu: { exam: 'bachillerato', tvet: 'Instituto técnico' }, religion: { catholic: 65, evangelical: 22, none: 13 }, informality: 0.55, retire: 62, emergency: '911', ribbon: ['#0038a8', '#ffffff', '#0038a8'], groups: [], judgeRoute: 'career' },
  pacific: { curve: 'pacific', system: 'parliamentary', police: { ranks: BRIT_POLICE, head: 'Commissioner of Police' }, forces: {}, courts: { top: 'Supreme Court', high: 'High Court', appeal: 'Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the Judicial Service Commission' }, edu: { exam: 'Pacific Senior Secondary Certificate', elite: 'University of the South Pacific' }, religion: { mainline: 50, catholic: 25, lds: 10, evangelical: 15 }, informality: 0.6, retire: 60, emergency: '911', ribbon: ['#002b7f', '#ffffff', '#ce1126'], groups: ['COMMON_LAW'], cityFare: 3 },
  maghreb: { curve: 'maghreb', system: 'presidential', police: { ranks: FR_POLICE, head: 'Directeur général de la Sûreté nationale' }, forces: { ranks: { enlisted: FR_ENLISTED, officer: FR_OFFICERS } }, courts: { top: 'Cour de cassation', high: 'Tribunal de première instance', appeal: 'Cour d\'appel', magistrate: 'Juge cantonal', appointedBy: 'the Conseil supérieur de la magistrature' }, edu: { exam: 'baccalauréat' }, religion: { sunni: 98, none: 2 }, informality: 0.4, retire: 62, emergency: '197', redCrescent: true, ribbon: ['#e70013', '#ffffff', '#e70013'], groups: [], judgeRoute: 'career' },
  asia: { curve: 'asia', system: 'oneParty', police: { ranks: ['Police cadet', 'Police private', 'Police corporal', 'Police sergeant', 'Police lieutenant', 'Police captain', 'Police major', 'Police lieutenant colonel', 'Police colonel', 'Police major general'], head: 'Minister of Public Security' }, forces: {}, courts: { top: 'People\'s Supreme Court', high: 'Provincial People\'s Court', appeal: 'Appellate Court', magistrate: 'District judge', appointedBy: 'the National Assembly' }, edu: { exam: 'upper secondary diploma' }, religion: { buddhist: 65, traditional: 25, none: 10 }, informality: 0.7, retire: 60, emergency: '191', ribbon: ['#ce1126', '#002868', '#ce1126'], groups: [] },
};

/** Interpolate a curve at DEMOGRAPHY_YEARS (1800–2020 by fives), ending at `now` in 2020. */
const curveAt = (points, now, scale = 1) => {
  const pts = [...points.map(([y, v]) => [y, v * scale]), [2020, now]].filter(([y], i, a) => i === a.length - 1 || y < 2020);
  return Array.from({ length: 45 }, (_, i) => {
    const y = 1800 + i * 5;
    const j = pts.findIndex(([py]) => py >= y);
    if (j <= 0) return Math.round(pts[0][1]);
    const [y0, v0] = pts[j - 1], [y1, v1] = pts[j];
    return Math.round(v0 + ((v1 - v0) * (y - y0)) / (y1 - y0));
  });
};

export function sketch(s) {
  const fam = FAMILIES[s.family] ?? FAMILIES.latin;
  const [system, lowerName, seats, parties, head, upper] = s.gov ?? [fam.system, 'National Assembly', 100, null];
  const provinces = s.cities.map(([cid, name], i) => [`${s.id}-${String(i + 1).padStart(2, '0')}`, s.provinces?.[i] ?? `${name.split(',')[0]} Region`, Math.max(0.05, ((s.pop ?? 1000) / 1000) / s.cities.length)]);
  const cities = s.cities.map(([cid, name, icon, type, size, popN, col, market], i) => [cid, name, icon, type, provinces[i][0], size, popN, col, market]);
  const tax = s.tax?.flat != null ? { allowance: s.tax.allowance ?? 0, brackets: [[Infinity, s.tax.flat]] } : { allowance: s.tax?.allowance ?? 0, brackets: s.tax?.brackets ?? [[Infinity, 0.15]] };
  const life = LIFE[fam.curve], gdp = GDP[fam.curve];
  const lifeNow = s.life ?? life.at(-1)[1];
  const gdpNow = s.gdp ?? 5000;
  // A poor country's past wasn't richer than a rich one's: scale the curve down when today is lower.
  const gdpScale = Math.min(1, gdpNow / (gdp.at(-1)[1] * 1.5));
  const pop = POP[fam.curve === 'africa' ? 'africa' : 'other'].map(([y, f]) => [y, f * (s.pop ?? 1000)]);
  const spec = {
    id: s.id, name: s.name, flag: flagOf(s.id), demonym: s.demonym, capital: s.capital, cur: s.cur, ppp: s.ppp, languages: s.languages,
    emergency: s.emergency ?? fam.emergency, retire: s.retire ?? fam.retire, informality: s.informality ?? fam.informality, cityFare: s.cityFare ?? fam.cityFare,
    tax: { ...tax, contributions: s.tax?.contributions ?? [], label: s.tax?.label ?? `${s.name} Revenue Authority`, vat: s.tax?.vat ?? 0.15, corporate: s.tax?.corporate ?? 0.25 },
    pension: s.pension ?? { name: `${s.demonym} state pension`, short: 'the state pension', kind: fam.curve === 'africa' || fam.curve === 'pacific' ? 'account' : 'account', rate: 0.1 },
    health: { ...fam.health, ...s.health },
    names: { male: words(s.m), female: words(s.f), last: words(s.l) },
    provinceWord: s.provinceWord ?? 'Region', provinces, cities,
    gov: { system, head, lower: [lowerName, seats, s.member ?? `Member of the ${lowerName}`], term: s.term ?? 5, parties: parties ?? undefined, ...(upper ? { upper } : {}), ...(s.govExtra ?? {}) },
    police: { name: s.police?.name ?? `${s.name} Police`, local: (c) => `${s.police?.name ?? `${s.name} Police`} — ${String(c).split(',')[0]}`, academy: s.police?.academy ?? `the ${s.name} Police Academy`, ...fam.police, ...s.police },
    forces: { ...fam.forces, ...(s.navy === false ? { navy: null } : {}), ...s.forces },
    courts: { ...fam.courts, ...s.courts },
    edu: { ...fam.edu, ...s.edu },
    religion: Object.entries(s.religion ?? fam.religion).reduce((o, [k, v]) => { const key = { orthodox: 'orthodoxChristian', traditional: 'none' }[k] ?? k; o[key] = (o[key] ?? 0) + v; return o; }, {}),
    groups: s.groups ?? fam.groups,
    ribbon: s.ribbon ?? fam.ribbon,
    jury: s.jury ?? fam.jury,
    redCrescent: s.redCrescent ?? fam.redCrescent,
    judgeRoute: s.judgeRoute ?? fam.judgeRoute,
    unions: s.unions ?? fam.unions,
    fees: s.fees ?? fam.fees,
    orders: s.orders,
    medals: s.medals,
    stock: s.stock, lender: s.lender, centralBank: s.centralBank, foreign: s.foreign, intel: s.intel,
    // Small states rarely start wars: nation()'s default (0.005 a year) across 86 of them would be one every few years.
    freeMovement: s.freeMovement, war: s.war, warChance: s.warChance ?? (['micro', 'pacific', 'caribbean'].includes(s.family) ? 0 : 0.0008), monarchy: s.monarchy,
    immig: s.immig, terms: s.terms, tables: s.tables,
  };
  for (const k of Object.keys(spec)) if (spec[k] === undefined) delete spec[k];
  const pack = nation(spec);
  // Before the first foreign rule, the country's own (pre-colonial) rulers: a kingdom or chiefdom.
  const ruled = s.ruled ?? [];
  const firstRule = ruled[0]?.[3]?.from ?? (ruled.length ? 1800 : null);
  let regimes = s.regimes ?? null;
  let sovereign = s.sovereign ?? null;
  if (firstRule && firstRule > 1800 && regimes && regimes[0][0] > 1800) {
    const lastUntil = ruled.map((r) => r[2]).filter((u) => typeof u === 'number').at(-1) ?? 1991;
    regimes = [[1800, 'absmon', 0, 1], ...regimes];
    sovereign = [[1800, firstRule], ...(sovereign ?? [[lastUntil, null]]).filter(([from]) => from >= firstRule)];
  }
  // Independence comes in a window (world/History.js), sometimes years early: the first government
  // after it reaches back that far (the colony's own stage still wins while it lasts).
  const indep = ruled.map((r) => r[2]).filter((u) => typeof u === 'number').at(-1);
  if (indep && regimes) {
    const i = regimes.findIndex(([from]) => from >= indep);
    if (i >= 0) {
      const was = regimes[i][0];
      regimes = regimes.map((r, j) => (j === i ? [Math.max(was - 15, (regimes[j - 1]?.[0] ?? 1800) + 1), ...r.slice(1)] : r));
      if (sovereign) sovereign = sovereign.map(([from, to]) => [from === was ? regimes[i][0] : from, to === was ? regimes[i][0] : to]);
    }
  }
  pack.history = {
    ruled,
    regimes,
    sovereign,
    money: s.money ?? null,
    demography: { life: curveAt(life, lifeNow, lifeNow / life.at(-1)[1]), gdp: curveAt(gdp, gdpNow, gdpScale), pop: curveAt(pop, s.pop ?? 1000) },
    names: s.periodNames ?? null,
  };
  pack.sketch = s.family;
  return pack;
}
