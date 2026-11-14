/**
 * Running the country: what a president or prime minister does beyond the year's crisis.
 *
 *   Cabinet        at the start of a term you choose how to staff it — loyalists (they won't
 *                  embarrass you, until one does), a team of rivals (unity, and arguments), or
 *                  technocrats (competence, no political cover). In a presidential system the
 *                  upper house confirms them; an opposition majority rejects some.
 *   Executive      a president can act without the legislature: an order changes a national law
 *   orders         at once, but the courts strike some down, and a successor can undo them.
 *   The court      a seat on the highest court falls vacant now and then: nominate a moderate, an
 *                  ally or a firebrand, and the upper house decides.
 *   Divided        when the other side holds a chamber, your bills stall (the Chamber tab shows
 *   government     how each vote looks).
 *   Confidence     a prime minister without a majority faces motions of no confidence: win the
 *                  vote, bring in a partner, or go to the country.
 *   Reshuffle      once a year a prime minister or president can reshuffle the cabinet.
 *
 * state.presidency = { officeId, since, cabinet: { style, rejected }, orders: [{ lawId, from, to, year }], judges, reshuffled, motions }
 * Its own random stream: the rest of the year rolls as it always did.
 */
import { Random, clamp } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { LAWS, levelValue, proposedValue, describeValue, enact, favorsLabor } from './Laws.js';
import { execLevel, whereFor, lawHere, unifiedGovernment, chambersFor, bodyId, BODY_DEFS } from './Legislature.js';
import { governingParties } from './PartySystem.js';
import { OFFICES } from './Offices.js';

const prng = (state) => {
  state.presidency ??= {};
  state.presidency.seed = ((state.presidency.seed ?? (((state.world?.seed ?? 13) * 2246822519) >>> 0)) * 1664525 + 1013904223) >>> 0;
  return new Random(state.presidency.seed);
};

/** You run the national government (a president, prime minister or premier of the country). */
export const runsCountry = (state) => execLevel(state.politics?.office?.id) === 'federal';
/** The national chambers where you live. */
const nationalBodies = (state) => { const where = whereFor(state, 'federal'); return chambersFor('federal', where).map((k) => state.legislature?.bodies?.[bodyId(k, where)]).filter(Boolean); };
/** A presidential system: the executive can veto (the US, Brazil, Mexico, Korea…); a parliament's government can't. */
export function presidential(state) {
  const b = nationalBodies(state)[0];
  return b ? BODY_DEFS[b.kind]?.veto !== false : (state.character.countryId ?? 'US') === 'US';
}
/** A prime minister's government lacks a majority in the lower house. */
export function minorityGovernment(state) {
  const b = nationalBodies(state)[0];
  if (!b?.parties?.length || presidential(state)) return false;
  const gov = new Set(governingParties(b));
  return b.parties.filter((p) => gov.has(p.id)).reduce((s, p) => s + p.seats, 0) * 2 <= b.seats;
}
export const dividedGovernment = (state) => runsCountry(state) && presidential(state) && !unifiedGovernment(state, 'federal');

export const CABINET_STYLES = {
  loyalists: { label: '🤝 Loyalists', desc: 'People who owe you: they won\'t leak, until one does.', approval: 0, scandal: 0.08 },
  rivals: { label: '🦁 A team of rivals', desc: 'Your party\'s big beasts inside the tent: unity, and arguments.', approval: 1, stress: 3 },
  technocrats: { label: '🎓 Technocrats', desc: 'Experts who run things well and give you no political cover.', approval: 1, crisis: true },
};

/** Laws an executive order could change now (national laws that exist here). */
export function orderOptions(state) {
  const where = whereFor(state, 'federal');
  // History's statutes need an Act of the legislature, not a decree.
  return Object.entries(LAWS).filter(([id, l]) => !l.statute && l.levels.includes('federal') && lawHere(id, 'federal', where)).flatMap(([id]) => {
    const cur = levelValue(state, id, 'federal', where);
    return ['up', 'down'].map((dir) => ({ id, dir, cur, to: proposedValue(id, cur ?? (LAWS[id].kind === 'number' ? LAWS[id].min : cur), dir) })).filter((x) => x.to !== null);
  });
}

function startTerm(ctx) {
  const { state } = ctx;
  const o = state.politics.office;
  const pr = state.presidency;
  pr.officeId = o.id;
  pr.since = state.character.age;
  pr.cabinet = null;
  ctx.prompt({
    type: 'presidency.cabinet', icon: '🏛️', title: 'Forming a Cabinet',
    text: `You take office as ${OFFICES[o.id]?.name ?? 'head of government'}. Who will run the departments?${presidential(state) && dividedGovernment(state) ? ' The other side controls the upper house, which must confirm them.' : ''}`,
    data: {},
    options: Object.entries(CABINET_STYLES).map(([id, c]) => ({ id, label: c.label, hint: c.desc })),
  });
}

