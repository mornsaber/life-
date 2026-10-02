/**
 * Ageing, childhood milestones, stress from competing commitments and
 * mortality. Runs first each year (order 0) and checks for death last.
 */
import { commitmentLoad, getCommitments } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { healthMortality, DEATH_CAUSE } from '../health/Conditions.js';

const CHILDHOOD_EVENTS = [
  { minAge: 3, maxAge: 9, text: 'You learned to ride a bike after skinning both knees.', icon: '🚲', stats: { fitness: 3, happiness: 3 } },
  { minAge: 4, maxAge: 12, text: 'You read every book in the school library series.', icon: '📚', stats: { smarts: 4 } },
  { minAge: 6, maxAge: 14, text: 'You broke your arm falling off the monkey bars.', icon: '🩹', stats: { health: -6, happiness: -4 } },
  { minAge: 8, maxAge: 17, text: 'You made the school sports team.', icon: '🏅', stats: { fitness: 5, happiness: 4 } },
  { minAge: 10, maxAge: 17, text: 'You won the regional science fair.', icon: '🔬', stats: { smarts: 5, happiness: 3 } },
  { minAge: 12, maxAge: 17, text: 'You had an awkward growth spurt.', icon: '📏', stats: { looks: -3 } },
  { minAge: 13, maxAge: 17, text: 'You joined the Civil Air Patrol cadets.', icon: '✈️', stats: { fitness: 3, smarts: 2 } },
  { minAge: 14, maxAge: 17, text: 'You glowed up over the summer.', icon: '✨', stats: { looks: 6, happiness: 3 } },
];

function applyStats(ctx, stats) {
  for (const [key, delta] of Object.entries(stats)) ctx.stat(key, delta);
}

export const Lifecycle = {
  id: 'life',
  order: 0,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const age = state.character.age;

    // Milestones
    if (age === 5) ctx.log('You started kindergarten.', '🎒', 'milestone');
    if (age === 14) ctx.log('You started high school.', '🏫', 'milestone');
    if (age === 18 && !state.legal.incarceration && !state.education.degrees.some((d) => d.type === 'highschool')) {
      state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: age });
      ctx.log('You graduated from high school! 🎓 Your family chipped in $2,000 to get you started.', '🎓', 'milestone');
      state.finances.cash += 2000;
      ctx.stat('happiness', 5);
    }

    // Childhood development
    if (age < 18) {
      ctx.stat('smarts', rng.int(0, 3));
      ctx.stat('fitness', rng.int(-1, 2));
      if (rng.chance(0.35)) {
        const pool = CHILDHOOD_EVENTS.filter((e) => age >= e.minAge && age <= e.maxAge);
        if (pool.length) {
          const event = rng.pick(pool);
          ctx.log(event.text, event.icon);
          applyStats(ctx, event.stats);
        }
      }
    }

    // Ageing
    if (age > 30) ctx.stat('fitness', -rng.int(0, 2));
    if (age > 40) ctx.stat('health', -rng.int(0, 2));
    if (age > 60) ctx.stat('health', -rng.int(1, 4));
    if (age > 50) ctx.stat('looks', -rng.int(0, 2));
    if (state.stats.fitness > 70) ctx.stat('health', 1);

    // Stress is driven by how many commitments you juggle.
    const load = commitmentLoad(state);
    const target = clamp(8 + load * 9, 0, 100);
    state.stats.stress = clamp(Math.round(state.stats.stress * 0.5 + target * 0.5 + rng.int(-4, 4)), 0, 100);
    if (state.stats.stress >= 75) {
      ctx.stat('happiness', -5);
      ctx.stat('health', -2);
      const names = getCommitments(state).map((c) => c.label.toLowerCase()).join(', ');
      ctx.log(`You're burning out juggling ${names}.`, '🥵', 'warn');
    } else if (state.stats.stress <= 25 && age >= 18) {
      ctx.stat('happiness', 2);
    }
  },

  onYearEnd(ctx) {
    const { state, rng } = ctx;
    const age = state.character.age;
    const health = state.stats.health;

    if (health <= 0) {
      ctx.die(age > 70 ? 'Old age' : 'Health complications');
      return;
    }

    let risk = 0;
    if (age >= 45) risk += 0.002;
    if (age >= 60) risk += 0.006 + (age - 60) * 0.002; // named diseases add their own risk (health module)
    if (age >= 80) risk += (age - 80) * 0.015;
    if (health < 25) risk += (25 - health) * 0.008;
    if (age >= 110) risk = 1;
    // Diagnosed (or silent) conditions add their own risk and name the cause.
    const conditions = state.health ? healthMortality(state) : { total: 0, parts: [] };
    if (!rng.chance(risk + conditions.total)) return;
    let roll = rng.float(0, risk + conditions.total);
    for (const p of conditions.parts) {
      if ((roll -= p.risk) <= 0) return ctx.die(DEATH_CAUSE[p.id] ?? 'Illness');
    }
    ctx.die(age >= 75 ? 'Old age' : rng.pick(['Heart attack', 'Stroke', 'Cancer', 'Car accident']));
  },
};
