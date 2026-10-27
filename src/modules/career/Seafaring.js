/**
 * Life at sea in the merchant navy. Most of the world's ships fly a flag of convenience
 * (Panama, Liberia, the Marshall Islands, Malta, the Bahamas) and are crewed from the
 * Philippines, India, Indonesia, Ukraine and China through manning agencies.
 *
 *   The ship      You sign on to a named vessel: a bulk carrier, a container ship, a tanker
 *                 or an LNG carrier, flying a flag. Tankers and LNG pay more; container
 *                 schedules are relentless.
 *   Contracts     Seafarers from the crewing nations sign nine-month contracts through a
 *                 manning agency: months at sea, home leave, and a family who see you a few
 *                 months a year. Their pay abroad is tax-free at home (the Philippines' OFW
 *                 rule; India's non-resident rule).
 *   Danger        Piracy off Somalia, in the Gulf of Guinea and the Singapore Strait: the
 *                 citadel, a fight, or months as a hostage. Owners who go bust abandon their
 *                 crews in port, unpaid.
 *   The law       A master answers for a collision or a spill: a flag-state inquiry, a
 *                 suspended licence, and (in some ports) arrest.
 *
 * job.ship = { name, flag, type, route }; job.contract = { agency, signedOn }
 */
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';

export const FLAGS = { PA: 'Panama', LR: 'Liberia', MH: 'the Marshall Islands', MT: 'Malta', BS: 'the Bahamas', SG: 'Singapore', HK: 'Hong Kong', GR: 'Greece', NO: 'Norway' };
const OPEN_REGISTRIES = ['PA', 'LR', 'MH', 'MT', 'BS'];
/** Countries that crew the world's ships (through manning agencies). */
export const CREW_NATIONS = { PH: 'a Manila manning agency', IN: 'a Mumbai shipping company\'s crewing office', ID: 'a Jakarta crewing agency', UA: 'an Odesa crewing agency', CN: 'a Shanghai crewing company', MM: 'a Yangon manning agency', RU: 'a crewing agency in Novorossiysk', BD: 'a Chattogram manning agency', VN: 'a Haiphong crewing company' };
export const SHIP_TYPES = {
  bulk: { name: 'bulk carrier', pay: 1, icon: '⛴️' },
  container: { name: 'container ship', pay: 1.05, icon: '🚢' },
  tanker: { name: 'oil tanker', pay: 1.2, icon: '🛢️' },
  lng: { name: 'LNG carrier', pay: 1.35, icon: '🧊' },
  carCarrier: { name: 'car carrier', pay: 1, icon: '🚗' },
};
const ROUTES = [
  { id: 'aden', name: 'Suez–Gulf of Aden–Singapore', piracy: 0.012 },
  { id: 'guinea', name: 'the West African coast (Gulf of Guinea)', piracy: 0.02 },
  { id: 'malacca', name: 'the Singapore Strait', piracy: 0.006 },
  { id: 'pacific', name: 'the trans-Pacific', piracy: 0 },
  { id: 'atlantic', name: 'the North Atlantic', piracy: 0 },
  { id: 'cape', name: 'round the Cape of Good Hope', piracy: 0.002 },
];
const SHIP_NAMES = ['Ocean Pioneer', 'Star Harmony', 'Pacific Grace', 'Nordic Dawn', 'Maersk Elba', 'Golden Venture', 'Atlantic Crown', 'Sea Diamond', 'Eastern Fortune', 'Cape Horizon', 'Silver Phoenix', 'Andaman Spirit'];

const atSea = (job) => job?.professionId === 'merchantMarine';
const officerLevel = (job) => ['thirdMate', 'chiefMate', 'master', 'thirdAE', 'firstAE', 'chiefEngineer'].includes(job?.levelId);

