/**
 * Legal domain module: crime, courts, prison, investigations, diplomatic
 * immunity and job misconduct. While incarcerated, most actions are blocked.
 */
import { commitOffense, justiceTick, JusticeResolvers } from './JusticeSystem.js';
import { temptationTick, resolveTemptation, RiskyActions, RISKY_ACTIONS } from './Misconduct.js';
import { PrisonActions } from './Prison.js';
import { ClemencyActions, spendMinorRecords } from './Clemency.js';
import { CrimeActions, crimeTick } from './StreetCrime.js';
import { JuvenileResolvers } from './JuvenileCourt.js';

/** Prompt choices that break the law, by `${promptType}:${optionId}`. */
const ILLEGAL_CHOICES = {
  'investing.pump:promote': 'securities fraud',
  'housing.financing:fraud': 'mortgage fraud',
  'politics.donorFavor:straw': 'campaign finance fraud',
  'politics.bribe:take': 'bribery',
  'politics.appoint:donor': 'selling an appointment',
  'business.temptation:take': 'a business crime',
  // '?': only when the choice is flagged as dangerous (leaving a clean history off a form is no crime).
  'career.clearance:omit': '?lying on a security form',
  'military.clearance:omit': '?lying on a security form',
  'people.foreignContact:hide': 'lying on a security form',
  'intel.polygraph:beat': 'lying to federal investigators',
  'world.draft:evade': 'draft evasion',
  'contractors.mercenary:accept': 'mercenary activity',
  'conscription.korea:refuse': 'refusing military service',
  'career.organizingDrive:fire': 'illegal retaliation against organizers',
  'medLife.pillMill:accept': 'prescription fraud',
  'military.leaveService:desert': 'desertion',
};

const ALLOWED_IN_PRISON = new Set(['crime.amends', 'retirement.claimSocialSecurity', 'retirement.withdraw', 'legal.seekPardon', ...Object.keys(PrisonActions).map((id) => `legal.${id}`)]);

export const LegalModule = {
  id: 'legal',
  order: 35,

  init(state) {
    state.legal ??= { record: [], investigations: [], incarceration: null, probationYears: 0, flags: {} };
    state.legal.fugitive ??= null;
  },

  setup(engine) {
    // Choices elsewhere in the game that commit a crime: labeled as illegal wherever they appear.
    Object.assign(engine.illegalChoices, ILLEGAL_CHOICES);
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
    crimeTick(ctx);
    spendMinorRecords(ctx);
    if (!ctx.state.legal.incarceration) temptationTick(ctx);
  },

  actions: { ...RiskyActions, ...CrimeActions, ...PrisonActions, ...ClemencyActions },

  resolvers: {
    ...JusticeResolvers,
    ...JuvenileResolvers,
    temptation: resolveTemptation,
  },
};

export { OFFENSES, SEVERITY_LABEL } from './Offenses.js';
export { RISKY_ACTIONS };
export { CRIME_GROUPS, crimeOf, TASK_FORCE_HEAT } from './StreetCrime.js';
