/**
 * Feats of their day: what a scientist discovers, an explorer reaches, a spy does and an
 * architect builds depends on when they live.
 *
 *   Discovery    researchers and professors work at the frontier of their day — electromagnetism
 *                and evolution in the 1850s, radioactivity and the quantum in 1900, DNA and the
 *                transistor in the 1950s, the genome and machine learning after 2000. A
 *                breakthrough names an effect after you and lifts your standing.
 *   Expeditions  anyone fit enough, with the money or a sponsor: the North-West Passage, the
 *                source of the Nile, the poles, Everest, an ocean on a raft, a solo voyage round
 *                the world. Each opens in its era; succeed before the historical first and the
 *                first is yours (the Royal Geographical Society's medal from 1832). Many died.
 *   Espionage    case officers in the Cold War (1947–91) recruit agents, service dead drops, hunt
 *                moles and bring defectors over; outside it, a civil servant or scientist with
 *                secrets may be approached by the other side (from the 1930s) — and treason is
 *                a crime that follows you everywhere.
 *   Landmarks    architects and structural engineers win commissions in the style of the day:
 *                a railway terminus, a suspension bridge, the first skyscrapers, an Art Deco tower,
 *                a Brutalist civic centre, a glass tower, a stadium. The gold medals of the
 *                profession from their founding years (the RIBA's 1848, the AIA's 1907, the
 *                Pritzker 1979).
 *
 * state.feats = { discoveries: [{ year, name }], expeditions: [{ id, year, first, success }],
 *                 built: [{ year, name, kind }], spy: { agents, drops, turned } }
 */
import { Random, clamp } from '../../core/Random.js';
import { addHonor } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { addBuzz } from '../life/Fame.js';
import { commitOffense } from '../legal/JusticeSystem.js';

const feats = (state) => (state.feats ??= { discoveries: [], expeditions: [], built: [], spy: { agents: 0, drops: 0, turned: false } });
export const featsOf = (state) => state.feats ?? { discoveries: [], expeditions: [], built: [], spy: { agents: 0, drops: 0 } };
const side = (state, salt) => new Random(((state.world?.seed ?? 5) * 2246822519 + yearNow(state) * 3301 + salt) >>> 0);
const job = (state) => state.career?.job ?? null;
const P = (state, n) => Math.round(n * priceLevel(state));
const surname = (state) => state.character.lastName;

/* ------------------------------------------------------------------ */
/* Discovery                                                           */
/* ------------------------------------------------------------------ */
const FRONTIERS = [
  [1800, ['electrochemistry', 'the wave theory of light', 'fossil strata']],
  [1840, ['electromagnetic induction', 'the conservation of energy', 'germ theory', 'natural selection']],
  [1880, ['electromagnetic waves', 'the periodic table', 'bacteriology', 'thermodynamics']],
  [1900, ['radioactivity', 'the quantum', 'relativity', 'genetics', 'the electron']],
  [1925, ['quantum mechanics', 'the expanding universe', 'antibiotics', 'nuclear fission']],
  [1945, ['the structure of DNA', 'the transistor', 'the laser', 'plate tectonics', 'radio astronomy']],
  [1970, ['the quark', 'recombinant DNA', 'the microprocessor', 'the cosmic background']],
  [1995, ['the human genome', 'exoplanets', 'dark energy', 'stem cells']],
  [2015, ['gene editing', 'machine learning', 'gravitational waves', 'quantum computing']],
];
export const frontierOf = (y) => [...FRONTIERS].reverse().find(([from]) => y >= from)[1];
const RESEARCHERS = ['university', 'college', 'research'];

function discoveryTick(ctx) {
  const { state } = ctx;
  const j = job(state);
  if (!j || !RESEARCHERS.includes(j.professionId) || state.stats.smarts < 70) return;
  const rng = side(state, 13);
  if (!rng.chance(0.03 + (state.stats.smarts - 70) / 1000)) return;
  const y = yearNow(state);
  const topic = rng.pick(frontierOf(y));
  const name = `the ${surname(state)} ${rng.pick(['effect', 'equation', 'principle', 'constant', 'method'])}`;
  feats(state).discoveries.push({ year: y, name, topic });
  if (state.academia?.science) state.academia.science.hIndex = (state.academia.science.hIndex ?? 0) + 10;
  addBuzz(state, 6);
  ctx.log(`A breakthrough in ${topic}. Colleagues have started calling it ${name}.`, '💡', 'milestone');
  ctx.stat('happiness', 10);
}

