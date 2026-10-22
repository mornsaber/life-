/**
 * The peerage: five ranks — Baron, Viscount, Earl, Marquess, Duke — held for life or by
 * inheritance.
 *
 *   Life peers     Barons and baronesses created on the honours list or for public service:
 *                  a seat in the Lords for life; the title dies with them.
 *   Hereditary     Old titles that pass to the heir (the eldest son first, as most old patents
 *                  run). Only by birth: a noble start is opt-in and very rare. An heir uses a
 *                  courtesy style; the holder sits in the Lords only if elected by the other
 *                  hereditary peers. A hereditary peer can disclaim the title (to stand for the
 *                  Commons) — for life.
 *   Royal          Royal dukedoms, created for the monarch's children (Crown.js).
 *
 * state.character.peerage = { rank, place, kind: 'life'|'hereditary'|'royal', seat, created }
 * state.character.style.peerage = 'Earl of Ashby' (the formal title; the Lords reads it)
 * state.noble = { rank, place, holderId, heir: true|false } — born into a titled family
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';

export const RANKS = {
  baron: { order: 1, male: 'Baron', female: 'Baroness', style: { male: 'Lord', female: 'Lady' }, of: false },
  viscount: { order: 2, male: 'Viscount', female: 'Viscountess', style: { male: 'Viscount', female: 'Viscountess' }, of: false },
  earl: { order: 3, male: 'Earl', female: 'Countess', style: { male: 'Earl', female: 'Countess' }, of: true },
  marquess: { order: 4, male: 'Marquess', female: 'Marchioness', style: { male: 'Marquess', female: 'Marchioness' }, of: true },
  duke: { order: 5, male: 'Duke', female: 'Duchess', style: { male: 'Duke', female: 'Duchess' }, of: true },
};
/** How rare a noble birth is, when you opt in: a few lives in a thousand. */
export const NOBLE_BIRTH_CHANCE = 0.004;
/** Countries with a peerage that still passes titles. */
export const PEERAGE_COUNTRIES = ['GB', 'ES'];
const PLACES = ['Ashby', 'Harcourt', 'Wexley', 'Brantham', 'Coldmoor', 'Elvaston', 'Sallowfield', 'Thornbury', 'Kilmarren', 'Ravensworth'];

const gkey = (g) => (g === 'female' ? 'female' : 'male');
export const peerTitle = (rank, place, gender, lastName) => {
  const r = RANKS[rank];
  return r.of ? `${r[gkey(gender)]} of ${place}` : `${r[gkey(gender)]} ${lastName ?? place}${rank === 'baron' && place ? `, of ${place}` : ''}`;
};
/** How a peer is addressed: "The Earl of Ashby", "Lord Smith", "His Grace the Duke of …". */
export function peerAddress(state) {
  const p = state.character.peerage;
  if (!p) return null;
  const g = gkey(state.character.gender);
  const r = RANKS[p.rank];
  if (p.rank === 'duke') return `${g === 'female' ? 'Her' : 'His'} Grace the ${r[g]} of ${p.place}`;
  if (r.of) return `The ${r[g]} of ${p.place}`;
  return `${r.style[g]} ${state.character.lastName}`;
}

/** Create (or inherit) a peerage. */
export function grantPeerage(ctx, { rank, place, kind, seat }) {
  const { state } = ctx;
  const c = state.character;
  c.peerage = { rank, place: place ?? null, kind, seat: Boolean(seat), created: c.age };
  c.style = { ...(c.style ?? {}), prefix: RANKS[rank].style[gkey(c.gender)], peerage: peerTitle(rank, place, c.gender, c.lastName) };
  if (kind === 'life') c.style.prefix = gkey(c.gender) === 'female' ? 'Baroness' : 'Lord';
  return c.peerage;
}

/** A noble birth (opt-in, rare): a titled parent, a courtesy style, a family seat's wealth. */
export function nobleBirth(state, rng) {
  const cc = state.character.countryId ?? 'US';
  if (!state.flags?.nobleOptIn || !PEERAGE_COUNTRIES.includes(cc) || state.royal || !rng.chance(NOBLE_BIRTH_CHANCE)) return false;
  const rank = rng.weighted([['baron', 40], ['viscount', 22], ['earl', 26], ['marquess', 7], ['duke', 5]], ([, w]) => w)[0];
  const parents = (state.people?.list ?? []).filter((p) => p.relation === 'father' || p.relation === 'mother');
  const holder = parents.find((p) => p.relation === 'father') ?? parents[0];
  const heir = rng.chance(state.character.gender === 'male' ? 0.65 : 0.3);
  state.noble = { rank, place: rng.pick(PLACES), holderId: holder?.id ?? null, heir };
  if (holder) holder.title = peerTitle(rank, state.noble.place, holder.gender, holder.lastName);
  if (state.people) state.people.wealth = 'upper';
  state.character.style = { ...(state.character.style ?? {}), prefix: courtesy(state) };
  return true;
}
/** The courtesy style of a peer's child: Lord/Lady for a duke's or marquess's children (and an earl's daughters), "The Hon." otherwise. */
export function courtesy(state) {
  const n = state.noble;
  if (!n || state.character.peerage) return null;
  const rank = RANKS[n.rank].order;
  const female = state.character.gender === 'female';
  if (rank >= 4 || (rank === 3 && (female || n.heir))) return female ? 'Lady' : 'Lord';
  return 'The Hon.';
}

/** Yearly: the title passes when its holder dies; hereditary peers may win a seat in the Lords. */
function peerageYear(ctx) {
  const { state, rng } = ctx;
  const n = state.noble;
  const c = state.character;
  if (n?.heir && !c.peerage && !n.disclaimed) {
    const holder = state.people?.list.find((p) => p.id === n.holderId);
    if (!holder || holder.alive === false) {
      grantPeerage(ctx, { rank: n.rank, place: n.place, kind: 'hereditary', seat: false });
      ctx.log(`Your ${holder?.relation ?? 'parent'} has died. You succeed to the title: ${c.style.peerage}.`, '👑', 'milestone');
    }
  }
  const p = c.peerage;
  if (p?.kind === 'hereditary' && !p.seat && c.age >= 21 && (state.politics?.recognition ?? 0) >= 20 && rng.chance(0.04)) {
    p.seat = true;
    ctx.log('The hereditary peers elected you to a vacant seat in the House of Lords.', '🏛️', 'good');
  }
}

export const PeerageModule = {
  id: 'peerage',
  order: 33.6,
  init(state, rng) {
    if (state.flags?.nobleOptIn && !state.noble && state.character.age === 0 && rng) nobleBirth(state, rng);
  },
  onAgeUp(ctx) {
    peerageYear(ctx);
  },
  actions: {
    /** Disclaim a hereditary peerage for life (the Peerage Act 1963): to sit in the Commons. */
    disclaim(ctx) {
      const { state } = ctx;
      const p = state.character.peerage;
      if (p?.kind !== 'hereditary') return ctx.toast('Only an inherited title can be disclaimed.', 'warn');
      if (yearlyCount(state, 'peerage.disclaim')) return undefined;
      bumpYearly(state, 'peerage.disclaim');
      const title = state.character.style?.peerage;
      state.character.peerage = null;
      if (state.noble) state.noble.disclaimed = true;
      state.character.style = { ...(state.character.style ?? {}), prefix: null, peerage: null };
      if (state.politics) state.politics.recognition = clamp((state.politics.recognition ?? 0) + 5, 0, 100);
      ctx.log(`You disclaimed the title ${title} for your lifetime. Your heir can still inherit it.`, '📜', 'milestone');
      return undefined;
    },
  },
};
