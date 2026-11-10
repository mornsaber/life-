/**
 * Losing a war: the forces disbanded or purged, pensions cut, public office barred, and the
 * chance of a war-crimes tribunal (military/Wartime.js defeatAftermath).
 *
 *   node tests/defeat.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { defeatAftermath } from '../src/modules/military/Wartime.js';
import { sync } from '../src/modules/world/History.js';
import { regimeOf } from '../src/modules/world/Regimes.js';
import { runEligibility } from '../src/modules/politics/Campaigns.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const general = (seed) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'DE', startYear: 1895, gender: 'male' });
  for (let i = 0; i < 48; i++) { state.prompts = []; engine.ageUp(); }
  if (!state.character.alive) return null;
  state.prompts = [];
  engine.dispatch('military.enlist', 'army:officer:active');
  for (let g = 0; g < 6 && state.prompts.length; g++) { const p = state.prompts[0]; engine.resolvePrompt(p.id, p.options.find((o) => !o.disabled && o.id !== 'cancel').id); }
  state.prompts = [];
  // A career's worth of service: a major general of the Wehrmacht.
  state.military.service ??= { branch: 'army', nation: 'DE', track: 'officer', component: 'active', grade: 0, yearsOfService: 0, joinedAge: 20, deployments: 0, schools: {}, eval: 80, disciplinary: 0 };
  const svc = state.military.service;
  Object.assign(svc, { grade: 7, cadet: false, yearsOfService: 28, joinedAge: 22, warOp: 'the war in the East', warId: 'ww2' });
  return { engine, state, entry: { country: 'DE', name: 'the Second World War', operation: 'the war in the East', endAge: state.character.age, outcome: 'ended in defeat and occupation' } };
};

const harsh = (state) => { const r = regimeOf('DE'); return ['totalitarian', 'dictatorship', 'junta'].includes(r.kind) || Boolean(r.party); };

const tests = {
  'an occupation disbands the forces and bars the old officers from office'() {
    const { engine, state, entry } = [1, 2, 3, 4, 5].reduce((acc, s) => acc ?? ((g) => (g && harsh(g.state) ? g : null))(general(s)), null);
    assert.ok(state.military.service, 'serving');
    defeatAftermath(engine.context(), entry);
    assert.equal(state.military.service, null, 'disbanded');
    assert.ok(state.politics.barredUntil > state.character.age);
    assert.match(runEligibility(state, 'mayor').reason ?? '', /Barred|another country|Citizens|office/);
  },
  'a senior officer of a dictatorship may face a tribunal, and fleeing means being hunted'() {
    let found = null;
    for (let seed = 1; seed < 25 && !found; seed++) {
      const g = general(seed);
      if (!g || !harsh(g.state)) continue;
      defeatAftermath(g.engine.context(), g.entry);
      const p = g.state.prompts.find((x) => x.type === 'wartime.tribunal');
      if (p) found = { ...g, p };
    }
    assert.ok(found, 'some generals are investigated');
    assert.equal(found.p.data.offenseId, 'crimesAgainstPeace');
    found.engine.resolvePrompt(found.p.id, 'flee');
    const s = found.state;
    assert.ok(s.military.hunted || s.prompts.some((x) => x.type === 'legal.court') || s.legal.record.length || s.legal.incarceration, 'hunted or before the court');
  },
  'it happens once per war'() {
    const { engine, state, entry } = [2, 3, 4].map(general).find(Boolean);
    defeatAftermath(engine.context(), entry);
    const n = state.military.defeats.length;
    defeatAftermath(engine.context(), entry);
    assert.equal(state.military.defeats.length, n);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
