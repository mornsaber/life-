/**
 * Clinical careers beyond the ladder: nurses, physician assistants,
 * pharmacists, physical / occupational / speech therapists, respiratory
 * therapists, imaging technologists, dental hygienists and dentists.
 *
 *   Settings     Where you practice — an ICU or a school nurse's office, a
 *                retail pharmacy or a hospital's, outpatient orthopedics or
 *                a nursing home's rehab gym, CT or mammography — sets pay,
 *                pace and the kind of trouble you see. Most specialty units
 *                want a year of experience first.
 *   Shifts       Days, nights (differential), rotating, weekend "Baylor"
 *                shifts, part-time or PRN. Clinics and schools run days.
 *   Specialty    Board certifications that match your setting (CEN in the
 *   boards       ED, CCRN in the ICU, BCPS, OCS, CT/MR…) pay a premium.
 *   Clinical     Rungs I–IV with a raise at each: years of experience,
 *   ladder       professional points (precepting, committees, practice
 *                projects) and, higher up, a specialty board — and for
 *                nurses at IV, a BSN.
 *   Upkeep       Continuing education every two years, or your license
 *                lapses. Some comes with the job; the rest is on you.
 *   Trouble      Unsafe assignments, near misses, drug diversion, red-flag
 *                prescriptions, productivity quotas that shade into
 *                billing fraud, incidental findings, lifting injuries.
 *   Way up/out   Loan repayment at community health centers; experience
 *                that counts toward CRNA, PA, pharmacy and dental school;
 *                RN-to-BSN in a year.
 *
 * state.clinical = { prof, setting, shift, settingAge, ladder, points, ce, ceDueAge, patients, catches, burnout, loanRepaid }
 */
import { clamp } from '../../core/Random.js';
import { addHonor, yearlyCount, bumpYearly, yearsInProfession } from '../../core/State.js';
import { ADMISSION_HOOKS, YEAR_HOOKS } from '../education/EducationEngine.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { recalcSalary } from '../career/Compensation.js';
import { leaveJob } from '../career/CareerEngine.js';

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

// shifts: 'hospital' (round the clock) or 'days'. cert: the board that pays a premium here.
const NURSING_UNITS = {
  medSurg: { name: 'Medical-surgical floor', icon: '🛏️', pay: 1.0, burnout: 5, cert: 'cmsrn', shifts: 'hospital', desc: 'Five or six patients a shift, every kind of illness. Where most nurses start.' },
  stepdown: { name: 'Progressive care (step-down)', icon: '📈', pay: 1.02, burnout: 4, cert: 'pccn', shifts: 'hospital', minYears: 1, desc: 'Telemetry and drips: sicker than the floor, not quite the ICU.' },
  icu: { name: 'Intensive care unit', icon: '🫀', pay: 1.06, burnout: 5, cert: 'ccrn', shifts: 'hospital', minYears: 1, codes: true, desc: 'Two patients, both critically ill. Vents, pressors and codes.' },
  ed: { name: 'Emergency department', icon: '🚨', pay: 1.05, burnout: 6, cert: 'cen', shifts: 'hospital', minYears: 1, codes: true, violence: 0.06, desc: 'Anything through the door, any hour. Fast, loud, sometimes violent.' },
  or: { name: 'Operating room', icon: '🔪', pay: 1.06, burnout: 3, cert: 'cnor', shifts: 'days', oncall: true, desc: 'Circulate and scrub. Days with call, no floor nights.' },
  ld: { name: 'Labor & delivery', icon: '🤰', pay: 1.04, burnout: 4, cert: 'rncOb', shifts: 'hospital', minYears: 1, desc: 'Mostly joy; when it goes wrong, it goes wrong fast.' },
  peds: { name: 'Pediatrics', icon: '🧸', pay: 1.0, burnout: 4, cert: 'cpn', shifts: 'hospital', desc: 'Small patients, worried parents.' },
  oncology: { name: 'Oncology', icon: '🎗️', pay: 1.0, burnout: 5, cert: 'ocn', shifts: 'hospital', desc: 'Chemo, long relationships, and a lot of goodbyes.' },
  psych: { name: 'Inpatient psychiatry', icon: '🧠', pay: 1.0, burnout: 5, cert: 'pmhn', shifts: 'hospital', violence: 0.08, desc: 'De-escalation is the main skill. Assaults are not rare.' },
  ltc: { name: 'Nursing home', icon: '🏚️', pay: 0.94, burnout: 6, shifts: 'hospital', desc: 'Thirty residents and two aides. Chronic understaffing.' },
  homeHealth: { name: 'Home health', icon: '🏠', pay: 0.96, burnout: 2, shifts: 'days', desc: 'Visits in patients\' homes: independence, mileage, and charting at night.' },
  clinic: { name: 'Outpatient clinic', icon: '🏥', pay: 0.9, burnout: 1, shifts: 'days', desc: 'Weekdays, no nights, no holidays. Less pay.' },
  fqhc: { name: 'Community health center', icon: '🤝', pay: 0.92, burnout: 3, shifts: 'days', loanRepay: true, desc: 'Underserved patients — and federal student-loan repayment.' },
  school: { name: 'School nurse', icon: '🏫', pay: 0.78, burnout: 1, shifts: 'days', summers: true, desc: 'Inhalers, insulin and scraped knees. Summers off.' },
};

