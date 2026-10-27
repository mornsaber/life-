/**
 * Holy orders: ordination is who you are, not a job you hold. A deacon, priest or bishop stays
 * one after resigning a parish, taking a sabbatical, or serving the Holy See; returning to
 * ministry picks up where you were, not at the seminary door. Only laicization (or, for
 * Protestant ministers, giving up your credentials) ends it.
 *
 *   Catholic     deacon → priest → bishop. Vatican service is a priest's assignment: the
 *                Pontifical Ecclesiastical Academy and the nunciatures, the dicasteries of the
 *                Curia. A nuncio and a Curia secretary are ordained bishops (titular
 *                archbishops); when the service ends, a priest or bishop goes back to the
 *                diocese they belong to.
 *   Anglican     deacon → priest → bishop.
 *   Other faiths ordained (or licensed) minister.
 *
 * state.community.orders = { tradition, grade: 'deacon'|'priest'|'bishop'|'minister', since, diocese, laicized }
 */
import { clamp } from '../../core/Random.js';
import { getProfession } from '../career/JobTrees.js';
import { createEmployer } from '../career/Employers.js';
import { hire } from '../career/CareerEngine.js';

const GRADE_RANK = { minister: 1, deacon: 1, priest: 2, bishop: 3 };
/** What each clergy level means in holy orders. */
const ORDER_OF = {
  catholicClergy: { deacon: 'deacon', vicar: 'priest', pastor: 'priest', monsignor: 'priest', vicarGeneral: 'priest', auxBishop: 'bishop', bishop: 'bishop', archbishop: 'bishop', cardinal: 'bishop' },
  anglicanClergy: { deacon: 'deacon', curate: 'priest', vicar: 'priest', canon: 'priest', ruralDean: 'priest', archdeacon: 'priest', dean: 'priest', suffragan: 'bishop', bishop: 'bishop', archbishop: 'bishop' },
  clergy: { associate: 'minister', minister: 'minister', chaplain: 'minister', senior: 'minister', regional: 'minister' },
  holySeeDiplomacy: { nuncio: 'bishop', relations: 'bishop', secState: 'bishop' },
  romanCuria: { secretary: 'bishop', prefect: 'bishop' },
};
const CATHOLIC = ['catholic', 'tradCatholic'];
export const CLERGY_CAREERS = ['clergy', 'catholicClergy', 'anglicanClergy'];

export const ordersOf = (state) => {
  const o = state.community?.orders;
  return o && !o.laicized ? o : null;
};
export const isOrdained = (state, grade = 'deacon') => {
  const o = ordersOf(state);
  return Boolean(o && GRADE_RANK[o.grade] >= GRADE_RANK[grade]);
};
export const catholicPriest = (state) => {
  const o = ordersOf(state);
  return Boolean(o && CATHOLIC.includes(o.tradition) && GRADE_RANK[o.grade] >= 2);
};

/** Which clergy career is yours: the one your tradition ordains through. */
export function clergyCareerFor(traditionId) {
  if (CATHOLIC.includes(traditionId)) return 'catholicClergy';
  if (traditionId === 'anglican') return 'anglicanClergy';
  return 'clergy';
}

/** Raise your orders to what your post needs (never lowers them). */
export function syncOrders(ctx) {
  const { state } = ctx;
  const job = state.career?.job;
  const grade = ORDER_OF[job?.professionId]?.[job?.levelId];
  if (!grade) return null;
  // A lay official in the Curia isn't ordained by taking the post.
  if (['holySeeDiplomacy', 'romanCuria'].includes(job.professionId) && !catholicPriest(state)) return null;
  const tradition = job.tradition ?? state.community?.faith?.traditionId ?? null;
  const o = state.community.orders;
  if (o && !o.laicized && GRADE_RANK[o.grade] >= GRADE_RANK[grade]) return o;
  const before = o && !o.laicized ? o.grade : null;
  state.community.orders = { tradition, grade, since: state.character.age, diocese: o?.diocese ?? (CLERGY_CAREERS.includes(job.professionId) ? job.employer?.name ?? null : null), laicized: false };
  if (before && grade === 'bishop' && ['holySeeDiplomacy', 'romanCuria'].includes(job.professionId)) {
    ctx.log(`You were ordained a bishop in St Peter's Basilica: titular Archbishop of ${ctx.rng.pick(['Aquileia', 'Carthage', 'Hippo', 'Thessalonica', 'Nicaea', 'Caesarea'])}, as befits ${job.title}.`, '⛪', 'milestone');
  } else if (!before && grade !== 'deacon') ctx.log(`You were ordained ${grade === 'minister' ? 'to the ministry' : `a ${grade}`}.`, '⛪', 'milestone');
  return state.community.orders;
}

/**
 * Coming back to ministry after time away: the level your orders (and your last post) entitle
 * you to, instead of the seminary. Null if you aren't ordained in this career's tradition.
 */
