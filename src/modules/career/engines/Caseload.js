/**
 * Caseload careers: named cases that arrive, move through stages and close
 * well or badly, and more of them than you have hours for.
 *
 *   Each year     New cases arrive. How you spend your hours — thorough,
 *                 balanced or triage — decides how fast they move and how
 *                 well they end. Too many open cases is burnout.
 *   Outcomes      Good outcomes build your reputation and performance; bad
 *                 ones cost you, and now and then one becomes a tragedy
 *                 with a review.
 *   The case      One case a year becomes a decision of its own.
 *
 *   social work · child protective services · probation & parole · mental
 *   health counseling · clinical psychology · private investigation · crime
 *   lab · benefits claims · inspectors general · human resources · paralegals
 *
 * state.careerLife.caseload = { professionId, focus, cases: [{ id, name, kind, difficulty, stage, opened }], closed, good, bad, rep }
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../../core/State.js';
import { lifeOf, peekLife, resolveOption, promptOptions, applyFx, skill } from './Kit.js';

export const FOCUS = {
  thorough: { name: 'Thorough', icon: '🔬', speed: 0.45, quality: 0.15, stress: 2, desc: 'Fewer cases closed, better outcomes. The backlog grows.' },
  balanced: { name: 'Balanced', icon: '⚖️', speed: 0.65, quality: 0, stress: 3, desc: 'The way most people survive the job.' },
  triage: { name: 'Triage', icon: '🚑', speed: 0.9, quality: -0.15, stress: 5, desc: 'Close what you can. Some cases will go wrong.' },
};

const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });
const W = { smarts: 2, happiness: 1 };

export const CASE_CAREERS = {
  cps: {
    label: 'Your Caseload', icon: '🧸', noun: 'family', intake: [10, 18], cap: 18, stages: ['Investigation', 'Safety plan', 'Services', 'Court review', 'Closure'],
    kinds: ['neglect report', 'physical abuse report', 'domestic violence in the home', 'parental substance use', 'educational neglect', 'unsafe housing'],
    good: (c) => `The ${c.name} family's case closed: the kids are safe at home.`, bad: (c) => `The ${c.name} family's case went badly: the children went back into care.`,
    tragedy: { text: 'A child on your caseload was seriously hurt at home. The review asks what you missed.', trauma: 14, perf: -12, rep: -15 },
    deck: [
      D('removal', '🏠', 'Remove the Children?', 'A mother with a history of addiction says she\'s clean. The house is clean. The kids say they\'re fine. Something is off.', [
        { id: 'safety', label: '📝 Safety plan and weekly visits', check: 55, text: 'Your instinct was right to watch: a relapse caught early, and the kids stayed safe with grandma for a month.', perf: 5, rep: 5, fail: { text: 'You missed the relapse. The kids were found alone two weeks later.', perf: -6, trauma: 6, rep: -6 } },
        { id: 'remove', label: '🚗 Remove them tonight', text: 'The judge upheld it. The kids cried in your car.', perf: 2, trauma: 4 },
      ]),
      D('court', '⚖️', 'Testimony', 'A parent\'s attorney is tearing your case notes apart on the stand.', [
        { id: 'notes', label: '📚 Stick to your documentation', check: 50, text: 'Your notes held. The judge thanked you for their thoroughness.', perf: 4, rep: 4, fail: { text: 'Gaps in your notes cost the case. The children went home.', perf: -4, rep: -4 } },
      ]),
    ],
  },
  socialWork: {
    label: 'Your Caseload', icon: '🤝', noun: 'client', intake: [12, 24], cap: 30, stages: ['Assessment', 'Plan', 'Linking services', 'Follow-up', 'Discharge'],
    kinds: ['housing crisis', 'elder care', 'hospital discharge', 'disability benefits', 'recovery support', 'veteran reintegration'],
    good: (c) => `${c.name} is stable now: housed, connected and doing better.`, bad: (c) => `${c.name} fell through the cracks.`,
    tragedy: { text: 'A client you couldn\'t reach in time died by suicide.', trauma: 12, perf: -6 },
    deck: [
      D('eviction', '🏚️', 'Eviction Friday', 'A grandmother raising three grandkids will be evicted Friday. The emergency fund has $800 left for the month.', [
        { id: 'fund', label: '💵 Use it all on her', text: 'They stayed housed. Two other clients waited a month.', perf: 3, rep: 3 },
        { id: 'advocate', label: '📞 Spend the week fighting the landlord and the court', check: 55, text: 'A legal-aid lawyer found a defect in the eviction. They stayed, and the fund stayed intact.', perf: 6, rep: 6, fail: { text: 'You ran out of days. They moved into a shelter.', perf: -2, stress: 4 } },
      ]),
    ],
  },
  probation: {
    label: 'Your Caseload', icon: '⚖️', noun: 'client', intake: [25, 50], cap: 70, stages: ['Intake', 'Supervision', 'Treatment', 'Compliance', 'Discharge'],
    kinds: ['DUI', 'drug possession', 'domestic violence', 'theft', 'assault', 'fraud'],
    good: (c) => `${c.name} finished probation clean and kept a job.`, bad: (c) => `${c.name} violated and went back to jail.`,
    tragedy: { text: 'A man on your caseload committed a serious violent crime. The newspapers want to know why he was free.', trauma: 8, perf: -10, rep: -12 },
    deck: [
      D('violation', '🧪', 'A Dirty Test', 'A client who has done everything right for a year tests positive. One more violation means prison.', [
        { id: 'treatment', label: '🏥 Increase treatment, don\'t violate', check: 45, text: 'He got into intensive outpatient and finished clean.', perf: 5, rep: 4, fail: { text: 'He used again and missed curfew. Now it\'s a new charge.', perf: -4 } },
        { id: 'violate', label: '📝 File the violation', text: 'The judge sent him back for six months.', perf: 1 },
      ]),
      D('search', '🏠', 'A Home Visit Goes Wrong', 'At a home visit, you smell marijuana and see a gun on the counter. Your client says it\'s his brother\'s.', [
        { id: 'back', label: '🚪 Back out and call police', text: 'The gun was stolen. Arrest, and no one hurt.', perf: 4 },
        { id: 'confront', label: '✋ Confront him on the spot', check: 55, text: 'He handed it over. Brave and lucky.', perf: 3, fail: { text: 'The brother walked in. It got very tense before it calmed down.', trauma: 6 } },
      ]),
    ],
  },
  counseling: {
    label: 'Your Clients', icon: '🛋️', noun: 'client', intake: [15, 28], cap: 30, stages: ['Intake', 'Assessment', 'Treatment', 'Maintenance', 'Termination'],
    kinds: ['depression', 'anxiety', 'trauma', 'grief', 'couples therapy', 'substance use'],
    good: (c) => `${c.name} finished therapy doing much better.`, bad: (c) => `${c.name} dropped out of treatment worse off.`,
    tragedy: { text: 'A client died by suicide between sessions. You did everything right, and it doesn\'t help.', trauma: 14, perf: -4 },
    deck: [
      D('warn', '⚠️', 'Duty to Warn', 'A client says he\'s going to hurt his ex-wife. He might be venting. He might not.', [
        { id: 'warn', label: '📞 Warn her and the police', text: 'He was arrested with a weapon in his car. He\'ll never trust a therapist again; she is alive.', perf: 4, rep: 2 },
        { id: 'session', label: '🗣️ Bring him back tomorrow and assess', check: 55, text: 'He was venting. You kept him in treatment.', perf: 3, rep: 3, fail: { text: 'He went to her house that night. Police got there first.', trauma: 10, perf: -6, complaint: 0.5 } },
      ]),
      D('boundary', '💌', 'A Client\'s Feelings', 'A client says she\'s fallen in love with you.', [
        { id: 'process', label: '🧭 Address it in session, with supervision', check: 40, text: 'Hard sessions, real progress.', perf: 3 },
        { id: 'refer', label: '📋 Refer her to a colleague', text: 'She felt abandoned, but it was clean.', perf: 1 },
      ]),
    ],
  },
  privateInvestigator: {
    label: 'Your Cases', icon: '🕵️', noun: 'case', intake: [8, 16], cap: 15, stages: ['Retainer', 'Background', 'Surveillance', 'Report', 'Closed'],
    kinds: ['infidelity surveillance', 'insurance fraud', 'missing person', 'workers\' comp claim', 'skip trace', 'defense investigation'],
    good: (c) => `You cracked the ${c.kind} case for ${c.name}. The client paid in full and referred a friend.`, bad: (c) => `The ${c.kind} case for ${c.name} went nowhere.`,
    deck: [
      D('pretext', '📞', 'The Pretext Call', 'You could get the subject\'s bank records with one lie on the phone. It\'s illegal.', [
        { id: 'legit', label: '🔎 Do it the slow, legal way', check: 50, text: 'Public records and patience got you there.', perf: 4, rep: 4, money: 2500, moneyLabel: 'Case fee', fail: { text: 'The trail went cold; the client walked.', perf: -2 } },
        { id: 'lie', label: '🤥 Make the call', tone: 'danger', text: 'You got the records in ten minutes.', money: 5000, moneyLabel: 'Case fee', offense: 'wireFraud', offenseContext: 'pretexting bank records', discovery: 0.25 },
      ]),
      D('missing', '🧒', 'A Runaway', 'Parents hire you to find their 16-year-old. Police have stopped looking.', [
        { id: 'street', label: '🚶 Work the street and her friends', check: 50, text: 'You found her at a friend\'s couch two states away and brought her home.', perf: 6, rep: 8, money: 4000, moneyLabel: 'Case fee', fail: { text: 'A month of leads and nothing.', perf: -2 } },
      ]),
    ],
  },
  forensics: {
    label: 'Your Bench', icon: '🧬', noun: 'case', intake: [60, 120], cap: 120, stages: ['Received', 'Testing', 'Analysis', 'Review', 'Reported'],
    kinds: ['DNA', 'drug chemistry', 'latent prints', 'firearms', 'toxicology', 'trace evidence'],
    good: (c) => `Your ${c.kind} analysis in the ${c.name} case held up in court.`, bad: (c) => `Your ${c.kind} result in the ${c.name} case was challenged and retested.`,
    tragedy: { text: 'An audit found contamination in your workspace. Dozens of cases must be retested.', perf: -12, rep: -15, stress: 10 },
    deck: [
      D('backlog', '📦', 'The Backlog and the DA', 'The DA wants your rape-kit results in two weeks for a trial. The backlog is eight months.', [
        { id: 'rush', label: '⚡ Rush it ahead of the queue', text: 'The result came back in time, and named a serial offender.', perf: 6, rep: 4, stress: 4 },
        { id: 'queue', label: '📋 Keep the queue fair', text: 'The trial was continued. Every case waited the same.', perf: 1 },
      ]),
      D('pressure', '🧪', 'An Inconclusive Result', 'A detective is pushing you to call an inconclusive print a match.', [
        { id: 'honest', label: '📝 Report it as inconclusive', text: 'The detective was furious. The case was built another way.', perf: 2, rep: 6 },
        { id: 'match', label: '✅ Call it a match', tone: 'danger', text: 'The detective was grateful.', perf: 2, offense: 'falseStatement', offenseContext: 'falsifying a forensic result', risk: { chance: 0.4, text: 'An independent review overturned your match. You\'re on the defense bar\'s list now.', perf: -20, fired: 'Falsified a forensic result' } },
      ]),
    ],
  },
  benefitsClaims: {
    label: 'Your Claims', icon: '📑', noun: 'claim', intake: [120, 260], cap: 300, stages: ['Received', 'Development', 'Rating', 'Decision', 'Closed'],
    kinds: ['disability claim', 'retirement claim', 'survivor benefits', 'appeal', 'overpayment waiver'],
    good: (c) => `${c.name}'s claim was decided right the first time.`, bad: (c) => `${c.name}'s claim was overturned on appeal.`,
    deck: [
      D('borderline', '🧾', 'The Borderline Claim', 'A veteran\'s claim is missing one piece of evidence. You could deny it today or develop it for months.', [
        { id: 'develop', label: '🔎 Develop the evidence', check: 40, text: 'You found the record. He got his rating and back pay.', perf: 3, rep: 5, fail: { text: 'It took eight months and the evidence didn\'t exist.', perf: -2 } },
        { id: 'deny', label: '📤 Deny it and let appeals sort it out', text: 'Your numbers looked great this month.', perf: 2, rep: -4 },
      ]),
    ],
  },
  oig: {
    label: 'Your Investigations', icon: '🔍', noun: 'investigation', intake: [4, 9], cap: 10, stages: ['Allegation', 'Records', 'Interviews', 'Report', 'Referral'],
    kinds: ['contract fraud', 'travel-card abuse', 'whistleblower retaliation', 'grant fraud', 'misconduct by a senior official', 'kickbacks'],
    good: (c) => `Your investigation of ${c.kind} (${c.name}) led to a referral and recovered funds.`, bad: (c) => `The ${c.kind} investigation of ${c.name} was closed unsubstantiated.`,
    deck: [
      D('political', '🏛️', 'A Call From Above', 'Your investigation is closing in on an appointee. The front office suggests "reprioritizing".', [
        { id: 'continue', label: '🔎 Keep going', check: 50, text: 'Your report went to Congress. The appointee resigned.', perf: 8, rep: 10, fail: { text: 'The case stalled and you were moved to audits.', perf: -4 } },
        { id: 'drop', label: '📁 Reprioritize', text: 'The front office was pleased.', perf: 1, rep: -8 },
      ]),
    ],
  },
  humanResources: {
    label: 'Your Cases', icon: '🧑‍💼', noun: 'case', intake: [10, 25], cap: 30, stages: ['Complaint', 'Interviews', 'Findings', 'Action', 'Closed'],
    kinds: ['harassment complaint', 'accommodation request', 'performance dispute', 'payroll error', 'layoff', 'retaliation claim'],
    good: (c) => `${c.name}'s ${c.kind} was resolved fairly.`, bad: (c) => `${c.name}'s ${c.kind} turned into a lawsuit.`,
    deck: [
      D('star', '⭐', 'The Star Performer', 'Three employees accuse the top salesperson of harassment. He brings in a fifth of revenue.', [
        { id: 'investigate', label: '🔎 Investigate properly', check: 45, text: 'Substantiated. He was fired; the company survived; the culture improved.', perf: 6, rep: 8, fail: { text: 'The investigation was sloppy and he sued. Messy.', perf: -4 } },
        { id: 'protect', label: '🙈 Quietly move the complainants', text: 'Leadership was happy.', perf: 2, rep: -10, risk: { chance: 0.35, text: 'It ended up in the press. Your name was in the article.', perf: -12, fired: 'Covered up a harassment complaint' } },
      ]),
    ],
  },
  legalSupport: {
    label: 'Your Files', icon: '📁', noun: 'file', intake: [20, 40], cap: 45, stages: ['Intake', 'Discovery', 'Motions', 'Trial prep', 'Closed'],
    kinds: ['personal injury', 'contract dispute', 'divorce', 'criminal defense', 'immigration', 'employment'],
    good: (c) => `The ${c.name} ${c.kind} matter settled well. The partner noticed your work.`, bad: (c) => `A missed deadline hurt the ${c.name} ${c.kind} matter.`,
    deck: [
      D('deadline', '⏰', 'The Filing Deadline', 'A filing is due at midnight and the attorney is unreachable.', [
        { id: 'file', label: '📤 Finish and file it yourself', check: 45, text: 'Filed at 11:52. The attorney owes you.', perf: 6, fail: { text: 'You missed a signature. The court rejected it.', perf: -6 } },
        { id: 'extension', label: '📞 Call opposing counsel for a stipulated extension', text: 'They agreed. Everybody exhaled.', perf: 3 },
      ]),
    ],
  },
  psychology: null,
};
CASE_CAREERS.psychology = { ...CASE_CAREERS.counseling, label: 'Your Patients', noun: 'patient', kinds: ['PTSD', 'OCD', 'neuropsych evaluation', 'custody evaluation', 'bipolar disorder', 'eating disorder'] };

const config = (job) => CASE_CAREERS[job?.professionId];
export const isCaseCareer = (job) => Boolean(config(job));
const fresh = () => ({ focus: 'balanced', cases: [], closed: 0, good: 0, bad: 0 });

export function caseView(state) {
  const cfg = config(state.career.job);
  if (!cfg) return null;
  const rec = peekLife(state, 'caseload');
  return { cfg, rec: rec?.professionId === state.career.job.professionId ? rec : null };
}

/** Big caseloads (a lab's bench, a claims desk) keep a sample: each named case stands for `scale` real ones. */
export const scaleOf = (cfg) => Math.max(1, Math.round(cfg.cap / 24));
/** How many (named) cases a new year brings: managers carry a lighter load. */
const intake = (rng, cfg, job) => Math.round(rng.int(cfg.intake[0], cfg.intake[1]) * (job.track === 'mgmt' ? 0.4 : 1) / scaleOf(cfg));

