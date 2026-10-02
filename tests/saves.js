/**
 * Save system tests: real saves from every past STATE_VERSION (generated at
 * those commits, in tests/fixtures/) must migrate, keep the life's identity,
 * and play on for decades; slots, export/import, undo and log caps work.
 *
 *   node tests/saves.js
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/core/Engine.js';
import { Store, STATE_VERSION, SAVE_INDEX_KEY, LOG_DETAIL_YEARS, LOG_MAX_PER_YEAR } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';

const memory = (seed = {}) => {
  const m = new Map(Object.entries(seed));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), map: m };
};
const fixture = (name) => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const LEGACY = { 'save-v1.json': 'lifesim.save.v1', 'save-v2.json': 'lifesim.save.v2', 'save-v3.json': 'lifesim.save.v3', 'save-v4-early.json': 'lifesim.save.v4' };

function playOn(engine, years, seed = 3) {
  const pick = new Random(seed);
  const s = engine.state;
  for (let y = 0; y < years && s.character.alive; y++) {
    for (let g = 0; g < 50 && s.prompts.length; g++) {
      const p = s.prompts[0];
      const opts = p.options.filter((o) => !o.disabled);
      engine.resolvePrompt(p.id, pick.pick(opts).id);
    }
    if (!s.character.alive) break;
    if (s.character.age >= 18 && !s.career.job && pick.chance(0.5)) engine.dispatch('career.apply', pick.pick(['retail', 'tech', 'nursing', 'trucking']));
    for (let g = 0; g < 50 && s.prompts.length; g++) {
      const p = s.prompts[0];
      engine.resolvePrompt(p.id, p.options.find((o) => !o.disabled).id);
    }
    if (s.character.alive) assert.ok(engine.ageUp(), `ageUp at ${s.character.age}`);
  }
}

const tests = {
  'saves from every past version migrate on boot and keep playing'() {
    for (const [file, key] of Object.entries(LEGACY)) {
      const raw = JSON.parse(fixture(file));
      const storage = memory({ [key]: fixture(file) });
      const engine = new Engine({ store: new Store(storage), rng: new Random(9), modules: MODULES });
      assert.ok(engine.boot(), `${file} booted`);
      const s = engine.state;
      assert.equal(s.version, STATE_VERSION, `${file} upgraded`);
      assert.equal(s.character.firstName, raw.character.firstName);
      assert.equal(s.character.age, raw.character.age);
      assert.equal(s.finances.cash, raw.finances.cash);
      assert.equal(storage.getItem(key), null, `${file}: legacy key adopted into a slot`);
      assert.ok(JSON.parse(storage.getItem(SAVE_INDEX_KEY)).slots.slot1.name.includes(raw.character.firstName));
      if (raw.career.job) assert.ok(s.career.job, `${file}: job carried over`);
      if (raw.finances.retirement) assert.equal(s.retirement.dc, raw.finances.retirement, 'v1 401(k) balance kept');
      if (raw.version < STATE_VERSION) assert.ok(s.log.some((b) => b.entries.some((e) => /upgraded from save version/.test(e.text))), `${file}: upgrade noted`);
      for (const slice of ['economy', 'housing', 'politics', 'investing', 'health', 'campus', 'retirement', 'credentials']) assert.ok(s[slice], `${file}: ${slice} slice`);
      playOn(engine, 40);
      const reloaded = new Store(storage).load();
      assert.deepEqual(reloaded, s, `${file}: round trip after migration`);
    }
  },

  'export → import creates a new slot with the same life'() {
    const storage = memory();
    const engine = new Engine({ store: new Store(storage), rng: new Random(4), modules: MODULES });
    engine.newLife({ firstName: 'Export', lastName: 'Me' });
    playOn(engine, 25);
    const text = engine.exportLife();
    const before = structuredClone(engine.state);
    const imported = engine.importLife(text);
    assert.deepEqual(imported, before);
    assert.equal(engine.store.listSlots().length, 2);
    assert.equal(engine.store.activeSlot, 'slot2');
    assert.throws(() => engine.importLife('{"nope": true}'), /not a LIFE\/\/SIM save/);
    assert.throws(() => engine.importLife('not json'), /not valid JSON/);
    assert.throws(() => engine.importLife(JSON.stringify({ ...before, version: STATE_VERSION + 1 })), /newer version/);
    // Old saves import too.
    const old = engine.importLife(fixture('save-v1.json'));
    assert.equal(old.version, STATE_VERSION);
  },

  'slots are independent; switching and deleting work'() {
    const storage = memory();
    const engine = new Engine({ store: new Store(storage), rng: new Random(5), modules: MODULES });
    engine.newLife({ firstName: 'Ada', lastName: 'One' });
    engine.ageUp();
    engine.newSlot();
    assert.equal(engine.state, null, 'new slot starts empty');
    engine.newLife({ firstName: 'Bo', lastName: 'Two' });
    assert.equal(engine.switchSlot('slot1').character.firstName, 'Ada');
    assert.equal(engine.switchSlot('slot2').character.firstName, 'Bo');
    engine.deleteSlot('slot2');
    assert.equal(engine.state.character.firstName, 'Ada');
    assert.deepEqual(engine.store.listSlots().map((s) => s.id), ['slot1']);
  },

  'undo restores the previous year'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(6), modules: MODULES });
    engine.newLife();
    playOn(engine, 3);
    const before = JSON.stringify(engine.state);
    for (let g = 0; g < 20 && engine.state.prompts.length; g++) engine.resolvePrompt(engine.state.prompts[0].id, engine.state.prompts[0].options.find((o) => !o.disabled).id);
    const snapshot = JSON.stringify(engine.state);
    engine.ageUp();
    assert.ok(engine.canUndo());
    engine.undoYear();
    assert.equal(JSON.stringify(engine.state), snapshot);
    assert.ok(before);
  },

  'the log stays bounded over a long life'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(7), modules: MODULES });
    engine.newLife();
    playOn(engine, 100);
    const s = engine.state;
    const old = s.log.slice(0, Math.max(0, s.log.length - LOG_DETAIL_YEARS));
    assert.ok(old.every((b) => b.compacted && b.entries.length <= 4), 'old years compacted');
    assert.ok(s.log.every((b) => b.entries.length <= LOG_MAX_PER_YEAR));
    assert.ok(JSON.stringify(s.log).length < 120000, `log size ${JSON.stringify(s.log).length}`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  ✘ ${name}\n    ${err.stack.split('\n').slice(0, 4).join('\n    ')}`);
  }
}
console.log(failed ? `\n${failed} save test(s) failed` : `\n✔ All ${Object.keys(tests).length} save tests passed`);
process.exit(failed ? 1 : 0);
