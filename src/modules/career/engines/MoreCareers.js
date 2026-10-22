/**
 * The careers that used to be only a ladder, each put on the engine that
 * fits its work. Loaded once (from the registry); the engines look careers
 * up in their tables at run time.
 *
 *   Shift & incident  retail · restaurants · hotels · manufacturing · libraries ·
 *                     water utilities · the weather service · private military contracting
 *   Caseload          childcare · home care · funeral homes · revenue audits · court
 *                     administration · regulatory enforcement · code inspection · public
 *                     health · bail bonds · interpreting
 *   Projects          nonprofits · public works · city administration · legislative staff ·
 *                     actuarial science
 *   Book of business  property management
 *   Seasons           state forestry (emergency management has its own module: EmergencyMgmt.js)
 *   Audience          clergy (a congregation)
 *   Route & logbook   bus and rail operators · railroaders · airline pilots
 *   Job board         transit maintenance
 */
import { SHIFT_CAREERS } from './ShiftIncident.js';
import { CASE_CAREERS } from './Caseload.js';
import { PROJECT_CAREERS } from './Projects.js';
import { BOOK_CAREERS } from './ClientBook.js';
import { SEASON_CAREERS } from './Seasons.js';
import { AUDIENCE_CAREERS } from './Audience.js';
import { ROUTE_CAREERS } from './Routes.js';
import { TRADE_CAREERS } from './TradeJobs.js';

const P = (name, icon, desc, o = {}) => ({ name, icon, desc, stress: 3, pay: 1, rate: 1, years: 0, ...o });
const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });
const pick = (rng, a) => rng.pick(a);

/* ------------------------------------------------------------------ */
/* Shift & incident                                                    */
/* ------------------------------------------------------------------ */

