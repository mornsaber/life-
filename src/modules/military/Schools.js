/**
 * Military schools and qualifications.
 *
 * Professional military education (PME) is a gate: you can't pin on the next
 * grade without the course for it — Basic Leader Course before sergeant,
 * the Captains Career Course before major, staff college before lieutenant
 * colonel, a war college before colonel (names differ by service). When
 * you're due, your command offers a seat; you can also request one.
 *
 * Skill qualifications (Airborne, Air Assault, Ranger School, sniper,
 * combat diver, the expert badges, Drill Sergeant / Instructor duty, the
 * Defense Language Institute) are optional: each one strengthens your file
 * at promotion boards, and some carry special pay.
 *
 * svc.schools = { [schoolId]: ageCompleted }   (PME and qualifications alike)
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { grantCredential, hasCredential } from '../credentials/LicensingEngine.js';

const family = (branch) => (branch === 'marines' ? 'marines' : ['navy', 'coastguard'].includes(branch) ? 'naval' : ['airforce', 'spaceforce'].includes(branch) ? 'air' : 'ground');
const NON_COMBAT = ['usphs', 'noaa'];

/** PME: `forGrade` is the 0-based grade the course qualifies you for. */
export const PME = {
  enlisted: [
    { id: 'pme1', forGrade: 4, names: { ground: 'Basic Leader Course', marines: 'Corporals Course', naval: 'Petty Officer Selectee Leadership Course', air: 'Airman Leadership School' } },
    { id: 'pme2', forGrade: 5, names: { ground: 'Advanced Leader Course', marines: 'Sergeants Course', naval: 'First Class Petty Officer Leadership Course', air: 'NCO Academy' } },
    { id: 'pme3', forGrade: 6, names: { ground: 'Senior Leader Course', marines: 'Career Course', naval: 'Chief Petty Officer Academy', air: 'Senior NCO Academy' } },
    { id: 'pme4', forGrade: 7, names: { ground: 'Master Leader Course', marines: 'Advanced Course', naval: 'Senior Enlisted Academy', air: 'Senior NCO Academy (Advanced)' } },
    { id: 'pme5', forGrade: 8, names: { ground: 'Sergeants Major Academy', marines: 'Sergeants Major Course', naval: 'Command Master Chief Course', air: 'Chief Leadership Course' } },
  ],
  officer: [
    { id: 'opme1', forGrade: 3, names: { ground: 'Captains Career Course', marines: 'Expeditionary Warfare School', naval: 'Department Head School', air: 'Squadron Officer School' } },
    { id: 'opme2', forGrade: 4, names: { ground: 'Command and General Staff College', marines: 'Command and Staff College', naval: 'Naval Command and Staff College', air: 'Air Command and Staff College' } },
    { id: 'opme3', forGrade: 5, names: { ground: 'Army War College', marines: 'Marine Corps War College', naval: 'Naval War College', air: 'Air War College' }, selective: true },
  ],
  warrant: [
    { id: 'wpme1', forGrade: 2, names: { ground: 'Warrant Officer Advanced Course', marines: 'Warrant Officer Career Course', naval: 'Chief Warrant Officer Leadership Course', air: 'Warrant Officer Advanced Course' } },
    { id: 'wpme2', forGrade: 3, names: { ground: 'Warrant Officer Intermediate Level Education', marines: 'Warrant Officer Advanced Course', naval: 'Senior Warrant Officer Course', air: 'Warrant Officer Intermediate Course' } },
    { id: 'wpme3', forGrade: 4, names: { ground: 'Warrant Officer Senior Service Education', marines: 'Chief Warrant Officer 5 Course', naval: 'Warrant Officer Senior Course', air: 'Warrant Officer Senior Course' } },
  ],
};
const PME_LIST = Object.entries(PME).flatMap(([track, list]) => list.map((p) => ({ ...p, track })));

/**
 * Skill qualifications. board: promotion-board points; pay: yearly special pay
 * while serving; base: pass chance before stats.
 */
