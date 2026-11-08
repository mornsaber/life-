/**
 * More emergency calls (played by career/Scenes.js; merged in scenes-emergency.js).
 *
 *   fire      fire.crash (extrication), fire.wildland (a flank that turns), fire.mayday (a company officer's lost firefighter)
 *   police    police.pursuit, police.missing (a missing child), police.stop (a night traffic stop)
 *   EMS       ems.overdose, ems.mci (a bus crash: triage with too few ambulances), ems.birth
 *   dispatch  dispatch.whisper (a caller who can't speak), dispatch.cpr (CPR taught over the phone)
 *   command   police.ois (a sergeant at one of their officers' shootings)
 *   partner   partner.line (your partner crosses a line in front of you)
 *
 * Same shape as scenes-emergency.js. `weight` makes a scene more or less likely to be picked.
 */
import { isCop } from '../../publicsafety/PoliceLife.js';
import { isFirefighter } from '../../publicsafety/FireLife.js';

const SUPERVISOR = /captain|chief|lieutenant|sergeant|supervisor|commander|director|manager|deputy|superintendent|inspector/i;
const COMMAND_RANK = (job) => SUPERVISOR.test(job?.title ?? '');
const SERGEANT = (job) => /sergeant|lieutenant/i.test(job?.title ?? '') && !/chief|commander|superintendent/i.test(job?.title ?? '');
const isEms = (job) => ['ems', 'privateEms'].includes(job?.professionId);
const ROADS = ['the ring road', 'Route 9', 'the bypass', 'the coast road', 'the old quarry road'];
const PLACES = ['the Riverside estate', 'Maple Street', 'the old mill flats', 'Harbour Road', 'the high street', 'the Parkview towers'];

