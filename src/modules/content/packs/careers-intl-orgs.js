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

/** EU and NATO members (citizenship gates). */
export const EU_MEMBERS = ['AT', 'BE', 'CY', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LV', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'BG', 'CZ', 'HU'];

export const NATO_MEMBERS = ['US', 'CA', 'GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'DK', 'NO', 'PL', 'RO', 'TR', 'EE', 'LV', 'LT', 'SE', 'FI', 'CZ', 'HU', 'PT', 'GR', 'SK', 'SI', 'HR', 'BG', 'AL', 'ME', 'MK', 'IS', 'LU'];

export const citizenOfAny = (state, list) => citizenshipsOf(state).some((c) => list.includes(c));

export const passed = (state, comp) => Boolean(state.intlOrgs?.competitions?.[comp]?.passed);

export const yearsIn = (state, ids) => (state.career.history ?? []).filter((h) => ids.includes(h.professionId)).reduce((s, h) => s + Math.max(0, (h.endAge ?? 0) - (h.startAge ?? 0)), 0) + (ids.includes(state.career.job?.professionId) ? state.career.job.yearsAtEmployer ?? 0 : 0);

export const RELEVANT = ['foreignService', 'law', 'finance', 'publicHealth', 'medical', 'research', 'university', 'nonprofit', 'regulatory', 'municipalAdmin', 'legislativeStaff', 'economics', 'journalism', 'socialWork', 'emergencyManagement', 'intelligence', 'interpreter'];

export const INTL_IDS = ['unSecretariat', 'unAgencies', 'euInstitutions', 'nato', 'intlFinance', 'intlJustice', 'icrc', 'maltaRelief', 'maltaDiplomacy', 'holySeeDiplomacy', 'romanCuria'];

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
    employers: ['United Nations Secretariat (New York)', 'United Nations Office at Geneva', 'UN peace operations (Department of Peace Operations)'],
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
    employers: ['European Commission', 'European External Action Service', 'European Parliament (Secretariat)', 'Council of the European Union (General Secretariat)', 'European Central Bank', 'Court of Justice of the European Union'],
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
      ['adviser', 'Adviser (AD13)', 9, { track: 'ic' }],
      ['hou', 'Head of Unit (AD9–AD12)', 8, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 25 }],
      ['director', 'Director (AD14)', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 200 }],
      ['deputyDg', 'Deputy Director-General', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 1200 }],
      ['dg', 'Director-General (AD15–AD16)', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 1500 }],
    ],
  },
  nato: {
    ...INTL, id: 'nato', name: 'NATO International Staff', icon: '🛡️', sector: 'private', payMultiplier: 1.28, background: 'strict',
    employers: ['NATO Headquarters (International Staff)', 'NATO Communications and Information Agency'],
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
      ['dsg', 'Deputy Secretary General', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 2000 }],
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
    eligible: (state) => (state.character.age >= 25 ? { ok: true } : { ok: false, reason: 'Delegates are 25 or older, with work experience' }),
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
};

export default { id: 'careers-intl-orgs', version: 1, careers };
