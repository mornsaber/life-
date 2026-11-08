/**
 * Specialist units (career/Scenes.js offers them after a record of good calls) and the calls
 * only they get. state.careerLife.unit = { id, since }.
 *
 *   police  swat (tactical), k9 (a dog handler)
 *   fire    hazmat, technicalRescue (rope, confined space, collapse)
 *   EMS     flightMedic (the helicopter)
 */
import { isCop } from '../../publicsafety/PoliceLife.js';
import { isFirefighter } from '../../publicsafety/FireLife.js';

const isEms = (job) => ['ems', 'privateEms'].includes(job?.professionId);
const inUnit = (id) => (s) => s.careerLife?.unit?.id === id;
const DOGS = ['Rex', 'Bruno', 'Kaiser', 'Shadow', 'Nova', 'Bear'];

export const UNITS = {
  swat: { name: 'the tactical unit (SWAT)', icon: '🛡️', hint: 'Hostage rescues, high-risk warrants', for: (s, job) => isCop(job), selection: { stats: { fitness: 1 }, skills: ['marksmanship', 'combat'], bar: 55 }, joined: 'Body armour, a rifle, and a pager that goes off at 4 a.m.' },
  k9: { name: 'the dog unit', icon: '🐕', hint: 'You and a dog, every shift', for: (s, job) => isCop(job), selection: { stats: { fitness: 1 }, bar: 45 }, joined: 'You were partnered with a young German shepherd. He lives with you now.' },
  hazmat: { name: 'the hazardous materials team', icon: '☣️', hint: 'Chemical leaks, spills, the things nobody else touches', for: (s, job) => isFirefighter(job), selection: { stats: { smarts: 1 }, skills: ['research'], bar: 50 }, joined: 'A green suit, a gas detector, and a lot of chemistry.' },
  technicalRescue: { name: 'the technical rescue team', icon: '🧗', hint: 'Ropes, trenches, collapsed buildings', for: (s, job) => isFirefighter(job), selection: { stats: { fitness: 1 }, bar: 55 }, joined: 'Ropes, cribbing, and a lot of time in tight places.' },
  flightMedic: { name: 'the air ambulance', icon: '🚁', hint: 'The worst calls, by helicopter', for: (s, job) => isEms(job), selection: { skills: ['medicine', 'firstAid'], bar: 55 }, joined: 'Flight suit, helmet, and the sickest patients in the region.' },
};

const hostage = {
  id: 'unit.swat', title: 'The Barricade', icon: '🛡️', partner: true, chance: 0.5, weight: 2, trauma: 7, honor: 'Medal of Valor',
  for: inUnit('swat'),
  news: { outstanding: 'Tactical team frees hostages unharmed', bad: 'Hostage dies in police siege' },
  start: 'perimeter',
  steps: {
    perimeter: { title: 'The House', icon: '🏚️', text: 'A man has barricaded himself in a house with his two children. He\'s fired a shot through the window. The negotiator is on the phone.', options: [
      { id: 'wait', label: '⏳ Hold the perimeter; give the negotiator time', score: { lives: 1, crew: 1 }, next: 'window' },
      { id: 'breach', label: '💥 Push for an early breach', tone: 'danger', check: { skills: ['combat'], stats: { fitness: 1 }, bar: 60 },
        pass: { text: 'Through the door in four seconds. He never got to the gun.', score: { lives: 3 } }, fail: { text: 'He heard you coming.', score: { lives: -2, crew: -2 } }, next: 'window' },
    ] },
    window: { title: 'The Window', icon: '🎯', text: 'Hour six. The negotiation is breaking down. Through your scope he\'s pacing past the window, the gun in his hand, a child behind him.', options: [
      { id: 'hold', label: '✋ Hold fire', score: { trust: 1 }, next: 'end' },
      { id: 'shoot', label: '🎯 Take the shot', tone: 'danger', check: { skills: ['marksmanship'], stats: { smarts: 1 }, bar: 65 },
        pass: { text: 'One shot. It was over.', score: { lives: 2 }, flag: 'shot' }, fail: { text: 'The glass deflected it. He grabbed a child as a shield.', score: { lives: -2, trust: -2 } }, next: 'end' },
    ] },
    end: { title: 'Dawn', icon: '🌅', text: 'It\'s over. The children are in an ambulance, wrapped in foil blankets.', options: [
      { id: 'debrief', label: '🗣️ Go to the debrief and the counsellor', stat: {}, score: { crew: 1 } },
      { id: 'bar', label: '🍺 Straight to the bar with the team', score: {} },
    ] },
  },
  tiers: {
    outstanding: 'Both children came out of that house unhurt.',
    good: 'The siege ended with the children safe.',
    mixed: 'It ended. Nobody would call it clean.',
    bad: 'A child was hurt in the siege. You were on the team.',
  },
};

