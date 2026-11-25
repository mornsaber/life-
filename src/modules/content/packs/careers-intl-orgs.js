/**
 * Careers in international organisations. You apply from anywhere; the job
 * moves you to a duty station abroad (world/IntlOrgs.js), and staff rotate
 * between stations every few years.
 *
 * Real-world rules worth knowing:
 *   - The UN Secretariat recruits juniors through the Young Professionals
 *     Programme (32 and under, a degree, a competitive exam). Others join at
 *     P-3 and above with years of relevant experience. The grades run
 *     P-2 to P-5, D-1 and D-2, then Assistant Secretary-General.
 *     Under-Secretaries-General and the Secretary-General are appointed
 *     (world/IntlOrgs.js offers them).
 *   - The EU institutions hire their permanent officials (AD grades) through
 *     EPSO open competitions. Only EU citizens may apply, and a few per cent
 *     of candidates pass. Commissioners are nominated by their governments.
 *   - NATO's International Staff is open only to citizens of NATO members.
 *   - The World Bank and IMF run their own Young Professionals Programs.
 *     Their grades run GE to GJ, then Vice President.
 *   - The ICRC sends delegates to conflict zones. The Order of Malta's
 *     relief agency, Malteser International, works in disasters and wars.
 *   - Salaries in most of these organisations are exempt from national
 *     income tax; the organisations levy an internal staff assessment
 *     instead. US citizens at the UN still pay US tax.
 */
import { L } from '../../career/Ladder.js';
import { citizenshipsOf } from '../../world/Countries.js';
import { eraYear } from '../../world/Eras.js';
import { sovereignIn } from '../../world/HistoricalData.js';
import { euMemberIn } from '../../world/EuMembership.js';
import { newStateMember } from '../../world/NewStates.js';

