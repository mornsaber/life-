/**
 * Changing your career field in uniform.
 *
 *   Retraining     Enlisted members (through E-6) re-class into another job
 *                  at reenlistment; junior officers (through O-3) apply to
 *                  change branch or designator. Cyber needs the aptitude and
 *                  a TS/SCI; flight school needs an aviation aptitude test,
 *                  an age limit and a selection board, and aviators owe
 *                  years of service for their wings.
 *   Warrant        Experienced NCOs apply to become warrant officers, the
 *   officers       technical experts of their field (Army helicopter pilots
 *                  come from anywhere, even straight from civilian life).
 *   Branch detail  Army lieutenants headed for some support branches first
 *                  serve two years in a combat arms branch, then move over.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { MOS, mosFor, mosOf, mosEligibility, directGrade } from './MOS.js';
import { requiredClearance, completeTraining, specialtyName, rankOf } from './MilitaryEngine.js';
import { hasClearance, adjudicate } from '../publicservice/PublicServiceEngine.js';

export const RETRAIN_GRADES = { enlisted: 5, officer: 2 };
export const FLIGHT_MAX_AGE = 32;
export const AVIATOR_OBLIGATION = 8;
const RETRAIN_GAP = 3;

const isFlight = (m) => Boolean(m?.pilot) && m.track !== 'enlisted';

/** Can you move into this job? */
export function retrainEligibility(state, mosId) {
  const svc = state.military.service;
  const m = MOS[mosId];
  if (!svc || !m) return { ok: false, reason: 'Unknown job' };
  if (svc.isNew) return { ok: false, reason: 'Finish initial training first' };
  if (m.branch !== svc.branch || m.track !== svc.track) return { ok: false, reason: 'Another branch or track' };
  if (svc.mos === mosId) return { ok: false, reason: 'Your current job' };
  if (m.selection || m.sofOnly) return { ok: false, reason: 'Through a selection pipeline only' };
  if (svc.sof) return { ok: false, reason: 'Leave your special operations unit first' };
  if (svc.track === 'warrant') return { ok: false, reason: 'Warrant officers stay in their field' };
  if (svc.grade > RETRAIN_GRADES[svc.track]) return { ok: false, reason: 'Too senior to change fields' };
  if (svc.yearsOfService - (svc.priorYears ?? 0) < 2) return { ok: false, reason: 'After two years in your first job' };
  if (svc.lastRetrain != null && state.character.age - svc.lastRetrain < RETRAIN_GAP) return { ok: false, reason: `Once every ${RETRAIN_GAP} years` };
  if (yearlyCount(state, 'military.retrain')) return { ok: false, reason: 'One packet a year' };
  if (m.direct && directGrade(state, m) == null) return { ok: false, reason: 'Needs the civilian license first' };
  if (isFlight(m) && state.character.age > FLIGHT_MAX_AGE) return { ok: false, reason: `Flight school: age ${FLIGHT_MAX_AGE} or under` };
  const fit = mosEligibility({ ...state, character: { ...state.character, age: Math.min(state.character.age, 30) } }, m);
  if (!fit.ok) return fit;
  return { ok: true };
}

/** Odds the board approves your packet. */
export function retrainOdds(state, mosId) {
  const svc = state.military.service;
  const m = MOS[mosId];
  const base = isFlight(m) ? 0.3 : m.specialty === 'cyber' ? 0.45 : 0.6;
  return clamp(base + (svc.eval - 60) / 100 + (state.stats.smarts - 55) / (isFlight(m) || m.specialty === 'cyber' ? 150 : 400), 0.05, 0.92);
}