Object.assign(SHIFT_CAREERS, {
  retail: {
    label: 'On the Floor', icon: '🛒', unit: 'customers served', volume: [12000, 30000], weights: { happiness: 2, looks: 1 },
    posts: {
      register: P('Front end & registers', '💳', 'Lines, coupons and the occasional meltdown.'),
      floor: P('Sales floor', '👕', 'Restock, recover, help people find things.', { stress: 2 }),
      stockroom: P('Stockroom & overnight', '📦', 'Truck nights. Quiet, physical, a differential.', { pay: 1.06, stress: 2, rate: 0.3 }),
      service: P('Customer service desk', '🧾', 'Returns, complaints, and the people who want a manager.', { years: 1, stress: 5 }),
      keyholder: P('Keyholder', '🔑', 'Open, close, count the safe.', { years: 2, pay: 1.06, stress: 4 }),
    },
    calls: [
      D('karen', '😤', 'I Want Your Manager', 'A customer is screaming at a teenage cashier over an expired coupon.', [
        { id: 'step', label: '🧍 Step in and take it yourself', check: 40, text: 'You calmed her down and honoured the coupon. The cashier thanked you later.', perf: 4, commend: 0.3, fail: { text: 'She filed a corporate complaint with your name on it.', complaint: 0.8 } },
        { id: 'manager', label: '📞 Page the manager', text: 'The manager handled it.', perf: 1 },
      ]),
      D('shoplifter', '🏃', 'The Shoplifter', 'A man is walking out with a TV. Policy says don\'t chase.', [
        { id: 'policy', label: '📋 Follow policy and note his description', text: 'Loss prevention caught him on camera.', perf: 2 },
        { id: 'chase', label: '🏃 Chase him into the parking lot', text: 'You got the TV back.', perf: 2, injury: 0.2, risk: { chance: 0.3, text: 'Corporate fired you for violating the no-chase policy.', fired: 'Violated the loss-prevention policy' } },
      ]),
      D('blackfriday', '🛍️', 'Black Friday', 'Doors open at 5 a.m. The line wraps around the building.', [
        { id: 'work', label: '💪 Work the double', text: 'Fourteen hours, holiday pay, no lunch.', money: 400, moneyLabel: 'Holiday pay', stress: 5 },
      ]),
    ],
  },
  culinary: {
    label: 'In the Kitchen', icon: '🍳', unit: 'covers', volume: [15000, 40000], weights: { smarts: 1, fitness: 1, happiness: 1 },
    posts: {
      prep: P('Prep', '🔪', 'Mise en place for the whole line.', { stress: 2 }),
      line: P('Line cook', '🔥', 'A station, a ticket rail, and 300 covers on Saturday.', { stress: 5 }),
      pastry: P('Pastry', '🍰', 'Early mornings and precision.', { years: 1, stress: 3 }),
      saucier: P('Sauté / saucier', '🥘', 'The hardest station on the line.', { years: 2, pay: 1.05, stress: 6 }),
      expo: P('Expo / sous chef on the pass', '📣', 'Call the tickets, check every plate.', { years: 3, pay: 1.08, stress: 6 }),
    },
    calls: [
      D('rush', '🔥', 'In the Weeds', 'Twenty tickets on the rail and the dishwasher just walked out.', [
        { id: 'push', label: '💪 Push through it', check: 45, text: 'Every plate went out right. The chef nodded at you.', perf: 5, commend: 0.3, fail: { text: 'Plates came back. The chef screamed.', perf: -3, stress: 5 } },
        { id: 'help', label: '🍽️ Jump on the dish pit', text: 'Clean plates saved the night.', perf: 3 },
      ]),
      D('inspector', '🧑‍⚕️', 'The Health Inspector', 'The inspector walks in mid-service. The walk-in cooler is at 44°F.', [
        { id: 'honest', label: '🌡️ Show her and toss the risky stock', text: 'A minor violation and respect for your honesty.', perf: 2, rep: 3 },
        { id: 'hide', label: '🙈 Hope she doesn\'t check', text: 'She checked. A critical violation.', perf: -4 },
      ]),
      D('burn', '🩹', 'The Burn', 'You grabbed a sauté pan handle straight out of the oven.', [
        { id: 'treat', label: '🧊 Stop and treat it', text: 'Ten minutes off the line and a blister.', perf: -1 },
        { id: 'keep', label: '🍳 Wrap it and keep cooking', text: 'Chef respect. A bad scar.', perf: 2, injury: 0.4 },
      ]),
    ],
  },
  hospitality: {
    label: 'At the Hotel', icon: '🏨', unit: 'guests', volume: [8000, 25000], weights: { happiness: 2, looks: 1 },
    posts: {
      frontDesk: P('Front desk', '🛎️', 'Check-ins, complaints and upgrades.'),
      housekeeping: P('Housekeeping', '🧹', 'Sixteen rooms a shift.', { stress: 4 }),
      night: P('Night audit', '🌙', 'Balance the books and handle 3 a.m.', { pay: 1.06, stress: 3 }),
      concierge: P('Concierge', '🗝️', 'Impossible reservations and generous tips.', { years: 2, pay: 1.08, stress: 3 }),
      events: P('Banquets & events', '💒', 'Weddings, conferences, and 400 plates of chicken.', { years: 1, stress: 5 }),
    },
    calls: [
      D('overbooked', '🛏️', 'Overbooked', 'The hotel is oversold and a family with a newborn has no room at 11 p.m.', [
        { id: 'walk', label: '🚕 Find them a room nearby and comp it', check: 35, text: 'They wrote a glowing review naming you.', perf: 4, commend: 0.4, fail: { text: 'Every hotel nearby was full. They slept in a suite you weren\'t allowed to give them.', perf: 1 } },
        { id: 'sorry', label: '😕 Apologise and call the next hotel', text: 'They left angry.', perf: -1 },
      ]),
      D('found', '💍', 'Left Behind', 'Housekeeping finds a diamond ring in a room that checked out.', [
        { id: 'log', label: '📝 Log it in lost and found', text: 'The guest got it back and sent a $500 thank-you.', money: 500, moneyLabel: 'Reward', rep: 4 },
        { id: 'keep', label: '💰 Pocket it', tone: 'danger', text: 'It\'s worth a lot.', money: 3000, moneyLabel: 'Pawned ring', offense: 'grandTheft', offenseContext: 'stealing a guest\'s ring', discovery: 0.4 },
      ]),
    ],
  },
  manufacturing: {
    label: 'On the Line', icon: '🏭', unit: 'parts produced', volume: [60000, 140000], weights: { fitness: 1, smarts: 1 },
    posts: {
      assembly: P('Assembly line', '🔩', 'The same twelve motions, all day.', { stress: 3 }),
      machining: P('CNC machining', '⚙️', 'Programs, tolerances and tool changes.', { years: 1, pay: 1.06 }),
      quality: P('Quality inspection', '🔍', 'Find the defect before the customer does.', { years: 2, pay: 1.05, stress: 3, rate: 0.5 }),
      nights: P('Third shift', '🌙', 'Shift premium and an empty plant.', { pay: 1.1, stress: 4 }),
      maintenance: P('Maintenance tech', '🔧', 'Keep the line running. Get called when it stops.', { years: 3, pay: 1.12, stress: 4, rate: 0.4 }),
    },
    calls: [
      D('lockout', '🔒', 'Skip the Lockout?', 'A jam stopped the line. Locking out the machine properly takes twenty minutes; the supervisor says just reach in.', [
        { id: 'lock', label: '🔒 Lock it out properly', text: 'Twenty minutes lost. All ten fingers kept.', perf: 0, rep: 3 },
        { id: 'reach', label: '✋ Reach in', text: 'The line restarted.', perf: 2, injury: 0.25 },
      ]),
      D('defect', '❌', 'The Defect', 'You spot a defect in a batch that already shipped to an auto maker.', [
        { id: 'flag', label: '🚩 Flag it', text: 'A costly recall, caught before anyone was hurt. Management thanked you, eventually.', perf: 4, commend: 0.5 },
        { id: 'quiet', label: '🤐 Say nothing', text: 'Nobody noticed.', risk: { chance: 0.25, text: 'The parts failed in the field. The investigation found your inspection log.', perf: -12, fired: 'Concealed a defect' } },
      ]),
    ],
  },
  library: {
    label: 'At the Library', icon: '📚', unit: 'patrons helped', volume: [6000, 15000], weights: { smarts: 2, happiness: 1 },
    posts: {
      reference: P('Reference desk', '❓', 'Questions about everything.'),
      children: P('Children\'s services', '🧒', 'Story time, summer reading and very loud joy.', { stress: 3 }),
      teen: P('Teen services', '🎮', 'Game nights, homework help and the kids nobody else wants.', { years: 1 }),
      outreach: P('Bookmobile & outreach', '🚐', 'Nursing homes, jails and rural stops.', { years: 2 }),
      tech: P('Digital services', '💻', 'Teach seniors to video-call their grandkids.', { years: 1 }),
    },
    calls: [
      D('banned', '📕', 'The Book Challenge', 'A group wants a novel pulled from the teen section.', [
        { id: 'process', label: '📋 Send it through the formal review', check: 45, text: 'The committee kept it. The meeting was ugly; the policy held.', perf: 4, rep: 5, fail: { text: 'The board pulled it. You\'re heartbroken.', happiness: -4 } },
        { id: 'pull', label: '🙈 Quietly pull it', text: 'The complaints stopped.', rep: -6 },
      ]),
      D('overdose', '🆘', 'In the Restroom', 'A patron is unresponsive in the restroom, lips blue.', [
        { id: 'narcan', label: '💉 Give the Narcan from the first-aid kit', check: 30, text: 'He woke up before the ambulance arrived.', perf: 5, commend: 0.6, trauma: 4, fail: { text: 'The ambulance took over. He survived; it took a while to stop shaking.', trauma: 6 } },
      ]),
    ],
  },
  waterUtility: {
    label: 'At the Plant', icon: '💧', unit: 'million gallons treated', volume: [3000, 9000], weights: { smarts: 2, fitness: 1 },
    posts: {
      operator: P('Treatment plant operator', '🧪', 'Chemistry, SCADA screens and rounds.'),
      distribution: P('Distribution crew', '🚧', 'Main breaks at 2 a.m. in January.', { stress: 4 }),
      wastewater: P('Wastewater plant', '♻️', 'Not glamorous. Essential.', { pay: 1.04 }),
      lab: P('Laboratory', '🔬', 'Sample, test, report — every day.', { years: 1, rate: 0.5 }),
      control: P('Control room (nights)', '🖥️', 'The whole system on one screen.', { years: 3, pay: 1.08, stress: 4 }),
    },
    calls: [
      D('main', '💦', 'Main Break', 'A 24-inch main burst under a busy road in freezing rain.', [
        { id: 'fix', label: '🛠️ Isolate and repair it overnight', check: 45, text: 'Water back on by morning. The mayor thanked the crew.', perf: 5, commend: 0.3, stress: 4, fail: { text: 'Wrong valve closed: a hospital lost pressure for an hour.', perf: -5 } },
      ]),
      D('test', '🧫', 'A Bad Sample', 'A lead test came back high. Reporting it means a public notice and a political storm.', [
        { id: 'report', label: '📢 Report it as required', text: 'A notice went out. Filters were handed out. You did the right thing.', perf: 3, rep: 6 },
        { id: 'resample', label: '🔁 "Resample" until it passes', tone: 'danger', text: 'The second sample passed.', offense: 'falsifiedRecords', offenseContext: 'falsifying drinking-water lead tests', discovery: 0.3 },
      ]),
    ],
  },
  meteorology: {
    label: 'On Shift at the Forecast Office', icon: '🌦️', unit: 'forecasts issued', volume: [2000, 4000], weights: { smarts: 3 },
    posts: {
      public: P('Public forecast desk', '🗺️', 'Seven-day forecasts and the daily discussion.'),
      aviation: P('Aviation desk', '✈️', 'Terminal forecasts for every airport.', { years: 1 }),
      warning: P('Warning coordination', '🌪️', 'Tornado and flood warnings — and the people who rely on them.', { years: 2, stress: 5 }),
      hydro: P('Hydrology', '🌊', 'River forecasts and flood stages.', { years: 2 }),
      fire: P('Incident meteorologist', '🔥', 'Deployed to wildfires to forecast for the crews.', { years: 4, pay: 1.08, stress: 5 }),
    },
    calls: [
      D('tornado', '🌪️', 'The Hook Echo', 'Radar shows rotation heading for a town. It might be nothing.', [
        { id: 'warn', label: '🚨 Issue the tornado warning now', check: 45, text: 'An EF-3 hit 14 minutes later. Everyone had time to shelter.', perf: 8, commend: 0.6, fail: { text: 'Nothing touched down. A false alarm, and the sirens lose some credibility.', perf: -1 } },
        { id: 'wait', label: '⏳ Wait one more radar scan', text: 'The warning went out with 4 minutes of lead time.', perf: -2, trauma: 4 },
      ]),
      D('hurricane', '🌀', 'The Cone', 'The models disagree about a hurricane\'s landfall by 200 miles.', [
        { id: 'honest', label: '📢 Communicate the uncertainty clearly', text: 'Emergency managers planned for both. It worked.', perf: 4, rep: 5 },
      ]),
    ],
  },
  privateMilitary: {
    label: 'On Contract', icon: '🪖', unit: 'days on contract', volume: [180, 300], weights: { fitness: 3, smarts: 1 },
    posts: {
      static: P('Static security', '🏢', 'Guard an embassy annex or an oil facility.', { stress: 4 }),
      convoy: P('Convoy security', '🚙', 'Armoured SUVs on dangerous roads.', { stress: 6, pay: 1.15 }),
      psd: P('Protective detail', '🕶️', 'Keep a client alive.', { years: 2, pay: 1.2, stress: 6 }),
      training: P('Training foreign forces', '🎯', 'Teach a partner army.', { years: 3, pay: 1.1, stress: 3 }),
      maritime: P('Maritime security', '🚢', 'Ride merchant ships through pirate waters.', { years: 1, pay: 1.1, stress: 4 }),
    },
    calls: [
      D('ambush', '💥', 'Ambush', 'Your convoy takes fire from a ridge.', [
        { id: 'push', label: '🚙 Push through the kill zone', check: 50, text: 'Everyone made it through. The vehicles took the hits.', perf: 6, commend: 0.4, trauma: 8, fail: { text: 'A vehicle was disabled. A teammate was wounded getting everyone out.', trauma: 14, injury: 0.4 } },
        { id: 'return', label: '🔫 Return fire', text: 'The firefight lasted ten minutes. You don\'t know who you hit.', trauma: 10 },
      ]),
      D('crowd', '👥', 'The Crowd', 'A crowd surrounds your vehicle at a checkpoint. A teammate wants to fire warning shots.', [
        { id: 'restraint', label: '✋ Hold fire and reverse out', text: 'Tense, but nobody was hurt.', rep: 5 },
        { id: 'fire', label: '🔫 Fire', tone: 'danger', text: 'Civilians were killed.', trauma: 16, offense: 'assault', offenseContext: 'firing on civilians while contracting abroad', discovery: 0.5 },
      ]),
    ],
  },
});

