/**
 * Postings within a rank: in a police force a detective isn't a separate career, it's where a
 * constable, a sergeant or an inspector is posted (CID, the detective bureau, the Kripo). The rank
 * stays (and its insignia); the title changes: Police Constable → Detective Constable, Sergeant →
 * Detective Sergeant, Polizeikommissar → Kriminalkommissar. Other postings keep the title and add
 * the work: traffic, the dog section, firearms, Special Branch, training. Fire services post their
 * people to fire investigation and fire prevention, rescue and hazmat; ambulance services to the air
 * ambulance.
 *
 * Each posting has its year (the Metropolitan Police's Detective Branch in 1842, the first police
 * dogs after the Second World War, armed response units from the late 1960s).
 *
 * job.assignment = { id, since }   (job.posting is something else: a duty station abroad)
 * The separate detective rungs of the old ladders are folded into postings (Ladder.js).
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { getProfession } from './JobTrees.js';
import { levelById, isAssignmentLevel, ladderFor } from './Ladder.js';
import { yearNow } from '../world/Eras.js';

const ccOf = (state) => state.character.countryId ?? 'US';
export const POLICE_FAMILY = ['police', 'transitPolice', 'airportPolice', 'universityPolice', 'sheriff', 'statePolice'];
export const FIRE_FAMILY = ['fire', 'airportFire', 'stateFire'];
export const EMS_FAMILY = ['ems'];
const familyOf = (profession) => {
  const id = profession?.template ?? profession?.id;
  return POLICE_FAMILY.includes(id) ? 'police' : FIRE_FAMILY.includes(id) ? 'fire' : EMS_FAMILY.includes(id) ? 'ems' : null;
};

/** Where the detective ranks were founded: CID in London 1842/1878, New York's bureau 1857, the Sûreté 1812. */
const CID_FROM = { GB: 1842, IE: 1858, US: 1857, FR: 1812, DE: 1872, AT: 1872, IT: 1890, ES: 1908, JP: 1881, AU: 1862, CA: 1870, NZ: 1886, IN: 1902, '*': 1880 };
/** The detective branch's own name, where a rank doesn't simply take "Detective". */
const CID_NAME = { GB: 'CID', IE: 'the Detective Branch', US: 'the Detective Bureau', FR: 'la police judiciaire', DE: 'the Kriminalpolizei', AT: 'the Kriminalpolizei', IT: 'the Squadra Mobile', ES: 'the Policía Judicial', NL: 'the Recherche', BE: 'the Recherche', JP: 'the criminal investigation division', '*': 'the criminal investigation department' };
const ENGLISH = ['US', 'GB', 'IE', 'AU', 'NZ', 'CA', 'ZA', 'IN', 'SG', 'JM', 'NG', 'KE', 'GH', 'PK', 'MY', 'HK', 'MT', 'BS', 'TT', 'BB'];

/** The postings, by service. title(job, base) gives the posted title, or null to keep the rank's. */
export const ASSIGNMENTS = {
  police: [
    { id: 'cid', icon: '🕵️', name: (s) => `Detective work (${CID_NAME[ccOf(s)] ?? CID_NAME['*']})`, from: (s) => CID_FROM[ccOf(s)] ?? CID_FROM['*'], minYears: 2, abilities: ['audit'], pay: 1.04, detective: true,
      blurb: 'Plain clothes, case files, interviews and informants. Murders, robberies and frauds are yours to solve.' },
    { id: 'traffic', icon: '🏍️', name: (s) => (ccOf(s) === 'GB' && yearNow(s) >= 2000 ? 'Roads Policing' : 'Traffic'), from: () => 1925, minYears: 1, blurb: 'Motor patrols, crashes, drink-drivers and the fast roads.' },
    { id: 'k9', icon: '🐕', name: (s) => (ENGLISH.includes(ccOf(s)) && ccOf(s) !== 'US' ? 'the Dog Section' : 'K-9'), from: () => 1946, minYears: 2, blurb: 'You and your dog: tracking, searches and the fights nobody else can break up.' },
    { id: 'armed', icon: '🎯', name: (s) => (ccOf(s) === 'US' ? 'SWAT' : ccOf(s) === 'GB' ? 'Firearms (armed response)' : 'the tactical unit'), from: (s) => (ccOf(s) === 'US' ? 1968 : 1966), minYears: 3, pay: 1.03, blurb: 'Armed response, raids and sieges. Long waits, short moments.' },
    { id: 'special', icon: '🗂️', name: (s) => (ccOf(s) === 'GB' || ccOf(s) === 'IE' ? 'Special Branch' : ccOf(s) === 'US' ? 'the Intelligence Division' : 'political intelligence'), from: (s) => (ccOf(s) === 'GB' ? 1883 : 1910), minYears: 4, abilities: ['audit'], detective: true, blurb: 'Anarchists, spies, protection of ministers; files that never see a court.' },
    { id: 'training', icon: '🎓', name: () => 'the training school', from: () => 1890, minYears: 5, blurb: 'Teaching recruits the job you learned the hard way.' },
  ],
  fire: [
    { id: 'investigation', icon: '🔥', name: () => 'Fire Investigation', from: () => 1920, minYears: 3, abilities: ['inspect', 'arrest'], pay: 1.03, blurb: 'Cause and origin: accidents, insurance jobs and arson.' },
    { id: 'prevention', icon: '📋', name: () => 'Fire Prevention', from: () => 1910, minYears: 2, abilities: ['inspect'], blurb: 'Inspections, fire certificates and the talk to every school in town.' },
    { id: 'rescue', icon: '🪢', name: () => 'Technical Rescue', from: () => 1960, minYears: 3, blurb: 'Ropes, collapses, water and cutting people out of wrecks.' },
    { id: 'hazmat', icon: '☣️', name: () => 'Hazardous Materials', from: () => 1975, minYears: 3, blurb: 'Chemical spills, gas leaks and the suits.' },
    { id: 'training', icon: '🎓', name: () => 'the training centre', from: () => 1920, minYears: 5, blurb: 'Teaching recruits the job you learned the hard way.' },
  ],
  ems: [
    { id: 'air', icon: '🚁', name: () => 'the air ambulance', from: (s) => (ccOf(s) === 'US' ? 1972 : 1987), minYears: 3, pay: 1.04, blurb: 'Helicopter medicine: the worst calls, the fastest flights.' },
    { id: 'tactical', icon: '🛡️', name: () => 'tactical medicine', from: () => 1990, minYears: 3, blurb: 'Medics who go in with the armed police.' },
  ],
};

