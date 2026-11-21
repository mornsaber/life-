/**
 * The shape of a working life around the jobs themselves:
 *
 *   Career breaks   time out for children, caring, study or your health, and the way back: skills
 *                   that rust, a lower start, returner schemes (from the 2010s). In the world wars
 *                   the women who'd left at marriage were called back to the works and the land,
 *                   and many were let go when the men came home.
 *   Freelance       a consultant, a locum, a jobbing tradesman, outwork at home: clients, a day
 *                   rate, dry spells, and your own tax.
 *   Leaving         a reference that follows you (good if you left well, poor if you were
 *                   sacked); a non-compete and gardening leave at the senior end (from the 1960s);
 *                   the blacklist for strikers before the unions were protected (Britain to 1906,
 *                   America to 1935).
 *
 * state.workLife = { breakFrom, breakReason, lastProfession, lastSalary, references: {id: 'good'|'poor'},
 *                    nonCompete: { professionId, until }, blacklist: { professionId, until },
 *                    freelance: { name, rate, since }, wartime }
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { getProfession } from './JobTrees.js';
import { hire, bestEntryLevel } from './CareerEngine.js';
import { createEmployer } from './Employers.js';
import { card, button, esc, money } from '../../ui/Components.js';
import { REGIONS } from '../life/Regions.js';

const cc = (state) => state.character.countryId ?? 'US';
const wl = (state) => (state.workLife ??= { references: {} });
const wrng = (state) => new Random((((state.world?.seed ?? 1) * 4241) ^ (state.character.age * 977 + 0x77d)) >>> 0);
const female = (state) => state.character.gender === 'female';
const atWar = (state) => {
  const w = state.world?.wars?.[cc(state)];
  return Boolean(w && w.phase !== 'ended' && (w.intensity ?? 0) >= 3);
};
const NO_BREAK = /retir|died|death|deceased|prison|incarcerat|active duty|enlist|moved to/i;

/** What a freelancer in this line was called, then. */
function freelanceName(state, professionId) {
  const y = yearNow(state);
  const id = professionId ?? '';
  if (/nurs|medic|physician|doctor|dent|pharm/.test(id)) return y >= 1950 ? 'locum' : 'visiting practitioner';
  if (/carpent|plumb|electric|trade|construct|mason|smith|weld|mechanic/.test(id)) return 'jobbing tradesman';
  if (/journal|writer|design|photo|music|act|art|media/.test(id)) return y >= 1950 ? 'freelance' : 'jobbing hand';
  if (/corporate|financ|account|consult|engineer|tech|market|manag|law|legal/.test(id)) return y >= 1950 ? 'consultant' : 'man of business';
  return y < 1950 ? 'outworker (piecework at home)' : 'contractor';
}

/** Can you go freelance now? */
export function freelanceCheck(state) {
  const w = wl(state);
  if (state.character.age < 21) return { ok: false, reason: 'From 21' };
  if (state.career.job) return { ok: false, reason: 'Leave your job first' };
  if (w.freelance) return { ok: false, reason: 'Already freelance' };
  const years = (state.career.history ?? []).reduce((s, h) => s + ((h.endAge ?? 0) - (h.startAge ?? 0)), 0);
  if (years < 4 && !w.lastProfession) return { ok: false, reason: 'Four years\' experience first' };
  return { ok: true };
}

/** Hiring odds from your last reference and any blacklist (career/InterviewSystem.js). */
export function referenceBonus(state, profession) {
  const w = state.workLife;
  if (!w) return 0;
  if (w.blacklist && w.blacklist.professionId === profession.id && state.character.age < w.blacklist.until) return -0.6;
  const last = (state.career.history ?? []).at(-1);
  const ref = last ? w.references?.[`${last.employerName}`] : null;
  return ref === 'good' ? 0.05 : ref === 'poor' ? -0.08 : 0;
}

