/**
 * Big businesses: a well-run company handed to management keeps growing
 * into a large chain or fleet across several cities.
 *
 *   node tests/bigbusiness.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { currentBusiness } from '../src/modules/business/Business.js';
import { nextMarket, locationsByRegion, effectiveLocations } from '../src/modules/org/Businesses.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function grow(typeId, seed, { years = 30, strategy = 'steady', ownerYears = 0 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 30;
  Object.assign(state.stats, { smarts: 85, health: 95 });
  state.finances.cash = 4_000_000;
  state.housing.credit.score = 790;
  const t = BUSINESS_TYPES[typeId];
  for (const c of [...t.credentials, 'hazmatEndorsement']) state.credentials.held[c] = { earnedAge: 25, renewedAge: 29, status: 'active' };
  state.career.history.push({ professionId: t.professions[0], title: 'Pro', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 5, startAge: 18, endAge: 29, reason: 'Left' });
  engine.dispatch('business.start', `${typeId}:cash:llc`);
  const biz = currentBusiness(state);
  biz.drawPct = 0;
  let peak = { scale: 1, units: 0, revenue: 0 };
  for (let y = 1; y <= years; y++) {
    if (y <= ownerYears && y >= 3) { state.yearly = {}; biz.expandTo = nextMarket(state, biz); engine.dispatch('business.expand', 'cash'); }
    if (y === Math.max(3, ownerYears + 1)) { engine.dispatch('business.handOff'); engine.dispatch('business.setPlan', strategy); }
    state.prompts = [];
    state.stats.health = 95;
    state.character.age = Math.min(state.character.age, 60);
    engine.ageUp();
    for (let j = 0; j < 8 && state.prompts.length; j++) {
      const p = state.prompts[0];
      engine.resolvePrompt(p.id, (p.options.find((o) => ['decline', 'wait', 'loc', 'campaign'].includes(o.id) && !o.disabled) ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
    }
    const b = currentBusiness(state);
    if (!b) break;
    peak = { scale: Math.max(peak.scale, b.scale), units: Math.max(peak.units, b.ops?.units?.length ?? 0), revenue: Math.max(peak.revenue, b.lastYear?.revenue ?? 0) };
  }
  return { state, biz: currentBusiness(state), peak };
}

const tests = {
  'a retail chain spreads across cities under management'() {
    const { state, biz, peak } = grow('retail', 1, { ownerYears: 9 });
    assert.ok(peak.scale >= 12, `locations: ${peak.scale}`);
    assert.ok(peak.revenue >= 8_000_000, `revenue ${peak.revenue}`);
    assert.ok(Object.keys(locationsByRegion(state, biz)).length >= 2, 'more than one city');
    assert.ok(!/NaN|undefined/.test(VIEWS.business(state, {})));
  },

  'a trucking company grows into a big fleet'() {
    const { peak } = grow('trucking', 1);
    assert.ok(peak.units >= 50, `trucks: ${peak.units}`);
    assert.ok(peak.revenue >= 10_000_000, `revenue ${peak.revenue}`);
  },

  'a security company grows its guard force'() {
    const { biz } = grow('securityCompany', 1);
    assert.ok(biz.staff.headcount >= 60, `guards: ${biz.staff.headcount}`);
  },

  'a crowded market cannibalizes: the twentieth store in one town adds less than one in a new city'() {
    const { state, biz } = grow('retail', 2, { years: 3 });
    biz.scale = 20;
    const crowded = effectiveLocations(state, biz);
    assert.ok(crowded < 20, `${crowded} effective`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} big-business test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} big-business tests passed`);
