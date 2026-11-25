/**
 * Life in a condominium: the New Hebrides (1906–80), ruled jointly by Britain and France.
 *
 *   Two of everything   two Resident Commissioners, two police forces, two prisons, two hospital
 *                       services, two school systems, two currencies in the shops; and a Joint
 *                       Court whose president, until 1939, was named by the King of Spain. The
 *                       islanders called it "the Pandemonium".
 *   Your side           the islanders were neither British nor French subjects: officially
 *                       stateless. A child went to the English (Presbyterian, Anglican) or the
 *                       French (Catholic) mission school, and that was the side of the condominium
 *                       they lived under from then on: its courts, its police, its honours. A
 *                       Briton or a Frenchman posted out was on their own country's side.
 *   Independence        Vanuatu, 1980; the Santo rebellion ("the Coconut War") on the eve of it;
 *                       and the anglophone–francophone divide in its politics for decades after.
 *
 * state.condominium = { [cc]: 'GB' | 'FR', seen: { [cc]: true } }
 */
import { colonyHere, rulerAdj } from './Eras.js';

const cc = (state) => state.character.countryId ?? 'US';
const LANGUAGE = { GB: 'English', FR: 'French' };
const SCHOOL = { GB: 'the English mission school (Presbyterian)', FR: 'the French Catholic mission school' };
const cond = (state) => (state.condominium ??= { seen: {} });

/** The side of the condominium you're on, or null where you live under one ruler. */
export function sideHere(state) {
  const st = colonyHere(state);
  if (!st?.rulers || st.nominal) return null;
  return st.ruler;
}

export const CondominiumModule = {
  id: 'condominium',
  order: 36.6,
  onAgeUp(ctx) {
    const { state } = ctx;
    const st = colonyHere(state);
    if (!st?.rulers || st.nominal || !state.character.alive) return;
    const c = cond(state);
    const here = cc(state);
    if (!c.seen[here]) {
      c.seen[here] = true;
      ctx.log(`You live in ${st.name}: two Resident Commissioners, two police forces, two prisons, two hospitals, two school systems and two currencies, with a Joint Court between them. People call it "the Pandemonium". The islanders are neither British nor French subjects.`, '🏝️', 'info');
    }
    if (c[here]) return;
    // Posted out from London or Paris: your own country's side.
    const home = state.character.posting?.home?.countryId;
    if (st.rulers.includes(home)) { c[here] = home; return; }
    const age = state.character.age;
    if (age < 5) return;
    if (age === 5 && !state.prompts.some((p) => p.type === 'condominium.school')) {
      ctx.prompt({ type: 'condominium.school', icon: '🏫', title: 'Which school?', text: 'You\'re five. There are two schools within walking distance: the English mission school and the French one. Whichever you go to, you\'ll belong to that side of the condominium: its language, its courts, its police, its doctors.', options: st.rulers.map((r) => ({ id: r, label: `${r === 'GB' ? '🇬🇧' : '🇫🇷'} ${SCHOOL[r] ?? `the ${rulerAdj(r)} school`}`, hint: `${LANGUAGE[r] ?? rulerAdj(r)}-speaking: the ${rulerAdj(r)} administration` })), data: {} });
      return;
    }
    // Arrived older: the family's church decided it long ago.
    c[here] = state.community?.faith === 'catholic' && st.rulers.includes('FR') ? 'FR' : st.rulers[0];
  },
  resolvers: {
    school(ctx, data, optionId) {
      const { state } = ctx;
      const st = colonyHere(state);
      if (!st?.rulers?.includes(optionId)) return;
      cond(state)[cc(state)] = optionId;
      ctx.log(`You started at ${SCHOOL[optionId] ?? 'the mission school'}. You'll grow up ${LANGUAGE[optionId] ?? rulerAdj(optionId)}-speaking, on the ${rulerAdj(optionId)} side of the condominium.`, '🏫', 'info');
    },
  },
};
