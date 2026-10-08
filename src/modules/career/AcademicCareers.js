/**
 * Academic and scientific careers beyond the public university:
 *
 *   college           Private colleges and universities, from small liberal
 *                     arts colleges (teaching-first) to private research
 *                     universities. Tenure-track assistant professors face a
 *                     tenure review in year six.
 *   communityCollege  Community college faculty: a master's degree is enough,
 *                     the job is teaching (five classes a semester), and
 *                     adjuncts are paid by the course.
 *   nationalLab       DOE national laboratories (Argonne, Oak Ridge,
 *                     Brookhaven…): postdocs, staff scientists, group leaders.
 *
 * Real-world rules worth knowing:
 *   - Only a small share of new Ph.D.s land tenure-track jobs; most take one
 *     or more postdocs first, and many leave for industry or government.
 *   - The tenure clock runs about six years; a denied case means one
 *     terminal year and then leaving.
 *   - Full professors can hold endowed (named) chairs; a few become
 *     University or Distinguished Professors.
 */
import { L } from './Ladder.js';

export const ACADEMIC_PROFESSIONS = {
  college: {
    id: 'college', name: 'College & University Faculty (Private)', icon: '🏛️', sector: 'private', payMultiplier: 1.0, minAge: 22, sizes: { small: 3, medium: 2, large: 2 }, background: 'standard',
    employers: ['Whitmore College', 'Ashford University', 'St. Anselm College', 'Carrow Institute of Technology', 'Bellmont University', 'Hollis College'],
    entry: { education: { level: 'master' } },
    levels: [
      L('lecturer', 'Lecturer', 4, { req: { education: { level: 'master' } } }),
      L('visiting', 'Visiting Assistant Professor', 4, { entry: true, req: { education: { program: 'phd' } }, years: 2 }),
      L('assistant', 'Assistant Professor', 5, { entry: true, req: { education: { program: 'phd' } }, years: 6, tenureReview: true }),
      L('associate', 'Associate Professor', 6, { abilities: ['tenure'] }),
      L('professor', 'Professor', 7, { track: 'ic', abilities: ['tenure'] }),
      L('endowed', 'Endowed Chair Professor', 8, { track: 'ic', minSize: 'medium', abilities: ['tenure'] }),
      L('university', 'University Professor', 9, { track: 'ic', minSize: 'large', abilities: ['tenure'] }),
      L('chair', 'Department Chair', 7, { track: 'mgmt', abilities: ['tenure', 'supervise', 'hire'], reports: 20 }),
      L('dean', 'Dean', 8, { track: 'mgmt', abilities: ['tenure', 'supervise', 'budget', 'delegate'], reports: 150 }),
      L('provost', 'Provost', 9, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 900 }),
    ],
  },
  communityCollege: {
    id: 'communityCollege', name: 'Community College Faculty', icon: '🏫', sector: 'municipal', payMultiplier: 0.92, minAge: 22, background: 'standard',
    union: { chance: 0.6, name: 'Faculty Federation', strike: true },
    benefits: { pension: 'teachers' },
    employerName: (city) => `${city} Community College`,
    entry: { education: { level: 'master' } },
    levels: [
      L('adjunct', 'Adjunct Instructor', 2, { req: { education: { level: 'master' } } }),
      L('instructor', 'Instructor', 4, { entry: true, req: { education: { level: 'master' } }, years: 3 }),
      L('assistant', 'Assistant Professor', 5, { abilities: ['tenure'] }),
      L('professor', 'Professor', 6, { track: 'ic', abilities: ['tenure'] }),
      L('chair', 'Department Chair', 6, { track: 'mgmt', abilities: ['tenure', 'supervise', 'hire'], reports: 25 }),
      L('dean', 'Dean of Instruction', 7, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports: 120 }),
      L('president', 'College President', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 600 }),
    ],
  },
  nationalLab: {
    id: 'nationalLab', name: 'National Laboratory Science', icon: '⚛️', sector: 'federal', payMultiplier: 1.12, minAge: 24, background: 'strict',
    employerName: () => 'U.S. Department of Energy National Laboratories',
    entry: { education: { program: 'phd' } },
    levels: [
      L('postdoc', 'Postdoctoral Researcher', 5, { years: 3 }),
      L('staff', 'Staff Scientist', 6),
      L('senior', 'Senior Scientist', 7, { track: 'ic' }),
      L('distinguished', 'Distinguished Fellow', 9, { track: 'ic' }),
      L('group', 'Group Leader', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 15 }),
      L('division', 'Division Director', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 300 }),
    ],
  },
};
