/**
 * Publish or perish.
 *
 *   Submitting  Pick a venue: a top general journal (Nature, Science, Cell —
 *               rarely accepted, cited enormously), a field journal, a
 *               peer-reviewed conference (fast), a monograph with a
 *               university press (the currency of the humanities, two years
 *               in the making), a preprint server (instant, unrefereed) or
 *               a predatory journal (accepts anything for a fee; committees
 *               notice). Reviews take a year; rejections can be resubmitted.
 *   Pressure    Every year your output over the last three years is held up
 *               against what your job expects: research universities and
 *               labs want a steady stream; teaching colleges much less.
 *               Fall short and raises stop; keep falling short and contract
 *               researchers aren't renewed, while tenured faculty face post-
 *               tenure review and heavier teaching.
 *   Service     Peer-review requests, editorial boards and — for the most
 *               cited — the editor's chair.
 *
 * state.science gains: pipeline [{ venue, quality, dueAge, title }], snapshots { age: papers },
 *   topPapers, books, predatory, reviews, editorial, lowReviews
 */
import { clamp } from '../../core/Random.js';
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { leaveJob } from '../career/CareerEngine.js';
import { ACADEMIC_JOBS } from './Academia.js';

const HUMANITIES = ['history', 'english', 'arts', 'languages', 'religiousStudies', 'liberalArts', 'politicalScience', 'communications'];

export const VENUES = {
  top: { name: 'Nature / Science / Cell', icon: '🌟', base: 0.06, bar: 85, years: 1, credit: 2, cites: [80, 300], desc: 'The top general journals. Rarely accepted; career-making when they are.' },
  field: { name: 'A leading field journal', icon: '📘', base: 0.42, bar: 70, years: 1, credit: 1, cites: [10, 40], desc: 'Where most careers are built.' },
  conference: { name: 'A peer-reviewed conference', icon: '🎤', base: 0.28, bar: 72, years: 0, credit: 1, cites: [8, 50], desc: 'Fast and competitive — the main venue in computer science.' },
  book: { name: 'A monograph (university press)', icon: '📖', base: 0.55, bar: 70, years: 2, credit: 3, cites: [15, 60], book: true, desc: 'Two years of writing; the tenure book in the humanities.' },
  preprint: { name: 'A preprint server', icon: '📄', base: 1, bar: 0, years: 0, credit: 0.25, cites: [1, 8], desc: 'Instant and unrefereed: visibility, not credit.' },
  predatory: { name: 'An open-access journal that emailed you', icon: '🎣', base: 1, bar: 0, years: 0, credit: 0, cites: [0, 1], fee: 1800, predatory: true, desc: 'Accepts anything for a fee. Tenure committees look these up.' },
};

const sci = (state) => state.science;
const isHumanist = (state) => HUMANITIES.includes(state.education.degrees.find((d) => d.programId === 'phd')?.major);

/** How many submissions a year your job leaves time for. */
export function writingCapacity(state) {
  const job = state.career.job;
  if (state.academia?.phd) return 2;
  if (!job) return state.career.emeritus?.research ? 1 : 0;
  if (job.professionId === 'medical') return state.medicine?.practice === 'academic' ? 2 : 0;
  if (!ACADEMIC_JOBS.includes(job.professionId)) return 0;
  if (job.professionId === 'communityCollege') return 1;
  if (job.professionId === 'college' && job.employer.size === 'small') return 1;
  return (job.levelId === 'adjunct' || job.levelId === 'lecturer' ? 1 : 3) + (state.lab?.buyout ? 1 : 0);
}

/** Papers your job expects over three years (0 = no expectation). */
export function expectation(state) {
  const job = state.career.job;
  if (!job) return 0;
  if (job.professionId === 'medical') return state.medicine?.practice === 'academic' ? 3 : 0;
  if (!ACADEMIC_JOBS.includes(job.professionId) || ['adjunct', 'lecturer', 'instructor'].includes(job.levelId) || job.professionId === 'communityCollege') return 0;
  if (job.professionId === 'college') return { small: 2, medium: 4, large: 6 }[job.employer.size] ?? 4;
  return job.levelId === 'postdoc' ? 4 : 6;
}

/** Papers in the last three years. */
export function recentOutput(state) {
  const s = sci(state);
  const age = state.character.age;
  const base = s.snapshots?.[age - 3] ?? s.snapshots?.[Math.min(...Object.keys(s.snapshots ?? {}).map(Number).filter((a) => a >= age - 3), age)] ?? s.papers;
  return Math.max(0, s.papers - base);
}

