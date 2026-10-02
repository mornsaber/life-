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
  trainingBudget: 2000,
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

    {
      id: 'shoplift', title: '🛒 Shoplifter in Custody',
      text: 'Store security is holding a teenager who stole baby formula. She says it is for her little sister.',
      options: [
        { id: 'divert', label: 'Refer her to a diversion program', cert: 'cit', success: 0.85, risk: 0, xp: 15, stat: 'smarts', successText: 'The store agreed. You left her with a food bank card.', failText: 'The store insisted on charges.' },
        { id: 'cite', label: 'Write the citation and move on', success: 0.95, risk: 0, xp: 8, successText: 'By the book.', failText: 'She ran while you wrote it.' },
        { id: 'pay', label: 'Quietly pay for the formula yourself', success: 0.9, risk: 0, xp: 12, successText: 'The manager let it go. She thanked you twice.', failText: 'Your sergeant said you can\'t do that every time.' },
      ],
    },
    {
      id: 'missing', title: '🧒 Missing Child at the Mall',
      text: 'A four-year-old has been missing for twenty minutes. The parents are frantic.',
      options: [
        { id: 'lockdown', label: 'Lock down the exits and check the cameras', cert: 'fto', success: 0.85, risk: 0.05, xp: 25, stat: 'smarts', save: true, successText: 'Camera 14: he was asleep in a furniture display. Reunited in minutes.', failText: 'It took hours; he was found two stores over, safe.' },
        { id: 'search', label: 'Search the stores yourself', success: 0.6, risk: 0, xp: 15, save: true, successText: 'You found him in the toy aisle.', failText: 'Security found him first.' },
      ],
    },
    {
      id: 'parade', title: '🎉 Parade Detail',
      text: 'You are working the holiday parade. A driver ignores the barricade and rolls toward the crowd.',
      options: [
        { id: 'stop', label: 'Step in front and command the stop', success: 0.65, risk: 0.45, xp: 30, heroic: true, save: true, successText: 'He stopped a foot from you. Confused, elderly, and very sorry.', failText: 'He clipped you before stopping.' },
        { id: 'clear', label: 'Clear the crowd out of the path', success: 0.8, risk: 0.15, xp: 22, save: true, successText: 'People scattered just in time.', failText: 'Two spectators were bumped and bruised.' },
      ],
    },
    {
      id: 'overdose', title: '💉 Overdose in a Parked Car',
      text: 'A man is slumped over the wheel, lips blue, needle in his lap.',
      options: [
        { id: 'narcan', label: 'Administer naloxone and rescue breaths', success: 0.82, risk: 0.05, xp: 22, save: true, successText: 'He gasped back to life. He was not grateful, but he was alive.', failText: 'Fentanyl; it took three doses and he still went to the ICU.' },
        { id: 'ems', label: 'Wait for EMS', success: 0.4, risk: 0, xp: 6, save: true, successText: 'EMS arrived in time.', failText: 'EMS was eight minutes out. Too late.' },
      ],
    },
    {
      id: 'scam', title: '📞 Elder Fraud Report',
      text: 'An 84-year-old says "the IRS" made her buy $9,000 in gift cards.',
      options: [
        { id: 'trace', label: 'Trace the gift cards before they are drained', cert: 'trafficEnforcement', success: 0.5, risk: 0, xp: 20, stat: 'smarts', successText: 'You froze $6,000 of it. She baked the station a pie.', failText: 'Drained within the hour.' },
        { id: 'report', label: 'Take the report and connect her with Adult Protective Services', success: 0.95, risk: 0, xp: 12, successText: 'APS set up safeguards on her accounts.', failText: 'She was scammed again a month later.' },
      ],
    },
  ],
};
