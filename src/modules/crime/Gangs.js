/**
 * Gangs on the street, and the children they recruit.
 *
 *   Youth gangs    From 12, in a city with gangs, older kids may ask you to hold something, run a
 *                  package, keep watch. It starts as belonging and a little money. Say yes and you
 *                  run with them: street rep, protection, fights, and at 16 the choice to be jumped
 *                  in for real (Underworld.js membership).
 *   Juvenile crime Tagging, joyriding, fights at school, a knife "for protection", selling at
 *                  school, stealing from your parents: heard in the youth court (JuvenileCourt.js).
 *   Turf           Dealing on an outfit's corners draws them (Drugs.js): pay, refuse, or pull back.
 *   Orders         Inside an outfit, the boss may want someone gone. Refusing has a price; so does
 *                  doing it; so does going to the police.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { commitOffense } from '../legal/JusticeSystem.js';
import { crimeOf, crimeForMoney } from '../legal/StreetCrime.js';
import { meOf, outfitsHere, OUTFIT_TYPES } from '../legal/Underworld.js';
import { crimeLevelHere } from './CrimeWorld.js';
import { addGuilt } from './Violence.js';
import { drugsOf } from './Drugs.js';
import { priceLevel } from '../world/Countries.js';

/** Crimes children commit (10–17). */
export const JUVENILE_CRIMES = [
  { id: 'tag', label: 'Tag Walls and Trains', icon: '🎨', minAge: 11, desc: 'Respect from the crew; vandalism if caught',
    run: { offenseId: 'vandalism', money: [0, 0], caughtNow: 0.12, discovery: 0.05, evidence: 0.8, context: 'transport police with photos of your tag', text: 'You hit a train yard at 3 a.m. Your tag is on half the line now.' } },
  { id: 'joyride', label: 'Take a Car for a Joyride', icon: '🚗', minAge: 13, desc: 'Fast, stupid, and sometimes fatal', custom: 'joyride' },
  { id: 'schoolFight', label: 'Fight After School', icon: '👊', minAge: 10, desc: 'Suspension — or police', custom: 'schoolFight' },
  { id: 'carryKnife', label: 'Carry a Knife "for Protection"', icon: '🔪', minAge: 12, desc: 'Everyone says they do', custom: 'carryKnife' },
  { id: 'sellAtSchool', label: 'Sell Weed at School', icon: '🌿', minAge: 13, desc: 'Expulsion and a supply charge',
    run: { offenseId: 'drugDistribution', money: [200, 2500], caughtNow: 0.15, discovery: 0.15, evidence: 0.8, context: 'a teacher found the bags in your locker', text: 'You sold to half of Year 10 out of a backpack.' } },
  { id: 'stealParents', label: 'Steal From Your Parents', icon: '👛', minAge: 10, desc: 'They will find out', custom: 'stealParents' },
];
const crewName = (state) => crimeOf(state).youthGang?.name ?? 'the older kids';

