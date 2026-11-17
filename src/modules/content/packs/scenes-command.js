/**
 * Command scenes (played by career/Scenes.js, started by career/Command.js):
 *
 *   command.disorder   you command the police on a night of disorder
 *   command.siege      a barricaded gunman with hostages: you are the silver commander
 *   command.battle     your battalion's battle, in a war
 *
 * How prepared you were (drills, kit, plans, agreements with neighbours) shapes the scores
 * before the first decision; some options are only there because you prepared for them.
 */
const ready = (state, key, at = 60) => (state.command?.readiness?.[key] ?? 0) >= at;

const disorder = {
  id: 'command.disorder', title: 'A Night of Disorder', icon: '🛡️', trigger: 'manual', trauma: 8, honor: 'Commendation for public-order command', honorChance: 0.7,
  inquiryText: 'There will be an independent inquiry into the policing of the disorder.',
  news: { outstanding: 'Calm restored: police praised for handling of disorder', bad: 'Night of violence: questions for police commanders' },
  start: 'start',
  steps: {
    start: {
      title: 'The Flashpoint', icon: '🔥',
      text: 'An arrest outside a pub has turned into a crowd of hundreds. Bricks are flying, a car is alight, and the shops on the high street are next. You are the commander on duty.',
      options: [
        { id: 'line', label: '🛡️ Hold a line with shields and wait for reinforcements', hint: 'Protect what you can; let it burn out', score: { crew: 1, city: -1 }, next: 'escalate' },
        { id: 'talk', label: '🗣️ Send community officers to talk to the crowd', hint: 'Calm it if it can be calmed', check: { skills: ['leadership'], stats: { smarts: 1 }, bar: 55 },
          pass: { text: 'The youth workers and a local preacher calmed the front of the crowd. The rest drifted away.', score: { lives: 1, trust: 2 } }, fail: { text: 'The officers were pelted and had to pull back.', score: { crew: -1, trust: -1 } }, next: 'escalate' },
        { id: 'charge', label: '🐎 Clear the street: mounted officers and a baton charge', hint: 'Fast, and it will be on the news', score: { city: 1, trust: -2, crew: -1 }, next: 'escalate' },
      ],
    },
    escalate: {
      title: 'It Spreads', icon: '📻',
      text: 'Reports of looting three streets away. Your officers are tired and the crowd is splitting up.',
      options: [
        { id: 'aid', label: '🤝 Call in the neighbouring forces under your agreement', hint: 'Your mutual-aid plan: they come in an hour', when: (state) => ready(state, 'mutualAid'), score: { city: 2, crew: 1 }, next: 'complication' },
        { id: 'contain', label: '🧱 Contain the main group; let the rest go', hint: 'Fewer arrests tonight, more evidence tomorrow', score: { crew: 1, trust: 1, city: -1 }, next: 'complication' },
        { id: 'snatch', label: '🎯 Snatch squads for the ringleaders', hint: 'Needs trained teams', check: { skills: ['leadership'], bar: 55 },
          pass: { text: 'The snatch squads took out the ringleaders. The rest lost heart.', score: { city: 2, trust: 1 } }, fail: { text: 'A snatch went wrong on camera: an officer down, a bystander hurt.', score: { crew: -2, trust: -2 }, flag: 'misconduct' }, next: 'complication' },
      ],
    },
  },
  complications: {
    fire: { title: 'A Building Alight', icon: '🏚️', text: 'A shop with flats above is burning. The fire crews won\'t go in without police cover.', options: [
      { id: 'cover', label: '🚒 Give the fire crews an escort', score: { lives: 2, crew: -1 } },
      { id: 'wait', label: '⏳ Wait until the street is clear', score: { lives: -2, city: -1 } },
    ] },
    film: { title: 'On Camera', icon: '📱', text: 'A video of an officer striking a man on the ground is spreading online.', options: [
      { id: 'suspend', label: '🧾 Suspend the officer tonight and say so', score: { trust: 2, crew: -1 } },
      { id: 'back', label: '🛡️ Back your officer until the facts are in', score: { crew: 1, trust: -2 } },
    ] },
  },
  outcome: (sc, tier) => ({ text: { outstanding: 'By dawn the streets were quiet. Few hurt, few shops lost, and the community leaders stood beside you at the press conference.', good: 'It was over by three in the morning. Damage, arrests, but no deaths.', mixed: 'A long night. Shops burned, officers hurt, and the questions have started.', bad: 'The disorder ran for three nights. A man died, the high street is gutted, and the inquiry wants your logbook.' }[tier] }),
};

