/**
 * Health month by month: how you sleep, the habits that creep up on you, and what work is
 * still possible when your body changes.
 *
 *   Sleep      short, normal or long (TimeBudget.js counts the hours). Short sleep raises stress
 *              and wears health down year after year.
 *   Months     twelve readings a year, from last birthday's health to this one's, with the bumps
 *              your routine puts in between — the Health tab draws them as a trend line.
 *   Habits     drinking, gambling and gaming each run 0–100: use, then dependence (70+), then a
 *              crisis (90+) — an intervention prompt, and if it goes badly the addiction itself
 *              (the alcohol and gambling conditions, treated in rehab and Recovery.js).
 *   Adapted    a disabling condition rules out physical work: a physical job offers a desk role,
 *              retraining, or medical retirement — and employers who need you fit say no.
 *
 * state.health.routine = { sleep, months: [12], habits: { drinking, gambling, gaming } }
 */
import { Random } from '../../core/Random.js';
import { lifestyleOf } from './Lifestyle.js';
import { addCondition, disablingConditions } from './HealthEngine.js';
import { getCondition } from './Conditions.js';
import { hasTech } from '../world/Eras.js';

export const SLEEP = { short: '😵 Short (6 hrs)', normal: '😴 Normal (8 hrs)', long: '🛌 Long (9 hrs)' };
export const HABITS = {
  drinking: { label: 'Drinking', icon: '🍺', condition: 'alcohol' },
  gambling: { label: 'Gambling', icon: '🎰', condition: 'gambling' },
  gaming: { label: 'Gaming', icon: '🎮', condition: null, tech: 'video' },
};
/** Fields where the work is physical: closed to someone with a disabling condition. */
export const PHYSICAL = ['police', 'fire', 'stateFire', 'airportFire', 'ems', 'privateEms', 'trades', 'trucking', 'parkService', 'culinary', 'publicWorks', 'military'];
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 19609 + state.character.age * 857 + salt) >>> 0);
const pending = (state, type) => state.prompts.some((p) => p.type === type);

export const routineOf = (state) => state.health?.routine ?? { sleep: 'normal', months: [], habits: { drinking: 0, gambling: 0, gaming: 0 } };
function ensure(state) {
  state.health.routine ??= { sleep: 'normal', months: [], habits: { drinking: 0, gambling: 0, gaming: 0 } };
  return state.health.routine;
}
export const physicalWorkBarred = (state) => disablingConditions(state).length > 0;

/** Habits creep: stress, money worries and what you already do push them up; age and good routines pull them down. */
function habitYear(ctx, r, rng) {
  const { state } = ctx;
  const l = lifestyleOf(state);
  const stress = state.stats.stress ?? 30;
  const push = {
    drinking: (l?.drinking === 'heavy' ? 8 : l?.drinking === 'social' ? 1 : -6) + (stress > 60 ? 4 : 0),
    gambling: (state.finances.cash < 0 ? 3 : 0) + (stress > 70 ? 3 : 0) - 3,
    gaming: (state.character.age < 30 ? 2 : -2) + ((state.time?.buckets?.hobbies ?? 0) >= 14 ? 4 : 0) - (state.career.job ? 1 : 0),
  };
  for (const [k, h] of Object.entries(HABITS)) {
    if (state.character.age < (k === 'drinking' || k === 'gambling' ? 16 : 10)) continue;
    if (h.tech && !hasTech(state, h.tech)) continue;
    const before = r.habits[k];
    r.habits[k] = clamp(r.habits[k] + push[k] + rng.int(-3, 3));
    if (before < 70 && r.habits[k] >= 70) ctx.log(`Your ${h.label.toLowerCase()} has stopped being a choice. You need it now.`, h.icon, 'warn');
    if (r.habits[k] >= 90 && !pending(state, 'routine.habitCrisis') && !(h.condition && getCondition(state, h.condition))) {
      ctx.prompt({
        type: 'routine.habitCrisis', icon: h.icon, title: 'Rock Bottom',
        text: k === 'drinking' ? 'You woke up not remembering how you got home. Again. Your family sat you down.' : k === 'gambling' ? 'The money for the rent is gone. You told yourself one more bet would win it back.' : 'You haven\'t left the flat in weeks except for food. Your job, your friends, your sleep — all gone to the screen.',
        options: [
          { id: 'treatment', label: '🏥 Get help', hint: 'Treatment, and a hard road' },
          { id: 'cut', label: '✂️ Cut back on your own' },
          { id: 'deny', label: '🙈 You don\'t have a problem', tone: 'danger' },
        ],
        data: { habit: k },
      });
    }
  }
}

