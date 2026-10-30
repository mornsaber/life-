/**
 * Hobbies that go somewhere. Take up to three; practise each once a year; enter what your
 * level allows. Skill climbs from beginner to amateur, club, competitive, semi-pro and elite —
 * slowly, faster with talent, and it fades when you stop. Sport peaks young; music, art, chess
 * and writing keep improving. At semi-pro the hobby pays (gigs, commissions, prize money), and
 * an elite amateur gets noticed.
 *
 * state.hobbies = { [id]: { skill, since, practised, wins, best, earned } }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { priceLevel } from '../world/Countries.js';
import { getProfession } from '../career/JobTrees.js';
import { createEmployer } from '../career/Employers.js';
import { hire } from '../career/CareerEngine.js';

/** The career an elite hobby can become, and the rung you'd start on. */
export const PRO_PATHS = {
  guitar: ['music', 'session'], piano: ['music', 'session'], singing: ['music', 'session'],
  running: ['athletics', 'pro'], football: ['athletics', 'pro'], tennis: ['athletics', 'pro'], boxing: ['athletics', 'pro'], climbing: ['athletics', 'minor'],
  painting: ['design', 'designer'], photography: ['design', 'designer'], cooking: ['culinary', 'partie'], writing: ['contentCreator', 'partTime'], chess: ['contentCreator', 'partTime'],
};

export const HOBBIES = {
  guitar: { label: 'Guitar', icon: '🎸', kind: 'music', cost: 400, stat: 'smarts', minAge: 7 },
  piano: { label: 'Piano', icon: '🎹', kind: 'music', cost: 700, stat: 'smarts', minAge: 5 },
  singing: { label: 'Singing', icon: '🎤', kind: 'music', cost: 300, stat: 'looks', minAge: 6 },
  painting: { label: 'Painting', icon: '🎨', kind: 'art', cost: 350, stat: 'smarts', minAge: 5 },
  photography: { label: 'Photography', icon: '📷', kind: 'art', cost: 900, stat: 'smarts', minAge: 10 },
  writing: { label: 'Writing', icon: '✍️', kind: 'art', cost: 50, stat: 'smarts', minAge: 8 },
  chess: { label: 'Chess', icon: '♟️', kind: 'mind', cost: 100, stat: 'smarts', minAge: 6 },
  cooking: { label: 'Cooking', icon: '🍳', kind: 'art', cost: 500, stat: 'smarts', minAge: 10 },
  running: { label: 'Running', icon: '🏃', kind: 'sport', cost: 250, stat: 'fitness', minAge: 8 },
  football: { label: 'Football', icon: '⚽', kind: 'sport', cost: 300, stat: 'fitness', minAge: 5 },
  tennis: { label: 'Tennis', icon: '🎾', kind: 'sport', cost: 600, stat: 'fitness', minAge: 6 },
  boxing: { label: 'Boxing', icon: '🥊', kind: 'sport', cost: 500, stat: 'fitness', minAge: 10, risk: 0.08 },
  climbing: { label: 'Climbing', icon: '🧗', kind: 'sport', cost: 700, stat: 'fitness', minAge: 8, risk: 0.04 },
};
export const MAX_HOBBIES = 3;

export const TIERS = [
  { min: 0, label: 'Beginner' }, { min: 20, label: 'Amateur' }, { min: 40, label: 'Club' },
  { min: 60, label: 'Competitive' }, { min: 75, label: 'Semi-pro' }, { min: 90, label: 'Elite' },
];
export const tierOf = (skill) => [...TIERS].reverse().find((t) => skill >= t.min);

/** What you can enter at each level, by kind. */
const EVENTS = {
  music: ['an open-mic night', 'a battle of the bands', 'a regional music festival slot', 'a support slot for a touring act', 'a headline set at a national festival'],
  art: ['the village show', 'a café exhibition', 'a juried regional exhibition', 'a gallery\'s group show', 'a solo show in the capital'],
  mind: ['the club ladder', 'a weekend open', 'the regional championship', 'the national championship', 'an international open'],
  sport: ['a local fun run or kickabout league', 'a club fixture', 'the county championship', 'the national championship', 'an international meet'],
};
EVENTS.writing = ['a library short-story contest', 'a literary magazine', 'a national short-story prize', 'an agent\'s slush pile', 'a publishing deal'];

