/**
 * Going straight.
 *
 * Deciding to stop is one choice; staying stopped is years. Going straight cuts your ties to the
 * street: the trade, the crew, the detective on the payroll, the weapon. Heat and street
 * reputation fall away, old cases cool faster, and the people who used to call stop calling —
 * mostly. Each year there's a pull back (an old friend with an easy job, money trouble), and
 * after five clean years you're reformed in employers' eyes: old convictions weigh half as much
 * (CareerEngine.backgroundCheck), and they become spent on their own (Clemency.spendOldConvictions).
 *
 * state.legal.crime.straightSince = age   (null: not trying)
 */
import { clamp } from '../../core/Random.js';
import { crimeOf } from '../legal/StreetCrime.js';
import { meOf } from '../legal/Underworld.js';
import { priceLevel } from '../world/Countries.js';

export const REFORMED_AFTER = 5;
export const isReformed = (state) => state.legal.crime?.straightSince != null && state.character.age - state.legal.crime.straightSince >= REFORMED_AFTER;

export const ReformActions = {
  goStraight(ctx) {
    const { state } = ctx;
    const c = crimeOf(state);
    if (c.straightSince != null) return ctx.toast('You\'re already going straight', 'warn');
    if (meOf(state)) return ctx.toast('Leave your outfit first (Underworld tab) — that is its own story', 'warn');
    c.straightSince = state.character.age;
    if (c.drugs) Object.assign(c.drugs, { stash: 0, runners: 0, lab: null, laced: false, territory: 0 });
    c.youthGang = null;
    c.cop = null;
    c.armed = null;
    c.heat = Math.round(c.heat * 0.5);
    c.rep = Math.round((c.rep ?? 0) * 0.5);
    ctx.stat('happiness', 4);
    ctx.log('You decided you were done. You changed your number, stopped going where you used to go, got rid of what you had, and told the people who needed telling.', '🌅', 'milestone');
  },
};

/** Yearly: the pull back, and the slow rewards of staying out. */
export function reformTick(ctx) {
  const { state, rng } = ctx;
  const c = state.legal.crime;
  if (c?.straightSince == null || state.legal.incarceration) return;
  // Any new conviction since you went straight ends the attempt.
  if (state.legal.record.some((r) => r.age > c.straightSince && ['misdemeanor', 'felony'].includes(r.severity))) {
    c.straightSince = null;
    return ctx.log('That was the end of going straight — for now.', '🥀', 'bad');
  }
  const years = state.character.age - c.straightSince;
  c.heat = Math.round(c.heat * 0.5);
  c.rep = Math.max(0, Math.round((c.rep ?? 0) * 0.8));
  for (const inv of state.legal.investigations) inv.discovery = clamp(inv.discovery * 0.85, 0.01, 0.9);
  if (years === REFORMED_AFTER) {
    ctx.log(`Five years clean. A probation officer once told you most people who stop for five years stop for good. Employers see a past, not a pattern.`, '🌱', 'milestone');
    ctx.stat('happiness', 8);
  }
  if (years < REFORMED_AFTER && rng.chance(0.15)) {
    const cash = Math.round(rng.int(3000, 15000) * priceLevel(state));
    ctx.prompt({
      type: 'crime.pull', icon: '📞', title: 'An Old Friend Calls',
      text: `Someone from before has an easy one: one night, $${cash.toLocaleString()}, no risk. "Just like old times."`,
      options: [
        { id: 'no', label: '🙅 Hang up', hint: 'It gets easier' },
        { id: 'yes', label: '💰 One last job', tone: 'danger', illegal: 'a burglary' },
      ],
      data: { cash },
    });
  }
}

export const ReformResolvers = {
  pull(ctx, data, optionId) {
    const { state } = ctx;
    const c = crimeOf(state);
    if (optionId === 'no') { ctx.stat('stress', -2); return ctx.log('You hung up. Your hands were shaking a bit, and you were proud of that.', '🙅', 'good'); }
    c.straightSince = null;
    ctx.earn(data.cash, 'Undisclosed income');
    ctx.log('One last job. That\'s what everyone says.', '💰', 'warn');
    ctx.emit('legal:offense', { offenseId: 'burglary', discovery: 0.25, evidence: 0.75, context: 'one last job with an old crew' });
  },
};
