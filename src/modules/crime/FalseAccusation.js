/**
 * Accused of something you didn't do.
 *
 * It starts with a phone call or a knock: a colleague says you stole, an ex says you hit them,
 * a client says you defrauded them, a parent says you mistreated a child in your care. Then
 * it's months: the investigation (lawyer up, cooperate, or stay silent), suspension from work,
 * people deciding what they think. Most accusations are dropped. Some are charged, and then
 * it's a plea to something lesser or a trial — and juries get it wrong. Cleared, you can sue.
 * Wrongly convicted, an innocence project may take your appeal (legal/Prison.js).
 *
 * state.legal.accused = { kind, accuser, since, stage: 'investigation'|'charged', strength, lawyer, silent }
 */
import { Random, clamp } from '../../core/Random.js';
import { randomName } from '../../core/State.js';
import { commitOffense } from '../legal/JusticeSystem.js';
import { OFFENSES } from '../legal/Offenses.js';
import { priceLevel } from '../world/Countries.js';
import { living } from '../people/People.js';

const KINDS = {
  theft: { offense: 'grandTheft', text: (who) => `${who}, a colleague, has told your manager you stole from the till and the stockroom.`, needs: (s) => Boolean(s.career.job) },
  assault: { offense: 'assault', text: (who) => `${who}, your ex, has told police you assaulted them.`, needs: (s) => living(s).some((p) => p.relation === 'ex') },
  fraud: { offense: 'wireFraud', text: (who) => `${who}, a former client, has gone to the police claiming you took their money for work you never did.`, needs: (s) => Boolean(s.career.job || s.business?.current) },
  care: { offense: 'childEndangerment', text: (who) => `${who}, a parent, has complained that you mistreated a child in your care.`, needs: (s) => /teach|education|childcare|nurs|medical|caregiving|socialWork|cps/.test(s.career.job?.professionId ?? '') },
};
const local = (state, n) => Math.round(n * priceLevel(state));
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 104729 + state.character.age * 821 + 0xacc) >>> 0);
export const accusationOf = (state) => state.legal.accused ?? null;

export function accusationTick(main) {
  const { state } = main;
  if (state.legal.incarceration || state.character.age < 18) return;
  const rng = sideRng(state);
  const a = state.legal.accused;
  if (!a) {
    const pool = Object.entries(KINDS).filter(([, k]) => k.needs(state) && OFFENSES[k.offense]);
    if (!pool.length || !rng.chance(0.006)) return;
    const [kind, k] = rng.pick(pool);
    const ex = kind === 'assault' ? living(state).find((p) => p.relation === 'ex') : null;
    const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
    const accuser = ex ? ex.firstName : `${n.firstName} ${n.lastName}`;
    state.legal.accused = { kind, accuser, since: state.character.age, stage: 'investigation', strength: rng.float(0.15, 0.5) };
    main.stat('stress', 15);
    main.emit('health:trauma', { amount: 6, source: 'false accusation' });
    if (state.career.job) main.emit('career:adjust', { performance: -8, boss: -10 });
    return main.prompt({ type: 'crime.accused', icon: '😨', title: 'Accused', text: `${k.text(accuser)} It isn't true. ${state.career.job ? 'You have been suspended while it is investigated.' : 'The police want to interview you.'}`, data: {}, options: [
      { id: 'lawyer', label: '⚖️ Hire a lawyer before saying anything', hint: `$${local(state, 6000).toLocaleString()}` },
      { id: 'cooperate', label: '🤝 Go in and answer every question', hint: 'You have nothing to hide — do you?' },
      { id: 'silent', label: '🤐 Say nothing at all' },
    ] });
  }
  // The months after: dropped, or charged.
  if (a.stage === 'investigation') {
    const drop = clamp(0.7 - a.strength + (a.lawyer ? 0.1 : 0) - (a.slip ? 0.15 : 0), 0.2, 0.9);
    if (rng.chance(drop)) return cleared(main, a, 'The investigation found nothing. The case was closed without charges.');
    a.stage = 'charged';
    return main.prompt({ type: 'crime.charged', icon: '⚖️', title: 'Charged', text: `Despite everything, you have been charged on ${a.accuser}'s word. Your ${a.lawyer ? 'lawyer' : 'duty solicitor'} says the case is ${a.strength > 0.35 ? 'harder than it should be' : 'weak'}.`, data: {}, options: [
      { id: 'trial', label: '🏛️ Plead not guilty and go to trial', hint: a.lawyer ? 'Your lawyer is ready' : `A trial lawyer costs $${local(state, 15000).toLocaleString()}` },
      { id: 'plea', label: '📝 Plead to something lesser to make it stop', hint: 'A record for something you didn\'t do' },
    ] });
  }
}

