/**
 * Life on the ambulance, beyond the ladder (EMT → AEMT → Paramedic →
 * Critical Care / Flight; FTO → Supervisor → Captain → Deputy Chief → Chief).
 *
 *   Agencies     Who you work for changes everything: a third-service city
 *                EMS, a fire department (cross-trained firefighter-medics,
 *                better pay and pensions), a private ambulance company
 *                (lower pay, endless interfacility transfers), a hospital-
 *                based service (critical-care transports) or an air-medical
 *                program.
 *   Shifts       24 on / 48 off, 48/96, twelve-hour days or nights (night
 *                differential), or per diem. Overtime is always available —
 *                and mandatory holdovers happen whether you want them or not.
 *   Calls        Thousands of runs a year, with the ones you remember as
 *                decisions: cardiac arrests, strokes, overdoses, births in
 *                the back of the rig, pediatric codes, entrapments, mass-
 *                casualty triage, violent patients and refusals. Saves,
 *                babies delivered and Narcan given are counted; critical
 *                incidents add up.
 *   Assignments  Community paramedicine, the SWAT team's tactical medic,
 *                hazmat, the peer-support team, and teaching EMT classes.
 *   Upkeep       Recertify every two years with continuing education, or
 *                your card lapses.
 *   Way out      Paramedic-to-RN bridges and PA programs that prize patient-
 *                care hours.
 *
 * state.ems = { agency, shift, calls, saves, babies, narcan, mci, incidents, commendations, ce, ceDueAge, assignments, burnout }
 */
import { clamp } from '../../core/Random.js';
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { ADMISSION_HOOKS, YEAR_HOOKS } from '../education/EducationEngine.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { recalcSalary } from '../career/Compensation.js';
import { leaveJob } from '../career/CareerEngine.js';

export const AGENCIES = {
  thirdService: { name: 'City EMS (third service)', icon: '🚑', pay: 1.0, volume: 1.0, burnout: 5, desc: 'The city\'s own ambulance service: busy, unionized, a pension.' },
  fireBased: { name: 'Fire-based EMS', icon: '🚒', pay: 1.22, volume: 0.8, burnout: 4, needs: 'fire', shifts: ['24-48', '48-96'], desc: 'Cross-trained firefighter-paramedics: better pay, 24-hour shifts, a fire pension.' },
  private: { name: 'Private ambulance company', icon: '🏥', pay: 0.85, volume: 1.15, burnout: 6, desc: 'Interfacility transfers and 911 contracts. Lower pay, plenty of hours.' },
  hospital: { name: 'Hospital-based transport', icon: '🏨', pay: 1.06, volume: 0.6, burnout: 3, desc: 'Critical-care transports between hospitals; good benefits, sicker patients.' },
  flight: { name: 'Air-medical program', icon: '🚁', pay: 1.15, volume: 0.35, burnout: 4, needs: 'flight', shifts: ['24-48', 'days', 'nights'], desc: 'Helicopter and fixed-wing transports. Few calls; every one is serious.' },
};

export const SHIFTS = {
  '24-48': { name: '24 on / 48 off', icon: '🔁', pay: 1.0, burnout: 3, desc: 'Ten shifts a month; sleep when you can.' },
  '48-96': { name: '48 on / 96 off', icon: '🔂', pay: 1.0, burnout: 4, desc: 'Two days on, four off — long tours, long breaks.' },
  days: { name: '12-hour days', icon: '☀️', pay: 0.97, burnout: 1, desc: 'A normal sleep schedule.' },
  nights: { name: '12-hour nights', icon: '🌙', pay: 1.08, burnout: 4, desc: 'Night differential; your body never quite agrees.' },
  perDiem: { name: 'Per diem', icon: '📅', pay: 0.6, burnout: -4, desc: 'Pick up shifts when you want them. No benefits.' },
};

