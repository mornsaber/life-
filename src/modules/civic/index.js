/**
 * Civic life: your neighbors, the HOA, the PTA, neighborhood watch, causes
 * and protests, and the local ballot. Much of it is a gateway into local
 * politics — HOA presidents, PTA presidents, watch captains and organizers
 * all build name recognition, and the PTA and activists endorse candidates.
 *
 * state.civic = { local, hoa, pta, activism, watch, neighbors, neighborsAt }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { housingStatus, primaryHome } from '../realestate/HousingEngine.js';
import { PROPERTY_TYPES } from '../realestate/PropertyMarket.js';
import { minorChildren, ageOf } from '../people/People.js';
import { addFriend } from '../people/Friends.js';
import { atWar } from '../world/War.js';
import { MEASURES, localPolicy, eligibleMeasures, enact, playerPush } from './Local.js';
import { VIOLATIONS, MONTHLY_FINE, LIEN_AT, hoaFor, newHoa, boardOdds } from './HOA.js';
import { homeKey, makeNeighbor, avgRel, bumpRel, LIFE_EVENTS, SITUATIONS, TRAITS } from './Neighbors.js';
import { CAUSES, TACTICS } from './Activism.js';
import { transitBoardEligibility, boardTick, resolveBoardDecision } from './TransitBoard.js';

const recognize = (state, n) => {
  state.politics.recognition = Math.min(100, state.politics.recognition + n);
};

/** Kids in K-12 (5–17) make you a school parent. */
export const schoolKids = (state) => minorChildren(state).filter((c) => ageOf(state, c) >= 5);

function neighborsTick(ctx) {
  const { state, rng } = ctx;
  const c = state.civic;
  const key = homeKey(state, housingStatus(state));
  if (key !== c.neighborsAt) {
    c.neighborsAt = key;
    c.neighbors = key ? Array.from({ length: rng.int(3, 4) }, () => makeNeighbor(rng)) : [];
    if (c.watch && !key) c.watch = null;
    return;
  }
  if (!c.neighbors.length || state.character.age < 16) return;
  for (const n of c.neighbors) bumpRel(n, (TRAITS[n.trait].mood > 0 ? 1 : -1) + rng.int(-2, 1));
  // Their lives go on.
  if (rng.chance(0.45)) {
    const n = rng.pick(c.neighbors);
    const ev = rng.pick(LIFE_EVENTS);
    bumpRel(n, ev.rel);
    ctx.log(ev.text(n), n.icon);
  }
  // People move away and new ones move in.
  if (rng.chance(0.08)) {
    const i = rng.int(0, c.neighbors.length - 1);
    const gone = c.neighbors[i];
    c.neighbors[i] = makeNeighbor(rng);
    ctx.log(`${gone.name} moved away. ${c.neighbors[i].household[0].toUpperCase()}${c.neighbors[i].household.slice(1)} moved in next door.`, '🚚');
  }
  // Situations that need you.
  if (state.character.age >= 18 && rng.chance(0.3) && !state.prompts.some((p) => p.type === 'civic.neighbor')) {
    const n = rng.pick(c.neighbors);
    const s = rng.pick(SITUATIONS);
    ctx.prompt({ type: 'civic.neighbor', icon: n.icon, title: s.title, text: s.text(n), options: s.options.map((o) => ({ id: o.id, label: o.label })), data: { neighborId: n.id, situationId: s.id } });
  }
  // A good neighbor can become a friend.
  const close = c.neighbors.find((n) => n.rel >= 80 && !n.friend);
  if (close && rng.chance(0.3) && addFriend(ctx, 'neighborhood', { relationship: 65, ageSpread: 15, quiet: true })) {
    close.friend = true;
    ctx.log(`You and ${close.contact} from ${close.name} have become real friends.`, '🤝', 'good');
  }
  const mood = avgRel(c.neighbors);
  if (mood >= 70) ctx.stat('happiness', 2);
  else if (mood < 30) ctx.stat('stress', 3);
}

