/**
 * Crime as a system, layered on the legal module (legal/): visible cases with evidence,
 * corruption, the drug supply chain, violence and guilt, gangs and the children they recruit,
 * crimes against you, and the cases the justice careers handle (the year's hard case, and the docket).
 *
 * The justice system itself (charges, courts, sentencing, prison) stays in legal/JusticeSystem.js;
 * this module hooks into it (setJusticeHooks) and adds what happens around it.
 */
import { clamp } from '../../core/Random.js';
import { setJusticeHooks, commitOffense } from '../legal/JusticeSystem.js';
import { sealJuvenileRecords } from '../legal/JuvenileCourt.js';
import { openCase, casesTick, CaseActions, CaseResolvers } from './Cases.js';
import { arrestBribe, corruptionTick, CorruptionActions, CorruptionResolvers } from './Corruption.js';
import { drugsTick, DrugActions } from './Drugs.js';
import { addGuilt, guiltTick, confrontationTick, ViolenceActions, ViolenceResolvers } from './Violence.js';
import { gangsTick, GangActions, GangResolvers } from './Gangs.js';
import { victimTick, VictimResolvers } from './Victims.js';
import { caseWorkTick, CaseWorkResolvers } from './CaseWork.js';
import { abuseTick, DomesticAbuseActions, DomesticAbuseResolvers } from './DomesticAbuse.js';
import { reformTick, ReformActions, ReformResolvers } from './Reform.js';
import { docketTick, DocketActions } from './Docket.js';
import { priceLevel } from '../world/Countries.js';
import { Random } from '../../core/Random.js';

/** The year's background rolls use their own stream, so crime never shifts the dice the rest of a life uses. */
function sideCtx(ctx) {
  if (ctx.crimeRng) return { ...ctx, rng: ctx.crimeRng };
  const f = ctx.state.legal.flags;
  f.crimeSeed = ((f.crimeSeed ?? 7) * 1664525 + 1013904223) >>> 0;
  return { ...ctx, rng: new Random(f.crimeSeed) };
}

/** Unexplained wealth: dirty money you spend is evidence. */
function dirtyMoneyTick(ctx) {
  const { state, rng } = ctx;
  const c = state.legal.crime;
  if (!c?.dirty || state.legal.incarceration) return;
  const threshold = 250000 * priceLevel(state);
  if (c.dirty < threshold || state.character.age - (c.wealthFlagged ?? -99) < 5 || !rng.chance(clamp(c.dirty / threshold / 5, 0.1, 0.5))) return;
  c.wealthFlagged = state.character.age;
  ctx.log('Your bank filed a suspicious-activity report: deposits your declared income can\'t explain.', '🏦', 'bad');
  commitOffense(ctx, { offenseId: 'moneyLaundering', discovery: 0.3, evidence: 0.7, context: 'unexplained wealth: a lifestyle your declared income can\'t pay for' });
}

export const CrimeModule = {
  id: 'crime',
  order: 36,

  setup(engine) {
    setJusticeHooks({ openCase, onArrest: arrestBribe });
    engine.bus.on('crime:guilt', ({ ctx, amount }) => addGuilt(ctx.state, amount ?? 5));
  },

  onAgeUp(main) {
    const ctx = sideCtx(main);
    sealJuvenileRecords(ctx);
    casesTick(ctx);
    reformTick(ctx);
    corruptionTick(ctx);
    drugsTick(ctx);
    dirtyMoneyTick(ctx);
    gangsTick(ctx);
    confrontationTick(ctx);
    abuseTick(ctx);
    victimTick(ctx);
    guiltTick(ctx);
    caseWorkTick(ctx);
    docketTick(ctx);
  },

  actions: { ...CaseActions, ...CorruptionActions, ...DrugActions, ...ViolenceActions, ...GangActions, ...DomesticAbuseActions, ...ReformActions, ...DocketActions },

  resolvers: { ...CaseResolvers, ...CorruptionResolvers, ...ViolenceResolvers, ...GangResolvers, ...VictimResolvers, ...CaseWorkResolvers, ...DomesticAbuseResolvers, ...ReformResolvers },
};
