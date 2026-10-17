/**
 * The professions as each country runs them: what doctors, lawyers and
 * academics are called at every rank, and how a doctor trains.
 *
 *   PROFESSION_TITLES[cc][professionId][levelId]  local rank titles
 *     medical     a British consultant, a German Oberarzt and Chefarzt, a French PU-PH,
 *                 a Japanese senmon-i, an Indian HOD
 *     law         trainee solicitors, Rechtsreferendare, élèves-avocats, candidate attorneys
 *     university  lecturers and readers, Juniorprofessoren and W3 chairs, maîtres de conférences,
 *     college     jokyō and kyōju, Levels A–E
 *
 *   MEDICAL_SYSTEMS[cc]
 *     foundation  years of general training after the degree, before specialty training
 *                 (the UK Foundation Programme, Japan's initial clinical training, Mexico's
 *                 servicio social, South Africa's internship and community service), with its title
 *     allocation  how specialty training posts are given out: a match (US, Canada, Singapore),
 *                 a national ranking exam (France's EDN, Spain's MIR, India's NEET-PG, Mexico's
 *                 ENARM, Italy's SSM) or applying to posts (Germany, Japan, the Nordics);
 *                 `comp` scales how competitive the popular specialties are
 *     training    how long specialty training runs compared with a US residency (British and
 *                 Australian trainees take years longer to reach consultant)
 *
 *   LAW_SYSTEMS[cc]
 *     split       a separate bar of advocates (barristers in chambers) beside solicitors
 *     silk        the rank senior advocates can apply for (King's Counsel, Senior Counsel,
 *                 Senior Advocate of Nigeria)
 *     training    the apprenticeship before admission
 */
import { fromPacks } from './packs/index.js';

const MED_KEYS = ['resident', 'chiefResident', 'attending', 'senior', 'renowned', 'head', 'chief'];
const LAW_KEYS = ['clerk', 'associate', 'senior', 'counsel', 'partner', 'seniorPartner', 'managingPartner'];
const zip = (keys, titles) => Object.fromEntries(keys.map((k, i) => [k, titles[i]]).filter(([, t]) => t));
const med = (...t) => zip(MED_KEYS, t);
const law = (...t) => zip(LAW_KEYS, t);
/**
 * One academic ladder for both the public university and private colleges:
 * [adjunct, lecturer, assistant, associate, professor, distinguished, chair, dean, provost, president, visiting, endowed].
 */
function academic(adjunct, lecturer, assistant, associate, professor, distinguished, chair, dean, provost, president, visiting = null, endowed = null) {
  return {
    university: { adjunct, assistant, associate, professor, distinguished, chair, dean, provost, president },
    college: { lecturer, visiting: visiting ?? lecturer, assistant, associate, professor, endowed: endowed ?? `${distinguished} (named chair)`, university: distinguished, chair, dean, provost },
  };
}
const country = (medical, lawTitles, ac) => ({ medical, law: lawTitles, ...ac });

const COMMONWEALTH_LAW = law('Trainee Solicitor', 'Solicitor (Associate)', 'Senior Associate', 'Legal Director', 'Partner', 'Equity Partner', 'Managing Partner');