/** Sign on to a ship: a crewing nation's seafarer goes on a foreign flag; others on their own flag or an open registry. */
export function signOn(ctx, job, { type, route } = {}) {
  const { state, rng } = ctx;
  const cc = state.character.countryId ?? 'US';
  const crew = CREW_NATIONS[cc];
  const flag = crew || rng.chance(0.6) ? rng.pick(OPEN_REGISTRIES) : cc;
  const t = type ?? rng.weighted(Object.keys(SHIP_TYPES), (k) => ({ bulk: 4, container: 4, tanker: 3, lng: 1, carCarrier: 1 }[k]));
  const r = route ? ROUTES.find((x) => x.id === route) : rng.pick(ROUTES);
  job.ship = { name: `MV ${rng.pick(SHIP_NAMES)}`, flag, type: t, route: r.id };
  job.contract = crew ? { agency: crew, signedOn: state.character.age } : null;
  return job.ship;
}
export const flagName = (cc) => FLAGS[cc] ?? cc;
export const routeOf = (job) => ROUTES.find((r) => r.id === job?.ship?.route) ?? ROUTES[3];

function seaYear(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!atSea(job)) return;
  if (!job.ship) signOn(ctx, job);
  const ship = job.ship;
  const type = SHIP_TYPES[ship.type];
  const cc = state.character.countryId ?? 'US';
  // The rhythm of contracts: months away, and a family that pays for it.
  const family = (state.people?.list ?? []).filter((p) => p.alive !== false && ['spouse', 'partner', 'child'].includes(p.relation));
  for (const p of family) p.relationship = clamp((p.relationship ?? 60) - rng.int(1, 4), 0, 100);
  if (job.contract) ctx.log(`Another nine-month contract on the ${ship.name}, a ${flagName(ship.flag)}-flagged ${type.name}, through ${job.contract.agency}. ${family.length ? 'Video calls home when the ship had signal.' : ''}`, type.icon, 'info');
  // Tankers and gas carriers pay a premium; seafarers abroad from the Philippines and India pay no tax at home on it.
  if (type.pay > 1 && job.salary) ctx.earn(Math.round(job.salary * (type.pay - 1)), `${type.name[0].toUpperCase()}${type.name.slice(1)} premium`, { wage: true });
  if (job.contract && ['PH', 'IN'].includes(cc)) for (const i of state.finances.ledger.income) if (/^Salary — /.test(i.source) && !i.taxFree) i.taxFree = i.amount;
  if (state.prompts.some((p) => p.type?.startsWith('seafaring.'))) return;
  // Piracy on the route.
  if (rng.chance(routeOf(job).piracy)) {
    ctx.prompt({ type: 'seafaring.pirates', icon: '🏴‍☠️', title: 'Pirates', text: `Skiffs came out of the dark off ${routeOf(job).name}. Armed men are climbing the hull of the ${ship.name}.`, options: [
      { id: 'citadel', label: '🔒 Into the citadel: lock down and wait for a navy', hint: 'Best practice' },
      { id: 'fight', label: '🔥 Fire hoses and evasive manoeuvres', tone: 'danger' },
      { id: 'surrender', label: '🏳️ Don\'t resist', hint: 'Hostage, then ransom' },
    ] });
    return;
  }
  // An owner goes bust and walks away from ship and crew.
  if (rng.chance(0.012)) {
    ctx.prompt({ type: 'seafaring.abandoned', icon: '⚓', title: 'Abandoned', text: `The owners of the ${ship.name} have gone bankrupt. The ship is under arrest in port, the wages stopped four months ago, and food and water are running low.`, options: [
      { id: 'stay', label: '⚓ Stay aboard and wait for the ITF', hint: 'Back pay, eventually' },
      { id: 'leave', label: '✈️ Get yourself repatriated', hint: 'Lose the wages owed' },
    ] });
    return;
  }
  // A master or watch officer answers for an accident.
  if (officerLevel(job) && rng.chance(0.015)) {
    ctx.prompt({ type: 'seafaring.casualty', icon: '💥', title: 'A Marine Casualty', text: rng.pick([`The ${ship.name} collided with a fishing boat in fog on your watch.`, `An oil spill while bunkering: the port authority has detained the ship.`, `The ${ship.name} grounded on a sandbank leaving port.`]), options: [
      { id: 'cooperate', label: '📋 Cooperate fully with the inquiry' },
      { id: 'blame', label: '🫵 Blame the pilot and the charts', tone: 'danger' },
    ] });
  }
}

