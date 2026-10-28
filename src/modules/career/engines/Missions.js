/**
 * Missions and mandates: the year's work in the international organisations, the Holy See's
 * guards, the Gurkha Contingent and congregational ministry. Each year brings a file from the
 * career's own deck — a cholera outbreak, a veto threat, a prisoner visit, a papal Mass — and
 * some careers carry a longer story:
 *
 *   International courts   a case from investigation to indictment, trial and verdict
 *   World Bank & IMF       a lending programme whose conditions work or don't
 *   Clergy                 a congregation that grows, shrinks, or splits
 *
 * state.careerLife.missions = { professionId, rep, files, seen: [], arc, flock }
 */
import { clamp } from '../../../core/Random.js';
import { lifeOf, peekLife, resolveOption, promptOptions, applyFx, skill, engineKey } from './Kit.js';

const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });
const HUMANITARIAN_FIELD = ['South Sudan', 'Yemen', 'the Sahel', 'Haiti', 'Myanmar', 'eastern Congo', 'Gaza', 'northern Syria'];

export const MISSION_CAREERS = {
  unSecretariat: {
    label: 'The Mandate', icon: '🇺🇳', unit: 'reports and resolutions', weights: { smarts: 3, happiness: 1 },
    deck: [
      D('veto', '✋', 'A Veto Threat', 'Your draft report on a peacekeeping mission names a permanent member\'s ally. Its mission says a veto is coming.', [
        { id: 'stand', label: '📄 Keep the finding in', check: 55, text: 'The report went out as written; the Council renewed the mission anyway. You earned a reputation for spine.', rep: 6, perf: 3, fail: { text: 'The mission\'s mandate lapsed in the row. People on the ground paid for it.', rep: -3, stress: 6 } },
        { id: 'soften', label: '✏️ Soften the language', text: 'The report passed by consensus, a little emptier than the truth.', perf: 2, rep: -2 },
      ]),
      D('ga', '🗳️', 'The General Assembly Week', 'Presidents, prime ministers and 193 delegations in one building for a week. Your unit runs a high-level meeting.', [
        { id: 'deliver', label: '📋 Run it flawlessly', check: 45, text: 'Forty heads of state on time and a declaration adopted.', perf: 5, commend: 0.4, fail: { text: 'A seating plan put two feuding delegations side by side. The headlines weren\'t about the declaration.', perf: -3 } },
        { id: 'delegate', label: '🤝 Lean on your team', text: 'It went fine. Your deputy got the credit.', perf: 1 },
      ]),
      D('whistle', '📣', 'An Abuse Report', 'A local staff member tells you a peacekeeping contingent is abusing people near its base.', [
        { id: 'report', label: '🚨 Report it to OIOS, today', text: 'Investigators went in. The contingent was repatriated; your name went quietly into a file of people who don\'t look away.', rep: 6, stress: 5 },
        { id: 'channel', label: '📨 Raise it through your director', text: 'It moved slowly through channels.', perf: 0, risk: { chance: 0.4, text: 'It came out in the press a year later, with your email in it.', rep: -6, perf: -4 } },
      ]),
    ],
  },
  unAgencies: {
    label: 'In the Field', icon: '🌍', unit: 'people reached', weights: { smarts: 2, fitness: 1, happiness: 1 },
    deck: [
      D('cholera', '💧', 'Cholera in the Camp', 'Cases are doubling every three days in a camp of 80,000 in {field}.', [
        { id: 'scale', label: '🚰 Pull every team onto water and oral rehydration', check: 50, text: 'The curve bent within a fortnight. Thousands lived who might not have.', perf: 6, commend: 0.5, fail: { text: 'You were a week too slow on the chlorination. The death toll made the news.', perf: -2, trauma: 6 } },
        { id: 'wait', label: '📋 Wait for the cluster coordination meeting', text: 'The meeting agreed a plan. By then the outbreak had peaked on its own.', perf: -1, stress: 4 },
      ]),
      D('checkpoint', '🛑', 'The Checkpoint', 'Armed men at a checkpoint want a "tax" of a tenth of the food on your trucks.', [
        { id: 'negotiate', label: '🗣️ Negotiate with the commander', check: 55, text: 'Two hours of tea and you went through with everything.', perf: 5, rep: 4, fail: { text: 'The convoy was turned back. A district went without food for another month.', perf: -3, stress: 6 } },
        { id: 'pay', label: '📦 Let them take a share', text: 'The food got through, minus a tenth. The donors\' auditors noticed.', perf: 1, rep: -3 },
        { id: 'turn', label: '↩️ Turn back', text: 'Nobody was hurt; nobody was fed.', perf: -1 },
      ]),
      D('appeal', '📢', 'The Flash Appeal', 'Your country team must ask donors for $400 million in a week, for a crisis nobody is watching.', [
        { id: 'stories', label: '📸 Take journalists to the worst-hit district', check: 45, text: 'The pictures moved donors: 70% funded in a month.', perf: 5, fail: { text: 'The story didn\'t land. The appeal ended 30% funded.', perf: -2 } },
        { id: 'numbers', label: '📊 A careful, numbers-first appeal', text: 'Respected, and half funded.', perf: 2 },
      ]),
    ],
  },
  euInstitutions: {
    label: 'The File', icon: '🇪🇺', unit: 'files handled', weights: { smarts: 3 },
    deck: [
      D('trilogue', '🤝', 'Trilogue at 4 a.m.', 'Commission, Parliament and Council have been negotiating your directive since dinner. A compromise is on the table that guts one article.', [
        { id: 'hold', label: '🧱 Hold the line on the article', check: 55, text: 'At 5:30 a.m. the Council blinked. The directive kept its teeth.', perf: 6, rep: 4, fail: { text: 'The talks collapsed; the file slips a year.', perf: -3 } },
        { id: 'deal', label: '🤝 Take the deal', text: 'A deal by breakfast. Half a law is better than none, you told yourself.', perf: 3 },
      ]),
      D('lobby', '🍽️', 'The Lobbyist\'s Dinner', 'A trade association offers a dinner in a Brussels restaurant to "understand the technical concerns".', [
        { id: 'register', label: '📝 Meet in the office, minuted and on the register', text: 'Their concerns went into the impact assessment, on the record.', perf: 1, rep: 2 },
        { id: 'dinner', label: '🍷 Go to dinner', text: 'Good wine, useful technical points.', perf: 1, risk: { chance: 0.15, text: 'The dinner turned up in an investigative report. The Ombudsman asked questions.', rep: -6, perf: -4 } },
      ]),
      D('rapporteur', '📜', 'A Rapporteur\'s Draft', 'The Parliament\'s rapporteur wants your help drafting amendments that your Commissioner opposes.', [
        { id: 'neutral', label: '⚖️ Give technical help only', text: 'Both sides trusted you a little more.', rep: 3 },
        { id: 'help', label: '✍️ Help write them', text: 'The amendments were good. Your Commissioner\'s cabinet was not pleased.', perf: -2, rep: 2 },
      ]),
    ],
  },
  nato: {
    label: 'The Alliance', icon: '🛡️', unit: 'papers staffed', weights: { smarts: 3 },
    deck: [
      D('summit', '🌐', 'Summit Communiqué', 'Thirty-two allies must agree every word of the summit communiqué. One wants a paragraph removed.', [
        { id: 'broker', label: '🤝 Broker new wording overnight', check: 55, text: 'A fudge everyone could sign. The Secretary General thanked your team by name.', perf: 6, commend: 0.4, fail: { text: 'The paragraph went — and with it the point of the summit.', perf: -3 } },
        { id: 'escalate', label: '📞 Escalate to capitals', text: 'Ministers sorted it out at the summit dinner.', perf: 1 },
      ]),
      D('article4', '🚨', 'Article 4', 'An ally requests consultations under Article 4 after a drone strays into its airspace.', [
        { id: 'prepare', label: '🗂️ Have options ready before the North Atlantic Council meets', check: 50, text: 'Your options paper framed the response: air policing reinforced within 48 hours.', perf: 6, rep: 4, fail: { text: 'The Council met with nothing to decide on. The press called it a talking shop.', perf: -2 } },
        { id: 'wait', label: '⏳ Wait for national positions', text: 'Positions came in slowly; the response was cautious.', perf: 0 },
      ]),
      D('burden', '💶', 'The Two Per Cent Report', 'Your report on defence spending shows an ally\'s figures include pensions it shouldn\'t.', [
        { id: 'publish', label: '📊 Publish the honest numbers', text: 'The ally complained loudly and then quietly increased spending.', rep: 4 },
        { id: 'footnote', label: '🔎 Put it in a footnote', text: 'Diplomacy prevailed. The footnote was read by three people.', perf: 1 },
      ]),
    ],
  },
  intlFinance: {
    label: 'The Programme', icon: '🏦', unit: 'country reviews', weights: { smarts: 3 },
    arc: 'programme',
    deck: [
      D('subsidy', '⛽', 'The Fuel Subsidy', 'The programme country can\'t afford its fuel subsidy. Ending it overnight means riots; keeping it means default.', [
        { id: 'phase', label: '📉 Phase it out over three years, with cash for the poor', check: 55, text: 'It worked: the deficit fell and there were no riots.', perf: 6, rep: 4, fail: { text: 'The cash transfers didn\'t reach the poor. There were protests anyway.', perf: -2, stress: 5 } },
        { id: 'now', label: '✂️ Make it a prior action', text: 'The board approved. The capital burned for a week.', perf: 2, rep: -5, trauma: 4 },
      ]),
      D('data', '📈', 'The Numbers Don\'t Add Up', 'The finance ministry\'s debt figures are missing a state company\'s borrowing.', [
        { id: 'flag', label: '🚩 Flag misreporting to the board', text: 'Hidden debt came to light. The country\'s programme was rebuilt honestly.', rep: 6, perf: 3 },
        { id: 'quiet', label: '🤫 Fix it quietly in the next review', text: 'The minister owed you one.', perf: 1, risk: { chance: 0.3, text: 'The hidden debt surfaced in a crisis. Your missions were named in the inquiry.', perf: -6, rep: -6 } },
      ]),
    ],
  },
  intlJustice: {
    label: 'The Case', icon: '⚖️', unit: 'filings', weights: { smarts: 3, happiness: 1 },
    arc: 'case',
    deck: [
      D('witness', '🕵️', 'A Frightened Witness', 'A key insider witness has been threatened. Protective measures cost months; without them, he may vanish.', [
        { id: 'protect', label: '🛡️ Relocate him and his family', check: 50, text: 'He testified behind a screen. The defence couldn\'t shake him.', perf: 5, rep: 4, fail: { text: 'He recanted from his new home. The case lost its centre.', perf: -3, stress: 6 } },
        { id: 'proceed', label: '⏩ Proceed without protection', text: 'He stopped answering calls.', perf: -2, stress: 4 },
      ]),
      D('cooperation', '🏛️', 'A State Won\'t Cooperate', 'The suspect is living openly in a country that refuses to arrest him.', [
        { id: 'council', label: '📣 Report non-cooperation to the Security Council', text: 'A vote, a veto and a long statement. He stayed free, for now.', perf: 1, rep: 2 },
        { id: 'patience', label: '⏳ Wait for a government to change', text: 'Three years later, a new government handed him over.', perf: 3 },
      ]),
    ],
  },
  icrc: {
    label: 'The Delegation', icon: '➕', unit: 'detainees visited', weights: { smarts: 2, happiness: 2 },
    deck: [
      D('visit', '🔒', 'A Prison Visit', 'You\'re visiting detainees in {field}. One whispers that he\'s being tortured — and that he\'ll be punished for telling you.', [
        { id: 'confidential', label: '🤫 Raise it confidentially with the authorities, without his name', check: 50, text: 'The interrogators were moved. The ICRC\'s confidentiality is why you\'re let in at all.', perf: 5, rep: 5, fail: { text: 'The authorities guessed who had spoken. You were refused your next visit.', perf: -3, trauma: 6 } },
        { id: 'public', label: '📢 Go public', tone: 'danger', text: 'The headlines were justified. The ICRC was expelled from the country.', perf: -6, rep: -4 },
      ]),
      D('frontline', '🚑', 'Crossing the Front Line', 'Both sides have agreed — loosely — to let you evacuate the wounded from a besieged town.', [
        { id: 'go', label: '🏳️ Lead the convoy in', check: 55, text: 'Ninety wounded out under the red cross. Neither side fired.', perf: 7, commend: 0.5, fail: { text: 'Shells fell near the convoy. You got the wounded out, and carried the night with you.', trauma: 12, perf: 3 } },
        { id: 'wait', label: '⏳ Wait for firmer guarantees', text: 'The guarantees didn\'t come. Neither did the evacuation.', perf: -1, stress: 5 },
      ]),
    ],
  },
  maltaRelief: {
    label: 'The Relief Mission', icon: '✠', unit: 'people helped', weights: { smarts: 2, happiness: 2 },
    deck: [
      D('quake', '🏚️', 'An Earthquake', 'An earthquake in {field}. Malteser International can fly a medical team in tonight if you sign off.', [
        { id: 'go', label: '✈️ Send the team tonight', check: 45, text: 'Your field hospital was running in 36 hours.', perf: 6, commend: 0.4, fail: { text: 'Customs held your supplies for a week at the airport.', perf: -2, stress: 5 } },
        { id: 'assess', label: '📋 Send an assessment team first', text: 'Slower, better targeted.', perf: 2 },
      ]),
      D('partner', '🤝', 'A Local Partner', 'Your local partner, a parish network, reaches villages nobody else can — but its books are a mess.', [
        { id: 'train', label: '📚 Train their bookkeepers', text: 'Six months later the audits were clean and the reach was intact.', rep: 4, perf: 2 },
        { id: 'drop', label: '✂️ Drop them for a bigger NGO', text: 'Clean audits; three districts no longer reached.', perf: 1, rep: -2 },
      ]),
    ],
  },
  maltaDiplomacy: {
    label: 'The Embassy', icon: '✠', unit: 'audiences', weights: { smarts: 2, happiness: 2 },
    deck: [
      D('hospital', '🏥', 'A Hospital Agreement', 'The Order can run a maternity hospital here if the government signs an agreement giving it privileges and immunities.', [
        { id: 'negotiate', label: '🖋️ Negotiate it through', check: 50, text: 'The agreement was signed; the hospital opened two years later.', perf: 6, rep: 4, fail: { text: 'A new health minister shelved it.', perf: -2 } },
        { id: 'small', label: '🩺 Start with a clinic under a simple MoU', text: 'A small clinic, opened in months.', perf: 2 },
      ]),
    ],
  },
  swissGuard: {
    label: 'The Guard', icon: '⚔️', unit: 'watches stood', weights: { fitness: 2, smarts: 1 },
    deck: [
      D('crowd', '🙌', 'A Rush at the Popemobile', 'In St Peter\'s Square a man vaults the barrier and sprints at the Pope\'s car.', [
        { id: 'intercept', label: '🏃 Intercept him', check: 50, text: 'You had him on the cobbles before he reached the car. He only wanted a blessing; he got one, from the ground.', perf: 6, commend: 0.5, fail: { text: 'A gendarme reached him first. Your sergeant had words.', perf: -1 } },
        { id: 'cover', label: '🛡️ Close on the Holy Father', text: 'By the book: the principal first.', perf: 3 },
      ]),
      D('oath', '🗡️', 'The 6th of May', 'The swearing-in in the San Damaso courtyard, for the 147 who died defending Clement VII in 1527. The new recruits look to the veterans.', [
        { id: 'mentor', label: '🤝 Take a recruit under your wing', text: 'He swore the oath without a tremor, hand raised, three fingers for the Trinity.', rep: 3, happiness: 4 },
        { id: 'parade', label: '🎺 Focus on your own drill', text: 'A perfect parade in the sun.', perf: 2 },
      ]),
      D('trip', '✈️', 'An Apostolic Journey', 'The Pope travels abroad. Two Guards in plain clothes go with him.', [
        { id: 'go', label: '🧳 Volunteer for the detail', check: 55, text: 'Eleven days, four countries, no incidents. You came home tired and proud.', perf: 6, fail: { text: 'You lost sight of the Pope in a crowd for ninety seconds. Nothing happened. You still dream about it.', stress: 6 } },
        { id: 'stay', label: '🏛️ Hold the gates at home', text: 'A quiet fortnight in the Vatican.', perf: 1 },
      ]),
    ],
  },
  vaticanGendarmerie: {
    label: 'The Corps', icon: '👮', unit: 'patrols', weights: { fitness: 1, smarts: 2 },
    deck: [
      D('pickpocket', '👛', 'Pickpockets in the Basilica', 'A gang works the queue for St Peter\'s every Easter.', [
        { id: 'operation', label: '🕵️ Plain-clothes operation with the Italian police', check: 45, text: 'Six arrests, handed over to Rome. The queue felt safer.', perf: 5, fail: { text: 'They spotted your officers and moved to the Colosseum.', perf: 0 } },
        { id: 'visible', label: '👮 Uniformed patrols', text: 'Fewer thefts, no arrests.', perf: 2 },
      ]),
      D('leak', '📄', 'The Leaks', 'Confidential papers from the Apostolic Palace are turning up in Italian newspapers. Someone close to the Pope is leaking.', [
        { id: 'investigate', label: '🔍 Investigate quietly', check: 60, text: 'You found the source: a butler with boxes of papers. The trial was short.', perf: 7, rep: 5, commend: 0.4, fail: { text: 'The leaks went on; the Secretariat of State lost patience with the Corps.', perf: -3 } },
        { id: 'refer', label: '📨 Leave it to the Secretariat', text: 'The leaks stopped, eventually, and nobody learned how.', perf: 0 },
      ]),
    ],
  },
  gurkhaContingent: {
    label: 'The Contingent', icon: '🗡️', unit: 'duty days', weights: { fitness: 2, smarts: 1 },
    deck: [
      D('riot', '🛡️', 'A Riot Call-Out', 'A riot has broken out among workers in Little India after a fatal accident. The Contingent is the force of last resort.', [
        { id: 'line', label: '🛡️ Hold a disciplined line', check: 50, text: 'The crowd dispersed without a shot fired. The Commissioner praised the Contingent\'s discipline.', perf: 6, commend: 0.4, fail: { text: 'Bottles and a burned car; a constable beside you was hurt.', injury: 0.3, perf: 1 } },
        { id: 'talk', label: '🗣️ Let the Nepali-speaking officers talk to the crowd', text: 'Some of them spoke your dialect. The anger drained away.', perf: 4 },
      ]),
      D('dialogue', '🌏', 'The Shangri-La Dialogue', 'Defence ministers from across Asia at one hotel; the Contingent guards the perimeter.', [
        { id: 'tight', label: '🔒 Run the tightest perimeter Singapore has seen', text: 'Not a breach in three days.', perf: 4 },
      ]),
      D('istana', '🏛️', 'Night Watch at the Istana', 'Guarding the President\'s residence: the quietest and most trusted duty in the Contingent.', [
        { id: 'steady', label: '🌙 Stand the watch', text: 'A clear night, a perfect watch, and a nod from the duty officer.', perf: 2, happiness: 2 },
      ]),
    ],
  },
  clergy: {
    label: 'The Congregation', icon: '⛪', unit: 'services led', weights: { smarts: 1, happiness: 2 },
    arc: 'flock',
    deck: [
      D('funeral', '🕯️', 'A Hard Funeral', 'A young member of your congregation died by suicide. The family asks you to take the funeral, and to say something true.', [
        { id: 'honest', label: '💬 Speak honestly about despair and grace', check: 45, text: 'People who had never spoken about mental illness came to see you for months afterwards.', rep: 6, happiness: 2, fail: { text: 'A relative walked out. You\'ll never know if you said it right.', stress: 6 } },
        { id: 'gentle', label: '🌿 Keep it gentle and traditional', text: 'The family thanked you.', rep: 2 },
      ]),
      D('split', '💔', 'A Congregation Divided', 'A fight over a theological question — your denomination\'s new teaching — has split the board.', [
        { id: 'bridge', label: '🌉 Hold both sides together', check: 55, text: 'Months of meetings; nobody left. The congregation came out stronger.', rep: 6, perf: 4, fail: { text: 'A third of the congregation left to start their own.', rep: -6, stress: 8 } },
        { id: 'side', label: '🧭 Take a clear side', text: 'Some left, the rest were united behind you.', rep: -2, perf: 2 },
      ]),
      D('chaplain', '🏥', 'A Chaplaincy', 'The hospital, prison or a military unit nearby needs a part-time chaplain.', [
        { id: 'take', label: '✅ Take it on', text: 'Night calls at bedsides and in cells. It made you a better pastor.', rep: 4, stress: 4, money: 9000, moneyLabel: 'Chaplaincy stipend' },
        { id: 'decline', label: '🙅 Your congregation comes first', text: 'Your congregation noticed you were there for them.', rep: 1 },
      ]),
      D('call', '📯', 'A Call', 'A larger congregation in another city has asked you to be their pastor.', [
        { id: 'stay', label: '🏡 Stay with your people', text: 'Your congregation threw a party when they heard.', rep: 5, happiness: 3 },
        { id: 'consider', label: '🤔 Preach for them as a candidate', text: 'They loved you. You promised to pray about it.', perf: 3 },
      ]),
    ],
  },
};

