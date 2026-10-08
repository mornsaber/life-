/**
 * Life on the move: airline pilots, charter and cargo pilots, flight
 * attendants, merchant mariners and cruise-ship crews.
 *
 *  - Seniority: airline and maritime schedules are bid by seniority. Junior
 *    crews sit reserve and work holidays; senior crews hold the best trips.
 *  - FAA first-class medical: pilots in a seat renew it every year. A denial
 *    grounds you; a second one ends your flying career (with loss-of-license
 *    insurance if you're in a union).
 *  - The age-65 rule: airline (Part 121) pilots must leave the line at 65 —
 *    teach in the simulator, fly corporate, or retire.
 *  - Furloughs: airlines and cruise lines furlough junior crews in a
 *    recession, with five years of recall rights to the same seniority.
 *  - Rotations: months at sea or on trips strain relationships at home
 *    (PeopleEngine reads `rotation.away`), cruise crews live aboard and earn
 *    gratuities, and airline crews fly free on standby.
 *
 * state.transport = { recall: { professionId, levelId, employer, seniority, step, untilAge } | null }
 */
import { getProfession } from './JobTrees.js';
import { levelById, ladderFor } from './Ladder.js';
import { hire, leaveJob, promote, levelCheck } from './CareerEngine.js';
import { recalcSalary } from './Compensation.js';
import { createEmployer } from './Employers.js';
import { hasCredential, grantCredential } from '../credentials/LicensingEngine.js';
import { isRecession } from '../economy/EconomyEngine.js';
import { isDeployed } from '../../core/State.js';

export const AGE_LIMIT_121 = 65;
const RECALL_YEARS = 5;
const LOSS_OF_LICENSE = 75000;
/** Conditions the FAA won't certify (without a long special-issuance process). */
const GROUNDING_CONDITIONS = ['heartDisease', 'alcohol', 'opioids', 'tbi'];
const GROUNDING_MENTAL = ['depression', 'anxiety', 'ptsd'];

export const currentLevel = (job) => (job ? levelById(getProfession(job.professionId), job.levelId) : null);

/** Why the FAA would deny a first-class medical, or null if you'd pass. */
export function medicalProblem(state) {
  if (state.stats.health < 40) return 'your overall health';
  for (const c of state.health?.conditions ?? []) {
    if (c.remission) continue;
    if (GROUNDING_CONDITIONS.includes(c.id)) return c.name ?? c.id;
    if (GROUNDING_MENTAL.includes(c.id) && (c.severity ?? 0) >= 60) return c.name ?? c.id;
    if (c.id === 'cancer') return 'active cancer';
  }
  return null;
}

/** 'junior' | 'mid' | 'senior' — what your seniority number holds. */
export function seniorityTier(job) {
  if (job.yearsAtEmployer < 4) return 'junior';
  if (job.yearsAtEmployer < 12) return 'mid';
  return 'senior';
}

export function furloughRisk(state, job) {
  if (!isRecession(state)) return 0;
  const tier = seniorityTier(job);
  return tier === 'junior' ? 0.25 : tier === 'mid' ? 0.07 : 0.01;
}

const BIDS = {
  junior: ['You sat reserve most of the year, on call with two hours to report, and worked Christmas.', 'Junior on the list: red-eyes, four-leg days and holidays away.'],
  mid: ['Your seniority finally holds weekends off most months.', 'Mid-list: a decent mix of trips, a few holidays at home.'],
  senior: ['You held the best trips on the bid: long layovers in good cities, every holiday at home.', 'Top of the seniority list. You fly the schedule you want.'],
};

/**
 * Railroad seniority boards: junior crews work the extra board — on call
 * around the clock, called with two hours' notice for any train, any time.
 * Seniority eventually holds a regular assignment with predictable days off.
 */
