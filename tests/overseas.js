/**
 * The Crown overseas: royals, retired generals and diplomats appointed governor of a territory
 * or governor-general; Government House, the passport, hurricanes, the end-of-term honour.
 * Also: honorary-rank insignia and the career ladder's insignia.
 *
 *   node tests/overseas.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { candidacy, postsFor } from '../src/modules/world/OverseasPosts.js';
import { officialResidence } from '../src/modules/world/Residences.js';
import { servicePassports } from '../src/modules/world/Passports.js';
import { titleInsignia, militaryInsignia } from '../src/ui/Insignia.js';
import { recallMaxAge } from '../src/modules/military/MilitaryEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 4) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'GB', gender: 'male', ...opts });
  state.character.age = 50;
  state.prompts = [];
  return { engine, state };
}
const tests = {
  'a retired British general is offered Gibraltar or a Crown Dependency'() {
    const { engine, state } = life();
    state.military.history.push({ branch: 'army', nation: 'GB', track: 'officer', grade: 8, rankTitle: 'Lieutenant General', rankCode: 'OF-9', discharge: 'retired', yearsOfService: 35, startAge: 18, endAge: 53 });
    const c = candidacy(state);
    assert.equal(c.kind, 'military');
    assert.ok(postsFor(c).includes('gibraltar'));
    let offered = false;
    for (let i = 0; i < 60 && !offered; i++) { engine.ageUp(); offered = state.prompts.some((p) => p.type === 'overseasPosts.offer'); if (!offered) state.prompts = []; }
    assert.ok(offered, 'an offer came');
    const p = state.prompts.find((x) => x.type === 'overseasPosts.offer');
    state.prompts = [p];
    engine.resolvePrompt(p.id, p.options[0].id);
    assert.ok(state.overseasPost);
    assert.equal(officialResidence(state).name, state.overseasPost.residence);
    assert.ok(servicePassports(state).some((x) => x.kind === 'diplomatic'));
    engine.dispatch('overseasPosts.duties');
    assert.match(VIEWS.politics(state, {}), /Public duties/);
  },
  'a working royal can be sent to a realm or territory'() {
    const { state } = life({ royalLevel: 'prince' });
    if (!state.royal) return;
    state.royal.reigning = false; state.royal.line = 5; state.royal.working = true;
    const c = candidacy(state);
    assert.equal(c?.kind, 'royal');
    assert.ok(postsFor(c).some((id) => ['canada', 'australia', 'newZealand', 'bermuda'].includes(id)));
  },
  'a royal governor who accedes to the throne leaves Government House'() {
    const { engine, state } = life({ royalLevel: 'prince' });
    if (!state.royal) return;
    state.royal.reigning = false; state.royal.line = 2; state.royal.working = true;
    state.overseasPost = { id: 'bermuda', title: 'Governor of Bermuda', place: 'Bermuda', residence: 'Government House, Hamilton', since: 48, until: 52, standing: 70 };
    state.royal.reigning = true;
    engine.ageUp();
    assert.equal(state.overseasPost, null);
    assert.equal(state.overseasPast.at(-1).id, 'bermuda');
  },
  'recall age rises with the war: 60 in peace, 80 under mobilization'() {
    const { state } = life();
    assert.equal(recallMaxAge(state, 'GB'), 60);
    state.world.wars = { GB: { phase: 'war', intensity: 3 } };
    assert.equal(recallMaxAge(state, 'GB'), 72);
    state.world.wars.GB.mobilized = true;
    assert.equal(recallMaxAge(state, 'GB'), 80);
  },
  'honorary and full insignia sets'() {
    assert.ok(titleInsignia('Honorary Colonel — the Rifles', 'GB'));
    assert.ok(titleInsignia('Air Vice-Marshal', 'GB'));
    assert.notEqual(militaryInsignia('OF-9', 'RU'), militaryInsignia('OF-10', 'RU'));
    assert.notEqual(militaryInsignia('O-10', 'US'), militaryInsignia('O-11', 'US'));
    assert.ok(militaryInsignia('OR-1', 'RU'), 'a private\'s plain board');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} overseas test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} overseas tests passed`);
