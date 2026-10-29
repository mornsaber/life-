/**
 * The cases against you, made visible.
 *
 * Every offence that isn't an arrest on the spot opens an investigation (JusticeSystem's
 * commitOffense). Here each one becomes a case you can see and play against:
 *
 *   agency      who is investigating (the city police, the homicide squad, the national police,
 *               the drug agency, the tax authority, the anti-corruption commission)
 *   lead        a named investigator
 *   evidence    the items they have or could find — CCTV, DNA, prints, a witness, phone records,
 *               bank records, the stolen goods, an accomplice. Each has a strength; together they
 *               make the case's evidence (what a court would weigh). Some can be destroyed, some
 *               witnesses can be leaned on, and both are crimes of their own.
 *   stage       a lead → a suspect → a warrant, from how close they are (the yearly chance the case
 *               breaks). At the warrant stage you hear about it: surrender, lawyer up, or run.
 *
 * Counterplay (once a year per case): destroy evidence, ask someone for an alibi, retain a lawyer
 * early, intimidate a witness, pay someone off (Corruption.js), or cooperate and give up others.
 *
 * inv = { …commitOffense fields, id, agency, lead, items: [{ kind, strength, destroyable }], opened, stage }
 */
import { clamp, Random } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { OFFENSES } from '../legal/Offenses.js';
import { charge, commitOffense } from '../legal/JusticeSystem.js';
import { agencyFor } from './CrimeWorld.js';
import { priceLevel } from '../world/Countries.js';
import { meOf } from '../legal/Underworld.js';

export const EVIDENCE = {
  cctv: { label: 'CCTV footage', icon: '📹', destroyable: false, decay: 0.12 },
  dna: { label: 'DNA', icon: '🧬', destroyable: false, decay: 0.01 },
  prints: { label: 'Fingerprints', icon: '🖐️', destroyable: true, decay: 0.03 },
  witness: { label: 'An eyewitness', icon: '👁️', destroyable: false, intimidate: true, decay: 0.06 },
  digital: { label: 'Phone and computer records', icon: '📱', destroyable: true, decay: 0.04 },
  financial: { label: 'Bank records', icon: '🏦', destroyable: false, decay: 0.02 },
  goods: { label: 'The stolen goods', icon: '📦', destroyable: true, decay: 0.05 },
  weapon: { label: 'The weapon', icon: '🔪', destroyable: true, decay: 0.02 },
  accomplice: { label: 'An accomplice who might talk', icon: '🗣️', destroyable: false, intimidate: true, decay: 0.03 },
  informant: { label: 'A confidential informant', icon: '🐀', destroyable: false, decay: 0.05 },
  paper: { label: 'A paper trail', icon: '📄', destroyable: true, decay: 0.02 },
  alibi: { label: 'Your alibi (in your favour)', icon: '🤝', destroyable: false, decay: 0 },
};

/** Which kinds of evidence an offence tends to leave. */
function kindsFor(offenseId, offense, context = '') {
  const c = context.toLowerCase();
  const kinds = [];
  if (/camera|footage|surveillance|cctv|doorbell/.test(c)) kinds.push('cctv');
  if (/wiretap|bitcoin|online|dark web|traced/.test(c)) kinds.push('digital');
  if (/bank|suspicious-activity|audit|ledger/.test(c)) kinds.push('financial');
  if (/witness|borrower|victim|customer|went to the police/.test(c)) kinds.push('witness');
  if (/fraud|tax|embezzle|kickback|laundering|bribery|corruption/i.test(offenseId)) kinds.push('paper', 'financial');
  else if (/murder|manslaughter|assault|robbery|kidnap|carjack/i.test(offenseId)) kinds.push('dna', 'witness', 'weapon');
  else if (/burglary|theft|stolen|autoTheft|grandTheft|mail|catalytic/i.test(offenseId)) kinds.push('prints', 'goods', 'cctv');
  else if (/drug|gambling|extortion|racketeering|gun/i.test(offenseId)) kinds.push('informant', 'digital', 'accomplice');
  else if (/computer|identity|wire|counterfeit/i.test(offenseId)) kinds.push('digital', 'financial');
  else kinds.push(offense?.violent ? 'witness' : 'cctv');
  return [...new Set(kinds)].slice(0, 3);
}

