/**
 * The Holy See: the Pope, the College of Cardinals, the Curia and the Vatican's own services.
 *
 *   The Pope       Elected by the cardinals under 80 in a conclave in the Sistine Chapel (two
 *                  thirds of the votes). Reigns for life — or renounces, as Benedict XVI did in
 *                  2013, and becomes Pope Emeritus. Styled His Holiness.
 *   Cardinals      Created by the Pope in a consistory: archbishops of the great sees, the
 *                  Prefects of the Curia, the Secretary of State. Styled His Eminence.
 *   Careers        (career/IntlOrgCareers.js) the Roman Curia, the Holy See's diplomatic service
 *                  (nunciatures; nuncios are titular archbishops), the Pontifical Swiss Guard and
 *                  the Vatican Gendarmerie.
 *   Honours        The pontifical orders and decorations: the Supreme Order of Christ (Catholic
 *                  heads of state, almost never given), the Order of Pius IX (heads of state and
 *                  diplomats), the Order of St Gregory the Great, the Order of St Sylvester, the
 *                  Pro Ecclesia et Pontifice cross and the Benemerenti medal (every Swiss Guard
 *                  after three years).
 *
 * state.world.holySee = { pope: { name, born, since, you }, names: { Leo: 14, … }, conclaves: [{ year, elected }] }
 * state.holySee       = { cardinal: { since } | null, pope: { name, since } | null, emeritus, favour,
 *                         consistories, journeys, encyclicals, canonized, popularity }
 */
import { addHonor, currentYear, yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp, Random } from '../../core/Random.js';
import { ordainedPriest } from '../career/IntlOrgCareers.js';
import { leaveJob, hire } from '../career/CareerEngine.js';
import { getProfession } from '../career/JobTrees.js';
import { createEmployer } from '../career/Employers.js';
import { postAbroad, endPosting } from './Posting.js';
import { eminence } from './Honours.js';
import { OFFICES } from '../politics/Offices.js';

const NAMES = { Leo: 14, John: 23, Paul: 6, Benedict: 16, Pius: 12, Gregory: 16, Clement: 14, Innocent: 13, Francis: 1, Celestine: 5, 'John Paul': 2, Sixtus: 5, Urban: 8, Adrian: 6 };
const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const roman = (n) => ROMAN.reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, '');
/** "Pius XIII", "Francis II"; a name never used before stands alone ("Peter" excepted, by custom). */
const regnal = (names, name) => (names[name] ? `${name} ${roman(names[name] + 1)}` : name);
const catholic = (state) => ['catholic', 'tradCatholic'].includes(state.community?.faith?.traditionId);

export function holySeeOf(state) {
  state.world ??= {};
  const year = currentYear(state);
  state.world.holySee ??= { pope: { name: 'Leo XIV', born: 1955, since: Math.min(year, 2025) }, names: { ...NAMES }, conclaves: [] };
  return state.world.holySee;
}
const me = (state) => (state.holySee ??= { cardinal: null, pope: null, favour: 0, consistories: 0, journeys: 0, encyclicals: 0, canonized: 0, popularity: 70 });

export const isPope = (state) => Boolean(state.holySee?.pope);
export const isCardinal = (state) => Boolean(state.holySee?.cardinal) || (state.career.job?.professionId === 'catholicClergy' && state.career.job.levelId === 'cardinal');
export const isElector = (state) => isCardinal(state) && !isPope(state) && state.character.age < 80;

