/**
 * Pursuits: hobbies and sports that go somewhere, as they were in their day (packs in
 * life/pursuits/*.js). Take up to three; practise each once a year; join a club; enter what your
 * level (and your day) allows. Skill climbs a ladder named for the pursuit (Jogger → Club runner →
 * International; Beginner → Grandmaster), slowly, faster with talent and a club, and fades when
 * you stop. Sport peaks young; the rest keeps improving.
 *
 *   Its day          Taken up only in its years (cycling from the safety bicycle, coding from the
 *                    home computer) and where it's played (cricket, baseball). The events are
 *                    those of the time: a wager race in 1830, a parkrun in 2010.
 *   Clubs            Sport and games of the mind need a club past the friendly level; the club
 *                    costs a yearly sub, speeds you up, and may make you captain or chair.
 *   Governing bodies Who runs it here and then (the FA from 1863, FIDE from 1924).
 *   Women            Before a sport admitted women, a woman plays among friends only; the FA's
 *                    ban on women's football (1921–71) holds in its countries.
 *   Amateurs         Before the open era a winner takes a cup, not prize money.
 *   Honours          County colours, a cap, the Olympic team in an Olympic year (and a medal
 *                    if you're good enough), the grandmaster title.
 *   Going pro        At the top someone offers to make it your job, once the profession exists.
 *
 * state.hobbies = { [id]: { skill, since, practised, wins, best, earned, club, honours } }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, addHonor } from '../../core/State.js';
import { priceLevel } from '../world/Countries.js';
import { yearNow, eraWorkBlock } from '../world/Eras.js';
import { getProfession } from '../career/JobTrees.js';
import { createEmployer } from '../career/Employers.js';
import { hire } from '../career/CareerEngine.js';
import { PURSUITS, tierIndex, tierName, pursuitBlock, womenCap, eventsFor, bodyFor, olympicYear, needsClub, amateurDays } from './pursuits/registry.js';

export const HOBBIES = PURSUITS;
export const MAX_HOBBIES = 3;
/** The career an elite pursuit can become, and the rung you'd start on. */
export const PRO_PATHS = Object.fromEntries(Object.entries(PURSUITS).filter(([, d]) => d.pro).map(([id, d]) => [id, d.pro.slice(0, 2)]));

export const TIERS = [
  { min: 0, label: 'Beginner' }, { min: 20, label: 'Amateur' }, { min: 40, label: 'Club' },
  { min: 60, label: 'Competitive' }, { min: 75, label: 'Semi-pro' }, { min: 90, label: 'Elite' },
];
/** The tier (named for the pursuit when you pass its id). */
export const tierOf = (skill, id) => ({ ...TIERS[tierIndex(skill)], label: id ? tierName(HOBBIES[id], skill) : TIERS[tierIndex(skill)].label });

/** What you can enter at each level, by kind, when a pursuit names none of its own. */
const EVENTS = {
  music: ['an open-mic night', 'a battle of the bands', 'a regional music festival slot', 'a support slot for a touring act', 'a headline set at a national festival'],
  art: ['the village show', 'a café exhibition', 'a juried regional exhibition', 'a gallery\'s group show', 'a solo show in the capital'],
  craft: ['the village show', 'a craft fair', 'the county show', 'a national exhibition', 'a commission of note'],
  mind: ['the club ladder', 'a weekend open', 'the regional championship', 'the national championship', 'an international open'],
  sport: ['a local fun run or kickabout league', 'a club fixture', 'the county championship', 'the national championship', 'an international meet'],
};
const TOWNS = ['Riverside', 'Northfield', 'Westbury', 'Ashford', 'Kingsbridge', 'Millbrook', 'Elmwood', 'Harbourside', 'Oakley', 'Fairview', 'Hillcrest', 'Southgate'];

const local = (state, n) => Math.round(n * priceLevel(state));
const mine = (state) => (state.hobbies ??= {});
export const hobbiesOf = (state) => state.hobbies ?? {};
const town = (state) => TOWNS[((state.world?.seed ?? 7) >>> 0) % TOWNS.length];

/** Pursuits you could take up here, this year, at your age. */
export const pursuitsOpen = (state) => Object.entries(HOBBIES).filter(([id, d]) => !hobbiesOf(state)[id] && state.character.age >= d.minAge && !pursuitBlock(state, d)).map(([id]) => id);
export const governingBody = (state, id) => bodyFor(state, HOBBIES[id]);

