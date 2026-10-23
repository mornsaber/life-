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
import { L } from './Ladder.js';
import { citizenshipsOf } from '../world/Countries.js';

const INTL = { sizes: { enterprise: 1 }, minAge: 21, intl: true, layoffRate: 0.004, union: { chance: 0.9, name: 'Staff Union', strike: false } };

/** EU and NATO members (citizenship gates). */
export const EU_MEMBERS = ['AT', 'BE', 'CY', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LV', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'BG', 'CZ', 'HU'];
export const NATO_MEMBERS = ['US', 'CA', 'GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'DK', 'NO', 'PL', 'RO', 'TR', 'EE', 'LV', 'LT', 'SE', 'FI', 'CZ', 'HU', 'PT', 'GR', 'SK', 'SI', 'HR', 'BG', 'AL', 'ME', 'MK', 'IS', 'LU'];
export const P5 = ['US', 'GB', 'FR', 'CN', 'RU'];

const citizenOfAny = (state, list) => citizenshipsOf(state).some((c) => list.includes(c));
const passed = (state, comp) => Boolean(state.intlOrgs?.competitions?.[comp]?.passed);
const yearsIn = (state, ids) => (state.career.history ?? []).filter((h) => ids.includes(h.professionId)).reduce((s, h) => s + Math.max(0, (h.endAge ?? 0) - (h.startAge ?? 0)), 0) + (ids.includes(state.career.job?.professionId) ? state.career.job.yearsAtEmployer ?? 0 : 0);
const RELEVANT = ['foreignService', 'law', 'finance', 'publicHealth', 'medical', 'research', 'university', 'nonprofit', 'regulatory', 'municipalAdmin', 'legislativeStaff', 'economics', 'journalism', 'socialWork', 'emergencyManagement', 'intelligence', 'interpreter'];
const INTL_IDS = ['unSecretariat', 'unAgencies', 'euInstitutions', 'nato', 'intlFinance', 'intlJustice', 'icrc', 'maltaRelief', 'maltaDiplomacy', 'holySeeDiplomacy', 'romanCuria'];
/** Lateral entry: years of relevant work, at home or in another organisation. */
export const intlExperience = (state) => yearsIn(state, [...RELEVANT, ...INTL_IDS]);
const isCatholic = (state) => ['catholic', 'tradCatholic'].includes(state.community?.faith?.traditionId);
const married = (state) => (state.people?.list ?? []).some((p) => p.alive !== false && p.relation === 'spouse');
const served = (state) => Boolean(state.military?.service || state.military?.history?.length || ['served', 'serving'].includes(state.military?.conscription?.status));
/** An ordained Catholic priest: a parochial vicar or above, now or before. */
export const ordainedPriest = (state) => [state.career.job, ...(state.career.history ?? [])].some((j) => j?.professionId === 'catholicClergy' && (j.peakGrade ?? j.grade ?? 0) >= 3) || ['holySeeDiplomacy'].includes(state.career.job?.professionId);

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

/**
 * Where each employer is based: [place, country]; `field` lists the hardship
 * duty stations staff rotate through.
 */
export const DUTY_STATIONS = {
  'United Nations Secretariat (New York)': { hq: ['New York', 'United States'], field: [['Geneva', 'Switzerland'], ['Vienna', 'Austria'], ['Nairobi', 'Kenya'], ['Bangkok', 'Thailand'], ['Beirut', 'Lebanon'], ['Addis Ababa', 'Ethiopia']] },
  'United Nations Office at Geneva': { hq: ['Geneva', 'Switzerland'], field: [['New York', 'United States'], ['Vienna', 'Austria'], ['Nairobi', 'Kenya']] },
  'UN peace operations (Department of Peace Operations)': { hq: ['New York', 'United States'], field: [['Juba', 'South Sudan'], ['Bangui', 'Central African Republic'], ['Goma', 'DR Congo'], ['Bamako', 'Mali'], ['Naqoura', 'Lebanon'], ['Pristina', 'Kosovo']] },
  'UNICEF': { hq: ['New York', 'United States'], field: [['Nairobi', 'Kenya'], ['Dakar', 'Senegal'], ['Kabul', 'Afghanistan'], ['Port-au-Prince', 'Haiti'], ['Amman', 'Jordan']] },
  'UNHCR (the UN Refugee Agency)': { hq: ['Geneva', 'Switzerland'], field: [['Amman', 'Jordan'], ['Kakuma', 'Kenya'], ['Cox\'s Bazar', 'Bangladesh'], ['Gaziantep', 'Turkey'], ['Kyiv', 'Ukraine']] },
  'World Food Programme': { hq: ['Rome', 'Italy'], field: [['Juba', 'South Sudan'], ['Sana\'a', 'Yemen'], ['Mogadishu', 'Somalia'], ['Damascus', 'Syria']] },
  'World Health Organization': { hq: ['Geneva', 'Switzerland'], field: [['Brazzaville', 'Republic of the Congo'], ['Manila', 'Philippines'], ['Cairo', 'Egypt'], ['New Delhi', 'India']] },
  'UNDP': { hq: ['New York', 'United States'], field: [['Addis Ababa', 'Ethiopia'], ['Dhaka', 'Bangladesh'], ['Bogotá', 'Colombia'], ['Istanbul', 'Turkey']] },
  'UNESCO': { hq: ['Paris', 'France'], field: [['Bangkok', 'Thailand'], ['Nairobi', 'Kenya'], ['Montevideo', 'Uruguay']] },
  'Food and Agriculture Organization': { hq: ['Rome', 'Italy'], field: [['Accra', 'Ghana'], ['Bangkok', 'Thailand'], ['Santiago', 'Chile']] },
  'International Labour Organization': { hq: ['Geneva', 'Switzerland'], field: [['Bangkok', 'Thailand'], ['Abidjan', 'Ivory Coast'], ['Lima', 'Peru']] },
  'International Atomic Energy Agency': { hq: ['Vienna', 'Austria'], field: [['Tokyo', 'Japan']] },
  'European Commission': { hq: ['Brussels', 'Belgium'], field: [['Luxembourg', 'Luxembourg']] },
  'European External Action Service': { hq: ['Brussels', 'Belgium'], field: [['Washington, D.C.', 'United States'], ['Nairobi', 'Kenya'], ['Kyiv', 'Ukraine'], ['Beijing', 'China'], ['Brasília', 'Brazil']] },
  'European Parliament (Secretariat)': { hq: ['Brussels', 'Belgium'], field: [['Strasbourg', 'France']] },
  'Council of the European Union (General Secretariat)': { hq: ['Brussels', 'Belgium'] },
  'European Central Bank': { hq: ['Frankfurt', 'Germany'] },
  'Court of Justice of the European Union': { hq: ['Luxembourg', 'Luxembourg'] },
  'NATO Headquarters (International Staff)': { hq: ['Brussels', 'Belgium'], field: [['Mons', 'Belgium'], ['Naples', 'Italy'], ['Brunssum', 'Netherlands']] },
  'NATO Communications and Information Agency': { hq: ['The Hague', 'Netherlands'], field: [['Mons', 'Belgium']] },
  'World Bank Group': { hq: ['Washington, D.C.', 'United States'], field: [['Nairobi', 'Kenya'], ['New Delhi', 'India'], ['Jakarta', 'Indonesia'], ['Dakar', 'Senegal']] },
  'International Monetary Fund': { hq: ['Washington, D.C.', 'United States'] },
  'International Criminal Court': { hq: ['The Hague', 'Netherlands'], field: [['Bangui', 'Central African Republic'], ['Kampala', 'Uganda']] },
  'International Court of Justice': { hq: ['The Hague', 'Netherlands'] },
  'International Committee of the Red Cross': { hq: ['Geneva', 'Switzerland'], field: [['Kyiv', 'Ukraine'], ['Gaza', 'Palestine'], ['Maiduguri', 'Nigeria'], ['Kabul', 'Afghanistan'], ['Goma', 'DR Congo'], ['Aleppo', 'Syria']] },
  'Malteser International': { hq: ['Cologne', 'Germany'], field: [['Erbil', 'Iraq'], ['Juba', 'South Sudan'], ['Yangon', 'Myanmar'], ['Port-au-Prince', 'Haiti'], ['Lviv', 'Ukraine']] },
  'Pontifical Swiss Guard': { hq: ['Vatican City', 'Vatican City'] },
  'Gendarmerie Corps of Vatican City State': { hq: ['Vatican City', 'Vatican City'] },
  'Roman Curia': { hq: ['Vatican City', 'Vatican City'] },
  'Secretariat of State — Diplomatic Service of the Holy See': { hq: ['Vatican City', 'Vatican City'], field: [['Washington, D.C.', 'United States'], ['Paris', 'France'], ['Berlin', 'Germany'], ['Madrid', 'Spain'], ['Manila', 'Philippines'], ['Nairobi', 'Kenya'], ['Brasília', 'Brazil'], ['New Delhi', 'India'], ['Kyiv', 'Ukraine'], ['Beirut', 'Lebanon'], ['Geneva', 'Switzerland'], ['Canberra', 'Australia'], ['Ottawa', 'Canada'], ['Mexico City', 'Mexico'], ['Kinshasa', 'DR Congo'], ['Damascus', 'Syria'], ['Jerusalem', 'Israel'], ['Seoul', 'South Korea']] },
  'Grand Magistry of the Sovereign Order of Malta': { hq: ['Rome', 'Italy'], field: [['Vienna', 'Austria'], ['Paris', 'France'], ['Brussels', 'Belgium'], ['New York', 'United States'], ['Valletta', 'Malta'], ['Nairobi', 'Kenya'], ['Beirut', 'Lebanon']] },
};

/** Field stations where staff face real danger (a yearly chance of an incident). */
export const HARDSHIP = ['Juba', 'Bangui', 'Goma', 'Bamako', 'Kabul', 'Sana\'a', 'Mogadishu', 'Damascus', 'Aleppo', 'Gaza', 'Maiduguri', 'Port-au-Prince', 'Erbil', 'Kyiv', 'Lviv', 'Yangon', 'Kakuma', 'Naqoura'];

export const INTL_ORG_PROFESSIONS = {
  unSecretariat: {
    ...INTL, id: 'unSecretariat', name: 'United Nations Secretariat', icon: '🇺🇳', sector: 'private', payMultiplier: 1.3, background: 'strict',
    employers: ['United Nations Secretariat (New York)', 'United Nations Office at Geneva', 'UN peace operations (Department of Peace Operations)'],
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => {
      if (state.character.age <= 32 && passed(state, 'ypp')) return { ok: true };
      if (intlExperience(state) >= 7 && state.education.degrees.some((d) => ['master', 'doctorate', 'professional'].includes(d.type))) return { ok: true };
      return { ok: false, reason: state.character.age <= 32 ? 'Pass the UN Young Professionals Programme exam (or 7 years\' relevant experience and a master\'s)' : 'Lateral entry needs 7 years\' relevant experience and a master\'s' };
    },
    valued: ['languageProficiency'],
    levels: [
      L('p2', 'Associate Officer (P-2)', 5, { years: 2 }),
      L('p3', 'Officer (P-3)', 6, { entry: true, years: 3, req: { workYears: 5, education: { level: 'master' } } }),
      L('p4', 'Senior Officer (P-4)', 7, { years: 4, abilities: ['diplomatic'] }),
      L('p5', 'Chief of Section (P-5)', 8, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'hire'], reports: 15 }),
      L('p5s', 'Senior Political Affairs Officer (P-5)', 8, { track: 'ic', abilities: ['diplomatic'] }),
      L('d1', 'Director (D-1)', 9, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'hire', 'budget'], reports: 60 }),
      L('d2', 'Director (D-2)', 9, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'hire', 'budget', 'delegate'], reports: 200 }),
      L('asg', 'Assistant Secretary-General', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['diplomatic', 'supervise', 'budget', 'delegate', 'policy'], reports: 600 }),
    ],
  },
  unAgencies: {
    ...INTL, id: 'unAgencies', name: 'UN Agencies, Funds & Programmes', icon: '🌍', sector: 'private', payMultiplier: 1.22, background: 'standard',
    employers: ['UNICEF', 'UNHCR (the UN Refugee Agency)', 'World Food Programme', 'World Health Organization', 'UNDP', 'UNESCO', 'Food and Agriculture Organization', 'International Labour Organization', 'International Atomic Energy Agency'],
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (state.character.age <= 32 || intlExperience(state) >= 5 ? { ok: true } : { ok: false, reason: 'Junior Professional Officers are 32 and under; later, 5 years\' relevant experience' }),
    levels: [
      L('jpo', 'Junior Professional Officer', 4, { years: 2 }),
      L('programme', 'Programme Officer (P-3)', 6, { years: 3 }),
      L('specialist', 'Programme Specialist (P-4)', 7, { track: 'ic', abilities: ['diplomatic'] }),
      L('deputyRep', 'Deputy Representative (P-5)', 8, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'hire'], reports: 40 }),
      L('rep', 'Country Representative (D-1)', 9, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'hire', 'budget'], reports: 150 }),
      L('regional', 'Regional Director (D-2)', 10, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'budget', 'delegate'], reports: 800 }),
    ],
  },
  euInstitutions: {
    ...INTL, id: 'euInstitutions', name: 'EU Institutions (European Civil Service)', icon: '🇪🇺', sector: 'private', payMultiplier: 1.35, background: 'standard',
    employers: ['European Commission', 'European External Action Service', 'European Parliament (Secretariat)', 'Council of the European Union (General Secretariat)', 'European Central Bank', 'Court of Justice of the European Union'],
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => {
      if (!citizenOfAny(state, EU_MEMBERS)) return { ok: false, reason: 'EU citizens only' };
      if (!passed(state, 'epso')) return { ok: false, reason: 'Pass an EPSO open competition (concours) first' };
      return { ok: true };
    },
    levels: [
      L('trainee', 'Blue Book Trainee (stagiaire)', 3, { years: 1 }),
      L('ad5', 'Administrator (AD5)', 6, { entry: true, years: 3 }),
      L('ad7', 'Administrator (AD7)', 7, { years: 4 }),
      L('ad9', 'Policy Officer (AD9)', 8, { track: 'ic' }),
      L('hou', 'Head of Unit (AD9–AD12)', 8, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 25 }),
      L('director', 'Director (AD14)', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 200 }),
      L('dg', 'Director-General (AD15–AD16)', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 1500 }),
    ],
  },
  nato: {
    ...INTL, id: 'nato', name: 'NATO International Staff', icon: '🛡️', sector: 'private', payMultiplier: 1.28, background: 'strict',
    employers: ['NATO Headquarters (International Staff)', 'NATO Communications and Information Agency'],
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (citizenOfAny(state, NATO_MEMBERS) ? { ok: true } : { ok: false, reason: 'Citizens of NATO member countries only' }),
    levels: [
      L('a2', 'Officer (A2)', 6, { years: 3, abilities: ['classified'] }),
      L('a3', 'Senior Officer (A3)', 7, { abilities: ['classified'] }),
      L('a4', 'Head of Section (A4)', 8, { track: 'mgmt', abilities: ['classified', 'supervise', 'hire'], reports: 15 }),
      L('a5', 'Head of Branch (A5)', 8, { track: 'ic', abilities: ['classified', 'policy'] }),
      L('a6', 'Director (A6)', 9, { track: 'mgmt', abilities: ['classified', 'supervise', 'budget', 'delegate'], reports: 120 }),
      L('dasg', 'Deputy Assistant Secretary General', 9, { track: 'mgmt', abilities: ['classified', 'diplomatic', 'supervise', 'budget', 'delegate'], reports: 250 }),
      L('asg', 'Assistant Secretary General', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['classified', 'diplomatic', 'supervise', 'budget', 'delegate', 'policy'], reports: 500 }),
    ],
  },
  intlFinance: {
    ...INTL, id: 'intlFinance', name: 'World Bank & IMF', icon: '🏦', sector: 'private', payMultiplier: 1.5, background: 'strict',
    employers: ['World Bank Group', 'International Monetary Fund'],
    entry: { education: { level: 'master' }, smarts: 60 },
    eligible: (state) => (passed(state, 'wbYpp') || intlExperience(state) >= 6 ? { ok: true } : { ok: false, reason: 'Pass the Young Professionals Program selection (or 6 years\' experience in finance or development)' }),
    levels: [
      L('analyst', 'Analyst (GE)', 6, { years: 2 }),
      L('economist', 'Economist (GF)', 7, { years: 3 }),
      L('senior', 'Senior Economist (GG)', 8, { track: 'ic' }),
      L('lead', 'Lead Economist (GH)', 9, { track: 'ic', abilities: ['policy'] }),
      L('manager', 'Practice Manager / Division Chief (GI)', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 30 }),
      L('director', 'Director (GJ)', 10, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'diplomatic'], reports: 250 }),
      L('vp', 'Vice President', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy', 'diplomatic'], reports: 1500 }),
    ],
  },
  intlJustice: {
    ...INTL, id: 'intlJustice', name: 'International Courts & Tribunals', icon: '⚖️', sector: 'private', payMultiplier: 1.3, background: 'strict',
    employers: ['International Criminal Court', 'International Court of Justice'],
    entry: { education: { program: 'jd' } },
    eligible: (state) => (yearsIn(state, ['law', 'prosecution', 'publicDefender', 'courts', 'intlJustice']) >= 3 || state.character.age <= 30 ? { ok: true } : { ok: false, reason: 'Needs 3 years practising law' }),
    levels: [
      L('associate', 'Associate Legal Officer (P-2)', 5, { years: 2, abilities: ['represent'] }),
      L('legal', 'Legal Officer (P-3)', 6, { abilities: ['represent'] }),
      L('trial', 'Trial Lawyer (P-4)', 7, { track: 'ic', abilities: ['represent'] }),
      L('senior', 'Senior Trial Lawyer (P-5)', 8, { track: 'ic', abilities: ['represent'] }),
      L('chief', 'Chief of Prosecutions (D-1)', 10, { track: 'mgmt', abilities: ['represent', 'supervise', 'hire'], reports: 80 }),
    ],
  },
  icrc: {
    ...INTL, id: 'icrc', name: 'International Committee of the Red Cross', icon: '⛑️', sector: 'private', payMultiplier: 1.0, background: 'standard',
    employers: ['International Committee of the Red Cross'],
    union: null,
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (state.character.age >= 25 ? { ok: true } : { ok: false, reason: 'Delegates are 25 or older, with work experience' }),
    levels: [
      L('delegate', 'Delegate', 5, { years: 2 }),
      L('protection', 'Protection Coordinator', 6, { track: 'ic' }),
      L('subdelegation', 'Head of Sub-Delegation', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 40 }),
      L('delegation', 'Head of Delegation', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'diplomatic'], reports: 300 }),
      L('regional', 'Regional Director', 9, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'diplomatic'], reports: 2500 }),
    ],
  },
  maltaRelief: {
    ...INTL, id: 'maltaRelief', name: 'Order of Malta — Malteser International', icon: '✠', sector: 'private', payMultiplier: 0.9, background: 'standard', minAge: 20,
    employers: ['Malteser International'],
    union: null,
    entry: { education: { level: 'highschool' } },
    levels: [
      L('assistant', 'Project Assistant', 3, { years: 1 }),
      L('officer', 'Project Officer', 4),
      L('pm', 'Country Programme Manager', 6, { track: 'ic' }),
      L('hom', 'Head of Mission', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }),
      L('regional', 'Regional Director', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports: 300 }),
      L('sg', 'Secretary General of Malteser International', 9, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 1000 }),
    ],
  },
  swissGuard: {
    ...INTL, id: 'swissGuard', name: 'Pontifical Swiss Guard', icon: '⚔️', sector: 'private', payMultiplier: 0.5, background: 'strict', minAge: 19,
    employers: ['Pontifical Swiss Guard'],
    union: null,
    entry: { education: { level: 'highschool' } },
    eligible: swissGuardCheck,
    levels: [
      L('halberdier', 'Halberdier', 2, { years: 2 }),
      L('viceCorporal', 'Vice-Corporal', 3),
      L('corporal', 'Corporal', 4, { abilities: ['supervise'], reports: 6 }),
      L('sergeant', 'Sergeant', 5, { abilities: ['supervise'], reports: 15 }),
      L('sergeantMajor', 'Sergeant Major', 6, { track: 'ic' }),
      L('lieutenant', 'Lieutenant', 6, { track: 'mgmt', abilities: ['supervise'], reports: 30 }),
      L('captain', 'Captain', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 60 }),
      L('ltColonel', 'Lieutenant Colonel (Vice-Commandant)', 8, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 135 }),
      L('commandant', 'Colonel, Commandant of the Pontifical Swiss Guard', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'policy'], reports: 135 }),
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
    levels: [
      L('gendarme', 'Gendarme', 3, { years: 2 }),
      L('viceBrigadier', 'Vice-Brigadier', 4),
      L('brigadier', 'Brigadier', 5, { abilities: ['supervise'], reports: 10 }),
      L('inspector', 'Inspector', 6, { abilities: ['supervise'], reports: 25 }),
      L('viceCommissioner', 'Vice-Commissioner', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 60 }),
      L('commissioner', 'Commissioner', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 130 }),
      L('commandant', 'Inspector General, Commandant of the Gendarmerie', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'policy'], reports: 130 }),
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
    levels: [
      L('student', 'Student, Pontifical Ecclesiastical Academy', 4, { years: 2 }),
      L('secretary2', 'Secretary of Nunciature (second class)', 5, { years: 3, abilities: ['diplomatic'] }),
      L('secretary1', 'Secretary of Nunciature (first class)', 6, { abilities: ['diplomatic'] }),
      L('counsellor', 'Counsellor of Nunciature', 7, { abilities: ['diplomatic'] }),
      L('nuncio', 'Apostolic Nuncio (titular Archbishop)', 8, { track: 'ic', abilities: ['diplomatic'] }),
      L('relations', 'Secretary for Relations with States', 9, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'budget', 'policy'], reports: 60 }),
      L('secState', 'Cardinal Secretary of State', 10, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 400 }),
    ],
  },
  romanCuria: {
    ...INTL, id: 'romanCuria', name: 'Roman Curia', icon: '🇻🇦', sector: 'private', payMultiplier: 0.55, background: 'strict', minAge: 25,
    // The dicasteries that govern the Church with the Pope. Since 2022 lay people can lead them too.
    employers: ['Roman Curia'],
    union: null,
    entry: { education: { level: 'master' } },
    eligible: (state) => (isCatholic(state) ? { ok: true } : { ok: false, reason: 'Practising Catholics only' }),
    levels: [
      L('official', 'Official (minutante) of a Dicastery', 5, { years: 2 }),
      L('headOffice', 'Head of Office', 6, { abilities: ['supervise'], reports: 8 }),
      L('underSecretary', 'Under-Secretary of a Dicastery', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 30 }),
      L('secretary', 'Secretary of a Dicastery', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }),
      L('prefect', 'Prefect of a Dicastery', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'policy', 'exec'], reports: 120 }),
    ],
  },
  maltaDiplomacy: {
    ...INTL, id: 'maltaDiplomacy', name: 'Order of Malta — Diplomatic Service', icon: '✠', sector: 'private', payMultiplier: 0.95, background: 'strict', minAge: 25,
    employers: ['Grand Magistry of the Sovereign Order of Malta'],
    union: null,
    entry: { education: { level: 'bachelor' } },
    eligible: (state) => (state.malta?.grade ? { ok: true } : { ok: false, reason: isCatholic(state) ? 'Become a member of the Order of Malta first' : 'Members of the Order of Malta only (practising Catholics)' }),
    levels: [
      L('attache', 'Attaché, Grand Magistry', 4, { years: 2 }),
      L('counsellor', 'Counsellor', 6, { abilities: ['diplomatic'] }),
      L('minister', 'Minister Counsellor', 7, { abilities: ['diplomatic'] }),
      L('ambassador', 'Ambassador of the Order of Malta', 8, { track: 'ic', abilities: ['diplomatic'] }),
      L('director', 'Director of Diplomatic Affairs', 8, { track: 'mgmt', abilities: ['diplomatic', 'supervise', 'budget'], reports: 40 }),
    ],
  },
};

export const INTL_ORG_IDS = Object.keys(INTL_ORG_PROFESSIONS);
