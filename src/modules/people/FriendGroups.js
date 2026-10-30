/**
 * Friendship as a story: a best friend, and the groups you belong to.
 *
 *   Best friend   choose one (a close friend). The years together bring an arc: the trip you
 *                 always talk about, standing up at their wedding, the falling-out — over money,
 *                 a partner, something said — and, if you both want it, the making-up.
 *   Groups        three or more friends in a circle (Friends.js) make a group: a weekend away,
 *                 the group chat going quiet, two of them falling out and everyone picking sides.
 *
 * state.friendGroups = { best: personId, since, fallenOut: age | null, arc: [stepIds] }
 */
import { Random } from '../../core/Random.js';
import { byId, clampRel } from './People.js';
import { friendsOf, CIRCLES } from './Friends.js';
import { priceLevel } from '../world/Countries.js';

const ofState = (state) => (state.friendGroups ??= { best: null, since: null, fallenOut: null, arc: [] });
export const friendGroupsOf = (state) => state.friendGroups ?? { best: null, since: null, fallenOut: null, arc: [] };
const local = (state, n) => Math.round(n * priceLevel(state));
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 69317 + state.character.age * 389 + 0xf12) >>> 0);
export const bestFriend = (state) => { const id = state.friendGroups?.best; const p = id && byId(state, id); return p && p.alive ? p : null; };

/** The circles that are groups: three or more friends who all know each other. */
export function groupsOf(state) {
  const by = {};
  for (const f of friendsOf(state)) if (!f.away) (by[f.circle ?? 'neighborhood'] ??= []).push(f);
  return Object.entries(by).filter(([, list]) => list.length >= 3).map(([circle, list]) => ({ circle, list }));
}

const ARC = [
  { id: 'trip', after: 3, title: 'The Trip', text: (f) => `${f.firstName} wants to do the trip you've talked about for years: a week, just the two of you.`, options: [{ id: 'go', label: '🧳 Go', cost: 1500 }, { id: 'later', label: '📅 Next year, definitely' }] },
  { id: 'crisis', after: 6, title: 'The Phone Call', text: (f) => `${f.firstName} rang at midnight. Their marriage is over, or their father is dying, or both. They need you.`, options: [{ id: 'there', label: '🚗 Drive over now' }, { id: 'tomorrow', label: '☎️ Talk tonight, see them at the weekend' }] },
  { id: 'fallout', after: 9, title: 'The Falling-Out', text: (f) => `${f.firstName} said something about your partner — or you said something about theirs. It wasn't a joke and you both know it.`, options: [{ id: 'apologise', label: '🙇 Apologise first' }, { id: 'stand', label: '🧱 Wait for them to apologise' }] },
  { id: 'long', after: 20, title: 'Twenty Years', text: (f) => `Twenty years of ${f.firstName}. They know things about you nobody else does.`, options: [{ id: 'toast', label: '🥂 Mark it with a dinner' }] },
];

export function friendGroupsTick(main) {
  const { state } = main;
  if (!state.people || state.character.age < 8) return;
  const F = ofState(state);
  const rng = sideRng(state);
  const ctx = { ...main, rng };
  const best = bestFriend(state);
  if (F.best && !best) { F.best = null; F.arc = []; }
  if (best) {
    const years = state.character.age - F.since;
    if (F.fallenOut != null) {
      if (state.character.age - F.fallenOut >= 2 && rng.chance(0.3)) {
        ctx.prompt({ type: 'friendGroups.reconcile', icon: '🕊️', title: `A Message from ${best.firstName}`, text: `"I've been thinking about what happened. I miss you." It's been ${state.character.age - F.fallenOut} years.`, data: {}, options: [{ id: 'yes', label: '🤝 Meet for a coffee' }, { id: 'no', label: '🚪 Leave it in the past' }] });
      }
    } else {
      const step = ARC.find((a) => years >= a.after && !F.arc.includes(a.id));
      if (step && rng.chance(0.5)) {
        F.arc.push(step.id);
        ctx.prompt({ type: 'friendGroups.arc', icon: '🫂', title: step.title, text: step.text(best), data: { step: step.id }, options: step.options.map((o) => ({ id: o.id, label: o.label, hint: o.cost ? `$${local(state, o.cost).toLocaleString()}` : undefined })) });
        return;
      }
    }
  }
  const groups = groupsOf(state);
  if (!groups.length || !rng.chance(0.3)) return;
  const g = rng.pick(groups);
  const kind = rng.pick(['weekend', 'quiet', 'sides']);
  const [a, b] = rng.shuffle([...g.list]);
  const label = CIRCLES[g.circle]?.label.toLowerCase() ?? 'friends';
  if (kind === 'weekend') return ctx.prompt({ type: 'friendGroups.group', icon: '🏕️', title: 'A Weekend Away', text: `Your ${label} are renting a cottage for a long weekend: ${g.list.map((f) => f.firstName).join(', ')}.`, data: { circle: g.circle, kind }, options: [{ id: 'go', label: '🏕️ Go', hint: `$${local(state, 600).toLocaleString()}` }, { id: 'skip', label: '🛋️ Too busy this time' }] });
  if (kind === 'quiet') return ctx.prompt({ type: 'friendGroups.group', icon: '💬', title: 'The Group Chat Went Quiet', text: `Nobody in your ${label} has posted for months.`, data: { circle: g.circle, kind }, options: [{ id: 'organise', label: '📅 Organise a night out' }, { id: 'let', label: '🤷 People get busy' }] });
  return ctx.prompt({ type: 'friendGroups.group', icon: '⚔️', title: 'Picking Sides', text: `${a.firstName} and ${b.firstName} have fallen out over ${rng.pick(['money', 'a wedding invitation', 'an ex', 'politics', 'who said what'])}. Everyone in your ${label} is choosing.`, data: { circle: g.circle, kind, a: a.id, b: b.id }, options: [{ id: 'a', label: `🙋 Side with ${a.firstName}` }, { id: 'b', label: `🙋 Side with ${b.firstName}` }, { id: 'neutral', label: '🕊️ Stay friends with both' }] });
}

