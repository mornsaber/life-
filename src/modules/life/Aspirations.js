/**
 * Aspirations: what you want from life, chosen as you go. At 16 (and whenever you have room
 * for another) the game offers three that suit the life you're living; you keep up to two at a
 * time. Each has a progress bar on the Life tab. Fulfilling one is a milestone — a lift in
 * happiness, a line in your obituary and points in the Hall of Fame.
 *
 * state.aspirations = { active: [{ id, since }], done: [{ id, age }], offeredAge }
 */
import { netWorth } from '../../core/State.js';
import { Random } from '../../core/Random.js';
import { priceLevel } from '../world/Countries.js';

const people = (s) => s.people?.list ?? [];
const jobs = (s) => [...(s.career?.history ?? []), s.career?.job].filter(Boolean);
const peakGrade = (s) => jobs(s).reduce((m, j) => Math.max(m, j.peakGrade ?? j.grade ?? 0), 0);
const serviceYears = (s) => [...(s.military?.history ?? []), s.military?.service].filter(Boolean).reduce((n, x) => n + (x.yearsOfService ?? 0), 0)
  + [...(s.emergency?.history ?? []), ...['fire', 'police', 'sar'].map((k) => s.emergency?.[k])].filter(Boolean).reduce((n, x) => n + (x.years ?? 0), 0);
const frac = (v, goal) => Math.max(0, Math.min(1, v / goal));
const DEGREES = ['bachelor', 'master', 'doctorate', 'professional'];

/** Each: progress(state) 0–1; fits(state) — worth offering to this life; minAge for offering. */
export const ASPIRATIONS = {
  wealth: { name: 'Get Rich', icon: '💰', desc: 'Reach a net worth of $1,000,000.', progress: (s) => frac(netWorth(s), 1_000_000 * priceLevel(s)), fits: () => true },
  family: { name: 'Raise a Family', icon: '👨‍👩‍👧', desc: 'Marry and raise two children.', progress: (s) => (people(s).some((p) => p.relation === 'spouse') || (s.people?.marriages ?? 0) > 0 ? 0.34 : 0) + Math.min(2, people(s).filter((p) => p.relation === 'child').length) * 0.33, fits: (s) => s.character.age < 45 },
  topJob: { name: 'Reach the Top', icon: '🏔️', desc: 'Reach grade 8 or higher in your career.', progress: (s) => frac(peakGrade(s), 8), fits: (s) => s.character.age < 50 },
  ownHome: { name: 'A Home of Your Own', icon: '🏡', desc: 'Own the home you live in outright, mortgage paid off.', progress: (s) => { const h = (s.housing?.properties ?? []).find((p) => p.use === 'primary'); return !h ? 0 : h.mortgage?.balance ? 0.5 + 0.5 * (1 - h.mortgage.balance / Math.max(1, h.purchasePrice ?? h.value)) : 1; }, fits: () => true },
  educated: { name: 'Get a Degree', icon: '🎓', desc: 'Earn a university degree.', progress: (s) => ((s.education?.degrees ?? []).some((d) => DEGREES.includes(d.type)) ? 1 : s.education?.enrolled ? 0.5 : 0), fits: (s) => s.character.age < 40 },
  famous: { name: 'Be Famous', icon: '⭐', desc: 'Become a household name (fame 50+).', progress: (s) => frac(s.fame?.peak ?? s.fame?.score ?? 0, 50), fits: (s) => s.character.age < 50 },
  serve: { name: 'Serve Your Country', icon: '🎖️', desc: 'Give ten years to the military or the emergency services.', progress: (s) => frac(serviceYears(s), 10), fits: (s) => s.character.age < 40 },
  master: { name: 'Master a Craft', icon: '🛠️', desc: 'Become an expert (90) in any skill.', progress: (s) => frac(Math.max(0, ...Object.values(s.skills ?? {})), 90), fits: () => true },
  fit: { name: 'Fit at Fifty', icon: '💪', desc: 'Reach 50 with fitness of 80 or more.', progress: (s) => Math.min(frac(s.character.age, 50), frac(s.stats.fitness ?? 0, 80)), fits: (s) => s.character.age < 45 },
  longLife: { name: 'A Long Life', icon: '🌳', desc: 'Live to 85.', progress: (s) => frac(s.character.age, 85), fits: (s) => s.character.age >= 40 },
  business: { name: 'Be Your Own Boss', icon: '🏪', desc: 'Run a business with ten or more staff.', progress: (s) => (s.business?.current ? 0.3 + 0.7 * frac(s.business.current.staff?.headcount ?? 0, 10) : 0), fits: (s) => s.character.age < 60 },
  abroad: { name: 'See the World', icon: '🌍', desc: 'Live in another country.', progress: (s) => (s.migration?.history ?? []).length > 0 ? 1 : 0, fits: (s) => s.character.age < 60 },
  office: { name: 'Hold Public Office', icon: '🗳️', desc: 'Win an elected office.', progress: (s) => (s.politics?.office || (s.politics?.history ?? []).length ? 1 : 0), fits: (s) => s.character.age < 65 },
  friends: { name: 'Good Friends', icon: '🫂', desc: 'Have four close friends at once.', progress: (s) => frac(people(s).filter((p) => p.alive && p.relation === 'friend' && (p.relationship ?? 0) >= 70).length, 4), fits: () => true },
};

