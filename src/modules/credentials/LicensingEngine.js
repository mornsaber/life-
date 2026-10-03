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
 *   prep:     { [id]: true }        exam-prep course taken (used up by the next exam)
 *   retake:   { [id]: lastAge }     failed a training final — retest without retraining
 *   failures: { [id]: count }
 * }
 *
 * Budgets are owned by the sponsoring domain (career employer, emergency
 * unit). This module never mutates them directly — it reads the remaining
 * budget and emits `budget:charge`, which the owning module applies.
 */
import { meetsEducation, hasFelony, yearsInProfession, yearlyCount, bumpYearly, canAfford } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { CREDENTIALS, getCredential, credentialName, FLIGHT_BLOCK } from './CredentialRegistry.js';
import { stateIdOf } from '../life/Regions.js';
import { STATES } from '../life/States.js';

/** New credentials you can take on in a year (courses take time, not just money). */
export const ATTEMPTS_PER_YEAR = 2;
export const MAX_TRAINING = 2;
/** After failing a training program's final exam you may retest (exam only) within this many years. */
export const RETAKE_WINDOW = 2;
export const PREP_BONUS = 0.12;
export const prepCost = (cred) => Math.max(100, Math.round(cred.cost * 0.2));
export const retakeCost = (cred) => Math.max(50, Math.round(cred.cost * 0.15));

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

/** Is a held credential usable in the state you live in now? */
export function validHere(state, id, held = state.credentials.held[id]) {
  const cred = CREDENTIALS[id];
  if (!held || cred.jurisdiction !== 'state' || !held.states) return true;
  const here = stateIdOf(state);
  if (held.states?.includes(here)) return true;
  if (cred.reciprocity === 'compact') return Boolean(STATES[here].nlc && held.states?.some((s) => STATES[s].nlc));
  return false;
}

export function hasCredential(state, id) {
  const held = state.credentials.held;
  if (held[id]?.status === 'active' && validHere(state, id)) return true;
  return Object.entries(held).some(([hid, h]) => h.status === 'active' && CREDENTIALS[hid]?.implies?.includes(id) && validHere(state, hid, h));
}

/** What it takes to use a held state credential here. */
export function transferStatus(state, id) {
  const cred = getCredential(id);
  const held = state.credentials.held[id];
  if (!held || held.status !== 'active' || validHere(state, id)) return { needed: false };
  const method = cred.reciprocity;
  if (method === 'motion' && yearsInProfession(state, ['law', 'prosecution', 'publicDefender']) >= 5) return { needed: true, method, cost: 1200, exam: false };
  if (method === 'motion' || method === 'restart') return { needed: true, method, cost: cred.cost, exam: true, difficulty: cred.exam.difficulty };
  return { needed: true, method, cost: Math.max(150, Math.round(cred.cost * 0.4)), exam: true, difficulty: cred.exam.difficulty * 0.5 };
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
  if (req.health && state.stats.health < req.health) missing.push(`${req.health}+ health (medical exam)`);
  if (req.affiliation && !affiliated(state, req.affiliation)) missing.push(`membership in ${req.affiliation.map(affiliationLabel).join(' / ')}`);
  return { ok: missing.length === 0, missing };
}

const AFFILIATION_LABEL = { fire: 'a fire department', police: 'a police department', statePolice: 'the state police', sar: 'a SAR team', auxiliary: 'the Coast Guard Auxiliary', wildland: 'a wildland crew', ambulance: 'an ambulance corps', parkService: 'the Park Service', gameWarden: 'Fish & Wildlife', forester: 'State Forestry', publicWorks: 'Public Works', ems: 'an EMS agency', corrections: 'Corrections', oig: 'an Inspector General', socialWork: 'social services', cps: 'CPS', cap: 'Civil Air Patrol', cert: 'a CERT team', redcross: 'the Red Cross', skiPatrol: 'a ski patrol', mrc: 'the Medical Reserve Corps' };
const affiliationLabel = (id) => AFFILIATION_LABEL[id] ?? id;