export const CaseloadModule = {
  id: 'caseload',
  order: 31.3,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const cfg = config(job);
    if (!cfg || state.legal.incarceration) return;
    const rec = lifeOf(state, 'caseload', job.professionId, fresh());
    const f = FOCUS[rec.focus] ?? FOCUS.balanced;
    const sk = skill(state, W);
    // Work the open cases.
    const still = [];
    let good = 0;
    let bad = 0;
    for (const c of rec.cases) {
      // A year's work moves a case a few stages: faster when you rush, slower when it's hard.
      const pts = f.speed * (0.6 + sk / 120) * 4 / c.difficulty;
      c.stage += Math.floor(pts) + (rng.chance(pts % 1) ? 1 : 0);
      if (c.stage < cfg.stages.length - 1) { still.push(c); continue; }
      const ok = rng.chance(clamp(0.55 + f.quality + (sk - 55) / 150 - (c.difficulty - 2) * 0.08 + (rec.rep - 50) / 400, 0.15, 0.95));
      rec.closed += 1;
      if (ok) { rec.good += 1; good += 1; } else { rec.bad += 1; bad += 1; }
      if (good + bad <= 2) ctx.log(ok ? cfg.good(c) : cfg.bad(c), cfg.icon, ok ? 'good' : 'warn');
    }
    rec.cases = still;
    // New cases arrive.
    for (let i = 0; i < intake(rng, cfg, job); i++) {
      const n = randomName(rng, rng.pick(['male', 'female']));
      rec.cases.push({ id: rng.id('case_'), name: n.lastName, kind: rng.pick(cfg.kinds), difficulty: rng.int(1, 3), stage: 0, opened: state.character.age });
    }
    // The year's record.
    if (good + bad) {
      job.performance = Math.round(clamp(job.performance + (good - bad * 1.5) / Math.max(1, good + bad) * 6, 0, 100));
      rec.rep = Math.round(clamp(rec.rep + (good - bad * 2), 0, 100));
      const k = scaleOf(cfg);
      ctx.log(`${cfg.label}: ${good * k} ${cfg.noun}${good * k === 1 ? '' : 's'} closed well, ${bad * k} badly; ${rec.cases.length * k} open.`, cfg.icon);
    }
    // Too many open cases is burnout.
    const k = scaleOf(cfg);
    const cap = cfg.cap / k;
    const over = rec.cases.length - cap;
    ctx.stat('stress', f.stress + (over > 0 ? Math.min(10, Math.ceil(over / Math.max(1, cap / 8))) : 0));
    if (over > cap * 0.5) ctx.log(`Your caseload is crushing: ${rec.cases.length * k} open against a standard of ${cfg.cap}.`, '😩', 'warn');
    if (cfg.tragedy && bad && rng.chance(0.04 + (f === FOCUS.triage ? 0.04 : 0) + Math.max(0, over) / (cap * 8))) applyFx(ctx, rec, cfg.tragedy, '🕯️');
    if (rec.rep >= 85 && rng.chance(0.15)) applyFx(ctx, rec, { text: 'Your work was recognized with an award from your profession.', perf: 4, honor: { id: `case.${job.professionId}.award`, name: `${cfg.label === 'Your Bench' ? 'Analyst' : 'Practitioner'} of the Year`, icon: '🏆' } }, '🏆');
    if (cfg.deck?.length && rng.chance(0.65) && !state.prompts.some((p) => p.type === 'caseload.case')) {
      const d = rng.pick(cfg.deck);
      ctx.prompt({ type: 'caseload.case', icon: d.icon, title: d.title, text: d.text, options: promptOptions(d.options), data: { deckId: d.id, professionId: job.professionId } });
    }
  },
  actions: {
    /** arg: thorough | balanced | triage */
    focus(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      if (!config(job) || !FOCUS[id]) return;
      if (yearlyCount(state, 'caseload.focus')) return ctx.toast('You set your approach once a year.', 'warn');
      bumpYearly(state, 'caseload.focus');
      lifeOf(state, 'caseload', job.professionId, fresh()).focus = id;
      ctx.log(`You changed how you work your caseload: ${FOCUS[id].name.toLowerCase()}. ${FOCUS[id].desc}`, FOCUS[id].icon);
      return undefined;
    },
  },
  resolvers: {
    case(ctx, data, optionId) {
      const job = ctx.state.career.job;
      const cfg = CASE_CAREERS[data.professionId];
      const d = cfg?.deck?.find((x) => x.id === data.deckId);
      if (!d || !job) return;
      resolveOption(ctx, lifeOf(ctx.state, 'caseload', job.professionId, fresh()), d.options.find((o) => o.id === optionId), d.icon, W);
    },
  },
};
