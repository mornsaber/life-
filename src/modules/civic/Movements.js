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
 *   A lifetime   it grows from a back room to a hall, a town, a region and the nation (STAGES).
 *                Where the state does not allow it, it is banned: go underground, go into exile
 *                or disband. Underground it shrinks but hardens, and comes back into the open
 *                when the regime falls. A cause has its day: if history won it (VICTORIES), the
 *                year it was won is your triumph; if its time passed, the movement fades.
 *
 * state.civic.movement = { name, cause, since, members, funds, strength, wins, strategy }
 */
import { Random, clamp } from '../../core/Random.js';
import { CAUSES, victoryYear } from './Activism.js';
import { priceLevel } from '../world/Countries.js';
import { commitOffense } from '../legal/JusticeSystem.js';
import { yearNow } from '../world/Eras.js';
import { regimeHere } from '../world/Regimes.js';

export const STRATEGIES = {
  organise: { label: '🚪 Organise door to door', growth: [0.08, 0.2], strength: 4, cost: 0 },
  media: { label: '📺 A media campaign', growth: [0.0, 0.45], strength: 2, cost: 20000 },
  direct: { label: '⛓️ Direct action', growth: [-0.05, 0.35], strength: 5, cost: 0, arrest: 0.25 },
  lobby: { label: '🏛️ Lobby legislators', growth: [-0.05, 0.08], strength: 6, cost: 40000 },
};
/** Size of the movement as it would have been described. */
export const STAGES = [
  { at: 0, label: 'a back-room circle' }, { at: 500, label: 'a meeting hall' }, { at: 5000, label: 'a force in the town' },
  { at: 50000, label: 'a regional movement' }, { at: 500000, label: 'a national movement' }, { at: 3000000, label: 'a mass movement' },
];
export const stageOf = (members) => STAGES.reduce((k, st, i) => (members >= st.at ? i : k), 0);
/** A state that does not let movements organise in the open. */
export const repressive = (state) => {
  const r = regimeHere(state);
  return ['totalitarian', 'oneParty', 'junta', 'authoritarian', 'theocracy', 'absoluteMonarchy'].includes(r.kind) || r.press === 'state';
};
/** The tactics of the day: no media campaign before the papers were cheap, no television before 1950. */
export const strategyLabel = (id, y) => (id === 'media' ? (y < 1880 ? '📜 Pamphlets and petitions' : y < 1925 ? '📰 The newspapers and handbills' : y < 1955 ? '📻 The papers and the wireless' : y < 2005 ? '📺 A media campaign' : '📱 A media and online campaign')
  : id === 'direct' && y < 1900 ? '⛓️ Mass meetings and marches' : STRATEGIES[id].label);
const WINS_OLD = ['a petition with a hundred thousand names forced a debate', 'the government gave way on a bill', 'a court ruled for you', 'a great meeting in the capital made every paper'];
const WINS = ['a new law passed in the legislature', 'the government reversed a policy', 'a corporation changed course after a boycott', 'the courts struck down a law you fought', 'a referendum went your way'];
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 20011 + state.character.age * 709 + 0x30e) >>> 0);
const local = (state, n) => Math.round(n * priceLevel(state));
export const movementOf = (state) => state.civic?.movement ?? null;