export const CLINICAL = {
  nursing: {
    group: 'nursing', noun: 'patients', perYear: [250, 700], ce: 30, ladder: true, settings: NURSING_UNITS,
    license: (job) => ({ cna: 'cna', np: 'np', crna: 'crnaLicense' }[job.levelId] ?? 'rn'),
    title: 'Nurse',
  },
  travelNursing: {
    group: 'nursing', noun: 'patients', perYear: [250, 650], ce: 30, ladder: false, settings: NURSING_UNITS,
    license: () => 'rn', title: 'Nurse',
  },
  pharmacy: {
    group: 'pharmacy', noun: 'prescriptions verified', perYear: [25000, 70000], ce: 30, ladder: false,
    license: (job) => (['tech', 'intern'].includes(job.levelId) ? null : 'pharmacistLicense'),
    title: 'Pharmacist',
    settings: {
      retail: { name: 'Chain retail pharmacy', icon: '🏪', pay: 1.0, burnout: 6, shifts: 'hospital', metrics: true, desc: 'Four hundred scripts a day, one technician, a drive-through and a phone that never stops.' },
      independent: { name: 'Independent pharmacy', icon: '🏬', pay: 0.93, burnout: 3, shifts: 'days', desc: 'You know every patient by name — and the owner knows every margin.' },
      hospital: { name: 'Hospital pharmacy', icon: '🏥', pay: 1.03, burnout: 3, cert: 'bcps', shifts: 'hospital', desc: 'Verifying orders, dosing vancomycin, running to codes.' },
      ambulatory: { name: 'Ambulatory care clinic', icon: '🩺', pay: 1.05, burnout: 2, cert: 'bcps', shifts: 'days', minYears: 2, desc: 'Managing diabetes, anticoagulation and hypertension under protocol.' },
      specialty: { name: 'Specialty pharmacy', icon: '🧪', pay: 1.04, burnout: 2, shifts: 'days', desc: 'Biologics and $10,000-a-month drugs; prior authorizations all day.' },
      industry: { name: 'Pharmaceutical industry', icon: '🏢', pay: 1.2, burnout: 2, shifts: 'days', minYears: 3, desc: 'Medical information and drug safety. Business casual.' },
    },
  },
  physicianAssistant: {
    group: 'pa', noun: 'patient visits', perYear: [2500, 4500], ce: 100, ladder: false, license: () => 'paLicense', title: 'PA',
    settings: {
      primaryCare: { name: 'Primary care', icon: '🩺', pay: 0.95, burnout: 3, shifts: 'days', desc: 'Panels of patients you follow for years.' },
      urgentCare: { name: 'Urgent care', icon: '⏱️', pay: 0.98, burnout: 3, shifts: 'days', desc: 'Sore throats, sprains and a steady stream of walk-ins.' },
      em: { name: 'Emergency medicine', icon: '🚨', pay: 1.08, burnout: 5, cert: 'caqPa', shifts: 'hospital', minYears: 1, codes: true, violence: 0.04, desc: 'Fast-track and the main ED, round the clock.' },
      hospitalist: { name: 'Hospital medicine', icon: '🏥', pay: 1.04, burnout: 4, cert: 'caqPa', shifts: 'hospital', desc: 'Admissions, rounds and discharges.' },
      surgery: { name: 'Surgery', icon: '🔪', pay: 1.1, burnout: 4, cert: 'caqPa', shifts: 'days', oncall: true, desc: 'First-assisting in the OR, then rounding on your patients.' },
      ortho: { name: 'Orthopedics', icon: '🦴', pay: 1.07, burnout: 3, shifts: 'days', desc: 'Fractures, injections and post-op clinic.' },
      derm: { name: 'Dermatology', icon: '🧴', pay: 1.18, burnout: 1, shifts: 'days', minYears: 2, desc: 'Skin checks and biopsies; competitive and well paid.' },
      psych: { name: 'Psychiatry', icon: '🧠', pay: 1.03, burnout: 2, cert: 'caqPa', shifts: 'days', desc: 'Medication management; the shortage means a long waitlist.' },
      fqhc: { name: 'Community health center', icon: '🤝', pay: 0.93, burnout: 3, shifts: 'days', loanRepay: true, desc: 'Underserved patients — and federal student-loan repayment.' },
    },
  },
  physicalTherapy: {
    group: 'therapy', noun: 'treatment sessions', perYear: [2000, 3400], ce: 30, ladder: true, title: 'Therapist',
    license: (job) => (job.levelId === 'aide' ? null : 'ptLicense'),
    settings: {
      outpatient: { name: 'Outpatient orthopedics', icon: '🦵', pay: 1.0, burnout: 4, cert: 'ocs', shifts: 'days', desc: 'Knees, backs and shoulders, three patients an hour.' },
      acute: { name: 'Acute care hospital', icon: '🏥', pay: 1.02, burnout: 3, shifts: 'days', desc: 'Getting surgical and ICU patients out of bed.' },
      snf: { name: 'Skilled nursing facility', icon: '🏚️', pay: 1.06, burnout: 5, shifts: 'days', productivity: true, desc: 'Well paid, with productivity targets that never stop rising.' },
      homeHealth: { name: 'Home health', icon: '🏠', pay: 1.12, burnout: 2, shifts: 'days', desc: 'Paid per visit; the best-paid setting if you hustle.' },
      sports: { name: 'Sports medicine', icon: '🏈', pay: 0.96, burnout: 3, cert: 'ocs', shifts: 'days', desc: 'Athletes who actually do their exercises.' },
      peds: { name: 'Pediatric therapy', icon: '🧸', pay: 0.94, burnout: 2, shifts: 'days', desc: 'Early intervention and play-based therapy.' },
      school: { name: 'School-based therapy', icon: '🏫', pay: 0.85, burnout: 1, shifts: 'days', summers: true, desc: 'IEP meetings and summers off.' },
    },
  },
  occupationalTherapy: {
    group: 'therapy', noun: 'treatment sessions', perYear: [1800, 3200], ce: 36, ladder: true, license: () => 'otLicense', title: 'Therapist',
    settings: {
      acute: { name: 'Acute care hospital', icon: '🏥', pay: 1.02, burnout: 3, shifts: 'days', desc: 'Dressing, bathing and safe discharge plans.' },
      snf: { name: 'Skilled nursing facility', icon: '🏚️', pay: 1.06, burnout: 5, shifts: 'days', productivity: true, desc: 'Productivity targets and therapy-minute quotas.' },
      homeHealth: { name: 'Home health', icon: '🏠', pay: 1.1, burnout: 2, shifts: 'days', desc: 'Grab bars, tub benches and paid-per-visit.' },
      handTherapy: { name: 'Hand therapy clinic', icon: '✋', pay: 1.05, burnout: 2, cert: 'cht', shifts: 'days', minYears: 2, desc: 'Splints and tendon repairs.' },
      peds: { name: 'Pediatric clinic', icon: '🧸', pay: 0.95, burnout: 2, shifts: 'days', desc: 'Sensory gyms and fine-motor play.' },
      school: { name: 'School-based therapy', icon: '🏫', pay: 0.86, burnout: 1, shifts: 'days', summers: true, desc: 'Handwriting and IEPs; summers off.' },
    },
  },
  speechPathology: {
    group: 'therapy', noun: 'treatment sessions', perYear: [1600, 3000], ce: 30, ladder: true, license: (job) => (job.levelId === 'cf' ? null : 'cccSlp'), title: 'Therapist',
    settings: {
      school: { name: 'School district', icon: '🏫', pay: 0.88, burnout: 3, shifts: 'days', summers: true, desc: 'A caseload of sixty and a mountain of IEP paperwork. Summers off.' },
      medical: { name: 'Hospital (swallowing & stroke)', icon: '🏥', pay: 1.06, burnout: 3, shifts: 'days', desc: 'Swallow studies and stroke recovery.' },
      snf: { name: 'Skilled nursing facility', icon: '🏚️', pay: 1.05, burnout: 4, shifts: 'days', productivity: true, desc: 'Dysphagia diets and productivity targets.' },
      peds: { name: 'Pediatric clinic', icon: '🧸', pay: 0.98, burnout: 2, shifts: 'days', desc: 'Late talkers, stutters and autism services.' },
    },
  },
  respiratoryTherapy: {
    group: 'rt', noun: 'treatments', perYear: [1500, 4000], ce: 30, ladder: true, license: () => 'rrt', title: 'Respiratory Therapist',
    settings: {
      adultIcu: { name: 'Adult ICU', icon: '🫁', pay: 1.03, burnout: 5, shifts: 'hospital', codes: true, desc: 'Ventilators, ABGs and every code in the building.' },
      nicu: { name: 'Neonatal ICU', icon: '👶', pay: 1.05, burnout: 4, cert: 'nrcpn', shifts: 'hospital', minYears: 1, codes: true, desc: 'One-pound babies on oscillators.' },
      floor: { name: 'General floors', icon: '🛏️', pay: 1.0, burnout: 3, shifts: 'hospital', desc: 'Nebulizers, CPAP and rapid responses.' },
      pulmRehab: { name: 'Pulmonary rehab', icon: '🚶', pay: 0.95, burnout: 1, shifts: 'days', desc: 'Helping COPD patients walk a little farther.' },
      sleepLab: { name: 'Sleep lab', icon: '😴', pay: 0.95, burnout: 3, shifts: 'hospital', desc: 'Watching other people sleep, all night.' },
      homeCare: { name: 'Home respiratory care', icon: '🏠', pay: 0.92, burnout: 2, shifts: 'days', desc: 'Home vents and oxygen setups.' },
    },
  },
  imaging: {
    group: 'imaging', noun: 'studies', perYear: [3000, 7000], ce: 24, ladder: true, license: () => 'arrt', title: 'Technologist',
    settings: {
      xray: { name: 'Diagnostic X-ray', icon: '🩻', pay: 1.0, burnout: 3, shifts: 'hospital', desc: 'Portables in the ICU and the ED\'s broken wrists.' },
      ct: { name: 'CT', icon: '🌀', pay: 1.08, burnout: 3, cert: 'arrtCt', shifts: 'hospital', desc: 'Trauma scans and stroke protocols at 3 a.m.' },
      mri: { name: 'MRI', icon: '🧲', pay: 1.12, burnout: 2, cert: 'arrtMr', shifts: 'hospital', minYears: 1, desc: 'Long scans, claustrophobic patients, and a magnet that never turns off.' },
      ultrasound: { name: 'Ultrasound', icon: '🔊', pay: 1.1, burnout: 3, cert: 'rdms', shifts: 'hospital', minYears: 1, desc: 'Gallbladders, DVTs and first glimpses of babies.' },
      mammo: { name: 'Mammography', icon: '🎀', pay: 1.02, burnout: 1, shifts: 'days', desc: 'Screening clinics; weekdays.' },
      ir: { name: 'Interventional radiology', icon: '🫀', pay: 1.12, burnout: 4, cert: 'arrtCt', shifts: 'days', oncall: true, minYears: 2, desc: 'Cath-lab style procedures, lead aprons and call.' },
      outpatient: { name: 'Outpatient imaging center', icon: '🏢', pay: 0.97, burnout: 1, shifts: 'days', desc: 'Scheduled scans, no traumas.' },
    },
  },
  dentalHygiene: {
    group: 'dental', noun: 'patients', perYear: [1200, 2200], ce: 24, ladder: false, license: (job) => (job.levelId === 'assistant' ? null : 'rdh'), title: 'Hygienist',
    settings: {
      private: { name: 'Private practice', icon: '🦷', pay: 1.0, burnout: 2, shifts: 'days', desc: 'The same families twice a year.' },
      dso: { name: 'Corporate dental group', icon: '🏢', pay: 1.04, burnout: 4, shifts: 'days', quotas: true, desc: 'Better benefits, production targets.' },
      publicHealth: { name: 'Public health / school sealants', icon: '🤝', pay: 0.86, burnout: 1, shifts: 'days', loanRepay: true, desc: 'Sealant vans and community clinics — with loan repayment.' },
    },
  },
  dentistry: {
    group: 'dental', noun: 'patients', perYear: [1500, 2600], ce: 40, ladder: false, license: () => 'dentalLicense', title: 'Dentist',
    settings: {
      private: { name: 'Private practice', icon: '🦷', pay: 1.0, burnout: 3, shifts: 'days', desc: 'Your patients, your pace — and your overhead.' },
      dso: { name: 'Corporate dental group (DSO)', icon: '🏢', pay: 1.06, burnout: 5, shifts: 'days', quotas: true, desc: 'A guaranteed daily rate and production quotas.' },
      fqhc: { name: 'Community health center', icon: '🤝', pay: 0.85, burnout: 2, shifts: 'days', loanRepay: true, desc: 'Medicaid patients, federal loan repayment.' },
      hospital: { name: 'Hospital dentistry', icon: '🏥', pay: 0.95, burnout: 2, shifts: 'days', desc: 'Special-needs patients under anesthesia, and facial trauma call.' },
    },
  },
};

