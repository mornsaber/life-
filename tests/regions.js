/**
 * Places: every city has a state with complete data, every base and hazard
 * resolves, and a life can be lived (and moved) anywhere.
 *
 *   node tests/regions.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { REGIONS, BASES } from '../src/modules/life/Regions.js';
import { STATES, DISASTER_LABEL, stateIncomeTax } from '../src/modules/life/States.js';
import { SELECTION } from '../src/modules/legal/Judiciary.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

for (const r of Object.values(REGIONS)) {
  const st = STATES[r.state];
  assert.ok(st, `${r.id}: state ${r.state}`);
  for (const k of ['col', 'market', 'locality', 'transit', 'fare']) assert.equal(typeof r[k], 'number', `${r.id}.${k}`);
}
for (const [id, st] of Object.entries(STATES)) {
  for (const k of ['propertyTax', 'salesTax', 'minWage']) assert.equal(typeof st[k], 'number', `${id}.${k}`);
  assert.ok(Array.isArray(st.incomeTax) && st.dui && st.population, id);
  for (const d of Object.keys(st.disasters)) assert.ok(DISASTER_LABEL[d], `${id}: ${d}`);
  assert.ok(SELECTION[id], `${id}: judicial selection`);
  assert.ok(Number.isFinite(stateIncomeTax(id, 85000)), id);
  assert.ok(Object.values(REGIONS).some((r) => r.state === id), `${id} has a place to live`);
}
for (const [branch, list] of Object.entries(BASES)) for (const [rid] of list) assert.ok(REGIONS[rid], `${branch} base in ${rid}`);

// Live a few years in every place, moving between them.
const engine = new Engine({ store: new Store(memory()), rng: new Random(5), modules: MODULES });
const state = engine.newLife({});
state.character.age = 25;
state.finances.cash = 1_000_000;
for (const id of Object.keys(REGIONS)) {
  state.yearly = {};
  state.character.age = 30; // stay young and healthy: this is about places, not mortality
  state.stats.health = 100;
  state.finances.cash = 100_000;
  if (!state.character.alive) throw new Error(`died before ${id}: ${JSON.stringify(state.character.causeOfDeath ?? state.character)}`);
  engine.dispatch('region.move', id);
  const home = state.prompts.find((p) => p.type === 'region.homeDecision');
  if (home) engine.resolvePrompt(home.id, 'sell');
  assert.equal(state.character.regionId, id, `moved to ${id}: ${JSON.stringify(state.prompts.map((p) => p.type))} ${state.legal.incarceration ? 'jailed' : ''} ${state.military.service?.component ?? ''} cash=${state.finances.cash} age=${state.character.age} mil=${JSON.stringify(state.military.service?.component)} log=${JSON.stringify(state.log?.slice?.(-3))}`);
  state.prompts = [];
  engine.ageUp();
  state.prompts = [];
  for (const tab of ['money', 'move', 'career']) if (VIEWS[tab]) assert.ok(!/NaN|undefined/.test(VIEWS[tab](state, {})), `${tab} in ${id}`);
}
console.log(`✔ ${Object.keys(REGIONS).length} places in ${Object.keys(STATES).length} states check out`);