export function railBoard(job) {
  if (job.yearsAtEmployer < 4) return 'extra';
  if (job.yearsAtEmployer < 10) return 'pool';
  return 'regular';
}
export const RAIL_BOARDS = {
  extra: { label: '📟 Extra board — on call 24/7', stress: 5, happy: -3, text: ['Extra board: called at 2 a.m. for a coal train, 14 hours on duty, a motel in another state, and called again before you were rested.', 'You missed your kid\'s birthday, two weddings and Thanksgiving waiting for the phone to ring.'] },
  pool: { label: '🔁 Pool freight — first in, first out', stress: 2, happy: -1, text: ['Pool service: you never knew which day you\'d be home, but at least you knew the route.'] },
  regular: { label: '📅 Regular assignment — your own job and days off', stress: -1, happy: 2, text: ['Your seniority finally holds a regular job: same train, same days off, home every night.'] },
};

function railBoardTick(ctx, job) {
  const b = RAIL_BOARDS[railBoard(job)];
  ctx.stat('stress', b.stress);
  ctx.stat('happiness', b.happy);
  if (ctx.rng.chance(0.5)) ctx.log(ctx.rng.pick(b.text), '🚂');
  // Fatigue: the extra board is where the close calls happen.
  if (railBoard(job) === 'extra' && ctx.rng.chance(0.04)) {
    job.performance = Math.max(0, job.performance - 10);
    ctx.log('Exhausted after a 13-hour call, you missed a signal. The train stopped short of the red — barely. The FRA investigation went in your file.', '🚦', 'bad');
  }
}

function medicalTick(ctx, job, level) {
  const { state } = ctx;
  const problem = medicalProblem(state);
  if (!problem) {
    job.grounded = false;
    if (!hasCredential(state, 'firstClassMedical')) grantCredential(ctx, 'firstClassMedical', { sponsor: job.employer.name, silent: true });
    else state.credentials.held.firstClassMedical.renewedAge = state.character.age;
    return false;
  }
  if (state.credentials.held.firstClassMedical) state.credentials.held.firstClassMedical.status = 'suspended';
  if (!job.grounded) {
    job.grounded = true;
    ctx.log(`The FAA aviation medical examiner deferred your first-class medical over ${problem}. You're grounded until it's resolved — another year without it ends your flying career.`, '🩺', 'bad');
    ctx.stat('stress', 10);
    return false;
  }
  const insured = job.unionMember;
  leaveJob(ctx, `Lost your FAA medical certificate (${problem}); you can no longer fly as ${level.title}`);
  if (insured) {
    ctx.earn(LOSS_OF_LICENSE, 'Loss-of-license insurance payout');
    ctx.log(`Your union's loss-of-license insurance paid $${LOSS_OF_LICENSE.toLocaleString()}.`, '🛡️', 'good');
  }
  ctx.stat('happiness', -12);
  return true;
}

function age65Prompt(ctx, job, profession) {
  job.age65Prompted = true;
  const sim = profession.id === 'aviation' ? 'checkAirman' : 'leadPilot';
  ctx.prompt({
    type: 'transport.age65', icon: '🎂', title: 'The Age-65 Rule',
    text: `FAA rules bar airline pilots from the flight deck past ${AGE_LIMIT_121}. Your last trip as ${job.title} is coming up.`,
    options: [
      { id: 'sim', label: `🎓 Stay on as ${levelById(profession, sim).title}`, hint: 'Train the next generation in the simulator' },
      { id: 'corporate', label: '🛩️ Fly corporate or charter', hint: 'No age limit outside the airlines' },
      { id: 'retire', label: '🏖️ Retire' },
    ],
    data: { sim },
  });
}

function furlough(ctx, job) {
  const { state } = ctx;
  state.transport.recall = {
    professionId: job.professionId, levelId: job.levelId, employer: job.employer,
    seniority: job.yearsAtEmployer, step: job.step, untilAge: state.character.age + RECALL_YEARS,
  };
  const ui = Math.round(Math.min(job.salary * 0.45, 30000) * 0.5);
  leaveJob(ctx, `Furloughed by ${job.employer.name} in the downturn (recall rights for ${RECALL_YEARS} years)`);
  ctx.earn(ui, 'Unemployment insurance');
  ctx.stat('happiness', -8);
  ctx.stat('stress', 8);
  ctx.toast('Furloughed', 'bad');
}

