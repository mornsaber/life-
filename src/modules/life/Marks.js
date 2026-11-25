/**
 * Your mark on the world: what a life leaves in its town, and what the town does in return. The
 * marks outlast you: they stay in the town for your children and grandchildren to walk past.
 *
 *   Gifts      a drinking fountain, almshouses, a reading room or public library, a school, a park,
 *              a sports ground, a hospital wing, a bridge, a museum, a scholarship — each of its day,
 *              named after you, and each moves the town (mood, jobs, crime, prices).
 *   Honours    a street named after you (a mayor, a local hero, a famous name) and a statue in the
 *              square (for the famous, late in life). You may accept or decline.
 *   Afterwards the marks are kept with the world's history (state.era.marks), so an heir finds the
 *              family's library in the town, and its effects are felt in their world too.
 *   Not here   where private wealth was abolished (a planned economy), there are no private gifts.
 *
 * state.era.marks = [{ id, kind, title, regionId, cc, year, by, gen }]
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { regimeHere } from '../world/Regimes.js';
import { REGIONS } from './Regions.js';
import { ensureCity } from './Cities.js';
import { fameScore } from './Fame.js';
import { OFFICES } from '../politics/Offices.js';

/** cost: today's US dollars (scaled by the country's prices and the era's). */
export const GIFTS = {
  fountain: { icon: '⛲', name: () => 'a drinking fountain', title: (n) => `the ${n} Fountain`, from: 1850, until: 1950, cost: 8000, fx: { mood: 2 } },
  almshouses: { icon: '🏘️', name: () => 'almshouses for the old and poor', title: (n) => `the ${n} Almshouses`, from: 1800, until: 1950, cost: 60000, fx: { mood: 2, crime: -2 } },
  library: { icon: '📚', name: (y) => (y < 1880 ? 'a reading room' : 'a public library'), title: (n, y) => (y < 1880 ? `the ${n} Reading Room` : `the ${n} Library`), from: 1830, cost: 90000, fx: { mood: 3, jobs: 1 } },
  school: { icon: '🏫', name: () => 'a school', title: (n) => `the ${n} School`, from: 1800, cost: 150000, fx: { jobs: 2, crime: -2 } },
  park: { icon: '🌳', name: () => 'a public park', title: (n) => `${n} Park`, from: 1840, cost: 180000, fx: { mood: 4, prices: 1 } },
  ground: { icon: '🏟️', name: (y) => (y < 1920 ? 'a cricket and football ground' : 'a sports ground'), title: (n) => `the ${n} Ground`, from: 1870, cost: 200000, fx: { mood: 3 } },
  scholarship: { icon: '🎓', name: () => 'a scholarship for local children', title: (n) => `the ${n} Scholarship`, from: 1880, cost: 120000, fx: { jobs: 2 } },
  hospital: { icon: '🏥', name: (y) => (y < 1900 ? 'a cottage hospital' : 'a hospital wing'), title: (n, y) => (y < 1900 ? `the ${n} Cottage Hospital` : `the ${n} Wing`), from: 1850, cost: 500000, fx: { mood: 3, pop: 2 } },
  bridge: { icon: '🌉', name: () => 'a bridge over the river', title: (n) => `the ${n} Bridge`, from: 1800, until: 1960, cost: 350000, fx: { jobs: 3, prices: 1 } },
  museum: { icon: '🏛️', name: () => 'a museum and art gallery', title: (n) => `the ${n} Museum`, from: 1850, cost: 900000, fx: { mood: 3, prices: 2 } },
};
const SCALE = (y) => (y < 1914 ? 0.4 : y < 1950 ? 0.6 : 1);
export const giftCost = (state, kind) => Math.round(GIFTS[kind].cost * priceLevel(state) * SCALE(yearNow(state)) / 100) * 100;

const marks = (state) => ((state.era ??= {}).marks ??= []);
export const marksHere = (state, regionId = state.character.regionId) => (state.era?.marks ?? []).filter((m) => m.regionId === regionId);
export const myMarks = (state) => (state.era?.marks ?? []).filter((m) => m.gen === (state.lineage?.generation ?? 1));
const townName = (state) => (REGIONS[state.character.regionId]?.name ?? 'the town').split(',')[0];
const surname = (state) => state.character.lastName ?? state.character.firstName;

/** Why you can't make this gift now, or null. */
export function giftCheck(state, kind) {
  const g = GIFTS[kind];
  const y = yearNow(state);
  if (!g) return 'No such gift';
  if (state.character.age < 21) return 'From 21';
  if (regimeHere(state)?.business === 'state') return 'Private gifts are not allowed here';
  if (g.from > y || (g.until && y >= g.until)) return 'Not of its day';
  if (marksHere(state).some((m) => m.kind === kind)) return `The town already has ${GIFTS[kind].name(y)} with a name on it`;
  if (state.finances.cash < giftCost(state, kind)) return 'Not enough cash';
  return null;
}

