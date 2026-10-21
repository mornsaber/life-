/**
 * Police work beyond the ladder (city police, sheriff's deputies, state
 * troopers, transit police, airport police, and campus / hospital /
 * railroad special police).
 *
 *   Where & when   A precinct or patrol area (downtown, suburbs, the
 *                  busiest district, rural county) and a shift (days,
 *                  evenings, midnights with a differential).
 *   Units          Specialty assignments you apply for after a few years:
 *                  K-9, SWAT, traffic/motors, narcotics, gangs, crisis
 *                  negotiator, school resource officer, academy instructor,
 *                  internal affairs. Detectives pick a bureau: homicide,
 *                  special victims, property, robbery, cyber.
 *   The work       Thousands of calls, arrests and court time; calls that
 *                  become decisions — domestic violence, traffic stops, a
 *                  mental-health crisis, a foot pursuit, a man with a gun,
 *                  an active shooter. Use of force draws complaints and
 *                  reviews; an officer-involved shooting means
 *                  administrative leave, internal affairs and a grand jury.
 *   Integrity      Lie in a report and get caught, and you land on the
 *                  prosecutor's Brady list: your testimony is impeachable,
 *                  and detectives on the list are done.
 *   Money          Off-duty details (paid security and traffic posts) and
 *                  court overtime can add a third to a patrol salary.
 *   Promotions     Civil-service exams and eligibility lists (CivilService).
 *
 * state.police = { area, shift, unit, bureau, calls, arrests, uof, complaints, commendations, ois, injuries, brady, details }
 */
import { gearSafety } from '../equipment/Equipment.js';
import { clamp } from '../../core/Random.js';
import { jobPayCovered } from '../retirement/PensionPlans.js';
import { addHonor, yearlyCount, bumpYearly, yearsInProfession } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { recalcSalary } from '../career/Compensation.js';
import { leaveJob } from '../career/CareerEngine.js';
import { sitExam, listTick, nextExam } from './CivilService.js';
import { offenseName } from '../legal/Offenses.js';
import { SIZE_ORDER } from '../career/Ladder.js';
import { cityPopulation } from '../org/Staffing.js';
import { fromPacks } from '../world/packs/index.js';

export const POLICE_PROFESSIONS = ['police', 'sheriff', 'statePolice', 'transitPolice', 'airportPolice', 'privatePolice', 'universityPolice'];
export const isCop = (job) => POLICE_PROFESSIONS.includes(job?.professionId);

const CITY = ['police', 'sheriff', 'transitPolice'];

export const AREAS = {
  smalltown: { name: 'Town patrol', icon: '🏘️', calls: 0.55, risk: 0.7, stress: 2, only: ['police'], maxPop: 60000, desc: 'The whole town is your beat. You know everyone — and backup is a county deputy twenty minutes away.' },
  downtown: { name: 'Downtown precinct', icon: '🏙️', calls: 1.1, risk: 1.0, stress: 4, only: CITY, minPop: 60000, desc: 'Bars, protests, tourists and the homeless shelter.' },
  suburban: { name: 'Residential district', icon: '🏡', calls: 0.75, risk: 0.6, stress: 2, only: CITY, minPop: 30000, desc: 'Burglaries, fender-benders and noise complaints. Quieter.' },
  district: { name: 'The busiest district', icon: '🚨', calls: 1.4, risk: 1.6, stress: 6, commend: 1.5, complaints: 1.4, only: CITY, minPop: 250000, desc: 'Most of the city\'s shootings. Busy every shift — commendations and complaints both.' },
  rural: { name: 'Rural patrol area', icon: '🌾', calls: 0.5, risk: 0.9, stress: 3, only: ['sheriff', 'statePolice'], desc: 'Huge territory, backup twenty minutes away.' },
  highway: { name: 'Highway patrol', icon: '🛣️', calls: 0.8, risk: 0.9, stress: 3, only: ['statePolice'], desc: 'Crashes, DUIs and interdiction stops on the interstate.' },
  terminal: { name: 'Terminals & curbside', icon: '🛄', calls: 0.9, risk: 0.5, stress: 3, only: ['airportPolice'], desc: 'Unruly passengers, unattended bags, lost children and curbside chaos.' },
  airfield: { name: 'Airfield & cargo', icon: '🛫', calls: 0.5, risk: 0.6, stress: 2, only: ['airportPolice'], desc: 'Perimeter fence, cargo theft and runway incursions.' },
  campus: { name: 'Campus / hospital patrol', icon: '🏫', calls: 0.6, risk: 0.5, stress: 2, only: ['privatePolice', 'universityPolice'], desc: 'Dorms, labs, parking structures and the hospital ER — or, for railroad police, the rail yards.' },
  gameday: { name: 'Athletics & events', icon: '🏟️', calls: 0.7, risk: 0.5, stress: 3, only: ['universityPolice'], desc: 'Football Saturdays, concerts and commencement: 90,000 people and a lot of beer.' },
};