const siege = {
  id: 'command.siege', title: 'The Siege', icon: '🚨', trigger: 'manual', trauma: 9, honor: 'Commendation for command of a siege', honorChance: 0.8,
  inquiryText: 'The death of a hostage will be investigated by the independent police complaints body.',
  news: { outstanding: 'Hostages freed unharmed after siege', bad: 'Siege ends in tragedy' },
  start: 'start',
  steps: {
    start: {
      title: 'Barricaded', icon: '🚪',
      text: 'A man with a shotgun has barricaded himself in a house with his ex-partner and her children. You are the commander. Every decision is logged.',
      options: [
        { id: 'negotiate', label: '📞 Negotiators first: time is on your side', hint: 'Slow, and usually right', score: { lives: 1, trust: 1 }, next: 'hours' },
        { id: 'plan', label: '🗺️ Plan an entry now, in case', hint: 'Your trained teams and the plan you drilled', when: (state) => ready(state, 'training'), score: { lives: 1, crew: 1 }, next: 'hours' },
        { id: 'pressure', label: '⚡ Cut the power and keep up the pressure', hint: 'Pushes him toward a decision', score: { lives: -1, city: 1 }, next: 'hours' },
      ],
    },
    hours: {
      title: 'Hour Six', icon: '⏰',
      text: 'The negotiator thinks he is close to giving up, or close to the end. Your tactical team leader says they have a clear entry point.',
      options: [
        { id: 'wait', label: '⏳ Keep talking', check: { skills: ['leadership'], stats: { smarts: 1 }, bar: 50 },
          pass: { text: 'At dawn he came out with his hands up. Everyone walked out of that house.', score: { lives: 3, trust: 2 } }, fail: { text: 'A shot inside. The team went in. The children were safe; their mother was not.', score: { lives: -2, trust: -1 } }, next: 'complication' },
        { id: 'enter', label: '🛡️ Authorise the entry', check: { skills: ['leadership'], bar: 55 },
          pass: { text: 'Stun grenades, eight seconds, and the hostages were out. He was arrested alive.', score: { lives: 2, crew: 1 } }, fail: { text: 'The entry went wrong. An officer was hit and he was shot dead.', score: { crew: -2, lives: -1, trust: -1 } }, next: 'complication' },
      ],
    },
  },
  complications: {
    press: { title: 'The Live Feed', icon: '📺', text: 'A news helicopter is broadcasting your officers\' positions, and he has a television.', options: [
      { id: 'ask', label: '📞 Ask the broadcasters to stop', score: { lives: 1, trust: 1 } },
      { id: 'ignore', label: '🤷 Carry on', score: { crew: -1 } },
    ] },
    family: { title: 'His Brother', icon: '👤', text: 'His brother turns up at the cordon, begging to talk to him.', options: [
      { id: 'let', label: '📞 Put him on the phone, with the negotiator listening', check: { stats: { smarts: 1 }, bar: 55 }, pass: { text: 'His brother got through to him.', score: { lives: 2 } }, fail: { text: 'The call made it worse.', score: { lives: -1 } } },
      { id: 'no', label: '🚫 Keep him back', score: { trust: -1 } },
    ] },
  },
  outcome: (sc, tier) => ({ text: { outstanding: 'Everyone came out alive, including him. The negotiators and the tactical team shook hands in the street.', good: 'The hostages came out safe.', mixed: 'The hostages are safe; the man is dead, and there will be questions.', bad: 'A hostage died. Nobody will forget that house.' }[tier] }),
};