const track = {
  id: 'unit.k9', title: 'The Track', icon: '🐕', chance: 0.5, weight: 2, trauma: 3, honor: 'Police Commendation', inquiry: false,
  for: inUnit('k9'),
  data: (s, rng) => ({ name: s.careerLife?.dog ?? (s.careerLife ? (s.careerLife.dog = rng.pick(DOGS)) : rng.pick(DOGS)) }),
  start: 'scent',
  steps: {
    scent: { title: 'The Scent', icon: '👃', text: 'An elderly man with dementia has walked out of his care home into the woods. Night is coming, and it\'s cold. {name} has his scent from a cardigan.', options: [
      { id: 'trust', label: '🐕 Let {name} lead, whatever the map says', check: { stats: { fitness: 1 }, bar: 45 },
        pass: { text: '{name} went straight through the brambles and down to the stream.', score: { lives: 2 } }, fail: { text: '{name} lost the scent at the road.', score: { lives: -1 } }, next: 'find' },
      { id: 'grid', label: '🗺️ Search the likely ground first', score: { lives: 1 }, next: 'find' },
    ] },
    find: { title: 'Found', icon: '🔦', text: '{name} is barking at the bottom of a ravine. The man is down there, conscious and very cold.', options: [
      { id: 'climb', label: '🧗 Climb down to him now', check: { stats: { fitness: 1 }, bar: 50 },
        pass: { text: 'You got your jacket round him and kept him talking until the rope team came.', score: { lives: 2 } }, fail: { text: 'You slipped on the way down and wrenched your shoulder.', score: { crew: -2, lives: 1 } } },
      { id: 'wait', label: '📻 Call it in and wait for the rope team', score: { lives: 1, crew: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'The man from the care home was home by midnight. {name} got a sausage and a write-up in the paper.',
    good: '{name} found him in time.',
    mixed: 'He was found — by the helicopter, in the end.',
    bad: 'You found him too late.',
  },
};

const spill = {
  id: 'unit.hazmat', title: 'The Tanker', icon: '☣️', partner: true, chance: 0.5, weight: 2, trauma: 4, honor: 'Medal of Merit', injury: 'copd',
  for: inUnit('hazmat'),
  news: { outstanding: 'Hazmat crews contain chemical leak; no injuries', bad: 'Dozens treated after chemical leak' },
  start: 'identify',
  steps: {
    identify: { title: 'Placard', icon: '🔎', text: 'A tanker on its side by the school, leaking something with a vapour cloud. The placard has burned off.', options: [
      { id: 'sample', label: '🧪 Suit up and sample it before anything else', check: { stats: { smarts: 1 }, skills: ['research'], bar: 55 },
        pass: { text: 'Chlorine. Now you know what you\'re fighting.', score: { lives: 1, crew: 1 } }, fail: { text: 'The meter gave a confusing reading.', score: { crew: -1 } }, next: 'evacuate' },
      { id: 'cordon', label: '🚧 Wide cordon and evacuate first', score: { lives: 1, city: -1 }, next: 'evacuate' },
    ] },
    evacuate: { title: 'The School', icon: '🏫', text: 'The school is downwind. Five hundred children.', options: [
      { id: 'shelter', label: '🏫 Shelter in place: seal the building', check: { stats: { smarts: 1 }, bar: 50 },
        pass: { text: 'The school sealed up in minutes. The cloud passed over.', score: { lives: 2 } }, fail: { text: 'The vents were still open. Children were treated for coughing.', score: { lives: -2, trust: -1 } }, next: 'plug' },
      { id: 'move', label: '🚌 Bus them out upwind', score: { lives: 1, trust: 1 }, next: 'plug' },
    ] },
    plug: { title: 'The Leak', icon: '🔧', text: 'Someone has to get close and plug the valve.', options: [
      { id: 'you', label: '🧑‍🚒 You and {partner} go in', tone: 'danger', check: { stats: { fitness: 1 }, bar: 50 },
        pass: { text: 'Plugged in four minutes, on your last air.', score: { city: 2 } }, fail: { text: 'A suit tore. {partner} was decontaminated and hospitalised.', score: { crew: -3 } } },
      { id: 'foam', label: '🫧 Foam it down and let it run dry', score: { city: -1, crew: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'Not one child so much as coughed. The chemical company sent a cheque to the fire service fund.',
    good: 'You contained the tanker. A long, careful day.',
    mixed: 'It was contained, eventually, and a few people went to hospital.',
    bad: 'The leak got away from you. Dozens were treated.',
  },
};

const trench = {
  id: 'unit.rescue', title: 'Trench Collapse', icon: '🧗', partner: true, chance: 0.5, weight: 2, trauma: 5, honor: 'Medal of Valor', injury: 'backInjury',
  for: inUnit('technicalRescue'),
  start: 'arrive',
  steps: {
    arrive: { title: 'Buried', icon: '🕳️', text: 'A construction worker is buried to the chest in a collapsed trench. His mates are digging with their hands. The sides are still moving.', options: [
      { id: 'shore', label: '🪵 Get everyone out and shore the walls first', score: { crew: 2, lives: -1 }, next: 'dig' },
      { id: 'in', label: '🏃 Get in there now', tone: 'danger', score: { lives: 1, crew: -2 }, next: 'dig' },
    ] },
    dig: { title: 'The Dig', icon: '⛏️', text: 'He\'s struggling to breathe. Every bucket of soil you take out, more slides in.', options: [
      { id: 'vacuum', label: '🌀 Vacuum truck and hand tools, slow and steady', check: { stats: { fitness: 1, smarts: 1 }, bar: 55 },
        pass: { text: 'Two hours. You freed his chest, then his legs.', score: { lives: 2 } }, fail: { text: 'A second collapse buried him to the neck.', score: { lives: -2 } }, next: 'lift' },
    ] },
    lift: { title: 'The Lift', icon: '🪢', text: 'He\'s free. Now he has to come up on a rope with crush injuries.', options: [
      { id: 'medic', label: '🩺 Fluids before you lift him (crush syndrome)', check: { skills: ['firstAid', 'medicine'], bar: 50 },
        pass: { text: 'His kidneys survived because of those fluids.', score: { lives: 2 } }, fail: { text: 'He went into cardiac arrest as the pressure came off.', score: { lives: -2 } } },
      { id: 'up', label: '⬆️ Up, now', score: { lives: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'He walked out of hospital and came to the station with his whole family.',
    good: 'You got him out of the trench alive.',
    mixed: 'He lived. He won\'t work in construction again.',
    bad: 'He died in the trench.',
  },
};

const flight = {
  id: 'unit.flight', title: 'The Helicopter', icon: '🚁', partner: true, chance: 0.5, weight: 2, trauma: 5, honor: 'Air Ambulance Lifesaving Award', inquiry: false,
  for: inUnit('flightMedic'),
  start: 'scene',
  steps: {
    scene: { title: 'Mountain Road', icon: '⛰️', text: 'A motorcyclist off a mountain road, an hour from any hospital by land. The pilot is circling for somewhere to put down.', options: [
      { id: 'winch', label: '🪢 Winch down to him', tone: 'danger', check: { stats: { fitness: 1 }, bar: 50 },
        pass: { text: 'You were on the ground beside him in two minutes.', score: { lives: 2 } }, fail: { text: 'The winch spun you into the rocks.', score: { crew: -2, lives: 1 } }, next: 'treat' },
      { id: 'land', label: '🛬 Land in the field and run', score: { lives: 1, crew: 1 }, next: 'treat' },
    ] },
    treat: { title: 'The Roadside Theatre', icon: '🩸', text: 'He\'s bleeding into his chest. You carry blood on board, and the tools to open a chest.', options: [
      { id: 'blood', label: '🩸 Blood transfusion at the roadside', check: { skills: ['medicine'], bar: 50 },
        pass: { text: 'Two units of blood and his pressure came back up.', score: { lives: 2 } }, fail: { text: 'He kept bleeding faster than you could replace it.', score: { lives: -1 } }, next: 'fly' },
      { id: 'scoop', label: '🚁 Scoop and fly', score: { lives: 1 }, next: 'fly' },
    ] },
    fly: { title: 'Weather', icon: '🌫️', text: 'Cloud is coming down over the pass. The pilot says it\'s marginal.', options: [
      { id: 'go', label: '🚁 Fly — he won\'t survive the road', score: { lives: 2, crew: -1 } },
      { id: 'road', label: '🚑 Meet the land ambulance halfway', score: { crew: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'The motorcyclist lived because you brought the hospital to him.',
    good: 'He made it to theatre alive.',
    mixed: 'He made it to hospital. What happens next is up to them.',
    bad: 'He died in the helicopter, over the pass.',
  },
};

export const UNIT_SCENES = [hostage, track, spill, trench, flight];
