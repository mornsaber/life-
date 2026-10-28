/**
 * Coalition government, where proportional representation means no party wins outright
 * (Germany, the Netherlands, Belgium, Italy, the Nordics, Israel, New Zealand, Ireland, Spain…).
 *
 *   Forming     after an election, a prime minister in such a country chooses: a junior
 *               partner (a working majority, a partner with demands), a grand coalition with
 *               the main rival (stable, unloved), or a minority government (free, fragile)
 *   Stability   0–100: it erodes every year, faster for minorities and under low approval;
 *               a coalition summit shores it up; partners threaten to walk out over a policy
 *   Collapse    at zero: a confidence vote. Call a snap election (win it on your approval,
 *               or lose the premiership), resign, or limp on as a minority
 *   Ministers   a governing-party MP or minister in such a country lives with the same
 *               arithmetic: when the coalition falls, the ministry goes with it
 *
 * state.coalition = { cc, kind: 'partner'|'grand'|'minority', partners: [name], stability, formedAge, crises }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { OFFICES } from './Offices.js';
import { partyName } from './Parties.js';
import { ministryOf, leaveMinistry } from './Ministers.js';

/** Countries where coalitions are the norm, with how often an election leaves no majority. */
export const COALITION_NORM = {
  DE: 1, NL: 1, BE: 1, IT: 0.9, SE: 0.9, DK: 1, FI: 1, NO: 0.8, IL: 1, NZ: 0.7, IE: 0.9, ES: 0.6, AT: 0.9, CZ: 0.9, PT: 0.5,
  CH: 1, LU: 1, PL: 0.7, EE: 1, LV: 1, LT: 1, SI: 1, SK: 0.9, HR: 0.8, RO: 0.9, BG: 0.9, IS: 1, NP: 0.9, JP: 0.6, IN: 0.5, TH: 0.9,
};
const JUNIOR = {
  labor: ['the Greens', 'the Social Liberals', 'the Left Alliance', 'the Centre Party', 'the Regionalist Party'],
  business: ['the Liberals', 'the Christian Democrats', 'the Centre Party', 'the Agrarian Party', 'the National Conservatives'],
};

const cc = (state) => state.character.countryId ?? 'US';
/** The player leads a government in a coalition country. */
export function leadsCoalitionState(state) {
  const o = state.politics?.office;
  const def = o && OFFICES[o.id];
  return Boolean(def?.leader && (def.level ?? 0) >= 5 && !def.headOfState && COALITION_NORM[def.country ?? cc(state)]);
}
const bloc = (state) => state.legislature?.seat?.caucus ?? state.civic?.party?.bloc ?? 'labor';
const other = (b) => (b === 'labor' ? 'business' : 'labor');

function form(ctx, kind) {
  const { state, rng } = ctx;
  const mine = bloc(state);
  const partners = kind === 'grand' ? [partyName(state, other(mine))] : kind === 'partner' ? [rng.pick(JUNIOR[mine])] : [];
  state.coalition = { cc: cc(state), kind, partners, stability: { partner: 60, grand: 75, minority: 35 }[kind], formedAge: state.character.age, crises: 0 };
  const o = state.politics.office;
  if (kind === 'grand') o.approval = clamp((o.approval ?? 50) - 3, 0, 100);
  ctx.log(kind === 'minority' ? 'You formed a minority government: every vote will be a negotiation.' : `After weeks of talks you signed a coalition agreement with ${partners.join(' and ')}.`, '🧩', 'milestone');
}

function collapse(ctx) {
  const { state } = ctx;
  ctx.prompt({
    type: 'coalitions.confidence', icon: '🗳️', title: 'The Coalition Has Collapsed',
    text: `${state.coalition.partners.length ? `${state.coalition.partners.join(' and ')} walked out of the government.` : 'Your minority government lost a key vote.'} The opposition has tabled a motion of no confidence.`,
    options: [
      { id: 'snap', label: '🗳️ Call a snap election', hint: `Approval ${Math.round(state.politics.office.approval ?? 50)}%` },
      { id: 'minority', label: '🪢 Carry on as a minority government', hint: 'Fragile' },
      { id: 'resign', label: '🚪 Resign as prime minister' },
    ],
  });
}

