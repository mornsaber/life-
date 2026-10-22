/**
 * Senior command: what colonels, generals and admirals actually do.
 *
 * Below colonel, command comes in the unit (MilitaryUnits: company and
 * battalion command). From O-6 up, a career is a sequence of two- to
 * three-year posts, each either a command or a staff job:
 *
 *   O-6   brigade / regiment / wing / destroyer squadron
 *   O-7   deputy commanding general / one-star wing or region
 *   O-8   division / carrier strike group / numbered air force
 *   O-9   corps / numbered fleet / major command
 *   O-10  combatant command (or, via Assignments, service chief / Chairman)
 *
 * A board decides who commands; the rest go to staff (division chief of
 * staff, Joint Staff directorates, the service headquarters). Command is
 * where the career is made or lost: every year brings a decision — a hard
 * training rotation, a misconduct case, deployment orders, a risky operation,
 * budget testimony, a crisis with a rival power, an order you disagree with —
 * and the command's readiness (which follows the defense budget, Budgets)
 * and your choices write your record. An excellent command is what gets the
 * next star; a failed one gets you relieved, and a relieved officer retires.
 *
 * svc.post   = { kind: 'command'|'staff', title, unit, grade, untilAge, readiness, decisions }
 * svc.flagRecord = { excellent, good, poor, relieved, commands }
 */
import { clamp, Random } from '../../core/Random.js';
import { rankOf, branchOf, discharge } from './MilitaryEngine.js';
import { awardMedal } from './MedalEngine.js';
import { serviceLevel, budgetAt } from '../politics/Budgets.js';
import { pastTenure } from './Separation.js';

const FAMILY = { army: 'ground', guard: 'ground', marines: 'marines', navy: 'naval', coastguard: 'naval', airforce: 'air', spaceforce: 'space' };
export const familyOf = (svc) => FAMILY[svc?.branch] ?? null;
export const SENIOR_GRADE = 5;
const TOUR = { 5: 2, 6: 2, 7: 2, 8: 3, 9: 3 };

const ORD = ['1st', '2nd', '3rd', '4th', '10th', '25th', '82nd', '101st', '3rd', '1st'];
const CCMDS = ['U.S. Central Command', 'U.S. Indo-Pacific Command', 'U.S. European Command', 'U.S. Africa Command', 'U.S. Southern Command', 'U.S. Northern Command'];

/** Command titles and units, by service family and officer grade (5 = O-6 … 9 = O-10). */
export const COMMAND_POSTS = {
  ground: {
    5: { title: 'Brigade Commander', unit: (r) => `${r.pick(ORD)} Brigade Combat Team, ${r.pick(ORD)} Infantry Division`, size: '4,500 soldiers' },
    6: { title: 'Deputy Commanding General (Maneuver)', unit: (r) => `${r.pick(ORD)} Infantry Division`, size: '15,000 soldiers' },
    7: { title: 'Commanding General', unit: (r) => `${r.pick(['1st Cavalry', '82nd Airborne', '101st Airborne', '3rd Infantry', '10th Mountain', '25th Infantry', '1st Armored'])} Division`, size: '15,000 soldiers' },
    8: { title: 'Corps Commander', unit: (r) => `${r.pick(['I', 'III', 'V', 'XVIII Airborne'])} Corps`, size: '45,000 soldiers' },
    9: { title: 'Combatant Commander', unit: (r) => r.pick(CCMDS), size: 'every U.S. force in the region' },
  },
  marines: {
    5: { title: 'Regimental Commander', unit: (r) => `${r.pick(['1st', '2nd', '5th', '6th', '7th'])} Marine Regiment`, size: '3,500 Marines' },
    6: { title: 'Assistant Division Commander', unit: (r) => `${r.pick(['1st', '2nd', '3rd'])} Marine Division`, size: '20,000 Marines' },
    7: { title: 'Commanding General', unit: (r) => `${r.pick(['1st', '2nd', '3rd'])} Marine Division`, size: '20,000 Marines' },
    8: { title: 'Commanding General', unit: (r) => `${r.pick(['I', 'II', 'III'])} Marine Expeditionary Force`, size: '45,000 Marines and sailors' },
    9: { title: 'Combatant Commander', unit: (r) => r.pick(CCMDS), size: 'every U.S. force in the region' },
  },
  naval: {
    5: { title: 'Commodore', unit: (r) => `Destroyer Squadron ${r.int(1, 60)}`, size: 'six warships' },
    6: { title: 'Commander', unit: (r) => `Navy Region ${r.pick(['Southwest', 'Northwest', 'Mid-Atlantic', 'Hawaii', 'Japan'])}`, size: 'a fleet concentration area' },
    7: { title: 'Commander', unit: (r) => `Carrier Strike Group ${r.int(1, 12)}`, size: 'a carrier, its air wing and escorts' },
    8: { title: 'Commander', unit: (r) => `U.S. ${r.pick(['Second', 'Third', 'Fifth', 'Sixth', 'Seventh'])} Fleet`, size: 'a numbered fleet' },
    9: { title: 'Combatant Commander', unit: (r) => r.pick(CCMDS), size: 'every U.S. force in the region' },
  },
  air: {
    5: { title: 'Wing Commander', unit: (r) => `${r.pick(['4th', '20th', '388th', '1st', '366th', '437th'])} ${r.pick(['Fighter', 'Airlift', 'Bomb'])} Wing`, size: '5,000 airmen' },
    6: { title: 'Commander', unit: (r) => `${r.pick(['Air Force Life Cycle Management Center (deputy)', '57th Wing', 'Air Force Global Strike Command (deputy)'])}`, size: 'a one-star command' },
    7: { title: 'Commander', unit: (r) => `${r.pick(['Eighth', 'Ninth', 'Twelfth', 'Fifteenth'])} Air Force`, size: 'a numbered air force' },
    8: { title: 'Commander', unit: (r) => r.pick(['Air Combat Command (deputy)', 'Pacific Air Forces', 'U.S. Air Forces in Europe']), size: 'a major command' },
    9: { title: 'Combatant Commander', unit: (r) => r.pick([...CCMDS, 'U.S. Strategic Command', 'U.S. Transportation Command']), size: 'a combatant command' },
  },
  space: {
    5: { title: 'Delta Commander', unit: (r) => `Space Delta ${r.int(2, 9)}`, size: '800 guardians' },
    6: { title: 'Commander', unit: () => 'Space Base Delta (one-star)', size: 'a one-star command' },
    7: { title: 'Commander', unit: () => 'Space Operations Command (deputy)', size: 'a field command' },
    8: { title: 'Commander', unit: () => 'Space Operations Command', size: 'the field command' },
    9: { title: 'Commander', unit: () => 'U.S. Space Command', size: 'a combatant command' },
  },
};
const STAFF_POSTS = {
  5: ['Division Chief of Staff', 'Chief, Joint Staff Division (J-5)', 'Branch Chief, Service Headquarters', 'Senior Fellow, a war college'],
  6: ['Deputy Director for Operations, Joint Staff (J-3)', 'Deputy Commander (Support), a two-star command', 'Director of Plans, a combatant command'],
  7: ['Director for Strategic Plans and Policy, Joint Staff (J-5)', 'Deputy Chief of Staff, service headquarters', 'Chief of Staff, a combatant command'],
  8: ['Director, Joint Staff', 'Vice Chief of Staff of the service', 'Deputy Commander, a combatant command'],
  9: ['Vice Chief of Staff of the service', 'Vice Chairman of the Joint Chiefs of Staff'],
};

