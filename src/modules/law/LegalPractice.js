/**
 * The law, as a career worth playing:
 *
 *   Pre-law      The LSAT (120–180; good for five years) where law is a graduate degree.
 *   Law school   1L exams set your class rank; the top tenth is invited onto law review.
 *                On-campus interviews in 2L decide your summer job, and a summer job is
 *                how most big-firm associates are hired. Moot court for the trial-minded.
 *                Top graduates are offered judicial clerkships.
 *   Practice     Pick a practice area (litigation, corporate, criminal defense, family,
 *                IP, personal injury, employment, immigration). Most years a matter lands
 *                on your desk: read the facts and choose — try it, settle, file the motion,
 *                take the plea, close the deal or walk away. Wins build your reputation
 *                and your book of business; your billable-hours target trades money for
 *                burnout. Prosecutors decide what to charge; public defenders fight for
 *                clients nobody else will.
 *   The firm     Up or out: senior associates at bigger firms face a partnership vote
 *                (reputation, book, hours). Partners take a draw from the business they
 *                bring in. Pro bono work, ethics traps (a client who wants to lie, padded
 *                bills) that can cost you your licence.
 *   The bar      Where the profession is split (the UK, Ireland, Australia, India, South
 *                Africa), you can practise as an advocate from chambers, and senior
 *                advocates can apply for silk — King's Counsel, Senior Counsel, Senior
 *                Advocate of Nigeria.
 *
 * state.law = { lsat, lsatAge, lsatTries, school: { rank, lawReview, moot, oci }, offer,
 *   clerkship, area, chambers, hours, book, reputation, wins, losses, settled, burnout,
 *   partnerVote, silk, proBono, seen: [ids] }
 */
import { recordCase, gist } from '../crime/DocketRecord.js';
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, addHonor, yearsInProfession } from '../../core/State.js';
import { ADMISSION_HOOKS } from '../education/EducationEngine.js';
import { undergradEntryYears } from '../world/Education.js';
import { lawSystem } from '../world/ProfessionStandards.js';
import { SCHOOLS } from '../education/Catalog.js';
import { hire, promote, leaveJob } from '../career/CareerEngine.js';
import { createEmployer } from '../career/Employers.js';
import { getProfession } from '../career/JobTrees.js';
import { recalcSalary } from '../career/Compensation.js';
import { Random } from '../../core/Random.js';

export const LSAT = { min: 120, max: 180, mean: 152, cost: 238, prepCost: 1500, validYears: 5 };
export const LAWYERS = ['law', 'prosecution', 'publicDefender'];
const LAW_SCHOOL = ['jd', 'jdmba'];
export const isLawyer = (job) => Boolean(job && LAWYERS.includes(job.professionId));
const law = (state) => (state.law ??= { reputation: 30, wins: 0, losses: 0, settled: 0, book: 0, hours: 2000, burnout: 0, seen: [] });
const gradEntry = (state) => (state.character.countryId ?? 'US') === 'US' || ['CA'].includes(state.character.countryId);

/* ------------------------------------------------------------------ */
/* Practice areas                                                      */
/* ------------------------------------------------------------------ */

/** pay: salary multiplier · stress: per year · kind: the kind of matters you get */
export const AREAS = {
  litigation: { name: 'Commercial Litigation', icon: '⚖️', pay: 1.05, stress: 6, kinds: ['civil'] },
  corporate: { name: 'Corporate & M&A', icon: '🤝', pay: 1.15, stress: 7, kinds: ['deal'] },
  criminal: { name: 'Criminal Defense', icon: '🚔', pay: 0.85, stress: 7, kinds: ['defense'] },
  family: { name: 'Family Law', icon: '👪', pay: 0.85, stress: 6, kinds: ['civil'] },
  ip: { name: 'Intellectual Property', icon: '💡', pay: 1.2, stress: 4, kinds: ['civil', 'deal'] },
  injury: { name: 'Personal Injury', icon: '🚑', pay: 0.95, stress: 5, kinds: ['civil'], contingency: true },
  employment: { name: 'Employment Law', icon: '🧑‍💼', pay: 0.95, stress: 5, kinds: ['civil'] },
  immigration: { name: 'Immigration Law', icon: '🛂', pay: 0.8, stress: 5, kinds: ['civil'] },
};
export const HOURS = { 1800: { label: '1,800 hours', bonus: 0, stress: 0, perf: 0 }, 2100: { label: '2,100 hours', bonus: 0.1, stress: 5, perf: 4 }, 2400: { label: '2,400 hours', bonus: 0.22, stress: 11, perf: 8 } };

export function areaOf(state, job = state.career.job) {
  if (job?.professionId === 'prosecution') return 'prosecution';
  if (job?.professionId === 'publicDefender') return 'criminal';
  return state.law?.area ?? null;
}

/* ------------------------------------------------------------------ */
/* Matters: read the facts, make the call                              */
/* ------------------------------------------------------------------ */

/**
 * strength: how good your side's position really is (0–1) — the facts say so, if you read them.
 * kind: civil (try / settle / motion), deal (close / renegotiate / walk), defense (trial /
 * plea / suppress), prosecution (charge / plea / dismiss).
 */
