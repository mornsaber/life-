/**
 * Security, policing and corrections beyond the city police department:
 * private security and executive protection, private ("special") police,
 * the TSA, sheriff's offices, county jails, the Federal Bureau of Prisons,
 * private prison companies, probation and parole, 911 dispatch, private
 * investigators and bail agents. The elected Sheriff and District Attorney
 * are offices (politics), reached from these ladders.
 *
 * Where it's real:
 *   - Railroad police are commissioned in every state (federal law).
 *     Private campus, hospital and company police with full arrest powers
 *     exist only in some states (Texas, Illinois, Ohio, Florida, New York,
 *     D.C.); elsewhere the only private police are the railroads'.
 *   - Commercial bail is outlawed in Illinois and D.C., so no bail agents there.
 *   - Private prisons hold a large share of inmates in Montana, and some in
 *     Texas, Florida, Colorado and Ohio.
 */
import { L, detectiveRanks } from './Ladder.js';
import { currentCountry } from '../../core/Locale.js';
import { stateIdOf } from '../life/Regions.js';
import { offenseName } from '../legal/Offenses.js';
import justicePack, { NO_BAIL_STATES, PRIVATE_POLICE_STATE_NAMES } from '../content/packs/careers-justice.js';

export { NO_BAIL_STATES, PRIVATE_POLICE_STATE_NAMES };

/** Private (special) police with full powers beyond the railroads. */
export const PRIVATE_POLICE_STATES = ['TX', 'IL', 'OH', 'FL', 'NY', 'DC'];
/** Share of state prisoners held in privately run prisons. */
export const PRIVATE_PRISON_SHARE = { MT: 0.4, TX: 0.12, FL: 0.12, CO: 0.15, OH: 0.05 };


/* The careers themselves (JUSTICE_PROFESSIONS) live in content/packs/careers-justice.js. */


/** Yearly incidents for these careers (one pool per profession). */
export const JUSTICE_EVENTS = {
  privateSecurity: [
    { title: 'Shoplifter at the Door', text: 'A man walks out of the store with a TV under his arm.', options: [
      { id: 'detain', label: '✋ Detain him for police', perf: 4, risk: 0.2 },
      { id: 'report', label: '📞 Observe and report — company policy', perf: 2 },
    ] },
    { title: 'Concert Crowd Surge', text: 'The crowd at the stage barrier is crushing people in the front row.', options: [
      { id: 'pull', label: '🙌 Pull people over the barrier', perf: 7, risk: 0.15 },
      { id: 'radio', label: '📻 Call for the show to stop', perf: 5 },
    ] },
  ],
  privatePolice: [
    { title: 'Trespasser on the Tracks', text: 'A teenager is filming on a trestle with a freight train due in four minutes.', options: [
      { id: 'run', label: '🏃 Sprint out and get him off', perf: 8, risk: 0.2 },
      { id: 'stop', label: '📻 Call the dispatcher to stop the train', perf: 5 },
    ] },
    { title: 'Campus Protest', text: 'Students have occupied the administration building.', options: [
      { id: 'talk', label: '🗣️ Negotiate a peaceful exit', perf: 6 },
      { id: 'clear', label: '🚔 Clear the building on the president\'s order', perf: 2, risk: 0.15 },
    ] },
  ],
  tsa: [
    { title: 'Something in the Bag', text: 'The X-ray shows a loaded handgun in a carry-on.', options: [
      { id: 'protocol', label: '🛑 Stop the belt and call police by the book', perf: 6 },
      { id: 'quiet', label: '🤫 Handle it quietly to keep the line moving', perf: -4 },
    ] },
  ],
  sheriff: [
    { title: 'Eviction Notice', text: 'You\'re ordered to serve an eviction on a family with three kids in a snowstorm.', options: [
      { id: 'serve', label: '📜 Serve it today', perf: 3, stress: 6 },
      { id: 'delay', label: '⏳ Find reasons to delay a week and call social services', perf: -2 },
    ] },
    { title: 'Rural Pursuit', text: 'You\'re the only deputy for 40 miles when a burglary-in-progress call comes in.', options: [
      { id: 'go', label: '🚔 Go in alone', perf: 7, risk: 0.25 },
      { id: 'wait', label: '📻 Wait for a trooper', perf: 2 },
    ] },
  ],
  jail: [
    { title: 'Detox Watch', text: 'A new arrestee is shaking and sweating — heroin withdrawal.', options: [
      { id: 'medical', label: '🩺 Push for a medical transfer', perf: 5 },
      { id: 'watch', label: '👀 Put him on 15-minute checks', perf: 2, risk: 0.05 },
    ] },
    { title: 'Overcrowded Pod', text: 'The jail is at 140% capacity; inmates are sleeping on the floor.', options: [
      { id: 'report', label: '📝 Write it up for the jail inspector', perf: 3 },
      { id: 'manage', label: '🤐 Manage it and say nothing', perf: 1, stress: 4 },
    ] },
  ],
  federalPrisons: [
    { title: 'Contraband Drone', text: 'A drone drops a package into the recreation yard.', options: [
      { id: 'secure', label: '🏃 Secure the package before inmates do', perf: 7, risk: 0.15 },
      { id: 'lockdown', label: '🚨 Call a lockdown', perf: 5 },
    ] },
    { title: 'Mandatory Overtime', text: 'Staffing is so short you\'re ordered to work a double — the fourth this week.', options: [
      { id: 'work', label: '😓 Work it', perf: 4, stress: 8 },
      { id: 'refuse', label: '🙅 Refuse and take the write-up', perf: -5 },
    ] },
  ],
  privatePrisons: [
    { title: 'Short-Staffed Shift', text: 'Two officers for a 120-bed unit — the contract says six.', options: [
      { id: 'report', label: '📞 Report it to the state contract monitor', perf: -3, boss: -8 },
      { id: 'cope', label: '😬 Make it through the night', perf: 3, risk: 0.2, stress: 6 },
    ] },
    { title: 'Cutting Corners', text: 'Your boss tells you to log welfare checks that never happened before the auditors arrive.', options: [
      { id: 'refuse', label: '🙅 Refuse to falsify the logs', perf: -4, boss: -10 },
      { id: 'falsify', label: '✍️ Fill in the logs', perf: 4, offense: 'falsifiedRecords' },
    ] },
  ],
  probation: [
    { title: 'Technical Violation', text: 'A parolee who\'s held a job for a year missed a check-in and failed a drug test.', options: [
      { id: 'violate', label: '📝 File a violation — back to prison', perf: 3 },
      { id: 'treatment', label: '🤝 Refer to treatment instead', perf: 4 },
    ] },
  ],
  dispatch: [
    { title: 'CPR Over the Phone', text: 'A panicked caller\'s husband isn\'t breathing. The ambulance is 9 minutes out.', options: [
      { id: 'coach', label: '📞 Coach her through CPR', perf: 8, stress: 6 },
    ] },
  ],
  privateInvestigator: [
    { title: 'Workers\' Comp Surveillance', text: 'The "totally disabled" claimant is roofing his garage.', options: [
      { id: 'film', label: '🎥 Film it from the public road', perf: 6 },
      { id: 'trespass', label: '🚧 Get closer for a better angle (his yard)', perf: 7, offense: 'trespass' },
    ] },
  ],
  bailBonds: [
    { title: 'Skip', text: 'A client who owes $40,000 on his bond missed court and is hiding at his cousin\'s.', options: [
      { id: 'recover', label: '🚪 Go get him', perf: 7, risk: 0.25 },
      { id: 'police', label: '📞 Tip off the police and wait', perf: 3 },
    ] },
  ],
};

