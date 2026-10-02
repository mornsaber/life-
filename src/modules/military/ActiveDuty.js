/**
 * Full-time active duty: yearly service loop, deployments and interactive
 * combat / duty scenarios. Deployments are shared with the Reserves (a
 * mobilized reservist deploys exactly like an active-duty member).
 */
import { clamp } from '../../core/Random.js';
import {
  BRANCHES, SPECIALTIES, rankOf, specialtyName, annualActivePay, updateEvaluation, tryPromotion, discharge, RETIREMENT_YEARS,
} from './MilitaryEngine.js';
import { awardForAction, annualReview, endOfTourAwards, awardMedal } from './MedalEngine.js';

const THEATERS = {
  ground: ['eastern Syria', 'the Sahel', 'northern Iraq', 'the Horn of Africa', 'the Baltic frontier'],
  naval: ['the Red Sea', 'the Strait of Hormuz', 'the South China Sea', 'the Eastern Mediterranean'],
  air: ['Al Udeid Air Base, Qatar', 'Incirlik Air Base, Türkiye', 'Camp Lemonnier, Djibouti', 'Kadena Air Base, Japan'],
  maritime: ['the Eastern Pacific', 'the Caribbean', 'the Bering Sea', 'the Persian Gulf'],
};

/**
 * Combat option fields:
 *   success: base success probability   risk: 0–1 danger (wounds / death)
 *   valor:   0–110 heroism of the act    medicOnly / specialty: gating & bonus
 */
