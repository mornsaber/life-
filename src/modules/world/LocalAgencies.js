import { fromPacks } from './packs/index.js';
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
  detSergeant: 'Detective Sergeant', detLieutenant: 'Detective Staff Sergeant', detCaptain: 'Detective Inspector',
  sergeant: 'Sergeant', lieutenant: 'Staff Sergeant', captain: 'Inspector', deputyChief: 'Superintendent',
  ...cmd('chief', ['Chief Superintendent', 'Staff Superintendent', 'Deputy Chief', 'Deputy Chief (Operations)'], 'Chief of Police'),
};

/** England and Wales police, fire and ambulance by area (territorial forces cover counties, not cities). */
const GB_AREA = {
  London: { police: 'Metropolitan Police Service', fire: 'London Fire Brigade', ems: 'London Ambulance Service NHS Trust' },
  Manchester: { police: 'Greater Manchester Police', fire: 'Greater Manchester Fire and Rescue Service', ems: 'North West Ambulance Service NHS Trust' },
  Birmingham: { police: 'West Midlands Police', fire: 'West Midlands Fire Service', ems: 'West Midlands Ambulance Service NHS Trust' },
  'Truro, Cornwall': { police: 'Devon and Cornwall Police', fire: 'Cornwall Fire and Rescue Service', ems: 'South Western Ambulance Service NHS Trust' },
  Cardiff: { police: 'South Wales Police', fire: 'South Wales Fire and Rescue Service' },
  'Kendal, Cumbria': { police: 'Cumbria Constabulary', fire: 'Cumbria Fire and Rescue Service', ems: 'North West Ambulance Service NHS Trust' },
  'Oxford, Oxfordshire': { police: 'Thames Valley Police', fire: 'Oxfordshire Fire and Rescue Service', ems: 'South Central Ambulance Service NHS Foundation Trust' },
  'Cambridge, Cambridgeshire': { police: 'Cambridgeshire Constabulary', fire: 'Cambridgeshire Fire and Rescue Service', ems: 'East of England Ambulance Service NHS Trust' },
  'Lincoln, Lincolnshire': { police: 'Lincolnshire Police', fire: 'Lincolnshire Fire and Rescue', ems: 'East Midlands Ambulance Service NHS Trust' },
  'Aberystwyth, Ceredigion': { police: 'Dyfed-Powys Police', fire: 'Mid and West Wales Fire and Rescue Service', ems: 'Welsh Ambulance Service NHS Trust' },
};
const gbArea = (city, kind) => GB_AREA[city]?.[kind] ?? `${city.split(',')[0]} ${kind === 'police' ? 'Constabulary' : kind === 'fire' ? 'Fire and Rescue Service' : 'Ambulance Service NHS Trust'}`;

const AU_STATE_POLICE = { 'AU-NSW': 'NSW Police Force', 'AU-VIC': 'Victoria Police', 'AU-QLD': 'Queensland Police Service', 'AU-WA': 'Western Australia Police Force', 'AU-SA': 'South Australia Police', 'AU-ACT': 'ACT Policing', 'AU-NT': 'Northern Territory Police', 'AU-TAS': 'Tasmania Police' };
const CA_PROVINCIAL_POLICE = { 'CA-ON': 'Ontario Provincial Police', 'CA-QC': 'Sûreté du Québec' };

