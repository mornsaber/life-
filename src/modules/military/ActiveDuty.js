/**
 * Full-time active duty: yearly service loop, deployments and interactive
 * combat / duty scenarios. Deployments are shared with the Reserves (a
 * mobilized reservist deploys exactly like an active-duty member).
 */
import { battlefieldPromotion, captured } from './Wartime.js';
import { academyYear } from './Academies.js';
import { unitTick } from '../org/MilitaryUnits.js';
import { sofTick } from './SpecialOps.js';
import { pcsOrders, serviceLifeTick } from './MilitaryLife.js';
import { schoolTick } from './Schools.js';
import { assignmentsTick, keepsHome } from './Assignments.js';
import { reportMisconduct, UCMJ_OFFENSES } from './UCMJ.js';
import { hasCondition } from '../health/Conditions.js';
import { PIPELINES, pipelineFor } from './SpecialOpsCatalog.js';
import { serviceWar, serviceWarFactor, serviceCombatFactor, warContribution } from '../world/War.js';
import { nationalOverseas } from '../world/NationalForces.js';
import { upOrOut, mustRetire, waiverOpen } from './Separation.js';
import { postAbroad } from '../world/Posting.js';
import { pickFresh } from '../../core/Pools.js';
import { clamp } from '../../core/Random.js';
import { addHonor } from '../../core/State.js';
import { fitsEra } from '../world/Eras.js';
import {
  ranksOf,
  BRANCHES, SPECIALTIES, rankOf, specialtyName, exposureOf, flightHoursOf, isMedical, completeTraining, finishOfficerAcademy, entrySchool, annualActivePay, updateEvaluation, tryPromotion, discharge, RETIREMENT_YEARS, retirementYearsFor, branchOf } from './MilitaryEngine.js';
import { combatTempo } from '../world/NationalForces.js';
import { awardForAction, annualReview, endOfTourAwards, awardMedal } from './MedalEngine.js';
import { deck } from '../content/decks.js';

/** Peacetime deployments of other countries' forces: their standing missions abroad (garrisons you take your family to are postings, not deployments). */
const NATIONAL_THEATERS = (svc) => {
  const list = nationalOverseas(svc.nation, svc.branch).filter(([, , , accompanied]) => !accompanied).map(([country, posting]) => `${posting}, ${country}`);
  return list.length ? list : ['UNIFIL — UN peacekeeping in Lebanon', 'UNMISS — UN peacekeeping in South Sudan', 'UNDOF — UN observers on the Golan Heights', 'a multinational exercise in Poland', 'a disaster-relief deployment to the Philippines'];
};
const THEATERS = {
  ground: ['eastern Syria', 'the Sahel', 'northern Iraq', 'the Horn of Africa', 'the Baltic frontier'],
  naval: ['the Red Sea', 'the Strait of Hormuz', 'the South China Sea', 'the Eastern Mediterranean'],
  air: ['Al Udeid Air Base, Qatar', 'Incirlik Air Base, Türkiye', 'Camp Lemonnier, Djibouti', 'Kadena Air Base, Japan'],
  maritime: ['the Eastern Pacific', 'the Caribbean', 'the Bering Sea', 'the Persian Gulf'],
};

/** Combat scenarios by theatre (content/packs/military-events.js). */
export const COMBAT_SCENARIOS = { ground: deck('combat.ground'), naval: deck('combat.naval'), air: deck('combat.air'), maritime: deck('combat.maritime') };

/** Peacetime / garrison events (content/packs/military-events.js). */
export const DUTY_EVENTS = deck('duty.garrison');
/** The ones that fit the year (no drones in 1943); all of them if none do. */
const era = (state, list) => { const ok = list.filter((e) => fitsEra(state, e)); return ok.length ? ok : list; };

export const RISK_LABEL = (risk) => (risk >= 0.8 ? 'Extreme risk' : risk >= 0.55 ? 'High risk' : risk >= 0.3 ? 'Moderate risk' : 'Low risk');

/* ------------------------------------------------------------------ */
/* Deployment & combat                                                 */
/* ------------------------------------------------------------------ */

