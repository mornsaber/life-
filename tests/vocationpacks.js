/**
 * Every vocation pack (career/vocations/*): it loads, its jobs exist, every item resolves its
 * name in every era and sample country, nothing modern shows before its time, and no course
 * can stall a career (none gates the first rungs; each can be taken from the rung below it).
 *
 *   node tests/vocationpacks.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession, PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { VOCATIONS, packFor, applies, nameOf, gates } from '../src/modules/career/Vocations.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const YEARS = [1835, 1890, 1935, 1975, 2010];
const PLACES = ['US', 'GB', 'FR', 'IN', 'JP'];
const MODERN = /\b(online|digital|computer|software|internet|e-?mail|app\b|ACLS|ATLS|CDL|cloud|cyber|drone|GPS|livestream|podcast|social media|MBA)\b/i;
const MODERN_FROM = 1960;
const LISTS = ['courses', 'postings', 'awards', 'complaints', 'elite', 'specialties'];

function lifeAt(cc, year, professionId) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - 30, gender: 'male' });
  state.character.age = 30;
  state.prompts = [];
  const ctx = engine.context();
  const p = getProfession(professionId);
  const level = p.levels.find((l) => !l.appointed) ?? p.levels[0];
  try { hire(ctx, { professionId, levelId: level.id, employer: createEmployer(ctx.rng, state, p, state.character.regionId) }); } catch { /* some jobs can't be hired here */ }
  return state;
}

const tests = {
  'every pack: jobs exist, one pack per job, ids unique'() {
    const seen = {};
    for (const pack of Object.values(VOCATIONS)) {
      for (const id of pack.professions) {
        assert.ok(PROFESSIONS[id] || getProfession(id), `${pack.id}: unknown job ${id}`);
        assert.ok(!seen[id], `${id} in both ${seen[id]} and ${pack.id}`);
        seen[id] = pack.id;
      }
      for (const k of LISTS) {
        const ids = (pack[k] ?? []).map((x) => x.id);
        assert.equal(new Set(ids).size, ids.length, `${pack.id}.${k}: duplicate ids`);
      }
    }
  },
  'every item names itself in every era and country, and nothing modern shows early'() {
    for (const pack of Object.values(VOCATIONS)) {
      const job = pack.professions[0];
      for (const year of YEARS) {
        for (const cc of PLACES) {
          const state = lifeAt(cc, year, job);
          for (const k of LISTS) {
            for (const item of pack[k] ?? []) {
              if (!applies(state, pack, item)) continue;
              const name = nameOf(state, item) ?? item.short ?? item.text;
              assert.ok(typeof name === 'string' && name.length, `${pack.id}.${k}.${item.id}: no name in ${cc} ${year}`);
              if (year < MODERN_FROM) assert.doesNotMatch(String(name), MODERN, `${pack.id}.${k}.${item.id} in ${year}: "${name}"`);
              if (typeof item.text === 'function') item.text(state);
            }
          }
          const reg = pack.regulator?.(state);
          if (reg) assert.ok(reg.name, `${pack.id}: regulator without a name`);
        }
      }
    }
  },
  'no course stalls a career'() {
    for (const pack of Object.values(VOCATIONS)) {
      for (const id of pack.professions) {
        const p = getProfession(id);
        const ladder = p.levels.filter((l) => !l.appointed);
        const firstGrades = new Set(ladder.slice(0, 2).map((l) => l.grade));
        for (const c of pack.courses ?? []) {
          for (const l of ladder) {
            if (!gates(c, l)) continue;
            assert.ok(!firstGrades.has(l.grade) || ladder.indexOf(l) >= 2, `${pack.id}.${c.id} gates ${id}'s first rungs (${l.id})`);
            const below = Math.max(...ladder.filter((x) => x.grade < l.grade).map((x) => x.grade), 0);
            assert.ok((c.minGrade ?? 0) <= below, `${pack.id}.${c.id} needs grade ${c.minGrade} but gates ${id}.${l.id} (rung below is grade ${below})`);
            assert.ok((c.minYears ?? 0) <= 15, `${pack.id}.${c.id}: ${c.minYears} years is too long a wait`);
          }
        }
      }
    }
  },
  'each pack is found from its jobs'() {
    for (const pack of Object.values(VOCATIONS)) for (const id of pack.professions) assert.equal(packFor({ career: {} }, id)?.id, pack.id, id);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
