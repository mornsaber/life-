/**
 * Military events, as decks ActiveDuty plays (military/ActiveDuty.js):
 *   combat.ground / combat.naval / combat.air / combat.maritime   a firefight on deployment
 *   duty.garrison                                                 peacetime and garrison life
 *
 * Combat option fields:
 *   success: base success probability   risk: 0–1 danger (wounds / death)
 *   valor:   0–110 heroism of the act    medicOnly / specialty: gating & bonus
 * Duty option fields: text, effects { eval, disciplinary, cash, stats }, check { stat, min } with
 * failText and failEffects, risky { chance, text, eval, disciplinary, ucmj }, medal (an award id).
 */
const combat = {
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

const garrison = [
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

export default {
  id: 'military-events',
  version: 1,
  decks: { 'combat.ground': combat.ground, 'combat.naval': combat.naval, 'combat.air': combat.air, 'combat.maritime': combat.maritime, 'duty.garrison': garrison },
};
