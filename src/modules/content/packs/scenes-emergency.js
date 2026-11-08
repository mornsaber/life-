/**
 * Emergency scenes (played by career/Scenes.js).
 *
 *   command.incident   you're the incident commander at a major incident: size-up, resources,
 *                      what goes wrong, the press. Started by MajorIncidents for supervisors.
 *   fire.houseFire     a house fire with a child reported inside
 *   police.domestic    a domestic disturbance that might turn
 *   ems.arrest         a cardiac arrest in a crowded place
 *   …and the calls in scenes-calls.js
 *
 * Step options: label, hint, tone, score { lives, crew, city, trust }, flag, next; or a check
 * { skills, stats, bar } with pass / fail branches ({ text, score, flag, next }).
 * {partner}, {place} and {name} in text are filled in.
 */
import { isCop } from '../../publicsafety/PoliceLife.js';
import { isFirefighter } from '../../publicsafety/FireLife.js';
import { CALLS } from './scenes-calls.js';
import { CAREER_SCENES } from './scenes-careers.js';
import { UNITS, UNIT_SCENES } from './scenes-units.js';

export { UNITS };

const SUPERVISOR = /captain|chief|lieutenant|sergeant|supervisor|commander|director|manager|deputy|superintendent|inspector/i;
const COMMAND_RANK = (job) => SUPERVISOR.test(job?.title ?? '');
const isEms = (job) => ['ems', 'privateEms'].includes(job?.professionId);
const PLACES = ['the Riverside estate', 'Maple Street', 'the old mill flats', 'Harbour Road', 'the high street', 'the Parkview towers'];

const INCIDENT_TEXT = {
  derailment: 'Tank cars are leaking something that stings the eyes. Homes start two hundred metres away.',
  explosion: 'A plume is rising from the plant. Workers are unaccounted for and the wind is picking up.',
  collapse: 'Half the building is down. You can hear people under the rubble.',
  pileup: 'Seventy vehicles across both carriageways in fog. Fuel is leaking and people are trapped.',
  shooting: 'Shots fired in the shopping centre. Hundreds of people are hiding or running.',
  crush: 'A crowd surge at the stadium gates. People are down and the crowd is still pushing.',
};

