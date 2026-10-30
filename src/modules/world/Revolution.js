/**
 * When people take to the streets. In a country without free elections — or one in crisis —
 * unrest builds: recessions, sanctions, a stolen election, a death in custody. When it boils
 * over there are protests in the squares, and everyone chooses: march, organise, stay home —
 * or, in uniform, obey the order to clear the square or refuse it. If enough people (and enough
 * soldiers) refuse, the regime falls; if not, the crackdown comes, and organisers flee into
 * exile (asylum is open to them from the Move tab).
 *
 * state.world.unrest = { [cc]: 0–100 }   state.world.revolutions = [{ cc, age, result }]
 * state.revolution = { role, arrested, defected }
 */
import { Random, clamp } from '../../core/Random.js';
import { currentYear } from '../../core/State.js';
import { regimeHere, setRegimeOverrides } from './Regimes.js';
import { sanctionsOn } from './Regimes.js';
import { commitOffense } from '../legal/JusticeSystem.js';
import { COUNTRIES } from './Countries.js';

const UNFREE = ['authoritarian', 'oneParty', 'junta', 'theocracy', 'hybrid', 'absoluteMonarchy', 'totalitarian', 'transitional'];
const SPARKS = ['A street vendor set himself alight outside a government office.', 'The election results were announced before the polls closed.', 'A young woman died in police custody.', 'Bread prices doubled overnight.', 'A leaked video showed the leader\'s family on a yacht while hospitals ran out of medicine.'];
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 31337 + state.character.age * 1019 + 0x8e7) >>> 0);
const here = (state) => state.character.countryId ?? 'US';
const uniformed = (state) => Boolean(state.military.service) || ['police', 'statePolice', 'sheriff'].includes(state.career.job?.professionId);
export const unrestOf = (state, cc = here(state)) => state.world?.unrest?.[cc] ?? 0;

export function revolutionTick(main) {
  const { state } = main;
  const cc = here(state);
  const reg = regimeHere(state);
  if (!UNFREE.includes(reg.kind) || state.character.age < 14) return;
  const rng = sideRng(state);
  const w = state.world;
  w.unrest ??= {};
  const u = (w.unrest[cc] ?? rng.int(5, 25)) * 0.85 + (state.economy?.phase === 'recession' ? 10 : 0) + (sanctionsOn(cc) ? 4 : 0) + rng.int(-4, 9) + (reg.kind === 'totalitarian' ? -6 : 0);
  w.unrest[cc] = Math.round(clamp(u, 0, 100));
  if (w.unrest[cc] < 55 || state.legal?.incarceration) return;
  const R = (state.revolution ??= { role: null, arrested: false, defected: false });
  const spark = rng.pick(SPARKS);
  if (w.unrest[cc] >= 80) return climax(main, rng, cc, spark);
  // Protests: everyone chooses.
  R.role = null;
  const options = uniformed(state)
    ? [{ id: 'obey', label: '🛡️ Obey orders and clear the square' }, { id: 'refuse', label: '🙅 Refuse to fire on your own people', hint: 'Court-martial — or history', tone: 'danger' }, { id: 'sick', label: '🤒 Call in sick' }]
    : [{ id: 'march', label: '🪧 March with them' }, { id: 'organise', label: '📣 Organise: the group chats, the banners, the next square', hint: 'You\'ll be on a list', tone: 'danger' }, { id: 'home', label: '🏠 Stay home' }];
  main.prompt({ type: 'revolution.protest', icon: '✊', title: 'The Squares Are Full', text: `${spark} Tens of thousands are in the streets of ${COUNTRIES[cc]?.capital ?? 'the capital'}.`, data: { cc }, options });
}

