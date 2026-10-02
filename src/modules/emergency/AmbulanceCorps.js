/**
 * Volunteer Ambulance Corps — service definition consumed by EmergencyEngine.
 * Rural and suburban squads staffed by volunteers who run 911 calls on
 * evenings and weekends.
 */
export const AmbulanceCorps = {
  id: 'ambulance',
  name: 'Volunteer Ambulance Corps',
  short: 'EMS',
  icon: '🚑',
  minAge: 16,
  requirements: { fitness: 35, health: 50 },
  units: ['Hillside Volunteer Ambulance Corps', 'Rescue Squad 14 — Oak Valley', 'Northfield Community EMS', 'Bayview First Aid Squad'],
  callsPerYear: [30, 120],
  stipendPerCall: 10,
  ranks: [
    { title: 'Probationary Member', xp: 0 },
    { title: 'Emergency Medical Responder', xp: 40, cert: 'emr' },
    { title: 'EMT', xp: 140, cert: 'emt' },
    { title: 'Crew Chief', xp: 300, cert: 'emt' },
    { title: 'Lieutenant', xp: 480, cert: 'ics300' },
    { title: 'Captain', xp: 700, cert: 'paramedic' },
    { title: 'Chief of EMS', xp: 1000, cert: 'paramedic', minYears: 8 },
  ],
  credentials: ['emr', 'emt', 'paramedic', 'evoc', 'ics300', 'hazmatOps'],
  trainingBudget: 1400,
  drills: [
    'Monthly skills night: airway, splinting and spinal motion restriction.',
    'Emergency vehicle operations course on the closed track.',
    'Mass-casualty triage drill with the county.',
    'Pediatric emergencies refresher.',
  ],
  awards: {
    valor: { name: 'EMS Medal of Valor', icon: '🚑', prestige: 25, ribbon: [['#0b5394', 3], ['#fff', 1], ['#cc0000', 3]] },
    lifesaving: { name: 'EMS Lifesaving Award', icon: '🫀', prestige: 15, ribbon: [['#0b5394', 2], ['#ffd100', 3], ['#0b5394', 2]] },
    merit: { name: 'EMS Distinguished Service', icon: '📜', prestige: 6, ribbon: [['#cc0000', 2], ['#0b5394', 3], ['#cc0000', 2]] },
  },
  dispatches: [
    {
      id: 'stroke', title: '🧠 Possible Stroke',
      text: 'A 70-year-old woman suddenly can\'t lift her arm and her speech is slurred.',
      options: [
        { id: 'stroke', label: 'Stroke scale, note the time, rush to the stroke center', cert: 'emt', success: 0.85, risk: 0, xp: 25, stat: 'smarts', save: true, successText: 'Clot-busting drugs went in within the window. She went home walking.', failText: 'Onset time was unclear; she missed the treatment window.' },
        { id: 'nearest', label: 'Load and go to the nearest ER', success: 0.6, risk: 0, xp: 14, save: true, successText: 'The ER transferred her in time.', failText: 'The detour cost precious time.' },
      ],
    },
    {
      id: 'choking', title: '🍖 Choking at a Wedding',
      text: 'A groomsman is choking at the reception. He can\'t speak and is turning blue.',
      options: [
        { id: 'heimlich', label: 'Abdominal thrusts', success: 0.8, risk: 0, xp: 18, save: true, successText: 'The steak flew out. The band started playing again.', failText: 'He went unconscious; you started CPR.' },
        { id: 'magill', label: 'Laryngoscope and Magill forceps', cert: 'paramedic', success: 0.92, risk: 0, xp: 26, stat: 'smarts', save: true, successText: 'You pulled the obstruction under direct view.', failText: 'Too deep; you bagged him to the ER.' },
      ],
    },
    {
      id: 'overdoseEms', title: '💊 Unresponsive Teen',
      text: 'Parents found their 16-year-old unresponsive in his room. Pinpoint pupils.',
      options: [
        { id: 'narcan', label: 'Bag-valve ventilation and naloxone', cert: 'emr', success: 0.85, risk: 0, xp: 22, save: true, successText: 'He woke up confused and crying. His parents held him.', failText: 'Fentanyl. He needed intensive care.' },
        { id: 'wait', label: 'Rescue breaths until the medic unit arrives', success: 0.55, risk: 0, xp: 12, save: true, successText: 'The medics took over and he pulled through.', failText: 'He arrested before the medics arrived.' },
      ],
    },
    {
      id: 'rollover', title: '🚙 Rollover on Route 30',
      text: 'An SUV rolled into a ditch. Three patients, one pinned, one walking around dazed.',
      options: [
        { id: 'triage', label: 'Triage all three and call for more units', cert: 'emt', success: 0.82, risk: 0.1, xp: 26, stat: 'smarts', save: true, successText: 'You caught the "walking wounded" bleeding internally. Everyone lived.', failText: 'You were stretched thin; one patient deteriorated.' },
        { id: 'pinned', label: 'Crawl in with the pinned patient', success: 0.7, risk: 0.3, xp: 24, heroic: true, save: true, successText: 'You held c-spine for forty minutes until extrication.', failText: 'Glass sliced your forearm.' },
        { id: 'scene', label: 'Stage and wait for fire to secure the scene', success: 0.9, risk: 0, xp: 10, successText: 'Scene safety first. Patients were extricated and transported.', failText: 'A patient waited too long.' },
      ],
    },
    {
      id: 'heat', title: '🌡️ Heatstroke at the Fair',
      text: 'A teenager collapsed in the livestock barn. 106°F and confused.',
      options: [
        { id: 'cool', label: 'Cold-water immersion in a stock tank', success: 0.85, risk: 0, xp: 20, save: true, successText: 'You got his temperature down in minutes. He recovered fully.', failText: 'He seized before cooling took effect.' },
        { id: 'transport', label: 'Ice packs and transport', success: 0.6, risk: 0, xp: 12, save: true, successText: 'He recovered at the hospital.', failText: 'He was admitted to the ICU.' },
      ],
    },
    {
      id: 'birth', title: '👶 Baby Won\'t Wait',
      text: 'A woman is in active labor on her bathroom floor. Baby is crowning.',
      options: [
        { id: 'deliver', label: 'Deliver the baby', cert: 'emt', success: 0.9, risk: 0, xp: 24, save: true, successText: 'A healthy girl. The parents named her after you.', failText: 'The cord was wrapped; you got it clear, but it was close.' },
        { id: 'rush', label: 'Rush to the hospital', success: 0.5, risk: 0.05, xp: 10, save: true, successText: 'Born in the hospital parking lot.', failText: 'Born in the ambulance, with complications.' },
      ],
    },
  ],
};
