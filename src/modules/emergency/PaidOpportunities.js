/**
 * Volunteering opens doors. Experienced members of a volunteer service get
 * offered paid side gigs (per-diem shifts, a paid season, contract work)
 * and, now and then, a real job in the matching career — departments love
 * hiring people they've already seen work. Those offers skip the
 * civil-service waiting list, but every other requirement still applies.
 */
import { createEmployer } from '../career/Employers.js';
import { applicationEligibility, bestEntryLevel, hire } from '../career/CareerEngine.js';
import { getProfession } from '../career/JobTrees.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { levelById } from '../career/Ladder.js';
import { MAX_STEP } from '../career/PayGrades.js';
import { recalcSalary } from '../career/Compensation.js';
import { releaseVolunteerOrg } from '../org/VolunteerOrgs.js';
import { REGIONS } from '../life/Regions.js';
import { bumpYearly, yearlyCount } from '../../core/State.js';

/**
 * gig:   paid side work for a year { label, pay: [min, max], needs?: credential }
 * jobs:  careers this service feeds into
 */
export const PATHWAYS = {
  fire: { gig: { label: 'Paid-on-call firefighter stipends', pay: [4000, 9000] }, jobs: ['fire', 'stateFire'] },
  police: { gig: { label: 'Paid special-event security details', pay: [5000, 12000] }, jobs: ['police'] },
  ambulance: { gig: { label: 'Per-diem EMT shifts', pay: [6000, 15000], needs: 'emt' }, jobs: ['ems', 'privateEms'] },
  sar: { gig: { label: 'Wilderness-medicine instructor', pay: [3000, 7000], needs: 'wfr' }, jobs: ['parkService'] },
  wildland: { gig: { label: 'Seasonal federal fire crew (summer)', pay: [12000, 20000], needs: 'wildlandFF2' }, jobs: ['stateFire', 'forester', 'parkService'] },
  auxiliary: { gig: { label: 'Licensed captain for a marine towing company', pay: [5000, 10000], needs: 'coxswain' }, jobs: ['merchantMarine'] },
  cap: { gig: { label: 'Contract flying: banner tows and aerial photos', pay: [6000, 15000], needs: 'privatePilot' }, jobs: ['charterAviation'] },
  cert: { gig: { label: 'Emergency-preparedness trainer for employers', pay: [3000, 6000] }, jobs: ['municipalAdmin'] },
  redcross: { gig: { label: 'Paid disaster deployment', pay: [8000, 14000] }, jobs: ['socialWork'] },
  skiPatrol: { gig: { label: 'Paid ski patrol season', pay: [12000, 20000] }, jobs: [] },
  mrc: { gig: { label: 'Per-diem clinic and vaccination shifts', pay: [8000, 20000] }, jobs: ['nursing', 'ems'] },
};

const seasoned = (member) => member.years >= 2 || member.rankIndex >= 1;

/** The career each volunteer service bridges into, for recognised prior service. */
export const BRIDGES = { fire: 'fire', ambulance: 'ems', police: 'police', wildland: 'stateFire' };

/**
 * Is the career post in the same service as your volunteer unit? Abroad, on-call and
 * volunteer crews are often part of the career service (a UK fire and rescue service's
 * on-call firefighters, FENZ's volunteer brigades, a French SDIS's sapeurs-pompiers
 * volontaires, a German city's Freiwillige Feuerwehr): moving to a wholetime post is a
 * transfer within it.
 */
export function sameService(state, serviceId, member, professionId) {
  if (!member || BRIDGES[serviceId] !== professionId) return false;
  return Boolean(state.orgs?.byId?.[member.orgId]?.parent);
}

