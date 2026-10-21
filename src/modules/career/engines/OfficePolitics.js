/**
 * Office politics on the corporate track: a mentor who can sponsor you, a
 * rival who wants the same job, and the year-end calibration meeting where
 * your rating is decided in a room you're not in. Visibility counts as much
 * as the work. Reorgs reshuffle everything. Top ratings speed promotions;
 * two bottom ratings in a row and you're managed out.
 *
 *   corporate · technology · marketing · human resources · sales · data science · finance
 *
 * state.careerLife.office = { professionId, mentor: { name, title, bond }, rival: { name, threat }, visibility, ratings: [{ age, bucket }], bottoms }
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../../core/State.js';
import { lifeOf, peekLife, applyFx, skill, engineKey } from './Kit.js';

export const OFFICE_CAREERS = ['corporate', 'tech', 'marketing', 'humanResources', 'sales', 'dataScience', 'finance'];
export const BUCKETS = { top: { label: 'Exceeds — top 10%', icon: '🚀', perf: 8, bonus: 0.15 }, strong: { label: 'Strong performer', icon: '👍', perf: 3, bonus: 0.06 }, meets: { label: 'Meets expectations', icon: '➖', perf: 0, bonus: 0.02 }, bottom: { label: 'Needs improvement — bottom 10%', icon: '⚠️', perf: -8, bonus: 0 } };
const MENTOR_TITLES = ['Senior Vice President', 'Chief Operating Officer', 'Executive Vice President', 'Division President', 'Chief Financial Officer'];

const isOffice = (job) => OFFICE_CAREERS.includes(engineKey(job));
const person = (rng) => { const n = randomName(rng, rng.pick(['male', 'female'])); return `${n.firstName} ${n.lastName}`; };
const fresh = (rng) => ({ mentor: null, rival: { name: person(rng), threat: rng.int(30, 60) }, visibility: 40, ratings: [], bottoms: 0 });

export function officeView(state) {
  const job = state.career.job;
  if (!isOffice(job)) return null;
  const rec = peekLife(state, 'office');
  return { rec: rec?.professionId === job.professionId ? rec : null };
}

export const OfficePoliticsModule = {
  id: 'office',
  order: 31.55,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (!isOffice(job) || !job.paidThisYear || state.legal.incarceration) return;
    const rec = lifeOf(state, 'office', job.professionId, fresh(rng));
    // Calibration: the work, your sponsor, your visibility, and what your rival says about you.
    const sk = skill(state, { smarts: 2, looks: 1, happiness: 1 });
    const score = job.performance * 0.5 + sk * 0.2 + rec.visibility * 0.2 + (rec.mentor ? rec.mentor.bond * 0.15 : 0) - rec.rival.threat * 0.1 + rng.int(-10, 10);
    const bucket = score >= 62 ? 'top' : score >= 50 ? 'strong' : score >= 34 ? 'meets' : 'bottom';
    const b = BUCKETS[bucket];
    rec.ratings = [{ age: state.character.age, bucket }, ...rec.ratings].slice(0, 10);
    job.performance = Math.round(clamp(job.performance + b.perf, 0, 100));
    if (b.bonus) ctx.earn(Math.round(job.salary * b.bonus / 100) * 100, `Annual bonus (${b.label.split(' —')[0].toLowerCase()})`, { wage: true });
    ctx.log(`Calibration: ${b.label}.${bucket === 'top' && rec.mentor ? ` ${rec.mentor.name} fought for you in the room.` : ''}`, b.icon, bucket === 'bottom' ? 'warn' : bucket === 'top' ? 'good' : undefined);
    rec.bottoms = bucket === 'bottom' ? rec.bottoms + 1 : 0;
    if (rec.bottoms >= 2) {
      rec.bottoms = 0;
      applyFx(ctx, rec, { text: 'Two bottom ratings in a row: a performance-improvement plan, then a severance agreement. You were managed out.', fired: 'Managed out after two bottom ratings' }, '📦');
      return;
    }
    rec.visibility = Math.round(clamp(rec.visibility - 8, 0, 100));
    rec.rival.threat = Math.round(clamp(rec.rival.threat + rng.int(-4, 8), 0, 100));
    if (rec.mentor) rec.mentor.bond = Math.round(clamp(rec.mentor.bond - 3, 0, 100));
    // Mentors retire or leave; rivals get promoted away.
    if (rec.mentor && rng.chance(0.1)) { ctx.log(`Your mentor, ${rec.mentor.name}, left for a competitor. You'll need a new sponsor.`, '👋', 'warn'); rec.mentor = null; }
    if (rng.chance(0.12)) { ctx.log(`Your rival, ${rec.rival.name}, moved to another division.`, '🚚'); rec.rival = { name: person(rng), threat: rng.int(30, 60) }; }
    // Reorgs.
    if (rng.chance(0.25) && !state.prompts.some((p) => p.type === 'office.reorg')) {
      ctx.prompt({ type: 'office.reorg', icon: '🔀', title: 'The Reorg', text: `A new executive is restructuring the division. ${rec.rival.name} is already in their office every day.`, options: [{ id: 'align', label: '🤝 Get in early with the new boss' }, { id: 'head', label: '🙇 Keep your head down and deliver' }, { id: 'jump', label: '🚪 Ask your mentor for a move to another team', disabled: !rec.mentor }] });
    }
  },
  actions: {
    /** Network across the company: visibility, and a chance to find a mentor. */
    network(ctx) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!isOffice(job)) return;
      if (yearlyCount(state, 'office.network')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'office.network');
      const rec = lifeOf(state, 'office', job.professionId, fresh(rng));
      rec.visibility = Math.min(100, rec.visibility + 20);
      ctx.stat('stress', 2);
      if (!rec.mentor && rng.chance(0.35 + skill(state, { looks: 1, happiness: 1 }) / 250)) {
        rec.mentor = { name: person(rng), title: rng.pick(MENTOR_TITLES), bond: 50 };
        ctx.log(`${rec.mentor.name}, a ${rec.mentor.title.toLowerCase()}, offered to mentor you.`, '🧭', 'good');
      } else ctx.log('You volunteered for the cross-functional task force and presented to the leadership team.', '🎤');
      return undefined;
    },
    /** Spend time with your mentor. */
    mentor(ctx) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const rec = peekLife(state, 'office');
      if (!isOffice(job) || !rec?.mentor) return ctx.toast('You need a mentor first', 'warn');
      if (yearlyCount(state, 'office.mentor')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'office.mentor');
      rec.mentor.bond = Math.min(100, rec.mentor.bond + rng.int(12, 22));
      ctx.log(`Quarterly coffees with ${rec.mentor.name}. They're starting to say your name in rooms you're not in.`, '☕', 'good');
      return undefined;
    },
    /** Deal with the rival: make peace, or play dirty. arg: ally | undermine */
    rival(ctx, how) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const rec = peekLife(state, 'office');
      if (!isOffice(job) || !rec) return;
      if (yearlyCount(state, 'office.rival')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'office.rival');
      if (how === 'ally') {
        if (rng.chance(0.55)) { rec.rival.threat = Math.max(0, rec.rival.threat - 25); ctx.log(`You and ${rec.rival.name} agreed to split the big project. It worked.`, '🤝', 'good'); } else ctx.log(`${rec.rival.name} smiled, agreed, and took credit anyway.`, '😒', 'warn');
      } else if (how === 'undermine') {
        if (rng.chance(0.5)) { rec.rival.threat = Math.max(0, rec.rival.threat - 35); applyFx(ctx, rec, { text: `You made sure the VP heard about ${rec.rival.name}'s missed deadline. It stuck.`, stress: 3 }, '🗡️'); } else applyFx(ctx, rec, { text: 'It got back to them, and to HR. You look petty now.', perf: -6, stress: 5 }, '🗡️');
      }
      return undefined;
    },
  },
  resolvers: {
    reorg(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const rec = peekLife(state, 'office');
      const job = state.career.job;
      if (!rec || !job) return;
      if (optionId === 'align') {
        if (rng.chance(0.55)) { rec.visibility = Math.min(100, rec.visibility + 25); applyFx(ctx, rec, { text: 'The new boss liked your ideas. You landed on the right side of the reorg.', perf: 5 }, '🔀'); } else applyFx(ctx, rec, { text: `${rec.rival.name} got there first. Your team was folded into theirs.`, perf: -4, stress: 5 }, '🔀');
      } else if (optionId === 'jump' && rec.mentor) {
        rec.rival = { name: rec.rival.name, threat: 20 };
        applyFx(ctx, rec, { text: `${rec.mentor.name} pulled you onto a growing team. Fresh start.`, perf: 2, happiness: 3 }, '🚪');
      } else if (rng.chance(0.2)) applyFx(ctx, rec, { text: 'Your role was eliminated in the reorg.', fired: 'Position eliminated in a reorganization' }, '📦');
      else ctx.log('You kept your head down. The reorg passed over you.', '🙇');
    },
  },
};
