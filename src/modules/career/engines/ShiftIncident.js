/**
 * Shift & incident careers: the police/fire/EMS pattern for the jobs that
 * share it. You bid onto a post (a console, a housing unit, a checkpoint, a
 * district), work its volume, and the calls you remember become decisions —
 * a skill check, commendations and complaints, and sometimes trauma.
 *
 *   911 dispatch · corrections, jails and federal/private prisons · private
 *   security · TSA · animal services · game wardens · park rangers · air
 *   traffic control
 *
 * state.careerLife.shiftWork = { professionId, post, handled, rep, commendations, complaints, years }
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../../core/State.js';
import { lifeOf, peekLife, resolveOption, promptOptions, applyFx } from './Kit.js';

const P = (name, icon, desc, o = {}) => ({ name, icon, desc, stress: 3, pay: 1, rate: 1, years: 0, ...o });
const C = (id, icon, title, text, options) => ({ id, icon, title, text, options });

const PRISON = {
  label: 'On the Unit', icon: '🔐', unit: 'inmates supervised', volume: [80, 400], weights: { smarts: 1, fitness: 1 },
  posts: {
    housing: P('General-population housing unit', '🏢', 'Counts, mail, meals and a hundred personalities.', { stress: 4 }),
    max: P('Maximum security / segregation', '⛓️', 'Cell extractions and the men nobody else can house. Danger pay.', { stress: 7, pay: 1.08, years: 2, rate: 1.3 }),
    tower: P('Perimeter & towers', '🗼', 'Long, quiet hours watching the fence.', { stress: 1, rate: 0.5 }),
    transport: P('Transport & hospital escort', '🚐', 'Court runs, hospital guards, out-of-town transfers.', { stress: 3, years: 1 }),
    cert: P('Emergency response team', '🛡️', 'The team that goes in when a unit goes bad.', { stress: 6, pay: 1.05, years: 3, rate: 1.2 }),
  },
  calls: [
    C('fight', '👊', 'Fight in the Dayroom', 'Two inmates are fighting and a crowd is forming. You\'re alone on the floor for another forty seconds.', [
      { id: 'radio', label: '📻 Call it in and hold the door', text: 'Backup flooded in. The fight ended with two in segregation and nobody else hurt.', perf: 2 },
      { id: 'wade', label: '🏃 Wade in and break it up', check: 55, weights: { fitness: 2, smarts: 1 }, text: 'You split them before the crowd joined in. The sergeant noticed.', perf: 5, commend: 0.3, fail: { text: 'The crowd turned on you. You went to the hospital with a broken hand.', injury: 1, trauma: 6, perf: 0 } },
    ]),
    C('contraband', '📦', 'A Package From the Inside', 'An inmate you get along with offers you $2,000 to carry a package in. "Nobody checks you."', [
      { id: 'report', label: '📝 Report the approach', text: 'Internal affairs used it to break a smuggling ring. Some inmates won\'t speak to you now.', perf: 4, commend: 0.4, stress: 3 },
      { id: 'refuse', label: '🙅 Refuse and say nothing', text: 'He shrugged. Someone else will.', perf: 0 },
      { id: 'carry', label: '💸 Carry it', tone: 'danger', text: 'The money was easy. The next request wasn\'t optional.', money: 2000, moneyLabel: 'Cash', offense: 'bribery', offenseContext: 'smuggling contraband into a prison', discovery: 0.4 },
    ]),
    C('suicide', '🆘', 'Count Doesn\'t Clear', 'At 3 a.m. count, a man in a single cell isn\'t answering. Policy says wait for a second officer before you open the door.', [
      { id: 'open', label: '🚪 Open it now', check: 40, text: 'He\'d tried to hang himself. You cut him down and he lived.', perf: 6, commend: 0.6, honor: { id: 'corr.lifesave', name: 'Corrections Lifesaving Award', icon: '❤️' }, fail: { text: 'You were too late. The review cleared you; your sleep didn\'t.', trauma: 10 } },
      { id: 'wait', label: '⏳ Wait for the second officer', text: 'Ninety seconds. He survived, barely. Policy was followed.', perf: 1, trauma: 3 },
    ]),
    C('force', '⚖️', 'The Cell Extraction', 'An inmate is refusing to leave his cell and flooding the tier. The lieutenant wants him out now.', [
      { id: 'talk', label: '🗣️ Talk him out first', check: 50, text: 'Twenty minutes of talking and he walked out on his own.', perf: 4, rep: 4, fail: { text: 'He wouldn\'t budge, and the extraction team went in angrier for the wait.', perf: 0 } },
      { id: 'team', label: '🛡️ Send the team in by the book', text: 'Shield, restraints, camera rolling. Clean.', perf: 2 },
      { id: 'payback', label: '😠 Let the team "teach him a lesson"', tone: 'danger', text: 'He went to the infirmary. The camera "malfunctioned".', perf: 1, complaint: 0.8, offense: 'excessiveForce', offenseContext: 'beating a restrained inmate' },
    ]),
  ],
};

export const SHIFT_CAREERS = {
  dispatch: {
    label: 'On the Console', icon: '🎧', unit: '911 calls answered', volume: [9000, 18000], weights: { smarts: 2, happiness: 1 },
    posts: {
      calltaker: P('Call-taking', '📞', 'Answer and triage: medical, fire, police, and a lot of non-emergencies.', { stress: 4 }),
      police: P('Police radio', '🚓', 'Run a district\'s units, warrants and pursuits.', { stress: 5, years: 1 }),
      fire: P('Fire & EMS radio', '🚒', 'Dispatch apparatus, track mutual aid, run the big fires.', { stress: 4, years: 1 }),
      nights: P('Overnight console', '🌙', 'Fewer calls, worse ones. Night differential.', { stress: 5, pay: 1.08 }),
      cto: P('Communications training officer', '🎓', 'Train the new hires one shift at a time.', { stress: 3, pay: 1.05, years: 3, rate: 0.7 }),
    },
    calls: [
      C('cpr', '❤️', 'CPR Over the Phone', 'A woman is screaming that her husband isn\'t breathing. The ambulance is eight minutes out.', [
        { id: 'coach', label: '🗣️ Coach her through compressions', check: 40, text: 'You counted with her for eight minutes. He had a pulse when the medics walked in.', perf: 6, commend: 0.5, honor: { id: 'dispatch.lifesave', name: 'Telecommunicator Lifesaving Award', icon: '❤️' }, fail: { text: 'She couldn\'t keep going. He didn\'t make it. You took the next call.', trauma: 8 } },
        { id: 'script', label: '📋 Read the protocol card word for word', text: 'Textbook. The medics took over at minute eight.', perf: 3 },
      ]),
      C('shooter', '🔫', 'Shots Fired at the High School', 'Twenty calls hit the board at once: shots inside the high school.', [
        { id: 'command', label: '📻 Take the radio and run the response', check: 60, text: 'You kept forty units straight and the hospital warned in time. Your voice never cracked.', perf: 8, commend: 0.7, trauma: 8, fail: { text: 'Units stepped on each other for two minutes. The after-action report was kind about it; you weren\'t.', trauma: 10, perf: 2 } },
        { id: 'calls', label: '📞 Stay on the calls from inside', text: 'You stayed on with a teacher hiding twenty kids in a closet until the team reached them.', perf: 5, trauma: 10 },
      ]),
      C('swat', '☎️', 'A Calm Voice Reporting a Murder', 'A man calmly says he\'s killed his wife and has hostages. The address is real; something feels off.', [
        { id: 'flag', label: '🚩 Flag possible swatting to responding units', check: 50, text: 'It was a swatting call. Units approached carefully and a family wasn\'t hurt.', perf: 5, commend: 0.4, fail: { text: 'It was real, and units went in a little slower because of you. It ended without anyone killed.', perf: -2 } },
        { id: 'straight', label: '📻 Dispatch it as given', text: 'SWAT hit the door. It was a swatting prank; a terrified family was on the floor.', perf: 0, risk: { chance: 0.15, text: 'A nervous officer fired. Nobody died, but the review named your call.', trauma: 6, perf: -3 } },
      ]),
      C('overtime', '⏰', 'Mandatory Overtime Again', 'Short-staffed for the fourth week running: you\'re ordered to stay another eight hours.', [
        { id: 'stay', label: '😮‍💨 Stay', text: 'Sixteen hours. Good money, bad sleep.', money: 1800, moneyLabel: 'Overtime', stress: 6 },
        { id: 'grieve', label: '✊ File a grievance with the union', text: 'The grievance won a cap on mandatory holdovers.', perf: -1, rep: 3 },
      ]),
    ],
  },
  corrections: PRISON, jail: PRISON, federalPrisons: PRISON, privatePrisons: PRISON,
  privateSecurity: {
    label: 'On Post', icon: '🛡️', unit: 'patrol rounds', volume: [1500, 4000], weights: { fitness: 1, smarts: 1 },
    posts: {
      mall: P('Shopping mall', '🛍️', 'Shoplifters, lost kids and teenagers.', { stress: 2 }),
      hospital: P('Hospital security', '🏥', 'The ER at 2 a.m.: intoxicated, violent and grieving people.', { stress: 5, pay: 1.06 }),
      corporate: P('Corporate headquarters', '🏢', 'Badges, lobbies and the occasional ex-employee.', { stress: 1 }),
      events: P('Stadium & concert events', '🏟️', 'Crowds of 40,000 and a lot of beer.', { stress: 4 }),
      ep: P('Executive protection', '🕶️', 'Travel with a CEO or a celebrity. Long days, very good pay.', { stress: 4, pay: 1.35, years: 4 }),
    },
    calls: [
      C('shoplifter', '🧥', 'The Shoplifter', 'A teenager walks out with a jacket under his arm. Store policy says don\'t chase.', [
        { id: 'stop', label: '✋ Stop him at the door and call police', check: 40, text: 'He handed it back and cried. The police gave him a warning.', perf: 2, fail: { text: 'He ran; you followed into the parking lot. The client was furious about the liability.', perf: -3 } },
        { id: 'tackle', label: '🏈 Tackle him', text: 'You got the jacket. His parents got a lawyer.', complaint: 0.8, perf: -4, offense: 'assault', offenseContext: 'tackling a shoplifter', discovery: 0.5 },
        { id: 'report', label: '📝 Note it and report to the store', text: 'Policy followed. The store pressed charges from the video.', perf: 1 },
      ]),
      C('er', '😡', 'Violent in the ER', 'A drunk patient is swinging at a nurse.', [
        { id: 'deescalate', label: '🗣️ Step between them and talk him down', check: 50, text: 'He sat down. The nurses bought you lunch.', perf: 5, commend: 0.4, fail: { text: 'He swung at you instead. A sprained wrist and a long report.', injury: 0.6, perf: 1 } },
        { id: 'restrain', label: '🤝 Restrain him with the team', text: 'Four of you, by the book. The nurse was unhurt.', perf: 3 },
      ]),
      C('vip', '🕶️', 'The Principal Wants to Lose You', 'The executive you protect wants to slip out to meet someone, alone, at night.', [
        { id: 'insist', label: '🚗 Insist on following discreetly', check: 45, text: 'You stayed close and invisible. Nothing happened, and the client trusted you more.', perf: 4, rep: 5, fail: { text: 'You were spotted. The client was annoyed and demanded a new detail.', perf: -3 } },
        { id: 'let', label: '🙈 Let them go', text: 'Nothing happened this time.', perf: 0, risk: { chance: 0.15, text: 'There was a robbery. Your company lost the contract.', perf: -10, rep: -10 } },
      ]),
    ],
  },
  tsa: {
    label: 'At the Checkpoint', icon: '🛄', unit: 'passengers screened', volume: [60000, 140000], weights: { smarts: 1 },
    posts: {
      checkpoint: P('Checkpoint lanes', '🛂', 'Bags, bodies and a long line of people in a hurry.', { stress: 3 }),
      baggage: P('Checked baggage', '🧳', 'The CT machines in the basement. Quiet and repetitive.', { stress: 1, rate: 0.6 }),
      precheck: P('PreCheck & crew lanes', '✅', 'Frequent flyers and pilots: polite and fast.', { stress: 2 }),
      bdo: P('Behavior detection & K-9 teams', '🐕', 'Watch the crowd, work with the dogs.', { stress: 3, years: 2 }),
    },
    calls: [
      C('gun', '🔫', 'Gun in a Carry-On', 'The X-ray shows a loaded pistol in a businessman\'s bag. He says he forgot it was there.', [
        { id: 'protocol', label: '📻 Stop the belt and call the police', text: 'By the book: he missed his flight and got a citation.', perf: 4, commend: 0.2 },
        { id: 'quiet', label: '🤫 Let him take it back to his car', tone: 'danger', text: 'He thanked you.', perf: -2, risk: { chance: 0.35, text: 'Covert testers had planted it. You were suspended.', perf: -15, fired: 'Failed a covert security test' } },
      ]),
      C('patdown', '😤', 'The Viral Pat-Down', 'A passenger livestreams her pat-down and calls it assault.', [
        { id: 'calm', label: '🙂 Explain each step calmly, with a supervisor', check: 40, text: 'The video went viral — as an example of a professional screener.', perf: 3, rep: 5, fail: { text: 'The clip was edited. You were briefly the most hated screener in America.', stress: 6, complaint: 0.5 } },
        { id: 'refuse', label: '🚫 Refuse her screening', text: 'She missed her flight. The complaint went nowhere.', perf: -1, complaint: 0.5 },
      ]),
      C('shutdown', '🏛️', 'Government Shutdown', 'Congress shut the government down. You\'re "essential": work without pay until it ends.', [
        { id: 'work', label: '💼 Keep showing up', text: 'Five weeks without a paycheck. Back pay came eventually.', perf: 4, stress: 8 },
        { id: 'sick', label: '🤒 Call in sick', text: 'Thousands did. The lines got very long.', perf: -4 },
      ]),
    ],
  },
  animalControl: {
    label: 'In the Field', icon: '🐕', unit: 'calls answered', volume: [600, 1500], weights: { fitness: 1, smarts: 1 },
    posts: {
      field: P('Field officer', '🚐', 'Strays, bites, wildlife in the attic.', { stress: 3 }),
      shelter: P('Shelter operations', '🏠', 'Intake, adoptions and the euthanasia list.', { stress: 4 }),
      cruelty: P('Cruelty investigations', '🔎', 'Neglect, fighting rings and hoarders.', { stress: 5, years: 2 }),
    },
    calls: [
      C('dog', '🐕', 'Dangerous Dog', 'A pit mix has bitten a child. The family begs you not to take him.', [
        { id: 'quarantine', label: '🏠 Home quarantine and a hearing', check: 40, text: 'The hearing found it was provoked. The dog went home with conditions.', perf: 3, fail: { text: 'He bit again during quarantine.', perf: -5, complaint: 0.5 } },
        { id: 'impound', label: '🚐 Impound him', text: 'The family cried in the driveway. The law was followed.', perf: 2, stress: 3 },
      ]),
      C('hoarder', '🐈', 'Ninety Cats', 'A neighbor reports a smell. Inside a small house: ninety cats and an elderly woman who loves every one.', [
        { id: 'work', label: '🤝 Work with her and the rescues over weeks', check: 45, text: 'Rescues took most of them; she kept three she could care for, and adult services stepped in.', perf: 6, commend: 0.3, fail: { text: 'She moved the cats to her son\'s house overnight.', perf: -1 } },
        { id: 'seize', label: '⚖️ Seize them all today', text: 'A brutal day. The shelter filled; many weren\'t adoptable.', perf: 2, stress: 6 },
      ]),
      C('fighting', '🩸', 'A Dogfighting Ring', 'A tip points to a dogfighting operation on a rural property.', [
        { id: 'task', label: '🚓 Build the case with the sheriff', check: 50, text: 'The raid rescued thirty dogs and led to felony convictions.', perf: 8, commend: 0.6, honor: { id: 'animal.award', name: 'Humane Law Enforcement Award', icon: '🐾' }, fail: { text: 'Someone talked. The property was empty when you arrived.', perf: 0 } },
        { id: 'alone', label: '🚐 Go out and look', text: 'You were run off the property at gunpoint.', trauma: 6, perf: 0 },
      ]),
    ],
  },
  gameWarden: {
    label: 'In the Field', icon: '🦌', unit: 'contacts made', volume: [800, 2000], weights: { fitness: 1, smarts: 1 },
    posts: {
      district: P('A rural patrol district', '🌲', 'A county or two of woods, lakes and hunters — alone.', { stress: 3 }),
      marine: P('Marine & boating patrol', '🚤', 'Boating under the influence, fishing limits, drownings.', { stress: 3 }),
      investigations: P('Special investigations', '🔎', 'Commercial poaching rings and wildlife trafficking.', { stress: 4, years: 3 }),
    },
    calls: [
      C('poacher', '🦌', 'Spotlighting at Midnight', 'A truck is spotlighting deer on a back road. Three armed men, and backup is an hour away.', [
        { id: 'stop', label: '🔦 Make the stop alone', check: 55, weights: { fitness: 1, smarts: 2 }, text: 'You talked them out of the truck one at a time. Three arrests, the rifles seized.', perf: 7, commend: 0.5, fail: { text: 'One of them reached for a rifle. It ended with nobody shot — barely.', trauma: 8, perf: 2 } },
        { id: 'plates', label: '📋 Get the plates and stop them in daylight', text: 'You served warrants the next week.', perf: 4 },
      ]),
      C('drowning', '🌊', 'Overturned Canoe', 'A canoe is upside down in cold water. One paddler is clinging; one is missing.', [
        { id: 'dive', label: '🏊 Go in after the missing paddler', check: 50, weights: { fitness: 2 }, text: 'You found him under the canoe and got him breathing.', perf: 8, honor: { id: 'warden.lifesave', name: 'Lifesaving Award (Fish & Wildlife)', icon: '❤️' }, fail: { text: 'You couldn\'t reach him in time.', trauma: 10 } },
        { id: 'secure', label: '🛟 Secure the survivor and call the dive team', text: 'The survivor lived. The dive team recovered the other.', perf: 3, trauma: 4 },
      ]),
    ],
  },
  parkService: {
    label: 'In the Park', icon: '🏞️', unit: 'visitor contacts', volume: [5000, 20000], weights: { fitness: 1, smarts: 1 },
    posts: {
      interpretation: P('Interpretation (programs & tours)', '🗺️', 'Campfire talks, junior rangers and a lot of questions.', { stress: 1 }),
      lawEnforcement: P('Law-enforcement ranger', '🚓', 'Visitor protection: DUIs, thefts, assaults in the backcountry.', { stress: 4 }),
      sar: P('Search & rescue', '🧗', 'Lost hikers, falls and the canyon in July.', { stress: 5, years: 2 }),
      fire: P('Fire management', '🔥', 'Prescribed burns and wildfire season.', { stress: 4 }),
    },
    calls: [
      C('lost', '🥾', 'Overdue Hiker', 'A solo hiker is a day overdue in the backcountry; a storm is coming.', [
        { id: 'hasty', label: '🏃 Lead a hasty team in before the storm', check: 50, weights: { fitness: 2, smarts: 1 }, text: 'You found her with a broken ankle at dusk and carried her out.', perf: 7, commend: 0.5, fail: { text: 'The storm drove the team back. She was found alive two days later.', perf: 1, stress: 5 } },
        { id: 'wait', label: '🚁 Wait for the helicopter in the morning', text: 'The helicopter found her at first light, hypothermic but alive.', perf: 3 },
      ]),
      C('bison', '🦬', 'Tourists and a Bison', 'Tourists are walking up to a bison for a selfie.', [
        { id: 'clear', label: '📢 Clear them back calmly', check: 30, text: 'Everyone got their photo from 25 yards.', perf: 2, fail: { text: 'The bison charged. A tourist was tossed; she lived.', perf: -1 } },
        { id: 'cite', label: '📝 Cite them all', text: 'Angry tourists, an untouched bison.', perf: 1, complaint: 0.3 },
      ]),
    ],
  },
  airTrafficControl: {
    label: 'On Position', icon: '🗼', unit: 'aircraft handled', volume: [20000, 60000], weights: { smarts: 3 },
    posts: {
      tower: P('Tower (local & ground)', '🗼', 'Runways, taxiways and what you can see out the window.', { stress: 4 }),
      tracon: P('Approach control (TRACON)', '📡', 'Sequencing arrivals into a busy hub on radar.', { stress: 6, pay: 1.06, years: 1 }),
      center: P('En-route center', '🌐', 'Jets at altitude across several states.', { stress: 5, pay: 1.05, years: 1 }),
      oji: P('On-the-job training instructor', '🎓', 'Train developmentals to certification.', { stress: 3, pay: 1.04, years: 4, rate: 0.7 }),
    },
    calls: [
      C('incursion', '🛬', 'Runway Incursion', 'A regional jet is taxiing onto the runway you just cleared a 737 to land on.', [
        { id: 'goaround', label: '📻 Send the 737 around — now', check: 45, text: 'Go-around at 300 feet. The investigation praised your call.', perf: 6, commend: 0.6, fail: { text: 'You caught it late; they missed by 200 feet. A near-miss report with your name on it.', perf: -4, trauma: 6 } },
        { id: 'hold', label: '🛑 Order the regional jet to stop', text: 'It stopped short of the runway. Close.', perf: 3, stress: 4 },
      ]),
      C('emergency', '🔥', 'Engine Fire on Departure', 'A departing jet declares an emergency: engine fire, wants to come back.', [
        { id: 'clear', label: '🧹 Clear everything and give them the shortest runway', check: 40, text: 'Back on the ground in eight minutes. Everyone walked off.', perf: 6, commend: 0.5, fail: { text: 'Traffic took too long to clear; the landing was hairy but safe.', perf: 1 } },
      ]),
      C('fatigue', '😴', 'The Rattler Schedule', 'Your rotation has you on a midnight shift eight hours after a day shift. You\'re exhausted.', [
        { id: 'fatigue', label: '🛌 Call in fatigued', text: 'The program protected you. The shift was short-handed.', perf: -1 },
        { id: 'work', label: '☕ Work it', text: 'Coffee and willpower.', stress: 6, risk: { chance: 0.2, text: 'You nodded off on position for a few seconds. Nobody noticed — this time.', stress: 6 } },
      ]),
    ],
  },
};

const config = (job) => SHIFT_CAREERS[job?.professionId];
export const isShiftCareer = (job) => Boolean(config(job));
/** The decks a call can come from, every shift-and-incident career. */
const allCalls = () => Object.values(SHIFT_CAREERS).flatMap((c) => c.calls);