/* ------------------------------------------------------------------ */
/* Caseload                                                            */
/* ------------------------------------------------------------------ */

Object.assign(CASE_CAREERS, {
  childcare: {
    label: 'Your Room', icon: '🧸', noun: 'child', intake: [6, 12], cap: 12, stages: ['Settling in', 'Routines', 'Milestones', 'Getting ready for school', 'Moving up'],
    kinds: ['infant', 'toddler', 'shy three-year-old', 'biter', 'speech delay', 'four-year-old ready for kindergarten'],
    good: (c) => `${c.name} moved up to the next room happy, talking and ready.`, bad: (c) => `${c.name}'s family pulled them out unhappy with the care.`,
    deck: [
      D('bruise', '🩹', 'A Bruise', 'A toddler arrives with bruises on her arms in a pattern you don\'t like.', [
        { id: 'report', label: '📞 Make the mandated report', text: 'The investigation found what you feared. She\'s safe now.', perf: 4, rep: 6, trauma: 4 },
        { id: 'ask', label: '🙋 Ask the parent about it', text: 'The parent had an explanation. You\'re not sure you believe it.', stress: 4 },
      ]),
      D('ratio', '👶', 'Out of Ratio', 'Two teachers called in sick. The director wants you to take twelve toddlers alone.', [
        { id: 'refuse', label: '🙅 Refuse and call licensing', text: 'Licensing came out. Staffing got fixed. The director is cold now.', rep: 4, perf: -2 },
        { id: 'manage', label: '🧸 Manage somehow', text: 'Chaos, but everyone survived.', stress: 6 },
      ]),
    ],
  },
  caregiving: {
    label: 'Your Clients', icon: '🫶', noun: 'client', intake: [3, 8], cap: 8, stages: ['Assessment', 'Care plan', 'Daily care', 'Decline', 'Transition'],
    kinds: ['dementia', 'stroke recovery', 'ALS', 'frail elder', 'hospice', 'spinal-cord injury'],
    good: (c) => `${c.name}'s family thanked you for the years of care.`, bad: (c) => `${c.name} fell while you were with another client and went to a nursing home.`,
    deck: [
      D('fall', '🧓', 'A Fall', 'Your client slipped in the shower. She says she\'s fine and begs you not to tell her son.', [
        { id: 'tell', label: '📞 Tell the family and the agency', text: 'An x-ray found a hairline fracture. Caught in time.', perf: 4, rep: 4 },
        { id: 'secret', label: '🤐 Keep her secret', text: 'She trusts you completely.', risk: { chance: 0.35, text: 'The fracture worsened. The family blamed you.', perf: -8, rep: -8 } },
      ]),
      D('will', '📜', 'The Will', 'Your client wants to leave you $50,000 in her will. Her children don\'t visit.', [
        { id: 'decline', label: '🙅 Gently decline and tell the agency', text: 'She was hurt, then grateful you were honest.', rep: 6 },
        { id: 'accept', label: '💌 Accept her wishes', tone: 'danger', text: 'She updated the will.', money: 50000, moneyLabel: 'Inheritance from a client', risk: { chance: 0.4, text: 'Her children sued for undue influence and reported you to adult protective services.', cost: 15000, costLabel: 'Legal fees', fired: 'Accepted a client\'s inheritance' } },
      ]),
    ],
  },
  funeral: {
    label: 'The Families You Serve', icon: '🕯️', noun: 'family', intake: [40, 120], cap: 150, stages: ['First call', 'Arrangements', 'Preparation', 'Service', 'Aftercare'],
    kinds: ['traditional burial', 'cremation', 'military honours', 'infant loss', 'sudden death', 'religious service'],
    good: (c) => `The ${c.name} family said the service was exactly what she would have wanted.`, bad: (c) => `A mix-up at the ${c.name} service made a hard day worse.`,
    deck: [
      D('upsell', '⚰️', 'The Casket Room', 'A grieving widow on a fixed income is looking at the $9,000 casket. Your manager wants the sale.', [
        { id: 'honest', label: '🤝 Show her the simple options', text: 'She chose a dignified $2,200 casket and hugged you on the way out.', rep: 6, perf: -1 },
        { id: 'sell', label: '💰 Make the sale', text: 'Your manager was pleased.', perf: 3, money: 400, moneyLabel: 'Sales bonus', rep: -4 },
      ]),
      D('child', '🧸', 'The Smallest Casket', 'A family is burying their four-year-old.', [
        { id: 'care', label: '🕯️ Take extra time with everything', text: 'You did everything right. You went home and held your own kids.', trauma: 6, rep: 4 },
      ]),
    ],
  },
  revenue: {
    label: 'Your Audits', icon: '🧾', noun: 'taxpayer', intake: [15, 30], cap: 35, stages: ['Selection', 'Document request', 'Examination', 'Findings', 'Closed'],
    kinds: ['small business', 'unreported income', 'sales tax', 'payroll tax', 'estate', 'cash business'],
    good: (c) => `The ${c.name} audit closed: fair findings, paid in full.`, bad: (c) => `The ${c.name} audit was overturned on appeal.`,
    deck: [
      D('bribe', '💵', 'A Generous Offer', 'A restaurant owner under audit offers you an envelope "for your trouble."', [
        { id: 'report', label: '📝 Report it to the inspector general', text: 'He was charged with bribery. You were commended.', perf: 5, commend: 0.5 },
        { id: 'take', label: '💸 Take it and go easy', tone: 'danger', text: 'A light finding.', money: 5000, moneyLabel: 'Cash', offense: 'bribery', offenseContext: 'taking a bribe during a tax audit', discovery: 0.35 },
      ]),
      D('hardship', '😢', 'Hardship', 'A widow owes $40,000 from her late husband\'s side business. She can\'t pay.', [
        { id: 'plan', label: '🤝 Work out an installment plan and penalty relief', text: 'She\'ll pay it off over ten years. Fair.', rep: 4 },
        { id: 'levy', label: '🏦 Levy the account', text: 'Collected. She lost the house.', perf: 2, rep: -4 },
      ]),
    ],
  },
  courts: {
    label: 'Your Docket', icon: '🏛️', noun: 'case file', intake: [200, 500], cap: 400, stages: ['Filed', 'Scheduled', 'Hearing', 'Judgment', 'Archived'],
    kinds: ['traffic', 'small claims', 'eviction', 'family', 'felony', 'probate'],
    good: (c) => `The ${c.name} file moved cleanly through the system.`, bad: (c) => `A clerical error in the ${c.name} file delayed a hearing.`,
    deck: [
      D('selfrep', '🙋', 'The Self-Represented Tenant', 'A tenant facing eviction asks you what to do. Clerks can\'t give legal advice.', [
        { id: 'point', label: '📄 Point her to legal aid and the right form', text: 'She filed the right answer and kept her apartment.', rep: 4 },
        { id: 'advise', label: '🗣️ Tell her what to argue', text: 'She won.', risk: { chance: 0.2, text: 'The landlord\'s lawyer complained that a clerk coached the tenant.', perf: -6 } },
      ]),
    ],
  },
  regulatory: {
    label: 'Your Enforcement Cases', icon: '⚖️', noun: 'company', intake: [6, 14], cap: 15, stages: ['Complaint', 'Inquiry', 'Investigation', 'Settlement talks', 'Order'],
    kinds: ['consumer fraud', 'price-fixing', 'safety violation', 'false advertising', 'data breach', 'environmental release'],
    good: (c) => `The ${c.name} case ended in a consent order and restitution.`, bad: (c) => `${c.name}'s lawyers got the case dismissed.`,
    deck: [
      D('revolving', '🚪', 'The Revolving Door', 'A firm you\'re investigating hints at a $400,000 job when you leave government.', [
        { id: 'recuse', label: '🙅 Report the contact and recuse yourself', text: 'Ethics thanked you. The case went to a colleague.', rep: 6 },
        { id: 'soft', label: '🤝 Go easy and keep the door open', tone: 'danger', text: 'A gentle settlement.', offense: 'publicCorruption', offenseContext: 'softening a case for a future job', discovery: 0.2 },
      ]),
    ],
  },
  councilInspector: {
    label: 'Your Inspections', icon: '📋', noun: 'property', intake: [150, 400], cap: 350, stages: ['Scheduled', 'Inspected', 'Notice issued', 'Re-inspection', 'Closed'],
    kinds: ['new build', 'restaurant', 'rental housing', 'renovation', 'complaint', 'fire safety'],
    good: (c) => `${c.name} passed re-inspection.`, bad: (c) => `${c.name} had a problem you missed.`,
    deck: [
      D('slumlord', '🏚️', 'The Slumlord', 'A landlord with forty units has mold, no heat and a lawyer on the council.', [
        { id: 'cite', label: '📋 Cite every violation', check: 45, text: 'The citations stuck. Tenants had heat by winter.', perf: 5, rep: 6, fail: { text: 'His lawyer got most of them dismissed.', perf: -2 } },
        { id: 'warn', label: '⚠️ Give him a quiet warning', text: 'Nothing changed.', rep: -4 },
      ]),
      D('sign', '🖋️', 'Sign It Off', 'A builder offers $3,000 to sign off a framing inspection you haven\'t done.', [
        { id: 'no', label: '🙅 Inspect it properly', text: 'You found a missing header. Fixed before drywall.', perf: 3 },
        { id: 'yes', label: '💵 Sign it', tone: 'danger', text: 'Easy money.', money: 3000, moneyLabel: 'Cash', offense: 'falsifiedInspection', offenseContext: 'signing off an inspection that never happened', discovery: 0.3 },
      ]),
    ],
  },
  publicHealth: {
    label: 'Your Investigations', icon: '🦠', noun: 'investigation', intake: [20, 50], cap: 45, stages: ['Report', 'Interviews', 'Contact tracing', 'Control measures', 'Closed'],
    kinds: ['foodborne outbreak', 'measles case', 'tuberculosis', 'STI cluster', 'Legionnaires', 'lead poisoning'],
    good: (c) => `The ${c.name} investigation closed with the outbreak contained.`, bad: (c) => `The ${c.name} outbreak spread further before it was contained.`,
    deck: [
      D('outbreak', '🍽️', 'The Popular Restaurant', 'Thirty cases of salmonella trace to a beloved restaurant owned by a councilmember\'s friend.', [
        { id: 'close', label: '🚫 Close it until it\'s clean', text: 'Outbreak over. The councilmember is furious.', perf: 5, rep: 6 },
        { id: 'warn', label: '⚠️ Let it stay open with a warning', text: 'Ten more people got sick.', perf: -6, rep: -6 },
      ]),
      D('vax', '💉', 'The School Clinic', 'A measles case at a school with low vaccination rates.', [
        { id: 'clinic', label: '🏫 Run a vaccine clinic and exclude the unvaccinated', text: 'Angry parents, but the outbreak stopped at three cases.', perf: 6, stress: 6 },
      ]),
    ],
  },
  bailBonds: {
    label: 'Your Bonds', icon: '🔗', noun: 'defendant', intake: [30, 80], cap: 120, stages: ['Posted', 'Check-ins', 'Court dates', 'Trial', 'Exonerated'],
    kinds: ['DUI', 'assault', 'drug charge', 'theft', 'domestic violence', 'fraud'],
    good: (c) => `${c.name} made every court date. The bond was exonerated.`, bad: (c) => `${c.name} skipped. You had to pay the forfeiture or find him.`,
    deck: [
      D('skip', '🏃', 'The Skip', 'A $50,000 bond skipped. You know where his girlfriend lives.', [
        { id: 'hunt', label: '🔎 Go get him with a recovery agent', check: 50, text: 'You found him at 5 a.m. Surrendered to the jail, bond saved.', perf: 6, injury: 0.15, fail: { text: 'He ran again. The forfeiture hit.', cost: 5000, costLabel: 'Bond forfeiture share' } },
        { id: 'pay', label: '💸 Eat the forfeiture', text: 'Expensive.', cost: 5000, costLabel: 'Bond forfeiture share' },
      ]),
    ],
  },
  interpreter: {
    label: 'Your Assignments', icon: '🗣️', noun: 'assignment', intake: [60, 160], cap: 200, stages: ['Booked', 'Prepared', 'Interpreting', 'Follow-up', 'Done'],
    kinds: ['court hearing', 'hospital consult', 'asylum interview', 'business meeting', 'police interview', 'conference'],
    good: (c) => `The ${c.name} ${c.kind} went smoothly.`, bad: (c) => `A mistranslation at the ${c.name} ${c.kind} caused a real problem.`,
    deck: [
      D('news', '🏥', 'Bad News', 'A doctor asks you to interpret a terminal diagnosis to a family. The son asks you not to tell his mother.', [
        { id: 'faithful', label: '🗣️ Interpret faithfully, as you must', text: 'Hard, honest, right. The family thanked the doctor through you.', rep: 6, trauma: 4 },
        { id: 'soften', label: '🤐 Soften it', text: 'The mother didn\'t understand how sick she was.', rep: -8 },
      ]),
    ],
  },
});

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