export const ASSIGNMENTS = {
  community: { name: 'Community paramedicine', icon: '🏘️', cred: 'communityParamedic', pay: 4000, burnout: -3, desc: 'Home visits for frequent callers and discharged patients — fewer 911 calls for everyone.' },
  tactical: { name: 'SWAT tactical medic', icon: '🛡️', cred: 'tacticalMedic', pay: 6000, burnout: 3, risk: 0.01, desc: 'Embedded with the SWAT team on warrants and standoffs.' },
  hazmat: { name: 'Hazmat team', icon: '☣️', cred: 'hazmatOps', pay: 3000, burnout: 1, desc: 'Decontamination and medical monitoring at chemical incidents.' },
  peer: { name: 'Peer support team', icon: '🫂', pay: 0, burnout: -2, desc: 'You check on coworkers after the bad calls — and they check on you.' },
  instructor: { name: 'EMT instructor', icon: '🧑‍🏫', cred: 'emsInstructor', pay: 7000, burnout: 1, desc: 'Teaching evening EMT classes at the community college.' },
};

export const CE_HOURS = 60;
export const RECERT_YEARS = 2;
/** Hours of agency in-service training a year. */
export const IN_HOUSE_CE = 12;

const ems = (state) => state.ems;
const isEms = (job) => job?.professionId === 'ems';
const isMedic = (state) => hasCredential(state, 'paramedic');

/** Pay multiplier from agency and shift (plus a night differential). */
export function emsPayAdjust(state) {
  const e = ems(state);
  return (AGENCIES[e?.agency]?.pay ?? 1) * (SHIFTS[e?.shift]?.pay ?? 1);
}

function applyPay(state, job) {
  if (job.headOf) return; // department heads are paid as heads
  job.payAdjust = emsPayAdjust(state);
  recalcSalary(state, job);
}

export function agencyEligibility(state, id) {
  const a = AGENCIES[id];
  if (!a) return { ok: false, reason: 'Unknown agency' };
  if (a.needs === 'fire' && !hasCredential(state, 'ff1') && !state.career.history.some((h) => h.professionId === 'fire')) return { ok: false, reason: 'Needs firefighter certification (Firefighter I)' };
  if (a.needs === 'flight' && !hasCredential(state, 'flightParamedic')) return { ok: false, reason: 'Needs the FP-C flight certification' };
  return { ok: true };
}

/** Fire departments and flight programs only run some schedules. */
export function shiftAllowed(state, id) {
  const allowed = AGENCIES[ems(state)?.agency]?.shifts;
  return !allowed || allowed.includes(id);
}

/* ------------------------------------------------------------------ */
/* Calls                                                               */
/* ------------------------------------------------------------------ */

/** Calls you'll remember. `als`: paramedic-level care; `skill`: what the decision tests. */
const CALLS = [
  { id: 'arrest', icon: '💔', title: 'Cardiac Arrest', text: 'A 58-year-old collapsed at a Little League game. Bystander CPR is in progress when you arrive.', options: [{ id: 'resus', label: '⚡ Work it on scene: CPR, defibrillation, airway, epinephrine', hint: 'High-quality CPR saves lives' }, { id: 'scoop', label: '🏃 Load and go to the cath lab' }] },
  { id: 'stroke', icon: '🧠', title: 'Possible Stroke', text: 'A woman\'s left side went weak twenty minutes ago. Her husband is sure she\'s "just tired."', options: [{ id: 'alert', label: '📞 Stroke alert — straight to the comprehensive stroke center', hint: 'Skip the closer hospital' }, { id: 'closest', label: '🏥 Closest hospital' }] },
  { id: 'overdose', icon: '💊', title: 'Overdose', text: 'A young man is blue and barely breathing in a gas-station bathroom.', options: [{ id: 'narcan', label: '💉 Bag-valve-mask and naloxone' }, { id: 'airway', label: '🫁 Breathe for him and titrate naloxone slowly', hint: 'Avoid violent withdrawal' }] },
  { id: 'birth', icon: '👶', title: 'Baby on the Way', text: 'Third baby, contractions two minutes apart, and the hospital is twenty-five minutes out.', options: [{ id: 'deliver', label: '🧤 Prepare to deliver in the rig' }, { id: 'race', label: '🚨 Lights and sirens to labor and delivery' }] },
  { id: 'pedi', icon: '🧸', title: 'Pediatric Code', text: 'A two-year-old pulled from a backyard pool. Not breathing.', options: [{ id: 'work', label: '💨 Rescue breaths, compressions, run the code by the book', hint: 'Every second counts' }, { id: 'transport', label: '🚑 Start CPR and race to the children\'s hospital' }] },
  { id: 'mvc', icon: '🚗', title: 'Entrapment', text: 'A sedan wrapped around a pole. The driver is pinned and fading.', options: [{ id: 'trauma', label: '🩸 Tourniquet, airway, and push for a fast extrication', hint: 'Golden hour' }, { id: 'flight', label: '🚁 Request the helicopter' }] },
  { id: 'mci', icon: '🚌', title: 'Mass-Casualty Incident', text: 'A bus rollover on the interstate. Twenty-three patients and three ambulances.', options: [{ id: 'triage', label: '🏷️ Take triage: tag everyone START red/yellow/green/black', hint: 'Do the most for the most' }, { id: 'treat', label: '🩹 Treat the worst patient in front of you' }] },
  { id: 'violent', icon: '😡', title: 'Violent Patient', text: 'An agitated patient is swinging at your partner in the back of the ambulance.', options: [{ id: 'sedate', label: '💉 Chemical restraint per protocol' }, { id: 'deescalate', label: '🗣️ Talk him down', hint: 'Risky' }, { id: 'police', label: '🚓 Pull over and wait for police' }] },
  { id: 'refusal', icon: '📝', title: 'Refusal', text: 'An elderly man with chest pain insists he\'s fine and doesn\'t want to go.', options: [{ id: 'persuade', label: '🗣️ Spend twenty minutes persuading him', hint: 'Smarts check' }, { id: 'sign', label: '✍️ Have him sign the refusal' }] },
  { id: 'frequent', icon: '🔁', title: 'The Frequent Flyer', text: 'Your fifth call this month to the same address. "My back hurts again."', options: [{ id: 'kind', label: '🫶 Treat him like the first time' }, { id: 'curt', label: '🙄 Rush the call' }] },
];

