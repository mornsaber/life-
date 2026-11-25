/**
 * Public and private sector: the bloc's ruling parties by name (not the CPSU everywhere), state
 * employers in planned economies and in the West's nationalised industries, and nationalising or
 * privatising a sector by statute.
 *
 *   node tests/ownership.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { sync } from '../src/modules/world/History.js';
import { partyHere } from '../src/modules/politics/CommunistParty.js';
import { regimeHere } from '../src/modules/world/Regimes.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { stateShare, privateBusinessBlock } from '../src/modules/world/Ownership.js';
import { LAWS } from '../src/modules/politics/Laws.js';

let pass = 0;
const t = (name, fn) => { fn(); pass += 1; console.log(`  ✔ ${name}`); };
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(cc, y) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: y - 30, firstName: 'Ada', lastName: 'Kova', gender: 'male' });
  state.character.age = 10; state.prompts = []; sync(state);
  for (let i = 0; i < 20; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const employer = ({ state, ctx }, id) => createEmployer(ctx.rng, state, getProfession(id), state.character.regionId);
const setLaw = (state, cc, id, v) => { state.laws ??= {}; state.laws.nations ??= {}; (state.laws.nations[cc] ??= {})[id] = v; };

t('the bloc\'s own parties: Albania\'s Party of Labour, not the CPSU', () => {
  assert.equal(partyHere(life('AL', 1975).state).name, 'the Party of Labour of Albania');
  assert.equal(partyHere(life('PL', 1975).state).name, 'the Polish United Workers\' Party');
  assert.equal(partyHere(life('UA', 1970).state).name, 'the Communist Party of the Soviet Union');
  assert.equal(partyHere(life('HU', 1953).state).name, 'the Hungarian Working People\'s Party');
  assert.match(regimeHere(life('AL', 1970).state).name, /China/);
});
t('a planned economy: state enterprises, no private firms', () => {
  const pl = life('PL', 1975);
  for (const id of ['manufacturing', 'retail', 'engineering', 'trucking', 'railroad']) {
    const e = employer(pl, id);
    assert.equal(e.ownership, 'state', `${id}: ${e.name}`);
    assert.doesNotMatch(e.name, /Brothers|& Co\.|the the/);
  }
  assert.match(employer(pl, 'railroad').name, /PKP/);
});
t('the West\'s nationalised boards, and private firms where history sold them', () => {
  const gb = life('GB', 1960);
  assert.equal(employer(gb, 'coalMining').name, 'the National Coal Board');
  assert.equal(employer(gb, 'railroad').name, 'British Railways');
  assert.notEqual(employer(gb, 'retail').ownership, 'state');
  const gb2 = life('GB', 2000);
  assert.notEqual(employer(gb2, 'switchboard').ownership, 'state');
  assert.equal(employer(gb2, 'switchboard').name, 'BT');
  assert.match(employer(life('FR', 1985), 'railroad').name, /SNCF/);
  assert.notEqual(employer(life('US', 1980), 'coalMining').ownership, 'state');
});
t('the law book carries public ownership of each sector, at history\'s value', () => {
  assert.ok(LAWS.ownership_rail && LAWS.ownership_coal && LAWS.ownership_smallTrade);
  assert.equal(LAWS.ownership_rail.base.federal('GB') !== undefined, true);
});
t('privatise a sector by statute: your employer changes hands', () => {
  const w = life('GB', 1960);
  hire(w.ctx, { professionId: 'railroad', levelId: getProfession('railroad').levels[0].id, employer: employer(w, 'railroad') });
  w.state.prompts = []; w.engine.ageUp(); w.state.prompts = [];
  assert.equal(w.state.career.job.employer.ownership, 'state');
  setLaw(w.state, 'GB', 'ownership_rail', false);
  assert.equal(stateShare(w.state, 'rail'), 0);
  w.engine.ageUp();
  assert.notEqual(w.state.career.job.employer.ownership, 'state');
  assert.ok(w.state.log.flatMap((y) => y.entries ?? []).some((e) => /privatised/.test(e.text ?? '')));
});
t('nationalise a sector by statute: America\'s railroads', () => {
  const w = life('US', 1960);
  hire(w.ctx, { professionId: 'railroad', levelId: getProfession('railroad').levels[0].id, employer: employer(w, 'railroad') });
  w.state.prompts = []; w.engine.ageUp(); w.state.prompts = [];
  setLaw(w.state, 'US', 'ownership_rail', true);
  w.state.laws.federal = { ...(w.state.laws.federal ?? {}), ownership_rail: true };
  w.engine.ageUp();
  assert.equal(w.state.career.job.employer.ownership, 'state');
  assert.equal(employer(w, 'railroad').ownership, 'state');
});
t('a planned economy that privatises small trade lets you open a café', () => {
  const w = life('HU', 1970);
  assert.ok(privateBusinessBlock(w.state, 'restaurant'));
  setLaw(w.state, 'HU', 'ownership_smallTrade', false);
  assert.equal(privateBusinessBlock(w.state, 'restaurant'), null);
  assert.ok(privateBusinessBlock(w.state, 'machineShop'));
  assert.notEqual(employer(w, 'retail').ownership, 'state');
});
console.log(`ownership: ${pass} passed`);
