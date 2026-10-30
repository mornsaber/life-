/**
 * Where you live drives cost of living, private-sector market pay,
 * public-sector locality pay, and — through its state — taxes, laws,
 * licensing and disasters.
 *
 *   col:      cost-of-living multiplier on living expenses and rents
 *   market:   private/municipal pay multiplier
 *   locality: federal locality-pay percentage (GS-style) added to base pay
 *   state:    parent state (see States.js)
 *   transit:  public-transit coverage 0–100 (bus/rail frequency and reach)
 *   fare:     monthly transit pass
 *   walkable: dense enough to live without any vehicle
 *   size:     how big local government is (city departments, county offices)
 *
 * Every relocation — a voluntary move, a PCS, a duty-station assignment, a
 * corporate transfer — goes through changeRegion(), which emits
 * `region:changed` so housing, licenses, careers and residency can react.
 */
import { canAfford } from '../../core/State.js';
import { STATES } from './States.js';
import { FOREIGN_CITIES } from '../world/Countries.js';

export const REGIONS = {
  rural: { id: 'rural', name: 'Glacier Valley, MT', icon: '🏔️', type: 'Rural', state: 'MT', col: 0.72, market: 0.86, locality: 0.17, transit: 3, fare: 0, walkable: false },
  smalltown: { id: 'smalltown', name: 'Cedar Falls, IA', icon: '🌽', type: 'Small town', state: 'IA', col: 0.82, market: 0.9, locality: 0.17, transit: 10, fare: 30, walkable: false },
  midcity: { id: 'midcity', name: 'Columbus, OH', icon: '🏙️', type: 'Mid-size city', state: 'OH', col: 0.95, market: 0.98, locality: 0.22, transit: 30, fare: 62, walkable: false },
  sunbelt: { id: 'sunbelt', name: 'Austin, TX', icon: '🌵', type: 'Sun Belt metro', state: 'TX', col: 1.05, market: 1.05, locality: 0.21, transit: 25, fare: 41, walkable: false },
  chicago: { id: 'chicago', name: 'Chicago, IL', icon: '🌬️', type: 'Major metro', state: 'IL', col: 1.15, market: 1.12, locality: 0.31, transit: 75, fare: 75, walkable: true },
  dc: { id: 'dc', name: 'Washington, D.C.', icon: '🏛️', type: 'Capital region', state: 'DC', col: 1.3, market: 1.18, locality: 0.33, transit: 80, fare: 108, walkable: true },
  nyc: { id: 'nyc', name: 'New York City', icon: '🗽', type: 'High-cost metro', state: 'NY', col: 1.55, market: 1.3, locality: 0.37, transit: 95, fare: 132, walkable: true },
  sf: { id: 'sf', name: 'San Francisco Bay Area', icon: '🌉', type: 'High-cost metro', state: 'CA', col: 1.65, market: 1.4, locality: 0.46, transit: 70, fare: 98, walkable: true },
  miami: { id: 'miami', name: 'Miami, FL', icon: '🌴', type: 'Coastal metro', state: 'FL', col: 1.2, market: 1.06, locality: 0.24, transit: 40, fare: 112, walkable: false },
  seattle: { id: 'seattle', name: 'Seattle, WA', icon: '🌲', type: 'High-cost metro', state: 'WA', col: 1.4, market: 1.3, locality: 0.3, transit: 60, fare: 99, walkable: true },
  denver: { id: 'denver', name: 'Denver, CO', icon: '⛰️', type: 'Mountain metro', state: 'CO', col: 1.15, market: 1.12, locality: 0.3, transit: 45, fare: 88, walkable: false },
  gunnison: { id: 'gunnison', name: 'Gunnison, CO', icon: '🦌', type: 'Rural', state: 'CO', col: 0.85, market: 0.88, locality: 0.17, transit: 8, fare: 0, walkable: false },
  atlanta: { id: 'atlanta', name: 'Atlanta, GA', icon: '🍑', type: 'Major metro', state: 'GA', col: 1.08, market: 1.06, locality: 0.25, transit: 35, fare: 95, walkable: false, size: 'enterprise' },
  charlotte: { id: 'charlotte', name: 'Charlotte, NC', icon: '🏦', type: 'Sun Belt metro', state: 'NC', col: 1.0, market: 1.03, locality: 0.2, transit: 20, fare: 88, walkable: false, size: 'large' },
  raleigh: { id: 'raleigh', name: 'Raleigh, NC', icon: '🌳', type: 'Mid-size city', state: 'NC', col: 1.0, market: 1.03, locality: 0.21, transit: 15, fare: 0, walkable: false, size: 'large' },
  asheville: { id: 'asheville', name: 'Asheville, NC', icon: '🏞️', type: 'Small town', state: 'NC', col: 0.95, market: 0.9, locality: 0.17, transit: 10, fare: 0, walkable: false, size: 'small' },
  norfolk: { id: 'norfolk', name: 'Norfolk–Virginia Beach, VA', icon: '⚓', type: 'Coastal metro', state: 'VA', col: 1.0, market: 0.99, locality: 0.2, transit: 20, fare: 50, walkable: false, size: 'large' },
  philadelphia: { id: 'philadelphia', name: 'Philadelphia, PA', icon: '🔔', type: 'Major metro', state: 'PA', col: 1.12, market: 1.09, locality: 0.29, transit: 70, fare: 99, walkable: true, size: 'enterprise' },
  pittsburgh: { id: 'pittsburgh', name: 'Pittsburgh, PA', icon: '🌉', type: 'Mid-size city', state: 'PA', col: 0.92, market: 0.97, locality: 0.23, transit: 45, fare: 99, walkable: false, size: 'large' },
  boston: { id: 'boston', name: 'Boston, MA', icon: '🦞', type: 'High-cost metro', state: 'MA', col: 1.5, market: 1.3, locality: 0.34, transit: 75, fare: 90, walkable: true, size: 'enterprise' },
  detroit: { id: 'detroit', name: 'Detroit, MI', icon: '🚗', type: 'Major metro', state: 'MI', col: 0.9, market: 0.98, locality: 0.3, transit: 20, fare: 70, walkable: false, size: 'enterprise' },
  minneapolis: { id: 'minneapolis', name: 'Minneapolis–St. Paul, MN', icon: '❄️', type: 'Major metro', state: 'MN', col: 1.05, market: 1.07, locality: 0.27, transit: 45, fare: 76, walkable: false, size: 'large' },
  nashville: { id: 'nashville', name: 'Nashville, TN', icon: '🎸', type: 'Sun Belt metro', state: 'TN', col: 1.05, market: 1.03, locality: 0.19, transit: 15, fare: 0, walkable: false, size: 'large' },
  neworleans: { id: 'neworleans', name: 'New Orleans, LA', icon: '🎺', type: 'Coastal metro', state: 'LA', col: 0.98, market: 0.95, locality: 0.19, transit: 35, fare: 55, walkable: true, size: 'large' },
  phoenix: { id: 'phoenix', name: 'Phoenix, AZ', icon: '☀️', type: 'Sun Belt metro', state: 'AZ', col: 1.03, market: 1.02, locality: 0.22, transit: 20, fare: 64, walkable: false, size: 'enterprise' },
  lasvegas: { id: 'lasvegas', name: 'Las Vegas, NV', icon: '🎰', type: 'Sun Belt metro', state: 'NV', col: 1.0, market: 0.98, locality: 0.19, transit: 25, fare: 65, walkable: false, size: 'large' },
  elko: { id: 'elko', name: 'Elko, NV', icon: '⛏️', type: 'Rural', state: 'NV', col: 0.85, market: 0.95, locality: 0.17, transit: 2, fare: 0, walkable: false, size: 'small' },
  saltlake: { id: 'saltlake', name: 'Salt Lake City, UT', icon: '🏔️', type: 'Mountain metro', state: 'UT', col: 1.05, market: 1.04, locality: 0.21, transit: 35, fare: 90, walkable: false, size: 'large' },
  portland: { id: 'portland', name: 'Portland, OR', icon: '🌧️', type: 'High-cost metro', state: 'OR', col: 1.2, market: 1.12, locality: 0.26, transit: 50, fare: 100, walkable: true, size: 'large' },
  bend: { id: 'bend', name: 'Bend, OR', icon: '🌲', type: 'Small town', state: 'OR', col: 1.1, market: 0.95, locality: 0.17, transit: 8, fare: 0, walkable: false, size: 'small' },
  anchorage: { id: 'anchorage', name: 'Anchorage, AK', icon: '🐻', type: 'Mid-size city', state: 'AK', col: 1.2, market: 1.15, locality: 0.3, transit: 10, fare: 60, walkable: false, size: 'medium' },
  fairbanks: { id: 'fairbanks', name: 'Fairbanks, AK', icon: '🌌', type: 'Rural', state: 'AK', col: 1.15, market: 1.1, locality: 0.29, transit: 3, fare: 0, walkable: false, size: 'small' },
  honolulu: { id: 'honolulu', name: 'Honolulu, HI', icon: '🌺', type: 'High-cost metro', state: 'HI', col: 1.7, market: 1.12, locality: 0.21, transit: 45, fare: 80, walkable: false, size: 'large' },
  appalachia: { id: 'appalachia', name: 'Beckley, WV', icon: '⛰️', type: 'Rural', state: 'WV', col: 0.7, market: 0.82, locality: 0.17, transit: 3, fare: 0, walkable: false, size: 'small' },
  amarillo: { id: 'amarillo', name: 'Amarillo, TX', icon: '🐂', type: 'Small town', state: 'TX', col: 0.82, market: 0.9, locality: 0.17, transit: 8, fare: 0, walkable: false, size: 'medium' },
  // Big cities
  losangeles: { id: 'losangeles', name: 'Los Angeles, CA', icon: '🎬', type: 'High-cost metro', state: 'CA', col: 1.55, market: 1.3, locality: 0.35, transit: 45, fare: 50, walkable: false, size: 'enterprise' },
  sandiego: { id: 'sandiego', name: 'San Diego, CA', icon: '🌊', type: 'High-cost metro', state: 'CA', col: 1.5, market: 1.25, locality: 0.33, transit: 35, fare: 72, walkable: false, size: 'enterprise' },
  houston: { id: 'houston', name: 'Houston, TX', icon: '🛢️', type: 'Major metro', state: 'TX', col: 1.0, market: 1.08, locality: 0.33, transit: 25, fare: 45, walkable: false, size: 'enterprise' },
  dallas: { id: 'dallas', name: 'Dallas–Fort Worth, TX', icon: '🤠', type: 'Major metro', state: 'TX', col: 1.05, market: 1.08, locality: 0.27, transit: 25, fare: 96, walkable: false, size: 'enterprise' },
  sanantonio: { id: 'sanantonio', name: 'San Antonio, TX', icon: '🌮', type: 'Sun Belt metro', state: 'TX', col: 0.95, market: 0.98, locality: 0.2, transit: 20, fare: 40, walkable: false, size: 'enterprise' },
  jacksonvillefl: { id: 'jacksonvillefl', name: 'Jacksonville, FL', icon: '🌉', type: 'Sun Belt metro', state: 'FL', col: 0.98, market: 0.98, locality: 0.2, transit: 15, fare: 50, walkable: false, size: 'enterprise' },
  tampa: { id: 'tampa', name: 'Tampa, FL', icon: '⚡', type: 'Sun Belt metro', state: 'FL', col: 1.05, market: 1.0, locality: 0.2, transit: 15, fare: 65, walkable: false, size: 'large' },
  coloradosprings: { id: 'coloradosprings', name: 'Colorado Springs, CO', icon: '🏔️', type: 'Mid-size city', state: 'CO', col: 1.0, market: 1.0, locality: 0.2, transit: 15, fare: 50, walkable: false, size: 'large' },
  tacoma: { id: 'tacoma', name: 'Tacoma, WA', icon: '🌲', type: 'Mid-size city', state: 'WA', col: 1.15, market: 1.1, locality: 0.3, transit: 30, fare: 99, walkable: false, size: 'large' },
  dayton: { id: 'dayton', name: 'Dayton, OH', icon: '✈️', type: 'Mid-size city', state: 'OH', col: 0.85, market: 0.92, locality: 0.2, transit: 20, fare: 50, walkable: false, size: 'medium' },
  columbusga: { id: 'columbusga', name: 'Columbus, GA', icon: '🪖', type: 'Mid-size city', state: 'GA', col: 0.85, market: 0.9, locality: 0.17, transit: 10, fare: 40, walkable: false, size: 'medium' },
  fayetteville: { id: 'fayetteville', name: 'Fayetteville, NC', icon: '🎖️', type: 'Mid-size city', state: 'NC', col: 0.88, market: 0.92, locality: 0.17, transit: 10, fare: 30, walkable: false, size: 'medium' },
  // Base towns
  killeen: { id: 'killeen', name: 'Killeen, TX', icon: '🪖', type: 'Small town', state: 'TX', col: 0.85, market: 0.9, locality: 0.17, transit: 8, fare: 30, walkable: false, size: 'medium' },
  clarksville: { id: 'clarksville', name: 'Clarksville, TN', icon: '🦅', type: 'Small town', state: 'TN', col: 0.85, market: 0.9, locality: 0.17, transit: 8, fare: 25, walkable: false, size: 'medium' },
  jacksonvillenc: { id: 'jacksonvillenc', name: 'Jacksonville, NC', icon: '⚓', type: 'Small town', state: 'NC', col: 0.85, market: 0.88, locality: 0.17, transit: 5, fare: 25, walkable: false, size: 'medium' },
  pensacola: { id: 'pensacola', name: 'Pensacola, FL', icon: '🛩️', type: 'Small town', state: 'FL', col: 0.92, market: 0.9, locality: 0.17, transit: 8, fare: 30, walkable: false, size: 'medium' },
  ogden: { id: 'ogden', name: 'Ogden, UT', icon: '⛷️', type: 'Small town', state: 'UT', col: 0.95, market: 0.98, locality: 0.21, transit: 15, fare: 90, walkable: false, size: 'medium' },
  yuma: { id: 'yuma', name: 'Yuma, AZ', icon: '🏜️', type: 'Small town', state: 'AZ', col: 0.85, market: 0.88, locality: 0.17, transit: 5, fare: 25, walkable: false, size: 'medium' },
  valdosta: { id: 'valdosta', name: 'Valdosta, GA', icon: '🌳', type: 'Small town', state: 'GA', col: 0.8, market: 0.86, locality: 0.17, transit: 5, fare: 25, walkable: false, size: 'small' },
  greatfalls: { id: 'greatfalls', name: 'Great Falls, MT', icon: '🚀', type: 'Small town', state: 'MT', col: 0.85, market: 0.86, locality: 0.17, transit: 5, fare: 25, walkable: false, size: 'small' },
  watertown: { id: 'watertown', name: 'Watertown, NY', icon: '❄️', type: 'Small town', state: 'NY', col: 0.85, market: 0.88, locality: 0.17, transit: 5, fare: 25, walkable: false, size: 'small' },
  stafford: { id: 'stafford', name: 'Stafford–Quantico, VA', icon: '🎯', type: 'Small town', state: 'VA', col: 1.05, market: 1.0, locality: 0.25, transit: 10, fare: 60, walkable: false, size: 'medium' },
  fallon: { id: 'fallon', name: 'Fallon, NV', icon: '🛫', type: 'Rural', state: 'NV', col: 0.85, market: 0.9, locality: 0.17, transit: 2, fare: 0, walkable: false, size: 'small' },
  twentyninepalms: { id: 'twentyninepalms', name: 'Twentynine Palms, CA', icon: '🌵', type: 'Rural', state: 'CA', col: 0.95, market: 0.9, locality: 0.2, transit: 2, fare: 0, walkable: false, size: 'small' },
  leesville: { id: 'leesville', name: 'Leesville, LA', icon: '🪖', type: 'Rural', state: 'LA', col: 0.75, market: 0.82, locality: 0.17, transit: 2, fare: 0, walkable: false, size: 'small' },
  kodiak: { id: 'kodiak', name: 'Kodiak, AK', icon: '🐻', type: 'Rural', state: 'AK', col: 1.2, market: 1.1, locality: 0.29, transit: 0, fare: 0, walkable: false, size: 'small' },
  // The countryside
  marfa: { id: 'marfa', name: 'Marfa, TX', icon: '🌌', type: 'Rural', state: 'TX', col: 0.8, market: 0.82, locality: 0.17, transit: 0, fare: 0, walkable: false, size: 'small' },
  eureka: { id: 'eureka', name: 'Eureka, CA', icon: '🌲', type: 'Small town', state: 'CA', col: 1.05, market: 0.9, locality: 0.2, transit: 10, fare: 30, walkable: false, size: 'small' },
  flagstaff: { id: 'flagstaff', name: 'Flagstaff, AZ', icon: '🌲', type: 'Small town', state: 'AZ', col: 1.05, market: 0.92, locality: 0.17, transit: 10, fare: 30, walkable: false, size: 'small' },
  moab: { id: 'moab', name: 'Moab, UT', icon: '🏜️', type: 'Rural', state: 'UT', col: 0.9, market: 0.85, locality: 0.17, transit: 2, fare: 0, walkable: false, size: 'small' },
  burns: { id: 'burns', name: 'Burns, OR', icon: '🐎', type: 'Rural', state: 'OR', col: 0.8, market: 0.82, locality: 0.17, transit: 0, fare: 0, walkable: false, size: 'small' },
  houghton: { id: 'houghton', name: 'Houghton, MI', icon: '❄️', type: 'Rural', state: 'MI', col: 0.78, market: 0.82, locality: 0.17, transit: 3, fare: 0, walkable: false, size: 'small' },
  ely: { id: 'ely', name: 'Ely, MN', icon: '🛶', type: 'Rural', state: 'MN', col: 0.78, market: 0.82, locality: 0.17, transit: 2, fare: 0, walkable: false, size: 'small' },
  decorah: { id: 'decorah', name: 'Decorah, IA', icon: '🐄', type: 'Rural', state: 'IA', col: 0.75, market: 0.84, locality: 0.17, transit: 2, fare: 0, walkable: false, size: 'small' },
  galena: { id: 'galena', name: 'Galena, IL', icon: '🏘️', type: 'Rural', state: 'IL', col: 0.8, market: 0.84, locality: 0.17, transit: 2, fare: 0, walkable: false, size: 'small' },
  wellsboro: { id: 'wellsboro', name: 'Wellsboro, PA', icon: '🌲', type: 'Rural', state: 'PA', col: 0.78, market: 0.84, locality: 0.17, transit: 2, fare: 0, walkable: false, size: 'small' },
  elkins: { id: 'elkins', name: 'Elkins, WV', icon: '🏞️', type: 'Rural', state: 'WV', col: 0.7, market: 0.8, locality: 0.17, transit: 2, fare: 0, walkable: false, size: 'small' },
  boone: { id: 'boone', name: 'Boone, NC', icon: '⛰️', type: 'Small town', state: 'NC', col: 0.95, market: 0.88, locality: 0.17, transit: 10, fare: 0, walkable: false, size: 'small' },
  natchitoches: { id: 'natchitoches', name: 'Natchitoches, LA', icon: '🐊', type: 'Rural', state: 'LA', col: 0.75, market: 0.82, locality: 0.17, transit: 2, fare: 0, walkable: false, size: 'small' },
  waycross: { id: 'waycross', name: 'Waycross, GA', icon: '🌾', type: 'Rural', state: 'GA', col: 0.72, market: 0.8, locality: 0.17, transit: 2, fare: 0, walkable: false, size: 'small' },
  hilo: { id: 'hilo', name: 'Hilo, HI', icon: '🌋', type: 'Small town', state: 'HI', col: 1.3, market: 1.0, locality: 0.21, transit: 8, fare: 30, walkable: false, size: 'small' },
  nantucket: { id: 'nantucket', name: 'Nantucket, MA', icon: '⛵', type: 'Rural', state: 'MA', col: 1.8, market: 1.1, locality: 0.34, transit: 10, fare: 0, walkable: false, size: 'small' },
  athens: { id: 'athens', name: 'Athens, OH', icon: '🎓', type: 'Small town', state: 'OH', col: 0.82, market: 0.86, locality: 0.17, transit: 10, fare: 0, walkable: false, size: 'small' },
  cookeville: { id: 'cookeville', name: 'Cookeville, TN', icon: '🎸', type: 'Small town', state: 'TN', col: 0.8, market: 0.86, locality: 0.17, transit: 3, fare: 0, walkable: false, size: 'small' },
};

