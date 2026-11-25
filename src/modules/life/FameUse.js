/**
 * Using fame, and what it costs.
 *
 *   Persona    the public image you keep: the family figure, the rebel, the philanthropist, the
 *              patriot, the artist. Scandals that fit it hurt less; those that break it, more.
 *   The team   a publicist (a press agent before 1950) softens the stories; a manager raises
 *              your fees. Both cost money every year.
 *   Spending   lend your name to a cause (influence for it), to a candidate (their votes), or to a
 *              foundation of your own (a charity in your name).
 *   Rivals     a rival name in your field; a public feud sells papers, and can turn on you.
 *   Press law  winning against the papers depends on where you are: Britain's strict libel law,
 *              America after New York Times v. Sullivan (1964), France's privacy law (1970); under a
 *              censored press, the state decides what is printed.
 *   The cost   the children in the spotlight, the pressure, and fading: the has-been years, the
 *              reunion tour, the second act.
 *
 * state.fame.persona, state.fame.team = { publicist, manager }, state.fame.rival, state.fame.foundation
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { regimeHere } from '../world/Regimes.js';
import { fameScore, addBuzz } from './Fame.js';

export const PERSONAS = {
  family: { label: '👪 The family figure', note: 'Trusted; a sex or drink scandal is ruinous', fits: /tax|debt/, breaks: /lover|party|ex wrote|video/ },
  rebel: { label: '🎸 The rebel', note: 'Scandal is half the act; dull is fatal', fits: /party|video|chat|lover/, breaks: /tax/ },
  philanthropist: { label: '🤲 The philanthropist', note: 'Gifts and causes pay double in goodwill', fits: /friend/, breaks: /tax|debt/ },
  patriot: { label: '🎖️ The patriot', note: 'The papers are kind; disloyalty never forgiven', fits: /debt/, breaks: /chat|video/ },
  artist: { label: '🎨 The artist', note: 'Forgiven most things, if the work is good', fits: /party|lover|debt/, breaks: /tax/ },
};
const TEAM = {
  publicist: { label: (y) => (y < 1950 ? 'A press agent' : 'A publicist'), cost: 60000, note: 'Stories land softer' },
  manager: { label: () => 'A manager', cost: 40000, note: 'Fees and deals a third higher' },
};
export const teamCost = (state, id) => Math.round(TEAM[id].cost * priceLevel(state) * (yearNow(state) < 1950 ? 0.4 : 1));
export const teamLabel = (state, id) => TEAM[id].label(yearNow(state));

/** How a scandal lands, given your persona and your publicist: a multiplier on its severity. */
export function scandalWeight(state, headline) {
  const f = state.fame ?? {};
  const p = PERSONAS[f.persona];
  let k = 1;
  if (p?.fits.test(headline)) k *= 0.6;
  if (p?.breaks.test(headline)) k *= 1.5;
  if (f.team?.publicist) k *= 0.75;
  return k;
}

/** Your odds against the papers in court, here and now. */
export function pressLawOdds(state, kind = 'libel') {
  const cc = state.character.countryId ?? 'US';
  const y = yearNow(state);
  if (regimeHere(state)?.press === 'state') return kind === 'libel' ? 0.9 : 0.8; // the state's papers print what it wants; they rarely want you
  if (kind === 'privacy') return cc === 'FR' && y >= 1970 ? 0.75 : ['DE', 'IT', 'ES'].includes(cc) ? 0.55 : cc === 'GB' && y >= 2004 ? 0.5 : cc === 'US' ? 0.2 : 0.35;
  if (cc === 'GB' || cc === 'IE' || cc === 'AU' || cc === 'SG') return 0.65;
  if (cc === 'US') return y >= 1964 ? 0.15 : 0.5;
  return 0.45;
}

const rngOf = (state) => new Random(((state.world?.seed ?? 9) * 1597334677 + state.character.age * 131 + 0x5f) >>> 0);
const kidsAtHome = (state) => (state.people?.list ?? []).filter((p) => p.alive && p.relation === 'child' && state.character.age + p.ageOffset >= 0 && state.character.age + p.ageOffset < 18);

