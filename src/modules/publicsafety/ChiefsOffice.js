/**
 * At the top of a police, fire or ambulance service: you answer to someone (a mayor, a police
 * authority or commissioner, a prefect or a minister), you deal with a union, and the public
 * watches. Each year brings one hard call. Four measures move:
 *
 *   confidence   the trust of whoever you answer to
 *   union        your own people's representatives
 *   public       the communities you serve, and the press
 *   budget       how much room you have
 *
 * When confidence collapses you're asked to go.
 *
 * state.chief = { confidence, union, public, budget, since, record: [{ age, id, choice }] }
 */
import { Random, clamp } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { getProfession } from '../career/JobTrees.js';
import { leaveJob } from '../career/CareerEngine.js';
import { serviceOfJob } from './Uniformed.js';

const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 6151) ^ (state.character.age * 487 + 0xc1e)) >>> 0);
const ccOf = (state) => state.character.countryId ?? 'US';

/** Are you the head of a police, fire or ambulance service? */
export function isServiceHead(state) {
  const job = state.career?.job;
  const service = serviceOfJob(job);
  if (!['police', 'fire', 'ems'].includes(service)) return false;
  const top = getProfession(job.professionId)?.levels.at(-1)?.id;
  return job.levelId === top || Boolean(job.headOf && !job.headOf.deptId);
}

/** Who you answer to, by country, service and era. */
export function masterOf(state) {
  const cc = ccOf(state);
  const y = yearNow(state);
  const job = state.career?.job;
  const fire = serviceOfJob(job) === 'fire';
  if (cc === 'GB') return fire ? 'the fire authority' : y >= 2012 ? 'the Police and Crime Commissioner' : 'the police authority';
  if (cc === 'US') return job?.professionId === 'statePolice' ? 'the governor' : 'the mayor';
  if (cc === 'FR') return 'the préfet';
  if (['DE', 'AT', 'IT', 'ES', 'JP', 'KR', 'IN'].includes(cc)) return 'the interior minister';
  if (['AU', 'CA', 'NZ', 'IE'].includes(cc)) return 'the minister for police';
  return 'the minister';
}
export const chiefOf = (state) => (state.chief ??= { confidence: 60, union: 55, public: 55, budget: 50, since: state.character.age, record: [] });