const command = {
  id: 'command.incident', title: 'Incident Command', icon: '🎛️', trigger: 'manual', trauma: 8, honor: 'Incident Command Commendation', honorChance: 0.8,
  inquiryText: 'A public inquiry will look at your command decisions.',
  news: { outstanding: 'Commander praised for response to {name}', bad: 'Questions over response to {name}' },
  start: 'sizeUp',
  steps: {
    sizeUp: {
      title: 'Size-Up', icon: '🎛️',
      text: (d) => `You arrive first among the senior officers and take command of ${d.name}. ${INCIDENT_TEXT[d.kind] ?? 'It is worse than the first calls said.'} Crews are looking to you.`,
      options: [
        { id: 'offensive', label: '🔥 Go in hard: rescue first', hint: 'Lives now, risk to crews', score: { lives: 2, crew: -1 }, next: 'resources' },
        { id: 'recon', label: '🔎 A quick 360 before you commit', hint: 'Two minutes that might matter', check: { skills: ['leadership'], stats: { smarts: 1 }, bar: 50 },
          pass: { text: 'The walk-around showed you a way in nobody had seen.', score: { lives: 2, crew: 1 } }, fail: { text: 'The 360 cost you minutes and told you little.', score: { lives: -1 } }, next: 'resources' },
        { id: 'defensive', label: '🛡️ Defensive: hold the perimeter, protect what\'s left', hint: 'Safer for crews, slower for the trapped', score: { lives: -1, crew: 2, city: 1 }, next: 'resources' },
      ],
    },
    resources: {
      title: 'Resources', icon: '📻',
      text: 'Dispatch asks what you need. The neighbouring agencies are listening on the radio.',
      options: [
        { id: 'everything', label: '🚒 Call for everything: mutual aid, every unit', hint: 'Overwhelming force; a big bill', score: { lives: 1, city: 1, trust: 1 }, next: 'complication' },
        { id: 'evacuate', label: '🏃 Order a wide evacuation', hint: 'Safe, disruptive, maybe more than needed', check: { stats: { smarts: 1 }, bar: 45 },
          pass: { text: 'The evacuation went smoothly. Nobody was in the wrong place when it mattered.', score: { lives: 2, trust: 1 } }, fail: { text: 'The evacuation turned chaotic: blocked roads, angry residents, people going back for pets.', score: { trust: -2, lives: 1 } }, next: 'complication' },
        { id: 'local', label: '🏠 Keep it in-house for now', hint: 'Fine if it doesn\'t grow', check: { skills: ['leadership'], bar: 60 },
          pass: { text: 'Your own people had it in hand.', score: { trust: 1 } }, fail: { text: 'It grew faster than your people could cope. Mutual aid came late.', score: { lives: -2, city: -1 } }, next: 'complication' },
      ],
    },
    press: {
      title: 'The Press', icon: '🎤',
      text: 'It\'s under control. Cameras and a crowd of reporters are waiting at the cordon, and so is the mayor.',
      options: [
        { id: 'facts', label: '📋 Give the facts, including what went wrong', score: { trust: 2 } },
        { id: 'credit', label: '🙌 Credit the crews and the public', score: { trust: 1, crew: 1 } },
        { id: 'spin', label: '🎭 Keep it upbeat; say everything went to plan', check: { skills: ['publicSpeaking'], bar: 60 },
          pass: { text: 'It played well on the evening news.', score: { trust: 1 } }, fail: { text: 'A reporter had footage that told a different story.', score: { trust: -3 }, flag: 'misconduct' } },
        { id: 'mayor', label: '🏛️ Let the mayor take the podium', score: { trust: -1 } },
      ],
    },
  },
  complications: {
    collapse: { title: 'Collapse Warning', icon: '🏚️', text: 'A structural engineer grabs your arm: the east wall is bulging. Two of your crews are inside it.', options: [
      { id: 'pullout', label: '📯 Sound the evacuation tones: everyone out', score: { crew: 3, lives: -1 }, next: 'press' },
      { id: 'push', label: '⏱️ Two more minutes: they\'re close to the trapped family', check: { skills: ['leadership'], stats: { smarts: 1 }, bar: 60 },
        pass: { text: 'They came out with the family thirty seconds before the wall went.', score: { lives: 3 } }, fail: { text: 'The wall came down with a crew still inside. They were dug out hurt.', score: { crew: -4, lives: 1 } }, next: 'press' },
    ] },
    plume: { title: 'The Wind Shifts', icon: '🌬️', text: 'The wind has turned. The plume is heading for a primary school a kilometre downwind.', options: [
      { id: 'shelter', label: '🏫 Shelter in place: close the windows, stay inside', check: { stats: { smarts: 1 }, bar: 50 },
        pass: { text: 'The school sealed itself in. The plume passed over.', score: { lives: 2, trust: 1 } }, fail: { text: 'The school\'s air handling kept running. Children were treated for exposure.', score: { lives: -2, trust: -2 } }, next: 'press' },
      { id: 'bus', label: '🚌 Get buses and move them now', score: { lives: 1, trust: 1, city: -1 }, next: 'press' },
    ] },
    trapped: { title: 'A Mother at the Tape', icon: '🧒', text: 'A woman breaks through the tape: her son is on the fourth floor and nobody has been up there.', options: [
      { id: 'send', label: '🪜 Send a team up now', check: { skills: ['leadership'], bar: 50 },
        pass: { text: 'They found him in the bathtub, soaked and alive.', score: { lives: 3 } }, fail: { text: 'The stairs failed under the team. They got out; the boy was found later by a ladder crew.', score: { crew: -2, lives: 1 } }, next: 'press' },
      { id: 'ladder', label: '🚒 Wait for the aerial ladder', score: { lives: 1, crew: 1 }, next: 'press' },
    ] },
    politician: { title: 'The Mayor Arrives', icon: '🏛️', text: 'The mayor wants two engines moved to protect a warehouse owned by a major donor.', options: [
      { id: 'refuse', label: '🙅 Refuse: crews stay where the people are', score: { lives: 1, trust: 1 }, flag: 'defiedMayor', next: 'press' },
      { id: 'comply', label: '🤝 Move them; keep the peace', score: { city: 1, lives: -1, trust: -1 }, next: 'press' },
    ] },
    radios: { title: 'Radios Down', icon: '📡', text: 'The main channel is jammed with traffic and a repeater has failed. You\'ve lost contact with half your teams.', options: [
      { id: 'runners', label: '🏃 Runners and face-to-face briefings', score: { crew: 1 }, next: 'press' },
      { id: 'switch', label: '🔁 Move everyone to a tactical channel', check: { skills: ['leadership'], stats: { smarts: 1 }, bar: 55 },
        pass: { text: 'Within five minutes everyone was back on the air.', score: { crew: 2, lives: 1 } }, fail: { text: 'Half the teams never heard the switch. For twenty minutes nobody knew where anyone was.', score: { crew: -2 } }, next: 'press' },
    ] },
  },
  tiers: {
    outstanding: 'Your command of {name} became the case study: everyone who could be saved was, and every crew came home.',
    good: 'You brought {name} under control. Not perfect — it never is — but the after-action report was kind.',
    mixed: '{name} is over. Some calls went well, some didn\'t, and you\'ll replay a few of them for years.',
    bad: '{name} went badly on your watch. People were hurt who might not have been.',
  },
};

