/**
 * Officer pipelines through college: ROTC (scholarship or not, alongside a
 * normal degree) and the federal service academies (free tuition, barracks,
 * a congressional nomination to get in). Both commission you as an officer
 * at graduation through the military module; scholarship cadets and academy
 * graduates owe active-duty service, and quitting after contracting means
 * repaying the scholarship.
 */
import { nominationBonus } from '../education/K12.js';
import { BRANCHES, SPECIALTIES, enlist, specialtyName } from '../military/MilitaryEngine.js';
import { hasFelony, yearlyCount, bumpYearly, visibleRecord } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { onCampus } from './Network.js';
import { moveIntoDorm } from './HousingDorms.js';

export const ROTC_BRANCHES = ['army', 'navy', 'airforce'];
export const ACADEMIES = {
  army: { name: 'U.S. Military Academy (West Point)', icon: '🏰' },
  navy: { name: 'U.S. Naval Academy (Annapolis)', icon: '⚓' },
  airforce: { name: 'U.S. Air Force Academy', icon: '🛩️' },
  coastguard: { name: 'U.S. Coast Guard Academy', icon: '🛟' },
};
export const OBLIGATION = { rotcScholarship: 4, rotc: 3, academy: 5 };

export function rotcEligibility(state, branch) {
  const e = state.education.enrolled;
  if (!ROTC_BRANCHES.includes(branch)) return { ok: false, reason: 'Unknown branch' };
  if (!e || e.programId !== 'bachelor' || !onCampus(state)) return { ok: false, reason: "Full-time bachelor's students on campus" };
  if (state.campus.academy) return { ok: false, reason: 'Academy cadets are already in uniform' };
  if (state.campus.rotc) return { ok: false, reason: 'Already in ROTC' };
  if (state.military.service) return { ok: false, reason: 'Already serving' };
  if (state.character.age > 26) return { ok: false, reason: 'Must commission by 30' };
  if (hasFelony(state)) return { ok: false, reason: 'Felony record' };
  if (state.stats.fitness < 45 || state.stats.health < 45) return { ok: false, reason: 'Fails the physical' };
  return { ok: true };
}

export function joinRotc(ctx, branch) {
  const { state } = ctx;
  const check = rotcEligibility(state, branch);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  state.campus.rotc = { branch, years: 0, scholarship: false, contracted: false };
  ctx.log(`You joined ${BRANCHES[branch].name} ROTC. 0600 PT starts tomorrow.`, BRANCHES[branch].icon, 'milestone');
}

export function rotcTick(ctx) {
  const { state, rng } = ctx;
  const r = state.campus.rotc;
  if (!r) return;
  r.years += 1;
  ctx.stat('fitness', 2);
  ctx.stat('stress', 2);
  // Scholarships are awarded on fitness and grades; accepting one is a service contract.
  if (!r.scholarship && r.years <= 2 && state.stats.fitness >= 60 && (state.education.enrolled?.gpa ?? 0) >= 2.8 && rng.chance(0.5)) {
    r.scholarship = true;
    r.contracted = true;
    state.campus.scholarships.push({ id: 'rotc', name: `${BRANCHES[r.branch].name} ROTC scholarship`, full: true, minGpa: 2.5 });
    ctx.log(`You earned a ${BRANCHES[r.branch].name} ROTC scholarship — full tuition, in exchange for ${OBLIGATION.rotcScholarship} years of active duty.`, '🎖️', 'good');
  }
  if (r.years >= 3) r.contracted = true;
}

/** Leaving ROTC/academy before commissioning. Contracted scholarship cadets repay what they received. */
export function leavePipeline(ctx, reason) {
  const { state } = ctx;
  const c = state.campus;
  const s = c.scholarships.find((x) => x.id === 'rotc' || x.id === 'academy');
  const owed = c.rotc?.contracted || c.academy ? Math.round(s?.received ?? 0) + (c.academy && (c.academyYears ?? 0) >= 2 ? 50000 : 0) : 0;
  if (c.rotc) ctx.log(`You left ROTC${reason ? ` (${reason})` : ''}.`, '🎖️', 'warn');
  if (c.academy) ctx.log(`You separated from the ${ACADEMIES[c.academy].name}${reason ? ` (${reason})` : ''}.`, '🎖️', 'warn');
  if (owed > 0) {
    state.finances.loans += owed;
    ctx.log(`The government recouped $${owed.toLocaleString()} in education costs (added to your loans).`, '🧾', 'bad');
  }
  c.rotc = null;
  c.academy = null;
  c.academyYears = 0;
  c.scholarships = c.scholarships.filter((x) => x.id !== 'rotc' && x.id !== 'academy');
}

