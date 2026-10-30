/**
 * The place you live changes around you.
 *
 *   The trend    each neighbourhood drifts: up (new cafés, rising rents, old neighbours priced
 *                out) or down (shuttered shops, more crime). Owners feel it in what the house
 *                is worth; renters in the rent.
 *   Moments      the corner shop closing, a community centre opening, a block party, a petition
 *                about a tower block or a bus route.
 *   The association  the residents' association: join, and you can stand for chair — the local
 *                    voice the council listens to (a little).
 *
 * state.neighbourhood = { [regionId]: { trend, member, chair, since } }
 */
import { Random, clamp } from '../../core/Random.js';
import { housingStatus } from '../realestate/HousingEngine.js';
import { priceLevel } from '../world/Countries.js';

const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 70001 + state.character.age * 919 + 0x7a6) >>> 0);
const local = (state, n) => Math.round(n * priceLevel(state));
export function neighbourhoodOf(state) {
  const id = state.character.regionId;
  return state.neighbourhood?.[id] ?? { trend: 0, member: false, chair: false };
}
const ensure = (state) => { state.neighbourhood ??= {}; return (state.neighbourhood[state.character.regionId] ??= { trend: 0, member: false, chair: false, since: state.character.age }); };
export const trendLabel = (t) => (t >= 0.5 ? 'gentrifying fast' : t >= 0.2 ? 'on the up' : t <= -0.5 ? 'in decline' : t <= -0.2 ? 'going downhill' : 'steady');

const MOMENTS = [
  { id: 'shop', when: (n) => n.trend > 0.2, title: 'The Corner Shop Is Closing', text: 'Mr Okafor has run the shop on the corner for thirty years. The new rent is triple. A juice bar has signed the lease.', options: [{ id: 'petition', label: '✍️ Start a petition to save it' }, { id: 'shrug', label: '🤷 That\'s the city' }] },
  { id: 'centre', when: () => true, title: 'A Community Centre', text: 'The council will fund a community centre if residents show they want one.', options: [{ id: 'campaign', label: '📣 Organise the residents', hint: 'Evenings for a year' }, { id: 'skip', label: '🛋️ Someone else will' }] },
  { id: 'party', when: () => true, title: 'The Block Party', text: 'Someone has suggested closing the street for a party in the summer.', options: [{ id: 'host', label: '🎉 Help run it', hint: 'A barbecue, a bouncy castle, a road-closure form' }, { id: 'attend', label: '🍔 Just turn up' }] },
  { id: 'crime', when: (n) => n.trend < -0.2, title: 'Things Are Getting Worse', text: 'Two burglaries on your street this month, and the streetlight outside has been broken since spring.', options: [{ id: 'watch', label: '🔦 Start a neighbourhood watch' }, { id: 'council', label: '📞 Badger the council' }, { id: 'move', label: '🚚 Start thinking about moving', hint: 'From the Move tab' }] },
  { id: 'tower', when: (n) => n.trend > 0, title: 'The Development', text: 'A developer wants to build a 20-storey block where the car park is: 300 flats, 30 of them "affordable".', options: [{ id: 'support', label: '🏗️ Support it — people need homes' }, { id: 'oppose', label: '🙅 Oppose it at the planning meeting' }] },
];