export const SeafaringModule = {
  id: 'seafaring',
  order: 52,
  setup(engine) {
    engine.bus.on('career:hired', ({ ctx, job }) => { if (atSea(job)) signOn(ctx, job); });
  },
  onAgeUp(ctx) {
    if (ctx.state.character.alive) seaYear(ctx);
  },
  actions: {
    /** Sign off and find a berth on a different ship (arg: ship type). */
    changeShip(ctx, type) {
      const { state } = ctx;
      const job = state.career.job;
      if (!atSea(job)) return ctx.toast('Seafarers only', 'warn');
      if (yearlyCount(state, 'seafaring.changeShip')) return ctx.toast('One change of ship a year', 'warn');
      if (['tanker', 'lng'].includes(type) && !state.credentials?.held?.tankerEndorsement && (state.career.job.yearsAtEmployer ?? 0) < 2) return ctx.toast('Tankers want two years at sea first', 'warn');
      bumpYearly(state, 'seafaring.changeShip');
      const ship = signOn(ctx, job, { type: SHIP_TYPES[type] ? type : undefined });
      return ctx.log(`You signed on the ${ship.name}, a ${flagName(ship.flag)}-flagged ${SHIP_TYPES[ship.type].name} trading ${routeOf(job).name}.`, SHIP_TYPES[ship.type].icon, 'good');
    },
  },
  resolvers: {
    pirates(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'citadel') {
        if (rng.chance(0.75)) { ctx.stat('stress', 12); return ctx.log('Twenty hours in the citadel, in the dark. Then a navy boarding team: the pirates had fled. Nobody was hurt.', '🔒', 'good'); }
        optionId = 'surrender';
      }
      if (optionId === 'fight') {
        if (rng.chance(0.55)) {
          ctx.stat('stress', 10);
          addHonor(state, { id: 'sea.bravery', source: 'civil', name: 'IMO Award for Exceptional Bravery at Sea (commendation)', icon: '⚓', prestige: 8, precedence: 25, citation: 'For seeing off a pirate attack.' });
          return ctx.log('Fire hoses, razor wire and hard turns: the skiffs gave up. The IMO commended the crew.', '🔥', 'honor');
        }
        ctx.stat('health', -rng.int(10, 30));
        ctx.log('They got aboard anyway, angry. You were beaten before they herded the crew to the bridge.', '🏴‍☠️', 'bad');
      }
      const months = rng.int(3, 18);
      ctx.stat('health', -rng.int(5, 15));
      ctx.stat('happiness', -20);
      ctx.stat('stress', 25);
      state.flags.hostage = { months, age: state.character.age };
      return ctx.log(`You were held hostage for ${months} months, the ship anchored off the coast, while the owners negotiated a ransom. Then, one morning, you were free.`, '🏴‍☠️', 'bad');
    },
    abandoned(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (optionId === 'leave') {
        ctx.log('You took the ITF\'s offer of a flight home, and left four months\' wages behind.', '✈️', 'warn');
        return undefined;
      }
      ctx.stat('stress', 15);
      const back = Math.round((job?.salary ?? 30000) * (rng.chance(0.7) ? 0.35 : 0.15));
      ctx.earn(back, 'Back wages (ITF claim, abandoned ship)');
      return ctx.log(`Eleven months in port before the ship was sold at auction. The ITF won the crew most of its back pay: $${back.toLocaleString()} for you.`, '⚓', 'info');
    },
    casualty(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (optionId === 'cooperate') {
        if (rng.chance(0.7)) return ctx.log('The flag-state inquiry found a chain of small failures, not negligence. You were back on the bridge within the month.', '📋', 'info');
        if (job) job.performance = Math.max(0, (job.performance ?? 60) - 10);
        return ctx.log('The inquiry suspended your certificate of competency for six months.', '📋', 'bad');
      }
      if (rng.chance(0.4)) {
        ctx.log('The port state didn\'t believe you. You were detained ashore for months as a "material witness".', '⛓️', 'bad');
        ctx.stat('happiness', -15);
        if (job) job.performance = Math.max(0, (job.performance ?? 60) - 15);
        return undefined;
      }
      return ctx.log('The pilot carried the blame. Your colleagues remembered.', '🫵', 'warn');
    },
  },
};