/** Sport peaks young: past 32 the body sets a ceiling that falls every year. */
const ceiling = (state, h) => (HOBBIES[h].kind === 'sport' ? clamp(100 - Math.max(0, state.character.age - 32) * 2.5, 30, 100) : 100);

/** The biggest event you may enter: your level, your club, and what your day allowed women. */
export function competeTier(state, id) {
  const def = HOBBIES[id];
  const h = hobbiesOf(state)[id];
  if (!h || h.skill < 20) return -1;
  let tier = Math.min(4, Math.floor((h.skill - 20) / 15));
  if (needsClub(def) && !h.club) tier = Math.min(tier, 1);
  return Math.min(tier, womenCap(state, def));
}

function honoursYear(ctx, id, h) {
  const { state, rng } = ctx;
  const def = HOBBIES[id];
  const y = yearNow(state);
  let picked = false;
  for (const hon of def.honours ?? []) {
    if (picked && !hon.olympic) continue;
    const key = hon.olympic ? `${hon.id}.${y}` : hon.id;
    if ((h.honours ??= []).some((x) => x.key === key) || h.skill < hon.skill) continue;
    if (hon.from && y < hon.from) continue;
    if (hon.until && y >= hon.until) continue;
    if (state.character.gender === 'female' && (hon.women && y < hon.women || womenCap(state, def) < 4)) continue;
    if (hon.olympic && !(hon.winter ? (y <= 1992 ? olympicYear(y) && y >= 1924 : y % 4 === 2) : olympicYear(y))) continue;
    if (!amateurDays(state, def) && hon.olympic && state.career.job?.professionId === 'athletics') continue; // pros go with the national team (career/Sport.js)
    if (!rng.chance(hon.odds)) continue;
    h.honours.push({ key, label: hon.label, age: state.character.age, year: y });
    ctx.emit('fame:buzz', { amount: hon.olympic ? 4 : 1 });
    ctx.stat('happiness', 6);
    if (hon.olympic) {
      const roll = rng.float(0, 1) * (h.skill / 100);
      const place = roll > 0.85 ? 1 : roll > 0.78 ? 2 : roll > 0.7 ? 3 : 0;
      if (place) addHonor(state, { id: `hobby.olympic.${id}.${y}`, source: 'sport', name: `Olympic ${['', 'gold', 'silver', 'bronze'][place]} medal`, icon: ['', '🥇', '🥈', '🥉'][place], prestige: [0, 30, 20, 14][place], precedence: 12, citation: `${def.label}, ${y}.`, sport: true, year: y });
      ctx.log(`${hon.icon} You were picked for ${hon.label} in ${y}${place ? ` — and came home with ${['', 'gold', 'silver', 'bronze'][place]}!` : '.'}`, place ? ['', '🥇', '🥈', '🥉'][place] : hon.icon, 'milestone');
    } else {
      if (hon.honor) addHonor(state, { id: `hobby.${id}.${hon.id}`, source: 'sport', icon: hon.icon, prestige: 10, precedence: 13, citation: `${def.label}, ${y}.`, sport: true, year: y, ...hon.honor });
      ctx.log(`${hon.icon} ${def.label}: you ${hon.honor ? 'were awarded' : 'were picked for'} ${hon.label}.`, hon.icon, 'milestone');
    }
    if (hon.olympic) return;
    picked = true;
  }
}

