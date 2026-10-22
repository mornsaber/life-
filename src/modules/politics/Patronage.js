/**
 * Honours patronage: the people in office who decide who else is honoured.
 *
 *   Lists       A head of government (prime minister, president, premier, state
 *               governor) submits names for the honours list — the worthy, and
 *               (riskily) friends, family, donors and staff. A PM can recommend
 *               peerages where there are any.
 *   Appointees  The Crown's representatives (Governors-General, governors,
 *               lieutenant governors, lords-lieutenant) and cabinet ministers
 *               recommend for the orders too; mayors give the freedom (or key) of
 *               the city.
 *   Resignation On leaving office the honours often follow: a decent chance of an
 *               order for anyone who served at state or national level, high for
 *               a head of government or a Governor-General — and a leader who
 *               steps down gets a resignation honours list of their own.
 *
 * state.politics.patronage = { worthies: [..], year, resignationList: { left, maxTier } }
 */
import { OFFICES } from './Offices.js';
import { ORDERS, award, tierName, tierPrefix } from '../world/Honours.js';
import { currentYear, yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { living, ageOf } from '../people/People.js';

const cc = (state) => state.character.countryId ?? 'US';
const tiersOf = (state) => ORDERS[cc(state)]?.tiers ?? [];
const VICE_REGAL = /_gg$|_lg$|au_governor|gb_lordLieutenant|gb_deputyLieutenant/;

/** What your office lets you do: { kind, label, perYear, maxTier (index), peers } or null. */
export function honourPowers(state) {
  const o = state.politics?.office;
  const tiers = tiersOf(state);
  const rl = state.politics?.patronage?.resignationList;
  if (rl?.left) return { kind: 'resignation', label: 'Your resignation honours list', perYear: rl.left, maxTier: rl.maxTier, peers: rl.peers };
  if (!o) return null;
  const def = OFFICES[o.id] ?? {};
  const nonPeerTop = tiers.findLastIndex((t) => !t.peer);
  const head = (def.leader && (def.level ?? 0) >= 5) || /president|_pm$|^president$/.test(o.id) || def.headOfState;
  if (VICE_REGAL.test(o.id)) return { kind: 'viceRegal', label: 'Recommendations from Government House', perYear: 2, maxTier: Math.max(0, Math.min(nonPeerTop, 2)), peers: false };
  if (head) return { kind: 'list', label: (def.level ?? 0) >= 5 ? 'The honours list' : 'Honours nominations', perYear: 4, maxTier: Math.max(0, nonPeerTop), peers: tiers.some((t) => t.peer) };
  if (def.executive && (def.level ?? 0) >= 4) return { kind: 'governor', label: cc(state) === 'US' ? 'The state\'s distinguished service awards' : 'Honours nominations', perYear: 2, maxTier: Math.max(0, Math.min(nonPeerTop, 1)), peers: false, civic: cc(state) === 'US' ? 'the state\'s Distinguished Service Medal' : null };
  if (/cabinet|minister/i.test(o.id) || o.title) return { kind: 'minister', label: 'Nominations from your department', perYear: 1, maxTier: Math.max(0, Math.min(nonPeerTop, 1)), peers: false };
  if (o.id === 'mayor' || /mayor/.test(o.id)) return { kind: 'mayor', label: 'Civic honours', perYear: 1, maxTier: -1, peers: false, civic: cc(state) === 'US' ? 'the key to the city' : 'the freedom of the city' };
  if ((def.level ?? 0) >= 3) return { kind: 'member', label: 'Nominations for the honours list', perYear: 1, maxTier: 0, peers: false };
  return null;
}

const WORTHY = ['a nurse who ran a hospice for thirty years', 'a teacher who turned round a failing school', 'a firefighter who led the rescue at the flood', 'a scientist behind a new vaccine', 'a volunteer who founded a food bank', 'an Olympic champion', 'a novelist loved by three generations', 'a veteran who raised millions for the wounded', 'an entrepreneur who built a firm from nothing', 'a social worker in the toughest estates'];

/** This year's worthy names, refreshed yearly. */
function worthies(ctx) {
  const { state, rng } = ctx;
  const p = (state.politics.patronage ??= { worthies: [], year: null });
  if (p.year !== currentYear(state)) {
    p.year = currentYear(state);
    p.worthies = rng.shuffle(WORTHY).slice(0, 3).map((what, i) => { const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female'); return { id: `w${p.year}_${i}`, name: `${n.firstName} ${n.lastName}`, what, merit: rng.int(0, 2) }; });
  }
  return p.worthies;
}

/** Who you could put forward: [{ id, name, who, kind: 'worthy'|'personal'|'staff' }]. */
export function nominees(state) {
  const out = (state.politics?.patronage?.worthies ?? []).filter((w) => !w.done).map((w) => ({ id: w.id, name: w.name, who: w.what, kind: 'worthy', merit: w.merit }));
  for (const p of living(state)) {
    if (ageOf(state, p) < 21 || (p.honours ?? []).includes('list')) continue;
    if (['friend', 'bestFriend', 'coworker', 'mentor', 'spouse', 'sibling', 'child', 'mother', 'father'].includes(p.relation)) out.push({ id: p.id, name: `${p.firstName} ${p.lastName}`, who: p.relation === 'bestFriend' ? 'your best friend' : `your ${p.relation}`, kind: ['spouse', 'sibling', 'child', 'mother', 'father'].includes(p.relation) ? 'family' : 'personal' });
  }
  for (const s of state.legislature?.seat?.staff ?? []) if (!s.honoured) out.push({ id: s.id, name: s.name, who: 'a member of your staff', kind: 'staff' });
  return out.slice(0, 12);
}

/** The grade a nominee gets: the worthy by merit, everyone else low. */
function tierFor(powers, n, peerage) {
  if (peerage) return 'peer';
  if (n.kind === 'worthy') return Math.min(powers.maxTier, n.merit ?? 0);
  return 0;
}

function nominate(ctx, arg) {
  const { state, rng } = ctx;
  const powers = honourPowers(state);
  if (!powers) return ctx.toast('Your office doesn\'t put names forward for honours.', 'warn');
  const used = yearlyCount(state, 'patronage.nominate');
  if (powers.kind === 'resignation' ? powers.perYear <= 0 : used >= powers.perYear) return ctx.toast(`${powers.perYear} name${powers.perYear === 1 ? '' : 's'} a year.`, 'warn');
  worthies(ctx);
  const [id, how] = String(arg).split('|');
  const n = nominees(state).find((x) => x.id === id);
  if (!n) return undefined;
  const peerage = how === 'peer' && powers.peers;
  const tiers = tiersOf(state);
  const t = peerage ? tiers.find((x) => x.peer) : tiers[tierFor(powers, n)];
  const honourName = powers.civic && (powers.kind === 'mayor' || !t) ? powers.civic : t ? tierName(t, 'male').replace(/^Knight Bachelor$/, 'a knighthood') : powers.civic;
  if (!honourName) return ctx.toast('There are no state honours to give here.', 'warn');
  bumpYearly(state, 'patronage.nominate');
  if (powers.kind === 'resignation') state.politics.patronage.resignationList.left -= 1;
  // Mark them honoured.
  const w = state.politics.patronage.worthies.find((x) => x.id === id);
  if (w) w.done = true;
  const person = state.people.list.find((p) => p.id === id);
  if (person) {
    person.honours = [...(person.honours ?? []), 'list'];
    const prefix = t ? tierPrefix(t, person.gender) : null;
    if (prefix && !person.title) person.title = prefix;
    person.relationship = clamp((person.relationship ?? 60) + 12, 0, 100);
  }
  const staffer = state.legislature?.seat?.staff?.find((s) => s.id === id);
  if (staffer) { staffer.honoured = true; staffer.loyalty = Math.min(100, (staffer.loyalty ?? 60) + 15); }
  // The politics of it: the worthy are popular; cronies are a risk.
  const o = state.politics.office;
  const crony = n.kind === 'family' ? 0.35 : n.kind === 'personal' ? 0.15 : n.kind === 'staff' ? 0.06 : 0;
  if (o) o.approval = Math.round(clamp(o.approval + (n.kind === 'worthy' ? 1 : 0), 0, 100));
  ctx.log(`On your ${powers.kind === 'resignation' ? 'resignation list' : 'recommendation'}, ${n.name} (${n.who}) received ${honourName}.`, peerage ? '👑' : '🎗️', 'honor');
  if (crony && rng.chance(crony)) {
    if (o) o.approval = Math.round(clamp(o.approval - (n.kind === 'family' ? 10 : 5), 0, 100));
    state.politics.scandals = (state.politics.scandals ?? 0) + 1;
    ctx.log(`"${n.kind === 'family' ? 'Honours for the family' : 'Gongs for cronies'}": the papers ran with ${n.name}'s honour for a week.`, '📰', 'warn');
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Honours on leaving office                                           */
/* ------------------------------------------------------------------ */

const DISGRACE = /felony|Removed|Expelled|incarcerat|impeach|Recalled|scandal|conviction/i;

export function leavingHonours(ctx, officeId, reason, years) {
  const { state, rng } = ctx;
  const def = OFFICES[officeId];
  if (!def || DISGRACE.test(reason ?? '') || years < 1) return;
  const tiers = tiersOf(state);
  const level = def.level ?? 0;
  const head = !VICE_REGAL.test(officeId) && ((def.leader && level >= 5) || /president|_pm$/.test(officeId) || def.headOfState);
  // A leader who goes gets a resignation honours list.
  if (head && tiers.length) {
    state.politics.patronage ??= { worthies: [], year: null };
    state.politics.patronage.resignationList = { left: 3, maxTier: Math.max(0, tiers.findLastIndex((t) => !t.peer)), peers: tiers.some((t) => t.peer) };
    ctx.log('As you leave, you may submit a resignation honours list: three names.', '📜', 'info');
  }
  const chance = VICE_REGAL.test(officeId) ? 0.75 : head ? 0.65 : level >= 5 ? 0.45 : level >= 4 ? 0.3 : level >= 3 ? 0.12 : 0.03;
  if (!tiers.length || !rng.chance(Math.min(0.9, chance + Math.min(0.15, years * 0.01)))) return;
  const nonPeer = tiers.map((t, i) => [t, i]).filter(([t]) => !t.peer);
  const idx = Math.min(nonPeer.length - 1, Math.round(((level - 2) / 4) * (nonPeer.length - 1)) + (head ? 1 : 0));
  let t = nonPeer[Math.max(0, idx)][0];
  // Former heads of government and long-serving ministers in a house of peers: often a peerage.
  const peer = tiers.find((x) => x.peer);
  if (peer && (head || (level >= 4 && years >= 8)) && rng.chance(head ? 0.6 : 0.25) && !state.character.peerage) t = peer;
  const held = state.honors.filter((h) => h.source === 'order' && h.country === cc(state)).map((h) => tiers.findIndex((x) => x.id === h.tier));
  if (held.some((i) => i >= tiers.indexOf(t))) return;
  ctx.log(`In recognition of your service as ${def.name}${reason === 'Resigned' ? ', on your resignation' : ''}:`, '🎗️', 'honor');
  award(ctx, cc(state), t);
}

export const PatronageModule = {
  id: 'patronage',
  order: 62,
  setup(engine) {
    engine.bus.on('politics:left', ({ ctx, officeId, reason, years }) => leavingHonours(ctx, officeId, reason, years));
  },
  onAgeUp(ctx) {
    const p = ctx.state.politics;
    if (honourPowers(ctx.state)) worthies(ctx);
    // An unused resignation list lapses after a year.
    const rl = p?.patronage?.resignationList;
    if (rl && !p.office) { rl.age ??= ctx.state.character.age; if (ctx.state.character.age - rl.age >= 2) p.patronage.resignationList = null; }
  },
  actions: {
    /** arg: 'nomineeId' or 'nomineeId|peer'. */
    nominate,
  },
};