export const PROFESSION_TITLES = {
  CA: country(
    med('Resident (PGY)', 'Chief Resident', 'Staff Physician', 'Senior Staff Physician', 'Clinical Professor', 'Division Head', 'Chief of Staff'),
    law('Articling Student', 'Associate', 'Senior Associate', 'Counsel', 'Partner', 'Senior Partner', 'Managing Partner'),
    academic('Sessional Instructor', 'Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor', 'University Professor', 'Department Chair', 'Dean', 'Provost & Vice-President Academic', 'President & Vice-Chancellor')),
  GB: country(
    med('Specialty Registrar (StR)', 'Senior Registrar', 'Consultant', 'Senior Consultant', 'Professor & Consultant', 'Clinical Director', 'Medical Director'),
    COMMONWEALTH_LAW,
    academic('Teaching Fellow', 'Lecturer', 'Lecturer', 'Senior Lecturer', 'Reader', 'Professor', 'Head of Department', 'Dean of Faculty', 'Pro-Vice-Chancellor', 'Vice-Chancellor', 'Fixed-term Lecturer', 'Professor (Named Chair)')),
  IE: country(
    med('Specialist Registrar', 'Senior Registrar', 'Consultant', 'Senior Consultant', 'Professor & Consultant', 'Clinical Director', 'Chief Clinical Director'),
    COMMONWEALTH_LAW,
    academic('Occasional Lecturer', 'Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor', 'Full Professor (Chair)', 'Head of School', 'Dean', 'Registrar & Deputy President', 'President')),
  AU: country(
    med('Registrar (college training)', 'Senior Registrar', 'Staff Specialist', 'Senior Staff Specialist', 'Clinical Professor', 'Head of Department', 'Director of Medical Services'),
    law('Graduate Lawyer (PLT)', 'Lawyer', 'Senior Associate', 'Special Counsel', 'Partner', 'Equity Partner', 'Managing Partner'),
    academic('Sessional Academic', 'Associate Lecturer (Level A)', 'Lecturer (Level B)', 'Senior Lecturer (Level C)', 'Associate Professor (Level D)', 'Professor (Level E)', 'Head of School', 'Executive Dean', 'Deputy Vice-Chancellor (Academic)', 'Vice-Chancellor')),
  NZ: country(
    med('Registrar (vocational training)', 'Senior Registrar', 'Consultant', 'Senior Consultant', 'Clinical Professor', 'Clinical Head of Department', 'Chief Medical Officer'),
    law('Graduate Solicitor', 'Solicitor', 'Senior Associate', 'Special Counsel', 'Partner', 'Equity Partner', 'Managing Partner'),
    academic('Teaching Fellow', 'Lecturer', 'Lecturer', 'Senior Lecturer', 'Associate Professor', 'Professor', 'Head of School', 'Dean', 'Deputy Vice-Chancellor', 'Vice-Chancellor')),
  DE: country(
    med('Assistenzarzt (in Weiterbildung)', 'Assistenzarzt (vor der Facharztprüfung)', 'Facharzt', 'Oberarzt', 'Leitender Oberarzt', 'Chefarzt', 'Ärztlicher Direktor'),
    law('Rechtsreferendar', 'Rechtsanwalt (Associate)', 'Senior Associate', 'Counsel', 'Salary Partner', 'Equity-Partner', 'Managing Partner'),
    academic('Lehrbeauftragter', 'Wissenschaftlicher Mitarbeiter', 'Juniorprofessor (W1)', 'Professor (W2)', 'Professor (W3, Lehrstuhl)', 'Seniorprofessor (W3)', 'Institutsdirektor', 'Dekan', 'Vizepräsident', 'Präsident', 'Vertretungsprofessor', 'Stiftungsprofessor (W3)')),
  FR: country(
    med('Interne (DES)', 'Docteur junior', 'Praticien hospitalier (PH)', 'Praticien hospitalier (échelon supérieur)', 'PU-PH (professeur des universités–praticien hospitalier)', 'Chef de service', 'Président de la CME'),
    law('Élève-avocat (EFB)', 'Avocat collaborateur', 'Avocat collaborateur senior', 'Counsel', 'Avocat associé', 'Associé gérant', 'Managing partner'),
    academic('Chargé d\'enseignement vacataire', 'ATER', 'Maître de conférences', 'Maître de conférences HDR', 'Professeur des universités', 'Professeur des universités (classe exceptionnelle)', 'Directeur de département', 'Directeur d\'UFR', 'Vice-président', 'Président d\'université', 'Professeur invité', 'Professeur (membre de l\'IUF)')),
  IT: country(
    med('Medico specializzando', 'Specializzando (ultimo anno)', 'Dirigente medico', 'Dirigente medico (alta specializzazione)', 'Professore ordinario (clinico)', 'Primario (direttore di struttura complessa)', 'Direttore sanitario'),
    law('Praticante avvocato', 'Avvocato (associate)', 'Senior associate', 'Of counsel', 'Socio', 'Equity partner', 'Managing partner'),
    academic('Professore a contratto', 'Assegnista di ricerca', 'Ricercatore (RTD)', 'Professore associato', 'Professore ordinario', 'Professore ordinario (chiara fama)', 'Direttore di dipartimento', 'Preside di facoltà', 'Prorettore', 'Rettore')),
  JP: country(
    med('Senkōi (specialty trainee)', 'Senkōi (final year)', 'Senmon-i (specialist)', 'Ichō (section chief)', 'Kyōju (professor of medicine)', 'Buchō (department director)', 'Inchō (hospital director)'),
    law('Shihō shūshūsei (legal apprentice)', 'Bengoshi (associate)', 'Bengoshi (senior associate)', 'Kyakuin bengoshi (of counsel)', 'Partner bengoshi', 'Senior partner', 'Daihyō bengoshi (managing partner)'),
    academic('Hijōkin kōshi (part-time lecturer)', 'Tokunin jokyō', 'Jokyō (assistant professor)', 'Junkyōju (associate professor)', 'Kyōju (professor)', 'Tokubetsu kyōju (distinguished professor)', 'Gakka-chō (department chair)', 'Gakubu-chō (dean)', 'Fuku-gakuchō (vice-president)', 'Gakuchō (president)', 'Kyakuin kyōju (visiting professor)', 'Kifu kōza kyōju (endowed chair)')),
  KR: country(
    med('Jeongongui (resident)', 'Uigookjang (chief resident)', 'Jeonmunui (specialist)', 'Imsang gyosu (clinical professor)', 'Gyosu (professor of medicine)', 'Gwajang (department chair)', 'Byeongwonjang (hospital director)'),
    law('Law school clerk', 'Byeonhosa (associate)', 'Senior byeonhosa', 'Gomun (counsel)', 'Partner byeonhosa', 'Senior partner', 'Daepyo byeonhosa (managing partner)'),
    academic('Siganganesa (part-time lecturer)', 'Gangui jeondam (teaching lecturer)', 'Jogyosu (assistant professor)', 'Bugyosu (associate professor)', 'Jeonggyosu (professor)', 'Seokjwa gyosu (distinguished professor)', 'Hakgwajang (department chair)', 'Hakjang (dean)', 'Buchongjang (vice-president)', 'Chongjang (president)')),
  MX: country(
    med('Médico residente', 'Jefe de residentes', 'Médico adscrito', 'Médico adscrito titular', 'Profesor titular (clínico)', 'Jefe de servicio', 'Director médico'),
    law('Pasante', 'Abogado asociado', 'Asociado sénior', 'Consejero', 'Socio', 'Socio sénior', 'Socio director'),
    academic('Profesor de asignatura', 'Ayudante de profesor', 'Profesor de carrera asociado', 'Profesor titular A', 'Profesor titular C', 'Investigador emérito (SNI III)', 'Coordinador de carrera', 'Director de facultad', 'Secretario general', 'Rector')),
  PH: country(
    med('Resident', 'Chief Resident', 'Consultant (attending)', 'Senior Consultant', 'Professor & Consultant', 'Department Chair', 'Medical Director'),
    law('Junior Associate (pre-bar)', 'Associate', 'Senior Associate', 'Of Counsel', 'Partner', 'Senior Partner', 'Managing Partner'),
    academic('Lecturer', 'Instructor', 'Assistant Professor', 'Associate Professor', 'Professor', 'University Professor', 'Department Chair', 'Dean', 'Vice President for Academic Affairs', 'University President')),
  IN: country(
    med('Junior Resident (MD/MS)', 'Senior Resident', 'Consultant', 'Senior Consultant', 'Professor & Senior Consultant', 'Head of Department (HOD)', 'Medical Superintendent'),
    law('Law Intern', 'Associate (Advocate)', 'Senior Associate', 'Counsel', 'Partner', 'Senior Partner', 'Managing Partner'),
    academic('Guest Faculty', 'Assistant Professor (contract)', 'Assistant Professor', 'Associate Professor', 'Professor', 'Professor (Higher Academic Grade)', 'Head of Department', 'Dean', 'Pro-Vice-Chancellor', 'Vice-Chancellor')),
  ES: country(
    med('MIR (médico interno residente)', 'MIR (último año)', 'Facultativo especialista de área (FEA)', 'Jefe de sección', 'Catedrático (clínico)', 'Jefe de servicio', 'Director médico'),
    law('Pasante (máster de acceso)', 'Abogado asociado', 'Asociado sénior', 'Counsel', 'Socio', 'Socio de cuota', 'Socio director'),
    academic('Profesor asociado', 'Ayudante doctor', 'Profesor ayudante doctor', 'Profesor titular', 'Catedrático', 'Catedrático (distinguido)', 'Director de departamento', 'Decano', 'Vicerrector', 'Rector')),
  NL: country(
    med('AIOS (arts in opleiding tot specialist)', 'AIOS (laatste jaar)', 'Medisch specialist', 'Medisch specialist (opleider)', 'Hoogleraar', 'Vakgroepvoorzitter', 'Medisch directeur'),
    law('Advocaat-stagiaire', 'Advocaat (medewerker)', 'Senior medewerker', 'Counsel', 'Partner', 'Equity partner', 'Managing partner'),
    academic('Gastdocent', 'Docent', 'Universitair docent (UD)', 'Universitair hoofddocent (UHD)', 'Hoogleraar', 'Universiteitshoogleraar', 'Afdelingsvoorzitter', 'Decaan', 'Rector magnificus', 'Voorzitter college van bestuur')),
  SE: country(
    med('ST-läkare', 'ST-läkare (sista året)', 'Specialistläkare', 'Överläkare', 'Professor och överläkare', 'Verksamhetschef', 'Chefläkare'),
    law('Biträdande jurist', 'Advokat (associate)', 'Senior associate', 'Counsel', 'Delägare', 'Senior delägare', 'Managing partner'),
    academic('Timlärare', 'Adjunkt', 'Biträdande lektor', 'Universitetslektor (docent)', 'Professor', 'Professor (särskilt framstående)', 'Prefekt', 'Dekan', 'Prorektor', 'Rektor')),
  BR: country(
    med('Médico residente', 'Preceptor (R3)', 'Médico assistente', 'Médico assistente sênior', 'Professor titular', 'Chefe de serviço', 'Diretor clínico'),
    law('Estagiário de direito', 'Advogado associado', 'Advogado sênior', 'Consultor', 'Sócio', 'Sócio sênior', 'Sócio-diretor'),
    academic('Professor substituto', 'Professor auxiliar', 'Professor adjunto', 'Professor associado', 'Professor titular', 'Professor titular (emérito)', 'Chefe de departamento', 'Diretor de unidade', 'Pró-reitor', 'Reitor')),
  SG: country(
    med('Resident', 'Senior Resident', 'Associate Consultant', 'Consultant', 'Senior Consultant', 'Head of Department', 'Chairman, Medical Board'),
    law('Practice Trainee', 'Associate', 'Senior Associate', 'Counsel', 'Partner', 'Equity Partner', 'Managing Partner'),
    academic('Adjunct Lecturer', 'Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor', 'Provost\'s Chair Professor', 'Head of Department', 'Dean', 'Provost', 'President')),
  IL: country(
    med('Mitmahe (resident)', 'Senior Resident', 'Mumhe (specialist)', 'Rofe bakhir (senior physician)', 'Professor of Medicine', 'Menahel makhlaka (department head)', 'Menahel beit holim (hospital director)'),
    law('Mitmahe (legal intern)', 'Orekh din (associate)', 'Senior Associate', 'Of Counsel', 'Partner', 'Senior Partner', 'Managing Partner'),
    academic('Adjunct Lecturer', 'Martze (lecturer)', 'Martze bakhir (senior lecturer)', 'Professor haver (associate professor)', 'Professor min hamenyan (full professor)', 'Distinguished Professor', 'Department Head', 'Dean', 'Rector', 'President')),
  CN: country(
    med('Zhùyuàn yīshī (resident)', 'Zǒng zhùyuàn (chief resident)', 'Zhǔzhì yīshī (attending physician)', 'Fù zhǔrèn yīshī (associate chief physician)', 'Zhǔrèn yīshī (chief physician)', 'Kē zhǔrèn (department director)', 'Yuànzhǎng (hospital president)'),
    law('Shíxí lǜshī (trainee lawyer)', 'Lǜshī (associate)', 'Senior Lawyer', 'Gùwèn (counsel)', 'Héhuǒrén (partner)', 'Senior Partner', 'Zhǔrèn (managing partner)'),
    academic('Part-time Lecturer', 'Zhùjiào (assistant lecturer)', 'Jiǎngshī (lecturer)', 'Fù jiàoshòu (associate professor)', 'Jiàoshòu (professor)', 'Chángjiāng Scholar Professor', 'Xì zhǔrèn (department head)', 'Yuànzhǎng (dean)', 'Fù xiàozhǎng (vice-president)', 'Xiàozhǎng (president)')),
  NG: country(
    med('Resident Doctor (Registrar)', 'Senior Registrar', 'Consultant', 'Senior Consultant', 'Professor & Consultant', 'Head of Department', 'Chief Medical Director'),
    law('Law School Pupil', 'Associate (Barrister & Solicitor)', 'Senior Associate', 'Counsel', 'Partner', 'Senior Partner', 'Managing Partner'),
    academic('Graduate Assistant', 'Assistant Lecturer', 'Lecturer I', 'Senior Lecturer', 'Reader (Associate Professor)', 'Professor', 'Head of Department', 'Dean', 'Deputy Vice-Chancellor', 'Vice-Chancellor')),
  KE: country(
    med('Registrar (MMed)', 'Senior Registrar', 'Consultant', 'Senior Consultant', 'Professor & Consultant', 'Head of Department', 'Hospital Chief Executive'),
    law('Pupil', 'Advocate (Associate)', 'Senior Associate', 'Counsel', 'Partner', 'Senior Partner', 'Managing Partner'),
    academic('Part-time Lecturer', 'Tutorial Fellow', 'Lecturer', 'Senior Lecturer', 'Associate Professor', 'Professor', 'Chair of Department', 'Dean', 'Deputy Vice-Chancellor', 'Vice-Chancellor')),
  ZA: country(
    med('Registrar', 'Senior Registrar', 'Specialist', 'Principal Specialist', 'Chief Specialist & Professor', 'Head of Clinical Unit', 'Clinical Manager'),
    law('Candidate Attorney', 'Associate', 'Senior Associate', 'Counsel', 'Director', 'Senior Director', 'Chairperson'),
    academic('Part-time Lecturer', 'Junior Lecturer', 'Lecturer', 'Senior Lecturer', 'Associate Professor', 'Professor', 'Head of School', 'Executive Dean', 'Deputy Vice-Chancellor', 'Vice-Chancellor')),
  ID: country(
    med('PPDS (residen)', 'Chief residen', 'Dokter spesialis', 'Dokter spesialis senior', 'Guru Besar (profesor)', 'Kepala SMF', 'Direktur utama rumah sakit'),
    law('Calon advokat (magang)', 'Advokat (associate)', 'Senior associate', 'Counsel', 'Partner', 'Senior partner', 'Managing partner'),
    academic('Dosen luar biasa', 'Asisten ahli', 'Lektor', 'Lektor kepala', 'Guru Besar (profesor)', 'Guru Besar (distinguished)', 'Ketua departemen', 'Dekan', 'Wakil rektor', 'Rektor')),
  PS: country(
    med('Resident', 'Chief Resident', 'Specialist', 'Consultant', 'Senior Consultant', 'Head of Department', 'Hospital Director'),
    law('Trainee Lawyer (mutadarrib)', 'Lawyer (muhami)', 'Senior Lawyer', 'Counsel', 'Partner', 'Senior Partner', 'Managing Partner'),
    academic('Part-time Lecturer', 'Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor', 'Distinguished Professor', 'Department Head', 'Dean', 'Vice President for Academic Affairs', 'University President')),
};
fromPacks(PROFESSION_TITLES, 'PROFESSION_TITLES');

