/**
 * The European Parliament: an MEP gets a group, a committee and an agenda; adopted directives
 * change national law in every member state; reports, hearings and the Bureau.
 *
 *   node tests/europarl.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { levelValue } from '../src/modules/politics/Laws.js';
import { tally, GROUPS } from '../src/modules/politics/EuropeanParliament.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function mep(seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'DE', gender: 'female' });
  state.character.age = 40;
  state.prompts = [];
  state.politics.office = { id: 'de_mep', approval: 55, termYearsLeft: 4, terms: 1, startAge: 39 };
  engine.ageUp();
  state.prompts = [];
  return { engine, state };
}

const tests = {
  'an MEP sits in a group and committee with a plenary agenda'() {
    const { state } = mep();
    assert.ok(state.europarl, 'joined');
    assert.ok(GROUPS[state.europarl.group]);
    assert.ok(state.europarl.agenda.length >= 1, 'agenda drawn');
    assert.match(VIEWS.politics(state, {}), /European Parliament/);
    assert.match(VIEWS.politics(state, {}), /plenary agenda/);
  },
  'an adopted directive changes national law across the Union'() {
    const { engine, state } = mep();
    const file = { id: 'workLife', name: 'Work-Life Balance Directive', committee: 'EMPL', lawId: 'paidLeave', direction: 'up', lean: 0.6, integration: 0.4, kind: 'directive', push: 0.6, myVote: null, rapporteur: true };
    state.europarl.agenda = [file];
    const before = levelValue(state, 'paidLeave', 'federal', 'FR');
    engine.dispatch('europarl.vote', 'workLife|yes');
    assert.equal(file.myVote, 'yes');
    engine.ageUp();
    state.prompts = [];
    assert.ok(state.europarl.adopted.includes('workLife'));
    assert.equal(levelValue(state, 'paidLeave', 'federal', 'FR'), true, `FR changed from ${before}`);
    assert.equal(levelValue(state, 'paidLeave', 'federal', 'DE'), true);
    assert.ok(state.europarl.reports.some((r) => r.id === 'workLife' && r.outcome === 'adopted'));
  },
  'group leaders whip their group; votes are counted across 720 seats'() {
    const { state } = mep();
    const file = { id: 'x', lean: 0, integration: 0, push: 0, myVote: 'no' };
    state.europarl.group = 'epp';
    state.europarl.myVoteWhip = true;
    const r = tally(state, file, new Random(1));
    assert.equal(r.yes + r.no, 720);
  },
  'yearly actions, posts and the Commission hearing'() {
    const { engine, state } = mep(11);
    state.europarl.influence = 100;
    engine.dispatch('europarl.speech');
    assert.ok(state.yearly['europarl.speech']);
    state.politics.office.termYearsLeft = 3;
    engine.dispatch('europarl.stand', 'groupLeader');
    assert.ok(state.yearly['europarl.stand']);
    engine.dispatch('europarl.switchGroup', 'renew');
    assert.equal(state.europarl.group, 'renew');
    // The first year of a new term (the re-election itself is a campaign, Elections.js).
    state.politics.office.termYearsLeft = 6;
    engine.ageUp();
    assert.ok(state.prompts.some((p) => p.type === 'europarl.hearing'), 'new term: hearings');
  },
  'MEPs are not offered national ministries'() {
    const { engine, state } = mep();
    for (let i = 0; i < 15; i++) { engine.ageUp(); state.prompts = []; state.politics.office.termYearsLeft = 3; }
    assert.equal(state.politics.ministry ?? null, null);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} European Parliament test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} European Parliament tests passed`);
