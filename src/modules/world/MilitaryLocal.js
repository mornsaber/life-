/**
 * Each country's armed forces beyond names and ranks (NationalForces.js):
 * special-duty tours, top posts, professional military education, skill
 * courses, special forces, unit and billet names, how careers end, and what
 * minor discipline is called. The engine's US content is the template; a
 * country entry overrides it, and `null` means the thing doesn't exist there
 * (no Marine Security Guards outside the US, no Air Assault School).
 *
 * Adding a country: give it what differs. Anything left out falls back to a
 * generic, country-neutral version (never the US one).
 */
import { FORCES } from './NationalForces.js';
import { fromPacks, fromPacksNested } from './packs/index.js';

const strip = (s) => (s ?? '').replace(/^the /, '');
const familyOf = (branch) => (branch === 'marines' ? 'marines' : branch === 'navy' ? 'naval' : branch === 'airforce' ? 'air' : 'ground');

/* ------------------------------------------------------------------ */
/* Special duty, top posts and commissioning                           */
/* ------------------------------------------------------------------ */

/** By country: assignment id → { names: string | {branch}, places?, desc?, flavor? } or null. */
const SPECIAL = {
  GB: {
    drill: { names: { army: 'Section Commander, Army Training Centre', navy: 'Divisional Senior Rate (recruit training)', airforce: 'Recruit Training Instructor', marines: 'Training Team Corporal' }, places: { army: 'ATC Pirbright', navy: 'HMS Raleigh', airforce: 'RAF Halton', marines: 'CTCRM Lympstone' } },
    recruiter: { names: 'Armed Forces Careers Office recruiter' },
    honorGuard: { names: { army: 'The King\'s Guard (Household Division)', navy: 'Royal Navy Ceremonial Guard', airforce: 'The King\'s Colour Squadron', marines: 'Royal Marines ceremonial guard' }, desc: 'Changing the Guard, Trooping the Colour and state funerals.' },
    rotc: { names: { army: 'Training Officer, University Officers\' Training Corps', navy: 'Staff Officer, University Royal Naval Unit', airforce: 'Flying Instructor, University Air Squadron' }, desc: 'Train student officers at a university unit. Regular hours.' },
    joint: { names: 'Staff Officer, Ministry of Defence (Main Building, Whitehall)', desc: 'Three years in the Ministry of Defence. The joint qualification senior boards look for.' },
    fellow: { names: 'Armed Forces Parliamentary Scheme fellow', desc: 'A year attached to Parliament, briefing MPs and peers on defence.' },
    commissioning: 'Commissioning from the ranks (Sandhurst / Dartmouth / Cranwell)',
    chiefs: { army: 'Chief of the General Staff', navy: 'First Sea Lord', airforce: 'Chief of the Air Staff', marines: 'Commandant General Royal Marines' },
    chairman: 'Chief of the Defence Staff',
  },
  CA: {
    drill: { names: 'Recruit instructor', places: 'CFLRS Saint-Jean' },
    recruiter: { names: 'Canadian Forces Recruiting Centre recruiter' },
    honorGuard: { names: 'Ceremonial Guard, Parliament Hill', desc: 'Changing the Guard on Parliament Hill and national ceremonies.' },
    rotc: null,
    joint: { names: 'Staff Officer, National Defence Headquarters (Ottawa)' },
    fellow: null,
    commissioning: 'Continuing Education Officer Training Plan (CEOTP)',
    chiefs: { army: 'Commander of the Canadian Army', navy: 'Commander of the Royal Canadian Navy', airforce: 'Commander of the Royal Canadian Air Force' },
    chairman: 'Chief of the Defence Staff',
  },
  AU: {
    drill: { names: { army: 'Section Commander, Kapooka', navy: 'Recruit Instructor', airforce: 'Recruit Instructor' }, places: { army: 'ARTC Kapooka', navy: 'HMAS Cerberus', airforce: 'RAAF Base Wagga' } },
    recruiter: { names: 'Defence Force Recruiting military adviser' },
    honorGuard: { names: 'Australia\'s Federation Guard', desc: 'State ceremonies, Anzac Day and the national memorial in Canberra.' },
    rotc: { names: { army: 'Instructor, University Regiment' }, desc: 'Train reserve officer cadets at a university regiment.' },
    joint: { names: 'Staff Officer, Defence Headquarters (Russell Offices, Canberra)' },
    fellow: { names: 'Parliamentary Defence Fellow' },
    commissioning: 'ADFA entry from the ranks',
    chiefs: { army: 'Chief of Army', navy: 'Chief of Navy', airforce: 'Chief of Air Force' },
    chairman: 'Chief of the Defence Force',
  },
  DE: {
    drill: { names: 'Ausbilder in der Grundausbildung' },
    recruiter: { names: 'Karriereberater der Bundeswehr' },
    honorGuard: { names: 'Wachbataillon beim Bundesministerium der Verteidigung', desc: 'Staatsempfänge, militärische Ehren und Trauerfeiern in Berlin.' },
    rotc: null,
    academy: { names: { army: 'Dozent an der Universität der Bundeswehr', navy: 'Dozent an der Universität der Bundeswehr', airforce: 'Dozent an der Universität der Bundeswehr' } },
    joint: { names: 'Stabsoffizier im Bundesministerium der Verteidigung (Bendlerblock)' },
    fellow: null,
    commissioning: 'Laufbahnwechsel zum Offizier (Studium an einer Universität der Bundeswehr)',
    chiefs: { army: 'Inspekteur des Heeres', navy: 'Inspekteur der Marine', airforce: 'Inspekteur der Luftwaffe' },
    chairman: 'Generalinspekteur der Bundeswehr',
  },
  FR: {
    drill: { names: 'Instructeur en formation initiale' },
    recruiter: { names: 'Conseiller en recrutement (CIRFA)' },
    honorGuard: { names: 'Détachement d\'honneur de la Garde républicaine', desc: 'Cérémonies nationales, 14 juillet et honneurs militaires aux Invalides.' },
    rotc: null,
    joint: { names: 'Officier à l\'état-major des armées (Balard)' },
    fellow: null,
    commissioning: 'Recrutement semi-direct (École militaire interarmes)',
    chiefs: { army: 'Chef d\'état-major de l\'Armée de Terre', navy: 'Chef d\'état-major de la Marine', airforce: 'Chef d\'état-major de l\'Armée de l\'Air et de l\'Espace', marines: 'Général commandant la Légion étrangère' },
    chairman: 'Chef d\'état-major des armées',
  },
  IT: {
    honorGuard: { names: 'Reparto d\'onore al Quirinale' },
    rotc: null, fellow: null,
    joint: { names: 'Ufficiale di Stato Maggiore della Difesa (Roma)' },
    commissioning: 'Concorso per ufficiali dai ruoli dei marescialli',
    chiefs: { army: 'Capo di Stato Maggiore dell\'Esercito', navy: 'Capo di Stato Maggiore della Marina', airforce: 'Capo di Stato Maggiore dell\'Aeronautica' },
    chairman: 'Capo di Stato Maggiore della Difesa',
  },
  JP: {
    honorGuard: { names: '302nd Military Police Company (honor guard)' },
    rotc: null, fellow: null,
    joint: { names: 'Joint Staff Office (Ichigaya, Tokyo)' },
    commissioning: 'Internal officer candidate selection (Bu-in kara no kanbu kōhosei)',
    chiefs: { army: 'Chief of Staff, Ground Self-Defense Force', navy: 'Chief of Staff, Maritime Self-Defense Force', airforce: 'Chief of Staff, Air Self-Defense Force' },
    chairman: 'Chief of Staff, Joint Staff',
  },
  KR: {
    honorGuard: { names: 'Ministry of National Defense Honor Guard' },
    rotc: { names: { army: 'ROTC instructor (university Hakgundan)' }, desc: 'Train ROTC cadets on a university campus.' },
    fellow: null,
    joint: { names: 'Joint Chiefs of Staff (Yongsan, Seoul)' },
    commissioning: 'Officer candidate selection from the ranks',
    chiefs: { army: 'Chief of Staff of the ROK Army', navy: 'Chief of Naval Operations (ROK Navy)', airforce: 'Chief of Staff of the ROK Air Force', marines: 'Commandant of the ROK Marine Corps' },
    chairman: 'Chairman of the Joint Chiefs of Staff',
  },
  MX: {
    honorGuard: { names: 'Guardia de honor presidencial' },
    rotc: null, fellow: null,
    joint: { names: 'Estado Mayor de la Defensa Nacional' },
    commissioning: 'Ascenso a oficial desde la tropa (Escuela Militar de Clases)',
    chiefs: { army: 'Secretario de la Defensa Nacional', navy: 'Secretario de Marina', airforce: 'Comandante de la Fuerza Aérea Mexicana' },
    chairman: null,
  },
  PH: {
    honorGuard: { names: 'AFP Honor Guard (Presidential Security Group)' },
    rotc: { names: 'Commandant, university ROTC unit', desc: 'Run a college ROTC unit.' },
    fellow: null,
    joint: { names: 'Staff Officer, AFP General Headquarters (Camp Aguinaldo)' },
    commissioning: 'Officer Candidate School (from the ranks)',
    chiefs: { army: 'Commanding General, Philippine Army', navy: 'Flag Officer in Command, Philippine Navy', airforce: 'Commanding General, Philippine Air Force', marines: 'Commandant, Philippine Marine Corps' },
    chairman: 'Chief of Staff of the Armed Forces of the Philippines',
  },
  IN: {
    honorGuard: { names: 'President\'s Bodyguard', desc: 'Rashtrapati Bhavan ceremonies and the Republic Day parade.' },
    rotc: { names: 'NCC Group officer', desc: 'Train National Cadet Corps cadets at schools and colleges.' },
    fellow: null,
    joint: { names: 'Integrated Defence Staff (New Delhi)' },
    commissioning: 'Army Cadet College entry (from the ranks)',
    chiefs: { army: 'Chief of the Army Staff', navy: 'Chief of the Naval Staff', airforce: 'Chief of the Air Staff' },
    chairman: 'Chief of Defence Staff',
  },
};
fromPacks(SPECIAL, 'MIL_SPECIAL');

