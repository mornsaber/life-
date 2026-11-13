/**
 * The sovereign by kind of monarchy.
 *
 *   Constitutional  You reign; ministers rule. (Sovereign.js: audiences, the State Opening.)
 *   Executive       The Gulf, Brunei, Morocco: you appoint the government, name the crown
 *                   prince (not always your eldest son), and set the palace's share of the budget.
 *   Elective        Malaysia: you rule your state, and the Conference of Rulers elects one of the
 *                   nine to be Yang di-Pertuan Agong for five years, in turn. Cambodia: the Royal
 *                   Council of the Throne chooses the King from the royal houses' men when the
 *                   throne falls vacant — the heir is not guaranteed it, and others can be chosen.
 *
 * state.royal.government = { kind, since }; state.royal.budget; state.royal.agong = { since };
 * state.royal.councilFavour (Cambodia); state.world.crowns.MY.agong = { state, since, you }
 * state.royal.tree.designated = node id of a crown prince named over the natural order
 */
import { yearlyCount, bumpYearly, currentYear } from '../../core/State.js';
import { clamp, Random } from '../../core/Random.js';
import { CROWNS, ELECTION } from './Crown.js';
import { lineOf, refreshLine } from './RoyalLine.js';

export const MY_STATES = ['Johor', 'Pahang', 'Perak', 'Kedah', 'Kelantan', 'Negeri Sembilan', 'Selangor', 'Perlis', 'Terengganu'];
export const RULER_TITLE = { Perlis: 'Raja', 'Negeri Sembilan': 'Yang di-Pertuan Besar' };
export const rulerTitle = (st) => RULER_TITLE[st] ?? 'Sultan';
const ELECTIVE = new Set(['MY', 'KH']);

/** 'executive' | 'elective' | 'constitutional' */
export function throneKind(state, crownId = state.royal?.crownId) {
  if (ELECTIVE.has(crownId)) return 'elective';
  if (CROWNS[crownId]?.executive || state.royal?.executive) return 'executive';
  return 'constitutional';
}

export const GOVERNMENTS = {
  technocrat: { label: '📊 Technocrats', note: 'Competent, colourless ministers', pop: 0, unrest: -2, text: 'You appointed a government of technocrats: economists, engineers, a former central banker.' },
  family: { label: '👑 The family', note: 'Your brothers and cousins in the key ministries', pop: -2, unrest: 1, loyal: true, text: 'You gave the key ministries to the family: defence, interior and foreign affairs stay in the house.' },
  reformer: { label: '🌱 Reformers', note: 'Younger ministers, a reform agenda', pop: 3, unrest: 2, text: 'You appointed a reforming government: younger ministers, women in the cabinet, a plan for the economy after oil.' },
  hardliner: { label: '🛡️ Hardliners', note: 'Security first', pop: -3, unrest: -4, text: 'You appointed a security cabinet: the interior ministry runs the country now.' },
};
export const BUDGETS = {
  lavish: { label: '💎 Lavish', note: 'Palaces, yachts, a larger privy purse', income: 8e6, pop: -2, unrest: 1 },
  balanced: { label: '⚖️ Balanced', note: 'The custom of the house', income: 2e6, pop: 0, unrest: 0 },
  austere: { label: '🌾 Austere', note: 'The palace cuts, the people see it', income: 0.5e6, pop: 2, unrest: -1 },
};

const pop = (r, d) => { r.popularity = Math.round(clamp((r.popularity ?? 60) + d, 0, 100)); };
const bump = (r, key, d) => { r[key] = Math.round(clamp((r[key] ?? 0) + d, 0, 100)); };
const executiveHere = (state) => Boolean(state.royal?.reigning && throneKind(state) === 'executive');

/** Who the sovereign could name crown prince: men of age in the line, nearest first. */
export function crownPrinceChoices(state) {
  if (!executiveHere(state)) return [];
  const y = currentYear(state);
  return lineOf(state).filter((n) => !n.block && !n.you && n.gender === 'male' && (n.born ?? y) <= y - 18).slice(0, 6);
}

