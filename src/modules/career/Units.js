/**
 * Units of command. In a government agency a supervisory rank runs a real
 * unit: a sergeant a squad, a fire lieutenant a company, a captain a station
 * or precinct, a battalion chief a battalion, a deputy chief a division, a
 * principal a school, a warden a facility, an SAC a field office. The unit
 * has a name and a size, and its size is the department you manage.
 *
 * job.department.unit = { kind, name, staff }
 */
import { GOV_SECTORS } from './Ladder.js';

/** Unit kinds: typical staff [min, max]; the agency's own size caps them. */
export const UNIT_KINDS = {
  squad: { label: 'Squad', staff: [6, 12] },
  company: { label: 'Company', staff: [8, 16] },
  watch: { label: 'Watch', staff: [25, 60] },
  station: { label: 'Station', staff: [15, 40] },
  precinct: { label: 'Precinct', staff: [120, 320] },
  battalion: { label: 'Battalion', staff: [90, 220] },
  division: { label: 'Division', staff: [300, 1500] },
  bureau: { label: 'Bureau', staff: [1500, 9000] },
  school: { label: 'School', staff: [40, 140] },
  gradeTeam: { label: 'Grade team', staff: [8, 30] },
  facility: { label: 'Facility', staff: [150, 700] },
  housingUnit: { label: 'Housing unit', staff: [12, 40] },
  fieldOffice: { label: 'Field office', staff: [150, 1200] },
  postOffice: { label: 'Post office', staff: [15, 120] },
  plant: { label: 'Plant', staff: [20, 120] },
  district: { label: 'District', staff: [30, 200] },
  section: { label: 'Section', staff: [10, 60] },
  branch: { label: 'Branch', staff: [12, 40] },
};

const FIRE = ['fire', 'airportFire', 'stateFire'];
const POLICE = ['police', 'sheriff', 'transitPolice', 'universityPolice', 'airportPolice', 'statePolice', 'privatePolice'];
const CORRECTIONS = ['jail', 'corrections', 'federalPrisons', 'privatePrisons'];
const SCHOOLS = ['education'];
const FEDERAL_LE = ['fbi', 'dea', 'atf', 'usms', 'usss', 'oig', 'hsi'];

/** What a rank commands, from its title and the kind of agency. */
export function unitKind(profession, level) {
  const t = level.title.toLowerCase();
  const id = profession.id;
  if (FIRE.includes(id) || id === 'ems') {
    if (/battalion/.test(t)) return 'battalion';
    if (/deputy|division|district chief|assistant chief/.test(t)) return /assistant chief|chief of department/.test(t) ? 'bureau' : 'division';
    if (/captain/.test(t)) return 'station';
    if (/lieutenant|supervisor/.test(t)) return 'company';
  }
  if (POLICE.includes(id)) {
    if (/sergeant|corporal/.test(t)) return 'squad';
    if (/lieutenant/.test(t)) return 'watch';
    if (/captain|deputy inspector|commander/.test(t)) return 'precinct';
    if (/inspector|major/.test(t)) return 'division';
    if (/deputy chief|assistant chief|chief of department|undersheriff/.test(t)) return 'bureau';
  }
  if (CORRECTIONS.includes(id)) {
    if (/sergeant/.test(t)) return 'housingUnit';
    if (/lieutenant|captain/.test(t)) return 'watch';
    if (/warden|administrator|commander|superintendent/.test(t) && !/regional|director/.test(t)) return 'facility';
  }
  if (SCHOOLS.includes(id)) {
    if (/chair/.test(t)) return 'gradeTeam';
    if (/principal/.test(t)) return /assistant/.test(t) ? 'gradeTeam' : 'school';
    if (/network|director/.test(t)) return 'district';
  }
  if (FEDERAL_LE.includes(id)) {
    if (/supervisory/.test(t)) return 'squad';
    if (/assistant special agent in charge|asac/.test(t)) return 'division';
    if (/special agent in charge|sac\b/.test(t)) return 'fieldOffice';
    if (/section chief/.test(t)) return 'section';
  }
  if (id === 'postal') {
    if (/supervisor/.test(t)) return 'section';
    if (/postmaster/.test(t)) return 'postOffice';
    if (/plant|processing/.test(t)) return 'plant';
  }
  if (/complex warden/.test(t)) return 'facility';
  if (/section chief/.test(t)) return 'section';
  if (/chief of department/.test(t)) return 'bureau';
  if (/warden captain|chief ranger/.test(t)) return 'district';
  if (/district ranger|district/.test(t)) return 'district';
  if (/branch manager|branch chief/.test(t)) return 'branch';
  if (/plant|chief operator/.test(t)) return 'plant';
  if (/watch commander/.test(t)) return 'watch';
  if (/patrol agent in charge|meteorologist in charge|chief of station/.test(t)) return 'station';
  // Upper management of any agency: divisions, then bureaus.
  if (/division (director|chief|superintendent)|^division|unit chief|program manager|superintendent of|utilities superintendent|public works superintendent/.test(t)) return 'division';
  if (/assistant commissioner|deputy commissioner|associate administrator|assistant director|regional (deputy )?director|regional commissioner|assistant inspector general/.test(t)) return 'bureau';
  if (/supervisor|sergeant|lead|foreman|manager/.test(t)) return 'section';
  return null;
}

