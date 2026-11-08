/**
 * Changing the rules: a head of government in power can rewrite how the country is governed.
 * Free elections, a free press, equal rights for women, freedom of religion, open borders,
 * private enterprise, dismantling the secret police: each changes the regime everyone in the
 * country lives under (world/Regimes.js REFORMS layer), whatever era it is. Reforms cost
 * political capital, and in an unfree state the old guard may not take it quietly.
 *
 * state.world.reforms = { [cc]: { elections, press, … } }   state.world.reformLog = [{ cc, id, year, by }]
 */
import { Random, clamp } from '../../core/Random.js';
import { currentYear } from '../../core/State.js';
import { regimeHere, setReformLayer } from './Regimes.js';
import { executiveLevel } from '../politics/Budgets.js';
import { OFFICES } from '../politics/Offices.js';
import { COUNTRIES } from './Countries.js';

export const REFORM_LIST = {
  freeElections: { label: '🗳️ Call free elections', done: (r) => r.elections === 'free', fields: { elections: 'free' }, text: 'You announced free, multi-party elections. Opposition parties are registering by the hundred.', cost: 12, risky: true },
  freePress: { label: '📰 Free the press', done: (r) => r.press === 'free' && r.internet !== 'censored', fields: (r) => ({ press: 'free', ...(r.internet === 'censored' ? { internet: 'open' } : {}) }), text: 'Censorship is over. The first independent newspaper sold out by nine in the morning.', cost: 6, risky: true },
  womensRights: { label: '⚖️ Equal rights for women', done: (r) => r.women === 'equal', fields: { women: 'equal' }, text: 'Women can now study, work, travel and own property in their own right.', cost: 8, risky: false },
  religiousFreedom: { label: '🕊️ Freedom of religion', done: (r) => r.religion === 'free', fields: { religion: 'free' }, text: 'Every faith may worship openly now, and no one has to have one.', cost: 5, risky: false },
  openBorders: { label: '🛂 Let people leave and return', done: (r) => r.exit === 'free', fields: { exit: 'free' }, text: 'Exit permits are abolished. The queue at the passport office went round the block.', cost: 4, risky: true },
  marketReform: { label: '🏪 Legalise private enterprise', done: (r) => r.business === 'free' && r.jobs === 'market', fields: { business: 'free', jobs: 'market', banking: 'open' }, text: 'Private businesses are legal again. Market stalls appeared overnight on every corner.', cost: 6, risky: false },
  secretPolice: { label: '🗝️ Dismantle the secret police', done: (r) => (r.surveillance ?? 0) <= 0.04, fields: { surveillance: 0.03 }, text: 'The secret police files are being opened. People are reading what their neighbours reported.', cost: 8, risky: true },
};
const UNFREE = ['authoritarian', 'oneParty', 'junta', 'theocracy', 'absoluteMonarchy', 'totalitarian', 'dictatorship', 'militarist', 'colony', 'apartheid', 'fragile'];

/** You run the national government of the country you live in. */
export function governsHere(state) {
  const o = state.politics?.office;
  return Boolean(o && executiveLevel(o.id) === 'national' && (OFFICES[o.id]?.country ?? 'US') === (state.character.countryId ?? 'US'));
}
/** The reforms still open to you, given how the country is governed now. */
export function reformsOpen(state) {
  if (!governsHere(state)) return [];
  const r = regimeHere(state);
  return Object.entries(REFORM_LIST).filter(([, def]) => !def.done(r)).map(([id, def]) => ({ id, ...def }));
}

export const ReformsModule = {
  id: 'reforms',
  order: 34.3,
  init(state) { setReformLayer(state.world?.reforms ?? {}); },
  actions: {
    enact(ctx, id) {
      const { state } = ctx;
      const def = REFORM_LIST[id];
      if (!def || !governsHere(state)) return;
      if (state.yearly['reforms.enact']) return ctx.toast('One great reform a year.', 'warn');
      const cc = state.character.countryId ?? 'US';
      const before = regimeHere(state);
      if (def.done(before)) return;
      state.yearly['reforms.enact'] = 1;
      const fields = typeof def.fields === 'function' ? def.fields(before) : def.fields;
      const w = (state.world.reforms ??= {});
      w[cc] = { ...(w[cc] ?? {}), ...fields };
      // A reformed state that now holds free elections with a free press is a democracy.
      const after = { ...before, ...w[cc] };
      if (after.elections === 'free' && after.press === 'free' && !['democracy'].includes(before.kind)) w[cc] = { ...w[cc], kind: 'democracy', name: `a democracy, reformed in ${currentYear(state)}` };
      (state.world.reformLog ??= []).push({ cc, id, year: currentYear(state) });
      setReformLayer(w);
      const o = state.politics.office;
      o.approval = Math.round(clamp((o.approval ?? 50) - def.cost + (UNFREE.includes(before.kind) ? 4 : 0), 0, 100));
      ctx.log(def.text, '📜', 'milestone');
      ctx.emit('news:story', { tier: 'national', headline: `${COUNTRIES[cc]?.name ?? cc}: ${def.label.replace(/^\S+\s/, '')}`, weight: 8, icon: '📜', you: true });
      // The old guard.
      const rng = new Random(((state.world?.seed ?? 1) * 7121 + state.character.age * 37 + id.length) >>> 0);
      if (def.risky && UNFREE.includes(before.kind) && rng.chance(0.2)) {
        ctx.stat('stress', 10);
        ctx.log('The generals and the old party bosses are furious. There are rumours of tanks moving at night.', '🪖', 'warn');
        (state.world.unrest ??= {})[cc] = Math.min(100, (state.world.unrest[cc] ?? 30) + 15);
      }
    },
  },
};
