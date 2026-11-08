/**
 * Scenes for the other careers (played by career/Scenes.js): the shifts and cases people
 * remember. Same shape as scenes-emergency.js.
 *
 *   medicine    med.er (a night in the emergency department), med.surgery (the operation)
 *   nursing     nurse.night (the ward at 3 a.m.)
 *   law         law.trial (a jury trial, from opening to verdict)
 *   teaching    teach.class (the class nobody else can handle)
 *   aviation    pilot.engine (an engine failure after take-off)
 *   journalism  press.leak (a source with documents)
 *   business    exec.takeover (a hostile bid for your company)
 *   service     mil.patrol (a patrol that runs into an ambush; active duty, no civilian job)
 */
import { yearNow } from '../../world/Eras.js';
const is = (...ids) => (job) => ids.includes(job?.professionId);
const SENIOR = (job) => (job?.grade ?? 0) >= 7 || job?.abilities?.includes('exec');
const NAMES = ['Maria', 'Tom', 'Aisha', 'Daniel', 'Grace', 'Omar', 'Lena', 'Sam'];

const er = {
  id: 'med.er', title: 'Night Shift in the ER', icon: '🏥', chance: 0.4, trauma: 4, honor: 'Hospital Award for Clinical Excellence', inquiry: true,
  inquiryText: 'The case is going to the hospital\'s morbidity and mortality review.',
  for: (s, job) => is('medical', 'physicianAssistant')(job),
  data: (s, rng) => ({ name: rng.pick(NAMES) }),
  start: 'triage',
  steps: {
    triage: { title: 'Three at Once', icon: '🚑', text: 'Three ambulances arrive in four minutes: a man with chest pain, a child who swallowed something, and {name}, a teenager from a car crash who keeps saying she\'s fine.', options: [
      { id: 'chest', label: '🫀 The chest pain first', hint: 'Time is muscle', score: { lives: 1 }, next: 'crash' },
      { id: 'crashkid', label: '🚗 The crash victim — "fine" is a warning sign', check: { skills: ['medicine'], stats: { smarts: 1 }, bar: 55 },
        pass: { text: 'Her belly was rigid. A ruptured spleen, caught early.', score: { lives: 2 } }, fail: { text: 'She really was fine. The chest pain waited too long.', score: { lives: -1 } }, next: 'crash' },
    ] },
    crash: { title: 'Crashing', icon: '📉', text: 'Bed four is crashing: pressure falling, heart racing, and the notes don\'t match what you\'re seeing.', options: [
      { id: 'think', label: '🧠 Stop. Think. Go back to first principles', check: { skills: ['medicine'], stats: { smarts: 1 }, bar: 60 },
        pass: { text: 'An allergic reaction to a drug given in triage. You turned it around in minutes.', score: { lives: 2, trust: 1 } }, fail: { text: 'You chased the wrong diagnosis for twenty minutes.', score: { lives: -2 } }, next: 'family' },
      { id: 'senior', label: '📞 Call the consultant at home', score: { lives: 1, trust: 1 }, next: 'family' },
    ] },
    family: { title: 'The Relatives\' Room', icon: '🚪', text: 'A family is waiting in the relatives\' room. The news isn\'t good.', options: [
      { id: 'honest', label: '🫂 Sit down, use plain words, give them time', score: { trust: 2 } },
      { id: 'quick', label: '⏱️ Be quick — the waiting room is full', score: { trust: -1, lives: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'Everyone who came through your doors that night went home or upstairs. The nurses still talk about it.',
    good: 'A hard night in the ER, and you did right by most of them.',
    mixed: 'You got through the night. Not everyone did.',
    bad: 'A patient died that night who shouldn\'t have. The review will want to know why.',
  },
};

const surgery = {
  id: 'med.surgery', title: 'The Operation', icon: '🔪', chance: 0.4, trauma: 4, honor: 'Distinguished Surgeon Award',
  inquiryText: 'The operation is going to the surgical review committee.',
  for: (s, job) => is('medical')(job) && /surg/i.test(job.title ?? ''),
  data: (s, rng) => ({ name: rng.pick(NAMES) }),
  start: 'open',
  steps: {
    open: { title: 'Opening Up', icon: '🩻', text: 'A routine operation on {name}. Then the scans turn out to be wrong: the tumour is wrapped round a major artery.', options: [
      { id: 'proceed', label: '✂️ Carry on and take it all', hint: 'Cure, or catastrophe', tone: 'danger', check: { skills: ['medicine'], stats: { smarts: 1, fitness: 1 }, bar: 65 },
        pass: { text: 'Four hours, millimetre by millimetre. Clear margins.', score: { lives: 3 } }, fail: { text: 'The artery tore. Blood everywhere.', score: { lives: -2 }, next: 'bleed' }, next: 'close' },
      { id: 'partial', label: '🩹 Take what\'s safe, close, refer on', score: { lives: 1, trust: 1 }, next: 'close' },
    ] },
    bleed: { title: 'Bleeding', icon: '🩸', text: 'The anaesthetist is calling out falling numbers. The scrub nurse is looking at you.', options: [
      { id: 'clamp', label: '🗜️ Clamp and repair it yourself', check: { skills: ['medicine'], stats: { fitness: 1 }, bar: 60 },
        pass: { text: 'Clamp, suture, release. It held.', score: { lives: 2 } }, fail: { text: 'You couldn\'t stop it in time.', score: { lives: -3 } }, next: 'close' },
      { id: 'vascular', label: '📟 Call the vascular surgeon in', score: { lives: 1 }, next: 'close' },
    ] },
    close: { title: 'Afterwards', icon: '🧤', text: '{name}\'s family is waiting outside theatre.', options: [
      { id: 'truth', label: '🗣️ Tell them exactly what happened', score: { trust: 2 } },
      { id: 'soft', label: '🙂 "It went as well as we could hope"', score: { trust: -1 } },
    ] },
  },
  tiers: {
    outstanding: '{name} went home cancer-free. You still have the card they sent.',
    good: '{name} came through the operation, and so did you.',
    mixed: 'The operation on {name} did what it could.',
    bad: '{name} died on your table.',
  },
};

const night = {
  id: 'nurse.night', title: 'The Ward at 3 A.M.', icon: '🌙', chance: 0.4, trauma: 3, honor: 'Nurse of the Year', inquiry: false,
  for: (s, job) => is('nursing', 'travelNursing')(job),
  data: (s, rng) => ({ name: rng.pick(NAMES) }),
  start: 'round',
  steps: {
    round: { title: 'Two Nurses, Thirty Beds', icon: '🛏️', text: 'Half the shift has called in sick. On your round, {name} in bed twelve doesn\'t look right — nothing you could point to, just wrong.', options: [
      { id: 'trust', label: '👁️ Trust your gut: full observations now', check: { skills: ['medicine', 'caregiving'], bar: 45 },
        pass: { text: 'Early sepsis. Antibiotics went in within the hour.', score: { lives: 2 } }, fail: { text: 'Everything was normal. You\'re behind on the round now.', score: {} }, next: 'doctor' },
      { id: 'later', label: '⏳ Note it and come back after the round', score: { lives: -1 }, next: 'doctor' },
    ] },
    doctor: { title: 'The Junior Doctor', icon: '📟', text: 'The junior doctor has written a drug dose that looks ten times too high.', options: [
      { id: 'question', label: '❓ Question it, firmly', score: { lives: 2, trust: 1 }, next: 'dawn' },
      { id: 'give', label: '💉 Give it — they\'re the doctor', tone: 'danger', score: { lives: -3 }, flag: 'misconduct', next: 'dawn' },
    ] },
    dawn: { title: 'Handover', icon: '🌅', text: 'Dawn. You\'re an hour past the end of your shift and the day staff are short too.', options: [
      { id: 'stay', label: '💪 Stay until it\'s covered', score: { lives: 1, crew: -1 } },
      { id: 'go', label: '🏠 Hand over properly and go home', score: { crew: 1 } },
    ] },
  },
  tiers: {
    outstanding: '{name} would have died that night if you hadn\'t looked twice. They never knew, and that\'s nursing.',
    good: 'A hard night, and everyone was still breathing at handover.',
    mixed: 'You got through the shift. You\'ll be back tonight.',
    bad: 'Something was missed on your shift. The incident report has your name on it.',
  },
};

const trial = {
  id: 'law.trial', title: 'The Trial', icon: '⚖️', chance: 0.4, trauma: 2, honor: 'Advocate of the Year', inquiry: false, circle: 'work',
  for: (s, job) => is('law', 'prosecution', 'publicDefender')(job),
  data: (s, rng, job) => ({ name: rng.pick(['Mr Haines', 'Ms Okoro', 'Mr Delgado', 'Ms Price']) }),
  news: { outstanding: 'Jury returns verdict in {name} case after dramatic trial' },
  start: 'opening',
  steps: {
    opening: { title: 'Opening Statement', icon: '🗣️', text: (d, s) => `${s.career.job?.professionId === 'prosecution' ? 'You\'re prosecuting' : 'You\'re defending'} ${d.name}. Twelve strangers are watching you stand up.`, options: [
      { id: 'story', label: '📖 Tell them a story', check: { skills: ['publicSpeaking', 'persuasion'], bar: 50 },
        pass: { text: 'You had them by the end of the first minute.', score: { trust: 2 } }, fail: { text: 'You lost them somewhere in the second page.', score: { trust: -1 } }, next: 'witness' },
      { id: 'facts', label: '📋 Just the facts, carefully', score: { trust: 1 }, next: 'witness' },
    ] },
    witness: { title: 'The Key Witness', icon: '🧑‍⚖️', text: 'The other side\'s key witness is on the stand, calm and convincing. You think they\'re lying.', options: [
      { id: 'break', label: '🎯 Go for the throat on cross-examination', tone: 'danger', check: { skills: ['law', 'persuasion'], stats: { smarts: 1 }, bar: 60 },
        pass: { text: 'Three questions in, the story fell apart in front of the jury.', score: { lives: 2, trust: 2 } }, fail: { text: 'They held firm, and the jury liked them more for it.', score: { lives: -2 } }, next: 'closing' },
      { id: 'docs', label: '📑 Let the documents contradict them', check: { skills: ['law', 'research'], bar: 50 },
        pass: { text: 'You put the email on the screen. The witness went quiet.', score: { lives: 2 } }, fail: { text: 'The judge excluded the documents.', score: { lives: -1 } }, next: 'closing' },
    ] },
    closing: { title: 'Closing', icon: '⏳', text: 'Closing arguments, then the jury goes out. The client wants to know what you think.', options: [
      { id: 'honest', label: '🤞 Tell them it could go either way', score: { trust: 1 } },
      { id: 'promise', label: '😁 Promise them a win', score: { trust: -1 } },
    ] },
  },
  tiers: {
    outstanding: 'The verdict came back your way, and the judge mentioned your cross-examination in the sentencing remarks.',
    good: 'You won the case against {name}\'s side.',
    mixed: 'A hung jury. A retrial next spring.',
    bad: 'You lost, and you\'ll replay the cross-examination for years.',
  },
};

const klass = {
  id: 'teach.class', title: 'The Class Nobody Wants', icon: '🏫', chance: 0.4, trauma: 2, honor: 'Teacher of the Year', inquiry: false,
  for: (s, job) => is('education')(job),
  data: (s, rng) => ({ name: rng.pick(['Jayden', 'Kayla', 'Marcus', 'Bella', 'Liam', 'Zara']) }),
  start: 'first',
  steps: {
    first: { title: 'First Lesson', icon: '📚', text: 'You\'ve been given the class that drove two teachers to quit. Within five minutes, {name} has thrown a chair.', options: [
      { id: 'calm', label: '🧊 Stay calm; talk to {name} outside', check: { skills: ['teaching', 'persuasion'], bar: 50 },
        pass: { text: 'Outside, {name} was shaking. Things at home are very bad.', score: { trust: 2 }, flag: 'reached' }, fail: { text: 'They swore at you and walked off the premises.', score: { trust: -1 } }, next: 'term' },
      { id: 'exclude', label: '🚪 Send them to the head', score: { crew: 1, trust: -1 }, next: 'term' },
    ] },
    term: { title: 'Mid-Term', icon: '📈', text: 'The class is behind. The head wants test results; the students want someone who\'ll stick around.', options: [
      { id: 'teach', label: '🎯 Teach to the test', score: { city: 2, trust: -1 }, next: 'exam' },
      { id: 'project', label: '🛠️ A project they actually care about', check: { skills: ['teaching'], stats: { smarts: 1 }, bar: 50 },
        pass: { text: 'They built a radio station. Attendance went to ninety per cent.', score: { trust: 2, lives: 1 } }, fail: { text: 'Chaos. Fun chaos, but chaos.', score: { city: -1 } }, next: 'exam' },
    ] },
    exam: { title: 'Exam Day', icon: '📝', text: (d, s, sc) => `Exam day. ${'{name}'} turns up — on time, with a pencil.`, options: [
      { id: 'cheer', label: '🙌 Tell them you\'re proud of them', score: { trust: 2 } },
      { id: 'focus', label: '🤫 Just a nod — don\'t make it a thing', score: { trust: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'The class nobody wanted got the best results in the school. {name} came back years later to tell you.',
    good: 'You turned the class around, mostly.',
    mixed: 'You survived the year with the class. That counts.',
    bad: 'The class beat you, and you started looking at jobs outside teaching.',
  },
};

const engine = {
  id: 'pilot.engine', title: 'Engine Failure', icon: '✈️', chance: 0.35, trauma: 5, honor: 'Superior Airmanship Award',
  inquiryText: 'Air accident investigators want your account.',
  for: (s, job) => is('aviation', 'charterAviation')(job),
  news: { outstanding: 'Pilot lands stricken jet; all passengers safe', bad: 'Investigation after airliner emergency' },
  start: 'bang',
  steps: {
    bang: { title: 'After Take-Off', icon: '💥', text: 'Four hundred feet after take-off: a bang, a shudder, and the left engine fire warning. The cabin has gone silent.', options: [
      { id: 'fly', label: '✈️ Fly the aircraft first; the checklist second', check: { skills: ['piloting'], stats: { smarts: 1 }, bar: 55 },
        pass: { text: 'Nose down, rudder in, climbing again on one engine.', score: { lives: 2, crew: 1 } }, fail: { text: 'You were behind the aircraft for a few terrifying seconds.', score: { crew: -1 } }, next: 'decide' },
      { id: 'shut', label: '🔥 Shut down the burning engine right away', score: { crew: 1 }, check: { skills: ['piloting'], bar: 60 },
        pass: { text: 'Fire out. Climbing.', score: { lives: 1 } }, fail: { text: 'You reached for the wrong engine — and caught it just in time.', score: { crew: -2 } }, next: 'decide' },
    ] },
    decide: { title: 'Where To', icon: '🗺️', text: 'Back to the field with a tailwind and a short runway, or twenty minutes on to a long runway with fire crews waiting?', options: [
      { id: 'back', label: '🔙 Straight back', check: { skills: ['piloting'], bar: 55 },
        pass: { text: 'Heavy and fast, and you stopped with metres to spare.', score: { lives: 2 } }, fail: { text: 'You ran off the end into the grass. Slides deployed; a few injuries.', score: { lives: -1, city: -2 } }, next: 'cabin' },
      { id: 'divert', label: '🛬 Divert to the long runway', score: { lives: 1, crew: 1 }, next: 'cabin' },
    ] },
    cabin: { title: 'The PA', icon: '🎙️', text: 'Two hundred people are waiting to hear from you.', options: [
      { id: 'calm', label: '🙂 Calm and honest', score: { trust: 2 } },
      { id: 'say', label: '🤐 Say as little as possible', score: { trust: -1 } },
    ] },
  },
  tiers: {
    outstanding: 'You landed on one engine and everybody walked off. The airline had you train the others.',
    good: 'A textbook single-engine landing. The investigators were complimentary.',
    mixed: 'Everyone survived. The report found some things to improve, including you.',
    bad: 'The landing went wrong. People were hurt, and the investigators have questions.',
  },
};

const leak = {
  id: 'press.leak', title: 'The Leak', icon: '📰', chance: 0.4, trauma: 2, honor: 'Journalism Prize', inquiry: false,
  for: (s, job) => is('journalism')(job),
  data: (s, rng) => ({ name: rng.pick(['a minister', 'a hospital trust', 'a defence contractor', 'the city council']) }),
  news: { outstanding: 'Investigation exposes wrongdoing at {name}' },
  start: 'source',
  steps: {
    source: { title: 'The Source', icon: '📁', text: 'A nervous source has documents that show {name} covering up something serious. They want to stay anonymous.', options: [
      { id: 'verify', label: '🔍 Verify every page before writing a word', check: { skills: ['investigation', 'research'], bar: 50 },
        pass: { text: 'Two other sources confirmed it independently.', score: { trust: 2 } }, fail: { text: 'Two pages couldn\'t be verified. You cut them.', score: { trust: 1 } }, next: 'pressure' },
      { id: 'rush', label: '⚡ Run it tonight before anyone else gets it', tone: 'danger', score: { trust: -1, city: 1 }, flag: 'rushed', next: 'pressure' },
    ] },
    pressure: { title: 'The Lawyers', icon: '⚖️', text: '{name}\'s lawyers are threatening to sue, and someone is trying to find out who your source is.', options: [
      { id: 'protect', label: '🛡️ Protect the source, whatever it costs', score: { trust: 2, crew: -1 }, next: 'publish' },
      { id: 'editor', label: '🗂️ Let the editor and the lawyers decide', score: { crew: 1 }, next: 'publish' },
    ] },
    publish: { title: 'Publication', icon: '🗞️', text: 'The story is ready. The editor asks if you\'re sure.', options: [
      { id: 'yes', label: '✅ Publish', check: { stats: { smarts: 1 }, bar: 45 },
        pass: { text: 'It led every bulletin. There will be an inquiry.', score: { lives: 2, trust: 2 } }, fail: { text: 'A detail was wrong, and that was all anyone wanted to talk about.', score: { trust: -3 } } },
      { id: 'hold', label: '⏳ Hold it another week', score: { trust: 1 } },
    ] },
  },
  tiers: {
    outstanding: 'Your story about {name} changed the law. It\'s taught in journalism schools now.',
    good: 'The story about {name} stood up, and people resigned.',
    mixed: 'The story ran, made noise, and faded.',
    bad: 'The story about {name} fell apart, and took some of your reputation with it.',
  },
};

const takeover = {
  id: 'exec.takeover', title: 'The Hostile Bid', icon: '🦈', chance: 0.35, trauma: 1, honor: 'Business Leader of the Year', inquiry: false,
  for: (s, job) => is('corporate', 'finance', 'insurance', 'tech')(job) && SENIOR(job),
  start: 'bid',
  steps: {
    bid: { title: 'The Bid', icon: '📈', text: 'A rival has launched a hostile bid for the company: a fat premium for shareholders, and a plan to break it up and sack half the staff.', options: [
      { id: 'fight', label: '🛡️ Fight: argue the company is worth more', check: { skills: ['negotiation', 'finance'], bar: 55 },
        pass: { text: 'Your defence document persuaded the big funds.', score: { trust: 2, crew: 1 } }, fail: { text: 'The funds weren\'t convinced.', score: { trust: -1 } }, next: 'knight' },
      { id: 'talk', label: '🤝 Negotiate a better price', score: { city: 2, crew: -1 }, next: 'knight' },
    ] },
    knight: { title: 'A White Knight', icon: '🐎', text: 'A friendlier buyer is willing to step in — for a lower price, but they\'d keep the jobs.', options: [
      { id: 'white', label: '🐎 Bring in the white knight', score: { crew: 2, city: -1 }, next: 'vote' },
      { id: 'alone', label: '🏰 Stay independent', check: { skills: ['leadership'], bar: 55 },
        pass: { text: 'You won the shareholder vote by a whisker.', score: { trust: 2 } }, fail: { text: 'You lost the vote.', score: { trust: -2 } }, next: 'vote' },
    ] },
    vote: { title: 'The Staff', icon: '👥', text: 'Whatever happens, the staff want to hear it from you first.', options: [
      { id: 'town', label: '🎤 A town hall, all of it', score: { crew: 2, trust: 1 } },
      { id: 'memo', label: '📧 A carefully worded memo', score: { trust: -1 } },
    ] },
  },
  tiers: {
    outstanding: 'You saw off the bid and the jobs. The share price is higher now than the offer was.',
    good: 'You got the best deal anyone could have.',
    mixed: 'The company survives, smaller.',
    bad: 'The raiders won. You\'re negotiating your exit package.',
  },
};

const patrol = {
  id: 'mil.patrol', title: 'The Patrol', icon: '🪖', chance: 0.35, trauma: 8, honor: 'Commendation for Gallantry', noJob: true, inquiry: false, injury: 'backInjury',
  // Roadside bombs, radios and a helicopter lift: a modern war's patrol.
  for: (s) => yearNow(s) >= 1960 && Boolean(s.military?.service && s.military.service.component === 'active' && s.world?.wars && Object.keys(s.world.wars).length),
  data: (s, rng) => ({ place: rng.pick(['a dry riverbed', 'a village at dawn', 'a mountain road', 'an abandoned factory']) }),
  start: 'contact',
  steps: {
    contact: { title: 'Contact', icon: '💥', text: 'Your patrol is moving through {place} when the lead vehicle hits a roadside bomb. Then the shooting starts from the ridge.', options: [
      { id: 'return', label: '🔫 Return fire and get the wounded behind cover', check: { skills: ['combat', 'marksmanship'], stats: { fitness: 1 }, bar: 55 },
        pass: { text: 'Fire superiority in thirty seconds. The wounded were in cover.', score: { lives: 2, crew: 1 } }, fail: { text: 'Pinned down. Rounds snapping overhead.', score: { crew: -2 } }, next: 'casualty' },
      { id: 'radio', label: '📻 Get on the radio for air support', score: { crew: 1, city: -1 }, next: 'casualty' },
    ] },
    casualty: { title: 'Man Down', icon: '🩸', text: 'A soldier is down in the open, ten metres away, screaming.', options: [
      { id: 'drag', label: '🏃 Run out and drag him in', tone: 'danger', check: { stats: { fitness: 1 }, bar: 50 },
        pass: { text: 'You got him by the strap and hauled. Neither of you was hit.', score: { lives: 3 }, flag: 'gallant' }, fail: { text: 'You got him back, and took a round in the leg doing it.', score: { lives: 2, crew: -2 }, flag: 'gallant' }, next: 'extract' },
      { id: 'smoke', label: '💨 Smoke first, then go', score: { lives: 2 }, next: 'extract' },
    ] },
    extract: { title: 'Extraction', icon: '🚁', text: 'The helicopter is inbound. There\'s room for the wounded or the dead, not both, on the first lift.', options: [
      { id: 'wounded', label: '🚑 The wounded first', score: { lives: 1, crew: 1 } },
      { id: 'all', label: '🫡 Nobody gets left: wait for the second lift together', score: { crew: -1, trust: 2 } },
    ] },
  },
  tiers: {
    outstanding: 'Everyone came home from {place}. You were put up for a gallantry award.',
    good: 'You brought the patrol back from {place}. Not all of it whole.',
    mixed: 'Some of the patrol came back from {place}.',
    bad: '{place} took your friends. You carried them back yourself.',
  },
};

export const CAREER_SCENES = [er, surgery, night, trial, klass, engine, leak, takeover, patrol];