// ── Malaysia: the Conference of Rulers ───────────────────────────────────────────────────────
const myState = (c) => (MY_STATES.includes(c?.house) ? c.house : String(c?.house ?? 'Johor').replace(/^the /, ''));
function conference(ctx) {
  const { state, rng } = ctx;
  const c = state.world?.crowns?.MY;
  if (!c) return;
  const y = currentYear(state);
  const mine = myState(c);
  c.agong ??= { state: rng.pick(MY_STATES.filter((s) => s !== mine)), since: y - rng.int(0, 4) };
  if (y - c.agong.since < 5) return;
  const r = state.royal?.crownId === 'MY' ? state.royal : null;
  const was = c.agong;
  const next = MY_STATES[(MY_STATES.indexOf(was.state) + 1) % MY_STATES.length];
  if (r?.agong) {
    delete r.agong;
    ctx.log(`Your five years as Yang di-Pertuan Agong are over. You return to ${mine} as its ${rulerTitle(mine)}.`, '👑', 'milestone');
  }
  if (next === mine && r?.reigning && state.character.age >= 21 && !state.prompts.some((p) => p.type === 'throne.conference')) {
    ctx.prompt({ type: 'throne.conference', icon: '👑', title: 'The Conference of Rulers', text: `The nine rulers meet in Kuala Lumpur. By the rotation it is ${mine}'s turn: they will elect you Yang di-Pertuan Agong for five years, if you accept.`, options: [
      { id: 'accept', label: '👑 Accept: five years as King' },
      { id: 'decline', label: '🙏 Decline, and let the turn pass' },
    ] });
    c.agong = { state: was.state, since: y - 4 };
    return;
  }
  c.agong = { state: next, since: y };
  if (r) ctx.log(`The Conference of Rulers elected the ${rulerTitle(next)} of ${next} Yang di-Pertuan Agong for five years.`, '🏛️', 'info');
}

// ── Cambodia: the Royal Council of the Throne ────────────────────────────────────────────────
/** On a vacancy: 'you' if the council chooses you, a node if it passes over the heir, else null. */
function councilChooses(ctx, crownId) {
  const { state } = ctx;
  const r = state.royal;
  if (crownId !== 'KH' || !r || r.crownId !== 'KH' || r.reigning) return null;
  const rng = new Random(((state.world?.seed ?? 1) * 2654435761 + currentYear(state) * 97 + 0x5b) >>> 0);
  const eligible = state.character.gender === 'male' && state.character.age >= 30 && r.line != null && r.line <= 6;
  const line = lineOf(state).filter((n) => !n.block);
  if (eligible) {
    const p = clamp(0.1 + (r.line === 1 ? 0.45 : 0.1) + (r.councilFavour ?? 0) / 150 + ((r.popularity ?? 60) - 60) / 200, 0.03, 0.92);
    if (rng.chance(p)) return 'you';
    if (r.line === 1) return line.find((n) => !n.you && n.gender === 'male') ?? null;
  }
  return null;
}

