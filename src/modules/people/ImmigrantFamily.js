/**
 * Families between two countries.
 *
 * An immigrant (born somewhere else) and the second generation (parents from somewhere else)
 * live with a second country: the language spoken at home, visits to the village or the city
 * the family left, festivals and food, parents who disapprove of the person you love, and — for
 * immigrants with children — kids who answer in the local language.
 *
 * state.heritage = { cc, since, visits, bilingual }
 */
import { Random } from '../../core/Random.js';
import { living, ageOf } from './People.js';
import { birthCountryOf, nativeLanguages, LANGUAGE_FLUENT } from '../world/Immigration.js';
import { COUNTRIES, priceLevel } from '../world/Countries.js';

const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 39119 + state.character.age * 683 + 0x1a6) >>> 0);
const here = (state) => state.character.countryId ?? 'US';
const parents = (state) => living(state).filter((p) => ['mother', 'father'].includes(p.relation));

/** The other country in your family's story, and whether you're the one who moved. */
export function heritageOf(state) {
  const cc = here(state);
  const born = birthCountryOf(state);
  if (born !== cc && COUNTRIES[born]) return { cc: born, immigrant: true };
  const parent = (state.people?.list ?? []).find((p) => ['mother', 'father'].includes(p.relation) && p.nationality && p.nationality !== cc && COUNTRIES[p.nationality]);
  return parent ? { cc: parent.nationality, immigrant: false } : null;
}
const langOf = (cc) => nativeLanguages(cc).find((l) => !nativeLanguages('US').includes(l)) ?? nativeLanguages(cc)[0];

export function immigrantFamilyTick(main) {
  const { state } = main;
  const h = heritageOf(state);
  if (!h || state.character.age < 8 || state.legal?.incarceration) return;
  const rng = sideRng(state);
  if (!rng.chance(0.22)) return;
  const age = state.character.age;
  const country = COUNTRIES[h.cc]?.name ?? h.cc;
  const lang = langOf(h.cc);
  const localLang = nativeLanguages(here(state)).includes(lang);
  const kids = living(state).filter((p) => p.relation === 'child' && ageOf(state, p) >= 3 && ageOf(state, p) < 18);
  const partner = living(state).find((p) => ['partner', 'fiance', 'spouse'].includes(p.relation));
  const pool = [];
  if (!h.immigrant && age < 18 && !localLang && parents(state).length) pool.push('language');
  if (age >= 18 && (state.finances.cash ?? 0) > 1500) pool.push('visit');
  pool.push('festival');
  if (partner && partner.nationality !== h.cc && parents(state).length && !state.heritage?.metPartner) pool.push('partner');
  if (h.immigrant && kids.length && !localLang) pool.push('kidsLanguage');
  const kind = rng.pick(pool);
  const data = { kind, cc: h.cc, lang };
  const prompt = (title, text, options) => main.prompt({ type: 'immigrantFamily.event', icon: COUNTRIES[h.cc]?.flag ?? '🌍', title, text, data, options });
  if (kind === 'language') return prompt('Two Languages', `At home your parents speak ${lang}. At school, a boy laughed when your mother called you in from the gate.`, [{ id: 'keep', label: `🗣️ Keep speaking ${lang} at home`, hint: 'Grow up bilingual' }, { id: 'refuse', label: '🙅 Answer only in the local language', hint: 'Fit in' }]);
  if (kind === 'visit') return prompt(`Back to ${country}`, `${h.immigrant ? 'It has been years since you left.' : 'Your parents\' relatives keep asking when you\'ll come.'} A trip to ${country}: the family, the food, the streets ${h.immigrant ? 'you grew up in' : 'your parents talk about'}.`, [{ id: 'go', label: '✈️ Go for a month', hint: `≈$${Math.round(2500 * priceLevel(state)).toLocaleString()}` }, { id: 'later', label: '📅 Not this year' }]);
  if (kind === 'festival') return prompt('A Festival', `The ${country} community is celebrating: food you can't get anywhere else, music, cousins you see once a year.`, [{ id: 'go', label: '🎉 Go, and bring someone' }, { id: 'skip', label: '🛋️ Skip it' }]);
  if (kind === 'partner') return prompt('Meeting the Parents', `Your parents have met ${partner.firstName}. Your father said almost nothing. Your mother asked, later, whether you had "thought about the family".`, [{ id: 'stand', label: '❤️ Stand by your partner', hint: 'They\'ll come round — or won\'t' }, { id: 'bridge', label: '🤝 Bring both families together for a meal', hint: 'Hard work; might help' }]);
  return prompt('Your Children\'s Language', `Your children understand ${lang} but answer you in the local language. Your mother, on the phone from ${country}, can't follow what they say.`, [{ id: 'teach', label: `📚 Weekend ${lang} school`, hint: 'They complain; it lasts' }, { id: 'let', label: '🤷 Let it go', hint: 'Their country is this one' }]);
}

