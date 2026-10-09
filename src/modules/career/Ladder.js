/**
 * Career ladders. Each profession lists its levels in order; a level belongs
 * to a track:
 *   'shared' — the common early levels everyone climbs
 *   'ic'     — individual-contributor / technical-specialist branch
 *   'mgmt'   — supervisory / management branch
 * After the last shared level the ladder forks. Professions have different
 * numbers of levels, and bigger employers expose more of them: a level with
 * `minSize: 'large'` simply doesn't exist at a small or mid-size employer.
 *
 * Levels also grant *abilities* (what you're empowered to do), which unlock
 * management tools, misconduct temptations, policy decisions and so on.
 */

/**
 * Employer sizes, smallest first. 'micro' and 'mega' only apply to government
 * agencies, sized from the population they serve: a three-officer town police
 * department, or the NYPD, a statewide system or a national agency.
 */
export const SIZE_ORDER = ['micro', 'small', 'medium', 'large', 'enterprise', 'mega'];
const sizeRank = (size) => Math.max(0, SIZE_ORDER.indexOf(size ?? 'micro'));

export const ABILITIES = {
  supervise: { label: 'Supervises staff', icon: '👥' },
  hire: { label: 'Hiring authority', icon: '🤝' },
  budget: { label: 'Owns a budget', icon: '💰' },
  sign: { label: 'Signing authority', icon: '✍️' },
  delegate: { label: 'Runs a department', icon: '🏢' },
  exec: { label: 'Executive leadership', icon: '👔' },
  policy: { label: 'Sets policy', icon: '📜' },
  arrest: { label: 'Arrest powers', icon: '🚔' },
  inspect: { label: 'Inspection authority', icon: '🔎' },
  prescribe: { label: 'Prescribing authority', icon: '💊' },
  represent: { label: 'Represents clients', icon: '⚖️' },
  audit: { label: 'Audit & investigate', icon: '🧾' },
  trade: { label: 'Trades securities', icon: '📈' },
  diplomatic: { label: 'Diplomatic status', icon: '🛂' },
  classified: { label: 'Classified access', icon: '🔐' },
  command: { label: 'Incident command', icon: '📡' },
  custody: { label: 'Custody of inmates', icon: '🔐' },
  tenure: { label: 'Tenured — can\'t be fired for performance', icon: '🎓' },
};

const DEFAULT_YEARS = (grade) => (grade <= 3 ? 1 : grade <= 5 ? 2 : grade <= 7 ? 3 : 4);

/** Level builder: L('id', 'Title', grade, { track, entry, minSize, req, abilities, reports, years }) */
export function L(id, title, grade, opts = {}) {
  return { id, title, grade, track: opts.track ?? 'shared', years: opts.years ?? DEFAULT_YEARS(grade), abilities: opts.abilities ?? [], ...opts };
}

export function ladderFor(profession, size) {
  // A tiny agency has no middle ranks: the core jobs, a first-line supervisor and the head.
  if (size === 'micro') return profession.levels.filter((l) => !l.minSize && !l.microDrop);
  return profession.levels.filter((l) => sizeRank(size) >= sizeRank(l.minSize));
}

/* ------------------------------------------------------------------ */
/* Government tiers: tiny agencies and major-city / national ones      */
/* ------------------------------------------------------------------ */

export const GOV_SECTORS = ['municipal', 'state', 'federal', 'public'];
/** Careers whose ladders aren't agency rank structures (universities, labs, courts' judges). */
const TIER_EXEMPT = ['college', 'university', 'nationalLab', 'research', 'courts'];

const POLICE = ['police', 'sheriff', 'statePolice', 'transitPolice', 'universityPolice', 'airportPolice', 'jail', 'corrections', 'privatePolice', 'gameWarden', 'borderPatrol', 'federalPrisons', 'probation', 'animalControl'];
const FEDERAL_LE = ['fbi', 'dea', 'atf', 'usms', 'usss', 'oig', 'cbp', 'hsi', 'tsa'];
const FIRE = ['fire', 'airportFire', 'stateFire', 'ems', 'dispatch'];
const SCHOOLS = ['education', 'schoolBus'];
/** Extra command ranks big agencies have, inserted below the head (by kind of agency). */
export function megaRanks(profession) {
  const id = profession.id;
  if (FEDERAL_LE.includes(id)) return ['Section Chief', 'Deputy Assistant Director', 'Assistant Director'];
  if (POLICE.includes(id)) return ['Deputy Inspector', 'Inspector', 'Assistant Chief', 'Chief of Department'];
  if (FIRE.includes(id)) return ['Deputy Assistant Chief', 'Assistant Chief', 'Chief of Department'];
  if (SCHOOLS.includes(id)) return ['Network Superintendent', 'Chief Academic Officer'];
  if (profession.sector === 'federal') return ['Division Director', 'Deputy Associate Administrator', 'Associate Administrator'];
  return ['Division Director', 'Assistant Commissioner', 'Deputy Commissioner'];
}

