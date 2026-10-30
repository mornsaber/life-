/**
 * Natural disasters by state. Each year your state's hazard profile is
 * rolled; a disaster emits `disaster:struck`, and each domain responds:
 *   housing      property damage, insurance claims, market dip
 *   emergency    volunteer fire / SAR callouts
 *   military     National Guard activation by the governor
 *   municipal    city budget shock
 *   politics     governor/mayor emergency response
 *
 * Choices. A hurricane, wildfire, flood or blizzard comes with a warning: evacuate (a motel and
 * fuel, but safe), go to a public shelter (free, miserable), or stay and defend the house
 * (boarded windows and cleared brush save some of it, at a real risk to you). Earthquakes and
 * tornadoes give no warning. The aftermath — insurance claims, aid, rebuilding or selling — is
 * in realestate/HousingEngine.js.
 */
import { stateIdOf, regionOf } from './Regions.js';
import { STATES, DISASTER_LABEL } from './States.js';
import { mitigates } from '../career/engines/EmergencyMgmt.js';
import { COUNTRIES } from '../world/Countries.js';
import { climateFactor, isWeather } from './ClimateMigration.js';

const SEVERITY = ['', 'moderate', 'severe', 'catastrophic'];
/** Hazards that come with a warning. */
export const FORECAST = ['hurricane', 'wildfire', 'flood', 'blizzard'];
const WARNING = {
  hurricane: 'The forecast cone is over you: landfall in two days. Coastal evacuations have been ordered.',
  wildfire: 'The fire jumped the ridge overnight. Your neighbourhood is under an evacuation warning.',
  flood: 'The river is forecast to crest four feet above flood stage tomorrow night.',
  blizzard: 'A blizzard warning: two feet of snow and hurricane-force winds for three days.',
};
const STAY = { hurricane: '🪚 Board up and ride it out', wildfire: '🧯 Clear the brush and defend the house', flood: '🧱 Sandbag and stay', blizzard: '🏠 Hunker down at home' };
/** Injury and death risk from staying, by severity. */
const STAY_RISK = [[0, 0], [0.05, 0], [0.18, 0.004], [0.35, 0.03]];
const aidName = (state) => ((state.character.countryId ?? 'US') === 'US' ? 'FEMA' : `${COUNTRIES[state.character.countryId]?.name ?? 'the national'} disaster relief`);

