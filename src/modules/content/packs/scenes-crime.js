/**
 * Crime, end to end (played by career/Scenes.js):
 *
 *   crime.heist        the big job: the pitch, the night, what goes wrong, the getaway. The take,
 *                      the heat and a case that may open later. For people with a name on the
 *                      street or a place in an outfit. Scores: lives = nobody hurt, crew = your
 *                      crew, city = the take, trust = staying off the radar.
 *   prison.riot        the block goes up: protect a cornered officer, keep your head down, or join.
 *   prison.yard        a shot caller wants a favour you can't easily refuse.
 *   detective.murder   a murder on your desk: the scene, the suspects, the interview room, the
 *                      boss who wants an arrest by Friday. Coerced confessions and the wrong man
 *                      come back to haunt you.
 */
import { addRecord } from '../../../core/State.js';
import { clamp } from '../../../core/Random.js';
import { commitOffense } from '../../legal/JusticeSystem.js';
import { crimeOf } from '../../legal/StreetCrime.js';
import { meOf } from '../../legal/Underworld.js';
import { isCop } from '../../publicsafety/PoliceLife.js';
import { yearNow } from '../../world/Eras.js';
import { priceLevel } from '../../world/Countries.js';

const PLACES = ['the high street', 'the docks', 'the old town', 'the business district', 'the ring road', 'the riverside'];
const HEISTS_OLD = [
  { kind: 'strongroom', name: 'the bank\'s strongroom', take: [8000, 40000] },
  { kind: 'mailTrain', name: 'the night mail train', take: [15000, 60000] },
  { kind: 'jeweller', name: 'the jeweller\'s on {place}', take: [5000, 25000] },
];
const HEISTS = [
  { kind: 'jeweller', name: 'the jeweller\'s on {place}', take: [20000, 90000] },
  { kind: 'armoured', name: 'an armoured cash van', take: [40000, 180000] },
  { kind: 'warehouse', name: 'a bonded warehouse full of cigarettes and phones', take: [25000, 120000] },
  { kind: 'countRoom', name: 'the casino count room', take: [60000, 250000] },
];

const streetName = (s) => {
  const c = s.legal?.crime;
  return c ? Object.values(c.skill ?? {}).reduce((a, b) => a + b, 0) + Math.floor((c.rep ?? 0) / 10) : 0;
};