export const SHIFTS = {
  days: { name: 'Day shift', icon: '☀️', pay: 1.0, burnout: 0, desc: 'Normal sleep; the most competition for the line.' },
  nights: { name: 'Night shift', icon: '🌙', pay: 1.1, burnout: 4, hospital: true, desc: 'Night differential; you sleep when everyone else is awake.' },
  rotating: { name: 'Rotating', icon: '🔄', pay: 1.04, burnout: 3, hospital: true, desc: 'Days some weeks, nights others.' },
  weekend: { name: 'Weekend (Baylor) program', icon: '📅', pay: 0.92, burnout: 1, hospital: true, desc: 'Two long weekend shifts paid close to full-time. Weekdays free.' },
  partTime: { name: 'Part-time', icon: '🕐', pay: 0.6, burnout: -3, desc: 'Three days a week; benefits at a cost.' },
  prn: { name: 'PRN (per diem)', icon: '🗓️', pay: 0.55, burnout: -4, desc: 'Higher hourly rate, no guaranteed hours, no benefits.' },
};

/** Clinical ladder rungs: raise, years in the field, professional points. */
export const LADDER = [
  { name: 'Clinical I', raise: 0, years: 0, points: 0 },
  { name: 'Clinical II', raise: 0.025, years: 2, points: 2 },
  { name: 'Clinical III', raise: 0.05, years: 4, points: 5, board: true },
  { name: 'Clinical IV', raise: 0.08, years: 6, points: 9, board: true, bsn: true },
];
export const LOAN_REPAY = 25000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const cl = (state) => state.clinical;
export const clinicalOf = (job) => (job ? CLINICAL[job.professionId] ?? null : null);
export const isAdmin = (job) => Boolean(job?.abilities?.includes('budget'));
const isFrontline = (job) => Boolean(clinicalOf(job)) && !isAdmin(job);

export function settingOf(state, job = state.career.job) {
  const c = clinicalOf(job);
  return c?.settings[cl(state)?.setting] ?? null;
}

/** Certifications this profession values (the ones its settings pay for). */
export function professionBoards(job) {
  const c = clinicalOf(job);
  return c ? [...new Set(Object.values(c.settings).map((s) => s.cert).filter(Boolean))] : [];
}

export function shiftAllowed(state, id, job = state.career.job) {
  const s = settingOf(state, job);
  const sh = SHIFTS[id];
  if (!sh) return false;
  return !sh.hospital || (s?.shifts ?? 'days') === 'hospital';
}

export function settingEligibility(state, id, job = state.career.job) {
  const c = clinicalOf(job);
  const s = c?.settings[id];
  if (!s) return { ok: false, reason: 'Unknown setting' };
  const years = yearsInProfession(state, [job.professionId, ...(job.professionId === 'travelNursing' ? ['nursing'] : job.professionId === 'nursing' ? ['travelNursing'] : [])]);
  if (s.minYears && years < s.minYears) return { ok: false, reason: `Wants ${s.minYears} year${s.minYears > 1 ? 's' : ''} of experience first` };
  return { ok: true };
}

/** Pay multiplier: setting × shift × (1 + ladder raise + board premium). */
export function clinicalPayAdjust(state, job = state.career.job) {
  if (!isFrontline(job)) return 1;
  const c = cl(state);
  const s = settingOf(state, job);
  const sh = SHIFTS[c?.shift] ?? SHIFTS.days;
  const board = s?.cert && hasCredential(state, s.cert) ? 0.04 : 0;
  const ladder = clinicalOf(job).ladder ? LADDER[(c.ladder ?? 1) - 1]?.raise ?? 0 : 0;
  return (s?.pay ?? 1) * sh.pay * (1 + ladder + board);
}

function applyPay(state, job) {
  if (job.headOf || !clinicalOf(job)) return;
  job.payAdjust = clinicalPayAdjust(state, job);
  recalcSalary(state, job);
}

/** Continuing-education hours due every two years. */
export const ceRequired = (job) => clinicalOf(job)?.ce ?? 30;
const inHouseCe = (job) => Math.ceil(ceRequired(job) * 0.2);
const ceBlock = (job) => Math.ceil(ceRequired(job) * 0.6);

export function licenseOf(job) {
  const c = clinicalOf(job);
  return c ? c.license(job) : null;
}

/** Clinical judgment: smarts, experience, boards, the ladder, fatigue. */
export function clinicalSkill(state, job = state.career.job) {
  const c = cl(state);
  const years = yearsInProfession(state, [job?.professionId]);
  const boards = professionBoards(job).filter((b) => hasCredential(state, b)).length;
  return state.stats.smarts * 0.4 + Math.min(25, years * 2.5) + boards * 5 + ((c?.ladder ?? 1) - 1) * 3 - Math.max(0, (c?.burnout ?? 0) - 60) / 3;
}

