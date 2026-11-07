/**
 * State government: agencies hired through the State Civil Service Exam,
 * on the shared Ladder/PayGrades system, with the State Employees
 * Retirement System (or the police & fire plan for sworn/custody roles).
 *
 * Top posts marked `appointed` (State Police Superintendent, Corrections
 * Director, Revenue Commissioner…) can't be reached by promotion — only by
 * gubernatorial appointment (politics module). Tenured professors can't be
 * fired or demoted for performance.
 */
import { pickFresh } from '../../core/Pools.js';
import { L, detectiveRanks } from '../career/Ladder.js';
import { clamp } from '../../core/Random.js';
import { offenseName } from '../legal/Offenses.js';

import { statePoliceName, prosecutorName } from './USAgencyNames.js';
import statePack from '../content/packs/careers-state.js';

const STATE_PROFESSIONS = statePack.careers;

/* The careers themselves (STATE_PROFESSIONS) live in content/packs/careers-state.js. */

/* ------------------------------------------------------------------ */
/* Agency events                                                       */
/* ------------------------------------------------------------------ */

export const EVENTS = {
  statePolice: { title: 'High-Speed Pursuit', text: 'A stolen car flees at 110 mph toward a school zone.', options: [
    { id: 'pursue', label: '🚔 Stay on him', perf: 6, risk: 0.2 },
    { id: 'terminate', label: '🛑 Terminate the pursuit and track by air', perf: 2 },
  ] },
  corrections: { title: 'Riot on C-Block', text: 'Inmates have taken over a housing unit. An officer is trapped inside.', options: [
    { id: 'enter', label: '🛡️ Go in with the tactical team', perf: 8, risk: 0.3 },
    { id: 'negotiate', label: '🗣️ Negotiate through the door', perf: 5, check: 'smarts' },
    { id: 'wait', label: '⏳ Hold the perimeter for the state response team', perf: -2 },
  ] },
  revenue: { title: 'Audit a Big Donor', text: 'Your audit points to millions in unreported income — from one of the governor\'s biggest donors. Your boss suggests "taking another look."', options: [
    { id: 'pursue', label: '🔍 Finish the audit as written', perf: 6, boss: -8 },
    { id: 'back', label: '🫥 Quietly close the file', perf: -4, boss: 6 },
  ] },
  cps: { title: 'Removal Decision', text: 'A home visit finds a toddler with unexplained bruises. The parents say she fell.', options: [
    { id: 'remove', label: '🚨 Remove the child tonight', perf: 3, outcome: 'removal' },
    { id: 'plan', label: '🤝 Safety plan with in-home services', perf: 3, outcome: 'plan' },
    { id: 'close', label: '📁 Close the case as unsubstantiated', perf: -2, outcome: 'close' },
  ] },
  gameWarden: { title: 'Poachers at Night', text: 'Spotlights in a closed elk unit. Three armed men, one of you.', options: [
    { id: 'contact', label: '🔦 Make contact alone', perf: 7, risk: 0.2 },
    { id: 'backup', label: '📻 Call a trooper and stake out the truck', perf: 4 },
  ] },
  environmental: { title: 'Chemical Plant Violation', text: 'A plant upstream of the city water intake is dumping solvents. It\'s the county\'s largest employer.', options: [
    { id: 'enforce', label: '⚖️ Issue the violation and fines', perf: 6, boss: -4 },
    { id: 'warn', label: '📄 Issue a warning letter', perf: -3, boss: 4 },
  ] },
  stateFire: { title: 'Red Flag Warning', text: 'A red-flag day is forecast and the budget office wants your seasonal crews off the clock to save overtime.', options: [
    { id: 'staff', label: '🚒 Staff up anyway', perf: 6, boss: -3 },
    { id: 'comply', label: '💲 Hold the line on overtime', perf: -2, boss: 3, risk: 0.15 },
  ] },
  forester: { title: 'Prescribed Burn', text: 'Conditions for your planned burn are marginal. Waiting means another fuel-heavy summer.', options: [
    { id: 'burn', label: '🔥 Light it', perf: 6, risk: 0.15 },
    { id: 'wait', label: '🌬️ Postpone', perf: 0 },
  ] },
  dot: { title: 'Bridge Inspection', text: 'The bridge on Route 9 is worse than the last report said. Closing it means a 40-minute detour for 20,000 drivers.', options: [
    { id: 'close', label: '🚧 Close it now', perf: 6, boss: -3 },
    { id: 'weight', label: '⚖️ Post weight limits and reinspect', perf: 3, check: 'smarts' },
  ] },
  courts: { title: 'Docket Crisis', text: 'A clerical error left 40 defendants jailed past their hearing dates.', options: [
    { id: 'fix', label: '📂 Work the weekend to fix every case', perf: 7, stress: 8 },
    { id: 'report', label: '📢 Report it up and request help', perf: 3 },
  ] },
  prosecution: { title: 'The Big Trial', text: 'You\'re lead counsel on a homicide trial that\'s all over the news.', options: [
    { id: 'try', label: '⚖️ Try it yourself', perf: 8, check: 'smarts' },
    { id: 'plea', label: '🤝 Offer manslaughter to lock in a conviction', perf: 3 },
  ] },
  publicDefender: { title: 'Caseload Crisis', text: 'You have 180 open felony cases. A client\'s trial starts Monday and you\'ve barely read the file.', options: [
    { id: 'continuance', label: '⏱️ Ask for a continuance', perf: 2 },
    { id: 'allnighter', label: '🌙 Prepare all weekend', perf: 6, stress: 10 },
  ] },
  legislativeStaff: { title: 'Budget Night', text: 'The budget bill has to be drafted by 6 AM. Your boss is counting on you.', options: [
    { id: 'draft', label: '✍️ Draft it all night', perf: 7, stress: 8 },
    { id: 'delegate', label: '👥 Split it with the committee staff', perf: 3 },
  ] },
  university: { title: 'Grant Deadline', text: 'A major federal grant is due Friday. Tenure review looks at your funding record.', options: [
    { id: 'submit', label: '🧪 Pull it together and submit', perf: 7, check: 'smarts' },
    { id: 'skip', label: '📚 Skip this cycle, focus on teaching', perf: -2 },
  ] },
};

