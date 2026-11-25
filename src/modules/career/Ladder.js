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

/**
 * The detective (CID) chain of command: detectives answer to detective sergeants,
 * inspectors and chief inspectors, not to the uniformed ranks. ranks = [[id, title, grade, minSize, reports]].
 */
export function detectiveRanks(ranks) {
  return ranks.map(([id, title, grade, minSize, reports], i) => L(id, title, grade, {
    track: 'ic', minSize, reports,
    abilities: ['arrest', 'audit', 'supervise', ...(i ? ['command'] : []), ...(i > 1 ? ['budget'] : [])],
    ...(i ? { req: { credentials: ['supervisorCourse'] } } : {}),
  }));
}

/**
 * Detective and fire-investigation rungs aren't a ladder of their own: they're postings within a
 * rank (career/Assignments.js). The levels stay defined (for titles and old saves) but no one is
 * promoted into them.
 */
const ASSIGNMENT_LEVELS = {
  police: /^(detective|seniorDetective|investigator|majorCrimes|det[A-Z]\w*)$/,
  fire: /^(inspector|investigator)$/,
};
const POLICE_IDS = ['police', 'transitPolice', 'airportPolice', 'universityPolice', 'sheriff', 'statePolice'];
const FIRE_IDS = ['fire', 'airportFire', 'stateFire'];
export function isAssignmentLevel(profession, level) {
  const id = profession?.template ?? profession?.id;
  const re = POLICE_IDS.includes(id) ? ASSIGNMENT_LEVELS.police : FIRE_IDS.includes(id) ? ASSIGNMENT_LEVELS.fire : null;
  return Boolean(re && level && level.track === 'ic' && re.test(level.id));
}

/** A rung's grade at an employer of this size (a big agency's chief sits above its extra command ranks). */
export const gradeAt = (level, size) => level?.gradeBySize?.[size] ?? level?.grade;
const COPIES = new WeakMap();

export function ladderFor(profession, size) {
  const raw = rawLadder(profession, size);
  if (!raw.some((l) => l.gradeBySize?.[size] != null)) return raw;
  // The same rung object each time for a size (callers compare rungs), graded for that size.
  const cache = (COPIES.get(profession) ?? COPIES.set(profession, new Map()).get(profession));
  return raw.map((l) => {
    if (l.gradeBySize?.[size] == null) return l;
    const k = `${l.id}@${size}`;
    if (!cache.has(k)) cache.set(k, { ...l, grade: l.gradeBySize[size], sized: true });
    return cache.get(k);
  });
}
function rawLadder(profession, size) {
  // Owning the firm isn't a promotion: you found or buy a business for that (Business).
  const levels = profession.levels.filter((l) => !l.founder && !isAssignmentLevel(profession, l));
  // A tiny agency has no middle ranks: the core jobs, a first-line supervisor and the head.
  if (size === 'micro') return levels.filter((l) => !l.minSize && !l.microDrop);
  // A national agency is one employer, field office to headquarters: its whole chain of command is
  // yours to climb, whatever the size of the office you started in.
  if (profession.sector === 'federal') return levels;
  return levels.filter((l) => sizeRank(size) >= sizeRank(l.minSize));
}

/* ------------------------------------------------------------------ */
/* Government tiers: tiny agencies and major-city / national ones      */
/* ------------------------------------------------------------------ */

export const GOV_SECTORS = ['municipal', 'state', 'federal', 'public'];
/** Careers whose ladders aren't agency rank structures (universities, labs, courts' judges). */
const TIER_EXEMPT = ['college', 'university', 'nationalLab', 'research', 'courts', 'colonialService', 'colonialPolice', 'colonialTroops', 'colonialMedical', 'gendarmerie', 'ministry'];