export function postEligibility(state, id) {
  const job = state.career.job;
  const p = config(job)?.posts[id];
  if (!p) return { ok: false, reason: 'Not a post here' };
  if ((job.yearsAtEmployer ?? 0) < p.years) return { ok: false, reason: `${p.years} year${p.years > 1 ? 's' : ''} on the job first` };
  if (yearlyCount(state, 'shiftWork.post')) return { ok: false, reason: 'One bid a year' };
  return { ok: true };
}

export function shiftView(state) {
  const job = state.career.job;
  const cfg = config(job);
  const rec = peekLife(state, 'shiftWork');
  if (!cfg) return null;
  const post = cfg.posts[rec?.professionId === job.professionId ? rec.post : null] ?? Object.values(cfg.posts)[0];
  return { cfg, rec, post, postId: rec?.post ?? Object.keys(cfg.posts)[0] };
}

export const ShiftWorkModule = {
  id: 'shiftWork',
  order: 31.2,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const cfg = config(job);
    if (!cfg || state.legal.incarceration) return;
    const rec = lifeOf(state, 'shiftWork', job.professionId, { post: Object.keys(cfg.posts)[0], handled: 0, years: 0 });
    const post = cfg.posts[rec.post] ?? Object.values(cfg.posts)[0];
    rec.years += 1;
    const n = Math.round(rng.int(cfg.volume[0], cfg.volume[1]) * post.rate);
    rec.handled += n;
    ctx.stat('stress', post.stress);
    if (post.pay > 1) ctx.earn(Math.round(job.salary * (post.pay - 1)), `${post.name} differential`, { wage: true });
    // Reputation drifts with performance; complaints pile up into discipline.
    rec.rep = Math.round(clamp(rec.rep + (job.performance - 55) / 10, 0, 100));
    if (rec.complaints >= 3) {
      rec.complaints = 0;
      applyFx(ctx, rec, { text: 'Three complaints in your file: a formal reprimand and a performance plan.', perf: -10, stress: 5 }, cfg.icon);
    }
    if (rec.commendations >= 3 && rng.chance(0.3)) {
      rec.commendations = 0;
      applyFx(ctx, rec, { text: `You were named employee of the year — ${n.toLocaleString()} ${cfg.unit} and the calls people remember.`, perf: 5, honor: { id: `shift.${job.professionId}.eoy`, name: 'Employee of the Year', icon: '⭐' } }, '⭐');
    }
    if (rng.chance(0.7 * Math.min(1.3, post.rate)) && !state.prompts.some((p) => p.type === 'shiftWork.call')) {
      const c = rng.pick(cfg.calls);
      ctx.prompt({ type: 'shiftWork.call', icon: c.icon, title: c.title, text: c.text, options: promptOptions(c.options), data: { callId: c.id, professionId: job.professionId } });
    }
  },
  actions: {
    post(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      const cfg = config(job);
      const ok = postEligibility(state, id);
      if (!cfg || !ok.ok) return ctx.toast(ok.reason ?? 'Not available', 'warn');
      bumpYearly(state, 'shiftWork.post');
      const rec = lifeOf(state, 'shiftWork', job.professionId, { post: id, handled: 0, years: 0 });
      rec.post = id;
      ctx.log(`You bid onto ${cfg.posts[id].name.toLowerCase()}. ${cfg.posts[id].desc}`, cfg.posts[id].icon);
      return undefined;
    },
  },
  resolvers: {
    call(ctx, data, optionId) {
      const job = ctx.state.career.job;
      const cfg = SHIFT_CAREERS[data.professionId];
      const c = (cfg?.calls ?? allCalls()).find((x) => x.id === data.callId);
      if (!c || !job) return;
      const rec = lifeOf(ctx.state, 'shiftWork', job.professionId, { post: Object.keys(cfg.posts)[0], handled: 0, years: 0 });
      resolveOption(ctx, rec, c.options.find((o) => o.id === optionId), c.icon, cfg.weights);
    },
  },
};