/**
 * The professional corps and support branches run their own commands: an Army doctor who makes
 * colonel commands a medical center, not a brigade combat team; a lawyer becomes a staff judge
 * advocate; a logistician commands a sustainment brigade. Grades 5 (O-6) … 9 (O-10); a corps
 * whose ladder tops out lower has no entry above it.
 */
const ORDS = ['1st', '2nd', '3rd', '4th', '7th', '10th', '13th', '18th', '21st', '35th', '66th', '470th', '500th'];
export const SPECIALTY_POSTS = {
  medical: {
    5: { title: 'Commander', unit: (r) => r.pick(['Brooke Army Medical Center', 'Madigan Army Medical Center', 'Walter Reed National Military Medical Center', 'Landstuhl Regional Medical Center', 'Tripler Army Medical Center']), size: '3,000 doctors, nurses and medics' },
    6: { title: 'Commanding General', unit: (r) => r.pick(['Regional Health Command–Atlantic', 'Regional Health Command–Pacific', 'Regional Health Command–Europe']), size: 'a region\'s hospitals and clinics' },
    7: { title: 'Commanding General', unit: () => 'Medical Readiness Command', size: 'the service\'s hospitals' },
    8: { title: 'Surgeon General', unit: () => 'of the service', size: 'the whole medical department' },
  },
  legal: {
    5: { title: 'Staff Judge Advocate', unit: (r) => r.pick(['XVIII Airborne Corps', 'III Armored Corps', 'I Corps', 'U.S. Army Europe and Africa']), size: '60 attorneys and paralegals' },
    6: { title: 'Commander', unit: () => 'the Legal Center and School', size: 'every new judge advocate' },
    7: { title: 'Deputy Judge Advocate General', unit: () => 'of the service', size: 'the JAG Corps' },
    8: { title: 'The Judge Advocate General', unit: () => 'of the service', size: 'the JAG Corps' },
  },
  chaplain: {
    5: { title: 'Command Chaplain', unit: (r) => r.pick(['XVIII Airborne Corps', 'III Armored Corps', 'U.S. Army Pacific']), size: 'every chaplain in the command' },
    6: { title: 'Deputy Chief of Chaplains', unit: () => 'of the service', size: 'the Chaplain Corps' },
    7: { title: 'Chief of Chaplains', unit: () => 'of the service', size: 'the Chaplain Corps' },
  },
  logistics: {
    5: { title: 'Commander', unit: (r) => `${r.pick(ORDS)} Sustainment Brigade`, size: '3,500 soldiers and 1,200 trucks' },
    6: { title: 'Commanding General', unit: (r) => `${r.pick(ORDS)} Expeditionary Sustainment Command`, size: 'a theater\'s supply lines' },
    7: { title: 'Commanding General', unit: () => 'Army Sustainment Command', size: 'the depots and arsenals' },
    8: { title: 'Director', unit: () => 'Defense Logistics Agency', size: '26,000 people and $50 billion a year' },
    9: { title: 'Commander', unit: (r) => r.pick(['Army Materiel Command', 'U.S. Transportation Command']), size: 'the military\'s supply chain' },
  },
  intel: {
    5: { title: 'Commander', unit: (r) => `${r.pick(ORDS)} Military Intelligence Brigade`, size: '2,000 analysts and collectors' },
    6: { title: 'Director of Intelligence (J-2)', unit: (r) => r.pick(CCMDS), size: 'a theater\'s intelligence' },
    7: { title: 'Commanding General', unit: () => 'Intelligence and Security Command', size: 'the service\'s collectors worldwide' },
    8: { title: 'Director', unit: () => 'Defense Intelligence Agency', size: '16,500 people' },
  },
  cyber: {
    5: { title: 'Commander', unit: (r) => `${r.pick(ORDS)} Cyber Protection Brigade`, size: '1,200 cyber operators' },
    6: { title: 'Deputy Commander', unit: () => 'Cyber National Mission Force', size: 'national cyber defense teams' },
    7: { title: 'Commander', unit: () => 'Cyber National Mission Force', size: 'national cyber defense teams' },
    8: { title: 'Commanding General', unit: () => 'Army Cyber Command', size: 'the service\'s cyber forces' },
    9: { title: 'Commander', unit: () => 'U.S. Cyber Command and Director, NSA', size: 'every cyber force, and the codebreakers' },
  },
  engineer: {
    5: { title: 'District Commander', unit: (r) => `${r.pick(['Sacramento', 'New Orleans', 'Seattle', 'Savannah', 'Omaha', 'Galveston'])} District, Corps of Engineers`, size: 'levees, dams and $1 billion of construction' },
    6: { title: 'Division Commander', unit: (r) => `${r.pick(['Mississippi Valley', 'South Pacific', 'North Atlantic', 'Southwestern'])} Division, Corps of Engineers`, size: 'a region\'s rivers and ports' },
    7: { title: 'Deputy Commanding General', unit: () => 'U.S. Army Corps of Engineers', size: '37,000 engineers' },
    8: { title: 'Chief of Engineers', unit: () => 'U.S. Army Corps of Engineers', size: '37,000 engineers' },
  },
};
const SPECIALTY_STAFF = {
  medical: ['Command Surgeon, a combatant command', 'Deputy Surgeon General', 'Director of Health Affairs, the Joint Staff'],
  legal: ['Staff Judge Advocate, a combatant command', 'Legal Counsel to the Chairman', 'Chief Trial Judge'],
  chaplain: ['Command Chaplain, a combatant command', 'Executive Officer, Office of the Chief of Chaplains'],
  logistics: ['Director of Logistics (J-4), a combatant command', 'Deputy Chief of Staff for Logistics (G-4)'],
  intel: ['Deputy Director for Intelligence, Joint Staff (J-2)', 'Deputy Chief of Staff for Intelligence (G-2)'],
  cyber: ['Director, Command, Control, Communications and Cyber (J-6)', 'Deputy Commander, U.S. Cyber Command'],
  engineer: ['Command Engineer, a combatant command', 'Director of Military Programs, Corps of Engineers'],
};
/** The Navy's, Air Force's and Marine Corps' own versions of the support commands: [title, unit]. */
const BRANCH_SPECIALTY = {
  medical: {
    naval: { 5: ['Commanding Officer', (r) => r.pick(['Naval Medical Center San Diego', 'Naval Medical Center Portsmouth', 'Naval Hospital Okinawa', 'the hospital ship USNS Mercy'])], 6: ['Commander', () => 'Naval Medical Forces Pacific'], 7: ['Director', () => 'the Defense Health Agency\'s medical network'], 8: ['Surgeon General', () => 'of the Navy'] },
    air: { 5: ['Commander', (r) => r.pick(['the 59th Medical Wing', 'the 88th Medical Group', 'the 375th Aeromedical Evacuation Wing'])], 6: ['Commander', () => 'Air Force Medical Readiness Agency'], 7: ['Deputy Surgeon General', () => 'of the Air Force'], 8: ['Surgeon General', () => 'of the Air Force'] },
  },
  legal: {
    naval: { 5: ['Staff Judge Advocate', (r) => r.pick(['U.S. Pacific Fleet', 'U.S. Fleet Forces Command', 'Naval Special Warfare Command'])], 6: ['Commander', () => 'Naval Legal Service Command'], 7: ['Deputy Judge Advocate General', () => 'of the Navy'], 8: ['Judge Advocate General', () => 'of the Navy'] },
    air: { 5: ['Staff Judge Advocate', (r) => r.pick(['Air Combat Command', 'Air Mobility Command', 'Pacific Air Forces'])], 6: ['Commander', () => 'the Air Force Legal Operations Agency'], 7: ['Deputy Judge Advocate General', () => 'of the Air Force'], 8: ['The Judge Advocate General', () => 'of the Air Force'] },
    marines: { 5: ['Staff Judge Advocate', (r) => r.pick(['I Marine Expeditionary Force', 'II Marine Expeditionary Force'])], 6: ['Staff Judge Advocate', () => 'to the Commandant'], 7: ['Staff Judge Advocate', () => 'to the Commandant'] },
  },
  chaplain: {
    naval: { 5: ['Force Chaplain', (r) => r.pick(['U.S. Pacific Fleet', 'U.S. Fleet Forces Command', 'I Marine Expeditionary Force'])] },
    marines: { 5: ['Force Chaplain', (r) => r.pick(['I Marine Expeditionary Force', 'II Marine Expeditionary Force'])], 6: ['Chaplain of the Marine Corps', () => 'Headquarters Marine Corps'] },
    air: { 5: ['Command Chaplain', (r) => r.pick(['Air Mobility Command', 'Air Combat Command', 'Pacific Air Forces'])] },
  },
  logistics: {
    naval: { 5: ['Commanding Officer', (r) => r.pick(['Fleet Logistics Center Norfolk', 'Fleet Logistics Center Yokosuka', 'Naval Supply Systems Command Weapon Systems Support'])], 6: ['Commander', () => 'Naval Supply Systems Command (deputy)'], 7: ['Commander', () => 'Naval Supply Systems Command'], 8: ['Director', () => 'Defense Logistics Agency'], 9: ['Commander', () => 'U.S. Transportation Command'] },
    air: { 5: ['Commander', (r) => r.pick(['the Ogden Air Logistics Complex', 'the 635th Supply Chain Operations Wing', 'the 436th Airlift Wing'])], 6: ['Commander', () => 'Air Force Sustainment Center (deputy)'], 7: ['Commander', () => 'Air Force Sustainment Center'], 8: ['Director', () => 'Defense Logistics Agency'], 9: ['Commander', () => 'Air Force Materiel Command'] },
    marines: { 5: ['Commanding Officer', (r) => r.pick(['1st Marine Logistics Group (Combat Logistics Regiment)', '2nd Marine Logistics Group (Combat Logistics Regiment)'])], 6: ['Commanding General', (r) => r.pick(['1st Marine Logistics Group', '2nd Marine Logistics Group'])], 7: ['Commander', () => 'Marine Corps Logistics Command'], 8: ['Deputy Commandant for Installations and Logistics', () => 'Headquarters Marine Corps'] },
  },
  intel: {
    naval: { 5: ['Commanding Officer', () => 'the Navy Information Operations Command'], 6: ['Director of Intelligence', () => 'U.S. Pacific Fleet'], 7: ['Commander', () => 'Office of Naval Intelligence'], 8: ['Director', () => 'Defense Intelligence Agency'] },
    air: { 5: ['Commander', (r) => r.pick(['the 480th ISR Wing', 'the 70th ISR Wing', 'the 363rd ISR Wing'])], 6: ['Director of Intelligence (J-2)', (r) => r.pick(CCMDS)], 7: ['Commander', () => 'Sixteenth Air Force (Air Forces Cyber)'], 8: ['Director', () => 'Defense Intelligence Agency'] },
    marines: { 5: ['Commanding Officer', () => 'an Intelligence Battalion'], 6: ['Director', () => 'Marine Corps Intelligence Activity'], 7: ['Director of Intelligence', () => 'Headquarters Marine Corps'], 8: ['Director', () => 'Defense Intelligence Agency'] },
  },
  cyber: {
    naval: { 5: ['Commodore', () => 'Navy Cyber Defense Operations Command'], 6: ['Deputy Commander', () => 'Fleet Cyber Command / U.S. Tenth Fleet'], 7: ['Commander', () => 'Fleet Cyber Command / U.S. Tenth Fleet'], 8: ['Commander', () => 'Fleet Cyber Command / U.S. Tenth Fleet'], 9: ['Commander', () => 'U.S. Cyber Command and Director, NSA'] },
    air: { 5: ['Commander', (r) => r.pick(['the 688th Cyberspace Wing', 'the 67th Cyberspace Wing'])], 6: ['Deputy Commander', () => 'Sixteenth Air Force (Air Forces Cyber)'], 7: ['Commander', () => 'Sixteenth Air Force (Air Forces Cyber)'], 8: ['Commander', () => 'Sixteenth Air Force (Air Forces Cyber)'], 9: ['Commander', () => 'U.S. Cyber Command and Director, NSA'] },
    marines: { 5: ['Commanding Officer', () => 'Marine Corps Cyberspace Operations Group'], 6: ['Commander', () => 'Marine Forces Cyberspace Command (deputy)'], 7: ['Commander', () => 'Marine Forces Cyberspace Command'], 9: ['Commander', () => 'U.S. Cyber Command and Director, NSA'] },
  },
  engineer: {
    naval: { 5: ['Commanding Officer', (r) => r.pick(['a Naval Construction Regiment (Seabees)', 'NAVFAC Southwest', 'NAVFAC Pacific'])], 6: ['Commander', () => 'the 1st Naval Construction Division'], 7: ['Commander', () => 'Naval Facilities Engineering Systems Command'], 8: ['Commander', () => 'Naval Facilities Engineering Systems Command'] },
    air: { 5: ['Commander', (r) => r.pick(['a RED HORSE squadron group', 'a Mission Support Group'])], 6: ['Commander', () => 'the Air Force Civil Engineer Center'], 7: ['Director of Civil Engineers', () => 'Headquarters Air Force'], 8: ['Director of Civil Engineers', () => 'Headquarters Air Force'] },
    marines: { 5: ['Commanding Officer', () => 'a Marine Engineer Group'] },
  },
  aviation: {
    ground: { 5: ['Commander', (r) => `${r.pick(['1st', '10th', '82nd', '101st', '16th'])} Combat Aviation Brigade`] },
    naval: { 5: ['Commander', (r) => `Carrier Air Wing ${r.pick(['One', 'Two', 'Five', 'Seven', 'Eight', 'Eleven'])}`] },
    marines: { 5: ['Commanding Officer', (r) => `Marine Aircraft Group ${r.pick(['11', '13', '16', '24', '26', '31'])}`], 6: ['Assistant Wing Commander', (r) => `${r.pick(['1st', '2nd', '3rd'])} Marine Aircraft Wing`], 7: ['Commanding General', (r) => `${r.pick(['1st', '2nd', '3rd'])} Marine Aircraft Wing`] },
  },
};
// Marines' doctors are Navy doctors.
BRANCH_SPECIALTY.medical.marines = BRANCH_SPECIALTY.medical.naval;
const BRANCH_WORD = { army: 'Army', guard: 'Army', navy: 'Navy', coastguard: 'Coast Guard', marines: 'Navy', airforce: 'Air Force', spaceforce: 'Air Force' };

