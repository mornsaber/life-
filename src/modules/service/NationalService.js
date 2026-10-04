/**
 * National service: AmeriCorps and the Peace Corps. Full-time service years
 * with a living stipend; federal student loans sit in forbearance while you
 * serve. Finishing earns an education award (AmeriCorps' Segal award pays
 * down student loans or future tuition) or a readjustment allowance (Peace
 * Corps), plus noncompetitive eligibility for federal jobs and a lasting
 * edge for the Foreign Service and nonprofit, education and social work.
 *
 * state.service.program = { id, track, site, years, term, joinedAge }
 * state.service.alumni  = [{ id, track, years, completed, endAge }]
 * state.service.nceUntil = age through which federal hiring is noncompetitive
 */
import { clamp } from '../../core/Random.js';
import { hasFelony, meetsEducation } from '../../core/State.js';
import { grantCredential, hasCredential } from '../credentials/LicensingEngine.js';

export const PROGRAMS = {
  americorps: {
    name: 'AmeriCorps', icon: '🤝', minAge: 17, maxAge: 99, termYears: 1, maxTerms: 4, stipend: 18000, award: 7395, nceYears: 1,
    tracks: {
      state: { name: 'AmeriCorps State & National', desc: 'Tutoring, food banks, conservation corps and health clinics in your community.' },
      vista: { name: 'AmeriCorps VISTA', desc: 'Build anti-poverty programs at nonprofits and city agencies.', nce: true },
      nccc: { name: 'AmeriCorps NCCC', desc: 'A residential team (ages 18–26) that travels to disasters and conservation projects.', maxAge: 26, minAge: 18, disaster: true },
    },
    sites: ['a literacy nonprofit', 'the county food bank', 'a community health clinic', 'a trail and conservation crew', 'an elementary school', 'a housing nonprofit'],
  },
  peaceCorps: {
    name: 'Peace Corps', icon: '🌐', minAge: 18, maxAge: 99, termYears: 2, maxTerms: 1, stipend: 4000, readjustment: 10000, nceYears: 2,
    tracks: {
      education: { name: 'Education Volunteer', desc: 'Teach English, math or science at a rural school.' },
      health: { name: 'Health Volunteer', desc: 'Community health, nutrition and HIV prevention.' },
      agriculture: { name: 'Agriculture Volunteer', desc: 'Work with farmers on crops, soil and small livestock.' },
      community: { name: 'Community Economic Development', desc: 'Help cooperatives, small businesses and local governments.' },
    },
    sites: ['a village in Senegal', 'a mountain town in Peru', 'a rural district in Cambodia', 'a farming town in Malawi', 'a fishing village in the Philippines', 'a small town in Georgia (the country)', 'a village in Ghana', 'a highland town in Guatemala'],
  },
};