const sys = (foundation, foundationTitle, allocation, kind, comp, training) => ({ foundation, foundationTitle, allocation: { name: allocation, kind, comp }, training });

/** How each country trains its doctors after the degree. */
export const MEDICAL_SYSTEMS = {
  US: sys(0, null, 'the Match', 'match', 1, 1),
  CA: sys(0, null, 'the CaRMS match', 'match', 1, 1.1),
  GB: sys(2, 'Foundation Doctor (FY1–FY2)', 'national specialty recruitment', 'application', 0.9, 1.5),
  IE: sys(1, 'Intern', 'specialist training scheme selection', 'application', 0.9, 1.4),
  AU: sys(2, 'Intern / Resident Medical Officer', 'specialist college training selection', 'application', 0.85, 1.4),
  NZ: sys(2, 'House Officer (PGY1–2)', 'vocational training selection', 'application', 0.85, 1.4),
  DE: sys(0, null, 'applying for a Weiterbildungsstelle at a hospital', 'application', 0.45, 1.4),
  FR: sys(0, null, 'choosing a specialty by your EDN rank', 'ranking', 1, 1.1),
  IT: sys(0, null, 'the national SSM specialty exam', 'ranking', 1, 1.2),
  ES: sys(0, null, 'the national MIR exam', 'ranking', 1, 1.2),
  JP: sys(2, 'Kenshūi (initial clinical trainee)', 'applying to senkōi programs', 'application', 0.6, 1.1),
  KR: sys(1, 'Intern', 'resident selection', 'application', 0.9, 1.2),
  MX: sys(1, 'Médico pasante (servicio social)', 'the ENARM national exam', 'ranking', 1.1, 1.2),
  PH: sys(1, 'Post-graduate Intern', 'residency applications', 'application', 0.7, 1.1),
  IN: sys(0, null, 'NEET-PG counselling', 'ranking', 1.15, 1),
  NL: sys(1, 'ANIOS (arts niet in opleiding)', 'applying for an opleidingsplaats', 'application', 1, 1.4),
  SE: sys(2, 'AT-/BT-läkare', 'applying for an ST post', 'application', 0.6, 1.4),
  BR: sys(0, null, 'the residency entrance exam', 'ranking', 1, 1.1),
  SG: sys(1, 'House Officer (PGY1)', 'the MOHH residency match', 'match', 1, 1.2),
  IL: sys(1, 'Stazher (intern)', 'residency applications', 'application', 0.7, 1.3),
  CN: sys(0, null, 'standardized residency recruitment', 'application', 0.8, 1.1),
  NG: sys(2, 'House Officer, then NYSC', 'residency entry (the Primaries)', 'ranking', 0.9, 1.3),
  KE: sys(1, 'Medical Intern', 'MMed programme admission', 'application', 0.8, 1.2),
  ZA: sys(3, 'Intern, then Community Service Medical Officer', 'applying for a registrar post', 'application', 0.8, 1.3),
  ID: sys(1, 'Dokter internsip', 'the PPDS entrance selection', 'ranking', 1, 1.2),
  PS: sys(1, 'Intern (imtiyaz year)', 'Palestinian Medical Council residency', 'application', 0.8, 1.2),
};
fromPacks(MEDICAL_SYSTEMS, 'MEDICAL_SYSTEMS');
export const medicalSystem = (cc) => MEDICAL_SYSTEMS[cc ?? 'US'] ?? MEDICAL_SYSTEMS.US;