function recallTick(ctx) {
  const { state, rng } = ctx;
  const r = state.transport.recall;
  if (!r) return;
  if (state.character.age > r.untilAge) {
    state.transport.recall = null;
    ctx.log(`Your recall rights at ${r.employer.name} expired.`, '📭');
    return;
  }
  if (isRecession(state) || state.legal.incarceration || state.career.job?.employer.name === r.employer.name) return;
  if (state.prompts.some((p) => p.type === 'transport.recall') || !rng.chance(0.5)) return;
  const level = levelById(getProfession(r.professionId), r.levelId);
  ctx.prompt({
    type: 'transport.recall', icon: '📞', title: 'Recalled From Furlough',
    text: `${r.employer.name} is hiring again and recalling furloughed crews by seniority. Your number came up: ${level.title}, with your ${r.seniority} years of seniority intact.${state.career.job ? `\nAccepting means resigning as ${state.career.job.title}.` : ''}`,
    options: [{ id: 'return', label: '✈️ Come back' }, { id: 'decline', label: '🙅 Decline (gives up your recall rights)' }],
  });
}

function rotationTick(ctx, job, profession, level) {
  const { state, rng } = ctx;
  const { rotation } = profession;
  if (profession.id === 'merchantMarine') {
    const months = rng.int(5, 7);
    ctx.log(`${months} months ${rotation.label} aboard the ${job.employer.name} ${rng.pick(['tanker', 'container ship', 'bulk carrier', 'car carrier', 'offshore supply vessel'])} ${rng.pick(['MV Resolute', 'MV Pacific Star', 'SS Liberty Bell', 'MV Northern Light', 'MV Gulf Trader'])}, then months at home.`, '🚢');
  } else if (profession.id === 'cruise') {
    ctx.log(`A ${rng.int(6, 9)}-month contract ${rng.pick(['in the Caribbean', 'in Alaska and the Mediterranean', 'on Northern European itineraries', 'on a world cruise'])}. Crew quarters, crew mess, and two months off between contracts.`, '🛳️');
    if (profession.tips && level.track !== 'mgmt') {
      const tips = Math.round(rng.int(...profession.tips) * (level.grade <= 2 ? 1 : 0.6) / 100) * 100;
      ctx.earn(tips, 'Cruise gratuities', { wage: true });
    }
  }
  ctx.stat('stress', 2);
}

