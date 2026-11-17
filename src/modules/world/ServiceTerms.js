/**
 * Police, fire and veterans' words abroad (merged into the country swaps in Countries.js
 * localizeTerms). The game's uniformed content is written with American words: SWAT, K-9,
 * precincts, troopers, the police academy, the grand jury, the VA. Abroad these become the
 * local thing, with the real unit's name where a country has a well-known one.
 *
 * Capitalised "Trooper" is left alone: it is a real army rank in Britain and the Commonwealth.
 */

/** Everywhere outside the US. Longer phrases win (Countries.js sorts by length). */
export const SERVICE_ABROAD = {
  // Armed and tactical units.
  'SWAT team': 'tactical firearms team', 'a SWAT callout': 'an armed callout', 'wait for SWAT': 'wait for armed officers', SWAT: 'armed police',
  // Dogs.
  'K-9 SUV with kennel insert': 'dog van with kennel cages', 'Explosives-detection K-9 vehicles': 'Explosives-detection dog vans', 'K-9 vehicles': 'dog vans', 'K-9 unit': 'dog unit',
  'K-9 found him': 'The police dog found him', 'K-9': 'police dog', K9: 'dog unit',
  // Stations, not precincts (an American election's polling precinct is a polling station).
  'run a precinct from': 'run a polling station from', 'Police precinct (build with a bond)': 'Police station (build with a bond)', 'Downtown precinct': 'City-centre station',
  precincts: 'stations', precinct: 'station', Precincts: 'Stations', Precinct: 'Station',
  // Troopers are a US state-police word (lower case only: see above).
  'the trooper academy': 'police training', 'senior troopers': 'senior officers', troopers: 'officers', trooper: 'officer',
  // Training.
  'the state police academy': 'the police training college', 'the police academy': 'the police training college', 'police academy': 'police training college', 'Police academy': 'Police training college',
  // No grand juries outside the US: prosecutors decide.
  'an internal affairs review and a grand jury': 'a professional-standards investigation and a prosecutors\' review',
  'The grand jury declined to indict': 'Prosecutors declined to charge', 'the grand jury minutes': 'the inquiry transcript', 'grand jury': 'prosecutors\' review',
  // Veterans: a ministry or veterans' agency, not the VA.
  'Disability benefits and VA/pension where eligible': 'Disability benefits and a pension where eligible',
  'VA disability compensation': 'veterans\' disability pension', 'service-connected disability rating': 'service-related disability assessment', 'a VA claim': 'a veterans\' disability claim',
  'The VA confirmed': 'The veterans\' agency confirmed', 'The VA changed': 'The veterans\' agency changed', 'The VA set': 'The veterans\' agency set', 'the VA': 'the veterans\' agency', 'VA rating': 'disability assessment',
};

/** The tactical unit's real name, the dog unit, and the training college, by country. */
const UNITS = {
  GB: { swat: 'armed police', team: 'firearms team', dog: 'dog section', academy: 'police training centre' },
  IE: { swat: 'the Armed Support Unit', team: 'Armed Support Unit team', dog: 'Garda Dog Unit', academy: 'Garda College, Templemore' },
  AU: { swat: 'the Tactical Response Group', team: 'Tactical Response Group team', academy: 'police academy' },
  NZ: { swat: 'the Armed Offenders Squad', team: 'Armed Offenders Squad team', dog: 'dog section', academy: 'Royal New Zealand Police College' },
  CA: { swat: 'the Emergency Task Force', team: 'Emergency Task Force team', academy: 'police college' },
  FR: { swat: 'the BRI', team: 'BRI team', dog: 'brigade cynophile', academy: 'école de police' },
  DE: { swat: 'the SEK', team: 'SEK team', dog: 'Diensthundestaffel', academy: 'Polizeischule' },
  AT: { swat: 'Cobra', team: 'Cobra team', academy: 'police training centre' },
  IT: { swat: 'the NOCS', team: 'NOCS team', dog: 'unità cinofila', academy: 'scuola allievi agenti' },
  ES: { swat: 'the GEO', team: 'GEO team', academy: 'police academy, Ávila' },
  NL: { swat: 'the DSI', team: 'DSI team', academy: 'Police Academy, Apeldoorn' },
  JP: { swat: 'the SAT', team: 'SAT team', academy: 'prefectural police school' },
  IN: { swat: 'the Quick Response Team', team: 'Quick Response Team', academy: 'police training college' },
  BR: { swat: 'the BOPE', team: 'BOPE team', academy: 'academia de polícia' },
  ZA: { swat: 'the Special Task Force', team: 'Special Task Force team', academy: 'police college' },
  SG: { swat: 'the STAR unit', team: 'STAR team', academy: 'Home Team Academy' },
  IL: { swat: 'the Yamam', team: 'Yamam team', academy: 'National Police Academy' },
};

/** A country's own service words, built from its units (Countries.js merges these over SERVICE_ABROAD). */
export const SERVICE_TERMS = Object.fromEntries(Object.entries(UNITS).map(([cc, u]) => [cc, {
  ...(u.swat ? { SWAT: u.swat, 'wait for SWAT': `wait for ${u.swat.replace(/^the /, 'the ')}` } : {}),
  ...(u.team ? { 'SWAT team': u.team } : {}),
  ...(u.dog ? { 'K-9 unit': u.dog, K9: u.dog } : {}),
  ...(u.academy ? { 'the police academy': `the ${u.academy}`, 'police academy': u.academy, 'the state police academy': `the ${u.academy}` } : {}),
}]));
