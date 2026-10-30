/**
 * Your docket: the cases on your desk in the justice careers, kept open from year to year until
 * you close them (Legal → Cases).
 *
 *   Police       Investigations. Canvass, send evidence to the lab, interview the suspect; arrest
 *                when the evidence will hold (a weak arrest is thrown out), or shelve it.
 *   Prosecutors  Cases the police send you. Prepare, then go to trial, offer a plea, or decline.
 *   Defenders    Clients the court assigns. Investigate, then trial, plea, or a suppression motion.
 *   Lawyers      Your area's matters (suits, deals, defence). Prepare, then make the call.
 *   Judges       Your court's cases. Read the briefs (fewer reversals), then rule.
 *
 * Each case can be worked once a year and resolved any time. Cases left too long resolve without
 * you — they go cold, the speedy-trial clock dismisses them, the client takes a plea — and a heavy
 * docket is stressful. Wins, losses and pleas feed the same records as the year's big decisions
 * (law reputation, a judge's rulings and reversals, performance).
 *
 * case = { id, role, kind, title, text, strength, prep, opened, due, suspect?, offenseId?, matter?, judge? }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { OFFENSES } from '../legal/Offenses.js';
import { MATTERS, KIND_OPTIONS, areaOf, resolveMatter, AREAS } from '../law/LegalPractice.js';
import { currentCourt, caseTier, JUDGE_CASES, rule } from '../legal/Judiciary.js';
import { docketOf, recordCase, gist } from './DocketRecord.js';
import { SIMPLE_ROLES, simpleRole } from './DocketRoles.js';
import { commitOffense } from '../legal/JusticeSystem.js';

/* ------------------------------------------------------------------ */
/* Who has a docket                                                    */
/* ------------------------------------------------------------------ */

const POLICE = ['police', 'sheriff', 'statePolice', 'transitPolice', 'airportPolice', 'universityPolice', 'fbi', 'dea'];
const FEDERAL = ['fbi', 'dea'];
// Recruits and clerks don't carry cases; commanders and chiefs supervise those who do.
const NO_CASES = /^(recruit|cadet|trainee|clerk|court)$|_cmd\d$|^(chief|first|undersheriff|superintendent|sac|deputyChief|managingPartner|major)$/;
const PATROL_SUPERVISORS = /^(sergeant|lieutenant|captain)$/;
const DETECTIVE = /det|investigator|majorCrimes|agent|senior|bau|ssa|asac|undercover/;

/** Your docket role: 'police' | 'prosecutor' | 'defender' | 'lawyer' | 'judge' | null. */
export function docketRole(state) {
  if (currentCourt(state) && state.judiciary?.seat) return 'judge';
  const job = state.career.job;
  if (!job || state.legal.incarceration || NO_CASES.test(job.levelId ?? '')) return null;
  if (POLICE.includes(job.professionId)) return PATROL_SUPERVISORS.test(job.levelId) ? null : 'police';
  if (job.professionId === 'prosecution') return 'prosecutor';
  if (job.professionId === 'publicDefender') return 'defender';
  if (job.professionId === 'law' && areaOf(state)) return areaOf(state) === 'criminal' ? 'defender' : 'lawyer';
  return simpleRole(job);
}
export const ROLE_LABEL = { police: 'Investigations', prosecutor: 'Prosecutions', defender: 'Clients', lawyer: 'Matters', judge: 'Your Court', ...Object.fromEntries(Object.entries(SIMPLE_ROLES).map(([k, r]) => [k, r.label])) };
/** For the view: icon, noun and what the strength bar measures. */
export const docketMeta = (role) => SIMPLE_ROLES[role] ?? {
  police: { icon: '🚓', noun: 'investigation', strength: '🧾 Evidence' },
  prosecutor: { icon: '⚖️', noun: 'prosecution', strength: '⚖️ Strength of your case' },
  defender: { icon: '🛡️', noun: 'client', strength: '🛡️ Your client\'s position' },
  lawyer: { icon: '💼', noun: 'matter', strength: '📂 Your position' },
  judge: { icon: '🧑‍⚖️', noun: 'case', strength: null },
}[role] ?? { icon: '📚', noun: 'case' };
const INTAKE = { police: [1, 3], prosecutor: [1, 3], defender: [2, 3], lawyer: [1, 2], judge: [1, 3], ...Object.fromEntries(Object.entries(SIMPLE_ROLES).map(([k, r]) => [k, r.intake])) };
const MAX_OPEN = 6;
/** Years a case can sit before it resolves without you. */
const PATIENCE = { police: 3, prosecutor: 2, defender: 2, lawyer: 3, judge: 2, ...Object.fromEntries(Object.entries(SIMPLE_ROLES).map(([k, r]) => [k, r.patience])) };

