/**
 * Titles from houses that no longer reign. The head of a former ruling house is a fons honorum
 * to monarchists: as well as the house's order, they create barons, counts, marquesses and
 * dukes — titles the republic doesn't recognise, that courtesy and the old families do, and
 * that the house can take back.
 *
 *   Receiving   Living in (or a citizen of) the country of a former ruling house, you can give
 *               the house your support (the foundation, the anniversary Mass, the monarchist
 *               newspaper). Support, eminence and honours build favour; with favour the head
 *               of the house may create you a baron or a count, and later raise you.
 *   Revoking    A felony, a call for a republic, or open contempt: the house strikes you from
 *               its rolls. You can also hand a title back.
 *   Awarding    As head of a house you can ennoble family, friends and supporters — and
 *               revoke what you gave.
 *
 * state.dynastic = { favour: { [cc]: n }, titles: [{ cc, house, rank, place, age, revoked, returned }] }
 * person.dynasticTitle = 'Count of Valdora' (granted by you, as head of a house)
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, hasFelony } from '../../core/State.js';
import { FORMER_HOUSES, houseOf } from './Houses.js';
import { citizenshipsOf, COUNTRIES } from './Countries.js';
import { eminence } from './Honours.js';
import { living } from '../people/People.js';

/** Rank names in each house's language: [male, female]. */
const RANK_NAMES = {
  IT: { baron: ['Barone', 'Baronessa'], count: ['Conte', 'Contessa'], marquis: ['Marchese', 'Marchesa'], duke: ['Duca', 'Duchessa'], of: 'di' },
  FR: { baron: ['Baron', 'Baronne'], count: ['Comte', 'Comtesse'], marquis: ['Marquis', 'Marquise'], duke: ['Duc', 'Duchesse'], of: 'de' },
  DE: { baron: ['Freiherr', 'Freifrau'], count: ['Graf', 'Gräfin'], marquis: ['Markgraf', 'Markgräfin'], duke: ['Herzog', 'Herzogin'], of: 'von' },
  AT: { baron: ['Freiherr', 'Freifrau'], count: ['Graf', 'Gräfin'], marquis: ['Markgraf', 'Markgräfin'], duke: ['Herzog', 'Herzogin'], of: 'von' },
  RU: { baron: ['Baron', 'Baroness'], count: ['Count', 'Countess'], marquis: ['Count', 'Countess'], duke: ['Prince', 'Princess'], of: '' },
  BR: { baron: ['Barão', 'Baronesa'], count: ['Conde', 'Condessa'], marquis: ['Marquês', 'Marquesa'], duke: ['Duque', 'Duquesa'], of: 'de' },
  RO: { baron: ['Baron', 'Baroneasă'], count: ['Conte', 'Contesă'], marquis: ['Marchiz', 'Marchiză'], duke: ['Duce', 'Ducesă'], of: 'de' },
};
export const DYNASTIC_RANKS = ['baron', 'count', 'marquis', 'duke'];
const PLACES = {
  IT: ['Valdora', 'Montebello', 'Roccalta', 'San Lorenzo', 'Castelvecchio'], FR: ['Beaumont', 'Valrose', 'Montfort', 'Rochebrune', 'Saint-Aubin'],
  DE: ['Lindenau', 'Rosenfeld', 'Falkenstein', 'Waldeck', 'Eichberg'], AT: ['Lindenau', 'Rosenfeld', 'Falkenstein', 'Waldeck', 'Eichberg'],
  RU: ['Orlov', 'Volkonsky', 'Sheremetev', 'Golitsyn', 'Tolstoy'], BR: ['Itamaraty', 'Petrópolis', 'Vassouras', 'Itaboraí', 'Iguaçu'], RO: ['Peleș', 'Sinaia', 'Bran', 'Mogoșoaia', 'Cotroceni'],
};

const dy = (state) => (state.dynastic ??= { favour: {}, titles: [] });
const gi = (state) => (state.character.gender === 'female' ? 1 : 0);

/** "Conte di Valdora", "Graf von Lindenau", "Count Orlov". */
export function dynasticName(cc, rank, place, gender = 'male') {
  const n = RANK_NAMES[cc] ?? RANK_NAMES.FR;
  const word = n[rank]?.[gender === 'female' ? 1 : 0] ?? rank;
  return n.of ? `${word} ${n.of} ${place}` : `${word} ${place}`;
}