/** Military installations by branch, for PCS moves. */
export const BASES = {
  army: [['killeen', 'Fort Cavazos'], ['coloradosprings', 'Fort Carson'], ['tacoma', 'Joint Base Lewis-McChord'], ['dc', 'Fort Myer'], ['fayetteville', 'Fort Bragg'], ['honolulu', 'Schofield Barracks'],
    ['fairbanks', 'Fort Wainwright'], ['columbusga', 'Fort Moore'], ['clarksville', 'Fort Campbell'], ['watertown', 'Fort Drum'], ['leesville', 'Fort Johnson'], ['sanantonio', 'Fort Sam Houston'], ['anchorage', 'JB Elmendorf-Richardson (Army)']],
  marines: [['sandiego', 'Camp Pendleton'], ['sandiego', 'MCAS Miramar'], ['dc', 'Marine Barracks Washington'], ['jacksonvillenc', 'Camp Lejeune'], ['honolulu', 'MCB Hawaii'], ['yuma', 'MCAS Yuma'],
    ['twentyninepalms', 'MCAGCC Twentynine Palms'], ['stafford', 'MCB Quantico'], ['jacksonvillenc', 'MCAS New River']],
  navy: [['jacksonvillefl', 'NAS Jacksonville'], ['jacksonvillefl', 'Naval Station Mayport'], ['seattle', 'Naval Base Kitsap'], ['sandiego', 'Naval Base San Diego'], ['dc', 'Naval Support Activity Washington'],
    ['norfolk', 'Naval Station Norfolk'], ['honolulu', 'Joint Base Pearl Harbor-Hickam'], ['pensacola', 'NAS Pensacola'], ['fallon', 'NAS Fallon'], ['seattle', 'NAS Whidbey Island'], ['sandiego', 'NAS North Island']],
  airforce: [['greatfalls', 'Malmstrom AFB'], ['denver', 'Buckley SFB'], ['sanantonio', 'JBSA-Lackland'], ['dc', 'Joint Base Andrews'], ['lasvegas', 'Nellis AFB'], ['phoenix', 'Luke AFB'], ['ogden', 'Hill AFB'],
    ['anchorage', 'JB Elmendorf-Richardson'], ['norfolk', 'JB Langley-Eustis'], ['dayton', 'Wright-Patterson AFB'], ['valdosta', 'Moody AFB'], ['pensacola', 'Eglin AFB'], ['tampa', 'MacDill AFB'], ['fairbanks', 'Eielson AFB'], ['tacoma', 'JB Lewis-McChord (McChord Field)']],
  spaceforce: [['coloradosprings', 'Peterson Space Force Base'], ['coloradosprings', 'Schriever Space Force Base'], ['sf', 'Vandenberg Space Force Base'], ['miami', 'Patrick Space Force Base'], ['dc', 'the Pentagon (Space Staff)'], ['losangeles', 'Los Angeles Space Force Base'], ['denver', 'Buckley Space Force Base']],
  coastguard: [['miami', 'Sector Miami'], ['seattle', 'Sector Puget Sound'], ['nyc', 'Sector New York'], ['sf', 'Sector San Francisco'], ['norfolk', 'Sector Virginia'], ['neworleans', 'Sector New Orleans'], ['boston', 'Sector Boston'],
    ['anchorage', 'Sector Anchorage'], ['honolulu', 'Sector Honolulu'], ['kodiak', 'Air Station Kodiak'], ['houston', 'Sector Houston-Galveston'], ['sandiego', 'Sector San Diego'], ['jacksonvillefl', 'Sector Jacksonville'], ['nantucket', 'Station Brant Point (Nantucket)'], ['portland', 'Sector Columbia River']],
  guard: [],
  usphs: [['dc', 'HHS headquarters, Rockville'], ['rural', 'Indian Health Service, Billings Area'], ['flagstaff', 'Indian Health Service, Navajo Area'], ['seattle', 'FDA Pacific Region'], ['dallas', 'Federal Medical Center, Fort Worth'], ['atlanta', 'CDC, Atlanta']],
  noaa: [['seattle', 'Marine Operations Center–Pacific'], ['tampa', 'Aircraft Operations Center, Lakeland'], ['dc', 'NOAA headquarters, Silver Spring'], ['sandiego', 'NOAA Ship Reuben Lasker, San Diego'], ['kodiak', 'NOAA Fisheries, Kodiak Laboratory']],
};