function combatPrompt(ctx, svc, theaterName) {
  const branch = branchOf(svc);
  const scenario = pickFresh(ctx.rng, ctx.state, `combat.${branch.theater}`, era(ctx.state, COMBAT_SCENARIOS[branch.theater]));
  const options = scenario.options
    .filter((o) => !o.medicOnly || isMedical(svc))
    .map((o) => ({
      id: o.id,
      label: o.label,
      hint: `${RISK_LABEL(o.risk)}${o.specialty === svc.specialty ? ' · your specialty' : ''}`,
      tone: o.risk >= 0.8 ? 'danger' : o.risk <= 0.3 ? 'safe' : undefined,
    }));
  ctx.prompt({
    type: 'military.combat',
    icon: '💥',
    title: `Combat — ${scenario.title}`,
    text: `${theaterName}\n${scenario.text}`,
    options,
    data: { theater: branch.theater, scenarioId: scenario.id, theaterName },
  });
}

/** Officers can exclude only up to the top enlisted pay rate. */
export const CZTE_OFFICER_CAP = 110000;
const MILITARY_PAY = /^(Military pay|Mobilized pay|Hostile fire)/;

/**
 * Combat zone tax exclusion: military pay for a year with a combat
 * deployment is free of federal and state income tax (Social Security
 * and Medicare still apply).
 */
export function combatZoneExclusion(ctx, svc, theaterName) {
  const income = ctx.state.finances.ledger.income.filter((i) => MILITARY_PAY.test(i.source) && !i.taxFree);
  let room = svc.track === 'enlisted' ? Infinity : CZTE_OFFICER_CAP;
  let total = 0;
  for (const i of income) {
    const x = Math.min(i.amount, room);
    if (x <= 0) break;
    i.taxFree = x;
    room -= x;
    total += x;
  }
  if (total) ctx.log(`Combat zone tax exclusion: $${total.toLocaleString()} of this year's pay is free of income tax for your time in ${theaterName}.`, '🧾', 'finance');
}

