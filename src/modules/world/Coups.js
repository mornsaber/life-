/**
 * Coups and juntas. In countries where the army has taken power before (and in fragile
 * states) it can do so again: the government falls, parliament is suspended, elections stop,
 * neighbours and the West impose sanctions. A junta rules for some years, is overthrown by
 * another, or hands power back to an elected government.
 *
 *   You, if you're there   A minister or member of parliament is deposed (and may be
 *                detained); a senior officer is asked to join, to stand aside, or (a
 *                general) to lead. Leading a successful coup makes you head of the military
 *                council: you rule by decree, face counter-coups, and choose whether to
 *                hold elections — and whether to stand in them.
 *
 * state.world.juntas = { [cc]: { since, leader: 'you' | name, leaderTitle, sanctions, civilian } }
 * state.regime.junta = { cc, since, role: 'leader' | 'member' }
 */
import { currentYear, yearlyCount, bumpYearly, addHonor, randomName } from '../../core/State.js';
import { clamp, Random } from '../../core/Random.js';
import { COUNTRIES } from './Countries.js';
import { REGIMES, coupProne, setRegimeOverrides, baseRegimeOf, setCoupHook } from './Regimes.js';
import { arrive } from './Migration.js';
import { OFFICES } from '../politics/Offices.js';

const juntas = (state) => (state.world.juntas ??= {});
const general = (rng) => { const n = randomName(rng, 'male'); return `General ${n.firstName} ${n.lastName}`; };
const AFRICAN = ['ML', 'NE', 'GW', 'SD', 'TD', 'BF', 'GN', 'CF', 'CD', 'SS', 'SO', 'NG', 'ET'];
const sanctionsFor = (cc) => ({ by: AFRICAN.includes(cc) ? 'the African Union, ECOWAS and the EU' : 'the US, the EU and the country\'s neighbours', level: 1, note: 'Suspended from regional bodies; aid frozen; travel bans on the junta\'s leaders.' });
const name = (cc) => COUNTRIES[cc]?.name ?? cc;
/** Military rule now: a base junta not yet handed back, or a coup in play. */
export const militaryRule = (state, cc) => {
  const j = state.world?.juntas?.[cc];
  if (j) return !j.civilian;
  return baseRegimeOf(cc).kind === 'junta';
};
const sync = (state) => setRegimeOverrides(state.world?.juntas);
const inNationalOffice = (state, cc) => {
  const o = state.politics?.office;
  return Boolean(o && OFFICES[o.id] && (o.id.startsWith(`${cc.toLowerCase()}_`) || OFFICES[o.id].country === cc));
};

/** The army takes power in a country. `leader`: 'you' when you led it. */
export function coup(ctx, cc, { leader = null } = {}) {
  const { state, rng } = ctx;
  const j = juntas(state);
  j[cc] = { since: currentYear(state), leader: leader ?? general(rng), leaderTitle: rng.pick(['the President of the Transitional Council', 'the Chairman of the National Salvation Committee', 'the head of the military council']), sanctions: sanctionsFor(cc) };
  sync(state);
  (state.world.suspendedParliament ??= {})[cc] = currentYear(state);
  const here = (state.character.countryId ?? 'US') === cc;
  if (!here) return j[cc];
  ctx.log(`Tanks in the capital: the army seized power in ${name(cc)}. Parliament is suspended, the constitution "paused", and ${j[cc].leaderTitle} speaks on state television every night.`, '🪖', 'bad');
  if (leader !== 'you' && inNationalOffice(state, cc)) {
    ctx.emit('politics:leave', { reason: 'Deposed in a military coup' });
    if (rng.chance(0.35)) {
      ctx.log('Soldiers took you from your home. You were held for months without charge.', '⛓️', 'bad');
      ctx.stat('health', -8);
      ctx.stat('happiness', -15);
    }
  }
  return j[cc];
}

/** Power handed back: elections, a civilian government, sanctions lifted. */
export function handBack(ctx, cc, why) {
  const { state } = ctx;
  const j = juntas(state);
  j[cc] = { since: currentYear(state), civilian: true };
  sync(state);
  if (state.world.suspendedParliament) delete state.world.suspendedParliament[cc];
  if (state.regime?.junta?.cc === cc) state.regime.junta = null;
  if ((state.character.countryId ?? 'US') === cc) ctx.log(why ?? `The military council kept its promise: ${name(cc)} held elections, and soldiers went back to barracks. Sanctions were lifted.`, '🗳️', 'milestone');
}

