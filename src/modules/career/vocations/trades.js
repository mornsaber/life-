/**
 * The skilled trades: electricians, plumbers, heating engineers, welders, carpenters, ironworkers,
 * crane operators, mechanics, linemen and smiths. The licences (journeyman, master, ASE, NCCCO)
 * stay with credentials/; this adds the trade's own path: indentures, a specialty, the courses a
 * foreman needs, the big jobs away, the trade's prizes and its guilds and unions.
 */
import { yearNow } from '../../world/Eras.js';
import { GUILD, UNION, MANAGEMENT, WORKPLACE_COMPLAINTS, regulatorFrom, COMMONWEALTH } from './blocks.js';

const y = (s) => yearNow(s);

export const TRADES = {
  id: 'trades',
  name: 'The Trade',
  professions: ['trades', 'plumbing', 'hvac', 'welding', 'carpentry', 'ironworking', 'craneOperator', 'automotive', 'lineworker', 'blacksmith'],
  use: [GUILD, UNION, MANAGEMENT],
  specialtyAt: 3,
  specialtyTitle: 'Your Line of the Trade',
  specialtyText: 'You\'ve served your time. Most tradesmen settle into one kind of work. Which will be yours?',
  specialties: [
    { id: 'domestic', name: 'Houses and small jobs', icon: '🏠', hint: 'Your own customers, your own van' },
    { id: 'commercial', name: 'Commercial and industrial sites', icon: '🏗️', hint: 'Big contracts, site rules' },
    { id: 'maintenance', name: 'Maintenance for a big employer', icon: '🔧', hint: 'Steady hours, a works department' },
    { id: 'heritage', name: 'Restoration and heritage work', icon: '🏛️', hint: 'Old methods, slow and fine', professions: ['carpentry', 'blacksmith', 'ironworking', 'plumbing'] },
    { id: 'marine', name: 'Shipyards and marine work', icon: '⚓', hint: 'Hulls, engines and dry docks', professions: ['welding', 'trades', 'carpentry', 'ironworking', 'automotive'] },
    { id: 'motorsport', name: 'Motorsport and race teams', icon: '🏁', from: 1906, hint: 'Pit lanes and tight deadlines', professions: ['automotive', 'welding'] },
  ],
  courses: [
    { id: 'firstAid', name: (s) => (y(s) < 1960 ? 'the St John Ambulance first-aid certificate' : 'a first-aid at work certificate'), icon: '⛑️', from: 1880, cost: 150, renew: 3, perf: 2 },
    { id: 'siteSafety', name: (s) => (y(s) < 1974 ? 'a site safety course' : s.character.countryId === 'US' ? 'the OSHA 30-hour course' : 'a site safety passport'), icon: '🦺', from: 1940, cost: 400, perf: 3, gateMgmt: true, minGrade: 2 },
    { id: 'estimating', name: 'an estimating and contracts course', icon: '📐', minGrade: 4, cost: 1200, perf: 3 },
    { id: 'cityGuilds', name: (s) => (y(s) < 1960 ? 'the City and Guilds advanced craft certificate' : 'a City and Guilds advanced craft certificate'), icon: '📜', from: 1880, countries: COMMONWEALTH, minGrade: 3, cost: 900, passRate: 0.75, perf: 4 },
    { id: 'clerkOfWorks', name: 'the clerk of works examination', icon: '🏛️', from: 1890, minGrade: 5, minYears: 12, cost: 1500, passRate: 0.65, perf: 2 },
  ],
  postingOdds: 0.08,
  postings: [
    { id: 'bigBuild', name: (s) => (y(s) < 1930 ? 'A Railway Contract' : y(s) < 1970 ? 'A Dam and Power Station Job' : 'A Major Infrastructure Project'), icon: '🏗️', minGrade: 3, years: 2, stress: 4, happiness: 2, performance: 4,
      text: (s) => (y(s) < 1930 ? 'A railway contractor is hiring tradesmen for two years on the new line: good money, camps and long hours.' : y(s) < 1970 ? 'A dam and power station upcountry needs tradesmen for two years: camps, bonus rates.' : 'A major project (a tunnel, an airport, a stadium) is hiring for two years at premium rates.'),
      end: () => 'The big job finished. You came home with savings, a few scars and a name on the contractor\'s list.' },
    { id: 'abroad', name: 'Work Overseas', icon: '🌍', minGrade: 3, years: 2, places: ['AU', 'CA', 'NZ', 'SA', 'AE', 'NO', 'DE', 'US'], stress: 4, happiness: 3,
      text: 'A contractor overseas is short of skilled hands and pays for the passage.' },
    { id: 'offshore', name: 'Offshore', icon: '🛢️', from: 1965, minGrade: 3, years: 2, stress: 6, happiness: 1, professions: ['welding', 'trades', 'craneOperator', 'ironworking'],
      text: 'An oil platform needs tradesmen: two weeks on, two weeks off, helicopter out.' },
    { id: 'disaster', name: 'Rebuilding After a Disaster', icon: '🌀', minGrade: 3, years: 1, stress: 5, happiness: 4,
      text: 'A storm has flattened towns down the coast. The rebuild needs every tradesman who can come.', end: () => 'You finished the rebuild. A family sent a card every Christmas after.' },
  ],
  awards: [
    { id: 'apprentice', name: 'Apprentice of the Year', icon: '🏆', minYears: 2, minPerformance: 75, chance: 0.08, prestige: 1, text: 'Your college named you its Apprentice of the Year.' },
    { id: 'skills', name: (s) => (y(s) < 1950 ? 'a medal at the trades exhibition' : 'a medal at the national skills competition'), icon: '🥇', minYears: 3, minPerformance: 80, chance: 0.05, prestige: 1, text: (s) => (y(s) < 1950 ? 'Your work took a medal at the trades exhibition.' : 'You won a medal at the national skills competition.') },
    { id: 'worldSkills', name: 'a WorldSkills medal', icon: '🌍', from: 1950, minYears: 3, minPerformance: 90, chance: 0.015, prestige: 2, awards: ['skills'], text: 'You represented your country at WorldSkills, and came home with a medal.' },
    { id: 'royalWarrant', name: 'a Royal Warrant', icon: '👑', countries: ['GB'], minGrade: 5, minYears: 15, minPerformance: 85, chance: 0.01, prestige: 3, text: 'Your work for the royal household earned a Royal Warrant: the crest on your van, by appointment.' },
  ],
  licence: (s) => ({ trades: 'journeymanElectrician', plumbing: 'journeymanPlumber', carpentry: 'journeymanCarpenter', lineworker: 'journeymanLineman', ironworking: 'ironworkerCard' })[s.career?.job?.professionId] ?? null,
  regulator: regulatorFrom({ US: ['the state licensing board', 1920], GB: ['the trade\'s competent-person scheme', 1985], AU: ['the state building authority', 1970], CA: ['the provincial trades authority', 1970], DE: ['the Handwerkskammer', 1900] }),
  complaintOdds: 0.015,
  complaints: [
    { id: 'shoddy', short: 'a botched job', severity: 1, weight: 4, founded: 0.5, text: 'A customer says your work failed within a month, and wants it put right for free.' },
    { id: 'unsafe', short: 'unsafe work', severity: 2, weight: 2, founded: 0.45, text: 'An inspector found wiring, pipework or a lift you signed off that could have killed someone.' },
    { id: 'cowboy', short: 'overcharging', severity: 1, weight: 2, founded: 0.5, text: 'A pensioner\'s family says you charged three times the going rate.' },
    ...WORKPLACE_COMPLAINTS.filter((c) => c.id === 'safety'),
  ],
  eliteOdds: 0.04,
  elite: [
    { id: 'examiner', name: 'Trade examiner for the apprenticeship board', icon: '📋', minGrade: 4, minYears: 12, years: 5, prestige: 1, stipend: 2500, text: 'The apprenticeship board wants you to examine the next generation: practical tests, Saturday mornings.' },
    { id: 'instructor', name: 'Lead instructor at the technical college', icon: '🏫', from: 1890, minGrade: 4, minYears: 15, years: 4, prestige: 1, stipend: 6000, text: 'The technical college asks you to lead its evening classes in your trade.' },
  ],
};
