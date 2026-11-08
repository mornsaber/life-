/**
 * Content packs (src/modules/content): every pack validates, and every pack event can be
 * checked against a range of lives and played through every option without throwing or
 * printing broken text.
 *
 *   node tests/contentpacks.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { CONTENT_PACKS, PACK_PROBLEMS, PACK_EVENTS, PACK_FOLLOW_UPS } from '../src/modules/content/index.js';
import { validateEvent, compileEvent, test as meets } from '../src/modules/content/Rules.js';
import { LIFE_EVENTS } from '../src/modules/life/LifeEvents.js';
import { CAREER_PACKS, CAREER_PROBLEMS, PACK_PROFESSIONS } from '../src/modules/content/careerPacks.js';
import { validateCareer } from '../src/modules/content/Careers.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { DECK_PROBLEMS, deck, deckIds, validateDeckEvent } from '../src/modules/content/decks.js';
import { resolveWorkEvent } from '../src/modules/career/WorkplaceEvents.js';
import { hire } from '../src/modules/career/CareerEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (seed, age, countryId = 'US') => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = age;
  state.prompts = [];
  state.finances.cash = 20000;
  return { engine, state };
};
const broken = (t) => /undefined|NaN|\[object|null\b/.test(String(t ?? ''));
const allEvents = () => [...PACK_EVENTS, ...Object.values(PACK_FOLLOW_UPS)];

const tests = {
  'every pack validates, and its events reach the game'() {
    assert.deepEqual(PACK_PROBLEMS, []);
    assert.ok(CONTENT_PACKS.length >= 1);
    for (const e of PACK_EVENTS) assert.ok(LIFE_EVENTS.includes(e), `${e.id} is in the life-event pool`);
  },
  'the validator catches the usual mistakes'() {
    const ids = new Set(['taken']);
    const bad = [
      [{ id: 'taken', title: 'x', options: [{ id: 'a', label: 'A' }] }, /duplicate/],
      [{ id: 'x', title: 'x' }, /needs options or run/],
      [{ id: 'x', title: 'x', options: [{ id: 'a', label: 'A', check: { chance: 0.5 }, pass: {} }] }, /pass and fail/],
      [{ id: 'x', title: 'x', when: { agee: [1, 2] }, options: [{ id: 'a', label: 'A' }] }, /unknown condition agee/],
    ];
    for (const [def, re] of bad) assert.match(validateEvent(def, { ids }).join('; '), re);
  },
  'conditions read the state as written'() {
    const { state } = life(1, 30);
    assert.ok(meets(state, { age: [18, 40] }));
    assert.ok(!meets(state, { age: [40, 60] }));
    assert.ok(meets(state, { country: ['US'] }) && !meets(state, { country: { not: ['US'] } }));
    assert.ok(meets(state, { cash: [10000, null] }) && !meets(state, { cash: [null, 100] }));
    state.flags.tested = true;
    assert.ok(meets(state, { flag: 'tested' }) && !meets(state, { noFlag: 'tested' }));
  },
  'a check option applies its shared effects, then the branch it rolled'() {
    const ev = compileEvent({ id: 't', title: 'T', options: [{ id: 'go', label: 'Go', stat: { happiness: 5 }, log: 'Shared.', check: { chance: 1 }, pass: { cash: 100, log: 'Passed.' }, fail: { log: 'Failed.' } }] });
    const { engine, state } = life(2, 30);
    const before = { happy: state.stats.happiness, cash: state.finances.cash };
    const text = ev.options[0].resolve(engine.context());
    assert.equal(text, 'Shared. Passed.');
    assert.equal(state.finances.cash, before.cash + 100);
    assert.ok(state.stats.happiness >= Math.min(100, before.happy + 4));
  },
  'every pack event plays through every option with clean text'() {
    let played = 0;
    for (const ev of allEvents()) {
      for (const [i, age] of [ev.minAge ?? 18, ev.maxAge != null ? Math.min(ev.maxAge, 70) : 40].entries()) {
        const { engine, state } = life(11 + i, age, i ? 'GB' : 'US');
        ev.when(state); // never throws, whatever the life
        assert.ok(!broken(Array.isArray(ev.text) ? ev.text.join(' ') : ev.text), `${ev.id}: text`);
        const outcomes = ev.run ? [() => ev.run(engine.context())] : ev.options.map((o) => () => o.resolve(engine.context()));
        for (const play of outcomes) {
          const out = play();
          const text = Array.isArray(out) ? out[1] : out;
          assert.ok(!broken(text), `${ev.id}: "${text}"`);
          played += 1;
        }
      }
    }
    assert.ok(played > 50, `played ${played}`);
  },
  'career packs validate and join the catalog'() {
    assert.deepEqual(CAREER_PROBLEMS, []);
    const ids = CAREER_PACKS.flatMap((p) => Object.keys(p.careers ?? {}));
    assert.ok(ids.length >= 10);
    for (const id of ids) assert.equal(PROFESSIONS[id]?.id, id, `${id} is in PROFESSIONS`);
    const p = validateCareer('x', { name: 'X', sector: 'nowhere', ladder: [['a', 'A', 1, { track: 'sideways', req: { credentials: ['noSuchCredential'] } }], ['a', 'A', 2]] }, { credentials: {} }).join('; ');
    for (const re of [/unknown sector/, /needs employers/, /unknown track/, /unknown credential/, /duplicate level/]) assert.match(p, re);
  },
  'every pack career hires and names its employer at home and abroad'() {
    for (const [cc, region] of [['US', null], ['GB', null]]) {
      const { engine, state } = life(5, 30, cc);
      for (const id of Object.keys(PACK_PROFESSIONS)) {
        const prof = PROFESSIONS[id];
        const employer = createEmployer(new Random(7), state, prof, region ?? state.character.regionId);
        assert.ok(employer.name && !broken(employer.name) && !/[{}]/.test(employer.name), `${cc} ${id}: employer ${employer.name}`);
        hire(engine.context(), { professionId: id, levelId: (prof.levels.find((l) => l.entry) ?? prof.levels[0]).id, employer });
        assert.equal(state.career.job?.professionId, id, `${cc} ${id}: hired`);
        state.career.job = null;
      }
    }
  },
  'decks validate, and the validator catches the usual mistakes'() {
    assert.deepEqual(DECK_PROBLEMS, []);
    assert.ok(deckIds().length >= 3);
    const bad = validateDeckEvent('work', { id: 'x', title: 'T', text: 'x', colour: 1, options: [{ id: 'a', label: 'A', stats: { charm: 2 }, check: 'luck', risky: { chance: 2, offense: 'nope' } }, { id: 'a', label: 'B' }] }).join('; ');
    for (const re of [/unknown field colour/, /unknown stat charm/, /unknown stat luck/, /risky.chance/, /risky needs text/, /unknown offense nope/, /duplicate option/]) assert.match(bad, re);
  },
  'every work event plays through every option with clean text'() {
    let played = 0;
    for (const id of deckIds().filter((d) => d.startsWith('work.'))) {
      for (const e of deck(id)) {
        for (const o of e.options) {
          const { engine, state } = life(21, 35);
          state.career.job = { professionId: 'retail', levelId: 'associate', title: 'Associate', employer: { name: 'Bayside Market' }, salary: 30000, sector: 'private', effort: 1, boss: 50, coworkers: 50, performance: 50 };
          e.when?.(state);
          resolveWorkEvent(engine.context(), { eventId: e.id }, o.id);
          const text = (state.log.at(-1)?.entries ?? []).map((x) => x.text).join(' ');
          assert.ok(!broken(text), `${e.id}.${o.id}: ${text}`);
          played += 1;
        }
      }
    }
    assert.ok(played > 200, `played ${played}`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} content-pack test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} content-pack tests passed`);
