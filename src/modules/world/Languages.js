/**
 * One set of languages. Whether you learned Arabic at the Defense Language
 * Institute, Spanish living in Madrid or Korean on a tour at Camp Humphreys,
 * it's the same skill: the languages you speak (state.migration.languages)
 * and the professional proficiency credential careers ask for
 * (languageProficiency) are kept in step.
 *
 *  - Earning the credential (a language school, a cryptologic linguist's
 *    course, Special Forces language training, a university program) makes
 *    you fluent in a particular language: where you're posted, or one the
 *    service needs.
 *  - Becoming fluent in a foreign language any other way earns the credential.
 *
 * state.migration.proficiency = the language your credential is in.
 */
import { LANGUAGE_FLUENT, nativeLanguages, birthCountryOf } from './Immigration.js';
import { grantCredential, hasCredential } from '../credentials/LicensingEngine.js';
import { postingOf } from './Posting.js';

/** Languages services and agencies train people in. */
export const STRATEGIC = ['Arabic', 'Mandarin', 'Russian', 'Korean', 'Farsi', 'Spanish', 'French', 'Pashto', 'Tagalog', 'Ukrainian'];

/** Foreign languages you're fluent in. */
export function fluentForeign(state) {
  const native = nativeLanguages(birthCountryOf(state));
  return Object.entries(state.migration?.languages ?? {}).filter(([l, p]) => p >= LANGUAGE_FLUENT && !native.includes(l)).map(([l]) => l);
}
/** The language your proficiency credential is in. */
export const proficiencyLanguage = (state) => state.migration?.proficiency ?? fluentForeign(state)[0] ?? null;

function onCredential(ctx) {
  const { state, rng } = ctx;
  state.migration ??= { birthCountry: state.character.countryId ?? 'US', residences: {}, languages: {}, history: [] };
  // Already fluent in something foreign: that's what the credential certifies.
  const known = fluentForeign(state);
  if (known.length) { state.migration.proficiency ??= known[0]; return; }
  const native = nativeLanguages(birthCountryOf(state));
  const posted = postingOf(state)?.language;
  const lang = posted && !native.includes(posted) ? posted : rng.pick(STRATEGIC.filter((l) => !native.includes(l)));
  state.migration.languages[lang] = LANGUAGE_FLUENT;
  state.migration.proficiency = lang;
  ctx.log(`Your language training was in ${lang}: you speak it professionally now.`, '🗣️', 'good');
}

export const LanguagesModule = {
  id: 'languages',
  order: 42.5,
  setup(engine) {
    engine.bus.on('credential:earned', ({ ctx, id }) => { if (id === 'languageProficiency') onCredential(ctx); });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (state.character.age < 18 || !state.migration || hasCredential(state, 'languageProficiency')) return;
    const [lang] = fluentForeign(state);
    if (!lang) return;
    state.migration.proficiency = lang;
    grantCredential(ctx, 'languageProficiency', { silent: true });
    ctx.log(`Your fluent ${lang} counts as professional language proficiency now — it opens doors in intelligence, diplomacy and the military.`, '🗣️', 'good');
  },
};