/** Assignments only the US has. */
const US_ONLY_DUTY = ['msg'];
const GENERIC_DUTY = {
  drill: (b) => ({ name: 'Recruit instructor', place: strip(b.basic) }),
  recruiter: (b) => ({ name: `${b.name} recruiter`, desc: 'Meet monthly recruiting targets from a careers office.' }),
  honorGuard: (b) => ({ name: `${b.name} ceremonial guard`, desc: 'State ceremonies, military funerals and the national memorial.' }),
  rotc: () => null,
  academy: (b) => ({ name: `Instructor at ${strip(b.officerSchool)}` }),
  aide: () => ({ name: 'Aide-de-camp to a general' }),
  joint: () => ({ name: 'Staff officer, Ministry of Defence', desc: 'Three years at the defence ministry: the joint experience senior boards look for.' }),
  fellow: () => null,
};
const pickBranch = (v, branch) => (v == null ? null : typeof v === 'string' ? v : v[branch] ?? null);

/**
 * A special-duty assignment as `nation`'s forces have it: { name, place, desc, flavor } or null.
 * `us` is the engine's own assignment definition.
 */
export function localDuty(nation, branchId, id, us) {
  const b = FORCES[nation]?.branches?.[branchId];
  if (!b) return null;
  if (US_ONLY_DUTY.includes(id)) return null;
  const spec = SPECIAL[nation]?.[id];
  if (spec === null) return null;
  const generic = GENERIC_DUTY[id]?.(b);
  if (!spec && generic === null) return null;
  const name = pickBranch(spec?.names, branchId) ?? generic?.name;
  if (!name) return null;
  return {
    name,
    place: pickBranch(spec?.places, branchId) ?? generic?.place ?? null,
    desc: spec?.desc ?? generic?.desc ?? NEUTRAL_DESC[id] ?? us.desc,
    // US flavour lines name US places; abroad they're neutral.
    flavor: spec?.flavor ?? NEUTRAL_FLAVOR[id] ?? us.flavor,
  };
}
const NEUTRAL_DESC = {
  fellow: 'A year attached to parliament, working with members on defence.',
  joint: 'Three years at the defence ministry: the joint experience senior boards look for.',
  rotc: 'Train officer cadets at a university. Regular hours, family time.',
  drill: 'Turn civilians into service members. Brutal hours; promotion boards love it.',
};
const NEUTRAL_FLAVOR = {
  honorGuard: ['You stood guard at a state funeral. Not a muscle moved for two hours.', 'Hours of drill on a parade square until every movement was perfect.', 'Visiting heads of state inspected your guard of honour.'],
  joint: ['Your briefing went all the way to the chief of the defence staff.', 'You learned to speak navy, air force and army, and to write a decision paper in one page.', 'An all-nighter in the operations centre during a crisis overseas.'],
  fellow: ['You drafted a briefing that ended up in a defence committee report.', 'A year of watching how parliament really works.'],
  rotc: ['One of your cadets commissioned and asked you to present their commission.', 'You ran a field exercise for sixty cadets in the rain.'],
  recruiter: ['You spent a Saturday at a careers fair handing out leaflets.', 'A young recruit you signed up sent you a photo from their passing-out parade.'],
  drill: ['Your platoon passed out. A mother hugged you and thanked you.', 'Another intake, another 5 a.m. start. Your voice is permanently hoarse.', 'A recruit who almost quit in week two finished as the best recruit.'],
};

export const localCommissioning = (nation) => SPECIAL[nation]?.commissioning ?? 'Officer selection from the ranks';
export const localServiceChief = (nation, branchId) => (SPECIAL[nation]?.chiefs ? SPECIAL[nation].chiefs[branchId] ?? null : `Chief of the ${FORCES[nation]?.branches?.[branchId]?.name ?? 'service'}`);
export const localChairman = (nation) => (SPECIAL[nation] && 'chairman' in SPECIAL[nation] ? SPECIAL[nation].chairman : 'Chief of the Defence Staff');
/** The service's senior enlisted post: the top rung of its enlisted ranks. */
export const localTopEnlisted = (nation, branchId) => FORCES[nation]?.branches?.[branchId]?.enlisted?.[8] ?? null;

/* ------------------------------------------------------------------ */
/* Professional military education and skill courses                   */
/* ------------------------------------------------------------------ */

