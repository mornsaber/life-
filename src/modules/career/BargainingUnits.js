/**
 * Who a union may represent, by country and job.
 *
 *  - Public-sector labour law: in some countries some public servants may
 *    not unionize at all (police in Japan, Korea, India...); others have a
 *    statutory staff association that consults but cannot bargain or strike
 *    (England's Police Federation, Japan's civil-service associations); and
 *    many may join a union but never strike (Germany's Beamte, French police).
 *  - Supervisors: US private employers and federal agencies exclude them from
 *    any bargaining unit; US state and local governments, Canada, Japan and
 *    Korea give them a separate supervisory unit; most of Europe and Australia
 *    keep them in the same union. Executives are management everywhere.
 *  - Promotion into an excluded rank ends your membership (or moves you to
 *    the supervisory unit).
 *
 * job.unionUnit = 'rank' | 'supervisory'   job.employer.supUnion = the supervisory unit
 */
import { getProfession } from './JobTrees.js';
import { unionKind, localUnionName } from '../world/CountryLaw.js';
import { fromPacks } from '../world/packs/index.js';

/**
 *   noStrike     kinds of work where strikes are unlawful
 *   association  kinds represented by a staff association: consultation and a pay review body, no bargaining, no strikes
 */
export const PUBLIC_LABOUR = {
  US: { noStrike: ['police', 'fire', 'prisons'], association: [] },
  CA: { noStrike: ['police'], association: [] },
  GB: { noStrike: ['police', 'prisons'], association: ['police'] },
  DE: { noStrike: ['police', 'prisons', 'public', 'education'], association: [] },
  FR: { noStrike: ['police', 'prisons'], association: [] },
  IT: { noStrike: ['police'], association: [] },
  JP: { noStrike: ['public', 'education', 'postal'], association: ['public', 'education'] },
  KR: { noStrike: ['public', 'fire', 'ems', 'education'], association: [] },
  MX: { noStrike: ['public'], association: [] },
  PH: { noStrike: ['public', 'education', 'ems'], association: [] },
  IN: { noStrike: ['public'], association: [] },
  AU: { noStrike: ['police'], association: [] },
};
fromPacks(PUBLIC_LABOUR, 'PUBLIC_LABOUR');
/** What a staff association is called where it isn't a union (null: the union's own name). */
const ASSOCIATION_NAME = { JP: { public: 'Civil Servants\' Association (Shokuin Dantai)', education: 'Teachers\' Association (Shokuin Dantai)' } };

/** The kind of work a profession's union organizes (police, fire, public, ...). */
export const kindOf = (profession) => unionKind(profession?.union?.name) ?? (profession?.sector === 'private' ? 'services' : 'public');

/** How country law shapes a new workplace's union: { strike, association, name } — or { banned } where the law forbids it. */
export function unionLaw(cc, profession, { publicBargaining = true } = {}) {
  const kind = kindOf(profession);
  const law = PUBLIC_LABOUR[cc ?? 'US'] ?? PUBLIC_LABOUR.US;
  const isPublic = profession.sector !== 'private';
  if (cc && cc !== 'US' && profession.union && !localUnionName(cc, profession.union.name)) return { banned: 'The law forbids a union for this work here' };
  // US states that forbid public-sector bargaining: police and firefighters keep meet-and-confer associations.
  if ((cc ?? 'US') === 'US' && isPublic && profession.sector !== 'federal' && !publicBargaining) {
    return ['police', 'fire'].includes(kind) ? { association: true, strike: false } : { banned: 'Collective bargaining is outlawed for public employees in this state' };
  }
  const association = isPublic && law.association.includes(kind);
  return {
    association,
    strike: !association && !(isPublic && law.noStrike.includes(kind)) && ((cc ?? 'US') !== 'US' || profession.union?.strike !== false),
    name: association ? ASSOCIATION_NAME[cc]?.[kind] ?? null : null,
  };
}