const local = (state, n) => Math.round(n * priceLevel(state));
const mine = (state) => (state.hobbies ??= {});
export const hobbiesOf = (state) => state.hobbies ?? {};

/** Sport peaks young: past 32 the body sets a ceiling that falls every year. */
const ceiling = (state, h) => (HOBBIES[h].kind === 'sport' ? clamp(100 - Math.max(0, state.character.age - 32) * 2.5, 30, 100) : 100);

export function hobbiesTick(ctx) {
  const { state, rng } = ctx;
  const list = mine(state);
  for (const [id, h] of Object.entries(list)) {
    const def = HOBBIES[id];
    if (!def) { delete list[id]; continue; }
    if (!h.practised) h.skill = Math.max(0, h.skill - rng.int(1, 3));
    h.practised = false;
    h.skill = Math.min(h.skill, ceiling(state, id));
    // Semi-pro: the hobby pays its way.
    // Elite: someone offers to make it your job.
    const path = PRO_PATHS[id];
    if (h.skill >= 88 && !h.proOffered && path && getProfession(path[0]) && state.character.age >= 16 && state.character.age <= (def.kind === 'sport' ? 32 : 60) && rng.chance(0.5)) {
      h.proOffered = state.character.age;
      ctx.prompt({ type: 'hobbies.pro', icon: '🌟', title: `Go Pro in ${def.label}?`, text: `${def.kind === 'sport' ? 'A club' : def.kind === 'music' ? 'A label' : 'An agency'} has seen what you can do and offers you a place — as your job, not your hobby.${state.career.job ? ` You would leave ${state.career.job.title}.` : ''}`, data: { id }, options: [
        { id: 'go', label: '🌟 Take it', hint: 'Doing what you love; less security' },
        { id: 'stay', label: '🏡 Keep it a hobby' },
      ] });
    }
    if (h.skill >= 75 && def.kind !== 'sport' && rng.chance(0.6)) {
      const pay = local(state, rng.int(1500, 6000) * (h.skill >= 90 ? 4 : 1));
      h.earned = (h.earned ?? 0) + pay;
      ctx.earn(pay, `${def.label}: ${def.kind === 'music' ? 'gigs' : def.id === 'writing' ? 'fees and royalties' : 'commissions and sales'}`, { selfEmployed: true });
    }
  }
}

