/**
 * Supervisory powers over named people.
 *
 * With a supervisory post you manage real coworkers, not just a headcount.
 * Your reports have their own performance and their own opinion of you.
 * Each year you can:
 *   commend      — recognition: they like you more, work a bit harder
 *   discipline   — a write-up: performance may rise, the relationship falls
 *   recommend    — put them up for promotion: if it goes through they move
 *                  up (and off your team); your judgment is on the line
 *   transfer     — approve their request to move to another unit
 *   terminate    — only with hiring authority; otherwise you can only ask
 *                  your own manager, who may say no. Firing a good worker
 *                  invites a grievance or a lawsuit.
 * Leave requests, shift bids, hiring finalists and underperformers arrive as
 * decisions through the management console (ManagementEngine) with names.
 *
 * Your team's average performance and morale feed the department's
 * productivity, which feeds your own rating.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { chainOfCommand, orgOf, sideRng, newPerson, personOf } from './Organizations.js';
import { seat } from './Vacancies.js';
import { rememberDeparture } from './Churn.js';

/** Supervisory actions per year (you have a day job too). */
export const SUPERVISION_PER_YEAR = 3;

export const canTerminate = (job) => Boolean(job?.abilities?.some((a) => ['hire', 'delegate', 'exec'].includes(a)));

/** Your named direct reports (existing people only — safe for views). */
export function reportsOf(state, job, generate = false) {
  if (!job?.department) return [];
  return chainOfCommand(state, job, { generate })?.reports ?? [];
}

const findReport = (state, job, personId) => reportsOf(state, job, true).find((p) => p.id === personId) ?? null;

function bump(dept, key, delta) {
  if (dept) dept[key] = Math.round(clamp((dept[key] ?? 50) + delta, 0, 100));
}

/** Take a person off your team (they leave their seat; a replacement fills it later). */
export function removeFromTeam(state, job, person, why = null) {
  const org = orgOf(state, job.employer);
  const dept = org?.departments[job.employer.deptId];
  if (!dept) return;
  const list = dept.seats[person.professionId]?.[person.levelId];
  if (list) dept.seats[person.professionId][person.levelId] = list.filter((id) => id !== person.id);
  if (why) rememberDeparture(state, org, person, why);
  delete org.people[person.id];
}

/** Seat a new hire on your team. */
export function hireOntoTeam(state, job, fields = {}) {
  const org = orgOf(state, job.employer);
  const report = reportsOf(state, job, true)[0];
  if (!org || !report) return null;
  const p = newPerson(sideRng(state), org, { years: 0, selection: 'hired', rel: 60, ...fields });
  seat(org, job.employer.deptId, report.professionId, report.levelId, p, report.title);
  return p;
}

/** The lowest-performing named report, for the underperformer decision. */
export const weakestReport = (state, job) => reportsOf(state, job, true).reduce((a, b) => (!a || b.performance < a.performance ? b : a), null);

/** Each year: your reports' performance drifts with how you treat them, and team results feed the department. */
export function teamTick(state, job) {
  const reports = reportsOf(state, job, true);
  if (!reports.length || !job.department) return 0;
  const rng = sideRng(state);
  for (const p of reports) {
    p.performance = Math.round(clamp(p.performance + (p.rel - 50) / 25 + rng.float(-4, 4), 15, 98));
    p.rel = Math.round(clamp(p.rel + (55 - p.rel) * 0.1, 0, 100));
  }
  const avg = reports.reduce((s, p) => s + p.performance, 0) / reports.length;
  const liking = reports.reduce((s, p) => s + p.rel, 0) / reports.length;
  bump(job.department, 'morale', (liking - 55) / 10);
  return (avg - 60) / 8;
}

function spend(ctx) {
  const { state } = ctx;
  if (yearlyCount(state, 'orgs.supervise') >= SUPERVISION_PER_YEAR) {
    ctx.toast(`You've spent your management time this year (${SUPERVISION_PER_YEAR} actions).`, 'warn');
    return false;
  }
  bumpYearly(state, 'orgs.supervise');
  return true;
}