const CUSTOM = {
  joyride(ctx) {
    const { state, rng } = ctx;
    const c = crimeOf(state);
    c.rep = clamp((c.rep ?? 0) + 2, 0, 100);
    if (rng.chance(0.08)) {
      ctx.stat('health', -rng.int(15, 45));
      ctx.log('You lost it on a bend and went through a fence. The airbag broke your nose; the passenger was airlifted.', '💥', 'bad');
      addGuilt(state, 10);
      return commitOffense(ctx, { offenseId: 'reckless', caught: true, evidence: 0.95, context: 'a crash in a stolen car' });
    }
    ctx.stat('happiness', 6);
    ctx.log('You took a car with the keys left in it and drove it far too fast down the bypass, then left it in a car park.', '🚗', 'warn');
    commitOffense(ctx, { offenseId: 'joyriding', caught: rng.chance(0.15), discovery: 0.12, evidence: 0.75, context: 'a stolen car found with your prints on the wheel' });
  },
  schoolFight(ctx) {
    const { state, rng } = ctx;
    const win = rng.chance(clamp(0.4 + (state.stats.fitness - 50) / 150, 0.1, 0.85));
    ctx.stat('health', -rng.int(1, win ? 6 : 15));
    crimeOf(state).rep = clamp((crimeOf(state).rep ?? 0) + (win ? 2 : 0), 0, 100);
    if (rng.chance(0.2)) return commitOffense(ctx, { offenseId: 'assault', caught: true, evidence: 0.8, context: 'a fight after school filmed on someone\'s phone' });
    ctx.log(win ? 'You won the fight behind the sports hall. Somebody filmed it; you were suspended for three days.' : 'You lost, in front of everyone. You were suspended anyway.', '👊', 'warn');
    state.education.discipline = (state.education.discipline ?? 0) + 1;
  },
  carryKnife(ctx) {
    const { state, rng } = ctx;
    crimeOf(state).armed = 'knife';
    ctx.log('You started carrying a knife in your waistband. You felt safer. You weren\'t.', '🔪', 'warn');
    if (rng.chance(0.12)) commitOffense(ctx, { offenseId: 'knifeCrime', caught: true, evidence: 0.9, context: 'stop and search outside a chicken shop' });
  },
  stealParents(ctx) {
    const { state, rng } = ctx;
    const parent = (state.people?.list ?? []).find((p) => p.alive && ['mother', 'father'].includes(p.relation));
    if (!parent) return ctx.toast('There\'s nobody to steal from', 'warn');
    const take = Math.round(rng.int(20, 300) * priceLevel(state));
    ctx.earn(take, 'Taken from a parent\'s purse');
    if (rng.chance(0.55)) {
      parent.relationship = Math.max(0, (parent.relationship ?? 60) - 15);
      return ctx.log(`${parent.firstName} counted the money. ${parent.firstName} didn't shout; ${parent.firstName} just looked at you. That was worse.`, '👛', 'bad');
    }
    ctx.log(`You took $${take} from ${parent.firstName}'s wallet. Nobody noticed. Yet.`, '👛', 'warn');
  },
};

export const GangActions = Object.fromEntries(JUVENILE_CRIMES.map((cr) => [cr.id, (ctx) => {
  const { state } = ctx;
  if (state.character.age < cr.minAge) return ctx.toast(`Age ${cr.minAge}+`, 'warn');
  if (state.character.age >= 18) return ctx.toast('That\'s kids\' stuff', 'warn');
  if (yearlyCount(state, `risky.${cr.id}`)) return ctx.toast('Lay low for the rest of the year.', 'warn');
  bumpYearly(state, `risky.${cr.id}`);
  if (cr.custom) return CUSTOM[cr.custom](ctx);
  return crimeForMoney(ctx, { id: cr.id, group: 'juvenile', icon: cr.icon, ...cr.run });
}]));

/** Leave the youth gang — not always simple. */
GangActions.leaveYouthGang = (ctx) => {
  const { state, rng } = ctx;
  const c = crimeOf(state);
  if (!c.youthGang) return;
  if (rng.chance(0.3)) { ctx.stat('health', -rng.int(5, 15)); ctx.log(`${crewName(state)} didn't take it well. They caught you on the way home.`, '🩸', 'bad'); }
  ctx.log(`You stopped answering ${crewName(state)}. Your mum noticed you were home more.`, '🚶', 'info');
  c.youthGang = null;
};

