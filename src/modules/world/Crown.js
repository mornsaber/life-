/**
 * The Crown: the monarchies, their (fictional) royal families, and the reign as the backdrop to
 * a life — and, for a life born royal, the life itself.
 *
 *   Crowns      Five crowns: one shared by the Commonwealth realms (the UK, Canada, Australia,
 *               New Zealand), and Japan's, Sweden's, the Netherlands' and Spain's. Each has a
 *               reigning monarch who ages and dies (or abdicates), an heir by its succession law
 *               (absolute primogeniture; male preference in Spain; the male line only in Japan),
 *               and a reign: a coronation (a medal for those who serve), jubilees, royal weddings
 *               and births, tours of the realms.
 *   Realms      A Commonwealth realm can vote to become a republic; then the Crown's offices there
 *               end and its own head of state replaces the Governor-General.
 *   Crises      Once or twice in a lifetime, a constitutional crisis: a hung parliament, a refused
 *               dissolution, blocked supply, a contested prorogation, a bill the Crown is asked not
 *               to sign. The Governor-General (or, at home, the monarch) uses the reserved powers —
 *               or doesn't. If that's you, it's your call.
 *   Born royal  A start mode (a difficulty on its own) at a chosen place in the family: the heir,
 *               the monarch's child, a grandchild, or a distant royal. A working royal lives on the
 *               Sovereign Grant, carries out engagements and tours, takes patronages, and lives in
 *               the papers; the line of succession moves as the family is born and dies; the heir
 *               becomes monarch. You can step back from royal life — or, as monarch, abdicate.
 *
 * state.world.crowns[crownId] = { house, monarch, heir, since, events[] }
 * state.world.republics[cc]   = { year }
 * state.royal = { crownId, level, line, working, popularity, reigning, regnal, patronages[], since }
 */
import { clamp, Random } from '../../core/Random.js';
import { OFFICES } from '../politics/Offices.js';
import { currentYear, yearlyCount, bumpYearly, addHonor } from '../../core/State.js';
import { subsidiaryTitles } from './Peerage.js';

/* ------------------------------------------------------------------ */
/* The crowns                                                          */
/* ------------------------------------------------------------------ */