/** Can you patrol here? Your agency's areas, and only the ones a place this size has. */
export function areaOk(state, id) {
  const a = AREAS[id];
  const job = state.career.job;
  if (!a || !job) return { ok: false, reason: 'Unknown area' };
  if (a.only && !a.only.includes(job.professionId)) return { ok: false, reason: 'Not in your agency' };
  const pop = cityPopulation(state.character.regionId);
  // A sheriff covers the county: its precincts follow the county's size, not the town's.
  if (job.professionId === 'sheriff') return { ok: true };
  if (a.minPop && pop < a.minPop) return { ok: false, reason: 'Your town is too small for one' };
  if (a.maxPop && pop > a.maxPop) return { ok: false, reason: 'A city this size has precincts, not one town beat' };
  return { ok: true };
}
/** The area a new officer starts in. */
export function defaultArea(state, job) {
  const fixed = { statePolice: 'highway', sheriff: 'rural', airportPolice: 'terminal', privatePolice: 'campus', universityPolice: 'campus' }[job.professionId];
  if (fixed) return fixed;
  const pop = cityPopulation(state.character.regionId);
  return pop <= 60000 ? 'smalltown' : pop < 250000 ? 'suburban' : 'downtown';
}

export const SHIFTS = {
  days: { name: 'Day shift', icon: '☀️', pay: 1.0, stress: 0 },
  evenings: { name: 'Evening shift', icon: '🌆', pay: 1.03, stress: 1 },
  midnights: { name: 'Midnights', icon: '🌙', pay: 1.06, stress: 3 },
};

/** Specialty assignments. `bureau`: detectives only. */
export const UNITS = {
  k9: { name: 'K-9 handler', icon: '🐕', years: 3, fitness: 55, pay: 5000, risk: 1.2, desc: 'You and your dog: tracking, building searches, narcotics sniffs. The dog lives with you.' },
  swat: { name: 'SWAT', icon: '🛡️', years: 3, fitness: 65, pay: 6000, risk: 1.6, selection: true, desc: 'High-risk warrants, barricades and hostage calls. Brutal selection.' },
  traffic: { name: 'Traffic / motors', icon: '🏍️', years: 2, pay: 3000, risk: 1.1, desc: 'Crash reconstruction and enforcement on a police motorcycle.' },
  narcotics: { name: 'Narcotics (undercover)', icon: '🕶️', years: 3, pay: 4000, risk: 1.4, stress: 5, desc: 'Buys, informants and wiretaps. Cash and temptation everywhere.' },
  gang: { name: 'Gang unit', icon: '🧢', years: 3, pay: 3000, risk: 1.4, desc: 'Proactive work against the groups behind the shootings.' },
  negotiator: { name: 'Crisis negotiator', icon: '🗣️', years: 4, cred: 'cit', pay: 2000, risk: 0.8, desc: 'On call for barricades, suicidal subjects and hostage situations.' },
  sro: { name: 'School resource officer', icon: '🏫', years: 2, pay: 0, risk: 0.4, stress: -3, desc: 'A school as your beat. Summers on patrol.' },
  instructor: { name: 'Academy instructor', icon: '🎓', years: 5, cred: 'fto', pay: 2000, risk: 0.3, stress: -2, desc: 'Teach recruits defensive tactics, law and report writing.' },
  ia: { name: 'Internal affairs', icon: '🔍', years: 6, minGrade: 5, pay: 2000, risk: 0.2, desc: 'Investigate other officers. Necessary — and lonely.' },
  protection: { name: 'Dignitary protection', icon: '🕴️', years: 4, fitness: 55, minSize: 'large', pay: 5000, risk: 0.5, stress: 2, selection: true, desc: 'Close protection for officials and visiting dignitaries. Long days, travel, standing very still.' },
};
/** What each specialty is called in other countries' forces (missing: the generic name). */
const UNIT_NAMES = {
  GB: { k9: 'Dog Section', swat: 'Armed Response (firearms officer)', traffic: 'Roads Policing Unit', narcotics: 'Drugs Squad (undercover)', gang: 'Gangs Task Force', negotiator: 'Hostage & Crisis Negotiator', sro: 'Safer Schools Officer', instructor: 'Police Training School', ia: 'Professional Standards Department', protection: 'Protection Team' },
  CA: { swat: 'Emergency Task Force', traffic: 'Traffic Services', ia: 'Professional Standards', sro: 'School Liaison Officer' },
  AU: { swat: 'Tactical Operations Unit', k9: 'Dog Squad', traffic: 'Highway Patrol', ia: 'Professional Standards Command', protection: 'Protection Unit' },
  DE: { k9: 'Diensthundestaffel', swat: 'SEK (Spezialeinsatzkommando)', traffic: 'Verkehrspolizei', narcotics: 'Rauschgiftdezernat (verdeckt)', gang: 'OK-Dezernat (Organisierte Kriminalität)', negotiator: 'Verhandlungsgruppe', ia: 'Dezernat Interne Ermittlungen', instructor: 'Polizeiakademie (Ausbilder)', protection: 'Personenschutz (LKA)' },
  FR: { k9: 'Brigade cynophile', swat: 'BRI / RAID', traffic: 'Brigade motocycliste', narcotics: 'Brigade des stupéfiants', gang: 'Brigade anti-criminalité (BAC)', negotiator: 'Négociateur (RAID)', ia: 'IGPN (police des polices)', protection: 'Service de la protection (SDLP)' },
  IT: { k9: 'Unità cinofila', swat: 'NOCS', traffic: 'Polizia Stradale', narcotics: 'Sezione narcotici', gang: 'Squadra Mobile (criminalità organizzata)', protection: 'Servizio scorte' },
  JP: { swat: 'SAT (Special Assault Team)', traffic: 'Traffic Division', narcotics: 'Organized Crime Division (drugs)', gang: 'Organized Crime Division (bōryokudan)', protection: 'Security Police (SP)', ia: 'Inspection Division' },
  KR: { swat: 'Police Special Operations Unit (KNP-868)', traffic: 'Traffic Police', narcotics: 'Drug Crimes Investigation Unit', gang: 'Organized Crime Unit', protection: 'VIP Protection Unit' },
  MX: { swat: 'Grupo de Operaciones Especiales', traffic: 'Policía Vial', narcotics: 'Unidad contra el narcomenudeo', ia: 'Asuntos Internos', protection: 'Escoltas' },
  PH: { swat: 'SWAT / Special Action Force', traffic: 'Highway Patrol Group', narcotics: 'Drug Enforcement Unit', ia: 'Internal Affairs Service', protection: 'Police Security and Protection Group' },
  IN: { swat: 'Quick Reaction Team', traffic: 'Traffic Police', narcotics: 'Anti-Narcotics Cell', gang: 'Special Task Force', protection: 'Security Wing (VIP protection)' },
};
fromPacks(UNIT_NAMES, 'POLICE_UNITS');
const BUREAU_NAMES = {
  GB: { homicide: 'Major Investigation Team (homicide)', svu: 'Public Protection (sexual offences)', property: 'Burglary & Acquisitive Crime', robbery: 'Robbery Squad', cyber: 'Cyber Crime Unit' },
  AU: { homicide: 'Homicide Squad', svu: 'Sex Crimes Squad', property: 'Property Crime Squad', robbery: 'Armed Robbery Squad', cyber: 'Cybercrime Squad' },
  DE: { homicide: 'Mordkommission', svu: 'Sexualdelikte', property: 'Eigentumsdelikte', robbery: 'Raubdezernat', cyber: 'Cybercrime' },
  FR: { homicide: 'Brigade criminelle', svu: 'Brigade de protection des mineurs', property: 'Brigade de répression du banditisme', robbery: 'BRB (vols à main armée)', cyber: 'Brigade de lutte contre la cybercriminalité' },
  IT: { homicide: 'Squadra Mobile (omicidi)', svu: 'Sezione reati sessuali', property: 'Sezione reati contro il patrimonio', robbery: 'Sezione rapine', cyber: 'Polizia Postale' },
};
fromPacks(BUREAU_NAMES, 'POLICE_BUREAUS');
/** A specialty as this force calls it: RaSP is a Met command, not an agency of its own. */
export function unitName(state, id) {
  const cc = state.character.countryId ?? 'US';
  if (id === 'protection' && cc === 'GB' && /Metropolitan/.test(state.career.job?.employer?.name ?? '')) return 'Royalty and Specialist Protection (RaSP)';
  return UNIT_NAMES[cc]?.[id] ?? UNITS[id]?.name;
}
export const bureauName = (state, id) => BUREAU_NAMES[state.character.countryId ?? 'US']?.[id] ?? BUREAUS[id]?.name;
export const BUREAUS = {
  homicide: { name: 'Homicide', icon: '🕯️', stress: 6, desc: 'Every case is someone\'s child. Clearance rates are watched.' },
  svu: { name: 'Special victims', icon: '🧸', stress: 7, desc: 'Sexual assault and child abuse. The hardest cases in the building.' },
  property: { name: 'Property crimes', icon: '🏠', stress: 2, desc: 'Burglaries and car thefts — too many cases to solve them all.' },
  robbery: { name: 'Robbery', icon: '💰', stress: 4, desc: 'Armed robberies and carjackings.' },
  cyber: { name: 'Cyber crimes', icon: '💻', stress: 3, desc: 'Fraud, sextortion and child exploitation online.' },
};