export const COMBAT_SCENARIOS = {
  ground: [
    {
      id: 'ambush', title: 'Valley Ambush',
      text: 'Your patrol is ambushed in a narrow valley. An RPG disables the lead vehicle and two soldiers are down in the open.',
      options: [
        { id: 'charge', label: '⚔️ Assault the enemy position head-on', success: 0.45, risk: 0.9, valor: 102 },
        { id: 'flank', label: '🧭 Lead a fire team on a flanking maneuver', success: 0.6, risk: 0.6, valor: 80, specialty: 'infantry' },
        { id: 'treat', label: '⛑️ Sprint into the open to treat the wounded', success: 0.72, risk: 0.75, valor: 95, medicOnly: true },
        { id: 'drag', label: '🫳 Drag the wounded to cover under fire', success: 0.55, risk: 0.7, valor: 88 },
        { id: 'suppress', label: '📻 Lay suppressive fire and call for air support', success: 0.82, risk: 0.3, valor: 42 },
      ],
    },
    {
      id: 'compound', title: 'Compound Clearance',
      text: 'Clearing a walled compound, your squad takes fire from a barricaded room. One teammate is pinned in the courtyard.',
      options: [
        { id: 'breach', label: '🧨 Stack up and breach the room', success: 0.6, risk: 0.7, valor: 78, specialty: 'engineer' },
        { id: 'grenade', label: '💣 Frag and clear', success: 0.7, risk: 0.45, valor: 55 },
        { id: 'pinned', label: '🏃 Cross the courtyard to cover the pinned soldier', success: 0.5, risk: 0.85, valor: 92 },
        { id: 'indirect', label: '🎯 Pull back and call in mortars', success: 0.85, risk: 0.2, valor: 22 },
      ],
    },
    {
      id: 'ied', title: 'IED Strike',
      text: 'An IED detonates under the truck ahead of yours. It\'s burning, the crew is trapped, and there may be secondary devices.',
      options: [
        { id: 'pull', label: '🔥 Run to pull the crew from the burning vehicle', success: 0.55, risk: 0.85, valor: 98 },
        { id: 'triage', label: '⛑️ Triage casualties while under fire', success: 0.75, risk: 0.6, valor: 86, medicOnly: true },
        { id: 'perimeter', label: '🛡️ Secure the perimeter, then extract', success: 0.8, risk: 0.35, valor: 50 },
        { id: 'eod', label: '📻 Stay mounted and radio for EOD', success: 0.92, risk: 0.12, valor: 12 },
      ],
    },
    {
      id: 'outpost', title: 'Outpost Under Siege',
      text: 'Night attack: enemy fighters breach the wire of your combat outpost. The northern machine-gun nest has gone silent.',
      options: [
        { id: 'mg', label: '🔫 Run to man the abandoned machine gun', success: 0.5, risk: 0.95, valor: 106 },
        { id: 'rally', label: '📣 Rally the defenders and counterattack', success: 0.55, risk: 0.8, valor: 90 },
        { id: 'danger', label: '💥 Hold your sector and call danger-close fires', success: 0.75, risk: 0.45, valor: 60 },
      ],
    },
  ],
  naval: [
    {
      id: 'shipfire', title: 'Fire in Main Engineering',
      text: 'An anti-ship missile strikes amidships. Main engineering is ablaze and sailors are unaccounted for.',
      options: [
        { id: 'hose', label: '🧯 Lead the hose team into the space', success: 0.62, risk: 0.75, valor: 85, specialty: 'engineer' },
        { id: 'trapped', label: '🫳 Go back through the smoke for a trapped shipmate', success: 0.5, risk: 0.9, valor: 100 },
        { id: 'seal', label: '🚪 Seal the hatches and flood with suppression agent', success: 0.85, risk: 0.25, valor: 30 },
      ],
    },
    {
      id: 'swarm', title: 'Fast-Boat Swarm',
      text: 'A dozen fast-attack boats swarm your destroyer in the strait. One is closing fast toward the stern.',
      options: [
        { id: 'fifty', label: '🔫 Man the exposed .50 cal topside', success: 0.6, risk: 0.7, valor: 82, specialty: 'infantry' },
        { id: 'cic', label: '🖥️ Coordinate defensive fires from CIC', success: 0.8, risk: 0.2, valor: 40, specialty: 'intel' },
        { id: 'helo', label: '🚁 Vector the helo onto the lead boat', success: 0.7, risk: 0.35, valor: 50, specialty: 'aviation' },
      ],
    },
    {
      id: 'vbss', title: 'Boarding Turns Hostile',
      text: 'During a VBSS boarding of a weapons-smuggling dhow, the crew opens fire. A boarding-team member is hit.',
      options: [
        { id: 'bridge', label: '⚔️ Charge the bridge', success: 0.5, risk: 0.85, valor: 92 },
        { id: 'treat', label: '⛑️ Treat your wounded teammate under fire', success: 0.75, risk: 0.6, valor: 85, medicOnly: true },
        { id: 'hold', label: '🛡️ Hold the deck and call the helo for overwatch', success: 0.82, risk: 0.3, valor: 40 },
      ],
    },
  ],
  air: [
    {
      id: 'rockets', title: 'Rocket Attack on the Flightline',
      text: 'Rockets slam into the flightline. A hangar is burning with airmen inside, next to fueled aircraft.',
      options: [
        { id: 'hangar', label: '🔥 Pull injured airmen from the burning hangar', success: 0.55, risk: 0.8, valor: 94 },
        { id: 'aircraft', label: '✈️ Tow aircraft and munitions clear of the fire', success: 0.7, risk: 0.5, valor: 66, specialty: 'aviation' },
        { id: 'triage', label: '⛑️ Set up casualty collection on the open ramp', success: 0.75, risk: 0.55, valor: 80, medicOnly: true },
        { id: 'cover', label: '🛡️ Take cover and account for personnel', success: 0.9, risk: 0.1, valor: 12 },
      ],
    },
    {
      id: 'csar', title: 'Pilot Down',
      text: 'A fighter pilot ejected behind enemy lines. Your helicopter is first on scene and enemy trucks are closing in.',
      options: [
        { id: 'hot', label: '🚁 Go in hot for the pickup', success: 0.55, risk: 0.85, valor: 102, specialty: 'aviation' },
        { id: 'rope', label: '🧗 Fast-rope down and carry the pilot out', success: 0.5, risk: 0.9, valor: 98 },
        { id: 'wait', label: '⏳ Orbit and wait for fighter escort', success: 0.75, risk: 0.35, valor: 45 },
      ],
    },
    {
      id: 'gate', title: 'Base Gate Breach',
      text: 'A vehicle-borne attacker rams the main gate. Your Security Forces post is the last line before the dorms.',
      options: [
        { id: 'engage', label: '🔫 Step into the road and engage the vehicle', success: 0.55, risk: 0.85, valor: 96, specialty: 'infantry' },
        { id: 'barrier', label: '🚧 Deploy the vehicle barrier and take cover', success: 0.8, risk: 0.35, valor: 55 },
        { id: 'evac', label: '📢 Sound the alarm and evacuate the dorms', success: 0.85, risk: 0.2, valor: 40 },
      ],
    },
  ],
  maritime: [
    {
      id: 'capsized', title: 'Capsized in the Storm',
      text: 'A fishing vessel capsizes in 30-foot seas. Four crew cling to the hull as the light fades.',
      options: [
        { id: 'swim', label: '🏊 Deploy as rescue swimmer into the surf', success: 0.6, risk: 0.8, valor: 96, specialty: 'aviation' },
        { id: 'smallboat', label: '🚤 Take the small boat in close', success: 0.65, risk: 0.65, valor: 80 },
        { id: 'direct', label: '📻 Hold position and direct the rescue from the cutter', success: 0.85, risk: 0.15, valor: 30 },
      ],
    },
    {
      id: 'narco', title: 'Narco-Sub Interdiction',
      text: 'The crew of a semi-submersible opens fire as your boarding team approaches.',
      options: [
        { id: 'board', label: '⚔️ Lead the boarding team over the side', success: 0.55, risk: 0.75, valor: 86, specialty: 'infantry' },
        { id: 'disable', label: '🎯 Disable the engine with precision fire', success: 0.75, risk: 0.4, valor: 55 },
        { id: 'shadow', label: '🔭 Shadow the vessel and wait for backup', success: 0.9, risk: 0.1, valor: 12 },
      ],
    },
    {
      id: 'platform', title: 'Burning Oil Platform',
      text: 'An explosion rocks an offshore platform. Workers are trapped on the upper deck above the flames.',
      options: [
        { id: 'hoist', label: '🚁 Hoist down onto the burning deck', success: 0.55, risk: 0.85, valor: 98, specialty: 'aviation' },
        { id: 'treat', label: '⛑️ Treat burn victims on the cutter\'s flight deck', success: 0.85, risk: 0.2, valor: 55, medicOnly: true },
        { id: 'boom', label: '🚒 Fight the fire from the cutter\'s monitors', success: 0.75, risk: 0.4, valor: 60, specialty: 'engineer' },
      ],
    },
  ],
};

