/**
 * Which US state and local agencies each country actually has, and what they are
 * called there. The careers keep their US ids (so their events, academies and
 * unions still apply); abroad they take the local agency's name, employer and ranks.
 *
 *   null        no such agency (Japan has no municipal police, the UK no state police)
 *   { name, employer(city, stateId, stateName), titles, provinces?, citizensOnly? }
 *     provinces     only in these provinces (Canada's provincial police)
 *     citizensOnly  a national force that hires citizens only
 *
 * Titles are keyed by ladder level id; levels left out keep their US title.
 */

/** The top of a ladder: command steps (`${top}_cmd1…n`) then the head. */
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });

const GONE = { airportPolice: null, universityPolice: null, jail: null, stateFire: null, gameWarden: null };

/* Ladders shared by several countries ------------------------------------ */

const CONSTABLE_POLICE = {
  recruit: 'Recruit Constable', officer: 'Constable', senior: 'Senior Constable', detective: 'Detective Constable', seniorDetective: 'Detective Senior Constable',
  sergeant: 'Sergeant', lieutenant: 'Staff Sergeant', captain: 'Inspector', deputyChief: 'Superintendent',
  ...cmd('chief', ['Chief Superintendent', 'Staff Superintendent', 'Deputy Chief', 'Deputy Chief (Operations)'], 'Chief of Police'),
};

const AU_STATE_POLICE = { 'AU-NSW': 'NSW Police Force', 'AU-VIC': 'Victoria Police', 'AU-QLD': 'Queensland Police Service', 'AU-WA': 'Western Australia Police Force', 'AU-SA': 'South Australia Police', 'AU-ACT': 'ACT Policing', 'AU-NT': 'Northern Territory Police', 'AU-TAS': 'Tasmania Police' };
const CA_PROVINCIAL_POLICE = { 'CA-ON': 'Ontario Provincial Police', 'CA-QC': 'Sûreté du Québec' };