export const FameUseModule = {
  id: 'fameUse',
  order: 96.1,
  onAgeUp(ctx) {
    const { state } = ctx;
    const f = state.fame;
    if (!f || !state.character.alive || state.character.age < 16) return;
    const rng = rngOf(state);
    const score = fameScore(state);
    // The team's bills.
    for (const id of Object.keys(f.team ?? {})) if (f.team[id] && !ctx.spend(teamCost(state, id), `${teamLabel(state, id)}'s fees`, { credit: false })) { f.team[id] = false; ctx.log(`You couldn't pay ${teamLabel(state, id).toLowerCase()}, who left.`, '💼', 'warn'); }
    // The manager's cut is more than paid for by the deals.
    if (f.team?.manager) for (const d of f.deals ?? []) if (!d.managed) { d.amount = Math.round(d.amount * 1.33); d.managed = true; }
    // The foundation gives every year while it has money.
    if (f.foundation) {
      ctx.spend(Math.round(f.foundation.yearly), `${f.foundation.name}`, { allowDebt: true });
      addBuzz(state, f.persona === 'philanthropist' ? 2 : 1);
      ctx.stat('happiness', 1);
    }
    // The cost: pressure, the children in the papers, fading.
    if (score >= 55) ctx.stat('stress', 2);
    const kids = kidsAtHome(state);
    if (score >= 45 && kids.length && state.protection?.posture !== 'low' && rng.chance(0.15)) {
      const k = rng.pick(kids);
      k.relationship = clamp((k.relationship ?? 60) - 4, 0, 100);
      ctx.log(`A photograph of ${k.firstName} at school was in the papers. ${k.firstName} hated it.`, '📸', 'warn');
    }
    const peak = f.peak ?? 0;
    if (peak >= 45 && score <= peak - 25 && !f.fadedAt) {
      f.fadedAt = state.character.age;
      ctx.log('The calls have dried up. Somewhere a paper ran a "Where are they now?" piece with your old photograph.', '🕰️', 'warn');
    }
    if (f.fadedAt && !f.secondAct && state.character.age - f.fadedAt >= 3 && rng.chance(0.2) && !state.prompts.some((p) => p.type === 'fameUse.secondAct')) {
      return ctx.prompt({ type: 'fameUse.secondAct', icon: '🎟️', title: 'A Second Act', text: yearNow(state) < 1950 ? 'An impresario wants to put you back on the bill: a farewell tour of the big towns.' : 'A producer wants you for a nostalgia tour and a documentary about your comeback.', options: [{ id: 'go', label: '🎟️ One more time' }, { id: 'no', label: '🏡 Leave them wanting more' }] });
    }
    // A rival in your field.
    if (score >= 30 && !f.rival && rng.chance(0.08)) {
      const nm = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
      f.rival = { name: `${nm.firstName} ${nm.lastName}`, since: state.character.age };
      return ctx.prompt({ type: 'fameUse.rival', icon: '⚔️', title: 'A Rival', text: `The papers have decided ${f.rival.name} is your rival: same field, same crowd, and quotes about you that are not kind.`, options: [{ id: 'feud', label: '🔥 Hit back in public', hint: 'Buzz; it can turn' }, { id: 'above', label: '🕊️ Rise above it' }, { id: 'ally', label: '🤝 Invite them to work together' }] });
    }
    return undefined;
  },
  actions: {
    persona(ctx, id) {
      const f = (ctx.state.fame ??= {});
      if (!PERSONAS[id]) return undefined;
      if (f.persona && f.persona !== id) addBuzz(ctx.state, -4);
      f.persona = id;
      return ctx.log(`Your public image: ${PERSONAS[id].label.slice(3)}.`, PERSONAS[id].label.slice(0, 2), 'info');
    },
    hire(ctx, id) {
      const { state } = ctx;
      const f = (state.fame ??= {});
      if (!TEAM[id]) return undefined;
      f.team ??= {};
      if (f.team[id]) { f.team[id] = false; return ctx.log(`You let ${teamLabel(state, id).toLowerCase()} go.`, '💼', 'info'); }
      if (state.finances.cash < teamCost(state, id)) return ctx.toast('A year\'s fees in hand first', 'warn');
      f.team[id] = true;
      return ctx.log(`You took on ${teamLabel(state, id).toLowerCase()}.`, '💼', 'good');
    },
    /** Lend your name: to your cause (influence) or to the party you back (votes). arg: 'cause' | 'candidate'. */
    lend(ctx, arg) {
      const { state } = ctx;
      const score = fameScore(state);
      if (score < 20) return ctx.toast('Your name needs to mean something first', 'warn');
      if (yearlyCount(state, 'fameUse.lend')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'fameUse.lend');
      if (arg === 'cause') {
        const a = state.civic?.activism;
        if (!a?.cause) return ctx.toast('Pick a cause first (Community)', 'warn');
        a.influence = Math.min(100, (a.influence ?? 0) + Math.round(score / 5));
        return ctx.log('You put your name and your face behind the cause: the papers covered it for a week.', '📣', 'good');
      }
      state.politics ??= {};
      state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + Math.round(score / 8));
      const o = state.politics.office;
      if (o) o.approval = Math.min(100, (o.approval ?? 50) + Math.round(score / 15));
      return ctx.log('You spoke at rallies for your side. Crowds came to see you, and stayed for the speeches.', '🗳️', 'good');
    },
    /** A foundation in your name: a gift now and a yearly grant. */
    foundation(ctx) {
      const { state } = ctx;
      const f = (state.fame ??= {});
      if (f.foundation) return ctx.toast('You already have a foundation', 'warn');
      const gift = Math.round(250000 * priceLevel(state) * (yearNow(state) < 1950 ? 0.4 : 1));
      if (!ctx.spend(gift, 'Endowing your foundation', { credit: false })) return ctx.toast('Not enough cash', 'warn');
      f.foundation = { name: `The ${state.character.lastName ?? state.character.firstName} Foundation`, since: state.character.age, yearly: Math.round(gift * 0.05) };
      addBuzz(state, f.persona === 'philanthropist' ? 12 : 6);
      return ctx.log(`${f.foundation.name} gave its first grants.`, '🤲', 'milestone');
    },
  },
  resolvers: {
    rival(ctx, data, optionId) {
      const { state, rng } = ctx;
      const f = state.fame;
      if (optionId === 'feud') {
        addBuzz(state, 8);
        if (rng.chance(0.3)) { f.scandals.push({ age: state.character.age, headline: `your feud with ${f.rival.name} turned ugly`, severity: 6 }); ctx.stat('stress', 6); return ctx.log(`The feud with ${f.rival.name} turned ugly, and the papers turned on you both.`, '🔥', 'bad'); }
        return ctx.log(`You gave as good as you got. The papers loved it; so did your fans.`, '🔥', 'good');
      }
      if (optionId === 'ally') { ctx.stat('happiness', 3); addBuzz(state, 4); f.rival.allied = true; return ctx.log(`You and ${f.rival.name} worked together. The papers were disappointed.`, '🤝', 'good'); }
      return ctx.log('You said nothing. It blew over, mostly.', '🕊️', 'info');
    },
    secondAct(ctx, data, optionId) {
      const { state, rng } = ctx;
      const f = state.fame;
      if (optionId !== 'go') { f.secondAct = 'declined'; return ctx.log('You stayed home. People remember you as you were.', '🏡', 'info'); }
      f.secondAct = 'taken';
      const ok = rng.chance(0.55);
      addBuzz(state, ok ? 20 : 6);
      ctx.earn(Math.round((ok ? 120000 : 30000) * priceLevel(state) * (yearNow(state) < 1950 ? 0.4 : 1)), 'The comeback tour', { wage: true });
      if (ok) f.fadedAt = null;
      return ctx.log(ok ? 'The second act sold out. A whole new generation discovered you.' : 'Some nights were full and some were not. It was good to be back.', '🎟️', ok ? 'good' : 'info');
    },
  },
};
