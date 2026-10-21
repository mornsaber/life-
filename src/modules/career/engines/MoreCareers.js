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
 *   Seasons           state forestry · emergency management
 *   Audience          clergy (a congregation)
 */
import { SHIFT_CAREERS } from './ShiftIncident.js';
import { CASE_CAREERS } from './Caseload.js';
import { PROJECT_CAREERS } from './Projects.js';
import { BOOK_CAREERS } from './ClientBook.js';
import { SEASON_CAREERS } from './Seasons.js';
import { AUDIENCE_CAREERS } from './Audience.js';

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
  emergencyManagement: {
    label: 'Disaster Season', icon: '🚨', weights: { smarts: 2, happiness: 1 }, payLabel: 'Activation overtime',
    plans: {
      plans: { name: 'Plans & exercises', icon: '📋', desc: 'Write the plans and run the drills before anything happens.', edge: 6, spread: 15, pay: 0.05, injury: 0, stress: 2 },
      grants: { name: 'Mitigation grants', icon: '💰', desc: 'Buy out flood homes and harden shelters.', edge: 3, spread: 18, pay: 0.05, injury: 0, stress: 3 },
      eoc: { name: 'Run the operations centre', icon: '🖥️', desc: 'When the storm hits, you\'re in charge of the room.', edge: 0, spread: 25, pay: 0.25, injury: 0, stress: 7 },
    },
    tiers: [[80, 'a disaster season you handled superbly', 1, 'good'], [55, 'a busy season, well managed', 0.6], [35, 'a season with mistakes the after-action report found', 0.3, 'warn'], [-999, 'a disaster response that went wrong', 0.1, 'warn']],
    deck: [
      D('evac', '🌀', 'Evacuate?', 'A hurricane is two days out. Evacuating costs millions and might be unnecessary.', [
        { id: 'order', label: '📢 Recommend the evacuation', check: 45, text: 'It hit. The shelters were full and nobody drowned.', perf: 8, commend: 0.5, fail: { text: 'It turned away at the last minute. A costly evacuation and a lot of criticism.', perf: -3 } },
        { id: 'wait', label: '⏳ Wait another day', text: 'The storm turned. You got lucky.', risk: { chance: 0.4, text: 'It didn\'t turn. Roads jammed and people were trapped.', perf: -12, trauma: 10 } },
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