/**
 * Give every government career its tiers, once: mark the middle ranks a tiny
 * agency doesn't have, and insert the extra command ranks of a major agency.
 */
export function addGovernmentTiers(profession) {
  if (profession.tiered || !GOV_SECTORS.includes(profession.sector) || TIER_EXEMPT.includes(profession.id)) return;
  profession.tiered = true;
  const levels = profession.levels;
  if (levels.length < 4) return;
  const base = levels.filter((l) => !l.minSize);
  const top = [...levels].sort((a, b) => b.grade - a.grade || levels.indexOf(b) - levels.indexOf(a))[0];
  const firstSup = base.find((l) => l.abilities.includes('supervise') || l.track === 'mgmt');
  // Tiny agencies: entry and journey jobs, the first supervisor, and the head (the highest rank any agency has).
  const topBase = [...base].sort((a, b) => b.grade - a.grade || base.indexOf(b) - base.indexOf(a))[0];
  if (firstSup && topBase && firstSup !== topBase) {
    for (const l of base) {
      const core = l.track === 'shared' && l.grade <= firstSup.grade;
      if (!core && l !== firstSup && l !== topBase && !l.entry) l.microDrop = true;
    }
  }
  // Major agencies: command ranks between the second-highest management level and the head.
  const mgmt = levels.filter((l) => l.track === 'mgmt' && l !== top && !l.appointed);
  const below = mgmt.sort((a, b) => b.grade - a.grade)[0];
  if (!below || !top) return;
  const titles = megaRanks(profession).filter((t) => !levels.some((l) => l.title === t));
  const at = levels.indexOf(top);
  const added = titles.map((title, i) => ({
    id: `${top.id}_cmd${i + 1}`, title, grade: Math.min(top.grade, below.grade + 1 + Math.floor(i / 2)), track: 'mgmt', years: 3,
    abilities: [...new Set([...below.abilities, 'supervise', 'budget'])], minSize: 'mega', reports: (below.reports ?? 6) + 4 * (i + 1),
    ...(below.req ? { req: below.req } : {}), command: true,
  }));
  levels.splice(at, 0, ...added);
}

export function levelById(profession, levelId) {
  return profession.levels.find((l) => l.id === levelId);
}

export function entryLevels(profession, size) {
  const ladder = ladderFor(profession, size);
  return ladder.filter((l, i) => i === 0 || l.entry);
}

/** The level(s) you can be promoted into next. Two results = a track fork. */
export function nextLevels(profession, size, levelId) {
  const ladder = ladderFor(profession, size);
  const idx = ladder.findIndex((l) => l.id === levelId);
  if (idx === -1) return [];
  const current = ladder[idx];
  const after = ladder.slice(idx + 1);
  if (current.track === 'shared') {
    const nextShared = after.find((l) => l.track === 'shared');
    if (nextShared) return [nextShared];
    return ['ic', 'mgmt'].map((t) => after.find((l) => l.track === t)).filter(Boolean);
  }
  const next = after.find((l) => l.track === current.track);
  if (next) return [next];
  // The end of a specialist (or management) track: senior people compete for
  // the next rung on the other track rather than staying stuck forever.
  const other = ladder.filter((l) => (l.track === 'ic' || l.track === 'mgmt') && l.track !== current.track && l.grade > current.grade && !l.appointed);
  const cross = other.sort((a, b) => a.grade - b.grade)[0];
  return cross ? [cross] : [];
}

/** One step down for demotions: previous level on the same track, else the last shared level. */
export function previousLevel(profession, size, levelId) {
  const ladder = ladderFor(profession, size);
  const idx = ladder.findIndex((l) => l.id === levelId);
  const current = ladder[idx];
  const before = ladder.slice(0, idx).reverse();
  return before.find((l) => l.track === current.track) ?? before.find((l) => l.track === 'shared') ?? null;
}

/** A lateral move onto the other track at the closest grade (≤ current). */
export function lateralLevel(profession, size, levelId) {
  const ladder = ladderFor(profession, size);
  const current = ladder.find((l) => l.id === levelId);
  if (!current || current.track === 'shared') return null;
  const other = current.track === 'ic' ? 'mgmt' : 'ic';
  const candidates = ladder.filter((l) => l.track === other && l.grade <= current.grade);
  return candidates[candidates.length - 1] ?? null;
}

export const TRACK_LABEL = { shared: 'Core', ic: 'Specialist', mgmt: 'Management' };
