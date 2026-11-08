/**
 * Scenes: calls played step by step (career/Scenes.js, content/packs/scenes-emergency.js).
 *
 *   node tests/scenes.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { SCENES, startScene, tierOf, checkOdds, ScenesModule } from '../src/modules/career/Scenes.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const JOBS = { 'fire.houseFire': ['fire', 'Firefighter'], 'police.domestic': ['police', 'Police Officer'], 'ems.arrest': ['ems', 'Paramedic'], 'command.incident': ['fire', 'Fire Captain'],
  'fire.crash': ['fire', 'Firefighter'], 'fire.wildland': ['stateFire', 'Firefighter'], 'police.pursuit': ['police', 'Police Officer'], 'police.missing': ['sheriff', 'Deputy'], 'police.stop': ['police', 'Police Officer'],
  'ems.overdose': ['ems', 'Paramedic'], 'ems.mci': ['privateEms', 'EMT'], 'dispatch.whisper': ['dispatch', 'Dispatcher'], 'police.ois': ['police', 'Police Sergeant'], 'partner.line': ['ems', 'Paramedic'],
  'fire.mayday': ['fire', 'Fire Lieutenant'], 'dispatch.cpr': ['dispatch', 'Dispatcher'], 'ems.birth': ['ems', 'Paramedic'] };
const life = (prof, title, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', gender: 'female' });
  state.character.age = 30;
  state.prompts = [];
  state.career.job = { professionId: prof, levelId: 'x', title, salary: 60000, performance: 50, employer: { name: 'City' } };
  return { engine, state };
};
const lines = (state) => (state.log.at(-1).entries ?? []).map((e) => e.text);
const BAD = /undefined|NaN|\{|\}|\[object/;

const tests = {
  'every step an option leads to exists'() {
    for (const def of Object.values(SCENES)) {
      const steps = { ...def.steps, ...Object.fromEntries(Object.entries(def.complications ?? {}).map(([k, v]) => [`complication:${k}`, v])) };
      assert.ok(steps[def.start ?? 'start'], `${def.id}: start step`);
      for (const [sid, st] of Object.entries(steps)) for (const o of st.options) for (const n of [o.next, o.pass?.next, o.fail?.next]) {
        if (n && n !== 'complication') assert.ok(steps[n], `${def.id}.${sid}.${o.id} → ${n}`);
        if (n === 'complication') assert.ok(def.complications, `${def.id}: complication without any`);
      }
    }
  },
  'every scene has a job that can draw it'() {
    for (const id of Object.keys(SCENES)) assert.ok(JOBS[id], `${id} in the test's JOBS`);
    for (const [id, [prof, title]] of Object.entries(JOBS)) {
      const { state } = life(prof, title);
      state.careerLife = { partner: { scenes: 3, trust: 50, professionId: prof } };
      if (SCENES[id].trigger !== 'manual') assert.ok(SCENES[id].for(state, state.career.job), `${id} for a ${title}`);
    }
  },
  'every scene plays to an outcome with clean text, whatever you choose'() {
    for (const [id, [prof, title]] of Object.entries(JOBS)) for (let seed = 1; seed <= 12; seed++) {
      const { engine, state } = life(prof, title, seed);
      assert.ok(startScene(engine.context(), id, { name: 'the building collapse', kind: ['collapse', 'explosion', 'shooting'][seed % 3], severity: 1 + (seed % 3) }), id);
      for (let g = 0; g < 12 && state.prompts.length; g++) {
        const p = state.prompts[0];
        assert.equal(p.type, 'scenes.step');
        assert.doesNotMatch(p.text + p.title + p.options.map((o) => o.label + (o.hint ?? '')).join(), BAD, `${id}: ${p.text}`);
        engine.resolvePrompt(p.id, p.options[(seed * 7 + g) % p.options.length].id);
      }
      assert.equal(state.scene, null, `${id} seed ${seed} finished`);
      assert.equal(state.careerLife.scenes[0].id, id);
      for (const l of lines(state)) assert.doesNotMatch(l, BAD, `${id}: ${l}`);
      if (SCENES[id].partner && id !== 'partner.line') assert.ok(state.careerLife.partner.scenes >= 1);
    }
  },
  'one scene at a time, and a reload closes a hanging one'() {
    const { engine, state } = life('police', 'Police Officer');
    assert.ok(startScene(engine.context(), 'police.domestic'));
    assert.equal(startScene(engine.context(), 'fire.houseFire'), false);
    state.prompts = []; // what a reload does
    state.career.job = null; // so no new scene starts
    ScenesModule.onAgeUp(engine.context());
    assert.equal(state.scene, null);
    assert.equal(state.careerLife.scenes[0].id, 'police.domestic');
  },
  'tiers and odds'() {
    assert.equal(tierOf({ lives: 3, crew: 1, city: 0, trust: 0 }), 'outstanding');
    assert.equal(tierOf({ lives: -2, crew: -1, city: 0, trust: 0 }), 'bad');
    const { state } = life('fire', 'Firefighter');
    const low = checkOdds(state, { bar: 90 });
    const high = checkOdds(state, { bar: 10 });
    assert.ok(low >= 0.08 && high <= 0.92 && high > low);
    state.careerLife = { partner: { trust: 100, professionId: 'fire' } };
    assert.ok(checkOdds(state, { bar: 50 }) > 0.5, 'a trusted partner helps');
  },
  'a supervising responder runs the major incident as a scene'() {
    const { engine, state } = life('fire', 'Fire Captain');
    engine.context().prompt({ type: 'majorIncidents.respond', title: 'Major Incident', text: 'x', options: [{ id: 'command', label: 'Command' }], data: { name: 'the chemical plant explosion', kind: 'explosion', severity: 3, role: 'responder' } });
    engine.resolvePrompt(state.prompts.at(-1).id, 'command');
    const p = state.prompts.find((x) => x.type === 'scenes.step');
    assert.ok(p, 'command scene started');
    assert.equal(p.data.sceneId, 'command.incident');
    assert.match(p.text, /chemical plant explosion/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} scene test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} scene tests passed`);
