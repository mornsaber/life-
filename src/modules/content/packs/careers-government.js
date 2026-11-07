/**
 * Federal careers outside the agencies in publicservice/: the Postal
 * Service, the federal law-enforcement agencies (FBI, DEA, ATF, U.S.
 * Marshals, Secret Service) and Social Security / VA claims staff.
 *
 * Federal law enforcement:
 *   - New special agents must be hired before 37 and retire at 57.
 *   - Each agency trains its own (FBI and DEA at Quantico; ATF, the
 *     Marshals and the Secret Service at FLETC).
 *   - Every agent needs a Top Secret clearance — with a polygraph.
 *
 * Claims staff link to the disability system: people who've worked SSA or
 * VA claims know how to document their own (better SSDI odds).
 */
import { L } from '../../career/Ladder.js';

/**
 * Emergency management: the paid headquarters behind the volunteer units — a state SES's
 * headquarters, a national civil-protection agency, a US state office of emergency management.
 * National agencies have regional offices; in federal countries each state or province has its own.
 * '{state}' becomes the state's name; an object picks by state id.
 */
export const EM_AGENCIES = {
  AU: { 'AU-NSW': 'NSW State Emergency Service', 'AU-VIC': 'VICSES', 'AU-QLD': 'Queensland SES', 'AU-SA': 'SA State Emergency Service', 'AU-WA': 'DFES (WA)', 'AU-TAS': 'Tasmania SES', 'AU-NT': 'NT Emergency Service', 'AU-ACT': 'ACT State Emergency Service', '*': '{state} State Emergency Service' },
  CA: { 'CA-ON': 'Emergency Management Ontario', 'CA-QC': 'Sécurité civile Québec', 'CA-BC': 'Emergency Management BC', 'CA-AB': 'Alberta Emergency Management Agency', 'CA-NS': 'Nova Scotia Emergency Management Office', 'CA-SK': 'Saskatchewan Public Safety Agency', '*': '{state} Emergency Management Office' },
  NZ: 'National Emergency Management Agency (NEMA)', GB: 'Resilience Directorate (Cabinet Office)', IE: 'Office of Emergency Planning',
  DE: 'Technisches Hilfswerk (THW)', FR: 'Sécurité civile (DGSCGC)', IT: 'Protezione Civile', ES: 'Protección Civil — {state}', NL: 'Nationaal Crisiscentrum',
  SE: 'MSB (Swedish Civil Contingencies Agency)', JP: 'Fire and Disaster Management Agency (FDMA)', KR: 'Disaster and Safety Management Headquarters', MX: 'Protección Civil — {state}',
  PH: 'Office of Civil Defense', IN: '{state} State Disaster Management Authority', BR: 'Defesa Civil — {state}', SG: 'Singapore Civil Defence Force — Civil Defence HQ',
  IL: 'National Emergency Management Authority (NEMA)', ZA: 'National Disaster Management Centre', KE: 'National Disaster Operations Centre', NG: 'National Emergency Management Agency (NEMA)',
  ID: 'BNPB (National Disaster Management Agency)', CN: 'Ministry of Emergency Management', PS: 'Palestinian Civil Defence',
};

export function emergencyHq(city, rng, stateName, stateId) {
  const cc = String(stateId ?? '').includes('-') ? stateId.split('-')[0] : 'US';
  // A state office (city and county emergency management are the city's own departments).
  if (cc === 'US') return `${stateName} Office of Emergency Management`;
  const a = EM_AGENCIES[cc] ?? 'National disaster management agency';
  const name = (typeof a === 'string' ? a : a[stateId] ?? a['*']).replace('{state}', stateName ?? 'State');
  const provincial = typeof a !== 'string' || a.includes('{state}');
  // (A provincial agency's own headquarters; a national one's office for your region.)
  return name.includes(' — ') ? name : `${name} — ${provincial ? rng.pick(['state headquarters', 'operations directorate']) : rng.pick(['national headquarters', `${city} region office`])}`;
}

export const FED_LE_MAX_AGE = 36;

export const FED_LE_RETIREMENT = 57;

export const FED = { sector: 'federal', sizes: { large: 1, enterprise: 1 }, background: 'strict', exam: 'federal' };

