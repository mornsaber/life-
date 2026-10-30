/**
 * Staying clean. Rehab gets you into remission; recovery is the years after.
 *
 *   The path     after treatment: meetings and a sponsor, meetings alone, or on your own.
 *                Each changes the odds of a relapse.
 *   The years    every clean year lowers the risk; stress and trauma raise it. Milestones at
 *                one, five, ten and twenty years. Moments of temptation: a wedding toast, a
 *                prescription after surgery, an old friend who still uses.
 *   Relapse      happens, and isn't the end: the clock resets and you can go back.
 *   Sponsoring   five years in, you can sponsor someone else.
 *
 * state.health.recovery = { [conditionId]: { since, path, sponsor, sponsoring, relapses } }
 */
import { Random, clamp } from '../../core/Random.js';
import { CONDITIONS } from './Conditions.js';

const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 59359 + state.character.age * 257 + 0x7ec) >>> 0);
export const recoveryOf = (state) => state.health?.recovery ?? {};
const MILESTONES = { 1: 'One year clean. A coin, a cake, and a room full of people clapping.', 5: 'Five years clean.', 10: 'Ten years clean. You hardly recognise the person you were.', 20: 'Twenty years clean.' };

const TEMPTATIONS = [
  { id: 'toast', text: (c) => `At a wedding, someone presses a ${c === 'alcohol' ? 'glass of champagne' : 'drink'} into your hand for the toast.`, for: ['alcohol'] },
  { id: 'surgery', text: () => 'After an operation, the surgeon prescribes a strong opioid painkiller for two weeks.', for: ['opioids'] },
  { id: 'friend', text: () => 'An old friend from the bad years turns up, still using, and asks if you want to "just once, like old times".', for: ['opioids', 'stimulants', 'alcohol'] },
  { id: 'casino', text: () => 'A work trip ends in a casino hotel. The tables are right there, downstairs.', for: ['gambling'] },
];

export function recoveryTick(main) {
  const { state } = main;
  const h = state.health;
  if (!h) return;
  const rng = sideRng(state);
  const ctx = { ...main, rng };
  for (const c of h.conditions.filter((x) => x.remission && CONDITIONS[x.id]?.kind === 'addiction')) {
    h.recovery ??= {};
    let r = h.recovery[c.id];
    if (!r) {
      r = h.recovery[c.id] = { since: state.character.age, path: null, sponsor: false, sponsoring: false, relapses: 0 };
      ctx.prompt({ type: 'health.recoveryPath', icon: '🌱', title: 'After Rehab', text: `You're out of treatment for ${CONDITIONS[c.id].name.toLowerCase()}. The counsellors were clear: the first year is the hardest.`, data: { id: c.id }, options: [
        { id: 'sponsor', label: '🤝 Meetings every week, and a sponsor', hint: 'The best odds' },
        { id: 'meetings', label: '🪑 Go to meetings' },
        { id: 'alone', label: '🚶 Do it on your own' },
      ] });
      continue;
    }
    const years = state.character.age - r.since;
    if (MILESTONES[years]) { main.log(MILESTONES[years], '🎖️', 'milestone'); main.stat('happiness', 5); }
    // The risk: highest early, lower every year; support helps, stress hurts.
    const risk = clamp(0.2 * 0.75 ** years * (r.path === 'sponsor' ? 0.45 : r.path === 'meetings' ? 0.65 : 1) * (r.sponsoring ? 0.7 : 1) * (1 + Math.max(0, (state.stats.stress ?? 40) - 60) / 40) * (1 + (h.trauma ?? 0) / 150), 0.005, 0.5);
    if (rng.chance(risk)) {
      c.remission = false;
      c.severity = 40;
      r.relapses += 1;
      r.since = state.character.age;
      main.log(`You relapsed after ${years} year${years === 1 ? '' : 's'}. It isn't the end — the clock just starts again.`, '🥀', 'bad');
      main.stat('happiness', -10);
      delete h.recovery[c.id];
      continue;
    }
    if (years >= 5 && !r.sponsoring && rng.chance(0.25)) {
      ctx.prompt({ type: 'health.recoverySponsor', icon: '🤝', title: 'Someone Asks You', text: 'A young man at your meeting, three weeks clean and shaking, asks if you\'ll be his sponsor.', data: { id: c.id }, options: [{ id: 'yes', label: '🤝 Yes' }, { id: 'no', label: '🙅 Not now' }] });
    } else if (rng.chance(0.2)) {
      const t = TEMPTATIONS.filter((x) => x.for.includes(c.id));
      if (t.length) {
        const e = rng.pick(t);
        ctx.prompt({ type: 'health.recoveryTemptation', icon: '⚠️', title: 'A Moment', text: e.text(c.id), data: { id: c.id, kind: e.id }, options: [
          { id: 'call', label: '📞 Step outside and call your sponsor (or a friend)' },
          { id: 'no', label: '🙅 Say no and leave' },
          { id: 'once', label: '🥀 Just this once', tone: 'danger' },
        ] });
      }
    }
  }
}

export const RecoveryResolvers = {
  recoveryPath(ctx, data, optionId) {
    const r = ctx.state.health.recovery?.[data.id];
    if (!r) return;
    r.path = optionId;
    r.sponsor = optionId === 'sponsor';
    ctx.log({ sponsor: 'You found a sponsor: a retired electrician who answers the phone at any hour.', meetings: 'Tuesday nights, a church basement, terrible coffee. You keep going.', alone: 'You decided to do it your own way.' }[optionId], '🌱', 'info');
  },
  recoverySponsor(ctx, data, optionId) {
    const r = ctx.state.health.recovery?.[data.id];
    if (!r || optionId !== 'yes') return;
    r.sponsoring = true;
    ctx.stat('happiness', 6);
    ctx.log('You said yes. Being someone\'s sponsor turns out to keep you honest too.', '🤝', 'good');
  },
  recoveryTemptation(ctx, data, optionId) {
    const { state, rng } = ctx;
    const c = state.health.conditions.find((x) => x.id === data.id && x.remission);
    const r = state.health.recovery?.[data.id];
    if (!c || !r) return;
    if (optionId === 'once') {
      if (rng.chance(0.6)) { c.remission = false; c.severity = 35; delete state.health.recovery[data.id]; return ctx.log('Just once became the next night, and the next.', '🥀', 'bad'); }
      return ctx.log('Just once. You got away with it — this time — and told your sponsor the next morning.', '😰', 'warn');
    }
    if (data.kind === 'surgery' && optionId !== 'once') { ctx.stat('health', -2); return ctx.log('You asked for a non-opioid painkiller and gritted your teeth through the rest.', '💪', 'good'); }
    ctx.stat('stress', optionId === 'call' ? -2 : 2);
    ctx.log(optionId === 'call' ? 'Ten minutes on the phone outside, and the moment passed.' : 'You said no and left early.', '🌱', 'good');
  },
};