export const SupervisionActions = {
  commend(ctx, personId) {
    const job = ctx.state.career.job;
    const p = findReport(ctx.state, job, personId);
    if (!p || !spend(ctx)) return;
    p.rel = Math.min(100, p.rel + 10);
    p.performance = Math.min(98, p.performance + 3);
    bump(job.department, 'morale', 2);
    ctx.log(`You formally commended ${p.name}. They noticed — and so did the team.`, '🏅', 'good');
  },

  discipline(ctx, personId) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const p = findReport(state, job, personId);
    if (!p || !spend(ctx)) return;
    p.discipline = (p.discipline ?? 0) + 1;
    p.rel = Math.max(0, p.rel - 14);
    const fair = p.performance < 55;
    if (fair && rng.chance(0.6)) p.performance = Math.min(98, p.performance + 8);
    bump(job.department, 'morale', fair ? -1 : -5);
    if (!fair) job.coworkers = Math.max(0, job.coworkers - 4);
    ctx.log(`You wrote up ${p.name} (${p.discipline} on file). ${fair ? 'It was overdue.' : 'The team thinks it was unfair.'}`, '📝', fair ? 'info' : 'warn');
    if (!fair && job.department?.unionized && rng.chance(0.4)) ctx.log(`${p.name}'s union rep filed a grievance over the write-up.`, '✊', 'warn');
  },

  recommend(ctx, personId) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const p = findReport(state, job, personId);
    if (!p || !spend(ctx)) return;
    const chance = clamp(0.15 + (p.performance - 50) / 80 + (job.boss - 50) / 200, 0.05, 0.85);
    if (!rng.chance(chance)) {
      p.rel = Math.min(100, p.rel + 4);
      job.boss = Math.max(0, job.boss - (p.performance < 60 ? 4 : 1));
      return ctx.log(`Leadership passed on your recommendation of ${p.name}. They appreciated you going to bat for them.`, '📨', 'warn');
    }
    removeFromTeam(state, job, p);
    bump(job.department, 'morale', 4);
    job.boss = Math.min(100, job.boss + (p.performance >= 70 ? 4 : -3));
    ctx.log(`${p.name} was promoted on your recommendation and moved up out of your team.`, '⬆️', 'good');
  },

  transferOut(ctx, personId) {
    const { state } = ctx;
    const job = state.career.job;
    const p = findReport(state, job, personId);
    if (!p || !spend(ctx)) return;
    removeFromTeam(state, job, p, 'transferred to another unit');
    bump(job.department, 'morale', p.rel >= 50 ? 1 : 3);
    ctx.log(`You approved ${p.name}'s transfer to another unit.`, '🔀');
  },

  terminate(ctx, personId) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const p = findReport(state, job, personId);
    if (!p || !spend(ctx)) return;
    const justified = p.performance < 45 || (p.discipline ?? 0) >= 2;
    if (!canTerminate(job)) {
      // You can only recommend; your manager decides.
      const manager = chainOfCommand(state, job, { generate: false })?.supervisor;
      if (!rng.chance(justified ? 0.7 : 0.2)) {
        p.rel = Math.max(0, p.rel - 20);
        return ctx.log(`${manager?.name ?? 'Your manager'} declined to terminate ${p.name}${justified ? ' — build more of a paper trail' : ''}.`, '🚫', 'warn');
      }
      ctx.log(`On your recommendation, ${manager?.name ?? 'management'} terminated ${p.name}.`, '🚪');
    } else ctx.log(`You terminated ${p.name}.`, '🚪');
    removeFromTeam(state, job, p);
    bump(job.department, 'productivity', justified ? 3 : -2);
    bump(job.department, 'morale', justified ? -2 : -8);
    if (!justified) {
      job.coworkers = Math.max(0, job.coworkers - 8);
      if (job.department?.unionized) ctx.log('The union filed a grievance over the firing.', '✊', 'warn');
      else if (rng.chance(0.15)) {
        job.boss = Math.max(0, job.boss - 10);
        ctx.log(`${p.name} hired a lawyer and alleged wrongful termination. HR is not happy with you.`, '⚖️', 'bad');
      }
    }
  },
};

export { personOf };