/** The year's hard calls: fx moves the measures. */
const CALLS = [
  { id: 'budget', icon: '💷', title: 'The Budget',
    text: (m) => `${m.charAt(0).toUpperCase()}${m.slice(1)} wants a seven per cent cut next year.`,
    options: [
      { id: 'overtime', label: '⏱️ Cut overtime and training', fx: { union: -10, budget: 5 } },
      { id: 'close', label: '🏚️ Close a station', fx: { public: -12, budget: 10, confidence: 5 } },
      { id: 'fight', label: '📣 Fight it in public', hint: 'The papers love it; your master won\'t', fx: { confidence: -15, public: 6, budget: 4 } },
    ] },
  { id: 'shooting', icon: '📹', title: 'The Video', service: 'police', from: 1991,
    text: () => 'One of your officers shot an unarmed man during an arrest. A bystander\'s video is everywhere by morning.',
    options: [
      { id: 'back', label: '🛡️ Back your officer until the facts are in', fx: { union: 15, public: -15, confidence: -8 } },
      { id: 'suspend', label: '🧾 Suspend the officer and say so', fx: { union: -15, public: 10 } },
      { id: 'outside', label: '🔍 Bring in an outside force to investigate', fx: { public: 10, confidence: 5, union: -5 } },
    ] },
  { id: 'corruption', icon: '🕵️', title: 'Rot in the Ranks', service: 'police',
    text: () => 'Your anti-corruption unit has found a ring of officers selling information to a crime family. Some are senior.',
    options: [
      { id: 'clean', label: '🧹 Arrest them all and hold a press conference', fx: { union: -10, public: 12, confidence: 5 } },
      { id: 'quiet', label: '🤫 Let them retire quietly', hint: 'If it comes out, it\'s your job', fx: { union: 5, flag: 'coverup' } },
    ] },
  { id: 'deadlyFire', icon: '🔥', title: 'The Fire Your Inspectors Flagged', service: 'fire',
    text: () => 'Eleven people died in a fire at a block of flats your inspectors had flagged two years ago. The enforcement notice was never followed up.',
    options: [
      { id: 'own', label: '🙇 Own the failure publicly', fx: { public: 8, confidence: -10 } },
      { id: 'blame', label: '📂 Point to the landlord and the council', fx: { public: -10, confidence: 5 } },
      { id: 'reform', label: '📋 Order a review of every enforcement notice', fx: { budget: -8, public: 6, union: -4 } },
    ] },
  { id: 'contract', icon: '🤝', title: 'The Union Contract',
    text: () => 'The union wants a pay rise well above inflation, and a sick-out is being talked about if they don\'t get it.',
    options: [
      { id: 'concede', label: '✅ Give them most of it', fx: { union: 15, budget: -12, confidence: -5 } },
      { id: 'firm', label: '🪨 Hold the line', fx: { union: -15, budget: 5 } },
      { id: 'arbitrate', label: '⚖️ Send it to arbitration', fx: { union: 3, budget: -4 } },
    ] },
  { id: 'pressure', icon: '🏛️', title: 'A Word Before the Election',
    text: (m) => `${m.charAt(0).toUpperCase()}${m.slice(1)} wants a visible crackdown on street crime before the election, and hints that a donor's son's drink-driving case could be "handled sensibly".`,
    options: [
      { id: 'comply', label: '🤝 Give them the crackdown, and the favour', fx: { confidence: 12, public: -6, flag: 'favour' } },
      { id: 'part', label: '🚓 The crackdown, but no favours', fx: { confidence: 2, public: 2 } },
      { id: 'refuse', label: '🙅 Neither', hint: 'Operational independence', fx: { confidence: -15, public: 5 } },
    ] },
  { id: 'response', icon: '⏱️', title: 'Response Times', service: 'fire', from: 1960,
    text: () => 'A newspaper has mapped response times: the poorer side of the city waits four minutes longer.',
    options: [
      { id: 'move', label: '🚒 Move engines to the east side', fx: { public: 10, union: -6 } },
      { id: 'money', label: '💷 Ask for money for a new station', fx: { confidence: -6, budget: -4, public: 4 } },
    ] },
  { id: 'committee', icon: '🎙️', title: 'Called to Give Evidence',
    text: () => 'A committee of elected members has called you to give evidence about your service.',
    options: [
      { id: 'candid', label: '📋 Be candid about the problems', fx: { public: 6, confidence: -5 } },
      { id: 'polish', label: '✨ Present the best picture', fx: { confidence: 5, public: -3 } },
    ] },
];

function hardCall(ctx, rng) {
  const { state } = ctx;
  const service = serviceOfJob(state.career.job);
  const c = chiefOf(state);
  const recent = new Set(c.record.slice(-3).map((r) => r.id));
  const pool = CALLS.filter((x) => (!x.service || x.service === service) && !recent.has(x.id) && yearNow(state) >= (x.from ?? 0));
  if (!pool.length || !rng.chance(0.8)) return;
  const call = rng.pick(pool);
  const master = masterOf(state);
  ctx.prompt({
    type: 'chiefsOffice.call', icon: call.icon, title: call.title,
    text: call.id === 'committee' ? `A committee of elected members has called you to give evidence about your service, with ${master} watching.` : call.text(master),
    options: call.options.map(({ id, label, hint }) => ({ id, label, ...(hint ? { hint } : {}) })),
    data: { id: call.id },
  });
}