/** Several items that together add up to `evidence` (independent pieces: 1 − Π(1 − s)). */
export const combined = (items) => 1 - items.reduce((p, i) => p * (1 - clamp(i.strength, 0, 0.99)), 1);

/** Recompute the case's evidence from its items (a lawyer retained early takes some of the sting out). */
export function refresh(inv) {
  if (!inv.items) return inv;
  inv.evidence = clamp(combined(inv.items) * (inv.lawyer ? 0.9 : 1), 0.05, 0.98);
  return inv;
}

export const stageOf = (inv) => (inv.discovery >= 0.3 ? 'warrant' : inv.discovery >= 0.15 ? 'suspect' : 'lead');
export const STAGE_LABEL = { lead: '🔎 A lead', suspect: '🎯 You\'re a suspect', warrant: '🚨 Close to a warrant' };

/** commitOffense hook: make the investigation a case. */
export function openCase(ctx, inv) {
  const { state } = ctx;
  const offense = OFFENSES[inv.offenseId];
  const kinds = kindsFor(inv.offenseId, offense, inv.context);
  const each = 1 - (1 - clamp(inv.evidence, 0.05, 0.95)) ** (1 / kinds.length);
  const cases = (state.legal.flags.caseSeq = (state.legal.flags.caseSeq ?? 0) + 1);
  // Its own dice: opening a case never shifts the rolls the rest of the year makes.
  const rng = new Random((cases * 2654435761) >>> 0);
  const lead = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
  Object.assign(inv, {
    id: `c${cases}`,
    agency: agencyFor(state, offense, inv.offenseId),
    lead: `${lead.firstName} ${lead.lastName}`,
    items: kinds.map((kind) => ({ kind, strength: clamp(each * rng.float(0.8, 1.2), 0.05, 0.95) })),
    opened: state.character.age,
  });
  return refresh(inv);
}

/** Old saves: investigations from before cases existed get one. */
export function ensureCases(ctx) {
  for (const inv of ctx.state.legal.investigations ?? []) if (!inv.id) openCase(ctx, inv);
}
export const caseById = (state, id) => (state.legal.investigations ?? []).find((c) => c.id === id) ?? null;

/** Yearly: evidence fades, witnesses come forward, and at the warrant stage you hear about it. */
export function casesTick(ctx) {
  const { state, rng } = ctx;
  ensureCases(ctx);
  if (state.legal.incarceration) return;
  for (const inv of state.legal.investigations) {
    for (const it of inv.items) it.strength = clamp(it.strength * (1 - (EVIDENCE[it.kind]?.decay ?? 0.03)), 0.02, 0.98);
    // New evidence: a tip, a pawned item, a test result back from the lab.
    if (rng.chance(0.04) && inv.items.length < 5) {
      const kind = rng.pick(['witness', 'informant', 'dna', 'digital']);
      inv.items.push({ kind, strength: rng.float(0.15, 0.45) });
      inv.discovery = clamp(inv.discovery + 0.03, 0, 0.9);
    }
    refresh(inv);
    const stage = stageOf(inv);
    if (stage === 'warrant' && !inv.warned && state.character.age >= 18) {
      inv.warned = true;
      const offense = OFFENSES[inv.offenseId];
      ctx.prompt({
        type: 'crime.warrant', icon: '🚨', title: 'They\'re Coming for You',
        text: `A friend of a friend says ${inv.lead} of ${inv.agency} is about to get a warrant for ${offense.name.toLowerCase()}${inv.context ? ` (${inv.context})` : ''}.`,
        options: [
          { id: 'surrender', label: '🙋 Hand yourself in with a lawyer', hint: 'It counts in your favour' },
          { id: 'lawyer', label: '👔 Retain a lawyer and wait', hint: 'They may never come' },
          { id: 'run', label: '🏃 Disappear for a while', tone: 'danger', hint: 'Lose your job and your routine; the case cools' },
        ],
        data: { caseId: inv.id },
      });
    }
  }
}

