/**
 * Units of command. In a government agency a supervisory rank runs a real
 * unit: a sergeant a squad, a fire lieutenant a company, a captain a station
 * or precinct, a battalion chief a battalion, a deputy chief a division, a
 * principal a school, a warden a facility, an SAC a field office. The unit
 * has a name and a size, and its size is the department you manage.
 *
 * Units are named the way the agency itself names them (an FBI squad works a
 * program — "Violent Crimes Squad"; a TSA supervisor runs a checkpoint; an air
 * traffic supervisor an area; a UK watch manager Red Watch) and nest: a squad
 * sits within a watch, a watch within a precinct. Numbering is stable for an
 * employer, so promotion keeps you in the same precinct or field office.
 * Front-line staff are posted to the smallest unit (assignmentFor).
 *
 * job.department.unit = { kind, name, staff, within? }
 */
import { GOV_SECTORS } from './Ladder.js';
import { currentCountry } from '../../core/Locale.js';
import { STATES } from '../life/States.js';

/** Unit kinds: typical staff [min, max]; the agency's own size caps them. */
export const UNIT_KINDS = {
  squad: { label: 'Squad', staff: [6, 12] },
  detectiveSquad: { label: 'Detective squad', staff: [6, 14] },
  team: { label: 'Team', staff: [6, 15] },
  company: { label: 'Company', staff: [8, 16] },
  watch: { label: 'Watch', staff: [25, 60] },
  station: { label: 'Station', staff: [15, 40] },
  precinct: { label: 'Precinct', staff: [120, 320] },
  battalion: { label: 'Battalion', staff: [90, 220] },
  division: { label: 'Division', staff: [300, 1500] },
  bureau: { label: 'Bureau', staff: [1500, 9000] },
  school: { label: 'School', staff: [40, 140] },
  department: { label: 'Department', staff: [6, 18] },
  gradeTeam: { label: 'Grade team', staff: [8, 30] },
  facility: { label: 'Facility', staff: [150, 700] },
  housingUnit: { label: 'Housing unit', staff: [12, 40] },
  fieldOffice: { label: 'Field office', staff: [150, 1200] },
  office: { label: 'Office', staff: [20, 150] },
  postOffice: { label: 'Post office', staff: [15, 120] },
  plant: { label: 'Plant', staff: [20, 120] },
  district: { label: 'District', staff: [30, 200] },
  section: { label: 'Section', staff: [10, 60] },
  branch: { label: 'Branch', staff: [12, 40] },
  region: { label: 'Region', staff: [300, 3000] },
  shift: { label: 'Shift', staff: [25, 60] },
  airport: { label: 'Airport', staff: [200, 1500] },
};

const FIRE = ['fire', 'airportFire', 'stateFire'];
const POLICE = ['police', 'sheriff', 'transitPolice', 'universityPolice', 'airportPolice', 'statePolice', 'privatePolice'];
const CORRECTIONS = ['jail', 'corrections', 'federalPrisons', 'privatePrisons'];
const FEDERAL_LE = ['fbi', 'dea', 'atf', 'usms', 'usss', 'hsi'];

/** A national agency abroad runs on its US template's structure (gb_fbi → fbi). */
const baseId = (id) => String(id).replace(/^[a-z]{2}_/, '');
/** The kind of agency, for naming its units. */
function familyOf(id) {
  if (POLICE.includes(id)) return 'police';
  if (FEDERAL_LE.includes(id)) return 'federalLE';
  if (FIRE.includes(id)) return 'fire';
  if (id === 'ems' || id === 'privateEms') return 'ems';
  if (CORRECTIONS.includes(id)) return 'corrections';
  if (id === 'education') return 'school';
  return 'agency';
}

/* ------------------------------------------------------------------ */
/* What each rank commands                                             */
/* ------------------------------------------------------------------ */

