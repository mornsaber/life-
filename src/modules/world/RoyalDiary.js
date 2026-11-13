/**
 * The Royal Diary: one planner for the year's public life, in place of scattered duty buttons
 * and a yearly prompt. A working royal has so many days to give (the sovereign more); each
 * engagement, tour, investiture or headline event takes some, and the planner shows what each
 * will likely do to your popularity, your stress and your standing with the press.
 *
 *   Too light a year (a working adult royal giving fewer than three days) and the papers count
 *   your engagements; too full a one and you feel it.
 *
 * state.royal.diaryDays = { [age]: days given that year }
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { CrownModule } from './Crown.js';
import { RoyalHouseholdModule } from './RoyalHousehold.js';
import { RoyalLifeModule, DIARY, headline } from './RoyalLife.js';

const yc = (s, k) => yearlyCount(s, k);
const adult = (s) => s.character.age >= 18;

/** Everything the diary can hold. `left` is how many more this year; `can` whether it's yours to do. */
export const DIARY_ITEMS = [
  { id: 'engagement', icon: '🤝', label: 'Engagements', note: 'Visits, openings, receptions', days: 1, pop: [1, 1], stress: 2,
    can: (s, r) => r.working, left: (s) => 3 - yc(s, 'crown.engagement'), run: (ctx) => CrownModule.actions.engagement(ctx) },
  { id: 'patronage', icon: '🎗️', label: 'A new patronage', note: 'A charity takes your name', days: 1, pop: [1, 1], stress: 0,
    can: (s, r) => r.working && adult(s), left: (s) => 1 - yc(s, 'crown.patronage'), run: (ctx) => CrownModule.actions.patronage(ctx) },
  { id: 'tour', icon: '✈️', label: 'A royal tour', note: 'The realms or the provinces', days: 4, pop: [3, 3], stress: 5,
    can: (s, r) => r.working && s.character.age >= 21 && r.line != null && (r.reigning || r.line <= 6), left: (s) => 1 - yc(s, 'crown.tour'), run: (ctx) => CrownModule.actions.tour(ctx) },
  { id: 'investiture', icon: '⚔️', label: 'An investiture', note: 'Knighthoods and medals, each with a word', days: 2, pop: [1, 1], stress: 2,
    can: (s, r) => r.reigning || (r.working && r.line != null && r.line <= 4 && s.character.age >= 25), left: (s) => 2 - yc(s, 'royalHousehold.investiture'), run: (ctx) => RoyalHouseholdModule.actions.investiture(ctx) },
  { id: 'warrant', icon: '🏷️', label: 'A royal warrant', note: '"By Appointment" for a firm', days: 1, pop: [0, 0], stress: 0,
    can: (s, r) => r.reigning || (r.working && r.line === 1), left: (s) => 1 - yc(s, 'royalHousehold.warrant'), run: (ctx) => RoyalHouseholdModule.actions.warrant(ctx) },
  { id: 'mentor', icon: '🎓', label: 'Prepare the heir', note: 'Red boxes, audiences, a shared visit', days: 2, pop: [0, 0], stress: 1,
    can: (s, r) => r.reigning, left: (s) => 1 - yc(s, 'royalLife.mentor'), run: (ctx) => RoyalLifeModule.actions.mentorHeir(ctx) },
  { id: 'gathering', icon: '🏰', label: 'Gather the family', note: 'The summer palace, a photograph', days: 2, pop: [0, 0], stress: -2,
    can: (s, r) => r.reigning || r.line === 1, left: (s) => 1 - yc(s, 'royalLife.gathering'), run: (ctx) => RoyalLifeModule.actions.gathering(ctx) },
  { id: 'rest', icon: '🌿', label: 'Private time', note: 'A week at the country house, off the record', days: 1, pop: [0, 0], stress: -3,
    can: () => true, left: (s) => 3 - yc(s, 'royalDiary.rest'), run: (ctx) => { bumpYearly(ctx.state, 'royalDiary.rest'); ctx.stat('stress', -3); ctx.stat('happiness', 1); } },
];

/** Days a year you have to give. */
export const diaryBudget = (state) => (state.royal?.reigning ? 12 : state.royal?.line === 1 ? 11 : 10);
export const daysUsed = (state) => yc(state, 'royalDiary.days');
export const diaryOpen = (state) => Boolean(state.royal?.working && adult(state));

