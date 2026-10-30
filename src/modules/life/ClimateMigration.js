/**
 * When the disasters keep coming. In a state hit again and again, insurers pull back, buyers
 * stay away and prices sag; governments start buying out the homes most at risk. And the
 * hazards themselves creep up decade by decade.
 *
 *   The pattern   two or more disasters in eight years where you live: house prices there drop,
 *                 and the question comes — stay and adapt (raise the house, a sea wall, a fire
 *                 break), take the government buyout and leave, or stay as you are.
 *   The trend     every year past 2025 nudges the odds of fire, flood and storm a little higher.
 *
 * state.climate = { strikes: [{ age, stateId, type, severity }], asked }
 */
import { Random } from '../../core/Random.js';
import { currentYear } from '../../core/State.js';
import { stateIdOf, REGIONS, regionsInState } from './Regions.js';
import { STATES } from './States.js';
import { priceLevel } from '../world/Countries.js';

/** How much more likely a weather disaster is than in 2025. */
export const climateFactor = (state) => Math.min(1.4, 1 + Math.max(0, currentYear(state) - 2025) * 0.005);
const WEATHER = ['hurricane', 'wildfire', 'flood', 'blizzard', 'tornado'];
export const isWeather = (type) => WEATHER.includes(type);

const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 11117 + state.character.age * 389 + 0xc11) >>> 0);
const home = (state) => (state.housing?.properties ?? []).find((p) => p.use === 'primary' && REGIONS[p.regionId]?.state === stateIdOf(state));
const recent = (state) => (state.climate?.strikes ?? []).filter((s) => s.stateId === stateIdOf(state) && state.character.age - s.age <= 8 && s.severity >= 2);

export function climateTick(main) {
  const { state } = main;
  const c = state.climate;
  if (!c || state.character.age < 18) return;
  const hits = recent(state);
  if (hits.length < 2 || (c.asked != null && state.character.age - c.asked < 6)) return;
  c.asked = state.character.age;
  // The market notices before you do.
  for (const r of regionsInState(stateIdOf(state))) if (state.housing.market[r.id] != null) state.housing.market[r.id] = Math.round(state.housing.market[r.id] * 0.92 * 1000) / 1000;
  const h = home(state);
  const where = STATES[stateIdOf(state)]?.name ?? 'your region';
  main.log(`${hits.length} serious disasters in ${hits.length > 2 ? 'under ' : ''}eight years: buyers are wary of ${where}, and prices are slipping.`, '🌡️', 'warn');
  if (!h) return;
  const type = hits.at(-1).type;
  main.prompt({ type: 'climateMigration.decide', icon: '🌡️', title: 'Stay or Go?', text: `Your ${h.typeName.toLowerCase()} has been through ${hits.length} disasters. The insurer has raised your premium again, and the government is offering to buy out homes in the worst-hit areas.`, data: { propertyId: h.id, type }, options: [
    { id: 'adapt', label: type === 'flood' || type === 'hurricane' ? '🏗️ Raise the house on stilts' : type === 'wildfire' ? '🔥 Rebuild with fire-resistant materials' : '🏗️ Storm-proof the house', hint: `≈$${Math.round(60000 * priceLevel(state)).toLocaleString()}` },
    { id: 'buyout', label: '🏛️ Take the government buyout and move', hint: 'At the pre-disaster value' },
    { id: 'stay', label: '🏡 Stay as you are' },
  ] });
}

export const ClimateResolvers = {
  decide(ctx, data, optionId) {
    const { state } = ctx;
    const p = state.housing.properties.find((x) => x.id === data.propertyId);
    if (!p) return;
    if (optionId === 'adapt') {
      ctx.spend(Math.round(60000 * priceLevel(state)), 'Adapting the house', { allowDebt: true });
      p.hardened = [...new Set([...(p.hardened ?? []), data.type])];
      p.premiumLoad = Math.max(1, (p.premiumLoad ?? 1) * 0.8);
      return ctx.log('Builders raised and strengthened the house. The insurer took a little off; the neighbours took notes.', '🏗️', 'good');
    }
    if (optionId === 'buyout') {
      p.value = Math.round(p.value / 0.85);
      p.valueAdj = (p.valueAdj ?? 1) / 0.85;
      ctx.emit('housing:sell', { propertyId: p.id });
      ctx.stat('happiness', -6);
      return ctx.log('You took the buyout. The house will be demolished and the land left to the floodplain. Find somewhere new from the Move tab.', '🏛️', 'milestone');
    }
    ctx.log('You stayed. It\'s home.', '🏡', 'info');
  },
};

export const ClimateMigrationModule = {
  id: 'climateMigration',
  order: 3.3,
  setup(engine) {
    engine.bus.on('disaster:struck', ({ ctx, disaster }) => {
      const c = (ctx.state.climate ??= { strikes: [], asked: null });
      c.strikes = [...c.strikes, { age: ctx.state.character.age, stateId: disaster.stateId, type: disaster.type, severity: disaster.severity }].slice(-12);
    });
  },
  onAgeUp: climateTick,
  resolvers: ClimateResolvers,
};
