/**
 * National Ski Patrol — volunteer patrollers who sweep runs, handle
 * on-mountain injuries with toboggans, and assist with avalanche control and
 * backcountry rescues. Candidates start at 15.
 */
export const SkiPatrol = {
  id: 'skiPatrol',
  name: 'National Ski Patrol',
  short: 'Ski Patrol',
  icon: '⛷️',
  minAge: 15,
  requirements: { fitness: 55, health: 55 },
  units: ['Summit Peak Volunteer Patrol', 'Eagle Ridge Ski Patrol', 'Northwoods Nordic Patrol', 'Granite Bowl Patrol'],
  callsPerYear: [8, 35],
  stipendPerCall: 0,
  ranks: [
    { title: 'Candidate Patroller', xp: 0 },
    { title: 'Basic Patroller', xp: 50, cert: 'emr' },
    { title: 'Senior Patroller', xp: 180, cert: 'wfr' },
    { title: 'Hill Captain', xp: 360, cert: 'avalanche' },
    { title: 'Patrol Director', xp: 620, cert: 'ics300', minYears: 6 },
  ],
  credentials: ['emr', 'wfr', 'avalanche', 'ropeRescue', 'ics300', 'emt'],
  trainingBudget: 900,
  drills: [
    'Toboggan handling on the steepest run before opening.',
    'Chairlift evacuation drill.',
    'Avalanche beacon and probe practice.',
    'Outdoor emergency care refresher at the base lodge.',
  ],
  awards: {
    valor: { name: 'NSP Purple Merit Star', icon: '⛷️', prestige: 22, ribbon: [['#5b2c83', 3], ['#fff', 1], ['#5b2c83', 3]] },
    lifesaving: { name: 'NSP Green Merit Star', icon: '🫀', prestige: 13, ribbon: [['#1f7a3f', 2], ['#fff', 3], ['#1f7a3f', 2]] },
    merit: { name: 'NSP Yellow Merit Star', icon: '⭐', prestige: 5, ribbon: [['#e5b81c', 2], ['#fff', 3], ['#e5b81c', 2]] },
  },
  dispatches: [
    {
      id: 'femur', title: '🦴 Skier Down on a Black Diamond',
      text: 'A skier hit a tree on an icy black diamond. Suspected femur fracture, fading fast.',
      options: [
        { id: 'traction', label: 'Splint with traction and run the toboggan down', cert: 'emr', success: 0.85, risk: 0.2, xp: 24, stat: 'fitness', save: true, successText: 'Splinted, packaged and at the base in twelve minutes. The flight crew took over.', failText: 'The toboggan got away from you on the ice; another patroller caught it.' },
        { id: 'wait', label: 'Keep them warm and radio for backup', success: 0.75, risk: 0.05, xp: 12, save: true, successText: 'Backup arrived and you got them down together.', failText: 'Shock set in while you waited.' },
      ],
    },
    {
      id: 'liftEvac', title: '🚡 Chairlift Stopped',
      text: 'The main chairlift broke down with 200 people hanging over a ravine as a storm rolls in.',
      options: [
        { id: 'rope', label: 'Run rope evacuation chair by chair', cert: 'ropeRescue', success: 0.85, risk: 0.3, xp: 30, stat: 'smarts', heroic: true, save: true, successText: 'Everyone was down before dark. Not a single injury.', failText: 'High winds stopped the evacuation; mechanics restarted the lift hours later.' },
        { id: 'calm', label: 'Ski the line below, keeping riders calm', success: 0.9, risk: 0.05, xp: 12, successText: 'Your jokes over the bullhorn kept 200 people from panicking.', failText: 'A rider tried to jump and sprained an ankle.' },
      ],
    },
    {
      id: 'outOfBounds', title: '🏔️ Skiers Missing Out of Bounds',
      text: 'Two snowboarders ducked a rope into closed avalanche terrain. One made it back. One didn\'t.',
      options: [
        { id: 'beacon', label: 'Lead a beacon search of the slide path', cert: 'avalanche', success: 0.75, risk: 0.45, xp: 34, heroic: true, save: true, successText: 'You got a signal and dug him out in eleven minutes. He was breathing.', failText: 'A second slide forced the team out; he was recovered the next day.' },
        { id: 'hasty', label: 'Hasty search along the boundary', success: 0.55, risk: 0.2, xp: 18, save: true, successText: 'You found him in a tree well, upside down and alive.', failText: 'Darkness ended the search.' },
      ],
    },
    {
      id: 'kidLost', title: '🧒 Lost Child at the Lifts',
      text: 'A 7-year-old got separated from ski school in a whiteout.',
      options: [
        { id: 'sweep', label: 'Sweep the beginner area systematically', cert: 'wfr', success: 0.85, risk: 0.05, xp: 16, save: true, successText: 'She was in the warming hut drinking cocoa with a lift operator.', failText: 'It took two hours; she was cold but fine.' },
        { id: 'radio', label: 'Radio every lift and lodge', success: 0.9, risk: 0, xp: 10, successText: 'A liftie spotted her in five minutes.', failText: 'Static on every channel.' },
      ],
    },
  ],
};