function hoaTick(ctx) {
  const { state, rng } = ctx;
  const c = state.civic;
  const home = primaryHome(state);
  if (!home) {
    c.hoa = null;
    return;
  }
  const typeHoa = PROPERTY_TYPES[home.type]?.hoa ?? 0;
  if (!hoaFor(rng, home, typeHoa)) {
    c.hoa = null;
    return;
  }
  if (c.hoa?.propertyId !== home.id) {
    c.hoa = newHoa(home, typeHoa);
    ctx.log(`Your home is in the ${c.hoa.name}: $${c.hoa.dues.toLocaleString()}/yr in dues and a thick binder of covenants.`, '📘');
    return;
  }
  const h = c.hoa;
  // Ignored violations accrue fines every month; past a point they become a lien, then a lawsuit.
  if (h.open) {
    const fine = 12 * rng.int(...MONTHLY_FINE);
    h.fines += fine;
    ctx.log(`The ${h.name} fined you $${fine.toLocaleString()} this year for the unresolved violation. Balance: $${h.fines.toLocaleString()}.`, '🧾', 'warn');
    if (h.fines >= LIEN_AT * 2 && !h.lawsuit) {
      h.lawsuit = true;
      const legal = rng.int(3000, 8000);
      ctx.spend(h.fines + legal, `${h.name} judgment (fines + attorney fees)`, { allowDebt: true });
      ctx.log(`The ${h.name} sued to foreclose on its lien. The judge ordered you to pay $${(h.fines + legal).toLocaleString()} including their lawyers.`, '⚖️', 'bad');
      h.fines = 0;
      h.open = null;
      ctx.stat('stress', 10);
      return;
    }
    if (h.fines >= LIEN_AT) ctx.log(`The ${h.name} recorded a lien against your home.`, '📌', 'bad');
  }
  // Board members get a pass on minor stuff (that's half the reason people run).
  if (!h.open && rng.chance(h.board ? 0.08 : 0.25)) {
    const v = rng.pick(VIOLATIONS);
    h.violations += 1;
    ctx.prompt({
      type: 'civic.hoaViolation', icon: '📬', title: `${h.name}: Violation Notice`, text: `${v.text} Correct it within 30 days or fines begin.`,
      options: [
        { id: 'comply', label: v.fix ? `🛠️ Fix it ($${v.fix.toLocaleString()})` : '🛠️ Fix it' },
        { id: 'appeal', label: '📝 Appeal to the board', hint: 'Smarts; neighbors on the board help' },
        { id: 'ignore', label: '🙈 Ignore it', hint: 'Fines every month', tone: 'danger' },
      ],
      data: { violationId: v.id, fix: v.fix },
    });
  }
  if (h.board) {
    h.boardYears += 1;
    recognize(state, h.president ? 3 : 1);
    if (!h.president && h.boardYears >= 2 && rng.chance(0.35)) {
      h.president = true;
      ctx.log(`The board elected you president of the ${h.name}.`, '🏅', 'good');
    }
    if (rng.chance(0.4)) {
      ctx.prompt({
        type: 'civic.hoaBoard', icon: '🏘️', title: `${h.name} Board Meeting`,
        text: rng.pick(['The reserve study says the roofs need replacing within five years.', 'The pool needs $80,000 in repairs.', 'Residents are fighting over a proposed ban on short-term rentals.']),
        options: [
          { id: 'assess', label: '💸 Vote for a special assessment', hint: 'Fix it now; neighbors pay' },
          { id: 'defer', label: '⏳ Defer and keep dues low', hint: 'Popular now, costly later' },
          { id: 'enforce', label: '📏 Crack down on violations instead', hint: 'Fines fund it; neighbors hate it' },
        ],
      });
    }
  }
}