/** Other forces' professional and support corps. */
const NATIONAL_SPECIALTY = {
  medical: { 5: ['Commanding Officer', () => 'a Field Hospital'], 6: ['Commander', () => 'the Medical Group'], 7: ['Surgeon General', () => 'the Armed Forces'] },
  legal: { 5: ['Chief Legal Adviser', () => 'Joint Operations Command'], 6: ['Director', () => 'Defence Legal Services'], 7: ['Judge Advocate General', () => 'the Armed Forces'] },
  chaplain: { 5: ['Senior Chaplain', () => 'a Division'], 6: ['Deputy Chaplain-General', () => 'the Armed Forces'], 7: ['Chaplain-General', () => 'the Armed Forces'] },
  logistics: { 5: ['Commander', (r) => `${r.pick(ORDS)} Logistic Brigade`], 6: ['Commander', () => 'Joint Logistics'], 7: ['Chief of Materiel', () => 'Defence Equipment and Support'] },
  intel: { 5: ['Commander', () => 'the Intelligence Brigade'], 6: ['Director of Military Intelligence', () => 'Defence headquarters'], 7: ['Chief of Defence Intelligence', () => 'Defence headquarters'] },
  cyber: { 5: ['Commander', () => 'the Cyber and Electronic Warfare Group'], 6: ['Commander', () => 'Cyber Command'], 7: ['Commander', () => 'Cyber Command'] },
  engineer: { 5: ['Commander', () => 'the Engineer Brigade'], 6: ['Engineer-in-Chief', () => 'the Army'] },
};

