/**
 * The family as the thing you play: what each generation leaves the next.
 *
 *   prestige    the family's standing, built by every generation: honours, fortunes, titles,
 *               offices, the businesses they founded, how long the line has run. "An ordinary
 *               family" → "a respected family" → "a distinguished family" → "a great dynasty".
 *   heirlooms   things that pass down with stories: a great-grandfather's medal, the wedding
 *               ring, the shop's first dollar framed, a pocket watch. Kept, they add to the
 *               family's standing; a dealer may offer money for them.
 *   the seat    a home owned for fifteen years becomes the family seat. When you die your heir
 *               may buy it from the estate to keep it in the family.
 *   matches     titled, royal and distinguished families arrange marriages, and so do many
 *               families in countries and eras where that's how it's done.
 *
 * state.dynasty = { heirlooms: [{ id, name, icon, story, value, since }], seat: { name, propertyId, since } | null,
 *                   seatOffer: { property, value } | null, matchAsked }
 */
import { clamp, Random } from '../../core/Random.js';
import { currentYear } from '../../core/State.js';
import { rep } from '../life/Reputation.js';
import { makePerson } from './PeopleEngine.js';
import { partnerOf, parentsOf, clampRel } from './People.js';

const dyn = (state) => (state.dynasty ??= { heirlooms: [], seat: null, seatOffer: null });
const sideRng = (state, salt) => new Random((((state.world?.seed ?? 1) * 6151 + state.character.age * 433 + salt) >>> 0));

/* ------------------------------------------------------------------ */
/* Prestige                                                            */
/* ------------------------------------------------------------------ */

export const PRESTIGE_TIERS = [[55, 'a great dynasty', '🏰'], [35, 'a distinguished family', '🎩'], [15, 'a respected family', '🏡'], [0, 'an ordinary family', '👪']];
/** The family's standing (0–100), from every generation including yours. */
export function familyPrestige(state) {
  const gens = state.lineage?.ancestors ?? [];
  let p = 0;
  for (const a of gens) {
    p += Math.min(9, (a.honours?.length ?? 0) * 3);
    p += a.netWorth > 0 ? Math.min(10, Math.log10(Math.max(1, a.netWorth)) * 1.6 - 6) : 0;
    p += a.styled ? 6 : 0;
    p += Math.min(6, (a.businesses?.length ?? 0) * 3);
  }
  p += Math.min(10, gens.length * 2);
  p += Math.min(9, (state.honors?.length ?? 0) * 2);
  p += Math.min(10, (dyn(state).heirlooms?.length ?? 0) * 1.5);
  if (dyn(state).seat) p += 6;
  if (state.royal || state.house) p += 25;
  else if (state.noble || state.character.peerage) p += 15;
  return Math.round(clamp(p, 0, 100));
}
export const prestigeTier = (n) => PRESTIGE_TIERS.find(([min]) => n >= min);

/* ------------------------------------------------------------------ */
/* Heirlooms                                                           */
/* ------------------------------------------------------------------ */

const KEEPSAKES = [
  ['a pocket watch', '⌚', 400, 'that stopped the day they died, and nobody has wound it since'],
  ['a family Bible with every birth written in the front', '📖', 150, 'with five generations of names in different hands'],
  ['a photograph album', '📷', 50, 'of people nobody alive can name any more'],
  ['a writing desk', '🪑', 1200, 'with initials carved underneath the drawer'],
  ['a violin', '🎻', 2500, 'that someone in every generation has tried to learn'],
  ['a recipe book', '📒', 20, 'in faded handwriting, gravy stains on every page'],
  ['a grandfather clock', '🕰️', 3000, 'that has struck the hour in every house the family has lived in'],
  ['a string of pearls', '📿', 6000, 'worn at every family wedding'],
];
const relationWord = (gen, gender) => (gen <= 1 ? (gender === 'female' ? 'mother' : 'father') : gen === 2 ? (gender === 'female' ? 'grandmother' : 'grandfather') : `${'great-'.repeat(gen - 2)}${gender === 'female' ? 'grandmother' : 'grandfather'}`);

/** What someone leaves as heirlooms at their death, added to what they inherited. */
export function heirloomsFrom(old) {
  const rng = new Random((((old.world?.seed ?? 1) * 92003 + (old.character.birthYear ?? 0) * 31 + old.character.age) >>> 0));
  const year = currentYear(old);
  const g = old.character.gender;
  const who = `${old.character.firstName}'s`;
  const out = [];
  const top = [...(old.honors ?? [])].sort((a, b) => (b.prestige ?? 0) - (a.prestige ?? 0))[0];
  if (top && (top.prestige ?? 0) >= 3) out.push({ name: `${who} ${top.name}`, icon: top.icon ?? '🏅', value: 800 + (top.prestige ?? 3) * 600, story: top.citation ? `"${String(top.citation).slice(0, 110)}"` : 'in its original case' });
  const mil = old.military?.history?.at(-1);
  if (mil) out.push({ name: `${who} service medals`, icon: '🎖️', value: 300, story: `from ${mil.yearsOfService ?? 'their'} years in uniform` });
  const biz = old.business?.current ?? old.business?.holdings?.[0];
  if (biz) out.push({ name: `the first dollar ${biz.name} ever took, framed`, icon: '💵', value: 1, story: `from the day ${old.character.firstName} opened the doors` });
  if ((old.people?.marriages ?? 0) > 0) out.push({ name: `${who} wedding ring`, icon: '💍', value: 900, story: 'worn smooth' });
  const [name, icon, value, story] = rng.pick(KEEPSAKES);
  out.push({ name: `${who} ${name.replace(/^an? /, '')}`, icon, value, story });
  return out.map((h, i) => ({ id: `h${year}_${i}`, since: year, from: `${old.character.firstName} ${old.character.lastName}`, gender: g, ...h }));
}
/** The heirlooms an heir receives: everything kept so far, plus what the one who died leaves. */
export function inheritHeirlooms(old) {
  const kept = structuredClone(old.dynasty?.heirlooms ?? []);
  return [...kept, ...heirloomsFrom(old)].slice(-14);
}

