/**
 * Police Reserve / Auxiliary program — service definition consumed by
 * EmergencyEngine. Options flagged `complaint` can generate a citizen
 * complaint (discipline) when they go wrong.
 */
export const PoliceReserves = {
  id: 'police',
  name: 'Police Reserve Unit',
  short: 'Police',
  icon: '🚔',
  minAge: 21,
  requirements: { fitness: 40, smarts: 35, health: 50 },
  excludesProfession: 'police',
  units: ['Metro City PD Reserve Corps', 'Harbor County Sheriff\'s Reserves', 'Pine Valley PD Auxiliary'],
  callsPerYear: [30, 110],
  stipendPerCall: 20,
  ranks: [
    { title: 'Auxiliary Officer', xp: 0 },
    { title: 'Reserve Officer', xp: 60, cert: 'postReserve' },
    { title: 'Senior Reserve Officer', xp: 180, cert: 'fto' },
    { title: 'Reserve Corporal', xp: 320, cert: 'fto' },
    { title: 'Reserve Sergeant', xp: 480, cert: 'supervisorCourse' },
    { title: 'Reserve Lieutenant', xp: 700, cert: 'commandCollege' },
    { title: 'Reserve Inspector', xp: 1000, cert: 'commandCollege', minYears: 10 },
  ],
  credentials: ['postReserve', 'fto', 'cit', 'trafficEnforcement', 'firearmsInstructor', 'supervisorCourse', 'commandCollege', 'hazmatOps'],
  trainingBudget: 2500,
  drills: [
    'Monthly in-service: defensive tactics and legal updates.',
    'Range day: quarterly firearms qualification.',
    'Scenario training: active-threat response at the high school.',
    'Ride-along shifts with full-time patrol units.',
  ],
  awards: {
    valor: { name: 'Police Medal of Valor', icon: '🛡️', prestige: 30, ribbon: [['#002868', 3], ['#ffd100', 1], ['#002868', 3]] },
    lifesaving: { name: 'Police Lifesaving Medal', icon: '🫀', prestige: 15, ribbon: [['#002868', 2], ['#fff', 1], ['#c8102e', 2], ['#fff', 1], ['#002868', 2]] },
    merit: { name: 'Meritorious Service Award', icon: '📜', prestige: 8, ribbon: [['#1f3f7a', 2], ['#9fb8e6', 3], ['#1f3f7a', 2]] },
  },
  dispatches: [
    {
      id: 'traffic', title: '🚦 High-Risk Traffic Stop',
      text: 'You stop a car for running a red light. The driver is sweating and keeps reaching under the seat.',
      options: [
        { id: 'cover', label: 'Order hands on the wheel, call for cover', success: 0.86, risk: 0.12, xp: 15, successText: 'Cover arrived; you found an unregistered handgun and made a clean arrest.', failText: 'The driver sped off before cover arrived.' },
        { id: 'dui', label: 'Run standardized field sobriety tests', cert: 'trafficEnforcement', success: 0.85, risk: 0.1, xp: 22, stat: 'smarts', successText: 'He blew a 0.16. A dangerous driver is off the road.', failText: 'The case got tossed on a procedural error.' },
        { id: 'passenger', label: 'Tactical passenger-side approach', success: 0.75, risk: 0.25, xp: 18, successText: 'You caught him stuffing drugs under the seat. Clean arrest.', failText: 'He swung the door into you during the approach.' },
        { id: 'search', label: 'Search the car without probable cause', success: 0.5, risk: 0.08, xp: 5, complaint: true, successText: 'You found contraband — but the DA is uneasy about the search.', failText: 'Nothing found. The driver filed a complaint.' },
      ],
    },
    {
      id: 'domestic', title: '🏠 Domestic Disturbance',
      text: 'Neighbors report screaming and breaking glass. You\'re first on scene.',
      options: [
        { id: 'deescalate', label: 'Separate the parties and de-escalate', cert: 'cit', success: 0.85, risk: 0.15, xp: 25, stat: 'smarts', save: true, successText: 'You calmed everyone down and connected the victim with an advocate.', failText: 'Things flared up again after you left.' },
        { id: 'entry', label: 'Force entry — someone is screaming for help', success: 0.62, risk: 0.5, xp: 28, stat: 'fitness', heroic: true, save: true, successText: 'You burst in and stopped an assault in progress.', failText: 'You were injured in the struggle.' },
        { id: 'wait', label: 'Hold the perimeter for full-time units', success: 0.9, risk: 0.04, xp: 8, successText: 'Backup arrived and resolved it safely.', failText: 'The suspect fled out the back.' },
      ],
    },
    {
      id: 'crowd', title: '🎡 Fight at the County Fair',
      text: 'A brawl breaks out near the midway. A crowd is forming and phones are out.',
      options: [
        { id: 'wade', label: 'Wade in and separate the fighters', success: 0.6, risk: 0.35, xp: 18, stat: 'fitness', complaint: true, successText: 'You broke it up without anyone seriously hurt.', failText: 'A viral video shows you shoving a bystander.' },
        { id: 'perimeter', label: 'Call it out and set a perimeter', success: 0.86, risk: 0.1, xp: 15, successText: 'Crowd control was smooth. Two arrests.', failText: 'The fight spilled into the parking lot.' },
      ],
    },
    {
      id: 'pursuit', title: '🏃 Foot Pursuit',
      text: 'A shoplifting suspect bolts from the pharmacy and heads for the rail yard.',
      options: [
        { id: 'chase', label: 'Chase on foot', success: 0.55, risk: 0.3, xp: 20, stat: 'fitness', successText: 'You ran him down over three fences.', failText: 'You twisted an ankle on the tracks.' },
        { id: 'contain', label: 'Radio a perimeter and wait him out', cert: 'fto', success: 0.8, risk: 0.05, xp: 18, successText: 'He walked straight into the containment.', failText: 'He slipped the perimeter.' },
        { id: 'report', label: 'Let it go and write the report', success: 0.96, risk: 0, xp: 4, successText: 'Report filed. Shift goes on.', failText: 'The sergeant asked why you didn\'t pursue.' },
      ],
    },
    {
      id: 'crash', title: '🚗 Burning Car',
      text: 'You come upon a crash: car on fire, driver unconscious and trapped by the seatbelt.',
      options: [
        { id: 'pull', label: 'Cut the belt and pull the driver out', success: 0.55, risk: 0.6, xp: 35, stat: 'fitness', heroic: true, save: true, successText: 'You dragged him clear seconds before the car was engulfed.', failText: 'Flames drove you back with burns to your arms.' },
        { id: 'extinguisher', label: 'Hit it with your extinguisher and wait for fire', success: 0.72, risk: 0.2, xp: 20, save: true, successText: 'You kept the fire off the cabin until the engine arrived.', failText: 'The extinguisher ran dry too soon.' },
      ],
    },
    {
      id: 'welfare', title: '🚪 Welfare Check',
      text: 'An elderly man hasn\'t answered his door in three days. Mail is piling up.',
      options: [
        { id: 'force', label: 'Force entry', success: 0.72, risk: 0.05, xp: 25, heroic: false, save: true, successText: 'He\'d fallen and couldn\'t get up. You got him to the hospital in time.', failText: 'It was too late.' },
        { id: 'key', label: 'Wait for the landlord\'s key', success: 0.5, risk: 0, xp: 12, save: true, successText: 'You found him dehydrated but alive.', failText: 'The delay cost him.' },
      ],
    },
  ],
};