const retainer = (state) => Math.round(8000 * priceLevel(state));
const perCase = (ctx, inv, what) => {
  const key = `case.${inv.id}.${what}`;
  if (yearlyCount(ctx.state, key)) { ctx.toast('Once a year for each case', 'warn'); return false; }
  bumpYearly(ctx.state, key);
  return true;
};
function pick(ctx, caseId) {
  const inv = caseById(ctx.state, caseId);
  if (!inv) ctx.toast('No such case', 'warn');
  return inv;
}

export const CaseResolvers = {
  warrant(ctx, data, optionId) {
    const { state, rng } = ctx;
    const inv = caseById(state, data.caseId);
    if (!inv) return;
    if (optionId === 'surrender') {
      state.legal.investigations = state.legal.investigations.filter((c) => c !== inv);
      ctx.spend(retainer(state), 'Defence lawyer (retainer)', { allowDebt: true });
      ctx.log(`You walked into ${inv.agency} with your lawyer. Handing yourself in will count in your favour.`, '🙋', 'info');
      return charge(ctx, { offenseId: inv.offenseId, context: inv.context, evidence: inv.evidence * 0.9, abroad: inv.abroad });
    }
    if (optionId === 'lawyer') {
      ctx.spend(retainer(state), 'Defence lawyer (retainer)', { allowDebt: true });
      inv.lawyer = true;
      refresh(inv);
      return ctx.log('Your lawyer called the detectives: any questions go through counsel.', '👔', 'info');
    }
    inv.discovery = clamp(inv.discovery * 0.5, 0, 0.9);
    ctx.stat('stress', 12);
    ctx.stat('happiness', -8);
    if (state.career.job && rng.chance(0.7)) ctx.emit('career:resign', { reason: 'You stopped turning up', fired: true });
    return ctx.log('You stopped using your phone, slept at a cousin\'s, and stayed off the streets.', '🏃', 'warn');
  },
};