const pd = (state) => state.police;
export const isDetective = (job) => /detective|investigator|majorCrimes|^det[A-Z]/i.test(job?.levelId ?? '');

export function unitEligibility(state, id) {
  const u = UNITS[id];
  const job = state.career.job;
  if (!u || !isCop(job)) return { ok: false, reason: 'Sworn officers only' };
  if (pd(state).brady && ['narcotics', 'gang', 'swat', 'instructor', 'ia'].includes(id)) return { ok: false, reason: 'You\'re on the Brady list' };
  if (yearsInProfession(state, POLICE_PROFESSIONS) < u.years) return { ok: false, reason: `${u.years} years on the job first` };
  if (u.fitness && state.stats.fitness < u.fitness) return { ok: false, reason: `Needs ${u.fitness}+ fitness` };
  if (u.cred && !hasCredential(state, u.cred)) return { ok: false, reason: u.cred === 'cit' ? 'Needs Crisis Intervention Team training' : 'Needs Field Training Officer certification' };
  if (u.minGrade && job.grade < u.minGrade) return { ok: false, reason: 'Sergeants and above' };
  if (u.minSize && SIZE_ORDER.indexOf(job.employer?.size) < SIZE_ORDER.indexOf(u.minSize)) return { ok: false, reason: 'Only large forces have this unit' };
  return { ok: true };
}

function applyPay(state, job) {
  if (job.headOf) return;
  job.payAdjust = SHIFTS[pd(state).shift]?.pay ?? 1;
  recalcSalary(state, job);
}

/* ------------------------------------------------------------------ */
/* Calls                                                               */
/* ------------------------------------------------------------------ */

/**
 * Option effects: perf, complaint (chance), commend (chance), uof, injury (chance),
 * trauma, arrest, ois (an officer-involved shooting review), brady (chance), lifesave.
 * `check`: skill target; on a miss `fail` applies.
 */
