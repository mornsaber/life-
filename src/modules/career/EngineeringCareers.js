/**
 * Engineering beyond civil: mechanical, electrical, chemical, aerospace, petroleum, nuclear and
 * structural engineers. Each has its own ladder (Engineer I to Chief Engineer, or a manager
 * track) and its own project work on the project engine: the design reviews, failures,
 * patents, recalls and plant outages that make the job.
 *
 * Industry engineers rarely need a PE (the industrial exemption); it helps and it pays. A
 * structural engineer, like a civil one, signs drawings and needs the licence to do it. A
 * nuclear engineer's senior posts want an operator's licence or a PE. Patents and fellowships of
 * the professional societies (ASME, IEEE, AIChE, AIAA) are the honours of the trade.
 */
import { L } from './Ladder.js';

const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });
const pick = (rng, a) => rng.pick(a);

/** A discipline's ladder: Engineer I → Chief Engineer, or the manager track. */
const ladder = (label, { pe = false, top = 'Chief Engineer' } = {}) => [
  L('eng1', `${label} Engineer I`, 4),
  L('eng2', `${label} Engineer II`, 5, pe ? { req: { credentials: ['fe'] } } : {}),
  L('senior', `Senior ${label} Engineer`, 6, pe ? { req: { credentials: ['pe'] }, abilities: ['sign'] } : {}),
  L('lead', `Lead ${label} Engineer`, 7, { track: 'ic', ...(pe ? { req: { credentials: ['pe'] }, abilities: ['sign', 'inspect'] } : {}) }),
  L('principal', `Principal ${label} Engineer`, 8, { track: 'ic', minSize: 'medium', ...(pe ? { abilities: ['sign', 'inspect'] } : {}) }),
  L('manager', `${label} Engineering Manager`, 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 15 }),
  L('director', 'Director of Engineering', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }),
  L('chief', top, 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 600 }),
];

const BASE = { sector: 'private', minAge: 21, background: 'standard', entry: { education: { level: 'bachelor', majors: ['engineering', 'physics'] } }, union: null };

export const ENGINEERING_PROFESSIONS = {
  mechanicalEng: {
    ...BASE, id: 'mechanicalEng', name: 'Mechanical Engineering', icon: '⚙️', payMultiplier: 1.06, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 },
    employers: ['Ridgeline Manufacturing', 'Corliss Automotive', 'Northstar HVAC Systems', 'Halvorsen Robotics'], valued: ['fe', 'pe', 'pmp'],
    levels: ladder('Mechanical'),
  },
  electricalEng: {
    ...BASE, id: 'electricalEng', name: 'Electrical Engineering', icon: '⚡', payMultiplier: 1.1, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 },
    employers: ['Voltaic Power Systems', 'Meridian Semiconductor', 'Grid & Signal Engineering', 'Coastal Electric Utility'], valued: ['fe', 'pe', 'pmp'],
    levels: ladder('Electrical'),
  },
  chemicalEng: {
    ...BASE, id: 'chemicalEng', name: 'Chemical Engineering', icon: '⚗️', payMultiplier: 1.12, sizes: { medium: 2, large: 3, enterprise: 3 },
    employers: ['Gulfport Refining', 'Brightwater Pharmaceuticals', 'Calder Specialty Chemicals', 'Prairie Biofuels'], valued: ['fe', 'pe', 'oshaSafety'],
    levels: ladder('Process', { top: 'Plant Manager' }),
  },
  aerospaceEng: {
    ...BASE, id: 'aerospaceEng', name: 'Aerospace Engineering', icon: '🚀', payMultiplier: 1.15, sizes: { medium: 1, large: 3, enterprise: 3 },
    employers: ['Skyward Aerospace', 'Orbital Dynamics', 'Falconcrest Defense Systems', 'Aerotek Propulsion'], valued: ['fe', 'pmp'],
    levels: ladder('Aerospace', { top: 'Chief Engineer (Program)' }),
  },
  petroleumEng: {
    ...BASE, id: 'petroleumEng', name: 'Petroleum Engineering', icon: '🛢️', payMultiplier: 1.3, sizes: { medium: 2, large: 3, enterprise: 2 },
    employers: ['Permian Basin Energy', 'Blackwater Offshore', 'Sabine Drilling Partners'], valued: ['fe', 'pe', 'wellControl'],
    // Oil busts take engineers first.
    layoffRate: (state) => (state.economy?.phase === 'recession' ? 0.08 : 0.025),
    levels: ladder('Petroleum', { top: 'VP of Engineering' }),
  },
  nuclearEng: {
    ...BASE, id: 'nuclearEng', name: 'Nuclear Engineering', icon: '☢️', payMultiplier: 1.18, sizes: { large: 3, enterprise: 2 }, background: 'strict',
    employers: ['Riverbend Nuclear Generating Station', 'Atomic Fuel Services', 'Columbia Reactor Engineering'], valued: ['fe', 'pe'],
    levels: ladder('Nuclear', { pe: true, top: 'Chief Nuclear Officer' }),
  },
  structuralEng: {
    ...BASE, id: 'structuralEng', name: 'Structural Engineering', icon: '🏢', payMultiplier: 1.07, sizes: { small: 3, medium: 3, large: 2 },
    entry: { education: { level: 'bachelor', majors: ['engineering', 'architecture'] } },
    employers: ['Keystone Structural', 'Truss & Frame Consulting', 'Ironbridge Engineers'], valued: ['fe', 'pe'],
    levels: ladder('Structural', { pe: true, top: 'Principal (Engineer of Record)' }),
  },
};