/** How a conclave looks at you: the Secretary of State and the Prefects first, then the great sees. */
export function papabile(state) {
  const job = state.career.job;
  const hs = state.holySee ?? {};
  let s = 0.03;
  if (job?.professionId === 'holySeeDiplomacy' && job.levelId === 'secState') s += 0.15;
  if (job?.professionId === 'romanCuria' && job.levelId === 'prefect') s += 0.08;
  if (job?.professionId === 'catholicClergy' && ['archbishop', 'cardinal'].includes(job.levelId) && job.employer?.size === 'enterprise') s += 0.05;
  s += Math.min(0.06, (state.character.age - (hs.cardinal?.since ?? state.character.age)) * 0.006);
  s += (state.stats.smarts - 50) / 1000;
  s += state.character.age >= 60 && state.character.age <= 76 ? 0.03 : -0.03;
  s += Math.min(0.05, (hs.favour ?? 0) * 0.01);
  return clamp(s, 0.01, 0.3);
}

/** The papal style, and those of cardinals, nuncios and the Curia's archbishops (null for none). */
export function holySeeStyledName(state) {
  const c = state.character;
  const hs = state.holySee;
  if (hs?.pope) return `His Holiness Pope ${hs.pope.name}`;
  if (hs?.emeritus) return `His Holiness Pope Emeritus ${hs.emeritus}`;
  if (isCardinal(state)) return `His Eminence ${c.firstName} Cardinal ${c.lastName}`;
  const job = state.career.job;
  if (job?.professionId === 'holySeeDiplomacy' && (job.grade ?? 0) >= 8) return `His Excellency Archbishop ${c.firstName} ${c.lastName}`;
  if (job?.professionId === 'romanCuria' && ['secretary', 'prefect'].includes(job.levelId) && ordainedPriest(state)) return `His Excellency Archbishop ${c.firstName} ${c.lastName}`;
  if (job?.professionId === 'catholicClergy' && ['auxBishop', 'bishop', 'archbishop'].includes(job.levelId)) return `The Most Reverend ${c.firstName} ${c.lastName}`;
  return null;
}

function makeCardinal(ctx, why) {
  const { state } = ctx;
  const hs = me(state);
  if (hs.cardinal) return;
  hs.cardinal = { since: state.character.age };
  addHonor(state, { id: 'holySee.cardinal', source: 'civil', name: 'Cardinal of the Holy Roman Church', icon: '🟥', ribbon: ['#c8102e', '#c8102e', '#c8102e'], prestige: 30, precedence: 2, citation: why });
  ctx.log(`${why} The Pope placed the red biretta on your head: "red as a sign of the dignity of the office of a cardinal, signifying your readiness to act with courage, even to the shedding of your blood".`, '🟥', 'honor');
}

/* ------------------------------------------------------------------ */
/* Conclaves                                                           */
/* ------------------------------------------------------------------ */

function electNpc(ctx, why) {
  const { state, rng } = ctx;
  const w = holySeeOf(state);
  const base = rng.pick(Object.keys(w.names));
  const name = regnal(w.names, base);
  w.names[base] = (w.names[base] ?? 0) + 1;
  const year = currentYear(state);
  w.pope = { name, born: year - rng.int(62, 78), since: year };
  w.conclaves.push({ year, elected: name });
  if (catholic(state) || isCardinal(state)) ctx.log(`${why} Habemus papam: after ${rng.int(2, 5)} days in the Sistine Chapel the conclave elected ${rng.pick(['the Patriarch of', 'the Archbishop of', 'the Cardinal Prefect from'])} ${rng.pick(['Lisbon', 'Manila', 'Kinshasa', 'Bologna', 'Boston', 'Budapest', 'São Paulo', 'Colombo', 'Marseille', 'Vienna'])}, who took the name ${name}.`, '🕊️', 'milestone');
}