const heist = {
  id: 'crime.heist', title: 'The Job', icon: '💼', chance: 0.3, weight: 3, trauma: 3, noJob: true, work: false, inquiry: false, honorChance: 0, circle: 'underworld',
  news: { outstanding: 'Police baffled by raid on {name}', bad: 'Gang caught red-handed at {name}' },
  for: (s) => s.character.age >= 18 && s.character.age <= 65 && !s.underworld?.witsec && (Boolean(meOf(s)) || streetName(s) >= 3),
  data: (s, rng) => {
    const place = rng.pick(PLACES);
    const h = rng.pick(yearNow(s) < 1920 ? HEISTS_OLD : HEISTS);
    return { place, kind: h.kind, name: h.name.replace('{place}', place), take: Math.round(rng.int(...h.take) * priceLevel(s)) };
  },
  start: 'pitch',
  steps: {
    pitch: { title: 'The Pitch', icon: '🗺️', text: (d) => `Someone you trust (mostly) has a job: ${d.name}. An inside tip, a way in, a crew of four. Your cut could be life-changing.`, options: [
      { id: 'plan', label: '📐 Plan it properly: weeks of watching', check: { skills: ['leadership', 'investigation'], stats: { smarts: 1 }, bar: 50 },
        pass: { text: 'Six weeks of watching. You know the guard changes, the cameras\' blind spots and when the cash is heaviest.', score: { crew: 1, city: 1, trust: 1 } },
        fail: { text: 'You watched for weeks, and missed the new camera over the back door.', score: { trust: -1 } }, next: 'night' },
      { id: 'tonight', label: '⚡ The tip is hot. Go tonight', hint: 'Fast money, little planning', score: { city: 1, trust: -1 }, next: 'night' },
      { id: 'walk', label: '🚶 Walk away from it', flag: 'walked' },
    ] },
    night: { title: 'The Night', icon: '🌒', text: '{name}, a few minutes after two. The street is empty. Your hands are steady, nearly.', options: [
      { id: 'alarm', label: '🔌 Kill the alarm quietly', check: { skills: ['electrical', 'mechanics'], bar: 55 },
        pass: { text: 'The panel went dark without a sound.', score: { trust: 2 } }, fail: { text: 'Somewhere a relay clicked. You can\'t be sure it didn\'t call out.', score: { trust: -1 } }, next: 'complication' },
      { id: 'force', label: '🔨 Go in hard and fast', hint: 'Loud, quick, frightening', score: { city: 2, lives: -1, trust: -2 }, next: 'complication' },
    ] },
    getaway: { title: 'The Getaway', icon: '🚗', text: 'Bags in the boot. Somewhere, sirens. Your driver looks at you.', options: [
      { id: 'drive', label: '🏎️ Drive. Back roads, lights off', check: { skills: ['driving'], stats: { smarts: 1 }, bar: 50 },
        pass: { text: 'You lost them at the level crossing and swapped cars in a lock-up.', score: { trust: 2, crew: 1 } }, fail: { text: 'A patrol car got your plate before you lost it.', score: { trust: -2 } }, next: 'split' },
      { id: 'scatter', label: '👣 Split up on foot', score: { crew: -1, trust: 1, city: -1 }, next: 'split' },
    ] },
    split: { title: 'The Split', icon: '💰', text: 'A back room, the money on the table, four people who know what the others did.', options: [
      { id: 'fair', label: '🤝 An even split, and nobody spends big for a year', score: { crew: 2, trust: 1 } },
      { id: 'more', label: '😏 Take the lion\'s share. It was your job', score: { city: 1, crew: -2 }, flag: 'greedy' },
      { id: 'flash', label: '💎 Even split — and a new car', score: { trust: -2, crew: 1 } },
    ] },
  },
  complications: {
    guard: { title: 'The Guard', icon: '👮', text: 'A night guard who shouldn\'t be there. He\'s older than you expected, and very frightened.', options: [
      { id: 'tie', label: '🪢 Tie him up gently, tell him it\'s not his money', score: { lives: 2 }, next: 'getaway' },
      { id: 'hit', label: '👊 Put him down before he reaches the button', score: { lives: -3, trust: 1 }, flag: 'violence', next: 'getaway' },
    ] },
    silent: { title: 'The Silent Alarm', icon: '🚨', text: 'Your lookout on the radio: two cars, no lights, coming slow. You\'re halfway through.', options: [
      { id: 'grab', label: '🎒 Grab what you\'ve got and go', score: { city: -2, trust: 2 }, next: 'getaway' },
      { id: 'finish', label: '⏱️ Ninety more seconds', check: { stats: { smarts: 1 }, bar: 55 },
        pass: { text: 'Ninety seconds, then out the back as the first car turned in.', score: { city: 2 } }, fail: { text: 'Ninety seconds was too long. Blue lights in the window.', score: { trust: -3, crew: -1 } }, next: 'getaway' },
    ] },
    panic: { title: 'The New Kid', icon: '😰', text: 'The youngest of the crew freezes, then starts talking about his mum, loudly.', options: [
      { id: 'calm', label: '🫱 Calm him down, keep him close', check: { skills: ['leadership', 'persuasion'], bar: 50 },
        pass: { text: 'He got it together. He\'ll owe you forever.', score: { crew: 2 } }, fail: { text: 'He bolted, and dropped his phone on the way.', score: { crew: -1, trust: -2 } }, next: 'getaway' },
      { id: 'send', label: '🚪 Send him home now', score: { crew: -1, city: -1 }, flag: 'looseEnd', next: 'getaway' },
    ] },
  },
  outcome: (sc, tier, s) => {
    if (sc.flags.includes('walked')) return { text: `You passed on ${sc.data.name}. Some jobs you hear about in the papers; this one you didn't.`, effects: () => {} };
    const share = { outstanding: 0.4, good: 0.3, mixed: 0.15, bad: 0 }[tier] * (sc.flags.includes('greedy') ? 1.5 : 1);
    const take = Math.round(sc.data.take * share);
    const offenseId = sc.flags.includes('violence') ? 'armedRobbery' : 'grandTheft';
    return {
      text: {
        outstanding: `${sc.data.name[0].toUpperCase()}${sc.data.name.slice(1)}: clean in, clean out. The papers are calling it the job of the decade.`,
        good: `You got away with ${sc.data.name}. The money is real; so is the case file the police just opened.`,
        mixed: `${sc.data.name[0].toUpperCase()}${sc.data.name.slice(1)} went half-right. A thin take and a lot of loose ends.`,
        bad: `It all came apart at ${sc.data.name}.`,
      }[tier],
      rep: tier === 'outstanding' ? 6 : tier === 'bad' ? -4 : 0,
      effects: (ctx) => {
        const c = crimeOf(s);
        c.heat = clamp(c.heat + { outstanding: 10, good: 20, mixed: 30, bad: 40 }[tier] + (sc.flags.includes('violence') ? 15 : 0), 0, 100);
        c.skill.heist = (c.skill.heist ?? 0) + 1;
        c.rep = clamp((c.rep ?? 0) + (tier === 'bad' ? 1 : 4), 0, 100);
        const me = meOf(s);
        if (me && tier !== 'bad') me.respect = Math.min(100, me.respect + (tier === 'outstanding' ? 10 : 4));
        if (tier === 'bad') return void commitOffense(ctx, { offenseId, caught: true, context: `the raid on ${sc.data.name}`, evidence: 0.85 });
        if (take > 0) {
          c.earned += take;
          c.dirty = (c.dirty ?? 0) + take;
          ctx.earn(take, 'Undisclosed income', { informal: true });
          ctx.log(`Your cut: $${take.toLocaleString()}, in used notes.`, '💰', 'warn');
        }
        const discovery = { outstanding: 0.05, good: 0.15, mixed: 0.35 }[tier] + (sc.flags.includes('looseEnd') ? 0.15 : 0);
        commitOffense(ctx, { offenseId, context: `the raid on ${sc.data.name}`, discovery, evidence: sc.flags.includes('violence') ? 0.8 : 0.65 });
      },
    };
  },
  tiers: { outstanding: '', good: '', mixed: '', bad: '' },
};