/** Yearly: recruitment, the youth gang's year, and orders from the outfit. */
export function gangsTick(ctx) {
  const { state, rng } = ctx;
  if (state.legal.incarceration) return;
  const age = state.character.age;
  const c = crimeOf(state);
  // Recruitment: children in rough neighbourhoods, unhappy children, children already in trouble.
  if (age >= 12 && age < 18 && !c.youthGang && !meOf(state)) {
    const risk = clamp(crimeLevelHere(state) * 0.12 + (state.stats.happiness < 40 ? 0.04 : 0) + (state.legal.record.length ? 0.05 : 0) + (c.rep ?? 0) / 200, 0, 0.25);
    if (rng.chance(risk)) {
      const outfits = outfitsHere(state, rng).filter((o) => ['gang', 'mc', 'firm', 'cartel'].includes(o.type));
      const o = outfits[0];
      const name = o ? o.name : 'the older boys from the estate';
      ctx.prompt({
        type: 'crime.recruit', icon: '🧢', title: 'The Older Kids',
        text: `Some older kids who run with ${name} have been nice to you. Today one of them asks if you'll hold a bag for him — just till tomorrow. There's £20 in it. Everyone's watching.`.replace('£', state.character.countryId === 'GB' ? '£' : '$'),
        options: [
          { id: 'yes', label: '🎒 Hold the bag', tone: 'danger', hint: 'Belonging, money — and a debt' },
          { id: 'no', label: '🙅 Say no and walk home' },
          { id: 'tell', label: '🗣️ Tell a teacher or youth worker' },
        ],
        data: { outfitId: o?.id ?? null, name },
      });
    }
  }
  if (c.youthGang && age < 18) {
    c.rep = clamp((c.rep ?? 0) + 3, 0, 100);
    const r = rng.next();
    if (r < 0.15) { if (rng.chance(0.3)) ctx.emit('health:acute', { id: 'stabWound' }); else ctx.stat('health', -rng.int(5, 20)); ctx.log(`A boy from a rival estate stabbed one of ${crewName(state)} in the leg. Everyone says you have to go back for him.`, '🩸', 'bad'); }
    else if (r < 0.3) { ctx.earn(Math.round(rng.int(200, 1500) * priceLevel(state)), 'Running packages'); ctx.log('You ran packages across town on a bike. You don\'t ask what\'s in them.', '🚲', 'warn'); commitOffense(ctx, { offenseId: 'possessionWithIntent', discovery: 0.1, evidence: 0.7, context: 'a county-lines investigation' }); }
    else if (r < 0.4) { state.stats.smarts = Math.max(0, state.stats.smarts - 2); ctx.log('You barely went to school this year.', '🎒', 'bad'); }
    // At 16: jumped in for real.
    if (age >= 16 && c.youthGang.outfitId && !c.youthGang.offered) {
      c.youthGang.offered = true;
      ctx.prompt({ type: 'crime.jumpIn', icon: '🧢', title: 'Jumped In', text: `${c.youthGang.name} say you've earned it: be jumped in and you're a member, not a kid who hangs around.`, options: [{ id: 'yes', label: '✊ Take the beating and join', tone: 'danger' }, { id: 'no', label: '🚶 Not yet' }], data: { outfitId: c.youthGang.outfitId } });
    }
  }
  if (c.youthGang && age >= 18) c.youthGang = null;
  // The outfit's orders.
  const me = meOf(state);
  if (me && me.rank >= 1 && age >= 18 && rng.chance(0.06)) {
    const n = randomName(rng, 'male');
    ctx.prompt({
      type: 'crime.order', icon: '🎯', title: 'The Order',
      text: `The boss wants ${n.firstName} ${n.lastName} gone. He's been talking to the police, they say. You're the one they trust with it.`,
      options: [
        { id: 'do', label: '🔫 Do it', tone: 'danger', hint: 'Respect, money — and murder' },
        { id: 'refuse', label: '🙅 Refuse', hint: 'The boss will remember' },
        { id: 'warn', label: '📞 Warn him, and go to the police yourself', hint: 'You become the informant' },
      ],
      data: { victim: `${n.firstName} ${n.lastName}` },
    });
  }
}