/** Other countries' forces: their own formations, not American ones. */
const NATIONAL_POSTS = {
  ground: { 5: ['Brigade Commander', (r) => `${r.pick(ORDS)} Brigade`], 6: ['Deputy Commander', (r) => `${r.pick(ORDS)} Division`], 7: ['General Officer Commanding', (r) => `${r.pick(ORDS)} Division`], 8: ['Commander', () => 'the Field Army'], 9: ['Commander', () => 'Joint Operations Command'] },
  marines: { 5: ['Commanding Officer', (r) => `${r.pick(['40', '42', '45'])} Commando`], 6: ['Commander', () => 'the Commando Brigade'], 7: ['Commandant', () => 'the Marine Corps'], 8: ['Commander', () => 'Amphibious Forces'], 9: ['Commander', () => 'Joint Operations Command'] },
  naval: { 5: ['Commodore', (r) => `the ${r.pick(['Frigate', 'Destroyer', 'Submarine'])} Squadron`], 6: ['Commander', () => 'a Maritime Task Group'], 7: ['Commander', () => 'the Fleet\'s Strike Force'], 8: ['Fleet Commander', () => 'the Navy'], 9: ['Commander', () => 'Joint Operations Command'] },
  air: { 5: ['Station Commander', (r) => `${r.pick(['an air base', 'the main fighter station', 'the transport wing'])}`], 6: ['Air Commodore', () => 'an Air Group'], 7: ['Air Officer Commanding', () => 'Air Combat Group'], 8: ['Commander', () => 'Air Command'], 9: ['Commander', () => 'Joint Operations Command'] },
  space: { 5: ['Commander', () => 'the Space Operations Centre'], 6: ['Commander', () => 'Space Command'], 7: ['Commander', () => 'Space Command'], 8: ['Commander', () => 'Space Command'], 9: ['Commander', () => 'Joint Operations Command'] },
};
const NATIONAL_STAFF = ['Assistant Chief of Staff, Defence headquarters', 'Director of Operations, Defence headquarters', 'Defence Attaché to an allied capital', 'Director of Plans, the Ministry of Defence'];

