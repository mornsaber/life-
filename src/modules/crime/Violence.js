/**
 * Violence: what happens when it stops being about money.
 *
 * Killing is never a button. It comes out of a confrontation that goes wrong, a robbery that
 * goes wrong, or an order from an outfit — and once it has happened there is no undoing it:
 *
 *   Confrontations   Someone you owe, a rival, a drunk who won't let it go. Walk away (it costs
 *                    face), fight, or reach for a weapon if you carry one. Weapons turn fights
 *                    into stabbings and shootings, and some of those people die.
 *   The aftermath    Call an ambulance and claim self-defence (the law of self-defence varies, and
 *                    so do juries), run, or get rid of the body (an outfit makes that easier).
 *   Weapons          A gun or a knife for protection — easy in some countries, hard in others,
 *                    and a crime of its own when you're searched.
 *   Robbery          Street muggings and, where it is common, express kidnapping: forcing someone
 *                    to empty their accounts at ATMs, or holding them for ransom.
 *   Guilt            What you have done stays with you: guilt weighs on happiness and stress, feeds
 *                    trauma, and fades only with time, confession, or making amends.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { commitOffense } from '../legal/JusticeSystem.js';
import { crimeOf } from '../legal/StreetCrime.js';
import { meOf } from '../legal/Underworld.js';
import { priceLevel } from '../world/Countries.js';
import { gunsHere, crimeLevelHere } from './CrimeWorld.js';
import { hasCondition } from '../health/Conditions.js';

const KIDNAP_COUNTRIES = new Set(['MX', 'VE', 'BR', 'CO', 'NG', 'ZA', 'PH', 'HT', 'GT', 'PE', 'EC', 'IN', 'PK']);

export function addGuilt(state, amount) {
  const c = crimeOf(state);
  c.guilt = clamp((c.guilt ?? 0) + amount, 0, 100);
}

/** Yearly: guilt weighs on you, and fades slowly. */
export function guiltTick(ctx) {
  const c = ctx.state.legal.crime;
  if (!c?.guilt) return;
  ctx.stat('happiness', -Math.round(c.guilt / 12));
  ctx.stat('stress', Math.round(c.guilt / 15));
  if (c.guilt >= 40) ctx.emit('health:trauma', { amount: Math.round(c.guilt / 10), source: 'guilt' });
  if (c.guilt >= 50 && ctx.rng.chance(0.15)) ctx.log(rngLine(ctx), '🌑', 'bad');
  c.guilt = Math.max(0, Math.round(c.guilt * 0.88) - 1);
}
const rngLine = (ctx) => ctx.rng.pick(['You still see their face when you close your eyes.', 'You drank until you couldn\'t remember. You remembered anyway.', 'A song came on in a shop and you had to leave.', 'You woke at 4 a.m. again, sure someone was at the door.']);

/** Do you carry? */
const armed = (state) => crimeOf(state).armed ?? null;

/** Yearly: the confrontation that can turn a life. */
export function confrontationTick(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < 15 || state.legal.incarceration) return;
  const c = state.legal.crime;
  const risk = clamp(0.01 + crimeLevelHere(state) * 0.03 + (c?.rep ?? 0) / 600 + (meOf(state) ? 0.04 : 0) + (c?.drugs?.runners ? 0.03 : 0) + (hasCondition(state, 'alcohol') ? 0.03 : 0) + (state.stats.stress > 80 ? 0.02 : 0), 0, 0.18);
  if (!rng.chance(risk)) return;
  const who = rng.pick([
    { id: 'debt', text: 'A man you owe money to corners you outside your building. He has a friend with him.' },
    { id: 'rival', text: 'A guy from a rival crew sees you on the wrong street and starts walking towards you, fast.' },
    { id: 'drunk', text: 'Closing time. A drunk stranger decides you looked at his girlfriend and won\'t let it go.' },
    { id: 'road', text: 'A driver you cut off follows you into a car park and gets out with something in his hand.' },
  ]);
  const w = armed(state);
  const options = [
    { id: 'walk', label: '🚶 Walk away', hint: 'Swallow it' },
    { id: 'fight', label: '👊 Fight', tone: 'danger' },
  ];
  if (w) options.push({ id: 'weapon', label: w === 'gun' ? '🔫 Pull your gun' : '🔪 Pull your knife', tone: 'danger', hint: 'There is no taking it back' });
  ctx.prompt({ type: 'crime.confrontation', icon: '⚠️', title: 'Confrontation', text: who.text, options, data: { who: who.id } });
}