/** The titles you hold from houses that don't reign (not revoked or handed back). */
export const dynasticTitles = (state) => (state.dynastic?.titles ?? []).filter((t) => !t.revoked && !t.returned);
/** Your highest such title, for your style. */
export function topDynasticTitle(state) {
  return dynasticTitles(state).sort((a, b) => DYNASTIC_RANKS.indexOf(b.rank) - DYNASTIC_RANKS.indexOf(a.rank))[0] ?? null;
}
/** "Conte Mario Rossi di Valdora" style, or null. */
export function dynasticStyledName(state) {
  const t = topDynasticTitle(state);
  if (!t) return null;
  const c = state.character;
  return `${c.firstName} ${c.lastName}, ${dynasticName(t.cc, t.rank, t.place, c.gender)}`;
}

/** The former ruling house you could support here: your country's (where you live or hold citizenship). */
export function supportableHouse(state) {
  const here = state.character.countryId ?? 'US';
  const cc = FORMER_HOUSES[here] ? here : citizenshipsOf(state).find((c) => FORMER_HOUSES[c]);
  if (!cc || state.world?.restored?.[cc]) return null;
  const mine = houseOf(state);
  if (mine?.cc === cc) return null;
  return { cc, def: FORMER_HOUSES[cc] };
}

function grant(ctx, cc, rank) {
  const { state, rng } = ctx;
  const d = dy(state);
  const def = FORMER_HOUSES[cc];
  const held = d.titles.find((t) => t.cc === cc && !t.revoked && !t.returned);
  if (held) {
    held.rank = rank;
    ctx.log(`The head of the House of ${def.name} raised you to ${dynasticName(cc, rank, held.place, state.character.gender)}.`, '⚜️', 'honor');
    return held;
  }
  const t = { cc, house: def.name, rank, place: rng.pick(PLACES[cc] ?? PLACES.FR), age: state.character.age, revoked: false, returned: false };
  d.titles.push(t);
  ctx.log(`By letters patent from the head of the House of ${def.name}, you were created ${dynasticName(cc, rank, t.place, state.character.gender)}. The republic doesn't recognise it; monarchists and the old families do.`, '⚜️', 'honor');
  return t;
}

function revoke(ctx, t, why) {
  t.revoked = ctx.state.character.age;
  ctx.log(`The House of ${t.house} struck you from its rolls (${why}): you are no longer ${dynasticName(t.cc, t.rank, t.place, ctx.state.character.gender)}.`, '📜', 'bad');
}

function yearTick(ctx) {
  const { state, rng } = ctx;
  const d = dy(state);
  if (!state.character.alive || state.character.age < 21) return;
  // A felony ends it.
  for (const t of dynasticTitles(state)) {
    if (hasFelony(state) && (state.legal?.record ?? []).some((c) => c.age === state.character.age || c.age === state.character.age - 1)) revoke(ctx, t, 'a criminal conviction');
  }
  const s = supportableHouse(state);
  if (!s || state.prompts.some((p) => p.type === 'dynastic.offer')) return;
  const favour = (d.favour[s.cc] ?? 0) + eminence(state) / 150;
  const held = dynasticTitles(state).find((t) => t.cc === s.cc);
  const next = held ? DYNASTIC_RANKS[DYNASTIC_RANKS.indexOf(held.rank) + 1] : favour >= 5 ? 'count' : 'baron';
  if (!next || (held && state.character.age - held.age < 8)) return;
  const need = held ? 6 + DYNASTIC_RANKS.indexOf(next) * 3 : 3;
  if (favour < need || !rng.chance(0.3)) return;
  ctx.prompt({
    type: 'dynastic.offer', icon: '⚜️', title: `The House of ${s.def.name}`,
    text: `The head of the House of ${s.def.name} — ${s.def.head[0]} to monarchists — wishes to ${held ? 'raise you' : 'create you'} ${dynasticName(s.cc, next, held?.place ?? '…', state.character.gender).replace(/ (di|de|von) …$/, '')} for your loyalty. ${s.def.legal}`,
    options: [{ id: 'accept', label: '⚜️ Accept the letters patent' }, { id: 'decline', label: '🙅 Decline with thanks' }],
    data: { cc: s.cc, rank: next },
  });
}