/** The command (or none) a board can offer at this grade, for this officer's corps and force. */
export function commandFor(svc, r) {
  const spec = SPECIALTY_POSTS[svc.specialty];
  const family = familyOf(svc);
  if (svc.nation) {
    const ns = svc.specialty === 'engineer' && family !== 'ground' ? null : NATIONAL_SPECIALTY[svc.specialty];
    if (ns) return ns[svc.grade] ? { title: ns[svc.grade][0], unit: ns[svc.grade][1](r), size: 'a national command' } : null;
    const n = NATIONAL_POSTS[family]?.[svc.grade];
    return n ? { title: n[0], unit: n[1](r), size: 'a national command' } : null;
  }
  // The branch's own version first (a Navy doctor runs a naval medical center), then the corps', then the line's.
  const own = BRANCH_SPECIALTY[svc.specialty]?.[family]?.[svc.grade];
  if (own) return { title: own[0], unit: own[1](r), size: spec?.[svc.grade]?.size ?? COMMAND_POSTS[family]?.[svc.grade]?.size ?? 'a major command' };
  const corps = ['medical', 'legal', 'chaplain'].includes(svc.specialty);
  // The Army's version, or (for the Navy's and Air Force's own corps without a post at this grade) none;
  // operational specialties past their branch's ladder go on to the line's commands.
  if (spec && (family === 'ground' || corps || !BRANCH_SPECIALTY[svc.specialty]?.[family])) {
    const d = spec[svc.grade];
    if (d) return { title: d.title, unit: d.unit(r).replace('of the service', `of the ${BRANCH_WORD[svc.branch] ?? 'service'}`), size: d.size };
    if (corps || family === 'ground') return null;
  } else if (corps) return null;
  const d = COMMAND_POSTS[familyOf(svc)]?.[svc.grade];
  return d ? { title: d.title, unit: d.unit(r), size: d.size } : null;
}
export function staffPostsFor(svc) {
  if (svc.nation) return NATIONAL_STAFF;
  return [...(SPECIALTY_STAFF[svc.specialty] ?? []), ...(SPECIALTY_STAFF[svc.specialty] ? [] : STAFF_POSTS[svc.grade] ?? STAFF_POSTS[5])];
}

/* ------------------------------------------------------------------ */
/* Decisions                                                           */
/* ------------------------------------------------------------------ */

/**
 * A command's year: tier 'brigade' (O-6), 'flag' (O-7/O-8), 'senior' (O-9/O-10). Each option:
 * readiness Δ, eval Δ, and a gamble (good: chance to come off, then win/lose effects).
 */
