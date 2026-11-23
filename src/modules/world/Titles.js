/**
 * Titles of profession, learning and rank, as each country uses them.
 *
 *   Learning     a doctorate makes you Dr (and in Germany and Austria part of your name: Dr.,
 *                Prof. Dr.); Austria writes Mag. and Dipl.-Ing.; in Italy any graduate is Dott. /
 *                Dott.ssa; in Mexico a graduate is Lic.; professors are Prof., in Britain only
 *                a full professor.
 *   Profession   physicians are Dr everywhere they are (Dott. in Italy, Dra. in Spain); a lawyer is
 *                Avv. in Italy, Maître in France, Adv. in India, Lic. in Mexico, Dr. by courtesy in
 *                Brazil, and an American attorney writes Esq.; an engineer is Ing. (Italy, Spain,
 *                Latin America), Dipl.-Ing. (Germany, Austria), Eng. (Portugal), Er. (India); an
 *                architect Arch. or Arq.; a ship's master or an airline captain is Captain.
 *   Rank         serving officers and other ranks go by their rank; a police officer by theirs.
 *                Retired officers keep theirs: Colonel (Ret.) in America, Oberst a. D. in Germany.
 *   Spoken       how people address you: Herr Doktor, Dottoressa, Maître, Licenciado, Tanaka-sensei.
 *   Restraint    Scandinavians use almost none of this; and a knight drops Dr (Sir John Smith).
 *
 * Integrated into Honours.styledName; Titles.addressOf gives the spoken form.
 */
import { yearNow, periodTitle } from './Eras.js';
import { rankOf } from '../military/MilitaryEngine.js';

const GERMANIC = ['DE', 'AT', 'CH', 'LI'];
const IBERO = ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'BO', 'UY', 'PY', 'CR', 'PA', 'GT', 'HN', 'SV', 'NI', 'DO', 'CU'];
const LUSO = ['PT', 'BR'];
const FRENCH = ['FR', 'BE', 'LU', 'MC', 'SN', 'CI'];
const NORDIC = ['SE', 'NO', 'DK', 'FI', 'IS'];
const SOUTH_ASIA = ['IN', 'PK', 'BD', 'LK', 'NP'];
const ENG_PROF = /^(engineering|mechanicalEng|electricalEng|chemicalEng|aerospaceEng|petroleumEng|nuclearEng|structuralEng)$/;

const cc = (state) => state.character.countryId ?? 'US';
const fem = (state) => state.character.gender === 'female';
const degrees = (state) => (state.education?.degrees ?? []).map((d) => d.type);
const jobs = (state) => [state.career?.job, ...(state.career?.history ?? [])].filter(Boolean);
const now = (state) => state.career?.job ?? null;
const did = (state, re, test = () => true) => jobs(state).some((j) => re.test(j.professionId ?? '') && test(j));
const titleOf = (j) => j?.title ?? '';