function vacancy(ctx, why) {
  const { state } = ctx;
  if (isElector(state) && !state.prompts.some((p) => p.type === 'holySee.conclave')) {
    const odds = papabile(state);
    ctx.prompt({
      type: 'holySee.conclave', icon: '🗝️', title: 'Extra Omnes',
      text: `${why} You are summoned to Rome. The cardinal electors process into the Sistine Chapel, swear the oath, and the doors are shut. Your name is ${odds >= 0.12 ? 'on every list of papabili' : odds >= 0.06 ? 'mentioned among the outsiders' : 'not one the papers mention'}.`,
      options: [
        { id: 'candidate', label: '🕊️ Let your name be considered', hint: `~${Math.round(Math.min(0.45, odds * 1.8) * 100)}% — "who enters a conclave as pope leaves a cardinal"` },
        { id: 'kingmaker', label: '🗳️ Rally votes behind the front-runner', hint: 'The new pope will remember it' },
        { id: 'conscience', label: '🙏 Vote your conscience', hint: `~${Math.round(odds * 100)}%` },
      ],
      data: { why, odds },
    });
    return;
  }
  electNpc(ctx, why);
}

/** The NPC pope's year: death or (rarely) renunciation opens the see. */
function popeYear(ctx) {
  const { state, rng } = ctx;
  const w = holySeeOf(state);
  if (w.pope.you || isPope(state)) return;
  const age = currentYear(state) - w.pope.born;
  const die = age < 75 ? 0.015 : 0.04 + (age - 75) * 0.012;
  if (rng.chance(die)) return vacancy(ctx, `Pope ${w.pope.name} has died. The bells of St Peter's tolled; the Camerlengo declared the see vacant.`);
  if (age >= 85 && rng.chance(0.03)) return vacancy(ctx, `Pope ${w.pope.name} renounced the papacy, citing his age. The see is vacant.`);
  return undefined;
}

export function becomePope(ctx, name) {
  const { state } = ctx;
  const hs = me(state);
  const w = holySeeOf(state);
  const year = currentYear(state);
  const base = name.replace(/ [IVXLCDM]+$/, '');
  w.names[base] = (w.names[base] ?? 0) + 1;
  w.pope = { name, born: state.character.birthYear ?? year - state.character.age, since: year, you: true };
  w.conclaves.push({ year, elected: name, you: true });
  hs.pope = { name, since: state.character.age };
  hs.popularity = 75;
  makeCardinal(ctx, 'Cardinal.');
  const job = state.career.job;
  if (job) {
    job.pope = true;
    job.title = `Pope ${name}`;
    job.titleMap = { ...(job.titleMap ?? {}), [job.levelId]: job.title };
    job.employer.name = 'The Holy See';
    job.stationUntil = 999;
  }
  endPosting(ctx);
  postAbroad(ctx, { place: 'Vatican City', country: 'Vatican City', kind: 'mission', years: 99 });
  addHonor(state, { id: 'catholic.pope', source: 'civil', name: 'Supreme Pontiff', icon: '🇻🇦', ribbon: ['#ffe000', '#ffffff', '#ffe000'], prestige: 100, precedence: 1, citation: `Elected Bishop of Rome, taking the name ${name}.` });
  ctx.stat('happiness', 15);
  ctx.log(`White smoke over the Sistine Chapel. The conclave elected you Bishop of Rome, Vicar of Jesus Christ, Successor of the Prince of the Apostles, Supreme Pontiff of the Universal Church and Sovereign of the Vatican City State. You took the name ${name}, stepped out onto the loggia and blessed the city and the world.`, '🇻🇦', 'milestone');
}

/* ------------------------------------------------------------------ */
/* Consistories: who gets a red hat                                    */
/* ------------------------------------------------------------------ */

/** Family and friends a pope can honour. */
export const papalHonourOptions = (state) => (state.people?.list ?? []).filter((p) => p.alive !== false && !p.papalOrder && ['sibling', 'friend', 'bestFriend', 'mentor', 'mother', 'father'].includes(p.relation)).slice(0, 8);