/** Icons for incident prompts (other career files register theirs). */
export const INCIDENT_ICONS = Object.fromEntries(Object.entries(justicePack.careers).map(([id, p]) => [id, p.icon]));

/** Plays the yearly incidents above (and those other career files register) for whoever holds one of these jobs. */
export const JusticeJobs = {
  id: 'justiceJobs',
  order: 30.6,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const pool = job && JUSTICE_EVENTS[job.professionId];
    if (!pool || state.legal.incarceration || !job.paidThisYear || !rng.chance(0.35)) return;
    const i = rng.int(0, pool.length - 1);
    const ev = pool[i];
    ctx.prompt({
      type: 'justiceJobs.event', icon: INCIDENT_ICONS[job.professionId] ?? '💼', title: ev.title, text: ev.text,
      options: ev.options.map((o) => ({ id: o.id, label: o.label, hint: o.risk ? 'Risky' : undefined, tone: o.offense ? 'danger' : undefined, illegal: o.offense ? offenseName(o.offense) : undefined })),
      data: { professionId: job.professionId, index: i },
    });
  },

  resolvers: {
    event(ctx, data, optionId) {
      const { state, rng } = ctx;
      const o = JUSTICE_EVENTS[data.professionId]?.[data.index]?.options.find((x) => x.id === optionId);
      const job = state.career.job;
      if (!o || !job || job.professionId !== data.professionId) return;
      job.performance = Math.round(Math.max(0, Math.min(100, job.performance + (o.perf ?? 0))));
      if (o.boss) job.boss = Math.round(Math.max(0, Math.min(100, job.boss + o.boss)));
      if (o.stress) ctx.stat('stress', o.stress);
      if (o.risk && rng.chance(o.risk)) {
        ctx.stat('health', -rng.int(8, 20));
        if (rng.chance(0.3)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 50) });
        ctx.log('You were hurt on the job.', '🩹', 'bad');
      }
      if (o.offense) ctx.emit('legal:offense', { offenseId: o.offense, context: `on the job at ${job.employer.name}`, discovery: 0.25, evidence: 0.6 });
      ctx.log(`${o.label.replace(/^\S+ /, '')}.${o.perf > 0 ? ' Your supervisors noticed.' : ''}`, INCIDENT_ICONS[data.professionId] ?? '💼', o.perf > 0 ? 'good' : 'info');
    },
  },
};
