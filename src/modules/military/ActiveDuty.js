/**
 * Full-time active duty: yearly service loop, deployments and interactive
 * combat / duty scenarios. Deployments are shared with the Reserves (a
 * mobilized reservist deploys exactly like an active-duty member).
 */
import { unitTick } from '../org/MilitaryUnits.js';
import { sofTick } from './SpecialOps.js';
import { reportMisconduct } from './UCMJ.js';
import { hasCondition } from '../health/Conditions.js';
import { PIPELINES } from './SpecialOpsCatalog.js';
import { warFactor, combatFactor } from '../world/War.js';
import { upOrOut } from './Separation.js';
import { pickFresh } from '../../core/Pools.js';
import { clamp } from '../../core/Random.js';
import {
  ranksOf,
  BRANCHES, SPECIALTIES, rankOf, specialtyName, exposureOf, flightHoursOf, isMedical, completeTraining, entrySchool, annualActivePay, updateEvaluation, tryPromotion, discharge, RETIREMENT_YEARS,
} from './MilitaryEngine.js';
import { awardForAction, annualReview, endOfTourAwards, awardMedal } from './MedalEngine.js';
import { BASES } from '../life/Regions.js';

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

    {
      id: 'culvert', title: 'Route Clearance',
      text: 'Your convoy halts at a culvert. The lead vehicle\'s detector is chirping and the road ahead is the only way to the outpost.',
      options: [
        { id: 'dismount', label: '🔍 Dismount and sweep the culvert by hand', success: 0.6, risk: 0.75, valor: 84, specialty: 'engineer' },
        { id: 'robot', label: '🤖 Send the robot and wait it out', success: 0.85, risk: 0.2, valor: 25 },
        { id: 'detour', label: '🧭 Take the long way through the village', success: 0.65, risk: 0.45, valor: 40 },
      ],
    },
    {
      id: 'nightAttack', title: 'Night Attack on the Outpost',
      text: 'At 0300 your combat outpost is hit from three sides. The mortar pit is taking direct fire.',
      options: [
        { id: 'mortar', label: '💥 Run to the mortar pit and keep it firing', success: 0.55, risk: 0.85, valor: 100 },
        { id: 'wall', label: '🧱 Hold your sector of the wall', success: 0.75, risk: 0.5, valor: 60, specialty: 'infantry' },
        { id: 'casualties', label: '⛑️ Run casualties to the aid station', success: 0.7, risk: 0.6, valor: 85, medicOnly: true },
        { id: 'radio', label: '📻 Coordinate close air support', success: 0.85, risk: 0.25, valor: 45 },
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
    {
      id: 'collision', title: 'Collision at Sea',
      text: 'A merchant ship strikes your destroyer at night. Berthing compartments are flooding with sailors inside.',
      options: [
        { id: 'berthing', label: '🌊 Go back into flooding berthing for survivors', success: 0.5, risk: 0.9, valor: 104 },
        { id: 'shoring', label: '🪵 Shore the bulkhead to save the ship', success: 0.7, risk: 0.5, valor: 70, specialty: 'engineer' },
        { id: 'muster', label: '📋 Run the muster and account for every sailor', success: 0.9, risk: 0.1, valor: 20 },
      ],
    },
    {
      id: 'strait', title: 'Swarm in the Strait',
      text: 'A dozen armed fast boats charge your ship in a narrow strait.',
      options: [
        { id: 'gun', label: '🎯 Man the exposed deck gun', success: 0.6, risk: 0.7, valor: 82 },
        { id: 'maneuver', label: '🧭 Recommend evasive maneuvers to the bridge', success: 0.75, risk: 0.35, valor: 48 },
        { id: 'warn', label: '📢 Fire warning shots and hail them', success: 0.8, risk: 0.3, valor: 30 },
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
    {
      id: 'medevac', title: 'Hot Landing Zone',
      text: 'A medevac call comes in from a patrol under fire. The LZ is a dusty field ringed by tree lines.',
      options: [
        { id: 'land', label: '🚁 Land in the hot LZ', success: 0.6, risk: 0.75, valor: 90, specialty: 'aviation' },
        { id: 'flight', label: '⛑️ Ride along as the flight medic', success: 0.65, risk: 0.65, valor: 86, medicOnly: true },
        { id: 'secure', label: '⏳ Wait for the gunships to secure it', success: 0.8, risk: 0.3, valor: 35 },
      ],
    },
    {
      id: 'drone', title: 'Drone Strike Inbound',
      text: 'Radar picks up a swarm of drones heading for the airfield\'s fuel farm.',
      options: [
        { id: 'counter', label: '📡 Run the counter-drone system by hand', success: 0.7, risk: 0.45, valor: 62 },
        { id: 'fuel', label: '⛽ Shut off fuel valves in the open', success: 0.6, risk: 0.65, valor: 78, specialty: 'engineer' },
        { id: 'bunker', label: '🛡️ Get your people into the bunkers', success: 0.9, risk: 0.1, valor: 18 },
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
    {
      id: 'migrants', title: 'Overloaded Migrant Boat',
      text: 'An overloaded wooden boat is taking on water. Two hundred people, many children, are aboard.',
      options: [
        { id: 'raft', label: '🛟 Deploy rafts and transfer people in the swell', success: 0.65, risk: 0.5, valor: 76 },
        { id: 'swim', label: '🏊 Swim children across to the cutter', success: 0.55, risk: 0.7, valor: 88, specialty: 'aviation' },
        { id: 'pump', label: '🔧 Board and run dewatering pumps', success: 0.75, risk: 0.35, valor: 50, specialty: 'engineer' },
      ],
    },
    {
      id: 'iceBreaker', title: 'Trapped in the Ice',
      text: 'A research vessel is trapped in pack ice with an injured crewman and a storm coming.',
      options: [
        { id: 'walk', label: '🧊 Lead a team across the ice', success: 0.6, risk: 0.65, valor: 80 },
        { id: 'helo', label: '🚁 Hoist from the deck in the wind', success: 0.6, risk: 0.7, valor: 84, specialty: 'aviation' },
        { id: 'escort', label: '🚢 Break a channel and escort them out', success: 0.85, risk: 0.2, valor: 30 },
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
      { id: 'cover', label: '🤫 Cover for them', effects: { eval: -2 }, risky: { chance: 0.35, text: 'You both got caught.', eval: -4, ucmj: 'dereliction' }, text: 'Nobody noticed. Your buddy owes you.' },
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
      { id: 'fudge', label: '🙈 Backdate the records', effects: {}, risky: { chance: 0.4, text: 'The IG caught the falsified records.', eval: -5, ucmj: 'falseStatement' }, text: 'It held up. This time.' },
    ],
  },

  {
    id: 'pcsFamily', title: 'Family Emergency',
    text: 'Your mother is in the hospital back home. Your unit is three weeks from a major exercise.',
    options: [
      { id: 'leave', label: '✈️ Request emergency leave', effects: { eval: -2, stats: { happiness: 4, stress: -4 } }, text: 'Your first sergeant signed it in an hour. You were there when she woke up.' },
      { id: 'stay', label: '🪖 Stay for the exercise', effects: { eval: 5, stats: { happiness: -6, stress: 6 } }, text: 'The exercise went well. The phone calls home were hard.' },
    ],
  },
  {
    id: 'hazing', title: 'New Guy',
    text: 'Senior soldiers are "initiating" a new private — making him low-crawl through mud at 2 a.m.',
    options: [
      { id: 'stop', label: '✋ Step in and stop it', effects: { eval: 4, stats: { happiness: 2 } }, text: 'It stopped. The private never forgot it.' },
      { id: 'join', label: '😏 Join in — it happened to you', effects: {}, risky: { chance: 0.3, text: 'The private filed an EO complaint. You were named.', eval: -4, ucmj: 'maltreatment' }, text: 'Nobody complained. This time.' },
      { id: 'ignore', label: '🙈 Walk away', effects: { stats: { happiness: -2 } }, text: 'You told yourself it wasn\'t your business.' },
    ],
  },
  {
    id: 'marksmanship', title: 'Range Qualification',
    text: 'Annual rifle qualification. Expert earns a badge and bragging rights.',
    options: [
      { id: 'practice', label: '🎯 Spend weekends dry-firing', check: { stat: 'fitness', min: 45 }, effects: { eval: 5, stats: { stress: 3 } }, failEffects: { eval: 1 }, text: 'Expert. 38 of 40.', failText: 'Sharpshooter. Close.' },
      { id: 'wing', label: '🤷 Wing it', check: { stat: 'fitness', min: 70 }, effects: { eval: 2 }, failEffects: { eval: -3 }, text: 'Natural talent: Expert.', failText: 'You barely qualified.' },
    ],
  },
  {
    id: 'barracksParty', title: 'Barracks Party',
    text: 'There is a party in the barracks with alcohol, and the duty NCO is your friend.',
    options: [
      { id: 'shut', label: '📋 Shut it down by the book', effects: { eval: 4, stats: { happiness: -3 } }, text: 'Unpopular, but nobody got hurt.' },
      { id: 'join', label: '🍻 Join the party', effects: { stats: { happiness: 5 } }, risky: { chance: 0.25, text: 'Someone got hurt and the investigation found you there.', eval: -3, ucmj: 'disobey' }, text: 'Great night. Nobody found out.' },
    ],
  },
  {
    id: 'mentorship', title: 'Struggling Soldier',
    text: 'A young soldier in your section is failing PT and talks about "not being around much longer."',
    options: [
      { id: 'help', label: '🫂 Walk them to behavioral health yourself', effects: { eval: 6, stats: { happiness: 4 } }, text: 'They got help. A year later they reenlisted.' },
      { id: 'pt', label: '🏃 Run extra PT with them', effects: { eval: 3, stats: { fitness: 2 } }, text: 'Their scores improved. You hope the rest did too.' },
      { id: 'report', label: '📋 Report it up the chain and move on', effects: { eval: 1 }, text: 'Your NCO took it from there.' },
    ],
  },
  {
    id: 'nightOut', title: 'Night Out',
    text: 'Payday weekend. You\'ve had five beers at a bar outside the gate, and the barracks are a ten-minute drive.',
    options: [
      { id: 'cab', label: '🚕 Pay for a ride back', effects: { stats: { happiness: 2 } }, text: 'Twenty-dollar ride. Your first sergeant\'s safety briefing worked.' },
      { id: 'drive', label: '🚗 Drive yourself', effects: { stats: { happiness: 3 } }, risky: { chance: 0.3, text: 'The gate guards smelled it on you. Blood alcohol 0.11.', eval: -5, ucmj: 'dui' }, text: 'You made it back. Nobody knows how close it was.' },
    ],
  },
  {
    id: 'surplus', title: 'Turn-In Day',
    text: 'Your section is turning in old equipment. Nobody has counted the night-vision batteries and spare optics, and they sell well online.',
    options: [
      { id: 'turnIn', label: '📦 Turn it all in', effects: { eval: 2 }, text: 'Property book balanced to the last item.' },
      { id: 'pocket', label: '🤑 Pocket a few and sell them', effects: { cash: 1500 }, risky: { chance: 0.35, text: 'CID traced the online listings back to you.', eval: -10, ucmj: 'larceny' }, text: 'An easy $1,500. The inventory never caught it.' },
    ],
  },
  {
    id: 'romance', title: 'Off-Limits',
    text: 'Someone in your chain of command, two grades apart from you, keeps finding reasons to talk after duty hours.',
    options: [
      { id: 'distance', label: '🚫 Keep it professional', effects: {}, text: 'Awkward for a while, then it passed.' },
      { id: 'date', label: '💑 See where it goes', effects: { stats: { happiness: 6 } }, risky: { chance: 0.35, text: 'Someone saw you together off post and reported it.', eval: -4, ucmj: 'fraternization' }, text: 'You kept it quiet. For now.' },
    ],
  },
  {
    id: 'homeEmergency', title: 'No Leave Approved',
    text: 'Your partner back home is in crisis. Your leave request was denied for an upcoming inspection.',
    options: [
      { id: 'chaplain', label: '✝️ Go to the chaplain and the Red Cross', effects: { eval: 1, stats: { stress: -2 } }, text: 'An emergency leave came through in two days.' },
      { id: 'go', label: '🚪 Just go', effects: { stats: { happiness: 4 } }, risky: { chance: 0.85, text: 'You were reported absent at morning formation.', eval: -6, ucmj: 'awol' }, text: 'You were back before anyone noticed.' },
    ],
  },
  {
    id: 'ceremony', title: 'Color Guard',
    text: 'You are asked to join the color guard for a fallen soldier\'s funeral back home.',
    options: [
      { id: 'yes', label: '🇺🇸 Accept the honor', effects: { eval: 4, stats: { happiness: -2 } }, text: 'You folded the flag and handed it to his mother. You will never forget it.' },
      { id: 'no', label: '🙅 Ask someone else to go', effects: {}, text: 'Someone else carried the flag.' },
    ],
  },
];

export const RISK_LABEL = (risk) => (risk >= 0.8 ? 'Extreme risk' : risk >= 0.55 ? 'High risk' : risk >= 0.3 ? 'Moderate risk' : 'Low risk');

/* ------------------------------------------------------------------ */
/* Deployment & combat                                                 */
/* ------------------------------------------------------------------ */

function combatPrompt(ctx, svc, theaterName) {
  const branch = BRANCHES[svc.branch];
  const scenario = pickFresh(ctx.rng, ctx.state, `combat.${branch.theater}`, COMBAT_SCENARIOS[branch.theater]);
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

export function runDeployment(ctx, svc, { mobilized = false } = {}) {
  const { rng } = ctx;
  const branch = BRANCHES[svc.branch];
  const theaterName = rng.pick(svc.sof ? PIPELINES[svc.sof.pipeline]?.deployments ?? THEATERS[branch.theater] : THEATERS[branch.theater]);
  const months = mobilized ? rng.int(9, 12) : rng.int(6, 9);
  svc.deployedThisYear = true;
  svc.deploymentRequested = false;
  svc.deployments += 1;

  ctx.log(`${mobilized ? 'Your reserve unit was mobilized. ' : ''}You deployed to ${theaterName} for ${months} months.`, branch.icon, 'military');
  ctx.stat('stress', 10);
  ctx.stat('happiness', -5);
  ctx.earn(225 * months + 2400, 'Hostile fire & family separation pay');

  const exposure = exposureOf(svc);
  const sawCombat = rng.chance(clamp(0.5 * exposure * combatFactor(ctx.state), 0.15, 0.95));
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
  ctx.emit('health:trauma', { amount: success ? 22 : 34, source: 'combat' });
  if (rng.chance(0.15)) ctx.emit('health:injury', { conditionId: 'hearingLoss', severity: rng.int(20, 50), serviceConnected: true });
  if (wounded) {
    ctx.emit('health:injury', { conditionId: rng.pick(['backInjury', 'tbi']), severity: rng.int(35, 75), serviceConnected: true });
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
  const event = pickFresh(ctx.rng, ctx.state, 'duty', DUTY_EVENTS);
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
  const mandatory = svc.yearsOfService >= 30 || ctx.state.character.age >= 62;
  const options = mandatory
    ? [{ id: 'retire', label: '🎖️ Retire with full honors' }]
    : [
        { id: 'reenlist', label: `✍️ ${svc.track === 'officer' ? 'Continue service' : 'Re-enlist'} (${svc.component === 'active' ? 4 : 6} yrs)`, hint: svc.track === 'enlisted' && svc.eval >= 60 ? 'Bonus eligible' : undefined },
        BRANCHES[svc.branch].reserveOnly || BRANCHES[svc.branch].activeOnly ? null : { id: 'switch', label: otherComponent === 'reserve' ? '🏡 Transfer to the Reserves' : '🪖 Go active duty', hint: otherComponent === 'active' && ctx.state.career.job ? 'Your civilian job is held on military leave' : undefined },
        svc.yearsOfService >= RETIREMENT_YEARS
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

function missionTick(ctx, svc) {
  const { rng } = ctx;
  const pool = MISSIONS[svc.branch] ?? [];
  if (!pool.length) return;
  const m = rng.pick(pool.filter((x) => !x.pilot || flightHoursOf(svc)).length ? pool.filter((x) => !x.pilot || flightHoursOf(svc)) : pool);
  ctx.log(m.text, BRANCHES[svc.branch].icon, 'military');
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

function pcs(ctx, svc) {
  const options = (BASES[svc.branch] ?? []).filter(([regionId]) => regionId !== ctx.state.character.regionId);
  if (!options.length) return;
  const [regionId, base] = ctx.rng.pick(options);
  svc.stationYears = 0;
  svc.station = base;
  ctx.emit('region:relocate', { regionId, reason: `PCS orders: report to ${base}.` });
}

export function activeDutyTick(ctx, svc) {
  const { rng } = ctx;
  const branch = BRANCHES[svc.branch];

  if (svc.isNew) {
    svc.isNew = false;
    ctx.log(`You survived ${entrySchool(svc)}, then finished ${specialtyName(svc)} training.`, '🎖️', 'military');
    completeTraining(ctx, svc);
    ctx.stat('fitness', rng.int(6, 12));
    ctx.stat('stress', 8);
  }

  svc.yearsOfService += 1;
  svc.yearsInGrade += 1;
  svc.contractYearsLeft -= 1;

  // Permanent change of station every ~3 years, starting right after training.
  svc.stationYears = (svc.stationYears ?? 99) + 1;
  if (svc.stationYears >= 3) pcs(ctx, svc);

  const rank = rankOf(svc);
  ctx.earn(annualActivePay(svc), `Military pay — ${rank.code} ${rank.title}`, { wage: true });
  if (flightHoursOf(svc)) ctx.emit('logbook:add', { hours: flightHoursOf(svc) });
  updateEvaluation(ctx, svc);
  // Your unit: the people you lead, your chain of command, and command boards.
  svc.eval = Math.round(clamp(svc.eval + unitTick(ctx, svc, ranksOf(svc)), 0, 100));
  sofTick(ctx, svc);
  // Random urinalysis: addiction shows up in the cup.
  if ((hasCondition(ctx.state, 'opioids') && rng.chance(0.35)) || (hasCondition(ctx.state, 'alcohol') && rng.chance(0.08))) {
    if (!ctx.state.military.service) return;
    ctx.log(hasCondition(ctx.state, 'opioids') ? 'You popped positive on a random urinalysis.' : 'You showed up to duty still drunk.', '🧪', 'bad');
    reportMisconduct(ctx, hasCondition(ctx.state, 'opioids') ? 'drugs' : 'drunkOnDuty');
  }

  const exposure = exposureOf(svc);
  const deployChance = 0.22 * exposure * warFactor(ctx.state) + (svc.deploymentRequested ? 0.5 : 0);
  if (branch.nonCombat) missionTick(ctx, svc);
  else if (rng.chance(clamp(deployChance, 0, 0.95))) runDeployment(ctx, svc);
  else if (rng.chance(0.45)) dutyEventPrompt(ctx);
  else ctx.log(`Another year in garrison with your ${specialtyName(svc)} unit. Evaluation: ${svc.eval}/100.`, branch.icon, 'military');

  annualReview(ctx, svc);
  tryPromotion(ctx, svc);
  if (upOrOut(ctx, svc)) return;
  if (svc.contractYearsLeft <= 0 || svc.yearsOfService >= 30 || ctx.state.character.age >= 62) openContractReview(ctx, svc);
}

export const ActiveDutyResolvers = {
  combat: resolveCombat,
  dutyEvent: resolveDutyEvent,
};