const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 >= 11 && n % 100 <= 13) ? 0 : n % 10] ?? 'th'}`;
function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function unitName(kind, n, profession, employer) {
  switch (kind) {
    case 'squad': return `Squad ${n}`;
    case 'company': return `${n % 3 === 0 ? 'Ladder' : 'Engine'} ${n}`;
    case 'watch': return ['Day Watch', 'Evening Watch', 'Night Watch', 'First Platoon', 'Second Platoon', 'Third Platoon'][n % 6];
    case 'station': return `Station ${n}`;
    case 'precinct': return POLICE.includes(profession.id) && profession.id !== 'sheriff' ? `${ordinal(n)} Precinct` : `${['North', 'South', 'East', 'West', 'Central'][n % 5]} District`;
    case 'battalion': return `Battalion ${n}`;
    case 'division': return `Division ${n}`;
    case 'bureau': return ['Bureau of Operations', 'Patrol Services Bureau', 'Special Operations Bureau', 'Support Services Bureau'][n % 4];
    case 'school': return `${['Lincoln', 'Washington', 'Roosevelt', 'Jefferson', 'Kennedy', 'Franklin', 'Madison', 'King'][n % 8]} ${['Elementary', 'Middle School', 'High School'][n % 3]}`;
    case 'gradeTeam': return `${['6th', '7th', '8th', '9th', '10th', '11th', '12th'][n % 7]}-grade team`;
    case 'facility': return `${['North', 'South', 'River', 'Valley', 'Central'][n % 5]} ${CORRECTIONS.includes(profession.id) && profession.id !== 'jail' ? 'Correctional Facility' : 'Detention Center'}`;
    case 'housingUnit': return `Housing Unit ${String.fromCharCode(65 + (n % 8))}`;
    case 'fieldOffice': return `${employer.cityName ?? 'Regional'} Field Office`;
    case 'postOffice': return `${['Main', 'Downtown', 'Northside', 'Southside', 'Westgate'][n % 5]} Post Office`;
    case 'plant': return `Plant ${n}`;
    case 'district': return `District ${n}`;
    case 'section': return `Section ${n}`;
    case 'branch': return `${['Main', 'Eastside', 'Westside', 'Northgate', 'Riverside'][n % 5]} Branch`;
    default: return null;
  }
}

/** The unit a level commands at this employer (null when the rank isn't a unit command, or the agency is too small to have units). */
export function unitFor(job, level, profession) {
  if (!level || !profession || !GOV_SECTORS.includes(profession.sector)) return null;
  const kind = unitKind(profession, level);
  if (!kind) return null;
  const agency = job.employer.agencyStaff ?? null;
  const [lo, hi] = UNIT_KINDS[kind].staff;
  // A tiny agency is one unit: the sergeant's squad is the whole department.
  const staff = agency ? Math.max(2, Math.min(agency, Math.round(lo + (hi - lo) * Math.min(1, agency / 20000)))) : Math.round((lo + hi) / 2);
  const count = agency ? Math.max(1, Math.floor(agency / Math.max(1, staff))) : 6;
  const n = 1 + (hash(`${job.employer.id}:${level.id}`) % Math.min(60, count));
  return { kind, name: unitName(kind, n, profession, job.employer), staff };
}