function callPrompt(ctx) {
  const { state, rng } = ctx;
  if (state.prompts.some((p) => p.type === 'emsLife.call')) return;
  const pool = CALLS.filter((c) => isMedic(state) || !['pedi', 'violent'].includes(c.id));
  const c = rng.pick(pool);
  ctx.prompt({ type: 'emsLife.call', icon: c.icon, title: c.title, text: c.text, options: c.options, data: { callId: c.id } });
}

/** Skill on a call: smarts, experience, certifications and fatigue. */
export function callSkill(state) {
  const job = state.career.job;
  const e = ems(state);
  const certs = ['acls', 'pals', 'phtls', 'ccp'].filter((c) => hasCredential(state, c)).length;
  return state.stats.smarts * 0.4 + Math.min(25, (job?.yearsAtEmployer ?? 0) * 2.5) + certs * 4 + (isMedic(state) ? 10 : 0) - Math.max(0, (e?.burnout ?? 0) - 60) / 3;
}

function critical(ctx, amount = 6) {
  const e = ems(ctx.state);
  e.incidents = (e.incidents ?? 0) + 1;
  ctx.emit('health:trauma', { amount, source: 'critical incident' });
}

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

function setupPrompt(ctx) {
  const { state } = ctx;
  if (state.prompts.some((p) => p.type === 'emsLife.setup')) return;
  ctx.prompt({
    type: 'emsLife.setup', icon: '🚑', title: 'Your Service',
    text: 'Which kind of EMS agency hired you? (You can change agencies later.)',
    options: Object.entries(AGENCIES).map(([id, a]) => { const c = agencyEligibility(state, id); return { id, label: `${a.icon} ${a.name}`, hint: c.ok ? a.desc : c.reason, disabled: !c.ok }; }),
  });
}