/* ------------------------------------------------------------------ */
/* Expeditions                                                         */
/* ------------------------------------------------------------------ */
/** Goals: open from `from`, first reached in `first`, how hard, how deadly, what it costs. */
export const EXPEDITIONS = {
  nwPassage: { label: 'The North-West Passage', icon: '🧊', from: 1800, until: 1960, first: 1906, odds: 0.15, death: 0.25, cost: 60000 },
  nile: { label: 'The source of the Nile', icon: '🌊', from: 1840, until: 1900, first: 1862, odds: 0.3, death: 0.2, cost: 30000 },
  africa: { label: 'Across Africa coast to coast', icon: '🌍', from: 1840, until: 1900, first: 1856, odds: 0.3, death: 0.25, cost: 30000 },
  northPole: { label: 'The North Pole', icon: '🧭', from: 1870, until: 1990, first: 1909, odds: 0.12, death: 0.15, cost: 80000 },
  southPole: { label: 'The South Pole', icon: '🐧', from: 1895, until: 1990, first: 1911, odds: 0.18, death: 0.15, cost: 90000 },
  everest: { label: 'The summit of Everest', icon: '🏔️', from: 1921, until: 9999, first: 1953, odds: 0.2, death: 0.06, cost: 70000, later: { odds: 0.6, death: 0.01, cost: 60000 } },
  raft: { label: 'Across the Pacific on a raft', icon: '🛶', from: 1940, until: 1990, first: 1947, odds: 0.45, death: 0.08, cost: 15000 },
  soloSail: { label: 'Single-handed round the world', icon: '⛵', from: 1895, until: 9999, first: 1898, odds: 0.35, death: 0.08, cost: 40000 },
  space: { label: 'A seat to space as a private astronaut', icon: '🚀', from: 2021, until: 9999, first: 2001, odds: 0.97, death: 0.005, cost: 450000 },
};
export function expeditionOptions(state) {
  const y = yearNow(state);
  const done = feats(state).expeditions.filter((e) => e.success).map((e) => e.id);
  return Object.entries(EXPEDITIONS).filter(([id, e]) => y >= e.from && y < e.until && !done.includes(id)).map(([id, e]) => {
    const late = y > e.first && e.later;
    return { id, ...e, ...(late ? e.later : {}), firstYet: y <= e.first };
  });
}
export function expeditionEligibility(state, id) {
  const e = expeditionOptions(state).find((x) => x.id === id);
  if (!e) return { ok: false, reason: 'Not possible in this day' };
  if (state.character.age < 20 || state.character.age > (id === 'space' ? 80 : 50)) return { ok: false, reason: id === 'space' ? 'Ages 20–80' : 'Ages 20–50' };
  if (id !== 'space' && (state.stats.health < 60 || (state.stats.fitness ?? 50) < 55)) return { ok: false, reason: 'Needs health 60+ and fitness 55+' };
  if (state.yearly['feats.expedition']) return { ok: false, reason: 'One expedition a year' };
  return { ok: true, cost: P(state, e.cost), e };
}
function mount(ctx, id) {
  const { state, rng } = ctx;
  const el = expeditionEligibility(state, id);
  if (!el.ok) return ctx.toast(el.reason, 'warn');
  state.yearly['feats.expedition'] = 1;
  const { e } = el;
  const y = yearNow(state);
  const sponsored = (state.fame?.score ?? 0) >= 35 && id !== 'space';
  if (!sponsored) ctx.spend(el.cost, `${e.label} expedition`, { allowDebt: true });
  else ctx.log(`${y < 1920 ? 'A newspaper and the Royal Geographical Society' : 'Sponsors'} paid for the expedition.`, '📰', 'info');
  const skill = (state.stats.fitness ?? 50) / 200 + state.stats.smarts / 400;
  if (rng.chance(e.death * (y < 1950 ? 1.3 : 1))) { ctx.log(`${e.label}: the expedition was lost.`, e.icon, 'bad'); return void ctx.die(`lost on an expedition to ${e.label.replace(/^The /, 'the ')}`); }
  const success = rng.chance(clamp(e.odds + skill - 0.35, 0.05, 0.98));
  const first = success && e.firstYet;
  feats(state).expeditions.push({ id, year: y, success, first });
  ctx.stat('health', -rng.int(4, 15));
  if (!success) return ctx.log(`${e.label}: frostbite, scurvy, failure. You turned back, alive.`, e.icon, 'warn');
  addBuzz(state, first ? 40 : 10);
  ctx.stat('happiness', 15);
  if (first) {
    if (y >= 1832) addHonor(state, { id: `feats.rgs.${id}`, source: 'civil', name: 'Royal Geographical Society Gold Medal', icon: '🧭', prestige: 30, precedence: 30, citation: `The first to reach ${e.label.replace(/^The /, 'the ')}.` });
    return ctx.log(`You were the first: ${e.label}. Your name will be on the maps.`, e.icon, 'milestone');
  }
  ctx.log(`${e.label}: you made it.`, e.icon, 'milestone');
}

