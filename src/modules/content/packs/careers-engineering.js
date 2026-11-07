/**
 * Engineering beyond civil: mechanical, electrical, chemical, aerospace, petroleum, nuclear and
 * structural engineers. Each has its own ladder (Engineer I to Chief Engineer, or a manager
 * track) and its own project work on the project engine: the design reviews, failures,
 * patents, recalls and plant outages that make the job.
 *
 * Industry engineers rarely need a PE (the industrial exemption); it helps and it pays. A
 * structural engineer, like a civil one, signs drawings and needs the licence to do it. A
 * nuclear engineer's senior posts want an operator's licence or a PE. Patents and fellowships of
 * the professional societies (ASME, IEEE, AIChE, AIAA) are the honours of the trade.
 */
import { L } from '../../career/Ladder.js';

/** A discipline's ladder: Engineer I → Chief Engineer, or the manager track. */
export const ladder = (label, { pe = false, top = 'Chief Engineer' } = {}) => [
  L('eng1', `${label} Engineer I`, 4),
  L('eng2', `${label} Engineer II`, 5, pe ? { req: { credentials: ['fe'] } } : {}),
  L('senior', `Senior ${label} Engineer`, 6, pe ? { req: { credentials: ['pe'] }, abilities: ['sign'] } : {}),
  L('lead', `Lead ${label} Engineer`, 7, { track: 'ic', ...(pe ? { req: { credentials: ['pe'] }, abilities: ['sign', 'inspect'] } : {}) }),
  L('principal', `Principal ${label} Engineer`, 8, { track: 'ic', minSize: 'medium', ...(pe ? { abilities: ['sign', 'inspect'] } : {}) }),
  L('manager', `${label} Engineering Manager`, 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 15 }),
  L('director', 'Director of Engineering', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }),
  L('chief', top, 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 600 }),
];


const BASE = { sector: 'private', minAge: 21, background: 'standard', entry: { education: { level: 'bachelor', majors: ['engineering', 'physics'] } }, union: null };

const careers = {
  mechanicalEng: {
    ...BASE, id: 'mechanicalEng', name: 'Mechanical Engineering', icon: '⚙️', payMultiplier: 1.06, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 },
    employers: ['Ridgeline Manufacturing', 'Corliss Automotive', 'Northstar HVAC Systems', 'Halvorsen Robotics'], valued: ['fe', 'pe', 'pmp'],
    levels: ladder('Mechanical'),
  },
  electricalEng: {
    ...BASE, id: 'electricalEng', name: 'Electrical Engineering', icon: '⚡', payMultiplier: 1.1, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 },
    employers: ['Voltaic Power Systems', 'Meridian Semiconductor', 'Grid & Signal Engineering', 'Coastal Electric Utility'], valued: ['fe', 'pe', 'pmp'],
    levels: ladder('Electrical'),
  },
  chemicalEng: {
    ...BASE, id: 'chemicalEng', name: 'Chemical Engineering', icon: '⚗️', payMultiplier: 1.12, sizes: { medium: 2, large: 3, enterprise: 3 },
    employers: ['Gulfport Refining', 'Brightwater Pharmaceuticals', 'Calder Specialty Chemicals', 'Prairie Biofuels'], valued: ['fe', 'pe', 'oshaSafety'],
    levels: ladder('Process', { top: 'Plant Manager' }),
  },
  aerospaceEng: {
    ...BASE, id: 'aerospaceEng', name: 'Aerospace Engineering', icon: '🚀', payMultiplier: 1.15, sizes: { medium: 1, large: 3, enterprise: 3 },
    employers: ['Skyward Aerospace', 'Orbital Dynamics', 'Falconcrest Defense Systems', 'Aerotek Propulsion'], valued: ['fe', 'pmp'],
    levels: ladder('Aerospace', { top: 'Chief Engineer (Program)' }),
  },
  petroleumEng: {
    ...BASE, id: 'petroleumEng', name: 'Petroleum Engineering', icon: '🛢️', payMultiplier: 1.3, sizes: { medium: 2, large: 3, enterprise: 2 },
    employers: ['Permian Basin Energy', 'Blackwater Offshore', 'Sabine Drilling Partners'], valued: ['fe', 'pe', 'wellControl'],
    // Oil busts take engineers first.
    layoffRate: (state) => (state.economy?.phase === 'recession' ? 0.08 : 0.025),
    levels: ladder('Petroleum', { top: 'VP of Engineering' }),
  },
  nuclearEng: {
    ...BASE, id: 'nuclearEng', name: 'Nuclear Engineering', icon: '☢️', payMultiplier: 1.18, sizes: { large: 3, enterprise: 2 }, background: 'strict',
    employers: ['Riverbend Nuclear Generating Station', 'Atomic Fuel Services', 'Columbia Reactor Engineering'], valued: ['fe', 'pe'],
    levels: ladder('Nuclear', { pe: true, top: 'Chief Nuclear Officer' }),
  },
  structuralEng: {
    ...BASE, id: 'structuralEng', name: 'Structural Engineering', icon: '🏢', payMultiplier: 1.07, sizes: { small: 3, medium: 3, large: 2 },
    entry: { education: { level: 'bachelor', majors: ['engineering', 'architecture'] } },
    employers: ['Keystone Structural', 'Truss & Frame Consulting', 'Ironbridge Engineers'], valued: ['fe', 'pe'],
    levels: ladder('Structural', { pe: true, top: 'Principal (Engineer of Record)' }),
  },
};

export default { id: 'careers-engineering', version: 1, careers };