/** Do supervisors bargain in the same unit, a separate one, or not at all? */
function supervisorRule(cc, job, kind) {
  if (cc === 'GB' && kind === 'police') return job.grade >= 8 || job.abilities.includes('exec') ? 'separate' : 'same';
  if (job.abilities.includes('exec') || job.headOf) return 'excluded';
  if (cc === 'US') return job.sector === 'private' || job.sector === 'federal' ? 'excluded' : 'separate';
  return ['CA', 'JP', 'KR'].includes(cc) ? 'separate' : 'same';
}

const SUP_NAMES = {
  US: { police: 'Police Supervisors Association', fire: 'Fire Chief Officers Association', prisons: 'Correctional Supervisors Association', education: 'School Administrators Association' },
  CA: { police: 'Senior Officers\' Association', fire: 'Chief Fire Officers Association' },
  GB: { police: 'Police Superintendents\' Association' },
  JP: {},
  KR: {},
};
function supervisoryName(cc, kind, union, job) {
  if (cc === 'GB' && kind === 'police' && job.abilities.includes('exec')) return 'Chief Police Officers\' Staff Association';
  return SUP_NAMES[cc]?.[kind] ?? (cc === 'JP' ? 'Managerial Staff Union (Kanrishoku Kumiai)' : `${union.name} — Supervisors' Unit`);
}

/**
 * The bargaining unit open to you in this job:
 *   { union, unit: 'rank' | 'supervisory' }   or   { excluded: reason }   or   null (no union here)
 */
export function bargainingUnit(state, job) {
  const union = job?.employer?.union;
  if (!union) return null;
  const cc = state.character.countryId ?? 'US';
  if (!job.abilities.includes('supervise') && !job.headOf) return { union, unit: 'rank' };
  const kind = kindOf(getProfession(job.professionId));
  const rule = supervisorRule(cc, job, kind);
  if (rule === 'same') return { union, unit: 'rank' };
  if (rule === 'excluded') return { excluded: job.abilities.includes('exec') || job.headOf ? 'Executives are management: outside any bargaining unit' : 'Supervisors are excluded from the bargaining unit' };
  const name = supervisoryName(cc, kind, union, job);
  if (job.employer.supUnion?.name !== name) {
    job.employer.supUnion = { name, strike: false, association: Boolean(union.association) || cc === 'GB', duesRate: 0.011, agencyFee: false, contractYearsLeft: union.contractYearsLeft, supervisory: true };
  }
  return { union: job.employer.supUnion, unit: 'supervisory' };
}

/** The union you're actually a member of (rank-and-file or supervisory unit). */
export function memberUnion(job) {
  if (!job?.unionMember) return null;
  return job.unionUnit === 'supervisory' ? job.employer.supUnion ?? null : job.employer.union ?? null;
}

/** The union whose contract covers this job (members or not). */
export function coveringUnion(state, job) {
  const unit = bargainingUnit(state, job);
  return unit?.union ?? null;
}

/**
 * After a promotion or demotion: stay, move to the supervisory unit, or leave.
 * Returns a log line, or null when nothing changed.
 */
export function reconcileMembership(state, job) {
  if (!job?.unionMember) return null;
  const unit = bargainingUnit(state, job);
  const before = memberUnion(job);
  if (!unit || unit.excluded) {
    job.unionMember = false;
    job.unionUnit = null;
    return `${unit?.excluded ?? 'Your new post is outside the bargaining unit'}: your ${before?.name ?? 'union'} membership ended.`;
  }
  if (unit.unit !== (job.unionUnit ?? 'rank')) {
    job.unionUnit = unit.unit;
    return unit.unit === 'supervisory' ? `Your promotion moved you out of ${before?.name ?? 'the union'} and into the ${unit.union.name}.` : `You're back in ${unit.union.name}'s bargaining unit.`;
  }
  return null;
}