const crash = {
  id: 'fire.crash', title: 'Car Versus Tree', icon: '🚗', partner: true, chance: 0.4, trauma: 5, honor: 'Medal of Merit', injury: 'backInjury', inquiry: false,
  for: (s, job) => isFirefighter(job) && !/chief/i.test(job.title ?? ''),
  data: (s, rng) => ({ place: rng.pick(ROADS) }),
  start: 'arrive',
  steps: {
    arrive: { title: 'Arrival', icon: '🚒', text: 'A hatchback has wrapped itself around a tree on {place}. The driver, a teenager, is pinned by the dashboard and drifting in and out. Petrol is dripping.', options: [
      { id: 'stabilise', label: '🧰 Stabilise the car and kill the battery first', hint: 'By the book', score: { crew: 2 }, next: 'cut' },
      { id: 'straightin', label: '🏃 Straight in to hold his head and airway', hint: 'Before anything else', score: { lives: 1, crew: -1 }, next: 'cut' },
    ] },
    cut: { title: 'The Cut', icon: '🪚', text: 'He\'s trapped at the legs. You can take the roof off and roll the dash, or try to pull the seat back and slide him out.', options: [
      { id: 'roof', label: '🪚 Roof off, dash roll', hint: 'Twenty minutes, done properly', check: { skills: ['mechanics'], stats: { fitness: 1 }, bar: 50 },
        pass: { text: 'The dash rolled clear and he came out on a board, still talking.', score: { lives: 2 } }, fail: { text: 'The cutter jammed in a pillar reinforced with boron steel. Precious minutes.', score: { lives: -1 } }, next: 'transport' },
      { id: 'slide', label: '🤏 Rack the seat back and slide him out', hint: 'Quick, hard on his spine', score: { lives: 1 }, check: { skills: ['firstAid'], bar: 55 },
        pass: { text: 'Out in four minutes, collar on, no harm done.', score: { lives: 1 } }, fail: { text: 'He screamed as his legs came free. The doctors will ask how he was moved.', score: { lives: -1, trust: -1 } }, next: 'transport' },
    ] },
    transport: { title: 'The Golden Hour', icon: '🚁', text: 'The trauma centre is forty minutes by road. The air ambulance is fifteen out.', options: [
      { id: 'heli', label: '🚁 Wait for the helicopter and land it on the road', score: { lives: 1, city: -1 } },
      { id: 'road', label: '🚑 Go by road now with {partner} riding in the back', score: { lives: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'The boy from {place} walked into the station on crutches to shake your hand.',
    good: 'You cut the driver out on {place} and he made it to theatre.',
    mixed: 'The crash on {place} was slow and messy. He\'ll live; he may not walk the same.',
    bad: 'The driver on {place} died before you got him out.',
  },
};

const wildland = {
  id: 'fire.wildland', title: 'The Flank Turns', icon: '🌲', partner: true, chance: 0.4, trauma: 6, honor: 'Medal of Valor', injury: 'backInjury',
  for: (s, job) => isFirefighter(job) && !/chief/i.test(job.title ?? '') && (job.professionId === 'stateFire' || ['AU', 'US', 'CA', 'GR', 'PT', 'ES', 'CL'].includes(s.character.countryId)),
  data: (s, rng) => ({ place: rng.pick(['Cedar Ridge', 'the pine plantation above town', 'Dry Creek canyon', 'the hills behind the reservoir']) }),
  news: { outstanding: 'Crews save homes as fire races through {place}', bad: 'Firefighters forced to flee as {place} blaze turns' },
  start: 'line',
  steps: {
    line: { title: 'On the Line', icon: '🔥', text: 'You and {partner} are cutting line on the flank of the fire at {place}. The lookout radios: the wind is picking up from the south.', options: [
      { id: 'escape', label: '🧭 Check your escape route and safety zone now', score: { crew: 2 }, next: 'spot' },
      { id: 'finish', label: '⛏️ Finish the section first', hint: 'Another fifty metres', score: { city: 1, crew: -1 }, next: 'spot' },
    ] },
    spot: { title: 'Spot Fire', icon: '🌬️', text: 'Embers have jumped the line behind you. A spot fire is growing between you and the trucks.', options: [
      { id: 'hit', label: '💦 Hit the spot fire while it\'s small', check: { stats: { fitness: 1, smarts: 1 }, bar: 55 },
        pass: { text: 'You and {partner} knocked it down with a pump and hand tools.', score: { city: 2, crew: 1 } }, fail: { text: 'It got away from you. You ran for the black with {partner}.', score: { crew: -2, city: -2 } }, next: 'homes' },
      { id: 'black', label: '🏃 Into the black: the burned ground', hint: 'Safe; the line is lost', score: { crew: 2, city: -2 }, next: 'homes' },
      { id: 'shelter', label: '⛺ Deploy fire shelters', hint: 'Last resort', tone: 'danger', check: { stats: { fitness: 1 }, bar: 45 },
        pass: { text: 'Ninety seconds under the shelter. You both walked out.', score: { crew: 1 } }, fail: { text: 'The fire burned over you. {partner} has burns on both hands.', score: { crew: -4 } }, next: 'homes' },
    ] },
    homes: { title: 'The Homes Below', icon: '🏡', text: 'Below the ridge, a row of houses. Three families didn\'t leave.', options: [
      { id: 'defend', label: '🏡 Defend the houses with the engine', check: { skills: ['leadership'], stats: { smarts: 1 }, bar: 55 },
        pass: { text: 'Every house on the street was still standing at dawn.', score: { city: 3, lives: 1 } }, fail: { text: 'You saved two of the six. The rest went in minutes.', score: { city: -1 } } },
      { id: 'evac', label: '🚗 Get the families out and let the houses go', score: { lives: 2, city: -2, trust: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'The fire at {place} went round the town, not through it, because of the line you held.',
    good: 'You held your section at {place}. Some homes were lost; none of the crews were.',
    mixed: '{place} burned for a week. You were there for the worst of it.',
    bad: 'At {place} the fire won, and it nearly took your crew with it.',
  },
};

const pursuit = {
  id: 'police.pursuit', title: 'Pursuit', icon: '🚨', partner: true, chance: 0.4, trauma: 5, honor: 'Police Commendation',
  for: (s, job) => isCop(job) && !COMMAND_RANK(job),
  data: (s, rng) => ({ place: rng.pick(ROADS) }),
  news: { outstanding: 'Officers end high-speed chase on {place} without injury', bad: 'Bystander hurt in police chase on {place}' },
  start: 'flee',
  steps: {
    flee: { title: 'It Runs', icon: '🚗', text: 'A stolen SUV ignores your lights and floors it onto {place}. {partner} calls it in. Policy says terminate if the risk outweighs the crime.', options: [
      { id: 'chase', label: '🏎️ Pursue', hint: 'It\'s a stolen car', score: { crew: -1 }, next: 'junction' },
      { id: 'helicopter', label: '🚁 Back off and let the helicopter track it', score: { crew: 1, trust: 1 }, next: 'end' },
      { id: 'spikes', label: '📌 Call for stingers further up', check: { stats: { smarts: 1 }, bar: 50 },
        pass: { text: 'The stingers were laid two junctions ahead. The SUV rolled to a stop on its rims.', score: { lives: 1, trust: 1 } }, fail: { text: 'The other unit set up in the wrong place.', score: {} }, next: 'junction' },
    ] },
    junction: { title: 'The Junction', icon: '🚦', text: 'You\'re doing ninety towards a red light at a busy junction. The SUV goes straight through.', options: [
      { id: 'through', label: '🚨 Lights, sirens, through it', tone: 'danger', check: { skills: ['driving'], stats: { smarts: 1 }, bar: 60 },
        pass: { text: 'You threaded the junction. The SUV clipped a kerb and spun out.', score: { lives: 1 } }, fail: { text: 'A delivery van pulled out. You hit it at forty.', score: { crew: -3, city: -2, trust: -2 }, flag: 'crash' }, next: 'end' },
      { id: 'stop', label: '🛑 Terminate the pursuit', score: { crew: 1, trust: 1 }, next: 'end' },
    ] },
    end: { title: 'The Driver', icon: '🏃', text: 'The SUV is abandoned in a cul-de-sac, doors open. A kid of about fifteen is running through the gardens.', options: [
      { id: 'foot', label: '🏃 Chase on foot', check: { stats: { fitness: 1 }, bar: 50 },
        pass: { text: 'You caught him at a fence. He was crying.', score: { lives: 1, trust: 1 } }, fail: { text: 'He got away over the fences. The car is going back to its owner.', score: {} } },
      { id: 'perimeter', label: '🗺️ Set a perimeter and bring the dog in', score: { crew: 1, trust: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'The chase on {place} ended with the driver in custody and nobody hurt.',
    good: 'A stolen car recovered on {place}, and a kid with a court date.',
    mixed: 'The pursuit on {place} will be reviewed like every pursuit is.',
    bad: 'The pursuit on {place} ended in wreckage, and the questions are about you.',
  },
};

const missing = {
  id: 'police.missing', title: 'Missing Child', icon: '🧒', partner: true, chance: 0.4, trauma: 6, honor: 'Police Medal',
  for: (s, job) => isCop(job) && !/chief|commander|superintendent/i.test(job.title ?? ''),
  data: (s, rng) => ({ place: rng.pick(PLACES), name: rng.pick(['Lily', 'Sam', 'Ava', 'Leo', 'Mia', 'Ben']) }),
  news: { outstanding: '{name}, 6, found safe after overnight search', bad: 'Search for missing {name} ends in tragedy' },
  start: 'report',
  steps: {
    report: { title: 'The Report', icon: '📞', text: 'A mother on {place}: her six-year-old, {name}, hasn\'t come home from the park. It\'s getting dark. The first hours matter most.', options: [
      { id: 'house', label: '🏠 Search the house first, properly', hint: 'Children hide; and sometimes it\'s the family', check: { skills: ['investigation'], bar: 50 },
        pass: { text: 'Not in the house. But the stepfather\'s story about the afternoon has holes.', score: { lives: 1 }, flag: 'lead' }, fail: { text: 'Nothing in the house, and an hour gone.', score: { lives: -1 } }, next: 'search' },
      { id: 'park', label: '🌳 Straight to the park with {partner}', score: { lives: 1 }, next: 'search' },
      { id: 'alert', label: '📢 Push for a public alert now', hint: 'Every phone in the area', score: { trust: 1, lives: 1 }, next: 'search' },
    ] },
    search: { title: 'The Search', icon: '🔦', text: 'Volunteers are gathering with torches. A neighbour mentions a man in a grey van near the park.', options: [
      { id: 'van', label: '🚐 Chase down the grey van', check: { skills: ['investigation'], stats: { smarts: 1 }, bar: 55 },
        pass: { text: 'The van belonged to a plumber with a dash camera. The footage showed {name} walking towards the canal.', score: { lives: 2 } }, fail: { text: 'Three hours on the van. It led nowhere.', score: { lives: -2 } }, next: 'found' },
      { id: 'grid', label: '🗺️ Organise the volunteers into a proper grid', check: { skills: ['leadership'], bar: 50 },
        pass: { text: 'The grid was tight. A volunteer heard crying in a drainage culvert.', score: { lives: 2, trust: 1 } }, fail: { text: 'Volunteers trampled the area the dog needed.', score: { lives: -1 } }, next: 'found' },
      { id: 'family', label: '🔍 Lean on the family\'s story', when: (s, sc) => sc.flags.includes('lead'), check: { skills: ['investigation', 'persuasion'], bar: 55 },
        pass: { text: 'The stepfather broke: {name} had run off after a row and he\'d been too ashamed to say.', score: { lives: 2 } }, fail: { text: 'He lawyered up. The family was furious.', score: { trust: -2 } }, next: 'found' },
    ] },
    found: { title: 'Dawn', icon: '🌅', text: 'Dawn. The search coordinator wants to stand the volunteers down and hand over to the day shift.', options: [
      { id: 'onemore', label: '🔦 One more sweep along the canal yourself', check: { stats: { fitness: 1 }, bar: 45 },
        pass: { text: 'You found {name} curled under a footbridge, cold and asleep.', score: { lives: 2 } }, fail: { text: 'Nothing. The day shift took over.', score: { crew: -1 } } },
      { id: 'handover', label: '📋 Hand over a clean log to the day shift', score: { trust: 1 } },
    ] },
  },
  tiers: {
    outstanding: '{name} was found alive and carried home. You were there when the mother saw her child.',
    good: '{name} was found safe after a long night on {place}.',
    mixed: '{name} was found by someone else, hours later. Alive. You keep thinking about the hours.',
    bad: 'They found {name} in the canal. Nothing you will do in this job will feel like enough after that.',
  },
};

const stop = {
  id: 'police.stop', title: 'Traffic Stop', icon: '🚔', partner: true, chance: 0.4, trauma: 3, honor: 'Police Commendation', weight: 1.3,
  for: (s, job) => isCop(job) && !COMMAND_RANK(job),
  data: (s, rng) => ({ place: rng.pick(ROADS) }),
  start: 'approach',
  steps: {
    approach: { title: 'Two in the Morning', icon: '🌙', text: 'A car with a broken tail light on {place}, two in the morning. Three people inside. The driver won\'t look at you.', options: [
      { id: 'passenger', label: '🚶 Passenger-side approach while {partner} covers', score: { crew: 2 }, next: 'reach' },
      { id: 'driver', label: '🚶 Straight to the driver\'s window', score: {}, next: 'reach' },
    ] },
    reach: { title: 'The Reach', icon: '✋', text: 'The driver\'s hand goes under the seat.', options: [
      { id: 'command', label: '🗣️ "Hands on the wheel. Now."', check: { skills: ['persuasion'], stats: { smarts: 1 }, bar: 45 },
        pass: { text: 'Hands on the wheel. It was his phone, and he was terrified.', score: { trust: 1, lives: 1 } }, fail: { text: 'He panicked and kept reaching. You dragged him out of the car.', score: { trust: -1, crew: 1 } }, next: 'car' },
      { id: 'draw', label: '🔫 Draw and step back', tone: 'danger', check: { stats: { smarts: 1 }, bar: 55 },
        pass: { text: 'He froze. It was his phone.', score: { crew: 1, trust: -1 } }, fail: { text: 'Somebody filmed you pointing a gun at a teenager reaching for a phone.', score: { trust: -3 } }, next: 'car' },
    ] },
    car: { title: 'The Car', icon: '🔦', text: 'There\'s a smell of cannabis and a small bag in the door pocket. The driver is nineteen and on a provisional licence.', options: [
      { id: 'warn', label: '🙂 Warning and a fix-it ticket for the light', score: { trust: 2 } },
      { id: 'book', label: '📝 Book him for possession', score: { trust: -1, city: 1 } },
      { id: 'search', label: '🔍 Search the whole car', check: { skills: ['law'], bar: 50 },
        pass: { text: 'You had grounds and wrote them down. A stolen handgun under the back seat.', score: { lives: 1, city: 2 } }, fail: { text: 'Nothing more, and the search won\'t survive a defence lawyer.', score: { trust: -2 } } },
    ] },
  },
  tiers: {
    outstanding: 'A traffic stop on {place} took a stolen gun off the street, and nobody got hurt.',
    good: 'A stop on {place} that went the way they\'re supposed to.',
    mixed: 'The stop on {place} left everyone a bit shaken, you included.',
    bad: 'The stop on {place} is online now, and everyone has an opinion about you.',
  },
};

const overdose = {
  id: 'ems.overdose', title: 'Overdose', icon: '💉', partner: true, chance: 0.45, trauma: 3, honor: 'EMS Lifesaving Award', inquiry: false, weight: 1.3,
  for: (s, job) => isEms(job) && !COMMAND_RANK(job),
  data: (s, rng) => ({ place: rng.pick(['a park toilet', 'a bus shelter', 'a stairwell in the Parkview towers', 'a car in a supermarket car park']) }),
  start: 'find',
  steps: {
    find: { title: 'Blue Lips', icon: '🫁', text: 'A young man in {place}: pinpoint pupils, barely breathing, lips blue. His friend says it was "just heroin" but there\'s fentanyl going round.', options: [
      { id: 'bag', label: '🫁 Bag him first, then naloxone', hint: 'Oxygen before the antidote', check: { skills: ['medicine', 'firstAid'], bar: 45 },
        pass: { text: 'Good breaths in, then a small dose. He came round slowly.', score: { lives: 2, crew: 1 } }, fail: { text: 'He wasn\'t moving air. You went to the naloxone anyway.', score: { lives: 1 } }, next: 'wake' },
      { id: 'bigdose', label: '💉 Big dose of naloxone, straight away', score: { lives: 1, crew: -1 }, next: 'wake' },
    ] },
    wake: { title: 'He Wakes Up', icon: '😡', text: 'He wakes up in withdrawal all at once, swinging and vomiting. {partner} takes an elbow to the face.', options: [
      { id: 'calm', label: '🗣️ Talk him down', check: { skills: ['caregiving', 'persuasion'], bar: 50 },
        pass: { text: 'He sat on the kerb and cried. "Sorry. Sorry."', score: { trust: 1, crew: 1 } }, fail: { text: 'He ran off into the night, still full of whatever it was.', score: { lives: -2 } }, next: 'refuse' },
      { id: 'police', label: '🚓 Call the police to hold him', score: { crew: 1, trust: -1 }, next: 'refuse' },
    ] },
    refuse: { title: 'Refusal', icon: '📝', text: 'He refuses to go to hospital. The naloxone will wear off before the fentanyl does.', options: [
      { id: 'persuade', label: '🤝 Spend twenty more minutes persuading him', check: { skills: ['persuasion', 'caregiving'], bar: 55 },
        pass: { text: 'He got in the ambulance. At the hospital he asked about treatment.', score: { lives: 2, trust: 1 } }, fail: { text: 'He signed the refusal form with a shaking hand.', score: { lives: -1 } } },
      { id: 'kit', label: '🎒 Leave him a naloxone kit and a number', score: { lives: 1, trust: 1 } },
      { id: 'sign', label: '🖊️ Get the refusal signed; next call', score: { city: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'The man from {place} turned up at the station a year later, clean, to say thank you.',
    good: 'He was breathing when you left {place}. That\'s the job.',
    mixed: 'You brought him back at {place}. You\'ll probably bring him back again.',
    bad: 'You were called back to {place} at five in the morning. Too late, that time.',
  },
};

const mci = {
  id: 'ems.mci', title: 'Bus Crash', icon: '🚌', partner: true, chance: 0.45, trauma: 8, honor: 'EMS Medal of Valor', weight: 0.6,
  for: (s, job) => isEms(job) && !/chief|director/i.test(job.title ?? ''),
  data: (s, rng) => ({ place: rng.pick(ROADS) }),
  news: { outstanding: 'Paramedics praised after bus crash on {place}', bad: 'Ambulance delays blamed after {place} bus crash' },
  inquiryText: 'The coroner will examine the triage at the scene.',
  start: 'arrive',
  steps: {
    arrive: { title: 'First Ambulance', icon: '🚑', text: 'A school bus on its side on {place}. You and {partner} are the first ambulance. Next one is twelve minutes out. Twenty-eight children.', options: [
      { id: 'triage', label: '🏷️ Declare a major incident and start triage', hint: 'Treat nobody until you\'ve seen everyone', check: { skills: ['medicine', 'leadership'], bar: 50 },
        pass: { text: 'Thirty seconds a child. Red, yellow, green. You knew where everyone was.', score: { lives: 2, trust: 1 } }, fail: { text: 'You lost count halfway down the bus.', score: { lives: -1 } }, next: 'black' },
      { id: 'treat', label: '🩹 Treat the first badly hurt child you reach', score: { lives: -1 }, next: 'black' },
    ] },
    black: { title: 'The Hardest Tag', icon: '🖤', text: 'A boy isn\'t breathing. Opening his airway does nothing. The rules say black tag and move on. Behind you, a girl is screaming with an open fracture.', options: [
      { id: 'moveon', label: '🖤 Black tag. Move on.', score: { lives: 2 }, next: 'load' },
      { id: 'cpr', label: '💪 Start CPR on him', score: { lives: -2, trust: 1 }, next: 'load' },
    ] },
    load: { title: 'Loading', icon: '🚑', text: 'Ambulances are arriving. Who goes first?', options: [
      { id: 'reds', label: '🔴 The reds, in order, to the trauma centre', score: { lives: 2 } },
      { id: 'parents', label: '👪 Parents are arriving and demanding their children', check: { skills: ['leadership', 'persuasion'], bar: 55 },
        pass: { text: 'You set up a parent point and a police officer to run it. The scene stayed a scene.', score: { lives: 1, trust: 2 } }, fail: { text: 'Parents broke through and two children went to the wrong hospital.', score: { lives: -1, trust: -1 } } },
    ] },
  },
  tiers: {
    outstanding: 'Every child who could be saved on {place} was. The triage was used to train new crews for years.',
    good: 'The bus crash on {place} was the worst day of your career, and you did it right.',
    mixed: 'The bus crash on {place}: some children you saved, some you couldn\'t, some you\'ll never know.',
    bad: 'Children died on {place} who might have lived. The coroner will want to talk to you.',
  },
};

const whisper = {
  id: 'dispatch.whisper', title: 'The Whispered Call', icon: '🎧', chance: 0.45, trauma: 5, honor: 'Dispatcher of the Year', inquiry: false,
  for: (s, job) => job.professionId === 'dispatch',
  data: (s, rng) => ({ place: rng.pick(PLACES) }),
  news: { outstanding: 'Quick-thinking 911 dispatcher saves woman hiding from intruder' },
  start: 'line',
  steps: {
    line: { title: 'Silence', icon: '📞', text: 'An open line. Breathing. Then a whisper: "Pizza. Large. Pepperoni." She is not ordering pizza.', options: [
      { id: 'yesno', label: '🤫 "Answer yes or no. Are you in danger?"', check: { skills: ['persuasion'], stats: { smarts: 1 }, bar: 40 },
        pass: { text: '"Yes." In four questions you had an address on {place} and a man with a gun in the house.', score: { lives: 2 } }, fail: { text: 'She hung up. You called back; nobody answered.', score: { lives: -1 } }, next: 'units' },
      { id: 'trace', label: '📍 Keep her talking and pull the location from the phone', score: { lives: 1 }, next: 'units' },
    ] },
    units: { title: 'Sending Units', icon: '🚓', text: 'Two units are free. One is eight minutes out, one is four but the officer is a probationer on her own.', options: [
      { id: 'both', label: '🚓 Send both; tell the near one to wait at the corner', score: { crew: 2, lives: 1 }, next: 'inside' },
      { id: 'near', label: '⏱️ Send the near one straight in', score: { lives: 1, crew: -2 }, next: 'inside' },
    ] },
    inside: { title: 'In the Wardrobe', icon: '🚪', text: 'She\'s in a wardrobe. You can hear him moving through the house. Officers are at the door.', options: [
      { id: 'still', label: '🤫 Keep her silent and relay his position', check: { stats: { smarts: 1 }, bar: 50 },
        pass: { text: '"He\'s in the hall, by the stairs." They took him without a shot fired.', score: { lives: 2, crew: 2 } }, fail: { text: 'The relay lagged. It got loud before it was over.', score: { crew: -1 } } },
      { id: 'run', label: '🏃 Tell her to run for the officers when they come in', score: { lives: -1 } },
    ] },
  },
  tiers: {
    outstanding: 'The woman on {place} sent flowers to the call centre. Your headset is on the wall now.',
    good: 'The call from {place} ended with an arrest and nobody hurt.',
    mixed: 'The call from {place} ended. You never find out how most calls end.',
    bad: 'You heard the shot. The officers got there forty seconds later.',
  },
};

const ois = {
  id: 'police.ois', title: 'Officer-Involved Shooting', icon: '🚨', chance: 0.3, trauma: 7, honor: 'Police Commendation', weight: 0.8,
  inquiryText: 'Internal affairs is examining how the scene was handled.',
  for: (s, job) => isCop(job) && SERGEANT(job),
  data: (s, rng) => ({ place: rng.pick(PLACES), name: rng.pick(['Officer Reyes', 'Officer Kim', 'Officer Walsh', 'Officer Okafor']) }),
  news: { outstanding: 'Police release body-camera footage of {place} shooting within hours', bad: 'Protests after police shooting on {place}' },
  start: 'scene',
  steps: {
    scene: { title: 'Shots Fired', icon: '📻', text: '{name} has shot a man on {place}. You\'re the sergeant on duty and first supervisor there. The man is on the ground; {name} is shaking; a crowd is forming.', options: [
      { id: 'aid', label: '🩹 Aid to the man first, then secure the scene', score: { lives: 2, trust: 1 }, next: 'officer' },
      { id: 'secure', label: '🚧 Tape, weapons and witnesses first', score: { city: 1, crew: 1 }, next: 'officer' },
    ] },
    officer: { title: 'Your Officer', icon: '👮', text: '{name} wants to tell you what happened, right now.', options: [
      { id: 'public', label: '📋 Public-safety questions only, then separate them', hint: 'By the book', score: { trust: 2 }, next: 'crowd' },
      { id: 'story', label: '🤝 Let them talk it through with you', tone: 'danger', score: { crew: 1, trust: -2 }, flag: 'misconduct', next: 'crowd' },
    ] },
    crowd: { title: 'The Crowd', icon: '📱', text: 'Phones are up. Someone is shouting that he had his hands up.', options: [
      { id: 'talk', label: '🗣️ Walk over and talk to them', check: { skills: ['persuasion', 'publicSpeaking'], bar: 55 },
        pass: { text: 'You told them what you could and that the footage would be released. The crowd stayed angry but stayed back.', score: { trust: 2, city: 1 } }, fail: { text: 'It became a shouting match on camera.', score: { trust: -2 } } },
      { id: 'more', label: '🚓 Call for more units to hold the line', score: { crew: 1, trust: -1 } },
    ] },
  },
  tiers: {
    outstanding: 'You ran the shooting scene on {place} by the book; even the man\'s family said so.',
    good: 'The scene on {place} was handled properly. The investigation will do the rest.',
    mixed: 'The scene on {place} held, just. The city argued about it for weeks.',
    bad: 'Mistakes at the scene on {place} will hang over the case — and over you.',
  },
};

const LINE = {
  police: { what: 'pocket a roll of cash from a dealer\'s car during a search', hint: 'Theft, and it taints the case' },
  fire: { what: 'turn up for a shift smelling of drink, again', hint: 'Into a burning building like that' },
  ems: { what: 'slip a vial of fentanyl from the drug box into their pocket', hint: 'Diversion' },
};
const lineKind = (s) => (isCop(s.career.job) ? 'police' : isFirefighter(s.career.job) ? 'fire' : 'ems');

const partnerLine = {
  id: 'partner.line', title: 'Your Partner', icon: '🤝', partner: true, chance: 0.4, trauma: 3, inquiry: false, weight: 0.35, stepTitles: false, honorChance: 0,
  for: (s, job) => (isCop(job) || isFirefighter(job) || isEms(job)) && (s.careerLife?.partner?.scenes ?? 0) >= 2 && !COMMAND_RANK(job)
    // Once per partnership.
    && !(s.careerLife.scenes ?? []).some((x) => x.id === 'partner.line' && x.age >= s.careerLife.partner.since),
  start: 'see',
  steps: {
    see: { title: 'What You Saw', icon: '👀', text: (d, s) => `You see {partner} ${LINE[lineKind(s)].what}. They see you see it.`, options: [
      { id: 'confront', label: '🗣️ Have it out with them in private', hint: 'Give them a chance to put it right', check: { skills: ['persuasion'], bar: 50 },
        pass: { text: '{partner} put it right and asked for help. It never happened again.', score: { trust: 1, crew: 2 }, flag: 'savedPartner' }, fail: { text: '{partner} told you to mind your own business.', score: { crew: -1 }, flag: 'leftPartner' } },
      { id: 'report', label: '📝 Report it', hint: 'The right thing; they will know it was you', score: { trust: 3, crew: -1 }, flag: 'reportedPartner' },
      { id: 'look', label: '🙈 Look away', hint: 'Partners back each other', tone: 'danger', score: { trust: -1, crew: 1 }, flag: 'coveredPartner' },
    ] },
  },
  outcome: (sc, tier, s) => {
    const p = s.careerLife?.partner;
    if (sc.flags.includes('reportedPartner')) return { text: `You reported ${p?.name ?? 'your partner'}. They were suspended and moved, and half the station stopped talking to you. The other half quietly thanked you.`, rep: -4, effects: (ctx) => { if (s.careerLife) s.careerLife.partner = null; ctx.stat('stress', 6); } };
    if (sc.flags.includes('savedPartner')) return { text: `You and ${p?.first ?? 'your partner'} got through it. Some partnerships are made on nights like that.`, effects: () => { if (p) p.trust = Math.min(100, p.trust + 15); } };
    if (sc.flags.includes('coveredPartner')) return { text: `You never said anything about ${p?.first ?? 'it'}. It sits there between you.`, effects: (ctx) => { const job = s.career.job; if (job && ctx.rng.chance(0.25)) { job.warnings = (job.warnings ?? 0) + 1; ctx.log(`It came out about ${p?.first ?? 'your partner'} anyway, and that you'd known. You were disciplined too.`, '⚠️', 'bad'); if (s.careerLife) s.careerLife.partner = null; } } };
    return { text: `${p?.first ?? 'Your partner'} asked for a transfer. You'll ride with someone new.`, effects: () => { if (s.careerLife) s.careerLife.partner = null; } };
  },
};

const mayday = {
  id: 'fire.mayday', title: 'Mayday', icon: '🆘', partner: true, chance: 0.4, trauma: 7, honor: 'Medal of Valor', weight: 1.2,
  inquiryText: 'A line-of-duty investigation will examine the fireground.',
  for: (s, job) => isFirefighter(job) && /captain|lieutenant/i.test(job.title ?? '') && !/chief/i.test(job.title ?? ''),
  data: (s, rng) => ({ place: rng.pick(['a carpet warehouse', 'a three-storey terrace', 'a church hall', 'a furniture store']), name: rng.pick(['Dana', 'Marcus', 'Priya', 'Tom']) }),
  news: { outstanding: 'Trapped firefighter rescued from {place} blaze', bad: 'Firefighter seriously hurt in {place} fire' },
  start: 'call',
  steps: {
    call: { title: 'The Call', icon: '📻', text: 'Your company is inside {place}. Then, on the radio: "Mayday, Mayday, Mayday." It\'s {name}, your newest firefighter. Lost, low on air, somewhere on the second floor.', options: [
      { id: 'luna', label: '📋 Get LUNAR: location, unit, name, air, resources', hint: 'Calm and by the drill', check: { skills: ['leadership'], stats: { smarts: 1 }, bar: 45 },
        pass: { text: '"Back room, by a window, ten minutes of air." Now you know where to send them.', score: { lives: 2, crew: 1 } }, fail: { text: '{name} is panicking and the radio is a wall of noise.', score: { lives: -1 } }, next: 'rit' },
      { id: 'yourself', label: '🏃 Go in after them yourself', tone: 'danger', score: { lives: 1, crew: -2 }, next: 'rit' },
    ] },
    rit: { title: 'Rescue Team', icon: '🧑‍🚒', text: 'The rapid intervention team is ready at the door. The fire is growing on the first floor.', options: [
      { id: 'send', label: '🧑‍🚒 Send the rescue team in; you keep command', score: { crew: 1, lives: 1 }, next: 'out' },
      { id: 'ladder', label: '🪜 Ladder to the second-floor windows', check: { skills: ['leadership'], stats: { fitness: 1 }, bar: 55 },
        pass: { text: 'A window, a hand, a face mask. {name} came out head-first onto the ladder.', score: { lives: 3 } }, fail: { text: 'Wrong window. Precious minutes.', score: { lives: -1 } }, next: 'out' },
      { id: 'water', label: '💦 Hit the first floor hard to buy them time', score: { city: 1, crew: 1 }, next: 'out' },
    ] },
    out: { title: 'Afterwards', icon: '🌅', text: '{name} is on the kerb with oxygen. The rest of the company won\'t look at each other.', options: [
      { id: 'debrief', label: '🗣️ Honest debrief tonight, mistakes included', score: { trust: 2, crew: 1 } },
      { id: 'quiet', label: '🤐 Keep it in the company', score: { crew: 1, trust: -1 } },
    ] },
  },
  tiers: {
    outstanding: 'You got {name} out of {place}. The company went to breakfast together and nobody said much.',
    good: '{name} came out of {place} alive. The lessons went into the next drill.',
    mixed: '{name} came out of {place} hurt. The report will be fair to you; you won\'t be.',
    bad: 'You lost track of {name} in {place} for too long. They\'ll live, but not in this job.',
  },
};

const phoneCpr = {
  id: 'dispatch.cpr', title: 'CPR by Phone', icon: '☎️', chance: 0.45, trauma: 4, honor: 'Lifesaving Award', inquiry: false, weight: 1.2,
  for: (s, job) => job.professionId === 'dispatch',
  data: (s, rng) => ({ place: rng.pick(PLACES), name: rng.pick(['Ella', 'Josh', 'Noor', 'Kai']) }),
  news: { outstanding: 'Girl, 10, saves dad with CPR guided by 911 dispatcher' },
  start: 'call',
  steps: {
    call: { title: 'The Call', icon: '📞', text: 'A ten-year-old called {name}: "My dad fell over and he\'s making a snoring noise." The ambulance is nine minutes away.', options: [
      { id: 'cpr', label: '💪 "Put the phone on speaker. I\'m going to teach you something."', check: { skills: ['teaching', 'firstAid'], bar: 45 },
        pass: { text: 'Hands in the middle of his chest. Push hard. Count with me.', score: { lives: 2 } }, fail: { text: '{name} is crying too hard to hear you.', score: { lives: -1 } }, next: 'tired' },
      { id: 'neighbour', label: '🏃 "Is there a grown-up next door? Go and get them."', score: { lives: 1 }, next: 'tired' },
    ] },
    tired: { title: 'Six Minutes', icon: '⏱️', text: '"My arms hurt. I can\'t do it any more."', options: [
      { id: 'count', label: '🎵 Count with her to the beat of a song', check: { skills: ['teaching', 'persuasion'], bar: 45 },
        pass: { text: 'You counted every compression with her until the door opened.', score: { lives: 2, trust: 1 } }, fail: { text: 'She stopped, and started, and stopped.', score: { lives: -1 } } },
      { id: 'swap', label: '🔁 Get her little brother to take turns', score: { lives: 1 } },
    ] },
  },
  tiers: {
    outstanding: '{name}\'s dad lived. You met them both at an awards evening, and she hugged you.',
    good: 'The ambulance took over on {place} with a pulse. You took the next call.',
    mixed: 'You never found out what happened to {name}\'s dad.',
    bad: 'The crew called it on {place}. You sat with your headset off for a minute, then took the next call.',
  },
};

const birth = {
  id: 'ems.birth', title: 'Roadside Delivery', icon: '👶', partner: true, chance: 0.45, trauma: 1, honor: 'Stork Pin', inquiry: false, weight: 0.8,
  for: (s, job) => isEms(job) && !COMMAND_RANK(job),
  data: (s, rng) => ({ place: rng.pick(ROADS) }),
  news: { outstanding: 'Baby born in ambulance on {place}' },
  start: 'labour',
  steps: {
    labour: { title: 'Not Going to Make It', icon: '🚑', text: 'A woman in the back of your ambulance on {place}, contractions a minute apart. The hospital is twenty minutes away. {partner} is driving.', options: [
      { id: 'pull', label: '🛑 Pull over and deliver here', score: { lives: 1, crew: 1 }, next: 'cord' },
      { id: 'drive', label: '🏎️ Lights and sirens, try to make it', score: { lives: -1 }, next: 'cord' },
    ] },
    cord: { title: 'The Cord', icon: '⚠️', text: 'The head is out. The cord is round the neck.', options: [
      { id: 'slip', label: '🤲 Slip it over the head, gently', check: { skills: ['medicine', 'firstAid'], bar: 45 },
        pass: { text: 'It slipped over. A shoulder, the other, and then a very loud baby.', score: { lives: 3, trust: 1 } }, fail: { text: 'Too tight. You clamped and cut, and the baby was slow to cry.', score: { lives: -1 } } },
      { id: 'radio', label: '📻 Get the obstetric unit on the radio first', score: { lives: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'A girl, born on {place}. Her parents named her after {partner}.',
    good: 'A healthy baby, delivered on {place}. The best call of the year.',
    mixed: 'Mother and baby made it to hospital from {place}, both a little worse for the journey.',
    bad: 'The baby on {place} needed more than you had in the ambulance.',
  },
};

export const CALLS = [crash, wildland, pursuit, missing, stop, overdose, mci, whisper, ois, partnerLine, mayday, phoneCpr, birth];