export const PresidencyModule = {
  id: 'presidency',
  order: 33.6,
  init(state) { state.presidency ??= {}; state.presidency.orders ??= []; state.presidency.judges ??= 0; },
  onAgeUp(ctx) {
    const { state } = ctx;
    const pr = state.presidency;
    const o = state.politics?.office;
    if (!o || !runsCountry(state)) { if (pr.officeId) pr.officeId = null; return; }
    const rng = prng(state);
    if (pr.officeId !== o.id) startTerm(ctx);
    const style = CABINET_STYLES[pr.cabinet?.style];
    if (style) {
      o.approval = Math.round(clamp(o.approval + (style.approval ?? 0), 0, 100));
      if (style.scandal && rng.chance(style.scandal)) {
        state.politics.scandals = (state.politics.scandals ?? 0) + 1;
        o.approval = Math.round(clamp(o.approval - 6, 0, 100));
        ctx.log('One of your loyalists in the cabinet was caught steering contracts to a friend. The press calls it your scandal.', '📰', 'bad');
      }
      if (style.stress) ctx.stat('stress', style.stress);
    }
    if (presidential(state)) {
      // The courts review your orders.
      const where = whereFor(state, 'federal');
      for (const ord of [...pr.orders]) {
        if (rng.chance(0.18)) {
          enact(state, { level: 'federal', where: where === 'US' ? null : where, lawId: ord.lawId, value: ord.from, sponsor: 'court', age: state.character.age });
          pr.orders = pr.orders.filter((x) => x !== ord);
          ctx.log(`The courts struck down your executive order on ${LAWS[ord.lawId].name.toLowerCase()}: it's back to ${describeValue(ord.lawId, ord.from)}.`, '⚖️', 'warn');
          o.approval = Math.round(clamp(o.approval - 2, 0, 100));
        }
      }
      // A vacancy on the highest court.
      if (rng.chance(0.12)) {
        ctx.prompt({
          type: 'presidency.court', icon: '⚖️', title: 'A Vacancy on the Court',
          text: `A justice has retired. Your nominee will sit for decades.${dividedGovernment(state) ? ' The other side controls the upper house.' : ''}`,
          data: {},
          options: [
            { id: 'moderate', label: '⚖️ A respected moderate', hint: 'Confirmed easily' },
            { id: 'ally', label: '🤝 A reliable ally', hint: 'Your side cheers' },
            { id: 'firebrand', label: '🔥 A firebrand', hint: 'A legacy, or a defeat' },
          ],
        });
      }
    } else if (minorityGovernment(state) && rng.chance(0.25)) {
      pr.motions = (pr.motions ?? 0) + 1;
      ctx.prompt({
        type: 'presidency.confidence', icon: '🗳️', title: 'A Motion of No Confidence',
        text: 'The opposition has tabled a motion of no confidence. You don\'t have a majority on your own.',
        data: {},
        options: [
          { id: 'whip', label: '📋 Whip every vote and win over the independents', hint: 'A coin toss, closer if you\'re popular' },
          { id: 'partner', label: '🤝 Bring a smaller party into government', hint: 'Safe; they\'ll want ministries and a policy' },
          { id: 'election', label: '🗳️ Call an election', hint: 'Let the country decide' },
        ],
      });
    }
  },
  actions: {
    /** A president's executive order: "lawId|up" or "lawId|down". */
    order(ctx, arg) {
      const { state } = ctx;
      if (!runsCountry(state) || !presidential(state)) return ctx.toast('Only a president governs by executive order.', 'warn');
      const [lawId, dir] = String(arg).split('|');
      const opt = orderOptions(state).find((x) => x.id === lawId && x.dir === dir);
      if (!opt) return ctx.toast('That isn\'t something an order can change.', 'warn');
      const pr = state.presidency;
      if ((state.yearly['presidency.order'] ?? 0) >= 2) return ctx.toast('Two executive orders a year.', 'warn');
      state.yearly['presidency.order'] = (state.yearly['presidency.order'] ?? 0) + 1;
      const where = whereFor(state, 'federal');
      enact(state, { level: 'federal', where: where === 'US' ? null : where, lawId, value: opt.to, sponsor: 'order', age: state.character.age });
      pr.orders = [...pr.orders.filter((x) => x.lawId !== lawId), { lawId, from: pr.orders.find((x) => x.lawId === lawId)?.from ?? opt.cur, to: opt.to, year: yearNow(state) }];
      const o = state.politics.office;
      const mine = (state.civic?.party?.bloc ?? 'labor') === (favorsLabor(lawId, dir) ? 'labor' : 'business');
      o.approval = Math.round(clamp(o.approval + (mine ? 1 : -1), 0, 100));
      ctx.log(`You signed an executive order: ${LAWS[lawId].name} → ${describeValue(lawId, opt.to)}. It takes effect at once; the courts may have the last word.`, '🖋️', 'milestone');
    },
    /** Reshuffle the cabinet (once a year). */
    reshuffle(ctx) {
      const { state } = ctx;
      if (!runsCountry(state)) return;
      const pr = state.presidency;
      if (pr.reshuffled === state.character.age) return ctx.toast('You reshuffled this year.', 'info');
      pr.reshuffled = state.character.age;
      const rng = prng(state);
      const o = state.politics.office;
      o.approval = Math.round(clamp(o.approval + 2, 0, 100));
      if (rng.chance(0.2)) { ctx.log('The minister you sacked went straight to the backbenches and the newspapers. You have a new enemy.', '🗡️', 'warn'); ctx.stat('stress', 5); }
      else ctx.log('You reshuffled the cabinet: fresh faces, and a story that isn\'t about your troubles.', '🔄', 'good');
    },
  },
  resolvers: {
    cabinet(ctx, data, optionId) {
      const { state } = ctx;
      const pr = state.presidency;
      if (!CABINET_STYLES[optionId]) return;
      const rng = prng(state);
      pr.cabinet = { style: optionId, rejected: 0 };
      if (presidential(state) && dividedGovernment(state)) {
        const rejected = [0, 1, 2].filter(() => rng.chance(optionId === 'loyalists' ? 0.35 : 0.15)).length;
        pr.cabinet.rejected = rejected;
        if (rejected) ctx.log(`The upper house rejected ${rejected === 1 ? 'one of your nominees' : `${rejected} of your nominees`}. Acting secretaries run those departments.`, '🚫', 'warn');
      }
      ctx.log(`You formed your cabinet: ${CABINET_STYLES[optionId].label.replace(/^\S+ /, '').toLowerCase()}.`, '🏛️', 'milestone');
    },
    court(ctx, data, optionId) {
      const { state } = ctx;
      const pr = state.presidency;
      const rng = prng(state);
      const o = state.politics.office;
      const hostile = dividedGovernment(state);
      const odds = { moderate: hostile ? 0.85 : 0.97, ally: hostile ? 0.45 : 0.85, firebrand: hostile ? 0.15 : 0.6 }[optionId] ?? 0.5;
      if (rng.chance(odds)) {
        pr.judges += 1;
        o.approval = Math.round(clamp(o.approval + (optionId === 'moderate' ? 2 : optionId === 'firebrand' ? -2 : 0), 0, 100));
        ctx.log(`Your nominee was confirmed to the court${optionId === 'firebrand' ? ' by a single vote. Half the country is furious' : ''}.`, '⚖️', 'milestone');
      } else {
        o.approval = Math.round(clamp(o.approval - 3, 0, 100));
        ctx.log('The upper house voted down your nominee. The seat stays empty.', '🚫', 'bad');
      }
    },
    confidence(ctx, data, optionId) {
      const { state } = ctx;
      const rng = prng(state);
      const o = state.politics.office;
      if (optionId === 'partner') {
        o.approval = Math.round(clamp(o.approval - 1, 0, 100));
        ctx.log('A smaller party came into government for two ministries and a policy of its own. The motion failed.', '🤝', 'good');
        return;
      }
      if (optionId === 'whip' && rng.chance(clamp(0.35 + (o.approval - 40) / 100, 0.15, 0.8))) {
        ctx.log('You survived the confidence vote by a handful of votes.', '📋', 'good');
        o.approval = Math.round(clamp(o.approval + 2, 0, 100));
        return;
      }
      // Lost, or chose the country: an early election.
      const won = rng.chance(clamp(o.approval / 100, 0.15, 0.85));
      if (won) {
        o.approval = Math.round(clamp(o.approval + 4, 0, 100));
        o.termYearsLeft = Math.max(o.termYearsLeft, 4);
        ctx.log(optionId === 'election' ? 'You went to the country and came back with a mandate.' : 'You lost the confidence vote, called an election, and won it.', '🗳️', 'milestone');
      } else {
        ctx.log(optionId === 'election' ? 'You went to the country, and the country said no.' : 'You lost the confidence vote, and then the election.', '🗳️', 'bad');
        ctx.emit('politics:leave', { reason: 'Lost a vote of confidence' });
      }
    },
  },
};
