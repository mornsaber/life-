/**
 * Class of its day: where you started, where you've got to, and what it opened or shut.
 *
 *   Origins      the class you were born into (the family's wealth and work): upper, middle,
 *                lower-middle or working. Settled at 18.
 *   Doors        before the post-war years, the "gentlemen's" posts (diplomacy, the bar, the
 *                Church of England, the colonial service, the City, the universities) went to the
 *                right accent and the right school; a working-class candidate was rarely taken.
 *                The weight of it falls each generation.
 *   Polish       elocution lessons and a good tailor (before the 1970s): the accent half-forgotten.
 *   Rising       moving up (or down) a class in your own lifetime, and the family's view of whom
 *                you married.
 *   Mutual aid   before the welfare state, the friendly society (the Oddfellows, the Foresters)
 *                paid sick pay for a few pence a week, and the burial club made sure of a decent
 *                funeral, not a pauper's grave: Britain to 1948, America to the 1930s.
 *
 * state.classDay = { origin, now, polished, risen, society: { name, since } | null, marriedNote }
 */
import { yearNow } from '../world/Eras.js';
import { netWorth } from '../../core/State.js';
import { priceLevel } from '../world/Countries.js';
import { statuteIn, statuteOverride, WELFARE_FROM } from '../politics/StatuteBook.js';

export const CLASSES = { upper: 'Upper class', middle: 'Middle class', lowerMiddle: 'Lower middle class', working: 'Working class' };
const RANK = { working: 0, lowerMiddle: 1, middle: 2, upper: 3 };
const GENTLEMEN = ['foreignService', 'gb_foreignService', 'law', 'anglicanClergy', 'colonialService', 'finance', 'college', 'university', 'holySeeDiplomacy', 'ministry', 'intlJustice', 'judiciary'];
const cc = (state) => state.character.countryId ?? 'US';
const cd = (state) => (state.classDay ??= { origin: null, now: null, polished: false, risen: null, society: null });

/** The class you live in now: your title, your work and your money. */
export function classNow(state) {
  if (state.character.style?.peerage || state.royal || state.nobility?.rank || (state.society?.standing ?? 0) >= 60) return 'upper';
  const job = state.career?.job;
  const grade = job?.grade ?? 0;
  const worth = netWorth(state) / Math.max(0.05, priceLevel(state));
  const degree = (state.education?.degrees ?? []).some((d) => ['bachelor', 'master', 'phd', 'professional', 'jd', 'md'].includes(d.type));
  if (worth > 3e6) return 'upper';
  if (grade >= 6 || degree || worth > 4e5) return 'middle';
  if (job && (['federal', 'state', 'municipal', 'public'].includes(job.sector) || /clerk|office|typing|retail|insurance|telegraph|switchboard|education|library/.test(job.professionId)) ) return 'lowerMiddle';
  return 'working';
}
/** The class you were born into. */
export function originOf(state) {
  const c = cd(state);
  if (c.origin) return c.origin;
  const w = state.people?.wealth;
  return w === 'upper' ? 'upper' : w === 'middle' ? 'middle' : 'working';
}
/** How much class still opened doors in this year (1 before 1914, near nothing by 2000). */
const weight = (y) => (y < 1914 ? 1 : y < 1945 ? 0.7 : y < 1970 ? 0.4 : y < 2000 ? 0.2 : 0.1);

/** The hiring bonus (or penalty) of class for a "gentleman's" post. */
export function classBonus(state, profession) {
  const id = profession?.template ?? profession?.id;
  if (!GENTLEMEN.includes(id) && !GENTLEMEN.includes(profession?.id)) return 0;
  const o = originOf(state);
  const base = { upper: 0.12, middle: 0.04, lowerMiddle: -0.06, working: -0.15 }[o];
  return base * weight(yearNow(state)) * (base < 0 && cd(state).polished ? 0.5 : 1);
}
export const welfareHere = (state) => statuteIn(state, 'nationalInsurance');
const SOCIETY = (state) => (cc(state) === 'US' ? 'the Odd Fellows lodge (sick and burial benefits)' : cc(state) === 'FR' ? 'a société de secours mutuels' : cc(state) === 'DE' ? 'a Krankenkasse' : 'the Oddfellows (sick club and burial club)');
const dues = (state) => Math.round(260 * priceLevel(state) * (yearNow(state) < 1914 ? 0.4 : 0.6));

