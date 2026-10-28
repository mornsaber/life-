/**
 * Officers and the state, beyond the chain of command:
 *
 *   Plotting a coup   in a coup-prone country, an officer of its own forces (major and up —
 *                     captains have done it too) can build a conspiracy: sound out units, win
 *                     over the guard, then strike. Each year of plotting risks discovery; the
 *                     odds of the strike rise with support and rank. Success makes you head
 *                     of the military council (Coups.js); failure means arrest or flight
 *   Foreign advisor   a retired officer (major and up) can be hired by a developing country to
 *                     build its army: a contract general's rank, a large tax-free salary, and
 *                     a force to raise — training, a staff college, an anti-corruption purge.
 *                     The army you build may one day turn on its own government
 *
 * state.regime.plot = { cc, support, years }
 * state.foreignAdvisor = { cc, title, years, term, readiness, college, salary }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { COUNTRIES } from '../world/Countries.js';
import { coupProne } from '../world/Regimes.js';
import { coup, militaryRule } from '../world/Coups.js';
import { rankTitles } from './MilitaryEngine.js';

const here = (state) => state.character.countryId ?? 'US';
const svcOf = (state) => state.military?.service ?? null;
/** An officer of this country's own forces, major or above, where coups happen. */
export function canPlot(state) {
  const svc = svcOf(state);
  const cc = here(state);
  if (!svc || svc.track !== 'officer' || svc.grade < 2) return { ok: false, reason: 'Officers of captain rank and above' };
  if ((svc.nation ?? 'US') !== cc) return { ok: false, reason: 'Only in your own country\'s forces' };
  if (!coupProne(cc)) return { ok: false, reason: 'The army here stays in its barracks' };
  if (state.regime?.junta?.role === 'leader') return { ok: false, reason: 'You already rule' };
  return { ok: true };
}

/** Developing armies that hire foreign officers to build them up. */
export const CLIENT_ARMIES = ['SO', 'ML', 'NE', 'LR', 'SL', 'RW', 'UG', 'KE', 'NG', 'GH', 'PG', 'TL', 'IQ', 'GE', 'MN', 'KH', 'LA', 'BF', 'CF', 'SS', 'ET', 'MZ', 'HT', 'AE', 'QA', 'OM', 'BH', 'KW', 'BW', 'NA', 'ZM', 'MW', 'TD', 'BJ', 'TG', 'SN', 'CI', 'CM'];
const retiredOfficer = (state) => [...(state.military?.history ?? [])].reverse().find((h) => h.discharge === 'retired' && h.track === 'officer' && (h.grade ?? 0) >= 3) ?? null;
export function canAdvise(state) {
  if (svcOf(state)) return { ok: false, reason: 'Leave the service first' };
  if (state.foreignAdvisor) return { ok: false, reason: 'Already on contract' };
  if (!retiredOfficer(state)) return { ok: false, reason: 'Retired officers, major and above' };
  if (state.character.age > 70) return { ok: false, reason: 'Contracts go to officers under 70' };
  return { ok: true };
}
/** Three armies asking this year. */
export function clientOffers(state) {
  const pool = CLIENT_ARMIES.filter((c) => COUNTRIES[c] && c !== here(state));
  const seed = state.character.age * 13 + (state.world?.seed ?? 3);
  return [0, 1, 2].map((i) => pool[(seed + i * 11) % pool.length]).filter((c, i, a) => a.indexOf(c) === i);
}

function startAdvising(ctx, cc) {
  const { state } = ctx;
  const h = retiredOfficer(state);
  const gulf = ['AE', 'QA', 'OM', 'BH', 'KW'].includes(cc);
  const star = Math.min(3, Math.max(1, (h.grade ?? 4) - 4));
  const title = `${['Brigadier General', 'Major General', 'Lieutenant General'][star - 1]} (contract), Adviser to the Chief of Defence Staff`;
  state.foreignAdvisor = { cc, title, years: 0, term: 3, readiness: ctx.rng.int(15, 35), college: false, salary: gulf ? 320000 : 180000 };
  ctx.log(`${COUNTRIES[cc].flag} ${COUNTRIES[cc].name} hired you to rebuild its armed forces: ${title}. A villa, a driver, a tax-free salary and an army that barely exists on paper.`, '🎖️', 'milestone');
}