export function ordainedEntryLevel(state, profession) {
  const o = ordersOf(state);
  if (!o || !CLERGY_CAREERS.includes(profession.id) || clergyCareerFor(o.tradition) !== profession.id) return null;
  const last = [...(state.career.history ?? [])].reverse().find((h) => h.professionId === profession.id);
  const map = ORDER_OF[profession.id];
  const lastLevel = profession.levels.find((l) => l.id === last?.levelId);
  // Back at the grade you left, as long as your orders cover it (a bishop isn't a curate again).
  if (lastLevel && map[lastLevel.id] === o.grade) return lastLevel;
  const fits = profession.levels.filter((l) => map[l.id] === o.grade);
  // A bishop is given a diocese of his own; a priest a parish.
  return fits.find((l) => ['bishop', 'pastor', 'vicar', 'minister'].includes(l.id)) ?? fits[0] ?? null;
}

export const HolyOrdersModule = {
  id: 'holyOrders',
  order: 38,
  init(state) {
    state.community ??= {};
    state.community.orders ??= null;
  },
  setup(engine) {
    engine.bus.on('career:hired', ({ ctx }) => syncOrders(ctx));
    // Vatican service ends: a priest or bishop goes home to the diocese.
    engine.bus.on('career:separated', ({ ctx, job }) => {
      const { state } = ctx;
      if (!['holySeeDiplomacy', 'romanCuria'].includes(job?.professionId) || !catholicPriest(state) || state.character.age >= 75) return;
      if (state.prompts.some((p) => p.type === 'holyOrders.return')) return;
      const o = ordersOf(state);
      ctx.prompt({ type: 'holyOrders.return', icon: '⛪', title: 'Back to the Diocese', text: `Your service to the Holy See is over. ${o.diocese ? `${o.diocese} expects you home.` : 'Your bishop expects you home.'}`, options: [
        { id: 'return', label: o.grade === 'bishop' ? '⛪ Accept a diocese of your own' : '⛪ Take a parish' },
        { id: 'rest', label: '📿 A sabbatical first' },
      ] });
    });
  },
  onAgeUp(ctx) {
    if (ctx.state.character.alive) syncOrders(ctx);
  },
  actions: {
    /** A priest asks the bishop to send them to Rome: the Pontifical Ecclesiastical Academy (diplomacy) or the Curia. */
    toRome(ctx, where) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (job?.professionId !== 'catholicClergy' || !catholicPriest(state)) return ctx.toast('Priests serving a diocese only', 'warn');
      if ((job.yearsAtEmployer ?? 0) < 3) return ctx.toast('Three years in your diocese first', 'warn');
      if (state.yearly['holyOrders.toRome']) return ctx.toast('Once a year', 'warn');
      state.yearly['holyOrders.toRome'] = 1;
      const academy = where !== 'curia';
      if (academy && state.character.age > 40) return ctx.toast('The Academy takes priests under 40', 'warn');
      const odds = clamp(0.25 + (job.performance ?? 60) / 250 + (state.stats.smarts - 60) / 200 + (job.levelId === 'monsignor' ? 0.1 : 0), 0.1, 0.75);
      if (!rng.chance(odds)) return ctx.log(`Your bishop said the diocese couldn't spare you this year.`, '⛪', 'info');
      const profession = getProfession(academy ? 'holySeeDiplomacy' : 'romanCuria');
      const employer = createEmployer(rng, state, profession, state.character.regionId);
      const o = ordersOf(state);
      o.diocese ??= job.employer?.name ?? null;
      const hired = hire(ctx, { professionId: profession.id, levelId: profession.levels[0].id, employer });
      return hired ? ctx.log(academy ? 'Your bishop sent you to Rome: two years at the Pontifical Ecclesiastical Academy on Piazza della Minerva, then the nunciatures.' : 'Your bishop lent you to the Holy See: a desk in a dicastery, a room in a Roman college, and the Curia\'s long hours.', '🇻🇦', 'milestone') : undefined;
    },
    /** Ask to be released from the clerical state (laicization), or give up your ministerial credentials. */
    laicize(ctx) {
      const { state } = ctx;
      const o = ordersOf(state);
      if (!o) return ctx.toast('You are not ordained.', 'warn');
      const job = state.career.job;
      if (job && (CLERGY_CAREERS.includes(job.professionId) || ['holySeeDiplomacy'].includes(job.professionId))) return ctx.toast('Resign your post first.', 'warn');
      o.laicized = true;
      return ctx.log(CATHOLIC.includes(o.tradition) || o.tradition === 'anglican'
        ? 'Rome granted your petition: you were dispensed from the obligations of the clerical state. You may marry; you may never again act as a priest.'
        : 'You gave up your ministerial credentials.', '📜', 'milestone');
    },
  },
  resolvers: {
    return(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId !== 'return') return ctx.log('You took a year\'s sabbatical: a monastery, long walks, and books you had meant to read for twenty years.', '📿', 'info');
      const profession = getProfession('catholicClergy');
      const level = ordainedEntryLevel(state, profession) ?? profession.levels.find((l) => l.id === (ordersOf(state)?.grade === 'bishop' ? 'bishop' : 'pastor'));
      const employer = createEmployer(rng, state, profession, state.character.regionId);
      const job = hire(ctx, { professionId: 'catholicClergy', levelId: level.id, employer });
      return job ? ctx.log(`You went home to ${employer.name} as ${job.title}.`, '⛪', 'milestone') : undefined;
    },
  },
};
