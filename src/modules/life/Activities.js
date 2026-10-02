/**
 * Self-improvement activities. Each can be done once per year.
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';

export const ACTIVITIES = [
  { id: 'gym', label: 'Hit the Gym', icon: '🏋️', minAge: 12, cost: 0, desc: '+Fitness, +Health', run: (ctx) => { ctx.stat('fitness', ctx.rng.int(4, 8)); ctx.stat('health', ctx.rng.int(1, 3)); return 'You crushed a training block at the gym.'; } },
  { id: 'library', label: 'Visit the Library', icon: '📚', minAge: 6, cost: 0, desc: '+Smarts', run: (ctx) => { ctx.stat('smarts', ctx.rng.int(2, 5)); return 'You lost yourself in the stacks for a few weekends.'; } },
  { id: 'meditate', label: 'Meditate', icon: '🧘', minAge: 10, cost: 0, desc: '−Stress, +Happiness', run: (ctx) => { ctx.stat('stress', -ctx.rng.int(8, 15)); ctx.stat('happiness', ctx.rng.int(2, 5)); return 'You found a little stillness.'; } },
  { id: 'doctor', label: 'See a Doctor', icon: '🩺', minAge: 0, cost: 400, desc: '+Health ($400)', run: (ctx) => { ctx.stat('health', ctx.rng.int(5, 12)); return 'Your doctor ran a full checkup and treated what she found.'; } },
  { id: 'salon', label: 'Salon & Spa', icon: '💇', minAge: 14, cost: 250, desc: '+Looks ($250)', run: (ctx) => { ctx.stat('looks', ctx.rng.int(2, 6)); ctx.stat('happiness', 2); return 'You walked out looking sharp.'; } },
  { id: 'vacation', label: 'Take a Vacation', icon: '🏝️', minAge: 18, cost: 3000, desc: '−Stress, +Happiness ($3,000)', run: (ctx) => { ctx.stat('stress', -ctx.rng.int(15, 25)); ctx.stat('happiness', ctx.rng.int(8, 14)); return `You spent a week in ${ctx.rng.pick(['Lisbon', 'Kyoto', 'Banff', 'Oaxaca', 'Cape Town', 'Maui'])}.`; } },
];

export const Activities = {
  id: 'activities',
  order: 5,
  actions: {
    do(ctx, activityId) {
      const activity = ACTIVITIES.find((a) => a.id === activityId);
      if (!activity) return;
      const key = `activity.${activity.id}`;
      if (ctx.state.character.age < activity.minAge) return ctx.toast(`You must be ${activity.minAge}+ for that.`, 'warn');
      if (yearlyCount(ctx.state, key)) return ctx.toast('Already done this year.', 'warn');
      if (activity.cost && !ctx.spend(activity.cost, activity.label)) return ctx.toast(`You need $${activity.cost.toLocaleString()}.`, 'warn');
      bumpYearly(ctx.state, key);
      const text = activity.run(ctx);
      ctx.log(text, activity.icon);
      ctx.toast(text, 'good');
    },
  },
};