export function hobbiesTick(ctx) {
  const { state, rng } = ctx;
  const list = mine(state);
  for (const [id, h] of Object.entries(list)) {
    const def = HOBBIES[id];
    if (!def) { delete list[id]; continue; }
    if (!h.practised) h.skill = Math.max(0, h.skill - rng.int(1, 3));
    h.practised = false;
    h.skill = Math.min(h.skill, ceiling(state, id));
    // The club: a yearly sub, and in time a turn as captain or chair.
    if (h.club) {
      if (!ctx.spend(local(state, def.club.fee), `${h.club.name}: subscription`)) { ctx.log(`You let your ${h.club.name} subscription lapse.`, def.icon, 'muted'); h.club = null; } else if (!h.club.role && h.skill >= 65 && state.character.age - h.club.since >= 4 && state.character.age >= 18 && rng.chance(0.15)) {
        h.club.role = def.kind === 'sport' ? 'captain' : 'chair';
        ctx.stat('happiness', 3);
        ctx.log(`${h.club.name} made you ${h.club.role}.`, def.icon, 'good');
      }
    }
    honoursYear(ctx, id, h);
    // Elite: someone offers to make it your job (once that is a job).
    const pro = def.pro;
    const prof = pro && getProfession(pro[0]);
    if (h.skill >= 88 && !h.proOffered && prof && yearNow(state) >= (pro[2] ?? 0) && !eraWorkBlock(state, prof) && state.character.age >= 16 && state.character.age <= (def.kind === 'sport' ? 32 : 60) && rng.chance(0.5)) {
      h.proOffered = state.character.age;
      ctx.prompt({ type: 'hobbies.pro', icon: '🌟', title: `Go Pro in ${def.label}?`, text: `${def.kind === 'sport' ? 'A club' : def.kind === 'music' ? (yearNow(state) < 1920 ? 'An impresario' : 'A label') : 'An agency'} has seen what you can do and offers you a place — as your job, not your hobby.${state.career.job ? ` You would leave ${state.career.job.title}.` : ''}`, data: { id }, options: [
        { id: 'go', label: '🌟 Take it', hint: 'Doing what you love; less security' },
        { id: 'stay', label: '🏡 Keep it a hobby' },
      ] });
    }
    if (h.skill >= 75 && def.kind !== 'sport' && rng.chance(def.kind === 'mind' || def.kind === 'craft' ? 0.35 : 0.6)) {
      const pay = local(state, rng.int(1500, 6000) * (h.skill >= 90 ? 4 : 1) * (def.kind === 'mind' ? 0.5 : 1));
      h.earned = (h.earned ?? 0) + pay;
      ctx.earn(pay, `${def.label}: ${def.kind === 'music' ? 'engagements' : id === 'writing' ? 'fees and royalties' : def.kind === 'mind' ? 'prize money and lessons' : 'commissions and sales'}`, { selfEmployed: true });
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
    const block = pursuitBlock(state, def);
    if (block) return ctx.toast(`${def.label}: ${block}`, 'warn');
    if (Object.keys(list).length >= MAX_HOBBIES) return ctx.toast(`Up to ${MAX_HOBBIES} hobbies — drop one first`, 'warn');
    list[id] = { skill: Math.round(clamp((state.stats[def.stat] ?? 50) / 10, 0, 12)), since: state.character.age, practised: false, wins: 0, best: null, earned: 0, club: null, honours: [] };
    ctx.log(`You took up ${def.label.toLowerCase()}.`, def.icon, 'info');
  },
  drop(ctx, id) {
    const list = mine(ctx.state);
    if (!list[id]) return;
    delete list[id];
    ctx.log(`You gave up ${HOBBIES[id].label.toLowerCase()}.`, HOBBIES[id].icon, 'muted');
  },
  /** Join (or leave) the local club. */
  club(ctx, id) {
    const { state, rng } = ctx;
    const def = HOBBIES[id];
    const h = mine(state)[id];
    if (!h || !def.club) return;
    if (h.club) { ctx.log(`You left ${h.club.name}.`, def.icon, 'muted'); h.club = null; return; }
    const fee = local(state, def.club.fee);
    if (!ctx.spend(fee, `${def.label}: club subscription`)) return ctx.toast(`The sub is $${fee.toLocaleString()} a year`, 'warn');
    const name = rng.pick(def.club.names).replace('{town}', town(state));
    h.club = { name, since: state.character.age, role: null };
    const body = bodyFor(state, def);
    ctx.log(`You joined ${name}${body && def.kind === 'sport' ? `, affiliated to ${body}` : ''}.`, def.icon, 'good');
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
    const gain = Math.max(1, Math.round((12 - h.skill / 10) * (0.5 + talent) * youth * (h.club ? 1.25 : 1) * rng.float(0.6, 1.2)));
    const before = tierName(def, h.skill);
    h.skill = Math.round(Math.min(ceiling(state, id), h.skill + gain));
    h.practised = true;
    ctx.stat(def.stat, def.kind === 'sport' ? rng.int(2, 4) : rng.int(0, 2));
    ctx.stat('stress', -rng.int(3, 7));
    ctx.stat('happiness', 2);
    if (def.risk && rng.chance(def.risk)) { ctx.stat('health', -rng.int(5, 15)); ctx.log(`You got hurt ${def.kind === 'sport' ? 'training' : ''} — weeks off.`.replace('  ', ' '), '🤕', 'bad'); }
    const after = tierName(def, h.skill);
    ctx.log(after !== before ? `${def.icon} ${def.label}: you're ${/^[AEIOU]/.test(after) ? 'an' : 'a'} ${after.toLowerCase()} now.` : `You practised ${def.label.toLowerCase()} all year (${h.skill}/100).`, def.icon, after !== before ? 'milestone' : 'info');
  },
  /** Enter the biggest event your level (and your day) allows. */
  compete(ctx, id) {
    const { state, rng } = ctx;
    const def = HOBBIES[id];
    const h = mine(state)[id];
    if (!h) return;
    if (h.skill < 20) return ctx.toast('Practise first: amateur level (20+) to enter anything', 'warn');
    if (yearlyCount(state, `hobby.compete.${id}`)) return ctx.toast('One event a year', 'warn');
    bumpYearly(state, `hobby.compete.${id}`);
    const level = Math.min(4, Math.floor((h.skill - 20) / 15));
    const tier = competeTier(state, id);
    const event = eventsFor(state, def, EVENTS[def.kind] ?? EVENTS.art)[tier];
    const why = tier < level ? (womenCap(state, def) < level ? ` Women aren't let into ${def.label.toLowerCase()} competitions${def.womenBan && yearNow(state) >= def.womenBan[0] ? ' — the governing body has banned it' : ' yet'}.` : needsClub(def) && !h.club ? ' Join a club to be entered for more.' : '') : '';
    const odds = clamp(0.25 + (h.skill - (20 + tier * 15)) / 40, 0.1, 0.7);
    if (!rng.chance(odds)) { ctx.stat('happiness', -2); return ctx.log(`You entered ${event}. ${rng.pick(['Not this year.', 'You were outclassed — and learned more than you would have winning.', 'Close. Next year.'])}${why}`, def.icon, 'info'); }
    h.wins += 1;
    h.best = tier >= (h.bestTier ?? -1) ? event : h.best;
    h.bestTier = Math.max(h.bestTier ?? -1, tier);
    const amateur = amateurDays(state, def);
    const prize = tier >= 2 && !amateur ? local(state, [0, 0, 500, 3000, 15000][tier] * rng.float(0.6, 1.4)) : 0;
    if (prize) ctx.earn(prize, `${def.label} prize money`);
    if (tier >= 3) ctx.emit('fame:buzz', { amount: tier === 4 ? 6 : 2 });
    ctx.stat('happiness', 4 + tier * 2);
    ctx.log(`${def.kind === 'music' || def.kind === 'art' || def.kind === 'craft' || id === 'writing' ? 'A triumph at' : 'You won at'} ${event}!${prize ? ` ($${prize.toLocaleString()})` : amateur && tier >= 2 ? ' A silver cup, and your name in the paper; amateurs take no money.' : ''}${why}`, '🏆', 'milestone');
  },
};

export const HobbyResolvers = {
  pro(ctx, data, optionId) {
    const { state, rng } = ctx;
    const def = HOBBIES[data.id];
    if (optionId !== 'go') return ctx.log(`You kept ${def.label.toLowerCase()} for yourself.`, def.icon, 'info');
    const [profId, levelId] = def.pro;
    const prof = getProfession(profId);
    const employer = createEmployer(rng, state, prof, state.character.regionId);
    if (state.career.job) ctx.emit('career:resign', { reason: `Went professional in ${def.label.toLowerCase()}` });
    const ok = hire(ctx, { professionId: profId, levelId: prof.levels.some((l) => l.id === levelId) ? levelId : prof.levels[0].id, employer });
    ctx.log(ok ? `You turned professional: ${def.label.toLowerCase()} is your job now.` : 'The offer fell through at the last minute.', '🌟', ok ? 'milestone' : 'warn');
  },
};

export const HobbiesModule = { id: 'hobbies', order: 5.5, onAgeUp: hobbiesTick, actions: HobbyActions, resolvers: HobbyResolvers };