/** Offer a volunteer a career post in the matching service. */
export function offerJob(ctx, serviceId, member, svc, professionId) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const profession = getProfession(professionId);
  const employer = createEmployer(rng, state, profession, state.character.regionId);
  const check = volunteerHireCheck(state, professionId);
  const level = bestEntryLevel(state, profession, employer.size) ?? check.level;
  if (!level) return false;
  const same = sameService(state, serviceId, member, professionId);
  const parent = state.orgs?.byId?.[member.orgId]?.parent?.name?.replace(/^the /, '');
  ctx.prompt({
    type: 'emergency.jobOffer', icon: profession.icon, title: same ? 'A Wholetime Post' : 'A Job Offer from the Field',
    text: same
      ? `${parent ? parent[0].toUpperCase() + parent.slice(1) : employer.name} is recruiting full-time ${level.title.toLowerCase()}s from its own ${svc.short} crews. Your ${member.years} years at ${member.unit} count as service: you'd keep your seniority and skip the open recruitment.${job ? `\nAccepting means resigning as ${job.title}.` : ''}`
      : `${employer.name} has watched you work as a ${svc.short} volunteer and wants to hire you as ${level.title}.${check.examWaived ? ' They\'ll skip the civil-service waiting list.' : ''} Your volunteer years would count toward your starting pay.${job ? `\nAccepting means resigning as ${job.title}.` : ''}`,
    options: [{ id: 'accept', label: `✅ ${same ? 'Go full-time' : 'Take the job'} (${level.title})` }, { id: 'decline', label: same ? '🙅 Stay on call' : '🙅 Stay a volunteer' }],
    data: { professionId, levelId: level.id, employer, serviceId },
  });
  return true;
}

/** Ask the career service for a post (once a year): units back their own. */
export function applyForCareer(ctx, serviceId, svc) {
  const { state, rng } = ctx;
  const member = state.emergency[serviceId];
  const professionId = BRIDGES[serviceId];
  if (!member || !professionId) return false;
  if (yearlyCount(state, `emergency.apply.${serviceId}`)) return ctx.toast('You applied this year already.', 'warn');
  const check = volunteerHireCheck(state, professionId);
  if (!check.ok) return ctx.toast(check.reason ?? 'Not eligible', 'warn');
  if (state.career.job?.professionId === professionId) return ctx.toast('You already work there.', 'warn');
  bumpYearly(state, `emergency.apply.${serviceId}`);
  const same = sameService(state, serviceId, member, professionId);
  const odds = 0.3 + member.rankIndex * 0.06 + Math.min(member.years, 8) * 0.03 + (same ? 0.15 : 0);
  if (!rng.chance(Math.min(0.9, odds))) return ctx.log(`You applied for a career post with the ${getProfession(professionId).name.toLowerCase()} service. Not this round — they took candidates with more experience.`, '📭', 'warn');
  return offerJob(ctx, serviceId, member, svc, professionId);
}

/**
 * Recognised prior service: on being hired into the matching career, volunteer (and
 * national-service) years count toward your pay step; in the same service, toward
 * your seniority too, and your on-call contract ends as you go full-time.
 */
export function creditPriorService(ctx, job, services) {
  const { state } = ctx;
  if (!job || job.priorService) return;
  const ids = Object.keys(BRIDGES).filter((id) => BRIDGES[id] === job.professionId);
  if (!ids.length) return;
  const active = ids.map((id) => [id, state.emergency?.[id]]).find(([, m]) => m);
  const past = (state.emergency?.history ?? []).filter((h) => ids.includes(h.serviceId));
  const years = Math.min(15, (active?.[1]?.years ?? 0) + past.reduce((sum, h) => sum + (h.years ?? 0), 0));
  if (years < 1) return;
  const [serviceId, member] = active ?? [];
  const same = member && sameService(state, serviceId, member, job.professionId);
  const credit = same ? years : Math.floor(years / 2);
  if (credit < 1) return;
  job.step = Math.min(MAX_STEP, Math.max(job.step ?? 1, 1 + Math.floor(credit / 2)));
  recalcSalary(state, job);
  job.priorService = { years, credit, unit: member?.unit ?? past.at(-1)?.unit ?? null, same: Boolean(same) };
  if (same) {
    job.yearsAtEmployer = Math.max(job.yearsAtEmployer ?? 0, credit);
    state.emergency.history.push({
      serviceId, unit: member.unit, rankTitle: services[serviceId].ranks[member.rankIndex].title, years: member.years, calls: member.calls, saves: member.saves,
      startAge: member.joinedAge, endAge: state.character.age, reason: `Went full-time as ${job.title}`,
    });
    state.emergency[serviceId] = null;
    if (member.orgId) releaseVolunteerOrg(state, member.orgId);
    return ctx.log(`You went full-time as ${job.title}. Your ${years} years at ${member.unit} count as service: step ${job.step}, seniority from age ${state.character.age - credit}.`, '🔁', 'milestone');
  }
  ctx.log(`Your ${years} years of ${past.some((h) => h.nationalService) ? 'national and volunteer ' : 'volunteer '}service were recognised: you start at step ${job.step}.`, '📜', 'good');
}