function killed(ctx, how) {
  const { state, rng } = ctx;
  const n = randomName(rng, 'male');
  const age = rng.int(17, 50);
  ctx.log(`${n.firstName} ${n.lastName}, ${age}, died ${how === 'gun' ? 'of a gunshot wound' : 'of stab wounds'} before the ambulance arrived.`, '⚰️', 'death');
  addGuilt(state, 35);
  ctx.emit('health:trauma', { amount: 20, source: 'killing' });
  ctx.stat('happiness', -20);
  const me = meOf(state);
  ctx.prompt({
    type: 'crime.aftermath', icon: '🩸', title: 'What Now',
    text: `${n.firstName} is dead and you killed him. Sirens, somewhere. You have seconds.`,
    options: [
      { id: 'call', label: '📞 Call it in and say it was self-defence', hint: 'Depends on the witnesses, and the law here' },
      { id: 'run', label: '🏃 Run' },
      ...(me ? [{ id: 'outfit', label: '📵 Call the outfit: they have people for this', hint: 'You will owe them' }] : []),
    ],
    data: { victim: `${n.firstName} ${n.lastName}`, how },
  });
}

export const ViolenceResolvers = {
  confrontation(ctx, data, optionId) {
    const { state, rng } = ctx;
    const c = crimeOf(state);
    if (optionId === 'walk') {
      c.rep = Math.max(0, (c.rep ?? 0) - 3);
      return ctx.log('You walked away. Your heart was pounding for an hour, but you\'re alive and so is he.', '🚶', 'info');
    }
    if (optionId === 'fight') {
      const win = rng.chance(clamp(0.35 + (state.stats.fitness - 50) / 150, 0.1, 0.8));
      ctx.stat('health', -rng.int(win ? 2 : 8, win ? 10 : 25));
      c.rep = clamp((c.rep ?? 0) + (win ? 4 : -1), 0, 100);
      if (rng.chance(0.03)) {
        ctx.log('He fell backwards and hit his head on the kerb. He didn\'t get up.', '💀', 'death');
        addGuilt(state, 30);
        ctx.emit('health:trauma', { amount: 15, source: 'killing' });
        return commitOffense(ctx, { offenseId: 'manslaughter', caught: rng.chance(0.6), discovery: 0.6, evidence: 0.8, context: 'a one-punch death outside a bar', yearsLeft: 99 });
      }
      ctx.log(win ? 'You put him on the ground and left.' : 'You took a beating.', '👊', win ? 'warn' : 'bad');
      if (rng.chance(0.25)) commitOffense(ctx, { offenseId: 'assault', caught: rng.chance(0.4), discovery: 0.25, evidence: 0.6, context: 'a street fight' });
      return;
    }
    // A weapon.
    const how = armed(state);
    const roll = rng.next();
    c.rep = clamp((c.rep ?? 0) + 8, 0, 100);
    if (roll < 0.4) {
      ctx.log(`You showed the ${how}. He backed away with his hands up.`, how === 'gun' ? '🔫' : '🔪', 'warn');
      if (rng.chance(0.2)) commitOffense(ctx, { offenseId: how === 'gun' ? 'weaponPossession' : 'knifeCrime', discovery: 0.3, evidence: 0.6, context: 'a witness saw you brandish a weapon' });
      return;
    }
    if (roll < (how === 'gun' ? 0.75 : 0.85)) {
      ctx.log(how === 'gun' ? 'You fired. He went down screaming, hit in the leg.' : 'You stabbed him. He ran, holding his side.', '🩸', 'bad');
      addGuilt(state, 12);
      ctx.emit('health:trauma', { amount: 8, source: 'violence' });
      return commitOffense(ctx, { offenseId: 'aggravatedAssault', caught: rng.chance(0.35), discovery: 0.4, evidence: 0.75, context: how === 'gun' ? 'a non-fatal shooting' : 'a stabbing' });
    }
    return killed(ctx, how);
  },
  aftermath(ctx, data, optionId) {
    const { state, rng } = ctx;
    if (optionId === 'call') {
      ctx.log('You waited for the police with your hands where they could see them.', '📞', 'info');
      // A strong self-defence claim can reduce murder to manslaughter — or win outright.
      if (rng.chance(0.25)) return ctx.log('The witnesses backed you up: he came at you first. The prosecutor declined to charge.', '⚖️', 'good');
      return commitOffense(ctx, { offenseId: 'manslaughter', caught: true, evidence: 0.7, context: `the killing of ${data.victim} (a self-defence claim)` });
    }
    if (optionId === 'outfit') {
      const me = meOf(state);
      if (me) { me.trust = clamp(me.trust - 10, 0, 100); me.respect = clamp(me.respect + 5, 0, 100); }
      ctx.log('Two men arrived in a van twenty minutes later. You never asked where they took him. You owe the outfit now.', '📵', 'bad');
      return commitOffense(ctx, { offenseId: 'murder', discovery: 0.12, evidence: 0.55, context: `the disappearance of ${data.victim}`, yearsLeft: 99 });
    }
    ctx.stat('stress', 20);
    ctx.log('You ran, and you kept running until your legs gave out. Then you threw the weapon in the river.', '🏃', 'bad');
    return commitOffense(ctx, { offenseId: 'murder', discovery: 0.35, evidence: 0.75, context: `the killing of ${data.victim}`, yearsLeft: 99 });
  },
};