export function movementTick(main) {
  const { state } = main;
  const m = movementOf(state);
  if (!m || state.legal?.incarceration) return;
  const rng = sideRng(state);
  const y = yearNow(state);
  const cc = state.character.countryId ?? 'US';
  // The cause's day: history won it this year, or its time passed.
  const won = victoryYear(m.cause, cc);
  if (won != null && y >= won && !m.triumph && !(m.since > (state.character.age - (y - won)))) {
    m.triumph = y;
    main.emit('fame:buzz', { amount: 15 });
    main.stat('happiness', 15);
    main.emit('news:story', { tier: 'national', headline: `${CAUSES[m.cause]?.name ?? 'The cause'} won`, weight: 8, icon: '🏆', you: true });
    main.log(`${m.name} won the fight it was founded for: ${(CAUSES[m.cause]?.name ?? 'the cause').toLowerCase()}, in law, in ${y}. ${m.underground ? 'You lived to see it.' : 'The crowds were in the street all night.'}`, '🏆', 'milestone');
    return main.prompt({ type: 'movements.after', icon: '🏆', title: 'After the Victory', text: `${m.name} has won. What now for its ${m.members.toLocaleString()} members?`, data: {}, options: [
      { id: 'politics', label: '🏛️ Take it into politics', hint: 'Recognition you can run on' },
      { id: 'next', label: '✊ On to the next fight', hint: 'Turn it to a new cause' },
      { id: 'wind', label: '🕊️ Wind it up with honour' },
    ] });
  }
  const cause = CAUSES[m.cause];
  if (cause?.until && y >= cause.until && !m.triumph && !m.fading) {
    m.fading = y;
    main.log(`The world has moved on from ${(cause.name ?? 'the cause').toLowerCase()}. ${m.name} is losing members it will not get back.`, '🍂', 'warn');
  }
  if (m.fading) m.members = Math.max(10, Math.round(m.members * 0.8));
  // Banned: the state will not have it.
  if (repressive(state) && !m.underground && !m.exile && rng.chance(m.members > 2000 ? 0.45 : 0.2)) {
    return main.prompt({ type: 'movements.banned', icon: '🚫', title: `${m.name} Is Banned`, text: `The authorities have banned ${m.name}. Its office was raided; the membership lists are in police hands.`, data: {}, options: [
      { id: 'under', label: '🕯️ Go underground', hint: 'Cells, safe houses, a printing press in a cellar' },
      { id: 'exile', label: '✈️ Lead it from exile', hint: 'Leave the country; keep it alive from abroad' },
      { id: 'disband', label: '🏳️ Disband it' },
    ] });
  }
  if (m.exile && !repressive(state)) {
    m.exile = false;
    m.members = Math.round(m.members * 4);
    main.log(`You came home from exile to lead ${m.name} in the open. A crowd met you off the train.`, '🌅', 'milestone');
  }
  if (m.underground && !repressive(state)) {
    m.underground = false;
    m.members = Math.round(m.members * 3);
    main.log(`The regime has fallen. ${m.name} comes out into the open, and people queue to join.`, '🌅', 'milestone');
  }
  if (m.underground) {
    m.members = Math.max(10, Math.round(m.members * rng.float(0.8, 1.05)));
    m.strength = Math.round(clamp(m.strength + rng.int(-2, 4), 0, 100));
    if (rng.chance(0.15)) commitOffense(main, { offenseId: 'disorderly', caught: true, evidence: 0.9, context: 'organising for a banned movement' });
    return main.log(`${m.name} underground: ${m.members.toLocaleString()} sworn members, strength ${m.strength}/100.`, '🕯️', 'info');
  }
  const s = STRATEGIES[m.strategy] ?? STRATEGIES.organise;
  const growth = rng.float(...s.growth) + (state.economy?.phase === 'recession' && ['labor', 'housing'].includes(m.cause) ? 0.1 : 0);
  m.members = Math.max(10, Math.round(m.members * (1 + growth) + rng.int(0, 40)));
  m.funds += Math.round(m.members * local(state, 12) - local(state, s.cost));
  m.strength = Math.round(clamp(m.strength + s.strength + Math.log10(m.members) - 3 + rng.int(-3, 3), 0, 100));
  const stage = stageOf(m.members);
  if (stage > (m.stage ?? 0)) main.log(`${m.name} has grown from ${STAGES[m.stage ?? 0].label} into ${STAGES[stage].label}.`, '📈', 'milestone');
  m.stage = Math.max(m.stage ?? 0, stage);
  main.log(`${m.name}: ${m.members.toLocaleString()} members, strength ${m.strength}/100.`, CAUSES[m.cause]?.icon ?? '✊', 'info');
  if (s.arrest && rng.chance(s.arrest)) { commitOffense(main, { offenseId: 'disorderly', caught: true, evidence: 0.9, context: 'direct action with your movement' }); m.strength += 3; }
  if (m.strength >= 60 && rng.chance(0.35)) {
    m.wins += 1;
    m.strength -= 25;
    const win = rng.pick(y < 1945 ? WINS_OLD : WINS);
    main.emit('fame:buzz', { amount: 6 });
    main.stat('happiness', 8);
    state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 6);
    main.log(`A victory for ${m.name}: ${win}.`, '🏆', 'milestone');
  }
  // The year's choice of strategy, and sometimes trouble.
  const ctx = { ...main, rng };
  if (rng.chance(0.3)) {
    const kind = rng.pick(['counter', 'mole', 'split', 'smear']);
    const text = { counter: y < 1920 ? 'A counter-movement has sprung up, with its own papers and a friend in every club.' : 'A well-funded counter-movement has sprung up, with billboards and a lawyer for every one of yours.', mole: 'Your treasurer turns out to have been reporting to the police — or a rival.', split: 'The younger members want more radical action; the founders want respectability. They\'re about to split.', smear: 'A newspaper has run a hit piece about your private life.' }[kind];
    return ctx.prompt({ type: 'movements.backlash', icon: '⚡', title: 'Backlash', text, data: { kind }, options: [
      { id: 'meet', label: '🤝 Meet it head on' }, { id: 'ignore', label: '🙈 Stay focused on the cause' },
    ] });
  }
  ctx.prompt({ type: 'movements.strategy', icon: CAUSES[m.cause]?.icon ?? '✊', title: `${m.name}: This Year`, text: `${m.members.toLocaleString()} members · $${m.funds.toLocaleString()} in the bank · strength ${m.strength}/100 · ${m.wins} win${m.wins === 1 ? '' : 's'}.`, data: {}, options: [
    ...Object.entries(STRATEGIES).map(([id, x]) => ({ id, label: strategyLabel(id, y), hint: x.cost ? `$${local(state, x.cost).toLocaleString()}` : undefined, disabled: x.cost && m.funds < local(state, x.cost) })),
    { id: 'handover', label: '🕊️ Step back and hand it on' },
  ] });
}