/** Peacetime / garrison events. Option effects: eval, disciplinary, stats, medal. */
export const DUTY_EVENTS = [
  {
    id: 'drunk', title: 'Formation Problem',
    text: 'Your battle buddy shows up to 0600 formation still drunk.',
    options: [
      { id: 'cover', label: '🤫 Cover for them', effects: { eval: -2 }, risky: { chance: 0.35, text: 'You both got caught. Article 15 for you.', eval: -12, disciplinary: 1 }, text: 'Nobody noticed. Your buddy owes you.' },
      { id: 'report', label: '📋 Report it to your NCO', effects: { eval: 6, stats: { happiness: -3 } }, text: 'You did the right thing. The platoon is colder toward you for a while.' },
      { id: 'handle', label: '💬 Get them to sick call quietly', effects: { eval: 3 }, text: 'You handled it with discretion. Your squad leader noticed.' },
    ],
  },
  {
    id: 'freezing', title: 'Field Exercise',
    text: 'Day 9 of a field exercise in freezing rain. Your feet are going numb.',
    options: [
      { id: 'push', label: '💪 Push through', effects: { eval: 5, stats: { fitness: 3, health: -4 } }, text: 'You toughed it out and earned respect.' },
      { id: 'sick', label: '🩺 Go to sick call', effects: { eval: -2, stats: { health: 3 } }, text: 'Doc caught early frostbite. Smart call, but the chain of command grumbled.' },
    ],
  },
  {
    id: 'school', title: 'Elite School Slot',
    text: 'A slot opened for an elite qualification course (Airborne / Dive / Pathfinder). It\'s grueling.',
    options: [
      { id: 'accept', label: '🪂 Volunteer', check: { stat: 'fitness', min: 60 }, effects: { eval: 10, stats: { fitness: 5, stress: 8 } }, failEffects: { eval: -3, stats: { happiness: -5 } }, text: 'You earned the badge. Tabs and wings open doors.', failText: 'You washed out in week two.' },
      { id: 'decline', label: '🙅 Pass on it', effects: {}, text: 'You let someone else take the slot.' },
    ],
  },
  {
    id: 'hurricane', title: 'Disaster Relief',
    text: 'A Category 4 hurricane devastated the Gulf Coast. Your unit is asking for volunteers for relief operations.',
    options: [
      { id: 'volunteer', label: '🤲 Volunteer', effects: { eval: 6, stats: { happiness: 6, stress: 5 } }, medal: 'humanitarian', text: 'You spent weeks clearing roads and delivering water.' },
      { id: 'stay', label: '🏠 Stay on garrison duty', effects: {}, text: 'You held down the fort at home station.' },
    ],
  },
  {
    id: 'inspection', title: 'Command Inspection',
    text: 'The Inspector General is coming. Your section\'s paperwork is a mess.',
    options: [
      { id: 'allnighter', label: '📂 Fix it all yourself overnight', effects: { eval: 7, stats: { stress: 8 } }, text: 'Zero findings. The commander shook your hand.' },
      { id: 'delegate', label: '🗂️ Delegate and supervise', check: { stat: 'smarts', min: 55 }, effects: { eval: 8 }, failEffects: { eval: -4 }, text: 'Your team crushed it.', failText: 'Things fell through the cracks. Two findings with your name on them.' },
      { id: 'fudge', label: '🙈 Backdate the records', effects: {}, risky: { chance: 0.4, text: 'The IG caught the falsified records. You received non-judicial punishment.', eval: -15, disciplinary: 2 }, text: 'It held up. This time.' },
    ],
  },
];

