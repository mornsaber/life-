/**
 * Domestic abuse, from the abuser's side: something the player can do, and that never pays.
 *
 *   Coercive control   Checking their phone, cutting them off from friends, controlling the
 *                      money. A crime in itself in England and Wales, Scotland, Ireland and
 *                      parts of Australia; everywhere it wrecks the relationship.
 *   Assault            Hitting a partner. Neighbours call the police; injuries are photographed;
 *                      prosecutors increasingly go ahead without the victim's evidence.
 *   Arguments          When a relationship is bad and you're stressed or drinking, a row can
 *                      escalate: walk away, shout, or lash out.
 *
 * Every incident costs: their trust and safety, your children's wellbeing, guilt, and a case
 * against you. Abuse escalates with each incident, and partners leave, report, or get protective
 * orders. A perpetrator programme is the way out — slow, and only if you go.
 *
 * state.legal.crime.abuse = { partnerId, incidents, lastAge, programme }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { commitOffense } from '../legal/JusticeSystem.js';
import { crimeOf } from '../legal/StreetCrime.js';
import { partnerOf, minorChildren } from '../people/People.js';
import { divorce } from '../people/PeopleEngine.js';
import { hasCondition } from '../health/Conditions.js';
import { addGuilt } from './Violence.js';
import { priceLevel } from '../world/Countries.js';

/** Where coercive control is a criminal offence on its own. */
const CONTROL_IS_CRIME = new Set(['GB', 'IE', 'AU', 'NZ', 'FR']);

const abuseOf = (state, partner) => {
  const c = crimeOf(state);
  if (!c.abuse || c.abuse.partnerId !== partner.id) c.abuse = { partnerId: partner.id, incidents: 0, lastAge: null, programme: 0 };
  return c.abuse;
};

/** The partner reaches the end: they leave, and maybe they report it. */
function partnerLeaves(ctx, partner, { reported }) {
  const { state } = ctx;
  if (partner.relation === 'spouse') divorce(ctx, partner, { contested: true });
  else partner.relation = 'ex';
  partner.relationship = 0;
  state.legal.flags.protectiveOrder = state.character.age;
  ctx.log(`${partner.firstName} left, with ${minorChildren(state).length ? 'the children and ' : ''}a bag packed in a hurry.${reported ? ' A court granted a protective order: you may not contact them or go near their home.' : ''}`, '🚪', 'bad');
  ctx.stat('happiness', -15);
  const c = crimeOf(state);
  c.abuse = null;
}

/** What one incident does. kind: 'control' | 'assault' */
function incident(ctx, kind) {
  const { state, rng } = ctx;
  const partner = partnerOf(state);
  if (!partner) return ctx.toast('You have no partner', 'warn');
  const a = abuseOf(state, partner);
  a.incidents += 1;
  a.lastAge = state.character.age;
  const kids = minorChildren(state);
  const cc = state.character.countryId ?? 'US';
  if (kind === 'control') {
    partner.relationship = Math.max(0, (partner.relationship ?? 60) - 12);
    addGuilt(state, 4);
    ctx.log(`You went through ${partner.firstName}'s phone again, told them who they could see, and took over the bank card. ${partner.firstName} has stopped arguing back.`, '📱', 'bad');
    if (CONTROL_IS_CRIME.has(cc)) commitOffense(ctx, { offenseId: 'domesticAbuse', discovery: clamp(0.05 * a.incidents, 0.05, 0.4), evidence: 0.6, context: `a pattern of coercive and controlling behaviour towards ${partner.firstName}` });
  } else {
    partner.relationship = Math.max(0, (partner.relationship ?? 60) - 30);
    addGuilt(state, 15);
    ctx.log(`You hit ${partner.firstName}. ${rng.pick(['There was a bruise the next morning that neither of you mentioned.', 'They locked themselves in the bathroom until you fell asleep.', 'They told work they had walked into a door.'])}`, '🥀', 'bad');
    for (const k of kids) k.relationship = Math.max(0, (k.relationship ?? 70) - 15);
    if (kids.length) ctx.log(`${kids.length === 1 ? kids[0].firstName : 'The children'} heard everything through the wall.`, '🧸', 'bad');
    // Neighbours call the police.
    const called = rng.chance(clamp(0.2 + a.incidents * 0.05, 0.2, 0.6));
    commitOffense(ctx, { offenseId: a.incidents >= 3 ? 'domesticAbuse' : 'assault', caught: called, discovery: 0.3, evidence: 0.7, context: `assaulting ${partner.firstName}${called ? ' — a neighbour called the police' : ''}` });
    if (state.legal.incarceration) return undefined;
  }
  ctx.emit('fame:scandal', { severity: kind === 'assault' ? 12 : 4, headline: 'reports of abuse at home' });
  // Escalation ends relationships: the more it happens, the more likely they leave and report.
  if (rng.chance(clamp(0.1 + a.incidents * (kind === 'assault' ? 0.15 : 0.05) + ((partner.relationship ?? 0) < 20 ? 0.2 : 0), 0, 0.85))) {
    const reported = kind === 'assault' || rng.chance(0.4);
    if (reported && kind !== 'assault') commitOffense(ctx, { offenseId: CONTROL_IS_CRIME.has(cc) ? 'domesticAbuse' : 'assault', discovery: 0.45, evidence: 0.65, context: `${partner.firstName}'s statement to the police` });
    partnerLeaves(ctx, partner, { reported });
  }
  return undefined;
}

