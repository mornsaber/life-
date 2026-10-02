/**
 * Legal domain module: crime, courts, prison, investigations, diplomatic
 * immunity and job misconduct. While incarcerated, most actions are blocked.
 */
import { commitOffense, justiceTick, JusticeResolvers } from './JusticeSystem.js';
import { temptationTick, resolveTemptation, RiskyActions, RISKY_ACTIONS } from './Misconduct.js';

const ALLOWED_IN_PRISON = new Set(['retirement.claimSocialSecurity', 'retirement.withdraw']);

export const LegalModule = {
  id: 'legal',
  order: 35,

  init(state) {
    state.legal ??= { record: [], investigations: [], incarceration: null, probationYears: 0, flags: {} };
  },

  setup(engine) {
    engine.bus.on('legal:offense', ({ ctx, offenseId, context, caught, discovery, evidence, yearsLeft }) => commitOffense(ctx, { offenseId, context, caught, discovery, evidence, yearsLeft }));
  },

  guard(state, actionId) {
    if (state.legal.incarceration && !ALLOWED_IN_PRISON.has(actionId)) return 'You\'re incarcerated.';
    if (actionId.startsWith('legal.')) {
      const risky = RISKY_ACTIONS.find((r) => `legal.${r.id}` === actionId);
      if (risky && state.character.age < risky.minAge) return `Too young (${risky.minAge}+).`;
    }
    return null;
  },

  onAgeUp(ctx) {
    justiceTick(ctx);
    if (!ctx.state.legal.incarceration) temptationTick(ctx);
  },

  actions: { ...RiskyActions },

  resolvers: {
    ...JusticeResolvers,
    temptation: resolveTemptation,
  },
};

export { OFFENSES, SEVERITY_LABEL } from './Offenses.js';
export { RISKY_ACTIONS };
