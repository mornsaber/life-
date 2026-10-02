/**
 * Natural disasters by state. Each year your state's hazard profile is
 * rolled; a disaster emits `disaster:struck`, and each domain responds:
 *   housing      property damage, insurance claims, market dip
 *   emergency    volunteer fire / SAR callouts
 *   military     National Guard activation by the governor
 *   municipal    city budget shock
 *   politics     governor/mayor emergency response
 */
import { stateIdOf, regionOf } from './Regions.js';
import { STATES, DISASTER_LABEL } from './States.js';

const SEVERITY = ['', 'moderate', 'severe', 'catastrophic'];

export const Disasters = {
  id: 'disasters',
  order: 3,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const stateId = stateIdOf(state);
    for (const [type, p] of Object.entries(STATES[stateId].disasters)) {
      if (!rng.chance(p)) continue;
      const severity = rng.weighted([[1, 6], [2, 3], [3, 1]], ([, w]) => w)[0];
      const label = DISASTER_LABEL[type];
      const name = `${type === 'hurricane' ? `Hurricane ${rng.pick(['Alma', 'Bertrand', 'Celia', 'Dorian', 'Esme', 'Felix', 'Greta'])}` : label.name}`;
      const disaster = { type, severity, stateId, regionId: regionOf(state).id, name };
      ctx.log(`${label.icon} A ${SEVERITY[severity]} ${type} struck ${STATES[stateId].name}: ${name}.`, label.icon, 'warn');
      if (state.legal.incarceration) continue;
      if (severity === 3 && rng.chance(0.1)) {
        ctx.stat('health', -rng.int(5, 20));
        ctx.log('You were hurt in the chaos.', '🩹', 'bad');
      }
      ctx.emit('disaster:struck', { disaster });
      return; // one major disaster per year is plenty
    }
  },
};