export function programEligibility(state, id, trackId) {
  const p = PROGRAMS[id];
  const t = p?.tracks[trackId];
  if (!p || !t) return { ok: false, reason: 'Unknown program' };
  const age = state.character.age;
  if (state.service.program) return { ok: false, reason: 'Already serving' };
  if (age < (t.minAge ?? p.minAge) || age > (t.maxAge ?? p.maxAge)) return { ok: false, reason: `Ages ${t.minAge ?? p.minAge}${(t.maxAge ?? p.maxAge) < 99 ? `–${t.maxAge ?? p.maxAge}` : '+'}` };
  if (state.military.service?.component === 'active') return { ok: false, reason: 'On active duty' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (state.education.enrolled) return { ok: false, reason: 'Finish or pause school first' };
  if (hasFelony(state)) return { ok: false, reason: 'Fails background check' };
  const done = state.service.alumni.filter((a) => a.id === id).reduce((s, a) => s + a.years, 0);
  if (done >= p.termYears * p.maxTerms) return { ok: false, reason: `Up to ${p.maxTerms * p.termYears} years of service` };
  if (id === 'peaceCorps') {
    if (!meetsEducation(state, { level: 'bachelor' }) && state.career.history.reduce((s, h) => s + (h.endAge - h.startAge), 0) < 3) return { ok: false, reason: 'A bachelor\'s or three years of work experience' };
    if (state.stats.health < 50) return { ok: false, reason: 'Fails the medical clearance' };
  } else if (!meetsEducation(state, { level: 'highschool' }) && age >= 18) return { ok: false, reason: 'Needs a diploma or GED' };
  return { ok: true };
}

/** Join: you leave your job (and, for the Peace Corps, the country). */
export function joinProgram(ctx, arg) {
  const { state, rng } = ctx;
  const [id, trackId] = String(arg).split(':');
  const check = programEligibility(state, id, trackId);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const p = PROGRAMS[id];
  if (state.career.job) ctx.emit('career:resign', { reason: `Left to serve with ${p.name}` });
  state.service.program = { id, track: trackId, site: rng.pick(p.sites), years: 0, term: p.termYears, joinedAge: state.character.age };
  const t = p.tracks[trackId];
  ctx.log(id === 'peaceCorps'
    ? `You swore in as a Peace Corps ${t.name} after ten weeks of language and culture training, posted to ${state.service.program.site}.`
    : `You started a year with ${t.name} at ${state.service.program.site}.`, p.icon, 'milestone');
  ctx.toast(`Joined ${p.name}`, 'good');
}

const EVENTS = {
  americorps: [
    { title: 'A Student Falls Behind', text: 'A fourth-grader you tutor has stopped coming. You hear things are hard at home.', options: [
      { id: 'visit', label: '🏠 Work with the school to reach the family', effects: { happiness: 6, stress: 3 }, impact: 2, text: 'He was back by spring, reading at grade level by June.' },
      { id: 'report', label: '📋 Flag it to your supervisor', effects: { happiness: 1 }, impact: 1, text: 'The school counselor took it from there.' },
    ] },
    { title: 'Storm Deployment', text: 'Your program asks for volunteers to deploy to a hurricane zone for a month.', options: [
      { id: 'go', label: '🌀 Deploy', effects: { happiness: 5, stress: 6, fitness: 2 }, impact: 2, text: 'You mucked out flooded homes and staffed a shelter for 30 days.' },
      { id: 'stay', label: '🏠 Stay at your site', effects: {}, impact: 1, text: 'Your site needed you too.' },
    ] },
    { title: 'Stretching the Stipend', text: 'The living allowance barely covers rent. A coworker suggests a weekend job.', options: [
      { id: 'job', label: '🍽️ Pick up weekend shifts', effects: { stress: 4 }, cash: 4000, impact: 0, text: 'Extra money; less rest.' },
      { id: 'snap', label: '🥫 Apply for SNAP like many members do', effects: { happiness: -1 }, cash: 2000, impact: 1, text: 'Food assistance stretched the stipend.' },
    ] },
  ],
  peaceCorps: [
    { title: 'Giardia', text: 'You\'ve been sick for a week. The medical officer is a day\'s travel away.', options: [
      { id: 'travel', label: '🚌 Travel to the medical office', effects: { health: -2 }, impact: 0, text: 'Antibiotics and three days of rest in the capital.' },
      { id: 'tough', label: '🛏️ Tough it out at site', effects: { health: -10 }, impact: 0, text: 'It got worse before it got better.' },
    ] },
    { title: 'Your Counterpart', text: 'Your local counterpart wants to run the project her way, not the way it was designed.', options: [
      { id: 'yield', label: '🤝 Follow her lead', effects: { happiness: 4 }, impact: 2, text: 'It\'s still running after you leave. That\'s the point.' },
      { id: 'push', label: '📐 Insist on the plan', effects: { stress: 4 }, impact: 0, text: 'The project worked while you were there.' },
    ] },
    { title: 'Isolation', text: 'Month 14. Nobody speaks English for a hundred miles, and the homesickness is crushing.', options: [
      { id: 'language', label: '🗣️ Throw yourself into the language', effects: { happiness: 3, smarts: 2 }, impact: 1, fluency: true, text: 'You dream in the language now. The village adopted you.' },
      { id: 'home', label: '✈️ Early termination: go home', effects: { happiness: 2 }, impact: 0, et: true, text: 'You went home early. Nearly one in ten volunteers do.' },
    ] },
  ],
};

/** A year of service. */
export function programTick(ctx) {
  const { state, rng } = ctx;
  const pr = state.service.program;
  if (!pr) return;
  const p = PROGRAMS[pr.id];
  pr.years += 1;
  ctx.earn(p.stipend, `${p.name} living allowance`, { wage: true });
  ctx.stat('happiness', 2);
  const e = rng.pick(EVENTS[pr.id]);
  ctx.prompt({
    type: 'service.programEvent', icon: p.icon, title: `${p.name}: ${e.title}`, text: e.text,
    options: e.options.map((o) => ({ id: o.id, label: o.label, tone: o.et ? 'danger' : undefined })),
    data: { id: pr.id, title: e.title },
  });
  if (pr.years >= pr.term) completeTerm(ctx, true);
}

export function completeTerm(ctx, completed) {
  const { state } = ctx;
  const pr = state.service.program;
  if (!pr) return;
  const p = PROGRAMS[pr.id];
  state.service.program = null;
  state.service.alumni.push({ id: pr.id, track: pr.track, years: pr.years, completed, endAge: state.character.age, impact: pr.impact ?? 0 });
  if (!completed) return ctx.log(`You left ${p.name} early. No education award.`, p.icon, 'warn');
  if (p.award) {
    const award = Math.round(p.award * pr.years);
    const toLoans = Math.min(award, state.finances.loans ?? 0);
    if (toLoans) state.finances.loans -= toLoans;
    state.education.segalAward = (state.education.segalAward ?? 0) + award - toLoans;
    ctx.log(`You finished your ${p.tracks[pr.track].name} term. Your $${award.toLocaleString()} Segal Education Award ${toLoans ? `paid off $${toLoans.toLocaleString()} of student loans${award > toLoans ? ' and the rest is saved for tuition' : ''}` : 'is saved for future tuition'}.`, p.icon, 'milestone');
  } else {
    ctx.earn(p.readjustment, 'Peace Corps readjustment allowance');
    ctx.log(`You completed your Peace Corps service in ${pr.site} and came home a Returned Peace Corps Volunteer.`, p.icon, 'milestone');
    if (!hasCredential(state, 'languageProficiency') && pr.fluent) grantCredential(ctx, 'languageProficiency', { silent: true });
  }
  if (p.nceYears && (pr.id === 'peaceCorps' || p.tracks[pr.track].nce || pr.years >= 1)) state.service.nceUntil = Math.max(state.service.nceUntil ?? 0, state.character.age + p.nceYears);
  ctx.toast(`${p.name}: service complete`, 'good');
}

export const ProgramResolvers = {
  programEvent(ctx, data, optionId) {
    const { state } = ctx;
    const pr = state.service.program;
    const e = EVENTS[data.id]?.find((x) => x.title === data.title);
    const o = e?.options.find((x) => x.id === optionId);
    if (!o) return;
    for (const [k, v] of Object.entries(o.effects)) ctx.stat(k, v);
    if (o.cash) ctx.earn(o.cash, 'Side income');
    ctx.log(o.text, PROGRAMS[data.id].icon, o.et ? 'warn' : 'good');
    if (pr) {
      pr.impact = (pr.impact ?? 0) + o.impact;
      if (o.fluency) pr.fluent = true;
      if (o.et) completeTerm(ctx, false);
    }
  },
};

/** Hiring edge from national service (used by the interview system). */
export function serviceHiringBonus(state, profession) {
  const s = state.service;
  if (!s) return 0;
  let bonus = 0;
  if ((s.nceUntil ?? 0) >= state.character.age && profession.sector === 'federal') bonus += 0.12;
  const rpcv = s.alumni.some((a) => a.id === 'peaceCorps' && a.completed);
  if (rpcv && ['foreignService', 'intelligence', 'publicHealth', 'nonprofit'].includes(profession.id)) bonus += 0.1;
  if (s.alumni.some((a) => a.id === 'americorps' && a.completed) && ['nonprofit', 'education', 'socialWork', 'childcare', 'library', 'cps'].includes(profession.id)) bonus += 0.06;
  if (s.teams && Object.values(s.teams).some((t) => t?.deployments >= 2) && ['publicHealth', 'municipalAdmin', 'fire', 'ems'].includes(profession.id)) bonus += 0.06;
  return clamp(bonus, 0, 0.2);
}
