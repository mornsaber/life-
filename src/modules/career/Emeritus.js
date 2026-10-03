/**
 * Emeritus status for retired faculty. A tenured professor (or an academic
 * administrator) who retires in good standing after 10+ years at the
 * university keeps their title with "Emeritus/Emerita": an office, library
 * access, the option to teach a course or keep publishing, and a little
 * prestige. A felony conviction revokes it.
 *
 * state.career.emeritus = { title, employer, sinceAge, teaching, research, publications } | null
 */
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';

/** Ranks that can be named emeritus, and the honor's prestige. */
export const EMERITUS_RANKS = {
  associate: { title: 'Associate Professor', prestige: 3 },
  professor: { title: 'Professor', prestige: 5 },
  distinguished: { title: 'Distinguished Professor', prestige: 8 },
  chair: { title: 'Professor', prestige: 5 },
  dean: { title: 'Dean', prestige: 7 },
  provost: { title: 'Provost', prestige: 8 },
  president: { title: 'University President', prestige: 10 },
};
export const MIN_YEARS = 10;
export const COURSE_STIPEND = 9000;

const suffix = (state) => (state.character.gender === 'female' ? 'Emerita' : 'Emeritus');

/** Would retiring from this job today make you emeritus? */
export function emeritusEligibility(state, job = state.career.job) {
  if (!job || job.professionId !== 'university') return { ok: false, reason: 'University faculty only' };
  if (!EMERITUS_RANKS[job.levelId]) return { ok: false, reason: 'Associate Professor or higher' };
  if (job.yearsAtEmployer < MIN_YEARS) return { ok: false, reason: `${MIN_YEARS} years at the university (${job.yearsAtEmployer} so far)` };
  return { ok: true, title: `${EMERITUS_RANKS[job.levelId].title} ${suffix(state)}` };
}

function confer(ctx, job) {
  const { state } = ctx;
  const check = emeritusEligibility(state, job);
  if (!check.ok) return;
  const rank = EMERITUS_RANKS[job.levelId];
  state.career.emeritus = { title: check.title, employer: job.employer.name, sinceAge: state.character.age, teaching: false, research: false, publications: 0 };
  addHonor(state, { id: 'university.emeritus', source: 'civil', name: check.title, icon: '🎓', ribbon: ['#7a0019', '#ffcc33', '#7a0019'], prestige: rank.prestige, precedence: 35, citation: `Conferred by ${job.employer.name} on retirement after ${job.yearsAtEmployer} years.` });
  ctx.log(`${job.employer.name} named you ${check.title}. You keep an office, your library card and your place on the faculty roster.`, '🎓', 'honor');
  ctx.stat('happiness', 6);
}

export const Emeritus = {
  id: 'emeritus',
  order: 31.5,

  setup(engine) {
    // Retirement (not resignation or firing) from a qualifying post confers the title.
    engine.bus.on('career:separated', ({ ctx, job, reason }) => {
      if (reason === 'Retired' && !ctx.state.career.emeritus) confer(ctx, job);
    });
    engine.bus.on('legal:convicted', ({ ctx, severity }) => {
      const e = ctx.state.career.emeritus;
      if (!e || severity !== 'felony') return;
      ctx.state.career.emeritus = null;
      ctx.state.honors = ctx.state.honors.filter((h) => h.id !== 'university.emeritus');
      ctx.log(`${e.employer} revoked your emeritus title after your conviction.`, '🎓', 'bad');
    });
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const e = state.career.emeritus;
    if (!e || state.legal.incarceration) return;
    ctx.stat('happiness', 1);
    if (e.teaching) {
      ctx.earn(COURSE_STIPEND, `Course stipend — ${e.employer}`, { wage: true });
      ctx.stat('smarts', 1);
    }
    if (e.research) {
      ctx.stat('smarts', 1);
      if (rng.chance(0.3)) {
        e.publications += 1;
        ctx.log(rng.pick([
          'Your paper came out in a top journal — your first as an emeritus.',
          'A former student cited your 30-year-old work in a breakthrough. You were quietly delighted.',
          'You finally finished the book you put off for a decade.',
        ]), '📚', 'good');
      }
    }
  },

  actions: {
    teach(ctx) {
      const e = ctx.state.career.emeritus;
      if (!e) return;
      e.teaching = !e.teaching;
      ctx.log(e.teaching ? `You agreed to teach a seminar each year at ${e.employer} ($${COURSE_STIPEND.toLocaleString()} stipend).` : 'You stopped teaching.', '🧑‍🏫');
    },
    research(ctx) {
      const e = ctx.state.career.emeritus;
      if (!e) return;
      e.research = !e.research;
      ctx.log(e.research ? 'You kept your lab bench and your research going.' : 'You closed out your research for good.', '🔬');
    },
    lecture(ctx) {
      const { state } = ctx;
      const e = state.career.emeritus;
      if (!e) return;
      if (yearlyCount(state, 'emeritus.lecture')) return ctx.toast('One guest lecture a year.', 'warn');
      bumpYearly(state, 'emeritus.lecture');
      ctx.stat('happiness', 3);
      ctx.log('You gave a guest lecture to a packed hall. Three students stayed afterward to ask about your early work.', '🎤', 'good');
    },
  },
};
