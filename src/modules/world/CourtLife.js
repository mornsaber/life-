/**
 * Life at court: what a royal life costs and risks, beyond the duties.
 *
 *   Protection    Working royals near the throne have protection officers at the state's
 *                 expense. Threats rise with the throne, unpopularity and unrest; an unprotected
 *                 royal meets them alone. Step back and the state's protection goes: pay for
 *                 your own, or take your chances.
 *   Press office  How the palace handles the papers: never complain, rebut, or cultivate the
 *                 royal correspondents (who sometimes repay it by briefing against the family).
 *   Consent       Those near the throne need the sovereign's consent to marry. Ask; if it's
 *                 refused, marry anyway and leave the line, or wait. A Japanese princess who
 *                 marries leaves the imperial family.
 *   After duty    A royal who stepped back can sell what they have: a memoir, a streaming deal,
 *                 a podcast, a brand. The money is real; so is the family's fury.
 *
 * state.royal.protection: 'state' | 'private' | 'none'; state.royal.pressOffice; state.royal.deals
 */
import { yearlyCount, bumpYearly, currentYear } from '../../core/State.js';
import { clamp, Random } from '../../core/Random.js';
import { living } from '../people/People.js';
import { refreshLine } from './RoyalLine.js';

export const PROTECTION_COST = 1200000;
export const PRESS_OFFICE = {
  silent: { label: '🤐 Never complain, never explain', note: 'The old way: the stories blow over, mostly' },
  rebut: { label: '📣 Rebut every story', note: 'Fewer stories stick; more stress' },
  cultivate: { label: '🥂 Cultivate the royal correspondents', note: 'Better coverage, and the odd briefing against the family' },
};
export const DEALS = {
  memoir: { label: '📖 A memoir', earn: 18e6, pop: -8, family: -20, text: 'Your memoir sold 3 million copies in a week. The family read it too.' },
  streaming: { label: '🎬 A streaming documentary deal', earn: 28e6, pop: -5, family: -12, text: 'A six-part documentary about your life, filmed at home. The palace issued a seven-line statement.' },
  podcast: { label: '🎙️ A podcast', earn: 6e6, pop: -2, family: -4, flop: 0.4, text: 'Your podcast launched to huge numbers.' },
  brand: { label: '🏷️ A lifestyle brand', earn: 9e6, pop: -3, family: -5, flop: 0.3, text: 'Your brand\'s first jam sold out in an hour.' },
};

const pop = (r, d) => { r.popularity = Math.round(clamp((r.popularity ?? 60) + d, 0, 100)); };
const family = (state, d) => { for (const p of living(state).filter((x) => ['mother', 'father', 'sibling', 'grandparent'].includes(x.relation))) p.relationship = clamp((p.relationship ?? 60) + d, 0, 100); };

/** State protection: the sovereign, and working royals near the throne. */
export const stateProtected = (r) => Boolean(r && (r.reigning || (r.working && r.line != null && r.line <= 8)));
export function protectionOf(state) {
  const r = state.royal;
  if (!r) return 'none';
  if (stateProtected(r)) return 'state';
  return r.protection === 'private' ? 'private' : 'none';
}
/** How much danger a royal life draws this year (0–100). */
export function threatOf(state) {
  const r = state.royal;
  if (!r) return 0;
  return clamp(8 + (r.reigning ? 22 : 0) + (r.line != null && r.line <= 3 ? 10 : 0) + (r.unrest ?? 0) / 3 + ((r.popularity ?? 60) < 35 ? 12 : 0) + (r.steppedBack ? 12 : 0), 0, 100);
}

/** Whoever is near the throne needs consent to marry; returns the fiancé(e) if so. */
export function consentNeeded(state) {
  const r = state.royal;
  if (!r || r.reigning || r.line == null || r.line > 6 || r.steppedBack) return null;
  const f = living(state).find((p) => p.relation === 'fiance');
  return f && !['given', 'defied'].includes(f.royalConsent) ? f : null;
}