/** By level id (stable across countries, whatever the rank is called there). */
const FAMILY_KINDS = {
  police: { sergeant: 'squad', detSergeant: 'detectiveSquad', lieutenant: 'watch', detLieutenant: 'detectiveSquad', captain: 'precinct', detCaptain: 'division', major: 'division', deputyChief: 'bureau', undersheriff: 'bureau', commander: 'precinct' },
  federalLE: { ssa: 'squad', asac: 'division', sac: 'fieldOffice' },
  fire: { lieutenant: 'company', captain: 'station', battalion: 'battalion', deputyChief: 'division', division: 'division', unitChief: 'region' },
  ems: { fto: null, supervisor: 'company', captain: 'station', deputy: 'division' },
  corrections: { sergeant: 'housingUnit', lieutenant: 'shift', captain: 'shift', commander: 'facility', associateWarden: 'facility', deputyWarden: 'facility', warden: 'facility', regional: 'region' },
  school: { chair: 'department', ap: 'gradeTeam', principal: 'school', director: 'district', assistantSuper: null, superintendent_cmd1: 'district', superintendent_cmd2: null },
};
const PROFESSION_KINDS = {
  usms: { asac: 'district', sac: 'bureau' },
  tsa: { supervisor: 'team', manager: 'section', fsd: 'airport' },
  borderPatrol: { supervisory: 'team', watch: 'watch', pail: 'station', chiefPatrol: 'region' },
  airTrafficControl: { supervisor: 'team', manager: 'office' },
  postal: { supervisor: 'team', postmaster: 'postOffice', plantManager: 'plant', district: 'district' },
  benefitsClaims: { supervisor: 'team', manager: 'office', regional: 'region' },
  dispatch: { supervisor: 'shift' },
  probation: { supervisor: 'team' },
  forensics: { supervisor: 'section' },
  transit: { streetSupervisor: 'section', superintendent: 'division' },
  transitMaintenance: { foreman: 'team', superintendent: 'division' },
  schoolBus: { supervisor: 'station' },
  publicHealth: { supervisor: 'section' },
  library: { branch: 'branch' },
  waterUtility: { chief: 'plant', superintendent: 'division' },
  animalControl: { supervisor: 'team' },
  caseOfficer: { dcos: 'station', cos: 'station', divisionChief: 'division' },
  sigint: { branchChief: 'branch', deputyChief: 'division' },
  intelligence: { branchChief: 'branch', divisionChief: 'division' },
  meteorology: { mic: 'office', regional: 'region' },
  communityCollege: { chair: 'department', dean: 'division' },
  university: { chair: 'department', dean: 'division' },
  nationalLab: { group: 'team', division: 'division' },
  municipalAdmin: { manager: 'department', acm: 'division' },
  publicWorks: { supervisor: 'team', superintendent: 'division' },
  councilInspector: { supervisor: 'section', manager: 'division' },
  planning: { manager: 'section' },
  revenue: { supervisor: 'team', deputy: 'bureau' },
  cps: { supervisor: 'team', manager: 'division', regional: 'region' },
  gameWarden: { sergeant: 'team', captain: 'district' },
  environmental: { manager: 'section' },
  forester: { district: 'district' },
  dot: { crew: 'team', district: 'district' },
  prosecution: { chiefDeputy: 'division' },
  publicDefender: { supervising: 'team' },
  regulatory: { supervisory: 'team', branchChief: 'branch', deputy: 'bureau' },
  foreignService: { consul: 'office', dcm: 'office' },
  oig: { supervisory: 'team', aig: 'bureau' },
  parkService: { district: 'district', chief: 'division' },
  courts: { admin: 'office' },
  legislativeStaff: { deputyCos: null },
};
/** The agency's top post runs the whole thing: no unit of its own. */
const TOP = /^(chief|director|superintendent|commissioner|gm|administrator|ig|state|ambassador|cos|stateAdmin|president|provost|buildingOfficial|first|cityManager|usMarshal|chiefPatrol|regional|fsd|sac|divisionChief|deputyDirector|undersheriff)$/;

/** What a rank commands: its own entry, its family's, then the command tiers above the field ranks. */
/** UK fire ranks: a crew manager has an appliance, a watch manager a watch, a station manager the station, a group manager a group. */
const UK_FIRE_KINDS = { lieutenant: 'company', captain: 'watch', battalion: 'station', deputyChief: 'battalion' };

export function unitKind(profession, level) {
  const id = baseId(profession.id);
  // Whoever runs the whole body has no sub-unit of their own.
  if (/chief executive|director[- ]general|secretary[- ]general/i.test(level.title)) return null;
  if (FIRE.includes(id) && britishFire(profession) && level.id in UK_FIRE_KINDS) return UK_FIRE_KINDS[level.id];
  const own = PROFESSION_KINDS[id] ?? {};
  if (level.id in own) return own[level.id];
  const fam = FAMILY_KINDS[familyOf(id)] ?? {};
  if (level.id in fam) return fam[level.id];
  // Command tiers between the field and the top (Ladder's "_cmdN"): divisions, then bureaus/directorates.
  const cmd = /_cmd(\d)$/.exec(level.id);
  if (cmd) {
    const n = Number(cmd[1]);
    const tiers = profession.levels.filter((l) => l.id.startsWith(level.id.replace(/\d$/, ''))).length;
    if (/chief of department/i.test(level.title) && n === tiers) return null; // runs operations for the chief
    if (familyOf(id) === 'federalLE' || /section chief/i.test(level.title)) return n === 1 ? 'section' : 'bureau';
    if (familyOf(id) === 'corrections') return n === 1 ? 'facility' : n === 2 ? 'region' : 'bureau';
    if (familyOf(id) === 'police' && n === 1) return 'precinct';
    return n === 1 ? 'division' : 'bureau';
  }
  if (TOP.test(level.id)) return null;
  // Anything else that supervises: a section of the agency.
  return level.abilities?.includes('supervise') ? 'section' : null;
}

/* ------------------------------------------------------------------ */
/* Names                                                               */
/* ------------------------------------------------------------------ */