/* ------------------------------------------------------------------ */
/* Espionage                                                           */
/* ------------------------------------------------------------------ */
const coldWar = (y) => y >= 1947 && y <= 1991;
function spyTick(ctx) {
  const { state } = ctx;
  const j = job(state);
  const y = yearNow(state);
  const rng = side(state, 29);
  if (state.prompts.some((p) => p.type?.startsWith('feats.'))) return;
  if (j?.professionId === 'caseOfficer' && coldWar(y) && rng.chance(0.35)) {
    const kind = rng.pick(['recruit', 'drop', 'mole', 'defector']);
    const T = {
      recruit: ['A Recruitment', 'A cipher clerk at the other side\'s embassy drinks too much and hates his boss.', [['pitch', '🤝 Make the pitch'], ['wait', '⏳ Develop him slowly']]],
      drop: ['A Dead Drop', 'Your agent has left a signal: a chalk mark on a lamppost. The package is under a loose brick in the park.', [['service', '🧱 Service the drop yourself'], ['abort', '🚫 Abort — it feels wrong']]],
      mole: ['A Mole?', 'Three of your agents have been arrested in a year. Someone inside is talking.', [['hunt', '🔦 Start a mole hunt'], ['ignore', '🤐 Keep quiet and protect your career']]],
      defector: ['A Walk-In', 'A man in a raincoat at the embassy gate says he is a colonel in the other side\'s intelligence service and wants to come over.', [['take', '🚗 Bring him over tonight'], ['test', '🧪 Send him back to prove himself']]],
    }[kind];
    return ctx.prompt({ type: 'feats.spycraft', icon: '🕵️', title: T[0], text: T[1], data: { kind }, options: T[2].map(([id, label]) => ({ id, label })) });
  }
  // The approach: secrets are worth money to the other side.
  const access = j && ['intelligence', 'caseOfficer', 'foreignService', 'research', 'nuclearEng', 'aerospaceEng'].includes(j.professionId);
  if (access && y >= 1930 && y <= 1991 && !feats(state).spy.approached && rng.chance(0.03)) {
    feats(state).spy.approached = y;
    return ctx.prompt({ type: 'feats.approach', icon: '🕵️', title: 'A Friendly Stranger', text: `${y < 1947 ? 'A charming man from a university society' : 'A diplomat you met at a reception'} wants to talk about your work. Over the third lunch he names a figure — for documents.`, data: {}, options: [
      { id: 'report', label: '📞 Report the approach to security' },
      { id: 'sell', label: '💼 Take the money', tone: 'danger', hint: 'Treason: a lifetime sentence where it\'s caught' },
      { id: 'ignore', label: '🙅 Stop answering his calls' },
    ] });
  }
}

