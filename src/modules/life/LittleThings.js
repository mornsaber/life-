/**
 * The little things: your star sign, tattoos and a new look, the honeymoon, the midlife crisis,
 * a bucket list, and a time capsule for your older self.
 *
 *   Star sign     from your birthday (one drawn at birth, kept).
 *   Tattoos       from 16 (18 with the law of the day): a sailor's anchor in 1900, a stigma at
 *                 work until the 2000s; laser removal from the 1990s.
 *   Your look     the haircut of the day, once a year.
 *   Honeymoon     after the wedding, the destinations of the day: Niagara Falls, the seaside,
 *                 Paris and Venice, Hawaii by jet (1959), Bali (1980s), the Maldives (1990s).
 *   Midlife       once, between 45 and 55: the sports car, the open road, the guitar, the leap.
 *   Bucket list   from 30: pick what you want to do before you die, and do it.
 *   Time capsule  bury one; open it twenty-five years later and see how the world has changed.
 *
 * state.little = { sign, tattoos: [{ design, age }], look, honeymooned, midlife, bucket: [{ id, done }], capsule: { year, age, note, priceLevel } }
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, currentYear } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { spouseOf } from '../people/People.js';
import { showResult } from './ResultCards.js';

const local = (state, n) => Math.round(n * priceLevel(state));
const cc = (state) => state.character.countryId ?? 'US';
const side = (state, salt) => new Random(((state.world?.seed ?? 11) * 76801 + state.character.age * 97 + salt) >>> 0);

export const SIGNS = [['Capricorn', '♑'], ['Aquarius', '♒'], ['Pisces', '♓'], ['Aries', '♈'], ['Taurus', '♉'], ['Gemini', '♊'], ['Cancer', '♋'], ['Leo', '♌'], ['Virgo', '♍'], ['Libra', '♎'], ['Scorpio', '♏'], ['Sagittarius', '♐']];
/** Your star sign: drawn from your name and birth year, stable for the life. */
export function starSign(state) {
  const c = state.character;
  let h = c.birthYear ?? 1;
  for (const ch of `${c.firstName}${c.lastName}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SIGNS[h % 12];
}
const L = (state) => (state.little ??= { tattoos: [], bucket: [], honeymooned: false, midlife: false, capsule: null, look: null });

/* ---- Tattoos and the look of the day ---- */
export const TATTOO_DESIGNS = (y) => (y < 1950 ? ['an anchor', 'a swallow', 'your mother\'s name in a heart', 'a ship in full sail'] : y < 1990 ? ['a rose', 'a dragon', 'a skull', 'a band\'s logo'] : ['a tribal band', 'a line of script', 'a mandala', 'a tiny star behind your ear', 'a sleeve']);
export const tattooAge = (state) => (yearNow(state) >= 1969 ? 18 : 16);
function tattoo(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < tattooAge(state)) return ctx.toast(`${tattooAge(state)}+`, 'warn');
  if (yearlyCount(state, 'little.tattoo')) return ctx.toast('Let the last one heal', 'warn');
  bumpYearly(state, 'little.tattoo');
  const y = yearNow(state);
  const design = rng.pick(TATTOO_DESIGNS(y));
  L(state).tattoos.push({ design, age: state.character.age });
  ctx.spend(local(state, 150), 'A tattoo', { allowDebt: true });
  ctx.stat('happiness', 3);
  if (y < 2000 && state.career.job && !['military', 'navy'].includes(state.career.job.professionId) && rng.chance(0.2)) ctx.log('Your boss saw it. "Cover that up at work."', '👔', 'warn');
  return ctx.log(`You got ${design} tattooed${y < 1950 ? ' in a parlour by the docks' : ''}.`, '🖋️', 'info');
}
function removeTattoo(ctx) {
  const { state } = ctx;
  const l = L(state);
  if (!l.tattoos.length) return ctx.toast('No tattoos', 'warn');
  if (yearNow(state) < 1990) return ctx.toast('No laser removal yet', 'warn');
  const t = l.tattoos.pop();
  ctx.spend(local(state, 1500), 'Laser tattoo removal', { allowDebt: true });
  return ctx.log(`Six painful sessions of laser removal: ${t.design} is gone.`, '🩹', 'info');
}
export const LOOKS = (y) => (y < 1900 ? ['mutton-chop whiskers', 'a centre parting and pomade', 'ringlets'] : y < 1930 ? ['a bob', 'a pencil moustache', 'finger waves'] : y < 1960 ? ['a quiff', 'a victory roll', 'a crew cut'] : y < 1980 ? ['long hair and sideburns', 'an afro', 'a feathered cut'] : y < 2000 ? ['a mullet', 'big permed hair', 'frosted tips'] : ['a fade', 'balayage', 'a man bun', 'a buzz cut']);
function newLook(ctx) {
  const { state, rng } = ctx;
  if (yearlyCount(state, 'little.look')) return ctx.toast('Once a year', 'warn');
  bumpYearly(state, 'little.look');
  const look = rng.pick(LOOKS(yearNow(state)));
  L(state).look = look;
  ctx.spend(local(state, 60), 'A new look', { allowDebt: true });
  ctx.stat('looks', rng.int(1, 4));
  return ctx.log(`A new look: ${look}.`, '💇', 'good');
}

/* ---- The honeymoon ---- */
export function honeymoonsNow(state) {
  const y = yearNow(state);
  const c = cc(state);
  return [
    { id: 'home', label: c === 'GB' ? '🎡 A week in Blackpool' : c === 'US' ? '🌊 Niagara Falls' : '🏖️ A week by the sea', cost: 800, spark: 6, from: 1840 },
    { id: 'paris', label: '🗼 Paris and Venice', cost: 4000, spark: 10, from: 1850 },
    { id: 'hawaii', label: '🌺 Hawaii', cost: 6000, spark: 12, from: 1959 },
    { id: 'bali', label: '🌴 Bali', cost: 5000, spark: 12, from: 1980 },
    { id: 'maldives', label: '🏝️ A water villa in the Maldives', cost: 12000, spark: 15, from: 1995 },
  ].filter((h) => y >= h.from && !(h.id === 'home' && false)).map((h) => ({ ...h, cost: local(state, h.cost) }));
}
function offerHoneymoon(ctx) {
  const { state } = ctx;
  const s = spouseOf(state);
  if (!s || L(state).honeymooned === s.id) return;
  L(state).honeymooned = s.id;
  ctx.prompt({ type: 'littleThings.honeymoon', icon: '💑', title: 'The Honeymoon', text: `Where will you and ${s.firstName} go?`, data: { personId: s.id },
    options: [...honeymoonsNow(state).map((h) => ({ id: h.id, label: h.label, hint: `$${h.cost.toLocaleString()}` })), { id: 'none', label: '🏠 Save the money' }] });
}

/* ---- The midlife crisis ---- */
function midlife(ctx) {
  const { state } = ctx;
  const l = L(state);
  const age = state.character.age;
  if (l.midlife || age < 45 || age > 55 || state.prompts.some((p) => p.type?.startsWith('littleThings.'))) return;
  if (!side(state, 0x4d).chance(0.25)) return;
  l.midlife = true;
  const y = yearNow(state);
  ctx.prompt({ type: 'littleThings.midlife', icon: '🏍️', title: 'Is This It?', text: `You're ${age}. You look in the mirror and wonder where it all went.`,
    options: [
      { id: 'car', label: y < 1920 ? '🐎 A fine carriage and pair' : '🏎️ A red sports car', hint: 'Expensive' },
      { id: 'road', label: y < 1900 ? '🚂 Go west' : '🏍️ A motorbike and the open road' },
      { id: 'guitar', label: y < 1950 ? '🎻 Take up the violin again' : '🎸 Learn the guitar' },
      { id: 'leap', label: '🚪 Quit and do what you always wanted' },
      { id: 'therapy', label: y < 1950 ? '🍷 A long talk with an old friend' : '🛋️ Talk to someone' },
    ] });
}