/* ------------------------------------------------------------------ */
/* New cases                                                           */
/* ------------------------------------------------------------------ */

const PATROL_CRIMES = ['shoplifting', 'assault', 'dui', 'burglary', 'drugPossession', 'vandalism', 'domesticAbuse'];
const DETECTIVE_CRIMES = ['burglary', 'robbery', 'armedRobbery', 'aggravatedAssault', 'murder', 'rape', 'sexualAssault', 'drugTrafficking', 'domesticAbuse', 'arson', 'grandTheft'];
const FEDERAL_CRIMES = { fbi: ['embezzlement', 'identityTheft', 'armedRobbery', 'drugTrafficking'], dea: ['drugTrafficking'] };
const COURT_CRIMES = ['burglary', 'robbery', 'aggravatedAssault', 'drugTrafficking', 'domesticAbuse', 'grandTheft', 'dui', 'assault', 'embezzlement', 'murder', 'sexualAssault'];

const SCENES = {
  shoplifting: 'A store reports a man who walks out with electronics every week.',
  assault: 'A fight outside a bar left a man with a broken nose. Everyone was drunk; everyone tells it differently.',
  dui: 'A car went through a fence at 2 a.m. The driver says someone else was driving.',
  burglary: 'Three houses on one street were broken into on three Tuesdays in a row.',
  drugPossession: 'A tip about dealing from a flat above a launderette.',
  vandalism: 'Someone has been smashing car windows across a car park, night after night.',
  domesticAbuse: 'A neighbour called about screaming. The woman who answered the door had a split lip and said she fell.',
  robbery: 'A pensioner was knocked down and robbed at a cash machine. There\'s a partial image on the bank\'s camera.',
  armedRobbery: 'Two men with a shotgun robbed a petrol station. The car was found burned out two miles away.',
  aggravatedAssault: 'A man was stabbed in a stairwell. He survived and says he didn\'t see who did it. He did.',
  murder: 'A body in a canal. The victim had debts, a jealous ex and a business partner who has stopped answering his phone.',
  rape: 'A student reports she was raped after a party. She knows his first name and the house he lives in.',
  sexualAssault: 'A woman reports a man who groped her on the night bus. He has done it before: there are two other reports.',
  drugTrafficking: 'A courier was stopped with two kilos in a spare tyre. He is more afraid of the people who sent him than of you.',
  arson: 'A failing restaurant burned down a week after its insurance was increased.',
  grandTheft: 'A car-park attendant has been selling customers\' cars abroad.',
  embezzlement: 'A charity\'s treasurer bought a holiday home. The charity\'s accounts don\'t add up.',
  identityTheft: 'Two hundred people\'s bank accounts were opened in their names from one address.',
};

const name = (rng, gender = rng.chance(0.75) ? 'male' : 'female') => { const n = randomName(rng, gender); return `${n.firstName} ${n.lastName}`; };
/** Scenes that name the suspect as a man. */
const MALE_SUSPECT = ['rape', 'sexualAssault', 'drugTrafficking'];