export const MATTERS = [
  // Civil litigation and the like
  { id: 'emails', areas: ['litigation', 'employment'], kind: 'civil', strength: 0.85, big: true, text: 'Your client claims a supplier deliberately broke an exclusive contract. Discovery just turned up the supplier\'s CEO emailing: "Let\'s ignore the exclusivity — they\'ll never sue."' },
  { id: 'noContract', areas: ['litigation'], kind: 'civil', strength: 0.2, text: 'Your client insists a handshake deal worth millions was binding. There\'s nothing in writing, and the only witness is your client\'s brother.' },
  { id: 'trade', areas: ['litigation', 'ip'], kind: 'civil', strength: 0.6, text: 'A former engineer left your client for a rival and took files with her. The files are on her laptop — but she says she was told she could keep them, and there\'s an old email suggesting she might be right.' },
  { id: 'custodyGood', areas: ['family'], kind: 'civil', strength: 0.8, text: 'Your client has been the children\'s main caregiver for years; school and doctor records back it up. The other parent missed half of their scheduled visits last year.' },
  { id: 'custodyBad', areas: ['family'], kind: 'civil', strength: 0.25, text: 'Your client wants sole custody, but a guardian ad litem\'s report praises the other parent, and your client posted angry videos about the case online.' },
  { id: 'divorceAssets', areas: ['family'], kind: 'civil', strength: 0.55, text: 'Your client suspects her husband hid money in a business account. A forensic accountant found transfers, but they could be legitimate business expenses.' },
  { id: 'patentStrong', areas: ['ip'], kind: 'civil', strength: 0.8, big: true, text: 'A big competitor is selling a device that copies your client\'s patented hinge almost exactly. Your expert\'s teardown matches every element of claim 1.' },
  { id: 'patentWeak', areas: ['ip'], kind: 'civil', strength: 0.2, text: 'Your client wants to sue over a patent — but the defendant just found a magazine article describing the same invention three years before your client filed.' },
  { id: 'crash', areas: ['injury'], kind: 'civil', strength: 0.85, big: true, text: 'A delivery truck ran a red light and hit your client, who now can\'t work. Dashcam footage shows the light was red for four seconds; the driver was on his phone.' },
  { id: 'slip', areas: ['injury'], kind: 'civil', strength: 0.3, text: 'Your client slipped in a supermarket. There was a wet-floor sign right there, and security footage shows your client looking at their phone.' },
  { id: 'malpractice', areas: ['injury'], kind: 'civil', strength: 0.55, big: true, text: 'Your client\'s cancer was missed on a scan two years ago. Two radiologists say it was visible; the hospital\'s expert says it was ambiguous.' },
  { id: 'firedPregnant', areas: ['employment'], kind: 'civil', strength: 0.8, text: 'Your client was fired a week after telling her manager she was pregnant. Her reviews were excellent, and a coworker heard the manager complain about "maternity leave headaches."' },
  { id: 'firedLate', areas: ['employment'], kind: 'civil', strength: 0.2, text: 'Your client says he was fired for complaining about safety. His file shows three written warnings for showing up late, all before the complaint.' },
  { id: 'asylum', areas: ['immigration'], kind: 'civil', strength: 0.75, text: 'Your client fled threats from a militia. She has a police report from home, photos of her burned shop, and a human-rights report naming the militia.' },
  { id: 'overstay', areas: ['immigration'], kind: 'civil', strength: 0.3, text: 'Your client overstayed a visa by six years and has no relatives with status. His best argument is a long, clean record here.' },
  { id: 'visa', areas: ['immigration'], kind: 'civil', strength: 0.6, text: 'A tech company\'s star hire was denied a work visa over a paperwork technicality. You have the missing document now — but the filing deadline passed last week.' },
  // Deals
  { id: 'dealClean', areas: ['corporate', 'ip'], kind: 'deal', strength: 0.85, big: true, text: 'Your client is buying a software company. Due diligence came back clean, the price is fair, and both boards are eager. The other side is asking for a slightly bigger break fee.' },
  { id: 'dealSkeleton', areas: ['corporate'], kind: 'deal', strength: 0.2, text: 'Two days before signing, you find the target company has been booking revenue from contracts that were never signed. The CFO says it\'s "a timing issue".' },
  { id: 'dealTense', areas: ['corporate'], kind: 'deal', strength: 0.55, text: 'A merger your client wants is under antitrust review. Regulators have asked hard questions, but haven\'t said no.' },
  { id: 'ipo', areas: ['corporate'], kind: 'deal', strength: 0.7, big: true, text: 'You\'re running a client\'s IPO. The markets are shaky this month, but the roadshow went well and the order book is three times covered.' },
  { id: 'license', areas: ['ip'], kind: 'deal', strength: 0.65, text: 'Your client is licensing its patents to a manufacturer. The manufacturer wants exclusivity worldwide for a low royalty.' },
  // Criminal defense (also public defenders)
  { id: 'alibi', areas: ['criminal'], kind: 'defense', strength: 0.85, text: 'Your client is charged with a burglary across town. His phone\'s location data and a gas-station receipt put him forty miles away at the time.' },
  { id: 'caught', areas: ['criminal'], kind: 'defense', strength: 0.15, text: 'Your client was arrested leaving a store with unpaid goods. It\'s all on camera, he confessed, and the prosecutor offers probation for a guilty plea.' },
  { id: 'search', areas: ['criminal'], kind: 'defense', strength: 0.5, suppress: true, text: 'Police found drugs in your client\'s car after a traffic stop. The officer says your client consented to a search; your client says he refused. The bodycam was "malfunctioning".' },
  { id: 'eyewitness', areas: ['criminal'], kind: 'defense', strength: 0.6, text: 'The only evidence against your client is a single eyewitness who saw the robbery at night from across a street — and picked your client out of a lineup where he was the only one in a red jacket.' },
  { id: 'selfDefense', areas: ['criminal'], kind: 'defense', strength: 0.55, text: 'Your client stabbed a man who broke into her home. Prosecutors say she could have fled; she says he came at her with a bat.' },
  // Prosecution
  { id: 'dna', areas: ['prosecution'], kind: 'prosecution', strength: 0.9, text: 'An assault case: the victim identified the defendant, his DNA was under her fingernails, and he was on camera nearby.' },
  { id: 'shaky', areas: ['prosecution'], kind: 'prosecution', strength: 0.2, text: 'Police want you to charge a man with arson. The only link is an informant with a long record who\'s been paid in past cases. No physical evidence.' },
  { id: 'cooperator', areas: ['prosecution'], kind: 'prosecution', strength: 0.6, text: 'A mid-level drug dealer will testify against his boss if you reduce his charges. His story checks out on some points, not others.' },
  { id: 'teen', areas: ['prosecution'], kind: 'prosecution', strength: 0.75, text: 'A 19-year-old with no record was caught shoplifting for the third time this month. The evidence is airtight; his family says he\'s struggling with addiction.' },
];

