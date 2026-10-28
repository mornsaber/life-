/**
 * Life in a religious order as a career: the Society of Jesus and the Missionaries of Charity.
 * You enter through the order itself (Community tab), not the job board, and every step is set
 * by formation and appointment (community/ReligiousOrders.js): novice to professed, then rector,
 * provincial, Superior General. No salary — the order houses and feeds you — no layoffs, and no
 * job-market offers.
 */
import { L } from './Ladder.js';

const enterThroughOrder = (name) => () => ({ ok: false, reason: `Enter ${name} through Religious Life on the Community tab` });
const ORDER = { sector: 'private', body: 'catholic', payMultiplier: 0.05, unpaid: true, minAge: 18, sizes: { enterprise: 1 }, background: 'strict', promotionOdds: 0, church: true, layoffRate: 0, union: null, noMarket: true };

export const RELIGIOUS_ORDER_PROFESSIONS = {
  jesuits: {
    ...ORDER, id: 'jesuits', name: 'Society of Jesus (Jesuits)', icon: '✝️',
    employers: ['Society of Jesus'],
    eligible: enterThroughOrder('the Society of Jesus'),
    levels: [
      L('novice', 'Jesuit Novice', 1, { appointed: true, appointedBy: 'the order' }),
      L('scholastic', 'Jesuit Scholastic', 2, { appointed: true, appointedBy: 'the order' }),
      L('priest', 'Jesuit Priest', 3, { appointed: true, appointedBy: 'the order' }),
      L('professed', 'Professed Jesuit', 4, { appointed: true, appointedBy: 'the order' }),
      L('rector', 'Rector of a Jesuit Community', 5, { track: 'mgmt', appointed: true, appointedBy: 'the order', abilities: ['supervise'], reports: 20 }),
      L('provincial', 'Jesuit Provincial', 7, { track: 'mgmt', appointed: true, appointedBy: 'the order', abilities: ['supervise', 'budget', 'delegate'], reports: 400 }),
      L('general', 'Superior General of the Society of Jesus', 9, { track: 'mgmt', appointed: true, appointedBy: 'the order', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 14000 }),
    ],
  },
  moc: {
    ...ORDER, id: 'moc', name: 'Missionaries of Charity', icon: '🤍',
    employers: ['Missionaries of Charity'],
    eligible: enterThroughOrder('the Missionaries of Charity'),
    levels: [
      L('postulant', 'Postulant', 1, { appointed: true, appointedBy: 'the order' }),
      L('novice', 'Novice', 1, { appointed: true, appointedBy: 'the order' }),
      L('junior', 'Sister (temporary vows)', 2, { appointed: true, appointedBy: 'the order' }),
      L('professed', 'Sister (final vows)', 3, { appointed: true, appointedBy: 'the order' }),
      L('superior', 'Superior of a House', 4, { track: 'mgmt', appointed: true, appointedBy: 'the order', abilities: ['supervise'], reports: 12 }),
      L('regional', 'Regional Superior', 6, { track: 'mgmt', appointed: true, appointedBy: 'the order', abilities: ['supervise', 'budget', 'delegate'], reports: 200 }),
      L('general', 'Superior General of the Missionaries of Charity', 8, { track: 'mgmt', appointed: true, appointedBy: 'the order', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 5000 }),
    ],
  },
};