export const MOVE_COST = 3500;

// Foreign cities resolve by id but stay out of US iteration (seeds, lists and picks are unchanged).
/**
 * Country packs give a city's transit fare in different units: most a monthly pass, some the
 * year's pass (South Africa, Nigeria, Singapore…), some a single ride. Charged monthly, an annual
 * figure costs twelve times over. Normalise to a monthly pass: a US pass runs about 30–130 per
 * point of cost of living.
 */
function monthlyFare(r) {
  const ratio = r.fare / (r.col || 1);
  if (ratio > 200) return Math.round(r.fare / 12);
  if (ratio > 0 && ratio < 15) return Math.round(r.fare * 40);
  return r.fare;
}
for (const [id, r] of Object.entries(FOREIGN_CITIES)) {
  if (r.fare) r.fare = monthlyFare(r);
  Object.defineProperty(REGIONS, id, { value: r, enumerable: false });
}

/** The cities of a country, in order (the US list is exactly Object.values(REGIONS)). */
export const regionsIn = (countryId = 'US') => (countryId === 'US' ? Object.values(REGIONS) : Object.values(FOREIGN_CITIES).filter((r) => r.country === countryId));
/** The country of the place you live. */
export const countryIdOf = (state) => state?.character?.countryId ?? 'US';
/** Cities in your country. */
export const regionsHere = (state) => regionsIn(countryIdOf(state));

