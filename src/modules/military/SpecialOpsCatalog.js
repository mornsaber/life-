/**
 * Special operations pipelines as data: who may volunteer, the phases of
 * each selection course (with how much each leans on body versus mind),
 * where operators deploy, what they're paid and what they do.
 *
 * A phase's pass chance is
 *   base + physical × (fitness − 75)/120 + mental × (grit − 65)/120
 * where grit blends smarts, happiness and calm (low stress). Most volunteers
 * wash out somewhere: the bases multiply to roughly 25–40% for an average
 * candidate who meets the standards.
 *
 * Mission options: { id, label, success, risk, valor, eval }.
 */
export const PIPELINES = {
  ranger: {
    name: 'Army Ranger', icon: '🗡️', branches: ['army'], tracks: ['enlisted', 'officer'],
    course: 'the Ranger Assessment and Selection Program and Ranger School', unitName: '75th Ranger Regiment', badge: 'Ranger Tab and tan beret',
    minFitness: 60, maxAge: 32, grades: { enlisted: [0, 5], officer: [0, 2] },
    mos: { enlisted: 'army.11B', officer: 'army.11A' }, specialty: 'infantry',
    exposure: 1.9, specialPay: 4800,
    desc: 'Light infantry raids: airfield seizures and direct-action missions on short notice.',
    phases: [
      { id: 'rasp1', name: 'RASP Phase 1', text: 'Three weeks of runs, 12-mile ruck marches, combatives and no sleep. The cadre want you to quit.', physical: 0.7, mental: 0.3, base: 0.72 },
      { id: 'rasp2', name: 'RASP Phase 2', text: 'Marksmanship, breaching, medical and small-unit tactics, all while exhausted.', physical: 0.4, mental: 0.6, base: 0.82 },
      { id: 'school', name: 'Ranger School', text: '62 days in the woods, the mountains and the Florida swamps on one meal a day. Lead patrols while starving.', physical: 0.5, mental: 0.5, base: 0.66 },
    ],
    deployments: ['a Joint Special Operations task force in Syria', 'a night raid rotation in Iraq', 'an airfield-seizure alert in the Pacific', 'a high-value-target task force in Africa'],
    missions: [
      { title: 'Airfield Seizure', text: 'Your company jumps onto an enemy-held airstrip at 0200.', options: [
        { id: 'lead', label: '🪂 Lead the assault on the control tower', success: 0.6, risk: 0.7, valor: 82, eval: 8 },
        { id: 'secure', label: '🧱 Secure the runway for the follow-on aircraft', success: 0.8, risk: 0.35, valor: 50, eval: 5 },
      ] },
      { title: 'Compound Raid', text: 'A helicopter assault on a compound holding a bomb-maker.', options: [
        { id: 'breach', label: '🚪 Be first through the door', success: 0.6, risk: 0.75, valor: 86, eval: 8 },
        { id: 'cordon', label: '🔦 Hold the outer cordon', success: 0.85, risk: 0.3, valor: 45, eval: 4 },
      ] },
    ],
  },
  greenBeret: {
    name: 'Special Forces (Green Beret)', icon: '🟩', branches: ['army', 'guard'], tracks: ['enlisted', 'officer'], allowReserve: true,
    course: 'Special Forces Assessment and Selection and the Qualification Course', unitName: '3rd Special Forces Group (Airborne)', badge: 'Special Forces Tab and green beret',
    minFitness: 65, minSmarts: 55, maxAge: 34, grades: { enlisted: [2, 6], officer: [1, 2] },
    mos: { enlisted: 'army.18X', officer: 'army.18A' }, specialty: 'infantry', grants: ['languageProficiency'],
    exposure: 2.0, specialPay: 5400,
    desc: 'Twelve-man A-teams that train and fight alongside foreign forces. Language, culture and unconventional warfare.',
    phases: [
      { id: 'sfas', name: 'SFAS', text: 'Three weeks of anonymous land navigation with a heavy ruck. No one tells you how you\'re doing.', physical: 0.7, mental: 0.5, base: 0.55 },
      { id: 'teamWeek', name: 'Team Week', text: 'Carry telephone poles and broken jeeps across the sandhills with strangers. Cadre watch who leads.', physical: 0.5, mental: 0.6, base: 0.8 },
      { id: 'qcourse', name: 'The Q Course', text: 'A year of weapons, engineering, medical or communications training, plus SERE school.', physical: 0.2, mental: 0.8, base: 0.8 },
      { id: 'robinSage', name: 'Robin Sage', text: 'The final exercise: raise and lead a guerrilla force in the fictional country of Pineland.', physical: 0.3, mental: 0.7, base: 0.88 },
      { id: 'language', name: 'Language School', text: 'Six months of a new language: Arabic, French, Tagalog or Russian.', physical: 0, mental: 1, base: 0.88 },
    ],
    deployments: ['a training mission with partner forces in the Philippines', 'an advise-and-assist rotation with the Kurdish Peshmerga', 'a foreign internal defense mission in West Africa', 'an unconventional-warfare exercise with NATO allies in the Baltics'],
    missions: [
      { title: 'Partner-Force Training', text: 'Your team is training a battalion of local commandos. Their commander is skimming pay.', options: [
        { id: 'report', label: '📋 Document it and work through the embassy', success: 0.7, risk: 0.1, valor: 20, eval: 6 },
        { id: 'confront', label: '🗣️ Confront him face to face', success: 0.5, risk: 0.3, valor: 30, eval: 3 },
      ] },
      { title: 'Ambush on the Border', text: 'The partner unit you advise is ambushed and starts to break.', options: [
        { id: 'rally', label: '🔥 Rally them under fire', success: 0.55, risk: 0.75, valor: 90, eval: 9 },
        { id: 'air', label: '📡 Call in close air support', success: 0.75, risk: 0.4, valor: 62, eval: 6 },
      ] },
    ],
  },
  seal: {
    name: 'Navy SEAL', icon: '🔱', branches: ['navy'], tracks: ['enlisted', 'officer'],
    course: 'Basic Underwater Demolition/SEAL training (BUD/S) and SEAL Qualification Training', unitName: 'SEAL Team 3', badge: 'Special Warfare insignia (the Trident)',
    minFitness: 70, maxAge: 30, grades: { enlisted: [0, 5], officer: [0, 2] },
    mos: { enlisted: 'navy.SO', officer: 'navy.1130' }, specialty: 'infantry',
    exposure: 2.0, specialPay: 6000,
    desc: 'Maritime special operations: ship boardings, hostage rescue and raids from the sea.',
    phases: [
      { id: 'hellWeek', name: 'First Phase and Hell Week', text: 'Five and a half days of constant motion, cold surf and about four hours of sleep. The bell is always there.', physical: 0.6, mental: 0.8, base: 0.42 },
      { id: 'dive', name: 'Dive Phase', text: 'Combat diving with closed-circuit rebreathers. Instructors rip off your mask and tie knots in your air hoses.', physical: 0.5, mental: 0.6, base: 0.8 },
      { id: 'land', name: 'Land Warfare', text: 'Demolitions, land navigation and live-fire patrols on San Clemente Island.', physical: 0.5, mental: 0.5, base: 0.86 },
      { id: 'sqt', name: 'SEAL Qualification Training', text: 'Cold-weather training in Alaska, then the board for your Trident.', physical: 0.4, mental: 0.5, base: 0.9 },
    ],
    deployments: ['an amphibious ready group in the Persian Gulf', 'a counterterrorism rotation in the Horn of Africa', 'a maritime task force in the South China Sea', 'a classified task force in Syria'],
    missions: [
      { title: 'Ship Boarding', text: 'A hijacked freighter is running for the coast with its crew held hostage.', options: [
        { id: 'climb', label: '🪝 Climb the caving ladder first', success: 0.55, risk: 0.75, valor: 90, eval: 9 },
        { id: 'overwatch', label: '🎯 Sniper overwatch from the helicopter', success: 0.75, risk: 0.35, valor: 60, eval: 6 },
      ] },
      { title: 'Hostage Rescue', text: 'An aid worker is held in a compound two hours inland.', options: [
        { id: 'assault', label: '🌙 Go in on foot under no moon', success: 0.6, risk: 0.7, valor: 92, eval: 9 },
        { id: 'isr', label: '🛰️ Run the drone feed and the radios', success: 0.85, risk: 0.15, valor: 30, eval: 4 },
      ] },
    ],
  },
  pararescue: {
    name: 'Air Force Pararescue (PJ)', icon: '🪂', branches: ['airforce'], tracks: ['enlisted', 'officer'],
    course: 'the Pararescue Indoctrination Course and the two-year pipeline', unitName: '58th Rescue Squadron', badge: 'maroon beret',
    minFitness: 70, minSmarts: 50, maxAge: 33, grades: { enlisted: [0, 5], officer: [0, 2] },
    mos: { enlisted: 'airforce.1Z2' }, specialty: 'aviation', grants: ['emt', 'paramedic'],
    exposure: 1.8, specialPay: 5000,
    desc: '"That Others May Live": combat search and rescue, trained to paramedic level. They also pull astronauts and fishermen out of the sea.',
    phases: [
      { id: 'indoc', name: 'Indoctrination Course', text: 'Ten weeks of pool harassment: underwater knot-tying and buddy breathing while instructors try to drown you.', physical: 0.8, mental: 0.5, base: 0.45 },
      { id: 'diveFreefall', name: 'Combat Dive, Airborne and Freefall', text: 'Scuba school, then jump school, then military freefall from 25,000 feet.', physical: 0.5, mental: 0.5, base: 0.85 },
      { id: 'paramedic', name: 'Paramedic School', text: 'Twenty-two weeks of civilian paramedic training, then the national registry exam.', physical: 0, mental: 1, base: 0.82 },
      { id: 'apprentice', name: 'Pararescue Apprentice Course', text: 'Mountaineering, tactics and trauma care under fire, all at once.', physical: 0.5, mental: 0.5, base: 0.9 },
    ],
    deployments: ['a combat rescue alert in Iraq', 'a rescue squadron in the Horn of Africa', 'NASA splashdown recovery and Pacific rescue duty', 'a combat search-and-rescue detachment in Syria'],
    missions: [
      { title: 'Downed Crew', text: 'An F-15 crew ejected over hostile ground. Night is falling.', options: [
        { id: 'hoist', label: '🚁 Ride the hoist down under fire', success: 0.6, risk: 0.75, valor: 96, eval: 9 },
        { id: 'treat', label: '🩺 Treat the wounded pilot in the helicopter', success: 0.85, risk: 0.3, valor: 55, eval: 6 },
      ] },
      { title: 'Ocean Rescue', text: 'A fishing boat sinks 800 miles offshore. Your team jumps from a C-130 into twelve-foot seas.', options: [
        { id: 'jump', label: '🌊 Jump with the rescue gear', success: 0.7, risk: 0.45, valor: 70, eval: 8 },
        { id: 'jm', label: '📻 Jumpmaster and coordinate from the aircraft', success: 0.85, risk: 0.1, valor: 25, eval: 4 },
      ] },
    ],
  },
  raider: {
    name: 'Marine Raider (MARSOC)', icon: '🦂', branches: ['marines'], tracks: ['enlisted', 'officer'],
    course: 'MARSOC Assessment and Selection and the Individual Training Course', unitName: '1st Marine Raider Battalion', badge: 'Marine Special Operator insignia',
    minFitness: 70, minSmarts: 50, maxAge: 34, grades: { enlisted: [2, 6], officer: [1, 2] },
    mos: { enlisted: 'marines.0372' }, specialty: 'infantry',
    exposure: 2.0, specialPay: 5200,
    desc: 'Special operations Marines: direct action, special reconnaissance and partner-force training.',
    phases: [
      { id: 'as', name: 'Assessment and Selection', text: 'Three weeks of rucking, swimming, psychological tests and problems with no right answer.', physical: 0.6, mental: 0.7, base: 0.5 },
      { id: 'itc', name: 'Individual Training Course', text: 'Nine months: close-quarters combat, survival school, irregular warfare and an exercise in a fictional country.', physical: 0.4, mental: 0.6, base: 0.76 },
    ],
    deployments: ['a Marine special operations company in Iraq', 'a partner-force mission in the Philippines', 'a counterterrorism task force in East Africa'],
    missions: [
      { title: 'Special Reconnaissance', text: 'Four days in a hide site watching a weapons cache.', options: [
        { id: 'stay', label: '👁️ Hold the hide when a goatherd walks close', success: 0.65, risk: 0.45, valor: 60, eval: 7 },
        { id: 'exfil', label: '🏃 Call an early exfil', success: 0.8, risk: 0.25, valor: 30, eval: 2 },
      ] },
      { title: 'Direct Action', text: 'A night raid on a militant leader\'s safe house.', options: [
        { id: 'assault', label: '💥 Lead the assault element', success: 0.6, risk: 0.75, valor: 86, eval: 8 },
        { id: 'support', label: '🔫 Run the support-by-fire position', success: 0.8, risk: 0.4, valor: 58, eval: 5 },
      ] },
    ],
  },
  orbitalWarfare: {
    name: 'Space Force Orbital Warfare', icon: '🛰️', branches: ['spaceforce'], tracks: ['enlisted', 'officer'],
    course: 'the Orbital Warfare assessment and Advanced Space Operations training', unitName: 'Space Delta 9 (Orbital Warfare)', badge: 'Orbital Warfare qualification',
    minFitness: 40, minSmarts: 65, maxAge: 38, grades: { enlisted: [2, 6], officer: [0, 3] }, clearance: 'topSecret',
    specialty: 'intel', exposure: 0.25, specialPay: 3000, mental: true,
    desc: 'Maneuver satellites that guard other satellites. Selection tests the mind: orbital mechanics, crew decisions under pressure and a psychological board.',
    phases: [
      { id: 'battery', name: 'Aptitude Battery', text: 'Orbital mechanics, spatial reasoning and electronic-warfare problems against the clock.', physical: 0, mental: 1, base: 0.6 },
      { id: 'sim', name: 'Mission Crew Simulation', text: 'Seventy-two hours of shifts in the simulator. An adversary satellite closes on yours and the crew looks at you.', physical: 0.1, mental: 1, base: 0.72 },
      { id: 'board', name: 'Psychological Board', text: 'A stress interview with psychologists and senior operators who poke at how you decide.', physical: 0, mental: 1, base: 0.8 },
    ],
    deployments: ['the Combined Space Operations Center', 'a forward space-control team in Qatar', 'a satellite operations floor at Schriever'],
    missions: [
      { title: 'Close Approach', text: 'A foreign "inspector" satellite drifts within a kilometer of a U.S. missile-warning satellite.', options: [
        { id: 'maneuver', label: '🛰️ Burn fuel and reposition now', success: 0.7, risk: 0, valor: 0, eval: 7 },
        { id: 'watch', label: '📡 Hold and characterize its intent', success: 0.6, risk: 0, valor: 0, eval: 8 },
      ] },
      { title: 'Jamming', text: 'GPS signals over a deployed brigade are being jammed.', options: [
        { id: 'geolocate', label: '🎯 Geolocate the jammer for a strike', success: 0.65, risk: 0, valor: 0, eval: 9 },
        { id: 'harden', label: '🔐 Switch the brigade to protected signals', success: 0.85, risk: 0, valor: 0, eval: 5 },
      ] },
    ],
  },
};

/** Initial-entry jobs that are themselves a pipeline (18X, SO, 1Z2, 0372). */
export const MOS_PIPELINE = {
  'army.18X': 'greenBeret', 'army.18A': 'greenBeret', 'guard.18X': 'greenBeret', 'guard.18A': 'greenBeret',
  'navy.SO': 'seal', 'navy.1130': 'seal',
  'airforce.1Z2': 'pararescue',
  'marines.0372': 'raider',
};

/** The record a graduate carries on svc.sof. */
export function sofRecord(pipelineId, age) {
  const p = PIPELINES[pipelineId];
  return { pipeline: pipelineId, since: age, unitName: p.unitName, badge: p.badge, exposure: p.exposure, specialPay: p.specialPay, missions: 0 };
}