/** National service in a fire station counts as service (Korea's 119 posting, Germany's Feuerwehr commitment). */
export function recordNationalService(state, { serviceId, unit, rankTitle, years, startAge }) {
  state.emergency.history.push({ serviceId, unit, rankTitle, years, calls: years * 120, saves: 0, startAge, endAge: startAge + years, reason: 'National service completed', nationalService: true });
}
export const cityOf = (state) => (REGIONS[state.character.regionId]?.name ?? 'City').split(',')[0];

/** Can a volunteer be hired straight into this career? (The civil-service exam is waived.) */
export function volunteerHireCheck(state, professionId) {
  const check = applicationEligibility(state, professionId);
  if (check.ok) return check;
  if (/^Pass the /.test(check.reason ?? '')) {
    const profession = getProfession(professionId);
    const level = bestEntryLevel(state, profession, 'small') ?? bestEntryLevel(state, profession, 'enterprise');
    return level ? { ok: true, level, examWaived: true } : check;
  }
  return check;
}

/** Yearly: maybe a paid gig, maybe a job offer. */
export function opportunityTick(ctx, serviceId, member, svc) {
  const { state, rng } = ctx;
  const path = PATHWAYS[serviceId];
  if (!path || member.onLeave || !seasoned(member) || state.legal.incarceration || state.character.age < 18) return;
  if (state.prompts.some((p) => p.type === 'emergency.gig' || p.type === 'emergency.jobOffer')) return;
  // Job offers: rarer, for members who've proven themselves.
  const job = state.career.job;
  const targets = path.jobs.filter((id) => job?.professionId !== id && volunteerHireCheck(state, id).ok);
  const jobOdds = 0.04 + member.rankIndex * 0.02 + Math.min(0.04, member.saves * 0.004);
  const same = targets.find((id) => sameService(state, serviceId, member, id));
  if (targets.length && rng.chance(jobOdds + (same ? 0.06 : 0))) {
    offerJob(ctx, serviceId, member, svc, same ?? rng.pick(targets));
    return;
  }
  // Paid gigs.
  if (path.gig && (!path.gig.needs || hasCredential(state, path.gig.needs)) && rng.chance(0.15 + member.rankIndex * 0.03)) {
    const pay = Math.round(rng.int(...path.gig.pay) / 100) * 100;
    ctx.prompt({
      type: 'emergency.gig', icon: svc.icon, title: 'Paid Work Through Your Unit',
      text: `Word got around ${member.unit}: there's paid work available — ${path.gig.label.toLowerCase()}, about $${pay.toLocaleString()} this year.`,
      options: [{ id: 'take', label: `💵 Take it (+$${pay.toLocaleString()})`, hint: 'More hours, more stress' }, { id: 'pass', label: '🙅 Pass' }],
      data: { serviceId, pay, label: path.gig.label },
    });
  }
}

export const OpportunityResolvers = {
  gig(ctx, data, optionId) {
    if (optionId !== 'take') return ctx.log(`You passed on the ${data.label.toLowerCase()}.`, '🙅');
    ctx.earn(data.pay, data.label, { wage: true });
    ctx.stat('stress', 5);
    ctx.log(`${data.label}: $${data.pay.toLocaleString()} this year.`, '💵', 'good');
  },
  jobOffer(ctx, data, optionId) {
    const { state } = ctx;
    if (optionId !== 'accept') return ctx.log(`You thanked ${data.employer.name} and stayed a volunteer.`, '🙅');
    if (state.legal.incarceration || !volunteerHireCheck(state, data.professionId).ok) return ctx.log(`${data.employer.name} withdrew the offer.`, '📭', 'warn');
    const level = levelById(getProfession(data.professionId), data.levelId);
    if (!level) return;
    hire(ctx, { professionId: data.professionId, levelId: data.levelId, employer: data.employer });
  },
};