const patent = { id: 'eng.patent', name: 'Patent holder', icon: '📜' };

/** Project-engine configs, keyed by profession. */
export const ENGINEERING_PROJECTS = {
  mechanicalEng: {
    label: 'Your Designs', icon: '⚙️', weights: { smarts: 3 },
    name: (rng) => `the ${pick(rng, ['next-generation', 'lightweight', 'high-efficiency', 'low-noise', 'modular'])} ${pick(rng, ['gearbox', 'heat pump', 'brake assembly', 'pump line', 'robot arm', 'engine mount'])}`,
    acclaim: 'an ASME design award', failure: { text: 'A part you rushed through validation started failing in the field. A recall followed, and the root-cause report named your tolerances.', perf: -14, rep: -12, stress: 10 },
    deck: [
      D('recall', '🔁', 'Field Failures', 'Warranty claims are spiking on a part you designed three years ago. Management wants it quiet.', [
        { id: 'recall', label: '📣 Push for a recall', text: 'An expensive recall, a fixed part, and your name on the right side of the story.', rep: 8, perf: -2 },
        { id: 'quiet', label: '🤫 Fix it quietly in the next revision', tone: 'danger', text: 'The new revision shipped; the old parts stayed in the field.', perf: 2, risk: { chance: 0.25, text: 'An injury lawsuit uncovered the internal emails.', perf: -15, rep: -15 } },
      ]),
      D('invention', '💡', 'An Idea', 'Sketching on a napkin at lunch, you see a better way to seal the housing.', [
        { id: 'patent', label: '📜 File an invention disclosure', check: 55, text: 'The company filed it: your first patent, and a bonus for it.', money: 5000, moneyLabel: 'Patent award', honor: patent, perf: 4, fail: { text: 'The patent lawyers found prior art from 1974.', perf: 1 } },
        { id: 'ship', label: '🚚 Just build it into the product', text: 'It shipped. Nobody knows it was you.', perf: 3 },
      ]),
      D('testRig', '🧪', 'The Test Rig', 'Endurance testing will take three months. The launch date is in two.', [
        { id: 'test', label: '⏳ Run the full test', text: 'It found a fatigue crack nobody had predicted. Launch slipped; the product was better.', rep: 6, perf: 3 },
        { id: 'model', label: '💻 Trust the simulation', check: 60, text: 'The model was right. Launch was on time.', perf: 4, fail: { text: 'The model missed a resonance. Field units started shaking themselves apart.', perf: -8, rep: -6 } },
      ]),
    ],
  },
  electricalEng: {
    label: 'Your Designs', icon: '⚡', weights: { smarts: 3 },
    name: (rng) => `the ${pick(rng, ['substation', 'motor-drive', 'power-supply', 'battery-management', 'sensor-board', 'grid-tie inverter'])} ${pick(rng, ['redesign', 'upgrade', 'launch', 'certification', 'rollout'])}`,
    acclaim: 'an IEEE paper award', failure: { text: 'A board you signed off without enough margin caught fire in a customer\'s building. The investigation traced it to your design.', perf: -15, rep: -12, stress: 10 },
    deck: [
      D('blackout', '🔌', 'A Grid Event', 'A heatwave has the grid near collapse. The utility asks for rolling blackouts to save it.', [
        { id: 'shed', label: '🗺️ Design a fair rotation', check: 55, text: 'The grid held. Nobody was dark more than an hour at a time.', rep: 8, perf: 6, fail: { text: 'A hospital feeder got shed by mistake. It made the news.', rep: -8, perf: -4 } },
        { id: 'ride', label: '🤞 Ride it out', tone: 'danger', text: 'The grid held, barely.', risk: { chance: 0.3, text: 'A cascading failure blacked out three counties for two days.', perf: -12, rep: -10 } },
      ]),
      D('cert', '🧾', 'Certification', 'The product fails electromagnetic compatibility testing two weeks before launch.', [
        { id: 'fix', label: '🔧 Redesign the shielding', check: 50, text: 'Passed on the retest.', perf: 5, fail: { text: 'Failed again; launch slipped a quarter.', perf: -3 } },
        { id: 'patent', label: '💡 Invent a filter that fixes it for good', check: 65, text: 'It worked, and the company patented it.', honor: patent, money: 5000, moneyLabel: 'Patent award', perf: 6, fail: { text: 'Clever, but not ready. You fell back on the ugly fix.', perf: 1 } },
      ]),
    ],
  },
  chemicalEng: {
    label: 'Your Plant', icon: '⚗️', weights: { smarts: 3 },
    name: (rng) => `the ${pick(rng, ['catalyst', 'distillation column', 'reactor', 'scale-up', 'solvent recovery', 'batch-to-continuous'])} ${pick(rng, ['project', 'debottleneck', 'retrofit', 'commissioning'])}`,
    acclaim: 'an AIChE process award', failure: { text: 'A release from a unit you modified sent workers to hospital. The Chemical Safety Board report cited your management-of-change review.', perf: -18, rep: -15, stress: 14, offense: 'falsifiedRecords', offenseContext: 'a chemical release from a modified unit', discovery: 0.3 },
    deck: [
      D('alarm', '🚨', 'A Pressure Alarm', 'A reactor is running hot at 2 a.m. Shutting it down costs a day\'s production.', [
        { id: 'shutdown', label: '🛑 Shut it down', text: 'It was a failing valve. Nobody got hurt; the plant manager grumbled about the lost day.', rep: 6, perf: 1 },
        { id: 'run', label: '📈 Keep it running and watch', tone: 'danger', text: 'It settled down by morning.', perf: 3, risk: { chance: 0.2, text: 'The relief valve lifted and a cloud drifted over the fence line. The regulators came.', perf: -12, rep: -12, cost: 0 } },
      ]),
      D('scaleup', '🏭', 'Scale-Up', 'The new drug worked in a 50-litre vessel. Now it must work in 10,000 litres.', [
        { id: 'pilot', label: '🧪 Build a pilot plant first', text: 'A year slower, and the full-scale plant started first time.', perf: 4, rep: 6 },
        { id: 'jump', label: '🚀 Go straight to full scale', check: 60, text: 'It worked. You saved a year and a fortune.', perf: 8, fail: { text: 'The batch failed: mixing at scale behaves differently. Twelve million dollars of product in the drain.', perf: -10 } },
      ]),
    ],
  },
  aerospaceEng: {
    label: 'Your Program', icon: '🚀', weights: { smarts: 3 },
    name: (rng) => `the ${pick(rng, ['wing', 'landing gear', 'avionics', 'propulsion', 'satellite bus', 'launch vehicle'])} ${pick(rng, ['program', 'certification', 'redesign', 'flight test'])}`,
    acclaim: 'an AIAA award', failure: { text: 'A shortcut in your analysis showed up in flight test: a structural failure, and a grounded program.', perf: -16, rep: -14, stress: 12 },
    deck: [
      D('launch', '🛰️', 'Go / No-Go', 'Launch day. A sensor on your subsystem is reading slightly out of family.', [
        { id: 'nogo', label: '🛑 Call a no-go', text: 'A scrubbed launch, a furious program manager — and a cracked fitting found on inspection.', rep: 10, perf: 2 },
        { id: 'go', label: '✅ It\'s within margin — go', check: 55, text: 'A perfect launch. The sensor was just a sensor.', perf: 6, fail: { text: 'The vehicle was lost two minutes in. The review board wants your data.', perf: -15, rep: -12, stress: 15 } },
      ]),
      D('faa', '📋', 'Certification', 'The regulator questions your analysis of a new flight-control law.', [
        { id: 'test', label: '✈️ Prove it in flight test', check: 55, text: 'Flight test matched your predictions. Certified.', perf: 6, rep: 4, fail: { text: 'The test pilot found a corner case. Back to the drawing board.', perf: -3 } },
        { id: 'pressure', label: '📞 Let management lean on the regulator', tone: 'danger', text: 'Certified on schedule.', perf: 3, risk: { chance: 0.25, text: 'Years later, accidents traced back to that flight-control law. Congress held hearings.', perf: -20, rep: -20 } },
      ]),
    ],
  },
  petroleumEng: {
    label: 'Your Wells', icon: '🛢️', weights: { smarts: 2, fitness: 1 },
    name: (rng) => `the ${pick(rng, ['Wolfcamp', 'Eagle Ford', 'North Sea', 'Gulf deepwater', 'Bakken', 'offshore Guyana'])} ${pick(rng, ['well program', 'completion design', 'field development', 'enhanced recovery project'])}`,
    acclaim: 'an SPE award', failure: { text: 'A well you cut corners on lost control. The blowout made national news and the regulator shut the field.', perf: -18, rep: -15, stress: 14, offense: 'falsifiedRecords', offenseContext: 'a well blowout', discovery: 0.35 },
    deck: [
      D('kick', '🌋', 'A Kick', 'Gas is coming up the well faster than it should. The rig wants to keep drilling.', [
        { id: 'shut', label: '🛑 Shut in the well', text: 'You lost three days. You also didn\'t lose the rig.', rep: 8, perf: 1 },
        { id: 'drill', label: '⛏️ Keep drilling', tone: 'danger', text: 'You reached total depth on schedule.', perf: 4, risk: { chance: 0.15, text: 'The well blew out. Everyone got off the rig; the rig did not.', perf: -18, rep: -15, stress: 15 } },
      ]),
      D('bust', '📉', 'Oil at $40', 'Prices crashed. The company wants a plan to cut costs by a third.', [
        { id: 'efficiency', label: '🧮 Redesign the completions to do more with less', check: 55, text: 'Your redesign cut cost per well by 30%. You kept your job when others didn\'t.', perf: 8, fail: { text: 'Not enough. Half your team was laid off.', perf: -2, stress: 6 } },
        { id: 'cut', label: '✂️ Cut the safety budget', tone: 'danger', text: 'The numbers worked.', perf: 3, risk: { chance: 0.2, text: 'An injury on the rig was traced to the cuts.', perf: -10, rep: -10 } },
      ]),
    ],
  },
  nuclearEng: {
    label: 'Your Plant', icon: '☢️', weights: { smarts: 3 },
    name: (rng) => `the ${pick(rng, ['refuelling outage', 'steam generator replacement', 'licence renewal', 'digital I&C upgrade', 'SMR design review', 'fuel-cycle analysis'])}`,
    acclaim: 'an ANS award', failure: { text: 'An inspection found you had signed off on an incomplete safety analysis. The regulator issued a violation with your name in it.', perf: -18, rep: -15, stress: 12 },
    deck: [
      D('scram', '⚠️', 'A Scram', 'The reactor tripped. The cause looks like a faulty sensor, and the grid needs the power back.', [
        { id: 'rootcause', label: '🔍 Find the root cause before restart', text: 'A week offline; the regulator noted the thoroughness.', rep: 8, perf: 2 },
        { id: 'restart', label: '🔄 Replace the sensor and restart', check: 60, text: 'Back online in two days, and it was just the sensor.', perf: 5, fail: { text: 'It tripped again. The regulator sent a special inspection team.', perf: -8, rep: -8 } },
      ]),
      D('whistle', '📣', 'A Safety Concern', 'A junior engineer brings you evidence that a weld inspection was faked.', [
        { id: 'report', label: '📋 Report it to the regulator', text: 'The welds were re-inspected; two were bad. The company was fined and you were thanked — eventually.', rep: 10, stress: 6 },
        { id: 'internal', label: '🤝 Handle it internally', text: 'The welds were redone quietly.', perf: 1, risk: { chance: 0.3, text: 'The junior engineer went to the regulator anyway, and named you.', perf: -12, rep: -12 } },
      ]),
    ],
  },
  structuralEng: {
    label: 'Your Structures', icon: '🏢', weights: { smarts: 3 },
    name: (rng) => `the ${pick(rng, ['Harborview', 'Midtown', 'Riverside', 'Union Square', 'Northgate'])} ${pick(rng, ['tower', 'stadium roof', 'pedestrian bridge', 'parking garage', 'hospital wing', 'seismic retrofit'])}`,
    acclaim: 'a structural engineering award', failure: { text: 'A connection you signed off cracked under load. The building was evacuated and the forensic engineers are pulling your calculations.', perf: -16, rep: -15, stress: 12, offense: 'falsifiedInspection', offenseContext: 'signing deficient structural drawings', discovery: 0.3 },
    deck: [
      D('valueEng', '💲', 'Value Engineering', 'The developer wants to cut the steel tonnage by 15% to save money.', [
        { id: 'refuse', label: '🙅 Refuse what isn\'t safe', text: 'You found 6% that was safe to cut, and not a pound more. They grumbled and paid.', rep: 6, perf: 2 },
        { id: 'cut', label: '✂️ Make the cut', tone: 'danger', text: 'The developer was delighted.', perf: 4, risk: { chance: 0.2, text: 'Floors in the finished building bounce. Tenants are suing.', perf: -10, rep: -10, cost: 20000, costLabel: 'Liability deductible' } },
      ]),
      D('quake', '🫨', 'After the Earthquake', 'The city needs engineers to tag damaged buildings: green, yellow, red.', [
        { id: 'volunteer', label: '🦺 Volunteer for the inspection teams', text: 'Two weeks of fourteen-hour days in hard hats. The city gave you a commendation.', rep: 10, stress: 8, honor: { id: 'eng.quake', name: 'Post-Disaster Safety Evaluator commendation', icon: '🏅' } },
        { id: 'office', label: '🏢 Stay with your projects', text: 'Your projects stayed on schedule.', perf: 2 },
      ]),
    ],
  },
};