export function ladderCheck(state, job = state.career.job) {
  const c = cl(state);
  const prof = clinicalOf(job);
  if (!prof?.ladder || isAdmin(job)) return { ok: false, reason: 'No clinical ladder here' };
  const next = LADDER[c.ladder ?? 1];
  if (!next) return { ok: false, reason: 'Top of the ladder' };
  const missing = [];
  const years = yearsInProfession(state, [job.professionId]);
  if (years < next.years) missing.push(`${next.years} years of experience`);
  if ((c.points ?? 0) < next.points) missing.push(`${next.points} professional points (have ${c.points ?? 0})`);
  if (next.board && !professionBoards(job).some((b) => hasCredential(state, b))) missing.push('a specialty board certification');
  if (next.bsn && job.professionId === 'nursing' && !state.education.degrees.some((d) => ['bachelor', 'master', 'doctorate'].includes(d.type) && d.major === 'nursing') && !hasCredential(state, 'np')) missing.push('a BSN');
  return missing.length ? { ok: false, reason: `Needs ${missing.join(', ')}`, next } : { ok: true, next };
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

/*
 * Option effects: perf, burnout, stress, happiness, points, catches, earn
 * (fraction of salary), trauma, injury (chance of a back injury), text.
 * `check`: a clinical-skill target; on a miss, `fail` applies instead.
 * `risk`: { chance, ...effects, suspend (years), offense, fired }.
 */
const EVENTS = {
  nursing: [
    { id: 'unsafe', icon: '⚖️', title: 'Unsafe Assignment', text: 'Two call-outs. The charge nurse hands you seven patients, two of them fresh post-ops.', options: [
      { id: 'take', label: '😮‍💨 Take it and run all night', text: 'You survived it. Barely. Two patients got their meds late.', burnout: 5, stress: 6, risk: { chance: 0.15, perf: -6, text: 'One of your patients fell while you were in another room.' } },
      { id: 'ado', label: '📝 Take it, but file an Assignment Despite Objection', hint: 'Protects your license', text: 'You filed the ADO form. The union rep took a copy to the staffing committee.', burnout: 3, stress: 4, points: 1 },
      { id: 'refuse', label: '🙅 Refuse before taking report', hint: 'Risky with management', tone: 'danger', text: 'The supervisor found a float nurse — and wrote you up.', perf: -8, burnout: -1 },
    ] },
    { id: 'nearMiss', icon: '💉', title: 'Near Miss', text: 'At the bedside you catch it: the insulin you drew up is ten times the dose. The order was ambiguous.', options: [
      { id: 'report', label: '📋 File a safety report', text: 'Pharmacy fixed the order set. Your report went into the hospital\'s safety newsletter, unnamed.', perf: 4, points: 1, catches: 1 },
      { id: 'quiet', label: '🤐 Fix it quietly', text: 'Nobody ever knew. The order set stayed the same.', risk: { chance: 0.2, perf: -4, text: 'A month later another nurse made the same mistake — and the patient was harmed.' } },
    ] },
    { id: 'rapid', icon: '📟', title: 'Something\'s Wrong', text: 'Your patient\'s numbers are "fine," but he\'s confused and clammy, and you don\'t like it.', options: [
      { id: 'rrt', label: '🚨 Call a rapid response', hint: 'Trust your gut', check: 55, text: 'Sepsis, caught early. The ICU team said your call saved him.', perf: 6, catches: 1, happiness: 4, fail: { text: 'Lab work came back normal. The resident rolled her eyes; your charge nurse backed you anyway.', perf: 0 } },
      { id: 'page', label: '📞 Page the resident and keep watching', text: 'The resident ordered labs for the morning. He coded at four.', perf: -4, trauma: 6 },
    ] },
    { id: 'diversion', icon: '🔐', title: 'Missing Narcotics', text: 'A coworker\'s fentanyl wastes never seem to have a witness, and her patients\' pain never seems to improve.', options: [
      { id: 'report', label: '🗣️ Report it to your manager', text: 'She was referred to the nurses\' peer-assistance program — and got treatment.', perf: 3, stress: 4, points: 1 },
      { id: 'ignore', label: '🙈 Stay out of it', text: 'You stayed out of it.', risk: { chance: 0.25, perf: -10, text: 'Investigators found your name as the "witness" on her wastes. You were suspended pending review.', suspend: 1 } },
    ] },
    { id: 'float', icon: '🎈', title: 'Floated', text: 'You\'re floated to a unit you\'ve never worked: pediatric oncology.', options: [
      { id: 'go', label: '🎈 Go, and ask for help', text: 'You leaned on the unit\'s nurses and got through the shift.', burnout: 2, points: 0 },
      { id: 'refuse', label: '🙅 Refuse — outside your competency', text: 'They found someone cross-trained. Your manager noted it.', perf: -3 },
    ] },
    { id: 'family', icon: '👪', title: 'The Family Meeting', text: 'A dying patient\'s children disagree about stopping treatment, and they\'re taking it out on you.', options: [
      { id: 'palliative', label: '🕊️ Call palliative care and sit with them', text: 'They made the decision together. The daughter hugged you on the way out.', happiness: 4, perf: 3, trauma: 2 },
      { id: 'doctor', label: '👩‍⚕️ Leave it to the doctor', text: 'The meeting happened without you.' },
    ] },
  ],
  pharmacy: [
    { id: 'redFlag', icon: '🚩', title: 'Red-Flag Prescription', text: 'Oxycodone 30 mg, #180, from a "pain clinic" two hours away. Paid in cash. Third one like it this week.', options: [
      { id: 'refuse', label: '☎️ Call the prescriber and refuse to fill', hint: 'Corresponding responsibility', text: 'The clinic was raided a month later. Your notes helped.', perf: 3, catches: 1 },
      { id: 'pdmp', label: '🔎 Check the PDMP and report the pattern', text: 'The monitoring database showed five pharmacies in a week. You reported it to the board.', perf: 4, catches: 1, points: 1 },
      { id: 'fill', label: '💊 Fill it — the district manager wants volume', tone: 'danger', text: 'You filled it.', risk: { chance: 0.15, perf: -15, suspend: 1, text: 'The DEA audited the store. Your license was suspended for a year for filling pill-mill prescriptions.' } },
    ] },
    { id: 'metrics', icon: '📊', title: 'Metrics', text: 'Corporate cut your technician hours again, and wants flu shots, phone calls and wait times all in the green.', options: [
      { id: 'push', label: '🏃 Keep up the pace', text: 'You hit every metric.', perf: 4, burnout: 5, risk: { chance: 0.12, perf: -6, text: 'You missed a dangerous interaction in the rush. The patient was hospitalized; the board opened a file.' } },
      { id: 'slow', label: '🐢 Slow down and verify properly', text: 'Wait times went red. The district manager called.', perf: -4, catches: 1 },
      { id: 'walkout', label: '✊ Join the pharmacists\' walkout', hint: 'Collective action', text: 'Stores across the region closed for two days. Corporate promised more technician hours.', burnout: -3, perf: -2, happiness: 3 },
    ] },
    { id: 'interaction', icon: '⚠️', title: 'Dangerous Interaction', text: 'A new antibiotic plus her warfarin. The prescriber didn\'t notice.', options: [
      { id: 'call', label: '📞 Call the prescriber with an alternative', check: 45, text: 'They switched antibiotics. Her INR stayed in range.', perf: 4, catches: 1, fail: { text: 'You couldn\'t reach anyone before closing; she started the drug and ended up in the ER with a bleed.', perf: -2, trauma: 2 } },
      { id: 'counsel', label: '🗣️ Fill it and counsel her to watch for bleeding', text: 'She ended up in the ER a week later.', perf: -5 },
    ] },
  ],
  pa: [
    { id: 'antibiotics', icon: '🦠', title: '"Just Give Me a Z-Pak"', text: 'A viral cold, and a patient who wants antibiotics and threatens a one-star review.', options: [
      { id: 'steward', label: '🧪 Explain why not', text: 'He left unhappy. He got better in a week anyway.', perf: 2, points: 1 },
      { id: 'give', label: '💊 Prescribe it', text: 'Five-star review. Another notch for antibiotic resistance.', perf: 1 },
    ] },
    { id: 'miss', icon: '🩻', title: 'A Subtle Film', text: 'An X-ray of a "sprained wrist." Something about the scaphoid bothers you.', options: [
      { id: 'splint', label: '🦴 Splint it and repeat the film in two weeks', check: 50, text: 'An occult scaphoid fracture. You saved her from a non-union.', perf: 5, catches: 1, fail: { text: 'It was just a sprain — but better safe.', perf: 1 } },
      { id: 'home', label: '🏠 Ice, rest, follow up as needed', text: 'Months later she came back with a non-union and a lawyer.', risk: { chance: 0.5, perf: -8, text: 'The malpractice carrier settled the claim.' } },
    ] },
    { id: 'supervisor', icon: '🤝', title: 'Your Supervising Physician', text: 'Your collaborating physician wants you to see twice as many patients and co-sign without looking.', options: [
      { id: 'boundary', label: '🗣️ Push back on the volume', text: 'You negotiated a cap. He grumbled.', perf: -2, burnout: -3 },
      { id: 'go', label: '🏃 See them all', text: 'You saw thirty-eight patients a day.', perf: 4, burnout: 5, earn: 0.04 },
    ] },
  ],
  therapy: [
    { id: 'productivity', icon: '📈', title: 'Productivity Target', text: 'The rehab company wants 92% productivity and every resident billed at the highest therapy-minute level — whether they need it or not.', options: [
      { id: 'comply', label: '🧾 Bill the minutes', tone: 'danger', text: 'Your numbers looked great.', perf: 6, risk: { chance: 0.12, offense: 'healthcareFraud', text: 'A Medicare audit traced the inflated minutes to your notes.' } },
      { id: 'clinical', label: '🩺 Treat what patients actually need', text: 'Your numbers dipped; your manager "coached" you.', perf: -5, burnout: 2 },
      { id: 'hotline', label: '📢 Report it to compliance', hint: 'Whistleblower', text: 'You called the compliance hotline and documented everything.', risk: { chance: 0.25, whistle: true, text: 'Your complaint became a False Claims Act case.' } },
    ] },
    { id: 'breakthrough', icon: '🚶', title: 'First Steps', text: 'Six months after a spinal cord injury, your patient wants to try walking to her son\'s wedding.', options: [
      { id: 'goal', label: '🎯 Build the whole plan around it', check: 50, text: 'She walked down the aisle. You were invited.', happiness: 10, perf: 5, fail: { text: 'She used the wheelchair, but stood for the first dance. Everyone cried.', happiness: 5, perf: 2 } },
      { id: 'safe', label: '🦽 Set a safer goal', text: 'She made it in her chair, beaming.', happiness: 2 },
    ] },
    { id: 'transfer', icon: '🏋️', title: 'The Heavy Transfer', text: 'A 300-pound patient needs to get from bed to chair, and the lift is broken. No one is free to help.', options: [
      { id: 'wait', label: '⏳ Wait for help and a working lift', text: 'Forty minutes lost, nobody hurt.', perf: -1 },
      { id: 'alone', label: '💪 Do it yourself with good body mechanics', text: 'You got him into the chair.', injury: 0.25 },
    ] },
    { id: 'auth', icon: '📄', title: 'Visit Cap', text: 'Insurance denied more visits for a patient who is close to walking without a walker.', options: [
      { id: 'appeal', label: '✍️ Write the appeal at night', text: 'Approved for eight more visits. She walked out unaided.', perf: 3, burnout: 2, happiness: 3 },
      { id: 'discharge', label: '📋 Discharge with a home program', text: 'She did her exercises. Mostly.' },
    ] },
  ],
  rt: [
    { id: 'extubate', icon: '🫁', title: 'Ready to Come Off?', text: 'Your patient passed the breathing trial, but you\'re not sure about his cough.', options: [
      { id: 'wait', label: '⏳ Recommend one more day', check: 50, text: 'His secretions cleared. He came off cleanly the next morning.', perf: 4, catches: 1, fail: { text: 'One more day on the vent — and a pneumonia.', perf: -2 } },
      { id: 'pull', label: '✅ Extubate', text: 'He did fine.', risk: { chance: 0.25, perf: -3, trauma: 3, text: 'He was reintubated four hours later.' } },
    ] },
    { id: 'surge', icon: '🦠', title: 'Respiratory Surge', text: 'Flu and RSV at the same time. Every ventilator is in use.', options: [
      { id: 'extra', label: '🏥 Work extra shifts at crisis pay', text: 'Double-time for a month. You slept at the hospital twice.', earn: 0.08, burnout: 8 },
      { id: 'normal', label: '🛌 Work your normal shifts', text: 'You held the line on your days.', burnout: 3 },
    ] },
    { id: 'code', icon: '💔', title: 'Code Blue', text: 'Overhead page: code blue, fourth floor. You\'re the airway.', options: [
      { id: 'airway', label: '😷 Bag and help intubate', check: 45, text: 'Good seal, good tube, a pulse back.', perf: 5, catches: 1, fail: { text: 'You did your part. He didn\'t come back.', trauma: 4 } },
    ] },
  ],
  imaging: [
    { id: 'incidental', icon: '🔎', title: 'Incidental Finding', text: 'A CT for kidney stones. You notice a mass in the pancreas the order didn\'t ask about.', options: [
      { id: 'flag', label: '🚩 Flag it for the radiologist now', text: 'The radiologist called the patient\'s doctor that day. Caught early.', perf: 4, catches: 1, happiness: 3 },
      { id: 'queue', label: '📂 Let it go through the normal queue', text: 'The report went out three days later.' },
    ] },
    { id: 'contrast', icon: '💉', title: 'Contrast Reaction', text: 'Thirty seconds after contrast, your patient\'s face swells and she can\'t breathe.', options: [
      { id: 'epi', label: '💉 Call the code team and grab the epinephrine', check: 45, text: 'Epinephrine, oxygen, and she was fine in an hour.', perf: 5, fail: { text: 'It took too long to find the kit. She spent the night in the ICU.', perf: -3, trauma: 4 } },
    ] },
    { id: 'magnet', icon: '🧲', title: 'MRI Zone IV', text: 'A new housekeeper is about to wheel a steel cart toward the MRI door.', options: [
      { id: 'stop', label: '✋ Stop them', text: 'You stopped them at the door. The magnet would have turned the cart into a missile.', perf: 3, catches: 1 },
    ] },
    { id: 'dose', icon: '☢️', title: 'Lead Aprons', text: 'Back-to-back procedures; your back aches under the lead.', options: [
      { id: 'break', label: '🧘 Take your breaks', text: 'You took your breaks.', perf: -1 },
      { id: 'push', label: '💪 Push through', text: 'You pushed through.', injury: 0.15, perf: 2 },
    ] },
  ],
  dental: [
    { id: 'quota', icon: '💰', title: 'Production Quota', text: 'The corporate office wants more "deep cleanings" and crowns. Plenty of these patients don\'t need them.', options: [
      { id: 'upsell', label: '🧾 Recommend them anyway', tone: 'danger', text: 'Production went up 20%.', earn: 0.05, perf: 5, risk: { chance: 0.1, offense: 'healthcareFraud', text: 'A Medicaid audit flagged the billing pattern.' } },
      { id: 'honest', label: '🦷 Treat what\'s there', text: 'Production stayed flat. The regional manager wanted a meeting.', perf: -4 },
    ] },
    { id: 'anxious', icon: '😰', title: 'Terrified Patient', text: 'A man hasn\'t seen a dentist in fifteen years because of fear, and his mouth shows it.', options: [
      { id: 'patient', label: '🫶 Go slowly, explain everything', text: 'He came back for every appointment. He brought his wife.', happiness: 4, perf: 3 },
      { id: 'fast', label: '⏱️ Stay on schedule', text: 'He never came back.' },
    ] },
    { id: 'oral', icon: '🔍', title: 'Suspicious Lesion', text: 'A white patch under the tongue of a longtime smoker.', options: [
      { id: 'refer', label: '📋 Refer for a biopsy today', text: 'Early oral cancer, caught in time.', perf: 4, catches: 1, happiness: 4 },
      { id: 'watch', label: '👀 Watch it until the next cleaning', text: 'Six months later it was bigger.', perf: -3 },
    ] },
    { id: 'ergo', icon: '🦴', title: 'Bent Over Mouths', text: 'Eight hours a day, neck bent. Your hands go numb at night.', options: [
      { id: 'loupes', label: '🔭 Buy ergonomic loupes ($1,800)', text: 'Your neck thanks you.', cost: 1800 },
      { id: 'ignore', label: '💪 Ignore it', text: 'It got worse.', injury: 0.2 },
    ] },
  ],
};

function eventPrompt(ctx, job) {
  const { state, rng } = ctx;
  if (state.prompts.some((p) => p.type === 'clinical.event')) return;
  const c = clinicalOf(job);
  const s = settingOf(state, job);
  let pool = EVENTS[c.group] ?? [];
  // Some trouble depends on where you work.
  if (c.group === 'therapy' && !s?.productivity) pool = pool.filter((e) => e.id !== 'productivity');
  if (c.group === 'pharmacy' && !s?.metrics) pool = pool.filter((e) => e.id !== 'metrics');
  if (c.group === 'dental' && !s?.quotas) pool = pool.filter((e) => e.id !== 'quota');
  if (!pool.length) return;
  const ev = rng.pick(pool);
  ctx.prompt({ type: 'clinical.event', icon: ev.icon, title: ev.title, text: ev.text, options: ev.options.map(({ id, label, hint, tone }) => ({ id, label, hint, tone })), data: { group: c.group, eventId: ev.id } });
}

function applyEffects(ctx, fx, job) {
  const { state, rng } = ctx;
  const c = cl(state);
  if (fx.perf && job) job.performance = Math.round(clamp(job.performance + fx.perf, 0, 100));
  if (fx.burnout) c.burnout = Math.round(clamp((c.burnout ?? 0) + fx.burnout, 0, 100));
  if (fx.stress) ctx.stat('stress', fx.stress);
  if (fx.happiness) ctx.stat('happiness', fx.happiness);
  if (fx.points) c.points = (c.points ?? 0) + fx.points;
  if (fx.catches) c.catches = (c.catches ?? 0) + fx.catches;
  if (fx.earn && job) ctx.earn(Math.round(job.salary * fx.earn), 'Extra clinical pay', { wage: true });
  if (fx.cost) ctx.spend(fx.cost, 'Ergonomic equipment', { credit: true });
  if (fx.trauma) ctx.emit('health:trauma', { amount: fx.trauma, source: 'clinical work' });
  if (fx.injury && rng.chance(fx.injury)) {
    ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(15, 40) });
    ctx.log('You hurt your back at work.', '🦴', 'bad');
  }
  if (fx.suspend && job) {
    const lic = licenseOf(job);
    if (lic) ctx.emit('credential:suspend', { ids: [lic], years: fx.suspend, reason: 'Board action' });
  }
  if (fx.offense) ctx.emit('legal:offense', { offenseId: fx.offense, context: 'billing for care patients didn\'t need', caught: true, evidence: 0.6 });
  if (fx.whistle) {
    const share = rng.int(150000, 900000);
    ctx.earn(share, 'False Claims Act whistleblower award', { retained: true });
    ctx.log(`The government settled; your share as the whistleblower was $${share.toLocaleString()}.`, '⚖️', 'good');
  }
}

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

