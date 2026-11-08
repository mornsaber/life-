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
import { L } from '../../career/Ladder.js';

const careers = {
  college: {
    id: 'college', name: 'College & University Faculty (Private)', icon: '🏛️', sector: 'private', payMultiplier: 1.0, minAge: 22, sizes: { small: 3, medium: 2, large: 2 }, background: 'standard',
    employers: ['Whitmore College', 'Ashford University', 'St. Anselm College', 'Carrow Institute of Technology', 'Bellmont University', 'Hollis College'],
    entry: { education: { level: 'master' } },
    ladder: [
      ['lecturer', 'Lecturer', 4, { req: { education: { level: 'master' } } }],
      ['visiting', 'Visiting Assistant Professor', 4, { entry: true, req: { education: { program: 'phd' } }, years: 2 }],
      ['assistant', 'Assistant Professor', 5, { entry: true, req: { education: { program: 'phd' } }, years: 6, tenureReview: true }],
      ['associate', 'Associate Professor', 6, { abilities: ['tenure'] }],
      ['professor', 'Professor', 7, { track: 'ic', abilities: ['tenure'] }],
      ['endowed', 'Endowed Chair Professor', 8, { track: 'ic', minSize: 'medium', abilities: ['tenure'] }],
      ['university', 'University Professor', 9, { track: 'ic', minSize: 'large', abilities: ['tenure'] }],
      ['chair', 'Department Chair', 7, { track: 'mgmt', abilities: ['tenure', 'supervise', 'hire'], reports: 20 }],
      ['dean', 'Dean', 8, { track: 'mgmt', abilities: ['tenure', 'supervise', 'budget', 'delegate'], reports: 150 }],
      ['provost', 'Provost', 9, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 900 }],
    ],
  },
  communityCollege: {
    id: 'communityCollege', name: 'Community College Faculty', icon: '🏫', sector: 'municipal', payMultiplier: 0.92, minAge: 22, background: 'standard',
    union: { chance: 0.6, name: 'Faculty Federation', strike: true },
    benefits: { pension: 'teachers' },
    employerName: (city) => `${city} Community College`,
    entry: { education: { level: 'master' } },
    ladder: [
      ['adjunct', 'Adjunct Instructor', 2, { req: { education: { level: 'master' } } }],
      ['instructor', 'Instructor', 4, { entry: true, req: { education: { level: 'master' } }, years: 3 }],
      ['assistant', 'Assistant Professor', 5, { abilities: ['tenure'] }],
      ['professor', 'Professor', 6, { track: 'ic', abilities: ['tenure'] }],
      ['chair', 'Department Chair', 6, { track: 'mgmt', abilities: ['tenure', 'supervise', 'hire'], reports: 25 }],
      ['dean', 'Dean of Instruction', 7, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports: 120 }],
      ['president', 'College President', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 600 }],
    ],
  },
  maritimeFaculty: {
    id: 'maritimeFaculty', name: 'Maritime Academy Faculty & Staff', icon: '⚓', sector: 'state', payMultiplier: 1.05, minAge: 24, background: 'strict', campus: true,
    benefits: { pension: 'stateGov' },
    employerName: (city, rng, stateName) => rng.pick([`${stateName ?? city} Maritime Academy`, `${city} Maritime College`, `${city} Nautical College`]),
    entry: { anyOf: [{ credentials: ['mateLicense'] }, { credentials: ['engineerLicense'] }, { education: { level: 'master' } }] },
    // Licensed faculty and the cadet staff hold commissions in the merchant marine reserve (the U.S. Maritime Service).
    ladder: [
      ['instructor', 'Licensed Instructor', 4, { entry: true, req: { anyOf: [{ credentials: ['mateLicense'] }, { credentials: ['engineerLicense'] }, { education: { level: 'master' } }] } }],
      ['professor', 'Professor of Marine Transportation', 6, { track: 'ic', req: { education: { level: 'bachelor' } }, abilities: ['tenure'] }],
      ['trainingShipMaster', 'Master of the Training Ship', 8, { track: 'ic', req: { credentials: ['masterLicense'] }, abilities: ['command', 'supervise'], reports: 40 }],
      ['deptHead', 'Department Head', 7, { track: 'mgmt', abilities: ['tenure', 'supervise', 'hire'], reports: 20 }],
      ['commandant', 'Commandant of Cadets', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 900 }],
      ['superintendent', 'Superintendent', 9, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 1200 }],
    ],
  },
  nationalLab: {
    id: 'nationalLab', name: 'National Laboratory Science', icon: '⚛️', sector: 'federal', payMultiplier: 1.12, minAge: 24, background: 'strict',
    employerName: () => 'U.S. Department of Energy National Laboratories',
    entry: { education: { program: 'phd' } },
    ladder: [
      ['postdoc', 'Postdoctoral Researcher', 5, { years: 3 }],
      ['staff', 'Staff Scientist', 6],
      ['staff2', 'Staff Scientist II', 7],
      ['senior', 'Senior Scientist', 7, { track: 'ic' }],
      ['distinguished', 'Distinguished Fellow', 9, { track: 'ic' }],
      ['group', 'Group Leader', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 15 }],
      ['deputyDivision', 'Deputy Division Director', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports: 150 }],
      ['division', 'Division Director', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 300 }],
      ['ald', 'Associate Laboratory Director', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 1200 }],
      ['labDirector', 'Laboratory Director', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 4000 }],
    ],
  },
};

export default { id: 'careers-academic', version: 1, careers };
