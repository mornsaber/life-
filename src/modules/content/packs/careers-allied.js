/**
 * More careers: allied health and therapy, mental health, eye and spine
 * care, weather, land surveying, renewable energy, interpreting, game
 * development and online content creation.
 *
 * Real-world rules worth knowing:
 *   - Licensed counselors (LPC) need a master's degree and about two years
 *     of supervised practice; clinical psychologists need a doctorate
 *     (Ph.D. or Psy.D.), a postdoctoral year and the EPPP.
 *   - Registered dietitians now need a master's degree, an internship and
 *     the CDR exam.
 *   - Radiologic technologists (ARRT), respiratory therapists (RRT) and
 *     dental hygienists (RDH) come out of two-year associate programs.
 *   - Occupational therapists need a master's or OTD; speech-language
 *     pathologists a master's plus a clinical fellowship year (CCC-SLP).
 *   - Optometrists (O.D.) and chiropractors (D.C.) earn four-year doctorates.
 *   - Most U.S. weather forecasting is done by the National Weather Service.
 *   - Professional Land Surveyors are licensed after a degree and years of
 *     field experience; NABCEP certifies solar installers.
 *   - Court interpreters pass state oral exams; creator income is volatile.
 */
import { L } from '../../career/Ladder.js';

const FED = { sizes: { large: 1, enterprise: 1 } };