export const ClassOfTheDayModule = {
  id: 'classDay',
  order: 96.9,
  setup(engine) {
    engine.bus.on('death', (state) => {
      if (state.classDay?.society) state.classDay.funeralPaid = true;
    });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character.alive) return;
    const c = cd(state);
    if (state.character.age === 18 && !c.origin) c.origin = originOf(state);
    if (state.character.age < 18) return;
    c.origin ??= originOf(state);
    const now = classNow(state);
    c.now = now;
    // Before the welfare state the poor died younger: damp rooms, poor food, heavy work.
    if (!welfareHere(state) && state.character.age >= 35 && state.character.age % 3 === 0) ctx.stat('health', now === 'working' ? -1 : now === 'upper' ? 1 : 0);
    if (!c.risen && RANK[now] - RANK[c.origin] >= 2) {
      c.risen = 'up';
      ctx.log(yearNow(state) < 1960 ? `You've risen out of the class you were born to. Your old neighbours say you've got above yourself; your new ones notice your vowels.` : 'You\'ve come a long way from where you started. Your parents are proud, and a little lost in your new life.', '🪜', 'milestone');
    } else if (!c.risen && RANK[c.origin] - RANK[now] >= 2) {
      c.risen = 'down';
      ctx.log('You\'ve come down in the world: the family\'s friends no longer call.', '🪜', 'warn');
    }
    // Whom you married.
    const sp = (state.people?.list ?? []).find((p) => p.relation === 'spouse' && p.alive !== false);
    if (sp && !c.marriedNote && yearNow(state) < 1970) {
      c.marriedNote = true;
      const theirs = (sp.income ?? 0) > 80000 ? 'middle' : (sp.income ?? 0) > 0 ? 'working' : c.origin;
      if (RANK[c.origin] - RANK[theirs] >= 2) { ctx.log(`Your family thought you'd married beneath you. Your mother was cool to ${sp.firstName} for years.`, '💍', 'warn'); sp.relationship = Math.max(0, (sp.relationship ?? 60) - 2); }
      else if (RANK[theirs] - RANK[c.origin] >= 1) ctx.log(`${sp.firstName}'s family thought ${sp.gender === 'female' ? 'she' : 'he'} had married beneath ${sp.gender === 'female' ? 'her' : 'him'}. You worked hard to win them round.`, '💍', 'info');
    }
    // The friendly society: dues, and sick pay in a bad year.
    if (c.society) {
      if (welfareHere(state) && !c.society.kept) { c.society.kept = true; ctx.log('The state now pays what the friendly society used to. You kept up your membership for the lodge nights.', '🤝', 'info'); }
      ctx.spend(dues(state), 'Friendly society dues', { allowDebt: true });
      if (state.stats.health < 45 && !welfareHere(state)) ctx.earn(Math.round(dues(state) * 6), 'Sick pay from the friendly society', {});
    }
  },
  actions: {
    join(ctx) {
      const { state } = ctx;
      const c = cd(state);
      if (c.society) { c.society = null; return ctx.log('You let your membership lapse.', '🤝', 'info'); }
      c.society = { name: SOCIETY(state), since: state.character.age };
      return ctx.log(`You joined ${c.society.name}: a few pence a week for sick pay and a decent funeral.`, '🤝', 'good');
    },
    polish(ctx) {
      const { state } = ctx;
      const c = cd(state);
      if (c.polished || yearNow(state) >= 1975) return ctx.toast('Not needed', 'warn');
      const cost = Math.round(1200 * priceLevel(state));
      if (!ctx.spend(cost, 'Elocution lessons and a good tailor', { credit: false })) return ctx.toast('Not enough cash', 'warn');
      c.polished = true;
      return ctx.log('Elocution lessons, a good suit, the right knife and fork. Most people can\'t place you any more.', '🎩', 'good');
    },
  },
};