const CALLS = [
  { id: 'domestic', icon: '🏠', title: 'Domestic Violence Call', text: 'A neighbor called about screaming. The husband answers the door with scraped knuckles; his wife, behind him, says everything is fine.', options: [
    { id: 'separate', label: '🗣️ Separate them and talk to her alone', check: 50, text: 'Away from him, she told you everything. You arrested him and connected her with an advocate.', perf: 4, arrest: 1, commend: 0.1, fail: { text: 'She wouldn\'t talk. You left a card. You\'ll be back.', perf: 0 } },
    { id: 'leave', label: '🚪 She says it\'s fine — clear the call', text: 'You cleared the call.', perf: -2, risk: { chance: 0.25, text: 'Two weeks later you responded to the same address. It was much worse.', trauma: 8, perf: -6 } },
  ] },
  { id: 'stop', icon: '🚗', title: 'Traffic Stop at Night', text: 'Expired tags. The driver is nervous and keeps reaching toward the center console.', options: [
    { id: 'calm', label: '🔦 Back up, give clear commands, call for a second car', check: 45, text: 'He had a suspended license and a lot of anxiety. Ticket, no drama.', perf: 2, fail: { text: 'It took forty minutes and he filed a complaint about the wait.', complaint: 0.5 } },
    { id: 'draw', label: '🔫 Draw your weapon and order him out', text: 'He froze. There was nothing in the console but a phone charger.', complaint: 0.6, uof: 1, perf: -2 },
    { id: 'warn', label: '🙂 Give him a warning and let him go', text: 'You let him go.', risk: { chance: 0.1, text: 'He was wanted on a warrant — and the sergeant found out.', perf: -5 } },
  ] },
  { id: 'crisis', icon: '🧠', title: 'Mental Health Crisis', text: 'A man in his twenties is standing in the street with a kitchen knife, talking to people who aren\'t there.', options: [
    { id: 'deescalate', label: '🗣️ Create distance and talk him down', check: 55, cit: true, text: 'Twenty minutes of talking. He set the knife down and went to the hospital in an ambulance.', perf: 6, commend: 0.4, fail: { text: 'He charged. Your partner tased him. Nobody died; everyone remembers.', uof: 1, complaint: 0.3, trauma: 4 } },
    { id: 'taser', label: '⚡ Taser him before it escalates', text: 'The Taser worked. His family filed a complaint.', uof: 1, complaint: 0.5, perf: 1 },
  ] },
  { id: 'pursuit', icon: '🏃', title: 'Foot Pursuit', text: 'A man runs from a stolen car into the backyards.', options: [
    { id: 'chase', label: '🏃 Chase him', check: 50, fitness: true, text: 'You caught him three fences later. Stolen gun in his waistband.', perf: 5, arrest: 1, commend: 0.2, fail: { text: 'You blew out your knee on the second fence.', injury: 0.8 } },
    { id: 'perimeter', label: '📻 Set a perimeter and call for the dog', text: 'K-9 found him under a deck. Textbook.', perf: 4, arrest: 1 },
  ] },
  { id: 'gun', icon: '🔫', title: 'Man With a Gun', text: 'A 911 caller reports a man waving a gun outside a convenience store. He turns toward you as you pull up.', options: [
    { id: 'commands', label: '🗣️ Take cover and give commands', check: 50, text: 'He dropped it. It was a replica — and he\'s alive because you waited.', perf: 6, commend: 0.3, arrest: 1, fail: { text: 'He raised it. You fired.', ois: true } },
    { id: 'fire', label: '🔫 Fire before he can', text: 'You fired.', ois: true },
  ] },
  { id: 'overdose', icon: '💊', title: 'Overdose', text: 'A woman is unresponsive and blue in a fast-food bathroom. EMS is six minutes out.', options: [
    { id: 'narcan', label: '💉 Give your Narcan and start rescue breathing', text: 'She came around just as the medics walked in.', perf: 3, lifesave: true },
    { id: 'wait', label: '⏳ Wait for EMS', text: 'The medics got her back, barely.', perf: -2 },
  ] },
  { id: 'report', icon: '📝', title: 'The Report', text: 'Your use of force was reasonable — but the body camera missed the moment that justified it. Your sergeant suggests you "write it tight."', options: [
    { id: 'honest', label: '✍️ Write exactly what happened', text: 'The review was uncomfortable. You were cleared.', perf: 1 },
    { id: 'embellish', label: '🖊️ Add a detail that wasn\'t there', text: 'The report read clean.', risk: { chance: 0.3, brady: true, text: 'A defense attorney found the discrepancy on another officer\'s camera. The DA put you on the Brady list.' } },
  ] },
  { id: 'shooter', icon: '🚨', title: 'Active Shooter', text: 'Shots fired inside a high school. You\'re the second car there. The SWAT team is twenty minutes out.', options: [
    { id: 'enter', label: '🏃 Go in now with the first officer', check: 50, text: 'You found the shooter in a hallway and ended it. Children walked out past you.', perf: 15, commend: 1, valor: true, trauma: 15, fail: { text: 'You went in. You were hit in the leg, and kept going. It ended.', injury: 1, valor: true, trauma: 20 } },
    { id: 'wait', label: '⏳ Hold the perimeter and wait for SWAT', text: 'The country watched the footage of officers waiting in the hall. You were one of them.', perf: -20, trauma: 12, complaint: 1 },
  ] },
];

