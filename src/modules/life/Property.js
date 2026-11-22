/**
 * Property and the people who keep it: domestic staff of their day, and one account of
 * everything you own (homes, vehicles, boats and aircraft, society's toys, the farm).
 *
 *   Staff     who a household employed changed with the century: a maid-of-all-work and a cook
 *             in 1860, a butler and footmen in a great house, a governess for the children,
 *             a coachman, then a chauffeur; after the wars "the servant problem" (no one would
 *             go into service), and later cleaners, nannies, au pairs, a private chef, a PA and
 *             a bodyguard. Wages follow the era: service was cheap before 1914 and dear after.
 *   Moments   a maid who steals the spoons, a nanny the children love more than you, the
 *             footman called up in 1914, a butler who knows too much, a chef poached by a rival.
 *   The ledger homes (equity), vehicles by kind, staff and their wages, art and horses: the
 *             year's running costs beside what it is all worth.
 *
 * state.property = { staff: [{ id, role, name, since, wage }] }
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { randomName } from '../../core/State.js';
import { regimeHere } from '../world/Regimes.js';
import { VEHICLE_TYPES } from '../vehicles/Vehicles.js';
import { LUXURIES } from './HighSociety.js';

/** base: a full year's wage today (US dollars, before the price level); from/until: the role in its day. */
export const STAFF = {
  maid: { names: [[1940, 'Maid-of-all-work'], [9999, 'Cleaner']], icon: '🧹', base: 32000, happy: 2, stress: -2 },
  cook: { names: [[1950, 'Cook'], [9999, 'Private chef']], icon: '👩‍🍳', base: 70000, happy: 2, stress: -1, health: 1 },
  housekeeper: { names: [[1975, 'Housekeeper'], [9999, 'House manager']], icon: '🗝️', base: 60000, stress: -2, needs: 2 },
  butler: { names: [[9999, 'Butler']], icon: '🤵', base: 90000, standing: 3, needs: 3 },
  footman: { names: [[9999, 'Footman']], icon: '🧑‍💼', base: 30000, until: 1945, standing: 1, needs: 4 },
  ladysMaid: { names: [[9999, 'Lady\'s maid']], icon: '💁', base: 30000, until: 1960, female: true, standing: 1 },
  valet: { names: [[9999, 'Valet']], icon: '👔', base: 35000, until: 1960, male: true, standing: 1 },
  nanny: { names: [[1900, 'Nursemaid'], [9999, 'Nanny']], icon: '🍼', base: 50000, kids: true, stress: -3 },
  governess: { names: [[1950, 'Governess'], [9999, 'Live-in tutor']], icon: '📚', base: 40000, kids: true, smartsKids: true },
  auPair: { names: [[9999, 'Au pair']], icon: '🧳', base: 12000, from: 1960, kids: true, stress: -2 },
  gardener: { names: [[9999, 'Gardener']], icon: '🌿', base: 40000, happy: 1 },
  coachman: { names: [[9999, 'Coachman']], icon: '🐴', base: 32000, until: 1925 },
  chauffeur: { names: [[9999, 'Chauffeur']], icon: '🚘', base: 55000, from: 1905, stress: -1 },
  secretary: { names: [[1970, 'Private secretary'], [9999, 'Personal assistant']], icon: '🗂️', base: 65000, stress: -3 },
  bodyguard: { names: [[9999, 'Bodyguard']], icon: '🕶️', base: 90000, from: 1960, safety: true },
};
export const staffName = (role, y) => (STAFF[role]?.names.find(([until]) => y < until) ?? STAFF[role]?.names.at(-1))?.[1] ?? role;
/** Service was cheap before the First World War and dear after the Second (relative to other prices). */
export const serviceCost = (y) => (y < 1914 ? 0.35 : y < 1940 ? 0.55 : y < 1960 ? 0.8 : 1);
export const wageFor = (state, role, y = yearNow(state)) => Math.round(STAFF[role].base * serviceCost(y) * priceLevel(state));
export const staffOf = (state) => state.property?.staff ?? [];
export const staffWages = (state) => staffOf(state).reduce((s, x) => s + (x.wage ?? 0), 0);