function newCase(state, role, rng) {
  const d = docketOf(state);
  const id = `d${(d.seq = (d.seq ?? 0) + 1)}`;
  const age = state.character.age;
  const base = { id, role, prep: 0, opened: age, due: age + PATIENCE[role] };
  const strength = rng.float(0.15, 0.85);
  if (SIMPLE_ROLES[role]) return { ...base, kind: 'simple', ...SIMPLE_ROLES[role].make(rng, state) };
  if (role === 'police') {
    const job = state.career.job;
    const pool = FEDERAL_CRIMES[job.professionId] ?? (DETECTIVE.test(job.levelId) ? DETECTIVE_CRIMES : PATROL_CRIMES);
    const offenseId = rng.pick(pool);
    return { ...base, kind: 'investigation', offenseId, title: OFFENSES[offenseId].name, text: SCENES[offenseId] ?? 'A report on your desk.', strength: rng.float(0.05, 0.4), suspect: name(rng, MALE_SUSPECT.includes(offenseId) ? 'male' : undefined) };
  }
  if (role === 'prosecutor' || role === 'defender') {
    const offenseId = rng.pick(COURT_CRIMES);
    const who = name(rng);
    const kind = role === 'prosecutor' ? 'prosecution' : 'defense';
    const facts = role === 'prosecutor'
      ? `${who} is charged with ${OFFENSES[offenseId].name.toLowerCase()}. ${strength > 0.65 ? 'The evidence is solid.' : strength > 0.4 ? 'The evidence is decent, with holes a good defence lawyer will find.' : 'The evidence is thin: the police want a charge more than they have a case.'}`
      : `${who} is charged with ${OFFENSES[offenseId].name.toLowerCase()}. ${strength > 0.65 ? 'The prosecution\'s case has real problems.' : strength > 0.4 ? 'It could go either way.' : 'The evidence against your client is strong.'}`;
    return { ...base, kind, offenseId, title: `${OFFENSES[offenseId].name} — ${who}`, text: facts, strength, suspect: who, suppress: kind === 'defense' && rng.chance(0.25) };
  }
  if (role === 'lawyer') {
    const area = areaOf(state);
    const pool = MATTERS.filter((m) => m.areas.includes(area));
    const m = rng.pick(pool.length ? pool : MATTERS.filter((x) => x.kind === 'civil'));
    return { ...base, kind: m.kind, title: gist(m.text), text: m.text, strength: clamp(m.strength + rng.float(-0.1, 0.1), 0.05, 0.95), big: m.big, suppress: m.suppress };
  }
  // A judge: the court's own kind of case.
  const court = currentCourt(state);
  const k = rng.pick(JUDGE_CASES[caseTier(court)]);
  return { ...base, kind: 'ruling', judge: { caseId: k.id, court }, title: k.title, text: k.text.replace('{issue}', k.issues ? rng.pick(k.issues) : 'the matter before you'), strength: 0.5 };
}

/* ------------------------------------------------------------------ */
/* Yearly                                                              */
/* ------------------------------------------------------------------ */

/** Yearly: new cases arrive, old ones resolve without you, a heavy docket weighs on you. */
export function docketTick(ctx) {
  const { state, rng } = ctx;
  const d = docketOf(state);
  const role = docketRole(state);
  // Changed jobs: your cases go to whoever replaced you.
  const handed = d.open.filter((c) => c.role !== role);
  if (handed.length) {
    d.open = d.open.filter((c) => c.role === role);
    ctx.log(`You handed over ${handed.length} open case${handed.length > 1 ? 's' : ''}.`, '🗂️', 'muted');
  }
  if (!role) return;
  for (const c of [...d.open]) if (state.character.age > c.due) lapse(ctx, c);
  const n = Math.min(MAX_OPEN - d.open.length, rng.int(...INTAKE[role]));
  for (let i = 0; i < n; i++) d.open.push(newCase(state, role, rng));
  if (d.open.length >= 5) ctx.stat('stress', 3);
}

/** A case left too long resolves without you. */
function lapse(ctx, c) {
  const { state } = ctx;
  const text = SIMPLE_ROLES[c.role]?.lapse(c) ?? {
    police: `The ${c.title.toLowerCase()} case went cold. ${c.suspect} was never charged.`,
    prosecutor: `The speedy-trial clock ran out on ${c.title}: the judge dismissed it.`,
    defender: `${c.suspect} got tired of waiting for you and took the prosecutor's plea offer.`,
    lawyer: 'Your client lost patience and took the file to another firm.',
    judge: `${c.title}: the delay drew a complaint to the judicial conduct board.`,
  }[c.role];
  close(ctx, c, c.role === 'defender' ? 'settle' : 'lapsed', text);
  ctx.emit('career:adjust', { performance: -3 });
  if (c.role === 'judge' && state.judiciary.seat) state.judiciary.seat.approval = Math.max(0, state.judiciary.seat.approval - 3);
  ctx.log(text, '⏳', 'warn');
}

function close(ctx, c, result, note) {
  const d = docketOf(ctx.state);
  d.open = d.open.filter((x) => x !== c);
  recordCase(ctx.state, { role: c.role, title: c.title, result, note });
}