export function runDeployment(ctx, svc, { mobilized = false } = {}) {
  const { rng } = ctx;
  const branch = branchOf(svc);
  // At war, your forces go to the war; otherwise to your country's standing missions abroad.
  const war = serviceWar(ctx.state, svc);
  const peacetime = svc.nation ? NATIONAL_THEATERS(svc) : THEATERS[branch.theater];
  const theaterName = war && rng.chance(0.85) ? `${war.operation} — ${war.name}` : rng.pick(svc.sof ? pipelineFor(svc, svc.sof.pipeline)?.deployments ?? peacetime : peacetime);
  const months = mobilized ? rng.int(9, 12) : rng.int(6, 9);
  svc.deployedThisYear = true;
  svc.deploymentRequested = false;
  svc.deployments += 1;

  // You live in the theater for the deployment (aboard ship, at sea).
  const posted = postAbroad(ctx, { place: theaterName, kind: 'deployment', years: 1 });
  ctx.log(`${mobilized ? 'Your reserve unit was mobilized. ' : ''}You deployed to ${theaterName} for ${months} months${posted?.country && !theaterName.includes(posted.country) ? ` (${posted.country})` : posted?.atSea ? ', living aboard ship' : ''}.`, branch.icon, 'military');
  svc.warTours = (svc.warTours ?? 0) + (war && theaterName.startsWith(war.operation) ? 1 : 0);
  ctx.stat('stress', 10);
  ctx.stat('happiness', -5);
  const atWar = Boolean(war && theaterName.startsWith(war.operation));
  ctx.earn(225 * months + 2400, svc.nation && !atWar ? 'Overseas deployment allowance' : 'Hostile fire & family separation pay');
  if (!svc.nation) combatZoneExclusion(ctx, svc, theaterName);

  const exposure = exposureOf(svc);
  // Outside a war, most countries' tours are deterrence, training or peacekeeping: combat is rare.
  const peacetimeAbroad = svc.nation && !atWar;
  const sawCombat = rng.chance(peacetimeAbroad
    ? clamp(0.5 * exposure * combatTempo(svc.nation), 0, 0.6)
    : clamp(0.5 * exposure * serviceCombatFactor(ctx.state, svc) * (atWar ? 1.4 : 1), 0.15, 0.95));
  // Colonels and generals command the fight from a headquarters (MilitaryCommands); they don't clear compounds.
  const senior = svc.track === 'officer' && svc.grade >= 5;
  if (sawCombat && senior) {
    svc.combatTours += 1;
    const people = { navy: 'sailors', coastguard: 'sailors', marines: 'Marines', airforce: 'airmen', spaceforce: 'guardians' }[svc.branch] ?? 'soldiers';
    ctx.log(rng.pick(['Your headquarters ran the fight: attacks on the base, casualty reports at 3 a.m., and decisions that sent other people forward.', `You commanded from the operations center. You wrote letters to the families of the ${people} you lost.`, 'Your staff planned the operation; you briefed it and owned the result.']), '🗺️');
  } else if (sawCombat) {
    svc.combatTours += 1;
    combatPrompt(ctx, svc, theaterName);
    if (rng.chance(0.3 * exposure)) combatPrompt(ctx, svc, theaterName);
  } else {
    ctx.log(peacetimeAbroad ? rng.pick(['Exercises, patrols and long weeks of routine: nobody fired a shot.', 'The tour was all training with allies and showing the flag.', 'A quiet tour: the work was watching, waiting and keeping the kit running.']) : 'The tour was tense but you never came under direct fire.', '🌙');
  }
  endOfTourAwards(ctx, svc, { sawCombat });
  // A UN operation's medal; NATO's for allied missions on the alliance's frontiers.
  if (/\bUN\b|UNIFIL|UNMISS|UNDOF|MINUSCA|United Nations/.test(theaterName)) addHonor(ctx.state, { id: `un.${theaterName.split(' ')[0]}`, source: 'international', name: `UN Medal (${theaterName.split(' — ')[0]})`, icon: '🇺🇳', precedence: 7, prestige: 5, citation: `For service with ${theaterName}.` });
  else if (/Baltic|Kosovo|Poland|Eastern Mediterranean|Estonia|Lithuania/.test(theaterName) && NATO.includes(svc.nation ?? 'US')) addHonor(ctx.state, { id: `nato.${ctx.state.character.age}`, source: 'international', name: 'NATO Medal', icon: '🎗️', precedence: 7, prestige: 5, citation: `For NATO service: ${theaterName}.` });
}
const NATO = ['US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'TR'];

function resolveCombat(ctx, data, optionId) {
  const { state, rng } = ctx;
  const svc = state.military.service;
  if (!svc) return;
  const scenario = COMBAT_SCENARIOS[data.theater].find((s) => s.id === data.scenarioId);
  const option = scenario.options.find((o) => o.id === optionId);

  let successChance = option.success + (state.stats.fitness - 50) / 250 + (svc.eval - 50) / 400 + Math.min(svc.combatTours - 1, 3) * 0.03;
  if (option.specialty && option.specialty === svc.specialty) successChance += 0.15;
  const success = rng.chance(clamp(successChance, 0.05, 0.97));
  const killed = rng.chance(option.risk * (success ? 0.02 : 0.07));
  const wounded = !killed && rng.chance(option.risk * (success ? 0.3 : 0.65));
  const valor = option.valor * (success ? 1 : 0.6) + rng.int(-8, 8) + (wounded ? 8 : 0);

  const title = `${scenario.title}, ${data.theaterName}`;
  if (killed) {
    ctx.log(`During the ${scenario.title.toLowerCase()} you were mortally wounded. Your unit made it home because of you.`, '🕯️', 'death');
    awardForAction(ctx, svc, { valor: valor + 10, wounded: true, success, title, killed: true });
    discharge(ctx, 'kia', title);
    ctx.die(`Killed in action — ${data.theaterName}`);
    return;
  }

  svc.eval = Math.round(clamp(svc.eval + (success ? 6 : -3), 0, 100));
  // In a war, every fight moves the front a little.
  const war = data.theaterName?.startsWith('Operation') ? warContribution(state, svc, success) : null;
  if (war && success) ctx.log(`Your unit's success pushed the front forward. ${war.operation}: ${war.front > 0 ? 'gaining ground' : 'still holding'}.`, '🗺️', 'military');
  if (success) {
    ctx.log(`${scenario.title}: your actions turned the fight. Everyone in your section made it out.`, '🎯', 'good');
    ctx.stat('happiness', 4);
  } else {
    ctx.log(`${scenario.title}: it went badly. You'll carry this one for a long time.`, '🌫️', 'bad');
    ctx.stat('happiness', -8);
    ctx.stat('stress', 8);
  }
  ctx.emit('health:trauma', { amount: success ? 22 : 34, source: 'combat' });
  if (rng.chance(0.15)) ctx.emit('health:injury', { conditionId: 'hearingLoss', severity: rng.int(20, 50), serviceConnected: true });
  if (wounded) {
    ctx.emit('health:injury', { conditionId: rng.pick(['backInjury', 'tbi']), severity: rng.int(35, 75), serviceConnected: true });
    svc.wounds += 1;
    const dmg = rng.int(12, 30);
    ctx.stat('health', -dmg);
    ctx.stat('fitness', -rng.int(3, 10));
    ctx.log(`You were wounded in action (−${dmg} health) and medevaced to ${svc.nation ? 'a military hospital at home' : 'Landstuhl'}.`, '🩸', 'bad');
  }
  awardForAction(ctx, svc, { valor, wounded, success, title });
  if (success && war) battlefieldPromotion(ctx, svc, valor);
  // A fight that goes wrong in a war can end in capture.
  else if (!success && war && rng.chance(clamp(option.risk * 0.12, 0.01, 0.15))) captured(ctx, svc, data.theaterName);

  if (wounded && state.stats.health < 25) {
    discharge(ctx, 'medical', 'Your wounds were too severe to continue serving.');
  }
}

function dutyEventPrompt(ctx) {
  const event = pickFresh(ctx.rng, ctx.state, 'duty', era(ctx.state, DUTY_EVENTS));
  ctx.prompt({
    type: 'military.dutyEvent',
    icon: '📯',
    title: event.title,
    text: event.text,
    // Options that can end in UCMJ charges say so.
    options: event.options.map((o) => {
      const charge = o.risky?.ucmj && UCMJ_OFFENSES[o.risky.ucmj];
      return { id: o.id, label: o.label, ...(charge ? { hint: `Risk: Art. ${charge.article}, ${charge.name.toLowerCase()}`, tone: 'danger' } : {}) };
    }),
    data: { eventId: event.id },
  });
}

function applyDutyEffects(ctx, svc, effects = {}) {
  if (effects.cash) ctx.earn(effects.cash, 'Side money');
  if (effects.eval) svc.eval = Math.round(clamp(svc.eval + effects.eval, 0, 100));
  if (effects.disciplinary) svc.disciplinary += effects.disciplinary;
  for (const [key, delta] of Object.entries(effects.stats ?? {})) ctx.stat(key, delta);
}

function resolveDutyEvent(ctx, data, optionId) {
  const { state, rng } = ctx;
  const svc = state.military.service;
  if (!svc) return;
  const event = DUTY_EVENTS.find((e) => e.id === data.eventId);
  const option = event.options.find((o) => o.id === optionId);

  if (option.risky && rng.chance(option.risky.chance)) {
    applyDutyEffects(ctx, svc, { eval: option.risky.eval, disciplinary: option.risky.disciplinary });
    ctx.log(option.risky.text, '⚖️', 'bad');
    if (option.risky.ucmj) return void reportMisconduct(ctx, option.risky.ucmj);
    if (svc.disciplinary >= 4) discharge(ctx, 'oth', 'An administrative separation board separated you for a pattern of misconduct.');
    return;
  }
  if (option.check && state.stats[option.check.stat] < option.check.min + rng.int(-10, 10)) {
    applyDutyEffects(ctx, svc, option.failEffects);
    ctx.log(option.failText, '😓', 'bad');
    return;
  }
  applyDutyEffects(ctx, svc, option.effects);
  ctx.log(option.text, '📯', option.effects.eval > 0 ? 'good' : 'info');
  if (option.medal) awardMedal(ctx, option.medal, { branch: svc.branch, citation: event.title });
}

/* ------------------------------------------------------------------ */
/* Contract review (shared with Reserves)                              */
/* ------------------------------------------------------------------ */

export function openContractReview(ctx, svc) {
  const otherComponent = svc.component === 'active' ? 'reserve' : 'active';
  const mandatory = mustRetire(ctx.state, svc);
  if (mandatory) svc.mandatoryRetirement = mandatory;
  else delete svc.mandatoryRetirement;
  const options = mandatory
    ? [{ id: 'retire', label: '🎖️ Retire with full honors' }, ...(waiverOpen(ctx.state, svc) ? [{ id: 'waiver', label: '📝 Request a waiver to keep serving', hint: 'A strong record helps; a war helps more' }] : [])]
    : [
        { id: 'reenlist', label: `✍️ ${svc.track === 'officer' ? 'Continue service' : 'Re-enlist'} (${svc.component === 'active' ? 4 : 6} yrs)`, hint: svc.track === 'enlisted' && svc.eval >= 60 ? 'Bonus eligible' : undefined },
        branchOf(svc).reserveOnly || branchOf(svc).activeOnly ? null : { id: 'switch', label: otherComponent === 'reserve' ? '🏡 Transfer to the Reserves' : '🪖 Go active duty', hint: otherComponent === 'active' && ctx.state.career.job ? 'Your civilian job is held on military leave' : undefined },
        svc.yearsOfService >= retirementYearsFor(svc)
          ? { id: 'retire', label: `🎖️ Retire (${svc.yearsOfService} yrs)` }
          : { id: 'separate', label: '🎗️ Separate from service' },
      ].filter(Boolean);
  ctx.prompt({
    type: 'military.contractEnd',
    icon: '📜',
    title: mandatory ? 'Mandatory Retirement' : 'Your Contract Is Up',
    text: `${rankOf(svc).title} · ${specialtyName(svc)} · ${svc.yearsOfService} years of service.\n${mandatory ? 'You have reached the service limit.' : 'What\'s next?'}`,
    options,
  });
}

/* ------------------------------------------------------------------ */
/* USPHS & NOAA: emergency deployments and missions instead of combat  */
/* ------------------------------------------------------------------ */

const MISSIONS = {
  usphs: [
    { text: 'You deployed with a Rapid Deployment Force team to run a federal medical station after a hurricane.', deploy: true, stress: 8, eval: 6 },
    { text: 'You were detailed to the CDC to help contain an outbreak, tracing contacts for six weeks.', deploy: true, stress: 6, eval: 5 },
    { text: 'You staffed an Indian Health Service clinic two hours from the nearest hospital.', stress: 3, eval: 3 },
    { text: 'Your FDA team cleared a backlog of drug-safety reviews.', stress: 2, eval: 2 },
    { text: 'You deployed to the southern border to provide medical screening at a migrant processing center.', deploy: true, stress: 7, eval: 4 },
    { text: 'You were sent abroad to support an Ebola response.', deploy: true, stress: 10, eval: 8, risk: 0.04 },
  ],
  noaa: [
    { text: 'Four months at sea aboard a NOAA fisheries survey ship off Alaska.', deploy: true, stress: 5, eval: 4, away: true },
    { text: 'You flew hurricane-hunter missions through the eyewall of a Category 4 storm.', deploy: true, stress: 8, eval: 7, risk: 0.02, pilot: true },
    { text: 'Your survey launch mapped a shipping channel the charts had wrong for 60 years.', stress: 3, eval: 4 },
    { text: 'You led a dive team surveying coral bleaching in the Florida Keys.', stress: 3, eval: 3 },
    { text: 'A research cruise to the Arctic ice edge: twelve weeks of 24-hour daylight.', deploy: true, stress: 6, eval: 5, away: true },
  ],
};

/** Civilian ocean services abroad (the Canadian Coast Guard, the JCG's survey ships): their own seas. */
const NATIONAL_MISSIONS = {
  CA: [
    { text: 'A summer escorting cargo ships through the Arctic ice aboard a Coast Guard icebreaker.', deploy: true, stress: 6, eval: 5, away: true },
    { text: 'Your search-and-rescue cutter pulled a fishing crew out of a November gale off Newfoundland.', deploy: true, stress: 8, eval: 7, risk: 0.02 },
    { text: 'A fisheries science cruise on the Grand Banks: cod counts, nets and fog.', stress: 3, eval: 3, away: true },
    { text: 'You resupplied Arctic communities before freeze-up, beach landings with barges.', deploy: true, stress: 4, eval: 4, away: true },
    { text: 'Buoy tending on the St. Lawrence: unglamorous, essential, every spring.', stress: 2, eval: 2 },
  ],
  JP: [
    { text: 'Your survey ship mapped a new volcanic island rising out of the sea south of Tokyo.', deploy: true, stress: 4, eval: 6, away: true },
    { text: 'Months charting the seabed of the exclusive economic zone near the Senkakus, shadowed by foreign ships.', deploy: true, stress: 7, eval: 5, away: true },
    { text: 'You surveyed the Tōhoku coast after an earthquake moved the seabed and silted the harbours.', deploy: true, stress: 6, eval: 6 },
    { text: 'Tide and current tables for next year\'s charts — the quiet, careful work.', stress: 2, eval: 2 },
  ],
};
const GENERIC_OCEAN = [
  { text: 'Months at sea on a survey ship, charting the continental shelf.', deploy: true, stress: 5, eval: 4, away: true },
  { text: 'You surveyed a harbour approach after a storm shifted the sandbanks.', stress: 3, eval: 4 },
  { text: 'A research cruise to the edge of the ice: weeks of daylight and data.', deploy: true, stress: 6, eval: 5, away: true },
];

/**
 * War: by executive order the PHS and NOAA Corps can be made part of the armed forces. PHS
 * officers run casualty-receiving hospitals; NOAA officers chart landing beaches and route convoys.
 */
const WARTIME_MISSIONS = {
  usphs: [
    { text: 'Militarized: you ran a casualty-receiving ward at a military hospital, flights of wounded arriving nightly.', deploy: true, stress: 12, eval: 7 },
    { text: 'You were attached to a field hospital behind the lines.', deploy: true, stress: 14, eval: 8, risk: 0.05 },
    { text: 'You screened and vaccinated a quarter of a million new recruits at the training centers.', stress: 5, eval: 4 },
  ],
  noaa: [
    { text: 'Militarized: your survey ship charted approaches for a naval landing, under air cover that didn\'t always come.', deploy: true, stress: 12, eval: 8, risk: 0.04, away: true },
    { text: 'You forecast the weather for convoy routing — every ship you sent around a storm arrived.', stress: 6, eval: 6 },
    { text: 'You flew weather reconnaissance ahead of the fleet.', deploy: true, stress: 10, eval: 7, risk: 0.03, pilot: true },
  ],
};

/** Pandemic deployments: the PHS (and its civilian ocean colleagues' ships kept at sea). */
const PANDEMIC_MISSION = { text: 'The pandemic: you deployed to run a field hospital in a convention center, then a mass-vaccination site.', deploy: true, stress: 14, eval: 8, risk: 0.08 };

/** Is the US at war hard enough that the President militarizes the PHS and NOAA Corps? */
function militarization(ctx, svc) {
  if (svc.nation || !WARTIME_MISSIONS[svc.branch]) return false;
  const war = serviceWar(ctx.state, svc);
  const on = Boolean(war && war.intensity >= 2);
  if (on && !svc.militarized) {
    svc.militarized = true;
    ctx.log(`By executive order the ${branchOf(svc).name} has been militarized. You now serve as part of the armed forces, under the laws of war.`, '🎖️', 'warn');
  } else if (!on && svc.militarized) {
    svc.militarized = false;
    ctx.log(`The war is over and the ${branchOf(svc).name} has been returned to civilian control.`, '🕊️', 'military');
  }
  return on;
}

function missionTick(ctx, svc) {
  const { rng } = ctx;
  const atWar = militarization(ctx, svc);
  const pandemic = ctx.state.world?.pandemic?.active && svc.branch === 'usphs' && !svc.nation;
  const pool = pandemic ? [PANDEMIC_MISSION]
    : atWar ? WARTIME_MISSIONS[svc.branch]
      : svc.nation ? (svc.branch === 'noaa' ? NATIONAL_MISSIONS[svc.nation] ?? GENERIC_OCEAN : [])
        : MISSIONS[svc.branch] ?? [];
  if (!pool.length) return;
  const m = rng.pick(pool.filter((x) => !x.pilot || flightHoursOf(svc)).length ? pool.filter((x) => !x.pilot || flightHoursOf(svc)) : pool);
  ctx.log(m.text, branchOf(svc).icon, 'military');
  ctx.stat('stress', m.stress);
  svc.eval = Math.round(clamp(svc.eval + m.eval, 0, 100));
  if (m.deploy) {
    svc.deployments += 1;
    svc.deployedThisYear = true;
    if (svc.deployments % 3 === 0) awardMedal(ctx, 'humanitarian', { branch: svc.branch, citation: m.text });
  }
  if (m.risk && rng.chance(m.risk)) {
    ctx.stat('health', -rng.int(10, 25));
    ctx.log('You came home sick and spent weeks recovering.', '🤒', 'bad');
  }
}

/* ------------------------------------------------------------------ */
/* Annual loop                                                         */
/* ------------------------------------------------------------------ */


export function activeDutyTick(ctx, svc) {
  const { rng } = ctx;
  const branch = branchOf(svc);

  // Officer cadets at an academy abroad: a cadet's year, then the commission.
  if (academyYear(ctx, svc)) return;
  if (svc.isNew) {
    svc.isNew = false;
    ctx.log(`You survived ${entrySchool(svc)}, then finished ${specialtyName(svc)} training.`, '🎖️', 'military');
    finishOfficerAcademy(ctx, svc);
    completeTraining(ctx, svc);
    ctx.stat('fitness', rng.int(6, 12));
    ctx.stat('stress', 8);
  }

  svc.yearsOfService += 1;
  svc.yearsInGrade += 1;
  svc.contractYearsLeft -= 1;

  // Permanent change of station every ~3 years (or at the end of an overseas tour), starting right after training.
  svc.stationYears = (svc.stationYears ?? 99) + 1;
  if (svc.stationYears >= (svc.tourLength ?? 3)) pcsOrders(ctx, svc);

  const rank = rankOf(svc);
  ctx.earn(annualActivePay(svc), `Military pay — ${rank.code} ${rank.title}`, { wage: true });
  if (flightHoursOf(svc)) ctx.emit('logbook:add', { hours: flightHoursOf(svc) });
  updateEvaluation(ctx, svc);
  // Your unit: the people you lead, your chain of command, and command boards.
  svc.eval = Math.round(clamp(svc.eval + unitTick(ctx, svc, ranksOf(svc)), 0, 100));
  sofTick(ctx, svc);
  serviceLifeTick(ctx, svc);
  schoolTick(ctx, svc);
  assignmentsTick(ctx, svc);
  if (ctx.state.military.service !== svc) return;
  // Random urinalysis: addiction shows up in the cup.
  if ((hasCondition(ctx.state, 'opioids') && rng.chance(0.35)) || (hasCondition(ctx.state, 'alcohol') && rng.chance(0.08))) {
    if (!ctx.state.military.service) return;
    ctx.log(hasCondition(ctx.state, 'opioids') ? 'You popped positive on a random urinalysis.' : 'You showed up to duty still drunk.', '🧪', 'bad');
    reportMisconduct(ctx, hasCondition(ctx.state, 'opioids') ? 'drugs' : 'drunkOnDuty');
  }

  const exposure = exposureOf(svc);
  const deployChance = 0.22 * exposure * serviceWarFactor(ctx.state, svc) + (svc.deploymentRequested ? 0.5 : 0);
  if (branch.nonCombat) missionTick(ctx, svc);
  else if (keepsHome(svc)) { /* On a stateside tour, in college or in a top post: no deployments. */ }
  else if (rng.chance(clamp(deployChance, 0, 0.95))) runDeployment(ctx, svc);
  else if (rng.chance(0.45)) dutyEventPrompt(ctx);
  else ctx.log(`Another year in garrison with your ${specialtyName(svc)} unit. Evaluation: ${svc.eval}/100.`, branch.icon, 'military');

  annualReview(ctx, svc);
  tryPromotion(ctx, svc);
  if (upOrOut(ctx, svc)) return;
  if (svc.conscript && svc.contractYearsLeft <= 0) {
    if (ctx.state.military.conscription) ctx.state.military.conscription.status = 'served';
    discharge(ctx, 'honorable', 'Completed national service');
    return;
  }
  if (svc.contractYearsLeft <= 0 || mustRetire(ctx.state, svc)) openContractReview(ctx, svc);
}

export const ActiveDutyResolvers = {
  combat: resolveCombat,
  dutyEvent: resolveDutyEvent,
};