export function quitRotc(ctx) {
  if (!ctx.state.campus.rotc) return;
  leavePipeline(ctx, 'disenrolled at your request');
}

/** Congressional nomination for an academy: one try a year. */
export function seekNomination(ctx) {
  const { state, rng } = ctx;
  if (state.campus.nomination) return ctx.toast('You already have a nomination.', 'warn');
  if (state.character.age < 16 || state.character.age > 23) return ctx.toast('Nominations are for ages 16–23.', 'warn');
  if (yearlyCount(state, 'campus.nomination')) return ctx.toast('You already applied this year.', 'warn');
  bumpYearly(state, 'campus.nomination');
  const chance = clamp(0.15 + (state.stats.smarts - 70) / 60 + (state.stats.fitness - 60) / 120 + state.campus.resume * 0.02 + nominationBonus(state) - (visibleRecord(state).length ? 0.3 : 0), 0.02, 0.8);
  if (rng.chance(chance)) {
    state.campus.nomination = true;
    ctx.log('Your congressional representative nominated you to the service academies!', '🏛️', 'milestone');
  } else ctx.log('Your congressional nomination interview went nowhere this year.', '🏛️', 'warn');
}

export function academyPrompt(ctx) {
  ctx.prompt({
    type: 'campus.academy',
    icon: '⚓',
    title: 'Appointment Offered',
    text: 'You received an appointment. Which academy will you attend?',
    options: Object.entries(ACADEMIES).map(([id, a]) => ({ id, label: `${a.icon} ${a.name}` })),
  });
}

export function resolveAcademy(ctx, _data, branch) {
  const { state } = ctx;
  state.campus.academy = branch;
  state.campus.academyYears = 0;
  state.campus.scholarships.push({ id: 'academy', name: 'Academy appointment (tuition-free)', full: true });
  moveIntoDorm(ctx, { quiet: true });
  ctx.log(`Reception Day at the ${ACADEMIES[branch].name}. You took the oath and moved into the barracks.`, ACADEMIES[branch].icon, 'milestone');
}

/** At graduation: choose a specialty and commission. */
export function commissionPrompt(ctx) {
  const { state } = ctx;
  const c = state.campus;
  const branch = c.academy ?? c.rotc?.branch;
  if (!branch) return;
  const obligated = Boolean(c.academy || c.rotc?.contracted);
  const pipeline = c.academy ? 'academy' : c.rotc?.scholarship ? 'rotcScholarship' : 'rotc';
  ctx.prompt({
    type: 'campus.commission',
    icon: '🎖️',
    title: 'Commissioning Day',
    text: `You pin on gold bars as a ${BRANCHES[branch].name} officer. ${obligated ? `You owe ${OBLIGATION[pipeline]} years of active duty.` : 'Your ROTC contract is optional — you can walk away.'}\nChoose your branch specialty:`,
    options: [
      ...Object.entries(SPECIALTIES).map(([id, s]) => ({ id, label: `${s.icon} ${specialtyName({ branch, specialty: id })}`, hint: s.desc, disabled: Boolean(s.minSmarts && state.stats.smarts < s.minSmarts) })),
      ...(obligated ? [] : [{ id: 'decline', label: '🙅 Decline the commission' }]),
    ],
    data: { branch, pipeline },
  });
}

export function resolveCommission(ctx, data, optionId) {
  const { state } = ctx;
  const c = state.campus;
  c.rotc = null;
  c.academy = null;
  c.scholarships = c.scholarships.filter((x) => x.id !== 'rotc' && x.id !== 'academy');
  if (optionId === 'decline') return ctx.log('You turned down your commission.', '🙅');
  if (state.military.service) return;
  if (state.career.job) ctx.emit('career:militaryLeave', { reason: `commissioned in the ${BRANCHES[data.branch].name}` });
  enlist(ctx, { branch: data.branch, track: 'officer', component: 'active', specialty: optionId });
  state.military.service.contractYearsLeft = OBLIGATION[data.pipeline];
  state.military.service.source = data.pipeline === 'academy' ? 'academy' : 'rotc';
  c.commissionedVia = state.military.service.source;
}
