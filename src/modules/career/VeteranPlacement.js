/**
 * Military experience counts when you're hired. Employers and civil-service
 * systems credit related service: a military police sergeant comes into a
 * police department past the probationary rung, an aviation mechanic into
 * a senior mechanic's job, a signals analyst into an intelligence agency at
 * the journeyman level. Senior NCOs and officers are also recruited into
 * supervisory roles in any field (junior-military-officer programs).
 *
 *   related service    4+ years: one level above the normal entry; 8+: two;
 *                      a senior rank (E-7+, W-3+, O-4+) adds one more.
 *   leadership         E-7+ with 8+ years, or O-3+ with 4+ commissioned
 *                      years: one level up in any field; in private
 *                      companies that can be a first-line supervisor job.
 *
 * Never more than two grades above the normal entry, never a budget,
 * hiring or executive post, and never across tracks.
 *
 * Levels still need their own requirements (licenses, degrees), appointed
 * posts are never reachable this way, and only honorable service counts.
 */
import { ladderFor, nextLevels, entryLevels } from './Ladder.js';
import { civilianField } from '../military/Transition.js';

const HONORABLE = ['honorable', 'general', 'medical', 'retired'];
/** Civilian careers close enough to share military experience. */
const FAMILIES = [
  ['police', 'sheriff', 'statePolice', 'transitPolice', 'airportPolice', 'universityPolice', 'privatePolice', 'borderPatrol', 'usms', 'corrections', 'jail', 'federalPrisons', 'privateSecurity', 'privateMilitary'],
  ['ems', 'privateEms', 'fire', 'airportFire', 'stateFire'],
  ['aviation', 'charterAviation', 'airTrafficControl'],
  ['intelligence', 'caseOfficer', 'sigint'],
  ['tech', 'cybersecurity', 'dataScience'],
  ['logistics', 'trucking', 'postal'],
  ['merchantMarine', 'cruise'],
  ['law', 'legalSupport', 'prosecution', 'publicDefender'],
  ['nursing', 'travelNursing'],
  ['engineering', 'trades', 'carpentry', 'publicWorks'],
];
const familyOf = (id) => FAMILIES.find((f) => f.includes(id)) ?? [id];

/** Rank from a code like 'E-7', 'W-3', 'O-4'. */
const parseRank = (code) => {
  const m = /^([EWO])-(\d+)/.exec(code ?? '');
  return m ? { kind: m[1], n: Number(m[2]) } : null;
};
const senior = (r) => r && ((r.kind === 'E' && r.n >= 7) || (r.kind === 'W' && r.n >= 3) || (r.kind === 'O' && r.n >= 4));

/** Your service records: past honorable tours, plus a reserve tour you're still on. */
function tours(state) {
  const out = state.military.history.filter((h) => HONORABLE.includes(h.discharge)).map((h) => ({
    years: h.yearsOfService - (h.priorYears ?? 0), rank: parseRank(h.rankCode), commissioned: h.commissionedYears ?? 0, field: civilianField(state, h),
  }));
  const svc = state.military.service;
  if (svc && svc.component !== 'active') {
    const code = `${{ officer: 'O', warrant: 'W' }[svc.track] ?? 'E'}-${svc.grade + 1}`;
    out.push({ years: svc.yearsOfService - (svc.priorYears ?? 0), rank: parseRank(code), commissioned: svc.track === 'officer' ? svc.yearsOfService : 0, field: civilianField(state, svc) });
  }
  return out;
}

/** How many rungs your service is worth in this career, and why. */
export function militaryCredit(state, profession) {
  const all = tours(state);
  if (!all.length) return { steps: 0 };
  const family = familyOf(profession.id);
  const related = all.filter((t) => t.field && family.includes(t.field));
  const relatedYears = related.reduce((s, t) => s + t.years, 0);
  const top = all.map((t) => t.rank).filter(Boolean).sort((a, b) => 'EWO'.indexOf(b.kind) - 'EWO'.indexOf(a.kind) || b.n - a.n)[0];
  const totalYears = all.reduce((s, t) => s + t.years, 0);
  const commissioned = all.reduce((s, t) => s + t.commissioned, 0);
  const leader = top && ((top.kind === 'E' && top.n >= 7 && totalYears >= 8) || (top.kind === 'O' && top.n >= 3 && commissioned >= 4) || (top.kind === 'W' && top.n >= 2 && totalYears >= 8));
  if (relatedYears >= 4) {
    const steps = Math.min(3, (relatedYears >= 8 ? 2 : 1) + (senior(related.map((t) => t.rank).find(senior)) ? 1 : 0));
    return { steps, related: true, leader, reason: `${relatedYears} years of related military service` };
  }
  if (leader) return { steps: 1, related: false, leader: true, reason: 'Military leadership experience' };
  return { steps: 0 };
}

/**
 * The level your service qualifies you for, starting from the normal entry
 * level and walking up the ladder while each rung's requirements are met.
 * `check(level)` is the caller's requirement check.
 */
export function veteranLevel(state, profession, size, from, check) {
  const credit = militaryCredit(state, profession);
  if (!credit.steps) return null;
  const ladder = ladderFor(profession, size);
  let cur = from ?? entryLevels(profession, size)[0];
  let best = null;
  const start = cur;
  // Supervisors only — never budget holders or executives — and in government
  // only private-sector-style lateral rungs: ranks there are won by exam and promotion.
  const allowed = (l) => !l.appointed && ladder.includes(l) && check(l) && l.grade <= start.grade + 2
    && !l.abilities?.some((x) => ['budget', 'hire', 'exec', 'policy', 'sign'].includes(x))
    && (l.track !== 'mgmt' || (credit.leader && profession.sector === 'private'))
    && (cur.track === 'shared' || l.track === cur.track || l.track === 'shared');
  for (let i = 0; i < credit.steps && cur; i++) {
    const options = nextLevels(profession, size, cur.id).filter(allowed);
    // Leaders go to management where the ladder forks; specialists to the technical track.
    const pick = options.find((l) => l.track === (credit.leader && !credit.related ? 'mgmt' : 'ic')) ?? options.find((l) => l.track === 'shared') ?? options.find((l) => l.track === 'mgmt') ?? options[0];
    if (!pick) break;
    cur = pick;
    best = pick;
  }
  return best ? { level: best, reason: credit.reason } : null;
}