export const QUALS = {
  airborne: { name: 'Basic Airborne Course', badge: 'Parachutist Badge', icon: '🪂', branches: ['army', 'guard', 'marines', 'navy', 'airforce'], minFitness: 55, base: 0.85, stat: 'fitness', board: 0.02, pay: 1800 },
  airAssault: { name: 'Air Assault School', badge: 'Air Assault Badge', icon: '🚁', branches: ['army', 'guard'], minFitness: 55, base: 0.65, stat: 'fitness', board: 0.02 },
  rangerSchool: { name: 'Ranger School', badge: 'Ranger Tab', icon: '🗡️', branches: ['army', 'guard', 'marines'], minFitness: 65, base: 0.42, stat: 'fitness', board: 0.05, minGrade: { enlisted: 3, officer: 0 } },
  jumpmaster: { name: 'Jumpmaster School', badge: 'Senior Parachutist Badge', icon: '🪂', branches: ['army', 'guard', 'marines', 'navy', 'airforce'], requires: ['airborne'], minGrade: { enlisted: 4, officer: 1 }, base: 0.6, stat: 'smarts', board: 0.02 },
  pathfinder: { name: 'Pathfinder Course', badge: 'Pathfinder Badge', icon: '🧭', branches: ['army', 'guard'], requires: ['airborne'], base: 0.6, stat: 'smarts', board: 0.02 },
  freefall: { name: 'Military Free-Fall Parachutist Course', badge: 'Military Freefall Parachutist Badge', icon: '🪂', branches: ['army', 'navy', 'airforce', 'marines'], requires: ['airborne'], sofOnly: true, base: 0.8, stat: 'fitness', board: 0.02, pay: 2700 },
  combatDiver: { name: 'Combat Diver Qualification Course', badge: 'Combat Diver Badge', icon: '🤿', branches: ['army', 'navy', 'marines', 'airforce'], minFitness: 70, base: 0.5, stat: 'fitness', board: 0.03, pay: 2000 },
  sniper: { name: 'Sniper Course', badge: 'Sniper qualification', icon: '🎯', branches: ['army', 'guard', 'marines'], specialty: ['infantry'], minFitness: 55, base: 0.45, stat: 'smarts', board: 0.03 },
  expertBadge: { name: 'Expert Infantryman / Soldier / Field Medical Badge testing', badge: 'Expert Badge', icon: '🏅', branches: ['army', 'guard'], minFitness: 60, base: 0.35, stat: 'fitness', board: 0.03 },
  sere: { name: 'SERE School (Level C)', badge: 'SERE graduate', icon: '🏕️', branches: ['army', 'navy', 'airforce', 'marines', 'spaceforce', 'coastguard'], base: 0.88, stat: 'fitness', board: 0.01 },
  instructor: { name: 'Drill Sergeant / Drill Instructor / MTI School', badge: 'Drill Sergeant Identification Badge', icon: '📢', branches: ['army', 'guard', 'marines', 'airforce', 'navy', 'coastguard', 'spaceforce'], track: 'enlisted', minGrade: { enlisted: 4 }, maxGrade: { enlisted: 6 }, minFitness: 60, base: 0.7, stat: 'fitness', board: 0.05, pay: 3600 },
  dli: { name: 'Defense Language Institute', badge: 'Foreign language qualification', icon: '🗣️', branches: ['army', 'guard', 'marines', 'navy', 'airforce', 'spaceforce', 'coastguard'], minSmarts: 60, base: 0.65, stat: 'smarts', board: 0.02, pay: 2400, grants: ['languageProficiency'] },
};

export const schoolName = (svc, id) => {
  const pme = PME_LIST.find((p) => p.id === id);
  return pme ? pme.names[family(svc.branch)] : QUALS[id]?.name ?? id;
};

/** The PME you need before your next grade, if any. */
export function requiredPme(svc) {
  if (NON_COMBAT.includes(svc.branch)) return null;
  return PME[svc.track]?.find((p) => p.forGrade === svc.grade + 1) ?? null;
}

/** Old saves: everything up to your current grade is done. */
export function grandfatherSchools(svc) {
  if (svc.schools) return;
  svc.schools = {};
  for (const p of PME[svc.track] ?? []) if (p.forGrade <= svc.grade) svc.schools[p.id] = svc.joinedAge;
}

export const hasSchool = (svc, id) => Boolean(svc.schools?.[id]);
/** Promotion gate: missing PME for the next grade (null when nothing is missing). */
export function pmeBlock(svc) {
  if (!svc.schools) return null; // not yet migrated
  const p = requiredPme(svc);
  return p && !hasSchool(svc, p.id) ? p : null;
}

/** Board points from qualifications (capped). */
export const qualBoardBonus = (svc) => Math.min(0.15, Object.keys(svc.schools ?? {}).reduce((s, id) => s + (QUALS[id]?.board ?? 0), 0));
/** Yearly special pay from qualifications. */
export const qualPay = (svc) => Object.keys(svc.schools ?? {}).reduce((s, id) => s + (QUALS[id]?.pay ?? 0), 0);