export const HobbyActions = {
  take(ctx, id) {
    const { state } = ctx;
    const def = HOBBIES[id];
    const list = mine(state);
    if (!def || list[id]) return;
    if (state.character.age < def.minAge) return ctx.toast(`Ages ${def.minAge}+`, 'warn');
    if (Object.keys(list).length >= MAX_HOBBIES) return ctx.toast(`Up to ${MAX_HOBBIES} hobbies — drop one first`, 'warn');
    list[id] = { skill: Math.round(clamp((state.stats[def.stat] ?? 50) / 10, 0, 12)), since: state.character.age, practised: false, wins: 0, best: null, earned: 0 };
    ctx.log(`You took up ${def.label.toLowerCase()}.`, def.icon, 'info');
  },
  drop(ctx, id) {
    const list = mine(ctx.state);
    if (!list[id]) return;
    delete list[id];
    ctx.log(`You gave up ${HOBBIES[id].label.toLowerCase()}.`, HOBBIES[id].icon, 'muted');
  },
  practise(ctx, id) {
    const { state, rng } = ctx;
    const def = HOBBIES[id];
    const h = mine(state)[id];
    if (!h) return;
    if (yearlyCount(state, `hobby.practise.${id}`)) return ctx.toast('Already practised this year', 'warn');
    const cost = local(state, def.cost);
    if (!ctx.spend(cost, `${def.label}: lessons and kit`)) return ctx.toast('Not enough cash', 'warn');
    bumpYearly(state, `hobby.practise.${id}`);
    const talent = (state.stats[def.stat] ?? 50) / 100;
    const youth = state.character.age < 18 ? 1.4 : state.character.age < 30 ? 1.1 : 0.9;
    const gain = Math.max(1, Math.round((12 - h.skill / 10) * (0.5 + talent) * youth * rng.float(0.6, 1.2)));
    const before = tierOf(h.skill).label;
    h.skill = Math.round(Math.min(ceiling(state, id), h.skill + gain));
    h.practised = true;
    ctx.stat(def.stat, def.kind === 'sport' ? rng.int(2, 4) : rng.int(0, 2));
    ctx.stat('stress', -rng.int(3, 7));
    ctx.stat('happiness', 2);
    if (def.risk && rng.chance(def.risk)) { ctx.stat('health', -rng.int(5, 15)); ctx.log(`You got hurt ${def.kind === 'sport' ? 'training' : ''} — weeks off.`.replace('  ', ' '), '🤕', 'bad'); }
    const after = tierOf(h.skill).label;
    ctx.log(after !== before ? `${def.icon} ${def.label}: you're ${/^[AEIOU]/.test(after) ? 'an' : 'a'} ${after.toLowerCase()} now.` : `You practised ${def.label.toLowerCase()} all year (${h.skill}/100).`, def.icon, after !== before ? 'milestone' : 'info');
  },
  /** Enter the biggest event your level allows. */
  compete(ctx, id) {
    const { state, rng } = ctx;
    const def = HOBBIES[id];
    const h = mine(state)[id];
    if (!h) return;
    if (h.skill < 20) return ctx.toast('Practise first: amateur level (20+) to enter anything', 'warn');
    if (yearlyCount(state, `hobby.compete.${id}`)) return ctx.toast('One event a year', 'warn');
    bumpYearly(state, `hobby.compete.${id}`);
    const tier = Math.min(4, Math.floor((h.skill - 20) / 15));
    const event = (EVENTS[id] ?? EVENTS[def.kind])[tier];
    const odds = clamp(0.25 + (h.skill - (20 + tier * 15)) / 40, 0.1, 0.7);
    if (!rng.chance(odds)) { ctx.stat('happiness', -2); return ctx.log(`You entered ${event}. ${rng.pick(['Not this year.', 'You were outclassed — and learned more than you would have winning.', 'Close. Next year.'])}`, def.icon, 'info'); }
    h.wins += 1;
    h.best = tier >= (h.bestTier ?? -1) ? event : h.best;
    h.bestTier = Math.max(h.bestTier ?? -1, tier);
    const prize = tier >= 2 ? local(state, [0, 0, 500, 3000, 15000][tier] * rng.float(0.6, 1.4)) : 0;
    if (prize) ctx.earn(prize, `${def.label} prize money`);
    if (tier >= 3) ctx.emit('fame:buzz', { amount: tier === 4 ? 6 : 2 });
    ctx.stat('happiness', 4 + tier * 2);
    ctx.log(`${def.kind === 'music' || def.kind === 'art' || id === 'writing' ? 'A triumph at' : 'You won at'} ${event}!${prize ? ` ($${prize.toLocaleString()})` : ''}`, '🏆', 'milestone');
  },
};

export const HobbyResolvers = {
  pro(ctx, data, optionId) {
    const { state, rng } = ctx;
    const def = HOBBIES[data.id];
    if (optionId !== 'go') return ctx.log(`You kept ${def.label.toLowerCase()} for yourself.`, def.icon, 'info');
    const [profId, levelId] = PRO_PATHS[data.id];
    const prof = getProfession(profId);
    const employer = createEmployer(rng, state, prof, state.character.regionId);
    if (state.career.job) ctx.emit('career:resign', { reason: `Went professional in ${def.label.toLowerCase()}` });
    const ok = hire(ctx, { professionId: profId, levelId: prof.levels.some((l) => l.id === levelId) ? levelId : prof.levels[0].id, employer });
    ctx.log(ok ? `You turned professional: ${def.label.toLowerCase()} is your job now.` : 'The offer fell through at the last minute.', '🌟', ok ? 'milestone' : 'warn');
  },
};

export const HobbiesModule = { id: 'hobbies', order: 5.5, onAgeUp: hobbiesTick, actions: HobbyActions, resolvers: HobbyResolvers };