/* ------------------------------------------------------------------ */
/* What you can do                                                     */
/* ------------------------------------------------------------------ */

/** Work actions (once a year per case): what raises the case's strength. */
const WORK = {
  police: [
    { id: 'canvass', label: '🚪 Canvass for witnesses', hint: 'Slow, sometimes decisive', gain: [0.05, 0.25], stress: 3 },
    { id: 'lab', label: '🧪 Send evidence to the lab', hint: 'Strong if it hits', gain: [0, 0.35], stress: 1 },
    { id: 'interview', label: '🗣️ Interview the suspect', hint: 'A confession — or a lawyer', gain: [-0.05, 0.3], stress: 2 },
    // Informants and hard interviews get results — and carry their own risks.
    { id: 'informant', label: '🐀 Work an informant', hint: 'Good intel; informants get burned', gain: [0.05, 0.3], stress: 2, risk: { chance: 0.12, text: (c) => `Your informant on the ${c.title.toLowerCase()} case was exposed and beaten. Your sergeant wants to know how.`, perf: -3, stress: 6 } },
    { id: 'pressure', label: '😤 Lean hard in the interview room', hint: 'Confessions — and complaints', gain: [0.1, 0.35], stress: 3, risk: { chance: 0.22, text: () => 'The suspect\'s lawyer filed a complaint. Internal Affairs opened a file on you.', perf: -5, ia: true } },
  ],
  prosecutor: [
    { id: 'prep', label: '📚 Prepare the case', hint: 'Witnesses, experts, exhibits', gain: [0.04, 0.12], stress: 3 },
    { id: 'witness', label: '🗣️ Prepare your star witness', hint: 'They make or break it — and some recant', gain: [0.05, 0.18], stress: 2, risk: { chance: 0.12, text: (c) => `Your key witness in ${c.title} stopped returning calls, then recanted.`, gain: -0.25 } },
    { id: 'jury', label: '🧑‍⚖️ Work jury selection', hint: 'Strike the jurors who\'ll never convict', gain: [0.02, 0.1], stress: 2 },
  ],
  defender: [
    { id: 'prep', label: '🔍 Investigate the case', hint: 'Find what the police missed', gain: [0.03, 0.12], stress: 3 },
    { id: 'jury', label: '🧑‍⚖️ Work jury selection', hint: 'One juror with doubts is enough', gain: [0.02, 0.1], stress: 2 },
  ],
  lawyer: [{ id: 'prep', label: '📚 Work the file', hint: 'Discovery, research, diligence', gain: [0.03, 0.1], stress: 3 }],
  judge: [{ id: 'prep', label: '📖 Read every brief', hint: 'Halves the chance of reversal', stress: 2 }],
  ...Object.fromEntries(Object.entries(SIMPLE_ROLES).map(([k, r]) => [k, r.work])),
};

/** Resolution choices for a case. */
/** Crimes with money behind them: someone will offer to make the file disappear. */
const BRIBABLE = ['drugTrafficking', 'grandTheft', 'embezzlement', 'identityTheft', 'arson'];
export function resolutions(c) {
  if (SIMPLE_ROLES[c.role]) return SIMPLE_ROLES[c.role].resolve;
  if (c.role === 'police') return [
    { id: 'arrest', label: '🚓 Arrest and charge', hint: c.strength >= 0.5 ? 'The evidence should hold' : 'Weak: it may be thrown out' },
    { id: 'shelve', label: '🗄️ Shelve it', hint: 'Move on to cases you can solve' },
    ...(BRIBABLE.includes(c.offenseId) ? [{ id: 'bury', label: '💵 Take the envelope; lose the file', hint: 'A crime, and a career-ender if caught', tone: 'danger' }] : []),
  ];
  if (['prosecution', 'defense'].includes(c.kind)) return [...KIND_OPTIONS[c.kind], { id: 'negotiate', label: '🤝 Negotiate hard for a better deal', hint: 'Your leverage is the case\'s strength' }];
  if (c.role === 'judge') {
    const k = [...JUDGE_CASES.trial, ...JUDGE_CASES.appellate, ...JUDGE_CASES.supreme].find((x) => x.id === c.judge.caseId);
    return (k?.options ?? []).map(([id, label]) => ({ id, label }));
  }
  return KIND_OPTIONS[c.kind] ?? [];
}
export const workActions = (c) => WORK[c.role] ?? [];