const serving = (s) => {
  const inc = s.legal?.incarceration;
  return Boolean(inc) && !inc.deathRow && inc.kind !== 'juvenile';
};

const riot = {
  id: 'prison.riot', title: 'The Riot', icon: '🔥', chance: 0.15, weight: 1, inPrison: true, work: false, inquiry: false, honorChance: 0, trauma: 8, circle: 'underworld',
  for: (s) => serving(s),
  start: 'start',
  steps: {
    start: { title: 'The Block Goes Up', icon: '🔥', text: 'A fight in the chow hall becomes two hundred men. Mattresses burning, the officers pulled back behind the gate, all but one — a young officer, cornered by the laundry.', options: [
      { id: 'protect', label: '🛡️ Get between him and the crowd', check: { skills: ['combat'], stats: { fitness: 1 }, bar: 55 },
        pass: { text: 'You and two old-timers walked him out to the gate. Nobody touched him.', score: { lives: 3, trust: 1 }, flag: 'savedGuard' },
        fail: { text: 'You got him to the gate, and took a pipe across the shoulders for it.', score: { lives: 2, crew: -2 }, flag: 'savedGuard' }, next: 'complication' },
      { id: 'cell', label: '🚪 Back in your cell, door pulled to', score: { crew: 2, lives: -1 }, next: 'complication' },
      { id: 'join', label: '🔥 Years of this. Join in', score: { city: -2, crew: -1, trust: 1 }, flag: 'rioted', next: 'complication' },
    ] },
  },
  complications: {
    retake: { title: 'The Retake', icon: '🪖', text: 'Dawn. The tactical team comes in with shields and gas, and they aren\'t asking who did what.', options: [
      { id: 'down', label: '🙇 Face down, hands on your head', score: { crew: 2 } },
      { id: 'hold', label: '🧱 Hold the line with the others', score: { crew: -3, trust: 2 }, flag: 'rioted' },
    ] },
    fire: { title: 'Smoke', icon: '💨', text: 'The fire has reached the upper tier. Men are coughing behind locked cell doors.', options: [
      { id: 'keys', label: '🗝️ Take the dropped keys and open the cells', score: { lives: 3, crew: -1 }, flag: 'savedLives' },
      { id: 'low', label: '🫁 Stay low and wait it out', score: { crew: 1, lives: -2 } },
    ] },
  },
  outcome: (sc, tier, s) => ({
    text: sc.flags.includes('savedGuard') || sc.flags.includes('savedLives')
      ? 'When the inquiry came, the officers named you. The warden wrote to the parole board himself.'
      : sc.flags.includes('rioted') ? 'They went through the camera footage frame by frame. You were in a lot of frames.' : 'You came through the riot in one piece. Some didn\'t.',
    effects: () => {
      const inc = s.legal.incarceration;
      if (!inc) return;
      if (sc.flags.includes('savedGuard') || sc.flags.includes('savedLives')) {
        inc.goodBehavior = (inc.goodBehavior ?? 0) + 4;
        if (inc.yearsLeft > 1) inc.yearsLeft -= 1;
      }
      if (sc.flags.includes('rioted')) {
        inc.goodBehavior = Math.max(0, (inc.goodBehavior ?? 0) - 4);
        inc.yearsLeft += 2; inc.total += 2;
        addRecord(s, { offenseId: 'riot', name: 'Riot (in Custody)', severity: 'felony', age: s.character.age, sentence: '2 yr added' });
      }
    },
  }),
  tiers: { outstanding: '', good: '', mixed: '', bad: '' },
};