export const ViolenceActions = {
  /** Get a weapon outside the law. arg: 'knife' | 'gun' | 'none' */
  arm(ctx, kind) {
    const { state, rng } = ctx;
    const c = crimeOf(state);
    if (kind === 'none') { c.armed = null; return ctx.log('You got rid of the weapon.', '🗑️', 'info'); }
    if (state.character.age < 14) return ctx.toast('Too young', 'warn');
    if (kind === 'gun') {
      const avail = gunsHere(state);
      if (avail === 'hard' && (c.rep ?? 0) < 30 && !meOf(state)) return ctx.toast('Guns are very hard to get here — you need the right people', 'warn');
      if (yearlyCount(state, 'crime.arm')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'crime.arm');
      const cost = Math.round((avail === 'easy' ? 400 : avail === 'market' ? 1500 : 4000) * priceLevel(state));
      if (!ctx.spend(cost, 'An illegal handgun', { allowDebt: false })) return ctx.toast(`You need $${cost.toLocaleString()}`, 'warn');
      c.armed = 'gun';
      ctx.log(`You bought a handgun with the serial number filed off for $${cost.toLocaleString()}. It's heavier than you expected.`, '🔫', 'warn');
      if (rng.chance(avail === 'hard' ? 0.15 : 0.05)) commitOffense(ctx, { offenseId: 'weaponPossession', discovery: 0.3, evidence: 0.8, context: 'a gun dealer who was already under surveillance' });
      return;
    }
    c.armed = 'knife';
    ctx.log('You started carrying a knife. For protection, you tell yourself.', '🔪', 'warn');
  },
  /** Rob someone in the street. */
  mug(ctx) {
    const { state, rng } = ctx;
    if (state.character.age < 13) return ctx.toast('Too young', 'warn');
    if (yearlyCount(state, 'risky.mug')) return ctx.toast('Lay low for the rest of the year.', 'warn');
    bumpYearly(state, 'risky.mug');
    const c = crimeOf(state);
    const w = armed(state);
    c.heat = clamp(c.heat + 14, 0, 100);
    c.rep = clamp((c.rep ?? 0) + 4, 0, 100);
    if (rng.chance(clamp(0.22 * (1 + c.heat / 100), 0.05, 0.7))) return commitOffense(ctx, { offenseId: w ? 'armedRobbery' : 'robbery', caught: true, evidence: 0.85, context: 'a victim who fought back until police arrived' });
    if (w && rng.chance(0.04)) {
      ctx.log('He grabbed for the weapon.', '⚠️', 'bad');
      return killed(ctx, w);
    }
    const take = Math.round(rng.int(40, w ? 900 : 400) * priceLevel(state));
    c.earned += take;
    c.dirty = (c.dirty ?? 0) + take;
    ctx.earn(take, 'Undisclosed income');
    addGuilt(state, 3);
    ctx.log(`You ${w ? `showed a ${w} and` : 'shoved a man into a doorway and'} took his phone and wallet ($${take.toLocaleString()}). He was shaking.`, '🥷', 'warn');
    commitOffense(ctx, { offenseId: w ? 'armedRobbery' : 'robbery', discovery: 0.25, evidence: 0.7, context: 'a street robbery caught on a doorbell camera' });
  },
  /** Express kidnapping, where it's a known crime. */
  kidnap(ctx) {
    const { state, rng } = ctx;
    if (!KIDNAP_COUNTRIES.has(state.character.countryId)) return ctx.toast('Not a crime anyone runs here', 'warn');
    if (state.character.age < 18) return ctx.toast('18+', 'warn');
    if (!armed(state)) return ctx.toast('You would need a weapon', 'warn');
    if (yearlyCount(state, 'risky.kidnap')) return ctx.toast('Lay low for the rest of the year.', 'warn');
    bumpYearly(state, 'risky.kidnap');
    const c = crimeOf(state);
    c.heat = clamp(c.heat + 25, 0, 100);
    c.rep = clamp((c.rep ?? 0) + 8, 0, 100);
    ctx.stat('stress', 15);
    if (rng.chance(clamp(0.25 * (1 + c.heat / 150), 0.1, 0.7))) return commitOffense(ctx, { offenseId: 'kidnapping', caught: true, evidence: 0.85, context: 'an anti-kidnapping unit stopped the car' });
    const take = Math.round(rng.int(3000, 40000) * priceLevel(state));
    c.earned += take;
    c.dirty = (c.dirty ?? 0) + take;
    ctx.earn(take, 'Undisclosed income');
    addGuilt(state, 15);
    ctx.log(`A "secuestro exprés": you forced a businessman into a car and drove him from ATM to ATM until his accounts were empty ($${take.toLocaleString()}). You let him out on a ring road at dawn.`, '🚐', 'warn');
    commitOffense(ctx, { offenseId: 'kidnapping', discovery: 0.3, evidence: 0.8, context: 'ATM cameras and a victim who remembered your voice' });
  },
  /** Make amends: confess to someone, give money away, try to put it right. */
  amends(ctx) {
    const { state } = ctx;
    const c = crimeOf(state);
    if (!c.guilt) return ctx.toast('Nothing on your conscience', 'warn');
    if (yearlyCount(state, 'crime.amends')) return ctx.toast('Once a year', 'warn');
    bumpYearly(state, 'crime.amends');
    const gift = Math.round(Math.min(state.finances.cash * 0.1, 20000 * priceLevel(state)));
    if (gift > 0) ctx.spend(gift, 'Anonymous donation to a victims\' charity');
    c.guilt = Math.max(0, c.guilt - 20);
    ctx.stat('happiness', 4);
    ctx.log(`You told a priest — or a counsellor, or a stranger on a train — everything${gift ? `, and gave $${gift.toLocaleString()} to a victims' charity` : ''}. It didn't fix anything. It helped.`, '🕯️', 'info');
  },
};