const houseFire = {
  id: 'fire.houseFire', title: 'House Fire', icon: '🔥', partner: true, chance: 0.4, trauma: 6, honor: 'Medal of Valor', injury: 'backInjury',
  for: (s, job) => isFirefighter(job) && !/chief/i.test(job.title ?? ''),
  data: (s, rng) => ({ place: rng.pick(PLACES) }),
  news: { outstanding: 'Firefighters pull child from blaze on {place}', bad: 'Child dies in {place} house fire' },
  start: 'arrive',
  steps: {
    arrive: { title: 'Arrival', icon: '🚒', text: 'Smoke is pouring from a two-storey house on {place}. A neighbour is screaming that a little girl is still inside. You and {partner} are first in.', options: [
      { id: 'search', label: '🧑‍🚒 Go straight in for a primary search', hint: 'With {partner}, before the water is on', score: { lives: 1, crew: -1 }, next: 'inside' },
      { id: 'attack', label: '💦 Get water on the fire first', hint: 'Knock it down, then search', score: { crew: 1 }, next: 'inside' },
      { id: 'wait', label: '⏳ Wait for the ladder company', score: { crew: 2, lives: -2 }, next: 'outcome' },
    ] },
    inside: { title: 'Inside', icon: '🌫️', text: 'Zero visibility. The heat is pressing you to the floor. {partner} is on your shoulder.', options: [
      { id: 'wall', label: '🧱 Left-hand search along the wall', hint: 'Slow, thorough', check: { stats: { fitness: 1, smarts: 1 }, bar: 50 },
        pass: { text: 'Your hand found a small foot under a bed.', score: { lives: 2 } }, fail: { text: 'You searched three rooms and found nothing before your low-air alarm went.', score: { lives: -1 } }, next: 'out' },
      { id: 'split', label: '↔️ Split up to cover more rooms', hint: 'Faster, against the rules', check: { stats: { fitness: 1 }, bar: 55 },
        pass: { text: 'You found her alone in the back bedroom. {partner} found you by your shouting.', score: { lives: 2 }, flag: 'leftPartner' }, fail: { text: 'You lost each other in the smoke. {partner} had to be pulled out by the second crew.', score: { crew: -3 }, flag: 'leftPartner' }, next: 'out' },
    ] },
    out: { title: 'Getting Out', icon: '🪟', text: 'The ceiling is starting to roll with fire. The way you came in is getting worse.', options: [
      { id: 'window', label: '🪟 Out through the bedroom window', hint: 'Call the ladder to it', score: { crew: 1 }, next: 'outcome' },
      { id: 'back', label: '🔙 Back the way you came, fast', check: { stats: { fitness: 1 }, bar: 55 },
        pass: { text: 'You made the door as the room behind you lit up.', score: { lives: 1 } }, fail: { text: 'The hallway flashed over as you crossed it. Your gear took most of it.', score: { crew: -3 } }, next: 'outcome' },
      { id: 'cover', label: '🛡️ Shield {partner} and go last', score: { crew: -1 }, flag: 'coveredPartner', next: 'outcome' },
    ] },
    outcome: { title: 'On the Lawn', icon: '🚑', text: 'Paramedics are waiting. The mother is on her knees on the lawn.', options: [
      { id: 'stay', label: '🫂 Stay with the family until they\'re looked after', score: { trust: 1 } },
      { id: 'back', label: '🚒 Back to work — there\'s overhaul to do', score: { city: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'You carried the girl out of the house on {place} alive. Her mother still sends a card every year.',
    good: 'The family on {place} got out and the fire was stopped. A good night.',
    mixed: 'The house on {place} is gone. Everyone lived, but it was closer than anyone will say.',
    bad: 'The girl on {place} didn\'t make it. You did everything the job allowed, and it wasn\'t enough.',
  },
};

const domestic = {
  id: 'police.domestic', title: 'Domestic Disturbance', icon: '🚓', partner: true, chance: 0.4, trauma: 5, honor: 'Police Commendation',
  for: (s, job) => isCop(job) && !COMMAND_RANK(job),
  data: (s, rng) => ({ place: rng.pick(PLACES) }),
  news: { outstanding: 'Officers talk armed man down on {place}', bad: 'Police shooting on {place} under investigation' },
  start: 'approach',
  steps: {
    approach: { title: 'The Call', icon: '📻', text: 'Shouting and breaking glass at a flat on {place}. The caller hung up. You and {partner} arrive together.', options: [
      { id: 'together', label: '👮 Go to the door together', score: { crew: 1 }, next: 'door' },
      { id: 'alone', label: '🏃 Go in alone while {partner} checks the back', hint: 'Faster', score: { crew: -1 }, flag: 'leftPartner', next: 'door' },
      { id: 'backup', label: '📻 Wait for a second unit', score: { crew: 2, lives: -1 }, next: 'door' },
    ] },
    door: { title: 'The Kitchen', icon: '🔪', text: 'A man is standing in the kitchen with a knife. A woman with a bleeding lip is behind the table. He says nobody is taking him anywhere.', options: [
      { id: 'talk', label: '🗣️ Talk to him: slow, calm, distance', check: { skills: ['persuasion', 'negotiation'], stats: { smarts: 1 }, bar: 55 },
        pass: { text: 'After eleven minutes he put the knife on the counter and sat down.', score: { lives: 2, trust: 2 } }, fail: { text: 'He came round the table. {partner} tackled him; everyone got cut a little.', score: { crew: -1, lives: 1 } }, next: 'after' },
      { id: 'taser', label: '⚡ Draw the Taser', check: { skills: ['marksmanship'], stats: { fitness: 1 }, bar: 50 },
        pass: { text: 'The Taser dropped him. He was cuffed in seconds.', score: { lives: 1, crew: 1 } }, fail: { text: 'One probe missed. He lunged; you went hands-on and it got ugly.', score: { crew: -2, trust: -1 } }, next: 'after' },
      { id: 'gun', label: '🔫 Draw your gun and order him down', tone: 'danger', check: { stats: { smarts: 1 }, bar: 55 },
        pass: { text: 'He dropped the knife the moment he saw the gun.', score: { lives: 1 } }, fail: { text: 'He came at you. You fired. He survived; your life will be reviewed for a year.', score: { lives: -2, trust: -3 }, flag: 'shooting' }, next: 'after' },
    ] },
    after: { title: 'Afterwards', icon: '📝', text: 'He\'s in the car. She\'s shaking, and asks whether he\'ll be out tomorrow.', options: [
      { id: 'advocate', label: '🤝 Connect her with a domestic-violence advocate tonight', score: { trust: 2, lives: 1 } },
      { id: 'report', label: '📝 Write it up properly and move on', score: { trust: 1 } },
      { id: 'shade', label: '✂️ Leave out the part where it got messy', tone: 'danger', check: { stats: { smarts: 1 }, bar: 60 },
        pass: { text: 'Nobody noticed. You noticed.', score: {} }, fail: { text: 'The body-camera footage didn\'t match your report.', score: { trust: -4 }, flag: 'misconduct' } },
    ] },
  },
  tiers: {
    outstanding: 'You talked a man with a knife down on {place}. She got out of that flat for good.',
    good: 'The domestic on {place} ended with an arrest and nobody badly hurt.',
    mixed: 'The call on {place} got rougher than it should have. It\'s in the file now.',
    bad: 'The domestic on {place} went wrong, and the review won\'t be quick.',
  },
};

const arrest = {
  id: 'ems.arrest', title: 'Cardiac Arrest', icon: '💓', partner: true, chance: 0.45, trauma: 4, honor: 'EMS Lifesaving Award', inquiry: false,
  for: (s, job) => isEms(job) && !COMMAND_RANK(job),
  data: (s, rng) => ({ place: rng.pick(['a supermarket', 'a gym', 'a wedding reception', 'a bus station', 'a school sports day']) }),
  start: 'arrive',
  steps: {
    arrive: { title: 'On Scene', icon: '🚑', text: 'A man in his fifties collapsed at {place}. A bystander is doing CPR badly. You and {partner} push through the crowd.', options: [
      { id: 'cpr', label: '💪 Take over compressions and get the pads on', score: { lives: 1 }, next: 'rhythm' },
      { id: 'scoop', label: '🚑 Scoop and run to hospital', hint: 'Seven minutes away', score: { lives: -1 }, next: 'family' },
    ] },
    rhythm: { title: 'The Monitor', icon: '📈', text: 'The monitor shows a shockable rhythm. Someone is filming on their phone.', options: [
      { id: 'shock', label: '⚡ Shock, then straight back on the chest', check: { skills: ['medicine', 'firstAid'], bar: 50 },
        pass: { text: 'After the second shock he had a pulse.', score: { lives: 3 } }, fail: { text: 'Four shocks, no change. You kept going.', score: { lives: -1 } }, next: 'family' },
      { id: 'airway', label: '🫁 Secure the airway first', check: { skills: ['medicine'], bar: 60 },
        pass: { text: 'Airway in, then the shock. He came back.', score: { lives: 2 } }, fail: { text: 'The tube took three tries. Minutes passed.', score: { lives: -2 } }, next: 'family' },
    ] },
    family: { title: 'His Wife', icon: '💬', text: 'His wife has arrived and is asking if he\'s going to live.', options: [
      { id: 'honest', label: '🫂 Be honest and kind', score: { trust: 2 } },
      { id: 'reassure', label: '🙂 Tell her it\'ll be fine', score: { trust: -1 } },
    ] },
  },
  tiers: {
    outstanding: 'The man from {place} walked out of hospital a week later and came to the station with cake.',
    good: 'You got a pulse back at {place}. What happens next is up to the hospital.',
    mixed: 'You did everything at {place}. It went the way most arrests go.',
    bad: 'The man at {place} died. You go over every step of it on the drive back.',
  },
};

export const SCENES = Object.fromEntries([command, houseFire, domestic, arrest, ...CALLS, ...CAREER_SCENES, ...UNIT_SCENES].map((s) => {
  // Complications become steps of their own (complication:<id>).
  for (const [id, step] of Object.entries(s.complications ?? {})) s.steps[`complication:${id}`] = step;
  return [s.id, s];
}));