Object.assign(PROJECT_CAREERS, {
  nonprofit: {
    label: 'Your Campaigns', icon: '💚', weights: { happiness: 2, smarts: 1 },
    name: (rng) => `the ${pick(rng, ['food bank', 'literacy', 'shelter', 'clean water', 'youth mentoring', 'refugee welcome'])} ${pick(rng, ['capital campaign', 'expansion', 'grant program', 'advocacy campaign', 'gala'])}`,
    acclaim: 'a foundation award and a multi-year grant', failure: { text: 'The audit found a grant you rushed spent on the wrong things. The funder wants it back.', perf: -10, rep: -12 },
    deck: [
      D('donor', '💰', 'The Big Donor', 'A donor offers $1 million — if the program is renamed for him and changed to suit his views.', [
        { id: 'accept', label: '✍️ Take it', text: 'The program grew. Some staff quit in protest.', perf: 5, rep: -4 },
        { id: 'decline', label: '🙅 Decline the strings', text: 'Smaller, but still yours.', rep: 6 },
      ]),
    ],
  },
  publicWorks: {
    label: 'Your Projects', icon: '🚧', weights: { smarts: 2, fitness: 1 },
    name: (rng) => `the ${pick(rng, ['Main Street', 'Oak Avenue', 'downtown', 'east side', 'airport road'])} ${pick(rng, ['repaving', 'sewer separation', 'sidewalk program', 'snow-route upgrade', 'stormwater project'])}`,
    acclaim: 'an APWA project of the year', failure: { text: 'A road you rushed is potholed after one winter. The council wants answers.', perf: -8, rep: -8 },
    deck: [
      D('snow', '❄️', 'The Blizzard', 'Two feet of snow and half your plow drivers are out sick.', [
        { id: 'priority', label: '🚑 Hospitals and main roads first', text: 'Emergency routes stayed open. The side streets complained for days.', perf: 4 },
        { id: 'council', label: '🏛️ Plow the councilmembers\' streets first', text: 'Politically smart. An ambulance got stuck.', perf: -4, rep: -6 },
      ]),
    ],
  },
  municipalAdmin: {
    label: 'Your Initiatives', icon: '🏛️', weights: { smarts: 2, looks: 1 },
    name: (rng) => `the ${pick(rng, ['budget', 'downtown revitalization', 'permit reform', 'homelessness', 'police oversight', 'broadband'])} ${pick(rng, ['initiative', 'plan', 'overhaul', 'program'])}`,
    acclaim: 'a national city-management award', failure: { text: 'An initiative you rushed blew a hole in the budget. The council called a special meeting.', perf: -10, rep: -10 },
    deck: [
      D('council', '🗳️', 'The 4–3 Vote', 'Your budget needs one more vote. A councilmember wants a park in her district in exchange.', [
        { id: 'deal', label: '🤝 Make the deal', text: 'The budget passed. She got her park.', perf: 4 },
        { id: 'principle', label: '📊 Make the case on the merits', check: 55, text: 'She came around. Your credibility grew.', perf: 6, rep: 6, fail: { text: 'The budget failed. A continuing resolution and angry headlines.', perf: -5 } },
      ]),
    ],
  },
  legislativeStaff: {
    label: 'Your Bills', icon: '📜', weights: { smarts: 3 },
    name: (rng) => `the ${pick(rng, ['housing', 'veterans', 'broadband', 'opioid', 'child care', 'tax relief'])} ${pick(rng, ['bill', 'amendment', 'appropriation', 'reform package'])}`,
    acclaim: 'a signing ceremony and the pen the governor used', failure: { text: 'A bill you rushed had a drafting error that gutted it. It made the papers.', perf: -10, rep: -10 },
    deck: [
      D('lobbyist', '🍷', 'Dinner With a Lobbyist', 'A lobbyist offers you dinner, a concert, and a few lines of bill language he\'s already written.', [
        { id: 'meet', label: '☕ Take the meeting, not the gifts', text: 'You used half his ideas and none of his tickets.', perf: 3, rep: 2 },
        { id: 'gifts', label: '🎟️ Enjoy the evening', tone: 'danger', text: 'A wonderful night.', offense: 'illegalLobbying', offenseContext: 'accepting a lobbyist\'s gifts while drafting a bill', discovery: 0.2 },
      ]),
    ],
  },
  actuary: {
    label: 'Your Studies', icon: '📈', weights: { smarts: 3 },
    name: (rng) => `the ${pick(rng, ['mortality', 'pricing', 'reserving', 'pension valuation', 'catastrophe model', 'experience'])} study`,
    acclaim: 'a Society of Actuaries paper prize', failure: { text: 'Reserves you set too low came due. The regulator wants a word.', perf: -12, rep: -10 },
    deck: [
      D('reserves', '📉', 'Release the Reserves?', 'The CFO wants reserves released to hit the quarter.', [
        { id: 'hold', label: '🛡️ Hold the line', text: 'The CFO is cold to you. The company stayed solvent through the next storm.', rep: 8 },
        { id: 'release', label: '📤 Release them', text: 'A great quarter.', perf: 4, risk: { chance: 0.3, text: 'A bad hurricane year exposed the shortfall.', perf: -10, rep: -10 } },
      ]),
    ],
  },
});