export const ageGate = (max) => (state) => (state.character.age > max ? { ok: false, reason: `New agents must be hired by age ${max}` } : { ok: true });

/** Shared special-agent ladder; `extra` adds the agency's specialist and top posts. */
export function agency({ id, name, icon, academy, employers, entry, maxAge = FED_LE_MAX_AGE, titles = {}, ic, top }) {
  const t = { trainee: 'Special Agent Trainee', agent: 'Special Agent', senior: 'Senior Special Agent', ssa: 'Supervisory Special Agent', asac: 'Assistant Special Agent in Charge', sac: 'Special Agent in Charge', ...titles };
  return {
    ...FED, id, name, icon, payMultiplier: 1.1, minAge: 21,
    union: { chance: 0.5, name: 'Federal Law Enforcement Officers Association', strike: false },
    benefits: { pension: 'fers' },
    mandatoryRetirement: FED_LE_RETIREMENT,
    employers,
    eligible: ageGate(maxAge),
    entry,
    valued: ['post', 'cpa', 'barLicense', 'languageProficiency', 'cissp'],
    levels: [
      L('trainee', t.trainee, 5, { years: 1, req: { clearance: 'topSecret' } }),
      L('agent', t.agent, 7, { req: { credentials: [academy] }, abilities: ['arrest', 'classified'] }),
      L('senior', t.senior, 8, { abilities: ['arrest', 'classified'] }),
      L(ic.id, ic.title, 9, { track: 'ic', minSize: 'enterprise', abilities: ['arrest', 'classified'], ...(ic.opts ?? {}) }),
      L('ssa', t.ssa, 9, { track: 'mgmt', abilities: ['arrest', 'classified', 'supervise'], reports: 12 }),
      L('asac', t.asac, 9, { track: 'mgmt', abilities: ['classified', 'supervise', 'hire', 'budget'], reports: 120 }),
      L('sac', t.sac, 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['classified', 'supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 900 }),
      ...(top ? [top] : []),
    ],
  };
}

const careers = {
  emergencyManagement: {
    sector: 'state', sizes: { medium: 1, large: 1 }, id: 'emergencyManagement', name: 'Emergency Management', icon: '🚨', payMultiplier: 0.95, minAge: 21,
    union: { chance: 0.4, name: 'Public Service Association', strike: false },
    employerName: emergencyHq,
    entry: { education: { level: 'bachelor' } },
    valued: ['emt', 'ff1', 'fireOfficer1', 'cem'],
    ladder: [
      ['trainee', 'Emergency Management Officer (Trainee)', 3, { years: 1 }],
      ['officer', 'Emergency Management Officer', 4],
      ['senior', 'Senior Emergency Management Officer', 5],
      ['planner', 'Hazard Mitigation & Recovery Planner', 6, { track: 'ic' }],
      ['volunteerServices', 'Volunteer Services Manager', 6, { track: 'ic' }],
      ['controller', 'Region Controller', 7, { track: 'mgmt', abilities: ['supervise'], reports: 25 }],
      ['director', 'Director of Operations', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 150 }],
      ['deputy', 'Deputy Commissioner', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 400 }],
      ['commissioner', 'Commissioner', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy'], reports: 1200 }],
    ],
  },
  postal: {
    ...FED, sizes: { small: 3, medium: 3, large: 2, enterprise: 1 }, id: 'postal', name: 'U.S. Postal Service', icon: '📬', payMultiplier: 0.9, minAge: 18,
    union: { chance: 0.95, name: 'National Association of Letter Carriers', strike: false },
    benefits: { pension: 'fers' },
    employerName: (city) => `${city} Post Office`,
    entry: { credentials: ['driverLicense'] },
    seniority: true,
    ladder: [
      ['cca', 'City Carrier Assistant', 2, { years: 2 }],
      ['carrier', 'Letter Carrier', 4],
      ['bid', 'Senior Carrier (Bid Route)', 5, { track: 'ic' }],
      ['clerk', 'Window & Distribution Clerk', 4, { track: 'ic' }],
      ['supervisor', 'Supervisor, Customer Service', 5, { track: 'mgmt', abilities: ['supervise'], reports: 25 }],
      ['postmaster', 'Postmaster', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }],
      ['plantManager', 'Processing Plant Manager', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 900 }],
      ['district', 'District Manager', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'exec'], reports: 6000 }],
    ],
  },
  fbi: agency({
    id: 'fbi', name: 'Federal Bureau of Investigation', icon: '🕵️', academy: 'fbiAcademy',
    employers: ['FBI Field Office', 'FBI Headquarters', 'FBI Cyber Division'],
    entry: { education: { level: 'bachelor' }, workYears: 2 },
    ic: { id: 'bau', title: 'Behavioral Analysis Unit Agent' },
  }),
  dea: agency({
    id: 'dea', name: 'Drug Enforcement Administration', icon: '💊', academy: 'deaAcademy',
    employers: ['DEA Field Division', 'DEA Special Operations Division'],
    entry: { education: { level: 'bachelor' } },
    ic: { id: 'undercover', title: 'Undercover Agent' },
  }),
  atf: agency({
    id: 'atf', name: 'Bureau of Alcohol, Tobacco, Firearms and Explosives', icon: '💥', academy: 'fletc',
    employers: ['ATF Field Division', 'ATF National Response Team'],
    entry: { education: { level: 'bachelor' } },
    ic: { id: 'explosives', title: 'Certified Explosives Specialist' },
  }),
  usms: agency({
    id: 'usms', name: 'U.S. Marshals Service', icon: '⭐', academy: 'fletc',
    employers: ['U.S. Marshals — District Office', 'U.S. Marshals — Fugitive Task Force'],
    entry: { anyOf: [{ education: { level: 'bachelor' } }, { experience: { professions: ['police', 'sheriff', 'statePolice', 'corrections', 'federalPrisons'], years: 3 } }] },
    titles: { trainee: 'Deputy U.S. Marshal Trainee', agent: 'Deputy U.S. Marshal', senior: 'Senior Inspector', ssa: 'Supervisory Deputy', asac: 'Chief Deputy U.S. Marshal', sac: 'Assistant Director' },
    ic: { id: 'fugitive', title: 'Fugitive Task Force Inspector' },
    top: L('usMarshal', 'United States Marshal', 10, { track: 'mgmt', appointed: true, abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 300 }),
  }),
  usss: agency({
    id: 'usss', name: 'U.S. Secret Service', icon: '🕶️', academy: 'fletc', maxAge: 37,
    employers: ['Secret Service Field Office', 'Secret Service Protective Operations'],
    entry: { education: { level: 'bachelor' } },
    ic: { id: 'protective', title: 'Presidential Protective Division Agent', opts: { req: { fitness: 60 } } },
  }),
  benefitsClaims: {
    ...FED, sizes: { medium: 1, large: 2, enterprise: 2 }, id: 'benefitsClaims', name: 'Social Security & VA Claims', icon: '📑', payMultiplier: 0.95, minAge: 21,
    union: { chance: 0.7, name: 'AFGE National Council of SSA Field Operations Locals', strike: false },
    benefits: { pension: 'fers' },
    employers: ['Social Security Administration — Field Office', 'SSA Office of Hearings Operations', 'Department of Veterans Affairs — Regional Office'],
    entry: { education: { level: 'bachelor' } },
    ladder: [
      ['trainee', 'Claims Specialist Trainee', 3, { years: 1, req: { clearance: 'publicTrust' } }],
      ['specialist', 'Claims Specialist / Veterans Service Representative', 4],
      ['senior', 'Senior Claims Specialist', 5],
      ['rater', 'Disability Rating Specialist', 6, { track: 'ic' }],
      ['alj', 'Administrative Law Judge', 9, { track: 'ic', minSize: 'large', req: { credentials: ['barLicense'], experience: { professions: ['law', 'benefitsClaims', 'prosecution', 'publicDefender'], years: 7 } }, abilities: ['sign'] }],
      ['supervisor', 'Claims Supervisor', 6, { track: 'mgmt', abilities: ['supervise'], reports: 15 }],
      ['manager', 'District Office Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }],
      ['regional', 'Regional Commissioner', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 8000 }],
    ],
  },
};

export default { id: 'careers-government', version: 1, careers };