const yard = {
  id: 'prison.yard', title: 'The Yard', icon: '🏋️', chance: 0.3, weight: 2, inPrison: true, work: false, inquiry: false, honorChance: 0, trauma: 4, circle: 'underworld',
  for: (s) => serving(s),
  start: 'ask',
  steps: {
    ask: { title: 'The Shot Caller', icon: '🏋️', text: 'The man who runs the yard sends for you. He wants a package held in your cell, and a message delivered to a man on B wing. "Nothing heavy," he says.', options: [
      { id: 'yes', label: '📦 Do it. You have to live here', score: { crew: 2, trust: -1 }, flag: 'joined', next: 'complication' },
      { id: 'no', label: '🙅 Politely, no', check: { skills: ['persuasion', 'combat'], bar: 50 },
        pass: { text: 'He looked at you a long time, then laughed. "Respect." He leaves you alone now.', score: { crew: 2, trust: 2 } },
        fail: { text: 'Three men caught you in the showers the next week.', score: { crew: -3 } } },
      { id: 'officer', label: '🗣️ Tell an officer, quietly', score: { trust: 2, crew: -2 }, flag: 'talked', next: 'complication' },
    ] },
  },
  complications: {
    search: { title: 'Cell Search', icon: '🔦', text: 'Officers are tossing cells on your tier. Yours is three away.', options: [
      { id: 'flush', label: '🚽 Get rid of anything you\'re holding', score: { crew: -1, trust: 1 } },
      { id: 'sit', label: '🪑 Sit tight', check: { stats: { smarts: 1 }, bar: 50 }, pass: { text: 'They walked past your cell.', score: { trust: 1 } }, fail: { text: 'They found what they were looking for.', score: { trust: -3 }, flag: 'caught' } },
    ] },
    message: { title: 'B Wing', icon: '✉️', text: 'The message is a warning, and the man on B wing doesn\'t take it well.', options: [
      { id: 'walk', label: '🚶 Deliver it and walk away', score: { crew: 1 } },
      { id: 'fight', label: '👊 Stand your ground', score: { crew: -2, trust: -1 }, flag: 'fought' },
    ] },
  },
  outcome: (sc, tier, s) => ({
    text: sc.flags.includes('caught') ? 'A write-up, solitary, and time added. The shot caller sent cigarettes, which is a kind of thanks.'
      : sc.flags.includes('talked') ? (tier === 'bad' ? 'Somebody saw you talking to the officer. Word travels on a tier.' : 'The package was found in a sweep nobody connected to you.')
      : sc.flags.includes('joined') ? 'You\'re one of his now. That keeps you safe, mostly, and costs you at every parole hearing.' : 'You did your own time.',
    effects: (ctx) => {
      const inc = s.legal.incarceration;
      if (!inc) return;
      if (sc.flags.includes('joined')) inc.gang = true;
      if (sc.flags.includes('caught')) { inc.goodBehavior = Math.max(0, (inc.goodBehavior ?? 0) - 3); inc.yearsLeft += 1; inc.total += 1; }
      if (sc.flags.includes('talked')) inc.goodBehavior = (inc.goodBehavior ?? 0) + 2;
      if (sc.flags.includes('talked') && tier === 'bad') ctx.stat('health', -15);
    },
  }),
  tiers: { outstanding: '', good: '', mixed: '', bad: '' },
};