/* ------------------------------------------------------------------ */
/* The module                                                          */
/* ------------------------------------------------------------------ */

const ARRANGED_LANDS = ['IN', 'PK', 'BD', 'NP', 'AF', 'SA', 'YE', 'IQ', 'JO', 'EG', 'IR', 'SY', 'LB'];
function matchmade(state) {
  const y = currentYear(state);
  const cc = state.character.countryId ?? 'US';
  if (state.royal || state.house || state.noble || state.character.peerage) return 'your family\'s rank';
  if (familyPrestige(state) >= 55) return 'the family\'s name';
  if (ARRANGED_LANDS.includes(cc)) return 'custom';
  if (y < 1950 && ['JP', 'KR', 'CN', 'TW', 'VN', 'TR'].includes(cc)) return 'custom';
  return null;
}

export const FamilyLegacyModule = {
  id: 'familyLegacy',
  order: 7.6,

  init(state) { dyn(state); },

  onAgeUp(ctx) {
    const { state } = ctx;
    const d = dyn(state);
    const age = state.character.age;
    // The family seat: a home held fifteen years.
    if (!d.seat) {
      const home = (state.housing?.properties ?? []).find((p) => p.use === 'primary' && age - (p.purchaseAge ?? age) >= 15);
      if (home) {
        d.seat = { name: `the ${state.character.lastName} house`, propertyId: home.id, since: currentYear(state) };
        ctx.log(`After fifteen years, your home has become the family's: ${d.seat.name}. Your children will think of it as where they're from.`, '🏡', 'good');
      }
    } else if (!(state.housing?.properties ?? []).some((p) => p.id === d.seat.propertyId)) {
      ctx.log(`${d.seat.name[0].toUpperCase()}${d.seat.name.slice(1)} has left the family.`, '🏚️', 'warn');
      d.seat = null;
    }
    // Keeping the heirlooms keeps the family's standing with its relatives.
    if (d.heirlooms.length && age >= 18 && age % 5 === 0) rep(ctx, 'family', 1, 'the family heirlooms');
    dealerPrompt(ctx);
    matchPrompt(ctx);
    seatPrompt(ctx);
  },

  actions: {
    sellHeirloom(ctx, id) {
      const d = dyn(ctx.state);
      const h = d.heirlooms.find((x) => x.id === id);
      if (!h) return;
      d.heirlooms = d.heirlooms.filter((x) => x !== h);
      ctx.earn(h.value, `Sold ${h.name}`);
      rep(ctx, 'family', -6, `sold ${h.name}`);
      ctx.log(`You sold ${h.name} for $${h.value.toLocaleString()}. Your relatives have opinions about that.`, '💰', 'warn');
    },
  },

  resolvers: {
    dealer(ctx, data, optionId) {
      const d = dyn(ctx.state);
      const h = d.heirlooms.find((x) => x.id === data.id);
      if (!h) return;
      if (optionId === 'sell') {
        d.heirlooms = d.heirlooms.filter((x) => x !== h);
        ctx.earn(data.offer, `Sold ${h.name}`);
        rep(ctx, 'family', -6, `sold ${h.name}`);
        ctx.log(`You sold ${h.name} to the dealer for $${data.offer.toLocaleString()}.`, '💰', 'warn');
      } else ctx.log(`${h.name[0].toUpperCase()}${h.name.slice(1)} stays in the family.`, h.icon, 'good');
    },
    match(ctx, data, optionId) {
      const { state, rng } = ctx;
      const p = data.person;
      if (optionId === 'refuse') {
        rep(ctx, 'family', -8, 'refused the match');
        for (const par of parentsOf(state).filter((x) => x.alive)) par.relationship = clampRel(par.relationship - 10);
        return void ctx.log(`You refused the match with ${p.firstName}. The family took it badly.`, '🙅', 'warn');
      }
      const spouse = makePerson(ctx, { relation: optionId === 'accept' ? 'spouse' : 'partner', gender: p.gender, age: p.age, firstName: p.firstName, lastName: p.lastName, relationship: rng.int(40, 70), arranged: true });
      spouse.since = state.character.age;
      state.people.list.push(spouse);
      if (optionId === 'accept') {
        spouse.dcAtMarriage = state.retirement?.dc ?? 0;
        state.people.marriages = (state.people.marriages ?? 0) + 1;
        rep(ctx, 'family', 6, 'an arranged marriage');
        if (data.dowry) ctx.earn(data.dowry, 'Marriage settlement');
        ctx.stat('happiness', rng.int(-4, 8));
        ctx.log(`You married ${p.firstName} ${p.lastName}, as the families agreed. ${rng.chance(0.6) ? 'Love may come later; with luck it will.' : 'You hardly know each other.'}`, '💒', 'milestone');
        ctx.emit('people:married', { personId: spouse.id });
      } else ctx.log(`You agreed to meet ${p.firstName} properly first. You're courting now, chaperoned.`, '🫖', 'good');
    },
    seat(ctx, data, optionId) {
      const { state } = ctx;
      const d = dyn(state);
      const offer = d.seatOffer;
      d.seatOffer = null;
      if (!offer || optionId !== 'keep') return void ctx.log('The family seat was sold with the estate. Strangers live there now.', '🏚️', 'warn');
      if (!ctx.spend(offer.value, 'Buying the family seat from the estate', { credit: true })) return void ctx.log('You couldn\'t raise the money. The family seat was sold.', '🏚️', 'bad');
      const home = { ...offer.property, use: 'primary', mortgage: null, heloc: null, purchaseAge: state.character.age };
      state.housing.properties.push(home);
      d.seat = { name: offer.name, propertyId: home.id, since: offer.since };
      ctx.log(`You kept ${offer.name} in the family. You moved into the rooms you grew up in.`, '🏡', 'milestone');
    },
  },
};