/** More for civil engineers, who had little to do. */
export const CIVIL_EXTRA_DECK = [
  D('inspection', '🌉', 'A Bridge Inspection', 'Your inspection finds section loss on a bridge carrying 40,000 cars a day.', [
    { id: 'close', label: '🚧 Close it now', text: 'Traffic chaos for a month; the repair crew found it worse than you thought.', rep: 5, perf: 1, stress: 4 },
    { id: 'post', label: '⚖️ Post a weight limit and schedule repairs', check: 50, text: 'The limit held until the repair.', perf: 1, fail: { text: 'An overweight truck ignored the limit. The bridge held, barely; the headlines didn\'t.', perf: -6, rep: -6 } },
  ]),
  D('hearing', '🎤', 'A Public Hearing', 'Residents are furious about the interchange design that will take their homes.', [
    { id: 'listen', label: '👂 Redesign around the neighbourhood', check: 55, text: 'You found an alignment that saved forty homes. The residents brought cake to the next meeting.', rep: 4, perf: 1, fail: { text: 'No alignment worked. The meeting got loud.', stress: 6 } },
    { id: 'defend', label: '📊 Defend the design on the numbers', text: 'The design was approved; the neighbourhood never forgave the department.', perf: 1, rep: -2 },
  ]),
  D('bid', '📑', 'A Design-Build Bid', 'Your firm can bid on the region\'s biggest transit project. It means months of unpaid work.', [
    { id: 'bid', label: '📝 Lead the bid', check: 60, text: 'You won it: ten years of work for the firm, and you lead the design.', perf: 3, rep: 4, stress: 6, fail: { text: 'Second place. A very expensive second place.', perf: -2, stress: 5 } },
    { id: 'skip', label: '🙅 Pass', text: 'A competitor won it.', perf: 1 },
  ]),
];

export const ENGINEERING_IDS = Object.keys(ENGINEERING_PROFESSIONS);