const DETECTIVE = /detective|investigat|inspector|agent|\bCID\b/i;
const VICTIMS = ['a nurse found in her flat', 'a bookmaker shot in his car', 'a student pulled from the canal', 'a pensioner in a burgled bungalow', 'a security guard at the depot'];

const murder = {
  id: 'detective.murder', title: 'The Murder Case', icon: '🕵️', chance: 0.4, weight: 3, partner: true, trauma: 7, honor: 'Commissioner\'s Commendation', honorChance: 0.7,
  inquiryText: 'Professional standards want to review the investigation.',
  news: { outstanding: 'Detective cracks the {place} murder', bad: '{place} murder conviction collapses' },
  for: (s, job) => (isCop(job) || ['fbi', 'dea'].includes(job?.professionId)) && DETECTIVE.test(job?.title ?? ''),
  data: (s, rng) => ({ place: rng.pick(PLACES), name: rng.pick(VICTIMS), severity: 2 }),
  start: 'scene',
  steps: {
    scene: { title: 'The Scene', icon: '🧤', text: (d) => `The victim: ${d.name}, near ${d.place}. Uniform has kept the scene, mostly. {partner} hands you gloves.`, options: [
      { id: 'forensic', label: '🔬 Slow and forensic: every fibre, every print', check: { skills: ['investigation', 'research'], bar: 50 },
        pass: { text: 'A partial print on the inside of the door frame. Somebody was careless.', score: { lives: 2 }, flag: 'print' }, fail: { text: 'The scene had been walked through too many times. Nothing usable.', score: { lives: -1 } }, next: 'suspects' },
      { id: 'canvass', label: '🚪 Canvass the street while memories are fresh', check: { skills: ['persuasion'], bar: 45 },
        pass: { text: 'A neighbour saw a car she didn\'t know, twice that week.', score: { lives: 1, trust: 1 }, flag: 'witness' }, fail: { text: 'Nobody saw a thing.', score: {} }, next: 'suspects' },
    ] },
    suspects: { title: 'The Suspects', icon: '🧩', text: 'Three names on the whiteboard: the ex with a temper, the business partner with debts, the neighbour with a record.', options: [
      { id: 'money', label: '💷 Follow the money', check: { skills: ['finance', 'data', 'investigation'], bar: 55 },
        pass: { text: 'The partner took out a policy on the victim six weeks ago.', score: { lives: 2 }, flag: 'motive' }, fail: { text: 'The accounts are a maze. Weeks gone.', score: { lives: -1 } }, next: 'interview' },
      { id: 'record', label: '📁 The neighbour with the record', hint: 'The obvious one', score: { trust: -1 }, flag: 'obvious', next: 'interview' },
      { id: 'ex', label: '💔 The ex', score: { lives: 0 }, next: 'interview' },
    ] },
    interview: { title: 'The Interview Room', icon: '🎙️', text: 'Your suspect, a solicitor and a tape recorder. Two hours on the clock.', options: [
      { id: 'rapport', label: '🫖 Build rapport, let them talk', check: { skills: ['persuasion', 'investigation'], bar: 55 },
        pass: { text: 'Ninety minutes in, the story changed. Then it fell apart.', score: { lives: 2, trust: 1 } }, fail: { text: '"No comment," to every question.', score: { lives: -1 } }, next: 'complication' },
      { id: 'evidence', label: '📂 Put the evidence on the table', when: (s, sc) => sc.flags.some((f) => ['print', 'witness', 'motive'].includes(f)), score: { lives: 2 }, next: 'complication' },
      { id: 'lean', label: '😠 Lean on them hard. Off the tape, if need be', tone: 'danger', score: { lives: 1, trust: -3 }, flag: 'coerced', next: 'complication' },
    ] },
  },
  complications: {
    boss: { title: 'The Superintendent', icon: '📞', text: 'The press are camped outside and the boss wants a charge by Friday.', options: [
      { id: 'charge', label: '⚖️ Charge who you\'ve got', score: { trust: 1, lives: -1 }, flag: 'rushed' },
      { id: 'hold', label: '🧱 "When the case is ready, sir"', check: { skills: ['leadership'], bar: 50 }, pass: { text: 'He gave you two more weeks. You used them.', score: { lives: 2 } }, fail: { text: 'You held out, and the case was handed to a DCI from headquarters.', score: { trust: -2 } } },
    ] },
    recant: { title: 'The Witness', icon: '😟', text: 'Your key witness has stopped answering the door. Someone has visited her.', options: [
      { id: 'protect', label: '🛡️ Get her protection and a new address', score: { lives: 2, city: -1 } },
      { id: 'without', label: '📁 Build the case without her', check: { skills: ['investigation'], bar: 60 }, pass: { text: 'The phone data was enough on its own.', score: { lives: 1 } }, fail: { text: 'Without her the case is thin.', score: { lives: -2 } } },
    ] },
    leak: { title: 'The Leak', icon: '📰', text: 'Details only the killer would know are on the front page. Somebody in your team talked.', options: [
      { id: 'find', label: '🔍 Find the leak', score: { trust: 1, crew: -1 } },
      { id: 'useit', label: '🎣 Use it: feed a false detail and see who repeats it', check: { stats: { smarts: 1 }, bar: 55 }, pass: { text: 'Your suspect repeated the false detail in a phone call. Got him.', score: { lives: 3 } }, fail: { text: 'Nobody bit.', score: {} } },
    ] },
  },
  outcome: (sc, tier, s) => {
    const cl = (s.careerLife ??= {});
    const wrongMan = sc.flags.includes('obvious') && (sc.flags.includes('rushed') || sc.flags.includes('coerced')) && tier !== 'outstanding';
    if (wrongMan) return { text: 'You charged the neighbour with the record. Years later, the DNA said it was somebody else. He is suing the force; you are named in it.', rep: -6, effects: (ctx) => { const j = s.career.job; if (j) j.warnings = (j.warnings ?? 0) + 2; cl.wrongful = (cl.wrongful ?? 0) + 1; ctx.stat('stress', 10); } };
    if (sc.flags.includes('coerced') && tier !== 'outstanding') return { text: 'The confession was ruled inadmissible: oppressive questioning. The case collapsed at trial.', effects: () => { const j = s.career.job; if (j) j.warnings = (j.warnings ?? 0) + 1; } };
    return {
      text: { outstanding: 'Guilty, unanimously. The family hugged you on the court steps.', good: 'Charged and convicted. Another file in the cleared drawer.', mixed: 'Charged, but the jury couldn\'t agree. The retrial is next year.', bad: 'No charge. The case went into the cold-case cabinet with your name on it.' }[tier],
      effects: () => { if (tier === 'outstanding' || tier === 'good') cl.cleared = (cl.cleared ?? 0) + 1; },
    };
  },
  tiers: { outstanding: '', good: '', mixed: '', bad: '' },
};

export const CRIME_SCENES = [heist, riot, yard, murder];