function ptaTick(ctx) {
  const { state, rng } = ctx;
  const p = state.civic.pta;
  if (!p) return;
  if (!schoolKids(state).length) {
    state.civic.pta = null;
    ctx.log('Your youngest finished school, and with it your PTA years.', '🍎');
    return;
  }
  p.years += 1;
  recognize(state, p.role === 'president' ? 3 : p.role === 'officer' ? 2 : 1);
  ctx.stat('stress', p.role === 'president' ? 3 : 1);
  ctx.log(rng.pick([
    'PTA: the fall fundraiser raised enough for new library books.',
    'PTA: a three-hour meeting about the pickup line.',
    'PTA: you ran the book fair and sold out of graphic novels.',
    'PTA: the auction paid for a new playground.',
  ]), '🍎');
  if (p.role === 'officer' && p.years >= 2 && rng.chance(0.35)) {
    p.role = 'president';
    ctx.log('You were elected PTA president. The principal now has your cell number.', '🏅', 'good');
  }
}

function activismTick(ctx) {
  const { state } = ctx;
  const a = state.civic.activism;
  if (!a) return;
  a.years += 1;
  if (CAUSES[a.cause]?.warOnly && !atWar(state)) {
    ctx.log(`The war is over. Your anti-war group disbanded, but the people you met stayed in politics.`, '☮️', 'good');
    a.cause = null;
  }
  // Movements fade without fresh action.
  if (!yearlyCount(state, 'civic.protest')) a.influence = Math.round(a.influence * 0.85);
  recognize(state, Math.floor(a.influence / 25));
}

function watchTick(ctx) {
  const { state, rng } = ctx;
  const w = state.civic.watch;
  if (!w) return;
  w.years += 1;
  if (!w.captain && w.years >= 2 && rng.chance(0.4)) {
    w.captain = true;
    ctx.log('You became block captain of the neighborhood watch.', '🔦', 'good');
  }
  if (w.captain) recognize(state, 1);
  for (const n of state.civic.neighbors) bumpRel(n, 1);
  if (rng.chance(0.3) && !state.prompts.some((p) => p.type === 'civic.watch')) {
    ctx.prompt({
      type: 'civic.watch', icon: '🔦', title: 'Neighborhood Watch',
      text: rng.pick(['On patrol, you see someone trying car door handles down the block.', 'A stranger is photographing houses on your street.', 'At 1 a.m., someone is climbing a neighbor\'s back fence.']),
      options: [
        { id: 'call', label: '📞 Report it to the police and observe', hint: 'What the watch is for' },
        { id: 'confront', label: '🗣️ Confront them yourself', hint: 'Risky — physically and legally', tone: 'danger' },
        { id: 'ignore', label: '🙈 Probably nothing' },
      ],
    });
  }
}

function localTick(ctx) {
  const { state, rng } = ctx;
  const status = housingStatus(state);
  const local = localPolicy(state);
  if (['owner', 'renting'].includes(status) && local.levy > 0) ctx.spend(local.levy, 'Local levies (voter-approved)', { allowDebt: true });
  if (state.character.age >= 18 && local.services !== 50) ctx.stat('happiness', Math.round((local.services - 50) / 15));
  // A ballot most years.
  if (state.character.age < 18 || state.legal.incarceration || !rng.chance(0.6) || state.prompts.some((p) => p.type === 'civic.ballot')) return;
  const ids = eligibleMeasures(state);
  if (!ids.length) return;
  const id = rng.pick(ids);
  const m = MEASURES[id];
  const organizer = (state.civic.activism?.influence ?? 0) >= 15 || Boolean(state.politics.office);
  ctx.prompt({
    type: 'civic.ballot', icon: m.icon, title: `On the Ballot: ${m.name}`,
    text: `${m.pitch}${m.effects.taxMult ? `\nProperty taxes ${m.effects.taxMult > 0 ? '+' : ''}${Math.round(m.effects.taxMult * 100)}%.` : ''}${m.effects.levy ? `\nAbout ${m.effects.levy > 0 ? '+' : '−'}$${Math.abs(m.effects.levy)}/yr per household.` : ''}`,
    options: [
      { id: 'yes', label: '✅ Vote yes' },
      { id: 'no', label: '❌ Vote no' },
      organizer ? { id: 'campaignYes', label: '📣 Campaign for it', hint: 'Your influence moves votes' } : null,
      organizer ? { id: 'campaignNo', label: '📣 Campaign against it', hint: 'Your influence moves votes' } : null,
      { id: 'skip', label: '🛋️ Skip this election' },
    ].filter(Boolean),
    data: { measureId: id },
  });
}