const kidsAtHome = (state) => (state.people?.list ?? []).filter((p) => p.alive && p.relation === 'child' && state.character.age + p.ageOffset >= 0 && state.character.age + p.ageOffset < 16);
/** Roles you could hire this year (and whether a household like yours would). */
export function rolesOpen(state, y = yearNow(state)) {
  const g = state.character.gender;
  const n = staffOf(state).length;
  return Object.entries(STAFF).filter(([, r]) => !(r.from > y) && !(r.until <= y) && !(r.female && g !== 'female') && !(r.male && g !== 'male') && !(r.kids && !kidsAtHome(state).length) && !((r.needs ?? 0) > n)).map(([id, r]) => ({ id, ...r, name: staffName(id, y), wage: wageFor(state, id, y) }));
}
/** Service under a regime that abolished it: no private servants in the Soviet years (a "domestic worker" at most). */
const noServants = (state) => regimeHere(state).business === 'state';

const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 33391 + state.character.age * 2203 + salt) >>> 0);

export function propertyTick(ctx) {
  const { state } = ctx;
  const p = state.property;
  if (!p?.staff?.length) return;
  const y = yearNow(state);
  const rng = sideRng(state, 0x57a);
  // Wages for the year; staff you can't pay leave.
  for (const s of [...p.staff]) {
    s.wage = wageFor(state, s.role, y);
    if (!ctx.spend(s.wage, `Wages: ${staffName(s.role, y).toLowerCase()}`, { credit: false })) {
      p.staff = p.staff.filter((x) => x !== s);
      ctx.log(`You couldn't pay ${s.name}, your ${staffName(s.role, y).toLowerCase()}. ${s.female ? 'She' : 'He'} left without a reference from you.`, STAFF[s.role].icon, 'warn');
      continue;
    }
    const r = STAFF[s.role];
    if (r.happy) ctx.stat('happiness', r.happy);
    if (r.stress) ctx.stat('stress', r.stress);
    if (r.health) ctx.stat('health', r.health);
    // A role that has gone out of its time retires with its holder.
    if (r.until && y >= r.until) {
      p.staff = p.staff.filter((x) => x !== s);
      ctx.log(`${s.name} retired. Nobody keeps a ${staffName(s.role, y).toLowerCase()} any more.`, r.icon, 'info');
    }
  }
  // The great houses in the wars: the men went to the front.
  if ((y === 1914 || y === 1939) && ['GB', 'FR', 'DE', 'IT', 'AT', 'RU', 'BE', 'AU', 'CA', 'NZ'].includes(state.character.countryId ?? 'US')) {
    const men = p.staff.filter((s) => !s.female && ['footman', 'chauffeur', 'gardener', 'valet', 'coachman', 'butler'].includes(s.role));
    if (men.length) {
      p.staff = p.staff.filter((s) => !men.includes(s));
      ctx.log(`${men.map((s) => s.name.split(' ')[0]).join(', ')} went to the war. The house felt empty without ${men.length > 1 ? 'them' : (men[0].female ? 'her' : 'him')}.`, '🪖', 'warn');
    }
  }
  if (!p.staff.length || !rng.chance(0.25) || state.prompts.some((x) => x.type === 'property.staff')) return;
  const s = rng.pick(p.staff);
  const kind = rng.pick(['steal', 'notice', 'loved', 'poached', 'gossip']);
  const role = staffName(s.role, y).toLowerCase();
  const text = {
    steal: `The silver is short. Suspicion falls on ${s.name}, your ${role}.`,
    notice: `${s.name}, your ${role}, has given notice: ${y < 1940 ? 'getting married, and going to live with his people' : 'a better-paid post elsewhere'}.`,
    loved: kidsAtHome(state).length ? `The children adore ${s.name}, your ${role}. Lately they go to ${s.female ? 'her' : 'him'} before they come to you.` : `${s.name}, your ${role}, has been with you a long time now and knows the house better than you do.`,
    poached: `A neighbour has offered ${s.name}, your ${role}, more money to come to them.`,
    gossip: `Word of your private business is going round the town. It can only have come from ${y < 1950 ? 'below stairs' : 'the staff'}.`,
  }[kind];
  ctx.prompt({
    type: 'property.staff', icon: STAFF[s.role].icon, title: 'The Household', text, data: { id: s.id, kind },
    options: kind === 'poached' ? [{ id: 'match', label: '💰 Match the offer', hint: 'A fifth more' }, { id: 'let', label: '👋 Let them go' }]
      : kind === 'notice' ? [{ id: 'raise', label: '💰 Ask them to stay for more money' }, { id: 'let', label: '👋 Wish them well' }]
        : kind === 'steal' ? [{ id: 'dismiss', label: '🚪 Dismiss them' }, { id: 'police', label: '👮 Call the police' }, { id: 'let', label: '🤐 Say nothing' }]
          : [{ id: 'keep', label: '🤝 Leave it be' }, { id: 'dismiss', label: '🚪 Let them go' }],
  });
}