function emsTick(ctx, job) {
  const { state, rng } = ctx;
  const e = ems(state);
  if (!e.agency) {
    setupPrompt(ctx);
    return;
  }
  const a = AGENCIES[e.agency];
  const sh = SHIFTS[e.shift] ?? SHIFTS['24-48'];
  // The run volume.
  const calls = Math.round(rng.int(1400, 2800) * a.volume * (e.shift === 'perDiem' ? 0.4 : 1) * (job.levelId === 'flight' ? 0.3 : 1) * (['supervisor', 'captain', 'deputy', 'chief'].includes(job.levelId) ? 0.25 : 1));
  e.calls = (e.calls ?? 0) + calls;
  const arrests = Math.round(calls * 0.012);
  const rosc = rng.int(0, Math.max(0, Math.round(arrests * clamp(0.12 + callSkill(state) / 400, 0.08, 0.35))));
  e.saves = (e.saves ?? 0) + rosc;
  const narcan = rng.int(0, Math.round(calls * 0.01));
  e.narcan = (e.narcan ?? 0) + narcan;
  // Burnout and fatigue.
  const assignBurn = Object.keys(e.assignments ?? {}).reduce((s, id) => s + (ASSIGNMENTS[id]?.burnout ?? 0), 0);
  e.burnout = Math.round(clamp((e.burnout ?? 10) + a.burnout + sh.burnout + assignBurn + calls / 1000 - (state.stats.happiness > 70 ? 3 : 0) - (e.cism ? 6 : 0), 0, 100));
  e.cism = false;
  ctx.stat('stress', 3 + Math.round(sh.burnout / 2));
  ctx.log(`${calls.toLocaleString()} runs this year${rosc ? `, ${rosc} cardiac arrest${rosc > 1 ? 's' : ''} you brought back` : ''}${narcan ? `, Narcan ${narcan} times` : ''}.`, a.icon);
  // Assignments pay and occasionally hurt.
  for (const id of Object.keys(e.assignments ?? {})) {
    const as = ASSIGNMENTS[id];
    if (as.cred && !hasCredential(state, as.cred)) { delete e.assignments[id]; continue; }
    if (as.pay) ctx.earn(as.pay, `${as.name} stipend`, { wage: true });
    if (as.risk && rng.chance(as.risk)) {
      ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 50) });
      ctx.log('A SWAT entry went wrong. You treated a wounded officer under fire — and took shrapnel yourself.', '🛡️', 'bad');
      critical(ctx, 10);
    }
  }
  // Recertification. Agencies run some in-house training; the rest is on you.
  e.ce = Math.min(CE_HOURS * 2, (e.ce ?? 0) + IN_HOUSE_CE);
  e.ceDueAge ??= state.character.age + RECERT_YEARS;
  if (state.character.age >= e.ceDueAge) {
    if ((e.ce ?? 0) >= CE_HOURS) {
      e.ce = 0;
      e.ceDueAge = state.character.age + RECERT_YEARS;
      ctx.log('You recertified with the National Registry: sixty hours of continuing education, done.', '📜', 'good');
    } else {
      e.ceDueAge = state.character.age + 1;
      ctx.emit('credential:suspend', { ids: [isMedic(state) ? 'paramedic' : 'emt'], years: 1, reason: 'Missed recertification (continuing education)' });
      ctx.log(`Your National Registry certification lapsed: only ${e.ce ?? 0} of ${CE_HOURS} continuing-education hours.`, '📜', 'bad');
      job.performance = Math.max(0, job.performance - 10);
    }
  }
  // A call to remember, and the rest of the job.
  if (rng.chance(0.75)) callPrompt(ctx);
  if (rng.chance(0.3)) jobEvent(ctx, job);
  // Recognition.
  if (rosc && rng.chance(0.25)) {
    e.commendations = (e.commendations ?? 0) + 1;
    ctx.log('A patient you brought back from cardiac arrest walked into the station to thank your crew. The chief gave you a Lifesaving Award.', '🎖️', 'good');
    addHonor(state, { id: 'ems.lifesaving', source: 'civil', name: 'EMS Lifesaving Award', icon: '🎖️', prestige: 3, precedence: 55, citation: 'For returning a cardiac arrest patient to spontaneous circulation.', ribbon: [['#1a4fa0', 2], ['#ffffff', 1], ['#c62828', 2]] });
  }
  if ((e.saves ?? 0) >= 10 && job.performance >= 80 && !state.honors.some((h) => h.id === 'ems.year') && rng.chance(0.15)) {
    addHonor(state, { id: 'ems.year', source: 'civil', name: 'Paramedic of the Year', icon: '⭐', prestige: 8, precedence: 50, citation: 'Named the state EMS association\'s Paramedic of the Year.', ribbon: [['#f9a825', 1], ['#1a4fa0', 2], ['#f9a825', 1]] });
    ctx.log('The state EMS association named you Paramedic of the Year.', '⭐', 'honor');
  }
  // Burnout catches up.
  if (e.burnout >= 75 && rng.chance(0.4) && !state.prompts.some((p) => p.type === 'emsLife.burnout')) {
    ctx.prompt({ type: 'emsLife.burnout', icon: '🕯️', title: 'Running on Empty', text: `${e.incidents ?? 0} critical incidents. You can't sleep after nights, and you snapped at a patient's family. The median EMS career is short for a reason.`, options: [{ id: 'counsel', label: '🫂 See a counselor who works with first responders' }, { id: 'days', label: '☀️ Move to a slower post (days, fewer calls)' }, { id: 'push', label: '💪 Keep going' }, { id: 'leave', label: '🚪 Leave EMS', tone: 'danger' }] });
  }
}

