/**
 * Civil Air Patrol — the U.S. Air Force Auxiliary. Cadets join at 12; adult
 * members fly search missions for missing aircraft, emergency beacons and
 * disaster damage assessment. Mission Pilots need a private pilot license.
 */
export const CivilAirPatrol = {
  id: 'cap',
  name: 'Civil Air Patrol',
  short: 'CAP',
  icon: '🛩️',
  minAge: 12,
  requirements: { fitness: 30, health: 45 },
  units: ['Mesa Composite Squadron', 'Great Lakes Senior Squadron', 'Bayou Cadet Squadron', 'Front Range Composite Squadron'],
  callsPerYear: [3, 14],
  stipendPerCall: 0,
  ranks: [
    { title: 'Cadet Airman', xp: 0 },
    { title: 'Cadet Staff Sergeant', xp: 40, cert: 'landNav' },
    { title: 'Mission Scanner', xp: 120, cert: 'landNav' },
    { title: 'Mission Observer', xp: 240, cert: 'drone' },
    { title: 'Mission Pilot', xp: 420, cert: 'privatePilot' },
    { title: 'Incident Commander', xp: 700, cert: 'ics300', minYears: 6 },
  ],
  credentials: ['landNav', 'drone', 'studentPilot', 'privatePilot', 'ics300', 'emr'],
  trainingBudget: 1200,
  drills: [
    'Orientation flight with a squadron pilot.',
    'Emergency locator transmitter (ELT) direction-finding drill.',
    'Aerial photography exercise for the state emergency agency.',
    'Cadet leadership weekend and drill competition.',
  ],
  awards: {
    valor: { name: 'CAP Silver Medal of Valor', icon: '🛩️', prestige: 22, ribbon: [['#1c3f94', 3], ['#c0c0c0', 1], ['#1c3f94', 3]] },
    lifesaving: { name: 'CAP Lifesaving Award', icon: '🫀', prestige: 13, ribbon: [['#1c3f94', 2], ['#d4002a', 3], ['#1c3f94', 2]] },
    merit: { name: 'CAP Find Ribbon', icon: '📡', prestige: 5, ribbon: [['#1c3f94', 2], ['#ffd700', 3], ['#1c3f94', 2]] },
  },
  dispatches: [
    {
      id: 'missingPlane', title: '✈️ Missing Aircraft',
      text: 'A Cessna with two aboard dropped off radar over the mountains at dusk.',
      options: [
        { id: 'fly', label: 'Fly an expanding-square search at first light', cert: 'privatePilot', success: 0.7, risk: 0.2, xp: 32, stat: 'smarts', heroic: true, save: true, successText: 'You spotted the wreck on a ridge. Both survivors were airlifted out.', failText: 'Clouds socked in the ridgeline; another crew found it two days later.' },
        { id: 'scan', label: 'Fly as scanner and watch the terrain', cert: 'landNav', success: 0.6, risk: 0.15, xp: 24, save: true, successText: 'You caught a glint of aluminum below the tree line.', failText: 'Hours of trees and nothing else.' },
        { id: 'ground', label: 'Work the ground team at the base', success: 0.75, risk: 0.05, xp: 12, successText: 'Your phone-records analysis narrowed the search box.', failText: 'Long hours on the radio; no break in the case.' },
      ],
    },
    {
      id: 'elt', title: '📡 Emergency Beacon Going Off',
      text: 'Satellites picked up an emergency locator transmitter near the regional airport at 2 a.m.',
      options: [
        { id: 'df', label: 'Track it with a direction finder', cert: 'landNav', success: 0.85, risk: 0.05, xp: 18, stat: 'smarts', successText: 'An ELT in a hangar was set off by a hard landing. You silenced it.', failText: 'The signal bounced off hangars all night.' },
        { id: 'drive', label: 'Drive the airport perimeter and listen', success: 0.6, risk: 0, xp: 10, successText: 'You found the culprit in a parked plane.', failText: 'The beacon died before you found it.' },
      ],
    },
    {
      id: 'floodPhotos', title: '📸 Flood Damage Assessment',
      text: 'After a major flood, the state needs aerial photos of damaged levees and roads.',
      options: [
        { id: 'drone', label: 'Fly drone survey grids', cert: 'drone', success: 0.85, risk: 0.05, xp: 20, successText: 'Your imagery showed a levee about to fail. Crews evacuated a town in time.', failText: 'Wind grounded the drones for the day.' },
        { id: 'sortie', label: 'Fly photo sorties in the aircraft', cert: 'privatePilot', success: 0.8, risk: 0.15, xp: 24, successText: 'Hundreds of geotagged photos reached FEMA by nightfall.', failText: 'Turbulence ruined half the photos.' },
        { id: 'sort', label: 'Sort and tag photos at the incident base', success: 0.9, risk: 0, xp: 10, successText: 'Your tagging sped up the damage reports.', failText: 'The servers crashed; the work was lost.' },
      ],
    },
    {
      id: 'cadetLost', title: '🧭 Cadet Lost on a Field Exercise',
      text: 'A 13-year-old cadet got separated from the group during a land-navigation exercise.',
      options: [
        { id: 'track', label: 'Backtrack along the last waypoints', cert: 'landNav', success: 0.85, risk: 0.05, xp: 16, save: true, successText: 'You found her sitting by a creek, exactly where she was taught to stop.', failText: 'Night fell; the county SAR team found her.' },
        { id: 'call', label: 'Call it in to the sheriff right away', success: 0.9, risk: 0, xp: 8, successText: 'Deputies found her on a logging road within an hour.', failText: 'It took until morning.' },
      ],
    },
  ],
};