/** How each country's lawyers qualify, and whether there's a separate bar of advocates. */
export const LAW_SYSTEMS = {
  US: { split: false, silk: null, training: null },
  CA: { split: false, silk: 'King\'s Counsel', training: 'articling' },
  GB: { split: true, advocate: 'Barrister', chambers: 'chambers', pupil: 'Pupil barrister', silk: 'King\'s Counsel (KC)', training: 'a two-year training contract and the SQE' },
  IE: { split: true, advocate: 'Barrister', chambers: 'the Law Library', pupil: 'Devil (pupil barrister)', silk: 'Senior Counsel (SC)', training: 'the PPC at the Law Society' },
  AU: { split: true, advocate: 'Barrister', chambers: 'chambers', pupil: 'Reader (pupil barrister)', silk: 'Senior Counsel (SC)', training: 'practical legal training' },
  NZ: { split: true, advocate: 'Barrister sole', chambers: 'chambers', pupil: 'Junior barrister', silk: 'King\'s Counsel (KC)', training: 'Profs (professional legal studies)' },
  IN: { split: true, advocate: 'Advocate', chambers: 'chambers', pupil: 'Junior advocate', silk: 'Senior Advocate', training: 'the All India Bar Examination' },
  NG: { split: false, silk: 'Senior Advocate of Nigeria (SAN)', training: 'the Nigerian Law School and call to the bar' },
  KE: { split: false, silk: 'Senior Counsel (SC)', training: 'Kenya School of Law and pupillage' },
  ZA: { split: true, advocate: 'Advocate', chambers: 'the Bar', pupil: 'Pupil advocate', silk: 'Senior Counsel (SC)', training: 'articles of clerkship' },
  SG: { split: false, silk: 'Senior Counsel (SC)', training: 'the Part B course and a practice training period' },
  DE: { split: false, silk: null, training: 'the two-year Referendariat and the Second State Exam' },
  FR: { split: false, silk: null, training: 'the CRFPA and eighteen months at the EFB' },
  IT: { split: false, silk: null, training: 'eighteen months of pratica forense' },
  JP: { split: false, silk: null, training: 'a year at the Legal Training and Research Institute' },
  KR: { split: false, silk: null, training: 'law school and six months of practice training' },
  ES: { split: false, silk: null, training: 'the máster de acceso and the state exam' },
};
fromPacks(LAW_SYSTEMS, 'LAW_SYSTEMS');
export const lawSystem = (cc) => LAW_SYSTEMS[cc ?? 'US'] ?? { split: false, silk: null, training: null };

