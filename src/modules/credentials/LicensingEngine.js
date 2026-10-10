/**
 * Licensing engine: requirement checks, sponsorship (employer / agency /
 * volunteer-unit training budgets), multi-year training, exams, renewals,
 * suspensions and revocations. Every credential in the game flows through
 * here.
 *
 * state.credentials = {
 *   held:     { [id]: { earnedAge, status: 'active'|'suspended'|'expired'|'revoked', until?, renewedAge, sponsor,
 *               revokedAge?, revokedFor?, permanent?, denials?, nextPetition?, approved?, probationUntil? } },
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
import { meetsEducation, hasFelony, yearsInProfession, yearlyCount, bumpYearly, canAfford, visibleRecord } from '../../core/State.js';
import { OFFENSES } from '../legal/Offenses.js';
import { clamp } from '../../core/Random.js';
import { CREDENTIALS, getCredential, credentialName, FLIGHT_BLOCK, REQUIRED_BY } from './CredentialRegistry.js';
import { stateIdOf, countryIdOf } from '../life/Regions.js';
import { recognitionRoute, speaksLocal, localLanguage } from '../world/Immigration.js';
import { COUNTRIES } from '../world/Countries.js';
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
/** Countries a held credential is recognized in (the countries of the places it's valid). */
export const heldCountries = (held) => [...new Set((held.states ?? []).map((s) => STATES[s]?.country ?? 'US'))];

export function validHere(state, id, held = state.credentials.held[id]) {
  const cred = CREDENTIALS[id];
  // Earned in another country: it needs recognizing here first.
  if (held?.states?.length && !heldCountries(held).includes(countryIdOf(state))) return false;
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
  const here = countryIdOf(state);
  if (!heldCountries(held).includes(here)) {
    // Foreign credentials: exchange, EU mutual recognition, or an assessment and exam.
    const route = recognitionRoute(id, heldCountries(held), here);
    const blocked = route.language && !speaksLocal(state, here) ? `Needs fluent ${localLanguage(here)}` : null;
    return { needed: true, foreign: true, method: route.method, cost: Math.max(150, Math.round((cred.cost || 400) * route.costMult)), exam: route.exam, difficulty: route.difficulty ?? 0, blocked };
  }
  const method = cred.reciprocity;
  if (method === 'motion' && yearsInProfession(state, ['law', 'prosecution', 'publicDefender']) >= 5) return { needed: true, method, cost: 1200, exam: false };
  if (method === 'motion' || method === 'restart') return { needed: true, method, cost: cred.cost, exam: true, difficulty: cred.exam.difficulty };
  return { needed: true, method, cost: Math.max(150, Math.round(cred.cost * 0.4)), exam: true, difficulty: cred.exam.difficulty * 0.5 };
}

export function totalWorkYears(state) {
  const civ = state.career.history.reduce((sum, h) => sum + (h.endAge - h.startAge), 0) + (state.career.job?.yearsAtEmployer ?? 0);
  const mil = state.military.history.reduce((sum, h) => sum + h.yearsOfService - (h.priorYears ?? 0), 0) + (state.military.service ? state.military.service.yearsOfService - (state.military.service.priorYears ?? 0) : 0);
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
  if (req.affiliation && !affiliated(state, req.affiliation)) missing.push(req.affiliation.length > 4 ? 'a job at a law-enforcement, corrections or emergency agency' : `membership in ${req.affiliation.map(affiliationLabel).join(' / ')}`);
  return { ok: missing.length === 0, missing };
}

const AFFILIATION_LABEL = { fire: 'a fire department', airportFire: 'an airport fire department', stateFire: 'the state fire agency', police: 'a police department', statePolice: 'the state police', sar: 'a SAR team', auxiliary: 'the Coast Guard Auxiliary', wildland: 'a wildland crew', ambulance: 'an ambulance corps', parkService: 'the Park Service', gameWarden: 'Fish & Wildlife', forester: 'State Forestry', publicWorks: 'Public Works', ems: 'an EMS agency', corrections: 'Corrections', oig: 'an Inspector General', socialWork: 'social services', cps: 'CPS', cap: 'Civil Air Patrol', cert: 'a CERT team', redcross: 'the Red Cross', skiPatrol: 'a ski patrol', mrc: 'the Medical Reserve Corps', sheriff: 'a sheriff\'s office', jail: 'a county jail', federalPrisons: 'the Bureau of Prisons', privatePrisons: 'a private prison', privatePolice: 'a private police force', transitPolice: 'the transit police', probation: 'probation & parole', dispatch: 'a 911 center', fbi: 'the FBI', dea: 'the DEA', atf: 'the ATF', usms: 'the Marshals', usss: 'the Secret Service' };
const affiliationLabel = (id) => AFFILIATION_LABEL[id] ?? id;

