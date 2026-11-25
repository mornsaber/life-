/**
 * Mandates and trust territories: ruled for someone else.
 *
 *   League mandates (1920–46)  the Ottoman and German lands Britain, France, Belgium, Japan, South
 *                              Africa, Australia and New Zealand took in the Great War, governed as
 *                              "a sacred trust of civilisation": each year the mandatory power reported
 *                              to the Permanent Mandates Commission in Geneva, and the people could
 *                              petition the League.
 *   UN trust territories       from 1946 most became trust territories under the Trusteeship Council:
 *                              visiting missions, and a Charter promise of self-government. Every one
 *                              is independent (or joined a neighbour) by 1994.
 *   South West Africa          South Africa refused the trusteeship; the UN revoked its mandate in 1966
 *                              and it held on until Namibia's independence in 1990.
 *
 * Petitions to Geneva or New York add to the pressure for independence (world/History.js colonyYear).
 */
import { colonyHere, yearNow, rulerName } from './Eras.js';

export const isMandate = (st) => Boolean(st && (st.mandate || /mandat|trust territory/i.test(st.name ?? '')));
/** 'league' | 'trust' | 'revoked' (South West Africa after 1966), or null. */
export function mandateKind(state) {
  const st = colonyHere(state);
  if (!isMandate(st)) return null;
  const y = yearNow(state);
  if (st.ruler === 'ZA' && y >= 1966) return 'revoked';
  return y < 1946 || st.ruler === 'ZA' ? 'league' : 'trust';
}
const BODY = { league: 'the League of Nations\' Permanent Mandates Commission in Geneva', trust: 'the UN Trusteeship Council in New York', revoked: 'the UN in New York' };

export const MandatesModule = {
  id: 'mandate',
  order: 36.7,
  onAgeUp(ctx) {
    const { state } = ctx;
    const kind = mandateKind(state);
    if (!kind || !state.character.alive || state.character.age < 12) return;
    const st = colonyHere(state);
    const seen = (state.mandates ??= {});
    if (seen[kind]) return;
    seen[kind] = state.character.age;
    const ruler = rulerName(st.ruler);
    if (kind === 'league') ctx.log(`You live in a League of Nations mandate: ${ruler} governs it on the League's behalf, as "a sacred trust of civilisation", and reports on it every year to ${BODY.league}. Its people may petition the League.`, '🕊️', 'info');
    else if (kind === 'trust') ctx.log(`The mandate is a UN trust territory now: the Trusteeship Council sends visiting missions, hears petitions, and the Charter promises self-government. ${ruler} is answerable to New York.`, '🇺🇳', 'info');
    else ctx.log(`The UN has revoked South Africa's mandate (1966): in the world's eyes it rules here illegally. It stays all the same.`, '⚖️', 'warn');
  },
  actions: {
    petition(ctx) {
      const { state } = ctx;
      const kind = mandateKind(state);
      if (!kind) return ctx.toast('Not a mandate', 'warn');
      if (state.yearly['mandate.petition']) return ctx.toast('Already petitioned this year', 'warn');
      state.yearly['mandate.petition'] = true;
      const cc = state.character.countryId ?? 'US';
      const rec = (state.era.colonies[cc] ??= { done: [], pressure: 0 });
      rec.pressure = (rec.pressure ?? 0) + (kind === 'trust' ? 2 : 1);
      rec.joined = true;
      ctx.stat('happiness', 2);
      return ctx.log(kind === 'trust'
        ? `You signed a petition to the Trusteeship Council and spoke to the visiting mission. Your words are in the record in New York.`
        : kind === 'league' ? `You sent a petition to Geneva through the mandatory administration. The Commission will read it, months from now.`
        : `You signed a petition to the UN against South African rule. Copies went to New York, and one to the security police.`, '📜', 'good');
    },
  },
};