/** PME by country: { enlisted: [5 names] | {family: [5]}, officer: [3 names] }. */
const PME = {
  GB: {
    enlisted: { ground: ['Potential Junior NCO Cadre', 'Section Commanders\' Battle Course', 'Platoon Sergeants\' Battle Course', 'Warrant Officers\' Course', 'Senior Warrant Officers\' Course'],
      naval: ['Leading Rate Leadership Course', 'Petty Officer Leadership Course', 'Chief Petty Officer Leadership Course', 'Warrant Officers\' Course', 'Senior Warrant Officers\' Course'],
      air: ['Junior NCO Leadership Course', 'Senior NCO Leadership Course', 'Flight Sergeant Course', 'Warrant Officers\' Course', 'Senior Warrant Officers\' Course'],
      marines: ['Junior Command Course', 'Senior Command Course', 'Senior Command Course (Part 2)', 'Warrant Officers\' Course', 'Senior Warrant Officers\' Course'] },
    officer: ['Junior Officers\' Tactical Awareness Course', 'Advanced Command and Staff Course (Shrivenham)', 'Royal College of Defence Studies'],
  },
  CA: { enlisted: ['Primary Leadership Qualification', 'Intermediate Leadership Program', 'Advanced Leadership Program', 'Senior Leadership Program', 'Senior Appointment Program'], officer: ['Army Tactical Operations Course', 'Joint Command and Staff Programme (CFC Toronto)', 'National Security Programme'] },
  AU: { enlisted: ['Subject 1 for Corporal', 'Subject 1 for Sergeant', 'Subject 1 for Warrant Officer', 'RSM Designate Course', 'Senior Leadership Course'], officer: ['Combat Officers Advanced Course', 'Australian Command and Staff Course', 'Defence and Strategic Studies Course'] },
  DE: { enlisted: ['Unteroffizierlehrgang', 'Feldwebellehrgang', 'Lehrgang Oberfeldwebel', 'Stabsfeldwebellehrgang', 'Lehrgang Oberstabsfeldwebel'], officer: ['Stabsoffizierlehrgang', 'Lehrgang Generalstabsdienst (Führungsakademie Hamburg)', 'Bundesakademie für Sicherheitspolitik'] },
  FR: { enlisted: ['Formation générale élémentaire', 'Brevet de spécialiste de l\'armée de Terre', 'Brevet supérieur', 'Formation des adjudants-chefs', 'Formation des majors'], officer: ['Cours des capitaines', 'École de guerre', 'Centre des hautes études militaires'] },
  IT: { enlisted: ['Corso caporal maggiore', 'Corso sergente', 'Corso maresciallo', 'Corso primo maresciallo', 'Corso luogotenente'], officer: ['Corso di Stato Maggiore', 'Istituto Superiore di Stato Maggiore Interforze', 'Istituto Alti Studi per la Difesa'] },
  JP: { enlisted: ['Leader course (sanso)', 'Basic NCO course', 'Advanced NCO course', 'Senior NCO course', 'Sergeant major course'], officer: ['Officer Advanced Course', 'Command and General Staff College', 'National Institute for Defense Studies'] },
  KR: { enlisted: ['Junior NCO course', 'Intermediate NCO course', 'Senior NCO course', 'Sergeant major course', 'Command sergeant major course'], officer: ['Advanced Course', 'Korea National Defense University (staff course)', 'Korea National Defense University (security course)'] },
  MX: { enlisted: ['Curso de cabos', 'Curso de sargentos', 'Curso de capacitación de suboficiales', 'Curso de jefes de clases', 'Curso superior de clases'], officer: ['Curso de mando y estado mayor (básico)', 'Escuela Superior de Guerra', 'Colegio de Defensa Nacional'] },
  PH: { enlisted: ['Basic NCO Course', 'Advanced NCO Course', 'Senior NCO Course', 'First Sergeant Course', 'Command Sergeant Major Course'], officer: ['Officer Advance Course', 'AFP Command and General Staff College', 'National Defense College of the Philippines'] },
  IN: { enlisted: ['Junior Leaders\' Course', 'Senior NCO Course', 'Junior Commissioned Officers\' Course', 'Subedar Major Course', 'Senior JCO Course'], officer: ['Junior Command Course', 'Defence Services Staff College (Wellington)', 'National Defence College'] },
};
fromPacks(PME, 'PME');
const GENERIC_PME = { enlisted: ['Junior NCO course', 'Senior NCO course', 'Warrant officer course', 'Senior warrant officer course', 'Command senior NCO course'], officer: ['Captains\' career course', 'Command and staff college', 'National defence college'] };
const ENLISTED_IDX = { pme1: 0, pme2: 1, pme3: 2, pme4: 3, pme5: 4 };
const OFFICER_IDX = { opme1: 0, opme2: 1, opme3: 2 };

/** A PME course's local name (null: not a national course, use the engine's). */
export function localPme(nation, branchId, id) {
  const p = PME[nation] ?? GENERIC_PME;
  if (id in ENLISTED_IDX) {
    const e = Array.isArray(p.enlisted) ? p.enlisted : p.enlisted[familyOf(branchId)] ?? p.enlisted.ground;
    return e[ENLISTED_IDX[id]];
  }
  if (id in OFFICER_IDX) return p.officer[OFFICER_IDX[id]];
  return null;
}

/** Skill courses: id → { [country]: name | null, '*': generic }. Badge follows the course. */
const QUALS = {
  airborne: { GB: 'Basic Parachute Course (RAF Brize Norton)', CA: 'Basic Parachutist Course (Trenton)', AU: 'Basic Parachute Course (Nowra)', DE: 'Fallschirmspringerlehrgang (Altenstadt)', FR: 'Brevet parachutiste militaire (ETAP, Pau)', IT: 'Brevetto di paracadutista militare (Pisa)', JP: '1st Airborne Brigade basic parachute course', KR: 'Airborne course (Special Warfare School)', IN: 'Basic Parachute Course (Agra)', PH: 'Basic Airborne Course', MX: 'Curso básico de paracaidismo', '*': 'Basic parachute course' },
  airAssault: { '*': null },
  rangerSchool: { GB: 'All Arms Commando Course', DE: 'Einzelkämpferlehrgang', FR: 'Stage commando (CNEC Mont-Louis)', IT: 'Corso di ardimento', KR: 'Ranger course', PH: 'Scout Ranger Course', IN: 'Commando Course (Belgaum)', CA: null, AU: 'Combat Leaders\' Course', '*': 'Commando course' },
  jumpmaster: { GB: 'Parachute Jumping Instructor course', '*': 'Jumpmaster course' },
  pathfinder: { GB: 'Pathfinder selection (16 Air Assault Brigade)', '*': 'Pathfinder course' },
  freefall: { '*': 'Military free-fall course' },
  combatDiver: { GB: 'Combat diver course', FR: 'Nageur de combat course', DE: 'Kampfschwimmerlehrgang', '*': 'Combat diver course' },
  sniper: { '*': 'Sniper course' },
  expertBadge: { '*': null },
  sere: { GB: 'Conduct After Capture course', '*': 'Survival, evasion and resistance course' },
  instructor: { GB: 'Instructor course (Army School of Instruction)', DE: 'Ausbilderlehrgang', '*': 'Recruit instructor course' },
  dli: { GB: 'Defence Centre for Languages and Culture', CA: 'Canadian Forces language school', AU: 'ADF School of Languages', DE: 'Bundessprachenamt', FR: 'École interarmées du renseignement et des études linguistiques', JP: 'Defense language course (Kodaira)', '*': 'Military language school' },
};
fromPacksNested(QUALS, 'QUALS');
/** A skill course's local name: a string, null (not offered), or undefined (US: use the engine's). */
export function localQual(nation, id) {
  if (!nation || nation === 'US') return undefined;
  const q = QUALS[id];
  if (!q) return undefined;
  return nation in q ? q[nation] : q['*'];
}

/* ------------------------------------------------------------------ */
/* Special forces                                                      */
/* ------------------------------------------------------------------ */