function cleared(ctx, a, how) {
  const { state } = ctx;
  state.legal.accused = null;
  ctx.log(`${how} Cleared — but not everyone heard.`, '🕊️', 'good');
  ctx.stat('stress', -10);
  ctx.emit('health:trauma', { amount: -4, source: 'cleared' });
  if (state.career.job) ctx.emit('career:adjust', { performance: 4 });
  ctx.prompt({ type: 'crime.clearedSue', icon: '⚖️', title: 'After', text: `You were cleared. ${a.accuser} is still telling people it was true.`, data: { accuser: a.accuser }, options: [
    { id: 'sue', label: '⚖️ Sue for defamation', hint: 'Expensive; satisfying if you win' },
    { id: 'move', label: '🚶 Move on with your life' },
  ] });
}

export const FalseAccusationResolvers = {
  accused(ctx, data, optionId) {
    const { state, rng } = ctx;
    const a = state.legal.accused;
    if (!a) return;
    if (optionId === 'lawyer') { ctx.spend(local(state, 6000), 'Criminal defence lawyer', { allowDebt: true }); a.lawyer = true; return ctx.log('Your lawyer sat beside you through the interview and answered half the questions for you.', '⚖️', 'info'); }
    if (optionId === 'cooperate') { if (rng.chance(0.25)) { a.slip = true; return ctx.log('You answered everything. One detail you got wrong under pressure is now in their file.', '🤝', 'warn'); } a.strength = Math.max(0.05, a.strength - 0.1); return ctx.log('You answered every question. The detective seemed to believe you.', '🤝', 'good'); }
    a.silent = true;
    ctx.log('You said "no comment" for two hours.', '🤐', 'info');
  },
  charged(ctx, data, optionId) {
    const { state, rng } = ctx;
    const a = state.legal.accused;
    if (!a) return;
    const k = KINDS[a.kind];
    if (optionId === 'plea') {
      state.legal.accused = null;
      state.legal.record.push({ offenseId: 'disorderly', name: OFFENSES.disorderly?.name ?? 'A lesser offence', severity: 'misdemeanor', age: state.character.age, sentence: 'plea to a lesser offence', falsePlea: true });
      ctx.stat('happiness', -10);
      return ctx.log('You pleaded to a lesser offence to make it stop. It\'s on your record for something you didn\'t do.', '📝', 'bad');
    }
    if (!a.lawyer) ctx.spend(local(state, 15000), 'Trial lawyer', { allowDebt: true });
    const acquit = clamp(0.62 + 0.15 - a.strength * 0.5 - (a.slip ? 0.1 : 0), 0.25, 0.9);
    if (rng.chance(acquit)) return cleared(ctx, a, `The jury took ${rng.int(2, 9)} hours. Not guilty.`);
    // Juries get it wrong.
    state.legal.accused = null;
    state.legal.flags.wronglyConvicted = true;
    ctx.log(`The jury believed ${a.accuser}. You were convicted of something you did not do.`, '⚖️', 'bad');
    commitOffense(ctx, { offenseId: k.offense, caught: true, evidence: 0.99, context: `a false accusation by ${a.accuser}` });
  },
  clearedSue(ctx, data, optionId) {
    const { state, rng } = ctx;
    if (optionId !== 'sue') return ctx.log('You moved on. Mostly.', '🚶', 'info');
    ctx.spend(local(state, 8000), 'Defamation lawyer', { allowDebt: true });
    if (rng.chance(0.45)) { const won = local(state, rng.int(15000, 120000)); ctx.earn(won, 'Defamation damages'); return ctx.log(`The court found ${data.accuser} had defamed you: $${won.toLocaleString()} in damages and a public apology.`, '⚖️', 'good'); }
    ctx.log('The defamation case failed. It\'s hard to prove, the lawyer said.', '⚖️', 'warn');
  },
};