/* ------------------------------------------------------------------ */
/* Landmarks                                                           */
/* ------------------------------------------------------------------ */
const STYLES = [
  [1800, [['a Greek Revival bank', 'bank'], ['a Gothic Revival church', 'church']]],
  [1840, [['a railway terminus of iron and glass', 'station'], ['a Gothic Revival town hall', 'hall'], ['a suspension bridge', 'bridge']]],
  [1885, [['one of the first skyscrapers, on a steel frame', 'tower'], ['a Beaux-Arts station', 'station'], ['a great exhibition hall', 'hall']]],
  [1925, [['an Art Deco tower', 'tower'], ['a streamlined cinema', 'cinema'], ['a steel arch bridge', 'bridge']]],
  [1955, [['a Brutalist civic centre', 'hall'], ['a modernist glass-curtain tower', 'tower'], ['a motorway interchange', 'bridge']]],
  [1980, [['a postmodern office tower', 'tower'], ['a high-tech airport terminal', 'airport'], ['a cable-stayed bridge', 'bridge']]],
  [2000, [['a supertall glass tower', 'tower'], ['a stadium with a retractable roof', 'stadium'], ['a timber-framed library', 'hall']]],
];
const BUILDERS = { architecture: ['architect', 'project', 'senior', 'designPrincipal', 'studio', 'principal', 'managing'], structuralEng: ['senior', 'lead', 'principal', 'manager', 'director', 'chief'] };
function landmarkTick(ctx) {
  const { state } = ctx;
  const j = job(state);
  if (!j || !BUILDERS[j.professionId]?.includes(j.levelId)) return;
  const rng = side(state, 37);
  if (!rng.chance(0.06)) return;
  const y = yearNow(state);
  const [name, kind] = rng.pick([...STYLES].reverse().find(([from]) => y >= from)[1]);
  feats(state).built.push({ year: y, name, kind });
  addBuzz(state, 4);
  ctx.log(`Your design won the commission: ${name}. It went up over the next three years.`, '🏛️', 'milestone');
  const cc = state.character.countryId ?? 'US';
  const built = feats(state).built.length;
  const medal = j.professionId === 'architecture' && built >= 3 ? (y >= 1979 && rng.chance(0.15) ? ['Pritzker Prize', 1979] : cc === 'GB' && y >= 1848 ? ['Royal Gold Medal for Architecture', 1848] : cc === 'US' && y >= 1907 ? ['AIA Gold Medal', 1907] : null) : null;
  if (medal && !state.honors.some((h) => h.id === `feats.arch.${medal[0]}`) && rng.chance(0.3)) {
    addHonor(state, { id: `feats.arch.${medal[0]}`, source: 'civil', name: medal[0], icon: '🏅', prestige: 35, precedence: 30, citation: 'For a body of work that changed how cities look.' });
    ctx.log(`You were awarded the ${medal[0]}.`, '🏅', 'honor');
  }
}

export const FeatsResolvers = {
  spycraft(ctx, data, optionId) {
    const { state, rng } = ctx;
    const s = feats(state).spy;
    const good = (text) => { const j = job(state); if (j) j.performance = Math.min(100, (j.performance ?? 60) + 6); ctx.log(text, '🕵️', 'good'); };
    if (data.kind === 'recruit') { if (rng.chance(optionId === 'pitch' ? 0.45 : 0.6)) { s.agents += 1; return good('He said yes. You have a new agent in place.'); } return ctx.log(optionId === 'pitch' ? 'He reported the pitch. You were declared persona non grata and flown home.' : 'He was recalled before you could finish.', '🛫', 'warn'); }
    if (data.kind === 'drop') { if (optionId === 'abort') return ctx.log('You aborted. Later you learned the park had been full of watchers.', '🚫', 'info'); s.drops += 1; return rng.chance(0.85) ? good('The package was there: forty frames of film.') : ctx.log('The drop was a trap. You were roughed up and expelled.', '🚓', 'bad'); }
    if (data.kind === 'mole') { if (optionId === 'hunt') return rng.chance(0.4) ? good('Your mole hunt found him: a colleague of twenty years.') : ctx.log('The mole hunt tore the service apart and found nobody. Some careers ended, including nearly yours.', '🔦', 'warn'); return ctx.log('You kept quiet. More agents were arrested.', '🤐', 'warn'); }
    if (optionId === 'take') return rng.chance(0.75) ? good('You drove him over the border in the boot of a car. He talked for a year.') : ctx.log('He was a dangle: everything he told you was poison.', '🎭', 'bad');
    return ctx.log('You sent him back to prove himself. He was never heard from again.', '🌫️', 'warn');
  },
  approach(ctx, data, optionId) {
    const { state } = ctx;
    if (optionId === 'report') return ctx.log('You reported the approach. Security thanked you and told you to keep having lunch with him.', '📞', 'good');
    if (optionId === 'ignore') return ctx.log('You stopped answering. He stopped calling.', '🙅', 'info');
    feats(state).spy.turned = yearNow(state);
    ctx.earn(P(state, 50000), 'Cash in an envelope');
    commitOffense(ctx, { offenseId: 'espionage', discovery: 0.35, evidence: 0.85, context: 'documents passed to a foreign intelligence service', yearsLeft: 99 });
    ctx.log('You photographed the documents in the bathroom at night. The money arrived in envelopes.', '💼', 'warn');
  },
};

export const FeatsModule = {
  id: 'feats',
  order: 31.9,
  onAgeUp(ctx) { discoveryTick(ctx); spyTick(ctx); landmarkTick(ctx); },
  actions: { expedition: (ctx, id) => mount(ctx, id) },
  resolvers: FeatsResolvers,
};
