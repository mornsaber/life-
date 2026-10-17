/**
 * Licences that come with the job, and learning to drive.
 *
 * Employers put their people through the licences the job itself requires and
 * that they sponsor — a transit agency its operators' CDL, a police force its
 * officers' certification — at the employer's cost, like an academy (it doesn't
 * use up your own yearly limit). The exam can still be failed; the employer
 * puts you in for the retest the next year. Trainees are also put through
 * what they need to graduate. Certifications for a promotion (the next rank's
 * specialty certificates) are yours to pursue from the Licenses tab.
 *
 * At the permit age you're asked if you want to learn to drive; once you hold
 * a learner's permit, whether to take the driving test.
 */
import { hasCredential, pursueEligibility, pursueCredential } from '../credentials/LicensingEngine.js';
import { CREDENTIALS } from '../credentials/CredentialRegistry.js';
import { getProfession } from './JobTrees.js';
import { levelById, nextLevels } from './Ladder.js';
import { credentialPlan, traineeProgram } from './Tenure.js';

/** Employer-run licensing a year (beyond it, the rest waits for next year). */
const PER_YEAR = 2;

/** The licences this job requires (and a trainee's graduation needs) that you don't hold yet, prerequisites first. */
export function jobLicencePlan(state, job) {
  const profession = getProfession(job.professionId);
  const level = levelById(profession, job.levelId);
  const program = traineeProgram(job);
  const graduation = program ? levelById(profession, program.next) : null;
  const needed = [...new Set([...(level?.req?.credentials ?? []), ...(graduation?.req?.credentials ?? [])])];
  return credentialPlan(state, needed).filter((id) => CREDENTIALS[id] && !state.credentials.training.some((t) => t.id === id));
}

/** Certifications the next rank up needs that you'll have to pursue yourself (the employer won't). */
export function promotionCredentials(state, job = state.career.job) {
  if (!job) return [];
  const profession = getProfession(job.professionId);
  if (!profession) return [];
  const required = new Set(jobLicencePlan(state, job));
  const next = nextLevels(profession, job.employer.size, job.levelId);
  return credentialPlan(state, [...new Set(next.flatMap((l) => l.req?.credentials ?? []))]).filter((id) => CREDENTIALS[id] && !required.has(id));
}

/** Put the employee through what the employer pays for. Returns the credentials started. */
export function employerLicensing(ctx) {
  const { state } = ctx;
  const job = state.career.job;
  if (!job || state.career.leave || state.legal.incarceration) return [];
  const started = [];
  for (const id of jobLicencePlan(state, job)) {
    if (started.length >= PER_YEAR) break;
    const e = pursueEligibility(state, id, { academy: true });
    if (!e.ok || e.payer !== 'sponsor') continue;
    if (pursueCredential(ctx, id, { academy: true, quiet: true })) started.push(id);
  }
  if (started.length) ctx.log(`${job.employer.name} put you through ${started.map((id) => CREDENTIALS[id].name).join(' and ')} — on the job, at their cost.`, '🪪', 'good');
  return started;
}

/* ------------------------------------------------------------------ */
/* Learning to drive                                                   */
/* ------------------------------------------------------------------ */

function drivingPrompt(ctx) {
  const { state } = ctx;
  if (state.legal.incarceration || hasCredential(state, 'driverLicense') || state.prompts.some((p) => p.type === 'jobLicensing.driving')) return;
  const permit = hasCredential(state, 'learnerPermit');
  const id = permit ? 'driverLicense' : 'learnerPermit';
  // Ask once for each step, then again every few years if you said not yet.
  const asked = (state.driving ??= { asked: {} }).asked;
  if (asked[id] != null && state.character.age - asked[id] < 3) return;
  const e = pursueEligibility(state, id);
  // Parents usually pay for a teenager's permit, lessons and test.
  const parentsPay = !e.ok && /^Costs/.test(e.reason ?? '') && state.character.age < 21;
  if (!e.ok && !parentsPay) return;
  asked[id] = state.character.age;
  const cost = e.cost ?? CREDENTIALS[id].cost;
  const cred = CREDENTIALS[id];
  ctx.prompt({
    type: 'jobLicensing.driving', icon: permit ? '🚗' : '🚦', title: permit ? 'Your Driving Test' : 'Learning to Drive',
    text: permit ? `You've been practising on your ${CREDENTIALS.learnerPermit.name.toLowerCase()}. Book the test for your ${cred.name.toLowerCase()}?` : `You're old enough for a ${cred.name.toLowerCase()}. Start learning to drive?`,
    options: [
      { id: 'yes', label: permit ? `🚗 Take the test ($${cost.toLocaleString()})` : `🚦 Get your permit ($${cost.toLocaleString()})`, hint: parentsPay ? 'Your parents will pay' : '' },
      { id: 'no', label: '🚌 Not yet' },
    ],
    data: { id, parentsPay, cost },
  });
}

export const JobLicensingModule = {
  id: 'jobLicensing',
  order: 41,

  setup(engine) {
    // A new hire goes straight into the employer's training.
    engine.bus.on('career:hired', ({ ctx }) => employerLicensing(ctx));
  },

  onYearEnd(ctx) {
    if (!ctx.state.character.alive) return;
    employerLicensing(ctx);
    drivingPrompt(ctx);
  },

  resolvers: {
    driving(ctx, data, optionId) {
      if (optionId !== 'yes') return ctx.log('You decided driving can wait.', '🚌');
      if (data.parentsPay) {
        ctx.earn(data.cost, 'Parents paid for driving lessons');
        ctx.log('Your parents paid for the lessons and the fees.', '👪');
      }
      pursueCredential(ctx, data.id);
      return undefined;
    },
  },
};