/** Campus policing: Clery Act warnings, Title IX, parties, protests, threat assessment. */
/** Small towns and rural patrols: everyone knows you, and backup is far away. */
const TOWN_CALLS = [
  { id: 'livestock', icon: '🐄', title: 'Cattle on the Highway', text: 'Two in the morning: a dozen steers are standing on the state highway in the dark. A truck nearly hit one.', options: [
    { id: 'herd', label: '🔦 Light them up and herd them back through the fence', check: 40, text: 'Twenty minutes of arm-waving and the fence was fixed with baling wire. The rancher brought you coffee the next week.', perf: 3, fail: { text: 'One bolted into the ditch and a pickup clipped it. Nobody was hurt; the rancher was not pleased.', perf: -1 } },
    { id: 'rancher', label: '📞 Call the rancher and set flares', text: 'The rancher came out in his pajamas. Flares kept the traffic slow until the herd was in.', perf: 2 },
  ] },
  { id: 'farmhouse', icon: '🏚️', title: 'Domestic at a Farmhouse', text: 'A woman called 911 from a farmhouse twenty miles out and hung up. Backup — a county deputy — is thirty minutes behind you.', options: [
    { id: 'wait', label: '⏳ Stage at the road and wait for backup', text: 'You went in together. He was drunk and gone to bed; she was bruised and ready to leave. You drove her to her sister\'s.', perf: 2, risk: { chance: 0.15, text: 'Those thirty minutes mattered: he\'d hurt her badly before you got there.', trauma: 6, perf: -3 } },
    { id: 'alone', label: '🚔 Go in alone', check: 55, text: 'You talked him onto the porch and into the cuffs before the deputy arrived.', perf: 6, arrest: 1, commend: 0.3, fail: { text: 'He came at you in the kitchen. You won the fight — barely.', uof: 1, trauma: 6, perf: 1 } },
  ] },
  { id: 'coach', icon: '🍺', title: 'A Familiar Face at a DUI Stop', text: 'The car weaving over the center line belongs to your kid\'s football coach. He blows a 0.12 and asks you to "do him a solid".', options: [
    { id: 'arrest', label: '⚖️ Arrest him like anyone else', text: 'It was all over town by noon. Half of it stopped speaking to you; the other half respected it.', perf: 4, arrest: 1 },
    { id: 'drive', label: '🚗 Drive him home and forget it', text: 'He was grateful.', perf: -1, offense: 'falseStatement', risk: { chance: 0.2, text: 'A dashcam doesn\'t forget. The chief found out.', perf: -8, complaint: 1 } },
  ] },
  { id: 'methlab', icon: '⚗️', title: 'The Smell From the Barn', text: 'A neighbor reports a chemical smell from an old barn at the edge of town. A rusted pickup is parked outside.', options: [
    { id: 'secure', label: '🧯 Back off, secure the area and call the state drug task force', check: 45, text: 'The task force found a meth lab and two cooks. Your name was in the paper.', perf: 6, arrest: 2, commend: 0.4, fail: { text: 'The cooks slipped out the back before the task force arrived.', perf: 1 } },
    { id: 'enter', label: '🚪 Go in and have a look', text: 'The fumes knocked you down and the cooks ran. You spent the night in the ER.', perf: -2, trauma: 4 },
  ] },
];

const CAMPUS_CALLS = [
  { id: 'clery', icon: '📣', title: 'Timely Warning', text: 'Two armed robberies near campus in one night. The Clery Act requires a "timely warning" to students — the administration worries about headlines during admissions season.', options: [
    { id: 'warn', label: '📱 Send the alert to every phone now', text: 'Students walked in groups that night. The suspect was caught on the third day.', perf: 5 },
    { id: 'delay', label: '⏳ Wait until there\'s more information', text: 'You waited.', risk: { chance: 0.4, perf: -12, text: 'A third robbery happened before the alert. The Department of Education opened a Clery investigation.' } },
  ] },
  { id: 'titleix', icon: '🫂', title: 'A Sexual Assault Report', text: 'A student reports she was assaulted at a fraternity party. She\'s not sure she wants a criminal case.', options: [
    { id: 'trauma', label: '🫂 Trauma-informed interview; explain both the criminal and Title IX paths', check: 50, text: 'She chose to go forward. The case was the first one in years the DA charged.', perf: 6, commend: 0.3, fail: { text: 'She stopped answering your calls. You still connected her with the advocate.', perf: 1 } },
    { id: 'hand', label: '📋 Hand it off to the Title IX office', text: 'The Title IX office took it from there.', perf: -1 },
  ] },
  { id: 'party', icon: '🍺', title: 'The Party', text: 'An off-campus party with three hundred students. A girl is unconscious on the lawn.', options: [
    { id: 'medical', label: '🚑 Call medics; amnesty for whoever called 911', text: 'Alcohol poisoning — she lived because her friend called. The amnesty policy did its job.', perf: 5, lifesave: true },
    { id: 'citations', label: '📝 Shut it down and write citations', text: 'You wrote forty tickets. Nobody will call 911 next time.', perf: 1, complaint: 0.3 },
  ] },
  { id: 'protest', icon: '🪧', title: 'Encampment on the Quad', text: 'Students have pitched tents on the quad. The president wants it cleared tonight.', options: [
    { id: 'talk', label: '🗣️ Negotiate a timeline with student leaders', check: 50, text: 'They took the tents down on their own on Friday. No arrests, no headlines.', perf: 6, fail: { text: 'Talks broke down; the state police cleared it and the video went national.', complaint: 0.5 } },
    { id: 'clear', label: '🚓 Clear it with mutual aid', text: 'Eighty arrests. The faculty senate voted no confidence in the president — and you.', uof: 1, complaint: 0.8, perf: -2 },
  ] },
  { id: 'threat', icon: '⚠️', title: 'Threat Assessment', text: 'A student\'s posts have turned dark: a list of names and a photo of a rifle.', options: [
    { id: 'bitTeam', label: '🧩 Convene the threat-assessment team and do a welfare check', check: 45, text: 'He was in crisis, not planning. He took a medical leave and got help.', perf: 8, commend: 0.4, fail: { text: 'He was planning. You found the rifle in his car, and stopped it.', perf: 12, valor: false, arrest: 1 } },
  ] },
  { id: 'gameday', icon: '🏟️', title: 'Game Day', text: 'Ninety thousand fans, a rival team, and a fight spilling out of the student section.', options: [
    { id: 'wade', label: '🚓 Wade in and separate them', text: 'Two arrests, one black eye — yours.', arrest: 2, injury: 0.2, perf: 3 },
    { id: 'cameras', label: '🎥 Watch the cameras and grab them at the exits', text: 'Clean arrests at Gate 4. The crowd never noticed.', arrest: 2, perf: 4 },
  ] },
];