const SEA_EVENTS = {
  merchantMarine: [
    { id: 'storm', title: '🌊 Heavy Weather', text: 'A North Atlantic storm: 40-foot seas and cargo lashings working loose on deck.', options: [
      { id: 'secure', label: '🪢 Go out on deck to re-secure the containers', risk: 0.3, success: 0.7, good: 'You saved the deck stack. The chief mate noticed.', bad: 'A wave knocked you into a hatch coaming.' },
      { id: 'heave', label: '🧭 Heave to and ride it out', risk: 0, success: 1, good: 'Three miserable days, no damage.' },
    ] },
    { id: 'pirates', title: '🏴‍☠️ Suspicious Approach', text: 'Off the Horn of Africa, two skiffs close at high speed.', options: [
      { id: 'citadel', label: '🔒 Muster the crew in the citadel', risk: 0.05, success: 0.9, good: 'The armed guards fired warning shots; the skiffs turned away.', bad: 'Shots hit the bridge wing. Nobody was hurt — barely.' },
      { id: 'hoses', label: '🚿 Man the fire hoses at the rail', risk: 0.35, success: 0.6, good: 'The hoses kept them off the ladder.', bad: 'A ricochet caught you in the arm.' },
    ] },
    { id: 'rescue', title: '🛟 Mayday at Sea', text: 'A sinking fishing boat 20 miles off; you\'re the closest ship.', options: [
      { id: 'divert', label: '🚢 Divert and launch the rescue boat', risk: 0.2, success: 0.8, good: 'You pulled six fishermen from the water. The Coast Guard sent a commendation.', bad: 'You found only debris.', hero: true },
      { id: 'relay', label: '📻 Relay the mayday and stand by', risk: 0, success: 1, good: 'A cutter arrived in time.' },
    ] },
  ],
  cruise: [
    { id: 'noro', title: '🤢 Norovirus Outbreak', text: 'Three hundred passengers sick; the ship goes into outbreak protocol.', options: [
      { id: 'scrub', label: '🧽 Work double shifts sanitizing', risk: 0.2, success: 0.8, good: 'The outbreak burned out in four days. The hotel director thanked you by name.', bad: 'You caught it too.' },
      { id: 'minimum', label: '😷 Do your shift and stay in your cabin', risk: 0.1, success: 0.9, good: 'You stayed healthy.' },
    ] },
    { id: 'overboard', title: '🌊 Person Overboard', text: 'Your section reports a passenger went over the rail at night.', options: [
      { id: 'spot', label: '🔦 Keep eyes on them and throw a ring buoy', risk: 0.05, success: 0.5, good: 'Your light kept them in sight until the rescue boat reached them.', bad: 'They slipped out of the light. The search lasted all night.', hero: true },
      { id: 'call', label: '📞 Call the bridge and follow procedure', risk: 0, success: 0.3, good: 'The bridge turned the ship; they were found.', bad: 'The search came up empty.' },
    ] },
  ],
  flightAttendant: [
    { id: 'unruly', title: '😡 Unruly Passenger', text: 'A drunk passenger shoves a colleague in the aisle at 35,000 feet.', options: [
      { id: 'restrain', label: '🪢 Restrain him with flex cuffs', risk: 0.25, success: 0.75, good: 'Restrained, met by police at the gate. The FAA proposed a $37,000 fine for him.', bad: 'You took an elbow to the face.' },
      { id: 'deescalate', label: '🗣️ Talk him down', risk: 0.05, success: 0.6, good: 'He sat down and slept it off.', bad: 'The captain diverted to Denver.' },
    ] },
    { id: 'medical', title: '🩺 Medical Emergency in Flight', text: 'A passenger collapses in row 23.', options: [
      { id: 'aed', label: '❤️ Grab the AED and start CPR', risk: 0, success: 0.6, good: 'His heart restarted on the second shock. He walked off the ambulance a week later.', bad: 'You did everything right. He didn\'t make it.', hero: true },
      { id: 'page', label: '📢 Page for a doctor on board', risk: 0, success: 0.5, good: 'A cardiologist in 7C took over.', bad: 'No doctor on board; the diversion took 40 minutes.' },
    ] },
  ],
};

function seaEvent(ctx, professionId) {
  const pool = SEA_EVENTS[professionId];
  if (!pool || ctx.state.prompts.some((p) => p.type === 'transport.event')) return;
  const ev = ctx.rng.pick(pool);
  ctx.prompt({
    type: 'transport.event', icon: '⚓', title: ev.title, text: ev.text,
    options: ev.options.map((o) => ({ id: o.id, label: o.label, hint: o.risk >= 0.25 ? 'Risky' : o.risk ? 'Some risk' : 'Safe' })),
    data: { professionId, eventId: ev.id },
  });
}