export const LOCAL_AGENCIES = {
  CA: {
    education: { name: 'School Board', employer: (city) => `${city} District School Board`, titles: { sub: 'Occasional Teacher', teacher: 'Teacher', senior: 'Senior Teacher', coach: 'Instructional Coach', specialist: 'Program Consultant', chair: 'Department Head', ap: 'Vice-Principal', principal: 'Principal', director: 'Superintendent of Education', assistantSuper: 'Associate Director', ...cmd('superintendent', ['Executive Superintendent', 'Deputy Director'], 'Director of Education') } },
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
      titles: { cadet: 'Provincial Constable (recruit)', trooper: 'Provincial Constable', senior: 'Senior Provincial Constable', investigator: 'Detective Constable', majorCrimes: 'Detective Constable (Major Case)', detSergeant: 'Detective Sergeant', detLieutenant: 'Detective Staff Sergeant', detCaptain: 'Detective Inspector (Criminal Investigation Branch)', sergeant: 'Sergeant', lieutenant: 'Staff Sergeant', captain: 'Inspector', major: 'Superintendent', ...cmd('superintendent', ['Chief Superintendent', 'Deputy Commissioner (Field)', 'Deputy Commissioner', 'Provincial Commander'], 'Commissioner') },
    },
    corrections: { name: 'Provincial Correctional Services', employer: (c, s, sn) => `${sn} Correctional Services` },
  },

  GB: {
    education: { name: 'State Schools', employer: (city) => `${city} Council — Schools`, titles: { sub: 'Supply Teacher', teacher: 'Teacher', senior: 'Lead Practitioner', coach: 'Specialist Leader of Education', specialist: 'Subject Lead', chair: 'Head of Department', ap: 'Deputy Head Teacher', principal: 'Head Teacher', director: 'Executive Head Teacher', assistantSuper: 'Trust Director of Education', ...cmd('superintendent', ['Deputy Chief Executive (Academy Trust)', 'Director of Children\'s Services'], 'Academy Trust Chief Executive') } },
    municipalAdmin: { name: 'Local Council', employer: (city) => `${city} City Council`, titles: { clerk: 'Administrative Officer', deputyClerk: 'Democratic Services Officer', cityClerk: 'Head of Democratic Services', analyst: 'Finance Officer', seniorAnalyst: 'Senior Accountant', financeDirector: 'Section 151 Officer (Director of Finance)', manager: 'Head of Service', acm: 'Strategic Director', ...cmd('cityManager', ['Corporate Director', 'Deputy Chief Executive', 'Executive Director'], 'Chief Executive') } },
    probation: { name: 'The Probation Service', employer: (city, s) => (s === 'GB-SCT' ? `${city} Criminal Justice Social Work` : `Probation Service — ${city}`), titles: { trainee: 'Trainee Probation Officer (PQiP)', officer: 'Probation Officer', senior: 'Senior Probation Officer', specialized: 'Probation Officer (MAPPA)', supervisor: 'Head of Probation Delivery Unit', chief: 'Regional Probation Director' } },
    ...GONE, statePolice: null, corrections: null, revenue: null,
    police: {
      name: 'Territorial Police Force',
      employer: (city, s) => (s === 'GB-SCT' ? 'Police Scotland' : s === 'GB-NIR' ? 'Police Service of Northern Ireland' : gbArea(city, 'police')),
      titles: {
        recruit: 'Student Police Constable', officer: 'Police Constable', senior: 'Police Constable (Tutor)', detective: 'Detective Constable', seniorDetective: 'Detective Constable (Major Investigation Team)', detSergeant: 'Detective Sergeant', detLieutenant: 'Detective Inspector', detCaptain: 'Detective Chief Inspector',
        sergeant: 'Sergeant', lieutenant: 'Inspector', captain: 'Chief Inspector', deputyChief: 'Superintendent',
        ...cmd('chief', ['Chief Superintendent', 'Commander', 'Assistant Chief Constable', 'Deputy Chief Constable'], 'Chief Constable'),
      },
    },
    transitPolice: { name: 'British Transport Police', employer: () => 'British Transport Police', titles: { recruit: 'Student Officer', officer: 'Police Constable', senior: 'Police Constable (Tutor)', detective: 'Detective Constable', detSergeant: 'Detective Sergeant', detLieutenant: 'Detective Inspector', sergeant: 'Sergeant', lieutenant: 'Inspector', ...cmd('chief', ['Chief Inspector', 'Superintendent', 'Chief Superintendent', 'Deputy Chief Constable'], 'Chief Constable') } },
    fire: {
      name: 'Fire and Rescue Service', employer: (city, s) => (s === 'GB-SCT' ? 'Scottish Fire and Rescue Service' : s === 'GB-NIR' ? 'Northern Ireland Fire & Rescue Service' : gbArea(city, 'fire')),
      titles: { recruit: 'Trainee Firefighter', firefighter: 'Firefighter', engineer: 'Firefighter (Driver)', inspector: 'Fire Safety Inspecting Officer', investigator: 'Fire Investigation Officer', lieutenant: 'Crew Manager', captain: 'Watch Manager', battalion: 'Station Manager', deputyChief: 'Group Manager', ...cmd('chief', ['Area Manager', 'Assistant Chief Fire Officer', 'Deputy Chief Fire Officer'], 'Chief Fire Officer') },
    },
    ems: {
      name: 'NHS Ambulance Service', employer: (city, s) => (s === 'GB-SCT' ? 'Scottish Ambulance Service' : s === 'GB-WLS' ? 'Welsh Ambulance Service' : s === 'GB-NIR' ? 'Northern Ireland Ambulance Service' : gbArea(city, 'ems')),
      titles: { emt: 'Emergency Care Assistant', paramedic: 'Paramedic', criticalCare: 'Critical Care Paramedic', flight: 'Air Ambulance (HEMS) Paramedic', fto: 'Practice Educator', supervisor: 'Clinical Team Leader', captain: 'Operations Manager', deputy: 'Head of Operations', ...cmd('chief', ['Assistant Director of Operations', 'Director of Operations', 'Deputy Chief Executive'], 'Chief Executive') },
    },
    dispatch: { name: '999 Control Room', employer: (city) => `${city} Joint Control Room`, titles: { trainee: 'Trainee Call Handler', telecommunicator: '999 Call Handler', senior: 'Senior Call Handler', training: 'Control Room Trainer', supervisor: 'Control Room Supervisor', ...cmd('director', ['Control Room Manager', 'Head of Contact Management', 'Assistant Director'], 'Director of Contact Management') } },
    prosecution: { name: 'Crown Prosecution Service', employer: (city) => `CPS — ${city}`, titles: { clerk: 'Paralegal Officer', ada: 'Crown Prosecutor', senior: 'Senior Crown Prosecutor', trial: 'Senior Crown Advocate', chiefDeputy: 'Deputy Chief Crown Prosecutor', ...cmd('first', ['Chief Crown Prosecutor', 'Director of Legal Services', 'Chief Operating Officer'], 'Director of Public Prosecutions') } },
  },

  DE: {
    education: { name: 'Öffentliche Schulen', employer: (city) => `Staatliches Schulamt ${city}`, titles: { sub: 'Vertretungslehrkraft', teacher: 'Studienrat', senior: 'Oberstudienrat', coach: 'Fachberater', specialist: 'Fachbereichsleiter', chair: 'Studiendirektor', ap: 'Stellvertretender Schulleiter', principal: 'Oberstudiendirektor (Schulleiter)', director: 'Schulrat', assistantSuper: 'Leitender Schulamtsdirektor', ...cmd('superintendent', ['Ministerialrat', 'Ministerialdirigent'], 'Ministerialdirektor (Schulabteilung)') } },
    municipalAdmin: { name: 'Stadtverwaltung', employer: (city) => `Stadtverwaltung ${city}`, titles: { clerk: 'Verwaltungsfachangestellter', deputyClerk: 'Sachbearbeiter', cityClerk: 'Sachgebietsleiter', analyst: 'Haushaltssachbearbeiter', seniorAnalyst: 'Kämmereiamtsrat', financeDirector: 'Kämmerer', manager: 'Amtsleiter', acm: 'Fachbereichsleiter', ...cmd('cityManager', ['Beigeordneter', 'Erster Beigeordneter', 'Stadtdirektor'], 'Oberbürgermeister-Stellvertreter (Verwaltungschef)') } },
    prosecution: { name: 'Staatsanwaltschaft', employer: (city) => `Staatsanwaltschaft ${city}`, titles: { clerk: 'Rechtsreferendar', ada: 'Staatsanwalt', senior: 'Staatsanwalt (Gruppenleiter)', trial: 'Oberstaatsanwalt', chiefDeputy: 'Leitender Oberstaatsanwalt', first: 'Generalstaatsanwalt' } },
    revenue: { name: 'Finanzverwaltung', employer: (city) => `Finanzamt ${city}`, titles: { agent: 'Finanzanwärter', auditor: 'Betriebsprüfer', senior: 'Steueramtmann', fraud: 'Steuerfahnder', supervisor: 'Sachgebietsleiter', commissioner: 'Vorsteher des Finanzamts' } },
    probation: { name: 'Bewährungshilfe', employer: (city) => `Bewährungshilfe am Landgericht ${city}`, titles: { trainee: 'Bewährungshelfer (Einarbeitung)', officer: 'Bewährungshelfer', senior: 'Erfahrener Bewährungshelfer', supervisor: 'Fachbereichsleiter', chief: 'Leiter der Bewährungshilfe' } },
    ...GONE, police: null, airportPolice: null, transitPolice: null,
    statePolice: {
      name: 'Landespolizei', employer: (c, s, sn) => ({ 'DE-BY': 'Bayerische Polizei', 'DE-BE': 'Polizei Berlin', 'DE-HH': 'Polizei Hamburg' }[s] ?? `Polizei ${sn}`),
      titles: { cadet: 'Polizeimeisteranwärter', trooper: 'Polizeimeister', senior: 'Polizeiobermeister', investigator: 'Kriminaloberkommissar', majorCrimes: 'Kriminalhauptkommissar', detSergeant: 'Erster Kriminalhauptkommissar (Kommissariatsleiter)', detLieutenant: 'Kriminalrat (Inspektionsleiter)', detCaptain: 'Kriminaldirektor (Leiter der Kriminalpolizei)', sergeant: 'Polizeihauptmeister', lieutenant: 'Polizeikommissar', captain: 'Polizeihauptkommissar', major: 'Polizeirat', ...cmd('superintendent', ['Polizeioberrat', 'Polizeidirektor', 'Leitender Polizeidirektor', 'Polizeivizepräsident'], 'Polizeipräsident') },
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
    education: { name: 'Éducation nationale', citizensOnly: true, employer: (city) => `Académie — établissements de ${city}`, titles: { sub: 'Professeur contractuel', teacher: 'Professeur certifié', senior: 'Professeur agrégé', coach: 'Professeur formateur', specialist: 'Conseiller pédagogique', chair: 'Coordonnateur de discipline', ap: 'Proviseur adjoint', principal: 'Proviseur', director: 'Inspecteur pédagogique régional', assistantSuper: 'Directeur académique adjoint', ...cmd('superintendent', ['Directeur académique (DASEN)', 'Secrétaire général d\'académie'], 'Recteur d\'académie') } },
    municipalAdmin: { name: 'Mairie', employer: (city) => `Mairie de ${city}`, titles: { clerk: 'Adjoint administratif', deputyClerk: 'Rédacteur', cityClerk: 'Chef de service état civil', analyst: 'Attaché (finances)', seniorAnalyst: 'Attaché principal', financeDirector: 'Directeur des finances', manager: 'Directeur de service', acm: 'Directeur général adjoint des services', ...cmd('cityManager', ['DGA', 'DGA délégué', 'Directeur de cabinet'], 'Directeur général des services') } },
    ...GONE, transitPolice: null, corrections: null, revenue: null,
    police: {
      name: 'Police municipale', employer: (city) => `Police municipale de ${city}`,
      titles: { recruit: 'Gardien-brigadier stagiaire', officer: 'Gardien-brigadier', senior: 'Brigadier-chef principal', detective: 'Agent de recherche', seniorDetective: 'Chef de service adjoint', detSergeant: 'Chef de service (unité de recherche)', detLieutenant: 'Directeur de police municipale (recherche)', detCaptain: 'Directeur principal de police municipale', sergeant: 'Chef de service', lieutenant: 'Chef de service principal', captain: 'Directeur de police municipale', deputyChief: 'Directeur principal', ...cmd('chief', ['Directeur adjoint', 'Directeur de la tranquillité publique', 'Directeur général adjoint', 'Directeur de la sécurité'], 'Directeur de la police municipale') },
    },
    // Patrol policing in cities is the national police's job.
    statePolice: {
      name: 'Police nationale (Sécurité publique)', citizensOnly: true, employer: (city) => `Commissariat de ${city}`,
      titles: { cadet: 'Élève gardien de la paix', trooper: 'Gardien de la paix', senior: 'Sous-brigadier', investigator: 'Officier de police judiciaire', majorCrimes: 'Enquêteur, brigade criminelle', detSergeant: 'Capitaine de police (chef de groupe)', detLieutenant: 'Commandant de police (chef de section, PJ)', detCaptain: 'Commissaire (chef de brigade, PJ)', sergeant: 'Brigadier-chef', lieutenant: 'Lieutenant de police', captain: 'Capitaine de police', major: 'Commandant de police', ...cmd('superintendent', ['Commissaire de police', 'Commissaire divisionnaire', 'Contrôleur général', 'Inspecteur général'], 'Directeur général de la Police nationale') },
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
      titles: { recruit: 'Agente in prova', officer: 'Agente', senior: 'Agente scelto', detective: 'Assistente', seniorDetective: 'Sovrintendente', detSergeant: 'Ispettore (Nucleo di Polizia Giudiziaria)', detLieutenant: 'Commissario (Polizia Giudiziaria)', detCaptain: 'Commissario capo (Polizia Giudiziaria)', sergeant: 'Ispettore', lieutenant: 'Commissario', captain: 'Commissario capo', deputyChief: 'Vice comandante', ...cmd('chief', ['Dirigente di settore', 'Dirigente superiore', 'Vice comandante generale', 'Comandante vicario'], 'Comandante della Polizia Locale') },
    },
    // Patrol policing beyond the town is the national police's (the Carabinieri serve in the forces).
    statePolice: {
      name: 'Polizia di Stato (Volanti)', citizensOnly: true, employer: (city) => `Questura di ${city}`,
      titles: { cadet: 'Allievo agente', trooper: 'Agente', senior: 'Agente scelto', investigator: 'Assistente capo', majorCrimes: 'Sovrintendente (Squadra Mobile)', detSergeant: 'Ispettore superiore (Squadra Mobile)', detLieutenant: 'Commissario capo (Squadra Mobile)', detCaptain: 'Vice questore (Capo della Squadra Mobile)', sergeant: 'Ispettore', lieutenant: 'Ispettore superiore', captain: 'Commissario', major: 'Commissario capo', ...cmd('superintendent', ['Vice questore aggiunto', 'Vice questore', 'Primo dirigente', 'Dirigente superiore'], 'Questore') },
    },
    fire: {
      name: 'Vigili del Fuoco', citizensOnly: true, employer: (city) => `Comando Provinciale dei Vigili del Fuoco di ${city}`,
      titles: { recruit: 'Allievo vigile del fuoco', firefighter: 'Vigile del fuoco', engineer: 'Vigile esperto (autista)', inspector: 'Ispettore antincendi', investigator: 'Ispettore (Nucleo Investigativo)', lieutenant: 'Capo squadra', captain: 'Capo reparto', battalion: 'Funzionario', deputyChief: 'Vice comandante', ...cmd('chief', ['Comandante provinciale', 'Direttore regionale', 'Dirigente generale'], 'Capo del Corpo Nazionale') },
    },
    ems: { name: 'Servizio 118', employer: (city) => `Centrale 118 di ${city}`, titles: { emt: 'Soccorritore', paramedic: 'Infermiere del 118', criticalCare: 'Infermiere di area critica', flight: 'Infermiere di elisoccorso', fto: 'Istruttore', supervisor: 'Coordinatore infermieristico', captain: 'Responsabile di postazione', deputy: 'Vice direttore', chief: 'Direttore della Centrale 118' } },
    dispatch: { name: 'Numero Unico di Emergenza 112', employer: (city) => `Centrale Unica di Risposta 112 — ${city}`, titles: { trainee: 'Operatore in formazione', telecommunicator: 'Operatore NUE 112', senior: 'Operatore senior', training: 'Formatore', supervisor: 'Capoturno', director: 'Responsabile della Centrale' } },
  },

  JP: {
    education: { name: 'Public Schools', employer: (c, s, sn) => `${sn} Board of Education`, titles: { sub: 'Temporary Teacher (Kōshi)', teacher: 'Teacher (Kyōyu)', senior: 'Senior Teacher (Shidō Kyōyu)', coach: 'Lead Teacher', specialist: 'Teaching Supervisor (Shidō Shuji)', chair: 'Head Teacher (Shunin)', ap: 'Vice-Principal (Kyōtō)', principal: 'Principal (Kōchō)', director: 'Board of Education Section Chief', assistantSuper: 'Deputy Superintendent', ...cmd('superintendent', ['Director-General of Education', 'Deputy Superintendent of Education'], 'Superintendent of Education (Kyōikuchō)') } },
    municipalAdmin: { name: 'City Hall', employer: (city) => `${city} City Hall`, titles: { clerk: 'Clerk (Shuji)', deputyClerk: 'Senior Clerk', cityClerk: 'Section Chief (Kakarichō)', analyst: 'Budget Officer', seniorAnalyst: 'Assistant Section Manager', financeDirector: 'Director of Finance', manager: 'Section Manager (Kachō)', acm: 'Department Director (Buchō)', ...cmd('cityManager', ['Bureau Director', 'Chief Administrative Officer', 'Deputy Mayor (Fuku-shichō)'], 'Deputy Mayor (Senior)') } },
    revenue: { name: 'Prefectural Tax Office', employer: (c, s, sn) => `${sn} Prefectural Tax Office` },
    prosecution: { name: 'Public Prosecutors Office', employer: (city) => `${city} District Public Prosecutors Office`, titles: { clerk: 'Public Prosecutor\'s Assistant Officer', ada: 'Prosecutor (Kenji)', senior: 'Senior Prosecutor', trial: 'Special Investigation Department Prosecutor', chiefDeputy: 'Deputy Chief Prosecutor', first: 'Chief Prosecutor (Kenjisei)' } },
    probation: { name: 'Probation Office', employer: (city) => `${city} Probation Office`, titles: { trainee: 'Probation Officer Trainee', officer: 'Probation Officer (Hogo Kansatsukan)', senior: 'Senior Probation Officer', supervisor: 'Section Chief', chief: 'Director of the Probation Office' } },
    ...GONE, police: null, airportPolice: null, transitPolice: null, corrections: null,
    statePolice: {
      name: 'Prefectural Police', citizensOnly: true, employer: (c, s, sn) => (s === 'JP-13' ? 'Tokyo Metropolitan Police Department' : s === 'JP-01' ? 'Hokkaido Prefectural Police' : `${sn} Prefectural Police`),
      titles: { cadet: 'Police Academy Trainee', trooper: 'Junsa (Police Officer)', senior: 'Junsa-buchō (Senior Officer)', investigator: 'Detective (Junsa-buchō)', majorCrimes: 'Detective, Investigation Division 1', detSergeant: 'Keibuho (Detective Squad Leader)', detLieutenant: 'Keibu (Detective Inspector)', detCaptain: 'Keishi (Criminal Investigation Division Chief)', sergeant: 'Keibuho (Assistant Inspector)', lieutenant: 'Keibu (Inspector)', captain: 'Keishi (Superintendent)', major: 'Keishi (Station Chief)', ...cmd('superintendent', ['Keishisei (Senior Superintendent)', 'Keishichō (Chief Superintendent)', 'Keishikan (Superintendent Supervisor)', 'Deputy Chief of Police'], 'Chief of Prefectural Police') },
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
      titles: { cadet: 'Central Police Academy Trainee', trooper: 'Sungyeong (Police Officer)', senior: 'Gyeongjang (Senior Officer)', investigator: 'Gyeongsa (Detective)', majorCrimes: 'Gyeongsa (Violent Crimes Unit)', detSergeant: 'Gyeongwi (Detective Team Leader)', detLieutenant: 'Gyeonggam (Investigation Section Chief)', detCaptain: 'Gyeongjeong (Criminal Investigation Division Chief)', sergeant: 'Gyeongwi (Assistant Inspector)', lieutenant: 'Gyeonggam (Inspector)', captain: 'Gyeongjeong (Superintendent)', major: 'Chonggyeong (Senior Superintendent)', ...cmd('superintendent', ['Gyeongmugwan (Chief Superintendent)', 'Chianggam (Superintendent General)', 'Chianjeonggam (Deputy Commissioner)', 'Deputy Commissioner General'], 'Commissioner of the Provincial Police Agency') },
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
      titles: { recruit: 'Cadete', officer: 'Policía', senior: 'Policía Primero', detective: 'Agente de Investigación', seniorDetective: 'Agente de Investigación Primero', detSergeant: 'Jefe de Grupo (Investigación)', detLieutenant: 'Comandante de Investigación', detCaptain: 'Coordinador de Investigación', sergeant: 'Suboficial', lieutenant: 'Oficial', captain: 'Inspector', deputyChief: 'Inspector Jefe', ...cmd('chief', ['Inspector General', 'Comisario', 'Comisario Jefe', 'Subsecretario de Seguridad'], 'Secretario de Seguridad Pública Municipal') },
    },
    statePolice: {
      name: 'Policía Estatal', employer: (c, s, sn) => (s === 'MX-CMX' ? 'Secretaría de Seguridad Ciudadana (CDMX)' : `Policía Estatal de ${sn}`),
      titles: { cadet: 'Cadete', trooper: 'Policía', senior: 'Policía Primero', investigator: 'Agente de Investigación', majorCrimes: 'Agente de Investigación (Homicidios)', detSergeant: 'Jefe de Grupo (Investigación)', detLieutenant: 'Comandante de Investigación', detCaptain: 'Coordinador de Investigación', sergeant: 'Suboficial', lieutenant: 'Oficial', captain: 'Inspector', major: 'Inspector Jefe', ...cmd('superintendent', ['Inspector General', 'Comisario', 'Comisario General', 'Subsecretario'], 'Secretario de Seguridad Pública') },
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
      titles: { recruit: 'Police Trainee (Regional Training Center)', officer: 'Patrolman', senior: 'Police Corporal', detective: 'Police Staff Sergeant (Investigator)', seniorDetective: 'Police Master Sergeant (Investigator)', detSergeant: 'Police Lieutenant (Investigation Team Leader)', detLieutenant: 'Police Captain (Chief, Investigation Section)', detCaptain: 'Police Major (Chief, Investigation Division)', sergeant: 'Police Senior Master Sergeant', lieutenant: 'Police Lieutenant', captain: 'Police Captain', deputyChief: 'Police Major', ...cmd('chief', ['Police Lieutenant Colonel', 'Police Colonel', 'Police Brigadier General', 'Police Major General'], 'Chief PNP (Police General)') },
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
    education: { name: 'Government Schools', employer: (c, s, sn) => `${sn} Department of School Education`, titles: { sub: 'Guest Teacher', teacher: 'Trained Graduate Teacher', senior: 'Post Graduate Teacher', coach: 'Block Resource Person', specialist: 'Subject Expert (SCERT)', chair: 'Senior Lecturer', ap: 'Vice Principal', principal: 'Principal', director: 'District Education Officer', assistantSuper: 'Joint Director of Education', ...cmd('superintendent', ['Additional Director', 'Director of School Education'], 'Commissioner of School Education') } },
    prosecution: { name: 'Directorate of Prosecution', employer: (c, s, sn) => `${sn} Directorate of Prosecution — ${c}`, titles: { clerk: 'Legal Assistant', ada: 'Assistant Public Prosecutor', senior: 'Additional Public Prosecutor', trial: 'Public Prosecutor', chiefDeputy: 'Deputy Director of Prosecution', first: 'Director of Prosecution' } },
    revenue: { name: 'Commercial Taxes Department', employer: (c, s, sn) => `${sn} Commercial Taxes Department` },
    ...GONE, police: null, transitPolice: null,
    statePolice: {
      name: 'State Police', citizensOnly: true, employer: (c, s, sn) => ({ 'IN-MH': 'Maharashtra Police', 'IN-DL': 'Delhi Police', 'IN-KA': 'Karnataka State Police', 'IN-TN': 'Tamil Nadu Police', 'IN-WB': 'West Bengal Police', 'IN-UP': 'Uttar Pradesh Police' }[s] ?? `${sn} Police`),
      titles: { cadet: 'Constable (trainee)', trooper: 'Police Constable', senior: 'Head Constable', investigator: 'Assistant Sub-Inspector', majorCrimes: 'Sub-Inspector (Crime Branch)', detSergeant: 'Inspector (Crime Branch)', detLieutenant: 'Deputy Superintendent (Crime Branch)', detCaptain: 'Superintendent of Police (CID)', sergeant: 'Sub-Inspector', lieutenant: 'Inspector (Station House Officer)', captain: 'Deputy Superintendent of Police', major: 'Superintendent of Police', ...cmd('superintendent', ['Deputy Inspector General', 'Inspector General', 'Additional Director General', 'Special Director General'], 'Director General of Police') },
    },
    corrections: { name: 'State Prisons Department', employer: (c, s, sn) => `${c} Central Jail (${sn} Prisons)`, titles: { officer: 'Jail Warder', senior: 'Head Warder', investigator: 'Prison Intelligence Officer', sergeant: 'Chief Head Warder', lieutenant: 'Assistant Jailer', captain: 'Deputy Jailer', deputyWarden: 'Jailer', warden: 'Jail Superintendent', director: 'Director General of Prisons' } },
    fire: { name: 'State Fire & Emergency Services', employer: (city) => `${city} Fire Brigade`, titles: { recruit: 'Fireman (trainee)', firefighter: 'Fireman', engineer: 'Fireman Driver', inspector: 'Fire Prevention Officer', lieutenant: 'Leading Fireman', captain: 'Sub-Officer', battalion: 'Station Officer', deputyChief: 'Divisional Fire Officer', ...cmd('chief', ['Deputy Chief Fire Officer', 'Chief Fire Officer', 'Director of Fire Services'], 'Director General, Fire Services') } },
    ems: { name: '108 Emergency Ambulance', employer: (city) => `108 Emergency Response — ${city}`, titles: { emt: 'Emergency Medical Technician', paramedic: 'Senior EMT', fto: 'EMT Trainer', supervisor: 'Fleet Supervisor', captain: 'District Operations Manager', chief: 'State Operations Head' } },
    dispatch: { name: '112 Emergency Response Support System', employer: (city) => `ERSS 112 — ${city}`, titles: { trainee: 'Communication Officer Trainee', telecommunicator: '112 Communication Officer', senior: 'Senior Communication Officer', training: 'ERSS Trainer', supervisor: 'Shift In-charge', director: 'ERSS Nodal Officer' } },
  },

  AU: {
    education: { name: 'State Schools', employer: (c, s, sn) => `${sn} Department of Education`, titles: { sub: 'Casual Relief Teacher', teacher: 'Teacher', senior: 'Highly Accomplished Teacher', coach: 'Instructional Leader', specialist: 'Curriculum Leader', chair: 'Head of Department', ap: 'Deputy Principal', principal: 'Principal', director: 'Director, School Performance', assistantSuper: 'Executive Director, Schools', ...cmd('superintendent', ['Deputy Secretary, Schools', 'Deputy Director-General'], 'Director-General of Education') } },
    municipalAdmin: { name: 'Local Council', employer: (city) => `City of ${city}`, titles: { clerk: 'Customer Service Officer', deputyClerk: 'Governance Officer', cityClerk: 'Governance Manager', analyst: 'Finance Officer', seniorAnalyst: 'Senior Financial Analyst', financeDirector: 'Chief Financial Officer', manager: 'Manager', acm: 'Director', ...cmd('cityManager', ['General Manager, Corporate Services', 'Deputy CEO', 'Executive Director'], 'Chief Executive Officer') } },
    revenue: { name: 'State Revenue Office', employer: (c, s, sn) => ({ 'AU-NSW': 'Revenue NSW', 'AU-VIC': 'State Revenue Office Victoria', 'AU-QLD': 'Queensland Revenue Office' }[s] ?? `${sn} Revenue Office`) },
    ...GONE, police: null, transitPolice: null,
    gameWarden: { name: 'Fisheries & Wildlife Officers', employer: (c, s, sn) => `${sn} Fisheries & Wildlife Compliance`, titles: { cadet: 'Trainee Fisheries Officer', warden: 'Fisheries Officer', investigator: 'Wildlife Crime Investigator', chief: 'Director of Compliance' } },
    stateFire: { name: 'Rural Fire Service', employer: (c, s, sn) => ({ 'AU-NSW': 'NSW Rural Fire Service', 'AU-VIC': 'Country Fire Authority', 'AU-SA': 'Country Fire Service' }[s] ?? `${sn} Rural Fire Service`) },
    statePolice: {
      name: 'State Police', employer: (c, s, sn) => AU_STATE_POLICE[s] ?? `${sn} Police`,
      titles: { cadet: 'Probationary Constable (recruit)', trooper: 'Constable', senior: 'Senior Constable', investigator: 'Detective Senior Constable', majorCrimes: 'Detective Senior Constable (Homicide)', detSergeant: 'Detective Sergeant', detLieutenant: 'Detective Senior Sergeant', detCaptain: 'Detective Inspector', sergeant: 'Sergeant', lieutenant: 'Senior Sergeant', captain: 'Inspector', major: 'Superintendent', ...cmd('superintendent', ['Chief Superintendent', 'Assistant Commissioner', 'Deputy Commissioner', 'Deputy Commissioner (Operations)'], 'Commissioner of Police') },
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
fromPacks(LOCAL_AGENCIES, 'LOCAL_AGENCIES');

/**
 * Council inspectors abroad: building control, environmental health and the local
 * enforcement office, by their local names. (Every country has some; the titles differ.)
 */
const T = (codeOfficer, inspector, senior, plansExaminer, supervisor, manager, buildingOfficial) => ({ codeOfficer, inspector, senior, plansExaminer, supervisor, manager, buildingOfficial });
const INSPECTORS = {
  CA: { name: 'Municipal By-law & Building Services', employer: (c) => `${town(c)} By-law Enforcement & Building Services`, titles: T('Municipal Law Enforcement Officer', 'Building Inspector', 'Senior Building Inspector', 'Plans Examiner', 'Supervisor, By-law Enforcement', 'Manager, Building Services', 'Chief Building Official') },
  GB: { name: 'Council Regulatory Services', employer: (c) => `${town(c)} Council — Building Control & Environmental Health`, titles: T('Enforcement Officer', 'Building Control Surveyor', 'Environmental Health Officer', 'Principal Building Control Surveyor', 'Team Leader, Regulatory Services', 'Head of Building Control', 'Head of Regulatory Services') },
  IE: { name: 'Building Control & Environmental Health', employer: (c) => `${town(c)} County Council — Building Control`, titles: T('Enforcement Officer', 'Building Control Officer', 'Environmental Health Officer', 'Senior Building Control Officer', 'Senior Staff Officer', 'Senior Executive Officer', 'Chief Fire & Building Control Officer') },
  AU: { name: 'Council Compliance & Building Services', employer: (c) => `${town(c)} City Council — Compliance & Building`, titles: T('Local Laws Officer (Ranger)', 'Municipal Building Surveyor', 'Environmental Health Officer', 'Principal Building Surveyor', 'Compliance Team Leader', 'Coordinator, Building & Compliance', 'Manager, Regulatory Services') },
  NZ: { name: 'Council Building Consents & Compliance', employer: (c) => `${town(c)} City Council — Building Consents & Compliance`, titles: T('Compliance Officer', 'Building Consent Officer', 'Environmental Health Officer', 'Principal Building Consent Officer', 'Team Leader, Compliance', 'Building Consents Manager', 'Head of Building Consents') },
  DE: { name: 'Ordnungsamt & Bauaufsicht', employer: (c) => `Ordnungsamt / Bauaufsichtsamt ${town(c)}`, titles: T('Mitarbeiter im Außendienst (Ordnungsamt)', 'Baukontrolleur', 'Lebensmittelkontrolleur', 'Bauprüfer', 'Sachgebietsleiter', 'Abteilungsleiter Bauaufsicht', 'Amtsleiter Bauaufsicht') },
  FR: { name: 'Services techniques municipaux', employer: (c) => `Mairie de ${town(c)} — urbanisme et hygiène`, titles: T('Agent de surveillance de la voie publique', 'Contrôleur de travaux', 'Inspecteur de salubrité (SCHS)', 'Instructeur des autorisations d\'urbanisme', 'Responsable d\'équipe', 'Chef du service urbanisme', 'Directeur des services techniques') },
  IT: { name: 'Ufficio tecnico comunale', employer: (c) => `Comune di ${town(c)} — Ufficio tecnico ed edilizia privata`, titles: T('Agente accertatore', 'Istruttore tecnico (ispettore edilizio)', 'Ispettore igienista (ASL)', 'Istruttore direttivo tecnico', 'Responsabile di procedimento', 'Capo servizio edilizia privata', 'Dirigente dell\'Ufficio tecnico') },
  ES: { name: 'Inspección municipal', employer: (c) => `Ayuntamiento de ${town(c)} — Disciplina urbanística`, titles: T('Agente de inspección', 'Inspector de obras', 'Inspector de sanidad', 'Técnico de licencias', 'Jefe de negociado', 'Jefe de servicio', 'Director de urbanismo') },
  NL: { name: 'Toezicht & Handhaving', employer: (c) => `Gemeente ${town(c)} — Toezicht en Handhaving`, titles: T('Handhaver (BOA)', 'Bouwinspecteur', 'Toezichthouder milieu', 'Vergunningverlener bouwen', 'Teamleider handhaving', 'Afdelingshoofd VTH', 'Directeur Vergunningen, Toezicht en Handhaving') },
  SE: { name: 'Byggnads- och miljöförvaltning', employer: (c) => `${town(c)} kommun — bygg- och miljöförvaltningen`, titles: T('Tillsynshandläggare', 'Byggnadsinspektör', 'Miljö- och hälsoskyddsinspektör', 'Bygglovshandläggare', 'Gruppchef', 'Avdelningschef', 'Förvaltningschef') },
  JP: { name: 'Building Guidance Division', employer: (c) => `${town(c)} City Hall — Building Guidance Division`, titles: T('Inspection Staff', 'Building Inspector (Kenchiku Shuji)', 'Senior Building Inspector', 'Building Confirmation Examiner', 'Section Chief (Kakarichō)', 'Division Chief (Kachō)', 'Director, Urban Development Bureau') },
  KR: { name: 'District Office Building Division', employer: (c) => `${town(c)} District Office — Building Division`, titles: T('Enforcement Officer', 'Building Inspector', 'Senior Building Inspector', 'Permit Examiner', 'Team Leader', 'Division Director', 'Director, Urban Construction Bureau') },
  MX: { name: 'Inspección y Verificación Municipal', employer: (c) => `Municipio de ${town(c)} — Dirección de Inspección y Vigilancia`, titles: T('Inspector de reglamentos', 'Verificador de obra', 'Inspector sanitario', 'Dictaminador de licencias', 'Jefe de departamento', 'Subdirector de inspección', 'Director de Inspección y Vigilancia') },
  BR: { name: 'Fiscalização municipal', employer: (c) => `Prefeitura de ${town(c)} — Fiscalização de Obras e Posturas`, titles: T('Fiscal de posturas', 'Fiscal de obras', 'Fiscal sanitário (Vigilância Sanitária)', 'Analista de licenciamento', 'Chefe de divisão', 'Gerente de fiscalização', 'Secretário municipal de urbanismo') },
  PH: { name: 'Office of the Building Official', employer: (c) => `${town(c)} City Hall — Office of the Building Official`, titles: T('Zoning Enforcement Officer', 'Building Inspector', 'Sanitary Inspector', 'Plans Evaluator', 'Chief Inspector', 'Assistant Building Official', 'City Building Official') },
  IN: { name: 'Municipal Building & Licensing Department', employer: (c) => `${town(c)} Municipal Corporation — Building Proposal Department`, titles: T('Licence Inspector', 'Building Inspector', 'Sanitary Inspector', 'Junior Engineer (Building Proposals)', 'Assistant Engineer', 'Executive Engineer', 'City Engineer') },
};
for (const [cc, table] of Object.entries(LOCAL_AGENCIES)) if (cc !== 'US' && table.councilInspector === undefined) table.councilInspector = INSPECTORS[cc] ?? { name: 'Council Inspections', employer: (c) => `${town(c)} council — inspections & enforcement` };

/**
 * Plain local names for the agencies a country's table leaves out, so none keeps a US
 * name abroad ("Scotland State Legislature", "Hokkaido Department of Transportation").
 */
const town = (city) => city.split(',')[0];
/** Countries whose provinces or states have their own parliaments. */
const REGIONAL_PARLIAMENTS = ['CA', 'AU', 'DE', 'IN', 'MX', 'ES', 'IT', 'BR'];
const ABROAD_DEFAULTS = {
  legislativeStaff: { name: 'Parliamentary Staff', employer: (c, s, sn) => (REGIONAL_PARLIAMENTS.includes(s?.split('-')[0]) ? `${sn} legislature — staff office` : 'Parliamentary Service (national parliament)') },
  courts: { name: 'Courts Service', employer: (city) => `Courts Service — ${town(city)}` },
  publicDefender: { name: 'Public Defence Service', employer: (city) => `Public Defence Service (legal aid) — ${town(city)}` },
  cps: { name: 'Children\'s Services', employer: (city) => `Children's services — ${town(city)}` },
  probation: { name: 'Probation Service', employer: (city) => `Probation Service — ${town(city)}` },
  environmental: { name: 'Environmental Protection Agency', employer: (c, s, sn) => `Environmental Protection Agency — ${sn} office` },
  forester: { name: 'Forestry Service', employer: (c, s, sn) => `Forestry Service — ${sn}` },
  dot: { name: 'Roads Authority', employer: (c, s, sn) => `Roads authority — ${sn}` },
  forensics: { name: 'Forensic Science Service', employer: (c, s, sn) => `Forensic Science Service — ${sn}` },
  university: { employer: (city) => `University of ${town(city)}` },
  communityCollege: { name: 'Further Education College', employer: (city) => `${town(city)} College` },
  transit: { name: 'Public Transport', employer: (city) => `${town(city)} public transport authority` },
  transitMaintenance: { employer: (city) => `${town(city)} public transport authority — depots` },
  schoolBus: { name: 'School Transport', employer: (city) => `${town(city)} school transport service` },
  publicHealth: { name: 'Public Health Service', employer: (city) => `${town(city)} public health service` },
  publicWorks: { name: 'Public Works', employer: (city) => `${town(city)} council — roads & public works` },
};
for (const [cc, table] of Object.entries(LOCAL_AGENCIES)) {
  if (cc === 'US') continue;
  for (const [id, a] of Object.entries(ABROAD_DEFAULTS)) if (table[id] === undefined) table[id] = a;
}

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

/**
 * Who governs each emergency service abroad: its chief answers to (and is appointed by)
 * this body. By state or region id where it differs; '*' for the rest of the country.
 */
export const SERVICE_AUTHORITY = {
  '*': { police: 'the police board', fire: 'the council', ems: 'the regional health authority', dispatch: 'the emergency services board' },
  CA: { police: 'the police services board', fire: 'the city council', ems: 'the city council', dispatch: 'the city council' },
  GB: {
    police: { 'GB-SCT': 'the Scottish Police Authority', 'GB-NIR': 'the Northern Ireland Policing Board', '*': 'the Police and Crime Commissioner' },
    fire: { 'GB-SCT': 'the Scottish Government', 'GB-NIR': 'the Department of Health (NI)', '*': 'the fire and rescue authority' },
    ems: { 'GB-SCT': 'the Scottish Ambulance Service board', '*': 'the NHS trust board' },
    dispatch: 'the fire and rescue authority',
  },
  IE: { police: 'the Policing Authority', fire: 'the county council', ems: 'the HSE', dispatch: 'the county council' },
  AU: { police: 'the state government', fire: 'the state government', ems: 'the state government', dispatch: 'the state government' },
  NZ: { police: 'the Minister of Police', fire: 'the FENZ board', ems: 'the Hato Hone St John board', dispatch: 'the FENZ board' },
  DE: { police: 'the Land interior ministry', fire: 'the city council (Stadtrat)', ems: 'the district (Landkreis)', dispatch: 'the district (Landkreis)' },
  FR: { police: 'the mayor', fire: 'the SDIS board (département)', ems: 'the hospital trust (CHU)', dispatch: 'the hospital trust (CHU)' },
  IT: { police: 'the mayor (sindaco)', fire: 'the Ministry of the Interior', ems: 'the regional health authority', dispatch: 'the region' },
  ES: { police: 'the mayor (alcalde)', fire: 'the provincial council (diputación)', ems: 'the regional health service', dispatch: 'the regional government' },
  NL: { police: 'the Minister of Justice and Security', fire: 'the safety region board', ems: 'the safety region board', dispatch: 'the safety region board' },
  SE: { police: 'the Swedish Police Authority', fire: 'the municipal council', ems: 'the regional council', dispatch: 'SOS Alarm' },
  JP: { police: 'the prefectural public safety commission', fire: 'the mayor', ems: 'the mayor', dispatch: 'the mayor' },
  KR: { police: 'the Korean National Police Agency', fire: 'the National Fire Agency', ems: 'the National Fire Agency', dispatch: 'the National Fire Agency' },
  MX: { police: 'the municipal president', fire: 'the municipal government', ems: 'the state government', dispatch: 'the state government' },
  BR: { police: 'the state government', fire: 'the state government', ems: 'the municipal health secretariat', dispatch: 'the state government' },
  PH: { police: 'PNP national headquarters', fire: 'BFP national headquarters', ems: 'the city government', dispatch: 'the city government' },
  IN: { police: 'the state government', fire: 'the state government', ems: 'the state health department', dispatch: 'the state government' },
};
export function serviceAuthority(countryId, serviceId, stateId) {
  const v = SERVICE_AUTHORITY[countryId]?.[serviceId] ?? SERVICE_AUTHORITY['*'][serviceId] ?? 'the local authority';
  return typeof v === 'string' ? v : v[stateId] ?? v['*'];
}

/**
 * Emergency services that are one national or state body with local units: the job's
 * employer is the unit (a PNP police station, a provincial fire command), the organization
 * is the body. '{state}' becomes the state's name.
 */
export const SERVICE_BODY = {
  PH: { police: 'Philippine National Police', fire: 'Bureau of Fire Protection' },
  IT: { fire: 'Corpo Nazionale dei Vigili del Fuoco' },
  KR: { fire: 'National Fire Agency' },
  IN: { fire: '{state} Fire & Emergency Services', ems: '{state} 108 Emergency Ambulance Service' },
  FR: { fire: 'SDIS (service départemental d\'incendie et de secours)' },
};
/**
 * Emergency services run as one national body with stations (or districts) across the
 * country: FENZ, Hato Hone St John, Ireland's National Ambulance Service, Korea's National
 * Fire Agency, Italy's Vigili del Fuoco, the PNP and BFP. A job there is with the national
 * service, posted to your area.
 */
export const NATIONAL_SERVICES = {
  NZ: ['fire', 'ems'], IE: ['ems'], KR: ['fire', 'ems'], IT: ['fire'], PH: ['police', 'fire'],
};
fromPacks(NATIONAL_SERVICES, 'NATIONAL_SERVICES');
export const isNationalService = (countryId, serviceId) => Boolean(NATIONAL_SERVICES[countryId]?.includes(serviceId));

export function serviceBody(countryId, serviceId, stateName) {
  const b = SERVICE_BODY[countryId]?.[serviceId];
  return b ? b.replace('{state}', stateName ?? 'State') : null;
}