export const LOCAL_AGENCIES = {
  CA: {
    ems: { name: 'Paramedic Services', employer: (city) => `${city} Paramedic Services`, titles: { emt: 'Primary Care Paramedic', paramedic: 'Advanced Care Paramedic', criticalCare: 'Critical Care Paramedic', flight: 'Flight Paramedic', fto: 'Paramedic Educator', supervisor: 'Paramedic Superintendent', captain: 'District Commander', deputy: 'Deputy Chief', chief: 'Chief of Paramedic Services' } },
    prosecution: { name: 'Crown Prosecution Service', employer: (city, s, sn) => (s === 'CA-ON' ? `Crown Attorney's Office — ${city}` : s === 'CA-QC' ? `DPCP — ${city}` : `${sn} Crown Prosecution Service — ${city}`), titles: { clerk: 'Articling Student', ada: 'Assistant Crown Attorney', senior: 'Senior Crown Counsel', trial: 'Crown Counsel (Major Crimes)', chiefDeputy: 'Deputy Crown Attorney', first: 'Crown Attorney' } },
    revenue: { name: 'Provincial Ministry of Finance', employer: (city, s, sn) => (s === 'CA-QC' ? 'Revenu Québec' : `${sn} Ministry of Finance — Tax Division`) },
    ...GONE,
    gameWarden: { name: 'Conservation Officer Service', employer: (c, s, sn) => `${sn} Conservation Officer Service`, titles: { cadet: 'Conservation Officer Recruit', warden: 'Conservation Officer', investigator: 'Special Investigations Officer', pilot: 'Conservation Officer Pilot', sergeant: 'Sergeant', captain: 'Inspector', chief: 'Chief Conservation Officer' } },
    stateFire: { name: 'Provincial Wildfire Service', employer: (c, s, sn) => `${sn} Wildfire Service` },
    police: { name: 'Municipal Police Service', employer: (city) => `${city} Police Service`, titles: CONSTABLE_POLICE },
    // Provincial police only in Ontario and Quebec; elsewhere the RCMP polices the province under contract.
    statePolice: {
      name: 'Provincial Police', provinces: Object.keys(CA_PROVINCIAL_POLICE), employer: (c, s) => CA_PROVINCIAL_POLICE[s] ?? 'Provincial Police',
      titles: { cadet: 'Provincial Constable (recruit)', trooper: 'Provincial Constable', senior: 'Senior Provincial Constable', investigator: 'Detective Constable', majorCrimes: 'Detective Sergeant', sergeant: 'Sergeant', lieutenant: 'Staff Sergeant', captain: 'Inspector', major: 'Superintendent', ...cmd('superintendent', ['Chief Superintendent', 'Deputy Commissioner (Field)', 'Deputy Commissioner', 'Provincial Commander'], 'Commissioner') },
    },
    corrections: { name: 'Provincial Correctional Services', employer: (c, s, sn) => `${sn} Correctional Services` },
  },

  GB: {
    probation: { name: 'The Probation Service', employer: (city, s) => (s === 'GB-SCT' ? `${city} Criminal Justice Social Work` : `Probation Service — ${city}`), titles: { trainee: 'Trainee Probation Officer (PQiP)', officer: 'Probation Officer', senior: 'Senior Probation Officer', specialized: 'Probation Officer (MAPPA)', supervisor: 'Head of Probation Delivery Unit', chief: 'Regional Probation Director' } },
    ...GONE, statePolice: null, corrections: null, revenue: null,
    police: {
      name: 'Territorial Police Force',
      employer: (city, s) => (s === 'GB-SCT' ? `Police Scotland — ${city} Division` : s === 'GB-NIR' ? 'Police Service of Northern Ireland' : city === 'London' ? 'Metropolitan Police Service' : `${city} Police`),
      titles: {
        recruit: 'Student Police Constable', officer: 'Police Constable', senior: 'Police Constable (Tutor)', detective: 'Detective Constable', seniorDetective: 'Detective Constable (Major Investigation Team)',
        sergeant: 'Sergeant', lieutenant: 'Inspector', captain: 'Chief Inspector', deputyChief: 'Superintendent',
        ...cmd('chief', ['Chief Superintendent', 'Commander', 'Assistant Chief Constable', 'Deputy Chief Constable'], 'Chief Constable'),
      },
    },
    transitPolice: { name: 'British Transport Police', employer: (city) => `British Transport Police — ${city}`, titles: { recruit: 'Student Officer', officer: 'Police Constable', senior: 'Police Constable (Tutor)', detective: 'Detective Constable', sergeant: 'Sergeant', lieutenant: 'Inspector', ...cmd('chief', ['Chief Inspector', 'Superintendent', 'Chief Superintendent', 'Deputy Chief Constable'], 'Chief Constable') } },
    fire: {
      name: 'Fire and Rescue Service', employer: (city, s) => (s === 'GB-SCT' ? `Scottish Fire and Rescue Service — ${city}` : city === 'London' ? 'London Fire Brigade' : `${city} Fire and Rescue Service`),
      titles: { recruit: 'Trainee Firefighter', firefighter: 'Firefighter', engineer: 'Firefighter (Driver)', inspector: 'Fire Safety Inspecting Officer', investigator: 'Fire Investigation Officer', lieutenant: 'Crew Manager', captain: 'Watch Manager', battalion: 'Station Manager', deputyChief: 'Group Manager', ...cmd('chief', ['Area Manager', 'Assistant Chief Fire Officer', 'Deputy Chief Fire Officer'], 'Chief Fire Officer') },
    },
    ems: {
      name: 'NHS Ambulance Service', employer: (city, s) => (s === 'GB-SCT' ? 'Scottish Ambulance Service' : s === 'GB-WLS' ? 'Welsh Ambulance Service' : city === 'London' ? 'London Ambulance Service NHS Trust' : `${city} Ambulance Service NHS Trust`),
      titles: { emt: 'Emergency Care Assistant', paramedic: 'Paramedic', criticalCare: 'Critical Care Paramedic', flight: 'Air Ambulance (HEMS) Paramedic', fto: 'Practice Educator', supervisor: 'Clinical Team Leader', captain: 'Operations Manager', deputy: 'Head of Operations', ...cmd('chief', ['Assistant Director of Operations', 'Director of Operations', 'Deputy Chief Executive'], 'Chief Executive') },
    },
    dispatch: { name: '999 Control Room', employer: (city) => `${city} Joint Control Room`, titles: { trainee: 'Trainee Call Handler', telecommunicator: '999 Call Handler', senior: 'Senior Call Handler', training: 'Control Room Trainer', supervisor: 'Control Room Supervisor', ...cmd('director', ['Control Room Manager', 'Head of Contact Management', 'Assistant Director'], 'Director of Contact Management') } },
    prosecution: { name: 'Crown Prosecution Service', employer: (city) => `CPS — ${city}`, titles: { clerk: 'Paralegal Officer', ada: 'Crown Prosecutor', senior: 'Senior Crown Prosecutor', trial: 'Senior Crown Advocate', chiefDeputy: 'Deputy Chief Crown Prosecutor', ...cmd('first', ['Chief Crown Prosecutor', 'Director of Legal Services', 'Chief Operating Officer'], 'Director of Public Prosecutions') } },
  },

  DE: {
    prosecution: { name: 'Staatsanwaltschaft', employer: (city) => `Staatsanwaltschaft ${city}`, titles: { clerk: 'Rechtsreferendar', ada: 'Staatsanwalt', senior: 'Staatsanwalt (Gruppenleiter)', trial: 'Oberstaatsanwalt', chiefDeputy: 'Leitender Oberstaatsanwalt', first: 'Generalstaatsanwalt' } },
    revenue: { name: 'Finanzverwaltung', employer: (city) => `Finanzamt ${city}`, titles: { agent: 'Finanzanwärter', auditor: 'Betriebsprüfer', senior: 'Steueramtmann', fraud: 'Steuerfahnder', supervisor: 'Sachgebietsleiter', commissioner: 'Vorsteher des Finanzamts' } },
    probation: { name: 'Bewährungshilfe', employer: (city) => `Bewährungshilfe am Landgericht ${city}`, titles: { trainee: 'Bewährungshelfer (Einarbeitung)', officer: 'Bewährungshelfer', senior: 'Erfahrener Bewährungshelfer', supervisor: 'Fachbereichsleiter', chief: 'Leiter der Bewährungshilfe' } },
    ...GONE, police: null, airportPolice: null, transitPolice: null,
    statePolice: {
      name: 'Landespolizei', employer: (c, s, sn) => ({ 'DE-BY': 'Bayerische Polizei', 'DE-BE': 'Polizei Berlin', 'DE-HH': 'Polizei Hamburg' }[s] ?? `Polizei ${sn}`),
      titles: { cadet: 'Polizeimeisteranwärter', trooper: 'Polizeimeister', senior: 'Polizeiobermeister', investigator: 'Kriminalkommissar', majorCrimes: 'Kriminalhauptkommissar', sergeant: 'Polizeihauptmeister', lieutenant: 'Polizeikommissar', captain: 'Polizeihauptkommissar', major: 'Polizeirat', ...cmd('superintendent', ['Polizeioberrat', 'Polizeidirektor', 'Leitender Polizeidirektor', 'Polizeivizepräsident'], 'Polizeipräsident') },
    },
    corrections: {
      name: 'Justizvollzug', employer: (c, s, sn) => `JVA ${c} (Justizvollzug ${sn})`,
      titles: { officer: 'Justizvollzugsbeamter', senior: 'Justizvollzugshauptsekretär', investigator: 'Ermittler im Justizvollzug', gang: 'Sicherheitsbeauftragter', sergeant: 'Abteilungsdienstleiter', lieutenant: 'Vollzugsdienstleiter', captain: 'Sicherheitsdienstleiter', deputyWarden: 'Stellvertretender Anstaltsleiter', warden: 'Anstaltsleiter', ...cmd('director', ['Referatsleiter Justizvollzug', 'Abteilungsleiter im Justizministerium', 'Ministerialdirigent'], 'Leiter der Abteilung Justizvollzug') },
    },
    fire: {
      name: 'Berufsfeuerwehr', employer: (city) => `Feuerwehr ${city}`,
      titles: { recruit: 'Brandmeisteranwärter', firefighter: 'Brandmeister', engineer: 'Oberbrandmeister (Maschinist)', inspector: 'Brandschauer', investigator: 'Brandursachenermittler', lieutenant: 'Hauptbrandmeister', captain: 'Brandinspektor', battalion: 'Brandamtmann', deputyChief: 'Brandrat', ...cmd('chief', ['Brandoberrat', 'Branddirektor', 'Leitender Branddirektor'], 'Leiter der Berufsfeuerwehr') },
    },
    ems: {
      name: 'Rettungsdienst', employer: (city) => `Rettungsdienst ${city}`,
      titles: { emt: 'Rettungssanitäter', paramedic: 'Notfallsanitäter', criticalCare: 'Notfallsanitäter (Intensivtransport)', flight: 'Notfallsanitäter (Luftrettung)', fto: 'Praxisanleiter', supervisor: 'Wachenleiter', captain: 'Bereichsleiter Rettungsdienst', deputy: 'Stellvertretender Leiter Rettungsdienst', ...cmd('chief', ['Abteilungsleiter', 'Fachbereichsleiter', 'Stellvertretender Amtsleiter'], 'Leiter Rettungsdienst') },
    },
    dispatch: { name: 'Integrierte Leitstelle (112)', employer: (city) => `Integrierte Leitstelle ${city}`, titles: { trainee: 'Disponent in Ausbildung', telecommunicator: 'Disponent (112)', senior: 'Erfahrener Disponent', training: 'Ausbilder Leitstelle', supervisor: 'Schichtführer', ...cmd('director', ['Sachgebietsleiter', 'Stellvertretender Leitstellenleiter', 'Abteilungsleiter'], 'Leiter der Leitstelle') } },
  },

  FR: {
    ...GONE, transitPolice: null, corrections: null, revenue: null,
    police: {
      name: 'Police municipale', employer: (city) => `Police municipale de ${city}`,
      titles: { recruit: 'Gardien-brigadier stagiaire', officer: 'Gardien-brigadier', senior: 'Brigadier-chef principal', detective: 'Agent de recherche', seniorDetective: 'Chef de service adjoint', sergeant: 'Chef de service', lieutenant: 'Chef de service principal', captain: 'Directeur de police municipale', deputyChief: 'Directeur principal', ...cmd('chief', ['Directeur adjoint', 'Directeur de la tranquillité publique', 'Directeur général adjoint', 'Directeur de la sécurité'], 'Directeur de la police municipale') },
    },
    // Patrol policing in cities is the national police's job.
    statePolice: {
      name: 'Police nationale (Sécurité publique)', citizensOnly: true, employer: (city) => `Commissariat de ${city}`,
      titles: { cadet: 'Élève gardien de la paix', trooper: 'Gardien de la paix', senior: 'Sous-brigadier', investigator: 'Officier de police judiciaire', majorCrimes: 'Enquêteur, brigade criminelle', sergeant: 'Brigadier-chef', lieutenant: 'Lieutenant de police', captain: 'Capitaine de police', major: 'Commandant de police', ...cmd('superintendent', ['Commissaire de police', 'Commissaire divisionnaire', 'Contrôleur général', 'Inspecteur général'], 'Directeur général de la Police nationale') },
    },
    fire: {
      name: 'Sapeurs-pompiers professionnels (SDIS)', employer: (city) => `SDIS — centre de secours de ${city}`,
      titles: { recruit: 'Sapeur stagiaire', firefighter: 'Sapeur', engineer: 'Caporal (conducteur)', inspector: 'Préventionniste', investigator: 'Enquêteur RCCI', lieutenant: 'Sergent', captain: 'Adjudant', battalion: 'Lieutenant', deputyChief: 'Capitaine', ...cmd('chief', ['Commandant', 'Lieutenant-colonel', 'Colonel'], 'Directeur départemental (contrôleur général)') },
    },
    ems: {
      name: 'SAMU / SMUR', employer: (city) => `SAMU — CHU de ${city}`,
      titles: { emt: 'Ambulancier SMUR', paramedic: 'Infirmier SMUR', criticalCare: 'Infirmier anesthésiste SMUR', flight: 'Infirmier HéliSMUR', fto: 'Formateur CESU', supervisor: 'Cadre de santé', captain: 'Cadre supérieur de santé', deputy: 'Directeur des soins adjoint', ...cmd('chief', ['Directeur des soins', 'Directeur adjoint', 'Directeur général adjoint'], 'Directeur du SAMU') },
    },
    dispatch: { name: 'Centre de régulation (15 / 112)', employer: (city) => `SAMU — régulation de ${city}`, titles: { trainee: 'ARM stagiaire', telecommunicator: 'Assistant de régulation médicale', senior: 'ARM confirmé', training: 'Formateur ARM', supervisor: 'Superviseur de salle', ...cmd('director', ['Chef de salle', 'Cadre de régulation', 'Directeur adjoint'], 'Responsable du centre de régulation') } },
    prosecution: { name: 'Parquet', employer: (city) => `Parquet du tribunal judiciaire de ${city}`, titles: { clerk: 'Attaché de justice', ada: 'Substitut du procureur', senior: 'Vice-procureur', trial: 'Procureur adjoint', chiefDeputy: 'Premier vice-procureur', ...cmd('first', ['Procureur de la République', 'Procureur général', 'Avocat général'], 'Procureur général près la Cour de cassation') } },
  },

  IT: {
    revenue: null,
    prosecution: { name: 'Procura della Repubblica', employer: (city) => `Procura della Repubblica di ${city}`, titles: { clerk: 'Tirocinante', ada: 'Sostituto procuratore', senior: 'Sostituto procuratore (DDA)', trial: 'Procuratore aggiunto', chiefDeputy: 'Procuratore della Repubblica', first: 'Procuratore generale' } },
    ...GONE, transitPolice: null, corrections: null,
    gameWarden: { name: 'Polizia Provinciale', employer: (city) => `Polizia Provinciale di ${city}`, titles: { cadet: 'Agente in prova', warden: 'Agente di Polizia Provinciale', investigator: 'Ispettore ittico-venatorio', sergeant: 'Ispettore', captain: 'Commissario', chief: 'Comandante della Polizia Provinciale' } },
    police: {
      name: 'Polizia Locale', employer: (city) => `Polizia Locale di ${city}`,
      titles: { recruit: 'Agente in prova', officer: 'Agente', senior: 'Agente scelto', detective: 'Assistente', seniorDetective: 'Sovrintendente', sergeant: 'Ispettore', lieutenant: 'Commissario', captain: 'Commissario capo', deputyChief: 'Vice comandante', ...cmd('chief', ['Dirigente di settore', 'Dirigente superiore', 'Vice comandante generale', 'Comandante vicario'], 'Comandante della Polizia Locale') },
    },
    // Patrol policing beyond the town is the national police's (the Carabinieri serve in the forces).
    statePolice: {
      name: 'Polizia di Stato (Volanti)', citizensOnly: true, employer: (city) => `Questura di ${city}`,
      titles: { cadet: 'Allievo agente', trooper: 'Agente', senior: 'Agente scelto', investigator: 'Assistente capo', majorCrimes: 'Sovrintendente (Squadra Mobile)', sergeant: 'Ispettore', lieutenant: 'Ispettore superiore', captain: 'Commissario', major: 'Commissario capo', ...cmd('superintendent', ['Vice questore aggiunto', 'Vice questore', 'Primo dirigente', 'Dirigente superiore'], 'Questore') },
    },
    fire: {
      name: 'Vigili del Fuoco', citizensOnly: true, employer: (city) => `Comando Provinciale dei Vigili del Fuoco di ${city}`,
      titles: { recruit: 'Allievo vigile del fuoco', firefighter: 'Vigile del fuoco', engineer: 'Vigile esperto (autista)', inspector: 'Ispettore antincendi', investigator: 'Ispettore (Nucleo Investigativo)', lieutenant: 'Capo squadra', captain: 'Capo reparto', battalion: 'Funzionario', deputyChief: 'Vice comandante', ...cmd('chief', ['Comandante provinciale', 'Direttore regionale', 'Dirigente generale'], 'Capo del Corpo Nazionale') },
    },
    ems: { name: 'Servizio 118', employer: (city) => `Centrale 118 di ${city}`, titles: { emt: 'Soccorritore', paramedic: 'Infermiere del 118', criticalCare: 'Infermiere di area critica', flight: 'Infermiere di elisoccorso', fto: 'Istruttore', supervisor: 'Coordinatore infermieristico', captain: 'Responsabile di postazione', deputy: 'Vice direttore', chief: 'Direttore della Centrale 118' } },
    dispatch: { name: 'Numero Unico di Emergenza 112', employer: (city) => `Centrale Unica di Risposta 112 — ${city}`, titles: { trainee: 'Operatore in formazione', telecommunicator: 'Operatore NUE 112', senior: 'Operatore senior', training: 'Formatore', supervisor: 'Capoturno', director: 'Responsabile della Centrale' } },
  },

  JP: {
    revenue: { name: 'Prefectural Tax Office', employer: (c, s, sn) => `${sn} Prefectural Tax Office` },
    prosecution: { name: 'Public Prosecutors Office', employer: (city) => `${city} District Public Prosecutors Office`, titles: { clerk: 'Public Prosecutor\'s Assistant Officer', ada: 'Prosecutor (Kenji)', senior: 'Senior Prosecutor', trial: 'Special Investigation Department Prosecutor', chiefDeputy: 'Deputy Chief Prosecutor', first: 'Chief Prosecutor (Kenjisei)' } },
    probation: { name: 'Probation Office', employer: (city) => `${city} Probation Office`, titles: { trainee: 'Probation Officer Trainee', officer: 'Probation Officer (Hogo Kansatsukan)', senior: 'Senior Probation Officer', supervisor: 'Section Chief', chief: 'Director of the Probation Office' } },
    ...GONE, police: null, airportPolice: null, transitPolice: null, corrections: null,
    statePolice: {
      name: 'Prefectural Police', citizensOnly: true, employer: (c, s, sn) => (s === 'JP-13' ? 'Tokyo Metropolitan Police Department' : s === 'JP-01' ? 'Hokkaido Prefectural Police' : `${sn} Prefectural Police`),
      titles: { cadet: 'Police Academy Trainee', trooper: 'Junsa (Police Officer)', senior: 'Junsa-buchō (Senior Officer)', investigator: 'Detective (Junsa-buchō)', majorCrimes: 'Detective, Investigation Division 1', sergeant: 'Keibuho (Assistant Inspector)', lieutenant: 'Keibu (Inspector)', captain: 'Keishi (Superintendent)', major: 'Keishi (Station Chief)', ...cmd('superintendent', ['Keishisei (Senior Superintendent)', 'Keishichō (Chief Superintendent)', 'Keishikan (Superintendent Supervisor)', 'Deputy Chief of Police'], 'Chief of Prefectural Police') },
    },
    fire: {
      name: 'Municipal Fire Department', employer: (city, s) => (s === 'JP-13' ? 'Tokyo Fire Department' : `${city} City Fire Bureau`),
      titles: { recruit: 'Fire Academy Trainee', firefighter: 'Shōbōshi (Firefighter)', engineer: 'Shōbōfukushichō (Senior Firefighter)', inspector: 'Fire Prevention Inspector', investigator: 'Fire Cause Investigator', lieutenant: 'Shōbōshichō (Fire Sergeant)', captain: 'Shōbōshireiho (Fire Lieutenant)', battalion: 'Shōbōshirei (Fire Captain)', deputyChief: 'Shōbōshireichō (Battalion Chief)', ...cmd('chief', ['Shōbōkan (Deputy Fire Chief)', 'Shōbōkanchō', 'Shōbōshikan'], 'Fire Chief (Shōbōchō)') },
    },
    ems: {
      name: 'Fire Department Ambulance Service', employer: (city, s) => (s === 'JP-13' ? 'Tokyo Fire Department — Ambulance Division' : `${city} City Fire Bureau — Ambulance`),
      titles: { emt: 'Ambulance Crew Member', paramedic: 'Emergency Life-Saving Technician', criticalCare: 'Certified ELST (drug administration)', flight: 'Doctor-Heli Crew', fto: 'EMS Instructor', supervisor: 'Ambulance Team Leader', captain: 'EMS Section Chief', deputy: 'Deputy Director of EMS', chief: 'Director of Emergency Medical Services' },
    },
    dispatch: { name: '119 Command Center', employer: (city) => `${city} 119 Disaster Command Center`, titles: { trainee: 'Dispatcher Trainee', telecommunicator: '119 Dispatcher', senior: 'Senior Dispatcher', training: 'Command Center Instructor', supervisor: 'Command Center Supervisor', director: 'Command Center Director' } },
  },

  KR: {
    revenue: null,
    prosecution: { name: 'Prosecution Service', employer: (city) => `${city} District Prosecutors' Office`, titles: { clerk: 'Prosecution Investigator', ada: 'Prosecutor (Geomsa)', senior: 'Senior Prosecutor', trial: 'Chief Prosecutor of a Division', chiefDeputy: 'Deputy Chief Prosecutor', first: 'Chief District Prosecutor' } },
    ...GONE, police: null, airportPolice: null, transitPolice: null, corrections: null,
    statePolice: {
      name: 'Korean National Police (Provincial Agency)', citizensOnly: true, employer: (c, s, sn) => (s === 'KR-11' ? 'Seoul Metropolitan Police Agency' : `${sn} Provincial Police Agency`),
      titles: { cadet: 'Central Police Academy Trainee', trooper: 'Sungyeong (Police Officer)', senior: 'Gyeongjang (Senior Officer)', investigator: 'Gyeongsa (Detective)', majorCrimes: 'Gyeongsa (Violent Crimes Unit)', sergeant: 'Gyeongwi (Assistant Inspector)', lieutenant: 'Gyeonggam (Inspector)', captain: 'Gyeongjeong (Superintendent)', major: 'Chonggyeong (Senior Superintendent)', ...cmd('superintendent', ['Gyeongmugwan (Chief Superintendent)', 'Chianggam (Superintendent General)', 'Chianjeonggam (Deputy Commissioner)', 'Deputy Commissioner General'], 'Commissioner of the Provincial Police Agency') },
    },
    fire: {
      name: 'National Fire Agency', citizensOnly: true, employer: (c, s, sn) => (s === 'KR-11' ? 'Seoul Fire & Disaster Headquarters' : `${sn} Fire Headquarters`),
      titles: { recruit: 'Firefighter Trainee', firefighter: 'Sobangsa (Firefighter)', engineer: 'Sobanggyo (Senior Firefighter)', inspector: 'Fire Prevention Inspector', investigator: 'Fire Investigator', lieutenant: 'Sobangjang (Fire Sergeant)', captain: 'Sobangwi (Fire Lieutenant)', battalion: 'Sobangkyeong (Fire Captain)', deputyChief: 'Sobangryeong (Fire Chief Officer)', ...cmd('chief', ['Sobangjeong (Station Chief)', 'Sobangjunggam', 'Sobanggam'], 'Fire Headquarters Commissioner') },
    },
    ems: { name: '119 Rescue & EMS', employer: (c, s, sn) => `${sn} 119 Emergency Medical Service`, titles: { emt: '119 EMT', paramedic: '119 Paramedic (1st-class EMT)', criticalCare: 'Special EMS Paramedic', flight: 'Air Rescue Paramedic', fto: 'EMS Instructor', supervisor: 'Ambulance Team Leader', captain: 'EMS Section Chief', deputy: 'Deputy EMS Director', chief: 'EMS Director' } },
    dispatch: { name: '119 Situation Room', employer: (c, s, sn) => `${sn} 119 Comprehensive Situation Room`, titles: { trainee: 'Dispatcher Trainee', telecommunicator: '119 Dispatcher', senior: 'Senior Dispatcher', training: 'Situation Room Instructor', supervisor: 'Situation Room Supervisor', director: 'Situation Room Director' } },
  },

  MX: {
    prosecution: { name: 'Fiscalía General del Estado', employer: (c, s, sn) => `Fiscalía General del Estado de ${sn}`, titles: { clerk: 'Oficial Secretario', ada: 'Agente del Ministerio Público', senior: 'Fiscal', trial: 'Fiscal Especializado', chiefDeputy: 'Vicefiscal', first: 'Fiscal General del Estado' } },
    revenue: { name: 'Secretaría de Finanzas', employer: (c, s, sn) => `Secretaría de Finanzas de ${sn}` },
    ...GONE, transitPolice: null,
    jail: { name: 'Juzgado Cívico / Separos', employer: (city) => `Centro de Detención Municipal de ${city}`, titles: { trainee: 'Custodio en formación', officer: 'Custodio', senior: 'Custodio primero', sergeant: 'Jefe de turno', lieutenant: 'Subdirector', commander: 'Director del centro', administrator: 'Director de Centros de Detención' } },
    police: {
      name: 'Policía Municipal', employer: (city) => `Policía Municipal de ${city}`,
      titles: { recruit: 'Cadete', officer: 'Policía', senior: 'Policía Primero', detective: 'Agente de Investigación', seniorDetective: 'Agente de Investigación Primero', sergeant: 'Suboficial', lieutenant: 'Oficial', captain: 'Inspector', deputyChief: 'Inspector Jefe', ...cmd('chief', ['Inspector General', 'Comisario', 'Comisario Jefe', 'Subsecretario de Seguridad'], 'Secretario de Seguridad Pública Municipal') },
    },
    statePolice: {
      name: 'Policía Estatal', employer: (c, s, sn) => (s === 'MX-CMX' ? 'Secretaría de Seguridad Ciudadana (CDMX)' : `Policía Estatal de ${sn}`),
      titles: { cadet: 'Cadete', trooper: 'Policía', senior: 'Policía Primero', investigator: 'Agente de Investigación', majorCrimes: 'Agente de Investigación (Homicidios)', sergeant: 'Suboficial', lieutenant: 'Oficial', captain: 'Inspector', major: 'Inspector Jefe', ...cmd('superintendent', ['Inspector General', 'Comisario', 'Comisario General', 'Subsecretario'], 'Secretario de Seguridad Pública') },
    },
    corrections: { name: 'Sistema Penitenciario Estatal', employer: (c, s, sn) => `CERESO de ${c} (${sn})`, titles: { officer: 'Custodio penitenciario', senior: 'Custodio primero', sergeant: 'Jefe de seguridad', lieutenant: 'Subdirector de seguridad', captain: 'Director de seguridad', deputyWarden: 'Subdirector del CERESO', warden: 'Director del CERESO', director: 'Comisionado del Sistema Penitenciario' } },
    fire: {
      name: 'Heroico Cuerpo de Bomberos', employer: (city) => `Heroico Cuerpo de Bomberos de ${city}`,
      titles: { recruit: 'Bombero aspirante', firefighter: 'Bombero', engineer: 'Bombero conductor', inspector: 'Inspector de protección civil', investigator: 'Perito en incendios', lieutenant: 'Sargento', captain: 'Suboficial', battalion: 'Oficial', deputyChief: 'Segundo Superintendente', ...cmd('chief', ['Primer Superintendente', 'Director Operativo', 'Subdirector General'], 'Director General (Primer Superintendente)') },
    },
    ems: { name: 'Servicios de urgencias (ERUM / Cruz Roja)', employer: (city) => `ERUM — ${city}`, titles: { emt: 'TUM Básico', paramedic: 'TUM Avanzado', criticalCare: 'TUM en Cuidados Críticos', flight: 'TUM Aeromédico', fto: 'Instructor de TUM', supervisor: 'Jefe de turno', captain: 'Coordinador operativo', deputy: 'Subdirector', chief: 'Director de Servicios de Urgencias' } },
    dispatch: { name: 'C5 / 911', employer: (city) => `Centro de Comando C5 — ${city}`, titles: { trainee: 'Operador en formación', telecommunicator: 'Operador 911', senior: 'Operador Senior', training: 'Instructor', supervisor: 'Supervisor de turno', director: 'Director del C5' } },
  },

  PH: {
    prosecution: { name: 'National Prosecution Service', citizensOnly: true, employer: (city) => `Office of the City Prosecutor, ${city.replace(/ City$/, '')}`, titles: { clerk: 'Prosecution Attorney', ada: 'Assistant City Prosecutor', senior: 'Senior Assistant City Prosecutor', trial: 'Associate City Prosecutor', chiefDeputy: 'Deputy City Prosecutor', first: 'City Prosecutor' } },
    ...GONE, statePolice: null, transitPolice: null, corrections: null, revenue: null,
    // One national force does all policing.
    police: {
      name: 'Philippine National Police', citizensOnly: true, employer: (city) => `PNP — ${city} Police Station`,
      titles: { recruit: 'Police Trainee (Regional Training Center)', officer: 'Patrolman', senior: 'Police Corporal', detective: 'Police Staff Sergeant (Investigator)', seniorDetective: 'Police Master Sergeant (Investigator)', sergeant: 'Police Senior Master Sergeant', lieutenant: 'Police Lieutenant', captain: 'Police Captain', deputyChief: 'Police Major', ...cmd('chief', ['Police Lieutenant Colonel', 'Police Colonel', 'Police Brigadier General', 'Police Major General'], 'Chief PNP (Police General)') },
    },
    jail: { name: 'Bureau of Jail Management and Penology', citizensOnly: true, employer: (city) => `BJMP — ${city.replace(/ City$/, '')} City Jail`, titles: { trainee: 'Jail Officer Trainee', officer: 'Jail Officer I', senior: 'Jail Officer III', sergeant: 'Senior Jail Officer', lieutenant: 'Jail Inspector', commander: 'Jail Warden', administrator: 'Chief, BJMP' } },
    fire: {
      name: 'Bureau of Fire Protection', citizensOnly: true, employer: (city) => `BFP — ${city} Fire Station`,
      titles: { recruit: 'Fire Officer Trainee', firefighter: 'Fire Officer I', engineer: 'Fire Officer II', inspector: 'Fire Safety Inspector', investigator: 'Fire Arson Investigator', lieutenant: 'Senior Fire Officer I', captain: 'Fire Inspector', battalion: 'Fire Senior Inspector', deputyChief: 'Fire Chief Inspector', ...cmd('chief', ['Fire Superintendent', 'Fire Senior Superintendent', 'Fire Chief Superintendent'], 'Chief, Bureau of Fire Protection') },
    },
    ems: { name: 'City Disaster Risk Reduction & EMS', employer: (city) => `${city.replace(/ City$/, '')} City Rescue & EMS`, titles: { emt: 'Emergency Medical Responder', paramedic: 'EMT', fto: 'Training Officer', supervisor: 'Team Leader', captain: 'Operations Chief', chief: 'City DRRM Officer' } },
    dispatch: { name: '911 Emergency Hotline', employer: (city) => `Emergency 911 — ${city}`, titles: { trainee: 'Call Taker Trainee', telecommunicator: '911 Call Taker', senior: 'Senior Call Taker', training: 'Call Center Trainer', supervisor: 'Shift Supervisor', director: 'Emergency 911 Center Head' } },
  },

  IN: {
    prosecution: { name: 'Directorate of Prosecution', employer: (c, s, sn) => `${sn} Directorate of Prosecution — ${c}`, titles: { clerk: 'Legal Assistant', ada: 'Assistant Public Prosecutor', senior: 'Additional Public Prosecutor', trial: 'Public Prosecutor', chiefDeputy: 'Deputy Director of Prosecution', first: 'Director of Prosecution' } },
    revenue: { name: 'Commercial Taxes Department', employer: (c, s, sn) => `${sn} Commercial Taxes Department` },
    ...GONE, police: null, transitPolice: null,
    statePolice: {
      name: 'State Police', citizensOnly: true, employer: (c, s, sn) => ({ 'IN-MH': 'Maharashtra Police', 'IN-DL': 'Delhi Police', 'IN-KA': 'Karnataka State Police', 'IN-TN': 'Tamil Nadu Police', 'IN-WB': 'West Bengal Police', 'IN-UP': 'Uttar Pradesh Police' }[s] ?? `${sn} Police`),
      titles: { cadet: 'Constable (trainee)', trooper: 'Police Constable', senior: 'Head Constable', investigator: 'Assistant Sub-Inspector', majorCrimes: 'Sub-Inspector (Crime Branch)', sergeant: 'Sub-Inspector', lieutenant: 'Inspector (Station House Officer)', captain: 'Deputy Superintendent of Police', major: 'Superintendent of Police', ...cmd('superintendent', ['Deputy Inspector General', 'Inspector General', 'Additional Director General', 'Special Director General'], 'Director General of Police') },
    },
    corrections: { name: 'State Prisons Department', employer: (c, s, sn) => `${c} Central Jail (${sn} Prisons)`, titles: { officer: 'Jail Warder', senior: 'Head Warder', investigator: 'Prison Intelligence Officer', sergeant: 'Chief Head Warder', lieutenant: 'Assistant Jailer', captain: 'Deputy Jailer', deputyWarden: 'Jailer', warden: 'Jail Superintendent', director: 'Director General of Prisons' } },
    fire: { name: 'State Fire & Emergency Services', employer: (city) => `${city} Fire Brigade`, titles: { recruit: 'Fireman (trainee)', firefighter: 'Fireman', engineer: 'Fireman Driver', inspector: 'Fire Prevention Officer', lieutenant: 'Leading Fireman', captain: 'Sub-Officer', battalion: 'Station Officer', deputyChief: 'Divisional Fire Officer', ...cmd('chief', ['Deputy Chief Fire Officer', 'Chief Fire Officer', 'Director of Fire Services'], 'Director General, Fire Services') } },
    ems: { name: '108 Emergency Ambulance', employer: (city) => `108 Emergency Response — ${city}`, titles: { emt: 'Emergency Medical Technician', paramedic: 'Senior EMT', fto: 'EMT Trainer', supervisor: 'Fleet Supervisor', captain: 'District Operations Manager', chief: 'State Operations Head' } },
    dispatch: { name: '112 Emergency Response Support System', employer: (city) => `ERSS 112 — ${city}`, titles: { trainee: 'Communication Officer Trainee', telecommunicator: '112 Communication Officer', senior: 'Senior Communication Officer', training: 'ERSS Trainer', supervisor: 'Shift In-charge', director: 'ERSS Nodal Officer' } },
  },

  AU: {
    revenue: { name: 'State Revenue Office', employer: (c, s, sn) => ({ 'AU-NSW': 'Revenue NSW', 'AU-VIC': 'State Revenue Office Victoria', 'AU-QLD': 'Queensland Revenue Office' }[s] ?? `${sn} Revenue Office`) },
    ...GONE, police: null, transitPolice: null,
    gameWarden: { name: 'Fisheries & Wildlife Officers', employer: (c, s, sn) => `${sn} Fisheries & Wildlife Compliance`, titles: { cadet: 'Trainee Fisheries Officer', warden: 'Fisheries Officer', investigator: 'Wildlife Crime Investigator', chief: 'Director of Compliance' } },
    stateFire: { name: 'Rural Fire Service', employer: (c, s, sn) => ({ 'AU-NSW': 'NSW Rural Fire Service', 'AU-VIC': 'Country Fire Authority', 'AU-SA': 'Country Fire Service' }[s] ?? `${sn} Rural Fire Service`) },
    statePolice: {
      name: 'State Police', employer: (c, s, sn) => AU_STATE_POLICE[s] ?? `${sn} Police`,
      titles: { cadet: 'Probationary Constable (recruit)', trooper: 'Constable', senior: 'Senior Constable', investigator: 'Detective Senior Constable', majorCrimes: 'Detective Sergeant (Homicide)', sergeant: 'Sergeant', lieutenant: 'Senior Sergeant', captain: 'Inspector', major: 'Superintendent', ...cmd('superintendent', ['Chief Superintendent', 'Assistant Commissioner', 'Deputy Commissioner', 'Deputy Commissioner (Operations)'], 'Commissioner of Police') },
    },
    corrections: { name: 'Corrective Services', employer: (c, s, sn) => `${sn} Corrective Services` },
    fire: {
      name: 'Fire and Rescue', employer: (city, s) => ({ 'AU-NSW': 'Fire and Rescue NSW', 'AU-VIC': 'Fire Rescue Victoria', 'AU-QLD': 'Queensland Fire Department' }[s] ?? `${city} Metropolitan Fire Service`),
      titles: { recruit: 'Recruit Firefighter', firefighter: 'Qualified Firefighter', engineer: 'Senior Firefighter', inspector: 'Fire Safety Officer', investigator: 'Fire Investigator', lieutenant: 'Leading Firefighter', captain: 'Station Officer', battalion: 'Inspector', deputyChief: 'Superintendent', ...cmd('chief', ['Chief Superintendent', 'Assistant Commissioner', 'Deputy Commissioner'], 'Commissioner') },
    },
    ems: {
      name: 'State Ambulance Service', employer: (c, s, sn) => ({ 'AU-NSW': 'NSW Ambulance', 'AU-VIC': 'Ambulance Victoria', 'AU-QLD': 'Queensland Ambulance Service' }[s] ?? `${sn} Ambulance Service`),
      titles: { emt: 'Patient Transport Officer', paramedic: 'Paramedic', criticalCare: 'Intensive Care Paramedic', flight: 'Flight Paramedic', fto: 'Clinical Instructor', supervisor: 'Station Officer', captain: 'Duty Operations Manager', deputy: 'Superintendent', ...cmd('chief', ['Chief Superintendent', 'Executive Director of Operations', 'Deputy Commissioner'], 'Commissioner / Chief Executive') },
    },
    dispatch: { name: 'Triple Zero (000) Communications', employer: (c, s, sn) => `${sn} Triple Zero Communications Centre`, titles: { trainee: 'Trainee Call Taker', telecommunicator: '000 Call Taker', senior: 'Senior Dispatcher', training: 'Communications Trainer', supervisor: 'Shift Manager', director: 'Director, Emergency Communications' } },
    prosecution: { name: 'Office of the Director of Public Prosecutions', employer: (c, s, sn) => `${sn} ODPP`, titles: { clerk: 'Legal Clerk', ada: 'Solicitor Advocate', senior: 'Senior Crown Prosecutor', trial: 'Crown Prosecutor', chiefDeputy: 'Deputy Director', first: 'Director of Public Prosecutions' } },
  },
};

/** The local version of a career where you live: null when the agency doesn't exist there. */
export function localAgency(countryId, professionId) {
  const table = LOCAL_AGENCIES[countryId];
  if (!table || !(professionId in table)) return undefined;
  return table[professionId];
}

/** Whether a career's agency exists where you live (and in your province). */
export function agencyExists(countryId, professionId, provinceId = null) {
  const a = localAgency(countryId, professionId);
  if (a === null) return false;
  if (a?.provinces && provinceId && !a.provinces.includes(provinceId)) return false;
  return true;
}