export const WorkLifeModule = {
  id: 'workLife',
  order: 41.5,
  init(state) { state.workLife ??= { references: {} }; },
  setup(engine) {
    // Leaving a job: a reference, a non-compete, the blacklist; and the start of a break.
    engine.bus.on('career:separated', ({ ctx, job, reason }) => {
      const { state } = ctx;
      const w = wl(state);
      const y = yearNow(state);
      const r = String(reason ?? '');
      const fired = /fired|terminat|dismiss|sacked|misconduct|let go/i.test(r);
      w.references[job.employer?.name ?? '?'] = fired ? 'poor' : (job.performance ?? 55) >= 60 && (job.boss ?? 50) >= 50 ? 'good' : 'fair';
      w.lastProfession = job.professionId;
      w.lastSalary = job.salary;
      if (/strike|union/i.test(r) && y < (cc(state) === 'US' ? 1935 : cc(state) === 'GB' ? 1906 : 1920)) {
        w.blacklist = { professionId: job.professionId, until: state.character.age + 5 };
        ctx.log('Your name went round the masters\' association: no works in the district will take you on.', '📋', 'bad');
      }
      if (!fired && (job.grade ?? 0) >= 5 && job.sector === 'private' && y >= 1960 && REGIONS[state.character.regionId]?.state !== 'CA') {
        w.nonCompete = { professionId: job.professionId, until: state.character.age + 1 };
      }
      if (!NO_BREAK.test(r)) { w.breakFrom = state.character.age; w.breakReason ??= null; }
    });
    // Back at work: the years away, and any non-compete.
    engine.bus.on('career:hired', ({ ctx, job }) => {
      const { state } = ctx;
      const w = wl(state);
      const age = state.character.age;
      if (w.freelance) { ctx.log(`You gave up the ${w.freelance.name} work for a steady wage.`, '🧾', 'info'); w.freelance = null; }
      if (w.nonCompete && w.nonCompete.professionId === job.professionId && age <= w.nonCompete.until) {
        const lost = Math.round((job.salary ?? 0) * 0.25);
        if (lost > 0) ctx.spend(lost, 'Months of gardening leave under the non-compete', { allowDebt: true });
        ctx.log('Your old firm\'s lawyers held you to the non-compete: three months of gardening leave, unpaid, before you could start.', '⚖️', 'warn');
      }
      w.nonCompete = null;
      const gap = w.breakFrom != null ? age - w.breakFrom : 0;
      if (gap >= 2) {
        job.performance = Math.max(30, (job.performance ?? 55) - Math.min(15, gap * 2));
        const y = yearNow(state);
        const scheme = gap >= 3 && y >= 2012 && ['US', 'GB', 'AU', 'IE'].includes(cc(state)) && w.lastProfession === job.professionId;
        const why = { children: 'bringing up the children', caring: 'caring for family', study: 'studying', health: 'getting well', travel: 'travelling' }[w.breakReason] ?? 'away from work';
        ctx.log(scheme
          ? `A returner programme brought you back after ${gap} years ${why}: sixteen weeks of training, a mentor, and a team that expected you.`
          : `Back at work after ${gap} years ${why}. The work had moved on without you, and it took a year to catch up.`, '🔁', 'info');
        if (scheme) job.performance = Math.min(70, job.performance + 8);
      }
      w.breakFrom = null;
      w.breakReason = null;
    });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const w = wl(state);
    const age = state.character.age;
    const y = yearNow(state);
    const rng = wrng(state);
    if (!state.character.alive || state.legal?.incarceration) return;
    // Freelance work: clients, a day rate, dry spells.
    if (w.freelance && !state.career.job) {
      const phase = state.economy?.phase;
      const busy = Math.min(1, Math.max(0.15, rng.float(0.35, 1) * (phase === 'recession' ? 0.7 : 1)));
      const pay = Math.round(w.freelance.rate * busy);
      ctx.earn(pay, `${w.freelance.name[0].toUpperCase()}${w.freelance.name.slice(1)} work`, { selfEmployed: true });
      if (busy < 0.45) { ctx.log(`A thin year as a ${w.freelance.name}: weeks with no work, and every client paying late.`, '🧾', 'warn'); ctx.stat('stress', 4); }
      else if (busy > 0.9 && rng.chance(0.5)) ctx.log(`A good year as a ${w.freelance.name}: more work than you could take, and you raised your rates.`, '🧾', 'good');
      if (busy > 0.9) w.freelance.rate = Math.round(w.freelance.rate * 1.05);
    }
    // The world wars: women who'd left work called back to the works and the land.
    if (female(state) && !state.career.job && !w.freelance && age >= 18 && age <= 50 && atWar(state) && ((y >= 1915 && y <= 1918) || (y >= 1940 && y <= 1945)) && !w.wartime && rng.chance(0.6)) {
      w.wartime = { asked: age };
      ctx.prompt({
        type: 'workLife.wartime', icon: '🏭', title: 'The Country Needs You',
        text: y < 1920 ? 'The posters are on every wall: the munitions works and the farms need women, now that the men have gone.' : 'You\'ve been called for war work: the factories, the land army, the auxiliary services.',
        options: [
          { id: 'works', label: '🏭 The munitions works', hint: 'Good wages, yellow skin, long shifts' },
          { id: 'land', label: '🌾 Work on the land' },
          { id: 'no', label: '🏠 Stay at home' },
        ],
      });
    }
    // The war over: war workers let go to make room for the men.
    if (state.career.job?.wartime && (y === 1919 || y === 1946) && rng.chance(0.6)) {
      ctx.emit('career:resign', { reason: 'The men came home; the war work ended', fired: false });
      ctx.log('The war is over, and the works let the women go to make room for the men coming home.', '🏠', 'warn');
    }
  },
  actions: {
    /** Step away from work for a while. arg: children | caring | study | health | travel */
    breakTake(ctx, arg) {
      const { state } = ctx;
      if (!state.career.job) return ctx.toast('You aren\'t working.', 'warn');
      const reason = ['children', 'caring', 'study', 'health', 'travel'].includes(arg) ? arg : 'caring';
      const label = { children: 'bring up the children', caring: 'care for family', study: 'study', health: 'get well', travel: 'travel' }[reason];
      ctx.emit('career:resign', { reason: `A career break to ${label}` });
      const w = wl(state);
      w.breakFrom = state.character.age;
      w.breakReason = reason;
      ctx.log(`You stepped away from work to ${label}.`, '🌿', 'info');
      ctx.stat('stress', -10);
    },
    /** Set up as a freelancer in your last line of work. */
    freelance(ctx) {
      const { state } = ctx;
      const check = freelanceCheck(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const w = wl(state);
      const last = (state.career.history ?? []).at(-1);
      const professionId = w.lastProfession ?? last?.professionId;
      const base = w.lastSalary ?? last?.salary ?? 20000;
      w.freelance = { name: freelanceName(state, professionId), rate: Math.round(base * 0.9), since: state.character.age, professionId };
      w.breakFrom = null;
      ctx.log(`You set up as a ${w.freelance.name}: your own clients, your own hours, and your own tax.`, '🧾', 'good');
    },
    stopFreelance(ctx) {
      const w = wl(ctx.state);
      if (!w.freelance) return;
      ctx.log(`You stopped taking ${w.freelance.name} work.`, '🧾', 'info');
      w.freelance = null;
    },
  },
  resolvers: {
    wartime(ctx, _data, optionId) {
      const { state } = ctx;
      if (optionId === 'no') return ctx.log('You stayed home, and knitted, and queued.', '🧶', 'info');
      const professionId = optionId === 'works' ? 'manufacturing' : 'agriculture';
      const profession = getProfession(professionId);
      const level = profession && bestEntryLevel(state, profession, 'large');
      if (!level) return ctx.log('There was no place for you after all.', '🏠', 'info');
      const employer = createEmployer(ctx.rng, state, profession, state.character.regionId);
      const job = hire(ctx, { professionId, levelId: level.id, employer });
      if (job) {
        job.wartime = true;
        ctx.log(optionId === 'works' ? 'You signed on at the munitions works: overalls, a turban for your hair, and twelve-hour shifts.' : 'You joined the land girls: breeches, a jersey, and a farm that had lost its sons.', optionId === 'works' ? '🏭' : '🌾', 'good');
      }
    },
  },
};

/** The Career tab's card for breaks and freelance work. */
export function workLifeCard(state) {
  if (state.character.age < 18) return '';
  const w = state.workLife ?? {};
  const job = state.career.job;
  const lines = [];
  if (w.freelance) lines.push(`<p>🧾 You work as a <b>${esc(w.freelance.name)}</b>: about ${money(w.freelance.rate)} in a full year.</p>`);
  if (w.breakFrom != null && !job) lines.push(`<p>🌿 Out of work for ${state.character.age - w.breakFrom} year${state.character.age - w.breakFrom === 1 ? '' : 's'}. The longer away, the harder the way back.</p>`);
  if (w.blacklist && state.character.age < w.blacklist.until) lines.push('<p class="warn-text">📋 Blacklisted in your old trade after the strike.</p>');
  const buttons = job
    ? ['children', 'caring', 'study', 'health'].map((r) => button({ children: '👶 Break: children', caring: '🫶 Break: caring', study: '📚 Break: study', health: '🩺 Break: health' }[r], 'workLife.breakTake', { arg: r, variant: 'small' })).join('')
    : w.freelance ? button('🛑 Stop freelancing', 'workLife.stopFreelance', { variant: 'small' }) : button('🧾 Go freelance', 'workLife.freelance', { variant: 'small', disabled: !freelanceCheck(state).ok, hint: freelanceCheck(state).reason ?? '' });
  return card('Working Life', `${lines.join('')}<div class="row-end">${buttons}</div>`, { icon: '🧭' });
}