export const MovementResolvers = {
  strategy(ctx, data, optionId) {
    const m = movementOf(ctx.state);
    if (!m) return;
    if (optionId === 'handover') { m.handedOver = ctx.state.character.age; ctx.state.civic.movement = null; (ctx.state.civic.pastMovements ??= []).push({ name: m.name, members: m.members, wins: m.wins }); return ctx.log(`You handed ${m.name} to the next generation. It goes on without you.`, '🕊️', 'milestone'); }
    m.strategy = optionId;
    ctx.log(`${m.name} will focus on: ${strategyLabel(optionId, yearNow(ctx.state)).replace(/^\S+ /, '').toLowerCase()}.`, '🗺️', 'info');
  },
  banned(ctx, _data, optionId) {
    const { state } = ctx;
    const m = movementOf(state);
    if (!m) return;
    if (optionId === 'disband') {
      state.civic.movement = null;
      (state.civic.pastMovements ??= []).push({ name: m.name, members: m.members, wins: m.wins, ended: 'banned' });
      return ctx.log(`You disbanded ${m.name}. Some members never forgave you; some were grateful.`, '🏳️', 'warn');
    }
    if (optionId === 'exile') {
      m.exile = true;
      m.members = Math.round(m.members * 0.3);
      ctx.emit('movements:exile', {});
      return ctx.log(`You left to lead ${m.name} from abroad: letters, smuggled pamphlets and a radio broadcast when you can get one.`, '✈️', 'milestone');
    }
    m.underground = true;
    m.members = Math.round(m.members * 0.25);
    ctx.stat('stress', 10);
    ctx.log(`${m.name} went underground: ${m.members.toLocaleString()} people you would trust with your life.`, '🕯️', 'milestone');
  },
  after(ctx, _data, optionId) {
    const { state } = ctx;
    const m = movementOf(state);
    if (!m) return;
    if (optionId === 'politics') {
      state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 25);
      return ctx.log(`You turned ${m.name}'s victory into a political following. People know your name.`, '🏛️', 'good');
    }
    if (optionId === 'next') {
      m.cause = state.civic?.activism?.cause && state.civic.activism.cause !== m.cause ? state.civic.activism.cause : 'labor';
      m.triumph = null;
      m.fading = null;
      return ctx.log(`${m.name} took up a new fight: ${(CAUSES[m.cause]?.name ?? 'the next cause').toLowerCase()}.`, '✊', 'info');
    }
    state.civic.movement = null;
    (state.civic.pastMovements ??= []).push({ name: m.name, members: m.members, wins: m.wins + 1, ended: 'won' });
    ctx.log(`${m.name} was wound up with a dinner and a photograph. Its work was done.`, '🕊️', 'milestone');
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