/** The uniformed rank each old detective rung stands for (for saves made before postings). */
const RANK_OF = { detective: ['senior', 'officer', 'deputy', 'trooper'], seniorDetective: ['senior', 'officer'], investigator: ['senior', 'deputy', 'trooper', 'engineer', 'firefighter'], majorCrimes: ['senior', 'trooper'], detSergeant: ['sergeant'], detLieutenant: ['lieutenant'], detCaptain: ['captain'], inspector: ['engineer', 'firefighter'] };
/** The detective rung whose (localised) title a rank takes in CID. */
const DET_OF = { officer: ['detective', 'investigator'], senior: ['detective', 'investigator'], deputy: ['investigator'], trooper: ['investigator'], sergeant: ['detSergeant'], lieutenant: ['detLieutenant'], captain: ['detCaptain'] };

/** The posted title: the detective rung's own title where the service has one, else "Detective" + rank. */
export function assignedTitle(state, job, base = job.baseTitle ?? job.title) {
  const a = job.assignment && defOf(job);
  if (!a) return base;
  const fam = familyOf(getProfession(job.professionId));
  if (a.detective && a.id === 'cid') {
    const prof = getProfession(job.professionId);
    const det = (DET_OF[job.levelId] ?? []).find((id) => job.titleMap?.[id] || prof.levels.some((l) => l.id === id));
    const local = det && (job.titleMap?.[det] ?? prof.levels.find((l) => l.id === det)?.title);
    if (local && !/Senior|Major Case|\(/.test(local)) return local;
    if (ENGLISH.includes(ccOf(state))) {
      const rank = base.replace(/^(Police|Senior Patrol|Patrol|Sheriff's|State)\s+/, '');
      return /^(Officer|Deputy Sheriff|Deputy|Trooper|State Trooper)$/.test(rank) ? 'Detective' : `Detective ${rank}`;
    }
    if (['DE', 'AT', 'CH'].includes(ccOf(state)) && /^Polizei/.test(base)) return base.replace(/^Polizei/, 'Kriminal');
    return `${base} (${CID_NAME[ccOf(state)] ?? CID_NAME['*']})`;
  }
  if (fam === 'fire' && ['investigation', 'prevention'].includes(a.id) && /^(Firefighter|Driver\/Engineer|Fire ?fighter)$/.test(base)) return a.id === 'investigation' ? 'Fire Investigator' : 'Fire Inspector';
  return `${base} (${a.name(state)})`;
}
const defOf = (job) => {
  const fam = familyOf(getProfession(job.professionId));
  return (ASSIGNMENTS[fam] ?? []).find((a) => a.id === job.assignment?.id) ?? null;
};

/** The postings open to you now: [{ def, ok, reason }]. */
export function assignmentsFor(state) {
  const job = state.career?.job;
  if (!job) return [];
  let prof;
  try { prof = getProfession(job.professionId); } catch { return []; }
  const fam = familyOf(prof);
  if (!fam) return [];
  const level = levelById(prof, job.levelId);
  const training = /recruit|cadet|trainee/i.test(job.levelId);
  return ASSIGNMENTS[fam].map((def) => {
    const from = def.from(state);
    const years = job.yearsAtEmployer ?? 0;
    const reason = yearNow(state) < from ? `Not yet (from ${from})`
      : training ? 'Finish your training first'
      : years < def.minYears ? `${def.minYears} years in the job first`
      : (level?.abilities ?? []).includes('exec') ? 'You run the service now'
      : null;
    return { def, ok: !reason, reason };
  });
}

/** Re-apply the posted title and pay after a promotion or a pay review. */
export function applyAssignment(state, job) {
  if (!job) return;
  const a = job.assignment ? defOf(job) : null;
  if (!a) { delete job.assignment; if (job.baseTitle) job.title = job.baseTitle; delete job.baseTitle; delete job.assignmentPay; return; }
  job.baseTitle ??= job.title;
  job.title = assignedTitle(state, job, job.baseTitle);
  if (a.pay) job.assignmentPay = a.pay; else delete job.assignmentPay;
  for (const ab of a.abilities ?? []) if (!job.abilities.includes(ab)) job.abilities.push(ab);
}

/** A job sitting on an old detective rung becomes the matching rank, posted to CID (or fire investigation). */
export function migrateAssignmentLevel(state, job, applyLevel) {
  if (!job) return false;
  let prof;
  try { prof = getProfession(job.professionId); } catch { return false; }
  const level = levelById(prof, job.levelId);
  if (!level || !isAssignmentLevel(prof, level)) return false;
  const ladder = ladderFor(prof, job.employer?.size);
  const rank = (RANK_OF[job.levelId] ?? []).map((id) => ladder.find((l) => l.id === id)).find(Boolean)
    ?? [...ladder].filter((l) => l.grade <= level.grade && !/recruit|cadet|trainee/.test(l.id)).sort((a, b) => b.grade - a.grade)[0];
  if (!rank) return false;
  const fam = familyOf(prof);
  applyLevel(job, rank);
  job.assignment = { id: fam === 'fire' ? (job.levelId === 'inspector' ? 'prevention' : 'investigation') : 'cid', since: state.character.age };
  delete job.baseTitle;
  applyAssignment(state, job);
  return true;
}

export const AssignmentsModule = {
  id: 'assignments',
  order: 9.5,
  setup(engine) {
    engine.bus.on('career:promoted', ({ ctx }) => { const job = ctx?.state.career?.job; if (job?.assignment) { delete job.baseTitle; applyAssignment(ctx.state, job); } });
  },
  actions: {
    /** Ask for a posting. arg: assignment id */
    request(ctx, id) {
      const { state, rng } = ctx;
      const job = state.career?.job;
      const opt = assignmentsFor(state).find((o) => o.def.id === id);
      if (!job || !opt) return;
      if (!opt.ok) return ctx.toast(opt.reason, 'warn');
      if (yearlyCount(state, 'assignments.request')) return ctx.toast('You\'ve already put in for a posting this year.', 'warn');
      bumpYearly(state, 'assignments.request');
      const odds = clamp(0.3 + ((job.performance ?? 55) - 50) / 80 + (job.boss ?? 50) / 400, 0.15, 0.9);
      if (!rng.chance(odds)) return ctx.log(`You put in for ${opt.def.name(state)}. No vacancy this year: someone with a better word from the guv'nor got it.`, opt.def.icon, 'info');
      if (job.assignment) { delete job.assignment; applyAssignment(state, job); }
      job.assignment = { id, since: state.character.age };
      delete job.baseTitle;
      applyAssignment(state, job);
      ctx.log(`You were posted to ${opt.def.name(state)}: you're ${job.title} now.`, opt.def.icon, 'good');
    },
    /** Back to general duties (back into uniform). */
    leave(ctx) {
      const job = ctx.state.career?.job;
      if (!job?.assignment) return;
      const name = defOf(job)?.name(ctx.state) ?? 'your posting';
      delete job.assignment;
      applyAssignment(ctx.state, job);
      ctx.log(`You left ${name} and went back to general duties as ${job.title}.`, '↩️', 'info');
    },
  },
  onAgeUp(ctx) {
    const job = ctx.state.career?.job;
    if (!job) return;
    migrateAssignmentLevel(ctx.state, job, applyLevelRef);
    if (job.assignment) applyAssignment(ctx.state, job);
  },
};

/** Set by CareerEngine (it owns applyLevel); avoids an import cycle. */
let applyLevelRef = (job, level) => { job.levelId = level.id; job.title = level.title; job.track = level.track; job.grade = level.grade; job.abilities = [...level.abilities]; };
export const setApplyLevel = (fn) => { applyLevelRef = fn; };