function setupPrompt(ctx, job) {
  const { state } = ctx;
  if (state.prompts.some((p) => p.type === 'clinical.setup')) return;
  const c = clinicalOf(job);
  ctx.prompt({
    type: 'clinical.setup', icon: getIcon(job), title: 'Where You Practice',
    text: `Which ${job.professionId === 'physicianAssistant' ? 'specialty' : c.group === 'nursing' ? 'unit' : 'setting'} are you working in? (You can transfer later.)`,
    options: Object.entries(c.settings).map(([id, s]) => {
      const ok = settingEligibility(state, id, job);
      return { id, label: `${s.icon} ${s.name}`, hint: ok.ok ? `Pay ×${s.pay} · ${s.desc}` : ok.reason, disabled: !ok.ok };
    }),
  });
}
const getIcon = (job) => ({ nursing: '🩺', pharmacy: '💊', pa: '🩻', therapy: '🦵', rt: '🫁', imaging: '🩻', dental: '🦷' }[clinicalOf(job)?.group] ?? '🏥');

function clinicalTick(ctx, job) {
  const { state, rng } = ctx;
  const c = cl(state);
  const prof = clinicalOf(job);
  if (!c.setting || !prof.settings[c.setting]) {
    c.setting = null;
    setupPrompt(ctx, job);
    return;
  }
  const s = prof.settings[c.setting];
  const sh = SHIFTS[c.shift] ?? SHIFTS.days;
  const admin = isAdmin(job);
  // The work.
  const volume = admin ? 0 : Math.round(rng.int(...prof.perYear) * (c.shift === 'prn' ? 0.35 : c.shift === 'partTime' ? 0.6 : 1) * (prof.group === 'pharmacy' && c.setting !== 'retail' ? 0.5 : 1));
  c.patients = (c.patients ?? 0) + volume;
  if (volume) ctx.log(`${volume.toLocaleString()} ${prof.noun} this year as ${/^[aeiou]/i.test(s.name) ? 'an' : 'a'} ${s.name.toLowerCase()} ${prof.title.toLowerCase()}.`, s.icon);
  // Burnout.
  c.burnout = Math.round(clamp((c.burnout ?? 10) + (admin ? 3 : s.burnout + sh.burnout) - (state.stats.happiness > 70 ? 3 : 0) - (s.summers ? 4 : 0) - 2, 0, 100));
  ctx.stat('stress', 2 + Math.round((admin ? 3 : s.burnout) / 2));
  if (s.summers) ctx.stat('happiness', 3);
  // Violence on some units.
  if (!admin && s.violence && rng.chance(s.violence)) {
    ctx.emit('health:trauma', { amount: 6, source: 'workplace violence' });
    if (rng.chance(0.3)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(10, 30) });
    ctx.log('A patient assaulted you during a shift. Healthcare workers face more workplace violence than police officers.', '🤕', 'bad');
  }
  // Federal loan repayment for underserved settings.
  if (s.loanRepay && state.finances.loans > 0) {
    const paid = Math.min(state.finances.loans, LOAN_REPAY);
    state.finances.loans -= paid;
    c.loanRepaid = (c.loanRepaid ?? 0) + paid;
    ctx.log(`The National Health Service Corps paid $${paid.toLocaleString()} of your student loans for serving an underserved community.`, '🤝', 'good');
  }
  // Continuing education and license renewal.
  const lic = licenseOf(job);
  if (lic && hasCredential(state, lic)) {
    c.ce = Math.min(ceRequired(job) * 2, (c.ce ?? 0) + inHouseCe(job));
    c.ceDueAge ??= state.character.age + 2;
    if (state.character.age >= c.ceDueAge) {
      if ((c.ce ?? 0) >= ceRequired(job)) {
        c.ce = 0;
        c.ceDueAge = state.character.age + 2;
        ctx.log(`You renewed your license: ${ceRequired(job)} hours of continuing education, documented.`, '📜');
      } else {
        c.ceDueAge = state.character.age + 1;
        ctx.emit('credential:suspend', { ids: [lic], years: 1, reason: 'Continuing-education audit' });
        ctx.log(`A continuing-education audit found only ${c.ce} of ${ceRequired(job)} hours. Your license is suspended until you make them up.`, '📜', 'bad');
        job.performance = Math.max(0, job.performance - 10);
      }
    }
  }
  // Events and recognition.
  if (!admin && rng.chance(0.6)) eventPrompt(ctx, job);
  if (!admin && job.performance >= 80 && rng.chance(0.12)) {
    if (prof.group === 'nursing' && !state.honors.some((h) => h.id === 'clinical.daisy')) {
      addHonor(state, { id: 'clinical.daisy', source: 'civil', name: 'DAISY Award for Extraordinary Nurses', icon: '🌼', prestige: 3, precedence: 56, citation: 'Nominated by a patient\'s family for extraordinary, compassionate care.', ribbon: [['#f9d71c', 1], ['#ffffff', 2], ['#f9d71c', 1]] });
      ctx.log('A patient\'s family nominated you, and you received the DAISY Award. The unit had cake.', '🌼', 'honor');
      c.points = (c.points ?? 0) + 1;
    } else if (!state.honors.some((h) => h.id === 'clinical.excellence')) {
      addHonor(state, { id: 'clinical.excellence', source: 'civil', name: 'Clinical Excellence Award', icon: '🏅', prestige: 3, precedence: 57, citation: 'For excellence in patient care, nominated by colleagues.', ribbon: [['#2e7d32', 2], ['#ffffff', 1], ['#2e7d32', 2]] });
      ctx.log('Your colleagues nominated you for the hospital\'s Clinical Excellence Award — and you won.', '🏅', 'honor');
      c.points = (c.points ?? 0) + 1;
    }
  }
  const years = yearsInProfession(state, [job.professionId]);
  if (!admin && years >= 8 && job.performance >= 85 && (c.catches ?? 0) >= 4 && !state.honors.some((h) => h.id === 'clinical.year') && rng.chance(0.08)) {
    addHonor(state, { id: 'clinical.year', source: 'civil', name: `State ${prof.title} of the Year`, icon: '⭐', prestige: 8, precedence: 50, citation: `Named ${prof.title} of the Year by the state professional association.`, ribbon: [['#1a4fa0', 1], ['#f9a825', 2], ['#1a4fa0', 1]] });
    ctx.log(`The state professional association named you ${prof.title} of the Year.`, '⭐', 'honor');
  }
  // Burnout catches up.
  if (c.burnout >= 75 && rng.chance(0.4) && !state.prompts.some((p) => p.type === 'clinical.burnout')) {
    ctx.prompt({
      type: 'clinical.burnout', icon: '🕯️', title: 'Compassion Fatigue',
      text: 'You dread your commute. You cried in the supply closet last week. Healthcare loses a lot of good people this way.',
      options: [
        { id: 'eap', label: '🫂 Use the employee assistance program' },
        { id: 'slower', label: '🌤️ Move to a slower setting or part-time' },
        { id: 'push', label: '💪 Push through' },
        { id: 'leave', label: '🚪 Leave clinical work', tone: 'danger' },
      ],
    });
  }
}