const UNIT_EVENTS = {
  narcotics: { id: 'cash', icon: '💵', title: 'The Duffel Bag', text: 'A raid turned up $240,000 in a duffel bag. Nobody has counted it yet but you.', options: [
    { id: 'log', label: '📋 Count it on camera and log it', text: 'Every dollar went into evidence.', perf: 3 },
    { id: 'skim', label: '🤫 Take a stack nobody will miss', tone: 'danger', text: 'You took $15,000.', money: 15000, offense: 'grandTheft' },
  ] },
  k9: { id: 'k9', icon: '🐕', title: 'Your Partner', text: 'Your K-9 tracked a suspect into the woods — and the suspect had a knife.', options: [
    { id: 'send', label: '🐕 Send the dog', text: 'Your dog took the bite and held. He\'ll get a medal of his own.', perf: 5, arrest: 1 },
    { id: 'hold', label: '✋ Call him back and wait', text: 'The suspect escaped into the river bottom.', perf: -2 },
  ] },
  negotiator: { id: 'negotiate', icon: '🗣️', title: 'The Bridge', text: 'A veteran is on the wrong side of the bridge railing. You\'re the negotiator.', options: [
    { id: 'listen', label: '👂 Listen. Ask about his unit.', check: 50, text: 'Three hours later, he climbed back over and hugged you.', perf: 8, commend: 0.6, lifesave: true, fail: { text: 'You did everything right. He jumped anyway.', trauma: 15 } },
  ] },
};

function callPrompt(ctx, job) {
  const { state, rng } = ctx;
  if (state.prompts.some((p) => p.type === 'police.call')) return;
  const u = pd(state).unit;
  const campus = ['campus', 'gameday'].includes(pd(state).area) && job.professionId === 'universityPolice';
  const town = ['smalltown', 'rural'].includes(pd(state).area);
  const pool = UNIT_EVENTS[u] && rng.chance(0.4) ? [UNIT_EVENTS[u]]
    : campus && rng.chance(0.6) ? CAMPUS_CALLS
    : town && rng.chance(0.55) ? TOWN_CALLS
      : CALLS.filter((c) => (c.id !== 'shooter' || rng.chance(0.15)) && (!campus || c.id !== 'stop'));
  const c = rng.pick(pool);
  ctx.prompt({ type: 'police.call', icon: c.icon, title: c.title, text: c.text, options: c.options.map(({ id, label, tone, offense }) => ({ id, label, tone, illegal: offense ? offenseName(offense) : undefined })), data: { callId: c.id } });
}

/** Judgment under pressure: smarts, experience, training, fitness, stress. */
export function copSkill(state, { fitness = false } = {}) {
  const years = yearsInProfession(state, POLICE_PROFESSIONS);
  return state.stats.smarts * 0.35 + Math.min(25, years * 2.5) + (hasCredential(state, 'cit') ? 8 : 0) + (fitness ? (state.stats.fitness - 50) * 0.4 : 0) - Math.max(0, state.stats.stress - 65) * 0.3;
}

function apply(ctx, fx) {
  const { state, rng } = ctx;
  const p = pd(state);
  const job = state.career.job;
  if (fx.perf && job) job.performance = Math.round(clamp(job.performance + fx.perf, 0, 100));
  if (fx.arrest) p.arrests += fx.arrest;
  if (fx.uof) p.uof += fx.uof;
  if (fx.trauma) ctx.emit('health:trauma', { amount: fx.trauma, source: 'police work' });
  if (fx.complaint && rng.chance(fx.complaint)) { p.complaints += 1; ctx.log('A citizen complaint was filed against you.', '📄', 'warn'); }
  if (fx.commend && rng.chance(fx.commend)) { p.commendations += 1; ctx.log('You received a departmental commendation.', '📜', 'good'); }
  if (fx.injury && rng.chance(fx.injury * gearSafety(state))) {
    p.injuries += 1;
    ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 50) });
    if (!state.honors.some((h) => h.id === 'police.purpleHeart')) addHonor(state, { id: 'police.purpleHeart', source: 'civil', name: 'Police Purple Heart', icon: '💜', prestige: 6, precedence: 30, citation: 'Injured in the line of duty.', ribbon: [['#5b2a86', 3], ['#ffffff', 1], ['#5b2a86', 3]] });
  }
  if (fx.lifesave && !state.honors.some((h) => h.id === 'police.lifesaving')) addHonor(state, { id: 'police.lifesaving', source: 'civil', name: 'Police Lifesaving Medal', icon: '❤️', prestige: 4, precedence: 45, citation: 'For saving a life.', ribbon: [['#c62828', 2], ['#ffffff', 1], ['#c62828', 2]] });
  if (fx.valor && !state.honors.some((h) => h.id === 'police.valor')) {
    addHonor(state, { id: 'police.valor', source: 'civil', name: 'Police Medal of Valor', icon: '🏅', prestige: 15, precedence: 15, citation: 'For conspicuous bravery at risk of life.', ribbon: [['#1a2e5a', 2], ['#c9a227', 2], ['#1a2e5a', 2]] });
    ctx.log('The department awarded you the Medal of Valor.', '🏅', 'honor');
  }
  if (fx.brady) { p.brady = true; if (isDetective(job)) job.performance = Math.max(0, job.performance - 30); }
  if (fx.money) ctx.earn(fx.money, 'Cash', { retained: true });
  if (fx.offense) ctx.emit('legal:offense', { offenseId: fx.offense, context: 'skimming seized cash', discovery: 0.3, evidence: 0.7 });
  if (fx.ois) ois(ctx);
}

