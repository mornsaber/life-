/**
 * The last chapter, lived: grandchildren and what you leave.
 *
 *   Grandchildren  each has a bond with you. Mind the baby so your child can work, help with
 *                  school fees, turn up for the graduation and the wedding. A child who falls out
 *                  with you can keep the grandchildren away: say sorry, or go to court where the
 *                  law gives grandparents a right to see them (much of the US from the 1960s,
 *                  England and Wales by leave of the court from 1989).
 *   The will       beyond the plan (Legacy.js): cut a child out, or leave more to the one who
 *                  looked after you. The family hears about it. A cut-out child may come back to
 *                  make peace; an uneven will is contested at probate (Legacy.willContested).
 *
 * child.kids = [{ firstName, gender, bornAge, bond }]   (grandchildren, from Dynasty.js)
 * state.people.will = { plan, age, cutOut: [personId], favour: personId | null }
 */
import { Random, clamp } from '../../core/Random.js';
import { rememberOn } from './Grudges.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { eraScale } from '../economy/EraEconomy.js';
import { ageOf, livingChildren, byId } from './People.js';

const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 5003) ^ (state.character.age * 421 + 0x9a7)) >>> 0);
const money = (n) => `$${Math.round(n).toLocaleString()}`;
const ccOf = (state) => state.character.countryId ?? 'US';

/** Every grandchild with their parent and age now. */
export function grandchildrenOf(state) {
  return livingChildren(state).flatMap((parent) => (parent.kids ?? []).map((kid, i) => ({ kid, parent, index: i, age: state.character.age - kid.bornAge })));
}
/** Can a grandparent go to court to see the grandchildren here and now? */
export function grandparentRights(state) {
  const y = yearNow(state);
  const cc = ccOf(state);
  if (cc === 'US') return y >= 1966;
  if (cc === 'GB') return y >= 1989;
  if (['FR', 'DE', 'IT', 'ES', 'BE', 'NL'].includes(cc)) return y >= 1970;
  return false;
}

/** The year's grandparenting moment (one at most). */
function grandparentYear(ctx, rng) {
  const { state } = ctx;
  if (state.character.age < 40 || yearlyCount(state, 'late.grand') || !rng.chance(0.45)) return;
  const gks = grandchildrenOf(state);
  if (!gks.length) return;
  for (const g of gks) g.kid.bond ??= 50;
  const estranged = livingChildren(state).find((c) => (c.kids?.length ?? 0) && (c.relationship ?? 60) < 25 && !c.barred);
  const babies = gks.filter((g) => g.age >= 0 && g.age < 5);
  const schoolKids = gks.filter((g) => g.age >= 5 && g.age < 18);
  const grown = gks.filter((g) => g.age >= 18 && g.age < 32 && !(g.kid.milestones ?? []).includes(g.age >= 25 ? 'wedding' : 'graduation'));
  bumpYearly(state, 'late.grand');
  if (estranged) {
    estranged.barred = true;
    return ctx.prompt({
      type: 'lateLife.barred', icon: '🚪', title: 'Kept Away',
      text: `${estranged.firstName} has stopped letting you see the grandchildren. The birthday cards come back unopened.`,
      options: [
        { id: 'sorry', label: '💌 Write and say sorry', hint: 'For whatever it was' },
        ...(grandparentRights(state) ? [{ id: 'court', label: '⚖️ Go to court for the right to see them', hint: 'You may win the right, and lose your child for good' }] : []),
        { id: 'accept', label: '🕯️ Accept it, for now', hint: 'And hope' },
      ],
      data: { personId: estranged.id },
    });
  }
  if (babies.length && rng.chance(0.5)) {
    const g = rng.pick(babies);
    return ctx.prompt({
      type: 'lateLife.childcare', icon: '🍼', title: 'Two Days a Week?',
      text: `${g.parent.firstName} is going back to work and asks if you could mind ${g.kid.firstName} a couple of days a week.`,
      options: [
        { id: 'yes', label: '🧸 Of course', hint: 'Tiring, and the best days of the week' },
        { id: 'sometimes', label: '📅 Now and then', hint: 'Emergencies and the odd afternoon' },
        { id: 'no', label: '🙅 Not this time', hint: 'You have your own life' },
      ],
      data: { personId: g.parent.id, index: g.index },
    });
  }
  if (schoolKids.length && state.finances.cash > 20000 * eraScale(state, 'wage') && rng.chance(0.5)) {
    const g = rng.pick(schoolKids);
    const cost = Math.round(6000 * eraScale(state, 'wage'));
    return ctx.prompt({
      type: 'lateLife.fees', icon: '🎒', title: `${g.kid.firstName}'s Schooling`,
      text: `${g.parent.firstName} mentions they're struggling with ${g.kid.firstName}'s school costs.`,
      options: [
        { id: 'pay', label: `💷 Help with the fees (${money(cost)} a year)`, hint: 'Not quite a gift: a family thing' },
        { id: 'fund', label: '🏦 Start a fund for university instead', hint: 'Something for later' },
        { id: 'no', label: '🙂 Keep out of it', hint: 'It\'s their family' },
      ],
      data: { personId: g.parent.id, index: g.index, cost },
    });
  }
  if (grown.length) {
    const g = rng.pick(grown);
    const event = g.age >= 25 ? 'wedding' : 'graduation';
    (g.kid.milestones ??= []).push(event);
    return ctx.prompt({
      type: 'lateLife.milestone', icon: event === 'wedding' ? '💒' : '🎓', title: event === 'wedding' ? `${g.kid.firstName}'s Wedding` : `${g.kid.firstName}'s Graduation`,
      text: event === 'wedding' ? `${g.kid.firstName} is getting married, and wants you there.` : `${g.kid.firstName} is graduating. The ceremony is in a big hall a long way away.`,
      options: [
        { id: 'go', label: `🎁 Go, with a generous present (${money(2500 * eraScale(state, 'wage'))})`, hint: 'You\'ll be in the photos' },
        { id: 'card', label: '✉️ Send a card and a cheque', hint: 'Your hips aren\'t what they were' },
        { id: 'skip', label: '🛋️ Give it a miss', hint: 'They\'ll remember' },
      ],
      data: { personId: g.parent.id, index: g.index, event },
    });
  }
}