export const DocketActions = {
  /** arg "caseId:action" — work the case or resolve it. */
  docket(ctx, arg) {
    const { state, rng } = ctx;
    const [id, act] = String(arg).split(':');
    const d = docketOf(state);
    const c = d.open.find((x) => x.id === id);
    if (!c) return ctx.toast('That case is closed', 'warn');
    const work = WORK[c.role]?.find((w) => w.id === act);
    if (work) {
      const key = `docket.${c.id}.${act}`;
      if (yearlyCount(state, key)) return ctx.toast('Once a year for each case', 'warn');
      bumpYearly(state, key);
      c.prep += 1;
      ctx.stat('stress', work.stress);
      if (c.role === 'judge') { c.careful = true; return ctx.log(`You read every brief in ${c.title.toLowerCase()}, twice.`, '📖'); }
      const gain = rng.float(...work.gain);
      c.strength = clamp(c.strength + gain, 0.02, 0.97);
      if (work.offense) commitOffense(ctx, { offenseId: work.offense.id, discovery: work.offense.discovery, evidence: 0.6, context: work.offense.context });
      if (work.risk && rng.chance(work.risk.chance)) {
        if (work.risk.gain) c.strength = clamp(c.strength + work.risk.gain, 0.02, 0.97);
        if (work.risk.perf) ctx.emit('career:adjust', { performance: work.risk.perf });
        if (work.risk.stress) ctx.stat('stress', work.risk.stress);
        if (work.risk.ia) iaComplaint(ctx);
        return ctx.log(work.risk.text(c), '⚠️', 'bad');
      }
      return ctx.log(workNote(c, act, gain), work.label.split(' ')[0], gain >= 0.15 ? 'good' : gain < 0.02 ? 'muted' : 'info');
    }
    if (!resolutions(c).some((r) => r.id === act)) return;
    if (SIMPLE_ROLES[c.role]) return simpleResolve(ctx, c, act);
    if (act === 'negotiate') return negotiate(ctx, c);
    if (c.role === 'police') return policeResolve(ctx, c, act);
    if (c.role === 'judge') {
      const out = rule(ctx, c.judge, act, { careful: c.careful });
      return close(ctx, c, out?.reversed ? 'reversed' : 'ruled', out ? `Ruled: ${out.ruling}.` : '');
    }
    const out = resolveMatter(ctx, { matter: { kind: c.kind, strength: c.strength, big: c.big, suppress: c.suppress, text: c.text } }, act);
    if (out) close(ctx, c, out.result, out.note);
  },
};

function workNote(c, act, gain) {
  const good = gain >= 0.15;
  if (act === 'canvass') return good ? `A neighbour finally talked: they saw ${c.suspect} that night.` : 'Two days of doors. Nobody saw anything.';
  if (act === 'lab') return good ? `The lab came back: ${c.suspect}'s DNA.` : gain < 0.05 ? 'The lab results were inconclusive.' : 'A partial match. It helps.';
  if (act === 'interview') return gain >= 0.2 ? `${c.suspect} changed their story three times, then asked what kind of deal there might be.` : gain < 0 ? `${c.suspect} lawyered up and you gave away more than you got.` : `${c.suspect} said nothing useful — but said it nervously.`;
  return good ? 'The work paid off: you found something that changes the case.' : 'Hours of work, a slightly better file.';
}

/** A role from DocketRoles: run its resolution and apply what it says. */
function simpleResolve(ctx, c, act) {
  const out = SIMPLE_ROLES[c.role].resolve.find((r) => r.id === act).run(c, ctx.rng);
  if (out.perf) ctx.emit('career:adjust', { performance: out.perf });
  if (out.money > 0) ctx.earn(out.money, 'Case fee', { wage: true, selfEmployed: true });
  if (out.money < 0) ctx.spend(-out.money, 'Libel settlement (your share)', { allowDebt: true });
  if (out.fame) ctx.emit('fame:buzz', { amount: out.fame });
  if (out.trauma) ctx.emit('health:trauma', { amount: out.trauma, source: 'casework' });
  close(ctx, c, out.result, out.note);
  ctx.log(out.note, SIMPLE_ROLES[c.role].icon, out.result === 'win' ? 'good' : out.result === 'loss' ? 'bad' : 'info');
}