export const CROWNS = {
  GB: {
    name: 'the Crown', realms: ['GB', 'CA', 'AU', 'NZ', 'PG', 'SB'], rule: 'absolute', houses: ['Ashcombe', 'Valcourt', 'Ellesmere', 'Harrowgate'],
    names: { male: ['Edmund', 'Arthur', 'Frederick', 'Albert', 'Alfred', 'Henry', 'Edward', 'Leopold'], female: ['Matilda', 'Eleanor', 'Alexandra', 'Margaret', 'Adelaide', 'Caroline', 'Beatrice'] },
    titles: { monarch: ['King', 'Queen'], heir: ['Prince of Cambria', 'Princess of Cambria'], royal: ['Prince', 'Princess'], distant: ['Lord', 'Lady'] },
    palace: 'St Aldric\'s Palace', grant: 'Sovereign Grant', dukedoms: ['Wessex', 'Clarence', 'Rothesay', 'Albany', 'Lancaster', 'Kendal', 'Sussex'],
  },
  JP: {
    name: 'the Imperial House', realms: ['JP'], rule: 'agnatic', houses: ['the Imperial House'],
    names: { male: ['Akihiro', 'Masahito', 'Hironori', 'Takemaru', 'Yoshihito'], female: ['Akiko', 'Mako', 'Kazuko', 'Yuriko', 'Hisako'] },
    titles: { monarch: ['Emperor', 'Empress'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Prince', 'Princess'], distant: ['Prince', 'Princess'] },
    palace: 'the Imperial Palace', grant: 'Imperial Household budget', dukedoms: [],
  },
  SE: {
    name: 'the Crown', realms: ['SE'], rule: 'absolute', houses: ['Östberg', 'Valdenholm'],
    names: { male: ['Gustaf', 'Karl', 'Oskar', 'Erik', 'Fredrik'], female: ['Kristina', 'Ulrika', 'Désirée', 'Ingrid', 'Astrid'] },
    titles: { monarch: ['King', 'Queen'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Prince', 'Princess'], distant: ['Count', 'Countess'] },
    palace: 'the Royal Palace', grant: 'state allowance (apanage)', dukedoms: ['Dalarna', 'Uppland', 'Västergötland', 'Skåne'],
  },
  NL: {
    name: 'the Crown', realms: ['NL'], rule: 'absolute', houses: ['Nassenburg', 'Oranje-Velde'],
    names: { male: ['Willem', 'Hendrik', 'Maurits', 'Frederik', 'Bernhard'], female: ['Juliana', 'Emma', 'Wilhelmina', 'Margriet', 'Irene'] },
    titles: { monarch: ['King', 'Queen'], heir: ['Prince of Orange', 'Princess of Orange'], royal: ['Prince', 'Princess'], distant: ['Jonkheer', 'Jonkvrouw'] },
    palace: 'Huis ten Bosch', grant: 'royal allowance', dukedoms: [],
  },
  ES: {
    name: 'the Crown', realms: ['ES'], rule: 'malePreference', houses: ['Valdemora', 'Castelnovo'],
    names: { male: ['Alfonso', 'Fernando', 'Carlos', 'Juan', 'Felipe'], female: ['Isabel', 'Leonor', 'Sofía', 'Cristina', 'Mercedes'] },
    titles: { monarch: ['King', 'Queen'], heir: ['Prince of Asturias', 'Princess of Asturias'], royal: ['Infante', 'Infanta'], distant: ['Duke', 'Duchess'] },
    palace: 'the Palacio de Oriente', grant: 'Royal Household budget', dukedoms: ['Lugo', 'Palma', 'Soria', 'Cádiz'],
  },  NO: {
    name: 'the Crown', realms: ['NO'], rule: 'absolute', houses: ['Glücksborg', 'Fjordheim'],
    names: { male: ['Harald', 'Olav', 'Haakon', 'Sverre', 'Magnus'], female: ['Ingrid', 'Märtha', 'Astrid', 'Ragnhild', 'Sonja'] },
    titles: { monarch: ['King', 'Queen'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Prince', 'Princess'], distant: ['Lord', 'Lady'] },
    palace: 'the Royal Palace, Oslo', grant: 'the appanage', dukedoms: [],
  },
  DK: {
    name: 'the Crown', realms: ['DK'], rule: 'absolute', houses: ['Glücksborg', 'Monpezat'],
    names: { male: ['Frederik', 'Christian', 'Valdemar', 'Knud', 'Joachim'], female: ['Margrethe', 'Ingrid', 'Isabella', 'Josephine', 'Benedikte'] },
    titles: { monarch: ['King', 'Queen'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Prince', 'Princess'], distant: ['Count of Rosenborg', 'Countess of Rosenborg'] },
    palace: 'Amalienborg Palace', grant: 'the civil list (apanage)', dukedoms: [],
  },
  BE: {
    name: 'the Crown', realms: ['BE'], rule: 'absolute', houses: ['Saxe-Coburg', 'Laeken'],
    names: { male: ['Philippe', 'Baudouin', 'Albert', 'Léopold', 'Gabriel'], female: ['Elisabeth', 'Éléonore', 'Astrid', 'Mathilde', 'Paola'] },
    titles: { monarch: ['King of the Belgians', 'Queen of the Belgians'], heir: ['Duke of Brabant', 'Duchess of Brabant'], royal: ['Prince', 'Princess'], distant: ['Prince', 'Princess'] },
    palace: 'the Royal Palace of Laeken', grant: 'the civil list (dotation)', dukedoms: ['Brabant'],
  },
  TH: {
    name: 'the Chakri dynasty', realms: ['TH'], rule: 'agnatic', houses: ['Chakri'],
    names: { male: ['Vajiralongkorn', 'Bhumibol', 'Dipangkorn', 'Prajadhipok', 'Mahidol'], female: ['Sirindhorn', 'Bajrakitiyabha', 'Sirivannavari', 'Ubol Ratana', 'Chulabhorn'] },
    titles: { monarch: ['King', 'Queen'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Prince (Chao Fa)', 'Princess (Chao Fa)'], distant: ['Mom Chao', 'Mom Chao'] },
    palace: 'the Grand Palace, Bangkok', grant: 'the Crown Property Bureau', dukedoms: [],
  },
  MY: {
    name: 'the Malay Rulers', realms: ['MY'], rule: 'agnatic', houses: ['Johor', 'Pahang', 'Perak'],
    names: { male: ['Ibrahim', 'Abdullah', 'Nazrin', 'Sharafuddin', 'Mizan'], female: ['Zarith', 'Azizah', 'Tuanku Aminah', 'Raja Zarith', 'Tunku Tun'] },
    titles: { monarch: ['Yang di-Pertuan Agong', 'Raja Permaisuri Agong'], heir: ['Tunku Mahkota', 'Tunku Mahkota'], royal: ['Tunku', 'Tunku'], distant: ['Tengku', 'Tengku'] },
    palace: 'Istana Negara, Kuala Lumpur', grant: 'the royal allowance', dukedoms: [],
    note: 'An elected monarchy: the nine state rulers choose the King from among themselves for five years.',
  },
  BN: {
    name: 'the Sultanate', realms: ['BN'], rule: 'agnatic', executive: true, houses: ['Bolkiah'],
    names: { male: ['Hassanal', 'Al-Muhtadee', 'Abdul Mateen', 'Omar Ali', 'Jefri'], female: ['Rashidah', 'Majeedah', 'Hafizah', 'Azemah', 'Fadzilah'] },
    titles: { monarch: ['Sultan', 'Sultan'], heir: ['Crown Prince (Pengiran Muda Mahkota)', 'Crown Princess'], royal: ['Pengiran Muda', 'Pengiran Anak'], distant: ['Pengiran', 'Pengiran'] },
    palace: 'Istana Nurul Iman', grant: 'the oil revenues', dukedoms: [],
  },
  KH: {
    name: 'the Crown', realms: ['KH'], rule: 'agnatic', houses: ['Norodom', 'Sisowath'],
    names: { male: ['Sihamoni', 'Sihanouk', 'Ranariddh', 'Sirivudh', 'Chakrapong'], female: ['Bopha Devi', 'Arunrasmy', 'Norleak', 'Marie', 'Soma'] },
    titles: { monarch: ['King', 'Queen'], heir: ['Prince', 'Princess'], royal: ['Prince (Samdech)', 'Princess (Samdech)'], distant: ['Prince', 'Princess'] },
    palace: 'the Royal Palace, Phnom Penh', grant: 'the palace budget', dukedoms: [],
    note: 'The Royal Council of the Throne elects the King from among male descendants of the royal houses.',
  },
  JO: {
    name: 'the Hashemite Crown', realms: ['JO'], rule: 'agnatic', houses: ['Hashemite'],
    names: { male: ['Abdullah', 'Hussein', 'Hashem', 'Faisal', 'Ali'], female: ['Rania', 'Iman', 'Salma', 'Noor', 'Haya'] },
    titles: { monarch: ['King', 'Queen'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Prince', 'Princess'], distant: ['Sharif', 'Sharifa'] },
    palace: 'Raghadan Palace, Amman', grant: 'the royal court budget', dukedoms: [],
  },
  SA: {
    name: 'the House of Saud', realms: ['SA'], rule: 'agnatic', executive: true, houses: ['Al Saud'],
    names: { male: ['Salman', 'Mohammed', 'Abdulaziz', 'Faisal', 'Khalid'], female: ['Reema', 'Lolowah', 'Basmah', 'Hessa', 'Noura'] },
    titles: { monarch: ['King', 'Queen'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Prince', 'Princess'], distant: ['Prince', 'Princess'] },
    palace: 'Al-Yamamah Palace, Riyadh', grant: 'the royal stipends', dukedoms: [],
  },
  MA: {
    name: 'the Alaouite Crown', realms: ['MA'], rule: 'agnatic', executive: true, houses: ['Alaouite'],
    names: { male: ['Mohammed', 'Hassan', 'Moulay Rachid', 'Moulay Ismail', 'Moulay Hicham'], female: ['Lalla Khadija', 'Lalla Salma', 'Lalla Meryem', 'Lalla Asmaa', 'Lalla Hasna'] },
    titles: { monarch: ['King', 'Queen'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Moulay', 'Lalla'], distant: ['Sharif', 'Sharifa'] },
    palace: 'the Royal Palace, Rabat', grant: 'the royal household budget', dukedoms: [],
  },
  KW: {
    name: 'the Al Sabah', realms: ['KW'], rule: 'agnatic', executive: true, houses: ['Al Sabah'],
    names: { male: ['Mishal', 'Nawaf', 'Sabah', 'Jaber', 'Sabah Al-Khalid'], female: ['Sharifa', 'Fatima', 'Amthal', 'Hessa', 'Latifa'] },
    titles: { monarch: ['Emir', 'Emira'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Sheikh', 'Sheikha'], distant: ['Sheikh', 'Sheikha'] },
    palace: 'Bayan Palace, Kuwait City', grant: 'the Amiri Diwan', dukedoms: [],
  },
  QA: {
    name: 'the Al Thani', realms: ['QA'], rule: 'agnatic', executive: true, houses: ['Al Thani'],
    names: { male: ['Tamim', 'Hamad', 'Jassim', 'Khalifa', 'Abdullah'], female: ['Moza', 'Al-Mayassa', 'Hind', 'Jawaher', 'Anoud'] },
    titles: { monarch: ['Emir', 'Emira'], heir: ['Deputy Emir', 'Sheikha'], royal: ['Sheikh', 'Sheikha'], distant: ['Sheikh', 'Sheikha'] },
    palace: 'the Amiri Diwan, Doha', grant: 'the state budget', dukedoms: [],
  },
  BH: {
    name: 'the Al Khalifa', realms: ['BH'], rule: 'agnatic', executive: true, houses: ['Al Khalifa'],
    names: { male: ['Hamad', 'Salman', 'Khalifa', 'Nasser', 'Khalid'], female: ['Sabika', 'Hessa', 'Mai', 'Noora', 'Lulwa'] },
    titles: { monarch: ['King', 'Queen'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Sheikh', 'Sheikha'], distant: ['Sheikh', 'Sheikha'] },
    palace: 'Sakhir Palace', grant: 'the royal court budget', dukedoms: [],
  },
  AE: {
    name: 'the Al Nahyan', realms: ['AE'], rule: 'agnatic', executive: true, houses: ['Al Nahyan', 'Al Maktoum'],
    names: { male: ['Mohamed', 'Khalifa', 'Zayed', 'Hamdan', 'Tahnoun'], female: ['Fatima', 'Mariam', 'Shamma', 'Hessa', 'Latifa'] },
    titles: { monarch: ['President and Ruler of Abu Dhabi', 'Ruler'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Sheikh', 'Sheikha'], distant: ['Sheikh', 'Sheikha'] },
    palace: 'Qasr Al Watan, Abu Dhabi', grant: 'the federal and emirate budgets', dukedoms: [],
    note: 'A federation of seven emirates: the Ruler of Abu Dhabi is President, the Ruler of Dubai Vice-President and Prime Minister.',
  },

};
/**
 * Thrones that fell, kept for a restoration (Houses.js): they wear no crown until a referendum
 * brings the monarchy back (state.world.restored[cc]).
 */
const RESTORABLE = {
  DE: { houses: ['Hohenzollern'], rule: 'agnatic', names: { male: ['Wilhelm', 'Friedrich', 'Georg', 'Louis Ferdinand', 'Carl'], female: ['Viktoria', 'Luise', 'Sophie', 'Cecilie'] }, titles: { monarch: ['Emperor', 'Empress'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Prince', 'Princess'], distant: ['Prince', 'Princess'] }, palace: 'the Berlin Palace' },
  FR: { houses: ['Orléans'], rule: 'agnatic', names: { male: ['Henri', 'Jean', 'Louis', 'Gaston', 'François'], female: ['Isabelle', 'Marie', 'Hélène', 'Chantal'] }, titles: { monarch: ['King', 'Queen'], heir: ['Dauphin', 'Dauphine'], royal: ['Prince', 'Princess'], distant: ['Prince', 'Princess'] }, palace: 'the Tuileries' },
  IT: { houses: ['Savoy'], rule: 'agnatic', names: { male: ['Vittorio Emanuele', 'Umberto', 'Emanuele Filiberto', 'Amedeo'], female: ['Maria Gabriella', 'Vittoria', 'Luisa', 'Margherita'] }, titles: { monarch: ['King', 'Queen'], heir: ['Prince of Piedmont', 'Princess of Piedmont'], royal: ['Prince', 'Princess'], distant: ['Prince', 'Princess'] }, palace: 'the Quirinal Palace' },
  AT: { houses: ['Habsburg-Lorraine'], rule: 'agnatic', names: { male: ['Karl', 'Otto', 'Ferdinand', 'Franz Joseph', 'Leopold'], female: ['Maria Theresa', 'Gabriela', 'Eleonore', 'Elisabeth'] }, titles: { monarch: ['Emperor', 'Empress'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Archduke', 'Archduchess'], distant: ['Archduke', 'Archduchess'] }, palace: 'the Hofburg' },
  RU: { houses: ['Romanov'], rule: 'malePreference', names: { male: ['Nikolai', 'Alexander', 'Georgy', 'Mikhail', 'Pavel'], female: ['Maria', 'Anastasia', 'Olga', 'Tatiana', 'Xenia'] }, titles: { monarch: ['Emperor', 'Empress'], heir: ['Tsesarevich', 'Tsesarevna'], royal: ['Grand Duke', 'Grand Duchess'], distant: ['Prince', 'Princess'] }, palace: 'the Winter Palace' },
  BR: { houses: ['Orléans-Braganza'], rule: 'malePreference', names: { male: ['Pedro', 'Luiz', 'Bertrand', 'Rafael', 'Antônio'], female: ['Isabel', 'Leopoldina', 'Maria Gabriela', 'Teresa'] }, titles: { monarch: ['Emperor', 'Empress'], heir: ['Prince Imperial', 'Princess Imperial'], royal: ['Prince', 'Princess'], distant: ['Prince', 'Princess'] }, palace: 'the Palace of São Cristóvão' },
  RO: { houses: ['Romania'], rule: 'absolute', names: { male: ['Carol', 'Mihai', 'Ferdinand', 'Nicolae'], female: ['Margareta', 'Elena', 'Maria', 'Sofia'] }, titles: { monarch: ['King', 'Queen'], heir: ['Crown Prince', 'Crown Princess'], royal: ['Prince', 'Princess'], distant: ['Prince', 'Princess'] }, palace: 'the Royal Palace, Bucharest' },
};
for (const [cc, d] of Object.entries(RESTORABLE)) CROWNS[cc] = { name: 'the Crown', realms: [cc], grant: 'civil list', dukedoms: [], restorable: true, ...d };
export const CROWN_HOMES = Object.keys(CROWNS).filter((id) => !CROWNS[id].restorable);
/** The crown a country's head of state wears (null for republics, and after a realm votes to leave). */
export function crownOf(state, cc = state.character.countryId ?? 'US') {
  if (state.world?.republics?.[cc]) return null;
  if (state.world?.restored?.[cc] && CROWNS[cc]?.restorable) return cc;
  return CROWN_HOMES.find((id) => CROWNS[id].realms.includes(cc)) ?? null;
}
export const isRealmAbroad = (state, cc) => crownOf(state, cc) === 'GB' && cc !== 'GB';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const genderIdx = (g) => (g === 'female' ? 1 : 0);
const pickName = (rng, def, gender) => rng.pick(def.names[gender]);

function newMonarch(rng, def, { age, gender, name, number } = {}) {
  const g = gender ?? (def.rule === 'agnatic' ? 'male' : rng.chance(0.5) ? 'male' : 'female');
  const n = name ?? pickName(rng, def, g);
  return { name: n, gender: g, age: age ?? rng.int(48, 78), number: number ?? rng.int(1, 4) };
}
function newHeir(rng, def, monarch) {
  // The heir by the crown's law: the eldest child (the eldest son first in Spain; sons only in Japan).
  const g = def.rule === 'agnatic' || (def.rule === 'malePreference' && rng.chance(0.7)) ? 'male' : rng.chance(0.5) ? 'male' : 'female';
  return { name: pickName(rng, def, g), gender: g, age: Math.max(0, monarch.age - rng.int(24, 34)), relation: g === 'female' ? 'daughter' : 'son' };
}

/** The crown a life is lived under, created on first sight. */
export function ensureCrown(state, crownId) {
  if (!crownId || !CROWNS[crownId]) return null;
  state.world ??= {};
  state.world.crowns ??= {};
  if (!state.world.crowns[crownId]) {
    const def = CROWNS[crownId];
    const rng = new Random(((state.world.seed ?? 1) * 7027 + crownId.charCodeAt(0) * 131 + crownId.charCodeAt(1)) >>> 0);
    const monarch = newMonarch(rng, def);
    // A reign already under way: crowned years ago.
    state.world.crowns[crownId] = { house: rng.pick(def.houses), monarch, heir: newHeir(rng, def, monarch), since: currentYear(state) - rng.int(1, Math.max(2, monarch.age - 30)), crowned: true, events: [] };
  }
  return state.world.crowns[crownId];
}

/** "King Edmund IV" — or you. */
export function monarchName(state, crownId) {
  const c = state.world?.crowns?.[crownId];
  if (!c) return null;
  const def = CROWNS[crownId];
  return `${def.titles.monarch[genderIdx(c.monarch.gender)]} ${c.monarch.name}${c.monarch.number > 1 ? ` ${ROMAN[c.monarch.number] ?? c.monarch.number}` : ''}`;
}
/** "the King" / "the Queen" for a country (null in a republic). */
export function sovereign(state, cc) {
  const id = crownOf(state, cc);
  if (!id) return null;
  const c = ensureCrown(state, id);
  return `the ${CROWNS[id].titles.monarch[genderIdx(c.monarch.gender)]}`;
}

/* ------------------------------------------------------------------ */
/* The reign                                                           */
/* ------------------------------------------------------------------ */

/** Who gets a coronation or jubilee medal: those who serve the Crown in its realm. */
function servesTheCrown(state, cc) {
  const job = state.career.job;
  return Boolean(state.military.service && (state.military.service.nation ?? 'US') === cc)
    || Boolean(job && job.sector && job.sector !== 'private' && (state.character.countryId ?? 'US') === cc)
    || Boolean(state.politics?.office) || Boolean(state.royal) || servedTheCrown(state, cc);
}
/**
 * Those who served before are on the list too: former governors-general, governors and
 * lieutenant governors, former prime ministers, premiers and members of parliament, retired
 * senior officers and senior public servants, peers, and holders of the realm's orders.
 */
const servesNow = (state, cc) => Boolean(state.military.service || (state.career.job?.sector && state.career.job.sector !== 'private') || state.politics?.office || state.royal);
function servedTheCrown(state, cc) {
  const held = (state.politics?.history ?? []).map((h) => OFFICES[h.officeId]).filter((o) => o && (o.country ?? 'US') === cc);
  if (held.some((o) => o.level >= 4 || o.headOfState || o.ceremonial || o.leader)) return true;
  if ((state.military.history ?? []).some((h) => (h.nation ?? 'US') === cc && h.track === 'officer' && (h.grade ?? 0) >= 4)) return true;
  if ((state.career.history ?? []).some((h) => h.sector && h.sector !== 'private' && (h.peakGrade ?? h.grade ?? 0) >= 9)) return true;
  if (state.character.peerage) return true;
  return state.honors.some((h) => h.source === 'order' && h.country === cc);
}
function crownMedal(ctx, cc, kind, crownId) {
  const { state } = ctx;
  if ((state.character.countryId ?? 'US') !== cc || !servesTheCrown(state, cc) || state.royal?.reigning) return;
  const name = `${monarchName(state, crownId)} ${kind === 'coronation' ? 'Coronation' : 'Jubilee'} Medal`;
  if (state.honors.some((h) => h.name === name)) return;
  const former = !servesNow(state, cc);
  addHonor(state, { id: `crown.${kind}.${currentYear(state)}`, source: 'civil', country: cc, name, icon: '👑', ribbon: [['#002868', 1], ['#c8102e', 1], ['#fff', 1], ['#c8102e', 1], ['#002868', 1]], precedence: 40, prestige: 4, citation: former ? `Awarded in the ${kind === 'coronation' ? 'coronation' : 'jubilee'} year for past service to the Crown.` : `Awarded to those serving the Crown in the ${kind === 'coronation' ? 'coronation' : 'jubilee'} year.` });
  ctx.log(`You received the ${name}.`, '👑', 'honor');
}

/** The monarch dies (or abdicates): the heir accedes. */
export function demise(ctx, crownId, why) {
  const { state, rng } = ctx;
  const def = CROWNS[crownId];
  const c = state.world.crowns[crownId];
  const old = monarchName(state, crownId);
  const reign = currentYear(state) - c.since;
  const r = state.royal;
  // The player was the heir: the throne is theirs.
  if (r && r.crownId === crownId && r.line === 1 && !r.reigning) return accede(ctx, old, why);
  const sameName = Object.values(state.world.crowns).length && rng.chance(0.3);
  const next = { name: c.heir.name, gender: c.heir.gender, age: c.heir.age, number: sameName ? c.monarch.number + 1 : rng.int(1, 3) };
  c.monarch = next;
  c.heir = newHeir(rng, def, next);
  c.since = currentYear(state);
  c.crowned = false;
  const here = crownOf(state) === crownId;
  if (here) ctx.log(`${old} ${why} after ${reign} year${reign === 1 ? '' : 's'} on the throne. ${monarchName(state, crownId)} accedes. Long live the ${def.titles.monarch[genderIdx(next.gender)]}!`, '👑', 'milestone');
  // A royal walks behind the coffin at the state funeral.
  if (r && r.crownId === crownId && /died/.test(why)) {
    r.popularity = Math.min(100, (r.popularity ?? 60) + 3);
    ctx.stat('happiness', -6);
    ctx.log(`The state funeral: you walked behind the gun carriage through streets lined ten deep, and stood in the abbey as the crown was lifted from the coffin. Millions watched.`, '⚱️', 'milestone');
  }
  // A new reign is when a realm asks whether it still wants one.
  for (const cc of def.realms) if (cc !== crownId && rng.chance(0.08)) (state.world.pendingReferendum ??= {})[cc] = currentYear(state) + 1;
  return null;
}

function accede(ctx, old, why) {
  const { state } = ctx;
  const r = state.royal;
  const def = CROWNS[r.crownId];
  const c = state.world.crowns[r.crownId];
  const number = (c.namesUsed?.[state.character.firstName] ?? 0) + 1;
  c.monarch = { name: state.character.firstName, gender: state.character.gender, age: state.character.age, number, you: true };
  c.since = currentYear(state);
  c.crowned = false;
  c.heir = { name: 'your eldest child', gender: 'male', age: Math.max(0, state.character.age - 28), relation: 'child' };
  Object.assign(r, { reigning: true, line: 0, working: true, regnal: number });
  state.character.style = { ...(state.character.style ?? {}), prefix: def.titles.monarch[genderIdx(state.character.gender)] };
  ctx.log(`${old} ${why}. You are now ${monarchName(state, r.crownId)}. The accession council proclaimed you this morning.`, '👑', 'milestone');
  ctx.stat('stress', 15);
  return null;
}

function reignYear(ctx, crownId) {
  const { state, rng } = ctx;
  const def = CROWNS[crownId];
  const c = state.world.crowns[crownId];
  const here = crownOf(state) === crownId;
  const cc = state.character.countryId ?? 'US';
  c.monarch.age += 1;
  c.heir.age += 1;
  // The coronation, a year after the accession.
  if (!c.crowned && currentYear(state) > c.since) {
    c.crowned = true;
    if (c.monarch.you) {
      ctx.log(`Your coronation at ${def.palace}: anointed, crowned and enthroned before the nation.`, '👑', 'milestone');
      if (state.royal) state.royal.popularity = Math.min(100, (state.royal.popularity ?? 60) + 8);
    } else if (here) {
      ctx.log(`The coronation of ${monarchName(state, crownId)} at ${def.palace}: a public holiday, and a medal for those who serve.`, '👑', 'info');
      crownMedal(ctx, cc, 'coronation', crownId);
    }
  }
  // Jubilees.
  const reign = currentYear(state) - c.since;
  if ([25, 40, 50, 60, 70].includes(reign) && here) {
    ctx.log(`${monarchName(state, crownId)}'s ${{ 25: 'Silver', 40: 'Ruby', 50: 'Golden', 60: 'Diamond', 70: 'Platinum' }[reign]} Jubilee: street parties across the realm${def.realms.length > 1 ? 's' : ''}.`, '🎉', 'info');
    crownMedal(ctx, cc, 'jubilee', crownId);
  }
  // Mortality and abdication (the player as monarch dies with the player).
  if (!c.monarch.you) {
    const death = c.monarch.age < 60 ? 0.004 : c.monarch.age < 75 ? 0.015 + (c.monarch.age - 60) * 0.003 : 0.06 + (c.monarch.age - 75) * 0.012;
    if (rng.chance(death)) return demise(ctx, crownId, 'died');
    if (crownId !== 'GB' && c.monarch.age >= 75 && rng.chance(0.04)) return demise(ctx, crownId, 'abdicated');
  }
  // Royal life in the news.
  if (here && rng.chance(0.06)) {
    const e = rng.pick([
      `A royal wedding: ${def.titles.royal[1]} ${pickName(rng, def, 'female')} married at ${def.palace}. A day off for the nation.`,
      `A royal baby: the ${def.titles.heir[genderIdx(c.heir.gender)]}'s family welcomed a child.`,
      `${monarchName(state, crownId)} began a state visit abroad.`,
      `A royal scandal: a minor royal's business dealings made the front pages.`,
    ]);
    ctx.log(e, '👑', 'muted');
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Republic referendums                                                */
/* ------------------------------------------------------------------ */

function referendumYear(ctx) {
  const { state, rng } = ctx;
  const cc = state.character.countryId ?? 'US';
  if (!isRealmAbroad(state, cc)) return;
  const due = state.world.pendingReferendum?.[cc];
  if (!(due && currentYear(state) >= due) && !rng.chance(0.004)) return;
  delete state.world.pendingReferendum?.[cc];
  if (state.prompts.some((p) => p.type === 'crown.referendum')) return;
  const citizen = state.character.age >= 18;
  if (!citizen) return resolveReferendum(ctx, cc, 0);
  ctx.prompt({
    type: 'crown.referendum', icon: '🗳️', title: 'A Republic Referendum',
    text: `The nation votes on whether to replace ${sovereign(state, cc)} as head of state with a president of its own.`,
    options: [{ id: 'yes', label: '🗳️ Vote yes: a republic' }, { id: 'no', label: '👑 Vote no: keep the Crown' }, { id: 'campaignYes', label: '📣 Campaign for a republic' }, { id: 'campaignNo', label: '📣 Campaign for the Crown' }, { id: 'skip', label: '🛋️ Stay home' }],
    data: { cc },
  });
}
function resolveReferendum(ctx, cc, push) {
  const { state, rng } = ctx;
  // How the country polls on the monarchy decides the vote (Houses.js keeps the polls).
  const support = state.world.monarchists?.[cc] ?? 55;
  // The status quo has an edge: undecided voters keep what they have.
  // Canada's needs every province to agree (the amending formula): even harder there.
  const yes = clamp(1 - support / 100 - (cc === 'CA' ? 0.18 : 0.1) + rng.float(-0.08, 0.08) + push, 0.15, 0.85);
  if (yes > 0.5) {
    state.world.republics ??= {};
    state.world.republics[cc] = { year: currentYear(state) };
    ctx.log(`The referendum passed with ${Math.round(yes * 100)}%: the country will become a republic. The Crown's offices here end; a president will be its head of state.`, '🏛️', 'milestone');
    const o = state.politics?.office;
    if (o && /_gg$|_lg$|au_governor/.test(o.id)) ctx.emit('politics:leave', { reason: 'The office was abolished when the country became a republic' });
  } else ctx.log(`The republic referendum failed: ${Math.round(yes * 100)}% voted yes. The Crown stays.`, '👑', 'info');
}

/* ------------------------------------------------------------------ */
/* Constitutional crises and the reserved powers                       */
/* ------------------------------------------------------------------ */

/** Rare: about once or twice in a lifetime in any one country. */
export const CRISIS_CHANCE = 0.02;
export const CRISES = {
  hung: { title: 'A Hung Parliament', text: 'The election gave no party a majority. Two leaders each claim they can command the house.', options: [
    { id: 'largest', label: '🏛️ Invite the leader of the largest party to try first', good: 0.8, note: 'The convention, followed. Few could fault it.' },
    { id: 'coalition', label: '🤝 Invite the coalition with a written majority', good: 0.65, note: 'A defensible call that the losing side calls a stitch-up.' },
    { id: 'fresh', label: '🗳️ Dissolve for a fresh election', good: 0.3, note: 'Voters resent being sent back to the polls.' },
  ] },
  dissolution: { title: 'A Request to Dissolve', text: 'Months after an election, a prime minister facing defeat asks for parliament to be dissolved for another one.', options: [
    { id: 'grant', label: '✍️ Grant it, on advice', good: 0.6, note: 'You did as advised; the critics say you let a government dodge the house.' },
    { id: 'refuse', label: '🚫 Refuse, and ask the opposition to form a government', good: 0.45, note: 'A reserved power used — the Byng precedent, and a storm.' },
  ] },
  supply: { title: 'Supply Blocked', text: 'The upper house has refused to pass the budget. Public servants will go unpaid within weeks; the prime minister will neither resign nor call an election.', options: [
    { id: 'dismiss', label: '⚖️ Dismiss the government and commission a caretaker', good: 0.4, note: 'The most controversial act of the Crown in a generation. Half the country cheers.' },
    { id: 'wait', label: '⏳ Wait for the houses to settle it', good: 0.55, note: 'You held back; the crisis ran on for weeks before it broke.' },
    { id: 'counsel', label: '🗣️ Warn the prime minister privately', good: 0.7, note: 'A quiet word: the budget passed a week later.' },
  ] },
  prorogation: { title: 'Prorogation', text: 'Days before a confidence vote it will lose, the government asks for parliament to be prorogued.', options: [
    { id: 'grant', label: '✍️ Prorogue, with conditions', good: 0.55, note: 'You bought the government time and set conditions.' },
    { id: 'refuse', label: '🚫 Refuse', good: 0.5, note: 'The government fell in the vote; its supporters blame you.' },
  ] },
  assent: { title: 'A Bill on the Desk', text: 'A bill that may be unconstitutional awaits royal assent. Lawyers are divided; the government insists.', options: [
    { id: 'assent', label: '✍️ Give assent, as is the convention', good: 0.75, note: 'The courts can deal with it. Convention held.' },
    { id: 'withhold', label: '🚫 Withhold assent', good: 0.15, note: 'The first refusal in living memory: a full constitutional crisis.' },
  ] },
};
const CRISIS_IDS = Object.keys(CRISES);

/** Is the player the one who decides (the Governor-General here, or the monarch at home)? */
function decider(state, cc) {
  const o = state.politics?.office?.id;
  const gg = { CA: 'ca_gg', AU: 'au_gg', NZ: 'nz_gg' }[cc];
  if (gg && o === gg) return 'gg';
  const r = state.royal;
  if (r?.reigning && r.crownId === cc) return 'monarch';
  return null;
}

function crisisYear(ctx) {
  const { state, rng } = ctx;
  const cc = state.character.countryId ?? 'US';
  if (!crownOf(state, cc) || !rng.chance(CRISIS_CHANCE)) return;
  const id = rng.pick(CRISIS_IDS);
  const k = CRISES[id];
  const who = decider(state, cc);
  if (who) {
    ctx.prompt({ type: 'crown.crisis', icon: '⚖️', title: k.title, text: `${k.text}\nThe reserved powers are yours to use — or not.`, options: k.options.map((o) => ({ id: o.id, label: o.label })), data: { id } });
    return;
  }
  // As news — and if you're the prime minister, it's your government on the line.
  const pick = rng.pick(k.options);
  state.world.crises = [...(state.world.crises ?? []).slice(-5), { year: currentYear(state), cc, id, choice: pick.id }];
  ctx.log(`Constitutional crisis: ${k.title.toLowerCase()}. ${pick.note}`, '⚖️', 'info');
  const o = state.politics?.office;
  if (o && /_pm$|premier/.test(o.id) && id === 'supply' && pick.id === 'dismiss') ctx.emit('politics:leave', { reason: 'Dismissed by the Crown in a constitutional crisis' });
}

/* ------------------------------------------------------------------ */
/* Born royal                                                          */
/* ------------------------------------------------------------------ */

export const ROYAL_LEVELS = {
  heir: { name: 'Heir to the throne', line: [1, 1], allowance: 2400000, desc: 'The monarch\'s eldest child: you will reign.' },
  child: { name: 'Child of the monarch', line: [2, 4], allowance: 900000, desc: 'A prince or princess, a heartbeat or two from the throne.' },
  grandchild: { name: 'Grandchild of the monarch', line: [5, 12], allowance: 250000, desc: 'A royal title, a smaller role and a little more freedom.' },
  distant: { name: 'Distant royal', line: [20, 60], allowance: 0, desc: 'A courtesy title, a private income and an ordinary-ish life.' },
};
/** A royal's style: "Prince Edmund", "the Prince of Cambria", "Lady Matilda". */
export function royalPrefix(state) {
  const r = state.royal;
  if (!r) return null;
  const def = CROWNS[r.crownId];
  const g = genderIdx(state.character.gender);
  if (r.reigning) return def.titles.monarch[g];
  if (!r.working && r.steppedBack) return null;
  return r.level === 'distant' ? def.titles.distant[g] : def.titles.royal[g];
}
export function royalStyledName(state) {
  const r = state.royal;
  const c = state.character;
  if (!r) return null;
  const def = CROWNS[r.crownId];
  if (r.reigning) return monarchName(state, r.crownId);
  // A royal dukedom (and its lesser titles) follows the royal style: "Prince Edmund, Duke of Albany".
  const peer = c.style?.peerage ? `, ${c.style.peerage}` : '';
  if (r.line === 1 && r.working) return `${c.firstName}, ${def.titles.heir[genderIdx(c.gender)]}${peer}`;
  const p = royalPrefix(state);
  return p ? `${p} ${c.firstName}${peer}` : null;
}

/** The reigning player gives up the throne: the heir accedes. Returns the old regnal name. */
function handOver(ctx) {
  const { state } = ctx;
  const r = state.royal;
  const c = state.world.crowns[r.crownId];
  const was = monarchName(state, r.crownId);
  const def = CROWNS[r.crownId];
  const g = c.heir.gender ?? 'male';
  c.monarch = { name: c.heir.name === 'your eldest child' ? pickName(ctx.rng, def, g) : c.heir.name, gender: g, age: c.heir.age, number: 1 };
  c.heir = newHeir(ctx.rng, def, c.monarch);
  c.since = currentYear(state);
  c.crowned = false;
  return was;
}

/** Set up a royal birth (createInitialState put the chosen level in state.royal). */
function bornRoyal(state, rng) {
  const r = state.royal;
  const crownId = CROWNS[r.crownId] ? r.crownId : 'GB';
  r.crownId = crownId;
  const def = CROWNS[crownId];
  const c = ensureCrown(state, crownId);
  const lv = ROYAL_LEVELS[r.level] ?? ROYAL_LEVELS.child;
  r.line = rng.int(lv.line[0], lv.line[1]);
  // Japan: only the male line inherits.
  if (def.rule === 'agnatic' && state.character.gender === 'female') r.line = null;
  if (def.rule === 'malePreference' && state.character.gender === 'female' && r.level === 'heir' && rng.chance(0.5)) r.line = 2;
  Object.assign(r, { working: r.level !== 'distant', popularity: 60, reigning: false, patronages: [], since: 0 });
  // In the Gulf, Brunei and Morocco the monarch governs: the throne comes with executive power.
  if (def.executive) r.executive = true;
  state.character.lastName = c.house.replace(/^the /, '');
  // The family: for the heir and the monarch's children, a parent is the monarch.
  const parents = (state.people?.list ?? []).filter((p) => p.relation === 'mother' || p.relation === 'father');
  if (['heir', 'child'].includes(r.level) && parents.length) {
    const p = parents.find((x) => x.gender === c.monarch.gender) ?? parents[0];
    c.monarch.name = p.firstName;
    c.monarch.gender = p.gender;
    c.monarch.age = Math.max(30, p.ageOffset ?? 30);
    p.royal = 'monarch';
    if (r.line === 1) c.heir = { name: state.character.firstName, gender: state.character.gender, age: 0, relation: 'you', you: true };
  }
  // Further down the line, a parent is the royal one: the monarch's child (a prince with a royal
  // dukedom) for a grandchild, a lord or lady of the blood for a distant royal; their spouse takes
  // the title by marriage.
  if (['grandchild', 'distant'].includes(r.level) && parents.length) {
    const royalParent = parents.find((x) => x.gender === 'male') ?? parents[0];
    const other = parents.find((x) => x !== royalParent);
    const gi = genderIdx(royalParent.gender);
    royalParent.royal = r.level === 'grandchild' ? 'royalChild' : 'distant';
    if (r.level === 'grandchild') {
      royalParent.granted = def.titles.royal[gi];
      const place = def.dukedoms.length ? def.dukedoms[[...royalParent.firstName].reduce((n, ch) => n + ch.charCodeAt(0), 0) % def.dukedoms.length] : null;
      if (place) {
        royalParent.titles = [`${['Duke', 'Duchess'][gi]} of ${place}`];
        royalParent.dukedom = royalParent.titles[0];
        if (other?.gender === 'female' && gi === 0) other.granted = `Duchess of ${place}`;
      } else if (other?.gender === 'female' && gi === 0) other.granted = def.titles.royal[1];
    } else {
      royalParent.granted = def.titles.distant[gi];
      if (other?.gender === 'female' && gi === 0) other.granted = def.titles.distant[1];
    }
    for (const p of parents) if (p.granted) p.title = p.granted;
  }
  for (const p of state.people?.list ?? []) if (['mother', 'father', 'sibling'].includes(p.relation)) p.lastName = state.character.lastName;
  if (state.people) state.people.wealth = 'upper';
  state.character.style = { ...(state.character.style ?? {}), prefix: royalPrefix(state) };
}

const PRESS = [
  { id: 'paparazzi', title: 'Long Lenses', text: 'Photographers chased your car through the city. A tabloid printed your holiday photos.', options: [{ id: 'sue', label: '⚖️ Sue the paper' }, { id: 'ignore', label: '🙄 Rise above it' }] },
  { id: 'gaffe', title: 'An Off-Hand Remark', text: 'A joke you made at a reception has become tomorrow\'s front page.', options: [{ id: 'apologize', label: '🙏 Apologize through the palace' }, { id: 'silence', label: '🤐 Never complain, never explain' }] },
  { id: 'cause', title: 'A Cause Takes Off', text: 'A charity you champion is suddenly in the spotlight.', options: [{ id: 'lead', label: '📣 Lead the campaign publicly' }, { id: 'quiet', label: '🤝 Support it quietly' }] },
  { id: 'interview', title: 'The Interview Request', text: 'A famous broadcaster wants a sit-down interview about your life inside the family.', options: [{ id: 'accept', label: '🎤 Tell your story', tone: 'danger' }, { id: 'decline', label: '🙅 Decline' }] },
];
const PATRONAGES = ['a children\'s hospital', 'the Royal Air Ambulance', 'a veterans\' charity', 'a wildlife trust', 'the national ballet', 'a mental-health charity', 'a rugby union', 'a homelessness charity', 'a cancer research fund', 'the lifeboat service'];

function royalYear(ctx) {
  const { state, rng } = ctx;
  const r = state.royal;
  if (!r) return;
  ensureCrown(state, r.crownId);
  const def = CROWNS[r.crownId];
  const age = state.character.age;
  // Money: the grant for working royals; a family trust for everyone.
  if (age >= 18) {
    const lv = ROYAL_LEVELS[r.level] ?? ROYAL_LEVELS.child;
    const grant = r.reigning ? 20000000 : r.working ? (r.line === 1 ? ROYAL_LEVELS.heir.allowance : lv.allowance) : 0;
    if (grant) ctx.earn(grant, def.grant);
    ctx.earn(r.reigning ? 0 : 60000, 'Family trust income');
  }
  // Popularity drifts back toward the middle: the public's affection has to be earned every year.
  r.popularity = Math.round(clamp((r.popularity ?? 60) + (55 - (r.popularity ?? 60)) * 0.2 + rng.int(-4, 3), 0, 100));
  // The line of succession moves: births ahead of you push you back, deaths bring you forward.
  if (!r.reigning && r.line != null && r.line > 1) {
    if (rng.chance(r.line <= 4 ? 0.05 : 0.1)) r.line += 1;
    if (rng.chance(0.03)) r.line = Math.max(1, r.line - 1);
    if (r.line === 1) ctx.log(`You are now first in line to the throne: heir to ${monarchName(state, r.crownId)}.`, '👑', 'milestone');
  }
  // A working royal's life in the papers.
  if (r.working && age >= 16 && rng.chance(0.3) && !state.prompts.some((p) => p.type === 'crown.press')) {
    const e = rng.pick(PRESS);
    ctx.prompt({ type: 'crown.press', icon: '📰', title: e.title, text: e.text, options: e.options, data: { id: e.id } });
  }
  // Coming of age: a royal dukedom on marriage (or at 25) for the monarch's children; orders at 21.
  if (r.working && age === 21 && r.line != null && r.line <= 4) ctx.emit('honours:royal', {});
  // A royal without a substantive title (further down the line, or a daughter of the House in a crown
  // with no duchies to give) is usually given one on marriage.
  const married = (state.people?.list ?? []).some((p) => p.alive !== false && p.relation === 'spouse');
  const minor = r.line == null || r.line > 12 || !def.dukedoms.length;
  if (!r.reigning && !r.steppedBack && minor && married && !state.character.peerage && !r.titleGranted && r.crownId !== 'JP' && rng.chance(r.working ? 0.6 : 0.25)) {
    r.titleGranted = true;
    const female = state.character.gender === 'female';
    const place = r.crownId === 'NL' ? null : rng.pick(def.dukedoms.length ? def.dukedoms : ['Snowdon']);
    const t = r.crownId === 'NL' ? `${female ? 'Princess' : 'Prince'} of Orange-Nassau` : r.crownId === 'GB' ? `${female ? 'Countess' : 'Earl'} of ${rng.pick(['Snowdon', 'Ulster', 'Forfar', 'Inverness', 'Merioneth'])}` : `${female ? 'Duchess' : 'Duke'} of ${place}`;
    if (r.crownId === 'GB') state.character.peerage = { rank: 'earl', place: t.replace(/^\S+ of /, ''), kind: 'royal', seat: false, created: age };
    state.character.style = { ...(state.character.style ?? {}), peerage: t };
    ctx.log(`On your marriage ${monarchName(state, r.crownId)} gave you a title of your own: ${t}.`, '👑', 'honor');
  }
  if (r.working && !r.reigning && def.dukedoms.length && r.line != null && r.line >= 2 && r.line <= 12 && (age >= 25 || married) && age >= 18 && !state.character.peerage) {
    const place = rng.pick(def.dukedoms);
    const female = state.character.gender === 'female';
    state.character.peerage = { rank: 'duke', place, kind: 'royal', seat: false, created: age, subsidiary: subsidiaryTitles('duke', place, state.character.gender).slice(0, 2), number: 1 };
    state.character.style = { ...(state.character.style ?? {}), peerage: `${female ? 'Duchess' : 'Duke'} of ${place}` };
    ctx.log(`${monarchName(state, r.crownId)} created you ${female ? 'Duchess' : 'Duke'} of ${place}.`, '👑', 'honor');
  }
  // A working royal who takes a commercial job makes headlines (once).
  if (r.working && state.career.job?.sector === 'private' && !r.commercialRow) {
    r.commercialRow = true;
    r.popularity = Math.max(0, r.popularity - 10);
    ctx.log('A working royal in a commercial job: the papers called it cashing in on the Crown.', '📰', 'warn');
  }
  // The monarch's year: the business of the Crown.
  if (r.reigning && rng.chance(0.6) && !state.prompts.some((p) => p.type === 'crown.duty')) {
    const d = rng.pick(MONARCH_DUTIES);
    ctx.prompt({ type: 'crown.duty', icon: '👑', title: d.title, text: d.text, options: d.options, data: { id: d.id } });
  }
}
const MONARCH_DUTIES = [
  { id: 'opening', title: 'The State Opening', text: 'You open parliament and read the government\'s programme from the throne — words you didn\'t write.', options: [{ id: 'read', label: '📜 Read it as written' }, { id: 'pause', label: '🤨 Let a pause speak for you' }] },
  { id: 'audience', title: 'The Weekly Audience', text: 'The prime minister comes for the weekly audience, worried about the economy.', options: [{ id: 'encourage', label: '🤝 Encourage' }, { id: 'warn', label: '⚠️ Warn' }, { id: 'listen', label: '👂 Listen' }] },
  { id: 'visit', title: 'A State Visit', text: 'A controversial head of state is coming on a state visit, on the government\'s advice.', options: [{ id: 'host', label: '🍽️ Host them graciously' }, { id: 'cool', label: '❄️ A correct, cool reception' }] },
  { id: 'tour', title: 'A Tour of the Realms', text: 'The realms want to see their monarch.', options: [{ id: 'long', label: '✈️ A long tour' }, { id: 'short', label: '🗓️ A short one' }] },
];

export const CrownModule = {
  id: 'crown',
  order: 33.5,
  setup(engine) {
    // A royal wedding: a national occasion for the senior royals, a private one further down the line.
    engine.bus.on('people:married', ({ ctx }) => {
      const { state, rng } = ctx;
      const r = state.royal;
      if (!r || r.steppedBack) return;
      const senior = r.reigning || (r.line != null && r.line <= 4);
      r.popularity = Math.min(100, (r.popularity ?? 60) + (senior ? 8 : 3));
      ctx.stat('happiness', 8);
      ctx.log(senior
        ? `The royal wedding: ${rng.pick(['the abbey', 'the cathedral', 'the palace chapel'])}, a carriage procession, a balcony kiss and a public holiday. ${rng.int(8, 30)} million watched on television.`
        : 'A royal wedding in the family chapel: a few hundred guests, a photographer from the palace press office, and a mention on the evening news.', '💒', 'milestone');
    });
  },
  init(state, rng) {
    state.world ??= {};
    if (state.royal && state.royal.popularity == null && rng) bornRoyal(state, rng);
  },
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (state.royal && state.royal.popularity == null) bornRoyal(state, rng);
    const crownId = state.royal?.crownId ?? crownOf(state);
    if (crownId) {
      ensureCrown(state, crownId);
      reignYear(ctx, crownId);
    }
    royalYear(ctx);
    referendumYear(ctx);
    crisisYear(ctx);
  },
  actions: {
    /** A working royal's engagements: visits, openings, receptions. Three a year. */
    engagement(ctx) {
      const r = ctx.state.royal;
      if (!r?.working) return ctx.toast('Only a working royal carries out engagements.', 'warn');
      if (yearlyCount(ctx.state, 'crown.engagement') >= 3) return ctx.toast('Your diary is full.', 'warn');
      bumpYearly(ctx.state, 'crown.engagement');
      r.popularity = Math.min(100, r.popularity + 1);
      ctx.stat('stress', 2);
      ctx.log(ctx.rng.pick(['You opened a new hospital wing and met the staff.', 'You visited flood victims and stayed far past schedule.', 'You hosted a reception for young apprentices.', 'You presented medals at an investiture.']), '👑', 'good');
      return undefined;
    },
    patronage(ctx) {
      const r = ctx.state.royal;
      if (!r?.working || ctx.state.character.age < 18) return ctx.toast('Patronages are for working adult royals.', 'warn');
      if (yearlyCount(ctx.state, 'crown.patronage')) return ctx.toast('One new patronage a year.', 'warn');
      bumpYearly(ctx.state, 'crown.patronage');
      const p = ctx.rng.pick(PATRONAGES.filter((x) => !r.patronages.includes(x)));
      if (!p) return ctx.toast('You are patron of everything worth patronising.', 'warn');
      r.patronages.push(p);
      r.popularity = Math.min(100, r.popularity + 1);
      ctx.log(`You became patron of ${p}.`, '🎗️', 'good');
      return undefined;
    },
    tour(ctx) {
      const { state } = ctx;
      const r = state.royal;
      if (!r?.working || state.character.age < 21 || r.line == null || r.line > 6) return ctx.toast('Tours are for senior royals.', 'warn');
      if (yearlyCount(state, 'crown.tour')) return ctx.toast('One tour a year.', 'warn');
      bumpYearly(state, 'crown.tour');
      const realms = CROWNS[r.crownId].realms.filter((cc) => !state.world.republics?.[cc]);
      r.popularity = Math.min(100, r.popularity + 3);
      ctx.stat('stress', 5);
      ctx.log(realms.length > 1 ? `A royal tour of ${realms.length - 1} realm${realms.length > 2 ? 's' : ''}: crowds lined the streets.` : 'A royal tour of the provinces: crowds lined the streets.', '✈️', 'good');
      return undefined;
    },
    /** Step back from royal duties: no grant, no style; a private life and a career of your own. */
    stepBack(ctx) {
      const { state } = ctx;
      const r = state.royal;
      if (!r?.working || r.reigning) return ctx.toast(r?.reigning ? 'A monarch abdicates; they don\'t step back.' : 'You are not a working royal.', 'warn');
      r.working = false;
      r.steppedBack = true;
      state.character.style = { ...(state.character.style ?? {}), prefix: null };
      ctx.log('You stepped back from royal duties. No more grant and no more title in use — and no more obligations. The papers will follow you anyway.', '🚪', 'milestone');
      return undefined;
    },
    abdicate(ctx) {
      const { state } = ctx;
      const r = state.royal;
      if (!r?.reigning) return ctx.toast('Only a reigning monarch can abdicate.', 'warn');
      const was = handOver(ctx);
      Object.assign(r, { reigning: false, line: 2, working: false, abdicated: true });
      state.character.style = { ...(state.character.style ?? {}), prefix: CROWNS[r.crownId].titles.royal[genderIdx(state.character.gender)] };
      ctx.log(`${was} abdicated. ${monarchName(state, r.crownId)} reigns; you keep your title and lose the throne.`, '👑', 'milestone');
      return undefined;
    },
    /** Leave the royal family altogether: the throne (if you hold it), your place in the line, every title — yours and your family's. */
    renounce(ctx) {
      const { state } = ctx;
      const r = state.royal;
      if (!r) return undefined;
      if (state.character.age < 18) return ctx.toast('You can renounce your rights at 18.', 'warn');
      const c = state.world.crowns[r.crownId];
      const def = CROWNS[r.crownId];
      const reigned = r.reigning;
      const was = reigned ? handOver(ctx) : null;
      if (!reigned && c?.heir?.you) c.heir = newHeir(ctx.rng, def, c.monarch);
      const ch = state.character;
      if (ch.peerage?.kind === 'royal') delete ch.peerage;
      ch.style = { ...(ch.style ?? {}), prefix: null, peerage: null };
      for (const p of state.people?.list ?? []) {
        if (!['spouse', 'child'].includes(p.relation)) continue;
        delete p.title;
        if (p.dukedom) p.titles = (p.titles ?? []).filter((t) => t !== p.dukedom);
        delete p.dukedom;
      }
      ch.formerRoyal = { crownId: r.crownId, level: r.level, year: currentYear(state), age: ch.age, reigned: Boolean(reigned), regnal: reigned ? was : null };
      state.royal = null;
      ctx.stat('happiness', 6);
      ctx.stat('stress', -10);
      ctx.log(reigned
        ? `${was} abdicated — and renounced every title and right of succession for yourself and your descendants. ${monarchName(state, ch.formerRoyal.crownId)} reigns; you are plain ${ch.firstName} ${ch.lastName} now.`
        : `You renounced your place in the line of succession and every royal title, for yourself and your descendants. No grant, no household — and no duties. You are plain ${ch.firstName} ${ch.lastName}.`, '📜', 'milestone');
      return undefined;
    },
  },
  resolvers: {
    referendum(ctx, data, optionId) {
      const push = { yes: 0.002, no: -0.002, campaignYes: 0.02, campaignNo: -0.02, skip: 0 }[optionId] ?? 0;
      if (optionId.startsWith('campaign')) { ctx.stat('stress', 3); ctx.log(`You campaigned ${optionId === 'campaignYes' ? 'for a republic' : 'for the Crown'}.`, '📣'); }
      resolveReferendum(ctx, data.cc, push);
    },
    crisis(ctx, data, optionId) {
      const { state, rng } = ctx;
      const k = CRISES[data.id];
      const opt = k?.options.find((o) => o.id === optionId);
      if (!opt) return;
      const good = rng.chance(opt.good);
      state.world.crises = [...(state.world.crises ?? []).slice(-5), { year: currentYear(state), cc: state.character.countryId, id: data.id, choice: optionId, you: true }];
      const o = state.politics?.office;
      if (o) o.approval = Math.round(clamp(o.approval + (good ? 8 : -15), 0, 100));
      if (state.royal?.reigning) state.royal.popularity = Math.round(clamp(state.royal.popularity + (good ? 6 : -12), 0, 100));
      ctx.log(`${k.title}: ${opt.note} ${good ? 'History is likely to judge you kindly.' : 'You will be argued about for decades.'}`, '⚖️', good ? 'good' : 'warn');
      // A Governor-General who badly misjudges it is recalled.
      if (!good && o && /_gg$/.test(o.id) && rng.chance(0.35)) ctx.emit('politics:leave', { reason: 'Recalled after a constitutional crisis' });
    },
    press(ctx, data, optionId) {
      const r = ctx.state.royal;
      if (!r) return;
      const d = { sue: 2, ignore: 1, apologize: 1, silence: -2, lead: 6, quiet: 2, accept: ctx.rng.chance(0.4) ? 8 : -15, decline: 0 }[optionId] ?? 0;
      r.popularity = Math.round(clamp(r.popularity + d, 0, 100));
      if (optionId === 'sue') ctx.spend(80000, 'Legal fees: privacy claim', { allowDebt: true });
      ctx.log(`${{ sue: 'You sued. The paper settled.', ignore: 'You let it pass.', apologize: 'The palace apologised on your behalf.', silence: 'The palace said nothing. The story ran for a week.', lead: 'You led the campaign; it became a national cause.', quiet: 'You helped behind the scenes.', accept: d > 0 ? 'The interview made you a sympathetic figure.' : 'The interview was a disaster for the family.', decline: 'You declined.' }[optionId] ?? ''} Popularity ${r.popularity}%.`, '📰', d >= 0 ? 'info' : 'warn');
    },
    duty(ctx, data, optionId) {
      const r = ctx.state.royal;
      if (!r) return;
      const d = { read: 1, pause: ctx.rng.chance(0.5) ? 3 : -4, encourage: 1, warn: 0, listen: 2, host: -1, cool: 2, long: 5, short: 1 }[optionId] ?? 0;
      r.popularity = Math.round(clamp(r.popularity + d, 0, 100));
      if (optionId === 'long') ctx.stat('stress', 6);
      ctx.log(`The Crown's business: ${optionId}. Popularity ${r.popularity}%.`, '👑');
    },
  },
};