/**
 * Getting a permanent academic post: the US tenure review after six years; a British lecturer's
 * three-year probation; Germany's tenure-track evaluation from W1 to W2; France's one-year
 * stage before titularisation as a civil servant; Italy's three-year RTD-B contract.
 */
export const ACADEMIC_SYSTEMS = {
  US: { review: 'tenure review', clock: 6, permanent: 'with tenure' },
  CA: { review: 'tenure review', clock: 6, permanent: 'with tenure' },
  GB: { review: 'probation review', clock: 3, permanent: 'on a permanent contract' },
  IE: { review: 'probation review', clock: 3, permanent: 'on a permanent contract' },
  AU: { review: 'confirmation of appointment', clock: 3, permanent: 'on a continuing appointment' },
  NZ: { review: 'confirmation path review', clock: 4, permanent: 'on a permanent appointment' },
  DE: { review: 'tenure-track evaluation', clock: 6, permanent: 'as a civil servant for life (Beamter auf Lebenszeit)' },
  FR: { review: 'titularisation', clock: 1, permanent: 'as a tenured civil servant (titulaire)' },
  IT: { review: 'RTD-B evaluation for associate professor', clock: 3, permanent: 'with a permanent chair' },
  ES: { review: 'ANECA accreditation', clock: 5, permanent: 'as a civil servant (funcionario)' },
  NL: { review: 'tenure-track evaluation', clock: 5, permanent: 'with a permanent contract' },
  SE: { review: 'promotion review (biträdande lektor to lektor)', clock: 4, permanent: 'on a permanent contract' },
  JP: { review: 'tenure-track review', clock: 5, permanent: 'with tenure (muki koyō)' },
  KR: { review: 'tenure review (jeongnyeon bojang)', clock: 6, permanent: 'with tenure' },
  CN: { review: 'up-or-out review', clock: 6, permanent: 'with a permanent post' },
  IN: { review: 'probation confirmation', clock: 2, permanent: 'on a permanent post' },
};
fromPacks(ACADEMIC_SYSTEMS, 'ACADEMIC_SYSTEMS');
export const academicSystem = (cc) => ACADEMIC_SYSTEMS[cc ?? 'US'] ?? { review: 'tenure review', clock: 6, permanent: 'with tenure' };
