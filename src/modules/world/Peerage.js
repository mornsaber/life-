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
 *   Creations      The few hereditary titles still made for commoners: the customary earldom for
 *                  a former prime minister, a viscountcy for a Speaker of the Commons or a
 *                  victorious three-star commander, an earldom (or, once in a generation, a
 *                  dukedom) for the commander who won a war, and a marquessate for a national
 *                  figure of the very first rank. Spain's monarch still creates marquesados for
 *                  eminent Spaniards. A higher creation raises an existing peer's rank.
 *   By-elections   Hereditary peers win one of the Lords' hereditary seats when one falls vacant:
 *                  a ballot of their own party's hereditary peers (or the crossbenchers').
 *
 * state.character.peerage = { rank, place, kind: 'life'|'hereditary'|'royal', seat, created }
 * state.character.style.peerage = 'Earl of Ashby' (the formal title; the Lords reads it)
 * state.noble = { rank, place, holderId, heir: true|false } — born into a titled family
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { eminence } from './Honours.js';
import { partyName } from '../politics/Parties.js';

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
const PLACES_ES = ['Valdeflores', 'Torrealta', 'Santa Inés', 'Peñaranda', 'Villafranca', 'Montesclaros', 'Almenara'];
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

const SUB_PLACES = ['Carrow', 'Dunmere', 'Holcombe', 'Ilsley', 'Merrow', 'Penhallow', 'Rossmore', 'Stratton', 'Tolland', 'Wyvern', 'Ardley', 'Bexton'];
const SUB_ORDER = ['marquess', 'earl', 'viscount', 'baron'];
/**
 * The lesser titles a great title carries with it (a duke is usually also a marquess, an earl
 * and a baron): the eldest son uses the highest of them by courtesy. Deterministic from the place.
 */
export function subsidiaryTitles(rank, place, gender = 'male') {
  const order = RANKS[rank]?.order ?? 1;
  const seed = [...String(place)].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const below = SUB_ORDER.filter((r) => RANKS[r].order < order).slice(0, order >= 5 ? 3 : order >= 3 ? 2 : 0);
  return below.map((r, i) => {
    const pl = SUB_PLACES[(seed + i * 5) % SUB_PLACES.length];
    return RANKS[r].of ? `${RANKS[r][gender === 'female' ? 'female' : 'male']} of ${pl}` : `${RANKS[r][gender === 'female' ? 'female' : 'male']} ${pl}`;
  });
}
const ORD = (n) => `${n}${[, 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`;
/** "7th Earl of Ashby" for an inherited title; the title alone for a new creation. */
export const numberedTitle = (state) => {
  const p = state.character.peerage;
  const t = state.character.style?.peerage;
  return p?.number > 1 && t ? `${ORD(p.number)} ${t}` : t ?? null;
};

/** The form of address, with the ordinal for an inherited title: "The 7th Earl of Ashby". */
export const numberedAddress = (state) => {
  const a = peerAddress(state);
  const n = state.character.peerage?.number;
  return n > 1 && a ? a.replace(/(the|The) (?=\S+ of )/, `$1 ${ORD(n)} `) : a;
};

/** Create (or inherit) a peerage. */
export function grantPeerage(ctx, { rank, place, kind, seat }) {
  const { state } = ctx;
  const c = state.character;
  c.peerage = { rank, place: place ?? null, kind, seat: Boolean(seat), created: c.age, subsidiary: kind === 'life' ? [] : subsidiaryTitles(rank, place ?? c.lastName, c.gender), number: kind === 'hereditary' ? (state.noble?.number ?? 0) + 1 || 1 : 1 };
  c.style = { ...(c.style ?? {}), prefix: RANKS[rank].style[gkey(c.gender)], peerage: peerTitle(rank, place, c.gender, c.lastName) };
  if (kind === 'life') c.style.prefix = gkey(c.gender) === 'female' ? 'Baroness' : 'Lord';
  return c.peerage;
}