export const PropertyModule = {
  id: 'property',
  order: 89.5,
  init(state) { state.property ??= { staff: [] }; },
  onAgeUp: propertyTick,
  actions: {
    hire(ctx, role) {
      const { state } = ctx;
      const y = yearNow(state);
      if (state.character.age < 18) return ctx.toast('18+', 'warn');
      if (noServants(state)) return ctx.toast('Private servants are not allowed here.', 'warn');
      const r = rolesOpen(state, y).find((x) => x.id === role);
      if (!r) return ctx.toast('Not a post a household like yours has this year.', 'warn');
      const p = (state.property ??= { staff: [] });
      if (p.staff.length >= 14) return ctx.toast('Your house could not hold another soul.', 'warn');
      if (state.finances.cash < r.wage) return ctx.toast(`You'd need a year's wages in hand: ${r.wage.toLocaleString()}.`, 'warn');
      // After the wars, good staff were hard to find ("the servant problem").
      const rng = sideRng(state, 0x1d + p.staff.length);
      if (y >= 1919 && y < 1960 && rng.chance(0.3)) return ctx.log(`You advertised for a ${r.name.toLowerCase()}. Nobody suitable answered: girls go to the factories and the shops now.`, '📰', 'warn');
      const female = r.female || (['maid', 'cook', 'housekeeper', 'nanny', 'governess', 'auPair', 'ladysMaid'].includes(role) ? rng.chance(0.92) : ['butler', 'footman', 'valet', 'coachman', 'chauffeur', 'gardener', 'bodyguard'].includes(role) ? rng.chance(y < 1970 ? 0.02 : 0.15) : rng.chance(0.5));
      const nm = randomName(rng, female ? 'female' : 'male');
      p.staff.push({ id: `staff_${state.character.age}_${p.staff.length}`, role, name: `${nm.firstName} ${nm.lastName}`, since: state.character.age, wage: r.wage, female });
      ctx.log(`You took on ${nm.firstName} ${nm.lastName} as your ${r.name.toLowerCase()}.`, r.icon, 'good');
    },
    dismiss(ctx, id) {
      const p = ctx.state.property;
      const s = p?.staff?.find((x) => x.id === id);
      if (!s) return;
      p.staff = p.staff.filter((x) => x !== s);
      ctx.log(`You let ${s.name} go.`, '🚪', 'muted');
    },
  },
  resolvers: {
    staff(ctx, data, optionId) {
      const { state, rng } = ctx;
      const p = state.property;
      const s = p?.staff?.find((x) => x.id === data.id);
      if (!s) return;
      const gone = () => { p.staff = p.staff.filter((x) => x !== s); };
      if (optionId === 'match' || optionId === 'raise') { s.wage = Math.round(s.wage * 1.2); s.bonus = (s.bonus ?? 1) * 1.2; return ctx.log(`${s.name} stayed, for a fifth more.`, '💰', 'info'); }
      if (optionId === 'let') { gone(); return ctx.log(data.kind === 'steal' ? `You said nothing, and ${s.name} stayed. The spoons kept going missing.` : `${s.name} left.`, '👋', 'muted'); }
      if (optionId === 'police') {
        gone();
        return ctx.log(rng.chance(0.6) ? `The police found the silver in ${s.name}'s box. ${s.female ? 'She' : 'He'} went to prison.` : `The police found nothing, and ${s.name} left in tears. The silver turned up behind the dresser.`, '👮', 'warn');
      }
      if (optionId === 'dismiss') { gone(); return ctx.log(`You dismissed ${s.name}.`, '🚪', 'muted'); }
      ctx.log(data.kind === 'loved' ? `You let it be. ${s.name} is part of the family now.` : 'You let it be.', '🤝', 'info');
    },
  },
};