/** The tab where you'd work on each. */
export const WORK_ON = { wealth: 'money', family: 'people', topJob: 'career', ownHome: 'home', educated: 'school', famous: 'activities', serve: 'military', master: 'activities', fit: 'health', longLife: 'health', business: 'business', abroad: 'move', office: 'politics', friends: 'people' };

const MAX_ACTIVE = 2;
const OFFER_AGE = 16;
export const aspirationsOf = (state) => state.aspirations ?? { active: [], done: [], offeredAge: null };
export const progressOf = (state, id) => Math.round((ASPIRATIONS[id]?.progress(state) ?? 0) * 100);
const ensure = (state) => (state.aspirations ??= { active: [], done: [], offeredAge: null });

/** Three that suit this life, not already held or done. Seeded by the life and age, so a reload offers the same three. */
export function offers(state) {
  const a = aspirationsOf(state);
  const taken = new Set([...a.active.map((x) => x.id), ...a.done.map((x) => x.id)]);
  const pool = Object.keys(ASPIRATIONS).filter((id) => !taken.has(id) && ASPIRATIONS[id].fits(state) && ASPIRATIONS[id].progress(state) < 1);
  const rng = new Random(((state.world?.seed ?? 1) * 92821 + state.character.age * 389 + 0xa5) >>> 0);
  return rng.shuffle([...pool]).slice(0, 3);
}

function offer(ctx) {
  const { state } = ctx;
  const a = ensure(state);
  const choices = offers(state);
  if (!choices.length) return;
  a.offeredAge = state.character.age;
  ctx.prompt({
    type: 'aspirations.choose', icon: '🌠', title: a.done.length ? 'What Next?' : 'What Do You Want from Life?',
    text: a.done.length ? 'You got what you were after. What will you work toward now?' : 'You\'re old enough to start deciding what kind of life you want. Pick something to aim for — you can have two at a time.',
    options: [...choices.map((id) => ({ id, label: `${ASPIRATIONS[id].icon} ${ASPIRATIONS[id].name}`, hint: ASPIRATIONS[id].desc })), { id: 'none', label: '🤷 Figure it out later' }],
  });
}

export const AspirationsModule = {
  id: 'aspirations',
  order: 98,

  init(state) {
    if (state.aspirations) state.aspirations.active = state.aspirations.active.filter((x) => ASPIRATIONS[x.id]);
  },

  onYearEnd(ctx) {
    const { state } = ctx;
    if (!state.character.alive || state.character.age < OFFER_AGE) return;
    const a = ensure(state);
    // Fulfilled?
    for (const x of [...a.active]) {
      if (ASPIRATIONS[x.id].progress(state) < 1) continue;
      a.active = a.active.filter((y) => y !== x);
      a.done.push({ id: x.id, age: state.character.age });
      ctx.stat('happiness', 12);
      ctx.log(`Aspiration fulfilled: ${ASPIRATIONS[x.id].name}. ${ASPIRATIONS[x.id].desc.replace(/\.$/, '')} — you did it.`, ASPIRATIONS[x.id].icon, 'milestone');
    }
    // Room for another: at 16, then after a fulfilment or every five years.
    const due = a.offeredAge == null || a.done.some((d) => d.age === state.character.age) || state.character.age - a.offeredAge >= 5;
    if (a.active.length < MAX_ACTIVE && due && !state.prompts.some((p) => p.type === 'aspirations.choose') && !state.legal?.incarceration) offer(ctx);
  },

  actions: {
    /** Drop an aspiration (no penalty; you can pick another when offered). arg: id */
    drop(ctx, id) {
      const a = ensure(ctx.state);
      if (!a.active.some((x) => x.id === id)) return;
      a.active = a.active.filter((x) => x.id !== id);
      a.offeredAge = Math.min(a.offeredAge ?? ctx.state.character.age, ctx.state.character.age - 5);
      ctx.log(`You let go of ${ASPIRATIONS[id].name.toLowerCase()}. Some dreams change.`, '🍂', 'muted');
    },
  },

  resolvers: {
    choose(ctx, _data, optionId) {
      const a = ensure(ctx.state);
      if (!ASPIRATIONS[optionId] || a.active.length >= MAX_ACTIVE) return ctx.log('You\'ll work out what you want later.', '🤷', 'muted');
      a.active.push({ id: optionId, since: ctx.state.character.age });
      ctx.log(`You set your sights on something: ${ASPIRATIONS[optionId].name.toLowerCase()}.`, ASPIRATIONS[optionId].icon, 'info');
    },
  },
};

/** Hall of Fame points for fulfilled aspirations. */
export const aspirationPoints = (state) => (state.aspirations?.done ?? []).length * 40;
