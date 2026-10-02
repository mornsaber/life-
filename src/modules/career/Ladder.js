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

export const SIZE_ORDER = ['small', 'medium', 'large', 'enterprise'];
const sizeRank = (size) => SIZE_ORDER.indexOf(size ?? 'small');

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
  return profession.levels.filter((l) => sizeRank(size) >= sizeRank(l.minSize));
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
  return next ? [next] : [];
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