/** Everything you own, and what it costs to keep: [{ kind, icon, label, count, value, yearly }]. */
export function propertyLedger(state) {
  const rows = [];
  const homes = state.housing?.properties ?? [];
  if (homes.length) rows.push({ kind: 'homes', icon: '🏠', label: 'Homes and buildings', count: homes.length, value: homes.reduce((s, h) => s + h.value - (h.mortgage?.balance ?? 0), 0), yearly: homes.reduce((s, h) => s + (h.mortgage?.payment ?? 0) * 12, 0) });
  const vs = state.vehicles?.owned ?? [];
  const groups = { land: ['car', 'bike', 'fun', 'horse'], boat: ['boat'], air: ['air'] };
  for (const [g, cats] of Object.entries(groups)) {
    const list = vs.filter((v) => cats.includes(VEHICLE_TYPES[v.typeId]?.category));
    const pl = priceLevel(state);
    if (list.length) rows.push({ kind: g, icon: g === 'boat' ? '⛵' : g === 'air' ? '✈️' : '🚗', label: g === 'boat' ? 'Boats' : g === 'air' ? 'Aircraft' : 'Horses, carriages and cars', count: list.length, value: list.reduce((s, v) => s + (v.lease ? 0 : v.value - (v.loan?.balance ?? 0)), 0), yearly: list.reduce((s, v) => s + Math.round(((VEHICLE_TYPES[v.typeId]?.upkeep ?? 0) + (v.insured ? VEHICLE_TYPES[v.typeId]?.insurance ?? 0 : 0)) * pl), 0) });
  }
  const staff = staffOf(state);
  if (staff.length) rows.push({ kind: 'staff', icon: '🤵', label: 'Household staff', count: staff.length, value: 0, yearly: staffWages(state) });
  const art = state.society?.art ?? [];
  if (art.length) rows.push({ kind: 'art', icon: '🖼️', label: 'Art', count: art.length, value: art.reduce((s, a) => s + (a.value ?? 0), 0), yearly: 0 });
  // High society's toys (HighSociety.js keeps counts).
  for (const [k, label] of [['yacht', 'Society yachts'], ['jet', 'Private jets'], ['horses', 'Racehorses']]) {
    const n = state.society?.[k] ?? 0;
    const l = LUXURIES[k === 'horses' ? 'horse' : k];
    if (n > 0 && l) rows.push({ kind: k, icon: l.icon, label, count: n, value: Math.round(n * l.price * priceLevel(state)), yearly: Math.round(n * l.price * l.upkeep * priceLevel(state)) });
  }
  if (state.farm?.acres) rows.push({ kind: 'farm', icon: '🌾', label: 'Farmland', count: state.farm.acres, value: Math.round(state.farm.acres * (state.farm.valuePerAcre ?? 0) - (state.farm.loan?.balance ?? 0)), yearly: 0 });
  return rows;
}