/* ------------------------------------------------------------------ */
/* Bridges                                                             */
/* ------------------------------------------------------------------ */

const fieldYears = (state, ids) => yearsInProfession(state, ids);

/** RN-to-BSN: a working nurse finishes the bachelor's in about a year. */
YEAR_HOOKS.push((state, programId, major) => (programId === 'bachelor' && major === 'nursing' && hasCredential(state, 'rn') && state.education.degrees.some((d) => d.type === 'associate') ? 1 : 0));
ADMISSION_HOOKS.push({
  boost(state, programId) {
    switch (programId) {
      // CRNA programs require critical-care experience in all but name.
      case 'crnaProgram': return Math.min(0.2, fieldYears(state, ['nursing', 'travelNursing']) * 0.04 + (hasCredential(state, 'ccrn') ? 0.06 : 0));
      // PA programs prize hands-on patient-care hours.
      case 'paMaster': return Math.min(0.1, fieldYears(state, ['nursing', 'respiratoryTherapy', 'imaging', 'physicalTherapy']) * 0.025);
      case 'pharmd': return Math.min(0.08, fieldYears(state, ['pharmacy']) * 0.03);
      case 'dds': return Math.min(0.08, fieldYears(state, ['dentalHygiene']) * 0.03);
      case 'dpt': return Math.min(0.06, fieldYears(state, ['physicalTherapy']) * 0.03);
      case 'master': return hasCredential(state, 'rn') ? Math.min(0.08, fieldYears(state, ['nursing', 'travelNursing']) * 0.02) : 0;
      default: return 0;
    }
  },
});

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