export const DECISIONS = {
  brigade: [
    { id: 'rotation', title: 'The Training Rotation', text: 'Your unit has a month at a combat training center. How hard do you push it?', options: [
      { id: 'hard', label: '🔥 Train at the edge: night live-fire, full tempo', readiness: 12, eval: 4, risk: 0.25, fail: { readiness: -6, eval: -8, text: 'A soldier died in a night live-fire accident. The investigation is on your desk.' } },
      { id: 'steady', label: '📋 A demanding but safe plan', readiness: 6, eval: 2 },
      { id: 'fix', label: '🔧 Use it to fix your maintenance problems', readiness: 4, eval: 1 },
    ] },
    { id: 'misconduct', title: 'A Case in the Ranks', text: 'A sexual-assault report implicates a popular senior leader in your command.', options: [
      { id: 'open', label: '⚖️ Refer it for full investigation, publicly', readiness: -2, eval: 4 },
      { id: 'quiet', label: '🤫 Handle it inside the chain of command', readiness: 0, eval: 0, risk: 0.35, fail: { eval: -20, scandal: true, text: 'It leaked. The story says you protected him.' } },
    ] },
    { id: 'orders', title: 'Deployment Orders', text: 'Higher headquarters asks which brigade is ready to go first.', options: [
      { id: 'volunteer', label: '🙋 Volunteer your unit', readiness: 0, eval: 6, deploy: true, needs: 60, fail: { eval: -8, casualties: true, text: 'Your unit wasn\'t ready. You brought soldiers home in flag-draped coffins.' } },
      { id: 'honest', label: '📊 Report your readiness honestly', readiness: 0, eval: 2 },
    ] },
    { id: 'retention', title: 'People Are Leaving', text: 'Your best captains and sergeants are getting out. Families are worn down.', options: [
      { id: 'families', label: '🏡 Protect time at home: fewer field exercises', readiness: -4, eval: 3 },
      { id: 'mission', label: '🎯 Mission first', readiness: 3, eval: -1 },
    ] },
  ],
  flag: [
    { id: 'exercise', title: 'A Multinational Exercise', text: 'You lead a major exercise with allies. The press and three ambassadors are watching.', options: [
      { id: 'bold', label: '⚡ Run an ambitious, complex scenario', readiness: 8, eval: 6, risk: 0.3, fail: { eval: -6, text: 'Two aircraft collided in the exercise. Everyone survived; your plan didn\'t.' } },
      { id: 'safe', label: '🤝 A well-rehearsed showcase', readiness: 3, eval: 3 },
    ] },
    { id: 'subordinate', title: 'A Failing Commander', text: 'One of your brigade commanders has a toxic command climate and a string of accidents.', options: [
      { id: 'relieve', label: '🚪 Relieve them', readiness: 5, eval: 3 },
      { id: 'mentor', label: '🧭 Mentor them through it', readiness: 0, eval: 0, risk: 0.45, fail: { readiness: -10, eval: -8, text: 'Another accident. The inspector general asks why you didn\'t act.' } },
    ] },
    { id: 'budget', title: 'Budget Testimony', text: 'You testify on the defense budget. Your service wants you to toe the line; you think the force is short.', options: [
      { id: 'candid', label: '🎤 Say the force needs more money', readiness: 0, eval: -2, budget: 0.03 },
      { id: 'line', label: '📄 Support the President\'s budget', readiness: 0, eval: 3 },
    ] },
    { id: 'raid', title: 'An Operation for Your Approval', text: 'Your staff brings you a raid on a high-value target: real intelligence, real risk.', options: [
      { id: 'approve', label: '✅ Approve it', readiness: 0, eval: 0, risk: 0.35, win: { eval: 10, medal: true, text: 'The raid succeeded without losses. The Secretary called you personally.' }, fail: { eval: -10, casualties: true, text: 'The helicopters took fire on the objective. You lost good people.' } },
      { id: 'refine', label: '🧪 Send it back for more intelligence', readiness: 0, eval: 1 },
    ] },
  ],
  senior: [
    { id: 'crisis', title: 'A Crisis with a Rival Power', text: 'A rival\'s forces are massing near an ally\'s border. Washington asks for your options.', options: [
      { id: 'show', label: '⚓ Recommend a show of force', readiness: 2, eval: 4, risk: 0.3, fail: { eval: -6, escalate: true, text: 'The rival matched your move. Tensions spiraled for months.' } },
      { id: 'deter', label: '🛡️ Quiet reinforcement and diplomacy', readiness: 1, eval: 5 },
      { id: 'restraint', label: '🕊️ Recommend restraint', readiness: 0, eval: -2 },
    ] },
    { id: 'order', title: 'An Order You Disagree With', text: 'The civilian leadership orders a withdrawal you believe will cost lives.', options: [
      { id: 'comply', label: '🫡 Comply and execute it well', readiness: 0, eval: 3 },
      { id: 'private', label: '🗣️ Object privately, then comply', readiness: 0, eval: 1 },
      { id: 'resign', label: '📜 Resign in protest', readiness: 0, eval: 0, resign: true },
    ] },
    { id: 'posture', title: 'The Posture Review', text: 'You can ask for more forces in your theater — or offer some up.', options: [
      { id: 'more', label: '➕ Ask for more forces', readiness: 4, eval: 1, budget: 0.02 },
      { id: 'give', label: '➖ Release forces to other theaters', readiness: -3, eval: 4 },
    ] },
    { id: 'ally', title: 'An Ally Asks for Help', text: 'A partner nation hit by an earthquake asks for military help.', options: [
      { id: 'send', label: '🚁 Send ships and helicopters at once', readiness: -2, eval: 6 },
      { id: 'wait', label: '⏳ Wait for the State Department', readiness: 0, eval: -2 },
    ] },
  ],
};
/** The professional and support corps face their own decisions. */
export const SPECIALTY_DECISIONS = {
  medical: [
    { id: 'masscal', title: 'A Mass-Casualty Exercise', text: 'Your hospital runs a mass-casualty drill with the city. It will show every weakness you have.', options: [
      { id: 'real', label: '🚑 Run it like the real thing', readiness: 10, eval: 4, risk: 0.2, fail: { eval: -4, text: 'The drill exposed a blood-supply gap. The report went all the way up.' } },
      { id: 'scripted', label: '📋 A scripted exercise', readiness: 3, eval: 1 },
    ] },
    { id: 'forward', title: 'Surgeons Forward', text: 'A deployed unit needs a forward surgical team — from your staff. Your clinics are already short.', options: [
      { id: 'send', label: '🪖 Send your best', readiness: -4, eval: 6, deploy: true },
      { id: 'contract', label: '🏥 Send who you can spare; contract civilians to backfill', readiness: 2, eval: 1 },
    ] },
    { id: 'harm', title: 'A Patient Died', text: 'A soldier\'s child died after a missed diagnosis in your emergency room. The family wants answers.', options: [
      { id: 'open', label: '⚖️ A transparent review and an apology', readiness: 2, eval: 3 },
      { id: 'defend', label: '🛡️ Defend your doctors', readiness: 0, eval: 0, risk: 0.4, fail: { eval: -10, scandal: true, text: 'Records showed earlier warnings. The press called it a cover-up.' } },
    ] },
  ],
  legal: [
    { id: 'courtmartial', title: 'A Court-Martial Everyone Is Watching', text: 'A decorated officer is accused of a war crime. Commanders want it handled quietly; the evidence is strong.', options: [
      { id: 'prosecute', label: '⚖️ Advise a general court-martial', readiness: 0, eval: 5, risk: 0.2, fail: { eval: -3, text: 'An acquittal, and a commander who blames you.' } },
      { id: 'lesser', label: '📝 Advise administrative action', readiness: 0, eval: 0, risk: 0.35, fail: { eval: -10, scandal: true, text: 'Congress asked why a war crime got a letter of reprimand.' } },
    ] },
    { id: 'roe', title: 'Rules of Engagement', text: 'An operations order would put a strike near a school. Your commander wants a legal opinion by morning.', options: [
      { id: 'no', label: '🚫 Advise that it is unlawful as written', readiness: -2, eval: 4 },
      { id: 'conditions', label: '🧾 Approve with strict conditions', readiness: 1, eval: 2, risk: 0.2, fail: { eval: -6, text: 'Civilians died anyway. Your opinion is in the investigation file.' } },
    ] },
  ],
  chaplain: [
    { id: 'suicides', title: 'A Cluster of Suicides', text: 'Three soldiers took their lives in two months. Commanders want a plan.', options: [
      { id: 'teams', label: '🤝 Embed chaplains and counselors in every battalion', readiness: 6, eval: 5 },
      { id: 'brief', label: '📋 A command-wide prevention briefing', readiness: 1, eval: 0 },
    ] },
    { id: 'accommodation', title: 'A Religious Accommodation', text: 'A soldier\'s request to wear religious dress has divided the command.', options: [
      { id: 'grant', label: '🕊️ Back the accommodation', readiness: 2, eval: 3 },
      { id: 'defer', label: '⏳ Defer to the commander', readiness: 0, eval: 0 },
    ] },
  ],
  logistics: [
    { id: 'shortage', title: 'The Supply Chain Breaks', text: 'A port strike and a parts shortage leave your units weeks short of spare parts.', options: [
      { id: 'airlift', label: '✈️ Airlift the parts, whatever it costs', readiness: 8, eval: 3, budget: 0.01 },
      { id: 'cannibalize', label: '🔧 Cannibalize grounded vehicles', readiness: 3, eval: 0 },
    ] },
    { id: 'contract', title: 'A Contract Under Suspicion', text: 'An audit flags a fuel contractor for overbilling — the one your units depend on.', options: [
      { id: 'refer', label: '🔎 Refer it to investigators', readiness: -3, eval: 5 },
      { id: 'quiet', label: '🤫 Renegotiate quietly', readiness: 1, eval: 0, risk: 0.35, fail: { eval: -12, scandal: true, text: 'The fraud came out, and so did your emails.' } },
    ] },
  ],
  intel: [
    { id: 'assessment', title: 'An Uncertain Assessment', text: 'Your analysts think a rival is about to move. The evidence is thin; the stakes are not.', options: [
      { id: 'warn', label: '🚨 Warn, with your confidence level stated', readiness: 2, eval: 4, risk: 0.3, fail: { eval: -5, text: 'Nothing happened. "Crying wolf," said the Joint Staff.' } },
      { id: 'wait', label: '🔍 Collect more first', readiness: 0, eval: 1, risk: 0.2, fail: { eval: -8, text: 'They moved. You had it, and sat on it.' } },
    ] },
    { id: 'source', title: 'A Source in Danger', text: 'A human source may be compromised. Pulling them out ends the reporting.', options: [
      { id: 'extract', label: '🚁 Get them out', readiness: -2, eval: 3 },
      { id: 'one', label: '🎯 One more meeting', readiness: 3, eval: 0, risk: 0.4, fail: { eval: -10, text: 'The source disappeared.' } },
    ] },
  ],
  cyber: [
    { id: 'intrusion', title: 'An Intrusion', text: 'Your teams found a foreign actor inside a defense contractor\'s network.', options: [
      { id: 'evict', label: '🧹 Evict them now', readiness: 3, eval: 3 },
      { id: 'watch', label: '👁️ Watch them to learn who they are', readiness: 0, eval: 0, risk: 0.35, win: { eval: 8, text: 'You traced them back to their unit. The intelligence was priceless.' }, fail: { eval: -8, text: 'They took the data and left before you moved.' } },
    ] },
    { id: 'talent', title: 'Losing Operators', text: 'Industry is offering your best operators three times their pay.', options: [
      { id: 'bonus', label: '💵 Fight for retention bonuses', readiness: 4, eval: 2, budget: 0.01 },
      { id: 'mission', label: '🎯 Sell them on the mission', readiness: -2, eval: 1 },
    ] },
  ],
  engineer: [
    { id: 'flood', title: 'The River Is Rising', text: 'A levee in your district is failing in a hundred-year flood.', options: [
      { id: 'breach', label: '💥 Breach a farm levee upstream to save the town', readiness: 4, eval: 5, risk: 0.2, fail: { eval: -4, text: 'The farmers are suing, and their senator is calling.' } },
      { id: 'hold', label: '🧱 Hold every levee', readiness: 0, eval: 0, risk: 0.4, fail: { eval: -8, text: 'The levee failed. The town flooded.' } },
    ] },
    { id: 'project', title: 'A Project Over Budget', text: 'A billion-dollar lock project is 40% over budget.', options: [
      { id: 'tell', label: '📊 Tell Congress the truth', readiness: 0, eval: 3 },
      { id: 'rebaseline', label: '📝 Quietly rebaseline it', readiness: 1, eval: 0, risk: 0.3, fail: { eval: -6, text: 'The GAO found it.' } },
    ] },
  ],
};
/** Other forces: neutral wording for American decision texts. */
const localize = (text, svc) => (svc?.nation ? String(text).replace(/Washington/g, 'the government').replace(/the President's budget/g, 'the government\'s budget').replace(/The Secretary/g, 'The Minister').replace(/the Secretary/g, 'the Minister').replace(/the Joint Staff/g, 'Defence headquarters').replace(/Congress/g, 'Parliament').replace(/State Department/g, 'Foreign Ministry') : text);
const poolFor = (key) => (key?.startsWith('spec:') ? SPECIALTY_DECISIONS[key.slice(5)] : DECISIONS[key]);
const tierOf = (grade) => (grade <= 5 ? 'brigade' : grade <= 7 ? 'flag' : 'senior');

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

