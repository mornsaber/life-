/**
 * Medicine, as the services would write it: the courses a doctor's promotion waits on, the
 * missions and rural years, the college fellowships and prizes, the medical council's
 * discipline, and the posts at the top of the profession. Run by career/Vocations.js; the
 * Match, fellowships, practice types and malpractice stay in career/Medicine.js.
 *
 * Dated throughout: no ACLS before 1974, no Médecins Sans Frontières before 1971, no Lasker
 * Award before 1945, the General Medical Council from 1858, a Red Cross field hospital from 1864.
 */
import { yearNow } from '../../world/Eras.js';
import { crownOf } from '../../world/Crown.js';

const SURGICAL = ['generalSurgery', 'orthopedics', 'neurosurgery', 'plastics', 'ent', 'urology', 'obgyn', 'ophthalmology'];
const ACUTE = ['emergencyMedicine', 'internalMedicine', 'anesthesiology', 'familyMedicine', 'pediatrics', 'cardiology', 'pulmCrit', ...SURGICAL];
/** Doctors of the Royal Colleges: Britain and the realms, Ireland, India and the old colonies. */
const COLLEGES = ['GB', 'IE', 'AU', 'NZ', 'CA', 'IN', 'ZA', 'PK', 'MY', 'SG', 'HK', 'NG', 'GH', 'KE', 'JM', 'LK'];
const US_STYLE = ['US'];

const surgeon = (state) => SURGICAL.includes(state.medicine?.specialty);
const country = (state) => state.character.countryId ?? 'US';
const collegeName = (state) => (surgeon(state) ? 'the Royal College of Surgeons' : 'the Royal College of Physicians');

/** The country's medical association or college, by name. */
const ASSOCIATION = { US: 'the American Medical Association', GB: 'the British Medical Association', CA: 'the Canadian Medical Association', AU: 'the Australian Medical Association', FR: 'the Ordre national des médecins', DE: 'the Bundesärztekammer', IN: 'the Indian Medical Association', JP: 'the Japan Medical Association', IE: 'the Irish Medical Organisation', NZ: 'the New Zealand Medical Association' };
/** When each association was founded (its presidency exists from then). */
const ASSOCIATION_FROM = { US: 1847, GB: 1832, CA: 1867, AU: 1962, FR: 1945, DE: 1947, IN: 1928, JP: 1916, IE: 1936, NZ: 1886 };