const kidOf = (state, data) => byId(state, data.personId)?.kids?.[data.index] ?? null;
const bond = (kid, n) => { if (kid) kid.bond = clamp((kid.bond ?? 50) + n, 0, 100); };
const rel = (p, n) => { if (p) p.relationship = clamp((p.relationship ?? 60) + n, 0, 100); };

export const LateLifeModule = {
  id: 'lateLife',
  order: 34.5,
  onAgeUp(ctx) {
    const { state } = ctx;
    const rng = sideRng(state);
    grandparentYear(ctx, rng);
    // A cut-out child, years later, comes to make peace.
    const w = state.people?.will;
    const cut = (w?.cutOut ?? []).map((id) => byId(state, id)).find((p) => p?.alive);
    if (cut && !state.prompts.some((p) => p.type === 'lateLife.peace') && rng.chance(0.08)) {
      ctx.prompt({
        type: 'lateLife.peace', icon: '🕊️', title: `${cut.firstName} at the Door`,
        text: `${cut.firstName} turned up on your doorstep, older and greyer, and asked if you could start again.`,
        options: [{ id: 'restore', label: '🤝 Let them back in, and back in the will' }, { id: 'talk', label: '☕ Talk, but leave the will as it is' }, { id: 'door', label: '🚪 Close the door' }],
        data: { personId: cut.id },
      });
    }
  },
  actions: {
    /** Cut a child out of your will. arg: personId */
    cutOut(ctx, personId) {
      const { state } = ctx;
      const p = byId(state, personId);
      const w = state.people?.will;
      if (!p || p.relation !== 'child' || !w) return ctx.toast('Make a will first.', 'warn');
      w.cutOut = [...new Set([...(w.cutOut ?? []), personId])];
      if (w.favour === personId) w.favour = null;
      rel(p, -30);
      rememberOn(state, p, 'cutOut', 'bad', 'You cut them out of your will.');
      for (const s of livingChildren(state)) if (s.id !== personId) rel(s, -3);
      ctx.log(`You cut ${p.firstName} out of your will. Word got round the family within a week.`, '✂️', 'warn');
    },
    /** Leave more to one child. arg: personId */
    favour(ctx, personId) {
      const { state } = ctx;
      const p = byId(state, personId);
      const w = state.people?.will;
      if (!p || p.relation !== 'child' || !w) return ctx.toast('Make a will first.', 'warn');
      w.favour = personId;
      w.cutOut = (w.cutOut ?? []).filter((id) => id !== personId);
      rel(p, 6);
      for (const s of livingChildren(state)) if (s.id !== personId) { rel(s, -5); rememberOn(state, s, 'favoured', 'bad', `You left ${p.firstName} more than them in your will.`); }
      ctx.log(`You changed your will to leave ${p.firstName} more than the others${state.elderCare?.caregiverYears || p.relationship >= 75 ? ', for everything they\'ve done' : ''}. The others noticed.`, '📜', 'info');
    },
    /** Make the will even again. */
    evenWill(ctx) {
      const w = ctx.state.people?.will;
      if (!w) return;
      w.cutOut = [];
      w.favour = null;
      ctx.log('You put your will back to even shares.', '📜', 'info');
    },
  },
  resolvers: {
    childcare(ctx, data, optionId) {
      const { state } = ctx;
      const parent = byId(state, data.personId);
      const kid = kidOf(state, data);
      if (optionId === 'yes') {
        bond(kid, 20); rel(parent, 10);
        rememberOn(state, parent, 'childcare', 'good', `You minded ${kid?.firstName ?? 'the baby'} two days a week.`);
        ctx.stat('happiness', 5); ctx.stat('stress', 4);
        if (state.career?.job) state.career.job.performance = clamp((state.career.job.performance ?? 55) - 3, 0, 100);
        return ctx.log(`Two days a week with ${kid?.firstName ?? 'the baby'}: the park, the ducks, the naps you both needed.`, '🧸', 'good');
      }
      if (optionId === 'sometimes') { bond(kid, 8); rel(parent, 3); return ctx.log('You helped out now and then.', '📅', 'info'); }
      rel(parent, -6);
      ctx.log(`${parent?.firstName ?? 'They'} found a nursery. They didn't ask again.`, '🙅', 'warn');
    },
    fees(ctx, data, optionId) {
      const { state } = ctx;
      const parent = byId(state, data.personId);
      const kid = kidOf(state, data);
      if (optionId === 'pay') {
        if (!ctx.spend(data.cost, `School fees for ${kid?.firstName ?? 'a grandchild'}`, { credit: true })) return ctx.toast('You couldn\'t manage it after all.', 'warn');
        bond(kid, 10); rel(parent, 10);
        return ctx.log(`You helped with ${kid?.firstName ?? 'your grandchild'}'s school fees.`, '🎒', 'good');
      }
      if (optionId === 'fund') {
        const amount = Math.round(data.cost * 2);
        if (!ctx.spend(amount, `University fund for ${kid?.firstName ?? 'a grandchild'}`, { credit: true })) return ctx.toast('Not enough to start a fund.', 'warn');
        if (kid) kid.fund = (kid.fund ?? 0) + amount;
        bond(kid, 6); rel(parent, 6);
        return ctx.log(`You started a university fund for ${kid?.firstName ?? 'your grandchild'}: ${money(amount)} to begin with.`, '🏦', 'good');
      }
      ctx.log('You kept out of it.', '🙂', 'info');
    },
    milestone(ctx, data, optionId) {
      const { state } = ctx;
      const parent = byId(state, data.personId);
      const kid = kidOf(state, data);
      if (optionId === 'go') {
        ctx.spend(Math.round(2500 * eraScale(state, 'wage')), `${kid?.firstName ?? 'A grandchild'}'s ${data.event}`, { credit: true });
        bond(kid, 15); rel(parent, 5); ctx.stat('happiness', 6);
        return ctx.log(data.event === 'wedding' ? `You danced at ${kid?.firstName ?? 'your grandchild'}'s wedding. Not for long, but you danced.` : `You cried a little in the big hall when ${kid?.firstName ?? 'your grandchild'} crossed the stage.`, data.event === 'wedding' ? '💒' : '🎓', 'good');
      }
      if (optionId === 'card') { bond(kid, 3); return ctx.log('You sent a card and a cheque.', '✉️', 'info'); }
      bond(kid, -10);
      rememberOn(state, parent, 'missed', 'bad', `You missed ${kid?.firstName ?? 'your grandchild'}'s ${data.event}.`);
      ctx.log(`You missed ${kid?.firstName ?? 'your grandchild'}'s ${data.event}.`, '🛋️', 'warn');
    },
    barred(ctx, data, optionId) {
      const { state, rng } = ctx;
      const p = byId(state, data.personId);
      if (!p) return;
      if (optionId === 'sorry') {
        if (rng.chance(0.5)) { p.barred = false; rel(p, 20); return ctx.log(`${p.firstName} rang after your letter. Sunday lunch, cautiously.`, '💌', 'good'); }
        return ctx.log('No reply to your letter. You wrote another.', '💌', 'warn');
      }
      if (optionId === 'court') {
        ctx.spend(Math.round(8000 * eraScale(state, 'wage')), 'Solicitors: grandparents\' access', { credit: true });
        if (rng.chance(0.45)) { p.barred = false; rel(p, -20); return ctx.log('The court gave you the right to see the grandchildren once a month. Your child won\'t speak to you at the handovers.', '⚖️', 'info'); }
        rel(p, -25);
        return ctx.log('The court sided with your child. The door is shut harder now.', '⚖️', 'bad');
      }
      ctx.log('You kept the cards in a drawer, one for every birthday.', '🕯️', 'warn');
    },
    peace(ctx, data, optionId) {
      const { state } = ctx;
      const p = byId(state, data.personId);
      const w = state.people?.will;
      if (!p) return;
      if (optionId === 'restore') { if (w) w.cutOut = (w.cutOut ?? []).filter((id) => id !== p.id); rel(p, 30); ctx.stat('happiness', 8); return ctx.log(`You and ${p.firstName} started again. You put them back in the will that week.`, '🕊️', 'good'); }
      if (optionId === 'talk') { rel(p, 15); return ctx.log(`You and ${p.firstName} talked for hours. The will stays as it is.`, '☕', 'info'); }
      rel(p, -10);
      ctx.log(`You closed the door on ${p.firstName}.`, '🚪', 'bad');
    },
  },
};