export const TransportModule = {
  id: 'transport',
  order: 32.7,

  init(state) {
    state.transport ??= { recall: null };
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (state.legal.incarceration) return;
    recallTick(ctx);
    const job = state.career.job;
    if (!job || isDeployed(state) || state.career.leave) return;
    const profession = getProfession(job.professionId);
    const level = currentLevel(job);
    if (!level) return;

    if (level.flying && medicalTick(ctx, job, level)) return;
    if (level.part121 && state.character.age >= AGE_LIMIT_121 && !job.age65Prompted && !state.prompts.some((p) => p.type === 'transport.age65')) age65Prompt(ctx, job, profession);

    if (profession.furlough && rng.chance(furloughRisk(state, job))) return furlough(ctx, job);

    if (profession.seniority && level.track !== 'mgmt' && (profession.id === 'aviation' || profession.id === 'flightAttendant')) {
      const tier = seniorityTier(job);
      ctx.log(rng.pick(BIDS[tier]), tier === 'senior' ? '📅' : '🗓️');
      ctx.stat('happiness', tier === 'senior' ? 3 : tier === 'junior' ? -2 : 0);
      ctx.stat('stress', tier === 'junior' ? 3 : 0);
    }
    if (profession.id === 'railroad' && level.track !== 'mgmt') railBoardTick(ctx, job);
    if (profession.rotation) rotationTick(ctx, job, profession, level);
    if (['aviation', 'flightAttendant'].includes(profession.id) && rng.chance(0.5)) {
      ctx.log(rng.pick(['You flew standby to Rome on your days off — free.', 'Nonrev trip to Tokyo with your pass riders.', 'A long weekend in Hawaii, courtesy of your travel benefits.']), '🌴', 'good');
      ctx.stat('happiness', 3);
    }
    if (SEA_EVENTS[profession.id] && rng.chance(0.15)) seaEvent(ctx, profession.id);
  },

  resolvers: {
    age65(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return;
      if (optionId === 'sim' && promote(ctx, data.sim)) {
        ctx.log('You traded the line for the simulator: checkrides, upgrades and new-hire classes.', '🎓', 'good');
        return;
      }
      if (optionId === 'corporate' || optionId === 'sim') {
        const profession = getProfession('charterAviation');
        const employer = createEmployer(rng, state, profession, state.character.regionId);
        const ladder = ladderFor(profession, employer.size);
        const pick = ['corporatePilot', 'charterCaptain', 'charterFo'].find((id) => ladder.some((l) => l.id === id) && levelCheck(state, levelById(profession, id)).ok);
        if (pick) {
          hire(ctx, { professionId: 'charterAviation', levelId: pick, employer });
          ctx.log('No age limit at a corporate flight department. You kept flying.', '🛩️', 'good');
          return;
        }
      }
      ctx.emit('retirement:mandatory', { age: AGE_LIMIT_121 });
    },

    recall(ctx, _data, optionId) {
      const { state } = ctx;
      const r = state.transport.recall;
      if (!r) return;
      state.transport.recall = null;
      if (optionId !== 'return') return ctx.log(`You declined the recall to ${r.employer.name}.`, '🙅');
      if (state.legal.incarceration) return;
      const job = hire(ctx, { professionId: r.professionId, levelId: r.levelId, employer: r.employer, step: r.step });
      if (!job) return;
      job.yearsAtEmployer = r.seniority;
      job.probationLeft = 0;
      recalcSalary(state, job);
      ctx.log(`Back at ${r.employer.name} with your seniority number intact.`, '📞', 'good');
    },

    event(ctx, data, optionId) {
      const { rng } = ctx;
      const ev = SEA_EVENTS[data.professionId]?.find((e) => e.id === data.eventId);
      const o = ev?.options.find((x) => x.id === optionId);
      if (!o) return;
      const job = ctx.state.career.job;
      const success = rng.chance(o.success);
      if (success) {
        ctx.log(o.good, '⚓', 'good');
        if (job) job.performance = Math.min(100, job.performance + (o.hero ? 10 : 4));
        if (o.hero) ctx.stat('happiness', 6);
      } else {
        ctx.log(o.bad ?? o.good, '🌫️', 'warn');
        ctx.stat('stress', 5);
      }
      if (o.risk && rng.chance(o.risk * (success ? 0.3 : 0.8))) {
        ctx.stat('health', -rng.int(5, 15));
        if (rng.chance(0.4)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 50) });
        ctx.log('You were hurt and spent the rest of the contract on light duty.', '🩹', 'bad');
      }
    },
  },
};
