/**
 * Decks: the event lists a module plays in its own way (a workplace event, a business crisis,
 * a posting at sea). Unlike life events they keep the option fields their module understands,
 * but they live in content packs and are validated the same way: every deck has a kind, and
 * each kind has a schema checked when the game loads (and by tests/contentpacks.js).
 *
 *   pack.decks = { 'work.everyday': [ event, ... ], ... }   a deck id is `kind.name`
 *   deck('work.everyday')                                   the events, from every pack
 */
import { STAT_KEYS } from '../../core/State.js';
import { OFFENSES } from '../legal/Offenses.js';
import workEvents from './packs/work-events.js';
import businessEvents from './packs/business-events.js';
import militaryEvents from './packs/military-events.js';
import { MEDALS } from '../military/MedalEngine.js';
import { UCMJ_OFFENSES } from '../military/UCMJ.js';

export const DECK_PACKS = [workEvents, businessEvents, militaryEvents];

const isFn = (v) => typeof v === 'function';
const statsOk = (stats, where, p) => { for (const k of Object.keys(stats ?? {})) if (!STAT_KEYS.includes(k)) p.push(`${where}: unknown stat ${k}`); };

/** Each kind: the option (and event) fields it knows, and any deeper checks. */
export const DECK_KINDS = {
  combat: {
    event: ['id', 'title', 'text', 'options'],
    option: ['id', 'label', 'success', 'risk', 'valor', 'specialty', 'medicOnly'],
    check(e, o, where, p) {
      if (!(o.success > 0 && o.success <= 1)) p.push(`${where}: success must be in (0, 1]`);
      if (!(o.risk >= 0 && o.risk <= 1)) p.push(`${where}: risk must be in [0, 1]`);
      if (o.valor != null && !(o.valor >= 0 && o.valor <= 110)) p.push(`${where}: valor must be 0–110`);
      if (o.medicOnly && e.options.every((x) => x.medicOnly)) p.push(`${e.id}: every option is medic-only`);
    },
  },
  duty: {
    event: ['id', 'title', 'text', 'options'],
    option: ['id', 'label', 'text', 'effects', 'check', 'failText', 'failEffects', 'risky', 'medal'],
    check(e, o, where, p) {
      const fx = (x, w) => { for (const k of Object.keys(x ?? {})) if (!['eval', 'disciplinary', 'cash', 'stats'].includes(k)) p.push(`${w}: unknown effect ${k}`); statsOk(x?.stats, w, p); };
      if (!o.text || !o.effects) p.push(`${where}: needs text and effects`);
      fx(o.effects, where);
      if (o.check) {
        if (!STAT_KEYS.includes(o.check.stat) || typeof o.check.min !== 'number') p.push(`${where}: check needs a stat and a min`);
        if (!o.failText) p.push(`${where}: a check needs failText`);
        fx(o.failEffects, `${where}.fail`);
      }
      if (o.risky) {
        for (const k of Object.keys(o.risky)) if (!['chance', 'text', 'eval', 'disciplinary', 'ucmj'].includes(k)) p.push(`${where}: unknown risky field ${k}`);
        if (!(o.risky.chance > 0 && o.risky.chance <= 1) || !o.risky.text) p.push(`${where}: risky needs a chance and text`);
        if (o.risky.ucmj && !UCMJ_OFFENSES[o.risky.ucmj]) p.push(`${where}: unknown UCMJ offense ${o.risky.ucmj}`);
      }
      if (o.medal && !MEDALS[o.medal]) p.push(`${where}: unknown medal ${o.medal}`);
    },
  },
  business: {
    event: ['id', 'title', 'text', 'options', 'sectors', 'auto', 'owner', 'minStaff', 'notStartup', 'duty'],
    option: ['id', 'label', 'apply', 'hint'],
    check(e, o, where, p) {
      if (typeof o.apply !== 'function') p.push(`${where}: needs apply(ctx, business)`);
      if (e.auto && !e.options.some((x) => x.id === e.auto)) p.push(`${e.id}: auto picks ${e.auto}, which isn't an option`);
    },
  },
  work: {
    event: ['id', 'title', 'text', 'options', 'when', 'signature', 'minGrade', 'remote', 'sector', 'mgmt'],
    option: ['id', 'label', 'text', 'perf', 'boss', 'coworkers', 'stats', 'money', 'check', 'risky'],
    risky: ['chance', 'text', 'perf', 'boss', 'money', 'stats', 'injury', 'offense'],
    check(e, o, where, p) {
      statsOk(o.stats, where, p);
      if (o.check && !STAT_KEYS.includes(o.check)) p.push(`${where}: check on unknown stat ${o.check}`);
      if (o.risky) {
        for (const k of Object.keys(o.risky)) if (!this.risky.includes(k)) p.push(`${where}: unknown risky field ${k}`);
        if (!(o.risky.chance > 0 && o.risky.chance <= 1)) p.push(`${where}: risky.chance must be in (0, 1]`);
        if (!o.risky.text) p.push(`${where}: risky needs text`);
        statsOk(o.risky.stats, `${where}.risky`, p);
        if (o.risky.offense && !OFFENSES[o.risky.offense]) p.push(`${where}: unknown offense ${o.risky.offense}`);
      }
    },
  },
};

/** Problems with one deck event (empty when valid). */
export function validateDeckEvent(kind, e, ids = new Set()) {
  const k = DECK_KINDS[kind];
  const p = [];
  if (!k) return [`unknown deck kind ${kind}`];
  if (!e?.id) return ['an event without an id'];
  if (ids.has(e.id)) p.push(`duplicate id ${e.id}`);
  for (const f of Object.keys(e)) if (!k.event.includes(f)) p.push(`${e.id}: unknown field ${f}`);
  if (!e.title || !e.text) p.push(`${e.id}: needs a title and text`);
  if (e.when && !isFn(e.when)) p.push(`${e.id}: when must be a function`);
  if (!(e.options?.length >= 1)) p.push(`${e.id}: needs options`);
  const oids = new Set();
  for (const o of e.options ?? []) {
    const where = `${e.id}.${o.id}`;
    if (!o.id || !o.label) p.push(`${e.id}: option missing id or label`);
    if (oids.has(o.id)) p.push(`${where}: duplicate option`);
    oids.add(o.id);
    for (const f of Object.keys(o)) if (!k.option.includes(f)) p.push(`${where}: unknown option field ${f}`);
    k.check?.(e, o, where, p);
  }
  return p;
}

const DECKS = {};
export const DECK_PROBLEMS = [];
for (const pack of DECK_PACKS) {
  for (const [id, events] of Object.entries(pack.decks ?? {})) {
    const kind = id.split('.')[0];
    const ids = new Set(Object.values(DECKS).flat().map((e) => e.id));
    for (const e of events) {
      const problems = validateDeckEvent(kind, e, ids);
      if (problems.length) { DECK_PROBLEMS.push(...problems.map((x) => `${pack.id} ${id}: ${x}`)); continue; }
      ids.add(e.id);
      (DECKS[id] ??= []).push(e);
    }
  }
}

/** A deck's events, from every pack (an unknown deck is empty). */
export const deck = (id) => DECKS[id] ?? [];
export const deckIds = () => Object.keys(DECKS);