const JOB_EVENTS = [
  { id: 'holdover', icon: '⏰', title: 'Mandatory Holdover', text: 'Staffing is short. You\'re held over for another twelve hours after a twenty-four.', options: [{ id: 'stay', label: '😮‍💨 Stay' }, { id: 'refuse', label: '🙅 Refuse — you\'re unsafe to work', hint: 'Discipline risk' }] },
  { id: 'crash', icon: '💥', title: 'Ambulance Crash', text: 'A driver ran a red light into your ambulance running hot.', options: [{ id: 'ok', label: '🩹 Check your crew and patient' }] },
  { id: 'needle', icon: '🩸', title: 'Needlestick', text: 'A dirty needle went through your glove during a struggle.', options: [{ id: 'report', label: '📋 Report it and start post-exposure prophylaxis' }, { id: 'ignore', label: '🤐 Don\'t report it', tone: 'danger' }] },
  { id: 'wall', icon: '⏳', title: 'Hospital Wall Times', text: 'Four ambulances, including yours, are stuck in the ER hallway with patients on stretchers.', options: [{ id: 'escalate', label: '📞 Escalate to the charge nurse and your supervisor' }, { id: 'wait', label: '⏳ Wait it out' }] },
  { id: 'qa', icon: '🔍', title: 'QA Review', text: 'The medical director flagged one of your charts for review.', options: [{ id: 'own', label: '🙋 Own the gap and take the remediation' }, { id: 'defend', label: '🛡️ Defend your judgment', hint: 'Smarts check' }] },
];

function jobEvent(ctx) {
  const { state, rng } = ctx;
  if (state.prompts.some((p) => p.type === 'emsLife.event')) return;
  const ev = rng.pick(JOB_EVENTS);
  ctx.prompt({ type: 'emsLife.event', icon: ev.icon, title: ev.title, text: ev.text, options: ev.options, data: { eventId: ev.id } });
}

/* ------------------------------------------------------------------ */
/* Bridges out of EMS                                                  */
/* ------------------------------------------------------------------ */

