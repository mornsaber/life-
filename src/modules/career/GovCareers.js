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
import { L } from './Ladder.js';
import { JUSTICE_EVENTS, INCIDENT_ICONS } from './JusticeCareers.js';

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
function emergencyHq(city, rng, stateName, stateId) {
  const cc = String(stateId ?? '').includes('-') ? stateId.split('-')[0] : 'US';
  if (cc === 'US') return rng.chance(0.6) ? `${stateName} Office of Emergency Management` : `${city} Office of Emergency Management`;
  const a = EM_AGENCIES[cc] ?? 'National disaster management agency';
  const name = (typeof a === 'string' ? a : a[stateId] ?? a['*']).replace('{state}', stateName ?? 'State');
  const provincial = typeof a !== 'string' || a.includes('{state}');
  // (A provincial agency's own headquarters; a national one's office for your region.)
  return name.includes(' — ') ? name : `${name} — ${provincial ? rng.pick(['state headquarters', 'operations directorate']) : rng.pick(['national headquarters', `${city} region office`])}`;
}

export const FED_LE_MAX_AGE = 36;
export const FED_LE_RETIREMENT = 57;
const FED = { sector: 'federal', sizes: { large: 1, enterprise: 1 }, background: 'strict', exam: 'federal' };

const ageGate = (max) => (state) => (state.character.age > max ? { ok: false, reason: `New agents must be hired by age ${max}` } : { ok: true });

/** Shared special-agent ladder; `extra` adds the agency's specialist and top posts. */
function agency({ id, name, icon, academy, employers, entry, maxAge = FED_LE_MAX_AGE, titles = {}, ic, top }) {
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

export const GOV_PROFESSIONS = {
  emergencyManagement: {
    sector: 'state', sizes: { medium: 1, large: 1 }, id: 'emergencyManagement', name: 'Emergency Management', icon: '🚨', payMultiplier: 0.95, minAge: 21,
    union: { chance: 0.4, name: 'Public Service Association', strike: false },
    employerName: emergencyHq,
    entry: { education: { level: 'bachelor' } },
    valued: ['emt', 'ff1', 'fireOfficer1', 'cem'],
    levels: [
      L('trainee', 'Emergency Management Officer (Trainee)', 3, { years: 1 }),
      L('officer', 'Emergency Management Officer', 4),
      L('senior', 'Senior Emergency Management Officer', 5),
      L('planner', 'Hazard Mitigation & Recovery Planner', 6, { track: 'ic' }),
      L('volunteerServices', 'Volunteer Services Manager', 6, { track: 'ic' }),
      L('controller', 'Region Controller', 7, { track: 'mgmt', abilities: ['supervise'], reports: 25 }),
      L('director', 'Director of Operations', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 150 }),
      L('deputy', 'Deputy Commissioner', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 400 }),
      L('commissioner', 'Commissioner', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy'], reports: 1200 }),
    ],
  },
  postal: {
    ...FED, sizes: { small: 3, medium: 3, large: 2, enterprise: 1 }, id: 'postal', name: 'U.S. Postal Service', icon: '📬', payMultiplier: 0.9, minAge: 18,
    union: { chance: 0.95, name: 'National Association of Letter Carriers', strike: false },
    benefits: { pension: 'fers' },
    employerName: (city) => `${city} Post Office`,
    entry: { credentials: ['driverLicense'] },
    seniority: true,
    levels: [
      L('cca', 'City Carrier Assistant', 2, { years: 2 }),
      L('carrier', 'Letter Carrier', 4),
      L('bid', 'Senior Carrier (Bid Route)', 5, { track: 'ic' }),
      L('clerk', 'Window & Distribution Clerk', 4, { track: 'ic' }),
      L('supervisor', 'Supervisor, Customer Service', 5, { track: 'mgmt', abilities: ['supervise'], reports: 25 }),
      L('postmaster', 'Postmaster', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }),
      L('plantManager', 'Processing Plant Manager', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 900 }),
      L('district', 'District Manager', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'exec'], reports: 6000 }),
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
    levels: [
      L('trainee', 'Claims Specialist Trainee', 3, { years: 1, req: { clearance: 'publicTrust' } }),
      L('specialist', 'Claims Specialist / Veterans Service Representative', 4),
      L('senior', 'Senior Claims Specialist', 5),
      L('rater', 'Disability Rating Specialist', 6, { track: 'ic' }),
      L('alj', 'Administrative Law Judge', 9, { track: 'ic', minSize: 'large', req: { credentials: ['barLicense'], experience: { professions: ['law', 'benefitsClaims', 'prosecution', 'publicDefender'], years: 7 } }, abilities: ['sign'] }),
      L('supervisor', 'Claims Supervisor', 6, { track: 'mgmt', abilities: ['supervise'], reports: 15 }),
      L('manager', 'District Office Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }),
      L('regional', 'Regional Commissioner', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 8000 }),
    ],
  },
};