const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
/** By country: US pipeline id → the national unit (missing or null: none). */
const SOF = {
  GB: {
    ranger: sf('Special Air Service', 'UK Special Forces selection in the Brecon Beacons', '22 Special Air Service Regiment', 'sand beret and winged dagger', 'The SAS: counter-terrorism at home and covert operations abroad.', ['a counter-terrorist standby in Hereford', 'a covert task force in the Middle East', 'a hostage-rescue alert overseas']),
    seal: sf('Special Boat Service', 'UK Special Forces selection and the SBS swimmer-canoeist course', 'Special Boat Service, Poole', 'SBS insignia', 'Maritime counter-terrorism and covert operations.', ['a maritime counter-terrorism standby', 'a ship-boarding task force', 'a covert task force in the Gulf']),
    raider: sf('Special Boat Service', 'UK Special Forces selection and the SBS swimmer-canoeist course', 'Special Boat Service, Poole', 'SBS insignia', 'Maritime counter-terrorism and covert operations.', ['a maritime counter-terrorism standby', 'a covert task force in the Gulf']),
  },
  CA: {
    ranger: sf('Joint Task Force 2', 'JTF 2 selection', 'JTF 2, Dwyer Hill', 'JTF 2 badge', 'Canada\'s counter-terrorism and special operations unit.', ['a counter-terrorism standby in Ottawa', 'a special operations task force in Iraq']),
    pararescue: sf('Search and Rescue Technician', 'the SAR Tech course at Comox', '435 Transport and Rescue Squadron', 'SAR Tech badge', 'Parachute to people in trouble anywhere in Canada.', ['a rescue standby in the Arctic', 'a mountain rescue season']),
  },
  AU: {
    ranger: sf('Special Air Service Regiment', 'SASR selection', 'Special Air Service Regiment, Campbell Barracks', 'sandy beret', 'Australia\'s most selective unit: long-range reconnaissance and counter-terrorism.', ['a counter-terrorism standby in Perth', 'a special operations task group in the Middle East']),
    seal: sf('Clearance Diver', 'the Clearance Diver course at HMAS Penguin', 'Australian Clearance Diving Team', 'clearance diver badge', 'Mine clearance, demolition and maritime special operations.', ['a mine-clearance task in the Gulf', 'a maritime counter-terrorism standby']),
  },
  DE: {
    ranger: sf('Kommando Spezialkräfte (KSK)', 'das KSK-Auswahlverfahren', 'Kommando Spezialkräfte, Calw', 'KSK-Abzeichen', 'Geiselbefreiung, Aufklärung und Kommandooperationen.', ['eine Bereitschaft zur Geiselbefreiung', 'einen Einsatz in der Sahelzone']),
    seal: sf('Kommando Spezialkräfte Marine (KSM)', 'den Kampfschwimmerlehrgang', 'Kommando Spezialkräfte Marine, Eckernförde', 'Kampfschwimmerabzeichen', 'Maritime Spezialoperationen.', ['eine Bereitschaft für maritime Terrorabwehr', 'einen Einsatz im Mittelmeer']),
  },
  FR: {
    ranger: sf('Forces spéciales Terre (1er RPIMa)', 'la sélection Forces spéciales', '1er régiment de parachutistes d\'infanterie de marine, Bayonne', 'brevet forces spéciales', 'Opérations spéciales et libération d\'otages.', ['une opération au Sahel', 'une alerte de libération d\'otages']),
    seal: sf('Commandos Marine', 'le stage commando de Lorient', 'Commando Hubert', 'béret vert', 'Opérations spéciales maritimes.', ['une alerte contre-terrorisme maritime', 'une opération dans le golfe de Guinée']),
    pararescue: sf('Commando parachutiste de l\'air n°10', 'la sélection CPA 10', 'CPA 10, Orléans', 'brevet commando de l\'air', 'Guidage aérien et récupération de personnel.', ['une opération au Levant', 'une alerte de récupération de pilote']),
  },
  IT: {
    ranger: sf('9º Reggimento "Col Moschin"', 'il corso incursori', '9º Reggimento d\'assalto paracadutisti "Col Moschin"', 'basco amaranto e brevetto incursore', 'Forze speciali dell\'Esercito.', ['una missione in Iraq', 'un\'allerta antiterrorismo']),
    seal: sf('COMSUBIN (GOI)', 'il corso incursori di Varignano', 'Gruppo Operativo Incursori', 'brevetto incursore', 'Incursori della Marina.', ['un\'allerta antiterrorismo marittimo', 'una missione nel Mediterraneo']),
    pararescue: sf('17º Stormo Incursori', 'il corso incursori dell\'Aeronautica', '17º Stormo Incursori, Furbara', 'brevetto incursore', 'Forze speciali dell\'Aeronautica.', ['un\'allerta di recupero personale']),
  },
  JP: {
    ranger: sf('Special Forces Group (JGSDF)', 'Special Forces Group selection', 'Special Forces Group, Narashino', 'special forces badge', 'Japan\'s counter-terrorism and special operations unit.', ['a counter-terrorism standby in Tokyo', 'an evacuation-of-nationals alert overseas']),
    seal: sf('Special Boarding Unit', 'Special Boarding Unit selection', 'Special Boarding Unit, Etajima', 'SBU badge', 'Ship-boarding and maritime counter-terrorism.', ['a maritime interdiction standby']),
  },
  KR: {
    ranger: sf('707th Special Mission Group', '707th selection', '707th Special Mission Group', 'special warfare badge', 'Counter-terrorism and special missions.', ['a counter-terrorism standby in Seoul', 'a deployment with the Akh unit in the UAE']),
    seal: sf('Naval Special Warfare Flotilla (UDT/SEAL)', 'UDT/SEAL training at Jinhae', 'Naval Special Warfare Flotilla', 'UDT/SEAL badge', 'Underwater demolition and maritime special operations.', ['a counter-piracy deployment with the Cheonghae unit', 'a maritime counter-terrorism standby']),
    raider: sf('Marine Special Reconnaissance', 'Marine Corps special reconnaissance training', 'ROK Marine Corps Special Reconnaissance Battalion', 'recon badge', 'Amphibious reconnaissance.', ['a deployment to the northwest islands']),
    pararescue: sf('Combat Rescue Team (SART)', 'SART selection', 'ROKAF Special Air Rescue Team', 'SART badge', 'Recover downed aircrew.', ['a rescue standby']),
  },
  MX: {
    ranger: sf('Cuerpo de Fuerzas Especiales', 'el curso de fuerzas especiales', 'Cuerpo de Fuerzas Especiales', 'boina verde', 'Operaciones especiales del Ejército.', ['una operación contra el crimen organizado', 'un despliegue en la frontera sur']),
    seal: sf('Fuerzas Especiales de la Armada', 'el curso de fuerzas especiales de la Armada', 'Fuerzas Especiales del Golfo', 'distintivo FES', 'Operaciones especiales navales.', ['una operación antinarcóticos en la costa del Pacífico']),
  },
  PH: {
    ranger: sf('First Scout Ranger Regiment', 'the Scout Ranger Course', 'First Scout Ranger Regiment', 'Scout Ranger tab', 'Light infantry and counterinsurgency.', ['a counterinsurgency campaign in Mindanao', 'an operation in the Sulu archipelago']),
    seal: sf('Naval Special Operations Command', 'the Naval Special Warfare course', 'Naval Special Operations Command', 'NAVSOCOM badge', 'Maritime special operations.', ['a maritime security operation in the Sulu Sea']),
    raider: sf('Marine Special Operations Group', 'Force Recon training', 'Marine Special Operations Group', 'Force Recon badge', 'Marine special operations.', ['an operation in Basilan']),
    pararescue: sf('505th Search and Rescue Group', 'the pararescue course', '505th Search and Rescue Group', 'pararescue badge', 'Air rescue.', ['a typhoon rescue deployment']),
  },
  IN: {
    ranger: sf('Parachute Regiment (Special Forces)', 'Para SF probation', '1 Para (SF)', 'maroon beret and Balidaan badge', 'India\'s army special forces.', ['a counter-insurgency tour in Kashmir', 'a deployment on the Line of Actual Control']),
    seal: sf('MARCOS', 'the MARCOS course', 'Marine Commando Force', 'MARCOS badge', 'Marine commandos: maritime counter-terrorism.', ['a maritime counter-terrorism standby in Mumbai', 'an anti-piracy operation in the Arabian Sea']),
    pararescue: sf('Garud Commando Force', 'Garud probation', 'Garud Commando Force', 'Garud badge', 'Air force special forces.', ['an airbase defence tour in Kashmir']),
  },
};
fromPacks(SOF, 'SOF');
/** A national special forces unit replacing a US pipeline (null: none in that country). */
export function localSof(nation, pipelineId) {
  if (!nation || nation === 'US') return undefined;
  return SOF[nation]?.[pipelineId] ?? null;
}
/** Selection phases abroad: national courses differ, so phases get neutral names. */
export const NEUTRAL_PHASES = ['Aptitude phase', 'Endurance phase', 'Tactics and jungle phase', 'Escape, evasion and resistance', 'Continuation training'];

/* ------------------------------------------------------------------ */
/* Units and billets                                                   */
/* ------------------------------------------------------------------ */