function advisorYear(ctx) {
  const { state, rng } = ctx;
  const a = state.foreignAdvisor;
  if (!a) return;
  a.years += 1;
  ctx.earn(a.salary, `Military adviser — ${COUNTRIES[a.cc].name}`, { wage: true });
  a.readiness = clamp(a.readiness + rng.int(0, 4) + (a.college ? 3 : 0), 0, 100);
  ctx.stat('stress', 4);
  // The army you build can turn on its masters.
  if (coupProne(a.cc) && a.readiness >= 50 && rng.chance(0.04) && !militaryRule(state, a.cc)) {
    coup(ctx, a.cc);
    a.readiness = Math.max(0, a.readiness - 20);
    ctx.log(`${COUNTRIES[a.cc].flag} The officers you trained seized power in ${COUNTRIES[a.cc].name}. Your contract is under review by the new junta.`, '🪖', 'bad');
    if (rng.chance(0.5)) return endAdvising(ctx, 'The junta sent the foreign advisers home.');
  }
  if (a.years >= a.term) {
    if (a.readiness >= 55 && rng.chance(0.7)) {
      a.term += 3;
      ctx.log(`${COUNTRIES[a.cc].flag} The ministry renewed your contract for three more years: readiness has gone from paper to ${a.readiness}%.`, '✍️', 'good');
    } else return endAdvising(ctx, 'Your contract ended.');
  }
  return undefined;
}

function endAdvising(ctx, why) {
  const { state } = ctx;
  const a = state.foreignAdvisor;
  if (!a) return;
  (state.military.advisorHistory ??= []).push({ cc: a.cc, title: a.title, years: a.years, readiness: a.readiness });
  state.foreignAdvisor = null;
  ctx.log(`${why} You leave ${COUNTRIES[a.cc].name}'s army at ${a.readiness}% readiness after ${a.years} year${a.years === 1 ? '' : 's'}.`, '🎖️', a.readiness >= 60 ? 'good' : 'info');
}

