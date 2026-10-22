/**
 * Real universities, by country and city.
 *
 * Every university has a type from Catalog.SCHOOLS ('elite', 'state', 'private',
 * 'academy', 'community', 'technical', 'online'). The type decides the fee band,
 * aid and campus life. On top of the type each university has:
 *
 *   accept     its undergraduate acceptance rate, which sets admission odds
 *   prestige   0–3: how much the name opens doors (hiring, residencies, PhDs)
 *   pro        professional schools it has: med, law, dent, vet, pharm, opt,
 *              maritime, phd (research doctorates)
 *   kind       a restriction: 'technical' (science and engineering), 'liberalArts'
 *              (undergraduate arts and sciences), 'medical' or 'law' (those schools
 *              only), 'grad' (graduate only)
 *   t / oos    US yearly tuition (in-state or sticker / out-of-state), 2025
 *
 * Abroad, fees come from the country's own tables (world/Education.js), so a
 * Sorbonne place costs what French universities cost. The city is where you
 * live while you study: going there means moving, and studying in another
 * country means a student visa.
 *
 * Community colleges, technical colleges and online universities are generated
 * for every city from the country's own names: they're local.
 */
import { REGIONS } from '../life/Regions.js';
import { COUNTRIES } from '../world/Countries.js';
import { EDUCATION } from '../world/Education.js';
import { PROGRAMS } from './Catalog.js';

const U = (id, name, cc, region, type, accept, prestige, pro = [], opts = {}) => ({ id, name, country: cc, region, type, accept, prestige, pro, ...opts });
const all = ['med', 'law', 'dent', 'pharm', 'phd'];