export const RISK_LABEL = (risk) => (risk >= 0.8 ? 'Extreme risk' : risk >= 0.55 ? 'High risk' : risk >= 0.3 ? 'Moderate risk' : 'Low risk');

/* ------------------------------------------------------------------ */
/* Deployment & combat                                                 */
/* ------------------------------------------------------------------ */

function combatPrompt(ctx, svc, theaterName) {
  const branch = BRANCHES[svc.branch];
  const scenario = ctx.rng.pick(COMBAT_SCENARIOS[branch.theater]);
  const options = scenario.options
    .filter((o) => !o.medicOnly || svc.specialty === 'medic')
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

export function runDeployment(ctx, svc, { mobilized = false } = {}) {
  const { rng } = ctx;
  const branch = BRANCHES[svc.branch];
  const theaterName = rng.pick(THEATERS[branch.theater]);
  const months = mobilized ? rng.int(9, 12) : rng.int(6, 9);
  svc.deployedThisYear = true;
  svc.deploymentRequested = false;
  svc.deployments += 1;

  ctx.log(`${mobilized ? 'Your reserve unit was mobilized. ' : ''}You deployed to ${theaterName} for ${months} months.`, branch.icon, 'military');
  ctx.stat('stress', 10);
  ctx.stat('happiness', -5);
  ctx.earn(225 * months + 2400, 'Hostile fire & family separation pay');

  const exposure = SPECIALTIES[svc.specialty].exposure;
  const sawCombat = rng.chance(clamp(0.5 * exposure, 0.15, 0.92));
  if (sawCombat) {
    svc.combatTours += 1;
    combatPrompt(ctx, svc, theaterName);
    if (rng.chance(0.3 * exposure)) combatPrompt(ctx, svc, theaterName);
  } else {
    ctx.log('The tour was tense but you never came under direct fire.', '🌙');
  }
  endOfTourAwards(ctx, svc, { sawCombat });
}

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
  if (success) {
    ctx.log(`${scenario.title}: your actions turned the fight. Everyone in your section made it out.`, '🎯', 'good');
    ctx.stat('happiness', 4);
  } else {
    ctx.log(`${scenario.title}: it went badly. You'll carry this one for a long time.`, '🌫️', 'bad');
    ctx.stat('happiness', -8);
    ctx.stat('stress', 8);
  }
  if (wounded) {
    svc.wounds += 1;
    const dmg = rng.int(12, 30);
    ctx.stat('health', -dmg);
    ctx.stat('fitness', -rng.int(3, 10));
    ctx.log(`You were wounded in action (−${dmg} health) and medevaced to Landstuhl.`, '🩸', 'bad');
  }
  awardForAction(ctx, svc, { valor, wounded, success, title });

  if (wounded && state.stats.health < 25) {
    discharge(ctx, 'medical', 'Your wounds were too severe to continue serving.');
  }
}