/** Plea bargaining: your leverage is the case's strength; a strong hand gets the better deal. */
function negotiate(ctx, c) {
  const { state, rng } = ctx;
  const l = (state.law ??= { reputation: 30, wins: 0, losses: 0, settled: 0, book: 0, hours: 2000, burnout: 0, seen: [] });
  const strong = rng.chance(clamp(c.strength * 0.9 + (l.reputation ?? 30) / 400, 0.05, 0.9));
  const prosecutor = c.kind === 'prosecution';
  const note = strong
    ? (prosecutor ? `${c.suspect}'s lawyer folded: a plea to the top count, no trial needed.` : `You got the charges against ${c.suspect} reduced to a misdemeanour — no jail.`)
    : (prosecutor ? `${c.suspect} pleaded to a lesser charge after three rounds of offers.` : `${c.suspect} took the standard offer. You couldn't move them.`);
  if (strong) { l.wins = (l.wins ?? 0) + 1; l.reputation = clamp((l.reputation ?? 30) + 3, 0, 100); ctx.emit('career:adjust', { performance: 3 }); } else l.settled = (l.settled ?? 0) + 1;
  close(ctx, c, strong ? 'win' : 'settle', note);
  ctx.log(note, '🤝', strong ? 'good' : 'info');
}

/** Internal Affairs: complaints add up; three and you're out. */
function iaComplaint(ctx) {
  const { state } = ctx;
  const d = docketOf(state);
  d.ia = (d.ia ?? 0) + 1;
  if (d.ia >= 3) {
    d.ia = 0;
    ctx.log('Internal Affairs sustained a third complaint against you. The chief accepted your resignation.', '📛', 'bad');
    ctx.emit('career:resign', { reason: 'Resigned after Internal Affairs findings', fired: true });
  }
}

function policeResolve(ctx, c, act) {
  const { rng } = ctx;
  if (act === 'bury') {
    const cash = Math.round(rng.int(10, 60) * 1000);
    ctx.earn(cash, 'Undisclosed income');
    close(ctx, c, 'lapsed', `The ${c.title.toLowerCase()} file went missing.`);
    commitOffense(ctx, { offenseId: 'publicCorruption', discovery: 0.25, evidence: 0.7, context: `taking $${cash.toLocaleString()} to bury a ${c.title.toLowerCase()} case` });
    return ctx.log(`An envelope with $${cash.toLocaleString()} in it, and the ${c.title.toLowerCase()} case file went missing from your desk.`, '💵', 'warn');
  }
  if (act === 'shelve') {
    close(ctx, c, 'lapsed', `Shelved: the ${c.title.toLowerCase()} case.`);
    ctx.emit('career:adjust', { performance: -1 });
    return ctx.log(`You shelved the ${c.title.toLowerCase()} case.`, '🗄️', 'muted');
  }
  // The prosecutor decides; a jury decides after that.
  if (!rng.chance(clamp(c.strength * 1.3, 0.05, 0.97))) {
    close(ctx, c, 'loss', `${c.suspect} was released without charge.`);
    ctx.emit('career:adjust', { performance: -3 });
    return ctx.log(`You arrested ${c.suspect}, but the prosecutor wouldn't charge on what you had. Released.`, '🔓', 'bad');
  }
  const convicted = rng.chance(clamp(c.strength, 0.1, 0.95));
  close(ctx, c, convicted ? 'win' : 'settle', convicted ? `${c.suspect} was convicted.` : `${c.suspect} was charged and acquitted.`);
  ctx.emit('career:adjust', { performance: convicted ? 5 : 2 });
  if (['murder', 'rape', 'armedRobbery'].includes(c.offenseId) && convicted) ctx.stat('happiness', 4);
  ctx.log(convicted ? `Case cleared: ${c.suspect} was charged and convicted of ${OFFENSES[c.offenseId].name.toLowerCase()}.` : `${c.suspect} was charged; the jury acquitted. The case is cleared on paper.`, '🚓', convicted ? 'good' : 'info');
}

/** For the view: the year's work done on a case. */
export const workedThisYear = (state, c, act) => Boolean(yearlyCount(state, `docket.${c.id}.${act}`));
export { docketOf, AREAS };
