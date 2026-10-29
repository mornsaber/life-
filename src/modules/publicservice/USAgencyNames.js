/**
 * Real names for US state and county bodies that vary by state: each state's police
 * ("Pennsylvania State Police", "California Highway Patrol", "Texas Department of Public
 * Safety"), and the county prosecutor ("Philadelphia District Attorney", "King County
 * Prosecuting Attorney", "Cook County State's Attorney"). Unlisted places fall back to the
 * generic form.
 */

export const STATE_POLICE = {
  AK: 'Alaska State Troopers', AZ: 'Arizona Department of Public Safety', CA: 'California Highway Patrol', CO: 'Colorado State Patrol',
  DC: 'Metropolitan Police Department', FL: 'Florida Highway Patrol', GA: 'Georgia State Patrol', HI: 'Hawaii Department of Law Enforcement',
  IA: 'Iowa State Patrol', IL: 'Illinois State Police', LA: 'Louisiana State Police', MA: 'Massachusetts State Police', MI: 'Michigan State Police',
  MN: 'Minnesota State Patrol', MT: 'Montana Highway Patrol', NC: 'North Carolina State Highway Patrol', NV: 'Nevada Highway Patrol',
  NY: 'New York State Police', OH: 'Ohio State Highway Patrol', OR: 'Oregon State Police', PA: 'Pennsylvania State Police',
  TN: 'Tennessee Highway Patrol', TX: 'Texas Department of Public Safety', UT: 'Utah Highway Patrol', VA: 'Virginia State Police',
  WA: 'Washington State Patrol', WV: 'West Virginia State Police',
};
export const statePoliceName = (stateId, stateName) => STATE_POLICE[stateId] ?? `${stateName} State Police`;

/** The county (or parish, borough, independent city) each place sits in. */
const COUNTY = {
  rural: 'Flathead', smalltown: 'Black Hawk', midcity: 'Franklin', sunbelt: 'Travis', chicago: 'Cook', nyc: 'New York', sf: 'San Francisco',
  miami: 'Miami-Dade', seattle: 'King', denver: 'Denver', gunnison: 'Gunnison', atlanta: 'Fulton', charlotte: 'Mecklenburg', raleigh: 'Wake',
  asheville: 'Buncombe', philadelphia: 'Philadelphia', pittsburgh: 'Allegheny', boston: 'Suffolk', detroit: 'Wayne', minneapolis: 'Hennepin',
  nashville: 'Davidson', neworleans: 'Orleans', phoenix: 'Maricopa', lasvegas: 'Clark', elko: 'Elko', saltlake: 'Salt Lake', portland: 'Multnomah',
  bend: 'Deschutes', honolulu: 'Honolulu', appalachia: 'Raleigh', amarillo: 'Potter', losangeles: 'Los Angeles', sandiego: 'San Diego',
  houston: 'Harris', dallas: 'Dallas', sanantonio: 'Bexar', jacksonvillefl: 'Duval', tampa: 'Hillsborough', coloradosprings: 'El Paso',
  tacoma: 'Pierce', dayton: 'Montgomery', columbusga: 'Muscogee', fayetteville: 'Cumberland', killeen: 'Bell', clarksville: 'Montgomery',
  jacksonvillenc: 'Onslow', pensacola: 'Escambia', ogden: 'Weber', yuma: 'Yuma', valdosta: 'Lowndes', greatfalls: 'Cascade', watertown: 'Jefferson',
  stafford: 'Stafford', fallon: 'Churchill', twentyninepalms: 'San Bernardino', leesville: 'Vernon', marfa: 'Presidio', eureka: 'Humboldt',
  flagstaff: 'Coconino', moab: 'Grand', burns: 'Harney', houghton: 'Houghton', ely: 'St. Louis', decorah: 'Winneshiek', galena: 'Jo Daviess',
  wellsboro: 'Tioga', elkins: 'Randolph', boone: 'Watauga', natchitoches: 'Natchitoches', waycross: 'Ware', hilo: 'Hawaii', nantucket: 'Nantucket',
  athens: 'Athens', cookeville: 'Putnam',
};
/** What the elected prosecutor is called, by state. */
const TITLE = {
  AZ: 'County Attorney', MN: 'County Attorney', MT: 'County Attorney', IA: 'County Attorney', UT: 'County Attorney',
  WA: 'Prosecuting Attorney', MI: 'Prosecuting Attorney', OH: 'Prosecuting Attorney', WV: 'Prosecuting Attorney', HI: 'Prosecuting Attorney',
  IL: 'State\'s Attorney', VA: 'Commonwealth\'s Attorney', TN: 'District Attorney General', FL: 'State Attorney',
};

/** The prosecutor's office for a place: "Allegheny County District Attorney", "Orleans Parish District Attorney". */
export function prosecutorName(regionId, stateId, city) {
  if (stateId === 'DC') return 'U.S. Attorney\'s Office for the District of Columbia';
  if (stateId === 'AK') return `Alaska Department of Law — ${city} District Attorney`;
  const county = COUNTY[regionId];
  const title = TITLE[stateId] ?? 'District Attorney';
  if (!county) return `${city} County ${title}`;
  // Philadelphia, San Francisco, Denver and Honolulu are consolidated city-counties; Louisiana has parishes.
  if (['Philadelphia', 'San Francisco', 'Denver'].includes(county)) return `${county} ${title}`;
  if (county === 'Honolulu') return 'Honolulu Department of the Prosecuting Attorney';
  if (stateId === 'VA' && county === 'Stafford') return `Stafford County ${title}`;
  return `${county} ${stateId === 'LA' ? 'Parish' : 'County'} ${title}`;
}
export const countyOf = (regionId) => COUNTY[regionId] ?? null;