/** What you can do with a matter of each kind. */
export const KIND_OPTIONS = {
  civil: [
    { id: 'trial', label: '⚖️ Take it to trial', hint: 'Win big or lose it all' },
    { id: 'settle', label: '🤝 Settle', hint: 'A sure, smaller result' },
    { id: 'motion', label: '📄 File a dispositive motion', hint: 'Win it on the papers — if the law is on your side' },
  ],
  deal: [
    { id: 'close', label: '✍️ Push to close', hint: 'The fee and the glory — if it holds together' },
    { id: 'renegotiate', label: '🔁 Renegotiate the terms', hint: 'Safer; the client may grumble' },
    { id: 'walk', label: '🚪 Advise the client to walk away', hint: 'Right if something\'s badly wrong' },
  ],
  defense: [
    { id: 'trial', label: '⚖️ Go to trial', hint: 'Acquittal — or a heavier sentence' },
    { id: 'plea', label: '🤝 Take the plea deal', hint: 'A certain, lighter outcome' },
    { id: 'suppress', label: '🔍 Move to suppress the evidence', hint: 'Works when police cut corners' },
  ],
  prosecution: [
    { id: 'trial', label: '⚖️ Charge it and go to trial', hint: 'Justice — if the evidence holds' },
    { id: 'plea', label: '🤝 Offer a plea deal', hint: 'A sure conviction on a lesser charge' },
    { id: 'dismiss', label: '🗑️ Decline to prosecute', hint: 'The right call when the case is weak' },
  ],
};

/** Your skill in the courtroom and at the table. */
export function advocacy(state) {
  const l = law(state);
  return (state.stats.smarts - 60) / 220 + (l.reputation ?? 30) / 450 + (l.school?.moot ? 0.03 : 0) + (l.clerkship ? 0.03 : 0) - Math.max(0, (l.burnout ?? 0) - 60) / 300;
}

/** How a call plays out. Returns { result: 'win'|'loss'|'settle', rep, note }. */
export function playMatter(state, matter, optionId, rng) {
  const s = matter.strength;
  const skill = advocacy(state);
  const roll = (p) => rng.chance(clamp(p, 0.04, 0.96));
  switch (`${matter.kind}.${optionId}`) {
    case 'civil.trial': return roll(0.1 + s * 0.8 + skill) ? { result: 'win', rep: matter.big ? 9 : 6, note: 'The jury found for your client.' } : { result: 'loss', rep: -5, note: 'The jury went the other way.' };
    case 'civil.settle': return { result: 'settle', rep: s < 0.4 ? 3 : s > 0.75 ? -2 : 1, note: s > 0.75 ? 'Your client got a settlement — but left money on the table.' : 'A fair settlement, quietly.' };
    case 'civil.motion': return roll(s * 0.75 + skill - 0.1) ? { result: 'win', rep: 7, note: 'The judge granted your motion. Case closed, on the papers.' } : { result: 'settle', rep: -2, note: 'The motion was denied; you settled on worse terms.' };
    case 'deal.close': return roll(0.05 + s * 0.85 + skill) ? { result: 'win', rep: matter.big ? 8 : 5, note: 'The deal closed. Champagne at the closing dinner.' } : { result: 'loss', rep: -6, note: 'It fell apart at the last minute — and the problems you missed came out.' };
    case 'deal.renegotiate': return { result: 'settle', rep: s < 0.4 ? 2 : 0, note: 'You renegotiated: a safer, smaller deal.' };
    case 'deal.walk': return s < 0.35 ? { result: 'win', rep: 7, note: 'Your client walked away — and six months later the other side\'s problems were front-page news.' } : { result: 'loss', rep: -4, note: 'Your client walked away from a good deal, and a rival snapped it up.' };
    case 'defense.trial': return roll(0.08 + s * 0.8 + skill) ? { result: 'win', rep: 8, note: 'Not guilty.' } : { result: 'loss', rep: -4, note: 'Guilty — and the judge was harsher than the plea offer.' };
    case 'defense.plea': return { result: 'settle', rep: s < 0.35 ? 2 : s > 0.75 ? -3 : 0, note: s > 0.75 ? 'Your client pleaded to something he probably didn\'t do.' : 'Your client took the plea.' };
    case 'defense.suppress': return roll((matter.suppress ? 0.45 : 0.1) + skill) ? { result: 'win', rep: 8, note: 'The judge threw out the evidence. The case collapsed.' } : { result: 'settle', rep: -1, note: 'The motion was denied; your client took a plea.' };
    case 'prosecution.trial': return roll(0.05 + s * 0.85 + skill) ? { result: 'win', rep: s < 0.35 ? 2 : 6, note: s < 0.35 ? 'A conviction — on evidence that kept you awake at night.' : 'The jury convicted.' } : { result: 'loss', rep: -6, note: 'Acquitted. The judge criticized the case you brought.' };
    case 'prosecution.plea': return { result: 'settle', rep: s > 0.8 ? -1 : 1, note: 'The defendant pleaded guilty to a lesser charge.' };
    case 'prosecution.dismiss': return s < 0.35 ? { result: 'win', rep: 5, note: 'You declined the case. Months later, the informant recanted.' } : { result: 'loss', rep: -5, note: 'You let a guilty defendant walk. The victim\'s family went to the press.' };
    default: return { result: 'settle', rep: 0, note: 'It resolved.' };
  }
}