/** The Secretariat of State and the dicasteries need cardinals: an offer to a cardinal without a Roman post. */
function romanOffer(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!isCardinal(state) || isPope(state) || state.character.age >= 78 || ['romanCuria', 'holySeeDiplomacy'].includes(job?.professionId) || state.prompts.some((p) => p.type === 'holySee.roman') || !rng.chance(0.06 + (state.holySee?.favour ?? 0) * 0.01)) return;
  const secState = rng.chance(0.25);
  ctx.prompt({
    type: 'holySee.roman', icon: '🇻🇦', title: secState ? 'The Secretariat of State' : 'A Call to Rome',
    text: secState ? 'The Pope asks you to become Cardinal Secretary of State: the Church\'s prime minister and foreign minister.' : 'The Pope asks you to come to Rome as Prefect of a Dicastery of the Roman Curia.',
    options: [{ id: 'accept', label: '🇻🇦 Accept' }, { id: 'decline', label: '🙏 Ask to stay where you are' }],
    data: { secState },
  });
}

function consistory(ctx) {
  const { state, rng } = ctx;
  if (isPope(state) || isCardinal(state) || !ordainedPriest(state) || !rng.chance(0.4)) return;
  const job = state.career.job;
  const p = job?.professionId;
  const odds = p === 'holySeeDiplomacy' ? { secState: 1, relations: 0.25, nuncio: (job.yearsInRole ?? job.yearsAtEmployer ?? 0) >= 6 ? 0.06 : 0 }[job.levelId] ?? 0
    : p === 'romanCuria' ? { prefect: 0.6, secretary: 0.08 }[job.levelId] ?? 0
      : p === 'catholicClergy' ? { archbishop: job.employer?.size === 'enterprise' ? 0.3 : 0.1 }[job.levelId] ?? 0 : 0;
  if (!odds || !rng.chance(clamp(odds + (state.holySee?.favour ?? 0) * 0.02, 0, 1))) return;
  makeCardinal(ctx, `At a consistory in St Peter's Basilica, Pope ${holySeeOf(state).pope.name} created you a cardinal.`);
}

/* ------------------------------------------------------------------ */
/* Pontifical honours                                                  */
/* ------------------------------------------------------------------ */

export const PAPAL_ORDERS = {
  christ: { name: 'Supreme Order of Christ', tiers: ['Knight of the Supreme Order of Christ'], prestige: [60] },
  pius: { name: 'Order of Pius IX', tiers: ['Knight', 'Commander', 'Commander with Star', 'Knight Grand Cross'], prestige: [10, 14, 18, 26] },
  gregory: { name: 'Order of St Gregory the Great', tiers: ['Knight', 'Commander', 'Commander with Star', 'Knight Grand Cross'], female: ['Dame', 'Dame Commander', 'Dame Commander with Star', 'Dame Grand Cross'], prestige: [8, 12, 16, 22] },
  sylvester: { name: 'Order of St Sylvester', tiers: ['Knight', 'Commander', 'Commander with Star', 'Knight Grand Cross'], female: ['Dame', 'Dame Commander', 'Dame Commander with Star', 'Dame Grand Cross'], prestige: [6, 9, 12, 16] },
  proEcclesia: { name: 'Pro Ecclesia et Pontifice', tiers: ['Cross Pro Ecclesia et Pontifice'], prestige: [6] },
  benemerenti: { name: 'Benemerenti Medal', tiers: ['Benemerenti Medal'], prestige: [3] },
};
const papalTier = (state, id) => state.honors.find((h) => h.id === `holySee.${id}`)?.tier ?? -1;
function confer(ctx, id, tier, citation) {
  const { state } = ctx;
  const o = PAPAL_ORDERS[id];
  if (papalTier(state, id) >= tier) return;
  const female = state.character.gender === 'female';
  const grade = (female && o.female ? o.female : o.tiers)[tier];
  const name = o.tiers.length === 1 ? o.name : `${grade} of the ${o.name}`;
  state.honors = state.honors.filter((h) => h.id !== `holySee.${id}`);
  addHonor(state, { id: `holySee.${id}`, tier, source: 'foreign', from: 'the Holy See', name, icon: '🇻🇦', ribbon: ['#ffe000', '#ffffff', '#ffe000'], prestige: o.prestige[tier], precedence: 9, citation });
  ctx.log(`The Holy See conferred on you the ${name}. ${citation}`, '🇻🇦', 'honor');
}
const yearsIn = (state, ids) => (state.career.history ?? []).filter((h) => ids.includes(h.professionId)).reduce((s, h) => s + Math.max(0, (h.endAge ?? 0) - (h.startAge ?? 0)), 0) + (ids.includes(state.career.job?.professionId) ? state.career.job.yearsAtEmployer ?? 0 : 0);