/** Agency-internal courses are only open to members: your job's profession or an active volunteer service. */
export function affiliated(state, ids) {
  if (ids.includes(state.career.job?.professionId)) return true;
  return ids.some((id) => state.emergency[id] && id !== 'history' && !state.emergency[id].onLeave);
}

const LEVEL_LABEL = { highschool: 'high school diploma', associate: "associate's", bachelor: "bachelor's", master: "master's", doctorate: 'doctorate' };
const PROGRAM_LABEL = { mortuaryScience: 'mortuary science degree', mls: 'MLIS (library science)', machinistTech: 'machining diploma', jd: 'J.D.', md: 'M.D.', mba: 'MBA', paralegal: 'paralegal certificate', teacherPrep: 'teacher-prep program', electricalTech: 'electrical tech diploma', msAccounting: 'M.S. Accounting', premedPostbacc: 'pre-med post-bacc', maritimeAcademy: 'maritime academy degree', dds: 'D.D.S.', dpt: 'D.P.T.', paMaster: 'PA master\'s', dvm: 'D.V.M.', autoTech: 'automotive tech diploma', mph: 'MPH', crnaProgram: 'nurse anesthesia doctorate', counselingMaster: 'counseling master\'s', psyd: 'psychology doctorate', dieteticsMS: 'dietetics master\'s', radiologyTech: 'radiologic technology degree', respiratoryTech: 'respiratory care degree', dentalHygieneProgram: 'dental hygiene degree', mot: 'OT master\'s', slpMaster: 'SLP master\'s', od: 'O.D.', dc: 'D.C.', solarTech: 'solar technician certificate', interpreterCert: 'interpreting certificate' };

export function describeEducation(req) {
  if (!req) return '';
  if (req.anyOf) return req.anyOf.map(describeEducation).join(' or ');
  if (req.program) return PROGRAM_LABEL[req.program] ?? req.program;
  return `${LEVEL_LABEL[req.level] ?? req.level}${req.majors?.length ? ` (${req.majors.join('/')})` : ''}`;
}