export function retrain(ctx, mosId) {
  const { state, rng } = ctx;
  const check = retrainEligibility(state, mosId);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'military.retrain');
  const svc = state.military.service;
  const m = MOS[mosId];
  // Aviation aptitude test (SIFT / ASTB / AFOQT) first.
  if (isFlight(m) && !rng.chance(clamp(0.45 + (state.stats.smarts - 55) / 60, 0.1, 0.95))) {
    ctx.log('You didn\'t score high enough on the aviation aptitude test.', '✈️', 'warn');
    return false;
  }
  if (!rng.chance(retrainOdds(state, mosId))) {
    ctx.log(`The board didn't approve your packet for ${m.title}. You can apply again next year.`, '📋', 'warn');
    return false;
  }
  const level = requiredClearance({ track: svc.track, specialty: m.specialty, mos: m.id });
  if (level && !hasClearance(state, level)) {
    const r = adjudicate(state, level, true, rng);
    if (!r.granted) {
      ctx.log(`The ${m.title} job needs a clearance you couldn't get.`, '🚫', 'warn');
      return false;
    }
    ctx.emit('clearance:grant', { level, concealed: false });
  }
  return switchJob(ctx, svc, m, 'retrain');
}

function switchJob(ctx, svc, m, why) {
  const { state } = ctx;
  const old = specialtyName(svc);
  svc.mos = m.id;
  svc.specialty = m.specialty;
  svc.lastRetrain = state.character.age;
  svc.contractYearsLeft = Math.max(svc.contractYearsLeft, isFlight(m) ? AVIATOR_OBLIGATION : 3);
  svc.eval = Math.max(0, svc.eval - 3); // the new-guy penalty
  if (why === 'retrain') ctx.log(`You re-classed from ${old} to ${specialtyName(svc)}${isFlight(m) ? `. After flight school you pinned on your wings, and owe ${AVIATOR_OBLIGATION} years for them` : ' after months of school'}.`, '🔁', 'milestone');
  completeTraining(ctx, svc);
  ctx.toast(`New job: ${m.title}`, 'good');
  return true;
}

/* ------------------------------------------------------------------ */
/* Warrant officers                                                    */
/* ------------------------------------------------------------------ */

export function warrantEligibility(state, mosId) {
  const svc = state.military.service;
  const m = MOS[mosId];
  if (!svc || !m || m.track !== 'warrant' || m.branch !== svc.branch) return { ok: false, reason: 'Unknown job' };
  if (svc.track !== 'enlisted') return { ok: false, reason: 'Enlisted members only' };
  if (svc.isNew) return { ok: false, reason: 'Finish initial training first' };
  if (yearlyCount(state, 'military.warrant')) return { ok: false, reason: 'One packet a year' };
  if (m.sofOnly && svc.sof?.pipeline !== m.sofOnly) return { ok: false, reason: 'From a special operations unit only' };
  if (m.flight) {
    if (state.character.age > FLIGHT_MAX_AGE) return { ok: false, reason: `Flight school: age ${FLIGHT_MAX_AGE} or under` };
  } else {
    if (svc.grade < 4) return { ok: false, reason: 'Sergeant (E-5) or above' };
    if (svc.yearsOfService < 5) return { ok: false, reason: 'Five years of service' };
    if (state.character.age > 46) return { ok: false, reason: 'Age 46 or under' };
    if (m.feeder && !m.feeder.includes(svc.specialty)) return { ok: false, reason: 'Needs experience in the field' };
  }
  if (svc.disciplinary > 0) return { ok: false, reason: 'A clean disciplinary record' };
  return mosEligibility({ ...state, character: { ...state.character, age: 30 } }, m);
}

export const warrantOdds = (state, mosId) => clamp(0.3 + (state.military.service.eval - 65) / 80 + (state.stats.smarts - 55) / 300 + (MOS[mosId].flight ? 0 : 0.1), 0.05, 0.9);

export function applyWarrant(ctx, mosId) {
  const { state, rng } = ctx;
  const check = warrantEligibility(state, mosId);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'military.warrant');
  const svc = state.military.service;
  const m = MOS[mosId];
  if (!rng.chance(warrantOdds(state, mosId))) {
    ctx.log(`The warrant officer board didn't select your packet for ${m.title}.`, '📋', 'warn');
    return false;
  }
  svc.track = 'warrant';
  svc.grade = 0;
  svc.yearsInGrade = 0;
  svc.passovers = 0;
  ctx.log(`You were selected for Warrant Officer Candidate School and appointed ${rankOf(svc).title}.`, '🎖️', 'milestone');
  return switchJob(ctx, svc, m, 'warrant');
}