/** More events per agency so careers don't repeat one scenario every year. */
const MORE_EVENTS = {
  statePolice: [
    { id: 'crash', title: 'Interstate Pileup', text: 'Fog caused a 30-car pileup. A minivan is burning in the median.', options: [
      { id: 'van', label: '🔥 Get the family out of the minivan', perf: 8, risk: 0.3, stress: 6 },
      { id: 'scene', label: '🚧 Lock down the scene and stop more crashes', perf: 5 },
    ] },
    { id: 'trooperDui', title: 'A Fellow Trooper', text: 'You stop a weaving car. The driver is an off-duty trooper from your own post, clearly drunk.', options: [
      { id: 'arrest', label: '⚖️ Arrest him like anyone else', perf: 4, boss: -4, stress: 5 },
      { id: 'ride', label: '🚗 Drive him home and say nothing', perf: 0, boss: 3 },
    ] },
  ],
  corrections: [
    { id: 'contraband', title: 'Contraband Ring', text: 'You find phones and drugs hidden in the laundry carts. The trail leads to a coworker.', options: [
      { id: 'report', label: '📋 Report it to internal affairs', perf: 7, boss: 2, stress: 4 },
      { id: 'warn', label: '🤐 Warn your coworker to stop', perf: -2, stress: 6 },
    ] },
    { id: 'suicideWatch', title: 'Suicide Watch', text: 'An inmate on watch hasn\'t moved in his cell for twenty minutes.', options: [
      { id: 'enter', label: '🚪 Enter the cell now, alone', perf: 6, risk: 0.15 },
      { id: 'backup', label: '📻 Call for backup first, per policy', perf: 3 },
    ] },
  ],
  revenue: [
    { id: 'hardship', title: 'Hardship Case', text: 'A widow owes $40,000 in back taxes from her late husband\'s business. She is clearly overwhelmed.', options: [
      { id: 'plan', label: '🤝 Set up an affordable payment plan', perf: 3, boss: -1 },
      { id: 'levy', label: '🏦 Levy her bank account', perf: 5, boss: 3, stress: 4 },
    ] },
  ],
  cps: [
    { id: 'reunify', title: 'Reunification Hearing', text: 'A mother finished rehab and wants her kids back. The foster family wants to adopt.', options: [
      { id: 'reunify', label: '🏠 Recommend reunification', perf: 3, outcome: 'plan' },
      { id: 'adopt', label: '📄 Recommend termination and adoption', perf: 3, outcome: 'removal' },
    ] },
    { id: 'caseload', title: 'Caseload Crisis', text: 'Two caseworkers quit. You now carry 34 families.', options: [
      { id: 'overtime', label: '⏰ Work nights to see every family', perf: 6, stress: 12 },
      { id: 'triage', label: '🗂️ Triage and tell your supervisor what\'s slipping', perf: 2, boss: 2, check: 'smarts' },
    ] },
  ],
  gameWarden: [
    { id: 'poachers', title: 'Night Poachers', text: 'Spotlights in the field after midnight. Three men with rifles and a pickup.', options: [
      { id: 'approach', label: '🔦 Approach and make contact', perf: 7, risk: 0.2 },
      { id: 'plate', label: '📸 Get the plate and arrest them tomorrow', perf: 4, check: 'smarts' },
    ] },
  ],
  environmental: [
    { id: 'spill', title: 'Chemical Spill', text: 'A plant upstream "accidentally" released solvent into the river. Fish are dying for three miles.', options: [
      { id: 'maxfine', label: '⚖️ Push for the maximum penalty', perf: 6, boss: -3 },
      { id: 'consent', label: '🤝 Negotiate a cleanup consent order', perf: 4, check: 'smarts' },
    ] },
  ],
  stateFire: [
    { id: 'lightning', title: 'Lightning Siege', text: 'A dry thunderstorm started forty fires overnight. You have engines for twelve.', options: [
      { id: 'triage', label: '🗺️ Triage: hit the ones threatening towns', perf: 6, check: 'smarts', stress: 5 },
      { id: 'mutual', label: '📞 Order mutual aid and wait', perf: 2, stress: 3 },
    ] },
    { id: 'campCrew', title: 'Conservation Camp Crew', text: 'Your hand crew is incarcerated volunteers. One of them asks you to write a letter supporting his firefighter certification after release.', options: [
      { id: 'write', label: '✍️ Write it', perf: 3 },
      { id: 'decline', label: '🙅 Stay out of it', perf: 0 },
    ] },
  ],
  forester: [
    { id: 'burn', title: 'Prescribed Burn', text: 'Conditions are marginal for a planned burn. Wait and the window may close for a year.', options: [
      { id: 'light', label: '🔥 Light it', perf: 5, risk: 0.15, check: 'smarts' },
      { id: 'scrub', label: '🛑 Scrub the burn', perf: 1 },
    ] },
  ],
  dot: [
    { id: 'bridge', title: 'Bridge Inspection', text: 'Your inspection finds section loss on a bridge carrying 40,000 cars a day. Closing it means gridlock.', options: [
      { id: 'close', label: '🚧 Close it today', perf: 6, boss: -2, stress: 6 },
      { id: 'limit', label: '⚖️ Post a weight limit and monitor it', perf: 3, check: 'smarts' },
    ] },
  ],
  courts: [
    { id: 'evict', title: 'Eviction Docket', text: 'Eighty eviction cases are on today\'s docket. Most tenants have no lawyer.', options: [
      { id: 'mediate', label: '🤝 Push every case to mediation first', perf: 4, stress: 6 },
      { id: 'move', label: '📂 Keep the docket moving', perf: 3, boss: 2 },
    ] },
  ],
  prosecution: [
    { id: 'plea', title: 'Plea Offer', text: 'A teenager is charged with armed robbery. The evidence is solid but he has no record.', options: [
      { id: 'youth', label: '🧑‍⚖️ Offer youthful-offender treatment', perf: 2 },
      { id: 'trial', label: '⚖️ Take it to trial for the full sentence', perf: 6, stress: 6, check: 'smarts' },
    ] },
    { id: 'brady', title: 'Late Evidence', text: 'The night before trial, a detective hands you a report that undermines your key witness.', options: [
      { id: 'disclose', label: '📨 Disclose it to the defense', perf: 1, boss: -2 },
      { id: 'bury', label: '🗄️ Leave it in the file', perf: 6, stress: 8, offense: 'prosecutorialMisconduct' },
    ] },
  ],
  publicDefender: [
    { id: 'innocent', title: 'An Innocent Client', text: 'You are sure your client is innocent, but the DA offers time served if he pleads guilty today.', options: [
      { id: 'trial', label: '⚖️ Advise him to go to trial', perf: 6, stress: 8, check: 'smarts' },
      { id: 'plead', label: '🤝 Advise him to take the deal', perf: 2 },
    ] },
  ],
  legislativeStaff: [
    { id: 'lobbyist', title: 'Lobbyist Lunch', text: 'A lobbyist offers you dinner at the best steakhouse in the capital "to talk about the bill."', options: [
      { id: 'decline', label: '🙅 Decline and meet in the office', perf: 3 },
      { id: 'dinner', label: '🥩 Accept the dinner', perf: 4, boss: 2, stress: 2 },
    ] },
  ],
  university: [
    { id: 'student', title: 'Struggling Student', text: 'A brilliant first-generation student is about to drop out to support her family.', options: [
      { id: 'mentor', label: '🎓 Find her a paid research position', perf: 4, stress: 4 },
      { id: 'refer', label: '📋 Refer her to student services', perf: 1 },
    ] },
  ],
};

