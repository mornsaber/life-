/**
 * Pure campus helpers (no imports) shared by the campus module, education
 * (scholarships, GPA) and hiring (mentors, clubs, internships, résumé).
 */

export const CLUBS = {
  debate: { name: 'Debate Team', icon: '🎤', stat: 'smarts', fields: ['law', 'prosecution', 'publicDefender', 'legislativeStaff', 'courts'] },
  robotics: { name: 'Robotics Club', icon: '🤖', stat: 'smarts', fields: ['tech', 'engineering', 'aviation', 'publicWorks'] },
  newspaper: { name: 'Student Newspaper', icon: '📰', stat: 'smarts', fields: ['journalism', 'legislativeStaff'] },
  modelUN: { name: 'Model UN', icon: '🌐', stat: 'smarts', fields: ['foreignService', 'intelligence', 'regulatory'] },
  investing: { name: 'Investment Club', icon: '📈', stat: 'smarts', fields: ['finance', 'accounting', 'insurance', 'corporate'] },
  volunteer: { name: 'Volunteer Corps', icon: '🤲', stat: 'happiness', fields: ['socialWork', 'cps', 'ems', 'nursing', 'medical', 'education'] },
  theater: { name: 'Theater', icon: '🎭', stat: 'looks', fields: ['hospitality', 'retail', 'journalism'] },
};

export const RESIDENTIAL = new Set(['state', 'private', 'elite', 'academy']);

export const emptyCampus = () => ({
  housing: null,
  greek: null,
  greekAlumni: false,
  clubs: [],
  studentGov: null,
  studentGovYears: 0,
  sport: null,
  probation: 0,
  conduct: 0,
  integrity: 0,
  expelledAge: null,
  scholarships: [],
  honors: false,
  abroad: [],
  internships: [],
  mentors: [],
  offers: [],
  rotc: null,
  academy: null,
  nomination: false,
  resume: 0,
});

/** Enrolled full-time at a residential campus (dorms, Greek life, varsity sports). */
export function onCampus(state) {
  const e = state.education.enrolled;
  return Boolean(e && e.pace === 'full' && RESIDENTIAL.has(e.schoolId));
}

/** This year's GPA adjustment from campus life (read by EducationEngine). */
export function campusGpaAdjustment(state) {
  const c = state.campus;
  if (!c) return 0;
  let adj = state.yearly['campus.gpa'] ?? 0;
  if (c.greek) adj -= 0.1;
  if (c.sport) adj -= 0.12;
  if (c.rotc) adj -= 0.05;
  if (c.honors) adj -= 0.05;
  if (state.yearly['campus.party']) adj -= 0.15;
  return adj;
}

/** Hiring bonus from mentors, internships, clubs, study abroad, Greek alumni and résumé. */
export function networkBonus(state, profession) {
  const c = state.campus;
  if (!c) return 0;
  let bonus = 0;
  if (c.mentors.some((m) => m.professionId === profession.id)) bonus += 0.1;
  if (c.internships.some((i) => i.professionId === profession.id)) bonus += 0.06;
  bonus += Math.min(0.06, c.clubs.filter((id) => CLUBS[id]?.fields.includes(profession.id)).length * 0.03);
  if (c.abroad.length && ['foreignService', 'intelligence'].includes(profession.id)) bonus += 0.05;
  if ((c.greek || c.greekAlumni) && profession.sector === 'private') bonus += 0.03;
  bonus += Math.min(0.06, c.resume * 0.008);
  return bonus;
}