export const ImmigrantFamilyResolvers = {
  event(ctx, data, optionId) {
    const { state, rng } = ctx;
    const H = (state.heritage ??= { cc: data.cc, visits: 0, bilingual: false });
    const par = parents(state);
    const bump = (list, n) => { for (const p of list) p.relationship = Math.max(0, Math.min(100, (p.relationship ?? 60) + n)); };
    switch (`${data.kind}:${optionId}`) {
      case 'language:keep':
        H.bilingual = true;
        state.migration ??= { birthCountry: state.character.countryId ?? 'US', residences: {}, languages: {}, history: [] };
        state.migration.languages[data.lang] = LANGUAGE_FLUENT;
        bump(par, 5); ctx.stat('smarts', 2);
        return ctx.log(`You grew up speaking ${data.lang} at home. Later, it will open doors.`, '🗣️', 'good');
      case 'language:refuse': bump(par, -6); return ctx.log('You answered only in the local language. Your grandmother stopped trying.', '🙅', 'info');
      case 'visit:go':
        ctx.spend(Math.round(2500 * priceLevel(state)), `A month in ${COUNTRIES[data.cc]?.name ?? data.cc}`);
        H.visits += 1; ctx.stat('happiness', 6); ctx.stat('stress', -6); bump(par, 4);
        return ctx.log(rng.pick(['An aunt you\'d never met cried when she saw you.', 'You ate your way through the city and came home three kilos heavier.', 'Everyone knew who you were before you said your name.', 'The house your family left is a pharmacy now.']), '✈️', 'good');
      case 'visit:later': return ctx.log('Next year, you told them.', '📅', 'muted');
      case 'festival:go': ctx.stat('happiness', 4); return ctx.log('Music, smoke from the grills, and the old songs everyone still knows.', '🎉', 'good');
      case 'festival:skip': return undefined;
      case 'partner:stand': H.metPartner = true; bump(par, -8); if (rng.chance(0.5)) { bump(par, 10); return ctx.log('A year later your father asked your partner to help him with something. That was the apology.', '❤️', 'good'); } return ctx.log('Your parents are polite. That is all.', '❤️', 'warn');
      case 'partner:bridge': H.metPartner = true; ctx.spend(Math.round(300 * priceLevel(state)), 'A family dinner'); if (rng.chance(0.65)) { bump(par, 6); return ctx.log('Two families, two cuisines, one long table. Everyone ate too much; nobody fought.', '🤝', 'good'); } bump(par, -4); return ctx.log('The dinner was awkward from the soup onwards.', '🤝', 'warn');
      case 'kidsLanguage:teach': H.kidsBilingual = true; ctx.spend(Math.round(800 * priceLevel(state)), 'Weekend language school'); return ctx.log(`Every Saturday, ${data.lang} school. They complain. They also call their grandmother now.`, '📚', 'good');
      case 'kidsLanguage:let': return ctx.log('Your children are from here. That was, after all, the point.', '🤷', 'info');
      default: return undefined;
    }
  },
};

export const ImmigrantFamilyModule = { id: 'immigrantFamily', order: 13.8, onAgeUp: immigrantFamilyTick, resolvers: ImmigrantFamilyResolvers };
