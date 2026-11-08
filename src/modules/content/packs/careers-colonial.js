/**
 * The colonial service: the administration that ran an empire's territories, from the
 * Indian Civil Service to the Colonial Administrative Service and its French, Portuguese,
 * Dutch and Belgian equivalents. Open only where a territory is ruled from abroad
 * (world/Eras.js); clerks up to the Governor. It ends with independence: the service is
 * wound up, and officers get compensation for loss of career (world/History.js).
 */
import { colonyHere, rulerAdj } from '../../world/Eras.js';

const careers = {
  colonialService: {
    id: 'colonialService', name: 'Colonial Service', icon: '🏛️', sector: 'state', payMultiplier: 1.05, minAge: 18,
    sizes: { enterprise: 1 }, background: 'strict', layoffRate: 0, union: null, noMarket: true, colonial: true,
    employers: ['the Colonial Administrative Service'],
    entry: { education: { level: 'highschool' } },
    eligible: (state) => {
      const st = colonyHere(state);
      return st ? { ok: true, note: `The ${rulerAdj(st.ruler)} administration of ${st.name}` } : { ok: false, reason: 'Only where a territory is ruled from abroad' };
    },
    ladder: [
      ['clerk', 'Government Clerk', 1, { years: 2 }],
      ['cadet', 'Cadet (Assistant District Officer)', 2, { entry: true, req: { education: { level: 'bachelor' } } }],
      ['districtOfficer', 'District Officer', 4, { abilities: ['supervise'], reports: 40 }],
      ['residentMagistrate', 'District Commissioner', 5, { abilities: ['supervise', 'budget'], reports: 120 }],
      ['provincialCommissioner', 'Provincial Commissioner', 7, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports: 600 }],
      ['chiefSecretary', 'Chief Secretary', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 3000 }],
      ['governor', 'Governor', 9, { track: 'mgmt', appointed: true, appointedBy: 'the Crown', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 12000 }],
    ],
  },
};

export default { id: 'careers-colonial', version: 1, careers };