const fresh = () => ({ files: 0, seen: [], arc: null, flock: null });
const configOf = (job) => MISSION_CAREERS[engineKey(job)] ?? null;
const fill = (state, text, rng) => text.replace('{field}', rng.pick(HUMANITARIAN_FIELD));

/** Long stories: the court's case and the Bank's programme run over years; a congregation grows or shrinks. */
function arcYear(ctx, rec, cfg) {
  const { state, rng } = ctx;
  if (cfg.arc === 'flock') {
    rec.flock ??= rng.int(60, 260);
    const change = Math.round(rec.flock * ((rec.rep - 50) / 400 + rng.int(-4, 4) / 100));
    rec.flock = Math.max(15, rec.flock + change);
    if (change >= 15) ctx.log(`Your congregation grew to ${rec.flock}: new families in the pews.`, '⛪', 'good');
    else if (change <= -15) ctx.log(`Attendance fell to ${rec.flock}. The board is worried about the roof.`, '⛪', 'warn');
    return;
  }
  if (cfg.arc === 'case') {
    const STAGES = ['investigation', 'indictment', 'trial', 'verdict'];
    if (!rec.arc) rec.arc = { name: rng.pick(['The Prosecutor v. Kasongo', 'The Prosecutor v. Al-Rashid', 'The Prosecutor v. Duric', 'The Prosecutor v. Mbeki-Lunda', 'The Prosecutor v. Thein']), stage: 0 };
    const c = rec.arc;
    if (!rng.chance(0.6)) return;
    c.stage += 1;
    if (c.stage < STAGES.length - 1) return void ctx.log(`${c.name}: the case moved to ${STAGES[c.stage]}.`, '⚖️', 'info');
    const convicted = rng.chance(clamp(0.35 + (rec.rep - 50) / 120 + skill(state, cfg.weights) / 300, 0.1, 0.8));
    applyFx(ctx, rec, convicted
      ? { text: `${c.name}: the judges convicted on most counts, after years of your work. Survivors wept in the public gallery.`, perf: 8, rep: 6, happiness: 6 }
      : { text: `${c.name}: acquitted. The judges found the evidence couldn't link him to the orders.`, perf: -3, stress: 6 }, '⚖️');
    rec.cases = (rec.cases ?? 0) + 1;
    rec.arc = null;
    return;
  }
  if (cfg.arc === 'programme') {
    if (!rec.arc) { rec.arc = { country: rng.pick(['Pakistan', 'Egypt', 'Ghana', 'Sri Lanka', 'Argentina', 'Zambia', 'Ukraine', 'Kenya']), years: 0 }; return void ctx.log(`You were made mission chief for the programme with ${rec.arc.country}.`, '🏦', 'milestone'); }
    rec.arc.years += 1;
    if (rec.arc.years < 3) return;
    const ok = rng.chance(clamp(0.4 + (rec.rep - 50) / 100, 0.15, 0.8));
    applyFx(ctx, rec, ok
      ? { text: `${rec.arc.country}'s programme ended on track: inflation down, reserves rebuilt, growth back.`, perf: 7, rep: 5 }
      : { text: `${rec.arc.country}'s programme went off track: missed targets, a suspended review, and editorials blaming the Fund.`, perf: -4, rep: -4 }, '🏦');
    rec.arc = null;
  }
}