const INCIDENTS = [
  { id: 'stalker', guarded: 'Your protection officers identified a fixated stalker who had written 400 letters; the police took it from there.', alone: 'A stalker followed you for months. Nobody stopped them until they were at your door.', stress: 10, hurt: 0 },
  { id: 'intruder', guarded: 'An intruder got over the wall at night. Your officers had him on the ground in ninety seconds.', alone: 'An intruder broke into your home while you slept. He took jewellery, and your sense of safety.', stress: 15, hurt: 0, loss: 150000 },
  { id: 'attack', guarded: 'A man lunged at you at a walkabout. Your protection officer took the blow.', alone: 'A man attacked you on the street. There was no one between you and him.', stress: 20, hurt: 25 },
];

export const CourtLifeModule = {
  id: 'courtLife',
  order: 33.95,
  setup(engine) {
    // A Japanese princess who marries a commoner leaves the imperial family.
    engine.bus.on('people:married', ({ ctx }) => {
      const { state } = ctx;
      const r = state.royal;
      if (!r || r.crownId !== 'JP' || state.character.gender !== 'female' || r.reigning) return;
      const ch = state.character;
      ch.formerRoyal = { crownId: r.crownId, level: r.level, year: currentYear(state), age: ch.age, reigned: false, regnal: null, married: true };
      ch.style = { ...(ch.style ?? {}), prefix: null, peerage: null };
      state.royal = null;
      ctx.earn(1400000, 'The state\'s settlement on leaving the imperial family');
      ctx.log('By marrying, you left the imperial family: no title, no allowance, a one-off settlement from the state, and your own surname for the first time.', '🌸', 'milestone');
    });
  },
  guard(state, actionId) {
    if (actionId === 'people.wed' && consentNeeded(state)) return 'You need the sovereign\'s consent to marry: ask in Court → Household.';
    return null;
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const r = state.royal;
    if (!r || !state.character.alive) return;
    const rng = new Random(((state.world?.seed ?? 1) * 40503 + currentYear(state) * 131 + 0xc0) >>> 0);
    // Private protection is paid for, or it lapses.
    if (!stateProtected(r) && r.protection === 'private' && !ctx.spend(PROTECTION_COST, 'Private protection officers')) {
      r.protection = 'none';
      ctx.log('You could no longer pay for your own protection officers. They left.', '🛡️', 'warn');
    }
    // The threats.
    const guarded = protectionOf(state) !== 'none';
    if (state.character.age >= 12 && rng.chance(threatOf(state) / 300)) {
      const k = rng.pick(INCIDENTS);
      ctx.stat('stress', guarded ? Math.round(k.stress / 3) : k.stress);
      if (!guarded && k.hurt) ctx.stat('health', -rng.int(Math.round(k.hurt / 2), k.hurt));
      if (!guarded && k.loss) ctx.spend(Math.min(k.loss, Math.max(0, state.finances.cash)), 'Stolen in a break-in');
      ctx.log(guarded ? k.guarded : k.alone, guarded ? '🛡️' : '🚨', guarded ? 'info' : 'bad');
    }
    // The press office's way with the papers.
    const po = r.pressOffice ?? 'silent';
    if (r.working && state.character.age >= 18) {
      if (po === 'rebut') { if ((r.popularity ?? 60) < 55) pop(r, 1); ctx.stat('stress', 1); }
      if (po === 'cultivate') {
        pop(r, 1);
        if (rng.chance(0.12)) {
          const sib = living(state).find((p) => ['sibling', 'mother', 'father'].includes(p.relation));
          if (sib) { sib.relationship = clamp((sib.relationship ?? 60) - 10, 0, 100); ctx.log(`A royal correspondent ran a story clearly briefed from your office, at ${sib.firstName}'s expense. ${sib.firstName} noticed.`, '🗞️', 'warn'); }
        }
      }
    }
  },
  actions: {
    /** Pay for your own protection (arg: 'private' | 'none'). */
    protection(ctx, mode) {
      const { state } = ctx;
      const r = state.royal;
      if (!r) return undefined;
      if (stateProtected(r)) return ctx.toast('The state protects you.', 'warn');
      if (mode === 'private') {
        if (r.protection === 'private') return undefined;
        if (!ctx.spend(PROTECTION_COST, 'Private protection officers')) return ctx.toast('You can\'t afford a protection team.', 'warn');
        r.protection = 'private';
        return ctx.log('You hired your own protection team: former police officers, armoured cars, a security adviser.', '🛡️', 'info');
      }
      r.protection = 'none';
      return ctx.log('You let your protection officers go.', '🛡️', 'warn');
    },
    /** Set the press office's way (arg: silent | rebut | cultivate). */
    pressOffice(ctx, mode) {
      const r = ctx.state.royal;
      if (!r?.working || !PRESS_OFFICE[mode]) return ctx.toast('Only a working royal has a press office.', 'warn');
      r.pressOffice = mode;
      return ctx.log({ silent: 'Your press office will say nothing, as the old rule has it.', rebut: 'Your press office will rebut every story, on the record.', cultivate: 'Your press office will cultivate the royal correspondents: lunches, access, the odd exclusive.' }[mode], '📰', 'info');
    },
    /** Ask the sovereign's consent to marry. */
    askConsent(ctx) {
      const { state, rng } = ctx;
      const f = consentNeeded(state);
      if (!f) return ctx.toast('You don\'t need consent.', 'warn');
      if (f.royalConsent === 'refused') return ctx.toast('The sovereign has refused. Wait, or marry without it.', 'warn');
      if (yearlyCount(state, 'courtLife.consent')) return ctx.toast('Once a year.', 'warn');
      bumpYearly(state, 'courtLife.consent');
      f.suitability ??= rng.int(25, 95);
      const parent = living(state).find((p) => p.royal === 'monarch');
      const p = clamp(f.suitability / 100 + ((parent?.relationship ?? 60) - 60) / 200 + 0.1, 0.1, 0.95);
      if (rng.chance(p)) {
        f.royalConsent = 'given';
        return ctx.log(`The sovereign gave consent to your marriage to ${f.firstName}, under the Great Seal. The engagement was announced from the palace.`, '📜', 'good');
      }
      f.royalConsent = 'refused';
      ctx.stat('stress', 8);
      return ctx.log(`The sovereign withheld consent to your marriage to ${f.firstName}. Advisers called the match "unsuitable".`, '📜', 'bad');
    },
    /** Marry without consent: you (and your descendants) leave the line. */
    marryWithout(ctx) {
      const { state } = ctx;
      const r = state.royal;
      const f = living(state).find((p) => p.relation === 'fiance');
      if (!r || !f) return undefined;
      f.royalConsent = 'defied';
      if (r.tree?.nodes?.you) r.tree.nodes.you.out = 'married without the sovereign\'s consent';
      refreshLine(state);
      pop(r, -3);
      family(state, -10);
      return ctx.log(`You chose ${f.firstName} over the line of succession. You may marry as you like now — and you, and your children, are out of the line.`, '💍', 'milestone');
    },
    /** After stepping back: sell the story (arg: memoir | streaming | podcast | brand). */
    deal(ctx, kind) {
      const { state, rng } = ctx;
      const r = state.royal;
      const d = DEALS[kind];
      if (!r?.steppedBack || !d) return ctx.toast('Working royals don\'t sign commercial deals.', 'warn');
      r.deals ??= [];
      if (r.deals.includes(kind)) return ctx.toast('Done that.', 'warn');
      r.deals.push(kind);
      if (d.flop && rng.chance(d.flop)) {
        ctx.earn(Math.round(d.earn / 5), d.label.slice(3));
        pop(r, d.pop);
        return ctx.log(`${d.label.slice(3)}: it launched to mockery and was quietly dropped.`, '📉', 'bad');
      }
      ctx.earn(d.earn, d.label.slice(3));
      pop(r, d.pop);
      family(state, d.family);
      return ctx.log(d.text, d.label.split(' ')[0], 'milestone');
    },
  },
};
