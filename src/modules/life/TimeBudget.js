/**
 * Your week: 168 hours, and where the free ones go.
 *
 *   Fixed     sleep (from your routine), your job or school, chores and commuting.
 *   Free      split across six buckets, each with a steady yearly effect:
 *               overtime   performance and pay — and burnout
 *               family     closer to your partner and children
 *               health     fitness and lower stress
 *               learning   a skill of your choosing (Skills.js) and a little smarts
 *               hobbies    happiness, less stress
 *               hustle     side income — and burnout
 *   Burnout   0–100. Long weeks for years wear you down: mistakes at work, strain at home,
 *             and in the end your body makes you stop.
 *
 * state.time = { buckets: { overtime, family, health, learning, hobbies, hustle }, study, burnout }
 */
import { Random } from '../../core/Random.js';
import { practise, SKILLS } from './Skills.js';
import { partnerOf, livingChildren, clampRel } from '../people/People.js';
import { priceLevel } from '../world/Countries.js';

export const BUCKETS = {
  overtime: { label: 'Extra work', icon: '💼', hint: 'Performance up, burnout up' },
  family: { label: 'Family', icon: '👪', hint: 'Closer to partner and children' },
  health: { label: 'Exercise', icon: '🏃', hint: 'Fitness up, stress down' },
  learning: { label: 'Learning', icon: '📚', hint: 'Practise a skill' },
  hobbies: { label: 'Hobbies & rest', icon: '🎮', hint: 'Happier, calmer' },
  hustle: { label: 'Side hustle', icon: '💸', hint: 'Extra income, burnout up' },
};
export const STEP = 2;
const DEFAULT = { overtime: 0, family: 8, health: 3, learning: 2, hobbies: 10, hustle: 0 };
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 23893 + state.character.age * 733 + salt) >>> 0);

export const timeOf = (state) => state.time ?? { buckets: { ...DEFAULT }, study: null, burnout: 0 };
const sleepHours = (state) => ({ short: 42, normal: 56, long: 63 }[state.health?.routine?.sleep] ?? 56);
/** Hours the job or school takes each week. */
export function fixedHours(state) {
  const job = state.career.job ? (state.career.job.partTime ? 22 : 42) : 0;
  const school = state.education?.enrolled || (state.character.age < 18 && state.character.age >= 5) ? 32 : 0;
  return sleepHours(state) + Math.max(job, school) + 20;
}
export const freeHours = (state) => Math.max(0, 168 - fixedHours(state));
export const usedHours = (state) => Object.values(timeOf(state).buckets).reduce((s, h) => s + h, 0);

function ensure(state) {
  state.time ??= { buckets: { ...DEFAULT }, study: null, burnout: 0 };
  return state.time;
}

