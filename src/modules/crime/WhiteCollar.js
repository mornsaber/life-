/**
 * White-collar crime as schemes that run for years.
 *
 *   books       cooking the books: earnings that must beat last year's fake earnings
 *   sanctions   routing a sanctioned buyer's money and cargo through front companies
 *   ponzi       paying old investors with new investors' money
 *
 * A scheme pays every year and builds heat. Auditors, a colleague with questions, a regulator's
 * letter: each is a choice that buys time or makes it worse. At 100 heat it comes apart. You can
 * stop (the paper trail stays, as an open case) or self-report (cooperation: a plea, and far less
 * time than a trial). Or blow the whistle on someone else's — whistleblower awards are real.
 *
 * state.legal.whiteCollar = { schemes: [{ id, kind, since, heat, take, coverUps }], declined: { [kind]: age } }
 */
import { clamp } from '../../core/Random.js';
import { commitOffense } from '../legal/JusticeSystem.js';
import { OFFENSES } from '../legal/Offenses.js';
import { priceLevel } from '../world/Countries.js';

const REGULATORS = {
  US: { markets: 'the SEC', sanctions: 'OFAC at the Treasury', prosecutor: 'federal prosecutors', award: 'the SEC whistleblower program' },
  GB: { markets: 'the Financial Conduct Authority', sanctions: 'OFSI', prosecutor: 'the Serious Fraud Office', award: null },
  CA: { markets: 'the provincial securities commission', sanctions: 'the RCMP', prosecutor: 'the Crown', award: 'the OSC whistleblower program' },
  AU: { markets: 'ASIC', sanctions: 'DFAT\'s sanctions office', prosecutor: 'the Commonwealth DPP', award: null },
  DE: { markets: 'BaFin', sanctions: 'customs investigators', prosecutor: 'the state prosecutor', award: null },
  FR: { markets: 'the AMF', sanctions: 'customs (DNRED)', prosecutor: 'the national financial prosecutor (PNF)', award: null },
  JP: { markets: 'the SESC', sanctions: 'METI', prosecutor: 'the special investigation department', award: null },
};
export const regulatorsHere = (state) => REGULATORS[state.character.countryId ?? 'US'] ?? { markets: 'the financial regulator', sanctions: 'the sanctions authorities', prosecutor: 'the prosecutors', award: null };

export const SCHEMES = {
  books: {
    name: 'The Books', icon: '📊', offense: 'accountingFraud', take: 60000, heat: [10, 18],
    when: (state, job) => Boolean(state.business?.current) || (job && (job.abilities?.includes('exec') || (['corporate', 'accounting', 'finance', 'insurance'].includes(job.professionId) && job.grade >= 5))),
    offer: (state) => `${state.business?.current ? `${state.business.current.name}` : 'The company'} will miss the quarter. Book next year's sales now, move some costs to "capital", and the numbers land — and the bonus, and the share price. Next year you'll have to beat these numbers too.`,
    start: '📊 Make the numbers work',
    year: 'You made the numbers again. They were bigger this year, so the hole was too.',
  },
  sanctions: {
    name: 'The Front Companies', icon: '🚢', offense: 'sanctionsEvasion', take: 90000, heat: [12, 22],
    when: (state, job) => Boolean(state.business?.current) || (job && ['finance', 'logistics', 'corporate', 'merchantMarine'].includes(job.professionId) && job.grade >= 4),
    offer: () => 'A buyer in a sanctioned country will pay double for the cargo — if it ships to a "distributor" in a third country first. The paperwork would be yours to sign.',
    start: '🚢 Sign the paperwork',
    year: 'Another year of trans-shipments through front companies. The commissions landed offshore.',
  },
  ponzi: {
    name: 'The Fund', icon: '🔺', offense: 'ponziScheme', take: 120000, heat: [8, 16],
    when: (state, job) => job && ['finance', 'insurance'].includes(job.professionId) && job.grade >= 4,
    offer: () => 'Your clients\' returns lagged the market. A few new investors\' deposits could pay last year\'s promised returns — just until the next good year.',
    start: '🔺 Cover the returns with new money',
    year: 'New investors\' money paid old investors\' returns. You need more new investors every year.',
  },
};

const wcOf = (state) => (state.legal.whiteCollar ??= { schemes: [], declined: {} });
const local = (state, n) => Math.round(n * priceLevel(state));

