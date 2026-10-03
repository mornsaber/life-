/**
 * American Red Cross Disaster Action Team: volunteers who show up at 3 a.m.
 * after a house fire with a debit card, a blanket and a plan, and who deploy
 * to hurricane and flood shelters nationwide.
 */
export const RedCross = {
  id: 'redcross',
  name: 'Red Cross Disaster Action Team',
  short: 'Red Cross',
  icon: '➕',
  minAge: 18,
  requirements: { health: 35 },
  units: ['Metro Chapter Disaster Action Team', 'River Valley Chapter', 'Coastal Chapter DAT', 'Heartland Chapter'],
  callsPerYear: [4, 18],
  stipendPerCall: 0,
  ranks: [
    { title: 'Disaster Action Team Member', xp: 0 },
    { title: 'DAT Supervisor', xp: 80, cert: 'emr' },
    { title: 'Shelter Manager', xp: 220, cert: 'ics300' },
    { title: 'Disaster Program Manager', xp: 480, cert: 'ics300', minYears: 6 },
  ],
  credentials: ['emr', 'ics300', 'cna', 'emt'],
  trainingBudget: 800,
  drills: [
    'Shelter fundamentals course at the chapter house.',
    'Psychological first aid training.',
    'Disaster assessment drive-through exercise.',
    'Blood drive volunteer shift.',
  ],
  awards: {
    valor: { name: 'Red Cross Certificate of Extraordinary Personal Action', icon: '➕', prestige: 18, ribbon: [['#ed1b2e', 3], ['#fff', 1], ['#ed1b2e', 3]] },
    lifesaving: { name: 'Red Cross Lifesaving Award', icon: '🫀', prestige: 12, ribbon: [['#ed1b2e', 2], ['#fff', 3], ['#ed1b2e', 2]] },
    merit: { name: 'Red Cross Volunteer Service Pin', icon: '📍', prestige: 4, ribbon: [['#fff', 2], ['#ed1b2e', 3], ['#fff', 2]] },
  },
  dispatches: [
    {
      id: 'houseFire', title: '🔥 3 A.M. House Fire',
      text: 'A family of five lost everything in a house fire. They\'re standing on the curb in pajamas.',
      options: [
        { id: 'casework', label: 'Open a case: hotel, debit card, recovery plan', cert: 'ics300', success: 0.9, risk: 0, xp: 18, stat: 'smarts', successText: 'They slept in a hotel that night with money for clothes and a caseworker in the morning.', failText: 'Every hotel was full; they slept at a church.' },
        { id: 'comfort', label: 'Sit with the kids and bring blankets', success: 0.95, risk: 0, xp: 10, successText: 'The youngest fell asleep on your shoulder.', failText: 'The kids were inconsolable.' },
      ],
    },
    {
      id: 'hurricane', title: '🌀 Hurricane Deployment',
      text: 'A Category 4 hurricane hit the Gulf Coast. The Red Cross is deploying volunteers for two weeks.',
      options: [
        { id: 'manage', label: 'Manage a 500-person shelter', cert: 'ics300', success: 0.8, risk: 0.1, xp: 32, stat: 'smarts', successText: 'You ran a clean, safe shelter through two weeks of chaos.', failText: 'A norovirus outbreak swept the shelter.' },
        { id: 'health', label: 'Staff the shelter health station', cert: 'emr', success: 0.85, risk: 0.1, xp: 26, save: true, successText: 'You caught a diabetic crisis early and got her to a hospital.', failText: 'Supplies ran out on day three.' },
        { id: 'meals', label: 'Serve meals from an emergency response vehicle', success: 0.95, risk: 0.05, xp: 16, successText: 'Thousands of hot meals in flooded neighborhoods.', failText: 'Flooded roads stranded your truck for a day.' },
      ],
    },
    {
      id: 'apartmentFire', title: '🏢 Apartment Complex Fire',
      text: 'A four-alarm fire displaced 40 families, many of whom don\'t speak English.',
      options: [
        { id: 'center', label: 'Open a reception center at the rec hall', cert: 'ics300', success: 0.85, risk: 0, xp: 20, successText: 'Translators, cots and caseworkers were in place by sunrise.', failText: 'The building had no heat; you had to move everyone.' },
        { id: 'translate', label: 'Find bilingual volunteers and help with intake', success: 0.85, risk: 0, xp: 12, successText: 'Every family was registered.', failText: 'Families slipped through the cracks.' },
      ],
    },
    {
      id: 'bloodShortage', title: '🩸 Emergency Blood Shortage',
      text: 'After a mass-casualty crash, the regional blood supply is down to a day.',
      options: [
        { id: 'drive', label: 'Organize an emergency blood drive', success: 0.85, risk: 0, xp: 14, successText: '312 donors in one day.', failText: 'Turnout was disappointing.' },
        { id: 'donate', label: 'Donate and drive donors in', success: 0.95, risk: 0, xp: 8, save: true, successText: 'Your O-negative went straight to the trauma center.', failText: 'You were deferred for low iron.' },
      ],
    },
  ],
};
