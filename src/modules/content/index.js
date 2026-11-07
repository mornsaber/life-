/**
 * Content packs: careers, events and more as data (see docs/CONTENT-PACKS-PLAN.md).
 * Every pack is validated when the game loads; a broken pack fails the tests, not the player.
 */
import { compileEvent, validateEvent } from './Rules.js';
import lifeCore from './packs/life-core.js';
import lifeStages from './packs/life-stages.js';

export const CONTENT_PACKS = [lifeCore, lifeStages];

const ids = new Set();
export const PACK_PROBLEMS = [];
const compiled = [];
for (const pack of CONTENT_PACKS) {
  for (const def of pack.events ?? []) {
    const problems = validateEvent(def, { ids });
    if (problems.length) { PACK_PROBLEMS.push(...problems.map((p) => `${pack.id}: ${p}`)); continue; }
    ids.add(def.id);
    compiled.push(compileEvent(def));
  }
}
/** Events that can come up at random. */
export const PACK_EVENTS = compiled.filter((e) => !e.followUp);
/** Events that only come when an earlier choice planted them. */
export const PACK_FOLLOW_UPS = Object.fromEntries(compiled.filter((e) => e.followUp).map((e) => [e.id, e]));
