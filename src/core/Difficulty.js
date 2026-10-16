/**
 * Difficulty: a preset chosen at birth that turns a set of knobs. Each knob
 * is a multiplier read at one place in the game (Normal = 1, so Normal plays
 * exactly as before):
 *
 *   income        wages and salaries                   career/Compensation
 *   costOfLiving  everyday spending                    life/Finances
 *   credit        mortgage rate spreads                realestate/MortgageSystem
 *   exams         added to licence pass odds           credentials/LicensingEngine
 *   promotion     promotion odds                       career/WorkplaceActions
 *   mortality     background death risk                life/Lifecycle
 *   justice       odds old crimes are discovered       legal/JusticeSystem
 *   recessions    surprise recessions                  economy/EconomyEngine
 *   wealth        family-of-origin wealth weights      people/PeopleEngine
 *
 * state.difficulty = { id, assisted } — heirs inherit it. You can make a life
 * easier mid-way (never harder); that marks it assisted, and an assisted life
 * scores as the easier level in the Hall of Fame.
 */

export const DIFFICULTIES = {
  story: {
    name: 'Story', icon: '📖', desc: 'Kinder breaks: better pay, cheaper living, easier exams, fewer crises.',
    knobs: { income: 1.15, costOfLiving: 0.85, credit: 0.8, exams: 0.1, promotion: 1.3, mortality: 0.7, justice: 0.8, recessions: 0.7, wealth: { low: 20, middle: 55, upper: 25 } },
    score: 0.7,
  },
  normal: {
    name: 'Normal', icon: '⚖️', desc: 'Calibrated to real-world odds.',
    knobs: {},
    score: 1,
  },
  hard: {
    name: 'Hard', icon: '🔥', desc: 'Tighter pay, dearer living and credit, stricter exams, harsher luck.',
    knobs: { income: 0.92, costOfLiving: 1.08, credit: 1.2, exams: -0.05, promotion: 0.85, mortality: 1.15, justice: 1.15, recessions: 1.25, wealth: { low: 50, middle: 45, upper: 5 } },
    score: 1.25,
  },
  brutal: {
    name: 'Brutal', icon: '💀', desc: 'Born poor, paid less, charged more; the world doesn\'t forgive.',
    knobs: { income: 0.85, costOfLiving: 1.15, credit: 1.4, exams: -0.1, promotion: 0.7, mortality: 1.3, justice: 1.3, recessions: 1.5, wealth: { low: 100, middle: 0, upper: 0 } },
    score: 1.5,
  },
};
export const DIFFICULTY_ORDER = ['story', 'normal', 'hard', 'brutal'];

/** Multiplicative knobs default to 1; additive ones (exams) to 0. */
const NEUTRAL = { exams: 0 };

export const difficultyOf = (state) => DIFFICULTIES[state?.difficulty?.id] ?? DIFFICULTIES.normal;
export const difficultyId = (state) => (DIFFICULTIES[state?.difficulty?.id] ? state.difficulty.id : 'normal');

/** A knob's value for this life (1 — or 0 for additive knobs — on Normal). */
export function knob(state, name) {
  const v = difficultyOf(state).knobs[name];
  return v ?? (name in NEUTRAL ? NEUTRAL[name] : 1);
}

/** Hall of Fame multiplier: an assisted life never scores above Normal. */
export function scoreMultiplier(state) {
  const m = difficultyOf(state).score;
  return state?.difficulty?.assisted ? Math.min(m, 1) : m;
}

/** Make the rest of this life easier (only ever easier). Returns false if it isn't. */
export function easeDifficulty(state, id) {
  const from = DIFFICULTY_ORDER.indexOf(difficultyId(state));
  const to = DIFFICULTY_ORDER.indexOf(id);
  if (to < 0 || to >= from) return false;
  state.difficulty = { id, assisted: true };
  return true;
}