/** A noble birth (opt-in, rare): a titled parent, a courtesy style, a family seat's wealth. */
export function nobleBirth(state, rng) {
  const cc = state.character.countryId ?? 'US';
  // Chosen on the start screen (a rank, heir or younger child), or the rare opt-in chance.
  const chosen = state.flags?.nobleStart;
  if (!PEERAGE_COUNTRIES.includes(cc) || state.royal) return false;
  if (!chosen && (!state.flags?.nobleOptIn || !rng.chance(NOBLE_BIRTH_CHANCE))) return false;
  const rank = chosen?.rank ?? rng.weighted([['baron', 40], ['viscount', 22], ['earl', 26], ['marquess', 7], ['duke', 5]], ([, w]) => w)[0];
  const parents = (state.people?.list ?? []).filter((p) => p.relation === 'father' || p.relation === 'mother');
  const holder = parents.find((p) => p.relation === 'father') ?? parents[0];
  const heir = chosen?.heir ?? rng.chance(state.character.gender === 'male' ? 0.65 : 0.3);
  state.noble = { rank, place: rng.pick(cc === 'ES' ? PLACES_ES : PLACES), holderId: holder?.id ?? null, heir, number: rng.int(2, 11) };
  if (holder) {
    holder.title = peerTitle(rank, state.noble.place, holder.gender, holder.lastName);
    holder.titles = subsidiaryTitles(rank, state.noble.place, holder.gender);
    // The holder's spouse takes the title's feminine (or masculine) form by marriage.
    const other = parents.find((p) => p !== holder);
    // (A peeress's husband takes no title.)
    if (other?.gender === 'female') other.title = peerTitle(rank, state.noble.place, 'female', other.lastName);
  }
  // The heir uses the highest lesser title by courtesy ("Marquess of Carrow").
  const subs = subsidiaryTitles(rank, state.noble.place, state.character.gender);
  if (heir && subs.length) state.noble.courtesyTitle = subs[0];
  // Brothers and sisters carry the courtesy style too: "Lord Henry Ashby", "The Hon. Clara Ashby".
  const order = RANKS[rank].order;
  for (const s of (state.people?.list ?? []).filter((p) => p.relation === 'sibling')) {
    const female = s.gender === 'female';
    s.title = order >= 4 || (order === 3 && female) ? (female ? 'Lady' : 'Lord') : 'The Hon.';
  }
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
/** A peer's children take courtesy styles from birth; the eldest son of an earl or higher uses a lesser title. */
function childStyles(state) {
  const pe = state.character.peerage;
  if (!pe || pe.kind === 'royal' || state.royal) return;
  const order = RANKS[pe.rank]?.order ?? 1;
  const kids = (state.people?.list ?? []).filter((p) => p.relation === 'child' && p.alive !== false).sort((a, b) => b.ageOffset - a.ageOffset);
  const eldestSon = pe.kind === 'hereditary' ? kids.find((k) => k.gender === 'male') : null;
  for (const k of kids) {
    if (k.courtesyStyled) continue;
    k.courtesyStyled = true;
    const female = k.gender === 'female';
    if (k === eldestSon && order >= 3 && pe.subsidiary?.length) k.titles = [...new Set([...(k.titles ?? []), pe.subsidiary[0]])];
    else k.title = pe.kind !== 'life' && (order >= 4 || (order === 3 && female)) ? (female ? 'Lady' : 'Lord') : 'The Hon.';
  }
}

function peerageYear(ctx) {
  const { state, rng } = ctx;
  childStyles(state);
  const n = state.noble;
  const c = state.character;
  if (n?.heir && !c.peerage && !n.disclaimed) {
    const holder = state.people?.list.find((p) => p.id === n.holderId);
    if (!holder || holder.alive === false) {
      grantPeerage(ctx, { rank: n.rank, place: n.place, kind: 'hereditary', seat: false });
      n.courtesyTitle = null;
      ctx.log(`Your ${holder?.relation ?? 'parent'} has died. You succeed to the title: ${c.style.peerage}.`, '👑', 'milestone');
    }
  }
  // A hereditary seat falls vacant in your group: stand?
  const p = c.peerage;
  if (p?.kind === 'hereditary' && !p.seat && c.age >= 21 && (state.character.countryId ?? 'US') === 'GB' && !state.prompts.some((x) => x.type === 'peerage.byElection') && rng.chance(0.35)) {
    const bloc = state.civic?.party?.bloc;
    const group = bloc ? `${partyName(state, bloc).replace(/ Party$/, '')} hereditary peers` : 'crossbench hereditary peers';
    ctx.prompt({
      type: 'peerage.byElection', icon: '🏛️', title: 'A Hereditary By-Election',
      text: `A hereditary peer has died, and his seat in the Lords is open. The electorate: the ${group}. ${p.byElections ? `You've stood ${p.byElections} time${p.byElections > 1 ? 's' : ''} before.` : 'Candidates write a 75-word statement; the electors vote by preference.'}`,
      options: [
        { id: 'stand', label: '✍️ Stand, with a statement' },
        { id: 'campaign', label: '🍷 Stand, and lunch every elector', hint: '$15,000 of lunches' },
        { id: 'skip', label: '🙅 Not this time' },
      ],
      data: { group },
    });
  }
  creationsYear(ctx);
}

/* ------------------------------------------------------------------ */
/* Creations for commoners                                             */
/* ------------------------------------------------------------------ */

const held = (state, re) => (state.politics?.history ?? []).some((h) => re.test(h.officeId));
const inOffice = (state, re) => re.test(state.politics?.office?.id ?? '');
const rankOrder = (rank) => RANKS[rank]?.order ?? 0;

/** What the Crown might offer this year, if anything: { rank, why }. */
function creationFor(state, rng) {
  const cc = state.character.countryId ?? 'US';
  const c = state.character;
  const offered = (state.peerageOffers ??= {});
  const mine = rankOrder(c.peerage?.rank);
  const pick = (key, rank, why, chance) => (!offered[key] && rankOrder(rank) > mine && rng.chance(chance) ? (offered[key] = true, { rank, why, key }) : null);
  if (cc === 'ES') return eminence(state) >= 280 ? pick('es', 'marquess', 'the King\'s grant of a marquesado for services to Spain', 0.03) : null;
  if (cc !== 'GB' || state.royal) return null;
  const e = eminence(state);
  // Victors: the commander of a won war.
  const v = state.flags?.victor?.nation === 'GB' ? state.flags.victor : null;
  if (v) {
    if (v.grade >= 9 && v.top && e >= 420) return pick('duke', 'duke', 'the victory in the war — a dukedom, the first for a commoner in a century', 0.5);
    if (v.grade >= 9) return pick('victor9', 'earl', 'command of the forces that won the war', 0.6);
    if (v.grade >= 8) return pick('victor8', 'viscount', 'a decisive command in the war', 0.5);
  }
  if (held(state, /^gb_pm$/) && !inOffice(state, /^gb_pm$/)) return pick('pm', 'earl', 'the customary earldom for a former prime minister', 0.35);
  if (state.politics?.wasSpeaker && !inOffice(state, /^gb_mp$/)) return pick('speaker', 'viscount', 'the customary viscountcy for a former Speaker of the Commons', 0.4);
  if (e >= 380) return pick('marquess', 'marquess', 'service to the nation of the very first rank', 0.01);
  return null;
}

function creationsYear(ctx) {
  const { state, rng } = ctx;
  // A Speaker's chair is remembered.
  const seat = state.legislature?.seat;
  if (seat?.post === 'presiding' && /^lower_GB/.test(seat.bodyId ?? '')) state.politics.wasSpeaker = true;
  if (state.prompts.some((x) => x.type === 'peerage.creation') || !state.character.alive) return;
  const offer = creationFor(state, rng);
  if (!offer) return;
  const c = state.character;
  const title = peerTitle(offer.rank, rng.pick(PLACES), c.gender, c.lastName);
  ctx.prompt({
    type: 'peerage.creation', icon: '👑', title: 'A Hereditary Peerage',
    text: `For ${offer.why}, the Crown offers you a hereditary title: ${title}. ${c.peerage ? `It would raise you from ${c.style?.peerage}.` : ''}${inOffice(state, /^gb_mp$/) ? ' You would leave the Commons for the Lords.' : ''}`,
    options: [
      { id: 'accept', label: `👑 Accept: ${title}`, hint: 'Hereditary: your heir inherits it' },
      ...(offer.rank === 'earl' && offer.key === 'pm' ? [{ id: 'life', label: '🏛️ A life barony instead', hint: 'A seat in the Lords; nothing to pass on' }] : []),
      { id: 'decline', label: '🙅 Decline with thanks' },
    ],
    data: { rank: offer.rank, place: title.split(' of ')[1] ?? null },
  });
}

/** The Lords by-election: a handful of electors, a crowded field. */
function byElection(ctx, data, optionId) {
  const { state, rng } = ctx;
  const p = state.character.peerage;
  if (!p || optionId === 'skip') return;
  if (optionId === 'campaign') ctx.spend(15000, 'Lunches for hereditary peers', { allowDebt: true });
  p.byElections = (p.byElections ?? 0) + 1;
  const electors = rng.int(3, 45);
  const rivals = rng.int(2, 14);
  const odds = clamp((1 + (state.politics?.recognition ?? 0) / 50 + (rankOrder(p.rank) - 1) * 0.1 + (state.civic?.party ? 0.3 : 0) + (optionId === 'campaign' ? 0.5 : 0) + (p.byElections - 1) * 0.2) / (rivals + 1), 0.03, 0.7);
  if (rng.chance(odds)) {
    p.seat = true;
    const yours = Math.max(1, Math.round(electors * rng.float(0.3, 0.6)));
    ctx.log(`You won the by-election among the ${data.group}: ${yours} of ${electors} first preferences against ${rivals} rivals. You take your seat in the House of Lords.`, '🏛️', 'good');
    ctx.stat('happiness', 6);
  } else ctx.log(`You lost the by-election among the ${data.group} (${rivals} rivals, ${electors} electors).`, '🏛️', 'warn');
}

function creation(ctx, data, optionId) {
  const { state } = ctx;
  if (optionId === 'decline') return ctx.log('You declined the peerage.', '🙅');
  const c = state.character;
  // Into the Lords: a sitting MP leaves the Commons.
  if (inOffice(state, /^gb_mp$/)) ctx.emit('politics:leave', { reason: 'Elevated to the House of Lords' });
  if (optionId === 'life') {
    if (!c.peerage) grantPeerage(ctx, { rank: 'baron', place: data.place, kind: 'life', seat: true });
    else c.peerage.seat = true;
    return ctx.log(`You were created a life peer: ${c.style.peerage}.`, '🏛️', 'honor');
  }
  const was = c.style?.peerage;
  grantPeerage(ctx, { rank: data.rank, place: data.place, kind: 'hereditary', seat: true });
  // Those who create a title, rather than inherit one, sit for life.
  if (state.noble) state.noble.heir = false;
  return ctx.log(`${was ? `Raised from ${was}: you` : 'You'} were created ${c.style.peerage}, a hereditary title for you and your heirs.`, '👑', 'honor');
}

export const PeerageModule = {
  id: 'peerage',
  order: 33.6,
  init(state, rng) {
    if ((state.flags?.nobleOptIn || state.flags?.nobleStart) && !state.noble && state.character.age === 0 && rng) nobleBirth(state, rng);
  },
  setup(engine) {
    // The commander of a war won: remembered for a peerage.
    engine.bus.on('world:peace', ({ ctx, outcome }) => {
      const svc = ctx.state.military?.service;
      if (!svc || svc.track !== 'officer' || svc.grade < 8 || !/clear victory/.test(outcome ?? '')) return;
      ctx.state.flags.victor = { grade: svc.grade, top: Boolean(svc.topPost), nation: svc.nation ?? 'US' };
    });
  },
  onAgeUp(ctx) {
    peerageYear(ctx);
  },
  resolvers: {
    byElection,
    creation,
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