/** The town's effects of a mark (once per world: an heir's town feels the family's gifts too). */
function applyFx(state, m) {
  const w = (state.world ??= {});
  w.marksApplied ??= [];
  if (w.marksApplied.includes(m.id) || !REGIONS[m.regionId]) return;
  w.marksApplied.push(m.id);
  const fx = GIFTS[m.kind]?.fx ?? (m.kind === 'statue' ? { mood: 1 } : m.kind === 'street' ? { mood: 1 } : {});
  const c = ensureCity(state, m.regionId);
  for (const [k, v] of Object.entries(fx)) c[k] = Math.max(0, Math.min(k === 'pop' || k === 'prices' ? 400 : 100, Math.round((c[k] ?? 50) + v)));
}

function addMark(ctx, kind, title) {
  const { state } = ctx;
  const m = { id: `mark_${(state.era?.marks?.length ?? 0) + 1}_${state.character.age}`, kind, title, regionId: state.character.regionId, cc: state.character.countryId ?? 'US', year: yearNow(state), by: `${state.character.firstName} ${state.character.lastName ?? ''}`.trim(), gen: state.lineage?.generation ?? 1 };
  marks(state).push(m);
  applyFx(state, m);
  return m;
}

const rngOf = (state) => new Random(((state.world?.seed ?? 3) * 2654435761 + state.character.age * 97 + 0x3a7) >>> 0);

export const MarksModule = {
  id: 'marks',
  order: 96.7,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character.alive) return;
    // The family's marks in the town you live in now are part of your world as well.
    for (const m of marksHere(state)) applyFx(state, m);
    const age = state.character.age;
    if (age < 30 || state.prompts.some((p) => p.type === 'marks.honour')) return;
    const rng = rngOf(state);
    const fame = fameScore(state);
    const office = state.politics?.office;
    const mayor = office && /mayor/i.test(OFFICES[office.id]?.name ?? '');
    const has = (k) => myMarks(state).some((m) => m.kind === k);
    const town = townName(state);
    if (!has('street') && (fame >= 40 || mayor || myMarks(state).length >= 2) && rng.chance(0.06)) {
      return ctx.prompt({ type: 'marks.honour', icon: '🪧', title: 'A Street in Your Name', text: `The council of ${town} wants to name a new street after you: ${surname(state)} ${rng.pick(['Street', 'Avenue', 'Road', 'Place'])}.`, data: { kind: 'street' }, options: [{ id: 'accept', label: '🪧 Accept, with thanks' }, { id: 'decline', label: '🙅 Decline: name it for someone who died for the town' }] });
    }
    if (!has('statue') && age >= 55 && fame >= 55 && rng.chance(0.05)) {
      return ctx.prompt({ type: 'marks.honour', icon: '🗿', title: 'A Statue', text: `A committee in ${town} has raised the money for a statue of you in the square.`, data: { kind: 'statue' }, options: [{ id: 'accept', label: '🗿 Sit for the sculptor' }, { id: 'decline', label: '🙅 Statues are for the dead' }] });
    }
    return undefined;
  },
  actions: {
    /** Give the town something with your name on it. arg: gift kind. */
    give(ctx, kind) {
      const { state } = ctx;
      const why = giftCheck(state, kind);
      if (why) return ctx.toast(why, 'warn');
      const y = yearNow(state);
      const g = GIFTS[kind];
      ctx.spend(giftCost(state, kind), `Gift to ${townName(state)}: ${g.name(y)}`, { credit: false });
      const m = addMark(ctx, kind, g.title(surname(state), y));
      ctx.stat('happiness', 4);
      if (state.society) state.society.standing = Math.min(100, (state.society.standing ?? 20) + 4);
      ctx.emit('fame:buzz', { amount: 3 });
      ctx.emit('news:story', { tier: 'local', headline: `${m.title} opens`, weight: 5, icon: g.icon });
      return ctx.log(`${m.title} opened in ${townName(state)}. Your name is over the door.`, g.icon, 'milestone');
    },
  },
  resolvers: {
    honour(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'accept') return ctx.log('You declined. People thought the better of you for it.', '🙂', 'info');
      const title = data.kind === 'street' ? `${surname(state)} Street` : `the statue of ${state.character.firstName} ${surname(state)}`;
      addMark(ctx, data.kind, title);
      ctx.stat('happiness', 5);
      ctx.emit('fame:buzz', { amount: 4 });
      return ctx.log(data.kind === 'street' ? `${title} was named after you, sign and all.` : `${title[0].toUpperCase()}${title.slice(1)} was unveiled in the square. Pigeons approved.`, data.kind === 'street' ? '🪧' : '🗿', 'honor');
    },
  },
};