export const DomesticAbuseActions = {
  /** arg: 'control' | 'assault' */
  abusePartner(ctx, kind = 'control') {
    const { state } = ctx;
    if (state.character.age < 16) return ctx.toast('Too young', 'warn');
    if (!partnerOf(state)) return ctx.toast('You have no partner', 'warn');
    if (yearlyCount(state, `risky.abuse.${kind}`)) return ctx.toast('Once a year', 'warn');
    bumpYearly(state, `risky.abuse.${kind}`);
    return incident(ctx, kind === 'assault' ? 'assault' : 'control');
  },
  /** A domestic-abuse perpetrator programme: weekly groups, accountability, and slow change. */
  abuseProgramme(ctx) {
    const { state, rng } = ctx;
    const c = crimeOf(state);
    if (!c.abuse?.incidents) return ctx.toast('Nothing to work on', 'warn');
    if (yearlyCount(state, 'crime.abuseProgramme')) return ctx.toast('Once a year', 'warn');
    bumpYearly(state, 'crime.abuseProgramme');
    ctx.spend(Math.round(1500 * priceLevel(state)), 'Perpetrator programme', { allowDebt: true });
    c.abuse.programme += 1;
    c.guilt = Math.max(0, (c.guilt ?? 0) - 8);
    const partner = partnerOf(state);
    if (partner && rng.chance(0.4)) partner.relationship = Math.min(100, (partner.relationship ?? 30) + 5);
    ctx.log(`Week after week in a room of men and women who had done what you did, you learned to name it. ${c.abuse.programme >= 2 ? 'The urge to control is quieter now.' : 'It is a start, not a fix.'}`, '🪑', 'info');
  },
};

/** Yearly: a bad relationship, stress or drink, and a row that could go one of three ways. */
export function abuseTick(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < 18 || state.legal.incarceration) return;
  const partner = partnerOf(state);
  if (!partner) return;
  const c = state.legal.crime;
  const prior = c?.abuse?.partnerId === partner.id ? c.abuse.incidents : 0;
  const programme = c?.abuse?.programme ?? 0;
  const risk = clamp(((partner.relationship ?? 60) < 40 ? 0.04 : 0.01) + (state.stats.stress > 75 ? 0.03 : 0) + (hasCondition(state, 'alcohol') ? 0.04 : 0) + prior * 0.05 - programme * 0.04, 0, 0.3);
  if (!rng.chance(risk)) return;
  ctx.prompt({
    type: 'crime.row', icon: '💢', title: 'The Row',
    text: `It started over ${rng.pick(['money', 'who forgot to pick up the kids', 'a message on their phone', 'nothing at all'])}. Now ${partner.firstName} is shouting, and so are you.`,
    options: [
      { id: 'walk', label: '🚪 Walk out until you\'ve both calmed down' },
      { id: 'shout', label: '🗣️ Shout back' },
      { id: 'hit', label: '✋ Lash out', tone: 'danger', illegal: 'domestic assault' },
    ],
  });
}

export const DomesticAbuseResolvers = {
  row(ctx, _data, optionId) {
    const partner = partnerOf(ctx.state);
    if (!partner) return undefined;
    if (optionId === 'walk') return ctx.log('You walked round the block twice. When you came back, you both apologised.', '🚪', 'info');
    if (optionId === 'shout') {
      partner.relationship = Math.max(0, (partner.relationship ?? 60) - 6);
      return ctx.log('You said things you can\'t take back. You slept on the sofa.', '🗣️', 'warn');
    }
    return incident(ctx, 'assault');
  },
};