export const regionOf = (state) => REGIONS[state.character.regionId] ?? REGIONS.midcity;
export const stateIdOf = (state) => regionOf(state).state;
export const stateOf = (state) => STATES[stateIdOf(state)];
export const regionsInState = (stateId) => regionsIn(STATES[stateId]?.country ?? 'US').filter((r) => r.state === stateId);

/** Years you've been a resident of your current state (in-state tuition, candidacy). */
export const residencyYears = (state) => state.character.age - (state.character.residencySince ?? 0);

/** The one place a relocation happens. */
export function changeRegion(ctx, regionId, reason, { voluntary = false, crossBorder = false } = {}) {
  const { state } = ctx;
  const from = state.character.regionId;
  if (!REGIONS[regionId] || from === regionId) return false;
  // Moving between countries goes through the Migration module (visas, residency), which sets the country first.
  if (!crossBorder && (REGIONS[regionId].country ?? 'US') !== countryIdOf(state)) return false;
  const fromState = REGIONS[from]?.state;
  state.character.regionId = regionId;
  if (REGIONS[regionId].state !== fromState) state.character.residencySince = state.character.age;
  ctx.log(`${reason ? `${reason} ` : ''}You relocated to ${REGIONS[regionId].name}.`, REGIONS[regionId].icon, 'milestone');
  ctx.emit('region:changed', { from, to: regionId, fromState, toState: REGIONS[regionId].state, voluntary });
  return true;
}