export function matterPool(state) {
  const area = areaOf(state);
  return MATTERS.filter((m) => m.areas.includes(area));
}

export function matterPrompt(ctx) {
  const { state, rng } = ctx;
  if (state.prompts.some((p) => p.type === 'lawLife.matter')) return null;
  const l = law(state);
  const pool = matterPool(state);
  if (!pool.length) return null;
  const fresh = pool.filter((m) => !l.seen.includes(m.id));
  const m = rng.pick(fresh.length ? fresh : pool);
  l.seen = [...l.seen.filter((id) => id !== m.id), m.id].slice(-14);
  return ctx.prompt({
    type: 'lawLife.matter', icon: AREAS[areaOf(state)]?.icon ?? '⚖️', title: m.kind === 'deal' ? 'The Deal' : m.kind === 'prosecution' ? 'Your Charging Decision' : 'Your Case',
    text: `${m.text}\n\nWhat do you do?`,
    options: KIND_OPTIONS[m.kind],
    data: { matterId: m.id },
  });
}

export function resolveMatter(ctx, data, optionId) {
  const { state, rng } = ctx;
  // A docket case brings its own file (the facts, and how strong your preparation made it).
  const m = data.matter ?? MATTERS.find((x) => x.id === data.matterId);
  if (!m) return null;
  const l = law(state);
  const out = playMatter(state, m, optionId, rng);
  l.reputation = clamp((l.reputation ?? 30) + out.rep, 0, 100);
  const job = state.career.job;
  if (out.result === 'win') {
    l.wins += 1;
    if (job) job.performance = clamp((job.performance ?? 50) + 5, 0, 100);
    ctx.stat('happiness', 4);
    // Wins bring clients: your book of business grows.
    if (job?.professionId === 'law') l.book = Math.round((l.book ?? 0) + (m.big ? 120000 : 50000) * (1 + l.reputation / 100));
    // Personal-injury lawyers work on contingency: a share of the award.
    if (job?.professionId === 'law' && AREAS[l.area]?.contingency) {
      const fee = rng.int(m.big ? 60 : 15, m.big ? 400 : 80) * 1000;
      ctx.earn(fee, 'Contingency fee', { wage: true });
      out.note += ` Your share of the fee: $${fee.toLocaleString()}.`;
    }
  } else if (out.result === 'loss') {
    l.losses += 1;
    if (job) job.performance = clamp((job.performance ?? 50) - 4, 0, 100);
    ctx.stat('stress', 5);
  } else {
    l.settled += 1;
    if (job?.professionId === 'law') l.book = Math.round((l.book ?? 0) + 15000);
  }
  ctx.log(out.note, out.result === 'win' ? '🏆' : out.result === 'loss' ? '😞' : '🤝', out.result === 'win' ? 'good' : out.result === 'loss' ? 'bad' : undefined);
  if (!data.matter) recordCase(state, { role: m.kind === 'prosecution' ? 'prosecutor' : m.kind === 'defense' ? 'defender' : 'lawyer', title: m.title ?? gist(m.text), result: out.result, note: out.note });
  return out;
}

/* ------------------------------------------------------------------ */
/* Law school                                                          */
/* ------------------------------------------------------------------ */

export function lsatEligibility(state) {
  if (!gradEntry(state)) return { ok: false, reason: 'Law is an undergraduate degree here' };
  if (state.character.age < 19) return { ok: false, reason: 'Age 19+' };
  if (!state.education.degrees.some((d) => DEGREE_LEVELS.includes(d.type)) && state.education.enrolled?.programId !== 'bachelor') return { ok: false, reason: 'In or after college' };
  if (state.education.degrees.some((d) => LAW_SCHOOL.includes(d.programId)) || LAW_SCHOOL.includes(state.education.enrolled?.programId)) return { ok: false, reason: 'Already in law' };
  if (yearlyCount(state, 'lawLife.lsat')) return { ok: false, reason: 'One sitting a year' };
  if ((law(state).lsatTries ?? 0) >= 5) return { ok: false, reason: 'Five attempts is the limit' };
  return { ok: true };
}
const DEGREE_LEVELS = ['bachelor', 'master', 'doctorate', 'professional'];