/** What the diary can hold this year, with how many of each are left. */
export function diaryOptions(state) {
  const r = state.royal;
  if (!diaryOpen(state)) return { items: [], headlines: [] };
  const items = DIARY_ITEMS.filter((x) => x.can(state, r)).map((x) => ({ ...x, remaining: Math.max(0, x.left(state)) }));
  const headlines = yc(state, 'royalLife.diary') ? [] : DIARY;
  return { items, headlines };
}

/** Likely effect of a plan: { days, pop: [lo, hi], stress, risk } — the papers' view included. */
export function project(state, plan) {
  const { items, headlines } = diaryOptions(state);
  let days = 0; let lo = 0; let hi = 0; let stress = 0; let risk = 0;
  for (const x of items) {
    const n = Math.min(plan[x.id] ?? 0, x.remaining);
    days += n * x.days; lo += n * x.pop[0]; hi += n * x.pop[1]; stress += n * x.stress;
  }
  const h = headlines.find((d) => d.id === plan.headline);
  if (h) { days += 3; lo -= 4; hi += h.pop[1]; stress += h.stress; risk = h.risk; }
  const total = days + daysUsed(state);
  if (total > diaryBudget(state) - 2) stress += 3;
  return { days, total, pop: [lo, hi], stress, risk, over: total > diaryBudget(state) };
}

/** Parse a planner arg: "engagement=2:tour=1:headline=banquet". */
export function parsePlan(arg) {
  const plan = {};
  for (const part of String(arg ?? '').split(':')) {
    const [k, v] = part.split('=');
    if (!k) continue;
    plan[k] = k === 'headline' ? v : Math.max(0, Math.min(5, Number(v) || 0));
  }
  return plan;
}

export const RoyalDiaryModule = {
  id: 'royalDiary',
  order: 33.85,
  onAgeUp(ctx) {
    const { state } = ctx;
    const r = state.royal;
    if (!r || !state.character.alive) return;
    // The papers count last year's engagements.
    const last = r.diaryDays?.[state.character.age - 1];
    if (r.working && !r.reigning && state.character.age - 1 >= 21 && last != null && last < 3) {
      r.popularity = Math.max(0, (r.popularity ?? 60) - 2);
      ctx.log(`The papers counted your engagements: ${last} day${last === 1 ? '' : 's'} of public duty last year. "Workshy royal," said one front page.`, '📰', 'warn');
    }
    if (r.diaryDays) for (const k of Object.keys(r.diaryDays)) if (Number(k) < state.character.age - 3) delete r.diaryDays[k];
  },
  actions: {
    /** Set (part of) the year's diary: arg "engagement=2:tour=1:headline=banquet". */
    plan(ctx, arg) {
      const { state } = ctx;
      const r = state.royal;
      if (!diaryOpen(state)) return ctx.toast(r && !r.working ? 'You are not a working royal.' : 'The diary starts at eighteen.', 'warn');
      const plan = parsePlan(arg);
      const p = project(state, plan);
      if (!p.days) return ctx.toast('Nothing in the diary.', 'warn');
      if (p.over) return ctx.toast(`That's ${p.total} days; you have ${diaryBudget(state)} this year.`, 'warn');
      const before = r.popularity ?? 60;
      const { items, headlines } = diaryOptions(state);
      for (const x of items) for (let i = 0; i < Math.min(plan[x.id] ?? 0, x.remaining); i++) x.run(ctx);
      if (headlines.some((d) => d.id === plan.headline)) headline(ctx, plan.headline);
      state.yearly['royalDiary.days'] = daysUsed(state) + p.days;
      (r.diaryDays ??= {})[state.character.age] = daysUsed(state);
      if (p.total > diaryBudget(state) - 2) { ctx.stat('stress', 3); ctx.log('A full diary: the private secretary had to cancel your only free weekend.', '📅', 'warn'); }
      const d = (r.popularity ?? 60) - before;
      ctx.log(`The year's diary: ${p.days} day${p.days === 1 ? '' : 's'} of public duty. Popularity ${d >= 0 ? '+' : ''}${d} (${r.popularity}%).`, '📅', 'info');
      return undefined;
    },
  },
};