/** EU and NATO members (citizenship gates). */
/** Every country that has been in the EEC/EU (Britain 1973–2020); memberIn() says who was in, when. */
export const EU_MEMBERS = ['AT', 'BE', 'CY', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LV', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'BG', 'CZ', 'HU', 'GB'];
/** The Schengen area (no Britain, Ireland or Cyprus; Romania and Bulgaria from 2025). */
export const SCHENGEN_MEMBERS = ['AT', 'BE', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IT', 'LT', 'LV', 'LU', 'MT', 'NL', 'PL', 'PT', 'SE', 'SI', 'SK', 'CZ', 'HU', 'RO', 'BG', 'CH', 'NO', 'IS', 'LI'];

export const NATO_MEMBERS = ['US', 'CA', 'GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'DK', 'NO', 'PL', 'RO', 'TR', 'EE', 'LV', 'LT', 'SE', 'FI', 'CZ', 'HU', 'PT', 'GR', 'SK', 'SI', 'HR', 'BG', 'AL', 'ME', 'MK', 'IS', 'LU'];

/** When each country joined: the EEC/EU (1958 for the six) and NATO (1949 for the founders). */
export const EU_JOINED = { BE: 1958, DE: 1958, FR: 1958, IT: 1958, LU: 1958, NL: 1958, DK: 1973, IE: 1973, GR: 1981, ES: 1986, PT: 1986, AT: 1995, FI: 1995, SE: 1995, CY: 2004, CZ: 2004, EE: 2004, HU: 2004, LV: 2004, LT: 2004, MT: 2004, PL: 2004, SK: 2004, SI: 2004, BG: 2007, RO: 2007, HR: 2013 };
export const NATO_JOINED = { US: 1949, CA: 1949, GB: 1949, FR: 1949, IT: 1949, NL: 1949, BE: 1949, DK: 1949, NO: 1949, PT: 1949, IS: 1949, LU: 1949, GR: 1952, TR: 1952, DE: 1955, ES: 1982, CZ: 1999, HU: 1999, PL: 1999, BG: 2004, EE: 2004, LV: 2004, LT: 2004, RO: 2004, SK: 2004, SI: 2004, AL: 2009, HR: 2009, ME: 2017, MK: 2020, FI: 2023, SE: 2024 };
/**
 * Members of the other international bodies, with the year each joined (or the years it was in).
 * A country counts only while it was an independent state.
 */
const span = (from, until = null) => [from, until];
export const ORG_MEMBERS = {
  // The OEEC (1948) became the OECD in 1961, when the United States and Canada joined.
  oecd: { AT: 1948, BE: 1948, DK: 1948, FR: 1948, GR: 1948, IS: 1948, IE: 1948, IT: 1948, LU: 1948, NL: 1948, NO: 1948, PT: 1948, SE: 1948, CH: 1948, TR: 1948, GB: 1948, DE: 1949, ES: 1959, US: 1961, CA: 1961, JP: 1964, FI: 1969, AU: 1971, NZ: 1973, MX: 1994, CZ: 1995, HU: 1996, PL: 1996, KR: 1996, SK: 2000, CL: 2010, SI: 2010, IL: 2010, EE: 2010, LV: 2016, LT: 2018, CO: 2020, CR: 2021 },
  // The Commonwealth Secretariat (1965): Ireland left in 1949, South Africa was out 1961–94, Pakistan 1972–89, Zimbabwe after 2003.
  commonwealth: { GB: 1931, CA: 1931, AU: 1931, NZ: 1931, ZA: [span(1931, 1961), span(1994)], IE: span(1931, 1949), IN: 1947, PK: [span(1947, 1972), span(1989)], LK: 1948, GH: 1957, MY: 1957, NG: 1960, CY: 1961, SL: 1961, TZ: 1961, JM: 1962, TT: 1962, UG: 1962, KE: 1963, MW: 1964, MT: 1964, ZM: 1964, GM: [span(1965, 2013), span(2018)], SG: 1965, GY: 1966, BW: 1966, LS: 1966, BB: 1966, MU: 1968, SZ: 1968, NR: 1968, TO: 1970, WS: 1970, FJ: 1970, BD: 1972, BS: 1973, GD: 1974, PG: 1975, SC: 1976, SB: 1978, TV: 1978, DM: 1978, KI: 1979, LC: 1979, VC: 1979, VU: 1980, ZW: span(1980, 2003), BZ: 1981, AG: 1981, MV: [span(1982, 2016), span(2020)], KN: 1983, BN: 1984, NA: 1990, CM: 1995, MZ: 1995, RW: 2009, GA: 2022, TG: 2022 },
  // The Organisation of African Unity (1963) became the African Union in 2002; Morocco left the OAU in 1984 and rejoined in 2017.
  au: { DZ: 1963, BI: 1963, CM: 1963, CF: 1963, TD: 1963, CG: 1963, CD: 1963, BJ: 1963, ET: 1963, GA: 1963, GH: 1963, GN: 1963, CI: 1963, LR: 1963, LY: 1963, MG: 1963, ML: 1963, MR: 1963, MA: [span(1963, 1984), span(2017)], NE: 1963, NG: 1963, RW: 1963, SN: 1963, SL: 1963, SO: 1963, SD: 1963, TZ: 1963, TG: 1963, TN: 1963, UG: 1963, BF: 1963, EG: 1963, KE: 1963, MW: 1964, ZM: 1964, GM: 1965, BW: 1966, LS: 1966, MU: 1968, SZ: 1968, GQ: 1968, GW: 1973, AO: 1975, CV: 1975, KM: 1975, MZ: 1975, ST: 1975, SC: 1976, DJ: 1977, ZW: 1980, NA: 1990, ER: 1993, ZA: 1994, SS: 2011 },
  asean: { ID: 1967, MY: 1967, PH: 1967, SG: 1967, TH: 1967, BN: 1984, VN: 1995, LA: 1997, MM: 1997, KH: 1999, TL: 2025 },
  // The Pan American Union (1890) became the OAS in 1948; Cuba took no part from 1962.
  oas: { US: 1890, MX: 1890, GT: 1890, HN: 1890, SV: 1890, NI: 1890, CR: 1890, PA: 1903, CU: span(1902, 1962), HT: 1890, DO: 1890, CO: 1890, VE: 1890, EC: 1890, PE: 1890, BO: 1890, CL: 1890, AR: 1890, UY: 1890, PY: 1890, BR: 1890, TT: 1967, BB: 1967, JM: 1969, GD: 1975, SR: 1977, DM: 1979, LC: 1979, AG: 1981, VC: 1981, BS: 1982, KN: 1984, CA: 1990, BZ: 1991, GY: 1991 },
  // The Council of Europe (1949); Russia was expelled in 2022.
  coe: { BE: 1949, DK: 1949, FR: 1949, IE: 1949, IT: 1949, LU: 1949, NL: 1949, NO: 1949, SE: 1949, GB: 1949, GR: 1949, TR: 1949, IS: 1950, DE: 1950, AT: 1956, CY: 1961, CH: 1963, MT: 1965, PT: 1976, ES: 1977, LI: 1978, SM: 1988, FI: 1989, HU: 1990, PL: 1991, BG: 1992, EE: 1993, LT: 1993, SI: 1993, CZ: 1993, SK: 1993, RO: 1993, AD: 1994, LV: 1995, AL: 1995, MD: 1995, UA: 1995, MK: 1995, RU: span(1996, 2022), HR: 1996, GE: 1999, AM: 2001, AZ: 2001, BA: 2002, RS: 2003, MC: 2004, ME: 2007 },
};
/** Was this country a member of that body (ORG_MEMBERS) in the year being played? */
export function orgMember(org, cc, y = eraYear()) {
  const v = ORG_MEMBERS[org]?.[cc];
  if (v == null) return newStateMember(org, cc, y);
  const spans = typeof v === 'number' ? [[v, null]] : Array.isArray(v[0]) ? v : [v];
  return spans.some(([from, until]) => y >= from && (until == null || y < until)) && sovereignIn(cc, y);
}
export const citizenOf = (state, org) => citizenshipsOf(state).some((c) => orgMember(org, c));

/** Was this country a member in the year being played? */
export const memberIn = (list, cc, y = eraYear()) => (list === EU_MEMBERS ? euMemberIn(cc, y) : list.includes(cc) && !(((list === NATO_MEMBERS ? NATO_JOINED : {})[cc] ?? 0) > y));
export const citizenOfAny = (state, list) => citizenshipsOf(state).some((c) => memberIn(list, c));

export const passed = (state, comp) => Boolean(state.intlOrgs?.competitions?.[comp]?.passed);

export const yearsIn = (state, ids) => (state.career.history ?? []).filter((h) => ids.includes(h.professionId)).reduce((s, h) => s + Math.max(0, (h.endAge ?? 0) - (h.startAge ?? 0)), 0) + (ids.includes(state.career.job?.professionId) ? state.career.job.yearsAtEmployer ?? 0 : 0);

export const RELEVANT = ['foreignService', 'law', 'finance', 'publicHealth', 'medical', 'research', 'university', 'nonprofit', 'regulatory', 'municipalAdmin', 'legislativeStaff', 'economics', 'journalism', 'socialWork', 'emergencyManagement', 'intelligence', 'interpreter'];

export const INTL_IDS = ['unSecretariat', 'unAgencies', 'euInstitutions', 'nato', 'intlFinance', 'intlJustice', 'icrc', 'maltaRelief', 'maltaDiplomacy', 'holySeeDiplomacy', 'romanCuria', 'oecd', 'wto', 'interpol', 'commonwealthSec', 'africanUnion', 'aseanSec', 'oas', 'councilOfEurope'];

/** Lateral entry: years of relevant work, at home or in another organisation. */
export const intlExperience = (state) => yearsIn(state, [...RELEVANT, ...INTL_IDS]);

export const isCatholic = (state) => ['catholic', 'tradCatholic'].includes(state.community?.faith?.traditionId);

export const married = (state) => (state.people?.list ?? []).some((p) => p.alive !== false && p.relation === 'spouse');

export const served = (state) => Boolean(state.military?.service || state.military?.history?.length || ['served', 'serving'].includes(state.military?.conscription?.status));

/** An ordained Catholic priest: a parochial vicar or above, now or before. */
export const ordainedPriest = (state) => {
  // Holy orders are a status (HolyOrders.js); laicization ends them.
  const o = state.community?.orders;
  if (o) return !o.laicized && ['catholic', 'tradCatholic'].includes(o.tradition) && ['priest', 'bishop'].includes(o.grade);
  return legacyPriest(state);
};

export const legacyPriest = (state) => [state.career.job, ...(state.career.history ?? [])].some((j) => j?.professionId === 'catholicClergy' && (j.peakGrade ?? j.grade ?? 0) >= 3) || ['holySeeDiplomacy'].includes(state.career.job?.professionId);

/**
 * The Pontifical Swiss Guard: Swiss Catholic men, 19 to 30, at least 1.74 m, unmarried on entry,
 * with a vocational diploma or the Matura and Swiss Army basic training. Recruits swear the oath
 * on 6 May and serve at least 26 months; guards may marry after three years' service, as corporals
 * and from 25.
 */
export function swissGuardCheck(state) {
  const c = state.character;
  if (!citizenshipsOf(state).includes('CH')) return { ok: false, reason: 'Swiss citizens only' };
  if (!isCatholic(state)) return { ok: false, reason: 'Practising Catholics only' };
  if (c.gender !== 'male') return { ok: false, reason: 'Men only' };
  if (c.age < 19 || c.age > 30) return { ok: false, reason: 'Recruits are 19 to 30' };
  if (married(state)) return { ok: false, reason: 'Unmarried on entry' };
  if (!served(state)) return { ok: false, reason: 'Complete Swiss Army basic training (Rekrutenschule) first' };
  return { ok: true };
}

const INTL = { sizes: { enterprise: 1 }, minAge: 21, intl: true, layoffRate: 0.004, union: { chance: 0.9, name: 'Staff Union', strike: false } };

const careers = {
  unSecretariat: {
    ...INTL, id: 'unSecretariat', name: 'United Nations Secretariat', icon: '🇺🇳', sector: 'private', payMultiplier: 1.3, background: 'strict',
    employers: ['United Nations Secretariat (New York)', 'United Nations Office at Geneva', 'UN peace operations (Department of Peace Operations)', 'United Nations Office at Vienna', 'United Nations Office at Nairobi', 'Office for the Coordination of Humanitarian Affairs (OCHA)', 'Office of the High Commissioner for Human Rights (OHCHR)', 'UN Economic and Social Commission for Asia and the Pacific (ESCAP)', 'UN Economic Commission for Africa (ECA)'],
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => {
      if (state.character.age <= 32 && passed(state, 'ypp')) return { ok: true };
      if (intlExperience(state) >= 7 && state.education.degrees.some((d) => ['master', 'doctorate', 'professional'].includes(d.type))) return { ok: true };
      return { ok: false, reason: state.character.age <= 32 ? 'Pass the UN Young Professionals Programme exam (or 7 years\' relevant experience and a master\'s)' : 'Lateral entry needs 7 years\' relevant experience and a master\'s' };
    },
    valued: ['languageProficiency'],
    ladder: [
      ['p2', 'Associate Officer (P-2)', 5, { years: 2 }],
      ['p3', 'Officer (P-3)', 6, { entry: true, years: 3, req: { workYears: 5, education: { level: 'master' } } }],
      ['p4', 'Senior Officer (P-4)', 7, { years: 4, abilities: ['diplomatic'] }],
      ['p5', 'Chief of Section (P-5)', 8, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'hire'], reports: 15 }],
      ['p5s', 'Senior Political Affairs Officer (P-5)', 8, { track: 'ic', abilities: ['diplomatic'] }],
      ['d1', 'Director (D-1)', 9, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'hire', 'budget'], reports: 60 }],
      ['d2', 'Director (D-2)', 9, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'hire', 'budget', 'delegate'], reports: 200 }],
      ['asg', 'Assistant Secretary-General', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['diplomatic', 'supervise', 'budget', 'delegate', 'policy'], reports: 600 }],
      // Above the career grades: appointed, in order (world/IntlOrgs.js offers them).
      ['usg', 'Under-Secretary-General', 11, { track: 'mgmt', minSize: 'enterprise', appointed: true, appointedBy: 'the Secretary-General', abilities: ['diplomatic', 'supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 1500 }],
      ['dsg', 'Deputy Secretary-General', 12, { track: 'mgmt', minSize: 'enterprise', appointed: true, appointedBy: 'the Secretary-General, after consulting the member states', abilities: ['diplomatic', 'supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 5000 }],
      ['sg', 'Secretary-General', 13, { track: 'mgmt', minSize: 'enterprise', appointed: true, appointedBy: 'the General Assembly, on the Security Council\'s recommendation', abilities: ['diplomatic', 'supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 37000 }],
    ],
  },
  unAgencies: {
    ...INTL, id: 'unAgencies', name: 'UN Agencies, Funds & Programmes', icon: '🌍', sector: 'private', payMultiplier: 1.22, background: 'standard',
    employers: ['UNICEF', 'UNHCR (the UN Refugee Agency)', 'World Food Programme', 'World Health Organization', 'UNDP', 'UNESCO', 'Food and Agriculture Organization', 'International Labour Organization', 'International Atomic Energy Agency'],
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (state.character.age <= 32 || intlExperience(state) >= 5 ? { ok: true } : { ok: false, reason: 'Junior Professional Officers are 32 and under; later, 5 years\' relevant experience' }),
    ladder: [
      ['jpo', 'Junior Professional Officer', 4, { years: 2 }],
      ['associate', 'Associate Programme Officer (P-2)', 5],
      ['programme', 'Programme Officer (P-3)', 6, { years: 3 }],
      ['specialist', 'Programme Specialist (P-4)', 7, { track: 'ic', abilities: ['diplomatic'] }],
      ['senior', 'Senior Adviser (P-5)', 8, { track: 'ic' }],
      ['principal', 'Principal Adviser (D-1)', 9, { track: 'ic', minSize: 'large' }],
      ['deputyRep', 'Deputy Representative (P-5)', 8, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'hire'], reports: 40 }],
      ['rep', 'Country Representative (D-1)', 9, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'hire', 'budget'], reports: 150 }],
      ['regional', 'Regional Director (D-2)', 10, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'budget', 'delegate'], reports: 800 }],
      ['asg', 'Assistant Secretary-General', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 3000 }],
    ],
  },
  euInstitutions: {
    ...INTL, id: 'euInstitutions', name: 'EU Institutions (European Civil Service)', icon: '🇪🇺', sector: 'private', payMultiplier: 1.35, background: 'standard',
    employers: ['European Commission', 'European External Action Service', 'European Parliament (Secretariat)', 'Council of the European Union (General Secretariat)', 'European Central Bank', 'Court of Justice of the European Union', 'European Investment Bank', 'European Court of Auditors', 'Europol', 'Frontex (European Border and Coast Guard Agency)', 'European Medicines Agency', 'European Economic and Social Committee'],
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => {
      if (!citizenOfAny(state, EU_MEMBERS)) return { ok: false, reason: 'EU citizens only' };
      if (!passed(state, 'epso')) return { ok: false, reason: 'Pass an EPSO open competition (concours) first' };
      return { ok: true };
    },
    ladder: [
      ['trainee', 'Blue Book Trainee (stagiaire)', 3, { years: 1 }],
      ['ad5', 'Administrator (AD5)', 6, { entry: true, years: 3 }],
      ['ad7', 'Administrator (AD7)', 7, { years: 4 }],
      ['ad8', 'Administrator (AD8)', 7],
      ['ad9', 'Policy Officer (AD9)', 8, { track: 'ic' }],
      ['ad11', 'Principal Administrator (AD11)', 8, { track: 'ic' }],
      ['adviser', 'Adviser (AD13)', 9, { track: 'ic' }],
      ['delegation', 'Head of EU Delegation (Ambassador)', 9, { track: 'ic', abilities: ['diplomatic'] }],
      ['hou', 'Head of Unit (AD9–AD12)', 8, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 25 }],
      ['director', 'Director (AD14)', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 200 }],
      ['deputyDg', 'Deputy Director-General', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 1200 }],
      ['dg', 'Director-General (AD15–AD16)', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 1500 }],
      ['secGen', 'Secretary-General of the European Commission', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 3000 }],
      // The College: appointed, not promoted into (world/IntlOrgs.js offers the posts).
      ['commissioner', 'European Commissioner', 11, { track: 'mgmt', appointed: true, appointedBy: 'your government, with the European Parliament\'s consent', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic'], reports: 2000 }],
      ['evp', 'Executive Vice-President of the European Commission', 12, { track: 'mgmt', appointed: true, appointedBy: 'the President of the Commission', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic', 'exec'], reports: 5000 }],
      ['president', 'President of the European Commission', 13, { track: 'mgmt', appointed: true, appointedBy: 'the European Council, elected by the European Parliament', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic', 'exec'], reports: 32000 }],
    ],
  },
  nato: {
    ...INTL, id: 'nato', name: 'NATO International Staff', icon: '🛡️', sector: 'private', payMultiplier: 1.28, background: 'strict',
    employers: ['NATO Headquarters (International Staff)', 'NATO Communications and Information Agency', 'NATO Support and Procurement Agency', 'NATO Defense College', 'Supreme Headquarters Allied Powers Europe (SHAPE)', 'NATO Parliamentary Assembly (International Secretariat)'],
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (citizenOfAny(state, NATO_MEMBERS) ? { ok: true } : { ok: false, reason: 'Citizens of NATO member countries only' }),
    ladder: [
      ['a1', 'Assistant Officer (A1)', 5],
      ['a2', 'Officer (A2)', 6, { years: 3, abilities: ['classified'] }],
      ['a3', 'Senior Officer (A3)', 7, { abilities: ['classified'] }],
      ['a4', 'Head of Section (A4)', 8, { track: 'mgmt', abilities: ['classified', 'supervise', 'hire'], reports: 15 }],
      ['a5', 'Head of Branch (A5)', 8, { track: 'ic', abilities: ['classified', 'policy'] }],
      ['a6', 'Director (A6)', 9, { track: 'mgmt', abilities: ['classified', 'supervise', 'budget', 'delegate'], reports: 120 }],
      ['dasg', 'Deputy Assistant Secretary General', 9, { track: 'mgmt', abilities: ['classified', 'diplomatic', 'supervise', 'budget', 'delegate'], reports: 250 }],
      ['asg', 'Assistant Secretary General', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['classified', 'diplomatic', 'supervise', 'budget', 'delegate', 'policy'], reports: 500 }],
      ['dsg', 'Deputy Secretary General', 11, { track: 'mgmt', minSize: 'enterprise', appointed: true, appointedBy: 'the Secretary General, with the Allies\' agreement', abilities: ['classified', 'supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 2000 }],
      ['sg', 'Secretary General', 12, { track: 'mgmt', minSize: 'enterprise', appointed: true, appointedBy: 'the North Atlantic Council, by consensus', abilities: ['classified', 'diplomatic', 'supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 6000 }],
    ],
  },
  intlFinance: {
    ...INTL, id: 'intlFinance', name: 'World Bank & IMF', icon: '🏦', sector: 'private', payMultiplier: 1.5, background: 'strict',
    employers: ['World Bank Group', 'International Monetary Fund'],
    entry: { education: { level: 'master' }, smarts: 60 },
    eligible: (state) => (passed(state, 'wbYpp') || intlExperience(state) >= 6 ? { ok: true } : { ok: false, reason: 'Pass the Young Professionals Program selection (or 6 years\' experience in finance or development)' }),
    ladder: [
      ['jpa', 'Junior Professional Associate (GD)', 5],
      ['analyst', 'Analyst (GE)', 6, { years: 2 }],
      ['economist', 'Economist (GF)', 7, { years: 3 }],
      ['senior', 'Senior Economist (GG)', 8, { track: 'ic' }],
      ['lead', 'Lead Economist (GH)', 9, { track: 'ic', abilities: ['policy'] }],
      ['adviser', 'Senior Adviser', 9, { track: 'ic' }],
      ['manager', 'Practice Manager / Division Chief (GI)', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 30 }],
      ['director', 'Director (GJ)', 10, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'diplomatic'], reports: 250 }],
      ['vp', 'Vice President', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic'], reports: 1500 }],
      ['dmd', 'Deputy Managing Director', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 5000 }],
    ],
  },
  intlJustice: {
    ...INTL, id: 'intlJustice', name: 'International Courts & Tribunals', icon: '⚖️', sector: 'private', payMultiplier: 1.3, background: 'strict',
    employers: ['International Criminal Court', 'International Court of Justice'],
    entry: { education: { program: 'jd' } },
    eligible: (state) => (yearsIn(state, ['law', 'prosecution', 'publicDefender', 'courts', 'intlJustice']) >= 3 || state.character.age <= 30 ? { ok: true } : { ok: false, reason: 'Needs 3 years practising law' }),
    ladder: [
      ['intern', 'Legal Intern', 3],
      ['associate', 'Associate Legal Officer (P-2)', 5, { years: 2, abilities: ['represent'] }],
      ['legal', 'Legal Officer (P-3)', 6, { abilities: ['represent'] }],
      ['trial', 'Trial Lawyer (P-4)', 7, { track: 'ic', abilities: ['represent'] }],
      ['senior', 'Senior Trial Lawyer (P-5)', 8, { track: 'ic', abilities: ['represent'] }],
      ['principal', 'Principal Trial Lawyer (D-1)', 9, { track: 'ic' }],
      ['chiefChambers', 'Chief of Chambers (P-5)', 8, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 12 }],
      ['chief', 'Chief of Prosecutions (D-1)', 10, { track: 'mgmt', abilities: ['represent', 'supervise', 'hire'], reports: 80 }],
      ['deputyProsecutor', 'Deputy Prosecutor', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports: 300 }],
    ],
  },
  icrc: {
    ...INTL, id: 'icrc', name: 'International Committee of the Red Cross', icon: '⛑️', sector: 'private', payMultiplier: 1.0, background: 'standard',
    employers: ['International Committee of the Red Cross'],
    union: null,
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (eraYear() < 1992 && !citizenshipsOf(state).includes('CH') ? { ok: false, reason: 'ICRC delegates were Swiss citizens only until 1992' } : state.character.age >= 25 ? { ok: true } : { ok: false, reason: 'Delegates are 25 or older, with work experience' }),
    ladder: [
      ['field', 'Field Officer', 4],
      ['delegate', 'Delegate', 5, { years: 2 }],
      ['senior', 'Senior Delegate', 6],
      ['protection', 'Protection Coordinator', 6, { track: 'ic' }],
      ['adviser', 'Thematic Adviser (Geneva)', 7, { track: 'ic' }],
      ['headDivision', 'Head of Division (Geneva)', 8, { track: 'ic' }],
      ['subdelegation', 'Head of Sub-Delegation', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 40 }],
      ['delegation', 'Head of Delegation', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'diplomatic'], reports: 300 }],
      ['regional', 'Regional Director', 9, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'diplomatic'], reports: 2500 }],
      ['director', 'Director of Operations', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 3000 }],
    ],
  },
  maltaRelief: {
    ...INTL, id: 'maltaRelief', name: 'Order of Malta — Malteser International', icon: '✠', sector: 'private', payMultiplier: 0.9, background: 'standard', minAge: 20,
    employers: ['Malteser International'],
    union: null,
    entry: { education: { level: 'highschool' } },
    ladder: [
      ['assistant', 'Project Assistant', 3, { years: 1 }],
      ['officer', 'Project Officer', 4],
      ['seniorOfficer', 'Senior Project Officer', 5],
      ['pm', 'Country Programme Manager', 6, { track: 'ic' }],
      ['adviser', 'Programme Adviser', 7, { track: 'ic' }],
      ['hom', 'Head of Mission', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }],
      ['deputyRegional', 'Deputy Regional Director', 7, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports: 120 }],
      ['regional', 'Regional Director', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports: 300 }],
      ['sg', 'Secretary General of Malteser International', 9, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 1000 }],
    ],
  },
  swissGuard: {
    ...INTL, id: 'swissGuard', name: 'Pontifical Swiss Guard', icon: '⚔️', sector: 'private', payMultiplier: 0.5, background: 'strict', minAge: 19,
    employers: ['Pontifical Swiss Guard'],
    union: null,
    entry: { education: { level: 'highschool' } },
    eligible: swissGuardCheck,
    ladder: [
      ['halberdier', 'Halberdier', 2, { years: 2 }],
      ['viceCorporal', 'Vice-Corporal', 3],
      ['corporal', 'Corporal', 4, { abilities: ['supervise'], reports: 6 }],
      ['sergeant', 'Sergeant', 5, { abilities: ['supervise'], reports: 15 }],
      ['sergeantMajor', 'Sergeant Major', 6, { track: 'ic' }],
      ['lieutenant', 'Lieutenant', 6, { track: 'mgmt', abilities: ['supervise'], reports: 30 }],
      ['captain', 'Captain', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 60 }],
      ['ltColonel', 'Lieutenant Colonel (Vice-Commandant)', 8, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 135 }],
      ['commandant', 'Colonel, Commandant of the Pontifical Swiss Guard', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'policy'], reports: 135 }],
    ],
  },
  vaticanGendarmerie: {
    ...INTL, id: 'vaticanGendarmerie', name: 'Vatican Gendarmerie', icon: '🚓', sector: 'private', payMultiplier: 0.7, background: 'strict', minAge: 20,
    // The Corps of Gendarmerie of Vatican City State: police, border, fire and close protection of
    // the Pope on journeys. Recruits are Catholic, mostly Italians with military or police service.
    employers: ['Gendarmerie Corps of Vatican City State'],
    union: null,
    entry: { education: { level: 'highschool' } },
    eligible: (state) => (!isCatholic(state) ? { ok: false, reason: 'Practising Catholics only' }
      : !citizenshipsOf(state).some((c) => ['IT', 'CH'].includes(c)) ? { ok: false, reason: 'Italian (or Swiss) citizens' }
        : !served(state) && !(state.career.history ?? []).some((h) => /police/i.test(h.professionId ?? '')) ? { ok: false, reason: 'Military or police service first' }
          : state.character.age > 35 ? { ok: false, reason: 'Recruits are 35 and under' } : { ok: true }),
    ladder: [
      ['gendarme', 'Gendarme', 3, { years: 2 }],
      ['seniorGendarme', 'Senior Gendarme', 3],
      ['viceBrigadier', 'Vice-Brigadier', 4],
      ['brigadier', 'Brigadier', 5, { abilities: ['supervise'], reports: 10 }],
      ['chiefBrigadier', 'Chief Brigadier', 5],
      ['inspector', 'Inspector', 6, { abilities: ['supervise'], reports: 25 }],
      ['viceCommissioner', 'Vice-Commissioner', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 60 }],
      ['commissioner', 'Commissioner', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 130 }],
      ['commandant', 'Inspector General, Commandant of the Gendarmerie', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'policy'], reports: 130 }],
    ],
  },
  holySeeDiplomacy: {
    ...INTL, id: 'holySeeDiplomacy', name: 'Diplomatic Service of the Holy See', icon: '🇻🇦', sector: 'private', payMultiplier: 0.5, background: 'strict', minAge: 26,
    // Priests chosen by their bishops study at the Pontifical Ecclesiastical Academy (canon law, a
    // doctorate, languages), then serve in nunciatures around the world. Nuncios are titular archbishops.
    employers: ['Secretariat of State — Diplomatic Service of the Holy See'],
    union: null,
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (!isCatholic(state) ? { ok: false, reason: 'Catholic priests only' }
      : !ordainedPriest(state) ? { ok: false, reason: 'Be ordained a priest first (Catholic Priesthood)' }
        : state.career.job?.professionId !== 'holySeeDiplomacy' && state.character.age > 40 ? { ok: false, reason: 'The Academy takes priests 40 and under' } : { ok: true }),
    ladder: [
      ['student', 'Student, Pontifical Ecclesiastical Academy', 4, { years: 2 }],
      ['secretary2', 'Secretary of Nunciature (second class)', 5, { years: 3, abilities: ['diplomatic'] }],
      ['secretary1', 'Secretary of Nunciature (first class)', 6, { abilities: ['diplomatic'] }],
      ['counsellor', 'Counsellor of Nunciature', 7, { abilities: ['diplomatic'] }],
      ['firstCounsellor', 'First Counsellor of Nunciature', 7],
      ['nuncio', 'Apostolic Nuncio (titular Archbishop)', 8, { track: 'ic', abilities: ['diplomatic'] }],
      ['seniorNuncio', 'Apostolic Nuncio to a Major Power', 9, { track: 'ic' }],
      ['relations', 'Secretary for Relations with States', 9, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'budget', 'policy'], reports: 60 }],
      ['secState', 'Cardinal Secretary of State', 10, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 400 }],
    ],
  },
  romanCuria: {
    ...INTL, id: 'romanCuria', name: 'Roman Curia', icon: '🇻🇦', sector: 'private', payMultiplier: 0.55, background: 'strict', minAge: 25,
    // The dicasteries that govern the Church with the Pope. Since 2022 lay people can lead them too.
    employers: ['Roman Curia'],
    union: null,
    entry: { education: { level: 'master' } },
    eligible: (state) => (isCatholic(state) ? { ok: true } : { ok: false, reason: 'Practising Catholics only' }),
    ladder: [
      ['scrittore', 'Scrittore (Clerk)', 4],
      ['official', 'Official (minutante) of a Dicastery', 5, { years: 2 }],
      ['seniorOfficial', 'Senior Official', 5],
      ['headOffice', 'Head of Office', 6, { abilities: ['supervise'], reports: 8 }],
      ['consultor', 'Consultor', 7, { track: 'ic' }],
      ['auditor', 'Prelate Auditor of the Roman Rota', 8, { track: 'ic' }],
      ['underSecretary', 'Under-Secretary of a Dicastery', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 30 }],
      ['adjunct', 'Adjunct Secretary', 8, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 60 }],
      ['secretary', 'Secretary of a Dicastery', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }],
      ['prefect', 'Prefect of a Dicastery', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'policy', 'exec'], reports: 120 }],
    ],
  },
  maltaDiplomacy: {
    ...INTL, id: 'maltaDiplomacy', name: 'Order of Malta — Diplomatic Service', icon: '✠', sector: 'private', payMultiplier: 0.95, background: 'strict', minAge: 25,
    employers: ['Grand Magistry of the Sovereign Order of Malta'],
    union: null,
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (state.malta?.grade ? { ok: true } : { ok: false, reason: isCatholic(state) ? 'Become a member of the Order of Malta first' : 'Members of the Order of Malta only (practising Catholics)' }),
    ladder: [
      ['attache', 'Attaché, Grand Magistry', 4, { years: 2 }],
      ['secretary', 'Secretary of Embassy', 5],
      ['counsellor', 'Counsellor', 6, { abilities: ['diplomatic'] }],
      ['minister', 'Minister Counsellor', 7, { abilities: ['diplomatic'] }],
      ['charge', 'Chargé d\'Affaires', 7],
      ['ambassador', 'Ambassador of the Order of Malta', 8, { track: 'ic', abilities: ['diplomatic'] }],
      ['seniorAmbassador', 'Ambassador to a Major Capital', 9, { track: 'ic' }],
      ['director', 'Director of Diplomatic Affairs', 8, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'budget'], reports: 40 }],
    ],
  },
  oecd: {
    ...INTL, id: 'oecd', name: 'OECD Secretariat', icon: '📊', sector: 'private', payMultiplier: 1.3, background: 'standard',
    employers: ['OECD Secretariat (Paris)', 'International Energy Agency', 'Nuclear Energy Agency'],
    entry: { education: { level: 'master' } },
    eligible: (state) => (citizenOf(state, 'oecd') ? { ok: true } : { ok: false, reason: 'Citizens of member countries only' }),
    ladder: [
      ['a1', 'Junior Policy Analyst (A1)', 5, { years: 2 }],
      ['a2', 'Economist (A2)', 6, { years: 3 }],
      ['a3', 'Senior Economist (A3)', 7],
      ['a4', 'Senior Counsellor (A4)', 8, { track: 'ic', abilities: ['policy'] }],
      ['hod', 'Head of Division (A5)', 8, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 30 }],
      ['deputyDir', 'Deputy Director (A6)', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 90 }],
      ['director', 'Director (A7)', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'diplomatic'], reports: 250 }],
      ['dsg', 'Deputy Secretary-General', 10, { track: 'mgmt', appointed: true, appointedBy: 'the Secretary-General', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic'], reports: 1000 }],
      ['sg', 'Secretary-General', 10, { track: 'mgmt', appointed: true, appointedBy: 'the Council of the member countries', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic', 'exec'], reports: 3300 }],
    ],
  },
  wto: {
    ...INTL, id: 'wto', name: 'World Trade Organization Secretariat', icon: '🚢', sector: 'private', payMultiplier: 1.35, background: 'standard',
    employers: ['World Trade Organization (Geneva)'],
    entry: { education: { level: 'master' } },
    eligible: (state) => (state.character.age <= 32 || intlExperience(state) >= 5 ? { ok: true } : { ok: false, reason: 'Young Professionals are 32 and under; later, 5 years in trade policy or law' }),
    ladder: [
      ['yp', 'Young Professional', 4, { years: 1 }],
      ['eao', 'Economic Affairs Officer', 6, { years: 3 }],
      ['seao', 'Senior Economic Affairs Officer', 7],
      ['counsellor', 'Counsellor', 8, { track: 'ic', abilities: ['policy'] }],
      ['appellate', 'Legal Officer, Appellate Body Secretariat', 8, { track: 'ic', abilities: ['represent'] }],
      ['director', 'Director of a Division', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }],
      ['ddg', 'Deputy Director-General', 10, { track: 'mgmt', appointed: true, appointedBy: 'the Director-General', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic'], reports: 300 }],
      ['dg', 'Director-General', 10, { track: 'mgmt', appointed: true, appointedBy: 'the General Council, by consensus', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic', 'exec'], reports: 620 }],
    ],
  },
  interpol: {
    ...INTL, id: 'interpol', name: 'INTERPOL General Secretariat', icon: '🌐', sector: 'private', payMultiplier: 1.15, background: 'strict',
    employers: ['INTERPOL General Secretariat (Lyon)', 'INTERPOL Global Complex for Innovation (Singapore)'],
    entry: { education: { level: 'highschool' } },
    // Police officers seconded by their forces; civilian analysts with a degree.
    eligible: (state) => (yearsIn(state, ['police', 'statePolice', 'sheriff', 'fbi', 'dea', 'usms', 'hsi', 'gendarmerie', 'colonialPolice', 'intelligence']) >= 5 || (intlExperience(state) >= 4 && state.education.degrees.some((d) => d.type !== 'highschool')) ? { ok: true } : { ok: false, reason: 'Five years as a police officer (seconded by your force), or a degree and four years in law enforcement analysis' }),
    ladder: [
      ['analyst', 'Criminal Intelligence Analyst', 5, { years: 2, abilities: ['classified'] }],
      ['specialised', 'Specialised Officer (seconded)', 6, { abilities: ['classified'] }],
      ['coordinator', 'Coordinator', 7, { abilities: ['classified'] }],
      ['seniorCoord', 'Senior Criminal Intelligence Officer', 8, { track: 'ic', abilities: ['classified'] }],
      ['asstDir', 'Assistant Director', 8, { track: 'mgmt', abilities: ['classified', 'supervise', 'hire'], reports: 25 }],
      ['director', 'Director', 9, { track: 'mgmt', abilities: ['classified', 'supervise', 'budget', 'delegate'], reports: 120 }],
      ['execDir', 'Executive Director', 10, { track: 'mgmt', abilities: ['classified', 'supervise', 'budget', 'delegate', 'policy'], reports: 400 }],
      ['sg', 'Secretary General', 10, { track: 'mgmt', appointed: true, appointedBy: 'the General Assembly, on the Executive Committee\'s proposal', abilities: ['classified', 'supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 1000 }],
    ],
  },
  commonwealthSec: {
    ...INTL, id: 'commonwealthSec', name: 'Commonwealth Secretariat', icon: '🌐', sector: 'private', payMultiplier: 1.1, background: 'standard',
    employers: ['Commonwealth Secretariat (Marlborough House, London)'],
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (citizenOf(state, 'commonwealth') ? { ok: true } : { ok: false, reason: 'Citizens of Commonwealth countries only' }),
    ladder: [
      ['officer', 'Programme Officer', 5, { years: 2 }],
      ['adviser', 'Adviser', 6, { years: 3 }],
      ['senior', 'Senior Adviser', 7, { abilities: ['diplomatic'] }],
      ['head', 'Head of Section', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'diplomatic'], reports: 15 }],
      ['director', 'Director', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'diplomatic'], reports: 60 }],
      ['dsg', 'Deputy Secretary-General', 10, { track: 'mgmt', appointed: true, appointedBy: 'the Secretary-General', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic'], reports: 150 }],
      ['sg', 'Commonwealth Secretary-General', 10, { track: 'mgmt', appointed: true, appointedBy: 'the Commonwealth Heads of Government', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic', 'exec'], reports: 300 }],
    ],
  },
  africanUnion: {
    ...INTL, id: 'africanUnion', name: 'African Union Commission', icon: '🌍', sector: 'private', payMultiplier: 0.95, background: 'standard',
    employers: ['African Union Commission (Addis Ababa)', 'the Pan-African Parliament (Midrand)', 'the African Union Mission in Somalia'],
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (citizenOf(state, 'au') ? { ok: true } : { ok: false, reason: 'Citizens of member states only' }),
    ladder: [
      ['officer', 'Programme Officer', 5, { years: 2 }],
      ['senior', 'Senior Policy Officer', 6, { years: 3 }],
      ['principal', 'Principal Policy Officer', 7, { abilities: ['diplomatic'] }],
      ['head', 'Head of Division', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'diplomatic'], reports: 20 }],
      ['director', 'Director', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'diplomatic'], reports: 90 }],
      ['commissioner', 'Commissioner of the African Union', 10, { track: 'mgmt', appointed: true, appointedBy: 'the Executive Council, elected for four years', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic'], reports: 300 }],
      ['deputy', 'Deputy Chairperson of the African Union Commission', 10, { track: 'mgmt', appointed: true, appointedBy: 'the Assembly of the Union', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic'], reports: 800 }],
      ['chair', 'Chairperson of the African Union Commission', 10, { track: 'mgmt', appointed: true, appointedBy: 'the Assembly of the Union', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic', 'exec'], reports: 1600 }],
    ],
  },
  aseanSec: {
    ...INTL, id: 'aseanSec', name: 'ASEAN Secretariat', icon: '🌏', sector: 'private', payMultiplier: 0.95, background: 'standard',
    employers: ['ASEAN Secretariat (Jakarta)'],
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (citizenOf(state, 'asean') ? { ok: true } : { ok: false, reason: 'Citizens of ASEAN member states only' }),
    ladder: [
      ['officer', 'Technical Officer', 5, { years: 2 }],
      ['senior', 'Senior Officer', 6, { years: 3 }],
      ['assistantDir', 'Assistant Director', 7, { abilities: ['diplomatic'] }],
      ['director', 'Director', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'diplomatic'], reports: 40 }],
      ['dsg', 'Deputy Secretary-General of ASEAN', 9, { track: 'mgmt', appointed: true, appointedBy: 'the ASEAN Foreign Ministers', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic'], reports: 120 }],
      ['sg', 'Secretary-General of ASEAN', 10, { track: 'mgmt', appointed: true, appointedBy: 'the ASEAN Summit, by rotation among the members', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic', 'exec'], reports: 400 }],
    ],
  },
  oas: {
    ...INTL, id: 'oas', name: 'Organization of American States', icon: '🌎', sector: 'private', payMultiplier: 1.1, background: 'standard',
    employers: ['OAS General Secretariat (Washington, D.C.)', 'the Inter-American Commission on Human Rights', 'the Pan American Health Organization'],
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (citizenOf(state, 'oas') ? { ok: true } : { ok: false, reason: 'Citizens of member states only' }),
    ladder: [
      ['specialist', 'Specialist (P-2)', 5, { years: 2 }],
      ['senior', 'Senior Specialist (P-3)', 6, { years: 3 }],
      ['chief', 'Chief of Section (P-4)', 7, { abilities: ['diplomatic'] }],
      ['director', 'Director (P-5)', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'diplomatic'], reports: 40 }],
      ['secretary', 'Secretary for a Department', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'diplomatic'], reports: 150 }],
      ['asg', 'Assistant Secretary General of the OAS', 10, { track: 'mgmt', appointed: true, appointedBy: 'the General Assembly', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic'], reports: 300 }],
      ['sg', 'Secretary General of the OAS', 10, { track: 'mgmt', appointed: true, appointedBy: 'the General Assembly', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic', 'exec'], reports: 600 }],
    ],
  },
  councilOfEurope: {
    ...INTL, id: 'councilOfEurope', name: 'Council of Europe', icon: '🏛️', sector: 'private', payMultiplier: 1.25, background: 'standard',
    employers: ['Council of Europe (Strasbourg)', 'the Registry of the European Court of Human Rights'],
    entry: { education: { level: 'master' } },
    eligible: (state) => (citizenOf(state, 'coe') ? { ok: true } : { ok: false, reason: 'Citizens of member states only' }),
    ladder: [
      ['a1', 'Administrator (A1)', 5, { years: 2 }],
      ['a2', 'Administrator (A2)', 6, { years: 3 }],
      ['a3', 'Principal Administrator (A3)', 7],
      ['lawyer', 'Lawyer, Registry of the European Court of Human Rights', 7, { track: 'ic', abilities: ['represent'] }],
      ['head', 'Head of Department (A5)', 8, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 30 }],
      ['director', 'Director (A6)', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }],
      ['dg', 'Director General', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 400 }],
      ['dsg', 'Deputy Secretary General of the Council of Europe', 10, { track: 'mgmt', appointed: true, appointedBy: 'the Parliamentary Assembly', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic'], reports: 1000 }],
      ['sg', 'Secretary General of the Council of Europe', 10, { track: 'mgmt', appointed: true, appointedBy: 'the Parliamentary Assembly', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic', 'exec'], reports: 2200 }],
    ],
  },
};

export default { id: 'careers-intl-orgs', version: 1, careers };