export function acceptOdds(state, venueId) {
  const v = VENUES[venueId];
  if (v.base >= 1) return 1;
  const s = sci(state);
  const quality = state.stats.smarts + Math.min(10, (s.hIndex ?? 0) / 3) + (s.grant ? 4 : 0) + (state.academia?.phd?.advisor?.fame ?? 0) / 20;
  return clamp(v.base + (quality - v.bar) / 120, 0.02, venueId === 'top' ? 0.35 : 0.85);
}

export function submitEligibility(state, venueId) {
  const v = VENUES[venueId];
  if (!v) return { ok: false, reason: 'Unknown venue' };
  const cap = writingCapacity(state);
  if (!cap) return { ok: false, reason: 'Research jobs, Ph.D. students and academic physicians' };
  if (yearlyCount(state, 'publishing.submit') >= cap) return { ok: false, reason: `${cap} submission${cap > 1 ? 's' : ''} a year in your job` };
  if (v.book && (sci(state).pipeline ?? []).some((p) => VENUES[p.venue].book)) return { ok: false, reason: 'One book at a time' };
  return { ok: true };
}

export function submit(ctx, venueId) {
  const { state, rng } = ctx;
  const check = submitEligibility(state, venueId);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'publishing.submit');
  const v = VENUES[venueId];
  const s = sci(state);
  if (v.fee) ctx.spend(v.fee, 'Article processing charge', { allowDebt: true });
  ctx.stat('stress', v.book ? 6 : 3);
  const item = { venue: venueId, odds: acceptOdds(state, venueId), dueAge: state.character.age + v.years };
  if (v.years === 0) return decide(ctx, item);
  (s.pipeline ??= []).push(item);
  ctx.log(v.book ? 'You signed a book contract with a university press. Two years of writing ahead.' : `You submitted a manuscript to ${v.name.toLowerCase()}. Reviews take most of a year.`, v.icon);
}

function decide(ctx, item) {
  const { state, rng } = ctx;
  const v = VENUES[item.venue];
  const s = sci(state);
  if (!rng.chance(item.odds)) {
    ctx.log(rng.pick([`Rejected by ${v.name.toLowerCase()}. Reviewer 2 "was not convinced of the novelty."`, `Desk-rejected by ${v.name.toLowerCase()} in four days.`, `${v.name}: "revise and resubmit" — then rejected after revision.`]), '📭', 'warn');
    ctx.stat('happiness', -2);
    return false;
  }
  const credit = item.venue === 'book' && !isHumanist(state) ? 1 : v.credit;
  s.papers += Math.max(credit >= 1 ? Math.round(credit) : 0, 0);
  if (credit >= 1) s.firstAuthor = (s.firstAuthor ?? 0) + 1;
  s.citations = (s.citations ?? 0) + rng.int(...v.cites);
  if (item.venue === 'top') s.topPapers = (s.topPapers ?? 0) + 1;
  if (v.book) s.books = (s.books ?? 0) + 1;
  if (v.predatory) s.predatory = (s.predatory ?? 0) + 1;
  ctx.log(item.venue === 'top' ? `Accepted at ${v.name}! The press office called; so did your mother.` : v.book ? 'Your book came out. Twelve people bought it, and every one of them was on a hiring committee.' : v.predatory ? 'The journal "accepted" your paper within 48 hours. It cost you $1,800.' : item.venue === 'preprint' ? 'You posted a preprint. A few people tweeted it.' : `Accepted at ${v.name.toLowerCase()}.`, v.icon, item.venue === 'top' ? 'milestone' : v.predatory ? 'warn' : 'good');
  if (item.venue === 'top') ctx.stat('happiness', 10);
  return true;
}