const CW_GROUND = { member: 'Section member', teamLeader: 'Fire Team Commander', squadLeader: 'Section Commander', platoonSergeant: 'Platoon Sergeant', opsNco: 'Operations Warrant Officer', firstSergeant: 'Company Sergeant Major', seniorStaffNco: 'Quartermaster Sergeant', csm: 'Regimental Sergeant Major', platoonLeader: 'Platoon Commander', xo: 'Company Second-in-Command', companyCommander: 'Officer Commanding', staff: 'Battalion Operations Officer', battalionCommander: 'Commanding Officer', higher: 'Brigade Staff', units: { squad: 'Section', platoon: 'Platoon', company: 'Company', battalion: 'Battalion' } };
const CW_NAVAL = { member: 'Able Rate', teamLeader: 'Leading Hand', squadLeader: 'Section Leading Hand', platoonSergeant: 'Section Petty Officer', opsNco: 'Department Chief Petty Officer', firstSergeant: 'Departmental Warrant Officer', seniorStaffNco: 'Fleet Staff Warrant Officer', csm: 'Executive Warrant Officer (Coxswain)', platoonLeader: 'Divisional Officer', xo: 'Deputy Head of Department', companyCommander: 'Head of Department', staff: 'Executive Officer', battalionCommander: 'Commanding Officer', higher: 'Fleet Headquarters Staff', units: { squad: 'Section', platoon: 'Division', company: 'Department', battalion: 'Ship\'s Company' } };
const CW_AIR = { member: 'Aircraftman', teamLeader: 'Team Corporal', squadLeader: 'Section Sergeant', platoonSergeant: 'Flight Sergeant', opsNco: 'Engineering Warrant Officer', firstSergeant: 'Squadron Warrant Officer', seniorStaffNco: 'Wing Warrant Officer', csm: 'Station Warrant Officer', platoonLeader: 'Flight Commander', xo: 'Squadron Executive Officer', companyCommander: 'Officer Commanding (squadron)', staff: 'Station Staff Officer', battalionCommander: 'Station Commander', higher: 'Group / Air Command Staff', units: { squad: 'Section', platoon: 'Flight', company: 'Squadron', battalion: 'Station' } };
const DE_GROUND = { member: 'Soldat im Trupp', teamLeader: 'Truppführer', squadLeader: 'Gruppenführer', platoonSergeant: 'Zugfeldwebel', opsNco: 'S3-Feldwebel', firstSergeant: 'Kompaniefeldwebel ("Spieß")', seniorStaffNco: 'Stabsfeldwebel im Stab', csm: 'Bataillonsfeldwebel', platoonLeader: 'Zugführer', xo: 'Stellvertretender Kompaniechef', companyCommander: 'Kompaniechef', staff: 'S3-Stabsoffizier', battalionCommander: 'Bataillonskommandeur', higher: 'Brigadestab', units: { squad: 'Gruppe', platoon: 'Zug', company: 'Kompanie', battalion: 'Bataillon' } };
const FR_GROUND = { member: 'Grenadier-voltigeur', teamLeader: 'Chef d\'équipe', squadLeader: 'Chef de groupe', platoonSergeant: 'Sous-officier adjoint', opsNco: 'Sous-officier opérations', firstSergeant: 'Adjudant d\'unité', seniorStaffNco: 'Adjudant-chef (état-major)', csm: 'Président des sous-officiers', platoonLeader: 'Chef de section', xo: 'Officier adjoint', companyCommander: 'Commandant d\'unité', staff: 'Officier opérations (BOI)', battalionCommander: 'Chef de corps', higher: 'État-major de brigade', units: { squad: 'Groupe', platoon: 'Section', company: 'Compagnie', battalion: 'Régiment' } };
/** Elsewhere: plain international terms instead of US ones. */
const INTL = { firstSergeant: 'Company Sergeant Major', csm: 'Battalion Sergeant Major', companyCommander: 'Company Commander', battalionCommander: 'Battalion Commander' };
const BILLETS = {
  GB: { ground: CW_GROUND, marines: { ...CW_GROUND, battalionCommander: 'Commanding Officer (Commando)', units: { ...CW_GROUND.units, battalion: 'Commando' } }, naval: CW_NAVAL, air: CW_AIR },
  CA: { ground: CW_GROUND, naval: CW_NAVAL, air: CW_AIR },
  AU: { ground: CW_GROUND, naval: CW_NAVAL, air: CW_AIR },
  IN: { ground: { ...CW_GROUND, firstSergeant: 'Company Havildar Major', csm: 'Subedar Major' }, naval: CW_NAVAL, air: CW_AIR },
  DE: { ground: DE_GROUND },
  FR: { ground: FR_GROUND, marines: FR_GROUND },
};
fromPacks(BILLETS, 'BILLETS');
/** A billet's local title (undefined: the engine's). */
export function localBillet(nation, branchId, billet) {
  if (!nation || nation === 'US') return undefined;
  const fam = familyOf(branchId);
  const set = BILLETS[nation]?.[fam] ?? BILLETS[nation]?.ground;
  return set?.[billet] ?? INTL[billet];
}
export const localUnitWord = (nation, branchId, level) => {
  const fam = familyOf(branchId);
  return (BILLETS[nation]?.[fam] ?? (fam === 'ground' || fam === 'marines' ? BILLETS[nation]?.ground : null))?.units?.[level];
};