const NAMED = [
  // United States: Ivies and peers.
  U('harvard', 'Harvard University', 'US', 'boston', 'elite', 0.035, 3, ['med', 'law', 'dent', 'phd'], { t: 59000, known: ['economics', 'politicalScience', 'history'] }),
  U('mit', 'Massachusetts Institute of Technology', 'US', 'boston', 'elite', 0.045, 3, ['phd'], { t: 62000, kind: 'technical', known: ['engineering', 'computerScience', 'physics', 'mathematics'] }),
  U('stanford', 'Stanford University', 'US', 'sf', 'elite', 0.037, 3, ['med', 'law', 'phd'], { t: 65000, known: ['computerScience', 'engineering', 'economics'] }),
  U('columbia', 'Columbia University', 'US', 'nyc', 'elite', 0.039, 3, ['med', 'law', 'dent', 'phd'], { t: 68000, known: ['communications', 'politicalScience', 'english'] }),
  U('penn', 'University of Pennsylvania', 'US', 'philadelphia', 'elite', 0.058, 3, ['med', 'law', 'dent', 'vet', 'phd'], { t: 66000, known: ['business', 'economics', 'nursing'] }),
  U('uchicago', 'University of Chicago', 'US', 'chicago', 'elite', 0.05, 3, ['med', 'law', 'phd'], { t: 66000, known: ['economics', 'mathematics', 'physics'] }),
  U('caltech', 'California Institute of Technology', 'US', 'losangeles', 'elite', 0.03, 3, ['phd'], { t: 63000, kind: 'technical', place: 'Pasadena', known: ['physics', 'engineering', 'chemistry'] }),
  U('duke', 'Duke University', 'US', 'raleigh', 'elite', 0.06, 3, ['med', 'law', 'phd'], { t: 66000, place: 'Durham', known: ['biology', 'economics', 'publicAdministration'] }),
  U('georgetown', 'Georgetown University', 'US', 'dc', 'elite', 0.13, 3, ['med', 'law', 'phd'], { t: 65000, known: ['internationalRelations', 'politicalScience', 'economics'] }),
  U('northwestern', 'Northwestern University', 'US', 'chicago', 'elite', 0.07, 3, ['med', 'law', 'phd'], { t: 65000, place: 'Evanston', known: ['communications', 'engineering', 'economics'] }),
  U('vanderbilt', 'Vanderbilt University', 'US', 'nashville', 'elite', 0.06, 3, ['med', 'law', 'phd'], { t: 63000, known: ['education', 'biology', 'economics'] }),
  U('rice', 'Rice University', 'US', 'houston', 'elite', 0.08, 3, ['phd'], { t: 58000, known: ['engineering', 'architecture', 'chemistry'] }),
  U('cmu', 'Carnegie Mellon University', 'US', 'pittsburgh', 'elite', 0.11, 3, ['phd'], { t: 63000, known: ['computerScience', 'engineering', 'arts'] }),
  U('emory', 'Emory University', 'US', 'atlanta', 'elite', 0.11, 3, ['med', 'law', 'phd'], { t: 60000, known: ['biology', 'nursing', 'business'] }),
  U('usc', 'University of Southern California', 'US', 'losangeles', 'elite', 0.1, 3, ['med', 'law', 'dent', 'pharm', 'phd'], { t: 66000, known: ['arts', 'communications', 'business'] }),
  U('nyu', 'New York University', 'US', 'nyc', 'elite', 0.09, 3, ['med', 'law', 'dent', 'phd'], { t: 62000, known: ['arts', 'business', 'economics'] }),
  // Private universities.
  U('bu', 'Boston University', 'US', 'boston', 'private', 0.11, 2, ['med', 'law', 'dent', 'phd'], { t: 65000 }),
  U('northeastern', 'Northeastern University', 'US', 'boston', 'private', 0.06, 2, ['law', 'pharm', 'phd'], { t: 62000, known: ['engineering', 'business', 'computerScience'] }),
  U('tulane', 'Tulane University', 'US', 'neworleans', 'private', 0.13, 2, ['med', 'law', 'phd'], { t: 65000 }),
  U('umiami', 'University of Miami', 'US', 'miami', 'private', 0.19, 2, ['med', 'law', 'phd'], { t: 59000, known: ['marineTransportation', 'atmosphericScience', 'business'] }),
  U('gwu', 'George Washington University', 'US', 'dc', 'private', 0.44, 2, ['med', 'law', 'phd'], { t: 64000, known: ['internationalRelations', 'politicalScience', 'publicAdministration'] }),
  U('american', 'American University', 'US', 'dc', 'private', 0.47, 2, ['law'], { t: 56000, known: ['internationalRelations', 'communications'] }),
  U('howard', 'Howard University', 'US', 'dc', 'private', 0.35, 2, ['med', 'law', 'dent', 'pharm'], { t: 32000, known: ['politicalScience', 'communications', 'biology'] }),
  U('smu', 'Southern Methodist University', 'US', 'dallas', 'private', 0.52, 2, ['law'], { t: 62000 }),
  U('drexel', 'Drexel University', 'US', 'philadelphia', 'private', 0.83, 1, ['med', 'law'], { t: 60000, known: ['engineering', 'nursing'] }),
  U('depaul', 'DePaul University', 'US', 'chicago', 'private', 0.78, 1, ['law'], { t: 44000 }),
  U('udayton', 'University of Dayton', 'US', 'dayton', 'private', 0.71, 1, ['law'], { t: 47000, known: ['engineering', 'education'] }),
  U('udenver', 'University of Denver', 'US', 'denver', 'private', 0.79, 1, ['law'], { t: 58000 }),
  U('reed', 'Reed College', 'US', 'portland', 'private', 0.38, 2, [], { t: 66000, kind: 'liberalArts', known: ['physics', 'english', 'history'] }),
  U('luther', 'Luther College', 'US', 'decorah', 'private', 0.7, 1, [], { t: 49000, kind: 'liberalArts', known: ['music', 'religiousStudies'] }),
  U('davisElkins', 'Davis & Elkins College', 'US', 'elkins', 'private', 0.6, 1, [], { t: 32000, kind: 'liberalArts' }),
  U('sgu', 'St. George\'s University School of Medicine (Grenada)', 'US', null, 'private', 0.45, 0, ['med'], { t: 64000, kind: 'medical', offshore: true }),
  // Public universities.
  U('berkeley', 'University of California, Berkeley', 'US', 'sf', 'state', 0.11, 3, ['law', 'opt', 'phd'], { t: 15000, oos: 48000, place: 'Berkeley', known: ['computerScience', 'engineering', 'economics'] }),
  U('ucla', 'University of California, Los Angeles', 'US', 'losangeles', 'state', 0.09, 3, ['med', 'law', 'dent', 'phd'], { t: 14500, oos: 46000, known: ['psychology', 'arts', 'biology'] }),
  U('umich', 'University of Michigan', 'US', 'detroit', 'state', 0.18, 3, ['med', 'law', 'dent', 'pharm', 'phd'], { t: 18000, oos: 60000, place: 'Ann Arbor', known: ['engineering', 'business', 'economics'] }),
  U('unc', 'University of North Carolina at Chapel Hill', 'US', 'raleigh', 'state', 0.17, 3, ['med', 'law', 'dent', 'pharm', 'phd'], { t: 9000, oos: 40000, place: 'Chapel Hill', known: ['communications', 'biology', 'publicAdministration'] }),
  U('gatech', 'Georgia Institute of Technology', 'US', 'atlanta', 'state', 0.16, 3, ['phd'], { t: 12000, oos: 34000, kind: 'technical', known: ['engineering', 'computerScience'] }),
  U('utaustin', 'The University of Texas at Austin', 'US', 'sunbelt', 'state', 0.29, 2, ['law', 'pharm', 'phd'], { t: 11500, oos: 42000, known: ['business', 'engineering', 'computerScience'] }),
  U('uw', 'University of Washington', 'US', 'seattle', 'state', 0.43, 2, ['med', 'law', 'dent', 'pharm', 'phd'], { t: 12900, oos: 43000, known: ['computerScience', 'nursing', 'biology'] }),
  U('osu', 'The Ohio State University', 'US', 'midcity', 'state', 0.51, 2, ['med', 'law', 'dent', 'vet', 'pharm', 'opt', 'phd'], { t: 13000, oos: 38000, known: ['agriculture', 'engineering', 'business'] }),
  U('umn', 'University of Minnesota', 'US', 'minneapolis', 'state', 0.75, 2, ['med', 'law', 'dent', 'vet', 'pharm', 'phd'], { t: 16000, oos: 37000 }),
  U('umd', 'University of Maryland, College Park', 'US', 'dc', 'state', 0.45, 2, ['phd'], { t: 11500, oos: 40000, place: 'College Park', known: ['criminalJustice', 'engineering', 'computerScience'] }),
  U('gsu', 'Georgia State University', 'US', 'atlanta', 'state', 0.73, 1, ['law'], { t: 11000, oos: 30000 }),
  U('ncstate', 'North Carolina State University', 'US', 'raleigh', 'state', 0.4, 2, ['vet', 'phd'], { t: 9100, oos: 32000, known: ['engineering', 'agriculture'] }),
  U('ucsd', 'University of California, San Diego', 'US', 'sandiego', 'state', 0.25, 2, ['med', 'pharm', 'phd'], { t: 15000, oos: 48000, known: ['biology', 'engineering', 'atmosphericScience'] }),
  U('pitt', 'University of Pittsburgh', 'US', 'pittsburgh', 'state', 0.49, 2, ['med', 'law', 'dent', 'pharm', 'phd'], { t: 21000, oos: 38000 }),
  U('temple', 'Temple University', 'US', 'philadelphia', 'state', 0.8, 1, ['med', 'law', 'dent', 'pharm'], { t: 19000, oos: 33000 }),
  U('asu', 'Arizona State University', 'US', 'phoenix', 'state', 0.9, 1, ['law', 'phd'], { t: 12000, oos: 33000, place: 'Tempe' }),
  U('utah', 'University of Utah', 'US', 'saltlake', 'state', 0.87, 1, ['med', 'law', 'pharm', 'phd'], { t: 11000, oos: 35000 }),
  U('cuboulder', 'University of Colorado Boulder', 'US', 'denver', 'state', 0.81, 2, ['law', 'phd'], { t: 13000, oos: 41000, place: 'Boulder', known: ['atmosphericScience', 'physics', 'engineering'] }),
  U('uh', 'University of Houston', 'US', 'houston', 'state', 0.66, 1, ['law', 'pharm', 'opt'], { t: 12000, oos: 28000 }),
  U('utsa', 'The University of Texas at San Antonio', 'US', 'sanantonio', 'state', 0.9, 1, [], { t: 10000, oos: 26000 }),
  U('utdallas', 'The University of Texas at Dallas', 'US', 'dallas', 'state', 0.8, 1, ['phd'], { t: 15000, oos: 39000 }),
  U('sdsu', 'San Diego State University', 'US', 'sandiego', 'state', 0.39, 1, [], { t: 8700, oos: 20000 }),
  U('unlv', 'University of Nevada, Las Vegas', 'US', 'lasvegas', 'state', 0.85, 1, ['law', 'dent'], { t: 9000, oos: 26000, known: ['hospitalityMgmt'] }),
  U('fiu', 'Florida International University', 'US', 'miami', 'state', 0.64, 1, ['med', 'law'], { t: 6500, oos: 18900 }),
  U('usf', 'University of South Florida', 'US', 'tampa', 'state', 0.41, 1, ['med', 'pharm'], { t: 6400, oos: 17300 }),
  U('unf', 'University of North Florida', 'US', 'jacksonvillefl', 'state', 0.74, 1, [], { t: 6400, oos: 20800 }),
  U('uwf', 'University of West Florida', 'US', 'pensacola', 'state', 0.6, 1, [], { t: 6400, oos: 19200 }),
  U('ohio', 'Ohio University', 'US', 'athens', 'state', 0.87, 1, ['opt'], { t: 13000, oos: 24000, known: ['communications', 'journalism'] }),
  U('tntech', 'Tennessee Tech University', 'US', 'cookeville', 'state', 0.82, 1, [], { t: 10000, oos: 24000, known: ['engineering'] }),
  U('apsu', 'Austin Peay State University', 'US', 'clarksville', 'state', 0.9, 1, [], { t: 9000, oos: 15000 }),
  U('appstate', 'Appalachian State University', 'US', 'boone', 'state', 0.89, 1, [], { t: 7600, oos: 23000 }),
  U('unca', 'University of North Carolina Asheville', 'US', 'asheville', 'state', 0.8, 1, [], { t: 7400, oos: 25000, kind: 'liberalArts' }),
  U('uncc', 'University of North Carolina at Charlotte', 'US', 'charlotte', 'state', 0.8, 1, [], { t: 7000, oos: 21000 }),
  U('fsu-nc', 'Fayetteville State University', 'US', 'fayetteville', 'state', 0.8, 1, [], { t: 5800, oos: 17800 }),
  U('odu', 'Old Dominion University', 'US', 'norfolk', 'state', 0.96, 1, [], { t: 12000, oos: 33000 }),
  U('wayne', 'Wayne State University', 'US', 'detroit', 'state', 0.78, 1, ['med', 'law', 'pharm'], { t: 15000, oos: 32000 }),
  U('uic', 'University of Illinois Chicago', 'US', 'chicago', 'state', 0.79, 1, ['med', 'dent', 'pharm'], { t: 15500, oos: 30000 }),
  U('ccny', 'The City College of New York (CUNY)', 'US', 'nyc', 'state', 0.53, 1, [], { t: 7300, oos: 15000 }),
  U('umb', 'University of Massachusetts Boston', 'US', 'boston', 'state', 0.8, 1, [], { t: 15000, oos: 37000 }),
  U('uni', 'University of Northern Iowa', 'US', 'smalltown', 'state', 0.92, 1, [], { t: 9800, oos: 21000, known: ['education'] }),
  U('western', 'Western Colorado University', 'US', 'gunnison', 'state', 0.87, 1, [], { t: 10000, oos: 23000 }),
  U('nau', 'Northern Arizona University', 'US', 'flagstaff', 'state', 0.8, 1, [], { t: 12500, oos: 28000, known: ['forestry', 'environmentalScience'] }),
  U('mtu', 'Michigan Technological University', 'US', 'houghton', 'state', 0.86, 1, ['phd'], { t: 18000, oos: 40000, kind: 'technical' }),
  U('uaf', 'University of Alaska Fairbanks', 'US', 'fairbanks', 'state', 0.73, 1, ['phd'], { t: 10000, oos: 30000, known: ['environmentalScience', 'atmosphericScience'] }),
  U('uaa', 'University of Alaska Anchorage', 'US', 'anchorage', 'state', 0.8, 1, [], { t: 9000, oos: 28000 }),
  U('uhm', 'University of Hawaiʻi at Mānoa', 'US', 'honolulu', 'state', 0.75, 1, ['med', 'law'], { t: 12000, oos: 34000 }),
  U('uhh', 'University of Hawaiʻi at Hilo', 'US', 'hilo', 'state', 0.8, 1, ['pharm'], { t: 8000, oos: 22000 }),
  U('humboldt', 'Cal Poly Humboldt', 'US', 'eureka', 'state', 0.95, 1, [], { t: 8000, oos: 20000, place: 'Arcata', known: ['environmentalScience'] }),
  U('nsula', 'Northwestern State University of Louisiana', 'US', 'natchitoches', 'state', 0.9, 1, [], { t: 9000, oos: 20000 }),
  U('uno', 'University of New Orleans', 'US', 'neworleans', 'state', 0.85, 1, [], { t: 9000, oos: 14000 }),
  U('pdx', 'Portland State University', 'US', 'portland', 'state', 0.92, 1, [], { t: 10500, oos: 29000 }),
  U('osucascades', 'Oregon State University – Cascades', 'US', 'bend', 'state', 0.85, 1, [], { t: 12000, oos: 33000 }),
  U('uccs', 'University of Colorado Colorado Springs', 'US', 'coloradosprings', 'state', 0.94, 1, [], { t: 11000, oos: 26000 }),
  U('wright', 'Wright State University', 'US', 'dayton', 'state', 0.96, 1, ['med'], { t: 11000, oos: 21000 }),
  U('uwt', 'University of Washington Tacoma', 'US', 'tacoma', 'state', 0.86, 1, [], { t: 12000, oos: 40000 }),
  U('tamuct', 'Texas A&M University–Central Texas', 'US', 'killeen', 'state', 0.95, 1, [], { t: 8000, oos: 20000 }),
  U('wtamu', 'West Texas A&M University', 'US', 'amarillo', 'state', 0.85, 1, [], { t: 8500, oos: 9800 }),
  U('valdosta', 'Valdosta State University', 'US', 'valdosta', 'state', 0.84, 1, [], { t: 6500, oos: 17000 }),
  U('csu-ga', 'Columbus State University', 'US', 'columbusga', 'state', 0.75, 1, [], { t: 7300, oos: 20000 }),
  U('weber', 'Weber State University', 'US', 'ogden', 'state', 1, 1, [], { t: 6500, oos: 18000 }),
  // Maritime academies (a license track) and the service academies (a nomination, then a commission).
  U('sunymaritime', 'SUNY Maritime College', 'US', 'nyc', 'state', 0.8, 1, ['maritime'], { t: 8500, oos: 18500, place: 'the Bronx' }),
  U('calmaritime', 'California State University Maritime Academy', 'US', 'sf', 'state', 0.8, 1, ['maritime'], { t: 7600, oos: 19500, place: 'Vallejo' }),
  U('massmaritime', 'Massachusetts Maritime Academy', 'US', 'boston', 'state', 0.85, 1, ['maritime'], { t: 11000, oos: 27000, place: 'Buzzards Bay' }),
  U('tamug', 'Texas A&M University at Galveston', 'US', 'houston', 'state', 0.9, 1, ['maritime'], { t: 11000, oos: 39000, place: 'Galveston' }),
  U('usma', 'United States Military Academy (West Point)', 'US', 'nyc', 'academy', 0.12, 3, [], { t: 0, place: 'West Point' }),
  U('usna', 'United States Naval Academy (Annapolis)', 'US', 'dc', 'academy', 0.09, 3, [], { t: 0, place: 'Annapolis' }),
  U('usafa', 'United States Air Force Academy', 'US', 'coloradosprings', 'academy', 0.13, 3, [], { t: 0 }),
  U('wgu', 'Western Governors University (online)', 'US', null, 'online', 1, 0, [], { t: 8300 }),
  U('snhu', 'Southern New Hampshire University Online', 'US', null, 'online', 1, 0, [], { t: 10000 }),

  // Canada
  U('utoronto', 'University of Toronto', 'CA', 'toronto', 'elite', 0.43, 3, [...all, 'opt']),
  U('mcgill', 'McGill University', 'CA', 'montreal', 'elite', 0.46, 3, ['med', 'law', 'dent', 'phd']),
  U('ubc', 'University of British Columbia', 'CA', 'vancouver', 'elite', 0.52, 3, all),
  U('uottawa', 'University of Ottawa', 'CA', 'ottawa', 'state', 0.65, 2, ['med', 'law', 'phd']),
  U('carleton', 'Carleton University', 'CA', 'ottawa', 'state', 0.8, 1, ['phd'], { known: ['internationalRelations', 'journalism'] }),
  U('dal', 'Dalhousie University', 'CA', 'halifax', 'state', 0.6, 2, ['med', 'law', 'dent', 'pharm']),
  U('ucalgary', 'University of Calgary', 'CA', 'calgary', 'state', 0.55, 2, ['med', 'law', 'vet', 'phd']),
  U('tmu', 'Toronto Metropolitan University', 'CA', 'toronto', 'state', 0.8, 1, ['law']),
  U('concordia', 'Concordia University', 'CA', 'montreal', 'state', 0.79, 1, []),
  U('stfx', 'St. Francis Xavier University', 'CA', 'antigonish', 'state', 0.75, 1, [], { kind: 'liberalArts' }),
  U('lakehead', 'Lakehead University', 'CA', 'thunderbay', 'state', 0.83, 1, ['law']),
  U('unbc', 'University of Northern British Columbia', 'CA', 'princegeorge', 'state', 0.8, 1, []),
  U('tru', 'Thompson Rivers University', 'CA', 'kamloops', 'state', 0.9, 1, ['law']),
  U('uqar', 'Université du Québec à Rimouski', 'CA', 'rimouski', 'state', 0.85, 1, []),
  U('rmc', 'Royal Military College of Canada', 'CA', 'ottawa', 'academy', 0.3, 3, [], { place: 'Kingston' }),
  // United Kingdom
  U('oxford', 'University of Oxford', 'GB', 'oxford', 'elite', 0.15, 3, ['med', 'law', 'phd'], { known: ['politicalScience', 'history', 'english'] }),
  U('cambridge', 'University of Cambridge', 'GB', 'cambridge', 'elite', 0.18, 3, ['med', 'vet', 'law', 'phd'], { known: ['mathematics', 'physics', 'engineering'] }),
  U('imperial', 'Imperial College London', 'GB', 'london', 'elite', 0.12, 3, ['med', 'phd'], { kind: 'technical' }),
  U('lse', 'London School of Economics', 'GB', 'london', 'elite', 0.08, 3, ['law', 'phd'], { known: ['economics', 'politicalScience', 'internationalRelations'] }),
  U('ucl', 'University College London', 'GB', 'london', 'elite', 0.3, 3, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('kcl', 'King\'s College London', 'GB', 'london', 'state', 0.13, 3, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('edinburgh', 'University of Edinburgh', 'GB', 'edinburgh', 'elite', 0.4, 3, ['med', 'law', 'vet', 'phd']),
  U('glasgow', 'University of Glasgow', 'GB', 'glasgow', 'state', 0.6, 2, ['med', 'law', 'dent', 'vet', 'phd']),
  U('manchester', 'University of Manchester', 'GB', 'manchester', 'state', 0.55, 2, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('birmingham', 'University of Birmingham', 'GB', 'birmingham', 'state', 0.6, 2, ['med', 'law', 'dent', 'phd']),
  U('cardiff', 'Cardiff University', 'GB', 'cardiff', 'state', 0.75, 2, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('qub', 'Queen\'s University Belfast', 'GB', 'belfast', 'state', 0.8, 2, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('lincolnuni', 'University of Lincoln', 'GB', 'lincoln', 'state', 0.85, 1, ['law']),
  U('aber', 'Aberystwyth University', 'GB', 'aberystwyth', 'state', 0.9, 1, ['law']),
  U('uhi', 'University of the Highlands and Islands', 'GB', 'inverness', 'state', 0.9, 1, []),
  U('falmouth', 'Falmouth University', 'GB', 'cornwall', 'state', 0.8, 1, [], { known: ['arts'] }),
  U('sandhurst', 'Royal Military Academy Sandhurst', 'GB', 'london', 'academy', 0.25, 3, [], { place: 'Camberley' }),
  // Australia
  U('usyd', 'University of Sydney', 'AU', 'sydney', 'elite', 0.3, 3, [...all, 'vet']),
  U('unsw', 'UNSW Sydney', 'AU', 'sydney', 'elite', 0.35, 3, ['med', 'law', 'phd']),
  U('unimelb', 'University of Melbourne', 'AU', 'melbourne', 'elite', 0.35, 3, ['med', 'law', 'dent', 'vet', 'phd']),
  U('monash', 'Monash University', 'AU', 'melbourne', 'state', 0.4, 2, ['med', 'law', 'pharm', 'phd']),
  U('anu', 'Australian National University', 'AU', 'canberra', 'elite', 0.35, 3, ['med', 'law', 'phd']),
  U('uq', 'University of Queensland', 'AU', 'brisbane', 'elite', 0.4, 3, [...all, 'vet']),
  U('uwa', 'University of Western Australia', 'AU', 'perth', 'state', 0.4, 2, ['med', 'law', 'dent', 'phd']),
  U('adelaide', 'Adelaide University', 'AU', 'adelaide', 'state', 0.45, 2, ['med', 'law', 'dent', 'vet', 'phd']),
  U('utas', 'University of Tasmania', 'AU', 'hobart', 'state', 0.8, 1, ['med', 'law', 'pharm']),
  U('jcu', 'James Cook University', 'AU', 'townsville', 'state', 0.8, 1, ['med', 'dent', 'vet']),
  U('cdu', 'Charles Darwin University', 'AU', 'darwin', 'state', 0.85, 1, ['law']),
  U('csu', 'Charles Sturt University', 'AU', 'waggawagga', 'state', 0.85, 1, ['vet']),
  U('unisq', 'University of Southern Queensland', 'AU', 'toowoomba', 'state', 0.9, 1, []),
  U('adfa', 'Australian Defence Force Academy', 'AU', 'canberra', 'academy', 0.2, 3, []),
  // Germany
  U('tum', 'Technical University of Munich', 'DE', 'munich', 'elite', 0.4, 3, ['med', 'phd'], { kind: 'technical' }),
  U('lmu', 'LMU Munich', 'DE', 'munich', 'elite', 0.5, 3, ['med', 'law', 'vet', 'pharm', 'phd']),
  U('hu', 'Humboldt University of Berlin', 'DE', 'berlin', 'elite', 0.5, 3, ['law', 'phd']),
  U('fu', 'Free University of Berlin (with Charité)', 'DE', 'berlin', 'state', 0.5, 2, ['med', 'law', 'vet', 'pharm', 'phd']),
  U('uhh-de', 'University of Hamburg', 'DE', 'hamburg', 'state', 0.5, 2, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('ukoeln', 'University of Cologne', 'DE', 'cologne', 'state', 0.55, 2, ['med', 'law', 'dent', 'phd']),
  U('goethe', 'Goethe University Frankfurt', 'DE', 'frankfurt', 'state', 0.6, 2, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('leipzig', 'Leipzig University', 'DE', 'leipzig', 'state', 0.6, 2, ['med', 'law', 'dent', 'vet', 'pharm', 'phd']),
  U('ustuttgart', 'University of Stuttgart', 'DE', 'stuttgart', 'state', 0.6, 2, ['phd'], { kind: 'technical' }),
  U('passau', 'University of Passau', 'DE', 'passau', 'state', 0.7, 1, ['law']),
  U('hsfulda', 'Hochschule Fulda', 'DE', 'fulda', 'technical', 0.8, 1, []),
  // France
  U('psl', 'Université PSL (École normale supérieure)', 'FR', 'paris', 'elite', 0.05, 3, ['phd']),
  U('sciencespo', 'Sciences Po', 'FR', 'paris', 'elite', 0.1, 3, ['law'], { known: ['politicalScience', 'internationalRelations'] }),
  U('polytechnique', 'École polytechnique', 'FR', 'paris', 'elite', 0.06, 3, ['phd'], { kind: 'technical', place: 'Palaiseau' }),
  U('sorbonne', 'Sorbonne Université', 'FR', 'paris', 'state', 0.6, 2, ['med', 'law', 'dent', 'phd']),
  U('saclay', 'Université Paris-Saclay', 'FR', 'paris', 'state', 0.5, 2, ['med', 'pharm', 'law', 'phd']),
  U('lyon1', 'Université Claude Bernard Lyon 1', 'FR', 'lyon', 'state', 0.7, 2, ['med', 'dent', 'pharm', 'phd']),
  U('amu', 'Aix-Marseille Université', 'FR', 'marseille', 'state', 0.75, 1, ['med', 'law', 'dent', 'pharm']),
  U('toulouse', 'Université de Toulouse (with ENVT)', 'FR', 'toulouse', 'state', 0.7, 1, ['med', 'law', 'vet', 'pharm']),
  U('ubordeaux', 'Université de Bordeaux', 'FR', 'bordeaux', 'state', 0.7, 1, ['med', 'law', 'dent', 'pharm']),
  U('unistra', 'Université de Strasbourg', 'FR', 'strasbourg', 'state', 0.7, 2, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('ulille', 'Université de Lille', 'FR', 'lille', 'state', 0.75, 1, ['med', 'law', 'dent', 'pharm']),
  U('ubo', 'Université de Bretagne Occidentale', 'FR', 'brest', 'state', 0.85, 1, ['med', 'law', 'dent']),
  U('saintcyr', 'École spéciale militaire de Saint-Cyr', 'FR', 'brest', 'academy', 0.2, 3, [], { place: 'Coëtquidan' }),
  // Italy
  U('sapienza', 'Sapienza University of Rome', 'IT', 'rome', 'state', 0.7, 2, all),
  U('luiss', 'LUISS Guido Carli', 'IT', 'rome', 'private', 0.45, 2, ['law']),
  U('bocconi', 'Bocconi University', 'IT', 'milan', 'private', 0.25, 3, ['law'], { kind: 'business', known: ['economics', 'business', 'accounting'] }),
  U('polimi', 'Politecnico di Milano', 'IT', 'milan', 'elite', 0.5, 3, ['phd'], { kind: 'technical', known: ['engineering', 'architecture', 'arts'] }),
  U('unimi', 'University of Milan', 'IT', 'milan', 'state', 0.6, 2, ['med', 'law', 'vet', 'pharm']),
  U('federico', 'University of Naples Federico II', 'IT', 'naples', 'state', 0.75, 1, ['med', 'law', 'vet', 'pharm', 'dent']),
  U('unipa', 'University of Palermo', 'IT', 'palermo', 'state', 0.8, 1, ['med', 'law', 'pharm']),
  // Japan
  U('todai', 'University of Tokyo', 'JP', 'tokyo', 'elite', 0.33, 3, ['med', 'law', 'phd']),
  U('waseda', 'Waseda University', 'JP', 'tokyo', 'private', 0.15, 2, ['law']),
  U('keio', 'Keio University', 'JP', 'tokyo', 'private', 0.18, 3, ['med', 'law', 'pharm']),
  U('osakau', 'Osaka University', 'JP', 'osaka', 'elite', 0.35, 3, ['med', 'dent', 'pharm', 'phd']),
  U('kyushu', 'Kyushu University', 'JP', 'fukuoka', 'state', 0.4, 2, ['med', 'dent', 'pharm', 'phd']),
  U('hokudai', 'Hokkaido University', 'JP', 'sapporo', 'state', 0.4, 2, ['med', 'dent', 'vet', 'pharm']),
  U('ryukyu', 'University of the Ryukyus', 'JP', 'okinawa', 'state', 0.6, 1, ['med']),
  U('obihiro', 'Obihiro University of Agriculture and Veterinary Medicine', 'JP', 'obihiro', 'state', 0.5, 1, ['vet']),
  U('nda', 'National Defense Academy of Japan', 'JP', 'yokosuka', 'academy', 0.2, 3, []),
  // South Korea
  U('snu', 'Seoul National University', 'KR', 'seoul', 'elite', 0.2, 3, [...all, 'vet']),
  U('yonsei', 'Yonsei University', 'KR', 'seoul', 'private', 0.2, 3, ['med', 'law', 'dent', 'pharm']),
  U('korea', 'Korea University', 'KR', 'seoul', 'private', 0.2, 3, ['med', 'law']),
  U('skku', 'Sungkyunkwan University', 'KR', 'suwon', 'private', 0.3, 2, ['med', 'law', 'pharm']),
  U('pnu', 'Pusan National University', 'KR', 'busan', 'state', 0.4, 2, ['med', 'law', 'dent']),
  U('postech', 'POSTECH', 'KR', 'pohang', 'elite', 0.2, 3, ['phd'], { kind: 'technical' }),
  U('jejunu', 'Jeju National University', 'KR', 'jeju', 'state', 0.6, 1, ['med', 'law', 'vet']),
  U('anu-kr', 'Andong National University', 'KR', 'andong', 'state', 0.7, 1, []),
  U('kma', 'Korea Military Academy', 'KR', 'seoul', 'academy', 0.1, 3, []),
  // Mexico
  U('unam', 'Universidad Nacional Autónoma de México (UNAM)', 'MX', 'cdmx', 'elite', 0.08, 3, ['med', 'law', 'dent', 'vet', 'phd']),
  U('ipn', 'Instituto Politécnico Nacional', 'MX', 'cdmx', 'state', 0.2, 2, ['med'], { kind: 'technical' }),
  U('itam', 'ITAM', 'MX', 'cdmx', 'private', 0.4, 3, ['law'], { known: ['economics', 'business'] }),
  U('tec', 'Tecnológico de Monterrey', 'MX', 'monterrey', 'private', 0.55, 3, ['med', 'law']),
  U('uanl', 'Universidad Autónoma de Nuevo León', 'MX', 'monterrey', 'state', 0.5, 2, ['med', 'law', 'dent', 'vet']),
  U('udg', 'Universidad de Guadalajara', 'MX', 'guadalajara', 'state', 0.4, 2, ['med', 'law']),
  U('uag', 'Universidad Autónoma de Guadalajara', 'MX', 'guadalajara', 'private', 0.7, 1, ['med']),
  U('uady', 'Universidad Autónoma de Yucatán', 'MX', 'merida', 'state', 0.4, 1, ['med', 'law', 'dent', 'vet']),
  U('uabjo', 'Universidad Autónoma Benito Juárez de Oaxaca', 'MX', 'oaxaca', 'state', 0.6, 1, ['med', 'law']),
  // Philippines
  U('upd', 'University of the Philippines', 'PH', 'manila', 'elite', 0.12, 3, [...all, 'vet']),
  U('ateneo', 'Ateneo de Manila University', 'PH', 'manila', 'private', 0.4, 3, ['med', 'law']),
  U('dlsu', 'De La Salle University', 'PH', 'manila', 'private', 0.4, 2, ['law']),
  U('ust', 'University of Santo Tomas', 'PH', 'manila', 'private', 0.5, 2, ['med', 'law', 'dent', 'pharm']),
  U('usc-ph', 'University of San Carlos', 'PH', 'cebu', 'private', 0.7, 1, ['law']),
  U('usep', 'University of Southeastern Philippines', 'PH', 'davao', 'state', 0.6, 1, []),
  // India
  U('iitb', 'Indian Institute of Technology Bombay', 'IN', 'mumbai', 'elite', 0.01, 3, ['phd'], { kind: 'technical' }),
  U('iitd', 'Indian Institute of Technology Delhi', 'IN', 'delhi', 'elite', 0.01, 3, ['phd'], { kind: 'technical' }),
  U('iitm', 'Indian Institute of Technology Madras', 'IN', 'chennai', 'elite', 0.01, 3, ['phd'], { kind: 'technical' }),
  U('iisc', 'Indian Institute of Science', 'IN', 'bengaluru', 'elite', 0.02, 3, ['phd'], { kind: 'technical' }),
  U('aiims', 'All India Institute of Medical Sciences, New Delhi', 'IN', 'delhi', 'elite', 0.01, 3, ['med', 'dent'], { kind: 'medical' }),
  U('nlsiu', 'National Law School of India University', 'IN', 'bengaluru', 'elite', 0.01, 3, ['law'], { kind: 'law' }),
  U('du', 'University of Delhi', 'IN', 'delhi', 'state', 0.3, 2, ['law', 'med']),
  U('mu', 'University of Mumbai', 'IN', 'mumbai', 'state', 0.5, 1, ['law']),
  U('unom', 'University of Madras', 'IN', 'chennai', 'state', 0.5, 1, []),
  U('cu', 'University of Calcutta', 'IN', 'kolkata', 'state', 0.4, 2, ['med', 'law']),
  U('bhu', 'Banaras Hindu University', 'IN', 'varanasi', 'state', 0.1, 2, ['med', 'law', 'dent', 'vet']),
  U('christ', 'Christ University', 'IN', 'bengaluru', 'private', 0.5, 2, ['law']),
  // New Zealand
  U('uoa', 'University of Auckland', 'NZ', 'auckland', 'elite', 0.6, 3, ['med', 'law', 'pharm', 'phd']),
  U('otago', 'University of Otago', 'NZ', 'dunedin', 'elite', 0.7, 3, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('vuw', 'Victoria University of Wellington', 'NZ', 'wellington', 'state', 0.75, 2, ['law', 'phd']),
  U('canterbury', 'University of Canterbury', 'NZ', 'christchurch', 'state', 0.8, 2, ['law', 'phd']),
  U('waikato', 'University of Waikato', 'NZ', 'hamilton', 'state', 0.85, 1, ['law']),
  // Ireland
  U('tcd', 'Trinity College Dublin', 'IE', 'dublin', 'elite', 0.3, 3, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('ucd', 'University College Dublin', 'IE', 'dublin', 'state', 0.35, 2, ['med', 'law', 'vet', 'phd']),
  U('ucc', 'University College Cork', 'IE', 'cork', 'state', 0.45, 2, ['med', 'law', 'dent', 'pharm']),
  U('galway', 'University of Galway', 'IE', 'galway', 'state', 0.5, 2, ['med', 'law']),
  U('ul', 'University of Limerick', 'IE', 'limerick', 'state', 0.5, 1, ['med', 'law']),
  U('setu', 'South East Technological University', 'IE', 'waterford', 'technical', 0.8, 1, []),
  U('atu', 'Atlantic Technological University', 'IE', 'letterkenny', 'technical', 0.85, 1, []),
  // Spain
  U('ucm', 'Universidad Complutense de Madrid', 'ES', 'madrid', 'state', 0.5, 2, [...all, 'vet']),
  U('uam', 'Universidad Autónoma de Madrid', 'ES', 'madrid', 'state', 0.4, 2, ['med', 'law']),
  U('ieu', 'IE University', 'ES', 'madrid', 'private', 0.4, 3, ['law'], { kind: 'business' }),
  U('ub', 'Universitat de Barcelona', 'ES', 'barcelona', 'state', 0.4, 2, ['med', 'law', 'dent', 'pharm']),
  U('upf', 'Universitat Pompeu Fabra', 'ES', 'barcelona', 'elite', 0.3, 3, ['law'], { known: ['economics', 'politicalScience'] }),
  U('us-es', 'Universidad de Sevilla', 'ES', 'seville', 'state', 0.5, 1, ['med', 'law', 'dent', 'pharm']),
  U('uma', 'Universidad de Málaga', 'ES', 'malaga', 'state', 0.6, 1, ['med', 'law']),
  U('uv', 'Universitat de València', 'ES', 'valenciaES', 'state', 0.5, 1, ['med', 'law', 'dent', 'pharm']),
  U('ehu', 'University of the Basque Country', 'ES', 'bilbao', 'state', 0.6, 1, ['med', 'law', 'dent']),
  U('deusto', 'Universidad de Deusto', 'ES', 'bilbao', 'private', 0.6, 2, ['law']),
  U('unizar', 'Universidad de Zaragoza', 'ES', 'zaragoza', 'state', 0.6, 1, ['med', 'law', 'vet']),
  // Netherlands
  U('uva', 'University of Amsterdam', 'NL', 'amsterdam', 'elite', 0.6, 3, ['med', 'law', 'dent', 'phd']),
  U('vu', 'Vrije Universiteit Amsterdam', 'NL', 'amsterdam', 'state', 0.7, 2, ['med', 'law', 'dent']),
  U('eur', 'Erasmus University Rotterdam', 'NL', 'rotterdam', 'elite', 0.6, 2, ['med', 'law']),
  U('leiden', 'Leiden University (The Hague campus)', 'NL', 'thehague', 'elite', 0.6, 3, ['law', 'med', 'phd'], { known: ['internationalRelations', 'history'] }),
  U('uu', 'Utrecht University', 'NL', 'utrecht', 'elite', 0.6, 3, ['med', 'law', 'vet', 'pharm', 'phd']),
  U('tue', 'Eindhoven University of Technology', 'NL', 'eindhoven', 'state', 0.6, 2, ['phd'], { kind: 'technical' }),
  U('rug', 'University of Groningen', 'NL', 'groningen', 'state', 0.7, 2, ['med', 'law', 'dent', 'pharm']),
  U('radboud', 'Radboud University', 'NL', 'nijmegen', 'state', 0.7, 2, ['med', 'law', 'dent']),
  // Sweden
  U('ki', 'Karolinska Institutet', 'SE', 'stockholm', 'elite', 0.1, 3, ['med', 'dent', 'phd'], { kind: 'medical' }),
  U('kth', 'KTH Royal Institute of Technology', 'SE', 'stockholm', 'elite', 0.4, 3, ['phd'], { kind: 'technical' }),
  U('su', 'Stockholm University', 'SE', 'stockholm', 'state', 0.5, 2, ['law', 'phd']),
  U('uu-se', 'Uppsala University', 'SE', 'uppsala', 'elite', 0.4, 3, ['med', 'law', 'pharm', 'phd']),
  U('slu', 'Swedish University of Agricultural Sciences', 'SE', 'uppsala', 'state', 0.4, 2, ['vet']),
  U('lund', 'Lund University', 'SE', 'malmo', 'elite', 0.4, 3, ['med', 'law', 'phd'], { place: 'Lund' }),
  U('gu', 'University of Gothenburg', 'SE', 'gothenburg', 'state', 0.5, 2, ['med', 'law', 'dent']),
  U('chalmers', 'Chalmers University of Technology', 'SE', 'gothenburg', 'elite', 0.4, 2, ['phd'], { kind: 'technical' }),
  U('liu', 'Linköping University', 'SE', 'linkoping', 'state', 0.5, 1, ['med']),
  U('umu', 'Umeå University', 'SE', 'umea', 'state', 0.6, 1, ['med', 'dent']),
  // Brazil
  U('usp', 'Universidade de São Paulo', 'BR', 'saopaulo', 'elite', 0.05, 3, [...all, 'vet']),
  U('unicamp', 'Universidade Estadual de Campinas', 'BR', 'saopaulo', 'elite', 0.05, 3, ['med', 'dent', 'phd'], { place: 'Campinas' }),
  U('fgv', 'Fundação Getulio Vargas', 'BR', 'saopaulo', 'private', 0.15, 3, ['law'], { kind: 'business' }),
  U('ufrj', 'Universidade Federal do Rio de Janeiro', 'BR', 'riodejaneiro', 'elite', 0.07, 2, [...all, 'vet']),
  U('pucrio', 'PUC-Rio', 'BR', 'riodejaneiro', 'private', 0.4, 2, ['law']),
  U('ufmg', 'Universidade Federal de Minas Gerais', 'BR', 'belohorizonte', 'elite', 0.07, 2, [...all, 'vet']),
  U('unb', 'Universidade de Brasília', 'BR', 'brasilia', 'state', 0.08, 2, ['med', 'law', 'dent']),
  U('ufrgs', 'Universidade Federal do Rio Grande do Sul', 'BR', 'portoalegre', 'state', 0.08, 2, [...all, 'vet']),
  U('ufpe', 'Universidade Federal de Pernambuco', 'BR', 'recife', 'state', 0.1, 1, ['med', 'law', 'dent']),
  U('ufba', 'Universidade Federal da Bahia', 'BR', 'salvador', 'state', 0.1, 1, ['med', 'law', 'dent', 'vet']),
  U('ufop', 'Universidade Federal de Ouro Preto', 'BR', 'ouropreto', 'state', 0.2, 1, ['pharm']),
  // Singapore
  U('nus', 'National University of Singapore', 'SG', 'sgcentral', 'elite', 0.05, 3, all),
  U('ntu', 'Nanyang Technological University', 'SG', 'jurongwest', 'elite', 0.1, 3, ['med', 'phd'], { kind: 'technical' }),
  U('smu-sg', 'Singapore Management University', 'SG', 'sgcentral', 'state', 0.15, 2, ['law'], { kind: 'business' }),
  U('sutd', 'Singapore University of Technology and Design', 'SG', 'tampines', 'state', 0.3, 2, [], { kind: 'technical' }),
  // Israel
  U('huji', 'Hebrew University of Jerusalem', 'IL', 'jerusalem', 'elite', 0.4, 3, [...all, 'vet']),
  U('tau', 'Tel Aviv University', 'IL', 'telaviv', 'elite', 0.4, 3, ['med', 'law', 'dent', 'phd']),
  U('technion', 'Technion – Israel Institute of Technology', 'IL', 'haifa', 'elite', 0.3, 3, ['med', 'phd'], { kind: 'technical' }),
  U('haifa', 'University of Haifa', 'IL', 'haifa', 'state', 0.6, 2, ['law']),
  U('bgu', 'Ben-Gurion University of the Negev', 'IL', 'beersheba', 'state', 0.6, 2, ['med', 'phd']),
  U('reichman', 'Reichman University', 'IL', 'telaviv', 'private', 0.6, 2, ['law']),
  // China
  U('pku', 'Peking University', 'CN', 'beijing', 'elite', 0.002, 3, all),
  U('tsinghua', 'Tsinghua University', 'CN', 'beijing', 'elite', 0.002, 3, ['law', 'med', 'phd'], { known: ['engineering', 'computerScience', 'architecture'] }),
  U('fudan', 'Fudan University', 'CN', 'shanghai', 'elite', 0.003, 3, ['med', 'law', 'pharm', 'phd']),
  U('sjtu', 'Shanghai Jiao Tong University', 'CN', 'shanghai', 'elite', 0.003, 3, ['med', 'dent', 'phd']),
  U('zju', 'Zhejiang University', 'CN', 'hangzhou', 'elite', 0.005, 3, ['med', 'law', 'phd']),
  U('whu', 'Wuhan University', 'CN', 'wuhan', 'state', 0.01, 2, ['med', 'law', 'dent']),
  U('scu', 'Sichuan University', 'CN', 'chengdu', 'state', 0.01, 2, ['med', 'law', 'dent', 'pharm']),
  U('sysu', 'Sun Yat-sen University', 'CN', 'guangzhou', 'state', 0.01, 2, ['med', 'law', 'dent', 'pharm']),
  U('szu', 'Shenzhen University', 'CN', 'shenzhen', 'state', 0.05, 1, ['law']),
  // South Africa
  U('uct', 'University of Cape Town', 'ZA', 'capetown', 'elite', 0.2, 3, ['med', 'law', 'phd']),
  U('wits', 'University of the Witwatersrand', 'ZA', 'johannesburg', 'elite', 0.15, 3, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('uppr', 'University of Pretoria', 'ZA', 'pretoria', 'state', 0.3, 2, ['med', 'law', 'dent', 'vet']),
  U('ukzn', 'University of KwaZulu-Natal', 'ZA', 'durban', 'state', 0.3, 2, ['med', 'law', 'dent', 'pharm']),
  U('sun', 'Stellenbosch University', 'ZA', 'capetown', 'elite', 0.3, 2, ['med', 'law'], { place: 'Stellenbosch' }),
  U('ufs', 'University of the Free State', 'ZA', 'bloemfontein', 'state', 0.4, 1, ['med', 'law']),
  U('nmu', 'Nelson Mandela University', 'ZA', 'gqeberha', 'state', 0.6, 1, ['law', 'pharm']),
  U('wsu', 'Walter Sisulu University', 'ZA', 'mthatha', 'state', 0.6, 1, ['med']),
  // Nigeria
  U('unilag', 'University of Lagos', 'NG', 'lagos', 'elite', 0.1, 2, ['med', 'law', 'dent', 'pharm']),
  U('ui', 'University of Ibadan', 'NG', 'ibadan', 'elite', 0.1, 3, [...all, 'vet']),
  U('uniabuja', 'University of Abuja', 'NG', 'abuja', 'state', 0.2, 1, ['med', 'law', 'vet']),
  U('buk', 'Bayero University Kano', 'NG', 'kano', 'state', 0.2, 1, ['med', 'law']),
  U('uniport', 'University of Port Harcourt', 'NG', 'portharcourt', 'state', 0.2, 1, ['med', 'law', 'dent', 'pharm']),
  U('unn', 'University of Nigeria, Nsukka', 'NG', 'nsukka', 'state', 0.2, 2, ['med', 'law', 'vet', 'pharm']),
  // Kenya
  U('uon', 'University of Nairobi', 'KE', 'nairobi', 'elite', 0.3, 3, [...all, 'vet']),
  U('ku-ke', 'Kenyatta University', 'KE', 'nairobi', 'state', 0.5, 2, ['med', 'law', 'pharm']),
  U('strathmore', 'Strathmore University', 'KE', 'nairobi', 'private', 0.5, 2, ['law'], { kind: 'business' }),
  U('moi', 'Moi University', 'KE', 'eldoret', 'state', 0.6, 2, ['med', 'law']),
  U('egerton', 'Egerton University', 'KE', 'nakuru', 'state', 0.6, 1, ['vet'], { place: 'Njoro' }),
  U('maseno', 'Maseno University', 'KE', 'kisumu', 'state', 0.7, 1, ['med']),
  U('tum-ke', 'Technical University of Mombasa', 'KE', 'mombasa', 'technical', 0.8, 1, []),
  // Switzerland and Austria
  U('eth', 'ETH Zurich', 'CH', 'zurich', 'elite', 0.6, 3, ['pharm', 'phd'], { kind: 'technical' }),
  U('uzh', 'University of Zurich', 'CH', 'zurich', 'elite', 0.8, 3, ['med', 'law', 'dent', 'vet', 'phd']),
  U('epfl', 'EPFL', 'CH', 'lausanne', 'elite', 0.7, 3, ['phd'], { kind: 'technical' }),
  U('unil', 'University of Lausanne', 'CH', 'lausanne', 'state', 0.8, 2, ['med', 'law']),
  U('unige', 'University of Geneva', 'CH', 'geneva', 'state', 0.8, 2, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('iheid', 'Geneva Graduate Institute', 'CH', 'geneva', 'elite', 0.5, 3, ['phd'], { kind: 'grad', known: ['internationalRelations', 'economics'] }),
  U('unibe', 'University of Bern', 'CH', 'bern', 'state', 0.8, 2, ['med', 'law', 'dent', 'vet']),
  U('usi', 'Università della Svizzera italiana', 'CH', 'lugano', 'state', 0.7, 2, ['med']),
  U('univie', 'University of Vienna', 'AT', 'vienna', 'elite', 0.6, 3, ['law', 'pharm', 'phd']),
  U('meduniwien', 'Medical University of Vienna', 'AT', 'vienna', 'elite', 0.12, 3, ['med', 'dent'], { kind: 'medical' }),
  U('tuwien', 'TU Wien', 'AT', 'vienna', 'elite', 0.7, 2, ['phd'], { kind: 'technical' }),
  U('vetmeduni', 'University of Veterinary Medicine Vienna', 'AT', 'vienna', 'state', 0.2, 2, ['vet'], { kind: 'medical' }),
  U('unigraz', 'University of Graz', 'AT', 'graz', 'state', 0.7, 2, ['med', 'law', 'dent', 'pharm']),
  U('uibk', 'University of Innsbruck', 'AT', 'innsbruck', 'state', 0.7, 2, ['med', 'law', 'dent', 'pharm']),
  U('plus', 'University of Salzburg', 'AT', 'salzburg', 'state', 0.75, 1, ['law']),
  // Belgium, the Nordics, Poland
  U('ulb', 'Université libre de Bruxelles', 'BE', 'brussels', 'elite', 0.7, 2, [...all, 'vet']),
  U('vub', 'Vrije Universiteit Brussel', 'BE', 'brussels', 'state', 0.75, 2, ['med', 'law', 'dent', 'pharm']),
  U('uantwerp', 'University of Antwerp', 'BE', 'antwerp', 'state', 0.7, 2, ['med', 'law', 'pharm']),
  U('umons', 'University of Mons', 'BE', 'mons', 'state', 0.8, 1, ['med', 'law']),
  U('ucph', 'University of Copenhagen', 'DK', 'copenhagen', 'elite', 0.4, 3, [...all, 'vet']),
  U('dtu', 'Technical University of Denmark', 'DK', 'copenhagen', 'elite', 0.5, 3, ['phd'], { kind: 'technical' }),
  U('cbs', 'Copenhagen Business School', 'DK', 'copenhagen', 'state', 0.3, 2, [], { kind: 'business' }),
  U('au-dk', 'Aarhus University', 'DK', 'aarhus', 'elite', 0.45, 2, ['med', 'law', 'dent']),
  U('aau', 'Aalborg University', 'DK', 'aalborg', 'state', 0.6, 1, ['med']),
  U('uio', 'University of Oslo', 'NO', 'oslo', 'elite', 0.4, 3, ['med', 'law', 'dent', 'pharm', 'phd']),
  U('bi', 'BI Norwegian Business School', 'NO', 'oslo', 'private', 0.6, 2, [], { kind: 'business' }),
  U('uib', 'University of Bergen', 'NO', 'bergen', 'state', 0.5, 2, ['med', 'law', 'dent']),
  U('ntnu', 'Norwegian University of Science and Technology', 'NO', 'trondheim', 'elite', 0.5, 2, ['med', 'phd']),
  U('uit', 'UiT The Arctic University of Norway', 'NO', 'tromso', 'state', 0.7, 1, ['med', 'law', 'dent', 'pharm']),
  U('uw-pl', 'University of Warsaw', 'PL', 'warsaw', 'elite', 0.3, 3, ['law', 'phd']),
  U('wum', 'Medical University of Warsaw', 'PL', 'warsaw', 'state', 0.2, 2, ['med', 'dent', 'pharm'], { kind: 'medical' }),
  U('pw', 'Warsaw University of Technology', 'PL', 'warsaw', 'state', 0.4, 2, [], { kind: 'technical' }),
  U('uj', 'Jagiellonian University', 'PL', 'krakow', 'elite', 0.3, 3, ['med', 'law', 'pharm']),
  U('agh', 'AGH University of Kraków', 'PL', 'krakow', 'state', 0.5, 2, [], { kind: 'technical' }),
  U('ug', 'University of Gdańsk', 'PL', 'gdansk', 'state', 0.5, 1, ['law']),
  U('gumed', 'Medical University of Gdańsk', 'PL', 'gdansk', 'state', 0.3, 1, ['med', 'dent', 'pharm'], { kind: 'medical' }),
  // Turkey, Russia, the Gulf, Egypt
  U('bogazici', 'Boğaziçi University', 'TR', 'istanbul', 'elite', 0.01, 3, []),
  U('iu', 'Istanbul University', 'TR', 'istanbul', 'state', 0.1, 2, [...all, 'vet']),
  U('itu', 'Istanbul Technical University', 'TR', 'istanbul', 'elite', 0.02, 3, ['phd'], { kind: 'technical' }),
  U('koc', 'Koç University', 'TR', 'istanbul', 'private', 0.01, 3, ['med', 'law']),
  U('metu', 'Middle East Technical University', 'TR', 'ankara', 'elite', 0.02, 3, ['phd'], { kind: 'technical' }),
  U('hacettepe', 'Hacettepe University', 'TR', 'ankara', 'state', 0.03, 2, ['med', 'dent', 'pharm']),
  U('bilkent', 'Bilkent University', 'TR', 'ankara', 'private', 0.03, 3, ['law']),
  U('ege', 'Ege University', 'TR', 'izmir', 'state', 0.05, 2, ['med', 'dent', 'pharm']),
  U('msu', 'Lomonosov Moscow State University', 'RU', 'moscow', 'elite', 0.1, 3, ['med', 'law', 'phd']),
  U('hse', 'HSE University', 'RU', 'moscow', 'elite', 0.15, 3, ['law'], { kind: 'business' }),
  U('mipt', 'Moscow Institute of Physics and Technology', 'RU', 'moscow', 'elite', 0.1, 3, ['phd'], { kind: 'technical' }),
  U('spbu', 'Saint Petersburg State University', 'RU', 'stpetersburg', 'elite', 0.15, 3, ['med', 'law', 'dent']),
  U('nsu-ru', 'Novosibirsk State University', 'RU', 'novosibirsk', 'elite', 0.2, 2, ['med', 'phd']),
  U('urfu', 'Ural Federal University', 'RU', 'yekaterinburg', 'state', 0.3, 1, ['law']),
  U('nyuad', 'New York University Abu Dhabi', 'AE', 'abudhabi', 'private', 0.04, 3, []),
  U('khalifa', 'Khalifa University', 'AE', 'abudhabi', 'elite', 0.4, 2, ['med', 'phd'], { kind: 'technical' }),
  U('uaeu', 'United Arab Emirates University', 'AE', 'alain', 'state', 0.6, 2, ['med', 'law']),
  U('aus', 'American University of Sharjah', 'AE', 'sharjah', 'private', 0.6, 2, []),
  U('ksu', 'King Saud University', 'SA', 'riyadh', 'elite', 0.3, 3, all),
  U('kau', 'King Abdulaziz University', 'SA', 'jeddah', 'state', 0.3, 2, ['med', 'law', 'dent', 'pharm']),
  U('kaust', 'King Abdullah University of Science and Technology', 'SA', 'jeddah', 'elite', 0.2, 3, ['phd'], { kind: 'grad', place: 'Thuwal' }),
  U('kfupm', 'King Fahd University of Petroleum and Minerals', 'SA', 'dammam', 'elite', 0.2, 3, [], { kind: 'technical', place: 'Dhahran' }),
  U('cairo', 'Cairo University', 'EG', 'cairo', 'elite', 0.3, 3, [...all, 'vet']),
  U('auc', 'The American University in Cairo', 'EG', 'cairo', 'private', 0.5, 3, []),
  U('asu-eg', 'Ain Shams University', 'EG', 'cairo', 'state', 0.3, 2, ['med', 'law', 'dent', 'pharm']),
  U('alexu', 'Alexandria University', 'EG', 'alexandria', 'state', 0.3, 2, [...all, 'vet']),
  // East and South-East Asia, South America, South Asia
  U('ntu-tw', 'National Taiwan University', 'TW', 'taipei', 'elite', 0.1, 3, [...all, 'vet']),
  U('nccu', 'National Chengchi University', 'TW', 'taipei', 'state', 0.2, 2, ['law']),
  U('nsysu', 'National Sun Yat-sen University', 'TW', 'kaohsiung', 'state', 0.3, 2, ['law']),
  U('kmu', 'Kaohsiung Medical University', 'TW', 'kaohsiung', 'private', 0.2, 2, ['med', 'dent', 'pharm'], { kind: 'medical' }),
  U('nchu', 'National Chung Hsing University', 'TW', 'taichung', 'state', 0.3, 2, ['law', 'vet']),
  U('um', 'Universiti Malaya', 'MY', 'kualalumpur', 'elite', 0.3, 3, all),
  U('ukm', 'Universiti Kebangsaan Malaysia', 'MY', 'kualalumpur', 'state', 0.35, 2, ['med', 'law', 'dent', 'pharm']),
  U('usm', 'Universiti Sains Malaysia', 'MY', 'georgetown', 'state', 0.35, 2, ['med', 'dent', 'pharm']),
  U('uitm', 'Universiti Teknologi MARA', 'MY', 'shahalam', 'state', 0.5, 1, ['med', 'law', 'dent', 'pharm']),
  U('chula', 'Chulalongkorn University', 'TH', 'bangkok', 'elite', 0.1, 3, [...all, 'vet']),
  U('mahidol', 'Mahidol University', 'TH', 'bangkok', 'elite', 0.1, 3, ['med', 'dent', 'pharm', 'vet']),
  U('tu-th', 'Thammasat University', 'TH', 'bangkok', 'state', 0.15, 2, ['law', 'med']),
  U('cmu-th', 'Chiang Mai University', 'TH', 'chiangmai', 'state', 0.2, 2, [...all, 'vet']),
  U('ui-id', 'Universitas Indonesia', 'ID', 'jakarta', 'elite', 0.03, 3, all, { place: 'Depok' }),
  U('itb', 'Institut Teknologi Bandung', 'ID', 'bandung', 'elite', 0.03, 3, ['pharm', 'phd'], { kind: 'technical' }),
  U('unpad', 'Universitas Padjadjaran', 'ID', 'bandung', 'state', 0.05, 2, ['med', 'law', 'dent', 'pharm']),
  U('unair', 'Universitas Airlangga', 'ID', 'surabaya', 'state', 0.05, 2, [...all, 'vet']),
  U('udayana', 'Universitas Udayana', 'ID', 'denpasar', 'state', 0.1, 1, ['med', 'law', 'dent', 'vet']),
  U('uba', 'Universidad de Buenos Aires', 'AR', 'buenosaires', 'elite', 1, 3, [...all, 'vet']),
  U('utdt', 'Universidad Torcuato Di Tella', 'AR', 'buenosaires', 'private', 0.5, 2, ['law']),
  U('unc-ar', 'Universidad Nacional de Córdoba', 'AR', 'cordoba', 'state', 1, 2, [...all, 'vet']),
  U('nust', 'National University of Sciences and Technology', 'PK', 'islamabad', 'elite', 0.1, 3, ['med'], { kind: 'technical' }),
  U('qau', 'Quaid-i-Azam University', 'PK', 'islamabad', 'elite', 0.2, 2, ['phd']),
  U('lums', 'Lahore University of Management Sciences', 'PK', 'lahore', 'private', 0.1, 3, ['law'], { kind: 'business' }),
  U('aku', 'Aga Khan University', 'PK', 'karachi', 'private', 0.05, 3, ['med'], { kind: 'medical' }),
  U('kemu', 'King Edward Medical University', 'PK', 'lahore', 'state', 0.05, 2, ['med'], { kind: 'medical' }),
  U('pu', 'University of the Punjab', 'PK', 'lahore', 'state', 0.3, 2, ['law', 'pharm']),
];

/** Program → the professional school it needs (named universities only). */
const PRO_OF = { md: 'med', do: 'med', mdphd: 'med', imd: 'med', jd: 'law', jdmba: 'law', dds: 'dent', dvm: 'vet', pharmd: 'pharm', od: 'opt', maritimeAcademy: 'maritime', paMaster: 'med', crnaProgram: 'med', phd: 'phd' };
const STEM = ['engineering', 'computerScience', 'physics', 'chemistry', 'mathematics', 'architecture', 'biology', 'environmentalScience', 'atmosphericScience', 'geomatics', 'aviation', 'marineTransportation', 'agriculture', 'economics'];
const HEALTH_PROGRAMS = ['md', 'do', 'mdphd', 'imd', 'dds', 'dvm', 'pharmd', 'paMaster', 'crnaProgram', 'mph', 'dpt', 'mot', 'od'];
const GRAD_TYPES = ['master', 'doctorate', 'professional'];
const NOT_TECHNICAL = ['msw', 'seminary', 'counselingMaster', 'mls', 'slpMaster', 'psyd', 'dc', 'od', 'dpt', 'mot', 'dieteticsMS', 'teacherPrep', 'paralegal', 'jd', 'jdmba'];

const UNI_TYPES = ['elite', 'state', 'private'];
const typeOk = (uni, p) => p.schools.includes(uni.type) || (UNI_TYPES.includes(uni.type) && p.schools.some((s) => UNI_TYPES.includes(s)));

/** Does this university teach this program (and this major)? */
export function offers(uni, programId, major = null) {
  const p = PROGRAMS[programId];
  if (!p || !uni) return false;
  if (p.usOnly && uni.country !== 'US') return false;
  if (programId === 'imd') return Boolean(uni.offshore);
  if (uni.offshore) return programId === 'imd';
  if (!typeOk(uni, p)) return false;
  const need = PRO_OF[programId];
  if (uni.named && need && !uni.pro.includes(need)) return false;
  if (uni.pro.includes('maritime') && !['maritimeAcademy', 'bachelor', 'master'].includes(programId)) return false;
  switch (uni.kind) {
    case 'technical': if ((major && !STEM.includes(major)) || NOT_TECHNICAL.includes(programId)) return false; break;
    case 'liberalArts': if (p.type !== 'bachelor') return false; break;
    case 'medical': if (!HEALTH_PROGRAMS.includes(programId) && programId !== 'phd') return false; break;
    case 'law': if (!['jd', 'jdmba'].includes(programId)) return false; break;
    case 'grad': if (!GRAD_TYPES.includes(p.type)) return false; break;
    case 'business': if (major && !['business', 'economics', 'accounting', 'marketing', 'supplyChain', 'politicalScience', 'internationalRelations', 'mathematics', 'computerScience'].includes(major)) return false; if (HEALTH_PROGRAMS.includes(programId)) return false; break;
    default:
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* The catalogue: named universities and local colleges               */
/* ------------------------------------------------------------------ */

const town = (regionId) => REGIONS[regionId]?.name.split(',')[0] ?? '';
const regionsOf = (cc) => (cc === 'US' ? Object.values(REGIONS) : Object.getOwnPropertyNames(REGIONS).map((id) => REGIONS[id]).filter((r) => r?.country === cc));

export const UNIVERSITIES = {};
for (const u of NAMED) UNIVERSITIES[u.id] = { ...u, named: true };

const generated = {};
/** Every college in a country: named universities, then each city's community and technical college, and an online university. */
export function universitiesIn(cc = 'US') {
  if (generated[cc]) return generated[cc];
  const names = { community: 'Community College', technical: 'Technical College', ...(cc === 'US' ? {} : EDUCATION[cc]?.schools ?? {}) };
  const out = Object.values(UNIVERSITIES).filter((u) => u.country === cc && !u.offshore);
  const cities = regionsOf(cc);
  const add = (u) => { UNIVERSITIES[u.id] = u; out.push(u); };
  for (const r of cities) {
    if (r.size === 'small' && cc !== 'US' && cities.length > 6 && r !== cities[0]) continue;
    add({ id: `cc_${r.id}`, name: cc === 'US' ? `${town(r.id)} Community College` : `${names.community} — ${town(r.id)}`, country: cc, region: r.id, type: 'community', accept: 1, prestige: 0, pro: [], local: true });
    if (r.size !== 'small' || r === cities[0]) add({ id: `tc_${r.id}`, name: cc === 'US' ? `${town(r.id)} Technical College` : `${names.technical} — ${town(r.id)}`, country: cc, region: r.id, type: 'technical', accept: 1, prestige: 0, pro: [], local: true });
  }
  if (!out.some((u) => u.type === 'online')) add({ id: `online_${cc}`, name: cc === 'US' ? 'Summit Online University' : EDUCATION[cc]?.schools?.online ?? `${COUNTRIES[cc]?.name ?? cc} Open University`, country: cc, region: null, type: 'online', accept: 1, prestige: 0, pro: [] });
  // Countries without a named list: their own universities by name, in the capital and the second city.
  const capital = cities[0]?.id ?? null;
  const second = cities[1]?.id ?? capital;
  const generic = { elite: [capital, 0.25, 3], state: [capital, 0.6, 1], private: [second, 0.7, 1], academy: [capital, 0.2, 3] };
  for (const [type, [region, accept, prestige]] of Object.entries(generic)) {
    if (out.some((u) => u.type === type) || !region) continue;
    const name = cc === 'US' ? null : EDUCATION[cc]?.schools?.[type];
    if ((!name && type !== 'state') || out.some((u) => u.name === name)) continue;
    add({ id: `${type}_${cc}`, name: name ?? `National University of ${COUNTRIES[cc]?.name ?? cc}`, country: cc, region, type, accept, prestige, pro: [] });
  }
  // A regional public university in each big city that has none.
  for (const r of cities.filter((x) => ['large', 'mega', 'enterprise'].includes(x.size))) {
    if (out.some((u) => u.region === r.id && UNI_TYPES.includes(u.type))) continue;
    add({ id: `state_${r.id}`, name: cc === 'US' ? `${town(r.id)} State University` : `${EDUCATION[cc]?.schools?.state ?? 'University'} — ${town(r.id)}`, country: cc, region: r.id, type: 'state', accept: 0.75, prestige: 1, pro: [] });
  }
  generated[cc] = out;
  return out;
}

export const universityOf = (id) => {
  if (UNIVERSITIES[id]) return UNIVERSITIES[id];
  const m = /^(?:cc|tc|state)_(.+)$|^(?:online|elite|private|academy|state)_([A-Z]{2})$/.exec(id ?? '');
  if (!m) return null;
  const cc = m[2] ?? REGIONS[m[1]]?.country ?? 'US';
  universitiesIn(cc);
  return UNIVERSITIES[id] ?? null;
};

/** Where a university is, for people: "Oxford", "Ann Arbor", "online". */
export const placeOf = (uni) => (uni.region ? uni.place ?? town(uni.region) : uni.offshore ? 'Grenada, then US hospitals' : 'online');

/** The local stand-in for a school type (the old SCHOOLS ids): your city's college, or the nearest of that type. */
export function defaultUniversity(state, typeId, programId = null, major = null) {
  const cc = state.character.countryId ?? 'US';
  const here = state.character.regionId;
  const province = REGIONS[here]?.state;
  const list = universitiesIn(cc).filter((u) => u.type === typeId && (!programId || offers(u, programId, major)));
  // Nearest first (your city, then your state or province), general universities before specialist ones.
  const rank = (u) => (u.region === here ? 0 : !u.region ? 1 : REGIONS[u.region]?.state === province ? 2 : 3) * 10 + (u.kind ? 1 : 0);
  return list.sort((a, b) => rank(a) - rank(b) || b.accept - a.accept)[0] ?? null;
}

/** The universities you could apply to for a program: at home (yours first), then famous ones abroad. */
export function universitiesFor(state, programId, { abroad = true } = {}) {
  const cc = state.character.countryId ?? 'US';
  const here = state.character.regionId;
  const p = PROGRAMS[programId];
  const home = universitiesIn(cc).filter((u) => offers(u, programId) && (!u.local || u.region === here));
  // Local colleges elsewhere in the country, if your own city has none of that type.
  for (const type of ['community', 'technical']) {
    if (!p.schools.includes(type) || home.some((u) => u.type === type)) continue;
    const near = defaultUniversity(state, type, programId);
    if (near) home.push(near);
  }
  if (programId === 'imd') home.push(UNIVERSITIES.sgu);
  home.sort((a, b) => (b.region === here) - (a.region === here) || b.prestige - a.prestige || a.name.localeCompare(b.name));
  const broad = ['bachelor', 'master', 'mba', 'phd'].includes(programId);
  // The world's best-known universities, two from each country at most.
  const perCountry = {};
  const intl = abroad && broad
    ? Object.values(UNIVERSITIES).filter((u) => u.named && u.country !== cc && u.prestige >= 3 && u.type !== 'academy' && !u.kind && offers(u, programId))
      .sort((a, b) => a.accept - b.accept).filter((u) => (perCountry[u.country] = (perCountry[u.country] ?? 0) + 1) <= 2).slice(0, 16)
    : [];
  return [...home.slice(0, broad ? 40 : 25), ...intl];
}