export const CoalitionsModule = {
  id: 'coalitions',
  order: 33.6,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (!state.character.alive) return;
    const c = state.coalition;
    if (leadsCoalitionState(state)) {
      const o = state.politics.office;
      const newTerm = o.termYearsLeft === OFFICES[o.id].term || !c || c.cc !== cc(state);
      if (newTerm && !state.prompts.some((p) => p.type === 'coalitions.form')) {
        if (!rng.chance(COALITION_NORM[cc(state)])) {
          state.coalition = { cc: cc(state), kind: 'majority', partners: [], stability: 90, formedAge: state.character.age, crises: 0 };
          return ctx.log('Your party won an outright majority: no coalition needed this time.', '🏆', 'milestone');
        }
        return ctx.prompt({
          type: 'coalitions.form', icon: '🧩', title: 'Forming a Government',
          text: `No party has a majority. You have the first chance to form a government.`,
          options: [
            { id: 'partner', label: '🤝 A coalition with a smaller partner', hint: 'A working majority; they will want their policies' },
            { id: 'grand', label: '🏛️ A grand coalition with the main rival', hint: 'Stable, but your voters won\'t love it' },
            { id: 'minority', label: '🪢 A minority government', hint: 'Freedom to govern, until a vote is lost' },
          ],
        });
      }
      if (!c || c.kind === 'majority') return undefined;
      // Coalitions wear out: faster for minorities and an unpopular leader.
      c.stability = Math.round(clamp(c.stability - rng.int(4, 10) - (c.kind === 'minority' ? 5 : 0) - ((o.approval ?? 50) < 40 ? 5 : 0), 0, 100));
      if (c.stability <= 0) return collapse(ctx);
      if (c.partners.length && c.stability < 55 && rng.chance(0.4) && !state.prompts.some((p) => p.type === 'coalitions.crisis')) {
        const issue = rng.pick(['the budget', 'a new motorway', 'immigration rules', 'a nuclear plant', 'defence spending', 'the pension age', 'a corruption inquiry']);
        return ctx.prompt({
          type: 'coalitions.crisis', icon: '⚠️', title: 'A Coalition Crisis',
          text: `${c.partners[0][0].toUpperCase()}${c.partners[0].slice(1)} threaten to leave the government over ${issue}.`,
          options: [
            { id: 'concede', label: '🤝 Give them what they want' },
            { id: 'firm', label: '✊ Stand firm' },
          ],
          data: { issue },
        });
      }
      return undefined;
    }
    // Not the leader: the coalition you serve in can fall under you.
    if (c && !leadsCoalitionState(state)) state.coalition = null;
    const m = ministryOf(state);
    if (m && COALITION_NORM[cc(state)] && rng.chance(0.05 * COALITION_NORM[cc(state)])) {
      leaveMinistry(ctx, 'The coalition collapsed and a caretaker government took over.');
    }
    return undefined;
  },
  actions: {
    /** A coalition summit: concessions on the margins, the partnership patched up. */
    summit(ctx) {
      const { state } = ctx;
      const c = state.coalition;
      if (!leadsCoalitionState(state) || !c || c.kind === 'majority') return ctx.toast('Coalition leaders only', 'warn');
      if (yearlyCount(state, 'coalitions.summit')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'coalitions.summit');
      c.stability = Math.min(100, c.stability + 12);
      ctx.stat('stress', 3);
      return ctx.log(c.partners.length ? `A weekend coalition summit with ${c.partners.join(' and ')}: a new list of shared priorities, and smiles for the cameras.` : 'You did deals with the opposition benches, bill by bill.', '🧩', 'good');
    },
  },
  resolvers: {
    form(ctx, _data, optionId) {
      form(ctx, ['partner', 'grand', 'minority'].includes(optionId) ? optionId : 'partner');
      return undefined;
    },
    crisis(ctx, data, optionId) {
      const { state } = ctx;
      const c = state.coalition;
      if (!c) return undefined;
      c.crises += 1;
      const o = state.politics.office;
      if (optionId === 'concede') {
        c.stability = Math.min(100, c.stability + 15);
        o.approval = clamp((o.approval ?? 50) - 2, 0, 100);
        return ctx.log(`You gave way on ${data.issue}. The coalition holds; your own party grumbles.`, '🤝', 'info');
      }
      c.stability = Math.max(0, c.stability - 20);
      o.approval = clamp((o.approval ?? 50) + 3, 0, 100);
      if (c.stability <= 0) return collapse(ctx);
      return ctx.log(`You stood firm on ${data.issue}. The partners backed down — for now.`, '✊', 'good');
    },
    confidence(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const o = state.politics.office;
      if (optionId === 'resign') {
        state.coalition = null;
        return ctx.emit('politics:leave', { reason: 'Resigned when the coalition collapsed' });
      }
      if (optionId === 'minority') {
        state.coalition = { ...state.coalition, kind: 'minority', partners: [], stability: 25 };
        o.approval = clamp((o.approval ?? 50) - 5, 0, 100);
        return ctx.log('You survived the confidence vote by two abstentions and carried on as a minority government.', '🪢', 'info');
      }
      if (rng.chance(clamp((o.approval ?? 50) / 100, 0.15, 0.85))) {
        o.termYearsLeft = OFFICES[o.id].term;
        state.coalition = null;
        ctx.log('You called a snap election — and won it. A new parliament, a new coalition to form.', '🗳️', 'milestone');
        return undefined;
      }
      state.coalition = null;
      return ctx.emit('politics:leave', { reason: 'Lost the snap election after the coalition collapsed' });
    },
  },
};