/** What you are, for the purpose of a title. */
export function credentials(state) {
  const d = degrees(state);
  const job = now(state);
  return {
    doctorate: d.some((t) => ['phd', 'doctorate', 'dphil', 'edd'].includes(t)),
    md: d.includes('md') || d.includes('do'),
    jd: d.includes('jd'),
    master: d.some((t) => /^(master|mba|ms|ma|msc|mpa|mph|llm)$/.test(t)),
    graduate: d.some((t) => !['highschool', 'ged', 'associate', 'certificate', 'diploma'].includes(t)),
    physician: did(state, /^(medical|dentistry)$/) || did(state, /^veterinary$/, (j) => /Veterinarian|Veterinary (Officer|Specialist)|Medical Director/.test(titleOf(j)) || (j.peakGrade ?? j.grade ?? 0) >= 2),
    lawyer: did(state, /^(law|prosecution)$/, (j) => (j.peakGrade ?? j.grade ?? 0) >= 1),
    engineer: did(state, ENG_PROF, (j) => (j.peakGrade ?? j.grade ?? 0) >= 0),
    architect: did(state, /^architecture$/, (j) => (j.peakGrade ?? j.grade ?? 0) >= 1),
    professor: /Professor|Dean|Provost|University President/.test(titleOf(job)) && /^(university|maritimeFaculty)$/.test(job?.professionId ?? ''),
    fullProfessor: /^(Professor|Distinguished Professor)$|Dean|Provost|University President/.test(titleOf(job)) && job?.professionId === 'university',
    teacher: job?.professionId === 'education' && (job.grade ?? 0) >= 1,
    captain: /Master \(Ship's Captain\)|Port Captain/.test(titleOf(job)) || (job?.professionId === 'aviation' && /Captain|Chief Pilot/.test(titleOf(job))),
    police: job?.professionId === 'police' && /Sergeant|Lieutenant|Captain|Inspector|Superintendent|Chief|Commissioner|Commander/.test(titleOf(job)) ? periodTitle(titleOf(job), state.character.gender) : null,
  };
}

/** Rank to go by: serving, or retired as an officer (or a senior NCO in America). */
function militaryRank(state) {
  const svc = state.military?.service;
  if (svc) {
    const r = rankOf(svc).title.replace(/^Acting /, '');
    return { rank: r, retired: false };
  }
  // America: anyone retired from the forces. Elsewhere, by custom only officers of major (or its equal) and above.
  const us = cc(state) === 'US';
  const last = [...(state.military?.history ?? [])].reverse().find((h) => (us ? h.discharge === 'retired' : h.track !== 'enlisted' && (h.grade ?? 0) >= 3 && ['honorable', 'retired', 'medical'].includes(h.discharge)));
  if (!last?.rankTitle) return null;
  if (last.track === 'enlisted' && !(cc(state) === 'US' && last.discharge === 'retired')) return null;
  return { rank: last.rankTitle.replace(/^Acting /, ''), retired: true };
}
const RETIRED = (country) => (country === 'US' ? ' (Ret.)' : GERMANIC.includes(country) ? ' a. D.' : ['GB', 'IE', 'AU', 'NZ', 'CA', 'IN'].includes(country) ? '' : ' (retd)');

/**
 * Your title: { prefix, suffix, address, why } (any may be null). `knight`: you are Sir/Dame, so Dr is dropped.
 */
export function professionalTitle(state, { knight = false } = {}) {
  const c = cc(state);
  const f = fem(state);
  const k = credentials(state);
  const y = yearNow(state);
  const last = state.character.lastName;
  // Rank first: in uniform you are your rank.
  const mil = militaryRank(state);
  // In German usage the retirement goes with the rank: Oberst a. D. Lukas Becker.
  if (mil) return GERMANIC.includes(c) && mil.retired ? { prefix: `${mil.rank} a. D.`, suffix: null, address: mil.rank, why: 'your rank, kept in retirement' } : { prefix: mil.rank, suffix: mil.retired ? RETIRED(c) : null, address: mil.rank, why: mil.retired ? 'your rank, kept in retirement' : 'your rank' };
  if (k.police) return { prefix: k.police, suffix: null, address: k.police, why: 'your rank in the police' };
  if (NORDIC.includes(c)) {
    // Scandinavians drop titles in daily life; a professor stays a professor.
    if (k.professor) return { prefix: 'Professor', suffix: null, address: null, why: 'your chair' };
    return null;
  }
  const doc = k.doctorate || k.md;
  if (GERMANIC.includes(c)) {
    const dr = doc || (k.physician && y >= 1900) ? (k.doctorate && k.md ? 'DDr.' : 'Dr.') : null;
    const prof = k.professor ? 'Prof.' : null;
    const austria = c === 'AT';
    const lesser = !dr && !prof ? (k.engineer && (k.master || k.graduate) ? 'Dipl.-Ing.' : austria && k.engineer ? 'Ing.' : austria && k.master ? (f ? 'Mag.a' : 'Mag.') : null) : null;
    const prefix = [prof, dr, lesser].filter(Boolean).join(' ') || null;
    if (!prefix) return null;
    // Austrians say the lesser titles aloud too: Herr Diplomingenieur, Frau Magistra.
    const spoken = prof ? 'Professor' : dr ? 'Doktor' : !austria ? null : lesser === 'Dipl.-Ing.' ? (f ? 'Diplomingenieurin' : 'Diplomingenieur') : lesser === 'Ing.' ? (f ? 'Ingenieurin' : 'Ingenieur') : lesser ? (f ? 'Magistra' : 'Magister') : null;
    return { prefix, suffix: null, address: spoken ? `${f ? 'Frau' : 'Herr'} ${spoken}${austria ? '' : ` ${last}`}` : null, why: prof ? 'your chair' : dr ? 'your doctorate' : 'your degree' };
  }
  if (c === 'IT') {
    const pick = k.professor || k.teacher ? [f ? 'Prof.ssa' : 'Prof.', f ? 'Professoressa' : 'Professore', k.professor ? 'your chair' : 'teaching'] : k.lawyer ? ['Avv.', 'Avvocato', 'the bar'] : k.engineer ? ['Ing.', 'Ingegnere', 'engineering'] : k.architect ? ['Arch.', 'Architetto', 'architecture'] : k.physician || doc || k.graduate ? [f ? 'Dott.ssa' : 'Dott.', f ? 'Dottoressa' : 'Dottore', k.physician ? 'medicine' : 'your laurea'] : null;
    return pick ? { prefix: pick[0], suffix: null, address: pick[1], why: pick[2] } : null;
  }
  if (IBERO.includes(c)) {
    const mx = c !== 'ES';
    const pick = k.physician || doc ? [f ? 'Dra.' : 'Dr.', f ? 'Doctora' : 'Doctor', k.physician ? 'medicine' : 'your doctorate']
      : k.engineer ? ['Ing.', f ? 'Ingeniera' : 'Ingeniero', 'engineering']
        : k.architect ? ['Arq.', f ? 'Arquitecta' : 'Arquitecto', 'architecture']
          : k.professor ? ['Prof.', f ? 'Profesora' : 'Profesor', 'your chair']
            : mx && (k.lawyer || k.graduate) ? [f ? 'Lic.' : 'Lic.', f ? 'Licenciada' : 'Licenciado', k.lawyer ? 'the law' : 'your licenciatura']
              : mx && k.teacher ? [null, f ? 'Maestra' : 'Maestro', 'teaching'] : null;
    return pick ? { prefix: pick[0], suffix: null, address: pick[1], why: pick[2] } : null;
  }
  if (LUSO.includes(c)) {
    const br = c === 'BR';
    const pick = k.physician || doc || (br && k.lawyer) ? [f ? 'Dra.' : 'Dr.', f ? 'Doutora' : 'Doutor', k.lawyer && !k.physician ? 'the law' : 'medicine'] : k.engineer ? [f ? 'Eng.ª' : 'Eng.', f ? 'Engenheira' : 'Engenheiro', 'engineering'] : k.architect ? ['Arq.', f ? 'Arquiteta' : 'Arquiteto', 'architecture'] : k.professor ? ['Prof.', f ? 'Professora' : 'Professor', 'your chair'] : null;
    return pick ? { prefix: pick[0], suffix: null, address: pick[1], why: pick[2] } : null;
  }
  if (FRENCH.includes(c)) {
    if (k.professor) return { prefix: 'Pr', suffix: null, address: f ? 'Madame la Professeure' : 'Monsieur le Professeur', why: 'your chair' };
    if (k.physician) return { prefix: 'Dr', suffix: null, address: 'Docteur', why: 'medicine' };
    if (k.lawyer) return { prefix: 'Me', suffix: null, address: 'Maître', why: 'the bar' };
    if (doc) return { prefix: 'Dr', suffix: null, address: null, why: 'your doctorate' };
    return null;
  }
  if (c === 'JP' || c === 'KR') {
    // Written plainly; spoken with the honorific for teachers, doctors, lawyers and the elected.
    const sensei = k.physician || k.teacher || k.professor || k.lawyer || Boolean(state.politics?.office);
    return sensei ? { prefix: null, suffix: null, address: c === 'JP' ? `${last}-sensei` : `${last} seonsaengnim`, why: k.physician ? 'medicine' : k.teacher || k.professor ? 'teaching' : k.lawyer ? 'the law' : 'office' } : null;
  }
  // Britain, America, the Commonwealth and everywhere else.
  const us = c === 'US';
  const britishProf = ['GB', 'IE', 'AU', 'NZ'].includes(c) ? k.fullProfessor : k.professor;
  if (britishProf) return { prefix: 'Professor', suffix: null, address: `Professor ${last}`, why: 'your chair' };
  if (k.captain) return { prefix: 'Captain', suffix: null, address: 'Captain', why: /aviation/.test(now(state)?.professionId ?? '') ? 'command of an airliner' : 'command of a ship' };
  if ((k.physician || doc) && !knight) return { prefix: us ? 'Dr.' : 'Dr', suffix: null, address: `Doctor ${last}`, why: k.physician ? 'medicine' : 'your doctorate' };
  if (SOUTH_ASIA.includes(c)) {
    if (k.lawyer) return { prefix: 'Adv.', suffix: null, address: null, why: 'the bar' };
    if (k.engineer) return { prefix: 'Er.', suffix: null, address: null, why: 'engineering' };
  }
  if (us && k.lawyer && y >= 1850) return { prefix: null, suffix: ', Esq.', address: null, why: 'the bar' };
  return null;
}

/** How people address you, when it differs from your written name. */
export function addressOf(state) {
  const p = state.character.style?.prefix;
  // A knight or dame is Sir John, Dame Olivia, whatever else they are (a serving officer keeps the rank).
  if (/^(Sir|Dame)$/.test(p ?? '') && !state.military?.service) return `${p} ${state.character.firstName}`;
  return professionalTitle(state)?.address ?? null;
}

/** Put the title on a name: "Prof. Dr. Anna Weber", "Colonel John Smith (Ret.)", "General Sir John Smith". */
export function withTitle(state, name, { knight = false } = {}) {
  const t = professionalTitle(state, { knight });
  if (!t) return name;
  return `${t.prefix ? `${t.prefix} ` : ''}${name}${t.suffix ?? ''}`;
}

export const TitlesModule = {
  id: 'titles',
  order: 97,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (state.character.age < 18) return;
    const t = professionalTitle(state);
    const key = t ? `${t.prefix ?? ''}|${t.suffix ?? ''}|${t.address ?? ''}` : '';
    const was = state.flags?.titleKey ?? '';
    if (key === was) return;
    state.flags.titleKey = key;
    if (!t) return;
    const how = t.prefix ? `${t.prefix.trim()} ${state.character.firstName} ${state.character.lastName}${t.suffix ?? ''}` : `${state.character.firstName} ${state.character.lastName}${t.suffix ?? ''}`;
    ctx.log(`${t.address && t.address !== t.prefix ? `People call you "${t.address}" now` : 'You have a new title'}: ${how}, for ${t.why}.`, '🎓', 'milestone');
  },
};
