/**
 * Coast Guard Auxiliary — the civilian volunteer arm of the Coast Guard:
 * safety patrols, search and rescue on the water, and boating safety.
 */
export const CoastGuardAuxiliary = {
  id: 'auxiliary',
  name: 'Coast Guard Auxiliary',
  short: 'USCG Aux',
  icon: '⚓',
  minAge: 17,
  requirements: { fitness: 35, health: 50 },
  units: ['Flotilla 12 — Harbor Point', 'Flotilla 4 — Lake Huron Shores', 'Flotilla 31 — Gulf Breeze', 'Flotilla 9 — Puget Sound'],
  callsPerYear: [8, 30],
  stipendPerCall: 0,
  ranks: [
    { title: 'Auxiliarist', xp: 0 },
    { title: 'Boat Crew Member', xp: 60, cert: 'boatCrew' },
    { title: 'Coxswain', xp: 220, cert: 'coxswain' },
    { title: 'Flotilla Commander', xp: 450, cert: 'coxswain' },
    { title: 'Division Commander', xp: 750, cert: 'ics300', minYears: 6 },
  ],
  credentials: ['boatCrew', 'coxswain', 'swiftwater', 'ics300', 'emr'],
  trainingBudget: 1000,
  drills: [
    'Man-overboard and towing drills in the harbor.',
    'Night navigation patrol.',
    'Vessel safety checks at the public boat ramp.',
    'Search-pattern exercise with the Coast Guard station.',
  ],
  awards: {
    valor: { name: 'Auxiliary Gold Lifesaving Medal', icon: '⚓', prestige: 26, ribbon: [['#003f87', 3], ['#ffd100', 1], ['#003f87', 3]] },
    lifesaving: { name: 'Auxiliary Plaque of Merit', icon: '🛟', prestige: 14, ribbon: [['#003f87', 2], ['#fff', 3], ['#003f87', 2]] },
    merit: { name: 'Auxiliary Commendation', icon: '📜', prestige: 6, ribbon: [['#cf0a2c', 2], ['#003f87', 3], ['#cf0a2c', 2]] },
  },
  dispatches: [
    {
      id: 'disabled', title: '🛥️ Disabled Vessel',
      text: 'A family\'s boat lost power two miles out. Weather is building.',
      options: [
        { id: 'tow', label: 'Take them in tow', cert: 'boatCrew', success: 0.88, risk: 0.1, xp: 20, save: true, successText: 'Towed them back before the storm hit.', failText: 'The towline parted twice in the chop.' },
        { id: 'standby', label: 'Stand by and relay to the station', success: 0.92, risk: 0, xp: 10, successText: 'A Coast Guard boat took over the tow.', failText: 'They drifted onto a sandbar before help arrived.' },
      ],
    },
    {
      id: 'kayakerAux', title: '🛶 Kayaker in the Water',
      text: 'A kayaker capsized in 50°F water and can\'t get back in.',
      options: [
        { id: 'pickup', label: 'Bring the boat alongside for a pickup', cert: 'coxswain', success: 0.85, risk: 0.15, xp: 26, stat: 'smarts', save: true, successText: 'Out of the water in eight minutes. Mild hypothermia.', failText: 'The wake pushed you off twice; it took too long.' },
        { id: 'throw', label: 'Throw a ring buoy', success: 0.65, risk: 0.05, xp: 15, save: true, successText: 'She caught it on the first throw.', failText: 'She was too cold to hold on; another boat pulled her out.' },
      ],
    },
    {
      id: 'flare', title: '🎆 Flare Sighting',
      text: 'Someone reported a red flare at night. No vessel has called for help.',
      options: [
        { id: 'search', label: 'Run a search pattern', cert: 'boatCrew', success: 0.75, risk: 0.1, xp: 22, stat: 'smarts', save: true, successText: 'You found a sailboat taking on water and got everyone off.', failText: 'Nothing found. It may have been fireworks.' },
        { id: 'shore', label: 'Search the shoreline from land', success: 0.6, risk: 0, xp: 10, successText: 'A teenager confessed to a prank.', failText: 'You found nothing.' },
      ],
    },
    {
      id: 'safetyCheck', title: '🦺 Holiday Weekend Patrol',
      text: 'The lake is packed for the Fourth of July. A speedboat is weaving through swimmers.',
      options: [
        { id: 'warn', label: 'Pull alongside and warn the operator', success: 0.85, risk: 0.05, xp: 14, successText: 'He slowed down and apologized.', failText: 'He gunned it; you radioed the marine patrol.' },
        { id: 'report', label: 'Report it to marine law enforcement', success: 0.9, risk: 0, xp: 10, successText: 'The marine patrol cited him.', failText: 'Nobody was available to respond.' },
      ],
    },
  ],
};
