/**
 * State visits: the highest form of diplomacy. A reigning monarch, a head of state, a head of
 * government (and, less grandly, a foreign minister) can make a state visit abroad once a
 * year, and receives foreign leaders at home.
 *
 *   Going      choose from the capitals asking: a banquet, an address to parliament, a trade
 *              delegation. A good visit warms relations (and can bring trade), a gaffe makes
 *              headlines; the host often confers its order on a visiting head of state.
 *   Hosting    a leader comes to you: a lavish banquet or a working visit; a monarch can
 *              confer the national order on the guest
 *   Relations  state.world.relations[cc] (−100…100): warmer ties make allies' decorations
 *              and trade deals likelier
 *
 * state.diplomacy = { visits: [{ cc, age, kind, outcome }], hosted: [{ cc, age }] }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { COUNTRIES } from '../world/Countries.js';
import { OFFICES } from './Offices.js';
import { awardForeign } from '../world/ForeignAwards.js';
import { ministryOf } from './Ministers.js';

const home = (state) => state.character.countryId ?? 'US';
const dip = (state) => (state.diplomacy ??= { visits: [], hosted: [] });
const rel = (state, cc) => ((state.world.relations ??= {})[cc] ?? 0);
const bumpRel = (state, cc, n) => { (state.world.relations ??= {})[cc] = Math.round(clamp(rel(state, cc) + n, -100, 100)); };

/** Who you are on the world stage: 'sovereign' | 'headOfState' | 'headOfGovernment' | 'foreignMinister' | null. */
export function statesman(state) {
  if (state.royal?.reigning && !state.royal.abdicated) return 'sovereign';
  const o = state.politics?.office;
  const def = o && OFFICES[o.id];
  if (def?.headOfState || def?.ceremonial || o?.id === 'president') return 'headOfState';
  if (def?.leader && (def.level ?? 0) >= 5) return 'headOfGovernment';
  const m = ministryOf(state);
  if ((m?.dept === 'foreign' && m.rank === 'cabinet') || (o?.id === 'cabinetSecretary' && o.dept === 'state')) return 'foreignMinister';
  return null;
}
const LABEL = { sovereign: 'a state visit', headOfState: 'a state visit', headOfGovernment: 'an official visit', foreignMinister: 'a ministerial visit' };
const GRAND = ['US', 'GB', 'FR', 'DE', 'JP', 'IN', 'CN', 'IT', 'ES', 'CA', 'AU', 'BR', 'SA', 'KR', 'MX', 'NL', 'SE', 'NO', 'ZA', 'NG', 'EG', 'TR', 'ID', 'TH', 'AE', 'IE', 'NZ', 'PL', 'BE', 'DK'];

