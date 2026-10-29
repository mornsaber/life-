/**
 * Styles of address that come with office, as each country uses them:
 *
 *   The Right Honourable   for life: a Canadian or New Zealand prime minister or governor-general, a British
 *                          prime minister or first minister (Privy Counsellors)
 *   The Honourable         Canada: senators and lieutenant governors (for life), premiers (in office);
 *                          Australia: members of parliament, senators and premiers (in office), a prime
 *                          minister or governor-general (for life); judges of the higher courts
 *   The Honorable          the United States: elected and appointed officials, judges and ambassadors —
 *                          kept by courtesy for life
 *   His/Her Excellency     heads of state and government, governors-general and governors, and ambassadors,
 *                          while they serve
 *
 * And the letters after a legislator's name while they sit: MP, MSP, MS, MLA, MPP, TD.
 * A peer's or royal's own style takes precedence (Honours.styledName).
 */
import { OFFICES } from '../politics/Offices.js';

const g = (state) => (state.character.gender === 'female' ? 'Her' : 'His');
const RT_HON = 'The Rt Hon.';
const HON = 'The Hon.';
const US_HON = 'The Honorable';
/** For life, once held. */
const FOR_LIFE = {
  GB: { gb_pm: RT_HON, gb_firstMinister: RT_HON },
  CA: { ca_pm: RT_HON, ca_gg: RT_HON, ca_lg: HON },
  NZ: { nz_pm: RT_HON, nz_gg: RT_HON },
  AU: { au_pm: HON, au_gg: HON, au_premier: HON },
  US: Object.fromEntries(['governor', 'usSenator', 'usRep', 'stateSenator', 'stateRep', 'mayor', 'judge', 'cabinetSecretary', 'vicePresident', 'president', 'districtAttorney', 'sheriff', 'countyCommissioner', 'cityCouncil'].map((id) => [id, US_HON])),
};
/** While in office. */
const IN_OFFICE = {
  IT: { it_deputato: 'On.', it_senatore: 'Sen.' },
  ...Object.fromEntries(['NG', 'KE', 'GH', 'ZA', 'MW', 'GM', 'UG', 'ZM'].map((cc) => [cc, { [`${cc.toLowerCase()}_mp`]: HON, [`${cc.toLowerCase()}_senator`]: HON }])),
  CA: { ca_premier: HON },
  AU: { au_mp: HON, au_senator: HON, au_mlaState: HON, au_premier: HON },
};
/** Letters after a sitting legislator's name. */
const LETTERS = { de_mdb: 'MdB', de_mdl: 'MdL', gb_mp: 'MP', gb_msp: 'MSP', gb_ms: 'MS', gb_mla: 'MLA', ca_mp: 'MP', ca_mpp: 'MPP', au_mp: 'MP', nz_mp: 'MP', ie_td: 'TD', in_mp: 'MP', in_mla: 'MLA', au_mlaState: 'MLA', ie_mep: 'MEP' };
const RANK = { [RT_HON]: 3, [HON]: 2, [US_HON]: 2, 'On.': 1, 'Sen.': 1 };

const countryOfOffice = (id) => OFFICES[id]?.country ?? 'US';
const pastOffices = (state) => (state.politics?.history ?? []).map((h) => h.officeId).filter((id) => OFFICES[id]);

/** Your style of address: { prefix, why, excellency } or null. */
export function officialStyle(state) {
  if (state.royal || state.character.peerage) return null;
  const o = state.politics?.office;
  const now = o?.id && OFFICES[o.id] ? o.id : null;
  const cands = [];
  const add = (prefix, why) => prefix && cands.push({ prefix, why });
  for (const id of [now, ...pastOffices(state)].filter(Boolean)) add(FOR_LIFE[countryOfOffice(id)]?.[id], `${id === now ? '' : 'former '}${OFFICES[id].name}`);
  if (now) add(IN_OFFICE[countryOfOffice(now)]?.[now], OFFICES[now].name);
  // Judges of the higher courts.
  const seat = state.judiciary?.seat;
  if (seat) add((state.character.countryId ?? 'US') === 'US' ? US_HON : ['GB', 'CA', 'AU', 'NZ', 'IE'].includes(state.character.countryId) ? HON : null, 'a judge');
  // An ambassador, while posted (and an American one, for life).
  const job = state.career.job;
  const ambassador = (j) => /Ambassador|High Commissioner/.test(j?.title ?? '') && /foreignService/.test(j?.professionId ?? '');
  if ((state.character.countryId ?? 'US') === 'US' && (ambassador(job) || (state.career.history ?? []).some(ambassador))) add(US_HON, 'an ambassador');
  const best = cands.sort((a, b) => (RANK[b.prefix] ?? 0) - (RANK[a.prefix] ?? 0))[0] ?? null;
  // His/Her Excellency, while serving as a head of state or government, a governor-general or governor, or an ambassador.
  const def = now ? OFFICES[now] : null;
  const westminster = ['GB', 'CA', 'AU', 'NZ', 'IE', 'IN'].includes(countryOfOffice(now ?? ''));
  const excellency = (def && (def.headOfState || def.ceremonial || /_gg$|governor|president/i.test(now) || (def.leader && def.executive && !westminster))) || ambassador(job);
  if (!best && !excellency) return null;
  return { prefix: best?.prefix ?? null, why: best?.why ?? null, excellency: excellency ? `${g(state)} Excellency` : null };
}

/** Letters after the name from a seat you hold. */
const COMMONWEALTH = ['GB', 'CA', 'AU', 'NZ', 'IN', 'SG', 'MY', 'NG', 'KE', 'ZA', 'GH', 'MT', 'CY', 'PK', 'GM', 'MW', 'MZ', 'PG', 'SB', 'VU', 'BN', 'JM', 'TT', 'UG', 'ZM', 'BS', 'BD', 'LK', 'TO'];
export const officeLetters = (state) => {
  const id = state.politics?.office?.id;
  if (!id || !OFFICES[id]) return null;
  if (LETTERS[id]) return LETTERS[id];
  if (/_mep$/.test(id)) return 'MEP';
  // Parliaments in the Westminster tradition: Members of Parliament, of the provincial assembly.
  if (!COMMONWEALTH.includes(countryOfOffice(id))) return null;
  if (/_mp$/.test(id)) return 'MP';
  if (/_mpa$/.test(id)) return countryOfOffice(id) === 'PK' ? 'MPA' : 'MLA';
  if (/_mla$/.test(id)) return 'MLA';
  if (/_mpl$/.test(id)) return 'MPL';
  if (/_mca$/.test(id)) return 'MCA';
  return null;
};

/** "His Excellency the Rt Hon. Jane Smith", "The Honorable John Smith". */
export function withOfficialStyle(state, name) {
  const s = officialStyle(state);
  if (!s) return name;
  if (name.startsWith('The Hon.')) name = name.replace(/^The Hon\. /, '');
  const prefix = s.prefix ? (s.excellency ? s.prefix.replace(/^The /, 'the ') : s.prefix) : '';
  return [s.excellency, prefix, name].filter(Boolean).join(' ');
}