export function whiteCollarTick(ctx) {
  const { state, rng } = ctx;
  if (state.legal.incarceration || state.character.age < 21) return;
  const wc = wcOf(state);
  const job = state.career.job;
  // The schemes you're running.
  for (const s of [...wc.schemes]) {
    const def = SCHEMES[s.kind];
    const years = state.character.age - s.since;
    const take = local(state, def.take * (1 + years * 0.4));
    ctx.earn(take, 'Undisclosed income');
    const c = state.legal.crime;
    if (c) c.dirty = (c.dirty ?? 0) + Math.round(take / 2);
    s.take += take;
    s.heat = clamp(s.heat + rng.int(...def.heat) * (s.kind === 'ponzi' && state.economy?.phase === 'recession' ? 2.5 : 1), 0, 120);
    ctx.log(def.year, def.icon, 'warn');
    if (s.heat >= 100) { exposed(ctx, s, 'It came apart.'); continue; }
    if (rng.chance(clamp(s.heat / 90, 0.2, 0.9))) pressurePrompt(ctx, s);
  }
  // A chance to start one, or to blow the whistle on someone else's.
  if (!job && !state.business?.current) return;
  const open = Object.entries(SCHEMES).filter(([k, d]) => d.when(state, job) && !wc.schemes.some((s) => s.kind === k) && state.character.age - (wc.declined[k] ?? -99) >= 6);
  if (!open.length || !rng.chance(0.07)) return;
  const [kind, def] = rng.pick(open);
  const R = regulatorsHere(state);
  ctx.prompt({
    type: 'crime.whiteCollar', icon: def.icon, title: rng.chance(0.3) && job ? 'Something Wrong in the Numbers' : def.name,
    text: def.offer(state),
    data: { kind, stage: 'offer' },
    options: [
      { id: 'start', label: def.start, tone: 'danger', illegal: OFFENSES[def.offense].name },
      ...(job ? [{ id: 'whistle', label: `📣 Report it to ${R.markets}`, hint: R.award ? 'Whistleblower awards are real; so is retaliation' : 'Protected, in theory' }] : []),
      { id: 'decline', label: '🙅 Refuse', hint: 'And find out what that costs you' },
    ],
  });
}

const PRESSURES = [
  { id: 'auditor', title: 'The Auditors Have Questions', text: 'A junior auditor keeps asking about the same three accounts.', options: [
    { id: 'paper', label: '📁 Paper it over with backdated documents', heat: -15, add: 'falseStatement' },
    { id: 'charm', label: '🍷 Take the audit partner to dinner', heat: -8 },
  ] },
  { id: 'colleague', title: 'A Colleague Knows', text: 'Someone in your team has seen the real figures and asks you, quietly, what\'s going on.', options: [
    { id: 'bonus', label: '💵 A bonus and a promotion for their loyalty', heat: -6, cost: 20000 },
    { id: 'push', label: '🚪 Have them moved — or let go', heat: 10, note: 'People pushed out are the ones who call regulators.' },
  ] },
  { id: 'letter', title: 'A Letter from the Regulator', text: (R) => `${R.markets.charAt(0).toUpperCase() + R.markets.slice(1)} is asking for documents "as part of a routine review".`, options: [
    { id: 'lawyer', label: '⚖️ Hire white-shoe lawyers and slow-walk it', heat: -10, cost: 60000 },
    { id: 'shred', label: '🗑️ Shred what they want', heat: -20, add: 'obstruction' },
  ] },
];

function pressurePrompt(ctx, s) {
  const p = ctx.rng.pick(PRESSURES);
  const R = regulatorsHere(ctx.state);
  ctx.prompt({
    type: 'crime.whiteCollar', icon: SCHEMES[s.kind].icon, title: p.title,
    text: `${typeof p.text === 'function' ? p.text(R) : p.text}\n🔥 Heat ${Math.round(s.heat)}/100.`,
    data: { kind: s.kind, stage: 'pressure', pressure: p.id },
    options: [
      ...p.options.map((o) => ({ id: o.id, label: o.label, hint: o.cost ? `$${local(ctx.state, o.cost).toLocaleString()}` : o.note })),
      { id: 'stop', label: '🛑 Unwind it quietly', hint: 'The paper trail stays' },
      { id: 'confess', label: `🙋 Self-report to ${R.prosecutor}`, hint: 'Cooperation: a plea and far less time' },
    ],
  });
}

