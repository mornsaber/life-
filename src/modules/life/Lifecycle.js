/**
 * Ageing, childhood milestones, stress from competing commitments and
 * mortality. Runs first each year (order 0) and checks for death last.
 */
import { commitmentLoad, getCommitments } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { pickFresh, eligible } from '../../core/Pools.js';
import { healthMortality, DEATH_CAUSE } from '../health/Conditions.js';

const CHILDHOOD_EVENTS = [
  { minAge: 1, maxAge: 3, text: 'You said your first word. It was "no."', icon: '🗣️', stats: { smarts: 2, happiness: 2 } },
  { minAge: 1, maxAge: 4, text: 'You took your first wobbly steps across the living room.', icon: '👣', stats: { fitness: 2, happiness: 2 } },
  { minAge: 2, maxAge: 5, text: 'You drew on the living room wall with permanent marker.', icon: '🖍️', stats: { happiness: 2 } },
  { minAge: 2, maxAge: 6, text: 'You got the chickenpox and missed a week of preschool.', icon: '🤒', stats: { health: -3 } },
  { minAge: 3, maxAge: 9, text: 'You learned to ride a bike after skinning both knees.', icon: '🚲', stats: { fitness: 3, happiness: 3 } },
  { minAge: 3, maxAge: 8, text: 'You learned to swim at the community pool.', icon: '🏊', stats: { fitness: 3, happiness: 2 } },
  { minAge: 4, maxAge: 12, text: 'You read every book in the school library series.', icon: '📚', stats: { smarts: 4 } },
  { minAge: 5, maxAge: 10, text: 'You lost your first tooth and the tooth fairy left $5.', icon: '🦷', stats: { happiness: 2 } },
  { minAge: 5, maxAge: 12, text: 'Your best friend moved across the country.', icon: '📦', stats: { happiness: -5 } },
  { minAge: 5, maxAge: 12, text: 'You won the class spelling bee.', icon: '🐝', stats: { smarts: 3, happiness: 3 } },
  { minAge: 6, maxAge: 14, text: 'You broke your arm falling off the monkey bars.', icon: '🩹', stats: { health: -6, happiness: -4 } },
  { minAge: 6, maxAge: 12, text: 'You started piano lessons. Your family endured them.', icon: '🎹', stats: { smarts: 2 } },
  { minAge: 6, maxAge: 13, text: 'You joined a Little League team and hit your first home run.', icon: '⚾', stats: { fitness: 3, happiness: 4 } },
  { minAge: 7, maxAge: 12, text: 'You built a tree fort with the neighborhood kids.', icon: '🌳', stats: { happiness: 4, fitness: 1 } },
  { minAge: 7, maxAge: 13, text: 'Your grandparent passed away. You remember their kitchen.', icon: '🕯️', stats: { happiness: -6 } },
  { minAge: 8, maxAge: 17, text: 'You made the school sports team.', icon: '🏅', stats: { fitness: 5, happiness: 4 } },
  { minAge: 8, maxAge: 14, text: 'You were cast as the lead in the school play.', icon: '🎭', stats: { looks: 2, happiness: 4 } },
  { minAge: 9, maxAge: 15, text: 'You got glasses. Everything was suddenly sharp.', icon: '👓', stats: { smarts: 1, looks: -1 } },
  { minAge: 10, maxAge: 17, text: 'You won the regional science fair.', icon: '🔬', stats: { smarts: 5, happiness: 3 } },
  { minAge: 10, maxAge: 16, text: 'You learned to code from YouTube videos.', icon: '💻', stats: { smarts: 4 } },
  { minAge: 11, maxAge: 16, text: 'Your parents went through a rough divorce.', icon: '💔', stats: { happiness: -8, stress: 6 } },
  { minAge: 11, maxAge: 17, text: 'You got braces. Two years of metal smiles.', icon: '😬', stats: { looks: -2 } },
  { minAge: 12, maxAge: 17, text: 'You had an awkward growth spurt.', icon: '📏', stats: { looks: -3 } },
  { minAge: 12, maxAge: 17, text: 'You started babysitting for the neighbors.', icon: '🍼', stats: { happiness: 2 } },
  { minAge: 13, maxAge: 17, text: 'You joined the Civil Air Patrol cadets.', icon: '✈️', stats: { fitness: 3, smarts: 2 } },
  { minAge: 13, maxAge: 17, text: 'You got your heart broken for the first time.', icon: '💔', stats: { happiness: -5 } },
  { minAge: 13, maxAge: 17, text: 'You got a part-time job bagging groceries.', icon: '🛒', stats: { happiness: 1 } },
  { minAge: 14, maxAge: 17, text: 'You glowed up over the summer.', icon: '✨', stats: { looks: 6, happiness: 3 } },
  { minAge: 14, maxAge: 17, text: 'You made varsity as a sophomore.', icon: '🏆', stats: { fitness: 4, happiness: 4 } },
  { minAge: 15, maxAge: 17, text: 'You went to prom. The photos are mortifying.', icon: '🕺', stats: { happiness: 4 } },
  { minAge: 15, maxAge: 17, text: 'You pulled your first all-nighter studying for the SAT.', icon: '📝', stats: { smarts: 3, stress: 4 } },
];

