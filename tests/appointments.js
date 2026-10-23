/**
 * Who runs an employer, and how long appointments last: generic employers have no made-up
 * "Department Head" or promotable "Owner / Chief Executive"; owning the firm is never a
 * promotion; appointed offices and honorary appointments end.
 *
 *   node tests/appointments.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROFESSIONS, getProfession } from '../src/modules/career/JobTrees.js';
import { ladderFor } from '../src/modules/career/Ladder.js';
import { soloType } from '../src/modules/org/OrgTypes.js';
import { promotable } from '../src/modules/org/Executives.js';
import { migrate } from '../src/core/Migrations.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', ...opts });
  state.legal.record = [];
  return { engine, state, ctx: engine.context() };
}
const year = (engine, state, n = 1) => {
  for (let i = 0; i < n && state.character.alive; i++) {
    for (let k = 0; k < 12 && state.prompts.length; k++) { const q = state.prompts[0]; engine.resolvePrompt(q.id, (q.options.find((o) => /retire|decline|not/i.test(`${o.id} ${o.label}`)) ?? q.options[0]).id); }
    state.prompts = [];
    state.stats.health = 95;
    engine.ageUp();
  }
};

const tests = {
  'generic employers: no "Department Head" or promotable "Owner / Chief Executive"'() {
    for (const p of Object.values(PROFESSIONS)) {
      const t = soloType(p);
      assert.notEqual(t.departments[0].head.title, 'Department Head', p.id);
      assert.notEqual(t.head.title, 'Owner / Chief Executive', p.id);
      if (/owner/i.test(t.head.title)) assert.ok(!promotable(t.head), `${p.id}: an owner is never a promotion`);
    }
    assert.equal(soloType(getProfession('nato')).head.title, 'Secretary General');
    assert.ok(!promotable(soloType(getProfession('nato')).head), 'chosen by the member states');
    assert.match(soloType(getProfession('clergy')).head.title, /Bishop/);
    assert.equal(soloType(getProfession('dentistry')).head.selection, 'internal', 'a practice partner is reached on the ladder');
  },
  'owning the firm is not a rung on an employee\'s ladder'() {
    for (const id of ['trades', 'realestate', 'cosmetology', 'plumbing', 'bailBonds']) {
      for (const size of ['micro', 'small', 'medium', 'large']) assert.ok(!ladderFor(getProfession(id), size).some((l) => /owner/i.test(l.title)), `${id} ${size}`);
    }
    // An old save at the owner rung steps back to the top employee rung.
    const { state } = life();
    const raw = structuredClone(state);
    raw.version = 4;
    raw.career.job = { professionId: 'cosmetology', levelId: 'owner', title: 'Salon Owner' };
    const out = migrate(raw, 5, state);
    assert.equal((out.state ?? out).career.job.levelId, 'manager');
  },
  'appointed offices end: a Governor-General\'s term, a cabinet with its president'() {
    const { engine, state, ctx } = life({ countryId: 'CA' }, 7);
    state.character.age = 55;
    ctx.emit('politics:take', { officeId: 'ca_gg', appointed: true });
    assert.equal(state.politics.office?.id, 'ca_gg');
    year(engine, state, 9);
    assert.notEqual(state.politics.office?.id, 'ca_gg', 'the term ended');
    const us = life({}, 8);
    us.state.character.age = 50;
    us.ctx.emit('politics:take', { officeId: 'cabinetSecretary', appointed: true });
    year(us.engine, us.state, 12);
    assert.notEqual(us.state.politics.office?.id, 'cabinetSecretary', 'a cabinet secretary doesn\'t outlast two terms');
  },
  'honorary colonelcies run for a term'() {
    const { engine, state } = life({ countryId: 'GB' }, 9);
    year(engine, state, 45);
    state.honors.push({ id: 'honorary.0.45', source: 'honoraryRank', name: 'Honorary Colonel — the Rifles', icon: '🎖️', until: state.character.age + 1, renewed: true });
    year(engine, state, 2);
    assert.ok(!state.honors.some((h) => h.name === 'Honorary Colonel — the Rifles'));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} appointment test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} appointment tests passed`);