function worldYear(ctx) {
  const { state, rng } = ctx;
  const j = juntas(state);
  for (const cc of Object.keys(REGIMES).filter(coupProne)) {
    const now = j[cc];
    const ruling = militaryRule(state, cc);
    const years = now ? currentYear(state) - now.since : 5;
    if (now?.leader === 'you') continue;
    if (!ruling && rng.chance(now?.civilian ? 0.03 : 0.025)) coup(ctx, cc);
    else if (ruling && years >= 2 && rng.chance(0.07)) handBack(ctx, cc);
    else if (ruling && years >= 1 && rng.chance(0.03)) {
      // A counter-coup: colonels against generals.
      coup(ctx, cc);
      if ((state.character.countryId ?? 'US') === cc) ctx.log('It was a counter-coup: the junta\'s own officers overthrew it.', '🪖', 'warn');
    }
  }
}

/** Ruling as head of a junta. */
function leaderYear(ctx) {
  const { state, rng } = ctx;
  const g = state.regime?.junta;
  if (g?.role !== 'leader') return;
  const j = state.world.juntas?.[g.cc];
  if (!j || j.civilian) { state.regime.junta = null; return; }
  g.years = (g.years ?? 0) + 1;
  ctx.earn(120000, 'Head of the military council (allowances and "gifts")', { wage: true });
  g.unrest = clamp((g.unrest ?? 20) + rng.int(-4, 8), 0, 100);
  // Your own officers are the danger.
  if (rng.chance(0.03 + g.unrest / 400)) {
    state.regime.junta = null;
    j.leader = general(rng);
    if (rng.chance(0.5)) {
      ctx.log('A counter-coup: younger officers stormed the presidential palace. You escaped abroad with what you could carry.', '🪖', 'bad');
      arrive(ctx, rng.pick(['AE', 'SA', 'FR', 'MA'].filter((x) => x !== g.cc)), { reason: 'Exile after a counter-coup.' });
    } else {
      ctx.log('A counter-coup: you were arrested by your own guards and tried for treason.', '⛓️', 'bad');
      ctx.emit('legal:offense', { offenseId: 'antiState', context: 'treason after a counter-coup', caught: true, evidence: 0.99 });
    }
  }
}

setCoupHook(coup);

export const CoupsModule = {
  id: 'coups',
  order: 61.2,
  init(state) {
    sync(state);
  },
  onAgeUp(engineCtx) {
    const { state } = engineCtx;
    if (!state.character.alive) return;
    // A side stream, so the world's coups don't reshuffle every other roll in the life.
    const rng = new Random(((state.world?.seed ?? 1) * 2654435761 + currentYear(state) * 97 + 0xc0) >>> 0);
    const ctx = { ...engineCtx, rng };
    sync(state);
    worldYear(ctx);
    leaderYear(ctx);
  },
  actions: {
    /** As head of the junta: hold elections and step down (or stand in them). */
    holdElections(ctx, how) {
      const { state, rng } = ctx;
      const g = state.regime?.junta;
      if (g?.role !== 'leader') return ctx.toast('Only the head of the junta can call elections.', 'warn');
      if (how === 'stand') {
        const won = rng.chance(clamp(0.4 + (state.politics?.recognition ?? 0) / 300 - (g.unrest ?? 20) / 300, 0.15, 0.8));
        handBack(ctx, g.cc, won ? 'You took off the uniform and stood for president. You won — "a landslide", said state television; "flawed", said the observers.' : 'You stood in the elections you called, and lost. You handed over power and retired to your farm.');
        if (won) state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 20);
        return undefined;
      }
      handBack(ctx, g.cc, 'You called elections and kept out of them. Power passed to a civilian president, and the history books were kinder than they might have been.');
      addHonor(state, { id: 'coups.transition', source: 'civil', name: 'Honoured for the transition to civilian rule', icon: '🕊️', prestige: 12, precedence: 30, citation: 'For handing power back.' });
      return undefined;
    },
    /** As head of the junta: crush dissent (calm now, sanctions and hatred later). */
    crackdown(ctx) {
      const { state } = ctx;
      const g = state.regime?.junta;
      if (g?.role !== 'leader') return ctx.toast('Only the head of the junta.', 'warn');
      if (yearlyCount(state, 'coups.crackdown')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'coups.crackdown');
      g.unrest = Math.max(0, (g.unrest ?? 20) - 15);
      const j = state.world.juntas[g.cc];
      j.sanctions = { ...(j.sanctions ?? sanctionsFor(g.cc)), level: Math.min(3, (j.sanctions?.level ?? 1) + 1) };
      sync(state);
      return ctx.log('You sent troops into the streets. The protests stopped; the sanctions doubled.', '🚔', 'warn');
    },
  },
};