export function schoolEligibility(state, id) {
  const svc = state.military.service;
  if (!svc) return { ok: false, reason: 'Not serving' };
  if (svc.isNew) return { ok: false, reason: 'Finish initial training first' };
  if (hasSchool(svc, id)) return { ok: false, reason: 'Already completed' };
  if (yearlyCount(state, 'military.school')) return { ok: false, reason: 'One school a year' };
  const pme = PME_LIST.find((p) => p.id === id);
  if (pme) {
    if (pme.track !== svc.track) return { ok: false, reason: 'Other track' };
    if (svc.grade < pme.forGrade - 1) return { ok: false, reason: 'Not yet in the zone for it' };
    if (pme.selective && svc.eval < 80 && svc.grade < pme.forGrade) return { ok: false, reason: 'Board-selected: needs an 80+ evaluation' };
    return { ok: true };
  }
  const q = QUALS[id];
  if (!q) return { ok: false, reason: 'Unknown school' };
  if (!q.branches.includes(svc.branch)) return { ok: false, reason: 'Not offered to your service' };
  if (q.track && q.track !== svc.track) return { ok: false, reason: q.track === 'enlisted' ? 'NCOs only' : 'Officers only' };
  if (q.sofOnly && !svc.sof) return { ok: false, reason: 'Special operations units only' };
  if (q.specialty && !q.specialty.includes(svc.specialty)) return { ok: false, reason: 'Combat arms only' };
  for (const r of q.requires ?? []) if (!hasSchool(svc, r)) return { ok: false, reason: `Needs ${QUALS[r].name}` };
  const min = q.minGrade?.[svc.track];
  if (min != null && svc.grade < min) return { ok: false, reason: `Rank ${{ officer: 'O', warrant: 'W' }[svc.track] ?? 'E'}-${min + 1}+` };
  const max = q.maxGrade?.[svc.track];
  if (max != null && svc.grade > max) return { ok: false, reason: 'Too senior' };
  if (q.minFitness && state.stats.fitness < q.minFitness) return { ok: false, reason: `Needs ${q.minFitness}+ fitness` };
  if (q.minSmarts && state.stats.smarts < q.minSmarts) return { ok: false, reason: `Needs ${q.minSmarts}+ smarts` };
  return { ok: true };
}

export function passOdds(state, id) {
  const svc = state.military.service;
  const pme = PME_LIST.find((p) => p.id === id);
  if (pme) return clamp(0.82 + (state.stats.smarts - 55) / 250 + (svc.eval - 60) / 400, 0.4, 0.97);
  const q = QUALS[id];
  return clamp(q.base + (state.stats[q.stat] - 60) / 150 + (svc.eval - 60) / 500, 0.08, 0.95);
}

/** Go to school this year. */
export function attendSchool(ctx, id) {
  const { state, rng } = ctx;
  const check = schoolEligibility(state, id);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const svc = state.military.service;
  grandfatherSchools(svc);
  bumpYearly(state, 'military.school');
  const name = schoolName(svc, id);
  ctx.stat('stress', 3);
  if (!rng.chance(passOdds(state, id))) {
    svc.eval = Math.max(0, svc.eval - 2);
    ctx.log(`You didn't make it through ${name}. You can try again next year.`, '📚', 'warn');
    ctx.toast(`Not passed: ${name}`, 'bad');
    return false;
  }
  svc.schools[id] = state.character.age;
  svc.eval = Math.min(100, svc.eval + (QUALS[id] ? 4 : 3));
  const q = QUALS[id];
  for (const c of q?.grants ?? []) if (!hasCredential(state, c)) grantCredential(ctx, c, { sponsor: 'military', silent: true });
  if (q?.stat === 'fitness') ctx.stat('fitness', 2);
  ctx.log(q ? `You graduated from ${name} and earned the ${q.badge}.` : `You graduated from ${name}.`, q?.icon ?? '🎓', 'good');
  ctx.toast(`Graduated: ${name}`, 'good');
  return true;
}

/** Your command offers a seat in the PME you need (once you're close to eligible). */
export function schoolTick(ctx, svc) {
  grandfatherSchools(svc);
  const p = pmeBlock(svc);
  if (!p || ctx.state.prompts.some((x) => x.type === 'military.schoolSeat')) return;
  if (!schoolEligibility(ctx.state, p.id).ok || !ctx.rng.chance(svc.component === 'active' ? 0.75 : 0.5)) return;
  ctx.prompt({
    type: 'military.schoolSeat',
    icon: '📚',
    title: `School Seat: ${schoolName(svc, p.id)}`,
    text: `You can't be promoted to the next grade without ${schoolName(svc, p.id)}. Your unit has a seat for you.`,
    options: [
      { id: 'attend', label: '🎓 Go to school', hint: `About ${Math.round(passOdds(ctx.state, p.id) * 100)}% to pass` },
      { id: 'defer', label: '⏳ Defer a year', hint: 'Your promotion waits' },
    ],
    data: { id: p.id },
  });
}

export const SchoolActions = {
  attendSchool(ctx, id) { attendSchool(ctx, id); },
};
export const SchoolResolvers = {
  schoolSeat(ctx, data, optionId) {
    if (optionId === 'attend' && ctx.state.military.service) attendSchool(ctx, data.id);
  },
};

export const allSchoolsFor = (svc) => [...(PME[svc.track] ?? []).map((p) => p.id), ...Object.keys(QUALS).filter((id) => QUALS[id].branches.includes(svc.branch))];