/** Officer-involved shooting: leave, review, and what it does to you. */
function ois(ctx) {
  const { state, rng } = ctx;
  const p = pd(state);
  const job = state.career.job;
  p.ois += 1;
  ctx.emit('health:trauma', { amount: 18, source: 'officer-involved shooting' });
  ctx.stat('stress', 12);
  const justified = rng.chance(clamp(0.6 + (copSkill(state) - 50) / 120 - p.complaints * 0.04 - (p.brady ? 0.2 : 0), 0.25, 0.92));
  if (justified) {
    ctx.log('Officer-involved shooting. Three weeks of administrative leave, an internal affairs review and a grand jury. You were cleared. You still see it when you close your eyes.', '⚖️', 'warn');
  } else if (rng.chance(0.5)) {
    ctx.log('The review found the shooting outside policy. You were fired.', '⚖️', 'bad');
    leaveJob(ctx, 'Terminated after an officer-involved shooting', { fired: true });
  } else {
    if (job) job.performance = Math.max(0, job.performance - 20);
    ctx.log('The grand jury declined to indict, but the department found policy violations: a 30-day suspension and a transfer.', '⚖️', 'bad');
  }
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const PoliceLifeModule = {
  id: 'police',
  order: 30.88,
  init(state) {
    state.police ??= { area: null, shift: 'days', unit: null, bureau: null, calls: 0, arrests: 0, uof: 0, complaints: 0, commendations: 0, ois: 0, injuries: 0, brady: false, details: 0 };
    // Royalty and Specialist Protection (and France's SDLP) used to be agencies of their own; they're units of the police.
    const job = state.career?.job;
    const into = { gb_usss: ['police', 'Metropolitan Police Service'], fr_usss: ['statePolice', 'Commissariat de Paris'] }[job?.professionId];
    if (into) {
      const [professionId, name] = into;
      job.professionId = professionId;
      job.levelId = { trainee: professionId === 'police' ? 'recruit' : 'cadet', agent: professionId === 'police' ? 'officer' : 'trooper', senior: 'detSergeant', ssa: 'detLieutenant', asac: 'captain', sac: professionId === 'police' ? 'deputyChief' : 'major' }[job.levelId] ?? (professionId === 'police' ? 'officer' : 'trooper');
      job.employer = { ...job.employer, name, size: 'mega' };
      state.police.unit = 'protection';
    }
  },
  setup(engine) {
    engine.bus.on('career:hired', ({ ctx, job }) => {
      if (!isCop(job)) return;
      const p = pd(ctx.state);
      p.unit = null;
      p.bureau = null;
      if (!p.area || !AREAS[p.area] || !areaOk(ctx.state, p.area).ok) p.area = defaultArea(ctx.state, job);
      applyPay(ctx.state, job);
    });
  },
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const p = pd(state);
    if (!isCop(job) || !job.paidThisYear || state.legal.incarceration) return;
    const area = AREAS[p.area] ?? AREAS.downtown;
    const unit = UNITS[p.unit];
    const desk = job.track === 'mgmt' && job.grade >= 6;
    // The year's work.
    const calls = desk ? 0 : Math.round(rng.int(900, 1600) * area.calls * (p.unit === 'sro' || p.unit === 'instructor' || p.unit === 'ia' ? 0.3 : 1));
    const arrests = Math.round(calls * rng.float(0.04, 0.09) * (p.unit === 'narcotics' || p.unit === 'gang' ? 1.6 : 1));
    p.calls += calls;
    p.arrests += arrests;
    const court = Math.round(arrests * rng.int(120, 260));
    if (court) ctx.earn(court, 'Court overtime', { wage: true, ssCovered: jobPayCovered(state, job) });
    if (unit?.pay) ctx.earn(unit.pay, `${unitName(state, p.unit)} assignment pay`, { wage: true, ssCovered: jobPayCovered(state, job) });
    ctx.stat('stress', area.stress + (unit?.stress ?? 0) + (SHIFTS[p.shift]?.stress ?? 0) + (p.bureau ? BUREAUS[p.bureau].stress : 0));
    ctx.emit('health:trauma', { amount: Math.round(area.risk * 2), source: 'police work' });
    if (calls) ctx.log(`${calls.toLocaleString()} calls, ${arrests} arrests${court ? `, $${court.toLocaleString()} in court overtime` : ''}.`, area.icon);
    // Line-of-duty injury.
    if (!desk && rng.chance(0.03 * area.risk * (unit?.risk ?? 1) * gearSafety(state))) apply(ctx, { injury: 1, trauma: 6 });
    // Complaints pile up; enough and you're moved off the street.
    if (p.complaints >= 6 && rng.chance(0.3)) {
      job.performance = Math.max(0, job.performance - 15);
      p.unit = null;
      ctx.log(`${p.complaints} complaints in your file. The department pulled you from your assignment for a performance improvement plan.`, '📄', 'bad');
    }
    // Officer of the year.
    if (job.performance >= 85 && p.commendations >= 3 && !state.honors.some((h) => h.id === 'police.oty') && rng.chance(0.1 * (area.commend ?? 1))) {
      addHonor(state, { id: 'police.oty', source: 'civil', name: 'Officer of the Year', icon: '⭐', prestige: 8, precedence: 40, citation: 'Named Officer of the Year by the department.' });
      ctx.log('You were named Officer of the Year.', '⭐', 'honor');
    }
    if (!desk && rng.chance(0.65)) callPrompt(ctx, job);
    listTick(ctx);
  },
  actions: {
    area(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      const a = AREAS[id];
      if (!isCop(job) || !a) return;
      const ok = areaOk(state, id);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      if (yearlyCount(state, 'police.area')) return ctx.toast('One transfer a year', 'warn');
      bumpYearly(state, 'police.area');
      pd(state).area = id;
      ctx.log(`You transferred to the ${a.name.toLowerCase()}. ${a.desc}`, a.icon);
    },
    shift(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      if (!isCop(job) || !SHIFTS[id]) return;
      if (yearlyCount(state, 'police.shift')) return ctx.toast('Shift bids happen once a year', 'warn');
      bumpYearly(state, 'police.shift');
      pd(state).shift = id;
      applyPay(state, job);
      ctx.log(`You bid onto ${SHIFTS[id].name.toLowerCase()}.`, SHIFTS[id].icon);
    },
    unit(ctx, id) {
      const { state, rng } = ctx;
      const p = pd(state);
      if (p.unit === id) { p.unit = null; return ctx.log(`You went back to patrol from ${unitName(state, id)}.`, '🚓'); }
      const ok = unitEligibility(state, id);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      if (yearlyCount(state, 'police.unit')) return ctx.toast('One application a year', 'warn');
      bumpYearly(state, 'police.unit');
      const u = UNITS[id];
      const odds = clamp(0.35 + (state.career.job.performance - 60) / 100 + (u.selection ? (state.stats.fitness - 70) / 100 : 0) - p.complaints * 0.05, 0.1, 0.9);
      if (!rng.chance(odds)) return ctx.log(`You applied for ${unitName(state, id)}. ${u.selection ? 'You washed out of selection.' : 'They picked someone with more seniority.'}`, u.icon, 'warn');
      p.unit = id;
      ctx.log(`You were selected for ${unitName(state, id)}. ${u.desc}`, u.icon, 'milestone');
    },
    bureau(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      if (!isCop(job) || !BUREAUS[id] || !isDetective(job)) return ctx.toast('Detectives only', 'warn');
      if (pd(state).brady) return ctx.toast('Detectives on the Brady list can\'t carry cases', 'warn');
      if (yearlyCount(state, 'police.bureau')) return ctx.toast('One move a year', 'warn');
      bumpYearly(state, 'police.bureau');
      pd(state).bureau = id;
      ctx.log(`You moved to ${bureauName(state, id)}. ${BUREAUS[id].desc}`, BUREAUS[id].icon);
    },
    details(ctx) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!isCop(job)) return;
      if (yearlyCount(state, 'police.details')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'police.details');
      const pay = rng.int(9000, 26000);
      pd(state).details += 1;
      ctx.earn(pay, 'Off-duty details', { wage: true, ssCovered: jobPayCovered(state, job) });
      ctx.stat('stress', 4);
      ctx.log(`You worked off-duty details all year — construction sites, stadium traffic, a bank's lobby: $${pay.toLocaleString()}.`, '🦺', 'good');
    },
    exam(ctx, prep) {
      const { state } = ctx;
      const job = state.career.job;
      if (!isCop(job) || !nextExam(job)) return;
      if (yearlyCount(state, 'cs.exam')) return ctx.toast('Exams are given once a year', 'warn');
      bumpYearly(state, 'cs.exam');
      if (prep === 'prep') ctx.spend(800, 'Promotional exam prep course', { credit: true });
      sitExam(ctx, { prep: prep === 'prep' });
    },
    peer(ctx) {
      const { state } = ctx;
      if (!isCop(state.career.job)) return;
      if (yearlyCount(state, 'police.peer')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'police.peer');
      ctx.emit('health:trauma', { amount: -8, source: 'peer support' });
      ctx.stat('stress', -5);
      ctx.log('You talked to the department\'s peer-support team and a counselor who used to be a cop.', '🫂', 'good');
    },
  },
  resolvers: {
    call(ctx, data, optionId) {
      const { state, rng } = ctx;
      const c = [...CALLS, ...TOWN_CALLS, ...CAMPUS_CALLS, ...Object.values(UNIT_EVENTS)].find((x) => x.id === data.callId);
      const o = c?.options.find((x) => x.id === optionId);
      if (!o) return;
      let fx = o;
      if (o.check != null && copSkill(state, { fitness: o.fitness }) + (o.cit && hasCredential(state, 'cit') ? 10 : 0) + rng.int(-20, 20) < o.check) fx = o.fail;
      ctx.log(fx.text, c.icon, (fx.perf ?? 0) > 0 || fx.valor ? 'good' : (fx.perf ?? 0) < 0 || fx.ois ? 'warn' : undefined);
      apply(ctx, fx);
      if (fx === o && o.risk && rng.chance(o.risk.chance)) {
        ctx.log(o.risk.text, c.icon, 'bad');
        apply(ctx, o.risk);
      }
    },
  },
};
