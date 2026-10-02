/**
 * Save migration: upgrade a save from any earlier STATE_VERSION instead of
 * wiping it. Each step rewrites what changed shape in that version; then
 * every key a newer version added is deep-filled from a fresh template
 * (never overwriting what the save already has), and modules' init() hooks
 * fill their own slices. Anything that needs game logic (re-hiring a v1 job
 * into today's career ladder, mapping old certifications) is left as a
 * `legacy*` marker that modules convert on the 'save:migrated' bus event.
 *
 * Tested against real saves from every past version (tests/fixtures/).
 */

/** v(n) → v(n+1) */
export const MIGRATIONS = {
  // v1 → v2: retirement became its own slice; jobs moved to levels/employers;
  // emergency certifications moved into the credentials registry.
  1(s) {
    const pensionId = (label) => (/VA/.test(label) ? 'va' : /Medal of Honor/.test(label) ? 'moh' : 'military');
    s.retirement = {
      retired: Boolean(s.career?.retired),
      dc: s.finances?.retirement ?? 0,
      pensions: (s.military?.benefits ?? []).map((b) => ({ id: pensionId(b.label), label: b.label, annual: b.annual, startAge: b.startAge, source: pensionId(b.label) === 'va' ? 'va' : 'military', cola: 0.025 })),
      plans: {},
      ssEarnings: [],
      socialSecurity: null,
    };
    delete s.finances.retirement;
    delete s.career.retired;
    delete s.military.benefits;
    s.finances.ledger.deductions ??= [];
    if (s.career.job) {
      s.career.legacyJob = s.career.job;
      s.career.job = null;
    }
    s.career.history = s.career.history.map(({ company, peakTier, ...h }) => ({ ...h, employerName: h.employerName ?? company, peakGrade: h.peakGrade ?? peakTier ?? 0 }));
    for (const member of Object.values(s.emergency ?? {})) {
      if (member && Array.isArray(member.certs)) {
        s.legacyCerts = [...(s.legacyCerts ?? []), ...member.certs];
        delete member.certs;
      }
    }
  },
  // v2 → v3: residency, housing and politics slices (filled from the template).
  2(s) {
    s.character.residencySince ??= 0;
    if (s.career.job) s.career.job.passovers ??= 0;
  },
  // v3 → v4: the housing cycle became the shared economy.
  3(s) {
    if (s.housing) delete s.housing.cycle;
  },
};

const isObject = (x) => x && typeof x === 'object' && !Array.isArray(x);

/** Copy keys missing from `target` out of `template`, recursively. Arrays and existing values are left alone. */
export function deepFill(target, template) {
  for (const [key, value] of Object.entries(template)) {
    if (!(key in target)) target[key] = structuredClone(value);
    else if (isObject(target[key]) && isObject(value)) deepFill(target[key], value);
  }
  return target;
}

/**
 * Upgrade `raw` to `version`. Returns { state, from } or null when the save
 * is unusable (newer than this build, or not a life at all).
 */
export function migrate(raw, version, template) {
  if (!isObject(raw) || !isObject(raw.character) || !Number.isInteger(raw.version)) return null;
  if (raw.version > version) return null;
  const from = raw.version;
  const state = structuredClone(raw);
  for (let v = from; v < version; v++) MIGRATIONS[v]?.(state);
  // Fill the template's shape but keep this life's identity and history.
  const { character, log, prompts, lifeId, ...shape } = template;
  deepFill(state, shape);
  deepFill(state.character, character);
  state.log ??= [];
  state.prompts ??= [];
  state.version = version;
  return { state, from };
}