/** Real units of each country's forces, by service family. */
const UNITS = {
  GB: { ground: ['1st Battalion, The Rifles', '2nd Battalion, The Parachute Regiment', '1st Battalion, Coldstream Guards', 'The Royal Scots Dragoon Guards', '3rd Battalion, The Royal Anglian Regiment'], naval: ['HMS Dragon', 'HMS Queen Elizabeth', 'HMS Duncan', 'HMS Kent'], air: ['No. 1 Squadron', 'No. 617 Squadron', 'No. 99 Squadron', 'No. 2 (Army Co-operation) Squadron'], marines: ['40 Commando', '42 Commando', '45 Commando'] },
  CA: { ground: ['1st Battalion, Princess Patricia\'s Canadian Light Infantry', '2nd Battalion, The Royal Canadian Regiment', '3rd Battalion, Royal 22e Régiment', 'Lord Strathcona\'s Horse (Royal Canadians)'], naval: ['HMCS Halifax', 'HMCS Fredericton', 'HMCS Ottawa', 'HMCS Montréal'], air: ['409 Tactical Fighter Squadron', '436 Transport Squadron', '413 Transport and Rescue Squadron'] },
  AU: { ground: ['1st Battalion, Royal Australian Regiment', '2nd Battalion, Royal Australian Regiment', '3rd Battalion, Royal Australian Regiment', '2nd Cavalry Regiment'], naval: ['HMAS Anzac', 'HMAS Hobart', 'HMAS Canberra', 'HMAS Toowoomba'], air: ['No. 3 Squadron', 'No. 36 Squadron', 'No. 11 Squadron'] },
  DE: { ground: ['Panzergrenadierbataillon 122', 'Jägerbataillon 292', 'Panzerbataillon 203', 'Fallschirmjägerregiment 31'], naval: ['Fregatte Sachsen', 'Fregatte Baden-Württemberg', 'Korvette Braunschweig'], air: ['Taktisches Luftwaffengeschwader 31 "Boelcke"', 'Lufttransportgeschwader 62', 'Taktisches Luftwaffengeschwader 74'] },
  FR: { ground: ['1er régiment d\'infanterie', '3e régiment de parachutistes d\'infanterie de marine', '501e régiment de chars de combat', '2e régiment d\'infanterie de marine'], naval: ['Frégate Aquitaine', 'Porte-avions Charles de Gaulle', 'Frégate Forbin'], air: ['Escadron de chasse 1/4 Gascogne', 'Escadron de transport 2/61 Franche-Comté', 'Escadron de chasse 2/30 Normandie-Niémen'], marines: ['2e régiment étranger de parachutistes', '1er régiment étranger de génie', '13e demi-brigade de Légion étrangère'] },
  IT: { ground: ['183º Reggimento paracadutisti "Nembo"', 'Reggimento "Lagunari Serenissima"', '8º Reggimento bersaglieri', '1º Reggimento alpini'], naval: ['Nave Cavour', 'Fregata Carlo Bergamini', 'Nave Andrea Doria'], air: ['4º Stormo', '36º Stormo', '46ª Brigata Aerea'] },
  JP: { ground: ['1st Airborne Brigade', '11th Infantry Regiment', 'Amphibious Rapid Deployment Brigade', '15th Brigade'], naval: ['JS Izumo', 'JS Maya', 'JS Kongō'], air: ['3rd Air Wing', '2nd Air Wing (Chitose)', 'Air Rescue Wing'] },
  KR: { ground: ['1st Infantry Division', 'Capital Mechanized Infantry Division', '7th Infantry Division', '1st Armored Brigade'], naval: ['ROKS Sejong the Great', 'ROKS Dokdo', 'ROKS Chungmugong Yi Sun-sin'], air: ['11th Fighter Wing', '17th Fighter Wing', '5th Air Mobility Wing'], marines: ['1st Marine Division', '2nd Marine Division', '6th Marine Brigade'] },
  MX: { ground: ['1er Batallón de Infantería', '19º Batallón de Infantería', '1er Regimiento de Caballería Motorizada'], naval: ['ARM Reformador', 'ARM Benito Juárez', 'ARM Oaxaca'], air: ['Escuadrón Aéreo 401', 'Escuadrón Aéreo 301', 'Ala Aérea 1'] },
  PH: { ground: ['1st Infantry Division', '7th Infantry Division', 'Light Reaction Regiment'], naval: ['BRP Jose Rizal', 'BRP Antonio Luna', 'BRP Tarlac'], air: ['5th Fighter Wing', '220th Airlift Wing', '15th Strike Wing'], marines: ['Marine Battalion Landing Team 1', 'Marine Battalion Landing Team 7', '3rd Marine Brigade'] },
  IN: { ground: ['2nd Battalion, The Rajputana Rifles', '4th Battalion, The Sikh Regiment', '1st Battalion, 1st Gorkha Rifles', '61st Cavalry'], naval: ['INS Vikrant', 'INS Kolkata', 'INS Shivalik'], air: ['No. 17 Squadron "Golden Arrows"', 'No. 1 Squadron "Tigers"', 'No. 77 Squadron'] },
};
fromPacks(UNITS, 'MIL_UNITS');
/** A unit name for `nation`'s service family (undefined: the engine's US names). */
export function localUnitName(nation, branchId, rng) {
  if (!nation || nation === 'US') return undefined;
  const fam = familyOf(branchId);
  const list = UNITS[nation]?.[fam] ?? (fam === 'marines' ? UNITS[nation]?.ground : null);
  if (list) return rng.pick(list);
  const b = FORCES[nation]?.branches?.[branchId];
  return `${rng.pick(['1st', '2nd', '3rd', '4th'])} ${fam === 'naval' ? 'Flotilla' : fam === 'air' ? 'Wing' : 'Battalion'}, ${b?.name ?? 'National Forces'}`;
}

/* ------------------------------------------------------------------ */
/* Discipline and how careers end                                      */
/* ------------------------------------------------------------------ */

/** What commanders' summary punishment is called. */
const SUMMARY = { GB: 'a summary hearing', CA: 'a summary hearing', AU: 'a summary authority hearing', DE: 'eine einfache Disziplinarmaßnahme', FR: 'une sanction disciplinaire (jours d\'arrêts)', IT: 'una sanzione disciplinare di corpo', IN: 'summary punishment under the Army Act' };
fromPacks(SUMMARY, 'MIL_SUMMARY');
export const summaryPunishment = (nation) => (!nation || nation === 'US' ? 'an Article 15' : SUMMARY[nation] ?? 'summary disciplinary punishment');

/**
 * Only the US runs officers' careers up-or-out (DOPMA). Elsewhere you serve
 * out your engagement and leave at the length-of-service or age limit for
 * your rank; being passed over just means you stay where you are.
 *   maxYears   { enlisted, officer }: longest engagement
 *   ages       { enlisted, officer, flag }: compulsory retirement ages
 */
export const SERVICE_TERMS = {
  GB: { maxYears: { enlisted: 24, officer: 34 }, ages: { enlisted: 55, officer: 55, flag: 60 }, join: { enlisted: [16, 36], officer: [18, 29] }, name: 'engagement' },
  CA: { maxYears: { enlisted: 35, officer: 35 }, ages: { enlisted: 60, officer: 60, flag: 60 }, join: { enlisted: [17, 57], officer: [17, 57] }, name: 'terms of service' },
  AU: { maxYears: { enlisted: 40, officer: 40 }, ages: { enlisted: 60, officer: 60, flag: 60 }, join: { enlisted: [17, 56], officer: [17, 56] }, name: 'period of service' },
  DE: { maxYears: { enlisted: 40, officer: 40 }, ages: { enlisted: 55, officer: 62, flag: 65 }, join: { enlisted: [17, 40], officer: [17, 30] }, name: 'Dienstzeit' },
  FR: { maxYears: { enlisted: 30, officer: 40 }, ages: { enlisted: 57, officer: 59, flag: 62 }, join: { enlisted: [17, 32], officer: [18, 30] }, name: 'contrat' },
  IT: { maxYears: { enlisted: 40, officer: 40 }, ages: { enlisted: 60, officer: 60, flag: 65 }, join: { enlisted: [18, 24], officer: [17, 22] }, name: 'ferma' },
  JP: { maxYears: { enlisted: 40, officer: 40 }, ages: { enlisted: 54, officer: 56, flag: 60 }, join: { enlisted: [18, 32], officer: [18, 26] }, name: 'term' },
  KR: { maxYears: { enlisted: 35, officer: 35 }, ages: { enlisted: 55, officer: 56, flag: 61 }, join: { enlisted: [18, 29], officer: [20, 27] }, name: 'term' },
  MX: { maxYears: { enlisted: 40, officer: 40 }, ages: { enlisted: 55, officer: 60, flag: 65 }, join: { enlisted: [18, 30], officer: [18, 25] }, name: 'term' },
  PH: { maxYears: { enlisted: 40, officer: 40 }, ages: { enlisted: 57, officer: 57, flag: 57 }, join: { enlisted: [18, 26], officer: [18, 26] }, name: 'term' },
  IN: { maxYears: { enlisted: 20, officer: 35 }, ages: { enlisted: 52, officer: 58, flag: 60 }, join: { enlisted: [17, 21], officer: [17, 25] }, name: 'term of engagement' },
};
/** US joining ages by branch: [enlisted min, enlisted max, officer max]. */
export const US_JOIN_AGES = {
  army: [17, 35, 32], navy: [17, 41, 35], airforce: [17, 42, 39], marines: [17, 28, 28], coastguard: [17, 41, 31], spaceforce: [17, 42, 39], guard: [17, 35, 35],
};
/** The ages a force takes new recruits ([min, max]) for a track; null where no limit is set. */
export function joinAges(nation, branchId, track) {
  const t = nation ? SERVICE_TERMS[nation]?.join : null;
  if (t) return t[track === 'enlisted' ? 'enlisted' : 'officer'] ?? null;
  // Forces without their own table: the broad ranges most armed forces recruit within.
  if (nation) return track === 'enlisted' ? [17, 39] : [18, 39];
  const us = US_JOIN_AGES[branchId];
  if (!us) return null;
  return track === 'enlisted' ? [us[0], us[1]] : [19, us[2]];
}
fromPacks(SERVICE_TERMS, 'SERVICE_TERMS');
/**
 * Military pensions by country (the US keeps its 20-year legacy/BRS rules).
 *   rate        share of final base pay earned per year of service; cap: the most it reaches
 *   vest        years before any pension is earned (leave sooner: nothing)
 *   immediate   { enlisted, officer }: years of service for a pension paid from the day you leave
 *               (minAge: and this age); otherwise a preserved pension starts at deferredAge
 *   early       a smaller immediate pension before the full one (the UK's Early Departure Payment)
 *   lumpSum     a one-off payment on leaving, × annual base pay per year served (Japan's taishokukin)
 */
