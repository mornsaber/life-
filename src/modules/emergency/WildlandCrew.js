/**
 * Wildland Fire Crew — seasonal on-call hand crew. Long, dangerous days on
 * the fire line; the only service here that can send you out of state.
 */
export const WildlandCrew = {
  id: 'wildland',
  name: 'Wildland Fire Crew',
  short: 'Wildland',
  icon: '🌲',
  minAge: 18,
  requirements: { fitness: 60, health: 60 },
  units: ['Cedar Ridge Hand Crew', 'Tamarack Fire Module', 'Sagebrush Wildland Engine 7', 'Pine Hollow Type 2 Crew'],
  callsPerYear: [4, 16],
  stipendPerCall: 400,
  ranks: [
    { title: 'Crew Member', xp: 0 },
    { title: 'Firefighter (FFT2)', xp: 30, cert: 'wildlandFF2' },
    { title: 'Senior Firefighter', xp: 110, cert: 'wildlandFF2' },
    { title: 'Squad Boss (FFT1)', xp: 220, cert: 'wildlandFF1' },
    { title: 'Crew Boss', xp: 420, cert: 'ics300' },
    { title: 'Strike Team Leader', xp: 700, cert: 'ics300', minYears: 5 },
    { title: 'Division Supervisor', xp: 1000, cert: 'ics300', minYears: 10 },
  ],
  credentials: ['wildlandFF2', 'wildlandFF1', 'ics300', 'wfr', 'evoc'],
  trainingBudget: 2000,
  drills: [
    'Fireline construction drills — the pack test is three miles in 45 minutes with 45 pounds.',
    'Fire-shelter deployment practice.',
    'Chainsaw certification refresher.',
    'Sand-table exercises on extreme fire behavior.',
  ],
  awards: {
    valor: { name: 'Wildland Fire Medal of Valor', icon: '🌲', prestige: 28, ribbon: [['#2e5e2a', 3], ['#e86a17', 1], ['#2e5e2a', 3]] },
    lifesaving: { name: 'Wildland Lifesaving Award', icon: '🫀', prestige: 15, ribbon: [['#e86a17', 2], ['#2e5e2a', 3], ['#e86a17', 2]] },
    merit: { name: 'Crew Achievement Award', icon: '📜', prestige: 6, ribbon: [['#7a5c2e', 2], ['#2e5e2a', 3], ['#7a5c2e', 2]] },
  },
  dispatches: [
    {
      id: 'spotover', title: '🔥 Spot Fire Across the Line',
      text: 'Embers jumped your containment line. A spot fire is growing in the brush on the green side.',
      options: [
        { id: 'catch', label: 'Hit it with hand tools before it grows', success: 0.65, risk: 0.45, xp: 30, stat: 'fitness', heroic: true, successText: 'You caught it at a quarter acre. The line held.', failText: 'It ran uphill; you pulled back to the safety zone.' },
        { id: 'call', label: 'Call it in and hold the main line', success: 0.85, risk: 0.1, xp: 18, successText: 'Air tankers dropped retardant on it within the hour.', failText: 'By the time help came it was 40 acres.' },
      ],
    },
    {
      id: 'burnover', title: '🌪️ Fire Making a Run',
      text: 'The wind shifted and the fire is running toward your crew. Your escape route is filling with smoke.',
      options: [
        { id: 'escape', label: 'Lead the crew to the safety zone now', cert: 'wildlandFF1', success: 0.85, risk: 0.3, xp: 30, stat: 'smarts', heroic: true, save: true, successText: 'Everyone made the black with minutes to spare.', failText: 'You made it, but two crew members were burned.' },
        { id: 'shelter', label: 'Deploy fire shelters', success: 0.6, risk: 0.65, xp: 26, save: true, successText: 'The front passed over. Everyone climbed out alive.', failText: 'The heat was brutal. Hospital for everyone.' },
      ],
    },
    {
      id: 'structureWui', title: '🏡 Homes in the Path',
      text: 'The fire is approaching a subdivision in the wildland–urban interface.',
      options: [
        { id: 'prep', label: 'Structure prep: clear brush, set sprinklers', success: 0.8, risk: 0.25, xp: 24, successText: 'The fire skirted the subdivision. Not one home burned.', failText: 'Three homes were lost despite your work.' },
        { id: 'burnout', label: 'Burn out from the road to rob the fire of fuel', cert: 'wildlandFF1', success: 0.7, risk: 0.35, xp: 30, stat: 'smarts', successText: 'The burnout held. The neighborhood was saved.', failText: 'The burnout slopped over; you fought it for hours.' },
      ],
    },
    {
      id: 'mopup', title: '🪵 Mop-Up Duty',
      text: 'Fourteen days of mop-up: digging out smoldering roots in the ash.',
      options: [
        { id: 'grind', label: 'Grind it out with your crew', success: 0.9, risk: 0.05, xp: 15, stat: 'fitness', successText: 'Cold-trailed every hot spot. The fire was declared out.', failText: 'A hidden stump flared up a week later.' },
        { id: 'saw', label: 'Run a saw on the hazard trees', success: 0.75, risk: 0.3, xp: 20, successText: 'You dropped forty snags safely.', failText: 'A widowmaker came down too close for comfort.' },
      ],
    },
  ],
};