/** Agency-internal courses are only open to members: your job's profession or an active volunteer service. */
export function affiliated(state, ids) {
  if (ids.includes(state.career.job?.professionId)) return true;
  return ids.some((id) => state.emergency[id] && id !== 'history' && !state.emergency[id].onLeave);
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
export function pursueEligibility(state, id, { academy = false } = {}) {
  const cred = getCredential(id);
  const held = state.credentials.held[id];
  if (held?.status === 'active') return { ok: false, reason: validHere(state, id) ? 'Held' : `Held in ${held.states.join('/')} — transfer it` };
  if (held?.status === 'revoked') return { ok: false, reason: 'Revoked' };
  if (held?.status === 'suspended') return { ok: false, reason: `Suspended until ${held.until}` };
  if (held?.status === 'expired') return { ok: false, reason: 'Expired — renew it' };
  if (hasCredential(state, id)) return { ok: false, reason: 'Covered by a higher credential' };
  if (state.credentials.training.some((t) => t.id === id)) return { ok: false, reason: 'In training' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (yearlyCount(state, `cred.${id}`)) return { ok: false, reason: 'One attempt per year' };
  if (!academy && yearlyCount(state, 'cred.attempts') >= ATTEMPTS_PER_YEAR) return { ok: false, reason: `No time for more than ${ATTEMPTS_PER_YEAR} new credentials a year` };
  const check = checkRequirements(state, cred.requires);
  if (!check.ok) return { ok: false, reason: `Needs ${check.missing.join(', ')}` };
  // Failed a training program's final exam recently: retest without retraining.
  const retake = state.credentials.retake?.[id];
  if (retake != null && state.character.age - retake <= RETAKE_WINDOW) {
    const cost = retakeCost(cred);
    const academySponsor = findSponsor(state, cred);
    if (academySponsor?.academy) return { ok: true, cred, sponsor: academySponsor, payer: 'sponsor', cost, retake: true };
    if (!canAfford(state, cost)) return { ok: false, reason: `Retest costs $${cost.toLocaleString()} — more than your cash and credit` };
    return { ok: true, cred, sponsor: null, payer: 'self', cost, retake: true };
  }
  if (cred.trainingYears && state.credentials.training.length >= MAX_TRAINING) return { ok: false, reason: `Already in ${MAX_TRAINING} training programs` };

  const sponsor = findSponsor(state, cred);
  if (sponsor && sponsor.left >= cred.cost) return { ok: true, cred, sponsor, payer: 'sponsor', cost: cred.cost };
  if (cred.sponsoredOnly) {
    return { ok: false, reason: sponsor ? `${sponsor.label}'s training budget is spent this year` : 'Requires employer sponsorship' };
  }
  // Self-paid courses go on cash or cards, up to your credit limit.
  if (!canAfford(state, cred.cost)) return { ok: false, reason: `Costs $${cred.cost.toLocaleString()} — more than your cash and credit${sponsor ? ' (sponsor budget spent)' : ''}` };
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
  ctx.spend(eligibility.cost, what, { credit: true });
  return 'you';
}

export function grantCredential(ctx, id, { sponsor = null, silent = false } = {}) {
  const { state } = ctx;
  const cred = getCredential(id);
  state.credentials.held[id] = { earnedAge: state.character.age, renewedAge: state.character.age, status: 'active', sponsor, states: [stateIdOf(state)] };
  if (!silent) {
    ctx.log(`You earned your ${cred.name}.`, cred.icon, 'good');
    ctx.toast(`${cred.icon} ${cred.name}`, 'good');
  }
  ctx.emit('credential:earned', { id, onEarn: cred.onEarn });
}

/**
 * Odds of passing, calibrated to real first-attempt pass rates for a typical
 * candidate (driver's road test ≈60%, NCLEX ≈85%, bar ≈60%, CPA section ≈50%).
 * Smarts exams center on 75, physical tests on 60; a prep course adds 12 points.
 */
export function passChance(state, cred, { prepped = Boolean(state.credentials.prep?.[cred.id]) } = {}) {
  const stat = state.stats[cred.exam.stat] ?? 50;
  const center = cred.exam.stat === 'smarts' ? 75 : 60;
  return clamp(0.97 - cred.exam.difficulty * 1.1 + (stat - center) / 140 + (prepped ? PREP_BONUS : 0), 0.05, 0.97);
}

function takeExam(ctx, cred) {
  const { state } = ctx;
  const passed = ctx.rng.chance(passChance(state, cred));
  if (state.credentials.prep?.[cred.id]) delete state.credentials.prep[cred.id];
  if (passed) {
    if (state.credentials.retake?.[cred.id] != null) delete state.credentials.retake[cred.id];
  } else state.credentials.failures[cred.id] = (state.credentials.failures[cred.id] ?? 0) + 1;
  return passed;
}

/** Start (or immediately sit) a credential. Returns true on progress. */
export function pursueCredential(ctx, id, { academy = false, quiet = false } = {}) {
  const { state } = ctx;
  const elig = pursueEligibility(state, id, { academy });
  if (!elig.ok) {
    if (!quiet) ctx.toast(elig.reason, 'warn');
    return false;
  }
  const cred = elig.cred;
  bumpYearly(state, `cred.${id}`);
  if (!academy) bumpYearly(state, 'cred.attempts');
  const payer = chargeCost(ctx, elig, elig.retake ? `${cred.name} retest` : cred.name);
  const paidNote = payer === 'free' ? '' : payer === 'you' ? ` You paid $${cred.cost.toLocaleString()}${elig.budgetSpent ? ' (training budget was exhausted)' : ''}.` : ` ${payer} covered the $${cred.cost.toLocaleString()} cost.`;

  if (cred.trainingYears && !elig.retake) {
    state.credentials.training.push({ id, name: cred.name, yearsLeft: cred.trainingYears, sponsor: payer });
    ctx.log(`You started training for your ${cred.name} (${cred.trainingYears} yr).${paidNote}`, cred.icon);
    ctx.toast(`Training started: ${cred.name}`, 'good');
    return true;
  }
  if (takeExam(ctx, cred)) {
    if (paidNote) ctx.log(paidNote.trim(), '💳', 'finance');
    grantCredential(ctx, id, { sponsor: payer });
  } else {
    const fails = state.credentials.failures[id];
    ctx.log(`You failed the ${cred.name} exam${fails > 1 ? ` (attempt ${fails})` : ''}. You can retest next year${state.credentials.prep?.[id] ? '' : ' — a prep course would help'}.${paidNote}`, '📝', 'bad');
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
    state.credentials.prep ??= {};
    state.credentials.retake ??= {};
    state.credentials.failures ??= {};
  },

  setup(engine) {
    engine.bus.on('logbook:add', ({ ctx, hours }) => {
      ctx.state.credentials.logbook.flightHours += hours;
    });
    engine.bus.on('credential:grant', ({ ctx, id, silent }) => {
      if (CREDENTIALS[id] && !hasCredential(ctx.state, id)) grantCredential(ctx, id, { silent });
    });
    engine.bus.on('credential:revoke', ({ ctx, ids, reason }) => {
      for (const id of ids) revoke(ctx, id, 'revoked', 0, reason);
    });
    engine.bus.on('credential:suspend', ({ ctx, ids, years, reason }) => {
      for (const id of ids) revoke(ctx, id, 'suspended', years, reason);
    });
    engine.bus.on('credential:reinstate', ({ ctx, ids, reason }) => {
      for (const id of ids) {
        const held = ctx.state.credentials.held[id];
        if (held?.status !== 'suspended') continue;
        held.status = 'active';
        delete held.until;
        ctx.log(`Your ${getCredential(id).name} was reinstated (${reason}).`, '🪪', 'good');
      }
    });
    engine.bus.on('region:changed', ({ ctx, toState, fromState }) => {
      if (toState === fromState) return;
      const { state } = ctx;
      const needs = [];
      for (const [id, held] of Object.entries(state.credentials.held)) {
        const cred = CREDENTIALS[id];
        if (held.status !== 'active' || cred.jurisdiction !== 'state' || validHere(state, id)) continue;
        if (cred.reciprocity === 'automatic') {
          held.states.push(toState);
          ctx.spend(60, `${cred.name} transfer`, { allowDebt: true });
        } else needs.push(cred.name);
      }
      if (needs.length) ctx.log(`New state, new rules: ${needs.join(', ')} must be transferred to ${STATES[toState].name} before you can use ${needs.length > 1 ? 'them' : 'it'} (see Licenses).`, '🪪', 'warn');
    });
    engine.bus.on('legal:convicted', ({ ctx, offenseId, severity, name }) => {
      for (const [id, held] of Object.entries(ctx.state.credentials.held)) {
        if (held.status === 'revoked') continue;
        const cred = CREDENTIALS[id];
        if (cred.revokeOn?.includes(severity) || cred.revokeOn?.includes(offenseId)) revoke(ctx, id, 'revoked', 0, name);
        else if (cred.suspendOn?.[offenseId]) {
          // State law sets DUI suspension length; repeat offenders lose it longer.
          const years = offenseId === 'dui' ? Math.max(cred.suspendOn.dui, STATES[stateIdOf(ctx.state)].dui.suspendYears + ctx.state.legal.record.filter((r) => r.offenseId === 'dui').length - 1) : cred.suspendOn[offenseId];
          revoke(ctx, id, 'suspended', years, name);
        }
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
        state.credentials.retake[t.id] = age;
        ctx.log(`You completed ${cred.name} training but failed the final exam. You can retest within ${RETAKE_WINDOW} years without repeating the training.`, '📝', 'bad');
        ctx.emit('credential:failed', { id: t.id, training: true });
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

    /** Exam-prep course: costs about a fifth of the credential and boosts your next attempt. */
    prep(ctx, id) {
      const { state } = ctx;
      const cred = getCredential(id);
      if (state.credentials.held[id]?.status === 'active' || hasCredential(state, id)) return ctx.toast('You already hold it.', 'warn');
      if (state.credentials.prep[id]) return ctx.toast('You already took a prep course.', 'warn');
      const cost = prepCost(cred);
      if (!ctx.spend(cost, `${cred.name} prep course`, { credit: true })) return ctx.toast(`A prep course costs $${cost.toLocaleString()}.`, 'warn');
      state.credentials.prep[id] = true;
      ctx.stat('stress', 2);
      ctx.log(`You took a prep course for the ${cred.name} exam.`, '📚');
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

    /** Carry a state credential into the state you now live in. */
    transfer(ctx, id) {
      const { state } = ctx;
      const t = transferStatus(state, id);
      if (!t.needed) return;
      if (yearlyCount(state, `cred.transfer.${id}`)) return ctx.toast('One transfer attempt per year.', 'warn');
      bumpYearly(state, `cred.transfer.${id}`);
      const cred = getCredential(id);
      ctx.spend(t.cost, `${cred.name} transfer`, { allowDebt: true });
      const here = stateIdOf(state);
      const stat = state.stats[cred.exam.stat] ?? 50;
      if (t.exam && !ctx.rng.chance(clamp(0.92 - t.difficulty + (stat - 50) / 120, 0.1, 0.97))) {
        ctx.log(`You failed the ${STATES[here].name} ${t.method === 'transferExam' ? 'reciprocity exam' : 'licensing exam'} for your ${cred.name}.`, '📝', 'bad');
        return ctx.toast('Transfer exam failed', 'bad');
      }
      state.credentials.held[id].states.push(here);
      ctx.log(`Your ${cred.name} is now valid in ${STATES[here].name}${t.method === 'motion' && !t.exam ? ' (admitted by motion)' : ''}.`, cred.icon, 'good');
      ctx.toast(`Transferred: ${cred.name}`, 'good');
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