const battle = {
  id: 'command.battle', title: 'Your Battalion\'s Battle', icon: '⚔️', trigger: 'manual', work: false, trauma: 14, honor: 'Mentioned in despatches', honorChance: 0.7,
  inquiryText: 'A board of inquiry will examine your conduct of the battle.',
  injury: 'tbi',
  start: 'start',
  steps: {
    start: {
      title: 'Orders', icon: '🗺️',
      text: 'Brigade orders your battalion to take a ridge held by an enemy company. You have until first light.',
      options: [
        { id: 'recce', label: '🔭 Recce it properly first', hint: 'Costs time; saves lives', check: { skills: ['leadership'], stats: { smarts: 1 }, bar: 50 },
          pass: { text: 'Your patrols found a dead ground approach the enemy hadn\'t covered.', score: { lives: 2, crew: 1 } }, fail: { text: 'The patrol was spotted. The enemy knows you\'re coming.', score: { crew: -1 } }, next: 'assault' },
        { id: 'rehearsed', label: '📋 Run the attack you rehearsed', hint: 'Your exercises and plans', when: (state) => ready(state, 'plans'), score: { lives: 1, crew: 2 }, next: 'assault' },
        { id: 'fire', label: '💥 Ask for everything the artillery has', hint: 'Fewer of your soldiers hurt; the village below suffers', score: { crew: 2, city: -2, trust: -1 }, next: 'assault' },
      ],
    },
    assault: {
      title: 'The Assault', icon: '⚔️',
      text: 'Your lead company is pinned down halfway up. Casualty reports are coming in over the radio.',
      options: [
        { id: 'flank', label: '↪️ Push your reserve company round the flank', check: { skills: ['leadership'], bar: 55 },
          pass: { text: 'The flank attack broke them. The ridge was yours by mid-morning.', score: { lives: 2, crew: 1 } }, fail: { text: 'The reserve ran into a minefield. You took the ridge, at a cost.', score: { crew: -2 } }, next: 'complication' },
        { id: 'forward', label: '🏃 Go forward yourself to steady them', hint: 'Commanders lead from the front; they also get killed', check: { stats: { fitness: 1 }, bar: 50 },
          pass: { text: 'Your soldiers saw you there and went up the hill.', score: { crew: 2, trust: 2 } }, fail: { text: 'You were hit going forward. Your second-in-command finished it.', score: { crew: -1 }, flag: 'wounded' }, next: 'complication' },
        { id: 'withdraw', label: '↩️ Pull back and tell brigade it can\'t be done', hint: 'Lives saved today; your career may not be', score: { crew: 2, trust: -2 }, next: 'complication' },
      ],
    },
  },
  complications: {
    civilians: { title: 'The Village', icon: '🏘️', text: 'Civilians are sheltering in the farm buildings your company needs to clear.', options: [
      { id: 'care', label: '🕊️ Clear them room by room, slowly', score: { trust: 2, crew: -1 } },
      { id: 'fast', label: '💥 Clear them by fire', score: { crew: 1, trust: -3 }, flag: 'misconduct' },
    ] },
    prisoners: { title: 'Prisoners', icon: '🏳️', text: 'Twenty enemy soldiers surrender. Some of your soldiers have just lost friends.', options: [
      { id: 'rules', label: '📜 Treat them by the book, and make sure everyone sees you do', score: { trust: 2 } },
      { id: 'look', label: '🙈 Leave it to the company commanders', score: { trust: -1 }, flag: 'misconduct' },
    ] },
  },
  outcome: (sc, tier) => ({ text: { outstanding: 'The ridge fell with light losses. Brigade called it the best-run attack of the campaign.', good: 'You took the ridge. You wrote letters to the families of the soldiers who didn\'t come back.', mixed: 'The ridge was taken, and the cost was high. You will carry the names.', bad: 'The attack failed with heavy losses. A board of inquiry will want to know why.' }[tier] }),
};

export const COMMAND_SCENES = [disorder, siege, battle];
