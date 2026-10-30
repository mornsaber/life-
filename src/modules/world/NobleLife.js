/**
 * The social side of a titled family, and the slow arithmetic of old money.
 *
 *   Standing     0–100: how society sees you. Etiquette slips, scandals and an unsuitable
 *                marriage lower it; a good Season, patronages and a well-run house raise it.
 *   The debut    at 17–19, presented at a debutante ball (Queen Charlotte's Ball, the Bal des
 *                Débutantes, the Vienna Opera Ball): once, and remembered.
 *   A match      the family has someone in mind — another old family, money, land. Accept
 *                (a settlement, a cool start), meet them properly first, or marry for love.
 *   Decline      most old families get poorer each generation: death duties, roofs, too many
 *                younger children. When the estate can't keep the house, a choice: marry
 *                money, hand the house to a heritage trust and keep a wing, or sell the
 *                contents room by room.
 *
 * state.noble.standing, .debut, .matchOffered, .declineHandled
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount } from '../../core/State.js';
import { estateOf, titleCountry } from './Nobility.js';
import { makePerson } from '../people/PeopleEngine.js';
import { partnerOf } from '../people/People.js';

const DEBUT = { GB: 'Queen Charlotte\'s Ball', FR: 'Le Bal des Débutantes in Paris', AT: 'the Vienna Opera Ball', DE: 'the Vienna Opera Ball', ES: 'a puesta de largo in Madrid', IT: 'a ball at a Roman palazzo', BE: 'a ball at the Château', NL: 'a ball in The Hague', SE: 'the Riddarhuset ball' };
const TRUST = { GB: 'the National Trust', FR: 'the Centre des monuments nationaux', ES: 'Patrimonio Nacional', IT: 'the FAI', DE: 'a state palaces foundation', AT: 'a heritage foundation' };
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 24851 + state.character.age * 457 + 0xb0b) >>> 0);
export const standingOf = (state) => Math.round(state.noble?.standing ?? 55);
const bump = (state, n) => { state.noble.standing = clamp((state.noble.standing ?? 55) + n, 0, 100); };

const SLIPS = [
  { id: 'seating', title: 'The Seating Plan', text: 'At your dinner, a bishop has been seated below a baronet\'s wife. The bishop has noticed.', options: [{ id: 'fix', label: '🙇 Apologise and reseat between courses', standing: 2 }, { id: 'laugh', label: '😄 Laugh it off', standing: -3 }] },
  { id: 'address', title: 'Forms of Address', text: 'You addressed a duchess as "Lady" in front of half the county.', options: [{ id: 'note', label: '✉️ A handwritten note of apology', standing: 2 }, { id: 'ignore', label: '🤷 Nobody cares about that any more', standing: -4 }] },
  { id: 'press', title: 'The Diary Column', text: 'A society diary column has photographs of you leaving a nightclub at 4 a.m.', options: [{ id: 'quiet', label: '🤐 Say nothing', standing: -2 }, { id: 'own', label: '📸 Lean into it', standing: -6, fame: 3 }] },
  { id: 'hunt', title: 'The Hunt Question', text: 'Protesters are at the gates; the county wants you to ride out with the hunt, the village wants you to stop it.', options: [{ id: 'ride', label: '🐎 Ride out', standing: 3, village: -6 }, { id: 'stop', label: '🚫 Close the estate to the hunt', standing: -5, village: 6 }] },
];

export function nobleLifeTick(main) {
  const { state } = main;
  const n = state.noble;
  if (!n || !state.character.alive) return;
  n.standing ??= 55;
  const age = state.character.age;
  const rng = sideRng(state);
  const ctx = { ...main, rng };
  const home = (state.character.countryId ?? 'US') === titleCountry(state);
  // Drift: standing follows the life you lead.
  if (yearlyCount(state, 'nobility.season') || yearlyCount(state, 'nobility.patron')) bump(state, 2);
  if (state.legal?.record?.some((r) => r.age === age - 1 && r.severity === 'felony')) bump(state, -15);
  // The debut.
  if (age >= 17 && age <= 19 && !n.debut && home) {
    n.debut = true;
    return ctx.prompt({ type: 'nobleLife.debut', icon: '👗', title: 'Your Debut', text: `You have been invited to be presented at ${DEBUT[titleCountry(state)] ?? 'a debutante ball'}.`, data: {}, options: [{ id: 'go', label: '💃 Go, and dance until dawn', hint: 'Standing and introductions' }, { id: 'refuse', label: '🙅 It\'s a relic. Refuse.', hint: 'Your grandmother will be told' }] });
  }
  // A match.
  if (age >= 22 && age <= 34 && !n.matchOffered && !partnerOf(state) && rng.chance(0.3)) {
    n.matchOffered = age;
    const g = state.character.gender === 'female' ? 'male' : 'female';
    const p = makePerson(ctx, { relation: 'friend', gender: g, age: age + rng.int(-3, 5), relationship: 40, circle: 'society' });
    const rich = rng.chance(0.5);
    const kind = rich ? 'an heir to a banking fortune' : `the ${rng.pick(['second', 'eldest', 'only'])} child of another old family, with land next to yours`;
    return ctx.prompt({ type: 'nobleLife.match', icon: '💍', title: 'The Family Has Someone in Mind', text: `Your parents would like you to meet ${p.firstName} ${p.lastName}: ${kind}. They have, they let it be known, already spoken to ${p.firstName}'s parents.`, data: { person: p, rich }, options: [
      { id: 'accept', label: '💍 Accept the match', hint: 'A settlement on the marriage; love may come later' },
      { id: 'court', label: '🌹 Meet them properly first', hint: 'See if there\'s anything there' },
      { id: 'love', label: '❤️ You\'ll marry for love, thank you', hint: 'The family will remember' },
    ] });
  }
  // Decline: the house costs more than the estate can carry.
  const e = estateOf(state);
  if (e?.owner === 'you' && !n.declineHandled && e.value < 3e6 && rng.chance(0.25)) {
    n.declineHandled = age;
    return ctx.prompt({ type: 'nobleLife.decline', icon: '🏚️', title: `${e.name} Is Too Expensive`, text: `The land agent's figures are plain: ${e.name} costs more to keep than the estate earns, and has for years. Your grandfather sold the Van Dyck; your father let the farms go. What now?`, data: {}, options: [
      { id: 'trust', label: `🏛️ Give the house to ${TRUST[titleCountry(state)] ?? 'a heritage trust'} and keep a wing`, hint: 'No more roof bills; no longer yours' },
      { id: 'contents', label: '🖼️ Sell the contents, room by room', hint: 'Buys a decade' },
      { id: 'commercial', label: '💒 Go all in on weddings, festivals and glamping', hint: 'Hard work; it might work' },
    ] });
  }
  // Etiquette and society.
  if (age >= 18 && home && rng.chance(0.3)) {
    const s = rng.pick(SLIPS);
    ctx.prompt({ type: 'nobleLife.slip', icon: '🎩', title: s.title, text: `${s.text}\nStanding in society: ${standingOf(state)}/100.`, data: { id: s.id }, options: s.options.map((o) => ({ id: o.id, label: o.label })) });
  }
}

export const NobleLifeResolvers = {
  debut(ctx, data, optionId) {
    const { state, rng } = ctx;
    if (optionId === 'refuse') { bump(state, -4); for (const p of state.people.list.filter((x) => ['mother', 'father'].includes(x.relation))) p.relationship = clamp(p.relationship - 5, 0, 100); return ctx.log('You refused to be presented. It was mentioned at Christmas.', '🙅', 'info'); }
    bump(state, 8);
    ctx.stat('happiness', 6);
    if (rng.chance(0.5)) state.people.list.push(makePerson(ctx, { relation: 'friend', age: state.character.age + rng.int(-1, 2), relationship: 62, circle: 'society' }));
    ctx.log('You curtseyed (or bowed) to the cake, danced the first waltz and met half the people you will know for the rest of your life.', '💃', 'good');
  },
  match(ctx, data, optionId) {
    const { state, rng } = ctx;
    const p = { ...data.person };
    const parents = state.people.list.filter((x) => ['mother', 'father'].includes(x.relation));
    if (optionId === 'love') { for (const x of parents) x.relationship = clamp(x.relationship - 10, 0, 100); bump(state, -2); return ctx.log('You told your parents you would choose for yourself. Your mother didn\'t speak to you for a month.', '❤️', 'warn'); }
    if (optionId === 'court') {
      p.relationship = rng.int(45, 75);
      p.relation = p.relationship >= 60 ? 'partner' : 'friend';
      state.people.list.push(p);
      return ctx.log(p.relation === 'partner' ? `You and ${p.firstName} met for lunch, then again, then every weekend. Your parents are insufferably pleased.` : `${p.firstName} was perfectly nice. There was nothing there. You stayed friends.`, '🌹', p.relation === 'partner' ? 'good' : 'info');
    }
    p.relation = 'fiance';
    p.relationship = 55;
    p.spark = 30;
    state.people.list.push(p);
    for (const x of parents) x.relationship = clamp(x.relationship + 8, 0, 100);
    bump(state, 6);
    const settlement = Math.round((data.rich ? rng.int(400, 1500) : rng.int(100, 400)) * 1000);
    ctx.earn(settlement, 'Marriage settlement');
    const e = estateOf(state);
    if (e && !data.rich) e.value = Math.round(e.value * 1.15);
    ctx.log(`You are engaged to ${p.firstName}. The lawyers settled $${settlement.toLocaleString()} on the marriage${!data.rich && e ? ` and the two estates' land will be farmed together` : ''}. Whether you will love each other is another matter.`, '💍', 'milestone');
  },
  decline(ctx, data, optionId) {
    const { state, rng } = ctx;
    const e = estateOf(state);
    if (!e) return;
    if (optionId === 'trust') { e.strategy = 'open'; e.value = Math.round(e.value * 0.35); e.heirlooms = 0; ctx.stat('stress', -10); bump(state, -3); return ctx.log(`You handed the house to ${TRUST[titleCountry(state)] ?? 'a heritage trust'}. The family keeps a flat in the east wing and the title; visitors buy tea in your old kitchen.`, '🏛️', 'info'); }
    if (optionId === 'contents') { const price = Math.round(e.value * rng.float(0.15, 0.3)); ctx.earn(price, `${e.name}: contents sale`); e.heirlooms = 0; for (const x of state.people.list.filter((y) => ['mother', 'father', 'sibling'].includes(y.relation))) x.relationship = clamp(x.relationship - 10, 0, 100); return ctx.log(`The auction house catalogued the house: three days of sales, $${price.toLocaleString()}, and empty walls with paler squares where pictures hung for two hundred years.`, '🖼️', 'warn'); }
    e.strategy = 'events';
    ctx.stat('stress', 8);
    const works = rng.chance(0.55);
    e.value = Math.round(e.value * (works ? 1.3 : 0.9));
    ctx.log(works ? 'Weddings every weekend, a music festival in the park, yurts in the walled garden. It\'s working.' : 'The festival lost money and the neighbours sued over the noise.', '💒', works ? 'good' : 'bad');
  },
  slip(ctx, data, optionId) {
    const { state } = ctx;
    const o = SLIPS.find((s) => s.id === data.id)?.options.find((x) => x.id === optionId);
    if (!o) return;
    bump(state, o.standing ?? 0);
    if (o.fame) ctx.emit('fame:buzz', { amount: o.fame });
    if (o.village) state.politics.recognition = clamp((state.politics.recognition ?? 0) + o.village / 2, 0, 100);
    ctx.log((o.standing ?? 0) >= 0 ? 'It was handled. Society noticed.' : 'Society noticed that too.', '🎩', (o.standing ?? 0) >= 0 ? 'info' : 'warn');
  },
};

export const NobleLifeModule = { id: 'nobleLife', order: 33.75, onAgeUp: nobleLifeTick, resolvers: NobleLifeResolvers };
