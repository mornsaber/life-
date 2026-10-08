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
/** Other academic careers whose senior ranks can be named emeritus. */
export const EMERITUS_BY_PROFESSION = {
  university: EMERITUS_RANKS,
  college: { ...EMERITUS_RANKS, endowed: { title: 'Professor', prestige: 7 }, university: { title: 'University Professor', prestige: 9 } },
  communityCollege: { professor: { title: 'Professor', prestige: 3 }, chair: { title: 'Professor', prestige: 3 }, dean: { title: 'Dean', prestige: 4 }, president: { title: 'President', prestige: 6 } },
  research: { senior: { title: 'Senior Scientist', prestige: 3 }, fellow: { title: 'Distinguished Fellow', prestige: 6 }, pi: { title: 'Principal Investigator', prestige: 4 }, director: { title: 'Institute Director', prestige: 6 } },
  nationalLab: { senior: { title: 'Senior Scientist', prestige: 3 }, distinguished: { title: 'Distinguished Fellow', prestige: 7 }, group: { title: 'Senior Scientist', prestige: 4 }, division: { title: 'Division Director', prestige: 6 } },
};
export const MIN_YEARS = 10;
export const COURSE_STIPEND = 9000;

const suffix = (state) => (state.character.gender === 'female' ? 'Emerita' : 'Emeritus');

/** Would retiring from this job today make you emeritus? */
export function emeritusEligibility(state, job = state.career.job) {
  const ranks = job && EMERITUS_BY_PROFESSION[job.professionId];
  if (!ranks) return { ok: false, reason: 'University faculty and senior scientists only' };
  if (!ranks[job.levelId]) return { ok: false, reason: job.professionId === 'research' || job.professionId === 'nationalLab' ? 'Senior Scientist or higher' : 'Associate Professor or higher' };
  if (job.yearsAtEmployer < MIN_YEARS) return { ok: false, reason: `${MIN_YEARS} years at ${job.employer.name} (${job.yearsAtEmployer} so far)` };
  return { ok: true, title: `${ranks[job.levelId].title} ${suffix(state)}` };
}

function confer(ctx, job) {
  const { state } = ctx;
  const check = emeritusEligibility(state, job);
  if (!check.ok) return;
  const rank = EMERITUS_BY_PROFESSION[job.professionId][job.levelId];
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