export function neighbourhoodTick(main) {
  const { state } = main;
  if (state.character.age < 16 || state.legal?.incarceration) return;
  const status = housingStatus(state);
  if (!['owner', 'renting'].includes(status)) return;
  const rng = sideRng(state);
  const n = ensure(state);
  // The drift: slow, with momentum, nudged by the economy.
  const econ = state.economy?.phase === 'recession' ? -0.05 : state.economy?.phase === 'peak' ? 0.04 : 0.01;
  n.trend = Math.round(clamp(n.trend * 0.85 + rng.float(-0.12, 0.14) + econ + (n.chair ? 0.02 : 0), -1, 1) * 100) / 100;
  if (Math.abs(n.trend) >= 0.3) {
    const id = state.character.regionId;
    if (state.housing?.market?.[id] != null) state.housing.market[id] = Math.round(state.housing.market[id] * (1 + n.trend * 0.02) * 1000) / 1000;
    if (status === 'renting' && n.trend >= 0.3 && state.housing.rental && rng.chance(0.4)) {
      const rise = Math.round(state.housing.rental.rent * rng.float(0.05, 0.15));
      state.housing.rental.rent += rise;
      main.log(`The neighbourhood is ${trendLabel(n.trend)}: your landlord put the rent up by $${rise.toLocaleString()} a month.`, '🏙️', 'warn');
    }
  }
  if (!rng.chance(0.3)) return;
  // The residents' association, if you've not been asked.
  if (!n.member && !n.asked && rng.chance(0.3)) {
    n.asked = true;
    return main.prompt({ type: 'neighbourhood.event', icon: '🏘️', title: 'The Residents\' Association', text: 'A neighbour knocks with a clipboard: the residents\' association needs members, and its chair is retiring.', data: { id: 'assoc' }, options: [
      { id: 'join', label: '🙋 Join' }, { id: 'chair', label: '🗳️ Join, and stand for chair', hint: 'Meetings, emails, the council\'s ear' }, { id: 'no', label: '🙅 No thanks' },
    ] });
  }
  const pool = MOMENTS.filter((m) => m.when(n));
  const m = rng.pick(pool);
  main.prompt({ type: 'neighbourhood.event', icon: '🏘️', title: m.title, text: `${m.text}\nThe neighbourhood is ${trendLabel(n.trend)}.`, data: { id: m.id }, options: m.options });
}

export const NeighbourhoodResolvers = {
  event(ctx, data, optionId) {
    const { state, rng } = ctx;
    const n = ensure(state);
    const voice = n.chair ? 0.25 : n.member ? 0.1 : 0;
    switch (`${data.id}:${optionId}`) {
      case 'assoc:join': n.member = true; return ctx.log('You joined the residents\' association. The first meeting was about bins.', '🏘️', 'info');
      case 'assoc:chair': n.member = true; if (rng.chance(0.6)) { n.chair = true; ctx.stat('stress', 4); return ctx.log('Unopposed, you became chair of the residents\' association.', '🗳️', 'good'); } return ctx.log('You stood for chair and lost by four votes to the woman from number 12.', '🗳️', 'info');
      case 'assoc:no': return undefined;
      case 'shop:petition': if (rng.chance(0.25 + voice)) { ctx.stat('happiness', 5); return ctx.log('Three hundred signatures and a story in the local paper: the landlord blinked. The shop stays, for now.', '✍️', 'good'); } return ctx.log('The petition got 300 signatures. The shop closed anyway.', '✍️', 'warn');
      case 'shop:shrug': return ctx.log('The juice bar opened in the spring.', '🥤', 'muted');
      case 'centre:campaign': ctx.stat('stress', 3); if (rng.chance(0.4 + voice)) { n.trend += 0.05; ctx.stat('happiness', 6); return ctx.log('The community centre opened with a ribbon, a brass band and your name in the mayor\'s speech.', '🏛️', 'good'); } return ctx.log('A year of meetings; the council spent the money elsewhere.', '🏛️', 'warn');
      case 'centre:skip': return undefined;
      case 'party:host': ctx.spend(local(state, 150), 'Block party'); ctx.stat('happiness', 5); return ctx.log('The street party went on until midnight. You know everyone\'s name now.', '🎉', 'good');
      case 'party:attend': ctx.stat('happiness', 2); return ctx.log('Good burgers.', '🍔', 'info');
      case 'crime:watch': n.trend += 0.05; return ctx.log('A WhatsApp group, a few stickers in windows and a lot more eyes on the street.', '🔦', 'good');
      case 'crime:council': if (rng.chance(0.3 + voice)) { n.trend += 0.05; return ctx.log('After your fifth email, they fixed the streetlights and sent a patrol.', '📞', 'good'); } return ctx.log('The council acknowledged your complaint.', '📞', 'muted');
      case 'crime:move': return ctx.log('You started looking at other neighbourhoods.', '🚚', 'info');
      case 'tower:support': n.trend += 0.03; return ctx.log('You spoke for the development. Some neighbours stopped saying hello.', '🏗️', 'info');
      case 'tower:oppose': if (rng.chance(0.3 + voice)) return ctx.log('The planning committee turned it down. The car park stays a car park.', '🙅', 'info'); return ctx.log('It was approved. The cranes arrived in the autumn.', '🏗️', 'info');
      default: return undefined;
    }
  },
};

export const NeighbourhoodModule = { id: 'neighbourhood', order: 21.5, onAgeUp: neighbourhoodTick, resolvers: NeighbourhoodResolvers };