export function takeLsat(ctx, mode = 'prep') {
  const { state, rng } = ctx;
  const e = lsatEligibility(state);
  if (!e.ok) return ctx.toast(e.reason, 'warn');
  bumpYearly(state, 'lawLife.lsat');
  const prep = mode === 'prep';
  ctx.spend(LSAT.cost + (prep ? LSAT.prepCost : 0), prep ? 'LSAT and a prep course' : 'LSAT registration', { allowDebt: true });
  const l = law(state);
  l.lsatTries = (l.lsatTries ?? 0) + 1;
  const score = Math.round(clamp(LSAT.mean + (state.stats.smarts - 70) * 0.55 + (prep ? 4 : 0) + rng.int(-6, 6) - Math.max(0, state.stats.stress - 70) / 10, LSAT.min, LSAT.max));
  if (score >= (l.lsat ?? 0)) {
    l.lsat = score;
    l.lsatAge = state.character.age;
  }
  ctx.stat('stress', prep ? 6 : 3);
  const pct = Math.round(clamp(50 + (score - LSAT.mean) * 3.4, 1, 99));
  ctx.log(`You scored ${score} on the LSAT (${pct}th percentile).${score < l.lsat ? ` Schools will see your best, ${l.lsat}.` : ''}`, '📝', score >= 165 ? 'good' : score < 148 ? 'warn' : 'info');
}

/** Law school admissions: the LSAT where law is a graduate degree. */
ADMISSION_HOOKS.push({
  eligibility(state, programId) {
    if (!LAW_SCHOOL.includes(programId) || undergradEntryYears(state.character.countryId, 'jd') || !gradEntry(state)) return null;
    const l = state.law;
    if (!l?.lsat) return 'Take the LSAT first';
    if (state.character.age - (l.lsatAge ?? 0) > LSAT.validYears) return 'Your LSAT score expired (5 years)';
    return null;
  },
  boost(state, programId) {
    if (!LAW_SCHOOL.includes(programId) || undergradEntryYears(state.character.countryId, 'jd') || !gradEntry(state)) return 0;
    return ((state.law?.lsat ?? LSAT.mean) - 158) / 18;
  },
});

const oneAtATime = (ctx, type, spec) => {
  if (!ctx.state.prompts.some((p) => p.type === type)) ctx.prompt({ type, ...spec });
};

function schoolTick(ctx) {
  const { state, rng } = ctx;
  const e = state.education.enrolled;
  if (!LAW_SCHOOL.includes(e?.programId) || state.legal.incarceration) return;
  const l = law(state);
  const s = (l.school ??= { rank: null, lawReview: false, moot: false, oci: null });
  const year = Math.floor(e.progress) + 1;
  const prestige = e.prestige ?? SCHOOLS[e.schoolId]?.prestige ?? 1;
  ctx.stat('stress', year === 1 ? 7 : 4);
  if (year === 1 && s.rank == null) {
    // 1L grades are curved: your rank is your smarts against everyone else's, plus a lot of luck.
    s.rank = Math.round(clamp(50 + (state.stats.smarts - 75) * 1.4 + (s.effort ?? 0) + rng.int(-25, 25), 1, 99));
    const top = 100 - s.rank;
    ctx.log(`1L grades are in: you're in the top ${Math.max(1, top)}% of your class.${top <= 10 ? ' The law review invited you to join.' : ''}`, '📚', top <= 25 ? 'good' : 'info');
    if (top <= 10) s.lawReview = true;
    return;
  }
  if (year === 2 && !s.oci) {
    oneAtATime(ctx, 'lawLife.oci', {
      icon: '🤵', title: 'On-Campus Interviews', text: 'Firms are interviewing 2Ls for summer jobs — and a summer job is how most big-firm associates get hired. Where do you aim?',
      options: [
        { id: 'biglaw', label: '🏙️ The big firms', hint: `≈${Math.round(ociOdds(state, prestige) * 100)}% for an offer · the best pay` },
        { id: 'midsize', label: '🏢 Regional and boutique firms', hint: 'Likely; decent pay, saner hours' },
        { id: 'public', label: '🕊️ Public interest and government', hint: 'Prosecutors, defenders, legal aid' },
      ],
    });
  }
}

export const ociOdds = (state, prestige = 1) => clamp(0.2 + (state.law?.school?.rank ?? 50) / 140 + (prestige - 1) * 0.12 + (state.law?.school?.lawReview ? 0.15 : 0), 0.05, 0.95);

/* ------------------------------------------------------------------ */
/* Practice                                                            */
/* ------------------------------------------------------------------ */

const bigFirm = (job) => ['large', 'enterprise'].includes(job?.employer?.size);

