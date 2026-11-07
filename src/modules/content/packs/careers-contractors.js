/**
 * Private military and security contractors: protective details for
 * diplomats and executives in war zones, static security at bases and
 * embassies, and training contracts for foreign militaries and police.
 *
 * Real-world rules worth knowing:
 *   - Firms hire veterans (combat arms or special operations above all) and
 *     experienced police; nobody walks in off the street.
 *   - Pay is high because the work is dangerous and far from home: rotations
 *     run months abroad, and contractors have died in every recent war.
 *   - Former special operators command the best contracts and day rates.
 *   - Contracts end when the government's needs change; the work is cyclical
 *     with wars.
 */
import { L } from '../../career/Ladder.js';
import { yearsInProfession } from '../../../core/State.js';

export const COMBAT = ['infantry', 'medic', 'engineer'];

/** Veterans with combat-arms time, former operators, or experienced police. */
export function contractorBackground(state) {
  const honorable = state.military.history.filter((h) => !['dishonorable', 'bcd', 'oth'].includes(h.discharge));
  const sof = honorable.some((h) => h.sof);
  const combatYears = honorable.filter((h) => COMBAT.includes(h.specialty)).reduce((s, h) => s + h.yearsOfService - (h.priorYears ?? 0), 0);
  const anyYears = honorable.reduce((s, h) => s + h.yearsOfService - (h.priorYears ?? 0), 0);
  // Police anywhere count: a country's national police, gendarmerie or constabulary.
  const lawIds = [...new Set([...(state.career.history ?? []).map((h) => h.professionId), state.career.job?.professionId].filter((id) => id && /police|sheriff|gendarm|constab|fbi|usms|usss|dea|atf|borderPatrol|carabin/i.test(id)))];
  const lawYears = yearsInProfession(state, ['police', 'sheriff', 'statePolice', 'fbi', 'usms', 'usss', 'dea', 'atf', 'borderPatrol', ...lawIds]);
  return { sof, combatYears, anyYears, lawYears };
}

export function contractorGate(state) {
  const b = contractorBackground(state);
  if (b.sof || b.combatYears >= 4 || b.anyYears >= 8 || b.lawYears >= 5) return { ok: true };
  return { ok: false, reason: 'Hires veterans with 4+ years in combat arms (or 8+ in any role), former special operators, or 5+ years in law enforcement' };
}

export const LOCAL_FIRMS = {
  GB: ['Halberd Risk Group (London)', 'Saxon Shield Ltd', 'Ironbridge Maritime Security', 'Kestrel Training Services'],
  FR: ['Garde Prestige Sécurité', 'Opale Défense Conseil', 'Sentinelle Maritime', 'Atlas Formation Défense'],
  ZA: ['Kestrel Protection Services (Pretoria)', 'Bushveld Risk Solutions', 'Cape Maritime Guard', 'Highveld Training Group'],
  AU: ['Southern Cross Protective Services', 'Coral Sea Maritime Security', 'Outback Risk Consulting'],
  CA: ['Northstar Protective Group', 'Laurentian Risk Services'],
  IL: ['Carmel Security Consulting', 'Negev Protective Services'],
  NP: ['Himalayan Guard Services (ex-Gurkha)', 'Annapurna Security International'],
  IN: ['Rajput Risk & Protection', 'Deccan Security Services'],
  PH: ['Mindanao Maritime Security', 'Luzon Protective Agency'],
  CO: ['Andes Seguridad Internacional', 'Escudo Protección Ejecutiva'],
};

const careers = {
  privateMilitary: {
    id: 'privateMilitary', name: 'Private Military & Security Contracting', icon: '🪖', sector: 'private', payMultiplier: 1.75, minAge: 21, sizes: { medium: 2, large: 2, enterprise: 1 }, background: 'strict', promotionOdds: 0.5,
    employers: ['Triton Global Security', 'Blackridge Defense Services', 'Sentinel Protective Group', 'Aegis Training Solutions'],
    eligible: contractorGate,
    // Firms where you live: London's risk consultancies, France's ex-Legion outfits, South Africa's old hands.
    prepare: (state, job) => {
      const firms = LOCAL_FIRMS[state.character.countryId ?? 'US'];
      if (firms) job.employer.name = firms[job.employer.name.length % firms.length];
    },
    valued: ['emt', 'paramedic', 'execProtection', 'languageProficiency'],
    rotation: { label: 'on rotation overseas', away: 0.55 },
    hazard: { injury: 0.06, death: 0.003, cause: 'Killed when a protective-detail convoy was ambushed' },
    ladder: [
      ['static', 'Static Security Contractor', 4, { years: 2 }],
      ['psd', 'Protective Security Specialist', 6],
      ['trainer', 'Training Contract Instructor', 6, { track: 'ic', entry: true }],
      ['medic', 'Detail Medic', 6, { track: 'ic', req: { credentials: ['paramedic'] } }],
      ['teamLead', 'Protective Detail Team Leader', 7, { track: 'mgmt', abilities: ['supervise'], reports: 8 }],
      ['detailLead', 'Detail Leader', 8, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 40 }],
      ['programManager', 'Program Manager', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 300 }],
      ['vpOps', 'Vice President of Operations', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 2000 }],
    ],
  },
};

export default { id: 'careers-contractors', version: 1, careers };