export function timeTick(ctx) {
  const { state } = ctx;
  if (state.character.age < 14 || state.legal?.incarceration) return;
  const t = ensure(state);
  const rng = sideRng(state, 0x7b);
  // If life got busier (a job, school), trim the buckets to fit.
  let over = usedHours(state) - freeHours(state);
  for (const k of ['hobbies', 'learning', 'family', 'health', 'hustle', 'overtime']) {
    if (over <= 0) break;
    const cut = Math.min(t.buckets[k], over);
    t.buckets[k] -= cut;
    over -= cut;
  }
  const b = t.buckets;
  const job = state.career.job;
  // Each bucket's steady effect, with diminishing returns.
  if (job && b.overtime) { job.performance = clamp((job.performance ?? 50) + Math.min(10, b.overtime * 0.6)); ctx.stat('stress', Math.min(8, b.overtime * 0.4)); }
  if (b.family) {
    const p = partnerOf(state);
    if (p) p.relationship = clampRel(p.relationship + Math.min(6, b.family * 0.4));
    for (const c of livingChildren(state)) c.relationship = clampRel(c.relationship + Math.min(5, b.family * 0.3));
    ctx.stat('happiness', Math.min(4, b.family * 0.2));
  }
  if (b.health) { ctx.stat('fitness', Math.min(6, b.health * 0.6)); ctx.stat('stress', -Math.min(5, b.health * 0.4)); }
  if (b.learning) { if (t.study && SKILLS[t.study]) practise(state, t.study, b.learning * 1.5); if (b.learning >= 6) ctx.stat('smarts', 1); }
  if (b.hobbies) { ctx.stat('happiness', Math.min(5, b.hobbies * 0.3)); ctx.stat('stress', -Math.min(4, b.hobbies * 0.25)); }
  if (b.hustle && state.character.age >= 16) ctx.earn(Math.round(b.hustle * 900 * priceLevel(state) * rng.float(0.7, 1.3)), 'Side hustle', { selfEmployed: true });
  // Burnout: long working weeks pile up; rest takes it away.
  const working = (job ? (job.partTime ? 22 : 42) : 0) + b.overtime + b.hustle;
  t.burnout = clamp(t.burnout + (working > 50 ? (working - 50) * 2 : -12) - (b.hobbies + b.health >= 10 ? 4 : 0));
  if (t.burnout >= 70) {
    ctx.stat('health', -3);
    ctx.stat('stress', 6);
    if (job) job.performance = clamp((job.performance ?? 50) - 6);
    const p = partnerOf(state);
    if (p) p.relationship = clampRel(p.relationship - 4);
    if (t.burnout >= 90 && !state.prompts.some((x) => x.type === 'time.burnout')) {
      ctx.prompt({
        type: 'time.burnout', icon: '🔥', title: 'Burnt Out',
        text: 'You can\'t get out of bed some mornings. Your doctor has seen this before.',
        options: [
          { id: 'leave', label: '🛌 Take three months off', hint: 'A quarter of a year\'s pay' },
          { id: 'cut', label: '✂️ Cut your hours back', hint: 'No overtime or side work for now' },
          { id: 'push', label: '😤 Push through', tone: 'danger' },
        ],
        data: {},
      });
    } else ctx.log('You\'re running on empty. Long weeks are catching up with you.', '🔥', 'warn');
  }
}

export const TimeBudgetModule = {
  id: 'time',
  order: 88.7,
  onAgeUp: timeTick,

  actions: {
    /** arg: 'bucket:+' or 'bucket:-' */
    adjust(ctx, arg) {
      const { state } = ctx;
      const [k, dir] = String(arg).split(':');
      if (!BUCKETS[k]) return;
      const t = ensure(state);
      if (dir === '+') {
        if (usedHours(state) + STEP > freeHours(state)) return ctx.toast('No free hours left this week.', 'warn');
        t.buckets[k] += STEP;
      } else t.buckets[k] = Math.max(0, t.buckets[k] - STEP);
    },
    /** arg: a skill id to spend learning hours on. */
    study(ctx, id) {
      if (!SKILLS[id]) return;
      ensure(ctx.state).study = id;
      ctx.toast(`Learning: ${SKILLS[id].label}`, 'info');
    },
  },

  resolvers: {
    burnout(ctx, _data, optionId) {
      const { state } = ctx;
      const t = ensure(state);
      if (optionId === 'leave') {
        if (state.career.job) ctx.spend(Math.round(state.career.job.salary * 0.25), 'Unpaid leave', { allowDebt: true });
        t.burnout = 20;
        ctx.stat('stress', -15);
        return ctx.log('You took three months off. Slowly, you came back to yourself.', '🛌', 'good');
      }
      if (optionId === 'cut') {
        t.buckets.overtime = 0;
        t.buckets.hustle = 0;
        t.burnout = Math.max(40, t.burnout - 30);
        return ctx.log('You stopped the overtime and the side work. It helped.', '✂️', 'good');
      }
      ctx.stat('health', -8);
      ctx.emit('health:trauma', { amount: 6, source: 'life' });
      ctx.log('You pushed through. Something gave.', '😤', 'bad');
    },
  },
};
