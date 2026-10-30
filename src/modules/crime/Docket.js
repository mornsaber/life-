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
  return null;
}
export const ROLE_LABEL = { police: 'Investigations', prosecutor: 'Prosecutions', defender: 'Clients', lawyer: 'Matters', judge: 'Your Court' };
const INTAKE = { police: [1, 3], prosecutor: [1, 3], defender: [2, 3], lawyer: [1, 2], judge: [1, 3] };
const MAX_OPEN = 6;
/** Years a case can sit before it resolves without you. */
const PATIENCE = { police: 3, prosecutor: 2, defender: 2, lawyer: 3, judge: 2 };

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
  const text = {
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
  ],
  prosecutor: [{ id: 'prep', label: '📚 Prepare the case', hint: 'Witnesses, experts, exhibits', gain: [0.04, 0.12], stress: 3 }],
  defender: [{ id: 'prep', label: '🔍 Investigate the case', hint: 'Find what the police missed', gain: [0.03, 0.12], stress: 3 }],
  lawyer: [{ id: 'prep', label: '📚 Work the file', hint: 'Discovery, research, diligence', gain: [0.03, 0.1], stress: 3 }],
  judge: [{ id: 'prep', label: '📖 Read every brief', hint: 'Halves the chance of reversal', stress: 2 }],
};

/** Resolution choices for a case. */
export function resolutions(c) {
  if (c.role === 'police') return [
    { id: 'arrest', label: '🚓 Arrest and charge', hint: c.strength >= 0.5 ? 'The evidence should hold' : 'Weak: it may be thrown out' },
    { id: 'shelve', label: '🗄️ Shelve it', hint: 'Move on to cases you can solve' },
  ];
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
      return ctx.log(workNote(c, act, gain), work.label.split(' ')[0], gain >= 0.15 ? 'good' : gain < 0.02 ? 'muted' : 'info');
    }
    if (!resolutions(c).some((r) => r.id === act)) return;
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

function policeResolve(ctx, c, act) {
  const { rng } = ctx;
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
