/**
 * Licensing engine: requirement checks, sponsorship (employer / agency /
 * volunteer-unit training budgets), multi-year training, exams, renewals,
 * suspensions and revocations. Every credential in the game flows through
 * here.
 *
 * state.credentials = {
 *   held:     { [id]: { earnedAge, status: 'active'|'suspended'|'expired'|'revoked', until?, renewedAge, sponsor } },
 *   training: [{ id, name, yearsLeft, sponsor }],
 *   logbook:  { flightHours },
 * }
 *
 * Budgets are owned by the sponsoring domain (career employer, emergency
 * unit). This module never mutates them directly — it reads the remaining
 * budget and emits `budget:charge`, which the owning module applies.
 */
import { meetsEducation, hasFelony, yearsInProfession, yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { CREDENTIALS, getCredential, credentialName, FLIGHT_BLOCK } from './CredentialRegistry.js';

export const CREDIT_LIMIT = 1500;

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export function hasCredential(state, id) {
  const held = state.credentials.held;
  if (held[id]?.status === 'active') return true;
  return Object.entries(held).some(([hid, h]) => h.status === 'active' && CREDENTIALS[hid]?.implies?.includes(id));
}

export function totalWorkYears(state) {
  const civ = state.career.history.reduce((sum, h) => sum + (h.endAge - h.startAge), 0) + (state.career.job?.yearsAtEmployer ?? 0);
  const mil = state.military.history.reduce((sum, h) => sum + h.yearsOfService, 0) + (state.military.service?.yearsOfService ?? 0);
  return civ + mil;
}

/** Recursive requirement check. Returns { ok, missing: [human-readable] }. */
export function checkRequirements(state, req = {}) {
  if (!req) return { ok: true, missing: [] };
  if (req.anyOf) {
    const results = req.anyOf.map((r) => checkRequirements(state, r));
    const pass = results.find((r) => r.ok);
    if (pass) return { ok: true, missing: [] };
    return { ok: false, missing: [results.map((r) => r.missing.join(' + ')).join(' OR ')] };
  }
  const missing = [];
  if (req.age && state.character.age < req.age) missing.push(`age ${req.age}+`);
  if (req.education && !meetsEducation(state, req.education)) missing.push(describeEducation(req.education));
  for (const c of req.credentials ?? []) if (!hasCredential(state, c)) missing.push(credentialName(c));
  if (req.experience && yearsInProfession(state, req.experience.professions) < req.experience.years) {
    missing.push(`${req.experience.years} yrs ${req.experience.professions[0]} experience`);
  }
  if (req.workYears && totalWorkYears(state) < req.workYears) missing.push(`${req.workYears} yrs work experience`);
  if (req.tenure && (state.career.job?.yearsAtEmployer ?? 0) < req.tenure) missing.push(`${req.tenure} yrs at current employer`);
  if (req.flightHours && state.credentials.logbook.flightHours < req.flightHours) missing.push(`${req.flightHours} flight hrs`);
  if (req.noFelony && hasFelony(state)) missing.push('clean record (no felonies)');
  if (req.smarts && state.stats.smarts < req.smarts) missing.push(`${req.smarts}+ smarts`);
  if (req.fitness && state.stats.fitness < req.fitness) missing.push(`${req.fitness}+ fitness`);
  return { ok: missing.length === 0, missing };
}

const LEVEL_LABEL = { highschool: 'high school diploma', associate: "associate's", bachelor: "bachelor's", master: "master's", doctorate: 'doctorate' };
const PROGRAM_LABEL = { jd: 'J.D.', md: 'M.D.', mba: 'MBA', paralegal: 'paralegal certificate', teacherPrep: 'teacher-prep program', electricalTech: 'electrical tech diploma', msAccounting: 'M.S. Accounting', premedPostbacc: 'pre-med post-bacc' };

export function describeEducation(req) {
  if (!req) return '';
  if (req.anyOf) return req.anyOf.map(describeEducation).join(' or ');
  if (req.program) return PROGRAM_LABEL[req.program] ?? req.program;
  return `${LEVEL_LABEL[req.level] ?? req.level}${req.majors?.length ? ` (${req.majors.join('/')})` : ''}`;
}

/** Who will pay for this credential, if anyone? Returns null or { type, label, left, serviceId? }. */
export function findSponsor(state, credential) {
  const s = credential.sponsors;
  if (!s) return null;
  const job = state.career.job;
  if (job && credential.academy?.includes(job.professionId)) return { type: 'employer', label: `${job.employer.name} academy`, left: Infinity, academy: true };
  if (job) {
    const relevant = s.professions?.includes(job.professionId) || (s.anyEmployer && job.employer.size !== 'small');
    if (relevant) return { type: 'employer', label: job.employer.name, left: job.employer.budget.left };
  }
  for (const serviceId of s.services ?? []) {
    const member = state.emergency[serviceId];
    if (member && !member.onLeave) return { type: 'unit', serviceId, label: member.unit, left: member.budget.left };
  }
  return null;
}

export function credentialStatus(state, id) {
  return state.credentials.held[id]?.status ?? null;
}

/** Can the player start this credential now, and who pays? */
export function pursueEligibility(state, id) {
  const cred = getCredential(id);
  const held = state.credentials.held[id];
  if (held?.status === 'active') return { ok: false, reason: 'Held' };
  if (held?.status === 'revoked') return { ok: false, reason: 'Revoked' };
  if (held?.status === 'suspended') return { ok: false, reason: `Suspended until ${held.until}` };
  if (held?.status === 'expired') return { ok: false, reason: 'Expired — renew it' };
  if (hasCredential(state, id)) return { ok: false, reason: 'Covered by a higher credential' };
  if (state.credentials.training.some((t) => t.id === id)) return { ok: false, reason: 'In training' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (yearlyCount(state, `cred.${id}`)) return { ok: false, reason: 'One attempt per year' };
  const check = checkRequirements(state, cred.requires);
  if (!check.ok) return { ok: false, reason: `Needs ${check.missing.join(', ')}` };

  const sponsor = findSponsor(state, cred);
  if (sponsor && sponsor.left >= cred.cost) return { ok: true, cred, sponsor, payer: 'sponsor', cost: cred.cost };
  if (cred.sponsoredOnly) {
    return { ok: false, reason: sponsor ? `${sponsor.label}'s training budget is spent this year` : 'Requires employer sponsorship' };
  }
  // Small fees can go on a credit card; big-ticket training needs cash.
  if (cred.cost > CREDIT_LIMIT && state.finances.cash < cred.cost) return { ok: false, reason: `Costs $${cred.cost.toLocaleString()}${sponsor ? ' (sponsor budget spent)' : ''}` };
  return { ok: true, cred, sponsor: null, payer: 'self', cost: cred.cost, budgetSpent: Boolean(sponsor) };
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

function chargeCost(ctx, eligibility, what) {
  if (!eligibility.cost) return 'free';
  if (eligibility.payer === 'sponsor') {
    ctx.emit('budget:charge', { sponsor: eligibility.sponsor, amount: eligibility.cost, reason: what });
    return eligibility.sponsor.label;
  }
  ctx.spend(eligibility.cost, what, { allowDebt: true });
  return 'you';
}

export function grantCredential(ctx, id, { sponsor = null, silent = false } = {}) {
  const { state } = ctx;
  const cred = getCredential(id);
  state.credentials.held[id] = { earnedAge: state.character.age, renewedAge: state.character.age, status: 'active', sponsor };
  if (!silent) {
    ctx.log(`You earned your ${cred.name}.`, cred.icon, 'good');
    ctx.toast(`${cred.icon} ${cred.name}`, 'good');
  }
  ctx.emit('credential:earned', { id, onEarn: cred.onEarn });
}

function takeExam(ctx, cred) {
  const stat = ctx.state.stats[cred.exam.stat] ?? 50;
  const chance = clamp(0.92 - cred.exam.difficulty + (stat - 50) / 120, 0.1, 0.97);
  return ctx.rng.chance(chance);
}

/** Start (or immediately sit) a credential. Returns true on progress. */
export function pursueCredential(ctx, id) {
  const { state } = ctx;
  const elig = pursueEligibility(state, id);
  if (!elig.ok) {
    ctx.toast(elig.reason, 'warn');
    return false;
  }
  const cred = elig.cred;
  bumpYearly(state, `cred.${id}`);
  const payer = chargeCost(ctx, elig, cred.name);
  const paidNote = payer === 'free' ? '' : payer === 'you' ? ` You paid $${cred.cost.toLocaleString()}${elig.budgetSpent ? ' (training budget was exhausted)' : ''}.` : ` ${payer} covered the $${cred.cost.toLocaleString()} cost.`;

  if (cred.trainingYears) {
    state.credentials.training.push({ id, name: cred.name, yearsLeft: cred.trainingYears, sponsor: payer });
    ctx.log(`You started training for your ${cred.name} (${cred.trainingYears} yr).${paidNote}`, cred.icon);
    ctx.toast(`Training started: ${cred.name}`, 'good');
    return true;
  }
  if (takeExam(ctx, cred)) {
    if (paidNote) ctx.log(paidNote.trim(), '💳', 'finance');
    grantCredential(ctx, id, { sponsor: payer });
  } else {
    ctx.log(`You failed the ${cred.name} exam. You can retest next year.${paidNote}`, '📝', 'bad');
    ctx.toast(`Failed: ${cred.name}`, 'bad');
  }
  return true;
}

function revoke(ctx, id, status, years, reason) {
  const held = ctx.state.credentials.held[id];
  if (!held || held.status === 'revoked') return;
  held.status = status;
  if (status === 'suspended') held.until = ctx.state.character.age + years;
  const cred = getCredential(id);
  ctx.log(`Your ${cred.name} was ${status === 'revoked' ? 'revoked' : `suspended for ${years} yr`} (${reason}).`, '🚫', 'bad');
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const LicensingEngine = {
  id: 'credentials',
  order: 12,

  init(state) {
    state.credentials ??= { held: {}, training: [], logbook: { flightHours: 0 } };
  },

  setup(engine) {
    engine.bus.on('logbook:add', ({ ctx, hours }) => {
      ctx.state.credentials.logbook.flightHours += hours;
    });
    engine.bus.on('credential:grant', ({ ctx, id, silent }) => {
      if (!hasCredential(ctx.state, id)) grantCredential(ctx, id, { silent });
    });
    engine.bus.on('credential:revoke', ({ ctx, ids, reason }) => {
      for (const id of ids) revoke(ctx, id, 'revoked', 0, reason);
    });
    engine.bus.on('legal:convicted', ({ ctx, offenseId, severity, name }) => {
      for (const [id, held] of Object.entries(ctx.state.credentials.held)) {
        if (held.status === 'revoked') continue;
        const cred = CREDENTIALS[id];
        if (cred.revokeOn?.includes(severity) || cred.revokeOn?.includes(offenseId)) revoke(ctx, id, 'revoked', 0, name);
        else if (cred.suspendOn?.[offenseId]) revoke(ctx, id, 'suspended', cred.suspendOn[offenseId], name);
      }
      // A conviction also ends any training in progress for revocable credentials.
      ctx.state.credentials.training = ctx.state.credentials.training.filter((t) => !CREDENTIALS[t.id].revokeOn?.includes(severity));
    });
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    const age = state.character.age;

    // Training pipeline
    const finished = [];
    for (const t of state.credentials.training) {
      t.yearsLeft -= 1;
      if (t.yearsLeft <= 0) finished.push(t);
    }
    state.credentials.training = state.credentials.training.filter((t) => t.yearsLeft > 0);
    for (const t of finished) {
      const cred = getCredential(t.id);
      if (checkRequirements(state, cred.requires).ok && takeExam(ctx, cred)) grantCredential(ctx, t.id, { sponsor: t.sponsor });
      else {
        ctx.log(`You completed ${cred.name} training but failed the final exam. You can try again.`, '📝', 'bad');
      }
    }

    // Suspensions lapse, renewals come due.
    for (const [id, held] of Object.entries(state.credentials.held)) {
      const cred = CREDENTIALS[id];
      if (held.status === 'suspended' && age >= held.until) {
        held.status = 'active';
        held.renewedAge = age;
        ctx.log(`Your ${cred.name} was reinstated.`, cred.icon, 'good');
      }
      if (held.status === 'active' && cred.renewYears && age - held.renewedAge >= cred.renewYears) {
        const sponsor = findSponsor(state, cred);
        if (sponsor && sponsor.left >= cred.renewCost) {
          ctx.emit('budget:charge', { sponsor, amount: cred.renewCost, reason: `${cred.name} renewal` });
          held.renewedAge = age;
        } else if (!state.legal.incarceration) {
          ctx.spend(cred.renewCost, `${cred.name} renewal`, { allowDebt: true });
          held.renewedAge = age;
        } else {
          held.status = 'expired';
          ctx.log(`Your ${cred.name} lapsed while you were incarcerated.`, '⌛', 'warn');
        }
      }
    }
  },

  actions: {
    pursue(ctx, id) {
      pursueCredential(ctx, id);
    },

    /** Reinstate an expired credential by paying renewal + continuing education. */
    renew(ctx, id) {
      const held = ctx.state.credentials.held[id];
      if (held?.status !== 'expired') return;
      const cred = getCredential(id);
      const cost = cred.renewCost * 2;
      if (!ctx.spend(cost, `${cred.name} reinstatement`)) return ctx.toast(`Reinstatement costs $${cost.toLocaleString()}.`, 'warn');
      held.status = 'active';
      held.renewedAge = ctx.state.character.age;
      ctx.log(`You reinstated your ${cred.name}.`, cred.icon, 'good');
    },

    /** Rent aircraft time to build hours toward pilot ratings. */
    fly(ctx) {
      const { state } = ctx;
      if (!hasCredential(state, 'studentPilot')) return ctx.toast('You need a Student Pilot Certificate.', 'warn');
      if (yearlyCount(state, 'cred.fly') >= 2) return ctx.toast('The flight school is booked up this year.', 'warn');
      if (!ctx.spend(FLIGHT_BLOCK.cost, 'Aircraft rental')) return ctx.toast(`A ${FLIGHT_BLOCK.hours}-hour block costs $${FLIGHT_BLOCK.cost.toLocaleString()}.`, 'warn');
      bumpYearly(state, 'cred.fly');
      state.credentials.logbook.flightHours += FLIGHT_BLOCK.hours;
      ctx.stat('happiness', 4);
      ctx.log(`You logged ${FLIGHT_BLOCK.hours} hours of flight time (${state.credentials.logbook.flightHours} total).`, '🛩️');
    },
  },
};
