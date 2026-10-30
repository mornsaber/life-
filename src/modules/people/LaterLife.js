/**
 * Your own old age: the paperwork and the decisions nobody wants to make.
 *
 *   Power of attorney  name someone (a child, your spouse, a solicitor) while you still can. Lose
 *                      capacity without one and a court appoints a guardian — expensive, slow,
 *                      and sometimes the wrong person. The wrong attorney can empty your account.
 *   Your wishes        an advance directive (health/EndOfLife.js), a funeral plan, where you
 *                      want to be at the end.
 *   The years          a fall, the car keys, the house that's too big, the loneliness when your
 *                      friends start to go. Care at home or a care home is chosen when you need it.
 *
 * state.laterLife = { poa: personId | 'professional' | null, keys: bool, downsized: bool, funeral: bool, guardian }
 */
import { Random } from '../../core/Random.js';
import { living, byId, ageOf } from './People.js';
import { hasCondition } from '../health/Conditions.js';
import { addFriend } from './Friends.js';
import { priceLevel } from '../world/Countries.js';

const ofState = (state) => (state.laterLife ??= { poa: null, keys: false, downsized: false, funeral: false });
const local = (state, n) => Math.round(n * priceLevel(state));
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 52711 + state.character.age * 173 + 0x01d) >>> 0);
export const attorneyCandidates = (state) => living(state).filter((p) => ['spouse', 'partner', 'child', 'sibling'].includes(p.relation) && ageOf(state, p) >= 18);
export const laterLifeOf = ofState;

const EVENTS = [
  { id: 'fall', minAge: 72, title: 'A Fall', text: 'You slipped in the bathroom and lay on the floor for two hours before anyone came.', options: [
    { id: 'alarm', label: '📟 Get a personal alarm and grab rails fitted', cost: 900 },
    { id: 'shrug', label: '💪 It was a one-off', hint: 'Falls rarely are' },
  ] },
  { id: 'keys', minAge: 78, needs: (s) => !ofState(s).keys && (s.vehicles?.owned ?? []).length, title: 'The Car Keys', text: 'A near miss at a junction you\'ve driven through for forty years. Your children want to talk about the car.', options: [
    { id: 'give', label: '🔑 Give up driving', hint: 'Safer; smaller life' },
    { id: 'keep', label: '🚗 Keep driving, just not at night', hint: 'Independence — and risk' },
  ] },
  { id: 'house', minAge: 70, needs: (s) => !ofState(s).downsized && (s.housing?.owned ?? []).length, title: 'Too Much House', text: 'The stairs, the garden, the empty bedrooms. The estate agent says it would fetch a lot.', options: [
    { id: 'downsize', label: '🏘️ Sell and move somewhere smaller', hint: 'A flat near the shops — and the children' },
    { id: 'stay', label: '🏡 Stay where the memories are' },
  ] },
  { id: 'lonely', minAge: 75, title: 'The Quiet', text: 'Another friend\'s funeral. Some weeks the only person you speak to is the man in the shop.', options: [
    { id: 'club', label: '☕ Join the lunch club and the walking group' },
    { id: 'family', label: '📞 Ring the family more' },
    { id: 'alone', label: '📺 You\'re fine on your own' },
  ] },
];

export function laterLifeTick(main) {
  const { state } = main;
  const age = state.character.age;
  if (age < 70 || state.legal?.incarceration) return;
  const L = ofState(state);
  const rng = sideRng(state);
  const ctx = { ...main, rng };
  // Lost capacity: someone has to run your money.
  if (hasCondition(state, 'dementia')) {
    const attorney = L.poa && L.poa !== 'professional' ? byId(state, L.poa) : null;
    if (!L.poa && !L.guardian) {
      L.guardian = true;
      main.spend(local(state, 8000), 'Court guardianship proceedings', { allowDebt: true });
      main.log('You no longer can manage your money, and there was no power of attorney: the court appointed a guardian after months of hearings and fees.', '⚖️', 'bad');
    } else if (attorney && (attorney.relationship ?? 50) < 35 && rng.chance(0.25)) {
      const taken = Math.round(Math.max(0, state.finances.cash) * rng.float(0.2, 0.5));
      if (taken > 0) { main.spend(taken, 'Taken by your attorney', { allowDebt: false }); main.log(`${attorney.firstName}, holding your power of attorney, quietly moved $${taken.toLocaleString()} out of your accounts.`, '🕳️', 'bad'); }
    }
    return;
  }
  if (!rng.chance(0.4)) return;
  const pool = EVENTS.filter((e) => age >= e.minAge && (!e.needs || e.needs(state)));
  if (!pool.length) return;
  const e = rng.pick(pool);
  if (e.id === 'fall') main.stat('health', -rng.int(4, 12));
  ctx.prompt({ type: 'laterLife.event', icon: '🌇', title: e.title, text: e.text, data: { id: e.id }, options: e.options.map((o) => ({ id: o.id, label: o.label, hint: o.cost ? `$${local(state, o.cost).toLocaleString()}` : o.hint })) });
}