const seeded = (state, svc) => new Random(((state.world?.seed ?? 1) * 6971 + state.character.age * 37 + svc.grade * 101) >>> 0);

/** Odds a board picks you for command at your grade: your eval and your record. */
export function commandOdds(svc) {
  const rec = svc.flagRecord ?? {};
  return clamp(0.25 + (svc.eval - 80) / 60 + (rec.excellent ?? 0) * 0.12 - (rec.poor ?? 0) * 0.15 + (svc.joint ? 0.05 : 0) - (svc.reprimand ? 0.3 : 0), 0.05, 0.85);
}

function newPost(ctx, svc) {
  const { state } = ctx;
  const r = seeded(state, svc);
  const def = commandFor(svc, r);
  const select = def && r.chance(commandOdds(svc));
  const until = state.character.age + (TOUR[svc.grade] ?? 2);
  if (select) {
    const unit = def.unit;
    ctx.prompt({
      type: 'militaryCommands.offer', icon: '🎖️', title: 'Selected for Command',
      text: `The board selected you to command: ${def.title}, ${unit} (${def.size}). A ${TOUR[svc.grade] ?? 2}-year tour. Command is where careers are made — and ended.`,
      options: [{ id: 'accept', label: `🎖️ Take command of ${unit}` }, { id: 'staff', label: '🗂️ Decline: a staff job instead' }],
      data: { title: def.title, unit, until },
    });
  } else {
    svc.post = { kind: 'staff', title: r.pick(staffPostsFor(svc)), unit: svc.nation ? 'Defence headquarters' : 'Headquarters', grade: svc.grade, untilAge: until, decisions: 0 };
    ctx.log(`New assignment: ${svc.post.title}.`, '🗂️', 'military');
  }
}

function decision(ctx, svc) {
  const { state, rng } = ctx;
  // A corps with its own decisions faces those most years; the rest of the time, the tier's.
  const key = SPECIALTY_DECISIONS[svc.specialty] && (svc.grade <= 6 || rng.chance(0.6)) ? `spec:${svc.specialty}` : tierOf(svc.grade);
  const d = rng.pick(poolFor(key));
  ctx.prompt({
    type: 'militaryCommands.decision', icon: '🗺️', title: d.title,
    text: `${svc.post.title}, ${svc.post.unit} · readiness ${svc.post.readiness}%\n${localize(d.text, svc)}`,
    options: d.options.map((o) => ({ id: o.id, label: localize(o.label, svc), tone: o.risk >= 0.35 ? 'danger' : undefined })),
    data: { tier: key, id: d.id },
  });
  void state;
}

/** The end of a tour: a record, maybe a medal, and the next post. */
function endTour(ctx, svc) {
  const p = svc.post;
  const rec = (svc.flagRecord ??= { excellent: 0, good: 0, poor: 0, relieved: false, commands: [] });
  if (p.kind === 'command') {
    const grade = p.readiness >= 75 && svc.eval >= 80 ? 'excellent' : p.readiness >= 50 ? 'good' : 'poor';
    rec[grade] += 1;
    rec.commands = [...rec.commands.slice(-5), { title: `${p.title}, ${p.unit}`, result: grade, age: ctx.state.character.age }];
    if (grade !== 'poor') awardMedal(ctx, svc.grade >= 6 ? 'dsm' : 'legionOfMerit', { branch: svc.branch, citation: `For exceptionally ${grade === 'excellent' ? 'distinguished' : 'meritorious'} service as ${p.title}, ${p.unit}.` });
    ctx.log(`You relinquished command of ${p.unit}. ${grade === 'excellent' ? 'An excellent command: the kind boards remember.' : grade === 'good' ? 'A solid command.' : 'A troubled command. It will follow you.'}`, '🏳️', grade === 'poor' ? 'warn' : 'good');
  }
  svc.post = null;
}