export const GOV_EVENTS = {
  postal: [
    { title: 'The Dog on Route 14', text: 'A loose pit bull charges you at the gate.', options: [
      { id: 'spray', label: '🧴 Use your dog spray and back away', perf: 2 },
      { id: 'skip', label: '📭 Skip the house and file a dog warning', perf: 1 },
    ] },
    { title: 'Mandatory Overtime in December', text: 'Peak season: 12-hour days, six days a week.', options: [
      { id: 'work', label: '📦 Carry it all', perf: 5, stress: 6 },
      { id: 'grieve', label: '✊ File a grievance over the overtime list', perf: 0 },
    ] },
  ],
  fbi: [
    { title: 'Wire Room', text: 'Your Title III wiretap catches a cartel facilitator discussing a shipment — and a corrupt sheriff.', options: [
      { id: 'build', label: '🗂️ Keep building the case', perf: 7, stress: 4 },
      { id: 'arrest', label: '🚔 Move now before the evidence moves', perf: 4, risk: 0.15 },
    ] },
  ],
  dea: [
    { title: 'Controlled Buy', text: 'Your informant wants to go into the stash house alone.', options: [
      { id: 'cover', label: '🚗 Cover him from the van', perf: 6, risk: 0.15 },
      { id: 'abort', label: '🛑 Abort the buy', perf: -2 },
    ] },
  ],
  atf: [
    { title: 'Suspicious Device', text: 'A pipe bomb is found outside a courthouse.', options: [
      { id: 'render', label: '💣 Render it safe yourself', perf: 9, risk: 0.2 },
      { id: 'robot', label: '🤖 Wait for the robot', perf: 4 },
    ] },
  ],
  usms: [
    { title: 'Fugitive Warrant', text: 'A murder suspect who skipped trial is holed up in his mother\'s house.', options: [
      { id: 'knock', label: '🚪 Knock and announce with the task force', perf: 7, risk: 0.2 },
      { id: 'wait', label: '⏳ Surround it and wait him out', perf: 5 },
    ] },
  ],
  usss: [
    { title: 'Rope Line', text: 'At a campaign event, a man in the crowd reaches into his jacket.', options: [
      { id: 'cover', label: '🛡️ Cover and evacuate the protectee', perf: 8, risk: 0.1 },
      { id: 'watch', label: '👀 Keep eyes on him and radio it in', perf: 3 },
    ] },
  ],
  benefitsClaims: [
    { title: 'The Backlog', text: 'Your office has 4,000 pending claims. Management wants decisions out faster.', options: [
      { id: 'careful', label: '🔍 Keep developing each file properly', perf: 2, stress: 3 },
      { id: 'fast', label: '⏩ Speed up — deny when the file is thin', perf: 5, boss: 4 },
    ] },
    { title: 'A Veteran at the Counter', text: 'A Vietnam veteran with Agent Orange exposure was denied years ago and doesn\'t know he can reopen.', options: [
      { id: 'help', label: '🤝 Walk him through a supplemental claim', perf: 4 },
      { id: 'next', label: '🎟️ Take the next number', perf: 0 },
    ] },
  ],
};

// Their on-the-job incidents play through the shared incident module (JusticeCareers.js).
Object.assign(JUSTICE_EVENTS, GOV_EVENTS);
for (const [id, p] of Object.entries(GOV_PROFESSIONS)) INCIDENT_ICONS[id] = p.icon;