/** A physical job and a body that can't do it any more. */
function adaptedWork(ctx) {
  const { state } = ctx;
  const job = state.career.job;
  if (!job || !PHYSICAL.includes(job.professionId) || !physicalWorkBarred(state) || job.adapted || pending(state, 'routine.adapted')) return;
  ctx.prompt({
    type: 'routine.adapted', icon: '♿', title: 'Can You Still Do the Job?',
    text: `Your health means you can no longer do the physical side of your work at ${job.employer?.name ?? 'your employer'}. They've offered options.`,
    options: [
      { id: 'desk', label: '🪑 Move to a desk role', hint: 'Keep your job; 10% less pay' },
      { id: 'retrain', label: '🎓 Leave and retrain', hint: 'A grant towards study' },
      { id: 'retire', label: '🏠 Medical retirement', hint: 'Leave on disability benefits' },
    ],
    data: {},
  });
}

export function routineTick(ctx) {
  const { state } = ctx;
  if (!state.health) return;
  const r = ensure(state);
  const rng = sideRng(state, 0x31);
  // Sleep.
  if (r.sleep === 'short' && state.character.age >= 16) { ctx.stat('stress', 3); ctx.stat('health', -1); }
  // Twelve readings from last year's health to this year's, with the routine's bumps.
  const end = state.stats.health;
  const start = r.months.at(-1) ?? end;
  const bump = r.sleep === 'short' ? -2 : r.sleep === 'long' ? 1 : 0;
  r.months = Array.from({ length: 12 }, (_, i) => clamp(start + ((end - start) * (i + 1)) / 12 + bump * Math.sin(i) + rng.int(-1, 1)));
  habitYear(ctx, r, rng);
  adaptedWork(ctx);
}

export const RoutineModule = {
  id: 'routine',
  order: 52.5,
  onAgeUp: routineTick,

  actions: {
    sleep(ctx, level) {
      if (!SLEEP[level]) return;
      ensure(ctx.state).sleep = level;
      ctx.toast(`Sleep: ${SLEEP[level]}`, 'info');
    },
  },

  resolvers: {
    habitCrisis(ctx, data, optionId) {
      const { state, rng } = ctx;
      const r = ensure(state);
      const h = HABITS[data.habit];
      if (optionId === 'treatment') {
        r.habits[data.habit] = 40;
        ctx.spend(4000, `Treatment for ${h.label.toLowerCase()}`, { allowDebt: true });
        ctx.stat('stress', 6);
        return ctx.log(`You got help with your ${h.label.toLowerCase()}. The first months were the hardest of your life.`, '🏥', 'good');
      }
      if (optionId === 'cut' && rng.chance(0.4)) {
        r.habits[data.habit] = 60;
        return ctx.log(`You cut back on your own. For now, it's holding.`, '✂️', 'good');
      }
      // Denial (or a failed attempt): the habit becomes the illness.
      if (h.condition) addCondition(ctx, h.condition, { severity: 55, diagnosed: true });
      else { ctx.stat('happiness', -8); if (state.career.job) state.career.job.performance = clamp((state.career.job.performance ?? 50) - 15); }
      ctx.log(optionId === 'deny' ? 'You told everyone you were fine. You weren\'t.' : 'Cutting back didn\'t last.', h.icon, 'bad');
    },
    adapted(ctx, _data, optionId) {
      const { state } = ctx;
      const job = state.career.job;
      if (!job) return;
      if (optionId === 'desk') {
        job.adapted = true;
        job.salary = Math.round(job.salary * 0.9);
        return ctx.log(`You moved to a desk role at ${job.employer?.name ?? 'work'}. Different work, the same people.`, '🪑', 'info');
      }
      ctx.emit('career:resign', { reason: optionId === 'retire' ? 'Medical retirement' : 'Left to retrain after illness' });
      if (optionId === 'retrain') { ctx.earn(6000, 'Retraining grant'); return ctx.log('You left to retrain for work your health allows.', '🎓', 'info'); }
      ctx.log('You took medical retirement. Apply for disability benefits on the Health tab.', '🏠', 'info');
    },
  },
};