export const GangResolvers = {
  recruit(ctx, data, optionId) {
    const { state } = ctx;
    const c = crimeOf(state);
    if (optionId === 'yes') {
      c.youthGang = { outfitId: data.outfitId, name: data.name, since: state.character.age };
      c.rep = clamp((c.rep ?? 0) + 5, 0, 100);
      ctx.stat('happiness', 4);
      return ctx.log(`You held the bag. The next week it was a package; the week after, a phone you weren't allowed to switch off. You run with ${data.name} now.`, '🧢', 'warn');
    }
    if (optionId === 'tell') {
      ctx.log('A youth worker got you into a boxing club three nights a week. The older kids stopped asking.', '🥊', 'good');
      return ctx.stat('fitness', 4);
    }
    ctx.log('You said no. They laughed. Tomorrow you take the long way home.', '🚶', 'info');
  },
  jumpIn(ctx, data, optionId) {
    const { state, rng } = ctx;
    if (optionId !== 'yes') return ctx.log('You told them you weren\'t ready. They let it go — this time.', '🚶', 'info');
    const o = state.underworld?.outfits?.[data.outfitId];
    if (!o) return;
    ctx.stat('health', -rng.int(8, 20));
    state.underworld.me = { outfitId: o.id, rank: 0, respect: 20, trust: 55, rackets: [], skim: 0, crew: [], dirty: 0, made: false, joinedAge: state.character.age, history: [] };
    crimeOf(state).youthGang = null;
    ctx.log(OUTFIT_TYPES[o.type].made, OUTFIT_TYPES[o.type].icon, 'warn');
  },
  turf(ctx, data, optionId) {
    const { state, rng } = ctx;
    const d = drugsOf(state);
    const o = state.underworld?.outfits?.[data.outfitId];
    if (optionId === 'pay') {
      const tax = Math.round((d.sold ?? 0) * 0.1);
      ctx.spend(tax, `Tribute to ${o?.name ?? 'the outfit'}`, { allowDebt: true });
      return ctx.log(`You paid ${o?.name ?? 'them'} $${tax.toLocaleString()}. You work their corners on their terms now.`, '💵', 'warn');
    }
    if (optionId === 'pull') {
      d.territory = Math.max(0, d.territory - 15);
      d.runners = Math.max(0, d.runners - 2);
      return ctx.log('You pulled your runners off their corners.', '🏳️', 'info');
    }
    crimeOf(state).rep = clamp((crimeOf(state).rep ?? 0) + 6, 0, 100);
    if (rng.chance(0.15)) { ctx.log('They came for you first: a car slowed outside your building.', '🚗', 'bad'); ctx.emit('health:acute', { id: 'gunshotWound' }); }
    if (rng.chance(0.5)) {
      d.runners = Math.max(0, d.runners - 1);
      ctx.log('A week later one of your runners was shot dead on his corner. He was seventeen.', '⚰️', 'death');
      addGuilt(state, 15);
      ctx.emit('health:trauma', { amount: 10, source: 'violence' });
    } else ctx.log(`You told ${o?.name ?? 'them'} where to go. For now, they're watching.`, '✊', 'warn');
  },
  order(ctx, data, optionId) {
    const { state, rng } = ctx;
    const me = meOf(state);
    if (!me) return;
    if (optionId === 'do') {
      me.respect = clamp(me.respect + 15, 0, 100);
      me.trust = clamp(me.trust + 10, 0, 100);
      const pay = Math.round(rng.int(10000, 50000) * priceLevel(state));
      ctx.earn(pay, 'Undisclosed income');
      addGuilt(state, 40);
      ctx.emit('health:trauma', { amount: 20, source: 'killing' });
      ctx.log(`You waited outside ${data.victim}'s house until he came out for cigarettes. It took four seconds. $${pay.toLocaleString()} came in an envelope the next day.`, '⚰️', 'death');
      return commitOffense(ctx, { offenseId: 'firstDegreeMurder', discovery: 0.2, evidence: 0.6, context: `the contract killing of ${data.victim}`, yearsLeft: 99 });
    }
    if (optionId === 'refuse') {
      me.trust = clamp(me.trust - 25, 0, 100);
      if (rng.chance(0.25)) { me.marked = true; ctx.log('You said no. The boss smiled and said he understood. Nobody has called you since.', '🎯', 'bad'); }
      else ctx.log('You said no. Someone else did it. You were told to be grateful.', '🙅', 'warn');
      return;
    }
    me.informant = true;
    me.trust = clamp(me.trust - 10, 0, 100);
    ctx.log(`You warned ${data.victim} and called a detective you'd once been arrested by. You're an informant now: every meeting with the outfit, you wonder if they know.`, '🐀', 'warn');
    ctx.stat('stress', 15);
  },
};