export const MIL_PENSIONS = {
  GB: { name: 'Armed Forces Pension Scheme (AFPS 15)', rate: 1 / 47, cap: 0.75, vest: 2, immediate: { enlisted: 20, officer: 20 }, minAge: 40, early: 0.75, deferredAge: 60 },
  CA: { name: 'Canadian Forces Superannuation', rate: 0.02, cap: 0.7, vest: 2, immediate: { enlisted: 25, officer: 25 }, deferredAge: 60 },
  // ADF Super is a defined-contribution fund, preserved until 60 (shown here as the income it buys).
  AU: { name: 'ADF Super', rate: 0.016, cap: 0.6, vest: 0, immediate: null, deferredAge: 60 },
  DE: { name: 'Soldatenversorgung (Berufssoldat)', rate: 0.0179375, cap: 0.7175, vest: 5, immediate: { enlisted: 20, officer: 20 }, deferredAge: 67 },
  FR: { name: 'Pension militaire de retraite', rate: 0.02, cap: 0.75, vest: 2, immediate: { enlisted: 17, officer: 27 }, deferredAge: 64 },
  IT: { name: 'Pensione militare (INPS)', rate: 0.02, cap: 0.8, vest: 5, immediate: { enlisted: 20, officer: 20 }, deferredAge: 67 },
  JP: { name: 'SDF retirement (KKR)', rate: 0.008, cap: 0.3, vest: 1, immediate: null, deferredAge: 65, lumpSum: 0.12 },
  KR: { name: 'Military pension (군인연금)', rate: 0.019, cap: 0.62, vest: 10, immediate: { enlisted: 20, officer: 20 }, deferredAge: 65 },
  MX: { name: 'Haber de retiro (ISSFAM)', rate: 0.03, cap: 1, vest: 20, immediate: { enlisted: 20, officer: 20 }, deferredAge: 65 },
  PH: { name: 'AFP retirement pay', rate: 0.025, cap: 0.85, vest: 20, immediate: { enlisted: 20, officer: 20 }, deferredAge: 60 },
  IN: { name: 'Armed Forces pension', rate: 0.025, cap: 0.5, vest: 15, immediate: { enlisted: 15, officer: 20 }, deferredAge: 60 },
  NZ: { name: 'KiwiSaver (NZDF)', rate: 0.01, cap: 0.4, vest: 0, immediate: null, deferredAge: 65 },
  IE: { name: 'Defence Forces pension', rate: 0.025, cap: 0.5, vest: 2, immediate: { enlisted: 21, officer: 21 }, deferredAge: 60 },
  NL: { name: 'ABP (military: UKW until 67)', rate: 0.0175, cap: 0.7, vest: 1, immediate: { enlisted: 20, officer: 20 }, deferredAge: 67 },
  SE: { name: 'Statens tjänstepension (PA 16)', rate: 0.01, cap: 0.3, vest: 1, immediate: null, deferredAge: 65 },
  ES: { name: 'Clases Pasivas (militares)', rate: 0.02, cap: 0.8, vest: 15, immediate: { enlisted: 25, officer: 25 }, deferredAge: 65 },
  BR: { name: 'Reserva remunerada (militares)', rate: 1 / 35, cap: 1, vest: 30, immediate: { enlisted: 30, officer: 30 }, deferredAge: 65 },
};
fromPacks(MIL_PENSIONS, 'MIL_PENSIONS');
export const milPensionPlan = (nation) => (nation && nation !== 'US' ? MIL_PENSIONS[nation] ?? null : null);

export const upOrOutApplies = (nation) => !nation || nation === 'US';

/** Where the government sends you, for the confirmation line ("The government appointed you…"). */
export const appointingAuthority = (nation) => (!nation || nation === 'US' ? null : { GB: 'The King, on the Defence Secretary\'s advice', AU: 'The Governor-General', CA: 'The Governor General', DE: 'The Federal President', FR: 'The Council of Ministers', IN: 'The Appointments Committee of the Cabinet' }[nation] ?? 'The government');

/**
 * Military justice: the disciplinary code, what summary punishment is called,
 * the courts (null where service members go before civilian courts —
 * Germany, France and Japan have no peacetime courts-martial) and the
 * military prison.
 */
const JUSTICE = {
  GB: { code: 'the Armed Forces Act 2006', court: 'Court Martial (Military Court Centre, Bulford)', prison: 'the Military Corrective Training Centre, Colchester', counsel: 'Service defence lawyer' },
  CA: { code: 'the Code of Service Discipline', court: 'Standing Court Martial', prison: 'the Canadian Forces Service Prison and Detention Barracks, Edmonton', counsel: 'Defence Counsel Services lawyer' },
  AU: { code: 'the Defence Force Discipline Act', court: 'Defence Force Magistrate', prison: 'the Defence Force Correctional Establishment, Holsworthy', counsel: 'Defence legal officer' },
  DE: { code: 'the Wehrdisziplinarordnung', court: null, prison: 'a civilian prison', counsel: 'Rechtsanwalt' },
  FR: { code: 'the Code de la défense', court: null, prison: 'a civilian prison', counsel: 'avocat' },
  IT: { code: 'the Codice dell\'ordinamento militare', court: 'Tribunale militare', prison: 'the Carcere militare di Santa Maria Capua Vetere', counsel: 'Difensore d\'ufficio' },
  JP: { code: 'the Self-Defense Forces Act', court: null, prison: 'a civilian prison', counsel: 'defence lawyer' },
  KR: { code: 'the Military Criminal Act', court: 'General Military Court', prison: 'the Armed Forces Correctional Institution', counsel: 'Military defence counsel' },
  MX: { code: 'the Código de Justicia Militar', court: 'Tribunal Militar de Juicio Oral', prison: 'the Prisión Militar del Campo Militar No. 1', counsel: 'Defensor de oficio militar' },
  PH: { code: 'the Articles of War', court: 'General Court-Martial', prison: 'the AFP Detention Center, Camp Aguinaldo', counsel: 'JAGO defence counsel' },
  IN: { code: 'the Army Act, 1950', court: 'General Court Martial', prison: 'a military detention barracks', counsel: 'Defending officer' },
};
fromPacks(JUSTICE, 'MILITARY_JUSTICE');
/** { code, court (null: civilian courts), prison, counsel } for a nation (undefined: US). */
export const militaryJustice = (nation) => (!nation || nation === 'US' ? undefined : JUSTICE[nation] ?? { code: 'military law', court: 'Court Martial', prison: 'a military prison', counsel: 'Military defence counsel' });

/* ------------------------------------------------------------------ */
/* Security vetting                                                    */
/* ------------------------------------------------------------------ */

/** Each country's vetting levels (public trust, secret, top secret) and the form you fill in. */
const VETTING = {
  GB: { form: 'National Security Vetting questionnaire', publicTrust: 'Counter-Terrorist Check (CTC)', secret: 'Security Check (SC)', topSecret: 'Developed Vetting (DV)' },
  CA: { form: 'Personnel Screening, Consent and Authorization form', publicTrust: 'Reliability Status', secret: 'Secret clearance', topSecret: 'Top Secret clearance' },
  AU: { form: 'AGSVA security clearance pack', publicTrust: 'Baseline Vetting', secret: 'Negative Vetting 1 (NV1)', topSecret: 'Positive Vetting (PV)' },
  DE: { form: 'Sicherheitserklärung', publicTrust: 'Sicherheitsüberprüfung Ü1', secret: 'Sicherheitsüberprüfung Ü2', topSecret: 'Sicherheitsüberprüfung Ü3' },
  FR: { form: 'notice individuelle d\'habilitation', publicTrust: 'Enquête administrative', secret: 'Habilitation Secret', topSecret: 'Habilitation Très Secret' },
  IT: { form: 'questionario NOS', publicTrust: 'Nulla osta (riservato)', secret: 'NOS Segreto', topSecret: 'NOS Segretissimo' },
  JP: { form: 'security clearance questionnaire', publicTrust: 'Suitability assessment', secret: 'Specially Designated Secrets clearance', topSecret: 'Specially Designated Secrets clearance (top)' },
  KR: { form: 'security clearance questionnaire', publicTrust: 'Security screening', secret: 'Secret (II-grade) clearance', topSecret: 'Top Secret (I-grade) clearance' },
  IN: { form: 'Intelligence Bureau verification form', publicTrust: 'Police verification', secret: 'Secret clearance', topSecret: 'Top Secret clearance' },
};
fromPacks(VETTING, 'VETTING');
/** The security vetting form (the SF-86 in the US). */
export const vettingForm = (cc) => (!cc || cc === 'US' ? 'SF-86' : VETTING[cc]?.form ?? 'security vetting form');
/** A clearance level's local name (undefined: the US one). */
export const clearanceName = (cc, level) => (!cc || cc === 'US' ? undefined : VETTING[cc]?.[level]);