// Some agencies (campus police) only have the follow-up pool; skip a missing main event.
export const eventPool = (professionId) => [...(EVENTS[professionId] ? [{ id: 'main', ...EVENTS[professionId] }] : []), ...(MORE_EVENTS[professionId] ?? [])];
const findEvent = (professionId, eventId = 'main') => eventPool(professionId).find((e) => e.id === eventId) ?? eventPool(professionId)[0];

export const StateAgencies = {
  id: 'stateAgencies',
  order: 27,

  onAgeUp(ctx) {
    const job = ctx.state.career.job;
    if (!job || !STATE_PROFESSIONS[job.professionId] || !ctx.rng.chance(0.35)) return;
    if (job.professionId === 'cps') ctx.stat('stress', 6);
    const e = pickFresh(ctx.rng, ctx.state, `agency.${job.professionId}`, eventPool(job.professionId));
    if (!e?.options) return;
    ctx.prompt({
      type: 'stateAgencies.event',
      icon: STATE_PROFESSIONS[job.professionId].icon,
      title: e.title,
      text: `${job.employer.name}\n${e.text}`,
      options: e.options.map((o) => ({ id: o.id, label: o.label, tone: o.risk ? 'danger' : undefined, illegal: o.offense ? offenseName(o.offense) : undefined })),
      data: { professionId: job.professionId, eventId: e.id },
    });
  },

  resolvers: {
    event(ctx, data, optionId) {
      const { state, rng } = ctx;
      const event = findEvent(data.professionId, data.eventId);
      const o = event.options.find((x) => x.id === optionId);
      let perf = o.perf ?? 0;
      if (o.check && state.stats[o.check] + rng.int(-15, 15) < 55) {
        perf = -3;
        ctx.log('It didn\'t go the way you planned.', '😬', 'warn');
      }
      if (o.risk && rng.chance(o.risk)) {
        const dmg = rng.int(5, 20);
        ctx.stat('health', -dmg);
        ctx.log(`You were hurt (−${dmg} health).`, '🩹', 'bad');
      }
      if (o.outcome) {
        // CPS calls are judged in hindsight.
        const abused = rng.chance(0.5);
        if (o.outcome === 'close' && abused) {
          perf = -20;
          ctx.log('Two months later the child was hospitalized. The press wants to know who closed the case.', '📰', 'bad');
          ctx.stat('happiness', -12);
        } else if (o.outcome === 'removal' && !abused) {
          perf = -6;
          ctx.log('The bruises really were from a fall. The family is suing the department.', '⚖️', 'warn');
        } else ctx.log('Your judgment held up.', '🧸', 'good');
      }
      if (o.stress) ctx.stat('stress', o.stress);
      if (o.offense) ctx.emit('legal:offense', { offenseId: o.offense, context: event.title.toLowerCase(), discovery: 0.3, evidence: 0.7 });
      ctx.log(`${event.title}: ${o.label.slice(2).trim()}.`, '🏛️');
      ctx.emit('career:adjust', { performance: clamp(perf, -30, 30), boss: o.boss ?? 0 });
    },
  },
};
