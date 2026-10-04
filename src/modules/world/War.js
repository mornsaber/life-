/**
 * Wars. Every so often the country goes to war — anything from a short air
 * campaign to a great-power conflict. While it lasts, service members
 * deploy more often and see more combat, reservists get mobilized, the
 * national mood sours, an anti-war movement forms, and in the largest wars
 * Congress may bring back the draft (Selective Service registrants, 18–25).
 *
 * state.world = { war: { id, name, operation, intensity 1–3, startAge, yearsLeft, draft } | null,
 *                 history: [{ name, operation, startAge, endAge, outcome }] }
 */
import { enlistmentEligibility, enlist } from '../military/MilitaryEngine.js';

export const CONFLICTS = [
  { id: 'airCampaign', name: 'an air campaign against a rogue state\'s weapons program', intensity: 1, years: [1, 2], weight: 35 },
  { id: 'intervention', name: 'a peacekeeping intervention in a collapsing state', intensity: 1, years: [2, 5], weight: 25 },
  { id: 'regional', name: 'a regional ground war', intensity: 2, years: [3, 8], weight: 20 },
  { id: 'naval', name: 'a naval standoff in the Pacific that turned into open conflict', intensity: 2, years: [2, 4], weight: 12 },
  { id: 'major', name: 'a major war between great powers', intensity: 3, years: [3, 6], weight: 8, draftChance: 0.5 },
];
const CODENAMES = ['Iron', 'Silent', 'Northern', 'Desert', 'Steel', 'Resolute', 'Eagle', 'Crimson', 'Atlantic', 'Granite'];
const CODEWORDS = ['Shield', 'Dawn', 'Spear', 'Guardian', 'Lance', 'Harbor', 'Thunder', 'Sentinel', 'Horizon', 'Anvil'];
const OUTCOMES = ['ended in a negotiated ceasefire', 'ended in a clear victory', 'wound down into a long stalemate and a withdrawal', 'ended with an armistice nobody celebrated'];

export const WAR_START_CHANCE = 0.03;
export const DRAFT_AGES = [18, 25];
export const DRAFT_LOTTERY = 0.12;

export const atWar = (state) => Boolean(state.world?.war);
/** Multiplier on deployments and mobilizations (1 at peace). */
export const warFactor = (state) => (state.world?.war ? 1 + 0.5 * state.world.war.intensity : 1);
/** Extra odds of seeing combat on a deployment. */
export const combatFactor = (state) => (state.world?.war ? 1 + 0.15 * state.world.war.intensity : 1);

function startWar(ctx) {
  const { state, rng } = ctx;
  const total = CONFLICTS.reduce((s, c) => s + c.weight, 0);
  let roll = rng.float(0, total);
  const c = CONFLICTS.find((x) => (roll -= x.weight) <= 0) ?? CONFLICTS[0];
  const war = {
    id: c.id, name: c.name, operation: `Operation ${rng.pick(CODENAMES)} ${rng.pick(CODEWORDS)}`, intensity: c.intensity,
    startAge: state.character.age, yearsLeft: rng.int(...c.years), draft: Boolean(c.draftChance && rng.chance(c.draftChance)),
  };
  state.world.war = war;
  ctx.log(`📰 The United States went to war: ${war.name} (${war.operation}).${war.draft ? ' Congress reinstated the draft.' : ''}`, '⚔️', 'milestone');
  ctx.emit('world:war', { war });
}

function endWar(ctx) {
  const { state, rng } = ctx;
  const war = state.world.war;
  const outcome = rng.pick(OUTCOMES);
  state.world.history.push({ name: war.name, operation: war.operation, startAge: war.startAge, endAge: state.character.age, outcome });
  state.world.war = null;
  ctx.log(`📰 ${war.operation} ${outcome}.${war.draft ? ' The draft ended with it.' : ''}`, '🕊️', 'milestone');
  ctx.stat('happiness', 3);
  ctx.emit('world:peace', { war });
}

function draftCheck(ctx) {
  const { state, rng } = ctx;
  const age = state.character.age;
  if (state.character.gender !== 'male' || age < DRAFT_AGES[0] || age > DRAFT_AGES[1]) return;
  if (state.military.service || state.legal.incarceration || state.prompts.some((p) => p.type === 'world.draft')) return;
  if (state.world.deferredAge === age) return;
  if (!rng.chance(DRAFT_LOTTERY)) return;
  const enrolled = Boolean(state.education.enrolled);
  ctx.prompt({
    type: 'world.draft', icon: '📨', title: 'Order to Report for Induction',
    text: `Your number came up in the Selective Service lottery. You are ordered to report for induction into the U.S. Army for the duration of ${state.world.war.operation}.`,
    options: [
      { id: 'report', label: '🪖 Report for induction' },
      enrolled ? { id: 'defer', label: '🎓 Request a student deferment', hint: 'One school year at a time' } : null,
      { id: 'objector', label: '🕊️ File as a conscientious objector', hint: 'If approved: two years of alternative civilian service' },
      { id: 'evade', label: '🏃 Don\'t show up', hint: 'A federal felony', tone: 'danger' },
    ].filter(Boolean),
  });
}

export const WarModule = {
  id: 'world',
  order: 19,

  init(state) {
    state.world ??= { war: null, history: [] };
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const w = state.world;
    if (!w.war) {
      if (state.character.age >= 5 && rng.chance(WAR_START_CHANCE)) startWar(ctx);
      return;
    }
    w.war.yearsLeft -= 1;
    if (w.war.yearsLeft <= 0) return endWar(ctx);
    if (w.war.intensity >= 2) {
      ctx.stat('happiness', -1);
      ctx.stat('stress', 1);
    }
    if (rng.chance(0.4)) ctx.log(`📰 ${w.war.operation}: ${rng.pick(['casualty reports dominate the evening news', 'another wave of troops shipped out', 'protests outside the federal building', 'a hometown soldier came home in a flag-draped coffin', 'gas prices jumped on war news', 'yellow ribbons on every porch on your street'])}.`, '⚔️');
    if (w.war.draft && state.character.age >= 18) draftCheck(ctx);
  },

  resolvers: {
    draft(ctx, _data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'defer' && state.education.enrolled) {
        state.world.deferredAge = state.character.age;
        return ctx.log('Your student deferment was granted for this school year.', '🎓', 'good');
      }
      if (optionId === 'objector') {
        if (rng.chance(0.55)) {
          ctx.stat('stress', 6);
          return ctx.log('The draft board classified you 1-O: two years of alternative civilian service at a VA hospital instead of military service.', '🕊️', 'good');
        }
        ctx.log('The draft board rejected your conscientious-objector claim.', '📭', 'warn');
      }
      if (optionId === 'evade') {
        ctx.log('You didn\'t report for induction. The FBI opened a file.', '🏃', 'bad');
        ctx.emit('legal:offense', { offenseId: 'draftEvasion', context: 'failing to report for induction', caught: rng.chance(0.4), evidence: 0.8 });
        return;
      }
      const check = enlistmentEligibility(state, 'army', 'enlisted', 'active');
      if (!check.ok) return ctx.log(`You reported for your induction physical and were classified 4-F (${check.reason}).`, '🩺');
      const e = state.education.enrolled;
      if (e) {
        state.education.enrolled = null;
        ctx.emit('education:left', { reason: 'drafted', enrollment: e });
      }
      if (enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry' })) {
        state.military.service.contractYearsLeft = 2;
        state.military.service.drafted = true;
        ctx.log('You were drafted into the Army for two years.', '🪖', 'milestone');
      }
    },
  },
};
