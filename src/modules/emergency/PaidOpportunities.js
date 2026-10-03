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

/**
 * gig:   paid side work for a year { label, pay: [min, max], needs?: credential }
 * jobs:  careers this service feeds into
 */
export const PATHWAYS = {
  fire: { gig: { label: 'Paid-on-call firefighter stipends', pay: [4000, 9000] }, jobs: ['fire'] },
  police: { gig: { label: 'Paid special-event security details', pay: [5000, 12000] }, jobs: ['police'] },
  ambulance: { gig: { label: 'Per-diem EMT shifts', pay: [6000, 15000], needs: 'emt' }, jobs: ['ems'] },
  sar: { gig: { label: 'Wilderness-medicine instructor', pay: [3000, 7000], needs: 'wfr' }, jobs: ['parkService'] },
  wildland: { gig: { label: 'Seasonal federal fire crew (summer)', pay: [12000, 20000], needs: 'wildlandFF2' }, jobs: ['forester', 'parkService'] },
  auxiliary: { gig: { label: 'Licensed captain for a marine towing company', pay: [5000, 10000], needs: 'coxswain' }, jobs: [] },
  cap: { gig: { label: 'Contract flying: banner tows and aerial photos', pay: [6000, 15000], needs: 'privatePilot' }, jobs: ['aviation'] },
  cert: { gig: { label: 'Emergency-preparedness trainer for employers', pay: [3000, 6000] }, jobs: ['municipalAdmin'] },
  redcross: { gig: { label: 'Paid disaster deployment', pay: [8000, 14000] }, jobs: ['socialWork'] },
  skiPatrol: { gig: { label: 'Paid ski patrol season', pay: [12000, 20000] }, jobs: [] },
  mrc: { gig: { label: 'Per-diem clinic and vaccination shifts', pay: [8000, 20000] }, jobs: ['nursing', 'ems'] },
};

const seasoned = (member) => member.years >= 2 || member.rankIndex >= 1;

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
  if (targets.length && rng.chance(jobOdds)) {
    const professionId = rng.pick(targets);
    const profession = getProfession(professionId);
    const employer = createEmployer(rng, state, profession, state.character.regionId);
    const check = volunteerHireCheck(state, professionId);
    const level = bestEntryLevel(state, profession, employer.size) ?? check.level;
    ctx.prompt({
      type: 'emergency.jobOffer', icon: profession.icon, title: 'A Job Offer from the Field',
      text: `${employer.name} has watched you work as a ${svc.short} volunteer and wants to hire you as ${level.title}.${check.examWaived ? ' They\'ll skip the civil-service waiting list.' : ''}${job ? `\nAccepting means resigning as ${job.title}.` : ''}`,
      options: [{ id: 'accept', label: `✅ Take the job (${level.title})` }, { id: 'decline', label: '🙅 Stay a volunteer' }],
      data: { professionId, levelId: level.id, employer, serviceId },
    });
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
