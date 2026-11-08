/**
 * Hard-hat careers: union construction (carpenters, ironworkers, crane
 * operators), oil and gas drilling, commercial fishing and farm work.
 *
 *  - hazard { injury, death, cause } — yearly odds of getting hurt or killed
 *    on the job (ironworkers and fishermen have some of the highest fatality
 *    rates of any occupation).
 *  - cyclical — multiplies recession layoff risk (construction stops first).
 *  - Oil and gas follows its own boom-and-bust oil price: overtime and
 *    bonuses in a boom, mass layoffs in a bust.
 *  - Fishing crews are paid in shares of the catch: a great season pays a
 *    year's wages in months; a bad one barely covers the trip.
 *
 * state.oil = { price (index, 1 = normal), phase: 'boom'|'normal'|'bust' }
 */
import { L } from './Ladder.js';
import { unemploymentBenefit, severancePay } from '../world/CountryLaw.js';
import { Random } from '../../core/Random.js';
import { leaveJob } from './CareerEngine.js';
import { JUSTICE_EVENTS, INCIDENT_ICONS } from './JusticeCareers.js';
import { default as careersPack } from '../content/packs/careers-trades.js';

const TRADE_PROFESSIONS = careersPack.careers;

/* The careers themselves (TRADE_PROFESSIONS) live in content/packs/careers-trades.js. */

export const TRADE_EVENTS = {
  carpentry: [
    { title: 'Unsafe Scaffold', text: 'The scaffolding on the job is missing guardrails. The foreman says to work anyway.', options: [
      { id: 'refuse', label: '🛑 Refuse and call the union safety rep', perf: -2 },
      { id: 'work', label: '🪜 Work carefully', perf: 3, risk: 0.15 },
    ] },
  ],
  ironworking: [
    { title: 'Wind on the Iron', text: 'Gusts are hitting 30 mph forty stories up.', options: [
      { id: 'down', label: '⬇️ Call it and come down', perf: 1 },
      { id: 'finish', label: '🔩 Finish bolting the beam', perf: 5, risk: 0.2 },
    ] },
  ],
  craneOperator: [
    { title: 'Overloaded Pick', text: 'The rigging crew says the load is 8 tons. Your load chart says it\'s heavier.', options: [
      { id: 'stop', label: '🛑 Stop the lift and reweigh', perf: 5 },
      { id: 'pick', label: '🏗️ Make the pick', perf: 2, risk: 0.2 },
    ] },
  ],
  oilGas: [
    { title: 'Kick!', text: 'Gas is coming up the well. The driller yells for the blowout preventer.', options: [
      { id: 'shut', label: '🛑 Shut in the well by the book', perf: 7, risk: 0.1 },
      { id: 'run', label: '🏃 Get off the rig floor', perf: -3 },
    ] },
  ],
  fishing: [
    { title: 'Storm Coming', text: 'A 40-knot gale is forecast. You\'re 60% to your quota and the season closes in three days.', options: [
      { id: 'fish', label: '🎣 Keep fishing through it', perf: 7, risk: 0.25 },
      { id: 'run', label: '⚓ Run for the harbor', perf: -2 },
    ] },
  ],
  agriculture: [
    { title: 'Harvest Crunch', text: 'Rain is coming in two days and half the field is still standing.', options: [
      { id: 'night', label: '🌙 Run the combine all night', perf: 6, stress: 6, risk: 0.05 },
      { id: 'wait', label: '⏳ Get what you can and wait out the rain', perf: 1 },
    ] },
  ],
};

Object.assign(JUSTICE_EVENTS, TRADE_EVENTS);
for (const [id, p] of Object.entries(TRADE_PROFESSIONS)) INCIDENT_ICONS[id] = p.icon;

/** Oil price walk: mean-reverting with occasional shocks. */
export function oilTick(state, rng) {
  const o = state.oil;
  const shock = rng.chance(0.08) ? rng.pick([0.5, 1.7]) : 1;
  o.price = Math.round(Math.max(0.3, Math.min(2.5, (o.price + (1 - o.price) * 0.3) * Math.exp(rng.float(-0.25, 0.25)) * shock)) * 100) / 100;
  o.phase = o.price >= 1.3 ? 'boom' : o.price <= 0.7 ? 'bust' : 'normal';
  return o.phase;
}

export const TradesModule = {
  id: 'trades',
  order: 30.95,

  init(state, engineRng) {
    state.oil ??= { price: 1, phase: 'normal', seed: ((engineRng?.seed ?? 1) ^ 0x011) >>> 0 };
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const prev = state.oil.phase;
    // The world oil market runs on its own random stream, so it doesn't reshuffle every other roll in the life.
    state.oil.seed = ((state.oil.seed ?? 1) * 1664525 + 1013904223) >>> 0;
    const phase = oilTick(state, new Random(state.oil.seed));
    if (phase !== prev && phase !== 'normal') {
      // In the oil patch it's your livelihood; anywhere else it's a headline (and the price at the pump).
      const oilJob = /oil|petroleum|drill/i.test(state.career.job?.professionId ?? '');
      if (oilJob) ctx.log(phase === 'boom' ? `📰 Oil prices spiked (index ${state.oil.price}). Drilling rigs are hiring everyone they can find.` : `📰 Oil prices crashed (index ${state.oil.price}). Rigs are stacking up idle across the oil patch.`, '🛢️');
      else ctx.emit('news:story', { tier: 'world', headline: phase === 'boom' ? 'Oil prices spike' : 'Oil prices crash', weight: 3, icon: '🛢️' });
    }

    const job = state.career.job;
    const profession = job && TRADE_PROFESSIONS[job.professionId];
    if (!profession || !job.paidThisYear || state.legal.incarceration) return;

    // Danger.
    const h = profession.hazard;
    if (h && rng.chance(h.death)) {
      ctx.log(`${h.cause}. Your crew carried your coffin.`, '🕯️', 'death');
      ctx.die(h.cause);
      return;
    }
    if (h && rng.chance(h.injury)) {
      ctx.stat('health', -rng.int(8, 25));
      if (rng.chance(0.4)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(25, 60) });
      ctx.log(rng.pick(['You were hurt on the job and spent weeks on workers\' comp.', 'A dropped load clipped you. Workers\' comp covered the bills.', 'You tore your shoulder and missed half a season.']), '🩹', 'bad');
    }

    // Oil patch boom and bust.
    if (profession.oil) {
      if (state.oil.phase === 'boom') {
        const bonus = Math.round(job.salary * rng.float(0.15, 0.35) / 100) * 100;
        ctx.earn(bonus, 'Oilfield overtime & boom bonuses', { wage: true });
      } else if (state.oil.phase === 'bust' && rng.chance(job.yearsAtEmployer < 5 ? 0.35 : 0.12)) {
        leaveJob(ctx, 'Laid off in the oil bust when the rig was stacked');
        { const ui = unemploymentBenefit(ctx.state.character.countryId, job.salary); ctx.earn(ui.amount, ui.name); }
        ctx.stat('happiness', -8);
        return;
      }
    }
    // Fishing shares are paid by the season engine (engines/Seasons.js).
  },
};