/* ------------------------------------------------------------------ */
/* Military jobs                                                       */
/* ------------------------------------------------------------------ */

/** Jobs that are pipelines into US units, or US-only missions. */
const US_ONLY_MOS = /Special Forces|SEAL|MARSOC|Pararescue|Special Warfare|Tactical Air Control|Nuclear and Missile|Coast Guard|CGIS/;
const MOS_WORDS = [
  [/UH-60 Helicopter Repairer/, 'Helicopter Technician'], [/ \(Seabee\)/, ''], [/Hospital Corpsman/, 'Medical Assistant'], [/Culinary Specialist/, 'Chef'],
  [/Legalman/, 'Legal Administrator'], [/Judge Advocate/, 'Legal Officer'], [/Student Naval Aviator \(Marine Pilot\)/, 'Pilot'], [/Security Forces Officer/, 'Force Protection Officer'],
  [/Security Forces/, 'Force Protection'], [/CID Special Agent/, 'Military Police Investigator'], [/Religious Affairs Specialist/, 'Chaplain\'s Assistant'],
  [/Mobility Pilot \(Airlift\/Tanker\)/, 'Transport Pilot'], [/ \(CWO\)/, ''], [/Infantryman/, 'Infantry Soldier'],
];
/**
 * A military job as another country's forces have it: a plain title (no US
 * MOS/AFSC codes or US equipment), or null where it's a US-only pipeline.
 */
export function localMos(nation, mos) {
  if (!nation || nation === 'US') return undefined;
  if (US_ONLY_MOS.test(mos.title)) return null;
  return MOS_WORDS.reduce((t, [re, to]) => t.replace(re, to), mos.title);
}

/* ------------------------------------------------------------------ */
/* Officer programmes at university, and the academies                 */
/* ------------------------------------------------------------------ */

/** University officer programmes by branch (null: none; obligation: a service contract follows). */
const CAMPUS = {
  GB: { army: 'University Officers\' Training Corps', navy: 'University Royal Naval Unit', airforce: 'University Air Squadron', obligation: false },
  CA: { army: 'Regular Officer Training Plan (Army)', navy: 'Regular Officer Training Plan (Navy)', airforce: 'Regular Officer Training Plan (Air Force)', obligation: true },
  AU: { army: 'Defence University Sponsorship (Army)', navy: 'Defence University Sponsorship (Navy)', airforce: 'Defence University Sponsorship (Air Force)', obligation: true },
  KR: { army: 'ROTC (Hakgundan)', navy: 'Naval ROTC', airforce: 'Air Force ROTC', obligation: true },
  PH: { army: 'Advance ROTC (Philippine Army)', navy: 'Naval ROTC', airforce: 'Air Force ROTC', obligation: true },
  IN: { army: 'NCC Army Wing (C certificate entry)', navy: 'NCC Naval Wing', airforce: 'NCC Air Wing', obligation: false },
};
fromPacks(CAMPUS, 'CAMPUS');
/** The university officer programme for a branch (undefined: US ROTC; null: none in that country). */
export function campusCadets(cc, branch) {
  if (!cc || cc === 'US') return undefined;
  return CAMPUS[cc]?.[branch] ?? null;
}
export const campusObligation = (cc) => (!cc || cc === 'US' ? true : CAMPUS[cc]?.obligation ?? false);

const ACADEMY_NAMES = {
  GB: { army: 'Royal Military Academy Sandhurst', navy: 'Britannia Royal Naval College, Dartmouth', airforce: 'RAF College Cranwell' },
  CA: { army: 'Royal Military College of Canada', navy: 'Royal Military College of Canada', airforce: 'Royal Military College of Canada' },
  AU: { army: 'Australian Defence Force Academy', navy: 'Australian Defence Force Academy', airforce: 'Australian Defence Force Academy' },
  DE: { army: 'Universität der Bundeswehr München', navy: 'Universität der Bundeswehr Hamburg', airforce: 'Universität der Bundeswehr München' },
  FR: { army: 'École spéciale militaire de Saint-Cyr', navy: 'École navale', airforce: 'École de l\'air et de l\'espace' },
  IT: { army: 'Accademia Militare di Modena', navy: 'Accademia Navale di Livorno', airforce: 'Accademia Aeronautica di Pozzuoli' },
  JP: { army: 'National Defense Academy of Japan', navy: 'National Defense Academy of Japan', airforce: 'National Defense Academy of Japan' },
  KR: { army: 'Korea Military Academy', navy: 'Republic of Korea Naval Academy', airforce: 'Korea Air Force Academy' },
  MX: { army: 'Heroico Colegio Militar', navy: 'Heroica Escuela Naval Militar', airforce: 'Colegio del Aire' },
  PH: { army: 'Philippine Military Academy', navy: 'Philippine Military Academy', airforce: 'Philippine Military Academy' },
  IN: { army: 'National Defence Academy, Khadakwasla', navy: 'Indian Naval Academy, Ezhimala', airforce: 'National Defence Academy, Khadakwasla' },
};
fromPacks(ACADEMY_NAMES, 'ACADEMY_NAMES');
export const academyName = (cc, branch) => (!cc || cc === 'US' ? undefined : ACADEMY_NAMES[cc]?.[branch] ?? 'the national military academy');

/* ------------------------------------------------------------------ */
/* Campus societies                                                    */
/* ------------------------------------------------------------------ */

/**
 * Fraternity-style student societies by country (null: none). The US and
 * Canada have Greek letters; Germany its Studentenverbindungen; the
 * Philippines its (notoriously hazing) fraternities; Britain its dining and
 * drinking societies.
 */
const SOCIETIES = {
  US: null,
  CA: { label: 'Greek life', join: 'Rush a fraternity or sorority', initiation: 'pledge week', president: 'chapter president', houses: ['Zeta Psi', 'Alpha Delta Phi', 'Delta Upsilon', 'Kappa Alpha Theta'], dues: 900 },
  DE: { label: 'Studentenverbindung', join: 'Join a Studentenverbindung', initiation: 'Fuxenzeit', president: 'Senior (Sprecher)', houses: ['Corps Rhenania', 'Burschenschaft Arminia', 'KStV Ripuaria', 'Landsmannschaft Teutonia'], dues: 400 },
  AT: null,
  PH: { label: 'Fraternities & sororities', join: 'Join a fraternity or sorority', initiation: 'final rites', president: 'Grand Archon', houses: ['Upsilon Sigma Phi', 'Alpha Phi Beta', 'Sigma Rho', 'Tau Gamma Phi', 'Alpha Phi Omega'], dues: 300, danger: 1.8 },
  GB: { label: 'Dining & drinking societies', join: 'Try for a college dining society', initiation: 'initiation night', president: 'society president', houses: ['the college dining society', 'the rugby club\'s drinking society', 'the Piers Gaveston Society'], dues: 600 },
};
/** Greek life where you study: { label, join, initiation, president, houses, dues, danger } or null where there is none. */
export const campusSocieties = (cc) => ((cc ?? 'US') === 'US' ? undefined : SOCIETIES[cc] ?? null);