function dutyEventPrompt(ctx) {
  const event = ctx.rng.pick(DUTY_EVENTS);
  ctx.prompt({
    type: 'military.dutyEvent',
    icon: '📯',
    title: event.title,
    text: event.text,
    options: event.options.map((o) => ({ id: o.id, label: o.label })),
    data: { eventId: event.id },
  });
}

function applyDutyEffects(ctx, svc, effects = {}) {
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
    if (svc.disciplinary >= 4) discharge(ctx, 'dishonorable', 'Repeated misconduct ended your career.');
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
  const mandatory = svc.yearsOfService >= 30 || ctx.state.character.age >= 62;
  const options = mandatory
    ? [{ id: 'retire', label: '🎖️ Retire with full honors' }]
    : [
        { id: 'reenlist', label: `✍️ ${svc.track === 'officer' ? 'Continue service' : 'Re-enlist'} (${svc.component === 'active' ? 4 : 6} yrs)`, hint: svc.track === 'enlisted' && svc.eval >= 60 ? 'Bonus eligible' : undefined },
        { id: 'switch', label: otherComponent === 'reserve' ? '🏡 Transfer to the Reserves' : '🪖 Go active duty', hint: otherComponent === 'active' && ctx.state.career.job ? 'You will resign your civilian job' : undefined },
        svc.yearsOfService >= RETIREMENT_YEARS
          ? { id: 'retire', label: `🎖️ Retire (${svc.yearsOfService} yrs)` }
          : { id: 'separate', label: '🎗️ Separate from service' },
      ];
  ctx.prompt({
    type: 'military.contractEnd',
    icon: '📜',
    title: mandatory ? 'Mandatory Retirement' : 'Your Contract Is Up',
    text: `${rankOf(svc).title} · ${specialtyName(svc)} · ${svc.yearsOfService} years of service.\n${mandatory ? 'You have reached the service limit.' : 'What\'s next?'}`,
    options,
  });
}

/* ------------------------------------------------------------------ */
/* Annual loop                                                         */
/* ------------------------------------------------------------------ */

export function activeDutyTick(ctx, svc) {
  const { rng } = ctx;
  const branch = BRANCHES[svc.branch];

  if (svc.isNew) {
    svc.isNew = false;
    const school = svc.track === 'officer' ? branch.officerSchool : branch.basic;
    ctx.log(`You survived ${school}, then finished ${specialtyName(svc)} training.`, '🎖️', 'military');
    ctx.stat('fitness', rng.int(6, 12));
    ctx.stat('stress', 8);
  }

  svc.yearsOfService += 1;
  svc.yearsInGrade += 1;
  svc.contractYearsLeft -= 1;

  const rank = rankOf(svc);
  ctx.earn(annualActivePay(svc), `Military pay — ${rank.code} ${rank.title}`, { wage: true });
  if (svc.specialty === 'aviation') ctx.emit('logbook:add', { hours: 250 });
  updateEvaluation(ctx, svc);

  const exposure = SPECIALTIES[svc.specialty].exposure;
  const deployChance = 0.22 * exposure + (svc.deploymentRequested ? 0.5 : 0);
  if (rng.chance(clamp(deployChance, 0, 0.95))) runDeployment(ctx, svc);
  else if (rng.chance(0.45)) dutyEventPrompt(ctx);
  else ctx.log(`Another year in garrison with your ${specialtyName(svc)} unit. Evaluation: ${svc.eval}/100.`, branch.icon, 'military');

  annualReview(ctx, svc);
  tryPromotion(ctx, svc);
  if (svc.contractYearsLeft <= 0 || svc.yearsOfService >= 30 || ctx.state.character.age >= 62) openContractReview(ctx, svc);
}

export const ActiveDutyResolvers = {
  combat: resolveCombat,
  dutyEvent: resolveDutyEvent,
};