function papalHonours(ctx) {
  const { state, rng } = ctx;
  if (!catholic(state) || state.character.age < 21 || isPope(state)) return;
  const job = state.career.job;
  // Every Swiss Guard receives the Benemerenti after three years (and the Gendarmerie's long servers).
  if (yearsIn(state, ['swissGuard']) >= 3) confer(ctx, 'benemerenti', 0, 'For three years\' faithful service in the Pontifical Swiss Guard.');
  if (yearsIn(state, ['vaticanGendarmerie', 'romanCuria']) >= 10) confer(ctx, 'benemerenti', 0, 'For long service to the Holy See.');
  const devout = state.community?.faith?.attendance === 'devout';
  const em = eminence(state);
  const serving = yearsIn(state, ['romanCuria', 'holySeeDiplomacy', 'swissGuard', 'vaticanGendarmerie', 'maltaRelief', 'maltaDiplomacy']);
  // Commanders of the Guard and the Gendarmerie, lay heads of the Curia: the Order of Pius IX.
  if (job && (['commandant'].includes(job.levelId) && ['swissGuard', 'vaticanGendarmerie'].includes(job.professionId) || (job.professionId === 'romanCuria' && ['secretary', 'prefect'].includes(job.levelId) && !ordainedPriest(state))) && rng.chance(0.3)) confer(ctx, 'pius', job.levelId === 'prefect' ? 2 : 1, 'For service at the head of an office of the Holy See.');
  // Catholic heads of state on a state visit to the Vatican.
  const o = state.politics?.office;
  const head = o && OFFICES[o.id] && (OFFICES[o.id].headOfState || (OFFICES[o.id].leader && (OFFICES[o.id].level ?? 0) >= 5));
  if (head && rng.chance(0.12)) {
    if (rng.chance(0.05) && papalTier(state, 'christ') < 0) confer(ctx, 'christ', 0, 'Conferred on a Catholic head of state, on a state visit to the Vatican.');
    else confer(ctx, 'pius', 3, 'Conferred on a state visit to the Vatican.');
  }
  // Lay Catholics of distinction or long service to the Church.
  if (rng.chance(0.06)) {
    const score = em + serving * 8 + (devout ? 40 : 0) + (state.malta?.grade ? 40 : 0) + (state.community?.volunteerYears ?? 0) * 3;
    if (score >= 420) confer(ctx, 'gregory', 3, 'For service to the Church and to society of the highest distinction.');
    else if (score >= 320) confer(ctx, 'gregory', 2, 'For outstanding service to the Church and to society.');
    else if (score >= 240) confer(ctx, 'gregory', papalTier(state, 'gregory') >= 0 ? 1 : 0, 'For service to the Church and to society.');
    else if (score >= 170) confer(ctx, 'sylvester', score >= 200 ? 1 : 0, 'For dedication to the Church as a lay Catholic.');
    else if (score >= 110 && state.character.age >= 40) confer(ctx, 'proEcclesia', 0, 'For distinguished service to the Church, on your bishop\'s recommendation.');
    else if (score >= 70 && state.character.age >= 45) confer(ctx, 'benemerenti', 0, 'For long service to your parish and diocese.');
  }
}

/* ------------------------------------------------------------------ */
/* The Swiss Guard                                                     */
/* ------------------------------------------------------------------ */