/** Old sins surface; no confidence means you go. */
function reckoning(ctx, rng) {
  const { state } = ctx;
  const c = chiefOf(state);
  const flags = c.record.filter((r) => r.flag);
  if (flags.length && rng.chance(0.15)) {
    const f = flags[0];
    f.flag = null;
    c.public = clamp(c.public - 25, 0, 100);
    c.confidence = clamp(c.confidence - 20, 0, 100);
    ctx.log(f.id === 'corruption' ? 'A journalist found out about the corrupt officers you let retire quietly.' : 'The favour you did before the election came out.', '📰', 'bad');
  }
  // A union vote of no confidence costs you your master's trust too.
  if (c.union < 15 && !c.unionVoted) {
    c.unionVoted = true;
    c.confidence = clamp(c.confidence - 10, 0, 100);
    ctx.log('The union passed a vote of no confidence in your leadership.', '🗳️', 'warn');
  }
  if (c.confidence < 20 || c.public < 10) {
    ctx.prompt({
      type: 'chiefsOffice.noConfidence', icon: '📉', title: 'No Confidence',
      text: `${masterOf(state).charAt(0).toUpperCase()}${masterOf(state).slice(1)} has lost confidence in you and asks for your resignation.`,
      options: [{ id: 'resign', label: '🚪 Resign', hint: 'With your pension and some dignity' }, { id: 'refuse', label: '🪨 Refuse', hint: 'They may be able to remove you' }],
      data: {},
    });
  }
}

export const ChiefsOfficeModule = {
  id: 'chiefsOffice',
  order: 31.3,
  setup(engine) {
    engine.bus.on('career:promoted', ({ ctx }) => { if (ctx && isServiceHead(ctx.state)) { ctx.state.chief = null; chiefOf(ctx.state); ctx.log(`You took command of the service. You answer to ${masterOf(ctx.state)}.`, '⭐', 'milestone'); } });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!isServiceHead(state)) return;
    if (state.prompts.some((p) => p.type.startsWith('chiefsOffice.'))) return;
    const rng = sideRng(state);
    const c = chiefOf(state);
    // Things drift back toward the middle.
    for (const k of ['confidence', 'union', 'public', 'budget']) c[k] = Math.round(c[k] + (55 - c[k]) * 0.1);
    reckoning(ctx, rng);
    if (!state.prompts.some((p) => p.type === 'chiefsOffice.noConfidence')) hardCall(ctx, rng);
  },
  resolvers: {
    call(ctx, data, optionId) {
      const { state } = ctx;
      const call = CALLS.find((x) => x.id === data.id);
      const o = call?.options.find((x) => x.id === optionId);
      if (!o) return;
      const c = chiefOf(state);
      for (const k of ['confidence', 'union', 'public', 'budget']) if (o.fx[k]) c[k] = clamp(c[k] + o.fx[k], 0, 100);
      c.record.push({ age: state.character.age, id: call.id, choice: optionId, ...(o.fx.flag ? { flag: o.fx.flag } : {}) });
      c.record.splice(0, Math.max(0, c.record.length - 12));
      const job = state.career.job;
      if (job && o.fx.public) job.performance = clamp((job.performance ?? 55) + Math.round(o.fx.public / 3), 0, 100);
      ctx.log(`${call.title}: ${o.label.replace(/^\S+\s/, '')}.`, call.icon, 'info');
    },
    noConfidence(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'resign') {
        leaveJob(ctx, `Resigned after ${masterOf(state)} lost confidence`);
        state.chief = null;
        return ctx.log('You resigned. The service gave you a send-off; the papers gave you a column.', '🚪', 'info');
      }
      if (rng.chance(0.6)) {
        leaveJob(ctx, 'Removed from office', { fired: true });
        state.chief = null;
        return ctx.log('You refused to go, and were removed.', '📉', 'bad');
      }
      const c = chiefOf(state);
      c.confidence = 30;
      ctx.log('You refused to go, and they couldn\'t make it stick. For now.', '🪨', 'warn');
    },
  },
};