/** Yearly: reviews come back, output is held to the job's expectations, and service requests arrive. */
function publishingTick(ctx) {
  const { state, rng } = ctx;
  const s = sci(state);
  const age = state.character.age;
  // Decisions.
  const due = (s.pipeline ?? []).filter((p) => p.dueAge <= age);
  s.pipeline = (s.pipeline ?? []).filter((p) => p.dueAge > age);
  for (const item of due) decide(ctx, item);
  // Output snapshots for the three-year window.
  s.snapshots ??= {};
  s.snapshots[age] = s.papers;
  for (const a of Object.keys(s.snapshots)) if (Number(a) < age - 4) delete s.snapshots[a];
  const job = state.career.job;
  if (!job?.paidThisYear) return;
  const expected = expectation(state);
  if (expected && job.yearsAtEmployer >= 3) {
    const out = recentOutput(state);
    if (out >= expected) {
      s.lowReviews = 0;
      job.performance = Math.min(100, job.performance + 3);
    } else if (out < expected / 2) {
      s.lowReviews = (s.lowReviews ?? 0) + 1;
      job.performance = Math.max(0, job.performance - 6);
      const tenured = job.tenured || job.abilities?.includes('tenure');
      if (tenured) {
        ctx.stat('stress', 6);
        ctx.log(`Post-tenure review: ${out} paper${out === 1 ? '' : 's'} in three years against an expectation of ${expected}. No raise, less lab space, and an extra course to teach.`, '📉', 'bad');
      } else if (s.lowReviews >= 2 && ['research', 'nationalLab'].includes(job.professionId)) {
        ctx.log(`Publish or perish: ${out} paper${out === 1 ? '' : 's'} in three years. Your contract was not renewed.`, '📉', 'bad');
        leaveJob(ctx, 'Contract not renewed (publication record)');
        s.lowReviews = 0;
        return;
      } else ctx.log(`Your annual review flagged your publication record: ${out} paper${out === 1 ? '' : 's'} in three years, against an expectation of ${expected}.`, '📉', 'warn');
    }
  }
  // Service to the field.
  if (s.papers >= 5 && writingCapacity(state) && rng.chance(0.35) && !state.prompts.some((p) => p.type === 'publishing.review')) {
    ctx.prompt({ type: 'publishing.review', icon: '🧐', title: 'Review Request', text: 'A journal editor asks you to review a manuscript in your area. Unpaid, uncredited and due in three weeks.', options: [{ id: 'accept', label: '🧐 Review it' }, { id: 'decline', label: '🙅 Decline politely' }] });
  }
  const h = s.hIndex ?? 0;
  if (!s.editorial && (s.reviews ?? 0) >= 8 && h >= 15 && rng.chance(0.2)) {
    s.editorial = 'board';
    addHonor(state, { id: 'publishing.board', source: 'civil', name: 'Editorial board member', icon: '📚', prestige: 4, precedence: 50, citation: 'Invited onto the editorial board of a leading journal in your field.' });
    ctx.log('A leading journal invited you onto its editorial board.', '📚', 'good');
  } else if (s.editorial === 'board' && h >= 30 && rng.chance(0.08) && !state.prompts.some((p) => p.type === 'publishing.editor')) {
    ctx.prompt({ type: 'publishing.editor', icon: '🖋️', title: 'Editor-in-Chief?', text: 'The society that publishes your field\'s flagship journal asks you to be its editor-in-chief: five years of deciding other people\'s careers.', options: [{ id: 'accept', label: '🖋️ Accept', hint: 'Prestige; a lot of work' }, { id: 'decline', label: '🙅 Decline' }] });
  }
}

export const PublishingModule = {
  id: 'publishing',
  order: 31.4,
  init(state) {
    state.science ??= { grant: null, papers: 0, unfunded: 0, scooped: 0 };
    const s = state.science;
    s.pipeline ??= [];
    s.snapshots ??= {};
  },
  onAgeUp(ctx) {
    if (ctx.state.legal.incarceration) return;
    publishingTick(ctx);
  },
  actions: {
    submit: (ctx, venueId) => submit(ctx, venueId),
  },
  resolvers: {
    review(ctx, _data, optionId) {
      const s = sci(ctx.state);
      if (optionId !== 'accept') return ctx.log('You declined the review request. Someone else will be Reviewer 2.', '🙅');
      s.reviews = (s.reviews ?? 0) + 1;
      ctx.stat('stress', 2);
      ctx.log(ctx.rng.pick(['You wrote a careful, constructive review. Nobody will ever know it was you.', 'You recommended major revisions. You tried not to be Reviewer 2.']), '🧐');
    },
    editor(ctx, _data, optionId) {
      const { state } = ctx;
      if (optionId !== 'accept') return ctx.log('You declined the editorship.', '🙅');
      state.science.editorial = 'chief';
      ctx.stat('stress', 6);
      addHonor(state, { id: 'publishing.editor', source: 'civil', name: 'Editor-in-chief', icon: '🖋️', prestige: 12, precedence: 40, citation: 'Editor-in-chief of your field\'s flagship journal.' });
      ctx.log('You became editor-in-chief of your field\'s flagship journal.', '🖋️', 'honor');
    },
  },
};