function exposed(ctx, s, how, { cooperate = false } = {}) {
  const { state } = ctx;
  const wc = wcOf(state);
  wc.schemes = wc.schemes.filter((x) => x !== s);
  const def = SCHEMES[s.kind];
  const R = regulatorsHere(state);
  ctx.log(`${how} ${R.prosecutor.charAt(0).toUpperCase() + R.prosecutor.slice(1)} charged you over ${def.name.toLowerCase()} — $${s.take.toLocaleString()} over ${state.character.age - s.since || 1} year(s).`, '🚨', 'bad');
  ctx.emit('career:resign', { reason: 'Fired over the fraud', fired: true });
  // Restitution: the money comes back first.
  ctx.spend(Math.min(s.take, Math.max(0, state.finances.cash)), 'Restitution and forfeiture', { allowDebt: true });
  if (state.legal.crime?.dirty) state.legal.crime.dirty = Math.max(0, state.legal.crime.dirty - s.take);
  ctx.emit('fame:scandal', { severity: 7, headline: `${def.name.toLowerCase()}: a fraud worth $${s.take.toLocaleString()}` });
  commitOffense(ctx, { offenseId: def.offense, caught: true, evidence: cooperate ? 0.98 : 0.9, context: def.name.toLowerCase() });
  if (cooperate) state.legal.flags.cooperated = state.character.age;
}

export const WhiteCollarResolvers = {
  whiteCollar(ctx, data, optionId) {
    const { state, rng } = ctx;
    const wc = wcOf(state);
    const def = SCHEMES[data.kind];
    const R = regulatorsHere(state);
    if (data.stage === 'offer') {
      if (optionId === 'start') {
        wc.schemes.push({ id: `${data.kind}-${state.character.age}`, kind: data.kind, since: state.character.age, heat: rng.int(5, 20), take: 0, coverUps: 0 });
        return ctx.log(`You crossed the line. ${def.name}: it starts small.`, def.icon, 'warn');
      }
      wc.declined[data.kind] = state.character.age;
      if (optionId === 'decline') {
        ctx.emit('career:adjust', { boss: -6 });
        return ctx.log('You refused. Someone else will be asked — and you were noticed.', '🙅');
      }
      // Whistleblowing: protection, retaliation, and sometimes an award.
      ctx.stat('stress', 12);
      if (rng.chance(0.35)) ctx.emit('career:resign', { reason: 'Pushed out after reporting fraud', fired: true });
      else ctx.emit('career:adjust', { boss: -20, coworkers: -8 });
      if (R.award && rng.chance(0.4)) {
        const award = local(state, rng.int(80000, 900000));
        ctx.earn(award, 'Whistleblower award');
        ctx.emit('fame:buzz', { amount: 4 });
        return ctx.log(`Years later, after the enforcement action, ${R.award} paid you a share of the penalties.`, '📣', 'good');
      }
      return ctx.log(`You reported it to ${R.markets}. ${rng.pick(['An enforcement action followed, eventually.', 'Nothing seemed to happen for two years. Then the indictments.', 'They thanked you and you never heard back.'])}`, '📣', 'info');
    }
    const s = wc.schemes.find((x) => x.kind === data.kind);
    if (!s) return;
    if (optionId === 'stop') {
      wc.schemes = wc.schemes.filter((x) => x !== s);
      commitOffense(ctx, { offenseId: def.offense, discovery: clamp(s.heat / 200, 0.1, 0.45), evidence: 0.8, context: `${def.name.toLowerCase()} (unwound)` });
      return ctx.log('You unwound it, one quiet correction at a time. The documents still exist.', '🛑', 'warn');
    }
    if (optionId === 'confess') return exposed(ctx, s, 'You walked into a lawyer\'s office and then a prosecutor\'s.', { cooperate: true });
    const p = PRESSURES.find((x) => x.id === data.pressure);
    const o = p?.options.find((x) => x.id === optionId);
    if (!o) return;
    if (o.cost) ctx.spend(local(state, o.cost), p.title, { allowDebt: true });
    s.heat = clamp(s.heat + o.heat, 0, 120);
    s.coverUps += 1;
    if (o.add && OFFENSES[o.add]) commitOffense(ctx, { offenseId: o.add, discovery: 0.1, evidence: 0.7, context: 'covering up the fraud' });
    ctx.log(o.heat < 0 ? 'It bought you time.' : 'It made things worse.', def.icon, o.heat < 0 ? 'warn' : 'bad');
    if (s.heat >= 100) exposed(ctx, s, 'It came apart.');
  },
};

export const schemesOf = (state) => state.legal.whiteCollar?.schemes ?? [];

export const WhiteCollarActions = {
  /** Arg: `${kind}:stop|confess`. */
  scheme(ctx, arg) {
    const [kind, act] = String(arg ?? '').split(':');
    if (!schemesOf(ctx.state).some((s) => s.kind === kind)) return ctx.toast('No such scheme', 'warn');
    WhiteCollarResolvers.whiteCollar(ctx, { kind, stage: 'manage' }, act);
  },
};
