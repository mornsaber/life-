/**
 * Volunteer Fire Department — service definition consumed by EmergencyEngine.
 *
 * Dispatch option fields:
 *   success  base success chance        risk   0–1 danger of injury
 *   xp       experience on success      cert   credential id required (CredentialRegistry)
 *   stat     stat that shifts success   heroic eligible for valor award on success
 *   save     a life is on the line (lifesaving award eligible)
 */
export const FireVolunteer = {
  id: 'fire',
  name: 'Volunteer Fire Department',
  short: 'Fire',
  icon: '🚒',
  minAge: 16,
  requirements: { fitness: 40, health: 50 },
  units: ['Station 12 — Cedar Hollow VFD', 'Engine 4 — Millbrook Fire Company', 'Station 3 — Lakeview Volunteer Fire', 'Company 7 — Ridgeway Hose Company'],
  callsPerYear: [25, 90],
  stipendPerCall: 15,
  ranks: [
    { title: 'Probationary Firefighter', xp: 0 },
    { title: 'Firefighter I', xp: 50, cert: 'ff1' },
    { title: 'Firefighter II', xp: 150, cert: 'ff2' },
    { title: 'Driver/Operator', xp: 300, cert: 'driverOperator' },
    { title: 'Lieutenant', xp: 480, cert: 'fireOfficer1' },
    { title: 'Captain', xp: 700, cert: 'fireOfficer2' },
    { title: 'Volunteer Fire Chief', xp: 1000, cert: 'fireOfficer2', minYears: 10 },
  ],
  credentials: ['ff1', 'ff2', 'emt', 'hazmatOps', 'driverOperator', 'fireOfficer1', 'fireOfficer2', 'ropeRescue', 'swiftwater', 'ics300'],
  trainingBudget: 2500,
  drills: [
    'Monthly drills: SCBA confidence course, ladder raises and hose advances.',
    'Live-burn training at the county burn tower.',
    'Vehicle extrication drill at the junkyard.',
    'Mayday and firefighter-rescue drills.',
  ],
  awards: {
    valor: { name: 'Fire Department Medal of Valor', icon: '🔥', prestige: 30, ribbon: [['#c8102e', 3], ['#ffd100', 1], ['#c8102e', 3]] },
    lifesaving: { name: 'Fire Lifesaving Award', icon: '🫀', prestige: 15, ribbon: [['#c8102e', 2], ['#fff', 1], ['#002868', 2], ['#fff', 1], ['#c8102e', 2]] },
    merit: { name: 'Fire Unit Citation', icon: '📜', prestige: 6, ribbon: [['#7a1f1f', 2], ['#ffd100', 3], ['#7a1f1f', 2]] },
  },
  dispatches: [
    {
      id: 'structure', title: '🔥 Working Structure Fire',
      text: 'Reported structure fire with possible entrapment. Heavy smoke from the second floor of a two-story home.',
      options: [
        { id: 'search', label: 'Primary search for victims', cert: 'ff1', success: 0.65, risk: 0.7, xp: 35, stat: 'fitness', heroic: true, save: true, successText: 'You found a child unconscious in a closet and carried them out.', failText: 'Conditions deteriorated and command pulled you out before you reached the bedrooms.' },
        { id: 'attack', label: 'Aggressive interior attack', cert: 'ff1', success: 0.7, risk: 0.55, xp: 30, stat: 'fitness', successText: 'Your crew knocked down the fire in minutes.', failText: 'You got disoriented in zero visibility and had to call a Mayday.' },
        { id: 'vent', label: 'Vertical ventilation from the roof', cert: 'ff2', success: 0.72, risk: 0.5, xp: 28, successText: 'Your vent hole lifted the smoke and the interior crews advanced.', failText: 'The roof was spongy; you retreated just as it sagged.' },
        { id: 'defensive', label: 'Defensive exterior attack', success: 0.9, risk: 0.12, xp: 15, successText: 'You protected exposures and kept it to one house.', failText: 'The fire spread to the neighbor\'s garage.' },
      ],
    },
    {
      id: 'mva', title: '🚗 Motor Vehicle Accident',
      text: 'Head-on collision on Route 9. One patient pinned, fuel leaking onto the road.',
      options: [
        { id: 'extricate', label: 'Extricate with hydraulic tools', cert: 'ff2', success: 0.8, risk: 0.3, xp: 28, save: true, successText: 'You peeled the roof and freed the patient in eight minutes.', failText: 'The extrication dragged on; the patient was flown out in critical condition.' },
        { id: 'care', label: 'Crawl in and provide patient care', cert: 'emt', success: 0.85, risk: 0.3, xp: 28, stat: 'smarts', save: true, successText: 'Your airway management kept the patient alive until extrication.', failText: 'The patient deteriorated despite your efforts.' },
        { id: 'foam', label: 'Control the fuel leak and lay foam', success: 0.86, risk: 0.2, xp: 18, successText: 'You prevented a fire and made the scene safe.', failText: 'A spark flashed the fuel; you were singed.' },
      ],
    },
    {
      id: 'brush', title: '🌲 Wind-Driven Brush Fire',
      text: 'A brush fire is racing uphill toward a subdivision. The wind just shifted.',
      options: [
        { id: 'hold', label: 'Hold the line at the subdivision', success: 0.62, risk: 0.55, xp: 30, stat: 'fitness', heroic: true, successText: 'You held the line. Not one home was lost.', failText: 'The fire jumped the line; you barely made it to the safety zone.' },
        { id: 'protect', label: 'Structure protection and door-to-door evac', success: 0.85, risk: 0.2, xp: 22, save: true, successText: 'You got every family out ahead of the flames.', failText: 'Smoke overcame you during evacuations.' },
        { id: 'fallback', label: 'Fall back to the safety zone', success: 0.95, risk: 0.04, xp: 10, successText: 'Smart call. Air tankers took it from there.', failText: 'Three homes burned.' },
      ],
    },
    {
      id: 'cardiac', title: '🫀 Cardiac Arrest',
      text: 'A 58-year-old collapsed at the diner. Bystanders are doing poor CPR.',
      options: [
        { id: 'code', label: 'Run the code: CPR, AED, airway', cert: 'emt', success: 0.7, risk: 0, xp: 25, stat: 'smarts', save: true, successText: 'You got a pulse back. He walked out of the hospital a week later.', failText: 'Despite everything, he didn\'t make it.' },
        { id: 'cpr', label: 'High-quality CPR until ALS arrives', success: 0.45, risk: 0, xp: 18, stat: 'fitness', save: true, successText: 'Your compressions bought him time. ROSC in the ambulance!', failText: 'He was pronounced at the hospital.' },
      ],
    },
    {
      id: 'hazmat', title: '☣️ Tanker Rollover',
      text: 'A tanker rolled on the interstate, leaking an unknown chemical. The driver is slumped in the cab.',
      options: [
        { id: 'identify', label: 'Identify the product and set the hot zone', cert: 'hazmatOps', success: 0.85, risk: 0.2, xp: 30, stat: 'smarts', successText: 'You identified anhydrous ammonia and evacuated downwind in time.', failText: 'The zone was too small; two bystanders were exposed.' },
        { id: 'rescue', label: 'Grab the driver from the hot zone', success: 0.5, risk: 0.85, xp: 35, heroic: true, save: true, successText: 'You dragged the driver out on one breath. Both of you survived.', failText: 'Fumes overwhelmed you; your crew had to rescue you.' },
        { id: 'deny', label: 'Deny entry and wait for regional HazMat', success: 0.92, risk: 0.04, xp: 12, successText: 'Textbook isolation. The team arrived and mitigated it.', failText: 'The driver died before the team arrived.' },
      ],
    },

    {
      id: 'chimney', title: '🏚️ Chimney Fire',
      text: 'Flames are shooting from a chimney on an old farmhouse. The family is outside in their pajamas.',
      options: [
        { id: 'attic', label: 'Check the attic for extension', cert: 'ff1', success: 0.78, risk: 0.35, xp: 22, successText: 'You caught fire creeping into the rafters and opened it up before it took the roof.', failText: 'The attic flashed while you were up there; you bailed down a ladder.' },
        { id: 'chimney', label: 'Drop a chimney bomb from the roof', cert: 'ff2', success: 0.8, risk: 0.3, xp: 20, successText: 'The chimney fire died in seconds. The family slept at home that night.', failText: 'The flue was cracked and fire got into the walls.' },
        { id: 'outside', label: 'Protect the house from outside and wait', success: 0.9, risk: 0.05, xp: 10, successText: 'It burned itself out in the flue.', failText: 'The roof caught. The family lost the upstairs.' },
      ],
    },
    {
      id: 'ice', title: '🧊 Ice Rescue',
      text: 'A teenager broke through the ice on the reservoir chasing a dog. He is clinging to the edge.',
      options: [
        { id: 'suit', label: 'Suit up and go out on a tethered line', cert: 'ff2', success: 0.75, risk: 0.45, xp: 32, stat: 'fitness', heroic: true, save: true, successText: 'You reached him with seconds to spare. The dog made it out on its own, of course.', failText: 'The ice gave way twice; your crew hauled you both back half-frozen.' },
        { id: 'reach', label: 'Reach-throw-row from shore', success: 0.6, risk: 0.1, xp: 20, save: true, successText: 'He caught the throw bag on the third try.', failText: 'His hands were too numb to hold the rope. Divers recovered him later.' },
      ],
    },
    {
      id: 'elevator', title: '🛗 Stuck Elevator',
      text: 'An elevator stalled between floors at the senior center. A woman inside is having chest pains.',
      options: [
        { id: 'emt', label: 'Talk her through it and assess through the gap', cert: 'emt', success: 0.85, risk: 0, xp: 18, stat: 'smarts', save: true, successText: 'Your calm voice and aspirin kept her stable until the car was moved.', failText: 'She went into arrest just as the doors opened.' },
        { id: 'force', label: 'Force the hoistway doors and pull her out', success: 0.7, risk: 0.25, xp: 20, stat: 'fitness', successText: 'Out in four minutes.', failText: 'The car shifted; you jumped back just in time.' },
        { id: 'tech', label: 'Wait for the elevator technician', success: 0.8, risk: 0, xp: 8, successText: 'The tech got it moving. She was fine.', failText: 'The tech took ninety minutes. It was a rough wait.' },
      ],
    },
    {
      id: 'barn', title: '🐄 Barn Fire',
      text: 'A dairy barn is fully involved. Forty cows are still inside and the farmer is trying to go back in.',
      options: [
        { id: 'animals', label: 'Open the far doors and drive the herd out', success: 0.55, risk: 0.55, xp: 28, stat: 'fitness', heroic: true, successText: 'The herd stampeded out the back. The farmer cried.', failText: 'The smoke drove you back. Only some made it.' },
        { id: 'farmer', label: 'Physically stop the farmer from going in', success: 0.85, risk: 0.1, xp: 15, save: true, successText: 'He fought you, then hugged you.', failText: 'He slipped past you; you had to go in after him.' },
        { id: 'tender', label: 'Run the water tender shuttle', success: 0.92, risk: 0.04, xp: 12, successText: 'You kept water flowing all night.', failText: 'The draft site froze and the attack lines went dry.' },
      ],
    },
    {
      id: 'co', title: '🫥 Carbon Monoxide Alarm',
      text: 'A CO alarm is sounding at a duplex. The tenant says it is "just broken." Her kids look sleepy.',
      options: [
        { id: 'meter', label: 'Meter the building and evacuate', cert: 'hazmatOps', success: 0.92, risk: 0.05, xp: 18, stat: 'smarts', save: true, successText: '400 ppm. A cracked furnace exchanger. You got everyone out.', failText: 'Your meter needed calibrating; you nearly cleared the house.' },
        { id: 'evac', label: 'Get everyone outside to fresh air first', success: 0.85, risk: 0.1, xp: 15, save: true, successText: 'The kids perked up outside. The utility shut off the gas.', failText: 'One child had to be transported.' },
        { id: 'leave', label: 'Reset the alarm and clear', success: 0.3, risk: 0, xp: 2, successText: 'It really was a bad detector.', failText: 'You were called back the next morning. It was not a bad detector.' },
      ],
    },
  ],
};