const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 >= 11 && n % 100 <= 13) ? 0 : n % 10] ?? 'th'}`;
function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
const pick = (list, n) => list[n % list.length];
const COMPASS = ['North', 'South', 'East', 'West', 'Central'];
const LETTER = (n) => String.fromCharCode(65 + (n % 6));

/** Ranked like the UK (sergeant → inspector → chief inspector), not the US (… lieutenant → captain). */
const britishPolice = (p) => !p.levels.some((l) => /captain/i.test(l.title)) && p.levels.some((l) => /chief inspector/i.test(l.title));
const britishFire = (p) => p.levels.some((l) => /watch manager/i.test(l.title));

const SCHOOL_NAMES = {
  US: [['Lincoln', 'Washington', 'Roosevelt', 'Jefferson', 'Kennedy', 'Franklin', 'Madison', 'King'], ['Elementary', 'Middle School', 'High School']],
  GB: [['St Mary\'s', 'Castle', 'Park', 'Hillside', 'Riverside', 'King\'s', 'Queen\'s', 'Oakwood'], ['Primary School', 'Academy', 'High School']],
  IE: [['St Patrick\'s', 'St Brigid\'s', 'Scoil Mhuire', 'Coláiste Éanna', 'St Joseph\'s', 'Presentation'], ['National School', 'Community School', 'Secondary School']],
  AU: [['Parkside', 'Hillcrest', 'Bayview', 'Riverside', 'St Mary\'s', 'Kingsway'], ['Primary School', 'High School', 'Secondary College']],
  NZ: [['Parkside', 'Hillcrest', 'Bayview', 'St Mary\'s', 'Te Kura', 'Kingsway'], ['School', 'Intermediate', 'College']],
  CA: [['Maple Grove', 'Lakeview', 'Sir John A. Macdonald', 'Laurier', 'Riverside', 'Westdale'], ['Elementary School', 'Middle School', 'Secondary School']],
  FR: [['Victor Hugo', 'Jean Moulin', 'Jules Ferry', 'Marie Curie', 'Louis Pasteur', 'Jean Jaurès'], ['École', 'Collège', 'Lycée']],
  DE: [['Goethe', 'Schiller', 'Humboldt', 'Lessing', 'Am Park', 'Kepler'], ['Grundschule', 'Realschule', 'Gymnasium']],
  IT: [['Dante Alighieri', 'Giuseppe Garibaldi', 'Galileo Galilei', 'Alessandro Manzoni', 'Leonardo da Vinci'], ['Scuola primaria', 'Scuola media', 'Liceo']],
  ES: [['Cervantes', 'Antonio Machado', 'Federico García Lorca', 'Ramón y Cajal', 'Severo Ochoa'], ['CEIP', 'IES', 'Colegio']],
};
const schoolTable = (cc) => SCHOOL_NAMES[cc] ?? [['North', 'South', 'East', 'West', 'Central', 'Riverside'], ['Primary School', 'Middle School', 'Secondary School']];
/** 0 primary, 1 middle, 2 high: which stage a numbered school is. */
const schoolStage = (n, cc) => { const [names, kinds] = schoolTable(cc); return Math.floor(n / names.length) % kinds.length; };
/** A grade team in a school of that stage: no 11th grade at an elementary school. */
function gradeTeamName(n, schoolN, cc) {
  const stage = schoolStage(schoolN, cc);
  if (cc === 'US') {
    const grades = [['Kindergarten', '1st-grade', '2nd-grade', '3rd-grade', '4th-grade', '5th-grade'], ['6th-grade', '7th-grade', '8th-grade'], ['9th-grade', '10th-grade', '11th-grade', '12th-grade']][stage];
    return `${pick(grades, n)} team`;
  }
  if (['GB', 'IE', 'AU', 'NZ'].includes(cc)) return `Year ${stage === 0 ? 1 + (n % 6) : 7 + (n % 5)} team`;
  return `Grade ${stage === 0 ? 1 + (n % 6) : stage === 1 ? 7 + (n % 3) : 10 + (n % 3)} team`;
}
function schoolName(n, cc) {
  const [names, kinds] = schoolTable(cc);
  const name = pick(names, n);
  const kind = kinds[schoolStage(n, cc)];
  return ['FR', 'DE', 'IT', 'ES'].includes(cc) ? (cc === 'DE' ? `${name}-${kind}` : `${kind} ${name}`) : `${name} ${kind}`;
}

/** Named units by agency: kind → list (picked by number) or (n, ctx) => name. */
const NAMES = {
  fbi: {
    squad: ['Violent Crimes', 'Counterterrorism', 'Public Corruption', 'Cyber', 'Organized Crime', 'Counterintelligence', 'White-Collar Crime', 'Crimes Against Children'],
    division: ['Criminal Branch', 'National Security Branch', 'Intelligence Branch', 'Administrative Branch'],
    section: ['Violent Crime Section', 'Counterterrorism Operations Section', 'Public Corruption Section', 'Cyber Operations Section', 'Transnational Organized Crime Section'],
    bureau: ['Criminal Investigative Division', 'Counterterrorism Division', 'Cyber Division', 'Counterintelligence Division', 'Training Division'],
  },
  dea: {
    squad: ['Enforcement Group 1', 'Enforcement Group 2', 'Enforcement Group 3', 'Tactical Diversion Squad', 'Financial Investigations Group', 'Task Force Group'],
    division: ['Enforcement Division', 'Diversion & Intelligence Division'],
    section: ['Opioid Trafficking Section', 'Financial Operations Section', 'Special Operations Section'],
    bureau: ['Operations Division', 'Intelligence Division', 'Diversion Control Division', 'Operational Support Division'],
  },
  atf: {
    squad: ['Firearms Trafficking Group', 'Violent Crime Group', 'Arson & Explosives Group', 'Industry Operations Group'],
    division: ['Criminal Enforcement Branch', 'Industry Operations Branch'],
    section: ['Firearms Operations Section', 'Explosives Section', 'Intelligence Section'],
    bureau: ['Office of Field Operations', 'Enforcement Programs & Services', 'Office of Science & Technology', 'Office of Management'],
  },
  usms: {
    squad: ['Fugitive Task Force', 'Judicial Security Team', 'Prisoner Operations Team', 'Asset Forfeiture Team', 'Sex Offender Investigations Team'],
    district: (n, c) => `District of ${c.state ?? c.city}`,
    section: ['Investigative Operations Section', 'Judicial Security Section', 'Witness Security Section'],
    bureau: ['Investigative Operations Division', 'Judicial Security Division', 'Prisoner Operations Division', 'Witness Security Division'],
  },
  usss: {
    squad: ['Protective Detail', 'Financial Crimes Squad', 'Cyber Fraud Task Force', 'Protective Intelligence Squad'],
    division: ['Investigations Branch', 'Protective Operations Branch'],
    section: ['Protective Operations Section', 'Investigations Section', 'Technical Security Section'],
    bureau: ['Office of Protective Operations', 'Office of Investigations', 'Office of Training', 'Office of Strategic Intelligence'],
  },
  borderPatrol: {
    team: (n, c) => (c.cc === 'US' ? pick(['Line Watch Unit', 'Checkpoint Unit', 'Horse Patrol Unit', 'ATV Unit', 'Marine Unit', 'Canine Unit'], n) : pick(['Port Operations Team', 'Freight Team', 'Passenger Team', 'Maritime Team', 'Detection Team', 'Intelligence Team'], n)),
    watch: ['Day Watch', 'Evening Watch', 'Night Watch'],
    station: (n, c) => (c.cc === 'US' ? `${pick(COMPASS, n)} ${c.city} Station` : `${c.city} ${pick(['Port', 'Airport', 'Seaport', 'Rail Terminal'], n)}`),
    section: ['Tactical Operations Section', 'Intelligence Section', 'Training Section'],
    bureau: ['Law Enforcement Operations Directorate', 'Mission Readiness Directorate', 'Mission Support Directorate'],
  },
  tsa: {
    team: ['Checkpoint A', 'Checkpoint B', 'Checkpoint C', 'Checked Baggage Screening', 'Cargo Screening', 'PreCheck Lane'],
    section: (n, c) => `${pick(['Terminal A', 'Terminal B', 'Terminal C', 'Baggage', 'International Terminal'], n)} Screening Operations`,
    airport: (n, c) => `${c.city} International Airport`,
    division: ['Checkpoint Programs', 'Screening Technology', 'Canine Program'],
    bureau: ['Security Operations', 'Enrollment Services & Vetting', 'Federal Air Marshal Service', 'Requirements & Capabilities Analysis'],
  },
  airTrafficControl: {
    team: (n, c) => (c.cc === 'US' ? `Area ${LETTER(n)}` : `Watch ${n % 5 + 1}`),
    office: (n, c) => (c.cc === 'US' ? `${c.city} ${pick(['TRACON', 'Tower', 'Air Route Traffic Control Center'], n)}` : `${c.city} ${pick(['Approach Control', 'Tower', 'Area Control Centre'], n)}`),
    division: ['Terminal Services', 'En Route & Oceanic Services', 'System Operations Services', 'Technical Operations'],
    bureau: ['Air Traffic Organization', 'Aviation Safety', 'Airports'],
  },
  postal: {
    team: (n, c) => (c.cc === 'US' ? pick(['Carrier Unit', 'Retail Unit', 'Box Section', 'Dock Operations', 'Parcel Unit'], n) : pick(['Delivery Team', 'Collections Team', 'Parcel Team', 'Counter Team'], n)),
    postOffice: (n, c) => (c.cc === 'US' ? `${c.city} ${pick(['Main', 'Downtown', 'Northside', 'Southside', 'Westgate'], n)} Post Office` : `${c.city} ${pick(COMPASS, n)} Delivery Office`),
    plant: (n, c) => (c.cc === 'US' ? `${c.city} Processing & Distribution Center` : `${c.city} Mail Centre`),
    district: (n, c) => `${c.state ?? c.city} District`,
    division: ['Retail & Delivery Operations', 'Processing Operations', 'Logistics'],
    bureau: ['Operations', 'Logistics & Processing', 'Customer & Retail'],
  },
  benefitsClaims: {
    team: ['Initial Claims Unit', 'Disability Unit', 'Reconsideration Unit', 'Overpayments Unit', 'Appeals Unit', 'Survivors Unit'],
    office: (n, c) => `${c.city} ${pick(['Field Office', 'Benefits Centre', 'Processing Center'], c.cc === 'US' ? 0 : 1)}`,
    division: ['Disability Operations', 'Hearings Operations', 'Central Operations', 'Retirement & Survivors Benefits'],
  },
  dispatch: { shift: (n, c) => (c.cc === 'US' ? `${LETTER(n % 4)} Shift` : pick(['Red Watch', 'White Watch', 'Blue Watch', 'Green Watch'], n)) },
  probation: { team: ['Intake Unit', 'High-Risk Supervision Unit', 'Sex Offender Unit', 'Drug Court Unit', 'Pretrial Services Unit', 'Reentry Unit'] },
  forensics: { section: ['DNA Unit', 'Latent Prints Unit', 'Firearms & Toolmarks Unit', 'Toxicology Unit', 'Drug Chemistry Unit', 'Digital Evidence Unit'] },
  transit: {
    section: (n) => `${pick(COMPASS, n)} Garage`,
    division: ['Bus Operations', 'Rail Operations', 'Paratransit & Contracted Services'],
  },
  transitMaintenance: {
    team: (n) => `${pick(COMPASS, n)} Garage Maintenance`,
    division: ['Bus Maintenance', 'Rail Car Maintenance', 'Facilities Maintenance'],
  },
  schoolBus: { station: (n) => `${pick(COMPASS, n)} Bus Depot` },
  publicHealth: { section: ['Food Safety Program', 'Environmental Health Program', 'Immunization Program', 'Epidemiology Unit', 'Maternal & Child Health Program'] },
  library: { branch: (n, c) => `${c.city} ${pick(['Central', 'Eastside', 'Westside', 'Northgate', 'Riverside'], n)} Library` },
  waterUtility: {
    plant: (n) => `${pick(COMPASS, n)} ${n % 2 ? 'Wastewater' : 'Water'} Treatment Plant`,
    division: ['Water Treatment Division', 'Wastewater Division', 'Distribution & Collection Division'],
  },
  animalControl: { team: ['Field Services', 'Shelter Operations', 'Licensing & Enforcement'] },
  caseOfficer: {
    station: (n) => `Station ${pick(['Vienna', 'Cairo', 'Islamabad', 'Bogotá', 'Nairobi', 'Jakarta', 'Istanbul', 'Kyiv', 'Amman', 'Manila', 'Bangkok', 'Lagos'], n)}`,
    division: ['Near East Mission Center', 'Europe & Eurasia Mission Center', 'East Asia & Pacific Mission Center', 'Africa Mission Center', 'Counterterrorism Mission Center'],
    bureau: ['Directorate of Operations', 'Directorate of Analysis', 'Directorate of Digital Innovation'],
  },
  sigint: {
    branch: ['Russia Branch', 'China Branch', 'Counterterrorism Branch', 'Cyber Threats Branch', 'Middle East Branch', 'Weapons & Space Branch'],
    division: ['Analysis & Production', 'Cybersecurity', 'Foreign Partnerships', 'Collection Operations'],
    bureau: ['Signals Intelligence Directorate', 'Cybersecurity Directorate', 'Research Directorate'],
  },
  intelligence: {
    branch: ['Russia Branch', 'China Branch', 'Middle East Branch', 'Weapons Proliferation Branch', 'Counterterrorism Branch', 'Latin America Branch'],
    division: ['Russia & Europe Analysis', 'East Asia Analysis', 'Near East Analysis', 'Transnational Issues'],
  },
  meteorology: {
    office: (n, c) => `${c.city} ${c.cc === 'US' ? 'Forecast Office' : 'Weather Centre'}`,
    division: ['Observations', 'Science & Technology Integration', 'Analysis & Forecast Support'],
  },
  communityCollege: { department: ['Mathematics Department', 'English Department', 'Nursing & Allied Health', 'Business & Technology', 'Skilled Trades'], division: ['Academic Affairs', 'Workforce Education', 'Student Services'] },
  university: { department: ['Department of Economics', 'Department of Chemistry', 'Department of History', 'Department of Computer Science', 'Department of Psychology', 'Department of Biology'], division: ['College of Arts & Sciences', 'College of Engineering', 'Graduate School', 'College of Business'] },
  nationalLab: {
    team: ['Materials Science Group', 'Nuclear Physics Group', 'Computational Science Group', 'Climate Modeling Group', 'Accelerator Physics Group', 'Fusion Energy Group'],
    division: ['Physical Sciences Directorate', 'Energy & Environment Directorate', 'Computing Directorate', 'National Security Directorate'],
  },
  municipalAdmin: {
    department: (n, c) => pick(c.cc === 'US' ? ['Budget Office', 'Human Resources', 'Parks & Recreation', 'Finance Department', 'Information Technology', 'Community Development'] : ['Finance', 'Human Resources', 'Housing', 'Leisure & Culture', 'Customer Services', 'Regeneration'], n),
    division: (n, c) => pick(c.cc === 'US' ? ['Community Services', 'Operations', 'Administrative Services'] : ['Place Directorate', 'People Directorate', 'Resources Directorate'], n),
  },
  publicWorks: {
    team: ['Streets Crew', 'Sanitation Crew', 'Fleet Shop', 'Stormwater Crew', 'Traffic Signals Crew', 'Parks Maintenance Crew'],
    division: ['Streets & Sanitation Division', 'Engineering Division', 'Fleet & Facilities Division'],
  },
  councilInspector: { section: ['Building Inspections', 'Code Enforcement', 'Housing Inspections', 'Food & Health Inspections'], division: ['Building Control', 'Environmental Health', 'Licensing'] },
  planning: { section: ['Current Planning', 'Long-Range Planning', 'Zoning Administration', 'Historic Preservation'] },
  revenue: {
    team: ['Field Audit Group', 'Sales & Use Tax Audit', 'Collections Unit', 'Taxpayer Services', 'Criminal Investigations Unit'],
    bureau: ['Compliance Division', 'Taxpayer Services Division', 'Tax Policy Division'],
  },
  cps: {
    team: ['Intake Unit', 'Investigations Unit', 'Ongoing Services Unit', 'Foster Care Unit', 'Adoption Unit'],
    division: ['Child Protection Program', 'Foster Care Program', 'Family Preservation Program'],
  },
  gameWarden: { team: (n) => `Warden Area ${n}`, district: (n) => `${pick(COMPASS, n)} District` },
  environmental: { section: ['Air Quality Program', 'Water Quality Program', 'Waste Management Program', 'Remediation Program'], division: ['Air Quality Division', 'Water Resources Division', 'Waste Management Division'] },
  forester: { district: (n) => `${pick(COMPASS, n)} District` },
  dot: { team: (n) => `Maintenance Shed ${n}`, district: (n) => `District ${n}` },
  prosecution: { division: ['Trial Division', 'Major Crimes Division', 'Juvenile Division', 'Appeals Division'] },
  publicDefender: { team: ['Felony Trial Unit', 'Misdemeanor Unit', 'Juvenile Unit', 'Appeals Unit'] },
  regulatory: {
    team: (n) => `Examination Team ${n % 9 + 1}`,
    branch: ['Broker-Dealer Branch', 'Investment Adviser Branch', 'Market Oversight Branch', 'Disclosure Review Branch'],
    division: ['Enforcement', 'Examinations', 'Trading & Markets', 'Corporation Finance'],
    bureau: ['Enforcement Directorate', 'Supervision Directorate', 'Policy Directorate'],
  },
  foreignService: {
    office: (n, c) => (c.cc === 'US' ? `U.S. ${pick(['Embassy', 'Consulate General'], n)} ${pick(['Vienna', 'Lagos', 'Lima', 'Hanoi', 'Warsaw', 'Nairobi'], n)}` : `${pick(['Embassy', 'Consulate-General', 'High Commission'], n)} in ${pick(['Vienna', 'Lagos', 'Lima', 'Hanoi', 'Warsaw', 'Nairobi'], n)}`),
    division: (n, c) => pick(c.cc === 'US' ? ['Bureau of European Affairs', 'Bureau of Near Eastern Affairs', 'Bureau of African Affairs', 'Bureau of East Asian & Pacific Affairs', 'Bureau of Consular Affairs'] : ['Europe Directorate', 'Middle East & North Africa Directorate', 'Africa Directorate', 'Indo-Pacific Directorate', 'Consular Directorate'], n),
  },
  oig: { team: (n) => `Audit Team ${n % 9 + 1}`, section: ['Contract Audits Section', 'Program Audits Section', 'Financial Audits Section'], bureau: ['Office of Audits', 'Office of Investigations', 'Office of Evaluations & Inspections'] },
  parkService: { district: ['Backcountry District', 'Frontcountry District', 'Lakeshore District', 'Mountain District'], division: ['Visitor & Resource Protection', 'Interpretation & Education', 'Resource Management'] },
  courts: { office: (n, c) => `${c.city} Court Administration` },
};

/** Family names (police, fire, schools...), used when the agency has none of its own. */
function familyName(family, kind, n, c, profession) {
  const uk = family === 'police' && britishPolice(profession);
  const ukFire = (family === 'fire' || family === 'ems') && britishFire(profession);
  const id = baseId(profession.id);
  switch (`${family}:${kind}`) {
    case 'police:squad': return uk ? `Response Team ${n % 6 + 1}` : `Squad ${n}`;
    case 'police:detectiveSquad': return uk ? pick(['CID Team 1', 'CID Team 2', 'Major Investigation Team', 'Public Protection Unit', 'Proactive Crime Team'], n) : pick(['Robbery Squad', 'Burglary Squad', 'Narcotics Squad', 'Homicide Squad', 'Special Victims Squad', 'Auto Theft Squad', 'Financial Crimes Squad'], n);
    case 'police:watch': return uk ? `Shift ${LETTER(n % 5)}` : pick(['Day Watch', 'Evening Watch', 'Night Watch', 'First Platoon', 'Second Platoon', 'Third Platoon'], n);
    case 'police:precinct': return uk ? `${c.city} ${pick(COMPASS, n)} Local Policing Area` : c.cc === 'US' && id !== 'sheriff' && id !== 'statePolice' ? `${ordinal(n)} Precinct` : id === 'statePolice' && c.cc === 'US' ? `Troop ${LETTER(n)}` : `${pick(COMPASS, n)} District`;
    case 'police:division': return uk ? `${c.city} Division` : pick(['Patrol Division', 'Investigations Division', 'Special Operations Division', 'Support Division'], n);
    case 'police:bureau': return uk ? pick(['Local Policing Command', 'Crime Command', 'Operations Command', 'Specialist Operations'], n) : pick(['Bureau of Operations', 'Patrol Services Bureau', 'Special Operations Bureau', 'Support Services Bureau'], n);
    case 'fire:company': return ukFire ? `${pick(['Pump', 'Pump Ladder', 'Rescue Pump', 'Aerial Ladder Platform'], n)} ${n % 9 + 1}` : c.cc === 'US' ? `${n % 3 === 0 ? 'Ladder' : 'Engine'} ${n}` : `${pick(['Pump', 'Ladder', 'Rescue Tender', 'Water Tender'], n)} ${n}`;
    case 'fire:watch': return pick(['Red Watch', 'White Watch', 'Blue Watch', 'Green Watch'], n);
    case 'ems:company': return c.cc === 'US' ? `Medic ${n}` : `Ambulance Crew ${n % 12 + 1}`;
    case 'fire:station': return ukFire ? `${c.city} ${pick(COMPASS, n)} Fire Station` : `Station ${n}`;
    case 'ems:station': return c.cc === 'US' ? `Station ${n}` : `${c.city} ${pick(COMPASS, n)} Ambulance Station`;
    case 'fire:battalion': return ukFire ? `${c.city} Group` : `Battalion ${n}`;
    case 'fire:division': return ukFire ? `${pick(COMPASS, n)} Area` : `Division ${n}`;
    case 'ems:division': return c.cc === 'US' ? `Division ${n}` : `${pick(COMPASS, n)} Division`;
    case 'fire:region': return `${c.city} Unit`;
    case 'fire:bureau': return pick(['Fire Operations Bureau', 'Fire Prevention Bureau', 'Special Operations Bureau', 'Support Services Bureau'], n);
    case 'ems:bureau': return pick(['Field Operations Bureau', 'Clinical Services Bureau', 'Communications & Logistics Bureau', 'Support Services Bureau'], n);
    case 'corrections:housingUnit': return c.cc === 'US' ? `Housing Unit ${String.fromCharCode(65 + (n % 8))}` : `${String.fromCharCode(65 + (n % 8))} Wing`;
    case 'corrections:shift': return pick(['Day Shift', 'Evening Shift', 'Night Shift', 'Relief Shift'], n);
    case 'corrections:facility': return c.cc === 'GB' ? `HMP ${pick(['Northfield', 'Riverside', 'Castle Hill', 'Moorland', 'Highpoint'], n)}` : c.cc !== 'US' ? `${c.city} ${pick(['Prison', 'Remand Centre', 'Correctional Centre'], n)}` : `${pick(['North', 'South', 'River', 'Valley', 'Central'], n)} ${id === 'jail' ? 'Detention Center' : 'Correctional Facility'}`;
    case 'corrections:bureau': return pick(['Institutions Bureau', 'Community Corrections Bureau', 'Security Operations Bureau', 'Programs & Reentry Bureau'], n);
    case 'federalLE:fieldOffice': return `${c.city} ${c.cc === 'US' ? 'Field Office' : 'Office'}`;
    case 'federalLE:squad': return `Squad ${n}`;
    case 'school:school': return schoolName(n, c.cc);
    case 'school:department': return pick(['Mathematics Department', 'English Department', 'Science Department', 'History Department', 'Languages Department', 'Arts Department', 'Physical Education Department'], n);
    case 'school:gradeTeam': return gradeTeamName(n, c.employer ? numberFor(c.employer, 'school', countFor('school', c.employer.agencyStaff)) : n, c.cc);
    case 'school:district': return `${pick(COMPASS, n)} Network`;
    default: return null;
  }
}

/** Generic names for any agency. */
function genericName(kind, n, c) {
  switch (kind) {
    case 'squad': case 'team': return `Team ${n % 12 + 1}`;
    case 'company': return `Crew ${n}`;
    case 'watch': case 'shift': return pick(['Day Shift', 'Evening Shift', 'Night Shift', 'Relief Shift'], n);
    case 'station': return `Station ${n}`;
    case 'precinct': case 'district': return `${pick(COMPASS, n)} District`;
    case 'battalion': return `Battalion ${n}`;
    case 'division': return pick(['Operations Division', 'Programs Division', 'Field Services Division', 'Administrative Services Division', 'Policy & Planning Division'], n);
    case 'bureau': return pick(['Operations Directorate', 'Programs Directorate', 'Policy & Planning Directorate', 'Corporate Services Directorate'], n);
    case 'section': return pick(['Operations Section', 'Programs Section', 'Compliance Section', 'Field Services Section', 'Support Section', 'Planning Section'], n);
    case 'branch': return pick(['Operations Branch', 'Analysis Branch', 'Policy Branch', 'Programs Branch', 'Technical Branch'], n);
    case 'region': return `${pick(['Northern', 'Southern', 'Eastern', 'Western', 'Central'], n)} Region`;
    case 'office': return `${c.city} Office`;
    case 'plant': return `Plant ${n}`;
    case 'department': return pick(['Operations', 'Finance', 'Human Resources', 'Programs'], n);
    case 'facility': return `${pick(COMPASS, n)} Facility`;
    case 'airport': return `${c.city} Airport`;
    default: return null;
  }
}

function unitName(kind, n, profession, employer) {
  const id = baseId(profession.id);
  const c = { city: employer.city ?? employer.cityName ?? 'Metro', state: STATES[employer.stateId]?.name ?? null, cc: currentCountry() ?? 'US', employer };
  const own = NAMES[id]?.[kind];
  if (own) {
    const name = typeof own === 'function' ? own(n, c) : pick(own, n);
    // A federal squad works a program: "Violent Crimes Squad" (a "team" abroad).
    return familyOf(id) === 'federalLE' && kind === 'squad' && !/Squad|Group|Team|Task Force|Detail/.test(name) ? `${name} ${c.cc === 'US' ? 'Squad' : 'Team'}` : name;
  }
  return familyName(familyOf(id), kind, n, c, profession) ?? genericName(kind, n, c);
}

/* ------------------------------------------------------------------ */
/* Nesting                                                             */
/* ------------------------------------------------------------------ */

/** Each family's units from smallest to largest; a unit sits within the next one up. */
const CHAINS = {
  police: ['squad', 'watch', 'precinct', 'division', 'bureau'],
  federalLE: ['squad', 'division', 'fieldOffice'],
  fire: ['company', 'station', 'battalion', 'division', 'bureau'],
  ems: ['company', 'station', 'division', 'bureau'],
  corrections: ['housingUnit', 'shift', 'facility', 'region', 'bureau'],
  school: ['department', 'school', 'district'],
  agency: ['team', 'department', 'section', 'branch', 'office', 'division', 'region', 'bureau'],
};
/** A few agencies chain their own units. */
const OWN_CHAINS = {
  tsa: ['team', 'section', 'airport'],
  airTrafficControl: ['team', 'office', 'division'],
  postal: ['team', 'postOffice', 'district'],
  benefitsClaims: ['team', 'office', 'region'],
  borderPatrol: ['team', 'watch', 'station', 'region'],
  caseOfficer: ['station'],
  foreignService: ['office'],
  usms: ['squad', 'district'],
  dispatch: ['shift'],
  schoolBus: ['station'],
  library: ['branch'],
  waterUtility: ['plant', 'division'],
  transit: ['section', 'division'],
  transitMaintenance: ['team', 'division'],
  dot: ['team', 'district'],
  gameWarden: ['team', 'district'],
  parkService: ['district', 'division'],
  forester: ['district'],
};
/** Agencies whose staff aren't posted to a sub-unit (a city's clerks and analysts, a legislature's aides). */
const NO_POSTING = ['municipalAdmin', 'legislativeStaff'];
const UK_FIRE_CHAIN = ['company', 'watch', 'station', 'battalion', 'division', 'bureau'];
const chainOf = (profession) => OWN_CHAINS[baseId(profession.id)] ?? (FIRE.includes(baseId(profession.id)) && britishFire(profession) ? UK_FIRE_CHAIN : CHAINS[familyOf(baseId(profession.id))]);

/** Stable numbering: the same employer always has you in the same precinct, office or school. */
const numberFor = (employer, kind, count) => 1 + (hash(`${employer.id}:${kind}`) % Math.max(1, Math.min(60, count)));
const staffFor = (kind, agency) => {
  const [lo, hi] = UNIT_KINDS[kind].staff;
  return agency ? Math.max(2, Math.min(agency, Math.round(lo + (hi - lo) * Math.min(1, agency / 20000)))) : Math.round((lo + hi) / 2);
};
const countFor = (kind, agency) => (agency ? Math.max(1, Math.floor(agency / Math.max(1, staffFor(kind, agency)))) : 6);

/** The unit one level up the chain, if the agency is big enough to have it. */
/** Units that sit beside the chain at another unit's level (a grade team, like a subject department, is part of a school). */
const ALONGSIDE = { gradeTeam: 'department', detectiveSquad: 'watch' };
function parentOf(kind, profession, employer) {
  const chain = chainOf(profession);
  const i = chain.indexOf(ALONGSIDE[kind] ?? kind);
  if (i < 0) return null;
  const agency = employer.agencyStaff ?? null;
  const id = baseId(profession.id);
  // Plain agencies only nest in units they really have (a lab's DNA Unit isn't inside a made-up "Policy Branch").
  const named = (k) => familyOf(id) !== 'agency' || OWN_CHAINS[id] || NAMES[id]?.[k];
  for (const up of chain.slice(i + 1).filter(named)) {
    const staff = staffFor(up, agency);
    if (agency && staff >= agency) return null; // the agency itself is that big: nothing between you and the top
    const count = agency ? Math.max(1, Math.floor(agency / Math.max(1, staff))) : 6;
    return unitName(up, numberFor(employer, up, count), profession, employer);
  }
  return null;
}

/** The unit a level commands at this employer (null when the rank isn't a unit command, or the agency is too small to have units). */
export function unitFor(job, level, profession) {
  if (!level || !profession || !GOV_SECTORS.includes(profession.sector)) return null;
  const kind = unitKind(profession, level);
  if (!kind) return null;
  const agency = job.employer.agencyStaff ?? null;
  // An agency smaller than such a unit doesn't have one: its captain runs the department, not a "precinct".
  // (A tiny agency is still one unit: the sergeant's squad is the whole department.)
  if (agency && UNIT_KINDS[kind].staff[0] > agency && chainOf(profession).indexOf(kind) > 0) return null;
  const staff = staffFor(kind, agency);
  const count = countFor(kind, agency);
  let name = unitName(kind, numberFor(job.employer, kind, count), profession, job.employer);
  if (!name) return null;
  // A complex warden runs several prisons on one site.
  if (/complex/i.test(level.title)) name = name.replace(/Facility|Detention Center/, 'Complex');
  const within = parentOf(kind, profession, job.employer);
  return { kind, name, staff, ...(within && within !== name ? { within } : {}) };
}

/** Where front-line staff are posted: the smallest unit their agency has (a squad, a school, a checkpoint). */
export function assignmentFor(job, profession) {
  if (!job || !profession || !GOV_SECTORS.includes(profession.sector) || job.department) return null;
  const id = baseId(profession.id);
  if (NO_POSTING.includes(id)) return null;
  const chain = chainOf(profession);
  const title = job.title ?? '';
  // Senior specialists answer to the department, not a crew.
  if (/director|official|city engineer|counsel|fellow|administrative law judge/i.test(title)) return null;
  // Detectives work in a detective squad; fire inspectors and investigators in fire prevention.
  if (familyOf(id) === 'police' && /detective|investigat/i.test(title)) {
    const name = unitName('detectiveSquad', numberFor(job.employer, 'detectiveSquad', countFor('detectiveSquad', job.employer.agencyStaff)), profession, job.employer);
    const within = parentOf('detectiveSquad', profession, job.employer);
    return within ? `${name}, ${within}` : name;
  }
  if (familyOf(id) === 'fire' && /inspect|investigat|marshal/i.test(title)) return britishFire(profession) ? 'Protection & Prevention' : 'Fire Prevention Bureau';
  // Teachers belong to a school, not a subject department; agents and officers to a squad; staff to their agency's smallest named unit.
  const kind = familyOf(id) === 'school' ? 'school' : familyOf(id) !== 'agency' || OWN_CHAINS[id] ? chain[0] : chain.find((k) => NAMES[id]?.[k]) ?? null;
  if (!kind) return null;
  const agency = job.employer.agencyStaff ?? null;
  const staff = staffFor(kind, agency);
  const count = agency ? Math.max(1, Math.floor(agency / Math.max(1, staff))) : 6;
  const kindHere = kind;
  const name = unitName(kindHere, numberFor(job.employer, kindHere, count), profession, job.employer);
  if (!name) return null;
  const within = parentOf(kindHere, profession, job.employer);
  return within && within !== name ? `${name}, ${within}` : name;
}