/* ------------------------------------------------------------------ */
/* Book of business                                                    */
/* ------------------------------------------------------------------ */

Object.assign(BOOK_CAREERS, {
  propertyManagement: {
    label: 'Your Properties', icon: '🏢', noun: 'property', value: [4000, 30000], capacity: 20, weights: { smarts: 1, happiness: 1, looks: 1 },
    kinds: ['apartment complex', 'HOA', 'strip mall', 'office building', 'single-family portfolio', 'student housing'],
    deck: [
      D('repair', '🔧', 'The Owner Won\'t Pay', 'A building\'s boiler is failing in November. The owner says patch it again.', [
        { id: 'push', label: '📞 Push the owner to replace it', check: 45, text: 'He approved it. Tenants had heat all winter.', rep: 6, fail: { text: 'He fired you and hired someone cheaper.', rep: -4 } },
        { id: 'patch', label: '🩹 Patch it', text: 'It failed in January. Tenants went to the press.', rep: -6 },
      ]),
      D('deposit', '💵', 'Security Deposits', 'The owner wants every move-out deposit kept for "wear and tear."', [
        { id: 'fair', label: '⚖️ Return what\'s fair', text: 'The owner grumbled. Tenants left good reviews.', rep: 4 },
        { id: 'keep', label: '💰 Keep them', tone: 'danger', text: 'The owner was pleased.', offense: 'wageTheft', offenseContext: 'withholding tenants\' deposits unlawfully', discovery: 0.15 },
      ]),
    ],
  },
});

/* ------------------------------------------------------------------ */
/* Seasons                                                             */
/* ------------------------------------------------------------------ */

Object.assign(SEASON_CAREERS, {
  forester: {
    label: 'The Season', icon: '🌲', weights: { fitness: 2, smarts: 1 }, payLabel: 'Fire-season overtime',
    plans: {
      timber: { name: 'Timber sales & inventory', icon: '🪵', desc: 'Cruise stands and mark the sale.', edge: 5, spread: 15, pay: 0.08, injury: 0.02, stress: 2 },
      burns: { name: 'Prescribed burns', icon: '🔥', desc: 'Burn the understory before the wildfires do it for you.', edge: 0, spread: 22, pay: 0.15, injury: 0.04, stress: 4 },
      fire: { name: 'Wildfire details', icon: '🚒', desc: 'Weeks on the line with the state fire agency. Big overtime.', edge: -3, spread: 28, pay: 0.4, injury: 0.08, stress: 7 },
    },
    tiers: [[80, 'a season everything went right', 1, 'good'], [55, 'a solid season', 0.6], [35, 'a hard season', 0.3, 'warn'], [-999, 'a season that went badly', 0.1, 'warn']],
    deck: [
      D('escape', '🔥', 'The Escaped Burn', 'A prescribed burn jumps the line in a wind shift.', [
        { id: 'catch', label: '🧯 Catch it with the crew', check: 50, text: 'You caught it at four acres.', perf: 4, fail: { text: 'It burned a barn. An investigation followed.', perf: -8, rep: -8 } },
      ]),
    ],
  },
});

/* ------------------------------------------------------------------ */
/* Audience: a congregation                                            */
/* ------------------------------------------------------------------ */

const CONGREGATION = {
  label: 'Your Congregation', icon: '⛪', noun: 'members', weights: { happiness: 2, smarts: 1 }, perFan: 1.5, start: 120, ceiling: 15000, payLabel: 'Honoraria & housing allowance',
  releases: {
    sermon: { name: 'A sermon series', icon: '📖', desc: 'Six weeks on one hard question.', check: 45, boost: 1.15, floor: 30, risk: 0.03 },
    outreach: { name: 'A community outreach', icon: '🍲', desc: 'A food pantry, a shelter night, a youth league.', check: 40, boost: 1.2, floor: 50, risk: 0.01 },
    building: { name: 'A building campaign', icon: '🏗️', desc: 'A new sanctuary — and a lot of money to raise.', check: 60, boost: 1.35, floor: 100, risk: 0.08, stress: 8 },
  },
  name: (rng) => `"${pick(rng, ['Faith in Hard Times', 'The Good Neighbor', 'Grace for the Weary', 'Rooted', 'Open Doors', 'Bread for the Journey'])}"`,
  hit: 'filled every pew', milestone: { at: 2000, honor: { id: 'clergy.growth', name: 'A Growing Congregation', icon: '⛪' } },
  deck: [
    D('funeral', '🕯️', 'A Young Death', 'A teenager in your congregation died in a car crash. The family asks you to speak.', [
      { id: 'speak', label: '🕯️ Speak, and sit with the family for days', text: 'You found words. The family never forgot.', rep: 8, trauma: 4 },
    ]),
    D('confession', '🤫', 'A Confession', 'A member tells you in confidence that he hurts his wife.', [
      { id: 'safety', label: '🛡️ Help her get safe, as the law and conscience allow', text: 'She and the children got out. Some members left over it.', rep: 4, stress: 6 },
      { id: 'counsel', label: '🙏 Counsel him privately', text: 'He promised to change.', risk: { chance: 0.4, text: 'He didn\'t. She ended up in the hospital.', trauma: 8, rep: -6 } },
    ]),
    D('money', '💰', 'The Offering', 'The treasurer suggests the building fund could "lend" you money for a new car.', [
      { id: 'no', label: '🙅 Absolutely not', text: 'The books stayed clean.', rep: 4 },
      { id: 'yes', label: '🚗 Just this once', tone: 'danger', text: 'A nice car.', money: 15000, moneyLabel: 'Building fund "loan"', offense: 'embezzlement', offenseContext: 'taking from a church building fund', discovery: 0.35 },
    ]),
  ],
};
Object.assign(AUDIENCE_CAREERS, { clergy: CONGREGATION, catholicClergy: { ...CONGREGATION, label: 'Your Parish', noun: 'parishioners', perFan: 0, payLabel: '', start: 400, ceiling: 12000 } });