/** Professions whose people live ashore anywhere and work at sea. */
const SEAGOING = ['merchantMarine', 'cruise'];
/** Deep-sea seafarers live anywhere and fly out to join their ships (tugs and coastal work stay home). */
export const keepsBerth = (job) => Boolean(job && SEAGOING.includes(job.professionId) && job.ship?.type !== 'tug');

function completeMove(ctx, regionId) {
  const { state } = ctx;
  const region = REGIONS[regionId];
  if (!region || (region.country ?? 'US') !== countryIdOf(state)) return ctx.toast('Moving abroad needs a visa: see Move abroad.', 'warn');
  if (!ctx.spend(MOVE_COST, 'Moving costs', { credit: true })) {
    ctx.toast(`Moving costs $${MOVE_COST.toLocaleString()} — more than your cash and credit.`, 'warn');
    return false;
  }
  const job = state.career.job;
  if (job && !job.remote && !keepsBerth(job)) ctx.emit('career:resign', { reason: `Moved to ${region.name}` });
  changeRegion(ctx, regionId, 'You packed up the truck.', { voluntary: true });
  ctx.toast(`Moved to ${region.name}`, 'good');
  ctx.stat('stress', 6);
}

export const Relocation = {
  id: 'region',
  order: 4,

  init(state) {
    state.character.regionId ??= 'midcity';
    state.character.residencySince ??= 0;
  },

  setup(engine) {
    // Employers with duty stations, PCS orders and transfers relocate you.
    engine.bus.on('region:relocate', ({ ctx, regionId, reason }) => changeRegion(ctx, regionId, reason));
  },

  actions: {
    move(ctx, regionId) {
      const { state } = ctx;
      if (!REGIONS[regionId] || state.character.regionId === regionId) return;
      if (state.character.age < 18) return ctx.toast('You can move out at 18.', 'warn');
      if (state.military.service?.component === 'active') return ctx.toast('The military decides where you live (PCS orders).', 'warn');
      const home = state.housing.properties.find((p) => p.use === 'primary');
      if (home) {
        ctx.prompt({
          type: 'region.homeDecision',
          icon: '🏡',
          title: 'What About Your Home?',
          text: `You own your home in ${REGIONS[home.regionId].name} (worth ~$${Math.round(home.value).toLocaleString()}).`,
          options: [
            { id: 'sell', label: '🪧 Sell it before you go', hint: 'Agent commission + closing costs' },
            { id: 'rent', label: '🔑 Keep it and rent it out', hint: 'Landlord from afar' },
            { id: 'vacant', label: '🚪 Keep it empty', hint: 'Pay the carrying costs' },
            { id: 'cancel', label: '↩️ Stay put' },
          ],
          data: { regionId },
        });
        return;
      }
      completeMove(ctx, regionId);
    },
  },

  resolvers: {
    homeDecision(ctx, data, optionId) {
      if (optionId === 'cancel') return;
      // Selling raises the money; keeping the house means paying the movers from cash or credit.
      if (optionId !== 'sell' && !canAfford(ctx.state, MOVE_COST)) return ctx.toast(`Moving costs $${MOVE_COST.toLocaleString()} — more than your cash and credit.`, 'warn');
      ctx.emit('housing:leavingPrimary', { decision: optionId });
      completeMove(ctx, data.regionId);
    },
  },
};
