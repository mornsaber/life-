/**
 * Privy councils and executive councils: the sovereign's (or the governor's) formal advisers,
 * appointed for life (or, in a colony, for as long as they serve).
 *
 *   The Privy Council (UK)   cabinet ministers, the prime minister, the first ministers, the
 *                            Speaker, senior royals, the archbishops, the realms' prime ministers
 *                            and governors-general. "The Rt Hon." for life.
 *   The King's Privy Council for Canada   every federal cabinet minister, the prime minister and
 *                            the governor general: "The Hon." for life, and the letters PC.
 *   A privy council of the realm   Jamaica and the other realms that have one.
 *   A colony's Executive Council   the governor's council: senior officials ex officio (the Chief
 *                            Secretary), and a few prominent local people as unofficial members.
 *                            "The Hon." while you serve; it ends with independence.
 *
 * state.privyCouncil = [{ council, name, since, until?, style, letters? }]
 */
import { Random } from '../../core/Random.js';
import { addHonor, currentYear, netWorth } from '../../core/State.js';
import { LEGISLATURES } from '../politics/NationalOffices.js';
import { colonyHere, rulerAdj, colonialHere } from './Eras.js';
import { COUNTRIES } from './Countries.js';
import { familyPrestige } from '../people/FamilyLegacy.js';

export const COUNCILS = {
  GB: { name: 'His Majesty\'s Most Honourable Privy Council', title: 'Privy Counsellor', style: 'The Rt Hon.' },
  CA: { name: 'the King\'s Privy Council for Canada', title: 'Member of the Privy Council for Canada', style: 'The Hon.', letters: 'PC' },
  JM: { name: 'the Privy Council of Jamaica', title: 'Member of the Privy Council of Jamaica', style: 'The Hon.', letters: 'PC' },
};
const REALMS_IN_UK_PC = ['CA', 'AU', 'NZ'];
const here = (state) => state.character.countryId ?? 'US';
const held = (state) => (state.privyCouncil ??= []);
const member = (state, council) => held(state).some((m) => m.council === council && m.until == null);

/** Which councils your position puts you on, with why. */
function dueFor(state) {
  const out = [];
  const cc = here(state);
  const o = state.politics?.office;
  const ministry = state.politics?.ministry;
  const head = o && o.id === LEGISLATURES[cc]?.execOffice;
  const gg = o && /_gg$/.test(o.id);
  if (cc === 'GB' && (head || ministry?.rank === 'cabinet' || /speaker|firstMinister|leaderOpposition/i.test(o?.id ?? ''))) out.push(['GB', head ? 'as prime minister' : 'on joining the cabinet']);
  if (cc === 'GB' && state.royal && state.character.age >= 21 && ['heir', 'child'].includes(state.royal.level)) out.push(['GB', 'as a senior member of the royal family']);
  if (cc === 'GB' && state.community?.orders?.grade === 'bishop' && /anglican/i.test(state.community.orders.tradition ?? '')) out.push(['GB', 'as an archbishop']);
  if (REALMS_IN_UK_PC.includes(cc) && (head || gg)) out.push(['GB', head ? 'as a prime minister of one of the realms' : 'as governor-general']);
  if (cc === 'CA' && (head || gg || ministry?.rank === 'cabinet')) out.push(['CA', head ? 'as prime minister' : gg ? 'as governor general' : 'on joining the federal cabinet']);
  if (cc === 'JM' && (head || ministry?.rank === 'cabinet')) out.push(['JM', 'on appointment to the government']);
  return out;
}

export const PrivyCouncilModule = {
  id: 'privyCouncil',
  order: 34.4,
  onAgeUp(ctx) {
    const { state } = ctx;
    const year = currentYear(state);
    for (const [council, why] of dueFor(state)) {
      if (held(state).some((m) => m.council === council)) continue;
      const c = COUNCILS[council];
      held(state).push({ council, name: c.name, since: year, style: c.style, letters: c.letters ?? null });
      addHonor(state, { id: `pc.${council}`, source: 'civil', country: council, name: c.title, icon: '📜', prestige: 7, precedence: 8, citation: `Sworn of ${c.name} ${why}.` });
      ctx.log(`You were sworn of ${c.name} ${why}, kneeling on a stool before the sovereign to kiss hands. You are ${c.style} for life.`, '📜', 'honor');
    }
    colonyCouncil(ctx);
  },
};

/** The governor's Executive Council in a colony: officials ex officio, a few notable locals. */
function colonyCouncil(ctx) {
  const { state } = ctx;
  const cc = here(state);
  const st = colonialHere(state);
  const seat = held(state).find((m) => m.council === `exco.${cc}` && m.until == null);
  if (seat && !st) {
    seat.until = currentYear(state);
    return void ctx.log(`The Executive Council of ${seat.colony} was dissolved at independence. You are no longer "The Hon."`, '📜', 'info');
  }
  if (!st || seat || state.character.age < 35) return;
  const job = state.career?.job;
  const official = job?.professionId === 'colonialService' && (job.grade ?? 0) >= 7;
  const notable = state.character.age >= 40 && (familyPrestige(state) >= 35 || netWorth(state) >= 1_000_000 || (state.honors?.length ?? 0) >= 2);
  if (!official && !notable) return;
  const rng = new Random(((state.world?.seed ?? 1) * 5051 + state.character.age * 97 + 0x9c) >>> 0);
  if (!official && !rng.chance(0.15)) return;
  held(state).push({ council: `exco.${cc}`, name: `the Executive Council of ${st.name}`, colony: st.name, since: currentYear(state), style: 'The Hon.' });
  ctx.log(official
    ? `As a senior officer of the ${rulerAdj(st.ruler)} administration you sit ex officio on the Executive Council of ${st.name}, around the Governor's table.`
    : `The Governor has appointed you an unofficial member of the Executive Council of ${st.name}: one of the few ${COUNTRIES[cc]?.demonym ?? 'local'} voices at his table. You are "The Hon." while you serve.`, '📜', 'honor');
}

/** Your style from councils: "The Rt Hon." for a Privy Counsellor; "The Hon." for Canada, Jamaica, an Executive Council. */
export function councilStyle(state) {
  const m = (state.privyCouncil ?? []).filter((x) => x.until == null);
  if (!m.length) return null;
  const best = m.find((x) => x.style === 'The Rt Hon.') ?? m[0];
  return { prefix: best.style, why: best.name };
}
/** Letters after the name: PC (Canada, Jamaica). */
export const councilLetters = (state) => (state.privyCouncil ?? []).filter((x) => x.letters && x.until == null).map((x) => x.letters)[0] ?? null;