const POLICE = ['police', 'sheriff', 'statePolice', 'transitPolice', 'universityPolice', 'airportPolice', 'privatePolice'];
const CORRECTIONS = ['jail', 'corrections', 'federalPrisons'];
const FEDERAL_LE = ['fbi', 'dea', 'atf', 'usms', 'usss', 'oig', 'cbp', 'hsi', 'tsa', 'borderPatrol'];
const FIRE = ['fire', 'airportFire', 'stateFire', 'ems'];
const SCHOOLS = ['education', 'schoolBus'];
/** The command ranks of particular services, in their own words (a library has no deputy commissioner). */
const MEGA_BY_ID = {
  library: ['Principal Librarian', 'Assistant City Librarian', 'Deputy City Librarian'],
  publicWorks: ['Division Engineer', 'Assistant Director of Public Works', 'Deputy Director of Public Works'],
  waterUtility: ['Division Manager', 'Assistant Director of Water Utilities', 'Deputy Director of Water Utilities'],
  publicHealth: ['Bureau Director', 'Assistant Health Commissioner', 'Deputy Health Commissioner'],
  municipalAdmin: ['Department Director', 'Deputy City Manager'],
  councilInspector: ['Deputy Building Official', 'Assistant Building Commissioner', 'Deputy Building Commissioner'],
  forester: ['Regional Forester', 'Assistant State Forester', 'Deputy State Forester'],
  gameWarden: ['Warden Major', 'Assistant Chief Game Warden', 'Deputy Chief Game Warden'],
  probation: ['Head of Area', 'Deputy Regional Director', 'Deputy Director of Probation'],
  prosecution: ['Bureau Chief', 'Executive Assistant DA', 'Chief Assistant DA'],
  maritimeFaculty: ['Dean of the Academy', 'Vice President for Academic Affairs', 'Provost'],
  transit: ['Assistant General Superintendent', 'General Superintendent', 'Deputy General Manager'],
  animalControl: ['Division Manager', 'Assistant Director of Animal Services', 'Deputy Director of Animal Services'],
  schoolBus: ['Assistant Director of Transportation', 'Director of Pupil Transportation'],
  postal: ['Senior Plant Manager', 'Area Manager', 'Area Vice President'],
  meteorology: ['Division Chief', 'Office Director', 'Deputy Assistant Administrator'],
};
/** Extra command ranks big agencies have, inserted below the head (by kind of agency). */
export function megaRanks(profession) {
  const id = profession.id;
  if (FEDERAL_LE.includes(id)) return ['Section Chief', 'Deputy Assistant Director', 'Assistant Director'];
  if (POLICE.includes(id)) return ['Deputy Inspector', 'Inspector', 'Assistant Chief', 'Chief of Department'];
  if (FIRE.includes(id)) return ['Deputy Assistant Chief', 'Assistant Chief', 'Chief of Department'];
  if (CORRECTIONS.includes(id)) return ['Complex Warden', 'Regional Deputy Director', 'Deputy Commissioner of Corrections'];
  if (id === 'education') return ['Network Superintendent', 'Chief Academic Officer'];
  if (MEGA_BY_ID[id]) return MEGA_BY_ID[id];
  if (profession.sector === 'federal') return ['Division Director', 'Deputy Associate Administrator', 'Associate Administrator'];
  return ['Division Director', 'Assistant Commissioner', 'Deputy Commissioner'];
}

/**
 * Give every government career its tiers, once: mark the middle ranks a tiny
 * agency doesn't have, and insert the extra command ranks of a major agency.
 */
