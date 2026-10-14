/**
 * Public health systems in depth (2025, simplified).
 *
 *  - Waiting lists: in tax-funded systems, non-urgent specialist care waits —
 *    a hip, a back operation, a cardiology referral. You can wait, or pay
 *    to go private. Cancer and emergencies are fast-tracked everywhere.
 *  - Private top-up insurance: skips the wait (UK, Australia, Italy, Mexico...),
 *    or covers the co-payments the public plan leaves you (France's mutuelle,
 *    Korea's silson, India's mediclaim).
 *  - Australia's Medicare Levy Surcharge: higher earners without private
 *    hospital cover pay 1–1.5% more tax.
 *
 * state.health.privateCover = true   c.waitUntil = age   (on a waiting list)
 */
import { countryOf, isAbroad, priceLevel } from '../world/Countries.js';

/**
 *   wait        months for non-urgent specialist treatment in the public system
 *   private     { name, premium (PPP/yr), skipsWait, coinsurance (with it) }  null: none sold
 */
export const HEALTH_SYSTEMS = {
  GB: { wait: 14, waitName: 'NHS waiting list', private: { name: 'Private medical insurance (Bupa, AXA)', premium: 1500, skipsWait: true } },
  CA: { wait: 9, waitName: 'provincial waiting list', private: null, note: 'Private insurance for publicly covered care is barred in most provinces.' },
  AU: { wait: 6, waitName: 'public hospital waiting list', private: { name: 'Private hospital cover', premium: 2100, skipsWait: true } },
  IT: { wait: 9, waitName: 'SSN waiting list (lista d\'attesa)', private: { name: 'Assicurazione sanitaria integrativa', premium: 1100, skipsWait: true } },
  FR: { wait: 3, waitName: 'specialist waiting list', private: { name: 'Mutuelle (complémentaire santé)', premium: 900, skipsWait: false, coinsurance: 0.005 } },
  DE: { wait: 2, waitName: 'Facharzt waiting list', private: { name: 'Private Zusatzversicherung', premium: 500, skipsWait: true } },
  JP: { wait: 0, private: { name: 'Supplementary medical insurance (iryō hoken)', premium: 700, skipsWait: false, coinsurance: 0.15 } },
  KR: { wait: 0, private: { name: 'Indemnity insurance (silson)', premium: 500, skipsWait: false, coinsurance: 0.08 } },
  MX: { wait: 8, waitName: 'IMSS waiting list', private: { name: 'Seguro de gastos médicos mayores', premium: 1800, skipsWait: true, coinsurance: 0.08 } },
  PH: { wait: 6, waitName: 'public hospital queue', private: { name: 'HMO plan', premium: 900, skipsWait: true, coinsurance: 0.15 } },
  IN: { wait: 8, waitName: 'government hospital queue', private: { name: 'Mediclaim health insurance', premium: 650, skipsWait: true, coinsurance: 0.1 } },
};
/** Conditions whose treatment is elective specialist care (cancer and emergencies are fast-tracked). */
export const WAITLISTED = ['heartDisease', 'backInjury', 'arthritis', 'hearingLoss', 'tbi'];
/** Australia's Medicare Levy Surcharge tiers (single, 2025–26, PPP). */
const MLS = [[104000, 0], [121000, 0.01], [162000, 0.0125], [Infinity, 0.015]];

export const systemHere = (state) => (isAbroad(state) ? HEALTH_SYSTEMS[countryOf(state).id] ?? null : null);
export const hasPrivateCover = (state) => Boolean(state.health?.privateCover && systemHere(state)?.private);
/** Premium for private cover where you live, by age. */
export const privatePremium = (state) => {
  const p = systemHere(state)?.private;
  return p ? Math.round(p.premium * (1 + Math.max(0, state.character.age - 40) * 0.025)) : 0;
};

/** Years you'd wait for this condition's treatment (0: straight away). */
export function waitYears(state, conditionId) {
  const sys = systemHere(state);
  if (!sys?.wait || !WAITLISTED.includes(conditionId)) return 0;
  if (hasPrivateCover(state) && sys.private.skipsWait) return 0;
  return sys.wait >= 18 ? 2 : sys.wait >= 6 ? 1 : 0;
}

/** What going private for one condition costs (consultant, scans, the operation). */
export const goPrivateCost = (state, def) => Math.round((def.annualCost ?? 3000) * 2.5 * priceLevel(state) / 100) * 100;

/** Australia: the Medicare Levy Surcharge on last year's income without private hospital cover. */
export function levySurcharge(state) {
  if ((state.character.countryId ?? 'US') !== 'AU' || hasPrivateCover(state)) return 0;
  const income = state.finances.lastYear?.gross ?? 0;
  const rate = MLS.find(([upTo]) => income <= upTo)[1];
  return Math.round(income * rate);
}
