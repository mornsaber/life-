/**
 * CERT — Community Emergency Response Teams: neighbors trained by FEMA and
 * the local fire department in disaster first aid, light search and rescue,
 * triage and shelter support, for the hours before professionals arrive.
 */
export const CommunityResponse = {
  id: 'cert',
  name: 'Community Emergency Response Team',
  short: 'CERT',
  icon: '🦺',
  minAge: 16,
  requirements: { fitness: 25, health: 40 },
  units: ['Northside Neighborhood CERT', 'Harbor District CERT', 'University CERT', 'County CERT Battalion'],
  callsPerYear: [2, 10],
  stipendPerCall: 0,
  ranks: [
    { title: 'CERT Member', xp: 0 },
    { title: 'Team Lead', xp: 60, cert: 'emr' },
    { title: 'Section Chief', xp: 180, cert: 'ics300' },
    { title: 'CERT Program Coordinator', xp: 400, cert: 'ics300', minYears: 5 },
  ],
  credentials: ['emr', 'ics300', 'hazmatOps', 'landNav'],
  trainingBudget: 600,
  drills: [
    'Disaster triage drill with moulage victims in the high school gym.',
    'Cribbing and light search exercise at the fire training tower.',
    'Shelter setup drill with the Red Cross.',
    'Neighborhood door-to-door preparedness canvass.',
  ],
  awards: {
    valor: { name: 'Citizen Corps Valor Award', icon: '🦺', prestige: 18, ribbon: [['#0d3b66', 3], ['#f4d35e', 1], ['#0d3b66', 3]] },
    lifesaving: { name: 'Community Lifesaving Award', icon: '🫀', prestige: 11, ribbon: [['#0d3b66', 2], ['#ee964b', 3], ['#0d3b66', 2]] },
    merit: { name: 'CERT Service Award', icon: '📜', prestige: 4, ribbon: [['#f4d35e', 2], ['#0d3b66', 3], ['#f4d35e', 2]] },
  },
  dispatches: [
    {
      id: 'quake', title: '🏚️ Earthquake in Your Neighborhood',
      text: 'A strong quake just hit. Fire and EMS are overwhelmed citywide. Your block has injuries and a partially collapsed garage.',
      options: [
        { id: 'triage', label: 'Set up START triage on the street', cert: 'emr', success: 0.85, risk: 0.1, xp: 26, stat: 'smarts', save: true, successText: 'You sorted 14 injured neighbors; the two critical ones were first on the ambulance.', failText: 'Chaos won; you did what you could.' },
        { id: 'crib', label: 'Crib the garage and pull out the trapped neighbor', success: 0.6, risk: 0.5, xp: 28, heroic: true, save: true, successText: 'Your team lifted the beam two inches at a time and slid him out.', failText: 'An aftershock forced everyone back until the fire department arrived.' },
        { id: 'gas', label: 'Walk the block shutting off gas meters', success: 0.9, risk: 0.1, xp: 14, successText: 'No fires on your street that night.', failText: 'A neighbor\'s line ignited before you got there.' },
      ],
    },
    {
      id: 'tornado', title: '🌪️ Tornado Touchdown',
      text: 'A tornado tore through a trailer park two miles away. The roads are blocked with trees.',
      options: [
        { id: 'search', label: 'Run a light search of damaged homes', cert: 'ics300', success: 0.75, risk: 0.3, xp: 24, save: true, successText: 'You marked every structure and found an elderly woman pinned under a cabinet.', failText: 'Live wires kept your team out of the worst block.' },
        { id: 'traffic', label: 'Control traffic so ambulances can get through', success: 0.9, risk: 0.1, xp: 12, successText: 'Ambulances had a clear lane in and out all night.', failText: 'Gawkers jammed the road anyway.' },
      ],
    },
    {
      id: 'shelter', title: '🏫 Evacuation Shelter',
      text: 'A wildfire evacuation filled the high school gym with 300 people and their pets.',
      options: [
        { id: 'run', label: 'Run the shelter intake desk', cert: 'ics300', success: 0.85, risk: 0, xp: 16, stat: 'smarts', successText: 'Every family was registered and every medication need logged.', failText: 'Two families were double-booked and a fight broke out.' },
        { id: 'cots', label: 'Set up cots and hand out water', success: 0.95, risk: 0, xp: 10, successText: 'A long night, but everyone slept somewhere safe.', failText: 'You ran out of cots by midnight.' },
      ],
    },
    {
      id: 'heatCheck', title: '🌡️ Heat Wave Wellness Checks',
      text: 'It\'s 112°F and the power is out in an older neighborhood full of seniors living alone.',
      options: [
        { id: 'checks', label: 'Go door to door with water and cooling towels', success: 0.85, risk: 0.1, xp: 16, save: true, successText: 'You found a man in heat stroke and got him to a cooling center in time.', failText: 'Some doors never opened.' },
        { id: 'phones', label: 'Staff the phone tree from the community center', success: 0.9, risk: 0, xp: 10, successText: 'Every senior on the list was reached.', failText: 'The cell network was jammed.' },
      ],
    },
  ],
};