export function addGovernmentTiers(profession) {
  if (profession.tiered || !GOV_SECTORS.includes(profession.sector) || TIER_EXEMPT.includes(profession.template ?? profession.id)) return;
  profession.tiered = true;
  const levels = profession.levels;
  // Supervisory differential: a supervisor out-earns the people at the same grade they supervise,
  // and each supervisory rank sharing a grade with the one below pays a little more.
  let prevSup = null;
  for (const l of levels) {
    const sup = l.abilities.includes('supervise') || l.track === 'mgmt';
    if (!sup) continue;
    if (levels.some((x) => x !== l && x.grade === l.grade && !(x.abilities.includes('supervise') || x.track === 'mgmt'))) l.rankPay ??= 1.08;
    if (prevSup && prevSup.grade === l.grade) l.rankPay = Math.round(((prevSup.rankPay ?? 1) + 0.06) * 100) / 100;
    prevSup = l;
  }
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
  // Ranks above one the ladder already has; never one that would sit below it.
  const ranks = megaRanks(profession);
  const have = ranks.reduce((m, t, i) => (levels.some((l) => l.title === t) ? i : m), -1);
  const titles = ranks.slice(have + 1);
  // A federal field agency's head of office (a Special Agent in Charge) answers to headquarters:
  // its section chiefs and assistant directors sit above, not below.
  const hq = FEDERAL_LE.includes(profession.id) && /in Charge/.test(top.title);
  const at = levels.indexOf(top) + (hq ? 1 : 0);
  const added = titles.map((title, i) => ({
    id: `${top.id}_cmd${i + 1}`, title, grade: Math.min(top.grade, below.grade + 1 + Math.floor(i / 2)), track: 'mgmt', years: 3,
    abilities: [...new Set([...below.abilities, 'supervise', 'budget'])], minSize: 'mega', reports: (below.reports ?? 6) + 4 * (i + 1),
    ...(below.req ? { req: below.req } : {}), command: true,
    // Ranks that share a grade still pay more the higher they sit.
    rankPay: Math.round((1 + 0.04 * (i + 1)) * 100) / 100,
  }));
  levels.splice(at, 0, ...added);
  // At a major agency the head out-earns every command rank under it.
  if (added.length && !hq) top.megaHeadPay = Math.round((1 + 0.04 * (added.length + 1)) * 100) / 100;
}

/**
 * Grades in order: each promotion is a step up. Along each track a rung sits at least one grade
 * above the one before it (two titles no longer share a grade; the first rung of a fork may share
 * the last core grade, as a sergeant shares a senior constable's). A ladder that needs it climbs
 * past G10 (G11+). Grades are worked out for each employer size, since a big employer's extra
 * ranks push the ones above them up: `grade` is the rung's grade at a mid-size employer (or the
 * smallest that has it), `gradeBySize` where another size differs, and `origGrade` the grade the
 * ladder was written with (pay is priced from it, plus a step for each grade gained).
 */
export function normaliseGrades(profession) {
  if (profession.normalised) return;
  profession.normalised = true;
  const at = new Map();
  for (const size of SIZE_ORDER) {
    const ladder = rawLadder(profession, size);
    const shared = ladder.filter((l) => l.track === 'shared');
    let prev = -Infinity;
    const put = (l, g) => { if (!at.has(l)) at.set(l, {}); at.get(l)[size] = g; return g; };
    for (const l of shared) prev = put(l, Math.max(l.grade, prev + 1));
    const forkFloor = prev === -Infinity ? -Infinity : prev;
    for (const t of ['ic', 'mgmt']) {
      let p = forkFloor - 1;
      for (const l of ladder.filter((x) => x.track === t)) p = put(l, Math.max(l.grade, p + 1));
    }
  }
  for (const [l, by] of at) {
    const base = by.medium ?? by[SIZE_ORDER.find((s) => by[s] != null)];
    const others = Object.fromEntries(Object.entries(by).filter(([, g]) => g !== base));
    const changed = base !== l.grade || Object.keys(others).length;
    if (!changed) continue;
    l.origGrade = l.grade;
    l.grade = base;
    if (Object.keys(others).length) l.gradeBySize = others;
  }
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
  // A level this employer's ladder doesn't have (a size change, an old save): nowhere to step down to.
  if (!current) return null;
  // Never back into a training post (a recruit or a trainee is still in the academy).
  const entry = ladder.findIndex((l) => l.entry);
  const before = ladder.slice(Math.max(0, entry), idx).reverse();
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