function relieve(ctx, svc, why) {
  const p = svc.post;
  svc.flagRecord ??= { excellent: 0, good: 0, poor: 0, relieved: false, commands: [] };
  svc.flagRecord.relieved = true;
  svc.reprimand = true;
  ctx.log(`You were relieved of command of ${p.unit}: ${why}`, '🚪', 'bad');
  ctx.stat('happiness', -12);
  svc.post = null;
  if (svc.yearsOfService >= 20) discharge(ctx, 'retired', `Retired after being relieved of command of ${p.unit}.`);
}

/** Yearly for colonels, generals and admirals on active duty. */
export function seniorYear(ctx) {
  const { state, rng } = ctx;
  const svc = state.military.service;
  if (!svc || svc.component !== 'active' || svc.track !== 'officer' || svc.grade < SENIOR_GRADE || svc.topPost || svc.commissioning || svc.assignment) return;
  if (!familyOf(svc)) return;
  if (state.prompts.some((p) => p.type.startsWith('militaryCommands.'))) return;
  // A promotion (or a new grade) ends the old post.
  if (svc.post && (svc.post.grade !== svc.grade || state.character.age >= svc.post.untilAge)) endTour(ctx, svc);
  // Past your limits, no new post: the tour you were on was your last.
  if (!svc.post) return pastTenure(state, svc) ? undefined : newPost(ctx, svc);
  const p = svc.post;
  if (p.kind === 'command') {
    // Readiness follows the defense budget and drifts back toward it.
    const funding = serviceLevel(state, 'national', 'defense');
    p.readiness = Math.round(clamp(p.readiness + (55 + (funding - 1) * 80 - p.readiness) * 0.2 + rng.int(-4, 4), 0, 100));
    if (p.readiness < 25 && rng.chance(0.5)) return relieve(ctx, svc, 'readiness collapsed on your watch.');
    decision(ctx, svc);
    svc.eval = Math.round(clamp(svc.eval + (p.readiness - 55) / 15, 0, 100));
  } else if (rng.chance(0.35)) {
    ctx.log(localize(rng.pick([`As ${p.title} you briefed the Secretary on a plan you'd worked on for a year.`, `Your staff work on ${p.title.includes('Plans') ? 'the war plan' : 'the budget'} went all the way up.`, 'A staff year: long days, good work, and a better sense of how the building works.']), svc), '🗂️', 'military');
    svc.eval = Math.round(clamp(svc.eval + 1, 0, 100));
  }
}

/* ------------------------------------------------------------------ */
/* Resolvers                                                           */
/* ------------------------------------------------------------------ */

export const MilitaryCommandsModule = {
  id: 'militaryCommands',
  order: 20.6,
  onAgeUp(ctx) {
    seniorYear(ctx);
  },
  resolvers: {
    offer(ctx, data, optionId) {
      const svc = ctx.state.military.service;
      if (!svc) return;
      if (optionId === 'accept') {
        svc.post = { kind: 'command', title: data.title, unit: data.unit, grade: svc.grade, untilAge: data.until, readiness: 55, decisions: 0 };
        ctx.log(`You took command of ${data.unit} as ${data.title}.`, '🎖️', 'milestone');
        ctx.stat('happiness', 8);
      } else {
        svc.post = { kind: 'staff', title: staffPostsFor(svc)[0], unit: svc.nation ? 'Defence headquarters' : 'Headquarters', grade: svc.grade, untilAge: data.until, decisions: 0 };
        ctx.log(`You turned down command for ${svc.post.title}. Boards will notice.`, '🗂️', 'warn');
      }
    },
    decision(ctx, data, optionId) {
      const { state, rng } = ctx;
      const svc = state.military.service;
      const p = svc?.post;
      const d = poolFor(data.tier)?.find((x) => x.id === data.id);
      const o = d?.options.find((x) => x.id === optionId);
      if (!p || p.kind !== 'command' || !o) return;
      p.decisions += 1;
      let readiness = o.readiness ?? 0;
      let evalDelta = o.eval ?? 0;
      let text = null;
      let fx = null;
      if (o.needs != null) fx = p.readiness >= o.needs ? null : o.fail;
      else if (o.risk && rng.chance(o.risk)) fx = o.fail;
      else if (o.win && rng.chance(0.65)) fx = o.win;
      if (fx) {
        readiness += fx.readiness ?? 0;
        evalDelta += fx.eval ?? 0;
        text = fx.text;
        if (fx.casualties) { ctx.stat('stress', 12); ctx.stat('happiness', -8); }
        if (fx.medal) awardMedal(ctx, 'dsm', { branch: svc.branch, citation: `For a successful operation as ${p.title}, ${p.unit}.` });
        if (fx.scandal) { svc.reprimand = true; if (rng.chance(0.5)) { ctx.log(text, '📰', 'bad'); return relieve(ctx, svc, 'a scandal you were accused of covering up.'); } }
      }
      if (o.budget) {
        const b = budgetAt(state, 'national');
        if (b && rng.chance(0.5)) b.funding.defense = Math.round(clamp((b.funding.defense ?? 1) * (1 + o.budget), 0.6, 1.4) * 1000) / 1000;
      }
      if (o.deploy) svc.deployedThisYear = true;
      p.readiness = Math.round(clamp(p.readiness + readiness, 0, 100));
      svc.eval = Math.round(clamp(svc.eval + evalDelta, 0, 100));
      if (o.resign) {
        ctx.log('You submitted your resignation in protest. It made the front page; history will judge.', '📜', 'milestone');
        return discharge(ctx, svc.yearsOfService >= 20 ? 'retired' : 'honorable', 'Resigned in protest of an order.');
      }
      ctx.log(`${d.title}: ${localize(o.label, svc).replace(/^\S+\s/, '')}.${text ? ` ${localize(text, svc)}` : ''} Readiness ${p.readiness}%.`, '🗺️', fx === o.fail ? 'warn' : undefined);
    },
  },
};

/** For views. */
export const postLabel = (svc) => (svc?.post ? `${svc.post.title}${svc.post.unit ? `, ${svc.post.unit}` : ''}` : null);
export const rankLabel = (svc) => `${rankOf(svc).title} · ${branchOf(svc).name}`;
