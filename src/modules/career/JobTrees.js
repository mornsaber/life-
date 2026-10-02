/**
 * Every profession is a 7-tier ladder.
 *
 * Profession: { id, name, icon, field, minAge, entry: Requirement, tiers: Tier[7] }
 * Tier:       { title, salary, years, req?: Requirement }
 *   - salary: base annual pay for the tier
 *   - years:  minimum years served in this tier before promotion out of it
 *   - req:    extra requirement to be promoted *into* this tier
 * Requirement: { degree?, majors?, smarts?, fitness? }
 */
export const TIER_COUNT = 7;

const DEFAULT_YEARS = [1, 2, 2, 3, 3, 4, 0];

function ladder(rows) {
  if (rows.length !== TIER_COUNT) throw new Error('Every job tree needs exactly 7 tiers');
  return rows.map(([title, salary, req], i) => ({ title, salary, years: DEFAULT_YEARS[i], ...(req ? { req } : {}) }));
}

export const PROFESSIONS = {
  retail: {
    id: 'retail', name: 'Retail', icon: '🛍️', field: 'service', minAge: 16,
    entry: {},
    tiers: ladder([
      ['Sales Associate', 26000],
      ['Shift Lead', 32000],
      ['Assistant Manager', 42000],
      ['Store Manager', 62000],
      ['District Manager', 95000],
      ['Regional Director', 140000, { degree: 'bachelor' }],
      ['VP of Retail Operations', 240000, { degree: 'bachelor' }],
    ]),
  },
  culinary: {
    id: 'culinary', name: 'Culinary', icon: '👨‍🍳', field: 'service', minAge: 16,
    entry: {},
    tiers: ladder([
      ['Prep Cook', 28000],
      ['Line Cook', 36000],
      ['Sous Chef', 52000],
      ['Chef de Cuisine', 68000],
      ['Executive Chef', 92000],
      ['Culinary Director', 135000],
      ['Celebrity Chef', 450000],
    ]),
  },
  trades: {
    id: 'trades', name: 'Skilled Trades', icon: '🔧', field: 'trades', minAge: 18,
    entry: { degree: 'highschool' },
    tiers: ladder([
      ['Apprentice Electrician', 38000],
      ['Journeyman Electrician', 58000],
      ['Master Electrician', 78000],
      ['Foreman', 92000],
      ['Site Superintendent', 115000],
      ['Construction Project Manager', 140000],
      ['Construction Company Owner', 260000],
    ]),
  },
  tech: {
    id: 'tech', name: 'Technology', icon: '💻', field: 'tech', minAge: 18,
    entry: { degree: 'highschool', smarts: 45 },
    tiers: ladder([
      ['QA Tester', 48000],
      ['Junior Developer', 72000, { smarts: 55 }],
      ['Software Engineer', 105000],
      ['Senior Engineer', 150000, { smarts: 60 }],
      ['Staff Engineer', 205000],
      ['Engineering Director', 260000, { degree: 'bachelor' }],
      ['Chief Technology Officer', 420000, { degree: 'bachelor' }],
    ]),
  },
  corporate: {
    id: 'corporate', name: 'Corporate Business', icon: '🏢', field: 'corporate', minAge: 21,
    entry: { degree: 'bachelor' },
    tiers: ladder([
      ['Jr. Analyst', 58000],
      ['Analyst', 70000],
      ['Senior Analyst', 88000],
      ['Manager', 118000],
      ['Director', 165000],
      ['Vice President', 245000],
      ['Chief Executive Officer', 850000, { degree: 'mba' }],
    ]),
  },
  finance: {
    id: 'finance', name: 'Investment Banking', icon: '💹', field: 'finance', minAge: 21,
    entry: { degree: 'bachelor', majors: ['business', 'stem'], smarts: 60 },
    tiers: ladder([
      ['IB Analyst', 110000],
      ['IB Associate', 175000, { degree: 'mba' }],
      ['Vice President', 260000],
      ['Director', 350000],
      ['Managing Director', 550000],
      ['Group Head', 800000],
      ['Chief Investment Officer', 1400000],
    ]),
  },
  medical: {
    id: 'medical', name: 'Medicine', icon: '🩺', field: 'medical', minAge: 25,
    entry: { degree: 'md' },
    tiers: ladder([
      ['Medical Resident', 64000],
      ['Senior Resident', 70000],
      ['Clinical Fellow', 78000],
      ['Attending Physician', 260000],
      ['Senior Attending', 320000],
      ['Department Head', 420000],
      ['Chief of Medicine', 600000],
    ]),
  },
  law: {
    id: 'law', name: 'Law', icon: '⚖️', field: 'law', minAge: 24,
    entry: { degree: 'jd' },
    tiers: ladder([
      ['Law Clerk', 70000],
      ['Junior Associate', 135000],
      ['Associate', 175000],
      ['Senior Associate', 225000],
      ['Junior Partner', 350000],
      ['Senior Partner', 600000],
      ['Managing Partner', 1200000],
    ]),
  },
  education: {
    id: 'education', name: 'Education', icon: '🍎', field: 'education', minAge: 22,
    entry: { degree: 'bachelor' },
    tiers: ladder([
      ['Substitute Teacher', 32000],
      ['Teacher', 52000],
      ['Senior Teacher', 64000],
      ['Department Chair', 72000],
      ['Assistant Principal', 92000],
      ['Principal', 118000],
      ['Superintendent', 195000],
    ]),
  },
  police: {
    id: 'police', name: 'Law Enforcement', icon: '🚓', field: 'publicSafety', minAge: 21,
    entry: { degree: 'highschool', fitness: 45 },
    tiers: ladder([
      ['Police Recruit', 52000],
      ['Patrol Officer', 64000],
      ['Corporal', 72000],
      ['Sergeant', 86000],
      ['Lieutenant', 102000],
      ['Captain', 125000, { degree: 'bachelor' }],
      ['Chief of Police', 175000, { degree: 'bachelor' }],
    ]),
  },
  fire: {
    id: 'fire', name: 'Fire Service', icon: '🚒', field: 'publicSafety', minAge: 18,
    entry: { degree: 'highschool', fitness: 50 },
    tiers: ladder([
      ['Firefighter Recruit', 48000],
      ['Firefighter', 60000],
      ['Driver/Engineer', 70000],
      ['Fire Lieutenant', 84000],
      ['Fire Captain', 98000],
      ['Battalion Chief', 122000],
      ['Fire Chief', 165000],
    ]),
  },
};

export const PROFESSION_LIST = Object.values(PROFESSIONS);

export function getProfession(id) {
  const profession = PROFESSIONS[id];
  if (!profession) throw new Error(`Unknown profession: ${id}`);
  return profession;
}

export function getTier(professionId, tierIndex) {
  return getProfession(professionId).tiers[tierIndex];
}

const DEGREE_LABEL = { highschool: 'High school diploma', bachelor: "Bachelor's degree", mba: 'MBA', jd: 'Law degree (J.D.)', md: 'Medical degree (M.D.)' };

export function describeRequirement(req = {}) {
  const parts = [];
  if (req.degree) parts.push(DEGREE_LABEL[req.degree] + (req.majors ? ` (${req.majors.join('/')})` : ''));
  if (req.smarts) parts.push(`${req.smarts}+ smarts`);
  if (req.fitness) parts.push(`${req.fitness}+ fitness`);
  return parts.join(', ') || 'None';
}