function applyStats(ctx, stats) {
  for (const [key, delta] of Object.entries(stats)) ctx.stat(key, delta);
}

/** Yearly background death risk by age (before named conditions and poor health). */
export function backgroundMortality(age) {
  const young = age >= 15 && age < 40 ? 0.0006 : 0;
  return young + (age >= 25 ? 0.0009 * Math.exp(0.085 * (age - 40)) : 0.0002);
}

/** Causes for background deaths, weighted like U.S. cause-of-death shares by age. */
const BACKGROUND_CAUSES = [
  { cause: 'Heart attack', weight: (a) => (a < 35 ? 0.05 : 0.32) },
  { cause: 'Cancer', weight: (a) => (a < 35 ? 0.1 : 0.3) },
  { cause: 'Stroke', weight: (a) => (a < 45 ? 0.02 : 0.1) },
  { cause: 'Car accident', weight: (a) => (a < 30 ? 0.35 : 0.04) },
  { cause: 'Accidental fall', weight: (a) => (a < 65 ? 0.01 : 0.06) },
  { cause: 'Accident', weight: (a) => (a < 40 ? 0.25 : 0.05) },
  { cause: 'Respiratory illness', weight: (a) => (a < 50 ? 0.02 : 0.08) },
  { cause: 'Kidney failure', weight: (a) => (a < 50 ? 0.01 : 0.03) },
];

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
        const event = pickFresh(rng, state, 'childhood', eligible(CHILDHOOD_EVENTS, state), { idOf: (e) => e.text });
        if (event) {
          ctx.log(event.text, event.icon);
          applyStats(ctx, event.stats);
        }
      }
    }

    // Ageing
    if (age > 30) ctx.stat('fitness', -rng.int(0, 2));
    if (age > 40) ctx.stat('health', -rng.int(0, 2));
    if (age > 60) ctx.stat('health', -rng.int(0, age > 75 ? 4 : 2));
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

    // Background mortality: a Gompertz curve shaped like U.S. life tables
    // (≈1%/yr at 60, ≈2.5% at 70, ≈6% at 80). Diagnosed conditions add their
    // own named risk on top, so the background carries ~60% of the total.
    let risk = backgroundMortality(age);
    if (health < 25) risk += (25 - health) * 0.008;
    if (age >= 110) risk = 1;
    const conditions = state.health ? healthMortality(state) : { total: 0, parts: [] };
    if (!rng.chance(risk + conditions.total)) return;
    let roll = rng.float(0, risk + conditions.total);
    for (const p of conditions.parts) {
      if ((roll -= p.risk) <= 0) return ctx.die(DEATH_CAUSE[p.id] ?? 'Illness');
    }
    ctx.die(age >= 85 ? 'Old age' : rng.weighted(BACKGROUND_CAUSES, (c) => c.weight(age)).cause);
  },
};