export function missionsView(state) {
  const job = state.career.job;
  const cfg = configOf(job);
  if (!cfg) return null;
  const rec = peekLife(state, 'missions');
  return { cfg, rec: rec?.professionId === job.professionId ? rec : null };
}

export const MissionsModule = {
  id: 'missions',
  order: 31.4,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const cfg = configOf(job);
    if (!cfg || state.legal.incarceration) return;
    const rec = lifeOf(state, 'missions', job.professionId, fresh());
    rec.files += 1;
    rec.rep = Math.round(clamp(rec.rep + (skill(state, cfg.weights) - 55) / 15, 0, 100));
    arcYear(ctx, rec, cfg);
    if (state.prompts.some((p) => p.type === 'missions.event') || !rng.chance(0.7)) return;
    // A file you haven't had recently.
    const fresh_ = cfg.deck.filter((d) => !rec.seen.includes(d.id));
    const d = rng.pick(fresh_.length ? fresh_ : cfg.deck);
    rec.seen = [...rec.seen.filter((x) => x !== d.id), d.id].slice(-Math.max(1, cfg.deck.length - 1));
    ctx.prompt({ type: 'missions.event', icon: d.icon, title: d.title, text: fill(state, d.text, rng), options: promptOptions(d.options), data: { deckId: d.id } });
  },
  resolvers: {
    event(ctx, data, optionId) {
      const job = ctx.state.career.job;
      const cfg = configOf(job);
      const d = cfg?.deck.find((x) => x.id === data.deckId);
      if (!d) return;
      resolveOption(ctx, lifeOf(ctx.state, 'missions', job.professionId, fresh()), d.options.find((o) => o.id === optionId), d.icon, cfg.weights);
    },
  },
};