/** Who will pay for this credential, if anyone? Returns null or { type, label, left, serviceId? }. */
export function findSponsor(state, credential) {
  const job = state.career.job;
  if (job && credential.academy?.includes(job.professionId)) return { type: 'employer', label: `${job.employer.name} academy`, left: Infinity, academy: true };
  // Credentials your own career ladder requires: the employer pays from its operating budget, not the training budget.
  const id = credential.id ?? Object.keys(CREDENTIALS).find((k) => CREDENTIALS[k] === credential);
  if (job && REQUIRED_BY[id]?.has(job.professionId) && (credential.sponsors?.professions?.includes(job.professionId) || credential.sponsoredOnly)) {
    return { type: 'employer', label: job.employer.name, left: Infinity, required: true };
  }
  const s = credential.sponsors;
  if (!s) return null;
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
  if (held?.status === 'revoked') return { ok: false, reason: held.permanent ? 'Permanently revoked' : 'Revoked — petition the board for reinstatement' };
  if (held?.status === 'suspended') return { ok: false, reason: `Suspended until ${held.until}` };
  if (held?.status === 'expired') return { ok: false, reason: 'Expired — renew it' };
  if (hasCredential(state, id)) return { ok: false, reason: 'Covered by a higher credential' };
  if (cred.grantedBy) return { ok: false, reason: cred.grantedBy };
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

function revoke(ctx, id, status, years, reason, { offenseId = null, permanent = false } = {}) {
  const { state } = ctx;
  const held = state.credentials.held[id];
  if (!held || held.status === 'revoked') return;
  // Breaking the terms of a reinstatement ends it for good.
  const onProbation = held.probationUntil != null && state.character.age <= held.probationUntil;
  held.status = status;
  if (status === 'suspended') held.until = state.character.age + years;
  if (status === 'revoked') {
    Object.assign(held, { revokedAge: state.character.age, revokedFor: offenseId, approved: false, nextPetition: null });
    if (permanent || onProbation || PERMANENT_ON[offenseId]?.includes(id)) held.permanent = true;
  }
  const cred = getCredential(id);
  ctx.log(`Your ${cred.name} was ${status === 'revoked' ? `${held.permanent ? 'permanently ' : ''}revoked` : `suspended for ${years} yr`} (${reason})${onProbation && status === 'revoked' ? ' — you were still on probation from your reinstatement' : ''}.`, '🚫', 'bad');
}

/* ------------------------------------------------------------------ */
/* Reinstatement after revocation                                      */
/* ------------------------------------------------------------------ */

/**
 * Getting a revoked license back is possible but hard. You wait years
 * (longer for licenses than certifications, longer for fraud), keep a clean
 * record and finish any sentence, then petition the board with a lawyer.
 * Most petitions are denied; three denials end it. An approval means
 * retaking the exam and years of probation — any new conviction during that
 * time revokes it permanently. Internal agency credentials, and officers
 * decertified for excessive force, can never be reinstated.
 */
export const REINSTATE_WAIT = { license: 5, certification: 3, endorsement: 3 };
export const MAX_DENIALS = 3;
export const REINSTATE_PROBATION = 3;
const FRAUD = ['prescriptionFraud', 'securitiesFraud', 'insiderTrading', 'taxEvasion', 'falsifiedInspection', 'prosecutorialMisconduct'];
/** Offenses after which a particular credential is gone for good. */
const PERMANENT_ON = { excessiveForce: ['post', 'postReserve'] };

const waitYears = (cred, held) => (REINSTATE_WAIT[cred.kind] ?? 4) + (FRAUD.includes(held.revokedFor) ? 2 : 0);
/** The conviction behind the revocation, if it's still on your visible record. */
function causeOnRecord(state, held) {
  return visibleRecord(state).find((r) => r.age === held.revokedAge && (!held.revokedFor || r.offenseId === held.revokedFor) && r.severity !== 'infraction') ?? null;
}
export const petitionCost = (cred) => Math.max(1500, Math.round(cred.cost * 0.5)) + 5000;

/** Can you petition (or, once approved, re-sit the exam) to get a revoked credential back? */
export function reinstatementStatus(state, id) {
  const held = state.credentials.held[id];
  const cred = getCredential(id);
  if (held?.status !== 'revoked') return { ok: false, reason: 'Not revoked' };
  if (held.permanent || cred.kind === 'internal') return { ok: false, permanent: true, reason: cred.kind === 'internal' ? 'Agency credentials are never reissued' : 'Permanently revoked' };
  const age = state.character.age;
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (state.legal.probationYears > 0) return { ok: false, reason: 'Finish probation or parole first' };
  if (held.approved) return { ok: true, exam: true, cost: retakeCost(cred), odds: passChance(state, cred) };
  const ready = (held.revokedAge ?? age) + waitYears(cred, held);
  if (age < ready) return { ok: false, reason: `The board won't hear a petition until age ${ready}` };
  if (held.nextPetition && age < held.nextPetition) return { ok: false, reason: `Denied — you can petition again at age ${held.nextPetition}` };
  const since = visibleRecord(state).some((r) => r.age > (held.revokedAge ?? 0) && r.severity !== 'infraction' && r.severity !== 'civil');
  if (since) return { ok: false, reason: 'New convictions since the revocation' };
  const cost = petitionCost(cred);
  if (!canAfford(state, cost)) return { ok: false, reason: `A petition and lawyer cost $${cost.toLocaleString()}` };
  return { ok: true, cost, odds: petitionOdds(state, id) };
}

/** The board's odds: time, a cleared record and a clean history help; violence and fraud hurt. */
export function petitionOdds(state, id) {
  const held = state.credentials.held[id];
  const cred = getCredential(id);
  const extra = state.character.age - (held.revokedAge ?? state.character.age) - waitYears(cred, held);
  const cause = causeOnRecord(state, held);
  const violent = held.revokedFor && OFFENSES[held.revokedFor]?.violent;
  return clamp(
    0.18
    + Math.min(0.15, Math.max(0, extra) * 0.03)
    + (cause ? 0 : 0.2) // sealed or pardoned
    + (state.stats.smarts - 60) / 500
    - (violent ? 0.12 : 0)
    - (FRAUD.includes(held.revokedFor) ? 0.06 : 0)
    - (held.denials ?? 0) * 0.04
    - Math.min(0.1, visibleRecord(state).filter((r) => r.severity === 'felony').length * 0.03),
    0.03, 0.6,
  );
}

export function petitionReinstatement(ctx, id) {
  const { state, rng } = ctx;
  const st = reinstatementStatus(state, id);
  if (!st.ok) return ctx.toast(st.reason, 'warn');
  if (yearlyCount(state, `cred.reinstate.${id}`)) return ctx.toast('One try a year', 'warn');
  bumpYearly(state, `cred.reinstate.${id}`);
  const cred = getCredential(id);
  const held = state.credentials.held[id];
  const age = state.character.age;
  if (st.exam) {
    // Approved by the board: pass the exam again and you're licensed, on probation.
    ctx.spend(st.cost, `${cred.name} re-examination`, { credit: true });
    if (!takeExam(ctx, cred)) return ctx.log(`You failed the ${cred.name} exam the board required for reinstatement. You can retest next year.`, '📝', 'bad');
    Object.assign(held, { status: 'active', renewedAge: age, approved: false, probationUntil: age + REINSTATE_PROBATION, reinstated: (held.reinstated ?? 0) + 1 });
    held.states = [stateIdOf(state)];
    ctx.stat('happiness', 8);
    ctx.log(`Your ${cred.name} is reinstated — on probation for ${REINSTATE_PROBATION} years. Any new conviction before age ${held.probationUntil} ends it for good.`, cred.icon, 'milestone');
    return ctx.toast(`Reinstated: ${cred.name}`, 'good');
  }
  ctx.spend(st.cost, `${cred.name} reinstatement petition and attorney`, { credit: true });
  ctx.stat('stress', 6);
  if (rng.chance(st.odds)) {
    held.approved = true;
    ctx.log(`After a hearing, the board granted your petition to reinstate your ${cred.name} — if you pass the exam again.`, '⚖️', 'good');
    return;
  }
  held.denials = (held.denials ?? 0) + 1;
  if (held.denials >= MAX_DENIALS) {
    held.permanent = true;
    return ctx.log(`The board denied your ${cred.name} petition for the ${MAX_DENIALS}rd time and barred further petitions.`, '⚖️', 'bad');
  }
  held.nextPetition = age + 2;
  ctx.log(`The board denied your petition to reinstate your ${cred.name}: ${rng.pick(['not enough evidence of rehabilitation', 'the seriousness of the original misconduct', 'concerns about public protection', 'an incomplete accounting of what happened'])}. You can petition again in two years.`, '⚖️', 'bad');
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
    // Retired credentials (folded into another) carry over to their replacement.
    for (const [id, h] of Object.entries(state.credentials.held ?? {})) {
      const to = CREDENTIALS[id]?.retired;
      if (!to) continue;
      state.credentials.held[to] ??= { ...h };
      delete state.credentials.held[id];
    }
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
      if ((STATES[fromState]?.country ?? 'US') !== (STATES[toState]?.country ?? 'US')) {
        const foreign = Object.entries(state.credentials.held).filter(([cid, h]) => h.status === 'active' && !validHere(state, cid)).map(([cid]) => CREDENTIALS[cid].name);
        if (foreign.length) ctx.log(`Your licenses don't cross borders on their own: ${foreign.join(', ')} must be recognized in ${COUNTRIES[STATES[toState]?.country ?? 'US'].name} before you can use them (see Licenses).`, '🪪', 'warn');
        return;
      }
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
        if (cred.revokeOn?.includes(severity) || cred.revokeOn?.includes(offenseId)) revoke(ctx, id, 'revoked', 0, name, { offenseId });
        else if (held.probationUntil != null && ctx.state.character.age <= held.probationUntil && ['felony', 'misdemeanor'].includes(severity)) revoke(ctx, id, 'revoked', 0, `${name} while on reinstatement probation`, { offenseId, permanent: true });
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

    /** Petition to get a revoked credential back (or re-sit the exam once the board approves). */
    reinstate(ctx, id) {
      petitionReinstatement(ctx, id);
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
      if (t.blocked) return ctx.toast(t.blocked, 'warn');
      if (yearlyCount(state, `cred.transfer.${id}`)) return ctx.toast('One transfer attempt per year.', 'warn');
      bumpYearly(state, `cred.transfer.${id}`);
      const cred = getCredential(id);
      ctx.spend(t.cost, `${cred.name} transfer`, { allowDebt: true });
      const here = stateIdOf(state);
      const stat = state.stats[cred.exam.stat] ?? 50;
      if (t.exam && !ctx.rng.chance(clamp(0.92 - t.difficulty + (stat - 50) / 120, 0.1, 0.97))) {
        ctx.log(`You failed the ${t.foreign ? COUNTRIES[countryIdOf(state)].name : STATES[here].name} ${t.foreign ? 'recognition exam' : t.method === 'transferExam' ? 'reciprocity exam' : 'licensing exam'} for your ${cred.name}.`, '📝', 'bad');
        return ctx.toast('Transfer exam failed', 'bad');
      }
      state.credentials.held[id].states.push(here);
      ctx.log(t.foreign ? `Your ${cred.name} is now recognized in ${COUNTRIES[countryIdOf(state)].name}.` : `Your ${cred.name} is now valid in ${STATES[here].name}${t.method === 'motion' && !t.exam ? ' (admitted by motion)' : ''}.`, cred.icon, 'good');
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