export const LaterLifeResolvers = {
  event(ctx, data, optionId) {
    const { state, rng } = ctx;
    const L = ofState(state);
    switch (`${data.id}:${optionId}`) {
      case 'fall:alarm': ctx.spend(local(state, 900), 'Personal alarm and grab rails', { allowDebt: true }); L.alarm = true; return ctx.log('The pendant stays round your neck. Your daughter sleeps better.', '📟', 'good');
      case 'fall:shrug': if (rng.chance(0.3)) { ctx.stat('health', -rng.int(10, 20)); return ctx.log('You fell again, and this time broke a hip.', '🦴', 'bad'); } return ctx.log('You were more careful on the stairs.', '💪', 'info');
      case 'keys:give': L.keys = true; ctx.stat('happiness', -4); return ctx.log('You handed over the keys. The bus pass and your son\'s Saturday lifts will have to do.', '🔑', 'info');
      case 'keys:keep': if (rng.chance(0.15)) { ctx.stat('health', -rng.int(8, 20)); L.keys = true; return ctx.log('You clipped a cyclist at a roundabout. Nobody died. You gave up the keys the next day.', '🚑', 'bad'); } return ctx.log('You kept driving — daylight only, the routes you know.', '🚗', 'info');
      case 'house:downsize': L.downsized = true; ctx.stat('stress', 6); ctx.stat('happiness', 2); return ctx.log('You sold the family home, cleared forty years of things, and moved into a flat by the shops. (Sell it from the Housing tab when you\'re ready.)', '🏘️', 'info');
      case 'house:stay': return ctx.log('You stayed. The stairlift people came round.', '🏡', 'info');
      case 'lonely:club': ctx.stat('happiness', 6); addFriend(ctx, 'neighborhood', { quiet: true }); return ctx.log('Tuesday lunches and the Thursday walk. You made a new friend at 80.', '☕', 'good');
      case 'lonely:family': for (const p of living(state).filter((x) => ['child', 'sibling'].includes(x.relation))) p.relationship = Math.min(100, (p.relationship ?? 50) + 4); ctx.stat('happiness', 3); return ctx.log('A call every Sunday. The grandchildren put you on speaker.', '📞', 'good');
      case 'lonely:alone': ctx.stat('happiness', -5); ctx.stat('health', -2); return ctx.log('You were fine on your own. Mostly.', '📺', 'warn');
      default: return undefined;
    }
  },
};

export const LaterLifeActions = {
  /** Arg: a person's id, or 'professional' for a solicitor. */
  poa(ctx, who) {
    const { state } = ctx;
    if (state.character.age < 18) return;
    if (hasCondition(state, 'dementia')) return ctx.toast('You can no longer sign one — it has to be done while you still have capacity', 'warn');
    const L = ofState(state);
    if (who === 'professional') {
      ctx.spend(local(state, 1500), 'Power of attorney (solicitor)', { allowDebt: true });
      L.poa = 'professional';
      return ctx.log('You signed a lasting power of attorney naming a solicitor. Expensive, impartial.', '📜', 'good');
    }
    const p = attorneyCandidates(state).find((x) => x.id === who);
    if (!p) return ctx.toast('Choose someone you trust', 'warn');
    ctx.spend(local(state, 200), 'Power of attorney', { allowDebt: true });
    L.poa = p.id;
    ctx.log(`You signed a power of attorney naming ${p.firstName}, to act for you if you no longer can.`, '📜', 'good');
  },
  funeral(ctx) {
    const { state } = ctx;
    const L = ofState(state);
    if (L.funeral || state.character.age < 50) return;
    if (!ctx.spend(local(state, 4500), 'Prepaid funeral plan')) return ctx.toast('Not enough cash', 'warn');
    L.funeral = true;
    ctx.log('You planned your own funeral: the music, the readings, who carries you. Paid in full, so nobody else has to.', '🕊️', 'info');
  },
};

export const LaterLifeModule = { id: 'laterLife', order: 15.5, onAgeUp: laterLifeTick, actions: LaterLifeActions, resolvers: LaterLifeResolvers };