/* ------------------------------------------------------------------ */
/* Second engines: careers with two sides to the work                  */
/* ------------------------------------------------------------------ */

Object.assign(SEASON_CAREERS, {
  // Wardens and rangers work calls all year (shift engine) and live by the seasons too.
  gameWarden: {
    label: 'The Seasons', icon: '🦌', weights: { fitness: 2, smarts: 1 }, payLabel: 'Seasonal overtime',
    plans: {
      hunting: { name: 'Hunting-season patrols', icon: '🦌', desc: 'Opening weekends, spotlighting and tagged deer.', edge: 3, spread: 18, pay: 0.08, injury: 0.03, stress: 4 },
      water: { name: 'Boating & fishing season', icon: '🚤', desc: 'BUI checks, licences and drownings.', edge: 3, spread: 18, pay: 0.08, injury: 0.02, stress: 3 },
      sar: { name: 'Search-and-rescue standby', icon: '⛑️', desc: 'Lost hunters and stranded hikers. Long nights, big overtime.', edge: -2, spread: 25, pay: 0.18, injury: 0.05, stress: 6 },
    },
    tiers: [[80, 'a season of clean cases and lives saved', 1, 'good'], [55, 'a solid season', 0.6], [35, 'a rough season', 0.3, 'warn'], [-999, 'a season to forget', 0.1, 'warn']],
    deck: [
      D('poacher', '🌙', 'Spotlighting', 'A truck is spotlighting deer on a back road at 2 a.m. You\'re alone, an hour from backup.', [
        { id: 'stop', label: '🚔 Make the stop', check: 50, text: 'Two rifles, a dead buck and three arrests. A clean case.', perf: 6, fail: { text: 'They ran. You got the plate.', perf: 1, stress: 4 } },
        { id: 'follow', label: '📻 Follow and call for backup', text: 'A deputy met you; the stop was routine.', perf: 3 },
      ]),
    ],
  },
  parkService: {
    label: 'The Seasons', icon: '🏞️', weights: { fitness: 2, happiness: 1 }, payLabel: 'Seasonal overtime',
    plans: {
      summer: { name: 'Summer visitor surge', icon: '🚗', desc: 'Packed trailheads, full campgrounds, and rescues.', edge: 2, spread: 20, pay: 0.1, injury: 0.03, stress: 5 },
      fire: { name: 'Wildfire season details', icon: '🔥', desc: 'Weeks on a fire line in another park.', edge: -2, spread: 26, pay: 0.25, injury: 0.06, stress: 6 },
      winter: { name: 'Winter operations', icon: '❄️', desc: 'Avalanche control, snowmobile patrol, quiet roads.', edge: 4, spread: 18, pay: 0.08, injury: 0.04, stress: 3 },
    },
    tiers: [[80, 'a great season in the park', 1, 'good'], [55, 'a busy season', 0.6], [35, 'a hard season', 0.3, 'warn'], [-999, 'a season with a tragedy', 0.1, 'warn']],
    deck: [
      D('selfie', '🦬', 'Too Close', 'A tourist is walking up to a bison for a selfie.', [
        { id: 'warn', label: '📢 Get on the loudspeaker now', check: 35, text: 'He backed off just in time.', perf: 3, fail: { text: 'The bison charged. He lived; you did the first aid.', trauma: 4 } },
      ]),
    ],
  },
  oilGas: {
    label: 'Your Hitches', icon: '🛢️', weights: { fitness: 2, smarts: 1 }, payLabel: 'Hitch bonuses',
    plans: {
      land: { name: 'Land rig, 14 on / 14 off', icon: '🏜️', desc: 'Basin rigs. Two weeks of twelve-hour tours, two weeks home.', edge: 3, spread: 15, pay: 0.06, injury: 0.04, stress: 4 },
      offshore: { name: 'Offshore platform, 21 on / 21 off', icon: '🌊', desc: 'Helicopter in, three weeks on the platform. Better pay, harder to leave.', edge: 0, spread: 18, pay: 0.14, injury: 0.05, stress: 5 },
      frac: { name: 'Frac crew', icon: '💥', desc: 'Pressure pumping on the move. The biggest checks and the longest hours.', edge: -3, spread: 24, pay: 0.2, injury: 0.08, stress: 7 },
    },
    tiers: [[80, 'a year without a single incident on your crew', 1, 'good'], [55, 'a steady year of hitches', 0.6], [35, 'a year of breakdowns and downtime', 0.25, 'warn'], [-999, 'a year with a serious incident on the rig', 0, 'warn']],
    deck: [
      D('kick', '⚠️', 'A Kick', 'The pit volume is climbing. It could be a kick — or a sensor glitch.', [
        { id: 'shut', label: '🛑 Shut in the well now', check: 40, text: 'It was a real kick. You may have prevented a blowout.', perf: 8, commend: 0.5, fail: { text: 'A false alarm that cost a day of drilling.', perf: -2 } },
        { id: 'watch', label: '👀 Watch it another few minutes', text: 'It settled down.', risk: { chance: 0.25, text: 'It wasn\'t a glitch. Gas reached the floor before the BOP closed. Everyone got off the rig.', trauma: 12, perf: -6 } },
      ]),
    ],
  },
});

const BRAND = (o) => ({ perFan: 0.03, start: 300, ceiling: 1500000, payLabel: 'Sponsorships & client work', ...o });
Object.assign(AUDIENCE_CAREERS, {
  // Designers, trainers and game developers have clients and projects — and a following.
  design: BRAND({
    label: 'Your Portfolio and Following', icon: '🎨', noun: 'followers', weights: { happiness: 2, looks: 1 }, perFan: 0.04,
    releases: {
      case: { name: 'Publish a case study', icon: '📐', desc: 'Show the process behind your best work.', check: 45, boost: 1.25, floor: 800, risk: 0.01 },
      side: { name: 'Launch a side project', icon: '🧪', desc: 'A typeface, an icon set, a little app.', check: 55, boost: 1.6, floor: 3000, risk: 0.03 },
      talk: { name: 'Speak at a design conference', icon: '🎤', desc: 'Twenty minutes on stage.', check: 50, boost: 1.3, floor: 1500, risk: 0.02, stress: 4 },
    },
    name: (rng) => `"${pick(rng, ['Quiet Interfaces', 'A Typeface for', 'Redesigning the', 'Color in', 'Designing for'])} ${pick(rng, ['Everyone', 'Transit', 'Small Screens', 'Old Things', 'Trust'])}"`,
    hit: 'went around every design blog',
    deck: [D('copy', '🖼️', 'They Copied It', 'A big brand\'s new campaign is a near copy of your side project.', [
      { id: 'post', label: '📣 Post the side-by-side', check: 45, text: 'The internet sided with you. The brand paid a licence fee.', money: 8000, moneyLabel: 'Licence settlement', rep: 6, fail: { text: 'Their lawyers sent you a scary letter.', stress: 6 } },
      { id: 'let', label: '🤷 Let it go', text: 'It stings.' },
    ])],
  }),
  fitness: BRAND({
    label: 'Your Fitness Following', icon: '💪', noun: 'followers', weights: { looks: 2, fitness: 1 }, perFan: 0.05,
    releases: {
      program: { name: 'Launch a training program', icon: '📲', desc: 'Twelve weeks, an app, before-and-afters.', check: 50, boost: 1.5, floor: 4000, risk: 0.04 },
      challenge: { name: 'Run a viral challenge', icon: '🔥', desc: 'Thirty days, a hashtag.', check: 45, boost: 1.4, floor: 3000, risk: 0.06 },
      supplement: { name: 'Push a supplement brand', icon: '💊', desc: 'Easy money. Questionable claims.', check: 40, boost: 1.2, floor: 2000, risk: 0.25 },
    },
    name: (rng) => `"${pick(rng, ['Shred', 'Strong', 'Bodyweight', 'Morning', 'Iron'])} ${pick(rng, ['30', 'for Life', 'Foundations', 'Reset', 'Season'])}"`,
    hit: 'took over everyone\'s feed',
    deck: [D('injury', '🩼', 'A Follower Got Hurt', 'A follower says your program injured her back and wants you to pay.', [
      { id: 'care', label: '🤝 Apologise, refund, add a safety note', text: 'She posted that you handled it well.', rep: 4, cost: 200, costLabel: 'Refund' },
      { id: 'deny', label: '🙅 Deny it publicly', text: 'A pile-on followed.', rep: -8 },
    ])],
  }),
  gameDevelopment: BRAND({
    label: 'Your Players', icon: '🕹️', noun: 'players', weights: { smarts: 2, happiness: 1 }, perFan: 0.02, start: 1000, ceiling: 5000000, payLabel: 'Royalties & updates',
    releases: {
      demo: { name: 'Release a demo', icon: '🧩', desc: 'Get wishlists before launch.', check: 45, boost: 1.4, floor: 5000, risk: 0.02 },
      launch: { name: 'Launch on a big storefront', icon: '🚀', desc: 'Reviews, streamers and launch-week sales.', check: 60, boost: 2.2, floor: 20000, risk: 0.06, stress: 8 },
      update: { name: 'Ship a big free update', icon: '🛠️', desc: 'Win back old players.', check: 45, boost: 1.3, floor: 4000, risk: 0.02 },
    },
    name: (rng) => `"${pick(rng, ['Ashen', 'Star', 'Hollow', 'Neon', 'Little', 'Last'])} ${pick(rng, ['Crown', 'Drift', 'Keep', 'Garden', 'Protocol', 'Light'])}"`,
    hit: 'hit the top-sellers list', award: { id: 'games.award', name: 'Game Award Nomination', icon: '🏆' },
    deck: [D('review', '📝', 'Review Bombing', 'An internet mob is review-bombing your game over an unrelated tweet.', [
      { id: 'quiet', label: '🤐 Ride it out', text: 'It passed in two weeks.', stress: 4 },
      { id: 'respond', label: '🗣️ Respond publicly', check: 50, text: 'Your community rallied around you.', rep: 6, fail: { text: 'It got worse.', rep: -6, stress: 6 } },
    ])],
  }),
});