export const CivicModule = {
  id: 'civic',
  order: 37,

  init(state) {
    state.civic ??= { local: {}, hoa: null, pta: null, activism: null, watch: null, neighbors: [], neighborsAt: null };
  },

  setup(engine) {
    // HOA fines are settled at closing.
    engine.bus.on('housing:sold', ({ ctx, property }) => {
      const h = ctx.state.civic.hoa;
      if (h?.propertyId !== property.id) return;
      if (h.fines) ctx.spend(h.fines, `${h.name} fines (paid at closing)`, { allowDebt: true });
      ctx.state.civic.hoa = null;
    });
  },

  onAgeUp(ctx) {
    if (ctx.state.legal.incarceration) return;
    neighborsTick(ctx);
    hoaTick(ctx);
    ptaTick(ctx);
    activismTick(ctx);
    watchTick(ctx);
    boardTick(ctx);
    localTick(ctx);
  },

  actions: {
    visitNeighbor(ctx, id) {
      const n = ctx.state.civic.neighbors.find((x) => x.id === id);
      if (!n) return;
      if (yearlyCount(ctx.state, `civic.visit.${id}`)) return ctx.toast('You already caught up this year.', 'warn');
      bumpYearly(ctx.state, `civic.visit.${id}`);
      bumpRel(n, TRAITS[n.trait].mood < -3 ? ctx.rng.int(-2, 6) : ctx.rng.int(4, 10));
      ctx.log(`You spent an evening on the porch with ${n.contact} from ${n.name}.`, n.icon);
    },

    hoaRun(ctx) {
      const { state, rng } = ctx;
      const h = state.civic.hoa;
      if (!h) return ctx.toast('You\'re not in an HOA.', 'warn');
      if (h.board) return ctx.toast('You\'re already on the board.', 'warn');
      if (yearlyCount(state, 'civic.hoaRun')) return ctx.toast('The annual meeting already happened.', 'warn');
      bumpYearly(state, 'civic.hoaRun');
      if (rng.chance(boardOdds(state, avgRel(state.civic.neighbors)))) {
        h.board = true;
        recognize(state, 2);
        ctx.log(`You won a seat on the ${h.name} board.`, '🗳️', 'good');
      } else ctx.log(`You lost the ${h.name} board election. Turnout was 14 people.`, '📉', 'warn');
    },

    /** arg: 'pay' | 'sue' | 'recall' */
    hoaFight(ctx, how) {
      const { state, rng } = ctx;
      const h = state.civic.hoa;
      if (!h) return ctx.toast('You\'re not in an HOA.', 'warn');
      if (how === 'pay') {
        if (!h.fines) return ctx.toast('No fines owed.', 'info');
        ctx.spend(h.fines, `${h.name} fines`, { allowDebt: true });
        ctx.log(`You paid $${h.fines.toLocaleString()} in HOA fines.`, '🧾');
        h.fines = 0;
        h.open = null;
        return undefined;
      }
      if (yearlyCount(state, 'civic.hoaFight')) return ctx.toast('One fight with the HOA per year.', 'warn');
      bumpYearly(state, 'civic.hoaFight');
      h.fights += 1;
      if (how === 'sue') {
        const fees = rng.int(4000, 12000);
        ctx.spend(fees, 'Attorney — suit against the HOA', { allowDebt: true });
        if (rng.chance(0.35 + (state.stats.smarts - 50) / 200)) {
          ctx.log(`You sued the ${h.name} for selective enforcement and won: fines vacated${h.fines ? ` ($${h.fines.toLocaleString()})` : ''}, rule struck down.`, '⚖️', 'good');
          h.fines = 0;
          h.open = null;
          recognize(state, 3);
        } else ctx.log(`You sued the ${h.name} and lost. The covenants are enforceable, said the judge.`, '⚖️', 'bad');
        ctx.stat('stress', 6);
        return undefined;
      }
      // Recall the board: a petition and a special meeting.
      const odds = 0.2 + (avgRel(state.civic.neighbors) - 50) / 100;
      if (rng.chance(Math.max(0.05, odds))) {
        h.board = true;
        h.fines = 0;
        h.open = null;
        recognize(state, 4);
        ctx.log(`Your recall petition succeeded. The old ${h.name} board is out, and you\'re on the new one.`, '📣', 'good');
      } else {
        for (const n of state.civic.neighbors) bumpRel(n, -4);
        ctx.log('Your recall petition fell short. Things are awkward at the mailboxes.', '📣', 'warn');
      }
      return undefined;
    },

    ptaJoin(ctx) {
      const { state } = ctx;
      if (!schoolKids(state).length) return ctx.toast('You need a child in school.', 'warn');
      if (state.civic.pta) return ctx.toast('Already in the PTA.', 'warn');
      state.civic.pta = { years: 0, role: 'member' };
      ctx.spend(25, 'PTA dues');
      ctx.log('You joined the PTA.', '🍎', 'good');
    },

    ptaRun(ctx) {
      const { state, rng } = ctx;
      const p = state.civic.pta;
      if (!p || p.role !== 'member') return ctx.toast('Join the PTA first.', 'warn');
      if (yearlyCount(state, 'civic.ptaRun')) return ctx.toast('Elections are once a year.', 'warn');
      bumpYearly(state, 'civic.ptaRun');
      if (rng.chance(0.6)) {
        p.role = 'officer';
        ctx.log('You were elected PTA treasurer. Welcome to spreadsheets about bake sales.', '🍎', 'good');
      } else ctx.log('You lost the PTA election to a mom with a laminator.', '🍎');
    },

    ptaLeave(ctx) {
      if (!ctx.state.civic.pta) return;
      ctx.state.civic.pta = null;
      ctx.log('You stepped back from the PTA.', '🍎');
    },

    joinCause(ctx, causeId) {
      const { state } = ctx;
      const cause = CAUSES[causeId];
      if (!cause || state.character.age < 14) return;
      if (cause.warOnly && !atWar(state)) return ctx.toast('There\'s no war to protest.', 'warn');
      const a = state.civic.activism;
      if (a?.cause === causeId) return;
      state.civic.activism = { cause: causeId, influence: a ? Math.round(a.influence * 0.5) : 0, protests: a?.protests ?? 0, arrests: a?.arrests ?? 0, years: 0 };
      ctx.log(`You threw yourself into ${cause.name.toLowerCase()} activism.`, cause.icon, 'good');
    },

    leaveCause(ctx) {
      if (!ctx.state.civic.activism) return;
      ctx.state.civic.activism = null;
      ctx.log('You stepped back from activism.', '🪧');
    },

    protest(ctx, tacticId) {
      const { state, rng } = ctx;
      const a = state.civic.activism;
      const t = TACTICS[tacticId];
      if (!a?.cause || !t) return ctx.toast('Pick a cause first.', 'warn');
      if (yearlyCount(state, 'civic.protest') >= 2) return ctx.toast('Two actions a year is all you have time for.', 'warn');
      if (t.minInfluence && a.influence < t.minInfluence) return ctx.toast(`You need a following first (${t.minInfluence}+ influence).`, 'warn');
      if (t.cost && !ctx.spend(t.cost, 'Organizing costs', { credit: true })) return ctx.toast('Can\'t cover permits and printing.', 'warn');
      bumpYearly(state, 'civic.protest');
      a.protests += 1;
      a.influence = Math.round(clamp(a.influence + t.influence + rng.int(-2, 3), 0, 100));
      ctx.stat('stress', t.stress);
      ctx.stat('happiness', 2);
      const cause = CAUSES[a.cause];
      if (rng.chance(t.arrest)) {
        a.arrests += 1;
        a.influence = Math.min(100, a.influence + 4);
        ctx.log(`${t.label.replace(/^\S+ /, '')} for ${cause.name.toLowerCase()}: police declared it an unlawful assembly and arrested you.`, '🚔', 'bad');
        ctx.emit('legal:offense', { offenseId: tacticId === 'sitIn' ? 'trespass' : 'disorderly', context: `a ${cause.name.toLowerCase()} protest`, caught: true, evidence: 0.7 });
        return undefined;
      }
      ctx.log(`${t.label.replace(/^\S+ /, '')} for ${cause.name.toLowerCase()}. Influence: ${a.influence}/100.`, cause.icon, 'good');
      return undefined;
    },

    /** Ask the mayor for a seat on the transit authority board. */
    transitBoard(ctx) {
      const { state, rng } = ctx;
      const check = transitBoardEligibility(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      if (yearlyCount(state, 'civic.transitBoard')) return ctx.toast('The mayor\'s office will get back to you next year.', 'warn');
      bumpYearly(state, 'civic.transitBoard');
      if (rng.chance(0.25 + state.politics.recognition / 200)) {
        state.civic.transitBoard = { regionId: state.character.regionId, years: 0, chair: false };
        ctx.log('You were appointed to the regional transit authority board.', '🚇', 'good');
      } else ctx.log('The mayor appointed someone else to the transit board.', '📭', 'warn');
    },

    watchJoin(ctx) {
      const { state } = ctx;
      if (!state.civic.neighbors.length || state.character.age < 18) return ctx.toast('You need a home to watch.', 'warn');
      if (state.civic.watch) return ctx.toast('Already on the watch.', 'warn');
      state.civic.watch = { years: 0, captain: false };
      ctx.log('You joined the neighborhood watch.', '🔦', 'good');
    },

    watchLeave(ctx) {
      if (!ctx.state.civic.watch) return;
      ctx.state.civic.watch = null;
      ctx.log('You left the neighborhood watch.', '🔦');
    },
  },

  resolvers: {
    transitDecision(ctx, data, optionId) {
      resolveBoardDecision(ctx, data, optionId, localPolicy(ctx.state));
    },

    ballot(ctx, data, optionId) {
      const { state, rng } = ctx;
      const m = MEASURES[data.measureId];
      if (!m) return;
      const local = localPolicy(state);
      const campaigning = optionId.startsWith('campaign');
      if (campaigning) {
        ctx.stat('stress', 3);
        if (state.civic.activism) state.civic.activism.influence = Math.min(100, state.civic.activism.influence + 3);
        recognize(state, 2);
      }
      const yes = clamp(m.support + rng.float(-0.08, 0.08) + playerPush(state, optionId), 0.2, 0.8);
      const passed = yes > 0.5;
      local.history.push({ id: data.measureId, age: state.character.age, passed, yes: Math.round(yes * 1000) / 10, voted: optionId });
      if (passed) enact(state, data.measureId);
      const mine = optionId === 'yes' || optionId === 'campaignYes' ? passed : optionId === 'no' || optionId === 'campaignNo' ? !passed : null;
      ctx.log(`${m.name} ${passed ? 'passed' : 'failed'} with ${Math.round(yes * 1000) / 10}% yes.${optionId === 'skip' ? ' You didn\'t vote.' : mine ? ' Your side won.' : ' Your side lost.'}`, m.icon, mine ? 'good' : 'info');
    },

    neighbor(ctx, data, optionId) {
      const { state, rng } = ctx;
      const n = state.civic.neighbors.find((x) => x.id === data.neighborId);
      const s = SITUATIONS.find((x) => x.id === data.situationId);
      const o = s?.options.find((x) => x.id === optionId);
      if (!n || !o) return;
      if (o.cost) ctx.spend(o.cost, s.title.replace(/^\S+ /, ''), { allowDebt: true });
      const ok = o.check == null || rng.chance(o.check);
      bumpRel(n, ok ? o.rel ?? 0 : Math.min(-6, o.rel ?? -6));
      if (o.happy) ctx.stat('happiness', o.happy);
      if (o.stress) ctx.stat('stress', o.stress);
      if (ok && o.refund) ctx.earn(o.refund, 'Small-claims recovery');
      ctx.log(ok ? o.text : o.failText ?? o.text, n.icon, ok ? 'info' : 'warn');
    },

    hoaViolation(ctx, data, optionId) {
      const { state, rng } = ctx;
      const h = state.civic.hoa;
      if (!h) return;
      if (optionId === 'comply') {
        if (data.fix) ctx.spend(data.fix, `HOA compliance — ${data.violationId}`, { allowDebt: true });
        return ctx.log('You fixed it. The violation was closed.', '✅');
      }
      if (optionId === 'appeal' && rng.chance(0.3 + (state.stats.smarts - 50) / 150 + (avgRel(state.civic.neighbors) - 50) / 150)) {
        return ctx.log('The board granted your appeal.', '📝', 'good');
      }
      if (optionId === 'appeal') {
        if (data.fix) ctx.spend(data.fix, `HOA compliance — ${data.violationId}`, { allowDebt: true });
        return ctx.log('The board denied your appeal. You fixed it, grumbling.', '📝', 'warn');
      }
      h.open = data.violationId;
      ctx.log('You ignored the violation notice. The fines start next month.', '🙈', 'warn');
    },

    hoaBoard(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const h = state.civic.hoa;
      if (!h) return;
      if (optionId === 'assess') {
        const share = rng.int(1500, 6000);
        ctx.spend(share, `${h.name} special assessment`, { allowDebt: true });
        for (const n of state.civic.neighbors) bumpRel(n, -3);
        ctx.log(`The board passed a special assessment: $${share.toLocaleString()} per home, yours included. The work got done.`, '💸');
      } else if (optionId === 'defer') {
        for (const n of state.civic.neighbors) bumpRel(n, 2);
        if (rng.chance(0.35)) {
          const hit = rng.int(4000, 12000);
          ctx.spend(hit, `${h.name} emergency assessment`, { allowDebt: true });
          ctx.log(`Deferring caught up with you: an emergency assessment of $${hit.toLocaleString()} per home.`, '💥', 'bad');
        } else ctx.log('You kept dues flat. Neighbors are happy — for now.', '⏳');
      } else {
        for (const n of state.civic.neighbors) bumpRel(n, -6);
        ctx.log('The board stepped up enforcement. The fines paid for it; the neighbors are furious.', '📏', 'warn');
      }
    },

    watch(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const local = localPolicy(state);
      if (optionId === 'call') {
        const caught = rng.chance(0.3 + (local.safety - 50) / 200);
        ctx.log(caught ? 'Police arrived fast and made an arrest. The street group chat is calling you a hero.' : 'By the time police came, they were gone. You filed the report anyway.', '🔦', caught ? 'good' : 'info');
        if (caught) for (const n of state.civic.neighbors) bumpRel(n, 3);
        return;
      }
      if (optionId === 'confront') {
        if (rng.chance(0.25)) {
          ctx.stat('health', -rng.int(5, 15));
          ctx.log('It turned into a scuffle. You got hurt — and the police wanted to know who threw the first punch.', '🩹', 'bad');
          if (rng.chance(0.3)) ctx.emit('legal:offense', { offenseId: 'assault', context: 'a neighborhood-watch confrontation', caught: true, evidence: 0.5 });
          return;
        }
        ctx.log('They ran off when you called out. Your heart didn\'t slow down for an hour.', '🔦');
        ctx.stat('stress', 4);
        return;
      }
      ctx.log('You let it go. Two cars on the street were broken into that night.', '🙈', 'warn');
    },
  },
};
