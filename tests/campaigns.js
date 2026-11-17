/**
 * The campaigns of history's wars (military/Campaigns.js): where a deployment went, battle
 * honours, Commonwealth campaign stars and American battle stars.
 *
 *   node tests/campaigns.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { campaignsFor, joinCampaign, battleStars } from '../src/modules/military/Campaigns.js';
import { runDeployment } from '../src/modules/military/ActiveDuty.js';
import { declareWarWith } from '../src/modules/world/War.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const at = (countryId, year) => ({ character: { countryId, birthYear: year - 25, age: 25 } });
const names = (state, svc, war) => campaignsFor(state, svc, war).map((c) => c.id);

const tests = {
  'the right campaign for your country, branch and year'() {
    const ww2 = { id: 'ww2', name: 'the Second World War' };
    assert.ok(names(at('GB', 1944), { nation: 'GB', branch: 'army' }, ww2).includes('normandy'));
    assert.ok(names(at('GB', 1940), { nation: 'GB', branch: 'airforce' }, ww2).includes('britain'));
    assert.ok(names(at('CA', 1942), { nation: 'CA', branch: 'navy' }, ww2).includes('atlantic'));
    assert.ok(names(at('US', 1943), { branch: 'marines' }, ww2).includes('tarawa'));
    assert.ok(!names(at('US', 1943), { branch: 'marines' }, ww2).includes('britain'), 'no Battle of Britain for a US Marine');
    assert.ok(names(at('AU', 1915), { nation: 'AU', branch: 'army' }, { id: 'ww1' }).includes('gallipoli'));
    assert.ok(names(at('GB', 1982), { nation: 'GB', branch: 'marines' }, { id: 'cow.1', name: 'the Falklands War' }).includes('sancarlos'));
  },
  'a Commonwealth campaign star once; Americans count battle stars'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(2), modules: MODULES });
    const state = engine.newLife({ countryId: 'GB', startYear: 1920 });
    const ctx = engine.context();
    const svc = { nation: 'GB', branch: 'navy' };
    const atl = campaignsFor(state, svc, { id: 'ww2' }).find((c) => c.id === 'atlantic') ?? { id: 'atlantic', name: 'the Battle of the Atlantic', text: '…', star: 'Atlantic Star' };
    joinCampaign(ctx, svc, { id: 'ww2' }, atl);
    joinCampaign(ctx, svc, { id: 'ww2' }, atl);
    assert.equal(state.honors.filter((h) => h.name === 'Atlantic Star').length, 1);
    assert.equal(battleStars({ campaigns: [{ id: 'a' }, { id: 'b' }, { id: 'a' }] }), 2);
  },
  'a deployment in a war of history goes to a real campaign, and the record shows it'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(5), modules: MODULES });
    const state = engine.newLife({ countryId: 'US', startYear: 1920 });
    for (let i = 0; i < 23; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
    state.prompts = [];
    Object.assign(state.stats, { fitness: 80, smarts: 70, health: 95 });
    if (!state.education.degrees.some((d) => d.type === 'highschool')) state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 });
    state.military.service = null;
    engine.dispatch('military.enlist', 'army:enlisted:active');
    for (let g = 0; g < 8 && state.prompts.length && !state.military.service; g++) { const p = state.prompts[0]; engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled && o.tone !== 'danger' && o.id !== 'cancel') ?? p.options[0]).id); }
    state.prompts = [];
    const ctx = engine.context();
    declareWarWith(ctx, 'US', { id: 'ww2', name: 'the Second World War', adversary: 'the Axis', operation: 'the Second World War', intensity: 4, scripted: true });
    const svc = state.military.service;
    assert.ok(svc, 'enlisted');
    for (let i = 0; i < 12 && !(svc.campaigns?.length); i++) runDeployment(ctx, svc);
    assert.ok(svc.campaigns?.length, 'a campaign');
    state.prompts = [];
    assert.match(VIEWS.military(state), /Campaigns/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