export const MEDICINE = {
  id: 'medicine',
  name: 'Medicine',
  professions: ['medical'],
  licence: 'medicalLicense',
  erasureWord: 'struck you off the medical register',

  /** What you are within medicine: specialty, fellowship, the kind of practice. */
  traits(state) {
    const m = state.medicine ?? {};
    return [m.specialty, m.fellowship, m.practice, SURGICAL.includes(m.specialty) ? 'surgical' : 'medical', ACUTE.includes(m.specialty) || ACUTE.includes(m.fellowship) ? 'acute' : null].filter(Boolean);
  },
  /** Burnout, paid claims and private billing make complaints likelier. */
  risk(state) {
    const m = state.medicine ?? {};
    const claims = (m.claims ?? []).filter((c) => c.paid && state.character.age - c.age < 10).length;
    return (m.burnout ?? 20) / 2500 + claims * 0.012 + (m.practice === 'private' ? 0.006 : 0);
  },
  complaintOdds: 0.018,
  lawyerFee: 9000,

  courses: [
    { id: 'acls', name: 'Advanced Cardiac Life Support (ACLS)', icon: '🫀', from: 1974, traits: ['acute'], cost: 350, renew: 2, required: ['attending', 'senior'] },
    { id: 'atls', name: 'Advanced Trauma Life Support (ATLS)', icon: '🚑', from: 1978, traits: ['surgical', 'emergencyMedicine'], cost: 900, renew: 4, required: ['attending', 'senior'] },
    { id: 'pals', name: 'Pediatric Advanced Life Support (PALS)', icon: '🧸', from: 1988, traits: ['pediatrics', 'emergencyMedicine', 'familyMedicine'], cost: 300, renew: 2, required: ['attending'] },
    { id: 'membership', name: (s) => (surgeon(s) ? 'Membership of the Royal College of Surgeons (MRCS)' : 'Membership of the Royal College of Physicians (MRCP)'), icon: '📜', countries: COLLEGES, minGrade: 4, cost: 2500, passRate: 0.55, required: ['attending'], post: null },
    { id: 'fellowship', name: (s) => (surgeon(s) ? 'Fellowship of the Royal College of Surgeons (FRCS)' : 'Fellowship of the Royal College of Physicians (FRCP)'), icon: '🎓', countries: COLLEGES, minGrade: 7, minYears: 8, cost: 3000, passRate: 0.7, required: ['senior', 'renowned', 'head'] },
    { id: 'tropical', name: (s) => (yearNow(s) < 1920 ? 'the course of the London School of Tropical Medicine' : 'a Diploma in Tropical Medicine & Hygiene'), icon: '🦟', from: 1899, minGrade: 4, cost: 4000, years: 0, stress: 4 },
    { id: 'publicHealth', name: (s) => (yearNow(s) < 1960 ? 'a Diploma in Public Health' : 'a Master of Public Health'), icon: '📊', from: 1916, minGrade: 6, cost: 30000, years: 1, required: ['cmo'] },
    { id: 'leadership', name: (s) => (yearNow(s) < 1990 ? 'a hospital administration course' : 'a physician leadership programme'), icon: '🧭', from: 1950, minGrade: 7, cost: 12000, required: ['head', 'viceChair', 'chief', 'cmo'] },
    { id: 'research', name: 'a clinical research methods course', icon: '🔬', from: 1960, traits: ['academic'], minGrade: 4, cost: 5000 },
  ],

  postingOdds: 0.1,
  postings: [
    { id: 'msf', name: 'A Mission with Médecins Sans Frontières', icon: '⛑️', from: 1971, minGrade: 5, years: 1, places: ['SS', 'CD', 'AF', 'YE', 'HT', 'SO', 'CF', 'SY', 'SL', 'LR'], stress: 10, happiness: 6,
      text: 'MSF is short of doctors for a field hospital: trauma, cholera, births by headlamp. Nine to twelve months.', hint: 'Hard, unforgettable · counts toward humanitarian awards',
      end: (s, place) => `You came home from the MSF mission. The quiet of a hospital with power and drugs felt strange for weeks.` },
    { id: 'redCross', name: 'A Red Cross Field Hospital', icon: '➕', from: 1864, until: 1971, minGrade: 4, years: 1, places: ['FR', 'BE', 'IT', 'RS', 'GR', 'TR', 'ET', 'KR', 'DZ'], stress: 10, happiness: 5,
      text: 'The Red Cross is raising a volunteer field hospital for the wounded of a war abroad.', hint: 'Ambulance work behind the lines',
      end: () => 'You came home from the field hospital, with the Red Cross\'s thanks and hands that knew far more surgery than before.' },
    { id: 'rural', name: (s) => (yearNow(s) < 1950 ? 'A Country Practice' : 'A Rural Practice Year'), icon: '🌾', minGrade: 5, years: 1, happiness: 4, stress: 2, performance: 4,
      text: 'A small town has had no doctor since the last one retired. The council will house you for a year.', hint: 'Everything from births to broken legs',
      end: () => 'Your year as the town\'s doctor ended. They held a dinner for you in the church hall.' },
    { id: 'visiting', name: 'A Visiting Professorship Abroad', icon: '🎓', from: 1900, minGrade: 8, years: 1, places: ['GB', 'US', 'DE', 'FR', 'SE', 'CH', 'CA', 'AU', 'JP'], traits: ['academic'], happiness: 5, stress: 2,
      text: 'A famous teaching hospital abroad invites you as visiting professor: grand rounds, lectures, a research collaboration.', hint: 'Prestige; a year abroad',
      end: () => 'Your visiting chair ended with a lecture to a full theatre and an invitation to come back.' },
    { id: 'expedition', name: 'An Expedition Doctor', icon: '🏔️', from: 1901, minGrade: 4, years: 1, once: true, stress: 6, happiness: 7,
      text: (s) => (yearNow(s) < 1950 ? 'A polar expedition needs a ship\'s surgeon who can winter in the ice.' : 'A Himalayan expedition needs a doctor at base camp, and above it.'), hint: 'Once in a lifetime',
      end: () => 'You came back from the expedition thinner, with frostbitten stories and a photograph you\'ll keep on your desk.' },
    { id: 'teamDoctor', name: 'Team Doctor', icon: '⚽', from: 1900, minGrade: 6, years: 2, traits: ['sportsMed', 'orthopedics', 'emergencyMedicine', 'familyMedicine', 'pmr'], happiness: 5,
      text: 'A professional club wants you as its team doctor: match days on the bench, injuries in the dressing room.', hint: 'Alongside your practice' },
  ],

  awards: [
    { id: 'teacher', name: 'Teacher of the Year award', icon: '🍎', minGrade: 7, minYears: 6, minPerformance: 75, chance: 0.05, prestige: 1, text: 'The residents voted you Teacher of the Year.' },
    { id: 'humanitarian', name: 'a humanitarian service award', icon: '🕊️', posting: 'msf', chance: 0.3, prestige: 2, text: 'Your medical association honoured your work with MSF.' },
    { id: 'redCrossMedal', name: 'the Red Cross Medal', icon: '➕', posting: 'redCross', chance: 0.4, prestige: 2, text: 'The Red Cross awarded you its medal for service with the field hospital.' },
    { id: 'facp', name: (s) => (surgeon(s) ? 'Fellowship of the American College of Surgeons (FACS)' : 'Fellowship of the American College of Physicians (FACP)'), icon: '🎓', countries: US_STYLE, from: 1915, minGrade: 7, minYears: 8, minPerformance: 60, chance: 0.25, prestige: 1, text: (s) => `You were elected a Fellow of the American College of ${surgeon(s) ? 'Surgeons' : 'Physicians'}.` },
    { id: 'lister', name: 'the Lister Medal', icon: '🏅', from: 1924, traits: ['surgical'], countries: COLLEGES, minGrade: 9, minYears: 20, minPerformance: 85, chance: 0.01, prestige: 6, text: 'The Royal College of Surgeons awarded you the Lister Medal, its highest honour.' },
    { id: 'lasker', name: 'the Lasker Award', icon: '🏆', from: 1945, traits: ['academic'], minGrade: 9, minYears: 15, minPerformance: 85, chance: 0.008, prestige: 7, text: 'You won the Lasker Award for clinical research: "America\'s Nobel".' },
    { id: 'nobel', name: 'the Nobel Prize in Physiology or Medicine', icon: '🏅', from: 1901, traits: ['academic'], minGrade: 9, minYears: 20, minPerformance: 90, chance: 0.002, prestige: 12, precedence: 10, text: 'The Karolinska Institute called at dawn: the Nobel Prize in Physiology or Medicine is yours.' },
  ],

  /** The body that disciplines doctors here, and from when. */
  regulator(state) {
    const c = country(state);
    if (c === 'US') return { name: 'the state medical board', from: 1880 };
    return ({ GB: { name: 'the General Medical Council', from: 1858 }, IE: { name: yearNow(state) < 1979 ? 'the General Medical Council' : 'the Medical Council', from: 1858 }, CA: { name: 'the College of Physicians and Surgeons', from: 1866 },
      AU: { name: 'the Medical Board', from: 1890 }, NZ: { name: 'the Medical Council', from: 1867 }, IN: { name: 'the Medical Council of India', from: 1934 }, FR: { name: 'the Ordre des médecins', from: 1945 },
      DE: { name: 'the Ärztekammer', from: 1887 }, JP: { name: 'the Medical Ethics Council', from: 1948 } })[c] ?? { name: 'the medical council', from: 1950 };
  },
  complaints: [
    { id: 'communication', short: 'how you spoke to a patient', severity: 0, weight: 5, founded: 0.5, text: 'A patient\'s family says you were curt and dismissive while their father was dying.' },
    { id: 'missed', short: 'a missed diagnosis', severity: 1, weight: 4, founded: 0.45, text: 'A patient you sent home was admitted two days later. The family blames you.' },
    { id: 'records', short: 'your notes', severity: 1, weight: 2, founded: 0.6, text: 'An audit found gaps in your notes on a patient who later complained.' },
    { id: 'prescribing', short: 'your prescribing', severity: 2, weight: (s) => 1 + (s.medicine?.burnout ?? 20) / 40, founded: 0.5, from: 1920, text: 'A pharmacist flagged your opioid prescriptions as far above your colleagues\'.' },
    { id: 'impairment', short: 'working while impaired', severity: 2, weight: (s) => (s.stats.stress > 75 ? 2 : 0.5), founded: 0.55, text: 'A nurse reported smelling alcohol on you during a night shift.' },
    { id: 'billing', short: 'billing', severity: 2, weight: (s) => (s.medicine?.practice === 'private' ? 2 : 0.3), founded: 0.5, from: 1966, text: 'An insurer reported a pattern of your claims as upcoded.' },
    { id: 'boundary', short: 'a boundary violation', severity: 3, weight: 0.3, founded: 0.4, text: 'A former patient alleges an improper relationship with you.' },
  ],

  eliteOdds: 0.06,
  elite: [
    { id: 'collegePresident', name: (s) => `President of ${collegeName(s)}`, icon: '🏛️', countries: COLLEGES, minGrade: 9, minYears: 22, minAwards: 1, years: 3, prestige: 6, stipend: 20000,
      text: (s) => `The fellows have elected you President of ${collegeName(s)}: three years at the head of your profession, with a seat on every committee that matters.` },
    { id: 'associationPresident', name: (s) => `President of ${ASSOCIATION[country(s)] ?? 'the national medical association'}`, icon: '🏛️', when: (s) => yearNow(s) >= (ASSOCIATION_FROM[country(s)] ?? 1950), minGrade: 9, minYears: 20, years: 1, prestige: 4, stipend: 15000,
      text: (s) => `${(ASSOCIATION[country(s)] ?? 'The national medical association').replace(/^the/, 'The')} has elected you its president for the coming year: speeches, ministers and the press.` },
    { id: 'royalPhysician', name: 'Physician to the Royal Household', icon: '👑', when: (s) => Boolean(crownOf(s)), minGrade: 9, minYears: 18, minAwards: 1, prestige: 7,
      text: 'The palace has asked you to join the Medical Household: on call to the royal family, discreet, unpaid, and for life.' },
    { id: 'olympicTeam', name: 'Chief Medical Officer of the Olympic team', icon: '🏅', from: 1896, traits: ['sportsMed', 'orthopedics', 'emergencyMedicine', 'pmr'], minGrade: 8, minYears: 12, years: 4, prestige: 3,
      text: 'The national Olympic committee asks you to lead the team\'s doctors at the next Games.' },
  ],
};