const careers = {
  /* ---------------- Mental health ---------------- */
  counseling: {
    id: 'counseling', name: 'Mental Health Counseling', icon: '🛋️', sector: 'private', payMultiplier: 0.92, minAge: 18, sizes: { small: 3, medium: 3, large: 2 }, background: 'standard',
    employers: ['Harbor Behavioral Health', 'Clearpath Counseling', 'Riverside Community Mental Health', 'Northside Recovery Center'],
    valued: ['lpc', 'lcsw'],
    ladder: [
      ['tech', 'Behavioral Health Technician', 1],
      ['associate', 'Associate Counselor (LPC-A)', 4, { entry: true, req: { education: { program: 'counselingMaster' } } }],
      ['lpc', 'Licensed Professional Counselor', 5, { req: { credentials: ['lpc'] } }],
      ['senior', 'Senior Clinician', 6, { track: 'ic' }],
      ['supervisor', 'Clinical Supervisor', 6, { track: 'mgmt', abilities: ['supervise'], reports: 8 }],
      ['director', 'Clinical Director', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget'], reports: 40 }],
    ],
  },
  psychology: {
    id: 'psychology', name: 'Clinical Psychology', icon: '🧠', sector: 'private', payMultiplier: 1.08, minAge: 25, sizes: { small: 2, medium: 2, large: 2 }, background: 'standard',
    employers: ['Lakeview Psychological Associates', 'University Counseling & Psychological Services', 'Regional Medical Center Behavioral Health', 'Meridian Neuropsychology'],
    entry: { education: { program: 'psyd' } },
    ladder: [
      ['postdoc', 'Postdoctoral Psychology Fellow', 5, { years: 1 }],
      ['psychologist', 'Licensed Psychologist', 7, { req: { credentials: ['psychLicense'] } }],
      ['senior', 'Senior Psychologist', 8, { track: 'ic' }],
      ['neuro', 'Neuropsychologist', 8, { track: 'ic', minSize: 'medium' }],
      ['director', 'Director of Psychology', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget'], reports: 20 }],
    ],
  },

  /* ---------------- Allied health ---------------- */
  dietitian: {
    id: 'dietitian', name: 'Nutrition & Dietetics', icon: '🥗', sector: 'private', payMultiplier: 0.9, minAge: 18, sizes: { small: 2, medium: 3, large: 3 }, background: 'standard',
    employers: ['Regional Medical Center', 'Green Valley Senior Living', 'FitFuel Nutrition', 'County WIC Program'],
    ladder: [
      ['technician', 'Dietetic Technician', 2],
      ['rd', 'Registered Dietitian', 4, { entry: true, req: { credentials: ['rdn'] } }],
      ['clinical', 'Clinical Dietitian Specialist', 5, { track: 'ic' }],
      ['manager', 'Clinical Nutrition Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 12 }],
      ['director', 'Director of Food & Nutrition', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget'], reports: 120 }],
    ],
  },
  imaging: {
    id: 'imaging', name: 'Radiologic & Imaging Technology', icon: '🩻', sector: 'private', payMultiplier: 0.95, minAge: 18, sizes: { medium: 3, large: 3, enterprise: 1 }, background: 'standard',
    employers: ['Regional Medical Center', 'ClearView Imaging', 'St. Mercy Hospital', 'Summit Orthopedics'],
    ladder: [
      ['xray', 'Radiologic Technologist', 3, { req: { credentials: ['arrt'] } }],
      ['ct', 'CT / MRI Technologist', 4],
      ['lead', 'Lead Technologist', 5, { track: 'ic' }],
      ['manager', 'Imaging Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 20 }],
      ['director', 'Director of Imaging Services', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget'], reports: 80 }],
    ],
  },
  respiratoryTherapy: {
    id: 'respiratoryTherapy', name: 'Respiratory Therapy', icon: '🫁', sector: 'private', payMultiplier: 0.98, minAge: 18, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'standard',
    employers: ['Regional Medical Center', 'Children\'s Hospital', 'St. Mercy Hospital', 'BreatheWell Home Respiratory'],
    ladder: [
      ['rt', 'Respiratory Therapist', 4, { req: { credentials: ['rrt'] } }],
      ['senior', 'Senior Respiratory Therapist', 5],
      ['specialist', 'Neonatal / ECMO Specialist', 6, { track: 'ic' }],
      ['manager', 'Respiratory Care Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 25 }],
      ['director', 'Director of Respiratory Care', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget'], reports: 70 }],
    ],
  },
  dentalHygiene: {
    id: 'dentalHygiene', name: 'Dental Hygiene', icon: '🪥', sector: 'private', payMultiplier: 1.0, minAge: 18, sizes: { small: 4, medium: 2 }, background: 'standard',
    employers: ['Bright Smile Dental', 'Family Dental Care', 'Lakeside Dental Group', 'Downtown Dentistry'],
    ladder: [
      ['assistant', 'Dental Assistant', 1],
      ['hygienist', 'Registered Dental Hygienist', 4, { entry: true, req: { credentials: ['rdh'] } }],
      ['lead', 'Lead Hygienist', 5, { track: 'ic' }],
      ['educator', 'Hygiene Program Director (dental school)', 6, { track: 'ic', minSize: 'medium', req: { experience: { professions: ['dentalHygiene'], years: 6 } } }],
      ['manager', 'Dental Practice Manager', 5, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 10 }],
      ['regional', 'Regional Operations Manager (dental group)', 6, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget'], reports: 40 }],
    ],
  },
  occupationalTherapy: {
    id: 'occupationalTherapy', name: 'Occupational Therapy', icon: '🧩', sector: 'private', payMultiplier: 1.0, minAge: 22, sizes: { small: 2, medium: 3, large: 3 }, background: 'standard',
    employers: ['Regional Medical Center Rehab', 'Sunrise Pediatric Therapy', 'Green Valley Rehab & Nursing', 'Area Schools Therapy Service'],
    entry: { education: { program: 'mot' } },
    ladder: [
      ['ot', 'Occupational Therapist', 5, { req: { credentials: ['otLicense'] } }],
      ['senior', 'Senior Occupational Therapist', 6],
      ['specialist', 'Certified Hand Therapist', 7, { track: 'ic' }],
      ['manager', 'Rehab Services Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 20 }],
      ['director', 'Director of Rehabilitation Services', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 70 }],
    ],
  },
  speechPathology: {
    id: 'speechPathology', name: 'Speech-Language Pathology', icon: '🗣️', sector: 'private', payMultiplier: 0.98, minAge: 22, sizes: { small: 2, medium: 3, large: 2 }, background: 'standard',
    employers: ['Area Schools Therapy Service', 'Regional Medical Center Rehab', 'Talk Time Pediatric Therapy', 'Green Valley Rehab & Nursing'],
    entry: { education: { program: 'slpMaster' } },
    ladder: [
      ['cf', 'SLP Clinical Fellow', 4, { years: 1 }],
      ['slp', 'Speech-Language Pathologist (CCC-SLP)', 5, { req: { credentials: ['cccSlp'] } }],
      ['senior', 'Senior Speech-Language Pathologist', 6],
      ['specialist', 'Swallowing & Voice Specialist', 7, { track: 'ic' }],
      ['lead', 'Rehab / Special Education Lead', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 15 }],
    ],
  },
  optometry: {
    id: 'optometry', name: 'Optometry', icon: '👓', sector: 'private', payMultiplier: 1.12, minAge: 25, sizes: { small: 4, medium: 2, large: 1 }, background: 'standard',
    employers: ['ClearSight Eye Care', 'Family Vision Center', 'EyeWorks Optical', 'Regional Eye Associates'],
    entry: { education: { program: 'od' } },
    ladder: [
      ['associate', 'Associate Optometrist', 7, { req: { credentials: ['odLicense'] }, abilities: ['prescribe'] }],
      ['optometrist', 'Optometrist', 8, { abilities: ['prescribe'] }],
      ['specialist', 'Specialty Contact Lens / Low-Vision Optometrist', 8, { track: 'ic', abilities: ['prescribe'] }],
      ['director', 'Clinic Director', 8, { track: 'mgmt', abilities: ['prescribe', 'supervise', 'hire', 'budget'], reports: 12 }],
      ['regionalDirector', 'Regional Clinical Director (group practice)', 9, { track: 'mgmt', minSize: 'medium', abilities: ['prescribe', 'supervise', 'hire', 'budget', 'sign'], reports: 40 }],
    ],
  },
  chiropractic: {
    id: 'chiropractic', name: 'Chiropractic', icon: '🦴', sector: 'private', payMultiplier: 0.92, minAge: 25, sizes: { small: 4, medium: 1 }, background: 'standard', commission: true,
    employers: ['Align Chiropractic', 'Back in Motion Spine Center', 'Family Chiropractic & Wellness', 'Peak Performance Chiropractic'],
    entry: { education: { program: 'dc' } },
    ladder: [
      ['associate', 'Associate Chiropractor', 5, { req: { credentials: ['dcLicense'] } }],
      ['chiropractor', 'Chiropractor', 6],
      ['sports', 'Sports Chiropractor', 7, { track: 'ic' }],
      ['director', 'Clinic Director', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 8 }],
      ['regionalDirector', 'Regional Clinic Director', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 25 }],
    ],
  },

  /* ---------------- Science & land ---------------- */
  meteorology: {
    ...FED, id: 'meteorology', name: 'Meteorology (National Weather Service)', icon: '🌪️', sector: 'federal', payMultiplier: 1.0, minAge: 21, background: 'standard', exam: 'federal',
    employers: ['National Weather Service Forecast Office', 'NOAA Storm Prediction Center', 'National Hurricane Center'],
    entry: { education: { level: 'bachelor', majors: ['atmosphericScience'] } },
    valued: ['drone'],
    ladder: [
      ['intern', 'Meteorologist Intern', 5, { years: 1 }],
      ['forecaster', 'Forecaster', 7],
      ['senior', 'Senior Forecaster', 8],
      ['soo', 'Science and Operations Officer', 9, { track: 'ic', abilities: ['policy'] }],
      ['mic', 'Meteorologist in Charge', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 25 }],
      ['regional', 'Regional Director', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 600 }],
    ],
  },
  surveying: {
    id: 'surveying', name: 'Land Surveying', icon: '📏', sector: 'private', payMultiplier: 0.95, minAge: 18, sizes: { small: 3, medium: 2, large: 1 }, background: 'standard',
    employers: ['Benchmark Land Surveying', 'Cornerstone Geomatics', 'TriState Engineering & Survey', 'Meridian Survey Co.'],
    valued: ['drone'],
    ladder: [
      ['tech', 'Survey Technician', 2],
      ['partyChief', 'Survey Party Chief', 4],
      ['pls', 'Professional Land Surveyor', 6, { req: { credentials: ['pls'] } }],
      ['senior', 'Senior Surveyor (GIS / Geodesy)', 7, { track: 'ic' }],
      ['manager', 'Survey Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'sign'], reports: 20 }],
    ],
  },
  renewableEnergy: {
    id: 'renewableEnergy', name: 'Solar & Wind Energy', icon: '☀️', sector: 'private', payMultiplier: 0.95, minAge: 18, sizes: { small: 2, medium: 3, large: 2 }, background: 'lenient',
    employers: ['SunPath Solar', 'Prairie Wind Services', 'Brightline Renewables', 'Clearsky Energy'],
    valued: ['hazwoper'],
    ladder: [
      ['installer', 'Solar Installer', 2],
      ['windTech', 'Wind Turbine Technician', 3, { req: { fitness: 45 } }],
      ['certified', 'NABCEP-Certified PV Installer', 4, { req: { credentials: ['nabcep'] } }],
      ['supervisor', 'Site Supervisor', 5, { track: 'mgmt', abilities: ['supervise'], reports: 15 }],
      ['pm', 'Renewable Project Manager', 6, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget'], reports: 60 }],
    ],
  },

  /* ---------------- Language, media & games ---------------- */
  interpreter: {
    id: 'interpreter', name: 'Translation & Interpreting', icon: '🈺', sector: 'private', payMultiplier: 0.9, minAge: 18, sizes: { small: 3, medium: 2 }, background: 'standard',
    employers: ['LinguaBridge Language Services', 'Regional Medical Center Language Access', 'Global Voice Translation', 'Superior Court Interpreter Pool'],
    entry: { smarts: 50 },
    valued: ['languageProficiency'],
    ladder: [
      ['translator', 'Freelance Translator', 2],
      ['medical', 'Medical Interpreter', 3],
      ['court', 'Certified Court Interpreter', 5, { req: { credentials: ['courtInterpreter'] } }],
      ['conference', 'Conference Interpreter', 7, { track: 'ic', req: { credentials: ['languageProficiency'] } }],
      ['manager', 'Language Services Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 30 }],
    ],
  },
  contentCreator: {
    id: 'contentCreator', name: 'Content Creation & Streaming', icon: '📹', sector: 'private', payMultiplier: 0.85, minAge: 16, sizes: { small: 4 }, background: 'lenient', commission: true, promotionOdds: 0.35,
    employers: ['Independent Creator', 'Creator Collective', 'Your Own Channel'],
    ladder: [
      ['hobbyist', 'Hobbyist Creator', 1, { years: 2 }],
      ['partTime', 'Part-Time Creator', 2],
      ['fullTime', 'Full-Time Creator', 4],
      ['established', 'Established Creator', 6, { track: 'ic' }],
      ['star', 'Top Creator', 9, { track: 'ic' }],
      ['studio', 'Creator Studio Founder', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 12 }],
    ],
  },
  gameDevelopment: {
    id: 'gameDevelopment', name: 'Video Game Development', icon: '🎮', sector: 'private', payMultiplier: 0.98, minAge: 18, sizes: { small: 2, medium: 2, large: 2, enterprise: 1 }, background: 'lenient',
    employers: ['Pixel Forge Studios', 'Northlight Games', 'Starfall Interactive', 'Big Moon Entertainment'],
    ladder: [
      ['qa', 'QA Tester', 2],
      ['junior', 'Junior Game Developer', 4, { entry: true, req: { education: { level: 'bachelor', majors: ['computerScience', 'arts', 'mathematics'] } } }],
      ['developer', 'Game Developer', 5],
      ['senior', 'Senior Game Designer', 6, { track: 'ic' }],
      ['lead', 'Lead Designer', 7, { track: 'ic', minSize: 'medium' }],
      ['creative', 'Creative Director', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget'], reports: 60 }],
      ['studioHead', 'Studio Head', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 400 }],
    ],
  },
};

export default { id: 'careers-allied', version: 1, careers };
