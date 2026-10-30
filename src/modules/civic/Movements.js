/**
 * Founding a movement. An activist with a following (Activism.js) can turn a cause into an
 * organisation: members, money, a strategy each year, and the backlash that success brings.
 *
 *   Strategy     door-to-door organising (slow, solid), a media campaign (fast, shallow),
 *                direct action (attention and arrests), or lobbying (quiet, needs money).
 *   Members      grow (or fall) with the strategy, the cause's moment and your leadership;
 *                they pay dues.
 *   Wins         at enough strength, a campaign win: a law changed, a policy reversed.
 *   Backlash     a counter-movement, a mole, a smear, a split over tactics.
 *   Handing on   step back and let it outlive you — or ride it into politics.
 *
 * state.civic.movement = { name, cause, since, members, funds, strength, wins, strategy }
 */
import { Random, clamp } from '../../core/Random.js';
import { CAUSES } from './Activism.js';
import { priceLevel } from '../world/Countries.js';
import { commitOffense } from '../legal/JusticeSystem.js';

export const STRATEGIES = {
  organise: { label: '🚪 Organise door to door', growth: [0.08, 0.2], strength: 4, cost: 0 },
  media: { label: '📺 A media campaign', growth: [0.0, 0.45], strength: 2, cost: 20000 },
  direct: { label: '⛓️ Direct action', growth: [-0.05, 0.35], strength: 5, cost: 0, arrest: 0.25 },
  lobby: { label: '🏛️ Lobby legislators', growth: [-0.05, 0.08], strength: 6, cost: 40000 },
};
const WINS = ['a new law passed in the legislature', 'the government reversed a policy', 'a corporation changed course after a boycott', 'the courts struck down a law you fought', 'a referendum went your way'];
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 20011 + state.character.age * 709 + 0x30e) >>> 0);
const local = (state, n) => Math.round(n * priceLevel(state));
export const movementOf = (state) => state.civic?.movement ?? null;

export function movementTick(main) {
  const { state } = main;
  const m = movementOf(state);
  if (!m || state.legal?.incarceration) return;
  const rng = sideRng(state);
  const s = STRATEGIES[m.strategy] ?? STRATEGIES.organise;
  const growth = rng.float(...s.growth) + (state.economy?.phase === 'recession' && ['labor', 'housing'].includes(m.cause) ? 0.1 : 0);
  m.members = Math.max(10, Math.round(m.members * (1 + growth) + rng.int(0, 40)));
  m.funds += Math.round(m.members * local(state, 12) - local(state, s.cost));
  m.strength = Math.round(clamp(m.strength + s.strength + Math.log10(m.members) - 3 + rng.int(-3, 3), 0, 100));
  main.log(`${m.name}: ${m.members.toLocaleString()} members, strength ${m.strength}/100.`, CAUSES[m.cause]?.icon ?? '✊', 'info');
  if (s.arrest && rng.chance(s.arrest)) { commitOffense(main, { offenseId: 'disorderly', caught: true, evidence: 0.9, context: 'direct action with your movement' }); m.strength += 3; }
  if (m.strength >= 60 && rng.chance(0.35)) {
    m.wins += 1;
    m.strength -= 25;
    const win = rng.pick(WINS);
    main.emit('fame:buzz', { amount: 6 });
    main.stat('happiness', 8);
    state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 6);
    main.log(`A victory for ${m.name}: ${win}.`, '🏆', 'milestone');
  }
  // The year's choice of strategy, and sometimes trouble.
  const ctx = { ...main, rng };
  if (rng.chance(0.3)) {
    const kind = rng.pick(['counter', 'mole', 'split', 'smear']);
    const text = { counter: 'A well-funded counter-movement has sprung up, with billboards and a lawyer for every one of yours.', mole: 'Your treasurer turns out to have been reporting to the police — or a rival.', split: 'The younger members want more radical action; the founders want respectability. They\'re about to split.', smear: 'A newspaper has run a hit piece about your private life.' }[kind];
    return ctx.prompt({ type: 'movements.backlash', icon: '⚡', title: 'Backlash', text, data: { kind }, options: [
      { id: 'meet', label: '🤝 Meet it head on' }, { id: 'ignore', label: '🙈 Stay focused on the cause' },
    ] });
  }
  ctx.prompt({ type: 'movements.strategy', icon: CAUSES[m.cause]?.icon ?? '✊', title: `${m.name}: This Year`, text: `${m.members.toLocaleString()} members · $${m.funds.toLocaleString()} in the bank · strength ${m.strength}/100 · ${m.wins} win${m.wins === 1 ? '' : 's'}.`, data: {}, options: [
    ...Object.entries(STRATEGIES).map(([id, x]) => ({ id, label: x.label, hint: x.cost ? `$${local(state, x.cost).toLocaleString()}` : undefined, disabled: x.cost && m.funds < local(state, x.cost) })),
    { id: 'handover', label: '🕊️ Step back and hand it on' },
  ] });
}

export const MovementResolvers = {
  strategy(ctx, data, optionId) {
    const m = movementOf(ctx.state);
    if (!m) return;
    if (optionId === 'handover') { m.handedOver = ctx.state.character.age; ctx.state.civic.movement = null; (ctx.state.civic.pastMovements ??= []).push({ name: m.name, members: m.members, wins: m.wins }); return ctx.log(`You handed ${m.name} to the next generation. It goes on without you.`, '🕊️', 'milestone'); }
    m.strategy = optionId;
    ctx.log(`${m.name} will focus on: ${STRATEGIES[optionId].label.replace(/^\S+ /, '').toLowerCase()}.`, '🗺️', 'info');
  },
  backlash(ctx, data, optionId) {
    const { rng } = ctx;
    const m = movementOf(ctx.state);
    if (!m) return;
    const good = rng.chance(optionId === 'meet' ? 0.6 : 0.4);
    if (data.kind === 'split' && !good) { m.members = Math.round(m.members * 0.6); return ctx.log('The movement split. Forty percent left to start their own.', '💔', 'bad'); }
    if (data.kind === 'mole' && !good) { m.funds = Math.round(m.funds * 0.5); return ctx.log('The mole had emptied half the accounts before you found out.', '🐀', 'bad'); }
    if (good) { m.strength = Math.min(100, m.strength + 4); return ctx.log('You came through it stronger.', '💪', 'good'); }
    m.strength = Math.max(0, m.strength - 8);
    ctx.log('It hurt. Some members drifted away.', '⚡', 'warn');
  },
};

export const MovementActions = {
  found(ctx, name) {
    const { state } = ctx;
    const a = state.civic?.activism;
    if (!a?.cause) return ctx.toast('Pick a cause and build a following first (Community → Activism)', 'warn');
    if ((a.influence ?? 0) < 25) return ctx.toast('You need a following first (influence 25+)', 'warn');
    if (movementOf(state)) return ctx.toast('You already lead a movement', 'warn');
    const cause = CAUSES[a.cause];
    state.civic.movement = { name: name || `The ${cause.name} Movement`, cause: a.cause, since: state.character.age, members: 150 + a.influence * 10, funds: 0, strength: 10 + Math.round(a.influence / 4), wins: 0, strategy: 'organise' };
    ctx.log(`You founded ${state.civic.movement.name}: ${state.civic.movement.members} founding members around a kitchen table.`, cause.icon, 'milestone');
  },
};

export const MovementsModule = { id: 'movements', order: 40.5, onAgeUp: movementTick, actions: MovementActions, resolvers: MovementResolvers };