const clinicalJob = (ctx) => {
  const job = ctx.state.career.job;
  if (!clinicalOf(job)) { ctx.toast('Clinical jobs only', 'warn'); return null; }
  return job;
};

export const ClinicalModule = {
  id: 'clinical',
  order: 30.86,
  init(state) {
    state.clinical ??= { prof: null, setting: null, shift: 'days', settingAge: null, ladder: 1, points: 0, ce: 0, ceDueAge: null, patients: 0, catches: 0, burnout: 0, loanRepaid: 0 };
  },
  setup(engine) {
    engine.bus.on('career:hired', ({ ctx, job }) => {
      const prof = clinicalOf(job);
      if (!prof) return;
      const c = cl(ctx.state);
      const same = c.prof === job.professionId || (prof.group === 'nursing' && CLINICAL[c.prof]?.group === 'nursing');
      // A new employer means a new unit and a new ladder (you keep half your portfolio).
      c.ladder = 1;
      c.points = same ? Math.floor((c.points ?? 0) / 2) : 0;
      if (!same || !prof.settings[c.setting] || !settingEligibility(ctx.state, c.setting, job).ok) c.setting = null;
      c.prof = job.professionId;
      if (!shiftAllowed(ctx.state, c.shift, job)) c.shift = 'days';
      if (c.setting) applyPay(ctx.state, job);
      else setupPrompt(ctx, job);
    });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const job = state.career.job;
    const c = cl(state);
    if (!clinicalOf(job)) {
      c.burnout = Math.max(0, (c.burnout ?? 0) - 15);
      return;
    }
    if (!job.paidThisYear || state.legal.incarceration) return;
    clinicalTick(ctx, job);
    if (c.setting) applyPay(state, job);
  },
  actions: {
    setting(ctx, id) {
      const job = clinicalJob(ctx);
      if (!job || isAdmin(job)) return;
      const { state } = ctx;
      const c = cl(state);
      const ok = settingEligibility(state, id, job);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      if (c.setting === id) return;
      if (yearlyCount(state, 'clinical.setting')) return ctx.toast('One transfer a year', 'warn');
      if (c.setting && state.character.age - (c.settingAge ?? 0) < 1) return ctx.toast('Give your current unit a year first', 'warn');
      bumpYearly(state, 'clinical.setting');
      c.setting = id;
      c.settingAge = state.character.age;
      if (!shiftAllowed(state, c.shift, job)) c.shift = 'days';
      applyPay(state, job);
      const s = clinicalOf(job).settings[id];
      ctx.log(`You transferred to ${s.name.toLowerCase()}. ${s.desc}`, s.icon, 'milestone');
    },
    shift(ctx, id) {
      const job = clinicalJob(ctx);
      if (!job || isAdmin(job)) return;
      const { state } = ctx;
      if (!shiftAllowed(state, id, job)) return ctx.toast('Not offered in your setting', 'warn');
      if (yearlyCount(state, 'clinical.shift')) return ctx.toast('Schedules change once a year', 'warn');
      bumpYearly(state, 'clinical.shift');
      cl(state).shift = id;
      applyPay(state, job);
      ctx.log(`You moved to ${SHIFTS[id].name.toLowerCase()}. ${SHIFTS[id].desc}`, SHIFTS[id].icon);
    },
    extraShifts(ctx) {
      const job = clinicalJob(ctx);
      if (!job) return;
      const { state, rng } = ctx;
      if (yearlyCount(state, 'clinical.extra') >= 2) return ctx.toast('Twice a year at most', 'warn');
      bumpYearly(state, 'clinical.extra');
      const pay = Math.round(job.salary * rng.float(0.06, 0.11));
      ctx.earn(pay, 'Incentive shifts', { wage: true });
      cl(state).burnout = clamp((cl(state).burnout ?? 0) + 5, 0, 100);
      ctx.stat('stress', 4);
      ctx.log(`You picked up incentive shifts the unit couldn't fill: $${pay.toLocaleString()}.`, '⏰', 'good');
    },
    prn(ctx) {
      const job = clinicalJob(ctx);
      if (!job) return;
      const { state, rng } = ctx;
      const lic = licenseOf(job);
      if (!lic || !hasCredential(state, lic)) return ctx.toast('Needs an active license', 'warn');
      if (yearlyCount(state, 'clinical.prn')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'clinical.prn');
      const pay = Math.round(job.salary * rng.float(0.07, 0.12));
      ctx.earn(pay, 'PRN job at another facility', { wage: true });
      cl(state).burnout = clamp((cl(state).burnout ?? 0) + 4, 0, 100);
      ctx.log(`You worked PRN shifts at another facility on your days off: $${pay.toLocaleString()}.`, '🗓️', 'good');
    },
    precept(ctx) {
      const job = clinicalJob(ctx);
      if (!job) return;
      const { state } = ctx;
      if (yearlyCount(state, 'clinical.precept')) return ctx.toast('One preceptee a year', 'warn');
      if (yearsInProfession(state, [job.professionId]) < 2) return ctx.toast('Precepting takes two years of experience', 'warn');
      bumpYearly(state, 'clinical.precept');
      const c = cl(state);
      c.points = (c.points ?? 0) + 2;
      c.precepted = (c.precepted ?? 0) + 1;
      job.performance = Math.min(100, job.performance + 3);
      ctx.earn(1500, 'Preceptor differential', { wage: true });
      ctx.stat('stress', 2);
      ctx.log('You precepted a new graduate through orientation. She cried twice and thanked you at the end.', '🧑‍🏫', 'good');
    },
    committee(ctx) {
      const job = clinicalJob(ctx);
      if (!job) return;
      const { state } = ctx;
      if (yearlyCount(state, 'clinical.committee')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'clinical.committee');
      cl(state).points = (cl(state).points ?? 0) + 1;
      job.performance = Math.min(100, job.performance + 2);
      ctx.log('You joined the unit practice council: staffing grids, new equipment, and a lot of meetings.', '🗂️');
    },
    project(ctx) {
      const job = clinicalJob(ctx);
      if (!job) return;
      const { state, rng } = ctx;
      if (yearlyCount(state, 'clinical.project')) return ctx.toast('One project a year', 'warn');
      bumpYearly(state, 'clinical.project');
      const c = cl(state);
      if (clinicalSkill(state, job) + rng.int(-20, 20) >= 55) {
        c.points = (c.points ?? 0) + 3;
        c.projects = (c.projects ?? 0) + 1;
        job.performance = Math.min(100, job.performance + 4);
        ctx.stat('smarts', 1);
        ctx.log('Your quality-improvement project cut falls on the unit by a third. You presented the poster at a national conference.', '📊', 'good');
      } else {
        c.points = (c.points ?? 0) + 1;
        ctx.log('Your quality-improvement project fizzled when the data didn\'t show a difference. You still learned how to run one.', '📊');
      }
    },
    ce(ctx) {
      const job = clinicalJob(ctx);
      if (!job) return;
      const { state } = ctx;
      if (yearlyCount(state, 'clinical.ce')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'clinical.ce');
      const c = cl(state);
      c.ce = Math.min(ceRequired(job) * 2, (c.ce ?? 0) + ceBlock(job));
      ctx.stat('smarts', 1);
      ctx.log(`You completed ${ceBlock(job)} hours of continuing education.`, '📚');
    },
    ladder(ctx) {
      const job = clinicalJob(ctx);
      if (!job) return;
      const { state, rng } = ctx;
      const check = ladderCheck(state, job);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      if (yearlyCount(state, 'clinical.ladder')) return ctx.toast('The ladder committee meets once a year', 'warn');
      bumpYearly(state, 'clinical.ladder');
      const c = cl(state);
      if (rng.chance(clamp(0.4 + job.performance / 150, 0.3, 0.97))) {
        c.ladder += 1;
        applyPay(state, job);
        ctx.log(`The clinical ladder committee approved your portfolio: you're ${check.next.name}, with a ${Math.round(check.next.raise * 100)}% differential.`, '🪜', 'good');
      } else {
        ctx.log('The ladder committee sent your portfolio back for revisions. Try again next year.', '🪜', 'warn');
      }
    },
  },
  resolvers: {
    setup(ctx, _data, optionId) {
      const { state } = ctx;
      const job = state.career.job;
      const prof = clinicalOf(job);
      if (!prof?.settings[optionId] || !settingEligibility(state, optionId, job).ok) return;
      const c = cl(state);
      c.setting = optionId;
      c.settingAge = state.character.age;
      if (!shiftAllowed(state, c.shift, job)) c.shift = 'days';
      applyPay(state, job);
      ctx.log(`You work in ${prof.settings[optionId].name.toLowerCase()}.`, prof.settings[optionId].icon);
    },
    event(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const ev = EVENTS[data.group]?.find((e) => e.id === data.eventId);
      const opt = ev?.options.find((o) => o.id === optionId);
      if (!opt) return;
      let fx = opt;
      if (opt.check != null && clinicalSkill(state, job) + rng.int(-20, 20) < opt.check) fx = { ...opt.fail };
      applyEffects(ctx, fx, job);
      ctx.log(fx.text ?? 'Back to work.', ev.icon, (fx.perf ?? 0) > 0 || fx.catches ? 'good' : (fx.perf ?? 0) < 0 ? 'warn' : undefined);
      if (opt.risk && fx === opt && rng.chance(opt.risk.chance)) {
        applyEffects(ctx, opt.risk, state.career.job);
        if (opt.risk.text) ctx.log(opt.risk.text, ev.icon, opt.risk.whistle ? 'good' : 'bad');
      }
    },
    burnout(ctx, _data, optionId) {
      const { state } = ctx;
      const job = state.career.job;
      const c = cl(state);
      if (!clinicalOf(job)) return;
      if (optionId === 'eap') {
        c.burnout = Math.max(0, c.burnout - 25);
        ctx.emit('health:trauma', { amount: -8, source: 'therapy' });
        ctx.stat('happiness', 4);
        ctx.log('Six free counseling sessions through the employee assistance program. They helped.', '🫂', 'good');
      } else if (optionId === 'slower') {
        c.shift = 'partTime';
        c.burnout = Math.max(0, c.burnout - 20);
        applyPay(state, job);
        ctx.log('You cut back to part-time. Less money; more of you left at the end of the week.', '🌤️');
      } else if (optionId === 'leave') {
        leaveJob(ctx, 'Left clinical practice (burnout)');
        c.burnout = 20;
        ctx.log('You left the bedside. Insurance companies, informatics and teaching all want clinicians.', '🚪', 'warn');
      } else {
        ctx.stat('stress', 6);
        ctx.log('You pushed through.', '💪');
      }
    },
  },
};