export const FriendGroupsResolvers = {
  arc(ctx, data, optionId) {
    const { state, rng } = ctx;
    const F = ofState(state);
    const f = bestFriend(state);
    if (!f) return;
    const bump = (n) => (f.relationship = clampRel(f.relationship + n));
    switch (`${data.step}:${optionId}`) {
      case 'trip:go': ctx.spend(local(state, 1500), `A trip with ${f.firstName}`, { allowDebt: true }); bump(10); ctx.stat('happiness', 6); return ctx.log(`You and ${f.firstName} finally did the trip. You'll be telling the story at each other's funerals.`, '🧳', 'good');
      case 'trip:later': bump(-3); return ctx.log('Next year. Definitely.', '📅', 'muted');
      case 'crisis:there': bump(14); ctx.stat('stress', 4); return ctx.log(`You were on ${f.firstName}'s doorstep within the hour.`, '🚗', 'good');
      case 'crisis:tomorrow': bump(2); return ctx.log(`You talked until 3 a.m. and saw ${f.firstName} on Saturday.`, '☎️', 'info');
      case 'fallout:apologise': if (rng.chance(0.7)) { bump(5); return ctx.log(`You apologised. ${f.firstName} did too. It was never mentioned again.`, '🙇', 'good'); } F.fallenOut = state.character.age; bump(-25); return ctx.log(`You apologised; ${f.firstName} wasn't ready to hear it.`, '💔', 'bad');
      case 'fallout:stand': F.fallenOut = state.character.age; bump(-30); ctx.stat('happiness', -6); return ctx.log(`Neither of you called. A year went by, then another.`, '💔', 'bad');
      case 'long:toast': bump(6); ctx.stat('happiness', 4); return ctx.log(`Dinner with ${f.firstName}: twenty years, three bottles of wine, one embarrassing speech.`, '🥂', 'good');
      default: return undefined;
    }
  },
  reconcile(ctx, data, optionId) {
    const F = ofState(ctx.state);
    const f = bestFriend(ctx.state);
    if (!f) return;
    if (optionId === 'yes') { F.fallenOut = null; f.relationship = clampRel(f.relationship + 25); ctx.stat('happiness', 8); return ctx.log(`You met ${f.firstName} for a coffee that lasted four hours.`, '🕊️', 'good'); }
    F.best = null;
    ctx.log(`You left it with ${f.firstName}. Some friendships have a season.`, '🍂', 'muted');
  },
  group(ctx, data, optionId) {
    const { state } = ctx;
    const list = friendsOf(state).filter((f) => (f.circle ?? 'neighborhood') === data.circle);
    const all = (n) => { for (const f of list) f.relationship = clampRel(f.relationship + n); };
    if (data.kind === 'weekend') {
      if (optionId === 'go') { ctx.spend(local(state, 600), 'Weekend away with friends', { allowDebt: true }); all(6); ctx.stat('happiness', 5); ctx.stat('stress', -6); return ctx.log('A weekend of board games, long walks and too much food. The photos went straight in the group chat.', '🏕️', 'good'); }
      all(-2); return ctx.log('You missed the weekend. The in-jokes from it took a while to follow.', '🛋️', 'muted');
    }
    if (data.kind === 'quiet') {
      if (optionId === 'organise') { all(5); return ctx.log('You booked a table. Everyone came. Why don\'t we do this more often?', '📅', 'good'); }
      all(-4); return ctx.log('The chat stayed quiet.', '💬', 'muted');
    }
    const a = byId(state, data.a);
    const b = byId(state, data.b);
    if (!a || !b) return;
    if (optionId === 'a') { a.relationship = clampRel(a.relationship + 10); b.relationship = clampRel(b.relationship - 25); return ctx.log(`You backed ${a.firstName}. ${b.firstName} noticed.`, '⚔️', 'warn'); }
    if (optionId === 'b') { b.relationship = clampRel(b.relationship + 10); a.relationship = clampRel(a.relationship - 25); return ctx.log(`You backed ${b.firstName}. ${a.firstName} noticed.`, '⚔️', 'warn'); }
    a.relationship = clampRel(a.relationship - 4); b.relationship = clampRel(b.relationship - 4);
    ctx.log(`You stayed friends with both ${a.firstName} and ${b.firstName}. It meant two separate birthday drinks for a while.`, '🕊️', 'info');
  },
};

export const FriendGroupsActions = {
  best(ctx, id) {
    const { state } = ctx;
    const f = friendsOf(state).find((x) => x.id === id);
    if (!f) return;
    if (f.relationship < 65) return ctx.toast('Get closer first (65+)', 'warn');
    const F = ofState(state);
    if (F.best === id) return;
    const old = bestFriend(state);
    if (old) old.relationship = clampRel(old.relationship - 10);
    Object.assign(F, { best: id, since: state.character.age, fallenOut: null, arc: [] });
    f.relationship = clampRel(f.relationship + 5);
    ctx.log(`${f.firstName} is your best friend${old ? `. ${old.firstName} took it well. Mostly` : ''}.`, '🫂', 'good');
  },
};

export const FriendGroupsModule = { id: 'friendGroups', order: 13.5, onAgeUp: friendGroupsTick, actions: FriendGroupsActions, resolvers: FriendGroupsResolvers };