export const DynasticTitlesModule = {
  id: 'dynastic',
  order: 33.65,
  setup(engine) {
    // Campaigning to keep the republic: the house takes back what it gave.
    engine.bus.on('dynastic:republican', ({ ctx, cc }) => {
      for (const t of dynasticTitles(ctx.state).filter((x) => x.cc === cc)) revoke(ctx, t, 'your campaign against the restoration');
    });
  },
  onAgeUp(ctx) {
    yearTick(ctx);
  },
  actions: {
    /** Support the house: its foundation, the anniversary Mass, the monarchist paper. */
    support(ctx) {
      const { state, rng } = ctx;
      const s = supportableHouse(state);
      if (!s) return ctx.toast('No former ruling house here to support', 'warn');
      if (state.character.age < 18) return ctx.toast('From 18', 'warn');
      if (yearlyCount(state, 'dynastic.support')) return ctx.toast('Once a year', 'warn');
      if (!ctx.spend(10000, `The House of ${s.def.name}: foundation and events`, { allowDebt: false })) return ctx.toast('About $10,000', 'warn');
      bumpYearly(state, 'dynastic.support');
      const d = dy(state);
      d.favour[s.cc] = (d.favour[s.cc] ?? 0) + 1;
      (state.world.monarchists ??= {})[s.cc] = Math.round(clamp((state.world.monarchists[s.cc] ?? s.def.support) + 0.2, 0, 80) * 10) / 10;
      return ctx.log(rng.pick([`You gave to the House of ${s.def.name}'s foundation and dined with the family afterwards.`, `You attended the anniversary Mass for the last king, and the reception after.`, `You funded a season of the monarchist newspaper. The head of the house wrote to thank you.`]), '⚜️', 'good');
    },
    /** Hand a title back. arg: cc. */
    returnTitle(ctx, cc) {
      const t = dynasticTitles(ctx.state).find((x) => x.cc === cc);
      if (!t) return ctx.toast('No such title', 'warn');
      t.returned = ctx.state.character.age;
      return ctx.log(`You returned your letters patent to the House of ${t.house}.`, '📜', 'info');
    },
    /** As head of a house: ennoble a family member, friend or supporter. arg: personId. */
    ennoble(ctx, personId) {
      const { state, rng } = ctx;
      const h = houseOf(state);
      if (h?.rank !== 'head') return ctx.toast('Only the head of the house creates titles', 'warn');
      if (yearlyCount(state, 'dynastic.ennoble')) return ctx.toast('Once a year', 'warn');
      const p = ennobleOptions(state).find((x) => x.id === personId);
      if (!p) return ctx.toast('Choose someone close to you', 'warn');
      bumpYearly(state, 'dynastic.ennoble');
      const rank = ['spouse', 'child', 'sibling'].includes(p.relation) ? 'count' : 'baron';
      p.dynasticTitle = dynasticName(h.cc, rank, rng.pick(PLACES[h.cc] ?? PLACES.FR), p.gender);
      p.relationship = Math.min(100, (p.relationship ?? 50) + 10);
      h.ennobled = [...(h.ennobled ?? []), { id: p.id, name: `${p.firstName} ${p.lastName}`, title: p.dynasticTitle, age: state.character.age }];
      return ctx.log(`By your letters patent, ${p.firstName} ${p.lastName} is now ${p.dynasticTitle}.`, '⚜️', 'good');
    },
    /** As head of a house: take back a title you gave. arg: personId. */
    revokeGrant(ctx, personId) {
      const { state } = ctx;
      const h = houseOf(state);
      const p = living(state).find((x) => x.id === personId && x.dynasticTitle);
      if (h?.rank !== 'head' || !p) return ctx.toast('Nothing to revoke', 'warn');
      const was = p.dynasticTitle;
      p.dynasticTitle = null;
      p.relationship = Math.max(0, (p.relationship ?? 50) - 25);
      for (const e of h.ennobled ?? []) if (e.id === p.id && !e.revoked) e.revoked = state.character.age;
      return ctx.log(`You revoked ${p.firstName}'s title (${was}). They took it badly.`, '📜', 'warn');
    },
  },
  resolvers: {
    offer(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'accept') {
        ctx.log('You declined the title with thanks.', '🙅', 'info');
        dy(state).favour[data.cc] = Math.max(0, (dy(state).favour[data.cc] ?? 0) - 1);
        return undefined;
      }
      grant(ctx, data.cc, data.rank);
      return undefined;
    },
  },
};

/** People the head of a house can ennoble. */
export const ennobleOptions = (state) => living(state).filter((p) => !p.dynasticTitle && !p.title && ['spouse', 'child', 'sibling', 'friend', 'bestFriend', 'mentor'].includes(p.relation)).slice(0, 8);
/** People you've ennobled who still hold it. */
export const ennobled = (state) => living(state).filter((p) => p.dynasticTitle);
export const houseCountryName = (cc) => COUNTRIES[cc]?.name ?? cc;