/* ------------------------------------------------------------------ */
/* Allied health                                                       */
/* ------------------------------------------------------------------ */

Object.assign(CASE_CAREERS, {
  dietitian: {
    label: 'Your Patients', icon: '🥗', noun: 'patient', intake: [60, 140], cap: 120, stages: ['Referral', 'Assessment', 'Nutrition plan', 'Follow-up', 'Discharge'],
    kinds: ['type 2 diabetes', 'kidney disease', 'eating disorder', 'tube feeding in the ICU', 'pediatric failure to thrive', 'heart disease'],
    good: (c) => `${c.name}'s numbers came down and stayed down.`, bad: (c) => `${c.name} stopped coming and ended up back in hospital.`,
    deck: [
      D('fad', '📱', 'The Influencer Diet', 'A patient with kidney disease wants to follow a celebrity\'s high-protein diet.', [
        { id: 'teach', label: '📊 Walk her through her labs', check: 45, text: 'She understood, and her kidney function held steady.', perf: 4, rep: 4, fail: { text: 'She followed the influencer. Her labs got worse.', perf: -2 } },
      ]),
      D('ed', '🫶', 'Recovery', 'A teenager with anorexia is refusing the meal plan, and her parents are frightened.', [
        { id: 'team', label: '🤝 Bring in the treatment team and the family', text: 'Slow progress, but progress.', perf: 3, rep: 4, stress: 4 },
      ]),
    ],
  },
});
Object.assign(BOOK_CAREERS, {
  // Private practice: a panel of patients who stay — or don't.
  optometry: {
    label: 'Your Practice', icon: '👓', noun: 'patient', value: [150, 600], capacity: 2500, sample: 25, weights: { smarts: 2, happiness: 1 },
    kinds: ['contact-lens wearer', 'glaucoma patient', 'diabetic eye exam', 'child\'s first glasses', 'dry eye', 'macular degeneration'],
    deck: [
      D('retina', '👁️', 'Something on the Retina', 'A routine exam shows a suspicious lesion on a young patient\'s retina.', [
        { id: 'refer', label: '📞 Refer to a retina specialist today', text: 'An early melanoma. Caught in time.', rep: 8, perf: 4 },
        { id: 'watch', label: '📅 Recheck in six months', text: 'Probably nothing.', risk: { chance: 0.2, text: 'It wasn\'t nothing. A malpractice claim followed.', rep: -12, cost: 10000, costLabel: 'Malpractice deductible' } },
      ]),
      D('online', '💻', 'Online Glasses', 'A patient wants their prescription to buy glasses online for a fraction of your price.', [
        { id: 'give', label: '📄 Hand it over gladly', text: 'They came back for every exam since.', rep: 4 },
        { id: 'stall', label: '🙄 Make it difficult', text: 'They found another optometrist.', rep: -4 },
      ]),
    ],
  },
  chiropractic: {
    label: 'Your Practice', icon: '🦴', noun: 'patient', value: [300, 1800], capacity: 600, sample: 20, weights: { happiness: 2, fitness: 1 },
    kinds: ['lower back pain', 'whiplash', 'athlete', 'desk worker', 'pregnancy back pain', 'sciatica'],
    deck: [
      D('plan', '📅', 'The 36-Visit Plan', 'A consultant says to put every new patient on a prepaid 36-visit plan.', [
        { id: 'honest', label: '🩺 Treat what each patient needs', text: 'Lower revenue, loyal patients and good reviews.', rep: 6 },
        { id: 'plan', label: '💰 Sell the plans', text: 'Revenue jumped.', money: 15000, moneyLabel: 'Prepaid plans', risk: { chance: 0.2, text: 'An insurer audit flagged the billing.', cost: 12000, costLabel: 'Insurer repayment', rep: -8 } },
      ]),
      D('redflag', '🚩', 'Red Flags', 'A patient\'s back pain comes with weight loss and night sweats.', [
        { id: 'refer', label: '🏥 Refer to a physician', text: 'It was a cancer, caught early. The patient credits you.', rep: 8 },
        { id: 'adjust', label: '🦴 Adjust and see', text: 'No improvement.', risk: { chance: 0.4, text: 'The diagnosis came months late. A lawsuit followed.', rep: -12, cost: 15000, costLabel: 'Malpractice deductible' } },
      ]),
    ],
  },
});

/* ------------------------------------------------------------------ */
/* Transit, rail and the airlines                                      */
/* ------------------------------------------------------------------ */

const Ln = (name, icon, desc, o = {}) => ({ name, icon, desc, years: 0, pay: 1, stress: 3, away: 0, risk: 1, rate: 1, ...o });
const Q = (name, icon, desc, o = {}) => ({ name, icon, desc, cost: 0, years: 0, pay: 0, ...o });

