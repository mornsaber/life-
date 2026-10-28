/**
 * After the uniform: senior veterans don't start again at the bottom. For six years after
 * leaving, recruiters come to retired officers and senior NCOs with jobs that use what they
 * did — and a veteran can work their network for offers.
 *
 *   Field-grade officers (O-4, O-5) and senior NCOs (E-8, E-9, W-4, W-5): operations
 *                 managers, security site managers, emergency management controllers,
 *                 contract instructors.
 *   Colonels (O-6): directors at defence contractors, distribution GMs, corporate security
 *                 directors, emergency management directors, assistant city managers.
 *   Generals and admirals (O-7+): vice presidents at defence firms, chief security officers,
 *                 city managers, professors of practice.
 *
 * Abroad, NATO ranks (OR-n, OF-n) map onto the same tiers.
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { getProfession } from '../career/JobTrees.js';
import { createEmployer } from '../career/Employers.js';
import { hire, applicationEligibility } from '../career/CareerEngine.js';
import { checkRequirements } from '../credentials/LicensingEngine.js';

const WINDOW = 6;
const HONORABLE = ['honorable', 'retired', 'medical'];

/** 'E-8' / 'O-6' / 'OF-5' / 'OR-9' → { kind, n } on the US scale. */
export function rankOf(code) {
  const m = /^(E|W|O|OR|OF)-(\d+)/.exec(code ?? '');
  if (!m) return null;
  if (m[1] === 'OR') return { kind: 'E', n: Number(m[2]) };
  if (m[1] === 'OF') return { kind: 'O', n: Number(m[2]) + 1 };
  return { kind: m[1], n: Number(m[2]) };
}

/** Which tier of second career your last service fits. */
export function tierOf(h) {
  const r = rankOf(h?.rankCode);
  if (!r) return null;
  if (r.kind === 'O' && r.n >= 7) return 'flag';
  if (r.kind === 'O' && r.n === 6) return 'senior';
  if ((r.kind === 'O' && r.n >= 4) || (r.kind === 'E' && r.n >= 8) || (r.kind === 'W' && r.n >= 4)) return 'field';
  return null;
}

const DEFENCE = ['Northfield Defense Systems', 'Aegis Mission Solutions', 'Sentinel Aerospace', 'Ironbridge Defence', 'Meridian Federal Group'];
const OFFERS = {
  field: [
    ['corporate', 'opsManager', 'Program Manager, Defense Programs', 'defence'],
    ['logistics', 'opsManager', null],
    ['privateSecurity', 'siteManager', null],
    ['emergencyManagement', 'controller', null],
    ['privateMilitary', 'trainer', null],
  ],
  senior: [
    ['corporate', 'director', 'Director, Defense Programs', 'defence'],
    ['logistics', 'dcGm', null],
    ['privateSecurity', 'director', null],
    ['emergencyManagement', 'director', null],
    ['municipalAdmin', 'acm', null],
  ],
  flag: [
    ['corporate', 'vp', 'Vice President, Defense & Government Programs', 'defence'],
    ['privateSecurity', 'cso', null],
    ['municipalAdmin', 'cityManager', null],
    ['university', 'professor', 'Professor of Practice', 'university'],
    ['logistics', 'vpSupply', null],
  ],
};
const SIZE_FOR = { medium: 'medium', large: 'large', enterprise: 'enterprise' };

/** The last honourable service, if it still counts as recent. */
function recentService(state) {
  const h = state.military.history.at(-1);
  if (!h || !HONORABLE.includes(h.discharge) || state.military.service) return null;
  if (state.character.age - h.endAge > WINDOW) return null;
  return h;
}

/** Offers that fit you now (not all may be open: education, the right to work, a better job already). */
export function secondCareerOffers(ctx) {
  const { state, rng } = ctx;
  const h = recentService(state);
  const tier = tierOf(h);
  if (!tier) return [];
  const job = state.career.job;
  const picks = rng.shuffle([...OFFERS[tier]]);
  const out = [];
  for (const [professionId, levelId, title, kind] of picks) {
    const p = getProfession(professionId);
    const level = p?.levels.find((l) => l.id === levelId);
    if (!p || !level) continue;
    if (!applicationEligibility(state, professionId).ok) continue;
    // Their degrees and licences still apply; years in the field are what the service stands in for.
    const { experience, workYears, ...rest } = level.req ?? {};
    if (!checkRequirements(state, rest).ok) continue;
    if (job && (job.grade ?? 0) >= level.grade) continue;
    out.push({ professionId, levelId, title: title ?? level.title, kind: kind ?? null, grade: level.grade, field: p.name });
    if (out.length >= 3) break;
  }
  return out;
}

function offerPrompt(ctx, offers, how) {
  const { state } = ctx;
  const h = state.military.history.at(-1);
  ctx.prompt({ type: 'secondCareer.offer', icon: '🎖️', title: 'After the Uniform', text: `${how} A ${h.rankTitle}'s record opens doors: these employers want someone who has led people and run things.`, options: [
    ...offers.map((o, i) => ({ id: String(i), label: `${o.title} — ${o.field}`, hint: o.kind === 'defence' ? 'A defence contractor' : o.kind === 'university' ? 'Teaching what you did' : '' })),
    { id: 'decline', label: '🙅 Not now' },
  ], data: { offers } });
}

export const SecondCareerModule = {
  id: 'secondCareer',
  order: 31.6,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (!state.character.alive || state.legal.incarceration || state.prompts.some((p) => p.type === 'secondCareer.offer')) return;
    const h = recentService(state);
    if (!tierOf(h) || !rng.chance(state.career.job ? 0.2 : 0.55)) return;
    const offers = secondCareerOffers(ctx);
    if (offers.length) offerPrompt(ctx, offers, 'A recruiter who places former officers called.');
  },
  actions: {
    /** Work your network for a senior civilian job. */
    network(ctx) {
      const { state } = ctx;
      if (!tierOf(recentService(state))) return ctx.toast('For senior veterans, within six years of leaving', 'warn');
      if (yearlyCount(state, 'secondCareer.network')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'secondCareer.network');
      const offers = secondCareerOffers(ctx);
      if (!offers.length) return ctx.log('Lunches with old comrades, but nothing better than what you have.', '☕', 'info');
      return offerPrompt(ctx, offers, 'You called old comrades now in industry and government.');
    },
  },
  resolvers: {
    offer(ctx, data, optionId) {
      const { state, rng } = ctx;
      const o = data.offers?.[Number(optionId)];
      if (!o) return ctx.log('You told the recruiter you\'d think about it.', '🎖️', 'info');
      const p = getProfession(o.professionId);
      const level = p.levels.find((l) => l.id === o.levelId);
      const employer = createEmployer(rng, state, p, state.character.regionId);
      if (level.minSize && ['small', 'medium', 'large', 'enterprise'].indexOf(employer.size) < ['small', 'medium', 'large', 'enterprise'].indexOf(level.minSize)) employer.size = SIZE_FOR[level.minSize];
      if (o.kind === 'defence') employer.name = rng.pick(DEFENCE);
      if (state.career.job) ctx.emit('career:resign', { reason: 'Left for a senior role after military service' });
      const job = hire(ctx, { professionId: o.professionId, levelId: o.levelId, employer, step: 3 });
      if (!job) return undefined;
      job.title = o.title;
      return ctx.log(`You started as ${o.title} at ${employer.name}. Your service was the résumé.`, '🎖️', 'milestone');
    },
  },
};