export const Disasters = {
  id: 'disasters',
  order: 3,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const stateId = stateIdOf(state);
    for (const [type, p] of Object.entries(STATES[stateId].disasters)) {
      // Weather disasters grow a little more likely every year (ClimateMigration.js).
      if (!rng.chance(isWeather(type) ? p * climateFactor(state) : p)) continue;
      let severity = rng.weighted([[1, 6], [2, 3], [3, 1]], ([, w]) => w)[0];
      // Mitigation you built as an emergency manager takes the edge off.
      const softened = severity > 1 && mitigates(state, type);
      if (softened) severity -= 1;
      const label = DISASTER_LABEL[type];
      const name = `${type === 'hurricane' ? `Hurricane ${rng.pick(['Alma', 'Bertrand', 'Celia', 'Dorian', 'Esme', 'Felix', 'Greta'])}` : label.name}`;
      const disaster = { type, severity, stateId, regionId: regionOf(state).id, name };
      ctx.log(`${label.icon} A ${SEVERITY[severity]} ${type} struck ${STATES[stateId].name}: ${name}.`, label.icon, 'warn');
      if (softened) ctx.log(`The ${type} mitigation you built held: it could have been much worse.`, '🏗️', 'good');
      if (state.legal.incarceration) {
        ctx.emit('disaster:struck', { disaster });
        return;
      }
      // A warning: choose before it hits. (Children go where their family goes.)
      if (FORECAST.includes(type) && state.character.age >= 16 && !state.prompts.some((p) => p.type === 'disasters.warning')) {
        const cost = evacuationCost(state, severity);
        ctx.prompt({
          type: 'disasters.warning', icon: label.icon, title: `${name}: ${SEVERITY[severity]}`,
          text: WARNING[type],
          options: [
            { id: 'evacuate', label: `🚗 Evacuate (≈$${cost.toLocaleString()})`, hint: 'Safe; the house takes its chances' },
            { id: 'shelter', label: '🏫 Go to a public shelter', hint: 'Free; cots in a school gym' },
            { id: 'stay', label: STAY[type], hint: severity >= 3 ? 'Saves some of the house — a real risk to your life' : 'Saves some of the house; some risk to you', tone: severity >= 3 ? 'danger' : undefined },
          ],
          data: { disaster, cost },
        });
        return;
      }
      if (severity === 3 && rng.chance(0.1)) {
        ctx.stat('health', -rng.int(5, 20));
        ctx.log('You were hurt in the chaos.', '🩹', 'bad');
      }
      ctx.emit('disaster:struck', { disaster });
      afterStrike(ctx, disaster);
      return; // one major disaster per year is plenty
    }
  },

  resolvers: {
    /** The warning: go, shelter, or stay — then it hits. */
    warning(ctx, data, optionId) {
      const { state, rng } = ctx;
      const disaster = { ...data.disaster, stance: optionId };
      const sev = disaster.severity;
      if (optionId === 'evacuate') {
        ctx.spend(data.cost, `Evacuation — ${disaster.name}`, { allowDebt: true });
        ctx.stat('stress', 4);
        ctx.log(`You loaded the car and drove inland with everyone else. ${sev >= 3 ? 'From a motel two hundred miles away, you watched it on the news.' : 'A few nights in a motel.'}`, '🚗', 'info');
      } else if (optionId === 'shelter') {
        ctx.stat('stress', 6 + sev * 2);
        ctx.log(`You spent ${sev >= 2 ? 'a week' : 'three nights'} on a cot in a school gym with a few hundred neighbours and the Red Cross.`, '🏫', 'info');
      } else {
        const kit = state.disasterPrep?.kit ? 0.6 : 1;
        const [hurt, killed] = STAY_RISK[sev].map((x) => x * kit);
        if (rng.chance(killed)) {
          ctx.log(`You stayed to save the house. ${disaster.name} took you with it.`, '🪦', 'bad');
          ctx.die(`killed in ${disaster.name}`);
          return undefined;
        }
        if (rng.chance(hurt)) {
          ctx.stat('health', -rng.int(8, 25));
          ctx.log('You stayed, and were badly hurt when it hit.', '🩹', 'bad');
        } else ctx.log('You stayed and fought for the house. It was the longest night of your life.', '🏠', 'warn');
        ctx.stat('stress', 8);
      }
      ctx.emit('disaster:struck', { disaster });
      afterStrike(ctx, disaster);
      return undefined;
    },
    /** Spared yourself: what you do for the people who weren't. */
    help(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'volunteer') {
        ctx.stat('happiness', 4);
        ctx.stat('fitness', 1);
        ctx.stat('stress', 2);
        ctx.log(rng.pick(['You spent two weekends mucking out flooded basements with strangers who are friends now.', 'You hauled debris, handed out water and slept well for the first time in weeks.', 'You cooked for a shelter for a week. Someone\'s grandmother taught you her chili.']), '🤝', 'good');
      } else if (optionId === 'donate') {
        const gift = data.gift;
        if (ctx.spend(gift, `Donation — ${data.name} relief`, { allowDebt: false })) {
          if (state.community) state.community.givenThisYear = (state.community.givenThisYear ?? 0) + gift;
          ctx.stat('happiness', 2);
          ctx.log(`You gave $${gift.toLocaleString()} to the relief fund.`, '💝', 'good');
        }
      } else ctx.log('You were lucky, and got on with your year.', '🙂');
      return undefined;
    },
  },
};

/** Spared, and over 16: a chance to help. */
function afterStrike(ctx, disaster) {
  const { state, rng } = ctx;
  if (!state.character.alive || state.character.age < 16 || state.legal.incarceration) return;
  if (state.disasterPrep?.cert) {
    ctx.stat('happiness', 3);
    ctx.log(`Your community emergency response team was activated for ${disaster.name}: you checked on the elderly neighbours, shut off gas mains and ran the street's first-aid point until the professionals got through.`, '🦺', 'good');
  }
  if (state.prompts.some((p) => p.type === 'housing.disasterClaim' || p.type === 'disasters.help') || !rng.chance(0.6)) return;
  const gift = Math.max(50, Math.min(2000, Math.round(state.finances.cash * 0.02 / 50) * 50));
  ctx.prompt({
    type: 'disasters.help', icon: '🤝', title: `After ${disaster.name}`,
    text: `Your street came through, but ${disaster.severity >= 2 ? 'whole neighbourhoods across town did not' : 'others weren\'t so lucky'}.`,
    options: [
      { id: 'volunteer', label: '🧤 Volunteer in the clean-up' },
      { id: 'donate', label: `💝 Donate $${gift.toLocaleString()} to the relief fund`, disabled: state.finances.cash < gift },
      { id: 'carryOn', label: '🙂 Carry on' },
    ],
    data: { name: disaster.name, gift },
  });
}

/** Fuel, a motel and meals away from home, longer for a bigger storm. */
export const evacuationCost = (state, severity) => Math.round((250 + severity * 450) * (state.character.countryId && state.character.countryId !== 'US' ? 0.8 : 1) * (state.disasterPrep?.kit ? 0.8 : 1) / 10) * 10;
export { aidName };