function dealerPrompt(ctx) {
  const { state } = ctx;
  const d = dyn(state);
  const valuable = d.heirlooms.filter((h) => h.value >= 300);
  if (!valuable.length || state.character.age < 25 || !sideRng(state, 0xd1).chance(0.06)) return;
  const h = valuable[state.character.age % valuable.length];
  const offer = Math.round(h.value * (1.5 + (state.character.age % 5) * 0.4));
  ctx.prompt({ type: 'familyLegacy.dealer', icon: h.icon, title: 'An Offer', text: `An antiques dealer has seen ${h.name} and offers $${offer.toLocaleString()} for it. It's been in the family since ${h.since}, ${h.story}.`, options: [
    { id: 'keep', label: '🏠 It stays in the family' },
    { id: 'sell', label: `💰 Sell it ($${offer.toLocaleString()})` },
  ], data: { id: h.id, offer } });
}

function matchPrompt(ctx) {
  const { state } = ctx;
  const d = dyn(state);
  const age = state.character.age;
  const why = matchmade(state);
  if (!why || partnerOf(state) || age < 19 || age > 32 || (d.matchAsked != null && age - d.matchAsked < 3) || state.legal?.incarceration) return;
  const rng = sideRng(state, 0x3a7);
  if (!rng.chance(0.35)) return;
  d.matchAsked = age;
  const gender = state.character.gender === 'female' ? 'male' : 'female';
  const pAge = Math.max(18, age + (gender === 'male' ? rng.int(0, 6) : rng.int(-4, 1)));
  const p = makePerson(ctx, { relation: 'candidate', gender, age: pAge });
  const dowry = why === 'custom' ? 0 : rng.int(2, 12) * 10000;
  ctx.prompt({ type: 'familyLegacy.match', icon: '💍', title: 'An Arranged Match', text: `Your family has found you a match: ${p.firstName} ${p.lastName}, ${pAge}, from ${why === 'custom' ? 'a good family two streets away' : 'a family of standing'}. ${why === 'custom' ? 'It\'s how marriages are made here.' : 'Families like yours marry carefully.'}`, options: [
    { id: 'accept', label: '💒 Agree to the marriage', hint: dowry ? `A marriage settlement of $${dowry.toLocaleString()}` : 'The families are pleased' },
    { id: 'court', label: '🫖 Meet them properly first' },
    { id: 'refuse', label: '🙅 Refuse', hint: 'The family won\'t forget it', tone: 'danger' },
  ], data: { person: { firstName: p.firstName, lastName: p.lastName, gender, age: pAge }, dowry } });
}

function seatPrompt(ctx) {
  const { state } = ctx;
  const offer = dyn(state).seatOffer;
  if (!offer || state.prompts.some((p) => p.type === 'familyLegacy.seat')) return;
  ctx.prompt({ type: 'familyLegacy.seat', icon: '🏡', title: 'The Family Seat', text: `${offer.name[0].toUpperCase()}${offer.name.slice(1)}, the family's home since ${offer.since}, is part of the estate. You can buy it from the estate for $${offer.value.toLocaleString()} and keep it in the family, or let it be sold.`, options: [
    { id: 'keep', label: '🏡 Keep it in the family', hint: `$${offer.value.toLocaleString()}, on credit if need be` },
    { id: 'sell', label: '🏚️ Let it go' },
  ], data: {} });
}