export const CaseActions = {
  /** Burn it, wipe it, lose it. */
  destroyEvidence(ctx, caseId) {
    const { state, rng } = ctx;
    const inv = pick(ctx, caseId);
    if (!inv) return;
    const items = inv.items.filter((i) => EVIDENCE[i.kind]?.destroyable);
    if (!items.length) return ctx.toast('Nothing you can get at', 'warn');
    if (!perCase(ctx, inv, 'destroy')) return;
    const it = items.sort((a, b) => b.strength - a.strength)[0];
    inv.items = inv.items.filter((i) => i !== it);
    refresh(inv);
    ctx.log(`You got rid of ${EVIDENCE[it.kind].label.toLowerCase()}.`, '🗑️', 'warn');
    if (rng.chance(0.2)) {
      ctx.log('Someone saw you do it.', '👁️', 'bad');
      commitOffense(ctx, { offenseId: 'obstruction', discovery: 0.3, evidence: 0.7, context: `destroying evidence in the ${OFFENSES[inv.offenseId].name.toLowerCase()} case` });
    }
  },
  /** Ask someone close to you to say you were with them. */
  alibi(ctx, caseId) {
    const { state, rng } = ctx;
    const inv = pick(ctx, caseId);
    if (!inv) return;
    const people = (state.people?.list ?? []).filter((p) => p.alive && ['spouse', 'partner', 'friend', 'sibling', 'mother', 'father', 'bestFriend'].includes(p.relation));
    if (!people.length) return ctx.toast('There\'s nobody to ask', 'warn');
    if (!perCase(ctx, inv, 'alibi')) return;
    const p = people.sort((a, b) => (b.relationship ?? 0) - (a.relationship ?? 0))[0];
    const yes = rng.chance(clamp((p.relationship ?? 50) / 110, 0.1, 0.9));
    if (!yes) {
      p.relationship = Math.max(0, (p.relationship ?? 50) - 20);
      return ctx.log(`${p.firstName} looked at you for a long time and said no. "Don't ask me that again."`, '🙅', 'bad');
    }
    inv.items.push({ kind: 'alibi', strength: 0 });
    inv.items = inv.items.map((i) => (i.kind === 'witness' ? { ...i, strength: i.strength * 0.6 } : i));
    inv.alibi = p.firstName;
    refresh(inv);
    // A false alibi can crack under questioning.
    if (rng.chance(0.15)) { inv.items.push({ kind: 'witness', strength: 0.5 }); refresh(inv); ctx.log(`${p.firstName} agreed — but under questioning, their story didn't hold.`, '🗣️', 'bad'); return; }
    ctx.log(`${p.firstName} will say you were with them that night.`, '🤝', 'warn');
  },
  /** A lawyer before charges: every interview through counsel. */
  lawyerUp(ctx, caseId) {
    const inv = pick(ctx, caseId);
    if (!inv) return;
    if (inv.lawyer) return ctx.toast('Your lawyer is already on it', 'warn');
    ctx.spend(retainer(ctx.state), 'Defence lawyer (retainer)', { allowDebt: true });
    inv.lawyer = true;
    refresh(inv);
    ctx.log('You retained a defence lawyer. From now on, "no comment".', '👔', 'info');
  },
  /** Lean on a witness. A crime of its own. */
  intimidate(ctx, caseId) {
    const { rng } = ctx;
    const inv = pick(ctx, caseId);
    if (!inv) return;
    const w = inv.items.find((i) => EVIDENCE[i.kind]?.intimidate);
    if (!w) return ctx.toast('No witness to lean on', 'warn');
    if (!perCase(ctx, inv, 'intimidate')) return;
    if (rng.chance(0.6)) {
      inv.items = inv.items.filter((i) => i !== w);
      refresh(inv);
      ctx.emit('crime:guilt', { amount: 6 });
      return ctx.log('A visit, a few words about their kids\' school. The witness stopped returning the detective\'s calls.', '🤫', 'warn');
    }
    w.strength = clamp(w.strength + 0.25, 0, 0.95);
    refresh(inv);
    ctx.log('The witness went straight to the police. Now they\'re scared — and certain.', '🤫', 'bad');
    commitOffense(ctx, { offenseId: 'witnessIntimidation', discovery: 0.45, evidence: 0.8, context: 'threatening a witness' });
  },
  /** Cooperate: give them someone bigger. */
  cooperate(ctx, caseId) {
    const { state, rng } = ctx;
    const inv = pick(ctx, caseId);
    if (!inv) return;
    const me = meOf(state);
    const crew = (state.legal.crime?.drugs?.runners ?? 0) + (me ? 1 : 0) + Object.keys(state.legal.crime?.skill ?? {}).length;
    if (!crew) return ctx.toast('You have nobody to give them', 'warn');
    state.legal.investigations = state.legal.investigations.filter((c) => c !== inv);
    ctx.log(`You sat down with ${inv.lead} and talked. In return, ${inv.agency} let the ${OFFENSES[inv.offenseId].name.toLowerCase()} case go.`, '🐀', 'warn');
    ctx.emit('crime:guilt', { amount: 4 });
    const c = state.legal.crime;
    if (c) c.rep = Math.max(0, (c.rep ?? 0) - 25);
    if (me) {
      me.trust = Math.max(0, me.trust - 40);
      if (rng.chance(0.3)) { me.marked = true; ctx.log('Word got back. Someone in the outfit knows you talked.', '🎯', 'bad'); }
    }
  },
};