function guardYear(ctx) {
  const { state } = ctx;
  const job = state.career.job;
  if (job?.professionId !== 'swissGuard') return;
  const married = (state.people?.list ?? []).some((p) => p.alive !== false && p.relation === 'spouse');
  const years = job.yearsAtEmployer ?? 0;
  // A guard may marry after three years, once a corporal and at least 25.
  if (married && (years < 3 || (job.grade ?? 0) < 4 || state.character.age < 25) && !job.marriageWarned) {
    job.marriageWarned = true;
    ctx.log('You married before the Guard allows it (three years\' service, a corporal\'s rank, 25). The Commandant accepted your resignation.', '⚔️', 'warn');
    leaveJob(ctx, 'Married without the Commandant\'s permission');
    return;
  }
  if (years === 0 && !job.sworn) {
    job.sworn = true;
    ctx.log('On 6 May, the anniversary of the Sack of Rome, you swore the oath in the San Damaso Courtyard, raising three fingers: "…faithfully, loyally and honourably to serve the reigning Pope… even, if necessary, to sacrifice my life for him."', '⚔️', 'milestone');
  }
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

const JOURNEYS = ['Manila', 'Kinshasa', 'Mexico City', 'Seoul', 'Lisbon', 'Jakarta', 'Nairobi', 'São Paulo', 'Kraków', 'Dublin', 'Buenos Aires', 'Beirut', 'Ulaanbaatar', 'Port Moresby'];

export const HolySeeModule = {
  id: 'holySee',
  order: 61,
  init(state) { holySeeOf(state); },
  setup(engine) {
    // A pope reigns until death: the bells toll, the see falls vacant, the cardinals meet.
    engine.bus.on('life:ended', ({ ctx }) => {
      const { state } = ctx;
      if (!state.holySee?.pope) return;
      const name = state.holySee.pope.name;
      state.holySee.diedPope = name;
      state.holySee.pope = null;
      holySeeOf(state).pope.you = false;
      electNpc(ctx, `Pope ${name} died. The Camerlengo confirmed the death, the Fisherman's Ring was broken, and you lay in state in St Peter's while the cardinals gathered.`);
    });
  },
  onAgeUp(engineCtx) {
    // A side stream, so the world's church affairs don't reshuffle every other roll in the life.
    const { state } = engineCtx;
    const rng = new Random(((state.world?.seed ?? 1) * 40503 + currentYear(state) * 131 + 0x5ee) >>> 0);
    const ctx = { ...engineCtx, rng };
    if (!state.character.alive) return;
    const hs = state.holySee;
    const job = state.career.job;
    // A cardinal by promotion (or the Secretary of State, always one).
    if (!hs?.cardinal && ((job?.professionId === 'catholicClergy' && job.levelId === 'cardinal') || (job?.professionId === 'holySeeDiplomacy' && job.levelId === 'secState'))) makeCardinal(ctx, `Pope ${holySeeOf(state).pope.name} created you a cardinal.`);
    consistory(ctx);
    romanOffer(ctx);
    popeYear(ctx);
    guardYear(ctx);
    papalHonours(ctx);
    if (isPope(state)) {
      if (job) job.performance = 100;
      hs.popularity = Math.round(clamp((hs.popularity ?? 70) + (65 - (hs.popularity ?? 70)) * 0.15 + rng.int(-3, 3), 0, 100));
      if (state.character.age >= 85) ctx.stat('health', -rng.int(1, 4));
    }
  },
  actions: {
    /** The Pope's teaching: an encyclical letter to the whole Church. */
    encyclical(ctx) {
      const { state, rng } = ctx;
      if (!isPope(state)) return ctx.toast('Only the Pope', 'warn');
      if (yearlyCount(state, 'holySee.encyclical')) return ctx.toast('One a year', 'warn');
      bumpYearly(state, 'holySee.encyclical');
      const hs = state.holySee;
      hs.encyclicals += 1;
      const t = rng.pick(['Laudato', 'Caritas in Opere', 'Fides et Lumen', 'Dignitas Laboris', 'Pacem in Mundo', 'Spes Nova', 'De Machinis et Homine']);
      hs.popularity = clamp(hs.popularity + rng.int(-2, 6), 0, 100);
      ctx.stat('smarts', 2);
      return ctx.log(`You published the encyclical ${t}. It was read from pulpits across the world — and argued over in every newspaper.`, '📜', 'milestone');
    },
    /** An apostolic journey: Masses for a million, meetings with presidents. */
    journey(ctx) {
      const { state, rng } = ctx;
      if (!isPope(state)) return ctx.toast('Only the Pope', 'warn');
      if (yearlyCount(state, 'holySee.journey') >= 2) return ctx.toast('Two journeys a year', 'warn');
      bumpYearly(state, 'holySee.journey');
      const hs = state.holySee;
      hs.journeys += 1;
      hs.popularity = clamp(hs.popularity + rng.int(2, 7), 0, 100);
      ctx.stat('happiness', 5);
      if (state.character.age >= 80) ctx.stat('health', -rng.int(2, 6));
      return ctx.log(`On an apostolic journey to ${rng.pick(JOURNEYS)} you celebrated Mass for ${(rng.int(4, 40) / 10).toFixed(1)} million people. The Gendarmerie and the Swiss Guard never left your side.`, '✈️', 'good');
    },
    /** Raise a holy man or woman to the altars. */
    canonize(ctx) {
      const { state, rng } = ctx;
      if (!isPope(state)) return ctx.toast('Only the Pope', 'warn');
      if (yearlyCount(state, 'holySee.canonize')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'holySee.canonize');
      state.holySee.canonized += 1;
      return ctx.log(`In St Peter's Square you canonized ${rng.pick(['a nineteenth-century missionary nun', 'a martyred lay catechist', 'a teenage computer programmer', 'a founder of hospitals for the poor', 'a parish priest who hid refugees in the war'])}. The square was full.`, '😇', 'good');
    },
    /** Confer a papal order on someone close to you (arg: person id). */
    honour(ctx, personId) {
      const { state } = ctx;
      if (!isPope(state)) return ctx.toast('Only the Pope', 'warn');
      if (yearlyCount(state, 'holySee.honour') >= 3) return ctx.toast('Three a year', 'warn');
      const p = papalHonourOptions(state).find((x) => x.id === personId);
      if (!p) return undefined;
      bumpYearly(state, 'holySee.honour');
      const order = p.relation === 'mentor' || p.relation === 'friend' || p.relation === 'bestFriend' ? 'Order of St Gregory the Great' : 'Order of Pius IX';
      p.papalOrder = order;
      p.relationship = Math.min(100, (p.relationship ?? 50) + 8);
      return ctx.log(`You made ${p.firstName} ${p.lastName} a ${p.gender === 'female' ? 'Dame' : 'Knight'} of the ${order}.`, '🇻🇦', 'good');
    },
    /** A cardinal's quiet campaign: dinners, visits, a well-placed lecture. */
    cultivate(ctx) {
      const { state, rng } = ctx;
      if (!isCardinal(state) || isPope(state)) return ctx.toast('Cardinals only', 'warn');
      if (yearlyCount(state, 'holySee.cultivate')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'holySee.cultivate');
      const hs = me(state);
      if (rng.chance(0.15)) {
        hs.favour = Math.max(0, (hs.favour ?? 0) - 2);
        return ctx.log('An Italian newspaper ran a story about your "campaign" for the papacy. Nothing hurts a papabile more than looking ambitious.', '📰', 'bad');
      }
      hs.favour = (hs.favour ?? 0) + 1;
      return ctx.log(rng.pick(['You hosted dinners for visiting cardinals at your apartment near the Vatican.', 'You gave a lecture in Rome that was quoted approvingly by the Secretariat of State.', 'You travelled to the peripheries and made friends among the cardinals there.']), '🟥', 'good');
    },
    /** Create new cardinals: the men who will choose your successor. */
    consistory(ctx) {
      const { state, rng } = ctx;
      if (!isPope(state)) return ctx.toast('Only the Pope', 'warn');
      if (state.character.age - (state.holySee.lastConsistory ?? -9) < 2) return ctx.toast('Every two years or so', 'warn');
      state.holySee.lastConsistory = state.character.age;
      state.holySee.consistories += 1;
      return ctx.log(`You held a consistory and created ${rng.int(12, 21)} new cardinals, many from the peripheries: the College that will elect your successor looks more like you.`, '🟥', 'milestone');
    },
    /** Renounce the Petrine ministry and retire to prayer as Pope Emeritus. */
    renounce(ctx) {
      const { state } = ctx;
      if (!isPope(state)) return ctx.toast('Only the Pope', 'warn');
      const hs = state.holySee;
      const name = hs.pope.name;
      hs.emeritus = name;
      hs.pope = null;
      holySeeOf(state).pope.you = false;
      if (state.career.job) leaveJob(ctx, 'Renounced the papacy');
      endPosting(ctx);
      postAbroad(ctx, { place: 'Vatican City', country: 'Vatican City', kind: 'mission', years: 99 });
      ctx.stat('stress', -20);
      ctx.log(`You renounced the ministry of Bishop of Rome. A helicopter carried you to Castel Gandolfo; the Swiss Guard stood down at 8 p.m. You will live out your days in prayer as Pope Emeritus ${name}.`, '🕊️', 'milestone');
      electNpc(ctx, 'The see was vacant.');
      return undefined;
    },
  },
  resolvers: {
    roman(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId !== 'accept') return ctx.log('You asked to stay with your people. The Pope understood.', '🙏');
      const prof = getProfession(data.secState ? 'holySeeDiplomacy' : 'romanCuria');
      const employer = createEmployer(rng, state, prof, state.character.regionId);
      employer.name = prof.employers[0];
      const job = hire(ctx, { professionId: prof.id, levelId: data.secState ? 'secState' : 'prefect', employer });
      if (!job) return undefined;
      return ctx.log(data.secState ? 'You moved into the Apostolic Palace as Cardinal Secretary of State.' : 'You moved to Rome as Cardinal Prefect of a Dicastery.', '🇻🇦', 'milestone');
    },
    conclave(ctx, data, optionId) {
      const { state, rng } = ctx;
      const hs = me(state);
      const odds = optionId === 'candidate' ? Math.min(0.45, data.odds * 1.8) : optionId === 'kingmaker' ? data.odds * 0.3 : data.odds;
      if (rng.chance(odds)) {
        const w = holySeeOf(state);
        const pool = rng.shuffle(Object.keys(w.names)).slice(0, 3);
        return ctx.prompt({
          type: 'holySee.name', icon: '🇻🇦', title: 'Acceptasne electionem?',
          text: 'On the fifth ballot the count passes two thirds — and it is your name. The Dean asks: do you accept your canonical election as Supreme Pontiff? And by what name do you wish to be called?',
          options: [...pool.map((n) => ({ id: regnal(w.names, n), label: `🕊️ ${regnal(w.names, n)}` })), { id: 'Peter II', label: '🗝️ Peter II', hint: 'No pope has dared', tone: 'danger' }],
          data: {},
        });
      }
      if (optionId === 'kingmaker') hs.favour = (hs.favour ?? 0) + 2;
      electNpc(ctx, optionId === 'candidate' ? 'Your supporters held for three ballots, then drifted away.' : 'You cast your ballots under Michelangelo\'s Last Judgement.');
      return undefined;
    },
    name(ctx, data, optionId) {
      return becomePope(ctx, optionId);
    },
  },
};