/** Paramedic-to-RN bridge: a year off an associate's or bachelor's in nursing. */
YEAR_HOOKS.push((state, programId, major) => (hasCredential(state, 'paramedic') && ['associate', 'bachelor'].includes(programId) && major === 'nursing' ? 1 : 0));
/** PA programs prize patient-care hours: years on the ambulance help. */
ADMISSION_HOOKS.push({
  boost(state, programId) {
    if (programId !== 'paMaster' && programId !== 'md') return 0;
    const years = state.career.history.filter((h) => h.professionId === 'ems').reduce((s, h) => s + (h.endAge - h.startAge), 0) + (isEms(state.career.job) ? state.career.job.yearsAtEmployer : 0);
    return Math.min(programId === 'paMaster' ? 0.15 : 0.06, years * 0.03);
  },
});

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const EmsLifeModule = {
  id: 'emsLife',
  order: 30.85,
  init(state) {
    state.ems ??= { agency: null, shift: '24-48', calls: 0, saves: 0, babies: 0, narcan: 0, mci: 0, incidents: 0, commendations: 0, ce: 0, ceDueAge: null, assignments: {}, burnout: 0 };
  },
  setup(engine) {
    engine.bus.on('career:hired', ({ ctx, job }) => {
      if (!isEms(job)) return;
      const e = ems(ctx.state);
      if (e.agency && agencyEligibility(ctx.state, e.agency).ok) applyPay(ctx.state, job);
      else {
        e.agency = null;
        setupPrompt(ctx);
      }
    });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const job = state.career.job;
    const e = ems(state);
    if (!isEms(job)) {
      e.burnout = Math.max(0, (e.burnout ?? 0) - 15);
      return;
    }
    if (!job.paidThisYear || state.legal.incarceration) return;
    emsTick(ctx, job);
  },
  actions: {
    agency(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      if (!isEms(job)) return ctx.toast('EMS crews only', 'warn');
      const c = agencyEligibility(state, id);
      if (!c.ok) return ctx.toast(c.reason, 'warn');
      if (yearlyCount(state, 'ems.agency')) return ctx.toast('One move a year', 'warn');
      bumpYearly(state, 'ems.agency');
      ems(state).agency = id;
      if (!shiftAllowed(state, ems(state).shift)) ems(state).shift = AGENCIES[id].shifts[0];
      applyPay(state, job);
      ctx.log(`You moved to ${AGENCIES[id].name.toLowerCase()}. ${AGENCIES[id].desc}`, AGENCIES[id].icon, 'milestone');
    },
    shift(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      if (!isEms(job) || !SHIFTS[id]) return;
      if (!shiftAllowed(state, id)) return ctx.toast(`${AGENCIES[ems(state).agency].name} doesn't run that schedule`, 'warn');
      if (yearlyCount(state, 'ems.shift')) return ctx.toast('Shift bids happen once a year', 'warn');
      bumpYearly(state, 'ems.shift');
      ems(state).shift = id;
      applyPay(state, job);
      ctx.log(`You bid onto ${SHIFTS[id].name.toLowerCase()}. ${SHIFTS[id].desc}`, SHIFTS[id].icon);
    },
    overtime(ctx) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!isEms(job)) return;
      if (yearlyCount(state, 'ems.overtime') >= 2) return ctx.toast('Twice a year at most', 'warn');
      bumpYearly(state, 'ems.overtime');
      const pay = Math.round(job.salary * rng.float(0.08, 0.14));
      ctx.earn(pay, 'EMS overtime', { wage: true });
      ems(state).burnout = clamp((ems(state).burnout ?? 0) + 5, 0, 100);
      ctx.stat('stress', 4);
      ctx.log(`You picked up overtime shifts: $${pay.toLocaleString()} at time-and-a-half.`, '⏰', 'good');
    },
    ce(ctx) {
      const { state } = ctx;
      if (!isEms(state.career.job) && !hasCredential(state, 'emt')) return;
      if (yearlyCount(state, 'ems.ce')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'ems.ce');
      const e = ems(state);
      e.ce = Math.min(CE_HOURS * 2, (e.ce ?? 0) + 36);
      ctx.stat('smarts', 1);
      ctx.log('You finished a block of continuing education: case reviews, skills labs and a conference.', '📚');
    },
    cism(ctx) {
      const { state } = ctx;
      if (!isEms(state.career.job)) return;
      if (yearlyCount(state, 'ems.cism')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'ems.cism');
      ems(state).cism = true;
      ctx.emit('health:trauma', { amount: -6, source: 'critical incident stress debriefing' });
      ctx.stat('stress', -5);
      ctx.log('You went to a critical-incident stress debriefing after a bad call. It helped to hear your partner say it too.', '🫂', 'good');
    },
    assignment(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      const as = ASSIGNMENTS[id];
      if (!isEms(job) || !as) return;
      const e = ems(state);
      if (e.assignments[id]) {
        delete e.assignments[id];
        return ctx.log(`You stepped off the ${as.name.toLowerCase()} assignment.`, as.icon);
      }
      if (as.cred && !hasCredential(state, as.cred)) return ctx.toast('Needs the certification first', 'warn');
      if (!isMedic(state) && id !== 'peer') return ctx.toast('Paramedics only', 'warn');
      if (Object.keys(e.assignments).length >= 2) return ctx.toast('Two assignments at most', 'warn');
      e.assignments[id] = state.character.age;
      ctx.log(`You joined the ${as.name.toLowerCase()} assignment. ${as.desc}`, as.icon, 'good');
    },
  },
  resolvers: {
    setup(ctx, _data, optionId) {
      const { state } = ctx;
      const job = state.career.job;
      if (!isEms(job) || !AGENCIES[optionId]) return;
      ems(state).agency = optionId;
      if (!shiftAllowed(state, ems(state).shift)) ems(state).shift = AGENCIES[optionId].shifts[0];
      applyPay(state, job);
      ctx.log(`You work for ${AGENCIES[optionId].name.toLowerCase()}.`, AGENCIES[optionId].icon);
    },
    call(ctx, data, optionId) {
      const { state, rng } = ctx;
      const e = ems(state);
      const job = state.career.job;
      const skill = callSkill(state);
      const good = (bonus = 0) => rng.chance(clamp(0.35 + (skill - 50) / 80 + bonus, 0.08, 0.95));
      const perf = (n) => { if (job) job.performance = Math.round(clamp(job.performance + n, 0, 100)); };
      switch (`${data.callId}.${optionId}`) {
        case 'arrest.resus': if (good(0.05)) { e.saves += 1; perf(6); ctx.stat('happiness', 8); ctx.log('Two shocks, epinephrine, and a pulse in the back of the rig. He walked out of the hospital a week later.', '💓', 'good'); } else { critical(ctx, 4); ctx.log('Forty minutes of good CPR. He didn\'t come back. Most don\'t.', '🕯️'); } break;
        case 'arrest.scoop': perf(-2); ctx.log('CPR in a moving ambulance is poor CPR. He didn\'t make it.', '🕯️', 'warn'); break;
        case 'stroke.alert': perf(5); ctx.log('Your stroke alert had the team waiting at the door. She got the clot pulled out in time.', '🧠', 'good'); break;
        case 'stroke.closest': ctx.log('The closer hospital had to transfer her for the clot retrieval. Precious time lost.', '🏥', 'warn'); break;
        case 'overdose.narcan': e.narcan += 1; ctx.log('He came up swinging and angry — but alive.', '💉', 'good'); break;
        case 'overdose.airway': e.narcan += 1; perf(3); ctx.log('Slow and steady: he started breathing on his own without the violent withdrawal.', '🫁', 'good'); break;
        case 'birth.deliver': if (good(0.2)) { e.babies = (e.babies ?? 0) + 1; ctx.stat('happiness', 10); perf(4); ctx.log('A healthy girl, delivered on the shoulder of the highway. The parents named her middle name after you.', '👶', 'good'); } else { critical(ctx, 5); perf(-2); ctx.log('Shoulder dystocia. You managed it, barely. Mother and baby are okay; you aren\'t, quite.', '😰', 'warn'); } break;
        case 'birth.race': ctx.log('You made it to labor and delivery with minutes to spare.', '🚨'); break;
        case 'pedi.work': if (good(-0.05)) { e.saves += 1; perf(8); ctx.stat('happiness', 10); ctx.log('A cough, then a cry. The best sound you have ever heard.', '🧸', 'good'); } else { critical(ctx, 12); ctx.log('You did everything right. It wasn\'t enough. You will think about this one for years.', '🕯️', 'bad'); } break;
        case 'pedi.transport': critical(ctx, 10); ctx.log('The children\'s hospital worked him for an hour.', '🕯️', 'bad'); break;
        case 'mvc.trauma': if (good()) { perf(5); ctx.log('Tourniquet, airway, a fast extrication and a short transport. She lived.', '🩸', 'good'); } else { critical(ctx, 6); ctx.log('She bled out before the extrication finished.', '🕯️', 'bad'); } break;
        case 'mvc.flight': ctx.log('The helicopter landed on the interstate and took her to the trauma center.', '🚁'); break;
        case 'mci.triage': e.mci = (e.mci ?? 0) + 1; perf(8); critical(ctx, 6); ctx.log('You triaged twenty-three people in eleven minutes. The after-action report called it textbook.', '🏷️', 'good'); break;
        case 'mci.treat': e.mci = (e.mci ?? 0) + 1; perf(-4); critical(ctx, 6); ctx.log('You saved the one in front of you; nobody was running triage for the rest.', '🩹', 'warn'); break;
        case 'violent.sedate': ctx.log('The ketamine worked. Everyone went home uninjured.', '💉'); break;
        case 'violent.deescalate': if (rng.chance(0.5)) ctx.log('Calm voice, open hands. He sat down.', '🗣️', 'good'); else { ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(10, 30) }); ctx.log('He caught you with an elbow. You finished the shift with ice on your face.', '🤕', 'bad'); } break;
        case 'violent.police': ctx.log('Police arrived; the patient was restrained and transported.', '🚓'); break;
        case 'refusal.persuade': if (state.stats.smarts + rng.int(-20, 20) > 60) { perf(5); ctx.log('He agreed to go. The ER found a heart attack in progress.', '🗣️', 'good'); } else ctx.log('He signed the refusal anyway.', '📝'); break;
        case 'refusal.sign': if (rng.chance(0.2)) { perf(-8); ctx.log('He died at home that night. The family\'s lawyer requested your chart.', '⚖️', 'bad'); } else ctx.log('He called back the next day and went by car.', '📝'); break;
        case 'frequent.kind': ctx.stat('happiness', 2); ctx.log('You sat with him and noticed his apartment had no food. You called social services.', '🫶', 'good'); break;
        default: ctx.log('Another call.', '🚑');
      }
    },
    event(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const e = ems(state);
      switch (`${data.eventId}.${optionId}`) {
        case 'holdover.stay': e.burnout = clamp(e.burnout + 4, 0, 100); ctx.earn(Math.round((job?.salary ?? 40000) * 0.01), 'Holdover pay', { wage: true }); ctx.log('Thirty-six hours awake. You fell asleep in the parking lot.', '😮‍💨'); break;
        case 'holdover.refuse': if (job && rng.chance(0.4)) { job.performance = Math.max(0, job.performance - 8); ctx.log('You got written up for refusing the holdover.', '📋', 'warn'); } else ctx.log('Your supervisor found someone else.', '🙅'); break;
        case 'crash.ok': ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(10, 40) }); critical(ctx, 5); ctx.log('Everyone survived. Your back hasn\'t been the same.', '💥', 'bad'); break;
        case 'needle.report': ctx.log('A month of antiretrovirals and blood tests. Negative.', '📋', 'good'); break;
        case 'needle.ignore': if (rng.chance(0.03)) { ctx.stat('health', -10); ctx.log('A year later a routine screen came back positive for hepatitis C — treatable now, but it didn\'t have to happen.', '🩸', 'bad'); } else ctx.log('Nothing came of it. You got lucky.', '🤐', 'warn'); break;
        case 'wall.escalate': if (job) job.performance = Math.min(100, job.performance + 3); ctx.log('The charge nurse found beds. Your supervisor noticed you pushing.', '📞', 'good'); break;
        case 'wall.wait': e.burnout = clamp(e.burnout + 2, 0, 100); ctx.log('Three hours in a hallway while calls stacked up across the city.', '⏳'); break;
        case 'qa.own': e.ce = (e.ce ?? 0) + 8; ctx.log('You took the remediation — and learned something.', '🙋'); break;
        case 'qa.defend': if (state.stats.smarts + rng.int(-15, 15) > 65) ctx.log('The medical director agreed with your reasoning and updated the protocol.', '🛡️', 'good'); else { if (job) job.performance = Math.max(0, job.performance - 5); ctx.log('The medical director was not persuaded.', '🔍', 'warn'); } break;
        default: ctx.log('Back in service.', '🚑');
      }
    },
    burnout(ctx, _data, optionId) {
      const { state } = ctx;
      const e = ems(state);
      const job = state.career.job;
      if (!isEms(job)) return;
      if (optionId === 'counsel') { e.burnout = Math.max(0, e.burnout - 25); ctx.emit('health:trauma', { amount: -10, source: 'therapy' }); ctx.log('A counselor who had worked the streets herself. It helped more than you expected.', '🫂', 'good'); }
      else if (optionId === 'days') { if (shiftAllowed(state, 'days')) e.shift = 'days'; e.burnout = Math.max(0, e.burnout - 15); applyPay(state, job); ctx.log('You bid onto a slower day post.', '☀️'); }
      else if (optionId === 'leave') { leaveJob(ctx, 'Left EMS (burnout)'); e.burnout = 20; ctx.log('You hung up your jump bag. Nursing schools, PA programs and fire departments all want people like you.', '🚪', 'warn'); }
      else { ctx.stat('stress', 6); ctx.log('You kept going.', '💪'); }
    },
  },
};
