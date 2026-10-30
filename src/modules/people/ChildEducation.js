/**
 * Your children's next step after school.
 *
 *   Exam year   at fifteen: push them with tutoring and revision (better grades, more stress),
 *               or let them find their own level.
 *   Seventeen   the applications: a top university (if they're bright enough and lucky), a good
 *               one, the local one — or an apprenticeship, a gap year first, or straight to work.
 *               You decide whether to pay the fees each year or let them borrow.
 *
 * child.eduDecided, child.uni = { tier, paidByYou, until }
 */
import { Random, clamp } from '../../core/Random.js';
import { livingChildren, ageOf, byId } from './People.js';
import { ensureLife } from './NpcLives.js';
import { ensureTraits } from './Dynasty.js';
import { priceLevel } from '../world/Countries.js';

const FEES = { US: { elite: 60000, good: 30000, local: 12000 }, GB: { elite: 9250, good: 9250, local: 9250 }, default: { elite: 8000, good: 4000, local: 1500 } };
const TIER = { elite: 'a top university', good: 'a good university', local: 'the local university' };
const feesHere = (state) => FEES[state.character.countryId ?? 'US'] ?? FEES.default;
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 50021 + state.character.age * 563 + 0xed0) >>> 0);
export const fee = (state, tier) => Math.round((feesHere(state)[tier] ?? 0) * (FEES[state.character.countryId ?? 'US'] ? 1 : priceLevel(state)));

export function childEducationTick(main) {
  const { state } = main;
  const rng = sideRng(state);
  for (const c of livingChildren(state).filter((k) => k.custody !== 'ex')) {
    const age = ageOf(state, c);
    // Paying fees for one at university.
    if (c.uni?.paidByYou && age <= c.uni.until) main.spend(fee(state, c.uni.tier), `${c.firstName}'s university fees`, { allowDebt: true });
    const t = ensureTraits(rng, state, c);
    if (age === 15 && !c.examAsked) {
      c.examAsked = true;
      main.prompt({ type: 'childEducation.exams', icon: '📝', title: `${c.firstName}'s Exam Year`, text: `${c.firstName} has the big exams next year.`, data: { childId: c.id }, options: [
        { id: 'tutor', label: '📚 Tutors and a revision timetable', hint: `≈$${Math.round(2500 * priceLevel(state)).toLocaleString()} · better grades, more stress` },
        { id: 'own', label: '🙂 Let them find their own level' },
      ] });
    }
    if (age === 17 && !c.eduDecided) {
      c.eduDecided = true;
      const s = t.smarts ?? 55;
      const offers = ['local'];
      if (s >= 58 || rng.chance(0.3)) offers.push('good');
      if ((s >= 78 && rng.chance(0.55)) || (s >= 68 && rng.chance(0.15))) offers.push('elite');
      const best = offers.at(-1);
      main.prompt({ type: 'childEducation.next', icon: '🎓', title: `${c.firstName}'s Next Step`, text: `${c.firstName} has offers from ${offers.map((o) => TIER[o]).join(', ')}. Fees at ${TIER[best]}: about $${fee(state, best).toLocaleString()} a year.`, data: { childId: c.id, best }, options: [
        { id: 'uniPay', label: `🎓 ${TIER[best].replace(/^./, (x) => x.toUpperCase())} — you pay the fees`, hint: `$${fee(state, best).toLocaleString()}/yr for 4 years` },
        { id: 'uniLoan', label: `🎓 ${TIER[best].replace(/^./, (x) => x.toUpperCase())} — they take out loans` },
        { id: 'apprentice', label: '🔧 An apprenticeship', hint: 'Paid to learn a trade' },
        { id: 'gap', label: '🎒 A gap year first, then university' },
        { id: 'work', label: '💼 Straight into work' },
      ] });
    }
  }
}

export const ChildEducationResolvers = {
  exams(ctx, data, optionId) {
    const { state, rng } = ctx;
    const c = byId(state, data.childId);
    if (!c) return;
    const t = ensureTraits(rng, state, c);
    if (optionId === 'tutor') { ctx.spend(Math.round(2500 * priceLevel(state)), `Tutoring for ${c.firstName}`); t.smarts = Math.min(100, t.smarts + rng.int(4, 9)); if (c.parenting) c.parenting.wellbeing = Math.max(0, c.parenting.wellbeing - 6); return ctx.log(`${c.firstName} revised all year with tutors and came out with strong results — and a stress rash.`, '📚', 'good'); }
    if (c.parenting) c.parenting.wellbeing = Math.min(100, c.parenting.wellbeing + 3);
    ctx.log(`${c.firstName} did it their own way.`, '🙂', 'info');
  },
  next(ctx, data, optionId) {
    const { state, rng } = ctx;
    const c = byId(state, data.childId);
    if (!c) return;
    const life = ensureLife(rng, state, c);
    const age = ageOf(state, c);
    if (optionId === 'uniPay' || optionId === 'uniLoan') {
      life.studying = { degree: 'bachelor', until: age + 5 };
      c.uni = { tier: data.best, paidByYou: optionId === 'uniPay', until: age + 5 };
      if (optionId === 'uniPay') c.tuitionPaid = true;
      if (data.best === 'elite') { const t = ensureTraits(rng, state, c); t.smarts = Math.min(100, t.smarts + 5); }
      c.relationship = Math.min(100, c.relationship + (optionId === 'uniPay' ? 6 : 0));
      return ctx.log(`${c.firstName} is off to ${TIER[data.best]}${optionId === 'uniLoan' ? ', on student loans' : ', with you paying the fees'}.`, '🎓', 'milestone');
    }
    if (optionId === 'apprentice') { life.studying = { degree: 'trade', until: age + 4 }; c.income = Math.round(15000 * priceLevel(state)); return ctx.log(`${c.firstName} started an apprenticeship: paid to learn a trade.`, '🔧', 'good'); }
    if (optionId === 'gap') { life.studying = { degree: 'bachelor', until: age + 6 }; c.uni = { tier: data.best, paidByYou: false, until: age + 6 }; if (c.parenting) c.parenting.wellbeing = Math.min(100, c.parenting.wellbeing + 5); return ctx.log(`${c.firstName} took a gap year — a working season abroad — before university.`, '🎒', 'good'); }
    ctx.log(`${c.firstName} went straight into work.`, '💼', 'info');
  },
};

export const ChildEducationModule = { id: 'childEducation', order: 9.65, onAgeUp: childEducationTick, resolvers: ChildEducationResolvers };