/* ---- The bucket list ---- */
export const BUCKET = {
  aurora: { label: '🌌 See the northern lights', cost: 3000 },
  marathon: { label: '🏃 Run a marathon', cost: 200, fitness: 60 },
  language: { label: '🗣️ Learn another language', cost: 500 },
  pyramids: { label: '🔺 See the pyramids', cost: 4000 },
  skydive: { label: '🪂 Jump out of a plane', cost: 400, from: 1960 },
  novel: { label: '📖 Write a novel', cost: 0, smarts: 60 },
  roots: { label: '🧬 Visit the place your family came from', cost: 2000 },
  dance: { label: '💃 Learn to dance properly', cost: 600 },
};
export const bucketNow = (state) => Object.entries(BUCKET).filter(([, b]) => !(b.from > yearNow(state))).map(([id, b]) => ({ id, ...b, cost: local(state, b.cost) }));
function addToBucket(ctx, id) {
  const { state } = ctx;
  if (state.character.age < 30) return ctx.toast('30+', 'warn');
  const l = L(state);
  if (!BUCKET[id] || l.bucket.some((b) => b.id === id)) return ctx.toast('Already on the list', 'warn');
  if (l.bucket.filter((b) => !b.done).length >= 5) return ctx.toast('Finish something first', 'warn');
  l.bucket.push({ id, done: false });
  return ctx.log(`On your bucket list: ${BUCKET[id].label.replace(/^\S+ /, '').toLowerCase()}.`, '📝', 'info');
}
function doBucket(ctx, id) {
  const { state } = ctx;
  const l = L(state);
  const item = l.bucket.find((b) => b.id === id && !b.done);
  const def = bucketNow(state).find((b) => b.id === id);
  if (!item || !def) return ctx.toast('Not on the list', 'warn');
  if (def.fitness && (state.stats.fitness ?? 50) < def.fitness) return ctx.toast(`Needs fitness ${def.fitness}+`, 'warn');
  if (def.smarts && state.stats.smarts < def.smarts) return ctx.toast(`Needs smarts ${def.smarts}+`, 'warn');
  if (yearlyCount(state, 'little.bucket') >= 2) return ctx.toast('Two a year', 'warn');
  bumpYearly(state, 'little.bucket');
  if (def.cost) ctx.spend(def.cost, def.label.replace(/^\S+ /, ''), { allowDebt: true });
  item.done = state.character.age;
  ctx.stat('happiness', 8);
  const left = l.bucket.filter((b) => !b.done).length;
  if (!left && l.bucket.length >= 3) showResult(ctx, { icon: '📝', title: 'Your bucket list', big: 'All done', sub: `${l.bucket.length} things you wanted to do before you die`, tone: 'good' });
  return ctx.log(`Crossed off your bucket list: ${def.label.replace(/^\S+ /, '').toLowerCase()}.`, '✅', 'good');
}