function practiceTick(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!isLawyer(job) || !job.paidThisYear || state.legal.incarceration) return;
  const l = law(state);
  const area = areaOf(state);
  if (job.professionId === 'law' && !l.area) {
    const sys = lawSystem(state.character.countryId);
    oneAtATime(ctx, 'lawLife.area', {
      icon: '⚖️', title: 'Your Practice Area', text: `What kind of law will you practise?${sys.split ? ` Here you could also be called to the bar and practise as ${article(sys.advocate)} from ${sys.chambers}.` : ''}`,
      options: [
        ...Object.entries(AREAS).map(([id, a]) => ({ id, label: `${a.icon} ${a.name}`, hint: `pay ×${a.pay}` })),
        ...(sys.split ? [{ id: 'chambers', label: `🎩 ${sys.advocate} in ${sys.chambers}`, hint: 'Courtroom advocacy; self-employed, feast or famine' }] : []),
      ],
    });
    return;
  }
  // The year's work.
  const a = AREAS[area];
  ctx.stat('stress', (a?.stress ?? 5) + (job.professionId === 'law' ? HOURS[l.hours]?.stress ?? 0 : 0));
  l.burnout = clamp((l.burnout ?? 0) + (job.professionId === 'law' ? HOURS[l.hours]?.stress ?? 0 : 3) - 4, 0, 100);
  if (job.professionId === 'law') {
    job.performance = clamp((job.performance ?? 50) + (HOURS[l.hours]?.perf ?? 0) / 2, 0, 100);
    const bonus = Math.round(job.salary * (HOURS[l.hours]?.bonus ?? 0) * (bigFirm(job) ? 1 : 0.5));
    if (bonus) ctx.earn(bonus, `Year-end bonus (${HOURS[l.hours].label} billed)`, { wage: true });
    // Partners draw on the business they bring in.
    if (['partner', 'seniorPartner', 'managingPartner'].includes(job.levelId) && l.book > 0) {
      const draw = Math.round(l.book * 0.25);
      ctx.earn(draw, 'Partnership draw', { wage: true });
    }
    // Barristers in chambers: income follows reputation.
    if (l.chambers) {
      const fees = Math.round(job.salary * (l.reputation - 40) / 80);
      if (fees > 0) ctx.earn(fees, 'Brief fees', { wage: true });
      else if (fees < 0) ctx.spend(-fees, 'Chambers rent in a thin year', { allowDebt: true });
    }
  }
  if (rng.chance(0.65)) matterPrompt(ctx);
  // Ethics traps.
  if (rng.chance(0.06)) {
    const e = rng.pick(['perjury', 'billing']);
    if (e === 'perjury') oneAtATime(ctx, 'lawLife.ethics', { icon: '🤥', title: 'Your Client Wants to Lie', text: 'Your client tells you, in confidence, that he plans to testify to an alibi you know is false.', options: [{ id: 'withdraw', label: '🙅 Refuse to put him on — withdraw if he insists' }, { id: 'allow', label: '🤐 Let him testify', tone: 'danger', hint: 'Suborning perjury' }], data: { kind: 'perjury' } });
    else if (job.professionId === 'law') oneAtATime(ctx, 'lawLife.ethics', { icon: '🧾', title: 'The Bill', text: 'You\'re short of your billable target. A partner hints that nobody checks the time entries on a big client\'s bill.', options: [{ id: 'honest', label: '✅ Bill what you worked' }, { id: 'pad', label: '➕ Round it up — a lot', tone: 'danger', hint: 'Billing fraud' }], data: { kind: 'billing' } });
  }
  // Passed over: two years to move on, at firms that run up-or-out.
  if (job.counseledOut != null && job.levelId === 'senior' && state.character.age - job.counseledOut >= 2) {
    leaveJob(ctx, 'Counseled out after the partnership vote');
    return;
  }
  // Up or out: the partnership vote.
  if (job.professionId === 'law' && job.levelId === 'senior' && !l.partnerVote && ['medium', 'large', 'enterprise'].includes(job.employer.size) && yearsInProfession(state, ['law']) >= 7) {
    l.partnerVote = state.character.age;
    oneAtATime(ctx, 'lawLife.partner', { icon: '🗳️', title: 'The Partnership Vote', text: `This year the partners of ${job.employer.name} vote on whether to make you one of them. They'll look at your reputation, your book of business and your hours. Make your case?`, options: [{ id: 'push', label: '💼 Make your case', hint: `≈${Math.round(partnerOdds(state) * 100)}%` }, { id: 'counsel', label: '🧑‍⚖️ Ask to be made counsel instead', hint: 'Off the partner track, but secure' }] });
  }
  // Silk.
  const sys = lawSystem(state.character.countryId);
  if (sys.silk && !l.silk && l.reputation >= 70 && yearsInProfession(state, LAWYERS) >= 15 && rng.chance(0.25)) {
    oneAtATime(ctx, 'lawLife.silk', { icon: '🎗️', title: `Apply for ${sys.silk}?`, text: `After fifteen years, senior lawyers here can apply to be appointed ${sys.silk} — the mark of the profession's best advocates.`, options: [{ id: 'apply', label: '📜 Apply', hint: `≈${Math.round(silkOdds(state) * 100)}%` }, { id: 'wait', label: '⏳ Not yet' }] });
  }
}
const article = (w) => (/^[aeiou]/i.test(w ?? '') ? `an ${w}` : `a ${w}`);

export const partnerOdds = (state) => {
  const l = law(state);
  return clamp(0.1 + (l.reputation - 40) / 120 + Math.min(0.3, (l.book ?? 0) / 4000000) + (l.hours >= 2100 ? 0.08 : -0.05) + ((state.career.job?.performance ?? 50) - 60) / 200, 0.05, 0.9);
};
export const silkOdds = (state) => clamp(0.15 + (law(state).reputation - 70) / 60 + law(state).wins / 200, 0.05, 0.7);

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const LawSchoolModule = {
  id: 'lawSchool',
  order: 9.8,
  setup(engine) {
    engine.bus.on('education:graduated', ({ ctx, degree }) => {
      const { state, rng } = ctx;
      if (!LAW_SCHOOL.includes(degree.programId)) return;
      const l = law(state);
      const s = l.school ?? {};
      const top = 100 - (s.rank ?? 50);
      const sys = lawSystem(state.character.countryId);
      ctx.log(`You graduated from law school${s.rank != null ? `, top ${Math.max(1, top)}% of your class` : ''}${s.lawReview ? ', law review' : ''}. ${sys.training ? `Next: ${sys.training}.` : 'Next: the bar exam.'}`, '🎓', 'milestone');
      // The summer job turns into an offer.
      if (l.offer && !state.career.job) oneAtATime(ctx, 'lawLife.offer', { icon: '📨', title: 'A Job Offer', text: l.offer === 'public' ? 'The public defender\'s office you worked for last summer wants you back as a staff attorney.' : `Your summer firm made you an offer to join as a first-year associate${l.offer === 'biglaw' ? ' — at the big-firm starting salary' : ''}.`, options: [{ id: 'accept', label: '✍️ Accept' }, { id: 'decline', label: '🙅 Look elsewhere' }], data: { kind: l.offer } });
      if ((s.lawReview || top <= 10) && rng.chance(0.6)) oneAtATime(ctx, 'lawLife.clerkship', { icon: '🏛️', title: 'A Clerkship Offer', text: 'A judge wants you as a law clerk for a year: drafting opinions, watching trials from the bench side. It pays little, but it opens every door.', options: [{ id: 'accept', label: '🏛️ Clerk for the judge' }, { id: 'decline', label: '💼 Go straight to practice' }] });
    });
  },
  onAgeUp(ctx) {
    schoolTick(ctx);
  },
};