/** The capitals asking you this year (three). */
export function invitations(state) {
  const seed = state.character.age * 31 + (state.world?.seed ?? 1);
  const pool = GRAND.filter((c) => c !== home(state) && COUNTRIES[c]);
  const out = [];
  for (let i = 0; out.length < 3 && i < pool.length * 2; i++) {
    const c = pool[(seed + i * 7) % pool.length];
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

export const StateVisitsModule = {
  id: 'stateVisits',
  order: 34.2,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const who = statesman(state);
    if (!who || !state.character.alive || state.prompts.some((p) => p.type === 'stateVisits.host') || !rng.chance(who === 'foreignMinister' ? 0.25 : 0.45)) return;
    const cc = rng.pick(GRAND.filter((c) => c !== home(state) && COUNTRIES[c]));
    ctx.prompt({
      type: 'stateVisits.host', icon: '🤝', title: 'A Visit to You',
      text: `${COUNTRIES[cc].flag} The leader of ${COUNTRIES[cc].name} is coming on ${who === 'sovereign' || who === 'headOfState' ? 'a state visit' : 'an official visit'}.`,
      options: [
        { id: 'lavish', label: '🍽️ A state banquet and full ceremony' },
        { id: 'working', label: '🗂️ A working visit: talks, no fuss' },
        ...(who === 'sovereign' ? [{ id: 'order', label: '🎗️ The banquet, and confer the national order on your guest' }] : []),
      ],
      data: { cc },
    });
  },
  actions: {
    /** Go on a visit abroad. arg: country code (one of this year's invitations). */
    go(ctx, cc) {
      const { state, rng } = ctx;
      const who = statesman(state);
      if (!who) return ctx.toast('Heads of state and government, and foreign ministers', 'warn');
      if (!invitations(state).includes(cc)) return ctx.toast('No invitation from there this year', 'warn');
      if (yearlyCount(state, 'stateVisits.go')) return ctx.toast('One visit abroad a year', 'warn');
      bumpYearly(state, 'stateVisits.go');
      const c = COUNTRIES[cc];
      const skill = (state.stats.smarts + state.stats.looks + state.stats.happiness) / 3;
      const roll = rng.next();
      const gaffe = roll < clamp(0.15 - (skill - 50) / 300, 0.04, 0.25);
      const triumph = !gaffe && roll > clamp(0.6 - (skill - 50) / 200, 0.35, 0.8);
      dip(state).visits.push({ cc, age: state.character.age, kind: who, outcome: gaffe ? 'gaffe' : triumph ? 'triumph' : 'good' });
      ctx.stat('stress', 3);
      if (gaffe) {
        bumpRel(state, cc, -6);
        ctx.emit('fame:scandal', { severity: 5, headline: `a diplomatic gaffe on ${LABEL[who]} to ${c.name}` });
        return ctx.log(`${c.flag} ${LABEL[who][0].toUpperCase()}${LABEL[who].slice(1)} to ${c.name} went wrong: a remark at the banquet became a diplomatic incident.`, c.flag, 'bad');
      }
      bumpRel(state, cc, triumph ? 15 : 8);
      ctx.emit('fame:buzz', { amount: triumph ? 6 : 3 });
      if (state.royal?.reigning) state.royal.popularity = Math.min(100, (state.royal.popularity ?? 60) + (triumph ? 3 : 1));
      const o = state.politics?.office;
      if (o) o.approval = clamp((o.approval ?? 50) + (triumph ? 3 : 1), 0, 100);
      // The host's order for a visiting head of state.
      if (who !== 'foreignMinister' && rng.chance(who === 'headOfGovernment' ? 0.25 : 0.6)) awardForeign(ctx, { cc, why: `${LABEL[who]} to ${c.name}` });
      if (triumph && state.economy) state.economy.growth = (state.economy.growth ?? 0) + 0.001;
      return ctx.log(`${c.flag} ${LABEL[who][0].toUpperCase()}${LABEL[who].slice(1)} to ${c.name}: ${triumph ? rng.pick(['an address to a joint session of parliament, a standing ovation and a trade deal', 'crowds on the streets, a banquet in your honour, and agreements on energy and defence', 'a speech in the local language that charmed the country']) : rng.pick(['a guard of honour, a banquet and useful talks', 'a wreath at the war memorial, a state dinner and a joint statement'])}.`, c.flag, triumph ? 'milestone' : 'good');
    },
  },
  resolvers: {
    host(ctx, data, optionId) {
      const { state } = ctx;
      const c = COUNTRIES[data.cc];
      dip(state).hosted.push({ cc: data.cc, age: state.character.age });
      if (optionId === 'working') {
        bumpRel(state, data.cc, 4);
        return ctx.log(`${c.flag} A working visit from ${c.name}: three hours of talks and a joint press conference.`, '🗂️', 'info');
      }
      bumpRel(state, data.cc, optionId === 'order' ? 14 : 9);
      ctx.stat('stress', 2);
      ctx.log(`${c.flag} You hosted the leader of ${c.name}: a carriage procession, a guard of honour and a white-tie state banquet${optionId === 'order' ? `. You invested your guest with the national order, and ${c.name}'s papers were delighted` : ''}.`, '🍽️', 'good');
      return undefined;
    },
  },
};

/** Relations, for views. */
export const relationsWith = (state, cc) => rel(state, cc);