Object.assign(ROUTE_CAREERS, {
  transit: {
    label: 'Your Run', icon: '🚌', unit: 'passengers carried', volume: [60000, 140000], weights: { happiness: 2, smarts: 1 }, checkEvery: 2, checkName: 'operator recertification',
    lines: {
      extra: Ln('Extra board', '📟', 'Covering open runs: different route, different hours, every day.', { stress: 5 }),
      crosstown: Ln('Crosstown local', '🚌', 'A regular route, the same regulars every morning.', { years: 1 }),
      express: Ln('Express & commuter routes', '🛣️', 'Highway runs, split shifts, quieter buses.', { years: 3, pay: 1.03, stress: 2 }),
      owl: Ln('Owl service', '🌙', 'Overnight routes. Differential pay and the city at its strangest.', { years: 1, pay: 1.08, stress: 5, risk: 1.3 }),
      rail: Ln('Light rail / subway', '🚇', 'The train, the tunnel and the timetable.', { years: 4, pay: 1.06, needs: 'railCert' }),
    },
    quals: {
      railCert: Q('Rail operator certification', '🚇', 'Signals, interlockings and the rulebook.', { years: 2, pay: 0.03 }),
      instructor: Q('Operator instructor', '🎓', 'Train the new hires on the road.', { years: 4, pay: 0.04 }),
      steward: Q('Union shop steward', '✊', 'Represent your division in grievances.', { years: 3 }),
    },
    milestones: [[1000000, { id: 'transit.safe', name: 'Million-Passenger Safe Operator Award', icon: '🏅' }]], safeAt: true,
    deck: [
      { id: 'assault', icon: '😡', title: 'Fare Dispute', text: 'A passenger refuses to pay, gets in your face, and spits at you.', options: [
        { id: 'calm', label: '🗣️ Stay calm and call it in', text: 'Transit police met the bus two stops later.', perf: 2 },
        { id: 'eject', label: '🚪 Order him off', check: 50, text: 'He got off, cursing.', perf: 1, fail: { text: 'He swung at you. A week off and a court date as a witness.', injury: 0.5, trauma: 4 } },
      ] },
      { id: 'lost', icon: '🧒', title: 'The Lost Kid', text: 'A five-year-old is riding alone at the end of the line, crying.', options: [
        { id: 'stay', label: '🧸 Stay with her and call dispatch', text: 'Her frantic mother reached the depot an hour later and hugged you.', rep: 6, happiness: 4 },
      ] },
    ],
  },
  railroad: {
    label: 'Your Board', icon: '🚂', unit: 'train miles', volume: [40000, 75000], weights: { smarts: 2, health: 1 }, checkEvery: 3, checkName: 'FRA recertification check ride',
    lines: {
      extra: Ln('Extra board', '📟', 'On call around the clock for any train.', { stress: 5, away: 4 }),
      yard: Ln('Yard job', '🛤️', 'Switching cars in the yard. Home every night.', { years: 2, pay: 0.95, stress: 3, rate: 0.4 }),
      pool: Ln('Pool freight', '🔁', 'First in, first out on a fixed route.', { years: 4, pay: 1.04, stress: 3, away: 3 }),
      passenger: Ln('Passenger service', '🚆', 'Schedules, stations and people instead of coal.', { years: 6, pay: 1.06, stress: 2, needs: 'passenger' }),
      local: Ln('Regular local assignment', '📅', 'Your own job and your own days off.', { years: 10, pay: 1.02, stress: 1 }),
    },
    quals: {
      remote: Q('Remote-control operator', '🎮', 'Run yard engines from a belt pack.', { years: 1, pay: 0.02 }),
      hazmat: Q('Hazmat & key-train training', '☣️', 'The trains that can\'t have a bad day.', { years: 2, pay: 0.03 }),
      passenger: Q('Passenger qualification', '🚆', 'Passenger rules, station work and the timetable.', { years: 4, pay: 0.03 }),
    },
    milestones: [], safeAt: true,
    deck: [
      { id: 'crossing', icon: '🚗', title: 'The Car on the Crossing', text: 'A car is stalled on the crossing ahead. You\'re pulling 12,000 tons; you can\'t stop in time.', options: [
        { id: 'emergency', label: '🛑 Dump the air — emergency brake', text: 'You hit it anyway, slower. The driver had got out. You didn\'t sleep for a week.', trauma: 10, perf: 2 },
      ] },
      { id: 'fatigue', icon: '😴', title: 'Called Again', text: 'The crew office calls before your rest is up, short of crews.', options: [
        { id: 'rest', label: '🛏️ Take your full rest', text: 'They found someone else.', perf: -1 },
        { id: 'go', label: '🚂 Go anyway', tone: 'danger', text: 'You worked the train.', money: 900, moneyLabel: 'Extra trip', risk: { chance: 0.15, text: 'You missed a restricted-speed signal. An FRA decertification hearing followed.', perf: -12, stress: 8 } },
      ] },
    ],
  },
  aviation: {
    label: 'Your Logbook', icon: '✈️', unit: 'flight hours', volume: [700, 950], weights: { smarts: 2, health: 1 }, checkEvery: 1, checkName: 'recurrent proficiency check in the simulator',
    lines: {
      reserve: Ln('Reserve', '📟', 'On call. Holidays, red-eyes and wherever crew scheduling needs you.', { stress: 5, away: 4, pay: 0.95 }),
      domestic: Ln('Domestic line', '🛫', 'Turns and overnights you bid for.', { years: 3, stress: 3, away: 3 }),
      commuter: Ln('Commutable line', '🧳', 'Trips that start late and end early, so you can live somewhere else.', { years: 5, stress: 2, away: 3, happiness: 2 }),
      international: Ln('International widebody', '🌍', 'Long-haul, augmented crews, layovers in Tokyo and Frankfurt.', { years: 8, pay: 1.1, stress: 3, away: 5, needs: 'oceanic' }),
    },
    quals: {
      oceanic: Q('Oceanic & ETOPS qualification', '🌊', 'Long overwater flying and the procedures that go with it.', { years: 3, pay: 0.03 }),
      safety: Q('Union safety committee', '🦺', 'Investigate incidents and fight for better procedures.', { years: 4 }),
      lca: Q('Line check airman', '🎓', 'Check other pilots on real trips.', { years: 8, pay: 0.05 }),
    },
    milestones: [[10000, { id: 'aviation.10k', name: '10,000 Hours', icon: '✈️' }], [20000, { id: 'aviation.20k', name: '20,000 Hours', icon: '🛩️' }]], safeAt: true,
    deck: [
      { id: 'goaround', icon: '🌫️', title: 'Unstable Approach', text: 'At 500 feet you\'re fast and high. The captain says "we can make it."', options: [
        { id: 'goaround', label: '🔄 Call the go-around', text: 'A second approach, a smooth landing, and a nod from the captain at the gate.', perf: 3, rep: 4 },
        { id: 'land', label: '🛬 Land it', text: 'You landed long.', risk: { chance: 0.2, text: 'You ran off the end into the overrun. Nobody hurt; a long investigation.', perf: -10, stress: 8 } },
      ] },
      { id: 'drunk', icon: '🍺', title: 'The Smell', text: 'Your captain smells of alcohol at the 6 a.m. report.', options: [
        { id: 'report', label: '📞 Call the union peer program', text: 'He was pulled from the trip and into treatment. Years later he thanked you.', rep: 6 },
        { id: 'fly', label: '🤐 Say nothing and fly', tone: 'danger', text: 'The flight was fine.', risk: { chance: 0.3, text: 'Security noticed. Both of you were pulled off the plane on camera.', perf: -12, rep: -10 } },
      ] },
    ],
  },
});

TRADE_CAREERS.transitMaintenance = {
  label: 'The Work Orders', icon: '🛠️', weights: { smarts: 2, fitness: 1 }, hours: 6000, licence: 'mechanic\'s certification',
  jobs: [
    { name: 'Brake overhaul on a forty-foot bus', icon: '🚌', diff: 35, pay: 0.02, injury: 0.02, cash: 0 },
    { name: 'Rail car traction-motor swap', icon: '🚇', diff: 55, pay: 0.04, injury: 0.03, cash: 0 },
    { name: 'Signal failure at rush hour', icon: '🚦', diff: 60, pay: 0.05, injury: 0.03, cash: 0 },
    { name: 'Hybrid-bus battery fault', icon: '🔋', diff: 50, pay: 0.03, injury: 0.02, cash: 0 },
    { name: 'Overnight track inspection', icon: '🛤️', diff: 40, pay: 0.03, injury: 0.04, cash: 0 },
    { name: 'Wheelchair-lift repairs across the fleet', icon: '♿', diff: 30, pay: 0.02, injury: 0.01, cash: 0 },
  ],
  deck: [
    { id: 'pressure', icon: '⏰', title: 'Get It Back Out', text: 'Operations wants a bus back in service for rush hour. The brakes are borderline.', options: [
      { id: 'hold', label: '🛑 Red-tag it', text: 'Rush hour was short a bus. Nobody died.', rep: 4, perf: -1 },
      { id: 'release', label: '✅ Sign it out', text: 'It made its runs.', perf: 2, risk: { chance: 0.15, text: 'The brakes failed on a hill. A minor crash and an investigation that found your signature.', perf: -12, rep: -10 } },
    ] },
  ],
};