function climax(main, rng, cc, spark) {
  const { state } = main;
  const R = state.revolution;
  const odds = 0.35 + (R.defected ? 0.15 : 0) + (R.role === 'organise' ? 0.05 : 0) + (state.economy?.phase === 'recession' ? 0.1 : 0);
  const won = rng.chance(odds);
  state.world.revolutions = [...(state.world.revolutions ?? []), { cc, age: state.character.age, result: won ? 'won' : 'crushed' }].slice(-6);
  state.world.unrest[cc] = won ? 10 : 35;
  if (won) {
    state.world.juntas ??= {};
    state.world.juntas[cc] = { since: currentYear(state), civilian: true, revolution: true };
    setRegimeOverrides(state.world.juntas);
    main.emit('world:regimeChanged', { cc });
    main.log(`${spark} This time the army would not shoot. After weeks in the squares, the regime fell. There will be free elections.`, '🕊️', 'milestone');
    main.stat('happiness', 10);
    if (R.role === 'organise' || R.defected) { main.emit('fame:buzz', { amount: 12 }); main.log('Your name is known now: one of the people who made it happen.', '✊', 'good'); }
    return;
  }
  main.log(`${spark} The protests were crushed. Tanks in the squares, curfews, thousands detained.`, '🪖', 'bad');
  main.emit('health:trauma', { amount: 8, source: 'crackdown' });
  if (R.role === 'organise' || R.defected) {
    state.legal.flags.persecuted = cc;
    main.prompt({ type: 'revolution.crackdown', icon: '🚨', title: 'They\'re Coming for the Organisers', text: 'Friends have been taken from their homes at night. Your name is on the list.', data: { cc }, options: [
      { id: 'exile', label: '🧳 Flee the country tonight', hint: 'Claim asylum abroad from the Move tab' }, { id: 'hide', label: '🏚️ Go into hiding', hint: 'A risk every day' }, { id: 'stay', label: '🧱 Stay and face it' },
    ] });
  }
}

export const RevolutionResolvers = {
  protest(ctx, data, optionId) {
    const { state, rng } = ctx;
    const R = (state.revolution ??= { role: null, arrested: false, defected: false });
    R.role = optionId;
    state.world.unrest[data.cc] = Math.min(100, (state.world.unrest[data.cc] ?? 50) + ({ march: 3, organise: 6, refuse: 8 }[optionId] ?? 0));
    switch (optionId) {
      case 'march': if (rng.chance(0.12)) { ctx.stat('health', -rng.int(4, 12)); return ctx.log('Tear gas, rubber bullets, and a stranger who pulled you into a doorway.', '🪧', 'warn'); } ctx.stat('happiness', 4); return ctx.log('You marched. For the first time in your life you shouted what everyone whispers.', '🪧', 'good');
      case 'organise': if (rng.chance(0.25)) { R.arrested = true; return commitOffense(ctx, { offenseId: 'antiState', caught: true, evidence: 0.8, context: 'organising protests' }); } ctx.stat('stress', 8); return ctx.log('You organised: encrypted chats, banners, water and first-aid points. The next square was bigger.', '📣', 'warn');
      case 'home': return ctx.log('You stayed home and watched it on a phone with the sound off.', '🏠', 'info');
      case 'obey': ctx.emit('health:trauma', { amount: 6, source: 'crackdown' }); return ctx.log('You cleared the square. You will remember the faces.', '🛡️', 'warn');
      case 'refuse': R.defected = true; if (rng.chance(0.4)) { ctx.emit('career:resign', { reason: 'Dismissed for refusing orders', fired: true }); return ctx.log('You lowered your weapon. Others did too. You were arrested by your own commanders that night.', '🙅', 'bad'); } ctx.emit('fame:buzz', { amount: 6 }); return ctx.log('You lowered your weapon. So did the men beside you. The crowd cheered you as you walked into it.', '🙅', 'milestone');
      default: return ctx.log('You called in sick and stayed indoors.', '🤒', 'info');
    }
  },
  crackdown(ctx, data, optionId) {
    const { state, rng } = ctx;
    if (optionId === 'exile') { state.legal.flags.exileFrom = data.cc; return ctx.log('You crossed the border at night with one bag. Asylum is open to you from the Move tab.', '🧳', 'milestone'); }
    if (optionId === 'hide') { if (rng.chance(0.5)) return ctx.log('You moved from flat to flat for a year. They never found you.', '🏚️', 'warn'); }
    commitOffense(ctx, { offenseId: 'antiState', caught: true, evidence: 0.9, context: 'leading the protests' });
  },
};

export const RevolutionModule = { id: 'revolution', order: 34.2, onAgeUp: revolutionTick, resolvers: RevolutionResolvers };
