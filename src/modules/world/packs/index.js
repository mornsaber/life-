/**
 * Country packs: a new country in one file.
 *
 * A pack is plain data (it imports nothing from the game, so any module can
 * read it at load time). It names the country it is `basedOn`; every
 * per-country table in the game (taxes aside, which live on `country`)
 * calls `fromPacks(TABLE, 'KEY')` after it is defined, and gets the pack's
 * own entry from `tables.KEY` — or, where the pack has none, the base
 * country's entry. An entry can be a function of the base's entry, to tweak
 * it instead of restating it. See docs/ADDING-A-COUNTRY.md.
 */
import { NZ } from './NZ.js';
import { IE } from './IE.js';
import { ES } from './ES.js';

export const PACKS = [NZ, IE, ES];

const entryFor = (p, table, key) => {
  const own = p.tables?.[key];
  const base = p.basedOn ? table[p.basedOn] : undefined;
  if (typeof own === 'function') return own(base);
  if (own !== undefined) return own;
  if (p.noInherit?.includes(key)) return undefined;
  return base;
};

/** Fill a table keyed by country with every pack's entry. */
export function fromPacks(table, key) {
  for (const p of PACKS) {
    if (table[p.id] !== undefined) continue;
    const v = entryFor(p, table, key);
    if (v !== undefined) table[p.id] = v;
  }
  return table;
}

/** The same, for a table of tables keyed by country ({ thing: { GB: …, AU: … } }). */
export function fromPacksNested(table, key) {
  for (const p of PACKS) {
    for (const [sub, inner] of Object.entries(table)) {
      if (!inner || typeof inner !== 'object' || inner[p.id] !== undefined) continue;
      const own = p.tables?.[key]?.[sub];
      const v = own !== undefined ? own : p.noInherit?.includes(key) ? undefined : inner[p.basedOn];
      if (v !== undefined) inner[p.id] = v;
    }
  }
  return table;
}

/** Add pack countries to a list of countries (groupings like the EU or common-law systems). */
export function joinGroup(list, group) {
  for (const p of PACKS) if (p.groups?.includes(group) && !list.includes(p.id)) list.push(p.id);
  return list;
}

/** The playable-country entries the packs add. */
export const packCountries = () => Object.fromEntries(PACKS.map((p) => [p.id, { ...p.country, id: p.id }]));

/**
 * Two-way lists: a pack's `field` (e.g. `peers: ['AU', 'GB']`) also adds the
 * pack's country to each of those countries' own lists in `table`.
 */
export function mutual(table, field) {
  for (const p of PACKS) {
    for (const other of p[field] ?? []) {
      const list = table[other];
      if (Array.isArray(list) && !list.includes(p.id)) list.push(p.id);
    }
  }
  return table;
}

/** Pairs of countries (treaties): adds [pack, other] for each of a pack's `field`. */
export function joinPairs(pairs, field) {
  for (const p of PACKS) for (const other of p[field] ?? []) if (!pairs.some(([a, b]) => (a === p.id && b === other) || (a === other && b === p.id))) pairs.push([p.id, other]);
  return pairs;
}

/** A pack's extra rows for a table keyed by id (elected offices, name pools). */
export const packRows = (field) => Object.assign({}, ...PACKS.map((p) => p[field] ?? {}));