/* ---- The time capsule ---- */
function buryCapsule(ctx) {
  const { state, rng } = ctx;
  const l = L(state);
  if (l.capsule) return ctx.toast('One already buried', 'warn');
  if (state.character.age < 8) return ctx.toast('8+', 'warn');
  const y = yearNow(state);
  l.capsule = { year: y, age: state.character.age, priceLevel: priceLevel(state), note: rng.pick(['a letter to yourself', 'a photograph of your friends', 'the front page of today\'s paper', 'a list of your hopes', 'a recording of your voice']) };
  return ctx.log(`You buried a time capsule in the garden: ${l.capsule.note}. Open it in ${y + 25}.`, '⏳', 'info');
}
function capsuleYear(ctx) {
  const { state } = ctx;
  const c = state.little?.capsule;
  if (!c || c.opened || yearNow(state) < c.year + 25) return;
  c.opened = true;
  const y = yearNow(state);
  const prices = priceLevel(state) / (c.priceLevel || 1);
  ctx.stat('happiness', 6);
  ctx.log(`You dug up the time capsule you buried at ${c.age}: ${c.note}. ${y - c.year} years on${prices > 1.5 ? `, a loaf of bread costs ${prices.toFixed(1)} times what it did` : ''}. You laughed, and then you cried a little.`, '⏳', 'milestone');
}

export const LittleThingsResolvers = {
  honeymoon(ctx, data, optionId) {
    const { state } = ctx;
    const s = spouseOf(state);
    const h = honeymoonsNow(state).find((x) => x.id === optionId);
    if (!h || !s) return ctx.log('You saved the money and went back to work on Monday.', '🏠');
    ctx.spend(h.cost, `Honeymoon: ${h.label.replace(/^\S+ /, '')}`, { allowDebt: true });
    s.spark = clamp((s.spark ?? 70) + h.spark, 0, 100);
    ctx.stat('happiness', 8);
    s.memories = [...(s.memories ?? []), { age: state.character.age, text: `Your honeymoon: ${h.label.replace(/^\S+ /, '')}.` }].slice(-6);
    return ctx.log(`Your honeymoon: ${h.label.replace(/^\S+ /, '')}. You'll talk about it for the rest of your lives.`, '💑', 'good');
  },
  midlife(ctx, _d, optionId) {
    const { state } = ctx;
    switch (optionId) {
      case 'car': {
        const price = local(state, 60000);
        if ((state.finances?.cash ?? 0) < price) { ctx.spend(local(state, 600), 'A sports car for the weekend'); ctx.stat('happiness', 5); return ctx.log('You couldn\'t afford one, so you hired one for a weekend and drove to the coast with the top down.', '🏎️', 'good'); }
        ctx.spend(price, 'A midlife crisis on wheels');
        ctx.stat('happiness', 10);
        return ctx.log('You bought it. Your family rolled their eyes. You drove with the top down anyway.', '🏎️', 'good');
      }
      case 'road': ctx.spend(Math.min(local(state, 8000), Math.max(0, state.finances?.cash ?? 0)), 'The open road'); ctx.stat('happiness', 12); ctx.stat('stress', -10); return ctx.log('Three months on the road. You came back browner, thinner, and calmer.', '🏍️', 'good');
      case 'guitar': ctx.stat('happiness', 6); ctx.stat('smarts', 1); return ctx.log('You took it up again. By Christmas you could play three songs, badly, and loved it.', '🎸', 'good');
      case 'leap': ctx.stat('happiness', 8); ctx.stat('stress', 6); return ctx.log('You decided to stop waiting. Everything starts now.', '🚪', 'milestone');
      default: ctx.stat('stress', -8); return ctx.log('You talked it through. It wasn\'t the end of anything, just the middle.', '🛋️', 'good');
    }
  },
};

export const LittleThingsModule = {
  id: 'littleThings',
  order: 23,
  setup(engine) { engine.bus.on('people:married', ({ ctx }) => offerHoneymoon(ctx)); },
  onAgeUp(ctx) { if (!ctx.state.character.alive) return; midlife(ctx); capsuleYear(ctx); },
  actions: { tattoo, removeTattoo, newLook, addToBucket, doBucket, buryCapsule },
  resolvers: LittleThingsResolvers,
};
export const yearOf = (state) => currentYear(state);