/* ------------------------------------------------------------------ */
/* Army branch detail                                                  */
/* ------------------------------------------------------------------ */

/** Support branches whose new lieutenants can be detailed to combat arms first. */
export const DETAIL_FROM = ['army.35D', 'army.90A', 'army.70B', 'guard.35D', 'guard.90A', 'guard.70B'];
const DETAIL_TO = { army: ['army.11A', 'army.12A'], guard: ['guard.11A', 'guard.12A'] };
export const DETAIL_YEARS = 2;

/** At commissioning: offer a branch detail. */
export function offerBranchDetail(ctx, svc) {
  if (svc.track !== 'officer' || !DETAIL_FROM.includes(svc.mos) || svc.direct) return;
  ctx.prompt({
    type: 'military.branchDetail',
    icon: '🔀',
    title: 'Branch Detail',
    text: `The Army offers you ${mosOf(svc).title} for your career if you first serve ${DETAIL_YEARS} years as an Infantry or Engineer lieutenant. Turn it down, and branching may send you wherever the Army needs officers.`,
    options: [
      { id: 'accept', label: '🔀 Accept the branch detail', hint: `${DETAIL_YEARS} years in combat arms, then your branch` },
      { id: 'decline', label: '🙅 Decline', hint: 'Some risk of a different branch' },
    ],
    data: { home: svc.mos },
  });
}

export function branchDetailTick(ctx, svc) {
  const d = svc.branchDetail;
  if (!d || svc.yearsOfService - (svc.priorYears ?? 0) < d.untilYos) return;
  svc.branchDetail = null;
  const home = MOS[d.home];
  if (!home || home.branch !== svc.branch || svc.track !== 'officer') return;
  svc.mos = home.id;
  svc.specialty = home.specialty;
  ctx.log(`Your branch detail ended. You transferred to your home branch: ${home.title}. The combat arms time stays on your record.`, '🔀', 'milestone');
}

export const CareerFieldActions = {
  retrain: (ctx, mosId) => retrain(ctx, mosId),
  applyWarrant: (ctx, mosId) => applyWarrant(ctx, mosId),
};

export const CareerFieldResolvers = {
  branchDetail(ctx, data, optionId) {
    const { state, rng } = ctx;
    const svc = state.military.service;
    if (!svc || svc.mos !== data.home) return;
    if (optionId === 'accept') {
      const to = MOS[rng.pick(DETAIL_TO[svc.branch] ?? [])];
      if (!to) return;
      svc.branchDetail = { home: data.home, untilYos: svc.yearsOfService - (svc.priorYears ?? 0) + DETAIL_YEARS };
      svc.mos = to.id;
      svc.specialty = to.specialty;
      svc.eval = Math.min(100, svc.eval + 3);
      ctx.log(`You accepted a branch detail: ${DETAIL_YEARS} years as a ${to.title} before moving to your branch.`, '🔀', 'good');
    } else if (rng.chance(0.3)) {
      const pick = mosFor(svc.branch, 'officer').filter((m) => !m.direct && !m.selection && m.id !== svc.mos && ['logistics', 'engineer', 'infantry'].includes(m.specialty))[0];
      if (!pick) return;
      svc.mos = pick.id;
      svc.specialty = pick.specialty;
      ctx.log(`Branching didn't go your way: the Army needed you as a ${pick.title}.`, '🔀', 'warn');
    } else ctx.log('You kept your branch without a detail.', '🔀');
  },
};

/** Jobs you could retrain into, and warrant jobs you could apply for (for the UI). */
export const retrainTargets = (svc) => mosFor(svc.branch, svc.track).filter((m) => m.id !== svc.mos && !m.selection && !m.sofOnly);
export const warrantTargets = (svc) => mosFor(svc.branch, 'warrant');