export const ThroneModule = {
  id: 'throne',
  order: 33.9,
  setup() {
    ELECTION.fn = councilChooses;
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character.alive) return;
    if (state.world?.crowns?.MY) conference(ctx);
    const r = state.royal;
    if (!r?.reigning || throneKind(state) !== 'executive') return;
    // The government and the budget you chose, year by year.
    const g = GOVERNMENTS[r.government?.kind];
    if (g) { pop(r, g.pop / 2); bump(r, 'unrest', g.unrest); }
    const b = BUDGETS[r.budget ?? 'balanced'];
    ctx.earn(b.income, 'The privy purse');
    pop(r, b.pop);
    bump(r, 'unrest', b.unrest);
  },
  actions: {
    /** Appoint the government (arg: technocrat | family | reformer | hardliner). */
    appoint(ctx, kind) {
      const { state } = ctx;
      const r = state.royal;
      if (!executiveHere(state)) return ctx.toast('Only a ruling monarch appoints the government.', 'warn');
      const g = GOVERNMENTS[kind];
      if (!g) return undefined;
      if (yearlyCount(state, 'throne.appoint')) return ctx.toast('One reshuffle a year.', 'warn');
      bumpYearly(state, 'throne.appoint');
      r.government = { kind, since: currentYear(state) };
      pop(r, g.pop);
      bump(r, 'unrest', g.unrest * 2);
      return ctx.log(g.text, '🏛️', 'info');
    },
    /** Set the palace's share of the budget (arg: lavish | balanced | austere). */
    budget(ctx, kind) {
      const { state } = ctx;
      if (!executiveHere(state)) return ctx.toast('Only a ruling monarch sets the budget.', 'warn');
      if (!BUDGETS[kind]) return undefined;
      state.royal.budget = kind;
      return ctx.log({ lavish: 'You raised the palace\'s share of the budget: a new yacht is on order.', balanced: 'The palace budget stays as custom has it.', austere: 'You cut the palace budget and said so on television. The country noticed.' }[kind], '💰', 'info');
    },
    /** Name the crown prince (arg: a node id from the family tree). */
    nameHeir(ctx, id) {
      const { state } = ctx;
      const r = state.royal;
      const choices = crownPrinceChoices(state);
      const pick = choices.find((n) => n.id === id);
      if (!pick) return ctx.toast(executiveHere(state) ? 'Choose a man of the house, of age.' : 'Only a ruling monarch names the crown prince.', 'warn');
      const natural = lineOf(state).filter((n) => !n.block && n.id !== r.tree.designated);
      const passed = natural[0] && natural[0].id !== pick.id ? natural[0] : null;
      r.tree.designated = pick.id;
      refreshLine(state);
      if (passed) {
        pop(r, -2);
        bump(r, 'unrest', 3);
        const pp = passed.personId && state.people?.list?.find((p) => p.id === passed.personId);
        if (pp) pp.relationship = clamp((pp.relationship ?? 60) - 25, 0, 100);
        return ctx.log(`You named ${pick.name} crown prince, passing over ${passed.name}. The allegiance council swore to him; ${passed.name} did not attend.`, '👑', 'milestone');
      }
      return ctx.log(`You confirmed ${pick.name} as crown prince. The allegiance council swore to him.`, '👑', 'milestone');
    },
    /** Cambodia: court the Royal Council of the Throne (once a year). */
    courtCouncil(ctx) {
      const { state } = ctx;
      const r = state.royal;
      if (r?.crownId !== 'KH' || r.reigning) return ctx.toast('The Throne Council chooses Cambodia\'s king.', 'warn');
      if (yearlyCount(state, 'throne.council')) return ctx.toast('Once a year.', 'warn');
      bumpYearly(state, 'throne.council');
      r.councilFavour = Math.min(100, (r.councilFavour ?? 0) + 12);
      ctx.stat('stress', 2);
      return ctx.log(`You called on the council's members: the prime minister, the presidents of both houses, the chief monks. Their favour: ${r.councilFavour}/100.`, '🏛️', 'info');
    },
  },
  resolvers: {
    conference(ctx, data, optionId) {
      const { state } = ctx;
      const c = state.world.crowns.MY;
      const r = state.royal;
      const y = currentYear(state);
      const mine = myState(c);
      if (optionId === 'accept' && r?.reigning) {
        c.agong = { state: mine, since: y, you: true };
        r.agong = { since: y };
        pop(r, 5);
        ctx.stat('stress', 6);
        return ctx.log(`The Conference of Rulers elected you Yang di-Pertuan Agong. You move to Istana Negara for five years, King of all Malaysia; a regent rules ${mine} meanwhile.`, '👑', 'milestone');
      }
      const next = MY_STATES[(MY_STATES.indexOf(mine) + 1) % MY_STATES.length];
      c.agong = { state: next, since: y };
      return ctx.log(`You declined the throne. The rulers elected the ${rulerTitle(next)} of ${next} instead.`, '🙏', 'info');
    },
  },
};
