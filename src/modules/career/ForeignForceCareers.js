/**
 * Services that recruit abroad by tradition (world/ForeignForces.js handles the selection and the
 * move): the Gurkha Contingent of the Singapore Police Force, recruited from Nepal by the British
 * Army's selection at Pokhara. Officers of the Contingent serve until 45, then go home to Nepal.
 */
import { L } from './Ladder.js';

export const FOREIGN_FORCE_PROFESSIONS = {
  gurkhaContingent: {
    id: 'gurkhaContingent', name: 'Singapore Police Force — Gurkha Contingent', icon: '🗡️', sector: 'private', payMultiplier: 0.75, background: 'strict', minAge: 18, layoffRate: 0,
    sizes: { enterprise: 1 }, union: null,
    employers: ['Gurkha Contingent, Mount Vernon Camp'],
    eligible: (state) => (state.foreignForces?.gurkha === 'SG' ? { ok: true } : { ok: false, reason: 'Selected at the Gurkha recruitment in Pokhara (Nepali men)' }),
    levels: [
      L('constable', 'Police Constable', 2, { years: 3 }),
      L('corporal', 'Corporal', 3),
      L('sergeant', 'Sergeant', 4, { abilities: ['supervise'], reports: 8 }),
      L('staffSergeant', 'Staff Sergeant', 5, { abilities: ['supervise'], reports: 20 }),
      L('seniorStaffSergeant', 'Senior Staff Sergeant', 6, { track: 'ic' }),
      L('stationInspector', 'Station Inspector', 6, { track: 'mgmt', abilities: ['supervise'], reports: 40 }),
      L('asp', 'Assistant Superintendent (Gurkha officer)', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 120 }),
      L('dsp', 'Deputy Superintendent (Gurkha officer)', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 1800 }),
    ],
  },
};