export const LawLifeModule = {
  id: 'lawLife',
  order: 30.85,

  init(state) {
    law(state).seen ??= [];
  },

  onAgeUp(ctx) {
    const job = ctx.state.career.job;
    if (!isLawyer(job)) {
      if (ctx.state.law) ctx.state.law.burnout = Math.max(0, (ctx.state.law.burnout ?? 0) - 15);
      return;
    }
    practiceTick(ctx);
  },

  actions: {
    lsat: (ctx, mode) => takeLsat(ctx, mode),
    moot(ctx) {
      const { state } = ctx;
      const s = state.law?.school;
      if (!s || !LAW_SCHOOL.includes(state.education.enrolled?.programId)) return ctx.toast('Law students only', 'warn');
      if (s.moot) return ctx.toast('You already did moot court', 'info');
      s.moot = true;
      ctx.stat('stress', 4);
      const won = state.stats.smarts + ctx.rng.int(-20, 20) >= 80;
      ctx.log(won ? 'You won the moot court competition. The judges — real ones — asked who taught you to argue like that.' : 'You argued in the moot court competition and made the semifinals.', '🎤', 'good');
    },
    study(ctx) {
      const { state } = ctx;
      const e = state.education.enrolled;
      if (!LAW_SCHOOL.includes(e?.programId) || Math.floor(e.progress) > 0) return ctx.toast('During 1L', 'warn');
      if (yearlyCount(state, 'lawLife.study')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'lawLife.study');
      (law(state).school ??= {}).effort = 12;
      ctx.stat('stress', 7);
      ctx.log('You lived in the library: outlines, practice exams, a study group that met at 6 a.m.', '📚');
    },
    hours(ctx, arg) {
      const { state } = ctx;
      if (state.career.job?.professionId !== 'law' || !HOURS[arg]) return;
      law(state).hours = Number(arg);
      ctx.toast(`Billable target: ${HOURS[arg].label}`, 'info');
    },
    rainmake(ctx) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (job?.professionId !== 'law' || ['clerk', 'associate'].includes(job.levelId)) return ctx.toast('Senior associates and partners', 'warn');
      if (yearlyCount(state, 'lawLife.rainmake')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'lawLife.rainmake');
      const l = law(state);
      const land = state.stats.smarts * 0.4 + (state.stats.looks ?? 50) * 0.3 + l.reputation * 0.3 + rng.int(-25, 25);
      ctx.stat('stress', 4);
      if (land >= 60) {
        const add = rng.int(150, 600) * 1000;
        l.book = (l.book ?? 0) + add;
        ctx.log(`Dinners, conferences and a lot of golf: you landed a new client worth $${add.toLocaleString()} a year.`, '🌧️', 'good');
      } else ctx.log('You pitched three companies. Nobody bit — yet.', '🌧️');
    },
    proBono(ctx) {
      const { state, rng } = ctx;
      if (!isLawyer(state.career.job)) return ctx.toast('Practising lawyers only', 'warn');
      if (yearlyCount(state, 'lawLife.proBono')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'lawLife.proBono');
      const l = law(state);
      l.proBono = (l.proBono ?? 0) + 1;
      l.reputation = clamp(l.reputation + 3, 0, 100);
      ctx.stat('happiness', 6);
      ctx.log(rng.pick(['You took an eviction case for free and kept a family of five in their home.', 'You helped a veteran win the benefits he\'d been denied for years.', 'You volunteered at a legal clinic, untangling debts and custody papers one Saturday at a time.']), '🕊️', 'good');
      if (l.proBono === 5 && !state.honors.some((h) => h.id === 'law.proBono')) {
        addHonor(state, { id: 'law.proBono', source: 'civil', name: 'Pro Bono Publico Award', icon: '🕊️', prestige: 3, precedence: 50, citation: 'For years of free legal help to people who could not pay.' });
        ctx.log('The bar association honoured you with its Pro Bono Publico Award.', '🕊️', 'honor');
      }
    },
  },

  resolvers: {
    matter(ctx, data, optionId) {
      resolveMatter(ctx, data, optionId);
    },
    area(ctx, _data, optionId) {
      const { state } = ctx;
      const l = law(state);
      const job = state.career.job;
      if (optionId === 'chambers') {
        const sys = lawSystem(state.character.countryId);
        l.area = 'litigation';
        l.chambers = true;
        if (job) job.title = `${sys.advocate} (${sys.chambers})`;
        ctx.log(`You were called to the bar and took a place in ${sys.chambers}: ${article(sys.advocate.toLowerCase())}, briefed by solicitors, paid by the case.`, '🎩', 'milestone');
        return;
      }
      if (!AREAS[optionId]) return;
      l.area = optionId;
      if (job) {
        job.payAdjust = (job.payAdjust ?? 1) * AREAS[optionId].pay;
        recalcSalary(state, job);
      }
      ctx.log(`You went into ${AREAS[optionId].name.toLowerCase()}.`, AREAS[optionId].icon);
    },
    oci(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const l = law(state);
      const s = (l.school ??= {});
      s.oci = optionId;
      const prestige = state.education.enrolled?.prestige ?? SCHOOLS[state.education.enrolled?.schoolId]?.prestige ?? 1;
      if (optionId === 'biglaw' && !rng.chance(ociOdds(state, prestige))) {
        s.oci = 'midsize';
        return ctx.log('Twenty interviews, three callbacks, no big-firm offers. A regional firm took you on for the summer instead.', '🤵', 'warn');
      }
      l.offer = optionId;
      ctx.log({ biglaw: 'You spent the summer at a big firm: lunches, a baseball game, a little real work — and an offer to come back after graduation.', midsize: 'You summered at a regional firm and did real work from week one.', public: 'You spent the summer at a public defender\'s office, in court almost every day.' }[optionId], '🤵', 'good');
    },
    offer(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId !== 'accept' || state.career.job) return ctx.log('You turned the offer down to look elsewhere.', '📨');
      const professionId = data.kind === 'public' ? 'publicDefender' : 'law';
      const p = getProfession(professionId);
      if (!p) return undefined;
      // Big firms are big: keep drawing until the employer is the size the offer came from.
      const want = data.kind === 'biglaw' ? ['large', 'enterprise'] : data.kind === 'midsize' ? ['medium', 'large'] : null;
      let employer = createEmployer(rng, state, p, state.character.regionId);
      for (let i = 0; i < 12 && want && !want.includes(employer.size); i++) employer = createEmployer(new Random(rng.int(1, 1e9)), state, p, state.character.regionId);
      const level = p.levels.find((l) => l.entry) ?? p.levels[1] ?? p.levels[0];
      hire(ctx, { professionId, levelId: level.id, employer });
      return undefined;
    },
    clerkship(ctx, _data, optionId) {
      const l = law(ctx.state);
      if (optionId !== 'accept') return ctx.log('You turned down the clerkship.', '💼');
      l.clerkship = true;
      l.reputation = clamp((l.reputation ?? 30) + 12, 0, 100);
      ctx.log('You clerked for the judge for a year. You learned how judges actually decide cases — and every firm in town wanted to hire you after.', '🏛️', 'good');
    },
    ethics(ctx, data, optionId) {
      const { state, rng } = ctx;
      const l = law(state);
      if (optionId === 'withdraw' || optionId === 'honest') {
        l.reputation = clamp(l.reputation + 2, 0, 100);
        return ctx.log(optionId === 'withdraw' ? 'You refused to present the false alibi. The client fired you; your conscience is clear.' : 'You billed what you worked and missed your target by forty hours.', '✅');
      }
      if (optionId === 'pad') ctx.earn(Math.round((state.career.job?.salary ?? 100000) * 0.05), 'Bonus on padded hours', { wage: true });
      if (rng.chance(data.kind === 'perjury' ? 0.35 : 0.2)) {
        l.reputation = clamp(l.reputation - 30, 0, 100);
        ctx.log(data.kind === 'perjury' ? 'The alibi fell apart on cross-examination, and the bar learned you knew. Your licence was suspended for two years.' : 'An audit of the client\'s bills found your padded hours. The bar suspended your licence for a year.', '⚖️', 'bad');
        ctx.emit('credential:suspend', { ids: ['barLicense'], years: data.kind === 'perjury' ? 2 : 1, reason: data.kind === 'perjury' ? 'Suborning perjury' : 'Billing fraud' });
      } else ctx.log('Nobody found out. You think about it more than you\'d like.', '🤫', 'warn');
      return undefined;
    },
    partner(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (job?.professionId !== 'law') return;
      if (optionId === 'counsel') {
        promote(ctx, 'counsel');
        return ctx.log('You stepped off the partner track and were made counsel: secure, respected, and home for dinner.', '🧑‍⚖️');
      }
      if (rng.chance(partnerOdds(state))) {
        promote(ctx, 'partner');
        ctx.stat('happiness', 15);
        return ctx.log(`The partners voted you in. You're a partner of ${job.employer.name}.`, '🥂', 'milestone');
      }
      law(state).reputation = clamp(law(state).reputation - 5, 0, 100);
      ctx.stat('happiness', -10);
      ctx.log('The partners passed you over. At a firm like this, that means it\'s time to find somewhere else — another firm, a company\'s legal department, or the bench someday.', '📭', 'bad');
      job.counseledOut = state.character.age;
    },
    silk(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const sys = lawSystem(state.character.countryId);
      if (optionId !== 'apply' || !sys.silk) return;
      const l = law(state);
      if (!rng.chance(silkOdds(state))) return ctx.log(`Your application for ${sys.silk} was unsuccessful this year.`, '🎗️', 'warn');
      l.silk = state.character.age;
      addHonor(state, { id: 'law.silk', source: 'civil', name: sys.silk, icon: '🎗️', prestige: 8, precedence: 40, citation: 'Appointed for excellence in advocacy.' });
      ctx.log(`You were appointed ${sys.silk}. You "took silk": a silk gown, higher fees and the hardest cases.`, '🎗️', 'honor');
      return undefined;
    },
  },
};