export const KingmakersModule = {
  id: 'kingmakers',
  order: 61.3,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (!state.character.alive) return;
    advisorYear(ctx);
    const p = state.regime?.plot;
    if (p) {
      if (!canPlot(state).ok || p.cc !== here(state)) { state.regime.plot = null; return; }
      p.years += 1;
      // Every year a conspiracy runs, someone may talk.
      if (rng.chance(clamp(0.06 + p.support / 600 + p.years * 0.03, 0.05, 0.35))) {
        state.regime.plot = null;
        ctx.log('Military intelligence uncovered the plot. You were arrested at dawn.', '⛓️', 'bad');
        ctx.emit('legal:offense', { offenseId: 'antiState', context: 'plotting a coup', caught: true, evidence: 0.9 });
      }
    }
    // Headhunters for retired officers.
    if (canAdvise(state).ok && rng.chance(0.12) && !state.prompts.some((x) => x.type === 'kingmakers.offer')) {
      const offers = clientOffers(state);
      ctx.prompt({
        type: 'kingmakers.offer', icon: '🎖️', title: 'A Foreign Army Calls',
        text: 'A defence ministry wants a retired officer to rebuild its forces: a contract general\'s rank and a large tax-free salary.',
        options: [...offers.map((cc) => ({ id: cc, label: `${COUNTRIES[cc].flag} ${COUNTRIES[cc].name}` })), { id: 'no', label: '🏡 Stay retired' }],
      });
    }
  },
  actions: {
    /** Start (or widen) a conspiracy. */
    plot(ctx) {
      const { state, rng } = ctx;
      const ok = canPlot(state);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      if (yearlyCount(state, 'kingmakers.plot')) return ctx.toast('Once a year: too much activity draws attention', 'warn');
      bumpYearly(state, 'kingmakers.plot');
      state.regime ??= {};
      const p = (state.regime.plot ??= { cc: here(state), support: 0, years: 0 });
      const svc = svcOf(state);
      const gain = rng.int(8, 18) + svc.grade * 3 + (svc.post?.kind === 'command' || svc.unit?.commandUntil ? 10 : 0);
      p.support = Math.min(100, p.support + gain);
      ctx.stat('stress', 6);
      return ctx.log(rng.pick([
        `You sounded out fellow officers over late-night tea. Support for a move: ${p.support}%.`,
        `A tank battalion commander is with you, and the presidential guard's deputy is wavering. Support: ${p.support}%.`,
        `Junior officers furious over unpaid wages joined the circle. Support: ${p.support}%.`,
      ]), '🤫', 'warn');
    },
    /** Strike: seize the broadcaster, the airport and the palace. */
    strike(ctx) {
      const { state, rng } = ctx;
      const p = state.regime?.plot;
      if (!p || !canPlot(state).ok) return ctx.toast('You have no conspiracy', 'warn');
      const svc = svcOf(state);
      const cc = here(state);
      const odds = clamp(p.support / 130 + svc.grade * 0.03 + (militaryRule(state, cc) ? -0.1 : 0.05), 0.05, 0.85);
      state.regime.plot = null;
      if (!rng.chance(odds)) {
        if (rng.chance(0.4)) {
          ctx.log('Loyal units held the palace. The coup failed, and you fled across the border in a borrowed car.', '🏃', 'bad');
          state.military.service = null;
          return ctx.emit('legal:offense', { offenseId: 'antiState', context: 'a failed coup', caught: false, evidence: 0.95 });
        }
        ctx.log('Loyal units held the palace. The coup failed, and you were arrested.', '⛓️', 'bad');
        return ctx.emit('legal:offense', { offenseId: 'antiState', context: 'a failed coup', caught: true, evidence: 0.99 });
      }
      const j = coup(ctx, cc, { leader: 'you' });
      state.regime.junta = { cc, since: state.character.age, role: 'leader', unrest: 25 };
      const top = rankTitles(svc).length - 1;
      svc.grade = Math.max(svc.grade, Math.min(top, Math.max(svc.grade + 1, top - 1)));
      ctx.stat('happiness', 10);
      ctx.emit('fame:buzz', { amount: 15 });
      return ctx.log(`The coup succeeded: by dawn your men held the broadcaster, the airport and the palace. You are ${j?.leaderTitle ?? 'head of the military council'}, and promoted yourself ${rankTitles(svc)[svc.grade]}.`, '🪖', 'milestone');
    },
    /** Call it off before anyone talks. */
    abandonPlot(ctx) {
      const { state } = ctx;
      if (!state.regime?.plot) return ctx.toast('No plot', 'warn');
      state.regime.plot = null;
      return ctx.log('You let the conspiracy go quiet. The officers you sounded out will remember.', '🤐', 'info');
    },
    /** As a foreign adviser: drill the army in the field. */
    train(ctx) {
      const { state, rng } = ctx;
      const a = state.foreignAdvisor;
      if (!a) return ctx.toast('Advisers only', 'warn');
      if (yearlyCount(state, 'kingmakers.train')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'kingmakers.train');
      const gain = rng.int(6, 14) + Math.round((state.stats.smarts - 50) / 10);
      a.readiness = clamp(a.readiness + gain, 0, 100);
      return ctx.log(`${COUNTRIES[a.cc].flag} You ran a brigade through its first live-fire exercise: readiness ${a.readiness}%.`, '🎯', 'good');
    },
    /** Found a staff college: a lasting boost. */
    college(ctx) {
      const { state } = ctx;
      const a = state.foreignAdvisor;
      if (!a || a.college) return ctx.toast(a ? 'Already founded' : 'Advisers only', 'warn');
      a.college = true;
      a.readiness = clamp(a.readiness + 5, 0, 100);
      return ctx.log(`${COUNTRIES[a.cc].flag} You founded the ${COUNTRIES[a.cc].name} Command and Staff College. Its first class of majors will run the army for twenty years.`, '🏫', 'milestone');
    },
    /** Purge the ghost soldiers and the fuel thieves. */
    purge(ctx) {
      const { state, rng } = ctx;
      const a = state.foreignAdvisor;
      if (!a) return ctx.toast('Advisers only', 'warn');
      if (yearlyCount(state, 'kingmakers.purge')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'kingmakers.purge');
      if (rng.chance(0.6)) {
        a.readiness = clamp(a.readiness + 12, 0, 100);
        return ctx.log(`${COUNTRIES[a.cc].flag} You struck 4,000 ghost soldiers off the payroll and jailed a quartermaster general. Readiness ${a.readiness}%.`, '🧹', 'good');
      }
      return endAdvising(ctx, 'You named the wrong general. The minister — his cousin — terminated your contract.');
    },
    /** Take one of this year's offers directly. arg: country code. */
    advise(ctx, cc) {
      const ok = canAdvise(ctx.state);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      if (!clientOffers(ctx.state).includes(cc)) return ctx.toast('No offer from there this year', 'warn');
      return startAdvising(ctx, cc);
    },
    resignAdvisor(ctx) {
      if (!ctx.state.foreignAdvisor) return ctx.toast('Advisers only', 'warn');
      return endAdvising(ctx, 'You resigned your contract.');
    },
  },
  resolvers: {
    offer(ctx, _data, optionId) {
      if (optionId === 'no' || !COUNTRIES[optionId]) return ctx.log('You turned the offer down.', '🏡', 'info');
      startAdvising(ctx, optionId);
      return undefined;
    },
  },
};
