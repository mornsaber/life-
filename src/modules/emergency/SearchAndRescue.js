/**
 * Search & Rescue team — service definition consumed by EmergencyEngine.
 * The K9 Handler credential pairs you with a search dog (tracked in the
 * member record) that unlocks the strongest search options. When a dog
 * retires, certified handlers are paired with a new pup.
 */
export const K9_NAMES = ['Ranger', 'Juno', 'Koda', 'Maple', 'Blue', 'Tracker', 'Nova', 'Bear', 'Willow', 'Ace'];
export const K9_BREEDS = ['German Shepherd', 'Belgian Malinois', 'Bloodhound', 'Labrador Retriever', 'Border Collie'];
export const K9_RETIREMENT_AGE = 10;

export const SearchAndRescue = {
  id: 'sar',
  name: 'Search & Rescue Team',
  short: 'SAR',
  icon: '🧗',
  minAge: 18,
  requirements: { fitness: 45, health: 55 },
  units: ['Cascade County SAR', 'Blue Ridge Mountain Rescue', 'Tahoe Nordic SAR', 'Gila Backcountry Rescue'],
  callsPerYear: [8, 30],
  stipendPerCall: 0,
  ranks: [
    { title: 'SAR Trainee', xp: 0 },
    { title: 'Field Team Member', xp: 50, cert: 'wfr' },
    { title: 'Senior Field Member', xp: 150, cert: 'landNav' },
    { title: 'Team Leader', xp: 300, cert: 'ropeRescue' },
    { title: 'Field Coordinator', xp: 480, cert: 'ics300' },
    { title: 'Operations Chief', xp: 700, cert: 'ics300', minYears: 6 },
    { title: 'SAR Commander', xp: 1000, cert: 'ics300', minYears: 10 },
  ],
  credentials: ['wfr', 'landNav', 'ropeRescue', 'swiftwater', 'k9Handler', 'avalanche', 'ics300', 'emt'],
  trainingBudget: 1800,
  drills: [
    'Monthly training: rope systems at the quarry.',
    'Night navigation exercise in the national forest.',
    'Mock mass-casualty exercise with county EMS.',
    'Swiftwater recertification on the river.',
  ],
  awards: {
    valor: { name: 'Distinguished Rescue Medal', icon: '🏔️', prestige: 25, ribbon: [['#e86a17', 3], ['#fff', 1], ['#e86a17', 3]] },
    lifesaving: { name: 'SAR Lifesaving Commendation', icon: '🫀', prestige: 15, ribbon: [['#e86a17', 2], ['#1f6f43', 3], ['#e86a17', 2]] },
    merit: { name: 'SAR Mission Commendation', icon: '📜', prestige: 6, ribbon: [['#1f6f43', 2], ['#e86a17', 3], ['#1f6f43', 2]] },
  },
  dispatches: [
    {
      id: 'lostHiker', title: '🥾 Overdue Hiker',
      text: 'A hiker is overdue at dusk. Temperatures are dropping below freezing.',
      options: [
        { id: 'k9', label: 'Deploy your K9 on the last known point', cert: 'k9Handler', success: 0.9, risk: 0.05, xp: 28, save: true, successText: 'Your dog alerted within an hour. Hypothermic but alive.', failText: 'Rain washed the scent away.' },
        { id: 'grid', label: 'Run a methodical grid search', cert: 'landNav', success: 0.8, risk: 0.1, xp: 22, stat: 'smarts', save: true, successText: 'Your team found her in a drainage two miles off-trail.', failText: 'The search stretched to three days.' },
        { id: 'hasty', label: 'Hasty search along the trail', success: 0.6, risk: 0.15, xp: 20, stat: 'fitness', save: true, successText: 'You found him sheltering under a rock ledge.', failText: 'You searched until 3 AM with nothing.' },
        { id: 'wait', label: 'Wait for first light', success: 0.8, risk: 0, xp: 8, successText: 'Found at dawn — cold, but okay.', failText: 'He spent a brutal night out. Frostbite.' },
      ],
    },
    {
      id: 'climber', title: '🧗 Stranded Climber',
      text: 'A climber is stranded on a ledge 300 feet up a granite face with a broken leg.',
      options: [
        { id: 'lower', label: 'Rig a technical lowering system', cert: 'ropeRescue', success: 0.8, risk: 0.35, xp: 35, stat: 'smarts', heroic: true, save: true, successText: 'A flawless litter lower in the dark. Textbook.', failText: 'A rock fall forced the team to abort and wait for a hoist.' },
        { id: 'freeclimb', label: 'Free-climb up to stabilize them', success: 0.4, risk: 0.85, xp: 30, stat: 'fitness', heroic: true, save: true, successText: 'You reached the ledge and kept them alive until the hoist.', failText: 'You slipped and fell 20 feet onto a lower ledge.' },
        { id: 'hoist', label: 'Request a helicopter hoist', success: 0.7, risk: 0.08, xp: 15, save: true, successText: 'The helicopter plucked them off at first light.', failText: 'Winds grounded the helicopter until morning.' },
      ],
    },
    {
      id: 'flood', title: '🌊 Flash Flood',
      text: 'A flash flood swept a car into the river. A family is on the roof as it floats downstream.',
      options: [
        { id: 'tethered', label: 'Tethered swimmer rescue', cert: 'swiftwater', success: 0.78, risk: 0.5, xp: 35, stat: 'fitness', heroic: true, save: true, successText: 'You swam each family member to shore on the tether.', failText: 'The current was too strong — the line had to haul you back.' },
        { id: 'throwbag', label: 'Throw bags from the bank', success: 0.55, risk: 0.2, xp: 20, save: true, successText: 'Perfect throws. Everyone clung on and was pulled in.', failText: 'Throws fell short as the car drifted.' },
        { id: 'swim', label: 'Swim out untethered', success: 0.35, risk: 0.9, xp: 25, heroic: true, save: true, successText: 'Against all odds, you pulled a child to shore.', failText: 'The river took you a quarter mile before you crawled out.' },
      ],
    },
    {
      id: 'avalanche', title: '🏔️ Avalanche Burial',
      text: 'An avalanche buried two backcountry skiers. The clock is running — survival odds drop fast after 15 minutes.',
      options: [
        { id: 'beacon', label: 'Beacon search and probe line', cert: 'avalanche', success: 0.8, risk: 0.35, xp: 35, heroic: true, save: true, successText: 'You located and dug out both skiers alive.', failText: 'You got one out alive. The other was too deep.' },
        { id: 'k9', label: 'Run your K9 across the debris', cert: 'k9Handler', success: 0.75, risk: 0.3, xp: 30, save: true, successText: 'Your dog pinpointed the first victim in four minutes.', failText: 'Wind-loaded snow masked the scent.' },
        { id: 'dig', label: 'Dig where the debris looks deepest', success: 0.3, risk: 0.3, xp: 15, save: true, successText: 'A lucky guess — you hit a ski pole and dug down to them.', failText: 'Wrong spot. A second slide forced everyone off the slope.' },
      ],
    },
    {
      id: 'child', title: '🧸 Missing Child',
      text: 'A 6-year-old wandered away from a campsite two hours ago. Hundreds of volunteers are showing up.',
      options: [
        { id: 'k9', label: 'Trail with your K9 from the tent', cert: 'k9Handler', success: 0.9, risk: 0.02, xp: 30, save: true, successText: 'Your dog found him asleep under a fallen log.', failText: 'The trail went cold at a road.' },
        { id: 'ics', label: 'Organize the volunteers into search segments', cert: 'ics300', success: 0.85, risk: 0.02, xp: 25, stat: 'smarts', save: true, successText: 'Segment 14 found her. Your plan worked.', failText: 'Volunteers trampled the scene and it took two days.' },
        { id: 'creek', label: 'Search the creek bed alone', success: 0.55, risk: 0.25, xp: 20, save: true, successText: 'You heard crying near the creek and found him.', failText: 'You slipped on the rocks; another team found the child.' },
      ],
    },
  ],
};
